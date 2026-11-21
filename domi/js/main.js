// 💣 Dò Mìn – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng
// shared/net/simplenet.js (cùng pattern Sudoku: chủ phòng giữ state, khách
// chỉ gửi action {type, cell?}). Mọi người dò cùng 1 bãi mìn, mỗi người có
// tiến độ riêng (ô đã mở + cờ của mình) — không ai thấy bãi mìn hay tiến độ
// chi tiết của người khác, chỉ thấy số ô đã mở. Thắng/thua/xu ghi qua
// watch() của simplenet — main.js KHÔNG gọi record() trực tiếp.
import { createGame, applyAction, viewFor, serialize, deserialize, actors, DIFFS } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, $$, esc, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
import { confirmBox, toast as tip } from '../../shared/ui/dialog.js?v=9';

const NET = makeNet({
  game: 'domi', min: 1, max: 4, maxSeats: 4, allowLocal: false,
  defaults: { difficulty: 'easy' },
  optOk: (k, v) => k === 'difficulty' && ['easy', 'medium', 'hard'].includes(v),
  create: (players, opts) => createGame(players, opts),
  apply: applyAction, view: viewFor, serialize, deserialize, actors, bot: botAction,
  /* máy mở 1 ô mỗi lượt; Máy Dễ mở chậm, Máy Khó nhanh */
  botDelay: (s, pid) => {
    const p = s.players.find(x => x.id === pid);
    const hard = p && p.level === 'hard';
    return hard ? 1100 + Math.random() * 500 : 2300 + Math.random() * 1200;
  },
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Sữa', 'Bánh', 'Miu', 'Cún', 'Gấu'],
});

