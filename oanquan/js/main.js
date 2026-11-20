// 🪀 Ô Ăn Quan – giao diện. Luật ở engine.js, bot ở bot.js, ảnh ở sprites.js, nhạc ở sound.js.
// Chơi local: Đấu với Máy (Dễ/Khó) hoặc 2 Người chơi trên cùng 1 máy.
// Chơi online: tạo phòng / vào phòng bằng mã (simplenet + gamekit như Bắn Tàu) —
// mỗi nước đi là action {cell, dir}; chủ phòng giữ state, 2 bên cùng chạy 1 animation
// bàn tay theo trace của nước đó (xem engine.applyAction / viewFor.trace).
// Cơ chế đi: bấm 1 ô dân bên mình → bàn tay BỐC toàn bộ đá lên; bấm ô kề bên trái/phải
// (trên màn hình) để rải theo hướng đó; bấm lại ô gốc để đặt đá xuống, chọn ô khác.
// Hướng suy ra từ ô kề (engine.dirFromNeighbor) nên luôn khớp màn hình ở cả 2 hàng.
import * as E from './engine.js?v=3';
import { chooseMove } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=3';
import { loadSprites } from './sprites.js?v=1';
import * as Snd from './sound.js?v=1';
import { record, recordEvent } from '../../shared/ui/stats.js?v=65';
import { toast } from '../../shared/ui/dialog.js?v=8';
import { makeNet } from '../../shared/net/simplenet.js?v=49';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const HINT_TEXT = '✋ Nhấn ô bên trái / phải để rải • Nhấn lại ô này để đặt xuống';

const NET = makeNet({
  game: 'oanquan', min: 2, max: 2, maxSeats: 10,
  minMsg: 'Cần 2 người chơi: thêm máy hoặc mời bạn vào phòng.',
  defaults: E.DEFAULT_OPTS, optOk: E.optOk,
  create: E.createGame, apply: E.applyAction, view: E.viewFor, actors: E.actors,
  bot: (s, pid) => { const m = chooseMove(s, pid, 'hard'); return m ? { type: 'move', cell: m.cell, dir: m.dir } : null; },
  botDelay: () => 750 + Math.random() * 500,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi'],
});

let G = null;            /* trạng thái luật (engine) — chế độ local */
let display = null;      /* bản sao để animate từng bước */
let mode = 'ai-hard';    /* ai-easy | ai-hard | pvp | online */
let quanValue = 10;
let sprites = null;
let busy = false, botTimer = null;
let held = null;         /* { cell, n, left, right } khi đang bốc đá, null nếu chưa bốc */
let handN = 0;           /* số đá đang nằm trên tay (hiển thị) */
let hintTimer = null;
let gameGen = 0;         /* tăng mỗi ván mới / mỗi lần rời ván — animation cũ tự dừng */
let gs = { quanEaten: 0, rescues: 0 }; /* theo dõi cho thành tựu (góc nhìn người chơi 1 / mình) */
const myName = () => ls.get('gumballz-name') || 'Bạn';

/* ---------- online ---------- */
let cur = null;          /* view mới nhất (chế độ online) */
let animQueue = [];      /* các view chờ animate theo đúng thứ tự nhận được */
let animating = false;
let lastSeq = -1;        /* seq của view đã animate xong */
let lastGid = '', endShownGid = '', endAchGid = '', achGid = '';
let optsLoaded = false;  /* đã nạp tùy chọn Quan đã lưu vào phòng chờ lần này chưa */
const stateNow = () => (mode === 'online' ? cur : G);
const myId = () => (mode === 'online' && cur ? cur.me : 'p1');
const isSpectator = () => mode === 'online' && !!cur && !cur.players.some(p => p.id === cur.me);

/* vị trí đá trong hốc: xoắn ốc góc vàng, cố định theo ô → đá không nhảy lung tung khi re-render */
function slotPos(cell, i) {
  const mand = E.isMandarin(cell);
  const rx = mand ? 34 : 40, ry = mand ? 40 : 30;
  const r = Math.sqrt(i + 0.5) * (mand ? 13 : 11);
  const a = i * 2.39996 + cell * 0.7;
  const x = 50 + Math.cos(a) * Math.min(r, rx) * 1.15;
  const y = 50 + Math.sin(a) * Math.min(r, ry) * 1.15;
  return { x: Math.max(8, Math.min(92, x)), y: Math.max(10, Math.min(90, y)) };
}
const CELL_NAME = { 0: 'Quan Trái', 6: 'Quan Phải' };

/* Bàn tay bốc đá — SVG tự vẽ, phong cách neobrutalism (da #ffcf9e, viền mực 3px),
   3 viên đá trên lòng bàn tay + huy hiệu đếm số đá đang cầm. */
