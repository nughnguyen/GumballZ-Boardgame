// 🟦 Blokus – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Quoridor:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Cách chơi trên giao diện: chọn 1 mảnh ở khay bên dưới, bấm 🔄 Xoay
// / ↔️ Lật để đổi hướng, rê chuột lên bàn xem trước (xanh lá = đặt được,
// đỏ = phạm luật), rồi bấm vào 1 ô trên bàn để đặt — ô bấm là góc
// trên-trái của mảnh.
import { createGame, applyAction, viewFor, actors, validatePlacement, legalPlacements, orientCells, COLORS, SIZE, TOTAL_SQUARES, seatPlayerIdx } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=53';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=16';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet({
  game: 'blokus', min: 2, max: 4, maxSeats: 4, allowLocal: true,
  minMsg: 'Blokus cần 2–4 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: { firstSeat: 0 },
  optOk: (k, v) => k === 'firstSeat' && Number.isInteger(v) && v >= 0 && v < 4,
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 700 + Math.random() * 900,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu', 'Bánh', 'Cốm'],
});

/* ---------- ghế đi đầu xoay vòng (ván sau đổi ghế) ---------- */
const FIRST_KEY = 'gumballz-blokus-nextfirst';
let optsLoaded = false, announcedGid = '';
function nextFirstSeat() {
  let v = 0;
  try { const s = ls.get(FIRST_KEY); v = s == null ? Math.floor(Math.random() * 4) : (parseInt(s, 10) || 0) % 4; } catch (e) { v = Math.floor(Math.random() * 4); }
  return (v + 4) % 4;
}
function advanceFirstSeat() { try { ls.set(FIRST_KEY, String((nextFirstSeat() + 1) % 4)); } catch (e) {} }
/* mở ván mới: ghế đi đầu lấy từ khóa đã lưu — ghi vào opt (phòng chờ hiện huy hiệu)
   + extra (engine dùng), rồi xoay khóa cho ván sau */
