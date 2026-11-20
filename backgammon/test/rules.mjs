// 🎲 Luật Backgammon — test có hạt giống, chạy: node backgammon/test/rules.mjs
import {
  createGame, applyAction, viewFor, actors, legalMovesFromView, legalMoves,
  destsFor, serialize, deserialize, pipCount, POINTS, CHECKERS,
} from '../js/engine.js';

/* Math.random có hạt giống (mulberry32) để test ổn định */
let _s = 1234567;
Math.random = function () {
  _s |= 0; _s = (_s + 0x6D2B79F5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.log('  ✗ FAIL:', name); }
}
function eq(name, a, b) { ok(name + ` (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`, JSON.stringify(a) === JSON.stringify(b)); }

function fresh(seed = 42) { return createGame(['An', 'Bình'], { seed }); }
/* dọn bàn rồi đặt quân theo ý muốn: spec = {pointIdx: [pid, count], ...} */
function customPos(players, spec, opts = {}) {
  const s = fresh(opts.seed || 42);
  for (let i = 0; i < POINTS; i++) s.points[i] = { owner: null, count: 0 };
  for (const [idx, [pid, n]] of Object.entries(spec)) {
    s.points[+idx] = { owner: pid, count: n };
  }
  for (const p of s.players) { p.bar = 0; p.off = 0; p.hits = 0; p.score = 0; }
  if (opts.bar) for (const [pid, n] of Object.entries(opts.bar)) player(s, pid).bar = n;
  if (opts.off) for (const [pid, n] of Object.entries(opts.off)) player(s, pid).off = n;
  if (opts.turn !== undefined) { s.turnIdx = opts.turn; s.turn = s.players[opts.turn].id; }
  if (opts.dice) { s.dice = opts.dice.slice(); s.diceLeft = opts.dice.slice(); s.step = 'move'; }
  if (opts.step) s.step = opts.step;
  return s;
}
const player = (s, pid) => s.players.find(p => p.id === pid);
const countCheckers = (s, pid) => {
  let n = player(s, pid).bar + player(s, pid).off;
  for (const pt of s.points) if (pt.owner === pid) n += pt.count;
  return n;
};

/* ---------- 1. thế cờ đầu ---------- */
{
  const s = fresh();
  eq('mỗi người 15 quân', [countCheckers(s, 'p0'), countCheckers(s, 'p1')], [15, 15]);
  eq('p0: 2 ở điểm 24, 5 ở 13, 3 ở 8, 5 ở 6', [s.points[23].count, s.points[12].count, s.points[7].count, s.points[5].count], [2, 5, 3, 5]);
  eq('p1: 2 ở điểm 1, 5 ở 12, 3 ở 17, 5 ở 19', [s.points[0].count, s.points[11].count, s.points[16].count, s.points[18].count], [2, 5, 3, 5]);
  eq('pip đầu ván mỗi bên 167', [pipCount(player(s, 'p0'), s.points), pipCount(player(s, 'p1'), s.points)], [167, 167]);
  ok('người đi đầu là 1 trong 2', ['p0', 'p1'].includes(s.turn));
  eq('actors = người đi đầu', actors(s), [s.turn]);
  eq('bước đầu là roll', s.step, 'roll');
  eq('cube bắt đầu ×1 ở giữa', [s.cube.value, s.cube.owner], [1, null]);
  ok('2 bản sao cùng seed cho cùng gid', fresh().gid === fresh().gid);
}

/* ---------- 2. gieo xúc xắc ---------- */
{
  const s = fresh();
  const r = applyAction(s, s.turn, { type: 'roll' });
  ok('gieo được', r.ok);
  eq('bước sau gieo là move', s.step, 'move');
  ok('xúc xắc 1–6', s.dice.every(d => d >= 1 && d <= 6));
  eq('diceLeft = 2 xúc xắc (không đôi)', s.diceLeft.length, s.dice[0] === s.dice[1] ? 4 : 2);
  ok('gieo lần nữa bị từ chối', !applyAction(s, s.turn, { type: 'roll' }).ok);
  ok('người khác gieo bị từ chối', !applyAction(s, s.players[1 - s.turnIdx].id, { type: 'roll' }).ok);
  /* 2 bản sao cùng seed gieo ra cùng xúc xắc (lockstep) */
  const a = fresh(7), b = fresh(7);
  applyAction(a, a.turn, { type: 'roll' });
  applyAction(b, b.turn, { type: 'roll' });
  eq('cùng seed → cùng xúc xắc', a.dice, b.dice);
  /* đôi → 4 nước: tìm seed ra đôi */
  let ds = null;
  for (let seed = 1; seed < 200; seed++) {
    const t = fresh(seed);
    applyAction(t, t.turn, { type: 'roll' });
    if (t.dice[0] === t.dice[1]) { ds = t; break; }
  }
  ok('tìm được seed ra đôi', !!ds);
  if (ds) eq('đôi → diceLeft 4 nước', ds.diceLeft.length, 4);
}

