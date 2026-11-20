// Đồng bộ Carcassonne: 2 engine cùng seed + cùng hành động thì giống hệt
// nhau từng byte (kể cả 1 trận 5 người đầy đủ do bot đánh — bot chỉ
// dùng viewFor nên không rò thông tin ẩn giữa 2 bên).
import { createGame, applyAction, viewFor, serialize, deserialize, mulberry32, actors } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để bot (Dễ bừa, Khó có chọn ngẫu nhiên) cho kết
   quả ổn định — seed: 20261120 */
const _rng = mulberry32(20261120);
Math.random = () => _rng();

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));
/* gid / startedAt / endedAt khác nhau giữa 2 lần tạo ván (thời gian thực) —
   bỏ qua khi so sánh đồng bộ (giống pattern Chắn / Tổ Tôm / Hanabi) */
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
  t('trận 5 người kết thúc được', finished && A.phase === 'ended');
  t('2 engine có cùng người thắng', JSON.stringify(A.winners) === JSON.stringify(B.winners));
  t('2 engine có cùng lý do kết thúc', A.endReason === B.endReason && A.endCause === B.endCause);
  t('2 engine có cùng điểm số', JSON.stringify(A.players.map(p => p.score)) === JSON.stringify(B.players.map(p => p.score)));
  console.log(`  · trận mẫu 5 người: điểm ${A.players.map(p => p.score).join('/')} — thắng: ${A.winners.join(',') || 'không ai'}`);
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

/* ---------- 3. 2–4 người ---------- */
{
  const r2 = playMatch(77, 2, ['hard', 'easy']);
  t('trận 2 người đồng bộ + kết thúc', r2.ok && r2.finished);
  const r4 = playMatch(78, 4, ['hard', 'easy', 'hard', 'easy']);
  t('trận 4 người đồng bộ + kết thúc', r4.ok && r4.finished);
  const r3 = playMatch(79, 3, ['easy', 'hard', 'easy']);
  t('trận 3 người đồng bộ + kết thúc', r3.ok && r3.finished);
}

/* ---------- 4. xin thua đồng bộ ---------- */
{
  const A = createGame(P(['A', 'B', 'C', 'D']), { seed: 55 });
  const B = createGame(P(['A', 'B', 'C', 'D']), { seed: 55 });
  const rA = applyAction(A, 'p2', { type: 'resign' });
  const rB = applyAction(B, 'p2', { type: 'resign' });
  t('xin thua áp 2 bên đều ok và giống hệt nhau', rA.ok && rB.ok && same(A, B));
  t('xin thua đồng bộ: cùng người thắng, lý do resign',
    JSON.stringify(A.winners) === JSON.stringify(B.winners) && A.endReason === 'resign' && A.phase === 'ended');
}

/* ---------- 5. viewFor đồng bộ + che thông tin ẩn ---------- */
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
  let viewsSame = true, hiddenOk = true;
  for (const p of A.players) {
    const vA = viewFor(A, p.id), vB = viewFor(B, p.id);
    delete vA.gid; delete vB.gid; vA.startedAt = vB.startedAt = 0; vA.endedAt = vB.endedAt = 0;
    if (JSON.stringify(vA) !== JSON.stringify(vB)) viewsSame = false;
    /* chỉ người tới lượt thấy lá trên tay; người khác thấy null */
    const turnPid = A.players[A.turnIdx].id;
    if (A.phase === 'playing') {
      if (p.id === turnPid && vA.hand !== A.hand) hiddenOk = false;
      if (p.id !== turnPid && vA.hand !== null) hiddenOk = false;
    }
    /* không lộ thứ tự chồng lá, không có trường you */
    if ('stack' in vA || 'you' in vA) hiddenOk = false;
    if (typeof vA.stackCount !== 'number') hiddenOk = false;
  }
  t('viewFor của 5 người sau 12 nước đều giống hệt 2 bên', viewsSame);
  t('viewFor che lá trên tay người khác + thứ tự chồng lá, không có trường you', hiddenOk);
  const normSer = s => { const o = JSON.parse(s); delete o.gid; o.startedAt = 0; o.endedAt = 0; return JSON.stringify(o); };
  t('serialize 2 bên giống hệt sau 12 nước', normSer(serialize(A)) === normSer(serialize(B)));
  t('deserialize vòng lại giống hệt', normSer(serialize(deserialize(serialize(A)))) === normSer(serialize(A)));
}

console.log(`\nĐồng bộ Carcassonne: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
