// 🐍🪜 Rắn và Thang – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng
// shared/net/simplenet.js (cùng pattern Cờ Vây: chủ phòng giữ state, khách
// chỉ gửi action {type, value?}). Số xúc xắc do người tới lượt tung ra và
// gửi kèm trong action nên 2 bên luôn ra cùng 1 trạng thái. Quân cờ nhảy
// từng ô một rồi mới leo thang / trượt rắn (xem animateMove).
import { createGame, applyAction, viewFor, actors, cellXY, LADDERS, SNAKES, COLORS, GOAL } from './engine.js?v=1';
import { faceAngles, diceCubeHTML, nextSpinAngles } from './dice3d.js?v=1';
import { createDiceView } from '../../shared/js/dice3d-gl.js?v=4';
import { botAction, rollDice } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=50';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';
import { recordEvent } from '../../shared/ui/stats.js?v=81';

const SNAKE_COLORS = ['#e84393', '#6c5ce7', '#00b894', '#e17055', '#0984e3', '#fdcb6e', '#d63031', '#00cec9', '#a29bfe', '#fd79a8'];

const NET = makeNet({
  game: 'ranvathang', min: 2, max: 4, maxSeats: 10, allowLocal: true,
  minMsg: 'Rắn và Thang cần 2–4 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 700 + Math.random() * 700,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo'],
});

