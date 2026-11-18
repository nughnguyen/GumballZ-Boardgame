// 🤖 Máy chơi Nối từ: chỉ dùng từ điển chung + những từ đã ra trong ván (thông tin công khai). Mức 1 hay bí, mức 2 nối đều tay, mức 3 thích đưa từ khó nối.
import { nexts, tailOf, curId } from './engine.js?v=16';
export function botAction(s, pid, _p, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random;
  if (s.phase !== 'play' || curId(s) !== pid) return null;
  const lv = s.opts.level, cand = nexts(tailOf(s.word), s.used);
  if (!cand.length || rnd() < (lv <= 1 ? 0.22 : lv === 2 ? 0.07 : 0.02)) return { type: 'pass' };
  if (lv >= 3) { const sc = cand.map(w => [w, nexts(tailOf(w), s.used).length]).sort((a, b) => a[1] - b[1]); const top = sc.slice(0, Math.max(1, Math.ceil(sc.length * 0.25))); return { type: 'word', text: top[Math.floor(rnd() * top.length)][0] }; }
  const easy = cand.filter(w => nexts(tailOf(w), s.used).length >= 3); const pool = lv <= 1 && easy.length ? easy : cand; /* mức dễ nhường đường cho người sau */
  return { type: 'word', text: pool[Math.floor(rnd() * pool.length)] };
}
