// 😈 Saboteur – luật chơi (thuần logic, không chạm DOM).
// 3–10 người, vai trò bí mật: thợ đào vàng vs kẻ phá hoại. 3 vòng; mỗi
// vòng chia lại vai trò, bộ bài 44 lá đường + 27 lá hành động, 28 lá vàng
// (1/2/3 cốm). Đặt lá đường nối từ lá Bắt đầu tới 1 trong 3 lá đích
// (1 vàng, 2 than) ở cột x = -7. Đào tới vàng thì thợ đào chia vàng;
// hết bài mà chưa tới vàng thì kẻ phá hoại chia vàng. Hết 3 vòng, nhiều
// vàng nhất thắng (hòa: nhiều lá vàng hơn, rồi ghế sớm hơn). Mọi quyết
// định ngẫu nhiên đều dùng LCG lưu trong state để mọi máy cùng áp 1
// hành động thì giống hệt nhau.

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;
export const ROUNDS = 3;
export const GOAL_X = -7;
export const MIN_X = -9, MAX_X = 2, MIN_Y = -4, MAX_Y = 4;
export const TOOLS = ['pickaxe', 'lamp', 'cart'];
export const TOOL_NAME = { pickaxe: 'Cuốc', lamp: 'Đèn', cart: 'Xe đẩy' };

/* số kẻ phá hoại theo số người: 3–4 → 1, 5–9 → 2, 10 → 3 */
export function saboteurCount(n) {
  if (n <= 4) return 1;
  if (n <= 9) return 2;
  return 3;
}
/* số lá trên tay theo số người: 3–5 → 6, 6–7 → 5, 8–10 → 4 */
export function handSize(n) {
  if (n <= 5) return 6;
  if (n <= 7) return 5;
  return 4;
}

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* LCG lưu trong state: mọi lần xào bài đều qua đây */
function nextRand(s) {
  s.seed = (s.seed * 1103515245 + 12345) % 2147483648;
  return s.seed / 2147483648;
}
function shuffleWith(s, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pOf = (s, id) => s.players.find(p => p.id === id);
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < MIN_PLAYERS || s.players.length > MAX_PLAYERS
    || typeof s.board !== 'object' || !Array.isArray(s.goals) || s.goals.length !== 3
    || typeof s.phase !== 'string' || typeof s.round !== 'number' || typeof s.turnIdx !== 'number') {
    throw new Error('Trạng thái Saboteur không hợp lệ.');
  }
  return s;
}
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

/* ---------- bộ bài ---------- */
/* 44 lá đường: [cửa ra, số lượng]. Lá "chết" = chỉ 1 cửa ra (đường cụt). */
const PATH_SPECS = [
  ['NS', 5], ['EW', 4],
  ['NE', 4], ['NW', 4], ['SE', 4], ['SW', 4],
  ['NEW', 3], ['NES', 3], ['NWS', 3], ['EWS', 3],
  ['NESW', 1],
  ['N', 2], ['E', 1], ['S', 2], ['W', 1],
];
/* 27 lá hành động: [loại, số lượng] */
const ACTION_SPECS = [
  ['map', 3], ['rockfall', 3],
  ['break-pickaxe', 3], ['break-lamp', 3], ['break-cart', 3],
  ['repair-pickaxe', 2], ['repair-lamp', 2], ['repair-cart', 2],
  ['repair-pickaxe-lamp', 2], ['repair-lamp-cart', 2], ['repair-pickaxe-cart', 2],
];
/* 28 lá vàng: 16×1, 8×2, 4×3 cốm */
const GOLD_SPECS = [[1, 16], [2, 8], [3, 4]];

export function buildDeck() {
  const d = [];
  for (const [ex, n] of PATH_SPECS) for (let i = 0; i < n; i++) d.push('p-' + ex + '-' + i);
  for (const [k, n] of ACTION_SPECS) for (let i = 0; i < n; i++) d.push('a-' + k + '-' + i);
  return d;
}
export function buildGoldDeck() {
  const d = [];
  for (const [v, n] of GOLD_SPECS) for (let i = 0; i < n; i++) d.push('g-' + v + '-' + i);
  return d;
}
export const isPath = c => typeof c === 'string' && c[0] === 'p';
export const isAction = c => typeof c === 'string' && c[0] === 'a';
export const isGold = c => typeof c === 'string' && c[0] === 'g';
/* phần "loại" của 1 lá: đường -> 'NS'.., hành động -> 'map'/'break-pickaxe'.., vàng -> '1'/'2'/'3' */
export function cardKind(c) {
  return String(c).slice(2, String(c).lastIndexOf('-'));
}
export const isDeadEnd = c => isPath(c) && cardKind(c).length === 1;

