// Mô phỏng Love Letter: bot không kẹt, Máy Khó thắng nhiều hơn Máy Dễ.
import { createGame, applyAction, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để bot Dễ (đánh bừa) cho kết quả ổn định giữa
   các lần chạy — nếu không, so sánh Hard-vs-Easy lúc đúng lúc sai */
const _rng = mulberry32(20261119);
Math.random = () => _rng();

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));

function playMatch(seed, levels) {
  const s = createGame(P(['A', 'B', 'C', 'D'].slice(0, levels.length)), { seed });
  let guard = 0;
  while (s.phase === 'playing' && guard++ < 1000) {
    const pid = s.turn;
    const idx = s.players.findIndex(p => p.id === pid);
    const act = botAction(s, pid, levels[idx]);
    if (!act) return { s, stuck: true, guard };
    const r = applyAction(s, pid, act);
    if (!r.ok) return { s, stuck: true, guard, reason: r.reason };
  }
  return { s, stuck: false, guard, winner: s.winner };
}

/* ---------- 1. 100 trận 2 người: Khó vs Dễ ---------- */
{
  let hardWins = 0, easyWins = 0, stuck = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const r = playMatch(seed, ['hard', 'easy']);
    if (r.stuck) stuck++;
    else if (r.winner === 'p1') hardWins++;
    else if (r.winner === 'p2') easyWins++;
  }
  console.log(`    (100 trận 2 người: Khó thắng ${hardWins}, Dễ thắng ${easyWins}, kẹt ${stuck})`);
  t('100 trận 2 người không kẹt', stuck === 0);
  t('Máy Khó thắng nhiều trận hơn Máy Dễ (2 người)', hardWins > easyWins);
}

/* ---------- 2. 50 trận 4 người: 1 Khó + 3 Dễ ---------- */
{
  let hardWins = 0, stuck = 0;
  for (let seed = 200; seed < 250; seed++) {
    const r = playMatch(seed, ['hard', 'easy', 'easy', 'easy']);
    if (r.stuck) stuck++;
    else if (r.winner === 'p1') hardWins++;
  }
  console.log(`    (50 trận 4 người, 1 Khó + 3 Dễ: Khó thắng ${hardWins}/50, kẹt ${stuck})`);
  t('50 trận 4 người không kẹt', stuck === 0);
  t('Máy Khó thắng nhiều hơn 1/4 số trận (hơn mức bừa)', hardWins > 12);
}

/* ---------- 3. 50 trận 4 máy Dễ: vẫn kết thúc, không kẹt ---------- */
{
  let stuck = 0, done = 0;
  for (let seed = 300; seed < 350; seed++) {
    const r = playMatch(seed, ['easy', 'easy', 'easy', 'easy']);
    if (r.stuck) stuck++;
    else if (r.s.phase === 'ended') done++;
  }
  console.log(`    (50 trận toàn máy Dễ: xong ${done}/50, kẹt ${stuck})`);
  t('50 trận toàn máy Dễ đều kết thúc, không kẹt', stuck === 0 && done === 50);
}

/* ---------- 4. số nước mỗi trận hợp lý (không vòng lặp vô hạn) ---------- */
{
  let maxGuard = 0;
  for (let seed = 400; seed < 420; seed++) {
    const r = playMatch(seed, ['hard', 'easy', 'hard', 'easy']);
    if (r.guard > maxGuard) maxGuard = r.guard;
  }
  console.log(`    (20 trận 4 người: nhiều nước nhất ${maxGuard})`);
  t('trận dài nhất dưới 300 nước', maxGuard < 300);
}

console.log(`\nMô phỏng Love Letter: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
