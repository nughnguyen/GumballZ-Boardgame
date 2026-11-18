// 🤖 Bot Tứ sắc – chỉ dùng bài của chính nó + các cách ăn mà luật cho phép với lá đang lật giữa bàn.
import { minLeft, rank, type } from './engine.js?v=1';
/* lá càng "có bạn" trên tay (cùng loại, cùng nhóm lẻ, tốt khác màu) thì càng nên giữ */
function hope(h, c) { const t = type(c), r = t % 7, base = t - r; let n = h.filter(x => x !== c && type(x) === t).length * 3; if (r < 6) { const g = r < 3 ? [0, 1, 2] : [3, 4, 5]; n += g.filter(x => x !== r && h.some(y => type(y) === base + x)).length; } else n += [6, 13, 20, 27].filter(x => x !== t && h.some(y => type(y) === x)).length; return n; }
export function botAction(s, pid) {
  const h = s.hands[pid];
  if (s.stage === 'discard') {
    let best = null, bv = Infinity; const seen = new Set();
    for (const c of h) { if (seen.has(type(c))) continue; seen.add(type(c)); if (rank(c) === 0 && h.some(x => rank(x) !== 0)) continue; const v = minLeft(h.filter(x => x !== c)) * 10 + hope(h, c); if (v < bv) { bv = v; best = c; } }
    return { type: 'discard', card: best };
  }
  const q = s.queue[0]; if (!q || q.pid !== pid) return null;
  let wi = -1; q.opts.forEach((o, i) => { if (o.win && (wi < 0 || o.pts > q.opts[wi].pts)) wi = i; }); if (wi >= 0) return { type: 'take', i: wi };
  const now = minLeft(h); let bi = -1, bv = Infinity;
  q.opts.forEach((o, i) => { const v = minLeft(h.filter(x => !o.use.includes(x))) - (o.k === 'quan' ? .6 : o.k === 'khap' ? .4 : o.k === 'tot4' ? .3 : 0); if (v <= now && v < bv) { bv = v; bi = i; } });
  return bi >= 0 ? { type: 'take', i: bi } : { type: 'pass' };
}
