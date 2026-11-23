// ⚫⚪ Cờ Vây (Go) – luật chơi (thuần logic, không chạm DOM).
// 2 người: Đen (B, đi trước) và Trắng (W), đặt quân vào GIAO ĐIỂM.
// Quân cùng màu kề nhau tạo thành NHÓM; nhóm còn "khí" (ô trống kề nhóm)
// thì sống, hết khí thì bị ăn (gỡ khỏi bàn, tính là tù binh của đối thủ).
// Cấm TỰ SÁT (đặt quân mà nhóm mới không còn khí và không ăn được quân nào).
// Luật KO: không được đánh 1 nước làm bàn cờ trở lại đúng vị trí của 1 nước
// trước đó — engine giữ hash của bàn trước nước vừa đánh (prevHash) để chặn.
// Bỏ lượt 2 lần liên tiếp thì vào giai đoạn TÍNH ĐIỂM (kiểu Trung Quốc:
// đá còn trên bàn + đất bao được + komi 7,5 cho Trắng; quân đánh dấu chết
// bị gỡ ra và tính là tù binh của đối thủ để hiển thị).
// Engine cho phép chọn kích thước bàn 9×9 / 13×13 / 19×19 (opts.size,
// mặc định 19) — luật giữ nguyên ở mọi kích thước.
export const SIZES = [9, 13, 19];
export const SIZE_DEFAULT = 19;
export const KOMI = 7.5;
export const MARKS = ['B', 'W'];
/* lượt đi đầu xoay vòng: opts.first (0/1) thắng; không có thì gieo theo opts.seed */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pickFirst = (opts = {}) => {
  if (opts.first === 0 || opts.first === 1) return opts.first;
  if (!Number.isInteger(opts.seed)) return 0; /* mặc định như trước: ghế 0 đi trước (chỉ gieo khi gọi với seed) */
  return Math.floor(mulberry32(opts.seed)() * 2);
};
/* ván sau đổi người đi trước */
export const rotateFirst = (prev, n = 2) => (((prev == null ? 0 : prev) + 1) % n + n) % n;
export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]]; /* 4 hướng kề */
export const idx = (s, x, y) => y * s.size + x;
export const inBoard = (s, x, y) => x >= 0 && y >= 0 && x < s.size && y < s.size;
export const cellAt = (s, x, y) => inBoard(s, x, y) ? s.cells[idx(s, x, y)] : 0;
/* tên cột theo chuẩn Cờ Vây: A B C D E F G H J K … (bỏ chữ I) */
export const COL_LETTERS = 'ABCDEFGHJKLMNOPQRST';
export const colLabel = x => COL_LETTERS[x] || String(x + 1);
export const coordName = (x, y) => colLabel(x) + (y + 1);
/* điểm sao (hoshi) chuẩn của từng kích thước bàn */
export function hoshiPoints(size) {
  if (size === 9) return [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]];
  if (size === 13) return [[3, 3], [9, 3], [6, 3], [3, 6], [6, 6], [9, 6], [3, 9], [9, 9], [6, 9]];
  return [[3, 3], [9, 3], [15, 3], [3, 9], [9, 9], [15, 9], [3, 15], [9, 15], [15, 15]];
}
const hashCells = cells => cells.join('');

export function createGame(players, opts = {}) {
  if (!players || players.length !== 2) throw new Error('Cờ Vây chơi 2 người.');
  const size = SIZES.includes(Number(opts.size)) ? Number(opts.size) : SIZE_DEFAULT;
  const prisoners = {};
  prisoners[players[0].id] = 0; prisoners[players[1].id] = 0;
  const firstIdx = pickFirst(opts); /* ghế đi đầu (cầm Đen) xoay vòng mỗi ván */
  const st = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0, phase: 'playing',
    size, cells: new Array(size * size).fill(0),
    players: players.map((p, i) => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local,
      level: p.level || null, mark: MARKS[i === firstIdx ? 0 : 1],
    })),
    turn: players[firstIdx].id, turnNo: 1, moveCount: 0,
    firstIdx, firstId: players[firstIdx].id,
    passes: 0, prevHash: null, lastMove: null,
    prisoners, dead: [], scores: null,
    winner: null, draw: false, endReason: null, log: [],
  };
  pushLog(st, `🎯 ${players[firstIdx].name} (⚫ Đen) đi trước!`);
  return st;
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.cells) || !Array.isArray(s.players) || s.players.length !== 2) throw new Error('Trạng thái Cờ Vây không hợp lệ.');
  if (!SIZES.includes(s.size) || s.cells.length !== s.size * s.size) throw new Error('Kích thước bàn không khớp.');
  return s;
}
const pIdx = (s, id) => s.players.findIndex(p => p.id === id);
const pOf = (s, id) => s.players.find(p => p.id === id);
const foeOf = (s, id) => s.players.find(p => p.id !== id);
const markOf = (s, pid) => (pOf(s, pid) || {}).mark === 'W' ? 2 : 1;
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };
export const emptyCount = s => s.cells.reduce((a, c) => a + (c === 0 ? 1 : 0), 0);
export const counts = s => { let B = 0, W = 0; for (const c of s.cells) { if (c === 1) B++; else if (c === 2) W++; } return { B, W }; };

