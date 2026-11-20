// 🔴 Cờ Nhảy (Chinese Checkers) — engine thuần logic (seeded, KHÔNG dùng Math.random).
//
// LUẬT CHUẨN ÁP DỤNG (Chinese Checkers cổ điển):
// - Bàn hình sao 6 cánh, 121 lỗ: lục giác giữa (bán kính 4, 61 lỗ) +
//   6 tam giác nhà, mỗi tam giác 10 lỗ (hàng 1-2-3-4, đỉnh là 1 lỗ xa
//   nhất). Mỗi người chơi có 10 bi trong 1 tam giác nhà.
// - Số người: 2, 3, 4 hoặc 6 (2 người: 2 tam giác đối nhau; 3 người:
//   cách 1 tam giác; 4 người: 2 cặp đối nhau; 6 người: đủ 6 tam giác).
//   Đích của mỗi người là tam giác ĐỐI DIỆN với nhà của mình.
// - Mỗi lượt di chuyển ĐÚNG 1 bi: đi 1 bước sang lỗ kề trống, HOẶC
//   nhảy qua 1 bi kề (bất kỳ màu nào) sang lỗ trống ngay phía sau.
//   Được nhảy NHIỀU lần liên tiếp trong cùng 1 lượt (nhảy dây chuyền);
//   một lượt là 1 bước HOẶC 1 chuỗi nhảy. Trong 1 chuỗi nhảy, bi không
//   được đáp xuống lỗ đã đi qua trong chuỗi đó (quy tắc triển khai để
//   việc liệt kê nước đi là hữu hạn; khi chơi thật không ai nhảy vòng
//   lại vô ích).
// - Thắng: đầu tiên đưa cả 10 bi vào tam giác đích. Không có ăn quân.
//   Bi được phép đi qua/đỗ ở tam giác nhà của người khác; bi đã vào
//   đích vẫn được phép đi ra lại (luật chuẩn).
// - Xin thua kết thúc TRẬN ngay; người thắng là người còn lại có nhiều
//   bi trong đích nhất (hòa thì tổng khoảng cách tới đỉnh đích nhỏ hơn
//   thắng).
// - BẾ TẮC (luật nhà, van an toàn): nếu 1 người không còn nước đi hợp
//   lệ nào thì được "bỏ lượt"; nếu mọi người liên tiếp chỉ bỏ lượt thì
//   ván kết thúc, người nhiều bi trong đích nhất thắng. Trên thực tế
//   gần như không bao giờ xảy ra (bàn luôn có nước đi), nhưng cần có để
//   ván không bao giờ kẹt vĩnh viễn.
//
// MÔ HÌNH:
// - Tọa độ axial (q, r) trên lưới lục giác; 6 hướng kề:
//   E(1,0) NE(1,-1) NW(0,-1) W(-1,0) SW(-1,1) SE(0,1).
// - Mỗi lỗ có id số 0..120; HOLES[id] = {id, q, r}.
// - Tam giác t (0..5) có 10 lỗ: hàng i (1..4) có i lỗ tại
//   (9-i)*d + j*s, j=0..i-1, với d là hướng tam giác và s là hướng
//   d xoay 120°.
// - Người chơi: marbles (10 lỗ đang đứng), tri (tam giác nhà), destTri
//   (tam giác đích = (tri+3)%6), jumpChainMax (chuỗi nhảy dài nhất
//   trong 1 lượt — cho thành tích), turns (số lượt đã đi).
// - score của 1 người = số bi đang ở trong tam giác đích (0..10);
//   thắng khi score = 10.
// - step: chỉ có 'act' (không có bước phụ như Splendor).
// - viewFor công khai toàn bộ bàn (không có thông tin ẩn) — chỉ giấu
//   _seed; không có trường `you`.

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const ALLOWED_COUNTS = [2, 3, 4, 6];
export const MARBLES_PER_PLAYER = 10;

/* ---------- hình học bàn ---------- */
export const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

