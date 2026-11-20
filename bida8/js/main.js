// 🎱 Bida 8-ball — giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Rắn Săn Mồi:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Cú bắn được engine mô phỏng đồng bộ ngay trong applyAction nên view
// nhận được đã là bàn cuối; giao diện tự chạy lại simulateShot từ bàn
// trước + lastShot để chiếu hoạt hình bi lăn (không cần đường đi trên
// mạng). Đồng hồ đấu 600s: chỉ CHỦ PHÒNG chạy — mỗi 1s kiểm tra, hết
// giờ thì gửi {type:'timeout'}.
import { createGame, applyAction, viewFor, serialize, deserialize, actors, TABLE_W, TABLE_H, RAIL, MIN_X, MAX_X, MIN_Y, MAX_Y, BALL_R, POCKETS, POCKET_R, BALL_COLORS, RACE_TIME_MS, groupOf, simulateShot, guideInfo, placeError } from './engine.js?v=1';
import { botAction, botDelay, BOT_NAMES } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import { Sfx } from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=50';
import { gameKit, $, esc, cleanName, avatar } from '../../shared/ui/gamekit.js?v=11';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'bida8', min: 1, max: 2, maxSeats: 2, allowLocal: true,
  minMsg: 'Bida 8-ball cần 2 người: đấu máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: { bdMode: 'match' },
  optOk: (k, v) => (k === 'botLevel' && (v === 'easy' || v === 'hard')) || (k === 'bdMode' && (v === 'solo' || v === 'match')),
  create: createGame, apply: applyAction, view: viewFor, serialize, deserialize, actors, bot: botAction,
  /* máy đi sau 700–900ms (Dễ) / 400–600ms (Khó) mỗi cú — botDelay ở bot.js */
  botDelay: (s, pid) => botDelay(s, pid),
  botNames: BOT_NAMES,
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'solo'; /* solo | match | pvp | online */
let botLevel = 'hard';
let p2name = 'Bạn 2';
try {
  const l = localStorage.getItem('gumballz-bida8-level');
  if (l === 'easy' || l === 'hard') botLevel = l;
  const n = localStorage.getItem('gumballz-bida8-p2');
  if (n) p2name = n;
} catch (e) {}
function toggleBox(id) {
  for (const b of ['solo-row', 'bot-row', 'room-box', 'local-row']) {
    const el = document.getElementById(b);
    if (el) el.style.display = b === id ? (el.style.display === 'none' ? '' : 'none') : 'none';
  }
}
$('#btn-solo').onclick = () => toggleBox('solo-row');
$('#btn-start-solo').onclick = () => { mode = 'solo'; ui.startHost(true); };
$('#btn-vs-bot').onclick = () => toggleBox('bot-row');
$('#btn-online').onclick = () => { mode = 'online'; toggleBox('room-box'); };
$('#btn-local').onclick = () => toggleBox('local-row');
$('#btn-start-bot').onclick = () => {
  botLevel = $('#sel-level').value === 'easy' ? 'easy' : 'hard';
  try { localStorage.setItem('gumballz-bida8-level', botLevel); } catch (e) {}
  mode = 'match'; ui.startHost(true);
};
$('#btn-start-local').onclick = () => {
  p2name = ($('#inp-p2name').value || 'Bạn 2').trim().slice(0, 16) || 'Bạn 2';
  try { localStorage.setItem('gumballz-bida8-p2', p2name); } catch (e) {}
  mode = 'pvp'; ui.startHost(true);
};