const HAND_SVG = `<svg viewBox="0 0 120 100" aria-hidden="true">
<defs><radialGradient id="oq-stg" cx="35%" cy="30%" r="75%">
<stop offset="0" stop-color="#f4ead6"/><stop offset=".55" stop-color="#cfc0a0"/><stop offset="1" stop-color="#8f7d5c"/>
</radialGradient></defs>
<rect x="30" y="42" width="60" height="46" rx="20" fill="#ffcf9e" stroke="#2a2340" stroke-width="3"/>
<rect x="34" y="20" width="11" height="32" rx="5.5" fill="#ffcf9e" stroke="#2a2340" stroke-width="3"/>
<rect x="47" y="14" width="11" height="38" rx="5.5" fill="#ffcf9e" stroke="#2a2340" stroke-width="3"/>
<rect x="60" y="14" width="11" height="38" rx="5.5" fill="#ffcf9e" stroke="#2a2340" stroke-width="3"/>
<rect x="73" y="20" width="11" height="32" rx="5.5" fill="#ffcf9e" stroke="#2a2340" stroke-width="3"/>
<rect x="82" y="42" width="11" height="24" rx="5.5" fill="#ffcf9e" stroke="#2a2340" stroke-width="3" transform="rotate(28 87 54)"/>
<g class="hs"><circle cx="48" cy="60" r="9" fill="url(#oq-stg)" stroke="#2a2340" stroke-width="2"/><circle cx="66" cy="58" r="9" fill="url(#oq-stg)" stroke="#2a2340" stroke-width="2"/><circle cx="57" cy="72" r="9" fill="url(#oq-stg)" stroke="#2a2340" stroke-width="2"/></g>
</svg><span class="oq-hand-badge" id="hand-badge">0</span>`;