const keyOf = (q, r) => q + ',' + r;
const _map = new Map();
export const HOLES = [];
function addHole(q, r) {
  const k = keyOf(q, r);
  if (_map.has(k)) return _map.get(k);
  const id = HOLES.length;
  HOLES.push({ id, q, r });
  _map.set(k, id);
  return id;
}
/* lục giác giữa: bán kính 4 (61 lỗ) */
for (let q = -8; q <= 8; q++) {
  for (let r = -8; r <= 8; r++) {
    if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= 4) addHole(q, r);
  }
}
/* 6 tam giác nhà: TRIANGLES[t] = 10 id, phần tử đầu là đỉnh (xa nhất),
   tiếp theo là các hàng 2-3-4 lỗ (hàng cuối = đáy, 4 lỗ chạm lục giác).
   Tam giác gốc (t=0) có đỉnh (8,-3), cạnh theo W(-1,0) và SW(-1,1)
   — tam giác đều cạnh 4 gắn vào cạnh q=4 của lục giác giữa; 5 tam giác
   còn lại là tam giác gốc xoay 60°/lần: (q,r) -> (-r, q+r). */
const R60 = (q, r) => [-r, q + r];
const tri0 = [];
for (let s = 0; s <= 3; s++) {
  for (let b = 0; b <= s; b++) tri0.push(addHole(8 - s, -3 + b));
}
export const TRIANGLES = [tri0];
for (let t = 1; t < 6; t++) {
  TRIANGLES.push(TRIANGLES[t - 1].map(id => {
    const h = HOLES[id];
    const [q, r] = R60(h.q, h.r);
    return addHole(q, r);
  }));
}
export const DEST_TRIANGLE = [3, 4, 5, 0, 1, 2];
/* màu bi theo ghế ngồi (6 ghế) */
export const PLAYER_COLORS = ['#E05D5D', '#5B8DEF', '#58B368', '#E8B93C', '#9B7ED9', '#E8823C'];
export const PLAYER_EMOJI = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'];
export const PLAYER_COLOR_NAME = ['đỏ', 'xanh dương', 'xanh lá', 'vàng', 'tím', 'cam'];

export function holeByQR(q, r) {
  const id = _map.get(keyOf(q, r));
  return id === undefined ? null : id;
}
export function neighbors(id) {
  const h = HOLES[id];
  if (!h) return [];
  const out = [];
  for (const [dq, dr] of DIRS) {
    const n = holeByQR(h.q + dq, h.r + dr);
    if (n !== null) out.push(n);
  }
  return out;
}
/* khoảng cách lục giác giữa 2 lỗ */
export function hexDist(a, b) {
  const ha = HOLES[a], hb = HOLES[b];
  if (!ha || !hb) return 99;
  const dq = ha.q - hb.q, dr = ha.r - hb.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}
/* đỉnh (lỗ xa nhất) của 1 tam giác */
export function triangleTip(tri) { return TRIANGLES[tri][0]; }
/* khoảng cách BFS (số lỗ phải đi) từ mỗi lỗ tới tam giác t gần nhất —
   đo tiến độ theo HÌNH DẠNG bàn (tốt hơn khoảng cách thẳng tới đỉnh,
   vì bi phải đi vòng qua các tam giác khác; bi trong tam giác đích = 0).
   Tính 1 lần lúc nạp module (6 lần BFS trên 121 lỗ). */
export const DIST_TO_TRI = [];
for (let t = 0; t < 6; t++) {
  const dist = new Array(HOLES.length).fill(Infinity);
  const queue = [];
  for (const h of TRIANGLES[t]) { dist[h] = 0; queue.push(h); }
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    for (const n of neighbors(cur)) {
      if (dist[n] === Infinity) { dist[n] = dist[cur] + 1; queue.push(n); }
    }
  }
  DIST_TO_TRI.push(dist);
}
export function bfsDistToDest(holeId, destTri) { return DIST_TO_TRI[destTri][holeId]; }

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- trạng thái ván ---------- */
function log(s, text, cls) {
  s.log.push({ text, kind: cls || '' });
  if (s.log.length > 120) s.log.splice(0, s.log.length - 120);
}
const player = (s, pid) => s.players.find(p => p.id === pid);

