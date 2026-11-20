// 🟦 Blokus – luật chơi (thuần logic, không chạm DOM).
// Bàn 20×20 ô; 4 màu (đỏ, xanh dương, vàng, xanh lá), mỗi màu đủ 21 mảnh
// polyomino (1 mảnh 1 ô, 1 mảnh 2 ô, 2 mảnh 3 ô, 5 mảnh 4 ô, 12 mảnh 5 ô
// — tổng 89 ô/màu). 4 người: mỗi người 1 màu ở 1 góc. 3 người: 3 màu,
// 1 góc trống. 2 người (luật chính thức): mỗi người chơi 2 màu ở 2 góc
// đối diện, 2 màu luân phiên nhau theo lượt (thứ tự ghế: đỏ, xanh dương,
// vàng, xanh lá).
// Mảnh đầu tiên của mỗi màu PHẢI phủ đúng góc xuất phát của màu đó. Các
// mảnh sau: phải chạm (chéo góc) ít nhất 1 ô cùng màu đã đặt, và KHÔNG
// được chạm cạnh với bất kỳ ô cùng màu nào (chạm cạnh màu khác thì được).
// Mỗi lượt: đặt 1 mảnh (xoay/lật thoải mái) hoặc bỏ lượt. Bỏ lượt liên
// tiếp đủ 1 vòng (mọi ghế đều bỏ) thì trận kết thúc.
// Điểm: mỗi màu = số ô đã đặt − 89 + thưởng (thưởng +15 nếu đặt hết 21
// mảnh, +5 nữa nếu mảnh cuối cùng là mảnh 1 ô — tổng +20). Điểm người
// chơi = tổng điểm các màu của mình. Hòa điểm thì ít mảnh còn lại hơn
// thắng, rồi theo thứ tự ghế. Xin thua dừng ván ngay, người còn lại có
// tổng điểm cao nhất thắng.
// Engine xác định hoàn toàn theo seed (không dùng Math.random).
// summary cuối trận (theo người chơi): squaresLeft (tổng ô còn lại của
// các màu mình chơi), piecesLeft (tổng mảnh còn lại), bonus (tổng thưởng),
// turns (số mảnh đã đặt). Điểm nằm ở final.scores + p.score.
export const SIZE = 20;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const COLORS = [
  { idx: 0, name: 'Đỏ', css: 'c0' },
  { idx: 1, name: 'Xanh dương', css: 'c1' },
  { idx: 2, name: 'Vàng', css: 'c2' },
  { idx: 3, name: 'Xanh lá', css: 'c3' },
];
export const CORNERS = [[0, 0], [0, SIZE - 1], [SIZE - 1, SIZE - 1], [SIZE - 1, 0]];

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- 21 mảnh chuẩn (id, tên, ô theo [hàng, cột], gốc (0,0)) ---------- */
const RAW = [
  ['p1', [[0, 0]]],
  ['p2', [[0, 0], [0, 1]]],
  ['i3', [[0, 0], [0, 1], [0, 2]]],
  ['l3', [[0, 0], [1, 0], [1, 1]]],
  ['i4', [[0, 0], [0, 1], [0, 2], [0, 3]]],
  ['o4', [[0, 0], [0, 1], [1, 0], [1, 1]]],
  ['t4', [[0, 0], [0, 1], [0, 2], [1, 1]]],
  ['s4', [[0, 1], [0, 2], [1, 0], [1, 1]]],
  ['l4', [[0, 0], [1, 0], [2, 0], [2, 1]]],
  ['f', [[0, 1], [1, 0], [1, 1], [1, 2], [2, 2]]],
  ['i5', [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]],
  ['l5', [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]]],
  ['p5', [[0, 0], [0, 1], [1, 0], [1, 1], [1, 2]]],
  ['n', [[0, 0], [0, 1], [1, 1], [1, 2], [1, 3]]],
  ['t5', [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]]],
  ['u', [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]]],
  ['v', [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]]],
  ['w', [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]]],
  ['x', [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]]],
  ['y', [[0, 0], [1, 0], [2, 0], [2, 1], [3, 0]]],
  ['z', [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]]],
];
export const PIECES = RAW.map(([id, cells]) => ({ id, size: cells.length, cells }));
export const PIECE_IDS = PIECES.map(p => p.id);
export const TOTAL_SQUARES = PIECES.reduce((a, p) => a + p.size, 0); /* 89 */