/* ---------- hướng ---------- */
const DIR = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
const ROT = { N: 'S', S: 'N', E: 'W', W: 'E' }; /* xoay 180°: N↔S, E↔W */
/* các cửa ra của 1 lá đường (xoay 180° nếu rotated) */
export function exitsOf(card, rotated) {
  let ex = cardKind(card).split('');
  if (rotated) ex = ex.map(d => ROT[d]);
  return ex;
}
/* các cửa ra của 1 ô trên bàn: Bắt đầu = 4 cửa, đích = chỉ cửa Đông (hướng về đường), lá đã đặt = cửa của lá đó, ô trống = null */
function cellExits(s, x, y) {
  if (x === 0 && y === 0) return ['N', 'E', 'S', 'W'];
  if (s.goals.some(g => g.x === x && g.y === y)) return ['E'];
  const c = s.board[x + ',' + y];
  if (!c) return null;
  return exitsOf(c.card, c.rotated);
}

/* đặt được lá đường card (xoay hay không) vào (x, y)? Phải kề với mạng
   đường đã có, các cửa kề nhau phải khớp nhau (mở↔mở, đóng↔đóng), và
   phải nối vào ít nhất 1 cửa đang mở của mạng. */
export function canPlace(s, card, x, y, rotated) {
  if (!s || s.phase !== 'playing') return false;
  if (x < MIN_X || x > MAX_X || y < MIN_Y || y > MAX_Y) return false;
  if ((x === 0 && y === 0) || s.goals.some(g => g.x === x && g.y === y)) return false;
  if (s.board[x + ',' + y]) return false;
  const ex = exitsOf(card, rotated);
  let connected = false;
  for (const d of ['N', 'E', 'S', 'W']) {
    const [dx, dy] = DIR[d];
    const nx = x + dx, ny = y + dy;
    const nEx = cellExits(s, nx, ny);
    if (!nEx) continue;
    const nFacesMe = nEx.includes(OPP[d]);
    const iFaceN = ex.includes(d);
    if (nFacesMe !== iFaceN) return false;
    /* chỉ tính là nối mạng khi kề lá Bắt đầu hoặc 1 lá đường đã đặt —
       đích (kể cả vàng) chỉ là điểm đến, không phải mạng đường: 1 lá chỉ
       kề đích mà không kề mạng sẽ thành mảnh rời, không bao giờ tới vàng */
    if (nFacesMe && ((nx === 0 && ny === 0) || s.board[nx + ',' + ny])) connected = true;
  }
  return connected;
}
/* các đích đã nối được tới từ lá Bắt đầu (BFS theo cửa mở) */
export function reachableGoals(s) {
  const seen = new Set(['0,0']);
  const q = [[0, 0]];
  const reached = [];
  while (q.length) {
    const [x, y] = q.shift();
    const ex = cellExits(s, x, y);
    if (!ex) continue;
    for (const d of ex) {
      const [dx, dy] = DIR[d];
      const nx = x + dx, ny = y + dy;
      const gi = s.goals.findIndex(g => g.x === nx && g.y === ny);
      if (gi >= 0) {
        /* đích chỉ có cửa Đông hướng về đường: chỉ tới được từ phía Đông (d === 'W') */
        if (d === 'W' && !reached.includes(gi)) reached.push(gi);
        continue;
      }
      const key = nx + ',' + ny;
      if (seen.has(key)) continue;
      const nEx = cellExits(s, nx, ny);
      if (!nEx || !nEx.includes(OPP[d])) continue;
      seen.add(key);
      q.push([nx, ny]);
    }
  }
  return reached;
}
/* khoảng cách Manhattan ngắn nhất từ biên đường đã nối tới 1 đích chưa lộ */
export function frontierDist(s) {
  const seen = new Set(['0,0']);
  const q = [[0, 0]];
  let best = Infinity;
  while (q.length) {
    const [x, y] = q.shift();
    for (const g of s.goals) {
      if (g.revealed) continue;
      best = Math.min(best, Math.abs(x - g.x) + Math.abs(y - g.y));
    }
    const ex = cellExits(s, x, y);
    if (!ex) continue;
    for (const d of ex) {
      const [dx, dy] = DIR[d];
      const nx = x + dx, ny = y + dy;
      const key = nx + ',' + ny;
      if (seen.has(key)) continue;
      const nEx = cellExits(s, nx, ny);
      if (!nEx || !nEx.includes(OPP[d])) continue;
      seen.add(key);
      q.push([nx, ny]);
    }
  }
  return best;
}

