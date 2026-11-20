// 🍬 Xếp Kẹo (match-3) — luật chơi (engine thuần, không phụ thuộc DOM).
//
// LUẬT:
// - Bảng 8×8, 5 loại kẹo (màu + ký hiệu riêng). Đổi chỗ 2 kẹo kề nhau
//   (ngang/dọc); chỉ nước đổi tạo thành hàng 3+ mới hợp lệ (không tạo
//   hàng thì đổi lại, không mất lượt).
// - Hàng 3+ cùng loại (ngang hoặc dọc) thì nổ: 3 kẹo = 60 điểm; 4 kẹo
//   thẳng hàng = 120 điểm + nổ cả hàng/dọc đó; 5+ kẹo thẳng hàng =
//   200 điểm + nổ toàn bộ kẹo cùng loại đó trên bảng. Kẹo rơi xuống lấp
//   chỗ trống, kẹo mới rơi từ trên xuống (RNG có seed, lockstep-safe);
//   dây chuyền (cascade) nhân điểm ×2, ×3... theo số lần nổ liên tiếp
//   trong 1 nước. Ô nổ thêm (ngoài nhóm) +10 điểm/ô.
// - Chơi đơn: 30 lượt, THẮNG khi đạt 10000 điểm trước khi hết lượt;
//   hết 30 lượt chưa đủ 10000 thì thua. Đua (máy / online 2–4 / chung
//   máy 2, mỗi người 1 bảng riêng): cùng 30 lượt, ai nhiều điểm nhất
//   khi hết lượt thì thắng; bằng điểm thì hoà. Xin thua = thua ván
//   (đua thì người còn lại chơi tiếp).
// - Sau mỗi lần nổ xong, nếu bảng không còn nước đổi hợp lệ thì xáo
//   lại bảng (RNG có seed, không tính điểm) tới khi có nước đi và
//   không có hàng sẵn.
// - viewFor: mỗi người chỉ thấy bảng + điểm của MÌNH; đối thủ chỉ thấy
//   tóm tắt (điểm, lượt còn lại, trạng thái) — KHÔNG thấy bảng đối thủ.
export const GRID_W = 8;
export const GRID_H = 8;
export const TYPES = 5; /* 5 loại kẹo: 0..4 */
export const MOVES = 30; /* mỗi người có 30 lượt */
export const TARGET_SCORE = 10000; /* chơi đơn: thắng khi đạt 10000 điểm — ĐÃ HIỆU CHUẨN 2026-11-20 (phân phối đầy 30 lượt, n=100/trình độ): mốc 5000 trong brief quá dễ — người chơi đổi BỪA cũng đạt 46/50 ván; mốc 6000 vẫn dễ (ngẫu nhiên ~60%). Mốc 10000: ngẫu nhiên 26/100, bot Dễ 90/100, bot Khó 100/100 — người chơi casual thắng ~1/4, người chơi khá thắng ~9/10. */
const SCORE_3 = 60;
const SCORE_4 = 120;
const SCORE_5 = 200;
const BONUS_CELL = 10; /* mỗi ô nổ thêm ngoài nhóm: +10 điểm */

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function nextRand(s) {
  s.rng = (s.rng * 1664525 + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
const pOf = (s, id) => s.players.find(p => p.id === id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };
const key = (x, y) => x + ',' + y;
const inBounds = (x, y) => x >= 0 && x < GRID_W && y >= 0 && y < GRID_H;

/* ---------- tìm hàng (nhóm 3+ cùng loại, ngang hoặc dọc) ---------- */
/* Trả về [{cells:[[x,y]...], type, horizontal}] — 1 hàng dài 4/5 là 1 nhóm. */
export function findMatches(grid) {
  const groups = [];
  for (let y = 0; y < GRID_H; y++) {
    let x = 0;
    while (x < GRID_W) {
      const t = grid[y][x];
      if (t < 0) { x++; continue; }
      let x2 = x + 1;
      while (x2 < GRID_W && grid[y][x2] === t) x2++;
      if (x2 - x >= 3) {
        const cells = [];
        for (let i = x; i < x2; i++) cells.push([i, y]);
        groups.push({ cells, type: t, horizontal: true });
      }
      x = x2;
    }
  }
  for (let x = 0; x < GRID_W; x++) {
    let y = 0;
    while (y < GRID_H) {
      const t = grid[y][x];
      if (t < 0) { y++; continue; }
      let y2 = y + 1;
      while (y2 < GRID_H && grid[y2][x] === t) y2++;
      if (y2 - y >= 3) {
        const cells = [];
        for (let i = y; i < y2; i++) cells.push([x, i]);
        groups.push({ cells, type: t, horizontal: false });
      }
      y = y2;
    }
  }
  return groups;
}

/* ---------- kiểm tra nước đổi có tạo hàng không ---------- */
function createsMatchAt(grid, x, y) {
  const t = grid[y][x];
  if (t < 0) return false;
  let n = 1;
  for (let i = x - 1; i >= 0 && grid[y][i] === t; i--) n++;
  for (let i = x + 1; i < GRID_W && grid[y][i] === t; i++) n++;
  if (n >= 3) return true;
  n = 1;
  for (let i = y - 1; i >= 0 && grid[i][x] === t; i--) n++;
  for (let i = y + 1; i < GRID_H && grid[i][x] === t; i++) n++;
  return n >= 3;
}
export function isLegalSwap(grid, x1, y1, x2, y2) {
  if (!inBounds(x1, y1) || !inBounds(x2, y2)) return false;
  if (Math.abs(x1 - x2) + Math.abs(y1 - y2) !== 1) return false;
  if (grid[y1][x1] === grid[y2][x2]) return false; /* đổi 2 kẹo giống nhau = bảng không đổi */
  const g = grid.map(r => r.slice());
  const tmp = g[y1][x1]; g[y1][x1] = g[y2][x2]; g[y2][x2] = tmp;
  return createsMatchAt(g, x1, y1) || createsMatchAt(g, x2, y2);
}
export function legalSwaps(grid) {
  const out = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (x + 1 < GRID_W && isLegalSwap(grid, x, y, x + 1, y)) out.push({ x1: x, y1: y, x2: x + 1, y2: y });
      if (y + 1 < GRID_H && isLegalSwap(grid, x, y, x, y + 1)) out.push({ x1: x, y1: y, x2: x, y2: y + 1 });
    }
  }
  return out;
}
export function hasLegalMove(grid) { return legalSwaps(grid).length > 0; }

