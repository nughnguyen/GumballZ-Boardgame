// Mô phỏng Wavelength: bot Khó thắng bot Dễ, điểm trung bình của bot
// Khó cao hơn bot Dễ, 0 kẹt, 0 phạm luật, mọi ván đều kết thúc.
import { createGame, applyAction, actors, bandOf } from '../js/engine.js';
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

/* 1 bước mô phỏng: người hành động được chọn ngẫu nhiên trong số người
   tới lượt — giống ngoài đời (ai bấm trước thì đặt trước). */
function step(s, lv) {
  const act = actors(s);
  if (!act.length) return { stuck: true };
  const pid = act[Math.floor(Math.random() * act.length)];
  const a = botAction(s, pid, lv[pid]);
  if (!a) return { stuck: true };
  const r = applyAction(s, pid, a);
  if (!r.ok) return { illegal: true, reason: r.reason };
  return { ok: true, action: a, pid };
}

function playGame(seed, names, levels, tally) {
  reseed(20261120 + seed);
  const s = createGame(P(names), { seed });
  const lv = {};
  names.forEach((_, i) => { lv['p' + (i + 1)] = levels[i]; });
  let guard = 0, illegal = 0, stuck = 0;
  while (s.phase !== 'ended' && guard++ < 2000) {
    const r = step(s, lv);
    if (r.stuck) { stuck++; break; }
    if (r.illegal) { illegal++; break; }
    /* điểm của mốc vừa đặt: so vị trí đặt với đích của lượt đó
       (lượt chưa lật bài nên s.current.target vẫn là đích đó) */
    if (tally && r.action && r.action.type === 'place' && s.current && !s.current.revealed) {
      const band = bandOf(r.action.pos, s.current.target);
      tally[lv[r.pid]].total++;
      tally[lv[r.pid]].pts += band;
      if (band === 4) tally[lv[r.pid]].four++;
    }
  }
  return { s, illegal, stuck, ended: s.phase === 'ended' };
}

/* ---- Khó thắng Dễ: 2 người (đổi ghế), 10 ván ---- */
let hardWins2p = 0, games2p = 0, stuck2 = 0, illegal2 = 0;
let hardPts2p = 0, easyPts2p = 0;
for (let i = 0; i < 10; i++) {
  const hardFirst = i % 2 === 0;
  const levels = hardFirst ? ['hard', 'easy'] : ['easy', 'hard'];
  const { s, illegal, stuck, ended } = playGame(11 + i, ['A', 'B'], levels);
  games2p++;
  stuck2 += stuck; illegal2 += illegal;
  if (!ended) { console.log(`  (ván 2 người #${i + 1} không kết thúc)`); continue; }
  const hardPid = hardFirst ? 'p1' : 'p2';
  const easyPid = hardFirst ? 'p2' : 'p1';
  if (s.winner === hardPid) hardWins2p++;
  hardPts2p += s.final.summary[hardPid].points;
  easyPts2p += s.final.summary[easyPid].points;
  console.log(`  ván 2 người #${i + 1} (${hardFirst ? 'Khó p1' : 'Khó p2'}): thắng ${s.winner || 'hòa'} — điểm p1=${s.final.summary.p1.points} p2=${s.final.summary.p2.points}`);
}
t('2 người: Khó thắng Dễ ≥ 6/10 ván', hardWins2p >= 6, `Khó thắng ${hardWins2p}/${games2p}`);
t('2 người: điểm TB/ván của Khó cao hơn Dễ', hardPts2p > easyPts2p, `Khó ${hardPts2p} > Dễ ${easyPts2p} (tổng 10 ván)`);
t('2 người: 0 kẹt, 0 phạm luật', stuck2 === 0 && illegal2 === 0);

/* ---- Khó thắng Dễ: 4 người (1 Khó + 3 Dễ), 10 ván ---- */
let hardWins4p = 0, games4p = 0, stuck4 = 0, illegal4 = 0;
for (let i = 0; i < 10; i++) {
  const { s, illegal, stuck, ended } = playGame(21 + i, ['A', 'B', 'C', 'D'], ['hard', 'easy', 'easy', 'easy']);
  games4p++;
  stuck4 += stuck; illegal4 += illegal;
  if (!ended) { console.log(`  (ván 4 người #${i + 1} không kết thúc)`); continue; }
  if (s.winner === 'p1') hardWins4p++;
  console.log(`  ván 4 người #${i + 1}: thắng ${s.winner || 'hòa'} — điểm p1(Khó)=${s.final.summary.p1.points} p2=${s.final.summary.p2.points} p3=${s.final.summary.p3.points} p4=${s.final.summary.p4.points}`);
}
t('4 người: Khó thắng Dễ ≥ 6/10 ván', hardWins4p >= 6, `Khó thắng ${hardWins4p}/${games4p}`);
t('4 người: 0 kẹt, 0 phạm luật', stuck4 === 0 && illegal4 === 0);

