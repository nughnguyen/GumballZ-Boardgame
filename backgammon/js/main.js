// 🎲 Backgammon — giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Cờ Nhảy:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Bàn vẽ bằng DOM: hàng trên điểm 13–24, hàng dưới điểm 12–1,
// vạch giữa ở chính giữa, khay ra quân + xúc xắc ở dưới bàn.
// Bấm quân của mình để chọn (hiện điểm đến được), bấm điểm đích để đi,
// bấm khay "Ra ngoài" để ra quân.
import { createGame, applyAction, viewFor, actors, legalMovesFromView, destsFor } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=50';
import { gameKit, $, esc, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'backgammon', min: 2, max: 2, maxSeats: 2, allowLocal: true,
  minMsg: 'Backgammon cần đúng 2 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: () => false,
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 700 + Math.random() * 900,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo'],
});

/* màu ghế ngồi — cùng thứ tự với engine.js PLAYER_COLORS */
const PLAYER_COLORS = ['#E05D5D', '#5B8DEF'];
const PLAYER_EMOJI = ['🔴', '🔵'];
const colorOf = (v, pid) => {
  const i = v.players.findIndex(p => p.id === pid);
  return PLAYER_COLORS[i < 0 ? 0 : i % PLAYER_COLORS.length];
};
const emojiOf = (v, pid) => {
  const i = v.players.findIndex(p => p.id === pid);
  return PLAYER_EMOJI[i < 0 ? 0 : i % PLAYER_EMOJI.length];
};
const DICE_FACE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
const modeBtns = [...document.querySelectorAll('[data-mode]')];
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'pvp' ? '👥 Mở phòng chuyền tay' : m === 'ai-easy' ? '🤖 Bắt đầu chơi với máy Dễ' : '🧠 Bắt đầu chơi với máy Khó';
  try { localStorage.setItem('gumballz-backgammon-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
try {
  const sm = localStorage.getItem('gumballz-backgammon-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  $('#pcount').textContent = `${n}/2 người (cần đúng 2)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${i === 0 ? '<span class="seat-role">👑 Đi trước (ngẫu nhiên)</span>' : ''}${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (n < 2
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  $('#opts').innerHTML = `<div class="opt"><b>🎲 Luật nhanh</b><div class="role-note">Bàn 24 điểm, mỗi người 15 quân. Gieo 2 xúc xắc — mỗi xúc xắc là 1 nước đi, ra đôi được 4 nước. Điểm đến phải trống, có quân mình, hoặc đúng 1 quân địch (đánh trúng lên vạch). Ra quân hết 15 quân trước thì thắng: Gammon ×2, Backgammon ×3. Xúc xắc gấp đôi trước khi gieo.</div></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = n !== 2;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
  $('#wait-msg').textContent = n !== 2 ? `Cần đúng 2 người mới bắt đầu (đang có ${n}).` : 'Đang chờ chủ phòng bắt đầu…';
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
/* quân đang chọn: { from: idx | 'bar' } | null */
let selFrom = null;

function turnHuman(v) {
  if (!v || v.phase !== 'playing') return null;
  const p = v.players.find(x => x.id === v.turn);
  if (mode === 'pvp') return p && !p.isBot ? p : null;
  return v.players.find(x => x.id === v.me) || null;
}
function isMyTurn(v, pid) {
  return v && v.phase === 'playing' && v.turn === pid;
}

/* ---------- vẽ bàn cờ ---------- */
/* hàng trên (trái→phải): điểm 13–18, vạch, 19–24; hàng dưới: 12–7, vạch, 6–1 */
const TOP_ORDER = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const BOT_ORDER = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
function pointHTML(v, idx, myTurn, handPid, dests) {
  const pt = v.points[idx];
  const num = idx + 1;
  const cls = `bg-point ${num % 2 === 0 ? 'c-a' : 'c-b'}${dests && dests.has(idx) ? ' dest' : ''}${selFrom != null && String(selFrom) === String(idx) ? ' sel' : ''}`;
  let inner = `<span class="pt-num" style="${idx >= 12 ? 'bottom:2px' : 'top:2px'}">${num}</span>`;
  const n = pt.count;
  if (n > 0) {
    const shown = Math.min(n, 5);
    for (let i = 0; i < shown; i++) {
      const isMe = pt.owner === handPid && myTurn;
      const isSel = selFrom != null && String(selFrom) === String(idx) && i === 0;
      inner += `<span class="bg-checker c${pt.owner === v.players[0].id ? 0 : 1}${isMe ? ' mine' : ''}${isSel ? ' sel' : ''}" style="--i:${i}" data-checker="${idx}" data-pid="${pt.owner}">${i === shown - 1 && n > 5 ? n : ''}</span>`;
    }
  }
  return `<div class="${cls}" data-point="${idx}">${inner}</div>`;
}
function barHTML(v, pid, myTurn, handPid) {
  const p = v.players.find(x => x.id === pid);
  if (!p || !p.bar) return '';
  const idx = v.players[0].id === pid ? 0 : 1;
  let out = '';
  const shown = Math.min(p.bar, 3);
  for (let i = 0; i < shown; i++) {
    const isMe = pid === handPid && myTurn;
    out += `<span class="bg-checker bar-c c${idx}${isMe ? ' mine' : ''}${selFrom === 'bar' ? ' sel' : ''}" data-checker="bar" data-pid="${pid}">${i === shown - 1 && p.bar > 3 ? p.bar : ''}</span>`;
  }
  return out;
}
function boardHTML(v, myTurn, handPid, destSet) {
  const half = (order, cls) => {
    let h = `<div class="bg-half ${cls}">`;
    order.slice(0, 6).forEach(idx => { h += pointHTML(v, idx, myTurn, handPid, destSet); });
    h += `<div class="bg-bar"><div class="bar-stack">${cls === 'top' ? barHTML(v, v.players[0].id, myTurn, handPid) : barHTML(v, v.players[1].id, myTurn, handPid)}</div></div>`;
    order.slice(6).forEach(idx => { h += pointHTML(v, idx, myTurn, handPid, destSet); });
    return h + '</div>';
  };
  const cubeCls = `bg-cube${v.cube.owner === v.players[0].id ? ' owned-p0' : v.cube.owner === v.players[1].id ? ' owned-p1' : ''}${v.step === 'double' ? ' offer' : ''}`;
  return half(TOP_ORDER, 'top')
    + `<div class="bg-mid"><div class="bg-bar"><span class="${cubeCls}" id="cube" title="Xúc xắc gấp đôi">×${v.cube.value}</span></div></div>`
    + half(BOT_ORDER, 'bottom');
}
function diceHTML(v) {
  if (!v.dice.length) return `<span class="bg-die" style="opacity:.35">⚀</span><span class="bg-die" style="opacity:.35">⚀</span><span class="bg-dice-info">Chưa gieo — bấm 🎲 Gieo xúc xắc</span>`;
  const total = v.dice[0] === v.dice[1] ? 4 : 2;
  const faces = v.dice[0] === v.dice[1] ? [v.dice[0], v.dice[0], v.dice[0], v.dice[0]] : v.dice.slice();
  const left = {};
  for (const d of v.diceLeft) left[d] = (left[d] || 0) + 1;
  let html = '';
  for (const d of faces) {
    const used = left[d] > 0 ? (left[d]--, false) : true;
    html += `<span class="bg-die${used ? ' used' : ''}" data-die="${d}">${DICE_FACE[d - 1]}</span>`;
  }
  const info = v.step === 'move'
    ? (v.diceLeft.length ? `Còn ${v.diceLeft.length} nước: ${v.diceLeft.join(' · ')}` : 'Hết nước — đổi lượt')
    : '';
  return html + `<span class="bg-dice-info">${info}</span>`;
}

function render(v, prev) {
  cur = v;
  if (!v) { endShownFor = ''; selFrom = null; return; }
  const me = v.players.find(p => p.id === v.me) || {};
  const turnP = v.players.find(p => p.id === v.turn);
  const human = turnHuman(v);
  const handPid = human ? human.id : null;
  const meP = v.players.find(p => p.id === handPid) || null;
  const myTurn = handPid && isMyTurn(v, handPid) && ui.controls(handPid);
  /* đổi lượt / đổi trạng thái thì bỏ lựa chọn cũ */
  if (prev && (v.turnCount !== prev.turnCount || v.phase !== prev.phase || v.step !== prev.step)) selFrom = null;

  const winnerP = v.winner ? v.players.find(p => p.id === v.winner) : null;
  const winTxt = v.final && v.final.winType === 'gammon' ? ' — Gammon ×2!'
    : v.final && v.final.winType === 'backgammon' ? ' — Backgammon ×3!'
    : v.final && v.final.winType === 'double' ? ` — thắng gấp đôi ×${v.final.cubeValue}!` : ' — ra hết 15 quân!';
  $('#round').textContent = v.phase === 'ended'
    ? (v.winner
      ? `🏁 ${winnerP ? cleanName(winnerP.name) : 'Ai đó'} thắng${winTxt}`
      : '🏁 Ván kết thúc.')
    : `🎲 Lượt của ${turnP ? cleanName(turnP.name) : '…'}${turnP && turnP.isBot ? ' 🤖' : ''} · Vòng ${v.round} · 🔴 ra ${v.players[0].off}/15 · 🔵 ra ${v.players[1].off}/15`;
  $('#status').textContent = v.phase === 'ended' ? ''
    : v.step === 'double' && v.doubleOffer
      ? `📈 ${cleanName((v.players.find(p => p.id === v.doubleOffer.by) || {}).name || '')} đề nghị gấp đôi lên ×${v.doubleOffer.value} — chờ đối thủ trả lời.`
      : v.step === 'roll'
        ? (myTurn ? 'Tới lượt bạn — bấm 🎲 Gieo xúc xắc (hoặc 📈 Gấp đôi trước khi gieo).' : 'Đang chờ đối thủ gieo xúc xắc…')
        : myTurn
          ? (meP && meP.bar > 0 ? `⚠️ Bạn có ${meP.bar} quân trên vạch — BẮT BUỘC vào lại trước (bấm quân trên vạch rồi bấm điểm vào).` : 'Tới lượt bạn — bấm 1 quân của bạn rồi bấm điểm đích.')
          : 'Đang chờ đối thủ đi…';

  /* thẻ người chơi */
  $('#players').innerHTML = v.players.map(p => {
    return `<div class="bg-player${p.id === v.turn && v.phase === 'playing' ? ' me-turn' : ''}"><span class="dot" style="background:${colorOf(v, p.id)}"></span><span class="nm">${emojiOf(v, p.id)} ${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}${p.id === v.turn && v.phase === 'playing' ? ' 👉' : ''}</span><span class="off-n">ra ${p.off}/15</span><span class="pip">pip ${p.pips}</span></div>`;
  }).join('');

  /* điểm đến khi đang chọn quân */
  let destSet = new Set();
  let offDest = false;
  if (myTurn && v.phase === 'playing' && v.step === 'move' && selFrom != null) {
    for (const d of destsFor(v, handPid, selFrom)) {
      if (d.to === 'off') offDest = true;
      else destSet.add(d.to);
    }
  }

  /* ----- bàn cờ ----- */
  $('#board').innerHTML = boardHTML(v, myTurn, handPid, destSet);

  /* ----- khay ra quân ----- */
  $('#offrow').innerHTML = v.players.map(p => {
    const idx = p.id === v.players[0].id ? 0 : 1;
    const minis = Array.from({ length: Math.min(p.off, 15) }, () => `<i class="c${idx}"></i>`).join('');
    const isDest = offDest && p.id === handPid;
    return `<div class="bg-off${isDest ? ' dest' : ''}" data-off="${p.id}"><span>${emojiOf(v, p.id)} Ra ngoài</span><span class="mini">${minis}</span><b>${p.off}/15</b>${isDest ? '<span>← bấm để ra quân</span>' : ''}</div>`;
  }).join('');

  /* ----- xúc xắc ----- */
  $('#dice').innerHTML = diceHTML(v);

  /* ----- thanh hành động ----- */
  const actionBar = $('#action-bar');
  if (v.phase === 'playing' && myTurn) {
    if (v.step === 'roll') {
      const canDouble = !v.cube.owner || v.cube.owner === handPid;
      actionBar.innerHTML = `<button class="btn big pri" id="btn-roll">🎲 Gieo xúc xắc</button>`
        + (canDouble ? `<button class="btn" id="btn-double">📈 Gấp đôi lên ×${v.cube.value * 2}</button>` : `<span class="hint">Cube ×${v.cube.value} đang thuộc về đối thủ.</span>`);
      $('#btn-roll').onclick = () => { Snd.dice(); ui.actAs(handPid, { type: 'roll' }); };
      const db = $('#btn-double');
      if (db) db.onclick = () => { Snd.double(); ui.actAs(handPid, { type: 'double' }); };
    } else if (v.step === 'double' && v.doubleOffer && v.doubleOffer.by !== handPid) {
      actionBar.innerHTML = `<span class="hint">📈 Đối thủ đề nghị gấp đôi lên ×${v.doubleOffer.value}. Chấp nhận thì cube ×${v.doubleOffer.value} về tay bạn; từ chối thì bạn thua ngay.</span>`
        + `<div class="ch-act-btns"><button class="btn pri" id="btn-accept-double">✅ Chấp nhận ×${v.doubleOffer.value}</button><button class="btn" id="btn-decline-double">❌ Từ chối (thua ngay)</button></div>`;
      $('#btn-accept-double').onclick = () => { Snd.click(); ui.actAs(handPid, { type: 'double-accept' }); };
      $('#btn-decline-double').onclick = async () => {
        const r = await confirmBox(`Từ chối gấp đôi là thua ngay với cube ×${v.cube.value}. Chắc chắn từ chối?`, { title: '❌ Từ chối gấp đôi', ok: 'Từ chối', cancel: 'Suy nghĩ lại', danger: true });
        if (r) ui.actAs(handPid, { type: 'double-decline' });
      };
    } else if (v.step === 'move') {
      const moves = legalMovesFromView(v, handPid);
      const hasMove = moves.some(m => m.type === 'move');
      if (!hasMove) {
        actionBar.innerHTML = `<span class="hint">😶 Bạn không còn nước đi nào với xúc xắc còn lại — bấm Bỏ lượt.</span>`
          + `<div class="ch-act-btns"><button class="btn pri" id="btn-pass">⏭️ Bỏ lượt</button></div>`;
        $('#btn-pass').onclick = () => { Snd.place(); ui.actAs(handPid, { type: 'pass' }); };
      } else if (selFrom != null) {
        actionBar.innerHTML = `<span class="hint">🎲 Đã chọn 1 quân — bấm <b>điểm vàng</b> để đi${offDest ? ', hoặc bấm khay <b>Ra ngoài</b> để ra quân' : ''}.</span>`
          + `<div class="ch-act-btns"><button class="btn" id="btn-deselect">✕ Bỏ chọn</button></div>`;
        $('#btn-deselect').onclick = () => { selFrom = null; Snd.hint(); render(cur, cur); };
      } else {
        actionBar.innerHTML = `<span class="hint">🎲 Tới lượt bạn — bấm 1 quân <b style="color:${colorOf(v, handPid)}">màu của bạn</b> để chọn, rồi bấm điểm đích.</span>`;
      }
    } else {
      actionBar.innerHTML = '';
    }
  } else {
    actionBar.innerHTML = '';
  }

  $('#log').innerHTML = v.log.slice().reverse().map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');

  /* âm thanh theo thay đổi state */
  if (prev && v.seq !== prev.seq && v.phase === 'playing') {
    const pPrev = id => prev.players.find(p => p.id === id);
    const pNow = id => v.players.find(p => p.id === id);
    const hit = v.players.some(p => pNow(p.id).bar > (pPrev(p.id) ? pPrev(p.id).bar : 0));
    const borne = v.players.some(p => pNow(p.id).off > (pPrev(p.id) ? pPrev(p.id).off : 0));
    if (hit) Snd.eat();
    else if (borne) Snd.bearOff();
    else if (v.step === 'double' && prev.step !== 'double') Snd.double();
    else if (v.step === 'move' && prev.step === 'roll') Snd.dice();
    else if (v.turn !== prev.turn) Snd.place();
    else Snd.place();
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
    const wt = v.final && v.final.winType === 'gammon' ? ' — Gammon ×2!'
      : v.final && v.final.winType === 'backgammon' ? ' — Backgammon ×3!'
      : v.final && v.final.winType === 'double' ? ` — thắng gấp đôi ×${v.final.cubeValue}!` : '';
    title = `🏆 ${winnerNames} thắng${wt}`;
    body = `<div class="ch-final-scores">${scores.map(s => {
      const st = sum[s.id] || { borneOff: s.score, checkersOnBar: 0, points: 0, winType: null, hits: 0, cubeValue: 1 };
      return `<div class="row ${v.winners.includes(s.id) ? 'winner' : ''}"><span>${v.winners.includes(s.id) ? '👑 ' : ''}${emojiOf(v, s.id)} ${esc(cleanName(s.name))}${s.id === v.me ? ' (bạn)' : ''}<span class="sub">${st.borneOff}/15 quân ra ngoài · pip còn ${st.points} · đánh trúng ${st.hits} lần · cube ×${st.cubeValue}${st.winType ? ' · ' + st.winType : ''}</span></span><b>${s.score}/15</b></div>`;
    }).join('')}</div>
    <p class="note">${v.endReason === 'resign' ? 'Có người xin thua nên ván dừng lại ngay.' : 'Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.'}</p>`;
  } else {
    title = '🤝 Ván kết thúc';
    body = `<div class="ch-final-scores">${scores.map(s => `<div class="row"><span>${emojiOf(v, s.id)} ${esc(cleanName(s.name))}${s.id === v.me ? ' (bạn)' : ''}</span><b>${s.score}/15</b></div>`).join('')}</div>
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

/* ---------- bấm quân / điểm trên bàn ---------- */
$('#board').addEventListener('click', e => {
  const chk = e.target.closest('[data-checker]');
  const pt = e.target.closest('[data-point]');
  if ((!chk && !pt) || !cur || cur.phase !== 'playing') return;
  const human = turnHuman(cur);
  const handPid = human ? human.id : null;
  if (!handPid || !isMyTurn(cur, handPid) || !ui.controls(handPid)) { tip('Chưa tới lượt bạn.'); return; }
  if (cur.step !== 'move') { tip(cur.step === 'roll' ? 'Bấm 🎲 Gieo xúc xắc trước đã.' : 'Đang chờ trả lời gấp đôi.'); return; }
  /* bấm quân của mình: chọn / đổi quân chọn */
  if (chk) {
    const owner = chk.dataset.pid;
    if (owner !== handPid) { tip('Đó là quân của đối thủ — chỉ được đi quân của mình.'); return; }
    const from = chk.dataset.checker === 'bar' ? 'bar' : +chk.dataset.checker;
    selFrom = (selFrom != null && String(selFrom) === String(from)) ? null : from;
    Snd.pick();
    render(cur, cur);
    return;
  }
  /* bấm điểm: đi tới điểm đó */
  if (!pt) return;
  const to = +pt.dataset.point;
  if (selFrom == null) { tip('Bấm 1 quân của bạn trước, rồi mới bấm điểm đích.'); return; }
  const dests = destsFor(cur, handPid, selFrom);
  const d = dests.find(x => x.to === to);
  if (!d) { Snd.invalid(); tip('Điểm này không đi được với xúc xắc còn lại — chỉ đi được điểm vàng.'); return; }
  Snd.place();
  ui.actAs(handPid, { type: 'move', from: selFrom, to: d.to, die: d.die });
  selFrom = null;
});

/* ---------- bấm khay ra quân ---------- */
$('#offrow').addEventListener('click', e => {
  const off = e.target.closest('[data-off]');
  if (!off || !cur || cur.phase !== 'playing') return;
  const human = turnHuman(cur);
  const handPid = human ? human.id : null;
  if (!handPid || !isMyTurn(cur, handPid) || !ui.controls(handPid)) return;
  if (cur.step !== 'move') { tip('Bấm 🎲 Gieo xúc xắc trước đã.'); return; }
  if (off.dataset.off !== handPid) { tip('Đó là khay ra quân của đối thủ.'); return; }
  if (selFrom == null) { tip('Bấm 1 quân trong sân nhà của bạn trước, rồi mới bấm khay Ra ngoài.'); return; }
  const dests = destsFor(cur, handPid, selFrom);
  const d = dests.find(x => x.to === 'off');
  if (!d) { Snd.invalid(); tip('Quân này chưa ra được với xúc xắc còn lại.'); return; }
  Snd.bearOff();
  ui.actAs(handPid, { type: 'move', from: selFrom, to: 'off', die: d.die });
  selFrom = null;
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
  const r = await confirmBox('Nhận thua trận này? Ván dừng lại ngay, đối thủ thắng.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
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
  game: 'backgammon', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
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