/* tam giác nhà theo số người chơi */
function seatsForCount(n) {
  if (n === 2) return [0, 3];
  if (n === 3) return [0, 2, 4];
  if (n === 4) return [0, 1, 3, 4];
  return [0, 1, 2, 3, 4, 5];
}

export function createGame(players, opts = {}) {
  if (!players || !ALLOWED_COUNTS.includes(players.length)) {
    throw new Error('Cờ Nhảy cần 2, 3, 4 hoặc 6 người chơi');
  }
  const seed = opts.seed == null ? (Date.now() % 2147483647) : opts.seed;
  const rnd = mulberry32(seed);
  const n = players.length;
  const plist = players.map((p, i) => (typeof p === 'string' ? { id: 'p' + i, name: p } : p));
  const seats = seatsForCount(n);
  const occ = new Array(HOLES.length).fill(null);
  const statePlayers = plist.map((p, i) => {
    const tri = seats[i];
    const marbles = TRIANGLES[tri].slice();
    for (const h of marbles) occ[h] = p.id;
    return {
      id: p.id, name: p.name || ('Người ' + (i + 1)),
      isBot: !!p.isBot, local: !!p.local, level: p.level || null,
      color: PLAYER_COLORS[i], emoji: PLAYER_EMOJI[i],
      tri, destTri: DEST_TRIANGLE[tri],
      marbles, jumpChainMax: 0, turns: 0,
      score: 0,
    };
  });
  const s = {
    gid: 'cn-' + seed + '-' + Math.floor(rnd() * 1e9).toString(36),
    seq: 0, phase: 'playing', turnIdx: 0, turnCount: 0, round: 1,
    step: 'act', occ,
    players: statePlayers,
    passStreak: 0,
    winner: null, winners: [], losers: [], endReason: null, endCause: null,
    final: null,
    log: [], startedAt: Date.now(), endedAt: 0, _seed: seed,
  };
  s.turn = s.players[0].id;
  log(s, `🔴 Ván bắt đầu — ${n} người, mỗi người 10 bi; đưa cả 10 bi vào tam giác đối diện là thắng.`, 'info');
  return s;
}

/* ---------- tính toán ---------- */
/* số bi của 1 người đang ở trong tam giác đích */
export function inHome(pl, destTri) {
  const set = TRIANGLES[destTri];
  let n = 0;
  for (const h of pl.marbles) if (set.includes(h)) n++;
  return n;
}
/* tổng khoảng cách BFS của mọi bi tới tam giác đích — càng nhỏ càng gần thắng */
export function totalDist(pl, destTri) {
  let d = 0;
  for (const h of pl.marbles) d += bfsDistToDest(h, destTri);
  return d;
}
export function scoreOf(pl) { return inHome(pl, pl.destTri); }
function refreshScore(s, pl) { pl.score = scoreOf(pl); }

/* ---------- liệt kê nước đi ---------- */
/* mọi chuỗi nhảy từ 1 lỗ, trên bàn occ (occ[hole] = pid|null).
   visited: tập lỗ đã đáp trong chuỗi (kể cả lỗ xuất phát) — không đáp lại. */
