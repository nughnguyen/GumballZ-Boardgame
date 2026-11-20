// 🤖 Bot Sudoku — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Bot đua giải cùng 1 câu đố với người chơi: mỗi lượt điền đúng 1 ô trống
// (biết đáp án vì bot là "người giải" — handicap nằm ở TỐC ĐỘ: Máy Dễ
// điền chậm + nghỉ lâu, Máy Khó điền nhanh; tốc độ đặt ở botDelay trong
// main.js). Bot không nhìn lưới/ghi chú của người khác, chỉ điền vào lưới
// của chính mình. Bot không bao giờ sai nên không bao giờ bị loại.
// ⚔️ Combat: máy cũng tránh ô đang bị sương mù che (đợi tan rồi điền sau).
import { fogged } from './engine.js';
export function botAction(s, pid, p) {
  if (!s || s.phase !== 'playing') return null;
  const pr = s.prog[pid];
  if (!pr || pr.failed || pr.finishedAt) return null;
  const now = Date.now();
  const empties = [];
  for (let i = 0; i < 81; i++) if (!s.givens[i] && !pr.grid[i] && !fogged(pr, i, now)) empties.push(i);
  if (!empties.length) return null;
  const cell = empties[(Math.random() * empties.length) | 0];
  return { type: 'place', cell, value: s.solution[cell] };
}
