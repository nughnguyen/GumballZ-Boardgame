// 🤖 Bot Tetris — chỉ đọc GIẾNG CỦA MÌNH + trạng thái công khai từ state
// thô để mô phỏng cách chơi (cùng pattern các bot trước: không đọc giếng
// của đối thủ, không đọc túi bài/ngẫu nhiên của engine).
// Đánh giá vị trí đặt khối bằng trọng số Dellacherie (chuẩn cộng đồng):
//   điểm = +0.760666 × hàng xoá − 0.510066 × chiều cao tổng
//          − 0.35663 × lỗ hổng − 0.184483 × độ gồ ghề.
// Dễ: 30% đặt ngẫu nhiên, còn lại chọn ngẫu nhiên trong top 5; đi chậm
//   (400–700ms/nước). Khó: luôn đặt tốt nhất; đi nhanh (150–300ms/nước).
// Bot KHÔNG giữ khối (hold) — đơn giản hoá, đã ghi rõ.
import { canPlace, ghostY, W, H } from './engine.js?v=1';
import { TYPES, cellsOf, BOT_NAMES } from './pieces.js?v=1';

export { BOT_NAMES };

function columnHeights(grid) {
  const hs = Array(W).fill(0);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      if (grid[y][x]) { hs[x] = H - y; break; }
    }
  }
  return hs;
}
function evaluate(grid, cleared) {
  const hs = columnHeights(grid);
  const agg = hs.reduce((a, b) => a + b, 0);
  let holes = 0;
  for (let x = 0; x < W; x++) {
    let seen = false;
    for (let y = 0; y < H; y++) {
      if (grid[y][x]) seen = true;
      else if (seen) holes++;
    }
  }
  let bump = 0;
  for (let x = 0; x < W - 1; x++) bump += Math.abs(hs[x] - hs[x + 1]);
  return 0.760666 * cleared - 0.510066 * agg - 0.35663 * holes - 0.184483 * bump;
}
function simulateDrop(prog, type, rot, x) {
  // trả về {score, cleared} của vị trí đặt, hoặc null nếu không đặt được
  const grid = prog.grid.map(r => r.slice());
  let y = 0;
  const fake = { grid, cur: { type, rot, x, y } };
  if (!canPlace(fake, type, rot, x, 0)) return null;
  while (canPlace(fake, type, rot, x, y + 1)) y++;
  const color = 1;
  for (const [cx, cy] of cellsOf(type, rot)) grid[y + cy][x + cx] = color;
  let cleared = 0;
  for (let r = 0; r < H; r++) if (grid[r].every(c => c)) cleared++;
  return { score: evaluate(grid, cleared), cleared };
}
export function bestPlacement(prog) {
  const cur = prog.cur;
  if (!cur) return null;
  const scored = [];
  for (let rot = 0; rot < 4; rot++) {
    for (let x = -1; x < W; x++) {
      const r = simulateDrop(prog, cur.type, rot, x);
      if (r) scored.push({ rot, x, score: r.score });
    }
  }
  if (!scored.length) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored;
}
export function botAction(s, pid) {
  const prog = s.prog && s.prog[pid];
  if (!prog || prog.status !== 'playing' || !prog.cur) return null;
  const cur = prog.cur;
  // đã chạm đáy thì thả luôn
  if (ghostY(prog) - cur.y <= 0) return { type: 'hard' };
  const scored = bestPlacement(prog);
  if (!scored) return { type: 'hard' };
  const p = s.players.find(x => x.id === pid);
  const hard = p && p.level === 'hard';
  let target;
  if (!hard && Math.random() < 0.30) {
    target = scored[Math.floor(Math.random() * scored.length)];
  } else if (!hard) {
    target = scored[Math.floor(Math.random() * Math.min(5, scored.length))];
  } else {
    target = scored[0];
  }
  // xoay về trạng thái đích — chỉ xoay khi xoay được (kiểm tra kick),
  // không thì bỏ qua xoay và đi ngang/thả (tránh xoay mãi không được)
  if (cur.rot !== target.rot) {
    const nr = (cur.rot + 1) % 4;
    const kicks = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]];
    const ok = kicks.some(([kx, ky]) => canPlace(prog, cur.type, nr, cur.x + kx, cur.y + ky));
    if (ok) return { type: 'rotate', dir: 1 };
  }
  if (cur.x < target.x) return { type: 'move', dx: 1 };
  if (cur.x > target.x) return { type: 'move', dx: -1 };
  return { type: 'hard' };
}
export function botDelay(s, pid) {
  const p = s.players.find(x => x.id === pid);
  if (p && p.level === 'hard') return 150 + Math.random() * 150;
  return 400 + Math.random() * 300;
}
export default botAction;
