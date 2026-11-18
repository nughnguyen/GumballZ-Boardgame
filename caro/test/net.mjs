// Test đồng bộ online Cờ Caro (mô phỏng 2 máy). Chạy: node caro/test/net.mjs
// 2 engine chạy cùng 1 chuỗi action {x,y} → serialize state 2 bên phải giống hệt
// nhau sau MỖI action. Action JSON đi-về (stringify/parse) không đổi.
import assert from 'assert/strict';
import * as E from '../js/engine.js';

const P1 = { id: 'p1', name: 'Bạn' }, P2 = { id: 'p2', name: 'Máy', isBot: true };
const mkPair = (opts) => {
  const a = E.createGame([P1, P2], opts), b = E.createGame([P1, P2], opts);
  a.gid = b.gid = 'net-test'; /* gid ngẫu nhiên khi tạo — ép bằng nhau để so sánh */
  return [a, b];
};
const applyBoth = (pair, pid, a) => {
  const rs = pair.map(s => E.applyAction(s, pid, a));
  assert.ok(rs[0].ok && rs[1].ok, `action ${JSON.stringify(a)} phải hợp lệ cả 2 bên`);
  assert.deepEqual(E.serialize(pair[0]), E.serialize(pair[1]), `state 2 bên lệch nhau sau action ${JSON.stringify(a)}`);
  return rs[0];
};
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

test('đánh thường xen kẽ: state giống hệt sau mỗi nước', () => {
  const pair = mkPair();
  const seq = [
    ['p1', { type: 'move', x: 15, y: 15 }], ['p2', { type: 'move', x: 14, y: 15 }],
    ['p1', { type: 'move', x: 16, y: 15 }], ['p2', { type: 'move', x: 14, y: 16 }],
    ['p1', { type: 'move', x: 17, y: 15 }], ['p2', { type: 'move', x: 0, y: 0 }],
    ['p1', { type: 'move', x: 13, y: 15 }], ['p2', { type: 'move', x: 29, y: 29 }],
  ];
  for (const [pid, a] of seq) applyBoth(pair, pid, a);
  assert.equal(pair[0].turn, 'p1');
  assert.deepEqual(E.counts(pair[0]), { X: 4, O: 4 });
});

test('thắng ngang: 5 X liên tiếp, cả 2 bên cùng thấy winLine + winner', () => {
  const pair = mkPair();
  const seq = [
    ['p1', { type: 'move', x: 2, y: 3 }], ['p2', { type: 'move', x: 10, y: 10 }],
    ['p1', { type: 'move', x: 3, y: 3 }], ['p2', { type: 'move', x: 11, y: 10 }],
    ['p1', { type: 'move', x: 4, y: 3 }], ['p2', { type: 'move', x: 12, y: 10 }],
    ['p1', { type: 'move', x: 5, y: 3 }], ['p2', { type: 'move', x: 13, y: 10 }],
    ['p1', { type: 'move', x: 6, y: 3 }],
  ];
  let last;
  for (const [pid, a] of seq) last = applyBoth(pair, pid, a);
  assert.ok(last.win);
  assert.equal(pair[0].winner, 'p1');
  assert.equal(pair[0].winLine.length, 5);
  assert.equal(pair[0].phase, 'ended');
});

test('thắng chéo /: 5 O liên tiếp, bên thua cũng thấy đúng trạng thái', () => {
  const pair = mkPair();
  const seq = [
    ['p1', { type: 'move', x: 0, y: 0 }], ['p2', { type: 'move', x: 8, y: 2 }],
    ['p1', { type: 'move', x: 1, y: 0 }], ['p2', { type: 'move', x: 7, y: 3 }],
    ['p1', { type: 'move', x: 2, y: 0 }], ['p2', { type: 'move', x: 6, y: 4 }],
    ['p1', { type: 'move', x: 3, y: 0 }], ['p2', { type: 'move', x: 5, y: 5 }],
    ['p1', { type: 'move', x: 20, y: 20 }], ['p2', { type: 'move', x: 4, y: 6 }],
  ];
  let last;
  for (const [pid, a] of seq) last = applyBoth(pair, pid, a);
  assert.ok(last.win);
  assert.equal(pair[0].winner, 'p2');
});

