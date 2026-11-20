// Đồng bộ Love Letter: 2 engine cùng seed + cùng hành động thì giống hệt
// nhau từng byte (kể cả 1 vòng 4 người đầy đủ do bot đánh).
import { createGame, applyAction, viewFor, serialize, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để bot Dễ (đánh bừa) cho kết quả ổn định */
const _rng = mulberry32(20261119);
Math.random = () => _rng();

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));
/* gid / startedAt / endedAt khác nhau giữa 2 lần tạo ván (thời gian thực) —
   bỏ qua khi so sánh đồng bộ (giống pattern Mạt Chược) */
const strip = s => {
  const c = JSON.parse(JSON.stringify(s));
  delete c.gid; c.startedAt = 0; c.endedAt = 0;
  return c;
};
const same = (a, b) => JSON.stringify(strip(a)) === JSON.stringify(strip(b));

function playMatch(seed, n = 4, levels = ['hard', 'easy', 'hard', 'easy']) {
  const A = createGame(P(['A', 'B', 'C', 'D'].slice(0, n)), { seed });
  const B = createGame(P(['A', 'B', 'C', 'D'].slice(0, n)), { seed });
  let guard = 0, ok = true;
  while (A.phase === 'playing' && guard++ < 500) {
    const pid = A.turn;
    const act = botAction(A, pid, levels[A.players.findIndex(p => p.id === pid)] || 'easy');
    if (!act) { ok = false; break; }
    const rA = applyAction(A, pid, act);
    const rB = applyAction(B, pid, act);
    if (!rA.ok || !rB.ok) { ok = false; break; }
    if (!same(A, B)) { ok = false; break; }
  }
  return { A, B, ok, finished: A.phase === 'ended', guard };
}

/* ---------- 1. cùng seed + cùng nước đi thì state giống hệt ---------- */
{
  const { A, B, ok, finished } = playMatch(1234, 4);
  t('vòng 4 người do bot đánh: 2 engine giống hệt từng byte', ok);
  t('trận 4 người kết thúc được (có người thắng)', finished && !!A.winner);
  t('2 engine có cùng người thắng', A.winner === B.winner);
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

/* ---------- 3. 2 người và 3 người ---------- */
{
  const r2 = playMatch(77, 2, ['hard', 'easy']);
  const r3 = playMatch(78, 3, ['easy', 'hard', 'easy']);
  t('trận 2 người đồng bộ + kết thúc', r2.ok && r2.finished);
  t('trận 3 người đồng bộ + kết thúc', r3.ok && r3.finished);
}

/* ---------- 4. viewFor khác nhau theo người xem ---------- */
{
  const s = createGame(P(['A', 'B', 'C', 'D']), { seed: 4242 });
  const vA = viewFor(s, 'p1'), vB = viewFor(s, 'p2');
  t('mỗi người chỉ thấy tay bài của mình', vA.players[0].hand.length > 0 && vA.players[1].hand.length === 0 && vB.players[1].hand.length > 0 && vB.players[0].hand.length === 0);
  t('cả 2 view đều thấy cùng số lá trong bộ bài', vA.deckCount === vB.deckCount);
  t('cả 2 view đều thấy cùng log', JSON.stringify(vA.log) === JSON.stringify(vB.log));
}

console.log(`\nĐồng bộ Love Letter: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
