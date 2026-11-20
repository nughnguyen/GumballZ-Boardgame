// 🀄 Mạt Chược (Mahjong Solitaire) – luật chơi (thuần logic, không chạm DOM).
// Bàn Rùa 144 quân: 34 loại thường × 4 quân (Vòng 1–9, Tre 1–9, Vạn 1–9,
// Gió Đông/Nam/Tây/Bắc, Rồng Đỏ/Xanh Lá/Trắng) + 4 Hoa + 4 Mùa (mỗi loại 1
// quân). Bấm 2 quân TRỐNG có cùng mặt để gỡ cặp: quân trống = không có quân
// nào đè lên trên VÀ trái hoặc phải còn hở (không bị quân cùng tầng chặn).
// Hoa ghép với Hoa bất kỳ, Mùa ghép với Mùa bất kỳ. Gỡ hết 144 quân là thắng;
// hết cặp gỡ được thì dùng Xào bài (tối đa 3 lần/ván) hoặc Gợi ý (tối đa 5).
// Chế độ: chơi đơn hoặc đua 2–4 người (cùng 1 bàn từ cùng 1 hạt giống nên
// mọi người gỡ cùng 1 thế bài — ai gỡ hết trước thì thắng; ai kẹt hết lượt
// xào thì bị loại, tất cả đều kẹt thì gỡ nhiều nhất thắng).
export const TOTAL_TILES = 144;
export const MAX_HINTS = 5;
export const MAX_SHUFFLES = 3;
export const MAX_UNDOS = 5;

/* bộ sinh số giả ngẫu nhiên có hạt giống (mulberry32) */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* LCG lưu trong state (giống 2048/Sudoku): xào bài phải giống hệt nhau ở
   mọi máy cùng áp 1 hành động — dùng Math.random() thì 2 máy lệch nhau */
function nextRand(s) {
  s.seed = (s.seed * 1103515245 + 12345) % 2147483648;
  return s.seed / 2147483648;
}

/* ---------- mặt quân ---------- */
export const CIRCLES = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9'];
export const BAMBOO = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9'];
export const CHARS = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9'];
export const WINDS = ['E', 'S', 'W', 'N'];
export const DRAGONS = ['DR', 'DG', 'DW'];
export const FLOWERS = ['F1', 'F2', 'F3', 'F4'];
export const SEASONS = ['S1', 'S2', 'S3', 'S4'];
export const REGULAR_FACES = [...CIRCLES, ...BAMBOO, ...CHARS, ...WINDS, ...DRAGONS]; // 34 loại × 4
/* khóa ghép cặp: Hoa nào cũng ghép với Hoa, Mùa nào cũng ghép với Mùa */
export function matchKey(face) {
  if (face[0] === 'F') return 'FLOWER';
  if (face[0] === 'S' && face.length === 2) return 'SEASON';
  return face;
}
export function faceName(face) {
  if (face[0] === 'c') return `Vòng ${face[1]}`;
  if (face[0] === 'b') return `Tre ${face[1]}`;
  if (face[0] === 'w') return `Vạn ${face[1]}`;
  if (face === 'E') return 'Gió Đông';
  if (face === 'S') return 'Gió Nam';
  if (face === 'W') return 'Gió Tây';
  if (face === 'N') return 'Gió Bắc';
  if (face === 'DR') return 'Rồng Đỏ';
  if (face === 'DG') return 'Rồng Xanh';
  if (face === 'DW') return 'Rồng Trắng';
  if (face === 'F1') return 'Hoa Mai';
  if (face === 'F2') return 'Hoa Lan';
  if (face === 'F3') return 'Hoa Cúc';
  if (face === 'F4') return 'Hoa Trúc';
  if (face === 'S1') return 'Mùa Xuân';
  if (face === 'S2') return 'Mùa Hạ';
  if (face === 'S3') return 'Mùa Thu';
  if (face === 'S4') return 'Mùa Đông';
  return face;
}

/* ---------- bố cục bàn Rùa (tọa độ nửa-quân: quân rộng 2, cao 2) ----------
   Tầng 0: 88 quân thân bàn + 2 quân nhô 2 đầu (90). Tầng 1: khối 6×6 lệch
   nửa quân (36). Tầng 2: 4×3 (12). Tầng 3: 2×2 (4). Tầng 4: 2 quân đỉnh.
   Tổng 90 + 36 + 12 + 4 + 2 = 144. */
