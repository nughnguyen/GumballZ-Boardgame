// 🐂 Lấy 6 (6 Nimmt!) – luật chơi (thuần logic, không chạm DOM).
// 2–10 người, mỗi người 10 lá, 4 dãy trên bàn. Mỗi lượt mọi người cùng
// chọn 1 lá úp xuống rồi lật cùng lúc; các lá được đặt theo thứ tự tăng
// dần vào dãy mà lá cuối lớn nhất nhưng vẫn nhỏ hơn lá đang đặt; lá nhỏ
// hơn mọi lá cuối thì phải lấy nguyên 1 dãy (chọn dãy nào cũng được);
// lá là lá thứ 6 của 1 dãy thì lấy 5 lá đầu làm phạt, lá của mình mở
// dãy mới. Hết 10 lá thì ít đầu bò nhất thắng (hòa: ít lá đã lấy hơn,
// rồi ghế sớm hơn). Mọi quyết định ngẫu nhiên đều dùng LCG lưu trong
// state để mọi máy cùng áp 1 hành động thì giống hệt nhau.
export const TOTAL_CARDS = 104;
export const HAND_CARDS = 10;
export const ROW_COUNT = 4;
export const ROW_MAX = 5;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;

/* đầu bò (điểm phạt) của 1 lá: 55 = 7, đôi (11, 22, …, 99) = 5,
   tận cùng 0 = 3, tận cùng 5 = 2, còn lại = 1 */
export function bullheads(n) {
  n = +n;
  if (n === 55) return 7;
  if (n % 11 === 0) return 5;
  if (n % 10 === 0) return 3;
  if (n % 10 === 5) return 2;
  return 1;
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
    || !Array.isArray(s.rows) || s.rows.length !== ROW_COUNT
    || typeof s.phase !== 'string' || typeof s.turn !== 'number') {
    throw new Error('Trạng thái Lấy 6 không hợp lệ.');
  }
  return s;
}
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

function buildDeck() {
  const d = [];
  for (let n = 1; n <= TOTAL_CARDS; n++) d.push(String(n));
  return d;
}

/* dãy mà lá card sẽ rơi vào (-1 = nhỏ hơn mọi lá cuối -> bắt buộc lấy dãy) */
function bestRow(s, card) {
  const v = +card;
  let best = -1, bestLast = -1;
  s.rows.forEach((r, i) => {
    const last = +r[r.length - 1];
    if (last < v && last > bestLast) { bestLast = last; best = i; }
  });
  return best;
}
function takeRow(s, pid, row) {
  const p = pOf(s, pid);
  const r = s.rows[row];
  const heads = r.reduce((t, c) => t + bullheads(c), 0);
  p.bullheads += heads;
  p.taken += r.length;
  pushLog(s, `${p.name} lấy dãy ${row + 1} (${heads} đầu bò).`, 'take');
  return heads;
}
/* đặt 1 lá vào dãy: là lá thứ 6 thì lấy cả dãy làm phạt */
function placeCard(s, pid, card, row) {
  const r = s.rows[row];
  if (r.length >= ROW_MAX) {
    takeRow(s, pid, row);
    pushLog(s, `${pOf(s, pid).name} đặt lá ${card} làm lá thứ 6 của dãy ${row + 1} nên lấy 5 lá đầu.`, 'take');
    s.rows[row] = [card];
  } else {
    r.push(card);
  }
}
/* giải quyết hàng đợi các lá đã lật (đã xếp theo thứ tự tăng dần);
   gặp lá bắt buộc lấy dãy thì dừng lại chờ người đó chọn dãy */
function resolveQueue(s) {
  while (s.queue.length) {
    const { pid, card } = s.queue.shift();
    const row = bestRow(s, card);
    if (row < 0) {
      s.stage = 'take';
      s.pendingTake = { pid, card };
      return;
    }
    placeCard(s, pid, card, row);
  }
  if (s.turn >= HAND_CARDS) {
    endMatch(s, 'match');
  } else {
    s.turn++;
    s.stage = 'pick';
  }
}
function resolveTurn(s) {
  s.queue = Object.entries(s.picks)
    .map(([pid, card]) => ({ pid, card }))
    .sort((a, b) => +a.card - +b.card);
  s.picks = {};
  resolveQueue(s);
}
function rankPlayers(s, list) {
  return [...list].sort((a, b) =>
    a.bullheads - b.bullheads || a.taken - b.taken
    || s.players.indexOf(a) - s.players.indexOf(b));
}
function endMatch(s, reason) {
  s.phase = 'ended';
  s.endReason = reason;
  s.endedAt = Date.now();
  const ranked = rankPlayers(s, s.players);
  s.winner = ranked[0].id;
  s.losers = ranked.slice(1).map(p => p.id);
  pushLog(s, `${ranked[0].name} thắng trận với ${ranked[0].bullheads} đầu bò!`, 'win');
}

