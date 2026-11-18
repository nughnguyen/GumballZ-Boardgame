// 🤖 Bot Cờ Vây — heuristic 1 nước (KHÔNG tìm kiếm sâu: bàn 19×19 quá lớn).
// Chấm điểm mỗi nước hợp lệ: ăn quân > cứu nhóm đang bị chiếu (atari) >
// chiếu ngược đối thủ > vây vùng trống lớn / nối nhóm > giữ điểm sao /
// đường 3-4 ở khai cuộc > đánh gần quân đã có. Trừ nặng: tự đưa vào atari,
// lấp mắt của mình.
// Máy Khó: luôn lấy nước điểm cao nhất. Máy Dễ: 30% đánh bừa 1 nước hợp lệ
// bất kỳ, còn lại lấy nước tốt nhất. Cả 2 đều bỏ lượt khi bàn đã ổn định
// (không còn nước nào đáng đánh) để ván luôn kết thúc — không bao giờ kẹt,
// không bao giờ đánh nước không hợp lệ (ứng viên lấy từ legalMoves).
import { DIRS, groupAt, tryPlace, legalMoves, emptyCount, hoshiPoints, idx, inBoard } from './engine.js';

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
/* kích thước vùng trống chứa từng ô trống (vùng = các ô trống kề nhau):
   vùng lớn là đất còn mở — đánh vào đó là đang vây đất. Tính 1 lần cho cả
   bàn rồi tra cứu, khỏi BFS lại cho từng nước. */
function regionSizes(s) {
  const size = s.size, out = new Map(), seen = new Set();
  for (let i = 0; i < s.cells.length; i++) {
    if (s.cells[i] !== 0 || seen.has(i)) continue;
    const region = [];
    const stack = [i]; seen.add(i);
    while (stack.length) {
      const cur = stack.pop(); region.push(cur);
      const cx = cur % size, cy = Math.floor(cur / size);
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx, ny = cy + dy;
        if (!inBoard(s, nx, ny)) continue;
        const ni = ny * size + nx;
        if (s.cells[ni] === 0 && !seen.has(ni)) { seen.add(ni); stack.push(ni); }
      }
    }
    for (const ci of region) out.set(ci, region.length);
  }
  return out;
}
function isEyeFill(s, x, y, mark) {
  let own = 0, total = 0;
  for (const [dx, dy] of DIRS) {
    const nx = x + dx, ny = y + dy;
    if (!inBoard(s, nx, ny)) continue;
    total++;
    if (s.cells[idx(s, nx, ny)] === mark) own++;
  }
  return total >= 2 && own === total;
}
/* có quân nào (màu nào cũng được) trong bán kính Chebyshev r quanh (x,y)? */
function nearStone(s, x, y, r) {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (!dx && !dy) continue;
    const nx = x + dx, ny = y + dy;
    if (inBoard(s, nx, ny) && s.cells[idx(s, nx, ny)] !== 0) return true;
  }
  return false;
}

/* chấm điểm 1 nước đi (x,y) cho mark. Trả -Infinity nếu nước không hợp lệ
   (không xảy ra với ứng viên từ legalMoves, chỉ để phòng thủ). */
