// 🤖 Máy cho Gánh Xiếc Thú – chỉ dùng thông tin công khai (sân khấu, bộ bài, chợ); không nhìn chồng chợ còn úp.
import * as E from './engine.js?v=1';
const { TOONS } = E;
/* giá trị ước lượng của một con thú khi thêm vào gánh (danh tiếng trung bình nó mang lại) */
const VAL = { meo: 2, cho: 1.6, ech: 2, thao: 3.2, vet: 1.4, heo: 2.2, khi: 3.6, cut: 2.4, su: 4.4, gau: 3.6, cao: 2.8, voi: 6, lan: 5.2 };
export function botAction(v, pid, p0, level) {
  const p = v.players.find(x => x.id === pid);
  if (!p || v.phase !== 'play') return null;
  if ((typeof v.cur === 'number' ? v.players[v.cur].id : v.cur) !== pid) return null; /* state: cur là số ghế; view: cur là mã người */
  if (p.left <= 0) return { type: 'done' };
  /* mời Chồn hôi ra khi còn đủ danh tiếng để vẫn thuê được thứ khác */
  const skunk = p.grid.flat().find(c => c.up && c.k === 'chon');
  if (skunk && p.fame >= E.DISMISS && p.deck.length > E.MIN_KEEP && (p.fame - E.DISMISS >= 2 || v.round >= 3)) return { type: 'dismiss', id: skunk.id };
  /* thuê con đáng tiền nhất trong tầm */
  let best = -1, bs = 0;
  v.market.forEach((c, i) => { const cost = E.hirePrice(v, p, i); if (cost > p.fame) return; const sc = (VAL[c.k] || 1) * (v.final ? 0 : 1) + cost * 0.15; if (sc > bs) { bs = sc; best = i; } });
  if (best >= 0 && !v.final) return { type: 'hire', i: best };
  /* thừa danh tiếng mà gánh còn Sâu nhỏ: mời bớt cho bộ bài gọn */
  const weak = p.grid.flat().find(c => c.up && (c.k === 'sau' || c.k === 'ong'));
  if (weak && p.fame >= E.DISMISS && p.deck.length > 7 && !v.final) return { type: 'dismiss', id: weak.id };
  return { type: 'done' };
}
