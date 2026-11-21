// 🧩 Ghép Hình – giao diện. Luật ở engine.js, bot ở bot.js, hình ở
// pictures.js, phòng/mạng dùng shared/net/simplenet.js (cùng pattern
// Nonogram: chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Đua có giới hạn 180 giây: chỉ CHỦ PHÒNG chạy đồng hồ 1s, hết giờ
// thì gửi {type:'timeout'} để engine so số mảnh đúng.
// Chơi chung máy (pvp): host có state thô nên vẽ cả 2 bảng bằng
// viewFor(raw, pid) — giống pattern chuyền tay của Tetris/Rắn Săn Mồi.
import { createGame, applyAction, viewFor, serialize, deserialize, actors, RACE_TIME_MS, PEEKS } from './engine.js?v=1';
import { botAction, botDelay, BOT_NAMES } from './bot.js?v=1';
import { drawPicture, PICTURES } from './pictures.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import { Sfx } from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, cleanName, avatar } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=9';

const NET = makeNet({
  game: 'ghephinh', min: 1, max: 4, maxSeats: 4, allowLocal: true,
  minMsg: 'Ghép Hình đua cần 2–4 người: đấu máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: { size: 4 },
  optOk: (k, v) => (k === 'botLevel' && (v === 'easy' || v === 'hard')) || (k === 'ghMode' && (v === 'solo' || v === 'race')) || (k === 'size' && (v === 3 || v === 4 || v === 5)),
  create: createGame, apply: applyAction, view: viewFor, serialize, deserialize, actors, bot: botAction,
  /* máy đi sau 900–1300ms (Dễ) / 300–500ms (Khó) mỗi nước — botDelay ở bot.js */
  botDelay: (s, pid) => botDelay(s, pid),
  botNames: BOT_NAMES,
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'solo'; /* solo | race | pvp | online */
let botLevel = 'hard';
let p2name = 'Bạn 2';
try {
  const l = localStorage.getItem('gumballz-ghephinh-level');
  if (l === 'easy' || l === 'hard') botLevel = l;
  const n = localStorage.getItem('gumballz-ghephinh-p2');
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
  try { localStorage.setItem('gumballz-ghephinh-level', botLevel); } catch (e) {}
  mode = 'solo'; ui.startHost(true);
};
$('#btn-vs-bot').onclick = () => toggleBox('bot-row');
$('#btn-online').onclick = () => { mode = 'online'; toggleBox('room-box'); };
$('#btn-local').onclick = () => toggleBox('local-row');
$('#btn-start-bot').onclick = () => {
  botLevel = $('#sel-level').value === 'easy' ? 'easy' : 'hard';
  try { localStorage.setItem('gumballz-ghephinh-level', botLevel); } catch (e) {}
  mode = 'race'; ui.startHost(true);
};
$('#btn-start-local').onclick = () => {
  p2name = ($('#inp-p2name').value || 'Bạn 2').trim().slice(0, 16) || 'Bạn 2';
  try { localStorage.setItem('gumballz-ghephinh-p2', p2name); } catch (e) {}
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
    const hard = await confirmBox('Máy Khó mỗi nước đặt đúng ít nhất 1 mảnh (300–500ms/nước); máy Dễ đổi ngẫu nhiên, chậm hơn (900–1300ms/nước).', { title: '🤖 Thêm máy', ok: 'Máy Khó', cancel: 'Máy Dễ' });
    h.addBot({ level: hard ? 'hard' : 'easy' });
  } else if (b.id === 'btn-addlocal') {
    const nm = await promptBox('Người chơi cùng máy (chung màn hình).', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (nm) h.addLocal(nm);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
let pvpP2 = null; /* id người chơi 2 ở chế độ chung máy */
let sel = null; /* {pid, pos} mảnh đang chọn để đổi chỗ */
let peekTimer = null;

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
  game: 'ghephinh', net: NET,
  offline: h => {
    const sizeOf = selId => {
      const el = document.getElementById(selId);
      const v = el ? +el.value : 4;
      return [3, 4, 5].includes(v) ? v : 4;
    };
    if (mode === 'solo') {
      h.setOpt('ghMode', 'solo');
      h.setOpt('size', sizeOf('sel-solo-size'));
    } else if (mode === 'race') {
      h.setOpt('ghMode', 'race');
      h.setOpt('botLevel', botLevel);
      h.setOpt('size', sizeOf('sel-size'));
      h.addBot({ level: botLevel });
    } else if (mode === 'pvp') {
      h.setOpt('ghMode', 'race');
      h.setOpt('size', sizeOf('sel-local-size'));
      if (h.players.length < 2) h.addLocal(p2name);
    }
    /* online: mặc định race, không cần setOpt */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => {
    if (!v) { cur = null; endShownFor = ''; pvpP2 = null; sel = null; hidePeek(); render(null, null); return; }
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
  if (r) { stopTimer(); ui.leave(); setTimeout(() => { location.href = '../'; }, 250); }
};

/* ---------- đồng hồ (chỉ chủ phòng gửi timeout khi hết 180s đua) ---------- */
let tickTimer = null;
function startTimer() {
  if (tickTimer) return;
  tickTimer = setInterval(() => {
    if (!cur || cur.phase !== 'playing') return;
    const sec = Math.floor((Date.now() - (cur.startedAt || Date.now())) / 1000);
    const el = $('#gh-time');
    if (el) el.textContent = cur.race ? fmtTime(Math.max(0, RACE_TIME_MS / 1000 - sec)) : fmtTime(sec);
    if (ui.isHost && cur.race && cur.phase === 'playing') {
      const elapsed = Date.now() - (cur.startedAt || Date.now());
      if (elapsed >= RACE_TIME_MS) {
        ui.actAs(cur.me, { type: 'timeout' });
      }
    }
  }, 1000);
}
function stopTimer() { if (tickTimer) { clearInterval(tickTimer); tickTimer = null; } }

/* ---------- vẽ bảng ---------- */
function tilePx(n) { return n === 3 ? 110 : n === 4 ? 88 : 70; }
/* canvas offscreen vẽ trọn hình mẫu 1 lần, các mảnh cắt ra bằng drawImage */
let picCache = { key: '', cv: null };
function picCanvas(picId, n) {
  const px = tilePx(n);
  const key = picId + '|' + n + '|' + px;
  if (picCache.key === key && picCache.cv) return picCache.cv;
  const cv = document.createElement('canvas');
  cv.width = n * px; cv.height = n * px;
  const c = cv.getContext('2d');
  drawPicture(c, picId, cv.width, cv.height);
  picCache = { key, cv };
  return cv;
}
function paintTiles(root) {
  if (!root || !cur || !cur.my) return;
  const n = cur.my.size;
  const px = tilePx(n);
  const src = picCanvas(cur.my.picId, n);
  root.querySelectorAll('.gh-tile').forEach(cv => {
    const tile = +cv.dataset.tile;
    const pos = +cv.dataset.pos;
    const c = cv.getContext('2d');
    const sx = (tile % n) * px, sy = Math.floor(tile / n) * px;
    c.clearRect(0, 0, px, px);
    c.drawImage(src, sx, sy, px, px, 0, 0, px, px);
    cv.classList.toggle('ok', tile === pos);
    cv.classList.toggle('sel', !!sel && sel.pos === pos && sel.pid === root.dataset.pid);
  });
}
function boardHTML(view, label, mainBoard) {
  const me = view.players.find(p => p.id === view.me);
  const my = view.my;
  const n = my.size;
  const px = tilePx(n);
  let tiles = '';
  for (let pos = 0; pos < my.tiles.length; pos++) {
    tiles += `<canvas class="gh-tile" data-pos="${pos}" data-tile="${my.tiles[pos]}" width="${px}" height="${px}" draggable="true"></canvas>`;
  }
  const pic = PICTURES[my.picId % PICTURES.length];
  return `<div class="gh-board-wrap" data-pid="${view.me}">
    <div class="gh-board-head"><b>${esc(label)}</b><span>🧩 <b>${me ? me.correct : 0}/${my.total}</b> · ⭐ ${me ? me.score : 0}đ</span></div>
    <div class="gh-board gh-n${n}"${mainBoard ? ' id="gh-board"' : ''}>${tiles}</div>
    <div class="gh-board-foot"><span>${pic.emoji} ${esc(pic.name)}</span><span>👀 còn ${my.peeksLeft} lượt xem mẫu</span></div>
  </div>`;
}

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}
let lastRenderKey = '';
let lastCorrect = 0;
function render(v, prev) {
  cur = v;
  if (!v) {
    const b = $('#gh-board'); if (b) b.innerHTML = '';
    $('#gh-boards').innerHTML = '';
    $('#gh-opps').innerHTML = '';
    $('#gh-score').textContent = '0';
    $('#gh-correct').textContent = '0/0';
    $('#gh-status').textContent = '';
    stopTimer();
    return;
  }
  /* key render: đổi khi bất cứ thứ gì hiển thị đổi — tránh vẽ thiếu (lỗi stale) */
  const me = v.players.find(p => p.id === v.me);
  const rk = `${v.gid}|${v.seq}|${v.phase}|${me ? me.correct + '/' + me.score + '/' + me.status : ''}|${v.my ? v.my.tiles.join(',') + '|' + v.my.peeksLeft + '|' + v.my.picId : ''}|${mode}`;
  if (rk === lastRenderKey && v.phase === 'playing') return;
  lastRenderKey = rk;
  startTimer();

  /* âm thanh khi đặt đúng thêm mảnh */
  if (me) {
    if (me.correct > lastCorrect) Sfx.correct();
    lastCorrect = me.correct;
  }

  $('#gh-score').textContent = String(me ? me.score : 0);
  $('#gh-correct').textContent = (me ? me.correct : 0) + '/' + (v.my ? v.my.total : 0);
  $('#gh-status').textContent = v.solo
    ? `Ghép đủ ${v.total} mảnh thì thắng — ${PICTURES[v.picId % PICTURES.length].emoji} ${esc(PICTURES[v.picId % PICTURES.length].name)}`
    : `Đua ${v.size}×${v.size} — ai ghép đủ ${v.total} mảnh trước thì thắng (hết 180 giây thì so số mảnh đúng)`;
  const peekBtn = $('#btn-peek');
  if (peekBtn) peekBtn.disabled = !v.my || v.my.peeksLeft <= 0;

  const boardsEl = $('#gh-boards');
  if (mode === 'pvp') {
    const raw = ui.net && ui.net.raw && ui.net.raw.state;
    if (raw) {
      const ids = raw.players.map(p => p.id);
      const v1 = viewFor(raw, ids[0]);
      const v2 = ids[1] ? viewFor(raw, ids[1]) : null;
      boardsEl.innerHTML = boardHTML(v1, raw.players[0].name + ' (P1)', true) +
        (v2 ? boardHTML(v2, raw.players[1].name + ' (P2)', false) : '');
      boardsEl.querySelectorAll('.gh-board-wrap').forEach(w => paintTiles(w));
      $('#gh-opps').innerHTML = '';
      return;
    }
  }
  boardsEl.innerHTML = boardHTML(v, me ? cleanName(me.name) : '', true);
  boardsEl.querySelectorAll('.gh-board-wrap').forEach(w => paintTiles(w));
  const opps = v.players.filter(p => p.id !== v.me);
  $('#gh-opps').innerHTML = opps.map(p => {
    return `<div class="gh-opp"><span>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}</span><b>🧩 ${p.correct}/${v.total} mảnh</b><span>⭐ ${p.score}đ</span><i>${p.status === 'playing' ? '▶ đang chơi' : p.status === 'done' ? '🏁 hết giờ' : p.status === 'resigned' ? '🏳️ xin thua' : p.status}</i></div>`;
  }).join('');
}

/* ---------- kết thúc ---------- */
function showEnd(v) {
  stopTimer();
  hidePeek();
  const me = v.me;
  const sum = (v.final && v.final.summary) || {};
  const won = (v.winnerIds || []).includes(me);
  let h;
  if (v.endReason === 'draw') h = '🤝 Trận hòa!';
  else if (v.endReason === 'resign') h = '🏳️ Trận đã kết thúc!';
  else if (won) h = '🏆 Bạn thắng!';
  else if (v.solo) h = '🧩 Chưa ghép xong!';
  else h = `🏆 ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name || 'Máy'))} thắng!`;
  const rows = v.players.map(p => {
    const q = sum[p.id] || {};
    const isWin = (v.winnerIds || []).includes(p.id);
    const t = q.timeMs != null ? ` · ⏱️ ${fmtTime(q.timeMs / 1000)}` : '';
    return `<div>${isWin ? '👑 ' : ''}${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''} — 🧩 ${q.correct || 0}/${v.total} mảnh · ⭐ ${q.score || 0}đ · 🔄 ${q.swaps || 0} lượt đổi · 👀 ${q.peeks || 0} lần xem mẫu${t}</div>`;
  }).join('');
  let reason = '';
  if (v.solo && won) reason = `Bạn ghép xong ${PICTURES[v.picId % PICTURES.length].emoji} ${esc(PICTURES[v.picId % PICTURES.length].name)}!`;
  else if (v.solo) reason = `Bạn ghép được ${sum[me] ? sum[me].correct : 0}/${v.total} mảnh thì xin thua.`;
  else if (v.endReason === 'draw') reason = 'Không ai hơn ai — cùng số mảnh đúng.';
  else if (v.endReason === 'resign') reason = 'Có người xin thua — bị loại khỏi ván.';
  else reason = `Đua ${v.size}×${v.size}: ai ghép đủ ${v.total} mảnh trước thì thắng.`;
  if (won) Sfx.win(); else Sfx.lose();
  ui.openModal(`<h2>${h}</h2><p>${reason}</p><div>${rows}</div><div class="btns"><button class="btn primary" id="m-again">🔄 Chơi lại</button><button class="btn" id="m-close">Đóng</button></div>`);
  const c = $('#m-close'); if (c) c.onclick = ui.closeModal;
  const a = $('#m-again'); if (a) a.onclick = () => { ui.closeModal(); location.reload(); };
}

/* ---------- tương tác: bấm chọn/đổi chỗ + kéo-thả ---------- */
function myAction(a, pid) {
  const id = pid || (cur && cur.me);
  const cp = controlPid(cur, id);
  if (!cp) return;
  send(cp, a);
}
function clearSel() {
  sel = null;
  document.querySelectorAll('.gh-tile.sel').forEach(el => el.classList.remove('sel'));
}
function doSwap(pid, a, b) {
  if (a === b) return;
  myAction({ type: 'swap', a, b }, pid);
  Sfx.swap();
}
$('#gh-boards').addEventListener('click', e => {
  const tile = e.target.closest('.gh-tile');
  if (!tile || !cur || cur.phase !== 'playing') return;
  const wrap = e.target.closest('.gh-board-wrap');
  const pid = wrap ? wrap.dataset.pid : cur.me;
  if (!controlPid(cur, pid)) return;
  const pos = +tile.dataset.pos;
  if (!sel || sel.pid !== pid) { sel = { pid, pos }; tile.classList.add('sel'); Sfx.select(); return; }
  if (sel.pos === pos) { clearSel(); return; }
  const a = sel.pos;
  clearSel();
  doSwap(pid, a, pos);
});
/* kéo-thả bằng chuột (máy tính): kéo 1 mảnh thả lên mảnh khác để đổi chỗ */
let dragPos = null, dragPid = null;
$('#gh-boards').addEventListener('dragstart', e => {
  const tile = e.target.closest('.gh-tile');
  if (!tile || !cur || cur.phase !== 'playing') { e.preventDefault(); return; }
  const wrap = e.target.closest('.gh-board-wrap');
  dragPid = wrap ? wrap.dataset.pid : cur.me;
  if (!controlPid(cur, dragPid)) { e.preventDefault(); return; }
  dragPos = +tile.dataset.pos;
  try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragPos)); } catch (err) { /* kệ */ }
});
$('#gh-boards').addEventListener('dragover', e => { if (e.target.closest('.gh-tile')) e.preventDefault(); });
$('#gh-boards').addEventListener('drop', e => {
  const tile = e.target.closest('.gh-tile');
  if (!tile || dragPos === null) return;
  e.preventDefault();
  const pid = dragPid;
  const a = dragPos;
  dragPos = null; dragPid = null;
  doSwap(pid, a, +tile.dataset.pos);
});
$('#gh-boards').addEventListener('dragend', () => { dragPos = null; dragPid = null; });

/* ---------- xem hình mẫu ---------- */
function showPeek() {
  if (!cur || !cur.my) return;
  const ov = $('#gh-peek');
  const cv = $('#gh-peek-canvas');
  if (!ov || !cv) return;
  const c = cv.getContext('2d');
  drawPicture(c, cur.my.picId, cv.width, cv.height);
  ov.style.display = '';
  if (peekTimer) clearTimeout(peekTimer);
  peekTimer = setTimeout(hidePeek, 5000);
}
function hidePeek() {
  const ov = $('#gh-peek');
  if (ov) ov.style.display = 'none';
  if (peekTimer) { clearTimeout(peekTimer); peekTimer = null; }
}
$('#btn-peek').onclick = () => {
  if (!cur || cur.phase !== 'playing' || !cur.my || cur.my.peeksLeft <= 0) { tip('Đã hết lượt xem mẫu (tối đa 3).'); return; }
  myAction({ type: 'peek' });
  Sfx.peek();
  showPeek();
};
$('#btn-resign').onclick = async () => {
  if (!cur || cur.phase !== 'playing') return;
  const r = await confirmBox('Xin thua là thua luôn ván này (đua thì các người còn lại chơi tiếp).', { title: '🏳️ Xin thua?', ok: 'Xin thua', danger: true });
  if (!r) return;
  const pid = cur.me;
  if (mode === 'pvp' && pvpP2) {
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
$('#btn-guide').onclick = openGuide;
const gh = $('#btn-guide-home');
if (gh) gh.onclick = openGuide;
$('#btn-sound').onclick = () => {
  Sfx.setEnabled(!Sfx.isEnabled());
  $('#btn-sound').textContent = Sfx.isEnabled() ? '🔊 Âm thanh' : '🔇 Tắt tiếng';
};
if (!Sfx.isEnabled()) $('#btn-sound').textContent = '🔇 Tắt tiếng';
