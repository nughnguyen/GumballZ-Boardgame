// 🌹 Skull – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Saboteur: chủ
// phòng giữ state, khách chỉ gửi action {type, ...}). Mỗi vòng 3 giai
// đoạn: đặt đĩa úp → ra giá → lật đĩa. Đĩa trên tay là bí mật — chơi
// chuyền tay thì từng người bấm 👁 xem bài rồi đi, đi xong che lại.
import { createGame, applyAction, viewFor, actors, isSkull, isRose, POINTS_TO_WIN } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=53';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=15';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet({
  game: 'skull', min: 3, max: 6, maxSeats: 6, allowLocal: true,
  minMsg: 'Skull cần 3–6 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: () => false,
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 700 + Math.random() * 900,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu', 'Bánh', 'Cốm'],
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
let playerCount = 4; /* đấu máy: tổng số người (bạn + máy) */
try {
  const c = +localStorage.getItem('gumballz-skull-count');
  if (c >= 3 && c <= 6) playerCount = c;
} catch (e) {}
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const countBtns = [...document.querySelectorAll('#count-seg [data-count]')];
function drawCount() {
  countBtns.forEach(b => { b.classList.toggle('on', +b.dataset.count === playerCount); b.setAttribute('aria-pressed', +b.dataset.count === playerCount); });
}
countBtns.forEach(b => b.addEventListener('click', () => {
  playerCount = +b.dataset.count; drawCount();
  try { localStorage.setItem('gumballz-skull-count', String(playerCount)); } catch (e) {}
}));
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#count-box').style.display = (m === 'ai-easy' || m === 'ai-hard') ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'pvp' ? '👥 Mở phòng chuyền tay' : m === 'ai-easy' ? `🤖 Bắt đầu chơi với máy Dễ (${playerCount} người)` : `🧠 Bắt đầu chơi với máy Khó (${playerCount} người)`;
  try { localStorage.setItem('gumballz-skull-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
drawCount();
try {
  const sm = localStorage.getItem('gumballz-skull-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }
// đổi số người thì cập nhật chữ nút Bắt đầu
countBtns.forEach(b => b.addEventListener('click', () => setMode(mode)));

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  $('#pcount').textContent = `${n}/6 người (cần 3–6)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${i === 0 ? '<span class="seat-role">👑 Đi trước</span>' : ''}${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (n < 6
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  $('#opts').innerHTML = `<div class="opt"><b>🌹 Luật nhanh</b><div class="role-note">Mỗi người 4 đĩa úp: 3 hoa hồng + 1 đầu lâu. Mỗi vòng: đặt úp 1 đĩa → ra giá (tối thiểu 1, phải cao hơn giá trước) → người thắng giá lật đúng số đĩa đã ra giá, bắt đầu bằng đĩa của chính mình. Toàn hoa hồng thì +1 điểm; gặp đầu lâu thì mất 1 đĩa. Ai được 2 điểm trước thì thắng trận; ai hết đĩa thì bị loại.</div></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = n < 3 || n > 6;
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
    const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó bấm 👁 xem bài. Nhớ che lại trước khi đưa máy!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let handRevealed = false; /* chuyền tay: đã bấm 👁 xem bài của người tới lượt chưa */
let revealedFor = null;
let endShownFor = '';
let bidAmount = 0; /* giá đang chọn trên bảng ra giá */

function rawState() {
  return (ui.net && ui.net.raw && ui.net.raw.state) || null;
}
function handOf(v, pid) {
  if (mode === 'pvp') {
    const s = rawState();
    const p = s && s.players.find(x => x.id === pid);
    if (p && !p.isBot) return p.hand.slice();
    if (p && p.isBot) return [];
  }
  const p = v.players.find(x => x.id === pid);
  return p ? (p.hand || []).slice() : [];
}
/* người cùng máy đang tới lượt (chuyền tay); đấu máy/online thì là chính mình */
function turnHuman(v) {
  if (!v || v.phase !== 'playing') return null;
  const p = v.players.find(x => x.id === v.turn);
  if (mode === 'pvp') return p && !p.isBot ? p : null;
  return v.players.find(x => x.id === v.me) || null;
}
function isMyTurn(v, pid) {
  return v && v.phase === 'playing' && v.turn === pid;
}
/* đĩa đã lật của 1 người (công khai) */
function flippedOf(v, pid) {
  return v.flip ? v.flip.flipped.filter(f => f.pid === pid) : [];
}
function discHtml(card, cls = '') {
  if (card === 'back') return `<div class="sk-disc back ${cls}"><span class="sk-disc-ic">❓</span></div>`;
  if (isSkull(card)) return `<div class="sk-disc skull ${cls}" data-card="${card}"><span class="sk-disc-ic">💀</span></div>`;
  return `<div class="sk-disc rose ${cls}" data-card="${card}"><span class="sk-disc-ic">🌹</span></div>`;
}
function handCardHtml(card, cant) {
  if (isSkull(card)) {
    return `<div class="sk-card skull ${cant ? 'cant' : ''}" data-card="${card}"><span class="sk-disc-ic">💀</span><span class="sk-card-name">Đầu lâu</span><span class="sk-card-sub">Úp xuống, đừng để lộ!</span></div>`;
  }
  return `<div class="sk-card rose ${cant ? 'cant' : ''}" data-card="${card}"><span class="sk-disc-ic">🌹</span><span class="sk-card-name">Hoa hồng</span><span class="sk-card-sub">Đĩa an toàn</span></div>`;
}

function render(v, prev) {
  cur = v;
  if (!v) { handRevealed = false; revealedFor = null; endShownFor = ''; bidAmount = 0; return; }
  const me = v.players.find(p => p.id === v.me) || {};
  const turnP = v.players.find(p => p.id === v.turn);
  const human = turnHuman(v);
  const handPid = human ? human.id : null;
  /* chuyền tay: đổi người thì che bài lại */
  if (mode === 'pvp' && revealedFor && (!human || revealedFor !== human.id)) { handRevealed = false; revealedFor = null; }

  const stageTxt = v.stage === 'place' ? 'đặt đĩa úp'
    : v.stage === 'bid' ? `ra giá (giá hiện tại ${v.bid.amount}${v.bid.bidder ? ' · ' + cleanName((v.players.find(p => p.id === v.bid.bidder) || {}).name) : ''})`
    : `lật đĩa (${cleanName((v.players.find(p => p.id === (v.flip && v.flip.bidder)) || {}).name)} phải lật ${v.flip ? v.flip.target : '?'} đĩa · đã lật ${v.flip ? v.flip.flipped.length : 0})`;
  $('#round').textContent = v.phase === 'ended'
    ? `🏁 Trận đã kết thúc — ${v.winner ? cleanName((v.players.find(p => p.id === v.winner) || {}).name) + ' thắng trận!' : 'không có người thắng.'}`
    : `🌹 Vòng ${v.round} · ${stageTxt} · lượt của ${turnP ? cleanName(turnP.name) : '…'}${turnP && turnP.isBot ? ' 🤖' : ''}`;
  $('#status').innerHTML = v.players.map(p => {
    return `<span class="stat ${p.id === v.me ? 'me' : ''} ${p.alive ? '' : 'out'}">${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}${p.alive ? '' : ' 💀 đã bị loại'}: <b>⭐ ${p.points} điểm</b> · 🃏 ${p.handCount} đĩa</span>`;
  }).join('');

  /* ----- thảm của từng người ----- */
  const myTurn = handPid && isMyTurn(v, handPid) && ui.controls(handPid);
  const flipTargetable = (p) => {
    if (!myTurn || v.stage !== 'flip' || !v.flip || v.flip.bidder !== handPid) return false;
    if (!p.placedCount) return false;
    /* lượt lật đầu tiên bắt buộc là đĩa của chính mình */
    if (v.flip.flipped.length === 0) return p.id === handPid;
    return true;
  };
  $('#players').innerHTML = v.players.map(p => {
    const isTurn = p.id === v.turn && v.phase === 'playing';
    const flipped = flippedOf(v, p.id);
    /* đĩa úp còn lại trên thảm = tổng đã đặt trừ số đã lật (đĩa lật rồi hiện ngửa) */
    const backs = Math.max(0, p.placedCount - flipped.length);
    const mat = flipped.map(f => discHtml(f.card, 'flipped')).join('') + Array.from({ length: backs }, () => discHtml('back')).join('');
    return `<div class="sk-player ${p.id === v.me ? 'me' : ''} ${isTurn ? 'turn' : ''} ${flipTargetable(p) ? 'flippable' : ''} ${p.alive ? '' : 'out'}" data-pid="${p.id}">
      ${avatar(p.name, 40)}
      <div class="sk-pinfo">
        <b>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === v.me ? ' (bạn)' : ''}${p.id === v.winner ? ' 👑' : ''}${isTurn ? ' 👉 tới lượt' : ''}${p.alive ? '' : ' 💀'}</b>
        <span class="sk-ptotal">⭐ ${p.points} điểm · 🃏 ${p.handCount} đĩa trên tay · 💀 mất ${p.lostCount} đĩa</span>
        <span class="sk-pmeta">${p.alive ? 'Đang chơi' : 'Đã bị loại'}</span>
      </div>
      <div class="sk-mat">${mat || '<span class="sk-mat-empty">Chưa đặt đĩa</span>'}</div>
    </div>`;
  }).join('');

  /* ----- bài trên tay ----- */
  const hand = v.phase === 'playing' && handPid ? handOf(v, handPid) : [];
  const cover = mode === 'pvp' && v.phase === 'playing' && human && !handRevealed;
  $('#hand-cover').style.display = cover ? '' : 'none';
  $('#hand').style.display = cover ? 'none' : '';
  $('#btn-reveal-hand').textContent = human ? `👁 Xem bài của ${cleanName(human.name)}` : '👁 Xem bài của bạn';
  const turnDone = v.phase === 'playing' && handPid && v.turn !== handPid;
  $('#picked-note').style.display = (!cover && turnDone) ? '' : 'none';
  if (!cover) {
    if (!hand.length) {
      $('#hand').innerHTML = v.phase === 'ended' ? '' : '<p class="note">Đang chờ chia bài…</p>';
    } else {
      const handName = mode === 'pvp' && human ? cleanName(human.name) : 'bạn';
      const canControl = myTurn;
      const hint = v.stage === 'place' ? 'Bấm 1 đĩa để đặt úp lên thảm của bạn:' : 'Bài trên tay:';
      $('#hand').innerHTML = `<div class="sk-hand-label">${canControl ? `${hint}` : 'Bài trên tay:'}</div>` + hand.map(c => handCardHtml(c, !canControl)).join('');
    }
  }

  /* ----- bảng ra giá ----- */
  const bidPanel = $('#bid-panel');
  if (v.phase === 'playing' && v.stage === 'bid' && myTurn) {
    const min = v.bid.amount + 1, max = v.totalPlaced;
    if (!bidAmount || bidAmount < min || bidAmount > max) bidAmount = min;
    bidPanel.style.display = '';
    bidPanel.innerHTML = `<span class="hint">Giá hiện tại: <b>${v.bid.amount}</b> · tối đa ${max} đĩa trên bàn</span>
      <span class="bid-ctl">
        <button class="btn" id="btn-bid-down" aria-label="Giảm giá">−</button>
        <b class="bid-num" id="bid-num">${bidAmount}</b>
        <button class="btn" id="btn-bid-up" aria-label="Tăng giá">+</button>
      </span>
      <button class="btn pri" id="btn-bid">💰 Ra giá ${bidAmount}</button>
      ${v.bid.amount > 0 ? `<button class="btn" id="btn-pass">🙅 Bỏ giá</button>` : `<span class="note">Chưa có giá — bạn phải ra giá ít nhất 1.</span>`}`;
    $('#btn-bid-down').onclick = () => { if (bidAmount > min) { bidAmount--; Snd.pick(); render(cur, cur); } };
    $('#btn-bid-up').onclick = () => { if (bidAmount < max) { bidAmount++; Snd.pick(); render(cur, cur); } };
    $('#btn-bid').onclick = () => { const a = bidAmount; bidAmount = 0; Snd.place(); ui.actAs(handPid, { type: 'bid', amount: a }); };
    const passBtn = $('#btn-pass');
    if (passBtn) passBtn.onclick = () => { bidAmount = 0; Snd.pick(); ui.actAs(handPid, { type: 'pass' }); };
  } else {
    bidPanel.style.display = 'none';
    bidPanel.innerHTML = '';
  }

  /* ----- gợi ý giai đoạn lật ----- */
  const flipNote = $('#flip-note');
  if (v.phase === 'playing' && v.stage === 'flip' && myTurn && v.flip && v.flip.bidder === handPid) {
    flipNote.style.display = '';
    flipNote.textContent = v.flip.flipped.length === 0
      ? `Bạn thắng giá ${v.flip.target} — lật đĩa của CHÍNH MÌNH trước (bấm vào thảm của bạn).`
      : `Đã lật ${v.flip.flipped.length}/${v.flip.target} đĩa — bấm 1 thảm còn đĩa úp để lật tiếp.`;
  } else {
    flipNote.style.display = 'none';
    flipNote.textContent = '';
  }

  $('#log').innerHTML = v.log.slice().reverse().map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');

  /* âm thanh + hộp kết thúc */
  if (prev && v.phase === 'playing' && prev.phase === 'playing') {
    if (v.turn !== prev.turn) Snd.hint();
    else if (v.flip && (!prev.flip || v.flip.flipped.length > prev.flip.flipped.length)) {
      const last = v.flip.flipped[v.flip.flipped.length - 1];
      if (last && isSkull(last.card)) Snd.wrong(); else Snd.place();
    }
  }
  if (v.phase === 'ended') {
    const key = v.gid + ':' + v.seq;
    if (endShownFor !== key) { endShownFor = key; showEnd(v); }
    if (v.winner === v.me) Snd.winJingle(); else if (prev && prev.phase !== 'ended') Snd.lose();
  }
}

/* ---------- hộp kết thúc ---------- */
function showEnd(v) {
  const winner = v.players.find(p => p.id === v.winner);
  const title = v.winner === v.me ? '👑 Bạn thắng trận!' : winner ? `🏁 ${esc(cleanName(winner.name))} thắng trận!` : '😢 Không ai thắng';
  const rows = [...v.players].sort((a, b) => b.points - a.points).map(p =>
    `<tr><td>${esc(cleanName(p.name))}${p.id === v.winner ? ' 👑' : ''}${p.id === v.me ? ' (bạn)' : ''}</td><td>⭐ ${p.points} điểm</td><td>🃏 ${p.handCount} đĩa còn lại</td><td>${p.alive ? 'Đang chơi' : '💀 Đã bị loại'}</td></tr>`).join('');
  const body = `<table style="width:100%;border-collapse:collapse;font-size:14px;text-align:center"><tr><th style="text-align:left">Người chơi</th><th>Điểm</th><th>Đĩa còn lại</th><th>Trạng thái</th></tr>${rows}</table><p class="note">${v.winner === v.me ? 'Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.' : 'Chơi 1 ván +2 xu.'}</p>`;
  const btns = ui.isHost
    ? `<button class="btn big pri" id="m-again">🔁 Ván mới</button><button class="btn" id="m-lobby">Về phòng chờ</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`
    : `<button class="btn big pri" id="m-close">Đóng</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`;
  ui.openModal(`<h2>${title}</h2>${body}<div class="btns">${btns}</div>`, 'lock');
  const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); ui.net.raw.start(); };
  const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); ui.net.raw.restart(); };
  const home = $('#m-home'); if (home) home.onclick = () => { ui.closeModal(); ui.leave(); };
  const close = $('#m-close'); if (close) close.onclick = ui.closeModal;
}

/* ---------- bấm đĩa trên tay: giai đoạn đặt thì đặt úp luôn ---------- */
$('#hand').addEventListener('click', e => {
  const el = e.target.closest('.sk-card'); if (!el || !cur || cur.phase !== 'playing') return;
  const human = turnHuman(cur);
  const handPid = human ? human.id : null;
  if (!handPid || !isMyTurn(cur, handPid) || !ui.controls(handPid)) { tip('Chưa tới lượt bạn.'); return; }
  if (cur.stage !== 'place') { tip('Giờ không phải giai đoạn đặt đĩa.'); return; }
  const card = el.dataset.card;
  Snd.place();
  ui.actAs(handPid, { type: 'place', card });
});
/* ---------- bấm thảm của 1 người: lật đĩa trên cùng của họ ---------- */
$('#players').addEventListener('click', e => {
  const el = e.target.closest('.sk-player'); if (!el || !cur || cur.phase !== 'playing') return;
  const human = turnHuman(cur);
  const handPid = human ? human.id : null;
  if (!handPid || !isMyTurn(cur, handPid) || !ui.controls(handPid)) { tip('Chưa tới lượt bạn.'); return; }
  if (cur.stage !== 'flip' || !cur.flip || cur.flip.bidder !== handPid) { tip('Giờ không phải lượt lật của bạn.'); return; }
  const target = el.dataset.pid;
  const tp = cur.players.find(x => x.id === target);
  if (!tp || !tp.placedCount) { tip('Thảm này không còn đĩa nào để lật.'); Snd.invalid(); return; }
  if (cur.flip.flipped.length === 0 && target !== handPid) { tip('Lượt lật đầu tiên phải là đĩa của chính bạn.'); Snd.invalid(); return; }
  Snd.pick();
  ui.actAs(handPid, { type: 'flip', target });
});
$('#btn-reveal-hand').onclick = () => {
  const human = turnHuman(cur);
  handRevealed = true; revealedFor = human ? human.id : (cur ? cur.me : null);
  Snd.pick(); render(cur, cur);
};

/* ---------- nút phụ ---------- */
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
  const r = await confirmBox('Nhận thua trận này? Trận kết thúc ngay, người còn lại nhiều điểm nhất thắng.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  if (mode === 'online') ui.act({ type: 'resign' });
  else {
    const human = turnHuman(v);
    const pid = human ? human.id : v.me;
    ui.actAs(pid, { type: 'resign' });
  }
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'skull', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      /* đấu máy: bạn + (số người − 1) máy */
      for (let i = 0; i < playerCount - 1; i++) h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
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
