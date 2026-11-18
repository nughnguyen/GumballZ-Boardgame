// Test luật TicTacToe. Chạy: node tictactoe/test/rules.mjs
// LƯU Ý: TicTacToe KHÁC Caro — bàn 3×3, thắng 3 quân liên tiếp (8 đường thắng).
// Caro bàn 30×30 thắng 5 quân — không dùng chung luật.
import assert from 'assert/strict';
import * as E from '../js/engine.js';

const P1 = { id: 'p1', name: 'Bạn' }, P2 = { id: 'p2', name: 'Máy', isBot: true };
const fresh = () => E.createGame([P1, P2]);
const set = (s, x, y, m) => { s.cells[y * 3 + x] = m; };
const mv = (s, pid, x, y) => E.applyMove(s, pid, { x, y });
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

test('khởi tạo: bàn 3×3 trống 9 ô, X (p1) đi trước', () => {
  const s = fresh();
  assert.equal(s.size, 3);
  assert.equal(s.cells.length, 9);
  assert.ok(s.cells.every(c => c === 0));
  assert.equal(s.phase, 'playing');
  assert.equal(s.turn, 'p1');
  assert.deepEqual(s.players.map(p => p.mark), ['X', 'O']);
  assert.equal(E.emptyCount(s), 9);
  assert.equal(E.WIN_LINES.length, 8);
});

/* thắng đủ 8 đường cho X: 3 ngang, 3 dọc, 2 chéo */
for (const [li, line] of E.WIN_LINES.entries()) {
  test(`thắng X đường ${li + 1}/8: ô ${line.join(', ')}`, () => {
    const s = fresh();
    const [a, b, c] = line;
    set(s, a % 3, Math.floor(a / 3), 1);
    set(s, b % 3, Math.floor(b / 3), 1);
    const r = mv(s, 'p1', c % 3, Math.floor(c / 3));
    assert.ok(r.ok && r.ended && r.win);
    assert.equal(s.phase, 'ended');
    assert.equal(s.winner, 'p1');
    assert.equal(s.winLine.length, 3);
    assert.deepEqual([...s.winLine].sort((x, y) => x - y), [...line].sort((x, y) => x - y));
  });
}

/* thắng cho O trên 3 đường đại diện: 1 ngang, 1 dọc, 1 chéo */
for (const [li, line] of [[0, [0, 1, 2]], [3, [0, 3, 6]], [6, [0, 4, 8]]]) {
  test(`thắng O đường ${li + 1}/8: ô ${line.join(', ')}`, () => {
    const s = fresh();
    const [a, b, c] = line;
    set(s, a % 3, Math.floor(a / 3), 2);
    set(s, b % 3, Math.floor(b / 3), 2);
    s.turn = 'p2';
    const r = mv(s, 'p2', c % 3, Math.floor(c / 3));
    assert.ok(r.ok && r.win);
    assert.equal(s.winner, 'p2');
    assert.equal(s.winLine.length, 3);
  });
}

test('2 quân CHƯA thắng — kể cả 2 quân mở 2 đầu (điểm khác Caro: 3 mới thắng)', () => {
  const s = fresh();
  set(s, 0, 0, 1);
  const r = mv(s, 'p1', 1, 0); /* thành 2 quân hàng trên */
  assert.ok(r.ok && !r.ended);
  assert.equal(s.phase, 'playing');
  assert.equal(s.winner, null);
  assert.equal(s.turn, 'p2'); /* lượt đổi bình thường */
});

/* ván hòa mẫu 9 nước, không ai thắng:
   X O X / X O O / O X X — kiểm tra không đường nào đủ 3 quân giống nhau */
