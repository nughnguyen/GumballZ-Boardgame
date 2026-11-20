// Mô phỏng bot Wordle: bot đấu nhau nhiều ván, kiểm tra không kẹt.
// Chạy: node wordle/test/sim.mjs [số ván] [cấp độ 1] [cấp độ 2]
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';

const N = parseInt(process.argv[2] || '100', 10);
const lvlA = process.argv[3] || 'hard';
const lvlB = process.argv[4] || 'easy';

function playOne(levelA, levelB) {
  const players = [
    { id: 'b1', name: 'Bot1', isBot: true, level: levelA },
    { id: 'b2', name: 'Bot2', isBot: true, level: levelB },
  ];
  const s = E.createGame(players);
  let steps = 0;
  while (s.phase !== 'ended' && steps < 30) {
    const pid = E.actors(s)[0];
    if (!pid) return { stuck: 'không còn người chơi', steps, s };
    const p = s.players.find(x => x.id === pid);
    const a = botAction(s, pid, p);
    if (!a) return { stuck: 'bot không ra hành động', steps, s };
    const r = E.applyAction(s, pid, a);
    if (!r.ok) return { stuck: 'bot ra hành động sai: ' + JSON.stringify(a) + ' → ' + r.reason, steps, s };
    steps++;
  }
  if (s.phase !== 'ended') return { stuck: 'quá 30 bước chưa kết thúc', steps, s };
  return { winner: s.winner, reason: s.endReason, steps };
}

let wins = { b1: 0, b2: 0, none: 0 };
let reasons = {};
let stuck = 0, maxSteps = 0, totalSteps = 0;
for (let i = 0; i < N; i++) {
  const r = playOne(lvlA, lvlB);
  if (r.stuck) { stuck++; console.log(`  ✗ ván ${i}: KẸT — ${r.stuck}`); continue; }
  wins[r.winner || 'none']++;
  reasons[r.reason] = (reasons[r.reason] || 0) + 1;
  maxSteps = Math.max(maxSteps, r.steps);
  totalSteps += r.steps;
}
console.log(`\n${N} ván (${lvlA} vs ${lvlB}): Bot1 thắng ${wins.b1}, Bot2 thắng ${wins.b2}, không ai thắng ${wins.none}, kẹt ${stuck}, dài nhất ${maxSteps} bước, trung bình ${(totalSteps / Math.max(1, N - stuck)).toFixed(1)} bước/ván.`);
console.log('Lý do kết thúc:', JSON.stringify(reasons));
if (stuck) process.exit(1);
