// 🕵️ Ai là Gián Điệp – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng shared/net/simplenet.js.
import { createGame, applyAction, viewFor, actors, OPT_CHOICES, MIN_PLAYERS, MAX_PLAYERS } from './engine.js?v=1';
import { botAction, GENERIC_DESC } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=49';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';
import { toast as tip, confirmBox, promptBox } from '../../shared/ui/dialog.js?v=8';

let sound = ls.get('giandiep-sound') !== '0';

const NET = makeNet({
  game: 'giandiep', min: MIN_PLAYERS, max: MAX_PLAYERS, maxSeats: MAX_PLAYERS + 6,
  minMsg: 'Cần ít nhất 4 người: thêm máy hoặc mời bạn vào phòng.',
  defaults: { spies: 1, timer: 0 },
  optOk: (k, v) => (OPT_CHOICES[k] || []).includes(v),
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 1500 + Math.random() * 2000,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu'],
  allowLocal: true,
});

// ---------- âm thanh (WebAudio tổng hợp, không file nhạc ngoài) ----------
let ac = null;
function beep(kind) {
  if (!sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime;
    const tone = (f, at, len, type = 'triangle', vol = .12) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(vol, t + at + .015); g.gain.exponentialRampToValueAtTime(.0001, t + at + len);
      o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + len + .03);
    };
    if (kind === 'turn') { tone(660, 0, .08); tone(880, .08, .1); }
    else if (kind === 'vote') { tone(520, 0, .07); tone(660, .07, .09); }
    else if (kind === 'elim') { tone(220, 0, .18, 'sawtooth', .1); tone(180, .12, .25, 'sawtooth', .1); }
    else if (kind === 'win') { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .13, .22)); }
    else if (kind === 'pop') { tone(500, 0, .06, 'sine', .1); }
  } catch (e) {}
}

/* ---------- hình vai trò SVG (cùng phong cách nét mực dày + màu pastel với icon tile) ---------- */
const SPY_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true"><g stroke="#4A3E5C" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M50 6 L62 20 L38 20 Z" fill="#4A3E5C"/><ellipse cx="50" cy="21" rx="30" ry="6" fill="#4A3E5C"/><path d="M28 78 Q28 62 50 62 Q72 62 72 78 L72 92 L28 92 Z" fill="#C9BDF3"/><circle cx="50" cy="44" r="22" fill="#FFE3A3"/><rect x="30" y="38" width="40" height="13" rx="6.5" fill="#4A3E5C" stroke="none"/><circle cx="41" cy="44.5" r="2.6" fill="#fff" stroke="none"/><circle cx="59" cy="44.5" r="2.6" fill="#fff" stroke="none"/><path d="M44 58 Q50 63 56 58" fill="none"/><circle cx="80" cy="76" r="11" fill="#FEE686"/><path d="M88 84 L96 92" stroke-width="5"/></g></svg>`;
const CIV_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true"><g stroke="#4A3E5C" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M50 14 Q50 4 60 4 Q58 12 50 14" fill="#ABE0C6"/><path d="M50 14 Q50 4 40 4 Q42 12 50 14" fill="#ABE0C6"/><path d="M28 78 Q28 62 50 62 Q72 62 72 78 L72 92 L28 92 Z" fill="#ABE0C6"/><circle cx="50" cy="44" r="22" fill="#FFE3A3"/><circle cx="41" cy="42" r="2.8" fill="#4A3E5C" stroke="none"/><circle cx="59" cy="42" r="2.8" fill="#4A3E5C" stroke="none"/><circle cx="36" cy="52" r="4" fill="#FFB9CF" stroke="none"/><circle cx="64" cy="52" r="4" fill="#FFB9CF" stroke="none"/><path d="M42 54 Q50 61 58 54" fill="none"/></g></svg>`;

