// 🦁 Cờ Thú (Jungle / Đấu Thú Kỳ) – luật chơi (thuần logic, không chạm DOM).
// Bàn 7 cột (x 0-6) × 9 hàng (y 0-8). Đỏ (R) ở dưới (y=8), đi trước;
// Xanh (B) ở trên (y=0). Mỗi bên 8 con vật, hạng 1-8:
// Chuột 1, Mèo 2, Chó 3, Sói 4, Báo 5, Hổ 6, Sư tử 7, Voi 8.
// - Đi 1 ô ngang/dọc. Ăn: hạng mình >= hạng địch; Chuột (1) ăn được Voi (8),
//   ngược lại Voi KHÔNG ăn được Chuột; cùng hạng ăn được nhau.
// - Bẫy: quân đứng trong BẪY CỦA ĐỊCH có hạng hiệu dụng 0 (quân địch nào
//   cũng ăn được); bẫy của mình không làm yếu quân mình.
// - Sông: chỉ Chuột được vào sông. Hổ và Sư tử NHẢY qua sông ngang/dọc trong
//   1 nước nếu mọi ô sông trên đường đều trống (Chuột trong sông chặn được).
//   Chuột TRONG sông chỉ ăn được Chuột khác trong sông, không ăn quân trên bờ;
//   Chuột trên bờ cũng không ăn được Chuột trong sông.
// - Hang: không được vào hang của mình; vào hang địch thì thắng ngay.
//   Ăn hết 8 quân địch cũng thắng. Hết nước đi thì thua.
// Mã ô: 0 trống, +hạng = quân Đỏ, -hạng = quân Xanh.
export const W = 7, H = 9;
export const SIDES = ['R', 'B'];
export const ANIMALS = [
  { rank: 1, kind: 'rat', name: 'Chuột', emoji: '🐀' },
  { rank: 2, kind: 'cat', name: 'Mèo', emoji: '🐱' },
  { rank: 3, kind: 'dog', name: 'Chó', emoji: '🐶' },
  { rank: 4, kind: 'wolf', name: 'Sói', emoji: '🐺' },
  { rank: 5, kind: 'leopard', name: 'Báo', emoji: '🐆' },
  { rank: 6, kind: 'tiger', name: 'Hổ', emoji: '🐅' },
  { rank: 7, kind: 'lion', name: 'Sư tử', emoji: '🦁' },
  { rank: 8, kind: 'elephant', name: 'Voi', emoji: '🐘' },
];
export const animalOf = rank => ANIMALS.find(a => a.rank === rank) || null;
export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const idx = (x, y) => y * W + x;
export const inBoard = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
export const isRiver = (x, y) => y >= 3 && y <= 5 && ((x >= 1 && x <= 2) || (x >= 4 && x <= 5));
export const DENS = { R: [3, 8], B: [3, 0] };
export const TRAPS = { R: [[2, 8], [4, 8], [3, 7]], B: [[2, 0], [4, 0], [3, 1]] };
export const denOf = side => DENS[side];
export const trapsOf = side => TRAPS[side];
const key = (x, y) => x + ',' + y;
const TRAP_SET = { R: new Set(TRAPS.R.map(([x, y]) => key(x, y))), B: new Set(TRAPS.B.map(([x, y]) => key(x, y))) };
export const isTrapOf = (side, x, y) => TRAP_SET[side].has(key(x, y));
export const sideOf = v => (v > 0 ? 'R' : v < 0 ? 'B' : null);
export const rankOf = v => Math.abs(v);
export const pieceAt = (cells, x, y) => (inBoard(x, y) ? cells[idx(x, y)] : 0);
export const coordName = (x, y) => String.fromCharCode(65 + x) + (y + 1);
/* hạng hiệu dụng của quân ở (x,y): đứng trong bẫy địch thì = 0 */
export function effRank(cells, x, y) {
  const v = pieceAt(cells, x, y);
  if (!v) return 0;
  const side = sideOf(v);
  const foe = side === 'R' ? 'B' : 'R';
  if (isTrapOf(foe, x, y)) return 0;
  return rankOf(v);
}
/* quân hạng att có ăn được quân hạng def không (đã tính hạng hiệu dụng)?
   Voi (8) KHÔNG ăn được Chuột (1); Chuột (1) ăn được Voi (8) khi không bị bẫy. */
