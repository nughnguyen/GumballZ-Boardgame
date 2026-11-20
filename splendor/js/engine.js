// 💎 Splendor — engine thuần logic (seeded LCG, KHÔNG dùng Math.random).
//
// LUẬT CHUẨN ÁP DỤNG (bản gốc Space Cowboys 2014, Marc André;
// đã tra cứu trước khi code — xem test/rules.mjs §0 để biết nguồn từng luật):
// - 2–4 người; đá quý: 4 mỗi màu (2 người), 5 mỗi màu (3 người), 7 mỗi
//   màu (4 người) + LUÔN 5 vàng (hoang dã); 5 màu: trắng (kim cương),
//   xanh dương (sapphire), xanh lá (ngọc lục bảo), đỏ (hồng ngọc), đen
//   (onyx).
// - 90 thẻ phát triển: 40 cấp 1, 30 cấp 2, 20 cấp 3; mỗi cấp 4 thẻ lật
//   ngửa trên bàn; ô trống được lấp lại từ chồng cùng cấp (hết chồng thì
//   ô trống luôn).
// - Quý tộc: số người + 1 thẻ (2 người: 3, 3 người: 4, 4 người: 5),
//   chọn ngẫu nhiên trong 10 thẻ; mỗi quý tộc +3 điểm.
// - Mỗi lượt làm ĐÚNG 1 hành động: lấy 3 đá khác màu nhau (hoặc ít hơn
//   nếu không đủ 3 màu còn đá), HOẶC lấy 2 đá cùng màu (chỉ khi còn ít
//   nhất 4 đá màu đó), HOẶC giữ 1 thẻ (từ bàn hoặc úp từ đầu chồng) +
//   lấy 1 vàng nếu còn, HOẶC mua 1 thẻ (từ bàn hoặc thẻ đã giữ).
// - Giữ tối đa 3 thẻ; cuối lượt không được giữ quá 10 đá (kể cả vàng) —
//   thừa thì trả lại.
// - Mua thẻ: thẻ đã mua cho giảm giá vĩnh viễn theo màu; vàng thay cho
//   bất kỳ màu nào; thẻ mua được đặt ngửa trước mặt người chơi.
// - Quý tộc: cuối lượt, nếu đủ điều kiện (theo MÀU THẺ ĐÃ MUA, không
//   tính đá đang cầm) thì quý tộc tự đến thăm, tối đa 1 quý tộc/lượt,
//   không được từ chối; nếu đủ điều kiện nhiều quý tộc thì người chơi
//   ĐƯỢC CHỌN quý tộc nào đến.
// - Kết thúc: ai đạt 15+ điểm cuối lượt thì hết vòng hiện tại (mọi người
//   được đi số lượt bằng nhau) rồi tính điểm; hòa điểm thì ai mua ÍT THẺ
//   HƠN thắng; vẫn hòa thì cùng thắng (luật gốc — các tie-break giải đấu
//   như "nhiều quý tộc hơn" KHÔNG dùng).
// - Xin thua kết thúc TRẬN ngay.
// - BẾ TẮC (luật nhà, vì luật gốc không quy định trường hợp này):
//   nếu mọi người chơi LIÊN TIẾP chỉ còn nước "bỏ lượt" (không còn đá
//   để lấy, không mua nổi thẻ nào, đã giữ đủ 3 thẻ) thì ván kết thúc và
//   người nhiều điểm nhất thắng (hòa điểm thì ít thẻ hơn thắng). Điều
//   này chỉ xảy ra khi tất cả đá đều nằm trong tay người chơi mà không
//   ai mua nổi thẻ nào — cực hiếm khi chơi thật, nhưng cần có để ván
//   không bao giờ kẹt vĩnh viễn (xem test/rules.mjs §10).
//
// BỘ THẺ (phân bố chuẩn, đối xứng theo màu — xem test/rules.mjs §1):
// - Cấp 1: 40 thẻ (8 thẻ mỗi màu thưởng), giá 3–5 đá, 0–1 điểm.
// - Cấp 2: 30 thẻ (6 thẻ mỗi màu thưởng), giá 5–8 đá, 1–3 điểm.
// - Cấp 3: 20 thẻ (4 thẻ mỗi màu thưởng), giá 7–14 đá, 3–5 điểm.
// - 10 quý tộc: 5 thẻ dạng "4+4" và 5 thẻ dạng "3+3+3" (theo luật gốc).
//
// MÔ HÌNH:
// - Màu đá: 'W' trắng, 'B' xanh dương, 'G' xanh lá, 'R' đỏ, 'K' đen;
//   vàng là 'gold' (không phải màu).
// - Thẻ: { id, level, bonus, pts, cost: {W,B,G,R,K} }; id dạng
//   `${level}${bonus}${j}` (VD '1W0', '3K2'). Chồng bài là mảng id đã
//   xào; thứ tự chồng KHÔNG bao giờ lộ ra view.
// - Quý tộc: { id, req: {màu: số thẻ cần} }.
// - Người chơi: tokens (đá đang cầm), cards (thẻ đã mua — id), reserved
//   (thẻ đã giữ, CÔNG KHAI theo brief), nobles (quý tộc đã đón), score.
// - step: 'act' (hành động chính) | 'noble' (chọn quý tộc khi đủ điều
//   kiện nhiều quý tộc) | 'discard' (trả đá thừa khi > 10 đá).
// - pass: van an toàn khi người chơi không còn nước đi hợp lệ nào ở
//   bước 'act' (chỉ hợp lệ khi đó là nước duy nhất) — xem §9 rules test.

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const COLORS = ['W', 'B', 'G', 'R', 'K'];
export const GOLD = 'gold';
export const COLOR_NAME = { W: 'kim cương trắng', B: 'sapphire xanh', G: 'ngọc lục bảo', R: 'hồng ngọc đỏ', K: 'onyx đen', gold: 'vàng' };
export const GEM_EMOJI = { W: '💎', B: '💙', G: '💚', R: '❤️', K: '🖤', gold: '⭐' };
/* đá quý mỗi màu theo số người chơi (vàng LUÔN 5) */
export const TOKENS_BY_PLAYERS = { 2: 4, 3: 5, 4: 7 };
export const GOLD_TOKENS = 5;
export const MAX_RESERVED = 3;
export const MAX_TOKENS = 10;
export const WIN_SCORE = 15;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- bộ thẻ phát triển (đối xứng theo màu) ---------- */
/* archetype: cost dùng a/b/c = màu lệch (1+j)/(2+j)/(3+j) vòng quanh
   màu thưởng — nhờ đó chi phí chạm đủ mọi màu (kể cả màu thưởng). */