/* ---------- chia vàng cuối vòng ---------- */
/* pool = số người thắng + 1 lá vàng; chia theo vòng: người đặt lá cuối
   (hoặc người đang tới lượt, nếu thắng vì hết bài) chọn trước, rồi theo
   chiều kim đồng hồ trong nhóm thắng, mỗi người 1 lá 1 lượt cho tới hết. */
function dealGold(s, winners, firstPid) {
  let pool = [];
  const need = winners.length + 1;
  for (let i = 0; i < need; i++) {
    if (!s.goldDeck.length) {
      if (!s.goldDiscard.length) break;
      s.goldDeck = shuffleWith(s, s.goldDiscard);
      s.goldDiscard = [];
    }
    pool.push(s.goldDeck.shift());
  }
  pool = shuffleWith(s, pool);
  const order = [];
  const startIdx = Math.max(0, winners.findIndex(p => p.id === firstPid));
  for (let i = 0; i < winners.length; i++) order.push(winners[(startIdx + i) % winners.length]);
  const got = {};
  pool.forEach((c, i) => {
    const p = order[i % order.length];
    const v = +cardKind(c);
    p.gold += v;
    p.goldCards.push(v);
    (got[p.id] = got[p.id] || []).push(v);
    s.goldDiscard.push(c);
  });
  return got;
}

function rankPlayers(s, list) {
  return [...list].sort((a, b) =>
    b.gold - a.gold || b.goldCards.length - a.goldCards.length
    || s.players.indexOf(a) - s.players.indexOf(b));
}

function endMatch(s, reason) {
  s.phase = 'ended';
  s.endReason = reason;
  s.endedAt = Date.now();
  const ranked = rankPlayers(s, s.players);
  s.winner = ranked[0].id;
  s.losers = ranked.slice(1).map(p => p.id);
  pushLog(s, `${ranked[0].name} thắng trận với ${ranked[0].gold} cốm vàng!`, 'win');
}

/* kết thúc 1 vòng: chia vàng rồi mở vòng mới hoặc kết thúc trận */
function endRound(s, side, finalPid) {
  const winners = s.players.filter(p => (side === 'diggers' ? p.role === 'digger' : p.role === 'saboteur'));
  const got = dealGold(s, winners, finalPid);
  const desc = winners.map(p => `${p.name} +${(got[p.id] || []).reduce((t, v) => t + v, 0)}`).join(', ');
  pushLog(s, side === 'diggers'
    ? `⛏️ Thợ đào tới được vàng! Chia vàng: ${desc}.`
    : `😈 Hết bài mà chưa tới vàng — kẻ phá hoại thắng vòng! Chia vàng: ${desc}.`, 'win');
  s.roundWinners = { side, got };
  if (s.round >= ROUNDS) {
    endMatch(s, 'match');
    return;
  }
  startRound(s, s.round + 1);
}

/* mở 1 vòng mới: xào bài, chia vai + tay bài, đặt lại 3 lá đích */
function startRound(s, round) {
  const n = s.players.length;
  s.round = round;
  s.deck = shuffleWith(s, buildDeck());
  if (round === 1) s.goldDeck = shuffleWith(s, buildGoldDeck());
  const hs = handSize(n);
  s.players.forEach(p => {
    p.hand = [];
    for (let i = 0; i < hs; i++) p.hand.push(s.deck.shift());
    p.tools = { pickaxe: false, lamp: false, cart: false };
    p.peeked = [];
  });
  const nSab = saboteurCount(n);
  const roles = shuffleWith(s, [
    ...Array(nSab).fill('saboteur'),
    ...Array(n - nSab).fill('digger'),
  ]);
  s.players.forEach((p, i) => { p.role = roles[i]; });
  const kinds = shuffleWith(s, ['gold', 'coal', 'coal']);
  s.goals = [
    { x: GOAL_X, y: -1, kind: kinds[0], revealed: false },
    { x: GOAL_X, y: 0, kind: kinds[1], revealed: false },
    { x: GOAL_X, y: 1, kind: kinds[2], revealed: false },
  ];
  s.board = {};
  s.discard = [];
  s.turnIdx = (round - 1) % n;
  s.lastPathBy = null;
  pushLog(s, `— Vòng ${round}/3 bắt đầu: ${n} người, mỗi người ${hs} lá, ${nSab} kẻ phá hoại trà trộn. —`);
}

