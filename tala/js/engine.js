// 🀄 Tá lả (Phỏm) – luật, thuần logic. Phòng/mạng dùng shared/net/simplenet.js.
// Lá bài là số 0..51: hạng = c >> 2 (0 = Át … 12 = K), chất = c & 3 (0 ♠, 1 ♣, 2 ♦, 3 ♥). Điểm = hạng + 1 (Át 1 điểm, K 13 điểm).
// Phỏm: 3–4 lá cùng số, hoặc từ 3 lá liên tiếp cùng chất (Q-K-A không tính). Mỗi người đánh 4 lượt; lượt cuối tự hạ phỏm, gửi bài rồi tính điểm – ít điểm nhất thắng.
export const rank = c => c >> 2, suit = c => c & 3, pts = c => (c >> 2) + 1;
export const SUITS = ['s', 'c', 'd', 'h'], SUIT_CH = ['♠', '♣', '♦', '♥'], RANK_TXT = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const cardTxt = c => RANK_TXT[rank(c)] + SUIT_CH[suit(c)];
export const DEFAULT_OPTS = { turns: 4 };
export const CHOICES = { turns: [4, 3] };
export const optOk = (k, v) => k in CHOICES && CHOICES[k].includes(v);
const shuffle = (a, rnd = Math.random) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const sortHand = h => h.slice().sort((x, y) => rank(x) - rank(y) || suit(x) - suit(y));
const sum = cs => cs.reduce((n, c) => n + pts(c), 0);

// mọi phỏm có thể tạo từ một tập lá
function candidates(cards) {
  const out = [], byR = {}, byS = [[], [], [], []];
  for (const c of cards) { (byR[rank(c)] = byR[rank(c)] || []).push(c); byS[suit(c)].push(c); }
  for (const r in byR) { const g = byR[r]; if (g.length >= 3) { if (g.length === 4) { out.push(g.slice()); for (let i = 0; i < 4; i++) out.push(g.filter((_, k) => k !== i)); } else out.push(g.slice()); } }
  for (const g of byS) { g.sort((x, y) => rank(x) - rank(y)); for (let i = 0; i < g.length; i++) { let j = i; while (j + 1 < g.length && rank(g[j + 1]) === rank(g[j]) + 1) { j++; if (j - i >= 2) out.push(g.slice(i, j + 1)); } } }
  return out;
}
// xếp phỏm tốt nhất: mọi lá trong `must` (lá đã ăn) phải nằm trong phỏm, mỗi phỏm chứa tối đa 1 lá ăn. Trả { melds, rest, left } hoặc null nếu không xếp được.
export function arrange(cards, must = []) {
  const cand = candidates(cards).filter(m => m.filter(c => must.includes(c)).length <= 1), total = sum(cards); let best = null;
  (function go(i, used, melds, cov) {
    if (must.every(c => used.has(c))) { const left = total - cov; if (!best || left < best.left || (left === best.left && melds.length > best.melds.length)) best = { melds: melds.map(m => m.slice()), left }; }
    for (let k = i; k < cand.length; k++) { const m = cand[k]; if (m.some(c => used.has(c))) continue; for (const c of m) used.add(c); melds.push(m); go(k + 1, used, melds, cov + sum(m)); melds.pop(); for (const c of m) used.delete(c); }
  })(0, new Set(), [], 0);
  if (!best) return null;
  const inM = new Set(best.melds.flat()); best.rest = cards.filter(c => !inM.has(c)); return best;
}
export const canEat = (hand, eaten, card) => { const a = arrange([...hand, card], [...eaten, card]); return !!a && a.melds.some(m => m.includes(card)); };
/* được đánh lá c không: không phải lá đã ăn, và đánh đi rồi các lá đã ăn vẫn còn nằm trong phỏm */
export const canDiscard = (hand, eaten, c) => hand.includes(c) && !eaten.includes(c) && !!arrange(hand.filter(x => x !== c), eaten);
/* ù: sau khi bỏ 1 lá (hoặc không cần bỏ) thì mọi lá còn lại đều nằm trong phỏm */
export function uCard(hand, eaten) {
  const all = arrange(hand, eaten); if (all && !all.rest.length) return -1;
  for (const c of hand) { if (eaten.includes(c)) continue; const a = arrange(hand.filter(x => x !== c), eaten); if (a && !a.rest.length && a.melds.length) return c; }
  return null;
}
/* gửi lá c vào một phỏm đã hạ được không */
export function fits(meld, c) {
  if (meld.every(x => rank(x) === rank(meld[0])) && !(meld.length >= 3 && suit(meld[0]) === suit(meld[1]))) return rank(c) === rank(meld[0]) && meld.length < 4;
  const s = suit(meld[0]), rs = meld.map(rank).sort((a, b) => a - b); return suit(c) === s && (rank(c) === rs[0] - 1 || rank(c) === rs[rs.length - 1] + 1);
}

