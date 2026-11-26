// 🔢 Sudoku – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng
// shared/net/simplenet.js (cùng pattern Spyfall: chủ phòng giữ state, khách
// chỉ gửi action {type, cell?, value?}). Mỗi người có lưới riêng, chỉ thấy
// tiến độ (số ô đã điền) của người khác — không ai thấy lưới hay đáp án của
// người khác. Thắng/thua/xu ghi qua watch() của simplenet — main.js KHÔNG
// gọi record() trực tiếp.
import { createGame, applyAction, viewFor, serialize, deserialize, actors, DIFFS, HINTS_PER_GAME, MAX_MISTAKES, peersOf } from './engine.js?v=2';
import { botAction } from './bot.js?v=2';
import { GUIDE_HTML } from './guide.js?v=2';
import * as Snd from './sound.js?v=2';
import { makeNet } from '../../shared/net/simplenet.js?v=53';
import { gameKit, $, $$, esc, avatar, cleanName } from '../../shared/ui/gamekit.js?v=16';
import { confirmBox, toast as tip } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet({
  game: 'sudoku', min: 1, max: 4, maxSeats: 4, allowLocal: false,
  defaults: { difficulty: 'medium', combat: true },
  optOk: (k, v) => (k === 'difficulty' && ['easy', 'medium', 'hard', 'expert'].includes(v)) || (k === 'combat' && typeof v === 'boolean'),
  create: (players, opts) => createGame(players, opts),
  apply: applyAction, view: viewFor, serialize, deserialize, actors, bot: botAction,
  /* máy điền 1 ô đúng mỗi lượt; Máy Dễ điền chậm + nghỉ lâu, Máy Khó nhanh */
  botDelay: (s, pid) => {
    const p = s.players.find(x => x.id === pid);
    const hard = p && p.level === 'hard';
    return hard ? 1600 + Math.random() * 800 : 4200 + Math.random() * 1800;
  },
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Sữa', 'Bánh', 'Miu', 'Cún', 'Gấu'],
});