const ARCHETYPES = {
  1: [
    { pts: 0, cost: { a: 3 } },
    { pts: 0, cost: { a: 4 } },
    { pts: 0, cost: { a: 5 } },
    { pts: 0, cost: { a: 2, b: 2 } },
    { pts: 0, cost: { a: 3, b: 2 } },
    { pts: 0, cost: { a: 2, b: 2, c: 1 } },
    { pts: 1, cost: { a: 2, b: 2 } },
    { pts: 1, cost: { a: 3, b: 1, c: 1 } },
  ],
  2: [
    { pts: 1, cost: { a: 4, b: 3, c: 1 } },
    { pts: 2, cost: { a: 5 } },
    { pts: 2, cost: { a: 4, b: 3 } },
    { pts: 2, cost: { a: 3, b: 3, c: 2 } },
    { pts: 3, cost: { a: 3, b: 3 } },
    { pts: 3, cost: { a: 5, b: 2 } },
  ],
  3: [
    { pts: 5, cost: { a: 5, b: 5 } },
    { pts: 4, cost: { a: 7 } },
    { pts: 4, cost: { a: 6, b: 3, c: 3 } },
    { pts: 3, cost: { a: 7, b: 7 } },
  ],
};
export const CARDS = {};
for (const level of [1, 2, 3]) {
  ARCHETYPES[level].forEach((arch, j) => {
    for (let i = 0; i < 5; i++) {
      const bonus = COLORS[i];
      const cost = {};
      const offs = { a: (i + 1 + j) % 5, b: (i + 2 + j) % 5, c: (i + 3 + j) % 5 };
      for (const k of ['a', 'b', 'c']) if (arch.cost[k]) cost[COLORS[offs[k]]] = arch.cost[k];
      const id = `${level}${bonus}${j}`;
      CARDS[id] = { id, level, bonus, pts: arch.pts, cost };
    }
  });
}
export function cardById(id) { return CARDS[id] || null; }

