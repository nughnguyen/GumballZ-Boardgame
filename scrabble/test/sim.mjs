// Mô phỏng Scrabble: bot đấu bot nhiều ván — 0 ván kẹt, 0 nước sai luật,
// ván nào cũng kết thúc trong giới hạn lượt; ghi tỉ lệ thắng + điểm TB.
import { createGame, applyAction, actors, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để bot cho kết quả ổn định — seed: 20261120 */
const _rng = mulberry32(20261120);
Math.random = () => _rng();

let pass = 0, fail = 0;
const t = (n, c, extra = '') => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n, extra); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));

function playMatch(seed, levels) {
  const names = ['A', 'B', 'C', 'D'].slice(0, levels.length);
  const s = createGame(P(names), { seed });
  let guard = 0, illegal = 0, maxTurnsPerPlayer = 0;
  while (s.phase === 'playing' && guard++ < 800) {
    const pid = actors(s)[0];
    if (!pid) break;
    const idx = s.players.findIndex(p => p.id === pid);
    const act = botAction(s, pid, levels[idx]);
    if (!act) { illegal++; break; }
    const r = applyAction(s, pid, act);
    if (!r.ok) { illegal++; console.log('  (nước bot bị từ chối:', JSON.stringify(act), r.reason, 'seed', seed, ')'); break; }
    maxTurnsPerPlayer = Math.max(...s.players.map(p => p.turns));
  }
  return {
    s, illegal,
    finished: s.phase === 'ended',
    winner: s.winner,
    scores: s.final ? s.final.scores.map(x => x.score) : [],
    turns: guard,
    maxTurnsPerPlayer,
    endCause: s.endCause,
  };
}

function runBatch(label, levels, seeds) {
  let wins = 0, finished = 0, illegal = 0, totalScore = 0, totalTurns = 0, maxTurns = 0;
  const causes = {};
  for (const seed of seeds) {
    const m = playMatch(seed, levels);
    if (m.finished) finished++;
    if (m.winner === 'p1') wins++;
    illegal += m.illegal;
    totalTurns += m.turns;
    maxTurns = Math.max(maxTurns, m.maxTurnsPerPlayer);
    if (m.scores.length) totalScore += m.scores[0];
    causes[m.endCause || 'chưa xong'] = (causes[m.endCause || 'chưa xong'] || 0) + 1;
  }
  const n = seeds.length;
  console.log(`  ${label}: p1 thắng ${wins}/${n}, xong ${finished}/${n}, 0 sai luật: ${illegal === 0}, `
    + `điểm TB người thắng ${finished ? (totalScore / finished).toFixed(1) : '–'}, lượt TB ${finished ? (totalTurns / finished).toFixed(1) : '–'}, `
    + `nhiều lượt nhất/người ${maxTurns}, kết thúc: ${JSON.stringify(causes)}`);
  return { wins, finished, illegal, maxTurns, n };
}

/* ---------- 1. 2 người: Khó vs Dễ ---------- */
const b1 = runBatch('2 người Khó vs Dễ', ['hard', 'easy'], [101, 102, 103, 104, 105, 106]);
t('2 người Khó vs Dễ: mọi ván đều kết thúc', b1.finished === b1.n);
t('2 người Khó vs Dễ: 0 nước sai luật', b1.illegal === 0);
t('2 người Khó vs Dễ: Khó thắng đa số', b1.wins >= 4, 'Khó thắng ' + b1.wins + '/' + b1.n);
t('2 người: không ai quá 200 lượt', b1.maxTurns < 200, 'nhiều nhất ' + b1.maxTurns + ' lượt/người');

/* ---------- 2. 4 người: 1 Khó + 3 Dễ ---------- */
const b2 = runBatch('4 người 1 Khó + 3 Dễ', ['hard', 'easy', 'easy', 'easy'], [201, 202, 203, 204]);
t('4 người: mọi ván đều kết thúc', b2.finished === b2.n);
t('4 người: 0 nước sai luật', b2.illegal === 0);
t('4 người: Khó thắng ít nhất 1 ván', b2.wins >= 1, 'Khó thắng ' + b2.wins + '/' + b2.n);
t('4 người: không ai quá 200 lượt', b2.maxTurns < 200, 'nhiều nhất ' + b2.maxTurns + ' lượt/người');

/* ---------- 3. Dễ vs Dễ ---------- */
const b3 = runBatch('2 người Dễ vs Dễ', ['easy', 'easy'], [301, 302, 303, 304]);
t('Dễ vs Dễ: mọi ván đều kết thúc', b3.finished === b3.n);
t('Dễ vs Dễ: 0 nước sai luật', b3.illegal === 0);
t('Dễ vs Dễ: cả 2 bên đều có ván thắng (không lệch hẳn 1 bên)',
  b3.wins >= 1 && b3.wins <= b3.n - 1, 'p1 thắng ' + b3.wins + '/' + b3.n);

/* ---------- 4. Khó vs Khó ---------- */
const b4 = runBatch('2 người Khó vs Khó', ['hard', 'hard'], [401, 402, 403, 404]);
t('Khó vs Khó: mọi ván đều kết thúc', b4.finished === b4.n);
t('Khó vs Khó: 0 nước sai luật', b4.illegal === 0);
t('Khó vs Khó: không ai quá 200 lượt', b4.maxTurns < 200, 'nhiều nhất ' + b4.maxTurns + ' lượt/người');

/* ---------- 5. 3 người ---------- */
const b5 = runBatch('3 người Khó + 2 Dễ', ['hard', 'easy', 'easy'], [501, 502]);
t('3 người: mọi ván đều kết thúc', b5.finished === b5.n);
t('3 người: 0 nước sai luật', b5.illegal === 0);

console.log(`\nMô phỏng Scrabble: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
