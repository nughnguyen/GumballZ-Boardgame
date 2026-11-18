// node tala/test/sim.mjs – kiểm tra xếp phỏm + cho bot tự chơi nhiều ván.
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';
const C = t => { const r = E.RANK_TXT.indexOf(t.slice(0, -1)), s = '♠♣♦♥'.indexOf(t.slice(-1)); return r * 4 + s; };
const H = str => str.split(' ').map(C);
let a = E.arrange(H('3♠ 3♣ 3♦ 5♥ 6♥ 7♥ K♠ 9♦ 2♣')); if (a.melds.length !== 2 || a.left !== 13 + 9 + 2) throw new Error('xếp phỏm sai ' + JSON.stringify(a));
a = E.arrange(H('Q♠ K♠ A♠ 2♠')); if (a.melds.length) throw new Error('Q-K-A không phải phỏm');
a = E.arrange(H('4♠ 5♠ 6♠ 6♣ 6♦ 7♠')); if (a.left !== 6 + 6) throw new Error('chọn phỏm tối ưu sai ' + JSON.stringify(a));
if (!E.canEat(H('7♠ 7♣ 2♦'), [], C('7♦')) || E.canEat(H('7♠ 8♣ 2♦'), [], C('7♦'))) throw new Error('ăn bài sai');
if (E.canDiscard(H('7♠ 7♣ 7♦ 2♦'), [C('7♦')], C('7♠')) || !E.canDiscard(H('7♠ 7♣ 7♦ 2♦'), [C('7♦')], C('2♦'))) throw new Error('luật giữ lá ăn sai');
if (E.uCard(H('3♠ 3♣ 3♦ 5♥ 6♥ 7♥ 9♠ 9♣ 9♦ K♠'), []) !== C('K♠') || E.uCard(H('3♠ 3♣ 3♦ 5♥ 6♥ 7♥ 9♠ 9♣ 2♦ K♠'), []) !== null) throw new Error('ù sai');
if (!E.fits(H('5♥ 6♥ 7♥'), C('8♥')) || E.fits(H('5♥ 6♥ 7♥'), C('8♠')) || !E.fits(H('9♠ 9♣ 9♦'), C('9♥'))) throw new Error('gửi bài sai');
const st = { games: 0, u: 0, mom: 0, eats: 0, steps: 0, win: {} };
for (const n of [2, 3, 4]) for (let g = 0; g < 400; g++) {
  const s = E.createGame(Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'P' + i, isBot: true })), { turns: g % 3 ? 4 : 3 }); let k = 0;
  while (s.phase === 'play') {
    if (++k > 400) throw new Error('kẹt ván');
    const pid = E.actors(s)[0], act = botAction(s, pid); if (!act) throw new Error('bot không đi ' + s.stage);
    if (act.type === 'eat') st.eats++;
    const r = E.applyAction(s, pid, act); if (!r.ok) throw new Error('bot đi sai: ' + r.reason + ' ' + JSON.stringify(act));
    const total = s.deck.length + Object.values(s.hands).reduce((x, h) => x + h.length, 0) + Object.values(s.piles).reduce((x, h) => x + h.length, 0) + Object.values(s.laid).reduce((x, L) => x + (L ? L.flat().length : 0), 0);
    if (total !== 52) throw new Error('lệch số lá: ' + total);
    const v = E.viewFor(s, 'p0'); if ('hands' in v || 'deck' in v || (v.reveal && s.phase === 'play')) throw new Error('lộ bài');
  }
  st.games++; st.steps += k; if (s.u) st.u++; st.mom += Object.values(s.done).filter(d => d.mom).length; const w = s.players.findIndex(p => p.id === s.winner); st.win[n + ':' + ((w - s.first + n) % n)] = (st.win[n + ':' + ((w - s.first + n) % n)] || 0) + 1;
  if (Object.values(s.result.chips).reduce((x, y) => x + y, 0) !== 0) throw new Error('xu không cân');
}
console.log('✅ Tá lả:', st);
