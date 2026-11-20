// 🤖 Máy chơi Tàu Xuyên Việt: chỉ dùng bài + vé của chính nó và những gì cả bàn thấy (tuyến đã xây, thẻ ngửa). Không nhìn bài hay vé của ai.
import { ROUTES, TICKETS, shortest } from './map.js?v=4';
import { payOptions, ticketDone, curId, routeFree } from './engine.js?v=4';
export function botAction(s, pid, _p, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random;
  const p = s.players.find(x => x.id === pid); if (!p || s.phase === 'ended') return null;
  if (p.offer) { /* giữ vé: đầu ván giữ 2 vé (mức khó giữ cả 3 nếu vé ngắn), giữa ván giữ vé ít điểm nhất */
    const by = [...p.offer].sort((a, b) => TICKETS[a].pts - TICKETS[b].pts);
    return { type: 'keep', ids: p.need >= 2 ? (s.opts.level >= 3 ? by.slice(-2) : by.slice(0, 2)) : by.slice(0, 1) };
  }
  if (s.phase !== 'play' || curId(s) !== pid) return null;
  const ok = r => routeFree(s, r.id, pid) || s.owner[r.id] === pid, cost = r => (s.owner[r.id] === pid ? 0 : r.n);
  /* các tuyến còn cần để hoàn thành vé đang dở */
  const want = new Map();
  for (const id of p.tickets) { if (ticketDone(s, pid, id)) continue; const t = TICKETS[id], sp = shortest(t.a, t.b, ok, cost); if (!sp) continue; for (const rid of sp.path) if (routeFree(s, rid, pid)) want.set(rid, (want.get(rid) || 0) + t.pts); }
  const can = r => r.n <= p.trains && payOptions(p.hand, r).length > 0;
  if (!s.drawn) {
    let pool = [...want.keys()].map(id => ROUTES[id]).filter(can);
    if (!pool.length && (!want.size || p.hand.length >= 10 || s.finalLeft >= 0 || s.deck.length + s.discard.length < 6)) pool = ROUTES.filter(r => routeFree(s, r.id, pid) && can(r)); /* hết việc theo vé / bài đầy tay / sắp hết ván: xây tuyến nào ăn điểm nhất */
    if (pool.length && (s.opts.level > 1 || rnd() < 0.7)) { const r = pool.sort((a, b) => b.n - a.n || (want.get(b.id) || 0) - (want.get(a.id) || 0))[0], o = payOptions(p.hand, r).sort((a, b) => a.locos - b.locos)[0]; return { type: 'claim', route: r.id, color: o.color }; }
    if (!want.size && s.opts.level >= 2 && p.trains > 12 && s.tk.length && p.tickets.length < 5 && s.finalLeft < 0) return { type: 'tickets' };
  }
  /* bốc thẻ: ưu tiên màu của tuyến đang cần, không thì bốc chồng úp */
  const colors = new Set([...want.keys()].map(id => ROUTES[id].c)); let i = s.up.findIndex(c => c !== 'L' && colors.has(c));
  if (i < 0 && !s.drawn && s.opts.level >= 2) i = s.up.indexOf('L');
  if (i >= 0 && !(s.up[i] === 'L' && s.drawn)) return { type: 'up', i };
  if (s.deckN !== 0 && (s.deck.length || s.discard.length)) return { type: 'deck' };
  const j = s.up.findIndex(c => c !== 'L' || !s.drawn); if (j >= 0) return { type: 'up', i: j };
  const any = ROUTES.filter(r => routeFree(s, r.id, pid) && can(r))[0]; if (any && !s.drawn) return { type: 'claim', route: any.id, color: payOptions(p.hand, any)[0].color };
  return { type: 'pass' }; /* hết thẻ để bốc mà không xây được gì: bỏ lượt */
}