/* ---------- chế độ chơi + số người (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
let count = 2; /* 2 | 3 | 4 — chỉ dùng cho chế độ chung máy (pvp) */
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const countBtns = [...document.querySelectorAll('[data-count]')];
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#count-box').style.display = m === 'pvp' ? '' : 'none';
  syncNameFields();
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  try { localStorage.setItem('gumballz-ranvathang-mode', m); } catch (e) {}
}
function setCount(n) {
  count = [2, 3, 4].includes(n) ? n : 2;
  countBtns.forEach(b => { b.classList.toggle('on', Number(b.dataset.count) === count); b.setAttribute('aria-pressed', Number(b.dataset.count) === count); });
  syncNameFields();
  try { localStorage.setItem('gumballz-ranvathang-count', String(count)); } catch (e) {}
}
function syncNameFields() {
  const pvp = mode === 'pvp';
  $('#fld-name2').style.display = pvp && count >= 2 ? '' : 'none';
  $('#fld-name3').style.display = pvp && count >= 3 ? '' : 'none';
  $('#fld-name4').style.display = pvp && count >= 4 ? '' : 'none';
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
countBtns.forEach(b => b.addEventListener('click', () => setCount(Number(b.dataset.count))));
try {
  const sm = localStorage.getItem('gumballz-ranvathang-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
  const sc = Number(localStorage.getItem('gumballz-ranvathang-count'));
  setCount([2, 3, 4].includes(sc) ? sc : 2);
} catch (e) { setMode('ai-hard'); setCount(2); }

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const seated = info.players.slice(0, 4);
  const cap = mode === 'online' ? 2 : 4; /* online đúng 2 người, chung máy tối đa 4 */
  $('#pcount').textContent = `${seated.length}/${cap} người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (seated.length < cap
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  $('#opts').innerHTML = mode === 'online'
    ? `<p class="opt-note">🌐 Chơi online: đúng 2 người. Số xúc xắc do người tới lượt tung ra, gửi kèm trong nước đi nên 2 bên luôn thấy cùng 1 kết quả.</p>`
    : `<p class="opt-note">👥 Chơi trên máy này: 2–4 người. Thêm máy hoặc thêm người chơi cùng máy rồi bấm Bắt đầu chơi.</p>`;
  const okCount = seated.length >= 2 && (mode !== 'online' || seated.length === 2);
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = !okCount;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.isHost ? ui.net.raw : null;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
  else if (b.id === 'btn-addlocal') {
    const n = await promptBox('Thêm người chơi cùng máy (chuyền tay nhau tung xúc xắc).', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start({ online: mode === 'online' });
/* chế độ local: mở phòng offline trên máy này, thêm máy / người cùng máy theo chế độ đã chọn */
$('#btn-start').onclick = () => {
  ui.startHost(true);
};

/* ---------- bàn cờ: lưới 100 ô + SVG rắn/thang + quân cờ ---------- */
function cellCenter(n) { const { x, y } = cellXY(n); return { cx: (x + 0.5) * 100, cy: (y + 0.5) * 100 }; }
/* đường rắn uốn lượn từ đầu tới đuôi: lấy mẫu dọc đường thẳng rồi lệch
   sang 2 bên theo hình sin, nối bằng đường cong Catmull-Rom → Bezier. */
function snakePath(head, tail) {
  const a = cellCenter(head), b = cellCenter(tail);
  const dx = b.cx - a.cx, dy = b.cy - a.cy;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const N = 10, pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const wob = Math.sin(t * Math.PI * 2.2) * Math.min(26, len * 0.16);
    pts.push([a.cx + dx * t + nx * wob, a.cy + dy * t + ny * wob]);
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return { d, dir: [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]] };
}
function snakeSVG(head, tail, color) {
  const { d, dir } = snakePath(head, tail);
  const a = cellCenter(head);
  const dl = Math.hypot(dir[0], dir[1]) || 1;
  const ux = dir[0] / dl, uy = dir[1] / dl, nx = -uy, ny = ux;
  const hx = a.cx, hy = a.cy;
  const tx1 = hx + ux * 15 + nx * 5, ty1 = hy + uy * 15 + ny * 5;
  const tx2 = hx + ux * 15 - nx * 5, ty2 = hy + uy * 15 - ny * 5;
  const e1x = hx + ux * 5 + nx * 6.5, e1y = hy + uy * 5 + ny * 6.5;
  const e2x = hx + ux * 5 - nx * 6.5, e2y = hy + uy * 5 - ny * 6.5;
  return `<g>
    <path d="${d}" fill="none" stroke="#2a2340" stroke-width="20" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="13" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="4" stroke-linecap="round"/>
    <line x1="${hx.toFixed(1)}" y1="${hy.toFixed(1)}" x2="${tx1.toFixed(1)}" y2="${ty1.toFixed(1)}" stroke="#e0432f" stroke-width="3" stroke-linecap="round"/>
    <line x1="${hx.toFixed(1)}" y1="${hy.toFixed(1)}" x2="${tx2.toFixed(1)}" y2="${ty2.toFixed(1)}" stroke="#e0432f" stroke-width="3" stroke-linecap="round"/>
    <circle cx="${hx}" cy="${hy}" r="16" fill="${color}" stroke="#2a2340" stroke-width="3"/>
    <circle cx="${e1x.toFixed(1)}" cy="${e1y.toFixed(1)}" r="4.5" fill="#fff"/><circle cx="${e1x.toFixed(1)}" cy="${e1y.toFixed(1)}" r="2" fill="#2a2340"/>
    <circle cx="${e2x.toFixed(1)}" cy="${e2y.toFixed(1)}" r="4.5" fill="#fff"/><circle cx="${e2x.toFixed(1)}" cy="${e2y.toFixed(1)}" r="2" fill="#2a2340"/>
  </g>`;
}
function ladderSVG(bottom, top) {
  const a = cellCenter(bottom), b = cellCenter(top);
  const dx = b.cx - a.cx, dy = b.cy - a.cy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  const off = 11;
  const rail = (s, e, stroke, w) => `<line x1="${(a.cx + nx * off * s).toFixed(1)}" y1="${(a.cy + ny * off * s).toFixed(1)}" x2="${(b.cx + nx * off * e).toFixed(1)}" y2="${(b.cy + ny * off * e).toFixed(1)}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>`;
  let rungs = '';
  for (let d = 16; d < len - 12; d += 32) {
    const px = a.cx + ux * d, py = a.cy + uy * d;
    rungs += `<line x1="${(px + nx * off).toFixed(1)}" y1="${(py + ny * off).toFixed(1)}" x2="${(px - nx * off).toFixed(1)}" y2="${(py - ny * off).toFixed(1)}" stroke="#8a5a2b" stroke-width="6" stroke-linecap="round"/>`;
  }
  return `<g>${rail(1, 1, '#5d3a17', 11)}${rail(-1, -1, '#5d3a17', 11)}${rail(1, 1, '#e8bd7d', 6)}${rail(-1, -1, '#e8bd7d', 6)}${rungs}</g>`;
}
function boardSVG() {
  let out = '';
  for (const [b, t] of Object.entries(LADDERS)) out += ladderSVG(Number(b), Number(t));
  Object.entries(SNAKES).forEach(([h, t], i) => { out += snakeSVG(Number(h), Number(t), SNAKE_COLORS[i % SNAKE_COLORS.length]); });
  return out;
}
/* meeple 3D: thân có gradient bóng sáng trên-trái → tối dưới-phải + highlight
   bóng trên đầu, nhìn như khối nổi chứ không phải hình phẳng */
const MEEPLE = c => {
  const id = 'mg' + c.slice(1);
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0.7" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".5"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="#1c1430" stop-opacity=".35"/></linearGradient></defs><path d="M50 6 C59 6 66 13 66 22 C66 28 63 33 58 36 L68 50 L82 50 L82 62 L72 62 L72 92 L28 92 L28 62 L18 62 L18 50 L32 50 L42 36 C37 33 34 28 34 22 C34 13 41 6 50 6 Z" fill="url(#${id})" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><ellipse cx="50" cy="24" rx="11" ry="7" fill="#fff" opacity=".38"/></svg>`;
};
function buildBoard(v) {
  let html = '';
  for (let y = 0; y < 10; y++) { /* y = hàng tính từ trên xuống */
    const row = 9 - y;
    for (let x = 0; x < 10; x++) {
      const n = row % 2 === 0 ? row * 10 + x + 1 : row * 10 + (9 - x) + 1;
      const cls = ['rt-cell', 'c' + ((x + y) % 4)];
      let mark = '';
      if (n === GOAL) { cls.push('goal'); mark = '<span class="mark">🏁</span>'; }
      else if (LADDERS[n]) { cls.push('ladder-b'); mark = '<span class="mark">🪜</span>'; }
      else if (SNAKES[n]) { cls.push('snake-h'); mark = '<span class="mark">🐍</span>'; }
      html += `<div class="${cls.join(' ')}"><span class="num">${n}</span>${mark}</div>`;
    }
  }
  $('#board-grid').innerHTML = html;
  $('#board-svg').innerHTML = boardSVG();
  $('#board-tokens').innerHTML = v.players.map(p => `<div class="rt-token" data-pid="${p.id}">${MEEPLE(COLORS[p.color].css)}</div>`).join('');
}

/* ---------- quân cờ: vị trí hiển thị + nhảy từng ô ---------- */
let cur = null, endShownGid = null, lastSeq = -1;
const disp = {}; /* vị trí đang hiển thị của từng quân (khác vị trí thật trong lúc nhảy) */
const animTimers = {};
function tokenXY(pos, colorIdx) {
  const board = $('#board');
  const bw = board.clientWidth, bh = board.clientHeight;
  if (pos <= 0) return { x: 100 + colorIdx * 54, y: bh + 23 }; /* khay xuất phát dưới bàn */
  const { x, y } = cellXY(pos);
  const ox = (colorIdx - 1.5) * 7, oy = (colorIdx % 2 ? -1 : 1) * 5;
  return { x: (x + 0.5) * (bw / 10) + ox, y: (y + 0.5) * (bh / 10) + oy };
}
function layoutToken(pid, instant) {
  const el = document.querySelector(`.rt-token[data-pid="${pid}"]`);
  if (!el || !cur) return;
  const p = cur.players.find(q => q.id === pid);
  if (!p) return;
  const { x, y } = tokenXY(disp[pid] ?? cur.pos[pid] ?? 0, p.color);
  if (instant) el.classList.add('noanim');
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  if (instant) requestAnimationFrame(() => el.classList.remove('noanim'));
}
function layoutAllTokens(instant) { if (cur) for (const p of cur.players) layoutToken(p.id, instant); }
window.addEventListener('resize', () => layoutAllTokens(true));
/* nhảy từng ô từ from tới landed, rồi trượt dài tới to nếu leo thang / trượt rắn */
function animateMove(lm) {
  const pid = lm.by;
  clearTimeout(animTimers[pid]);
  const el = document.querySelector(`.rt-token[data-pid="${pid}"]`);
  if (!el || !cur) return;
  disp[pid] = lm.from;
  layoutToken(pid, true);
  let step = lm.from;
  const stepFn = () => {
    if (step < lm.landed) {
      step++;
      disp[pid] = step;
      layoutToken(pid);
      /* nhảy từng ô: vòng cung lên cao giữa bước rồi đáp xuống (class .hop) */
      el.classList.remove('hop');
      void el.offsetWidth; /* chạy lại animation nhảy mỗi bước */
      el.classList.add('hop');
      Snd.step();
      animTimers[pid] = setTimeout(stepFn, 150);
    } else if (lm.to !== lm.landed) {
      el.classList.add('jump');
      if (lm.ladder) Snd.climb();
      else if (lm.snake) Snd.slide();
      disp[pid] = lm.to;
      layoutToken(pid);
      setTimeout(() => el.classList.remove('jump'), 750);
    }
  };
  stepFn();
}

/* ---------- xúc xắc 3D: panel + overlay lăn giữa bàn ---------- */
/* dựng khối xúc xắc 3D cho xúc xắc panel và overlay giữa bàn */
$('#dice-cube').innerHTML = diceCubeHTML();
$('#dice3d-cube').innerHTML = diceCubeHTML();
/* xoay 1 khối tới mặt value: quay thêm đủ vòng rồi dừng đúng mặt, xong thì
   chuẩn hoá góc về mặt đó (để lần lăn sau không quay quá xa). spinId để lần
   xoay mới hơn huỷ việc chuẩn hoá của lần xoay cũ còn đang chờ. */
function spinCube(cubeEl, state, value, spins, duration) {
  const next = nextSpinAngles(state, value, spins);
  state.x = next.x; state.y = next.y;
  const my = ++state.spinId;
  cubeEl.style.transition = ''; /* gỡ 'none' của lần chuẩn hoá trước (nếu có) */
  cubeEl.style.transitionDuration = duration + 'ms';
  cubeEl.style.transform = `rotateX(${next.x}deg) rotateY(${next.y}deg)`;
  setTimeout(() => {
    if (my !== state.spinId) return;
    const [bx, by] = faceAngles(value);
    cubeEl.style.transition = 'none';
    cubeEl.style.transform = `rotateX(${bx}deg) rotateY(${by}deg)`;
    state.x = bx; state.y = by;
  }, duration + 80);
}
const panelState = { x: 0, y: 0, spinId: 0 };
let panelShown = 1; /* mặt đang ngửa ra trước ở xúc xắc panel (mặc định mặt 1) */
function setDiceFace(n, dur = 500) {
  if (n === panelShown) return; /* đã đúng mặt rồi thì khỏi xoay */
  panelShown = n;
  if (_glPanel) { _glPanel.view.rollTo([n], { duration: dur, spins: 1 }); return; }
  const cubeEl = $('#dice-cube');
  if (cubeEl) spinCube(cubeEl, panelState, n, 1, dur);
}
/* overlay xúc xắc lăn giữa bàn cờ khi có nước tung mới (người chơi, máy hay
   đối thủ online đều đi qua render() nên dùng chung 1 đường này).
   Lăn 900ms (xoay 2 vòng + trượt ngang), giữ mặt ~900ms rồi mờ dần + thu nhỏ. */
const ovState = { x: 0, y: 0, spinId: 0 };
let ovTimer = null;
let lastRollN = -1; /* số thứ tự nước tung cuối đã hiện overlay (tránh hiện lại) */
let firstRender = true; /* lần render đầu có state (tải lại giữa ván): chỉ đặt mặt, không lăn lại nước cũ */
function showDiceRoll(value) {
  const ov = $('#dice3d-ov'), scene = $('#dice3d-scene'), cube = $('#dice3d-cube');
  if (!ov || !scene || !cube) return;
  clearTimeout(ovTimer);
  ov.classList.remove('fade');
  ov.classList.add('show');
  scene.classList.remove('travel');
  void scene.offsetWidth; /* chạy lại animation lăn ngang */
  scene.classList.add('travel');
  if (_glOverlay) _glOverlay.view.rollTo([value], { duration: 900, spins: 2 });
  else spinCube(cube, ovState, value, 2, 900);
  ovTimer = setTimeout(() => {
    ov.classList.add('fade');
    ovTimer = setTimeout(() => { ov.classList.remove('show', 'fade'); scene.classList.remove('travel'); }, 500);
  }, 1800);
}

// ---------- xúc xắc 3D (model GLB) ----------
// Panel + overlay lăn giữa bàn dùng model thật; hỏng WebGL/GLB thì về khối CSS cũ.
let _glPanel = null, _glOverlay = null;
(async () => {
  const diceEl = $('#dice');
  if (!diceEl) return;
  const holder = document.createElement('div'); holder.className = 'gl-holder';
  diceEl.appendChild(holder);
  const view = await createDiceView(holder, { count: 1, diePx: 64, w: 72, h: 72, muted: () => !Snd.isSoundOn() });
  if (view) { _glPanel = { view }; diceEl.classList.add('gl-on'); view.show([panelShown]); }
})();
(async () => {
  const scene = $('#dice3d-scene');
  if (!scene) return;
  const holder = document.createElement('div'); holder.className = 'gl-holder';
  scene.appendChild(holder);
  const view = await createDiceView(holder, { count: 1, diePx: 110, w: 160, h: 160, muted: () => !Snd.isSoundOn(), spin: true });
  if (view) { _glOverlay = { view }; scene.classList.add('gl-on'); scene.style.width = scene.style.height = '160px'; }
})();

function render(v, prev) {
  cur = v;
  if (!v) { lastSeq = -1; endShownGid = null; for (const k of Object.keys(disp)) delete disp[k]; return; }
  const me = v.players.find(p => p.id === v.me);
  const turnP = v.players.find(p => p.id === v.turn);
  const away = (v.away || []).map(id => (v.players.find(p => p.id === id) || {}).name).filter(Boolean);
  const board = $('#board');
  if (!board.dataset.gid || board.dataset.gid !== v.gid) {
    board.dataset.gid = v.gid;
    buildBoard(v);
    for (const p of v.players) disp[p.id] = v.pos[p.id] ?? 0;
    layoutAllTokens(true);
  }
  /* nước mới: nhảy quân + nhạc thắng (lần render đầu = tải lại giữa ván thì chỉ đặt quân, không nhảy) */
  if (v.lastMove && v.lastMove.n !== lastSeq) {
    const isFirst = firstRender;
    lastSeq = v.lastMove.n;
    if (!isFirst) {
      if (v.phase === 'ended') Snd.winJingle();
      animateMove(v.lastMove);
      /* huy hiệu thang/rắn lớn: chỉ tính nước do mình tung */
      if (v.lastMove.by === v.me) {
        if (v.lastMove.ladder && v.lastMove.landed === 28) recordEvent('ranvathang', 'climb', { from: 28 });
        if (v.lastMove.snake && v.lastMove.landed === 87) recordEvent('ranvathang', 'slide', { from: 87 });
      }
    } else {
      for (const p of v.players) disp[p.id] = v.pos[p.id] ?? 0;
      layoutAllTokens(true);
    }
  } else if (v.lastMove) {
    /* state mới về nhưng không có nước mới (vd. xin thua): đặt quân đúng vị trí thật */
    for (const p of v.players) { if (disp[p.id] == null) disp[p.id] = v.pos[p.id] ?? 0; }
  }
  /* xúc xắc: hiện số vừa tung + lăn xúc xắc 3D giữa bàn (nước mới; lần render đầu chỉ đặt mặt) */
  if (v.lastRoll) {
    if (firstRender) lastRollN = v.lastRoll.n;
    else if (v.lastRoll.n !== lastRollN) { lastRollN = v.lastRoll.n; showDiceRoll(v.lastRoll.value); }
    setDiceFace(v.lastRoll.value);
    const roller = v.players.find(p => p.id === v.lastRoll.by);
    $('#roll-info').innerHTML = `<b>${esc(cleanName(roller ? roller.name : ''))}</b> tung được <b>${v.lastRoll.value}</b>${v.lastMove && v.lastMove.extra ? ' — 🎉 được tung tiếp!' : ''}<small>${v.lastMove && v.lastMove.ladder ? '🪜 Leo thang!' : v.lastMove && v.lastMove.snake ? '🐍 Trượt rắn!' : v.lastMove && v.lastMove.overshoot ? 'Tung quá ô 100 — đứng yên.' : 'Tung 6 được tung tiếp · về đúng ô 100 mới thắng'}</small>`;
  }
  const canRoll = v.phase === 'playing' && ui.controls(v.turn);
  $('#btn-roll').disabled = !canRoll || rolling;
  $('#round').innerHTML = v.phase === 'ended'
    ? (v.endReason === 'resign' ? `🏳️ ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name))} thắng — là người còn lại duy nhất!` : `🏁 ${v.winner === v.me ? 'Bạn thắng! 🎉' : esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name)) + ' thắng — về đúng ô 100!'}`)
    : `🎲 Lượt ${v.turnNo} · ${turnP ? (turnP.id === v.me ? 'tới lượt bạn — bấm Tung xúc xắc!' : 'đang chờ ' + esc(cleanName(turnP.name)) + ' tung xúc xắc…') : ''}${v.lastMove && v.lastMove.extra && v.turn === v.lastMove.by ? ' · 🎉 Được tung tiếp!' : ''}${away.length ? ` · ⚠️ ${esc(away.join(', '))} mất kết nối — máy sẽ tung thay` : ''}`;
  $('#seats').innerHTML = v.players.map(p => {
    const pos = v.pos[p.id] ?? 0;
    const out = v.out.includes(p.id);
    const c = COLORS[p.color];
    return `<div class="seat${p.id === v.turn && v.phase === 'playing' ? ' on' : ''}${out ? ' out' : ''}">${avatar(p.name, 40)}<b>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}</b>
      <span class="color-dot" style="background:${c.css}" title="Quân ${c.name}">${c.emoji}</span>
      <small>${out ? 'đã rời ván' : pos === 0 ? 'Xuất phát' : 'Ô ' + pos}${p.isBot ? ' · máy ' + (p.level === 'easy' ? 'Dễ' : 'Khó') : p.local ? ' · cùng máy' : ''}</small></div>`;
  }).join('');
  const log = $('#log');
  log.innerHTML = v.log.slice(-12).reverse().map(l => `<div>${esc(l.text)}</div>`).join('') || '<div>Chưa có nước đi nào.</div>';
  /* kết thúc: hộp thoại (1 lần / ván)
     Số ván/thắng do stats.watch() tự ghi khi ván kết thúc (simplenet bọc onState)
     — KHÔNG gọi record() tay ở đây, kẻo đếm trùng. */
  if (v.phase === 'ended' && endShownGid !== v.gid && !v.spec) {
    endShownGid = v.gid;
    const won = v.winner === v.me;
    Snd.winJingle();
    const wName = (v.players.find(p => p.id === v.winner) || {}).name;
    const order = [...v.players].sort((a, b) => (v.pos[b.id] ?? 0) - (v.pos[a.id] ?? 0));
    const lines = order.map(p => `<div>${COLORS[p.color].emoji} ${esc(cleanName(p.name))}: <b>${v.pos[p.id] === 100 ? '🏁 ô 100' : v.pos[p.id] === 0 ? 'ô xuất phát' : 'ô ' + v.pos[p.id]}</b>${v.out.includes(p.id) ? ' (đã rời ván)' : ''}</div>`).join('');
    ui.openModal(`<h2>${won ? '🏆 Bạn thắng!' : '🏆 ' + esc(cleanName(wName)) + ' thắng!'}</h2>
      <div class="score-lines">${lines}</div><p style="text-align:center">${v.endReason === 'resign' ? esc(cleanName(wName)) + ' là người còn lại duy nhất.' : 'Về đúng ô 100 trước — thắng!'}</p>
      <div class="btn-col">${ui.isHost
        ? '<button class="btn big pri" id="m-again">🔁 Chơi ván mới</button><button class="btn" id="m-lobby">Về phòng chờ</button>'
        : '<button class="btn" id="m-close">Đóng — chờ chủ phòng mở ván mới</button>'}
      <button class="btn" id="m-home">🏠 Về trang chủ</button></div>`);
    const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); ui.net.raw.start({ online: mode === 'online' }); };
    const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); ui.net.raw.restart(); };
    const close = $('#m-close'); if (close) close.onclick = ui.closeModal;
    $('#m-home').onclick = () => { ui.closeModal(); ui.leave(); setTimeout(() => { location.href = '../'; }, 250); };
  }
  firstRender = false;
}

