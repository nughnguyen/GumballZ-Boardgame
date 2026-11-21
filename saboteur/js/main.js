// 😈 Saboteur – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Lấy 6: chủ
// phòng giữ state, khách chỉ gửi action {type, ...}). Mỗi lượt chỉ 1
// người đi; vai trò và bài trên tay là bí mật — chơi chuyền tay thì
// từng người bấm 👁 xem bài/vai trò rồi đi, đi xong che lại.
import { createGame, applyAction, viewFor, actors, canPlace, cardKind, isPath, isDeadEnd, exitsOf } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'saboteur', min: 3, max: 10, maxSeats: 10, allowLocal: true,
  minMsg: 'Saboteur cần 3–10 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
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
  const c = +localStorage.getItem('gumballz-saboteur-count');
  if (c >= 3 && c <= 10) playerCount = c;
} catch (e) {}
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const countBtns = [...document.querySelectorAll('#count-seg [data-count]')];
function drawCount() {
  countBtns.forEach(b => { b.classList.toggle('on', +b.dataset.count === playerCount); b.setAttribute('aria-pressed', +b.dataset.count === playerCount); });
}
countBtns.forEach(b => b.addEventListener('click', () => {
  playerCount = +b.dataset.count; drawCount();
  try { localStorage.setItem('gumballz-saboteur-count', String(playerCount)); } catch (e) {}
}));
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#count-box').style.display = (m === 'ai-easy' || m === 'ai-hard') ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'pvp' ? '👥 Mở phòng chuyền tay' : m === 'ai-easy' ? `🤖 Bắt đầu chơi với máy Dễ (${playerCount} người)` : `🧠 Bắt đầu chơi với máy Khó (${playerCount} người)`;
  try { localStorage.setItem('gumballz-saboteur-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
drawCount();
try {
  const sm = localStorage.getItem('gumballz-saboteur-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }
// đổi số người thì cập nhật chữ nút Bắt đầu
countBtns.forEach(b => b.addEventListener('click', () => setMode(mode)));

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  $('#pcount').textContent = `${n}/10 người (cần 3–10)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${i === 0 ? '<span class="seat-role">👑 Đi trước</span>' : ''}${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (n < 10
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  $('#opts').innerHTML = `<div class="opt"><b>😈 Vai trò bí mật</b><div class="role-note">3–4 người: 1 kẻ phá hoại; 5–9 người: 2; 10 người: 3. Còn lại đều là thợ đào. Vai trò chia lại mỗi vòng; kẻ phá hoại cũng không biết đồng bọn là ai.</div></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = n < 3 || n > 10;
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
    const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó bấm 👁 xem bài và vai trò. Nhớ che lại trước khi đưa máy!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let selCard = null; /* lá đang chọn trên tay */
let selRotated = false; /* lá đường đang chọn có xoay 180° không */
let handRevealed = false; /* chuyền tay: đã bấm 👁 xem bài của người tới lượt chưa */
let revealedFor = null;
let roleRevealed = false; /* đã bấm 👁 xem vai trò của người tới lượt chưa */
let roleFor = null;
let endShownFor = '';

const TOOL_NAME = { pickaxe: 'Cuốc', lamp: 'Đèn', cart: 'Xe đẩy' };
const DIR_VN = { N: 'Bắc', E: 'Đông', S: 'Nam', W: 'Tây' };

/* sơ đồ đường của 1 lá: vạch từ tâm ra các cửa mở */
function pathSvg(exits) {
  const pts = { N: [50, 2], E: [98, 50], S: [50, 98], W: [2, 50] };
  const lines = exits.map(d => {
    const [x, y] = pts[d];
    return `<line x1="50" y1="50" x2="${x}" y2="${y}" stroke="#8a6d3b" stroke-width="15" stroke-linecap="round"/>`;
  }).join('');
  const core = exits.length === 1
    ? `<circle cx="50" cy="50" r="11" fill="#b3232a"/>`
    : `<circle cx="50" cy="50" r="9" fill="#8a6d3b"/>`;
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${lines}${core}</svg>`;
}
function pathName(exits) {
  if (exits.length === 1) return 'Lá cụt';
  if (exits.length === 2) {
    const s = exits.slice().sort().join('');
    return (s === 'NS' || s === 'EW') ? 'Đường thẳng' : 'Đường cong';
  }
  if (exits.length === 3) return 'Ngã ba';
  return 'Ngã tư';
}
function actionInfo(kind) {
  const map = {
    'map': ['🗺️', 'Bản đồ', 'Xem 1 lá đích'],
    'rockfall': ['💥', 'Đá rơi', 'Phá 1 lá đường'],
    'break-pickaxe': ['🔨', 'Phá Cuốc', 'Phá Cuốc 1 người'],
    'break-lamp': ['🔨', 'Phá Đèn', 'Phá Đèn 1 người'],
    'break-cart': ['🔨', 'Phá Xe đẩy', 'Phá Xe đẩy 1 người'],
    'repair-pickaxe': ['🔧', 'Sửa Cuốc', 'Sửa Cuốc 1 người'],
    'repair-lamp': ['🔧', 'Sửa Đèn', 'Sửa Đèn 1 người'],
    'repair-cart': ['🔧', 'Sửa Xe đẩy', 'Sửa Xe đẩy 1 người'],
    'repair-pickaxe-lamp': ['🔧', 'Sửa Cuốc + Đèn', 'Sửa 2 dụng cụ'],
    'repair-lamp-cart': ['🔧', 'Sửa Đèn + Xe', 'Sửa 2 dụng cụ'],
    'repair-pickaxe-cart': ['🔧', 'Sửa Cuốc + Xe', 'Sửa 2 dụng cụ'],
  };
  return map[kind] || ['🃏', kind, 'Lá hành động'];
}
function cardHtml(card, opts = {}) {
  const rotated = !!opts.rotated;
  if (isPath(card)) {
    const ex = exitsOf(card, rotated);
    const dead = isDeadEnd(card);
    return `<div class="sb-card ${dead ? 'dead' : ''} ${opts.sel ? 'sel' : ''} ${opts.cant ? 'cant' : ''}" data-card="${card}">
      ${pathSvg(ex)}
      <span class="sb-card-name">${pathName(ex)}${dead ? ' ⚠️' : ''}</span>
      <span class="sb-card-sub">${ex.map(d => DIR_VN[d]).join(' · ')}</span>
    </div>`;
  }
  const kind = cardKind(card);
  const [ic, name, sub] = actionInfo(kind);
  const cls = kind === 'map' ? 'map' : kind === 'rockfall' ? 'rock' : '';
  return `<div class="sb-card action ${cls} ${opts.sel ? 'sel' : ''} ${opts.cant ? 'cant' : ''}" data-card="${card}">
    <span class="sb-card-ic">${ic}</span>
    <span class="sb-card-name">${name}</span>
    <span class="sb-card-sub">${sub}</span>
  </div>`;
}

/* tay bài / vai trò của 1 người: chuyền tay (host) thì lấy từ state gốc */
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
function roleOf(v, pid) {
  if (mode === 'pvp') {
    const s = rawState();
    const p = s && s.players.find(x => x.id === pid);
    if (p) return p.role;
  }
  const p = v.players.find(x => x.id === pid);
  return p ? p.role : null;
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
function hasBroken(v, pid) {
  const p = v.players.find(x => x.id === pid);
  return !!(p && (p.tools.pickaxe || p.tools.lamp || p.tools.cart));
}
/* ô (x,y) có đặt được lá đường đang chọn không — dùng đúng hàm kiểm tra
   của engine trên view (view có đủ board/goals/phase) */
function canPlaceHere(v, card, x, y, rotated) {
  return canPlace(v, card, x, y, rotated);
}
/* mục tiêu hợp lệ của lá phá/sửa đang chọn */
function legalTarget(v, card, pid) {
  const kind = cardKind(card);
  const t = v.players.find(x => x.id === pid);
  if (!t) return false;
  if (kind.startsWith('break-')) {
    const tool = kind.slice(6);
    return !t.tools[tool];
  }
  if (kind.startsWith('repair-')) {
    const tools = kind.slice(7).split('-');
    return tools.some(tl => t.tools[tl]);
  }
  return false;
}

function render(v, prev) {
  cur = v;
  if (!v) { handRevealed = false; revealedFor = null; roleRevealed = false; roleFor = null; endShownFor = ''; selCard = null; selRotated = false; return; }
  const me = v.players.find(p => p.id === v.me) || {};
  const turnP = v.players.find(p => p.id === v.turn);
  const human = turnHuman(v);
  const handPid = human ? human.id : null;
  /* chuyền tay: đổi người thì che bài + che vai trò lại */
  if (mode === 'pvp' && revealedFor && (!human || revealedFor !== human.id)) { handRevealed = false; revealedFor = null; }
  if (mode === 'pvp' && roleFor && (!human || roleFor !== human.id)) { roleRevealed = false; roleFor = null; }

  $('#round').textContent = v.phase === 'ended'
    ? `🏁 Trận đã kết thúc — ${v.winner ? cleanName((v.players.find(p => p.id === v.winner) || {}).name) + ' thắng trận!' : 'không có người thắng.'}`
    : `😈 Vòng ${v.round}/3 · lượt của ${turnP ? cleanName(turnP.name) : '…'}${turnP && turnP.isBot ? ' 🤖' : ''} · 🃏 bài còn ${v.deckCount} lá · 🥇 vàng còn ${v.goldDeckCount} lá`;
  $('#status').innerHTML = v.players.map(p => {
    return `<span class="stat ${p.id === v.me ? 'me' : ''}">${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}: <b>🥇 ${p.gold}</b> · 🃏 ${p.goldCards} lá vàng</span>`;
  }).join('');

  /* ----- hộp vai trò bí mật ----- */
  const roleBox = $('#role-box');
  if (v.phase === 'playing' && human) {
    const role = roleOf(v, human.id);
    const who = mode === 'pvp' ? cleanName(human.name) : 'bạn';
    if (roleRevealed && roleFor === human.id && role) {
      const txt = role === 'digger' ? '⛏️ Thợ đào vàng' : '😈 Kẻ phá hoại';
      const cls = role === 'digger' ? 'digger' : 'sab';
      const hint = role === 'digger'
        ? 'Mở đường thẳng về đích chưa lộ gần nhất, dùng Bản đồ khi còn 2–3 đích chưa biết.'
        : 'Chặn đường bằng lá cụt, phá Cuốc của người đang xây — nhưng đừng lộ quá sớm!';
      roleBox.innerHTML = `<span>🎭 Vai trò của ${who}:</span><span class="role-val ${cls}">${txt}</span><span class="note">${hint}</span><button class="chip" id="btn-hide-role">🙈 Che lại</button>`;
      $('#btn-hide-role').onclick = () => { roleRevealed = false; roleFor = null; render(cur, cur); };
    } else {
      roleBox.innerHTML = `<span>🎭 Vai trò của ${who}: <b>bí mật</b></span><button class="chip" id="btn-show-role">👁 Xem vai trò</button><span class="note">Chỉ ${who} được xem — đừng để người khác nhìn thấy màn hình!</span>`;
      $('#btn-show-role').onclick = () => { roleRevealed = true; roleFor = human.id; Snd.pick(); render(cur, cur); };
    }
  } else if (v.phase === 'ended') {
    roleBox.innerHTML = v.players.map(p => {
      const r = (v.players.find(x => x.id === p.id) || {}).role;
      return `<span>${esc(cleanName(p.name))}: ${r === 'digger' ? '⛏️ Thợ đào' : r === 'saboteur' ? '😈 Kẻ phá hoại' : '?'}</span>`;
    }).join(' · ');
  } else {
    roleBox.innerHTML = `<span class="note">Đang chờ lượt của người chơi…</span>`;
  }

  /* ----- bàn đường hầm ----- */
  const selKind = selCard ? (isPath(selCard) ? 'path' : cardKind(selCard)) : null;
  const myTurn = handPid && isMyTurn(v, handPid) && ui.controls(handPid);
  const broken = handPid ? hasBroken(v, handPid) : false;
  const boardEl = $('#board');
  let html = '';
  for (let y = -4; y <= 4; y++) {
    for (let x = -9; x <= 2; x++) {
      const key = x + ',' + y;
      if (x === 0 && y === 0) {
        html += `<div class="sb-cell sb-start" data-x="${x}" data-y="${y}" title="Lá Bắt đầu"><span class="sb-start-ic">🪜</span></div>`;
        continue;
      }
      const gi = v.goals.findIndex(g => g.x === x && g.y === y);
      if (gi >= 0) {
        const g = v.goals[gi];
        const isMapTarget = myTurn && selKind === 'map' && !g.revealed;
        let ic = '❓', cls = '';
        if (g.revealed) { ic = g.kind === 'gold' ? '🥇' : '⚫'; cls = g.kind === 'gold' ? 'gold' : 'coal'; }
        else if (g.peeked) { ic = g.kind === 'gold' ? '🥇' : '⚫'; cls = 'peeked'; }
        html += `<div class="sb-cell sb-goal ${cls} ${isMapTarget ? 'mapable' : ''}" data-x="${x}" data-y="${y}" data-goal="${gi}" title="${g.revealed ? (g.kind === 'gold' ? 'Đích vàng (đã lộ)' : 'Đích than (đã lộ)') : g.peeked ? 'Đích bạn đã xem bằng Bản đồ' : 'Lá đích chưa lộ'}"><span class="sb-goal-ic">${ic}</span>${g.peeked && !g.revealed ? '<span class="sb-peek-tag">👁</span>' : ''}</div>`;
        continue;
      }
      const cell = v.board[key];
      if (cell) {
        const ex = exitsOf(cell.card, cell.rotated);
        const dead = isDeadEnd(cell.card);
        const rockable = myTurn && selKind === 'rockfall';
        html += `<div class="sb-cell sb-placed ${dead ? 'dead' : ''} ${rockable ? 'rockable' : ''}" data-x="${x}" data-y="${y}" title="Lá đường ${pathName(ex)}">${pathSvg(ex)}</div>`;
        continue;
      }
      const placeable = myTurn && selKind === 'path' && !broken && canPlaceHere(v, selCard, x, y, selRotated);
      html += `<div class="sb-cell ${placeable ? 'placeable' : ''}" data-x="${x}" data-y="${y}"></div>`;
    }
  }
  boardEl.innerHTML = html;

  /* ----- danh sách người chơi ----- */
  $('#players').innerHTML = v.players.map(p => {
    const isTurn = p.id === v.turn && v.phase === 'playing';
    const targetable = myTurn && selCard && (cardKind(selCard).startsWith('break-') || cardKind(selCard).startsWith('repair-')) && legalTarget(v, selCard, p.id);
    const tools = ['pickaxe', 'lamp', 'cart'].map(t => {
      const ic = t === 'pickaxe' ? '⛏️' : t === 'lamp' ? '💡' : '🛒';
      return p.tools[t] ? `<span class="broken">${ic} ${TOOL_NAME[t]} hỏng</span>` : '';
    }).filter(Boolean).join(' · ');
    return `<div class="sb-player ${p.id === v.me ? 'me' : ''} ${isTurn ? 'turn' : ''} ${targetable ? 'targetable' : ''}" data-pid="${p.id}">
      ${avatar(p.name, 40)}
      <div class="sb-pinfo">
        <b>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === v.me ? ' (bạn)' : ''}${p.id === v.winner ? ' 👑' : ''}${isTurn ? ' 👉 tới lượt' : ''}</b>
        <span class="sb-ptotal">🥇 ${p.gold} cốm · 🃏 ${p.goldCards} lá vàng</span>
        <span class="sb-pmeta">${p.handCount} lá trên tay · ${p.role && v.phase === 'ended' ? (p.role === 'digger' ? '⛏️ Thợ đào' : '😈 Kẻ phá hoại') : ''}</span>
        <span class="sb-tools">${tools || '<span class="ok">✅ Dụng cụ đủ</span>'}</span>
      </div>
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
      $('#hand').innerHTML = `<div class="sb-hand-label">${canControl ? `Bài của ${handName} — bấm 1 lá để chọn:` : 'Bài trên tay:'}</div>` + hand.map(c => cardHtml(c, { sel: c === selCard, cant: !canControl, rotated: c === selCard ? selRotated : false })).join('');
    }
  }

  /* ----- thanh hành động khi đã chọn 1 lá ----- */
  const bar = $('#action-bar');
  if (selCard && myTurn) {
    let hint = '', extra = '';
    if (isPath(selCard)) {
      if (broken) hint = '⚠️ Dụng cụ của bạn đang hỏng — không đặt được lá đường. Hãy sửa dụng cụ hoặc bỏ lá này.';
      else hint = 'Bấm 1 ô sáng trên bàn để đặt lá (chỉ ô nối được với đường mới sáng). Bấm 🔄 để xoay lá 180° trước khi đặt.';
      extra = broken ? '' : `<button class="btn" id="btn-rotate">🔄 Xoay 180°</button>`;
    } else if (selKind === 'map') {
      hint = 'Bấm 1 lá đích chưa lộ trên bàn (viền tím) để xem — chỉ mình bạn biết!';
    } else if (selKind === 'rockfall') {
      hint = 'Bấm 1 lá đường trên bàn (viền đỏ) để phá — không phá được lá Bắt đầu hay lá đích.';
    } else if (selKind.startsWith('break-')) {
      hint = `Bấm 1 người chơi bên dưới (viền đỏ) để phá ${TOOL_NAME[selKind.slice(6)]} của họ.`;
    } else if (selKind.startsWith('repair-')) {
      const tools = selKind.slice(7).split('-').map(t => TOOL_NAME[t]).join(' + ');
      hint = `Bấm 1 người chơi bên dưới (viền đỏ) để sửa ${tools} cho họ.`;
    }
    bar.style.display = '';
    bar.innerHTML = `<span class="hint">${hint}</span>${extra}<button class="btn" id="btn-discard-sel">🗑️ Bỏ lá này</button><button class="btn" id="btn-cancel-sel">✕ Hủy chọn</button>`;
    const rot = $('#btn-rotate'); if (rot) rot.onclick = () => { selRotated = !selRotated; Snd.pick(); render(cur, cur); };
    $('#btn-discard-sel').onclick = () => { const c = selCard; selCard = null; selRotated = false; Snd.pick(); ui.actAs(handPid, { type: 'discard', card: c }); };
    $('#btn-cancel-sel').onclick = () => { selCard = null; selRotated = false; render(cur, cur); };
  } else {
    bar.style.display = 'none';
    bar.innerHTML = '';
  }

  $('#log').innerHTML = v.log.slice().reverse().map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');

  /* âm thanh + hộp kết thúc */
  if (prev && v.phase === 'playing' && prev.phase === 'playing') {
    if (v.turn !== prev.turn) Snd.hint();
    else if (Object.keys(v.board).length > Object.keys(prev.board).length) Snd.place();
    else if (v.roundWinners && !prev.roundWinners) Snd.place();
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
  const rows = [...v.players].sort((a, b) => b.gold - a.gold || b.goldCards - a.goldCards).map(p =>
    `<tr><td>${esc(cleanName(p.name))}${p.id === v.winner ? ' 👑' : ''}${p.id === v.me ? ' (bạn)' : ''}</td><td>🥇 ${p.gold}</td><td>🃏 ${p.goldCards} lá</td><td>${p.role === 'digger' ? '⛏️ Thợ đào' : p.role === 'saboteur' ? '😈 Kẻ phá hoại' : ''}</td></tr>`).join('');
  const body = `<table style="width:100%;border-collapse:collapse;font-size:14px;text-align:center"><tr><th style="text-align:left">Người chơi</th><th>Vàng</th><th>Lá vàng</th><th>Vai trò</th></tr>${rows}</table><p class="note">${v.winner === v.me ? 'Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.' : 'Chơi 1 ván +2 xu.'}</p>`;
  const btns = ui.isHost
    ? `<button class="btn big pri" id="m-again">🔁 Ván mới</button><button class="btn" id="m-lobby">Về phòng chờ</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`
    : `<button class="btn big pri" id="m-close">Đóng</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`;
  ui.openModal(`<h2>${title}</h2>${body}<div class="btns">${btns}</div>`, 'lock');
  const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); ui.net.raw.start(); };
  const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); ui.net.raw.restart(); };
  const home = $('#m-home'); if (home) home.onclick = () => { ui.closeModal(); ui.leave(); };
  const close = $('#m-close'); if (close) close.onclick = ui.closeModal;
}

