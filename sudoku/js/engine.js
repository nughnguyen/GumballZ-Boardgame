// 🔢 Sudoku – luật chơi (thuần logic, không chạm DOM).
// Lưới 9×9: điền số 1–9 sao cho mỗi hàng, mỗi cột và mỗi khối 3×3 đều
// chứa đủ 1–9 đúng 1 lần. Số cho sẵn (givens) không đổi được. Mỗi ván 1
// câu đố sinh bằng hạt giống, có nghiệm duy nhất (bỏ ô theo cặp đối xứng
// qua tâm, chỉ giữ khi vẫn duy nhất nghiệm). Sai 3 lần thì thua ván.
// Chế độ: chơi đơn (1 người) hoặc đua 2–4 người (cùng 1 câu đố, ai giải
// xong trước thì thắng; người sai 3 lần thì bị loại khỏi cuộc đua).
export const DIFFS = {
  easy: { name: 'Dễ', givens: 44 },
  medium: { name: 'Vừa', givens: 34 },
  hard: { name: 'Khó', givens: 28 },
  expert: { name: 'Chuyên gia', givens: 24 },
};
export const HINTS_PER_GAME = 3;
export const MAX_MISTAKES = 3;
export const OPT_CHOICES = { difficulty: ['easy', 'medium', 'hard', 'expert'] };

const FULL = 0x1ff; /* 9 bit: đủ số 1–9 */
const boxOf = i => (((i / 27) | 0) * 3) + (((i % 9) / 3) | 0);
const popcount = m => { let n = 0; while (m) { m &= m - 1; n++; } return n; };

/* bộ sinh số giả ngẫu nhiên có hạt giống (mulberry32) */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* LCG lưu trong state (giống Spyfall): chọn ô gợi ý phải giống hệt nhau
   ở mọi máy cùng áp 1 hành động 'hint' — dùng Math.random() thì 2 máy lệch nhau */
function nextRand(s) {
  s.seed = (s.seed * 1103515245 + 12345) % 2147483648;
  return s.seed / 2147483648;
}
function shuffled(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* đếm số nghiệm của lưới (tối đa limit) — quay lui + chọn ô ít ứng viên nhất */
export function countSolutions(grid, limit = 2) {
  const g = grid.slice();
  const rowM = new Array(9).fill(0), colM = new Array(9).fill(0), boxM = new Array(9).fill(0);
  for (let i = 0; i < 81; i++) {
    const v = g[i];
    if (v) { const b = 1 << (v - 1); rowM[(i / 9) | 0] |= b; colM[i % 9] |= b; boxM[boxOf(i)] |= b; }
  }
  const empties = [];
  for (let i = 0; i < 81; i++) if (!g[i]) empties.push(i);
  let count = 0;
  function dfs(k) {
    if (count >= limit) return;
    if (k === empties.length) { count++; return; }
    let best = -1, bestMask = 0, bestN = 10;
    for (let j = k; j < empties.length; j++) {
      const i = empties[j];
      const mask = FULL & ~(rowM[(i / 9) | 0] | colM[i % 9] | boxM[boxOf(i)]);
      const n = popcount(mask);
      if (n === 0) return;
      if (n < bestN) { bestN = n; best = j; bestMask = mask; if (n === 1) break; }
    }
    [empties[k], empties[best]] = [empties[best], empties[k]];
    const i = empties[k], r = (i / 9) | 0, c = i % 9, b = boxOf(i);
    let m = bestMask;
    while (m) {
      const bit = m & -m; m ^= bit;
      const v = Math.log2(bit) + 1;
      g[i] = v; rowM[r] |= bit; colM[c] |= bit; boxM[b] |= bit;
      dfs(k + 1);
      g[i] = 0; rowM[r] &= ~bit; colM[c] &= ~bit; boxM[b] &= ~bit;
      if (count >= limit) break;
    }
    [empties[k], empties[best]] = [empties[best], empties[k]];
  }
  dfs(0);
  return count;
}

/* sinh 1 lưới đầy đúng luật (quay lui, thứ tự số xáo bằng hạt giống) */
function fullSolution(rnd) {
  const g = new Array(81).fill(0);
  const rowM = new Array(9).fill(0), colM = new Array(9).fill(0), boxM = new Array(9).fill(0);
  function dfs(pos) {
    if (pos === 81) return true;
    const i = pos, r = (i / 9) | 0, c = i % 9, b = boxOf(i);
    const mask = FULL & ~(rowM[r] | colM[c] | boxM[b]);
    const digits = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], rnd).filter(d => mask & (1 << (d - 1)));
    for (const d of digits) {
      const bit = 1 << (d - 1);
      g[i] = d; rowM[r] |= bit; colM[c] |= bit; boxM[b] |= bit;
      if (dfs(pos + 1)) return true;
      g[i] = 0; rowM[r] &= ~bit; colM[c] &= ~bit; boxM[b] &= ~bit;
    }
    return false;
  }
  dfs(0);
  return g;
}

