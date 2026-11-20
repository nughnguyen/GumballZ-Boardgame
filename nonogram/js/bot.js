// 🤖 Bot Nonogram — chỉ đọc BẢNG CỦA MÌNH + gợi ý từ state thô
// (không đọc đáp án solution, không đọc bảng đối thủ, không đọc RNG
// của engine).
// Khó: suy luận như người chơi giỏi — liệt kê mọi cách đặt các đoạn
// gợi ý khớp với ô đã biết trên mỗi hàng/cột; ô nào đen trong MỌI
// cách đặt thì chắc chắn đen (tô), ô nào trắng trong mọi cách đặt thì
// chắc chắn trắng (đánh dấu X); lặp tới khi không suy ra thêm được.
// Hết suy luận thì đoán ô có xác suất đen cao nhất (tỉ lệ cách đặt).
// Đi nhanh (250–450ms/nước).
// Dễ: tô ngẫu nhiên 1 ô chưa biết (85% tô / 15% đánh dấu X), đi chậm
// (800–1200ms/nước) — hay tô sai nên thường thua vì hết 3 mạng.

export const BOT_NAMES = ['Kẹo', 'Xôi', 'Gấu Bông', 'Đậu', 'Nấm', 'Sữa', 'Mochi', 'Pudding'];

/* Liệt kê mọi cách đặt các đoạn gợi ý trên 1 hàng dài n, khớp với các
   ô đã biết (known: -1 chưa biết, 0 trắng, 1 đen). Trả về mảng các
   cách đặt (mỗi cách là mảng 0/1 dài n), hoặc [] nếu không có cách nào. */
function linePlacements(n, clues, known) {
  const placements = [];
  if (clues.length === 1 && clues[0] === 0) {
    if (known.every(v => v !== 1)) placements.push(Array(n).fill(0));
    return placements;
  }
  const rec = (runIdx, pos, arr) => {
    if (runIdx === clues.length) {
      for (let i = pos; i < n; i++) {
        if (known[i] === 1) return; /* ô đã biết đen mà đặt trắng: vô lý */
        arr[i] = 0;
      }
      placements.push(arr.slice());
      return;
    }
    const len = clues[runIdx];
    const rest = clues.slice(runIdx + 1).reduce((a, b) => a + b + 1, 0);
    for (let start = pos; start + len + rest <= n; start++) {
      const a2 = arr.slice();
      let ok = true;
      for (let i = pos; i < start; i++) { if (known[i] === 1) { ok = false; break; } a2[i] = 0; }
      if (!ok) continue;
      for (let i = start; i < start + len; i++) { if (known[i] === 0) { ok = false; break; } a2[i] = 1; }
      if (!ok) continue;
      if (runIdx < clues.length - 1) {
        if (known[start + len] === 1) continue;
        a2[start + len] = 0;
        rec(runIdx + 1, start + len + 1, a2);
      } else {
        rec(runIdx + 1, start + len, a2);
      }
    }
  };
  rec(0, 0, Array(n).fill(0));
  return placements;
}

/* Giải 1 hàng: trả về {placements, definiteBlack, definiteWhite} —
   các ô chắc chắn đen/trắng trong mọi cách đặt. null nếu vô nghiệm
   (không xảy ra khi chơi đúng luật vì bảng luôn khớp với đáp án thật). */
const lineCache = new Map();
export function solveLine(n, clues, known) {
  const key = clues.join(',') + '|' + known.join('');
  if (lineCache.has(key)) return lineCache.get(key);
  if (lineCache.size > 20000) lineCache.clear();
  const placements = linePlacements(n, clues, known);
  let out = null;
  if (placements.length) {
    const definiteBlack = new Set(), definiteWhite = new Set();
    for (let i = 0; i < n; i++) {
      if (known[i] !== -1) continue;
      let allBlack = true, allWhite = true;
      for (const p of placements) { if (p[i] === 1) allWhite = false; else allBlack = false; }
      if (allBlack) definiteBlack.add(i);
      else if (allWhite) definiteWhite.add(i);
    }
    out = { placements, definiteBlack, definiteWhite };
  }
  lineCache.set(key, out);
  return out;
}

