// node baitan/test/sim.mjs – cho bot tự chơi nhiều ván, kiểm tra luật không vỡ.
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';
let games = 0, draws = 0, steps = 0; const lose = {};
for (const n of [2, 3, 4, 5, 6]) for (const hand of [6, 8]) for (const team of [false, true]) for (let g = 0; g < 150; g++) {
  const ps = Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'P' + i, isBot: true }));
  const s = E.createGame(ps, { hand, team, adders: g % 2 ? 'all' : 'side' });
  let k = 0;
  while (s.phase === 'play') {
    if (++k > 5000) throw new Error('kẹt ván ' + JSON.stringify({ n, hand, team, table: s.table, att: s.att, def: s.def, passed: s.passed }));
    const act = E.actors(s); if (!act.length) throw new Error('không ai đi');
    const pid = act[k % act.length], a = botAction(s, pid); if (!a) throw new Error('bot không đi ' + pid);
    const r = E.applyAction(s, pid, a); if (!r.ok) throw new Error('bot đi sai: ' + r.reason + ' ' + JSON.stringify(a));
    const total = s.deck.length + Object.values(s.hands).reduce((x, h) => x + h.length, 0) + s.table.reduce((x, t) => x + 1 + (t.d != null), 0);
    if (total > 52) throw new Error('thừa bài');
    const v = E.viewFor(s, 'p0'); if (JSON.stringify(v).includes('"hands"') || (v.reveal && s.phase === 'play')) throw new Error('lộ bài');
  }
  games++; steps += k; if (team && n === 4) { if (s.winTeam == null) draws++; } else if (!s.loser) draws++; else lose[s.players.findIndex(p => p.id === s.loser)] = (lose[s.players.findIndex(p => p.id === s.loser)] || 0) + 1;
}
console.log(`✅ ${games} ván, TB ${Math.round(steps / games)} nước/ván, hoà ${draws}; thua theo ghế:`, lose);