test('hòa khi bàn đầy 9 ô: đi đủ 9 nước theo mẫu, không ai thắng', () => {
  const s = fresh();
  const seq = [
    ['p1', 0, 0], ['p2', 1, 0], ['p1', 2, 0],
    ['p2', 1, 1], ['p1', 0, 1], ['p2', 2, 1],
    ['p1', 1, 2], ['p2', 0, 2], ['p1', 2, 2],
  ];
  for (let n = 0; n < seq.length; n++) {
    const [pid, x, y] = seq[n];
    const r = mv(s, pid, x, y);
    assert.ok(r.ok, `nước ${n + 1} phải hợp lệ`);
    if (n < seq.length - 1) assert.ok(!r.ended, `chưa hòa trước nước cuối (nước ${n + 1})`);
  }
  assert.equal(s.phase, 'ended');
  assert.equal(s.draw, true);
  assert.equal(s.winner, null);
  assert.equal(s.endReason, 'full');
  assert.equal(E.emptyCount(s), 0);
  assert.deepEqual(s.cells, [1, 2, 1, 1, 2, 2, 2, 1, 1]);
});

test('nước đi không hợp lệ: ô đã có quân, ngoài bàn, sai lượt, ván đã kết thúc', () => {
  const s = fresh();
  assert.ok(mv(s, 'p1', 1, 1).ok);
  assert.equal(mv(s, 'p2', 1, 1).ok, false); /* ô đã có quân */
  assert.equal(mv(s, 'p2', 3, 0).ok, false); /* ngoài bàn (x=3) */
  assert.equal(mv(s, 'p2', -1, 0).ok, false); /* ngoài bàn (x=-1) */
  assert.equal(mv(s, 'p2', 0, 3).ok, false); /* ngoài bàn (y=3) */
  assert.equal(mv(s, 'p1', 0, 0).ok, false); /* sai lượt (đang lượt p2) */
  assert.equal(mv(s, 'p2', 0.5, 0).ok, false); /* tọa độ không nguyên */
  assert.ok(mv(s, 'p2', 0, 0).ok);
  /* ván đã kết thúc thì không đi được nữa */
  const s2 = fresh();
  set(s2, 0, 0, 1); set(s2, 1, 0, 1);
  assert.ok(mv(s2, 'p1', 2, 0).win);
  assert.equal(mv(s2, 'p2', 2, 2).ok, false);
});

test('serialize/deserialize: JSON đi-về giữ nguyên trạng thái', () => {
  const s = fresh();
  mv(s, 'p1', 1, 1); mv(s, 'p2', 0, 0); mv(s, 'p1', 2, 2);
  const json = E.serialize(s);
  assert.equal(typeof json, 'string');
  const back = E.deserialize(json);
  assert.deepEqual(back, s);
  assert.throws(() => E.deserialize('{"size":3,"cells":[1,2],"players":[]}'));
  assert.throws(() => E.deserialize('không phải json'));
});

test('legalMoves: chỉ ô trống, chỉ khi tới lượt', () => {
  const s = fresh();
  assert.equal(E.legalMoves(s, 'p1').length, 9);
  assert.equal(E.legalMoves(s, 'p2').length, 0);
  mv(s, 'p1', 1, 1);
  assert.equal(E.legalMoves(s, 'p2').length, 8);
  assert.ok(!E.legalMoves(s, 'p2').some(m => m.x === 1 && m.y === 1));
});

test('cloneState tách biệt; counts đếm đúng số quân mỗi bên', () => {
  const s = fresh();
  mv(s, 'p1', 0, 0); mv(s, 'p2', 1, 1); mv(s, 'p1', 2, 2);
  const c = E.cloneState(s);
  c.cells[3] = 2;
  assert.equal(s.cells[3], 0);
  assert.deepEqual(E.counts(s), { X: 2, O: 1 });
});

test('viewFor: chỉ lộ thông tin công khai, có myMark + winLine khi thắng', () => {
  const s = fresh();
  set(s, 0, 0, 1); set(s, 1, 0, 1);
  mv(s, 'p1', 2, 0);
  const v = E.viewFor(s, 'p1');
  assert.equal(v.myMark, 'X');
  assert.equal(v.phase, 'ended');
  assert.equal(v.winner, 'p1');
  assert.equal(v.winLine.length, 3);
  assert.equal(E.viewFor(s, 'p2').myMark, 'O');
});

console.log(`\n${pass} test đạt.`);