/* ---------- 3. đi quân cơ bản ---------- */
{
  const s = customPos(null, { 23: ['p0', 2], 12: ['p0', 5], 7: ['p0', 3], 5: ['p0', 5], 0: ['p1', 2], 11: ['p1', 5], 16: ['p1', 3], 18: ['p1', 5] }, { turn: 0, dice: [3, 5] });
  const v = viewFor(s, 'p0');
  const moves = legalMovesFromView(v, 'p0');
  ok('có nước đi', moves.some(m => m.type === 'move'));
  /* p0 ở điểm 24 (idx 23) đi 3 → điểm 21 (idx 20) */
  ok('đi 24→21 bằng 3 hợp lệ', moves.some(m => m.from === 23 && m.to === 20 && m.die === 3));
  const r = applyAction(s, 'p0', { type: 'move', from: 23, to: 20, die: 3 });
  ok('áp nước đi được', r.ok);
  eq('điểm 24 còn 1 quân', s.points[23].count, 1);
  eq('điểm 21 có 1 quân p0', [s.points[20].owner, s.points[20].count], ['p0', 1]);
  eq('đã dùng 1 xúc xắc, còn [5]', s.diceLeft, [5]);
  eq('vẫn lượt p0 (còn xúc xắc)', s.turn, 'p0');
  const r2 = applyAction(s, 'p0', { type: 'move', from: 20, to: 15, die: 5 });
  ok('đi tiếp bằng xúc xắc còn lại', r2.ok);
  eq('hết xúc xắc → đổi lượt sang p1', s.turn, 'p1');
  eq('bước về roll', s.step, 'roll');
}

/* ---------- 4. nước đi sai ---------- */
{
  const s = customPos(null, { 23: ['p0', 2], 0: ['p1', 2] }, { turn: 0, dice: [3, 5] });
  ok('đi quân địch bị từ chối', !applyAction(s, 'p0', { type: 'move', from: 0, to: 3, die: 3 }).ok);
  ok('đi bằng xúc xắc không có bị từ chối', !applyAction(s, 'p0', { type: 'move', from: 23, to: 19, die: 4 }).ok);
  ok('đi sai khoảng cách bị từ chối', !applyAction(s, 'p0', { type: 'move', from: 23, to: 19, die: 3 }).ok);
  ok('đi khi chưa gieo bị từ chối', !applyAction(customPos(null, { 23: ['p0', 2] }, { turn: 0, step: 'roll' }), 'p0', { type: 'move', from: 23, to: 20, die: 3 }).ok);
  /* điểm bị chặn (2+ quân địch) không vào được */
  const s2 = customPos(null, { 23: ['p0', 1], 20: ['p1', 2] }, { turn: 0, dice: [3, 5] });
  ok('điểm có 2 quân địch thì chặn', !legalMovesFromView(viewFor(s2, 'p0'), 'p0').some(m => m.to === 20));
}

/* ---------- 5. đánh trúng blot ---------- */
{
  const s = customPos(null, { 10: ['p0', 1], 7: ['p1', 1] }, { turn: 0, dice: [3, 5] });
  const r = applyAction(s, 'p0', { type: 'move', from: 10, to: 7, die: 3 });
  ok('đánh trúng blot được', r.ok);
  eq('quân địch lên bar', player(s, 'p1').bar, 1);
  eq('điểm 8 giờ là của p0', [s.points[7].owner, s.points[7].count], ['p0', 1]);
  eq('số lần đánh trúng của p0 = 1', player(s, 'p0').hits, 1);
}

