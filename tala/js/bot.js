// 🤖 Bot Tá lả – chỉ dùng bài của chính nó + thông tin công khai (lá vừa đánh, bài rác, lá đã ăn, số lá).
import { arrange, canEat, canDiscard, uCard, offer, pts, rank, suit } from './engine.js?v=2';
/* một lá "có triển vọng" nếu trên tay còn lá cùng số hoặc liền kề cùng chất (cạ) */
const hope = (h, c) => h.some(x => x !== c && (rank(x) === rank(c) || (suit(x) === suit(c) && Math.abs(rank(x) - rank(c)) <= 2)));
export function botAction(s, pid) {
  const h = s.hands[pid], e = s.eaten[pid];
  if (s.stage === 'draw') {
    const c = offer(s);
    if (c != null && canEat(h, e, c)) { const before = arrange(h, e), after = arrange([...h, c], [...e, c]); if (!before || after.left <= before.left + pts(c) / 2) return { type: 'eat' }; }
    return s.deck.length ? { type: 'draw' } : (c != null && canEat(h, e, c) ? { type: 'eat' } : null);
  }
  if (uCard(h, e) != null) return { type: 'u' };
  const last = s.turns[pid] >= s.opts.turns - 1; let best = null, bv = Infinity;
  for (const c of h) {
    if (!canDiscard(h, e, c)) continue; const a = arrange(h.filter(x => x !== c), e);
    /* giữ phỏm, bỏ lá lẻ điểm cao; chưa tới lượt cuối thì giữ lại cạ */
    const v = a.left - (last ? 0 : 0) + (hope(h, c) && !last ? 6 : 0) - pts(c) * .01; if (v < bv) { bv = v; best = c; }
  }
  return best == null ? null : { type: 'discard', card: best };
}
