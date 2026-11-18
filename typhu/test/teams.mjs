// node typhu/test/teams.mjs – chơi theo đội: ván phải kết thúc với đội thắng, đồng đội không thu tiền thuê của nhau.
import './load.mjs';
import { createGame, applyAction, actorOf, setRandom, P, mates } from '../js/engine.js?v=65';
import { botAction } from '../js/bot.js?v=64';
let seed = 777; setRandom(() => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; });
const st = { games: 0, team0: 0, team1: 0, reasons: {}, mateVisits: 0 };
for (let g = 0; g < 200; g++) {
  const np = [4, 6, 8][g % 3], s = createGame(Array.from({ length: np }, (_, i) => ({ id: 'b' + i, name: 'Bot' + i, isBot: true })), { teams: true, maxRounds: g % 3 ? 0 : 40, monopolyWin: g % 4 !== 0 });
  if (s.players.some((p, i) => p.team !== i % (np / 2))) throw new Error('chia đội sai');
  let k = 0, lastLog = 0;
  while (s.phase === 'playing' && k++ < 40000) {
    const pid = actorOf(s), a = botAction(s, pid); if (!a) throw new Error('kẹt ' + s.stage);
    const r = applyAction(s, pid, a); if (!r.ok) throw new Error('lỗi: ' + r.reason + ' ' + JSON.stringify(a));
    for (const e of s.ev) if (e.n > lastLog && e.t === 'pay' && e.to && e.why === 'rent' && mates(s, e.from, e.to)) throw new Error('đồng đội vẫn bị thu tiền thuê');
    lastLog = s.evn;
  }
  if (s.phase !== 'over') throw new Error('ván không kết thúc');
  if (s.winTeam == null || P(s, s.winner).team !== s.winTeam) throw new Error('thiếu đội thắng');
  st.games++; st['team' + s.winTeam] = (st['team' + s.winTeam] || 0) + 1; st.reasons[s.winReason] = (st.reasons[s.winReason] || 0) + 1; st.mateVisits += s.log.filter(l => l.includes('đồng đội')).length;
}
if (createGame([1, 2, 3].map(i => ({ id: 'x' + i, name: 'X' + i })), { teams: true }).players[0].team !== null) throw new Error('3 người không được chia đội');
console.log('✅ chơi theo đội ổn:', st);
