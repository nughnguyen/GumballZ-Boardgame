// Mô phỏng Hanabi: bot-vs-bot kết thúc được, không kẹt, đội toàn Máy
// Khó ghi điểm trung bình cao hơn hẳn đội toàn Máy Dễ (đo bằng điểm
// cuối trung bình — cả đội cùng thắng/thua nên tính điểm, không tính
// tỉ lệ thắng trận).
import { createGame, applyAction, actors, scoreOf, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để kết quả ổn định — seed: 20261119 */
const _rng = mulberry32(20261119);
Math.random = () => _rng();

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));

function playMatch(seed, levels) {
  const names = ['A', 'B', 'C', 'D', 'E'].slice(0, levels.length);
  const s = createGame(P(names), { seed });
  let guard = 0;
  while (s.phase === 'playing' && guard++ < 3000) {
    const pid = actors(s)[0];
    const idx = s.players.findIndex(p => p.id === pid);
    const act = botAction(s, pid, levels[idx]);
    if (!act) return { s, ok: false, guard };
    const r = applyAction(s, pid, act);
    if (!r.ok) return { s, ok: false, guard };
  }
  return { s, ok: s.phase === 'ended', guard };
}

function batch(n, levels, base) {
  let sum = 0, wins = 0, stuck = 0, maxGuard = 0;
  for (let i = 0; i < n; i++) {
    const { s, ok, guard } = playMatch(base + i, levels);
    maxGuard = Math.max(maxGuard, guard);
    if (!ok) { stuck++; continue; }
    sum += scoreOf(s);
    if (s.teamWin) wins++;
  }
  return { avg: sum / n, wins, stuck, maxGuard };
}

/* ---------- 1. 50 trận 4 người: toàn Khó vs toàn Dễ ---------- */
let hard4, easy4;
{
  hard4 = batch(50, ['hard', 'hard', 'hard', 'hard'], 1000);
  easy4 = batch(50, ['easy', 'easy', 'easy', 'easy'], 2000);
  console.log(`  · 4 người toàn Khó (50 trận): điểm TB ${hard4.avg.toFixed(2)}, thắng ${hard4.wins}, kẹt ${hard4.stuck}`);
  console.log(`  · 4 người toàn Dễ (50 trận): điểm TB ${easy4.avg.toFixed(2)}, thắng ${easy4.wins}, kẹt ${easy4.stuck}`);
  t('50 trận 4 người toàn Khó đều kết thúc, 0 kẹt', hard4.stuck === 0);
  t('50 trận 4 người toàn Dễ đều kết thúc, 0 kẹt', easy4.stuck === 0);
  t('đội toàn Khó ghi điểm TB ≥ 12 ở 4 người', hard4.avg >= 12);
  t('đội toàn Dễ ghi điểm TB ≤ 6 ở 4 người', easy4.avg <= 6);
  t('đội toàn Khó hơn đội toàn Dễ ≥ 8 điểm TB ở 4 người', hard4.avg - easy4.avg >= 8);
}

/* ---------- 2. 50 trận 3 người: toàn Khó ---------- */
{
  const hard3 = batch(50, ['hard', 'hard', 'hard'], 3000);
  console.log(`  · 3 người toàn Khó (50 trận): điểm TB ${hard3.avg.toFixed(2)}, thắng ${hard3.wins}, kẹt ${hard3.stuck}`);
  t('50 trận 3 người toàn Khó đều kết thúc, 0 kẹt', hard3.stuck === 0);
  t('đội toàn Khó ghi điểm TB ≥ 12 ở 3 người', hard3.avg >= 12);
}

/* ---------- 3. 20 trận 2 người và 5 người: toàn Khó ---------- */
{
  const hard2 = batch(20, ['hard', 'hard'], 5000);
  const hard5 = batch(20, ['hard', 'hard', 'hard', 'hard', 'hard'], 6000);
  console.log(`  · 2 người toàn Khó (20 trận): điểm TB ${hard2.avg.toFixed(2)}, kẹt ${hard2.stuck}`);
  console.log(`  · 5 người toàn Khó (20 trận): điểm TB ${hard5.avg.toFixed(2)}, kẹt ${hard5.stuck}`);
  t('20 trận 2 người đều kết thúc, 0 kẹt', hard2.stuck === 0);
  t('20 trận 5 người đều kết thúc, 0 kẹt', hard5.stuck === 0);
  t('đội toàn Khó ghi điểm TB ≥ 10 ở 5 người', hard5.avg >= 10);
}

/* ---------- 4. trận dài nhất dưới 300 vòng lặp ---------- */
{
  let maxGuard = 0;
  for (let i = 0; i < 20; i++) {
    const { guard } = playMatch(7000 + i, ['hard', 'easy', 'hard', 'easy']);
    maxGuard = Math.max(maxGuard, guard);
  }
  console.log(`  · vòng lặp nhiều nhất trong 20 trận 4 người: ${maxGuard}`);
  t('trận dài nhất dưới 300 vòng lặp', maxGuard < 300);
}

/* ---------- 5. bot không trả nước bất hợp lệ ---------- */
{
  let bad = 0;
  for (let i = 0; i < 30; i++) {
    const s = createGame(P(['A', 'B', 'C']), { seed: 8000 + i });
    let guard = 0;
    while (s.phase === 'playing' && guard++ < 3000) {
      const pid = actors(s)[0];
      const idx = s.players.findIndex(p => p.id === pid);
      const act = botAction(s, pid, idx === 0 ? 'hard' : 'easy');
      const r = act ? applyAction(s, pid, act) : { ok: false };
      if (!r.ok) bad++;
    }
  }
  t('bot không bao giờ trả nước bị engine từ chối (30 trận)', bad === 0);
}

console.log(`\nMô phỏng Hanabi: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
