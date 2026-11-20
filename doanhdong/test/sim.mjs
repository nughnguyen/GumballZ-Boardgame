// Mô phỏng Đoán Hành Động: bot Khó thắng bot Dễ, tỉ lệ đoán đúng của
// bot nằm trong khoảng thiết kế, 0 kẹt, 0 phạm luật, mọi ván đều kết thúc.
import { createGame, applyAction, actors, normalizeGuess } from '../js/engine.js';
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

/* 1 bước mô phỏng: ưu tiên người đoán chưa đoán (để từ không bị timeout
   sớm vì diễn viên được chọn ngẫu nhiên trước); khi không còn lượt
   đoán nào chờ chấm thì hết giờ. Người hành động được chọn ngẫu nhiên
   trong số người tới lượt — giống ngoài đời (ai gõ trước thì đoán trước). */
function step(s, lv) {
  const act = actors(s);
  if (!act.length) return { stuck: true };
  const guessers = s.stage === 'guess' && !s.solo && s.current
    ? act.filter(pid => s.current.actor !== pid)
    : [];
  const pool = guessers.length ? guessers : act;
  const pid = pool[Math.floor(Math.random() * pool.length)];
  let a = botAction(s, pid, lv[pid]);
  if (!a) {
    if (s.stage === 'guess') a = { type: 'timeout' };
    else return { stuck: true };
  }
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
    /* tỉ lệ đoán đúng của bot: so lượt đoán vừa áp với từ đang diễn
       (lượt đoán không kết thúc từ nên s.current.word vẫn là từ đó) */
    if (tally && r.action && r.action.type === 'guess' && s.current && !s.current.revealed) {
      const hit = normalizeGuess(r.action.text) === normalizeGuess(s.current.word);
      tally[lv[r.pid]].total++;
      if (hit) tally[lv[r.pid]].correct++;
    }
  }
  return { s, illegal, stuck, ended: s.phase === 'ended' };
}

/* ---- Khó thắng Dễ: 2 người (đổi ghế) ---- */
let hardWins2p = 0, games2p = 0, stuck2 = 0, illegal2 = 0;
for (let i = 0; i < 6; i++) {
  const hardFirst = i < 3;
  const names = ['A', 'B'];
  const levels = hardFirst ? ['hard', 'easy'] : ['easy', 'hard'];
  const { s, illegal, stuck, ended } = playGame(11 + i, names, levels);
  games2p++;
  stuck2 += stuck; illegal2 += illegal;
  if (!ended) { console.log(`  (ván 2 người #${i + 1} không kết thúc)`); continue; }
  const hardPid = hardFirst ? 'p1' : 'p2';
  if (s.winner === hardPid) hardWins2p++;
  console.log(`  ván 2 người #${i + 1} (${hardFirst ? 'Khó p1' : 'Khó p2'}): thắng ${s.winner || 'hòa'} — điểm p1=${s.final.summary.p1.points} p2=${s.final.summary.p2.points}`);
}
t('2 người: Khó thắng Dễ ≥ 4/6 ván', hardWins2p >= 4, `Khó thắng ${hardWins2p}/${games2p}`);
t('2 người: 0 kẹt, 0 phạm luật', stuck2 === 0 && illegal2 === 0);

/* ---- Khó thắng Dễ: 4 người (1 Khó + 3 Dễ) ---- */
let hardWins4p = 0, games4p = 0, stuck4 = 0, illegal4 = 0;
for (let i = 0; i < 6; i++) {
  const { s, illegal, stuck, ended } = playGame(21 + i, ['A', 'B', 'C', 'D'], ['hard', 'easy', 'easy', 'easy']);
  games4p++;
  stuck4 += stuck; illegal4 += illegal;
  if (!ended) { console.log(`  (ván 4 người #${i + 1} không kết thúc)`); continue; }
  if (s.winner === 'p1') hardWins4p++;
  console.log(`  ván 4 người #${i + 1}: thắng ${s.winner || 'hòa'} — điểm p1(Khó)=${s.final.summary.p1.points} p2=${s.final.summary.p2.points} p3=${s.final.summary.p3.points} p4=${s.final.summary.p4.points}`);
}
t('4 người: Khó thắng Dễ ≥ 4/6 ván', hardWins4p >= 4, `Khó thắng ${hardWins4p}/${games4p}`);
t('4 người: 0 kẹt, 0 phạm luật', stuck4 === 0 && illegal4 === 0);

