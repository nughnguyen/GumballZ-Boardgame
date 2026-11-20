// 🤖 Bot Blokus — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Bot chỉ dùng viewFor (bàn cờ + mảnh còn lại của các màu) — không nhìn
// state thô. Máy Dễ: 70% đặt bừa 1 mảnh hợp lệ, 30% chơi nước tốt nhất.
// Máy Khó: tham lam — ưu tiên mảnh lớn (đặt mảnh to trước), rồi tới số góc
// chéo mới mở ra cho lượt sau (càng nhiều góc càng dễ đi tiếp), mảnh 1 ô
// tự động để cuối cùng (điểm thấp nhất) nên dễ ăn thưởng +20.
import { viewFor, legalPlacements, ORIENTS, SIZE } from './engine.js?v=1';

const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];

/* đếm góc chéo mới mà nước đặt mở ra: ô trống kề chéo 1 ô vừa đặt, và
   không kề cạnh bất kỳ ô cùng màu nào (kể cả ô vừa đặt) — đó mới là điểm
   neo dùng được cho lượt sau. */
function scorePlacement(view, color, act) {
  const cells = ORIENTS[act.piece].find(o => o.rot === act.rot && o.flip === act.flip).cells
    .map(([dr, dc]) => [act.r + dr, act.c + dc]);
  const board = view.board;
  const placedSet = new Set(cells.map(([r, c]) => r * SIZE + c));
  let diagContacts = 0;
  const newDiag = new Set();
  for (const [r, c] of cells) {
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
      const k = nr * SIZE + nc;
      if (board[k] === color) diagContacts++;
      else if (board[k] === -1 && !placedSet.has(k)) newDiag.add(k);
    }
  }
  /* góc mới chỉ tính khi ô đó không kề cạnh ô cùng màu (cũ hoặc mới) */
  let open = 0;
  for (const k of newDiag) {
    const r = (k / SIZE) | 0, c = k % SIZE;
    let blocked = false;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
      const nk = nr * SIZE + nc;
      if (board[nk] === color || placedSet.has(nk)) { blocked = true; break; }
    }
    if (!blocked) open++;
  }
  const size = cells.length;
  return size * 10 + open * 2 + Math.max(0, diagContacts - 1);
}

export function botAction(s, pid, level) {
  if (!s || s.phase !== 'playing') return null;
  /* QUAN TRỌNG: bot chỉ nhìn view của chính mình — không đọc state thô */
  const v = viewFor(s, pid);
  const me = v.players.find(p => p.id === pid);
  if (!me || v.turn !== pid) return null;
  const hard = (typeof level === 'string' ? level : level && level.level) === 'hard';
  const color = v.turnColor;
  const legal = legalPlacements(v, color);
  if (!legal.length) return { type: 'pass' };

  /* ---------- Máy Dễ: 70% bừa, 30% nước tốt ---------- */
  if (!hard && Math.random() < 0.7) return pick(legal);

  /* ---------- Máy Khó (và 30% của máy Dễ): tham lam ---------- */
  let best = null, bestScore = -Infinity;
  for (const act of legal) {
    const sc = scorePlacement(v, color, act);
    if (sc > bestScore || (sc === bestScore && Math.random() < 0.5)) {
      bestScore = sc; best = act;
    }
  }
  return best;
}

export default { botAction };
