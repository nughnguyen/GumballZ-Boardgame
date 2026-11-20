// 🤖 Bot 2048 — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Bot đua đạt ô 2048 trên lưới CỦA MÌNH: mỗi lượt trượt 1 hướng.
// Máy Dễ trượt bừa 1 hướng hợp lệ; Máy Khó tham lam — ưu tiên nước giữ
// nhiều ô trống nhất, rồi tới điểm gộp được, rồi tới tính đơn điệu (ô lớn
// dồn về 1 góc). Bot không nhìn lưới/điểm của người khác, chỉ trượt lưới
// của chính mình. Tốc độ đặt ở botDelay trong main.js.
import { slideBoard, validDirs } from './engine.js?v=1';

function monotonicity(grid) {
  // tổng độ "dồn về góc trái-trên": ô lớn ở hàng/cột đầu được thưởng nhiều
  let s = 0;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const v = grid[r * 4 + c];
    if (v) s += Math.log2(v) * (8 - r - c);
  }
  return s;
}
function empties(grid) { let n = 0; for (const v of grid) if (!v) n++; return n; }

export function botAction(s, pid, p) {
  if (!s || s.phase !== 'playing') return null;
  const pr = s.prog[pid];
  if (!pr || pr.failed || pr.finishedAt) return null;
  const dirs = validDirs(pr.grid);
  if (!dirs.length) return null;
  const hard = p && p.level === 'hard';
  if (!hard) {
    return { type: 'move', dir: dirs[(Math.random() * dirs.length) | 0] };
  }
  let best = null, bestScore = -Infinity;
  for (const dir of dirs) {
    const res = slideBoard(pr.grid, dir);
    // ô trống là quan trọng nhất, rồi điểm gộp, rồi tính đơn điệu
    const score = empties(res.grid) * 100 + res.gained * 2 + monotonicity(res.grid);
    if (score > bestScore) { bestScore = score; best = dir; }
  }
  return { type: 'move', dir: best };
}
