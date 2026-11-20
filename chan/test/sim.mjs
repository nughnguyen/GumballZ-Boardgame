// Mô phỏng Chắn: bot-vs-bot kết thúc được, không kẹt, Máy Khó thắng
// nhiều hơn hẳn Máy Dễ (đo bằng tỉ lệ thắng trận — Chắn là game đối
// kháng, mỗi ván chỉ có 1 người ù; ván hòa khi hết nọc mà chưa ai ù).
import { createGame, applyAction, actors, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để kết quả ổn định — seed: 20261119 */
const _rng = mulberry32(20261119);
Math.random = () => _rng();

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));

function playMatch(seed, levels) {
  const names = ['A', 'B', 'C', 'D'].slice(0, levels.length);
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
  let wins = {}, draws = 0, stuck = 0, maxGuard = 0;
  for (let i = 0; i < n; i++) {
    const { s, ok, guard } = playMatch(base + i, levels);
    maxGuard = Math.max(maxGuard, guard);
    if (!ok) { stuck++; continue; }
    if (s.winner) wins[s.winner] = (wins[s.winner] || 0) + 1;
    else draws++;
  }
  return { wins, draws, stuck, maxGuard };
}

/* ---------- 1. 100 trận 4 người: 1 Khó + 3 Dễ ---------- */
let hard4;
{
  hard4 = batch(100, ['hard', 'easy', 'easy', 'easy'], 1000);
  const hw = hard4.wins['p1'] || 0;
  console.log(`  · 4 người, 1 Khó + 3 Dễ (100 trận): Khó thắng ${hw}, hòa ${hard4.draws}, kẹt ${hard4.stuck}`);
  t('100 trận 4 người đều kết thúc, 0 kẹt', hard4.stuck === 0);
  t('Máy Khó thắng ≥ 35/100 ở 4 người (phần công bằng là 25)', hw >= 35);
}

/* ---------- 2. 50 trận 2 người: Khó vs Dễ ---------- */
let hard2;
{
  hard2 = batch(50, ['hard', 'easy'], 2000);
  const hw = hard2.wins['p1'] || 0;
  console.log(`  · 2 người, Khó vs Dễ (50 trận): Khó thắng ${hw}, hòa ${hard2.draws}, kẹt ${hard2.stuck}`);
  t('50 trận 2 người đều kết thúc, 0 kẹt', hard2.stuck === 0);
  t('Máy Khó thắng ≥ 30/50 ở 2 người (phần công bằng là 25)', hw >= 30);
}

/* ---------- 3. 20 trận 4 người toàn Khó và 20 trận 3 người toàn Dễ ---------- */
{
  const allHard = batch(20, ['hard', 'hard', 'hard', 'hard'], 3000);
  const allEasy3 = batch(20, ['easy', 'easy', 'easy'], 4000);
  console.log(`  · 4 người toàn Khó (20 trận): kẹt ${allHard.stuck}, hòa ${allHard.draws}, vòng lặp nhiều nhất ${allHard.maxGuard}`);
  console.log(`  · 3 người toàn Dễ (20 trận): kẹt ${allEasy3.stuck}, hòa ${allEasy3.draws}, vòng lặp nhiều nhất ${allEasy3.maxGuard}`);
  t('20 trận 4 người toàn Khó đều kết thúc, 0 kẹt', allHard.stuck === 0);
  t('20 trận 3 người toàn Dễ đều kết thúc, 0 kẹt', allEasy3.stuck === 0);
  t('trận dài nhất dưới 500 vòng lặp', Math.max(allHard.maxGuard, allEasy3.maxGuard) < 500);
}

/* ---------- 4. trận dài nhất trong 20 trận 4 người hỗn hợp ---------- */
{
  let maxGuard = 0;
  for (let i = 0; i < 20; i++) {
    const { guard } = playMatch(5000 + i, ['hard', 'easy', 'hard', 'easy']);
    maxGuard = Math.max(maxGuard, guard);
  }
  console.log(`  · vòng lặp nhiều nhất trong 20 trận 4 người: ${maxGuard}`);
  t('trận dài nhất dưới 500 vòng lặp', maxGuard < 500);
}

/* ---------- 5. bot không trả nước bất hợp lệ ---------- */
{
  let bad = 0;
  for (let i = 0; i < 30; i++) {
    const s = createGame(P(['A', 'B', 'C']), { seed: 6000 + i });
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

console.log(`\nMô phỏng Chắn: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
