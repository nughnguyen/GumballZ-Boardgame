// 🎲 Domino – giao diện. Luật ở engine.js, bot ở bot.js, quân ở tiles.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Liêng: chủ phòng giữ
// state, khách chỉ gửi action {type, tile?, end?}). Bấm quân hợp lệ trên tay
// để chọn, rồi bấm đầu dây trái/phải để đặt; không có quân hợp thì rút quân.
import { createGame, applyAction, viewFor, actors, OPT_CHOICES, MIN_PLAYERS, MAX_PLAYERS, TARGET_LABEL, legalPlays, tileOf, tileName, tilePips } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import { tileHTML, tileBackHTML } from './tiles.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'domino', min: MIN_PLAYERS, max: MAX_PLAYERS, maxSeats: MAX_PLAYERS + 6,
  minMsg: 'Domino cần 2–4 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: { target: 100, maxPlayers: 4, timer: 0 },
  optOk: (k, v) => (OPT_CHOICES[k] || []).includes(v),
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 700 + Math.random() * 900,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu'],
  allowLocal: true,
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
let aiCount = 2; /* đấu máy: tổng số người (mình + máy) */
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const countBtns = [...document.querySelectorAll('#count-seg [data-count]')];
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#fld-count').style.display = (m === 'ai-easy' || m === 'ai-hard') ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  try { localStorage.setItem('gumballz-domino-mode', m); } catch (e) {}
}
function setCount(n) {
  aiCount = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, +n || 2));
  countBtns.forEach(b => { b.classList.toggle('on', +b.dataset.count === aiCount); b.setAttribute('aria-pressed', +b.dataset.count === aiCount); });
  try { localStorage.setItem('gumballz-domino-count', String(aiCount)); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
countBtns.forEach(b => b.addEventListener('click', () => setCount(+b.dataset.count)));
try {
  const sm = localStorage.getItem('gumballz-domino-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
  const sc = +localStorage.getItem('gumballz-domino-count');
  setCount(sc >= 2 && sc <= 4 ? sc : 2);
} catch (e) { setMode('ai-hard'); setCount(2); }

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
  $('#opts').innerHTML = `<div class="opt"><b>🎯 Điểm mục tiêu</b><div class="seg">${[[0, 'Ván đơn'], [50, '50 điểm'], [100, '100 điểm'], [150, '150 điểm']].map(([v, n]) => `<button type="button" data-target="${v}" aria-pressed="${+o.target === v}" ${dis}>${n}</button>`).join('')}</div><small>Điểm tích lũy qua các ván — ai đủ điểm trước thì thắng trận. Ván đơn thì hết 1 ván là hết trận.</small></div>
  <div class="opt"><b>👥 Số người tối đa</b><div class="seg">${[2, 3, 4].map(v => `<button type="button" data-maxp="${v}" aria-pressed="${maxP === v}" ${dis}>${v}</button>`).join('')}</div><small>Phòng đủ số này thì không thêm được người nữa.</small></div>
  <div class="opt"><b>⏱️ Đồng hồ đi</b><div class="seg">${[[0, 'Tắt'], [30, '30 giây'], [60, '60 giây']].map(([v, n]) => `<button type="button" data-timer="${v}" aria-pressed="${+o.timer === v}" ${dis}>${n}</button>`).join('')}</div><small>Hết giờ mà chưa hành động: còn quân hợp thì game tự đặt 1 quân, không có quân hợp thì tự rút.</small></div>`;
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
    const n = await promptBox('Nhiều người chuyền máy cho nhau, mỗi người một lượt.', { title: '👥 Tên người chơi cùng máy', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
  else if (b.dataset.target !== undefined && ui.isHost) h.setOpt('target', +b.dataset.target);
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
    if (!s || s.phase !== 'playing' || s.handEnd || s.turn !== actorId) return;
    const av = actorView(s, actorId);
    const you = av && av.you;
    if (!you) return;
    if ((you.playable || []).length) {
      const t = you.playable[Math.floor(Math.random() * you.playable.length)];
      const ends = legalPlaysFor(av, actorId, t);
      ui.actAs(actorId, { type: 'play', tile: t, end: ends[0] || 'left' });
      tip('Hết giờ — game tự đặt 1 quân giúp bạn.');
    } else if (you.canDraw) {
      ui.actAs(actorId, { type: 'draw' });
      tip('Hết giờ — game tự rút 1 quân giúp bạn.');
    }
  }, 1000);
}
/* các đầu dây mà 1 quân hợp lệ có thể đặt vào (tính từ view của người chơi) */
function legalPlaysFor(v, pid, tile) {
  if (!v || !v.chain) return ['left'];
  if (!v.chain.length) return ['left'];
  const o = tileOf(tile); if (!o) return ['left'];
  const out = [];
  if (o.a === v.leftEnd || o.b === v.leftEnd) out.push('left');
  if (o.a === v.rightEnd || o.b === v.rightEnd) out.push('right');
  return out.length ? out : ['left'];
}

/* ---------- chuyền tay: xem quân của từng người trên máy này ---------- */
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
/* view của người đang tới lượt trên máy này (chuyền tay) — để không lộ quân người khác */
function actorView(v, pid) {
  if (!ui.isHost || !hasLocals(v)) return v;
  return viewForPlayer(pid) || v;
}
let peekPid = null; /* ghế đang mở quân xem (chuyền tay) — đổi lượt thì che lại */
let revealState = null;
let selTile = null; /* quân đang chọn trên tay để đặt */
/* xem quân đầu ván (chuyền tay): mỗi người trên máy này xem 1 lần, xem xong che lại rồi đưa máy */
function hideReveal() { const ov = $('#reveal-ov'); if (ov) ov.hidden = true; }
function maybeReveal(v) {
  if (!ui.isHost || !hasLocals(v) || v.phase === 'ended' || v.handEnd) { hideReveal(); return; }
  const key = v.gid + ':hand' + v.handNo;
  if (revealState && revealState.key === key) return;
  if (revealState && revealState.key !== key) revealState = null;
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
  if (!p || !pv || !pv.you || !pv.you.hand) { rs.idx++; showRevealStep(v); return; }
  ov.hidden = false;
  if (!rs.showing) {
    card.innerHTML = `<h2>📱 Đưa máy cho ${esc(cleanName(p.name))}</h2><p>Chỉ ${esc(cleanName(p.name))} được nhìn màn hình lúc này. Mọi người khác quay mặt đi nhé! 🙈</p><button class="btn big pri" id="rv-show">👁 Xem quân của tôi</button><button class="btn" id="rv-skip">Để sau</button>`;
    $('#rv-show').onclick = () => { rs.showing = true; Snd.deal(); showRevealStep(v); };
    $('#rv-skip').onclick = () => { rs.idx++; rs.showing = false; showRevealStep(v); };
  } else {
    const hand = pv.you.hand;
    card.innerHTML = `<h2>🎲 Quân của ${esc(cleanName(p.name))}</h2><div class="rv-tiles">${hand.map(t => tileHTML(t)).join('')}</div><p>Nhớ quân của mình rồi bấm che lại — tới lượt thì bấm “👁 Xem quân” để xem lại.</p><button class="btn big pri" id="rv-done">🙈 Đã xem, che lại</button>`;
    $('#rv-done').onclick = () => { rs.idx++; rs.showing = false; showRevealStep(v); };
  }
}

/* ---------- ván chơi ---------- */
let cur = null, endShownGid = null, lastPlayN = -1, lastDrawN = -1, lastPassN = -1, lastHandNo = -1;

function seatHTML(v, p) {
  const isTurn = v.phase === 'playing' && !v.handEnd && v.turn === p.id;
  const won = v.phase === 'ended' && v.winner === p.id;
  return `<div class="seat${isTurn ? ' on' : ''}">${avatar(p.name, 40)}<b>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}</b>
    ${won ? '<span class="win-tag">🏆 Thắng</span>' : ''}
    <span class="pts">${p.score} điểm <small>· ${p.handWins} ván thắng</small></span>
    <small>${p.n} quân${p.isBot ? ' · máy ' + (p.level === 'easy' ? 'Dễ' : 'Khó') : p.local ? ' · cùng máy' : ''}</small></div>`;
}
function chainHTML(v) {
  if (!v.chain.length) return `<div class="dm-empty">Chưa có quân nào — người mở màn đặt quân đầu tiên vào giữa dây.</div>`;
  const last = v.lastPlay;
  return v.chain.map((c, i) => {
    const isNew = last && last.tile === c.tile && ((last.end === 'left' && i === 0) || (last.end !== 'left' && i === v.chain.length - 1));
    const t = tileOf(c.tile);
    return tileHTML(c.tile, { dbl: t && t.double, cls: isNew ? 'dm-new' : '' });
  }).join('');
}
function otherHTML(v, p) {
  const isTurn = v.phase === 'playing' && !v.handEnd && v.turn === p.id;
  const backs = p.hand && v.phase === 'ended'
    ? p.hand.map(t => tileHTML(t)).join('')
    : Array.from({ length: p.n }, () => tileBackHTML({ cls: 'dm-mini' })).join('');
  return `<div class="dm-other${isTurn ? ' on' : ''}">
    <div class="oh-name"><span>${avatar(p.name, 28)} ${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}</span><span class="pts">${p.score}đ</span></div>
    <div class="oh-tiles">${backs || '<span class="oh-st">Hết quân!</span>'}</div>
    <div class="oh-st">${isTurn ? '🤔 đang suy nghĩ…' : p.isBot ? 'máy ' + (p.level === 'easy' ? 'Dễ' : 'Khó') : p.local ? 'cùng máy' : `${p.n} quân trên tay`}</div>
  </div>`;
}

function render(v, prev) {
  cur = v;
  if (!v) {
    lastPlayN = -1; lastDrawN = -1; lastPassN = -1; lastHandNo = -1;
    endShownGid = null; peekPid = null; revealState = null; selTile = null;
    stopTimer(); timerKey = ''; hideReveal(); return;
  }
  const me = v.players.find(p => p.id === v.me);
  const turnP = v.players.find(p => p.id === v.turn);
  const away = (v.away || []).map(id => (v.players.find(p => p.id === id) || {}).name).filter(Boolean);
  /* âm thanh: đặt quân / rút quân / bỏ lượt / ván mới */
  if (v.lastPlay && v.lastPlay.n !== lastPlayN) {
    if (lastPlayN !== -1) Snd.place();
    lastPlayN = v.lastPlay.n;
  }
  if (v.lastDraw && v.lastDraw.n !== lastDrawN) {
    if (lastDrawN !== -1) Snd.draw();
    lastDrawN = v.lastDraw.n;
  }
  if (v.lastPass && v.lastPass.n !== lastPassN) {
    if (lastPassN !== -1) Snd.pass();
    lastPassN = v.lastPass.n;
  }
  if (v.handNo !== lastHandNo) {
    if (lastHandNo !== -1) Snd.deal();
    lastHandNo = v.handNo;
  }
  /* chuyền tay: xem quân đầu ván */
  maybeReveal(v);
  /* đổi lượt / đổi ván thì che quân lại + bỏ quân đang chọn */
  if (prev && (v.turn !== prev.turn || v.handNo !== prev.handNo)) { peekPid = null; selTile = null; }
  if (v.handEnd) selTile = null;
  /* đồng hồ đi: reset khi đổi lượt, chỉ chạy cho người mình điều khiển */
  const actor = v.phase === 'playing' && !v.handEnd ? v.turn : null;
  const tKey = v.gid + ':' + (v.turn || '') + ':' + v.handNo;
  if (v.timer && v.phase === 'playing' && !v.handEnd && actor && ui.controls(actor) && !(v.players.find(p => p.id === actor) || {}).isBot) {
    if (tKey !== timerKey) { timerKey = tKey; startTimer(v, actor); }
  } else { stopTimer(); timerKey = ''; }
  const timerChip = v.timer && v.phase === 'playing' && !v.handEnd ? ` <span class="timer-chip" id="timer-chip">⏱️ <b id="timer-left">${timerLeft}</b>s</span>` : '';
  /* người đang tới lượt trên máy này (chuyền tay: hero có thể khác mình) */
  const localMode = ui.isHost && hasLocals(v);
  const heroId = localMode && v.phase !== 'ended' ? v.turn : v.me;
  const hero = v.players.find(p => p.id === heroId) || v.players.find(p => p.id === v.me);
  const heroView = localMode && hero ? actorView(v, hero.id) : v;
  const heroYou = heroView ? heroView.you : null;
  const canAct = v.phase === 'playing' && !v.handEnd && hero && ui.controls(hero.id) && !hero.isBot && v.turn === hero.id;
  const targetTxt = v.target === 0 ? 'ván đơn' : `mục tiêu ${v.target} điểm`;
  $('#round').innerHTML = v.phase === 'ended'
    ? (v.draw ? `🤝 Trận hòa!`
      : v.endReason === 'resign' ? `🏳️ ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name))} thắng trận — đối thủ xin thua!`
      : `🏁 ${v.winner === v.me ? 'Bạn thắng trận! 🎉' : esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name)) + ' thắng trận!'}`)
    : v.handEnd
      ? `🏁 Ván ${v.handNo} đã xong — ${v.handEnd.winnerId ? esc(cleanName((v.players.find(p => p.id === v.handEnd.winnerId) || {}).name)) + ' thắng ván' : 'ván hòa'}${v.handEnd.points ? ` (+${v.handEnd.points} điểm)` : ''} · ${targetTxt}`
      : `⚔️ Ván ${v.handNo} · ${turnP ? (turnP.id === v.me ? 'tới lượt bạn!' : 'đang chờ ' + esc(cleanName(turnP.name)) + '…') : ''} · ${targetTxt}${away.length ? ` · ⚠️ ${esc(away.join(', '))} mất kết nối — máy sẽ đi thay` : ''}${timerChip}`;
  $('#seats').innerHTML = v.players.map(p => seatHTML(v, p)).join('');
  /* --- dây quân + 2 đầu dây + chồng rút --- */
  const ends = { left: v.leftEnd, right: v.rightEnd };
  const selEnds = selTile != null ? legalPlaysFor(v, v.turn, selTile) : [];
  const endBtn = (side, val) => {
    const ok = selTile != null && selEnds.includes(side);
    const no = selTile != null && !selEnds.includes(side);
    const id = side === 'left' ? 'end-l' : 'end-r';
    const empty = !v.chain.length; /* chưa có dây: nước mở màn chỉ đặt được vào đầu trái (quân mở màn), hiện ★ thay cho số */
    const dis = empty ? (side === 'left' ? '' : 'disabled') : (val == null ? 'disabled' : '');
    return `<button type="button" id="${id}" class="dm-end${ok ? ' ok' : ''}${no ? ' no' : ''}" data-end="${side}" ${dis} aria-label="Đầu dây ${side === 'left' ? 'trái' : 'phải'}${empty ? ', mở màn' : (val == null ? '' : ', số ' + val)}">${empty ? '★' : (val == null ? '–' : val)}<small>${side === 'left' ? '◀ đầu trái' : 'đầu phải ▶'}</small></button>`;
  };
  $('#chain').innerHTML = chainHTML(v);
  $('#end-l').outerHTML = endBtn('left', ends.left);
  $('#end-r').outerHTML = endBtn('right', ends.right);
  $('#bone').innerHTML = `🎲 Chồng rút: <b>${v.boneyardN} quân</b>${canAct && heroYou && heroYou.canDraw ? ` <button class="btn big pri" id="btn-draw">🎲 Rút 1 quân</button>` : ''}`;
  const bd = $('#btn-draw');
  if (bd) bd.onclick = () => { if (hero) ui.actAs(hero.id, { type: 'draw' }); };
  /* --- khu vực quân --- */
  const others = v.players.filter(p => p.id !== (hero ? hero.id : null));
  $('#others').innerHTML = others.map(p => otherHTML(v, p)).join('') || '<div class="dm-other"><div class="oh-name">Chưa có ai khác</div></div>';
  const myArea = $('#my-area');
  if (v.phase === 'ended') {
    const showP = heroView ? heroView.players.find(p => p.id === hero.id) : null;
    myArea.innerHTML = `<div class="dm-my"><div class="mh-title">🎲 Quân còn lại của ${hero && hero.id !== v.me ? esc(cleanName(hero.name)) : 'bạn'}</div>
      <div class="dm-hand">${showP && showP.hand ? showP.hand.map(t => tileHTML(t)).join('') : '<span class="oh-st">Hết quân!</span>'}</div></div>`;
  } else if (localMode && hero && hero.id !== v.me) {
    /* chuyền tay, tới lượt người cùng máy khác: che quân cho tới khi họ bấm xem */
    if (peekPid === hero.id && heroYou && heroYou.hand) {
      myArea.innerHTML = myHandHTML(v, hero, heroYou, true);
      bindHand(v, hero);
    } else {
      myArea.innerHTML = `<div class="dm-my"><div class="peek-cover"><p>📱 Tới lượt <b>${esc(cleanName(hero.name))}</b> — đưa máy cho ${esc(cleanName(hero.name))} rồi bấm xem quân.</p><button class="btn big pri" id="btn-peek">👁 Xem quân của ${esc(cleanName(hero.name))}</button></div></div>`;
      const pk = $('#btn-peek');
      if (pk) pk.onclick = () => { peekPid = hero.id; Snd.deal(); render(cur, null); };
    }
  } else if (localMode && hero && hero.isBot) {
    myArea.innerHTML = `<div class="dm-my"><div class="peek-cover"><p>🤖 ${esc(cleanName(hero.name))} đang suy nghĩ…</p></div></div>`;
  } else {
    /* online / đấu máy: quân của mình luôn hiện */
    myArea.innerHTML = myHandHTML(v, hero, heroYou, false);
    bindHand(v, hero);
  }
  /* --- nút hành động --- */
  const ga = $('#game-actions');
  if (v.phase === 'playing' && !v.handEnd && canAct) {
    const you = heroYou || {};
    const playable = you.playable || [];
    if (you.canDraw) {
      ga.innerHTML = `<p class="note" style="text-align:center;width:100%">😶 Bạn không có quân nào hợp lệ — rút quân từ chồng rút nhé!</p>`;
    } else if (selTile != null) {
      const endsOk = legalPlaysFor(v, hero.id, selTile);
      const o = tileOf(selTile);
      ga.innerHTML = `<p class="note" style="text-align:center;width:100%">Đã chọn quân <b>${o ? `[${o.a}|${o.b}]` : ''}</b> — bấm 1 đầu dây để đặt:</p>` +
        endsOk.map(e => `<button class="btn pri" data-place="${e}">${e === 'left' ? '◀ Đặt vào đầu trái' : 'Đặt vào đầu phải ▶'}${v.chain.length ? ` (${e === 'left' ? v.leftEnd : v.rightEnd})` : ' (mở màn)'}</button>`).join('') +
        `<button class="btn" id="btn-unsel">Hủy chọn</button>`;
      ga.querySelectorAll('[data-place]').forEach(b => { b.onclick = () => { ui.actAs(hero.id, { type: 'play', tile: selTile, end: b.dataset.place }); selTile = null; }; });
      $('#btn-unsel').onclick = () => { selTile = null; render(cur, null); };
    } else if (playable.length) {
      ga.innerHTML = `<p class="note" style="text-align:center;width:100%">👆 Bấm 1 quân sáng trên tay để chọn, rồi bấm đầu dây trái/phải để đặt.${!v.chain.length ? ' Quân có ★ là quân mở màn — bắt buộc đặt quân đó.' : ''}</p>`;
    } else {
      ga.innerHTML = '';
    }
  } else if (v.phase === 'playing' && !v.handEnd && localMode && hero && hero.isBot) {
    ga.innerHTML = `<p class="note" style="text-align:center;width:100%">🤖 ${esc(cleanName(hero.name))} đang suy nghĩ…</p>`;
  } else {
    ga.innerHTML = '';
  }
  /* --- dải hết ván --- */
  const hb = $('#handend-bar');
  if (v.phase === 'playing' && v.handEnd) {
    const he = v.handEnd;
    const rows = v.players.map(p => `<tr><td>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${he.winnerId === p.id ? ' 🏆' : ''}</td><td>${(he.pips || {})[p.id] ?? '—'} nút</td><td><b>${p.score} điểm</b></td></tr>`).join('');
    const reason = he.reason === 'domino' ? 'hết quân — Domino!' : he.reason === 'blocked' ? 'ván khóa — ít nút nhất thắng' : 'ván hòa nút';
    hb.style.display = '';
    hb.innerHTML = `<div>🏁 Ván ${he.handNo} xong: ${he.winnerId ? `<b>${esc(cleanName((v.players.find(p => p.id === he.winnerId) || {}).name))}</b> thắng ván (${reason})${he.points ? `, <b>+${he.points} điểm</b>` : ''}` : `Ván hòa nút (${reason}) — không ai được điểm.`}</div>
      <table class="score-tbl"><tr><th>Người chơi</th><th>Nút còn lại</th><th>Tổng điểm</th></tr>${rows}</table>
      <div class="btns">${ui.isHost ? '<button class="btn big pri" id="btn-next-hand">▶ Ván tiếp theo</button>' : '<div class="note">Chờ chủ phòng mở ván mới…</div>'}</div>`;
    const nx = $('#btn-next-hand');
    if (nx) nx.onclick = () => { ui.act({ type: 'next-hand' }); };
  } else {
    hb.style.display = 'none';
    hb.innerHTML = '';
  }
  const log = $('#log');
  log.innerHTML = v.log.slice(-12).reverse().map(l => `<div>${esc(l.text)}</div>`).join('') || '<div>Chưa có gì.</div>';
  /* kết thúc trận: hộp thoại (1 lần / trận)
     Số ván/thắng do stats.watch() tự ghi khi trận kết thúc (simplenet bọc onState)
     — KHÔNG gọi record() tay ở đây, kẻo đếm trùng.
     Huy hiệu riêng (dm-*) do SP.domino trong shared/ui/stats.js tự phát hiện
     từ view (tick/end) — main.js không ghi gì thêm. */
  if (v.phase === 'ended' && endShownGid !== v.gid && !v.spec) {
    endShownGid = v.gid;
    const won = v.winner === v.me;
    if (v.draw) Snd.drawSnd();
    else if (won) Snd.winJingle();
    else Snd.lose();
    const wName = (v.players.find(p => p.id === v.winner) || {}).name;
    const rows = [...v.players].sort((a, b) => b.score - a.score).map(p => `<tr><td>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${v.winner === p.id ? ' 🏆' : ''}</td><td>${p.handWins} ván thắng</td><td><b>${p.score} điểm</b></td></tr>`).join('');
    let reason = '';
    if (v.draw) reason = 'Ván đơn hòa nút — không ai thắng trận.';
    else if (v.endReason === 'resign') reason = won ? 'Đối thủ xin thua — bạn thắng trận!' : esc(cleanName(wName)) + ' thắng trận vì bạn xin thua.';
    else if (v.endReason === 'hand') reason = won ? 'Bạn thắng ván đơn!' : esc(cleanName(wName)) + ' thắng ván đơn!';
    else reason = won ? `Bạn đủ ${v.target} điểm trước!` : esc(cleanName(wName)) + ` đủ ${v.target} điểm trước!`;
    ui.openModal(`<h2>${v.draw ? '🤝 Trận hòa!' : won ? '🏆 Bạn thắng trận!' : '🏆 ' + esc(cleanName(wName)) + ' thắng trận!'}</h2>
      <p style="text-align:center">${reason}</p>
      <table class="reveal-tbl"><tr><th>Người chơi</th><th>Ván thắng</th><th>Điểm</th></tr>${rows}</table>
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
/* người đang tới lượt trên máy này (chuyền tay) */
function localHero(v) {
  const localMode = ui.isHost && hasLocals(v);
  const heroId = localMode && v.phase !== 'ended' ? v.turn : v.me;
  return v.players.find(p => p.id === heroId) || null;
}
function myHandHTML(v, hero, you, isLocal) {
  const hand = (you && you.hand) || [];
  const playable = new Set((you && you.playable) || []);
  const starter = (you && you.starterTile) || null;
  const tiles = hand.map(t => {
    const cls = [];
    if (playable.has(t)) cls.push('playable');
    if (selTile === t) cls.push('sel');
    if (starter === t && !v.chain.length) cls.push('starter');
    return tileHTML(t, { cls: cls.join(' ') });
  }).join('') || '<span class="oh-st">Hết quân!</span>';
  return `<div class="dm-my"><div class="mh-title">🎲 Quân của ${hero && hero.id !== v.me ? esc(cleanName(hero.name)) : 'bạn'} · ${hand.length} quân · ${you ? you.pips : 0} nút${!v.chain.length && starter != null ? ` · ★ Quân mở màn: ${tileName(starter)}` : ''}</div>
    <div class="dm-hand">${tiles}</div></div>`;
}
function bindHand(v, hero) {
  const handEl = $('#my-area .dm-hand');
  if (!handEl || !hero) return;
  handEl.querySelectorAll('.dm-tile[data-tile]').forEach(el => {
    el.addEventListener('click', () => {
      const t = +el.dataset.tile;
      const you = (localHero(v) && actorView(v, hero.id) || {}).you || v.you || {};
      if (!(you.playable || []).includes(t)) { Snd.invalid(); tip('Quân này không khớp đầu dây nào.'); return; }
      if (selTile === t) { selTile = null; }
      else { selTile = t; Snd.select(); }
      render(cur, null);
    });
  });
}
/* bấm đầu dây để đặt quân đang chọn */
document.addEventListener('click', e => {
  const eb = e.target.closest('.dm-end');
  if (!eb || !cur || cur.phase !== 'playing' || cur.handEnd) return;
  if (selTile == null) { tip('Bấm 1 quân hợp lệ trên tay trước đã.'); return; }
  const hero = localHero(cur);
  if (!hero || !ui.controls(hero.id) || hero.isBot || cur.turn !== hero.id) { tip('Chưa tới lượt bạn.'); return; }
  const endsOk = legalPlaysFor(cur, hero.id, selTile);
  if (!endsOk.includes(eb.dataset.end)) { Snd.invalid(); tip('Quân này không khớp đầu dây đó.'); return; }
  ui.actAs(hero.id, { type: 'play', tile: selTile, end: eb.dataset.end });
  selTile = null;
});

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
  if (!ui.isHost) { tip('Chỉ chủ phòng mở trận mới được.'); return; }
  ui.net.raw.start();
};
$('#btn-resign').onclick = async () => {
  const v = cur;
  if (!v || v.phase === 'ended') return;
  const r = await confirmBox('Nhận thua trận này? Người có điểm cao nhất còn lại thắng trận.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  /* online: xin thua cho chính mình; chơi chung máy: xin thua cho người đang tới lượt */
  if (mode === 'online') ui.act({ type: 'resign' });
  else ui.actAs(v.turn, { type: 'resign' });
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'domino', net: NET,
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