function startRotated() {
  const h = ui.net && ui.net.raw;
  if (!h || !ui.isHost) return false;
  const f = nextFirstSeat();
  try { if (typeof h.setOpt === 'function') h.setOpt('firstSeat', f); } catch (e) {}
  h.start({ firstSeat: f });
  advanceFirstSeat();
  return true;
}
/* công bố người đi đầu lúc mở ván (mọi client đều thấy) — chỉ khi chưa ai đặt mảnh */
function announceFirst(v) {
  if (!v || v.phase !== 'playing' || v.round !== 1 || v.gid === announcedGid) return;
  if (!v.seats.every(se => se.placed === 0)) return;
  announcedGid = v.gid;
  const fp = v.players.find(p => p.id === v.firstPid) || v.players[0];
  tip(`🎯 ${fp.id === v.me ? 'Bạn' : cleanName(fp.name)} đi trước (màu ${COLORS[v.firstSeat].name})!`);
}

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
let playerCount = 2; /* đấu máy: tổng số người (bạn + máy) */
try {
  const c = +localStorage.getItem('gumballz-blokus-count');
  if (c >= 2 && c <= 4) playerCount = c;
} catch (e) {}
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const countBtns = [...document.querySelectorAll('#count-seg [data-count]')];
function drawCount() {
  countBtns.forEach(b => { b.classList.toggle('on', +b.dataset.count === playerCount); b.setAttribute('aria-pressed', +b.dataset.count === playerCount); });
}
countBtns.forEach(b => b.addEventListener('click', () => {
  playerCount = +b.dataset.count; drawCount();
  try { localStorage.setItem('gumballz-blokus-count', String(playerCount)); } catch (e) {}
}));
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#count-box').style.display = (m === 'ai-easy' || m === 'ai-hard') ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'pvp' ? '👥 Mở phòng chuyền tay' : m === 'ai-easy' ? `🤖 Bắt đầu chơi với máy Dễ (${playerCount} người)` : `🧠 Bắt đầu chơi với máy Khó (${playerCount} người)`;
  try { localStorage.setItem('gumballz-blokus-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
drawCount();
try {
  const sm = localStorage.getItem('gumballz-blokus-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }
// đổi số người thì cập nhật chữ nút Bắt đầu
countBtns.forEach(b => b.addEventListener('click', () => setMode(mode)));

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const host = ui.isHost && ui.net ? ui.net.raw : null;
  if (host && !optsLoaded) { /* nhớ ghế đi đầu của ván tới cho cả phòng thấy */
    optsLoaded = true;
    const f = nextFirstSeat();
    if (host.opts.firstSeat !== f) { host.setOpt('firstSeat', f); return; }
  }
  const n = info.players.length;
  const fs = (info.opts && Number.isInteger(info.opts.firstSeat)) ? info.opts.firstSeat : 0;
  const firstP = seatPlayerIdx(Math.max(2, Math.min(4, n)), fs);
  $('#pcount').textContent = `${n}/4 người (cần 2–4)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${i === firstP ? '<span class="seat-role">🎯 Đi trước</span>' : ''}${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (n < 4
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  $('#opts').innerHTML = `<div class="opt"><b>🟦 Bàn cờ</b><div class="role-note">Bàn 20×20 ô, mỗi màu 21 mảnh (89 ô). Mảnh đầu phủ góc, mảnh sau chạm chéo cùng màu và không chạm cạnh cùng màu. Đặt hết mảnh thưởng +15, mảnh 1 ô cuối cùng +20. Ghế đi đầu xoay vòng mỗi ván (xem huy hiệu 🎯 ở tên người chơi).</div></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = n < 2 || n > 4;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
  $('#wait-msg').textContent = n < 2 ? `Cần ít nhất 2 người mới bắt đầu (đang có ${n}).` : 'Đang chờ chủ phòng bắt đầu…';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.net.raw;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
  else if (b.id === 'btn-addlocal') {
    const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó đánh. Nhớ che màn hình trước khi đưa máy!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
});
$('#btn-start-online').onclick = () => { if (ui.isHost) startRotated(); };
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
let selPiece = null; /* id mảnh đang chọn, hoặc null */
let selRot = 0, selFlip = false;
let selSeatColor = null; /* màu của ghế lúc chọn mảnh — đổi ghế thì bỏ chọn */
let prevCells = []; /* các ô đang tô xem trước */

function controlPid(v) {
  if (!v || v.phase !== 'playing') return null;
  const pid = v.turn;
  return pid && ui.controls(pid) ? pid : null;
}
function pendingHuman(v) {
  if (!v || v.phase !== 'playing') return null;
  const p = v.players.find(x => x.id === v.turn);
  return p && !p.isBot ? p : null;
}
function seatOf(v, color) { return v.seats.find(se => se.color === color); }
function seatStats(v, pid) {
  const seats = v.seats.filter(se => se.pid === pid);
  return {
    squaresLeft: seats.reduce((a, se) => a + (TOTAL_SQUARES - se.squares), 0),
    piecesLeft: seats.reduce((a, se) => a + se.pieces.length, 0),
    bonus: seats.reduce((a, se) => a + se.bonus, 0),
  };
}
function clearPreview() {
  for (const el of prevCells) el.classList.remove('prev-ok', 'prev-bad');
  prevCells = [];
}
function clearSelection() { selPiece = null; selRot = 0; selFlip = false; selSeatColor = null; }

function boardHtml(v) {
  const me = controlPid(v);
  const turnSeat = v.seats[v.turnSeat];
  let html = '';
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const k = r * SIZE + c;
      const col = v.board[k];
      const cornerSeat = v.seats.find(se => se.corner[0] === r && se.corner[1] === c);
      const cls = ['bk-cell'];
      if (col >= 0) cls.push('c' + col);
      if (cornerSeat) cls.push('corner');
      if (turnSeat && turnSeat.placed === 0 && cornerSeat && cornerSeat.color === turnSeat.color) cls.push('corner-hint');
      html += `<div class="${cls.join(' ')}" data-cell="${r},${c}"></div>`;
    }
  }
  return html;
}

function trayHtml(v) {
  const turnSeat = v.seats[v.turnSeat];
  if (!turnSeat) return '';
  const turnP = v.players.find(p => p.id === turnSeat.pid) || {};
  const color = COLORS[turnSeat.color];
  let html = '';
  for (const pieceId of turnSeat.pieces) {
    const cells = (selPiece === pieceId)
      ? orientCells(pieceId, selRot, selFlip)
      : orientCells(pieceId, 0, false);
    const maxR = Math.max(...cells.map(x => x[0])) + 1;
    const maxC = Math.max(...cells.map(x => x[1])) + 1;
    const set = new Set(cells.map(x => x.join(',')));
    let grid = '';
    for (let r = 0; r < maxR; r++) {
      for (let c = 0; c < maxC; c++) {
        grid += `<span class="bk-tsq${set.has(r + ',' + c) ? ' on c' + turnSeat.color : ''}"></span>`;
      }
    }
    html += `<div class="bk-tpiece${selPiece === pieceId ? ' sel' : ''}" data-piece="${pieceId}" title="Mảnh ${pieceId.toUpperCase()} (${cells.length} ô)"><div class="bk-tgrid" style="grid-template-columns:repeat(${maxC},11px)">${grid}</div></div>`;
  }
  $('#tray-label').innerHTML = `Mảnh của <b>${esc(cleanName(turnP.name || '…'))}</b> — màu <b>${color.name}</b> · còn <b>${turnSeat.pieces.length}</b> mảnh`;
  return html || '<div class="empty-note">Màu này đã đặt hết 21 mảnh! 🎉</div>';
}

function render(v, prev) {
  cur = v;
  if (!v) { clearSelection(); endShownFor = ''; return; }
  announceFirst(v);
  const me = v.players.find(p => p.id === v.me) || {};
  const turnP = v.players.find(p => p.id === v.turn);
  const turnSeat = v.seats[v.turnSeat];
  const pid = controlPid(v);
  if (!pid || !turnSeat || selSeatColor !== turnSeat.color) clearSelection();
  clearPreview();

  $('#round').textContent = v.phase === 'ended'
    ? `🏁 Trận đã kết thúc — ${v.winner ? cleanName((v.players.find(p => p.id === v.winner) || {}).name) + ' thắng trận!' : 'không có người thắng.'}`
    : `🟦 Vòng ${v.round} · Lượt của ${turnP ? cleanName(turnP.name) : '…'} — màu ${turnSeat ? COLORS[turnSeat.color].name : '…'}${turnP && turnP.isBot ? ' 🤖' : ''}`;
  $('#status').innerHTML = v.players.map((p) => {
    const st = seatStats(v, p.id);
    const colorNames = p.colors.map(ci => COLORS[ci].name).join('+');
    return `<span class="stat ${p.id === v.me ? 'me' : ''}">${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}: <b>${colorNames}</b> · còn ${st.squaresLeft} ô · ${st.piecesLeft} mảnh</span>`;
  }).join('');

  $('#board').innerHTML = boardHtml(v);
  if (v.phase === 'playing') $('#tray').innerHTML = trayHtml(v);
  else { $('#tray').innerHTML = ''; $('#tray-label').innerHTML = ''; }

  $('#players').innerHTML = v.players.map((p, i) => {
    const st = seatStats(v, p.id);
    const sum = v.final ? v.final.summary[p.id] : null;
    const two = p.colors.length === 2;
    const dotCls = two ? ('bk-dot two' + (p.colors[0] === 1 ? ' b' : '')) : ('bk-dot c' + (p.colors[0] ?? 0));
    return `<div class="bk-player ${p.id === v.turn && v.phase === 'playing' ? 'turn' : ''} ${p.id === v.me ? 'me' : ''}">
      <span class="${dotCls}"></span>
      <div class="bk-pinfo">
        <b>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === v.me ? ' (bạn)' : ''}${p.id === v.winner ? ' 👑' : ''}</b>
        <span class="bk-ptotal">còn ${sum ? sum.squaresLeft : st.squaresLeft} ô · ${sum ? sum.piecesLeft : st.piecesLeft} mảnh${v.phase === 'ended' ? ` · thưởng +${sum ? sum.bonus : 0}` : ''}</span>
        <span class="bk-pmeta">${v.phase === 'ended' ? `Điểm ${p.score}` : `đã đặt ${p.turns} mảnh · màu ${p.colors.map(ci => COLORS[ci].name).join('+')}`}</span>
      </div>
    </div>`;
  }).join('');

  /* ----- dòng hướng dẫn lượt ----- */
  if (v.phase !== 'playing') {
    $('#stage-info').innerHTML = '';
  } else if (!pid) {
    $('#stage-info').innerHTML = `Đang chờ ${turnP ? esc(cleanName(turnP.name)) : 'đối thủ'} đi…`;
  } else if (turnSeat.placed === 0) {
    $('#stage-info').innerHTML = `Mảnh đầu tiên của màu ${COLORS[turnSeat.color].name} <b>phải phủ đúng góc</b> (ô đang nhấp nháy) — chọn 1 mảnh ở khay bên dưới rồi bấm vào góc.`;
  } else if (legalPlacements(v, turnSeat.color).length === 0) {
    $('#stage-info').innerHTML = '<span class="need">Bạn không còn chỗ đặt hợp lệ — bấm 🏳️ Bỏ lượt.</span>';
  } else if (selPiece) {
    $('#stage-info').innerHTML = `Đã chọn mảnh <b>${selPiece.toUpperCase()}</b> — bấm vào 1 ô trên bàn để đặt (ô bấm là góc trên-trái của mảnh; xanh lá = đặt được, đỏ = phạm luật).`;
  } else {
    $('#stage-info').innerHTML = 'Chọn 1 mảnh ở khay bên dưới, bấm 🔄 Xoay / ↔️ Lật nếu cần, rồi bấm vào 1 ô trên bàn để đặt.';
  }
  $('#btn-pass').classList.toggle('need-pass', !!(pid && turnSeat && turnSeat.placed > 0 && legalPlacements(v, turnSeat.color).length === 0));

  $('#log').innerHTML = v.log.slice().reverse().map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');

  /* âm thanh + hộp kết thúc */
  if (prev && v.phase === 'playing' && prev.phase === 'playing') {
    if (v.turn !== prev.turn) Snd.hint();
    else if (v.seq !== prev.seq) Snd.place();
  }
  if (v.phase === 'ended') {
    const k = v.gid + ':' + v.seq;
    if (endShownFor !== k) { endShownFor = k; showEnd(v); }
    if (v.winner === v.me) Snd.winJingle(); else if (prev && prev.phase !== 'ended') Snd.lose();
  }
}

/* ---------- hộp kết thúc ---------- */
function showEnd(v) {
  const winner = v.players.find(p => p.id === v.winner);
  const title = v.winner === v.me ? '👑 Bạn thắng trận!' : winner ? `🏁 ${esc(cleanName(winner.name))} thắng trận!` : '😢 Không ai thắng';
  const rows = (v.final ? v.final.scores : v.players.map(p => ({ id: p.id, name: p.name, score: p.score }))).map(s => {
    const p = v.players.find(x => x.id === s.id) || {};
    const sum = v.final ? v.final.summary[s.id] : null;
    return `<tr><td>${esc(cleanName(s.name))}${s.id === v.winner ? ' 👑' : ''}${s.id === v.me ? ' (bạn)' : ''}</td><td>${sum ? sum.squaresLeft : '–'} ô còn</td><td>${sum ? sum.piecesLeft : '–'} mảnh còn</td><td>+${sum ? sum.bonus : 0}</td><td>${s.score >= 0 ? '+' : ''}${s.score} điểm</td></tr>`;
  }).join('');
  const body = `<table style="width:100%;border-collapse:collapse;font-size:14px;text-align:center"><tr><th style="text-align:left">Người chơi</th><th>Còn lại</th><th>Mảnh còn</th><th>Thưởng</th><th>Điểm</th></tr>${rows}</table><p class="note">${v.winner === v.me ? 'Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.' : 'Chơi 1 ván +2 xu.'}</p>`;
  const btns = ui.isHost
    ? `<button class="btn big pri" id="m-again">🔁 Ván mới</button><button class="btn" id="m-lobby">Về phòng chờ</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`
    : `<button class="btn big pri" id="m-close">Đóng</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`;
  ui.openModal(`<h2>${title}</h2>${body}<div class="btns">${btns}</div>`, 'lock');
  const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); startRotated(); };
  const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); optsLoaded = false; ui.net.raw.restart(); };
  const home = $('#m-home'); if (home) home.onclick = () => { ui.closeModal(); ui.leave(); };
  const close = $('#m-close'); if (close) close.onclick = ui.closeModal;
}