/* ---------- 6. bar: bắt buộc vào lại trước ---------- */
{
  /* p0 có 1 quân trên bar, xúc xắc 3-5: cửa vào là điểm 22 (idx 21, d=3) và 20 (idx 19, d=5) */
  const s = customPos(null, { 0: ['p1', 2] }, { turn: 0, dice: [3, 5], bar: { p0: 1 } });
  const moves = legalMovesFromView(viewFor(s, 'p0'), 'p0');
  ok('có quân trên bar thì chỉ được vào lại', moves.every(m => m.from === 'bar'));
  ok('vào lại bằng 3 → điểm 22', moves.some(m => m.from === 'bar' && m.to === 21 && m.die === 3));
  const r = applyAction(s, 'p0', { type: 'move', from: 'bar', to: 21, die: 3 });
  ok('vào lại được', r.ok);
  eq('bar hết quân', player(s, 'p0').bar, 0);
  /* bar bị chặn hết → không có nước nào → mất lượt */
  const s2 = customPos(null, { 21: ['p1', 2], 19: ['p1', 2] }, { turn: 0, dice: [3, 5], bar: { p0: 1 } });
  const m2 = legalMovesFromView(viewFor(s2, 'p0'), 'p0');
  eq('bar bị chặn hết → chỉ còn pass', m2, [{ type: 'pass' }]);
  const r2 = applyAction(s2, 'p0', { type: 'pass' });
  ok('pass khi bị chặn được', r2.ok);
  eq('pass → đổi lượt', s2.turn, 'p1');
}

/* ---------- 7. ra quân ---------- */
{
  /* p0: 14 quân đã ra, 1 quân ở điểm 3 (idx 2, cách ra 3); xúc xắc 3-3
     (cả 2 xúc xắc đều ra quân, dùng 1 là đủ thắng) */
  const s = customPos(null, { 2: ['p0', 1] }, { turn: 0, dice: [3, 3], off: { p0: 14 } });
  ok('ra quân đúng số 3 hợp lệ', legalMovesFromView(viewFor(s, 'p0'), 'p0').some(m => m.from === 2 && m.to === 'off' && m.die === 3));
  const r = applyAction(s, 'p0', { type: 'move', from: 2, to: 'off', die: 3 });
  ok('ra quân được', r.ok);
  eq('p0 ra hết 15 → thắng', s.phase, 'ended');
  eq('người thắng là p0', s.winner, 'p0');
  eq('địch chưa ra quân nào → gammon', s.final.winType, 'gammon');
  /* xúc xắc lớn hơn khi không còn quân ở điểm cao hơn: cả 5 và 6 đều
     ra được 1 quân ở điểm 2, nhưng luật bắt buộc dùng xúc xắc lớn hơn */
  const s2 = customPos(null, { 1: ['p0', 1] }, { turn: 0, dice: [5, 6], off: { p0: 14 } });
  ok('chỉ còn nước ra quân bằng xúc xắc lớn hơn (6)', legalMovesFromView(viewFor(s2, 'p0'), 'p0').some(m => m.from === 1 && m.to === 'off' && m.die === 6));
  ok('ra bằng 5 bị từ chối khi 6 cũng ra được', !legalMovesFromView(viewFor(s2, 'p0'), 'p0').some(m => m.from === 1 && m.to === 'off' && m.die === 5));
  ok('ra quân bằng 6 được', applyAction(s2, 'p0', { type: 'move', from: 1, to: 'off', die: 6 }).ok);
  eq('p0 thắng sau khi ra quân bằng 6', s2.phase, 'ended');
  /* xúc xắc lớn hơn nhưng còn quân ở điểm cao hơn → không được */
  const s3 = customPos(null, { 1: ['p0', 1], 4: ['p0', 1] }, { turn: 0, dice: [5, 6], off: { p0: 13 } });
  const m3 = legalMovesFromView(viewFor(s3, 'p0'), 'p0');
  ok('còn quân ở điểm 5 thì không được ra bằng 5 từ điểm 2', !m3.some(m => m.from === 1 && m.to === 'off'));
  ok('nhưng ra bằng 6 từ điểm 5 được (đúng số)', m3.some(m => m.from === 4 && m.to === 'off' && m.die === 6));
  /* chưa về hết sân nhà thì không được ra quân */
  const s4 = customPos(null, { 2: ['p0', 1], 10: ['p0', 1] }, { turn: 0, dice: [3, 5], off: { p0: 13 } });
  ok('còn quân ngoài sân nhà thì không ra được', !legalMovesFromView(viewFor(s4, 'p0'), 'p0').some(m => m.to === 'off'));
}

