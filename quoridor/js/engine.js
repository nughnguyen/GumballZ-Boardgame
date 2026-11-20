// 🧱 Quoridor – luật chơi (thuần logic, không chạm DOM).
// 2–4 người, bàn 9×9 ô; mỗi người 1 quân + tường (2 người: 10 tường
// mỗi người; 3–4 người: 5 tường mỗi người). Mỗi lượt hoặc đi quân 1 ô
// theo 4 hướng, hoặc đặt 1 tường (dài 2 ô, ngang hoặc dọc, vào khe
// giữa các ô). Quân kề nhau thì được nhảy thẳng qua 1 ô (ô sau trống
// và không bị tường chặn); nếu ô sau bị tường chặn hoặc ra khỏi bàn
// thì được nhảy chéo sang 1 trong 2 ô bên của quân đối thủ. Tường
// không được chặn kín hoàn toàn đường đi của bất kỳ ai tới đích
// (kiểm bằng BFS trước khi cho đặt). Thắng: đưa quân tới hàng đích
// đối diện trước tiên. Xin thua dừng ván ngay, người còn lại có
// đường BFS ngắn nhất tới đích thắng (hòa thì ít lượt hơn, rồi theo
// thứ tự ghế).
// Vị trí bắt đầu / đích: p0 dưới (8,4) → hàng 0; p1 trên (0,4) → hàng 8;
// p2 trái (4,0) → cột 8; p3 phải (4,8) → cột 0. 3 người dùng p0, p1, p2.
// Tường: tường ngang hWalls "r,c" (r 0..7, c 0..7) chắn giữa hàng r và
// r+1, phủ cột c..c+1; tường dọc vWalls "r,c" chắn giữa cột c và c+1,
// phủ hàng r..r+1. Engine xác định hoàn toàn theo seed (không dùng
// Math.random; seed chỉ để định danh ván).
// summary cuối trận: dist (khoảng cách BFS ngắn nhất tới đích lúc kết
// thúc), wallsLeft (tường còn lại), turns (số lượt đã đi). Điểm: người
// thắng 10, người thua −dist (càng gần đích càng cao).
export const SIZE = 9;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const WALLS_2P = 10;
export const WALLS_MP = 5;

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STARTS = [[8, 4], [0, 4], [4, 0], [4, 8]];
const GOALS = [
  { type: 'row', v: 0 }, { type: 'row', v: 8 },
  { type: 'col', v: 8 }, { type: 'col', v: 0 },
];
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const inBoard = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
const key = (r, c) => r + ',' + c;
const pOf = (s, id) => s.players.find(p => p.id === id);
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < MIN_PLAYERS || s.players.length > MAX_PLAYERS
    || !Array.isArray(s.hWalls) || !Array.isArray(s.vWalls)
    || typeof s.phase !== 'string' || typeof s.turnIdx !== 'number') {
    throw new Error('Trạng thái Quoridor không hợp lệ.');
  }
  return s;
}
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

/* ---------- tường chắn ---------- */
/* đi từ (r,c) sang ô kề (nr,nc): có tường chắn giữa 2 ô không? */
export function blockedByWall(hSet, vSet, r, c, nr, nc) {
  if (nr === r + 1 && nc === c) return hSet.has(key(r, c)) || hSet.has(key(r, c - 1));
  if (nr === r - 1 && nc === c) return hSet.has(key(r - 1, c)) || hSet.has(key(r - 1, c - 1));
  if (nr === r && nc === c + 1) return vSet.has(key(r, c)) || vSet.has(key(r - 1, c));
  if (nr === r && nc === c - 1) return vSet.has(key(r, c - 1)) || vSet.has(key(r - 1, c - 1));
  return true; /* không kề nhau: coi như bị chặn */
}
function wallSets(s) { return { h: new Set(s.hWalls), v: new Set(s.vWalls) }; }

/* ---------- BFS: khoảng cách ngắn nhất tới đích (bỏ qua quân khác) ---------- */
export function distToGoal(hSet, vSet, pos, goal) {
  const [sr, sc] = pos;
  if ((goal.type === 'row' && sr === goal.v) || (goal.type === 'col' && sc === goal.v)) return 0;
  const seen = new Set([key(sr, sc)]);
  const q = [[sr, sc, 0]];
  while (q.length) {
    const [r, c, d] = q.shift();
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (!inBoard(nr, nc) || seen.has(key(nr, nc))) continue;
      if (blockedByWall(hSet, vSet, r, c, nr, nc)) continue;
      if ((goal.type === 'row' && nr === goal.v) || (goal.type === 'col' && nc === goal.v)) return d + 1;
      seen.add(key(nr, nc));
      q.push([nr, nc, d + 1]);
    }
  }
  return Infinity; /* bị chặn kín */
}
export function distOf(s, pid) {
  const p = pOf(s, pid);
  if (!p) return Infinity;
  const { h, v } = wallSets(s);
  return distToGoal(h, v, p.pos, p.goal);
}

