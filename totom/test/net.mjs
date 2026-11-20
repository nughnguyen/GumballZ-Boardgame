// Đồng bộ Tổ Tôm: 2 engine cùng seed + cùng hành động thì giống hệt
// nhau từng byte (kể cả 1 trận 5 người đầy đủ do bot đánh — bot chỉ
// dùng viewFor nên không rò thông tin ẩn giữa 2 bên).
import { createGame, applyAction, viewFor, serialize, deserialize, mulberry32, actors } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để bot (Dễ bừa, Khó có chọn ngẫu nhiên) cho kết
   quả ổn định — seed: 20261119 */
const _rng = mulberry32(20261119);
Math.random = () => _rng();

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));
/* gid / startedAt / endedAt khác nhau giữa 2 lần tạo ván (thời gian thực) —
   bỏ qua khi so sánh đồng bộ (giống pattern Chắn / Saboteur / Hanabi) */
const strip = s => {
  const c = JSON.parse(JSON.stringify(s));
  delete c.gid; c.startedAt = 0; c.endedAt = 0;
  return c;
};
const same = (a, b) => JSON.stringify(strip(a)) === JSON.stringify(strip(b));

function playMatch(seed, n = 5, levels = ['hard', 'easy', 'hard', 'easy', 'hard']) {
  const names = ['A', 'B', 'C', 'D', 'E'].slice(0, n);
  const A = createGame(P(names), { seed });
  const B = createGame(P(names), { seed });
  let guard = 0, ok = true;
  while (A.phase === 'playing' && guard++ < 5000) {
    const pending = actors(A);
    if (!pending.length) { ok = false; break; }
    const pid = pending[0];
    const idx = A.players.findIndex(p => p.id === pid);
    const act = botAction(A, pid, levels[idx] || 'easy');
    if (!act) { ok = false; break; }
    const rA = applyAction(A, pid, act);
    const rB = applyAction(B, pid, act);
    if (!rA.ok || !rB.ok) { ok = false; console.log('    áp lỗi', pid, JSON.stringify(act), rA.reason, rB.reason); break; }
    if (!same(A, B)) { ok = false; break; }
  }
  return { A, B, ok, finished: A.phase === 'ended', guard };
}

/* ---------- 1. cùng seed + cùng nước đi thì state giống hệt ---------- */
{
  const { A, B, ok, finished } = playMatch(1234, 5);
  t('trận 5 người do bot đánh: 2 engine giống hệt từng byte', ok);
  t('trận 5 người kết thúc được (có người ù hoặc hòa)', finished && A.phase === 'ended');
  t('2 engine có cùng người thắng', A.winner === B.winner);
  t('2 engine có cùng lý do kết thúc', A.endReason === B.endReason && A.endCause === B.endCause);
  t('2 engine có cùng cước thắng', JSON.stringify(A.cuoc) === JSON.stringify(B.cuoc));
}

/* ---------- 2. nhiều seed khác nhau ---------- */
{
  let allOk = true, allDone = true;
  for (const seed of [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]) {
    const r = playMatch(seed, 5);
    if (!r.ok) allOk = false;
    if (!r.finished) allDone = false;
  }
  t('10 seed khác nhau đều đồng bộ byte', allOk);
  t('10 seed khác nhau đều kết thúc trận', allDone);
}

/* ---------- 3. 4 người ---------- */
{
  const r4 = playMatch(77, 4, ['hard', 'easy', 'hard', 'easy']);
  t('trận 4 người đồng bộ + kết thúc', r4.ok && r4.finished);
}

/* ---------- 4. xin thua đồng bộ ---------- */
{
  const A = createGame(P(['A', 'B', 'C', 'D']), { seed: 55 });
  const B = createGame(P(['A', 'B', 'C', 'D']), { seed: 55 });
  const rA = applyAction(A, 'p2', { type: 'resign' });
  const rB = applyAction(B, 'p2', { type: 'resign' });
  t('xin thua áp 2 bên đều ok và giống hệt nhau', rA.ok && rB.ok && same(A, B));
  t('xin thua đồng bộ: cùng người thắng, lý do resign',
    A.winner === B.winner && A.endReason === 'resign' && A.phase === 'ended');
}

/* ---------- 5. viewFor đồng bộ + che bài ---------- */
{
  const A = createGame(P(['A', 'B', 'C', 'D', 'E']), { seed: 66 });
  const B = createGame(P(['A', 'B', 'C', 'D', 'E']), { seed: 66 });
  /* chơi 12 nước rồi so view của từng người */
  for (let k = 0; k < 12 && A.phase === 'playing'; k++) {
    const pid = actors(A)[0];
    const idx = A.players.findIndex(p => p.id === pid);
    const act = botAction(A, pid, idx === 0 ? 'hard' : 'easy');
    applyAction(A, pid, act);
    applyAction(B, pid, act);
  }
  let viewsSame = true, hiddenOk = true, endedRevealOk = true;
  for (const p of A.players) {
    const vA = viewFor(A, p.id), vB = viewFor(B, p.id);
    delete vA.gid; delete vB.gid; vA.startedAt = vB.startedAt = 0; vA.endedAt = vB.endedAt = 0;
    if (JSON.stringify(vA) !== JSON.stringify(vB)) viewsSame = false;
    const own = vA.players.find(x => x.id === p.id);
    /* trận chưa kết thúc: bài của người khác phải giấu (null);
       trận đã kết thúc: bài lộ hết */
    if (A.phase === 'playing') {
      const others = vA.players.filter(x => x.id !== p.id);
      if (!others.every(x => x.hand === null)) hiddenOk = false;
      if (!Array.isArray(own.hand)) hiddenOk = false;
    } else {
      if (!vA.players.every(x => Array.isArray(x.hand))) endedRevealOk = false;
    }
  }
  t('viewFor của 5 người sau 12 nước đều giống hệt 2 bên', viewsSame);
  t('khi trận chưa kết thúc, viewFor che bài người khác (null) và lộ bài mình', hiddenOk);
  t('khi trận đã kết thúc, viewFor lộ hết bài', endedRevealOk);
  const normSer = s => { const o = JSON.parse(s); delete o.gid; o.startedAt = 0; o.endedAt = 0; return JSON.stringify(o); };
  t('serialize 2 bên giống hệt sau 12 nước', normSer(serialize(A)) === normSer(serialize(B)));
  t('deserialize vòng lại giống hệt', normSer(serialize(deserialize(serialize(A)))) === normSer(serialize(A)));
}

console.log(`\nĐồng bộ Tổ Tôm: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