/* ---------- 10 quý tộc chuẩn: 5 thẻ "4+4", 5 thẻ "3+3+3" ---------- */
export const NOBLES = [
  { id: 'n0', req: { G: 4, B: 4 } },
  { id: 'n1', req: { G: 4, R: 4 } },
  { id: 'n2', req: { W: 4, B: 4 } },
  { id: 'n3', req: { W: 4, R: 4 } },
  { id: 'n4', req: { K: 4, R: 4 } },
  { id: 'n5', req: { G: 3, B: 3, W: 3 } },
  { id: 'n6', req: { G: 3, R: 3, K: 3 } },
  { id: 'n7', req: { W: 3, B: 3, K: 3 } },
  { id: 'n8', req: { W: 3, R: 3, K: 3 } },
  { id: 'n9', req: { G: 3, W: 3, K: 3 } },
];
export function nobleById(id) { return NOBLES.find(n => n.id === id) || null; }

/* ---------- trạng thái ván ---------- */
function newPlayer(p, i) {
  return {
    id: p.id, name: p.name || ('Người ' + (i + 1)),
    isBot: !!p.isBot, local: !!p.local, level: p.level || null,
    tokens: { W: 0, B: 0, G: 0, R: 0, K: 0, gold: 0 },
    cards: [], reserved: [], nobles: [],
    score: 0,
  };
}
const player = (s, pid) => s.players.find(p => p.id === pid);

function log(s, text, cls) {
  s.log.push({ text, kind: cls || '' });
  if (s.log.length > 120) s.log.splice(0, s.log.length - 120);
}

export function createGame(players, opts = {}) {
  if (!players || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error('Splendor cần ' + MIN_PLAYERS + '–' + MAX_PLAYERS + ' người chơi');
  }
  const seed = opts.seed == null ? (Date.now() % 2147483647) : opts.seed;
  const rnd = mulberry32(seed);
  const n = players.length;
  /* chấp nhận cả tên chuỗi ('An') lẫn object ({id, name, isBot, ...}) */
  const plist = players.map((p, i) => (typeof p === 'string' ? { id: 'p' + i, name: p } : p));
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };
  const decks = {};
  for (const level of [1, 2, 3]) {
    decks[level] = shuffle(Object.values(CARDS).filter(c => c.level === level).map(c => c.id));
  }
  const table = {};
  for (const level of [1, 2, 3]) table[level] = [0, 1, 2, 3].map(() => decks[level].pop());
  const nobleIds = shuffle(NOBLES.map(x => x.id));
  const perColor = TOKENS_BY_PLAYERS[n];
  const tokens = { W: perColor, B: perColor, G: perColor, R: perColor, K: perColor, gold: GOLD_TOKENS };
  const s = {
    gid: 'sp-' + seed + '-' + Math.floor(rnd() * 1e9).toString(36),
    seq: 0, phase: 'playing', turnIdx: 0, turnCount: 0, round: 1,
    step: 'act', nobleChoices: [],
    tokens, decks, table,
    nobles: nobleIds.slice(0, n + 1),
    firstPlayerIdx: 0, endTriggered: false,
    passStreak: 0, /* số lượt bỏ liên tiếp (bế tắc thì hết ván) */
    players: plist.map(newPlayer),
    winner: null, winners: [], losers: [], endReason: null, endCause: null,
    final: null,
    log: [], startedAt: Date.now(), endedAt: 0, _seed: seed,
  };
  s.turn = s.players[0].id;
  log(s, `💎 Ván bắt đầu — ${n} người, ${perColor} đá mỗi màu + 5 vàng; ${n + 1} quý tộc trên bàn.`, 'info');
  return s;
}