// ---------- phòng chờ ----------
function renderLobby(info, ui) {
  $('#pcount').textContent = `${info.players.length}/${MAX_PLAYERS} người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : p.isBot ? ' <small>· máy</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && info.players.length < MAX_PLAYERS
    ? '<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Thêm người cùng máy</button></div>' : '';
  const o = info.opts || {}, dis = ui.isHost ? '' : 'disabled';
  $('#opts').innerHTML = `<div class="opt"><b>🕵️ Số gián điệp</b><div class="seg">${[[1, '1 gián điệp'], [2, '2 gián điệp']].map(([v, n]) => `<button type="button" data-spies="${v}" aria-pressed="${o.spies === v}" ${dis}>${n}</button>`).join('')}</div><small>2 gián điệp cần ít nhất 6 người (ít người hơn thì máy tự giảm xuống 1).</small></div>
  <div class="opt"><b>⏱️ Đồng hồ mô tả</b><div class="seg">${[[0, 'Tắt'], [30, '30 giây'], [45, '45 giây'], [60, '60 giây']].map(([v, n]) => `<button type="button" data-timer="${v}" aria-pressed="${o.timer === v}" ${dis}>${n}</button>`).join('')}</div><small>Hết giờ mà chưa mô tả thì game tự gửi 1 câu chung chung giúp bạn.</small></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none';
  $('#btn-start').disabled = info.players.length < MIN_PLAYERS;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return;
  const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot();
  else if (b.id === 'btn-addlocal') { const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó cầm.', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true }); if (n) h.addLocal(n); }
  else if (b.dataset.spies) h.setOpt('spies', +b.dataset.spies);
  else if (b.dataset.timer) h.setOpt('timer', +b.dataset.timer);
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start();

// ---------- ván chơi ----------
let cur = null, endShown = null;
let hideWord = false, lastWordOwner = null, voteAs = null, revealState = null;
let timerInt = null, timerLeft = 0;

const myId = () => (cur && cur.me) || null;
const rawState = () => (ui.net && ui.net.raw && ui.net.raw.state) || null;
/* ảnh chụp ván của 1 người chơi cùng máy (chỉ chủ phòng giữ state gốc) */
const viewForPlayer = pid => {
  if (!pid) return null;
  if (pid === myId()) return cur;
  const s = rawState();
  return s ? viewFor(s, pid) : null;
};
const hasLocals = v => (v.players || []).some(p => p.local);
const isLocalActor = (v, pid) => { const p = (v.players || []).find(x => x.id === pid); return !!p && (p.local || pid === 'host'); };
/* từ hiển thị trên thẻ vai trò: chơi online thì từ của mình; chuyền tay thì từ của
   người đang tới lượt trên máy này (để không lộ từ của người khác) */
function actorWordView(v) {
  if (!ui.isHost || !hasLocals(v)) return v;
  if (v.phase === 'describe' && v.turn) return viewForPlayer(v.turn) || v;
  if (v.phase === 'vote' && voteAs) return viewForPlayer(voteAs) || v;
  return v;
}

function renderRoleCard(v) {
  const el = $('#rolecard');
  const av = actorWordView(v);
  const you = av.you;
  if (!you) {
    el.className = 'rolecard';
    el.innerHTML = `<div class="rc-art">${SPY_SVG}</div><div class="rc-tx"><b>Bạn đang xem ván này.</b><div class="rc-sub">Người xem không thấy từ bí mật của ai.</div></div>`;
    return;
  }
  if (lastWordOwner !== you.id) { lastWordOwner = you.id; hideWord = false; }
  const isSpy = you.role === 'spy';
  const ownerName = (v.players.find(p => p.id === you.id) || {}).name;
  const label = you.id === v.me ? 'Từ bí mật của bạn' : `Từ của ${ownerName}`;
  const sub = !you.alive ? 'Bạn đã bị loại — xem nốt ván cho vui nhé.'
    : v.phase === 'describe' ? 'Mô tả 1 câu, đừng nói ra từ này.'
    : v.phase === 'vote' ? 'Nhớ từ của bạn để so với mô tả của mọi người.'
    : v.phase === 'elim' ? 'Vòng sau chia từ mới.'
    : 'Ván đã kết thúc.';
  el.className = 'rolecard' + (isSpy ? ' spy' : '') + (hideWord ? ' hidden-word' : '');
  el.innerHTML = `<div class="rc-art">${isSpy ? SPY_SVG : CIV_SVG}</div><div class="rc-tx"><span class="rc-role">${isSpy ? '🕵️ GIÁN ĐIỆP' : '🧑 DÂN THƯỜNG'} · ${esc(label)}</span><div class="rc-word">“${esc(you.word)}”</div><div class="rc-sub">${sub}</div></div><button class="rc-eye" id="rc-eye" title="Che / hiện từ" aria-label="Che hoặc hiện từ">${hideWord ? '🙈' : '👁️'}</button>`;
}
$('#rolecard').addEventListener('click', e => {
  if (e.target.closest('#rc-eye')) { hideWord = !hideWord; if (cur) renderRoleCard(cur); }
});

function renderSeats(v) {
  $('#seats').innerHTML = v.players.map(p => {
    const isTurn = v.phase === 'describe' && v.turn === p.id;
    const vc = v.voteCounts ? (v.voteCounts[p.id] || 0) : 0;
    const rev = v.phase === 'ended' && v.reveal ? v.reveal.find(r => r.id === p.id) : null;
    return `<div class="seat${isTurn ? ' on' : ''}${p.alive ? '' : ' out'}">${avatar(p.name, 40)}<span class="tx"><span class="nm">${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}${p.local ? ' · cùng máy' : ''}</span><span class="st">${!p.alive ? '❌ đã loại' : v.phase === 'describe' ? (p.described ? '✓ đã mô tả' : (isTurn ? '<b>đang mô tả…</b>' : 'chưa mô tả')) : v.phase === 'vote' ? (p.voted ? '✓ đã bỏ phiếu' : 'chưa bỏ phiếu') : ''}${vc ? ` · 🗳️ ${vc}` : ''}</span></span>${rev ? `<span class="badge ${rev.role === 'spy' ? 'spy' : 'civ'}" title="${rev.role === 'spy' ? 'Gián điệp' : 'Dân thường'}">${rev.role === 'spy' ? '🕵️' : '🧑'}</span>` : ''}</div>`;
  }).join('');
}

function renderDescs(v) {
  const el = $('#descs');
  if (v.phase === 'ended') { el.innerHTML = ''; return; }
  const byId = Object.fromEntries(v.descs.map(d => [d.pid, d]));
  el.innerHTML = v.order.map(pid => {
    const p = v.players.find(x => x.id === pid);
    if (!p || !p.alive) return '';
    const d = byId[pid];
    const isTurn = v.phase === 'describe' && v.turn === pid;
    return `<div class="desc${pid === v.me ? ' me' : ''}">${avatar(p.name, 36)}<div class="d-tx"><b>${esc(cleanName(p.name))}${pid === v.me ? ' (bạn)' : ''}</b>${d ? `<p>“${esc(d.text)}”</p>` : `<span class="d-wait">${isTurn ? '✍️ đang mô tả…' : '…chưa mô tả'}</span>`}</div></div>`;
  }).join('');
}

function stopTimer() { if (timerInt) { clearInterval(timerInt); timerInt = null; } }
function drawTimer() {
  const chip = $('#timer-chip'), left = $('#timer-left');
  if (!chip || !left) return;
  left.textContent = Math.max(0, timerLeft);
  chip.classList.toggle('low', timerLeft <= 10);
}
function startTimer(v, actorId) {
  stopTimer();
  if (!v.timer || v.phase !== 'describe') return;
  timerLeft = v.timer;
  drawTimer();
  timerInt = setInterval(() => {
    timerLeft--;
    drawTimer();
    if (timerLeft <= 0) {
      stopTimer();
      const text = GENERIC_DESC[Math.floor(Math.random() * GENERIC_DESC.length)];
      ui.actAs(actorId, { type: 'describe', text });
      tip('Hết giờ! Game tự gửi 1 câu mô tả giúp bạn.');
    }
  }, 1000);
}

function renderDescTurn(v) {
  const el = $('#desc-turn');
  if (v.phase !== 'describe') { el.innerHTML = ''; return; }
  const actor = v.players.find(p => p.id === v.turn);
  if (!actor) { el.innerHTML = ''; return; }
  const controllable = v.turn === v.me || (ui.isHost && actor.local);
  const oldVal = $('#desc-input') ? $('#desc-input').value : '';
  if (!controllable) {
    el.innerHTML = `<p class="hint">${actor.isBot ? `🤖 ${esc(cleanName(actor.name))} đang nghĩ câu mô tả…` : `⏳ Đang chờ ${esc(cleanName(actor.name))} mô tả…`}</p>`;
    return;
  }
  el.innerHTML = `<h3>✍️ ${v.turn === v.me ? 'Tới lượt bạn mô tả!' : `Tới lượt ${esc(cleanName(actor.name))} mô tả`}${v.timer ? ` <span class="timer-chip" id="timer-chip">⏱️ <b id="timer-left">${v.timer}</b>s</span>` : ''}</h3>
    <div class="row"><input id="desc-input" maxlength="120" placeholder="Mô tả từ của bạn bằng 1 câu… (đừng nói ra từ đó)" autocomplete="off"><button class="btn pri" id="btn-desc">Gửi mô tả</button></div>
    <p class="hint">Mô tả đủ rõ để phe mình nhận ra, nhưng đừng rõ quá kẻo gián điệp đoán được từ của dân.</p>`;
  const inp = $('#desc-input');
  if (inp) inp.value = oldVal;
  $('#btn-desc').onclick = () => {
    const t = inp.value.trim();
    if (!t) { tip('Nhập 1 câu mô tả đã nhé.'); return; }
    ui.actAs(v.turn, { type: 'describe', text: t });
  };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-desc').click(); });
}

/* ai đang bỏ phiếu trên máy này (chuyền tay: chủ phòng + người cùng máy chưa bỏ phiếu) */
function currentVoteAs(v) {
  const cands = (v.players || []).filter(p => p.alive && !p.voted && (p.id === v.me || (ui.isHost && p.local)));
  if (!voteAs || !cands.some(p => p.id === voteAs)) voteAs = cands.length ? cands[0].id : null;
  return voteAs;
}
function renderVoteArea(v) {
  const el = $('#vote-area');
  if (v.phase !== 'vote') { el.innerHTML = ''; return; }
  const alive = v.players.filter(p => p.alive);
  const votedCount = alive.filter(p => p.voted).length;
  const va = currentVoteAs(v);
  const vaPlayer = v.players.find(p => p.id === va);
  const vaView = va ? viewForPlayer(va) : null;
  const myVoteTarget = vaView && vaView.votes ? vaView.votes[va] : null;
  let html = `<div class="panel"><h3>🗳️ Bỏ phiếu <small>${votedCount}/${alive.length} đã bỏ</small></h3>`;
  if (ui.isHost && hasLocals(v) && v.players.filter(p => p.alive && (p.local || p.id === 'host')).length > 1) {
    html += `<div class="vote-who"><span class="lbl">Ai đang bỏ phiếu:</span><div class="seg">${v.players.filter(p => p.alive && (p.local || p.id === 'host')).map(p => `<button type="button" data-voteas="${p.id}" aria-pressed="${va === p.id}" ${p.voted ? 'disabled' : ''}>${esc(cleanName(p.name))}${p.voted ? ' ✓' : ''}</button>`).join('')}</div></div>`;
  }
  if (va && !myVoteTarget) {
    html += `<p class="hint">${vaPlayer.id === v.me ? 'Bạn nghi ai là gián điệp nhất?' : `Tới lượt ${esc(cleanName(vaPlayer.name))} bỏ phiếu.`}</p><div class="vote-grid">${alive.map(p => `<button type="button" class="vote-btn" data-vote="${p.id}">${avatar(p.name, 36)}<span class="nm">${esc(cleanName(p.name))}${p.id === va ? ' (bạn)' : ''}</span></button>`).join('')}</div>`;
  } else if (va && myVoteTarget) {
    const t = v.players.find(p => p.id === myVoteTarget);
    html += `<p class="hint">✅ ${vaPlayer.id === v.me ? 'Bạn' : esc(cleanName(vaPlayer.name))} đã bỏ phiếu cho <b>${esc(cleanName(t ? t.name : ''))}</b>. Đang chờ ${alive.length - votedCount} người còn lại…</p>`;
  } else {
    html += `<p class="hint">⏳ Đang chờ ${alive.length - votedCount} người còn lại bỏ phiếu…</p>`;
  }
  html += '</div>';
  el.innerHTML = html;
}
$('#vote-area').addEventListener('click', e => {
  const b = e.target.closest('[data-vote],[data-voteas]');
  if (!b || !cur) return;
  if (b.dataset.voteas) { voteAs = b.dataset.voteas; render(cur, cur); return; }
  if (b.dataset.vote && voteAs) { ui.actAs(voteAs, { type: 'vote', target: b.dataset.vote }); beep('pop'); }
});

function renderElimArea(v) {
  const el = $('#elim-area');
  if (!v.elim || (v.phase !== 'elim' && v.phase !== 'ended')) { el.innerHTML = ''; return; }
  const e = v.elim;
  let html = '';
  if (e.tie) {
    html = `<div class="elim-card"><div class="e-art">🤝</div><h3>Hòa phiếu!</h3><p>Không ai bị loại — chơi vòng mới với cặp từ mới.</p></div>`;
  } else {
    const isSpy = e.role === 'spy';
    const voters = Object.entries(v.votes || {}).filter(([, t]) => t === e.pid).map(([vid]) => (v.players.find(p => p.id === vid) || {}).name).filter(Boolean);
    html = `<div class="elim-card${isSpy ? ' spy' : ''}"><div class="e-art">${isSpy ? '🕵️' : '😢'}</div><h3>${esc(cleanName(e.name))} ${isSpy ? 'là GIÁN ĐIỆP!' : 'là dân thường…'}</h3><div class="e-word">“${esc(e.word)}”</div><p>Bị loại với ${e.votes} phiếu${voters.length ? ` — ${voters.map(n => esc(cleanName(n))).join(', ')} đã bỏ phiếu cho ${esc(cleanName(e.name))}` : ''}.</p>${v.phase === 'elim' ? `<p>${isSpy ? '🎉 Dân thường bắt đúng gián điệp!' : '🕵️ Gián điệp vẫn còn trà trộn…'}</p>` : ''}</div>`;
  }
  el.innerHTML = html;
}

function renderActs(v) {
  const el = $('#acts');
  if (v.phase === 'elim') el.innerHTML = '<button class="btn big pri" data-a="next">▶ Vòng tiếp theo</button>';
  else if (v.phase === 'ended') el.innerHTML = ui.isHost
    ? '<button class="btn big pri" data-a="again">🔁 Chơi ván mới</button><button class="btn" data-a="lobby">Về phòng chờ</button>'
    : '<button class="btn" data-a="lobby">Về phòng chờ</button>';
  else el.innerHTML = '';
}
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b || !cur) return;
  const a = b.dataset.a;
  if (a === 'next') ui.act({ type: 'next' });
  else if (a === 'again') ui.net.raw.start();
  else if (a === 'lobby') ui.net.raw.restart();
});