function jumpChainsFrom(occ, from, visited) {
  const out = [];
  const h = HOLES[from];
  for (const [dq, dr] of DIRS) {
    const mid = holeByQR(h.q + dq, h.r + dr);
    /* lỗ giữa phải có bi THẬT đang đứng đó: lỗ bi vừa rời khỏi trong
       chuỗi (nằm trong visited) giờ đã trống nên không nhảy qua được */
    if (mid === null || !occ[mid] || visited.has(mid)) continue;
    const land = holeByQR(h.q + 2 * dq, h.r + 2 * dr);
    if (land === null || occ[land] || visited.has(land)) continue;
    const path = [land];
    out.push(path);
    /* nhảy tiếp từ lỗ đáp (đánh dấu lỗ đáp vào visited) */
    const v2 = new Set(visited); v2.add(land);
    for (const rest of jumpChainsFrom(occ, land, v2)) out.push([land, ...rest]);
  }
  return out;
}
/* mọi nước đi hợp lệ của pid từ 1 view/state có {occ, players, turn, phase} */
export function legalMovesFromView(v, pid) {
  if (!v || v.phase !== 'playing' || v.turn !== pid) return [];
  const me = v.players.find(p => p.id === pid);
  if (!me) return [];
  const occ = v.occ;
  const out = [];
  const myMarbles = me.marbles.slice().sort((a, b) => a - b);
  for (const from of myMarbles) {
    /* đi 1 bước sang lỗ kề trống */
    for (const n of neighbors(from)) {
      if (!occ[n]) out.push({ type: 'move', from, path: [n], jumps: 0 });
    }
    /* nhảy dây chuyền (mỗi chuỗi là 1 nước đi) */
    const visited = new Set([from]);
    for (const path of jumpChainsFrom(occ, from, visited)) {
      out.push({ type: 'move', from, path, jumps: path.length });
    }
  }
  if (!out.length) out.push({ type: 'pass' });
  return out;
}
export function legalMoves(s, pid) {
  if (!s || s.phase !== 'playing') return [];
  if (actors(s)[0] !== pid) return [];
  return legalMovesFromView(viewFor(s, pid), pid);
}

/* các lỗ có thể đáp 1 bước từ `from` (chưa nhảy trong lượt này) */
export function stepDests(v, pid, from) {
  if (!v || v.phase !== 'playing' || v.turn !== pid) return [];
  const me = v.players.find(p => p.id === pid);
  if (!me || !me.marbles.includes(from)) return [];
  return neighbors(from).filter(n => !v.occ[n]);
}
/* các lỗ có thể nhảy tới từ `from` trong 1 chuỗi đang đi dở.
   visited: các lỗ đã đáp trong chuỗi (kể cả lỗ xuất phát). */
export function jumpDests(v, pid, from, visitedArr) {
  if (!v || v.phase !== 'playing' || v.turn !== pid) return [];
  const me = v.players.find(p => p.id === pid);
  if (!me || !me.marbles.includes(from)) return [];
  const visited = new Set(visitedArr || [from]);
  const h = HOLES[from];
  const out = [];
  for (const [dq, dr] of DIRS) {
    const mid = holeByQR(h.q + dq, h.r + dr);
    if (mid === null || !v.occ[mid]) continue;
    const land = holeByQR(h.q + 2 * dq, h.r + 2 * dr);
    if (land === null || v.occ[land] || visited.has(land)) continue;
    out.push(land);
  }
  return out;
}

/* ---------- kiểm tra 1 nước đi ---------- */
function validateMove(s, pid, act) {
  const p = player(s, pid);
  if (!p) return { ok: false, reason: 'no-player' };
  if (!act || act.type !== 'move') return { ok: false, reason: 'bad-action' };
  if (!Number.isInteger(act.from) || !p.marbles.includes(act.from)) return { ok: false, reason: 'not-your-marble' };
  if (!Array.isArray(act.path) || !act.path.length) return { ok: false, reason: 'bad-path' };
  const visited = new Set([act.from]);
  let cur = act.from;
  for (let i = 0; i < act.path.length; i++) {
    const dest = act.path[i];
    if (!Number.isInteger(dest) || !HOLES[dest]) return { ok: false, reason: 'bad-hole' };
    if (visited.has(dest)) return { ok: false, reason: 'revisit' };
    /* lỗ đích phải trống (trừ lỗ bi vừa rời khỏi trong chuỗi) */
    if (s.occ[dest] && s.occ[dest] !== pid) return { ok: false, reason: 'occupied' };
    if (s.occ[dest] === pid && !visited.has(dest)) return { ok: false, reason: 'occupied' };
    const d = hexDist(cur, dest);
    if (i === 0 && act.path.length === 1 && d === 1) {
      /* đi 1 bước */
    } else if (d === 2) {
      /* nhảy: phải có bi ở giữa, thẳng hàng — lỗ giữa mà bi vừa rời
         khỏi trong chuỗi (nằm trong visited) giờ đã trống */
      const mid = holeByQR((HOLES[cur].q + HOLES[dest].q) / 2, (HOLES[cur].r + HOLES[dest].r) / 2);
      if (mid === null || !s.occ[mid] || visited.has(mid)) return { ok: false, reason: 'no-marble-to-jump' };
    } else {
      return { ok: false, reason: 'illegal' };
    }
    visited.add(dest);
    cur = dest;
  }
  return { ok: true };
}