/* ---------- xoay / lật mảnh ---------- */
function norm(cells) {
  const mr = Math.min(...cells.map(c => c[0])), mc = Math.min(...cells.map(c => c[1]));
  return cells.map(([r, c]) => [r - mr, c - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
function rot90(cells) {
  const R = Math.max(...cells.map(c => c[0])) + 1;
  return norm(cells.map(([r, c]) => [c, R - 1 - r]));
}
function flipH(cells) {
  const C = Math.max(...cells.map(c => c[1])) + 1;
  return norm(cells.map(([r, c]) => [r, C - 1 - c]));
}
const keyCells = cells => cells.map(c => c.join(',')).join(';');
/* ORIENTS[id] = [{rot, flip, cells}] — mọi hướng khác nhau của mảnh */
export const ORIENTS = {};
for (const p of PIECES) {
  const seen = new Set(), list = [];
  for (const flip of [false, true]) {
    let cells = flip ? flipH(p.cells) : norm(p.cells);
    for (let rot = 0; rot < 4; rot++) {
      const k = keyCells(cells);
      if (!seen.has(k)) { seen.add(k); list.push({ rot, flip, cells: cells.map(c => c.slice()) }); }
      cells = rot90(cells);
    }
  }
  ORIENTS[p.id] = list;
}
export function orientCells(pieceId, rot, flip) {
  const list = ORIENTS[pieceId];
  if (!list) return null;
  const o = list.find(o => o.rot === (rot % 4) && o.flip === !!flip);
  return o ? o.cells : null;
}

const inBoard = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
const idx = (r, c) => r * SIZE + c;
const seatOf = (s, color) => s.seats.find(se => se.color === color);
const pOf = (s, id) => s.players.find(p => p.id === id);
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < MIN_PLAYERS || s.players.length > MAX_PLAYERS
    || !Array.isArray(s.seats) || !Array.isArray(s.board) || s.board.length !== SIZE * SIZE
    || typeof s.phase !== 'string' || typeof s.turnSeat !== 'number') {
    throw new Error('Trạng thái Blokus không hợp lệ.');
  }
  return s;
}
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

/* ---------- kề cạnh / kề chéo của 1 màu trên bàn ---------- */
/* edge = ô trống kề cạnh 1 ô cùng màu (không bao giờ được đặt vào);
   diag = ô trống kề chéo 1 ô cùng màu (điểm neo cho mảnh mới). */
export function adjacency(board, color) {
  const edge = new Set(), diag = new Set();
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (board[i] !== color) continue;
    const r = (i / SIZE) | 0, c = i % SIZE;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr, nc = c + dc;
      if (inBoard(nr, nc) && board[idx(nr, nc)] === -1) edge.add(idx(nr, nc));
    }
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      const nr = r + dr, nc = c + dc;
      if (inBoard(nr, nc) && board[idx(nr, nc)] === -1) diag.add(idx(nr, nc));
    }
  }
  return { edge, diag };
}

/* ---------- kiểm tra 1 nước đặt ---------- */
/* (r, c) = góc trên-trái của hộp bao mảnh đã xoay/lật. */
export function validatePlacement(s, color, pieceId, rot, flip, r, c) {
  const seat = seatOf(s, color);
  if (!seat) return { ok: false, reason: 'Không có màu này trong ván.' };
  if (!seat.pieces.includes(pieceId)) return { ok: false, reason: 'Mảnh này đã dùng rồi.' };
  const cells = orientCells(pieceId, rot, flip);
  if (!cells) return { ok: false, reason: 'Hướng xoay/lật không hợp lệ.' };
  const placed = cells.map(([dr, dc]) => [r + dr, c + dc]);
  for (const [pr, pc] of placed) {
    if (!inBoard(pr, pc)) return { ok: false, reason: 'Mảnh lòi ra ngoài bàn.' };
    if (s.board[idx(pr, pc)] !== -1) return { ok: false, reason: 'Mảnh chồng lên ô đã có quân.' };
  }
  if (seat.placed === 0) {
    const [cr, cc] = seat.corner;
    if (!placed.some(([pr, pc]) => pr === cr && pc === cc)) {
      return { ok: false, reason: 'Mảnh đầu tiên của màu này phải phủ đúng góc xuất phát.' };
    }
    return { ok: true, reason: '' };
  }
  const { edge, diag } = adjacency(s.board, color);
  for (const [pr, pc] of placed) {
    if (edge.has(idx(pr, pc))) return { ok: false, reason: 'Mảnh chạm cạnh ô cùng màu — chỉ được chạm chéo góc.' };
  }
  if (!placed.some(([pr, pc]) => diag.has(idx(pr, pc)))) {
    return { ok: false, reason: 'Mảnh phải chạm chéo ít nhất 1 ô cùng màu đã đặt.' };
  }
  return { ok: true, reason: '' };
}

