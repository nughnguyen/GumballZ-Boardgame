// 🤥 2 Thật 1 Giả – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Blokus:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Cách chơi: người kể viết 3 câu (2 thật, 1 giả) hoặc lấy bộ có sẵn,
// người còn lại đoán câu nào là giả trong 60 giây, rồi lật bài.
import { createGame, applyAction, viewFor, actors, serialize, deserialize, ROUNDS, SOLO_SETS, SOLO_WIN_CORRECT, GUESS_SECONDS } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=51';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=13';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'haithat1gia', min: 1, max: 6, maxSeats: 6, allowLocal: true,
  minMsg: '2 Thật 1 Giả cần 1–6 người: chơi đơn, thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: () => false,
  create: createGame, apply: applyAction, view: viewFor, serialize, deserialize, actors, bot: botAction,
  /* máy nghĩ 1,5–4s rồi mới kể/đoán */
  botDelay: () => 1500 + Math.random() * 2500,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu', 'Bánh', 'Cốm'],
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'solo'; /* solo | ai-easy | ai-hard | pvp | online */
let playerCount = 2; /* đấu máy: tổng số người (bạn + máy) */
try { mode = localStorage.getItem('gumballz-haithat1gia-mode') || 'solo'; } catch (e) {}
if (!['solo', 'ai-easy', 'ai-hard', 'pvp', 'online'].includes(mode)) mode = 'solo';
try {
  const c = +localStorage.getItem('gumballz-haithat1gia-count');
  if (c >= 2 && c <= 4) playerCount = c;
} catch (e) {}
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const countBtns = [...document.querySelectorAll('#count-seg [data-count]')];
function drawCount() {
  countBtns.forEach(b => { b.classList.toggle('on', +b.dataset.count === playerCount); b.setAttribute('aria-pressed', +b.dataset.count === playerCount); });
}
countBtns.forEach(b => b.addEventListener('click', () => {
  playerCount = +b.dataset.count; drawCount();
  try { localStorage.setItem('gumballz-haithat1gia-count', String(playerCount)); } catch (e) {}
  setMode(mode);
}));
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#count-box').style.display = (m === 'ai-easy' || m === 'ai-hard') ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'solo' ? '🎮 Bắt đầu chơi đơn' : m === 'ai-easy' ? `🤖 Bắt đầu chơi với máy Dễ (${playerCount} người)` : m === 'ai-hard' ? `🧠 Bắt đầu chơi với máy Khó (${playerCount} người)` : m === 'pvp' ? '👥 Mở phòng chuyền tay' : '🌐 Tạo phòng online';
  try { localStorage.setItem('gumballz-haithat1gia-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
drawCount();
setMode(mode);

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  const need2 = mode === 'online' || mode === 'pvp';
  $('#pcount').textContent = `${n}/6 người (chơi đơn 1 · nhiều người 2–6)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${i === 0 ? '<span class="seat-role">👑 Đi trước</span>' : ''}${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost || mode === 'solo' || mode.startsWith('ai-') ? '' : (n < 6
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  $('#opts').innerHTML = `<div class="opt"><b>🤥 3 vòng · mỗi vòng mọi người kể 1 lần</b><div class="role-note">Đoán đúng câu giả +10 điểm, người kể được +5 cho mỗi người đoán sai. Hết 60 giây chưa đoán thì 0 điểm. Chơi đơn: đoán 10 bộ có sẵn, đúng từ ${SOLO_WIN_CORRECT}/10 mới thắng.</div></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = need2 ? n < 2 : n < 1;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
  $('#wait-msg').textContent = need2 && n < 2 ? 'Cần ít nhất 2 người mới bắt đầu (đang có 1).' : 'Đang chờ chủ phòng bắt đầu…';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.net.raw;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
  else if (b.id === 'btn-addlocal') {
    const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó kể/đoán. Nhớ che màn hình trước khi đưa máy!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
let pvpTurn = null; /* chuyền tay: id người đang cầm máy */
let pvpCover = false; /* đang che màn hình để đưa máy */
let liePick = 1; /* câu giả đang chọn trong form kể (mặc định câu 2) */
let timerInt = null;
let timeLeftMs = GUESS_SECONDS * 1000;
let timerKey = '';

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
/* người chơi thật tiếp theo chưa đoán xong bộ đang kể (chuyền tay) */
function nextGuesser(v) {
  if (!v || v.solo || !v.current || v.stage !== 'guess') return null;
  const done = new Set(v.current.responded || []);
  const g = v.players.find(p => !p.isBot && p.id !== v.current.presenter && !done.has(p.id) && !p.resigned);
  return g ? g.id : null;
}
function pendingHuman(v) {
  if (!v || v.phase !== 'playing') return null;
  if (v.stage === 'submit') {
    const p = v.players.find(x => x.id === v.presenter);
    return p && !p.isBot ? p : null;
  }
  if (v.stage === 'guess') {
    const id = nextGuesser(v);
    const p = id && v.players.find(x => x.id === id);
    return p || null;
  }
  return null;
}
function stopTimer() { if (timerInt) { clearInterval(timerInt); timerInt = null; } }
function startTimer() {
  stopTimer();
  timerInt = setInterval(() => {
    const v = cur; if (!v || v.phase !== 'playing' || v.stage !== 'guess') { drawTimer(null); return; }
    const pid = controlPid(v);
    if (!pid) { drawTimer(null); return; }
    /* đã đoán xong rồi thì không đếm nữa */
    const already = v.solo ? (v.soloSet && v.soloSet.guessed != null) : (v.current && v.current.responded.includes(pid));
    if (already) { drawTimer(null); return; }
    const key = `${v.gid}|${v.stage}|${v.solo ? v.soloSet.index : v.presenter + ':' + v.round}|${pid}`;
    if (timerKey !== key) { timerKey = key; timeLeftMs = GUESS_SECONDS * 1000; }
    timeLeftMs -= 250;
    if (timeLeftMs <= 0) {
      timeLeftMs = 0;
      drawTimer(0);
      if (timerKey !== 'to|' + key) { timerKey = 'to|' + key; ui.actAs(pid, { type: 'timeout' }); Snd.timeout(); }
      return;
    }
    drawTimer(timeLeftMs);
  }, 250);
}
function drawTimer(ms) {
  const el = $('#timer'); if (!el) return;
  if (ms == null) { el.innerHTML = ''; return; }
  const s = Math.ceil(ms / 1000);
  const pct = Math.max(0, ms / (GUESS_SECONDS * 1000) * 100);
  el.innerHTML = `<span class="t-num${s <= 10 ? ' low' : ''}">⏱️ ${s}s</span><span class="t-bar${s <= 10 ? ' low' : ''}"><i style="width:${pct}%"></i></span>`;
}

const STMT_LETTER = ['A', 'B', 'C'];
function stmtHtml(v, stmts, opts) {
  /* opts: {clickable, myGuess, lie, guesses, reveal} */
  return `<div class="ht-stmts">${stmts.map((t, i) => {
    const cls = ['ht-stmt'];
    if (opts.reveal) {
      if (i === opts.lie) cls.push('right');
      else if (opts.myGuess === i) cls.push('wrong');
    } else if (opts.myGuess === i) cls.push('sel');
    const who = opts.reveal && opts.guesses
      ? Object.entries(opts.guesses).filter(([, g]) => g === i).map(([pid]) => {
          const p = v.players.find(x => x.id === pid);
          return p ? cleanName(p.name) : '';
        }).filter(Boolean)
      : [];
    return `<button type="button" class="${cls.join(' ')}" data-stmt="${i}" ${opts.clickable ? '' : 'disabled'}><span class="k">${STMT_LETTER[i]}</span><span>${esc(t)}${who.length ? `<span class="who">đoán: ${who.map(esc).join(', ')}</span>` : ''}${i === opts.lie && opts.reveal ? ' <b>← câu giả!</b>' : ''}</span></button>`;
  }).join('')}</div>`;
}

function render(v, prev) {
  cur = v;
  if (v.phase === 'playing' && v.stage === 'guess' && !timerInt) startTimer();
  if (v.phase !== 'playing' || v.stage !== 'guess') { stopTimer(); drawTimer(null); }
  const me = v.me;
  const pid = myPid(v) || me;
  const mine = v.players.find(p => p.id === pid);
  const ctrl = controlPid(v);

  /* âm thanh theo thay đổi */
  if (prev && prev.phase === 'playing' && v.phase === 'playing') {
    if (v.stage === 'reveal' && prev.stage !== 'reveal') Snd.reveal();
    if (mine && prev.players) {
      const prevMe = prev.players.find(p => p.id === pid);
      if (prevMe && mine.points > prevMe.points) Snd.correct();
    }
  }
  if (v.phase === 'ended' && prev && prev.phase === 'playing') {
    if (v.winner === me) Snd.winJingle(); else if (v.winner) Snd.lose();
  }

  /* dòng trạng thái */
  const presenter = v.players.find(p => p.id === v.presenter);
  $('#round').textContent = v.phase === 'ended'
    ? (v.winner ? `🏁 Trận đã kết thúc — ${cleanName((v.players.find(p => p.id === v.winner) || {}).name)} thắng trận!` : v.endReason === 'draw' ? '🤝 Trận hòa!' : '🏁 Trận đã kết thúc.')
    : v.solo
      ? `🤥 Bộ ${v.soloSet ? v.soloSet.index : 0}/${SOLO_SETS} · Đoán đúng ${v.you.correctGuesses} · ${v.you.points} điểm`
      : `🤥 Vòng ${v.round}/${v.rounds} · Đã kể ${v.setsDone}/${v.totalSets} bộ · ${v.stage === 'submit' ? `Tới lượt ${presenter ? cleanName(presenter.name) : '…'} kể` : v.stage === 'guess' ? 'Đang đoán câu giả…' : 'Đã lật bài!'}`;
  $('#status').innerHTML = v.players.map(p => {
    const turn = (!v.solo && v.stage === 'submit' && p.id === v.presenter) || (mode === 'pvp' && pvpTurn === p.id && v.phase === 'playing');
    return `<span class="stat ${p.id === me ? 'me' : ''} ${turn ? 'turn' : ''}">${esc(cleanName(p.name))}${p.id === me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}: <b>${p.points} điểm</b> · đoán đúng ${p.correctGuesses}/${p.totalGuesses}${p.setsPresented ? ` · đã kể ${p.setsPresented}` : ''}${p.resigned ? ' 🏳️' : ''}</span>`;
  }).join('');

  /* chuyền tay: che màn hình khi đổi người cầm máy */
  if (mode === 'pvp' && v.phase === 'playing' && pvpCover) {
    const holder = v.players.find(p => p.id === pvpTurn);
    $('#card-body').innerHTML = `<h2>📱 Đưa máy cho ${esc(cleanName(holder ? holder.name : '…'))}</h2><p>Nhớ che màn hình trước khi đưa — người kia chưa được thấy các câu!</p><button class="btn big pri" id="btn-pvp-ready">👋 Tôi là ${esc(cleanName(holder ? holder.name : '…'))}, bắt đầu</button>`;
    $('#stage-info').innerHTML = '';
    $('#btn-next').style.display = 'none';
    return;
  }

  const body = $('#card-body');
  $('#btn-next').style.display = 'none';

  if (v.phase === 'ended') {
    body.innerHTML = `<h2>🏁 Trận đã kết thúc</h2><p>${v.winner === me ? '🎉 Bạn thắng trận!' : v.winner ? `${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name))} thắng trận!` : v.endReason === 'draw' ? '🤝 Trận hòa!' : 'Bạn giữ ' + v.you.points + ' điểm.'}</p>`;
    $('#stage-info').innerHTML = '';
    return;
  }

  /* ----- chơi đơn ----- */
  if (v.solo) {
    const set = v.soloSet;
    if (!set) { body.innerHTML = '<h2>Đang tải bộ câu…</h2>'; return; }
    if (v.stage === 'guess') {
      body.innerHTML = `<h2>🤥 Bộ ${set.index} — câu nào là giả?</h2>${set.topic ? `<span class="topic">Chủ đề: ${esc(set.topic)}</span>` : ''}${stmtHtml(v, set.statements, { clickable: !!ctrl && set.guessed == null, myGuess: set.guessed })}`;
      $('#stage-info').innerHTML = set.guessed == null
        ? 'Bấm vào 1 trong 3 câu mà bạn nghĩ là câu giả — đoán đúng +10 điểm! ⏱️ 60 giây.'
        : 'Đã đoán xong — đang chờ lật bài…';
    } else { /* reveal */
      const correct = v.lastReveal && v.lastReveal.correct > 0;
      body.innerHTML = `<h2>${correct ? '✅ Đoán đúng!' : '❌ Đoán sai rồi!'}</h2>${set.topic ? `<span class="topic">Chủ đề: ${esc(set.topic)}</span>` : ''}${stmtHtml(v, set.statements, { reveal: true, lie: set.lie, myGuess: set.guessed, guesses: v.lastReveal ? v.lastReveal.guesses : null })}<div class="ht-reveal"><p class="res-line">${correct ? `+10 điểm — bạn đang có ${v.you.points} điểm, chuỗi đúng ${v.you.streak}.` : `Câu giả là "${esc(set.statements[set.lie])}" — bạn đang có ${v.you.points} điểm.`}</p></div>`;
      $('#stage-info').innerHTML = set.index >= SOLO_SETS ? 'Đã hết 10 bộ — xem kết quả!' : 'Bấm Tiếp tục sang bộ sau.';
      $('#btn-next').style.display = '';
    }
    $('#players').innerHTML = playerCards(v, me);
    $('#log').innerHTML = (v.log || []).slice(-8).map(l => `<p>${esc(l.text)}</p>`).join('');
    return;
  }

  /* ----- nhiều người: giai đoạn kể ----- */
  if (v.stage === 'submit') {
    const isMe = ctrl && v.presenter === pid;
    if (isMe) {
      body.innerHTML = `<h2>🎤 Tới lượt bạn kể!</h2><p>Viết 3 câu về mình — 2 thật, 1 giả — rồi đánh dấu câu nào là giả. Hoặc lấy 1 bộ có sẵn.</p>
      <div class="ht-submit">
        <label class="fld"><span>Câu 1</span><input type="text" id="sub-0" maxlength="120" placeholder="VD: Tôi từng ngã xe đạp gãy tay hồi lớp 4."></label>
        <label class="fld"><span>Câu 2</span><input type="text" id="sub-1" maxlength="120" placeholder="VD: Tôi không ăn được cay."></label>
        <label class="fld"><span>Câu 3</span><input type="text" id="sub-2" maxlength="120" placeholder="VD: Tôi từng đoạt giải vẽ cấp tỉnh."></label>
        <div class="fld"><span>Câu nào là câu giả?</span><div class="lie-pick">
          <button type="button" class="btn" data-lie="0">A là giả</button>
          <button type="button" class="btn" data-lie="1">B là giả</button>
          <button type="button" class="btn" data-lie="2">C là giả</button>
        </div></div>
        <div class="ht-actions-row">
          <button class="btn big pri" id="btn-submit-set">🎤 Kể 3 câu này</button>
          <button class="btn" id="btn-draw-set">🎲 Lấy bộ có sẵn</button>
        </div>
      </div>`;
      drawLiePick();
      $('#stage-info').innerHTML = 'Mẹo: câu giả hay nhất nghe "rất thật" nhưng hơi phóng đại một chút!';
    } else {
      const p = presenter;
      body.innerHTML = `<h2>🎤 Đang chờ ${esc(cleanName(p ? p.name : '…'))} kể…</h2><p>${p && p.isBot ? 'Máy đang nghĩ 3 câu để kể…' : 'Người kể đang viết 3 câu về mình (2 thật, 1 giả).'}</p>`;
      $('#stage-info').innerHTML = 'Chờ người kể xong, mọi người sẽ đoán câu nào là giả.';
    }
    $('#players').innerHTML = playerCards(v, me);
    $('#log').innerHTML = (v.log || []).slice(-8).map(l => `<p>${esc(l.text)}</p>`).join('');
    return;
  }

  /* ----- nhiều người: giai đoạn đoán ----- */
  if (v.stage === 'guess' && v.current) {
    const cur = v.current;
    const p = v.players.find(x => x.id === cur.presenter);
    const amPresenter = ctrl && cur.presenter === pid;
    const myGuess = v.you.myGuess;
    const responded = cur.respondedCount || 0;
    body.innerHTML = `<h2>🤥 ${esc(cleanName(p ? p.name : '…'))} kể — câu nào là giả?</h2>${cur.topic ? `<span class="topic">Chủ đề: ${esc(cur.topic)}</span>` : ''}${stmtHtml(v, cur.statements, { clickable: !!ctrl && !amPresenter && myGuess == null, myGuess })}`;
    $('#stage-info').innerHTML = amPresenter
      ? `Bạn đang kể — đã có ${responded}/${cur.totalGuessers} người đoán.`
      : myGuess != null
        ? `Bạn đã đoán câu ${STMT_LETTER[myGuess]} — đang chờ ${cur.totalGuessers - responded} người nữa…`
        : `Bấm vào 1 trong 3 câu mà bạn nghĩ là giả — đoán đúng +10 điểm! ⏱️ 60 giây. (Đã đoán: ${responded}/${cur.totalGuessers})`;
    $('#players').innerHTML = playerCards(v, me);
    $('#log').innerHTML = (v.log || []).slice(-8).map(l => `<p>${esc(l.text)}</p>`).join('');
    return;
  }

  /* ----- nhiều người: giai đoạn lật bài ----- */
  if (v.stage === 'reveal' && v.current) {
    const cur = v.current;
    const p = v.players.find(x => x.id === cur.presenter);
    const rev = v.lastReveal || {};
    body.innerHTML = `<h2>🔍 Lật bài của ${esc(cleanName(p ? p.name : '…'))}!</h2>${cur.topic ? `<span class="topic">Chủ đề: ${esc(cur.topic)}</span>` : ''}${stmtHtml(v, cur.statements, { reveal: true, lie: cur.lie, myGuess: v.you.myGuess, guesses: cur.guesses })}<div class="ht-reveal"><p class="res-line">Câu giả là <b>"${esc(cur.statements[cur.lie])}"</b> — ${rev.correct ?? 0} người đoán đúng, ${rev.fooled ?? 0} người bị lừa${p ? ` (+${(rev.fooled ?? 0) * 5} điểm cho ${esc(cleanName(p.name))})` : ''}.</p></div>`;
    $('#stage-info').innerHTML = 'Bấm Tiếp tục sang lượt kể sau.';
    $('#btn-next').style.display = '';
    $('#players').innerHTML = playerCards(v, me);
    $('#log').innerHTML = (v.log || []).slice(-8).map(l => `<p>${esc(l.text)}</p>`).join('');
    return;
  }

  body.innerHTML = '<h2>Đang tải…</h2>';

  function playerCards(vv, meId) {
    return vv.players.map(p => {
      const turn = (!vv.solo && vv.stage === 'submit' && p.id === vv.presenter) || (mode === 'pvp' && pvpTurn === p.id && vv.phase === 'playing');
      return `<div class="ht-player${turn ? ' turn' : ''} ${p.id === meId ? 'me' : ''}"><span class="mm-dot"></span><div><b>${esc(cleanName(p.name))}</b>${p.isBot ? ' 🤖' : ''}${p.id === meId ? ' (bạn)' : ''}${p.id === vv.winner ? ' 👑' : ''}<br>${p.points} điểm · đoán đúng ${p.correctGuesses}/${p.totalGuesses} · đã kể ${p.setsPresented}${p.resigned ? ' · 🏳️ đã xin thua' : ''}</div></div>`;
    }).join('');
  }
}

function drawLiePick() {
  document.querySelectorAll('.lie-pick [data-lie]').forEach(b => b.classList.toggle('sel', +b.dataset.lie === liePick));
}

/* ---------- tương tác ---------- */
$('#card-body').addEventListener('click', async e => {
  const v = cur; if (!v || v.phase !== 'playing') return;
  const lieBtn = e.target.closest('[data-lie]');
  if (lieBtn) { liePick = +lieBtn.dataset.lie; drawLiePick(); Snd.pick(); return; }
  if (e.target.closest('#btn-pvp-ready')) { pvpCover = false; if (cur) render(cur); return; }
  if (e.target.closest('#btn-draw-set')) {
    const pid = controlPid(v);
    if (!pid) { tip('Chưa tới lượt bạn kể.'); return; }
    const r = await ui.actAs(pid, { type: 'draw' });
    if (!r || !r.ok) { Snd.invalid(); tip((r && r.reason) || 'Không lấy được bộ có sẵn.'); }
    return;
  }
  if (e.target.closest('#btn-submit-set')) {
    const pid = controlPid(v);
    if (!pid) { tip('Chưa tới lượt bạn kể.'); return; }
    const statements = [0, 1, 2].map(i => (document.querySelector('#sub-' + i) || {}).value || '');
    const r = await ui.actAs(pid, { type: 'submit', statements, lie: liePick });
    if (!r || !r.ok) { Snd.invalid(); tip((r && r.reason) || 'Không kể được — kiểm tra lại 3 câu.'); }
    else Snd.correct();
    return;
  }
  const st = e.target.closest('[data-stmt]');
  if (!st) return;
  const pid = controlPid(v);
  if (!pid) { tip('Chưa tới lượt bạn đoán.'); return; }
  const idx = +st.dataset.stmt;
  const r = await ui.actAs(pid, { type: 'guess', idx });
  if (!r || !r.ok) { Snd.invalid(); tip((r && r.reason) || 'Không đoán được.'); return; }
  if (r.correct) Snd.correct(); else Snd.wrong();
  if (cur) render(cur);
});
$('#btn-next').onclick = async () => {
  const v = cur; if (!v || v.phase !== 'playing' || v.stage !== 'reveal') return;
  const pid = controlPid(v) || v.me;
  const r = await ui.actAs(pid, { type: 'next' });
  if (!r || !r.ok) tip((r && r.reason) || 'Chưa sang được lượt sau.');
  else {
    /* chuyền tay: người kể tiếp theo cầm máy */
    if (mode === 'pvp' && cur && cur.phase === 'playing') {
      const nx = pendingHuman(cur);
      if (nx) { pvpTurn = nx.id; pvpCover = true; }
    }
    Snd.pick();
  }
};
function openGuide() { ui.openModal(GUIDE_HTML); const c = $('#m-close'); if (c) c.onclick = ui.closeModal; }
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
$('#btn-log').onclick = () => {
  const v = cur, log = v ? v.log.slice().reverse() : [];
  ui.openModal(`<h2>📜 Nhật ký ván chơi</h2>${log.length ? `<ul class="logl">${log.map(l => `<li class="${l.kind || ''}">${esc(l.text)}</li>`).join('')}</ul>` : '<p style="text-align:center;color:var(--muted)">Chưa có gì.</p>'}<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
};
$('#btn-new').onclick = () => {
  if (!cur) return;
  if (!ui.isHost) { tip('Chỉ chủ phòng mở ván mới được.'); return; }
  ui.net.raw.start();
};
$('#btn-resign').onclick = async () => {
  const v = cur;
  if (!v || v.phase === 'ended') return;
  const r = await confirmBox('Nhận thua trận này? Ván kết thúc ngay, người còn lại có điểm cao nhất thắng.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  if (mode === 'online') ui.act({ type: 'resign' });
  else {
    const pid = mode === 'pvp' ? ((pendingHuman(v) || {}).id || v.me) : v.me;
    ui.actAs(pid, { type: 'resign' });
  }
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

function showEnd(v) {
  const me = v.me;
  const sum = (v.final && v.final.summary) || {};
  const rows = v.players.map(p => {
    const s = sum[p.id] || {};
    return `<tr><td>${esc(cleanName(p.name))}${p.id === me ? ' (bạn)' : ''}</td><td>${s.points ?? 0}</td><td>${s.correctGuesses ?? 0}/${s.totalGuesses ?? 0}</td><td>${s.fooled ?? 0}</td><td>${s.setsPresented ?? 0}</td><td>${s.bestStreak ?? 0}</td></tr>`;
  }).join('');
  const title = v.winner === me ? '👑 Bạn thắng trận!' : v.winner ? `🏁 ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name))} thắng trận!` : v.endReason === 'draw' ? '🤝 Trận hòa!' : '🏁 Trận đã kết thúc!';
  const sub = v.winner === me
    ? (v.solo ? `🎉 Bạn đoán đúng ${sum[me].correctGuesses}/${SOLO_SETS} bộ — thắng 2 Thật 1 Giả!` : `🎉 Bạn thắng với ${sum[me].points} điểm!`)
    : v.solo
      ? `Bạn đoán đúng ${sum[me].correctGuesses}/${SOLO_SETS} bộ — cần đúng từ ${SOLO_WIN_CORRECT}/10 mới thắng.`
      : `Bạn giữ ${sum[me].points} điểm — ${v.endReason === 'resign' ? 'đã xin thua' : v.endReason === 'draw' ? 'hòa' : 'trận đã kết thúc'}.`;
  ui.openModal(`<h2>${title}</h2><p style="text-align:center">${sub}</p>
    <table class="end-table"><tr><th>Người chơi</th><th>Điểm</th><th>Đoán đúng</th><th>Lừa được</th><th>Đã kể</th><th>Chuỗi tốt nhất</th></tr>${rows}</table>
    <div class="btns"><button class="btn big pri" id="m-again">🔄 Chơi lại</button><button class="btn" id="m-home">🏠 Về trang chủ</button></div>`);
  const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); if (ui.isHost) ui.net.raw.start(); else tip('Chờ chủ phòng mở ván mới.'); };
  const home = $('#m-home'); if (home) home.onclick = () => { location.href = '../'; };
}

const ui = gameKit({
  game: 'haithat1gia', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      /* đấu máy: bạn + (số người − 1) máy */
      for (let i = 0; i < playerCount - 1; i++) h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
    }
    /* solo: chỉ mình bạn; pvp: chủ phòng thêm người trong phòng chờ */
  },
  onLobby: (info, u, started) => {
    if (!started) renderLobby(info, u);
    if (started && mode === 'pvp' && !pvpTurn && info.players.length) pvpTurn = info.players[0].id;
  },
  onState: (v, prev) => {
    if (mode === 'pvp' && !pvpTurn && v.players.length) pvpTurn = v.players[0].id;
    /* chuyền tay: đổi người cầm máy khi lượt kể/đoán đổi sang người thật khác */
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