/* ---------- áp dụng 1 nước đi ---------- */
function endTurn(s) {
  s.step = 'act';
  s.turnIdx = (s.turnIdx + 1) % s.players.length;
  s.turn = s.players[s.turnIdx].id;
  s.turnCount++;
  if (s.turnIdx === 0) s.round++;
  /* bế tắc: mọi người liên tiếp chỉ bỏ lượt thì hết ván */
  if (s.passStreak >= s.players.length) {
    endGame(s, 'stalemate');
    return;
  }
}

export function applyAction(s, pid, act) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'ended' };
  if (!act || typeof act.type !== 'string') return { ok: false, reason: 'bad-action' };
  const p = player(s, pid);
  if (!p) return { ok: false, reason: 'no-player' };

  /* xin thua: kết thúc TRẬN ngay (bất kể đang ở bước nào) */
  if (act.type === 'resign') {
    endGame(s, 'resign', pid);
    log(s, '🏳️ ' + p.name + ' xin thua — ván dừng lại ngay.', 'resign');
    s.seq++;
    return { ok: true };
  }

  if (actors(s)[0] !== pid) return { ok: false, reason: 'not-your-turn' };

  if (act.type === 'pass') {
    /* chỉ hợp lệ khi không còn nước nào khác (van an toàn) */
    const others = legalMovesFromView(viewFor(s, pid), pid).filter(m => m.type !== 'pass');
    if (others.length) return { ok: false, reason: 'illegal' };
    s.passStreak = (s.passStreak || 0) + 1;
    log(s, `⏭️ ${p.name} không còn nước đi — bỏ lượt.`, 'info');
    s.seq++;
    endTurn(s);
    return { ok: true };
  }

  if (act.type === 'move') {
    const v = validateMove(s, pid, act);
    if (!v.ok) return v;
    /* số lần nhảy trong nước này (bước đi = 0) */
    let jumps = 0;
    let cur = act.from;
    for (const dest of act.path) {
      if (hexDist(cur, dest) === 2) jumps++;
      cur = dest;
    }
    const dest = act.path[act.path.length - 1];
    /* dời bi */
    s.occ[act.from] = null;
    s.occ[dest] = pid;
    const idx = p.marbles.indexOf(act.from);
    p.marbles[idx] = dest;
    p.turns++;
    if (jumps > p.jumpChainMax) p.jumpChainMax = jumps;
    refreshScore(s, p);
    s.passStreak = 0;
    s.seq++;
    if (jumps > 0) {
      log(s, `🔴 ${p.name} nhảy ${jumps === 1 ? '1 lần' : jumps + ' lần liên tiếp'} (${p.score}/10 bi về đích).`, jumps >= 4 ? 'win' : '');
    } else {
      log(s, `🔴 ${p.name} đi 1 bước (${p.score}/10 bi về đích).`, '');
    }
    /* thắng khi cả 10 bi vào đích */
    if (p.score >= MARBLES_PER_PLAYER) {
      endGame(s, 'match');
      return { ok: true };
    }
    endTurn(s);
    return { ok: true };
  }

  return { ok: false, reason: 'illegal' };
}

