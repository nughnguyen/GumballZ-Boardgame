// Test luật Cờ Caro. Chạy: node caro/test/rules.mjs
// LƯU Ý: Caro KHÔNG phải TicTacToe — bàn 30×30, thắng 5 quân liên tiếp trở lên.
// Các test dưới đây kiểm đúng luật 5 quân: 3 hay 4 quân CHƯA thắng, 5 thắng,
// 6 quân cũng thắng.
import assert from 'assert/strict';
import * as E from '../js/engine.js';

const P1 = { id: 'p1', name: 'Bạn' }, P2 = { id: 'p2', name: 'Máy', isBot: true };
const fresh = (opts) => E.createGame([P1, P2], opts);
const set = (s, x, y, m) => { s.cells[y * s.size + x] = m; };
const mv = (s, pid, x, y) => E.applyMove(s, pid, { x, y });
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

test('khởi tạo: bàn 30×30 trống 900 ô, X (p1) đi trước', () => {
  const s = fresh();
  assert.equal(s.size, 30);
  assert.equal(s.cells.length, 900);
  assert.ok(s.cells.every(c => c === 0));
  assert.equal(s.phase, 'playing');
  assert.equal(s.turn, 'p1');
  assert.deepEqual(s.players.map(p => p.mark), ['X', 'O']);
  assert.equal(E.emptyCount(s), 900);
});

test('thắng ngang: 5 quân X liên tiếp ở hàng 3', () => {
  const s = fresh();
  set(s, 2, 3, 1); set(s, 3, 3, 1); set(s, 4, 3, 1); set(s, 5, 3, 1);
  set(s, 10, 10, 2); /* quân O lạc lõng, không ảnh hưởng */
  const r = mv(s, 'p1', 6, 3);
  assert.ok(r.ok && r.ended && r.win);
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'p1');
  assert.equal(s.winLine.length, 5);
  assert.deepEqual(s.winLine.map(i => [i % 30, Math.floor(i / 30)]), [[2, 3], [3, 3], [4, 3], [5, 3], [6, 3]]);
});

test('thắng dọc: 5 quân O liên tiếp ở cột 7', () => {
  const s = fresh();
  set(s, 7, 1, 2); set(s, 7, 2, 2); set(s, 7, 3, 2); set(s, 7, 4, 2);
  set(s, 0, 0, 1);
  s.turn = 'p2';
  const r = mv(s, 'p2', 7, 5);
  assert.ok(r.ok && r.win);
  assert.equal(s.winner, 'p2');
  assert.equal(s.winLine.length, 5);
});

test('thắng chéo \\: 5 quân X từ (1,1) tới (5,5)', () => {
  const s = fresh();
  for (let k = 0; k < 4; k++) set(s, 1 + k, 1 + k, 1);
  const r = mv(s, 'p1', 5, 5);
  assert.ok(r.ok && r.win);
  assert.equal(s.winLine.length, 5);
});

test('thắng chéo /: 5 quân O từ (8,2) tới (4,6)', () => {
  const s = fresh();
  for (let k = 0; k < 4; k++) set(s, 8 - k, 2 + k, 2);
  s.turn = 'p2';
  const r = mv(s, 'p2', 4, 6);
  assert.ok(r.ok && r.win);
  assert.equal(s.winLine.length, 5);
});

test('6 quân cũng thắng (không phải luật "6 thì không tính")', () => {
  const s = fresh();
  for (let k = 0; k < 5; k++) set(s, 10 + k, 20, 1);
  const r = mv(s, 'p1', 15, 20);
  assert.ok(r.ok && r.win);
  assert.equal(s.winLine.length, 6);
  assert.equal(s.winner, 'p1');
});

test('4 quân CHƯA thắng — kể cả 4 quân mở 2 đầu (khác TicTacToe: 3 đã thắng)', () => {
  const s = fresh();
  for (let k = 0; k < 3; k++) set(s, 5 + k, 5, 1);
  const r = mv(s, 'p1', 8, 5); /* thành 4 quân mở 2 đầu */
  assert.ok(r.ok && !r.ended);
  assert.equal(s.phase, 'playing');
  assert.equal(s.winner, null);
  assert.equal(s.turn, 'p2'); /* lượt đổi bình thường */
});

test('3 quân chưa thắng (điểm khác TicTacToe rõ nhất)', () => {
  const s = fresh();
  set(s, 0, 0, 1); set(s, 1, 0, 1);
  const r = mv(s, 'p1', 2, 0);
  assert.ok(r.ok && !r.ended);
  assert.equal(s.phase, 'playing');
});

test('5 quân thắng ngay cả khi 2 đầu đều bị chặn', () => {
  const s = fresh();
  set(s, 4, 9, 2); set(s, 10, 9, 2); /* O chặn 2 đầu */
  for (let k = 0; k < 4; k++) set(s, 5 + k, 9, 1);
  const r = mv(s, 'p1', 9, 9);
  assert.ok(r.ok && r.win);
  assert.equal(s.winner, 'p1');
});

test('5 quân thắng ở mép bàn (sát biên, chỉ 1 đầu)', () => {
  const s = fresh();
  for (let k = 0; k < 4; k++) set(s, k, 29, 1);
  const r = mv(s, 'p1', 4, 29);
  assert.ok(r.ok && r.win);
});