export function canCapture(attRank, defRank, attEff, defEff) {
  if (attRank === 8 && defRank === 1) return false;
  if (attRank === 1 && defRank === 8) return attEff > 0;
  return attEff >= defEff;
}

/* Kiểm tra ô đích (tx,ty) cho quân ở (fx,fy) trên mảng cells.
   Trả { ok, capture, capRank } hoặc { ok:false }. */
function tryDest(cells, fx, fy, tx, ty) {
  if (!inBoard(tx, ty)) return { ok: false };
  const v = pieceAt(cells, fx, fy);
  if (!v) return { ok: false };
  const side = sideOf(v), rank = rankOf(v);
  const foe = side === 'R' ? 'B' : 'R';
  /* không được vào hang của mình */
  const [dx, dy] = DENS[side];
  if (tx === dx && ty === dy) return { ok: false };
  const t = pieceAt(cells, tx, ty);
  if (t !== 0 && sideOf(t) === side) return { ok: false }; /* quân mình */
  const fromRiver = isRiver(fx, fy), toRiver = isRiver(tx, ty);
  if (toRiver) {
    /* chỉ Chuột được vào sông; Chuột trên bờ không ăn được Chuột trong sông;
       Chuột trong sông chỉ ăn được Chuột khác trong sông */
    if (rank !== 1) return { ok: false };
    if (t !== 0) {
      if (!fromRiver || rankOf(t) !== 1) return { ok: false };
      return { ok: true, capture: true, capRank: 1 };
    }
    return { ok: true, capture: false, capRank: 0 };
  }
  if (t === 0) return { ok: true, capture: false, capRank: 0 };
  /* đích trên bờ có quân địch */
  if (fromRiver) return { ok: false }; /* Chuột trong sông không ăn quân trên bờ */
  const defRank = rankOf(t);
  const attEff = effRank(cells, fx, fy), defEff = effRank(cells, tx, ty);
  if (!canCapture(rank, defRank, attEff, defEff)) return { ok: false };
  return { ok: true, capture: true, capRank: defRank };
}

/* Mọi nước đi của quân ở (x,y) thuộc phe side trên mảng cells.
   Mỗi nước: { fx, fy, tx, ty, capture, capRank, jump }. */
export function movesFromCells(cells, side, x, y) {
  const v = pieceAt(cells, x, y);
  if (!v || sideOf(v) !== side) return [];
  const rank = rankOf(v);
  const out = [];
  for (const [dx, dy] of DIRS) {
    const nx = x + dx, ny = y + dy;
    if (!inBoard(nx, ny)) continue;
    if (isRiver(nx, ny)) {
      /* Hổ / Sư tử nhảy qua sông: mọi ô sông trên đường phải trống */
      if (rank === 6 || rank === 7) {
        let cx = nx, cy = ny, blocked = false;
        while (inBoard(cx, cy) && isRiver(cx, cy)) {
          if (pieceAt(cells, cx, cy) !== 0) { blocked = true; break; }
          cx += dx; cy += dy;
        }
        if (!blocked && inBoard(cx, cy)) {
          const d = tryDest(cells, x, y, cx, cy);
          if (d.ok) out.push({ fx: x, fy: y, tx: cx, ty: cy, capture: d.capture, capRank: d.capRank, jump: true });
        }
      }
      /* Chuột vào sông: nước đi 1 ô bình thường (xử lý ở tryDest) */
      if (rank === 1) {
        const d = tryDest(cells, x, y, nx, ny);
        if (d.ok) out.push({ fx: x, fy: y, tx: nx, ty: ny, capture: d.capture, capRank: d.capRank, jump: false });
      }
      continue;
    }
    const d = tryDest(cells, x, y, nx, ny);
    if (d.ok) out.push({ fx: x, fy: y, tx: nx, ty: ny, capture: d.capture, capRank: d.capRank, jump: false });
  }
  return out;
}

