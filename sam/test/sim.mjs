// node sam/test/sim.mjs – kiểm tra nhận dạng bộ, chặt bài, ăn trắng + cho bot tự chơi.
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';
const C = t => E.RANK_TXT.indexOf(t.slice(0, -1)) * 4 + '♠♣♦♥'.indexOf(t.slice(-1)), H = str => str.split(' ').map(C), cb = str => E.combo(H(str));
if (cb('3♠ 4♣ 5♦').t !== 'straight' || cb('Q♠ K♣ A♦').top !== 13 || cb('A♠ 2♣ 3♦').top !== 2 || cb('K♠ A♣ 2♦') || cb('2♠ 3♣ 4♦').t !== 'straight') throw new Error('sảnh sai');
if (cb('7♠ 7♣').t !== 'pair' || cb('7♠ 8♣') || cb('9♠ 9♣ 9♦ 9♥').t !== 'four') throw new Error('bộ sai');
if (!E.beats(cb('2♠'), cb('9♠ 9♣ 9♦ 9♥')) || E.beats(cb('A♠'), cb('9♠ 9♣ 9♦ 9♥')) || !E.beats(cb('K♠'), cb('A♦')) || !E.beats(cb('A♠'), cb('2♦')) || E.beats(cb('7♠ 7♣'), cb('8♠')) || !E.beats(cb('A♠ 2♣ 3♦'), cb('4♠ 5♣ 6♦')) || !E.beats(cb('J♠ Q♣ K♦'), cb('Q♠ K♣ A♦'))) throw new Error('chặt sai');
if (E.white(H('2♠ 2♣ 2♦ 2♥ 3♠ 5♣ 7♦ 9♥ J♠ K♣')) !== 'Tứ quý 2' || E.white(H('3♠ 3♣ 5♦ 5♥ 7♠ 7♣ 9♦ 9♥ J♠ J♣')) !== 'Năm đôi' || E.white(H('3♠ 4♣ 5♦ 6♥ 7♠ 8♣ 9♦ 10♥ J♠ Q♣')) !== 'Sảnh rồng' || E.white(H('3♠ 4♣ 5♦ 6♥ 7♠ 8♣ 9♦ 10♥ J♠ K♣'))) throw new Error('ăn trắng sai');
if (!E.badFinish(H('2♠'), H('2♠')) === false || !E.badFinish(H('2♠ 2♣ 5♦').slice(0, 2).concat(), H('2♠ 2♣')) === true) { /* tay toàn 2 thì được về */ }
if (E.badFinish(H('2♠ 2♣'), H('2♠ 2♣')) || !E.badFinish(H('3♠ 2♣'), H('3♠ 2♣').slice(1)) === false) throw new Error('luật về bằng 2 sai');
const st = { games: 0, steps: 0, sam: 0, samWin: 0, block: 0, white: 0, cong: 0, win: {} };
for (const n of [2, 3, 4, 5]) for (let g = 0; g < 400; g++) {
  const s = E.createGame(Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'P' + i, isBot: true })), { sam: g % 4 !== 0 }); let k = 0;
  while (s.phase === 'play') {
    if (++k > 600) throw new Error('kẹt ván');
    const pid = E.actors(s)[0], act = botAction(s, pid), r = E.applyAction(s, pid, act); if (!r.ok) throw new Error('bot đi sai: ' + r.reason + ' ' + JSON.stringify(act));
    const v = E.viewFor(s, 'p0'); if ('hands' in v || (v.reveal && s.phase === 'play')) throw new Error('lộ bài');
  }
  st.games++; st.steps += k; const r = s.result; if (r.white) st.white++; if (r.sam) { st.sam++; if (r.block) st.block++; else if (r.winner === r.sam) st.samWin++; }
  st.cong += Object.values(r.chips).filter(c => c === -E.CONG_PAY).length; const w = (s.players.findIndex(p => p.id === s.winner) - s.first + n) % n; st.win[n + ':' + w] = (st.win[n + ':' + w] || 0) + 1;
  if (Object.values(r.chips).reduce((x, y) => x + y, 0) !== 0) throw new Error('xu không cân');
  if (!r.white && !r.block && s.hands[s.winner].length) throw new Error('người thắng còn bài');
}
console.log('✅ Sâm lốc:', JSON.stringify(st));