export function createGame(players, opts = {}) {
  if (!players || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error('Lấy 6 chơi 2–10 người.');
  }
  const seed = typeof opts.seed === 'number' ? opts.seed : (Date.now() % 2147483647);
  const s = {
    gid: 'g' + seed.toString(36) + '-' + (seed % 9973).toString(36), seq: 0,
    phase: 'playing', /* 'playing' | 'ended' */
    stage: 'pick', /* 'pick': đang chọn lá | 'take': đang chờ chọn dãy để lấy */
    seed,
    players: players.map((p, i) => ({
      id: p.id, name: p.name || ('Người ' + (i + 1)),
      isBot: !!p.isBot, level: p.level || null, local: !!p.local,
      hand: [], bullheads: 0, taken: 0,
    })),
    rows: [[], [], [], []],
    picks: {}, queue: [], pendingTake: null,
    turn: 1, winner: null, losers: [], endReason: null,
    startedAt: Date.now(), endedAt: 0, log: [],
  };
  const deck = shuffleWith(s, buildDeck());
  s.players.forEach(p => {
    p.hand = deck.splice(0, HAND_CARDS).sort((a, b) => +a - +b);
  });
  s.rows = [0, 1, 2, 3].map(() => [deck.shift()]);
  pushLog(s, `Ván mới: ${s.players.length} người, mỗi người 10 lá, 4 dãy trên bàn.`);
  return s;
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

  /* ---------- chọn lá ---------- */
  if (act.type === 'pick') {
    if (s.stage !== 'pick') return { ok: false, reason: 'Chưa tới lúc chọn lá.' };
    if (s.picks[pid]) return { ok: false, reason: 'Bạn đã chọn lá lượt này rồi.' };
    const card = String(act.card);
    const idx = p.hand.indexOf(card);
    if (idx < 0) return { ok: false, reason: 'Lá không có trên tay bạn.' };
    p.hand.splice(idx, 1);
    s.picks[pid] = card;
    s.seq++;
    if (Object.keys(s.picks).length === s.players.length) resolveTurn(s);
    return { ok: true };
  }

  /* ---------- chọn dãy để lấy ---------- */
  if (act.type === 'take') {
    if (s.stage !== 'take' || !s.pendingTake || s.pendingTake.pid !== pid) {
      return { ok: false, reason: 'Không phải lượt chọn dãy của bạn.' };
    }
    const row = act.row;
    if (typeof row !== 'number' || row < 0 || row >= ROW_COUNT) {
      return { ok: false, reason: 'Dãy không hợp lệ.' };
    }
    const { card } = s.pendingTake;
    takeRow(s, pid, row);
    s.rows[row] = [card];
    s.pendingTake = null;
    s.stage = 'pick';
    s.seq++;
    resolveQueue(s);
    return { ok: true };
  }

  return { ok: false, reason: 'Hành động không hợp lệ.' };
}

/* những ai còn phải hành động: chưa chọn lá (lượt chọn) hoặc đang phải
   chọn dãy để lấy (lượt lấy dãy) */
export function actors(s) {
  if (!s || s.phase !== 'playing') return [];
  if (s.stage === 'take' && s.pendingTake) return [s.pendingTake.pid];
  return s.players.filter(p => !s.picks[p.id]).map(p => p.id);
}
/* các lá người chơi được đánh (lượt chọn: toàn bộ tay bài) */
export function legalCards(s, pid) {
  if (!s || s.phase !== 'playing') return [];
  const p = pOf(s, pid);
  if (!p) return [];
  if (s.stage === 'pick' && !s.picks[pid]) return p.hand.slice();
  return [];
}
/* các dãy người chơi được chọn khi bắt buộc lấy dãy */
export function legalRows(s, pid) {
  if (!s || s.phase !== 'playing' || s.stage !== 'take') return [];
  if (!s.pendingTake || s.pendingTake.pid !== pid) return [];
  return [0, 1, 2, 3];
}

export function viewFor(s, pid) {
  const me = pOf(s, pid);
  const ended = s.phase === 'ended';
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, stage: s.stage,
    turn: s.turn,
    pendingTake: s.pendingTake ? { ...s.pendingTake } : null,
    rows: s.rows.map(r => r.slice()),
    players: s.players.map(p => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
      bullheads: p.bullheads, taken: p.taken,
      handCount: p.hand.length,
      /* tay bài chỉ hiện cho chính mình (hoặc khi trận đã xong thì hiện hết) */
      hand: (ended || (me && p.id === pid)) ? p.hand.slice() : [],
      /* đã chọn hay chưa thì ai cũng thấy; chọn lá nào thì không ai thấy */
      picked: !!s.picks[p.id],
    })),
    winner: s.winner, losers: (s.losers || []).slice(), endReason: s.endReason,
    log: s.log.slice(), startedAt: s.startedAt, endedAt: s.endedAt,
    me: pid,
  };
}
