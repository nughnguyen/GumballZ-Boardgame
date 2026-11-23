// ❌⭕ TicTacToe – luật chơi (thuần logic, không chạm DOM).
// KHÁC VỚI CỜ CARO — ghi rõ để không nhầm: TicTacToe chơi trên bàn NHỎ 3×3 ô
// (9 ô), 2 người X (đi trước) và O luân phiên đặt quân vào ô trống. Thắng khi
// xếp được 3 quân liên tiếp theo hàng ngang, dọc hoặc chéo — có đúng 8 đường
// thắng (3 ngang, 3 dọc, 2 chéo). Hòa khi bàn đầy 9 ô mà không ai đủ 3 quân.
// Caro thì khác hẳn: bàn LỚN 30×30 ô, thắng 5 quân liên tiếp trở lên.
export const SIZE = 3;
export const WIN_LEN = 3;
export const MARKS = ['X', 'O'];
/* 8 đường thắng (chỉ số ô 0–8, hàng nào cũng đọc trái→phải / trên→dưới) */
export const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], /* 3 hàng ngang */
  [0, 3, 6], [1, 4, 7], [2, 5, 8], /* 3 cột dọc */
  [0, 4, 8], [2, 4, 6], /* 2 đường chéo */
];
export const idx = (s, x, y) => y * SIZE + x;
export const inBoard = (s, x, y) => x >= 0 && y >= 0 && x < SIZE && y < SIZE;
export const cellAt = (s, x, y) => inBoard(s, x, y) ? s.cells[idx(s, x, y)] : 0;
/* đường thắng (3 quân) chứa ô (x,y), null nếu chưa thắng */
export function winLine(s, x, y) {
  const mark = cellAt(s, x, y);
  if (!mark) return null;
  const n = idx(s, x, y);
  for (const line of WIN_LINES) {
    if (!line.includes(n)) continue;
    if (line.every(i => s.cells[i] === mark)) return line.map(i => [i % SIZE, Math.floor(i / SIZE)]);
  }
  return null;
}

export function createGame(players, opts = {}) {
  if (!players || players.length !== 2) throw new Error('TicTacToe chơi 2 người.');
  /* 🎯 lượt đầu xoay qua các ván: chủ phòng truyền opts.firstIdx (ván đầu
     ghế 0, ván sau ghế kế tiếp); không truyền thì mặc định ghế 0 để các
     test/luật cũ vẫn ổn định. Quân X/O vẫn theo ghế, chỉ lượt đi đổi. */
  const firstIdx = Number.isInteger(opts.firstIdx) && opts.firstIdx >= 0 && opts.firstIdx < players.length ? opts.firstIdx : 0;
  const first = players[firstIdx];
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0, phase: 'playing',
    size: SIZE, cells: new Array(SIZE * SIZE).fill(0),
    players: players.map((p, i) => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local,
      level: p.level || null, mark: MARKS[i],
    })),
    turn: first.id, turnNo: 1, moveCount: 0,
    firstIdx, firstId: first.id,
    winner: null, draw: false, scores: null, endReason: null,
    lastMove: null, winLine: null, log: [],
  };
  pushLog(s, `🎯 ${first.name} (${MARKS[firstIdx]}) đi trước.`, 'first');
  return s;
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.cells) || !Array.isArray(s.players) || s.players.length !== 2) throw new Error('Trạng thái TicTacToe không hợp lệ.');
  if (s.cells.length !== SIZE * SIZE) throw new Error('Kích thước bàn không khớp.');
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
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (s.cells[idx(s, x, y)] === 0) out.push({ x, y });
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
    s.endReason = 'three';
    s.scores = s.players.map(p => ({ id: p.id, total: p.id === pid ? 1 : 0 }));
    pushLog(s, `🏆 ${me.name} (${me.mark}) thắng với 3 quân liên tiếp!`, 'win');
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
    moveCount: s.moveCount, winner: s.winner, draw: s.draw, scores: s.scores,
    firstIdx: s.firstIdx ?? 0, firstId: s.firstId || s.turn,
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