test('chặn: O chặn đường 4 của X, X chặn lại đường 3 của O — state vẫn khớp', () => {
  const pair = mkPair();
  const seq = [
    ['p1', { type: 'move', x: 5, y: 5 }], ['p2', { type: 'move', x: 0, y: 9 }],
    ['p1', { type: 'move', x: 6, y: 5 }], ['p2', { type: 'move', x: 1, y: 9 }],
    ['p1', { type: 'move', x: 7, y: 5 }], ['p2', { type: 'move', x: 8, y: 5 }], /* O chặn đầu phải của dãy 3 X */
    ['p1', { type: 'move', x: 4, y: 5 }], /* X lên 4 quân, đầu trái còn trống */
    ['p2', { type: 'move', x: 3, y: 5 }], /* O chặn nốt đầu trái — dãy 4 của X bịt cả 2 đầu */
    ['p1', { type: 'move', x: 10, y: 10 }],
    ['p2', { type: 'move', x: 2, y: 9 }], /* O có 3 quân ở hàng 9 */
    ['p1', { type: 'move', x: 3, y: 9 }], /* X chặn dãy 3 của O */
    ['p2', { type: 'move', x: 20, y: 20 }],
  ];
  for (const [pid, a] of seq) applyBoth(pair, pid, a);
  assert.equal(pair[0].phase, 'playing');
  assert.equal(pair[0].winner, null);
});

test('ván hòa trên bàn nhỏ 5×5: 25 nước, 2 bên cùng hòa', () => {
  const pair = mkPair({ size: 5 });
  const DRAW5 = [2, 2, 2, 1, 1, 1, 1, 2, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 2, 2, 1, 1, 2, 2];
  const xs = [], os = [];
  DRAW5.forEach((m, i) => (m === 1 ? xs : os).push(i));
  const order = [];
  for (let i = 0; i < 12; i++) { order.push(xs[i]); order.push(os[i]); }
  order.push(xs[12]);
  let last;
  for (let n = 0; n < order.length; n++) {
    const i = order[n];
    last = applyBoth(pair, n % 2 === 0 ? 'p1' : 'p2', { type: 'move', x: i % 5, y: Math.floor(i / 5) });
  }
  assert.ok(last.draw);
  assert.equal(pair[0].draw, true);
  assert.equal(pair[0].winner, null);
});

test('action JSON đi-về không đổi; action lạ bị từ chối ở cả 2 bên', () => {
  const a = { type: 'move', x: 15, y: 15 };
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  const pair = mkPair();
  const bad = [{ type: 'fire', x: 1, y: 1 }, { type: 'move', x: 31, y: 1 }, null, { x: 1, y: 1 }];
  for (const b of bad) {
    const rs = pair.map(s => E.applyAction(s, 'p1', b));
    assert.equal(rs[0].ok, false);
    assert.equal(rs[1].ok, false);
  }
  /* nước đi sai lượt cũng bị từ chối đồng đều */
  const rs = pair.map(s => E.applyAction(s, 'p2', { type: 'move', x: 1, y: 1 }));
  assert.equal(rs[0].ok, false);
  assert.equal(rs[1].ok, false);
  assert.deepEqual(E.serialize(pair[0]), E.serialize(pair[1]));
});

test('viewFor 2 bên: cùng cells/lượt/winner, khác myMark', () => {
  const pair = mkPair();
  applyBoth(pair, 'p1', { type: 'move', x: 15, y: 15 });
  applyBoth(pair, 'p2', { type: 'move', x: 14, y: 15 });
  const v1 = E.viewFor(pair[0], 'p1'), v2 = E.viewFor(pair[1], 'p2');
  assert.deepEqual(v1.cells, v2.cells);
  assert.equal(v1.turn, v2.turn);
  assert.equal(v1.myMark, 'X');
  assert.equal(v2.myMark, 'O');
});

console.log(`\n${pass} test đạt.`);
