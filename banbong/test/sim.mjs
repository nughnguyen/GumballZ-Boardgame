/* Bắn Bóng sim tests — bot matches: 0 kẹt, 0 sai luật, đo tỉ lệ thắng.
   Math.random được seed lại trước mỗi ván để kết quả ổn định. */
import { createGame, applyAction, actors, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }

function drive(s, maxSteps = 40000) {
  /* Chạy 1 ván tới khi kết thúc: mỗi bước, mỗi actor đi 1 nước bot rồi
     bóng đi 1 tick (mô phỏng đồng hồ của chủ phòng). */
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
  return createGame([{ id: 'p1', name: 'P1', isBot: true, level }], { seed, bbMode: 'solo' });
}
function raceGame(levels, seed) {
  Math.random = mulberry32(seed);
  return createGame(levels.map((l, i) => ({ id: 'p' + (i + 1), name: 'P' + (i + 1), isBot: true, level: l })), { seed, bbMode: 'race' });
}

// --- chơi đơn: tỉ lệ phá hết gạch ---
const N = 20;
const soloStats = {};
for (const level of ['easy', 'hard']) {
  let wins = 0, illegal = 0, ended = 0, stuck = 0, steps = 0, clean = 0;
  for (let i = 0; i < N; i++) {
    const s = soloGame(level, 1000 + i);
    const r = drive(s);
    if (r.ended) ended++;
    if (r.stuck) stuck++;
    if (s.winner === 'p1') {
      wins++;
      if (s.prog.p1.ballsLost === 0) clean++;
    }
    steps += r.steps;
    illegal += r.illegal;
  }
  soloStats[level] = { wins, illegal, ended, stuck, steps, clean };
  console.log(`  solo ${level}: thắng ${wins}/${N}, kẹt ${stuck}/${N}, illegal=${illegal}, ended=${ended}/${N}, steps TB ${Math.round(steps / N)}, không mất mạng ${clean}/${wins}`);
}
check('solo: mọi ván đều kết thúc', soloStats.easy.ended === N && soloStats.hard.ended === N);
check('solo: 0 nước sai luật', soloStats.easy.illegal === 0 && soloStats.hard.illegal === 0);
check('solo: 0 ván kẹt', soloStats.easy.stuck === 0 && soloStats.hard.stuck === 0);
check('solo Hard thắng gần hết (≥18/20)', soloStats.hard.wins >= 18, `hard=${soloStats.hard.wins}`);
check('solo Hard thắng nhiều hơn Easy rõ rệt', soloStats.hard.wins > soloStats.easy.wins,
  `hard=${soloStats.hard.wins} easy=${soloStats.easy.wins}`);
check('solo Hard thắng mà không mất mạng (bot giữ bóng tốt)', soloStats.hard.clean >= 15, `clean=${soloStats.hard.clean}/${soloStats.hard.wins}`);

// --- đua: Hard vs Easy ---
function raceStats(l1, l2, label) {
  let w1 = 0, w2 = 0, draws = 0, illegal = 0, ended = 0, stuck = 0;
  for (let i = 0; i < N; i++) {
    const s = raceGame([l1, l2], 2000 + i);
    const r = drive(s);
    if (r.ended) ended++;
    if (r.stuck) stuck++;
    if (s.winner === 'p1') w1++;
    else if (s.winner === 'p2') w2++;
    else draws++;
    illegal += r.illegal;
  }
  console.log(`  đua ${label}: p1 thắng ${w1}/${N}, p2 thắng ${w2}/${N}, hoà ${draws}/${N}, kẹt ${stuck}/${N}, illegal=${illegal}, ended=${ended}/${N}`);
  return { w1, w2, draws, illegal, ended, stuck };
}
const he = raceStats('hard', 'easy', 'Hard vs Easy');
check('đua: mọi ván đều kết thúc', he.ended === N);
check('đua: 0 nước sai luật', he.illegal === 0);
check('đua: 0 ván kẹt', he.stuck === 0);
check('đua Hard thắng Easy với tỉ lệ rõ rệt (≥16/20)', he.w1 >= 16, `hard thắng ${he.w1}/${N}`);
const eh = raceStats('easy', 'hard', 'Easy vs Hard');
check('đua đảo chiều: Hard (p2) vẫn thắng nhiều (≥16/20)', eh.w2 >= 16, `hard thắng ${eh.w2}/${N}`);

// --- đua 4 người không kẹt ---
{
  let w1 = 0, draws = 0, illegal = 0, ended = 0, stuck = 0;
  for (let i = 0; i < N; i++) {
    const s = raceGame(['hard', 'easy', 'easy', 'easy'], 3000 + i);
    const r = drive(s);
    if (r.ended) ended++;
    if (r.stuck) stuck++;
    if (s.winner === 'p1') w1++;
    else if (!s.winner) draws++;
    illegal += r.illegal;
  }
  console.log(`  đua 4 người (Khó vs 3 Dễ): Khó thắng ${w1}/${N}, hoà ${draws}/${N}, kẹt ${stuck}/${N}, ended=${ended}/${N}`);
  check('đua 4 người: mọi ván đều kết thúc', ended === N);
  check('đua 4 người: 0 nước sai luật', illegal === 0);
  check('đua 4 người: 0 ván kẹt', stuck === 0);
  check('đua 4 người: Khó thắng nhiều nhất (≥12/20)', w1 >= 12, `hard thắng ${w1}/${N}`);
}

// --- bot chỉ trả về nước hợp lệ (null hoặc setX với x là số) ---
{
  Math.random = mulberry32(55);
  const s = createGame([{ id: 'p1', name: 'P1', isBot: true, level: 'easy' }], { seed: 55, bbMode: 'solo' });
  let bad = 0;
  for (let i = 0; i < 300 && s.phase === 'playing'; i++) {
    const a = botAction(s, 'p1');
    if (a && !(a.type === 'setX' && Number.isFinite(a.x))) bad++;
    if (a) applyAction(s, 'p1', a);
    applyAction(s, 'p1', { type: 'tick' });
  }
  check('bot chỉ trả về nước hợp lệ', bad === 0, `bad=${bad}`);
}

console.log(`\nBắn Bóng sim: ${pass} pass, ${fail} fail.`);
