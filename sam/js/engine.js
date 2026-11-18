// 🃏 Sâm lốc – thuần logic. 52 lá, 2–5 người, mỗi người 10 lá. Lá c = 0..51: rank = c >> 2 (0 = Át … 12 = K), suit = c & 3. Chất không phân hơn kém.
export const rank = c => c >> 2;
export const suitOf = c => c & 3;
export const SUITS = ['s', 'c', 'd', 'h'], SUIT_CH = ['♠', '♣', '♦', '♥'], RANK_TXT = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const cardTxt = c => RANK_TXT[rank(c)] + SUIT_CH[suitOf(c)];
/* sức mạnh lá lẻ: 3 nhỏ nhất … K, Át, 2 lớn nhất */
export const power = c => (rank(c) + 11) % 13; /* 3→0 … K→10, A→11, 2→12 */
export const sortHand = h => h.slice().sort((a, b) => power(a) - power(b) || suitOf(a) - suitOf(b));
export const HAND = 10, SAM_PAY = 20, CONG_PAY = 15, WHITE_PAY = 20;
export const DEFAULT_OPTS = { sam: true };
export const CHOICES = { sam: [true, false] };
export const optOk = (k, v) => k in CHOICES && CHOICES[k].includes(v);
const shuffle = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* nhận dạng bộ: { t: 'single'|'pair'|'triple'|'four'|'straight', n, top } hoặc null.
   Sảnh: từ 3 lá liên tiếp, Át đi được đầu (A-2-3) hoặc cuối (Q-K-A); 2 chỉ nằm trong sảnh thấp (A-2-3…, 2-3-4…). */
