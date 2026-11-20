// Test đồng bộ online Cờ Đam (mô phỏng 2 máy). Chạy: node codam/test/net.mjs
// 2 engine chạy cùng 1 chuỗi action {type, from?, to?} → serialize state 2 bên
// phải giống hệt nhau sau MỖI action, kể cả ăn quân, nhảy nhiều lần, phong
// Vua, đề nghị hòa và xin thua. Action JSON đi-về (stringify/parse) không đổi.
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { chooseMove } from '../js/bot.js';

const P1 = { id: 'p1', name: 'Đỏ' }, P2 = { id: 'p2', name: 'Đen', isBot: true };
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
  /* dãy nước đi thường xen kẽ, không tạo nước ăn bắt buộc nào (tính bằng engine) */
  const seq = [
    ['p1', { type: 'move', from: { x: 4, y: 5 }, to: { x: 3, y: 4 } }],
    ['p2', { type: 'move', from: { x: 1, y: 2 }, to: { x: 0, y: 3 } }],
    ['p1', { type: 'move', from: { x: 3, y: 6 }, to: { x: 4, y: 5 } }],
    ['p2', { type: 'move', from: { x: 2, y: 1 }, to: { x: 1, y: 2 } }],
    ['p1', { type: 'move', from: { x: 0, y: 5 }, to: { x: 1, y: 4 } }],
    ['p2', { type: 'move', from: { x: 7, y: 2 }, to: { x: 6, y: 3 } }],
  ];
  for (const [pid, a] of seq) applyBoth(pair, pid, a);
  assert.equal(pair[0].turn, 'p1');
  assert.equal(pair[0].moveCount, 6);
  assert.deepEqual(E.counts(pair[0]), { R: 12, B: 12, RK: 0, BK: 0, Rtotal: 12, Btotal: 12 });
});

