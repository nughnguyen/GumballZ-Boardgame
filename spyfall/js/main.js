// 🕵️ Spyfall – giao diện. Luật ở engine.js, bot ở bot.js, địa điểm ở
// locations.js, phòng/mạng dùng shared/net/simplenet.js (cùng pattern
// Avalon: chủ phòng giữ state, khách chỉ gửi action {type, ...}). Thẻ địa
// điểm bí mật: mỗi người chỉ xem được thẻ của mình (bấm 👁), bỏ phiếu làm
// lần lượt qua màn che để chơi chuyền tay không lộ.
import { createGame, applyAction, viewFor, actors } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { LOCATIONS, GENERIC_QUESTIONS } from './locations.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet({
  game: 'spyfall', min: 3, max: 8, maxSeats: 8, allowLocal: true,
  minMsg: 'Spyfall cần 3–8 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: { timer: 0, target: 1 },
  optOk: (k, v) => (k === 'timer' && [0, 60, 120].includes(+v)) || (k === 'target' && [1, 2, 3].includes(+v)),
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 900 + Math.random() * 1200,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu'],
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
const modeBtns = [...document.querySelectorAll('[data-mode]')];
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'pvp' ? '👥 Mở phòng chuyền tay' : m === 'ai-easy' ? '🤖 Bắt đầu chơi với máy Dễ' : '🧠 Bắt đầu chơi với máy Khó';
  try { localStorage.setItem('gumballz-spyfall-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
try {
  const sm = localStorage.getItem('gumballz-spyfall-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  $('#pcount').textContent = `${n}/8 người (cần 3–8)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${i === 0 ? '<span class="seat-role">🕵️ Người hỏi đầu tiên</span>' : ''}${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (n < 8
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  const o = info.opts || {}, dis = ui.isHost ? '' : 'disabled';
  $('#opts').innerHTML = `<div class="opt"><b>⏱️ Đồng hồ hỏi đáp (mỗi lượt hỏi)</b><div class="seg">${[[0, 'Tắt'], [60, '60 giây'], [120, '120 giây']].map(([v, n]) => `<button type="button" data-timer="${v}" aria-pressed="${+o.timer === v}" ${dis}>${n}</button>`).join('')}</div><small>Hết giờ thì tự chuyển sang bỏ phiếu — hỏi hay trả lời chậm quá là cả bàn đi bỏ phiếu luôn.</small></div>
  <div class="opt"><b>🏁 Thắng trận khi thắng trước</b><div class="seg">${[[1, '1 ván'], [2, '2 ván'], [3, '3 ván']].map(([v, n]) => `<button type="button" data-target="${v}" aria-pressed="${+o.target === v}" ${dis}>${n}</button>`).join('')}</div><small>Gián điệp thắng ván thì chỉ mình gián điệp được 1 điểm; đội còn lại thắng ván thì mỗi người được 1 điểm.</small></div>
  <div class="opt"><b>📍 Địa điểm</b><div class="role-note">Mỗi ván bốc ngẫu nhiên 1 trong 24 địa điểm quen thuộc (chợ Bến Thành, trường học, bệnh viện, sân bay, bãi biển, rạp chiếu phim…) — mỗi người thường nhận 1 vai ở đó, gián điệp không biết gì.</div></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = n < 3 || n > 8;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
  $('#wait-msg').textContent = n < 3 ? `Cần ít nhất 3 người mới bắt đầu (đang có ${n}).` : 'Đang chờ chủ phòng bắt đầu…';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.net.raw;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
  else if (b.id === 'btn-addlocal') {
    const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó cầm. Nhớ che thẻ địa điểm trước khi đưa máy!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
  else if (b.dataset.timer && ui.isHost) h.setOpt('timer', +b.dataset.timer);
  else if (b.dataset.target && ui.isHost) h.setOpt('target', +b.dataset.target);
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- đồng hồ hỏi đáp (mỗi máy tự chạy; hết giờ thì hô bỏ phiếu) ---------- */
let timerInt = null, timerLeft = 0, timerKey = '';
function stopTimer() { if (timerInt) { clearInterval(timerInt); timerInt = null; } }
function drawTimerChip() {
  const el = $('#timer-left'); if (el) el.textContent = Math.max(0, timerLeft);
  const chip = $('#timer-chip'); if (chip) chip.classList.toggle('low', timerLeft <= 10);
}
function startTimer(v) {
  stopTimer();
  timerLeft = v.timer;
  drawTimerChip();
  timerInt = setInterval(() => {
    timerLeft--;
    drawTimerChip();
    if (timerLeft > 0) return;
    stopTimer();
    const s = ui.net && ui.net.raw && ui.net.raw.state;
    if (!s || s.phase !== 'ask') return;
    /* hết giờ: máy nào có người thật trong ván thì hô bỏ phiếu (lệnh đầu tiên tới host được nhận, các lệnh sau bị từ chối vì đã sang pha bỏ phiếu) */
    const mine = (s.players || []).some(p => ui.controls(p.id) && !p.isBot);
    if (mine) { ui.act({ type: 'callvote' }); tip('Hết giờ hỏi đáp — chuyển sang bỏ phiếu.'); }
  }, 1000);
}

/* ---------- ván chơi ---------- */
let cur = null, endShownGid = null;
let selTarget = null, voteRevealed = null, guessLoc = null, guessRevealed = false;
let roleShown = false, peekPid = null;
let lastPhase = '', lastQaLen = 0, lastRoundNo = 1, lastAskKey = '';
let draftQ = '', draftA = '';

function myLocalPlayers(v) {
  return v.players.filter(p => ui.controls(p.id) && !p.isBot);
}
function resetFlowState(v, prev) {
  const changed = !prev || v.gid !== prev.gid || v.phase !== prev.phase || v.roundNo !== prev.roundNo;
  if (changed) { selTarget = null; voteRevealed = null; guessLoc = null; guessRevealed = false; roleShown = false; draftQ = ''; draftA = ''; }
}
const nm = (v, id) => { const p = v.players.find(x => x.id === id); return p ? esc(cleanName(p.name)) : '?'; };

/* thông tin gián điệp từ raw state (chỉ host/chuyền tay mới có) */
function spyInfo() {
  const s = ui.net && ui.net.raw && ui.net.raw.state;
  if (!s || !s.players) return null;
  const spy = s.players.find(p => p.isSpy);
  return spy ? { id: spy.id } : null;
}

function roleCardHTML(v) {
  const pid = peekPid || v.me;
  const p = v.players.find(x => x.id === pid);
  if (!p) return '';
  /* thẻ chỉ lấy từ view của chính người đó; khi xem hộ người cùng máy thì
     dùng raw state (chỉ host cùng máy mới có) */
  let amSpy = v.amSpy, myLoc = v.myLocation, myRole = v.myRole;
  if (pid !== v.me) {
    const s = ui.net && ui.net.raw && ui.net.raw.state;
    const pp = s && s.players.find(x => x.id === pid);
    if (!pp) return '';
    amSpy = pp.isSpy;
    if (!amSpy) {
      const loc = LOCATIONS.find(l => l.id === s.locationId);
      myLoc = loc ? { id: loc.id, name: loc.name, icon: loc.icon, desc: loc.desc } : null;
    } else myLoc = null;
    myRole = pp.role;
  }
  if (amSpy) {
    return `<div class="ric">🕵️</div><h3>${esc(cleanName(p.name))} — BẠN LÀ GIÁN ĐIỆP</h3>
      <div class="rloc">Bạn không biết địa điểm là gì!</div>
      <p>Hỏi đáp thật tự nhiên để không ai nghi, và nghe lén từ khóa trong câu trả lời của mọi người để đoán địa điểm. Đoán đúng thì thắng một mình!</p>
      <div class="know">🕵️ Mẹo: trả lời mơ hồ như mọi người (“Tôi làm việc ở đây mỗi ngày”), hỏi lại những câu chung chung, và nhớ từng từ khóa người ta lỡ miệng.</div>
      <div class="btn-row" style="display:flex;gap:8px;justify-content:center;margin-top:10px"><button class="btn" id="btn-hide-role">🙈 Che lại</button></div>`;
  }
  if (!myLoc) return '';
  return `<div class="ric">${myLoc.icon}</div><h3>${esc(cleanName(p.name))} — ${myLoc.name}</h3>
    <div class="rloc">Vai của bạn: ${esc(myRole)}</div>
    <p>${esc(myLoc.desc)}</p>
    <div class="know">📍 Bạn biết địa điểm là <b>${esc(myLoc.name)}</b>. Hãy hỏi những câu mà chỉ người ở đó mới trả lời được — nhưng đừng nói thẳng tên địa điểm, gián điệp đang nghe đấy!</div>
    <div class="btn-row" style="display:flex;gap:8px;justify-content:center;margin-top:10px"><button class="btn" id="btn-hide-role">🙈 Che lại</button></div>`;
}

function render(v, prev) {
  cur = v;
  if (!v) { endShownGid = null; roleShown = false; peekPid = null; stopTimer(); timerKey = ''; lastPhase = ''; return; }
  resetFlowState(v, prev);
  /* âm thanh theo diễn biến */
  if (prev && v.seq !== prev.seq) {
    if (v.phase !== prev.phase) {
      if (v.phase === 'vote') Snd.vote();
      else if (v.phase === 'roundover' || v.phase === 'ended') {
        if ((v.roundWinnerIds || []).includes(v.me)) Snd.success(); else Snd.fail();
      }
    }
    if (v.qa.length !== lastQaLen) {
      const last = v.qa[v.qa.length - 1];
      if (last) { if (last.a) Snd.answer(); else Snd.ask(); }
    }
  }
  if (v.phase !== lastPhase || v.roundNo !== lastRoundNo) { lastPhase = v.phase; lastRoundNo = v.roundNo; }
  lastQaLen = v.qa.length;
  /* đồng hồ hỏi đáp */
  const tKey = v.gid + ':ask:' + v.roundNo + ':' + v.qa.length + ':' + (v.pendingQ ? '1' : '0');
  if (v.timer && v.phase === 'ask') {
    if (tKey !== timerKey) {
      timerKey = tKey;
      const mine = myLocalPlayers(v).length > 0;
      if (mine) startTimer(v); else stopTimer();
    }
  } else { stopTimer(); timerKey = ''; }
  const timerChip = v.timer && v.phase === 'ask' ? ` <span class="timer-chip" id="timer-chip">⏱️ <b id="timer-left">${timerLeft}</b>s</span>` : '';
  /* bảng điểm trận */
  $('#scoreboard').innerHTML = v.players.map(p => {
    const w = v.wins[p.id] || 0;
    return `<span class="sc">${avatar(p.name, 22)} ${esc(cleanName(p.name))} <b>${w}/${v.target}</b></span>`;
  }).join('');
  /* dòng trạng thái */
  const roundTxt = `Ván ${v.roundNo} (thắng trước ${v.target} ván)`;
  $('#round').innerHTML = v.phase === 'ended'
    ? `🏆 ${(v.winnerIds || []).map(id => nm(v, id)).join(', ')} thắng trận!`
    : v.phase === 'roundover'
      ? `🏁 Hết ván ${v.roundNo} — ${(v.roundWinnerIds || []).map(id => nm(v, id)).join(', ')} thắng ván!`
      : v.phase === 'ask'
        ? `❓ ${roundTxt} · ${nm(v, v.askerId)} đang hỏi…${timerChip}`
        : v.phase === 'vote'
          ? `🗳️ ${roundTxt} · đang bỏ phiếu (${v.votedIds.length}/${v.players.length})…`
          : `🕵️ ${roundTxt} · gián điệp đang đoán địa điểm…`;
  /* thanh xem thẻ */
  const locals = myLocalPlayers(v);
  const rb = $('#role-bar');
  if (v.phase !== 'ended' && v.phase !== 'roundover') {
    rb.style.display = '';
    if (locals.length > 1) {
      $('#role-note').innerHTML = `Chơi chuyền tay: chọn người rồi bấm 👁 — xem xong nhớ che lại! <select id="peek-sel">${locals.map(p => `<option value="${p.id}" ${p.id === (peekPid || v.me) ? 'selected' : ''}>${esc(cleanName(p.name))}</option>`).join('')}</select>`;
    } else {
      $('#role-note').textContent = 'Chỉ mình bạn thấy thẻ này — chơi chuyền tay nhớ che lại trước khi đưa máy!';
    }
  } else rb.style.display = 'none';
  const rc = $('#role-card');
  if (roleShown && v.phase !== 'ended' && v.phase !== 'roundover') { rc.style.display = ''; rc.innerHTML = roleCardHTML(v); }
  else { rc.style.display = 'none'; rc.innerHTML = ''; }
  /* ghế người chơi */
  const isRoundDone = v.phase === 'roundover' || v.phase === 'ended';
  $('#seats').innerHTML = v.players.map(p => {
    const cls = ['seat'];
    if (v.phase === 'ask' && p.id === v.askerId) cls.push('on');
    if (selTarget === p.id) cls.push('sel');
    const clickable = (v.phase === 'ask' && ui.controls(v.askerId) && !v.pendingQ) || (v.phase === 'vote' && !v.votedIds.includes(v.me) && mode !== 'pvp');
    if (clickable) cls.push('clickable');
    return `<div class="${cls.join(' ')}" data-id="${p.id}">${avatar(p.name, 40)}<b>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}</b>
      ${v.phase === 'ask' && p.id === v.askerId ? '<span class="asker">❓ đang hỏi</span>' : ''}
      ${v.phase === 'vote' && v.votedIds.includes(p.id) ? '<span class="voted">✓ đã bỏ phiếu</span>' : ''}
      ${isRoundDone && v.spyId === p.id ? '<span class="voted" style="color:#b3232a">🕵️ gián điệp</span>' : ''}
      <small>${p.isBot ? 'máy ' + (p.level === 'easy' ? 'Dễ' : 'Khó') : p.local ? 'cùng máy' : ''} · ${v.wins[p.id] || 0} điểm</small></div>`;
  }).join('');
  /* panel hỏi đáp */
  const ap = $('#ask-panel');
  if (v.phase === 'ask') {
    ap.style.display = '';
    const body = $('#ask-body');
    if (v.pendingQ) {
      const q = v.pendingQ;
      $('#ask-sub').textContent = `${nm(v, q.from)} hỏi ${nm(v, q.to)} — chờ trả lời…`;
      const iAmAnswerer = ui.controls(q.to) && !v.players.find(x => x.id === q.to).isBot;
      if (iAmAnswerer) {
        body.innerHTML = `<div class="qa-item"><div class="q">❓ ${nm(v, q.from)} hỏi ${nm(v, q.to)}: “${esc(q.text)}”</div></div>
          <div class="ask-row"><input id="in-answer" maxlength="200" placeholder="Gõ câu trả lời của bạn…" value="${esc(draftA)}"><button class="btn big pri" id="btn-answer">💬 Trả lời</button></div>
          <div class="chips">${['Tôi làm việc ở đây mỗi ngày.', 'Tùy hôm, lúc đông lúc vắng.', 'Tôi hay tới đây vào buổi sáng.', 'Tôi mới tới lần đầu nên chưa rõ lắm.'].map(a => `<button class="chip" data-ans="${esc(a)}">${esc(a)}</button>`).join('')}</div>`;
        const inp = $('#in-answer');
        inp.addEventListener('input', () => { draftA = inp.value; });
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-answer').click(); });
      } else {
        body.innerHTML = `<div class="qa-item"><div class="q">❓ ${nm(v, q.from)} hỏi ${nm(v, q.to)}: “${esc(q.text)}”</div><div class="a wait">… đang chờ ${nm(v, q.to)} trả lời</div></div>`;
      }
    } else {
      const iAmAsker = ui.controls(v.askerId) && !v.players.find(x => x.id === v.askerId).isBot;
      $('#ask-sub').textContent = iAmAsker ? 'Tới lượt bạn hỏi — chọn 1 người rồi gõ câu hỏi (hoặc bấm 1 câu gợi ý).' : `${nm(v, v.askerId)} đang nghĩ câu hỏi…`;
      if (iAmAsker) {
        const others = v.players.filter(p => p.id !== v.askerId);
        if (!selTarget || !others.some(p => p.id === selTarget)) selTarget = others[0] ? others[0].id : null;
        body.innerHTML = `<div class="ask-row"><select id="sel-target">${others.map(p => `<option value="${p.id}" ${p.id === selTarget ? 'selected' : ''}>Hỏi ${esc(cleanName(p.name))}</option>`).join('')}</select><input id="in-q" maxlength="120" placeholder="Gõ câu hỏi của bạn…" value="${esc(draftQ)}"><button class="btn big pri" id="btn-ask">❓ Hỏi</button></div>
          <div class="chips">${GENERIC_QUESTIONS.map(q => `<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
          <div class="btn-row"><button class="btn" id="btn-callvote">🗳️ Bỏ phiếu ngay</button></div>`;
        const inp = $('#in-q');
        inp.addEventListener('input', () => { draftQ = inp.value; });
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-ask').click(); });
      } else {
        body.innerHTML = `<p style="text-align:center;font-weight:700">⏳ ${nm(v, v.askerId)} đang nghĩ câu hỏi…</p>`;
      }
    }
  } else ap.style.display = 'none';
  /* panel bỏ phiếu (màn che lần lượt khi chuyền tay) */
  const vp = $('#vote-panel');
  if (v.phase === 'vote') {
    vp.style.display = '';
    const pending = v.players.filter(p => !v.votedIds.includes(p.id) && ui.controls(p.id) && !p.isBot);
    $('#vote-sub').textContent = `Đã bỏ ${v.votedIds.length}/${v.players.length} phiếu — bấm vào ghế 1 người để tố họ là gián điệp.`;
    const body = $('#vote-body');
    if (!pending.length) {
      body.innerHTML = `<p style="text-align:center;font-weight:700">⏳ Đang chờ mọi người bỏ phiếu xong…</p>`;
    } else if (pending.length === 1) {
      body.innerHTML = `<p style="text-align:center;font-weight:700">👤 ${esc(cleanName(pending[0].name))} — bấm vào ghế 1 người để bỏ phiếu.</p>`;
    } else {
      const cur_ = voteRevealed && pending.some(p => p.id === voteRevealed) ? voteRevealed : null;
      if (!cur_) {
        body.innerHTML = `<div class="cover"><div class="who">👤 Tới lượt bỏ phiếu: ${pending.map(p => esc(cleanName(p.name))).join(', ')}</div><div class="warn">Người khác quay đi — lá phiếu của bạn là bí mật!</div>${pending.map(p => `<button class="btn" data-voter="${p.id}">Tôi là ${esc(cleanName(p.name))} — hiện ghế bỏ phiếu</button>`).join(' ')}</div>`;
      } else {
        const p = v.players.find(x => x.id === cur_);
        body.innerHTML = `<div class="cover"><div class="who">👤 ${esc(cleanName(p.name))} — bạn nghi ai là gián điệp? Bấm vào ghế người đó.</div><div style="margin-top:8px"><button class="btn" id="btn-vote-back">← Không phải tôi</button></div></div>`;
      }
    }
  } else vp.style.display = 'none';
  /* panel gián điệp đoán địa điểm */
  const gp = $('#guess-panel');
  if (v.phase === 'guess') {
    gp.style.display = '';
    const body = $('#guess-grid');
    const pvp = v.players.filter(p => p.local && !p.isBot).length > 1;
    const si = pvp ? spyInfo() : null;
    const showPicker = (actorId) => {
      $('#guess-sub').textContent = 'Gián điệp, chọn địa điểm bạn nghĩ là đúng rồi bấm Xác nhận — đúng thì thắng một mình, sai thì cả đội thắng!';
      body.innerHTML = v.locationList.map(l => `<button class="loc ${guessLoc === l.id ? 'sel' : ''}" data-loc="${l.id}"><span class="li">${l.icon}</span>${esc(l.name)}</button>`).join('');
      const go = $('#btn-guess-go');
      go.disabled = !guessLoc;
      go.onclick = () => {
        if (!guessLoc) return;
        if (mode === 'online') ui.act({ type: 'guess', location: guessLoc });
        else ui.actAs(actorId, { type: 'guess', location: guessLoc });
        Snd.pick();
      };
    };
    if (!pvp && v.amSpy) {
      showPicker(v.me);
    } else if (pvp && si) {
      if (!guessRevealed) {
        $('#guess-sub').textContent = 'Gián điệp đã bị lộ! Tới lượt gián điệp đoán địa điểm.';
        body.innerHTML = `<div class="cover"><div class="who">🕵️ Tới lượt gián điệp đoán địa điểm.</div><div class="warn">Người khác quay đi — chỉ gián điệp được nhìn màn hình!</div><button class="btn big" id="btn-guess-reveal">🕵️ Tôi là gián điệp — hiện bảng đoán</button></div>`;
      } else {
        showPicker(si.id);
      }
    } else {
      $('#guess-sub').textContent = 'Gián điệp đã bị lộ và đang đoán địa điểm…';
      body.innerHTML = '';
      const go = $('#btn-guess-go');
      go.disabled = true;
    }
  } else gp.style.display = 'none';
  /* panel hết ván */
  const rp = $('#roundover-panel');
  if (v.phase === 'roundover') {
    rp.style.display = '';
    const spyName = nm(v, v.spyId);
    $('#roundover-title').textContent = `🏁 Hết ván ${v.roundNo}`;
    $('#roundover-sub').textContent = v.endReason === 'spy-guess' ? `Gián điệp ${spyName} đoán đúng địa điểm — thắng một mình!`
      : v.endReason === 'spy-early-guess' ? `Gián điệp ${spyName} đoán đúng địa điểm sớm — thắng một mình!`
      : v.endReason === 'spy-guess-wrong' ? `Gián điệp ${spyName} đoán sai địa điểm — cả đội còn lại thắng ván!`
      : v.endReason === 'spy-early-wrong' ? `Gián điệp ${spyName} đoán sai địa điểm sớm — cả đội còn lại thắng ván!`
      : v.endReason === 'wrong-accuse' ? `Cả bàn buộc tội nhầm người — gián điệp ${spyName} thắng ván!`
      : v.endReason === 'tie' ? `Hòa phiếu, không ai bị buộc tội — gián điệp ${spyName} thắng ván!`
      : `Có người xin thua — gián điệp ${spyName} ${v.endReason === 'resign' && (v.roundWinnerIds || []).includes(v.spyId) ? 'thắng' : 'thua'} ván!`;
    $('#roundover-reveal').innerHTML = `<div class="reveal-grid">${v.players.map(p => {
      const r = v.roles ? v.roles[p.id] : null;
      const isSpy = p.id === v.spyId;
      return `<div class="rv ${isSpy ? 'spy' : 'civ'}">${isSpy ? '🕵️' : (v.locationName ? '📍' : '')} <b>${esc(cleanName(p.name))}</b> — ${isSpy ? 'Gián điệp' : esc(r || '')}${p.id === v.me ? ' · bạn' : ''}</div>`;
    }).join('')}</div><p style="text-align:center;font-weight:700">📍 Địa điểm ván này: <b>${esc(v.locationName || '')}</b> · Điểm trận: ${v.players.map(p => `${esc(cleanName(p.name))} ${v.wins[p.id] || 0}`).join(' — ')}</p>`;
    $('#roundover-btns').innerHTML = ui.isHost
      ? `<button class="btn big pri" id="btn-next">▶ Ván tiếp theo</button><button class="btn" id="btn-lobby2">Về phòng chờ</button>`
      : `<p style="text-align:center;font-weight:700">⏳ Đang chờ chủ phòng mở ván tiếp theo…</p>`;
    const nx = $('#btn-next'); if (nx) nx.onclick = () => { ui.act({ type: 'next' }); Snd.pick(); };
    const lb = $('#btn-lobby2'); if (lb) lb.onclick = () => { ui.net.raw.restart(); };
  } else rp.style.display = 'none';
  /* lưới địa điểm chung */
  $('#locs-grid').innerHTML = v.locationList.map(l => `<button class="loc" disabled><span class="li">${l.icon}</span>${esc(l.name)}</button>`).join('');
  /* danh sách hỏi đáp */
  $('#qa-list').innerHTML = v.qa.map(x => `<div class="qa-item"><div class="q"><span class="who">${nm(v, x.from)} → ${nm(v, x.to)}</span><br>❓ “${esc(x.q)}”</div>${x.a ? `<div class="a">💬 ${nm(v, x.to)}: “${esc(x.a)}”</div>` : `<div class="a wait">… đang chờ trả lời</div>`}</div>`).join('');
  /* nút đoán sớm của gián điệp: chỉ hiện trong vòng hỏi khi có người thật cùng máy là gián điệp */
  const sgBtn = $('#btn-spyguess');
  if (sgBtn) {
    let showSg = false;
    if (v.phase === 'ask') {
      if (v.amSpy) showSg = true;
      else {
        const si = spyInfo();
        if (si && v.players.find(p => p.id === si.id && p.local && !p.isBot)) showSg = true;
      }
    }
    sgBtn.style.display = showSg ? '' : 'none';
  }
  /* nhật ký */
  const log = $('#log');
  log.innerHTML = v.log.slice(-12).reverse().map(l => `<div>${esc(l.text)}</div>`).join('') || '<div>Chưa có gì.</div>';
  /* kết thúc trận: hộp thoại (1 lần / trận) */
  if (v.phase === 'ended' && endShownGid !== v.gid && !v.spec) {
    endShownGid = v.gid;
    const won = (v.winnerIds || []).includes(v.me);
    if (won) Snd.winJingle(); else Snd.lose();
    const spyName = nm(v, v.spyId);
    const reveal = v.roles ? `<div class="reveal-grid">${v.players.map(p => {
      const r = v.roles[p.id];
      const isSpy = p.id === v.spyId;
      return `<div class="rv ${isSpy ? 'spy' : 'civ'}">${isSpy ? '🕵️' : '📍'} <b>${esc(cleanName(p.name))}</b> — ${isSpy ? 'Gián điệp' : esc(r || '')}${p.id === v.me ? ' · bạn' : ''}</div>`;
    }).join('')}</div>` : '';
    ui.openModal(`<h2>${won ? '🏆 Bạn thắng trận!' : '🏆 ' + (v.winnerIds || []).map(id => nm(v, id)).join(', ') + ' thắng trận!'}</h2>
      <p style="text-align:center">Thắng trước ${v.target} ván — điểm trận: ${v.players.map(p => `${esc(cleanName(p.name))} ${v.wins[p.id] || 0}`).join(' — ')}</p>
      <p style="text-align:center;font-weight:700">📍 Địa điểm ván cuối: <b>${esc(v.locationName || '')}</b> · 🕵️ Gián điệp: <b>${spyName}</b></p>
      <p style="text-align:center;font-weight:700">Lộ bài — thẻ mọi người:</p>${reveal}
      <div class="btn-col">${ui.isHost
        ? '<button class="btn big pri" id="m-again">🔁 Chơi trận mới</button><button class="btn" id="m-lobby">Về phòng chờ</button>'
        : '<button class="btn" id="m-close">Đóng — chờ chủ phòng mở trận mới</button>'}
      <button class="btn" id="m-home">🏠 Về trang chủ</button></div>`);
    const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); ui.net.raw.start(); };
    const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); ui.net.raw.restart(); };
    const close = $('#m-close'); if (close) close.onclick = ui.closeModal;
    $('#m-home').onclick = () => { ui.closeModal(); ui.leave(); setTimeout(() => { location.href = '../'; }, 250); };
  }
}