/* sinh câu đố: bỏ ô theo cặp đối xứng (i, 80-i) + ô giữa, chỉ giữ khi vẫn
   duy nhất nghiệm; dừng khi đủ số givens mục tiêu (không ép được thì nhận
   số givens cao hơn 1 chút — câu đố vẫn đúng luật, chỉ dễ hơn 1 tí) */
export function generatePuzzle(difficulty, seed) {
  const diff = DIFFS[difficulty] ? difficulty : 'medium';
  const target = DIFFS[diff].givens;
  const rnd = mulberry32(seed >>> 0 || 1);
  const solution = fullSolution(rnd);
  const givens = solution.slice();
  const pairs = [];
  for (let i = 0; i < 40; i++) pairs.push([i, 80 - i]);
  for (const [a, b] of shuffled(pairs, rnd)) {
    if (81 - 2 > 0 && countGivens(givens) - 2 < target) break;
    const sa = givens[a], sb = givens[b];
    givens[a] = 0; givens[b] = 0;
    if (countSolutions(givens, 2) !== 1) { givens[a] = sa; givens[b] = sb; }
  }
  if (givens[40] && countGivens(givens) - 1 >= target) {
    const sv = givens[40];
    givens[40] = 0;
    if (countSolutions(givens, 2) !== 1) givens[40] = sv;
  }
  return { solution, givens, givensCount: countGivens(givens), difficulty: diff };
}
export function countGivens(givens) { let n = 0; for (const v of givens) if (v) n++; return n; }
/* giải 1 câu đố (trả về lưới đầy hoặc null nếu vô nghiệm / nhiều nghiệm) */
export function solvePuzzle(givens) {
  if (countSolutions(givens, 2) !== 1) return null;
  const g = givens.slice();
  const rowM = new Array(9).fill(0), colM = new Array(9).fill(0), boxM = new Array(9).fill(0);
  for (let i = 0; i < 81; i++) { const v = g[i]; if (v) { const b = 1 << (v - 1); rowM[(i / 9) | 0] |= b; colM[i % 9] |= b; boxM[boxOf(i)] |= b; } }
  const empties = [];
  for (let i = 0; i < 81; i++) if (!g[i]) empties.push(i);
  function dfs(k) {
    if (k === empties.length) return true;
    let best = -1, bestMask = 0, bestN = 10;
    for (let j = k; j < empties.length; j++) {
      const i = empties[j];
      const mask = FULL & ~(rowM[(i / 9) | 0] | colM[i % 9] | boxM[boxOf(i)]);
      const n = popcount(mask);
      if (n === 0) return false;
      if (n < bestN) { bestN = n; best = j; bestMask = mask; if (n === 1) break; }
    }
    [empties[k], empties[best]] = [empties[best], empties[k]];
    const i = empties[k], r = (i / 9) | 0, c = i % 9, b = boxOf(i);
    let m = bestMask;
    while (m) {
      const bit = m & -m; m ^= bit;
      const v = Math.log2(bit) + 1;
      g[i] = v; rowM[r] |= bit; colM[c] |= bit; boxM[b] |= bit;
      if (dfs(k + 1)) return true;
      g[i] = 0; rowM[r] &= ~bit; colM[c] &= ~bit; boxM[b] &= ~bit;
    }
    [empties[k], empties[best]] = [empties[best], empties[k]];
    return false;
  }
  return dfs(0) ? g : null;
}
/* các ô cùng hàng / cột / khối với ô i (20 ô) */
export function peersOf(i) {
  const r = (i / 9) | 0, c = i % 9, b = boxOf(i);
  const out = new Set();
  for (let k = 0; k < 9; k++) { out.add(r * 9 + k); out.add(k * 9 + c); }
  const br = ((b / 3) | 0) * 3, bc = (b % 3) * 3;
  for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) out.add((br + dr) * 9 + bc + dc);
  out.delete(i);
  return [...out];
}
const pOf = (s, id) => s.players.find(p => p.id === id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };
const filledCount = (s, pr) => { let n = s.givensCount; for (const v of pr.grid) if (v) n++; return n; };
/* xóa 1 số khỏi ghi chú của các ô cùng hàng/cột/khối (điền đúng 1 số thì các
   ô liên quan không còn cần ghi chú số đó nữa) */