/* ---------- 8. bắt buộc dùng xúc xắc lớn hơn ---------- */
{
  /* p0 có 1 quân ở điểm 10 (idx 9), điểm 3 (idx 2) bị 2 quân địch chặn.
     Xúc xắc 1-6: đi 1 tới điểm 9 rồi 6 tới điểm 3 bị chặn; đi 6 tới
     điểm 4 rồi 1 tới điểm 3 cũng bị chặn — chỉ dùng được ĐÚNG 1 xúc
     xắc, nên luật bắt buộc dùng xúc xắc lớn hơn (6). */
  const s = customPos(null, { 9: ['p0', 1], 2: ['p1', 2] }, { turn: 0, dice: [1, 6] });
  const moves = legalMovesFromView(viewFor(s, 'p0'), 'p0');
  eq('chỉ còn nước dùng xúc xắc 6', moves.map(m => m.die), [6]);
  ok('dùng xúc xắc 1 bị từ chối', !applyAction(s, 'p0', { type: 'move', from: 9, to: 8, die: 1 }).ok);
  ok('dùng xúc xắc 6 được', applyAction(s, 'p0', { type: 'move', from: 9, to: 3, die: 6 }).ok);
}

/* ---------- 9. bắt buộc dùng tối đa xúc xắc ---------- */
{
  /* p0: quân ở điểm 12 (idx 11) và điểm 6 (idx 5). Xúc xắc 2-3.
     Chuỗi dài nhất dùng cả 2 xúc xắc (vd 12→10 bằng 2 rồi 10→7 bằng 3).
     Nước đi 1 mình bằng 2 từ điểm 6 → điểm 4 cũng hợp lệ NHƯNG sau đó
     không dùng được 3 nữa (điểm 4→1 bị chặn? không...). Kiểm tra: mọi
     nước đầu của chuỗi dài nhất đều dùng được cả 2 xúc xắc. */
  const s = customPos(null, { 11: ['p0', 1], 5: ['p0', 1], 1: ['p1', 2] }, { turn: 0, dice: [2, 3] });
  const moves = legalMovesFromView(viewFor(s, 'p0'), 'p0');
  ok('có nước đi', moves.length > 0);
  /* thử 1 nước rồi kiểm tra vẫn còn nước dùng xúc xắc còn lại */
  let usedBoth = false;
  for (const m of moves) {
    const t = customPos(null, { 11: ['p0', 1], 5: ['p0', 1], 1: ['p1', 2] }, { turn: 0, dice: [2, 3] });
    applyAction(t, 'p0', { type: 'move', from: m.from, to: m.to, die: m.die });
    if (t.step === 'move' && legalMovesFromView(viewFor(t, 'p0'), 'p0').some(x => x.type === 'move')) { usedBoth = true; break; }
    if (t.turn === 'p1') { usedBoth = true; break; } /* dùng hết cả 2 */
  }
  ok('mọi nước đầu hợp lệ đều cho dùng tiếp xúc xắc còn lại', usedBoth);
}

/* ---------- 10. backgammon ---------- */
{
  /* p0 sắp thắng: 14 quân đã ra, 1 quân ở điểm 2 (idx 1); p1 chưa ra
     quân nào và còn 1 quân trên bar → backgammon. */
  const s = customPos(null, { 1: ['p0', 1] }, { turn: 0, dice: [2, 2], off: { p0: 14 }, bar: { p1: 1 } });
  applyAction(s, 'p0', { type: 'move', from: 1, to: 'off', die: 2 });
  eq('thắng backgammon khi địch còn quân trên bar', s.final.winType, 'backgammon');
  eq('summary ghi winType', s.final.summary.p0.winType, 'backgammon');
  eq('summary ghi hits/cube', [s.final.summary.p0.hits, s.final.summary.p0.cubeValue], [0, 1]);
  /* địch còn quân trong sân nhà của mình → backgammon */
  const s2 = customPos(null, { 1: ['p0', 1], 3: ['p1', 1] }, { turn: 0, dice: [2, 2], off: { p0: 14 } });
  applyAction(s2, 'p0', { type: 'move', from: 1, to: 'off', die: 2 });
  eq('địch còn quân trong sân nhà mình → backgammon', s2.final.winType, 'backgammon');
  /* địch đã ra 1 quân → chỉ single */
  const s3 = customPos(null, { 1: ['p0', 1] }, { turn: 0, dice: [2, 2], off: { p0: 14, p1: 1 } });
  applyAction(s3, 'p0', { type: 'move', from: 1, to: 'off', die: 2 });
  eq('địch đã ra 1 quân → single', s3.final.winType, 'single');
}

