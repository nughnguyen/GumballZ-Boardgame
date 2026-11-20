// Mô phỏng Vẽ Truyền Tin: bot chơi tới cùng (không kẹt, không sai luật),
// máy Khó đoán đúng nhiều hơn máy Dễ, tỉ lệ thắng chơi đơn ở cả 2 mức
// với ngưỡng ≥3/5. Chạy: node vetruyentin/test/sim.mjs
import { createGame, applyAction, actors, stepKind } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random — seed riêng mỗi ván để kết quả ổn định */
let _s = 20261120;
function reseed(seed) {
  _s = seed;
  Math.random = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

let pass = 0, fail = 0;
const t = (n, c, extra = '') => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (extra ? ' — ' + extra : '')); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));

/* lái 1 ván bằng botAction cho mọi người (kể cả ghế người — bot vẽ nguệch ngoạc thay) */
function playGame(players, opts, levels, baseSeed) {
  reseed(baseSeed);
  const s = createGame(players, opts);
  let guard = 0, illegal = 0, stuck = 0;
  while (s.phase !== 'ended' && guard++ < 3000) {
    const act = actors(s);
    if (!act.length) { stuck++; break; }
    for (const pid of act) {
      if (s.phase !== 'playing') break;
      const a = botAction(s, pid, levels[pid] || 'easy');
      if (!a) { stuck++; break; }
      const r = applyAction(s, pid, a);
      if (!r.ok) { illegal++; break; }
    }
    if (illegal || stuck) break;
  }
  return { s, illegal, stuck, ended: s.phase === 'ended' };
}

/* ---- chơi đơn: tỉ lệ thắng ở 2 mức (100 ván mỗi mức) ---- */
const SOLO_N = 100;
const soloStats = {};
for (const level of ['easy', 'hard']) {
  let wins = 0, kept = 0, correct = 0, stuck = 0, illegal = 0, finished = 0;
  for (let i = 0; i < SOLO_N; i++) {
    const { s, illegal: il, stuck: st, ended } = playGame(P(['An']), { seed: 5000 + i, vtMode: 'solo', botLevel: level }, { p1: level, bot1: level }, 9000 + i);
    if (ended) finished++;
    if (il) illegal++;
    if (st) stuck++;
    if (s.winner === 'p1') wins++;
    kept += s.prog['p1'].wordsKept;
    correct += s.prog['bot1'].correctGuesses;
  }
  soloStats[level] = { wins, winRate: wins / SOLO_N, avgKept: kept / SOLO_N, botCorrect: correct / (SOLO_N * 5), finished, illegal, stuck };
  console.log(`  solo ${level}: thắng ${wins}/${SOLO_N} (${(wins / SOLO_N * 100).toFixed(0)}%), giữ từ TB ${soloStats[level].avgKept.toFixed(2)}/5, máy đoán đúng ${(soloStats[level].botCorrect * 100).toFixed(0)}%, xong ${finished}/${SOLO_N}, kẹt ${stuck}, sai luật ${illegal}`);
}
t('chơi đơn Dễ: 100/100 ván xong, 0 kẹt, 0 sai luật', soloStats.easy.finished === SOLO_N && soloStats.easy.stuck === 0 && soloStats.easy.illegal === 0);
t('chơi đơn Khó: 100/100 ván xong, 0 kẹt, 0 sai luật', soloStats.hard.finished === SOLO_N && soloStats.hard.stuck === 0 && soloStats.hard.illegal === 0);
t('chơi đơn Dễ: tỉ lệ thắng 10–40% (lý thuyết ~24%)', soloStats.easy.winRate >= 0.10 && soloStats.easy.winRate <= 0.40, `got ${(soloStats.easy.winRate * 100).toFixed(0)}%`);
t('chơi đơn Khó: tỉ lệ thắng 60–90% (lý thuyết ~76%)', soloStats.hard.winRate >= 0.60 && soloStats.hard.winRate <= 0.90, `got ${(soloStats.hard.winRate * 100).toFixed(0)}%`);
t('chơi đơn: máy Khó thắng nhiều hơn máy Dễ (đảo độ khó — xem chú thích engine)', soloStats.hard.winRate > soloStats.easy.winRate + 0.2);
t('chơi đơn: máy đoán đúng ~35% (Dễ) / ~65% (Khó)', Math.abs(soloStats.easy.botCorrect - 0.35) < 0.12 && Math.abs(soloStats.hard.botCorrect - 0.65) < 0.12);

