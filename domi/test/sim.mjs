// Mô phỏng Dò Mìn: bot chơi 1 mình + đua bot, kiểm không kẹt
// và máy Khó thắng nhiều hơn máy Dễ.
// Chạy: node domi/test/sim.mjs
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';

let pass = 0, fail = 0;
function t(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.log(`  ✗ ${name}`); }
}

function playSolo(level, diff, seed, maxSteps = 5000) {
  const s = E.createGame([{ id: 'bot', name: 'Bot', isBot: true, level }], { difficulty: diff, seed });
  let steps = 0;
  while (s.phase === 'playing' && steps < maxSteps) {
    const a = botAction(s, 'bot', { level });
    if (!a) return { stuck: true, steps, won: false };
    const r = E.applyAction(s, 'bot', { type: a.type, cell: a.cell });
    if (!r.ok) return { stuck: true, steps, won: false, bad: r };
    steps++;
  }
  return { stuck: s.phase === 'playing', steps, won: s.winner === 'bot' };
}

const N = 60;
let stuckEasy = 0, stuckHard = 0, winEasy = 0, winHard = 0, stepsEasy = 0, stepsHard = 0;
for (let i = 1; i <= N; i++) {
  const e = playSolo('easy', 'easy', i);
  const h = playSolo('hard', 'easy', i);
  if (e.stuck) stuckEasy++;
  if (h.stuck) stuckHard++;
  if (e.won) winEasy++;
  if (h.won) winHard++;
  stepsEasy += e.steps; stepsHard += h.steps;
}
console.log(`  Solo Dễ 9×9: ${N} ván — thắng ${winEasy}, kẹt ${stuckEasy}, TB ${Math.round(stepsEasy / N)} nước`);
console.log(`  Solo Khó 9×9: ${N} ván — thắng ${winHard}, kẹt ${stuckHard}, TB ${Math.round(stepsHard / N)} nước`);
t('bot Dễ: 0 ván kẹt', stuckEasy === 0);
t('bot Khó: 0 ván kẹt', stuckHard === 0);
t('bot Khó thắng nhiều hơn bot Dễ', winHard > winEasy);

/* đua bot 4 người: 2 Dễ + 2 Khó, cùng 1 bãi */
let stuckRace = 0, finishedRace = 0;
for (let seed = 1; seed <= 20; seed++) {
  const players = [
    { id: 'e1', name: 'E1', isBot: true, level: 'easy' },
    { id: 'e2', name: 'E2', isBot: true, level: 'easy' },
    { id: 'h1', name: 'H1', isBot: true, level: 'hard' },
    { id: 'h2', name: 'H2', isBot: true, level: 'hard' },
  ];
  const s = E.createGame(players, { difficulty: 'easy', seed: seed + 1000 });
  let steps = 0, stuck = false;
  while (s.phase === 'playing' && steps < 5000) {
    const pid = E.actors(s)[steps % Math.max(1, E.actors(s).length)];
    const p = players.find(x => x.id === pid);
    const a = botAction(s, pid, p);
    if (!a) { stuck = true; break; }
    const r = E.applyAction(s, pid, { type: a.type, cell: a.cell });
    if (!r.ok) { stuck = true; break; }
    steps++;
  }
  if (stuck || s.phase === 'playing') stuckRace++;
  else finishedRace++;
}
t('đua bot 4 người: 20 ván đều kết thúc, 0 kẹt', stuckRace === 0 && finishedRace === 20);

console.log(`\nMô phỏng Dò Mìn: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
