// Mô phỏng The Resistance: bot Khó chơi tốt hơn bot Dễ, tỉ lệ thắng
// của Gián điệp theo số người, 0 kẹt, 0 phạm luật, mọi ván đều kết thúc.
import { createGame, applyAction, actors } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để bot cho kết quả ổn định — seed: 20261120 */
let _s = 20261120;
function reseed(seed = 20261120) {
  _s = seed;
  Math.random = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

let pass = 0, fail = 0;
const t = (n, c, extra = '') => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (extra ? ' — ' + extra : '')); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));

/* 1 bước mô phỏng: người hành động đầu tiên trong actors() */
function step(s, lv) {
  const act = actors(s);
  if (!act.length) return { stuck: true };
  const pid = act[0];
  const a = botAction(s, pid, lv[pid]);
  if (!a) return { stuck: true };
  const r = applyAction(s, pid, a);
  if (!r.ok) return { illegal: true, reason: r.reason };
  return { ok: true };
}

function playGame(seed, names, levels) {
  reseed(20261120 + seed);
  const s = createGame(P(names), { seed });
  const lv = {};
  names.forEach((_, i) => { lv['p' + (i + 1)] = levels[i]; });
  let guard = 0, illegal = 0, stuck = 0;
  while (s.phase !== 'ended' && guard++ < 3000) {
    const r = step(s, lv);
    if (r.stuck) { stuck++; break; }
    if (r.illegal) { illegal++; break; }
  }
  return { s, illegal, stuck, ended: s.phase === 'ended' };
}

/* Kháng chiến Khó vs Gián điệp Dễ, và ngược lại — 40 ván mỗi loại, 5 người.
   Vai trò chia theo seed nên mỗi ván phe nào Khó/Dễ thay đổi theo vai trò
   thật: gán level theo VAI TRÒ (đọc từ state) chứ không theo ghế. */
function playByRole(seed, names, resLevel, spyLevel) {
  reseed(20261120 + seed);
  const s = createGame(P(names), { seed });
  const lv = {};
  for (const p of s.players) lv[p.id] = s.prog[p.id].side === 'resistance' ? resLevel : spyLevel;
  let guard = 0, illegal = 0, stuck = 0;
  while (s.phase !== 'ended' && guard++ < 3000) {
    const act = actors(s);
    if (!act.length) { stuck++; break; }
    const pid = act[0];
    const a = botAction(s, pid, lv[pid]);
    if (!a) { stuck++; break; }
    const r = applyAction(s, pid, a);
    if (!r.ok) { illegal++; break; }
  }
  return { s, illegal, stuck, ended: s.phase === 'ended' };
}

let resHardWins = 0, resEasyWins = 0, stuckA = 0, illegalA = 0, endedA = 0;
for (let i = 0; i < 40; i++) {
  const { s, illegal, stuck, ended } = playByRole(11 + i, ['A', 'B', 'C', 'D', 'E'], 'hard', 'easy');
  stuckA += stuck; illegalA += illegal;
  if (ended) { endedA++; if (s.winner === 'resistance') resHardWins++; }
}
console.log(`  Kháng chiến Khó vs Gián điệp Dễ (40 ván): Kháng chiến thắng ${resHardWins}/40`);
t('Kháng chiến Khó thắng nhiều hơn 50% trước Gián điệp Dễ', resHardWins > 20, `${resHardWins}/40`);
t('40 ván Kháng chiến Khó: mọi ván đều kết thúc, 0 kẹt, 0 phạm luật', endedA === 40 && stuckA === 0 && illegalA === 0);

let resWinsVsHardSpy = 0, stuckB = 0, illegalB = 0, endedB = 0;
for (let i = 0; i < 40; i++) {
  const { s, illegal, stuck, ended } = playByRole(51 + i, ['A', 'B', 'C', 'D', 'E'], 'easy', 'hard');
  stuckB += stuck; illegalB += illegal;
  if (ended) { endedB++; if (s.winner === 'resistance') resWinsVsHardSpy++; }
}
console.log(`  Kháng chiến Dễ vs Gián điệp Khó (40 ván): Kháng chiến thắng ${resWinsVsHardSpy}/40`);
t('Kháng chiến Khó thắng nhiều hơn Kháng chiến Dễ (cùng đối thủ Gián điệp Khó/Dễ)', resHardWins > resWinsVsHardSpy, `Khó ${resHardWins} > Dễ ${resWinsVsHardSpy}`);
t('40 ván Kháng chiến Dễ: mọi ván đều kết thúc, 0 kẹt, 0 phạm luật', endedB === 40 && stuckB === 0 && illegalB === 0);