function clearPeerNotes(s, pr, cell, value) {
  for (const p of peersOf(cell)) {
    const ns = pr.notes[p];
    if (ns && ns.includes(value)) {
      pr.notes[p] = ns.filter(x => x !== value);
      if (!pr.notes[p].length) delete pr.notes[p];
    }
  }
}
function finishWin(s, pid) {
  s.phase = 'ended'; s.winner = pid;
  s.losers = s.players.filter(p => p.id !== pid).map(p => p.id);
  s.endReason = 'win'; s.endedAt = Date.now();
  const pr = s.prog[pid];
  if (pr) pr.finishedAt = s.endedAt;
  s.seq++;
  pushLog(s, `🎉 ${(pOf(s, pid) || {}).name || '?'} giải xong trước tiên — thắng cuộc đua!`, 'win');
}
function finishAllFail(s, reason) {
  s.phase = 'ended'; s.winner = null;
  s.losers = s.players.map(p => p.id);
  s.endReason = reason; s.endedAt = Date.now();
  s.seq++;
  pushLog(s, reason === 'resign' ? '🏳️ Mọi người đều đã xin thua — không ai thắng.' : '😢 Mọi người đều sai quá 3 lần — không ai thắng.', 'win');
}
function checkAllFailed(s) {
  if (s.phase !== 'playing') return;
  if (s.players.every(p => s.prog[p.id].failed)) finishAllFail(s, 'allfail');
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 1 || players.length > 4) throw new Error('Sudoku chơi 1–4 người.');
  const difficulty = OPT_CHOICES.difficulty.includes(opts.difficulty) ? opts.difficulty : 'medium';
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  const { solution, givens, givensCount } = generatePuzzle(difficulty, seed);
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    seed, /* hạt giống LCG — chọn ô gợi ý phải giống hệt ở mọi máy */
    phase: 'playing', /* 'playing' | 'ended' */
    difficulty, solution, givens, givensCount,
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null })),
    prog: {},
    winner: null, losers: [], endReason: null,
    startedAt: Date.now(), endedAt: null,
    lastPlace: null, lastWrong: null,
    log: [],
  };
  for (const p of s.players) s.prog[p.id] = { grid: new Array(81).fill(0), notes: {}, mistakes: 0, hintsLeft: HINTS_PER_GAME, hintsUsed: 0, finishedAt: null, failed: false, resigned: false };
  pushLog(s, `🔢 Câu đố Sudoku ${DIFFS[difficulty].name} bắt đầu — ${givensCount} số cho sẵn, sai ${MAX_MISTAKES} lần là thua!`);
  return s;
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < 1 || s.players.length > 4
    || !Array.isArray(s.givens) || s.givens.length !== 81 || !Array.isArray(s.solution) || s.solution.length !== 81
    || !DIFFS[s.difficulty] || typeof s.phase !== 'string' || !s.prog) {
    throw new Error('Trạng thái Sudoku không hợp lệ.');
  }
  return s;
}

/* điền 1 số: đúng thì ghi vào lưới, sai thì +1 lỗi (sai 3 lần thì bị loại) */
export function applyPlace(s, pid, cell, value) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.failed) return { ok: false, reason: 'Bạn đã bị loại (sai quá 3 lần).' };
  if (!Number.isInteger(cell) || cell < 0 || cell > 80) return { ok: false, reason: 'Ô không hợp lệ.' };
  if (!Number.isInteger(value) || value < 1 || value > 9) return { ok: false, reason: 'Số phải từ 1–9.' };
  if (s.givens[cell]) return { ok: false, reason: 'Ô này có số cho sẵn, không đổi được.' };
  if (pr.grid[cell]) return { ok: false, reason: 'Ô này đã điền rồi — xoá trước đã.' };
  if (value !== s.solution[cell]) {
    pr.mistakes++;
    s.lastWrong = { by: pid, cell, value, n: pr.mistakes };
    s.seq++;
    if (pr.mistakes >= MAX_MISTAKES) {
      pr.failed = true;
      pushLog(s, `❌ ${(pOf(s, pid) || {}).name || '?'} sai lần thứ ${MAX_MISTAKES} — bị loại khỏi cuộc đua!`);
      checkAllFailed(s);
    }
    return { ok: true, correct: false, mistakes: pr.mistakes, failed: pr.failed };
  }
  pr.grid[cell] = value;
  delete pr.notes[cell];
  clearPeerNotes(s, pr, cell, value);
  s.lastPlace = { by: pid, cell, value, n: filledCount(s, pr) };
  s.seq++;
  if (filledCount(s, pr) >= 81) { finishWin(s, pid); return { ok: true, correct: true, finished: true }; }
  return { ok: true, correct: true };
}

/* xoá số mình đã điền (ô cho sẵn không xoá được) */
export function applyErase(s, pid, cell) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.failed) return { ok: false, reason: 'Bạn đã bị loại.' };
  if (!Number.isInteger(cell) || cell < 0 || cell > 80) return { ok: false, reason: 'Ô không hợp lệ.' };
  if (s.givens[cell]) return { ok: false, reason: 'Ô này có số cho sẵn, không xoá được.' };
  if (!pr.grid[cell]) return { ok: false, reason: 'Ô này đang trống.' };
  pr.grid[cell] = 0;
  s.seq++;
  return { ok: true };
}