/* ---------- rơi + lấp (rand: () => [0,1)) ---------- */
function collapseAndRefill(grid, rand) {
  for (let x = 0; x < GRID_W; x++) {
    let write = GRID_H - 1;
    for (let y = GRID_H - 1; y >= 0; y--) {
      if (grid[y][x] >= 0) { grid[write][x] = grid[y][x]; if (write !== y) grid[y][x] = -1; write--; }
    }
    for (let y = write; y >= 0; y--) grid[y][x] = Math.floor(rand() * TYPES);
  }
}

/* Nổ toàn bộ hàng hiện có trên bảng (kèm dây chuyền), tính điểm.
   grid bị sửa tại chỗ. Trả về {points, maxMult, groups}. */
export function resolveBoard(grid, rand) {
  let points = 0, maxMult = 0, groups = 0, mult = 1, guard = 0;
  while (guard++ < 100) {
    const found = findMatches(grid);
    if (!found.length) break;
    groups += found.length;
    const removed = new Set();
    const groupCells = new Set();
    let stepScore = 0;
    for (const g of found) {
      const n = g.cells.length;
      stepScore += n === 3 ? SCORE_3 : n === 4 ? SCORE_4 : SCORE_5;
      for (const [x, y] of g.cells) { removed.add(key(x, y)); groupCells.add(key(x, y)); }
      if (n === 4) {
        if (g.horizontal) { const y = g.cells[0][1]; for (let x = 0; x < GRID_W; x++) removed.add(key(x, y)); }
        else { const x = g.cells[0][0]; for (let y = 0; y < GRID_H; y++) removed.add(key(x, y)); }
      } else if (n >= 5) {
        for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) if (grid[y][x] === g.type) removed.add(key(x, y));
      }
    }
    for (const k of removed) if (!groupCells.has(k)) stepScore += BONUS_CELL;
    points += stepScore * mult;
    if (mult > maxMult) maxMult = mult;
    for (const k of removed) {
      const [x, y] = k.split(',').map(Number);
      grid[y][x] = -1;
    }
    collapseAndRefill(grid, rand);
    mult++;
  }
  return { points, maxMult, groups };
}

/* Mô phỏng 1 nước đổi trên bản sao (không động vào state thật):
   trả về {score, grid} — grid đã nổ xong, hoặc {score: -1} nếu nước
   đổi không hợp lệ. randSeed là số nguyên (trạng thái RNG hiện tại). */
export function simulateSwap(grid, rngSeed, x1, y1, x2, y2) {
  if (!isLegalSwap(grid, x1, y1, x2, y2)) return { score: -1, grid: null };
  const g = grid.map(r => r.slice());
  const tmp = g[y1][x1]; g[y1][x1] = g[y2][x2]; g[y2][x2] = tmp;
  let rng = rngSeed >>> 0;
  const rand = () => { rng = (rng * 1664525 + 1013904223) >>> 0; return rng / 4294967296; };
  const res = resolveBoard(g, rand);
  return { score: res.points, grid: g, maxMult: res.maxMult, groups: res.groups };
}

