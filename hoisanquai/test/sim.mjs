// Test Hội Săn Quái: node hoisanquai/test/sim.mjs [số ván] – máy đấu máy, kiểm luật + đo thắng theo ghế / cách thắng / số lượt
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';
import { deckKeys, ALL, HEROES } from '../js/cards.js';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; if (bad < 15) console.log('❌', m); } };
const N = +(process.argv[2] || 200);
ok(deckKeys().every(k => ALL[k]), 'lá trong chồng phải có dữ liệu');
ok(Object.keys(HEROES).length === 48, '48 anh hùng');
const count = s => s.deck.length + s.disc.length + s.players.reduce((n, p) => n + p.hand.length + p.party.length + p.party.filter(h => h.item).length, 0) + (s.pend && s.pend.play ? 1 : 0);
for (const np of [2, 3, 4, 5, 6]) {
  const wins = Array(np).fill(0), how = { mon: 0, cls: 0 }; let turns = 0, stuck = 0, acts = 0;
  for (let g = 0; g < N; g++) {
    const s = E.createGame(Array.from({ length: np }, (_, i) => ({ id: i ? 'bot' + i : 'host', name: 'P' + i, isBot: true })), {});
    const total = count(s); let n = 0, last = 0;
    while (s.phase === 'play' && n < 6000) {
      const ids = E.actors(s); if (!ids.length) { ok(false, 'không ai đi được ' + JSON.stringify(s.pend && s.pend.k)); break; }
      const id = ids[0], a = botAction(s, id);
      if (!a) { ok(false, 'máy không trả nước đi ' + id + ' ' + (s.pend && s.pend.k)); break; }
      const r = E.applyAction(s, id, a); acts++;
      if (!r.ok) { ok(false, JSON.stringify(a) + ' → ' + r.reason + ' pend=' + (s.pend && s.pend.k)); break; }
      n++;
      if (s.phase === 'play' && !s.pend) ok(count(s) === total, `mất / thừa lá: ${count(s)} ≠ ${total} sau ${JSON.stringify(a)}`);
    }
    if (s.phase !== 'ended') { stuck++; continue; }
    const w = s.players.find(p => p.id === s.winner); wins[s.players.indexOf(w)]++;
    if (w.slain.length >= E.WIN_MON) how.mon++; else how.cls++; turns += s.turnN;
  }
  console.log(`${np} người: ${Math.round(turns / N)} lượt/ván · ${Math.round(acts / N)} nước · thắng theo ghế ${wins.map(w => Math.round(w / N * 100) + '%').join(' / ')} · diệt quái ${how.mon} / đủ hệ ${how.cls}${stuck ? ' · kẹt ' + stuck : ''}`);
}
/* luật nhỏ */
{
  const s = E.createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]); s.cur = 0; s.pend = null; s.ap = 3;
  const A = s.players[0]; A.hand = [{ id: 'x1', k: 'g6' }]; s.players[1].hand = [];
  ok(E.applyAction(s, 'a', { type: 'play', cid: 'x1' }).ok, 'chơi anh hùng'); ok(A.party.length === 1, 'anh hùng vào đội'); ok(s.ap === 2, 'tốn 1 hành động');
  ok(!E.applyAction(s, 'b', { type: 'draw' }).ok, 'không phải lượt thì không rút được');
}
console.log(bad ? `❌ ${bad} lỗi` : '✅ ổn'); process.exit(bad ? 1 : 0);
