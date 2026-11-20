// 🔄 Cờ Lật (Reversi / Othello) – luật chơi (thuần logic, không chạm DOM).
// Bàn 8×8. Đen (B) đi trước. Vị trí xuất phát: 4 quân ở giữa bàn —
// d5 Trắng, e5 Đen, d4 Đen, e4 Trắng (x=0..7 là a..h, y=0..7 là hàng 8..1) —
// thế cờ chuẩn (2 quân chéo cùng màu ở giữa bàn).
// Mã ô: 0 trống, 1 Đen, 2 Trắng.
// - Đặt 1 quân vào ô trống sao cho theo ít nhất 1 trong 8 hướng, quân đó
//   kẹp 1 dãy quân địch liên tiếp giữa nó và 1 quân mình có sẵn — toàn bộ
//   quân địch bị kẹp đều lật sang màu của mình.
// - Hết nước đi thì BỎ LƯỢT (tự động): đối thủ đi tiếp; nếu cả 2 đều hết
//   nước thì ván kết thúc. Bàn đầy (64 quân) cũng kết thúc ván.
// - Thắng: nhiều quân hơn khi ván kết thúc. Hòa khi 2 bên bằng quân nhau.
// - Hòa thêm: cả 2 đồng ý hòa; xin thua nhận thua ngay.
export const W = 8, H = 8;
export const SIDES = ['B', 'W'];
export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
export const idx = (x, y) => y * W + x;
export const inBoard = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
export const sideOf = v => (v === 1 ? 'B' : v === 2 ? 'W' : null);
export const foeSide = s => (s === 'B' ? 'W' : 'B');
export const coordName = (x, y) => String.fromCharCode(97 + x) + (8 - y);
export const cellOf = (cells, x, y) => (inBoard(x, y) ? cells[idx(x, y)] : 0);

/* các quân địch bị lật theo 1 hướng từ (x,y) nếu đặt quân phe side vào đó */
function flipsInDir(cells, side, x, y, dx, dy) {
  const foe = foeSide(side);
  const out = [];
  let cx = x + dx, cy = y + dy;
  while (inBoard(cx, cy)) {
    const v = cells[idx(cx, cy)];
    if (v === 0) return [];
    if (sideOf(v) === side) return out.length ? out : [];
    out.push({ x: cx, y: cy });
    cx += dx; cy += dy;
  }
  return [];
}
/* mọi nước đi hợp lệ của phe side trên mảng cells.
   Mỗi nước: { x, y, flips: [{x,y}...] } */
export function genMovesFor(cells, side) {
  const out = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (cells[idx(x, y)] !== 0) continue;
    const flips = [];
    for (const [dx, dy] of DIRS) flips.push(...flipsInDir(cells, side, x, y, dx, dy));
    if (flips.length) out.push({ x, y, flips });
  }
  return out;
}
export const hasAnyMove = (cells, side) => genMovesFor(cells, side).length > 0;
/* áp 1 nước lên bản sao của mảng cells, trả mảng mới (dùng cho bot tìm kiếm) */
export function applyToCells(cells, side, m) {
  const c = cells.slice();
  c[idx(m.x, m.y)] = side === 'B' ? 1 : 2;
  for (const f of m.flips) c[idx(f.x, f.y)] = side === 'B' ? 1 : 2;
  return c;
}
export const counts = cells => {
  let B = 0, W = 0;
  for (const c of cells) { if (c === 1) B++; else if (c === 2) W++; }
  return { B, W, total: B + W };
};
export const cornersOf = (cells, side) => {
  const v = side === 'B' ? 1 : 2;
  let n = 0;
  for (const [x, y] of [[0, 0], [7, 0], [0, 7], [7, 7]]) if (cells[idx(x, y)] === v) n++;
  return n;
};

function startCells() {
  const cells = new Array(W * H).fill(0);
  cells[idx(3, 3)] = 2; cells[idx(4, 3)] = 1;
  cells[idx(3, 4)] = 1; cells[idx(4, 4)] = 2;
  return cells;
}

export const OPT_CHOICES = { side: ['black', 'white', 'random'], timer: [0, 30, 60] };

export function createGame(players, opts = {}) {
  if (!players || players.length !== 2) throw new Error('Cờ Lật chơi 2 người.');
  const sideOpt = OPT_CHOICES.side.includes(opts.side) ? opts.side : 'black';
  const hostSide = sideOpt === 'random' ? (Math.random() < 0.5 ? 'B' : 'W') : (sideOpt === 'white' ? 'W' : 'B');
  const timer = OPT_CHOICES.timer.includes(+opts.timer) ? +opts.timer : 0;
  const black = players.find((p, i) => (i === 0 ? hostSide === 'B' : hostSide === 'W'));
  return {
    gid: Math.random().toString(36).slice(2, 9), seq: 0, phase: 'playing',
    cells: startCells(),
    players: players.map((p, i) => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local,
      level: p.level || null, side: i === 0 ? hostSide : (hostSide === 'B' ? 'W' : 'B'),
    })),
    turn: black.id, turnNo: 1, moveCount: 0,
    lastMove: null, lastPass: null, passStreak: 0,
    drawOffer: null, timer,
    winner: null, draw: false, endReason: null, log: [],
  };
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.cells) || s.cells.length !== W * H || !Array.isArray(s.players) || s.players.length !== 2) throw new Error('Trạng thái Cờ Lật không hợp lệ.');
  return s;
}
const pIdx = (s, id) => s.players.findIndex(p => p.id === id);
const pOf = (s, id) => s.players.find(p => p.id === id);
const foeOf = (s, id) => s.players.find(p => p.id !== id);
const sideOfPlayer = (s, pid) => (pOf(s, pid) || {}).side;
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