/* ---------- bấm ghế: chọn người để hỏi / bỏ phiếu ---------- */
$('#seats').addEventListener('click', e => {
  const seat = e.target.closest('.seat');
  if (!seat || !cur) return;
  const id = seat.dataset.id;
  if (cur.phase === 'ask' && !cur.pendingQ && ui.controls(cur.askerId)) {
    if (id === cur.askerId) return;
    selTarget = id;
    Snd.pick();
    render(cur, cur);
    return;
  }
  if (cur.phase === 'vote') {
    const p = cur.players.find(x => x.id === id);
    if (!p) return;
    /* chuyền tay: phải mở màn che trước rồi mới bấm ghế — trừ khi chỉ còn
       đúng 1 người chưa bỏ phiếu (lúc đó panel không còn nút "Tôi là …"
       mà chỉ bảo "bấm vào ghế", nên bấm ghế là bỏ phiếu luôn cho người đó) */
    if (mode === 'pvp') {
      let actor = voteRevealed;
      if (!actor) {
        const pend = cur.players.filter(p => !cur.votedIds.includes(p.id) && ui.controls(p.id) && !p.isBot);
        if (pend.length === 1) actor = pend[0].id;
      }
      if (!actor) { Snd.invalid(); tip('Bấm “Tôi là …” để hiện ghế bỏ phiếu trước đã.'); return; }
      ui.actAs(actor, { type: 'vote', target: id });
      Snd.vote();
      voteRevealed = null;
      return;
    }
    if (cur.votedIds.includes(cur.me)) return;
    ui.act({ type: 'vote', target: id });
    Snd.vote();
  }
});

