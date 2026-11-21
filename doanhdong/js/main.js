// 🎭 Đoán Hành Động – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern 2 Thật 1 Giả:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Cách chơi trên giao diện: diễn viên bấm "Xem từ bí mật" rồi diễn
// bằng cơ thể (không nói); người đoán gõ từ vào ô — mỗi người chỉ
// được đoán 1 lần / từ; diễn viên bấm ✓ để chấm lượt đoán (engine
// tự kiểm tra đúng/sai). Chơi cùng máy: chuyền máy cho nhau, có màn
// che khi đổi người cầm máy để không lộ từ bí mật.
import { createGame, applyAction, viewFor, actors, serialize, deserialize, ROUNDS, SOLO_SETS, SOLO_WIN_CORRECT, GUESS_TIME, MAX_SKIPS, POINTS_CORRECT, POINTS_ACTOR } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet({
  game: 'doanhdong', min: 1, max: 6, maxSeats: 6, allowLocal: true,
  minMsg: 'Đoán Hành Động cần 1–6 người: chơi đơn, thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: () => false,
  create: createGame, apply: applyAction, view: viewFor, serialize, deserialize, actors, bot: botAction,
  /* máy đoán sau 1 khoảng chờ: Dễ 10–40s, Khó 5–20s; các hành động
     khác (bắt đầu diễn, chấm, sang lượt) thì máy làm nhanh */
  botDelay: (s, pid) => {
    const p = s.players.find(x => x.id === pid);
    const hard = p && p.level === 'hard';
    if (s.stage === 'guess' && s.current && s.current.actor !== pid && !s.current.guesses.some(g => g.pid === pid)) {
      return hard ? 5000 + Math.random() * 15000 : 10000 + Math.random() * 30000;
    }
    return 1200 + Math.random() * 1800;
  },
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu', 'Bánh', 'Cốm'],
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'solo'; /* solo | ai-easy | ai-hard | pvp | online */
let playerCount = 4; /* đấu máy: tổng số người (bạn + máy) */
try {
  const c = +localStorage.getItem('gumballz-doanhdong-count');
  if (c >= 2 && c <= 4) playerCount = c;
} catch (e) {}
function toggleBox(id) {
  for (const b of ['bot-row', 'room-box', 'local-row']) {
    const el = document.getElementById(b);
    if (el) el.style.display = b === id ? (el.style.display === 'none' ? '' : 'none') : 'none';
  }
}
$('#btn-solo').onclick = () => { mode = 'solo'; ui.startHost(true); };
$('#btn-vs-bot').onclick = () => toggleBox('bot-row');
$('#btn-online').onclick = () => { mode = 'online'; toggleBox('room-box'); };
$('#btn-local').onclick = () => toggleBox('local-row');
$('#btn-start-bot').onclick = () => {
  playerCount = +($('#sel-players').value || 4);
  try { localStorage.setItem('gumballz-doanhdong-count', String(playerCount)); } catch (e) {}
  mode = $('#sel-level').value === 'easy' ? 'ai-easy' : 'ai-hard';
  ui.startHost(true);
};
$('#btn-start-local').onclick = () => { mode = 'pvp'; ui.startHost(true); };

/* ---------- phòng chờ ---------- */
function renderLobby(info, u) {
  const n = info.players.length;
  const need = mode === 'solo' ? 1 : 2;
  $('#lobby-list').innerHTML = `<p><b>${n}/6 người</b> (cần ${need}–6)</p>` + info.players.map(p => {
    return `<div class="lobby-row">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'hard' ? 'Khó' : 'Dễ'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${u.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</div>`;
  }).join('') + (u.isHost && mode !== 'solo' && !mode.startsWith('ai-') && n < 6
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
    const hard = await confirmBox('Máy Khó đoán đúng ~65% số từ, máy Dễ ~35%.', { title: '🤖 Thêm máy', ok: 'Máy Khó', cancel: 'Máy Dễ' });
    h.addBot({ level: hard ? 'hard' : 'easy' });
  } else if (b.id === 'btn-addlocal') {
    const n = await promptBox('Mọi người chuyền máy cho nhau. Tới lượt diễn của ai thì đưa máy cho người đó!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
let pvpTurn = null, pvpCover = false;
let wordKey = '', coverRevealed = false;
let guessDraft = '', guessAreaKey = '';
let timerInt = null, timeLeftMs = GUESS_TIME * 1000, timerKey = '';

function myPid(v) {
  if (!v) return null;
  if (mode === 'pvp') return pvpTurn;
  return v.me;
}
/* người đang phải hành động mà mình điều khiển được (null nếu không phải lượt mình) */
function controlPid(v) {
  if (!v || v.phase !== 'playing') return null;
  const pid = myPid(v);
  if (!pid) return null;
  const p = v.players.find(x => x.id === pid);
  return p && !p.resigned && ui.controls(pid) ? pid : null;
}
/* người chơi thật tiếp theo phải hành động (chuyền tay): diễn viên lúc
   chuẩn bị diễn, người đoán chưa đoán lúc đang đoán, diễn viên lúc
   còn lượt đoán chờ chấm, bất kỳ ai lúc lật bài */
function pendingHuman(v) {
  if (!v || v.phase !== 'playing') return null;
  if (v.solo) {
    const p = v.players[0];
    return p && !p.isBot ? p : null;
  }
  if (v.stage === 'act') {
    const p = v.players.find(x => x.id === v.actor);
    return p && !p.isBot ? p : null;
  }
  if (v.stage === 'guess') {
    const cur = v.current;
    if (cur) {
      const done = new Set(cur.guesses.map(g => g.pid));
      const g = v.players.find(p => !p.isBot && p.id !== v.actor && !done.has(p.id) && !p.resigned);
      if (g) return g;
      if (cur.guesses.some(g => g.correct == null)) {
        const a = v.players.find(p => p.id === v.actor);
        return a && !a.isBot ? a : null;
      }
    }
    return null;
  }
  if (v.stage === 'reveal') {
    return v.players.find(p => !p.isBot && !p.resigned) || null;
  }
  return null;
}

/* ---------- đồng hồ 60 giây / từ (chơi nhiều người) ---------- */
function stopTimer() { if (timerInt) { clearInterval(timerInt); timerInt = null; } }
function startTimer() {
  stopTimer();
  timerInt = setInterval(() => {
    const v = cur;
    if (!v || v.phase !== 'playing' || v.stage !== 'guess' || v.solo) { drawTimer(null); return; }
    const key = `${v.gid}|${v.actor}|${v.round}|${v.wordsDone}`;
    if (timerKey !== key) { timerKey = key; timeLeftMs = GUESS_TIME * 1000; }
    timeLeftMs -= 250;
    if (timeLeftMs <= 0) {
      timeLeftMs = 0;
      drawTimer(0);
      const pid = controlPid(v);
      if (pid && timerKey !== 'to|' + key) { timerKey = 'to|' + key; ui.actAs(pid, { type: 'timeout' }); Snd.timeout(); }
      return;
    }
    drawTimer(timeLeftMs);
  }, 250);
}
function drawTimer(ms) {
  const el = $('#dd-timer');
  if (!el) return;
  const bar = $('#dd-progress');
  if (ms == null) { el.textContent = '⏱️ —'; el.classList.remove('low'); if (bar) bar.style.width = '0%'; return; }
  const s = Math.ceil(ms / 1000);
  el.textContent = `⏱️ ${s}s`;
  el.classList.toggle('low', s <= 10);
  if (bar) bar.style.width = `${Math.max(0, ms / (GUESS_TIME * 1000) * 100)}%`;
}

/* ---------- các vùng hiển thị ---------- */
function wordAreaHtml(v, ctrl) {
  if (v.solo || !v.current) return '';
  const cur = v.current;
  const isActor = ctrl === cur.actor;
  const actorP = v.players.find(p => p.id === cur.actor);
  const actorName = esc(cleanName(actorP ? actorP.name : '…'));
  if (v.stage === 'act') {
    if (isActor) {
      if (coverRevealed) {
        return `<div class="dd-wordbox"><div class="lbl">🎭 Từ bí mật của bạn — chỉ mình bạn thấy!</div><div class="word">${esc(cur.word)}</div><span class="cat">${esc(cur.cat)}</span><p class="hint">Diễn bằng cơ thể, không được nói! Bấm "Bắt đầu diễn" khi sẵn sàng.</p></div>`;
      }
      return `<div class="dd-wordbox covered"><div class="lbl">🎭 Từ bí mật của bạn</div><div class="word">🙈 Đã che lại</div><p class="hint">Bấm để xem từ, rồi diễn cho mọi người đoán.</p><button class="btn primary" id="btn-peek">👁️ Xem từ bí mật</button></div>`;
    }
    return `<div class="dd-wordbox covered"><div class="lbl">🎭 Diễn viên</div><div class="word">${actorName} đang xem từ bí mật…</div></div>`;
  }
  if (v.stage === 'guess') {
    if (isActor) {
      return `<div class="dd-wordbox"><div class="lbl">🎭 Từ của bạn</div><div class="word">${esc(cur.word)}</div><span class="cat">${esc(cur.cat)}</span><p class="hint">Mọi người đang đoán — bấm ✓ bên dưới để chấm lượt đoán đúng.</p></div>`;
    }
    return `<div class="dd-wordbox covered"><div class="lbl">🎭 Đang diễn</div><div class="word">🤫 ${actorName} đang diễn…</div><p class="hint">Nhìn diễn viên diễn rồi gõ từ bạn đoán vào ô bên dưới!</p></div>`;
  }
  return '';
}

function soloAreaHtml(v) {
  if (!v.solo || !v.soloSet) return '';
  const set = v.soloSet;
  let html = `<div class="dd-act">🎬 ${esc(set.act)}</div>`;
  html += `<div class="dd-opts">${set.options.map((o, i) => {
    let cls = 'dd-opt';
    if (set.revealed) {
      if (i === set.correctIdx) cls += ' right';
      else if (i === set.picked) cls += ' wrong';
    }
    return `<button type="button" class="${cls}" data-opt="${i}" ${set.revealed ? 'disabled' : ''}>${esc(o)}</button>`;
  }).join('')}</div>`;
  if (set.revealed) {
    html += `<p class="hint" style="text-align:center">${set.picked === set.correctIdx ? '✅ Đúng rồi! +10 điểm' : set.picked === -1 ? `⏰ Hết giờ — từ đúng là "${esc(set.word)}"` : `❌ Sai rồi — từ đúng là "${esc(set.word)}"`}</p>`;
  }
  return html;
}

function guessAreaHtml(v, ctrl) {
  if (v.solo || !v.current) return '';
  if (v.stage !== 'guess') return '';
  const cur = v.current;
  if (ctrl === cur.actor) {
    const pend = cur.guesses.filter(g => g.correct == null).length;
    return `<p class="hint" style="text-align:center">🎭 Bạn đang diễn — ${pend ? `có ${pend} lượt đoán đang chờ bạn chấm bên dưới.` : 'chưa có lượt đoán nào.'} Hết 60 giây thì từ tự lật bài.</p>`;
  }
  if (ctrl && !cur.guesses.some(g => g.pid === ctrl)) {
    return `<div class="dd-guess-row"><input id="dd-guess-input" type="text" placeholder="Gõ từ bạn đoán…" maxlength="60" autocomplete="off"><button class="btn primary" id="btn-send-guess">Đoán</button></div><p class="hint" style="text-align:center">Mỗi người chỉ được đoán 1 lần cho mỗi từ — nghĩ kỹ trước khi gõ!</p>`;
  }
  if (ctrl) return `<p class="hint" style="text-align:center">✅ Bạn đã đoán từ này rồi — đang chờ diễn viên chấm…</p>`;
  return `<p class="hint" style="text-align:center">Đang chờ mọi người đoán…</p>`;
}

function logHtml(v, ctrl) {
  let h = '';
  const cur = v.current;
  if (!v.solo && cur && (v.stage === 'guess' || v.stage === 'reveal')) {
    h += '<div class="dd-guess-list">';
    if (!cur.guesses.length) h += '<div class="lg">Chưa có lượt đoán nào.</div>';
    for (const g of cur.guesses) {
      const p = v.players.find(x => x.id === g.pid);
      const name = esc(cleanName(p ? p.name : '…'));
      const mark = g.correct === true ? '<span class="ok">✅ Đúng!</span>' : g.correct === false ? '<span class="no">❌ Sai</span>' : '';
      const confirmBtn = (g.correct == null && ctrl === cur.actor)
        ? `<button class="btn-confirm" data-confirm="${g.id}" title="Bấm để chấm lượt đoán này (engine tự kiểm tra đúng/sai)">✓ Chấm</button>` : '';
      const txt = g.text != null ? `<span class="txt">"${esc(g.text)}"</span>` : '<span class="txt">đã đoán (ẩn)</span>';
      h += `<div class="dd-guess-item"><span class="who">${name}</span>${txt}${mark}${confirmBtn}</div>`;
    }
    h += '</div>';
  }
  h += '<div class="dd-game-log">' + v.log.slice().reverse().map(l => `<div class="lg ${l.kind || ''}">${esc(l.text)}</div>`).join('') + '</div>';
  return h;
}

function revealHtml(v) {
  if (v.stage !== 'reveal' || !v.lastReveal) return '';
  const r = v.lastReveal;
  const actorP = r.actor ? v.players.find(p => p.id === r.actor) : null;
  const guesserP = r.guesser ? v.players.find(p => p.id === r.guesser) : null;
  let res = '';
  if (r.how === 'guessed') res = `✅ ${esc(cleanName(guesserP ? guesserP.name : '…'))} đoán đúng! +${POINTS_CORRECT} điểm, ${esc(cleanName(actorP ? actorP.name : '…'))} +${POINTS_ACTOR} điểm diễn.`;
  else if (r.how === 'timeout') res = '⏰ Hết giờ — không ai đoán ra.';
  else if (r.how === 'skip') res = `⏭️ ${esc(cleanName(actorP ? actorP.name : '…'))} đã bỏ qua từ này.`;
  else res = '❌ Chọn sai.';
  return `<div class="dd-reveal"><div class="lbl">Từ vừa rồi</div><div class="big-word">${esc(r.word)}</div><span class="cat">${esc(r.cat)}</span><div class="res">${res}</div></div>`;
}

function coverHtml(v) {
  if (mode !== 'pvp' || !pvpCover || v.phase !== 'playing') return '';
  const p = pendingHuman(v);
  if (!p) return '';
  const hint = v.stage === 'act' ? 'Tới lượt bạn diễn — bấm để xem từ bí mật rồi diễn cho mọi người đoán.'
    : v.stage === 'guess' ? 'Tới lượt bạn đoán — bấm để xem ô đoán (đừng nhìn từ bí mật!).'
    : 'Xem kết quả lật bài rồi bấm Tiếp theo.';
  return `<div class="dd-cover"><div class="dd-cover-card"><div class="dd-cover-icon">🙈</div><h3>Đưa máy cho ${esc(cleanName(p.name))}</h3><p>${hint}</p><button class="btn big primary" id="btn-cover-ok">Tôi là ${esc(cleanName(p.name))} — tiếp tục</button></div></div>`;
}

function render(v, prev) {
  cur = v;
  if (!v) { stopTimer(); drawTimer(null); endShownFor = ''; return; }
  if (v.phase === 'playing' && v.stage === 'guess' && !v.solo && !timerInt) startTimer();
  if (v.phase !== 'playing' || v.stage !== 'guess' || v.solo) { stopTimer(); drawTimer(null); }
  const ctrl = controlPid(v);
  const me = v.me;

  /* từ mới → che từ lại, xóa nháp ô đoán */
  const wk = v.solo ? `solo|${v.soloSet ? v.soloSet.index : 0}` : `${v.gid}|${v.actor}|${v.round}|${v.wordsDone}`;
  if (wk !== wordKey) { wordKey = wk; coverRevealed = false; guessDraft = ''; }

  /* âm thanh theo thay đổi */
  if (prev && prev.phase === 'playing' && v.phase === 'playing') {
    if (v.stage === 'reveal' && prev.stage !== 'reveal') Snd.reveal();
    const mine = v.players.find(p => p.id === (myPid(v) || v.me));
    const prevMe = prev.players.find(p => p.id === (myPid(prev) || prev.me));
    if (mine && prevMe && mine.points > prevMe.points) Snd.correct();
  }
  if (v.phase === 'ended' && prev && prev.phase === 'playing') {
    if (v.winner === me) Snd.winJingle(); else if (v.winner) Snd.lose();
  }

  /* dòng trạng thái */
  const actorP = !v.solo ? v.players.find(p => p.id === v.actor) : null;
  $('#dd-round').textContent = v.phase === 'ended'
    ? '🏁 Trận đã kết thúc'
    : v.solo
      ? `🎭 Từ ${v.soloSet ? v.soloSet.index : 0}/${SOLO_SETS} · Đúng ${v.you.correctGuesses} · ${v.you.points} điểm`
      : `🎭 Vòng ${v.round}/${v.rounds} · Diễn viên: ${actorP ? cleanName(actorP.name) : '…'} · Đã diễn ${v.wordsDone}/${v.totalWords} từ`;
  $('#dd-players').innerHTML = v.players.map(p => {
    return `<div class="dd-player ${p.id === me ? 'me' : ''} ${!v.solo && v.actor === p.id && v.phase === 'playing' ? 'actor' : ''}">${esc(cleanName(p.name))}${p.id === me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}${p.resigned ? ' 🏳️' : ''}${!v.solo && v.actor === p.id && v.phase === 'playing' ? ' 🎭' : ''} <span class="pts">${p.points}đ</span> · đoán đúng ${p.correctGuesses}${!v.solo ? ` · diễn trúng ${p.actedGuessed}/${p.actedWords}` : ''} · chuỗi ${p.bestStreak}</div>`;
  }).join('');

  $('#dd-word-area').innerHTML = wordAreaHtml(v, ctrl);
  $('#dd-solo-area').innerHTML = soloAreaHtml(v);
  /* ô đoán: chỉ vẽ lại khi lượt đoán đổi (giữ nguyên input khi đang gõ) */
  const gk = v.solo ? 'solo' : `${v.stage}|${ctrl || ''}|${v.current ? v.current.guesses.some(g => g.pid === ctrl) : false}|${v.gid}`;
  if (gk !== guessAreaKey) {
    guessAreaKey = gk;
    $('#dd-guess-area').innerHTML = guessAreaHtml(v, ctrl);
    const input = $('#dd-guess-input');
    if (input && guessDraft) input.value = guessDraft;
  }
  $('#dd-log').innerHTML = logHtml(v, ctrl);
  $('#dd-reveal').innerHTML = revealHtml(v);
  $('#dd-cover').innerHTML = coverHtml(v);

  /* nút hành động */
  const isActor = !v.solo && v.current && ctrl === v.current.actor;
  $('#btn-ready').style.display = (!v.solo && v.stage === 'act' && isActor) ? '' : 'none';
  const skipLeft = MAX_SKIPS - v.you.skipsUsed;
  $('#btn-skip').style.display = (!v.solo && (v.stage === 'act' || v.stage === 'guess') && isActor && skipLeft > 0) ? '' : 'none';
  if (skipLeft > 0) $('#btn-skip').textContent = `⏭️ Bỏ qua từ này (${skipLeft} lần)`;
  $('#btn-next').style.display = (v.stage === 'reveal' && ctrl) ? '' : 'none';
  $('#btn-resign').style.display = v.phase === 'playing' ? '' : 'none';
}

/* ---------- hộp kết thúc ---------- */
function showEnd(v) {
  const me = v.me;
  const sum = (v.final && v.final.summary) || {};
  const rows = v.players.map(p => {
    const s = sum[p.id] || {};
    return `<tr><td>${esc(cleanName(p.name))}${p.id === me ? ' (bạn)' : ''}</td><td>${s.points ?? 0}</td><td>${s.correctGuesses ?? 0}/${s.totalGuesses ?? 0}</td><td>${s.actedWords ?? 0}</td><td>${s.actedGuessed ?? 0}</td><td>${s.bestStreak ?? 0}</td><td>${s.skipsUsed ?? 0}</td></tr>`;
  }).join('');
  const title = v.winner === me ? '👑 Bạn thắng trận!' : v.winner ? `🏁 ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name))} thắng trận!` : v.endReason === 'draw' ? '🤝 Trận hòa!' : '🏁 Trận đã kết thúc!';
  const sub = v.winner === me
    ? (v.solo ? `🎉 Bạn đoán đúng ${sum[me].correctGuesses}/${SOLO_SETS} từ — thắng Đoán Hành Động!` : `🎉 Bạn thắng với ${sum[me].points} điểm!`)
    : v.solo
      ? `Bạn đoán đúng ${sum[me].correctGuesses}/${SOLO_SETS} từ — cần đúng từ ${SOLO_WIN_CORRECT}/10 mới thắng.`
      : `Bạn giữ ${sum[me].points} điểm — ${v.endReason === 'resign' ? 'đã xin thua' : v.endReason === 'draw' ? 'hòa' : 'trận đã kết thúc'}.`;
  ui.openModal(`<h2>${title}</h2><p style="text-align:center">${sub}</p>
    <table class="end-table"><tr><th>Người chơi</th><th>Điểm</th><th>Đoán đúng</th><th>Đã diễn</th><th>Diễn trúng</th><th>Chuỗi tốt nhất</th><th>Bỏ qua</th></tr>${rows}</table>
    <div class="btns"><button class="btn big pri" id="m-again">🔄 Chơi lại</button><button class="btn" id="m-home">🏠 Về trang chủ</button></div>`);
  const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); if (ui.isHost) ui.net.raw.start(); else tip('Chờ chủ phòng mở ván mới.'); };
  const home = $('#m-home'); if (home) home.onclick = () => { location.href = '../'; };
}

/* ---------- tương tác ---------- */
$('#dd-word-area').addEventListener('click', e => {
  if (e.target.closest('#btn-peek')) { coverRevealed = true; Snd.pick(); render(cur, cur); }
});
$('#dd-cover').addEventListener('click', e => {
  if (e.target.closest('#btn-cover-ok')) { pvpCover = false; Snd.pick(); render(cur, cur); }
});
$('#dd-solo-area').addEventListener('click', async e => {
  const b = e.target.closest('[data-opt]');
  if (!b || !cur || !cur.soloSet || cur.soloSet.revealed) return;
  const pid = controlPid(cur);
  if (!pid) return;
  const r = await ui.actAs(pid, { type: 'guess', idx: +b.dataset.opt });
  if (r && r.ok === false) { Snd.invalid(); tip(r.reason || 'Không chọn được.'); return; }
  if (r && r.correct) Snd.correct(); else if (r) Snd.wrong();
});
$('#dd-guess-area').addEventListener('input', e => {
  if (e.target && e.target.id === 'dd-guess-input') guessDraft = e.target.value;
});
$('#dd-guess-area').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target && e.target.id === 'dd-guess-input') { e.preventDefault(); sendGuess(); }
});
$('#dd-guess-area').addEventListener('click', e => {
  if (e.target.closest('#btn-send-guess')) sendGuess();
});
async function sendGuess() {
  const input = $('#dd-guess-input');
  if (!input || !cur) return;
  const text = input.value.trim();
  if (!text) { tip('Gõ từ bạn đoán vào ô trước đã.'); return; }
  const pid = controlPid(cur);
  if (!pid) { tip('Chưa tới lượt bạn đoán.'); return; }
  const r = await ui.actAs(pid, { type: 'guess', text });
  if (r && r.ok === false) { Snd.invalid(); tip(r.reason || 'Không đoán được.'); return; }
  guessDraft = '';
  Snd.pick();
}
$('#dd-log').addEventListener('click', async e => {
  const b = e.target.closest('[data-confirm]');
  if (!b || !cur) return;
  const pid = controlPid(cur);
  if (!pid) return;
  const r = await ui.actAs(pid, { type: 'confirm', guessId: +b.dataset.confirm });
  if (r && r.ok === false) { Snd.invalid(); tip(r.reason || 'Không chấm được.'); }
  else if (r && r.correct) Snd.correct(); else if (r) Snd.wrong();
});
$('#btn-ready').onclick = async () => {
  const pid = controlPid(cur); if (!pid) return;
  const r = await ui.actAs(pid, { type: 'ready' });
  if (r && r.ok === false) tip(r.reason || 'Chưa diễn được.'); else Snd.pick();
};
$('#btn-skip').onclick = async () => {
  const pid = controlPid(cur); if (!pid) return;
  const r = await ui.actAs(pid, { type: 'skip' });
  if (r && r.ok === false) { Snd.invalid(); tip(r.reason || 'Không bỏ qua được.'); } else Snd.pick();
};
$('#btn-next').onclick = async () => {
  const pid = controlPid(cur); if (!pid) return;
  const r = await ui.actAs(pid, { type: 'next' });
  if (r && r.ok === false) tip(r.reason || 'Chưa sang lượt được.'); else Snd.pick();
};
$('#btn-resign').onclick = async () => {
  const v = cur;
  if (!v || v.phase === 'ended') return;
  const r = await confirmBox('Nhận thua ván này? 2 người thì ván kết thúc ngay; 3+ người thì ván tiếp tục không có bạn.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  if (mode === 'online') ui.act({ type: 'resign' });
  else {
    const pid = mode === 'pvp' ? ((pendingHuman(v) || {}).id || v.me) : v.me;
    ui.actAs(pid, { type: 'resign' });
  }
};
function openGuide() { ui.openModal(GUIDE_HTML); const c = $('#m-close'); if (c) c.onclick = ui.closeModal; }
$('#btn-guide-top').onclick = openGuide;
$('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊 Âm thanh' : '🔇 Âm thanh'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'doanhdong', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      /* đấu máy: bạn + (số người − 1) máy */
      for (let i = 0; i < playerCount - 1; i++) h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
    }
    /* solo: chỉ mình bạn; pvp: chủ phòng thêm người trong phòng chờ */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => {
    if (mode === 'pvp' && !pvpTurn && v.players.length) pvpTurn = v.players[0].id;
    /* chuyền tay: đổi người cầm máy khi lượt diễn/đoán đổi sang người thật khác */
    if (mode === 'pvp' && v.phase === 'playing') {
      const nx = pendingHuman(v);
      if (nx && nx.id !== pvpTurn) {
        const prevPending = prev ? pendingHuman(prev) : null;
        if (!prevPending || prevPending.id !== nx.id) { pvpTurn = nx.id; pvpCover = true; }
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
