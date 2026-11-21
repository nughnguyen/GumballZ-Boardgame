// 🀄 Chắn – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Hanabi: chủ
// phòng giữ state, khách chỉ gửi action {type, ...}). Mỗi lượt bốc 1 lá
// từ nọc hoặc ăn lá ở cửa, rồi đánh ra 1 lá; chíu khi giữ 3 lá giống
// nhau mà lá thứ 4 xuất hiện; ù khi 20 lá xếp hết thành 10 cặp chắn/cạ
// và có ít nhất 6 chắn.
import { createGame, applyAction, viewFor, actors, typeOf, rankOf, suitOf, isRedType, isChan, isCa, pairsWith, RANK_NAMES, SUIT_NAMES, CUOC_NAMES, cardName } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'chan', min: 2, max: 4, maxSeats: 4, allowLocal: true,
  minMsg: 'Chắn cần 2–4 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
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
  const c = +localStorage.getItem('gumballz-chan-count');
  if (c >= 2 && c <= 4) playerCount = c;
} catch (e) {}
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const countBtns = [...document.querySelectorAll('#count-seg [data-count]')];
function drawCount() {
  countBtns.forEach(b => { b.classList.toggle('on', +b.dataset.count === playerCount); b.setAttribute('aria-pressed', +b.dataset.count === playerCount); });
}
countBtns.forEach(b => b.addEventListener('click', () => {
  playerCount = +b.dataset.count; drawCount();
  try { localStorage.setItem('gumballz-chan-count', String(playerCount)); } catch (e) {}
}));
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#count-box').style.display = (m === 'ai-easy' || m === 'ai-hard') ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'pvp' ? '👥 Mở phòng chuyền tay' : m === 'ai-easy' ? `🤖 Bắt đầu chơi với máy Dễ (${playerCount} người)` : `🧠 Bắt đầu chơi với máy Khó (${playerCount} người)`;
  try { localStorage.setItem('gumballz-chan-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
drawCount();
try {
  const sm = localStorage.getItem('gumballz-chan-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }
// đổi số người thì cập nhật chữ nút Bắt đầu
countBtns.forEach(b => b.addEventListener('click', () => setMode(mode)));

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  $('#pcount').textContent = `${n}/4 người (cần 2–4)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${i === 0 ? '<span class="seat-role">👑 Người cái</span>' : ''}${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (n < 4
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  $('#opts').innerHTML = `<div class="opt"><b>🀄 Luật nhanh</b><div class="role-note">Bộ 100 lá (Chi Chi + Vạn/Văn/Sách × Nhị–Cửu). Mỗi người 19 lá, người cái 20 lá. Chắn = 2 lá giống hệt, cạ = 2 lá cùng số khác chất. Mỗi lượt bốc 1 lá từ nọc hoặc ăn lá ở cửa, rồi đánh ra 1 lá. Giữ 3 lá giống nhau mà lá thứ 4 xuất hiện thì được chíu (tính là 2 chắn). Ù khi 20 lá xếp hết thành 10 cặp chắn/cạ và có ít nhất 6 chắn.</div></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = n < 2 || n > 4;
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
let selCard = null; /* lá đã chọn trên tay mình (để ăn hoặc đánh) */
let selTurn = -1; /* lượt mà lựa chọn đang thuộc về — đổi lượt thì bỏ chọn */

function turnHuman(v) {
  if (!v || v.phase !== 'playing') return null;
  const p = v.players.find(x => x.id === v.turn);
  if (mode === 'pvp') return p && !p.isBot ? p : null;
  return v.players.find(x => x.id === v.me) || null;
}
/* người đang cần hành động: người được mời chíu (ngoài lượt) hoặc người tới lượt */
function activeHuman(v) {
  if (!v || v.phase !== 'playing') return null;
  if (v.step === 'chiu' && v.chiuOffer) {
    const c = v.players.find(x => x.id === v.chiuOffer.candidate);
    if (mode === 'pvp') return c && !c.isBot ? c : null;
    return c && c.id === v.me ? c : null;
  }
  return turnHuman(v);
}
function isMyTurn(v, pid) {
  return v && v.phase === 'playing' && v.turn === pid;
}
function cardHtml(card, cls = '') {
  const t = typeOf(card);
  const red = isRedType(t) ? ' red' : '';
  const rank = t === 'CC' ? 'Chi' : RANK_NAMES[rankOf(t)];
  const suit = t === 'CC' ? 'Chi' : SUIT_NAMES[suitOf(t)];
  return `<div class="ch-card${red} ${cls}" data-card="${esc(card)}"><span class="ch-rank">${esc(rank)}</span><span class="ch-suit">${esc(suit)}</span></div>`;
}
/* xếp tay theo số rồi theo chất để chắn/cạ nằm cạnh nhau cho dễ nhìn */
function sortHand(hand) {
  const suitOrd = { V: 0, W: 1, S: 2 };
  return hand.slice().sort((a, b) => {
    const ta = typeOf(a), tb = typeOf(b);
    const ra = rankOf(ta), rb = rankOf(tb);
    if (ra !== rb) return ra - rb;
    const sa = suitOf(ta), sb = suitOf(tb);
    if (sa === null && sb === null) return 0;
    if (sa === null) return -1;
    if (sb === null) return 1;
    return suitOrd[sa] - suitOrd[sb];
  });
}
function stepText(v) {
  if (v.step === 'chiu' && v.chiuOffer) {
    const c = v.players.find(x => x.id === v.chiuOffer.candidate);
    return `🖐️ ${c ? cleanName(c.name) : 'Ai đó'} được mời chíu ${cardName(v.chiuOffer.card)}!`;
  }
  if (v.step === 'discard') return '🗑 Đánh ra 1 lá';
  if (v.step === 'draw-or-eat') return '🎴 Bốc 1 lá từ nọc hoặc ăn lá ở cửa';
  if (v.step === 'decide') return '🤔 Ăn lá vừa bốc hay bỏ qua?';
  return '';
}

function render(v, prev) {
  cur = v;
  if (!v) { handRevealed = false; revealedFor = null; endShownFor = ''; selCard = null; selTurn = -1; return; }
  const me = v.players.find(p => p.id === v.me) || {};
  const turnP = v.players.find(p => p.id === v.turn);
  const human = activeHuman(v);
  const handPid = human ? human.id : null;
  /* đổi lượt thì bỏ lựa chọn cũ + chuyền tay che bàn lại */
  if (v.turnCount !== selTurn) { selCard = null; selTurn = v.turnCount; }
  if (mode === 'pvp' && revealedFor && (!human || revealedFor !== human.id)) { handRevealed = false; revealedFor = null; }

  const winnerP = v.winner ? v.players.find(p => p.id === v.winner) : null;
  $('#round').textContent = v.phase === 'ended'
    ? (v.winner
      ? `🏁 ${winnerP ? cleanName(winnerP.name) : 'Ai đó'} ù!${v.cuoc && v.cuoc.length ? ` (${v.cuoc.map(c => CUOC_NAMES[c] || c).join(' · ')})` : ''}`
      : '🏁 Ván hòa — hết nọc mà chưa ai ù.')
    : `🀄 Lượt của ${turnP ? cleanName(turnP.name) : '…'}${turnP && turnP.isBot ? ' 🤖' : ''} · 🃏 nọc còn ${v.nocolCount} lá · ${stepText(v)}`;
  $('#status').innerHTML = v.players.map(p => {
    return `<span class="stat ${p.id === v.me ? 'me' : ''}">${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}${p.id === v.turn && v.phase === 'playing' ? ' 👉 tới lượt' : ''}: <b>🃏 ${p.handCount} lá</b> · 🎴 ${p.meldCount / 2} cặp${p.chiuCount ? ` · 🖐️ chíu ×${p.chiuCount}` : ''}</span>`;
  }).join('');

  /* ----- nọc + lá ở cửa + lá vừa bốc ----- */
  const gateBy = v.gate ? v.players.find(p => p.id === v.gate.by) : null;
  $('#board').innerHTML = `<div class="ch-nocol"><b>${v.nocolCount}</b><span>lá trong nọc</span></div>
  <div class="ch-gate">${v.gate
      ? `<span class="lbl">🚪 Lá ở cửa${gateBy ? ` (của ${esc(cleanName(gateBy.name))})` : ''}:</span>${cardHtml(v.gate.card, 'big')}`
      : '<span class="ch-note">Chưa có lá nào ở cửa.</span>'}</div>
  ${v.drawn ? `<div class="ch-gate"><span class="lbl">🎴 Lá vừa bốc:</span>${cardHtml(v.drawn, 'big')}</div>` : ''}`;

  /* ----- bài đã ăn của từng người ----- */
  const cover = mode === 'pvp' && v.phase === 'playing' && human && !handRevealed;
  $('#players').style.display = cover ? 'none' : '';
  $('#players').innerHTML = v.players.map(p => {
    const isTurn = p.id === v.turn && v.phase === 'playing';
    const melds = p.melds.map(pr => `<div class="ch-meld">${pr.map(c => cardHtml(c, 'small')).join('')}</div>`).join('');
    return `<div class="ch-player ${p.id === v.me ? 'me' : ''} ${isTurn ? 'turn' : ''}" data-pid="${p.id}">
      ${avatar(p.name, 40)}
      <div class="ch-pinfo"><b>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === v.me ? ' (bạn)' : ''}${isTurn ? ' 👉 tới lượt' : ''}</b><span class="ch-pmeta">🃏 ${p.handCount} lá · 🎴 ${p.meldCount / 2} cặp${p.chiuCount ? ` · 🖐️ chíu ×${p.chiuCount}` : ''}</span></div>
      <div class="ch-melds">${melds || '<span class="ch-hand-empty">Chưa ăn cặp nào</span>'}</div>
    </div>`;
  }).join('');

  /* ----- bài trên tay người đang hành động ----- */
  const handP = v.phase === 'playing' && handPid ? v.players.find(x => x.id === handPid) : null;
  const hand = handP && Array.isArray(handP.hand) ? sortHand(handP.hand) : [];
  $('#hand-cover').style.display = cover ? '' : 'none';
  $('#hand').style.display = cover ? 'none' : '';
  $('#btn-reveal-hand').textContent = human ? `👁 Xem lượt của ${cleanName(human.name)}` : '👁 Xem lượt của bạn';
  const turnDone = v.phase === 'playing' && handPid && v.turn !== handPid && v.step !== 'chiu';
  $('#picked-note').style.display = (!cover && turnDone) ? '' : 'none';
  /* lá nào trên tay ghép được với lá ở cửa / lá vừa bốc thì viền xanh */
  const pairTarget = v.phase === 'playing' && handPid && isMyTurn(v, handPid)
    ? (v.step === 'draw-or-eat' && v.gate ? v.gate.card : v.step === 'decide' && v.drawn ? v.drawn : null)
    : null;
  if (!cover) {
    if (!hand.length) {
      $('#hand').innerHTML = v.phase === 'ended' ? '' : '<p class="note">Đang chờ chia bài…</p>';
    } else {
      const handName = mode === 'pvp' && human ? cleanName(human.name) : 'bạn';
      const myTurn = handPid && isMyTurn(v, handPid) && ui.controls(handPid);
      $('#hand').innerHTML = `<div class="ch-hand-label">${myTurn ? `Bài của ${handName} (bấm 1 lá để ăn hoặc đánh):` : `Bài của ${handName}:`}</div>`
        + hand.map(c => {
          const cls = [
            !myTurn ? 'cant' : '',
            selCard === c ? 'sel' : '',
            pairTarget && pairsWith(pairTarget, c) ? 'pairable' : '',
          ].join(' ');
          return cardHtml(c, cls);
        }).join('');
    }
  }

  /* ----- thanh hành động ----- */
  const actionBar = $('#action-bar');
  const myTurn = handPid && isMyTurn(v, handPid) && ui.controls(handPid);
  const selPairsGate = selCard && v.step === 'draw-or-eat' && v.gate && pairsWith(v.gate.card, selCard);
  const selPairsDrawn = selCard && v.step === 'decide' && v.drawn && pairsWith(v.drawn, selCard);
  if (v.phase === 'playing' && myTurn) {
    let html = '';
    if (v.step === 'draw-or-eat') {
      html += `<button class="btn pri" id="btn-draw">🎴 Bốc 1 lá từ nọc</button>`;
      if (v.gate) html += `<span class="hint">Lá ở cửa: <b>${esc(cardName(v.gate.card))}</b> — bấm 1 lá trên tay ghép được (viền xanh) để ăn.</span>`;
      if (selPairsGate) html += `<button class="btn pri" id="btn-eat-gate">🍽 Ăn ${esc(cardName(v.gate.card))} với ${esc(cardName(selCard))} thành ${isChan(v.gate.card, selCard) ? 'chắn' : 'cạ'}</button>`;
    } else if (v.step === 'decide') {
      if (selPairsDrawn) html += `<button class="btn pri" id="btn-eat-drawn">🍽 Ăn ${esc(cardName(v.drawn))} với ${esc(cardName(selCard))} thành ${isChan(v.drawn, selCard) ? 'chắn' : 'cạ'}</button>`;
      html += `<button class="btn" id="btn-pass">➡️ Bỏ qua (để lá ở cửa)</button>`;
    } else if (v.step === 'discard' && selCard) {
      html += `<span class="hint">Đánh lá <b>${esc(cardName(selCard))}</b> ra?</span><button class="btn pri" id="btn-discard-sel">🗑 Đánh lá này</button><button class="btn" id="btn-cancel-sel">✕ Hủy</button>`;
    }
    if (html) {
      actionBar.style.display = '';
      actionBar.innerHTML = html;
      const bd = $('#btn-draw');
      if (bd) bd.onclick = () => { Snd.place(); ui.actAs(handPid, { type: 'draw' }); };
      const beg = $('#btn-eat-gate');
      if (beg) beg.onclick = () => { const c = selCard; selCard = null; Snd.eat(); ui.actAs(handPid, { type: 'eat-gate', with: c }); };
      const bed = $('#btn-eat-drawn');
      if (bed) bed.onclick = () => { const c = selCard; selCard = null; Snd.eat(); ui.actAs(handPid, { type: 'eat-drawn', with: c }); };
      const bl = $('#btn-pass');
      if (bl) bl.onclick = () => { Snd.place(); ui.actAs(handPid, { type: 'leave' }); };
      const bds = $('#btn-discard-sel');
      if (bds) bds.onclick = () => { const c = selCard; selCard = null; Snd.place(); ui.actAs(handPid, { type: 'discard', card: c }); };
      const bc = $('#btn-cancel-sel');
      if (bc) bc.onclick = () => { selCard = null; Snd.pick(); render(cur, cur); };
    } else {
      actionBar.style.display = 'none';
      actionBar.innerHTML = '';
    }
  } else {
    actionBar.style.display = 'none';
    actionBar.innerHTML = '';
  }

  /* ----- thanh chíu ----- */
  const chiuBar = $('#chiu-bar');
  if (v.phase === 'playing' && v.step === 'chiu' && v.chiuOffer) {
    const cand = v.players.find(x => x.id === v.chiuOffer.candidate);
    const iAmCand = handPid && handPid === v.chiuOffer.candidate && ui.controls(handPid);
    chiuBar.style.display = '';
    if (iAmCand) {
      chiuBar.innerHTML = `<span class="hint">Bạn có 3 lá ${esc(cardName(v.chiuOffer.card))} — chíu không?</span>
        <button class="btn pri" id="btn-chiu">🖐️ Chíu!</button>
        <button class="btn" id="btn-chiu-pass">✕ Không chíu</button>`;
      $('#btn-chiu').onclick = () => { Snd.hint(); ui.actAs(handPid, { type: 'chiu' }); };
      $('#btn-chiu-pass').onclick = () => { Snd.pick(); ui.actAs(handPid, { type: 'chiu-pass' }); };
    } else {
      chiuBar.innerHTML = `<span class="hint">🖐️ Đang chờ ${cand ? esc(cleanName(cand.name)) : 'ai đó'} quyết định chíu ${esc(cardName(v.chiuOffer.card))}…</span>`;
    }
  } else {
    chiuBar.style.display = 'none';
    chiuBar.innerHTML = '';
  }

  $('#log').innerHTML = v.log.slice().reverse().map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');

  /* âm thanh + hộp kết thúc */
  if (prev && v.phase === 'playing' && prev.phase === 'playing') {
    if (v.turn !== prev.turn) Snd.place();
    else if (v.cuoc && v.cuoc.length) Snd.winJingle();
  }
  if (v.phase === 'ended') {
    const key = v.gid + ':' + v.seq;
    if (endShownFor !== key) { endShownFor = key; showEnd(v); }
    if (v.winner) Snd.winJingle(); else if (prev && prev.phase !== 'ended') Snd.lose();
  }
}

/* ---------- hộp kết thúc ---------- */
function showEnd(v) {
  const winnerP = v.winner ? v.players.find(p => p.id === v.winner) : null;
  let title, body;
  if (v.winner && winnerP) {
    title = `🏆 ${cleanName(winnerP.name)} ù!`;
    const cuocList = (v.cuoc || []).map(c => CUOC_NAMES[c] || c);
    body = `<p style="text-align:center;font-size:18px"><b>${cuocList.length ? cuocList.join(' · ') : 'Ù'}</b></p>
    ${v.winCard ? `<p style="text-align:center">Lá ù: <b>${esc(cardName(v.winCard))}</b></p>` : ''}
    <p class="note">${v.endReason === 'resign' ? 'Có người xin thua nên ván dừng lại — người có bài mạnh nhất (nhiều chắn nhất) thắng.' : 'Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.'}</p>`;
  } else {
    title = '🤝 Ván hòa';
    body = `<p style="text-align:center;font-size:16px">Hết nọc mà chưa ai ù — không ai thắng ván này.</p>
    <p class="note">Chơi 1 ván +2 xu.</p>`;
  }
  const btns = ui.isHost
    ? `<button class="btn big pri" id="m-again">🔁 Ván mới</button><button class="btn" id="m-lobby">Về phòng chờ</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`
    : `<button class="btn big pri" id="m-close">Đóng</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`;
  ui.openModal(`<h2>${title}</h2>${body}<div class="btns">${btns}</div>`, 'lock');
  const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); ui.net.raw.start(); };
  const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); ui.net.raw.restart(); };
  const home = $('#m-home'); if (home) home.onclick = () => { ui.closeModal(); ui.leave(); };
  const close = $('#m-close'); if (close) close.onclick = ui.closeModal;
}

/* ---------- bấm lá trên tay: chọn để ăn hoặc đánh ---------- */
$('#hand').addEventListener('click', e => {
  const el = e.target.closest('.ch-card'); if (!el || !cur || cur.phase !== 'playing') return;
  const human = activeHuman(cur);
  const handPid = human ? human.id : null;
  if (!handPid || !isMyTurn(cur, handPid) || !ui.controls(handPid)) { tip('Chưa tới lượt bạn.'); return; }
  if (cur.step !== 'draw-or-eat' && cur.step !== 'decide' && cur.step !== 'discard') { tip('Lúc này chưa chọn lá được.'); return; }
  selCard = el.dataset.card;
  Snd.pick();
  render(cur, cur);
});
$('#btn-reveal-hand').onclick = () => {
  const human = activeHuman(cur);
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
  const r = await confirmBox('Nhận thua trận này? Ván dừng lại ngay, người có bài mạnh nhất (nhiều chắn nhất) thắng.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  if (mode === 'online') ui.act({ type: 'resign' });
  else {
    const human = activeHuman(v);
    const pid = human ? human.id : v.me;
    ui.actAs(pid, { type: 'resign' });
  }
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'chan', net: NET,
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
