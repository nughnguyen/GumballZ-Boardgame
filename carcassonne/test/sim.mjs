// Mô phỏng Carcassonne: bot-vs-bot kết thúc được, không kẹt, Máy Khó thắng
// nhiều hơn hẳn Máy Dễ (đo bằng tỉ lệ thắng trận + điểm trung bình —
// Carcassonne là game tính điểm, mỗi ván chỉ có 1 người (hoặc vài người
// hòa) thắng).
import { createGame, applyAction, actors, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để kết quả ổn định — seed: 20261120 */
const _rng = mulberry32(20261120);
Math.random = () => _rng();

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));

function playMatch(seed, levels) {
  const names = ['A', 'B', 'C', 'D', 'E'].slice(0, levels.length);
  const s = createGame(P(names), { seed });
  let guard = 0;
  while (s.phase === 'playing' && guard++ < 5000) {
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
  let hardScore = 0, easyScore = 0, hardN = 0, easyN = 0;
  for (let i = 0; i < n; i++) {
    const { s, ok, guard } = playMatch(base + i, levels);
    maxGuard = Math.max(maxGuard, guard);
    if (!ok) { stuck++; continue; }
    for (const p of s.players) {
      if (s.winners.includes(p.id)) wins[p.id] = (wins[p.id] || 0) + 1;
    }
    if (!s.winners.length) draws++;
    for (const p of s.players) {
      if (levels[s.players.indexOf(p)] === 'hard') { hardScore += p.score; hardN++; }
      else { easyScore += p.score; easyN++; }
    }
  }
  return {
    wins, draws, stuck, maxGuard,
    hardAvg: hardN ? hardScore / hardN : 0,
    easyAvg: easyN ? easyScore / easyN : 0,
  };
}

/* ---------- 1. 60 trận 5 người: 1 Khó + 4 Dễ ---------- */
let hard5;
{
  hard5 = batch(60, ['hard', 'easy', 'easy', 'easy', 'easy'], 1000);
  const hw = hard5.wins['p1'] || 0;
  console.log(`  · 5 người, 1 Khó + 4 Dễ (60 trận): Khó thắng ${hw}/60 (phần công bằng 20%), kẹt ${hard5.stuck}`);
  console.log(`  · điểm trung bình: Khó ${hard5.hardAvg.toFixed(1)} vs Dễ ${hard5.easyAvg.toFixed(1)}`);
  t('60 trận 5 người đều kết thúc, 0 kẹt', hard5.stuck === 0);
  t('Máy Khó thắng ít nhất 40% số trận ở 5 người (công bằng 20%)', hw >= 24);
  t('Máy Khó có điểm trung bình cao hơn Dễ ít nhất 4 điểm', hard5.hardAvg > hard5.easyAvg + 4);
}

/* ---------- 2. 40 trận 4 người: Khó vs 3 Dễ ---------- */
let hard4;
{
  hard4 = batch(40, ['hard', 'easy', 'easy', 'easy'], 2000);
  const hw = hard4.wins['p1'] || 0;
  console.log(`  · 4 người, Khó vs 3 Dễ (40 trận): Khó thắng ${hw}/40 (phần công bằng 25%), kẹt ${hard4.stuck}`);
  console.log(`  · điểm trung bình: Khó ${hard4.hardAvg.toFixed(1)} vs Dễ ${hard4.easyAvg.toFixed(1)}`);
  t('40 trận 4 người đều kết thúc, 0 kẹt', hard4.stuck === 0);
  t('Máy Khó thắng ít nhất 45% số trận ở 4 người (công bằng 25%)', hw >= 18);
  t('Máy Khó có điểm trung bình cao hơn Dễ ít nhất 4 điểm', hard4.hardAvg > hard4.easyAvg + 4);
}

/* ---------- 3. 20 trận 5 người toàn Khó và 20 trận 2 người toàn Dễ ---------- */
{
  const allHard = batch(20, ['hard', 'hard', 'hard', 'hard', 'hard'], 3000);
  const allEasy2 = batch(20, ['easy', 'easy'], 4000);
  console.log(`  · 5 người toàn Khó (20 trận): kẹt ${allEasy2.stuck}, vòng lặp nhiều nhất ${allHard.maxGuard}`);
  console.log(`  · 2 người toàn Dễ (20 trận): kẹt ${allEasy2.stuck}, vòng lặp nhiều nhất ${allEasy2.maxGuard}`);
  t('20 trận 5 người toàn Khó đều kết thúc, 0 kẹt', allHard.stuck === 0);
  t('20 trận 2 người toàn Dễ đều kết thúc, 0 kẹt', allEasy2.stuck === 0);
  t('trận dài nhất dưới 1000 vòng lặp', Math.max(allHard.maxGuard, allEasy2.maxGuard) < 1000);
}

/* ---------- 4. trận dài nhất trong 20 trận 5 người hỗn hợp ---------- */
{
  let maxGuard = 0;
  for (let i = 0; i < 20; i++) {
    const { guard } = playMatch(5000 + i, ['hard', 'easy', 'hard', 'easy', 'hard']);
    maxGuard = Math.max(maxGuard, guard);
  }
  console.log(`  · 20 trận 5 người hỗn hợp: vòng lặp nhiều nhất ${maxGuard}`);
  t('20 trận hỗn hợp đều kết thúc dưới 1000 vòng lặp', maxGuard < 1000);
}

console.log(`\nMô phỏng Carcassonne: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
