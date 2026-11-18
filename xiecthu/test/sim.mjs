// Test Gánh Xiếc Thú: node xiecthu/test/sim.mjs [số ván]
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('❌', m); } };
const N = +(process.argv[2] || 300);
for (const np of [2, 3, 4, 5]) {
  const wins = Array(np).fill(0); let rounds = 0;
  for (let g = 0; g < N; g++) {
    const s = E.createGame(Array.from({ length: np }, (_, i) => ({ id: i ? 'bot' + i : 'host', name: 'P' + i, isBot: true })));
    let n = 0; while (s.phase === 'play' && n < 3000) { const id = E.actors(s)[0], a = botAction(g % 2 ? s : E.viewFor(s, id), id); const r = E.applyAction(s, id, a); if (!r.ok) { ok(false, JSON.stringify(a) + ' ' + r.reason); break; } n++; }
    ok(s.phase === 'ended', 'ván không kết thúc');
    for (const p of s.players) ok(p.grid.filter(c => c.length).length <= 6 && p.deck.length >= E.MIN_KEEP, 'sân khấu / bộ bài sai');
    s.winners.forEach(id => wins[s.players.findIndex(p => p.id === id)]++); rounds += s.round;
  }
  console.log(`${np} người: ${Math.round(rounds / N)} đêm/ván · thắng theo ghế ${wins.map(w => Math.round(w / N * 100) + '%').join(' / ')}`);
}
/* chấm điểm */
const G = ks => ks.map(k => (k ? [{ k, id: k + Math.random(), up: true }] : []));
ok(E.scoreGrid(G(['cho', 'cho', 'sau', 'sau', 'cao', 'ech'])).total === 2 + 2 + 1 + 1 + 4 + 3, 'chó kề chó, cáo giữa ×2 (2 → 4… vì cáo hàng dưới giữa), ếch hàng dưới +2');
ok(E.scoreGrid(G(['su', 'sau', '', '', '', ''])).total === 5 + 1, 'sư tử −1 mỗi thẻ ngửa kề');
ok(E.scoreGrid(G(['meo', 'vet', '', '', '', ''])).total === 4, 'vẹt nhại thẻ bên trái');
console.log(bad ? `❌ ${bad} lỗi` : '✅ ổn'); process.exit(bad ? 1 : 0);
