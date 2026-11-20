// 💣 Dò Mìn – luật chơi (thuần logic, không chạm DOM).
// Dò mìn kinh điển: bấm ô để mở, số hiện = số mìn kề 8 ô xung quanh, mở
// ô 0 thì lan ra cả vùng trống + viền số; cắm cờ để đánh dấu mìn nghi ngờ.
// Bấm trúng mìn là nổ (bị loại); mở hết ô an toàn là thắng. Cú bấm đầu
// tiên của ván LUÔN an toàn (mìn chỉ đặt sau cú bấm đó, trừ ô bấm + 8 ô
// kề). Chế độ: chơi đơn (tính giờ) hoặc đua 2–4 người (cùng 1 bãi mìn,
// ai mở hết trước thì thắng; ai nổ thì bị loại khỏi cuộc đua).
export const DIFFS = {
  easy: { name: 'Dễ', rows: 9, cols: 9, mines: 10 },
  medium: { name: 'Vừa', rows: 16, cols: 16, mines: 40 },
  hard: { name: 'Khó', rows: 16, cols: 30, mines: 99 },
};
export const OPT_CHOICES = { difficulty: ['easy', 'medium', 'hard'] };

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* LCG lưu trong state: đặt mìn phải giống hệt nhau ở mọi máy cùng áp
   1 hành động mở ô đầu tiên — dùng Math.random() thì 2 máy lệch nhau */
function nextRand(s) {
  s.seed = (s.seed * 1103515245 + 12345) % 2147483648;
  return s.seed / 2147483648;
}
export function idxOf(r, c, cols) { return r * cols + c; }
export function rowOf(i, cols) { return (i / cols) | 0; }
export function colOf(i, cols) { return i % cols; }
/* 8 ô kề của ô i (trong biên) */
export function neighborsOf(i, rows, cols) {
  const r = rowOf(i, cols), c = colOf(i, cols), out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(idxOf(nr, nc, cols));
  }
  return out;
}
/* số mìn kề cho mọi ô (-1 = mìn). mines là Set/array các chỉ số ô mìn */
export function computeNumbers(rows, cols, mines) {
  const set = mines instanceof Set ? mines : new Set(mines || []);
  const n = new Array(rows * cols).fill(0);
  for (const m of set) {
    n[m] = -1;
    for (const nb of neighborsOf(m, rows, cols)) if (n[nb] !== -1) n[nb]++;
  }
  return n;
}
const pOf = (s, id) => s.players.find(p => p.id === id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };
const totalCells = s => s.rows * s.cols;
const safeTotal = s => totalCells(s) - s.minesCount;
/* đặt mìn sau cú bấm đầu tiên: trừ ô bấm + 8 ô kề, xáo bằng LCG trong state */
function placeMines(s, firstIdx) {
  const banned = new Set([firstIdx, ...neighborsOf(firstIdx, s.rows, s.cols)]);
  const pool = [];
  for (let i = 0; i < totalCells(s); i++) if (!banned.has(i)) pool.push(i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand(s) * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  s.mines = pool.slice(0, s.minesCount).sort((a, b) => a - b);
  s.numbers = computeNumbers(s.rows, s.cols, s.mines);
}
function finishWin(s, pid) {
  s.phase = 'ended'; s.winner = pid;
  s.losers = s.players.filter(p => p.id !== pid).map(p => p.id);
  s.endReason = 'win'; s.endedAt = Date.now();
  const pr = s.prog[pid];
  if (pr) pr.finishedAt = s.endedAt;
  s.seq++;
  pushLog(s, `🎉 ${(pOf(s, pid) || {}).name || '?'} mở hết bãi mìn trước tiên — thắng cuộc đua!`, 'win');
}
function finishAllFail(s, reason) {
  s.phase = 'ended'; s.winner = null;
  s.losers = s.players.map(p => p.id);
  s.endReason = reason; s.endedAt = Date.now();
  s.seq++;
  pushLog(s, reason === 'resign' ? '🏳️ Mọi người đều đã xin thua — không ai thắng.' : '😢 Mọi người đều nổ mìn — không ai thắng.', 'win');
}
function checkAllFailed(s) {
  if (s.phase !== 'playing') return;
  if (s.players.every(p => s.prog[p.id].failed)) finishAllFail(s, 'allfail');
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 1 || players.length > 4) throw new Error('Dò Mìn chơi 1–4 người.');
  const difficulty = OPT_CHOICES.difficulty.includes(opts.difficulty) ? opts.difficulty : 'easy';
  const d = DIFFS[difficulty];
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    seed, /* hạt giống LCG — đặt mìn phải giống hệt ở mọi máy */
    phase: 'playing', /* 'playing' | 'ended' */
    difficulty, rows: d.rows, cols: d.cols, minesCount: d.mines,
    mines: null, /* chưa đặt — đặt sau cú bấm đầu tiên */
    numbers: null,
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null })),
    prog: {},
    winner: null, losers: [], endReason: null,
    startedAt: Date.now(), endedAt: null,
    log: [],
  };
  for (const p of s.players) s.prog[p.id] = { revealed: [], flags: {}, finishedAt: null, failed: false, resigned: false, explodedAt: null };
  pushLog(s, `💣 Bãi mìn ${d.name} bắt đầu — ${d.rows}×${d.cols}, ${d.mines} quả mìn. Cú bấm đầu tiên luôn an toàn!`);
  return s;
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < 1 || s.players.length > 4
    || !DIFFS[s.difficulty] || typeof s.rows !== 'number' || typeof s.cols !== 'number'
    || typeof s.minesCount !== 'number' || !s.prog || typeof s.phase !== 'string'
    || (s.mines !== null && !Array.isArray(s.mines))) {
    throw new Error('Trạng thái Dò Mìn không hợp lệ.');
  }
  if (s.mines !== null && s.mines.length !== s.minesCount) throw new Error('Số mìn không khớp.');
  return s;
}

