// Test đồng bộ online TicTacToe (mô phỏng 2 máy). Chạy: node tictactoe/test/net.mjs
// 2 engine chạy cùng 1 chuỗi action {x,y} → serialize state 2 bên phải giống hệt
// nhau sau MỖI action. Action JSON đi-về (stringify/parse) không đổi.
import assert from 'assert/strict';
import * as E from '../js/engine.js';

const P1 = { id: 'p1', name: 'Bạn' }, P2 = { id: 'p2', name: 'Máy', isBot: true };
const mkPair = () => {
  const a = E.createGame([P1, P2]), b = E.createGame([P1, P2]);
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
    ['p1', { type: 'move', x: 1, y: 1 }], ['p2', { type: 'move', x: 0, y: 0 }],
    ['p1', { type: 'move', x: 2, y: 2 }], ['p2', { type: 'move', x: 0, y: 2 }],
    ['p1', { type: 'move', x: 2, y: 0 }],
  ];
  for (const [pid, a] of seq) applyBoth(pair, pid, a);
  assert.equal(pair[0].turn, 'p2');
  assert.deepEqual(E.counts(pair[0]), { X: 3, O: 2 });
});

test('thắng ngang: 3 X liên tiếp hàng trên, cả 2 bên cùng thấy winLine + winner', () => {
  const pair = mkPair();
  const seq = [
    ['p1', { type: 'move', x: 0, y: 0 }], ['p2', { type: 'move', x: 0, y: 1 }],
    ['p1', { type: 'move', x: 1, y: 0 }], ['p2', { type: 'move', x: 1, y: 1 }],
    ['p1', { type: 'move', x: 2, y: 0 }],
  ];
  let last;
  for (const [pid, a] of seq) last = applyBoth(pair, pid, a);
  assert.ok(last.win);
  assert.equal(pair[0].winner, 'p1');
  assert.equal(pair[0].winLine.length, 3);
  assert.equal(pair[0].phase, 'ended');
});

test('thắng chéo: 3 O liên tiếp đường chéo /, bên thua cũng thấy đúng trạng thái', () => {
  const pair = mkPair();
  const seq = [
    ['p1', { type: 'move', x: 0, y: 0 }], ['p2', { type: 'move', x: 2, y: 0 }],
    ['p1', { type: 'move', x: 1, y: 0 }], ['p2', { type: 'move', x: 1, y: 1 }],
    ['p1', { type: 'move', x: 2, y: 2 }], ['p2', { type: 'move', x: 0, y: 2 }],
  ];
  let last;
  for (const [pid, a] of seq) last = applyBoth(pair, pid, a);
  assert.ok(last.win);
  assert.equal(pair[0].winner, 'p2');
  assert.deepEqual([...pair[0].winLine].sort((x, y) => x - y), [2, 4, 6]);
});

test('ván hòa 9 nước: 2 bên cùng hòa, state giống hệt', () => {
  const pair = mkPair();
  const seq = [
    ['p1', { type: 'move', x: 0, y: 0 }], ['p2', { type: 'move', x: 1, y: 0 }],
    ['p1', { type: 'move', x: 2, y: 0 }], ['p2', { type: 'move', x: 1, y: 1 }],
    ['p1', { type: 'move', x: 0, y: 1 }], ['p2', { type: 'move', x: 2, y: 1 }],
    ['p1', { type: 'move', x: 1, y: 2 }], ['p2', { type: 'move', x: 0, y: 2 }],
    ['p1', { type: 'move', x: 2, y: 2 }],
  ];
  let last;
  for (const [pid, a] of seq) last = applyBoth(pair, pid, a);
  assert.ok(last.draw);
  assert.equal(pair[0].draw, true);
  assert.equal(pair[0].winner, null);
  assert.equal(pair[0].phase, 'ended');
});

test('action JSON đi-về không đổi; action lạ bị từ chối ở cả 2 bên', () => {
  const a = { type: 'move', x: 1, y: 1 };
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  const pair = mkPair();
  const bad = [{ type: 'fire', x: 1, y: 1 }, { type: 'move', x: 3, y: 1 }, null, { x: 1, y: 1 }];
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
  applyBoth(pair, 'p1', { type: 'move', x: 1, y: 1 });
  applyBoth(pair, 'p2', { type: 'move', x: 0, y: 0 });
  const v1 = E.viewFor(pair[0], 'p1'), v2 = E.viewFor(pair[1], 'p2');
  assert.deepEqual(v1.cells, v2.cells);
  assert.equal(v1.turn, v2.turn);
  assert.equal(v1.myMark, 'X');
  assert.equal(v2.myMark, 'O');
});

console.log(`\n${pass} test đạt.`);
