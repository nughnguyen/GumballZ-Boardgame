// 🃏 Bài Tấn (Tú lơ khơ kiểu "tấn – đỡ") – luật, thuần logic. Phòng/mạng dùng shared/net/simplenet.js.
// Lá bài là số 0..51: hạng = c >> 2 (0 = lá 2 … 12 = Át), chất = c & 3 (0 ♠, 1 ♣, 2 ♦, 3 ♥).
export const rank = c => c >> 2, suit = c => c & 3;
export const SUITS = ['s', 'c', 'd', 'h'], SUIT_CH = ['♠', '♣', '♦', '♥'], RANK_TXT = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const cardTxt = c => RANK_TXT[rank(c)] + SUIT_CH[suit(c)];
export const DEFAULT_OPTS = { hand: 8, adders: 'all', team: false };
export const CHOICES = { hand: [6, 8], adders: ['all', 'side'], team: [false, true] }; /* adders: ai được tấn thêm – 'all' mọi người, 'side' chỉ 2 người ngồi cạnh người đỡ */
export const optOk = (k, v) => k in CHOICES && CHOICES[k].includes(v);
export const MAX_ATT = 6; /* tối đa 6 lá tấn trong một lượt */

const shuffle = (a, rnd = Math.random) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const beats = (d, a, trump) => suit(d) === suit(a) ? rank(d) > rank(a) : suit(d) === trump; /* lá d có đỡ được lá a không */
export const sortHand = (h, trump) => h.slice().sort((x, y) => (suit(x) === trump) - (suit(y) === trump) || rank(x) - rank(y) || suit(x) - suit(y));

