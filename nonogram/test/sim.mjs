/* Nonogram sim tests — bot matches: 0 kẹt, 0 sai luật, đo tỉ lệ thắng.
   Math.random được seed lại trước mỗi ván để kết quả ổn định.
   Lưu ý: Nonogram là game theo lượt (không có tick) nên mỗi bước mỗi
   actor đi đúng 1 nước bot. */
import { createGame, applyAction, actors, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }

function drive(s, maxSteps = 3000) {
  /* Chạy 1 ván tới khi kết thúc: mỗi bước, mỗi actor đi 1 nước bot. */
  let steps = 0, illegal = 0, stuck = false;
  while (s.phase === 'playing' && steps < maxSteps) {
    steps++;
    let acted = false;
    for (const pid of actors(s)) {
      if (s.phase !== 'playing') break; // người trước có thể vừa kết thúc ván
      const act = botAction(s, pid);
      if (act) {
        acted = true;
        const r = applyAction(s, pid, act);
        if (!r.ok) illegal++;
      }
    }
    if (!acted && s.phase === 'playing') { stuck = true; break; } /* không ai đi được mà ván chưa xong = kẹt */
  }
  if (s.phase === 'playing') stuck = true;
  return { steps, illegal, ended: s.phase === 'ended', winner: s.winner, stuck };
}

function soloGame(level, seed, size) {
  Math.random = mulberry32(seed);
  return createGame([{ id: 'p1', name: 'P1', isBot: true, level }], { seed, ngMode: 'solo', size });
}
function raceGame(levels, seed, size = 10) {
  Math.random = mulberry32(seed);
  return createGame(levels.map((l, i) => ({ id: 'p' + (i + 1), name: 'P' + (i + 1), isBot: true, level: l })), { seed, ngMode: 'race', size });
}

// --- chơi đơn: tỉ lệ thắng theo kích thước ---
for (const size of [5, 10, 15]) {
  const N = size === 15 ? 10 : 20;
  const stats = {};
  for (const level of ['easy', 'hard']) {
    let wins = 0, illegal = 0, ended = 0, stuck = 0, steps = 0, clean = 0, mistakes = 0;
    for (let i = 0; i < N; i++) {
      const s = soloGame(level, 1000 + i * 7 + size, size);
      const r = drive(s);
      if (r.ended) ended++;
      if (r.stuck) stuck++;
      if (s.winner === 'p1') {
        wins++;
        if (s.prog.p1.mistakes === 0) clean++;
      }
      mistakes += s.prog.p1.mistakes;
      steps += r.steps;
      illegal += r.illegal;
    }
    stats[level] = { wins, illegal, ended, stuck, steps, clean, mistakes };
    console.log(`  solo ${size}x${size} ${level}: thắng ${wins}/${N}, kẹt ${stuck}/${N}, illegal=${illegal}, ended=${ended}/${N}, bước TB ${Math.round(steps / N)}, thắng không lỗi ${clean}/${wins}, lỗi TB ${(mistakes / N).toFixed(1)}`);
  }
  check(`solo ${size}x${size}: mọi ván đều kết thúc`, stats.easy.ended === N && stats.hard.ended === N);
  check(`solo ${size}x${size}: 0 nước sai luật`, stats.easy.illegal === 0 && stats.hard.illegal === 0);
  check(`solo ${size}x${size}: 0 ván kẹt`, stats.easy.stuck === 0 && stats.hard.stuck === 0);
  check(`solo ${size}x${size}: Hard thắng nhiều hơn Easy rõ rệt`, stats.hard.wins > stats.easy.wins,
    `hard=${stats.hard.wins} easy=${stats.easy.wins}`);
}

// --- đua: Hard vs Easy ---
function raceStats(l1, l2, label, size = 10, N = 20) {
  let w1 = 0, w2 = 0, draws = 0, illegal = 0, ended = 0, stuck = 0;
  for (let i = 0; i < N; i++) {
    const s = raceGame([l1, l2], 2000 + i * 13, size);
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
check('đua: mọi ván đều kết thúc', he.ended === 20);
check('đua: 0 nước sai luật', he.illegal === 0);
check('đua: 0 ván kẹt', he.stuck === 0);
check('đua Hard thắng Easy với tỉ lệ rõ rệt (≥16/20)', he.w1 >= 16, `hard thắng ${he.w1}/20`);
const eh = raceStats('easy', 'hard', 'Easy vs Hard');
check('đua đảo chiều: Hard (p2) vẫn thắng nhiều (≥16/20)', eh.w2 >= 16, `hard thắng ${eh.w2}/20`);

// --- đua 4 người không kẹt ---
{
  let w1 = 0, draws = 0, illegal = 0, ended = 0, stuck = 0;
  for (let i = 0; i < 10; i++) {
    const s = raceGame(['hard', 'easy', 'easy', 'easy'], 3000 + i * 17, 10);
    const r = drive(s);
    if (r.ended) ended++;
    if (r.stuck) stuck++;
    if (s.winner === 'p1') w1++;
    else if (!s.winner) draws++;
    illegal += r.illegal;
  }
  console.log(`  đua 4 người (Khó vs 3 Dễ): Khó thắng ${w1}/10, hoà ${draws}/10, kẹt ${stuck}/10, ended=${ended}/10`);
  check('đua 4 người: mọi ván đều kết thúc', ended === 10);
  check('đua 4 người: 0 nước sai luật', illegal === 0);
  check('đua 4 người: 0 ván kẹt', stuck === 0);
  check('đua 4 người: Khó thắng nhiều nhất (≥7/10)', w1 >= 7, `hard thắng ${w1}/10`);
}

// --- bot chỉ trả về nước hợp lệ (fill/mark với tọa độ trong bảng) ---
{
  Math.random = mulberry32(55);
  const s = createGame([{ id: 'p1', name: 'P1', isBot: true, level: 'easy' }], { seed: 55, ngMode: 'solo', size: 10 });
  let bad = 0;
  for (let i = 0; i < 300 && s.phase === 'playing'; i++) {
    const a = botAction(s, 'p1');
    if (a && !((a.type === 'fill' || a.type === 'mark') && Number.isInteger(a.x) && Number.isInteger(a.y) && a.x >= 0 && a.x < 10 && a.y >= 0 && a.y < 10)) bad++;
    if (a) applyAction(s, 'p1', a);
  }
  check('bot chỉ trả về nước hợp lệ', bad === 0, `bad=${bad}`);
}

// --- bot Hard không bao giờ tô sai ô đã đánh dấu X / ô bị khóa ---
{
  Math.random = mulberry32(99);
  const s = createGame([{ id: 'p1', name: 'P1', isBot: true, level: 'hard' }], { seed: 99, ngMode: 'solo', size: 10 });
  let bad = 0, moves = 0;
  while (s.phase === 'playing' && moves < 400) {
    moves++;
    const a = botAction(s, 'p1');
    if (!a) break;
    const cell = s.prog.p1.grid[a.y][a.x];
    if (a.type === 'fill' && (cell === 2 || cell === 3)) bad++;
    applyAction(s, 'p1', a);
  }
  check('bot Hard không tô vào ô đã đánh dấu/khóa', bad === 0, `bad=${bad}`);
}

console.log(`\nNonogram sim: ${pass} pass, ${fail} fail.`);
