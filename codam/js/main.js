// 🔴⚫ Cờ Đam – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng
// shared/net/simplenet.js (cùng pattern Cờ Thú / Cờ Vây: chủ phòng giữ
// state, khách chỉ gửi action {type, from?, to?}). Bấm quân mình để chọn
// (hiện các nước đi được), bấm ô đích để đi; ăn là bắt buộc, ăn xong còn
// ăn tiếp được thì phải ăn tiếp bằng đúng quân đó.
import { createGame, applyAction, viewFor, actors, W, H, idx, isDark, sideOf, isKing, coordName, legalMoves, legalMovesFrom, counts } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet({
  game: 'codam', min: 2, max: 2, maxSeats: 10, allowLocal: true,
  minMsg: 'Cờ Đam cần 2 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: { side: 'red', timer: 0 },
  optOk: (k, v) => (k === 'side' && ['red', 'black', 'random'].includes(v)) || (k === 'timer' && [0, 30, 60].includes(+v)),
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
  try { localStorage.setItem('gumballz-codam-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
try {
  const sm = localStorage.getItem('gumballz-codam-mode');
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
  const o = info.opts || {}, dis = ui.isHost ? '' : 'disabled';
  $('#opts').innerHTML = `<div class="opt"><b>🔴 Quân của chủ phòng</b><div class="seg">${[['red', '🔴 Đỏ (đi trước)'], ['black', '⚫ Đen'], ['random', '🎲 Ngẫu nhiên']].map(([v, n]) => `<button type="button" data-side="${v}" aria-pressed="${o.side === v}" ${dis}>${n}</button>`).join('')}</div><small>Đỏ luôn đi trước — chọn Đen thì bạn đi sau.</small></div>
  <div class="opt"><b>⏱️ Đồng hồ đi</b><div class="seg">${[[0, 'Tắt'], [30, '30 giây'], [60, '60 giây']].map(([v, n]) => `<button type="button" data-timer="${v}" aria-pressed="${+o.timer === v}" ${dis}>${n}</button>`).join('')}</div><small>Hết giờ mà chưa đi thì game tự đi 1 nước hợp lệ giúp bạn.</small></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = seated.length < 2;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.net.raw;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
  else if (b.id === 'btn-addlocal') {
    const n = await promptBox('Hai người chuyền máy cho nhau, mỗi người một lượt.', { title: '👥 Tên người chơi thứ hai', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
  else if (b.dataset.side && ui.isHost) h.setOpt('side', b.dataset.side);
  else if (b.dataset.timer && ui.isHost) h.setOpt('timer', +b.dataset.timer);
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
/* chế độ local: mở phòng offline trên máy này, thêm máy / người cùng máy theo chế độ đã chọn */
$('#btn-start').onclick = () => {
  ui.startHost(true);
};

/* ---------- đồng hồ đi (mỗi máy tự chạy cho người mình điều khiển) ---------- */
let timerInt = null, timerLeft = 0, timerKey = '';
function stopTimer() { if (timerInt) { clearInterval(timerInt); timerInt = null; } }
function drawTimerChip() {
  const el = $('#timer-left'); if (el) el.textContent = Math.max(0, timerLeft);
  const chip = $('#timer-chip'); if (chip) chip.classList.toggle('low', timerLeft <= 10);
}
function startTimer(v) {
  stopTimer();
  timerLeft = v.timer;
  drawTimerChip();
  timerInt = setInterval(() => {
    timerLeft--;
    drawTimerChip();
    if (timerLeft > 0) return;
    stopTimer();
    const s = ui.net && ui.net.raw && ui.net.raw.state;
    if (!s || s.phase !== 'playing' || s.turn !== v.turn) return;
    const moves = legalMoves(s, s.turn);
    if (moves.length) {
      const m = moves[Math.floor(Math.random() * moves.length)];
      ui.actAs(s.turn, { type: 'move', from: { x: m.fx, y: m.fy }, to: { x: m.tx, y: m.ty } });
      tip('Hết giờ — game tự đi 1 nước giúp bạn.');
    }
  }, 1000);
}

/* ---------- ván chơi ---------- */
let cur = null, endShownGid = null, lastSeq = -1;
let sel = null; /* { x, y } quân đang chọn */
let selMoves = []; /* nước đi hợp lệ của quân đang chọn */

function cellClass(v, x, y) {
  const cls = ['cd-cell'];
  if (isDark(x, y)) cls.push('dark');
  const lm = v.lastMove;
  if (lm) {
    if (lm.from.x === x && lm.from.y === y) cls.push('last-from');
    if (lm.to.x === x && lm.to.y === y) cls.push('last-to');
  }
  if (sel && sel.x === x && sel.y === y) cls.push('sel');
  const sm = selMoves.find(m => m.tx === x && m.ty === y);
  if (sm) cls.push(sm.capture ? 'move-cap' : 'move-dot');
  /* quân đang bắt buộc ăn: chỉ tô khi tới lượt người mình điều khiển */
  if (v.phase === 'playing' && ui.controls(v.turn) && !sm) {
    const c = v.cells[idx(x, y)];
    const turnSide = (v.players.find(p => p.id === v.turn) || {}).side;
    if (c !== 0 && sideOf(c) === turnSide && legalMovesFrom(v, v.turn, x, y).some(m => m.capture)) cls.push('must');
  }
  return cls.join(' ');
}
function boardHTML(v) {
  let html = '';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = idx(x, y), c = v.cells[n];
      const side = c !== 0 ? sideOf(c) : null;
      const king = c !== 0 && isKing(c);
      const piece = c !== 0
        ? `<span class="piece ${side === 'R' ? 'r' : 'b'}${king ? ' king' : ''}">${king ? '<span class="crown">👑</span>' : ''}</span>`
        : '';
      html += `<button type="button" class="${cellClass(v, x, y)}" data-x="${x}" data-y="${y}" aria-label="Ô ${coordName(x, y)}${c !== 0 ? `, quân ${side === 'R' ? 'Đỏ' : 'Đen'}${king ? ' Vua' : ''}` : ''}">${piece}</button>`;
    }
  }
  return html;
}

function sideLabel(side) { return side === 'R' ? '🔴 Đỏ' : '⚫ Đen'; }

function render(v, prev) {
  cur = v;
  if (!v) { lastSeq = -1; endShownGid = null; sel = null; selMoves = []; stopTimer(); timerKey = ''; return; }
  const me = v.players.find(p => p.id === v.me);
  const turnP = v.players.find(p => p.id === v.turn);
  const away = (v.away || []).map(id => (v.players.find(p => p.id === id) || {}).name).filter(Boolean);
  /* âm thanh nước mới */
  if (v.lastMove && v.lastMove.n !== lastSeq) {
    if (lastSeq !== -1) {
      if (v.lastMove.captured.length) Snd.capture();
      else Snd.place();
      if (v.lastMove.crowned) Snd.crown();
    }
    lastSeq = v.lastMove.n;
  }
  /* đang nhảy dở: tự chọn đúng quân đang nhảy để hiện nước ăn tiếp */
  if (v.midJump && v.phase === 'playing' && ui.controls(v.turn)) {
    sel = { x: v.midJump.x, y: v.midJump.y };
    selMoves = legalMovesFrom(v, v.turn, sel.x, sel.y);
  } else if (sel) {
    const c = v.cells[idx(sel.x, sel.y)];
    const turnSide = (v.players.find(p => p.id === v.turn) || {}).side;
    if (v.phase !== 'playing' || !c || sideOf(c) !== turnSide) { sel = null; selMoves = []; }
    else selMoves = legalMovesFrom(v, v.turn, sel.x, sel.y);
  }
  /* đồng hồ đi: reset khi đổi lượt, chỉ chạy cho người mình điều khiển */
  const tKey = v.gid + ':' + v.turnNo;
  if (v.timer && v.phase === 'playing') {
    if (tKey !== timerKey) {
      timerKey = tKey;
      if (ui.controls(v.turn)) startTimer(v); else stopTimer();
    }
  } else { stopTimer(); timerKey = ''; }
  const timerChip = v.timer && v.phase === 'playing' ? ` <span class="timer-chip" id="timer-chip">⏱️ <b id="timer-left">${timerLeft}</b>s</span>` : '';
  $('#round').innerHTML = v.phase === 'ended'
    ? (v.draw ? `🤝 Hòa${v.endReason === 'draw-40' ? ' — 40 nước không ăn quân nào!' : v.endReason === 'draw-rep' ? ' — lặp lại vị trí 3 lần!' : ' — cả 2 đồng ý!'}`
      : v.endReason === 'resign' ? `🏳️ ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name))} thắng — đối thủ xin thua!`
      : v.endReason === 'blocked' ? `🏁 ${v.winner === v.me ? 'Bạn thắng! 🎉' : esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name)) + ' thắng!'} — đối thủ hết nước đi.`
      : `🏁 ${v.winner === v.me ? 'Bạn thắng! 🎉' : esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name)) + ' thắng!'} — ăn hết quân địch.`)
    : `⚔️ Lượt ${v.turnNo} · ${turnP ? (turnP.id === v.me ? 'tới lượt bạn!' : 'đang chờ ' + esc(cleanName(turnP.name)) + '…') : ''}${v.midJump ? ' · 🔁 Ăn tiếp!' : ''}${v.mustCapture && ui.controls(v.turn) ? ' · ⚠️ Bắt buộc ăn!' : ''}${away.length ? ` · ⚠️ ${esc(away.join(', '))} mất kết nối — máy sẽ đi thay` : ''}${timerChip}`;
  $('#seats').innerHTML = v.players.map(p => {
    const cnt = counts(v);
    const n = p.side === 'R' ? cnt.Rtotal : cnt.Btotal;
    const nk = p.side === 'R' ? cnt.RK : cnt.BK;
    const eaten = (v.captured[p.id] || []).length;
    return `<div class="seat${p.id === v.turn && v.phase === 'playing' ? ' on' : ''}">${avatar(p.name, 40)}<b>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}</b>
      <span class="side-badge ${p.side === 'R' ? 'r' : 'b'}">${p.side === 'R' ? '🔴' : '⚫'}</span>
      <small>${sideLabel(p.side)} · ${n} quân${nk ? ` (${nk} 👑)` : ''} · ăn ${eaten}${p.isBot ? ' · máy ' + (p.level === 'easy' ? 'Dễ' : 'Khó') : p.local ? ' · cùng máy' : ''}</small></div>`;
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
      ? list.map(c => `<span class="mini ${c.king ? 'r' : 'b'}" title="${c.king ? 'Vua' : 'Quân thường'}">${c.king ? '👑' : '●'}</span>`).join('')
      : '<span class="none">Chưa ăn quân nào</span>';
  };
  const pR = v.players.find(p => p.side === 'R'), pB = v.players.find(p => p.side === 'B');
  $('#tray-r').innerHTML = `<h4 class="r">🔴 ${esc(cleanName((pR || {}).name || 'Đỏ'))} đã ăn</h4><div class="cap">${tray(pR ? pR.id : '')}</div>`;
  $('#tray-b').innerHTML = `<h4 class="b">⚫ ${esc(cleanName((pB || {}).name || 'Đen'))} đã ăn</h4><div class="cap">${tray(pB ? pB.id : '')}</div>`;
  /* dải đề nghị hòa */
  const db = $('#draw-bar');
  if (v.phase === 'playing' && v.drawOffer) {
    const offerer = v.players.find(p => p.id === v.drawOffer);
    const other = v.players.find(p => p.id !== v.drawOffer);
    if (v.drawOffer === v.me || (mode !== 'online' && ui.controls(v.drawOffer))) {
      db.innerHTML = `<div>🤝 Bạn đã đề nghị hòa — đang chờ ${esc(cleanName((other || {}).name || 'đối thủ'))} trả lời…</div><div class="btns"><button class="btn" id="btn-draw-cancel">Rút đề nghị</button></div>`;
      $('#btn-draw-cancel').onclick = () => drawAct({ type: 'draw' });
    } else if (ui.controls(other ? other.id : '')) {
      db.innerHTML = `<div>🤝 ${esc(cleanName((offerer || {}).name || 'Đối thủ'))} đề nghị hòa — bạn có đồng ý không?</div><div class="btns"><button class="btn pri" id="btn-draw-yes">Đồng ý hòa</button><button class="btn" id="btn-draw-no">Từ chối, đánh tiếp</button></div>`;
      $('#btn-draw-yes').onclick = () => drawAct({ type: 'draw' });
      $('#btn-draw-no').onclick = () => drawAct({ type: 'draw-decline' });
    } else {
      db.innerHTML = `<div>🤝 ${esc(cleanName((offerer || {}).name || 'Đối thủ'))} đề nghị hòa — đang chờ ${esc(cleanName((other || {}).name || 'đối thủ'))} trả lời…</div>`;
    }
  } else {
    db.innerHTML = '';
  }
  const log = $('#log');
  log.innerHTML = v.log.slice(-12).reverse().map(l => `<div>${esc(l.text)}</div>`).join('') || '<div>Chưa có nước đi nào.</div>';
  /* kết thúc: hộp thoại (1 lần / ván)
     Số ván/thắng do stats.watch() tự ghi khi ván kết thúc (simplenet bọc onState)
     — KHÔNG gọi record() tay ở đây, kẻo đếm trùng.
     Huy hiệu riêng (cd-*) do SP.codam trong shared/ui/stats.js tự phát hiện
     từ view (tick/end) — main.js không ghi gì thêm. */
  if (v.phase === 'ended' && endShownGid !== v.gid && !v.spec) {
    endShownGid = v.gid;
    const won = v.winner === v.me;
    if (won) Snd.winJingle();
    const wName = (v.players.find(p => p.id === v.winner) || {}).name;
    let reason = '';
    if (v.draw) reason = v.endReason === 'draw-40' ? '40 nước không ăn quân nào.' : v.endReason === 'draw-rep' ? 'Lặp lại vị trí 3 lần.' : 'Cả 2 cùng đồng ý hòa.';
    else if (v.endReason === 'resign') reason = won ? 'Đối thủ xin thua — bạn thắng!' : esc(cleanName(wName)) + ' thắng vì bạn xin thua.';
    else if (v.endReason === 'blocked') reason = won ? 'Đối thủ hết nước đi!' : 'Bạn hết nước đi!';
    else reason = won ? 'Bạn ăn hết 12 quân địch!' : esc(cleanName(wName)) + ' ăn hết quân của bạn!';
    ui.openModal(`<h2>${v.draw ? '🤝 Ván hòa!' : won ? '🏆 Bạn thắng!' : '🏆 ' + esc(cleanName(wName)) + ' thắng!'}</h2>
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
/* hành động hòa: online thì gửi với tư cách chính mình; chơi chung máy thì
   gửi với tư cách người đang tới lượt / người được đề nghị (chủ phòng điều
   khiển cả 2 ghế) */
function drawAct(a) {
  const v = cur;
  if (!v) return;
  if (mode === 'online') { ui.act(a); return; }
  const other = v.drawOffer ? v.players.find(p => p.id !== v.drawOffer) : null;
  const actor = a.type === 'draw' && !v.drawOffer ? v.turn : (other ? other.id : v.turn);
  ui.actAs(actor, a);
}

/* ---------- bấm quân để chọn, bấm ô đích để đi ---------- */
$('#board-inner').addEventListener('click', e => {
  const cell = e.target.closest('.cd-cell');
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
$('#btn-draw').onclick = async () => {
  const v = cur;
  if (!v || v.phase === 'ended') return;
  if (v.drawOffer) { tip('Đã có đề nghị hòa đang chờ trả lời.'); return; }
  const r = await confirmBox('Đề nghị hòa với đối thủ? Đối thủ đồng ý thì ván hòa, từ chối thì đánh tiếp.', { title: '🤝 Xin hòa', ok: 'Đề nghị hòa', cancel: 'Đánh tiếp' });
  if (!r) return;
  if (mode === 'online') ui.act({ type: 'draw' });
  else ui.actAs(v.turn, { type: 'draw' });
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'codam', net: NET,
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
