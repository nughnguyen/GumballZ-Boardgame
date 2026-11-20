// 🔴 Test mô phỏng Cờ Nhảy — chạy: node test/sim.mjs
// Seed Math.random để mọi assert thống kê đều ổn định giữa các lần chạy.
// Bot Dễ = 70% bừa / 30% tốt; bot Khó = luôn chọn nước tốt nhất theo view
// (giảm tổng bình phương khoảng cách tới đỉnh đích + thưởng chuỗi nhảy).
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
  let hardWins = 0, maxGuard = 0, hardTurns = 0;
  for (let i = 0; i < 100; i++) {
    const m = playMatch(['Khó', 'Dễ'], ['hard', 'easy'], 1000 + i);
    if (!m.ok) { console.log('FAIL match', i, m.reason, 'guard', m.guard); break; }
    maxGuard = Math.max(maxGuard, m.guard);
    if (m.s.winner === m.s.players[0].id) hardWins++;
    hardTurns += m.s.players[0].turns;
  }
  check('sim 2p: 100 ván đều kết thúc', maxGuard < 5000 && maxGuard > 0, `maxGuard=${maxGuard}`);
  check('sim 2p: Khó thắng >= 60/100 ván trước Dễ', hardWins >= 60, `Khó thắng ${hardWins}/100`);
  console.log(`  2p Hard vs Easy: Khó thắng ${hardWins}/100, dài nhất ${maxGuard} lượt, Khó đi TB ${Math.round(hardTurns / 100)} lượt/ván`);
}

/* ---------- 2. Máy Khó thắng rõ ở bàn 3 người (1 Khó + 2 Dễ, 50 ván) ---------- */
{
  let hardWins = 0;
  for (let i = 0; i < 50; i++) {
    const m = playMatch(['Khó', 'Dễ', 'Dễ'], ['hard', 'easy', 'easy'], 2000 + i);
    if (!m.ok) { console.log('FAIL match 3p', i, m.reason); break; }
    if (m.s.winner === m.s.players[0].id) hardWins++;
  }
  check('sim 3p: Khó thắng >= 17/50 ván (tỷ lệ công bằng ~17/50)', hardWins >= 17, `Khó thắng ${hardWins}/50`);
  console.log(`  3p Hard vs 2 Easy: Khó thắng ${hardWins}/50`);
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

/* ---------- 4. Máy Khó không bao giờ trả nước sai (20 ván 6 người hỗn hợp) ---------- */
{
  let illegal = 0, finished = 0, longest = 0;
  for (let i = 0; i < 20; i++) {
    const m = playMatch(['A', 'B', 'C', 'D', 'E', 'F'], ['hard', 'hard', 'easy', 'easy', 'easy', 'easy'], 5000 + i);
    if (m.ok) finished++;
    illegal += m.illegal; longest = Math.max(longest, m.guard);
  }
  check('sim hard: 20 ván 6 người hỗn hợp đều kết thúc', finished === 20, `finished=${finished}`);
  check('sim hard: 0 nước bị từ chối', illegal === 0, `illegal=${illegal}`);
  console.log(`  20 ván 6 người: dài nhất ${longest} lượt, 0 nước sai`);
}

/* ---------- 5. Điểm cuối ván hợp lý (người thắng đủ 10 bi vào đích) ---------- */
{
  const m = playMatch(['A', 'B'], ['hard', 'easy'], 9999);
  check('sim score: ván mẫu kết thúc có người thắng', m.ok && !!m.s.winner);
  check('sim score: người thắng có đủ 10 bi vào đích', m.s.players.find(x => x.id === m.s.winner).score === 10);
  check('sim score: mọi điểm trong khoảng 0–10', m.s.players.every(p => p.score >= 0 && p.score <= 10));
  check('sim score: final.summary có đủ inHome/progress/jumpChainMax/turns', !!m.s.final && !!m.s.final.summary
    && m.s.players.every(p => {
      const st = m.s.final.summary[p.id];
      return st && typeof st.inHome === 'number' && typeof st.progress === 'number'
        && typeof st.jumpChainMax === 'number' && typeof st.turns === 'number';
    }));
  check('sim score: mỗi người vẫn đủ 10 bi cuối ván', m.s.players.every(p => p.marbles.length === 10));
  check('sim score: không có 2 bi cùng 1 lỗ cuối ván', (() => {
    const all = m.s.players.flatMap(p => p.marbles);
    return new Set(all).size === all.length;
  })());
  console.log(`  ván mẫu: ${m.s.players.map(p => p.name + ' ' + p.score + '/10').join(' vs ')}, ${m.guard} lượt, chuỗi nhảy dài nhất ${Math.max(...m.s.players.map(p => p.jumpChainMax))}`);
}

console.log(`\nMô phỏng Cờ Nhảy: ${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