/* xem từ chuyền tay: mỗi người trên máy này xem 1 lần, xem xong che lại rồi đưa máy */
function hideReveal() { const ov = $('#reveal-ov'); if (ov) ov.hidden = true; }
function maybeReveal(v) {
  if (!ui.isHost || !hasLocals(v) || v.phase === 'ended') { hideReveal(); return; }
  const key = v.gid + ':' + v.round;
  if (revealState && revealState.key === key) return;
  const queue = v.players.filter(p => p.alive && (p.local || p.id === 'host')).map(p => p.id);
  if (!queue.length) return;
  revealState = { key, queue, idx: 0, showing: false };
  showRevealStep(v);
}
function showRevealStep(v) {
  const ov = $('#reveal-ov'), card = $('#reveal-card');
  const rs = revealState;
  if (!rs || rs.idx >= rs.queue.length) { hideReveal(); return; }
  const pid = rs.queue[rs.idx];
  const p = v.players.find(x => x.id === pid);
  const pv = viewForPlayer(pid);
  if (!p || !pv || !pv.you) { rs.idx++; showRevealStep(v); return; }
  ov.hidden = false;
  if (!rs.showing) {
    card.innerHTML = `<div class="rv-art">${SPY_SVG}</div><h2>Đưa máy cho ${esc(cleanName(p.name))}</h2><p>Chỉ ${esc(cleanName(p.name))} được nhìn màn hình lúc này. Mọi người khác quay mặt đi nhé! 🙈</p><button class="btn big pri" id="rv-show">👁 Xem từ của tôi</button><button class="btn" id="rv-skip">Để sau</button>`;
    $('#rv-show').onclick = () => { rs.showing = true; showRevealStep(v); };
    $('#rv-skip').onclick = () => { rs.idx++; rs.showing = false; showRevealStep(v); };
  } else {
    const you = pv.you;
    card.innerHTML = `<div class="rv-art">${you.role === 'spy' ? SPY_SVG : CIV_SVG}</div><span class="rv-role ${you.role}">${you.role === 'spy' ? '🕵️ GIÁN ĐIỆP' : '🧑 DÂN THƯỜNG'}</span><div class="rv-word">“${esc(you.word)}”</div><p>${you.role === 'spy' ? 'Bạn là gián điệp! Từ của dân thường khác với từ của bạn — hãy mô tả chung chung để không bị lộ.' : 'Bạn là dân thường. Đa số mọi người cùng từ này — mô tả sao cho phe mình nhận ra bạn.'}</p><button class="btn big pri" id="rv-done">🙈 Đã xem, che lại</button>`;
    $('#rv-done').onclick = () => { rs.idx++; rs.showing = false; showRevealStep(v); };
  }
}