/* ---- tỉ lệ thắng của Gián điệp theo số người (toàn bot Dễ) ---- */
for (const [names, label] of [
  [['A', 'B', 'C', 'D', 'E'], '5 người'],
  [['A', 'B', 'C', 'D', 'E', 'F', 'G'], '7 người'],
  [['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'], '10 người'],
]) {
  let spyWins = 0, endedN = 0, stuckN = 0, illegalN = 0, rejectsEnds = 0;
  for (let i = 0; i < 30; i++) {
    const { s, illegal, stuck, ended } = playGame(100 + i, names, names.map(() => 'easy'));
    stuckN += stuck; illegalN += illegal;
    if (ended) {
      endedN++;
      if (s.winner === 'spy') spyWins++;
      if (s.endReason === 'rejects') rejectsEnds++;
    }
  }
  console.log(`  toàn bot Dễ, ${label} (30 ván): Gián điệp thắng ${spyWins}/30, kết thúc vì 5 lần từ chối: ${rejectsEnds}`);
  t(`${label}: mọi ván đều kết thúc, 0 kẹt, 0 phạm luật`, endedN === 30 && stuckN === 0 && illegalN === 0);
  t(`${label}: Gián điệp thắng trong khoảng 10–90% (không áp đảo tuyệt đối)`, spyWins >= 3 && spyWins <= 27, `${spyWins}/30`);
}

/* ---- cân bằng khi 2 phe cùng độ khó: toàn bot Khó, 5 người ---- */
{
  let spyWins = 0, endedN = 0, stuckN = 0, illegalN = 0;
  for (let i = 0; i < 30; i++) {
    const { s, illegal, stuck, ended } = playGame(200 + i, ['A', 'B', 'C', 'D', 'E'], ['hard', 'hard', 'hard', 'hard', 'hard']);
    stuckN += stuck; illegalN += illegal;
    if (ended) { endedN++; if (s.winner === 'spy') spyWins++; }
  }
  console.log(`  toàn bot Khó, 5 người (30 ván): Gián điệp thắng ${spyWins}/30`);
  t('toàn bot Khó 5 người: mọi ván đều kết thúc, 0 kẹt, 0 phạm luật', endedN === 30 && stuckN === 0 && illegalN === 0);
  t('toàn bot Khó 5 người: Gián điệp thắng trong khoảng 10–90% (cân bằng khi cùng độ khó)', spyWins >= 3 && spyWins <= 27, `${spyWins}/30`);
}

/* ---- chơi đơn: người chơi mô phỏng ở 2 độ khó ---- */
function playSoloSim(seed, humanLevel, botLevel) {
  reseed(20261120 + seed);
  const s = createGame(P(['A']), { seed, botLevel });
  const lv = { p1: humanLevel, bot1: botLevel, bot2: botLevel, bot3: botLevel, bot4: botLevel };
  let guard = 0;
  while (s.phase !== 'ended' && guard++ < 3000) {
    const act = actors(s);
    if (!act.length) return { s, illegal: 1 };
    const pid = act[0];
    const a = botAction(s, pid, lv[pid]);
    if (!a) return { s, illegal: 1 };
    const r = applyAction(s, pid, a);
    if (!r.ok) return { s, illegal: 1 };
  }
  return { s, illegal: 0, ended: s.phase === 'ended' };
}
/* ---- chơi đơn: người chơi "giỏi" (heuristic Khó) đấu máy Dễ vs máy Khó ----
   (Trong chơi đơn thật, độ khó là độ khó của MÁY — người chơi là người
   thật; sim chỉ mô phỏng 1 người chơi giỏi bằng heuristic Khó.) */
let soloVsEasy = 0, soloVsHard = 0;
for (let i = 0; i < 30; i++) {
  /* CÙNG seed cho cả 2 độ khó của máy — chỉ khác cách máy hành động */
  if (playSoloSim(300 + i, 'hard', 'easy').s.winner === 'resistance') soloVsEasy++;
  if (playSoloSim(300 + i, 'hard', 'hard').s.winner === 'resistance') soloVsHard++;
}
console.log(`  chơi đơn 30 ván mỗi loại, cùng seed (người chơi giỏi): thắng máy Dễ ${soloVsEasy}/30, thắng máy Khó ${soloVsHard}/30`);
t('chơi đơn: thắng máy Dễ nhiều hơn thắng máy Khó', soloVsEasy > soloVsHard, `Dễ ${soloVsEasy} > Khó ${soloVsHard}`);
t('chơi đơn: thắng máy Dễ ít nhất 25%', soloVsEasy >= 8, `${soloVsEasy}/30`);
t('chơi đơn: thắng máy Khó không phải 0 ván (không phải không thể thắng)', soloVsHard >= 1, `${soloVsHard}/30`);

console.log(`\nSIM: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
