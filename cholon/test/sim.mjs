// node cholon/test/sim.mjs – kiểm tra bàn, cách tính tiền và cho bot tự chơi trọn nhiều ván.
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';
if (E.LOTS.length !== 85) throw new Error('bàn phải có 85 lô, đang có ' + E.LOTS.length);
if (E.SHOPS.reduce((n, t) => n + t.need + 3, 0) !== 90) throw new Error('phải có 90 biển hiệu');
if (E.payOf(3, 3) !== 50 || E.payOf(2, 3) !== 20 || E.payOf(6, 6) !== 140 || E.payOf(5, 6) !== 80 || E.payOf(4, 3) !== 60) throw new Error('bảng tiền sai');
const st = { games: 0, trades: 0, avgWin: 0, steps: 0 };
for (const n of [3, 4, 5]) for (let g = 0; g < 150; g++) {
  const s = E.createGame(Array.from({ length: n }, (_, i) => ({ id: i ? 'p' + i : 'host', name: 'P' + i, isBot: true })), { years: g % 2 ? 6 : 4 }); let k = 0;
  /* thử mặc cả: p1 mời host đổi đất lấy tiền ở mỗi năm */
  while (s.phase === 'play') {
    if (++k > 3000) throw new Error('kẹt ván ' + s.stage + ' năm ' + s.year);
    if (s.stage === 'trade' && k % 7 === 0) { const mine = Object.keys(s.owner).map(Number).filter(i => s.owner[i] === 'p1' && !s.built[i]); if (mine.length) { const r = E.applyAction(s, 'p1', { type: 'offer', to: 'host', give: { lots: [mine[0]] }, get: { cash: 5 } }); if (r.ok) st.offers = (st.offers || 0) + 1; } }
    const ids = E.actors(s); if (!ids.length) throw new Error('không ai phải làm gì');
    const pid = ids[k % ids.length], a = botAction(s, pid); if (!a) { if (s.stage === 'trade') { E.applyAction(s, pid, { type: 'ready' }); continue; } throw new Error('bot đứng im'); }
    const before = s.log.length; const r = E.applyAction(s, pid, a); if (!r.ok) throw new Error('bot đi sai: ' + r.reason + ' ' + JSON.stringify(a));
    if (a.type === 'accept') st.trades++;
    const total = Object.values(s.cash).reduce((x, y) => x + y, 0); if (!(total >= 0)) throw new Error('tiền âm');
    const owned = Object.keys(s.owner).length + s.deck.length + Object.values(s.dealt).reduce((x, d) => x + d.length, 0); if (owned !== 85) throw new Error('lệch số lô: ' + owned);
    const tiles = s.bag.length + Object.values(s.tiles).reduce((x, t) => x + t.length, 0) + Object.keys(s.built).length; if (tiles !== 90) throw new Error('lệch biển hiệu: ' + tiles);
    const v = E.viewFor(s, 'p1'); if ('deck' in v || 'bag' in v || (s.phase === 'play' && v.cash.host != null)) throw new Error('lộ thông tin');
  }
  st.games++; st.steps += k; st.avgWin += s.cash[s.winner];
}
st.avgWin = Math.round(st.avgWin / st.games); console.log('✅ Chợ Lớn:', st);
