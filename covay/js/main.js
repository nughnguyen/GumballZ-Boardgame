// ⚫⚪ Cờ Vây – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng
// shared/net/simplenet.js (cùng pattern Cờ Caro: chủ phòng giữ state, khách
// chỉ gửi action {type, x?, y?}). Bàn 9×9 / 13×13 / 19×19 xem bằng khung
// trượt: giữ + kéo để di chuyển góc nhìn, nhấn nhanh để đặt quân
// (kéo > 8px thì chỉ trượt, không đặt).
import { createGame, applyAction, viewFor, actors, idx, colLabel, coordName, hoshiPoints, DEFAULT_OPTS, optOk, SIZES } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=50';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';
import { recordEvent } from '../../shared/ui/stats.js?v=76';

const CELL = 34; /* px 1 giao điểm ở zoom 1× (kể cả ô nhãn trục) */
const TAP_PX = 8; /* kéo xa hơn chừng này thì chỉ trượt bàn, không đặt quân */

const NET = makeNet({
  game: 'covay', min: 2, max: 2, maxSeats: 10, allowLocal: true,
  minMsg: 'Cờ Vây cần 2 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 600 + Math.random() * 600,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo'],
  defaults: DEFAULT_OPTS, optOk,
});

/* ---------- chế độ chơi + kích thước bàn (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
let size = 19; /* 9 | 13 | 19 */
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const sizeBtns = [...document.querySelectorAll('[data-size]')];
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#fld-name2').style.display = m === 'pvp' ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  try { localStorage.setItem('gumballz-covay-mode', m); } catch (e) {}
}
function setSize(v) {
  size = SIZES.includes(v) ? v : 19;
  sizeBtns.forEach(b => { b.classList.toggle('on', Number(b.dataset.size) === size); b.setAttribute('aria-pressed', Number(b.dataset.size) === size); });
  try { localStorage.setItem('gumballz-covay-size', String(size)); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
sizeBtns.forEach(b => b.addEventListener('click', () => setSize(Number(b.dataset.size))));
try {
  const sm = localStorage.getItem('gumballz-covay-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
  const ss = Number(localStorage.getItem('gumballz-covay-size'));
  setSize(SIZES.includes(ss) ? ss : 19);
} catch (e) { setMode('ai-hard'); setSize(19); }

/* ---------- phòng chờ ---------- */
let optsLoaded = false; /* đã nạp kích thước bàn đã lưu vào phòng chờ lần này chưa */
function renderLobby(info, ui) {
  const seated = info.players.slice(0, 2);
  const host = ui.isHost && ui.net ? ui.net.raw : null, o = info.opts, dis = ui.isHost ? '' : 'disabled';
  if (host && !optsLoaded) {
    /* nhớ kích thước bàn lần trước của chủ phòng */
    optsLoaded = true;
    const saved = Number(ls.get('gumballz-covay-size'));
    if (SIZES.includes(saved) && host.opts.size !== saved) { host.opts.size = saved; host.pushLobby(); return; }
  }
  $('#pcount').textContent = `${seated.length}/2 người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (seated.length < 2
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  const seg = (key, items) => `<div class="seg">${items.map(([v, nm]) => `<button type="button" data-opt="${key}" data-v="${v}" aria-pressed="${String(o[key]) === String(v)}" ${dis}>${nm}</button>`).join('')}</div>`;
  $('#opts').innerHTML = `<div class="opt"><b>♟️ Kích thước bàn</b>${seg('size', [[9, '9×9 · nhanh'], [13, '13×13 · vừa'], [19, '19×19 · chuẩn']])}<small>Bàn 9×9 hợp người mới, ván nhanh; bàn 19×19 là bàn chuẩn thi đấu, ván dài và sâu nhất.</small></div>`;
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
  } else if (b.dataset.opt) {
    const v = Number(b.dataset.v);
    h.setOpt(b.dataset.opt, v);
    try { ls.set('gumballz-covay-size', String(v)); } catch (e) {}
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
const view = { tx: 0, ty: 0, z: 1, init: false, size: 0 };
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
function initView(size) {
  const { w, h } = viewportSize();
  /* bàn vừa màn hình nếu đủ chỗ (9×9), bàn lớn thì hiện ~11 giao điểm ngang */
  view.z = clamp(Math.min(w, h) / ((size + 1) * CELL), 0.4, 1);
  centerOn((size - 1) / 2, (size - 1) / 2);
  view.init = true; view.size = size;
}
function zoomBy(f, cx, cy) {
  const { w, h } = viewportSize();
  const px = cx == null ? w / 2 : cx, py = cy == null ? h / 2 : cy;
  const z2 = clamp(view.z * f, 0.35, 2.5);
  const k = z2 / view.z;
  view.tx = px - (px - view.tx) * k;
  view.ty = py - (py - view.ty) * k;
  view.z = z2;
  applyView();
}
function fitView() {
  if (!cur) return;
  const { w, h } = viewportSize();
  view.z = clamp(Math.min(w, h) / ((cur.size + 1) * CELL), 0.3, 1.2);
  centerOn((cur.size - 1) / 2, (cur.size - 1) / 2);
}
function cellFromPoint(clientX, clientY) {
  if (!cur) return null;
  const vp = $('#board-viewport');
  const r = vp.getBoundingClientRect();
  const bx = (clientX - r.left - view.tx) / view.z;
  const by = (clientY - r.top - view.ty) / view.z;
  const x = Math.floor(bx / CELL) - 1, y = Math.floor(by / CELL) - 1; /* trừ 1 cột/hàng nhãn trục */
  if (x < 0 || y < 0 || x >= cur.size || y >= cur.size) return null;
  return { x, y };
}
function isVisible(x, y) {
  const { w, h } = viewportSize();
  const sx = view.tx + (x + 1.5) * CELL * view.z, sy = view.ty + (y + 1.5) * CELL * view.z;
  return sx >= 0 && sx <= w && sy >= 0 && sy <= h;
}

function boardHTML(v) {
  const size = v.size;
  const deadSet = new Set(v.dead || []);
  const hoshi = new Set(hoshiPoints(size).map(([x, y]) => y * size + x));
  const lm = v.lastMove;
  const canPlay = v.phase === 'playing' && ui.controls(v.turn);
  const turnMark = (v.players.find(p => p.id === v.turn) || {}).mark || 'B';
  let html = '';
  for (let r = -1; r < size; r++) {
    for (let c = -1; c < size; c++) {
      if (r === -1 && c === -1) { html += '<span class="cv-cell axis corner"></span>'; continue; }
      if (r === -1) { html += `<span class="cv-cell axis">${colLabel(c)}</span>`; continue; }
      if (c === -1) { html += `<span class="cv-cell axis">${r + 1}</span>`; continue; }
      const n = idx(v, c, r), m = v.cells[n];
      const cls = ['cv-cell'];
      if (m === 0) cls.push('empty');
      if (hoshi.has(n)) cls.push('hoshi');
      const stone = m === 1 ? `<span class="stone b${lm && !lm.pass && lm.x === c && lm.y === r ? ' last' : ''}${deadSet.has(n) ? ' dead' : ''}"></span>`
        : m === 2 ? `<span class="stone w${lm && !lm.pass && lm.x === c && lm.y === r ? ' last' : ''}${deadSet.has(n) ? ' dead' : ''}"></span>` : '';
      const deadX = deadSet.has(n) ? '<span class="dead-x">✕</span>' : '';
      const dot = hoshi.has(n) && m === 0 ? '<span class="dot"></span>' : '';
      const ghost = m === 0 ? '<span class="ghost"></span>' : '';
      html += `<button type="button" class="${cls.join(' ')}" data-x="${c}" data-y="${r}" aria-label="Giao điểm ${coordName(c, r)}${m === 1 ? ', quân Đen' : m === 2 ? ', quân Trắng' : ''}${deadSet.has(n) ? ', đang đánh dấu chết' : ''}">${dot}${stone}${deadX}${ghost}</button>`;
    }
  }
  const inner = $('#board-inner');
  inner.style.gridTemplateColumns = `repeat(${size + 1}, ${CELL}px)`;
  inner.classList.toggle('can-play', canPlay);
  inner.classList.toggle('tm-b', turnMark === 'B');
  inner.classList.toggle('tm-w', turnMark === 'W');
  return html;
}

function scoreTableHTML(scores) {
  if (!scores) return '';
  const rows = scores.map(sc => `<tr class="${sc.id === (cur && cur.winner) ? 'win' : ''}"><td>${sc.mark === 'B' ? '⚫ Đen' : '⚪ Trắng'} · ${esc(cleanName(sc.name))}</td><td>${sc.stones}</td><td>${sc.territory}</td><td>${sc.prisoners}</td><td>${sc.komi ? sc.komi : '—'}</td><td><b>${sc.total}</b></td></tr>`).join('');
  return `<h3>🧮 Tính điểm kiểu Trung Quốc</h3><table><tr><th>Người chơi</th><th>Đá</th><th>Đất</th><th>Tù binh</th><th>Komi</th><th>Tổng</th></tr>${rows}<tr class="total"><td colspan="5">Tù binh chỉ để xem, không cộng vào điểm.</td><td></td></tr></table>`;
}

function render(v, prev) {
  cur = v;
  if (!v) { lastSeq = -1; endShownGid = null; view.init = false; view.size = 0; return; }
  const me = v.players.find(p => p.id === v.me);
  const turnP = v.players.find(p => p.id === v.turn);
  const away = (v.away || []).map(id => (v.players.find(p => p.id === id) || {}).name).filter(Boolean);
  /* âm thanh nước mới + tự đưa góc nhìn về quân mới nếu nó ngoài khung hình */
  if (v.lastMove && v.lastMove.n !== lastSeq) {
    if (lastSeq !== -1) {
      if (v.lastMove.pass) Snd.pass();
      else if (v.lastMove.captured > 0) Snd.capture();
      else Snd.place();
    }
    lastSeq = v.lastMove.n;
    if (view.init && !v.lastMove.pass && !isVisible(v.lastMove.x, v.lastMove.y)) centerOn(v.lastMove.x, v.lastMove.y);
  }
  const cnt = { B: 0, W: 0 };
  for (const c of v.cells) { if (c === 1) cnt.B++; else if (c === 2) cnt.W++; }
  $('#round').innerHTML = v.phase === 'ended'
    ? (v.endReason === 'resign' ? `🏳️ ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name))} thắng — đối thủ xin thua!` : `🏁 ${v.winner === v.me ? 'Bạn thắng! 🎉' : esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name)) + ' thắng!'}`)
    : v.phase === 'scoring'
      ? `🧮 Tính điểm — bấm vào 1 nhóm quân để đánh dấu chết/sống, rồi bấm Chốt điểm${away.length ? ` · ⚠️ ${esc(away.join(', '))} mất kết nối — máy sẽ đi thay` : ''}`
      : `⚔️ Lượt ${v.turnNo} · ${turnP ? (turnP.id === v.me ? 'tới lượt bạn!' : 'đang chờ ' + esc(cleanName(turnP.name)) + '…') : ''}${v.passes === 1 ? ' · 1 bên đã bỏ lượt' : ''}${away.length ? ` · ⚠️ ${esc(away.join(', '))} mất kết nối — máy sẽ đi thay` : ''}`;
  $('#seats').innerHTML = v.players.map(p => {
    const stones = p.mark === 'B' ? cnt.B : cnt.W;
    const pris = (v.prisoners[p.id] || 0);
    return `<div class="seat${p.id === v.turn && v.phase === 'playing' ? ' on' : ''}">${avatar(p.name, 40)}<b>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}</b>
      <span class="mark-badge ${p.mark === 'B' ? 'mb' : 'mw'}">${p.mark === 'B' ? '⚫' : '⚪'}</span>
      <small>${stones} đá · ăn ${pris} tù binh${p.isBot ? ' · máy ' + (p.level === 'easy' ? 'Dễ' : 'Khó') : p.local ? ' · cùng máy' : ''}</small></div>`;
  }).join('');
  const inner = $('#board-inner');
  if (!inner.dataset.gid || inner.dataset.gid !== v.gid || inner.dataset.seq !== String(v.seq) || view.size !== v.size) {
    inner.dataset.gid = v.gid; inner.dataset.seq = String(v.seq);
    inner.innerHTML = boardHTML(v);
    if (!view.init || view.size !== v.size) initView(v.size);
    applyView();
  }
  /* nút trong ván / tính điểm */
  $('#game-actions').style.display = v.phase === 'playing' ? '' : 'none';
  $('#score-actions').style.display = v.phase === 'scoring' ? '' : 'none';
  const sp = $('#score-panel');
  if (v.phase === 'scoring' && v.scorePreview) { sp.style.display = ''; sp.innerHTML = scoreTableHTML(v.scorePreview) + '<p style="text-align:center;margin:8px 0 0;font-weight:700;color:#6b6480">Điểm xem trước — bấm vào nhóm quân để đổi chết/sống, số sẽ cập nhật theo.</p>'; }
  else if (v.phase === 'ended' && v.scores) { sp.style.display = ''; sp.innerHTML = scoreTableHTML(v.scores); }
  else { sp.style.display = 'none'; sp.innerHTML = ''; }
  const log = $('#log');
  log.innerHTML = v.log.slice(-12).reverse().map(l => `<div>${esc(l.text)}</div>`).join('') || '<div>Chưa có nước đi nào.</div>';
  /* kết thúc: hộp thoại (1 lần / ván)
     Số ván/thắng do stats.watch() tự ghi khi ván kết thúc (simplenet bọc onState)
     — KHÔNG gọi record() tay ở đây, kẻo đếm trùng.
     Chỉ ghi recordEvent cho huy hiệu thắng bàn 19×19 / thắng cách biệt. */
  if (v.phase === 'ended' && endShownGid !== v.gid && !v.spec) {
    endShownGid = v.gid;
    const won = v.winner === v.me;
    const sc = v.scores || [];
    const margin = sc.length >= 2 ? Math.abs((sc[0].total || 0) - (sc[1].total || 0)) : 0;
    recordEvent('covay', 'end', { won, size: v.size, margin });
    Snd.winJingle();
    const wName = (v.players.find(p => p.id === v.winner) || {}).name;
    let body = '';
    if (v.endReason === 'resign') {
      body = `<p style="text-align:center">${won ? 'Đối thủ xin thua — bạn thắng!' : esc(cleanName(wName)) + ' thắng vì bạn xin thua.'}</p>`;
    } else if (v.scores) {
      const lines = v.scores.map(sc => `<div>${sc.mark === 'B' ? '⚫ Đen' : '⚪ Trắng'} · ${esc(cleanName(sc.name))}: <b>${sc.total}</b> điểm <small>(đá ${sc.stones} + đất ${sc.territory}${sc.komi ? ' + komi ' + sc.komi : ''})</small></div>`).join('');
      body = `<div class="score-lines">${lines}</div><p style="text-align:center">${won ? 'Bạn thắng nhờ nhiều điểm hơn!' : esc(cleanName(wName)) + ' nhiều điểm hơn — thắng!'}</p>`;
    }
    ui.openModal(`<h2>${won ? '🏆 Bạn thắng!' : '🏆 ' + esc(cleanName(wName)) + ' thắng!'}</h2>${body}
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
  if (!cur || (cur.phase !== 'playing' && cur.phase !== 'scoring')) return;
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
  if (!wasTap || !cur) return;
  const cell = cellFromPoint(e.clientX, e.clientY);
  if (!cell) return;
  if (cur.phase === 'playing') tryPlace(cell.x, cell.y);
  else if (cur.phase === 'scoring') tryToggleDead(cell.x, cell.y);
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
  if (v.cells[idx(v, x, y)] !== 0) { tip('Giao điểm này đã có quân rồi.'); return; }
  ui.actAs(v.turn, { type: 'move', x, y }); /* tiếng "cốc" kêu khi state mới về (render) */
}
function tryToggleDead(x, y) {
  const v = cur;
  if (!v || v.phase !== 'scoring') return;
  if (!ui.net) { tip('Chưa vào ván.'); return; }
  if (v.cells[idx(v, x, y)] === 0) { tip('Chỗ này không có quân.'); return; }
  ui.act({ type: 'toggleDead', x, y });
}
$('#btn-zoom-in').onclick = () => zoomBy(1.25);
$('#btn-zoom-out').onclick = () => zoomBy(1 / 1.25);
$('#btn-zoom-fit').onclick = fitView;
$('#btn-zoom-last').onclick = () => { if (cur && cur.lastMove && !cur.lastMove.pass) centerOn(cur.lastMove.x, cur.lastMove.y); else if (cur) centerOn((cur.size - 1) / 2, (cur.size - 1) / 2); };

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
$('#btn-pass').onclick = () => {
  const v = cur;
  if (!v || v.phase !== 'playing') return;
  if (!ui.controls(v.turn)) { tip(v.spec ? 'Bạn đang xem ván đấu 👀' : 'Chưa tới lượt bạn.'); return; }
  ui.actAs(v.turn, { type: 'pass' });
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
$('#btn-finish').onclick = () => { if (cur && cur.phase === 'scoring') ui.act({ type: 'finish' }); };
$('#btn-resume').onclick = () => { if (cur && cur.phase === 'scoring') ui.act({ type: 'resume' }); };
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'covay', net: NET,
  offline: h => {
    /* phòng offline trên máy này: chọn kích thước bàn đã lưu rồi thêm máy / người cùng máy theo chế độ đã chọn */
    h.setOpt('size', size);
    if (mode === 'ai-easy' || mode === 'ai-hard') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
    else if (mode === 'pvp') {
      const n2 = ($('#name2').value.trim() || 'Người chơi 2').slice(0, 16);
      if (!h.addLocal(n2)) h.addBot({ level: 'hard' });
    }
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => { if (!v && !ui.net) optsLoaded = false; render(v, prev); },
});

/* 🏠 nút home phải về đúng trang chủ web (gameKit chỉ về màn hình đầu của game) */
$('#btn-leave').onclick = async () => {
  const r = await confirmBox(ui.isHost ? 'Bạn là chủ phòng: rời đi là cả phòng giải tán.' : 'Bạn có thể vào lại bằng mã phòng.', { title: 'Rời ván?', ok: 'Rời ván', cancel: 'Ở lại', danger: true });
  if (r) { ui.leave(); setTimeout(() => { location.href = '../'; }, 250); }
};