function buildBoard() {
  const b = $('#board');
  b.innerHTML = '';
  for (let c = 0; c < 12; c++) {
    const d = document.createElement('div');
    d.className = 'oq-cell' + (E.isMandarin(c) ? ' mandarin' + (c === 6 ? ' right' : '') : '');
    d.dataset.c = c;
    d.innerHTML = `<div class="oq-stones"></div><span class="oq-badge" hidden></span>` +
      (CELL_NAME[c] ? `<span class="oq-cell-label">${CELL_NAME[c]}</span>` : '');
    d.addEventListener('click', () => onCellClick(c));
    b.appendChild(d);
  }
  const hand = document.createElement('div');
  hand.className = 'oq-hand'; hand.id = 'hand'; hand.style.display = 'none';
  hand.innerHTML = HAND_SVG;
  b.appendChild(hand);
}
function render() {
  const s = display || G || cur;
  if (!s) return;
  const online = mode === 'online';
  const meId = online ? (s.me || (cur && cur.me)) : 'p1';
  const away = new Set(s.away || []);
  const me = s.players[0], foe = s.players[1];
  $('#btn-new').style.display = online ? 'none' : ''; /* online: đấu lại từ hộp kết thúc */
  const seat = (el, p, rowLabel) => {
    el.classList.toggle('turn', s.phase === 'playing' && s.turn === p.id);
    el.classList.toggle('off', away.has(p.id));
    el.querySelector('.who b').textContent = p.name + (online && p.id === meId ? ' (bạn)' : '');
    el.querySelector('.who small').textContent =
      (p.isBot ? 'Máy' : rowLabel) + (online && away.has(p.id) ? ' · ⚠️ mất kết nối' : '');
    const bag = el.querySelector('.bag');
    bag.innerHTML = `<span class="bq">👑 ${p.bag.q}</span><span class="bd">🪨 ${p.bag.d}</span>` +
      (p.debt > 0 ? `<span class="debt">nợ ${p.debt} Dân</span>` : '');
  };
  seat($('#seat-top'), foe, 'Hàng trên');
  seat($('#seat-bottom'), me, 'Hàng dưới');
  for (let c = 0; c < 12; c++) {
    const cell = s.cells[c];
    const el = document.querySelector(`.oq-cell[data-c="${c}"]`);
    if (!el) continue;
    const stones = el.querySelector('.oq-stones');
    let html = '';
    let n = 0;
    if (cell.q > 0) {
      const p = slotPos(c, 0);
      html += `<i class="oq-stone quan${sprites?.stoneQuan ? ' sprite' : ''}" style="left:${p.x}%;top:${p.y}%;${sprites?.stoneQuan ? `background-image:url(${sprites.stoneQuan});` : ''}"></i>`;
      n++;
    }
    for (let i = 0; i < cell.d; i++) {
      const p = slotPos(c, i + (cell.q > 0 ? 1 : 0));
      html += `<i class="oq-stone${sprites?.stoneDan ? ' sprite' : ''}" style="left:${p.x}%;top:${p.y}%;${sprites?.stoneDan ? `background-image:url(${sprites.stoneDan});` : ''}"></i>`;
      n++;
    }
    stones.innerHTML = html;
    const badge = el.querySelector('.oq-badge');
    const total = cell.q + cell.d;
    badge.hidden = false;
    badge.classList.toggle('quan', cell.q > 0);
    badge.textContent = cell.q > 0 ? `👑${total}` : `${total}`;
    badge.title = `${cell.q} Quan · ${cell.d} Dân`;
    const mySide = E.SIDE_CELLS[s.turn === s.players[0].id ? 0 : 1];
    const canMove = s.phase === 'playing' && !busy && !isSpectator() &&
      (online ? s.turn === meId : (mode === 'pvp' || s.turn === 'p1'));
    const playable = canMove && mySide.includes(c) && cell.d > 0;
    el.classList.toggle('playable', held ? (c === held.cell || c === held.left || c === held.right) : !!playable);
    el.classList.toggle('selected', !!held && held.cell === c);
    el.classList.toggle('neighbor', !!held && (c === held.left || c === held.right));
  }
  const st = $('#status');
  if (held) {
    st.textContent = `✋ Đang cầm ${held.n} quân — bấm ô kề bên trái/phải để rải, bấm lại ô này để đặt xuống`;
  } else if (s.phase === 'ended') {
    const sc = s.scores;
    st.textContent = s.draw ? `🤝 Hoà ${sc[0].total} – ${sc[1].total}!` :
      `🏆 ${s.players.find(p => p.id === s.winner).name} thắng ${Math.max(sc[0].total, sc[1].total)} – ${Math.min(sc[0].total, sc[1].total)}!`;
  } else if (online && isSpectator()) {
    st.textContent = '👀 Bạn đang xem ván này.';
  } else {
    const turnP = s.players.find(p => p.id === s.turn);
    const turnName = turnP?.name || '';
    const rowOf = p => (p && p.id === s.players[0].id ? 'hàng dưới' : 'hàng trên');
    const awayNote = turnP && away.has(turnP.id) ? ' (đang mất kết nối — máy đi thay sau vài giây)' : '';
    if (online) {
      st.textContent = s.turn === meId
        ? `👉 Lượt của bạn — bấm 1 ô ${rowOf(turnP)} để bốc đá`
        : `⏳ Lượt của ${turnName}${awayNote}`;
    } else if (mode === 'pvp') {
      st.textContent = `👉 Lượt của ${turnName} (${rowOf(turnP)}) — bấm 1 ô bên bạn`;
    } else {
      st.textContent = s.turn === 'p1' ? '👉 Lượt của bạn — bấm 1 ô hàng dưới để bốc đá' : '🤖 Máy đang nghĩ…';
    }
  }
  const log = $('#log');
  log.innerHTML = s.log.slice(-12).reverse().map(l => `<div>${esc(l.text)}</div>`).join('') || '<div>Chưa có nước đi nào.</div>';
  const board = $('#board');
  if (sprites?.board) { board.classList.add('sprite-board'); board.style.backgroundImage = `url(${sprites.board})`; }
}
function cellCenter(c) {
  const el = document.querySelector(`.oq-cell[data-c="${c}"]`);
  const wrap = $('#board').getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.left - wrap.left + r.width / 2, y: r.top - wrap.top + r.height / 2 };
}

/* ---------- bàn tay ---------- */
function setHand(n) {
  handN = Math.max(0, n);
  const badge = $('#hand-badge');
  badge.textContent = handN;
  badge.style.display = handN > 0 ? '' : 'none';
  document.querySelectorAll('#hand .hs circle').forEach((el, i) => { el.style.display = i < Math.min(handN, 3) ? '' : 'none'; });
}
function moveHandTo(x, y) {
  const board = $('#board');
  const cx = Math.max(42, Math.min(x, board.clientWidth - 42));
  const cy = Math.max(-110, Math.min(y, board.clientHeight + 110));
  const hand = $('#hand');
  hand.style.left = cx + 'px'; hand.style.top = cy + 'px';
}
function moveHandToCell(c) { const p = cellCenter(c); moveHandTo(p.x, p.y); }
function showHandAt(c, n) {
  const p = cellCenter(c);
  moveHandTo(p.x, p.y);
  setHand(n);
  $('#hand').style.display = 'block';
}
function hideHand() { $('#hand').style.display = 'none'; setHand(0); }
function bagPos(pid, s) {
  const st = s || display || G || cur;
  const idx = st ? st.players.findIndex(p => p.id === pid) : 0;
  const bag = document.querySelector((idx === 0 ? '#seat-bottom' : '#seat-top') + ' .bag');
  const board = $('#board').getBoundingClientRect();
  const rb = bag.getBoundingClientRect();
  return { x: rb.left - board.left + rb.width / 2, y: rb.top - board.top + rb.height / 2 };
}

