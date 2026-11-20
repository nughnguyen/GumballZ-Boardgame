// Test đồng bộ online Cờ Lật (mô phỏng 2 máy). Chạy: node colat/test/net.mjs
// 2 engine chạy cùng 1 chuỗi action {type, x?, y?} → serialize state 2 bên
// phải giống hệt nhau sau MỖI action, kể cả lật nhiều hướng, bỏ lượt,
// đề nghị hòa và xin thua. Action JSON đi-về (stringify/parse) không đổi.
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { chooseMove } from '../js/bot.js';

const P1 = { id: 'p1', name: 'Đen' }, P2 = { id: 'p2', name: 'Trắng', isBot: true };
const mkPair = () => {
  const a = E.createGame([P1, P2]), b = E.createGame([P1, P2]);
  a.gid = b.gid = 'net-test'; /* gid ngẫu nhiên khi tạo — ép bằng nhau để so sánh */
  return [a, b];
};
const applyBoth = (pair, pid, a) => {
  const rs = pair.map(s => E.applyAction(s, pid, a));
  assert.ok(rs[0].ok && rs[1].ok, `action ${JSON.stringify(a)} phải hợp lệ cả 2 bên (lỗi: ${rs[0].reason || rs[1].reason})`);
  assert.deepEqual(E.serialize(pair[0]), E.serialize(pair[1]), `state 2 bên lệch nhau sau action ${JSON.stringify(a)}`);
  return rs[0];
};
const applyBothExpectFail = (pair, pid, a) => {
  const rs = pair.map(s => E.applyAction(s, pid, a));
  assert.equal(rs[0].ok, false);
  assert.equal(rs[1].ok, false);
  assert.deepEqual(E.serialize(pair[0]), E.serialize(pair[1]), `state 2 bên lệch nhau sau action lỗi ${JSON.stringify(a)}`);
};
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

test('đi xen kẽ từ vị trí xuất phát: state giống hệt sau mỗi nước', () => {
  const pair = mkPair();
  /* d6 (3,2) lật d5; c6 (2,2) lật chéo d5; các nước sau tính bằng engine */
  const seq = [
    ['p1', { type: 'move', x: 3, y: 2 }],
    ['p2', { type: 'move', x: 2, y: 2 }],
  ];
  for (const [pid, a] of seq) applyBoth(pair, pid, a);
  assert.equal(pair[0].turn, 'p1');
  assert.equal(pair[0].moveCount, 2);
  assert.deepEqual(E.counts(pair[0].cells), { B: 3, W: 3, total: 6 });
  /* nước thứ 3: Đen (2,3) c5 — lật (3,3) */
  const r = applyBoth(pair, 'p1', { type: 'move', x: 2, y: 3 });
  assert.ok(r.ok && r.flipped === 1);
  assert.equal(pair[0].cells[E.idx(3, 3)], 1);
});

test('lật nhiều hướng + bỏ lượt đồng bộ cả 2 bên', () => {
  const pair = mkPair();
  for (const s of pair) {
    s.cells.fill(1);
    s.cells[E.idx(1, 0)] = 2; s.cells[E.idx(6, 7)] = 2;
    s.cells[E.idx(0, 0)] = 0; s.cells[E.idx(7, 7)] = 0;
  }
  const r = applyBoth(pair, 'p1', { type: 'move', x: 0, y: 0 });
  assert.ok(r.ok && r.passed === 'p2');
  assert.equal(pair[0].turn, 'p1');
  assert.equal(pair[0].lastPass.by, 'p2');
  const r2 = applyBoth(pair, 'p1', { type: 'move', x: 7, y: 7 });
  assert.ok(r2.ok && r2.ended);
  assert.equal(pair[0].winner, 'p1');
  assert.equal(pair[0].endReason, 'count');
  applyBothExpectFail(pair, 'p2', { type: 'move', x: 0, y: 0 }); /* ván đã kết thúc */
});

