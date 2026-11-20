// 🤖 Bot Rắn Săn Mồi — chỉ đọc BẢNG CỦA MÌNH + trạng thái công khai từ
// state thô để mô phỏng cách chơi (không đọc bảng của đối thủ, không đọc
// RNG của engine).
// Khó: BFS tìm đường ngắn nhất tới mồi (thân trừ đuôi là chướng ngại —
// đuôi sẽ nhích đi nên ô đuôi được tính là trống); không có đường tới
// mồi thì BFS đuổi theo đuôi để sống sót; vẫn không có đường thì chọn
// hướng có nhiều ô trống nhất (flood fill). Dễ: 30% đi ngẫu nhiên, còn
// lại đi như Khó; đi chậm (600–900ms/nước) so với Khó (200–350ms/nước).
// Bot chỉ trả về 'move' khi muốn đổi hướng — hướng hiện tại đã đúng thì
// trả null (đồng hồ tick của chủ phòng vẫn đẩy rắn đi).
import { GRID_W, GRID_H, DIRS } from './engine.js?v=1';

export const BOT_NAMES = ['Kẹo', 'Xôi', 'Gấu Bông', 'Đậu', 'Nấm', 'Sữa', 'Mochi', 'Pudding'];

const DIRS_ARR = ['up', 'down', 'left', 'right'];
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

/* BFS: đường ngắn nhất từ start tới target, tránh chướng ngại trong
   blocked (Set "x,y"). Trả về mảng hướng, hoặc null nếu không tới được. */
function bfsPath(start, target, blocked) {
  if (!target) return null;
  const key = (x, y) => x + ',' + y;
  const prev = new Map();
  const q = [start];
  prev.set(key(start.x, start.y), null);
  while (q.length) {
    const cur = q.shift();
    if (cur.x === target.x && cur.y === target.y) {
      const path = [];
      let node = cur;
      while (prev.get(key(node.x, node.y))) {
        const [px, py, dir] = prev.get(key(node.x, node.y));
        path.unshift(dir);
        node = { x: px, y: py };
      }
      return path;
    }
    for (const d of DIRS_ARR) {
      const nx = cur.x + DIRS[d].x, ny = cur.y + DIRS[d].y;
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;
      if (blocked.has(key(nx, ny))) continue;
      if (prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), [cur.x, cur.y, d]);
      q.push({ x: nx, y: ny });
    }
  }
  return null;
}
/* Đếm số ô trống tới được từ start (flood fill), tránh blocked. */
function floodCount(start, blocked) {
  const key = (x, y) => x + ',' + y;
  const seen = new Set([key(start.x, start.y)]);
  const q = [start];
  let n = 0;
  while (q.length) {
    const cur = q.shift();
    n++;
    for (const d of DIRS_ARR) {
      const nx = cur.x + DIRS[d].x, ny = cur.y + DIRS[d].y;
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;
      if (blocked.has(key(nx, ny))) continue;
      if (seen.has(key(nx, ny))) continue;
      seen.add(key(nx, ny));
      q.push({ x: nx, y: ny });
    }
  }
  return n;
}

function bestDir(prog) {
  const head = prog.snake[0];
  const tail = prog.snake[prog.snake.length - 1];
  /* thân trừ đuôi là chướng ngại (đuôi sẽ nhích đi) */
  const blocked = new Set(prog.snake.slice(0, -1).map(c => c.x + ',' + c.y));
  /* 1. đường tới mồi */
  const toFood = bfsPath(head, prog.food, blocked);
  if (toFood && toFood.length) return toFood[0];
  /* 2. không tới được mồi: đuổi theo đuôi để sống sót */
  const blockedTail = new Set(prog.snake.slice(0, -1).map(c => c.x + ',' + c.y));
  blockedTail.delete(tail.x + ',' + tail.y);
  const toTail = bfsPath(head, tail, blockedTail);
  if (toTail && toTail.length) return toTail[0];
  /* 3. không có đường nào: chọn hướng sống lâu nhất (nhiều ô trống nhất) */
  let best = null, bestN = -1;
  for (const d of DIRS_ARR) {
    if (OPP[d] === prog.dir) continue;
    const nh = { x: head.x + DIRS[d].x, y: head.y + DIRS[d].y };
    if (nh.x < 0 || nh.x >= GRID_W || nh.y < 0 || nh.y >= GRID_H) continue;
    if (blocked.has(nh.x + ',' + nh.y)) continue;
    const n = floodCount(nh, blocked);
    if (n > bestN) { bestN = n; best = d; }
  }
  return best; /* null = không còn hướng sống — cứ đi thẳng, chết thì chết */
}

export function botAction(s, pid) {
  const prog = s.prog && s.prog[pid];
  if (!prog || prog.status !== 'playing' || !prog.snake || !prog.snake.length) return null;
  const p = s.players.find(x => x.id === pid);
  const hard = p && p.level === 'hard';
  let dir;
  if (!hard && Math.random() < 0.30) {
    /* Dễ: 30% đi ngẫu nhiên (engine tự loại hướng quay đầu 180°) */
    dir = DIRS_ARR[Math.floor(Math.random() * DIRS_ARR.length)];
  } else {
    dir = bestDir(prog);
  }
  if (!dir || dir === prog.dir) return null;
  return { type: 'move', dir };
}
export function botDelay(s, pid) {
  const p = s.players.find(x => x.id === pid);
  if (p && p.level === 'hard') return 200 + Math.random() * 150;
  return 600 + Math.random() * 300;
}
export default botAction;
