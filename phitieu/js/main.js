// 🎯 Phi Tiêu — giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Đá Penalty:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Bàn vẽ bằng SVG (tự vẽ, pastel); chạm vào bàn để ngắm rồi ném.
import { createGame, applyAction, viewFor, serialize, deserialize, actors, SEGMENTS, START_SCORE, SOLO_VISITS, SOLO_WIN_SCORE, pointFor, scoreOf, ringName, isDoubleOut } from './engine.js?v=1';
import { botAction, botDelay, BOT_NAMES } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import { Sfx } from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, cleanName, avatar } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet({
  game: 'phitieu', min: 2, max: 2, maxSeats: 2, allowLocal: true,
  minMsg: 'Phi Tiêu cần 2 người: đấu máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: { phMode: 'match' },
  optOk: (k, v) => (k === 'botLevel' && (v === 'easy' || v === 'hard')) || (k === 'phMode' && (v === 'solo' || v === 'match')) || (k === 'firstIdx' && Number.isInteger(v) && v >= 0 && v < 2),
  create: createGame, apply: applyAction, view: viewFor, serialize, deserialize, actors, bot: botAction,
  /* máy đi sau 700–900ms (Dễ) / 400–600ms (Khó) mỗi lượt ném — botDelay ở bot.js */
  botDelay: (s, pid) => botDelay(s, pid),
  botNames: BOT_NAMES,
});

/* 🔄 Người ném trước xoay qua các ván: host giữ bộ đếm trong localStorage
   (sống qua cả tải lại trang — nút "Chơi lại" của game tải lại trang);
   ván nào lấy firstIdx = đếm % số người rồi tăng đếm, đăng lên opts để
   mọi người trong phòng chờ đều thấy ai ném trước ván tới. */
const FT_KEY = 'gumballz-phitieu-firstctr';
let firstCtr = 0;
try { firstCtr = +localStorage.getItem(FT_KEY) || 0; } catch (e) {}
const peekFirst = n => (n > 0 ? firstCtr % n : 0);
const takeFirst = n => { const i = peekFirst(n); firstCtr++; try { localStorage.setItem(FT_KEY, String(firstCtr)); } catch (e) {} return i; };
let lastLobby = null;
function startGame() {
  if (!ui.isHost || !ui.net || !ui.net.raw) return;
  const n = (lastLobby && lastLobby.players && lastLobby.players.length) || 2;
  if (n < needCount()) return;
  const fi = mode === 'solo' ? 0 : takeFirst(n);
  ui.net.raw.start({ firstIdx: fi });
}

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'solo'; /* solo | match | pvp | online */
let botLevel = 'hard';
let soloLevel = 'hard';
let p2name = 'Bạn 2';
try {
  const l = localStorage.getItem('gumballz-phitieu-level');
  if (l === 'easy' || l === 'hard') botLevel = l;
  const sl = localStorage.getItem('gumballz-phitieu-solo-level');
  if (sl === 'easy' || sl === 'hard') soloLevel = sl;
  const n = localStorage.getItem('gumballz-phitieu-p2');
  if (n) p2name = n;
} catch (e) {}
function toggleBox(id) {
  for (const b of ['solo-row', 'bot-row', 'room-box', 'local-row']) {
    const el = document.getElementById(b);
    if (el) el.style.display = b === id ? (el.style.display === 'none' ? '' : 'none') : 'none';
  }
}
$('#btn-solo').onclick = () => toggleBox('solo-row');
$('#btn-start-solo').onclick = () => {
  soloLevel = 'hard';
  try { localStorage.setItem('gumballz-phitieu-solo-level', soloLevel); } catch (e) {}
  mode = 'solo'; ui.startHost(true);
};
$('#btn-vs-bot').onclick = () => toggleBox('bot-row');
$('#btn-online').onclick = () => { mode = 'online'; toggleBox('room-box'); };
$('#btn-local').onclick = () => toggleBox('local-row');
$('#btn-start-bot').onclick = () => {
  botLevel = $('#sel-level').value === 'easy' ? 'easy' : 'hard';
  try { localStorage.setItem('gumballz-phitieu-level', botLevel); } catch (e) {}
  mode = 'match'; ui.startHost(true);
};
$('#btn-start-local').onclick = () => {
  p2name = ($('#inp-p2name').value || 'Bạn 2').trim().slice(0, 16) || 'Bạn 2';
  try { localStorage.setItem('gumballz-phitieu-p2', p2name); } catch (e) {}
  mode = 'pvp'; ui.startHost(true);
};