/* mở 1 ô: trúng mìn thì nổ; ô 0 thì lan ra cả vùng trống + viền số */
export function applyReveal(s, pid, cell) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.failed) return { ok: false, reason: 'Bạn đã bị loại (nổ mìn).' };
  if (!Number.isInteger(cell) || cell < 0 || cell >= totalCells(s)) return { ok: false, reason: 'Ô không hợp lệ.' };
  if (pr.revealed.includes(cell)) return { ok: false, reason: 'Ô này mở rồi.' };
  if (pr.flags[cell]) return { ok: false, reason: 'Ô này đang cắm cờ — bỏ cờ trước đã.' };
  if (s.mines === null) placeMines(s, cell);
  const mineSet = new Set(s.mines);
  if (mineSet.has(cell)) {
    pr.failed = true;
    pr.explodedAt = cell;
    pushLog(s, `💥 ${(pOf(s, pid) || {}).name || '?'} bấm trúng mìn — bị loại khỏi cuộc đua!`);
    s.seq++;
    if (s.players.length === 1) { finishAllFail(s, 'boom'); return { ok: true, boom: true, ended: true }; }
    checkAllFailed(s);
    return { ok: true, boom: true, failed: true };
  }
  /* lan vùng trống: BFS từ ô 0 */
  const newly = [];
  const stack = [cell];
  const seen = new Set([cell]);
  while (stack.length) {
    const cur = stack.pop();
    if (pr.revealed.includes(cur)) continue;
    pr.revealed.push(cur);
    newly.push(cur);
    if (s.numbers[cur] === 0) {
      for (const nb of neighborsOf(cur, s.rows, s.cols)) {
        if (!seen.has(nb) && !pr.revealed.includes(nb) && !pr.flags[nb]) { seen.add(nb); stack.push(nb); }
      }
    }
  }
  s.seq++;
  if (pr.revealed.length >= safeTotal(s)) { finishWin(s, pid); return { ok: true, opened: newly, finished: true }; }
  return { ok: true, opened: newly };
}

/* cắm / nhổ cờ ở ô chưa mở */
export function applyFlag(s, pid, cell) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.failed) return { ok: false, reason: 'Bạn đã bị loại.' };
  if (!Number.isInteger(cell) || cell < 0 || cell >= totalCells(s)) return { ok: false, reason: 'Ô không hợp lệ.' };
  if (pr.revealed.includes(cell)) return { ok: false, reason: 'Ô này mở rồi, không cắm cờ được.' };
  if (pr.flags[cell]) delete pr.flags[cell];
  else pr.flags[cell] = true;
  s.seq++;
  return { ok: true, flagged: !!pr.flags[cell] };
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
  if (s.players.length === 1) { finishAllFail(s, 'resign'); return { ok: true, ended: true }; }
  checkAllFailed(s);
  return { ok: true };
}

/* ai đang phải hành động: mọi người chưa xong */
export const actors = s => {
  if (s.phase !== 'playing') return [];
  return s.players.filter(p => { const pr = s.prog[p.id]; return pr && !pr.failed && !pr.finishedAt; }).map(p => p.id);
};

/* góc nhìn riêng của 1 người chơi: chỉ số của các ô MÌNH đã mở + cờ của
   mình + tiến độ của mọi người (số ô đã mở, số cờ, trạng thái). KHÔNG bao
   giờ lộ vị trí mìn khi đang chơi — chỉ khi ván kết thúc mới lộ toàn bộ
   bãi mìn (để xem lại). */
export function viewFor(s, pid) {
  const pr = s.prog[pid] || { revealed: [], flags: {}, finishedAt: null, failed: false, explodedAt: null };
  const revealedSet = new Set(pr.revealed);
  const numbers = {};
  if (s.numbers) for (const i of pr.revealed) numbers[i] = s.numbers[i];
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, difficulty: s.difficulty,
    rows: s.rows, cols: s.cols, minesCount: s.minesCount, safeTotal: safeTotal(s),
    startedAt: s.startedAt, endedAt: s.endedAt,
    winner: s.winner, losers: (s.losers || []).slice(), endReason: s.endReason,
    mines: s.phase === 'ended' && s.mines ? s.mines.slice() : null,
    players: s.players.map(p => {
      const q = s.prog[p.id] || {};
      const rev = q.revealed || [];
      return { id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null, revealed: rev.length, flags: Object.keys(q.flags || {}).length, failed: !!q.failed, finished: !!q.finishedAt, explodedAt: q.explodedAt != null ? q.explodedAt : null };
    }),
    you: { revealed: pr.revealed.slice(), flags: Object.keys(pr.flags || {}).map(x => +x), numbers, failed: pr.failed, finished: !!pr.finishedAt, explodedAt: pr.explodedAt != null ? pr.explodedAt : null },
    log: s.log.slice(-20),
    me: pid,
  };
}

/* Adapter cho phòng online (simplenet): action { type, cell? } */
export function applyAction(s, pid, a, ctx) {
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'reveal': return applyReveal(s, pid, a.cell);
    case 'flag': return applyFlag(s, pid, a.cell);
    case 'resign': return applyResign(s, pid);
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}