export function legalMoves(s, pid) {
  if (s.phase !== 'playing' || s.turn !== pid) return [];
  return genMovesFor(s.cells, sideOfPlayer(s, pid));
}
/* nước đi hợp lệ tại ô (x,y) của người tới lượt (để hiện gợi ý lật) */
export function legalMoveAt(s, pid, x, y) {
  if (s.phase !== 'playing' || s.turn !== pid) return null;
  if (!inBoard(x, y) || s.cells[idx(x, y)] !== 0) return null;
  return genMovesFor(s.cells, sideOfPlayer(s, pid)).find(m => m.x === x && m.y === y) || null;
}

function endGame(s, winnerId, reason) {
  s.phase = 'ended'; s.winner = winnerId || null; s.endReason = reason; s.seq++;
  s.drawOffer = null;
}
function finishByCount(s) {
  const c = counts(s.cells);
  if (c.B === c.W) {
    endGame(s, null, 'draw');
    s.draw = true;
    pushLog(s, `🤝 Hòa ${c.B}–${c.W} — 2 bên bằng quân nhau!`, 'win');
  } else {
    const w = c.B > c.W ? 'B' : 'W';
    const wp = s.players.find(p => p.side === w);
    endGame(s, wp.id, 'count');
    pushLog(s, `🏆 ${wp.name} thắng ${c.B}–${c.W}!`, 'win');
  }
}

export function applyMove(s, pid, move) {
  if (!move || s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  if (s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  const { x, y } = move;
  if (!Number.isInteger(x) || !Number.isInteger(y) || !inBoard(x, y)) return { ok: false, reason: 'Ngoài bàn cờ.' };
  if (s.cells[idx(x, y)] !== 0) return { ok: false, reason: 'Ô này đã có quân.' };
  const legal = genMovesFor(s.cells, me.side).find(m => m.x === x && m.y === y);
  if (!legal) return { ok: false, reason: 'Nước đi không lật được quân nào — phải kẹp quân địch giữa 2 quân mình.' };
  s.cells[idx(x, y)] = me.side === 'B' ? 1 : 2;
  for (const f of legal.flips) s.cells[idx(f.x, f.y)] = me.side === 'B' ? 1 : 2;
  s.seq++; s.moveCount++;
  s.drawOffer = null;
  s.lastMove = { by: pid, at: { x, y }, flipped: legal.flips.map(f => ({ ...f })), n: s.seq };
  const c = counts(s.cells);
  const sideName = me.side === 'B' ? '⚫ Đen' : '⚪ Trắng';
  pushLog(s, `${me.name} (${sideName}) ${coordName(x, y)} — lật ${legal.flips.length} quân! (${c.B}–${c.W})`);
  const foe = foeOf(s, pid);
  /* đối thủ còn nước không? không thì bỏ lượt (mình đi tiếp); cả 2 đều
     hết nước (hoặc bàn đầy) thì ván kết thúc, đếm quân. */
  if (c.total >= 64) { finishByCount(s); return { ok: true, ended: true, flipped: legal.flips.length }; }
  const foeMoves = genMovesFor(s.cells, foe.side);
  if (foeMoves.length) {
    s.turn = foe.id; s.turnNo++; s.passStreak = 0;
    return { ok: true, ended: false, flipped: legal.flips.length };
  }
  const myMoves = genMovesFor(s.cells, me.side);
  if (myMoves.length) {
    s.passStreak++;
    s.lastPass = { by: foe.id, n: s.seq };
    pushLog(s, `⏭️ ${foe.name} hết nước đi — bỏ lượt, ${me.name} đi tiếp!`);
    s.seq++;
    return { ok: true, ended: false, flipped: legal.flips.length, passed: foe.id };
  }
  finishByCount(s);
  return { ok: true, ended: true, flipped: legal.flips.length };
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
    lastMove: s.lastMove, lastPass: s.lastPass, passStreak: s.passStreak,
    drawOffer: s.drawOffer, timer: s.timer,
    players: s.players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null, side: p.side })),
    log: s.log.slice(-30),
    me: pid, mySide: me ? me.side : null,
  };
}
/* Adapter cho phòng online (simplenet): action { type, x?, y? }.
   Cả 2 bên áp cùng 1 action sẽ ra cùng 1 trạng thái. */
export function applyAction(s, pid, a, ctx) {
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'move': return applyMove(s, pid, { x: a.x, y: a.y });
    case 'resign': return applyResign(s, pid);
    case 'draw': return applyDraw(s, pid);
    case 'draw-decline': return applyDrawDecline(s, pid);
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}
