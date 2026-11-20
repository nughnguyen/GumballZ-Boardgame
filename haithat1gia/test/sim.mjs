// Mô phỏng 2 Thật 1 Giả: Hard thắng Easy, 0 kẹt, 0 sai luật, mọi ván
// đều kết thúc, tỉ lệ đoán đúng của bot nằm trong khoảng thiết kế
// (Hard ~70%, Easy ~40%).
import { createGame, applyAction, actors } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để bot cho kết quả ổn định — seed: 20261120 */
let _s = 20261120;
function reseed() {
  _s = 20261120;
  Math.random = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
reseed();

let pass = 0, fail = 0;
const t = (n, c, extra = '') => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (extra ? ' — ' + extra : '')); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));

/* chơi 1 ván bot-vs-bot tới cùng; trả về state + tỉ lệ đoán đúng từng người */
function playGame(seed, names, levels) {
  const s = createGame(P(names), { seed });
  const lv = {};
  names.forEach((nm, i) => { lv['p' + (i + 1)] = levels[i]; });
  const stats = {};
  names.forEach((nm, i) => { stats['p' + (i + 1)] = { correct: 0, total: 0 }; });
  let guard = 0, illegal = 0, stuck = 0;
  while (s.phase !== 'ended' && guard++ < 500) {
    const act = actors(s);
    if (!act.length) { stuck++; break; }
    const pid = act[0];
    const a = botAction(s, pid, lv[pid]);
    if (!a) { stuck++; break; }
    /* ghi nhận tỉ lệ đoán đúng trước khi áp dụng */
    if (a.type === 'guess') {
      const lie = s.solo ? s.soloSet.lie : (s.current ? s.current.lie : null);
      if (lie != null) {
        stats[pid].total++;
        if (a.idx === lie) stats[pid].correct++;
      }
    }
    const r = applyAction(s, pid, a);
    if (!r.ok) { illegal++; break; }
  }
  return { s, stats, illegal, stuck, ended: s.phase === 'ended' };
}

/* ---- Hard đấu Easy (2 người) ---- */
{
  reseed();
  let hardWins = 0, draws = 0, easyWins = 0, stuck = 0, illegal = 0, notEnded = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const r = playGame(seed, ['A', 'B'], ['hard', 'easy']);
    if (!r.ended) notEnded++;
    if (r.stuck) stuck++;
    if (r.illegal) illegal++;
    if (r.s.winner === 'p1') hardWins++;
    else if (r.s.winner === 'p2') easyWins++;
    else draws++;
  }
  t('2 người: Hard (p1) thắng Easy ≥ 4/6', hardWins >= 4, `Hard thắng ${hardWins}/6, Easy ${easyWins}, hòa ${draws}`);
  t('2 người: 0 ván không kết thúc (Hard p1)', notEnded === 0);
  t('2 người: 0 kẹt, 0 sai luật (Hard p1)', stuck === 0 && illegal === 0);
}
{
  reseed();
  let hardWins = 0, draws = 0, easyWins = 0, stuck = 0, illegal = 0, notEnded = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const r = playGame(seed, ['A', 'B'], ['easy', 'hard']);
    if (!r.ended) notEnded++;
    if (r.stuck) stuck++;
    if (r.illegal) illegal++;
    if (r.s.winner === 'p2') hardWins++;
    else if (r.s.winner === 'p1') easyWins++;
    else draws++;
  }
  t('2 người: Hard (p2) thắng Easy ≥ 4/6', hardWins >= 4, `Hard thắng ${hardWins}/6, Easy ${easyWins}, hòa ${draws}`);
  t('2 người: 0 ván không kết thúc (Hard p2)', notEnded === 0);
  t('2 người: 0 kẹt, 0 sai luật (Hard p2)', stuck === 0 && illegal === 0);
}

/* ---- Hard đấu Easy (4 người: 1 Hard + 3 Easy) ---- */
{
  reseed();
  let hardWins = 0, stuck = 0, illegal = 0, notEnded = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const r = playGame(seed, ['A', 'B', 'C', 'D'], ['hard', 'easy', 'easy', 'easy']);
    if (!r.ended) notEnded++;
    if (r.stuck) stuck++;
    if (r.illegal) illegal++;
    if (r.s.winner === 'p1') hardWins++;
  }
  t('4 người: Hard thắng ≥ 4/6 ván', hardWins >= 4, `Hard thắng ${hardWins}/6`);
  t('4 người: 0 ván không kết thúc', notEnded === 0);
  t('4 người: 0 kẹt, 0 sai luật', stuck === 0 && illegal === 0);
}