function buildLayout() {
  const pos = [];
  const row = (y, xs, z = 0) => { for (const x of xs) pos.push({ x, y, z }); };
  const seq = (a, b, step = 2) => { const out = []; for (let v = a; v <= b; v += step) out.push(v); return out; };
  row(0, seq(0, 22)); row(2, seq(0, 22));
  row(4, seq(2, 20)); row(6, seq(2, 20)); row(8, seq(2, 20)); row(10, seq(2, 20));
  row(12, seq(0, 22)); row(14, seq(0, 22));
  pos.push({ x: -2, y: 7, z: 0 }); pos.push({ x: 24, y: 7, z: 0 });
  for (const y of [3, 5, 7, 9, 11, 13]) row(y, seq(5, 15), 1);
  for (const y of [5, 7, 9]) row(y, seq(8, 14), 2);
  for (const y of [6, 8]) row(y, seq(10, 12), 3);
  pos.push({ x: 10, y: 7, z: 4 }); pos.push({ x: 12, y: 7, z: 4 });
  return pos;
}
export const LAYOUT = buildLayout();

/* ---------- quân trống ---------- */
/* quân t có trống không, xét trên danh sách quân (mỗi quân có removed) */
export function isFree(tiles, t) {
  if (t.removed) return false;
  for (const o of tiles) {
    if (o.removed || o.z !== t.z + 1) continue;
    if (Math.abs(o.x - t.x) < 2 && Math.abs(o.y - t.y) < 2) return false; // bị đè
  }
  const leftBlocked = tiles.some(o => !o.removed && o.z === t.z && o.y === t.y && o.x === t.x - 2);
  const rightBlocked = tiles.some(o => !o.removed && o.z === t.z && o.y === t.y && o.x === t.x + 2);
  return !leftBlocked || !rightBlocked;
}
export function freeTiles(tiles) { return tiles.filter(t => isFree(tiles, t)); }
/* số quân sẽ "được giải phóng" nếu gỡ cặp (a, b): quân nào đang bị đè/chặn
   bởi a hoặc b mà sau khi gỡ thì trống */
export function unblockedBy(tiles, a, b) {
  const gone = new Set([a.id, b.id]);
  let n = 0;
  for (const t of tiles) {
    if (t.removed || gone.has(t.id) || isFree(tiles, t)) continue;
    const rest = tiles.map(o => (gone.has(o.id) ? { ...o, removed: true } : o));
    const after = rest.find(o => o.id === t.id);
    if (isFree(rest, after)) n++;
  }
  return n;
}
/* tất cả cặp gỡ được (mỗi cặp là [idA, idB]), id tăng dần */
export function allPairs(tiles) {
  const free = freeTiles(tiles);
  const out = [];
  for (let i = 0; i < free.length; i++) {
    for (let j = i + 1; j < free.length; j++) {
      if (matchKey(free[i].face) === matchKey(free[j].face)) out.push([free[i].id, free[j].id]);
    }
  }
  return out;
}
export function findPair(tiles) {
  const pairs = allPairs(tiles);
  return pairs.length ? pairs[0] : null;
}

/* ---------- chia bài: đặt cặp ngược để bảo đảm giải được ----------
   Mỗi hàng gom thành cặp gương (đầu–cuối): cặp ở giữa hàng đặt TRƯỚC,
   cặp ở 2 đầu hàng đặt SAU. Đặt từ tầng dưới lên trên. Khi đó gỡ theo
   thứ tự ngược lúc đặt (đầu hàng trước, giữa hàng sau, tầng trên trước)
   luôn hợp lệ: cặp đặt sau cùng thì cả 2 quân đều trống (không bị đè vì
   tầng trên chưa đặt, không bị chặn vì phía ngoài hàng còn hở), gỡ xong
   thì cặp trước đó lại trống, … nên mọi ván chia ra đều giải được.
   Đặt bừa vị trí thì quân tầng trên đè chết quân tầng dưới chưa đặt nên
   ván chia không bao giờ xong — vì vậy KHÔNG xáo vị trí, chỉ xáo mặt. */