export function combo(cards) {
  const n = cards.length; if (!n) return null; const rs = cards.map(rank);
  if (rs.every(r => r === rs[0])) return n <= 4 ? { t: ['single', 'pair', 'triple', 'four'][n - 1], n, top: power(cards[0]) } : null;
  if (n < 3 || new Set(rs).size !== n) return null;
  const s = rs.slice().sort((a, b) => a - b); /* Át = 0 */
  if (s.every((r, i) => !i || r === s[i - 1] + 1)) return { t: 'straight', n, top: s[n - 1] }; /* sảnh thường, Át thấp: top = rank lá lớn nhất (1..12) */
  if (s[0] === 0 && s.slice(1).every((r, i) => r === 13 - (n - 1) + i)) return { t: 'straight', n, top: 13 }; /* …Q-K-A */
  return null;
}
/* b có chặt được a không (a = bộ đang nằm trên bàn) */
export function beats(a, b) {
  if (!a) return !!b; if (!b) return false;
  if (b.t === 'four' && a.t === 'single' && a.top === 12) return true; /* tứ quý chặt 2 */
  return a.t === b.t && a.n === b.n && b.top > a.top;
}
/* ăn trắng: thắng ngay khi chia bài */
export function white(hand) {
  const cnt = {}; for (const c of hand) cnt[rank(c)] = (cnt[rank(c)] || 0) + 1; const v = Object.values(cnt);
  if (cnt[1] === 4) return 'Tứ quý 2';
  if (combo(hand)) return 'Sảnh rồng';
  if (hand.every(c => suitOf(c) < 2) || hand.every(c => suitOf(c) >= 2)) return 'Đồng màu';
  if (v.filter(x => x >= 3).length === 3) return 'Ba sám cô';
  if (v.reduce((n, x) => n + (x >> 1), 0) === 5) return 'Năm đôi';
  return null;
}
export function createGame(players, opts = {}, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random;
  const o = { ...DEFAULT_OPTS, ...opts }, deck = shuffle([...Array(52).keys()], rnd), n = players.length, first = Math.floor(rnd() * n);
  const s = { gid: Math.random().toString(36).slice(2, 8), seq: 0, phase: 'play', stage: o.sam ? 'sam' : 'play', opts: o, players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot })),
    hands: {}, played: {}, turn: first, first, table: null, tableBy: null, passed: {}, asked: {}, sam: null, last: null, winner: null, result: null };
  players.forEach(p => { s.hands[p.id] = sortHand(deck.splice(0, HAND)); s.played[p.id] = 0; s.passed[p.id] = false; s.asked[p.id] = false; });
  for (let i = 0; i < n; i++) { const p = players[(first + i) % n], w = white(s.hands[p.id]); if (w) { finish(s, p.id, { white: w }); break; } }
  return s;
}
const cur = s => s.players[s.turn].id;
function advance(s) { const n = s.players.length; for (let i = 1; i <= n; i++) { const j = (s.turn + i) % n; if (!s.passed[s.players[j].id]) { s.turn = j; return; } } }
function finish(s, pid, x = {}) {
  s.phase = 'ended'; s.stage = null; s.winner = pid; const chips = {}, n = s.players.length; let pot = 0;
  for (const p of s.players) { if (p.id === pid) continue; let pay;
    if (x.white) pay = WHITE_PAY; else if (x.block) pay = p.id === s.sam ? SAM_PAY * (n - 1) : 0; else if (s.sam === pid) pay = SAM_PAY; else pay = s.played[p.id] ? s.hands[p.id].length : CONG_PAY;
    chips[p.id] = -pay; pot += pay; }
  chips[pid] = pot; s.result = { winner: pid, chips, white: x.white || null, block: !!x.block, sam: s.sam };
}
/* không được về (đánh hết bài) bằng 2 – trừ khi trên tay chỉ còn toàn 2 */
export const badFinish = (hand, cards) => cards.length === hand.length && cards.some(c => rank(c) === 1) && !hand.every(c => rank(c) === 1);
export function canPlay(s, pid, cards) {
  const h = s.hands[pid]; if (!cards || !cards.length || !cards.every(c => h.includes(c)) || new Set(cards).size !== cards.length) return 'Chọn lá trên tay bạn.';
  const cb = combo(cards); if (!cb) return 'Mấy lá này không thành bộ.';
  if (s.table && !beats(s.table.cb, cb)) return 'Không chặt được bài trên bàn.';
  if (badFinish(h, cards)) return 'Không được về bằng 2 – đánh 2 ra trước đi.';
  return null;
}
export function applyAction(s, pid, a) {
  if (s.phase !== 'play' || !a) return { ok: false, reason: 'Ván đã xong.' };
  if (pid !== cur(s)) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  if (s.stage === 'sam') {
    if (a.type !== 'sam' && a.type !== 'skip') return { ok: false, reason: 'Chọn báo Sâm hoặc bỏ qua.' };
    s.seq++; s.asked[pid] = true;
    if (a.type === 'sam') { s.sam = pid; s.stage = 'play'; s.last = { type: 'sam', by: pid }; return { ok: true }; } /* người báo Sâm được đánh trước */
    const n = s.players.length; s.turn = (s.turn + 1) % n; if (s.players.every(p => s.asked[p.id])) { s.stage = 'play'; s.turn = s.first; }
    return { ok: true };
  }
  if (a.type === 'pass') {
    if (!s.table) return { ok: false, reason: 'Bạn đang cầm lượt – phải đánh.' };
    s.seq++; s.passed[pid] = true; s.last = { type: 'pass', by: pid };
    const alive = s.players.filter(p => !s.passed[p.id]);
    if (alive.length === 1 && alive[0].id === s.tableBy) { s.table = null; for (const p of s.players) s.passed[p.id] = false; s.turn = s.players.findIndex(p => p.id === s.tableBy); } else advance(s);
    return { ok: true };
  }
  if (a.type !== 'play') return { ok: false, reason: 'Thao tác lạ.' };
  const err = canPlay(s, pid, a.cards); if (err) return { ok: false, reason: err };
  const cb = combo(a.cards), block = s.sam && s.table && s.tableBy === s.sam && pid !== s.sam;
  s.seq++; s.hands[pid] = s.hands[pid].filter(c => !a.cards.includes(c)); s.played[pid]++; s.table = { cards: sortHand(a.cards), cb }; s.tableBy = pid; s.last = { type: 'play', by: pid, cards: s.table.cards };
  if (block) { finish(s, pid, { block: true }); return { ok: true }; } /* chặn được người báo Sâm: người báo đền cả làng */
  if (!s.hands[pid].length) { finish(s, pid); return { ok: true }; }
  advance(s); if (cur(s) === pid) { s.table = null; for (const p of s.players) s.passed[p.id] = false; } /* mọi người đã bỏ lượt */
  return { ok: true };
}
export const actors = s => (s.phase === 'play' ? [cur(s)] : []);
export function viewFor(s, pid) {
  const inGame = pid in s.hands, ended = s.phase === 'ended';
  return { gid: s.gid, seq: s.seq, phase: s.phase, stage: s.stage, opts: s.opts, players: s.players.map(p => ({ ...p, n: s.hands[p.id].length })), cur: s.phase === 'play' ? cur(s) : null,
    table: s.table, tableBy: s.tableBy, passed: s.passed, sam: s.sam, last: s.last, hand: inGame ? s.hands[pid] : [], spec: !inGame, winner: s.winner, result: s.result, reveal: ended ? s.hands : null };
}
/* liệt kê mọi bộ đánh được từ tay (bot + gợi ý dùng) */
export function allCombos(hand) {
  const by = {}; for (const c of sortHand(hand)) (by[rank(c)] = by[rank(c)] || []).push(c); const out = [];
  for (const cs of Object.values(by)) for (let k = 1; k <= cs.length; k++) out.push(cs.slice(0, k));
  const seqs = [[...Array(13).keys()], [...Array(13).keys()].slice(1).concat(0)].map(o => o); /* thứ tự Át thấp, rồi Át cao (2..K,A) */
  for (const [oi, order] of seqs.entries()) for (let i = 0; i < 13; i++) for (let len = 3; i + len <= 13; len++) {
    const rs = order.slice(i, i + len); if (!rs.every(r => by[r])) break; if (oi === 1 && !(rs[len - 1] === 0 && rs[0] >= 13 - len + 1 - 0 && rs[0] !== 1 && !rs.includes(1))) continue;
    const cards = rs.map(r => by[r][0]); if (combo(cards)) out.push(cards);
  }
  const seen = new Set(); return out.filter(cs => { const k = sortHand(cs).join(','); if (seen.has(k)) return false; seen.add(k); return true; });
}