export function createGame(players, opts = {}, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random;
  const o = { ...DEFAULT_OPTS, ...opts }, deck = shuffle([...Array(52).keys()], rnd), n = players.length, first = Math.floor(rnd() * n);
  const s = { gid: Math.random().toString(36).slice(2, 8), seq: 0, phase: 'play', opts: o, players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot })),
    hands: {}, eaten: {}, piles: {}, laid: {}, sent: {}, done: {}, turns: {}, deck: null, turn: first, first, stage: 'discard', last: null, u: null, result: null, log: [] };
  players.forEach((p, i) => { s.hands[p.id] = deck.splice(0, i === first ? 10 : 9); s.eaten[p.id] = []; s.piles[p.id] = []; s.laid[p.id] = null; s.sent[p.id] = []; s.turns[p.id] = 0; });
  s.deck = deck; return s;
}
const cur = s => s.players[s.turn];
const prevOf = s => s.players[(s.turn - 1 + s.players.length) % s.players.length];
/* lá vừa đánh của người ngồi trước (chỉ lá trên cùng, và chỉ khi họ vừa đánh ở lượt liền trước) */
export const offer = s => (s.last && s.last.by === prevOf(s).id && s.stage === 'draw' ? s.last.card : null);
function settle(s, pid) { /* hạ phỏm + gửi bài (tự động chọn cách ít điểm nhất) */
  const a = arrange(s.hands[pid], s.eaten[pid]) || { melds: [], rest: s.hands[pid].slice() };
  s.laid[pid] = a.melds; let rest = a.rest.slice();
  if (a.melds.length) { /* có phỏm mới được gửi: gửi vào phỏm của người đã hạ trước (và của mình) */
    let moved = true; while (moved) { moved = false;
      for (const q of s.players) { const L = s.laid[q.id]; if (!L) continue; for (const m of L) { const c = rest.slice().sort((x, y) => pts(y) - pts(x)).find(c => fits(m, c)); if (c != null) { m.push(c); m.sort((x, y) => rank(x) - rank(y)); rest = rest.filter(x => x !== c); s.sent[pid].push({ c, to: q.id }); moved = true; } } } }
  }
  s.hands[pid] = rest; s.done[pid] = { mom: !a.melds.length, pts: sum(rest) };
}
function finish(s, uBy = null) {
  for (const p of s.players) if (!s.done[p.id]) settle(s, p.id);
  const order = s.players.map((p, i) => ({ id: p.id, ...s.done[p.id], seat: (i - s.first + s.players.length) % s.players.length }))
    .sort((a, b) => (a.id === uBy ? -1 : b.id === uBy ? 1 : 0) || a.mom - b.mom || a.pts - b.pts || a.seat - b.seat); /* ù thắng trước; móm xếp cuối; bằng điểm thì ai hạ trước xếp trên */
  /* xu ảo cho vui: ù ăn mỗi nhà 5; còn lại nhì 1, ba 2, bét 3, móm 4 */
  const chips = {}; order.forEach(o => { chips[o.id] = 0; });
  order.slice(1).forEach((o, i) => { const pay = uBy ? 5 : o.mom ? 4 : i + 1; chips[o.id] -= pay; chips[order[0].id] += pay; });
  s.phase = 'ended'; s.stage = 'over'; s.u = uBy; s.result = { order: order.map(o => o.id), chips, done: s.done }; s.winner = order[0].id;
}
function next(s) {
  if (s.players.every(p => s.turns[p.id] >= s.opts.turns)) return finish(s);
  s.turn = (s.turn + 1) % s.players.length; s.stage = 'draw';
  if (!s.deck.length && offer(s) == null) return finish(s);
}
export function applyAction(s, pid, a) {
  if (!s || s.phase !== 'play') return { ok: false, reason: 'Ván đã xong.' };
  if (cur(s).id !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  const h = s.hands[pid], e = s.eaten[pid];
  if (a.type === 'eat') {
    const c = offer(s); if (c == null) return { ok: false, reason: 'Không có lá nào để ăn.' };
    if (!canEat(h, e, c)) return { ok: false, reason: 'Lá này không ghép được thành phỏm với bài của bạn.' };
    const from = s.last.by; s.piles[from].pop(); h.push(c); e.push(c); s.last = { by: from, card: null, eatenBy: pid, ate: c }; s.stage = 'discard';
  } else if (a.type === 'draw') {
    if (s.stage !== 'draw') return { ok: false, reason: 'Bạn đã bốc rồi – đánh một lá đi.' };
    if (!s.deck.length) return { ok: false, reason: 'Hết nọc rồi.' };
    h.push(s.deck.pop()); s.stage = 'discard';
  } else if (a.type === 'u') {
    if (s.stage !== 'discard') return { ok: false, reason: 'Bốc hoặc ăn trước đã.' };
    const c = uCard(h, e); if (c == null) return { ok: false, reason: 'Chưa ù được: còn lá lẻ ngoài phỏm.' };
    if (c >= 0) { h.splice(h.indexOf(c), 1); s.piles[pid].push(c); }
    finish(s, pid);
  } else if (a.type === 'discard') {
    if (s.stage !== 'discard') return { ok: false, reason: 'Bốc bài hoặc ăn trước đã.' };
    const c = a.card | 0; if (!h.includes(c)) return { ok: false, reason: 'Bạn không có lá đó.' };
    if (e.includes(c)) return { ok: false, reason: 'Lá đã ăn phải giữ lại trong phỏm.' };
    if (!canDiscard(h, e, c)) return { ok: false, reason: 'Đánh lá này thì phỏm có lá ăn sẽ bị vỡ.' };
    h.splice(h.indexOf(c), 1); s.piles[pid].push(c); s.turns[pid]++; s.last = { by: pid, card: c };
    if (s.turns[pid] >= s.opts.turns) settle(s, pid); /* lượt cuối: hạ phỏm, gửi bài */
    next(s);
  } else return { ok: false, reason: 'Không hiểu.' };
  s.seq++; return { ok: true };
}
export const actors = s => (s.phase === 'play' ? [cur(s).id] : []);
export function viewFor(s, pid) {
  const { hands, deck, ...v } = s, mine = hands[pid], my = s.phase === 'play' && cur(s).id === pid, c = offer(s);
  return { ...v, deckN: deck.length, hand: mine ? sortHand(mine) : [], cur: s.phase === 'play' ? cur(s).id : null, offer: c,
    canEat: !!(my && c != null && mine && canEat(mine, s.eaten[pid], c)), canU: !!(my && s.stage === 'discard' && mine && uCard(mine, s.eaten[pid]) != null),
    players: s.players.map(p => ({ ...p, n: hands[p.id].length })), reveal: s.phase === 'ended' ? hands : null };
}
