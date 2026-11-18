// node loto/test/sim.mjs – kiểm tra vé hợp lệ và ván luôn kết thúc đúng.
import * as E from '../js/engine.js';
let draws = 0, games = 0, multi = 0;
for (let g = 0; g < 2000; g++) {
  const t = E.makeTicket();
  if (t.length !== 9 || t.some(r => r.length !== 9 || E.rowNums(r).length !== 5)) throw new Error('hàng sai');
  for (let c = 0; c < 9; c++) { const col = t.map(r => r[c]).filter(Boolean); if (col.length !== 5 || new Set(col).size !== 5) throw new Error('cột sai'); for (const n of col) if (Math.floor(n === 90 ? 8 : n / 10) !== c) throw new Error('số sai cột ' + n); }
}
for (let g = 0; g < 500; g++) {
  const n = 2 + g % 15, s = E.createGame(Array.from({ length: n }, (_, i) => ({ id: i ? 'p' + i : 'host', name: 'P' + i, isBot: true })), {});
  if (E.applyAction(s, 'p1', { type: 'draw' }).ok) throw new Error('khách bốc được số');
  E.applyAction(s, 'host', { type: 'kinh' }); if (s.phase !== 'play' || s.last.t !== 'miss') throw new Error('kinh hụt sai');
  while (s.phase === 'play') {
    const a = E.actors(s); if (a.length) { E.applyAction(s, a[0], E.botAction()); break; }
    E.applyAction(s, 'host', { type: 'draw' });
    const v = E.viewFor(s, 'p1'); if ('bag' in v || 'tickets' in v) throw new Error('lộ túi số / vé');
  }
  if (!s.winners.length) throw new Error('không ai thắng'); for (const id of s.winners) if (!s.winRows[id].length) throw new Error('thắng sai');
  games++; draws += s.called.length; if (s.winners.length > 1) multi++;
}
console.log(`✅ 2000 vé hợp lệ · ${games} ván, TB ${Math.round(draws / games)} số thì có người kinh, ${multi} ván kinh trùng`);
