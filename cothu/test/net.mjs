// Test đồng bộ online Cờ Thú (mô phỏng 2 máy). Chạy: node cothu/test/net.mjs
// 2 engine chạy cùng 1 chuỗi action {type, from?, to?} → serialize state 2 bên
// phải giống hệt nhau sau MỖI action, kể cả ăn quân, vào hang và xin thua.
// Action JSON đi-về (stringify/parse) không đổi.
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { chooseMove } from '../js/bot.js';

const P1 = { id: 'p1', name: 'Đỏ' }, P2 = { id: 'p2', name: 'Xanh', isBot: true };
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

test('đi thường xen kẽ: state giống hệt sau mỗi nước', () => {
  const pair = mkPair();
  const seq = [
    ['p1', { type: 'move', from: { x: 0, y: 6 }, to: { x: 0, y: 5 } }],
    ['p2', { type: 'move', from: { x: 6, y: 2 }, to: { x: 6, y: 3 } }],
    ['p1', { type: 'move', from: { x: 2, y: 6 }, to: { x: 2, y: 7 } }],
    ['p2', { type: 'move', from: { x: 0, y: 2 }, to: { x: 0, y: 3 } }],
    ['p1', { type: 'move', from: { x: 4, y: 6 }, to: { x: 4, y: 7 } }],
    ['p2', { type: 'move', from: { x: 2, y: 2 }, to: { x: 2, y: 1 } }],
  ];
  for (const [pid, a] of seq) applyBoth(pair, pid, a);
  assert.equal(pair[0].turn, 'p1');
  assert.equal(pair[0].moveCount, 6);
  assert.deepEqual(E.counts(pair[0]), { R: 8, B: 8 });
});

test('ăn quân + nhảy sông đồng bộ cả 2 bên', () => {
  const pair = mkPair();
  /* dọn bàn rồi đặt hình: Hổ Đỏ (0,4) nhảy qua sông ăn Chó Xanh (3,4) */
  for (const s of pair) {
    s.cells.fill(0);
    s.cells[4 * 7 + 0] = 6; s.cells[4 * 7 + 3] = -3; s.cells[0 * 7 + 0] = -8; /* thêm Voi Xanh để khỏi thắng ngay vì ăn hết quân */
  }
  const r = applyBoth(pair, 'p1', { type: 'move', from: { x: 0, y: 4 }, to: { x: 3, y: 4 } });
  assert.ok(r.captured === 3);
  assert.equal(pair[0].cells[4 * 7 + 3], 6);
  assert.deepEqual(pair[0].captured.p1, [{ rank: 3, side: 'B' }]);
  assert.equal(pair[0].lastMove.jump, true);
});

test('10 ván bot-vs-bot: state khớp sau MỖI action', () => {
  for (let g = 0; g < 10; g++) {
    const pair = mkPair();
    let n = 0;
    while (pair[0].phase === 'playing' && n < 400) {
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

test('vào hang thắng: 2 bên cùng thấy người thắng + lý do', () => {
  const pair = mkPair();
  for (const s of pair) {
    s.cells.fill(0);
    s.cells[1 * 7 + 3] = 5; /* Báo Đỏ kề hang Xanh */
    s.cells[8 * 7 + 0] = -1; /* Chuột Xanh ở xa */
  }
  const r = applyBoth(pair, 'p1', { type: 'move', from: { x: 3, y: 1 }, to: { x: 3, y: 0 } });
  assert.ok(r.ended);
  assert.equal(pair[0].winner, 'p1');
  assert.equal(pair[0].endReason, 'den');
  applyBothExpectFail(pair, 'p2', { type: 'move', from: { x: 0, y: 8 }, to: { x: 0, y: 7 } }); /* ván đã kết thúc */
});

test('xin thua online: 2 bên cùng thấy người thắng + lý do', () => {
  const pair = mkPair();
  applyBoth(pair, 'p1', { type: 'move', from: { x: 0, y: 6 }, to: { x: 0, y: 5 } });
  applyBoth(pair, 'p2', { type: 'move', from: { x: 6, y: 2 }, to: { x: 6, y: 3 } });
  const r = applyBoth(pair, 'p1', { type: 'resign' });
  assert.ok(r.ended);
  assert.equal(pair[0].winner, 'p2');
  assert.equal(pair[0].endReason, 'resign');
  applyBothExpectFail(pair, 'p2', { type: 'move', from: { x: 6, y: 3 }, to: { x: 6, y: 4 } }); /* ván đã kết thúc */
});

test('action JSON đi-về không đổi; action lạ bị từ chối ở cả 2 bên', () => {
  const a = { type: 'move', from: { x: 0, y: 6 }, to: { x: 0, y: 5 } };
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  const pair = mkPair();
  const bad = [
    { type: 'fire', from: { x: 0, y: 6 }, to: { x: 0, y: 5 } },
    { type: 'move', from: { x: 0, y: 6 }, to: { x: 9, y: 9 } },
    { type: 'move', from: { x: 0, y: 6 }, to: { x: 0, y: 6 } },
    null, { from: { x: 0, y: 6 } }, { type: 'move' },
  ];
  for (const b of bad) applyBothExpectFail(pair, 'p1', b);
  /* nước đi sai lượt cũng bị từ chối đồng đều */
  applyBothExpectFail(pair, 'p2', { type: 'move', from: { x: 6, y: 2 }, to: { x: 6, y: 3 } });
  assert.deepEqual(E.serialize(pair[0]), E.serialize(pair[1]));
});

test('viewFor 2 bên: cùng cells/lượt/winner, khác mySide', () => {
  const pair = mkPair();
  applyBoth(pair, 'p1', { type: 'move', from: { x: 0, y: 6 }, to: { x: 0, y: 5 } });
  applyBoth(pair, 'p2', { type: 'move', from: { x: 6, y: 2 }, to: { x: 6, y: 3 } });
  const v1 = E.viewFor(pair[0], 'p1'), v2 = E.viewFor(pair[1], 'p2');
  assert.deepEqual(v1.cells, v2.cells);
  assert.equal(v1.turn, v2.turn);
  assert.equal(v1.mySide, 'R');
  assert.equal(v2.mySide, 'B');
  assert.deepEqual(v1.captured, v2.captured);
});

console.log(`\n${pass} test đạt.`);
