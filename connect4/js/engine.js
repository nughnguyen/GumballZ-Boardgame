// 🔴🟡 Connect 4 (Bốn quân liên tiếp) – luật chơi (thuần logic, không chạm DOM).
// Bàn 7 cột × 6 hàng. Đỏ (R) đi trước. Mỗi lượt thả 1 quân vào 1 cột —
// quân rơi xuống ô trống thấp nhất của cột đó. 4 quân cùng màu liên tiếp
// theo hàng ngang, hàng dọc hoặc đường chéo thì thắng. Bàn đầy (42 quân)
// mà không ai được 4 thì hòa.
// Mã ô: 0 trống, 1 Đỏ, 2 Vàng. idx = y * 7 + x (y = 0 là hàng trên cùng).
// - Nước đi hợp lệ: cột chưa đầy (còn ô trống).
// - Chặn (block): nước đi vào đúng cột mà đối thủ thả vào sẽ thắng ngay —
//   engine đếm số lần chặn của mỗi người (blocks) để làm thành tích.
// - Hòa thêm: cả 2 đồng ý hòa; xin thua nhận thua ngay.
export const W = 7, H = 6;
export const SIDES = ['R', 'Y'];
export const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
export const idx = (x, y) => y * W + x;
export const inBoard = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
export const sideOf = v => (v === 1 ? 'R' : v === 2 ? 'Y' : null);
export const foeSide = s => (s === 'R' ? 'Y' : 'R');
export const colName = c => 'cột ' + (c + 1);
export const cellOf = (cells, x, y) => (inBoard(x, y) ? cells[idx(x, y)] : 0);
/* hàng thấp nhất còn trống của cột c (-1 nếu cột đầy) */
export function landingRow(cells, c) {
  for (let y = H - 1; y >= 0; y--) if (cells[idx(c, y)] === 0) return y;
  return -1;
}
export const isColFull = (cells, c) => landingRow(cells, c) === -1;
export const legalCols = cells => { const out = []; for (let c = 0; c < W; c++) if (!isColFull(cells, c)) out.push(c); return out; };
/* đếm quân cùng màu liên tiếp qua (x,y) theo hướng (dx,dy), cả 2 chiều */
function runLen(cells, v, x, y, dx, dy) {
  let n = 1, cellsOut = [{ x, y }];
  for (const s of [1, -1]) {
    let cx = x + dx * s, cy = y + dy * s;
    while (inBoard(cx, cy) && cells[idx(cx, cy)] === v) { n++; cellsOut.push({ x: cx, y: cy }); cx += dx * s; cy += dy * s; }
  }
  return { n, cells: cellsOut };
}
/* kiểm tra nước vừa thả ở (x,y) có tạo thành 4 liên tiếp không.
   Trả về { win: true, line: [{x,y}×4], dir } hoặc { win: false }. */
export function checkWin(cells, x, y) {
  const v = cells[idx(x, y)];
  if (!v) return { win: false };
  for (const [dx, dy] of DIRS) {
    const r = runLen(cells, v, x, y, dx, dy);
    if (r.n >= 4) {
      /* lấy đúng 4 quân liên tiếp chứa (x,y): xếp theo hướng rồi cắt */
      const sorted = r.cells.slice().sort((a, b) => (a.x * dx + a.y * dy) - (b.x * dx + b.y * dy));
      const me = sorted.findIndex(c => c.x === x && c.y === y);
      const start = Math.max(0, Math.min(me, sorted.length - 4));
      const line = sorted.slice(start, start + 4);
      const orient = dx === 1 && dy === 0 ? 'h' : dx === 0 && dy === 1 ? 'v' : 'd';
      return { win: true, line, dir: orient };
    }
  }
  return { win: false };
}
/* đối thủ có thắng ngay nếu thả vào cột c không? (dùng để tính "chặn") */
export function oppWouldWin(cells, side, c) {
  const r = landingRow(cells, c);
  if (r === -1) return false;
  const v = side === 'R' ? 1 : 2;
  const t = cells.slice();
  t[idx(c, r)] = v;
  return checkWin(t, c, r).win;
}
export const counts = cells => {
  let R = 0, Y = 0;
  for (const c of cells) { if (c === 1) R++; else if (c === 2) Y++; }
  return { R, Y, total: R + Y };
};

export const OPT_CHOICES = { side: ['red', 'yellow', 'random'], timer: [0, 30, 60] };

export function createGame(players, opts = {}) {
  if (!players || players.length !== 2) throw new Error('Connect 4 chơi 2 người.');
  const sideOpt = OPT_CHOICES.side.includes(opts.side) ? opts.side : 'red';
  const hostSide = sideOpt === 'random' ? (Math.random() < 0.5 ? 'R' : 'Y') : (sideOpt === 'yellow' ? 'Y' : 'R');
  const timer = OPT_CHOICES.timer.includes(+opts.timer) ? +opts.timer : 0;
  const red = players.find((p, i) => (i === 0 ? hostSide === 'R' : hostSide === 'Y'));
  return {
    gid: Math.random().toString(36).slice(2, 9), seq: 0, phase: 'playing',
    cells: new Array(W * H).fill(0),
    players: players.map((p, i) => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local,
      level: p.level || null, side: i === 0 ? hostSide : (hostSide === 'R' ? 'Y' : 'R'),
    })),
    turn: red.id, turnNo: 1, moveCount: 0,
    lastMove: null, blocks: {},
    drawOffer: null, timer,
    winner: null, draw: false, endReason: null, log: [],
  };
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.cells) || s.cells.length !== W * H || !Array.isArray(s.players) || s.players.length !== 2) throw new Error('Trạng thái Connect 4 không hợp lệ.');
  return s;
}
const pIdx = (s, id) => s.players.findIndex(p => p.id === id);
const pOf = (s, id) => s.players.find(p => p.id === id);
const foeOf = (s, id) => s.players.find(p => p.id !== id);
const sideOfPlayer = (s, pid) => (pOf(s, pid) || {}).side;
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