/* nhóm chứa giao điểm (x,y) trên mảng cells: các quân cùng màu kề nhau +
   tập hợp khí (ô trống kề nhóm). Trả null nếu ô trống. */
export function groupAt(cells, size, x, y) {
  const mark = cells[y * size + x];
  if (!mark) return null;
  const stones = [], liberties = new Set(), seen = new Set([y * size + x]);
  const stack = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop();
    stones.push(cy * size + cx);
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const ni = ny * size + nx, v = cells[ni];
      if (v === 0) liberties.add(ni);
      else if (v === mark && !seen.has(ni)) { seen.add(ni); stack.push([nx, ny]); }
    }
  }
  return { mark, stones, liberties };
}

/* Thử đặt quân mark vào (x,y). Trả { ok, cells, captured } nếu hợp lệ,
   hoặc { ok:false, reason } nếu không: 'occupied' (đã có quân),
   'suicide' (tự sát), 'ko' (làm bàn trở lại vị trí 1 nước trước). */
export function tryPlace(cells, size, x, y, mark, prevHash) {
  const i = y * size + x;
  if (cells[i] !== 0) return { ok: false, reason: 'occupied' };
  const next = cells.slice();
  next[i] = mark;
  const foe = mark === 1 ? 2 : 1;
  const captured = [];
  for (const [dx, dy] of DIRS) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
    const ni = ny * size + nx;
    if (next[ni] !== foe) continue;
    const g = groupAt(next, size, nx, ny);
    if (g && g.liberties.size === 0) for (const si of g.stones) { next[si] = 0; captured.push(si); }
  }
  if (captured.length === 0) {
    const g = groupAt(next, size, x, y);
    if (!g || g.liberties.size === 0) return { ok: false, reason: 'suicide' };
  }
  if (prevHash != null && hashCells(next) === prevHash) return { ok: false, reason: 'ko' };
  return { ok: true, cells: next, captured };
}

export function legalMoves(s, pid) {
  if (s.phase !== 'playing' || s.turn !== pid) return [];
  const mark = markOf(s, pid);
  const out = [];
  for (let y = 0; y < s.size; y++) for (let x = 0; x < s.size; x++) {
    if (s.cells[idx(s, x, y)] !== 0) continue;
    if (tryPlace(s.cells, s.size, x, y, mark, s.prevHash).ok) out.push({ x, y });
  }
  return out;
}

