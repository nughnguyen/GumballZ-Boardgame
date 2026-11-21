// 🐍 Rắn Săn Mồi – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Tetris:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Bò: chỉ CHỦ PHÒNG chạy đồng hồ — mỗi 50ms kiểm tra từng người đang
// chơi, ai tới lượt bò (theo speedFor(foods) của người đó) thì gửi
// {type:'tick'} cho người đó. Khách online chỉ vẽ lại view nhận được.
// Chơi chung máy (pvp): host có state thô nên vẽ cả 2 bảng bằng
// viewFor(raw, pid) — giống pattern chuyền tay của Tetris.
import { createGame, applyAction, viewFor, serialize, deserialize, actors, speedFor, GRID_W, GRID_H, SOLO_WIN_LEN, RACE_WIN_LEN } from './engine.js?v=1';
import { botAction, botDelay, BOT_NAMES } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import { Sfx } from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=51';
import { gameKit, $, esc, cleanName, avatar } from '../../shared/ui/gamekit.js?v=13';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'ransanmoi', min: 1, max: 4, maxSeats: 4, allowLocal: true,
  minMsg: 'Rắn Săn Mồi đua cần 2–4 người: đấu máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: (k, v) => (k === 'botLevel' && (v === 'easy' || v === 'hard')) || (k === 'rsMode' && (v === 'solo' || v === 'race')),
  create: createGame, apply: applyAction, view: viewFor, serialize, deserialize, actors, bot: botAction,
  /* máy đi sau 600–900ms (Dễ) / 200–350ms (Khó) mỗi nước — botDelay ở bot.js */
  botDelay: (s, pid) => botDelay(s, pid),
  botNames: BOT_NAMES,
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'solo'; /* solo | race | pvp | online */
let botLevel = 'hard';
let p2name = 'Bạn 2';
try {
  const l = localStorage.getItem('gumballz-ransanmoi-level');
  if (l === 'easy' || l === 'hard') botLevel = l;
  const n = localStorage.getItem('gumballz-ransanmoi-p2');
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
  botLevel = $('#sel-solo-level').value === 'easy' ? 'easy' : 'hard';
  try { localStorage.setItem('gumballz-ransanmoi-level', botLevel); } catch (e) {}
  mode = 'solo'; ui.startHost(true);
};
$('#btn-vs-bot').onclick = () => toggleBox('bot-row');
$('#btn-online').onclick = () => { mode = 'online'; toggleBox('room-box'); };
$('#btn-local').onclick = () => toggleBox('local-row');
$('#btn-start-bot').onclick = () => {
  botLevel = $('#sel-level').value === 'easy' ? 'easy' : 'hard';
  try { localStorage.setItem('gumballz-ransanmoi-level', botLevel); } catch (e) {}
  mode = 'race'; ui.startHost(true);
};
$('#btn-start-local').onclick = () => {
  p2name = ($('#inp-p2name').value || 'Bạn 2').trim().slice(0, 16) || 'Bạn 2';
  try { localStorage.setItem('gumballz-ransanmoi-p2', p2name); } catch (e) {}
  mode = 'pvp'; ui.startHost(true);
};

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
    const hard = await confirmBox('Máy Khó tìm đường tới mồi và đi nhanh (200–350ms/nước); máy Dễ chậm hơn và 30% đi ngẫu nhiên.', { title: '🤖 Thêm máy', ok: 'Máy Khó', cancel: 'Máy Dễ' });
    h.addBot({ level: hard ? 'hard' : 'easy' });
  } else if (b.id === 'btn-addlocal') {
    const nm = await promptBox('Người chơi cùng máy (chung bàn phím).', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (nm) h.addLocal(nm);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
let paused = false;
let pvpP2 = null; /* id người chơi 2 ở chế độ chung máy */
let lastFoods = 0;
let lastStatus = '';
const lastTick = {}; /* pid -> ms lần bò cuối (chỉ chủ phòng dùng) */

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
  game: 'ransanmoi', net: NET,
  offline: h => {
    if (mode === 'solo') {
      h.setOpt('rsMode', 'solo');
    } else if (mode === 'race') {
      h.setOpt('rsMode', 'race');
      h.setOpt('botLevel', botLevel);
      h.addBot({ level: botLevel });
    } else if (mode === 'pvp') {
      h.setOpt('rsMode', 'race');
      if (h.players.length < 2) h.addLocal(p2name);
    }
    /* online: mặc định race, không cần setOpt */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => {
    if (!v) { cur = null; endShownFor = ''; paused = false; pvpP2 = null; lastFoods = 0; lastStatus = ''; render(null, null); return; }
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

/* ---------- đồng hồ bò (chỉ chủ phòng chạy) ---------- */
let tickTimer = null;
function startTick() {
  if (tickTimer) return;
  tickTimer = setInterval(() => {
    if (!ui.isHost || !cur || cur.phase !== 'playing' || paused) return;
    const raw = ui.net && ui.net.raw && ui.net.raw.state;
    if (!raw) return;
    const now = Date.now();
    for (const p of raw.players) {
      const pr = raw.prog[p.id];
      if (!pr || pr.status !== 'playing' || !pr.snake || !pr.snake.length) continue;
      if (now - (lastTick[p.id] || 0) >= speedFor(pr.foods || 0)) {
        lastTick[p.id] = now;
        ui.actAs(p.id, { type: 'tick' });
      }
    }
  }, 50);
}
function stopTick() { if (tickTimer) { clearInterval(tickTimer); tickTimer = null; } }

/* ---------- vẽ bảng ---------- */
function boardHTML(view, label, mainBoard) {
  const me = view.players.find(p => p.id === view.me);
  const grid = [];
  for (let y = 0; y < GRID_H; y++) grid.push(Array(GRID_W).fill(0));
  const my = view.my;
  if (my && my.food) grid[my.food.y][my.food.x] = 3;
  if (my && my.snake) {
    my.snake.forEach((c, i) => { if (c.y >= 0 && c.y < GRID_H && c.x >= 0 && c.x < GRID_W) grid[c.y][c.x] = i === 0 ? 1 : 2; });
  }
  let html = '';
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const v = grid[y][x];
      html += `<div class="${v === 1 ? 'cell head' : v === 2 ? 'cell body' : v === 3 ? 'cell food' : 'cell'}"></div>`;
    }
  }
  return `<div class="rs-board">
    <div class="rs-board-head"><b>${esc(label)}</b><span class="rs-score">⭐ <span class="rs-score-num">${me ? me.score : 0}</span>đ</span></div>
    <div class="rs-grid"${mainBoard ? ' id="rs-board"' : ''}>${html}</div>
    <div class="rs-board-foot"><span class="rs-length">🐍 Dài <b>${me ? me.length : 0}</b></span><span class="rs-foods">🍎 <b>${me ? me.foods : 0}</b> mồi</span></div>
  </div>`;
}

let lastRenderKey = '';
function render(v, prev) {
  cur = v;
  if (!v) {
    $('#rs-board').innerHTML = '';
    $('#rs-opps').innerHTML = '';
    $('#rs-score').textContent = '0';
    $('#rs-length').textContent = '4';
    $('#rs-foods').textContent = '0';
    $('#rs-status').textContent = '';
    stopTick();
    return;
  }
  /* key render: đổi khi bất cứ thứ gì hiển thị đổi — tránh vẽ thiếu (lỗi stale) */
  const me = v.players.find(p => p.id === v.me);
  const rk = `${v.gid}|${v.seq}|${v.phase}|${me ? me.score + '/' + me.length + '/' + me.foods + '/' + me.status : ''}|${v.my ? v.my.snake.map(c => c.x + ',' + c.y).join(';') + '|' + (v.my.food ? v.my.food.x + ',' + v.my.food.y : '-') + '|' + v.my.dir : ''}|${mode}|${paused ? 'P' : ''}`;
  if (rk === lastRenderKey && v.phase === 'playing') return;
  lastRenderKey = rk;
  startTick();

  /* âm thanh ăn mồi / chết — theo dõi số mồi và trạng thái của mình */
  if (me) {
    if (me.foods > lastFoods) Sfx.eat();
    if (me.status === 'dead' && lastStatus !== 'dead') Sfx.die();
    lastFoods = me.foods;
    lastStatus = me.status;
  }

  $('#rs-score').textContent = String(me ? me.score : 0);
  $('#rs-length').textContent = String(me ? me.length : 0);
  $('#rs-foods').textContent = String(me ? me.foods : 0);
  $('#rs-status').textContent = paused ? '⏸ Tạm dừng (P để tiếp tục)' : (v.solo ? `Mục tiêu: dài ${SOLO_WIN_LEN} (còn ${Math.max(0, SOLO_WIN_LEN - (me ? me.length : 0))})` : `Đua dài ${RACE_WIN_LEN} — ai đủ trước thì thắng`);

  const boardsEl = $('#rs-boards');
  if (mode === 'pvp') {
    const raw = ui.net && ui.net.raw && ui.net.raw.state;
    if (raw) {
      const ids = raw.players.map(p => p.id);
      const v1 = viewFor(raw, ids[0]);
      const v2 = ids[1] ? viewFor(raw, ids[1]) : null;
      boardsEl.innerHTML = boardHTML(v1, raw.players[0].name + ' (P1: phím mũi tên)', true) +
        (v2 ? boardHTML(v2, raw.players[1].name + ' (P2: W A S D)', false) : '');
      $('#rs-opps').innerHTML = '';
      return;
    }
  }
  boardsEl.innerHTML = boardHTML(v, me ? cleanName(me.name) : '', true);
  const opps = v.players.filter(p => p.id !== v.me);
  $('#rs-opps').innerHTML = opps.map(p => {
    return `<div class="rs-opp"><span>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}</span><b>🐍 dài ${p.length}/${v.race ? RACE_WIN_LEN : SOLO_WIN_LEN}</b><span>${p.score}đ · 🍎 ${p.foods} mồi</span><i>${p.status === 'playing' ? '▶ đang chơi' : p.status === 'dead' ? '💥 chết' : p.status === 'resigned' ? '🏳️ xin thua' : '🏁 xong'}</i></div>`;
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
  else if (v.solo) h = '🐍 Rắn chết rồi!';
  else h = `🏆 ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name || 'Máy'))} thắng!`;
  const rows = v.players.map(p => {
    const q = sum[p.id] || {};
    const isWin = (v.winnerIds || []).includes(p.id);
    return `<div>${isWin ? '👑 ' : ''}${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''} — ${q.score || 0} điểm · dài ${q.length || 0} · 🍎 ${q.foods || 0} mồi · dài nhất ${q.maxLength || 0}</div>`;
  }).join('');
  let reason = '';
  if (v.solo && won) reason = `Bạn ăn tới khi rắn dài ${SOLO_WIN_LEN} — thắng!`;
  else if (v.solo) reason = `Rắn của bạn dài ${sum[me] ? sum[me].length : 0}/${SOLO_WIN_LEN} thì chết.`;
  else if (v.endReason === 'draw') reason = 'Không ai hơn ai — cùng độ dài, cùng điểm.';
  else if (v.endReason === 'resign') reason = 'Có người xin thua — bị loại khỏi ván.';
  else reason = `Đua dài ${RACE_WIN_LEN}: ai dài ${RACE_WIN_LEN} trước thì thắng.`;
  if (won) Sfx.win(); else Sfx.lose();
  ui.openModal(`<h2>${h}</h2><p>${reason}</p><div>${rows}</div><div class="btns"><button class="btn primary" id="m-again">🔄 Chơi lại</button><button class="btn" id="m-close">Đóng</button></div>`);
  const c = $('#m-close'); if (c) c.onclick = ui.closeModal;
  const a = $('#m-again'); if (a) a.onclick = () => { ui.closeModal(); location.reload(); };
}

/* ---------- tương tác: phím + nút cảm ứng ---------- */
function myAction(a, pid) {
  const id = pid || (cur && cur.me);
  const cp = controlPid(cur, id);
  if (!cp) return;
  send(cp, a);
  if (a.type === 'move') Sfx.move();
}
const DIR_KEY = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};
document.addEventListener('keydown', e => {
  if (!cur || cur.phase !== 'playing') return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
  if ($('#modal') && $('#modal').classList.contains('open')) return;
  if (mode === 'pvp') {
    const raw = ui.net && ui.net.raw && ui.net.raw.state;
    if (!raw) return;
    const ids = raw.players.map(p => p.id);
    const p1 = ids[0], p2 = ids[1];
    const dir = DIR_KEY[e.code];
    if (!dir) return;
    if (e.code.startsWith('Arrow')) { myAction({ type: 'move', dir }, p1); e.preventDefault(); }
    else if (p2) { myAction({ type: 'move', dir }, p2); e.preventDefault(); }
    return;
  }
  if (e.code === 'KeyP') {
    if (mode === 'solo') { paused = !paused; render(cur, cur); }
    return;
  }
  const dir = DIR_KEY[e.code];
  if (dir) { myAction({ type: 'move', dir }); e.preventDefault(); }
});
function bindTouch(id, dir) {
  const el = $(id);
  if (!el) return;
  el.addEventListener('click', () => myAction({ type: 'move', dir }));
}
bindTouch('#btn-up', 'up');
bindTouch('#btn-down', 'down');
bindTouch('#btn-left', 'left');
bindTouch('#btn-right', 'right');
$('#btn-pause').onclick = () => {
  if (mode !== 'solo' || !cur || cur.phase !== 'playing') { tip('Tạm dừng chỉ dùng được ở chơi đơn.'); return; }
  paused = !paused;
  render(cur, cur);
};
$('#btn-resign').onclick = async () => {
  if (!cur || cur.phase !== 'playing') return;
  const r = await confirmBox('Xin thua là thua luôn ván này (đua thì các người còn lại chơi tiếp).', { title: '🏳️ Xin thua?', ok: 'Xin thua', danger: true });
  if (!r) return;
  const pid = cur.me;
  if (mode === 'pvp' && pvpP2) {
    // chung máy: hỏi xin thua cho ai — mặc định người 1 (chủ phòng)
    const p2 = await confirmBox('Chung máy 2 người: ai xin thua?', { title: '🏳️ Ai xin thua?', ok: 'Người 2', cancel: 'Người 1' });
    send(p2 ? pvpP2 : (cur.players[0] && cur.players[0].id), { type: 'resign' });
    return;
  }
  send(pid, { type: 'resign' });
};

/* ---------- hướng dẫn + âm thanh + rời ván ---------- */
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
