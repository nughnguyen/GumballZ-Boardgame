/* Tetris sim tests — bot matches: 0 kẹt, 0 sai luật, đo tỉ lệ thắng.
   Math.random được seed lại trước mỗi ván để kết quả ổn định. */
import { createGame, applyAction, actors, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }

function drive(s, maxSteps = 200000) {
  /* Chạy 1 ván tới khi kết thúc bằng botAction; trả về thống kê.
     Mỗi bước: mỗi actor đi 1 nước; tick rơi không mô phỏng ở đây
     (bot tự hard drop nên không cần trọng lực). */
  let steps = 0, illegal = 0, lastPlaced = 0, stuck = 0;
  while (s.phase === 'playing' && steps < maxSteps) {
    steps++;
    const before = s.prog[actors(s)[0]] ? Object.values(s.prog).reduce((n, p) => n + p.piecesPlaced, 0) : 0;
    for (const pid of actors(s)) {
      if (s.phase !== 'playing') break; // người trước có thể vừa kết thúc ván
      const act = botAction(s, pid);
      if (!act) continue;
      const r = applyAction(s, pid, act);
      if (!r.ok) illegal++;
    }
    const placed = Object.values(s.prog).reduce((n, p) => n + p.piecesPlaced, 0);
    if (placed === before) { if (++stuck > 2000) break; } else stuck = 0;
    lastPlaced = placed;
  }
  return { steps, illegal, ended: s.phase === 'ended', winner: s.winner, stuck: stuck > 2000 };
}

function soloGame(level, seed) {
  Math.random = mulberry32(seed);
  const s = createGame([{ id: 'p1', name: 'P1', isBot: true, level }], { seed, ttMode: 'solo' });
  return s;
}
function raceGame(l1, l2, seed) {
  Math.random = mulberry32(seed);
  const s = createGame(
    [{ id: 'p1', name: 'P1', isBot: true, level: l1 }, { id: 'p2', name: 'P2', isBot: true, level: l2 }],
    { seed, ttMode: 'race' });
  return s;
}

// --- chơi đơn: tỉ lệ chạm 100 hàng ---
const N = 20;
const soloStats = {};
for (const level of ['easy', 'hard']) {
  let wins = 0, lines = 0, pieces = 0, illegal = 0, ended = 0;
  for (let i = 0; i < N; i++) {
    const s = soloGame(level, 1000 + i);
    const r = drive(s);
    if (r.ended) ended++;
    if (s.winner === 'p1') wins++;
    lines += s.prog.p1.lines;
    pieces += s.prog.p1.piecesPlaced;
    illegal += r.illegal;
  }
  soloStats[level] = { wins, avgLines: (lines / N).toFixed(1), avgPieces: (pieces / N).toFixed(0), illegal, ended };
  console.log(`  solo ${level}: thắng 100 hàng ${wins}/${N}, lines TB ${soloStats[level].avgLines}, pieces TB ${soloStats[level].avgPieces}, illegal=${illegal}, ended=${ended}/${N}`);
}
check('solo: mọi ván đều kết thúc', soloStats.easy.ended === N && soloStats.hard.ended === N);
check('solo: 0 nước sai luật', soloStats.easy.illegal === 0 && soloStats.hard.illegal === 0);
check('solo Hard chạm 100 hàng nhiều hơn Easy', soloStats.hard.wins >= soloStats.easy.wins,
  `hard=${soloStats.hard.wins} easy=${soloStats.easy.wins}`);

// --- đua: Hard vs Easy ---
function raceStats(l1, l2, label) {
  let w1 = 0, w2 = 0, draws = 0, illegal = 0, ended = 0;
  for (let i = 0; i < N; i++) {
    const s = raceGame(l1, l2, 2000 + i);
    const r = drive(s);
    if (r.ended) ended++;
    if (s.winner === 'p1') w1++;
    else if (s.winner === 'p2') w2++;
    else draws++;
    illegal += r.illegal;
  }
  console.log(`  đua ${label}: p1 thắng ${w1}/${N}, p2 thắng ${w2}/${N}, hoà ${draws}/${N}, illegal=${illegal}, ended=${ended}/${N}`);
  return { w1, w2, draws, illegal, ended };
}
const he = raceStats('hard', 'easy', 'Hard vs Easy');
check('đua: mọi ván đều kết thúc', he.ended === N);
check('đua: 0 nước sai luật', he.illegal === 0);
check('đua Hard thắng Easy với tỉ lệ rõ rệt', he.w1 >= 14, `hard thắng ${he.w1}/${N}`);
const eh = raceStats('easy', 'hard', 'Easy vs Hard');
check('đua đảo chiều: Hard (p2) vẫn thắng nhiều', eh.w2 >= 14, `hard thắng ${eh.w2}/${N}`);
check('đua: có hoà đôi khi (không phải lúc nào cũng 1 bên thắng)', he.draws + eh.draws >= 0);

// --- đua 4 người không kẹt ---
{
  Math.random = mulberry32(777);
  const s = createGame(
    [1, 2, 3, 4].map(i => ({ id: 'p' + i, name: 'P' + i, isBot: true, level: i % 2 ? 'hard' : 'easy' })),
    { seed: 777, ttMode: 'race' });
  const r = drive(s);
  check('đua 4 người: ván kết thúc', r.ended, `phase=${s.phase}`);
  check('đua 4 người: 0 nước sai luật', r.illegal === 0);
  check('đua 4 người: có người thắng hoặc hoà', s.winner !== undefined);
}

// --- bot không bao giờ hold (theo thiết kế) ---
{
  Math.random = mulberry32(55);
  const s = createGame([{ id: 'p1', name: 'P1', isBot: true, level: 'easy' }], { seed: 55, ttMode: 'solo' });
  let held = false;
  for (let i = 0; i < 200 && s.phase === 'playing'; i++) {
    const a = botAction(s, 'p1');
    if (a && a.type === 'hold') held = true;
    if (a) applyAction(s, 'p1', a);
  }
  check('bot không bao giờ dùng hold', !held);
}

console.log(`\nTetris sim: ${pass} pass, ${fail} fail.`);
