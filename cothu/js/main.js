// 🦁 Cờ Thú – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng
// shared/net/simplenet.js (cùng pattern Cờ Vây / Cờ Caro: chủ phòng giữ
// state, khách chỉ gửi action {type, from?, to?}). Bấm quân mình để chọn
// (hiện các nước đi được), bấm ô đích để đi.
import { createGame, applyAction, viewFor, actors, W, H, idx, isRiver, isTrapOf, DENS, TRAPS, animalOf, sideOf, rankOf, coordName, legalMovesFrom } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=50';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';
import { recordEvent } from '../../shared/ui/stats.js?v=73';

const NET = makeNet({
  game: 'cothu', min: 2, max: 2, maxSeats: 10, allowLocal: true,
  minMsg: 'Cờ Thú cần 2 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 600 + Math.random() * 600,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo'],
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
const modeBtns = [...document.querySelectorAll('[data-mode]')];
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#fld-name2').style.display = m === 'pvp' ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  try { localStorage.setItem('gumballz-cothu-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
try {
  const sm = localStorage.getItem('gumballz-cothu-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const seated = info.players.slice(0, 2);
  $('#pcount').textContent = `${seated.length}/2 người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (seated.length < 2
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = seated.length < 2;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.isHost ? ui.net.raw : null;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
  else if (b.id === 'btn-addlocal') {
    const n = await promptBox('Hai người chuyền máy cho nhau, mỗi người một lượt.', { title: '👥 Tên người chơi thứ hai', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
/* chế độ local: mở phòng offline trên máy này, thêm máy / người cùng máy theo chế độ đã chọn */
$('#btn-start').onclick = () => {
  ui.startHost(true);
};

/* ---------- ván chơi ---------- */
let cur = null, endShownGid = null, lastSeq = -1;
let sel = null; /* { x, y } quân đang chọn */
let selMoves = []; /* nước đi hợp lệ của quân đang chọn */

function trapOwner(x, y) {
  for (const [side, list] of Object.entries(TRAPS)) {
    if (list.some(([tx, ty]) => tx === x && ty === y)) return side;
  }
  return null;
}
function cellClass(v, x, y) {
  const cls = ['ct-cell'];
  if (isRiver(x, y)) cls.push('river');
  const tr = trapOwner(x, y);
  if (tr) cls.push('trap');
  if (DENS.R[0] === x && DENS.R[1] === y) cls.push('den', 'den-r');
  if (DENS.B[0] === x && DENS.B[1] === y) cls.push('den', 'den-b');
  const lm = v.lastMove;
  if (lm && !lm.pass) {
    if (lm.from.x === x && lm.from.y === y) cls.push('last-from');
    if (lm.to.x === x && lm.to.y === y) cls.push('last-to');
  }
  if (sel && sel.x === x && sel.y === y) cls.push('sel');
  const sm = selMoves.find(m => m.tx === x && m.ty === y);
  if (sm) cls.push(sm.capture ? 'move-cap' : 'move-dot');
  return cls.join(' ');
}
function boardHTML(v) {
  let html = '';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = idx(x, y), c = v.cells[n];
      const an = c !== 0 ? animalOf(rankOf(c)) : null;
      const side = c !== 0 ? sideOf(c) : null;
      const piece = an ? `<span class="piece ${side === 'R' ? 'r' : 'b'}">${an.emoji}<span class="rk">${an.rank}</span></span>` : '';
      html += `<button type="button" class="${cellClass(v, x, y)}" data-x="${x}" data-y="${y}" aria-label="Ô ${coordName(x, y)}${an ? `, ${an.name} ${side === 'R' ? 'Đỏ' : 'Xanh'} hạng ${an.rank}` : ''}${isRiver(x, y) ? ', sông' : ''}">${piece}</button>`;
    }
  }
  return html;
}

function render(v, prev) {
  cur = v;
  if (!v) { lastSeq = -1; endShownGid = null; sel = null; selMoves = []; return; }
  const me = v.players.find(p => p.id === v.me);
  const turnP = v.players.find(p => p.id === v.turn);
  const away = (v.away || []).map(id => (v.players.find(p => p.id === id) || {}).name).filter(Boolean);
  /* âm thanh nước mới */
  if (v.lastMove && v.lastMove.n !== lastSeq) {
    if (lastSeq !== -1) {
      if (v.lastMove.captured > 0) Snd.capture();
      else Snd.place();
      /* huy hiệu Chuột ăn Voi: nước mới do mình đi, ăn quân hạng 8, quân mình vừa đi là Chuột hạng 1 */
      if (v.lastMove.by === v.me && v.lastMove.captured === 8) {
        const att = rankOf(v.cells[idx(v.lastMove.to.x, v.lastMove.to.y)]);
        if (att === 1) recordEvent('cothu', 'capture', { attacker: 'rat', victim: 'elephant' });
      }
    }
    lastSeq = v.lastMove.n;
  }
  /* chọn lại quân nếu lượt đổi / quân bị ăn mất (quân chọn phải cùng phe với người đang tới lượt — ở chế độ 2 người chung máy thì 2 phe đều do máy này điều khiển) */
  if (sel) {
    const c = v.cells[idx(sel.x, sel.y)];
    const turnSide = (v.players.find(p => p.id === v.turn) || {}).side;
    if (v.phase !== 'playing' || !c || sideOf(c) !== turnSide) { sel = null; selMoves = []; }
    else selMoves = legalMovesFrom(v, v.turn, sel.x, sel.y);
  }
  $('#round').innerHTML = v.phase === 'ended'
    ? (v.endReason === 'resign' ? `🏳️ ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name))} thắng — đối thủ xin thua!`
      : v.endReason === 'den' ? `🏁 ${v.winner === v.me ? 'Bạn vào hang địch — thắng! 🎉' : esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name)) + ' vào hang của bạn — thắng!'}`
      : v.endReason === 'capture' ? `🏁 ${v.winner === v.me ? 'Bạn ăn hết quân địch — thắng! 🎉' : esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name)) + ' ăn hết quân của bạn — thắng!'}`
      : `🏁 ${v.winner === v.me ? 'Bạn thắng! 🎉' : esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name)) + ' thắng!'}`)
    : `⚔️ Lượt ${v.turnNo} · ${turnP ? (turnP.id === v.me ? 'tới lượt bạn!' : 'đang chờ ' + esc(cleanName(turnP.name)) + '…') : ''}${away.length ? ` · ⚠️ ${esc(away.join(', '))} mất kết nối — máy sẽ đi thay` : ''}`;
  $('#seats').innerHTML = v.players.map(p => {
    const cnt = v.cells.reduce((a, c) => a + (c !== 0 && sideOf(c) === p.side ? 1 : 0), 0);
    const eaten = (v.captured[p.id] || []).length;
    return `<div class="seat${p.id === v.turn && v.phase === 'playing' ? ' on' : ''}">${avatar(p.name, 40)}<b>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}</b>
      <span class="side-badge ${p.side === 'R' ? 'r' : 'b'}">${p.side === 'R' ? '🔴' : '🔵'}</span>
      <small>${p.side === 'R' ? 'Đỏ' : 'Xanh'} · ${cnt} quân · ăn ${eaten}${p.isBot ? ' · máy ' + (p.level === 'easy' ? 'Dễ' : 'Khó') : p.local ? ' · cùng máy' : ''}</small></div>`;
  }).join('');
  const inner = $('#board-inner');
  if (!inner.dataset.gid || inner.dataset.gid !== v.gid || inner.dataset.seq !== String(v.seq) || inner.dataset.sel !== (sel ? sel.x + ',' + sel.y : '')) {
    inner.dataset.gid = v.gid; inner.dataset.seq = String(v.seq);
    inner.dataset.sel = sel ? sel.x + ',' + sel.y : '';
    inner.innerHTML = boardHTML(v);
  }
  /* khay quân đã ăn */
  const tray = pid => {
    const list = v.captured[pid] || [];
    return list.length
      ? list.map(c => (animalOf(c.rank) || {}).emoji || '?').join('')
      : '<span class="none">Chưa ăn quân nào</span>';
  };
  const pR = v.players.find(p => p.side === 'R'), pB = v.players.find(p => p.side === 'B');
  $('#tray-r').innerHTML = `<h4 class="r">🔴 ${esc(cleanName((pR || {}).name || 'Đỏ'))} đã ăn</h4><div class="cap">${tray(pR ? pR.id : '')}</div>`;
  $('#tray-b').innerHTML = `<h4 class="b">🔵 ${esc(cleanName((pB || {}).name || 'Xanh'))} đã ăn</h4><div class="cap">${tray(pB ? pB.id : '')}</div>`;
  const log = $('#log');
  log.innerHTML = v.log.slice(-12).reverse().map(l => `<div>${esc(l.text)}</div>`).join('') || '<div>Chưa có nước đi nào.</div>';
  /* kết thúc: hộp thoại (1 lần / ván)
     Số ván/thắng do stats.watch() tự ghi khi ván kết thúc (simplenet bọc onState)
     — KHÔNG gọi record() tay ở đây, kẻo đếm trùng.
     Chỉ ghi recordEvent cho huy hiệu thắng bằng vào hang. */
  if (v.phase === 'ended' && endShownGid !== v.gid && !v.spec) {
    endShownGid = v.gid;
    const won = v.winner === v.me;
    recordEvent('cothu', 'end', { won, byDen: v.endReason === 'den' });
    Snd.winJingle();
    const wName = (v.players.find(p => p.id === v.winner) || {}).name;
    let reason = '';
    if (v.endReason === 'resign') reason = won ? 'Đối thủ xin thua — bạn thắng!' : esc(cleanName(wName)) + ' thắng vì bạn xin thua.';
    else if (v.endReason === 'den') reason = won ? 'Bạn vào được hang địch — thắng ngay!' : esc(cleanName(wName)) + ' vào hang của bạn — thắng ngay!';
    else if (v.endReason === 'capture') reason = won ? 'Bạn ăn hết 8 quân địch!' : esc(cleanName(wName)) + ' ăn hết quân của bạn!';
    else if (v.endReason === 'blocked') reason = won ? 'Đối thủ hết nước đi!' : 'Bạn hết nước đi!';
    ui.openModal(`<h2>${won ? '🏆 Bạn thắng!' : '🏆 ' + esc(cleanName(wName)) + ' thắng!'}</h2>
      <p style="text-align:center">${reason}</p>
      <div class="btn-col">${ui.isHost
        ? '<button class="btn big pri" id="m-again">🔁 Chơi ván mới</button><button class="btn" id="m-lobby">Về phòng chờ</button>'
        : '<button class="btn" id="m-close">Đóng — chờ chủ phòng mở ván mới</button>'}
      <button class="btn" id="m-home">🏠 Về trang chủ</button></div>`);
    const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); ui.net.raw.start(); };
    const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); ui.net.raw.restart(); };
    const close = $('#m-close'); if (close) close.onclick = ui.closeModal;
    $('#m-home').onclick = () => { ui.closeModal(); ui.leave(); setTimeout(() => { location.href = '../'; }, 250); };
  }
}

/* ---------- bấm quân để chọn, bấm ô đích để đi ---------- */
$('#board-inner').addEventListener('click', e => {
  const cell = e.target.closest('.ct-cell');
  if (!cell || !cur || cur.phase !== 'playing') return;
  const x = Number(cell.dataset.x), y = Number(cell.dataset.y);
  if (!ui.net) { tip('Chưa vào ván.'); return; }
  if (!ui.controls(cur.turn)) { tip(cur.spec ? 'Bạn đang xem ván đấu 👀' : 'Chưa tới lượt bạn.'); return; }
  const c = cur.cells[idx(x, y)];
  /* bấm vào ô đích của quân đang chọn → đi */
  if (sel) {
    const mv = selMoves.find(m => m.tx === x && m.ty === y);
    if (mv) {
      const from = { ...sel };
      sel = null; selMoves = [];
      ui.actAs(cur.turn, { type: 'move', from, to: { x, y } });
      return;
    }
  }
  /* bấm vào quân của người đang tới lượt → chọn / đổi quân chọn */
  const turnSide = (cur.players.find(p => p.id === cur.turn) || {}).side;
  if (c !== 0 && sideOf(c) === turnSide) {
    if (sel && sel.x === x && sel.y === y) { sel = null; selMoves = []; }
    else {
      sel = { x, y };
      selMoves = legalMovesFrom(cur, cur.turn, x, y);
      Snd.select();
      if (!selMoves.length) tip('Quân này đang bị chặn hết, không đi được ô nào.');
    }
    const inner = $('#board-inner');
    inner.dataset.sel = sel ? sel.x + ',' + sel.y : '';
    inner.innerHTML = boardHTML(cur);
    return;
  }
  /* bấm vào ô khác → bỏ chọn */
  if (sel) {
    sel = null; selMoves = [];
    const inner = $('#board-inner');
    inner.dataset.sel = '';
    inner.innerHTML = boardHTML(cur);
  }
});

/* ---------- nút phụ ---------- */
function openGuide() { ui.openModal(GUIDE_HTML); const c = $('#m-close'); if (c) c.onclick = ui.closeModal; }
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
$('#btn-log').onclick = () => {
  const v = cur, log = v ? v.log.slice().reverse() : [];
  ui.openModal(`<h2>📜 Nhật ký trận đấu</h2>${log.length ? `<ul class="logl">${log.map(l => `<li class="${l.kind || ''}">${esc(l.text)}</li>`).join('')}</ul>` : '<p style="text-align:center;color:var(--muted)">Chưa có gì.</p>'}<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
};
$('#btn-new').onclick = () => {
  if (!cur) return;
  if (!ui.isHost) { tip('Chỉ chủ phòng mở ván mới được.'); return; }
  ui.net.raw.start();
};
$('#btn-resign').onclick = async () => {
  const v = cur;
  if (!v || v.phase === 'ended') return;
  const r = await confirmBox('Nhận thua ván này? Đối thủ thắng luôn.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  /* online: xin thua cho chính mình; chơi chung máy: xin thua cho người đang tới lượt */
  if (mode === 'online') ui.act({ type: 'resign' });
  else ui.actAs(v.turn, { type: 'resign' });
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'cothu', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
    else if (mode === 'pvp') {
      const n2 = ($('#name2').value.trim() || 'Người chơi 2').slice(0, 16);
      if (!h.addLocal(n2)) h.addBot({ level: 'hard' });
    }
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => { render(v, prev); },
});

/* 🏠 nút home phải về đúng trang chủ web (gameKit chỉ về màn hình đầu của game) */
$('#btn-leave').onclick = async () => {
  const r = await confirmBox(ui.isHost ? 'Bạn là chủ phòng: rời đi là cả phòng giải tán.' : 'Bạn có thể vào lại bằng mã phòng.', { title: 'Rời ván?', ok: 'Rời ván', cancel: 'Ở lại', danger: true });
  if (r) { ui.leave(); setTimeout(() => { location.href = '../'; }, 250); }
};