export function legalMoves(s, pid) {
  if (s.phase !== 'playing' || s.turn !== pid) return [];
  return legalCols(s.cells).map(c => ({ col: c, row: landingRow(s.cells, c) }));
}
export function legalMoveAt(s, pid, col) {
  if (s.phase !== 'playing' || s.turn !== pid) return null;
  if (!Number.isInteger(col) || col < 0 || col >= W) return null;
  const row = landingRow(s.cells, col);
  return row === -1 ? null : { col, row };
}

function endGame(s, winnerId, reason) {
  s.phase = 'ended'; s.winner = winnerId || null; s.endReason = reason; s.seq++;
  s.drawOffer = null;
}
export function applyMove(s, pid, move) {
  if (!move || s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  if (s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  const col = move.col;
  if (!Number.isInteger(col) || col < 0 || col >= W) return { ok: false, reason: 'Ngoài bàn cờ.' };
  const row = landingRow(s.cells, col);
  if (row === -1) return { ok: false, reason: 'Cột này đã đầy.' };
  /* nước này có chặn đối thủ thắng ngay không? (tính trước khi thả) */
  const foe = foeOf(s, pid);
  const blocked = oppWouldWin(s.cells, foe.side, col);
  if (blocked) s.blocks[pid] = (s.blocks[pid] || 0) + 1;
  const v = me.side === 'R' ? 1 : 2;
  s.cells[idx(col, row)] = v;
  s.seq++; s.moveCount++;
  s.drawOffer = null;
  const win = checkWin(s.cells, col, row);
  const c = counts(s.cells);
  const sideName = me.side === 'R' ? '🔴 Đỏ' : '🟡 Vàng';
  s.lastMove = { by: pid, col, row, n: s.seq, winLine: win.win ? win.line : null, winDir: win.win ? win.dir : null, blocked };
  pushLog(s, `${me.name} (${sideName}) thả ${colName(col)}${blocked ? ' — chặn nước thắng của đối thủ! 🛡️' : ''} (${c.R}–${c.Y})`);
  if (win.win) {
    const dirName = win.dir === 'h' ? 'ngang' : win.dir === 'v' ? 'dọc' : 'chéo';
    endGame(s, pid, 'four');
    pushLog(s, `🏆 ${me.name} thắng — 4 quân ${dirName} liên tiếp!`, 'win');
    return { ok: true, ended: true, win: true, dir: win.dir, blocked };
  }
  if (c.total >= W * H) {
    endGame(s, null, 'draw');
    s.draw = true;
    pushLog(s, '🤝 Hòa — bàn đầy 42 quân, không ai được 4!', 'win');
    return { ok: true, ended: true, draw: true, blocked };
  }
  s.turn = foe.id; s.turnNo++;
  return { ok: true, ended: false, blocked };
}

export function applyResign(s, pid) {
  if (s.phase === 'ended') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  const foe = foeOf(s, pid);
  endGame(s, foe.id, 'resign');
  pushLog(s, `${me.name} xin thua — 🏆 ${foe.name} thắng!`, 'win');
  return { ok: true, ended: true };
}

/* hòa: đề nghị / đồng ý / hủy đề nghị / từ chối */
export function applyDraw(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  if (s.drawOffer === pid) {
    s.drawOffer = null; s.seq++;
    pushLog(s, `${me.name} rút đề nghị hòa.`);
    return { ok: true, cancelled: true };
  }
  if (s.drawOffer) {
    endGame(s, null, 'draw-agree');
    s.draw = true;
    pushLog(s, `🤝 ${me.name} đồng ý hòa — ván hòa!`, 'win');
    return { ok: true, ended: true, agreed: true };
  }
  s.drawOffer = pid; s.seq++;
  pushLog(s, `${me.name} đề nghị hòa 🤝`);
  return { ok: true, offered: true };
}
export function applyDrawDecline(s, pid) {
  if (s.phase !== 'playing' || !s.drawOffer || s.drawOffer === pid) return { ok: false, reason: 'Không có đề nghị hòa nào.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  const offerer = pOf(s, s.drawOffer);
  s.drawOffer = null; s.seq++;
  pushLog(s, `${me.name} từ chối hòa — ván tiếp tục!`);
  return { ok: true, declined: true, offerer: offerer ? offerer.id : null };
}

export const actors = s => (s.phase === 'playing' && s.turn ? [s.turn] : []);
export function viewFor(s, pid) {
  const me = pOf(s, pid);
  const c = counts(s.cells);
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, turn: s.turn, turnNo: s.turnNo,
    moveCount: s.moveCount, winner: s.winner, draw: s.draw,
    endReason: s.endReason, cells: [...s.cells], counts: c,
    lastMove: s.lastMove, blocks: { ...s.blocks },
    drawOffer: s.drawOffer, timer: s.timer,
    players: s.players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null, side: p.side })),
    log: s.log.slice(-30),
    me: pid, mySide: me ? me.side : null,
  };
}
/* Adapter cho phòng online (simplenet): action { type, col? }.
   Cả 2 bên áp cùng 1 action sẽ ra cùng 1 trạng thái. */
export function applyAction(s, pid, a, ctx) {
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'move': return applyMove(s, pid, { col: a.col });
    case 'resign': return applyResign(s, pid);
    case 'draw': return applyDraw(s, pid);
    case 'draw-decline': return applyDrawDecline(s, pid);
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}
