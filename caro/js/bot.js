// 🤖 Bot Cờ Caro — heuristic cho bàn LỚN 30×30 (KHÔNG minimax toàn bàn, quá chậm).
// Chỉ xét ô ứng viên trong bán kính ≤ 2 quanh quân đã có; chấm điểm theo đường 5/4/3:
// thắng ngay (5) > chặn đối thủ thắng > 4 mở > 4 chặn 1 đầu > 3 mở > …
// Máy Khó: luôn lấy nước thắng của mình, luôn chặn nước thắng của đối thủ,
// rồi chọn nước điểm cao nhất. Máy Dễ: chọn ngẫu nhiên trong các nước tạm được,
// thỉnh thoảng đánh lệch. Bot đi được cả khi bàn gần đầy (ứng viên rỗng thì
// lấy bất kỳ ô trống nào còn lại).
import { DIRS, WIN_LEN, inBoard, idx, emptyCount } from './engine.js';

const RADIUS = 2;
/* điểm của 1 đường theo độ dài dãy (tính cả ô đang xét) và số đầu mở (0/1/2) */
function lineScore(len, open) {
  if (len >= WIN_LEN) return 1000000;
  if (len === 4) return open === 2 ? 100000 : open === 1 ? 10000 : 1000;
  if (len === 3) return open === 2 ? 5000 : open === 1 ? 500 : 50;
  if (len === 2) return open === 2 ? 200 : open === 1 ? 20 : 2;
  return open === 2 ? 10 : 1;
}
/* điểm nếu đặt quân mark vào (x,y): cộng điểm 4 hướng */
export function scoreCell(s, x, y, mark) {
  let total = 0;
  for (const [dx, dy] of DIRS) {
    let len = 1, open = 0;
    for (const sgn of [1, -1]) {
      let run = 0, cx = x + dx * sgn, cy = y + dy * sgn;
      while (inBoard(s, cx, cy) && s.cells[idx(s, cx, cy)] === mark) { run++; cx += dx * sgn; cy += dy * sgn; }
      len += run;
      if (inBoard(s, cx, cy) && s.cells[idx(s, cx, cy)] === 0) open++;
    }
    total += lineScore(len, open);
  }
  return total;
}
/* ô ứng viên: ô trống nằm trong bán kính ≤2 (Chebyshev) quanh 1 quân đã có */
export function candidates(s) {
  const size = s.size, out = new Set();
  let anyStone = false;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (s.cells[idx(s, x, y)] === 0) continue;
    anyStone = true;
    for (let dy = -RADIUS; dy <= RADIUS; dy++) for (let dx = -RADIUS; dx <= RADIUS; dx++) {
      const cx = x + dx, cy = y + dy;
      if (inBoard(s, cx, cy) && s.cells[idx(s, cx, cy)] === 0) out.add(cy * size + cx);
    }
  }
  if (!anyStone) { const c = Math.floor(size / 2); return [{ x: c, y: c }]; }
  if (!out.size) { /* bàn gần đầy: ô trống nào cũng được, kể cả xa quân đã có */
    for (let i = 0; i < s.cells.length; i++) if (s.cells[i] === 0) return [{ x: i % size, y: Math.floor(i / size) }];
    return [];
  }
  return [...out].map(i => ({ x: i % size, y: Math.floor(i / size) }));
}
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
/* điểm tổng của 1 ô: tấn công (quân mình) + phòng thủ (chặn đối thủ, hệ số 0.9 —
   nhỏ hơn 1 để nước thắng của mình luôn hơn nước chặn, nhưng chặn nước thắng
   của đối thủ (900.000) vẫn hơn mọi nước tấn công khác (tối đa 100.000). */
export function totalScore(s, x, y, myMark) {
  const foeMark = myMark === 1 ? 2 : 1;
  return scoreCell(s, x, y, myMark) + 0.9 * scoreCell(s, x, y, foeMark);
}
export function chooseMove(s, pid, level = 'easy') {
  if (s.phase !== 'playing' || s.turn !== pid) return null;
  if (emptyCount(s) === 0) return null;
  const me = s.players.find(p => p.id === pid);
  const myMark = me && me.mark === 'O' ? 2 : 1;
  const cands = candidates(s);
  if (!cands.length) return null;
  if (cands.length === 1) return cands[0];
  const scored = cands.map(c => ({ ...c, sc: totalScore(s, c.x, c.y, myMark) }));
  if (level === 'hard') {
    let best = -Infinity;
    for (const c of scored) best = Math.max(best, c.sc);
    return pick(scored.filter(c => c.sc === best));
  }
  /* Dễ: 25% đánh lệch hẳn (ô ứng viên bất kỳ), còn lại chọn ngẫu nhiên
     trong nửa trên theo điểm — vẫn biết chặn/thắng khi nước đó quá rõ. */
  if (Math.random() < 0.25) return pick(scored);
  const sorted = [...scored].sort((a, b) => b.sc - a.sc);
  return pick(sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2))));
}
/* Adapter cho phòng online (simplenet cfg.bot): bot nhận thêm player p (có level) */
export function botAction(s, pid, p) {
  const level = (p && p.level === 'hard') || (p && p.level === 'easy') ? p.level : 'hard';
  const m = chooseMove(s, pid, level);
  return m ? { type: 'move', x: m.x, y: m.y } : null;
}
export default { chooseMove, botAction, scoreCell, candidates };
