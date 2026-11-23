// ❌⭕ Cờ Caro – luật chơi (thuần logic, không chạm DOM).
// KHÔNG PHẢI TicTacToe (cờ 3×3 thắng 3 quân): Caro chơi trên bàn LỚN 30×30 ô,
// 2 người X (đi trước) và O luân phiên đặt quân vào ô trống. Thắng khi xếp được
// 5 quân liên tiếp trở lên theo hàng ngang, dọc hoặc chéo — 6 quân trở lên cũng
// thắng; 4 quân (kể cả 4 quân mở 2 đầu) CHƯA thắng. 5 quân thắng ngay cả khi 2 đầu
// đều bị chặn. Hòa khi bàn đầy 900 ô mà không ai đủ 5 quân.
// Engine cho phép truyền kích thước bàn (opts.size, mặc định 30, tối thiểu 5)
// để test được trên bàn nhỏ — luật thắng 5 quân giữ nguyên ở mọi kích thước.
export const SIZE_DEFAULT = 30;
export const SIZE_MIN = 5;
export const WIN_LEN = 5;
export const MARKS = ['X', 'O'];
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
/* tùy chọn phòng (simplenet defaults/optOk): ghế đi đầu (cầm X) */
export const DEFAULT_OPTS = { first: 0 };
export const OPT_CHOICES = { first: [0, 1] };
export const optOk = (k, v) => k in OPT_CHOICES && OPT_CHOICES[k].includes(v);
export const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]]; /* ngang, dọc, chéo \, chéo / */
const clampSize = s => { const n = Number(s); return Number.isInteger(n) && n >= SIZE_MIN && n <= 30 ? n : SIZE_DEFAULT; };
export const idx = (s, x, y) => y * s.size + x;
export const inBoard = (s, x, y) => x >= 0 && y >= 0 && x < s.size && y < s.size;
export const cellAt = (s, x, y) => inBoard(s, x, y) ? s.cells[idx(s, x, y)] : 0;
/* số quân liên tiếp của mark kể từ (x,y) theo 1 hướng (dx,dy), không tính ô gốc */
function runDir(s, x, y, dx, dy, mark) {
  let n = 0, cx = x + dx, cy = y + dy;
  while (inBoard(s, cx, cy) && s.cells[idx(s, cx, cy)] === mark) { n++; cx += dx; cy += dy; }
  return n;
}
/* toàn bộ dãy quân liên tiếp chứa (x,y) theo 1 hướng (cả 2 chiều), tối đa 9 ô */
export function lineThrough(s, x, y, mark) {
  const out = [];
  for (const [dx, dy] of DIRS) {
    const cells = [[x, y]];
    for (let k = 1; k < WIN_LEN + 4; k++) { const cx = x + dx * k, cy = y + dy * k; if (!inBoard(s, cx, cy) || s.cells[idx(s, cx, cy)] !== mark) break; cells.push([cx, cy]); }
    for (let k = 1; k < WIN_LEN + 4; k++) { const cx = x - dx * k, cy = y - dy * k; if (!inBoard(s, cx, cy) || s.cells[idx(s, cx, cy)] !== mark) break; cells.unshift([cx, cy]); }
    if (cells.length >= WIN_LEN) return cells;
  }
  return out;
}
/* dãy thắng (5 quân trở lên) chứa nước vừa đánh, null nếu chưa thắng */
export function winLine(s, x, y) {
  const mark = cellAt(s, x, y);
  if (!mark) return null;
  for (const [dx, dy] of DIRS) {
    const total = 1 + runDir(s, x, y, dx, dy, mark) + runDir(s, x, y, -dx, -dy, mark);
    if (total >= WIN_LEN) return lineThrough(s, x, y, mark);
  }
  return null;
}

