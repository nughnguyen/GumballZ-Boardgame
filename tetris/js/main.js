// 🧱 Tetris – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Vẽ Truyền Tin:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Rơi: chỉ CHỦ PHÒNG chạy đồng hồ — mỗi 50ms kiểm tra từng người đang
// chơi, ai tới lượt rơi (theo speedFor(level) của người đó) thì gửi
// {type:'tick'} cho người đó. Khách online chỉ vẽ lại view nhận được.
// Chơi chung máy (pvp): host có state thô nên vẽ cả 2 giếng bằng
// viewFor(raw, pid) — giống pattern chuyền tay của Vẽ Truyền Tin.
import { createGame, applyAction, viewFor, serialize, deserialize, actors, speedFor, W, H } from './engine.js?v=1';
import { botAction, botDelay, BOT_NAMES } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import { COLOR_HEX } from './pieces.js?v=1';
import { Sfx } from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, cleanName, avatar } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=9';

const NET = makeNet({
  game: 'tetris', min: 1, max: 4, maxSeats: 4, allowLocal: true,
  minMsg: 'Tetris đua cần 2–4 người: đấu máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: (k, v) => (k === 'botLevel' && (v === 'easy' || v === 'hard')) || (k === 'ttMode' && (v === 'solo' || v === 'race')),
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
  const l = localStorage.getItem('gumballz-tetris-level');
  if (l === 'easy' || l === 'hard') botLevel = l;
  const n = localStorage.getItem('gumballz-tetris-p2');
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
  try { localStorage.setItem('gumballz-tetris-level', botLevel); } catch (e) {}
  mode = 'solo'; ui.startHost(true);
};
$('#btn-vs-bot').onclick = () => toggleBox('bot-row');
$('#btn-online').onclick = () => { mode = 'online'; toggleBox('room-box'); };
$('#btn-local').onclick = () => toggleBox('local-row');
$('#btn-start-bot').onclick = () => {
  botLevel = $('#sel-level').value === 'easy' ? 'easy' : 'hard';
  try { localStorage.setItem('gumballz-tetris-level', botLevel); } catch (e) {}
  mode = 'race'; ui.startHost(true);
};
$('#btn-start-local').onclick = () => {
  p2name = ($('#inp-p2name').value || 'Bạn 2').trim().slice(0, 16) || 'Bạn 2';
  try { localStorage.setItem('gumballz-tetris-p2', p2name); } catch (e) {}
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
    const hard = await confirmBox('Máy Khó đi nhanh (150–300ms/nước) và luôn đặt tốt nhất; máy Dễ chậm hơn và hay đặt bừa.', { title: '🤖 Thêm máy', ok: 'Máy Khó', cancel: 'Máy Dễ' });
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
const lastFall = {}; /* pid -> ms lần rơi cuối (chỉ chủ phòng dùng) */
const lastPieces = {}; /* pid -> piecesPlaced đã thấy (đổi khối thì rơi lại từ đầu) */

function myPid(v) {
  if (!v) return null;
  return v.me;
}
/* người đang phải hành động mà mình điều khiển được (null nếu không phải lượt mình) */
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
  game: 'tetris', net: NET,
  offline: h => {
    if (mode === 'solo') {
      h.setOpt('ttMode', 'solo');
    } else if (mode === 'race') {
      h.setOpt('ttMode', 'race');
      h.setOpt('botLevel', botLevel);
      h.addBot({ level: botLevel });
    } else if (mode === 'pvp') {
      h.setOpt('ttMode', 'race');
      if (h.players.length < 2) h.addLocal(p2name);
    }
    /* online: mặc định race, không cần setOpt */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => {
    if (!v) { cur = null; endShownFor = ''; paused = false; pvpP2 = null; render(null, null); return; }
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
  if (r) { stopGravity(); ui.leave(); setTimeout(() => { location.href = '../'; }, 250); }
};

/* ---------- đồng hồ rơi (chỉ chủ phòng chạy) ---------- */
let gravTimer = null;
function startGravity() {
  if (gravTimer) return;
  gravTimer = setInterval(() => {
    if (!ui.isHost || !cur || cur.phase !== 'playing' || paused) return;
    const raw = ui.net && ui.net.raw && ui.net.raw.state;
    if (!raw) return;
    const now = Date.now();
    for (const p of raw.players) {
      const pr = raw.prog[p.id];
      if (!pr || pr.status !== 'playing' || !pr.cur) continue;
      if (lastPieces[p.id] !== pr.piecesPlaced) { lastPieces[p.id] = pr.piecesPlaced; lastFall[p.id] = now; continue; }
      if (now - (lastFall[p.id] || 0) >= speedFor(pr.level)) {
        lastFall[p.id] = now;
        ui.actAs(p.id, { type: 'tick' });
      }
    }
  }, 50);
}
function stopGravity() { if (gravTimer) { clearInterval(gravTimer); gravTimer = null; } }

/* ---------- vẽ giếng ---------- */
function wellHTML(view) {
  if (!view || !view.my) return '<div class="tt-well-empty">—</div>';
  const grid = view.my.grid.map(r => r.slice());
  const cur = view.my.cur;
  const gy = view.my.ghostY;
  // bóng ma
  if (cur && gy > cur.y) {
    for (const [cx, cy] of pieceCells(cur.type, cur.rot)) {
      const gx = cur.x + cx, gyy = gy + cy;
      if (gyy >= 0 && gyy < H && gx >= 0 && gx < W && !grid[gyy][gx]) grid[gyy][gx] = -1;
    }
  }
  // khối đang rơi
  if (cur) {
    for (const [cx, cy] of pieceCells(cur.type, cur.rot)) {
      const gx = cur.x + cx, gyy = cur.y + cy;
      if (gyy >= 0 && gyy < H && gx >= 0 && gx < W) grid[gyy][gx] = colorOf(cur.type);
    }
  }
  let html = '';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = grid[y][x];
      html += `<div class="${v === -1 ? 'cell ghost' : v ? 'cell c' + v : 'cell'}"></div>`;
    }
  }
  return html;
}
function pieceCells(type, rot) {
  // đọc từ pieces.js qua view? — dùng bảng cục bộ đồng bộ với pieces.js
  return SHAPES[type][((rot % 4) + 4) % 4];
}
const SHAPES = {
  I: [[[0, 1], [1, 1], [2, 1], [3, 1]], [[2, 0], [2, 1], [2, 2], [2, 3]], [[0, 2], [1, 2], [2, 2], [3, 2]], [[1, 0], [1, 1], [1, 2], [1, 3]]],
  O: [[[1, 0], [2, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [2, 1]]],
  T: [[[1, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [2, 1], [1, 2]], [[0, 1], [1, 1], [2, 1], [1, 2]], [[1, 0], [0, 1], [1, 1], [1, 2]]],
  S: [[[1, 0], [2, 0], [0, 1], [1, 1]], [[1, 0], [1, 1], [2, 1], [2, 2]], [[1, 0], [2, 0], [0, 1], [1, 1]], [[1, 0], [1, 1], [2, 1], [2, 2]]],
  Z: [[[0, 0], [1, 0], [1, 1], [2, 1]], [[2, 0], [1, 1], [2, 1], [1, 2]], [[0, 0], [1, 0], [1, 1], [2, 1]], [[2, 0], [1, 1], [2, 1], [1, 2]]],
  J: [[[0, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [1, 2]], [[0, 1], [1, 1], [2, 1], [2, 2]], [[1, 0], [1, 1], [0, 2], [1, 2]]],
  L: [[[2, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [1, 2], [2, 2]], [[0, 1], [1, 1], [2, 1], [0, 2]], [[0, 0], [1, 0], [1, 1], [1, 2]]],
};
function colorOf(type) { return { I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7 }[type] || 1; }
function miniHTML(type) {
  if (!type) return '<div class="tt-mini-empty">—</div>';
  const cells = SHAPES[type][0];
  let html = '<div class="tt-mini-grid">';
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 4; x++) {
      const on = cells.some(([cx, cy]) => cx === x && cy === y);
      html += `<div class="${on ? 'cell c' + colorOf(type) : 'cell'}"></div>`;
    }
  }
  return html + '</div>';
}
function nextHTML(next) {
  return (next || []).map(t => `<div class="tt-next-item">${miniHTML(t)}</div>`).join('');
}

let lastRenderKey = '';
function render(v, prev) {
  cur = v;
  if (!v) {
    $('#tt-well').innerHTML = '';
    $('#tt-hold').innerHTML = '';
    $('#tt-next').innerHTML = '';
    $('#tt-opps').innerHTML = '';
    $('#tt-score').textContent = '0';
    $('#tt-lines').textContent = '0';
    $('#tt-level').textContent = '1';
    $('#tt-status').textContent = '';
    stopGravity();
    return;
  }
  /* key render: đổi khi bất cứ thứ gì hiển thị đổi — tránh vẽ thiếu (lỗi stale) */
  const me = v.players.find(p => p.id === v.me);
  const rk = `${v.gid}|${v.seq}|${v.phase}|${me ? me.score + '/' + me.lines + '/' + me.lvl + '/' + me.status : ''}|${v.my ? (v.my.cur ? v.my.cur.type + v.my.cur.rot + v.my.cur.x + v.my.cur.y : 'x') + '|' + v.my.next.join('') + '|' + (v.my.hold || '-') : ''}|${mode}|${paused ? 'P' : ''}`;
  if (rk === lastRenderKey && v.phase === 'playing') return;
  lastRenderKey = rk;
  startGravity();
  if (v.phase === 'playing' && !paused) startGravity();

  $('#tt-score').textContent = String(me ? me.score : 0);
  $('#tt-lines').textContent = String(me ? me.lines : 0);
  $('#tt-level').textContent = String(me ? me.lvl : 1);
  $('#tt-status').textContent = paused ? '⏸ Tạm dừng (P để tiếp tục)' : (v.solo ? `Mục tiêu: 100 hàng (còn ${Math.max(0, 100 - (me ? me.lines : 0))})` : `Đua 40 hàng — ai đủ trước thì thắng`);

  const boardsEl = $('#tt-boards');
  if (mode === 'pvp') {
    const raw = ui.net && ui.net.raw && ui.net.raw.state;
    if (raw) {
      const ids = raw.players.map(p => p.id);
      const v1 = viewFor(raw, ids[0]);
      const v2 = ids[1] ? viewFor(raw, ids[1]) : null;
      boardsEl.innerHTML = boardHTML(v1, raw.players[0].name + ' (P1: ←→↓↑, Enter, Shift)', true) +
        (v2 ? boardHTML(v2, raw.players[1].name + ' (P2: A D S W, Space, Q)', false) : '');
      $('#tt-hold').innerHTML = miniHTML(v1.my ? v1.my.hold : null);
      $('#tt-next').innerHTML = nextHTML(v1.my ? v1.my.next : []);
      $('#tt-opps').innerHTML = '';
      return;
    }
  }
  boardsEl.innerHTML = boardHTML(v, me ? cleanName(me.name) : '', true);
  $('#tt-hold').innerHTML = miniHTML(v.my ? v.my.hold : null);
  $('#tt-next').innerHTML = nextHTML(v.my ? v.my.next : []);
  const opps = v.players.filter(p => p.id !== v.me);
  $('#tt-opps').innerHTML = opps.map(p => {
    const target = v.race ? 40 : 100;
    return `<div class="tt-opp"><span>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}</span><b>${p.lines}/${target} hàng</b><span>${p.score}đ · lv${p.lvl}</span><i>${p.status === 'playing' ? '▶ đang chơi' : p.status === 'lost' ? '💥 chạm nóc' : p.status === 'resigned' ? '🏳️ xin thua' : '🏁 xong'}</i></div>`;
  }).join('');
}
function boardHTML(v, label, mainBoard) {
  const me = v.players.find(p => p.id === v.me);
  return `<div class="tt-board">
    <div class="tt-board-head"><b>${esc(label)}</b><span class="tt-score">⭐ <span class="tt-score-num">${me ? me.score : 0}</span>đ</span></div>
    <div class="tt-well"${mainBoard ? ' id="tt-well"' : ''}>${wellHTML(v)}</div>
    <div class="tt-board-foot"><span class="tt-lines">🧱 <b>${me ? me.lines : 0}</b> hàng</span><span class="tt-level">🎚️ Lv<b>${me ? me.lvl : 1}</b></span></div>
  </div>`;
}

/* ---------- kết thúc ---------- */
function showEnd(v) {
  stopGravity();
  const me = v.me;
  const sum = (v.final && v.final.summary) || {};
  const won = (v.winnerIds || []).includes(me);
  let h;
  if (v.endReason === 'draw') h = '🤝 Trận hòa!';
  else if (v.endReason === 'resign') h = '🏳️ Trận đã kết thúc!';
  else if (won) h = '🏆 Bạn thắng!';
  else if (v.solo) h = '😢 Chạm nóc rồi!';
  else h = `🏆 ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name || 'Máy'))} thắng!`;
  const rows = v.players.map(p => {
    const q = sum[p.id] || {};
    const isWin = (v.winnerIds || []).includes(p.id);
    return `<div>${isWin ? '👑 ' : ''}${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''} — ${q.score || 0} điểm · ${q.lines || 0} hàng · Lv${q.level || 1} · Tetris ${q.tetrisCount || 0} lần · combo cao nhất ${q.maxCombo || 0}</div>`;
  }).join('');
  let reason = '';
  if (v.solo && won) reason = `Bạn xoá đủ 100 hàng — lên level 10, thắng!`;
  else if (v.solo) reason = `Bạn xoá được ${sum[me] ? sum[me].lines : 0}/100 hàng thì chạm nóc.`;
  else if (v.endReason === 'draw') reason = 'Không ai hơn ai — cùng điểm, cùng chạm nóc.';
  else if (v.endReason === 'resign') reason = 'Có người xin thua — bị loại khỏi ván.';
  else reason = 'Đua 40 hàng: ai xoá đủ 40 hàng trước thì thắng.';
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
  if (a.type === 'rotate') Sfx.rotate();
  else if (a.type === 'hard') Sfx.lock();
  else if (a.type === 'hold') Sfx.hold();
  else if (a.type === 'move') Sfx.move();
}
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
    switch (e.code) {
      case 'ArrowLeft': myAction({ type: 'move', dx: -1 }, p1); e.preventDefault(); break;
      case 'ArrowRight': myAction({ type: 'move', dx: 1 }, p1); e.preventDefault(); break;
      case 'ArrowDown': myAction({ type: 'soft' }, p1); e.preventDefault(); break;
      case 'ArrowUp': myAction({ type: 'rotate', dir: 1 }, p1); e.preventDefault(); break;
      case 'Enter': myAction({ type: 'hard' }, p1); e.preventDefault(); break;
      case 'ShiftRight': myAction({ type: 'hold' }, p1); e.preventDefault(); break;
      case 'KeyA': if (p2) { myAction({ type: 'move', dx: -1 }, p2); e.preventDefault(); } break;
      case 'KeyD': if (p2) { myAction({ type: 'move', dx: 1 }, p2); e.preventDefault(); } break;
      case 'KeyS': if (p2) { myAction({ type: 'soft' }, p2); e.preventDefault(); } break;
      case 'KeyW': if (p2) { myAction({ type: 'rotate', dir: 1 }, p2); e.preventDefault(); } break;
      case 'Space': if (p2) { myAction({ type: 'hard' }, p2); e.preventDefault(); } break;
      case 'KeyQ': if (p2) { myAction({ type: 'hold' }, p2); e.preventDefault(); } break;
    }
    return;
  }
  switch (e.code) {
    case 'ArrowLeft': myAction({ type: 'move', dx: -1 }); e.preventDefault(); break;
    case 'ArrowRight': myAction({ type: 'move', dx: 1 }); e.preventDefault(); break;
    case 'ArrowDown': myAction({ type: 'soft' }); e.preventDefault(); break;
    case 'ArrowUp': case 'KeyX': myAction({ type: 'rotate', dir: 1 }); e.preventDefault(); break;
    case 'KeyZ': myAction({ type: 'rotate', dir: -1 }); e.preventDefault(); break;
    case 'Space': myAction({ type: 'hard' }); e.preventDefault(); break;
    case 'KeyC': myAction({ type: 'hold' }); break;
    case 'KeyP':
      if (mode === 'solo') { paused = !paused; render(cur, cur); }
      break;
  }
});
function bindTouch(id, a) {
  const el = $(id);
  if (!el) return;
  el.addEventListener('click', () => myAction(a));
}
bindTouch('#btn-left', { type: 'move', dx: -1 });
bindTouch('#btn-right', { type: 'move', dx: 1 });
bindTouch('#btn-down', { type: 'soft' });
bindTouch('#btn-rotate', { type: 'rotate', dir: 1 });
bindTouch('#btn-drop', { type: 'hard' });
bindTouch('#btn-hold', { type: 'hold' });
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