/* Mọi nước đi của phe side trên mảng cells. */
export function genMovesFor(cells, side) {
  const out = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = cells[idx(x, y)];
    if (v !== 0 && sideOf(v) === side) out.push(...movesFromCells(cells, side, x, y));
  }
  return out;
}
export const hasAnyMove = (cells, side) => genMovesFor(cells, side).length > 0;

/* vị trí xuất phát chuẩn */
const START = [
  [0, 8, 7], [6, 8, 6], [1, 7, 3], [5, 7, 2], [0, 6, 1], [2, 6, 5], [4, 6, 4], [6, 6, 8],
  [6, 0, -7], [0, 0, -6], [5, 1, -3], [1, 1, -2], [6, 2, -1], [4, 2, -5], [2, 2, -4], [0, 2, -8],
];
const hashCells = cells => cells.join(',');

export function createGame(players, opts = {}) {
  if (!players || players.length !== 2) throw new Error('Cờ Thú chơi 2 người.');
  const cells = new Array(W * H).fill(0);
  for (const [x, y, v] of START) cells[idx(x, y)] = v;
  const captured = {};
  captured[players[0].id] = []; captured[players[1].id] = [];
  return {
    gid: Math.random().toString(36).slice(2, 9), seq: 0, phase: 'playing',
    cells,
    players: players.map((p, i) => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local,
      level: p.level || null, side: SIDES[i],
    })),
    turn: players[0].id, turnNo: 1, moveCount: 0,
    lastMove: null, captured, quietPlies: 0, hashes: [hashCells(cells)],
    winner: null, draw: false, endReason: null, log: [],
  };
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.cells) || s.cells.length !== W * H || !Array.isArray(s.players) || s.players.length !== 2) throw new Error('Trạng thái Cờ Thú không hợp lệ.');
  return s;
}
const pIdx = (s, id) => s.players.findIndex(p => p.id === id);
const pOf = (s, id) => s.players.find(p => p.id === id);
const foeOf = (s, id) => s.players.find(p => p.id !== id);
const sideOfPlayer = (s, pid) => (pOf(s, pid) || {}).side;
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };
export const counts = s => { let R = 0, B = 0; for (const c of s.cells) { if (c > 0) R++; else if (c < 0) B++; } return { R, B }; };
export const piecesOf = (s, side) => {
  const out = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = s.cells[idx(x, y)];
    if (v !== 0 && sideOf(v) === side) out.push({ x, y, rank: rankOf(v), kind: (animalOf(rankOf(v)) || {}).kind });
  }
  return out;
};

export function legalMoves(s, pid) {
  if (s.phase !== 'playing' || s.turn !== pid) return [];
  return genMovesFor(s.cells, sideOfPlayer(s, pid));
}
export function legalMovesFrom(s, pid, x, y) {
  if (s.phase !== 'playing' || s.turn !== pid) return [];
  const v = pieceAt(s.cells, x, y);
  if (!v || sideOf(v) !== sideOfPlayer(s, pid)) return [];
  return movesFromCells(s.cells, sideOfPlayer(s, pid), x, y);
}