/* ---------- gợi ý bốc đá ---------- */
function showHoldHint(c) {
  const hint = $('#hold-hint');
  hint.textContent = HINT_TEXT;
  hint.classList.remove('warn');
  hint.hidden = false;
  const board = $('#board');
  const cc = cellCenter(c);
  const hw = hint.offsetWidth || 300, hh = hint.offsetHeight || 40;
  let left = Math.max(4, Math.min(cc.x - hw / 2, board.clientWidth - hw - 4));
  const topRow = c >= 1 && c <= 5;
  let top = topRow ? cc.y + 52 : cc.y - 52 - hh;
  top = Math.max(4, Math.min(top, board.clientHeight - hh - 4));
  hint.style.left = left + 'px'; hint.style.top = top + 'px';
}
function hideHoldHint() { const h = $('#hold-hint'); h.hidden = true; h.classList.remove('warn'); }
function flashHint(text) {
  const h = $('#hold-hint');
  h.textContent = text;
  h.classList.add('warn');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => { if (held) { h.textContent = HINT_TEXT; h.classList.remove('warn'); } }, 1800);
}

/* ---------- bốc / đặt đá ---------- */
function pickUp(c) {
  const s = stateNow();
  const n = s.cells[c].d;
  held = { cell: c, n, left: null, right: null };
  /* ô kề nào nằm bên trái / phải trên màn hình? so theo tọa độ thật của ô */
  const cc = cellCenter(c);
  const wrap = $('#board').getBoundingClientRect();
  for (const nb of E.neighborCells(c)) {
    const el = document.querySelector(`.oq-cell[data-c="${nb}"]`);
    const r = el.getBoundingClientRect();
    const cx = r.left - wrap.left + r.width / 2;
    if (cx < cc.x) held.left = nb; else held.right = nb;
  }
  display.cells[c].d = 0; /* ô trống tạm thời — đá đang nằm trên tay */
  showHandAt(c, n);
  showHoldHint(c);
  Snd.pickup();
  render();
}
function cancelHold() {
  if (!held) return;
  held = null;
  hideHand(); hideHoldHint();
  const s = stateNow();
  display = s ? E.cloneState(s) : null;
  render();
}
function onCellClick(c) {
  const s = stateNow();
  if (!s || s.phase !== 'playing' || busy) return;
  if (mode === 'online') {
    if (isSpectator() || s.turn !== myId()) return;
  } else if (mode !== 'pvp' && s.turn !== 'p1') return; /* lượt máy */
  const mySide = E.SIDE_CELLS[s.turn === s.players[0].id ? 0 : 1];
  const res = E.resolveHoldClick({ heldCell: held ? held.cell : null, clicked: c, mySide, stones: s.cells[c].d });
  if (res.action === 'pickup') { pickUp(c); return; }
  if (res.action === 'putback') { cancelHold(); return; }
  if (res.action === 'sow') {
    const cell = held.cell, dir = res.dir;
    held = null; hideHoldHint();
    if (mode === 'online') ui.act({ type: 'move', cell, dir }); /* chủ phòng áp luật rồi phát lại cho cả 2 bên */
    else doMove(s.turn, { cell, dir });
    return;
  }
  if (held) flashHint('Chỉ rải sang ô kề bên trái hoặc bên phải — bấm lại ô gốc để đặt xuống.');
}

/* ---------- animation 1 nước đi theo trace ----------
   disp = state hiển thị (sửa từng bước), final = state đích (đồng bộ túi khi cứu dân),
   moverId = người đi nước này, gen = thế hệ ván (rời ván / ván mới thì dừng). */