/* ---------- tính toán ---------- */
/* điểm: thẻ đã mua + 3 mỗi quý tộc */
export function prestige(pl) {
  let pts = 0;
  for (const id of pl.cards) { const c = cardById(id); if (c) pts += c.pts; }
  return pts + 3 * pl.nobles.length;
}
/* giảm giá vĩnh viễn theo màu thẻ đã mua */
export function bonusCounts(pl) {
  const b = { W: 0, B: 0, G: 0, R: 0, K: 0 };
  for (const id of pl.cards) { const c = cardById(id); if (c) b[c.bonus]++; }
  return b;
}
export function tokenCount(pl) {
  return (pl.tokens.W || 0) + (pl.tokens.B || 0) + (pl.tokens.G || 0)
    + (pl.tokens.R || 0) + (pl.tokens.K || 0) + (pl.tokens.gold || 0);
}
function tokenCountOf(tokens) {
  return (tokens.W || 0) + (tokens.B || 0) + (tokens.G || 0)
    + (tokens.R || 0) + (tokens.K || 0) + (tokens.gold || 0);
}
/* cách trả cho 1 thẻ: dùng giảm giá trước, đá màu, thiếu bao nhiêu thì
   bù bằng vàng. Trả null nếu không đủ (kể cả vàng). */
export function paymentFor(pl, card) {
  if (!card) return null;
  const bonuses = bonusCounts(pl);
  const pay = {};
  let gold = 0;
  for (const c of COLORS) {
    const need = Math.max(0, (card.cost[c] || 0) - (bonuses[c] || 0));
    const use = Math.min(need, pl.tokens[c] || 0);
    if (use) pay[c] = use;
    gold += need - use;
  }
  if (gold > (pl.tokens.gold || 0)) return null;
  if (gold) pay.gold = gold;
  return pay;
}
export function canAfford(pl, card) { return !!paymentFor(pl, card); }
export function nobleQualifies(pl, noble) {
  const b = bonusCounts(pl);
  for (const [c, need] of Object.entries(noble.req)) {
    if ((b[c] || 0) < need) return false;
  }
  return true;
}
function qualifyingNobles(s, pl) {
  return s.nobles.map(nobleById).filter(n => n && nobleQualifies(pl, n));
}
function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const out = [];
  const rec = (start, cur) => {
    if (cur.length === k) { out.push(cur.slice()); return; }
    for (let i = start; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1, cur); cur.pop(); }
  };
  rec(0, []);
  return out;
}
/* gợi ý trả đá thừa: trả màu thừa nhiều nhất so với nhu cầu lớn nhất
   (thẻ đã giữ + thẻ trên bàn); vàng giữ lại cuối cùng. */
function discardSuggestion(v, pid) {
  const me = v.players.find(p => p.id === pid);
  if (!me) return [];
  const excess = tokenCountOf(me.tokens) - MAX_TOKENS;
  if (excess <= 0) return [];
  const bonuses = bonusCounts(me);
  const maxNeed = { W: 0, B: 0, G: 0, R: 0, K: 0 };
  const consider = (card) => {
    if (!card) return;
    for (const c of COLORS) {
      maxNeed[c] = Math.max(maxNeed[c], Math.max(0, (card.cost[c] || 0) - (bonuses[c] || 0)));
    }
  };
  for (const id of me.reserved) consider(cardById(id));
  for (const lvl of [1, 2, 3]) for (const id of (v.table[lvl] || [])) consider(cardById(id));
  const scored = [...COLORS, GOLD]
    .filter(c => (me.tokens[c] || 0) > 0)
    .map(c => ({ c, surplus: c === GOLD ? -100 : (me.tokens[c] - maxNeed[c]) }));
  scored.sort((a, b) => b.surplus - a.surplus);
  const out = [];
  for (const { c } of scored) {
    let n = me.tokens[c];
    while (n-- > 0 && out.length < excess) out.push(c);
    if (out.length >= excess) break;
  }
  return out;
}