export function scoreMove(s, x, y, mark, regions) {
  const size = s.size, foe = mark === 1 ? 2 : 1;
  /* nhóm mình kề điểm này đang bị chiếu (chỉ còn 1 khí) trước khi đánh? */
  let ownAtari = false;
  for (const [dx, dy] of DIRS) {
    const nx = x + dx, ny = y + dy;
    if (!inBoard(s, nx, ny) || s.cells[idx(s, nx, ny)] !== mark) continue;
    const g = groupAt(s.cells, size, nx, ny);
    if (g && g.liberties.size === 1) ownAtari = true;
  }
  const sim = tryPlace(s.cells, size, x, y, mark, s.prevHash);
  if (!sim.ok) return -Infinity;
  const captured = sim.captured.length;
  const merged = groupAt(sim.cells, size, x, y);
  const mergedLibs = merged ? merged.liberties.size : 0;
  /* chiếu ngược: có bao nhiêu nhóm địch kề quân mới mà chỉ còn đúng 1 khí? */
  let atariCount = 0;
  const seenAtari = new Set();
  for (const [dx, dy] of DIRS) {
    const nx = x + dx, ny = y + dy;
    if (!inBoard(s, nx, ny) || sim.cells[idx(s, nx, ny)] !== foe) continue;
    const g = groupAt(sim.cells, size, nx, ny);
    if (g && g.liberties.size === 1) {
      const key = g.stones[0];
      if (!seenAtari.has(key)) { seenAtari.add(key); atariCount++; }
    }
  }
  const selfAtari = captured === 0 && mergedLibs === 1;
  const save = captured === 0 && ownAtari && mergedLibs >= 2;
  const eyeFill = captured === 0 && !save && isEyeFill(s, x, y, mark);
  let sc = 0;
  sc += 1000 * captured + 250 * Math.max(0, captured - 1);
  if (save) sc += 600;
  sc += 350 * atariCount;
  if (selfAtari) sc -= 450;
  if (eyeFill) sc -= 700;
  /* khai cuộc (12 nước đầu): ưu tiên điểm sao, đường 3–4; tránh đường 1–2 */
  if (s.moveCount < 12) {
    const stars = hoshiPoints(size);
    if (stars.some(([sx, sy]) => sx === x && sy === y)) sc += 80;
    const line = Math.min(x, y, size - 1 - x, size - 1 - y) + 1;
    if (line === 3 || line === 4) sc += 40;
    else if (line === 1 || line === 2) sc -= 30;
    else sc += 10;
  }
  /* đánh gần quân đã có: + điểm tiếp xúc; nối 2 nhóm mình trở lên thì +30 */
  let contact = 0;
  const friendGroups = new Set();
  for (const [dx, dy] of DIRS) {
    const nx = x + dx, ny = y + dy;
    if (!inBoard(s, nx, ny)) continue;
    const v = s.cells[idx(s, nx, ny)];
    if (v === mark) {
      contact += 6;
      const g = groupAt(s.cells, size, nx, ny);
      if (g) friendGroups.add(g.stones[0]);
    }
    else if (v === foe) contact += 4;
  }
  sc += contact;
  if (friendGroups.size >= 2) sc += 30; /* nối nhóm */
  if (s.moveCount >= 6 && !nearStone(s, x, y, 2)) sc -= 40;
  /* vây đất: đánh vào vùng trống lớn thì đang mở thêm đất */
  const rs = regions ? (regions.get(y * size + x) || 0) : 0;
  if (rs >= 10) sc += 40;
  else if (rs >= 5) sc += 25;
  else if (rs >= 3) sc += 10;
  sc += Math.random() * 5; /* phá hòa ngẫu nhiên cho đỡ đơn điệu */
  return sc;
}

/* Bot có nên bỏ lượt không? Chỉ bỏ khi ván đã đi được 1 đoạn (≥ 30% số ô)
   mà nước tốt nhất cũng không đáng đánh (< 30 điểm) — tức không còn nước ăn
   quân / chiếu / cứu nhóm, không còn vùng trống lớn để vây đất, cũng không
   còn nước nối nhóm nào. Chỉ còn nước lấp điểm dame nhỏ lẻ thì bỏ lượt cho
   gọn ván. */
function shouldPass(s, bestScore) {
  return bestScore < 30 && s.moveCount >= Math.floor(s.size * s.size * 0.3);
}

export function chooseMove(s, pid, level = 'easy') {
  if (s.phase !== 'playing' || s.turn !== pid) return null;
  const me = s.players.find(p => p.id === pid);
  const mark = me && me.mark === 'W' ? 2 : 1;
  const moves = legalMoves(s, pid);
  if (!moves.length) return { type: 'pass' };
  if (level === 'easy' && Math.random() < 0.3) return { type: 'move', ...pick(moves) };
  const regions = regionSizes(s);
  const scored = moves.map(m => ({ ...m, sc: scoreMove(s, m.x, m.y, mark, regions) }));
  let best = -Infinity;
  for (const m of scored) best = Math.max(best, m.sc);
  if (shouldPass(s, best)) return { type: 'pass' };
  return { type: 'move', ...pick(scored.filter(m => m.sc === best)) };
}
/* Adapter cho phòng online (simplenet cfg.bot): bot nhận thêm player p (có level).
   Bot Cờ Vây luôn trả 1 action (đánh hoặc bỏ lượt) khi tới lượt — không bao
   giờ trả null trong lúc đánh, nên ván luôn kết thúc được. */
export function botAction(s, pid, p) {
  if (s.phase !== 'playing') return null;
  const level = (p && p.level === 'hard') || (p && p.level === 'easy') ? p.level : 'hard';
  return chooseMove(s, pid, level);
}
export default { chooseMove, botAction, scoreMove };