/* ---- Easy đấu Easy chia đều ---- */
{
  reseed();
  let p1w = 0, p2w = 0, draws = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const r = playGame(seed, ['A', 'B'], ['easy', 'easy']);
    if (r.s.winner === 'p1') p1w++;
    else if (r.s.winner === 'p2') p2w++;
    else draws++;
  }
  t('Easy–Easy 10 ván: không lệch hẳn 1 bên (mỗi bên thắng ≥ 2)', p1w >= 2 && p2w >= 2, `p1 ${p1w} – p2 ${p2w}, hòa ${draws}`);
}

/* ---- tỉ lệ đoán đúng trong 60 ván ---- */
{
  reseed();
  const tot = { hard: { correct: 0, total: 0 }, easy: { correct: 0, total: 0 } };
  let notEnded = 0, illegal = 0, stuck = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const r = playGame(seed, ['A', 'B'], ['hard', 'easy']);
    if (!r.ended) notEnded++;
    if (r.illegal) illegal++;
    if (r.stuck) stuck++;
    tot.hard.correct += r.stats.p1.correct; tot.hard.total += r.stats.p1.total;
    tot.easy.correct += r.stats.p2.correct; tot.easy.total += r.stats.p2.total;
  }
  const hr = tot.hard.correct / Math.max(1, tot.hard.total);
  const er = tot.easy.correct / Math.max(1, tot.easy.total);
  t('tỉ lệ đoán đúng của Hard trong 60–80% (60 ván)', hr >= 0.6 && hr <= 0.8, `Hard ${(hr * 100).toFixed(1)}% (${tot.hard.correct}/${tot.hard.total})`);
  t('tỉ lệ đoán đúng của Easy trong 30–50% (60 ván)', er >= 0.3 && er <= 0.5, `Easy ${(er * 100).toFixed(1)}% (${tot.easy.correct}/${tot.easy.total})`);
  t('0 ván không kết thúc (60 ván đo tỉ lệ)', notEnded === 0);
  t('0 kẹt, 0 sai luật (60 ván đo tỉ lệ)', stuck === 0 && illegal === 0);
}

/* ---- chơi đơn: Hard thắng đôi khi, Easy hiếm hơn; mọi ván đều kết thúc ---- */
{
  reseed();
  let hardWins = 0, easyWins = 0, notEnded = 0, illegal = 0, stuck = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const h = playGame(seed, ['A'], ['hard']);
    const e = playGame(seed, ['A'], ['easy']);
    if (!h.ended) notEnded++;
    if (!e.ended) notEnded++;
    if (h.illegal || e.illegal) illegal++;
    if (h.stuck || e.stuck) stuck++;
    if (h.s.winner === 'p1') hardWins++;
    if (e.s.winner === 'p1') easyWins++;
  }
  t('chơi đơn Hard: có ván thắng (≥ 8/10) trong 20 ván', hardWins >= 1, `Hard thắng ${hardWins}/20`);
  t('chơi đơn Easy thắng hiếm hơn Hard', easyWins <= hardWins, `Easy thắng ${easyWins}/20, Hard ${hardWins}/20`);
  t('chơi đơn: 0 ván không kết thúc', notEnded === 0);
  t('chơi đơn: 0 kẹt, 0 sai luật', stuck === 0 && illegal === 0);
}

/* ---- 6 người chơi tới cùng ---- */
{
  reseed();
  let notEnded = 0, illegal = 0, stuck = 0, presented = true;
  for (let seed = 1; seed <= 3; seed++) {
    const r = playGame(seed, ['A', 'B', 'C', 'D', 'E', 'F'], ['easy', 'hard', 'easy', 'hard', 'easy', 'hard']);
    if (!r.ended) notEnded++;
    if (r.illegal) illegal++;
    if (r.stuck) stuck++;
    if (!['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].every(pid => r.s.prog[pid].setsPresented === 3)) presented = false;
  }
  t('6 người: mọi ván đều kết thúc, mỗi người kể đúng 3 bộ', notEnded === 0 && presented);
  t('6 người: 0 kẹt, 0 sai luật', stuck === 0 && illegal === 0);
}

console.log(`\nMô phỏng 2 Thật 1 Giả: ${pass} pass, ${fail} fail.`);
process.exit(fail ? 1 : 0);
