// Test luật Rắn và Thang. Chạy: node ranvathang/test/rules.mjs
// Kiểm đúng luật: di chuyển, leo thang, trượt rắn, về đúng ô 100 mới thắng,
// tung quá thì đứng yên, tung 6 được tung tiếp, xoay lượt 2/3/4 người,
// xin thua, xúc xắc lạ bị từ chối.
import assert from 'assert/strict';
import * as E from '../js/engine.js';

const P1 = { id: 'p1', name: 'Bạn' }, P2 = { id: 'p2', name: 'Máy', isBot: true };
const P3 = { id: 'p3', name: 'Bơ', local: true }, P4 = { id: 'p4', name: 'Xôi', local: true };
const fresh = (ps = [P1, P2], opts) => E.createGame(ps, opts);
const roll = (s, pid, v) => E.applyRoll(s, pid, v);
const act = (s, pid, a) => E.applyAction(s, pid, a);
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

test('bàn thang/rắn hợp lệ: không trùng nhau, thang đi lên, rắn đi xuống', () => {
  assert.deepEqual(E.validateLayout(), []);
  assert.equal(Object.keys(E.LADDERS).length, 10);
  assert.equal(Object.keys(E.SNAKES).length, 10);
  assert.equal(E.LADDERS[2], 38);
  assert.equal(E.LADDERS[80], 100);
  assert.equal(E.SNAKES[16], 6);
  assert.equal(E.SNAKES[87], 24);
});

test('đánh số kiểu rắn bò: ô 1 góc dưới-trái, ô 100 góc trên-trái', () => {
  assert.deepEqual(E.cellXY(1), { x: 0, y: 9 });
  assert.deepEqual(E.cellXY(10), { x: 9, y: 9 });
  assert.deepEqual(E.cellXY(11), { x: 9, y: 8 });
  assert.deepEqual(E.cellXY(20), { x: 0, y: 8 });
  assert.deepEqual(E.cellXY(21), { x: 0, y: 7 });
  assert.deepEqual(E.cellXY(91), { x: 9, y: 0 });
  assert.deepEqual(E.cellXY(100), { x: 0, y: 0 });
  assert.deepEqual(E.cellXY(55), { x: 5, y: 4 }); /* hàng 5 (ô 51–60) chạy phải→trái: ô 55 ở cột 5 */
});

test('khởi tạo: 2–4 người, đều ở ô xuất phát, p1 đi trước, màu theo ghế', () => {
  const s = fresh();
  assert.equal(s.phase, 'playing');
  assert.equal(s.turn, 'p1');
  assert.deepEqual(s.pos, { p1: 0, p2: 0 });
  assert.deepEqual(s.players.map(p => p.color), [0, 1]);
  assert.equal(E.COLORS[0].name, 'Đỏ');
  assert.equal(E.COLORS[3].name, 'Vàng');
  const s4 = fresh([P1, P2, P3, P4]);
  assert.deepEqual(s4.players.map(p => p.color), [0, 1, 2, 3]);
  assert.throws(() => E.createGame([P1]), /2–4 người/);
  assert.throws(() => E.createGame([P1, P2, P3, P4, { id: 'p5', name: 'Thừa' }]), /2–4 người/);
  assert.throws(() => E.createGame([P1, P2, P3], { online: true }), /chỉ đúng 2 người/);
  assert.ok(E.createGame([P1, P2], { online: true }));
});

test('di chuyển thường: tung 3 từ xuất phát thì tới ô 3, lượt sang p2', () => {
  const s = fresh();
  const r = roll(s, 'p1', 3);
  assert.ok(r.ok && !r.ended && !r.extra);
  assert.equal(s.pos.p1, 3);
  assert.equal(s.turn, 'p2');
  assert.equal(s.turnNo, 2);
  assert.equal(s.moveCount, 1);
  assert.deepEqual(s.lastRoll, { by: 'p1', value: 3, n: 1 });
  assert.equal(s.lastMove.from, 0);
  assert.equal(s.lastMove.landed, 3);
  assert.equal(s.lastMove.to, 3);
});

test('leo thang: tung 2 từ xuất phát thì lên ô 38 (thang 2→38)', () => {
  const s = fresh();
  const r = roll(s, 'p1', 2);
  assert.ok(r.ok && r.ladder);
  assert.equal(s.pos.p1, 38);
  assert.equal(s.lastMove.landed, 2);
  assert.equal(s.lastMove.to, 38);
  assert.equal(s.lastMove.ladder, true);
  /* thang dài 28→84 */
  const s2 = fresh();
  s2.pos.p1 = 25;
  const r2 = roll(s2, 'p1', 3);
  assert.ok(r2.ok && r2.ladder);
  assert.equal(s2.pos.p1, 84);
});

