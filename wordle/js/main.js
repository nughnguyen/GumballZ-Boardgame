// 🟩 Wordle – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng
// shared/net/simplenet.js (cùng pattern Sudoku: chủ phòng giữ state, khách
// chỉ gửi action {type, word?}). Mỗi người đoán từ riêng, chỉ thấy tiến độ
// (số lượt đã đoán) của người khác — không ai thấy từ đã đoán hay đáp án
// của người khác. Thắng/thua/xu ghi qua watch() của simplenet — main.js
// KHÔNG gọi record() trực tiếp.
import { WORDS, VALID } from './words.js?v=1';
import { createGame, applyAction, viewFor, serialize, deserialize, actors, MAX_GUESSES, WORD_LEN } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=51';
import { gameKit, $, $$, esc, avatar, cleanName } from '../../shared/ui/gamekit.js?v=13';
import { confirmBox, toast as tip } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'wordle', min: 1, max: 4, maxSeats: 4, allowLocal: false,
  defaults: {},
  optOk: () => true,
  create: (players, opts) => createGame(players, opts),
  apply: applyAction, view: viewFor, serialize, deserialize, actors, bot: botAction,
  /* máy đoán 1 từ mỗi lượt; Máy Dễ đoán chậm, Máy Khó nhanh */
  botDelay: (s, pid) => {
    const p = s.players.find(x => x.id === pid);
    const hard = p && p.level === 'hard';
    return hard ? 2200 + Math.random() * 800 : 4500 + Math.random() * 2000;
  },
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Sữa', 'Bánh', 'Miu', 'Cún', 'Gấu'],
});