function showEndModal(v) {
  const winCiv = v.winSide === 'civ';
  // Thắng theo PHE (người bị loại giữa chừng vẫn thuộc phe thắng — winnerIds
  // chỉ gồm người còn sống, nên đừng dùng nó để kết luận "phe bạn thua").
  const myRole = (v.you && v.you.role) || ((v.reveal || []).find(r => r.id === v.me) || {}).role;
  const iWon = (v.winSide === 'civ' && myRole === 'civ') || (v.winSide === 'spy' && myRole === 'spy');
  const alive = v.you ? v.you.alive : true;
  const rows = (v.reveal || []).map(r => `<tr><td>${esc(cleanName(r.name))}${r.id === v.me ? ' (bạn)' : ''}${r.alive ? '' : ' ❌'}</td><td>${r.role === 'spy' ? '<span class="r-spy">🕵️ Gián điệp</span>' : '🧑 Dân thường'}</td><td>“${esc(r.word)}”</td></tr>`).join('');
  ui.openModal(`<h2>${winCiv ? '🎉 Dân thường thắng!' : '🕵️ Gián điệp thắng!'}</h2><p style="text-align:center">${iWon ? (alive ? 'Bạn ở phe thắng — chơi hay lắm!' : 'Phe của bạn thắng — tiếc là bạn bị loại giữa chừng!') : 'Phe của bạn thua — ván sau gỡ lại nhé!'}</p><table class="reveal-tbl"><tr><th>Người chơi</th><th>Vai trò</th><th>Từ</th></tr>${rows}</table><div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
}

function render(v, prev) {
  cur = v;
  if (prev) {
    if (v.phase === 'describe' && prev.phase !== 'describe') beep('turn');
    else if (v.phase === 'describe' && v.turn !== prev.turn && v.turn === v.me) beep('turn');
    if (v.phase === 'vote' && prev.phase !== 'vote') beep('vote');
    if (v.phase === 'elim' && prev.phase !== 'elim') beep('elim');
  }
  const alive = v.players.filter(p => p.alive).length;
  $('#round').innerHTML = v.phase === 'ended'
    ? `🏁 ${v.winSide === 'civ' ? 'Dân thường thắng!' : 'Gián điệp thắng!'}`
    : `🕵️ Vòng ${v.round} · ${v.spies} gián điệp · ${alive}/${v.players.length}`;
  renderRoleCard(v);
  renderSeats(v);
  renderDescs(v);
  renderDescTurn(v);
  renderVoteArea(v);
  renderElimArea(v);
  renderActs(v);
  maybeReveal(v);
  const actor = v.phase === 'describe' ? v.turn : null;
  if (actor && v.timer && (actor === v.me || (ui.isHost && isLocalActor(v, actor))) && !(v.players.find(p => p.id === actor) || {}).isBot) startTimer(v, actor);
  else stopTimer();
  if (v.phase === 'ended' && endShown !== v.gid) { endShown = v.gid; beep('win'); showEndModal(v); }
}

function openGuide() { ui.openModal(GUIDE_HTML); const c = $('#m-close'); if (c) c.onclick = ui.closeModal; }
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
$('#btn-log').onclick = () => {
  const v = cur, log = v ? v.log.slice().reverse() : [];
  ui.openModal(`<h2>📜 Nhật ký ván chơi</h2>${log.length ? `<ul class="logl">${log.map(l => `<li class="${l.kind || ''}">${esc(l.text)}</li>`).join('')}</ul>` : '<p style="text-align:center;color:var(--muted)">Chưa có gì.</p>'}<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
};
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('giandiep-sound', sound ? '1' : '0'); drawSound(); beep('pop'); };

const ui = gameKit({
  game: 'giandiep', net: NET, offline: h => { h.addBot(); h.addBot(); h.addBot(); },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => {
    if (v) render(v, prev);
    else { cur = null; endShown = null; hideWord = false; lastWordOwner = null; voteAs = null; revealState = null; stopTimer(); hideReveal(); }
  },
});