/* ---------- phòng chờ ---------- */
function needCount() {
  return 2; /* solo (người + máy ngồi chơi) / match / pvp / online đều cần 2 người */
}
function renderLobby(info, u) {
  lastLobby = info;
  const n = info.players.length;
  const need = needCount();
  /* đăng người ném trước ván tới lên opts để khách trong phòng cũng thấy đúng người */
  const peek = peekFirst(n);
  if (u.isHost && ui.net && ui.net.raw && typeof ui.net.raw.setOpt === 'function' && (info.opts || {}).firstIdx !== peek) ui.net.raw.setOpt('firstIdx', peek);
  const fi = Number.isInteger(info.opts && info.opts.firstIdx) ? info.opts.firstIdx : peek;
  $('#lobby-list').innerHTML = `<p><b>${n}/2 người</b> (cần ${need}–2)</p>` + info.players.map((p, i) => {
    return `<div class="lobby-row">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'hard' ? 'Khó' : 'Dễ'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${mode !== 'solo' && n > 1 && i === fi ? '<span class="seat-role">🎯 Ném trước</span>' : ''}${u.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</div>`;
  }).join('') + (u.isHost && mode === 'online' && n < 2
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>` : '');
  $('#btn-start-online').style.display = u.isHost ? '' : 'none';
  $('#btn-start-online').disabled = n < need;
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.net.raw;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') {
    const hard = await confirmBox('Máy Khó ngắm treble 20 và tính checkout (400–600ms/lượt); máy Dễ ném ẩu (700–900ms/lượt).', { title: '🤖 Thêm máy', ok: 'Máy Khó', cancel: 'Máy Dễ' });
    h.addBot({ level: hard ? 'hard' : 'easy' });
  } else if (b.id === 'btn-addlocal') {
    const nm = await promptBox('Người chơi cùng máy (chung 1 màn hình, thay phiên ném).', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (nm) h.addLocal(nm);
  }
});
$('#btn-start-online').onclick = () => startGame();

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
let announcedGid = ''; /* gid đã công bố người ném trước (tránh toast lặp khi vẽ lại) */
let pvpP2 = null;
let shownThrowId = 0;

function controlPid(v, pid) {
  if (!v || v.phase !== 'playing' || !pid) return null;
  const p = v.players.find(x => x.id === pid);
  return p && ui.controls(pid) ? pid : null;
}
function send(pid, a) {
  if (!ui.net || !cur) return;
  ui.actAs(pid, a);
}

const ui = gameKit({
  game: 'phitieu', net: NET,
  offline: h => {
    if (mode === 'solo') {
      h.setOpt('phMode', 'solo');
      h.setOpt('botLevel', soloLevel);
      h.addBot({ level: soloLevel }); /* máy ngồi chơi (không ném) — đủ 2 ghế sảnh */
    } else if (mode === 'match') {
      h.setOpt('phMode', 'match');
      h.setOpt('botLevel', botLevel);
      h.addBot({ level: botLevel });
    } else if (mode === 'pvp') {
      h.setOpt('phMode', 'match');
      if (h.players.length < 2) h.addLocal(p2name);
    }
    /* online: mặc định match, không cần setOpt */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => {
    if (!v) { cur = null; endShownFor = ''; pvpP2 = null; shownThrowId = 0; render(null, null); return; }
    if (mode === 'pvp') {
      const raw = ui.net && ui.net.raw && ui.net.raw.state;
      if (raw) {
        const ids = raw.players.map(p => p.id);
        if (ids.length >= 2 && !pvpP2) pvpP2 = raw.players.find(p => p.local)?.id || ids[1];
      }
    }
    render(v, prev);
    if (v.phase === 'ended') {
      const k = v.gid + '|' + v.seq;
      if (endShownFor !== k) { endShownFor = k; showEnd(v); }
    }
  },
});

/* 🏠 nút home phải về đúng trang chủ web (gameKit chỉ về màn hình đầu của game) */
$('#btn-leave').onclick = async () => {
  const r = await confirmBox(ui.isHost ? 'Bạn là chủ phòng: rời đi là cả phòng giải tán.' : 'Bạn có thể vào lại bằng mã phòng.', { title: 'Rời ván?', ok: 'Rời ván', cancel: 'Ở lại', danger: true });
  if (r) { ui.leave(); setTimeout(() => { location.href = '../'; }, 250); }
};

/* ---------- vẽ bàn phi tiêu (SVG) ---------- */
const SC = 170 / 190; /* tỉ lệ tọa độ bàn (r=190) → SVG (r=170) */
const svg = $('#ph-board');
const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}
function polar(r, deg) {
  const a = (deg * Math.PI) / 180;
  return [200 + r * Math.sin(a), 200 - r * Math.cos(a)];
}
/* quạt vành khăn từ r1..r2, góc a0..a1 (độ, 0° = lên trên, chiều kim đồng hồ) */
function wedgePath(r1, r2, a0, a1) {
  const [x1, y1] = polar(r1, a0);
  const [x2, y2] = polar(r2, a0);
  const [x3, y3] = polar(r2, a1);
  const [x4, y4] = polar(r1, a1);
  return `M ${x1} ${y1} L ${x2} ${y2} A ${r2} ${r2} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${r1} ${r1} 0 0 0 ${x1} ${y1} Z`;
}
function buildBoard() {
  svg.innerHTML = '';
  const g = el('g', { class: 'ph-wedges' });
  /* vành số: nền mực */
  g.appendChild(el('circle', { cx: 200, cy: 200, r: 196, fill: '#4A3E5C' }));
  /* các ô: đơn trong [20,99], treble [99,115], đơn giữa [115,162],
     double [162,178], đơn ngoài [178,190] — ô chẵn: mực/đỏ, ô lẻ: kem/xanh */
  for (let i = 0; i < 20; i++) {
    const a0 = i * 18 - 9, a1 = i * 18 + 9;
    const dark = i % 2 === 0;
    const singleFill = dark ? '#4A3E5C' : '#FFFDF9';
    const multiFill = dark ? '#E63329' : '#1E7D32';
    g.appendChild(el('path', { d: wedgePath(20 * SC, 99 * SC, a0, a1), fill: singleFill, class: 'ph-wedge' }));
    g.appendChild(el('path', { d: wedgePath(99 * SC, 115 * SC, a0, a1), fill: multiFill, class: 'ph-wedge' }));
    g.appendChild(el('path', { d: wedgePath(115 * SC, 162 * SC, a0, a1), fill: singleFill, class: 'ph-wedge' }));
    g.appendChild(el('path', { d: wedgePath(162 * SC, 178 * SC, a0, a1), fill: multiFill, class: 'ph-wedge' }));
    g.appendChild(el('path', { d: wedgePath(178 * SC, 190 * SC, a0, a1), fill: singleFill, class: 'ph-wedge' }));
    /* số ô */
    const [nx, ny] = polar(183, i * 18);
    const t = el('text', { x: nx, y: ny, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'ph-num', 'font-size': 15 });
    t.textContent = SEGMENTS[i];
    g.appendChild(t);
  }
  /* bull ngoài + bull trong */
  g.appendChild(el('circle', { cx: 200, cy: 200, r: 20 * SC, fill: '#1E7D32', class: 'ph-wedge' }));
  g.appendChild(el('circle', { cx: 200, cy: 200, r: 8 * SC, fill: '#E63329', class: 'ph-wedge' }));
  svg.appendChild(g);
  /* vòng ngắm theo chuột + dấu phi tiêu (vẽ sau, nằm trên) */
  const aim = el('circle', { id: 'ph-aim', r: 10, class: 'ph-aim', style: 'display:none' });
  svg.appendChild(aim);
  const marks = el('g', { id: 'ph-marks' });
  svg.appendChild(marks);
}
buildBoard();
const aimEl = svg.querySelector('#ph-aim');
const marksEl = svg.querySelector('#ph-marks');
function toEngineCoords(e) {
  const r = svg.getBoundingClientRect();
  const sx = ((e.clientX - r.left) / r.width) * 400;
  const sy = ((e.clientY - r.top) / r.height) * 400;
  return { x: 200 + (sx - 200) / SC, y: 200 + (sy - 200) / SC };
}
function toSvgCoords(x, y) {
  return { x: 200 + (x - 200) * SC, y: 200 + (y - 200) * SC };
}
svg.addEventListener('pointermove', e => {
  if (!cur || cur.phase !== 'playing') { aimEl.style.display = 'none'; return; }
  const p = toEngineCoords(e);
  if (p.x < 0 || p.x > 400 || p.y < 0 || p.y > 400) { aimEl.style.display = 'none'; return; }
  const s = toSvgCoords(p.x, p.y);
  aimEl.setAttribute('cx', s.x);
  aimEl.setAttribute('cy', s.y);
  aimEl.style.display = '';
});
svg.addEventListener('pointerleave', () => { aimEl.style.display = 'none'; });
svg.addEventListener('click', e => {
  if (!cur || cur.phase !== 'playing') return;
  const pid = mode === 'pvp' ? cur.turn : cur.me;
  if (!controlPid(cur, pid)) { tip('Chưa tới lượt ném của bạn.'); return; }
  const p = toEngineCoords(e);
  if (p.x < 0 || p.x > 400 || p.y < 0 || p.y > 400) { tip('Ngắm ngoài bàn rồi!'); return; }
  Sfx.throw();
  send(pid, { type: 'throw', x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 });
});

function render(v, prev) {
  cur = v;
  if (!v) {
    marksEl.innerHTML = '';
    $('#ph-turn').textContent = '—';
    $('#ph-visit-label').textContent = '';
    $('#ph-score').textContent = '501';
    $('#ph-status').textContent = '';
    $('#ph-visit').innerHTML = '';
    $('#ph-prompt').textContent = '';
    $('#ph-opps').innerHTML = '';
    $('#ph-throws').innerHTML = '';
    $('#ph-log').textContent = '';
    return;
  }
  const me = v.me;
  const turnP = v.players.find(p => p.id === v.turn);
  /* 🎯 Công bố người ném trước lúc mở ván (đấu 2 người; chơi đơn không cần) */
  if (!v.solo && v.phase === 'playing' && v.gid !== announcedGid && (v.throws || []).length === 0) {
    announcedGid = v.gid;
    if (turnP) tip(`🎯 ${cleanName(turnP.name)} ném trước!`);
  }
  $('#ph-turn').textContent = turnP ? cleanName(turnP.name) + (turnP.isBot ? ' 🤖' : '') : '—';
  if (v.solo) {
    $('#ph-visit-label').textContent = `Lượt ${Math.min(v.visit, SOLO_VISITS)}/${SOLO_VISITS} · Tổng ${v.total[me] || 0}đ`;
    $('#ph-score').textContent = `${v.total[me] || 0} / ${SOLO_WIN_SCORE}đ`;
  } else {
    $('#ph-visit-label').textContent = `Lượt ${v.visit}`;
    $('#ph-score').textContent = v.players.map(p => `${v.remaining[p.id] ?? START_SCORE}`).join(' – ');
  }
  /* trạng thái */
  const statusEl = $('#ph-status');
  if (v.phase === 'ended') statusEl.textContent = '';
  else if (mode === 'pvp') statusEl.textContent = v.turn === pvpP2 ? '🎯 Tới lượt bạn 2 ném' : '🎯 Tới lượt bạn 1 ném';
  else if (v.turn === me) statusEl.textContent = '🎯 Tới lượt bạn ném';
  else statusEl.textContent = '⏳ Đang chờ đối thủ ném…';
  /* điểm số */
  const showPlayers = v.solo ? v.players.filter(p => p.id === me) : v.players;
  $('#ph-opps').innerHTML = showPlayers.map(p => {
    const role = p.id === v.turn && v.phase === 'playing' ? '▶ đang ném' : '';
    const score = v.solo ? `Tổng <b>${v.total[p.id] || 0}đ</b>` : `Còn <b>${v.remaining[p.id] ?? START_SCORE}</b>`;
    return `<div class="ph-opp"><span>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}</span><span>${score}</span><span>🎯 ${v.darts[p.id] || 0} phi · 💯 ${v.tons[p.id] || 0} lượt ≥100 · 🔥 cao nhất ${v.maxVisit[p.id] || 0}</span><i>${role}</i></div>`;
  }).join('');
  /* 3 phi tiêu của lượt hiện tại */
  const vd = v.visitDarts || [];
  let visitHtml = '';
  for (let i = 0; i < 3; i++) {
    const d = vd[i];
    if (!d) visitHtml += `<span class="ph-dart">—</span>`;
    else visitHtml += `<span class="ph-dart ${d.points >= 60 ? 'hit' : d.points === 0 ? 'miss' : ''}">${d.points}đ</span>`;
  }
  const visitTotal = vd.reduce((t, d) => t + d.points, 0);
  $('#ph-visit').innerHTML = `Lượt này: ${visitHtml} <b>= ${visitTotal}đ</b>`;
  /* dấu phi tiêu trên bàn (lượt hiện tại) */
  marksEl.innerHTML = '';
  vd.forEach((d, i) => {
    const s = toSvgCoords(d.x, d.y);
    const color = d.pid === v.players[0].id ? '#7C5CFF' : '#FF5CA8';
    const c = el('circle', { cx: s.x, cy: s.y, r: 9, fill: color, class: 'ph-mark' });
    marksEl.appendChild(c);
    const t = el('text', { x: s.x, y: s.y + 0.5, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 11 });
    t.textContent = i + 1;
    marksEl.appendChild(t);
  });
  /* lịch sử ném (6 phi gần nhất, mới nhất lên đầu) */
  const throws = (v.throws || []).slice(-6).reverse();
  $('#ph-throws').innerHTML = throws.length
    ? throws.map(d => {
        const sn = (v.players.find(p => p.id === d.pid) || {}).name || '';
        const cls = d.points >= 60 ? 'good' : d.points === 0 ? 'bad' : '';
        return `<div class="ph-throw">Lượt ${d.visit}: ${esc(cleanName(sn))} ném <b>${ringName(d)}</b> — <span class="${cls}">${d.points}đ</span></div>`;
      }).join('')
    : 'Chưa có phi tiêu nào.';
  /* nhắc lượt */
  const promptEl = $('#ph-prompt');
  if (v.phase === 'ended') promptEl.textContent = '';
  else if (v.turn === me) promptEl.textContent = '🎯 Tới lượt bạn — chạm vào bàn để ngắm rồi ném!';
  else if (mode === 'pvp') promptEl.textContent = '🎯 Chạm vào bàn để ném (người đang tới lượt)!';
  else promptEl.textContent = '⏳ Đang chờ đối thủ ném…';
  /* nhật ký */
  $('#ph-log').textContent = (v.log || []).slice(-3).map(l => l.text).join(' · ');
  /* âm thanh cho phi tiêu mới */
  if (v.lastThrow && v.lastThrow.id !== shownThrowId) {
    shownThrowId = v.lastThrow.id;
    const lt = v.lastThrow;
    if (lt.ring === 'inner') Sfx.bull();
    else if (lt.points >= 60) Sfx.hit();
    else if (lt.points === 0) Sfx.bust();
  }
}

function showEnd(v) {
  const me = v.me;
  const sum = (v.final && v.final.summary) || {};
  const won = (v.winnerIds || []).includes(me);
  let h;
  if (v.endReason === 'draw') h = '🤝 Trận hòa!';
  else if (v.endReason === 'resign') h = '🏳️ Trận đã kết thúc!';
  else if (won) h = v.solo ? '🏆 Vua phi tiêu!' : '🏆 Bạn thắng!';
  else if (v.solo) h = `😢 Chưa đủ ${SOLO_WIN_SCORE} điểm!`;
  else h = `🏆 ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name || 'Máy'))} thắng!`;
  const rows = v.players.map(p => {
    const q = sum[p.id] || {};
    const isWin = (v.winnerIds || []).includes(p.id);
    return `<div>${isWin ? '👑 ' : ''}${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''} — 🎯 ${q.score || 0}đ · 🎯 ${q.darts || 0} phi · 💯 ${q.tons || 0} lượt ≥100 · 🔥 cao nhất ${q.maxVisit || 0}đ · 🎯 bull ${q.bulls || 0}</div>`;
  }).join('');
  let reason = '';
  if (v.endReason === 'draw') reason = `Quá ${40} lượt/người vẫn chưa xong — không ai hơn ai.`;
  else if (v.endReason === 'resign') reason = 'Có người xin thua — bị loại khỏi ván.';
  else if (v.solo && won) reason = `Bạn ghi ${sum[me] ? sum[me].score : 0} điểm sau 30 phi tiêu — đủ ${SOLO_WIN_SCORE} điểm để thắng!`;
  else if (v.solo) reason = `Bạn chỉ ghi ${sum[me] ? sum[me].score : 0} điểm — cần ${SOLO_WIN_SCORE} điểm mới thắng. Tập lại nhé!`;
  else reason = 'Đấu 501: ai về đúng 0 bằng double trước thì thắng.';
  if (won) Sfx.win(); else Sfx.lose();
  ui.openModal(`<h2>${h}</h2><p>${reason}</p><div>${rows}</div><div class="btns"><button class="btn primary" id="m-again">🔄 Chơi lại</button><button class="btn" id="m-close">Đóng</button></div>`);
  const c = $('#m-close'); if (c) c.onclick = ui.closeModal;
  const a = $('#m-again'); if (a) a.onclick = () => { ui.closeModal(); location.reload(); };
}

/* ---------- xin thua / hướng dẫn / âm thanh ---------- */
$('#btn-resign').onclick = async () => {
  if (!cur || cur.phase !== 'playing') return;
  const r = await confirmBox('Xin thua là thua luôn ván này.', { title: '🏳️ Xin thua?', ok: 'Xin thua', danger: true });
  if (!r) return;
  const pid = cur.me;
  if (mode === 'pvp' && pvpP2) {
    const p2 = await confirmBox('Chung máy 2 người: ai xin thua?', { title: '🏳️ Ai xin thua?', ok: 'Người 2', cancel: 'Người 1' });
    send(p2 ? pvpP2 : (cur.players[0] && cur.players[0].id), { type: 'resign' });
    return;
  }
  send(pid, { type: 'resign' });
};
async function openGuide() {
  ui.openModal(GUIDE_HTML);
  const c = $('#m-close');
  if (c) c.onclick = ui.closeModal;
}
$('#btn-guide-home').onclick = openGuide;
$('#btn-guide-top').onclick = openGuide;
$('#btn-sound').onclick = () => {
  Sfx.setEnabled(!Sfx.isEnabled());
  $('#btn-sound').textContent = Sfx.isEnabled() ? '🔊 Âm thanh' : '🔇 Tắt tiếng';
};
if (!Sfx.isEnabled()) $('#btn-sound').textContent = '🔇 Tắt tiếng';