function dealTiles(rng) {
  const pairs = [];
  for (const f of REGULAR_FACES) { pairs.push([f, f]); pairs.push([f, f]); } // 34 × 2 = 68
  pairs.push(['F1', 'F2'], ['F3', 'F4'], ['S1', 'S2'], ['S3', 'S4']); // 4 → 72 cặp
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  const rows = new Map();
  for (let i = 0; i < LAYOUT.length; i++) {
    const p = LAYOUT[i];
    const k = p.z + ':' + p.y;
    if (!rows.has(k)) rows.set(k, []);
    rows.get(k).push({ ...p, id: i });
  }
  const slotPairs = []; // [slotA, slotB] theo đúng thứ tự đặt
  const layerKeys = [...rows.keys()].sort((a, b) => +a.split(':')[0] - +b.split(':')[0]);
  for (const k of layerKeys) {
    const row = rows.get(k).sort((a, b) => a.x - b.x);
    if (row.length % 2 !== 0) return null;
    const half = row.length / 2;
    for (let kk = half - 1; kk >= 0; kk--) slotPairs.push([row[kk], row[row.length - 1 - kk]]);
  }
  if (slotPairs.length !== 72) return null;
  const placed = [];
  slotPairs.forEach(([a, b], pi) => {
    placed.push({ id: a.id, face: pairs[pi][0], x: a.x, y: a.y, z: a.z, removed: false, ord: pi });
    placed.push({ id: b.id, face: pairs[pi][1], x: b.x, y: b.y, z: b.z, removed: false, ord: pi });
  });
  return placed;
}

const pOf = (s, id) => s.players.find(p => p.id === id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };
const tilesLeft = pr => pr.tiles.filter(t => !t.removed).length;

function finishWin(s, pid) {
  s.phase = 'ended'; s.winner = pid;
  s.losers = s.players.filter(p => p.id !== pid).map(p => p.id);
  s.endReason = 'win'; s.endedAt = Date.now();
  const pr = s.prog[pid];
  if (pr) pr.finishedAt = s.endedAt;
  s.seq++;
  pushLog(s, `🎉 ${(pOf(s, pid) || {}).name || '?'} gỡ hết 144 quân — thắng cuộc đua!`, 'win');
}
/* tất cả đều kẹt: gỡ nhiều nhất thắng (hòa thì ít nước hơn thắng) */
function finishAllStuck(s) {
  s.phase = 'ended'; s.endReason = 'allstuck'; s.endedAt = Date.now();
  const ranked = s.players.slice().sort((a, b) => {
    const pa = s.prog[a.id], pb = s.prog[b.id];
    if (pb.removed !== pa.removed) return pb.removed - pa.removed;
    return pa.moves - pb.moves;
  });
  s.winner = ranked[0].id;
  s.losers = s.players.filter(p => p.id !== s.winner).map(p => p.id);
  const pr = s.prog[s.winner];
  if (pr) pr.finishedAt = s.endedAt;
  s.seq++;
  pushLog(s, `🏁 Mọi người đều kẹt — ${(pOf(s, s.winner) || {}).name || '?'} gỡ nhiều nhất (${s.prog[s.winner].removed}/144) nên thắng!`, 'win');
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
      pushLog(s, '😢 Hết cặp gỡ được mà cũng hết lượt xào bài — kẹt rồi!', 'win');
    } else finishAllStuck(s);
  }
}
/* sau mỗi nước: người chơi còn cặp không? hết cặp mà hết lượt xào thì bị loại */
function checkStuck(s, pid) {
  const pr = s.prog[pid];
  if (!pr || pr.failed || s.phase !== 'playing') return;
  if (tilesLeft(pr) === 0) return; // đã thắng rồi (finishWin xử lý)
  if (allPairs(pr.tiles).length === 0) {
    if (pr.shufflesLeft > 0) return; // còn xào được thì chưa thua
    pr.failed = true; pr.failedAt = Date.now();
    pushLog(s, `😢 ${(pOf(s, pid) || {}).name || '?'} kẹt rồi (hết cặp gỡ được, hết lượt xào)!`);
    checkAllFailed(s);
  }
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 1 || players.length > 4) throw new Error('Mạt Chược chơi 1–4 người.');
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  let tiles = null;
  for (let attempt = 0; attempt < 200 && !tiles; attempt++) {
    tiles = dealTiles(mulberry32((seed + attempt * 7919) >>> 0));
  }
  if (!tiles) throw new Error('Không chia được bàn Mạt Chược.');
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    seed, /* hạt giống LCG — xào bài phải giống hệt ở mọi máy */
    phase: 'playing', /* 'playing' | 'ended' */
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null })),
    prog: {},
    winner: null, losers: [], endReason: null,
    startedAt: Date.now(), endedAt: null,
    lastMove: null, lastPair: null,
    log: [],
  };
  for (const p of s.players) {
    s.prog[p.id] = {
      tiles: tiles.map(t => ({ ...t })), removed: 0, moves: 0,
      hintsLeft: MAX_HINTS, hintsUsed: 0, shufflesLeft: MAX_SHUFFLES, shufflesUsed: 0,
      undosLeft: MAX_UNDOS, history: [], hintPair: null,
      finishedAt: null, failed: false, resigned: false, failedAt: null,
    };
  }
  pushLog(s, '🀄 Ván Mạt Chược bắt đầu — gỡ 2 quân trống cùng mặt, gỡ hết 144 quân là thắng!');
  return s;
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < 1 || s.players.length > 4
    || typeof s.seed !== 'number' || typeof s.phase !== 'string' || !s.prog) {
    throw new Error('Trạng thái Mạt Chược không hợp lệ.');
  }
  for (const p of s.players) {
    const pr = s.prog[p.id];
    if (!pr || !Array.isArray(pr.tiles) || pr.tiles.length !== TOTAL_TILES || typeof pr.removed !== 'number') {
      throw new Error('Trạng thái Mạt Chược không hợp lệ.');
    }
  }
  return s;
}
const snap = pr => ({
  removed: pr.tiles.filter(t => t.removed).map(t => t.id),
  faces: pr.tiles.map(t => t.face),
  hintsLeft: pr.hintsLeft, shufflesLeft: pr.shufflesLeft, undosLeft: pr.undosLeft,
  moves: pr.moves, removedCount: pr.removed,
});
function restoreSnap(pr, sn) {
  const gone = new Set(sn.removed);
  for (const t of pr.tiles) t.removed = gone.has(t.id);
  pr.tiles.forEach((t, i) => { t.face = sn.faces[i]; });
  pr.hintsLeft = sn.hintsLeft; pr.shufflesLeft = sn.shufflesLeft;
  pr.undosLeft = sn.undosLeft; pr.moves = sn.moves; pr.removed = sn.removedCount;
  pr.hintPair = null;
}

