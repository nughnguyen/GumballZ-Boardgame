/* Kéo Búa Bao sim tests — mô phỏng nhiều ván, kiểm tra không kẹt +
   hiệu chuẩn tỉ lệ thắng / thành tựu. Bot dùng Math.random nên seed
   Math.random bằng mulberry32 trước mỗi ván để ổn định. */
import {
  createGame, applyAction, actors, mulberry32,
} from '../js/engine.js?v=1';
import { botAction } from '../js/bot.js?v=1';

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('  ✓ ' + name + (extra ? ' — ' + extra : '')); }
  else { fail++; console.log('  ✗ FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}
function mk(seed, mode, l1, l2) {
  Math.random = mulberry32(seed);
  return createGame([
    { id: 'p1', name: 'P1', isBot: true, level: l1 },
    { id: 'p2', name: 'P2', isBot: true, level: l2 },
  ], { seed, kbbMode: mode });
}
function drive(s, maxSteps = 100) {
  let steps = 0;
  while (s.phase === 'playing' && steps < maxSteps) {
    for (const pid of actors(s)) {
      if (s.phase !== 'playing') break;
      const a = botAction(s, pid);
      if (!a) return { ok: false, why: 'bot null' };
      const r = applyAction(s, pid, a);
      if (!r.ok) return { ok: false, why: 'rejected: ' + r.reason };
      steps++;
    }
  }
  return { ok: s.phase === 'ended', why: s.phase };
}
/* đo n ván: thắng p1, kẹt, comeback (thắng sau khi bị dẫn 0-2),
   streak3 (thắng với chuỗi 3 vòng), số vòng hoà trung bình */
function measure(n, mode, l1, l2, startSeed) {
  let wins = 0, stuck = 0, comeback = 0, streak3 = 0, ties = 0;
  for (let i = 0; i < n; i++) {
    const s = mk(startSeed + i, mode, l1, l2);
    const r = drive(s);
    if (!r.ok) { stuck++; continue; }
    const sum = s.final.summary.p1;
    if (s.winner === 'p1') {
      wins++;
      if (sum.trailed02) comeback++;
      if (sum.maxStreak >= 3) streak3++;
    }
    ties += sum.ties;
  }
  return { wins, stuck, comeback, streak3, ties, winRate: wins / n, comebackRate: wins ? comeback / wins : 0, streak3Rate: wins ? streak3 / wins : 0 };
}

console.log('Kéo Búa Bao sim:');

// 1. solo Hard — tỉ lệ thắng ở best-of-5 (bot-vs-bot, ~50% là đúng)
{
  const m = measure(100, 'solo', 'hard', 'hard', 1000);
  check('solo Hard: 0 ván kẹt', m.stuck === 0);
  check('solo Hard: thắng 40–65/100', m.wins >= 40 && m.wins <= 65, m.wins + '/100');
  check('solo Hard: comeback 0–10% số ván thắng', m.comebackRate <= 0.10, (m.comebackRate * 100).toFixed(1) + '%');
  check('solo Hard: streak3 15–60% số ván thắng', m.streak3Rate >= 0.15 && m.streak3Rate <= 0.60, (m.streak3Rate * 100).toFixed(1) + '%');
}

// 2. solo Easy
{
  const m = measure(100, 'solo', 'easy', 'easy', 2000);
  check('solo Easy: 0 ván kẹt', m.stuck === 0);
  check('solo Easy: thắng 40–65/100', m.wins >= 40 && m.wins <= 65, m.wins + '/100');
}

// 3. match HvH — cân bằng 2 ghế
{
  const m = measure(50, 'match', 'hard', 'hard', 3000);
  check('đấu HvH: 0 ván kẹt', m.stuck === 0);
  check('đấu HvH: p1 thắng 15–35/50 (cân bằng ghế)', m.wins >= 15 && m.wins <= 35, m.wins + '/50');
}

// 4. match HvE / EvH — matching pennies: bot-vs-bot Hard ≈ Easy là
// ĐÚNG lý thuyết (đối thủ ngẫu nhiên không có thói quen để đọc);
// độ khó thật chỉ lộ khi đấu với đối thủ lặp tay (xem mục 6).
{
  const a = measure(50, 'match', 'hard', 'easy', 4000);
  const b = measure(50, 'match', 'easy', 'hard', 5000);
  check('đấu HvE: 0 ván kẹt', a.stuck === 0);
  check('đấu EvH: 0 ván kẹt', b.stuck === 0);
  check('đấu HvE: p1 (Khó) thắng 15–35/50', a.wins >= 15 && a.wins <= 35, a.wins + '/50');
  check('đấu EvH: p1 (Dễ) thắng 15–35/50', b.wins >= 15 && b.wins <= 35, b.wins + '/50');
}

// 5. match EvE
{
  const m = measure(50, 'match', 'easy', 'easy', 6000);
  check('đấu EvE: 0 ván kẹt', m.stuck === 0);
  check('đấu EvE: p1 thắng 15–35/50', m.wins >= 15 && m.wins <= 35, m.wins + '/50');
}

// 6. kỹ năng thật: đối thủ luôn ra 1 tay cố định → máy Khó bắt bài
// gần như tuyệt đối, máy Dễ chỉ ~50%.
{
  function fixedMatch(seed, botLevel, fixedChoice) {
    Math.random = mulberry32(seed);
    const s = createGame([
      { id: 'p1', name: 'Cố định', isBot: true, level: 'easy' },
      { id: 'p2', name: 'Máy', isBot: true, level: botLevel },
    ], { seed, kbbMode: 'match' });
    let steps = 0;
    while (s.phase === 'playing' && steps < 100) {
      for (const pid of actors(s)) {
        if (s.phase !== 'playing') break;
        const a = pid === 'p1' ? { type: 'pick', choice: fixedChoice } : botAction(s, pid);
        if (!a) return s;
        const r = applyAction(s, pid, a);
        if (!r.ok) return s;
        steps++;
      }
    }
    return s;
  }
  for (const fixed of ['keo', 'bua', 'bao']) {
    let hardWins = 0, easyWins = 0;
    for (let i = 0; i < 30; i++) {
      if (fixedMatch(100 + i, 'hard', fixed).winner === 'p2') hardWins++;
      if (fixedMatch(100 + i, 'easy', fixed).winner === 'p2') easyWins++;
    }
    check(`bắt bài tay cố định ${fixed}: máy Khó thắng ≥25/30`, hardWins >= 25, hardWins + '/30');
    check(`bắt bài tay cố định ${fixed}: máy Dễ thắng ≤22/30`, easyWins <= 22, easyWins + '/30');
  }
}

// 7. tỉ lệ thành tựu trên 200 ván đấu HvH (đo kỹ vì comeback hiếm)
{
  const m = measure(200, 'match', 'hard', 'hard', 7000);
  check('đấu HvH n=200: 0 ván kẹt', m.stuck === 0);
  check('kbb-comeback: 0–10% số ván thắng (thử thách hiếm, cố ý)', m.comebackRate <= 0.10, (m.comebackRate * 100).toFixed(1) + '% của ' + m.wins + ' ván thắng');
  check('kbb-streak3: 15–60% số ván thắng', m.streak3Rate >= 0.15 && m.streak3Rate <= 0.60, (m.streak3Rate * 100).toFixed(1) + '% của ' + m.wins + ' ván thắng');
  check('vòng hoà: trung bình ~2 vòng/ván (không kẹt vì hoà)', m.ties / 200 >= 0.5 && m.ties / 200 <= 4, (m.ties / 200).toFixed(1) + ' vòng hoà/ván');
}

// 8. ván dài nhất không vượt quá 15 vòng (3 vòng thắng + hoà)
{
  let maxRounds = 0;
  for (let i = 0; i < 100; i++) {
    const s = mk(8000 + i, 'match', 'hard', 'hard');
    drive(s);
    maxRounds = Math.max(maxRounds, s.final.summary.p1.rounds);
  }
  check('ván dài nhất ≤ 15 vòng (kể cả hoà)', maxRounds <= 15, maxRounds + ' vòng');
}

console.log(`\nKéo Búa Bao sim: ${pass} pass, ${fail} fail.`);
