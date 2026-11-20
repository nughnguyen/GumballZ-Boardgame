// 🔢 2048 – luật chơi (thuần logic, không chạm DOM).
// Lưới 4×4: trượt 4 hướng, 2 ô bằng nhau kề nhau thì gộp thành 1 ô gấp đôi
// (mỗi ô chỉ gộp 1 lần trong 1 nước). Sau mỗi nước đi thành công thì mọc
// thêm 1 ô mới (90% là 2, 10% là 4) ở 1 ô trống ngẫu nhiên. Điểm = tổng
// các ô gộp được. Đạt ô 2048 là thắng; lưới đầy mà không còn nước gộp được
// thì kẹt (thua). Chế độ: chơi đơn hoặc đua 2–4 người (cùng 1 dãy hạt
// giống nên mọi người mọc ô mới giống hệt nhau về THỨ TỰ — ai đạt 2048
// trước thì thắng; ai kẹt thì bị loại, tất cả đều kẹt thì điểm cao nhất thắng).
export const SIZE = 4;
export const TARGET = 2048;
export const MAX_UNDOS = 5;
export const DIRS = ['up', 'down', 'left', 'right'];

/* bộ sinh số giả ngẫu nhiên có hạt giống (mulberry32) */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* LCG lưu trong state (giống Sudoku/Spyfall): ô mới mọc ra phải giống hệt
   nhau ở mọi máy cùng áp 1 hành động — dùng Math.random() thì 2 máy lệch nhau */
function nextRand(s) {
  s.seed = (s.seed * 1103515245 + 12345) % 2147483648;
  return s.seed / 2147483648;
}
const maxTileOf = grid => { let m = 0; for (const v of grid) if (v > m) m = v; return m; };
const emptyCells = grid => { const out = []; for (let i = 0; i < 16; i++) if (!grid[i]) out.push(i); return out; };

/* trượt 1 hàng (4 ô) về phía trái: gộp các cặp bằng nhau, mỗi ô chỉ gộp
   1 lần trong 1 nước. Trả về {line, gained, changed} */
export function slideLine(line) {
  const tiles = line.filter(v => v);
  const out = [];
  let gained = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      out.push(tiles[i] * 2); gained += tiles[i] * 2; i++;
    } else out.push(tiles[i]);
  }
  while (out.length < 4) out.push(0);
  return { line: out, gained, changed: out.some((v, i) => v !== line[i]) };
}

/* trượt cả lưới theo hướng dir. Trả về {grid, gained, changed} */
export function slideBoard(grid, dir) {
  const g = grid.slice();
  let gained = 0, changed = false;
  const idx = r => [r * 4, r * 4 + 1, r * 4 + 2, r * 4 + 3];
  const col = c => [c, c + 4, c + 8, c + 12];
  if (dir === 'left' || dir === 'right') {
    for (let r = 0; r < 4; r++) {
      const cells = idx(r);
      const line = cells.map(i => g[i]);
      const work = dir === 'right' ? line.slice().reverse() : line;
      const res = slideLine(work);
      const final = dir === 'right' ? res.line.slice().reverse() : res.line;
      gained += res.gained; changed = changed || res.changed;
      cells.forEach((ci, k) => { g[ci] = final[k]; });
    }
  } else {
    for (let c = 0; c < 4; c++) {
      const cells = col(c);
      const line = cells.map(i => g[i]);
      const work = dir === 'down' ? line.slice().reverse() : line;
      const res = slideLine(work);
      const final = dir === 'down' ? res.line.slice().reverse() : res.line;
      gained += res.gained; changed = changed || res.changed;
      cells.forEach((ci, k) => { g[ci] = final[k]; });
    }
  }
  return { grid: g, gained, changed };
}

/* còn nước đi không: còn ô trống, hoặc có 2 ô bằng nhau kề nhau */
export function canMove(grid) {
  if (emptyCells(grid).length) return true;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const v = grid[r * 4 + c];
    if (c < 3 && grid[r * 4 + c + 1] === v) return true;
    if (r < 3 && grid[(r + 1) * 4 + c] === v) return true;
  }
  return false;
}
export function validDirs(grid) { return DIRS.filter(d => slideBoard(grid, d).changed); }

/* mọc 1 ô mới (90% là 2, 10% là 4) ở 1 ô trống ngẫu nhiên — dùng LCG trong state */
function spawnTile(s, grid) {
  const empties = emptyCells(grid);
  if (!empties.length) return null;
  const cell = empties[Math.floor(nextRand(s) * empties.length)];
  const value = nextRand(s) < 0.1 ? 4 : 2;
  grid[cell] = value;
  return { cell, value };
}