/* ghi chú (bút chì): bật/tắt 1 số ở ô trống chưa điền */
export function applyNote(s, pid, cell, value) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.failed) return { ok: false, reason: 'Bạn đã bị loại.' };
  if (!Number.isInteger(cell) || cell < 0 || cell > 80) return { ok: false, reason: 'Ô không hợp lệ.' };
  if (!Number.isInteger(value) || value < 1 || value > 9) return { ok: false, reason: 'Số phải từ 1–9.' };
  if (s.givens[cell] || pr.grid[cell]) return { ok: false, reason: 'Chỉ ghi chú ở ô trống.' };
  const ns = pr.notes[cell] || [];
  if (ns.includes(value)) {
    pr.notes[cell] = ns.filter(x => x !== value);
    if (!pr.notes[cell].length) delete pr.notes[cell];
  } else {
    pr.notes[cell] = [...ns, value].sort((a, b) => a - b);
  }
  s.seq++;
  return { ok: true, on: !ns.includes(value) };
}

/* gợi ý: mở 1 ô trống bất kỳ bằng đáp án đúng (tối đa 3 lần / ván) */
export function applyHint(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.failed) return { ok: false, reason: 'Bạn đã bị loại.' };
  if (pr.hintsLeft <= 0) return { ok: false, reason: 'Hết lượt gợi ý rồi.' };
  const empties = [];
  for (let i = 0; i < 81; i++) if (!s.givens[i] && !pr.grid[i]) empties.push(i);
  if (!empties.length) return { ok: false, reason: 'Lưới đã đầy.' };
  const cell = empties[Math.floor(nextRand(s) * empties.length)];
  const value = s.solution[cell];
  pr.grid[cell] = value;
  delete pr.notes[cell];
  clearPeerNotes(s, pr, cell, value);
  pr.hintsLeft--; pr.hintsUsed++;
  s.lastPlace = { by: pid, cell, value, n: filledCount(s, pr), hint: true };
  s.seq++;
  if (filledCount(s, pr) >= 81) { finishWin(s, pid); return { ok: true, cell, value, finished: true }; }
  return { ok: true, cell, value };
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

/* ai đang phải hành động (cho bot + người rớt mạng): mọi người chưa xong */
export const actors = s => {
  if (s.phase !== 'playing') return [];
  return s.players.filter(p => { const pr = s.prog[p.id]; return pr && !pr.failed && !pr.finishedAt; }).map(p => p.id);
};

/* góc nhìn riêng của 1 người chơi: số cho sẵn + lưới/ghi chú CỦA MÌNH + tiến
   độ của mọi người (chỉ số ô đã điền, không lộ lưới của người khác); KHÔNG
   bao giờ lộ đáp án (solution) cho client */
export function viewFor(s, pid) {
  const pr = s.prog[pid] || { grid: new Array(81).fill(0), notes: {}, mistakes: 0, hintsLeft: HINTS_PER_GAME, hintsUsed: 0, finishedAt: null, failed: false };
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, difficulty: s.difficulty,
    givens: s.givens.slice(), givensCount: s.givensCount,
    startedAt: s.startedAt, endedAt: s.endedAt,
    winner: s.winner, losers: (s.losers || []).slice(), endReason: s.endReason,
    players: s.players.map(p => {
      const q = s.prog[p.id] || {};
      return { id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null, filled: q.grid ? filledCount(s, q) : s.givensCount, mistakes: q.mistakes || 0, hintsLeft: q.hintsLeft != null ? q.hintsLeft : HINTS_PER_GAME, failed: !!q.failed, finished: !!q.finishedAt };
    }),
    you: { grid: pr.grid.slice(), notes: JSON.parse(JSON.stringify(pr.notes)), mistakes: pr.mistakes, hintsLeft: pr.hintsLeft, hintsUsed: pr.hintsUsed, failed: pr.failed, finished: !!pr.finishedAt },
    lastPlace: s.lastPlace ? { ...s.lastPlace } : null,
    lastWrong: s.lastWrong ? { ...s.lastWrong } : null,
    log: s.log.slice(-20),
    me: pid,
  };
}

/* Adapter cho phòng online (simplenet): action { type, cell?, value? } */
export function applyAction(s, pid, a, ctx) {
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'place': return applyPlace(s, pid, a.cell, a.value);
    case 'erase': return applyErase(s, pid, a.cell);
    case 'note': return applyNote(s, pid, a.cell, a.value);
    case 'hint': return applyHint(s, pid);
    case 'resign': return applyResign(s, pid);
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}
