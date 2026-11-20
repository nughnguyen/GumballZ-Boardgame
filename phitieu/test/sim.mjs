/* Phi Tiêu sim tests — không kẹt ván + hiệu chuẩn tỉ lệ thắng/thành tựu.
   Số liệu đo được (2 lần chạy probe byte-identical, seed cố định):
   - solo Hard: thắng ~50% ở ngưỡng 880 (trung vị 881, trung bình 890,
     min 702, max 1128); solo Easy: 0% (trung vị 530, max 799).
   - đấu HvH: p1 27 – p2 23, hoà 0, lượt trung vị 7, max 10.
   - đấu HvE: p1 48 – p2 2; EvH: p1 8 – p2 42, hoà 0.
   - 180: solo Hard 21/100, đấu HvH 12/50 (người thắng có 180).
   - ton3 (thắng đấu với ≥3 lượt ≥100): HvH 15/50, HvE 13/50, EvH 5/50.
   - bull trong ván thắng: 0/50 mọi cấu hình (bot không ngắm bull trừ
     checkout đúng 50) — lý do ph-bull được đổi thành ph-ton3.
   Các ngưỡng assert có biên độ rộng để không flaky (seed cố định). */
import {
  createGame, applyAction, actors, mulberry32, SOLO_WIN_SCORE,
} from '../js/engine.js?v=1';
import { botAction } from '../js/bot.js?v=1';

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function drive(s, maxSteps = 600) {
  let steps = 0;
  while (s.phase === 'playing' && steps < maxSteps) {
    const acts = actors(s);
    if (!acts.length) return { ok: false, why: 'no actors' };
    for (const pid of acts) {
      if (s.phase !== 'playing') break;
      if (!actors(s).includes(pid)) continue;
      const a = botAction(s, pid);
      if (!a) return { ok: false, why: 'bot null' };
      const r = applyAction(s, pid, a);
      if (!r.ok) return { ok: false, why: 'rejected: ' + r.reason };
      steps++;
    }
  }
  return { ok: s.phase === 'ended', why: s.phase };
}
function soloGame(seed, lvl) {
  Math.random = mulberry32(seed);
  return createGame([
    { id: 'p1', name: 'P1', isBot: true, level: lvl },
    { id: 'p2', name: 'Máy', isBot: true, level: lvl },
  ], { seed, phMode: 'solo' });
}
function matchGame(seed, l1, l2) {
  Math.random = mulberry32(seed);
  return createGame([
    { id: 'p1', name: 'P1', isBot: true, level: l1 },
    { id: 'p2', name: 'P2', isBot: true, level: l2 },
  ], { seed, phMode: 'match' });
}

console.log('Phi Tiêu sim:');

// 1. solo Hard — tỉ lệ thắng ở ngưỡng 880
{
  let wins = 0, stuck = 0, games180 = 0, totals = [];
  for (let i = 0; i < 100; i++) {
    const s = soloGame(1 + i, 'hard');
    const r = drive(s);
    if (!r.ok) { stuck++; continue; }
    totals.push(s.final.summary.p1.score);
    if (s.winner === 'p1') wins++;
    if (s.final.summary.p1.maxVisit >= 180) games180++;
  }
  totals.sort((a, b) => a - b);
  console.log(`    solo Hard: thắng ${wins}/100, trung vị ${totals[50]}, min ${totals[0]}, max ${totals[99]}, 180: ${games180}/100, kẹt ${stuck}`);
  check('solo Hard: không kẹt ván', stuck === 0);
  check('solo Hard: thắng 35–65/100 (ngưỡng 880)', wins >= 35 && wins <= 65);
  check('solo Hard: 180 trong 10–35/100', games180 >= 10 && games180 <= 35);
}

// 2. solo Easy — gần như không thắng
{
  let wins = 0, stuck = 0;
  for (let i = 0; i < 100; i++) {
    const s = soloGame(101 + i, 'easy');
    const r = drive(s);
    if (!r.ok) { stuck++; continue; }
    if (s.winner === 'p1') wins++;
  }
  console.log(`    solo Easy: thắng ${wins}/100, kẹt ${stuck}`);
  check('solo Easy: không kẹt ván', stuck === 0);
  check('solo Easy: thắng 0–5/100', wins <= 5);
}

