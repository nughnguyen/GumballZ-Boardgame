// node baucua/test/sim.mjs – kiểm tra trả thưởng + cho bot tự chơi.
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';
const P = n => Array.from({ length: n }, (_, i) => ({ id: i ? 'p' + i : 'host', name: 'P' + i, isBot: true }));
let s = E.createGame(P(2), { rounds: 5 });
const seqRnd = arr => { let i = 0; return () => arr[i++ % arr.length]; };
E.applyAction(s, 'host', { type: 'bet', sym: 'cua', amt: 10 }); E.applyAction(s, 'host', { type: 'bet', sym: 'nai', amt: 5 }); E.applyAction(s, 'p1', { type: 'bet', sym: 'tom', amt: 20 });
if (E.applyAction(s, 'host', { type: 'bet', sym: 'ga', amt: 50 }).ok === false && E.applyAction(s, 'host', { type: 'bet', sym: 'ga', amt: 50 }).reason !== 'Không đủ xu.') throw new Error('phải cho cược trong mức xu');
if (E.applyAction(s, 'p1', { type: 'force' }).ok) throw new Error('chỉ chủ phòng được lắc luôn');
if (E.viewFor(s, 'p1').dice) throw new Error('lộ xúc xắc');
E.applyAction(s, 'host', { type: 'clear' }); E.applyAction(s, 'host', { type: 'bet', sym: 'cua', amt: 10 }); E.applyAction(s, 'host', { type: 'bet', sym: 'nai', amt: 5 });
E.applyAction(s, 'host', { type: 'ready' }); E.applyAction(s, 'p1', { type: 'ready' }, seqRnd([4.5 / 6, 4.5 / 6, 3.5 / 6])); /* cua, cua, cá */
if (s.stage !== 'result' || s.dice.join() !== 'cua,cua,ca' || s.gain.host !== 20 - 5 || s.gain.p1 !== -20 || s.cash.host !== 115 || s.cash.p1 !== 80) throw new Error('trả thưởng sai ' + JSON.stringify([s.dice, s.gain, s.cash]));
const st = { games: 0, steps: 0, relief: 0, avgTop: 0 };
for (const n of [2, 4, 8]) for (let g = 0; g < 200; g++) {
  s = E.createGame(P(n), { rounds: [5, 10, 20][g % 3] }); let k = 0;
  while (s.phase === 'play') { if (++k > 5000) throw new Error('kẹt ván'); const pid = E.actors(s)[0], r = E.applyAction(s, pid, botAction(s, pid)); if (!r.ok) throw new Error('bot đi sai: ' + r.reason); if (Object.values(s.cash).some(c => c < 0)) throw new Error('âm xu'); st.relief += s.stage === 'bet' && s.relief.length && !s.seen ? 1 : 0; }
  st.games++; st.steps += k; st.avgTop += s.cash[s.winner];
}
st.avgTop = Math.round(st.avgTop / st.games); console.log('✅ Bầu cua:', st);