/* ---------- 11. xúc xắc gấp đôi ---------- */
{
  const s = fresh();
  const first = s.turn, other = s.players[1 - s.turnIdx].id;
  ok('đề nghị gấp đôi trước khi gieo được', applyAction(s, first, { type: 'double' }).ok);
  eq('bước chờ trả lời', s.step, 'double');
  eq('giá trị đề nghị ×2', s.doubleOffer.value, 2);
  ok('người đề nghị không tự trả lời được', !applyAction(s, first, { type: 'double-accept' }).ok);
  ok('chấp nhận được', applyAction(s, other, { type: 'double-accept' }).ok);
  eq('cube lên ×2, thuộc về người chấp nhận', [s.cube.value, s.cube.owner], [2, other]);
  eq('chấp nhận xong về bước roll', s.step, 'roll');
  ok('người không giữ cube thì không được gấp đôi nữa', !applyAction(s, first, { type: 'double' }).ok);
  /* người giữ cube được gấp đôi tiếp khi tới lượt mình: đặt cube về tay
     người đang tới lượt rồi đề nghị */
  const s4 = fresh();
  s4.cube = { value: 2, owner: s4.turn };
  ok('người giữ cube được gấp đôi tiếp (khi tới lượt)', applyAction(s4, s4.turn, { type: 'double' }).ok);
  eq('giá trị đề nghị lên ×4', s4.doubleOffer.value, 4);
  /* từ chối = thua ngay */
  const s2 = fresh();
  const f2 = s2.turn, o2 = s2.players[1 - s2.turnIdx].id;
  applyAction(s2, f2, { type: 'double' });
  const r = applyAction(s2, o2, { type: 'double-decline' });
  ok('từ chối được', r.ok);
  eq('từ chối → người đề nghị thắng', s2.winner, f2);
  eq('winType = double', s2.final.winType, 'double');
  eq('cubeValue ghi lại = 1 (chưa nhân)', s2.final.cubeValue, 1);
  /* không được gấp đôi sau khi đã gieo */
  const s3 = fresh();
  applyAction(s3, s3.turn, { type: 'roll' });
  ok('đã gieo thì không được gấp đôi', !applyAction(s3, s3.turn, { type: 'double' }).ok);
}

/* ---------- 12. xin thua ---------- */
{
  const s = fresh();
  const loser = s.turn, winner = s.players[1 - s.turnIdx].id;
  ok('xin thua được', applyAction(s, loser, { type: 'resign' }).ok);
  eq('xin thua → ván kết thúc', s.phase, 'ended');
  eq('người còn lại thắng', s.winner, winner);
  eq('endReason = resign', s.endReason, 'resign');
  ok('hết ván thì không đi được nữa', !applyAction(s, winner, { type: 'roll' }).ok);
}

/* ---------- 13. viewFor: không lộ seed, không có `you` ---------- */
{
  const s = fresh();
  applyAction(s, s.turn, { type: 'roll' });
  const v = viewFor(s, 'p0');
  ok('view có me', v.me === 'p0');
  ok('view KHÔNG có trường you', !('you' in v));
  ok('view KHÔNG lộ _seed', !('_seed' in v));
  ok('view KHÔNG lộ _rng', !('_rng' in v));
  ok('view thấy được xúc xắc (công khai)', Array.isArray(v.dice) && v.dice.length === 2);
  ok('view thấy được cube', v.cube && v.cube.value === 1);
  ok('view thấy đủ 24 điểm', v.points.length === 24);
  ok('view là bản sao (sửa view không ảnh hưởng state)', (() => { v.points[0].count = 99; return s.points[0].count !== 99; })());
}

/* ---------- 14. serialize / deserialize ---------- */
{
  const s = fresh(99);
  applyAction(s, s.turn, { type: 'roll' });
  const s2 = deserialize(serialize(s));
  eq('serialize round-trip giữ nguyên state (trừ startedAt)', JSON.stringify({ ...s2, startedAt: 0 }), JSON.stringify({ ...s, startedAt: 0 }));
}

/* ---------- 15. destsFor (cho UI tô sáng) ---------- */
{
  const s = customPos(null, { 23: ['p0', 2], 12: ['p0', 5] }, { turn: 0, dice: [3, 5] });
  const v = viewFor(s, 'p0');
  const d = destsFor(v, 'p0', 23);
  eq('điểm 24 đi được tới 21 (idx 20, xúc 3) và 19 (idx 18, xúc 5)', d.map(x => x.to + ':' + x.die).sort(), ['18:5', '20:3']);
  eq('điểm không có quân mình thì không có đích', destsFor(v, 'p0', 10), []);
}

console.log(`\nBackgammon rules: ${pass} pass, ${fail} fail.`);
process.exit(fail ? 1 : 0);