export function createGame(players, opts = {}) {
  if (!players || players.length !== 2) throw new Error('Cờ Caro chơi 2 người.');
  const size = clampSize(opts.size);
  const firstIdx = pickFirst(opts); /* ghế đi đầu (cầm X) xoay vòng mỗi ván */
  const st = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0, phase: 'playing',
    size, cells: new Array(size * size).fill(0),
    players: players.map((p, i) => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local,
      level: p.level || null, mark: MARKS[i === firstIdx ? 0 : 1],
    })),
    turn: players[firstIdx].id, turnNo: 1, moveCount: 0,
    firstIdx, firstId: players[firstIdx].id,
    winner: null, draw: false, scores: null, endReason: null,
    lastMove: null, winLine: null, log: [],
  };
  pushLog(st, `🎯 ${players[firstIdx].name} (X) đi trước!`);
  return st;
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.cells) || !Array.isArray(s.players) || s.players.length !== 2) throw new Error('Trạng thái Caro không hợp lệ.');
  if (s.cells.length !== s.size * s.size) throw new Error('Kích thước bàn không khớp.');
  return s;
}
const pIdx = (s, id) => s.players.findIndex(p => p.id === id);
const pOf = (s, id) => s.players.find(p => p.id === id);
const foeOf = (s, id) => s.players.find(p => p.id !== id);
const markOf = (s, pid) => (pOf(s, pid) || {}).mark === 'O' ? 2 : 1;
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };
export const emptyCount = s => s.cells.reduce((a, c) => a + (c === 0 ? 1 : 0), 0);
export function legalMoves(s, pid) {
  if (s.phase !== 'playing' || s.turn !== pid) return [];
  const out = [];
  for (let y = 0; y < s.size; y++) for (let x = 0; x < s.size; x++) if (s.cells[idx(s, x, y)] === 0) out.push({ x, y });
  return out;
}
/* số quân mỗi bên đã đặt (để hiển thị ghế ngồi) */
export function counts(s) {
  let x = 0, o = 0;
  for (const c of s.cells) { if (c === 1) x++; else if (c === 2) o++; }
  return { X: x, O: o };
}

export function applyMove(s, pid, move) {
  if (!move || s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  if (s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  const { x, y } = move;
  if (!Number.isInteger(x) || !Number.isInteger(y)) return { ok: false, reason: 'Tọa độ không hợp lệ.' };
  if (!inBoard(s, x, y)) return { ok: false, reason: 'Ngoài bàn cờ.' };
  if (s.cells[idx(s, x, y)] !== 0) return { ok: false, reason: 'Ô này đã có quân.' };
  const mark = markOf(s, pid);
  s.cells[idx(s, x, y)] = mark;
  s.seq++; s.moveCount++;
  s.lastMove = { by: pid, x, y, mark: me.mark, n: s.seq };
  pushLog(s, `${me.name} (${me.mark}) đánh (${x + 1}, ${y + 1})`);
  const line = winLine(s, x, y);
  if (line) {
    s.phase = 'ended'; s.winner = pid; s.winLine = line.map(([cx, cy]) => idx(s, cx, cy));
    s.endReason = 'five';
    s.scores = s.players.map(p => ({ id: p.id, total: p.id === pid ? 1 : 0 }));
    pushLog(s, `🏆 ${me.name} (${me.mark}) thắng với ${line.length} quân liên tiếp!`, 'win');
    return { ok: true, ended: true, win: true, line };
  }
  if (emptyCount(s) === 0) {
    s.phase = 'ended'; s.draw = true; s.endReason = 'full';
    s.scores = s.players.map(p => ({ id: p.id, total: 0 }));
    pushLog(s, '🤝 Bàn đầy — hòa!', 'win');
    return { ok: true, ended: true, draw: true };
  }
  const foe = foeOf(s, pid);
  s.turn = foe.id; s.turnNo++;
  return { ok: true, ended: false };
}
export const actors = s => (s.phase === 'playing' && s.turn ? [s.turn] : []);
export function viewFor(s, pid) {
  const me = pOf(s, pid);
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, size: s.size, turn: s.turn, turnNo: s.turnNo,
    firstIdx: s.firstIdx, firstId: s.firstId,
    moveCount: s.moveCount, winner: s.winner, draw: s.draw, scores: s.scores,
    endReason: s.endReason, cells: [...s.cells], counts: counts(s),
    players: s.players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null, mark: p.mark })),
    log: s.log.slice(-30), lastMove: s.lastMove, winLine: s.winLine,
    me: pid, myMark: me ? me.mark : null,
  };
}
/* Adapter cho phòng online (simplenet): action { type:'move', x, y }.
   Mỗi nước đi chỉ có tọa độ — 2 bên áp cùng 1 action vào bản engine local
   sẽ ra cùng 1 trạng thái, không có lựa chọn nào nằm ngoài action. */
export function applyAction(s, pid, a, ctx) {
  if (!a || a.type !== 'move') return { ok: false, reason: 'Hành động không hợp lệ.' };
  return applyMove(s, pid, { x: a.x, y: a.y });
}