test('trượt rắn: từ ô 13 tung 3 tới ô 16 thì trượt xuống ô 6', () => {
  const s = fresh();
  s.pos.p1 = 13;
  const r = roll(s, 'p1', 3);
  assert.ok(r.ok && r.snake && !r.ladder);
  assert.equal(s.pos.p1, 6);
  assert.equal(s.lastMove.landed, 16);
  assert.equal(s.lastMove.to, 6);
  assert.equal(s.lastMove.snake, true);
});

test('đáp xuống đuôi rắn không leo tiếp: từ ô 46 tung 1 tới ô 47, trượt về ô 26 rồi dừng', () => {
  const s = fresh();
  s.pos.p1 = 46;
  const r = roll(s, 'p1', 1);
  assert.ok(r.ok && r.snake);
  assert.equal(s.pos.p1, 26); /* 26 là đầu thang 15→26 nhưng đáp xuống đầu thang không leo */
  assert.equal(s.lastMove.to, 26);
});

test('về đúng ô 100 mới thắng: 97 tung 3 thì thắng, 97 tung 4 thì đứng yên', () => {
  const s = fresh();
  s.pos.p1 = 97;
  const r = roll(s, 'p1', 3);
  assert.ok(r.ok && r.ended);
  assert.equal(s.pos.p1, 100);
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'p1');
  assert.equal(s.endReason, 'win');
  assert.equal(roll(s, 'p2', 2).ok, false); /* ván đã kết thúc */
  const s2 = fresh();
  s2.pos.p1 = 97;
  const r2 = roll(s2, 'p1', 4);
  assert.ok(r2.ok && !r2.ended && r2.overshoot);
  assert.equal(s2.pos.p1, 97); /* tung quá thì đứng yên */
  assert.equal(s2.phase, 'playing');
  assert.equal(s2.turn, 'p2'); /* lượt vẫn đổi */
  /* tung đúng 1 từ 99 thì thắng */
  const s3 = fresh();
  s3.pos.p1 = 99;
  assert.ok(roll(s3, 'p1', 1).ended);
  assert.equal(s3.winner, 'p1');
});

test('thang 80→100 đưa thẳng về đích: từ 79 tung 1 thì thắng', () => {
  const s = fresh();
  s.pos.p1 = 79;
  const r = roll(s, 'p1', 1);
  assert.ok(r.ok && r.ladder && r.ended);
  assert.equal(s.pos.p1, 100);
  assert.equal(s.winner, 'p1');
});

test('tung 6 được tung tiếp: lượt không đổi, tung xong nước thường thì lượt mới đổi', () => {
  const s = fresh();
  const r = roll(s, 'p1', 6);
  assert.ok(r.ok && r.extra);
  assert.equal(s.pos.p1, 6);
  assert.equal(s.turn, 'p1'); /* tung 6: vẫn lượt p1 */
  assert.equal(s.turnNo, 1);
  const r2 = roll(s, 'p1', 2); /* 6 → 8, thang 8→31 */
  assert.ok(r2.ok && r2.ladder && !r2.extra);
  assert.equal(s.pos.p1, 31);
  assert.equal(s.turn, 'p2');
  /* tung 6 mà thừa ô 100 vẫn được tung tiếp */
  const s2 = fresh();
  s2.pos.p1 = 97;
  const r3 = roll(s2, 'p1', 6);
  assert.ok(r3.ok && r3.overshoot && r3.extra);
  assert.equal(s2.pos.p1, 97);
  assert.equal(s2.turn, 'p1');
});

test('xoay lượt 3 người: p1 → p2 → p3 → p1', () => {
  const s = fresh([P1, P2, P3]);
  assert.equal(s.turn, 'p1');
  roll(s, 'p1', 1); assert.equal(s.turn, 'p2');
  roll(s, 'p2', 1); assert.equal(s.turn, 'p3');
  roll(s, 'p3', 1); assert.equal(s.turn, 'p1');
  assert.equal(s.turnNo, 4);
});

test('xoay lượt 4 người, tung 6 xen giữa không làm lệch lượt', () => {
  const s = fresh([P1, P2, P3, P4]);
  roll(s, 'p1', 6); assert.equal(s.turn, 'p1');
  roll(s, 'p1', 1); assert.equal(s.turn, 'p2');
  roll(s, 'p2', 6); assert.equal(s.turn, 'p2');
  roll(s, 'p2', 6); assert.equal(s.turn, 'p2');
  roll(s, 'p2', 1); assert.equal(s.turn, 'p3');
  roll(s, 'p3', 2); assert.equal(s.turn, 'p4');
  roll(s, 'p4', 2); assert.equal(s.turn, 'p1');
});

