// 🎆 Hanabi – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Skull: chủ
// phòng giữ state, khách chỉ gửi action {type, ...}). Hợp tác: cả đội
// cùng thắng hoặc cùng thua. Điểm đặc biệt: bài của mình luôn úp —
// chỉ thấy những gì đã được gợi ý (số / màu hiện trên lá bài); bài
// người khác thì thấy hết. Bấm lá của mình → đánh/bỏ; bấm lá của
// người khác → gợi ý số hoặc màu của lá đó.
import { createGame, applyAction, viewFor, actors, SUITS, SUIT_NAMES, SUIT_EMOJI, WIN_SCORE } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet({
  game: 'hanabi', min: 2, max: 5, maxSeats: 5, allowLocal: true,
  minMsg: 'Hanabi cần 2–5 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: () => false,
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 700 + Math.random() * 900,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu', 'Bánh', 'Cốm'],
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
let playerCount = 3; /* đấu máy: tổng số người (bạn + máy) */
try {
  const c = +localStorage.getItem('gumballz-hanabi-count');
  if (c >= 2 && c <= 5) playerCount = c;
} catch (e) {}
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const countBtns = [...document.querySelectorAll('#count-seg [data-count]')];
function drawCount() {
  countBtns.forEach(b => { b.classList.toggle('on', +b.dataset.count === playerCount); b.setAttribute('aria-pressed', +b.dataset.count === playerCount); });
}
countBtns.forEach(b => b.addEventListener('click', () => {
  playerCount = +b.dataset.count; drawCount();
  try { localStorage.setItem('gumballz-hanabi-count', String(playerCount)); } catch (e) {}
}));
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#count-box').style.display = (m === 'ai-easy' || m === 'ai-hard') ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'pvp' ? '👥 Mở phòng chuyền tay' : m === 'ai-easy' ? `🤖 Bắt đầu chơi với máy Dễ (${playerCount} người)` : `🧠 Bắt đầu chơi với máy Khó (${playerCount} người)`;
  try { localStorage.setItem('gumballz-hanabi-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
drawCount();
try {
  const sm = localStorage.getItem('gumballz-hanabi-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }
// đổi số người thì cập nhật chữ nút Bắt đầu
countBtns.forEach(b => b.addEventListener('click', () => setMode(mode)));

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  $('#pcount').textContent = `${n}/5 người (cần 2–5)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${i === 0 ? '<span class="seat-role">👑 Đi trước</span>' : ''}${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (n < 5
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  $('#opts').innerHTML = `<div class="opt"><b>🎆 Luật nhanh</b><div class="role-note">Cả đội cùng thắng khi ≥ ${WIN_SCORE}/25 điểm. Bạn không thấy bài của chính mình — chỉ thấy bài người khác và những gì đã được gợi ý. Mỗi lượt: gợi ý (tốn 1 token) / bỏ 1 lá (hồi 1 token) / đánh 1 lá (đúng số tiếp theo của chồng màu đó thì lên chồng, sai thì mất 1 ngòi nổ).</div></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = n < 2 || n > 5;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
  $('#wait-msg').textContent = n < 2 ? `Cần ít nhất 2 người mới bắt đầu (đang có ${n}).` : 'Đang chờ chủ phòng bắt đầu…';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.net.raw;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
  else if (b.id === 'btn-addlocal') {
    const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó bấm 👁 xem bàn. Nhớ che lại trước khi đưa máy!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let handRevealed = false; /* chuyền tay: đã bấm 👁 xem bàn của người tới lượt chưa */
let revealedFor = null;
let endShownFor = '';
let selIdx = null; /* lá đã chọn trên tay mình (đánh/bỏ) */
let clueSel = null; /* lá đã chọn trên tay người khác {pid, idx, rank, suit} */
let selTurn = -1; /* lượt mà lựa chọn đang thuộc về — đổi lượt thì bỏ chọn */

function turnHuman(v) {
  if (!v || v.phase !== 'playing') return null;
  const p = v.players.find(x => x.id === v.turn);
  if (mode === 'pvp') return p && !p.isBot ? p : null;
  return v.players.find(x => x.id === v.me) || null;
}
function isMyTurn(v, pid) {
  return v && v.phase === 'playing' && v.turn === pid;
}
function ratingFor(score) {
  if (score >= 25) return '🏆 Huyền thoại — pháo hoa hoàn hảo!';
  if (score >= 24) return '🌟 Gần hoàn hảo!';
  if (score >= 22) return '🎉 Xuất sắc!';
  if (score >= 20) return '🎆 Thắng! Cả đội bắn pháo hoa đẹp!';
  if (score >= 16) return '😅 Gần tới rồi — thiếu chút nữa!';
  if (score >= 11) return '🙂 Khá đấy — luyện thêm nhé!';
  if (score >= 6) return '😬 Còn vụng về — gợi ý nhiều hơn nhé!';
  return '💥 Thảm họa — pháo hoa chưa kịp bay!';
}
function marksHtml(card) {
  const bits = [];
  if (card.rank != null) bits.push(`🔢 ${card.rank}`);
  if (card.suit != null) bits.push(`${SUIT_EMOJI[card.suit]} ${SUIT_NAMES[card.suit]}`);
  return bits.length ? `<span class="hb-marks">${bits.map(b => `<span class="hb-mark">${esc(b)}</span>`).join('')}</span>` : '';
}
/* 1 lá trên tay người khác (ngửa) hoặc của mình (úp) */
function pcardHtml(card, idx, pid, clueable, sel) {
  if (card.back) {
    return `<div class="hb-pcard back ${sel ? 'sel' : ''}" data-idx="${idx}" data-pid="${pid}"><span class="hb-cnum">❓</span>${marksHtml(card)}</div>`;
  }
  const su = card.id[0], r = +card.id[1];
  return `<div class="hb-pcard ${clueable ? 'clueable' : ''} ${sel ? 'sel' : ''}" data-idx="${idx}" data-pid="${pid}" data-rank="${r}" data-suit="${su}"><span class="hb-csuit">${SUIT_EMOJI[su]}</span><span class="hb-cnum">${r}</span>${marksHtml(card)}</div>`;
}
function handCardHtml(card, idx, cant, sel) {
  const known = [];
  if (card.rank != null) known.push(`số ${card.rank}`);
  if (card.suit != null) known.push(`màu ${SUIT_NAMES[card.suit]}`);
  return `<div class="hb-card ${cant ? 'cant' : ''} ${sel ? 'sel' : ''}" data-idx="${idx}"><span class="hb-card-ic">🃏</span><span class="hb-card-name">Lá úp ${idx + 1}</span><span class="hb-card-sub">${known.length ? 'Đã biết: ' + known.join(' · ') : 'Chưa được gợi ý'}</span>${marksHtml(card)}</div>`;
}

function render(v, prev) {
  cur = v;
  if (!v) { handRevealed = false; revealedFor = null; endShownFor = ''; selIdx = null; clueSel = null; selTurn = -1; return; }
  const me = v.players.find(p => p.id === v.me) || {};
  const turnP = v.players.find(p => p.id === v.turn);
  const human = turnHuman(v);
  const handPid = human ? human.id : null;
  /* đổi lượt thì bỏ lựa chọn cũ + chuyền tay che bàn lại */
  if (v.turnCount !== selTurn) { selIdx = null; clueSel = null; selTurn = v.turnCount; }
  if (mode === 'pvp' && revealedFor && (!human || revealedFor !== human.id)) { handRevealed = false; revealedFor = null; }

  $('#round').textContent = v.phase === 'ended'
    ? `🏁 Trận đã kết thúc — cả đội ${v.teamWin ? 'thắng' : 'thua'} với ${v.score}/25 điểm!`
    : `🎆 Điểm ${v.score}/25 · 💡 ${v.clues}/8 · 🧨 ${v.fuses}/3 · 🃏 bài còn ${v.deckCount} · lượt của ${turnP ? cleanName(turnP.name) : '…'}${turnP && turnP.isBot ? ' 🤖' : ''}${v.finalRound ? ' · ⏳ vòng cuối!' : ''}`;
  $('#status').innerHTML = v.players.map(p => {
    return `<span class="stat ${p.id === v.me ? 'me' : ''}">${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}${p.id === v.turn && v.phase === 'playing' ? ' 👉 tới lượt' : ''}: <b>🃏 ${p.handCount} lá</b></span>`;
  }).join('');

  /* ----- chồng pháo hoa + tài nguyên ----- */
  const lastDisc = v.discardPile.length ? v.discardPile[v.discardPile.length - 1] : null;
  $('#board').innerHTML = `<div class="hb-stacks">${SUITS.map(su => {
    const n = v.stacks[su];
    return `<div class="hb-stack ${n >= 5 ? 'done' : ''}" title="Chồng ${SUIT_NAMES[su]}: đang có ${n}"><span class="hb-stack-ic">${SUIT_EMOJI[su]}</span><span class="hb-stack-num">${n || '–'}</span></div>`;
  }).join('')}</div>
  <span class="hb-res">⭐ <b>${v.score}/25</b> · 💡 ${v.clues}/8 · 🧨 ${v.fuses}/3 · 🃏 ${v.deckCount} lá</span>
  <span class="hb-discard">🗑 Đống bỏ: ${v.discardCount} lá${lastDisc ? ` (mới nhất: ${SUIT_EMOJI[lastDisc[0]]} ${SUIT_NAMES[lastDisc[0]]} ${+lastDisc[1]})` : ''}</span>`;

  /* ----- tay bài từng người ----- */
  const myTurn = handPid && isMyTurn(v, handPid) && ui.controls(handPid);
  const cover = mode === 'pvp' && v.phase === 'playing' && human && !handRevealed;
  $('#players').style.display = cover ? 'none' : '';
  $('#players').innerHTML = v.players.map(p => {
    const isTurn = p.id === v.turn && v.phase === 'playing';
    const cards = p.hand.map((card, i) => pcardHtml(card, i, p.id, myTurn && p.id !== handPid, clueSel && clueSel.pid === p.id && clueSel.idx === i)).join('');
    return `<div class="hb-player ${p.id === v.me ? 'me' : ''} ${isTurn ? 'turn' : ''}" data-pid="${p.id}">
      ${avatar(p.name, 40)}
      <div class="hb-pinfo"><b>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === v.me ? ' (bạn)' : ''}${isTurn ? ' 👉 tới lượt' : ''}</b><span class="hb-pmeta">🃏 ${p.handCount} lá</span></div>
      <div class="hb-pcards">${cards || '<span class="hb-discard">Hết bài trên tay</span>'}</div>
    </div>`;
  }).join('');

  /* ----- bài trên tay mình (luôn úp) ----- */
  const handP = v.phase === 'playing' && handPid ? v.players.find(x => x.id === handPid) : null;
  const hand = handP ? handP.hand : [];
  $('#hand-cover').style.display = cover ? '' : 'none';
  $('#hand').style.display = cover ? 'none' : '';
  $('#btn-reveal-hand').textContent = human ? `👁 Xem lượt của ${cleanName(human.name)}` : '👁 Xem lượt của bạn';
  const turnDone = v.phase === 'playing' && handPid && v.turn !== handPid;
  $('#picked-note').style.display = (!cover && turnDone) ? '' : 'none';
  if (!cover) {
    if (!hand.length) {
      $('#hand').innerHTML = v.phase === 'ended' ? '' : '<p class="note">Đang chờ chia bài…</p>';
    } else {
      const handName = mode === 'pvp' && human ? cleanName(human.name) : 'bạn';
      $('#hand').innerHTML = `<div class="hb-hand-label">${myTurn ? `Bài của ${handName} (úp — bấm 1 lá để đánh hoặc bỏ):` : `Bài của ${handName} (úp — chỉ biết những gì đã được gợi ý):`}</div>`
        + hand.map((c, i) => handCardHtml(c, i, !myTurn, selIdx === i)).join('');
    }
  }

  /* ----- thanh hành động: đánh / bỏ lá đã chọn ----- */
  const actionBar = $('#action-bar');
  if (v.phase === 'playing' && myTurn && selIdx != null && hand[selIdx]) {
    const c = hand[selIdx];
    const known = [];
    if (c.rank != null) known.push(`số ${c.rank}`);
    if (c.suit != null) known.push(`màu ${SUIT_NAMES[c.suit]}`);
    actionBar.style.display = '';
    actionBar.innerHTML = `<span class="hint">Lá úp ${selIdx + 1}${known.length ? ` (đã biết: ${known.join(' · ')})` : ' (chưa biết gì)'}</span>
      <button class="btn pri" id="btn-play-sel">▶ Đánh lá này</button>
      ${v.clues < 8 ? `<button class="btn" id="btn-discard-sel">🗑 Bỏ lá này</button>` : `<span class="note">Đang đủ 8 token nên không bỏ được.</span>`}
      <button class="btn" id="btn-cancel-sel">✕ Hủy</button>`;
    $('#btn-play-sel').onclick = () => { const i = selIdx; selIdx = null; Snd.place(); ui.actAs(handPid, { type: 'play', index: i }); };
    const d = $('#btn-discard-sel');
    if (d) d.onclick = () => { const i = selIdx; selIdx = null; Snd.pick(); ui.actAs(handPid, { type: 'discard', index: i }); };
    $('#btn-cancel-sel').onclick = () => { selIdx = null; Snd.pick(); render(cur, cur); };
  } else {
    actionBar.style.display = 'none';
    actionBar.innerHTML = '';
  }

  /* ----- thanh gợi ý: gợi ý số / màu của lá đã chọn ----- */
  const clueBar = $('#clue-bar');
  if (v.phase === 'playing' && myTurn && clueSel) {
    const tp = v.players.find(x => x.id === clueSel.pid);
    clueBar.style.display = '';
    clueBar.innerHTML = `<span class="hint">Gợi ý cho ${tp ? esc(cleanName(tp.name)) : ''}:</span>
      ${v.clues > 0
        ? `<button class="btn pri" id="btn-clue-rank">🔢 Số ${clueSel.rank}</button>
           <button class="btn pri" id="btn-clue-suit">🎨 Màu ${SUIT_NAMES[clueSel.suit]}</button>`
        : `<span class="note">Hết token gợi ý rồi — bỏ 1 lá để hồi token.</span>`}
      <button class="btn" id="btn-cancel-clue">✕ Hủy</button>`;
    const br = $('#btn-clue-rank');
    if (br) br.onclick = () => { const c = clueSel; clueSel = null; Snd.hint(); ui.actAs(handPid, { type: 'clue', target: c.pid, kind: 'rank', value: c.rank }); };
    const bs = $('#btn-clue-suit');
    if (bs) bs.onclick = () => { const c = clueSel; clueSel = null; Snd.hint(); ui.actAs(handPid, { type: 'clue', target: c.pid, kind: 'suit', value: c.suit }); };
    $('#btn-cancel-clue').onclick = () => { clueSel = null; Snd.pick(); render(cur, cur); };
  } else {
    clueBar.style.display = 'none';
    clueBar.innerHTML = '';
  }

  $('#log').innerHTML = v.log.slice().reverse().map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');

  /* âm thanh + hộp kết thúc */
  if (prev && v.phase === 'playing' && prev.phase === 'playing') {
    if (v.turn !== prev.turn) Snd.hint();
    else if (v.fuses < prev.fuses) Snd.wrong();
    else if (v.score > prev.score) Snd.place();
  }
  if (v.phase === 'ended') {
    const key = v.gid + ':' + v.seq;
    if (endShownFor !== key) { endShownFor = key; showEnd(v); }
    if (v.teamWin) Snd.winJingle(); else if (prev && prev.phase !== 'ended') Snd.lose();
  }
}

/* ---------- hộp kết thúc ---------- */
function showEnd(v) {
  const title = v.teamWin ? '🎆 Cả đội thắng!' : '💥 Cả đội thua';
  const rows = SUITS.map(su => `<tr><td>${SUIT_EMOJI[su]} ${SUIT_NAMES[su]}</td><td><b>${v.stacks[su]}/5</b></td></tr>`).join('');
  const body = `<p style="text-align:center;font-size:18px"><b>${v.score}/25 điểm</b> — ${ratingFor(v.score)}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;text-align:center"><tr><th style="text-align:left">Chồng</th><th>Đã bắn</th></tr>${rows}</table>
  <p class="note">${v.endCause === 'fuses' ? 'Hết 3 ngòi nổ vì đánh sai.' : v.endCause === 'perfect' ? 'Pháo hoa hoàn hảo — bắn xong cả 5 chồng!' : v.endCause === 'resign' ? 'Có người xin thua nên cả đội dừng lại.' : 'Hết bài — mỗi người đã đi lượt cuối của mình.'}</p>
  <p class="note">${v.teamWin ? 'Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.' : 'Chơi 1 ván +2 xu.'}</p>`;
  const btns = ui.isHost
    ? `<button class="btn big pri" id="m-again">🔁 Ván mới</button><button class="btn" id="m-lobby">Về phòng chờ</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`
    : `<button class="btn big pri" id="m-close">Đóng</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`;
  ui.openModal(`<h2>${title}</h2>${body}<div class="btns">${btns}</div>`, 'lock');
  const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); ui.net.raw.start(); };
  const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); ui.net.raw.restart(); };
  const home = $('#m-home'); if (home) home.onclick = () => { ui.closeModal(); ui.leave(); };
  const close = $('#m-close'); if (close) close.onclick = ui.closeModal;
}

/* ---------- bấm lá trên tay mình: chọn để đánh hoặc bỏ ---------- */
$('#hand').addEventListener('click', e => {
  const el = e.target.closest('.hb-card'); if (!el || !cur || cur.phase !== 'playing') return;
  const human = turnHuman(cur);
  const handPid = human ? human.id : null;
  if (!handPid || !isMyTurn(cur, handPid) || !ui.controls(handPid)) { tip('Chưa tới lượt bạn.'); return; }
  selIdx = +el.dataset.idx;
  clueSel = null;
  Snd.pick();
  render(cur, cur);
});
/* ---------- bấm lá trên tay người khác: chọn để gợi ý ---------- */
$('#players').addEventListener('click', e => {
  const el = e.target.closest('.hb-pcard'); if (!el || !cur || cur.phase !== 'playing') return;
  const human = turnHuman(cur);
  const handPid = human ? human.id : null;
  if (!handPid || !isMyTurn(cur, handPid) || !ui.controls(handPid)) { tip('Chưa tới lượt bạn.'); return; }
  const pid = el.dataset.pid;
  if (pid === handPid) { tip('Không gợi ý cho chính mình được — bấm lá của người khác.'); return; }
  if (el.classList.contains('back')) return; /* không bấm được lá úp */
  clueSel = { pid, idx: +el.dataset.idx, rank: +el.dataset.rank, suit: el.dataset.suit };
  selIdx = null;
  Snd.pick();
  render(cur, cur);
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
$('#btn-resign').onclick = async () => {
  const v = cur;
  if (!v || v.phase === 'ended') return;
  const r = await confirmBox('Nhận thua trận này? Cả đội dừng lại ngay, tính điểm hiện tại.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
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
  game: 'hanabi', net: NET,
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
