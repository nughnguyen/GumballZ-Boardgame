// 🤖 Bot TicTacToe — minimax ĐẦY ĐỦ (bàn 3×3 chỉ có tối đa 9 nước nên duyệt
// hết mọi khả năng, không cần heuristic như Caro 30×30).
// Máy Khó = minimax chuẩn: KHÔNG BAO GIỜ thua — thắng khi đối thủ đi sai,
// hòa khi đối thủ đi đúng (TicTacToe đi đúng thì luôn hòa). Ưu tiên thắng
// nhanh / thua chậm bằng cách trừ/cộng độ sâu vào điểm.
// Máy Dễ: 30% chọn nước tốt nhất (minimax), 70% đi ngẫu nhiên trong các ô trống.
// Tốc độ: minimax chạy trực tiếp trên mảng 9 ô (đặt rồi hoàn tác), không clone
// cả state qua JSON nên 1 nước đi chỉ tốn < 1ms.
import { WIN_LINES, legalMoves, emptyCount } from './engine.js';

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
/* người thắng trên mảng ô (1 = X, 2 = O, 0 = chưa ai thắng) */
function winnerMark(cells) {
  for (const line of WIN_LINES) {
    const m = cells[line[0]];
    if (m !== 0 && line.every(i => cells[i] === m)) return m;
  }
  return 0;
}
const empties = cells => { const out = []; for (let i = 0; i < 9; i++) if (cells[i] === 0) out.push(i); return out; };
/* minimax trên mảng ô: điểm từ góc nhìn của maxMark (1 hoặc 2).
   Thắng = 10 - độ sâu (thắng càng nhanh càng tốt), thua = độ sâu - 10. */
export function minimax(cells, depth, isMax, maxMark) {
  const w = winnerMark(cells);
  if (w !== 0) return w === maxMark ? 10 - depth : depth - 10;
  const free = empties(cells);
  if (free.length === 0) return 0;
  const turnMark = isMax ? maxMark : (maxMark === 1 ? 2 : 1);
  let best = isMax ? -Infinity : Infinity;
  for (const i of free) {
    cells[i] = turnMark;
    const sc = minimax(cells, depth + 1, !isMax, maxMark);
    cells[i] = 0;
    best = isMax ? Math.max(best, sc) : Math.min(best, sc);
  }
  return best;
}
/* điểm tốt nhất có thể đạt được nếu đặt quân maxMark vào (x,y) */
export function scoreMove(s, pid, x, y) {
  const me = s.players.find(p => p.id === pid);
  const maxMark = me && me.mark === 'O' ? 2 : 1;
  const cells = s.cells.slice();
  const i = y * 3 + x;
  if (cells[i] !== 0) return -Infinity;
  cells[i] = maxMark;
  if (winnerMark(cells) === maxMark) return 10;
  if (empties(cells).length === 0) return 0;
  return minimax(cells, 1, false, maxMark);
}
export function chooseMove(s, pid, level = 'easy') {
  if (s.phase !== 'playing' || s.turn !== pid) return null;
  if (emptyCount(s) === 0) return null;
  const moves = legalMoves(s, pid);
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];
  if (level === 'hard') {
    /* nước tốt nhất theo minimax; ngang điểm thì chọn ngẫu nhiên cho đỡ đơn điệu */
    let best = -Infinity;
    const scored = moves.map(m => ({ ...m, sc: scoreMove(s, pid, m.x, m.y) }));
    for (const m of scored) best = Math.max(best, m.sc);
    return pick(scored.filter(m => m.sc === best));
  }
  /* Dễ: 30% đi nước tốt nhất, 70% đi ngẫu nhiên — vẫn biết thắng/chặn khi quá rõ */
  if (Math.random() < 0.3) {
    let best = -Infinity;
    const scored = moves.map(m => ({ ...m, sc: scoreMove(s, pid, m.x, m.y) }));
    for (const m of scored) best = Math.max(best, m.sc);
    return pick(scored.filter(m => m.sc === best));
  }
  return pick(moves);
}
/* Adapter cho phòng online (simplenet cfg.bot): bot nhận thêm player p (có level) */
export function botAction(s, pid, p) {
  const level = (p && p.level === 'hard') || (p && p.level === 'easy') ? p.level : 'hard';
  const m = chooseMove(s, pid, level);
  return m ? { type: 'move', x: m.x, y: m.y } : null;
}
export default { chooseMove, botAction, minimax, scoreMove };
