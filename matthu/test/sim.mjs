// Mô phỏng bot Mật Thư: 2 bot đấu nhau nhiều ván, kiểm tra không kẹt.
// Chạy: node matthu/test/sim.mjs [số ván] [cấp độ Đỏ] [cấp độ Xanh]
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';

const N = parseInt(process.argv[2] || '100', 10);
const lvlR = process.argv[3] || 'hard';
const lvlB = process.argv[4] || 'easy';

function playOne(levelR, levelB) {
  const s = E.createGame([
    { id: 'r', name: 'Đỏ', isBot: true, level: levelR },
    { id: 'b', name: 'Xanh', isBot: true, level: levelB },
  ]);
  let steps = 0, clues = 0, guesses = 0, passes = 0;
  while (s.phase !== 'ended' && steps < 500) {
    const actors = E.actors(s);
    if (!actors.length) return { stuck: 'không còn người chơi', steps, s };
    const pid = actors[0];
    const p = s.players.find(x => x.id === pid);
    const a = botAction(s, pid, p);
    if (!a) return { stuck: 'bot không ra hành động', steps, s };
    const r = E.applyAction(s, pid, a);
    if (!r.ok) return { stuck: 'bot ra hành động sai: ' + JSON.stringify(a) + ' → ' + r.reason, steps, s };
    if (a.type === 'clue') clues++;
    if (a.type === 'guess') guesses++;
    if (a.type === 'pass') passes++;
    steps++;
  }
  if (s.phase !== 'ended') return { stuck: 'quá 500 bước chưa kết thúc', steps, s };
  return { winner: s.winner, reason: s.endReason, steps, clues, guesses, passes };
}

let wins = { R: 0, B: 0 };
let reasons = {};
let stuck = 0, maxSteps = 0, totalSteps = 0;
for (let i = 0; i < N; i++) {
  const r = playOne(lvlR, lvlB);
  if (r.stuck) { stuck++; console.log(`  ✗ ván ${i}: KẸT — ${r.stuck}`); continue; }
  wins[r.winner]++;
  reasons[r.reason] = (reasons[r.reason] || 0) + 1;
  maxSteps = Math.max(maxSteps, r.steps);
  totalSteps += r.steps;
}
const done = N - stuck;
console.log(`\n${N} ván bot ${lvlR} (Đỏ) vs ${lvlB} (Xanh): ${done} ván xong, ${stuck} ván kẹt`);
console.log(`  Thắng: Đỏ ${wins.R} – Xanh ${wins.B}`);
console.log(`  Lý do kết thúc: ${JSON.stringify(reasons)}`);
console.log(`  Số bước/ván: trung bình ${(totalSteps / Math.max(done, 1)).toFixed(1)}, tối đa ${maxSteps}`);
if (stuck) process.exit(1);
console.log('  0 ván kẹt ✓');