/* ---------- các nút trong panel ---------- */
$('#ask-body').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !cur) return;
  if (b.dataset.q) { draftQ = b.dataset.q; const inp = $('#in-q'); if (inp) { inp.value = draftQ; inp.focus(); } return; }
  if (b.dataset.ans) { draftA = b.dataset.ans; const inp = $('#in-answer'); if (inp) { inp.value = draftA; inp.focus(); } return; }
  if (b.id === 'btn-ask') {
    const inp = $('#in-q'), sel = $('#sel-target');
    const text = (inp ? inp.value : draftQ).trim();
    const to = sel ? sel.value : selTarget;
    if (!text) { Snd.invalid(); tip('Gõ câu hỏi trước đã.'); return; }
    if (!to) { Snd.invalid(); tip('Chọn 1 người để hỏi.'); return; }
    ui.actAs(cur.askerId, { type: 'ask', to, text });
    draftQ = '';
    Snd.ask();
    return;
  }
  if (b.id === 'btn-answer') {
    const inp = $('#in-answer');
    const text = (inp ? inp.value : draftA).trim();
    if (!text) { Snd.invalid(); tip('Gõ câu trả lời trước đã.'); return; }
    ui.actAs(cur.pendingQ.to, { type: 'answer', text });
    draftA = '';
    Snd.answer();
    return;
  }
  if (b.id === 'btn-callvote') {
    ui.act({ type: 'callvote' });
    Snd.vote();
    return;
  }
});
$('#vote-body').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !cur) return;
  if (b.dataset.voter) { voteRevealed = b.dataset.voter; Snd.pick(); render(cur, cur); return; }
  if (b.id === 'btn-vote-back') { voteRevealed = null; render(cur, cur); }
});
$('#guess-grid').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !cur) return;
  if (b.dataset.loc) { guessLoc = b.dataset.loc; Snd.pick(); render(cur, cur); return; }
  if (b.id === 'btn-guess-reveal') { guessRevealed = true; Snd.pick(); render(cur, cur); }
});

