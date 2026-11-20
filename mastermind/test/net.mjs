// Đồng bộ Mastermind: 2 engine cùng seed + cùng hành động thì giống hệt
// nhau từng byte (kể cả trận do bot đánh, cả xin thua giữa ván).
import { createGame, applyAction, viewFor, serialize, mulberry32, actors } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để bot (đặt mã bừa, Dễ bừa) cho kết quả ổn
   định — seed: 20261120 */
const _rng = mulberry32(20261120);
Math.random = () => _rng();

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));
/* gid / startedAt / endedAt khác nhau giữa 2 lần tạo ván (thời gian thực) —
   bỏ qua khi so sánh đồng bộ */
const strip = s => {
  const c = JSON.parse(JSON.stringify(s));
  delete c.gid; c.startedAt = 0; c.endedAt = 0;
  return c;
};
const same = (a, b) => JSON.stringify(strip(a)) === JSON.stringify(strip(b));

function playMatch(seed, levels = ['hard', 'easy']) {
  const A = createGame(P(['A', 'B']), { seed });
  const B = createGame(P(['A', 'B']), { seed });
  let guard = 0, ok = true, turns = 0;
  while (A.phase !== 'ended' && guard++ < 100) {
    const pending = actors(A);
    if (!pending.length) { ok = false; break; }
    for (const pid of pending) {
      if (A.phase === 'ended') break;
      const idx = A.players.findIndex(p => p.id === pid);
      const act = botAction(A, pid, levels[idx] || 'easy');
      if (!act) { ok = false; console.log('  (bot không trả nước:', pid, ')'); break; }
      const rA = applyAction(A, pid, act);
      const rB = applyAction(B, pid, act);
      if (!rA.ok || !rB.ok) { ok = false; console.log('  (hành động bị từ chối:', JSON.stringify(act), rA.reason, rB.reason, ')'); break; }
      if (!same(A, B)) { ok = false; console.log('  (2 engine lệch nhau ở lượt', guard, ')'); break; }
      turns++;
    }
    if (!ok) break;
  }
  return { A, B, ok, finished: A.phase === 'ended', guard, turns };
}

/* ---------- 1. cùng seed + cùng nước đi thì state giống hệt ---------- */
{
  const { A, B, ok, finished, turns } = playMatch(1234);
  t('trận do bot đánh: 2 engine giống hệt từng byte', ok);
  t('trận kết thúc được (có người thắng hoặc hòa)', finished);
  t('2 engine có cùng người thắng + điểm cuối trận',
    A.winner === B.winner && JSON.stringify(A.final) === JSON.stringify(B.final));
  console.log(`  (trận mẫu: ${turns} lượt, thắng: ${A.winner || 'hòa'}, điểm ${A.final ? A.final.scores.map(s => s.score).join('–') : '?'})`);
}

/* ---------- 2. nhiều seed khác nhau ---------- */
{
  let allOk = true, allDone = true;
  for (const seed of [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]) {
    const { ok, finished } = playMatch(seed);
    if (!ok) { allOk = false; console.log('  (lệch ở seed', seed, ')'); }
    if (!finished) { allDone = false; console.log('  (chưa xong ở seed', seed, ')'); }
  }
  t('10 seed khác nhau: 2 engine đều giống hệt', allOk);
  t('10 seed khác nhau: mọi trận đều kết thúc', allDone);
}

/* ---------- 3. xin thua giữa ván đồng bộ ---------- */
{
  const A = createGame(P(['A', 'B']), { seed: 77 });
  const B = createGame(P(['A', 'B']), { seed: 77 });
  applyAction(A, 'p1', { type: 'setcode', code: [0, 1, 2, 3] });
  applyAction(B, 'p1', { type: 'setcode', code: [0, 1, 2, 3] });
  applyAction(A, 'p2', { type: 'setcode', code: [4, 4, 4, 4] });
  applyAction(B, 'p2', { type: 'setcode', code: [4, 4, 4, 4] });
  applyAction(A, 'p1', { type: 'guess', guess: [4, 4, 4, 0] });
  applyAction(B, 'p1', { type: 'guess', guess: [4, 4, 4, 0] });
  const rA = applyAction(A, 'p2', { type: 'resign' });
  const rB = applyAction(B, 'p2', { type: 'resign' });
  t('xin thua được chấp nhận ở cả 2 engine', rA.ok && rB.ok);
  t('xin thua đồng bộ: cùng người thắng + cùng final', same(A, B) && A.winner === 'p1');
}

/* ---------- 4. viewFor của 2 engine giống hệt ---------- */
{
  const A = createGame(P(['A', 'B']), { seed: 99 });
  const B = createGame(P(['A', 'B']), { seed: 99 });
  const acts = [
    ['p1', { type: 'setcode', code: [0, 2, 4, 1] }],
    ['p2', { type: 'setcode', code: [5, 3, 1, 0] }],
    ['p1', { type: 'guess', guess: [5, 3, 1, 1] }],
    ['p2', { type: 'guess', guess: [0, 0, 0, 0] }],
  ];
  let ok = true;
  for (const [pid, act] of acts) {
    applyAction(A, pid, act);
    applyAction(B, pid, act);
    const stripV = v => { const c = JSON.parse(JSON.stringify(v)); delete c.gid; c.startedAt = 0; c.endedAt = 0; return c; };
    if (JSON.stringify(stripV(viewFor(A, 'p1'))) !== JSON.stringify(stripV(viewFor(B, 'p1')))) ok = false;
    if (JSON.stringify(stripV(viewFor(A, 'p2'))) !== JSON.stringify(stripV(viewFor(B, 'p2')))) ok = false;
  }
  t('viewFor của 2 engine giống hệt sau từng nước đi', ok);
  t('viewFor của p2 vẫn che mã của p1 sau khi đã đoán', viewFor(A, 'p2').players[0].secret === null);
}

console.log(`\nĐồng bộ Mastermind: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