/* ---- tỉ lệ đoán đúng của bot trong 60 ván ---- */
const tally = { easy: { total: 0, correct: 0 }, hard: { total: 0, correct: 0 } };
let stuck60 = 0, illegal60 = 0, ended60 = 0;
for (let i = 0; i < 60; i++) {
  const hardFirst = i % 2 === 0;
  const levels = hardFirst ? ['hard', 'easy'] : ['easy', 'hard'];
  const { illegal, stuck, ended } = playGame(100 + i, ['A', 'B'], levels, tally);
  stuck60 += stuck; illegal60 += illegal;
  if (ended) ended60++;
}
const hardRate = tally.hard.total ? tally.hard.correct / tally.hard.total : 0;
const easyRate = tally.easy.total ? tally.easy.correct / tally.easy.total : 0;
console.log(`  tỉ lệ đoán đúng: Khó ${tally.hard.correct}/${tally.hard.total} = ${(hardRate * 100).toFixed(1)}%, Dễ ${tally.easy.correct}/${tally.easy.total} = ${(easyRate * 100).toFixed(1)}%`);
t('60 ván: mọi ván đều kết thúc', ended60 === 60, `${ended60}/60`);
t('60 ván: 0 kẹt, 0 phạm luật', stuck60 === 0 && illegal60 === 0);
t('bot Khó đoán đúng trong khoảng 55–75%', hardRate >= 0.55 && hardRate <= 0.75, (hardRate * 100).toFixed(1) + '%');
t('bot Dễ đoán đúng trong khoảng 25–45%', easyRate >= 0.25 && easyRate <= 0.45, (easyRate * 100).toFixed(1) + '%');

/* ---- chơi đơn mô phỏng: bot Hard thắng nhiều hơn bot Dễ ---- */
function playSoloSim(seed, level) {
  reseed(20261120 + seed);
  const s = createGame(P(['A']), { seed });
  let guard = 0;
  while (s.phase !== 'ended' && guard++ < 100) {
    if (s.stage === 'guess') {
      const set = s.soloSet;
      const hit = Math.random() < (level === 'hard' ? 0.65 : 0.35);
      const idx = hit ? set.correctIdx : (set.correctIdx + 1 + Math.floor(Math.random() * 3)) % 4;
      const r = applyAction(s, 'p1', { type: 'guess', idx });
      if (!r.ok) return { s, illegal: 1 };
    } else if (s.stage === 'reveal') {
      const r = applyAction(s, 'p1', { type: 'next' });
      if (!r.ok) return { s, illegal: 1 };
    } else return { s, illegal: 1 };
  }
  return { s, illegal: 0, ended: s.phase === 'ended' };
}
let soloHardWins = 0, soloEasyWins = 0;
for (let i = 0; i < 20; i++) {
  if (playSoloSim(300 + i, 'hard').s.winner === 'p1') soloHardWins++;
  if (playSoloSim(400 + i, 'easy').s.winner === 'p1') soloEasyWins++;
}
console.log(`  chơi đơn 20 ván mỗi loại: Khó thắng ${soloHardWins}/20, Dễ thắng ${soloEasyWins}/20`);
t('chơi đơn: bot Khó thắng nhiều hơn bot Dễ', soloHardWins > soloEasyWins, `Khó ${soloHardWins} > Dễ ${soloEasyWins}`);

console.log(`\nSIM: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
