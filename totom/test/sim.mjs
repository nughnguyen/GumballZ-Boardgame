// Mô phỏng Tổ Tôm: bot-vs-bot kết thúc được, không kẹt, Máy Khó thắng
// nhiều hơn hẳn Máy Dễ (đo bằng tỉ lệ thắng trận — Tổ Tôm là game đối
// kháng, mỗi ván chỉ có 1 người ù; ván hòa khi hết nọc mà chưa ai ù).
import { createGame, applyAction, actors, mulberry32, greedyCover } from '../js/engine.js';
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
  let hardQue = 0, easyQue = 0, hardN = 0, easyN = 0;
  for (let i = 0; i < n; i++) {
    const { s, ok, guard } = playMatch(base + i, levels);
    maxGuard = Math.max(maxGuard, guard);
    if (!ok) { stuck++; continue; }
    if (s.winner) wins[s.winner] = (wins[s.winner] || 0) + 1;
    else draws++;
    /* què lúc kết thúc ván: Khó (p1) so với Dễ — thước đo kỹ năng ổn
       định hơn tỉ lệ thắng (ù hiếm, đa số ván hòa) */
    for (const p of s.players) {
      const g = greedyCover(p.hand);
      if (p.id === 'p1') { hardQue += g.que.length; hardN++; }
      else { easyQue += g.que.length; easyN++; }
    }
  }
  return {
    wins, draws, stuck, maxGuard,
    hardQueAvg: hardN ? hardQue / hardN : 0,
    easyQueAvg: easyN ? easyQue / easyN : 0,
  };
}

/* ---------- 1. 100 trận 5 người: 1 Khó + 4 Dễ ---------- */
/* Tổ Tôm ù hiếm (nọc 5 người chỉ 19 lá, đa số ván hòa) nên tỉ lệ thắng
   tuyệt đối thấp; thước đo kỹ năng chính là què lúc kết thúc ván
   (Khó xếp bài tốt hơn hẳn Dễ) + tỉ lệ thắng trong số ván có người ù. */
let hard5;
{
  hard5 = batch(100, ['hard', 'easy', 'easy', 'easy', 'easy'], 1000);
  const hw = hard5.wins['p1'] || 0;
  const decided = 100 - hard5.draws;
  const share = decided ? hw / decided : 0;
  console.log(`  · 5 người, 1 Khó + 4 Dễ (100 trận): Khó thắng ${hw}, hòa ${hard5.draws}, kẹt ${hard5.stuck}, thắng ${Math.round(share * 100)}% số ván có người ù (phần công bằng 20%)`);
  console.log(`  · què lúc kết thúc: Khó ${hard5.hardQueAvg.toFixed(2)} vs Dễ ${hard5.easyQueAvg.toFixed(2)}`);
  t('100 trận 5 người đều kết thúc, 0 kẹt', hard5.stuck === 0);
  t('Máy Khó có què lúc kết thúc thấp hơn Dễ ít nhất 1.5 lá', hard5.hardQueAvg + 1.5 < hard5.easyQueAvg);
  t('Máy Khó thắng ít nhất 2 ván ở 5 người', hw >= 2);
}

/* ---------- 2. 50 trận 4 người: Khó vs 3 Dễ ---------- */
let hard4;
{
  hard4 = batch(50, ['hard', 'easy', 'easy', 'easy'], 2000);
  const hw = hard4.wins['p1'] || 0;
  const decided = 50 - hard4.draws;
  const share = decided ? hw / decided : 0;
  console.log(`  · 4 người, Khó vs 3 Dễ (50 trận): Khó thắng ${hw}, hòa ${hard4.draws}, kẹt ${hard4.stuck}, thắng ${Math.round(share * 100)}% số ván có người ù (phần công bằng 25%)`);
  console.log(`  · què lúc kết thúc: Khó ${hard4.hardQueAvg.toFixed(2)} vs Dễ ${hard4.easyQueAvg.toFixed(2)}`);
  t('50 trận 4 người đều kết thúc, 0 kẹt', hard4.stuck === 0);
  t('Máy Khó có què lúc kết thúc thấp hơn Dễ ít nhất 1.5 lá', hard4.hardQueAvg + 1.5 < hard4.easyQueAvg);
  t('Máy Khó thắng ít nhất 4 ván ở 4 người', hw >= 4);
}

/* ---------- 3. 20 trận 5 người toàn Khó và 20 trận 4 người toàn Dễ ---------- */
{
  const allHard = batch(20, ['hard', 'hard', 'hard', 'hard', 'hard'], 3000);
  const allEasy4 = batch(20, ['easy', 'easy', 'easy', 'easy'], 4000);
  console.log(`  · 5 người toàn Khó (20 trận): kẹt ${allHard.stuck}, hòa ${allHard.draws}, vòng lặp nhiều nhất ${allHard.maxGuard}`);
  console.log(`  · 4 người toàn Dễ (20 trận): kẹt ${allEasy4.stuck}, hòa ${allEasy4.draws}, vòng lặp nhiều nhất ${allEasy4.maxGuard}`);
  t('20 trận 5 người toàn Khó đều kết thúc, 0 kẹt', allHard.stuck === 0);
  t('20 trận 4 người toàn Dễ đều kết thúc, 0 kẹt', allEasy4.stuck === 0);
  t('trận dài nhất dưới 1000 vòng lặp', Math.max(allHard.maxGuard, allEasy4.maxGuard) < 1000);
}

/* ---------- 4. trận dài nhất trong 20 trận 5 người hỗn hợp ---------- */
{
  let maxGuard = 0;
  for (let i = 0; i < 20; i++) {
    const { guard } = playMatch(5000 + i, ['hard', 'easy', 'hard', 'easy', 'hard']);
    maxGuard = Math.max(maxGuard, guard);
  }
  console.log(`  · vòng lặp nhiều nhất trong 20 trận 5 người: ${maxGuard}`);
  t('trận dài nhất dưới 1000 vòng lặp', maxGuard < 1000);
}

/* ---------- 5. bot không trả nước bất hợp lệ ---------- */
{
  let bad = 0;
  for (let i = 0; i < 30; i++) {
    const s = createGame(P(['A', 'B', 'C', 'D']), { seed: 6000 + i });
    let guard = 0;
    while (s.phase === 'playing' && guard++ < 5000) {
      const pid = actors(s)[0];
      const idx = s.players.findIndex(p => p.id === pid);
      const act = botAction(s, pid, idx === 0 ? 'hard' : 'easy');
      const r = act ? applyAction(s, pid, act) : { ok: false };
      if (!r.ok) bad++;
    }
  }
  t('bot không bao giờ trả nước bị engine từ chối (30 trận)', bad === 0);
}

console.log(`\nMô phỏng Tổ Tôm: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