/* ---------- tương tác: khay mảnh ---------- */
$('#tray').addEventListener('click', e => {
  const el = e.target.closest('[data-piece]');
  if (!el) return;
  if (!cur || cur.phase !== 'playing' || !controlPid(cur)) { tip('Chưa tới lượt bạn — đang chờ đối thủ đi.'); return; }
  const id = el.dataset.piece;
  if (selPiece === id) { clearSelection(); }
  else { selPiece = id; selRot = 0; selFlip = false; selSeatColor = cur.seats[cur.turnSeat].color; Snd.pick(); }
  render(cur, cur);
});
/* ---------- tương tác: bàn cờ ---------- */
function previewAt(r, c) {
  clearPreview();
  if (!cur || cur.phase !== 'playing' || !selPiece) return;
  const pid = controlPid(cur);
  if (!pid) return;
  const color = cur.seats[cur.turnSeat].color;
  const cells = orientCells(selPiece, selRot, selFlip);
  if (!cells) return;
  const ok = validatePlacement(cur, color, selPiece, selRot, selFlip, r, c).ok;
  for (const [dr, dc] of cells) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
    const el = document.querySelector(`[data-cell="${nr},${nc}"]`);
    if (el) { el.classList.add(ok ? 'prev-ok' : 'prev-bad'); prevCells.push(el); }
  }
}
$('#board').addEventListener('mouseover', e => {
  const cellEl = e.target.closest('[data-cell]');
  if (!cellEl) return;
  const [r, c] = cellEl.dataset.cell.split(',').map(Number);
  previewAt(r, c);
});
$('#board').addEventListener('mouseout', () => clearPreview());
$('#board').addEventListener('click', e => {
  const cellEl = e.target.closest('[data-cell]');
  if (!cellEl) return;
  if (!cur || cur.phase !== 'playing') return;
  const pid = controlPid(cur);
  if (!pid) { tip('Chưa tới lượt bạn — đang chờ đối thủ đi.'); return; }
  const [r, c] = cellEl.dataset.cell.split(',').map(Number);
  if (!selPiece) { tip('Chọn 1 mảnh ở khay bên dưới trước, rồi mới bấm vào bàn.'); return; }
  const color = cur.seats[cur.turnSeat].color;
  const chk = validatePlacement(cur, color, selPiece, selRot, selFlip, r, c);
  if (!chk.ok) { Snd.invalid(); tip(chk.reason); return; }
  ui.actAs(pid, { type: 'place', color, piece: selPiece, rot: selRot, flip: selFlip, r, c });
  clearSelection();
  Snd.place();
  render(cur, cur);
});
/* ---------- nút xoay / lật / bỏ lượt ---------- */
$('#btn-rotate').onclick = () => {
  if (!selPiece) { tip('Chọn 1 mảnh ở khay bên dưới trước, rồi mới xoay.'); return; }
  selRot = (selRot + 1) % 4;
  Snd.pick();
  render(cur, cur);
};
$('#btn-flip').onclick = () => {
  if (!selPiece) { tip('Chọn 1 mảnh ở khay bên dưới trước, rồi mới lật.'); return; }
  selFlip = !selFlip;
  Snd.pick();
  render(cur, cur);
};
$('#btn-pass').onclick = () => {
  if (!cur || cur.phase !== 'playing') return;
  const pid = controlPid(cur);
  if (!pid) { tip('Chưa tới lượt bạn — đang chờ đối thủ đi.'); return; }
  ui.actAs(pid, { type: 'pass' });
  clearSelection();
  Snd.place();
  render(cur, cur);
};

