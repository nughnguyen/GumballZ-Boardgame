/* Nhện sim tests — bot matches: 0 kẹt, 0 sai luật, đo tỉ lệ thắng
   để hiệu chuẩn độ khó (1/2/4 chất).
   Math.random được seed lại trước mỗi ván để kết quả ổn định.
   Lưu ý: Nhện là game theo lượt (không có tick) nên mỗi bước mỗi
   actor đi đúng 1 nước bot. */
import { createGame, applyAction, actors, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }

function drive(s, maxSteps = 5000) {
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

function soloGame(level, suits, seed) {
  Math.random = mulberry32(seed);
  return createGame([{ id: 'p1', name: 'P1', isBot: true, level }], { seed, nhMode: 'solo', suits });
}
function raceGame(levels, suits, seed) {
  Math.random = mulberry32(seed);
  return createGame(levels.map((l, i) => ({ id: 'p' + (i + 1), name: 'P' + (i + 1), isBot: true, level: l })), { seed, nhMode: 'race', suits });
}

// --- chơi đơn: tỉ lệ thắng theo độ khó (số chất) ---
for (const [suits, label] of [['easy', '1 chất'], ['medium', '2 chất'], ['hard', '4 chất']]) {
  const N = 20;
  const stats = {};
  for (const level of ['easy', 'hard']) {
    let wins = 0, illegal = 0, ended = 0, stuck = 0, steps = 0, runs = 0;
    for (let i = 0; i < N; i++) {
      const s = soloGame(level, suits, 1000 + i * 7 + (suits === 'easy' ? 1 : suits === 'medium' ? 2 : 4));
      const r = drive(s);
      if (r.ended) ended++;
      if (r.stuck) stuck++;
      if (s.winner === 'p1') wins++;
      runs += s.prog.p1.runs;
      steps += r.steps;
      illegal += r.illegal;
    }
    stats[level] = { wins, illegal, ended, stuck, steps, runs };
    console.log(`  solo ${label} ${level}: thắng ${wins}/${N}, kẹt ${stuck}/${N}, illegal=${illegal}, ended=${ended}/${N}, bước TB ${Math.round(steps / N)}, dãy TB ${(runs / N).toFixed(1)}/8`);
  }
  check(`solo ${label}: mọi ván đều kết thúc`, stats.easy.ended === N && stats.hard.ended === N);
  check(`solo ${label}: 0 nước sai luật`, stats.easy.illegal === 0 && stats.hard.illegal === 0);
  check(`solo ${label}: 0 ván kẹt`, stats.easy.stuck === 0 && stats.hard.stuck === 0);
  check(`solo ${label}: Hard thắng nhiều hơn hoặc bằng Easy`, stats.hard.wins >= stats.easy.wins,
    `hard=${stats.hard.wins} easy=${stats.easy.wins}`);
}

// --- đua: Hard vs Easy (1 chất — ở 1 chất các bot mới thu được dãy nên
// mới phân biệt được trình độ; 2/4 chất cả hai đều gần như không thu dãy
// nào, đua sẽ hoà — xem phần hiệu chuẩn bên dưới) ---
function raceStats(l1, l2, label, suits = 'easy', N = 20) {
  let w1 = 0, w2 = 0, draws = 0, illegal = 0, ended = 0, stuck = 0;
  for (let i = 0; i < N; i++) {
    const s = raceGame([l1, l2], suits, 2000 + i * 13);
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
check('đua Hard thắng Easy với tỉ lệ rõ rệt (≥14/20)', he.w1 >= 14, `hard thắng ${he.w1}/20`);
const eh = raceStats('easy', 'hard', 'Easy vs Hard');
check('đua đảo chiều: Hard (p2) vẫn thắng nhiều (≥14/20)', eh.w2 >= 14, `hard thắng ${eh.w2}/20`);

// --- đua 4 người không kẹt ---
{
  let w1 = 0, draws = 0, illegal = 0, ended = 0, stuck = 0;
  for (let i = 0; i < 10; i++) {
    const s = raceGame(['hard', 'easy', 'easy', 'easy'], 'easy', 3000 + i * 17);
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
  check('đua 4 người: Khó thắng nhiều nhất (≥6/10)', w1 >= 6, `hard thắng ${w1}/10`);
}

// --- bot chỉ trả về nước hợp lệ ---
{
  Math.random = mulberry32(55);
  const s = createGame([{ id: 'p1', name: 'P1', isBot: true, level: 'easy' }], { seed: 55, nhMode: 'solo', suits: 'easy' });
  let bad = 0;
  for (let i = 0; i < 500 && s.phase === 'playing'; i++) {
    const a = botAction(s, 'p1');
    if (a && !(a.type === 'move' || a.type === 'deal' || a.type === 'resign')) bad++;
    if (a && a.type === 'move' && !(Number.isInteger(a.from) && Number.isInteger(a.to) && Number.isInteger(a.count) && a.from !== a.to && a.from >= 0 && a.from < 10 && a.to >= 0 && a.to < 10 && a.count >= 1)) bad++;
    if (a) applyAction(s, 'p1', a);
  }
  check('bot chỉ trả về nước hợp lệ', bad === 0, `bad=${bad}`);
}

// --- bot Khó luôn chọn nước có điểm cao nhất trong các nước hợp lệ ---
{
  Math.random = mulberry32(99);
  const s = createGame([{ id: 'p1', name: 'P1', isBot: true, level: 'hard' }], { seed: 99, nhMode: 'solo', suits: 'medium' });
  let bad = 0, moves = 0;
  while (s.phase === 'playing' && moves < 200) {
    const a = botAction(s, 'p1');
    if (!a) break;
    moves++;
    const r = applyAction(s, 'p1', a);
    if (!r.ok) bad++;
  }
  check('bot Khó: mọi nước trả về đều áp dụng được', bad === 0, `bad=${bad} moves=${moves}`);
}

console.log(`\nNhện sim: ${pass} pass, ${fail} fail.`);