/* ---- nhiều người: máy Khó đoán đúng nhiều hơn máy Dễ ---- */
{
  const N = 50;
  let finished = 0, stuck = 0, illegal = 0;
  const byLevel = { easy: { c: 0, t: 0 }, hard: { c: 0, t: 0 } };
  for (let i = 0; i < N; i++) {
    const levels = { p1: 'hard', p2: 'easy', p3: 'hard', p4: 'easy' };
    const { s, illegal: il, stuck: st, ended } = playGame(P(['A', 'B', 'C', 'D']), { seed: 6000 + i, vtMode: 'multi' }, levels, 20000 + i);
    if (ended) finished++;
    if (il) illegal++;
    if (st) stuck++;
    for (const pid of ['p1', 'p2', 'p3', 'p4']) {
      const q = s.final.summary[pid];
      byLevel[levels[pid]].c += q.correctGuesses;
      byLevel[levels[pid]].t += q.totalGuesses;
    }
  }
  const easyRate = byLevel.easy.c / byLevel.easy.t;
  const hardRate = byLevel.hard.c / byLevel.hard.t;
  console.log(`  nhiều người 4p × ${N}: máy Dễ đoán đúng ${(easyRate * 100).toFixed(0)}% (${byLevel.easy.c}/${byLevel.easy.t}), máy Khó ${(hardRate * 100).toFixed(0)}% (${byLevel.hard.c}/${byLevel.hard.t})`);
  t('nhiều người: 50/50 ván xong, 0 kẹt, 0 sai luật', finished === N && stuck === 0 && illegal === 0);
  t('nhiều người: máy Khó đoán đúng nhiều hơn máy Dễ rõ rệt', hardRate > easyRate + 0.15, `Khó ${(hardRate * 100).toFixed(0)}% vs Dễ ${(easyRate * 100).toFixed(0)}%`);
  t('nhiều người: máy Dễ đoán đúng <50%, máy Khó >50%', easyRate < 0.5 && hardRate > 0.5);
}

/* ---- đấu máy: 2 sổ cùng chạy, ván xong ---- */
for (const level of ['easy', 'hard']) {
  const N = 50;
  let finished = 0, stuck = 0, illegal = 0, humanWins = 0, botWins = 0, draws = 0;
  for (let i = 0; i < N; i++) {
    const players = [{ id: 'p1', name: 'An' }, { id: 'bot9', name: 'Mochi 🤖', isBot: true, level }];
    const { s, illegal: il, stuck: st, ended } = playGame(players, { seed: 7000 + i, vtMode: 'race', botLevel: level }, { p1: level, bot9: level }, 30000 + i);
    if (ended) finished++;
    if (il) illegal++;
    if (st) stuck++;
    if (s.winner === 'p1') humanWins++;
    else if (s.winner === 'bot9') botWins++;
    else draws++;
  }
  console.log(`  đấu máy ${level}: xong ${finished}/${N}, người thắng ${humanWins}, máy thắng ${botWins}, hoà ${draws}, kẹt ${stuck}, sai luật ${illegal}`);
  t(`đấu máy ${level}: ${N}/${N} ván xong, 0 kẹt, 0 sai luật`, finished === N && stuck === 0 && illegal === 0);
  t(`đấu máy ${level}: có ván người thắng, có ván máy thắng (không một chiều)`, humanWins > 0 && botWins > 0);
}

/* ---- 8 người (tối đa) ---- */
{
  const N = 20;
  let finished = 0, stuck = 0, illegal = 0;
  for (let i = 0; i < N; i++) {
    const levels = {};
    for (let j = 1; j <= 8; j++) levels['p' + j] = j % 2 ? 'hard' : 'easy';
    const { illegal: il, stuck: st, ended } = playGame(P(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']), { seed: 8000 + i, vtMode: 'multi' }, levels, 40000 + i);
    if (ended) finished++;
    if (il) illegal++;
    if (st) stuck++;
  }
  t('8 người: 20/20 ván xong, 0 kẹt, 0 sai luật', finished === N && stuck === 0 && illegal === 0);
}

console.log(`\nSIM: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