export function createGame(players, opts = {}) {
  if (!players || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error('Saboteur chơi 3–10 người.');
  }
  const seed = typeof opts.seed === 'number' ? opts.seed : (Date.now() % 2147483647);
  const s = {
    gid: 'g' + seed.toString(36) + '-' + (seed % 9973).toString(36), seq: 0,
    phase: 'playing', /* 'playing' | 'ended' */
    seed,
    players: players.map((p, i) => ({
      id: p.id, name: p.name || ('Người ' + (i + 1)),
      isBot: !!p.isBot, level: p.level || null, local: !!p.local,
      role: null, hand: [], gold: 0, goldCards: [],
      tools: { pickaxe: false, lamp: false, cart: false }, peeked: [],
    })),
    deck: [], goldDeck: [], goldDiscard: [], discard: [],
    board: {}, goals: [],
    round: 1, turnIdx: 0, lastPathBy: null, roundWinners: null,
    winner: null, losers: [], endReason: null,
    startedAt: Date.now(), endedAt: 0, log: [],
  };
  startRound(s, 1);
  return s;
}

/* ---------- lượt đi ---------- */
/* chuyển lượt cho người kế tiếp; bỏ qua người hết bài khi bộ bài đã cạn
   (họ không còn nước nào để đi); nếu mọi người đều hết bài thì vòng
   kết thúc, kẻ phá hoại thắng vòng. Trả về true nếu vòng kết thúc. */
function advanceTurn(s, lastPid) {
  const n = s.players.length;
  for (let k = 0; k < n; k++) {
    s.turnIdx = (s.turnIdx + 1) % n;
    const p = s.players[s.turnIdx];
    if (p.hand.length > 0 || s.deck.length > 0) return false;
  }
  /* mọi người đều hết bài và bộ bài đã cạn */
  endRound(s, 'saboteurs', lastPid);
  return true;
}
function drawCard(s, p) {
  if (s.deck.length) p.hand.push(s.deck.shift());
}
function hasBrokenTool(p) {
  return p.tools.pickaxe || p.tools.lamp || p.tools.cart;
}