/* gỡ 1 cặp quân (a, b là id quân) */
export function applyRemove(s, pid, a, b) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.failed) return { ok: false, reason: 'Bạn đã bị loại (kẹt rồi).' };
  if (a == null || b == null || a === b) return { ok: false, reason: 'Chọn 2 quân khác nhau.' };
  const ta = pr.tiles.find(t => t.id === a);
  const tb = pr.tiles.find(t => t.id === b);
  if (!ta || !tb || ta.removed || tb.removed) return { ok: false, reason: 'Quân đã bị gỡ rồi.' };
  if (!isFree(pr.tiles, ta) || !isFree(pr.tiles, tb)) return { ok: false, reason: 'Quân chưa trống (đang bị đè hoặc bị chặn cả 2 bên).' };
  if (matchKey(ta.face) !== matchKey(tb.face)) return { ok: false, reason: '2 quân khác mặt, không gỡ được.' };
  pr.history.push(snap(pr));
  if (pr.history.length > MAX_UNDOS) pr.history.shift();
  ta.removed = true; tb.removed = true;
  pr.removed += 2; pr.moves++;
  pr.hintPair = null;
  s.lastMove = { by: pid, a, b, face: ta.face, n: pr.moves };
  s.lastPair = { by: pid, a, b };
  s.seq++;
  if (pr.removed >= TOTAL_TILES) { finishWin(s, pid); return { ok: true, won: true }; }
  checkStuck(s, pid);
  return { ok: true };
}

/* gợi ý: chỉ ra 1 cặp gỡ được (không đổi bàn, chỉ trừ lượt) */
export function applyHint(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.failed) return { ok: false, reason: 'Bạn đã bị loại rồi.' };
  if (pr.hintsLeft <= 0) return { ok: false, reason: 'Hết lượt gợi ý rồi.' };
  const pairs = allPairs(pr.tiles);
  if (!pairs.length) return { ok: false, reason: 'Không còn cặp nào để gợi ý.' };
  /* gợi ý cặp mở khóa nhiều quân nhất (hòa thì lấy cặp id nhỏ nhất) */
  let best = pairs[0], bestScore = -1;
  for (const [a, b] of pairs) {
    const sc = unblockedBy(pr.tiles, pr.tiles.find(t => t.id === a), pr.tiles.find(t => t.id === b));
    if (sc > bestScore) { bestScore = sc; best = [a, b]; }
  }
  pr.hintsLeft--; pr.hintsUsed++;
  pr.hintPair = best;
  s.seq++;
  return { ok: true, pair: best };
}

/* xào bài: xáo mặt của các quân còn lại (giữ nguyên bộ mặt), thử tới khi
   có ít nhất 1 cặp gỡ được; hết lượt thì không xào được */
