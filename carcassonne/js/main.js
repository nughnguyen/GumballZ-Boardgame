// 🏰 Carcassonne – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Chắn/Tổ Tôm: chủ
// phòng giữ state, khách chỉ gửi action {type, ...}). Mỗi lượt bốc 1 lá,
// đặt khớp cạnh với lá đã có trên bàn, rồi được đặt 1 meeple lên 1 nét
// của lá vừa đặt (hoặc bỏ qua); nét hoàn thành thì tính điểm ngay.
import { createGame, applyAction, viewFor, actors, canPlaceAt, legalPlacementsFor, computeFeatures, featPoints, TILE_BY_ID, rotEdges, tileShortName } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=50';
import { gameKit, $, esc, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'carcassonne', min: 2, max: 5, maxSeats: 5, allowLocal: true,
  minMsg: 'Carcassonne cần 2–5 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: () => false,
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 700 + Math.random() * 900,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu', 'Bánh', 'Cốm'],
});

/* màu meeple theo ghế ngồi */
const PLAYER_COLORS = ['#E05D5D', '#5B8DEF', '#E8B93C', '#58B368', '#9B7EDE'];
const colorOf = (v, pid) => {
  const i = v.players.findIndex(p => p.id === pid);
  return PLAYER_COLORS[i < 0 ? 0 : i % PLAYER_COLORS.length];
};

/* ---------- vẽ 1 lá thành SVG ---------- */
/* cạnh: 0=Bắc, 1=Đông, 2=Nam, 3=Tây. Dải thành phố dọc mỗi cạnh sâu 26.
   Đường: nét từ giữa mỗi cạnh tới tâm lá. Tu viện: nhà ở giữa lá. */