export function applyAction(s, pid, act) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Trận đã kết thúc.' };
  const p = pOf(s, pid);
  if (!p) return { ok: false, reason: 'Không tìm thấy người chơi.' };
  if (!act || typeof act.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };

  /* ---------- xin thua: kết thúc trận luôn ---------- */
  if (act.type === 'resign') {
    const others = s.players.filter(x => x.id !== pid);
    const ranked = others.length ? rankPlayers(s, others) : [p];
    s.phase = 'ended';
    s.endReason = 'resign';
    s.endedAt = Date.now();
    s.winner = ranked[0].id;
    s.losers = s.players.filter(x => x.id !== s.winner).map(x => x.id);
    s.seq++;
    pushLog(s, `${p.name} xin thua. ${ranked[0].name} thắng trận!`, 'resign');
    return { ok: true };
  }

  /* chỉ người tới lượt mới được đi */
  if (s.players[s.turnIdx].id !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };

  /* ---------- bỏ 1 lá ---------- */
  if (act.type === 'discard') {
    const idx = p.hand.indexOf(act.card);
    if (idx < 0) return { ok: false, reason: 'Lá không có trên tay bạn.' };
    p.hand.splice(idx, 1);
    s.discard.push(act.card);
    pushLog(s, `${p.name} bỏ 1 lá.`);
    s.seq++;
    drawCard(s, p);
    advanceTurn(s, pid);
    return { ok: true };
  }

  /* ---------- đặt lá đường ---------- */
  if (act.type === 'play-path') {
    if (hasBrokenTool(p)) return { ok: false, reason: 'Dụng cụ của bạn đang hỏng — phải sửa trước mới đặt được lá đường.' };
    const card = String(act.card);
    const idx = p.hand.indexOf(card);
    if (idx < 0) return { ok: false, reason: 'Lá không có trên tay bạn.' };
    if (!isPath(card)) return { ok: false, reason: 'Đây không phải lá đường.' };
    const x = act.x, y = act.y, rotated = !!act.rotated;
    if (typeof x !== 'number' || typeof y !== 'number') return { ok: false, reason: 'Chưa chọn ô để đặt.' };
    if (!canPlace(s, card, x, y, rotated)) return { ok: false, reason: 'Không đặt được lá này ở đây (không nối với đường hoặc cửa không khớp).' };
    p.hand.splice(idx, 1);
    s.board[x + ',' + y] = { card, rotated };
    s.lastPathBy = pid;
    s.seq++;
    pushLog(s, `${p.name} đặt lá đường ở (${x}, ${y}).`);
    const reached = reachableGoals(s);
    const goldIdx = reached.find(i => s.goals[i].kind === 'gold');
    if (goldIdx !== undefined) {
      s.goals[goldIdx].revealed = true;
      drawCard(s, p);
      pushLog(s, `🎉 ${p.name} đào tới VÀNG!`, 'win');
      endRound(s, 'diggers', pid);
      return { ok: true };
    }
    for (const i of reached) {
      if (!s.goals[i].revealed) {
        s.goals[i].revealed = true;
        pushLog(s, `💨 ${p.name} đào tới đích — chỉ là than!`, 'info');
      }
    }
    drawCard(s, p);
    advanceTurn(s, pid);
    return { ok: true };
  }

  /* ---------- lá hành động ---------- */
  if (act.type === 'play-action') {
    const card = String(act.card);
    const idx = p.hand.indexOf(card);
    if (idx < 0) return { ok: false, reason: 'Lá không có trên tay bạn.' };
    if (!isAction(card)) return { ok: false, reason: 'Đây không phải lá hành động.' };
    const kind = cardKind(card);

    if (kind === 'map') {
      const gi = act.goal;
      if (typeof gi !== 'number' || gi < 0 || gi > 2) return { ok: false, reason: 'Chưa chọn lá đích để xem.' };
      if (s.goals[gi].revealed) return { ok: false, reason: 'Lá đích này đã lộ rồi.' };
      p.hand.splice(idx, 1);
      s.discard.push(card);
      if (!p.peeked.includes(gi)) p.peeked.push(gi);
      s.seq++;
      pushLog(s, `${p.name} xem 1 lá đích (chỉ mình biết).`);
      drawCard(s, p);
      advanceTurn(s, pid);
      return { ok: true };
    }

    if (kind === 'rockfall') {
      const x = act.x, y = act.y;
      if (typeof x !== 'number' || typeof y !== 'number') return { ok: false, reason: 'Chưa chọn lá đường để phá.' };
      const cell = s.board[x + ',' + y];
      if (!cell) return { ok: false, reason: 'Ô này không có lá đường nào.' };
      p.hand.splice(idx, 1);
      s.discard.push(cell.card);
      delete s.board[x + ',' + y];
      s.seq++;
      pushLog(s, `💥 ${p.name} làm sập 1 lá đường ở (${x}, ${y})!`, 'info');
      drawCard(s, p);
      advanceTurn(s, pid);
      return { ok: true };
    }

    if (kind.startsWith('break-')) {
      const tool = kind.slice(6);
      const t = pOf(s, act.target);
      if (!t) return { ok: false, reason: 'Chưa chọn người để phá dụng cụ.' };
      if (t.tools[tool]) return { ok: false, reason: `${t.name} đã hỏng ${TOOL_NAME[tool]} rồi.` };
      p.hand.splice(idx, 1);
      s.discard.push(card);
      t.tools[tool] = true;
      s.seq++;
      pushLog(s, `🔨 ${p.name} phá ${TOOL_NAME[tool]} của ${t.name}!`, 'info');
      drawCard(s, p);
      advanceTurn(s, pid);
      return { ok: true };
    }

    if (kind.startsWith('repair-')) {
      const tools = kind.slice(7).split('-');
      const t = pOf(s, act.target);
      if (!t) return { ok: false, reason: 'Chưa chọn người để sửa dụng cụ.' };
      if (!tools.some(tl => t.tools[tl])) return { ok: false, reason: `${t.name} không hỏng dụng cụ nào trong các loại này.` };
      p.hand.splice(idx, 1);
      s.discard.push(card);
      const fixed = tools.filter(tl => t.tools[tl]);
      fixed.forEach(tl => { t.tools[tl] = false; });
      s.seq++;
      pushLog(s, `🔧 ${p.name} sửa ${fixed.map(tl => TOOL_NAME[tl]).join(' + ')} cho ${t.name}.`);
      drawCard(s, p);
      advanceTurn(s, pid);
      return { ok: true };
    }

    return { ok: false, reason: 'Lá hành động không hợp lệ.' };
  }

  return { ok: false, reason: 'Hành động không hợp lệ.' };
}