export function applyMove(s, pid, move) {
  if (!move || !move.from || !move.to || s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  if (s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  const { x: fx, y: fy } = move.from, { x: tx, y: ty } = move.to;
  if (![fx, fy, tx, ty].every(Number.isInteger)) return { ok: false, reason: 'Tọa độ không hợp lệ.' };
  if (!inBoard(fx, fy) || !inBoard(tx, ty)) return { ok: false, reason: 'Ngoài bàn cờ.' };
  const v = pieceAt(s.cells, fx, fy);
  if (!v || sideOf(v) !== me.side) return { ok: false, reason: 'Ô này không có quân của bạn.' };
  const legal = movesFromCells(s.cells, me.side, fx, fy).find(m => m.tx === tx && m.ty === ty);
  if (!legal) return { ok: false, reason: 'Nước đi không hợp lệ (xem luật sông / bẫy / hạng quân).' };
  const target = pieceAt(s.cells, tx, ty);
  const an = animalOf(rankOf(v));
  const foe = foeOf(s, pid);
  let capturedRank = 0;
  if (target !== 0) {
    capturedRank = rankOf(target);
    s.captured[pid].push({ rank: capturedRank, side: foe.side });
  }
  s.cells[idx(tx, ty)] = v;
  s.cells[idx(fx, fy)] = 0;
  s.seq++; s.moveCount++;
  s.quietPlies = capturedRank ? 0 : s.quietPlies + 1;
  s.hashes.push(hashCells(s.cells));
  if (s.hashes.length > 200) s.hashes.shift();
  const denWin = tx === DENS[foe.side][0] && ty === DENS[foe.side][1];
  s.lastMove = { by: pid, from: { x: fx, y: fy }, to: { x: tx, y: ty }, captured: capturedRank, jump: !!legal.jump, n: s.seq };
  const foeLeft = counts(s)[foe.side];
  pushLog(s, `${me.name} (${me.side === 'R' ? '🔴 Đỏ' : '🔵 Xanh'}) đi ${an.emoji} ${an.name} ${coordName(fx, fy)} → ${coordName(tx, ty)}${legal.jump ? ' (nhảy sông!)' : ''}${capturedRank ? ` — ăn ${animalOf(capturedRank).emoji} ${animalOf(capturedRank).name}!` : ''}`);
  if (denWin) {
    s.phase = 'ended'; s.winner = pid; s.endReason = 'den'; s.seq++;
    pushLog(s, `🏆 ${me.name} vào hang địch — thắng!`, 'win');
    return { ok: true, ended: true, captured: capturedRank, winReason: 'den' };
  }
  if (foeLeft === 0) {
    s.phase = 'ended'; s.winner = pid; s.endReason = 'capture'; s.seq++;
    pushLog(s, `🏆 ${me.name} ăn hết quân địch — thắng!`, 'win');
    return { ok: true, ended: true, captured: capturedRank, winReason: 'capture' };
  }
  s.turn = foe.id; s.turnNo++;
  if (!hasAnyMove(s.cells, foe.side)) {
    s.phase = 'ended'; s.winner = pid; s.endReason = 'blocked'; s.seq++;
    pushLog(s, `🏆 ${foe.name} hết nước đi — ${me.name} thắng!`, 'win');
    return { ok: true, ended: true, captured: capturedRank, winReason: 'blocked' };
  }
  return { ok: true, ended: false, captured: capturedRank };
}

export function applyResign(s, pid) {
  if (s.phase === 'ended') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  const foe = foeOf(s, pid);
  s.phase = 'ended'; s.winner = foe.id; s.endReason = 'resign'; s.seq++;
  pushLog(s, `${me.name} xin thua — 🏆 ${foe.name} thắng!`, 'win');
  return { ok: true, ended: true };
}

export const actors = s => (s.phase === 'playing' && s.turn ? [s.turn] : []);
export function viewFor(s, pid) {
  const me = pOf(s, pid);
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, turn: s.turn, turnNo: s.turnNo,
    moveCount: s.moveCount, winner: s.winner, draw: s.draw,
    endReason: s.endReason, cells: [...s.cells], lastMove: s.lastMove,
    captured: JSON.parse(JSON.stringify(s.captured)),
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
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}