test('10 ván bot-vs-bot: state khớp sau MỖI action', () => {
  for (let g = 0; g < 10; g++) {
    const pair = mkPair();
    let n = 0;
    while (pair[0].phase === 'playing' && n < 200) {
      const pid = pair[0].turn;
      /* nước đi tính 1 lần từ state bên A rồi áp cho cả 2 bên (bot dùng
         Math.random nên không tính riêng từng bên) */
      const a = chooseMove(pair[0], pid, g % 2 ? 'easy' : 'hard');
      assert.ok(a, `ván ${g}: bot không trả action`);
      applyBoth(pair, pid, a);
      n++;
    }
    assert.equal(pair[0].phase, 'ended', `ván ${g}: chưa kết thúc sau ${n} nước`);
    assert.deepEqual(E.serialize(pair[0]), E.serialize(pair[1]), `ván ${g}: lệch cuối`);
  }
});

test('đề nghị hòa online: 2 bên cùng thấy đề nghị, đồng ý và từ chối', () => {
  const pair = mkPair();
  applyBoth(pair, 'p1', { type: 'move', x: 3, y: 2 });
  let r = applyBoth(pair, 'p1', { type: 'draw' });
  assert.ok(r.offered);
  assert.equal(pair[0].drawOffer, 'p1');
  r = applyBoth(pair, 'p2', { type: 'draw-decline' });
  assert.ok(r.declined);
  assert.equal(pair[0].drawOffer, null);
  assert.equal(pair[0].phase, 'playing');
  applyBoth(pair, 'p2', { type: 'move', x: 2, y: 2 });
  applyBoth(pair, 'p1', { type: 'draw' });
  r = applyBoth(pair, 'p2', { type: 'draw' });
  assert.ok(r.agreed && r.ended);
  assert.equal(pair[0].draw, true);
  assert.equal(pair[0].endReason, 'draw-agree');
  applyBothExpectFail(pair, 'p1', { type: 'move', x: 2, y: 3 }); /* ván đã kết thúc */
});

test('xin thua online: 2 bên cùng thấy người thắng + lý do', () => {
  const pair = mkPair();
  applyBoth(pair, 'p1', { type: 'move', x: 3, y: 2 });
  applyBoth(pair, 'p2', { type: 'move', x: 2, y: 2 });
  const r = applyBoth(pair, 'p1', { type: 'resign' });
  assert.ok(r.ended);
  assert.equal(pair[0].winner, 'p2');
  assert.equal(pair[0].endReason, 'resign');
  applyBothExpectFail(pair, 'p2', { type: 'move', x: 2, y: 3 }); /* ván đã kết thúc */
});

test('action JSON đi-về không đổi; action lạ bị từ chối ở cả 2 bên', () => {
  const a = { type: 'move', x: 3, y: 2 };
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  const pair = mkPair();
  const bad = [
    { type: 'fire', x: 3, y: 2 },
    { type: 'move', x: 9, y: 9 },
    { type: 'move', x: 3, y: 3 }, /* ô đã có quân */
    { type: 'move', x: 0, y: 0 }, /* không lật được quân nào */
    null, { x: 3, y: 2 }, { type: 'move' },
  ];
  for (const b of bad) applyBothExpectFail(pair, 'p1', b);
  /* nước đi sai lượt cũng bị từ chối đồng đều */
  applyBothExpectFail(pair, 'p2', { type: 'move', x: 2, y: 2 });
  assert.deepEqual(E.serialize(pair[0]), E.serialize(pair[1]));
});

test('viewFor 2 bên: cùng cells/lượt/điểm, khác mySide', () => {
  const pair = mkPair();
  applyBoth(pair, 'p1', { type: 'move', x: 3, y: 2 });
  applyBoth(pair, 'p2', { type: 'move', x: 2, y: 2 });
  const v1 = E.viewFor(pair[0], 'p1'), v2 = E.viewFor(pair[1], 'p2');
  assert.deepEqual(v1.cells, v2.cells);
  assert.equal(v1.turn, v2.turn);
  assert.equal(v1.mySide, 'B');
  assert.equal(v2.mySide, 'W');
  assert.deepEqual(v1.counts, v2.counts);
});

console.log(`\n${pass} test đạt.`);
