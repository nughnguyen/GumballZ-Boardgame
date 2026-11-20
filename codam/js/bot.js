// 🤖 Bot Cờ Đam.
// Máy Dễ: 30% đánh bừa 1 nước hợp lệ, còn lại lấy nước tốt nhất theo
// heuristic 1 nước (ưu tiên ăn quân, phong Vua, tiến sâu, giữ quân).
// Máy Khó: minimax + cắt tỉa alpha-beta, sâu 5, hàm đánh giá = chất quân
// (Vua = 3 quân thường) + tiến sâu + giữ trung tâm + cơ động. Không bao giờ
// đánh nước không hợp lệ (ứng viên lấy từ legalMoves) và không bao giờ trả
// null khi đang đánh (hết nước thì xin thua).
import { W, H, idx, inBoard, isDark, sideOf, isKing, pieceAt, genMovesFor, legalMoves, counts } from './engine.js';

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const foeSide = s => (s === 'R' ? 'B' : 'R');
const cloneCells = cells => cells.slice();

/* áp 1 nước lên bản sao của mảng cells, trả mảng mới */
function applyToCells(cells, m) {
  const c = cloneCells(cells);
  const v = c[idx(m.fx, m.fy)];
  c[idx(m.tx, m.ty)] = v;
  c[idx(m.fx, m.fy)] = 0;
  if (m.capture) c[idx(m.cx, m.cy)] = 0;
  /* phong Vua khi lên hàng cuối */
  if (Math.abs(v) === 1) {
    if (sideOf(v) === 'R' && m.ty === 0) c[idx(m.tx, m.ty)] = 2;
    if (sideOf(v) === 'B' && m.ty === 7) c[idx(m.tx, m.ty)] = -2;
  }
  return c;
}
/* quân ở (x,y) còn ăn tiếp được không (cho chuỗi nhảy nhiều lần) */
function capturesFromCells(cells, side, x, y) {
  const v = pieceAt(cells, x, y);
  if (!v || sideOf(v) !== side) return [];
  const king = isKing(v), fwd = side === 'R' ? -1 : 1, out = [];
  for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    if (!king && dy !== fwd) continue;
    const cx = x + dx, cy = y + dy, tx = x + 2 * dx, ty = y + 2 * dy;
    if (!inBoard(tx, ty) || !isDark(tx, ty)) continue;
    const mid = pieceAt(cells, cx, cy);
    if (mid !== 0 && sideOf(mid) !== side && pieceAt(cells, tx, ty) === 0) {
      out.push({ fx: x, fy: y, tx, ty, cx, cy, capture: true, capKing: isKing(mid) });
    }
  }
  return out;
}
/* chuỗi nhảy đầy đủ từ 1 nước ăn: bot đánh 1 lượt gồm cả chuỗi nhảy,
   nhưng engine chỉ nhận từng nước một — bot trả nước đầu tiên, engine giữ
   midJump và simplenet gọi lại bot cho nước tiếp theo. */
function evaluate(cells, side) {
  const foe = foeSide(side);
  let sc = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = cells[idx(x, y)];
    if (!v) continue;
    const mine = sideOf(v) === side, king = isKing(v);
    let val = king ? 300 : 100;
    /* quân thường càng gần hàng phong Vua càng quý */
    if (!king) {
      const dist = sideOf(v) === 'R' ? y : 7 - y;
      val += (7 - dist) * 6;
    }
    /* giữ trung tâm + giữ hàng cuối (chống bị phong Vua) */
    if (x >= 2 && x <= 5 && y >= 3 && y <= 4) val += 6;
    if (!king && ((sideOf(v) === 'R' && y === 7) || (sideOf(v) === 'B' && y === 0))) val += 8;
    sc += mine ? val : -val;
  }
  /* cơ động: bên nào nhiều nước đi hơn thì hơi lợi thế */
  const myMoves = genMovesFor(cells, side).length;
  const foeMoves = genMovesFor(cells, foe).length;
  sc += (myMoves - foeMoves) * 3;
  return sc;
}
/* 1 nước heuristic: ăn quân (Vua quý hơn) > phong Vua > tiến sâu > giữ quân */
export function scoreMove(cells, side, m) {
  let sc = 0;
  if (m.capture) {
    sc += m.capKing ? 320 : 110;
    /* ăn xong mà còn ăn tiếp được thì càng hay (chuỗi nhảy) */
    const after = applyToCells(cells, m);
    sc += capturesFromCells(after, side, m.tx, m.ty).length * 60;
  }
  const v = pieceAt(cells, m.fx, m.fy);
  if (Math.abs(v) === 1) {
    const kingRow = side === 'R' ? 0 : 7;
    if (m.ty === kingRow) sc += 290; /* phong Vua */
    const before = side === 'R' ? m.fy : 7 - m.fy;
    const after = side === 'R' ? m.ty : 7 - m.ty;
    sc += (before - after) * 8; /* tiến sâu */
  }
  /* đừng dâng quân cho địch ăn ngay nước sau (trừ khi đang ăn) */
  if (!m.capture) {
    const after = applyToCells(cells, m);
    const foeCaps = genMovesFor(after, foeSide(side)).filter(c => c.capture);
    if (foeCaps.some(c => c.tx === m.tx && c.ty === m.ty)) sc -= 70;
  }
  sc += Math.random() * 6; /* phá hòa ngẫu nhiên */
  return sc;
}