/* ---------- nước đi hợp lệ ---------- */
/* Mọi nước hợp lệ cho người pid, tính từ 1 state/view có dạng
   { step, turn, phase, tokens, table, deckCounts, players, nobleChoices }
   — bot chỉ dùng view nên hàm này nhận view được (không đọc state thô). */
export function legalMovesFromView(v, pid) {
  if (!v || v.phase !== 'playing' || v.turn !== pid) return [];
  const me = v.players.find(p => p.id === pid);
  if (!me) return [];
  /* bước chọn quý tộc: chỉ được chọn trong danh sách đủ điều kiện */
  if (v.step === 'noble') {
    return (v.nobleChoices || []).map(id => ({ type: 'noble', noble: id }));
  }
  /* bước trả đá thừa: chỉ có 1 gợi ý chuẩn (người chơi tự chọn tay ở UI) */
  if (v.step === 'discard') {
    return [{ type: 'discard', colors: discardSuggestion(v, pid) }];
  }
  const out = [];
  /* lấy 3 đá khác màu: đúng min(3, số màu còn đá) đá */
  const avail = COLORS.filter(c => (v.tokens[c] || 0) > 0);
  const k = Math.min(3, avail.length);
  if (k > 0) for (const combo of combinations(avail, k)) out.push({ type: 'take3', colors: combo });
  /* lấy 2 đá cùng màu: chỉ khi còn ít nhất 4 đá màu đó */
  for (const c of COLORS) if ((v.tokens[c] || 0) >= 4) out.push({ type: 'take2', color: c });
  /* giữ thẻ (tối đa 3): từ bàn hoặc úp từ đầu chồng */
  if (me.reserved.length < MAX_RESERVED) {
    for (const lvl of [1, 2, 3]) for (let slot = 0; slot < 4; slot++) {
      const id = v.table[lvl] && v.table[lvl][slot];
      if (id) out.push({ type: 'reserve', from: 'table', level: lvl, slot });
    }
    for (const lvl of [1, 2, 3]) {
      if ((v.deckCounts[lvl] || 0) > 0) out.push({ type: 'reserve', from: 'deck', level: lvl });
    }
  }
  /* mua thẻ: từ bàn hoặc thẻ đã giữ, nếu đủ tiền */
  for (const lvl of [1, 2, 3]) for (let slot = 0; slot < 4; slot++) {
    const id = v.table[lvl] && v.table[lvl][slot];
    if (id && canAfford(me, cardById(id))) out.push({ type: 'buy', from: 'table', level: lvl, slot, cardId: id });
  }
  for (const id of me.reserved) {
    if (canAfford(me, cardById(id))) out.push({ type: 'buy', from: 'reserved', cardId: id });
  }
  /* van an toàn: không còn nước nào thì được bỏ lượt (xem engine header) */
  if (!out.length) out.push({ type: 'pass' });
  return out;
}

export function legalMoves(s, pid) {
  if (!s || s.phase !== 'playing') return [];
  if (actors(s)[0] !== pid) return [];
  return legalMovesFromView(viewFor(s, pid), pid);
}

