// 🎨 Vẽ Truyền Tin – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern The Resistance:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Cách chơi trên giao diện: lượt VẼ thì vẽ lên canvas (chuột/chạm),
// bấm "Nộp bức vẽ"; lượt ĐOÁN thì nhìn bức vẽ rồi gõ từ vào ô đoán.
// Chơi cùng máy: chuyền máy cho nhau, có màn che khi đổi người cầm máy
// để không lộ từ/bức vẽ của người trước.
// Chế độ chuyền tay: host tự tính view cho người đang cầm máy bằng
// viewFor(ui.net.raw.state, pvpTurn) — broadcast của simplenet chỉ
// gửi cho host view của pid 'host'.
import { createGame, applyAction, viewFor, serialize, deserialize, actors, heldBook, STEP_TIME, SOLO_WIN_CORRECT, CANVAS_W, CANVAS_H } from './engine.js?v=1';
import { botAction, botDelay } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import { BOT_NAMES, PALETTE, BRUSH_SIZES } from './words.js?v=1';
import { Sfx } from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, cleanName, avatar } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet({
  game: 'vetruyentin', min: 1, max: 8, maxSeats: 8, allowLocal: true,
  minMsg: 'Vẽ Truyền Tin cần 4–8 người: chơi đơn (tự có máy), đấu máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: (k, v) => (k === 'botLevel' && (v === 'easy' || v === 'hard')) || (k === 'vtMode' && ['solo', 'race', 'multi'].includes(v)),
  create: createGame, apply: applyAction, view: viewFor, serialize, deserialize, actors, bot: botAction,
  /* máy đoán sau 5–20s (Dễ) / 3–10s (Khó) — botDelay ở bot.js */
  botDelay: (s, pid) => botDelay(s, pid),
  botNames: BOT_NAMES,
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'solo'; /* solo | race | pvp | online */
let botLevel = 'hard';
let localCount = 4;
try {
  const l = localStorage.getItem('gumballz-vetruyentin-level');
  if (l === 'easy' || l === 'hard') botLevel = l;
  const c = +localStorage.getItem('gumballz-vetruyentin-count');
  if (c >= 4 && c <= 8) localCount = c;
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
  try { localStorage.setItem('gumballz-vetruyentin-level', botLevel); } catch (e) {}
  mode = 'solo'; ui.startHost(true);
};
$('#btn-vs-bot').onclick = () => toggleBox('bot-row');
$('#btn-online').onclick = () => { mode = 'online'; toggleBox('room-box'); };
$('#btn-local').onclick = () => toggleBox('local-row');
$('#btn-start-bot').onclick = () => {
  botLevel = $('#sel-level').value === 'easy' ? 'easy' : 'hard';
  try { localStorage.setItem('gumballz-vetruyentin-level', botLevel); } catch (e) {}
  mode = 'race'; ui.startHost(true);
};
$('#btn-start-local').onclick = () => {
  localCount = +($('#sel-local-players').value || 4);
  try { localStorage.setItem('gumballz-vetruyentin-count', String(localCount)); } catch (e) {}
  mode = 'pvp'; ui.startHost(true);
};

/* ---------- phòng chờ ---------- */
function needCount() {
  if (mode === 'solo') return 1;
  if (mode === 'race') return 2;
  if (mode === 'pvp') return localCount;
  return 4;
}
function renderLobby(info, u) {
  const n = info.players.length;
  const need = needCount();
  $('#lobby-list').innerHTML = `<p><b>${n}/8 người</b> (cần ${need}–8)</p>` + info.players.map(p => {
    return `<div class="lobby-row">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'hard' ? 'Khó' : 'Dễ'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${u.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</div>`;
  }).join('') + (u.isHost && mode !== 'solo' && mode !== 'race' && n < 8
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
    const hard = await confirmBox('Máy Khó đoán đúng ~65%, máy Dễ ~35%. Máy vẽ bằng nét nguệch ngoạc ngẫu nhiên.', { title: '🤖 Thêm máy', ok: 'Máy Khó', cancel: 'Máy Dễ' });
    h.addBot({ level: hard ? 'hard' : 'easy' });
  } else if (b.id === 'btn-addlocal') {
    const n = await promptBox('Mọi người chuyền máy cho nhau. Tới lượt ai thì đưa máy cho người đó — màn hình sẽ che lại giữa các lượt!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
let pvpTurn = null, pvpCover = false, lastPendingId = null;
let chainKey = ''; /* key lật sổ đã vẽ — tránh vẽ lại chuỗi khi render lại */

/* người đang cầm máy (chế độ chuyền tay): người thật đầu tiên chưa nộp lượt này */
function pendingHumanRaw(raw) {
  if (!raw || raw.phase !== 'playing') return null;
  for (const p of raw.players) {
    if (p.isBot || (raw.prog[p.id] && raw.prog[p.id].resigned)) continue;
    if (heldBook(raw, p.id) >= 0) return p;
  }
  return null;
}
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

const ui = gameKit({
  game: 'vetruyentin', net: NET,
  offline: h => {
    if (mode === 'solo') {
      /* chơi đơn: engine tự thêm 1 máy làm người đoán; độ khó qua opts.botLevel */
      h.setOpt('vtMode', 'solo');
      h.setOpt('botLevel', botLevel);
    } else if (mode === 'race') {
      /* đấu máy: bạn + 1 máy (engine tự chơi sổ của máy bằng LCG) */
      h.setOpt('vtMode', 'race');
      h.setOpt('botLevel', botLevel);
      h.addBot({ level: botLevel });
    } else if (mode === 'pvp') {
      h.setOpt('vtMode', 'multi');
    }
    /* online: mặc định multi, không cần setOpt */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => {
    if (!v) { cur = null; endShownFor = ''; pvpTurn = null; pvpCover = false; lastPendingId = null; chainKey = ''; stopTimer(); render(null, null); return; }
    /* chuyền tay: tính lại view cho người đang cầm máy */
    if (mode === 'pvp') {
      const raw = ui.net && ui.net.raw && ui.net.raw.state;
      if (raw && raw.phase === 'playing') {
        if (!pvpTurn && raw.players.length) { pvpTurn = raw.players[0].id; lastPendingId = pvpTurn; }
        const nx = pendingHumanRaw(raw);
        if (nx && nx.id !== pvpTurn) {
          if (lastPendingId !== null && lastPendingId !== nx.id) pvpCover = true;
          pvpTurn = nx.id;
          lastPendingId = nx.id;
        }
        v = viewFor(raw, pvpTurn);
      }
    }
    render(v, prev);
    if (v.phase === 'ended') {
      stopTimer();
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

function openGuide() { ui.openModal(GUIDE_HTML); const c = $('#m-close'); if (c) c.onclick = ui.closeModal; }
$('#btn-guide-top').onclick = openGuide;
$('#btn-guide-home').onclick = openGuide;
const drawSoundBtn = () => { $('#btn-sound').textContent = Sfx.isEnabled() ? '🔊 Âm thanh' : '🔇 Âm thanh'; }; drawSoundBtn();
$('#btn-sound').onclick = () => { Sfx.setEnabled(!Sfx.isEnabled()); drawSoundBtn(); };

/* ---------- đồng hồ 120s mỗi lượt (chỉ chạy khi tới lượt mình và màn che đã mở) ---------- */
let timerInt = null, timerEnd = 0, timerKey = '';
function stopTimer() {
  if (timerInt) { clearInterval(timerInt); timerInt = null; }
  const el = $('#vt-timer');
  if (el) el.textContent = '';
}
function startTimer(v) {
  const key = v ? v.gid + '|' + v.step + '|' + v.phase + '|' + (pvpCover ? 'cover' : 'open') : '';
  if (key !== timerKey) {
    timerKey = key;
    stopTimer();
    if (v && v.phase === 'playing' && !pvpCover && controlPid(v)) {
      timerEnd = Date.now() + STEP_TIME * 1000;
      timerInt = setInterval(tickTimer, 250);
      tickTimer();
    }
  }
}
function tickTimer() {
  const el = $('#vt-timer');
  if (!cur || cur.phase !== 'playing' || !controlPid(cur)) { stopTimer(); return; }
  const left = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
  if (el) el.textContent = left > 0 ? `⏱️ ${left}s` : '⏰ Hết giờ!';
  if (left <= 0) {
    stopTimer();
    const pid = controlPid(cur);
    if (pid) ui.actAs(pid, { type: 'timeout' });
  }
}

/* ---------- canvas vẽ ---------- */
const cv = $('#vt-canvas');
let strokes = []; /* nét vẽ của lượt hiện tại (chỉ ở máy mình, chưa nộp) */
let curStroke = null;
let drawColor = '#1B1425', drawWidth = 8;
let drawKey = ''; /* gid|step|người cầm — đổi là reset nét vẽ */
function toCanvas(e) {
  const r = cv.getBoundingClientRect();
  return [Math.round((e.clientX - r.left) * CANVAS_W / r.width), Math.round((e.clientY - r.top) * CANVAS_H / r.height)];
}
function drawStrokes(canvas, list) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const st of list || []) {
    if (!st.pts || !st.pts.length) continue;
    ctx.strokeStyle = st.color || '#1B1425'; ctx.lineWidth = st.width || 8;
    if (st.pts.length === 1) {
      ctx.fillStyle = st.color || '#1B1425';
      ctx.beginPath(); ctx.arc(st.pts[0][0], st.pts[0][1], (st.width || 8) / 2, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(st.pts[0][0], st.pts[0][1]);
      for (let i = 1; i < st.pts.length; i++) ctx.lineTo(st.pts[i][0], st.pts[i][1]);
      ctx.stroke();
    }
  }
}
function updateStrokeCount() {
  const el = $('#vt-strokes');
  if (el) el.textContent = `${strokes.length} nét`;
}
cv.addEventListener('pointerdown', e => {
  if (!cur || cur.phase !== 'playing' || pvpCover) return;
  const ctrl = controlPid(cur);
  if (!ctrl || !cur.held || cur.held.kind !== 'draw') return;
  e.preventDefault();
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  curStroke = { color: drawColor, width: drawWidth, pts: [toCanvas(e)] };
});
cv.addEventListener('pointermove', e => {
  if (!curStroke) return;
  e.preventDefault();
  const p = toCanvas(e);
  const last = curStroke.pts[curStroke.pts.length - 1];
  if (last[0] !== p[0] || last[1] !== p[1]) curStroke.pts.push(p);
  drawStrokes(cv, [...strokes, curStroke]);
});
function endStroke() {
  if (!curStroke) return;
  if (curStroke.pts.length) strokes.push(curStroke);
  curStroke = null;
  drawStrokes(cv, strokes);
  updateStrokeCount();
  Sfx.draw();
}
cv.addEventListener('pointerup', endStroke);
cv.addEventListener('pointercancel', endStroke);
document.querySelectorAll('.vt-swatch').forEach(b => {
  b.onclick = () => {
    drawColor = b.dataset.color;
    document.querySelectorAll('.vt-swatch').forEach(x => x.classList.toggle('sel', x === b));
    Sfx.click();
  };
});
document.querySelectorAll('.vt-brush').forEach(b => {
  b.onclick = () => {
    drawWidth = +b.dataset.width || 8;
    document.querySelectorAll('.vt-brush').forEach(x => x.classList.toggle('sel', x === b));
    Sfx.click();
  };
});
$('#btn-undo').onclick = () => { strokes.pop(); drawStrokes(cv, strokes); updateStrokeCount(); Sfx.click(); };
$('#btn-clear').onclick = () => { strokes = []; drawStrokes(cv, strokes); updateStrokeCount(); Sfx.click(); };

/* ---------- hiển thị ---------- */
function logHtml(v) {
  return v.log.slice().reverse().map(l => `<div class="lg ${l.kind || ''}">${esc(l.text)}</div>`).join('');
}
function playersHtml(v, ctrl) {
  return v.players.map(p => {
    const done = p.submitted;
    return `<span class="vt-p ${done ? 'done' : ''} ${p.resigned ? 'out' : ''}">${esc(cleanName(p.name))}${p.id === ctrl ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''} · ${p.points}đ${done ? ' ✓' : ' …'}${p.resigned ? ' 🏳️' : ''}</span>`;
  }).join('');
}
function coverHtml(v) {
  if (mode !== 'pvp' || !pvpCover || v.phase !== 'playing') return '';
  const p = v.players.find(x => x.id === pvpTurn);
  if (!p) return '';
  return `<div class="vt-cover-card"><div class="home-icon">🙈</div><h2>Đưa máy cho ${esc(cleanName(p.name))}</h2><p>Tới lượt bạn ${v.stepKind === 'draw' ? 'vẽ' : 'đoán'} — đừng để người trước thấy từ/bức vẽ của bạn!</p><button class="btn big primary" id="btn-cover-ok">Tôi là ${esc(cleanName(p.name))} — tiếp tục</button></div>`;
}
/* vẽ lại toàn bộ chuỗi lật sổ (chỉ khi phase ended và key đổi) */
function renderChains(v) {
  const key = v.gid + '|' + v.seq;
  if (key === chainKey) return;
  chainKey = key;
  const box = $('#vt-chains');
  if (!v.books) { box.innerHTML = ''; return; }
  box.innerHTML = v.books.map((bk, bi) => {
    const owner = v.players.find(p => p.id === bk.owner);
    const steps = bk.entries.map((e, ei) => {
      if (e.type === 'word') return `<span class="vt-step word">📖 "${esc(e.word)}"</span>`;
      if (e.type === 'drawing') return `<span class="vt-step drawing"><canvas data-draw="${bi}:${ei}" width="200" height="125"></canvas><br><small>${e.simulated ? '🤖 phác thảo máy' : '✏️ ' + esc(cleanName((v.players.find(p => p.id === e.by) || {}).name || ''))} vẽ "${esc(e.word)}"${e.blank ? ' (trống)' : ''}</small></span>`;
      return `<span class="vt-step ${e.correct ? 'guess-ok' : 'guess-bad'}">${e.correct ? '✅' : '❌'} "${esc(e.text || '(trống)')}" — ${esc(cleanName((v.players.find(p => p.id === e.by) || {}).name || ''))}</span>`;
    }).join('<span class="vt-arrow">→</span>');
    return `<div class="vt-chain"><h3>📖 Sổ của ${esc(cleanName(owner ? owner.name : '…'))}</h3><div class="vt-steps">${steps}</div></div>`;
  }).join('');
  /* vẽ nét lên từng canvas nhỏ (tỉ lệ 200×125 so với 640×400) */
  box.querySelectorAll('canvas[data-draw]').forEach(c => {
    const [bi, ei] = c.dataset.draw.split(':').map(Number);
    const d = v.books[bi] && v.books[bi].entries[ei];
    const ctx = c.getContext('2d');
    ctx.save();
    ctx.scale(200 / CANVAS_W, 125 / CANVAS_H);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const st of (d && d.strokes) || []) {
      if (!st.pts || !st.pts.length) continue;
      ctx.strokeStyle = st.color || '#1B1425'; ctx.lineWidth = st.width || 8;
      if (st.pts.length === 1) {
        ctx.fillStyle = st.color || '#1B1425';
        ctx.beginPath(); ctx.arc(st.pts[0][0], st.pts[0][1], (st.width || 8) / 2, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(st.pts[0][0], st.pts[0][1]);
        for (let i = 1; i < st.pts.length; i++) ctx.lineTo(st.pts[i][0], st.pts[i][1]);
        ctx.stroke();
      }
    }
    ctx.restore();
  });
}

let lastBotGuessKey = '';
function render(v, prev) {
  cur = v;
  if (!v) { chainKey = ''; lastBotGuessKey = ''; return; }
  const ctrl = controlPid(v);
  const me = v.players.find(p => p.id === (ctrl || v.me));
  const myPoints = me ? me.points : 0;

  /* reset nét vẽ khi đổi lượt / đổi người cầm (tránh vẽ nhầm sang lượt sau — lỗi stale canvas) */
  const dk = `${v.gid}|${v.step}|${ctrl || ''}|${v.phase}`;
  if (dk !== drawKey) { drawKey = dk; strokes = []; curStroke = null; }

  /* âm thanh: máy vừa đoán (chơi đơn/đua) */
  if (v.lastBotGuess) {
    const bk = `${v.gid}|${v.step}|${v.lastBotGuess.text}|${v.lastBotGuess.correct}`;
    if (bk !== lastBotGuessKey) {
      lastBotGuessKey = bk;
      if (v.lastBotGuess.correct) Sfx.correct(); else Sfx.wrong();
    }
  }
  if (v.phase === 'ended' && prev && prev.phase === 'playing') {
    if ((v.winnerIds || []).includes(v.me)) Sfx.win(); else Sfx.lose();
  }

  /* dòng trạng thái */
  const total = v.totalSteps;
  $('#vt-round').textContent = v.phase === 'ended'
    ? '🏁 Đã lật sổ!'
    : `Lượt ${v.step + 1}/${total} · ${v.stepKind === 'draw' ? '✏️ Vẽ' : '🔍 Đoán'}`;
  $('#vt-score').textContent = (v.solo || v.race)
    ? `⭐ ${myPoints} điểm · giữ từ ${v.chainCorrect}/5`
    : `⭐ ${myPoints} điểm · đoán đúng ${me ? me.correctGuesses : 0}`;
  $('#vt-players').innerHTML = playersHtml(v, ctrl);
  $('#vt-log').innerHTML = logHtml(v);
  $('#vt-cover').innerHTML = coverHtml(v);

  const held = v.held;
  const myTurn = !!ctrl && !!held && v.phase === 'playing';
  const wordEl = $('#vt-word'), hintEl = $('#vt-hint');
  const guessRow = $('#vt-guess-row'), toolsEl = $('#vt-tools');
  const btnDraw = $('#btn-submit-draw'), btnNext = $('#btn-next'), btnResign = $('#btn-resign');

  if (v.phase === 'ended') {
    wordEl.textContent = '📖 Lật sổ — xem cả chuỗi!';
    hintEl.textContent = 'Từ gốc đi qua tay cả bàn đã thành gì? Kéo xuống xem từng quyển sổ.';
    guessRow.style.display = 'none';
    toolsEl.style.display = 'none';
    btnDraw.style.display = 'none';
    btnNext.style.display = '';
    btnNext.textContent = '🏆 Xem kết quả';
    btnResign.style.display = 'none';
    drawStrokes(cv, []);
    renderChains(v);
    startTimer(v);
    return;
  }

  btnNext.style.display = 'none';
  btnResign.style.display = '';

  if (myTurn && held.kind === 'draw') {
    wordEl.textContent = `✏️ Vẽ: ${held.word}`;
    hintEl.textContent = 'Vẽ từ này lên canvas — đừng viết chữ! Nộp trước khi hết giờ.';
    guessRow.style.display = 'none';
    toolsEl.style.display = '';
    btnDraw.style.display = '';
    btnDraw.disabled = false;
    drawStrokes(cv, [...strokes, ...(curStroke ? [curStroke] : [])]);
    updateStrokeCount();
  } else if (myTurn && held.kind === 'guess') {
    wordEl.textContent = '🔍 Bức vẽ này là gì?';
    hintEl.textContent = 'Nhìn kỹ bức vẽ rồi gõ từ bạn đoán vào ô bên dưới.';
    guessRow.style.display = '';
    toolsEl.style.display = 'none';
    btnDraw.style.display = 'none';
    drawStrokes(cv, held.drawing ? held.drawing.strokes : []);
    const inp = $('#vt-guess-input');
    if (inp && document.activeElement !== inp) { /* giữ nguyên khi đang gõ */ }
  } else {
    /* không phải lượt mình / đã nộp lượt này */
    const botTurn = (v.solo || v.race) && v.stepKind === 'guess';
    wordEl.textContent = botTurn ? '🤖 Máy đang đoán bức vẽ của bạn…' : (held ? '⏳ Chờ…' : '⏳ Bạn đã nộp — chờ mọi người nộp lượt này…');
    hintEl.textContent = botTurn ? 'Máy đoán đúng thì từ được giữ, đoán sai thì từ đổi thành từ máy đoán.' : 'Sổ đang chuyền sang trái — mỗi người cầm mỗi sổ đúng 1 lần.';
    guessRow.style.display = 'none';
    toolsEl.style.display = 'none';
    btnDraw.style.display = 'none';
    drawStrokes(cv, []);
  }

  /* máy vừa đoán gì (chơi đơn/đua) */
  const bg = $('#vt-bot-guess');
  if ((v.solo || v.race) && v.lastBotGuess) {
    const g = v.lastBotGuess;
    bg.innerHTML = g.correct
      ? `<span class="ok">🤖 Máy đoán: "${esc(g.text)}" — ✅ Đúng! Từ được giữ (+10)</span>`
      : `<span class="bad">🤖 Máy đoán: "${esc(g.text)}" — ❌ Sai! Từ đổi thành "${esc(g.text)}"</span>`;
  } else {
    bg.textContent = '';
  }

  startTimer(v);
}

/* ---------- hộp kết thúc ---------- */
function showEnd(v) {
  const me = v.me;
  const sum = (v.final && v.final.summary) || {};
  const won = (v.winnerIds || []).includes(me);
  let h;
  if (v.endReason === 'draw') h = '🤝 Trận hòa!';
  else if (v.endReason === 'resign') h = '🏳️ Trận đã kết thúc!';
  else if (v.solo && !won) h = '😢 Hết 5 lượt!';
  else if (won) h = '🏆 Bạn thắng!';
  else h = `🏆 ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name || 'Máy'))} thắng!`;
  const rows = v.players.map(p => {
    const q = sum[p.id] || {};
    const isWin = (v.winnerIds || []).includes(p.id);
    return `<div>${isWin ? '👑 ' : ''}${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''} — ${q.points || 0} điểm · đoán đúng ${q.correctGuesses || 0}/${q.totalGuesses || 0} · vẽ ${q.drawingsMade || 0} bức · giữ từ ${q.wordsKept || 0} lần · chuỗi dài nhất ${q.bestChain || 0}</div>`;
  }).join('');
  let reason = '';
  if (v.solo) reason = `Bạn giữ được từ ${sum[me] ? sum[me].wordsKept : 0}/5 lần (cần ≥${SOLO_WIN_CORRECT} để thắng).`;
  else if (v.endReason === 'draw') reason = 'Không ai hơn ai — chuỗi nào cũng "tam sao thất bản" như nhau.';
  else if (v.endReason === 'resign') reason = 'Có người xin thua — bị loại khỏi chuỗi, người còn lại thắng.';
  else reason = 'Nhiều điểm nhất thì thắng (hoà điểm thì so số lần đoán đúng).';
  ui.openModal(`<h2>${h}</h2><p>${reason}</p><div>${rows}</div><p class="hint">Kéo xuống xem từng quyển sổ đã "tam sao thất bản" ra sao!</p><div class="btns"><button class="btn primary" id="m-again">🔄 Chơi lại</button><button class="btn" id="m-close">Đóng</button></div>`);
  const c = $('#m-close'); if (c) c.onclick = ui.closeModal;
  const a = $('#m-again'); if (a) a.onclick = () => { ui.closeModal(); location.reload(); };
}

/* ---------- tương tác ---------- */
$('#vt-cover').addEventListener('click', e => {
  if (e.target.closest('#btn-cover-ok')) { pvpCover = false; Sfx.click(); render(cur, cur); }
});
$('#btn-submit-draw').onclick = async () => {
  const pid = controlPid(cur); if (!pid || !cur) return;
  const r = await ui.actAs(pid, { type: 'draw', strokes });
  if (r && r.ok === false) { tip(r.reason || 'Không nộp được bức vẽ.'); } else { strokes = []; Sfx.submit(); }
};
async function submitGuess() {
  const pid = controlPid(cur); if (!pid || !cur) return;
  const inp = $('#vt-guess-input');
  const text = inp ? inp.value.trim() : '';
  const r = await ui.actAs(pid, { type: 'guess', text });
  if (r && r.ok === false) { tip(r.reason || 'Không đoán được.'); } else { if (inp) inp.value = ''; Sfx.submit(); }
}
$('#btn-submit-guess').onclick = submitGuess;
$('#vt-guess-input').addEventListener('keydown', e => { if (e.key === 'Enter') submitGuess(); });
$('#btn-next').onclick = () => { if (cur && cur.phase === 'ended') showEnd(cur); };
$('#btn-resign').onclick = async () => {
  const pid = controlPid(cur); if (!pid) return;
  const r = await confirmBox('Xin thua = bị loại khỏi chuỗi: các lượt sau của bạn tự nộp trắng, sổ vẫn xoay bình thường. Còn đúng 1 người thì người đó thắng ngay. Chắc chắn xin thua?', { title: '🏳️ Xin thua?', ok: 'Xin thua', cancel: 'Ở lại', danger: true });
  if (!r) return;
  const rr = await ui.actAs(pid, { type: 'resign' });
  if (rr && rr.ok === false) tip(rr.reason || 'Không xin thua được.');
};
$('#btn-again').onclick = () => { location.reload(); };