export function createGame(players, opts, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random;
  const o = { ...DEFAULT_OPTS, ...opts }; if (players.length !== 4) o.team = false; /* chéo cánh chỉ chơi được khi đủ 4 người */
  if (players.length * o.hand > 48) o.hand = 6;
  const deck = shuffle([...Array(52).keys()], rnd), hands = {};
  for (const p of players) hands[p.id] = deck.splice(0, o.hand);
  const trumpCard = deck[deck.length - 1]; /* lá chủ nằm dưới đáy, bốc sau cùng */
  const s = { gid: Math.random().toString(36).slice(2, 8), seq: 0, phase: 'play', opts: o, players: players.map((p, i) => ({ id: p.id, name: p.name, isBot: !!p.isBot, team: o.team ? i % 2 : null })),
    hands, deck, trumpCard, trump: suit(trumpCard), table: [], passed: [], out: [], loser: null, draw: false, bout: 0, last: null, att: null, def: null, cap: 0 };
  /* người cầm lá chủ nhỏ nhất đi trước; không ai có chủ thì người đầu bàn */
  let first = players[0].id, low = 99, lowCard = null;
  for (const p of players) for (const c of hands[p.id]) if (suit(c) === s.trump && rank(c) < low) { low = rank(c); first = p.id; lowCard = c; }
  setTurn(s, first);
  /* 🎯 công bố lượt đầu: ai tấn trước + vì sao (lá chủ nhỏ nhất / không ai có chủ) */
  s.firstInfo = { att: first, def: s.def, card: lowCard, reason: lowCard == null ? 'seat0' : 'trump' };
  return s;
}
const active = s => s.players.filter(p => !s.out.includes(p.id)).map(p => p.id);
const teamOf = (s, id) => (s.players.find(p => p.id === id) || {}).team;
function nextFrom(s, id, skipSelf = true) { /* người còn chơi kế tiếp theo vòng (tính từ id) */
  const ids = s.players.map(p => p.id), n = ids.length, i = ids.indexOf(id);
  for (let k = skipSelf ? 1 : 0; k <= n; k++) { const x = ids[(i + k) % n]; if (!s.out.includes(x)) return x; }
  return null;
}
function setTurn(s, att) {
  s.att = nextFrom(s, att, false); let d = nextFrom(s, s.att);
  if (s.opts.team) { let g = 0; while (d && d !== s.att && teamOf(s, d) === teamOf(s, s.att) && g++ < 4) d = nextFrom(s, d); } /* chéo cánh: không tấn đồng đội */
  s.def = d; s.table = []; s.passed = []; s.cap = Math.min(MAX_ATT, s.def ? s.hands[s.def].length : 0); s.bout++;
}
export function canAdd(s, pid) { /* pid có quyền tấn / tấn thêm lúc này không */
  if (s.phase !== 'play' || pid === s.def || s.out.includes(pid) || !s.hands[pid] || !s.hands[pid].length) return false;
  if (!s.table.length) return pid === s.att;
  if (s.opts.team) return teamOf(s, pid) !== teamOf(s, s.def);
  if (pid === s.att || s.opts.adders === 'all') return true;
  const ids = active(s), i = ids.indexOf(s.def), n = ids.length;
  return ids[(i + 1) % n] === pid || ids[(i - 1 + n) % n] === pid;
}
const tableRanks = s => { const r = new Set(); for (const t of s.table) { r.add(rank(t.a)); if (t.d != null) r.add(rank(t.d)); } return r; };
const openN = s => s.table.filter(t => t.d == null).length;
export function room(s) { return Math.min(s.cap - s.table.length, s.hands[s.def].length - openN(s)); } /* còn tấn thêm được mấy lá */
export function legalAttack(s, pid, cards) {
  if (!canAdd(s, pid) || !Array.isArray(cards) || !cards.length) return 'Chưa tới lượt tấn.';
  const h = s.hands[pid]; if (new Set(cards).size !== cards.length || cards.some(c => !h.includes(c))) return 'Lá bài không hợp lệ.';
  if (cards.length > room(s)) return s.table.length ? 'Người đỡ không còn đủ bài để đỡ thêm.' : `Chỉ được tấn tối đa ${room(s)} lá.`;
  if (!s.table.length) { if (cards.some(c => rank(c) !== rank(cards[0]))) return 'Tấn nhiều lá thì phải cùng số.'; }
  else { const r = tableRanks(s); if (cards.some(c => !r.has(rank(c)))) return 'Chỉ tấn thêm được lá cùng số với lá đang nằm trên bàn.'; }
  return null;
}
function drawUp(s, order) { for (const id of order) { const h = s.hands[id]; while (h.length < s.opts.hand && s.deck.length) h.push(s.deck.shift()); } }
function endBout(s, took) {
  const cards = s.table.flatMap(t => t.d != null ? [t.a, t.d] : [t.a]), def = s.def, att = s.att;
  if (took) s.hands[def].push(...cards);
  s.last = { res: took ? 'take' : 'beat', def, n: cards.length, bout: s.bout };
  /* bốc bù: người tấn trước, rồi theo vòng, người đỡ sau cùng */
  const order = [att]; let x = nextFrom(s, att); let g = 0; while (x && x !== att && g++ < 8) { if (x !== def) order.push(x); x = nextFrom(s, x); } order.push(def);
  drawUp(s, order);
  /* hết bài nọc mà sạch tay = về đích */
  if (!s.deck.length) for (const id of order) if (!s.hands[id].length && !s.out.includes(id)) s.out.push(id);
  const left = active(s);
  const teamDone = s.opts.team && [0, 1].some(t => s.players.filter(p => p.team === t).every(p => s.out.includes(p.id)));
  if (left.length <= 1 || teamDone) {
    s.phase = 'ended'; s.table = []; s.passed = []; s.att = s.def = null;
    if (s.opts.team) { const wt = [0, 1].find(t => s.players.filter(p => p.team === t).every(p => s.out.includes(p.id))); s.winTeam = wt == null ? null : wt; s.loser = null; s.winner = null; }
    else { s.loser = left[0] || null; s.winner = s.out[0] || null; } /* không còn ai cầm bài = hoà, không ai thua */
    return;
  }
  /* đỡ được thì người đỡ đi tiếp; bốc bài thì mất lượt */
  setTurn(s, took ? nextFrom(s, def) : (s.out.includes(def) ? nextFrom(s, def) : def));
}
const settled = s => s.table.length && !openN(s) && (room(s) <= 0 || s.players.every(p => !canAdd(s, p.id) || s.passed.includes(p.id)));
export function applyAction(s, pid, a) {
  if (!s || s.phase !== 'play') return { ok: false, reason: 'Ván đã xong.' };
  if (a.type === 'attack') {
    const err = legalAttack(s, pid, a.cards); if (err) return { ok: false, reason: err };
    for (const c of a.cards) { s.hands[pid].splice(s.hands[pid].indexOf(c), 1); s.table.push({ a: c, d: null, by: pid }); }
    s.passed = s.passed.filter(x => x !== pid);
  } else if (a.type === 'defend') {
    if (pid !== s.def) return { ok: false, reason: 'Bạn không phải người đỡ.' };
    const t = s.table[a.i], h = s.hands[pid];
    if (!t || t.d != null || !h.includes(a.card)) return { ok: false, reason: 'Không đỡ được lá đó.' };
    if (!beats(a.card, t.a, s.trump)) return { ok: false, reason: 'Phải đỡ bằng lá cùng chất lớn hơn, hoặc lá chủ.' };
    h.splice(h.indexOf(a.card), 1); t.d = a.card; s.passed = []; /* có số mới trên bàn → mọi người được nghĩ lại */
  } else if (a.type === 'take') {
    if (pid !== s.def || !openN(s)) return { ok: false, reason: 'Chưa có gì để bốc.' };
    endBout(s, true); s.seq++; return { ok: true };
  } else if (a.type === 'pass') {
    if (!s.table.length || !canAdd(s, pid)) return { ok: false, reason: 'Chưa cho qua được.' };
    if (!s.passed.includes(pid)) s.passed.push(pid);
  } else return { ok: false, reason: 'Không hiểu nước đi.' };
  /* người đỡ hết bài hoặc mọi người đã thôi tấn → xong lượt */
  if (!openN(s) && s.table.length && (!s.hands[s.def].length || settled(s))) endBout(s, false);
  s.seq++; return { ok: true };
}
export function actors(s) { /* ai đang phải làm gì (hẹn bot / người rớt mạng) */
  if (s.phase !== 'play') return [];
  if (openN(s)) return [s.def];
  return s.players.map(p => p.id).filter(id => canAdd(s, id) && !s.passed.includes(id));
}
export function viewFor(s, pid) {
  const { hands, deck, ...v } = s;
  return { ...v, deckN: deck.length, hand: hands[pid] ? sortHand(hands[pid], s.trump) : [], room: s.phase === 'play' ? room(s) : 0,
    players: s.players.map(p => ({ ...p, n: hands[p.id].length })), reveal: s.phase === 'ended' ? hands : null };
}