// 3. đấu HvH — cân bằng 2 ghế, không hoà (checkout đã sửa)
{
  let w1 = 0, w2 = 0, draws = 0, stuck = 0, maxVisit = 0, games180 = 0, winsTon3 = 0, winsBull = 0, wins = 0;
  for (let i = 0; i < 50; i++) {
    const s = matchGame(201 + i, 'hard', 'hard');
    const r = drive(s);
    if (!r.ok) { stuck++; continue; }
    maxVisit = Math.max(maxVisit, s.prog.visit);
    if (s.winner === 'p1') w1++;
    else if (s.winner === 'p2') w2++;
    else draws++;
    const s1 = s.final.summary.p1, s2 = s.final.summary.p2;
    if (s1.maxVisit >= 180 || s2.maxVisit >= 180) games180++;
    if (s.winner) {
      wins++;
      const ws = s.final.summary[s.winner];
      if (ws.tons >= 3) winsTon3++;
      if (ws.bulls >= 1) winsBull++;
    }
  }
  console.log(`    đấu HvH: p1 ${w1} – p2 ${w2}, hoà ${draws}, lượt max ${maxVisit}, 180: ${games180}/50, ton3 trong ván thắng ${winsTon3}/50, bull trong ván thắng ${winsBull}/50, kẹt ${stuck}`);
  check('đấu HvH: không kẹt ván', stuck === 0);
  check('đấu HvH: không hoà (checkout không kẹt)', draws === 0);
  check('đấu HvH: mỗi ghế thắng 15–35/50', w1 >= 15 && w1 <= 35 && w2 >= 15 && w2 <= 35);
  check('đấu HvH: ván dài nhất ≤ 20 lượt', maxVisit <= 20);
  check('đấu HvH: 180 trong 5–20/50', games180 >= 5 && games180 <= 20);
  check('đấu HvH: ton3 trong ván thắng 3–20/50', winsTon3 >= 3 && winsTon3 <= 20);
  check('đấu HvH: bull trong ván thắng ≤ 2/50 (hiếm — lý do đổi ph-bull)', winsBull <= 2);
}

// 4. đấu HvE — Khó áp đảo Dễ
{
  let w1 = 0, w2 = 0, stuck = 0;
  for (let i = 0; i < 50; i++) {
    const s = matchGame(251 + i, 'hard', 'easy');
    const r = drive(s);
    if (!r.ok) { stuck++; continue; }
    if (s.winner === 'p1') w1++;
    else if (s.winner === 'p2') w2++;
  }
  console.log(`    đấu HvE: p1(Khó) ${w1} – p2(Dễ) ${w2}, kẹt ${stuck}`);
  check('đấu HvE: không kẹt ván', stuck === 0);
  check('đấu HvE: Khó thắng ≥ 40/50', w1 >= 40);
}

// 5. đấu EvH — Khó áp đảo Dễ ở ghế sau
{
  let w1 = 0, w2 = 0, stuck = 0;
  for (let i = 0; i < 50; i++) {
    const s = matchGame(301 + i, 'easy', 'hard');
    const r = drive(s);
    if (!r.ok) { stuck++; continue; }
    if (s.winner === 'p1') w1++;
    else if (s.winner === 'p2') w2++;
  }
  console.log(`    đấu EvH: p1(Dễ) ${w1} – p2(Khó) ${w2}, kẹt ${stuck}`);
  check('đấu EvH: không kẹt ván', stuck === 0);
  check('đấu EvH: Khó thắng ≥ 40/50', w2 >= 40);
}

// 6. đấu EvE — không kẹt, có người thắng
{
  let w1 = 0, w2 = 0, draws = 0, stuck = 0;
  for (let i = 0; i < 30; i++) {
    const s = matchGame(351 + i, 'easy', 'easy');
    const r = drive(s);
    if (!r.ok) { stuck++; continue; }
    if (s.winner === 'p1') w1++;
    else if (s.winner === 'p2') w2++;
    else draws++;
  }
  console.log(`    đấu EvE: p1 ${w1} – p2 ${w2}, hoà ${draws}, kẹt ${stuck}`);
  check('đấu EvE: không kẹt ván', stuck === 0);
  check('đấu EvE: có người thắng ≥ 25/30', w1 + w2 >= 25);
}

// 7. solo đủ 30 phi, tổng điểm hợp lệ mọi ván
{
  let bad = 0;
  for (let i = 0; i < 50; i++) {
    const s = soloGame(401 + i, 'hard');
    const r = drive(s);
    if (!r.ok) { bad++; continue; }
    const sum = s.final.summary.p1;
    if (sum.darts !== 30 || sum.score < 0 || sum.score > 30 * 60 || sum.maxVisit > 180) bad++;
  }
  check('solo: 50/50 ván đủ 30 phi, tổng trong [0, 1800]', bad === 0);
}

// 8. bot xác định: cùng seed → cùng tổng solo
{
  const total = seed => {
    Math.random = mulberry32(seed);
    const s = createGame([
      { id: 'p1', name: 'P1', isBot: true, level: 'hard' },
      { id: 'p2', name: 'Máy', isBot: true, level: 'hard' },
    ], { seed, phMode: 'solo' });
    drive(s);
    return s.final.summary.p1.score;
  };
  check('bot xác định: cùng seed → cùng tổng solo', total(55) === total(55));
}

console.log(`\nPhi Tiêu sim: ${pass} pass, ${fail} fail.`);
process.exit(fail ? 1 : 0);
