// Mô phỏng 2048: bot đua 0 ván kẹt, Máy Khó điểm cao hơn Máy Dễ.
import { createGame, applyAction } from '../js/engine.js';
import { botAction } from '../js/bot.js';

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };

function playSolo(level, seed) {
  const p = { id: 'bot', name: 'Máy', isBot: true, level };
  const s = createGame([p], { seed });
  let guard = 0;
  while (s.phase === 'playing' && guard++ < 5000) {
    const act = botAction(s, 'bot', p);
    if (!act) break; // không còn nước đi (đã kẹt nhưng chưa kịp đánh dấu)
    applyAction(s, 'bot', act);
  }
  const pr = s.prog.bot;
  return { score: pr.score, maxTile: pr.maxTile, moves: pr.moves, ended: s.phase === 'ended', reason: s.endReason, guard };
}

let easyScores = [], hardScores = [], easyMax = [], hardMax = [], stuck = 0;
const N = 60;
for (let i = 0; i < N; i++) {
  const e = playSolo('easy', 1000 + i);
  const h = playSolo('hard', 1000 + i);
  easyScores.push(e.score); hardScores.push(h.score);
  easyMax.push(e.maxTile); hardMax.push(h.maxTile);
  if (!e.ended || !h.ended) stuck++;
  if (e.guard >= 5000 || h.guard >= 5000) stuck++;
}
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
console.log(`    Dễ: điểm TB ${avg(easyScores).toFixed(0)}, ô lớn nhất TB ${avg(easyMax).toFixed(0)}`);
console.log(`    Khó: điểm TB ${avg(hardScores).toFixed(0)}, ô lớn nhất TB ${avg(hardMax).toFixed(0)}`);
console.log(`    Khó đạt 2048: ${hardMax.filter(v => v >= 2048).length}/${N} ván; Dễ đạt 2048: ${easyMax.filter(v => v >= 2048).length}/${N} ván`);
t(`mô phỏng solo ${N} ván mỗi máy: 0 ván kẹt`, stuck === 0);
t('Máy Khó điểm TB cao hơn Máy Dễ', avg(hardScores) > avg(easyScores));
t('Máy Khó ô lớn nhất TB cao hơn Máy Dễ', avg(hardMax) > avg(easyMax));

/* đua 2 bot (Dễ vs Khó) 20 ván: 0 ván kẹt, có người thắng */
let raceStuck = 0, raceWins = 0;
for (let i = 0; i < 20; i++) {
  const ps = [
    { id: 'e', name: 'Dễ', isBot: true, level: 'easy' },
    { id: 'h', name: 'Khó', isBot: true, level: 'hard' },
  ];
  const s = createGame(ps, { seed: 7000 + i });
  let guard = 0;
  while (s.phase === 'playing' && guard++ < 8000) {
    let moved = false;
    for (const p of ps) {
      const act = botAction(s, p.id, p);
      if (act) { applyAction(s, p.id, act); moved = true; }
    }
    if (!moved) break;
  }
  if (s.phase !== 'ended' || guard >= 8000) raceStuck++;
  else raceWins++;
}
t('đua 2 bot 20 ván: 0 ván kẹt, ván nào cũng có người thắng', raceStuck === 0 && raceWins === 20);

/* đua 4 bot 10 ván: 0 ván kẹt */
let race4Stuck = 0;
for (let i = 0; i < 10; i++) {
  const ps = ['a', 'b', 'c', 'd'].map((id, k) => ({ id, name: 'Máy ' + id, isBot: true, level: k % 2 ? 'hard' : 'easy' }));
  const s = createGame(ps, { seed: 9000 + i });
  let guard = 0;
  while (s.phase === 'playing' && guard++ < 12000) {
    let moved = false;
    for (const p of ps) {
      const act = botAction(s, p.id, p);
      if (act) { applyAction(s, p.id, act); moved = true; }
    }
    if (!moved) break;
  }
  if (s.phase !== 'ended' || guard >= 12000) race4Stuck++;
}
t('đua 4 bot 10 ván: 0 ván kẹt', race4Stuck === 0);

console.log(`\nMô phỏng 2048: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
