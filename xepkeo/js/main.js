// 🍬 Xếp Kẹo – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Rắn Săn Mồi:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Không có đồng hồ — mỗi nước là 1 lần đổi kẹo do người/bot gửi;
// bot do simplenet tự lên lịch (botDelay ở bot.js).
import { createGame, applyAction, viewFor, serialize, deserialize, actors, isLegalSwap, GRID_W, GRID_H, MOVES, TARGET_SCORE } from './engine.js?v=1';
import { botAction, botDelay, BOT_NAMES } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import { Sfx } from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, cleanName, avatar } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, confirmBox } from '../../shared/ui/dialog.js?v=9';

const CANDY = ['🍓', '🍋', '🍏', '🫐', '🍇'];

const NET = makeNet({
  game: 'xepkeo', min: 1, max: 4, maxSeats: 4, allowLocal: true,
  minMsg: 'Xếp Kẹo đua cần 2–4 người: đấu máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: (k, v) => (k === 'botLevel' && (v === 'easy' || v === 'hard')) || (k === 'xcMode' && (v === 'solo' || v === 'race')),
  create: createGame, apply: applyAction, view: viewFor, serialize, deserialize, actors, bot: botAction,
  /* máy đi sau 500–800ms (Dễ) / 200–400ms (Khó) mỗi nước — botDelay ở bot.js */
  botDelay: (s, pid) => botDelay(s, pid),
  botNames: BOT_NAMES,
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'solo'; /* solo | race | pvp | online */
let botLevel = 'hard';
let p2name = 'Bạn 2';
try {
  const l = localStorage.getItem('gumballz-xepkeo-level');
  if (l === 'easy' || l === 'hard') botLevel = l;
  const n = localStorage.getItem('gumballz-xepkeo-p2');
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
  try { localStorage.setItem('gumballz-xepkeo-level', botLevel); } catch (e) {}
  mode = 'solo'; ui.startHost(true);
};
$('#btn-vs-bot').onclick = () => toggleBox('bot-row');
$('#btn-online').onclick = () => { mode = 'online'; toggleBox('room-box'); };
$('#btn-local').onclick = () => toggleBox('local-row');
$('#btn-start-bot').onclick = () => {
  botLevel = $('#sel-level').value === 'easy' ? 'easy' : 'hard';
  try { localStorage.setItem('gumballz-xepkeo-level', botLevel); } catch (e) {}
  mode = 'race'; ui.startHost(true);
};
$('#btn-start-local').onclick = () => {
  p2name = ($('#inp-p2name').value || 'Bạn 2').trim().slice(0, 16) || 'Bạn 2';
  try { localStorage.setItem('gumballz-xepkeo-p2', p2name); } catch (e) {}
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
    const hard = await confirmBox('Máy Khó thử mọi nước đổi, tính cả dây chuyền rồi chọn nước nhiều điểm nhất (200–400ms/nước); máy Dễ hay đi bừa hơn (500–800ms/nước).', { title: '🤖 Thêm máy', ok: 'Máy Khó', cancel: 'Máy Dễ' });
    h.addBot({ level: hard ? 'hard' : 'easy' });
  } else if (b.id === 'btn-addlocal') {
    const nm = await promptBox('Người chơi cùng máy (chung màn hình, mỗi người 1 bảng riêng).', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (nm) h.addLocal(nm);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
let pvpP2 = null; /* id người chơi 2 ở chế độ chung máy */
let sel = null; /* {x, y, pid} — ô kẹo đang chọn */
let prevScore = 0;

function controlPid(v, pid) {
  if (!v || v.phase !== 'playing' || !pid) return null;
  const p = v.players.find(x => x.id === pid);
  return p && p.status === 'playing' && ui.controls(pid) ? pid : null;
}

const ui = gameKit({
  game: 'xepkeo', net: NET,
  offline: h => {
    if (mode === 'solo') {
      h.setOpt('xcMode', 'solo');
    } else if (mode === 'race') {
      h.setOpt('xcMode', 'race');
      h.setOpt('botLevel', botLevel);
      h.addBot({ level: botLevel });
    } else if (mode === 'pvp') {
      h.setOpt('xcMode', 'race');
      if (h.players.length < 2) h.addLocal(p2name);
    }
    /* online: mặc định race, không cần setOpt */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => {
    if (!v) { cur = null; endShownFor = ''; pvpP2 = null; sel = null; prevScore = 0; render(null, null); return; }
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

/* ---------- vẽ bảng ---------- */
function boardHTML(view, label, pid) {
  const me = view.players.find(p => p.id === view.me);
  const my = view.my;
  let cells = '';
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const t = my && my.grid ? my.grid[y][x] : 0;
      cells += `<div class="cell t${t}" data-x="${x}" data-y="${y}">${CANDY[t] || '🍬'}</div>`;
    }
  }
  return `<div class="xc-board" data-pid="${pid}">
    <div class="xc-board-head"><b>${esc(label)}</b><span>⭐ <b>${me ? me.score : 0}</b>đ</span></div>
    <div class="xc-grid">${cells}</div>
    <div class="xc-board-foot"><span>🎯 Còn <b>${my ? my.movesLeft : MOVES}</b> lượt</span><span>💥 Nước lớn nhất <b>${my ? (my.bestMoveScore || 0) : 0}</b></span></div>
  </div>`;
}

let lastRenderKey = '';
function render(v, prev) {
  cur = v;
  if (!v) {
    $('#xc-boards').innerHTML = '';
    $('#xc-opps').innerHTML = '';
    $('#xc-score').textContent = '0';
    $('#xc-moves').textContent = String(MOVES);
    $('#xc-best').textContent = '0';
    $('#xc-status').textContent = '';
    $('#xc-log').innerHTML = '';
    return;
  }
  /* key render: đổi khi bất cứ thứ gì hiển thị đổi — tránh vẽ thiếu (lỗi stale) */
  const me = v.players.find(p => p.id === v.me);
  const rk = `${v.gid}|${v.seq}|${v.phase}|${mode}|${v.me}|${v.my ? JSON.stringify(v.my.grid) + '|' + v.my.score + '|' + v.my.movesLeft + '|' + (v.my.bestMoveScore || 0) : ''}|${v.players.map(p => p.id + ':' + p.score + ':' + p.movesLeft + ':' + p.status).join(',')}`;
  if (rk === lastRenderKey && v.phase === 'playing') return;
  lastRenderKey = rk;

  /* âm thanh theo điểm tăng của mình */
  if (me && v.my) {
    if (v.my.score > prevScore) {
      if (v.my.lastMoveScore >= 500) Sfx.big();
      else Sfx.pop(v.my.maxCascade || 1);
    }
    prevScore = v.my.score;
  }

  $('#xc-score').textContent = String(me ? me.score : 0);
  $('#xc-moves').textContent = String(v.my ? v.my.movesLeft : MOVES);
  $('#xc-best').textContent = String(v.my ? (v.my.bestMoveScore || 0) : 0);
  $('#xc-status').textContent = v.solo
    ? `Mục tiêu: ${TARGET_SCORE}đ (còn ${Math.max(0, TARGET_SCORE - (me ? me.score : 0))})`
    : `Đua ${MOVES} lượt — ai nhiều điểm nhất khi hết lượt thì thắng`;

  const boardsEl = $('#xc-boards');
  if (mode === 'pvp') {
    const raw = ui.net && ui.net.raw && ui.net.raw.state;
    if (raw) {
      const ids = raw.players.map(p => p.id);
      const v1 = viewFor(raw, ids[0]);
      const v2 = ids[1] ? viewFor(raw, ids[1]) : null;
      boardsEl.innerHTML = boardHTML(v1, raw.players[0].name + ' (bảng 1)', ids[0]) +
        (v2 ? boardHTML(v2, raw.players[1].name + ' (bảng 2)', ids[1]) : '');
      $('#xc-opps').innerHTML = `<div class="xc-opp">Chung máy: mỗi người bấm kẹo trên bảng của mình.</div>`;
      applySel();
      renderLog(v);
      return;
    }
  }
  boardsEl.innerHTML = boardHTML(v, me ? cleanName(me.name) : '', v.me);
  const opps = v.players.filter(p => p.id !== v.me);
  $('#xc-opps').innerHTML = opps.length ? opps.map(p => {
    return `<div class="xc-opp"><span>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}</span><b>⭐ ${p.score}đ · 🎯 còn ${p.movesLeft} lượt</b><i>${p.status === 'playing' ? '▶ đang chơi' : p.status === 'done' ? '🏁 hết lượt' : p.status === 'resigned' ? '🏳️ xin thua' : p.status}</i></div>`;
  }).join('') : '<div class="xc-opp">Chơi đơn: chỉ có bạn.</div>';
  applySel();
  renderLog(v);
}
function renderLog(v) {
  const log = (v.log || []).slice(-5);
  $('#xc-log').innerHTML = log.map(l => `<div>${esc(l.text)}</div>`).join('');
}
/* vẽ lại dấu chọn sau mỗi lần render (innerHTML mới xoá class .sel) */
function applySel() {
  if (!sel) return;
  const board = document.querySelector(`.xc-board[data-pid="${sel.pid}"]`);
  if (!board) return;
  const cell = board.querySelector(`.cell[data-x="${sel.x}"][data-y="${sel.y}"]`);
  if (cell) cell.classList.add('sel');
}
function clearSel() {
  sel = null;
  document.querySelectorAll('.xc-grid .cell.sel').forEach(el => el.classList.remove('sel'));
}

/* ---------- bấm kẹo: chọn rồi đổi ---------- */
function gridFor(pid) {
  if (mode === 'pvp') {
    const raw = ui.net && ui.net.raw && ui.net.raw.state;
    return raw && raw.prog[pid] ? raw.prog[pid].grid : null;
  }
  return cur && cur.my ? cur.my.grid : null;
}
$('#xc-boards').addEventListener('click', e => {
  const cell = e.target.closest('.cell');
  if (!cell || !cur || cur.phase !== 'playing') return;
  const board = e.target.closest('.xc-board');
  const pid = board ? board.dataset.pid : cur.me;
  const x = +cell.dataset.x, y = +cell.dataset.y;
  if (!controlPid(cur, pid)) return;
  const grid = gridFor(pid);
  if (!grid) return;
  if (!sel || sel.pid !== pid) { sel = { x, y, pid }; applySel(); Sfx.click(); return; }
  if (sel.x === x && sel.y === y) { clearSel(); return; }
  if (Math.abs(sel.x - x) + Math.abs(sel.y - y) !== 1) { sel = { x, y, pid }; applySel(); Sfx.click(); return; }
  /* 2 ô kề nhau: kiểm tra trước ở máy khách để báo ngay khi không tạo hàng */
  if (!isLegalSwap(grid, sel.x, sel.y, x, y)) {
    Sfx.deny();
    const b = board.querySelector(`.cell[data-x="${sel.x}"][data-y="${sel.y}"]`);
    if (b) b.classList.add('deny');
    cell.classList.add('deny');
    setTimeout(() => { document.querySelectorAll('.xc-grid .cell.deny').forEach(el => el.classList.remove('deny')); }, 260);
    clearSel();
    return;
  }
  const a = { type: 'swap', x1: sel.x, y1: sel.y, x2: x, y2: y };
  clearSel();
  ui.actAs(pid, a);
  Sfx.click();
});

/* ---------- kết thúc ---------- */
function showEnd(v) {
  const me = v.me;
  const sum = (v.final && v.final.summary) || {};
  const won = (v.winnerIds || []).includes(me);
  let h;
  if (v.endReason === 'draw') h = '🤝 Trận hòa!';
  else if (v.endReason === 'resign') h = '🏳️ Trận đã kết thúc!';
  else if (won) h = '🏆 Bạn thắng!';
  else if (v.solo) h = '😢 Chưa đủ điểm!';
  else h = `🏆 ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name || 'Máy'))} thắng!`;
  const rows = v.players.map(p => {
    const q = sum[p.id] || {};
    const isWin = (v.winnerIds || []).includes(p.id);
    return `<div>${isWin ? '👑 ' : ''}${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''} — ${q.score || 0} điểm · ${q.matches || 0} lần nổ · dây chuyền ×${q.maxCascade || 0} · nước lớn nhất ${q.bestMoveScore || 0} · ${q.movesUsed || 0} lượt</div>`;
  }).join('');
  let reason = '';
  if (v.solo && won) reason = `Bạn đạt ${TARGET_SCORE} điểm trong ${sum[me] ? sum[me].movesUsed : MOVES} lượt — thắng!`;
  else if (v.solo && v.endReason === 'moves') reason = `Hết ${MOVES} lượt, bạn được ${sum[me] ? sum[me].score : 0}/${TARGET_SCORE} điểm.`;
  else if (v.endReason === 'draw') reason = 'Không ai hơn ai — cùng điểm khi hết lượt.';
  else if (v.endReason === 'resign') reason = 'Có người xin thua — bị loại khỏi ván.';
  else reason = `Đua ${MOVES} lượt: ai nhiều điểm nhất khi hết lượt thì thắng.`;
  if (won) Sfx.win(); else Sfx.lose();
  ui.openModal(`<h2>${h}</h2><p>${reason}</p><div>${rows}</div><div class="btns"><button class="btn primary" id="m-again">🔄 Chơi lại</button><button class="btn" id="m-close">Đóng</button></div>`);
  const c = $('#m-close'); if (c) c.onclick = ui.closeModal;
  const a = $('#m-again'); if (a) a.onclick = () => { ui.closeModal(); location.reload(); };
}
$('#btn-again').onclick = () => location.reload();

/* ---------- xin thua ---------- */
$('#btn-resign').onclick = async () => {
  if (!cur || cur.phase !== 'playing') return;
  const r = await confirmBox('Xin thua là thua luôn ván này (đua thì các người còn lại chơi tiếp).', { title: '🏳️ Xin thua?', ok: 'Xin thua', danger: true });
  if (!r) return;
  const pid = cur.me;
  if (mode === 'pvp' && pvpP2) {
    const p2 = await confirmBox('Chung máy 2 người: ai xin thua?', { title: '🏳️ Ai xin thua?', ok: 'Người 2', cancel: 'Người 1' });
    ui.actAs(p2 ? pvpP2 : (cur.players[0] && cur.players[0].id), { type: 'resign' });
    return;
  }
  ui.actAs(pid, { type: 'resign' });
};

/* ---------- hướng dẫn + âm thanh ---------- */
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