/* ---------- liệt kê mọi nước đặt hợp lệ của 1 màu ---------- */
export function legalPlacements(s, color) {
  const seat = seatOf(s, color);
  if (!seat || s.phase !== 'playing') return [];
  const out = [];
  if (seat.placed === 0) {
    const [cr, cc] = seat.corner;
    for (const pieceId of seat.pieces) {
      for (const o of ORIENTS[pieceId]) {
        const anchors = new Set();
        for (const [dr, dc] of o.cells) anchors.add((cr - dr) + ',' + (cc - dc));
        for (const a of anchors) {
          const [r, c] = a.split(',').map(Number);
          if (validatePlacement(s, color, pieceId, o.rot, o.flip, r, c).ok) {
            out.push({ type: 'place', color, piece: pieceId, rot: o.rot, flip: o.flip, r, c });
          }
        }
      }
    }
    return out;
  }
  const { diag } = adjacency(s.board, color);
  for (const pieceId of seat.pieces) {
    for (const o of ORIENTS[pieceId]) {
      const anchors = new Set();
      for (const f of diag) {
        const fr = (f / SIZE) | 0, fc = f % SIZE;
        for (const [dr, dc] of o.cells) anchors.add((fr - dr) + ',' + (fc - dc));
      }
      for (const a of anchors) {
        const [r, c] = a.split(',').map(Number);
        if (validatePlacement(s, color, pieceId, o.rot, o.flip, r, c).ok) {
          out.push({ type: 'place', color, piece: pieceId, rot: o.rot, flip: o.flip, r, c });
        }
      }
    }
  }
  return out;
}

/* ---------- điểm ---------- */
export function scoreOfSeat(seat) {
  return seat.squares - TOTAL_SQUARES + seat.bonus;
}
export function playerScore(s, pid) {
  return s.seats.filter(se => se.pid === pid).reduce((a, se) => a + scoreOfSeat(se), 0);
}
/* xếp hạng: điểm cao hơn thắng; hòa thì ít mảnh còn lại hơn; rồi theo ghế */
function rankPlayers(s, ids) {
  const info = ids.map((id, i) => {
    const seats = s.seats.filter(se => se.pid === id);
    return {
      id, idx: i,
      score: playerScore(s, id),
      piecesLeft: seats.reduce((a, se) => a + se.pieces.length, 0),
      seatOrder: Math.min(...seats.map(se => se.color)),
    };
  });
  info.sort((a, b) => b.score - a.score || a.piecesLeft - b.piecesLeft || a.seatOrder - b.seatOrder);
  return info;
}

function nextTurn(s) {
  s.turnSeat = (s.turnSeat + 1) % s.seats.length;
  if (s.turnSeat === 0) s.round++;
}
function endMatch(s, reason, winnerId) {
  s.phase = 'ended';
  s.endReason = reason;
  s.endCause = reason;
  s.endedAt = Date.now();
  s.winner = winnerId;
  s.losers = s.players.filter(p => p.id !== winnerId).map(p => p.id);
  const summary = {};
  const scores = [];
  for (const p of s.players) {
    const seats = s.seats.filter(se => se.pid === p.id);
    const score = playerScore(s, p.id);
    p.score = score;
    summary[p.id] = {
      squaresLeft: seats.reduce((a, se) => a + (TOTAL_SQUARES - se.squares), 0),
      piecesLeft: seats.reduce((a, se) => a + se.pieces.length, 0),
      bonus: seats.reduce((a, se) => a + se.bonus, 0),
      turns: p.turns,
    };
    scores.push({ id: p.id, name: p.name, score });
  }
  scores.sort((a, b) => b.score - a.score);
  s.final = { summary, scores };
  const winner = pOf(s, winnerId);
  pushLog(s, `${winner ? winner.name : 'Ai đó'} thắng trận!`, 'win');
}

export function createGame(players, opts = {}) {
  if (!players || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error('Blokus chơi 2–4 người.');
  }
  const seed = typeof opts.seed === 'number' ? opts.seed : (Date.now() % 2147483647);
  const n = players.length;
  /* ghế: 4 người 1 màu/người; 3 người 3 màu; 2 người mỗi người 2 màu
     ở 2 góc đối diện (đỏ+vàng, xanh dương+xanh lá), luân phiên theo lượt */
  const seatPids = n === 4 ? [0, 1, 2, 3] : n === 3 ? [0, 1, 2] : [0, 1, 0, 1];
  const s = {
    gid: 'bk-' + seed.toString(36) + '-' + (seed % 9973).toString(36), seq: 0,
    phase: 'playing', /* 'playing' | 'ended' */
    seed,
    players: players.map((p, i) => ({
      id: p.id, name: p.name || ('Người ' + (i + 1)),
      isBot: !!p.isBot, level: p.level || null, local: !!p.local,
      colors: seatPids.map((pid, ci) => pid === i ? ci : -1).filter(ci => ci >= 0),
      turns: 0, score: 0,
    })),
    seats: seatPids.map((pid, ci) => ({
      color: ci, corner: CORNERS[ci].slice(), pid: players[pid].id,
      pieces: PIECE_IDS.slice(), placed: 0, squares: 0, bonus: 0, lastPiece: null,
    })),
    board: new Array(SIZE * SIZE).fill(-1),
    turnSeat: 0, round: 1, consecutivePasses: 0,
    winner: null, losers: [], endReason: null, endCause: null, final: null,
    startedAt: Date.now(), endedAt: 0, log: [],
  };
  pushLog(s, `Ván mới: ${n} người, bàn 20×20, mỗi màu 21 mảnh (89 ô).`);
  return s;
}

