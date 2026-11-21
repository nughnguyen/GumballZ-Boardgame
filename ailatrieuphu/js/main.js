// 💰 Ai Là Triệu Phú – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Sudoku:
// đua cùng 1 bộ câu hỏi, mỗi người hành động độc lập, không khóa lượt).
// Cách chơi: bấm 1 phương án A/B/C/D để trả lời (30s mỗi câu), dùng
// trợ giúp ở hàng nút phía dưới, bấm 🛑 Dừng lại lấy tiền sau mỗi câu đúng.
import { createGame, applyAction, viewFor, actors, serialize, deserialize, LADDER, SAFE_LEVELS, TIME_PER_QUESTION, QUESTION_COUNT } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
import { toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'ailatrieuphu', min: 1, max: 2, maxSeats: 2, allowLocal: true,
  minMsg: 'Ai Là Triệu Phú cần 1–2 người: chơi đơn, thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: () => false,
  create: createGame, apply: applyAction, view: viewFor, serialize, deserialize, actors, bot: botAction,
  /* máy nghĩ 3–8s (Khó) hoặc 8–20s (Dễ) rồi mới trả lời — đua ai nhanh hơn */
  botDelay: (s, pid) => {
    const p = s.players.find(x => x.id === pid);
    return p && p.level === 'hard' ? 3000 + Math.random() * 5000 : 8000 + Math.random() * 12000;
  },
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu', 'Bánh', 'Cốm'],
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'solo'; /* solo | ai-easy | ai-hard | pvp | online */
try { mode = localStorage.getItem('gumballz-ailatrieuphu-mode') || 'solo'; } catch (e) {}
if (!['solo', 'ai-easy', 'ai-hard', 'pvp', 'online'].includes(mode)) mode = 'solo';
const modeBtns = [...document.querySelectorAll('[data-mode]')];
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'solo' ? '🎮 Bắt đầu chơi đơn' : m === 'ai-easy' ? '🤖 Bắt đầu đua với máy Dễ' : m === 'ai-hard' ? '🧠 Bắt đầu đua với máy Khó' : m === 'pvp' ? '👥 Mở phòng chuyền tay' : '🌐 Tạo phòng online';
  try { localStorage.setItem('gumballz-ailatrieuphu-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
setMode(mode);

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  const need2 = mode === 'online' || mode === 'pvp';
  $('#pcount').textContent = `${n}/2 người (chơi đơn 1 · đua 2)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${i === 0 ? '<span class="seat-role">👑 Đi trước</span>' : ''}${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost || mode === 'solo' || mode.startsWith('ai-') ? '' : (n < 2
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  $('#opts').innerHTML = `<div class="opt"><b>💰 Thang tiền thưởng</b><div class="role-note">15 câu hỏi (Dễ → Vừa → Khó), mỗi câu 30 giây. Mốc an toàn câu 5 (1.000.000đ) và câu 10 (14.000.000đ). Đua 2 người: ai nhiều tiền hơn thắng, hòa tiền thì ai trả lời nhanh hơn thắng.</div></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = need2 ? n < 2 : n < 1;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
  $('#wait-msg').textContent = need2 && n < 2 ? 'Cần 2 người mới đua được (đang có 1).' : 'Đang chờ chủ phòng bắt đầu…';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.net.raw;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
  else if (b.id === 'btn-addlocal') {
    const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó trả lời. Nhớ che màn hình trước khi đưa máy!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
let holdRender = false; /* đang chiếu kết quả đáp án — giữ màn hình 1,5s */
let pvpTurn = null; /* chuyền tay: id người đang cầm máy */
let pvpCover = false; /* đang che màn hình để đưa máy */
const localLife = {}; /* dữ liệu trợ giúp của từng người (50:50/gọi điện/khán giả) — lấy từ kết quả hành động, để vẽ cho người chơi thứ 2 ở chế độ chuyền tay */
const timeLeft = {}; /* thời gian còn lại (ms) của từng người cho câu hiện tại */
let qKey = '';
let timerInt = null;
const fmtVND = n => (n || 0).toLocaleString('vi-VN') + 'đ';
const OPT_LETTER = ['A', 'B', 'C', 'D'];

function myPid(v) {
  if (!v) return null;
  if (mode === 'pvp') return pvpTurn;
  return v.me;
}
function controlPid(v) {
  if (!v || v.phase !== 'playing') return null;
  const pid = myPid(v);
  if (!pid) return null;
  const p = v.players.find(x => x.id === pid);
  return p && !p.done && ui.controls(pid) ? pid : null;
}
function pendingHuman(v) {
  if (!v || v.phase !== 'playing') return null;
  const pid = myPid(v);
  const p = pid && v.players.find(x => x.id === pid);
  return p && !p.isBot ? p : null;
}
function stopTimer() { if (timerInt) { clearInterval(timerInt); timerInt = null; } }
function startTimer() {
  stopTimer();
  timerInt = setInterval(() => {
    const v = cur; if (!v || v.phase !== 'playing') return;
    const pid = controlPid(v);
    if (!pid) { drawTimer(null); return; }
    const actP = v.players.find(p => p.id === pid) || {};
    const key = `${pid}|${actP.question ? actP.question.q : ''}|${actP.qLevel || 0}`;
    if (qKey !== key) { qKey = key; timeLeft[pid] = TIME_PER_QUESTION * 1000; /* câu mới (kể cả Đổi câu hỏi) → đếm lại 30s; đổi lượt chuyền tay thì qKey không đổi nên giờ còn lại được giữ nguyên */ }
    timeLeft[pid] -= 250;
    if (timeLeft[pid] <= 0) {
      timeLeft[pid] = 0;
      drawTimer(0);
      const sentKey = 'to|' + key;
      if (qKey !== sentKey) { qKey = sentKey; ui.actAs(pid, { type: 'timeout' }); Snd.timeout(); }
      return;
    }
    drawTimer(timeLeft[pid]);
  }, 250);
}
function drawTimer(ms) {
  const el = $('#timer'); if (!el) return;
  if (ms == null) { el.innerHTML = ''; return; }
  const s = Math.ceil(ms / 1000);
  const pct = Math.max(0, ms / (TIME_PER_QUESTION * 1000) * 100);
  el.innerHTML = `<span class="t-num${s <= 10 ? ' low' : ''}">⏱️ ${s}s</span><span class="t-bar${s <= 10 ? ' low' : ''}"><i style="width:${pct}%"></i></span>`;
}

function ladderHtml(v, pid) {
  const me = v.players.find(p => p.id === pid);
  const level = me ? me.qLevel : 0;
  let html = '';
  for (let i = QUESTION_COUNT - 1; i >= 0; i--) {
    const n = i + 1;
    const cls = n <= level ? 'done' : n === level + 1 ? 'cur' : '';
    const safe = SAFE_LEVELS.includes(n) ? ' 🔒' : '';
    html += `<div class="lad-row ${cls} ${SAFE_LEVELS.includes(n) ? 'safe' : ''}"><span>Câu ${n}${safe}</span><span>${fmtVND(LADDER[i])}</span></div>`;
  }
  return html;
}

function render(v, prev) {
  cur = v;
  if (holdRender) return;
  if (v.phase === 'playing' && !timerInt) startTimer();
  if (v.phase === 'ended') { stopTimer(); drawTimer(null); }
  const me = v.me;
  const pid = myPid(v) || me;
  const mine = v.players.find(p => p.id === pid);
  const opp = v.players.find(p => p.id !== pid);
  /* dữ liệu của người đang chơi: ở solo/AI/online là v.you; ở chuyền tay
     có thể là người chơi thứ 2 — lấy từ mục players trong view (câu hỏi
     không kèm đáp án) + dữ liệu trợ giúp lưu local từ kết quả hành động */
  const actYou = pid === me ? v.you : {
    question: (mine && mine.question) || null,
    lifelines: (mine && mine.lifelines) || {},
    used50: (localLife[pid] && localLife[pid].used50) || null,
    phoneHint: (localLife[pid] && localLife[pid].phoneHint != null) ? localLife[pid].phoneHint : null,
    audience: (localLife[pid] && localLife[pid].audience) || null,
    level: (mine && mine.qLevel) || 0, prize: (mine && mine.prize) || 0, done: !!(mine && mine.done),
  };

  /* âm thanh theo thay đổi */
  if (prev && prev.phase === 'playing') {
    const prevMe = prev.players.find(p => p.id === pid);
    if (mine && prevMe) {
      if (mine.qLevel > prevMe.qLevel) { Snd.correct(); if (SAFE_LEVELS.includes(mine.qLevel)) Snd.milestone(); }
      if (mine.done && !prevMe.done && !mine.finished) Snd.wrong();
    }
  }
  if (v.phase === 'ended' && prev && prev.phase === 'playing') {
    if (v.winner === me) Snd.winJingle(); else if (v.winner) Snd.lose();
  }

  /* dòng trạng thái */
  $('#round').textContent = v.phase === 'ended'
    ? (v.winner ? `🏁 Trận đã kết thúc — ${cleanName((v.players.find(p => p.id === v.winner) || {}).name)} thắng với ${fmtVND((v.players.find(p => p.id === v.winner) || {}).prize)}!` : v.endReason === 'draw' ? '🤝 Trận hòa!' : `🏁 Trận đã kết thúc — bạn giữ ${fmtVND(v.you.prize)}.`)
    : (mine && mine.done
      ? `⏳ Bạn đã dừng ở ${fmtVND(mine.prize)} — đang chờ ${opp ? cleanName(opp.name) : 'đối thủ'} chơi nốt…`
      : `💰 Câu ${mine ? mine.qLevel + 1 : 1}/15 · Bạn đang có ${fmtVND(mine ? mine.prize : 0)}`);
  $('#status').innerHTML = v.players.map(p => {
    const done = p.done ? (p.stopped ? ' 🛑 đã dừng' : p.resigned ? ' 🏳️ đã xin thua' : ' · hết lượt') : '';
    return `<span class="stat ${p.id === me ? 'me' : ''}">${esc(cleanName(p.name))}${p.id === me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}: <b>câu ${p.qLevel}/15 · ${fmtVND(p.prize)}</b>${done}</span>`;
  }).join('');

  $('#ladder').innerHTML = ladderHtml(v, pid);

  /* chuyền tay: che màn hình khi đổi lượt */
  if (mode === 'pvp' && v.phase === 'playing' && pvpCover && opp && !opp.done) {
    $('#q-text').textContent = `📱 Đưa máy cho ${cleanName(opp.name)} — nhớ che màn hình trước khi đưa!`;
    $('#q-opts').innerHTML = `<button class="btn big pri" id="btn-pvp-ready">👋 Tôi là ${esc(cleanName(opp.name))}, bắt đầu trả lời</button>`;
    $('#timer').innerHTML = '';
    $('#life-info').innerHTML = '';
    $('#stage-info').innerHTML = '';
    $('#btn-stop').disabled = true;
    document.querySelectorAll('#lifelines .life').forEach(b => b.disabled = true);
    return;
  }

  /* câu hỏi của người đang chơi */
  const q = actYou.question;
  const done = actYou.done;
  if (v.phase === 'ended' || done || !q) {
    $('#q-text').textContent = v.phase === 'ended'
      ? (v.winner === me ? `🎉 Bạn thắng với ${fmtVND(v.you.prize)}!` : v.winner ? `${cleanName((v.players.find(p => p.id === v.winner) || {}).name)} thắng với ${fmtVND((v.players.find(p => p.id === v.winner) || {}).prize)}.` : v.endReason === 'draw' ? '🤝 Trận hòa!' : `🏁 Trận đã kết thúc — bạn giữ ${fmtVND(v.you.prize)}.`)
      : done ? `Bạn đã dừng ở ${fmtVND(actYou.prize)} — đang chờ đối thủ chơi nốt…` : 'Đang tải câu hỏi…';
    $('#q-opts').innerHTML = '';
    $('#timer').innerHTML = '';
    document.querySelectorAll('#lifelines .life').forEach(b => b.disabled = true);
    $('#btn-stop').disabled = true;
  } else {
    $('#q-text').textContent = `Câu ${q.level}: ${q.q}`;
    const removed = new Set(actYou.used50 || []);
    $('#q-opts').innerHTML = q.options.map((o, i) => {
      const off = removed.has(i);
      return `<button type="button" class="at-opt" data-opt="${i}" ${off ? 'disabled' : ''}><span class="k">${OPT_LETTER[i]}</span><span>${esc(o)}</span></button>`;
    }).join('');
    document.querySelectorAll('#lifelines .life').forEach(b => {
      const k = b.dataset.life;
      const used = actYou.lifelines[k];
      b.disabled = !!used || !controlPid(v);
      b.classList.toggle('used', !!used);
    });
    $('#btn-stop').disabled = actYou.level < 1 || !controlPid(v);
    /* thông tin trợ giúp */
    let info = '';
    if (actYou.used50) info += '✂️ Đã loại 2 phương án sai — chỉ còn 2 phương án. ';
    if (actYou.phoneHint != null) info += `📞 Người thân gợi ý: <b>phương án ${OPT_LETTER[actYou.phoneHint]}</b>. `;
    if (actYou.audience) {
      info += '📊 Khán giả bình chọn:<br>' + actYou.audience.map((p, i) => `<span class="aud-bar"><b>${OPT_LETTER[i]}</b><span class="ab"><i style="width:${p}%"></i></span>${p}%</span>`).join('');
    }
    $('#life-info').innerHTML = info;
    $('#stage-info').innerHTML = `Còn <b>${actYou.lifelines ? 4 - Object.values(actYou.lifelines).filter(Boolean).length : 4}</b> quyền trợ giúp · Trả lời đúng câu này được <b>${fmtVND(q.prizeNext)}</b>${SAFE_LEVELS.includes(q.level) ? ' · <b>🔒 mốc an toàn</b>' : ''}`;
  }

  /* người chơi */
  $('#players').innerHTML = v.players.map(p => {
    const turn = mode === 'pvp' && pvpTurn === p.id && v.phase === 'playing' ? ' turn' : '';
    return `<div class="at-player${turn} ${p.id === me ? 'me' : ''}"><span class="mm-dot"></span><div><b>${esc(cleanName(p.name))}</b>${p.isBot ? ' 🤖' : ''}${p.id === me ? ' (bạn)' : ''}<br>Câu ${p.qLevel}/15 · ${fmtVND(p.prize)} · đúng ${p.correct} · ⏱️ ${(p.timeMs / 1000).toFixed(1)}s · 🆘 ${p.lifelinesUsed}/4</div></div>`;
  }).join('');
  $('#log').innerHTML = (v.log || []).slice(-8).map(l => `<p>${esc(l.text)}</p>`).join('');

  if (v.phase === 'ended') {
    const k = v.gid + '|' + v.seq;
    if (endShownFor !== k) { endShownFor = k; showEnd(v); }
  }
}

function showEnd(v) {
  const me = v.me;
  const sum = (v.final && v.final.summary) || {};
  const rows = v.players.map(p => {
    const s = sum[p.id] || {};
    return `<tr><td>${esc(cleanName(p.name))}${p.id === me ? ' (bạn)' : ''}</td><td>${s.level ?? 0}/15</td><td>${s.correct ?? 0}</td><td>${fmtVND(s.prize || 0)}</td><td>${((s.timeMs || 0) / 1000).toFixed(1)}s</td></tr>`;
  }).join('');
  const title = v.winner === me ? '👑 Bạn thắng trận!' : v.winner ? `🏁 ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name))} thắng trận!` : v.endReason === 'draw' ? '🤝 Trận hòa!' : '🏁 Trận đã kết thúc!';
  const sub = v.winner === me && (sum[me] || {}).level >= QUESTION_COUNT
    ? '🎉 Bạn đã trả lời đúng cả 15 câu — 150.000.000 đồng!'
    : `Bạn giữ ${fmtVND(v.you.prize)} — ${v.endReason === 'stop' ? 'dừng lại đúng lúc' : v.endReason === 'timeout' ? 'hết giờ' : v.endReason === 'resign' ? 'đã xin thua' : v.endReason === 'draw' ? 'hòa' : 'trả lời sai'}.`;
  ui.openModal(`<h2>${title}</h2><p style="text-align:center">${sub}</p>
    <table class="end-table"><tr><th>Người chơi</th><th>Câu</th><th>Đúng</th><th>Tiền thưởng</th><th>Thời gian</th></tr>${rows}</table>
    <div class="btns"><button class="btn big pri" id="m-again">🔄 Chơi lại</button><button class="btn" id="m-home">🏠 Về trang chủ</button></div>`);
  const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); if (ui.isHost) ui.net.raw.start(); else tip('Chờ chủ phòng mở ván mới.'); };
  const home = $('#m-home'); if (home) home.onclick = () => { location.href = '../'; };
}

/* ---------- trả lời / trợ giúp / dừng ---------- */
$('#q-opts').addEventListener('click', async e => {
  const b = e.target.closest('[data-opt]'); if (!b) return;
  const v = cur; if (!v || v.phase !== 'playing') return;
  const pid = controlPid(v);
  if (!pid) { tip('Chưa tới lượt bạn — đang chờ đối thủ.'); return; }
  const opt = +b.dataset.opt;
  const ms = Math.max(0, Math.min(TIME_PER_QUESTION * 1000, Math.round(timeLeft[pid] != null ? TIME_PER_QUESTION * 1000 - timeLeft[pid] : 0)));
  document.querySelectorAll('#q-opts .at-opt').forEach(x => x.disabled = true);
  b.classList.add('sel');
  const r = await ui.actAs(pid, { type: 'answer', opt, ms });
  if (!r || !r.ok) { Snd.invalid(); tip((r && r.reason) || 'Không trả lời được.'); if (cur) render(cur); return; }
  /* chiếu kết quả 1,5s rồi mới chuyển câu */
  const correctAnswer = r.correct ? opt : r.correctAnswer;
  document.querySelectorAll('#q-opts .at-opt').forEach(x => {
    const i = +x.dataset.opt;
    if (i === correctAnswer) x.classList.add('right');
    if (i === opt && !r.correct) x.classList.add('wrong');
  });
  $('#stage-info').innerHTML = r.correct
    ? `✅ <b>Đúng rồi!</b> Bạn được ${fmtVND(r.prize)}.${SAFE_LEVELS.includes(r.level) ? ' 🔒 Đạt mốc an toàn!' : ''}`
    : `❌ <b>Sai rồi!</b> Đáp án đúng là <b>${OPT_LETTER[correctAnswer]}</b> — bạn giữ ${fmtVND(r.prize)}.`;
  if (r.correct) Snd.correct(); else Snd.wrong();
  holdRender = true;
  setTimeout(() => {
    holdRender = false;
    if (mode === 'pvp' && cur && cur.phase === 'playing') {
      const other = cur.players.find(p => p.id !== pid && !p.done);
      if (other) { pvpTurn = other.id; pvpCover = true; }
    }
    if (cur) render(cur);
  }, 1500);
});
document.addEventListener('click', e => {
  if (e.target && e.target.id === 'btn-pvp-ready') {
    pvpCover = false;
    if (cur) render(cur);
  }
});
document.querySelectorAll('#lifelines .life').forEach(b => b.addEventListener('click', async () => {
  const v = cur; if (!v || v.phase !== 'playing') return;
  const pid = controlPid(v);
  if (!pid) { tip('Chưa tới lượt bạn — đang chờ đối thủ.'); return; }
  const kind = b.dataset.life;
  const r = await ui.actAs(pid, { type: 'lifeline', kind });
  if (!r || !r.ok) { Snd.invalid(); tip((r && r.reason) || 'Không dùng được trợ giúp này.'); return; }
  /* lưu dữ liệu trợ giúp theo người dùng — để vẽ cho người chơi thứ 2 ở chuyền tay */
  const m = localLife[pid] || (localLife[pid] = {});
  if (kind === 'fifty' && r.removed) m.used50 = r.removed;
  if (kind === 'phone' && r.hint != null) m.phoneHint = r.hint;
  if (kind === 'audience' && r.audience) m.audience = r.audience;
  Snd.hint();
  if (cur) render(cur);
}));
$('#btn-stop').onclick = async () => {
  const v = cur; if (!v || v.phase !== 'playing') return;
  const pid = controlPid(v);
  if (!pid) { tip('Chưa tới lượt bạn.'); return; }
  const prize = (v.players.find(p => p.id === pid) || {}).prize || 0;
  const r = await confirmBox(`Dừng lại ngay và mang về <b>${fmtVND(prize)}</b>? Câu tiếp theo có thể giúp bạn lên cao hơn — hoặc mất hết về mốc an toàn.`, { title: '🛑 Dừng lại lấy tiền', ok: 'Dừng lại', cancel: 'Chơi tiếp' });
  if (!r) return;
  const res = await ui.actAs(pid, { type: 'stop' });
  if (!res || !res.ok) tip((res && res.reason) || 'Không dừng được.');
};
$('#btn-resign').onclick = async () => {
  const v = cur;
  if (!v || v.phase === 'ended') return;
  const r = await confirmBox('Nhận thua trận này? Lượt chơi của bạn kết thúc ngay, bạn chỉ giữ tiền mốc an toàn.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  if (mode === 'online') ui.act({ type: 'resign' });
  else {
    const pid = mode === 'pvp' ? ((pendingHuman(v) || {}).id || v.me) : v.me;
    ui.actAs(pid, { type: 'resign' });
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
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'ailatrieuphu', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
    }
    /* solo: chỉ mình bạn; pvp: chủ phòng thêm người trong phòng chờ */
  },
  onLobby: (info, u, started) => {
    if (!started) renderLobby(info, u);
    if (started && mode === 'pvp' && !pvpTurn && info.players.length) pvpTurn = info.players[0].id;
  },
  onState: (v, prev) => {
    if (mode === 'pvp' && !pvpTurn && v.players.length) pvpTurn = v.players[0].id;
    if (v.phase === 'playing' && mode === 'pvp' && pvpTurn) {
      const p = v.players.find(x => x.id === pvpTurn);
      if (p && p.done) {
        const other = v.players.find(x => x.id !== pvpTurn && !x.done);
        if (other) { pvpTurn = other.id; pvpCover = true; }
      }
    }
    render(v, prev);
  },
});

/* 🏠 nút home phải về đúng trang chủ web (gameKit chỉ về màn hình đầu của game) */
$('#btn-leave').onclick = async () => {
  const r = await confirmBox(ui.isHost ? 'Bạn là chủ phòng: rời đi là cả phòng giải tán.' : 'Bạn có thể vào lại bằng mã phòng.', { title: 'Rời ván?', ok: 'Rời ván', cancel: 'Ở lại', danger: true });
  if (r) { ui.leave(); setTimeout(() => { location.href = '../'; }, 250); }
};
