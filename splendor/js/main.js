// 💎 Splendor — giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Azul:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}). Mỗi lượt làm
// ĐÚNG 1 việc: lấy 3 đá khác màu, lấy 2 đá cùng màu, giữ thẻ (+1 vàng),
// hoặc mua thẻ (giảm giá theo màu thẻ đã mua, vàng thay mọi màu).
// Mọi thông tin đều công khai — chỉ giấu thứ tự chồng bài — nên chế độ
// chuyền tay không cần màn che (không có bài ẩn).
import { createGame, applyAction, viewFor, actors, paymentFor, bonusCounts, tokenCount, cardById, nobleById, COLORS, COLOR_NAME, GEM_EMOJI, GOLD, MAX_TOKENS, MAX_RESERVED } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=50';
import { gameKit, $, esc, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'splendor', min: 2, max: 4, maxSeats: 4, allowLocal: true,
  minMsg: 'Splendor cần 2–4 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: () => false,
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 700 + Math.random() * 900,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu', 'Bánh', 'Cốm'],
});

/* màu ghế ngồi (chấm điểm) */
const PLAYER_COLORS = ['#E05D5D', '#5B8DEF', '#E8B93C', '#58B368'];
const colorOf = (v, pid) => {
  const i = v.players.findIndex(p => p.id === pid);
  return PLAYER_COLORS[i < 0 ? 0 : i % PLAYER_COLORS.length];
};

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
let playerCount = 2; /* đấu máy: tổng số người (bạn + máy) */
try {
  const c = +localStorage.getItem('gumballz-splendor-count');
  if (c >= 2 && c <= 4) playerCount = c;
} catch (e) {}
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const countBtns = [...document.querySelectorAll('#count-seg [data-count]')];
function drawCount() {
  countBtns.forEach(b => { b.classList.toggle('on', +b.dataset.count === playerCount); b.setAttribute('aria-pressed', +b.dataset.count === playerCount); });
}
countBtns.forEach(b => b.addEventListener('click', () => {
  playerCount = +b.dataset.count; drawCount();
  try { localStorage.setItem('gumballz-splendor-count', String(playerCount)); } catch (e) {}
}));
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#count-box').style.display = (m === 'ai-easy' || m === 'ai-hard') ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'pvp' ? '👥 Mở phòng chuyền tay' : m === 'ai-easy' ? `🤖 Bắt đầu chơi với máy Dễ (${playerCount} người)` : `🧠 Bắt đầu chơi với máy Khó (${playerCount} người)`;
  try { localStorage.setItem('gumballz-splendor-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
drawCount();
try {
  const sm = localStorage.getItem('gumballz-splendor-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }
countBtns.forEach(b => b.addEventListener('click', () => setMode(mode)));

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  $('#pcount').textContent = `${n}/4 người (cần 2–4)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${i === 0 ? '<span class="seat-role">👑 Người đi đầu</span>' : ''}${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (n < 4
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  $('#opts').innerHTML = `<div class="opt"><b>💎 Luật nhanh</b><div class="role-note">90 thẻ (40 cấp 1, 30 cấp 2, 20 cấp 3). Mỗi lượt làm ĐÚNG 1 việc: lấy 3 đá khác màu, lấy 2 đá cùng màu (chỉ khi còn ≥ 4 đá màu đó), giữ 1 thẻ + 1 vàng (tối đa 3 thẻ giữ), hoặc mua 1 thẻ. Thẻ đã mua cho giảm giá vĩnh viễn theo màu; vàng thay cho bất kỳ màu nào. Quý tộc ghé thăm +3 điểm khi đủ màu thẻ đã mua. Ai đạt 15 điểm trước thì thắng.</div></div>`;
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
    const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó đi. Mọi thông tin đều công khai!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
/* lựa chọn hành động: { action: 'take3'|'take2'|'reserve'|'buy', ... } */
let sel = null;
/* đá đang chọn để trả (bước discard): mảng màu, VD ['B','B','gold'] */
let discardSel = [];

function turnHuman(v) {
  if (!v || v.phase !== 'playing') return null;
  const p = v.players.find(x => x.id === v.turn);
  if (mode === 'pvp') return p && !p.isBot ? p : null;
  return v.players.find(x => x.id === v.me) || null;
}
function isMyTurn(v, pid) {
  return v && v.phase === 'playing' && v.turn === pid;
}
function myBoard(v) {
  const human = turnHuman(v);
  return human ? v.players.find(p => p.id === human.id) : null;
}

/* 1 thẻ phát triển (bàn / thẻ giữ) — nút bấm khi pickable */
function cardHtml(card, attrs, pickable, isSel) {
  const costs = Object.entries(card.cost).map(([c, n]) => `<span class="sp-pip c-${c}">${n}</span>`).join('');
  return `<button type="button" class="sp-card${pickable ? ' pickable' : ''}${isSel ? ' sel' : ''}" ${attrs} ${pickable ? '' : 'disabled'}><span class="sp-pts">${card.pts ? card.pts + '⭐' : ''}</span><span class="sp-lvl">Cấp ${card.level}</span><div class="sp-costs">${costs}</div><span class="sp-bonus">${GEM_EMOJI[card.bonus]}</span></button>`;
}
/* 1 thẻ nhỏ (thẻ đã mua — chỉ xem, không bấm) */
function miniCardHtml(card) {
  const costs = Object.entries(card.cost).map(([c, n]) => `<span class="sp-pip c-${c}">${n}</span>`).join('');
  return `<span class="sp-card" style="cursor:default" title="Cấp ${card.level} · ${COLOR_NAME[card.bonus]}${card.pts ? ' · +' + card.pts + 'đ' : ''}"><span class="sp-pts">${card.pts ? card.pts + '⭐' : ''}</span><span class="sp-lvl">Cấp ${card.level}</span><div class="sp-costs">${costs}</div><span class="sp-bonus">${GEM_EMOJI[card.bonus]}</span></span>`;
}
function nobleHtml(noble, pickable) {
  const req = Object.entries(noble.req).map(([c, n]) => `<span class="sp-pip c-${c}">${n}</span>`).join('');
  return `<div class="sp-noble${pickable ? ' pickable' : ''}" data-noble="${noble.id}" title="Quý tộc — cần ${Object.entries(noble.req).map(([c, n]) => n + ' thẻ ' + COLOR_NAME[c]).join(', ')}"><h5>👑 Quý tộc</h5><div class="req">${req}</div><span class="pts">+3 điểm</span></div>`;
}
/* đá đang cầm của 1 người (mỗi đá 1 nút — để bấm chọn khi trả đá thừa) */
function tokensHtml(pl, pickable, selArr) {
  let h = '';
  const order = [...COLORS, GOLD];
  let idx = 0;
  for (const c of order) {
    const n = pl.tokens[c] || 0;
    for (let k = 0; k < n; k++) {
      const isSel = pickable && selArr && selArr.includes(idx);
      h += `<button type="button" class="sp-gem c-${c}${pickable ? ' pickable' : ''}${isSel ? ' sel' : ''}" data-token="${c}" data-tidx="${idx}" ${pickable ? '' : 'disabled'}>${GEM_EMOJI[c]}</button>`;
      idx++;
    }
  }
  return h || '<span class="note">Chưa có đá nào.</span>';
}
function bonusChipsHtml(pl) {
  const b = bonusCounts(pl);
  return COLORS.map(c => `<span class="sp-bonus-count">${GEM_EMOJI[c]} ${b[c] || 0}</span>`).join('');
}

function boardHtml(pl, v, interactive, meP) {
  const isMe = meP && pl.id === meP.id;
  const myTurn = interactive && isMe;
  const pickDiscard = myTurn && v.step === 'discard';
  const pickBuyReserved = myTurn && v.step === 'act' && sel && sel.action === 'buy';
  let h = `<div class="sp-board${isMe ? ' me' : ''}"><h4>${esc(cleanName(pl.name))}${isMe ? ' (bạn)' : ''}${pl.isBot ? ' 🤖' : ''} · <small>${pl.score} điểm · ${pl.cards.length} thẻ · ${pl.nobles.length} quý tộc</small></h4>`;
  /* đá đang cầm */
  h += `<div class="row"><span class="lbl">💎 Đá (${tokenCount(pl)}/10)</span><div class="sp-tokens">${tokensHtml(pl, pickDiscard, discardSel)}</div></div>`;
  /* giảm giá theo màu */
  h += `<div class="row"><span class="lbl">🏷️ Giảm giá</span><div class="sp-mini-cards">${bonusChipsHtml(pl)}</div></div>`;
  /* thẻ đã mua */
  h += `<div class="row"><span class="lbl">🃏 Thẻ đã mua</span><div class="sp-mini-cards">${pl.cards.length ? pl.cards.map(id => miniCardHtml(cardById(id))).join('') : '<span class="note">Chưa mua thẻ nào.</span>'}</div></div>`;
  /* thẻ đã giữ (công khai) */
  h += `<div class="row"><span class="lbl">🔒 Thẻ đã giữ</span><div class="sp-mini-cards">${pl.reserved.length ? pl.reserved.map(id => {
    const card = cardById(id);
    const isSel = pickBuyReserved && sel.from === 'reserved' && sel.cardId === id;
    const affordable = pickBuyReserved && paymentFor(pl, card);
    return cardHtml(card, `data-reserved="${id}"`, pickBuyReserved && !!affordable, isSel);
  }).join('') : '<span class="note">Chưa giữ thẻ nào.</span>'}</div></div>`;
  /* quý tộc đã đón */
  if (pl.nobles.length) {
    h += `<div class="row"><span class="lbl">👑 Quý tộc</span><div class="sp-mini-cards">${pl.nobles.map(id => nobleHtml(nobleById(id), false)).join('')}</div></div>`;
  }
  h += `</div>`;
  return h;
}

function render(v, prev) {
  cur = v;
  if (!v) { endShownFor = ''; sel = null; discardSel = []; return; }
  const me = v.players.find(p => p.id === v.me) || {};
  const turnP = v.players.find(p => p.id === v.turn);
  const human = turnHuman(v);
  const handPid = human ? human.id : null;
  const meP = myBoard(v);
  const myTurn = handPid && isMyTurn(v, handPid) && ui.controls(handPid);
  /* đổi lượt / đổi bước thì bỏ lựa chọn cũ */
  if (prev && (v.turnCount !== prev.turnCount || v.phase !== prev.phase || v.step !== prev.step)) { sel = null; discardSel = []; }

  const winnerP = v.winner ? v.players.find(p => p.id === v.winner) : null;
  $('#round').textContent = v.phase === 'ended'
    ? (v.winner
      ? `🏁 ${winnerP ? cleanName(winnerP.name) : 'Ai đó'} thắng với ${winnerP ? winnerP.score : '?'} điểm!`
      : '🏁 Ván kết thúc.')
    : `💎 Lượt của ${turnP ? cleanName(turnP.name) : '…'}${turnP && turnP.isBot ? ' 🤖' : ''} · Vòng ${v.round}${v.endTriggered ? ' · 🏁 Vòng cuối!' : ''} · Bạn: ${me.score || 0} điểm`;
  $('#status').innerHTML = v.players.map((p, i) => {
    return `<span class="stat ${p.id === v.me ? 'me' : ''} ${p.id === v.turn && v.phase === 'playing' ? 'turn' : ''}"><span class="dot" style="background:${colorOf(v, p.id)}"></span>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}${p.id === v.turn && v.phase === 'playing' ? ' 👉 tới lượt' : ''}: <b>${p.score} điểm</b> · 🃏 ${p.cards.length} thẻ · 💎 ${tokenCount(p)} đá${p.nobles.length ? ` · 👑 ${p.nobles.length}` : ''}</span>`;
  }).join('');

  /* ----- ngân hàng đá quý ----- */
  const availColors = COLORS.filter(c => (v.tokens[c] || 0) > 0);
  const take3Need = Math.min(3, availColors.length);
  $('#bank-note').textContent = `· ${COLORS.map(c => `${GEM_EMOJI[c]} ${v.tokens[c] || 0}`).join(' · ')} · ⭐ ${v.tokens.gold || 0} vàng`;
  let bh = '';
  for (const c of [...COLORS, GOLD]) {
    const n = v.tokens[c] || 0;
    const pickable = myTurn && v.step === 'act' && sel && (
      (sel.action === 'take3' && COLORS.includes(c) && n > 0)
      || (sel.action === 'take2' && COLORS.includes(c) && n >= 4));
    const isSel = sel && ((sel.action === 'take3' && (sel.colors || []).includes(c))
      || (sel.action === 'take2' && sel.color === c));
    bh += `<div class="sp-bank-item${pickable ? ' pickable' : ''}"><button type="button" class="sp-gem c-${c}${isSel ? ' sel' : ''}" data-gem="${c}" ${pickable ? '' : 'disabled'}>${GEM_EMOJI[c]}<span class="cnt">${n}</span></button><span class="n"><b>${n}</b> đá</span></div>`;
  }
  $('#bank-row').innerHTML = bh;

  /* ----- quý tộc trên bàn ----- */
  const pickNoble = myTurn && v.step === 'noble';
  $('#nobles').innerHTML = v.nobles.map(id => nobleHtml(nobleById(id), pickNoble && (v.nobleChoices || []).includes(id))).join('')
    || '<span class="note">Hết quý tộc trên bàn.</span>';

  /* ----- bàn thẻ 3 cấp ----- */
  let th = '';
  for (const lvl of [3, 2, 1]) {
    const deckPickable = myTurn && v.step === 'act' && sel && sel.action === 'reserve' && (v.deckCounts[lvl] || 0) > 0;
    th += `<div class="sp-level"><button type="button" class="sp-deck${deckPickable ? ' pickable' : ''}" data-deck="${lvl}" ${deckPickable ? '' : 'disabled'}><span class="back">🂠</span><span class="n">Cấp ${lvl} · còn ${v.deckCounts[lvl] || 0} thẻ</span></button><div class="sp-cards">`;
    for (let slot = 0; slot < 4; slot++) {
      const id = v.table[lvl] && v.table[lvl][slot];
      if (!id) {
        th += `<div class="sp-card empty">Ô trống</div>`;
        continue;
      }
      const card = cardById(id);
      const isSel = sel && sel.action && (
        (sel.action === 'reserve' && sel.from === 'table' && sel.level === lvl && sel.slot === slot)
        || (sel.action === 'buy' && sel.from === 'table' && sel.level === lvl && sel.slot === slot));
      let pickable = false;
      if (myTurn && v.step === 'act' && sel) {
        if (sel.action === 'reserve') pickable = true;
        else if (sel.action === 'buy') pickable = !!paymentFor(meP, card);
      }
      th += cardHtml(card, `data-card="${id}" data-level="${lvl}" data-slot="${slot}"`, pickable, isSel);
    }
    th += `</div></div>`;
  }
  $('#table-rows').innerHTML = th;
  $('#table-note').textContent = `· ${[1, 2, 3].map(l => `cấp ${l} còn ${v.deckCounts[l] || 0}`).join(' · ')}`;

  /* ----- bàn của mình + bàn đối thủ ----- */
  $('#myboard').innerHTML = meP ? boardHtml(meP, v, true, meP) : '';
  $('#opponents').innerHTML = v.players.filter(p => !meP || p.id !== meP.id)
    .map(p => boardHtml(p, v, false, meP)).join('');

  /* ----- thanh hành động ----- */
  const actionBar = $('#action-bar');
  if (v.phase === 'playing' && myTurn && v.step === 'noble') {
    actionBar.style.display = '';
    actionBar.innerHTML = `<span class="hint">👑 Bạn đủ điều kiện đón quý tộc — chọn 1 quý tộc trên bàn (hoặc bấm nút dưới đây):</span>`
      + `<div class="sp-act-btns">${(v.nobleChoices || []).map(id => {
        const n = nobleById(id);
        return `<button class="btn pri" data-noble-pick="${id}">👑 ${Object.entries(n.req).map(([c, k]) => `${k}${GEM_EMOJI[c]}`).join(' ')}</button>`;
      }).join('')}</div>`;
    actionBar.querySelectorAll('[data-noble-pick]').forEach(b => {
      b.onclick = () => { Snd.eat(); ui.actAs(handPid, { type: 'noble', noble: b.dataset.noblePick }); };
    });
  } else if (v.phase === 'playing' && myTurn && v.step === 'discard') {
    const excess = tokenCount(meP) - MAX_TOKENS;
    const ready = discardSel.length === excess;
    actionBar.style.display = '';
    actionBar.innerHTML = `<span class="hint">⚠️ Bạn đang cầm ${tokenCount(meP)} đá — bấm chọn ${excess} đá ở bàn của bạn để trả về ngân hàng (đã chọn ${discardSel.length}/${excess}).</span>`
      + `<button class="btn pri" id="btn-confirm-discard" ${ready ? '' : 'disabled'}>↩️ Trả ${excess} đá</button>`
      + `<button class="btn" id="btn-cancel-discard">✕ Chọn lại</button>`;
    const bc = $('#btn-confirm-discard');
    if (bc) bc.onclick = () => {
      if (!ready) return;
      const colors = discardSel.map(i => {
        let idx = 0;
        for (const c of [...COLORS, GOLD]) {
          for (let k = 0; k < (meP.tokens[c] || 0); k++) { if (idx === i) return c; idx++; }
        }
        return null;
      }).filter(Boolean);
      Snd.place();
      ui.actAs(handPid, { type: 'discard', colors });
      discardSel = [];
    };
    const bx = $('#btn-cancel-discard');
    if (bx) bx.onclick = () => { discardSel = []; Snd.hint(); render(cur, cur); };
  } else if (v.phase === 'playing' && myTurn && v.step === 'act') {
    const reserveFull = meP && meP.reserved.length >= MAX_RESERVED;
    const actBtns = [
      { a: 'take3', label: '💎 Lấy 3 đá' },
      { a: 'take2', label: '💎💎 Lấy 2 đá' },
      { a: 'reserve', label: '🔒 Giữ thẻ (+1 vàng)', disabled: reserveFull },
      { a: 'buy', label: '🛒 Mua thẻ' },
    ];
    let hint = 'Tới lượt bạn — chọn 1 hành động dưới đây.';
    let ready = false;
    let actObj = null;
    if (sel) {
      if (sel.action === 'take3') {
        hint = `Đã chọn ${(sel.colors || []).length}/${take3Need} màu đá — bấm đá ở ngân hàng để chọn/bỏ chọn (cần đúng ${take3Need} màu khác nhau).`;
        ready = (sel.colors || []).length === take3Need;
        if (ready) actObj = { type: 'take3', colors: sel.colors.slice() };
      } else if (sel.action === 'take2') {
        hint = sel.color ? `Đã chọn 2 đá ${COLOR_NAME[sel.color]} — bấm Xác nhận để lấy (cần còn ≥ 4 đá màu đó).` : 'Bấm 1 màu đá ở ngân hàng (cần còn ≥ 4 đá màu đó).';
        ready = !!sel.color && (v.tokens[sel.color] || 0) >= 4;
        if (ready) actObj = { type: 'take2', color: sel.color };
      } else if (sel.action === 'reserve') {
        hint = reserveFull ? 'Bạn đã giữ tối đa 3 thẻ — mua 1 thẻ đã giữ hoặc lấy đá thay vì giữ thêm.' : (sel.from ? `Đã chọn thẻ ${sel.from === 'deck' ? 'úp từ chồng cấp ' + sel.level : 'cấp ' + sel.level + ' trên bàn'} — bấm Xác nhận để giữ (+1 vàng nếu còn).` : 'Bấm 1 thẻ trên bàn để giữ, hoặc bấm chồng bài để giữ úp 1 thẻ (tối đa 3 thẻ giữ).');
        ready = !!sel.from && !reserveFull;
        if (ready) actObj = { type: 'reserve', from: sel.from, level: sel.level, slot: sel.slot };
      } else if (sel.action === 'buy') {
        hint = sel.cardId ? `Đã chọn thẻ ${sel.cardId} — bấm Xác nhận để mua.` : 'Bấm 1 thẻ trên bàn (hoặc thẻ đã giữ của bạn) mà bạn đủ tiền mua.';
        ready = !!sel.cardId;
        if (ready) actObj = { type: 'buy', from: sel.from, level: sel.level, slot: sel.slot, cardId: sel.cardId };
      }
    }
    actionBar.style.display = '';
    actionBar.innerHTML = `<span class="hint">${hint}</span>`
      + `<div class="sp-act-btns">${actBtns.map(x => `<button class="btn${sel && sel.action === x.a ? ' pri' : ''}" data-act="${x.a}" ${x.disabled ? 'disabled' : ''} ${x.a === 'reserve' && x.disabled ? 'title="Bạn đã giữ tối đa 3 thẻ"' : ''}>${x.label}</button>`).join('')}</div>`
      + (sel ? `<button class="btn pri" id="btn-confirm-act" ${ready ? '' : 'disabled'}>✅ Xác nhận</button><button class="btn" id="btn-cancel-act">✕ Hủy chọn</button>` : '');
    actionBar.querySelectorAll('[data-act]').forEach(b => {
      b.onclick = () => {
        const a = b.dataset.act;
        sel = sel && sel.action === a ? null : { action: a, colors: a === 'take3' ? [] : undefined };
        Snd.pick();
        render(cur, cur);
      };
    });
    const bc = $('#btn-confirm-act');
    if (bc) bc.onclick = () => {
      if (!ready || !actObj) return;
      if (actObj.type === 'buy') Snd.eat(); else Snd.place();
      ui.actAs(handPid, actObj);
      sel = null;
    };
    const bx = $('#btn-cancel-act');
    if (bx) bx.onclick = () => { sel = null; Snd.hint(); render(cur, cur); };
  } else if (v.phase === 'playing' && myTurn) {
    actionBar.style.display = '';
    actionBar.innerHTML = `<span class="hint">Tới lượt bạn.</span>`;
  } else {
    actionBar.style.display = 'none';
    actionBar.innerHTML = '';
  }

  $('#log').innerHTML = v.log.slice().reverse().map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');

  /* âm thanh + hộp kết thúc */
  if (prev && v.phase === 'playing' && prev.phase === 'playing') {
    if (v.turn !== prev.turn) Snd.place();
  }
  if (v.phase === 'ended') {
    const key = v.gid + ':' + v.seq;
    if (endShownFor !== key) { endShownFor = key; showEnd(v); }
    if (v.winners && v.winners.includes(v.me)) Snd.winJingle(); else if (prev && prev.phase !== 'ended') Snd.lose();
  }
}

/* ---------- hộp kết thúc ---------- */
function showEnd(v) {
  const sum = (v.final && v.final.summary) || {};
  const scores = (v.final && v.final.scores ? v.final.scores.slice() : v.players.map(p => ({ id: p.id, name: p.name, score: p.score })))
    .sort((a, b) => b.score - a.score);
  const winnerNames = v.winners.map(id => {
    const p = v.players.find(x => x.id === id);
    return p ? cleanName(p.name) : 'Ai đó';
  }).join(' + ');
  let title, body;
  if (v.winners.length) {
    title = `🏆 ${winnerNames} thắng!`;
    body = `<div class="sp-final-scores">${scores.map(s => {
      const st = sum[s.id] || { score: s.score, cards: 0, nobles: 0, gold: 0 };
      return `<div class="row ${v.winners.includes(s.id) ? 'winner' : ''}"><span>${v.winners.includes(s.id) ? '👑 ' : ''}${esc(cleanName(s.name))}${s.id === v.me ? ' (bạn)' : ''}<span class="sub">Mua ${st.cards} thẻ · ${st.nobles} quý tộc (+${3 * st.nobles}đ) · đang cầm ${st.gold} vàng</span></span><b>${s.score} điểm</b></div>`;
    }).join('')}</div>
    <p class="note">${v.endReason === 'resign' ? 'Có người xin thua nên ván dừng lại — người có điểm cao nhất trong số người còn lại thắng (hòa điểm thì ít thẻ hơn thắng).' : 'Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.'}</p>`;
  } else {
    title = '🤝 Ván kết thúc';
    body = `<div class="sp-final-scores">${scores.map(s => `<div class="row"><span>${esc(cleanName(s.name))}${s.id === v.me ? ' (bạn)' : ''}</span><b>${s.score} điểm</b></div>`).join('')}</div>
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

/* ---------- bấm đá ở ngân hàng: chọn đá để lấy ---------- */
$('#bank').addEventListener('click', e => {
  const b = e.target.closest('[data-gem]');
  if (!b || !cur || cur.phase !== 'playing') return;
  const human = turnHuman(cur);
  const handPid = human ? human.id : null;
  if (!handPid || !isMyTurn(cur, handPid) || !ui.controls(handPid)) { tip('Chưa tới lượt bạn.'); return; }
  if (!sel || (sel.action !== 'take3' && sel.action !== 'take2')) { tip('Chọn "Lấy 3 đá" hoặc "Lấy 2 đá" ở thanh hành động trước.'); return; }
  const c = b.dataset.gem;
  if (sel.action === 'take3') {
    if (!COLORS.includes(c)) { tip('Lấy 3 đá chỉ lấy đá màu (không lấy vàng).'); return; }
    if ((cur.tokens[c] || 0) <= 0) { Snd.invalid(); tip('Ngân hàng hết đá màu này.'); return; }
    const i = sel.colors.indexOf(c);
    if (i >= 0) sel.colors.splice(i, 1);
    else {
      if (sel.colors.length >= 3) { Snd.invalid(); tip('Lấy 3 đá chỉ được 3 màu khác nhau.'); return; }
      sel.colors.push(c);
    }
  } else {
    if (!COLORS.includes(c)) { tip('Lấy 2 đá chỉ lấy đá màu (không lấy vàng).'); return; }
    if ((cur.tokens[c] || 0) < 4) { Snd.invalid(); tip('Lấy 2 đá cùng màu chỉ được khi ngân hàng còn ít nhất 4 đá màu đó.'); return; }
    sel.color = sel.color === c ? null : c;
  }
  Snd.pick();
  render(cur, cur);
});

/* ---------- bấm thẻ / chồng bài trên bàn: giữ hoặc mua ---------- */
$('#table').addEventListener('click', e => {
  const deck = e.target.closest('[data-deck]');
  const card = e.target.closest('[data-card]');
  if ((!deck && !card) || !cur || cur.phase !== 'playing') return;
  const human = turnHuman(cur);
  const handPid = human ? human.id : null;
  if (!handPid || !isMyTurn(cur, handPid) || !ui.controls(handPid)) { tip('Chưa tới lượt bạn.'); return; }
  if (!sel || (sel.action !== 'reserve' && sel.action !== 'buy')) { tip('Chọn "Giữ thẻ" hoặc "Mua thẻ" ở thanh hành động trước.'); return; }
  const meP = myBoard(cur);
  if (!meP) return;
  if (deck) {
    if (sel.action !== 'reserve') { tip('Chồng bài chỉ dùng để giữ úp 1 thẻ — chọn "Giữ thẻ" trước.'); return; }
    const lvl = +deck.dataset.deck;
    if (sel.from === 'deck' && sel.level === lvl) { sel.from = null; sel.level = null; }
    else { sel.from = 'deck'; sel.level = lvl; sel.slot = null; }
    Snd.pick();
    render(cur, cur);
    return;
  }
  const id = card.dataset.card;
  const lvl = +card.dataset.level;
  const slot = +card.dataset.slot;
  const c = cardById(id);
  if (!c) return;
  if (sel.action === 'reserve') {
    if (sel.from === 'table' && sel.level === lvl && sel.slot === slot) { sel.from = null; sel.level = null; sel.slot = null; }
    else { sel.from = 'table'; sel.level = lvl; sel.slot = slot; }
  } else {
    if (!paymentFor(meP, c)) { Snd.invalid(); tip('Bạn chưa đủ tiền mua thẻ này (kể cả giảm giá + vàng).'); return; }
    if (sel.from === 'table' && sel.level === lvl && sel.slot === slot) { sel.from = null; sel.cardId = null; }
    else { sel.from = 'table'; sel.level = lvl; sel.slot = slot; sel.cardId = id; }
  }
  Snd.pick();
  render(cur, cur);
});

/* ---------- bấm thẻ đã giữ của mình: mua ---------- */
$('#myboard').addEventListener('click', e => {
  const tk = e.target.closest('[data-token]');
  const rc = e.target.closest('[data-reserved]');
  if (!cur || cur.phase !== 'playing') return;
  const human = turnHuman(cur);
  const handPid = human ? human.id : null;
  if (!handPid || !isMyTurn(cur, handPid) || !ui.controls(handPid)) return;
  const meP = myBoard(cur);
  if (!meP) return;
  if (tk && cur.step === 'discard') {
    const tidx = +tk.dataset.tidx;
    const i = discardSel.indexOf(tidx);
    if (i >= 0) discardSel.splice(i, 1);
    else {
      const excess = tokenCount(meP) - MAX_TOKENS;
      if (discardSel.length >= excess) { Snd.invalid(); tip(`Chỉ cần trả ${excess} đá — bỏ chọn 1 đá khác trước.`); return; }
      discardSel.push(tidx);
    }
    Snd.pick();
    render(cur, cur);
    return;
  }
  if (rc) {
    if (!sel || sel.action !== 'buy') { tip('Chọn "Mua thẻ" ở thanh hành động trước, rồi bấm thẻ đã giữ của bạn.'); return; }
    const id = rc.dataset.reserved;
    const c = cardById(id);
    if (!paymentFor(meP, c)) { Snd.invalid(); tip('Bạn chưa đủ tiền mua thẻ này (kể cả giảm giá + vàng).'); return; }
    if (sel.from === 'reserved' && sel.cardId === id) { sel.from = null; sel.cardId = null; }
    else { sel.from = 'reserved'; sel.level = null; sel.slot = null; sel.cardId = id; }
    Snd.pick();
    render(cur, cur);
  }
});

/* ---------- bấm quý tộc trên bàn: chọn quý tộc đến thăm ---------- */
$('#nobles').addEventListener('click', e => {
  const el = e.target.closest('[data-noble]');
  if (!el || !cur || cur.phase !== 'playing') return;
  const human = turnHuman(cur);
  const handPid = human ? human.id : null;
  if (!handPid || !isMyTurn(cur, handPid) || !ui.controls(handPid)) return;
  if (cur.step !== 'noble') { tip('Quý tộc chỉ đến vào cuối lượt khi bạn đủ điều kiện.'); return; }
  if (!(cur.nobleChoices || []).includes(el.dataset.noble)) { tip('Quý tộc này bạn chưa đủ điều kiện.'); return; }
  Snd.eat();
  ui.actAs(handPid, { type: 'noble', noble: el.dataset.noble });
});

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
  const r = await confirmBox('Nhận thua trận này? Ván dừng lại ngay, người có điểm cao nhất trong số người còn lại thắng.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
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
  game: 'splendor', net: NET,
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