/* ---- điểm trung bình / mốc của bot trong 60 ván ---- */
const tally = { easy: { total: 0, pts: 0, four: 0 }, hard: { total: 0, pts: 0, four: 0 } };
let stuck60 = 0, illegal60 = 0, ended60 = 0;
for (let i = 0; i < 60; i++) {
  const hardFirst = i % 2 === 0;
  const levels = hardFirst ? ['hard', 'easy'] : ['easy', 'hard'];
  const { illegal, stuck, ended } = playGame(100 + i, ['A', 'B'], levels, tally);
  stuck60 += stuck; illegal60 += illegal;
  if (ended) ended60++;
}
const hardAvg = tally.hard.total ? tally.hard.pts / tally.hard.total : 0;
const easyAvg = tally.easy.total ? tally.easy.pts / tally.easy.total : 0;
const hardFour = tally.hard.total ? tally.hard.four / tally.hard.total : 0;
const easyFour = tally.easy.total ? tally.easy.four / tally.easy.total : 0;
console.log(`  điểm TB/mốc: Khó ${hardAvg.toFixed(2)} (4đ: ${(hardFour * 100).toFixed(1)}%), Dễ ${easyAvg.toFixed(2)} (4đ: ${(easyFour * 100).toFixed(1)}%) — ${tally.hard.total + tally.easy.total} mốc`);
t('60 ván: mọi ván đều kết thúc', ended60 === 60, `${ended60}/60`);
t('60 ván: 0 kẹt, 0 phạm luật', stuck60 === 0 && illegal60 === 0);
t('bot Khó đạt TB ≥ 2.0 điểm/mốc', hardAvg >= 2.0, hardAvg.toFixed(2) + ' điểm/mốc');
t('bot Dễ đạt TB 1.0–2.0 điểm/mốc', easyAvg >= 1.0 && easyAvg <= 2.0, easyAvg.toFixed(2) + ' điểm/mốc');
t('bot Khó đạt 4 điểm nhiều hơn bot Dễ', hardFour > easyFour, `Khó ${(hardFour * 100).toFixed(1)}% > Dễ ${(easyFour * 100).toFixed(1)}%`);

/* ---- chơi đơn mô phỏng: bot Hard thắng nhiều hơn bot Dễ ---- */
function playSoloSim(seed, level) {
  reseed(20261120 + seed);
  const s = createGame(P(['A']), { seed });
  let guard = 0;
  while (s.phase !== 'ended' && guard++ < 100) {
    if (s.stage === 'guess') {
      const set = s.soloSet;
      const hit = Math.random() < (level === 'hard' ? 0.65 : 0.35);
      const pos = hit
        ? Math.max(0, Math.min(100, set.target + Math.floor(Math.random() * 11) - 5))
        : Math.max(0, Math.min(100, set.target + (Math.random() < 0.5 ? -1 : 1) * (25 + Math.floor(Math.random() * 21))));
      let r = applyAction(s, 'p1', { type: 'place', pos });
      if (!r.ok) return { s, illegal: 1 };
      r = applyAction(s, 'p1', { type: 'lock' });
      if (!r.ok) return { s, illegal: 1 };
    } else if (s.stage === 'reveal') {
      const r = applyAction(s, 'p1', { type: 'next' });
      if (!r.ok) return { s, illegal: 1 };
    } else return { s, illegal: 1 };
  }
  return { s, illegal: 0, ended: s.phase === 'ended' };
}
let soloHardWins = 0, soloEasyWins = 0, soloHardPts = 0, soloEasyPts = 0;
for (let i = 0; i < 20; i++) {
  const h = playSoloSim(300 + i, 'hard');
  const e = playSoloSim(400 + i, 'easy');
  if (h.s.winner === 'p1') soloHardWins++;
  if (e.s.winner === 'p1') soloEasyWins++;
  soloHardPts += h.s.final.summary.p1.points;
  soloEasyPts += e.s.final.summary.p1.points;
}
console.log(`  chơi đơn 20 ván mỗi loại: Khó thắng ${soloHardWins}/20 (TB ${(soloHardPts / 20).toFixed(1)}đ), Dễ thắng ${soloEasyWins}/20 (TB ${(soloEasyPts / 20).toFixed(1)}đ)`);
t('chơi đơn: bot Khó thắng nhiều hơn bot Dễ', soloHardWins > soloEasyWins, `Khó ${soloHardWins} > Dễ ${soloEasyWins}`);
t('chơi đơn: điểm TB của Khó cao hơn Dễ', soloHardPts > soloEasyPts, `Khó ${(soloHardPts / 20).toFixed(1)} > Dễ ${(soloEasyPts / 20).toFixed(1)}`);

console.log(`\nSIM: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