export function applyMove(s, pid, move) {
  if (!move || s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  if (s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  const { x, y } = move;
  if (!Number.isInteger(x) || !Number.isInteger(y)) return { ok: false, reason: 'Tọa độ không hợp lệ.' };
  if (!inBoard(s, x, y)) return { ok: false, reason: 'Ngoài bàn cờ.' };
  if (s.cells[idx(s, x, y)] !== 0) return { ok: false, reason: 'Giao điểm này đã có quân.' };
  const mark = markOf(s, pid);
  const sim = tryPlace(s.cells, s.size, x, y, mark, s.prevHash);
  if (!sim.ok) {
    const msg = sim.reason === 'suicide' ? 'Nước tự sát — không được đặt quân vào chỗ không còn khí mà không ăn được quân nào.'
      : sim.reason === 'ko' ? 'Phạm luật ko — không được đánh lại ngay để bàn trở về vị trí 1 nước trước.'
      : 'Nước đi không hợp lệ.';
    return { ok: false, reason: msg };
  }
  s.prevHash = hashCells(s.cells); /* vị trí trước nước này: nước sau không được tái tạo nó (ko) */
  s.cells = sim.cells;
  s.seq++; s.moveCount++; s.passes = 0;
  if (sim.captured.length) s.prisoners[pid] = (s.prisoners[pid] || 0) + sim.captured.length;
  s.lastMove = { by: pid, x, y, mark: me.mark, n: s.seq, captured: sim.captured.length };
  pushLog(s, `${me.name} (${me.mark === 'B' ? '⚫ Đen' : '⚪ Trắng'}) đánh ${coordName(x, y)}${sim.captured.length ? ` — ăn ${sim.captured.length} quân!` : ''}`);
  const foe = foeOf(s, pid);
  s.turn = foe.id; s.turnNo++;
  return { ok: true, ended: false, captured: sim.captured.length };
}

export function applyPass(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  if (s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  s.prevHash = hashCells(s.cells); /* bỏ lượt cũng "xả" ko: vị trí trước nước này là vị trí hiện tại */
  s.seq++; s.passes++;
  s.lastMove = { by: pid, pass: true, n: s.seq };
  pushLog(s, `${me.name} bỏ lượt.`);
  const foe = foeOf(s, pid);
  s.turn = foe.id; s.turnNo++; /* lượt vẫn đổi — nếu đánh tiếp thì tới lượt người còn lại */
  if (s.passes >= 2) {
    s.phase = 'scoring';
    pushLog(s, 'Cả 2 bên cùng bỏ lượt — chuyển sang tính điểm. Bấm vào 1 nhóm quân để đánh dấu nhóm đó chết hay sống, rồi bấm Chốt điểm.', 'win');
    return { ok: true, ended: false, scoring: true };
  }
  return { ok: true, ended: false };
}

export function applyResign(s, pid) {
  if (s.phase === 'ended') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  const foe = foeOf(s, pid);
  s.phase = 'ended'; s.winner = foe.id; s.endReason = 'resign'; s.seq++;
  pushLog(s, `${me.name} xin thua — 🏆 ${foe.name} thắng!`, 'win');
  return { ok: true, ended: true };
}

/* Tính điểm kiểu Trung Quốc (area scoring): quân chết coi như ô trống rồi mới
   tính. Đá trên bàn + đất (vùng trống chỉ kề 1 màu) + komi 7,5 cho Trắng.
   Tù binh (quân ăn được trong ván + quân chết của đối thủ) chỉ để hiển thị,
   không cộng vào điểm.
   "Đất" phải được vây kín: vùng trống chạm mép bàn chỉ tính khi bức tường
   bao nó có ít nhất 1 quân chạm mép bàn — nếu không, vùng đó còn mở ra cả
   bàn (đối thủ đi vào được từ mép bàn) nên không tính cho bên nào. Nhờ vậy
   mà bàn còn trống trơn không tự dưng thành đất của 1 bên. */
export function computeScores(s) {
  const size = s.size;
  const deadSet = new Set(s.dead);
  const cells = s.cells.map((c, i) => deadSet.has(i) ? 0 : c);
  const onEdge = i => { const x = i % size, y = Math.floor(i / size); return x === 0 || y === 0 || x === size - 1 || y === size - 1; };
  const seen = new Set();
  const territory = { 1: 0, 2: 0 };
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] !== 0 || seen.has(i)) continue;
    const region = [], borders = new Set();
    let touchesEdge = false, borderOnEdge = false;
    const stack = [i]; seen.add(i);
    while (stack.length) {
      const cur = stack.pop(); region.push(cur);
      if (onEdge(cur)) touchesEdge = true;
      const cx = cur % size, cy = Math.floor(cur / size);
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        const ni = ny * size + nx;
        if (cells[ni] === 0) { if (!seen.has(ni)) { seen.add(ni); stack.push(ni); } }
        else { borders.add(cells[ni]); if (onEdge(ni)) borderOnEdge = true; }
      }
    }
    if (borders.size === 1 && (!touchesEdge || borderOnEdge)) territory[[...borders][0]] += region.length;
  }
  return s.players.map(p => {
    const mark = p.mark === 'W' ? 2 : 1;
    let stones = 0;
    for (let i = 0; i < cells.length; i++) if (cells[i] === mark) stones++;
    const deadOpp = s.dead.filter(di => s.cells[di] === (mark === 1 ? 2 : 1)).length;
    const prisoners = (s.prisoners[p.id] || 0) + deadOpp;
    const komi = p.mark === 'W' ? KOMI : 0;
    return { id: p.id, name: p.name, mark: p.mark, stones, territory: territory[mark], prisoners, komi, total: stones + territory[mark] + komi };
  });
}

