// 🤖 Bot Bài Tấn – chỉ dùng bài của chính nó + thông tin công khai (bàn, lá chủ, số lá của mỗi người, số lá nọc).
import { rank, suit, beats, canAdd, room } from './engine.js?v=2';
const cost = (c, trump) => rank(c) + (suit(c) === trump ? 13 : 0); /* lá càng "đắt" càng nên giữ */
export function botAction(s, pid) {
  const h = s.hands[pid], T = s.trump, late = s.deck.length === 0;
  if (pid === s.def) {
    const open = s.table.map((t, i) => ({ t, i })).filter(x => x.t.d == null); if (!open.length) return null;
    /* đỡ lá khó nhất trước; không đỡ nổi một lá nào thì bốc */
    const plan = []; const left = h.slice();
    for (const { t, i } of open.sort((x, y) => cost(y.t.a, T) - cost(x.t.a, T))) {
      const opt = left.filter(c => beats(c, t.a, T)).sort((x, y) => cost(x, T) - cost(y, T))[0];
      if (opt == null) return { type: 'take' };
      left.splice(left.indexOf(opt), 1); plan.push({ i, card: opt });
    }
    /* đầu ván mà phải tốn quá nhiều lá chủ thì bốc cho lành */
    const spend = plan.filter(p => suit(p.card) === T).length;
    if (!late && spend >= 2 && plan.length >= 3 && s.deck.length > 8) return { type: 'take' };
    return { type: 'defend', i: plan[0].i, card: plan[0].card };
  }
  if (!canAdd(s, pid)) return null;
  const r = room(s);
  if (!s.table.length) { /* mở đầu: lá rẻ nhất, có đôi/ba cùng số (không phải chủ) thì đánh luôn */
    const low = h.slice().sort((x, y) => cost(x, T) - cost(y, T))[0];
    const same = h.filter(c => rank(c) === rank(low) && (suit(c) !== T || late)).slice(0, Math.max(1, r));
    return { type: 'attack', cards: same.includes(low) ? same : [low] };
  }
  if (r <= 0) return { type: 'pass' };
  const ranks = new Set(); for (const t of s.table) { ranks.add(rank(t.a)); if (t.d != null) ranks.add(rank(t.d)); }
  const defN = s.hands[s.def].length; /* số lá của người đỡ là thông tin công khai */
  const add = h.filter(c => ranks.has(rank(c)) && (suit(c) !== T ? (late || rank(c) < 10 || defN <= 3) : (late && defN <= 2))).sort((x, y) => cost(x, T) - cost(y, T));
  return add.length ? { type: 'attack', cards: [add[0]] } : { type: 'pass' };
}