/* ---------- chế độ chơi ---------- */
let mode = 'solo';
try { mode = localStorage.getItem('gumballz-wordle-mode') || 'solo'; } catch (e) {}
if (!['solo', 'ai-easy', 'ai-hard', 'online'].includes(mode)) mode = 'solo';
function setMode(m) {
  mode = m;
  try { localStorage.setItem('gumballz-wordle-mode', m); } catch (e) {}
  $$('#screen-home .seg [data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m));
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'solo' ? '🟩 Bắt đầu đoán một mình' : m === 'ai-easy' ? '🤖 Đua với máy Dễ' : '🧠 Đua với máy Khó';
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
let cur = null, draft = '', endShown = '';
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
  cur = null; draft = ''; endShown = '';
  stopTimer();
}

/* ---------- chuỗi thắng (lưu máy) ---------- */
const REC_KEY = 'gumballz-wordle-record';
function loadRec() {
  try {
    const r = JSON.parse(localStorage.getItem(REC_KEY) || 'null');
    if (r && Array.isArray(r.dist) && r.dist.length === MAX_GUESSES) return r;
  } catch (e) {}
  return { played: 0, won: 0, streak: 0, best: 0, dist: [0, 0, 0, 0, 0, 0] };
}
function saveRec(r) { try { localStorage.setItem(REC_KEY, JSON.stringify(r)); } catch (e) {} }

/* ---------- vẽ bảng + bàn phím ---------- */
const KB_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
function keyState(v) {
  const st = {};
  const rank = { gray: 1, yellow: 2, green: 3 };
  for (const g of v.you.guesses) {
    for (let i = 0; i < WORD_LEN; i++) {
      const ch = g.word[i], m = g.marks[i];
      if (!st[ch] || rank[m] > rank[st[ch]]) st[ch] = m;
    }
  }
  return st;
}
function drawBoard(v) {
  const over = v.phase === 'ended' || v.you.failed;
  for (let r = 0; r < MAX_GUESSES; r++) {
    const row = $('#row-' + r);
    if (!row) continue;
    let html = '';
    const g = v.you.guesses[r];
    for (let i = 0; i < WORD_LEN; i++) {
      let cls = 'wd-tile', ch = '';
      if (g) { cls += ' ' + g.marks[i]; ch = g.word[i]; }
      else if (r === v.you.guesses.length && !over) {
        ch = draft[i] || '';
        if (ch) cls += ' filled';
        if (i === draft.length) cls += ' cur';
      }
      html += `<span class="${cls}">${ch}</span>`;
    }
    row.innerHTML = html;
    row.classList.toggle('shake', false);
  }
}
function drawKb(v) {
  const st = keyState(v);
  const over = v.phase === 'ended' || v.you.failed;
  $('#kb').innerHTML = KB_ROWS.map((row, ri) => {
    let keys = row.split('').map(ch => `<button type="button" class="wd-key ${st[ch] || ''}" data-key="${ch}" ${over ? 'disabled' : ''}>${ch}</button>`).join('');
    if (ri === 2) keys = `<button type="button" class="wd-key wide" data-key="ENTER" ${over ? 'disabled' : ''}>⏎ Đoán</button>` + keys + `<button type="button" class="wd-key wide" data-key="BACK" ${over ? 'disabled' : ''}>⌫ Xoá</button>`;
    return `<div class="wd-kb-row">${keys}</div>`;
  }).join('');
}
function drawStatus(v) {
  const rec = loadRec();
  const isRace = v.players.length > 1;
  $('#diff-chip').textContent = `${MAX_GUESSES} lượt`;
  $('#status').innerHTML = `<span class="stat">⏱️ <span id="timer-text">${fmt(elapsedMs(v))}</span></span><span class="stat">🔤 Lượt đoán: ${v.you.attempts}/${MAX_GUESSES}</span><span class="stat">🔥 Chuỗi thắng: ${rec.streak}</span>${v.you.failed ? '<span class="stat">😢 Bạn đã hết lượt</span>' : ''}`;
  const race = $('#race');
  if (isRace) {
    race.style.display = '';
    race.innerHTML = v.players.map(p => {
      const pct = Math.round((p.attempts / MAX_GUESSES) * 100);
      return `<div class="race-row ${p.id === v.me ? 'me' : ''} ${p.failed ? 'out' : ''}">${avatar(p.name, 30)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === v.me ? ' (bạn)' : ''}</span><span class="bar"><i style="width:${pct}%"></i></span><span class="cnt">${p.attempts}/${MAX_GUESSES}</span><span class="mist">${p.solved ? '✅ xong' : p.failed ? '❌ hết lượt' : ''}</span></div>`;
    }).join('');
  } else race.style.display = 'none';
  $('#round').textContent = isRace
    ? `🏁 Đua ${v.players.length} người · cùng 1 từ — ai đoán đúng với ít lượt hơn thì thắng (hoà thì ai xong trước thắng)!`
    : `🟩 Chơi đơn · đoán từ 5 chữ cái trong ${MAX_GUESSES} lượt — chuỗi thắng hiện tại: ${rec.streak}`;
  const log = $('#log');
  log.innerHTML = v.log.map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');
  log.scrollTop = log.scrollHeight;
}
function shakeRow(v) {
  const row = $('#row-' + v.you.guesses.length);
  if (!row) return;
  row.classList.remove('shake');
  void row.offsetWidth;
  row.classList.add('shake');
}

/* ---------- vẽ toàn ván ---------- */
function render(v, prev) {
  if (!v) { resetGameState(); return; }
  const newGame = !cur || cur.gid !== v.gid;
  if (newGame) { resetGameState(); cur = v; startTimer(); }
  else cur = v;
  draft = '';
  if (v.phase === 'ended') stopTimer();
  drawBoard(v);
  drawKb(v);
  drawStatus(v);
  if (v.phase === 'ended' && endShown !== v.gid) { endShown = v.gid; showEnd(v); }
}

/* ---------- modal kết thúc ---------- */
function showEnd(v) {
  const me = v.players.find(p => p.id === v.me) || {};
  const won = v.winner === v.me;
  const winner = v.players.find(p => p.id === v.winner);
  const time = fmt(elapsedMs(v));
  const rec = loadRec();
  rec.played++;
  if (won) {
    rec.won++;
    rec.streak++;
    rec.best = Math.max(rec.best, rec.streak);
    if (me.attempts >= 1 && me.attempts <= MAX_GUESSES) rec.dist[me.attempts - 1]++;
  } else rec.streak = 0;
  saveRec(rec);
  let title, body;
  if (won) {
    Snd.winJingle();
    title = '🎉 Đoán đúng!';
    body = `<p>Bạn đoán đúng từ <b>${esc(v.answer || '')}</b> chỉ sau <b>${me.attempts} lượt</b> trong <b>${time}</b> — chuỗi thắng hiện tại: <b>${rec.streak}</b> (kỷ lục: ${rec.best}).</p><p class="note">Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.</p>`;
  } else if (v.you.failed) {
    Snd.lose();
    title = '😢 Hết 6 lượt!';
    body = `<p>Bạn đoán sai 6 lần — đáp án là <b>${esc(v.answer || '')}</b>.</p><p class="note">Chơi 1 ván +2 xu — ván sau đoán từ nhiều nguyên âm trước nhé!</p>`;
  } else if (winner) {
    title = `🏁 ${esc(cleanName(winner.name))} thắng!`;
    body = `<p>${esc(cleanName(winner.name))} đoán đúng từ <b>${esc(v.answer || '')}</b> sau <b>${winner.attempts} lượt</b> trong <b>${time}</b> — bạn đã đoán <b>${me.attempts}/${MAX_GUESSES} lượt</b>.</p><p class="note">Chơi 1 ván +2 xu — ván sau cố gắng ít lượt hơn nhé!</p>`;
  } else {
    Snd.lose();
    title = '😢 Không ai thắng';
    body = `<p>Mọi người đều đoán sai 6 lần — đáp án là <b>${esc(v.answer || '')}</b>.</p><p class="note">Chơi 1 ván +2 xu.</p>`;
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
function submitDraft() {
  if (!cur || cur.phase !== 'playing' || cur.you.failed) return;
  if (draft.length !== WORD_LEN) { tip(`Từ phải có đúng ${WORD_LEN} chữ cái — còn thiếu ${WORD_LEN - draft.length} chữ.`); Snd.invalid(); shakeRow(cur); return; }
  if (!VALID.has(draft)) { tip('Từ này không có trong từ điển — thử từ khác.'); Snd.invalid(); shakeRow(cur); return; }
  if (cur.you.guesses.some(g => g.word === draft)) { tip('Bạn đã đoán từ này rồi.'); Snd.invalid(); shakeRow(cur); return; }
  ui.act({ type: 'guess', word: draft });
  Snd.place();
  draft = '';
}
function typeLetter(ch) {
  if (!cur || cur.phase !== 'playing' || cur.you.failed) return;
  if (draft.length >= WORD_LEN) return;
  draft += ch;
  Snd.pick();
  drawBoard(cur);
  drawKb(cur);
}
$('#kb').addEventListener('click', e => {
  const b = e.target.closest('[data-key]'); if (!b || !cur) return;
  const k = b.dataset.key;
  if (k === 'ENTER') submitDraft();
  else if (k === 'BACK') { draft = draft.slice(0, -1); Snd.pick(); drawBoard(cur); drawKb(cur); }
  else typeLetter(k);
});
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
  const k = e.key;
  if (k === 'Enter') { e.preventDefault(); submitDraft(); return; }
  if (k === 'Backspace') { e.preventDefault(); draft = draft.slice(0, -1); Snd.pick(); drawBoard(cur); drawKb(cur); return; }
  if (/^[a-zA-Z]$/.test(k)) { e.preventDefault(); typeLetter(k.toUpperCase()); return; }
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
  game: 'wordle', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      /* đua với máy: bạn + 1 máy, cùng 1 từ */
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
