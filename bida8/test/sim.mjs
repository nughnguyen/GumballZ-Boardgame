/* Bida 8-ball sim tests — cân bằng bot: chơi đơn dọn bàn, đấu Hard vs
   Hard, Hard vs Easy (2 chiều), Easy vs Easy. Mọi ván phải kết thúc
   trong MAX_SHOTS; không ván nào kẹt. Math.random seed theo ván. */
import { createGame, applyAction, actors, mulberry32, MAX_SHOTS } from '../js/engine.js';
import { botAction } from '../js/bot.js';

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }

function drive(s, maxSteps = 400) {
  let steps = 0;
  while (s.phase === 'playing' && steps < maxSteps) {
    const pid = actors(s)[0];
    if (!pid) break;
    const a = botAction(s, pid);
    if (!a) return { steps, ok: false, why: 'bot null' };
    const r = applyAction(s, pid, a);
    if (!r.ok) return { steps, ok: false, why: 'action bị từ chối: ' + r.reason };
    steps++;
  }
  return { steps, ok: s.phase === 'ended' };
}
function matchGame(seed, l1, l2) {
  Math.random = mulberry32(seed);
  return createGame([
    { id: 'p1', name: 'P1', isBot: true, level: l1 },
    { id: 'p2', name: 'P2', isBot: true, level: l2 },
  ], { seed, bdMode: 'match' });
}

/* --- 1. chơi đơn: bot Hard dọn bàn --- */
{
  let wins = 0, totalShots = 0, ended = 0;
  for (let seed = 301; seed <= 305; seed++) {
    Math.random = mulberry32(seed);
    const s = createGame([{ id: 'p1', name: 'P1', isBot: true, level: 'hard' }], { seed, bdMode: 'solo' });
    const r = drive(s);
    if (s.phase === 'ended') ended++;
    if (s.winner === 'p1') wins++;
    totalShots += s.prog.shots.p1;
  }
  console.log(`  solo Hard: thắng ${wins}/5, kết thúc ${ended}/5, trung bình ${Math.round(totalShots / 5)} cú/ván`);
  check('sim: chơi đơn luôn kết thúc (không kẹt)', ended === 5);
  check('sim: bot Hard dọn được bàn ít nhất 3/5 ván', wins >= 3, `thắng ${wins}/5`);
}

/* --- 2. đấu Hard vs Hard --- */
{
  let w1 = 0, w2 = 0, draws = 0, shots = 0, ended = 0;
  for (let seed = 311; seed <= 320; seed++) {
    const s = matchGame(seed, 'hard', 'hard');
    const r = drive(s);
    if (s.phase === 'ended') ended++;
    if (s.winner === 'p1') w1++;
    else if (s.winner === 'p2') w2++;
    else draws++;
    shots += s.prog.shots.p1 + s.prog.shots.p2;
  }
  console.log(`  Hard vs Hard: p1 thắng ${w1}, p2 thắng ${w2}, hoà ${draws}, trung bình ${Math.round(shots / 10)} cú/ván`);
  check('sim: Hard vs Hard luôn kết thúc', ended === 10);
  check('sim: Hard vs Hard không lệch hẳn 1 bên (mỗi bên ≥2 thắng)', w1 >= 2 && w2 >= 2, `p1=${w1} p2=${w2}`);
}

/* --- 3. đấu Hard vs Easy (Hard đi trước) --- */
{
  let hw = 0, ew = 0, draws = 0, ended = 0;
  for (let seed = 321; seed <= 330; seed++) {
    const s = matchGame(seed, 'hard', 'easy');
    drive(s);
    if (s.phase === 'ended') ended++;
    if (s.winner === 'p1') hw++;
    else if (s.winner === 'p2') ew++;
    else draws++;
  }
  console.log(`  Hard(p1) vs Easy(p2): Hard thắng ${hw}, Easy thắng ${ew}, hoà ${draws}`);
  check('sim: Hard vs Easy luôn kết thúc', ended === 10);
  check('sim: Hard thắng Easy đa số (≥7/10)', hw >= 7, `Hard thắng ${hw}/10`);
}

/* --- 4. đấu Easy vs Hard (Hard đi sau) --- */
{
  let hw = 0, ew = 0, draws = 0, ended = 0;
  for (let seed = 331; seed <= 340; seed++) {
    const s = matchGame(seed, 'easy', 'hard');
    drive(s);
    if (s.phase === 'ended') ended++;
    if (s.winner === 'p2') hw++;
    else if (s.winner === 'p1') ew++;
    else draws++;
  }
  console.log(`  Easy(p1) vs Hard(p2): Hard thắng ${hw}, Easy thắng ${ew}, hoà ${draws}`);
  check('sim: Easy vs Hard luôn kết thúc', ended === 10);
  check('sim: Hard thắng Easy đa số khi đi sau (≥7/10)', hw >= 7, `Hard thắng ${hw}/10`);
}

/* --- 5. đấu Easy vs Easy --- */
{
  let w1 = 0, w2 = 0, draws = 0, ended = 0, foul8 = 0;
  for (let seed = 341; seed <= 345; seed++) {
    const s = matchGame(seed, 'easy', 'easy');
    drive(s);
    if (s.phase === 'ended') ended++;
    if (s.winner === 'p1') w1++;
    else if (s.winner === 'p2') w2++;
    else draws++;
    if (s.endReason === 'foul8') foul8++;
  }
  console.log(`  Easy vs Easy: p1 thắng ${w1}, p2 thắng ${w2}, hoà ${draws}, thua vì bi 8 sớm ${foul8}`);
  check('sim: Easy vs Easy luôn kết thúc', ended === 5);
}

/* --- 6. không ván nào vượt MAX_SHOTS --- */
{
  let over = 0;
  for (let seed = 351; seed <= 355; seed++) {
    const s = matchGame(seed, 'hard', 'easy');
    drive(s);
    if (s.prog.shots.p1 + s.prog.shots.p2 > MAX_SHOTS) over++;
  }
  check('sim: không ván nào vượt MAX_SHOTS', over === 0);
}

console.log(`\nBida sim: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