export function applyToggleDead(s, pid, x, y) {
  if (s.phase !== 'scoring') return { ok: false, reason: 'Chưa tới lúc tính điểm.' };
  if (!pOf(s, pid)) return { ok: false };
  if (!Number.isInteger(x) || !Number.isInteger(y) || !inBoard(s, x, y)) return { ok: false, reason: 'Ngoài bàn cờ.' };
  const i = idx(s, x, y);
  if (s.cells[i] === 0) return { ok: false, reason: 'Chỗ này không có quân.' };
  const g = groupAt(s.cells, s.size, x, y);
  if (!g) return { ok: false };
  const deadSet = new Set(s.dead);
  const allDead = g.stones.every(si => deadSet.has(si));
  if (allDead) for (const si of g.stones) deadSet.delete(si);
  else for (const si of g.stones) deadSet.add(si);
  s.dead = [...deadSet].sort((a, b) => a - b);
  s.seq++;
  return { ok: true, ended: false };
}

export function applyFinish(s, pid) {
  if (s.phase !== 'scoring') return { ok: false, reason: 'Chưa tới lúc tính điểm.' };
  if (!pOf(s, pid)) return { ok: false };
  s.scores = computeScores(s);
  s.phase = 'ended'; s.endReason = 'scored'; s.seq++;
  const [a, b] = s.scores;
  s.winner = a.total > b.total ? a.id : b.id; /* komi 7,5 nên không bao giờ hòa */
  const w = s.players.find(p => p.id === s.winner);
  pushLog(s, `🏁 Tính điểm xong — ${w.name} thắng ${a.total} – ${b.total}!`, 'win');
  return { ok: true, ended: true };
}

export function applyResume(s, pid) {
  if (s.phase !== 'scoring') return { ok: false, reason: 'Ván đang đánh, không cần đánh tiếp.' };
  if (!pOf(s, pid)) return { ok: false };
  s.phase = 'playing'; s.dead = []; s.passes = 0; s.seq++;
  const me = pOf(s, pid);
  pushLog(s, `${me.name} muốn đánh tiếp — ván tiếp tục, các quân đánh dấu chết đã gỡ.`);
  return { ok: true, ended: false };
}

export const actors = s => (s.phase === 'playing' && s.turn ? [s.turn] : []);
export function viewFor(s, pid) {
  const me = pOf(s, pid);
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, size: s.size, turn: s.turn, turnNo: s.turnNo,
    firstIdx: s.firstIdx, firstId: s.firstId,
    moveCount: s.moveCount, passes: s.passes, winner: s.winner, draw: s.draw,
    endReason: s.endReason, cells: [...s.cells], dead: [...s.dead], lastMove: s.lastMove,
    prisoners: { ...s.prisoners }, scores: s.scores,
    scorePreview: s.phase === 'scoring' ? computeScores(s) : null,
    players: s.players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null, mark: p.mark })),
    log: s.log.slice(-30),
    me: pid, myMark: me ? me.mark : null,
  };
}
/* Adapter cho phòng online (simplenet): action { type, x?, y? }.
   Mọi lựa chọn (đánh / bỏ lượt / xin thua / đánh dấu chết / chốt điểm /
   đánh tiếp) đều nằm trong action nên 2 bên áp cùng 1 action sẽ ra cùng
   1 trạng thái. */
export function applyAction(s, pid, a, ctx) {
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'move': return applyMove(s, pid, { x: a.x, y: a.y });
    case 'pass': return applyPass(s, pid);
    case 'resign': return applyResign(s, pid);
    case 'toggleDead': return applyToggleDead(s, pid, a.x, a.y);
    case 'finish': return applyFinish(s, pid);
    case 'resume': return applyResume(s, pid);
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}

/* Tùy chọn phòng (simplenet defaults/optOk): chủ phòng chọn kích thước bàn
   trong phòng chờ; giá trị lạ gửi từ khách bị từ chối. `first`: ghế đi đầu
   (cầm Đen) — xoay vòng mỗi ván, phòng chờ hiện huy hiệu 🎯 ở người đó. */
export const DEFAULT_OPTS = { size: SIZE_DEFAULT, first: 0 };
export const OPT_CHOICES = { size: SIZES, first: [0, 1] };
export const optOk = (k, v) => k in OPT_CHOICES && OPT_CHOICES[k].includes(v);
