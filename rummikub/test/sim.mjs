// Mô phỏng Rummikub: bot-vs-bot kết thúc được, không kẹt, Máy Khó thắng
// Máy Dễ nhiều hơn (đo bằng nước tham lam đánh nhiều lá).
import { createGame, applyAction, actors, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để kết quả ổn định — seed: 20261120 */
const _rng = mulberry32(20261120);
Math.random = () => _rng();

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));

function playMatch(seed, levels) {
  const names = ['A', 'B', 'C', 'D'].slice(0, levels.length);
  const s = createGame(P(names), { seed });
  let guard = 0;
  while (s.phase === 'playing' && guard++ < 1000) {
    const pending = actors(s);
    if (!pending.length) return { s, ok: false, guard };
    for (const pid of pending) {
      if (s.phase !== 'playing') break;
      const idx = s.players.findIndex(p => p.id === pid);
      const act = botAction(s, pid, levels[idx]);
      if (!act) return { s, ok: false, guard };
      const r = applyAction(s, pid, act);
      if (!r.ok) return { s, ok: false, guard, act, reason: r.reason };
    }
  }
  return { s, ok: s.phase === 'ended', guard };
}

/* ---------- 1. 100 trận 2 người: Khó vs Dễ ---------- */
{
  let hardWins = 0, easyWins = 0, stuck = 0, longest = 0, turns = 0;
  for (let i = 0; i < 100; i++) {
    const { s, ok, guard } = playMatch(1000 + i, ['hard', 'easy']);
    if (!ok || s.phase !== 'ended') { stuck++; continue; }
    if (guard > longest) longest = guard;
    turns += guard;
    if (s.winner === 'p1') hardWins++;
    else if (s.winner === 'p2') easyWins++;
  }
  console.log(`  · 2 người Khó vs Dễ (100 trận): Khó thắng ${hardWins}, Dễ thắng ${easyWins}, kẹt ${stuck}, lượt TB ${(turns / 100).toFixed(1)}, dài nhất ${longest}`);
  t('100 trận 2 người đều kết thúc, 0 kẹt', stuck === 0);
  t('Máy Khó thắng Máy Dễ nhiều hơn hẳn ở 2 người', hardWins > easyWins + 10);
}

/* ---------- 2. 50 trận 4 người: 1 Khó + 3 Dễ ---------- */
{
  let hardWins = 0, stuck = 0;
  for (let i = 0; i < 50; i++) {
    const { s, ok } = playMatch(2000 + i, ['hard', 'easy', 'easy', 'easy']);
    if (!ok || s.phase !== 'ended') { stuck++; continue; }
    if (s.winner === 'p1') hardWins++;
  }
  console.log(`  · 4 người 1 Khó + 3 Dễ (50 trận): Khó thắng ${hardWins}/50, kẹt ${stuck}`);
  t('50 trận 4 người đều kết thúc, 0 kẹt', stuck === 0);
  t('Máy Khó thắng nhiều nhất trong bàn 4 người (trên 25%)', hardWins >= 13);
}

/* ---------- 3. 50 trận 2 người: Dễ vs Dễ ---------- */
{
  let stuck = 0, poolEnds = 0, emptyEnds = 0;
  for (let i = 0; i < 50; i++) {
    const { s, ok } = playMatch(3000 + i, ['easy', 'easy']);
    if (!ok || s.phase !== 'ended') { stuck++; continue; }
    if (s.endCause === 'pool-empty') poolEnds++;
    if (s.endCause === 'empty-hand') emptyEnds++;
  }
  console.log(`  · 2 người Dễ vs Dễ (50 trận): kẹt ${stuck}, hết bài ${emptyEnds}, hết chồng ${poolEnds}`);
  t('50 trận Dễ vs Dễ đều kết thúc, 0 kẹt', stuck === 0);
}

/* ---------- 4. 20 trận 4 người: Khó vs Khó ---------- */
{
  let stuck = 0, longest = 0;
  for (let i = 0; i < 20; i++) {
    const { s, ok, guard } = playMatch(4000 + i, ['hard', 'hard', 'hard', 'hard']);
    if (!ok || s.phase !== 'ended') { stuck++; continue; }
    if (guard > longest) longest = guard;
  }
  console.log(`  · 4 người Khó vs Khó (20 trận): kẹt ${stuck}, dài nhất ${longest} lượt`);
  t('20 trận Khó vs Khó đều kết thúc, 0 kẹt', stuck === 0);
}

/* ---------- 5. 20 trận 3 người: xen kẽ ---------- */
{
  let stuck = 0;
  for (let i = 0; i < 20; i++) {
    const { s, ok } = playMatch(5000 + i, ['easy', 'hard', 'easy']);
    if (!ok || s.phase !== 'ended') stuck++;
  }
  console.log(`  · 3 người Dễ/Khó/Dễ (20 trận): kẹt ${stuck}`);
  t('20 trận 3 người đều kết thúc, 0 kẹt', stuck === 0);
}

console.log(`\nMô phỏng Rummikub: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
