// 🔢 2048 – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng
// shared/net/simplenet.js (cùng pattern Sudoku: chủ phòng giữ state, khách
// chỉ gửi action {type, dir?}). Mỗi người có lưới riêng, chỉ thấy tiến độ
// (điểm, ô lớn nhất, số nước) của người khác — không ai thấy lưới của người
// khác. Thắng/thua/xu ghi qua watch() của simplenet — main.js KHÔNG
// gọi record() trực tiếp.
import { createGame, applyAction, viewFor, serialize, deserialize, actors, SIZE, TARGET, MAX_UNDOS } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, $$, esc, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
import { confirmBox, toast as tip } from '../../shared/ui/dialog.js?v=9';

const NET = makeNet({
  game: 's2048', min: 1, max: 4, maxSeats: 4, allowLocal: false,
  create: (players, opts) => createGame(players, opts),
  apply: applyAction, view: viewFor, serialize, deserialize, actors, bot: botAction,
  /* máy trượt 1 nước mỗi lượt; Máy Dễ trượt chậm, Máy Khó nhanh */
  botDelay: (s, pid) => {
    const p = s.players.find(x => x.id === pid);
    const hard = p && p.level === 'hard';
    return hard ? 1200 + Math.random() * 600 : 2000 + Math.random() * 800;
  },
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Sữa', 'Bánh', 'Miu', 'Cún', 'Gấu'],
});

