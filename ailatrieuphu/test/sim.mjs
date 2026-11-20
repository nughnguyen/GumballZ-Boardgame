// Mô phỏng Ai Là Triệu Phú: Hard thắng Easy, Easy–Easy chia đều,
// 0 kẹt, 0 sai luật, mọi ván đua đều kết thúc, tỉ lệ đúng của bot
// nằm trong khoảng thiết kế (Hard ~85%, Easy ~55%).
import { createGame, applyAction, actors, effectiveQuestion } from '../js/engine.js';
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

/* chơi 1 ván đua bot-vs-bot tới cùng; trả về state + số liệu thống kê */
function playRace(seed, l1, l2) {
  const s = createGame(P(['A', 'B']), { seed });
  const lv = { p1: l1, p2: l2 };
  const stats = { p1: { correct: 0, total: 0 }, p2: { correct: 0, total: 0 } };
  let actions = 0, illegal = 0, stuck = 0;
  let guard = 0;
  while (s.phase !== 'ended' && guard++ < 200) {
    const act = actors(s);
    if (!act.length) { stuck++; break; }
    for (const pid of act) {
      let a = botAction(s, pid, lv[pid]);
      let inner = 0;
      while (a && a.type === 'lifeline' && inner++ < 5) {
        const r = applyAction(s, pid, a);
        if (!r.ok) { illegal++; break; }
        actions++;
        a = botAction(s, pid, lv[pid]);
      }
      if (!a) { stuck++; break; }
      /* ghi nhận tỉ lệ đúng của bot trước khi áp dụng */
      if (a.type === 'answer') {
        const cur = effectiveQuestion(s, pid, s.prog[pid].level);
        stats[pid].total++;
        if (a.opt === cur.answer) stats[pid].correct++;
      }
      const r = applyAction(s, pid, a);
      if (!r.ok) illegal++;
      actions++;
    }
  }
  return { s, stats, actions, illegal, stuck, ended: s.phase === 'ended' };
}

/* ---- Hard đấu Easy ---- */
{
  reseed();
  let hardWins = 0, draws = 0, easyWins = 0, stuck = 0, illegal = 0, notEnded = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const r = playRace(seed, 'hard', 'easy');
    if (!r.ended) notEnded++;
    if (r.stuck) stuck++;
    if (r.illegal) illegal++;
    if (r.s.winner === 'p1') hardWins++;
    else if (r.s.winner === 'p2') easyWins++;
    else draws++;
  }
  t('Hard (p1) thắng Easy (p2) ít nhất 4/6 ván đua', hardWins >= 4, `Hard thắng ${hardWins}/6, Easy ${easyWins}, hòa ${draws}`);
  t('0 ván không kết thúc (Hard–Easy)', notEnded === 0);
  t('0 kẹt, 0 hành động sai luật (Hard–Easy)', stuck === 0 && illegal === 0);
}
{
  reseed();
  let hardWins = 0, easyWins = 0, draws = 0, notEnded = 0;
  for (let seed = 11; seed <= 16; seed++) {
    /* Hard ngồi ghế p2 để kiểm tra cả 2 ghế */
    const r = playRace(seed, 'easy', 'hard');
    if (!r.ended) notEnded++;
    if (r.s.winner === 'p2') hardWins++;
    else if (r.s.winner === 'p1') easyWins++;
    else draws++;
  }
  t('Hard (p2) thắng Easy (p1) ít nhất 4/6 ván đua', hardWins >= 4, `Hard thắng ${hardWins}/6, Easy ${easyWins}, hòa ${draws}`);
  t('0 ván không kết thúc (Easy–Hard)', notEnded === 0);
}

/* ---- Easy đấu Easy: chia đều ---- */
{
  reseed();
  let p1Wins = 0, p2Wins = 0, draws = 0, stuck = 0, illegal = 0, notEnded = 0;
  for (let seed = 21; seed <= 30; seed++) {
    const r = playRace(seed, 'easy', 'easy');
    if (!r.ended) notEnded++;
    if (r.stuck) stuck++;
    if (r.illegal) illegal++;
    if (r.s.winner === 'p1') p1Wins++;
    else if (r.s.winner === 'p2') p2Wins++;
    else draws++;
  }
  t('Easy–Easy: cả 2 bên đều có ván thắng (chia đều)', p1Wins >= 1 && p2Wins >= 1, `p1 ${p1Wins} – p2 ${p2Wins} (hòa ${draws})`);
  t('0 ván không kết thúc (Easy–Easy)', notEnded === 0);
  t('0 kẹt, 0 sai luật (Easy–Easy)', stuck === 0 && illegal === 0);
}