/* ---------- áp dụng 1 nước đi ---------- */
function refillSlot(s, level) {
  const deck = s.decks[level];
  return deck.length ? deck.pop() : null;
}
function grantNoble(s, p, noble) {
  const idx = s.nobles.indexOf(noble.id);
  if (idx >= 0) s.nobles.splice(idx, 1);
  p.nobles.push(noble.id);
  p.score = prestige(p);
  log(s, `👑 ${p.name} được quý tộc ghé thăm (+3 điểm)!`, 'win');
}
/* sau hành động chính: quý tộc -> trả đá thừa -> hết lượt */
function afterMainAction(s, pid) {
  const p = player(s, pid);
  const quals = qualifyingNobles(s, p);
  if (quals.length === 1) {
    grantNoble(s, p, quals[0]);
  } else if (quals.length > 1) {
    s.step = 'noble';
    s.nobleChoices = quals.map(n => n.id);
    log(s, `👑 ${p.name} đủ điều kiện đón ${quals.length} quý tộc — chọn 1.`, 'info');
    return;
  }
  checkDiscard(s, pid);
}
function checkDiscard(s, pid) {
  const p = player(s, pid);
  if (tokenCount(p) > MAX_TOKENS) {
    s.step = 'discard';
    log(s, `⚠️ ${p.name} đang cầm ${tokenCount(p)} đá — phải trả xuống còn 10 đá.`, 'info');
    return;
  }
  endTurn(s, pid);
}
function endTurn(s, pid) {
  const p = player(s, pid);
  if (prestige(p) >= WIN_SCORE && !s.endTriggered) {
    s.endTriggered = true;
    log(s, `🏁 ${p.name} đạt ${prestige(p)} điểm — vòng cuối, mọi người còn 1 lượt nữa!`, 'win');
  }
  s.step = 'act';
  s.nobleChoices = [];
  s.turnIdx = (s.turnIdx + 1) % s.players.length;
  s.turn = s.players[s.turnIdx].id;
  s.turnCount++;
  if (s.turnIdx === 0) s.round++;
  /* bế tắc: mọi người liên tiếp chỉ bỏ lượt thì hết ván */
  if (s.passStreak >= s.players.length) {
    endGame(s, 'stalemate');
    return;
  }
  /* hết vòng mà có người đã chạm 15+ thì kết thúc ván */
  if (s.endTriggered && s.turnIdx === s.firstPlayerIdx) {
    endGame(s, 'match');
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

  /* ---------- bước chọn quý tộc ---------- */
  if (s.step === 'noble') {
    if (act.type !== 'noble') return { ok: false, reason: 'wrong-step' };
    if (!s.nobleChoices.includes(act.noble)) return { ok: false, reason: 'bad-noble' };
    const noble = nobleById(act.noble);
    if (!noble || !s.nobles.includes(noble.id)) return { ok: false, reason: 'bad-noble' };
    grantNoble(s, p, noble);
    s.nobleChoices = [];
    s.seq++;
    checkDiscard(s, pid);
    return { ok: true };
  }

  /* ---------- bước trả đá thừa ---------- */
  if (s.step === 'discard') {
    if (act.type !== 'discard') return { ok: false, reason: 'wrong-step' };
    if (!Array.isArray(act.colors)) return { ok: false, reason: 'bad-discard' };
    const excess = tokenCount(p) - MAX_TOKENS;
    if (excess <= 0) return { ok: false, reason: 'bad-discard' };
    if (act.colors.length !== excess) return { ok: false, reason: 'bad-discard' };
    const counts = {};
    for (const c of act.colors) {
      if (![...COLORS, GOLD].includes(c)) return { ok: false, reason: 'bad-discard' };
      counts[c] = (counts[c] || 0) + 1;
      if (counts[c] > (p.tokens[c] || 0)) return { ok: false, reason: 'bad-discard' };
    }
    for (const [c, n] of Object.entries(counts)) {
      p.tokens[c] -= n;
      s.tokens[c] += n;
    }
    log(s, `↩️ ${p.name} trả ${act.colors.map(c => GEM_EMOJI[c]).join('')} về ngân hàng (còn 10 đá).`, '');
    s.seq++;
    endTurn(s, pid);
    return { ok: true };
  }

  /* ---------- bước hành động chính ---------- */
  if (act.type === 'take3') {
    if (!Array.isArray(act.colors)) return { ok: false, reason: 'bad-take' };
    const avail = COLORS.filter(c => (s.tokens[c] || 0) > 0);
    const k = Math.min(3, avail.length);
    if (act.colors.length !== k) return { ok: false, reason: 'bad-take' };
    if (new Set(act.colors).size !== act.colors.length) return { ok: false, reason: 'bad-take' };
    for (const c of act.colors) {
      if (!COLORS.includes(c) || (s.tokens[c] || 0) <= 0) return { ok: false, reason: 'bad-take' };
    }
    for (const c of act.colors) { s.tokens[c]--; p.tokens[c]++; }
    log(s, `💎 ${p.name} lấy ${act.colors.map(c => GEM_EMOJI[c]).join('')} (${act.colors.map(c => COLOR_NAME[c]).join(', ')}).`, '');
  } else if (act.type === 'take2') {
    if (!COLORS.includes(act.color)) return { ok: false, reason: 'bad-take' };
    if ((s.tokens[act.color] || 0) < 4) return { ok: false, reason: 'bad-take' };
    s.tokens[act.color] -= 2;
    p.tokens[act.color] += 2;
    log(s, `💎 ${p.name} lấy 2 đá ${COLOR_NAME[act.color]} ${GEM_EMOJI[act.color]}.`, '');
  } else if (act.type === 'reserve') {
    if (p.reserved.length >= MAX_RESERVED) return { ok: false, reason: 'reserve-full' };
    let id = null;
    if (act.from === 'table') {
      if (![1, 2, 3].includes(act.level) || !Number.isInteger(act.slot) || act.slot < 0 || act.slot > 3) return { ok: false, reason: 'bad-slot' };
      id = s.table[act.level][act.slot];
      if (!id) return { ok: false, reason: 'no-card' };
      s.table[act.level][act.slot] = refillSlot(s, act.level);
    } else if (act.from === 'deck') {
      if (![1, 2, 3].includes(act.level)) return { ok: false, reason: 'bad-level' };
      if (!s.decks[act.level].length) return { ok: false, reason: 'empty-deck' };
      id = s.decks[act.level].pop();
    } else {
      return { ok: false, reason: 'bad-from' };
    }
    p.reserved.push(id);
    let gotGold = false;
    if (s.tokens.gold > 0) { s.tokens.gold--; p.tokens.gold++; gotGold = true; }
    const card = cardById(id);
    log(s, `🔒 ${p.name} giữ thẻ cấp ${card.level} (${GEM_NAME(card.bonus)}${card.pts ? ' +' + card.pts + 'đ' : ''})${gotGold ? ' +1 vàng ⭐' : ''}.`, '');
  } else if (act.type === 'buy') {
    let card = null;
    if (act.from === 'table') {
      if (![1, 2, 3].includes(act.level) || !Number.isInteger(act.slot) || act.slot < 0 || act.slot > 3) return { ok: false, reason: 'bad-slot' };
      const id = s.table[act.level][act.slot];
      if (!id || (act.cardId && act.cardId !== id)) return { ok: false, reason: 'no-card' };
      card = cardById(id);
    } else if (act.from === 'reserved') {
      const idx = p.reserved.indexOf(act.cardId);
      if (idx < 0) return { ok: false, reason: 'no-card' };
      card = cardById(act.cardId);
    } else {
      return { ok: false, reason: 'bad-from' };
    }
    const pay = paymentFor(p, card);
    if (!pay) return { ok: false, reason: 'cannot-afford' };
    for (const [c, n] of Object.entries(pay)) {
      p.tokens[c] -= n;
      s.tokens[c] += n;
    }
    if (act.from === 'table') {
      s.table[card.level][act.slot] = refillSlot(s, card.level);
    } else {
      p.reserved.splice(p.reserved.indexOf(card.id), 1);
    }
    p.cards.push(card.id);
    p.score = prestige(p);
    const payTxt = Object.entries(pay).map(([c, n]) => `${n}${GEM_EMOJI[c]}`).join(' ');
    log(s, `💎 ${p.name} mua thẻ cấp ${card.level} (${GEM_NAME(card.bonus)} +${card.pts}đ) — trả ${payTxt}.`, 'win');
  } else if (act.type === 'pass') {
    /* chỉ hợp lệ khi không còn nước nào khác (van an toàn) */
    const others = legalMovesFromView(viewFor(s, pid), pid).filter(m => m.type !== 'pass');
    if (others.length) return { ok: false, reason: 'illegal' };
    log(s, `⏭️ ${p.name} không còn nước đi hợp lệ — bỏ lượt.`, 'info');
  } else {
    return { ok: false, reason: 'illegal' };
  }

  /* chuỗi bỏ lượt: hành động thật thì reset, bỏ lượt thì tăng */
  if (act.type === 'pass') s.passStreak = (s.passStreak || 0) + 1;
  else s.passStreak = 0;
  s.seq++;
  afterMainAction(s, pid);
  return { ok: true };
}

/* tên ngắn của màu thưởng (dùng trong log/UI) */
function GEM_NAME(c) {
  return { W: 'trắng', B: 'xanh', G: 'lá', R: 'đỏ', K: 'đen' }[c] || c;
}

/* ---------- kết thúc ván ---------- */
function endGame(s, cause, resignerId = null) {
  s.phase = 'ended';
  s.endReason = cause === 'resign' ? 'resign' : 'match';
  s.endCause = cause;
  for (const p of s.players) p.score = prestige(p);
  const summary = {};
  for (const p of s.players) {
    summary[p.id] = {
      score: p.score,
      cards: p.cards.length,
      nobles: p.nobles.length,
      gold: p.tokens.gold || 0,
      prestige: p.score,
    };
  }
  /* chọn người thắng: điểm cao nhất; hòa thì ÍT THẺ ĐÃ MUA hơn thắng;
     vẫn hòa thì cùng thắng */
  let best = null;
  for (const p of s.players) {
    if (resignerId && p.id === resignerId) continue;
    const key = [p.score, -p.cards.length];
    if (!best || key[0] > best.key[0] || (key[0] === best.key[0] && key[1] > best.key[1])) {
      best = { key, ids: [p.id] };
    } else if (key[0] === best.key[0] && key[1] === best.key[1]) {
      best.ids.push(p.id);
    }
  }
  s.winners = best ? best.ids : [];
  s.winner = s.winners[0] || null;
  s.losers = s.players.filter(p => !s.winners.includes(p.id)).map(p => p.id);
  s.final = {
    summary,
    scores: s.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
  };
  s.endedAt = Date.now();
  if (cause === 'stalemate') {
    log(s, '🤝 Không ai còn nước đi (bế tắc) — ván kết thúc, người nhiều điểm nhất thắng.', 'info');
  }
  if (s.winners.length) {
    const names = s.winners.map(id => player(s, id).name).join(' + ');
    const bestScore = player(s, s.winners[0]).score;
    log(s, `🏆 ${names} thắng với ${bestScore} điểm!`, 'win');
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
/* Mọi thông tin đều công khai (đá đang cầm, thẻ đã mua/giữ, quý tộc,
   bàn, ngân hàng) — chỉ giấu THỨ TỰ chồng bài (chỉ lộ số thẻ còn).
   Thẻ đã giữ là công khai theo brief. Không có trường `you`. */
export function viewFor(s, pid) {
  const turnPid = s.players[s.turnIdx] ? s.players[s.turnIdx].id : null;
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, round: s.round,
    turn: turnPid, turnCount: s.turnCount,
    step: s.step, nobleChoices: s.nobleChoices.slice(),
    endTriggered: s.endTriggered,
    tokens: Object.assign({}, s.tokens),
    deckCounts: { 1: s.decks[1].length, 2: s.decks[2].length, 3: s.decks[3].length },
    table: { 1: s.table[1].slice(), 2: s.table[2].slice(), 3: s.table[3].slice() },
    nobles: s.nobles.slice(),
    players: s.players.map(pl => ({
      id: pl.id, name: pl.name, isBot: pl.isBot, local: pl.local, level: pl.level,
      tokens: Object.assign({}, pl.tokens),
      cards: pl.cards.slice(), reserved: pl.reserved.slice(),
      nobles: pl.nobles.slice(), score: pl.score,
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
  if (!s || !Array.isArray(s.players) || !s.table || !s.tokens || !s.decks) throw new Error('bad save');
  return s;
}
export default { createGame, applyAction, viewFor, actors, legalMoves };