/* ---------- sinh bảng ---------- */
function createsMatchOnFill(grid, x, y, t) {
  if (x >= 2 && grid[y][x - 1] === t && grid[y][x - 2] === t) return true;
  if (y >= 2 && grid[y - 1][x] === t && grid[y - 2][x] === t) return true;
  return false;
}
function genGrid(rand) {
  const grid = [];
  for (let y = 0; y < GRID_H; y++) {
    grid.push([]);
    for (let x = 0; x < GRID_W; x++) {
      let t, guard = 0;
      do { t = Math.floor(rand() * TYPES); guard++; }
      while (guard < 50 && createsMatchOnFill(grid, x, y, t));
      grid[y].push(t);
    }
  }
  return grid;
}
/* Xáo lại bảng tới khi không có hàng sẵn và có nước đi (không tính điểm).
   Export để test dùng trực tiếp (luật trong game tự gọi sau mỗi lần nổ). */
export function reshuffleBoard(s, prog) {
  const flat = prog.grid.flat();
  for (let attempt = 0; attempt < 200; attempt++) {
    for (let i = flat.length - 1; i > 0; i--) {
      const j = Math.floor(nextRand(s) * (i + 1));
      const tmp = flat[i]; flat[i] = flat[j]; flat[j] = tmp;
    }
    const g = [];
    for (let y = 0; y < GRID_H; y++) g.push(flat.slice(y * GRID_W, (y + 1) * GRID_W));
    if (findMatches(g).length === 0 && hasLegalMove(g)) {
      prog.grid = g;
      pushLog(s, '🔀 Bảng hết nước đi nên xáo lại — không tính điểm.', '');
      return;
    }
  }
  /* dự phòng (gần như không xảy ra): sinh bảng mới */
  prog.grid = genGrid(() => nextRand(s));
}

function finishSummary(s) {
  const out = {};
  for (const p of s.players) {
    const pr = s.prog[p.id];
    out[p.id] = {
      score: pr.score, matches: pr.matches, maxCascade: pr.maxCascade,
      bestMoveScore: pr.bestMoveScore, movesUsed: pr.movesUsed,
      timeMs: (pr.doneAt || s.endedAt || Date.now()) - s.startedAt,
    };
  }
  return out;
}
function endGame(s, winner, losers, reason) {
  if (s.phase !== 'playing') return;
  s.phase = 'ended'; s.endedAt = Date.now(); s.seq++;
  s.winner = winner;
  s.winnerIds = winner ? [winner] : [];
  s.losers = losers.slice();
  s.endReason = reason; /* 'score' | 'moves' | 'resign' | 'draw' */
  for (const p of s.players) if (!s.prog[p.id].doneAt) s.prog[p.id].doneAt = s.endedAt;
  s.final = { summary: finishSummary(s) };
  if (reason === 'draw') pushLog(s, '🤝 Hoà! Không ai hơn ai.', '');
  else if (winner) pushLog(s, `🏆 ${pOf(s, winner).name} thắng ván!`, 'good');
  else pushLog(s, '😢 Hết ván!', '');
}
/* đua: tất cả đều xong (hết lượt/xin thua) → ai nhiều điểm nhất thắng, bằng điểm thì hoà */
function checkRaceEnd(s) {
  if (s.phase !== 'playing' || s.mode !== 'race') return;
  if (s.players.some(p => s.prog[p.id].status === 'playing')) return;
  const best = Math.max(...s.players.map(p => s.prog[p.id].score || 0));
  const top = s.players.filter(p => (s.prog[p.id].score || 0) === best);
  if (top.length === 1) endGame(s, top[0].id, s.players.filter(p => p.id !== top[0].id).map(p => p.id), 'score');
  else endGame(s, null, s.players.map(p => p.id), 'draw');
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 1 || players.length > 4) throw new Error('Xếp Kẹo chơi 1–4 người (chơi đơn = 1, đua = 2–4).');
  const mode = opts.xcMode === 'solo' ? 'solo' : 'race';
  if (mode === 'solo' && players.length !== 1) throw new Error('Chơi đơn Xếp Kẹo cần đúng 1 người.');
  if (mode === 'race' && players.length < 2) throw new Error('Đua Xếp Kẹo cần 2–4 người.');
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    seed, rng: seed,
    phase: 'playing', /* 'playing' | 'ended' */
    mode, solo: mode === 'solo', race: mode === 'race',
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null })),
    prog: {},
    winner: null, winnerIds: [], losers: [],
    endReason: null, /* 'score' | 'moves' | 'resign' | 'draw' */
    startedAt: Date.now(), endedAt: null,
    log: [],
  };
  for (const p of s.players) {
    let grid;
    for (let attempt = 0; attempt < 100; attempt++) {
      grid = genGrid(() => nextRand(s));
      if (hasLegalMove(grid)) break;
    }
    s.prog[p.id] = {
      grid, score: 0, movesUsed: 0, matches: 0, maxCascade: 0, lastMoveScore: 0, bestMoveScore: 0,
      status: 'playing', doneAt: null,
    };
  }
  pushLog(s, mode === 'solo'
    ? '🍬 Xếp Kẹo — chơi đơn: 30 lượt, đạt 10000 điểm thì thắng!'
    : '🍬 Xếp Kẹo — đua: cùng 30 lượt, ai nhiều điểm nhất thì thắng!');
  return s;
}

