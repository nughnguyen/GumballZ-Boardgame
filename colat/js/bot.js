// 🤖 Bot Cờ Lật — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Easy: 30% đi bừa, còn lại 1-ply ưu tiên góc + tránh ô X/C sớm.
// Hard: negamax alpha-beta, độ sâu ~5 (càng về cuối ván càng sâu, lên tới 8),
// điểm vị trí (góc/ biên/ X/ C) + độ cơ động + đếm quân khi tàn cuộc.
// Bot cũng biết trả lời đề nghị hòa: đang thua từ 10 quân trở lên thì đồng ý.
import { genMovesFor, applyToCells, counts, cornersOf, foeSide, W } from './engine.js';

export const WEIGHTS = [
  120, -20,  20,   5,   5,  20, -20, 120,
  -20, -40,  -5,  -5,  -5,  -5, -40, -20,
   20,  -5,  15,   3,   3,  15,  -5,  20,
    5,  -5,   3,   3,   3,   3,  -5,   5,
    5,  -5,   3,   3,   3,   3,  -5,   5,
   20,  -5,  15,   3,   3,  15,  -5,  20,
  -20, -40,  -5,  -5,  -5,  -5, -40, -20,
  120, -20,  20,   5,   5,  20, -20, 120,
];
const isCorner = (x, y) => (x === 0 || x === 7) && (y === 0 || y === 7);
const isXSquare = (x, y) => (x === 1 || x === 6) && (y === 1 || y === 6);
const isCSquare = (x, y) => ((x === 0 || x === 7) && (y === 1 || y === 6)) || ((x === 1 || x === 6) && (y === 0 || y === 7));
/* góc kề đã bị đối thủ chiếm thì ô X/C kề nó không còn nguy hiểm */
function cornerTaken(cells, x, y) {
  const cx = x === 0 ? 0 : x === 7 ? 7 : (x === 1 ? 0 : 6);
  const cy = y === 0 ? 0 : y === 7 ? 7 : (y === 1 ? 0 : 6);
  return cells[cy * W + cx] !== 0;
}

function evaluate(cells, side, depthLeft) {
  const foe = foeSide(side);
  let pos = 0, mine = 0, theirs = 0;
  for (let i = 0; i < 64; i++) {
    if (cells[i] === 1) { pos += (side === 'B' ? WEIGHTS[i] : -WEIGHTS[i]); mine++; }
    else if (cells[i] === 2) { pos += (side === 'W' ? WEIGHTS[i] : -WEIGHTS[i]); theirs++; }
  }
  const myMoves = genMovesFor(cells, side).length;
  const foeMoves = genMovesFor(cells, foe).length;
  let score = pos + (myMoves - foeMoves) * 8 + (cornersOf(cells, side) - cornersOf(cells, foe)) * 25;
  /* tàn cuộc (ít ô trống): đếm quân mới quyết định */
  const empties = 64 - mine - theirs;
  if (empties <= 12) score += (mine - theirs) * 15;
  return score;
}

let nodes = 0;
const NODE_CAP = 30000;
function negamax(cells, side, depth, alpha, beta) {
  if (nodes >= NODE_CAP) return evaluate(cells, side, depth);
  nodes++;
  const moves = genMovesFor(cells, side);
  if (depth === 0 || moves.length === 0) {
    if (moves.length === 0) {
      const foeMoves = genMovesFor(cells, foeSide(side));
      if (foeMoves.length === 0) {
        const c = counts(cells);
        const diff = side === 'B' ? c.B - c.W : c.W - c.B;
        return diff > 0 ? 10000 + diff : diff < 0 ? -10000 + diff : 0;
      }
      /* bị bỏ lượt: đối thủ đi, trừ 1 độ sâu */
      return -negamax(cells, foeSide(side), depth - 1, -beta, -alpha);
    }
    return evaluate(cells, side, depth);
  }
  let best = -Infinity;
  /* xếp góc trước để cắt tỉa tốt hơn */
  moves.sort((a, b) => (isCorner(b.x, b.y) - isCorner(a.x, a.y)));
  for (const m of moves) {
    const v = -negamax(applyToCells(cells, side, m), foeSide(side), depth - 1, -beta, -alpha);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export function chooseMove(s, pid, level = 'easy') {
  const me = s.players.find(p => p.id === pid);
  if (!me || s.phase !== 'playing') return null;
  const moves = genMovesFor(s.cells, me.side);
  if (!moves.length) return null;
  if (level !== 'hard') {
    /* Easy: 30% bừa; còn lại ưu tiên góc, tránh X/C khi góc kề còn trống */
    if (Math.random() < 0.3) { const m = moves[Math.floor(Math.random() * moves.length)]; return { type: 'move', x: m.x, y: m.y }; }
    let best = null, bestScore = -Infinity;
    for (const m of moves) {
      let sc = WEIGHTS[m.y * W + m.x] + m.flips.length * 2 + Math.random() * 3;
      if (isCorner(m.x, m.y)) sc += 60;
      if ((isXSquare(m.x, m.y) || isCSquare(m.x, m.y)) && !cornerTaken(s.cells, m.x, m.y)) sc -= 40;
      if (sc > bestScore) { bestScore = sc; best = m; }
    }
    return { type: 'move', x: best.x, y: best.y };
  }
  /* Hard: độ sâu theo giai đoạn ván */
  const empties = 64 - counts(s.cells).total;
  const depth = empties <= 10 ? 8 : empties <= 16 ? 6 : 5;
  nodes = 0;
  const ordered = moves.slice().sort((a, b) => (isCorner(b.x, b.y) - isCorner(a.x, a.y)));
  let best = ordered[0], bestVal = -Infinity;
  for (const m of ordered) {
    const v = -negamax(applyToCells(s.cells, me.side, m), foeSide(me.side), depth - 1, -Infinity, Infinity);
    if (v > bestVal) { bestVal = v; best = m; }
    if (nodes >= NODE_CAP) break;
  }
  return { type: 'move', x: best.x, y: best.y };
}

/* Bot hành động 1 lượt: trả lời đề nghị hòa trước, rồi đi nước. */
export function botAction(s, pid, p) {
  if (s.phase !== 'playing' || s.turn !== pid) return null;
  if (s.drawOffer && s.drawOffer !== pid) {
    const me = s.players.find(pp => pp.id === pid);
    const c = counts(s.cells);
    const mine = me.side === 'B' ? c.B : c.W;
    const theirs = me.side === 'B' ? c.W : c.B;
    if (mine + 10 <= theirs) return { type: 'draw' }; /* đang thua nhiều thì hòa */
    return { type: 'draw-decline' };
  }
  return chooseMove(s, pid, (p && p.level) || 'easy');
}