/* ---------- chế độ chơi ---------- */
let mode = 'solo';
try { mode = localStorage.getItem('gumballz-domi-mode') || 'solo'; } catch (e) {}
if (!['solo', 'ai-easy', 'ai-hard', 'online'].includes(mode)) mode = 'solo';
function setMode(m) {
  mode = m;
  try { localStorage.setItem('gumballz-domi-mode', m); } catch (e) {}
  $$('#screen-home .seg [data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m));
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'solo' ? '💣 Bắt đầu dò một mình' : m === 'ai-easy' ? '🤖 Đua với máy Dễ' : '🧠 Đua với máy Khó';
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
  const o = info.opts || {}, dis = ui.isHost ? '' : 'disabled';
  $('#opts').innerHTML = `<div class="opt"><b>🎚️ Độ khó</b><div class="seg">${[['easy', 'Dễ · 9×9 · 10 mìn'], ['medium', 'Vừa · 16×16 · 40 mìn'], ['hard', 'Khó · 16×30 · 99 mìn']].map(([v, n]) => `<button type="button" data-diff="${v}" aria-pressed="${o.difficulty === v}" ${dis}>${n}</button>`).join('')}</div><small>Bãi càng lớn, càng nhiều mìn thì càng khó — cú bấm đầu tiên luôn an toàn.</small></div>`;
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
  else if (b.dataset.diff && ui.isHost) h.setOpt('difficulty', b.dataset.diff);
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- trạng thái ván ---------- */
let cur = null, flagMode = false, endShown = '';
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
function resetGameState() {
  cur = null; flagMode = false; endShown = '';
  stopTimer();
  drawFlagBtn();
}
/* kỷ lục chơi đơn theo độ khó (lưu máy) */
const BEST_KEY = 'gumballz-domi-best';
function loadBest() {
  try { return JSON.parse(localStorage.getItem(BEST_KEY) || '{}'); } catch (e) { return {}; }
}
function saveBest(diff, ms) {
  try {
    const b = loadBest();
    if (!b[diff] || ms < b[diff]) { b[diff] = ms; localStorage.setItem(BEST_KEY, JSON.stringify(b)); return true; }
  } catch (e) {}
  return false;
}

/* ---------- vẽ bãi mìn ---------- */
function cellHtml(v, i) {
  const rev = v.you.revealed.includes(i);
  const fl = v.you.flags.includes(i);
  const cls = ['dm-cell'];
  let inner = '';
  if (rev) {
    cls.push('open');
    const n = v.you.numbers[i];
    if (n != null && n > 0) { cls.push('n' + n); inner = String(n); }
  } else if (v.phase === 'ended' && v.mines && v.mines.includes(i)) {
    /* ván kết thúc mới lộ mìn */
    if (v.you.explodedAt === i) { cls.push('boom'); inner = '💥'; }
    else if (fl) { cls.push('mine'); inner = '💣'; }
    else { cls.push('mine'); inner = '💣'; }
  } else if (v.phase === 'ended' && fl) {
    cls.push('wrongflag'); inner = '🚩';
  } else if (fl) {
    cls.push('flagged'); inner = '🚩';
  }
  return `<button type="button" class="${cls.join(' ')}" data-cell="${i}" role="gridcell" aria-label="Ô ${((i / v.cols) | 0) + 1} hàng ${i % v.cols + 1} cột${rev ? (v.you.numbers[i] ? ', số ' + v.you.numbers[i] : ', trống') : fl ? ', đã cắm cờ' : ', chưa mở'}">${inner}</button>`;
}
function drawGrid(v) {
  const g = $('#grid');
  g.style.gridTemplateColumns = `repeat(${v.cols}, auto)`;
  g.innerHTML = Array.from({ length: v.rows * v.cols }, (_, i) => cellHtml(v, i)).join('');
}
function drawFlagBtn() {
  const b = $('#btn-flagmode');
  b.textContent = flagMode ? '🚩 Chế độ cắm cờ: Bật' : '🚩 Chế độ cắm cờ: Tắt';
  b.setAttribute('aria-pressed', flagMode);
  b.classList.toggle('on', flagMode);
}
function drawStatus(v) {
  const isRace = v.players.length > 1;
  $('#diff-chip').textContent = DIFFS[v.difficulty].name;
  const minesLeft = v.minesCount - v.you.flags.length;
  const me = v.players.find(p => p.id === v.me) || {};
  $('#status').innerHTML = `<span class="stat">⏱️ <span id="timer-text">${fmt(elapsedMs(v))}</span></span><span class="stat">💣 Còn lại: <span class="${minesLeft < 0 ? 'bad' : ''}">${minesLeft}</span> / ${v.minesCount}</span><span class="stat">✅ Đã mở: ${me.revealed || 0}/${v.safeTotal}</span>${v.you.failed ? '<span class="stat">💥 Bạn đã nổ mìn</span>' : ''}`;
  const best = loadBest();
  $('#best').textContent = mode === 'solo' && best[v.difficulty]
    ? `🏆 Kỷ lục ${DIFFS[v.difficulty].name} của bạn: ${fmt(best[v.difficulty])}`
    : '';
  $('#btn-flagmode').disabled = v.phase === 'ended' || v.you.failed;
  $('#btn-resign').disabled = v.phase === 'ended' || v.you.failed;
  const race = $('#race');
  if (isRace) {
    race.style.display = '';
    race.innerHTML = v.players.map(p => {
      const pct = Math.round(((p.revealed || 0) / v.safeTotal) * 100);
      return `<div class="race-row ${p.id === v.me ? 'me' : ''} ${p.failed ? 'out' : ''}">${avatar(p.name, 30)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === v.me ? ' (bạn)' : ''}</span><span class="bar"><i style="width:${pct}%"></i></span><span class="cnt">${p.revealed || 0}/${v.safeTotal}</span><span class="mist">${p.failed ? '💥 nổ' : `🚩${p.flags || 0}`}</span></div>`;
    }).join('');
  } else race.style.display = 'none';
  $('#round').textContent = isRace
    ? `🏁 Đua ${v.players.length} người · ${DIFFS[v.difficulty].name} · ${v.rows}×${v.cols} · ${v.minesCount} mìn — ai mở hết ô an toàn trước thì thắng!`
    : `💣 Chơi đơn · ${DIFFS[v.difficulty].name} · ${v.rows}×${v.cols} · ${v.minesCount} quả mìn · cú bấm đầu tiên luôn an toàn`;
  const log = $('#log');
  log.innerHTML = v.log.map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');
  log.scrollTop = log.scrollHeight;
}

/* ---------- vẽ toàn ván ---------- */
function render(v, prev) {
  if (!v) { resetGameState(); return; }
  const newGame = !cur || cur.gid !== v.gid;
  if (newGame) { resetGameState(); cur = v; startTimer(); }
  else cur = v;
  if (v.phase === 'ended') stopTimer();
  drawGrid(v);
  drawStatus(v);
  drawFlagBtn();
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
    let bestNote = '';
    if (mode === 'solo') {
      const isBest = saveBest(v.difficulty, elapsedMs(v));
      if (isBest) bestNote = `<p class="note">🏆 Kỷ lục mới ở độ khó ${DIFFS[v.difficulty].name}: <b>${time}</b>!</p>`;
    }
    title = '🎉 Dò hết bãi mìn!';
    body = `<p>Bạn mở hết <b>${v.safeTotal} ô an toàn</b> trong <b>${time}</b> — cắm <b>${v.you.flags.length}</b> cờ.</p>${bestNote}<p class="note">Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.</p>`;
  } else if (v.you.failed && v.endReason === 'boom') {
    Snd.boom();
    title = '💥 Nổ mìn!';
    body = `<p>Bạn bấm trúng mìn — đã mở được <b>${me.revealed || 0}/${v.safeTotal}</b> ô trong <b>${time}</b>.</p><p class="note">Chơi 1 ván +2 xu — ván sau cắm cờ chắc tay hơn nhé!</p>`;
  } else if (v.you.failed) {
    Snd.lose();
    title = v.endReason === 'resign' ? '🏳️ Bạn đã xin thua' : '😢 Bạn đã bị loại';
    body = `<p>Bạn đã mở được <b>${me.revealed || 0}/${v.safeTotal}</b> ô trong <b>${time}</b>.</p><p class="note">Chơi 1 ván +2 xu.</p>`;
  } else if (winner) {
    title = `🏁 ${esc(cleanName(winner.name))} dò xong trước!`;
    body = `<p>${esc(cleanName(winner.name))} mở hết bãi mìn trong <b>${time}</b> — bạn đã mở được <b>${me.revealed || 0}/${v.safeTotal}</b> ô.</p><p class="note">Chơi 1 ván +2 xu — ván sau cố gắng nhanh tay hơn nhé!</p>`;
  } else {
    Snd.lose();
    title = '😢 Không ai thắng';
    body = `<p>Mọi người đều nổ mìn — không ai dò hết bãi này.</p><p class="note">Chơi 1 ván +2 xu.</p>`;
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
function actCell(cell) {
  if (!cur || cur.phase === 'ended' || cur.you.failed) { tip('Ván đã kết thúc.'); return; }
  if (cur.you.revealed.includes(cell)) { tip('Ô này mở rồi.'); return; }
  if (flagMode) { ui.act({ type: 'flag', cell }); Snd.flag(); }
  else {
    if (cur.you.flags.includes(cell)) { tip('Ô này đang cắm cờ — bỏ cờ trước đã (chuột phải / chế độ cắm cờ).'); Snd.invalid(); return; }
    ui.act({ type: 'reveal', cell });
    Snd.place();
  }
}
let longTimer = null, longFired = false;
$('#grid').addEventListener('click', e => {
  if (longFired) { longFired = false; return; }
  const b = e.target.closest('[data-cell]'); if (!b || !cur) return;
  actCell(+b.dataset.cell);
});
$('#grid').addEventListener('contextmenu', e => {
  e.preventDefault();
  const b = e.target.closest('[data-cell]'); if (!b || !cur) return;
  if (cur.phase === 'ended' || cur.you.failed) return;
  if (cur.you.revealed.includes(+b.dataset.cell)) { tip('Ô này mở rồi, không cắm cờ được.'); return; }
  ui.act({ type: 'flag', cell: +b.dataset.cell });
  Snd.flag();
});
/* nhấn giữ ~500ms trên điện thoại = cắm cờ */
$('#grid').addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-cell]'); if (!b || !cur) return;
  longFired = false;
  clearTimeout(longTimer);
  longTimer = setTimeout(() => {
    longFired = true;
    if (cur.phase === 'ended' || cur.you.failed) return;
    if (cur.you.revealed.includes(+b.dataset.cell)) return;
    ui.act({ type: 'flag', cell: +b.dataset.cell });
    Snd.flag();
  }, 500);
});
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => $('#grid').addEventListener(ev, () => clearTimeout(longTimer)));
$('#btn-flagmode').onclick = () => { flagMode = !flagMode; drawFlagBtn(); Snd.pick(); };
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
document.addEventListener('keydown', e => {
  if (!cur || !$('#screen-game').classList.contains('active') || cur.phase !== 'playing' || cur.you.failed) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.key === 'f' || e.key === 'F') { flagMode = !flagMode; drawFlagBtn(); }
});

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
  game: 'domi', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      /* đua với máy: bạn + 1 máy, cùng 1 bãi mìn */
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