test('ăn quân + nhảy nhiều lần + phong Vua đồng bộ cả 2 bên', () => {
  const pair = mkPair();
  /* Đỏ (2,5) ăn Đen (3,4) → (4,3), ăn tiếp Đen (5,2) → (6,1) */
  for (const s of pair) {
    s.cells.fill(0);
    s.cells[5 * 8 + 2] = 1; s.cells[4 * 8 + 3] = -1; s.cells[2 * 8 + 5] = -1; s.cells[0 * 8 + 1] = -1; /* thêm Đen ở xa để khỏi thắng ngay vì ăn hết quân */
  }
  let r = applyBoth(pair, 'p1', { type: 'move', from: { x: 2, y: 5 }, to: { x: 4, y: 3 } });
  assert.ok(r.continued === true);
  assert.deepEqual(pair[0].midJump, { x: 4, y: 3 });
  assert.equal(pair[0].turn, 'p1');
  r = applyBoth(pair, 'p1', { type: 'move', from: { x: 4, y: 3 }, to: { x: 6, y: 1 } });
  assert.ok(!r.continued);
  assert.equal(pair[0].cells[1 * 8 + 6], 1);
  assert.deepEqual(pair[0].captured.p1, [{ king: false }, { king: false }]);
  /* phong Vua đồng bộ: Đỏ (1,2) ăn Đen (2,1) lên (3,0) = hàng cuối */
  const pair2 = mkPair();
  for (const s of pair2) {
    s.cells.fill(0);
    s.cells[2 * 8 + 1] = 1; s.cells[1 * 8 + 2] = -1; s.cells[7 * 8 + 0] = -1;
  }
  r = applyBoth(pair2, 'p1', { type: 'move', from: { x: 1, y: 2 }, to: { x: 3, y: 0 } });
  assert.ok(r.crowned === true);
  assert.equal(pair2[0].cells[0 * 8 + 3], 2);
  assert.equal(pair2[0].turn, 'p2');
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

test('ăn hết quân thắng: 2 bên cùng thấy người thắng + lý do', () => {
  const pair = mkPair();
  for (const s of pair) {
    s.cells.fill(0);
    s.cells[4 * 8 + 3] = 1; /* Đỏ */
    s.cells[3 * 8 + 4] = -1; /* Đen cuối cùng */
  }
  const r = applyBoth(pair, 'p1', { type: 'move', from: { x: 3, y: 4 }, to: { x: 5, y: 2 } });
  assert.ok(r.ended);
  assert.equal(pair[0].winner, 'p1');
  assert.equal(pair[0].endReason, 'capture');
  applyBothExpectFail(pair, 'p2', { type: 'move', from: { x: 0, y: 0 }, to: { x: 1, y: 1 } }); /* ván đã kết thúc */
});

test('đề nghị hòa online: 2 bên cùng thấy đề nghị, đồng ý và từ chối', () => {
  const pair = mkPair();
  applyBoth(pair, 'p1', { type: 'move', from: { x: 0, y: 5 }, to: { x: 1, y: 4 } });
  let r = applyBoth(pair, 'p1', { type: 'draw' });
  assert.ok(r.offered);
  assert.equal(pair[0].drawOffer, 'p1');
  r = applyBoth(pair, 'p2', { type: 'draw-decline' });
  assert.ok(r.declined);
  assert.equal(pair[0].drawOffer, null);
  assert.equal(pair[0].phase, 'playing');
  applyBoth(pair, 'p2', { type: 'move', from: { x: 1, y: 2 }, to: { x: 0, y: 3 } });
  applyBoth(pair, 'p1', { type: 'draw' });
  r = applyBoth(pair, 'p2', { type: 'draw' });
  assert.ok(r.agreed && r.ended);
  assert.equal(pair[0].draw, true);
  assert.equal(pair[0].endReason, 'draw-agree');
  applyBothExpectFail(pair, 'p1', { type: 'move', from: { x: 1, y: 4 }, to: { x: 0, y: 3 } }); /* ván đã kết thúc */
});

test('xin thua online: 2 bên cùng thấy người thắng + lý do', () => {
  const pair = mkPair();
  applyBoth(pair, 'p1', { type: 'move', from: { x: 0, y: 5 }, to: { x: 1, y: 4 } });
  applyBoth(pair, 'p2', { type: 'move', from: { x: 1, y: 2 }, to: { x: 0, y: 3 } });
  const r = applyBoth(pair, 'p1', { type: 'resign' });
  assert.ok(r.ended);
  assert.equal(pair[0].winner, 'p2');
  assert.equal(pair[0].endReason, 'resign');
  applyBothExpectFail(pair, 'p2', { type: 'move', from: { x: 0, y: 3 }, to: { x: 1, y: 4 } }); /* ván đã kết thúc */
});

test('action JSON đi-về không đổi; action lạ bị từ chối ở cả 2 bên', () => {
  const a = { type: 'move', from: { x: 0, y: 5 }, to: { x: 1, y: 4 } };
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  const pair = mkPair();
  const bad = [
    { type: 'fire', from: { x: 0, y: 5 }, to: { x: 1, y: 4 } },
    { type: 'move', from: { x: 0, y: 5 }, to: { x: 9, y: 9 } },
    { type: 'move', from: { x: 0, y: 5 }, to: { x: 0, y: 5 } },
    null, { from: { x: 0, y: 5 } }, { type: 'move' },
  ];
  for (const b of bad) applyBothExpectFail(pair, 'p1', b);
  /* nước đi sai lượt cũng bị từ chối đồng đều */
  applyBothExpectFail(pair, 'p2', { type: 'move', from: { x: 1, y: 2 }, to: { x: 0, y: 3 } });
  assert.deepEqual(E.serialize(pair[0]), E.serialize(pair[1]));
});

test('viewFor 2 bên: cùng cells/lượt/winner, khác mySide', () => {
  const pair = mkPair();
  applyBoth(pair, 'p1', { type: 'move', from: { x: 0, y: 5 }, to: { x: 1, y: 4 } });
  applyBoth(pair, 'p2', { type: 'move', from: { x: 1, y: 2 }, to: { x: 0, y: 3 } });
  const v1 = E.viewFor(pair[0], 'p1'), v2 = E.viewFor(pair[1], 'p2');
  assert.deepEqual(v1.cells, v2.cells);
  assert.equal(v1.turn, v2.turn);
  assert.equal(v1.mySide, 'R');
  assert.equal(v2.mySide, 'B');
  assert.deepEqual(v1.captured, v2.captured);
});

console.log(`\n${pass} test đạt.`);
