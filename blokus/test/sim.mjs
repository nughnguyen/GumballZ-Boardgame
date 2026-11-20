// Mô phỏng Blokus: bot đấu bot nhiều ván, kiểm 0 ván kẹt, 0 nước sai
// luật, ghi tỉ lệ thắng + số lượt trung bình/dài nhất + điểm trung bình.
import { createGame, applyAction, actors } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để bot cho kết quả ổn định — seed: 20261120 */
let _s = 20261120;
Math.random = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));

function playMatch(n, levels, seed) {
  const names = ['A', 'B', 'C', 'D'].slice(0, n);
  const s = createGame(P(names), { seed });
  let guard = 0, illegal = 0, stuck = 0;
  while (s.phase === 'playing' && guard++ < 500) {
    const pid = actors(s)[0];
    if (!pid) { stuck++; break; }
    const idx = s.players.findIndex(p => p.id === pid);
    const act = botAction(s, pid, levels[idx]);
    if (!act) { stuck++; break; }
    const r = applyAction(s, pid, act);
    if (!r.ok) { illegal++; console.log('  (nước sai luật:', JSON.stringify(act), r.reason, 'seed', seed, ')'); break; }
  }
  if (s.phase !== 'ended') stuck++;
  /* guard = tổng số hành động (đặt + bỏ lượt) đã đánh */
  return { winner: s.winner, turns: guard, illegal, stuck, final: s.final };
}

function run(label, n, levels, count, seedBase) {
  let hardW = 0, easyW = 0, stuck = 0, illegal = 0, unfinished = 0;
  const winsByPid = { p1: 0, p2: 0, p3: 0, p4: 0 };
  let total = 0, longest = 0, scoreSum = 0, bonus15 = 0, bonus20 = 0;
  for (let i = 0; i < count; i++) {
    const r = playMatch(n, levels, seedBase + i);
    if (r.illegal) illegal++;
    if (r.stuck) stuck++;
    if (!r.winner) unfinished++;
    else {
      winsByPid[r.winner]++;
      const wi = levels[['p1', 'p2', 'p3', 'p4'].indexOf(r.winner)];
      if (wi === 'hard') hardW++; else if (wi === 'easy') easyW++;
      scoreSum += r.final.scores.find(x => x.id === r.winner).score;
      for (const [pid, sum] of Object.entries(r.final.summary)) {
        if (sum.bonus === 15) bonus15++;
        if (sum.bonus === 20) bonus20++;
      }
    }
    total += r.turns;
    if (r.turns > longest) longest = r.turns;
  }
  console.log(`  ${label}: ${count} ván — Khó thắng ${hardW}, Dễ thắng ${easyW}, kẹt ${stuck}, sai luật ${illegal}, chưa xong ${unfinished}, TB ${count ? (total / count).toFixed(1) : 0} hành động/ván, dài nhất ${longest}, điểm TB người thắng ${count - unfinished ? (scoreSum / (count - unfinished)).toFixed(1) : 0}, thưởng +15: ${bonus15} lượt, +20: ${bonus20} lượt`);
  return { hardW, easyW, stuck, illegal, unfinished, winsByPid };
}

const t0 = Date.now();
const r2 = run('2 người Khó vs Dễ', 2, ['hard', 'easy'], 20, 1000);
const rEE = run('2 người Dễ vs Dễ', 2, ['easy', 'easy'], 20, 2000);
const rHH = run('2 người Khó vs Khó', 2, ['hard', 'hard'], 10, 3000);
const r4 = run('4 người 1 Khó + 3 Dễ', 4, ['hard', 'easy', 'easy', 'easy'], 10, 4000);
const r3 = run('3 người 1 Khó + 2 Dễ', 3, ['hard', 'easy', 'easy'], 10, 5000);
console.log(`  (mô phỏng xong trong ${((Date.now() - t0) / 1000).toFixed(1)}s)`);

t('0 ván kẹt trong tất cả mô phỏng', r2.stuck + rEE.stuck + rHH.stuck + r4.stuck + r3.stuck === 0);
t('0 nước sai luật trong tất cả mô phỏng', r2.illegal + rEE.illegal + rHH.illegal + r4.illegal + r3.illegal === 0);
t('mọi ván đều kết thúc (có người thắng)', r2.unfinished + rEE.unfinished + rHH.unfinished + r4.unfinished + r3.unfinished === 0);
t('Khó thắng nhiều hơn Dễ ở 2 người (20 ván)', r2.hardW > r2.easyW);
t('Khó thắng nhiều hơn Dễ ở 4 người (10 ván)', r4.hardW > r4.easyW);
t('Dễ vs Dễ: cả 2 bên đều có ván thắng', rEE.winsByPid.p1 > 0 && rEE.winsByPid.p2 > 0);
t('Khó vs Khó: mọi ván đều kết thúc', rHH.unfinished === 0);

console.log(`\nMô phỏng Blokus: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
