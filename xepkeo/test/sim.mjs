/* Xếp Kẹo sim tests — bot đấu bot nhiều ván, seed ổn định.
   Ngưỡng đã hiệu chuẩn 2026-11-20 (phân phối đầy 30 lượt, n=100/trình độ):
   solo target 10000: Hard thắng 100/100, Easy 90/100, ngẫu nhiên 26/100;
   đua Hard vs Easy: Hard thắng 20/20. */
import { createGame, applyAction, actors, hasLegalMove, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }

/* Chạy 1 ván tới cùng bằng bot; trả về {s, illegal, stuck}. */
function drive(s) {
  let illegal = 0, stuck = 0, guard = 0;
  while (s.phase === 'playing' && guard++ < 400) {
    for (const pid of actors(s)) {
      if (s.phase !== 'playing') break;
      const a = botAction(s, pid);
      if (!a) { stuck++; break; }
      const r = applyAction(s, pid, a);
      if (!r.ok) illegal++;
      else if (s.prog[pid].status === 'playing' && !hasLegalMove(s.prog[pid].grid)) stuck++;
    }
  }
  if (s.phase !== 'ended') stuck++;
  return { s, illegal, stuck };
}
const solo = (level, seed) => {
  Math.random = mulberry32(seed);
  return drive(createGame([{ id: 'p1', name: 'P1', isBot: true, level }], { seed, xcMode: 'solo' }));
};
const race = (levels, seed) => {
  Math.random = mulberry32(seed);
  const players = levels.map((lv, i) => ({ id: 'p' + (i + 1), name: 'P' + (i + 1), isBot: true, level: lv }));
  return drive(createGame(players, { seed, xcMode: 'race' }));
};

const N = 20;
let illegal = 0, stuck = 0;

// --- chơi đơn: Khó thắng gần như mọi ván (mốc 10000, 30 lượt tối đa 28240+) ---
{
  let wins = 0, bigMove = 0, casc10 = 0;
  for (let i = 0; i < N; i++) {
    const r = solo('hard', 70000 + i);
    illegal += r.illegal; stuck += r.stuck;
    if (r.s.winner === 'p1') {
      wins++;
      if (r.s.final.summary.p1.bestMoveScore >= 5000) bigMove++;
      if (r.s.final.summary.p1.maxCascade >= 10) casc10++;
    }
  }
  check(`solo Khó thắng ≥18/20 (mốc 10000)`, wins >= 18, `wins=${wins}`);
  console.log(`  solo Khó: thắng ${wins}/${N} | trong các ván thắng: 1 nước ≥5000đ: ${bigMove} | dây chuyền ×10+: ${casc10}`);
}

// --- chơi đơn: Dễ thắng đa số ---
{
  let wins = 0;
  for (let i = 0; i < N; i++) {
    const r = solo('easy', 71000 + i);
    illegal += r.illegal; stuck += r.stuck;
    if (r.s.winner === 'p1') wins++;
  }
  check(`solo Dễ thắng ≥12/20 (mốc 10000)`, wins >= 12, `wins=${wins}`);
  console.log(`  solo Dễ: thắng ${wins}/${N}`);
}

// --- đua: Khó thắng Dễ đa số (cả 2 ghế) ---
{
  let winsH = 0, winsH2 = 0;
  for (let i = 0; i < N; i++) {
    const r1 = race(['hard', 'easy'], 72000 + i);
    illegal += r1.illegal; stuck += r1.stuck;
    if (r1.s.winner === 'p1') winsH++;
    const r2 = race(['easy', 'hard'], 73000 + i);
    illegal += r2.illegal; stuck += r2.stuck;
    if (r2.s.winner === 'p2') winsH2++;
  }
  check(`đua Khó thắng Dễ ≥17/20 (ghế 1)`, winsH >= 17, `wins=${winsH}`);
  check(`đua Khó thắng Dễ ≥17/20 (ghế 2)`, winsH2 >= 17, `wins=${winsH2}`);
  console.log(`  đua Khó vs Dễ: Khó thắng ${winsH}/20 (ghế 1), ${winsH2}/20 (ghế 2)`);
}

// --- đua 4 người: Khó thắng đa số ---
{
  let wins = 0, draws = 0;
  for (let i = 0; i < N; i++) {
    const r = race(['hard', 'easy', 'easy', 'easy'], 74000 + i);
    illegal += r.illegal; stuck += r.stuck;
    if (r.s.winner === 'p1') wins++;
    else if (r.s.winner === null) draws++;
  }
  check(`đua 4 người Khó thắng ≥14/20`, wins >= 14, `wins=${wins} draws=${draws}`);
  console.log(`  đua 4 người (Khó vs 3 Dễ): Khó thắng ${wins}/20, hoà ${draws}/20`);
}

// --- không ván nào kẹt, không nước nào sai luật ---
check('0 ván kẹt (mọi ván đều kết thúc, bảng luôn có nước đi)', stuck === 0, `stuck=${stuck}`);
check('0 nước sai luật trong tất cả các ván sim', illegal === 0, `illegal=${illegal}`);

console.log(`\nXếp Kẹo sim: ${pass} pass, ${fail} fail.`);
