// ❌⭕ TicTacToe – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng
// shared/net/simplenet.js (cùng pattern Bắn Tàu / Cờ Caro: chủ phòng giữ state,
// khách chỉ gửi action {x,y}). Bàn 3×3 ô lớn, bấm trực tiếp để đặt quân.
// KHÁC VỚI CARO: TicTacToe bàn 3×3 thắng 3 quân; Caro bàn 30×30 thắng 5 quân.
import { createGame, applyAction, viewFor, actors, idx } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=49';
import { gameKit, $, esc, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';
import { promptBox, confirmBox, toast as tip } from '../../shared/ui/dialog.js?v=8';
import { recordEvent } from '../../shared/ui/stats.js?v=71';

const NET = makeNet({
  game: 'tictactoe', min: 2, max: 2, maxSeats: 10, allowLocal: true,
  minMsg: 'TicTacToe cần 2 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
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
  try { localStorage.setItem('gumballz-tictactoe-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
try { const sm = localStorage.getItem('gumballz-tictactoe-mode'); if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard'); } catch (e) { setMode('ai-hard'); }

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const seated = info.players.slice(0, 2);
  $('#pcount').textContent = `${seated.length}/2 người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
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

function boardHTML(v) {
  const winSet = new Set(v.winLine || []);
  const lm = v.lastMove;
  let html = '';
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      const n = idx(v, x, y), m = v.cells[n];
      const cls = ['tt-cell'];
      if (m === 1) cls.push('x'); else if (m === 2) cls.push('o');
      if (lm && lm.x === x && lm.y === y) cls.push('last');
      if (winSet.has(n)) cls.push('win');
      html += `<button type="button" class="${cls.join(' ')}" data-x="${x}" data-y="${y}" aria-label="Ô ${x + 1}, hàng ${y + 1}${m === 1 ? ', quân X' : m === 2 ? ', quân O' : ''}">${m === 1 ? '✕' : m === 2 ? '◯' : ''}</button>`;
    }
  }
  return html;
}

function render(v, prev) {
  cur = v;
  if (!v) { lastSeq = -1; endShownGid = null; return; }
  const me = v.players.find(p => p.id === v.me);
  const foe = v.players.find(p => p.id !== v.me);
  const turnP = v.players.find(p => p.id === v.turn);
  const away = (v.away || []).map(id => (v.players.find(p => p.id === id) || {}).name).filter(Boolean);
  /* âm thanh nước mới */
  if (v.lastMove && v.lastMove.n !== lastSeq) {
    if (lastSeq !== -1) Snd.place();
    lastSeq = v.lastMove.n;
  }
  $('#round').innerHTML = v.phase === 'ended'
    ? (v.draw ? '🤝 Hòa!' : `🏁 ${v.winner === v.me ? 'Bạn thắng! 🎉' : esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name)) + ' thắng!'}`)
    : `⚔️ Lượt ${v.turnNo} · ${turnP ? (turnP.id === v.me ? 'tới lượt bạn!' : 'đang chờ ' + esc(cleanName(turnP.name)) + '…') : ''}${away.length ? ` · ⚠️ ${esc(away.join(', '))} mất kết nối — máy sẽ đi thay` : ''}`;
  $('#seats').innerHTML = v.players.map(p => {
    const cnt = p.mark === 'X' ? v.counts.X : v.counts.O;
    return `<div class="seat${p.id === v.turn && v.phase === 'playing' ? ' on' : ''}">${avatar(p.name, 40)}<b>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}</b>
      <span class="mark-badge ${p.mark === 'X' ? 'mx' : 'mo'}">${p.mark}</span>
      <small>đã đánh ${cnt} quân${p.isBot ? ' · máy ' + (p.level === 'easy' ? 'Dễ' : 'Khó') : p.local ? ' · cùng máy' : ''}</small></div>`;
  }).join('');
  const board = $('#board');
  board.innerHTML = boardHTML(v);
  const log = $('#log');
  log.innerHTML = v.log.slice(-12).reverse().map(l => `<div>${esc(l.text)}</div>`).join('') || '<div>Chưa có nước đi nào.</div>';
  /* kết thúc: ghi thành tựu + hộp thoại (1 lần / ván)
     Số ván/thắng do stats.watch() tự ghi khi ván kết thúc (simplenet bọc onState,
     mọi chế độ local/online đều qua Host) — KHÔNG gọi record() tay ở đây, kẻo đếm trùng.
     Chỉ ghi recordEvent cho huy hiệu thắng nhanh / hòa máy Khó. */
  if (v.phase === 'ended' && endShownGid !== v.gid && !v.spec) {
    endShownGid = v.gid;
    const won = v.winner === v.me;
    const foeBot = foe && foe.isBot;
    recordEvent('tictactoe', 'end', { won, moves: v.moveCount, draw: !!v.draw, foeBot: !!foeBot, foeLevel: foeBot ? foe.level : null });
    Snd.winJingle();
    const wName = (v.players.find(p => p.id === v.winner) || {}).name;
    const score = `X ${v.counts.X} – ${v.counts.O} O · ${v.moveCount} nước`;
    ui.openModal(`<h2>${v.draw ? '🤝 Hòa!' : won ? '🏆 Bạn thắng!' : '🏆 ' + esc(cleanName(wName)) + ' thắng!'}</h2>
      <p style="text-align:center">${v.draw ? 'Bàn đầy 9 ô mà không ai đủ 3 quân — hòa!' : won ? `Bạn xếp được 3 quân liên tiếp trước — thắng ${score}!` : esc(cleanName(wName)) + ' xếp được 3 quân liên tiếp trước — ' + score + '.'}</p>
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

/* ---------- bấm ô để đặt quân ---------- */
$('#board').addEventListener('click', e => {
  const cell = e.target.closest('.tt-cell');
  if (!cell) return;
  tryPlace(Number(cell.dataset.x), Number(cell.dataset.y));
});

function tryPlace(x, y) {
  const v = cur;
  if (!v || v.phase !== 'playing') return;
  if (!ui.net) { tip('Chưa vào ván.'); return; }
  if (!ui.controls(v.turn)) { tip(v.spec ? 'Bạn đang xem ván đấu 👀' : 'Chưa tới lượt bạn.'); return; }
  if (v.cells[idx(v, x, y)] !== 0) { tip('Ô này đã có quân rồi.'); return; }
  ui.actAs(v.turn, { type: 'move', x, y }); /* tiếng "cạch" kêu khi state mới về (render) */
}

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
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'tictactoe', net: NET,
  offline: h => {
    /* phòng offline trên máy này: thêm máy / người cùng máy theo chế độ đã chọn */
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
