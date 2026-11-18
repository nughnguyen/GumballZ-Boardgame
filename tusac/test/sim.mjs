// node tusac/test/sim.mjs – kiểm tra xếp bộ, cách ăn + cho bot tự chơi nhiều ván.
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';
const C = (r, col, k = 0) => ((col * 7 + r) << 2) + k; /* quân r, màu col, bản sao k */
let a = E.arrange([C(0, 0), C(1, 0), C(2, 0), C(3, 1), C(4, 1), C(5, 1), C(6, 0), C(6, 1), C(6, 2), C(6, 3)]); if (!a || a.pts !== 1 + 1 + 4) throw new Error('xếp bộ sai ' + JSON.stringify(a));
a = E.arrange([C(0, 0), C(0, 0, 1), C(0, 0, 2)]); if (!a || a.pts !== 3) throw new Error('3 Tướng phải 3 lệnh ' + JSON.stringify(a));
if (E.arrange([C(1, 0), C(2, 0)]) || E.arrange([C(3, 0), C(4, 1), C(5, 0)])) throw new Error('lẻ phải đủ 3 quân cùng màu');
if (E.minLeft([C(1, 0), C(2, 0), C(3, 2), C(3, 2, 1)]) !== 2) throw new Error('đếm rác sai');
let o = E.takeOpts([C(3, 0), C(3, 0, 1), C(4, 0), C(5, 0), C(1, 1)], C(3, 0, 2), true, false); if (!['khap', 'doi', 'le'].every(k => o.some(x => x.k === k))) throw new Error('thiếu cách ăn ' + JSON.stringify(o));
o = E.takeOpts([C(3, 0), C(3, 0, 1), C(4, 0), C(5, 0), C(1, 1)], C(3, 0, 2), false, false); if (o.length !== 1 || o[0].k !== 'khap') throw new Error('ngoài lượt chỉ được khui ' + JSON.stringify(o));
o = E.takeOpts([C(3, 0), C(4, 0), C(6, 1), C(6, 1, 1)], C(5, 0), false, false); if (o.length !== 1 || !o[0].win || o[0].pts !== 1) throw new Error('ngoài lượt vẫn được tới ' + JSON.stringify(o));
if (E.takeOpts([C(1, 0)], C(0, 0), true, false).some(x => x.k === 'tuong') || !E.takeOpts([C(1, 0)], C(0, 0), true, true).some(x => x.k === 'tuong')) throw new Error('chỉ người bốc mới giữ Tướng lẻ');
const st = { games: 0, toi: 0, hoa: 0, steps: 0, pts: 0, steal: 0, win: {} };
for (const n of [2, 3, 4]) for (const chiu of [true, false]) for (let g = 0; g < 150; g++) {
  const s = E.createGame(Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'P' + i, isBot: true })), { chiu }); let k = 0;
  while (s.phase === 'play') {
    if (++k > 3000) throw new Error('kẹt ván');
    const pid = E.actors(s)[0], act = botAction(s, pid); if (!act) throw new Error('bot không đi ' + s.stage);
    if (act.type === 'take' && s.stage === 'claim' && pid !== s.natural) st.steal++;
    const r = E.applyAction(s, pid, act); if (!r.ok) throw new Error('bot đi sai: ' + r.reason + ' ' + JSON.stringify(act));
    const total = s.deck.length + (s.card != null ? 1 : 0) + s.players.reduce((x, p) => x + s.hands[p.id].length + s.piles[p.id].length + s.melds[p.id].reduce((y, m) => y + m.cards.length, 0), 0);
    if (total !== 112) throw new Error('lệch số lá: ' + total);
    if (s.phase === 'play' && s.stage === 'discard') for (const p of s.players) { const m = s.hands[p.id].length + s.melds[p.id].reduce((y, m) => y + m.cards.length, 0); if (m !== (p.id === s.cur ? 21 : 20)) throw new Error('số lá của ' + p.id + ' = ' + m); }
    const v = E.viewFor(s, 'p0'); if ('hands' in v || 'deck' in v || 'queue' in v || (v.reveal && s.phase === 'play')) throw new Error('lộ bài');
    if (v.myOpts && E.actors(s)[0] !== 'p0') throw new Error('lộ cách ăn');
  }
  st.games++; st.steps += k;
  if (s.winner) { st.toi++; st.pts += s.result.pts; if (s.result.pts % 2 !== 1) throw new Error('tới mà lệnh chẵn: ' + s.result.pts); const w = (s.players.findIndex(p => p.id === s.winner) - s.dealer + n) % n; st.win[n + ':' + w] = (st.win[n + ':' + w] || 0) + 1;
    const all = [...s.hands[s.winner], ...s.melds[s.winner].flatMap(m => m.cards)]; if (all.length !== 21) throw new Error('người tới phải đủ 21 lá'); } else st.hoa++;
  if (Object.values(s.result.chips).reduce((x, y) => x + y, 0) !== 0) throw new Error('xu không cân');
}
st.pts = +(st.pts / Math.max(1, st.toi)).toFixed(1); console.log('✅ Tứ sắc:', st);