const pOf = (s, id) => s.players.find(p => p.id === id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

function finishWin(s, pid) {
  s.phase = 'ended'; s.winner = pid;
  s.losers = s.players.filter(p => p.id !== pid).map(p => p.id);
  s.endReason = 'win'; s.endedAt = Date.now();
  const pr = s.prog[pid];
  if (pr) pr.finishedAt = s.endedAt;
  s.seq++;
  pushLog(s, `🎉 ${(pOf(s, pid) || {}).name || '?'} đạt ô 2048 — thắng cuộc đua!`, 'win');
}
/* tất cả đều kẹt: điểm cao nhất thắng (hòa điểm thì ít nước đi hơn thắng,
   vẫn hòa thì người chơi trước trong danh sách thắng) */
function finishAllStuck(s) {
  s.phase = 'ended'; s.endReason = 'allstuck'; s.endedAt = Date.now();
  const ranked = s.players.slice().sort((a, b) => {
    const pa = s.prog[a.id], pb = s.prog[b.id];
    if (pb.score !== pa.score) return pb.score - pa.score;
    return pa.moves - pb.moves;
  });
  s.winner = ranked[0].id;
  s.losers = s.players.filter(p => p.id !== s.winner).map(p => p.id);
  const pr = s.prog[s.winner];
  if (pr) pr.finishedAt = s.endedAt;
  s.seq++;
  pushLog(s, `🏁 Mọi người đều kẹt — ${(pOf(s, s.winner) || {}).name || '?'} điểm cao nhất (${s.prog[s.winner].score}) nên thắng!`, 'win');
}
function finishAllResign(s) {
  s.phase = 'ended'; s.winner = null;
  s.losers = s.players.map(p => p.id);
  s.endReason = 'resign'; s.endedAt = Date.now();
  s.seq++;
  pushLog(s, '🏳️ Mọi người đều đã xin thua — không ai thắng.', 'win');
}
function checkAllFailed(s) {
  if (s.phase !== 'playing') return;
  if (s.players.every(p => s.prog[p.id].failed)) {
    if (s.players.length === 1) {
      s.phase = 'ended'; s.winner = null;
      s.losers = s.players.map(p => p.id);
      s.endReason = 'stuck'; s.endedAt = Date.now();
      s.seq++;
      pushLog(s, '😢 Lưới đầy mà không còn nước gộp được — kẹt rồi!', 'win');
    } else finishAllStuck(s);
  }
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 1 || players.length > 4) throw new Error('2048 chơi 1–4 người.');
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    seed, /* hạt giống LCG — ô mới mọc phải giống hệt ở mọi máy */
    phase: 'playing', /* 'playing' | 'ended' */
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null })),
    prog: {},
    winner: null, losers: [], endReason: null,
    startedAt: Date.now(), endedAt: null,
    lastMove: null, lastSpawn: null,
    log: [],
  };
  /* lưới khởi đầu CHUNG cho mọi người: 2 ô mọc bằng cùng 1 dãy hạt giống */
  const start = new Array(16).fill(0);
  spawnTile(s, start);
  spawnTile(s, start);
  for (const p of s.players) {
    s.prog[p.id] = { grid: start.slice(), score: 0, moves: 0, maxTile: maxTileOf(start), undosLeft: MAX_UNDOS, history: [], finishedAt: null, failed: false, resigned: false, failedAt: null };
  }
  pushLog(s, '🔢 Ván 2048 bắt đầu — trượt để gộp các ô giống nhau, đạt ô 2048 là thắng!');
  return s;
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < 1 || s.players.length > 4
    || typeof s.seed !== 'number' || typeof s.phase !== 'string' || !s.prog) {
    throw new Error('Trạng thái 2048 không hợp lệ.');
  }
  for (const p of s.players) {
    const pr = s.prog[p.id];
    if (!pr || !Array.isArray(pr.grid) || pr.grid.length !== 16 || typeof pr.score !== 'number') {
      throw new Error('Trạng thái 2048 không hợp lệ.');
    }
  }
  return s;
}

