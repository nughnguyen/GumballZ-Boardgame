// 🔴⚫ Cờ Đam (English draughts) – luật chơi (thuần logic, không chạm DOM).
// Bàn 8×8, chỉ đi trên ô tối ((x+y)%2===1). Đỏ (R) ở dưới (y=5..7), đi
// trước, tiến lên (y giảm). Đen (B) ở trên (y=0..2), tiến xuống (y tăng).
// Mã ô: 0 trống, +1 Đỏ thường, +2 Đỏ Vua, -1 Đen thường, -2 Đen Vua.
// - Quân thường đi chéo 1 ô về phía trước; Vua đi chéo 1 ô mọi hướng.
// - Ăn: nhảy qua quân địch kề chéo sang ô trống ngay phía sau. Ăn là BẮT
//   BUỘC: nếu phe tới lượt có nước ăn thì chỉ được ăn. Ăn xong mà cùng
//   quân còn ăn tiếp được thì PHẢI ăn tiếp (nhảy nhiều lần trong 1 lượt).
// - Lên tới hàng cuối (Đỏ y=0, Đen y=7) thì phong Vua; phong Vua thì dừng
//   lượt (không nhảy tiếp trong lượt đó, kể cả khi vừa phong bằng nước ăn).
// - Thắng: ăn hết quân địch, hoặc địch hết nước đi. Hòa: cả 2 đồng ý hòa,
//   hoặc 40 nước (mỗi bên) không ăn quân nào, hoặc lặp lại vị trí 3 lần.
export const W = 8, H = 8;
export const SIDES = ['R', 'B'];
export const DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
export const idx = (x, y) => y * W + x;
export const inBoard = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
export const isDark = (x, y) => (x + y) % 2 === 1;
export const sideOf = v => (v > 0 ? 'R' : v < 0 ? 'B' : null);
export const isKing = v => Math.abs(v) === 2;
export const pieceAt = (cells, x, y) => (inBoard(x, y) ? cells[idx(x, y)] : 0);
export const coordName = (x, y) => String.fromCharCode(97 + x) + (8 - y);
const fwdOf = side => (side === 'R' ? -1 : 1);
const kingRowOf = side => (side === 'R' ? 0 : 7);

/* nước ăn của quân ở (x,y) thuộc phe side trên mảng cells.
   Mỗi nước: { fx, fy, tx, ty, cx, cy, capture:true, capKing } */
function capturesFrom(cells, side, x, y) {
  const v = pieceAt(cells, x, y);
  if (!v || sideOf(v) !== side) return [];
  const king = isKing(v);
  const out = [];
  for (const [dx, dy] of DIRS) {
    if (!king && dy !== fwdOf(side)) continue; /* quân thường chỉ ăn về phía trước */
    const cx = x + dx, cy = y + dy, tx = x + 2 * dx, ty = y + 2 * dy;
    if (!inBoard(tx, ty) || !isDark(tx, ty)) continue;
    const mid = pieceAt(cells, cx, cy);
    if (mid !== 0 && sideOf(mid) !== side && pieceAt(cells, tx, ty) === 0) {
      out.push({ fx: x, fy: y, tx, ty, cx, cy, capture: true, capKing: isKing(mid) });
    }
  }
  return out;
}
/* nước đi thường (không ăn) của quân ở (x,y) */
function quietFrom(cells, side, x, y) {
  const v = pieceAt(cells, x, y);
  if (!v || sideOf(v) !== side) return [];
  const king = isKing(v);
  const out = [];
  for (const [dx, dy] of DIRS) {
    if (!king && dy !== fwdOf(side)) continue;
    const tx = x + dx, ty = y + dy;
    if (!inBoard(tx, ty) || !isDark(tx, ty)) continue;
    if (pieceAt(cells, tx, ty) === 0) out.push({ fx: x, fy: y, tx, ty, capture: false, capKing: false });
  }
  return out;
}
/* mọi nước đi của quân ở (x,y): có ăn thì chỉ trả nước ăn (bắt buộc ăn) */
export function movesFromCells(cells, side, x, y) {
  const caps = capturesFrom(cells, side, x, y);
  return caps.length ? caps : quietFrom(cells, side, x, y);
}
/* mọi nước đi của phe side: có ăn ở đâu thì chỉ trả nước ăn (bắt buộc ăn) */
export function genMovesFor(cells, side) {
  const all = [], caps = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = cells[idx(x, y)];
    if (v !== 0 && sideOf(v) === side) {
      const ms = movesFromCells(cells, side, x, y);
      for (const m of ms) (m.capture ? caps : all).push(m);
    }
  }
  return caps.length ? caps : all;
}
export const hasAnyMove = (cells, side) => genMovesFor(cells, side).length > 0;
export const hasCapture = (cells, side) => genMovesFor(cells, side).some(m => m.capture);

