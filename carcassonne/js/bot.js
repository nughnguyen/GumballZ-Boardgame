// 🏰 Bot Carcassonne — chỉ dùng viewFor (không bao giờ đọc state thô).
// - Dễ: 70% nước bừa, 30% nước tốt.
// - Khó: với mỗi vị trí đặt lá, dựng lại bàn cờ từ view (thông tin công
//   khai) rồi tính điểm: hoàn thành nét nào (đường/thành phố/tu viện),
//   đặt meeple lên nét nào có giá trị nhất (thành phố lớn, tu viện, ruộng
//   chạm thành phố hoàn thành), tránh "nuôi" điểm cho đối thủ, giữ meeple
//   khi kho sắp cạn. Bot không biết thứ tự chồng lá (chỉ biết số lá còn).
import {
  viewFor, legalMoves, computeFeatures, featPoints, TILE_BY_ID,
} from './engine.js';

export function botAction(s, pid, level) {
  if (!s || s.phase !== 'playing') return null;
  /* QUAN TRỌNG: bot chỉ nhìn view của chính mình — không đọc state thô */
  const v = viewFor(s, pid);
  const moves = legalMoves(s, pid);
  if (!moves.length) return null;
  const hard = (typeof level === 'string' ? level : level && level.level) === 'hard';
  /* Máy Dễ: 70% đánh bừa */
  if (!hard && Math.random() < 0.7) return moves[Math.floor(Math.random() * moves.length)];
  /* Máy Khó (và 30% của máy Dễ): nước tốt nhất theo view */
  return goodMove(v, moves);
}

/* các nét chứa 1 đoạn của lá ở placedKey (trên bàn board) */
function touchedFeatures(board, placedKey) {
  const { features, byNode } = computeFeatures(board);
  const pt = board[placedKey];
  if (!pt) return { touched: [], byNode };
  const def = TILE_BY_ID[pt.type];
  const touched = new Set();
  const collect = (kind, seg) => {
    const f = byNode.get(placedKey + ':' + kind + ':' + seg);
    if (f) touched.add(f);
  };
  def.cities.forEach((c, i) => collect('city', i));
  def.roads.forEach((r, i) => collect('road', i));
  def.fields.forEach((fl, i) => collect('field', i));
  if (def.cloister) collect('cloister', 0);
  return { touched: [...touched], byNode };
}

/* giá trị của 1 lựa chọn meeple (option = {feat} hoặc null = bỏ qua)
   sau khi lá đã đặt: điểm hoàn thành ngay + giá trị vị trí của nét đặt
   meeple + thưởng mở rộng nét mình đang giữ − phạt nuôi điểm đối thủ. */
function scoreOption(touched, byNode, me, option) {
  const myId = me.id;
  let val = 0;
  for (const f of touched) {
    if (f.kind === 'field') continue;
    const counts = {};
    for (const m of f.meeples) counts[m.pid] = (counts[m.pid] || 0) + 1;
    if (option && option.feat === f) counts[myId] = (counts[myId] || 0) + 1;
    let max = 0;
    for (const k in counts) if (counts[k] > max) max = counts[k];
    const myN = counts[myId] || 0;
    if (f.complete) {
      const pts = featPoints(f, true);
      if (myN > 0 && myN >= max) val += pts;            // mình ăn điểm
      else if (myN === 0 && max > 0) val -= pts * 0.3;  // nuôi điểm đối thủ
    } else {
      if (myN > 0 && myN >= max) {
        const pot = f.kind === 'city' ? f.tiles.size * 2 + f.shields * 2 : f.kind === 'road' ? f.tiles.size : 9;
        val += pot * 0.08; // mở rộng nét mình đang giữ
      }
      if (option && option.feat === f) {
        if (f.kind === 'city') val += (f.tiles.size * 2 + f.shields * 2) * 0.35;
        else if (f.kind === 'road') val += f.tiles.size * 0.35;
        else if (f.kind === 'cloister') val += 3 + f.neighbors * 0.5;
      }
    }
  }
  /* ruộng: 3 điểm mỗi thành phố hoàn thành chạm tới + tiềm năng thành phố dở */
  if (option && option.feat && option.feat.kind === 'field') {
    const f = option.feat;
    const done = new Set(), open = new Set();
    for (const nodeId of f.citySegs) {
      const cf = byNode.get(nodeId);
      if (!cf) continue;
      if (cf.complete) done.add(cf.id); else open.add(cf.id);
    }
    val += 3 * done.size * 0.6 + open.size * 0.8 + 1;
  }
  if (option) val -= (me.supply <= 2 ? 2 : 0.5); // chi phí cơ hội của 1 meeple
  return val;
}

/* các lựa chọn meeple còn trống trên lá vừa đặt (trên bàn board) */
function meepleOptions(board, placedKey, supply) {
  if (supply <= 0) return [];
  const pt = board[placedKey];
  if (!pt) return [];
  const def = TILE_BY_ID[pt.type];
  const { byNode } = computeFeatures(board);
  const out = [];
  const add = (kind, seg) => {
    const f = byNode.get(placedKey + ':' + kind + ':' + seg);
    if (f && f.meeples.length === 0) out.push({ kind, seg, feat: f });
  };
  def.cities.forEach((c, i) => add('city', i));
  def.roads.forEach((r, i) => add('road', i));
  def.fields.forEach((fl, i) => add('field', i));
  if (def.cloister) add('cloister', 0);
  return out;
}

function goodMove(v, moves) {
  const me = v.players.find(p => p.id === v.me);
  if (!me) return moves[0];

  /* bước đặt meeple: chọn thẳng trên bàn hiện tại */
  if (v.step === 'meeple') {
    const { touched, byNode } = touchedFeatures(v.board, v.lastPlaced);
    let best = null, bestV = -Infinity;
    for (const m of moves) {
      let val;
      if (m.type === 'skip') {
        val = 1 + (7 - me.supply) * 0.5 + scoreOption(touched, byNode, me, null);
      } else {
        const kind = m.kind === 'monastery' ? 'cloister' : m.kind;
        const f = byNode.get(v.lastPlaced + ':' + kind + ':' + m.seg);
        val = scoreOption(touched, byNode, me, { feat: f });
      }
      val += Math.random() * 0.3;
      if (val > bestV) { bestV = val; best = m; }
    }
    return best || moves[0];
  }

  /* bước đặt lá: thử từng vị trí, tính theo lựa chọn meeple tốt nhất sau đó */
  if (v.step === 'place' && v.hand) {
    let best = null, bestV = -Infinity;
    for (const m of moves) {
      if (m.type !== 'place') continue;
      const board2 = JSON.parse(JSON.stringify(v.board));
      const placedKey = m.x + ',' + m.y;
      board2[placedKey] = { type: v.hand, rot: m.rot, meeples: [] };
      const { touched, byNode } = touchedFeatures(board2, placedKey);
      /* bỏ qua: giữ meeple */
      let val = 1 + (7 - me.supply) * 0.5 + scoreOption(touched, byNode, me, null);
      /* đặt meeple lên nét tốt nhất của lá mới */
      for (const o of meepleOptions(board2, placedKey, me.supply)) {
        val = Math.max(val, scoreOption(touched, byNode, me, o));
      }
      val += Math.random() * 0.5;
      if (val > bestV) { bestV = val; best = m; }
    }
    return best || moves[0];
  }
  return moves[0];
}

export default { botAction };
