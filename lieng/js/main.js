// 🃏 Liêng – giao diện. Luật ở engine.js, bot ở bot.js, bài ở cards.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Cờ Đam / Gián Điệp:
// chủ phòng giữ state, khách chỉ gửi action). Tiền cược (xu) lấy từ ví chung
// (shared/ui/wallet.js): giao diện tự trừ xu khi mình góp gà / Tố / Theo,
// tự cộng gà khi mình thắng — engine chỉ ghi số xu đã góp, không đụng ví.
import { createGame, applyAction, viewFor, actors, OPT_CHOICES, MIN_PLAYERS, MAX_PLAYERS, toCallOf } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import { cardHTML } from './cards.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';
import { balance, spend, addXu } from '../../shared/ui/wallet.js?v=6';

const NET = makeNet({
  game: 'lieng', min: MIN_PLAYERS, max: MAX_PLAYERS, maxSeats: MAX_PLAYERS + 6,
  minMsg: 'Liêng cần 2–6 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: { ante: 5, maxPlayers: 6, timer: 0 },
  optOk: (k, v) => (OPT_CHOICES[k] || []).includes(v),
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 700 + Math.random() * 900,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu'],
  allowLocal: true,
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
let aiCount = 3; /* đấu máy: tổng số người (mình + máy) */
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const countBtns = [...document.querySelectorAll('#count-seg [data-count]')];
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#fld-count').style.display = (m === 'ai-easy' || m === 'ai-hard') ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  try { localStorage.setItem('gumballz-lieng-mode', m); } catch (e) {}
}
function setCount(n) {
  aiCount = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, +n || 3));
  countBtns.forEach(b => { b.classList.toggle('on', +b.dataset.count === aiCount); b.setAttribute('aria-pressed', +b.dataset.count === aiCount); });
  try { localStorage.setItem('gumballz-lieng-count', String(aiCount)); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
countBtns.forEach(b => b.addEventListener('click', () => setCount(+b.dataset.count)));
try {
  const sm = localStorage.getItem('gumballz-lieng-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
  const sc = +localStorage.getItem('gumballz-lieng-count');
  setCount(sc >= 2 && sc <= 6 ? sc : 3);
} catch (e) { setMode('ai-hard'); setCount(3); }

/* ---------- ví xu (hiện số dư ở màn hình chính + trong ván) ---------- */
function drawWallet() {
  const b = balance();
  const h = $('#wallet-bal'); if (h) h.textContent = b.toLocaleString('vi-VN');
  const g = $('#wallet-bal-game'); if (g) g.textContent = b.toLocaleString('vi-VN');
}
drawWallet();
try { addEventListener('gumballz-wallet', drawWallet); } catch (e) {}

/* ---------- phòng chờ ---------- */
let lastLobby = null;
function renderLobby(info, ui) {
  lastLobby = info;
  const ps = info.players || [];
  $('#pcount').textContent = `${ps.length}/${MAX_PLAYERS} người`;
  $('#plist').innerHTML = ps.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  const o = info.opts || {};
  const maxP = o.maxPlayers || MAX_PLAYERS;
  $('#add-box').innerHTML = !ui.isHost ? '' : (ps.length < maxP
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : `<p class="note">Phòng đã đủ ${maxP} người (mức tối đa chủ phòng đã chọn).</p>`);
  const dis = ui.isHost ? '' : 'disabled';
  $('#opts').innerHTML = `<div class="opt"><b>🐔 Góp gà mỗi ván</b><div class="seg">${[[0, '🆓 Chơi vui (0 xu)'], [5, '5 xu'], [10, '10 xu']].map(([v, n]) => `<button type="button" data-ante="${v}" aria-pressed="${+o.ante === v}" ${dis}>${n}</button>`).join('')}</div><small>Xu lấy từ ví chung của mỗi người. Không đủ xu góp thì vẫn chơi được nhưng không được chia gà.</small></div>
  <div class="opt"><b>👥 Số người tối đa</b><div class="seg">${[2, 3, 4, 5, 6].map(v => `<button type="button" data-maxp="${v}" aria-pressed="${maxP === v}" ${dis}>${v}</button>`).join('')}</div><small>Phòng đủ số này thì không thêm được người nữa.</small></div>
  <div class="opt"><b>⏱️ Đồng hồ đi</b><div class="seg">${[[0, 'Tắt'], [30, '30 giây'], [60, '60 giây']].map(([v, n]) => `<button type="button" data-timer="${v}" aria-pressed="${+o.timer === v}" ${dis}>${n}</button>`).join('')}</div><small>Hết giờ mà chưa hành động: không cần thêm xu thì tự Theo, còn không thì tự Bỏ.</small></div>`;
  const bal = balance();
  $('#wallet-note').innerHTML = `🪙 Ví của bạn: <b>${bal.toLocaleString('vi-VN')} xu</b>${o.ante > 0 && bal < o.ante ? ` — không đủ ${o.ante} xu góp gà, ván này bạn chơi không cược (không được chia gà). <a href="../shop/">Kiếm xu ở đâu?</a>` : ''}`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = ps.length < MIN_PLAYERS || ps.length > maxP;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.net.raw;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
  else if (b.id === 'btn-addlocal') {
    const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó cầm máy xem bài.', { title: '👥 Tên người chơi cùng máy', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
  else if (b.dataset.ante && ui.isHost) h.setOpt('ante', +b.dataset.ante);
  else if (b.dataset.maxp && ui.isHost) h.setOpt('maxPlayers', +b.dataset.maxp);
  else if (b.dataset.timer && ui.isHost) h.setOpt('timer', +b.dataset.timer);
});
$('#btn-start-online').onclick = () => {
  if (!ui.isHost) return;
  const n = (lastLobby && lastLobby.players || []).length, maxP = (lastLobby && lastLobby.opts && lastLobby.opts.maxPlayers) || MAX_PLAYERS;
  if (n > maxP) { tip(`Phòng đang có ${n} người, vượt tối đa ${maxP} — mời bớt 1 người ra đã.`); return; }
  ui.net.raw.start();
};
/* chế độ local: mở phòng offline trên máy này; đấu máy thì thêm máy sẵn theo số người đã chọn */
$('#btn-start').onclick = () => {
  ui.startHost(true);
};

/* ---------- ví xu trong ván: góp gà / Tố / Theo / chia gà ---------- */
// Góp gà tự động khi ván mới mở: mỗi ghế mình điều khiển tự góp (hoặc chơi
// không cược nếu không đủ xu). Chỉ gửi 1 lần / ghế / ván — xem view.paid.
const pendingAnte = new Set();
function maybeAnte(v) {
  if (!v || v.phase !== 'ante' || v.ante <= 0) return false;
  const before = (rawState() || {}).seq;
  for (const p of v.players) {
    if (!ui.controls(p.id)) continue;
    const key = v.gid + ':' + p.id;
    if (p.paid) { pendingAnte.delete(key); continue; }
    if (pendingAnte.has(key)) continue;
    pendingAnte.add(key);
    if (spend(v.ante)) {
      ui.actAs(p.id, { type: 'ante' });
    } else {
      ui.actAs(p.id, { type: 'ante-free' });
      if (p.id === v.me) tip(`Không đủ ${v.ante} xu góp gà — ván này bạn chơi không cược (không được chia gà).`);
    }
    drawWallet();
  }
  /* actAs đồng bộ kích hoạt broadcast → render lại với view mới. Trả true khi
     lệnh góp gà đã vào ván để render ngoài dừng lại: nếu không, render ngoài
     vẽ đè view cũ lên trên (chuyền tay: cả 2 ghế đều do máy này góp nên render
     lồng nhau, lớp ngoài cùng là view cũ nhất — ván kẹt mãi ở “đang góp gà”
     dù engine đã sang vòng cược). Đấu máy / online tự khỏi vì gà còn lại do
     máy hoặc người khác góp sau, kéo theo render mới. */
  const after = (rawState() || {}).seq;
  return before !== undefined && after !== undefined && after !== before;
}
// Chia gà khi ván kết thúc: cộng phần gà của từng ghế mình điều khiển vào ví.
const creditedPots = new Set();
function maybeCreditPot(v) {
  if (!v || v.phase !== 'ended' || creditedPots.has(v.gid)) return;
  creditedPots.add(v.gid);
  if (v.ante <= 0) return; /* chơi vui: gà tính bằng điểm, ví không đụng tới */
  let myShare = 0;
  for (const p of v.players) {
    if (!ui.controls(p.id) || !p.res || p.res.r !== 'win' || !(p.res.share > 0)) continue;
    addXu(p.res.share);
    if (p.id === v.me) myShare += p.res.share;
  }
  drawWallet();
  if (myShare > 0 && mode !== 'pvp') tip(`🪙 +${myShare.toLocaleString('vi-VN')} xu gà vào ví!`);
}
// Hành động cược của 1 ghế mình điều khiển: trừ xu trước rồi mới gửi lệnh.
// Trả false nếu không đủ xu (không gửi lệnh, người chơi chỉ còn Bỏ).
function doBet(actorId, action, cost) {
  const v = cur;
  if (!v) return false;
  if (v.ante > 0 && cost > 0) {
    if (balance() < cost) { tip(`Không đủ ${cost} xu — chỉ còn Bỏ được thôi.`); return false; }
    if (!spend(cost)) { tip('Không đủ xu — chỉ còn Bỏ được thôi.'); return false; }
    drawWallet();
  }
  ui.actAs(actorId, action);
  return true;
}

/* ---------- đồng hồ đi (mỗi máy tự chạy cho người mình điều khiển) ---------- */
let timerInt = null, timerLeft = 0, timerKey = '';
function stopTimer() { if (timerInt) { clearInterval(timerInt); timerInt = null; } }
function drawTimerChip() {
  const el = $('#timer-left'); if (el) el.textContent = Math.max(0, timerLeft);
  const chip = $('#timer-chip'); if (chip) chip.classList.toggle('low', timerLeft <= 10);
}
function startTimer(v, actorId) {
  stopTimer();
  timerLeft = v.timer;
  drawTimerChip();
  timerInt = setInterval(() => {
    timerLeft--;
    drawTimerChip();
    if (timerLeft > 0) return;
    stopTimer();
    const s = cur;
    if (!s || s.phase !== 'bet' || s.turn !== actorId) return;
    const av = actorView(s, actorId);
    const toCall = av && av.you ? av.you.toCall : 0;
    if (toCall === 0) { doBet(actorId, { type: 'theo' }, 0); tip('Hết giờ — game tự Theo giúp bạn.'); }
    else { ui.actAs(actorId, { type: 'bo' }); tip('Hết giờ — game tự Bỏ giúp bạn.'); }
  }, 1000);
}

/* ---------- chuyền tay: xem bài của từng người trên máy này ---------- */
const rawState = () => (ui.net && ui.net.raw && ui.net.raw.state) || null;
/* ảnh chụp ván của 1 người chơi cùng máy (chỉ chủ phòng giữ state gốc) */
const viewForPlayer = pid => {
  if (!pid) return null;
  if (pid === (cur && cur.me)) return cur;
  const s = rawState();
  return s ? viewFor(s, pid) : null;
};
const hasLocals = v => (v.players || []).some(p => p.local);
const isLocalActor = (v, pid) => { const p = (v.players || []).find(x => x.id === pid); return !!p && (p.local || pid === 'host'); };
/* view của người đang tới lượt trên máy này (chuyền tay) — để không lộ bài người khác */
function actorView(v, pid) {
  if (!ui.isHost || !hasLocals(v)) return v;
  return viewForPlayer(pid) || v;
}
let peekPid = null; /* ghế đang mở bài xem (chuyền tay) — đổi lượt thì che lại */
let revealState = null;
/* xem bài đầu ván (chuyền tay): mỗi người trên máy này xem 1 lần, xem xong che lại rồi đưa máy */
function hideReveal() { const ov = $('#reveal-ov'); if (ov) ov.hidden = true; }
function maybeReveal(v) {
  if (!ui.isHost || !hasLocals(v) || v.phase === 'ended') { hideReveal(); return; }
  const key = v.gid + ':start';
  if (revealState && revealState.key === key) return;
  const queue = v.players.filter(p => p.local || p.id === 'host').map(p => p.id);
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
  if (!p || !pv || !pv.you || !pv.you.info) { rs.idx++; showRevealStep(v); return; }
  ov.hidden = false;
  if (!rs.showing) {
    card.innerHTML = `<h2>📱 Đưa máy cho ${esc(cleanName(p.name))}</h2><p>Chỉ ${esc(cleanName(p.name))} được nhìn màn hình lúc này. Mọi người khác quay mặt đi nhé! 🙈</p><button class="btn big pri" id="rv-show">👁 Xem bài của tôi</button><button class="btn" id="rv-skip">Để sau</button>`;
    $('#rv-show').onclick = () => { rs.showing = true; Snd.deal(); showRevealStep(v); };
    $('#rv-skip').onclick = () => { rs.idx++; rs.showing = false; showRevealStep(v); };
  } else {
    const you = pv.you;
    card.innerHTML = `<h2>🃏 Bài của ${esc(cleanName(p.name))}</h2><div class="rv-cards">${(pv.players.find(x => x.id === pid).cards || []).map(c => cardHTML(c)).join('')}</div><div class="rv-info">${esc(you.info.label)}</div><p>Nhớ bài của mình rồi bấm che lại — tới lượt thì bấm “👁 Xem bài” để xem lại.</p><button class="btn big pri" id="rv-done">🙈 Đã xem, che lại</button>`;
    $('#rv-done').onclick = () => { rs.idx++; rs.showing = false; showRevealStep(v); };
  }
}

/* ---------- ván chơi ---------- */
let cur = null, endShownGid = null, lastSeq = -1, lastLogN = 0;
const unit = v => (v.ante > 0 ? 'xu' : 'điểm');

function handCardsHTML(cards, mini = false) {
  if (!cards || !cards.length) return [null, null, null].map(() => cardHTML(null, mini ? 'mini' : '')).join('');
  return cards.map(c => cardHTML(c, mini ? 'mini' : '')).join('');
}
function seatHTML(v, p) {
  const isTurn = v.phase === 'bet' && v.turn === p.id;
  const won = v.phase === 'ended' && (v.winnerIds || []).includes(p.id);
  return `<div class="seat${isTurn ? ' on' : ''}${p.folded ? ' out' : ''}">${avatar(p.name, 40)}<b>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}</b>
    ${p.folded ? '<span class="fold-tag">🙈 Đã Bỏ</span>' : won ? '<span class="win-tag">🏆 Thắng</span>' : ''}
    <span class="chips">🪙 ${p.contrib} ${unit(v)}</span>
    <small>${p.isBot ? 'máy ' + (p.level === 'easy' ? 'Dễ' : 'Khó') : p.local ? 'cùng máy' : p.acted ? '✓ đã hành động' : ''}</small></div>`;
}
function otherHandHTML(v, p) {
  const isTurn = v.phase === 'bet' && v.turn === p.id;
  const open = v.phase === 'ended' && !p.folded;
  const info = open && p.info ? p.info : null;
  const res = p.res;
  return `<div class="other-hand${isTurn ? ' on' : ''}">
    <div class="oh-name"><span>${avatar(p.name, 28)} ${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}</span><span class="st">${p.folded ? '🙈 Đã Bỏ' : isTurn ? '🤔 đang suy nghĩ…' : p.acted ? '✓ xong' : `góp ${p.contrib} ${unit(v)}`}</span></div>
    <div class="oh-cards">${handCardsHTML(open ? p.cards : null, true)}</div>
    ${info ? `<div class="oh-info${info.tier >= 3 ? ' big' : ''}">${esc(info.label)}${res && res.r === 'win' ? ` · hốt ${res.share} ${unit(v)}` : ''}</div>` : ''}
  </div>`;
}

function render(v, prev) {
  cur = v;
  if (!v) {
    lastSeq = -1; endShownGid = null; peekPid = null; revealState = null;
    stopTimer(); timerKey = ''; hideReveal(); return;
  }
  /* âm thanh: ván mới thì chia bài; có log mới thì kêu theo hành động */
  if (prev && prev.gid !== v.gid) { Snd.deal(); lastLogN = 0; }
  if (v.log && v.log.length > lastLogN) {
    const fresh = v.log.slice(lastLogN);
    for (const l of fresh) {
      if (/Tố/.test(l.text)) Snd.raise();
      else if (/Bỏ/.test(l.text)) Snd.fold();
      else if (/góp|Theo/.test(l.text)) Snd.chip();
    }
  }
  lastLogN = v.log ? v.log.length : 0;
  if (v.log && v.log.length === 0) lastLogN = 0;
  /* ví xu: góp gà tự động + chia gà khi hết ván — góp gà vừa gửi lệnh thì
     render lồng đã vẽ view mới, render này dừng lại để khỏi vẽ đè view cũ */
  if (maybeAnte(v)) return;
  maybeCreditPot(v);
  /* chuyền tay: xem bài đầu ván */
  maybeReveal(v);
  /* đổi lượt thì che bài lại (chuyền tay) */
  if (prev && v.turn !== prev.turn) peekPid = null;
  /* đồng hồ đi: reset khi đổi lượt, chỉ chạy cho người mình điều khiển */
  const actor = v.phase === 'bet' ? v.turn : null;
  const tKey = v.gid + ':' + (v.turn || '') + ':' + (v.seq || 0);
  if (v.timer && v.phase === 'bet' && actor && ui.controls(actor) && !(v.players.find(p => p.id === actor) || {}).isBot) {
    if (tKey !== timerKey) { timerKey = tKey; startTimer(v, actor); }
  } else { stopTimer(); timerKey = ''; }
  const turnP = v.players.find(p => p.id === v.turn);
  const timerChip = v.timer && v.phase === 'bet' ? ` <span class="timer-chip" id="timer-chip">⏱️ <b id="timer-left">${timerLeft}</b>s</span>` : '';
  const waitingAnte = v.phase === 'ante' ? v.players.filter(p => !p.paid).map(p => cleanName(p.name)).join(', ') : '';
  $('#round').innerHTML = v.phase === 'ante'
    ? `🐔 Đang góp gà${v.ante > 0 ? ` ${v.ante} xu` : ' (chơi vui)'} — đang chờ ${esc(waitingAnte || '…')}…`
    : v.phase === 'ended'
      ? `🏁 ${esc(v.winLabel || 'Ván đã kết thúc!')}`
      : `⚔️ Vòng cược · ${turnP ? (turnP.id === v.me ? 'tới lượt bạn!' : 'đang chờ ' + esc(cleanName(turnP.name)) + '…') : ''} · Tố ${v.raises || 0}/3 lần${timerChip}`;
  $('#seats').innerHTML = v.players.map(p => seatHTML(v, p)).join('');
  $('#pot-amt').textContent = `${v.pot.toLocaleString('vi-VN')} ${unit(v)}`;
  $('#pot-sub').textContent = v.phase === 'ante'
    ? 'Đang góp gà…'
    : v.phase === 'ended'
      ? (v.winnerIds.length ? `🏆 ${v.winnerIds.map(id => esc(cleanName((v.players.find(p => p.id === id) || {}).name))).join(' & ')} hốt gà` : 'Không ai chia gà')
      : `Gà đang ${v.currentBet} ${unit(v)} · Tố tối đa 3 lần (đã Tố ${v.raises || 0})`;
  /* --- khu vực bài --- */
  const localMode = ui.isHost && hasLocals(v);
  const heroId = localMode && v.phase !== 'ended' ? v.turn : v.me;
  const hero = v.players.find(p => p.id === heroId) || v.players.find(p => p.id === v.me);
  const others = v.players.filter(p => p.id !== (hero ? hero.id : null));
  $('#others').innerHTML = others.map(p => otherHandHTML(v, p)).join('') || '<div class="other-hand"><div class="oh-name">Chưa có ai khác</div></div>';
  const myArea = $('#my-area');
  const heroView = localMode && hero ? actorView(v, hero.id) : v;
  const heroP = heroView ? heroView.players.find(p => p.id === hero.id) : null;
  const heroYou = heroView ? heroView.you : null;
  const canAct = v.phase === 'bet' && hero && ui.controls(hero.id) && !(hero.isBot) && v.turn === hero.id;
  if (v.phase === 'ended') {
    /* hết ván: hiện bài của mình (hoặc của người thắng) */
    const showP = heroP && heroP.cards ? heroP : (v.players.find(p => p.id === v.me) || {});
    myArea.innerHTML = `<div class="my-hand"><div class="mh-title">🃏 Bài ${hero && hero.id !== v.me ? 'của ' + esc(cleanName(hero.name)) : 'của bạn'}</div>
      <div class="mh-cards">${handCardsHTML(showP.cards || null)}</div>
      ${showP.info ? `<div class="mh-info">${esc(showP.info.label)}</div>` : ''}</div>`;
  } else if (localMode && hero && hero.id !== v.me && v.phase === 'bet') {
    /* chuyền tay, tới lượt người cùng máy khác: che bài cho tới khi họ bấm xem */
    if (peekPid === hero.id && heroP && heroP.cards) {
      myArea.innerHTML = `<div class="my-hand"><div class="mh-title">🃏 Bài của ${esc(cleanName(hero.name))} — nhớ rồi bấm hành động nhé</div>
        <div class="mh-cards">${handCardsHTML(heroP.cards)}</div>
        ${heroYou && heroYou.info ? `<div class="mh-info">${esc(heroYou.info.label)}</div>` : ''}</div>`;
    } else {
      myArea.innerHTML = `<div class="peek-cover"><p>📱 Tới lượt <b>${esc(cleanName(hero.name))}</b> — đưa máy cho ${esc(cleanName(hero.name))} rồi bấm xem bài.</p><button class="btn big pri" id="btn-peek">👁 Xem bài của ${esc(cleanName(hero.name))}</button></div>`;
      const pk = $('#btn-peek');
      if (pk) pk.onclick = () => { peekPid = hero.id; Snd.deal(); render(cur, null); };
    }
  } else if (localMode && v.phase === 'bet' && hero && hero.isBot) {
    /* chuyền tay, tới lượt máy: che bài của mình, chỉ hiện "máy đang nghĩ" */
    myArea.innerHTML = `<div class="peek-cover"><p>🤖 ${esc(cleanName(hero.name))} đang suy nghĩ…</p><div class="mh-cards">${handCardsHTML(null)}</div></div>`;
  } else {
    /* online / đấu máy: bài của mình luôn hiện */
    const meP = v.players.find(p => p.id === v.me) || {};
    const meYou = v.you;
    myArea.innerHTML = `<div class="my-hand"><div class="mh-title">🃏 Bài của bạn${v.phase === 'ante' ? ' — chờ góp gà xong rồi cược' : ''}</div>
      <div class="mh-cards">${handCardsHTML(meP.cards || null)}</div>
      ${meYou && meYou.info ? `<div class="mh-info">${esc(meYou.info.label)}</div>` : ''}</div>`;
  }
  /* --- nút hành động --- */
  const ga = $('#game-actions');
  if (v.phase === 'bet' && canAct) {
    const av = heroView && heroView.you ? heroView.you : v.you;
    const toCall = av ? av.toCall : 0;
    const bal = balance();
    const staked = v.ante > 0;
    const r5 = toCall + 5, r10 = toCall + 10;
    const canRaise = (v.raises || 0) < 3;
    const dis5 = !canRaise || (staked && bal < r5);
    const dis10 = !canRaise || (staked && bal < r10);
    const disCall = staked && bal < toCall;
    ga.innerHTML = `<button class="btn pri" id="act-raise5" ${dis5 ? 'disabled' : ''} title="${!canRaise ? 'Đã hết 3 lần Tố trong vòng này' : staked && bal < r5 ? `Cần ${r5} xu, bạn chỉ có ${bal} xu` : `Tố thêm 5 xu (tổng ${r5} xu)`}">🔥 Tố +5 <small>(${r5} ${unit(v)})</small></button>
    <button class="btn pri" id="act-raise10" ${dis10 ? 'disabled' : ''} title="${!canRaise ? 'Đã hết 3 lần Tố trong vòng này' : staked && bal < r10 ? `Cần ${r10} xu, bạn chỉ có ${bal} xu` : `Tố thêm 10 xu (tổng ${r10} xu)`}">🔥 Tố +10 <small>(${r10} ${unit(v)})</small></button>
    <button class="btn call" id="act-call" ${disCall ? 'disabled' : ''} title="${disCall ? `Cần ${toCall} xu để Theo, bạn chỉ có ${bal} xu` : toCall === 0 ? 'Không cần thêm xu' : `Bỏ thêm ${toCall} xu cho bằng gà`}">${toCall === 0 ? '👌 Theo (không tốn thêm)' : `🤝 Theo (${toCall} ${unit(v)})`}</button>
    <button class="btn" id="act-fold">🙈 Bỏ</button>`;
    $('#act-raise5').onclick = () => { if (doBet(hero.id, { type: 'to', raise: 5 }, r5)) { peekPid = null; } };
    $('#act-raise10').onclick = () => { if (doBet(hero.id, { type: 'to', raise: 10 }, r10)) { peekPid = null; } };
    $('#act-call').onclick = () => { if (doBet(hero.id, { type: 'theo' }, toCall)) { peekPid = null; } };
    $('#act-fold').onclick = () => { ui.actAs(hero.id, { type: 'bo' }); peekPid = null; };
  } else if (v.phase === 'bet' && localMode && hero && hero.isBot) {
    ga.innerHTML = `<p class="note" style="text-align:center;width:100%">🤖 ${esc(cleanName(hero.name))} đang suy nghĩ…</p>`;
  } else if (v.phase === 'bet') {
    ga.innerHTML = '';
  } else {
    ga.innerHTML = '';
  }
  /* --- dải góp gà --- */
  const ab = $('#ante-bar');
  if (v.phase === 'ante') {
    ab.style.display = '';
    ab.innerHTML = `<div>🐔 Đang góp gà ${v.ante > 0 ? `${v.ante} xu` : '(chơi vui)'} — ${v.players.map(p => `${esc(cleanName(p.name))} ${p.paid ? (p.free ? '🆓 chơi không cược' : '✓ đã góp') : '…'}`).join(' · ')}</div><div class="btns"><span class="note">Góp gà tự động từ ví của mỗi người.</span></div>`;
  } else {
    ab.style.display = 'none';
    ab.innerHTML = '';
  }
  const log = $('#log');
  log.innerHTML = v.log.slice(-12).reverse().map(l => `<div>${esc(l.text)}</div>`).join('') || '<div>Chưa có gì.</div>';
  /* kết thúc: hộp thoại (1 lần / ván)
     Số ván/thắng do stats.watch() tự ghi khi ván kết thúc (simplenet bọc onState)
     — KHÔNG gọi record() tay ở đây, kẻo đếm trùng. Gà thắng do maybeCreditPot()
     cộng vào ví. Huy hiệu riêng (lg-*) do SP.lieng trong shared/ui/stats.js tự
     phát hiện từ view — main.js không ghi gì thêm. */
  if (v.phase === 'ended' && endShownGid !== v.gid && !v.spec) {
    endShownGid = v.gid;
    Snd.flip();
    const iWon = (v.winnerIds || []).includes(v.me);
    if (iWon) Snd.winJingle();
    const rows = v.players.filter(p => !p.folded).map(p => {
      const info = p.info;
      const res = p.res || {};
      return `<tr><td>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${(v.winnerIds || []).includes(p.id) ? ' 🏆' : ''}</td><td>${info ? esc(info.label) : '—'}</td><td>${res.r === 'win' ? `+${res.share} ${unit(v)}` : res.r === 'fold' ? 'Đã Bỏ' : res.r === 'winhand' ? 'Bài to nhất (không chia gà)' : `${res.delta} ${unit(v)}`}</td></tr>`;
    }).join('');
    ui.openModal(`<h2>${v.winnerIds.length ? (iWon ? '🏆 Bạn thắng!' : '🏆 ' + esc(cleanName((v.players.find(p => p.id === v.winnerIds[0]) || {}).name)) + ' thắng!') : '🤝 Ván kết thúc!'}</h2>
      <p style="text-align:center">${esc(v.winLabel || '')}</p>
      <table class="reveal-tbl"><tr><th>Người chơi</th><th>Bài</th><th>Kết quả</th></tr>${rows}</table>
      <div class="btn-col">${ui.isHost
        ? '<button class="btn big pri" id="m-again">🔁 Chơi ván mới</button><button class="btn" id="m-lobby">Về phòng chờ</button>'
        : '<button class="btn" id="m-close">Đóng — chờ chủ phòng mở ván mới</button>'}
      <button class="btn" id="m-home">🏠 Về trang chủ</button></div>`);
    const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); ui.net.raw.start(); };
    const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); ui.net.raw.restart(); };
    const close = $('#m-close'); if (close) close.onclick = ui.closeModal;
    $('#m-home').onclick = () => { ui.closeModal(); ui.leave(); setTimeout(() => { location.href = '../'; }, 250); };
  }
}

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
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'lieng', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      for (let i = 1; i < aiCount; i++) h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
    }
    /* pvp (chuyền tay): chủ phòng thêm người/máy ở phòng chờ */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => { render(v, prev); },
});

/* 🏠 nút home phải về đúng trang chủ web (gameKit chỉ về màn hình đầu của game) */
$('#btn-leave').onclick = async () => {
  const r = await confirmBox(ui.isHost ? 'Bạn là chủ phòng: rời đi là cả phòng giải tán.' : 'Bạn có thể vào lại bằng mã phòng.', { title: 'Rời ván?', ok: 'Rời ván', cancel: 'Ở lại', danger: true });
  if (r) { ui.leave(); setTimeout(() => { location.href = '../'; }, 250); }
};