/* ---------- chế độ chơi ---------- */
let mode = 'solo';
try { mode = localStorage.getItem('gumballz-sudoku-mode') || 'solo'; } catch (e) {}
if (!['solo', 'ai-easy', 'ai-hard', 'online'].includes(mode)) mode = 'solo';
function setMode(m) {
  mode = m;
  try { localStorage.setItem('gumballz-sudoku-mode', m); } catch (e) {}
  $$('#screen-home .seg [data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m));
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'solo' ? '🧩 Bắt đầu giải một mình' : m === 'ai-easy' ? '🤖 Đua với máy Dễ' : '🧠 Đua với máy Khó';
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
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost || mode === 'solo' || mode.startsWith('ai-') ? '' : (n < 4
    ? `<div class="row-btns"><button class="btn" id="btn-addbot-easy">🤖 Thêm máy Dễ</button><button class="btn" id="btn-addbot-hard">🧠 Thêm máy Khó</button></div>`
    : '');
  const o = info.opts || {}, dis = ui.isHost ? '' : 'disabled';
  const combatOn = o.combat !== false;
  $('#opts').innerHTML = `<div class="opt"><b>🎚️ Độ khó</b><div class="seg">${[['easy', 'Dễ · 44 số'], ['medium', 'Vừa · 34 số'], ['hard', 'Khó · 28 số'], ['expert', 'Chuyên gia · 24 số']].map(([v, n]) => `<button type="button" data-diff="${v}" aria-pressed="${o.difficulty === v}" ${dis}>${n}</button>`).join('')}</div><small>Số cho sẵn càng ít thì càng khó — mọi câu đố đều có đúng 1 nghiệm duy nhất.</small></div>${n > 1 || mode !== 'solo' ? `<div class="opt"><b>⚔️ Combat</b><div class="seg">${[[true, 'Bật · kín dãy phủ sương'], [false, 'Tắt · đua thuần']].map(([v, nm]) => `<button type="button" data-combat="${v}" aria-pressed="${combatOn === v}" ${dis}>${nm}</button>`).join('')}</div><small>Kín 1 hàng/cột/khối thì sương mù của mình tan hết + phủ 3 ô sương mù (9 giây) lên người dẫn đầu — ô bị sương không điền được.</small></div>` : ''}`;
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
  else if (b.dataset.combat != null && ui.isHost) h.setOpt('combat', b.dataset.combat === 'true');
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- trạng thái ván ---------- */
let cur = null, sel = null, notesMode = false;
let paused = false, pauseStart = 0, pausedTotal = 0;
let hinted = new Set(), lastWrongKey = '', lastPlaceKey = '', endShown = '';
let fogSet = new Set(), lastHitKey = '', lastFogN = 0; /* ⚔️ Combat: ô đang bị sương che + dấu hiệu tấn công/bị phủ sương */
let timerInt = null;
const fmt = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String((s / 60) | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const elapsedMs = v => {
  if (!v) return 0;
  const end = v.phase === 'ended' && v.endedAt ? v.endedAt : Date.now();
  const pauseMs = paused ? pausedTotal + (Date.now() - pauseStart) : pausedTotal;
  return Math.max(0, end - v.startedAt - pauseMs);
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
  cur = null; sel = null; notesMode = false;
  paused = false; pauseStart = 0; pausedTotal = 0;
  hinted = new Set(); lastWrongKey = ''; lastPlaceKey = ''; endShown = '';
  fogSet = new Set(); lastHitKey = ''; lastFogN = 0;
  stopTimer();
  $('#pause-veil').style.display = 'none';
  $('#btn-pause').textContent = '⏸️ Tạm dừng';
  drawNotesBtn();
}

/* ---------- vẽ lưới + bàn phím ---------- */
function cellHtml(v, i) {
  const gv = v.givens[i], my = v.you.grid[i];
  const val = gv || my;
  const cls = ['sd-cell'];
  if (gv) cls.push('given'); else if (my) cls.push(hinted.has(i) ? 'hinted' : 'entry');
  if (sel === i) cls.push('sel');
  else if (sel != null) {
    const sv = v.givens[sel] || v.you.grid[sel];
    if (val && sv && val === sv) cls.push('same');
    else if (peersOf(sel).includes(i)) cls.push('peer');
  }
  let inner = val ? String(val) : '';
  if (fogSet.has(i)) { cls.push('fog'); inner = '<span class="fog-g">🌫️</span>'; }
  else if (!val && v.you.notes[i]) {
    const ns = v.you.notes[i];
    inner = `<span class="notes">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<span>${ns.includes(d) ? d : ''}</span>`).join('')}</span>`;
  }
  return `<button type="button" class="${cls.join(' ')}" data-cell="${i}" role="gridcell" aria-label="Ô ${((i / 9) | 0) + 1} hàng ${i % 9 + 1} cột${val ? ', số ' + val : ', trống'}">${inner}</button>`;
}
function drawGrid(v) {
  const g = $('#grid');
  fogSet = new Set((v.you.fog || []).map(f => f[0]));
  g.innerHTML = Array.from({ length: 81 }, (_, i) => cellHtml(v, i)).join('');
}
function drawPad(v) {
  const counts = {};
  for (let d = 1; d <= 9; d++) counts[d] = 0;
  for (const x of v.givens) if (x) counts[x]++;
  for (const x of v.you.grid) if (x) counts[x]++;
  const over = v.phase === 'ended' || v.you.failed;
  $('#pad').innerHTML = Array.from({ length: 9 }, (_, k) => {
    const d = k + 1, left = 9 - counts[d];
    return `<button type="button" class="sd-num" data-num="${d}" ${over || left <= 0 ? 'disabled' : ''}>${d}<small>còn ${left}</small></button>`;
  }).join('');
}
function drawNotesBtn() {
  const b = $('#btn-notes');
  b.textContent = notesMode ? '✏️ Ghi chú: Bật' : '✏️ Ghi chú: Tắt';
  b.setAttribute('aria-pressed', notesMode);
  b.classList.toggle('on', notesMode);
}
function drawStatus(v) {
  const isRace = v.players.length > 1;
  $('#diff-chip').textContent = DIFFS[v.difficulty].name;
  const mist = v.you.mistakes;
  const fogN = (v.you.fog || []).length;
  const fogSec = fogN ? Math.ceil(Math.min(...v.you.fog.map(f => f[1])) / 1000) : 0;
  $('#status').innerHTML = `<span class="stat">⏱️ <span id="timer-text">${fmt(elapsedMs(v))}</span></span><span class="stat">❌ <span class="mist ${mist ? '' : 'ok'}">${'×'.repeat(mist) || '0'}</span> / ${MAX_MISTAKES}</span><span class="stat">💡 Gợi ý: ${v.you.hintsLeft}/${HINTS_PER_GAME}</span><span class="stat">🔢 Đã điền: ${v.players.find(p => p.id === v.me)?.filled || v.givensCount}/81</span>${v.combat && fogN ? `<span class="stat fog-stat">🌫️ Sương: ${fogN} ô · tan sau ${fogSec}s</span>` : ''}${v.you.failed ? '<span class="stat">😢 Bạn đã bị loại</span>' : ''}`;
  $('#btn-hint').textContent = `💡 Gợi ý (${v.you.hintsLeft})`;
  $('#btn-hint').disabled = v.phase === 'ended' || v.you.failed || v.you.hintsLeft <= 0;
  $('#btn-erase').disabled = v.phase === 'ended' || v.you.failed || sel == null || !v.you.grid[sel];
  $('#btn-pause').style.display = mode === 'solo' && v.phase === 'playing' ? '' : 'none';
  $('#btn-resign').disabled = v.phase === 'ended' || v.you.failed;
  const race = $('#race');
  if (isRace) {
    race.style.display = '';
    race.innerHTML = v.players.map(p => {
      const pct = Math.round((p.filled / 81) * 100);
      return `<div class="race-row ${p.id === v.me ? 'me' : ''} ${p.failed ? 'out' : ''}">${avatar(p.name, 30)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === v.me ? ' (bạn)' : ''}</span><span class="bar"><i style="width:${pct}%"></i></span><span class="cnt">${p.filled}/81</span>${v.combat ? `<span class="cb">⚔️${p.atk || 0}${(p.fogN || 0) ? ` · 🌫️${p.fogN}` : ''}</span>` : ''}<span class="mist">${p.failed ? '❌ loại' : p.mistakes ? `❌×${p.mistakes}` : ''}</span></div>`;
    }).join('');
  } else race.style.display = 'none';
  $('#round').textContent = isRace
    ? `🏁 Đua ${v.players.length} người · ${DIFFS[v.difficulty].name} · ${v.givensCount} số cho sẵn — ai giải xong trước thắng!${v.combat ? ' · ⚔️ Combat bật: kín dãy phủ sương đối thủ' : ''}`
    : `🧩 Chơi đơn · ${DIFFS[v.difficulty].name} · ${v.givensCount} số cho sẵn · sai ${MAX_MISTAKES} lần là thua`;
  const log = $('#log');
  log.innerHTML = v.log.map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');
  log.scrollTop = log.scrollHeight;
}
function flashWrong(v) {
  const w = v.lastWrong;
  if (!w || w.by !== v.me) return;
  const key = `${w.by}:${w.cell}:${w.n}`;
  if (key === lastWrongKey) return;
  lastWrongKey = key;
  Snd.wrong();
  const el = $(`#grid [data-cell="${w.cell}"]`);
  if (el) { el.classList.add('wrong'); setTimeout(() => el.classList.remove('wrong'), 700); }
  tip(`❌ Số ${w.value} sai ở ô này — lỗi ${w.n}/${MAX_MISTAKES}!`);
}
function soundForPlace(v) {
  const p = v.lastPlace;
  if (!p || p.by !== v.me) return;
  const key = `${p.by}:${p.cell}:${p.n}`;
  if (key === lastPlaceKey) return;
  lastPlaceKey = key;
  if (p.hint) { hinted.add(p.cell); Snd.hint(); tip('💡 Gợi ý đã mở giúp bạn 1 ô!'); }
  else Snd.place();
}

/* ---------- vẽ toàn ván ---------- */
/* ⚔️ Combat: báo khi mình phủ sương được đối thủ / khi mình bị phủ sương */
function combatAlerts(v) {
  const h = v.you.hit;
  if (h) {
    const key = `${h.foe}:${h.at}:${h.n}`;
    if (key !== lastHitKey) {
      lastHitKey = key;
      Snd.fog();
      const foe = v.players.find(p => p.id === h.foe);
      tip(`⚔️ Bạn kín ${h.done} dãy — phủ ${h.n} ô sương mù lên ${foe ? cleanName(foe.name) : 'đối thủ'}!`);
    }
  }
  const n = (v.you.fog || []).length;
  if (n > lastFogN) { Snd.fog(); tip('🌫️ Đối thủ phủ sương mù lên lưới của bạn — kín 1 hàng/cột/khối để thổi tan, hoặc chờ tan!'); }
  lastFogN = n;
}
function render(v, prev) {
  if (!v) { resetGameState(); return; }
  const newGame = !cur || cur.gid !== v.gid;
  if (newGame) { resetGameState(); cur = v; startTimer(); }
  else cur = v;
  if (v.phase === 'ended') stopTimer();
  /* soundForPlace TRƯỚC khi vẽ lưới: nó ghi ô vừa được gợi ý vào `hinted`
     thì ô đó mới tô xanh ngay trong lần vẽ này (để sau thì phải đợi nước sau) */
  soundForPlace(v);
  drawGrid(v);
  drawPad(v);
  drawStatus(v);
  combatAlerts(v);
  drawNotesBtn();
  /* flashWrong SAU khi vẽ lưới: nó cần phần tử ô vừa vẽ để gắn class */
  flashWrong(v);
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
    title = '🎉 Giải xong!';
    body = `<p>Bạn giải xong câu đố <b>${DIFFS[v.difficulty].name}</b> trong <b>${time}</b> — sai <b>${v.you.mistakes}</b> lần, dùng <b>${v.you.hintsUsed}</b> gợi ý.</p><p class="note">Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.</p>`;
  } else if (v.endReason === 'resign' && v.you.failed) {
    Snd.lose();
    title = '🏳️ Bạn đã xin thua';
    body = `<p>Bạn đã xin thua ván này — đã điền được <b>${me.filled || v.givensCount}/81</b> ô trong <b>${time}</b>.</p><p class="note">Chơi 1 ván +2 xu.</p>`;
  } else if (v.you.failed) {
    Snd.lose();
    title = '😢 Hết 3 lần sai!';
    body = `<p>Bạn sai lần thứ 3 nên bị loại — đã điền được <b>${me.filled || v.givensCount}/81</b> ô trong <b>${time}</b>.</p><p class="note">Chơi 1 ván +2 xu.</p>`;
  } else if (winner) {
    title = `🏁 ${esc(cleanName(winner.name))} về đích trước!`;
    body = `<p>${esc(cleanName(winner.name))} giải xong trước trong <b>${time}</b> — bạn đã điền được <b>${me.filled || v.givensCount}/81</b> ô.</p><p class="note">Chơi 1 ván +2 xu — ván sau cố gắng nhanh tay hơn nhé!</p>`;
  } else {
    Snd.lose();
    title = '😢 Không ai thắng';
    body = `<p>Mọi người đều bị loại — không ai giải xong câu đố này.</p><p class="note">Chơi 1 ván +2 xu.</p>`;
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
$('#grid').addEventListener('click', e => {
  const b = e.target.closest('[data-cell]'); if (!b || !cur) return;
  if (cur.phase === 'ended' || cur.you.failed) { tip('Ván đã kết thúc.'); return; }
  if (paused) { tip('Đang tạm dừng — bấm ▶ Tiếp tục giải.'); return; }
  sel = +b.dataset.cell;
  Snd.pick();
  drawGrid(cur);
  drawStatus(cur);
});
$('#pad').addEventListener('click', e => {
  const b = e.target.closest('[data-num]'); if (!b || !cur) return;
  if (cur.phase === 'ended' || cur.you.failed) { tip('Ván đã kết thúc.'); return; }
  if (paused) { tip('Đang tạm dừng — bấm ▶ Tiếp tục giải.'); return; }
  if (sel == null) { tip('Chọn 1 ô trống trước đã.'); return; }
  const d = +b.dataset.num;
  if (cur.givens[sel]) { tip('Ô này có số cho sẵn, không đổi được.'); Snd.invalid(); return; }
  if (fogSet.has(sel)) { tip('Ô này đang bị sương mù che — kín 1 hàng/cột/khối để thổi tan, hoặc chờ tan rồi điền lại nha.'); Snd.invalid(); return; }
  if (notesMode) {
    if (cur.you.grid[sel]) { tip('Ô này đã điền rồi — xoá trước đã.'); Snd.invalid(); return; }
    ui.act({ type: 'note', cell: sel, value: d });
  } else {
    if (cur.you.grid[sel]) { tip('Ô này đã điền rồi — xoá trước đã.'); Snd.invalid(); return; }
    ui.act({ type: 'place', cell: sel, value: d });
  }
});
$('#btn-notes').onclick = () => { notesMode = !notesMode; drawNotesBtn(); Snd.pick(); };
$('#btn-erase').onclick = () => {
  if (!cur || sel == null || cur.phase === 'ended' || cur.you.failed) return;
  if (cur.givens[sel]) { tip('Ô này có số cho sẵn, không xoá được.'); return; }
  ui.act({ type: 'erase', cell: sel });
  Snd.pick();
};
$('#btn-hint').onclick = () => {
  if (!cur || cur.phase === 'ended' || cur.you.failed) return;
  if (cur.you.hintsLeft <= 0) { tip('Hết lượt gợi ý rồi.'); Snd.invalid(); return; }
  ui.act({ type: 'hint' });
};
$('#btn-pause').onclick = () => {
  if (!cur || mode !== 'solo' || cur.phase !== 'playing') return;
  if (!paused) { paused = true; pauseStart = Date.now(); $('#pause-veil').style.display = ''; $('#btn-pause').textContent = '▶ Tiếp tục'; }
  else { paused = false; pausedTotal += Date.now() - pauseStart; $('#pause-veil').style.display = 'none'; $('#btn-pause').textContent = '⏸️ Tạm dừng'; }
};
$('#btn-resume').onclick = () => $('#btn-pause').click();
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
  if (!cur || !$('#screen-game').classList.contains('active') || cur.phase !== 'playing' || cur.you.failed || paused) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const k = e.key;
  if (k >= '1' && k <= '9') {
    if (sel == null) { tip('Chọn 1 ô trống trước đã.'); return; }
    e.preventDefault();
    if (cur.givens[sel]) { tip('Ô này có số cho sẵn, không đổi được.'); Snd.invalid(); return; }
    if (notesMode) {
      if (cur.you.grid[sel]) { tip('Ô này đã điền rồi — xoá trước đã.'); Snd.invalid(); return; }
      ui.act({ type: 'note', cell: sel, value: +k });
    } else {
      if (cur.you.grid[sel]) { tip('Ô này đã điền rồi — xoá trước đã.'); Snd.invalid(); return; }
      ui.act({ type: 'place', cell: sel, value: +k });
    }
    return;
  }
  if (k === 'Backspace' || k === 'Delete') {
    if (sel == null) return;
    e.preventDefault();
    if (!cur.givens[sel] && cur.you.grid[sel]) ui.act({ type: 'erase', cell: sel });
    return;
  }
  if (k === 'n' || k === 'N') { notesMode = !notesMode; drawNotesBtn(); return; }
  if (k === 'h' || k === 'H') { $('#btn-hint').click(); return; }
  if (k === 'Escape') { sel = null; drawGrid(cur); return; }
  const mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[k];
  if (mv !== undefined) {
    e.preventDefault();
    if (sel == null) sel = 40;
    else {
      const r = (sel / 9) | 0, c = sel % 9;
      const nr = r + (mv === -9 ? -1 : mv === 9 ? 1 : 0);
      const nc = c + (mv === -1 ? -1 : mv === 1 ? 1 : 0);
      if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) sel = nr * 9 + nc;
    }
    Snd.pick();
    drawGrid(cur);
  }
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
  game: 'sudoku', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      /* đua với máy: bạn + 1 máy, cùng 1 câu đố */
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