async function animateTrace(trace, disp, final, moverId, gen) {
  for (const step of trace) {
    if (gameGen !== gen) break; /* người chơi rời ván giữa lúc animate */
    if (step.t === 'pickup') {
      moveHandToCell(step.cell);
      setHand(step.n);
      disp.cells[step.cell].d = 0;
      Snd.pickup();
      render();
      await sleep(220);
    } else if (step.t === 'drop') {
      moveHandToCell(step.cell);
      setHand(handN - 1);
      disp.cells[step.cell].d++;
      Snd.pebble();
      render();
      await sleep(300);
    } else if (step.t === 'eat') {
      /* tay xúc đá ở ô bị ăn, rồi bay về túi điểm của người ăn */
      moveHandToCell(step.cell);
      setHand(step.q + step.d);
      disp.cells[step.cell] = { q: 0, d: 0 };
      render();
      await sleep(300);
      const bp = bagPos(moverId, final);
      moveHandTo(bp.x, bp.y);
      await sleep(340);
      disp.players.find(p => p.id === moverId).bag.q += step.q;
      disp.players.find(p => p.id === moverId).bag.d += step.d;
      setHand(0);
      Snd.chime();
      render();
      const el = document.querySelector(`.oq-cell[data-c="${step.cell}"]`);
      el?.classList.add('eat-flash'); setTimeout(() => el?.classList.remove('eat-flash'), 600);
      await sleep(200);
    } else if (step.t === 'rescue') {
      /* đồng bộ display với trạng thái sau cứu dân, rồi tay đi từng ô cứu */
      for (const c of step.cells) disp.cells[c].d = final.cells[c].d;
      for (let i = 0; i < 2; i++) { disp.players[i].bag = { ...final.players[i].bag }; disp.players[i].debt = final.players[i].debt; }
      render();
      toast('🛟 Cứu dân: rải đều 1 Dân vào 5 ô!');
      let left = step.cells.length;
      for (const c of step.cells) {
        if (gameGen !== gen) break;
        moveHandToCell(c);
        setHand(left--);
        Snd.pebble();
        render();
        await sleep(200);
      }
      setHand(0);
    }
  }
}

async function doMove(pid, move) {
  if (!G || G.phase !== 'playing') return;
  const gen = gameGen;
  const before = E.cloneState(G);
  const r = E.applyMove(G, pid, move);
  if (!r.ok) { toast(r.reason || 'Nước đi không hợp lệ.'); return; }
  busy = true;
  display = before;
  $('#hand').style.display = 'block';
  setHand(0);
  await animateTrace(r.trace, display, G, pid, gen);
  hideHand();
  if (gameGen !== gen) { busy = false; return; }
  display = E.cloneState(G);
  render();
  busy = false;
  /* thành tựu: góc nhìn người chơi 1 */
  if (pid === 'p1') {
    if (r.eaten?.q > 0) { gs.quanEaten += r.eaten.q; recordEvent('oanquan', 'eat', { q: r.eaten.q, d: r.eaten.d, chain: r.chain }); }
    if (r.chain >= 3) recordEvent('oanquan', 'chain', { chain: r.chain });
  }
  if (r.rescue && !r.rescue.failed) {
    const rescuedIsP1 = G.turn === 'p1'; /* sau khi đổi lượt, người vừa tới lượt là người được cứu */
    if (rescuedIsP1) { gs.rescues++; recordEvent('oanquan', 'rescue', {}); }
  }
  if (G.phase === 'ended') { endGame(); return; }
  if (mode !== 'pvp' && G.turn === 'p2') {
    clearTimeout(botTimer);
    botTimer = setTimeout(() => {
      const m = chooseMove(G, 'p2', mode === 'ai-hard' ? 'hard' : 'easy');
      if (m) doMove('p2', m);
    }, 750);
  }
}
function endGame() {
  const won = G.winner === 'p1';
  record('oanquan', won);
  recordEvent('oanquan', 'end', { won, oppQuan: G.players[1].bag.q, rescues: gs.rescues, quanEaten: gs.quanEaten });
  if (won) Snd.winJingle();
  const sc = G.scores;
  const reason = G.endReason === 'rescue'
    ? '<p>Không cứu được dân nên ván dừng sớm — quân còn trong 2 ô Quan không tính cho bên nào.</p>' : '';
  openModal(`<h2>${G.draw ? '🤝 Hoà!' : won ? '🏆 Bạn thắng!' : '😢 Bạn thua!'}</h2>
    <p><b>${esc(G.players[0].name)} ${sc[0].total}</b> – <b>${sc[1].total} ${esc(G.players[1].name)}</b></p>
    <p>Quan ăn được: bạn ${G.players[0].bag.q} · ${esc(G.players[1].name)} ${G.players[1].bag.q} (mỗi Quan ${G.opts.quanValue} điểm) · Dân: bạn ${G.players[0].bag.d} · ${esc(G.players[1].name)} ${G.players[1].bag.d}</p>
    ${reason}
    <div class="btn-col"><button class="btn big pri" id="btn-again">🔄 Chơi ván mới</button>
    <button class="btn" id="btn-home2">🏠 Về màn hình chính</button></div>`);
  $('#btn-again').onclick = () => { closeModal(); startGame(); };
  $('#btn-home2').onclick = () => { closeModal(); showHome(); };
}

