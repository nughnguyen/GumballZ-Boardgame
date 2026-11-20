// ❌⭕ Cờ Caro – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng
// shared/net/simplenet.js (cùng pattern Bắn Tàu: chủ phòng giữ state, khách
// chỉ gửi action {x,y}). Bàn 30×30 xem bằng khung trượt: giữ + kéo để di
// chuyển góc nhìn, nhấn nhanh để đặt quân (kéo > 8px thì chỉ trượt, không đặt).
import { createGame, applyAction, viewFor, actors, idx } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=49';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';
import { promptBox, confirmBox, toast as tip } from '../../shared/ui/dialog.js?v=8';
import { recordEvent } from '../../shared/ui/stats.js?v=66';

const CELL = 34; /* px 1 ô ở zoom 1× (kể cả ô nhãn trục) */
const SIZE = 30;
const TAP_PX = 8; /* kéo xa hơn chừng này thì chỉ trượt bàn, không đặt quân */

const NET = makeNet({
  game: 'caro', min: 2, max: 2, maxSeats: 10, allowLocal: true,
  minMsg: 'Cờ Caro cần 2 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
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
  try { localStorage.setItem('gumballz-caro-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
try { const sm = localStorage.getItem('gumballz-caro-mode'); if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard'); } catch (e) { setMode('ai-hard'); }

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
/* góc nhìn bàn: translate (tx,ty) + zoom z trên #board-inner */
const view = { tx: 0, ty: 0, z: 1, init: false };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function applyView() {
  const inner = $('#board-inner');
  if (!inner) return;
  inner.style.transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.z})`;
  const zl = $('#zoom-label');
  if (zl) zl.textContent = Math.round(view.z * 100) + '%';
}
function viewportSize() {
  const vp = $('#board-viewport');
  return { w: vp.clientWidth, h: vp.clientHeight };
}
function centerOn(cx, cy) {
  const { w, h } = viewportSize();
  view.tx = w / 2 - (cx + 0.5) * CELL * view.z;
  view.ty = h / 2 - (cy + 0.5) * CELL * view.z;
  applyView();
}
function initView() {
  const { w } = viewportSize();
  /* mặc định: hiện ~14 ô ngang (đủ chơi trên mobile 390px), desktop hiện gần hết bàn */
  view.z = clamp(w / (14 * CELL), 0.5, 1);
  centerOn(15, 15);
  view.init = true;
}
function zoomBy(f, cx, cy) {
  const { w, h } = viewportSize();
  const px = cx == null ? w / 2 : cx, py = cy == null ? h / 2 : cy;
  const z2 = clamp(view.z * f, 0.4, 2.5);
  const k = z2 / view.z;
  view.tx = px - (px - view.tx) * k;
  view.ty = py - (py - view.ty) * k;
  view.z = z2;
  applyView();
}
function fitView() {
  const { w, h } = viewportSize();
  view.z = clamp(Math.min(w, h) / ((SIZE + 1) * CELL), 0.3, 1.2);
  centerOn(15, 15);
}
function cellFromPoint(clientX, clientY) {
  const vp = $('#board-viewport');
  const r = vp.getBoundingClientRect();
  const bx = (clientX - r.left - view.tx) / view.z;
  const by = (clientY - r.top - view.ty) / view.z;
  const x = Math.floor(bx / CELL) - 1, y = Math.floor(by / CELL) - 1; /* trừ 1 cột/hàng nhãn trục */
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return null;
  return { x, y };
}
function isVisible(x, y) {
  const { w, h } = viewportSize();
  const sx = view.tx + (x + 1.5) * CELL * view.z, sy = view.ty + (y + 1.5) * CELL * view.z;
  return sx >= 0 && sx <= w && sy >= 0 && sy <= h;
}

function boardHTML(v) {
  const winSet = new Set(v.winLine || []);
  const lm = v.lastMove;
  let html = '';
  for (let r = -1; r < SIZE; r++) {
    for (let c = -1; c < SIZE; c++) {
      if (r === -1 && c === -1) { html += '<span class="cr-axis corner"></span>'; continue; }
      if (r === -1) { html += `<span class="cr-axis">${c + 1}</span>`; continue; }
      if (c === -1) { html += `<span class="cr-axis">${r + 1}</span>`; continue; }
      const n = idx(v, c, r), m = v.cells[n];
      const cls = ['cr-cell'];
      if (m === 1) cls.push('x'); else if (m === 2) cls.push('o');
      if (lm && lm.x === c && lm.y === r) cls.push('last');
      if (winSet.has(n)) cls.push('win');
      html += `<button type="button" class="${cls.join(' ')}" data-x="${c}" data-y="${r}" aria-label="Ô ${c + 1}, hàng ${r + 1}${m === 1 ? ', quân X' : m === 2 ? ', quân O' : ''}">${m === 1 ? '✕' : m === 2 ? '◯' : ''}</button>`;
    }
  }
  return html;
}

function render(v, prev) {
  cur = v;
  if (!v) { lastSeq = -1; endShownGid = null; view.init = false; return; }
  const me = v.players.find(p => p.id === v.me);
  const foe = v.players.find(p => p.id !== v.me);
  const turnP = v.players.find(p => p.id === v.turn);
  const away = (v.away || []).map(id => (v.players.find(p => p.id === id) || {}).name).filter(Boolean);
  /* âm thanh nước mới + tự đưa góc nhìn về quân mới nếu nó ngoài khung hình */
  if (v.lastMove && v.lastMove.n !== lastSeq) {
    if (lastSeq !== -1) Snd.place();
    lastSeq = v.lastMove.n;
    if (view.init && !isVisible(v.lastMove.x, v.lastMove.y)) centerOn(v.lastMove.x, v.lastMove.y);
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
  const inner = $('#board-inner');
  if (!inner.dataset.gid || inner.dataset.gid !== v.gid || inner.dataset.seq !== String(v.seq)) {
    inner.dataset.gid = v.gid; inner.dataset.seq = String(v.seq);
    inner.innerHTML = boardHTML(v);
    if (!view.init) initView();
    applyView();
  }
  const log = $('#log');
  log.innerHTML = v.log.slice(-12).reverse().map(l => `<div>${esc(l.text)}</div>`).join('') || '<div>Chưa có nước đi nào.</div>';
  /* kết thúc: ghi thành tựu + hộp thoại (1 lần / ván)
     Số ván/thắng do stats.watch() tự ghi khi ván kết thúc (simplenet bọc onState,
     mọi chế độ local/online đều qua Host) — KHÔNG gọi record() tay ở đây, kẻo đếm trùng.
     Chỉ ghi recordEvent cho huy hiệu thắng nhanh. */
  if (v.phase === 'ended' && endShownGid !== v.gid && !v.spec) {
    endShownGid = v.gid;
    const won = v.winner === v.me;
    recordEvent('caro', 'end', { won, moves: v.moveCount });
    Snd.winJingle();
    const wName = (v.players.find(p => p.id === v.winner) || {}).name;
    const score = `X ${v.counts.X} – ${v.counts.O} O · ${v.moveCount} nước`;
    ui.openModal(`<h2>${v.draw ? '🤝 Hòa!' : won ? '🏆 Bạn thắng!' : '🏆 ' + esc(cleanName(wName)) + ' thắng!'}</h2>
      <p style="text-align:center">${v.draw ? 'Bàn đầy 900 ô mà không ai đủ 5 quân liên tiếp — hòa!' : won ? `Bạn xếp được 5 quân liên tiếp trước — thắng ${score}!` : esc(cleanName(wName)) + ' xếp được 5 quân liên tiếp trước — ' + score + '.'}</p>
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

/* ---------- giữ-kéo để trượt bàn, nhấn nhanh để đặt quân ---------- */
const vp = $('#board-viewport');
let drag = null;
vp.addEventListener('pointerdown', e => {
  if (!cur || cur.phase !== 'playing') return;
  drag = { x0: e.clientX, y0: e.clientY, tx: view.tx, ty: view.ty, panning: false, id: e.pointerId };
  try { vp.setPointerCapture(e.pointerId); } catch (err) {} /* pointer lạ (vd. event tổng hợp): vẫn kéo được, chỉ không capture */
  vp.classList.add('grabbing');
  e.preventDefault();
});
vp.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
  if (!drag.panning && Math.hypot(dx, dy) > TAP_PX) drag.panning = true;
  if (drag.panning) {
    view.tx = drag.tx + dx;
    view.ty = drag.ty + dy;
    applyView();
  }
});
function endPointer(e, cancelled) {
  if (!drag) return;
  const wasTap = !drag.panning && !cancelled;
  const pid = drag.id;
  drag = null;
  vp.classList.remove('grabbing');
  if (!wasTap || !cur || cur.phase !== 'playing') return;
  const cell = cellFromPoint(e.clientX, e.clientY);
  if (!cell) return;
  tryPlace(cell.x, cell.y);
}
vp.addEventListener('pointerup', e => { if (drag && e.pointerId === drag.id) endPointer(e, false); });
vp.addEventListener('pointercancel', e => { if (drag && e.pointerId === drag.id) endPointer(e, true); });
vp.addEventListener('wheel', e => {
  e.preventDefault();
  const r = vp.getBoundingClientRect();
  zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
}, { passive: false });
/* lăn chuột trong khung không được cuộn trang (touch-action:none đã chặn cảm ứng) */

function tryPlace(x, y) {
  const v = cur;
  if (!v || v.phase !== 'playing') return;
  if (!ui.net) { tip('Chưa vào ván.'); return; }
  if (!ui.controls(v.turn)) { tip(v.spec ? 'Bạn đang xem ván đấu 👀' : 'Chưa tới lượt bạn.'); return; }
  if (v.cells[idx(v, x, y)] !== 0) { tip('Ô này đã có quân rồi.'); return; }
  ui.actAs(v.turn, { type: 'move', x, y }); /* tiếng "cạch" kêu khi state mới về (render) */
}
$('#btn-zoom-in').onclick = () => zoomBy(1.25);
$('#btn-zoom-out').onclick = () => zoomBy(1 / 1.25);
$('#btn-zoom-fit').onclick = fitView;
$('#btn-zoom-last').onclick = () => { if (cur && cur.lastMove) centerOn(cur.lastMove.x, cur.lastMove.y); else if (cur) centerOn(15, 15); };

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
  game: 'caro', net: NET,
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
