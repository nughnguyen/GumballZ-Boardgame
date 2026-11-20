// Đồng bộ Lấy 6: 2 engine cùng seed + cùng hành động thì giống hệt
// nhau từng byte (kể cả 1 trận 10 người đầy đủ do bot đánh).
import { createGame, applyAction, viewFor, serialize, mulberry32, actors } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để bot (Dễ bừa, Khó có chọn ngẫu nhiên) cho kết
   quả ổn định — seed: 20261119 */
const _rng = mulberry32(20261119);
Math.random = () => _rng();

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));
/* gid / startedAt / endedAt khác nhau giữa 2 lần tạo ván (thời gian thực) —
   bỏ qua khi so sánh đồng bộ (giống pattern Love Letter) */
const strip = s => {
  const c = JSON.parse(JSON.stringify(s));
  delete c.gid; c.startedAt = 0; c.endedAt = 0;
  return c;
};
const same = (a, b) => JSON.stringify(strip(a)) === JSON.stringify(strip(b));

function playMatch(seed, n = 4, levels = ['hard', 'easy', 'hard', 'easy']) {
  const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].slice(0, n);
  const A = createGame(P(names), { seed });
  const B = createGame(P(names), { seed });
  let guard = 0, ok = true;
  while (A.phase === 'playing' && guard++ < 1000) {
    const pending = actors(A);
    if (!pending.length) { ok = false; break; }
    for (const pid of pending) {
      if (A.phase !== 'playing') break;
      const idx = A.players.findIndex(p => p.id === pid);
      const act = botAction(A, pid, levels[idx] || 'easy');
      if (!act) { ok = false; break; }
      const rA = applyAction(A, pid, act);
      const rB = applyAction(B, pid, act);
      if (!rA.ok || !rB.ok) { ok = false; break; }
      if (!same(A, B)) { ok = false; break; }
    }
    if (!ok) break;
  }
  return { A, B, ok, finished: A.phase === 'ended', guard };
}

/* ---------- 1. cùng seed + cùng nước đi thì state giống hệt ---------- */
{
  const { A, B, ok, finished } = playMatch(1234, 4);
  t('trận 4 người do bot đánh: 2 engine giống hệt từng byte', ok);
  t('trận 4 người kết thúc được (có người thắng)', finished && !!A.winner);
  t('2 engine có cùng người thắng', A.winner === B.winner);
  t('2 engine có cùng số đầu bò từng người',
    JSON.stringify(A.players.map(p => p.bullheads)) === JSON.stringify(B.players.map(p => p.bullheads)));
}

/* ---------- 2. nhiều seed khác nhau ---------- */
{
  let allOk = true, allDone = true;
  for (const seed of [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]) {
    const r = playMatch(seed, 4);
    if (!r.ok) allOk = false;
    if (!r.finished) allDone = false;
  }
  t('10 seed khác nhau đều đồng bộ byte', allOk);
  t('10 seed khác nhau đều kết thúc trận', allDone);
}

/* ---------- 3. 2, 3, 5 và 10 người ---------- */
{
  const r2 = playMatch(77, 2, ['hard', 'easy']);
  const r3 = playMatch(78, 3, ['easy', 'hard', 'easy']);
  const r5 = playMatch(79, 5, ['hard', 'easy', 'hard', 'easy', 'hard']);
  const r10 = playMatch(80, 10, ['hard', 'easy', 'hard', 'easy', 'hard', 'easy', 'hard', 'easy', 'hard', 'easy']);
  t('trận 2 người đồng bộ + kết thúc', r2.ok && r2.finished);
  t('trận 3 người đồng bộ + kết thúc', r3.ok && r3.finished);
  t('trận 5 người đồng bộ + kết thúc', r5.ok && r5.finished);
  t('trận 10 người đồng bộ + kết thúc', r10.ok && r10.finished);
}

/* ---------- 4. xin thua đồng bộ ---------- */
{
  const A = createGame(P(['A', 'B', 'C']), { seed: 55 });
  const B = createGame(P(['A', 'B', 'C']), { seed: 55 });
  const rA = applyAction(A, 'p2', { type: 'resign' });
  const rB = applyAction(B, 'p2', { type: 'resign' });
  t('xin thua áp 2 bên đều ok và giống hệt nhau', rA.ok && rB.ok && same(A, B));
  t('xin thua đồng bộ: cùng người thắng, lý do resign',
    A.winner === B.winner && A.endReason === 'resign' && A.phase === 'ended');
}

/* ---------- 5. viewFor đồng bộ ---------- */
{
  const A = createGame(P(['A', 'B', 'C', 'D']), { seed: 66 });
  const B = createGame(P(['A', 'B', 'C', 'D']), { seed: 66 });
  /* chơi 2 lượt rồi so view của từng người (xả hết các lần lấy dãy trong lượt) */
  const drainTakes = (X, Y) => {
    while (X.stage === 'take' && X.pendingTake) {
      const take = botAction(X, X.pendingTake.pid, 'easy');
      applyAction(X, X.pendingTake.pid, take);
      applyAction(Y, Y.pendingTake.pid, take);
    }
  };
  for (let k = 0; k < 2; k++) {
    for (const p of A.players) {
      const act = botAction(A, p.id, 'easy');
      applyAction(A, p.id, act);
      applyAction(B, p.id, act);
      drainTakes(A, B);
    }
    drainTakes(A, B);
  }
  let viewsSame = true;
  for (const p of A.players) {
    const vA = viewFor(A, p.id), vB = viewFor(B, p.id);
    delete vA.gid; delete vB.gid; vA.startedAt = vB.startedAt = 0; vA.endedAt = vB.endedAt = 0;
    if (JSON.stringify(vA) !== JSON.stringify(vB)) viewsSame = false;
  }
  t('viewFor của 4 người sau 2 lượt đều giống hệt 2 bên', viewsSame);
  t('serialize 2 bên giống hệt sau 2 lượt', serialize(A).replace(/"gid":"[^"]*"/, '') === serialize(B).replace(/"gid":"[^"]*"/, ''));
}

console.log(`\nĐồng bộ Lấy 6: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
