// Test luật Sudoku. Chạy: node sudoku/test/rules.mjs
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';

const P = (id, name) => ({ id, name });
const P1 = [P('p1', 'Một')];
const P2 = [P('p1', 'Một'), P('p2', 'Hai')];
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

/* 1 ván cố định: 1 người, độ Vừa, seed 12345 */
function fixedGame(players = P1, opts = {}) {
  return E.createGame(players, { difficulty: 'medium', seed: 12345, ...opts });
}
const wrongCell = s => { for (let i = 0; i < 81; i++) if (!s.givens[i]) return i; return -1; };
const wrongValue = (s, i) => (s.solution[i] % 9) + 1; /* khác đáp án chắc chắn */

test('sinh câu đố: 4 độ khó, số givens đúng khoảng, nghiệm duy nhất, đối xứng', () => {
  for (const [diff, target] of [['easy', 44], ['medium', 34], ['hard', 28], ['expert', 24]]) {
    for (const seed of [1, 7, 42, 12345, 999999]) {
      const { solution, givens, givensCount } = E.generatePuzzle(diff, seed);
      assert.ok(givensCount >= target && givensCount <= target + 10, `${diff} seed ${seed}: givens=${givensCount}, mục tiêu ${target}`);
      assert.equal(E.countSolutions(givens, 2), 1, `${diff} seed ${seed}: phải duy nhất nghiệm`);
      const solved = E.solvePuzzle(givens);
      assert.deepEqual(solved, solution, `${diff} seed ${seed}: giải lại phải ra đúng đáp án`);
      for (let i = 0; i < 40; i++) assert.equal(!!givens[i], !!givens[80 - i], `${diff} seed ${seed}: cặp đối xứng ${i}/${80 - i}`);
      for (let i = 0; i < 81; i++) if (givens[i]) assert.equal(givens[i], solution[i], 'số cho sẵn phải đúng đáp án');
    }
  }
});
test('cùng seed → cùng câu đố (xác định, khóa bước online)', () => {
  const a = E.generatePuzzle('hard', 777);
  const b = E.generatePuzzle('hard', 777);
  assert.deepEqual(a, b);
  const s1 = E.createGame(P1, { difficulty: 'expert', seed: 5 });
  const s2 = E.createGame(P1, { difficulty: 'expert', seed: 5 });
  assert.deepEqual(s1.givens, s2.givens);
  assert.deepEqual(s1.solution, s2.solution);
});
test('điền đúng: ghi vào lưới, không lỗi, xoá ghi chú của ô đó + số đó ở ô liên quan', () => {
  const s = fixedGame();
  const i = wrongCell(s);
  E.applyNote(s, 'p1', i, s.solution[i]);
  assert.ok(s.prog.p1.notes[i].includes(s.solution[i]));
  const r = E.applyPlace(s, 'p1', i, s.solution[i]);
  assert.ok(r.ok && r.correct);
  assert.equal(s.prog.p1.grid[i], s.solution[i]);
  assert.equal(s.prog.p1.mistakes, 0);
  assert.equal(s.prog.p1.notes[i], undefined);
});
test('điền sai: không ghi vào lưới, +1 lỗi, lastWrong ghi lại', () => {
  const s = fixedGame();
  const i = wrongCell(s);
  const r = E.applyPlace(s, 'p1', i, wrongValue(s, i));
  assert.ok(r.ok && !r.correct);
  assert.equal(s.prog.p1.grid[i], 0);
  assert.equal(s.prog.p1.mistakes, 1);
  assert.deepEqual(s.lastWrong, { by: 'p1', cell: i, value: wrongValue(s, i), n: 1 });
  assert.equal(s.phase, 'playing');
});
test('sai 3 lần: bị loại; chơi đơn thì ván kết thúc, không ai thắng', () => {
  const s = fixedGame();
  const i = wrongCell(s);
  for (let k = 0; k < 3; k++) E.applyPlace(s, 'p1', i, wrongValue(s, i));
  assert.equal(s.prog.p1.mistakes, 3);
  assert.ok(s.prog.p1.failed);
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, null);
  assert.equal(s.endReason, 'allfail');
  assert.deepEqual(s.losers, ['p1']);
  assert.equal(E.applyPlace(s, 'p1', wrongCell(s), 1).ok, false);
});
test('sai 3 lần trong đua: chỉ người đó bị loại, người còn lại đua tiếp', () => {
  const s = fixedGame(P2);
  const i = wrongCell(s);
  for (let k = 0; k < 3; k++) E.applyPlace(s, 'p1', i, wrongValue(s, i));
  assert.ok(s.prog.p1.failed);
  assert.equal(s.phase, 'playing');
  assert.deepEqual(E.actors(s), ['p2']);
});
test('ô cho sẵn không đổi/xoá được; ô đã điền không điền đè', () => {
  const s = fixedGame();
  const g = s.givens.findIndex(v => v);
  assert.equal(E.applyPlace(s, 'p1', g, 1).ok, false);
  assert.equal(E.applyErase(s, 'p1', g).ok, false);
  const i = wrongCell(s);
  E.applyPlace(s, 'p1', i, s.solution[i]);
  assert.equal(E.applyPlace(s, 'p1', i, s.solution[i]).ok, false);
  assert.equal(E.applyNote(s, 'p1', i, 1).ok, false);
});
test('xoá: xoá được số mình điền, ô trống thì không xoá được', () => {
  const s = fixedGame();
  const i = wrongCell(s);
  assert.equal(E.applyErase(s, 'p1', i).ok, false);
  E.applyPlace(s, 'p1', i, s.solution[i]);
  assert.ok(E.applyErase(s, 'p1', i).ok);
  assert.equal(s.prog.p1.grid[i], 0);
});
test('ghi chú: bật/tắt, chỉ ở ô trống, sắp xếp tăng dần', () => {
  const s = fixedGame();
  const i = wrongCell(s);
  assert.ok(E.applyNote(s, 'p1', i, 5).ok);
  assert.ok(E.applyNote(s, 'p1', i, 3).ok);
  assert.deepEqual(s.prog.p1.notes[i], [3, 5]);
  E.applyNote(s, 'p1', i, 5);
  assert.deepEqual(s.prog.p1.notes[i], [3]);
  E.applyNote(s, 'p1', i, 3);
  assert.equal(s.prog.p1.notes[i], undefined);
  assert.equal(E.applyNote(s, 'p1', i, 0).ok, false);
  assert.equal(E.applyNote(s, 'p1', i, 10).ok, false);
});
test('gợi ý: mở đúng 1 ô, trừ lượt, hết 3 lần thì không gợi ý được nữa', () => {
  const s = fixedGame();
  for (let k = 0; k < 3; k++) {
    const r = E.applyHint(s, 'p1');
    assert.ok(r.ok, 'gợi ý lần ' + (k + 1) + ' phải ok');
    assert.equal(s.prog.p1.grid[r.cell], s.solution[r.cell]);
    assert.equal(s.prog.p1.hintsLeft, 3 - k - 1);
    assert.equal(s.prog.p1.hintsUsed, k + 1);
  }
  assert.equal(E.applyHint(s, 'p1').ok, false);
});
test('thắng: điền đủ 81 ô đúng → thắng, người còn lại thua', () => {
  const s = fixedGame(P2);
  for (let i = 0; i < 81; i++) {
    if (s.givens[i]) continue;
    const r = E.applyPlace(s, 'p1', i, s.solution[i]);
    assert.ok(r.ok && r.correct, 'điền ô ' + i + ' phải đúng');
  }
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'p1');
  assert.deepEqual(s.losers, ['p2']);
  assert.equal(s.endReason, 'win');
  assert.ok(s.prog.p1.finishedAt);
});
test('xin thua chơi đơn → ván kết thúc ngay; đua thì chỉ mình bị loại', () => {
  const s1 = fixedGame();
  assert.ok(E.applyResign(s1, 'p1').ok);
  assert.equal(s1.phase, 'ended');
  assert.equal(s1.endReason, 'resign');
  const s2 = fixedGame(P2);
  E.applyResign(s2, 'p1');
  assert.equal(s2.phase, 'playing');
  assert.ok(s2.prog.p1.failed);
  E.applyResign(s2, 'p2');
  assert.equal(s2.phase, 'ended');
  assert.equal(s2.endReason, 'allfail');
});
test('viewFor: không lộ đáp án, không lộ lưới/ghi chú của người khác', () => {
  const s = fixedGame(P2);
  const i = wrongCell(s);
  E.applyPlace(s, 'p1', i, s.solution[i]);
  E.applyNote(s, 'p1', wrongCell(s), 7);
  const v = E.viewFor(s, 'p2');
  assert.equal('solution' in v, false);
  assert.equal(JSON.stringify(v).includes('"solution"'), false);
  assert.equal(v.you.grid[i], 0, 'người khác không thấy lưới của p1');
  assert.equal(v.you.notes[i], undefined);
  assert.equal(v.players.find(p => p.id === 'p1').filled, s.givensCount + 1);
  assert.equal(v.givens.length, 81);
  assert.equal(v.me, 'p2');
});
test('serialize/deserialize: roundtrip giống hệt, dữ liệu hỏng thì ném lỗi', () => {
  const s = fixedGame(P2);
  E.applyPlace(s, 'p1', wrongCell(s), s.solution[wrongCell(s)]);
  const back = E.deserialize(E.serialize(s));
  assert.deepEqual(back, s);
  assert.throws(() => E.deserialize('{"players":[]}'));
  assert.throws(() => E.deserialize('{"players":[{"id":"x"}],"givens":[],"solution":[],"difficulty":"nope"}'));
});
test('hành động sai: ô/số ngoài khoảng, kiểu lạ, người không có', () => {
  const s = fixedGame();
  assert.equal(E.applyAction(s, 'p1', { type: 'place', cell: 81, value: 5 }).ok, false);
  assert.equal(E.applyAction(s, 'p1', { type: 'place', cell: 0, value: 0 }).ok, false);
  assert.equal(E.applyAction(s, 'p1', { type: 'place', cell: 0, value: 10 }).ok, false);
  assert.equal(E.applyAction(s, 'px', { type: 'place', cell: 0, value: 5 }).ok, false);
  assert.equal(E.applyAction(s, 'p1', { type: 'nhay' }).ok, false);
  assert.equal(E.applyAction(s, 'p1', null).ok, false);
  assert.throws(() => E.createGame([]));
  assert.throws(() => E.createGame([P('a', 'A'), P('b', 'B'), P('c', 'C'), P('d', 'D'), P('e', 'E')]));
});
test('bot: mỗi lượt điền đúng 1 ô trống, không bao giờ sai', () => {
  const s = fixedGame(P2);
  s.players[1].isBot = true;
  for (let k = 0; k < 10; k++) {
    const a = botAction(s, 'p2', s.players[1]);
    assert.ok(a && a.type === 'place');
    assert.equal(a.value, s.solution[a.cell]);
    const r = E.applyAction(s, 'p2', a);
    assert.ok(r.ok && r.correct);
  }
  assert.equal(s.prog.p2.mistakes, 0);
});
test('peersOf: 20 ô cùng hàng/cột/khối, không chứa chính nó', () => {
  for (const i of [0, 40, 80, 13]) {
    const ps = E.peersOf(i);
    assert.equal(ps.length, 20);
    assert.ok(!ps.includes(i));
    assert.equal(new Set(ps).size, 20);
  }
});

console.log(`\nSudoku rules: ${pass} kiểm tra passed.`);
