// 🏀 Bắn Bóng (Breakout) – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Rắn Săn Mồi:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Bóng: chỉ CHỦ PHÒNG chạy đồng hồ — mỗi 33ms gửi {type:'tick'} cho
// từng người đang chơi. Khách online chỉ vẽ lại view nhận được.
// Chơi chung máy (pvp): host có state thô nên vẽ cả 2 sân bằng
// viewFor(raw, pid) — giống pattern chuyền tay của Rắn Săn Mồi.
import { createGame, applyAction, viewFor, serialize, deserialize, actors, brickRect, W, H, PADDLE_W, PADDLE_H, PADDLE_Y, BALL_R, BRICK_COLS, BRICK_ROWS, BRICK_W, BRICK_H, RACE_TIME_MS, TICK_MS, TOTAL_BRICKS, PADDLE_KEY_STEP, LIVES } from './engine.js?v=1';
import { botAction, botDelay, BOT_NAMES } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import { Sfx } from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, cleanName, avatar } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet({
  game: 'banbong', min: 1, max: 4, maxSeats: 4, allowLocal: true,
  minMsg: 'Bắn Bóng đua cần 2–4 người: đấu máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: (k, v) => (k === 'botLevel' && (v === 'easy' || v === 'hard')) || (k === 'bbMode' && (v === 'solo' || v === 'race')),
  create: createGame, apply: applyAction, view: viewFor, serialize, deserialize, actors, bot: botAction,
  /* máy đi sau 400–700ms (Dễ) / 150–300ms (Khó) mỗi nước — botDelay ở bot.js */
  botDelay: (s, pid) => botDelay(s, pid),
  botNames: BOT_NAMES,
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'solo'; /* solo | race | pvp | online */
let botLevel = 'hard';
let p2name = 'Bạn 2';
try {
  const l = localStorage.getItem('gumballz-banbong-level');
  if (l === 'easy' || l === 'hard') botLevel = l;
  const n = localStorage.getItem('gumballz-banbong-p2');
  if (n) p2name = n;
} catch (e) {}
function toggleBox(id) {
  for (const b of ['solo-row', 'bot-row', 'online-row', 'room-box', 'local-row']) {
    const el = document.getElementById(b);
    if (el) el.style.display = b === id ? (el.style.display === 'none' ? '' : 'none') : 'none';
  }
}
$('#btn-solo').onclick = () => toggleBox('solo-row');
$('#btn-start-solo').onclick = () => { mode = 'solo'; ui.startHost(true); };
$('#btn-vs-bot').onclick = () => toggleBox('bot-row');
$('#btn-online').onclick = () => { mode = 'online'; toggleBox('online-row'); };
$('#btn-local').onclick = () => toggleBox('local-row');
$('#btn-start-bot').onclick = () => {
  botLevel = $('#sel-level').value === 'easy' ? 'easy' : 'hard';
  try { localStorage.setItem('gumballz-banbong-level', botLevel); } catch (e) {}
  mode = 'race'; ui.startHost(true);
};
$('#btn-start-local').onclick = () => {
  p2name = ($('#inp-p2name').value || 'Bạn 2').trim().slice(0, 16) || 'Bạn 2';
  try { localStorage.setItem('gumballz-banbong-p2', p2name); } catch (e) {}
  mode = 'pvp'; ui.startHost(true);
};
/* inputfix: Enter trong ô tên người chơi 2 thì bắt đầu chơi chung máy (trước đây không làm gì) */
$('#inp-p2name').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-start-local').click(); });
/* inputfix: Enter trong ô tên = hành động của hàng đang mở, chưa mở hàng nào thì chơi đơn */
$('#name').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  e.stopImmediatePropagation(); /* gamekit cũng gắn Enter cho #name — chỉ chạy handler này */
  const vis = id => { const el = document.getElementById(id); return el && el.style.display !== 'none'; };
  if (vis('local-row')) { $('#btn-start-local').click(); return; }
  if (vis('online-row')) { const c = $('#join-code'); if (c.value.trim().length >= 5) $('#btn-join').click(); else $('#btn-create').click(); return; }
  if (vis('bot-row')) { $('#btn-start-bot').click(); return; }
  if (vis('solo-row')) { $('#btn-start-solo').click(); return; }
  $('#btn-start-solo').click();
});