/* ---------- nước đi của quân ---------- */
export function legalMoves(s, pid) {
  const p = pOf(s, pid);
  if (!p || s.phase !== 'playing') return [];
  const { h, v } = wallSets(s);
  const [r, c] = p.pos;
  const occ = new Map();
  for (const q of s.players) occ.set(key(q.pos[0], q.pos[1]), q.id);
  const out = [];
  for (const [dr, dc] of DIRS) {
    const ar = r + dr, ac = c + dc;
    if (!inBoard(ar, ac) || blockedByWall(h, v, r, c, ar, ac)) continue;
    if (!occ.has(key(ar, ac))) { out.push({ type: 'move', to: [ar, ac] }); continue; }
    /* quân đối thủ kề: nhảy thẳng qua nếu được, không thì nhảy chéo */
    const br = ar + dr, bc = ac + dc;
    if (inBoard(br, bc) && !blockedByWall(h, v, ar, ac, br, bc) && !occ.has(key(br, bc))) {
      out.push({ type: 'move', to: [br, bc] });
      continue;
    }
    for (const [pr, pc] of [[dc, dr], [-dc, -dr]]) {
      const dr2 = ar + pr, dc2 = ac + pc;
      if (!inBoard(dr2, dc2) || occ.has(key(dr2, dc2))) continue;
      if (blockedByWall(h, v, ar, ac, dr2, dc2)) continue;
      out.push({ type: 'move', to: [dr2, dc2] });
    }
  }
  return out;
}

/* ---------- đặt tường ---------- */
export function validateWall(s, pid, w) {
  if (!w || (w.orient !== 'h' && w.orient !== 'v')
    || !Number.isInteger(w.r) || !Number.isInteger(w.c)
    || w.r < 0 || w.r > SIZE - 2 || w.c < 0 || w.c > SIZE - 2) {
    return { ok: false, reason: 'Vị trí tường không hợp lệ.' };
  }
  const p = pOf(s, pid);
  if (!p) return { ok: false, reason: 'Không tìm thấy người chơi.' };
  if (p.wallsLeft <= 0) return { ok: false, reason: 'Bạn đã hết tường.' };
  const k = key(w.r, w.c);
  if (w.orient === 'h') {
    if (s.hWalls.includes(k)) return { ok: false, reason: 'Đã có tường ở đây rồi.' };
    if (s.vWalls.includes(k)) return { ok: false, reason: 'Tường dọc đã chắn ngang đây rồi.' };
  } else {
    if (s.vWalls.includes(k)) return { ok: false, reason: 'Đã có tường ở đây rồi.' };
    if (s.hWalls.includes(k)) return { ok: false, reason: 'Tường ngang đã chắn ngang đây rồi.' };
  }
  /* luật "luôn còn đường đi": mọi người vẫn phải tới được đích */
  const h = new Set(s.hWalls), v = new Set(s.vWalls);
  if (w.orient === 'h') h.add(k); else v.add(k);
  for (const q of s.players) {
    if (distToGoal(h, v, q.pos, q.goal) === Infinity) {
      return { ok: false, reason: 'Tường này chặn kín đường đi của ' + q.name + '.' };
    }
  }
  return { ok: true, reason: '' };
}
export function legalWalls(s, pid) {
  const out = [];
  for (const orient of ['h', 'v']) {
    for (let r = 0; r <= SIZE - 2; r++) {
      for (let c = 0; c <= SIZE - 2; c++) {
        if (validateWall(s, pid, { orient, r, c }).ok) out.push({ orient, r, c });
      }
    }
  }
  return out;
}
export function legalActions(s, pid) {
  return legalMoves(s, pid).concat(legalWalls(s, pid).map(w => ({ type: 'wall', ...w })));
}

function isGoal(pos, goal) {
  return (goal.type === 'row' && pos[0] === goal.v) || (goal.type === 'col' && pos[1] === goal.v);
}
function nextTurn(s) {
  s.turnIdx = (s.turnIdx + 1) % s.players.length;
  if (s.turnIdx === 0) s.round++;
}
function endMatch(s, reason, winnerId) {
  s.phase = 'ended';
  s.endReason = reason;
  s.endCause = reason;
  s.endedAt = Date.now();
  s.winner = winnerId;
  s.losers = s.players.filter(p => p.id !== winnerId).map(p => p.id);
  const { h, v } = wallSets(s);
  const summary = {};
  const scores = [];
  for (const p of s.players) {
    const d = distToGoal(h, v, p.pos, p.goal);
    const score = p.id === winnerId ? 10 : -d;
    p.score = score;
    summary[p.id] = { dist: d, wallsLeft: p.wallsLeft, turns: p.turns };
    scores.push({ id: p.id, name: p.name, score });
  }
  scores.sort((a, b) => b.score - a.score);
  s.final = { summary, scores };
  const winner = pOf(s, winnerId);
  pushLog(s, `${winner ? winner.name : 'Ai đó'} thắng trận!`, 'win');
}