export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || typeof s !== 'object' || !Array.isArray(s.players) || !s.prog) throw new Error('Trạng thái Xếp Kẹo không hợp lệ.');
  return s;
}

export function actors(s) {
  if (s.phase !== 'playing') return [];
  return s.players.filter(p => s.prog[p.id] && s.prog[p.id].status === 'playing').map(p => p.id);
}

export function applyAction(s, pid, a, ctx) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const prog = s.prog[pid];
  if (!prog || prog.status !== 'playing') return { ok: false, reason: 'Người chơi không còn trong ván.' };
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'swap': {
      const { x1, y1, x2, y2 } = a;
      if (![x1, y1, x2, y2].every(v => Number.isInteger(v)) || !inBounds(x1, y1) || !inBounds(x2, y2)) {
        return { ok: false, reason: 'Toạ độ không hợp lệ.' };
      }
      if (Math.abs(x1 - x2) + Math.abs(y1 - y2) !== 1) return { ok: false, reason: 'Chỉ đổi được 2 kẹo kề nhau.' };
      if (!isLegalSwap(prog.grid, x1, y1, x2, y2)) return { ok: false, reason: 'Đổi chỗ này không tạo hàng kẹo.' };
      const tmp = prog.grid[y1][x1]; prog.grid[y1][x1] = prog.grid[y2][x2]; prog.grid[y2][x2] = tmp;
      const res = resolveBoard(prog.grid, () => nextRand(s));
      prog.score += res.points;
      prog.lastMoveScore = res.points;
      prog.bestMoveScore = Math.max(prog.bestMoveScore, res.points);
      prog.matches += res.groups;
      if (res.maxMult > prog.maxCascade) prog.maxCascade = res.maxMult;
      prog.movesUsed++;
      pushLog(s, `🍬 ${pOf(s, pid).name} đổi kẹo +${res.points} điểm (dây chuyền ×${Math.max(1, res.maxMult)})`, '');
      if (!hasLegalMove(prog.grid)) reshuffleBoard(s, prog);
      if (s.mode === 'solo') {
        if (prog.score >= TARGET_SCORE) {
          endGame(s, pid, s.players.filter(p => p.id !== pid).map(p => p.id), 'score');
        } else if (prog.movesUsed >= MOVES) {
          endGame(s, null, [pid], 'moves');
        }
      } else {
        if (prog.movesUsed >= MOVES) {
          prog.status = 'done';
          prog.doneAt = Date.now();
          pushLog(s, `🏁 ${pOf(s, pid).name} hết 30 lượt (${prog.score} điểm).`, '');
          checkRaceEnd(s);
        }
      }
      break;
    }
    case 'resign': {
      prog.status = 'resigned';
      prog.doneAt = Date.now();
      pushLog(s, `🏳️ ${pOf(s, pid).name} xin thua.`, 'bad');
      if (s.mode === 'solo') {
        endGame(s, null, [pid], 'resign');
      } else {
        checkRaceEnd(s);
      }
      break;
    }
    default:
      return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
  s.seq++;
  return { ok: true };
}

export function viewFor(s, pid) {
  const me = s.prog[pid] || {};
  const my = me.grid ? {
    grid: me.grid.map(r => r.slice()),
    score: me.score, movesUsed: me.movesUsed, movesLeft: Math.max(0, MOVES - me.movesUsed),
    lastMoveScore: me.lastMoveScore, maxCascade: me.maxCascade,
    bestMoveScore: me.bestMoveScore || 0,
  } : null;
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    startedAt: s.startedAt, endedAt: s.endedAt,
    winner: s.winner, winnerIds: (s.winnerIds || []).slice(), losers: (s.losers || []).slice(), endReason: s.endReason,
    final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    mode: s.mode, solo: s.solo, race: s.race,
    my,
    players: s.players.map(p => {
      const q = s.prog[p.id] || {};
      return {
        id: p.id, name: p.name, isBot: !!p.isBot, botLevel: p.level || null,
        score: q.score || 0, movesUsed: q.movesUsed || 0,
        movesLeft: Math.max(0, MOVES - (q.movesUsed || 0)),
        status: q.status || 'playing',
      };
    }),
    log: s.log.slice(-20),
    me: pid,
  };
}