/* ---------- kết thúc ván ---------- */
function endGame(s, cause, resignerId = null) {
  s.phase = 'ended';
  s.endReason = cause === 'resign' ? 'resign' : 'match';
  s.endCause = cause;
  const summary = {};
  for (const p of s.players) {
    refreshScore(s, p);
    summary[p.id] = {
      score: p.score,
      inHome: p.score,
      progress: p.score,
      jumpChainMax: p.jumpChainMax,
      turns: p.turns,
      dist: totalDist(p, p.destTri),
    };
  }
  /* chọn người thắng */
  let best = null;
  if (cause === 'match') {
    const w = s.players.find(p => p.score >= MARBLES_PER_PLAYER);
    best = { ids: w ? [w.id] : [] };
  } else {
    /* xin thua / bế tắc: người còn lại có nhiều bi trong đích nhất;
       hòa thì tổng khoảng cách tới đỉnh đích nhỏ hơn thắng; vẫn hòa thì cùng thắng */
    for (const p of s.players) {
      if (resignerId && p.id === resignerId) continue;
      const key = [p.score, -totalDist(p, p.destTri)];
      if (!best || key[0] > best.key[0] || (key[0] === best.key[0] && key[1] > best.key[1])) {
        best = { key, ids: [p.id] };
      } else if (key[0] === best.key[0] && key[1] === best.key[1]) {
        best.ids.push(p.id);
      }
    }
    if (!best) best = { ids: [] };
  }
  s.winners = best.ids;
  s.winner = s.winners[0] || null;
  s.losers = s.players.filter(p => !s.winners.includes(p.id)).map(p => p.id);
  s.final = {
    summary,
    scores: s.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
  };
  s.endedAt = Date.now();
  if (cause === 'stalemate') {
    log(s, '🤝 Không ai còn nước đi (bế tắc) — ván kết thúc, người nhiều bi trong đích nhất thắng.', 'info');
  }
  if (s.winners.length) {
    const names = s.winners.map(id => player(s, id).name).join(' + ');
    const bestScore = player(s, s.winners[0]).score;
    log(s, `🏆 ${names} thắng với ${bestScore}/10 bi về đích!`, 'win');
  } else {
    log(s, '🤝 Ván kết thúc mà không có người thắng.', 'info');
  }
}

/* ---------- người được hành động ---------- */
export function actors(s) {
  if (!s || s.phase !== 'playing') return [];
  const p = s.players[s.turnIdx];
  return p ? [p.id] : [];
}

/* ---------- góc nhìn của 1 người chơi ---------- */
/* Mọi thông tin đều công khai (bàn, bi, điểm) — không có gì ẩn, chỉ
   giấu _seed. Không có trường `you`. */
export function viewFor(s, pid) {
  const turnPid = s.players[s.turnIdx] ? s.players[s.turnIdx].id : null;
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, round: s.round,
    turn: turnPid, turnCount: s.turnCount,
    step: s.step,
    occ: s.occ.slice(),
    players: s.players.map(pl => ({
      id: pl.id, name: pl.name, isBot: pl.isBot, local: pl.local, level: pl.level,
      color: pl.color, emoji: pl.emoji,
      tri: pl.tri, destTri: pl.destTri,
      marbles: pl.marbles.slice(),
      jumpChainMax: pl.jumpChainMax, turns: pl.turns, score: pl.score,
    })),
    winner: s.winner, winners: s.winners.slice(), losers: s.losers.slice(),
    endReason: s.endReason, endCause: s.endCause,
    final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    log: s.log.slice(-40), startedAt: s.startedAt, endedAt: s.endedAt, me: pid,
  };
}

export function serialize(s) { return JSON.stringify(s); }
export function deserialize(json) {
  const s = JSON.parse(json);
  if (!s || !Array.isArray(s.players) || !Array.isArray(s.occ) || s.occ.length !== HOLES.length) throw new Error('bad save');
  return s;
}
export default { createGame, applyAction, viewFor, actors, legalMoves };