export function applyAction(s, pid, act) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Trận đã kết thúc.' };
  const p = pOf(s, pid);
  if (!p) return { ok: false, reason: 'Không tìm thấy người chơi.' };
  if (!act || typeof act.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };

  /* ---------- xin thua: người còn lại có tổng điểm cao nhất thắng ---------- */
  if (act.type === 'resign') {
    const others = s.players.filter(x => x.id !== pid).map(x => x.id);
    const ranked = rankPlayers(s, others);
    endMatch(s, 'resign', ranked[0].id);
    s.seq++;
    pushLog(s, `${p.name} xin thua. ${ranked[0] && pOf(s, ranked[0].id) ? pOf(s, ranked[0].id).name : 'Ai đó'} có tổng điểm cao nhất nên thắng trận!`, 'resign');
    return { ok: true };
  }

  /* chỉ người tới lượt mới được đi */
  if (s.seats[s.turnSeat].pid !== pid) {
    return { ok: false, reason: 'Chưa tới lượt bạn.' };
  }

  /* ---------- đặt mảnh ---------- */
  if (act.type === 'place') {
    const seat = s.seats[s.turnSeat];
    if (act.color !== seat.color) return { ok: false, reason: 'Không phải màu của lượt này.' };
    const chk = validatePlacement(s, seat.color, act.piece, act.rot || 0, !!act.flip, act.r, act.c);
    if (!chk.ok) return { ok: false, reason: chk.reason };
    const cells = orientCells(act.piece, act.rot || 0, !!act.flip);
    for (const [dr, dc] of cells) s.board[idx(act.r + dr, act.c + dc)] = seat.color;
    seat.pieces = seat.pieces.filter(id => id !== act.piece);
    seat.placed++;
    seat.squares += cells.length;
    seat.lastPiece = act.piece;
    if (seat.pieces.length === 0) {
      seat.bonus = act.piece === 'p1' ? 20 : 15;
      pushLog(s, `${p.name} đặt hết 21 mảnh màu ${COLORS[seat.color].name} — thưởng +${seat.bonus}!`, 'bonus');
    }
    p.turns++;
    s.consecutivePasses = 0;
    pushLog(s, `${p.name} đặt mảnh ${act.piece.toUpperCase()} (${cells.length} ô) màu ${COLORS[seat.color].name}.`, 'place');
    nextTurn(s);
    s.seq++;
    return { ok: true };
  }

  /* ---------- bỏ lượt ---------- */
  if (act.type === 'pass') {
    s.consecutivePasses++;
    pushLog(s, `${p.name} bỏ lượt (không còn chỗ đặt / tự bỏ).`, 'pass');
    if (s.consecutivePasses >= s.seats.length) {
      const ranked = rankPlayers(s, s.players.map(x => x.id));
      endMatch(s, 'match', ranked[0].id);
      s.seq++;
      return { ok: true };
    }
    nextTurn(s);
    s.seq++;
    return { ok: true };
  }

  return { ok: false, reason: 'Hành động không hợp lệ.' };
}

/* người đang tới lượt (mỗi lượt chỉ 1 ghế = 1 màu hành động) */
export function actors(s) {
  if (!s || s.phase !== 'playing') return [];
  const seat = s.seats[s.turnSeat];
  return seat ? [seat.pid] : [];
}

export function viewFor(s, pid) {
  const ended = s.phase === 'ended';
  const turnSeat = s.seats[s.turnSeat];
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    round: s.round, turn: turnSeat ? turnSeat.pid : null, turnSeat: s.turnSeat,
    turnColor: turnSeat ? turnSeat.color : null,
    board: s.board.slice(),
    seats: s.seats.map(se => ({
      color: se.color, corner: se.corner.slice(), pid: se.pid,
      pieces: se.pieces.slice(), placed: se.placed, squares: se.squares, bonus: se.bonus,
    })),
    players: s.players.map(p => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
      colors: p.colors.slice(), score: p.score, turns: p.turns,
    })),
    winner: s.winner, losers: (s.losers || []).slice(), endReason: s.endReason, endCause: s.endCause,
    final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    log: s.log.slice(), startedAt: s.startedAt, endedAt: s.endedAt,
    me: pid,
  };
}

export default { createGame, applyAction, viewFor, actors, validatePlacement, legalPlacements, orientCells, scoreOfSeat, playerScore, adjacency };
