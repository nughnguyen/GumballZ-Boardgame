// 🤖 Bot Xếp Kẹo — chỉ đọc BẢNG CỦA MÌNH + trạng thái công khai từ
// state thô để mô phỏng cách chơi (không đọc bảng của đối thủ, không
// đọc RNG của engine).
// Khó: liệt kê mọi nước đổi hợp lệ, mô phỏng trọn vẹn (kèm dây chuyền)
// rồi chọn nước nhiều điểm nhất. Dễ: 20% đi bừa, còn lại chọn ngẫu
// nhiên trong top 5; đi chậm (500–800ms/nước) so với Khó (200–400ms).
// Bot chỉ trả về 'swap' khi còn lượt; hết lượt thì trả null. Mô phỏng
// dùng bản sao RNG nên không làm lệch lockstep của ván thật.
import { GRID_W, GRID_H, MOVES, legalSwaps, simulateSwap } from './engine.js?v=1';

export const BOT_NAMES = ['Kẹo', 'Xôi', 'Gấu Bông', 'Đậu', 'Nấm', 'Sữa', 'Mochi', 'Pudding'];

export function botAction(s, pid) {
  const prog = s.prog && s.prog[pid];
  if (!prog || prog.status !== 'playing' || !prog.grid || prog.movesUsed >= MOVES) return null;
  const moves = legalSwaps(prog.grid);
  if (!moves.length) return null;
  const p = s.players.find(x => x.id === pid);
  const hard = p && p.level === 'hard';
  if (!hard && Math.random() < 0.20) {
    const m = moves[Math.floor(Math.random() * moves.length)];
    return { type: 'swap', x1: m.x1, y1: m.y1, x2: m.x2, y2: m.y2 };
  }
  const scored = moves.map(m => {
    const r = simulateSwap(prog.grid, s.rng, m.x1, m.y1, m.x2, m.y2);
    return { ...m, score: r.score };
  }).filter(m => m.score >= 0);
  if (!scored.length) return null;
  scored.sort((a, b) => b.score - a.score);
  const pick = hard
    ? scored[0]
    : scored[Math.floor(Math.random() * Math.min(5, scored.length))];
  return { type: 'swap', x1: pick.x1, y1: pick.y1, x2: pick.x2, y2: pick.y2 };
}
export function botDelay(s, pid) {
  const p = s.players.find(x => x.id === pid);
  if (p && p.level === 'hard') return 200 + Math.random() * 200;
  return 500 + Math.random() * 300;
}
export default botAction;
