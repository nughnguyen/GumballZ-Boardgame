// 🃏 Xì Tố — Texas Hold'em, giao diện. Luật ở engine.js, bot ở bot.js, bài ở
// cards.js, phòng/mạng dùng shared/net/simplenet.js (cùng pattern Liêng /
// Mậu Binh: chủ phòng giữ state, khách chỉ gửi action). Tiền cược (xu) lấy từ
// ví chung (shared/ui/wallet.js): giao diện tự trừ xu khi mình góp mù / Tố /
// Theo, tự cộng gà khi mình thắng — engine chỉ ghi số xu đã góp, không đụng ví.
import { createGame, applyAction, viewFor, actors, OPT_CHOICES, MIN_PLAYERS, MAX_PLAYERS, STREET_NAME } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import { cardHTML, cardBackHTML, communityHTML } from './cards.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=49';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';
import { balance, spend, addXu } from '../../shared/ui/wallet.js?v=1';

const NET = makeNet({
  game: 'xito', min: MIN_PLAYERS, max: MAX_PLAYERS, maxSeats: MAX_PLAYERS + 6,
  minMsg: 'Xì Tố cần 2–9 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: { blinds: 5, maxPlayers: 9, timer: 0 },
  optOk: (k, v) => (OPT_CHOICES[k] || []).includes(v),
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 700 + Math.random() * 900,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu', 'Bánh'],
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
  try { localStorage.setItem('gumballz-xito-mode', m); } catch (e) {}
}
function setCount(n) {
  aiCount = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, +n || 3));
  countBtns.forEach(b => { b.classList.toggle('on', +b.dataset.count === aiCount); b.setAttribute('aria-pressed', +b.dataset.count === aiCount); });
  try { localStorage.setItem('gumballz-xito-count', String(aiCount)); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
countBtns.forEach(b => b.addEventListener('click', () => setCount(+b.dataset.count)));
try {
  const sm = localStorage.getItem('gumballz-xito-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
  const sc = +localStorage.getItem('gumballz-xito-count');
  setCount(sc >= 2 && sc <= 9 ? sc : 3);
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
  $('#opts').innerHTML = `<div class="opt"><b>🪙 Mù (blinds)</b><div class="seg">${[[0, '🆓 Chơi vui (0 xu)'], [5, 'Mù 5/10 xu']].map(([v, n]) => `<button type="button" data-blinds="${v}" aria-pressed="${+o.blinds === v}" ${dis}>${n}</button>`).join('')}</div><small>Mù nhỏ 5 xu, mù lớn 10 xu — trừ thẳng vào ví chung của từng người. Chơi vui thì chỉ tính chip, ví không đụng tới.</small></div>
  <div class="opt"><b>👥 Số người tối đa</b><div class="seg">${[2, 3, 4, 5, 6, 7, 8, 9].map(v => `<button type="button" data-maxp="${v}" aria-pressed="${maxP === v}" ${dis}>${v}</button>`).join('')}</div><small>Phòng đủ số này thì không thêm được người nữa.</small></div>
  <div class="opt"><b>⏱️ Đồng hồ đi</b><div class="seg">${[[0, 'Tắt'], [30, '30 giây'], [60, '60 giây']].map(([v, n]) => `<button type="button" data-timer="${v}" aria-pressed="${+o.timer === v}" ${dis}>${n}</button>`).join('')}</div><small>Hết giờ mà chưa hành động: không cần thêm xu thì tự Xem, còn không thì tự Bỏ.</small></div>`;
  const bal = balance();
  $('#wallet-note').innerHTML = `🪙 Ví của bạn: <b>${bal.toLocaleString('vi-VN')} xu</b>${o.blinds > 0 && bal < o.blinds * 2 ? ` — không đủ 10 xu góp mù lớn, có ván bạn sẽ phải Bỏ luôn. <a href="../shop/">Kiếm xu ở đâu?</a>` : ''}`;
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
  else if (b.dataset.blinds && ui.isHost) h.setOpt('blinds', +b.dataset.blinds);
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

/* ---------- ví xu trong ván: góp mù / Tố / Theo / chia gà ---------- */
// Góp mù tự động: mỗi ghế mình điều khiển tự góp khi tới lượt góp mù (hoặc
// Bỏ luôn nếu không còn xu). Chỉ gửi 1 lần / ghế / ván — xem view.blindPosted.
const postedBlinds = new Set();
const spentThisHand = new Map(); /* gid:pid → xu đã trừ khỏi ví trong ván này */
function trackSpend(gid, pid, amt) { const k = gid + ':' + pid; spentThisHand.set(k, (spentThisHand.get(k) || 0) + amt); }
function spentOf(gid, pid) { return spentThisHand.get(gid + ':' + pid) || 0; }
function maybeBlinds(v) {
  if (!v || v.phase !== 'blinds' || v.blinds <= 0) return false;
  const pid = v.turn;
  if (!pid || !ui.controls(pid)) return false;
  const key = v.gid + ':' + pid;
  if (postedBlinds.has(key)) return false;
  const p = v.players.find(x => x.id === pid);
  if (!p || p.blindPosted) { postedBlinds.add(key); return false; }
  const due = v.blindDue || 0;
  const pay = Math.min(balance(), due);
  if (pay > 0) { spend(pay); trackSpend(v.gid, pid, pay); }
  postedBlinds.add(key);
  const before = (rawState() || {}).seq;
  ui.actAs(pid, { type: 'blind', amount: pay });
  drawWallet();
  /* actAs đồng bộ kích hoạt broadcast → render lại với view mới. Trả true khi
     lệnh góp mù đã vào ván để render ngoài dừng lại: nếu không, render ngoài
     vẽ đè view cũ lên trên (chuyền tay: cả mù nhỏ lẫn mù lớn đều do máy này
     góp nên render lồng nhau 3 lớp, lớp ngoài cùng là view cũ nhất — ván kẹt
     mãi ở “chờ góp mù” dù engine đã sang vòng Pre-flop). Đấu máy / online tự
     khỏi vì mù còn lại do máy hoặc người khác góp sau, kéo theo render mới. */
  const after = (rawState() || {}).seq;
  return before !== undefined && after !== undefined && after !== before;
}
// Chia gà khi ván kết thúc: với từng ghế mình điều khiển, ví nhận
// (gà thắng − xu đã góp + xu đã trừ) — bằng gà thắng trong trường hợp thường,
// còn bù lại phần hụt nếu người chơi Tất tay thiếu xu hoặc được chia dư.
const settledGids = new Set();
function maybeSettle(v) {
  if (!v || v.phase !== 'ended' || settledGids.has(v.gid)) return;
  settledGids.add(v.gid);
  if (!(v.blinds > 0)) return; /* chơi vui: chip chỉ để tính thắng thua, ví không đụng tới */
  let net = 0;
  for (const p of v.players) {
    if (!ui.controls(p.id) || !p.res) continue;
    const remaining = (p.res.won || 0) - (p.res.put || 0) + spentOf(v.gid, p.id);
    if (remaining > 0) { addXu(remaining); net += remaining; }
    else if (remaining < 0) { const pay = Math.min(balance(), -remaining); if (pay > 0) { spend(pay); net -= pay; } }
  }
  drawWallet();
  if (net !== 0 && mode !== 'pvp') tip(net > 0 ? `🪙 +${net.toLocaleString('vi-VN')} xu vào ví!` : `🪙 −${(-net).toLocaleString('vi-VN')} xu từ ví.`);
}
// Hành động cược của 1 ghế mình điều khiển: trừ xu trước rồi mới gửi lệnh.
// Trả false nếu không đủ xu (không gửi lệnh, người chơi chỉ còn Bỏ).
function doBet(actorId, action, cost) {
  const v = cur;
  if (!v) return false;
  if (v.blinds > 0 && cost > 0) {
    if (balance() < cost) { tip(`Không đủ ${cost} xu — chỉ còn Bỏ được thôi.`); return false; }
    if (!spend(cost)) { tip('Không đủ xu — chỉ còn Bỏ được thôi.'); return false; }
    trackSpend(v.gid, actorId, cost);
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
    if (toCall === 0) { doBet(actorId, { type: 'xem' }, 0); tip('Hết giờ — game tự Xem giúp bạn.'); }
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
  if (!p || !pv || !pv.you || !pv.you.cards) { rs.idx++; showRevealStep(v); return; }
  ov.hidden = false;
  if (!rs.showing) {
    card.innerHTML = `<h2>📱 Đưa máy cho ${esc(cleanName(p.name))}</h2><p>Chỉ ${esc(cleanName(p.name))} được nhìn màn hình lúc này. Mọi người khác quay mặt đi nhé! 🙈</p><button class="btn big pri" id="rv-show">👁 Xem bài của tôi</button><button class="btn" id="rv-skip">Để sau</button>`;
    $('#rv-show').onclick = () => { rs.showing = true; Snd.deal(); showRevealStep(v); };
    $('#rv-skip').onclick = () => { rs.idx++; rs.showing = false; showRevealStep(v); };
  } else {
    const you = pv.you;
    const hole = pv.players.find(x => x.id === pid);
    card.innerHTML = `<h2>🃏 Bài của ${esc(cleanName(p.name))}</h2><div class="rv-cards">${(hole && hole.cards || []).map(c => cardHTML(c)).join('')}</div><div class="rv-info">${you.hand ? esc(you.hand.label) : ''}</div><p>Nhớ bài của mình rồi bấm che lại — tới lượt thì bấm “👁 Xem bài” để xem lại.</p><button class="btn big pri" id="rv-done">🙈 Đã xem, che lại</button>`;
    $('#rv-done').onclick = () => { rs.idx++; rs.showing = false; showRevealStep(v); };
  }
}

/* ---------- ván chơi ---------- */
let cur = null, endShownGid = null, lastLogN = 0, lastStreet = '';
const unit = v => (v.blinds > 0 ? 'xu' : 'chip');

function seatHTML(v, p) {
  const isTurn = (v.phase === 'bet' || v.phase === 'blinds') && v.turn === p.id;
  const won = v.phase === 'ended' && (v.winnerIds || []).includes(p.id);
  const dealer = v.dealer === v.players.indexOf(p);
  return `<div class="seat${isTurn ? ' is-turn' : ''}${p.folded ? ' is-folded' : ''}${p.id === v.me ? ' is-me' : ''}${won ? ' is-winner' : ''}">
    <div class="who">${avatar(p.name, 30)}<span class="nm">${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}</span>${dealer ? '<span class="dlr">D</span>' : ''}</div>
    <div class="chips">🪙 <b>${p.stack}</b> chip${p.bet > 0 ? ` · cược <b>${p.bet}</b>` : ''}</div>
    ${p.folded ? '<div class="bet-tag">🙈 Đã Bỏ</div>' : p.allIn ? '<div class="bet-tag">🔥 Tất tay</div>' : isTurn ? '<div class="bet-tag">🤔 Đang nghĩ…</div>' : ''}
    ${v.phase === 'ended' && !p.folded && p.hand ? `<div class="hand-name">${esc(p.hand.label)}</div>` : ''}
    ${v.phase === 'ended' && !p.folded && p.cards ? `<div class="hand-mini">${p.cards.map(c => cardHTML(c)).join('')}</div>` : ''}
    ${v.phase !== 'ended' && !p.folded && p.id !== v.me ? `<div class="hand-mini">${cardBackHTML()}${cardBackHTML()}</div>` : ''}
    ${won ? '<span class="status">🏆 Thắng</span>' : ''}
  </div>`;
}
function myCardsHTML(cards) {
  if (!cards || !cards.length) return cardBackHTML() + cardBackHTML();
  return cards.map(c => cardHTML(c)).join('');
}
function render(v, prev) {
  cur = v;
  if (!v) {
    lastLogN = 0; lastStreet = ''; endShownGid = null; peekPid = null; revealState = null;
    stopTimer(); timerKey = ''; hideReveal(); return;
  }
  /* âm thanh: ván mới thì chia bài; lật bài chung thì kêu; có log mới thì kêu theo hành động */
  if (prev && prev.gid !== v.gid) { Snd.deal(); lastLogN = 0; lastStreet = ''; }
  if (v.street !== lastStreet && lastStreet !== '') Snd.flip();
  lastStreet = v.street;
  if (v.log && v.log.length > lastLogN) {
    const fresh = v.log.slice(lastLogN);
    for (const l of fresh) {
      if (/Tố|Tất tay/.test(l.text)) Snd.raise();
      else if (/Bỏ/.test(l.text)) Snd.fold();
      else if (/góp mù|Theo/.test(l.text)) Snd.chip();
    }
  }
  lastLogN = v.log ? v.log.length : 0;
  if (v.log && v.log.length === 0) lastLogN = 0;
  /* ví xu: góp mù tự động + chia gà khi hết ván — góp mù vừa gửi lệnh thì
     render lồng đã vẽ view mới, render này dừng lại để khỏi vẽ đè view cũ */
  if (maybeBlinds(v)) return;
  maybeSettle(v);
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
  /* --- dòng trạng thái --- */
  const turnP = v.players.find(p => p.id === v.turn);
  const timerChip = v.timer && v.phase === 'bet' ? ` <span class="timer-chip" id="timer-chip">⏱️ <b id="timer-left">${timerLeft}</b>s</span>` : '';
  $('#round').innerHTML = v.phase === 'blinds'
    ? `🪙 Đang góp mù — mù nhỏ ${v.blinds} xu, mù lớn ${v.blinds * 2} xu · đang chờ ${turnP ? esc(cleanName(turnP.name)) : '…'}…`
    : v.phase === 'ended'
      ? `🏁 ${esc(v.winLabel || 'Ván đã kết thúc!')}`
      : `⚔️ ${STREET_NAME[v.street] || v.street} · ${turnP ? (turnP.id === v.me ? 'tới lượt bạn!' : 'đang chờ ' + esc(cleanName(turnP.name)) + '…') : ''} · mức cược ${v.toCall} ${unit(v)}${timerChip}`;
  $('#seats').innerHTML = v.players.map(p => seatHTML(v, p)).join('');
  /* --- bàn: bài chung + gà --- */
  $('#street-name').textContent = STREET_NAME[v.street] || v.street;
  $('#community').innerHTML = communityHTML(v.community);
  $('#pot-amt').textContent = `${v.pot.toLocaleString('vi-VN')} ${unit(v)}`;
  $('#pot-sub').textContent = v.phase === 'ended'
    ? (v.winnerIds.length ? `🏆 ${v.winnerIds.map(id => esc(cleanName((v.players.find(p => p.id === id) || {}).name))).join(' & ')} hốt gà` : 'Hòa gà — không ai hơn ai')
    : v.phase === 'blinds'
      ? 'Đang góp mù…'
      : `Mức cược hiện tại: ${v.toCall} ${unit(v)} · còn ${v.community.length}/5 lá chung`;
  /* --- khu vực bài của mình --- */
  const localMode = ui.isHost && hasLocals(v);
  const heroId = localMode && v.phase !== 'ended' ? v.turn : v.me;
  const hero = v.players.find(p => p.id === heroId) || v.players.find(p => p.id === v.me);
  const myArea = $('#my-area');
  const heroView = localMode && hero ? actorView(v, hero.id) : v;
  const heroP = heroView ? heroView.players.find(p => p.id === hero.id) : null;
  const heroYou = heroView ? heroView.you : null;
  const canAct = v.phase === 'bet' && hero && ui.controls(hero.id) && !(hero.isBot) && v.turn === hero.id;
  if (v.phase === 'ended') {
    /* hết ván: hiện bài của mình (kèm tay bài mạnh nhất) */
    const showP = v.players.find(p => p.id === v.me) || {};
    myArea.innerHTML = `<div class="my-hand"><div class="mh-title">🃏 Bài của bạn</div>
      <div class="my-cards">${myCardsHTML(showP.cards || null)}</div>
      ${v.you && v.you.hand ? `<div class="hand-label">${esc(v.you.hand.label)}</div>` : ''}
      <div class="my-meta">Chip còn <b>${v.you ? v.you.stack : 0}</b> · đã góp <b>${v.you ? v.you.put : 0}</b> ${unit(v)}${v.you && v.you.res ? ` · ${v.you.res.net > 0 ? `thắng <b>+${v.you.res.net} xu</b>` : v.you.res.net < 0 ? `thua <b>${v.you.res.net} xu</b>` : 'hòa gà'}` : ''}</div></div>`;
  } else if (localMode && hero && hero.id !== v.me && (v.phase === 'bet' || v.phase === 'blinds')) {
    /* chuyền tay, tới lượt người cùng máy khác: che bài cho tới khi họ bấm xem */
    if (peekPid === hero.id && heroP && heroP.cards) {
      myArea.innerHTML = `<div class="my-hand"><div class="mh-title">🃏 Bài của ${esc(cleanName(hero.name))} — nhớ rồi bấm hành động nhé</div>
        <div class="my-cards">${myCardsHTML(heroP.cards)}</div>
        ${heroYou && heroYou.hand ? `<div class="hand-label">${esc(heroYou.hand.label)}</div>` : ''}
        <div class="my-meta">Chip còn <b>${heroYou ? heroYou.stack : 0}</b> · đã góp <b>${heroYou ? heroYou.put : 0}</b> ${unit(v)}</div></div>`;
    } else {
      myArea.innerHTML = `<div class="peek-cover"><div class="big">🙈</div><div class="txt">Tới lượt <b>${esc(cleanName(hero.name))}</b> — đưa máy cho ${esc(cleanName(hero.name))} rồi bấm xem bài.</div><button class="btn big pri" id="btn-peek" style="margin-top:10px">👁 Xem bài của ${esc(cleanName(hero.name))}</button></div>`;
      const pk = $('#btn-peek');
      if (pk) pk.onclick = () => { peekPid = hero.id; Snd.deal(); render(cur, null); };
    }
  } else if (localMode && v.phase !== 'ended' && hero && hero.isBot) {
    /* chuyền tay, tới lượt máy: che bài của mình, chỉ hiện "máy đang nghĩ" */
    myArea.innerHTML = `<div class="peek-cover"><div class="big">🤖</div><div class="txt">${esc(cleanName(hero.name))} đang suy nghĩ…</div><div class="my-cards">${myCardsHTML(null)}</div></div>`;
  } else {
    /* online / đấu máy: bài của mình luôn hiện */
    const meP = v.players.find(p => p.id === v.me) || {};
    const meYou = v.you;
    myArea.innerHTML = `<div class="my-hand"><div class="mh-title">🃏 Bài của bạn${v.phase === 'blinds' ? ' — chờ góp mù xong rồi cược' : ''}</div>
      <div class="my-cards">${myCardsHTML(meP.cards || null)}</div>
      ${meYou && meYou.hand ? `<div class="hand-label">${esc(meYou.hand.label)}</div>` : ''}
      <div class="my-meta">Chip còn <b>${meYou ? meYou.stack : 0}</b> · đã góp <b>${meYou ? meYou.put : 0}</b> ${unit(v)}</div></div>`;
  }
  /* --- nút hành động --- */
  const ga = $('#game-actions');
  if (v.phase === 'bet' && canAct) {
    const av = heroView && heroView.you ? heroView.you : v.you;
    const toCall = av ? av.toCall : 0;
    const myBet = av ? av.bet : 0;
    const myStack = av ? av.stack : 0;
    const bal = balance();
    const staked = v.blinds > 0;
    const maxRaiseTo = myBet + myStack;
    const r10 = Math.min(v.toCall + 10, maxRaiseTo);
    const r20 = Math.min(v.toCall + 20, maxRaiseTo);
    const callCost = Math.min(toCall, myStack);
    const canRaise10 = r10 > v.toCall;
    const canRaise20 = r20 > v.toCall && r20 > r10;
    const disCall = staked && bal < callCost;
    const dis10 = !canRaise10 || (staked && bal < r10 - myBet);
    const dis20 = !canRaise20 || (staked && bal < r20 - myBet);
    const disAllin = myStack <= 0;
    const minRaiseTo = Math.min(v.toCall + 10, maxRaiseTo);
    const showSlider = maxRaiseTo > minRaiseTo;
    ga.innerHTML = `
      ${toCall === 0
        ? `<button class="abtn primary" id="act-check">👌 Xem<span class="sub">không cược thêm</span></button>`
        : `<button class="abtn primary" id="act-call" ${disCall ? 'disabled' : ''} title="${disCall ? `Cần ${callCost} xu để Theo, bạn chỉ có ${bal} xu` : ''}">🤝 Theo<span class="sub">${callCost} ${unit(v)}${callCost >= myStack ? ' · tất tay' : ''}</span></button>`}
      <button class="abtn" id="act-raise10" ${dis10 ? 'disabled' : ''} title="${!canRaise10 ? 'Không đủ chip để Tố' : staked && bal < r10 - myBet ? `Cần ${r10 - myBet} xu, bạn chỉ có ${bal} xu` : `Tố lên ${r10} ${unit(v)}`}">🔥 Tố +10<span class="sub">lên ${r10} ${unit(v)}</span></button>
      <button class="abtn" id="act-raise20" ${dis20 ? 'disabled' : ''} title="${!canRaise20 ? 'Không đủ chip để Tố +20' : staked && bal < r20 - myBet ? `Cần ${r20 - myBet} xu, bạn chỉ có ${bal} xu` : `Tố lên ${r20} ${unit(v)}`}">🔥 Tố +20<span class="sub">lên ${r20} ${unit(v)}</span></button>
      <button class="abtn allin" id="act-allin" ${disAllin ? 'disabled' : ''}>🔥 Tất tay<span class="sub">${myStack} ${unit(v)}</span></button>
      <button class="abtn danger" id="act-fold">🙈 Bỏ</button>
      ${showSlider ? `<div class="raise-row"><input type="range" id="raise-range" min="${minRaiseTo}" max="${maxRaiseTo}" step="5" value="${minRaiseTo}" aria-label="Mức Tố"><span class="raise-val" id="raise-val">${minRaiseTo} ${unit(v)}</span><button class="abtn" id="act-raise">🔥 Tố</button></div>` : ''}`;
    const chk = $('#act-check'); if (chk) chk.onclick = () => { if (doBet(hero.id, { type: 'xem' }, 0)) peekPid = null; };
    const cll = $('#act-call'); if (cll) cll.onclick = () => { if (doBet(hero.id, { type: 'theo' }, callCost)) peekPid = null; };
    const r10b = $('#act-raise10'); if (r10b) r10b.onclick = () => { const a = r10 >= maxRaiseTo ? { type: 'allin' } : { type: 'to', amount: r10 }; if (doBet(hero.id, a, r10 - myBet)) peekPid = null; };
    const r20b = $('#act-raise20'); if (r20b) r20b.onclick = () => { const a = r20 >= maxRaiseTo ? { type: 'allin' } : { type: 'to', amount: r20 }; if (doBet(hero.id, a, r20 - myBet)) peekPid = null; };
    const alb = $('#act-allin'); if (alb) alb.onclick = () => { if (doBet(hero.id, { type: 'allin' }, myStack)) peekPid = null; };
    const fb = $('#act-fold'); if (fb) fb.onclick = () => { ui.actAs(hero.id, { type: 'bo' }); peekPid = null; };
    const rg = $('#raise-range');
    if (rg) {
      const upd = () => { $('#raise-val').textContent = `${rg.value} ${unit(v)}`; };
      rg.addEventListener('input', upd);
      $('#act-raise').onclick = () => {
        const amt = Math.floor(+rg.value || minRaiseTo);
        const a = amt >= maxRaiseTo ? { type: 'allin' } : { type: 'to', amount: amt };
        if (doBet(hero.id, a, amt - myBet)) peekPid = null;
      };
    }
  } else if (v.phase === 'bet' && localMode && hero && hero.isBot) {
    ga.innerHTML = `<p class="note" style="text-align:center;width:100%">🤖 ${esc(cleanName(hero.name))} đang suy nghĩ…</p>`;
  } else if (v.phase === 'blinds') {
    ga.innerHTML = `<p class="note" style="text-align:center;width:100%">🪙 Đang góp mù tự động từ ví của mỗi người…</p>`;
  } else {
    ga.innerHTML = '';
  }
  const log = $('#log');
  log.innerHTML = v.log.slice(-12).reverse().map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('') || '<div>Chưa có gì.</div>';
  /* kết thúc: hộp thoại (1 lần / ván)
     Số ván/thắng do stats.watch() tự ghi khi ván kết thúc (simplenet bọc onState)
     — KHÔNG gọi record() tay ở đây, kẻo đếm trùng. Gà thắng do maybeSettle()
     cộng/trừ vào ví. Huy hiệu riêng (xt-*) do SP.xito trong shared/ui/stats.js tự
     phát hiện từ view — main.js không ghi gì thêm. */
  if (v.phase === 'ended' && endShownGid !== v.gid && !v.spec) {
    endShownGid = v.gid;
    Snd.flip();
    const iWon = (v.winnerIds || []).includes(v.me);
    if (iWon) Snd.winJingle();
    const rows = v.players.map(p => {
      const res = p.res || {};
      return `<tr><td>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${(v.winnerIds || []).includes(p.id) ? ' 🏆' : ''}</td><td>${p.folded ? '🙈 Đã Bỏ' : esc((p.hand && p.hand.label) || '—')}</td><td>${res.net > 0 ? `+${res.net} ${unit(v)}` : res.net < 0 ? `${res.net} ${unit(v)}` : 'hòa gà'}</td></tr>`;
    }).join('');
    ui.openModal(`<h2>${v.winnerIds.length ? (iWon ? '🏆 Bạn thắng!' : '🏆 ' + esc(cleanName((v.players.find(p => p.id === v.winnerIds[0]) || {}).name)) + ' thắng!') : '🤝 Ván hòa!'}</h2>
      <p style="text-align:center">${esc(v.winLabel || '')}</p>
      <div style="text-align:center;margin:6px 0">${communityHTML(v.community)}</div>
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
  game: 'xito', net: NET,
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