const NODE_CAP = 20000;
let nodes = 0;
const crownedBy = (cells, side, m) => {
  const v = pieceAt(cells, m.fx, m.fy);
  return Math.abs(v) === 1 && ((side === 'R' && m.ty === 0) || (side === 'B' && m.ty === 7));
};
/* minimax với cắt tỉa alpha-beta. Trả điểm từ góc nhìn của `rootSide`.
   mustPiece: {x,y} | null — đang nhảy dở thì chỉ được ăn tiếp bằng đúng
   quân đó (chuỗi nhảy là 1 nước, không trừ độ sâu, không đổi lượt); hết
   chuỗi thì lượt mới đổi sang phe địch. */
function minimax(cells, side, depth, alpha, beta, rootSide, mustPiece) {
  if (++nodes > NODE_CAP) return evaluate(cells, rootSide);
  const moves = mustPiece ? capturesFromCells(cells, side, mustPiece.x, mustPiece.y) : genMovesFor(cells, side);
  if (!moves.length) {
    if (mustPiece) return minimax(cells, foeSide(side), depth - 1, alpha, beta, rootSide, null);
    return side === rootSide ? -100000 - depth : 100000 + depth;
  }
  if (depth <= 0) return evaluate(cells, rootSide);
  /* xếp nước ăn trước để cắt tỉa tốt hơn */
  moves.sort((a, b) => (b.capture ? 1 : 0) - (a.capture ? 1 : 0));
  const maximizing = side === rootSide;
  let best = maximizing ? -Infinity : Infinity;
  for (const m of moves) {
    const after = applyToCells(cells, m);
    let val;
    if (m.capture && !crownedBy(cells, side, m) && capturesFromCells(after, side, m.tx, m.ty).length) {
      val = minimax(after, side, depth, alpha, beta, rootSide, { x: m.tx, y: m.ty });
    } else {
      val = minimax(after, foeSide(side), depth - 1, alpha, beta, rootSide, null);
    }
    if (maximizing) { best = Math.max(best, val); alpha = Math.max(alpha, best); }
    else { best = Math.min(best, val); beta = Math.min(beta, best); }
    if (beta <= alpha) break;
  }
  return best;
}

export function chooseMove(s, pid, level = 'easy') {
  if (s.phase !== 'playing' || s.turn !== pid) return null;
  const moves = legalMoves(s, pid);
  if (!moves.length) return { type: 'resign' };
  const me = s.players.find(p => p.id === pid);
  const side = me.side;
  if (level === 'easy' && Math.random() < 0.3) {
    const m = pick(moves);
    return { type: 'move', from: { x: m.fx, y: m.fy }, to: { x: m.tx, y: m.ty } };
  }
  if (level === 'easy') {
    let best = -Infinity, bestMoves = [];
    for (const m of moves) {
      const sc = scoreMove(s.cells, side, m);
      if (sc > best) { best = sc; bestMoves = [m]; }
      else if (sc === best) bestMoves.push(m);
    }
    const m = pick(bestMoves);
    return { type: 'move', from: { x: m.fx, y: m.fy }, to: { x: m.tx, y: m.ty } };
  }
  /* Máy Khó: minimax sâu 5 */
  nodes = 0;
  let best = -Infinity, bestMoves = [];
  const ordered = moves.slice().sort((a, b) => (b.capture ? 1 : 0) - (a.capture ? 1 : 0));
  for (const m of ordered) {
    const after = applyToCells(s.cells, m);
    let val;
    if (m.capture && !crownedBy(s.cells, side, m) && capturesFromCells(after, side, m.tx, m.ty).length) {
      val = minimax(after, side, 5, -Infinity, Infinity, side, { x: m.tx, y: m.ty });
    } else {
      val = minimax(after, foeSide(side), 4, -Infinity, Infinity, side, null);
    }
    if (val > best) { best = val; bestMoves = [m]; }
    else if (val === best) bestMoves.push(m);
  }
  const m = pick(bestMoves);
  return { type: 'move', from: { x: m.fx, y: m.fy }, to: { x: m.tx, y: m.ty } };
}
/* Adapter cho phòng online (simplenet cfg.bot). Nếu đối thủ đang đề nghị
   hòa thì máy trả lời trước khi đi: thua 3 quân trở lên thì đồng ý, còn
   không thì từ chối rồi đi tiếp (simplenet gọi lại bot cho nước đi). */
export function botAction(s, pid, p) {
  if (s.phase !== 'playing') return null;
  if (s.drawOffer && s.drawOffer !== pid) {
    const c = counts(s);
    const side = (s.players.find(x => x.id === pid) || {}).side;
    const myCount = side === 'R' ? c.Rtotal : c.Btotal;
    const foeCount = side === 'R' ? c.Btotal : c.Rtotal;
    return { type: myCount + 3 <= foeCount ? 'draw' : 'draw-decline' };
  }
  const level = (p && p.level === 'hard') || (p && p.level === 'easy') ? p.level : 'hard';
  return chooseMove(s, pid, level);
}
export default { chooseMove, botAction, scoreMove, evaluate };