/* ---------- xem thẻ ---------- */
$('#btn-role').onclick = () => {
  if (!cur) return;
  if (!peekPid) peekPid = cur.me;
  roleShown = !roleShown;
  render(cur, cur);
};
$('#role-bar').addEventListener('change', e => {
  if (e.target.id === 'peek-sel') { peekPid = e.target.value; roleShown = true; render(cur, cur); }
});
$('#role-card').addEventListener('click', e => {
  if (e.target.closest('#btn-hide-role')) { roleShown = false; render(cur, cur); }
});

/* ---------- gián điệp đoán sớm (nút ở hàng nút trong ván) ---------- */
$('#btn-spyguess').onclick = () => {
  const v = cur;
  if (!v || v.phase !== 'ask') return;
  const si = spyInfo();
  const actorId = v.amSpy ? v.me : (si ? si.id : null);
  if (!actorId) return;
  const locs = v.locationList;
  ui.openModal(`<h2>🕵️ Đoán địa điểm ngay?</h2><p style="text-align:center">Đoán <b>đúng thì thắng ván ngay</b>, đoán <b>sai thì thua ván ngay</b> — chỉ đoán khi đã chắc!</p>
    <div class="loc-grid">${locs.map(l => `<button class="loc" data-early-loc="${l.id}"><span class="li">${l.icon}</span>${esc(l.name)}</button>`).join('')}</div>
    <div class="btn-col" style="margin-top:12px"><button class="btn" id="m-close">Để sau</button></div>`);
  $('#m-close').onclick = ui.closeModal;
  document.querySelectorAll('[data-early-loc]').forEach(x => x.onclick = () => {
    ui.closeModal();
    if (mode === 'online') ui.act({ type: 'spyguess', location: x.dataset.earlyLoc });
    else ui.actAs(actorId, { type: 'spyguess', location: x.dataset.earlyLoc });
    Snd.pick();
  });
};