/* vị trí xuất phát chuẩn: Đỏ y=5..7, Đen y=0..2, chỉ ô tối */
function startCells() {
  const cells = new Array(W * H).fill(0);
  for (let y = 0; y < 3; y++) for (let x = 0; x < W; x++) if (isDark(x, y)) cells[idx(x, y)] = -1;
  for (let y = 5; y < 8; y++) for (let x = 0; x < W; x++) if (isDark(x, y)) cells[idx(x, y)] = 1;
  return cells;
}
const hashCells = (cells, turnSide, mid) => cells.join(',') + '|' + turnSide + '|' + (mid ? mid.x + ',' + mid.y : '');

export const OPT_CHOICES = { side: ['red', 'black', 'random'], timer: [0, 30, 60] };

export function createGame(players, opts = {}) {
  if (!players || players.length !== 2) throw new Error('Cờ Đam chơi 2 người.');
  const sideOpt = OPT_CHOICES.side.includes(opts.side) ? opts.side : 'red';
  const hostSide = sideOpt === 'random' ? (Math.random() < 0.5 ? 'R' : 'B') : (sideOpt === 'black' ? 'B' : 'R');
  const timer = OPT_CHOICES.timer.includes(+opts.timer) ? +opts.timer : 0;
  const cells = startCells();
  const captured = {};
  captured[players[0].id] = []; captured[players[1].id] = [];
  const red = players.find((p, i) => (i === 0 ? hostSide === 'R' : hostSide === 'B'));
  return {
    gid: Math.random().toString(36).slice(2, 9), seq: 0, phase: 'playing',
    cells,
    players: players.map((p, i) => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local,
      level: p.level || null, side: i === 0 ? hostSide : (hostSide === 'R' ? 'B' : 'R'),
    })),
    turn: red.id, turnNo: 1, moveCount: 0,
    midJump: null, lastMove: null, captured,
    quietPlies: 0, hashes: [hashCells(cells, 'R', null)],
    drawOffer: null, timer,
    winner: null, draw: false, endReason: null, log: [],
  };
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.cells) || s.cells.length !== W * H || !Array.isArray(s.players) || s.players.length !== 2) throw new Error('Trạng thái Cờ Đam không hợp lệ.');
  return s;
}
const pIdx = (s, id) => s.players.findIndex(p => p.id === id);
const pOf = (s, id) => s.players.find(p => p.id === id);
const foeOf = (s, id) => s.players.find(p => p.id !== id);
const sideOfPlayer = (s, pid) => (pOf(s, pid) || {}).side;
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };
export const counts = s => { let R = 0, B = 0, RK = 0, BK = 0; for (const c of s.cells) { if (c === 1) R++; else if (c === 2) RK++; else if (c === -1) B++; else if (c === -2) BK++; } return { R, B, RK, BK, Rtotal: R + RK, Btotal: B + BK }; };
export const piecesOf = (s, side) => {
  const out = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = s.cells[idx(x, y)];
    if (v !== 0 && sideOf(v) === side) out.push({ x, y, king: isKing(v) });
  }
  return out;
};
/* quân của phe tới lượt có bắt buộc ăn không (để hiện gợi ý) */
export const mustCaptureNow = s => s.phase === 'playing' && hasCapture(s.cells, sideOfPlayer(s, s.turn));