/* trượt 1 nước: gộp ô, cộng điểm, mọc ô mới; đạt 2048 thì thắng, kẹt thì bị loại */
export function applyMove(s, pid, dir) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.failed) return { ok: false, reason: 'Bạn đã bị loại (kẹt rồi).' };
  if (!DIRS.includes(dir)) return { ok: false, reason: 'Hướng không hợp lệ.' };
  const res = slideBoard(pr.grid, dir);
  if (!res.changed) return { ok: false, reason: 'Nước đi không làm gì thay đổi.' };
  /* lưu snapshot để hoàn tác (tối đa 5 lần / ván) */
  pr.history.push({ grid: pr.grid.slice(), score: pr.score });
  if (pr.history.length > MAX_UNDOS) pr.history.shift();
  pr.grid = res.grid;
  pr.score += res.gained;
  pr.moves++;
  pr.maxTile = maxTileOf(pr.grid);
  const sp = spawnTile(s, pr.grid);
  s.lastMove = { by: pid, dir, gained: res.gained, n: pr.moves };
  s.lastSpawn = sp ? { ...sp, by: pid } : null;
  s.seq++;
  if (pr.maxTile >= TARGET) { finishWin(s, pid); return { ok: true, gained: res.gained, won: true }; }
  if (!canMove(pr.grid)) {
    pr.failed = true; pr.failedAt = Date.now();
    pushLog(s, `😢 ${(pOf(s, pid) || {}).name || '?'} kẹt rồi (lưới đầy, không gộp được nữa)!`);
    checkAllFailed(s);
    return { ok: true, gained: res.gained, stuck: true };
  }
  return { ok: true, gained: res.gained };
}

/* hoàn tác 1 nước (chỉ chơi đơn, tối đa 5 lần / ván) */
export function applyUndo(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.failed) return { ok: false, reason: 'Bạn đã bị loại rồi.' };
  if (s.players.length > 1) return { ok: false, reason: 'Đang đua thì không hoàn tác được.' };
  if (pr.undosLeft <= 0) return { ok: false, reason: 'Hết lượt hoàn tác rồi.' };
  const snap = pr.history.pop();
  if (!snap) return { ok: false, reason: 'Chưa có nước nào để hoàn tác.' };
  pr.grid = snap.grid.slice();
  pr.score = snap.score;
  pr.moves = Math.max(0, pr.moves - 1);
  pr.maxTile = maxTileOf(pr.grid);
  pr.undosLeft--;
  s.seq++;
  return { ok: true, undosLeft: pr.undosLeft };
}

/* xin thua: bị loại; chơi đơn thì ván kết thúc luôn */
export function applyResign(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.failed) return { ok: false, reason: 'Bạn đã bị loại rồi.' };
  pr.failed = true; pr.resigned = true;
  pushLog(s, `🏳️ ${(pOf(s, pid) || {}).name || '?'} xin thua.`);
  s.seq++;
  if (s.players.length === 1) { finishAllResign(s); return { ok: true, ended: true }; }
  checkAllFailed(s);
  return { ok: true };
}

/* ai đang phải hành động (cho bot + người rớt mạng): mọi người chưa xong */
export const actors = s => {
  if (s.phase !== 'playing') return [];
  return s.players.filter(p => { const pr = s.prog[p.id]; return pr && !pr.failed && !pr.finishedAt; }).map(p => p.id);
};

/* góc nhìn riêng của 1 người chơi: lưới + điểm CỦA MÌNH + tiến độ của mọi
   người (điểm, ô lớn nhất, số nước, trạng thái); KHÔNG lộ lưới của người khác */
export function viewFor(s, pid) {
  const pr = s.prog[pid] || { grid: new Array(16).fill(0), score: 0, moves: 0, maxTile: 0, undosLeft: MAX_UNDOS, history: [], finishedAt: null, failed: false };
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, target: TARGET,
    startedAt: s.startedAt, endedAt: s.endedAt,
    winner: s.winner, losers: (s.losers || []).slice(), endReason: s.endReason,
    players: s.players.map(p => {
      const q = s.prog[p.id] || {};
      return { id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null, score: q.score || 0, maxTile: q.maxTile || 0, moves: q.moves || 0, failed: !!q.failed, finished: !!q.finishedAt };
    }),
    you: { grid: pr.grid.slice(), score: pr.score, moves: pr.moves, maxTile: pr.maxTile, undosLeft: pr.undosLeft, failed: pr.failed, finished: !!pr.finishedAt },
    lastMove: s.lastMove ? { ...s.lastMove } : null,
    lastSpawn: s.lastSpawn ? { ...s.lastSpawn } : null,
    log: s.log.slice(-20),
    me: pid,
  };
}

/* Adapter cho phòng online (simplenet): action { type, dir? } */
export function applyAction(s, pid, a, ctx) {
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'move': return applyMove(s, pid, a.dir);
    case 'undo': return applyUndo(s, pid);
    case 'resign': return applyResign(s, pid);
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}