/* người đang tới lượt (chỉ 1 người đi mỗi lượt) */
export function actors(s) {
  if (!s || s.phase !== 'playing') return [];
  return [s.players[s.turnIdx].id];
}

/* tất cả nước đi hợp lệ của người chơi (UI và bot đều chỉ dùng danh sách này) */
export function legalMoves(s, pid) {
  if (!s || s.phase !== 'playing') return [];
  const p = pOf(s, pid);
  if (!p) return [];
  if (s.players[s.turnIdx].id !== pid) return [];
  const out = [];
  const broken = hasBrokenTool(p);
  /* các ô kề với mạng đường (chỉ ở đó mới đặt được lá) */
  const cells = new Set();
  const addCell = (x, y) => {
    if (x < MIN_X || x > MAX_X || y < MIN_Y || y > MAX_Y) return;
    if ((x === 0 && y === 0) || s.goals.some(g => g.x === x && g.y === y)) return;
    if (s.board[x + ',' + y]) return;
    cells.add(x + ',' + y);
  };
  const near = (x, y) => {
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) addCell(x + dx, y + dy);
  };
  near(0, 0);
  for (const key of Object.keys(s.board)) { const [x, y] = key.split(',').map(Number); near(x, y); }
  for (const g of s.goals) near(g.x, g.y);
  const cellList = [...cells].map(k => k.split(',').map(Number));

  for (const card of p.hand) {
    if (isPath(card) && !broken) {
      for (const [x, y] of cellList) {
        if (canPlace(s, card, x, y, false)) out.push({ type: 'play-path', card, x, y, rotated: false });
        /* xoay 180° chỉ khác khi cửa ra thay đổi */
        const ex0 = exitsOf(card, false).slice().sort().join('');
        const ex1 = exitsOf(card, true).slice().sort().join('');
        if (ex1 !== ex0 && canPlace(s, card, x, y, true)) out.push({ type: 'play-path', card, x, y, rotated: true });
      }
    } else if (isAction(card)) {
      const kind = cardKind(card);
      if (kind === 'map') {
        s.goals.forEach((g, i) => { if (!g.revealed) out.push({ type: 'play-action', card, goal: i }); });
      } else if (kind === 'rockfall') {
        for (const key of Object.keys(s.board)) {
          const [x, y] = key.split(',').map(Number);
          out.push({ type: 'play-action', card, x, y });
        }
      } else if (kind.startsWith('break-')) {
        const tool = kind.slice(6);
        for (const t of s.players) if (!t.tools[tool]) out.push({ type: 'play-action', card, target: t.id });
      } else if (kind.startsWith('repair-')) {
        const tools = kind.slice(7).split('-');
        for (const t of s.players) if (tools.some(tl => t.tools[tl])) out.push({ type: 'play-action', card, target: t.id });
      }
    }
    out.push({ type: 'discard', card });
  }
  return out;
}

export function viewFor(s, pid) {
  const me = pOf(s, pid);
  const ended = s.phase === 'ended';
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, round: s.round,
    turn: s.players[s.turnIdx] ? s.players[s.turnIdx].id : null,
    board: Object.fromEntries(Object.entries(s.board).map(([k, v]) => [k, { ...v }])),
    goals: s.goals.map((g, i) => ({
      x: g.x, y: g.y, revealed: g.revealed,
      /* thân phận lá đích chỉ lộ khi đã lật, hoặc chính mình đã xem bằng Bản đồ */
      kind: (g.revealed || (me && me.peeked.includes(i))) ? g.kind : '?',
      peeked: !!(me && me.peeked.includes(i)),
    })),
    players: s.players.map(p => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
      /* vai trò chỉ mình biết (kẻ phá hoại cũng không biết đồng bọn) */
      role: (ended || (me && p.id === pid)) ? p.role : null,
      gold: p.gold, goldCards: p.goldCards.length,
      handCount: p.hand.length,
      hand: (ended || (me && p.id === pid)) ? p.hand.slice() : [],
      tools: { ...p.tools },
      peeked: (me && p.id === pid) ? p.peeked.slice() : [],
    })),
    deckCount: s.deck.length, goldDeckCount: s.goldDeck.length,
    roundWinners: s.roundWinners ? JSON.parse(JSON.stringify(s.roundWinners)) : null,
    winner: s.winner, losers: (s.losers || []).slice(), endReason: s.endReason,
    log: s.log.slice(), startedAt: s.startedAt, endedAt: s.endedAt,
    me: pid,
  };
}