export function legalMoves(s, pid) {
  if (s.phase !== 'playing' || s.turn !== pid) return [];
  if (s.midJump) return movesFromCells(s.cells, sideOfPlayer(s, pid), s.midJump.x, s.midJump.y);
  return genMovesFor(s.cells, sideOfPlayer(s, pid));
}
export function legalMovesFrom(s, pid, x, y) {
  if (s.phase !== 'playing' || s.turn !== pid) return [];
  const v = pieceAt(s.cells, x, y);
  if (!v || sideOf(v) !== sideOfPlayer(s, pid)) return [];
  if (s.midJump && (s.midJump.x !== x || s.midJump.y !== y)) return [];
  /* đang nhảy dở: chỉ trả nước ăn tiếp của quân đó; chưa nhảy: tuân luật bắt buộc ăn của cả phe */
  if (s.midJump) return capturesFrom(s.cells, sideOfPlayer(s, pid), x, y);
  const caps = genMovesFor(s.cells, sideOfPlayer(s, pid)).filter(m => m.capture);
  const mine = movesFromCells(s.cells, sideOfPlayer(s, pid), x, y);
  return caps.length ? mine.filter(m => m.capture) : mine;
}

function endGame(s, winnerId, reason) {
  s.phase = 'ended'; s.winner = winnerId || null; s.endReason = reason; s.seq++;
  s.drawOffer = null; s.midJump = null;
}
function checkEndAfterTurn(s, moverId) {
  const mover = pOf(s, moverId);
  const next = pOf(s, s.turn); /* người sắp tới lượt */
  const nextLeft = counts(s)[next.side === 'R' ? 'Rtotal' : 'Btotal'];
  if (nextLeft === 0) {
    endGame(s, mover.id, 'capture');
    pushLog(s, `🏆 ${mover.name} ăn hết quân địch — thắng!`, 'win');
    return true;
  }
  if (!hasAnyMove(s.cells, next.side)) {
    endGame(s, mover.id, 'blocked');
    pushLog(s, `🏆 ${next.name} hết nước đi — ${mover.name} thắng!`, 'win');
    return true;
  }
  if (s.quietPlies >= 80) {
    endGame(s, null, 'draw-40');
    s.draw = true;
    pushLog(s, '🤝 Hòa — 40 nước không ăn quân nào.', 'win');
    return true;
  }
  const h = hashCells(s.cells, next.side, null);
  s.hashes.push(h);
  if (s.hashes.length > 300) s.hashes.shift();
  if (s.hashes.filter(x => x === h).length >= 3) {
    endGame(s, null, 'draw-rep');
    s.draw = true;
    pushLog(s, '🤝 Hòa — lặp lại vị trí 3 lần.', 'win');
    return true;
  }
  return false;
}

