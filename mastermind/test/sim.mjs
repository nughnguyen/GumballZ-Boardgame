// Mô phỏng Mastermind: bot đấu bot nhiều ván, kiểm 0 ván kẹt, 0 nước sai
// luật, ghi tỉ lệ thắng + số lượt đoán trung bình/dài nhất.
import { createGame, applyAction, actors } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để bot cho kết quả ổn định — seed: 20261120 */
let _s = 20261120;
Math.random = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));

function playMatch(levels, seed) {
  const s = createGame(P(['A', 'B']), { seed });
  let guard = 0, illegal = 0, stuck = 0;
  while (s.phase !== 'ended' && guard++ < 100) {
    const pid = actors(s)[0];
    if (!pid) { stuck++; break; }
    const idx = s.players.findIndex(p => p.id === pid);
    const act = botAction(s, pid, levels[idx]);
    if (!act) { stuck++; break; }
    const r = applyAction(s, pid, act);
    if (!r.ok) { illegal++; console.log('  (nước sai luật:', JSON.stringify(act), r.reason, 'seed', seed, ')'); break; }
  }
  if (s.phase !== 'ended') stuck++;
  return { winner: s.winner, turns: guard, illegal, stuck, final: s.final };
}

function run(label, levels, count, seedBase) {
  let hardW = 0, easyW = 0, draws = 0, stuck = 0, illegal = 0, unfinished = 0;
  const winsByPid = { p1: 0, p2: 0 };
  let total = 0, longest = 0, crackSum = 0, crackN = 0;
  for (let i = 0; i < count; i++) {
    const r = playMatch(levels, seedBase + i);
    if (r.illegal) illegal++;
    if (r.stuck) stuck++;
    if (!r.winner && r.final) draws++;
    if (!r.final) unfinished++;
    else {
      if (r.winner) {
        winsByPid[r.winner]++;
        const wi = levels[['p1', 'p2'].indexOf(r.winner)];
        if (wi === 'hard') hardW++; else if (wi === 'easy') easyW++;
        const sum = r.final.summary[r.winner];
        if (sum.cracked) { crackSum += sum.guesses; crackN++; }
      }
    }
    total += r.turns;
    if (r.turns > longest) longest = r.turns;
  }
  console.log(`  ${label}: ${count} ván — Khó thắng ${hardW}, Dễ thắng ${easyW}, hòa ${draws}, kẹt ${stuck}, sai luật ${illegal}, chưa xong ${unfinished}, TB ${count ? (total / count).toFixed(1) : 0} hành động/ván, dài nhất ${longest}, TB lượt đoán khi đoán ra ${crackN ? (crackSum / crackN).toFixed(1) : '–'}`);
  return { hardW, easyW, draws, stuck, illegal, unfinished, winsByPid };
}

const t0 = Date.now();
const rHE = run('Khó (đi trước) vs Dễ', ['hard', 'easy'], 20, 1000);
const rEH = run('Dễ (đi trước) vs Khó', ['easy', 'hard'], 20, 2000);
const rEE = run('Dễ vs Dễ', ['easy', 'easy'], 10, 3000);
const rHH = run('Khó vs Khó', ['hard', 'hard'], 10, 4000);
console.log(`  (mô phỏng xong trong ${((Date.now() - t0) / 1000).toFixed(1)}s)`);

t('0 ván kẹt trong tất cả mô phỏng', rHE.stuck + rEH.stuck + rEE.stuck + rHH.stuck === 0);
t('0 nước sai luật trong tất cả mô phỏng', rHE.illegal + rEH.illegal + rEE.illegal + rHH.illegal === 0);
t('mọi ván đều kết thúc (có người thắng hoặc hòa)', rHE.unfinished + rEH.unfinished + rEE.unfinished + rHH.unfinished === 0);
t('Khó thắng nhiều hơn Dễ khi đi trước (20 ván)', rHE.hardW > rHE.easyW);
t('Khó thắng nhiều hơn Dễ khi đi sau (20 ván)', rEH.hardW > rEH.easyW);
t('Khó thắng Dễ ≥ 4/6 ở 6 ván đầu (đi trước)', (() => {
  /* 6 ván đầu của dãy Khó-đi-trước đã chạy trong rHE — chạy lại riêng 6 ván */
  let hw = 0;
  for (let i = 0; i < 6; i++) {
    const r = playMatch(['hard', 'easy'], 1000 + i);
    if (r.winner === 'p1') hw++;
  }
  console.log(`  (6 ván đầu Khó-đi-trước: Khó thắng ${hw}/6)`);
  return hw >= 4;
})());
t('Dễ vs Dễ: cả 2 bên đều có ván thắng', rEE.winsByPid.p1 > 0 && rEE.winsByPid.p2 > 0);
t('Khó vs Khó: mọi ván đều kết thúc', rHH.unfinished === 0);

console.log(`\nMô phỏng Mastermind: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