/* ---- Hard đấu Hard: mọi ván đều kết thúc ---- */
{
  reseed();
  let notEnded = 0, stuck = 0, illegal = 0, p1Wins = 0, p2Wins = 0, draws = 0;
  for (let seed = 31; seed <= 40; seed++) {
    const r = playRace(seed, 'hard', 'hard');
    if (!r.ended) notEnded++;
    if (r.stuck) stuck++;
    if (r.illegal) illegal++;
    if (r.s.winner === 'p1') p1Wins++;
    else if (r.s.winner === 'p2') p2Wins++;
    else draws++;
  }
  t('Hard–Hard: 10/10 ván đều kết thúc', notEnded === 0, `p1 ${p1Wins} – p2 ${p2Wins} (hòa ${draws})`);
  t('0 kẹt, 0 sai luật (Hard–Hard)', stuck === 0 && illegal === 0);
}

/* ---- tỉ lệ trả lời đúng của bot trên 60 ván đua ---- */
{
  reseed();
  let hc = 0, ht = 0, ec = 0, et = 0, notEnded = 0, illegal = 0;
  for (let seed = 101; seed <= 160; seed++) {
    const r = playRace(seed, 'hard', 'easy');
    if (!r.ended) notEnded++;
    if (r.illegal) illegal++;
    hc += r.stats.p1.correct; ht += r.stats.p1.total;
    ec += r.stats.p2.correct; et += r.stats.p2.total;
  }
  const hRate = hc / ht, eRate = ec / et;
  t('tỉ lệ đúng của Hard trong 75–95% (60 ván)', hRate >= 0.75 && hRate <= 0.95, `Hard đúng ${hc}/${ht} = ${(hRate * 100).toFixed(1)}%`);
  t('tỉ lệ đúng của Easy trong 40–70% (60 ván)', eRate >= 0.40 && eRate <= 0.70, `Easy đúng ${ec}/${et} = ${(eRate * 100).toFixed(1)}%`);
  t('0 ván không kết thúc (60 ván đo tỉ lệ)', notEnded === 0);
  t('0 hành động sai luật (60 ván đo tỉ lệ)', illegal === 0);
}

/* ---- chơi đơn: bot Hard có thể thắng 150 triệu, Easy thì hiếm ---- */
{
  reseed();
  let hard150 = 0, easy150 = 0;
  for (let seed = 201; seed <= 220; seed++) {
    const s = createGame(P(['Solo']), { seed });
    let guard = 0;
    while (s.phase !== 'ended' && guard++ < 100) {
      const a = botAction(s, 'p1', 'hard');
      if (!a) break;
      if (a.type === 'lifeline') { applyAction(s, 'p1', a); continue; }
      applyAction(s, 'p1', a);
    }
    if (s.endReason === 'win150') hard150++;
  }
  reseed();
  for (let seed = 201; seed <= 220; seed++) {
    const s = createGame(P(['Solo']), { seed });
    let guard = 0;
    while (s.phase !== 'ended' && guard++ < 100) {
      const a = botAction(s, 'p1', 'easy');
      if (!a) break;
      if (a.type === 'lifeline') { applyAction(s, 'p1', a); continue; }
      applyAction(s, 'p1', a);
    }
    if (s.endReason === 'win150') easy150++;
  }
  t('chơi đơn Hard: có ván thắng 150 triệu trong 20 ván', hard150 >= 1, `Hard thắng 150M: ${hard150}/20`);
  t('chơi đơn Easy thắng 150M hiếm hơn Hard', easy150 <= hard150, `Easy thắng 150M: ${easy150}/20`);
}

console.log(`\nMô phỏng Ai Là Triệu Phú: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