export function applyMove(s, pid, move) {
  if (!move || !move.from || !move.to || s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  if (s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  const { x: fx, y: fy } = move.from, { x: tx, y: ty } = move.to;
  if (![fx, fy, tx, ty].every(Number.isInteger)) return { ok: false, reason: 'Tọa độ không hợp lệ.' };
  if (!inBoard(fx, fy) || !inBoard(tx, ty) || !isDark(tx, ty)) return { ok: false, reason: 'Ngoài bàn cờ.' };
  if (s.midJump && (s.midJump.x !== fx || s.midJump.y !== fy)) return { ok: false, reason: 'Đang nhảy dở: phải ăn tiếp bằng đúng quân đó.' };
  const v = pieceAt(s.cells, fx, fy);
  if (!v || sideOf(v) !== me.side) return { ok: false, reason: 'Ô này không có quân của bạn.' };
  /* bắt buộc ăn là luật của cả phe: có nước ăn ở đâu thì chỉ được ăn */
  const sideCaps = s.midJump
    ? capturesFrom(s.cells, me.side, fx, fy)
    : genMovesFor(s.cells, me.side).filter(m => m.capture);
  const legal = (sideCaps.length
    ? sideCaps.filter(m => m.fx === fx && m.fy === fy)
    : movesFromCells(s.cells, me.side, fx, fy))
    .find(m => m.tx === tx && m.ty === ty);
  if (!legal) {
    return { ok: false, reason: sideCaps.length ? 'Bắt buộc phải ăn quân địch!' : 'Nước đi không hợp lệ.' };
  }
  const wasKing = isKing(v);
  const foe = foeOf(s, pid);
  let capKing = false;
  if (legal.capture) {
    capKing = legal.capKing;
    s.captured[pid].push({ king: capKing });
    s.cells[idx(legal.cx, legal.cy)] = 0;
  }
  s.cells[idx(tx, ty)] = v;
  s.cells[idx(fx, fy)] = 0;
  const crowned = !wasKing && ty === kingRowOf(me.side);
  if (crowned) s.cells[idx(tx, ty)] = me.side === 'R' ? 2 : -2;
  s.seq++; s.moveCount++;
  s.quietPlies = legal.capture ? 0 : s.quietPlies + 1;
  s.drawOffer = null;
  s.lastMove = {
    by: pid, from: { x: fx, y: fy }, to: { x: tx, y: ty },
    captured: legal.capture ? [{ x: legal.cx, y: legal.cy, king: capKing }] : [],
    crowned, jump: s.midJump != null || legal.capture, n: s.seq,
  };
  const sideName = me.side === 'R' ? '🔴 Đỏ' : '⚫ Đen';
  pushLog(s, `${me.name} (${sideName}) ${coordName(fx, fy)} → ${coordName(tx, ty)}${legal.capture ? ` — ăn 1 quân${capKing ? ' Vua' : ''}!` : ''}${crowned ? ' — phong Vua 👑!' : ''}`);
  /* ăn xong mà cùng quân còn ăn tiếp được (và chưa phong Vua) thì PHẢI ăn tiếp */
  if (legal.capture && !crowned) {
    const more = capturesFrom(s.cells, me.side, tx, ty);
    if (more.length) {
      s.midJump = { x: tx, y: ty };
      s.seq++;
      return { ok: true, ended: false, captured: 1, continued: true, crowned };
    }
  }
  s.midJump = null;
  s.turn = foe.id; s.turnNo++;
  if (checkEndAfterTurn(s, pid)) return { ok: true, ended: true, captured: legal.capture ? 1 : 0, crowned };
  return { ok: true, ended: false, captured: legal.capture ? 1 : 0, crowned };
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
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, turn: s.turn, turnNo: s.turnNo,
    moveCount: s.moveCount, winner: s.winner, draw: s.draw,
    endReason: s.endReason, cells: [...s.cells], lastMove: s.lastMove,
    midJump: s.midJump ? { ...s.midJump } : null,
    mustCapture: mustCaptureNow(s),
    captured: JSON.parse(JSON.stringify(s.captured)),
    drawOffer: s.drawOffer, quietPlies: s.quietPlies, timer: s.timer,
    players: s.players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null, side: p.side })),
    log: s.log.slice(-30),
    me: pid, mySide: me ? me.side : null,
  };
}
/* Adapter cho phòng online (simplenet): action { type, from?, to? }.
   Cả 2 bên áp cùng 1 action sẽ ra cùng 1 trạng thái. */
export function applyAction(s, pid, a, ctx) {
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'move': {
      const from = a.from || (a.fx != null ? { x: a.fx, y: a.fy } : null);
      const to = a.to || (a.tx != null ? { x: a.tx, y: a.ty } : null);
      return applyMove(s, pid, { from, to });
    }
    case 'resign': return applyResign(s, pid);
    case 'draw': return applyDraw(s, pid);
    case 'draw-decline': return applyDrawDecline(s, pid);
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}