test('xúc xắc lạ bị từ chối: 0, 7, số lẻ, chữ, sai lượt', () => {
  const s = fresh();
  for (const v of [0, 7, -1, 2.5, '3', null, undefined]) {
    const before = E.serialize(s);
    assert.equal(act(s, 'p1', { type: 'roll', value: v }).ok, false);
    assert.equal(E.serialize(s), before); /* bàn không đổi */
  }
  assert.equal(act(s, 'p2', { type: 'roll', value: 3 }).ok, false); /* sai lượt */
  assert.equal(act(s, 'p9', { type: 'roll', value: 3 }).ok, false); /* người lạ */
  assert.ok(act(s, 'p1', { type: 'roll', value: 1 }).ok);
});

test('xin thua 2 người: người còn lại thắng ngay', () => {
  const s = fresh();
  roll(s, 'p1', 3); roll(s, 'p2', 4);
  const r = act(s, 'p1', { type: 'resign' });
  assert.ok(r.ok && r.ended);
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'p2');
  assert.equal(s.endReason, 'resign');
  assert.equal(act(s, 'p2', { type: 'resign' }).ok, false);
  assert.equal(act(s, 'p1', { type: 'roll', value: 3 }).ok, false);
});

test('xin thua 3 người: người xin thua rời ván, ván tiếp tục, lượt nhảy qua', () => {
  const s = fresh([P1, P2, P3]);
  roll(s, 'p1', 2); /* p1 leo thang lên 38 */
  const r = act(s, 'p2', { type: 'resign' }); /* p2 xin thua khi đang tới lượt p2 */
  assert.ok(r.ok && !r.ended);
  assert.deepEqual(s.out, ['p2']);
  assert.equal(s.phase, 'playing');
  assert.equal(s.turn, 'p3'); /* lượt nhảy qua p2 */
  assert.equal(s.winner, null);
  roll(s, 'p3', 1);
  assert.equal(s.turn, 'p1'); /* xoay lượt bỏ qua p2 đã rời ván */
  /* p3 xin thua nữa thì p1 thắng (người còn lại duy nhất) */
  const r2 = act(s, 'p3', { type: 'resign' });
  assert.ok(r2.ok && r2.ended);
  assert.equal(s.winner, 'p1');
  assert.equal(s.endReason, 'resign');
  /* xin thua 2 lần thì bị từ chối */
  const s2 = fresh([P1, P2, P3]);
  assert.ok(act(s2, 'p1', { type: 'resign' }).ok);
  assert.equal(act(s2, 'p1', { type: 'resign' }).ok, false);
});

test('serialize/deserialize: JSON đi-về giữ nguyên trạng thái', () => {
  const s = fresh([P1, P2, P3]);
  roll(s, 'p1', 2); roll(s, 'p2', 3); roll(s, 'p3', 6); roll(s, 'p3', 1);
  const json = E.serialize(s);
  assert.equal(typeof json, 'string');
  const back = E.deserialize(json);
  assert.deepEqual(back, s);
  assert.throws(() => E.deserialize('{"players":[],"pos":{}}'));
  assert.throws(() => E.deserialize('không phải json'));
});

test('cloneState tách biệt; viewFor có myColor/pos/out', () => {
  const s = fresh();
  roll(s, 'p1', 2);
  const c = E.cloneState(s);
  c.pos.p1 = 99;
  assert.equal(s.pos.p1, 38);
  const v = E.viewFor(s, 'p2');
  assert.equal(v.myColor, 1);
  assert.equal(E.viewFor(s, 'p1').myColor, 0);
  assert.deepEqual(v.pos, { p1: 38, p2: 0 });
  assert.deepEqual(v.out, []);
  assert.equal(v.turn, 'p2');
  assert.equal(v.lastRoll.value, 2);
});

test('applyAction lạ đều bị từ chối', () => {
  const s = fresh();
  for (const a of [{ type: 'fire', value: 3 }, { type: 'move', x: 1 }, null, { value: 3 }, { type: 'finish' }]) {
    assert.equal(act(s, 'p1', a).ok, false);
  }
  assert.equal(E.actors(s).length, 1);
  assert.equal(E.actors(s)[0], 'p1');
  act(s, 'p1', { type: 'resign' });
  assert.deepEqual(E.actors(s), []);
});

console.log(`\n${pass} test đạt.`);
