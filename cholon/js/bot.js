// 🤖 Bot Chợ Lớn (tập sự): biết giữ đất liền nhau, dựng tiệm cạnh tiệm cùng loại, và chỉ nhận lời mời nào có lợi theo cách định giá thô. Không biết mặc cả khéo như người.
import { neighbors, shop, chains, payOf, lot } from './engine.js?v=1';
const near = (s, pid, i) => neighbors(i).filter(x => s.owner[x] === pid).length;
/* giá trị thô của một lô đất / biển hiệu / tiền đối với pid */
function lotVal(s, pid, i) { return 12 + 6 * near(s, pid, i) + (s.built[i] ? 10 : 0); }
function tileVal(s, pid, k) { const same = chains(s, pid).filter(c => c.k === k).reduce((n, c) => Math.max(n, c.lots.length), 0), mine = s.tiles[pid].filter(x => x === k).length; return 6 + 5 * Math.min(same + mine, shop(k).need); }
const sideVal = (s, pid, side) => side.cash + side.lots.reduce((n, i) => n + lotVal(s, pid, i), 0) + side.tiles.reduce((n, k) => n + tileVal(s, pid, k), 0);
export function botAction(s, pid) {
  if (s.stage === 'keep') { if (s.kept[pid]) return null; const d = s.dealt[pid].slice().sort((a, b) => (near(s, pid, b) * 3 + s.dealt[pid].filter(x => neighbors(b).includes(x)).length) - (near(s, pid, a) * 3 + s.dealt[pid].filter(x => neighbors(a).includes(x)).length)); return { type: 'keep', lots: d.slice(0, Math.min(s.need, d.length)) }; }
  const o = s.offers.find(o => o.to === pid); if (o) return { type: sideVal(s, pid, o.give) >= sideVal(s, pid, o.get) * 1.1 ? 'accept' : 'decline', id: o.id };
  /* dựng tiệm: ưu tiên ô làm chuỗi dài ra nhiều nhất */
  const empty = Object.keys(s.owner).map(Number).filter(i => s.owner[i] === pid && !s.built[i]); let best = null, bv = -1;
  for (const k of new Set(s.tiles[pid])) for (const i of empty) { const adj = neighbors(i).filter(x => s.owner[x] === pid && s.built[x] === k).length, v = adj * 10 + neighbors(i).filter(x => s.owner[x] === pid && !s.built[x]).length + (s.tiles[pid].filter(x => x === k).length > 1 ? 2 : 0); if (v > bv) { bv = v; best = { type: 'place', lot: i, tile: k }; } }
  if (best) return best; /* tiệm dựng sớm thì năm nào cũng có lãi */
  return s.ready[pid] ? null : { type: 'ready', on: true };
}