/* ---------- online: phòng chờ ---------- */
function renderLobby(info, u) {
  const host = u.isHost && u.net ? u.net.raw : null, o = info.opts, dis = u.isHost ? '' : 'disabled', n = info.players.length;
  if (host && !optsLoaded) {
    /* nhớ giá trị Quan lần trước của chủ phòng */
    optsLoaded = true;
    const saved = Number(ls.get('gumballz-oanquan-qv'));
    if ((saved === 5 || saved === 10) && host.opts.quanValue !== saved) { host.opts.quanValue = saved; host.pushLobby(); return; }
  }
  $('#pcount').textContent = `${n}/2 người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' <small>· máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}${p.local ? ' <small>· cùng máy</small>' : ''}</span>${u.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = u.isHost && n < 2 ? '<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button></div>' : '';
  const seg = (key, items) => `<div class="seg">${items.map(([v, nm]) => `<button type="button" data-opt="${key}" data-v="${v}" aria-pressed="${String(o[key]) === String(v)}" ${dis}>${nm}</button>`).join('')}</div>`;
  $('#opts').innerHTML = `<div class="opt"><b>👑 Giá trị 1 quân Quan</b>${seg('quanValue', [[5, '5 điểm'], [10, '10 điểm']])}<small>Quan ăn được tính 5 hoặc 10 điểm. Khi cứu dân thì 1 Quan luôn đổi được 10 Dân.</small></div>`;
  $('#btn-start-online').style.display = u.isHost ? '' : 'none';
  $('#btn-start-online').disabled = n < 2;
  $('#wait-msg').style.display = u.isHost ? 'none' : '';
}

/* ---------- online: thành tựu (góc nhìn người chơi hiện tại) ----------
   Số ván/thắng online do stats.watch() tự ghi khi ván kết thúc — KHÔNG gọi
   record() tay ở đây, kẻo đếm trùng. Chỉ ghi recordEvent cho các huy hiệu. */
function trackAch(v, prev) {
  if (!v || mode !== 'online') return;
  const me = v.me;
  if (v.gid !== achGid) { achGid = v.gid; gs = { quanEaten: 0, rescues: 0 }; }
  const isNew = !!prev && prev.seq !== v.seq; /* prev null = vừa vào lại giữa ván: bỏ qua, tránh đếm lại nước cũ */
  if (isNew && v.lastMove && v.lastMove.by === me) {
    const lm = v.lastMove;
    if (lm.eaten && lm.eaten.q > 0) { gs.quanEaten += lm.eaten.q; recordEvent('oanquan', 'eat', { q: lm.eaten.q, d: lm.eaten.d, chain: lm.chain }); }
    if (lm.chain >= 3) recordEvent('oanquan', 'chain', { chain: lm.chain });
  }
  if (isNew && v.trace && v.trace.some(t => t.t === 'rescue') && v.phase === 'playing' && v.turn === me) {
    gs.rescues++;
    recordEvent('oanquan', 'rescue', {});
  }
  if (v.phase === 'ended' && endAchGid !== v.gid) {
    endAchGid = v.gid;
    const opp = v.players.find(p => p.id !== me);
    recordEvent('oanquan', 'end', { won: v.winner === me, oppQuan: opp ? opp.bag.q : 0, rescues: gs.rescues, quanEaten: gs.quanEaten });
  }
}

/* ---------- online: nhận state ---------- */
function handleNetState(v, prev, u) {
  if (!v) {
    /* rời phòng / phòng giải tán / chủ phòng bấm về phòng chờ */
    cur = null; display = null; animQueue = []; animating = false; lastSeq = -1;
    endShownGid = ''; lastGid = '';
    if (!u.net) optsLoaded = false;
    gameGen++;
    held = null; busy = false;
    hideHand(); hideHoldHint();
    restoreLocalMode();
    return;
  }
  mode = 'online';
  cur = v;
  trackAch(v, prev);
  if (!prev) {
    /* ván mới bắt đầu / vừa vào lại giữa ván: chưa có state trước để animate */
    display = E.cloneState(v);
    lastSeq = v.seq; lastGid = v.gid;
    render();
    if (v.phase === 'ended') showOnlineEnd(v);
    return;
  }
  if (v.seq === lastSeq) { render(); return; } /* state cũ phát lại */
  lastGid = v.gid;
  animQueue.push({ v, prev });
  processQueue();
}
function processQueue() {
  if (animating || !animQueue.length) return;
  const { v, prev } = animQueue.shift();
  animating = true; busy = true;
  const gen = gameGen;
  display = E.cloneState(prev);
  $('#hand').style.display = 'block';
  setHand(0);
  animateTrace(v.trace || [], display, v, v.lastMove ? v.lastMove.by : null, gen).then(() => {
    hideHand();
    if (gameGen !== gen) { animating = false; busy = false; return; }
    display = E.cloneState(v);
    lastSeq = v.seq;
    render();
    animating = false; busy = false;
    if (v.phase === 'ended') showOnlineEnd(v);
    processQueue();
  });
}
function showOnlineEnd(v) {
  if (endShownGid === v.gid) return;
  endShownGid = v.gid;
  const meId = v.me;
  const myIdx = v.players.findIndex(p => p.id === meId);
  const spec = myIdx < 0;
  const won = !spec && v.winner === meId;
  if (won) Snd.winJingle();
  const sc = v.scores;
  const p0 = v.players[0], p1 = v.players[1];
  const wName = v.players.find(p => p.id === v.winner)?.name || '';
  const title = v.draw ? '🤝 Hoà!' : spec ? `🏆 ${esc(wName)} thắng!` : won ? '🏆 Bạn thắng!' : '😢 Bạn thua!';
  const scoreHtml = spec
    ? `<p><b>${esc(p0.name)} ${sc[0].total}</b> – <b>${sc[1].total} ${esc(p1.name)}</b></p>`
    : `<p><b>${esc(v.players[myIdx].name)} ${sc[myIdx].total}</b> – <b>${sc[1 - myIdx].total} ${esc(v.players[1 - myIdx].name)}</b></p>`;
  const detail = spec
    ? `<p>Quan ăn được: ${esc(p0.name)} ${p0.bag.q} · ${esc(p1.name)} ${p1.bag.q} (mỗi Quan ${v.quanValue} điểm) · Dân: ${esc(p0.name)} ${p0.bag.d} · ${esc(p1.name)} ${p1.bag.d}</p>`
    : `<p>Quan ăn được: bạn ${v.players[myIdx].bag.q} · ${esc(v.players[1 - myIdx].name)} ${v.players[1 - myIdx].bag.q} (mỗi Quan ${v.quanValue} điểm) · Dân: bạn ${v.players[myIdx].bag.d} · ${esc(v.players[1 - myIdx].name)} ${v.players[1 - myIdx].bag.d}</p>`;
  const reason = v.endReason === 'rescue'
    ? '<p>Không cứu được dân nên ván dừng sớm — quân còn trong 2 ô Quan không tính cho bên nào.</p>' : '';
  const btns = ui.isHost
    ? `<div class="btn-col"><button class="btn big pri" id="btn-again">🔄 Chơi ván mới</button><button class="btn" id="btn-home2">🏠 Về màn hình chính</button></div>`
    : `<p>⏳ Chờ chủ phòng bắt đầu ván mới…</p><div class="btn-col"><button class="btn" id="btn-home2">🏠 Về màn hình chính</button></div>`;
  openModal(`<h2>${title}</h2>${scoreHtml}${detail}${reason}${btns}`);
  const again = $('#btn-again');
  if (again) again.onclick = () => { closeModal(); if (ui.net) ui.net.raw.start(); };
  $('#btn-home2').onclick = () => { closeModal(); if (ui.net) ui.leave(); else showHome(); };
}

function startGame() {
  const p1name = ($('#name').value.trim() || myName()).slice(0, 16);
  try { ls.set('gumballz-name', p1name); } catch (e) {}
  const p2name = mode === 'pvp' ? ($('#name2').value.trim() || 'Người chơi 2').slice(0, 16) : 'Máy 🤖';
  cur = null; animQueue = []; lastSeq = -1; endShownGid = '';
  gameGen++;
  G = E.createGame([
    { id: 'p1', name: p1name },
    { id: 'p2', name: p2name, isBot: mode !== 'pvp' },
  ], { quanValue });
  display = E.cloneState(G);
  gs = { quanEaten: 0, rescues: 0 };
  held = null; busy = false;
  hideHand(); hideHoldHint();
  $('#screen-home').classList.remove('active');
  $('#screen-game').classList.add('active');
  render();
  toast(mode === 'pvp' ? '2 người chơi — ' + p1name + ' đi trước!' : 'Bạn đi trước — bấm 1 ô hàng dưới để bốc đá nhé!');
}
function showHome() {
  if (mode === 'online' && ui.net) { ui.leave(); return; } /* handleNetState(null) dọn dẹp + khôi phục chế độ local */
  if (G && G.phase === 'playing' && G.turnNo > 1) record('oanquan', false); /* ván bỏ dở tính là thua */
  G = null; display = null; clearTimeout(botTimer); clearTimeout(hintTimer);
  held = null; gameGen++;
  hideHand(); hideHoldHint();
  $('#screen-game').classList.remove('active');
  $('#screen-home').classList.add('active');
}
function openModal(html) { $('#modal-box').innerHTML = html; $('#modal').classList.add('open'); }
function closeModal() { $('#modal').classList.remove('open'); }

/* ---------- khởi tạo ---------- */
buildBoard();
$('#name').value = myName();
const modeBtns = [...document.querySelectorAll('[data-mode]')];
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  $('#fld-name2').style.display = m === 'pvp' ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  try { ls.set('gumballz-oanquan-mode', m); } catch (e) {}
}
function restoreLocalMode() {
  let m = 'ai-hard';
  try { const sm = ls.get('gumballz-oanquan-mode'); if (sm === 'ai-easy' || sm === 'ai-hard' || sm === 'pvp') m = sm; } catch (e) {}
  setMode(m);
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
const qvBtns = [...document.querySelectorAll('[data-qv]')];
function setQv(v) {
  quanValue = v;
  qvBtns.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.qv) === v)));
  try { ls.set('gumballz-oanquan-qv', String(v)); } catch (e) {}
}
qvBtns.forEach(b => b.addEventListener('click', () => setQv(Number(b.dataset.qv))));
try {
  const sm = ls.get('gumballz-oanquan-mode');
  if (sm === 'ai-easy' || sm === 'ai-hard' || sm === 'pvp' || sm === 'online') setMode(sm); else setMode('ai-hard');
  const sq = ls.get('gumballz-oanquan-qv');
  setQv(sq === '5' ? 5 : 10);
} catch (e) { setMode('ai-hard'); setQv(10); }
$('#btn-start').addEventListener('click', startGame);
$('#btn-start-online').onclick = () => { if (ui.isHost && ui.net) ui.net.raw.start(); };
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui || !ui.net || !ui.isHost) return;
  const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot();
  else if (b.dataset.opt) { const v = Number(b.dataset.v); h.setOpt(b.dataset.opt, v); try { ls.set('gumballz-oanquan-qv', String(v)); } catch (e) {} }
});
$('#btn-guide-home').addEventListener('click', () => openModal(GUIDE_HTML));
$('#btn-guide').addEventListener('click', () => openModal(GUIDE_HTML));
$('#btn-new').addEventListener('click', () => { showHome(); });
$('#btn-home-bottom').addEventListener('click', e => {
  e.preventDefault();
  if (mode === 'online' && ui.net) ui.leave();
  location.href = '../';
});
$('#btn-leave').addEventListener('click', () => {
  if (mode === 'online' && ui.net) {
    openModal(`<h2>Rời ván?</h2><p>${ui.isHost ? 'Bạn là chủ phòng: rời đi là cả phòng giải tán.' : 'Bạn có thể vào lại bằng mã phòng.'}</p>
      <div class="btn-col"><button class="btn big pri" id="m-leave">🚪 Rời ván</button>
      <button class="btn" id="m-stay">Ở lại</button></div>`);
    $('#m-leave').onclick = () => { closeModal(); ui.leave(); setTimeout(() => { location.href = '../'; }, 250); };
    $('#m-stay').onclick = () => closeModal();
    return;
  }
  if (!G) { closeModal(); showHome(); return; }
  openModal(`<h2>Rời ván?</h2><p>Ván đang chơi dở sẽ tính là thua.</p>
    <div class="btn-col"><button class="btn big pri" id="m-leave">🚪 Rời ván</button>
    <button class="btn" id="m-stay">Ở lại</button></div>`);
  $('#m-leave').onclick = () => { closeModal(); showHome(); location.href = '../'; };
  $('#m-stay').onclick = () => closeModal();
});
$('#btn-sound').addEventListener('click', () => {
  Snd.setSound(!Snd.isSoundOn());
  $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇';
});
$('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇';
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!busy) cancelHold(); closeModal(); } });
/* Chủ phòng đã thoát hẳn (vào lại hết lượt thử): báo rõ + cho tạo phòng mới / về nhà.
   Lớp room.js phát sự kiện 'gumballz-room' {type:'fail'} khi hết đường vào lại. */
addEventListener('gumballz-room', e => {
  const d = e.detail || {};
  if (d.type === 'fail' && typeof d.msg === 'string' && d.msg.indexOf('Không vào lại được phòng') === 0 && ui.net) {
    openModal(`<h2>😢 Phòng đã giải tán</h2><p>Chủ phòng đã thoát nên không vào lại được phòng.</p>
      <div class="btn-col"><button class="btn big pri" id="btn-newroom">🌐 Tạo phòng mới</button>
      <button class="btn" id="btn-gohome">🏠 Về màn hình chính</button></div>`);
    $('#btn-newroom').onclick = () => { closeModal(); ui.leave(); setTimeout(() => $('#btn-create').click(), 60); };
    $('#btn-gohome').onclick = () => { closeModal(); ui.leave(); };
  }
});
loadSprites().then(s => { sprites = s; if (s) render(); }).catch(() => {});

const ui = gameKit({
  game: 'oanquan', net: NET,
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev, u) => handleNetState(v, prev, u),
});
/* gamekit tự gắn confirmBox cho #btn-leave — game này dùng hộp "Rời ván?" riêng
   (có nút Về trang chủ do homebtn.js chèn) nên gỡ handler đó, chỉ giữ 1 handler. */
$('#btn-leave').onclick = null;