const EDGE_MID = [[50, 0], [100, 50], [50, 100], [0, 50]];
const EDGE_RECT = [
  [0, 0, 100, 26], [74, 0, 26, 100], [0, 74, 100, 26], [0, 0, 26, 100],
];
const HALF_PT = [[25, 0], [75, 0], [100, 25], [100, 75], [75, 100], [25, 100], [0, 75], [0, 25]];
function tileSvg(type, rot, meeples, v) {
  const def = TILE_BY_ID[type];
  if (!def) return '';
  const rotE = e => (e + rot) % 4;
  const rotH = h => (((Math.floor(h / 2) + rot) % 4) * 2) + (h % 2);
  let s = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Lá ${esc(type)}">`;
  s += `<rect x="0" y="0" width="100" height="100" fill="#8FB573"/>`;
  /* hoa cỏ trang trí (cố định để không nhấp nháy) */
  s += `<g fill="#7FB069" opacity="0.55"><circle cx="20" cy="70" r="2.4"/><circle cx="80" cy="25" r="2.4"/><circle cx="65" cy="82" r="2.4"/></g>`;
  /* thành phố: 1 dải dọc mỗi cạnh trong đoạn; 4 cạnh thì phủ kín lá */
  for (const c of def.cities) {
    const edges = c.edges.map(rotE);
    if (edges.length >= 4) {
      s += `<rect x="0" y="0" width="100" height="100" fill="#D9B380" stroke="#8A6D4B" stroke-width="2"/>`;
    } else {
      for (const e of edges) {
        const r = EDGE_RECT[e];
        s += `<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" fill="#D9B380" stroke="#8A6D4B" stroke-width="2"/>`;
      }
    }
    /* khiên: ở giữa cạnh đầu tiên của đoạn, lùi vào trong 13 */
    if (c.shield) {
      const e = edges[0];
      const [mx, my] = EDGE_MID[e];
      const cx = e === 0 ? mx : e === 2 ? mx : e === 1 ? mx - 14 : mx + 14;
      const cy = e === 1 ? my : e === 3 ? my : e === 0 ? my + 14 : my - 14;
      s += `<path d="M ${cx - 7} ${cy - 6} L ${cx + 7} ${cy - 6} L ${cx + 7} ${cy + 1} Q ${cx + 7} ${cy + 8} ${cx} ${cy + 11} Q ${cx - 7} ${cy + 8} ${cx - 7} ${cy + 1} Z" fill="#B3232A" stroke="#FFFDF9" stroke-width="1.6"/>`;
    }
  }
  /* đường: nét từ giữa cạnh tới tâm (2 cạnh thì đi qua tâm) */
  for (const r of def.roads) {
    const edges = r.edges.map(rotE);
    const pts = edges.map(e => EDGE_MID[e]).concat([[50, 50]]);
    const d = 'M ' + pts.map(p => p[0] + ' ' + p[1]).join(' L ');
    s += `<path d="${d}" fill="none" stroke="#B8935A" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<path d="${d}" fill="none" stroke="#EFD9A0" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  /* tu viện: nhà ở giữa lá */
  if (def.cloister) {
    s += `<rect x="38" y="46" width="24" height="20" fill="#D9B380" stroke="#8A6D4B" stroke-width="2"/>`;
    s += `<path d="M 35 46 L 50 33 L 65 46 Z" fill="#B3232A" stroke="#8A6D4B" stroke-width="1.6"/>`;
    s += `<path d="M 50 26 L 50 33 M 46.5 29.5 L 53.5 29.5" stroke="#4A3E5C" stroke-width="2" stroke-linecap="round"/>`;
  }
  /* meeple trên lá */
  for (const m of (meeples || [])) {
    const color = v ? colorOf(v, m.pid) : '#E05D5D';
    let ax = 50, ay = 50;
    if (m.kind === 'city') {
      const e = rotE(def.cities[m.seg].edges[0]);
      const [mx, my] = EDGE_MID[e];
      ax = mx + (50 - mx) * 0.28; ay = my + (50 - my) * 0.28;
    } else if (m.kind === 'road') {
      const e = rotE(def.roads[m.seg].edges[0]);
      const [mx, my] = EDGE_MID[e];
      ax = mx + (50 - mx) * 0.28; ay = my + (50 - my) * 0.28;
    } else if (m.kind === 'field') {
      const halves = def.fields[m.seg].halves.map(rotH);
      let sx = 0, sy = 0;
      for (const h of halves) { sx += HALF_PT[h][0]; sy += HALF_PT[h][1]; }
      ax = sx / halves.length; ay = sy / halves.length;
      ax = ax + (50 - ax) * 0.4; ay = ay + (50 - ay) * 0.4;
    }
    const lying = m.kind === 'field' ? ' transform="rotate(90 ' + ax + ' ' + ay + ')"' : '';
    s += `<g transform="translate(${ax.toFixed(1)} ${ay.toFixed(1)})"${lying}><circle cx="0" cy="-4.5" r="3.4" fill="${color}" stroke="#FFFDF9" stroke-width="1.4"/><path d="M -6 9 L -6 1 Q -6 -2.5 0 -2.5 Q 6 -2.5 6 1 L 6 9 Z" fill="${color}" stroke="#FFFDF9" stroke-width="1.4"/></g>`;
  }
  return s + '</svg>';
}

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
let playerCount = 2; /* đấu máy: tổng số người (bạn + máy) */
try {
  const c = +localStorage.getItem('gumballz-carcassonne-count');
  if (c >= 2 && c <= 5) playerCount = c;
} catch (e) {}
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const countBtns = [...document.querySelectorAll('#count-seg [data-count]')];
function drawCount() {
  countBtns.forEach(b => { b.classList.toggle('on', +b.dataset.count === playerCount); b.setAttribute('aria-pressed', +b.dataset.count === playerCount); });
}
countBtns.forEach(b => b.addEventListener('click', () => {
  playerCount = +b.dataset.count; drawCount();
  try { localStorage.setItem('gumballz-carcassonne-count', String(playerCount)); } catch (e) {}
}));
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#count-box').style.display = (m === 'ai-easy' || m === 'ai-hard') ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'pvp' ? '👥 Mở phòng chuyền tay' : m === 'ai-easy' ? `🤖 Bắt đầu chơi với máy Dễ (${playerCount} người)` : `🧠 Bắt đầu chơi với máy Khó (${playerCount} người)`;
  try { localStorage.setItem('gumballz-carcassonne-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
drawCount();
try {
  const sm = localStorage.getItem('gumballz-carcassonne-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }
countBtns.forEach(b => b.addEventListener('click', () => setMode(mode)));

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  $('#pcount').textContent = `${n}/5 người (cần 2–5)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${i === 0 ? '<span class="seat-role">👑 Người đi đầu</span>' : ''}${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (n < 5
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  $('#opts').innerHTML = `<div class="opt"><b>🏰 Luật nhanh</b><div class="role-note">Bộ 72 lá (thành phố, đường, ruộng, tu viện). Mỗi lượt bốc 1 lá, đặt khớp cạnh với lá đã có trên bàn, rồi được đặt 1 meeple lên thành phố, đường, ruộng hoặc tu viện của lá vừa đặt. Thành phố hoàn thành 2 điểm/ô + 2/khiên, đường 1 điểm/ô, tu viện 9 điểm khi đủ 8 lá kề. Cuối ván tính ruộng 3 điểm mỗi thành phố hoàn thành chạm tới.</div></div>`;
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
    const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó bấm 👁 xem lá. Nhớ che lại trước khi đưa máy!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let handRevealed = false; /* chuyền tay: đã bấm 👁 xem lá của người tới lượt chưa */
let revealedFor = null;
let endShownFor = '';
let rot = 0;              /* góc xoay lá trên tay (0–3) */
let selCell = null;       /* ô đã chọn để đặt lá {x, y} */

function turnHuman(v) {
  if (!v || v.phase !== 'playing') return null;
  const p = v.players.find(x => x.id === v.turn);
  if (mode === 'pvp') return p && !p.isBot ? p : null;
  return v.players.find(x => x.id === v.me) || null;
}
function isMyTurn(v, pid) {
  return v && v.phase === 'playing' && v.turn === pid;
}
function stepText(v) {
  if (v.step === 'place') return '🧱 Đặt lá vừa bốc lên bàn';
  if (v.step === 'meeple') return '🧍 Đặt meeple lên lá vừa đặt (hoặc bỏ qua)';
  return '';
}
/* các lựa chọn đặt meeple trên lá vừa đặt (tính từ view — bàn cờ công khai) */
function meepleOptionsFromView(v) {
  if (!v || v.phase !== 'playing' || v.step !== 'meeple' || !v.lastPlaced) return [];
  const tile = v.board[v.lastPlaced];
  if (!tile) return [];
  const def = TILE_BY_ID[tile.type];
  if (!def) return [];
  const { byNode } = computeFeatures(v.board);
  const out = [];
  const add = (kind, seg) => {
    const f = byNode.get(v.lastPlaced + ':' + kind + ':' + seg);
    if (f && f.meeples.length === 0) out.push({ kind, seg, feat: f });
  };
  def.cities.forEach((c, i) => add('city', i));
  def.roads.forEach((r, i) => add('road', i));
  def.fields.forEach((fl, i) => add('field', i));
  if (def.cloister) add('cloister', 0);
  return out;
}
function featLabel(opt, byNode) {
  const f = opt.feat;
  if (!f) return '';
  if (f.kind === 'city') return `thành phố (${f.tiles.size} ô${f.shields ? ', ' + f.shields + ' khiên' : ''}${f.complete ? ', sắp hoàn thành' : ''})`;
  if (f.kind === 'road') return `đường (${f.tiles.size} ô${f.complete ? ', sắp hoàn thành' : ''})`;
  if (f.kind === 'cloister') return `tu viện (${f.neighbors}/8 lá kề${f.complete ? ', sắp hoàn thành' : ''})`;
  if (f.kind === 'field') {
    const done = new Set();
    for (const nodeId of f.citySegs) {
      const cf = byNode.get(nodeId);
      if (cf && cf.complete) done.add(cf.id);
    }
    return `ruộng (chạm ${done.size} thành phố hoàn thành)`;
  }
  return '';
}
const ROLE_NAME = { city: '🏰 Hiệp sĩ', road: '🛣️ Kẻ cướp đường', field: '🧑‍🌾 Nông dân', cloister: '⛪ Tu sĩ', monastery: '⛪ Tu sĩ' };

function render(v, prev) {
  cur = v;
  if (!v) { handRevealed = false; revealedFor = null; endShownFor = ''; rot = 0; selCell = null; return; }
  const me = v.players.find(p => p.id === v.me) || {};
  const turnP = v.players.find(p => p.id === v.turn);
  const human = turnHuman(v);
  const handPid = human ? human.id : null;
  /* đổi lượt thì bỏ lựa chọn cũ + chuyền tay che lá lại */
  if (prev && (v.turnCount !== prev.turnCount || v.phase !== prev.phase)) { selCell = null; rot = 0; }
  if (mode === 'pvp' && revealedFor && (!human || revealedFor !== human.id)) { handRevealed = false; revealedFor = null; }

  const winnerP = v.winner ? v.players.find(p => p.id === v.winner) : null;
  $('#round').textContent = v.phase === 'ended'
    ? (v.winner
      ? `🏁 ${winnerP ? cleanName(winnerP.name) : 'Ai đó'} thắng với ${winnerP ? winnerP.score : '?'} điểm!`
      : '🏁 Ván kết thúc.')
    : `🏰 Lượt của ${turnP ? cleanName(turnP.name) : '…'}${turnP && turnP.isBot ? ' 🤖' : ''} · 🧱 chồng còn ${v.stackCount} lá${v.discarded.length ? ` · 🗑️ đã loại ${v.discarded.length} lá` : ''} · ${stepText(v)}`;
  $('#status').innerHTML = v.players.map((p, i) => {
    return `<span class="stat ${p.id === v.me ? 'me' : ''} ${p.id === v.turn && v.phase === 'playing' ? 'turn' : ''}"><span class="dot" style="background:${PLAYER_COLORS[i % PLAYER_COLORS.length]}"></span>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}${p.id === v.turn && v.phase === 'playing' ? ' 👉 tới lượt' : ''}: <b>${p.score} điểm</b> · 🧍 ${p.supply} meeple</span>`;
  }).join('');

  /* ----- bàn cờ ----- */
  const keys = Object.keys(v.board);
  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  for (const k of keys) {
    const [x, y] = k.split(',').map(Number);
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  minX--; maxX++; minY--; maxY++;
  const cols = maxX - minX + 1;
  const myTurn = handPid && isMyTurn(v, handPid) && ui.controls(handPid);
  const canPlaceHere = (x, y) => v.phase === 'playing' && v.step === 'place' && v.hand && myTurn && canPlaceAt(v.board, v.hand, x, y, rot);
  let boardHtml = '';
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const k = x + ',' + y;
      const t = v.board[k];
      if (t) {
        boardHtml += `<div class="ca-cell tile${k === v.lastPlaced ? ' last' : ''}" data-x="${x}" data-y="${y}">${tileSvg(t.type, t.rot, t.meeples, v)}</div>`;
      } else {
        const placeable = canPlaceHere(x, y);
        const sel = selCell && selCell.x === x && selCell.y === y;
        boardHtml += `<div class="ca-cell ${placeable ? 'placeable' : 'empty'}${sel ? ' selected' : ''}" data-x="${x}" data-y="${y}"></div>`;
      }
    }
  }
  const boardEl = $('#board');
  boardEl.style.gridTemplateColumns = `repeat(${cols}, 72px)`;
  boardEl.innerHTML = boardHtml;

  /* ----- lá trên tay ----- */
  const cover = mode === 'pvp' && v.phase === 'playing' && human && !handRevealed;
  $('#hand-cover').style.display = cover ? '' : 'none';
  $('#hand').style.display = cover ? 'none' : '';
  $('#btn-reveal-hand').textContent = human ? `👁 Xem lá của ${cleanName(human.name)}` : '👁 Xem lá của bạn';
  const handEl = $('#hand');
  if (v.phase === 'ended') {
    handEl.innerHTML = '<p class="note">Ván đã kết thúc — xem điểm cuối ván ở dưới.</p>';
  } else if (!v.hand) {
    handEl.innerHTML = `<p class="note">${turnP ? `⏳ Đang chờ ${esc(cleanName(turnP.name))} đi…` : 'Đang chờ chia bài…'}</p>`;
  } else if (!myTurn) {
    handEl.innerHTML = `<div class="ca-tile-big">${tileSvg(v.hand, 0, [], v)}</div><div class="ca-hand-info">Lá của ${turnP ? esc(cleanName(turnP.name)) : 'người tới lượt'}<span class="sub">Bạn chỉ xem được lá khi tới lượt mình.</span></div>`;
  } else {
    const placeableCount = legalPlacementsFor(v.board, v.hand).length;
    const selOk = selCell && canPlaceAt(v.board, v.hand, selCell.x, selCell.y, rot);
    handEl.innerHTML = `<div class="ca-tile-big">${tileSvg(v.hand, rot, [], v)}</div>
      <div class="ca-hand-info">Lá của bạn: <b>${esc(tileShortName(v.hand))}</b>
        <span class="sub">Bấm 1 ô xanh trên bàn để chọn chỗ đặt, bấm ⟳ để xoay lá.</span>
        <span class="sub">Còn ${placeableCount} chỗ đặt được (mọi góc xoay).</span>
      </div>
      <button class="btn" id="btn-rotate">⟳ Xoay lá</button>
      <button class="btn pri" id="btn-place" ${selOk ? '' : 'disabled'}>✅ Đặt lá${selCell ? ` ở (${selCell.x}, ${selCell.y})` : ''}</button>`;
    const br = $('#btn-rotate');
    if (br) br.onclick = () => { rot = (rot + 1) % 4; Snd.hint(); render(cur, cur); };
    const bp = $('#btn-place');
    if (bp) bp.onclick = () => {
      if (!selCell) return;
      Snd.place(); ui.actAs(handPid, { type: 'place', x: selCell.x, y: selCell.y, rot });
    };
  }

  /* ----- thanh đặt meeple ----- */
  const actionBar = $('#action-bar');
  if (v.phase === 'playing' && v.step === 'meeple' && myTurn) {
    const opts = meepleOptionsFromView(v);
    const meP = v.players.find(p => p.id === handPid);
    const { byNode } = computeFeatures(v.board);
    let html = `<span class="hint">Đặt meeple lên lá vừa đặt?</span>`;
    if (!meP || meP.supply <= 0) {
      html += `<span class="note">Bạn đã hết meeple trong kho.</span>`;
    } else if (!opts.length) {
      html += `<span class="note">Mọi nét trên lá này đều đã có meeple.</span>`;
    } else {
      for (const o of opts) {
        const kind = o.kind === 'cloister' ? 'monastery' : o.kind;
        html += `<button class="btn" data-kind="${kind}" data-seg="${o.seg}">${ROLE_NAME[o.kind]} — ${esc(featLabel(o, byNode))}</button>`;
      }
    }
    html += `<button class="btn pri" id="btn-skip-meeple">⏭ Bỏ qua (không đặt meeple)</button>`;
    actionBar.style.display = '';
    actionBar.innerHTML = html;
    actionBar.querySelectorAll('[data-kind]').forEach(b => {
      b.onclick = () => { Snd.eat(); ui.actAs(handPid, { type: 'meeple', kind: b.dataset.kind, seg: +b.dataset.seg }); };
    });
    const bs = $('#btn-skip-meeple');
    if (bs) bs.onclick = () => { Snd.place(); ui.actAs(handPid, { type: 'skip' }); };
  } else {
    actionBar.style.display = 'none';
    actionBar.innerHTML = '';
  }

  $('#log').innerHTML = v.log.slice().reverse().map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');

  /* âm thanh + hộp kết thúc */
  if (prev && v.phase === 'playing' && prev.phase === 'playing') {
    if (v.turn !== prev.turn) Snd.place();
    else if (v.lastScore && v.lastScore.length) Snd.eat();
  }
  if (v.phase === 'ended') {
    const key = v.gid + ':' + v.seq;
    if (endShownFor !== key) { endShownFor = key; showEnd(v); }
    if (v.winners && v.winners.includes(v.me)) Snd.winJingle(); else if (prev && prev.phase !== 'ended') Snd.lose();
  }
}

/* ---------- hộp kết thúc ---------- */
function showEnd(v) {
  const scores = (v.final && v.final.scores ? v.final.scores.slice() : v.players.map(p => ({ id: p.id, name: p.name, score: p.score })))
    .sort((a, b) => b.score - a.score);
  const winnerNames = v.winners.map(id => {
    const p = v.players.find(x => x.id === id);
    return p ? cleanName(p.name) : 'Ai đó';
  }).join(' + ');
  const fields = (v.final && v.final.fields) || [];
  let title, body;
  if (v.winners.length) {
    title = `🏆 ${winnerNames} thắng!`;
    body = `<div class="ca-final-scores">${scores.map(s => `<div class="row ${v.winners.includes(s.id) ? 'winner' : ''}"><span>${v.winners.includes(s.id) ? '👑 ' : ''}${esc(cleanName(s.name))}${s.id === v.me ? ' (bạn)' : ''}</span><b>${s.score} điểm</b></div>`).join('')}</div>
    ${fields.length ? `<p class="note">🌾 Ruộng cuối ván: ${fields.map(f => `${f.owners.map(id => { const p = v.players.find(x => x.id === id); return p ? esc(cleanName(p.name)) : ''; }).join(' + ')} +${f.points} điểm (${f.cities} thành phố)`).join(' · ')}</p>` : ''}
    <p class="note">${v.endReason === 'resign' ? 'Có người xin thua nên ván dừng lại — tính điểm cuối ván rồi chọn người cao điểm nhất trong số người còn lại.' : 'Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.'}</p>`;
  } else {
    title = '🤝 Ván kết thúc';
    body = `<div class="ca-final-scores">${scores.map(s => `<div class="row"><span>${esc(cleanName(s.name))}${s.id === v.me ? ' (bạn)' : ''}</span><b>${s.score} điểm</b></div>`).join('')}</div>
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

/* ---------- bấm ô trên bàn: chọn chỗ đặt lá ---------- */
$('#board').addEventListener('click', e => {
  const el = e.target.closest('.ca-cell'); if (!el || !cur || cur.phase !== 'playing') return;
  const human = turnHuman(cur);
  const handPid = human ? human.id : null;
  if (!handPid || !isMyTurn(cur, handPid) || !ui.controls(handPid)) { tip('Chưa tới lượt bạn.'); return; }
  if (cur.step !== 'place' || !cur.hand) { tip('Lúc này chưa đặt lá được.'); return; }
  const x = +el.dataset.x, y = +el.dataset.y;
  if (cur.board[x + ',' + y]) { tip('Ô này đã có lá rồi.'); return; }
  if (!canPlaceAt(cur.board, cur.hand, x, y, rot)) { Snd.invalid(); tip('Lá này không khớp ở ô đó với góc xoay hiện tại — thử xoay lá (⟳) hoặc chọn ô khác.'); return; }
  selCell = { x, y };
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
  const r = await confirmBox('Nhận thua trận này? Ván dừng lại ngay, tính điểm cuối ván rồi chọn người cao điểm nhất trong số người còn lại.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
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
  game: 'carcassonne', net: NET,
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
