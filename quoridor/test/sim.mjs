// Mô phỏng Quoridor: bot đấu bot nhiều ván, kiểm 0 ván kẹt, 0 nước sai
// luật, ghi tỉ lệ thắng + số lượt trung bình/dài nhất.
import { createGame, applyAction, actors } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để bot cho kết quả ổn định — seed: 20261120 */
let _s = 20261120;
Math.random = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));

function playMatch(n, levels, seed) {
  const names = ['A', 'B', 'C', 'D'].slice(0, n);
  const s = createGame(P(names), { seed });
  let guard = 0, illegal = 0, stuck = 0;
  while (s.phase === 'playing' && guard++ < 1500) {
    const pid = actors(s)[0];
    if (!pid) { stuck++; break; }
    const idx = s.players.findIndex(p => p.id === pid);
    const act = botAction(s, pid, levels[idx]);
    if (!act) { stuck++; break; }
    const r = applyAction(s, pid, act);
    if (!r.ok) { illegal++; break; }
  }
  if (s.phase !== 'ended') stuck++;
  /* turns = tổng số nước đi đã đánh (mỗi lượt của 1 người = 1 nước).
     Lưu ý: s.round chỉ đếm vòng (1 vòng = mỗi người đi 1 lần) nên
     không dùng làm số lượt ở đây. */
  return { winner: s.winner, turns: guard, illegal, stuck };
}

function run(label, n, levels, count, seedBase) {
  let hardW = 0, easyW = 0, stuck = 0, illegal = 0, unfinished = 0;
  const winsByPid = { p1: 0, p2: 0, p3: 0, p4: 0 };
  let total = 0, longest = 0;
  for (let i = 0; i < count; i++) {
    const r = playMatch(n, levels, seedBase + i);
    if (r.illegal) illegal++;
    if (r.stuck) stuck++;
    if (!r.winner) unfinished++;
    if (r.winner) {
      winsByPid[r.winner]++;
      const idx = r.winner === 'p1' ? 0 : r.winner === 'p2' ? 1 : r.winner === 'p3' ? 2 : 3;
      if (levels[idx] === 'hard') hardW++; else if (levels[idx] === 'easy') easyW++;
    }
    total += r.turns; longest = Math.max(longest, r.turns);
  }
  const games = count - unfinished;
  console.log(`  ${label}: ${count} ván — Khó thắng ${hardW}, Dễ thắng ${easyW} | lượt TB ${(total / count).toFixed(1)}, dài nhất ${longest} | kẹt ${stuck}, sai luật ${illegal}, chưa xong ${unfinished}`);
  return { hardW, easyW, stuck, illegal, unfinished, games, winsByPid };
}

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };

const t0 = Date.now();
const r1 = run('Khó vs Dễ (2 người)', 2, ['hard', 'easy'], 100, 1000);
const r2 = run('Dễ vs Dễ (2 người)', 2, ['easy', 'easy'], 50, 2000);
const r3 = run('Khó vs Khó (2 người)', 2, ['hard', 'hard'], 20, 3000);
const r4 = run('1 Khó + 3 Dễ (4 người)', 4, ['hard', 'easy', 'easy', 'easy'], 50, 4000);
const r5 = run('Khó vs Dễ vs Khó (3 người)', 3, ['hard', 'easy', 'hard'], 20, 5000);
console.log(`  (mô phỏng xong trong ${((Date.now() - t0) / 1000).toFixed(1)}s)`);

const all = [r1, r2, r3, r4, r5];
t('0 ván kẹt trong tất cả mô phỏng', all.every(r => r.stuck === 0));
t('0 nước sai luật trong tất cả mô phỏng', all.every(r => r.illegal === 0));
t('mọi ván đều kết thúc (có người thắng)', all.every(r => r.unfinished === 0));
t('Khó thắng nhiều hơn Dễ ở 2 người (100 ván)', r1.hardW > r1.easyW);
t('Khó thắng nhiều hơn Dễ ở 4 người (50 ván)', r4.hardW > r4.easyW / 3);
t('Dễ vs Dễ: cả 2 bên đều có ván thắng', r2.winsByPid.p1 > 0 && r2.winsByPid.p2 > 0);
/* Khó vs Khó: 2 bot tham lam giống hệt nhau nên ván nào cũng là cuộc đua
   đối xứng — người đi sau (p2) luôn thắng nhờ cú nhảy qua người đi trước
   ở giữa bàn (nhảy = 1 nước đi 2 ô). Đây là đặc tính của bot tham lam,
   không phải lỗi luật: người chơi thật đặt tường/lệch hướng sẽ phá vỡ
   thế đối xứng này. */
t('Khó vs Khó: mọi ván đều kết thúc, p2 thắng hết (đua đối xứng)', r3.games === 20 && r3.winsByPid.p2 === 20);

console.log(`\nMô phỏng Quoridor: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