test('nước đi không hợp lệ: ô đã có quân, ngoài bàn, sai lượt, ván đã kết thúc', () => {
  const s = fresh();
  assert.ok(mv(s, 'p1', 15, 15).ok);
  assert.equal(mv(s, 'p2', 15, 15).ok, false); /* ô đã có quân */
  assert.equal(mv(s, 'p2', 30, 0).ok, false); /* ngoài bàn (x=30) */
  assert.equal(mv(s, 'p2', -1, 0).ok, false); /* ngoài bàn (x=-1) */
  assert.equal(mv(s, 'p2', 0, 30).ok, false); /* ngoài bàn (y=30) */
  assert.equal(mv(s, 'p1', 0, 0).ok, false); /* sai lượt (đang lượt p2) */
  assert.equal(mv(s, 'p2', 0.5, 0).ok, false); /* tọa độ không nguyên */
  assert.ok(mv(s, 'p2', 0, 0).ok);
  /* ván đã kết thúc thì không đi được nữa */
  const s2 = fresh();
  for (let k = 0; k < 4; k++) set(s2, k, 0, 1);
  assert.ok(mv(s2, 'p1', 4, 0).win);
  assert.equal(mv(s2, 'p2', 9, 9).ok, false);
});

/* mẫu bàn 5×5 đầy mà không ai đủ 5 quân (13 X, 12 O):
   O O O X X / X X O O X / X O X X X / O X O X O / O X X O O */
const DRAW5 = [2, 2, 2, 1, 1, 1, 1, 2, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 2, 2, 1, 1, 2, 2];
test('hòa khi bàn đầy 5×5 (bàn nhỏ cho test): đi đủ 25 nước theo mẫu, không ai thắng', () => {
  const s = fresh({ size: 5 });
  const xs = [], os = [];
  DRAW5.forEach((m, i) => (m === 1 ? xs : os).push(i));
  assert.equal(xs.length, 13); assert.equal(os.length, 12);
  const order = [];
  for (let i = 0; i < 12; i++) { order.push(xs[i]); order.push(os[i]); }
  order.push(xs[12]); /* nước cuối là X */
  for (let n = 0; n < order.length; n++) {
    const i = order[n], pid = n % 2 === 0 ? 'p1' : 'p2';
    const r = mv(s, pid, i % 5, Math.floor(i / 5));
    assert.ok(r.ok, `nước ${n + 1} phải hợp lệ`);
    if (n < order.length - 1) assert.ok(!r.ended, `chưa hòa trước nước cuối (nước ${n + 1})`);
  }
  assert.equal(s.phase, 'ended');
  assert.equal(s.draw, true);
  assert.equal(s.winner, null);
  assert.equal(s.endReason, 'full');
  assert.equal(E.emptyCount(s), 0);
});

test('size ngoài khoảng thì về mặc định 30; size 10 dùng được', () => {
  assert.equal(fresh({ size: 3 }).size, 30);
  assert.equal(fresh({ size: 99 }).size, 30);
  assert.equal(fresh({ size: 10 }).size, 10);
  assert.equal(fresh({ size: 10 }).cells.length, 100);
});

test('serialize/deserialize: JSON đi-về giữ nguyên trạng thái', () => {
  const s = fresh();
  mv(s, 'p1', 15, 15); mv(s, 'p2', 14, 15); mv(s, 'p1', 16, 15);
  const json = E.serialize(s);
  assert.equal(typeof json, 'string');
  const back = E.deserialize(json);
  assert.deepEqual(back, s);
  assert.throws(() => E.deserialize('{"size":5,"cells":[1,2],"players":[]}'));
  assert.throws(() => E.deserialize('không phải json'));
});

test('legalMoves: chỉ ô trống, chỉ khi tới lượt', () => {
  const s = fresh({ size: 5 });
  assert.equal(E.legalMoves(s, 'p1').length, 25);
  assert.equal(E.legalMoves(s, 'p2').length, 0);
  mv(s, 'p1', 2, 2);
  assert.equal(E.legalMoves(s, 'p2').length, 24);
  assert.ok(!E.legalMoves(s, 'p2').some(m => m.x === 2 && m.y === 2));
});

test('cloneState tách biệt; counts đếm đúng số quân mỗi bên', () => {
  const s = fresh();
  mv(s, 'p1', 1, 1); mv(s, 'p2', 2, 2); mv(s, 'p1', 3, 3);
  const c = E.cloneState(s);
  c.cells[0] = 2;
  assert.equal(s.cells[0], 0);
  assert.deepEqual(E.counts(s), { X: 2, O: 1 });
});

test('viewFor: chỉ lộ thông tin công khai, có myMark + winLine khi thắng', () => {
  const s = fresh();
  for (let k = 0; k < 4; k++) set(s, k, 0, 1);
  mv(s, 'p1', 4, 0);
  const v = E.viewFor(s, 'p1');
  assert.equal(v.myMark, 'X');
  assert.equal(v.phase, 'ended');
  assert.equal(v.winner, 'p1');
  assert.equal(v.winLine.length, 5);
  assert.equal(E.viewFor(s, 'p2').myMark, 'O');
});

console.log(`\n${pass} test đạt.`);