/* ---------- chọn lá trên tay: bấm 1 lá là chọn, bấm lại là hủy ---------- */
$('#hand').addEventListener('click', e => {
  const el = e.target.closest('.sb-card'); if (!el || !cur || cur.phase !== 'playing') return;
  const human = turnHuman(cur);
  const handPid = human ? human.id : null;
  if (!handPid || !isMyTurn(cur, handPid) || !ui.controls(handPid)) { tip('Chưa tới lượt bạn.'); return; }
  const card = el.dataset.card;
  if (selCard === card) { selCard = null; selRotated = false; }
  else { selCard = card; selRotated = false; }
  Snd.pick();
  render(cur, cur);
});
/* ---------- bấm ô trên bàn: đặt lá đường / đá rơi / bản đồ ---------- */
$('#board').addEventListener('click', e => {
  const cell = e.target.closest('.sb-cell'); if (!cell || !cur || cur.phase !== 'playing') return;
  const human = turnHuman(cur);
  const handPid = human ? human.id : null;
  if (!handPid || !isMyTurn(cur, handPid) || !ui.controls(handPid)) { tip('Chưa tới lượt bạn.'); return; }
  if (!selCard) { tip('Bấm 1 lá trên tay để chọn trước.'); return; }
  const x = +cell.dataset.x, y = +cell.dataset.y;
  if (isPath(selCard)) {
    if (hasBroken(cur, handPid)) { tip('Dụng cụ của bạn đang hỏng — sửa trước mới đặt được lá đường.'); Snd.invalid(); return; }
    if (!canPlaceHere(cur, selCard, x, y, selRotated)) { tip('Không đặt được lá này ở đây (không nối với đường hoặc cửa không khớp).'); Snd.invalid(); return; }
    const c = selCard, r = selRotated;
    selCard = null; selRotated = false;
    Snd.place();
    ui.actAs(handPid, { type: 'play-path', card: c, x, y, rotated: r });
    return;
  }
  const kind = cardKind(selCard);
  if (kind === 'rockfall') {
    if (!cur.board[x + ',' + y]) { tip('Ô này không có lá đường nào để phá.'); Snd.invalid(); return; }
    const c = selCard;
    selCard = null; selRotated = false;
    Snd.wrong();
    ui.actAs(handPid, { type: 'play-action', card: c, x, y });
    return;
  }
  if (kind === 'map') {
    const gi = cell.dataset.goal !== undefined && cell.dataset.goal !== '' ? +cell.dataset.goal : -1;
    if (gi < 0) { tip('Bản đồ chỉ xem được lá đích — bấm 1 lá đích chưa lộ trên bàn.'); Snd.invalid(); return; }
    if (cur.goals[gi].revealed) { tip('Lá đích này đã lộ rồi.'); Snd.invalid(); return; }
    const c = selCard;
    selCard = null; selRotated = false;
    Snd.pick();
    ui.actAs(handPid, { type: 'play-action', card: c, goal: gi });
    return;
  }
  tip('Lá này dùng bằng cách bấm 1 người chơi (phá/sửa dụng cụ) hoặc nút 🗑️ để bỏ.');
});
/* ---------- bấm người chơi: phá / sửa dụng cụ ---------- */
$('#players').addEventListener('click', e => {
  const el = e.target.closest('.sb-player'); if (!el || !cur || cur.phase !== 'playing') return;
  if (!selCard) return;
  const kind = cardKind(selCard);
  if (!kind.startsWith('break-') && !kind.startsWith('repair-')) return;
  const human = turnHuman(cur);
  const handPid = human ? human.id : null;
  if (!handPid || !isMyTurn(cur, handPid) || !ui.controls(handPid)) { tip('Chưa tới lượt bạn.'); return; }
  const target = el.dataset.pid;
  if (!legalTarget(cur, selCard, target)) { tip('Không dùng được lá này cho người đó.'); Snd.invalid(); return; }
  const c = selCard;
  selCard = null; selRotated = false;
  Snd.pick();
  ui.actAs(handPid, { type: 'play-action', card: c, target });
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
  const r = await confirmBox('Nhận thua trận này? Trận kết thúc ngay, người còn lại nhiều vàng nhất thắng.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
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
  game: 'saboteur', net: NET,
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
