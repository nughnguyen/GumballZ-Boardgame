// 🧱 Quoridor – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Rummikub:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Cách chơi trên giao diện: bấm vào quân của mình rồi bấm 1 ô vàng
// để đi; bấm 🧱 Tường ngang/dọc rồi bấm vào 1 khe giữa 4 ô để đặt
// tường. Bàn là lưới 17×17: ô cờ ở vị trí chẵn, khe tường ở vị trí lẻ.
import { createGame, applyAction, viewFor, actors, legalMoves, validateWall, distToGoal, SIZE } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=9';

const NET = makeNet({
  game: 'quoridor', min: 2, max: 4, maxSeats: 4, allowLocal: true,
  minMsg: 'Quoridor cần 2–4 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: () => false,
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 700 + Math.random() * 900,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu', 'Bánh', 'Cốm'],
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
let playerCount = 2; /* đấu máy: tổng số người (bạn + máy) */
try {
  const c = +localStorage.getItem('gumballz-quoridor-count');
  if (c >= 2 && c <= 4) playerCount = c;
} catch (e) {}
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const countBtns = [...document.querySelectorAll('#count-seg [data-count]')];
function drawCount() {
  countBtns.forEach(b => { b.classList.toggle('on', +b.dataset.count === playerCount); b.setAttribute('aria-pressed', +b.dataset.count === playerCount); });
}
countBtns.forEach(b => b.addEventListener('click', () => {
  playerCount = +b.dataset.count; drawCount();
  try { localStorage.setItem('gumballz-quoridor-count', String(playerCount)); } catch (e) {}
}));
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#count-box').style.display = (m === 'ai-easy' || m === 'ai-hard') ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'pvp' ? '👥 Mở phòng chuyền tay' : m === 'ai-easy' ? `🤖 Bắt đầu chơi với máy Dễ (${playerCount} người)` : `🧠 Bắt đầu chơi với máy Khó (${playerCount} người)`;
  try { localStorage.setItem('gumballz-quoridor-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
drawCount();
try {
  const sm = localStorage.getItem('gumballz-quoridor-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }
// đổi số người thì cập nhật chữ nút Bắt đầu
countBtns.forEach(b => b.addEventListener('click', () => setMode(mode)));

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  $('#pcount').textContent = `${n}/4 người (cần 2–4)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${i === 0 ? '<span class="seat-role">👑 Đi trước</span>' : ''}${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (n < 4
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  $('#opts').innerHTML = `<div class="opt"><b>🧱 Bàn cờ</b><div class="role-note">Bàn 9×9 ô, mỗi người 1 quân + tường (2 người: 10 tường, 3–4 người: 5 tường). Ai tới hàng đích đối diện trước thì thắng.</div></div>`;
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
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
let sel = null; /* [r, c] ô quân đang chọn, hoặc null */
let wallMode = null; /* null | 'h' | 'v' — đang chọn đặt tường ngang/dọc */
const GOAL_TXT = ['hàng trên', 'hàng dưới', 'cột phải', 'cột trái'];
const PCOLOR = ['p0', 'p1', 'p2', 'p3'];

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
function myDests(v, pid) {
  if (!pid) return [];
  return legalMoves(v, pid).map(m => m.to[0] + ',' + m.to[1]);
}
function drawModeButtons() {
  $('#btn-mode-move').classList.toggle('on', wallMode === null);
  $('#btn-mode-wall-h').classList.toggle('on', wallMode === 'h');
  $('#btn-mode-wall-v').classList.toggle('on', wallMode === 'v');
}

function boardHtml(v) {
  const hSet = new Set(v.hWalls), vSet = new Set(v.vWalls);
  const me = controlPid(v);
  const dests = new Set(me ? myDests(v, me) : []);
  const pawnAt = new Map();
  v.players.forEach((p, i) => pawnAt.set(p.pos[0] + ',' + p.pos[1], i));
  const goalCls = (r, c) => {
    const cls = [];
    v.players.forEach((p, i) => {
      if (p.goal.type === 'row' && r === p.goal.v) cls.push('goal-' + i);
      if (p.goal.type === 'col' && c === p.goal.v) cls.push('goal-' + i);
    });
    return cls.join(' ');
  };
  let html = '';
  for (let gi = 0; gi < 17; gi++) {
    for (let gj = 0; gj < 17; gj++) {
      if (gi % 2 === 0 && gj % 2 === 0) {
        const r = gi / 2, c = gj / 2, k = r + ',' + c;
        const pi = pawnAt.get(k);
        const isDest = dests.has(k);
        const isSel = sel && sel[0] === r && sel[1] === c;
        html += `<div class="qd-cell ${goalCls(r, c)}${isDest ? ' dest' : ''}${isSel ? ' sel' : ''}" data-cell="${k}">${pi !== undefined ? `<span class="qd-pawn ${PCOLOR[pi]}${v.players[pi].id === me ? ' mine' : ''}"></span>` : ''}</div>`;
      } else if (gi % 2 === 1 && gj % 2 === 0) {
        const r = (gi - 1) / 2, c = gj / 2;
        const filled = hSet.has(r + ',' + c) || hSet.has(r + ',' + (c - 1));
        html += `<div class="qd-hgap${filled ? ' wall' : ''}" data-hgap="${r},${c}"></div>`;
      } else if (gi % 2 === 0 && gj % 2 === 1) {
        const r = gi / 2, c = (gj - 1) / 2;
        const filled = vSet.has(r + ',' + c) || vSet.has((r - 1) + ',' + c);
        html += `<div class="qd-vgap${filled ? ' wall' : ''}" data-vgap="${r},${c}"></div>`;
      } else {
        const r = (gi - 1) / 2, c = (gj - 1) / 2;
        const wh = hSet.has(r + ',' + c), wv = vSet.has(r + ',' + c);
        const anchor = me && wallMode ? ' anchor' : '';
        html += `<div class="qd-x${wh ? ' wall-h' : ''}${wv ? ' wall-v' : ''}${anchor}" data-wall="${r},${c}"></div>`;
      }
    }
  }
  return html;
}

function render(v, prev) {
  cur = v;
  if (!v) { sel = null; wallMode = null; endShownFor = ''; return; }
  const me = v.players.find(p => p.id === v.me) || {};
  const turnP = v.players.find(p => p.id === v.turn);
  const pid = controlPid(v);
  if (!pid) { sel = null; wallMode = null; }

  $('#round').textContent = v.phase === 'ended'
    ? `🏁 Trận đã kết thúc — ${v.winner ? cleanName((v.players.find(p => p.id === v.winner) || {}).name) + ' thắng trận!' : 'không có người thắng.'}`
    : `🧱 Vòng ${v.round} · Lượt của ${turnP ? cleanName(turnP.name) : '…'}${turnP && turnP.isBot ? ' 🤖' : ''}`;
  $('#status').innerHTML = v.players.map((p, i) => {
    return `<span class="stat ${p.id === v.me ? 'me' : ''}">${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}: <b>🧱 ${p.wallsLeft} tường</b> · cách đích <b>${p.dist}</b> bước · đích ${GOAL_TXT[i]}</span>`;
  }).join('');

  $('#board').innerHTML = boardHtml(v);

  $('#players').innerHTML = v.players.map((p, i) => {
    const sum = v.final ? v.final.summary[p.id] : null;
    return `<div class="qd-player ${p.id === v.turn && v.phase === 'playing' ? 'turn' : ''} ${p.id === v.me ? 'me' : ''}">
      <span class="qd-dot ${PCOLOR[i]}"></span>
      <div class="qd-pinfo">
        <b>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === v.me ? ' (bạn)' : ''}${p.id === v.winner ? ' 👑' : ''}</b>
        <span class="qd-ptotal">🧱 ${p.wallsLeft} tường còn lại${v.phase === 'ended' ? ` · điểm ${p.score}` : ''}</span>
        <span class="qd-pmeta">Cách đích ${sum ? sum.dist : p.dist} bước · đích ${GOAL_TXT[i]} · đã đi ${sum ? sum.turns : p.turns} lượt</span>
      </div>
    </div>`;
  }).join('');

  /* ----- dòng hướng dẫn lượt ----- */
  if (v.phase !== 'playing') {
    $('#stage-info').innerHTML = '';
  } else if (!pid) {
    $('#stage-info').innerHTML = 'Đang chờ đối thủ đi…';
  } else if (wallMode === 'h') {
    $('#stage-info').innerHTML = 'Đang đặt <b>tường ngang</b> — bấm vào 1 khe giữa 4 ô (ô tím khi rê chuột). Bấm 🚶 Đi quân để quay lại đi quân.';
  } else if (wallMode === 'v') {
    $('#stage-info').innerHTML = 'Đang đặt <b>tường dọc</b> — bấm vào 1 khe giữa 4 ô (ô tím khi rê chuột). Bấm 🚶 Đi quân để quay lại đi quân.';
  } else {
    $('#stage-info').innerHTML = 'Bấm vào <b>quân của bạn</b> rồi bấm 1 ô vàng để đi; hoặc bấm 🧱 Tường ngang/dọc để đặt tường.';
  }
  drawModeButtons();

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
    return `<tr><td>${esc(cleanName(s.name))}${s.id === v.winner ? ' 👑' : ''}${s.id === v.me ? ' (bạn)' : ''}</td><td>🧱 ${sum ? sum.wallsLeft : p.wallsLeft} tường</td><td>cách đích ${sum ? sum.dist : p.dist} bước</td><td>${s.score >= 0 ? '+' : ''}${s.score} điểm</td></tr>`;
  }).join('');
  const body = `<table style="width:100%;border-collapse:collapse;font-size:14px;text-align:center"><tr><th style="text-align:left">Người chơi</th><th>Còn lại</th><th>Đích</th><th>Điểm</th></tr>${rows}</table><p class="note">${v.winner === v.me ? 'Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.' : 'Chơi 1 ván +2 xu.'}</p>`;
  const btns = ui.isHost
    ? `<button class="btn big pri" id="m-again">🔁 Ván mới</button><button class="btn" id="m-lobby">Về phòng chờ</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`
    : `<button class="btn big pri" id="m-close">Đóng</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`;
  ui.openModal(`<h2>${title}</h2>${body}<div class="btns">${btns}</div>`, 'lock');
  const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); ui.net.raw.start(); };
  const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); ui.net.raw.restart(); };
  const home = $('#m-home'); if (home) home.onclick = () => { ui.closeModal(); ui.leave(); };
  const close = $('#m-close'); if (close) close.onclick = ui.closeModal;
}

/* ---------- tương tác bàn cờ ---------- */
function doMove(pid, to) {
  ui.actAs(pid, { type: 'move', to });
  sel = null;
  Snd.place();
}
$('#board').addEventListener('click', e => {
  if (!cur || cur.phase !== 'playing') return;
  const pid = controlPid(cur);
  if (!pid) { tip('Chưa tới lượt bạn — đang chờ đối thủ đi.'); return; }
  const wallEl = e.target.closest('[data-wall]');
  const cellEl = e.target.closest('[data-cell]');
  /* --- bấm khe tường --- */
  if (wallEl && !cellEl) {
    const [r, c] = wallEl.dataset.wall.split(',').map(Number);
    if (!wallMode) { tip('Muốn đặt tường thì bấm nút 🧱 Tường ngang hoặc 🧱 Tường dọc trước, rồi mới bấm vào khe.'); return; }
    const me = cur.players.find(p => p.id === pid);
    if (!me || me.wallsLeft <= 0) { tip('Bạn đã hết tường — chỉ còn đi quân được thôi.'); return; }
    const w = { orient: wallMode, r, c };
    const chk = validateWall(cur, pid, w);
    if (!chk.ok) { Snd.invalid(); tip(chk.reason); return; }
    ui.actAs(pid, { type: 'wall', ...w });
    wallMode = null;
    Snd.place();
    render(cur, cur);
    return;
  }
  if (!cellEl) return;
  const [r, c] = cellEl.dataset.cell.split(',').map(Number);
  if (wallMode) { tip('Đang ở chế độ đặt tường — bấm vào 1 khe giữa 4 ô, hoặc bấm 🚶 Đi quân để quay lại.'); return; }
  const me = cur.players.find(p => p.id === pid);
  if (!me) return;
  /* bấm ô đích vàng → đi */
  if (sel) {
    const dests = myDests(cur, pid);
    if (dests.includes(r + ',' + c)) { doMove(pid, [r, c]); render(cur, cur); return; }
  }
  /* bấm quân của mình → chọn (bấm lại thì bỏ chọn) */
  if (me.pos[0] === r && me.pos[1] === c) {
    sel = sel ? null : [r, c];
    Snd.pick();
    render(cur, cur);
    return;
  }
  /* bấm ô khác khi đang chọn → bỏ chọn */
  if (sel) { sel = null; render(cur, cur); }
});
/* xem trước tường khi rê chuột qua khe */
$('#board').addEventListener('mouseover', e => {
  if (!wallMode) return;
  const wallEl = e.target.closest('[data-wall]');
  if (!wallEl) return;
  const [r, c] = wallEl.dataset.wall.split(',').map(Number);
  wallEl.classList.add(wallMode === 'h' ? 'preview-h' : 'preview-v');
  const s1 = wallMode === 'h'
    ? document.querySelector(`[data-hgap="${r},${c}"]`)
    : document.querySelector(`[data-vgap="${r},${c}"]`);
  const s2 = wallMode === 'h'
    ? document.querySelector(`[data-hgap="${r},${c + 1}"]`)
    : document.querySelector(`[data-vgap="${r + 1},${c}"]`);
  if (s1) s1.style.background = '#7c5cff';
  if (s2) s2.style.background = '#7c5cff';
});
$('#board').addEventListener('mouseout', e => {
  const wallEl = e.target.closest('[data-wall]');
  if (!wallEl) return;
  const [r, c] = wallEl.dataset.wall.split(',').map(Number);
  wallEl.classList.remove('preview-h', 'preview-v');
  for (const [attr, rr, cc] of [['hgap', r, c], ['hgap', r, c + 1], ['vgap', r, c], ['vgap', r + 1, c]]) {
    const el = document.querySelector(`[data-${attr}="${rr},${cc}"]`);
    if (el && !el.classList.contains('wall')) el.style.background = '';
  }
});
/* ---------- nút chế độ ---------- */
$('#btn-mode-move').onclick = () => { wallMode = null; sel = null; Snd.pick(); if (cur) render(cur, cur); };
$('#btn-mode-wall-h').onclick = () => {
  if (!cur || cur.phase !== 'playing' || !controlPid(cur)) { tip('Chưa tới lượt bạn — đang chờ đối thủ đi.'); return; }
  const me = cur.players.find(p => p.id === controlPid(cur));
  if (me && me.wallsLeft <= 0) { tip('Bạn đã hết tường — chỉ còn đi quân được thôi.'); return; }
  wallMode = wallMode === 'h' ? null : 'h'; sel = null; Snd.pick(); render(cur, cur);
};
$('#btn-mode-wall-v').onclick = () => {
  if (!cur || cur.phase !== 'playing' || !controlPid(cur)) { tip('Chưa tới lượt bạn — đang chờ đối thủ đi.'); return; }
  const me = cur.players.find(p => p.id === controlPid(cur));
  if (me && me.wallsLeft <= 0) { tip('Bạn đã hết tường — chỉ còn đi quân được thôi.'); return; }
  wallMode = wallMode === 'v' ? null : 'v'; sel = null; Snd.pick(); render(cur, cur);
};
$('#btn-cancel').onclick = () => { wallMode = null; sel = null; Snd.pick(); if (cur) render(cur, cur); };

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
  ui.net.raw.start();
};
$('#btn-resign').onclick = async () => {
  const v = cur;
  if (!v || v.phase === 'ended') return;
  const r = await confirmBox('Nhận thua trận này? Trận kết thúc ngay, người còn lại gần đích nhất thắng.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
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
  game: 'quoridor', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      /* đấu máy: bạn + (số người − 1) máy */
      for (let i = 0; i < playerCount - 1; i++) h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
    }
    /* pvp: chủ phòng thêm người trong phòng chờ (thêm máy / người cùng máy) */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => { render(v, prev); },
});

/* 🏠 nút home phải về đúng trang chủ web (gameKit chỉ về màn hình đầu của game) */
$('#btn-leave').onclick = async () => {
  const r = await confirmBox(ui.isHost ? 'Bạn là chủ phòng: rời đi là cả phòng giải tán.' : 'Bạn có thể vào lại bằng mã phòng.', { title: 'Rời ván?', ok: 'Rời ván', cancel: 'Ở lại', danger: true });
  if (r) { ui.leave(); setTimeout(() => { location.href = '../'; }, 250); }
};