/* Bảng "đã biết" từ grid thật: 1 = đã tô, 0 = trắng (đánh dấu X hoặc
   bị khóa), -1 = chưa biết. */
function knownFromGrid(grid) {
  return grid.map(row => row.map(v => (v === 1 ? 1 : v === 0 ? -1 : 0)));
}

/* Suy luận tới điểm cố định trên bản sao; trả về nước tô/đánh dấu đầu
   tiên suy ra được (ưu tiên tô), hoặc null nếu không suy ra được gì. */
function deduce(size, rowClues, colClues, grid) {
  const known = knownFromGrid(grid);
  const fillSet = new Set(), markSet = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 0; y < size; y++) {
      const r = solveLine(size, rowClues[y], known[y]);
      if (!r) return null;
      for (const i of r.definiteBlack) if (known[y][i] === -1) { known[y][i] = 1; fillSet.add(y + ',' + i); changed = true; }
      for (const i of r.definiteWhite) if (known[y][i] === -1) { known[y][i] = 0; markSet.add(y + ',' + i); changed = true; }
    }
    for (let x = 0; x < size; x++) {
      const col = known.map(row => row[x]);
      const r = solveLine(size, colClues[x], col);
      if (!r) return null;
      for (const i of r.definiteBlack) if (known[i][x] === -1) { known[i][x] = 1; fillSet.add(i + ',' + x); changed = true; }
      for (const i of r.definiteWhite) if (known[i][x] === -1) { known[i][x] = 0; markSet.add(i + ',' + x); changed = true; }
    }
  }
  for (const k of fillSet) {
    const [y, x] = k.split(',').map(Number);
    if (grid[y][x] === 0) return { type: 'fill', x, y };
  }
  for (const k of markSet) {
    const [y, x] = k.split(',').map(Number);
    if (grid[y][x] === 0) return { type: 'mark', x, y };
  }
  return null;
}

/* Đoán: ô chưa biết có xác suất đen cao nhất (trung bình tỉ lệ cách
   đặt của hàng và cột chứa nó). */
function guessCell(size, rowClues, colClues, grid) {
  const known = knownFromGrid(grid);
  let best = null, bestP = -1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x] !== 0) continue;
      const r = solveLine(size, rowClues[y], known[y]);
      const c = solveLine(size, colClues[x], known.map(row => row[x]));
      if (!r || !c) continue;
      const p = (r.placements.filter(p => p[x] === 1).length + c.placements.filter(p => p[y] === 1).length)
        / (r.placements.length + c.placements.length);
      if (p > bestP) { bestP = p; best = { x, y }; }
    }
  }
  return best;
}

export function botAction(s, pid) {
  const prog = s.prog && s.prog[pid];
  if (!prog || prog.status !== 'playing' || !prog.grid) return null;
  const p = s.players.find(x => x.id === pid);
  const hard = p && p.level === 'hard';
  const size = s.size;
  if (!hard) {
    /* Dễ: tô ngẫu nhiên 1 ô chưa biết */
    const unknown = [];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (prog.grid[y][x] === 0) unknown.push({ x, y });
    if (!unknown.length) return null;
    const pick = unknown[Math.floor(Math.random() * unknown.length)];
    return Math.random() < 0.85 ? { type: 'fill', x: pick.x, y: pick.y } : { type: 'mark', x: pick.x, y: pick.y };
  }
  const d = deduce(size, s.rowClues, s.colClues, prog.grid);
  if (d) return d;
  const g = guessCell(size, s.rowClues, s.colClues, prog.grid);
  if (g) return { type: 'fill', x: g.x, y: g.y };
  return null;
}
export function botDelay(s, pid) {
  const p = s.players.find(x => x.id === pid);
  if (p && p.level === 'hard') return 250 + Math.random() * 200;
  return 800 + Math.random() * 400;
}
export default botAction;
