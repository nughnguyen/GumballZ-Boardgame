// 🎨 Test mô phỏng Azul — chạy: node test/sim.mjs
// Seed Math.random để mọi assert thống kê đều ổn định giữa các lần chạy.
// Bot Dễ = 70% bừa / 30% tốt; bot Khó = luôn chọn nước tốt nhất theo view.
import { createGame, applyAction, actors, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* seed RNG toàn cục (bot dùng Math.random cho nước bừa + jitter) */
Math.random = mulberry32(20261120);

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; }
  else { fail++; console.log(`FAIL: ${name} ${extra}`); }
}

function playMatch(names, levels, seed) {
  const s = createGame(names, { seed });
  let guard = 0;
  let illegal = 0;
  while (s.phase !== 'ended' && guard++ < 5000) {
    const pid = actors(s)[0];
    if (!pid) return { s, ok: false, reason: 'no-actor', guard, illegal };
    const idx = s.players.findIndex(p => p.id === pid);
    const act = botAction(s, pid, levels[idx]);
    if (!act) return { s, ok: false, reason: 'no-action', guard, illegal };
    const r = applyAction(s, pid, act);
    if (!r.ok) { illegal++; return { s, ok: false, reason: 'illegal:' + r.reason, guard, illegal }; }
  }
  return { s, ok: s.phase === 'ended', reason: s.phase, guard, illegal };
}

/* ---------- 1. Máy Khó thắng máy Dễ rõ ràng (2 người, 100 ván) ---------- */
{
  let hardWins = 0, draws = 0, hardScore = 0, easyScore = 0, maxGuard = 0;
  for (let i = 0; i < 100; i++) {
    const m = playMatch(['Khó', 'Dễ'], ['hard', 'easy'], 1000 + i);
    if (!m.ok) { console.log('FAIL match', i, m.reason, 'guard', m.guard); break; }
    maxGuard = Math.max(maxGuard, m.guard);
    if (m.s.winner === m.s.players[0].id) hardWins++;
    hardScore += m.s.players[0].score;
    easyScore += m.s.players[1].score;
  }
  check('sim 2p: 100 ván đều kết thúc', maxGuard < 5000 && maxGuard > 0, `maxGuard=${maxGuard}`);
  check('sim 2p: Khó thắng >= 60/100 ván trước Dễ', hardWins >= 60, `Khó thắng ${hardWins}/100`);
  check('sim 2p: điểm trung bình Khó > Dễ rõ rệt (+4 trở lên)', (hardScore - easyScore) / 100 >= 4, `Khó ${hardScore / 100} vs Dễ ${easyScore / 100}`);
  console.log(`  2p Hard vs Easy: Khó thắng ${hardWins}/100, điểm TB ${hardScore / 100} vs ${easyScore / 100}, dài nhất ${maxGuard} lượt`);
}

/* ---------- 2. Máy Khó thắng rõ ở bàn 4 người (1 Khó + 3 Dễ, 50 ván) ---------- */
{
  let hardWins = 0, hardScore = 0, easyScore = 0;
  for (let i = 0; i < 50; i++) {
    const m = playMatch(['Khó', 'Dễ', 'Dễ', 'Dễ'], ['hard', 'easy', 'easy', 'easy'], 2000 + i);
    if (!m.ok) { console.log('FAIL match 4p', i, m.reason); break; }
    if (m.s.winner === m.s.players[0].id) hardWins++;
    hardScore += m.s.players[0].score;
    easyScore += (m.s.players[1].score + m.s.players[2].score + m.s.players[3].score) / 3;
  }
  check('sim 4p: Khó thắng >= 17/50 ván (tỷ lệ công bằng 12.5/50)', hardWins >= 17, `Khó thắng ${hardWins}/50`);
  check('sim 4p: điểm trung bình Khó > Dễ', hardScore / 50 > easyScore / 50, `Khó ${hardScore / 50} vs Dễ ${easyScore / 50}`);
  console.log(`  4p Hard vs 3 Easy: Khó thắng ${hardWins}/50, điểm TB ${hardScore / 50} vs ${easyScore / 50}`);
}

/* ---------- 3. Mọi ván đều kết thúc, 0 kẹt (3 người + 2 người toàn Dễ) ---------- */
{
  let stuck = 0, illegal = 0, longest = 0;
  for (let i = 0; i < 20; i++) {
    const m = playMatch(['A', 'B', 'C'], ['easy', 'easy', 'easy'], 3000 + i);
    if (!m.ok) { stuck++; console.log('FAIL 3p', i, m.reason); }
    illegal += m.illegal; longest = Math.max(longest, m.guard);
  }
  for (let i = 0; i < 20; i++) {
    const m = playMatch(['A', 'B'], ['easy', 'easy'], 4000 + i);
    if (!m.ok) { stuck++; console.log('FAIL 2p', i, m.reason); }
    illegal += m.illegal; longest = Math.max(longest, m.guard);
  }
  check('sim finish: 40 ván toàn Dễ đều kết thúc, 0 kẹt', stuck === 0, `stuck=${stuck}`);
  check('sim finish: bot không bao giờ trả nước bị engine từ chối', illegal === 0, `illegal=${illegal}`);
  console.log(`  40 ván toàn Dễ: dài nhất ${longest} lượt, 0 kẹt, 0 nước sai`);
}

/* ---------- 4. Máy Khó không bao giờ trả nước sai (20 ván 4 người hỗn hợp) ---------- */
{
  let illegal = 0, finished = 0;
  for (let i = 0; i < 20; i++) {
    const m = playMatch(['A', 'B', 'C', 'D'], ['hard', 'hard', 'easy', 'easy'], 5000 + i);
    if (m.ok) finished++;
    illegal += m.illegal;
  }
  check('sim hard: 20 ván hỗn hợp đều kết thúc', finished === 20, `finished=${finished}`);
  check('sim hard: 0 nước bị từ chối', illegal === 0, `illegal=${illegal}`);
}

/* ---------- 5. Điểm cuối ván hợp lý (không âm, có người thắng) ---------- */
{
  const m = playMatch(['A', 'B'], ['hard', 'easy'], 9999);
  check('sim score: ván mẫu kết thúc có người thắng', m.ok && !!m.s.winner);
  check('sim score: mọi điểm >= 0', m.s.players.every(p => p.score >= 0));
  check('sim score: người thắng có điểm cao nhất', m.s.players.every(p => p.id === m.s.winner || p.score <= m.s.players.find(x => x.id === m.s.winner).score));
  check('sim score: final.summary + final.walls đầy đủ', !!m.s.final && !!m.s.final.summary && !!m.s.final.walls
    && m.s.players.every(p => m.s.final.summary[p.id] && m.s.final.walls[p.id]));
  console.log(`  ván mẫu: ${m.s.players.map(p => p.name + ' ' + p.score).join(' vs ')}, ${m.guard} lượt`);
}

console.log(`\nMô phỏng Azul: ${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