/* ---------- phòng chờ ---------- */
function needCount() {
  if (mode === 'solo') return 1;
  return 2; /* match / pvp / online đều cần 2 người */
}
function renderLobby(info, u) {
  const n = info.players.length;
  const need = needCount();
  $('#lobby-list').innerHTML = `<p><b>${n}/2 người</b> (cần ${need}–2)</p>` + info.players.map(p => {
    return `<div class="lobby-row">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'hard' ? 'Khó' : 'Dễ'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${u.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</div>`;
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
    const hard = await confirmBox('Máy Khó tính toán cú vào lỗ chắc nhất (400–600ms/cú); máy Dễ ngắm ẩu, lực ngẫu nhiên (700–900ms/cú).', { title: '🤖 Thêm máy', ok: 'Máy Khó', cancel: 'Máy Dễ' });
    h.addBot({ level: hard ? 'hard' : 'easy' });
  } else if (b.id === 'btn-addlocal') {
    const nm = await promptBox('Người chơi cùng máy (chung 1 bàn, thay phiên ngắm bắn).', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (nm) h.addLocal(nm);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
let pvpP2 = null; /* id người chơi 2 ở chế độ chung máy */
let timeoutSent = false;
let animating = false;
let animRaf = 0;
let aim = null; /* {angle, power} khi đang kéo ngắm */
let lastPots = 0;
let lastFouls = 0;

function controlPid(v, pid) {
  if (!v || v.phase !== 'playing' || !pid) return null;
  const p = v.players.find(x => x.id === pid);
  return p && ui.controls(pid) ? pid : null;
}
function send(pid, a) {
  if (!ui.net || !cur) return;
  ui.actAs(pid, a);
}
function myAction(a, pid) {
  const id = pid || (cur && cur.me);
  const cp = controlPid(cur, id);
  if (!cp) return;
  send(cp, a);
  if (a.type === 'shoot') Sfx.cue();
}

const ui = gameKit({
  game: 'bida8', net: NET,
  offline: h => {
    if (mode === 'solo') {
      h.setOpt('bdMode', 'solo');
    } else if (mode === 'match') {
      h.setOpt('bdMode', 'match');
      h.setOpt('botLevel', botLevel);
      h.addBot({ level: botLevel });
    } else if (mode === 'pvp') {
      h.setOpt('bdMode', 'match');
      if (h.players.length < 2) h.addLocal(p2name);
    }
    /* online: mặc định match, không cần setOpt */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => {
    if (!v) { cur = null; endShownFor = ''; pvpP2 = null; timeoutSent = false; aim = null; lastPots = 0; lastFouls = 0; render(null, null); return; }
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
  if (r) { stopMatchClock(); ui.leave(); setTimeout(() => { location.href = '../'; }, 250); }
};

/* ---------- đồng hồ đấu 600s (chỉ chủ phòng chạy) ---------- */
let matchTimer = null;
function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}
function startMatchClock() {
  if (matchTimer) return;
  matchTimer = setInterval(() => {
    if (!cur || cur.phase !== 'playing' || cur.solo) return;
    const el = $('#bd-time');
    if (el) el.textContent = '⏱️ ' + fmtTime((RACE_TIME_MS - (Date.now() - cur.startedAt)) / 1000);
    if (ui.isHost && !timeoutSent && Date.now() - cur.startedAt >= RACE_TIME_MS) {
      timeoutSent = true;
      send(cur.me, { type: 'timeout' });
    }
  }, 1000);
}
function stopMatchClock() { if (matchTimer) { clearInterval(matchTimer); matchTimer = null; } }

/* ---------- vẽ bàn ---------- */
const canvas = $('#bd-canvas');
const ctx2d = canvas.getContext('2d');
function ballColor(id) { return BALL_COLORS[id] || '#888888'; }
function drawBall(x, y, id) {
  const r = BALL_R;
  if (id === 0) {
    ctx2d.beginPath(); ctx2d.arc(x, y, r, 0, Math.PI * 2);
    ctx2d.fillStyle = '#FFFFFF'; ctx2d.fill();
    ctx2d.lineWidth = 1.5; ctx2d.strokeStyle = '#4A3E5C'; ctx2d.stroke();
    ctx2d.beginPath(); ctx2d.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx2d.fillStyle = '#D61F4A'; ctx2d.fill();
    return;
  }
  const col = ballColor(id);
  const stripe = id >= 9;
  ctx2d.beginPath(); ctx2d.arc(x, y, r, 0, Math.PI * 2);
  ctx2d.fillStyle = stripe ? '#FFFFFF' : col; ctx2d.fill();
  ctx2d.lineWidth = 1.5; ctx2d.strokeStyle = '#4A3E5C'; ctx2d.stroke();
  if (stripe) {
    /* dải màu ngang giữa bi */
    ctx2d.save();
    ctx2d.beginPath(); ctx2d.arc(x, y, r - 0.75, 0, Math.PI * 2); ctx2d.clip();
    ctx2d.fillStyle = col;
    ctx2d.fillRect(x - r, y - r * 0.45, r * 2, r * 0.9);
    ctx2d.restore();
  }
  /* vòng trắng + số */
  ctx2d.beginPath(); ctx2d.arc(x, y, r * 0.52, 0, Math.PI * 2);
  ctx2d.fillStyle = '#FFFFFF'; ctx2d.fill();
  ctx2d.fillStyle = id === 8 ? '#FFFFFF' : '#2B2440';
  if (id === 8) { ctx2d.beginPath(); ctx2d.arc(x, y, r * 0.52, 0, Math.PI * 2); ctx2d.fillStyle = '#232323'; ctx2d.fill(); ctx2d.fillStyle = '#FFFFFF'; }
  ctx2d.font = 'bold 10px "Baloo 2", sans-serif';
  ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
  ctx2d.fillText(String(id), x, y + 0.5);
}
function drawTable(v, balls, aimState) {
  const W = canvas.width, H = canvas.height;
  /* khung gỗ */
  ctx2d.clearRect(0, 0, W, H);
  ctx2d.fillStyle = '#7A4A21';
  roundRect(0, 0, W, H, 16); ctx2d.fill();
  ctx2d.fillStyle = '#8D5A2B';
  roundRect(6, 6, W - 12, H - 12, 12); ctx2d.fill();
  /* nỉ xanh */
  ctx2d.fillStyle = '#2B7A4B';
  roundRect(RAIL, RAIL, TABLE_W, TABLE_H, 6); ctx2d.fill();
  /* đường kẻ đầu bàn (head string) + điểm */
  ctx2d.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx2d.lineWidth = 1.5;
  ctx2d.beginPath(); ctx2d.moveTo(240, RAIL); ctx2d.lineTo(240, RAIL + TABLE_H); ctx2d.stroke();
  ctx2d.beginPath(); ctx2d.arc(660, 255, 3, 0, Math.PI * 2); ctx2d.fillStyle = 'rgba(255,255,255,0.35)'; ctx2d.fill();
  /* lỗ */
  for (const [px, py] of POCKETS) {
    ctx2d.beginPath(); ctx2d.arc(px, py, POCKET_R, 0, Math.PI * 2);
    ctx2d.fillStyle = '#14101F'; ctx2d.fill();
    ctx2d.lineWidth = 2; ctx2d.strokeStyle = '#4A3E5C'; ctx2d.stroke();
  }
  /* đường ngắm */
  if (aimState && v) {
    const cue = balls.find(b => b.id === 0);
    if (cue && !cue.potted) {
      const g = guideInfo(balls, aimState.angle);
      ctx2d.save();
      ctx2d.setLineDash([8, 6]);
      ctx2d.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx2d.lineWidth = 2;
      ctx2d.beginPath(); ctx2d.moveTo(cue.x, cue.y);
      ctx2d.lineTo(g.ghost.x, g.ghost.y); ctx2d.stroke();
      ctx2d.setLineDash([]);
      /* bi ảo ở điểm va chạm */
      ctx2d.beginPath(); ctx2d.arc(g.ghost.x, g.ghost.y, BALL_R, 0, Math.PI * 2);
      ctx2d.strokeStyle = 'rgba(255,255,255,0.9)'; ctx2d.lineWidth = 2; ctx2d.stroke();
      if (g.hitId !== null && g.targetDir) {
        const tb = balls.find(b => b.id === g.hitId);
        if (tb) {
          ctx2d.strokeStyle = 'rgba(255,228,92,0.95)';
          ctx2d.lineWidth = 2;
          ctx2d.beginPath(); ctx2d.moveTo(tb.x, tb.y);
          ctx2d.lineTo(tb.x + g.targetDir.x * 70, tb.y + g.targetDir.y * 70); ctx2d.stroke();
        }
        if (g.pocketIdx >= 0) {
          const [px, py] = POCKETS[g.pocketIdx];
          ctx2d.beginPath(); ctx2d.arc(px, py, POCKET_R + 5, 0, Math.PI * 2);
          ctx2d.strokeStyle = '#FFE45C'; ctx2d.lineWidth = 3; ctx2d.stroke();
        }
      }
      ctx2d.restore();
    }
  }
  /* các bi (bi cái vẽ sau cùng để luôn nổi) */
  for (const b of balls) {
    if (b.potted || b.id === 0) continue;
    drawBall(b.x, b.y, b.id);
  }
  const cue = balls.find(b => b.id === 0);
  if (cue && !cue.potted) drawBall(cue.x, cue.y, 0);
}
function roundRect(x, y, w, h, r) {
  ctx2d.beginPath();
  ctx2d.moveTo(x + r, y);
  ctx2d.arcTo(x + w, y, x + w, y + h, r);
  ctx2d.arcTo(x + w, y + h, x, y + h, r);
  ctx2d.arcTo(x, y + h, x, y, r);
  ctx2d.arcTo(x, y, x + w, y, r);
  ctx2d.closePath();
}
function groupLabel(g) {
  if (g === 'solid') return '🟡 Bi trơn (1–7)';
  if (g === 'stripe') return '🔴 Bi sọc (9–15)';
  return '—';
}
function render(v, prev) {
  cur = v;
  if (!v) {
    drawTable(null, [], null);
    $('#bd-turn').textContent = '—';
    $('#bd-groups').textContent = 'Bàn mở';
    $('#bd-pots').textContent = '0 – 0';
    $('#bd-time').textContent = '';
    $('#bd-status').textContent = '';
    $('#bd-tray').innerHTML = '';
    $('#bd-opps').innerHTML = '';
    $('#bd-log').textContent = '';
    stopMatchClock();
    return;
  }
  if (!v.solo) startMatchClock(); else stopMatchClock();
  /* âm thanh vào lỗ / phạm lỗi theo số lượng thay đổi */
  const potsNow = v.players.reduce((n, p) => n + (v.pots[p.id] || 0), 0);
  const foulsNow = v.players.reduce((n, p) => n + (v.fouls[p.id] || 0), 0);
  if (prev && potsNow > lastPots) Sfx.pot();
  if (prev && foulsNow > lastFouls) Sfx.foul();
  lastPots = potsNow; lastFouls = foulsNow;
  /* thông tin lượt / nhóm / bi đã vào */
  const turnP = v.players.find(p => p.id === v.turn);
  $('#bd-turn').textContent = turnP ? cleanName(turnP.name) + (turnP.isBot ? ' 🤖' : '') : '—';
  if (v.openTable) {
    $('#bd-groups').textContent = '🎱 Bàn mở — chưa chia nhóm';
  } else {
    const me = v.me;
    const other = v.players.find(p => p.id !== me);
    $('#bd-groups').textContent = `Bạn: ${groupLabel(v.groups[me])}${other ? ` · ${cleanName(other.name)}: ${groupLabel(v.groups[other.id])}` : ''}`;
  }
  if (v.solo) {
    $('#bd-pots').textContent = `${v.pots[v.me] || 0} bi · ${v.shots[v.me] || 0} cú`;
  } else {
    const [a, b] = v.players;
    $('#bd-pots').textContent = `${v.pots[a.id] || 0} – ${b ? (v.pots[b.id] || 0) : 0}`;
  }
  /* trạng thái / gợi ý thao tác */
  const myTurn = v.turn === v.me && v.phase === 'playing';
  const statusEl = $('#bd-status');
  if (v.phase === 'ended') statusEl.textContent = '';
  else if (v.ballInHand === v.me) statusEl.textContent = '📍 Bạn được đặt bi cái — bấm vào chỗ trống trên bàn.';
  else if (v.ballInHand) statusEl.textContent = '📍 Đối thủ đang đặt bi cái…';
  else if (myTurn) statusEl.textContent = v.solo ? '🎯 Kéo từ bi cái để ngắm rồi thả tay để bắn.' : '🎯 Lượt của bạn — kéo từ bi cái để ngắm rồi thả tay để bắn.';
  else statusEl.textContent = '⏳ Đang chờ đối thủ bắn…';
  /* khay bi đã vào lỗ */
  const potted = v.balls.filter(b => b.potted && b.id !== 0);
  $('#bd-tray').innerHTML = potted.length
    ? '🕳️ Đã vào lỗ: ' + potted.map(b => `<span class="bd-dot" style="background:${ballColor(b.id)}" title="Bi ${b.id}"></span>`).join('')
    : '🕳️ Chưa có bi nào vào lỗ.';
  /* đối thủ */
  $('#bd-opps').innerHTML = v.players.map(p => {
    const g = v.groups[p.id];
    return `<div class="bd-opp"><span>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}</span><b>${groupLabel(g)}</b><span>🕳️ ${v.pots[p.id] || 0} bi · ⚠️ ${v.fouls[p.id] || 0} lỗi · 🎱 ${v.shots[p.id] || 0} cú</span><i>${p.id === v.turn && v.phase === 'playing' ? '▶ đang bắn' : ''}</i></div>`;
  }).join('');
  /* nhật ký */
  $('#bd-log').textContent = (v.log || []).slice(-3).map(l => l.text).join(' · ');
  /* vẽ bàn: có hoạt hình lăn bi nếu vừa có cú bắn */
  if (v.lastShot && prev && prev.balls && !animating) {
    const before = JSON.stringify(prev.balls.map(b => [b.id, b.x, b.y, b.potted]));
    const after = JSON.stringify(v.balls.map(b => [b.id, b.x, b.y, b.potted]));
    if (before !== after) { animateShot(prev, v); return; }
  }
  drawTable(v, v.balls, myTurn ? aim : null);
}
/* Chiếu hoạt hình cú bắn: chạy lại mô phỏng từ bàn trước rồi nội suy
   vị trí các bi theo từng khung hình (tối đa ~2.5 giây). */
function animateShot(prev, v) {
  const prevBalls = prev.balls.map(b => ({ id: b.id, x: b.x, y: b.y, vx: 0, vy: 0, potted: b.potted }));
  let res;
  try {
    res = simulateShot(prevBalls, v.lastShot.angle, v.lastShot.power, true);
  } catch (e) { drawTable(v, v.balls, null); return; }
  const path = res.path;
  if (!path || path.length < 2) { drawTable(v, v.balls, null); return; }
  animating = true;
  aim = null;
  setPower(0);
  const simMs = res.steps * (1 / 120) * 1000;
  const dur = Math.max(350, Math.min(simMs, 2500));
  const t0 = performance.now();
  const byId = {};
  for (const b of v.balls) byId[b.id] = b;
  cancelAnimationFrame(animRaf);
  const frame = now => {
    const k = Math.min(1, (now - t0) / dur);
    const fi = k * (path.length - 1);
    const i0 = Math.floor(fi), i1 = Math.min(path.length - 1, i0 + 1);
    const f = fi - i0;
    const frame0 = path[i0], frame1 = path[i1];
    const balls = frame0.map((b0, i) => {
      const b1 = frame1[i];
      const final = byId[b0.id];
      if (b0.potted) return { id: b0.id, x: final ? final.x : -100, y: final ? final.y : -100, potted: true };
      return { id: b0.id, x: b0.x + (b1.x - b0.x) * f, y: b0.y + (b1.y - b0.y) * f, potted: false };
    });
    drawTable(v, balls, null);
    if (k < 1) { animRaf = requestAnimationFrame(frame); return; }
    animating = false;
    drawTable(v, v.balls, null);
  };
  animRaf = requestAnimationFrame(frame);
}

function showEnd(v) {
  stopMatchClock();
  const me = v.me;
  const sum = (v.final && v.final.summary) || {};
  const won = (v.winnerIds || []).includes(me);
  let h;
  if (v.endReason === 'draw') h = '🤝 Trận hòa!';
  else if (v.endReason === 'resign') h = '🏳️ Trận đã kết thúc!';
  else if (v.endReason === 'foul8') h = won ? '🏆 Bạn thắng!' : '💥 Bi số 8 vào lỗ sớm!';
  else if (v.endReason === 'timeout') h = won ? '🏆 Bạn thắng!' : '⏱️ Hết giờ!';
  else if (won) h = v.solo ? '🏆 Dọn sạch bàn!' : '🏆 Bạn thắng!';
  else if (v.solo) h = '😢 Chưa dọn hết bàn!';
  else h = `🏆 ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name || 'Máy'))} thắng!`;
  const rows = v.players.map(p => {
    const q = sum[p.id] || {};
    const isWin = (v.winnerIds || []).includes(p.id);
    return `<div>${isWin ? '👑 ' : ''}${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''} — 🕳️ ${q.pots || 0} bi · ⚠️ ${q.fouls || 0} lỗi · 🎱 ${q.shots || 0} cú · ⏱️ ${Math.round((q.timeMs || 0) / 1000)}s</div>`;
  }).join('');
  let reason = '';
  if (v.endReason === 'draw') reason = 'Quá số cú bắn (hoặc hết giờ mà bằng nhau) — không ai hơn ai.';
  else if (v.endReason === 'resign') reason = 'Có người xin thua — bị loại khỏi ván.';
  else if (v.endReason === 'foul8') reason = won ? 'Đối thủ đánh bi 8 sớm (hoặc kèm phạm lỗi) — bạn thắng!' : 'Bi 8 vào lỗ khi chưa hết nhóm (hoặc kèm phạm lỗi) — thua ngay.';
  else if (v.endReason === 'timeout') reason = 'Hết 10 phút — ai vào nhiều bi hơn (rồi ít lỗi hơn) thắng.';
  else if (v.solo && won) reason = `Bạn vào hết 15 bi sau ${sum[me] ? sum[me].shots : 0} cú bắn!`;
  else reason = 'Đấu: ai vào bi 8 đúng luật trước thì thắng.';
  if (won) Sfx.win(); else Sfx.lose();
  ui.openModal(`<h2>${h}</h2><p>${reason}</p><div>${rows}</div><div class="btns"><button class="btn primary" id="m-again">🔄 Chơi lại</button><button class="btn" id="m-close">Đóng</button></div>`);
  const c = $('#m-close'); if (c) c.onclick = ui.closeModal;
  const a = $('#m-again'); if (a) a.onclick = () => { ui.closeModal(); location.reload(); };
}

/* ---------- ngắm + bắn (chuột + chạm) ---------- */
function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (canvas.width / r.width);
  const y = (e.clientY - r.top) * (canvas.height / r.height);
  return { x, y };
}
function setPower(p) {
  $('#bd-power-fill').style.width = Math.round(p * 100) + '%';
  $('#bd-power-num').textContent = Math.round(p * 100) + '%';
}
function myTurnNow() {
  return cur && cur.phase === 'playing' && cur.turn === cur.me && !animating;
}
canvas.addEventListener('pointerdown', e => {
  if (!myTurnNow()) return;
  e.preventDefault();
  const pos = canvasPos(e);
  const cue = cur.balls.find(b => b.id === 0);
  /* đặt bi cái: bấm vào chỗ trống trên bàn */
  if (cur.ballInHand === cur.me) {
    const err = placeError(cur.balls, pos.x, pos.y);
    if (err) { tip(err); return; }
    myAction({ type: 'place', x: Math.round(pos.x), y: Math.round(pos.y) });
    return;
  }
  if (!cue || cue.potted) return;
  aim = { angle: 0, power: 0, startX: cue.x, startY: cue.y };
  updateAim(pos);
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (!aim) return;
  updateAim(canvasPos(e));
});
function updateAim(pos) {
  if (!aim || !cur) return;
  const cue = cur.balls.find(b => b.id === 0);
  if (!cue || cue.potted) { aim = null; return; }
  const dx = pos.x - cue.x, dy = pos.y - cue.y;
  const d = Math.hypot(dx, dy);
  if (d < 4) { aim.angle = 0; aim.power = 0; }
  else {
    aim.angle = Math.atan2(dy, dx);
    aim.power = Math.max(0, Math.min(1, d / 300));
  }
  setPower(aim.power);
  drawTable(cur, cur.balls, aim);
}
function endAim(shoot) {
  if (!aim) return;
  const a = aim;
  aim = null;
  setPower(0);
  if (cur) drawTable(cur, cur.balls, null);
  if (shoot && a.power > 0.08) myAction({ type: 'shoot', angle: a.angle, power: a.power });
}
canvas.addEventListener('pointerup', () => endAim(true));
canvas.addEventListener('pointercancel', () => endAim(false));
canvas.addEventListener('contextmenu', e => { e.preventDefault(); });

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
$('#btn-guide').onclick = openGuide;
$('#btn-guide-top').onclick = openGuide;
$('#btn-sound').onclick = () => {
  Sfx.setEnabled(!Sfx.isEnabled());
  $('#btn-sound').textContent = Sfx.isEnabled() ? '🔊 Âm thanh' : '🔇 Tắt tiếng';
};
if (!Sfx.isEnabled()) $('#btn-sound').textContent = '🔇 Tắt tiếng';
