// Mô phỏng Lấy 6: bot-vs-bot kết thúc được, không kẹt, Máy Khó thắng
// Máy Dễ nhiều hơn (đo bằng heuristic lá an toàn).
import { createGame, applyAction, actors, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để kết quả ổn định — seed: 20261119 */
const _rng = mulberry32(20261119);
Math.random = () => _rng();

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));

function playMatch(seed, levels) {
  const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].slice(0, levels.length);
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
      if (!r.ok) return { s, ok: false, guard };
    }
  }
  return { s, ok: s.phase === 'ended', guard };
}

/* ---------- 1. 100 trận 2 người: Khó vs Dễ ---------- */
{
  let hardWins = 0, easyWins = 0, stuck = 0;
  for (let i = 0; i < 100; i++) {
    const { s, ok } = playMatch(1000 + i, ['hard', 'easy']);
    if (!ok || s.phase !== 'ended') { stuck++; continue; }
    if (s.winner === 'p1') hardWins++;
    else if (s.winner === 'p2') easyWins++;
  }
  console.log(`  · 2 người Khó vs Dễ (100 trận): Khó thắng ${hardWins}, Dễ thắng ${easyWins}, kẹt ${stuck}`);
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

/* ---------- 3. 20 trận 10 người: xen kẽ Khó/Dễ ---------- */
{
  let stuck = 0, done = 0;
  for (let i = 0; i < 20; i++) {
    const levels = Array.from({ length: 10 }, (_, j) => (j % 2 === 0 ? 'hard' : 'easy'));
    const { s, ok } = playMatch(3000 + i, levels);
    if (!ok || s.phase !== 'ended') stuck++;
    else done++;
  }
  t('20 trận 10 người đều kết thúc, 0 kẹt', stuck === 0 && done === 20);
}

/* ---------- 4. trận dài nhất dưới 300 vòng lặp ---------- */
{
  let maxGuard = 0;
  for (let i = 0; i < 20; i++) {
    const { guard } = playMatch(4000 + i, ['hard', 'easy', 'hard', 'easy']);
    maxGuard = Math.max(maxGuard, guard);
  }
  console.log(`  · vòng lặp nhiều nhất trong 20 trận 4 người: ${maxGuard}`);
  t('trận dài nhất dưới 300 vòng lặp', maxGuard < 300);
}

/* ---------- 5. bot không trả nước bất hợp lệ ---------- */
{
  let bad = 0;
  for (let i = 0; i < 30; i++) {
    const s = createGame(P(['A', 'B', 'C']), { seed: 5000 + i });
    let guard = 0;
    while (s.phase === 'playing' && guard++ < 1000) {
      for (const pid of actors(s)) {
        if (s.phase !== 'playing') break;
        const idx = s.players.findIndex(p => p.id === pid);
        const act = botAction(s, pid, idx === 0 ? 'hard' : 'easy');
        const r = act ? applyAction(s, pid, act) : { ok: false };
        if (!r.ok) bad++;
      }
    }
  }
  t('bot không bao giờ trả nước bị engine từ chối (30 trận)', bad === 0);
}

console.log(`\nMô phỏng Lấy 6: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
