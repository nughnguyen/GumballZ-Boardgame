// Mô phỏng bot Spyfall: bot đấu nhau nhiều ván, kiểm tra không kẹt + tỉ lệ thắng gián điệp.
// Chạy: node spyfall/test/sim.mjs [số ván] [cấp độ 1] [cấp độ 2] [số người]
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';

const N = parseInt(process.argv[2] || '100', 10);
const lvlA = process.argv[3] || 'hard';
const lvlB = process.argv[4] || 'easy';
const nP = parseInt(process.argv[5] || '5', 10);

function playOne(levelA, levelB, n) {
  const players = Array.from({ length: n }, (_, i) => ({
    id: 'b' + i, name: 'Bot' + i, isBot: true, level: i % 2 === 0 ? levelA : levelB,
  }));
  const s = E.createGame(players, { target: 1 });
  let steps = 0, asks = 0;
  while (s.phase !== 'ended' && s.phase !== 'roundover' && steps < 500) {
    const acts = E.actors(s);
    if (!acts.length) return { stuck: 'không còn người chơi', steps, s };
    const pid = acts[0];
    const p = s.players.find(x => x.id === pid);
    const a = botAction(s, pid, p);
    if (!a) return { stuck: 'bot không ra hành động', steps, s };
    if (a.type === 'ask') asks++;
    const r = E.applyAction(s, pid, a);
    if (!r.ok) return { stuck: 'bot ra hành động sai: ' + JSON.stringify(a) + ' → ' + r.reason, steps, s };
    steps++;
  }
  if (s.phase !== 'ended' && s.phase !== 'roundover') return { stuck: 'quá 500 bước chưa kết thúc', steps, s };
  return { spyWon: s.roundWinnerIds.length === 1 && s.roundWinnerIds[0] === s.spyId, reason: s.endReason, steps, asks };
}

let spyWins = 0, teamWins = 0;
let reasons = {};
let stuck = 0, maxSteps = 0, totalSteps = 0, totalAsks = 0;
for (let i = 0; i < N; i++) {
  const r = playOne(lvlA, lvlB, nP);
  if (r.stuck) { stuck++; console.log(`  ✗ ván ${i}: KẸT — ${r.stuck}`); continue; }
  if (r.spyWon) spyWins++; else teamWins++;
  reasons[r.reason] = (reasons[r.reason] || 0) + 1;
  maxSteps = Math.max(maxSteps, r.steps);
  totalSteps += r.steps;
  totalAsks += r.asks;
}
console.log(`\n${N} ván (${lvlA} vs ${lvlB}, ${nP} người): gián điệp thắng ${spyWins}, đội thắng ${teamWins}, kẹt ${stuck}, dài nhất ${maxSteps} bước, trung bình ${(totalSteps / Math.max(1, N - stuck)).toFixed(1)} bước/ván, ${(totalAsks / Math.max(1, N - stuck)).toFixed(1)} câu hỏi/ván.`);
console.log('Lý do kết thúc:', JSON.stringify(reasons));
if (stuck) process.exit(1);