/* ---------- nút phụ ---------- */
function openGuide() { ui.openModal(GUIDE_HTML); const c = $('#m-close'); if (c) c.onclick = ui.closeModal; }
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
$('#btn-log').onclick = () => {
  const v = cur, log = v ? v.log.slice().reverse() : [];
  ui.openModal(`<h2>📜 Nhật ký trận đấu</h2>${log.length ? `<ul class="logl">${log.map(l => `<li class="${l.kind || ''}">${esc(l.text)}</li>`).join('')}</ul>` : '<p style="text-align:center;color:var(--muted)">Chưa có gì.</p>'}<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
};
$('#btn-new').onclick = () => {
  if (!cur) return;
  if (!ui.isHost) { tip('Chỉ chủ phòng mở ván mới được.'); return; }
  ui.net.raw.start();
};
$('#btn-resign').onclick = async () => {
  const v = cur;
  if (!v || v.phase === 'ended' || v.phase === 'roundover') return;
  const r = await confirmBox('Nhận thua ván này? Phe của bạn thua ván này luôn.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  if (mode === 'online') ui.act({ type: 'resign' });
  else {
    const pid = peekPid || v.me;
    ui.actAs(pid, { type: 'resign' });
  }
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'spyfall', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      /* đấu máy: bạn + 2 máy = 3 người (chủ phòng thêm máy trong phòng chờ nếu muốn đông hơn) */
      for (let i = 0; i < 2; i++) h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
    }
    /* pvp: chủ phòng thêm người trong phòng chờ (thêm máy / người cùng máy) */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => { render(v, prev); },
});

/* 🏠 nút home phải về đúng trang chủ web (gameKit chỉ về màn hình đầu của game) */
$('#btn-leave').onclick = async () => {
  const r = await confirmBox(ui.isHost ? 'Bạn là chủ phòng: rời đi là cả phòng giải tán.' : 'Bạn có thể vào lại bằng mã phòng.', { title: 'Rời ván?', ok: 'Rời ván', cancel: 'Ở lại', danger: true });
  if (r) { ui.leave(); setTimeout(() => { location.href = '../'; }, 250); }
};