/* ---------- chế độ chơi ---------- */
let mode = 'solo';
try { mode = localStorage.getItem('gumballz-s2048-mode') || 'solo'; } catch (e) {}
if (!['solo', 'ai-easy', 'ai-hard', 'online'].includes(mode)) mode = 'solo';
function setMode(m) {
  mode = m;
  try { localStorage.setItem('gumballz-s2048-mode', m); } catch (e) {}
  $$('#screen-home .seg [data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m));
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'solo' ? '🔢 Bắt đầu trượt một mình' : m === 'ai-easy' ? '🤖 Đua với máy Dễ' : '🧠 Đua với máy Khó';
}
$('#screen-home').addEventListener('click', e => {
  const b = e.target.closest('[data-mode]'); if (!b) return;
  setMode(b.dataset.mode);
});
setMode(mode);

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  $('#pcount').textContent = `${n}/4 người (chơi đơn 1 · đua 2–4)`;
  $('#plist').innerHTML = info.players.map(p => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost || mode === 'solo' || mode.startsWith('ai-') ? '' : (n < 4
    ? `<div class="row-btns"><button class="btn" id="btn-addbot-easy">🤖 Thêm máy Dễ</button><button class="btn" id="btn-addbot-hard">🧠 Thêm máy Khó</button></div>`
    : '');
  $('#opts').innerHTML = `<div class="opt"><b>🎯 Mục tiêu</b><div class="seg"><button type="button" aria-pressed="true" disabled>Đạt ô 2048</button></div><small>Trượt để gộp các ô giống nhau — ai đạt ô 2048 trước thì thắng; ai kẹt (lưới đầy, không gộp được nữa) thì bị loại, tất cả đều kẹt thì điểm cao nhất thắng.</small></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = mode === 'online' ? n < 2 : n < 1;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
  $('#wait-msg').textContent = mode === 'online' && n < 2 ? 'Cần ít nhất 2 người mới đua được (đang có 1).' : 'Đang chờ chủ phòng bắt đầu…';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.net.raw;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot-easy') h.addBot({ level: 'easy' });
  else if (b.id === 'btn-addbot-hard') h.addBot({ level: 'hard' });
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- trạng thái ván ---------- */
let cur = null;
let lastMoveKey = '', endShown = '';
let timerInt = null;
const fmt = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String((s / 60) | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const elapsedMs = v => {
  if (!v) return 0;
  const end = v.phase === 'ended' && v.endedAt ? v.endedAt : Date.now();
  return Math.max(0, end - v.startedAt);
};
function stopTimer() { if (timerInt) { clearInterval(timerInt); timerInt = null; } }
function startTimer() {
  stopTimer();
  timerInt = setInterval(() => {
    const el = $('#timer-text'); if (!el || !cur) return;
    el.textContent = fmt(elapsedMs(cur));
  }, 1000);
}
function loadBest() { try { return +localStorage.getItem('gumballz-s2048-best') || 0; } catch (e) { return 0; } }
function saveBest(v) { try { if (v > loadBest()) localStorage.setItem('gumballz-s2048-best', String(v)); } catch (e) {} }
function resetGameState() {
  cur = null; lastMoveKey = ''; endShown = '';
  stopTimer();
}

/* ---------- vẽ lưới ---------- */
function tileClass(v) {
  if (!v) return 'ft-cell empty';
  if (v >= 2048) return 'ft-cell t2048';
  if (v >= 1024) return 'ft-cell t1024';
  if (v >= 512) return 'ft-cell t512';
  if (v >= 256) return 'ft-cell t256';
  if (v >= 128) return 'ft-cell t128';
  if (v >= 64) return 'ft-cell t64';
  if (v >= 32) return 'ft-cell t32';
  if (v >= 16) return 'ft-cell t16';
  if (v >= 8) return 'ft-cell t8';
  if (v >= 4) return 'ft-cell t4';
  return 'ft-cell t2';
}
function drawGrid(v) {
  const g = $('#grid');
  g.innerHTML = Array.from({ length: SIZE * SIZE }, (_, i) => {
    const val = v.you.grid[i];
    const isNew = v.lastSpawn && v.lastSpawn.by === v.me && v.lastSpawn.cell === i;
    return `<div class="${tileClass(val)}${isNew ? ' new' : ''}" data-cell="${i}" role="gridcell" aria-label="Ô ${((i / SIZE) | 0) + 1} hàng ${i % SIZE + 1} cột${val ? ', số ' + val : ', trống'}">${val || ''}</div>`;
  }).join('');
}
function drawStatus(v) {
  const isRace = v.players.length > 1;
  const best = loadBest();
  $('#status').innerHTML = `<span class="stat">⏱️ <span id="timer-text">${fmt(elapsedMs(v))}</span></span><span class="stat">⭐ Điểm: <b>${v.you.score}</b></span><span class="stat">🏆 Kỷ lục: <b>${Math.max(best, v.you.score)}</b></span><span class="stat">🔢 Ô lớn nhất: <b>${v.you.maxTile || '—'}</b></span><span class="stat">👣 ${v.you.moves} nước</span>${v.you.failed ? '<span class="stat">😢 Bạn đã kẹt</span>' : ''}`;
  const undoBtn = $('#btn-undo');
  undoBtn.style.display = mode === 'solo' ? '' : 'none';
  undoBtn.textContent = `↩️ Hoàn tác (${v.you.undosLeft})`;
  undoBtn.disabled = v.phase === 'ended' || v.you.failed || v.you.undosLeft <= 0 || v.you.moves === 0;
  $('#btn-resign').disabled = v.phase === 'ended' || v.you.failed;
  const race = $('#race');
  if (isRace) {
    race.style.display = '';
    race.innerHTML = v.players.map(p => {
      const pct = Math.min(100, Math.round((Math.log2(p.maxTile || 1) / Math.log2(TARGET)) * 100));
      return `<div class="race-row ${p.id === v.me ? 'me' : ''} ${p.failed ? 'out' : ''}">${avatar(p.name, 30)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === v.me ? ' (bạn)' : ''}</span><span class="bar"><i style="width:${pct}%"></i></span><span class="cnt">${p.score}đ · ô ${p.maxTile || '—'}</span><span class="mist">${p.failed ? '😢 kẹt' : `${p.moves} nước`}</span></div>`;
    }).join('');
  } else race.style.display = 'none';
  $('#round').textContent = isRace
    ? `🏁 Đua ${v.players.length} người · ai đạt ô ${TARGET} trước thì thắng!`
    : `🔢 Chơi đơn · trượt để gộp ô giống nhau — đạt ô ${TARGET} là thắng!`;
  const log = $('#log');
  log.innerHTML = v.log.map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');
  log.scrollTop = log.scrollHeight;
}
function soundForMove(v) {
  const m = v.lastMove;
  if (!m || m.by !== v.me) return;
  const key = `${m.by}:${m.n}:${m.dir}`;
  if (key === lastMoveKey) return;
  lastMoveKey = key;
  if (m.gained > 0) Snd.merge(); else Snd.place();
}

/* ---------- vẽ toàn ván ---------- */
function render(v, prev) {
  if (!v) { resetGameState(); return; }
  const newGame = !cur || cur.gid !== v.gid;
  if (newGame) { resetGameState(); cur = v; startTimer(); }
  else cur = v;
  if (v.phase === 'ended') { stopTimer(); if (mode === 'solo') saveBest(v.you.score); }
  /* soundForMove TRƯỚC khi vẽ lưới để ô mới mọc được gắn class 'new' ngay */
  soundForMove(v);
  drawGrid(v);
  drawStatus(v);
  if (v.phase === 'ended' && endShown !== v.gid) { endShown = v.gid; showEnd(v); }
}

/* ---------- modal kết thúc ---------- */
function showEnd(v) {
  const me = v.players.find(p => p.id === v.me) || {};
  const won = v.winner === v.me;
  const winner = v.players.find(p => p.id === v.winner);
  const time = fmt(elapsedMs(v));
  let title, body;
  if (won) {
    Snd.winJingle();
    title = '🎉 Đạt ô 2048!';
    body = `<p>Bạn đạt ô <b>2048</b> trong <b>${time}</b> — điểm <b>${v.you.score}</b>, ${v.you.moves} nước đi, kỷ lục của bạn là <b>${Math.max(loadBest(), v.you.score)}</b>.</p><p class="note">Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.</p>`;
  } else if (v.endReason === 'resign' && v.you.failed) {
    Snd.lose();
    title = '🏳️ Bạn đã xin thua';
    body = `<p>Bạn đã xin thua ván này — điểm <b>${me.score || 0}</b>, ô lớn nhất <b>${me.maxTile || '—'}</b>.</p><p class="note">Chơi 1 ván +2 xu.</p>`;
  } else if (v.endReason === 'allstuck' && winner) {
    if (won) Snd.winJingle(); else Snd.lose();
    title = `🏁 ${esc(cleanName(winner.name))} điểm cao nhất!`;
    body = `<p>Mọi người đều kẹt — ${esc(cleanName(winner.name))} thắng nhờ điểm cao nhất <b>${winner.score}</b>. Bạn được <b>${me.score || 0}</b> điểm, ô lớn nhất <b>${me.maxTile || '—'}</b>.</p><p class="note">Chơi 1 ván +2 xu.</p>`;
  } else if (v.you.failed) {
    Snd.lose();
    title = '😢 Kẹt rồi!';
    body = `<p>Lưới đầy mà không còn nước gộp được — điểm <b>${me.score || 0}</b>, ô lớn nhất <b>${me.maxTile || '—'}</b>, ${me.moves || 0} nước đi.</p><p class="note">Chơi 1 ván +2 xu — ván sau dồn ô lớn về 1 góc nhé!</p>`;
  } else if (winner) {
    title = `🏁 ${esc(cleanName(winner.name))} đạt 2048 trước!`;
    body = `<p>${esc(cleanName(winner.name))} đạt ô 2048 trước trong <b>${time}</b> — bạn được <b>${me.score || 0}</b> điểm, ô lớn nhất <b>${me.maxTile || '—'}</b>.</p><p class="note">Chơi 1 ván +2 xu — ván sau cố gắng nhanh tay hơn nhé!</p>`;
  } else {
    Snd.lose();
    title = '😢 Không ai thắng';
    body = `<p>Mọi người đều xin thua — không ai đạt ô 2048.</p><p class="note">Chơi 1 ván +2 xu.</p>`;
  }
  const btns = ui.isHost
    ? `<button class="btn big pri" id="m-again">🔁 Ván mới</button><button class="btn" id="m-lobby">Về phòng chờ</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`
    : `<button class="btn big pri" id="m-close">Đóng</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`;
  ui.openModal(`<h2>${title}</h2>${body}<div class="btns">${btns}</div>`, 'lock');
  const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); ui.net.raw.start(); };
  const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); ui.net.raw.restart(); };
  const home = $('#m-home'); if (home) home.onclick = () => { ui.closeModal(); ui.leave(); };
  const close = $('#m-close'); if (close) close.onclick = ui.closeModal;
}

/* ---------- tương tác ---------- */
function doMove(dir) {
  if (!cur || cur.phase !== 'playing' || cur.you.failed) return;
  ui.act({ type: 'move', dir });
}
const DIRS_KEY = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
  W: 'up', S: 'down', A: 'left', D: 'right',
};
document.addEventListener('keydown', e => {
  if (!cur || !$('#screen-game').classList.contains('active') || cur.phase !== 'playing' || cur.you.failed) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const dir = DIRS_KEY[e.key];
  if (dir) { e.preventDefault(); doMove(dir); return; }
  if (e.key === 'u' || e.key === 'U') { $('#btn-undo').click(); }
});
$('#pad').addEventListener('click', e => {
  const b = e.target.closest('[data-dir]'); if (!b) return;
  doMove(b.dataset.dir);
});
/* vuốt trên lưới */
let touchStart = null;
$('#grid').addEventListener('touchstart', e => {
  const t = e.changedTouches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });
$('#grid').addEventListener('touchend', e => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
  touchStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
}, { passive: true });
$('#btn-undo').onclick = () => {
  if (!cur || mode !== 'solo' || cur.phase !== 'playing' || cur.you.failed) return;
  if (cur.you.undosLeft <= 0) { tip('Hết lượt hoàn tác rồi.'); Snd.invalid(); return; }
  ui.act({ type: 'undo' });
  Snd.pick();
};
$('#btn-resign').onclick = async () => {
  if (!cur || cur.phase === 'ended' || cur.you.failed) return;
  const r = await confirmBox('Nhận thua ván này? Bạn bị loại khỏi cuộc đua (chơi đơn thì ván kết thúc luôn).', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  ui.act({ type: 'resign' });
};
$('#btn-new').onclick = () => {
  if (!cur) return;
  if (!ui.isHost) { tip('Chỉ chủ phòng mở ván mới được.'); return; }
  ui.net.raw.start();
};

/* ---------- nút phụ ---------- */
function openGuide() { ui.openModal(GUIDE_HTML); const c = $('#m-close'); if (c) c.onclick = ui.closeModal; }
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
$('#btn-log').onclick = () => {
  const v = cur, log = v ? v.log.slice().reverse() : [];
  ui.openModal(`<h2>📜 Nhật ký trận đấu</h2>${log.length ? `<ul class="logl">${log.map(l => `<li class="${l.kind || ''}">${esc(l.text)}</li>`).join('')}</ul>` : '<p style="text-align:center;color:var(--muted)">Chưa có gì.</p>'}<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 's2048', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      /* đua với máy: bạn + 1 máy, cùng 1 dãy ô mới mọc */
      h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
    }
    /* chơi đơn: chỉ mình bạn; online: chủ phòng thêm máy trong phòng chờ */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => { render(v, prev); },
});

/* 🏠 nút home phải về đúng trang chủ web (gameKit chỉ về màn hình đầu của game) */
$('#btn-leave').onclick = async () => {
  const r = await confirmBox(ui.isHost && cur ? 'Bạn là chủ phòng: rời đi là cả phòng giải tán.' : 'Bạn có thể vào lại bằng mã phòng.', { title: 'Rời ván?', ok: 'Rời ván', cancel: 'Ở lại', danger: true });
  if (r) ui.leave();
};