/* ---------- tung xúc xắc ---------- */
let rolling = false;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function rollDiceClick() {
  const v = cur;
  if (rolling || !v || v.phase !== 'playing') return;
  if (!ui.net) { tip('Chưa vào ván.'); return; }
  if (!ui.controls(v.turn)) { tip(v.spec ? 'Bạn đang xem ván đấu 👀' : 'Chưa tới lượt bạn.'); return; }
  rolling = true;
  $('#btn-roll').disabled = true;
  const value = rollDice(); /* số cuối cùng: hiện đúng số này khi hết lắc */
  /* tiếng lắc xúc xắc: khung 3D kêu trong rollTo() lúc lăn giữa bàn (một lần cho mọi lượt, kể cả lượt đối thủ/máy) */
  const iv = setInterval(() => setDiceFace(1 + Math.floor(Math.random() * 6), 140), 90);
  await sleep(650);
  clearInterval(iv);
  setDiceFace(value);
  rolling = false;
  /* kiểm tra lại lượt trước khi gửi (phòng khi ván đã đổi trong lúc lắc) */
  if (!cur || cur.phase !== 'playing' || cur.turn !== v.turn) { tip('Hết lượt tung rồi.'); return; }
  if (!ui.controls(cur.turn)) return;
  ui.actAs(cur.turn, { type: 'roll', value });
}
$('#btn-roll').onclick = rollDiceClick;

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
  ui.net.raw.start({ online: mode === 'online' });
};
$('#btn-resign').onclick = async () => {
  const v = cur;
  if (!v || v.phase === 'ended') return;
  const r = await confirmBox('Nhận thua ván này? Bạn sẽ rời ván, người còn lại tiếp tục chơi.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  /* online / đấu máy: xin thua cho chính mình; chơi chung máy: xin thua cho người đang tới lượt */
  if (mode === 'pvp') ui.actAs(v.turn, { type: 'resign' });
  else ui.act({ type: 'resign' });
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'ranvathang', net: NET,
  offline: h => {
    /* phòng offline trên máy này: thêm máy / người cùng máy theo chế độ đã chọn */
    if (mode === 'ai-easy' || mode === 'ai-hard') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
    else if (mode === 'pvp') {
      for (let i = 2; i <= count; i++) {
        const nm = ($('#name' + i).value.trim() || 'Người chơi ' + i).slice(0, 16);
        if (!h.addLocal(nm)) h.addBot({ level: 'hard' });
      }
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
