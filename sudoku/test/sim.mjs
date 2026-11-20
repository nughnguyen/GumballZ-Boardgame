// Mô phỏng bot Sudoku đua nhau: kiểm tra không kẹt, đua luôn kết thúc,
// máy Khó (điền nhanh) thắng máy Dễ (điền chậm) phần lớn các ván.
// Chạy: node sudoku/test/sim.mjs [số ván] [độ khó]
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';

const N = parseInt(process.argv[2] || '100', 10);
const DIFF = process.argv[3] || 'medium';

/* tốc độ điền 1 ô (ms) — khớp botDelay trong main.js */
const delayFor = level => level === 'hard' ? 1600 + Math.random() * 800 : 4200 + Math.random() * 1800;

function playOne(levelA, levelB, diff) {
  const players = [
    { id: 'a', name: 'Máy A', isBot: true, level: levelA },
    { id: 'b', name: 'Máy B', isBot: true, level: levelB },
  ];
  const s = E.createGame(players, { difficulty: diff });
  const nextT = { a: delayFor(levelA), b: delayFor(levelB) };
  let steps = 0, clock = 0;
  while (s.phase !== 'ended' && steps < 500) {
    const acts = E.actors(s);
    if (!acts.length) return { stuck: 'không còn người chơi', steps, s };
    /* bot nào tới lượt sớm hơn thì điền trước (mô phỏng tốc độ thật) */
    const pid = acts.reduce((m, id) => (nextT[id] < nextT[m] ? id : m), acts[0]);
    clock = nextT[pid];
    const p = s.players.find(x => x.id === pid);
    const a = botAction(s, pid, p);
    if (!a) return { stuck: 'bot không ra hành động', steps, s };
    const r = E.applyAction(s, pid, a);
    if (!r.ok || !r.correct) return { stuck: 'bot ra hành động sai: ' + JSON.stringify(a) + ' → ' + (r && r.reason), steps, s };
    nextT[pid] = clock + delayFor(p.level);
    steps++;
  }
  if (s.phase !== 'ended') return { stuck: 'quá 500 bước chưa kết thúc', steps, s };
  return { winner: s.winner, reason: s.endReason, steps, clock: Math.round(clock / 1000), s };
}

let stuck = 0, hardWins = 0, easyWins = 0, totalSteps = 0, totalSecs = 0;
for (let i = 0; i < N; i++) {
  const r = playOne('hard', 'easy', DIFF);
  if (r.stuck) { stuck++; console.log('KẸT ván ' + i + ': ' + r.stuck); continue; }
  totalSteps += r.steps; totalSecs += r.clock;
  if (r.winner === 'a') hardWins++; else if (r.winner === 'b') easyWins++;
}
console.log(`Sudoku sim (${DIFF}): ${N} ván đua máy Khó vs máy Dễ`);
console.log(`  kẹt: ${stuck} · máy Khó thắng: ${hardWins} · máy Dễ thắng: ${easyWins}`);
console.log(`  trung bình: ${N ? (totalSteps / N).toFixed(1) : 0} lượt điền/ván, ${(N ? totalSecs / N : 0).toFixed(1)} giây/ván`);
if (stuck) process.exit(1);
if (easyWins > hardWins) { console.log('  ⚠️ máy Dễ thắng nhiều hơn máy Khó — kiểm tra lại tốc độ bot!'); process.exit(1); }
console.log('  ✓ 0 ván kẹt, máy Khó thắng áp đảo như thiết kế.');