/* ---------- nút phụ ---------- */
function openGuide() { ui.openModal(GUIDE_HTML); const c = $('#m-close'); if (c) c.onclick = ui.closeModal; }
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
$('#btn-log').onclick = () => {
  const v = cur, log = v ? v.log.slice().reverse() : [];
  ui.openModal(`<h2>📜 Nhật ký ván chơi</h2>${log.length ? `<ul class="logl">${log.map(l => `<li class="${l.kind || ''}">${esc(l.text)}</li>`).join('')}</ul>` : '<p style="text-align:center;color:var(--muted)">Chưa có gì.</p>'}<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
};
$('#btn-new').onclick = () => {
  if (!cur) return;
  if (!ui.isHost) { tip('Chỉ chủ phòng mở ván mới được.'); return; }
  startRotated();
};
$('#btn-resign').onclick = async () => {
  const v = cur;
  if (!v || v.phase === 'ended') return;
  const r = await confirmBox('Nhận thua trận này? Trận kết thúc ngay, người còn lại có tổng điểm cao nhất thắng.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  if (mode === 'online') ui.act({ type: 'resign' });
  else {
    const pid = mode === 'pvp' ? ((pendingHuman(v) || {}).id || v.me) : v.me;
    ui.actAs(pid, { type: 'resign' });
  }
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'blokus', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      /* đấu máy: bạn + (số người − 1) máy */
      for (let i = 0; i < playerCount - 1; i++) h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
    }
    /* pvp: chủ phòng thêm người trong phòng chờ (thêm máy / người cùng máy) */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => { if (!v && !ui.net) optsLoaded = false; render(v, prev); },
});

/* 🏠 nút home phải về đúng trang chủ web (gameKit chỉ về màn hình đầu của game) */
$('#btn-leave').onclick = async () => {
  const r = await confirmBox(ui.isHost ? 'Bạn là chủ phòng: rời đi là cả phòng giải tán.' : 'Bạn có thể vào lại bằng mã phòng.', { title: 'Rời ván?', ok: 'Rời ván', cancel: 'Ở lại', danger: true });
  if (r) { ui.leave(); setTimeout(() => { location.href = '../'; }, 250); }
};
