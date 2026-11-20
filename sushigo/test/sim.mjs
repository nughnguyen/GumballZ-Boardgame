// Mô phỏng Sushi Go: bot không kẹt, Máy Khó thắng nhiều hơn Máy Dễ.
// Chạy toàn bộ 2 lần với cùng seed RNG — kết quả phải giống hệt nhau
// (nếu khác thì test/engine có dùng random không gieo hạt = FAIL).
import { createGame, applyAction, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random — seed: 20261119 */
function seedRng() {
  const _rng = mulberry32(20261119);
  Math.random = () => _rng();
}

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));

function playMatch(seed, levels) {
  const s = createGame(P(['A', 'B', 'C', 'D', 'E'].slice(0, levels.length)), { seed });
  let guard = 0;
  while (s.phase === 'playing' && guard++ < 1000) {
    const pending = s.players.filter(p => !s.picks[p.id]).map(p => p.id);
    if (!pending.length) return { s, stuck: true, guard };
    for (const pid of pending) {
      if (s.phase !== 'playing') break;
      const idx = s.players.findIndex(p => p.id === pid);
      const act = botAction(s, pid, levels[idx]);
      if (!act) return { s, stuck: true, guard };
      const r = applyAction(s, pid, act);
      if (!r.ok) return { s, stuck: true, guard, reason: r.reason };
    }
  }
  return { s, stuck: false, guard, winner: s.winner };
}

function runSuite() {
  const out = {};
  /* 1. 100 trận 2 người: Khó vs Dễ */
  {
    let hardWins = 0, easyWins = 0, stuck = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const r = playMatch(seed, ['hard', 'easy']);
      if (r.stuck) stuck++;
      else if (r.winner === 'p1') hardWins++;
      else if (r.winner === 'p2') easyWins++;
    }
    out.twoP = { hardWins, easyWins, stuck };
    console.log(`    (100 trận 2 người: Khó thắng ${hardWins}, Dễ thắng ${easyWins}, kẹt ${stuck})`);
  }
  /* 2. 50 trận 4 người: 1 Khó + 3 Dễ */
  {
    let hardWins = 0, stuck = 0;
    for (let seed = 200; seed < 250; seed++) {
      const r = playMatch(seed, ['hard', 'easy', 'easy', 'easy']);
      if (r.stuck) stuck++;
      else if (r.winner === 'p1') hardWins++;
    }
    out.fourP = { hardWins, stuck };
    console.log(`    (50 trận 4 người, 1 Khó + 3 Dễ: Khó thắng ${hardWins}/50, kẹt ${stuck})`);
  }
  /* 3. 50 trận 5 người toàn máy Dễ: vẫn kết thúc, không kẹt */
  {
    let stuck = 0, done = 0;
    for (let seed = 300; seed < 350; seed++) {
      const r = playMatch(seed, ['easy', 'easy', 'easy', 'easy', 'easy']);
      if (r.stuck) stuck++;
      else if (r.s.phase === 'ended') done++;
    }
    out.fiveP = { stuck, done };
    console.log(`    (50 trận 5 người toàn máy Dễ: xong ${done}/50, kẹt ${stuck})`);
  }
  /* 4. số lượt mỗi trận hợp lý (không vòng lặp vô hạn) */
  {
    let maxGuard = 0;
    for (let seed = 400; seed < 420; seed++) {
      const r = playMatch(seed, ['hard', 'easy', 'hard', 'easy']);
      if (r.guard > maxGuard) maxGuard = r.guard;
    }
    out.maxGuard = maxGuard;
    console.log(`    (20 trận 4 người: nhiều vòng lặp nhất ${maxGuard})`);
  }
  return out;
}

seedRng();
const run1 = runSuite();
seedRng();
const run2 = runSuite();
t('chạy sim 2 lần với cùng seed cho kết quả giống hệt nhau', JSON.stringify(run1) === JSON.stringify(run2));
t('100 trận 2 người không kẹt', run1.twoP.stuck === 0);
t('Máy Khó thắng nhiều trận hơn Máy Dễ (2 người)', run1.twoP.hardWins > run1.twoP.easyWins);
t('50 trận 4 người không kẹt', run1.fourP.stuck === 0);
t('Máy Khó thắng nhiều hơn 1/4 số trận (hơn mức bừa)', run1.fourP.hardWins > 12);
t('50 trận 5 người toàn máy Dễ đều kết thúc, không kẹt', run1.fiveP.stuck === 0 && run1.fiveP.done === 50);
t('trận dài nhất dưới 300 vòng lặp', run1.maxGuard < 300);

console.log(`\nMô phỏng Sushi Go: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