/* ---------- phòng chờ ---------- */
function needCount() {
  if (mode === 'solo') return 1;
  return 2; /* race / pvp / online đều cần ít nhất 2 */
}
function renderLobby(info, u) {
  const n = info.players.length;
  const need = needCount();
  $('#lobby-list').innerHTML = `<p><b>${n}/4 người</b> (cần ${need}–4)</p>` + info.players.map(p => {
    return `<div class="lobby-row">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'hard' ? 'Khó' : 'Dễ'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${u.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</div>`;
  }).join('') + (u.isHost && mode === 'online' && n < 4
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
    const hard = await confirmBox('Máy Khó dự đoán điểm rơi và ngắm bóng về phía còn nhiều gạch (150–300ms/nước); máy Dễ bám theo bóng, chậm và có sai số (400–700ms/nước).', { title: '🤖 Thêm máy', ok: 'Máy Khó', cancel: 'Máy Dễ' });
    h.addBot({ level: hard ? 'hard' : 'easy' });
  } else if (b.id === 'btn-addlocal') {
    const nm = await promptBox('Người chơi cùng máy (chung bàn phím: P1 phím mũi tên, P2 phím A / D).', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (nm) h.addLocal(nm);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
let paused = false;
let pvpP2 = null; /* id người chơi 2 ở chế độ chung máy */
let lastScore = 0;
let lastLives = LIVES;

function controlPid(v, pid) {
  if (!v || v.phase !== 'playing' || !pid) return null;
  const p = v.players.find(x => x.id === pid);
  return p && p.status === 'playing' && ui.controls(pid) ? pid : null;
}
function send(pid, a) {
  if (!ui.net || !cur) return;
  ui.actAs(pid, a);
}

const ui = gameKit({
  game: 'banbong', net: NET,
  offline: h => {
    if (mode === 'solo') {
      h.setOpt('bbMode', 'solo');
    } else if (mode === 'race') {
      h.setOpt('bbMode', 'race');
      h.setOpt('botLevel', botLevel);
      h.addBot({ level: botLevel });
    } else if (mode === 'pvp') {
      h.setOpt('bbMode', 'race');
      if (h.players.length < 2) h.addLocal(p2name);
    }
    /* online: mặc định race, không cần setOpt */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => {
    if (!v) { cur = null; endShownFor = ''; paused = false; pvpP2 = null; lastScore = 0; lastLives = LIVES; render(null, null); return; }
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
  if (r) { stopTick(); ui.leave(); setTimeout(() => { location.href = '../'; }, 250); }
};

/* ---------- đồng hồ bóng (chỉ chủ phòng chạy) ---------- */
let tickTimer = null;
function startTick() {
  if (tickTimer) return;
  tickTimer = setInterval(() => {
    if (!ui.isHost || !cur || cur.phase !== 'playing' || paused) return;
    const raw = ui.net && ui.net.raw && ui.net.raw.state;
    if (!raw) return;
    /* 'tick' là việc nhà của chủ phòng (đẩy bóng cho MỌI người): gửi thẳng qua
       host (raw.act) — actAs bị cổng controls() chặn lặng lẽ khi pid là khách
       xa/bot nên bóng của họ đứng im mãi (bot chỉ trả setX, tick mới đẩy bóng). */
    const host = ui.net && ui.net.raw;
    for (const pid of actors(raw)) {
      if (host && typeof host.act === 'function') host.act(pid, { type: 'tick' });
      else ui.actAs(pid, { type: 'tick' });
    }
  }, TICK_MS);
}
function stopTick() { if (tickTimer) { clearInterval(tickTimer); tickTimer = null; } }

/* ---------- vẽ sân ---------- */
const cv = document.getElementById('bb-canvas');
const ctx = cv.getContext('2d');
const BRICK_COLORS = ['#FF9F43', '#FF6B6B', '#FFB9CF', '#FFE3A3', '#ABE0C6', '#AFD8F3'];
function drawBoard(c, view, x0, y0, scale, label) {
  c.save();
  c.translate(x0, y0);
  c.scale(scale, scale);
  /* nền sân */
  c.fillStyle = '#2B2440';
  c.fillRect(0, 0, W, H);
  /* gạch */
  const my = view.my;
  if (my && my.bricks) {
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        const hp = my.bricks[r][col];
        if (hp <= 0) continue;
        const rc = brickRect(col, r);
        c.fillStyle = hp === 2 ? '#C9BDF3' : BRICK_COLORS[r % BRICK_COLORS.length];
        c.fillRect(rc.x, rc.y, rc.w, rc.h);
        c.strokeStyle = '#4A3E5C';
        c.lineWidth = 1.5;
        c.strokeRect(rc.x + 0.75, rc.y + 0.75, rc.w - 1.5, rc.h - 1.5);
        if (hp === 2) {
          c.fillStyle = '#4A3E5C';
          c.font = 'bold 11px Nunito, sans-serif';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText('2', rc.x + rc.w / 2, rc.y + rc.h / 2 + 0.5);
        }
      }
    }
  }
  /* vợt */
  if (my) {
    c.fillStyle = '#FFE45C';
    c.strokeStyle = '#4A3E5C';
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(my.paddleX, PADDLE_Y, PADDLE_W, PADDLE_H, 6);
    c.fill(); c.stroke();
    /* bóng */
    if (my.ball) {
      c.fillStyle = '#FFFFFF';
      c.beginPath();
      c.arc(my.ball.x, my.ball.y, BALL_R, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#4A3E5C';
      c.lineWidth = 1.5;
      c.stroke();
    }
  }
  c.restore();
  if (label) {
    c.fillStyle = '#4A3E5C';
    c.font = 'bold 15px "Baloo 2", Nunito, sans-serif';
    c.textAlign = 'left';
    c.textBaseline = 'top';
    c.fillText(label, x0 + 4, y0 + 4);
  }
}

let lastRenderKey = '';
function render(v, prev) {
  cur = v;
  if (!v) {
    ctx.clearRect(0, 0, W, H);
    $('#bb-opps').innerHTML = '';
    $('#bb-score').textContent = '0';
    $('#bb-bricks').textContent = String(TOTAL_BRICKS);
    $('#bb-lives').textContent = String(LIVES);
    $('#bb-time').textContent = '—';
    $('#bb-mode').textContent = 'Chơi đơn';
    stopTick();
    return;
  }
  /* key render: đổi khi bất cứ thứ gì hiển thị đổi — tránh vẽ thiếu (lỗi stale) */
  const me = v.players.find(p => p.id === v.me);
  const my = v.my;
  const rk = `${v.gid}|${v.seq}|${v.phase}|${me ? me.score + '/' + me.bricksLeft + '/' + me.lives + '/' + me.status : ''}|${my ? my.paddleX.toFixed(1) + '|' + my.ball.x.toFixed(1) + ',' + my.ball.y.toFixed(1) + '|' + my.bricks.map(r => r.join('')).join('/') : ''}|${mode}|${paused ? 'P' : ''}`;
  if (rk === lastRenderKey && v.phase === 'playing') return;
  lastRenderKey = rk;
  startTick();

  /* âm thanh: phá gạch / mất mạng — theo dõi điểm và mạng của mình */
  if (me) {
    if (me.score > lastScore) Sfx.brick();
    if (me.lives < lastLives) Sfx.die();
    lastScore = me.score;
    lastLives = me.lives;
  }

  $('#bb-score').textContent = String(me ? me.score : 0);
  $('#bb-bricks').textContent = String(me ? me.bricksLeft : TOTAL_BRICKS);
  $('#bb-lives').textContent = String(me ? me.lives : LIVES);
  $('#bb-mode').textContent = v.solo ? 'Chơi đơn' : (mode === 'pvp' ? 'Chung máy' : 'Đua');
  const elapsed = v.startedAt ? Math.max(0, Date.now() - v.startedAt) : 0;
  if (v.race) {
    const remain = Math.max(0, RACE_TIME_MS - elapsed);
    const s = Math.ceil(remain / 1000);
    $('#bb-time').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  } else {
    const s = Math.floor(elapsed / 1000);
    $('#bb-time').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  $('#bb-time-chip').style.display = v.phase === 'ended' ? 'none' : '';

  /* vẽ sân */
  ctx.clearRect(0, 0, W, H);
  if (mode === 'pvp') {
    const raw = ui.net && ui.net.raw && ui.net.raw.state;
    if (raw) {
      const ids = raw.players.map(p => p.id);
      const v1 = viewFor(raw, ids[0]);
      const v2 = ids[1] ? viewFor(raw, ids[1]) : null;
      const sc = 0.5;
      const bh = H * sc;
      const y0 = (H - bh) / 2;
      drawBoard(ctx, v1, 0, y0, sc, raw.players[0].name + ' (P1: ◀ ▶)');
      if (v2) drawBoard(ctx, v2, W / 2, y0, sc, raw.players[1].name + ' (P2: A / D)');
      $('#bb-opps').innerHTML = '';
      return;
    }
  }
  drawBoard(ctx, v, 0, 0, 1, '');
  const opps = v.players.filter(p => p.id !== v.me);
  $('#bb-opps').innerHTML = opps.map(p => {
    return `<div class="bb-opp"><span>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}</span><b>⭐ ${p.score}đ</b><span>🧱 còn ${p.bricksLeft}</span><span>❤️ ${p.lives}</span><i>${p.status === 'playing' ? '▶ đang chơi' : p.status === 'dead' ? '💥 hết mạng' : p.status === 'resigned' ? '🏳️ xin thua' : '🏁 xong'}</i></div>`;
  }).join('');
}

/* ---------- kết thúc ---------- */
function showEnd(v) {
  stopTick();
  const me = v.me;
  const sum = (v.final && v.final.summary) || {};
  const won = (v.winnerIds || []).includes(me);
  let h;
  if (v.endReason === 'draw') h = '🤝 Trận hòa!';
  else if (v.endReason === 'resign') h = '🏳️ Trận đã kết thúc!';
  else if (won) h = '🏆 Bạn thắng!';
  else if (v.solo) h = '😢 Hết mạng rồi!';
  else h = `🏆 ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name || 'Máy'))} thắng!`;
  const rows = v.players.map(p => {
    const q = sum[p.id] || {};
    const isWin = (v.winnerIds || []).includes(p.id);
    const t = q.timeMs ? `${Math.floor(q.timeMs / 60000)}:${String(Math.floor(q.timeMs / 1000) % 60).padStart(2, '0')}` : '—';
    return `<div>${isWin ? '👑 ' : ''}${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''} — ${q.score || 0} điểm · 🧱 phá ${q.bricksCleared || 0}/${TOTAL_BRICKS} · ❤️ còn ${q.livesLeft || 0} · 💥 rơi ${q.ballsLost || 0} bóng · ⏱️ ${t}</div>`;
  }).join('');
  let reason = '';
  if (v.solo && won) reason = `Bạn phá hết ${TOTAL_BRICKS} gạch — thắng!`;
  else if (v.solo) reason = `Bạn phá được ${sum[me] ? sum[me].bricksCleared : 0}/${TOTAL_BRICKS} gạch thì hết mạng.`;
  else if (v.endReason === 'draw') reason = 'Không ai hơn ai — cùng điểm khi hết giờ hoặc cùng phá hết gạch.';
  else if (v.endReason === 'timeout') reason = 'Hết 180 giây — ai nhiều điểm nhất thì thắng.';
  else if (v.endReason === 'resign') reason = 'Có người xin thua — bị loại khỏi ván.';
  else reason = 'Đua phá gạch: ai phá hết trước thì thắng.';
  if (won) Sfx.win(); else Sfx.lose();
  ui.openModal(`<h2>${h}</h2><p>${reason}</p><div>${rows}</div><div class="btns"><button class="btn primary" id="m-again">🔄 Chơi lại</button><button class="btn" id="m-close">Đóng</button></div>`);
  const c = $('#m-close'); if (c) c.onclick = ui.closeModal;
  const a = $('#m-again'); if (a) a.onclick = () => { ui.closeModal(); location.reload(); };
}

/* ---------- tương tác: phím + chuột/chạm + nút cảm ứng ---------- */
function myAction(a, pid) {
  const id = pid || (cur && cur.me);
  const cp = controlPid(cur, id);
  if (!cp) return;
  send(cp, a);
}
document.addEventListener('keydown', e => {
  if (!cur || cur.phase !== 'playing') return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
  if ($('#modal') && $('#modal').classList.contains('open')) return;
  if (e.code === 'KeyP') {
    if (mode === 'solo') { paused = !paused; render(cur, cur); }
    return;
  }
  if (mode === 'pvp') {
    const raw = ui.net && ui.net.raw && ui.net.raw.state;
    if (!raw) return;
    const ids = raw.players.map(p => p.id);
    if (e.code === 'ArrowLeft') { myAction({ type: 'move', dx: -PADDLE_KEY_STEP }, ids[0]); e.preventDefault(); }
    else if (e.code === 'ArrowRight') { myAction({ type: 'move', dx: PADDLE_KEY_STEP }, ids[0]); e.preventDefault(); }
    else if (e.code === 'KeyA' && ids[1]) { myAction({ type: 'move', dx: -PADDLE_KEY_STEP }, ids[1]); e.preventDefault(); }
    else if (e.code === 'KeyD' && ids[1]) { myAction({ type: 'move', dx: PADDLE_KEY_STEP }, ids[1]); e.preventDefault(); }
    return;
  }
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') { myAction({ type: 'move', dx: -PADDLE_KEY_STEP }); e.preventDefault(); }
  else if (e.code === 'ArrowRight' || e.code === 'KeyD') { myAction({ type: 'move', dx: PADDLE_KEY_STEP }); e.preventDefault(); }
});

/* kéo chuột / chạm trên sân → đặt vợt theo vị trí con trỏ */
function canvasPos(e) {
  const r = cv.getBoundingClientRect();
  const x = (e.clientX - r.left) * (W / r.width);
  const y = (e.clientY - r.top) * (H / r.height);
  return { x, y };
}
let dragging = false;
function dragTo(e) {
  if (!cur || cur.phase !== 'playing') return;
  const { x, y } = canvasPos(e);
  if (mode === 'pvp') {
    const raw = ui.net && ui.net.raw && ui.net.raw.state;
    if (!raw) return;
    const ids = raw.players.map(p => p.id);
    const sc = 0.5, bh = H * sc, y0 = (H - bh) / 2;
    if (y < y0 || y > y0 + bh) return;
    if (x < W / 2) myAction({ type: 'setX', x: x / sc }, ids[0]);
    else if (ids[1]) myAction({ type: 'setX', x: (x - W / 2) / sc }, ids[1]);
    return;
  }
  myAction({ type: 'setX', x });
}
cv.addEventListener('pointerdown', e => { dragging = true; dragTo(e); e.preventDefault(); });
cv.addEventListener('pointermove', e => { if (dragging) dragTo(e); });
window.addEventListener('pointerup', () => { dragging = false; });
cv.addEventListener('pointercancel', () => { dragging = false; });

/* nút ◀ ▶ giữ để di chuyển liên tục (tiện trên điện thoại) */
function bindHold(id, dx) {
  const el = $(id);
  if (!el) return;
  let iv = null;
  const start = e => {
    e.preventDefault();
    myAction({ type: 'move', dx });
    if (iv) clearInterval(iv);
    iv = setInterval(() => myAction({ type: 'move', dx }), 50);
  };
  const stop = () => { if (iv) { clearInterval(iv); iv = null; } };
  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', stop);
  el.addEventListener('pointerleave', stop);
  el.addEventListener('pointercancel', stop);
}
bindHold('#bb-left', -PADDLE_KEY_STEP);
bindHold('#bb-right', PADDLE_KEY_STEP);

$('#btn-pause').onclick = () => {
  if (mode !== 'solo' || !cur || cur.phase !== 'playing') { tip('Tạm dừng chỉ dùng được ở chơi đơn.'); return; }
  paused = !paused;
  render(cur, cur);
};
$('#btn-resign').onclick = async () => {
  if (!cur || cur.phase !== 'playing') return;
  const r = await confirmBox('Xin thua là thua luôn ván này (đua thì các người còn lại chơi tiếp).', { title: '🏳️ Xin thua?', ok: 'Xin thua', danger: true });
  if (!r) return;
  if (mode === 'pvp' && pvpP2) {
    const p2 = await confirmBox('Chung máy 2 người: ai xin thua?', { title: '🏳️ Ai xin thua?', ok: 'Người 2', cancel: 'Người 1' });
    send(p2 ? pvpP2 : (cur.players[0] && cur.players[0].id), { type: 'resign' });
    return;
  }
  send(cur.me, { type: 'resign' });
};

/* ---------- hướng dẫn + âm thanh + rời ván ---------- */
async function openGuide() {
  ui.openModal(GUIDE_HTML);
  const c = $('#m-close');
  if (c) c.onclick = ui.closeModal;
}
$('#btn-guide').onclick = openGuide;
$('#btn-sound').onclick = () => {
  Sfx.setEnabled(!Sfx.isEnabled());
  $('#btn-sound').textContent = Sfx.isEnabled() ? '🔊' : '🔇';
};
if (!Sfx.isEnabled()) $('#btn-sound').textContent = '🔇';
