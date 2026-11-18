// Mô phỏng bot đấu bot nhiều ván. Chạy: node bantau/test/sim.mjs [số ván]
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';

const N = +process.argv[2] || 50;
let wins = [0, 0], totalTurns = 0, maxTurns = 0, minTurns = 1e9, stuck = 0, itemUses = { trap: 0, radar: 0, nuke: 0 };
for (let g = 0; g < N; g++) {
  const s = E.createGame([{ id: 'p0', name: 'Bot A', isBot: true }, { id: 'p1', name: 'Bot B', isBot: true }]);
  let guard = 0, lastLog = 0;
  while (s.phase !== 'ended' && guard++ < 500) {
    const pid = s.turn || s.players.find(p => !p.ready)?.id;
    if (!pid) break;
    const a = botAction(s, pid);
    if (!a) { stuck++; break; }
    if (a.type === 'radar' || a.type === 'nuke') itemUses[a.type]++;
    if (a.type === 'place-trap') itemUses.trap++;
    const r = E.applyAction(s, pid, a);
    if (!r.ok) { console.log('ván', g, 'bot bị từ chối:', JSON.stringify(a), r.reason); stuck++; break; }
    lastLog = s.log.length;
  }
  if (s.phase !== 'ended') { stuck++; console.log('ván', g, 'KẸT ở phase', s.phase, 'turn', s.turnNo); continue; }
  const w = s.winner === 'p0' ? 0 : 1;
  wins[w]++;
  totalTurns += s.turnNo; maxTurns = Math.max(maxTurns, s.turnNo); minTurns = Math.min(minTurns, s.turnNo);
}
console.log(`Bot vs bot: ${N} ván — Bot A thắng ${wins[0]}, Bot B thắng ${wins[1]}, kẹt ${stuck}`);
console.log(`Số lượt/ván: trung bình ${(totalTurns / (N - stuck)).toFixed(1)}, ít nhất ${minTurns}, nhiều nhất ${maxTurns}`);
console.log('Vật phẩm đã dùng: bẫy', itemUses.trap, 'radar', itemUses.radar, 'bom', itemUses.nuke);
if (stuck) process.exit(1);
