// 🤖 Bot Sâm lốc – chỉ dùng bài của chính nó + bài trên bàn + số lá của người khác (công khai).
import { allCombos, combo, beats, power, rank, badFinish } from './engine.js?v=1';
export function botAction(s, pid) {
  const h = s.hands[pid];
  if (s.stage === 'sam') { const twos = h.filter(c => rank(c) === 1).length, big = h.filter(c => power(c) >= 10).length; return { type: twos >= 3 && big >= 8 ? 'sam' : 'skip' }; }
  const minOther = Math.min(...s.players.filter(p => p.id !== pid).map(p => s.hands[p.id].length)); /* chỉ đọc SỐ lá – thông tin công khai */
  const opts = allCombos(h).map(cs => ({ cs, cb: combo(cs) })).filter(o => o.cb && (!s.table || beats(s.table.cb, o.cb)) && !badFinish(h, o.cs));
  if (!opts.length) return s.table ? { type: 'pass' } : { type: 'play', cards: [h[0]] };
  if (opts.some(o => o.cs.length === h.length)) return { type: 'play', cards: opts.find(o => o.cs.length === h.length).cs };
  if (!s.table) { /* cầm lượt: ưu tiên bộ nhiều lá, nhỏ trước; ai sắp hết bài thì đánh lá lẻ to */
    const multi = opts.filter(o => o.cs.length > 1 && o.cb.t !== 'four').sort((a, b) => b.cs.length - a.cs.length || a.cb.top - b.cb.top);
    if (multi.length && multi[0].cb.top < 11) return { type: 'play', cards: multi[0].cs };
    const singles = opts.filter(o => o.cb.t === 'single').sort((a, b) => a.cb.top - b.cb.top);
    return { type: 'play', cards: (minOther === 1 ? singles[singles.length - 1] : singles[0]).cs };
  }
  const best = opts.filter(o => o.cb.t !== 'four' || s.table.cb.top === 12 || s.table.cb.t === 'four').sort((a, b) => a.cb.top - b.cb.top)[0];
  if (!best) return { type: 'pass' };
  if (best.cb.top >= 12 && h.length > 4 && minOther > 2 && Math.random() < .5) return { type: 'pass' }; /* giữ 2 lại khi chưa gấp */
  return { type: 'play', cards: best.cs };
}