export function createGame(players, opts = {}) {
  if (!players || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error('Quoridor chơi 2–4 người.');
  }
  const seed = typeof opts.seed === 'number' ? opts.seed : (Date.now() % 2147483647);
  const n = players.length;
  const walls = n === 2 ? WALLS_2P : WALLS_MP;
  const s = {
    gid: 'qd-' + seed.toString(36) + '-' + (seed % 9973).toString(36), seq: 0,
    phase: 'playing', /* 'playing' | 'ended' */
    seed,
    players: players.map((p, i) => ({
      id: p.id, name: p.name || ('Người ' + (i + 1)),
      isBot: !!p.isBot, level: p.level || null, local: !!p.local,
      pos: STARTS[i].slice(), goal: { ...GOALS[i] },
      wallsLeft: walls, turns: 0, score: 0,
    })),
    hWalls: [], vWalls: [],
    turnIdx: 0, round: 1,
    winner: null, losers: [], endReason: null, endCause: null, final: null,
    startedAt: Date.now(), endedAt: 0, log: [],
  };
  pushLog(s, `Ván mới: ${n} người, bàn 9×9, mỗi người ${walls} tường.`);
  return s;
}

export function applyAction(s, pid, act) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Trận đã kết thúc.' };
  const p = pOf(s, pid);
  if (!p) return { ok: false, reason: 'Không tìm thấy người chơi.' };
  if (!act || typeof act.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };

  /* ---------- xin thua: người còn lại gần đích nhất thắng ---------- */
  if (act.type === 'resign') {
    const others = s.players.filter(x => x.id !== pid);
    const { h, v } = wallSets(s);
    const ranked = [...others].sort((a, b) =>
      distToGoal(h, v, a.pos, a.goal) - distToGoal(h, v, b.pos, b.goal)
      || a.turns - b.turns
      || s.players.indexOf(a) - s.players.indexOf(b));
    endMatch(s, 'resign', ranked[0].id);
    s.seq++;
    pushLog(s, `${p.name} xin thua. ${ranked[0].name} gần đích nhất nên thắng trận!`, 'resign');
    return { ok: true };
  }

  /* chỉ người tới lượt mới được đi */
  if (s.players[s.turnIdx].id !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };

  /* ---------- đi quân ---------- */
  if (act.type === 'move') {
    const to = act.to;
    if (!Array.isArray(to) || to.length !== 2 || !Number.isInteger(to[0]) || !Number.isInteger(to[1])) {
      return { ok: false, reason: 'Ô đích không hợp lệ.' };
    }
    const ok = legalMoves(s, pid).some(m => m.to[0] === to[0] && m.to[1] === to[1]);
    if (!ok) return { ok: false, reason: 'Không đi được tới ô đó.' };
    p.pos = [to[0], to[1]];
    p.turns++;
    pushLog(s, `${p.name} đi tới (${to[0] + 1},${to[1] + 1}).`, 'move');
    if (isGoal(p.pos, p.goal)) {
      endMatch(s, 'match', pid);
      s.seq++;
      return { ok: true };
    }
    nextTurn(s);
    s.seq++;
    return { ok: true };
  }

  /* ---------- đặt tường ---------- */
  if (act.type === 'wall') {
    const chk = validateWall(s, pid, act);
    if (!chk.ok) return { ok: false, reason: chk.reason };
    const k = key(act.r, act.c);
    if (act.orient === 'h') s.hWalls.push(k); else s.vWalls.push(k);
    p.wallsLeft--;
    p.turns++;
    pushLog(s, `${p.name} đặt tường ${act.orient === 'h' ? 'ngang' : 'dọc'} ở (${act.r + 1},${act.c + 1}) — còn ${p.wallsLeft} tường.`, 'wall');
    nextTurn(s);
    s.seq++;
    return { ok: true };
  }

  return { ok: false, reason: 'Hành động không hợp lệ.' };
}

/* người đang tới lượt (mỗi lượt chỉ 1 người hành động) */
export function actors(s) {
  if (!s || s.phase !== 'playing') return [];
  const p = s.players[s.turnIdx];
  return p ? [p.id] : [];
}

export function viewFor(s, pid) {
  const me = pOf(s, pid);
  const ended = s.phase === 'ended';
  const { h, v } = wallSets(s);
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    round: s.round, turn: s.players[s.turnIdx] ? s.players[s.turnIdx].id : null, turnIdx: s.turnIdx,
    hWalls: s.hWalls.slice(), vWalls: s.vWalls.slice(),
    players: s.players.map(p => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
      pos: p.pos.slice(), goal: { ...p.goal }, wallsLeft: p.wallsLeft,
      dist: distToGoal(h, v, p.pos, p.goal), score: p.score, turns: p.turns,
    })),
    winner: s.winner, losers: (s.losers || []).slice(), endReason: s.endReason, endCause: s.endCause,
    final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    log: s.log.slice(), startedAt: s.startedAt, endedAt: s.endedAt,
    me: pid,
  };
}

export default { createGame, applyAction, viewFor, actors, legalMoves, legalWalls, legalActions, distToGoal, validateWall, blockedByWall };