export function applyShuffle(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.failed) return { ok: false, reason: 'Bạn đã bị loại rồi.' };
  if (pr.shufflesLeft <= 0) return { ok: false, reason: 'Hết lượt xào bài rồi.' };
  if (allPairs(pr.tiles).length > 0) return { ok: false, reason: 'Vẫn còn cặp gỡ được, chưa cần xào.' };
  pr.history.push(snap(pr));
  if (pr.history.length > MAX_UNDOS) pr.history.shift();
  const alive = pr.tiles.filter(t => !t.removed);
  const faces = alive.map(t => t.face);
  let ok = false;
  for (let attempt = 0; attempt < 50 && !ok; attempt++) {
    for (let i = faces.length - 1; i > 0; i--) {
      const j = Math.floor(nextRand(s) * (i + 1));
      [faces[i], faces[j]] = [faces[j], faces[i]];
    }
    alive.forEach((t, i) => { t.face = faces[i]; });
    if (allPairs(pr.tiles).length > 0) ok = true;
  }
  if (!ok) {
    /* xào 50 lần vẫn không ra cặp: trả lại mặt cũ, tính là kẹt */
    pr.history.pop();
    pr.failed = true; pr.failedAt = Date.now();
    pushLog(s, `😢 ${(pOf(s, pid) || {}).name || '?'} kẹt rồi (xào mãi không ra cặp)!`);
    checkAllFailed(s);
    return { ok: false, reason: 'Xào mãi không ra cặp nào — kẹt rồi.' };
  }
  pr.shufflesLeft--; pr.shufflesUsed++;
  pr.hintPair = null;
  s.seq++;
  pushLog(s, `🔀 ${(pOf(s, pid) || {}).name || '?'} xào lại bài (${pr.shufflesLeft} lượt còn lại).`);
  return { ok: true };
}

/* hoàn tác 1 nước (chỉ chơi đơn, tối đa 5 lần / ván) */
export function applyUndo(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.failed) return { ok: false, reason: 'Bạn đã bị loại rồi.' };
  if (s.players.length > 1) return { ok: false, reason: 'Đang đua thì không hoàn tác được.' };
  if (pr.undosLeft <= 0) return { ok: false, reason: 'Hết lượt hoàn tác rồi.' };
  const sn = pr.history.pop();
  if (!sn) return { ok: false, reason: 'Chưa có nước nào để hoàn tác.' };
  restoreSnap(pr, sn);
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

/* góc nhìn riêng của 1 người chơi: toàn bộ bàn CỦA MÌNH + tiến độ của mọi
   người (số quân đã gỡ, trạng thái); KHÔNG lộ bàn của người khác */
export function viewFor(s, pid) {
  const pr = s.prog[pid] || {
    tiles: LAYOUT.map((p, i) => ({ ...p, id: i, face: 'c1', removed: false })),
    removed: 0, moves: 0, hintsLeft: MAX_HINTS, hintsUsed: 0,
    shufflesLeft: MAX_SHUFFLES, shufflesUsed: 0, undosLeft: MAX_UNDOS,
    history: [], hintPair: null, finishedAt: null, failed: false,
  };
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    startedAt: s.startedAt, endedAt: s.endedAt,
    winner: s.winner, losers: (s.losers || []).slice(), endReason: s.endReason,
    players: s.players.map(p => {
      const q = s.prog[p.id] || {};
      return { id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null, removed: q.removed || 0, moves: q.moves || 0, failed: !!q.failed, finished: !!q.finishedAt };
    }),
    you: {
      tiles: pr.tiles.map(t => ({ id: t.id, face: t.face, x: t.x, y: t.y, z: t.z, removed: !!t.removed })),
      removed: pr.removed, moves: pr.moves,
      hintsLeft: pr.hintsLeft, hintsUsed: pr.hintsUsed,
      shufflesLeft: pr.shufflesLeft, shufflesUsed: pr.shufflesUsed,
      undosLeft: pr.undosLeft, hintPair: pr.hintPair ? [...pr.hintPair] : null,
      failed: pr.failed, finished: !!pr.finishedAt,
    },
    lastMove: s.lastMove ? { ...s.lastMove } : null,
    lastPair: s.lastPair ? { ...s.lastPair } : null,
    log: s.log.slice(-20),
    me: pid,
  };
}

/* Adapter cho phòng online (simplenet): action { type, a?, b? } */
export function applyAction(s, pid, a, ctx) {
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'remove': return applyRemove(s, pid, a.a, a.b);
    case 'hint': return applyHint(s, pid);
    case 'shuffle': return applyShuffle(s, pid);
    case 'undo': return applyUndo(s, pid);
    case 'resign': return applyResign(s, pid);
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}
