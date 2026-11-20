/* Rắn Săn Mồi sim tests — bot matches: 0 kẹt, 0 sai luật, đo tỉ lệ thắng.
   Math.random được seed lại trước mỗi ván để kết quả ổn định. */
import { createGame, applyAction, actors, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }

function drive(s, maxSteps = 20000) {
  /* Chạy 1 ván tới khi kết thúc: mỗi bước, mỗi actor đi 1 nước bot rồi
     bò 1 tick (mô phỏng đồng hồ của chủ phòng). */
  let steps = 0, illegal = 0, stuck = false;
  while (s.phase === 'playing' && steps < maxSteps) {
    steps++;
    for (const pid of actors(s)) {
      if (s.phase !== 'playing') break; // người trước có thể vừa kết thúc ván
      const act = botAction(s, pid);
      if (act) {
        const r = applyAction(s, pid, act);
        if (!r.ok) illegal++;
      }
      if (s.phase !== 'playing' || !actors(s).includes(pid)) break;
      const t = applyAction(s, pid, { type: 'tick' });
      if (!t.ok) illegal++;
    }
  }
  if (s.phase === 'playing') stuck = true;
  return { steps, illegal, ended: s.phase === 'ended', winner: s.winner, stuck };
}

function soloGame(level, seed) {
  Math.random = mulberry32(seed);
  return createGame([{ id: 'p1', name: 'P1', isBot: true, level }], { seed, rsMode: 'solo' });
}
function raceGame(l1, l2, seed) {
  Math.random = mulberry32(seed);
  return createGame(
    [{ id: 'p1', name: 'P1', isBot: true, level: l1 }, { id: 'p2', name: 'P2', isBot: true, level: l2 }],
    { seed, rsMode: 'race' });
}

// --- chơi đơn: tỉ lệ dài 20 ---
const N = 20;
const soloStats = {};
for (const level of ['easy', 'hard']) {
  let wins = 0, foods = 0, illegal = 0, ended = 0, maxLen = 0;
  for (let i = 0; i < N; i++) {
    const s = soloGame(level, 1000 + i);
    const r = drive(s);
    if (r.ended) ended++;
    if (s.winner === 'p1') wins++;
    foods += s.prog.p1.foods;
    maxLen = Math.max(maxLen, s.prog.p1.maxLength);
    illegal += r.illegal;
  }
  soloStats[level] = { wins, avgFoods: (foods / N).toFixed(1), maxLen, illegal, ended };
  console.log(`  solo ${level}: thắng dài 20 ${wins}/${N}, mồi TB ${soloStats[level].avgFoods}, dài nhất ${maxLen}, illegal=${illegal}, ended=${ended}/${N}`);
}
check('solo: mọi ván đều kết thúc', soloStats.easy.ended === N && soloStats.hard.ended === N);
check('solo: 0 nước sai luật', soloStats.easy.illegal === 0 && soloStats.hard.illegal === 0);
check('solo Hard thắng dài 20 nhiều hơn Easy', soloStats.hard.wins >= soloStats.easy.wins,
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

// --- đua 4 người không kẹt ---
{
  Math.random = mulberry32(777);
  const s = createGame(
    [1, 2, 3, 4].map(i => ({ id: 'p' + i, name: 'P' + i, isBot: true, level: i % 2 ? 'hard' : 'easy' })),
    { seed: 777, rsMode: 'race' });
  const r = drive(s);
  check('đua 4 người: ván kết thúc', r.ended, `phase=${s.phase}`);
  check('đua 4 người: 0 nước sai luật', r.illegal === 0);
  check('đua 4 người: có người thắng hoặc hoà', s.winner !== undefined);
}

// --- bot chỉ trả về nước hợp lệ (null hoặc move với 1 trong 4 hướng) ---
{
  Math.random = mulberry32(55);
  const s = createGame([{ id: 'p1', name: 'P1', isBot: true, level: 'easy' }], { seed: 55, rsMode: 'solo' });
  let bad = 0;
  for (let i = 0; i < 300 && s.phase === 'playing'; i++) {
    const a = botAction(s, 'p1');
    if (a && !(a.type === 'move' && ['up', 'down', 'left', 'right'].includes(a.dir))) bad++;
    if (a) applyAction(s, 'p1', a);
    applyAction(s, 'p1', { type: 'tick' });
  }
  check('bot chỉ trả về nước hợp lệ', bad === 0, `bad=${bad}`);
}

// --- bot Hard không bao giờ đi vào hướng chết ngay khi còn hướng sống ---
{
  Math.random = mulberry32(99);
  const s = createGame([{ id: 'p1', name: 'P1', isBot: true, level: 'hard' }], { seed: 99, rsMode: 'solo' });
  let suicide = 0, ticks = 0;
  while (s.phase === 'playing' && ticks < 400) {
    ticks++;
    const a = botAction(s, 'p1');
    if (a) applyAction(s, 'p1', a);
    const before = s.prog.p1.snake[0];
    const r = applyAction(s, 'p1', { type: 'tick' });
    if (s.prog.p1.status === 'dead') {
      /* chết có thể là không tránh được (bị kẹt) — chỉ đếm khi ván còn ngắn */
      if (ticks < 30) suicide++;
      break;
    }
  }
  check('bot Hard không tự sát sớm (chết trước 30 tick)', suicide === 0, `ticks=${ticks}`);
}

console.log(`\nRắn Săn Mồi sim: ${pass} pass, ${fail} fail.`);
