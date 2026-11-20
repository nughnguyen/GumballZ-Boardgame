// Test đồng bộ Sudoku: 2 bên áp cùng 1 dãy hành động → cùng trạng thái.
// Chạy: node sudoku/test/net.mjs
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';

const P2 = [{ id: 'p1', name: 'Một' }, { id: 'p2', name: 'Hai' }];
const P4 = [...P2, { id: 'p3', name: 'Ba' }, { id: 'p4', name: 'Bốn' }];
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

/* 2 engine độc lập, cùng seed ván: tạo 1 ván rồi copy state sang bên kia */
function pair(players = P2, opts = {}) {
  const a = E.createGame(players, { difficulty: 'medium', seed: 20261119, ...opts });
  const b = E.deserialize(E.serialize(a));
  return [a, b];
}
function applyBoth(ab, pid, action) {
  const [a, b] = ab;
  const ra = E.applyAction(a, pid, action);
  const rb = E.applyAction(b, pid, action);
  assert.deepEqual(ra, rb, 'kết quả hành động khác nhau: ' + JSON.stringify(action));
  assert.equal(E.serialize(a), E.serialize(b), 'state lệch sau ' + JSON.stringify(action));
  return ra;
}
const emptyCell = s => { for (let i = 0; i < 81; i++) if (!s.givens[i] && !s.prog.p1.grid[i]) return i; return -1; };

test('điền đúng/sai + ghi chú + xoá: 2 bên giống nhau từng byte', () => {
  const ab = pair();
  const [a] = ab;
  const i = emptyCell(a);
  applyBoth(ab, 'p1', { type: 'note', cell: i, value: 3 });
  applyBoth(ab, 'p1', { type: 'note', cell: i, value: 7 });
  applyBoth(ab, 'p1', { type: 'place', cell: i, value: (a.solution[i] % 9) + 1 }); /* sai */
  applyBoth(ab, 'p1', { type: 'place', cell: i, value: a.solution[i] }); /* đúng */
  applyBoth(ab, 'p2', { type: 'note', cell: emptyCell(a), value: 9 });
  applyBoth(ab, 'p1', { type: 'erase', cell: i });
  assert.equal(ab[0].prog.p1.grid[i], 0);
  assert.equal(ab[0].prog.p1.mistakes, 1);
});
test('gợi ý: 2 bên chọn cùng 1 ô (hạt giống LCG trong state, không Math.random)', () => {
  const ab = pair();
  const r1 = applyBoth(ab, 'p1', { type: 'hint' });
  const r2 = applyBoth(ab, 'p2', { type: 'hint' });
  assert.ok(r1.ok && r2.ok);
  /* gợi ý lần 2 vẫn đồng bộ */
  applyBoth(ab, 'p1', { type: 'hint' });
  applyBoth(ab, 'p2', { type: 'hint' });
  assert.equal(ab[0].prog.p1.hintsLeft, 1);
  assert.equal(ab[0].prog.p2.hintsLeft, 1);
});
test('đua 4 người: p1 điền xong trước → thắng, 2 bên giống nhau', () => {
  const ab = pair(P4, { difficulty: 'easy' });
  const [a] = ab;
  /* p2, p3, p4 mỗi người điền vài ô đúng */
  for (const pid of ['p2', 'p3', 'p4']) {
    for (let k = 0; k < 3; k++) {
      const i = (() => { for (let j = 0; j < 81; j++) if (!a.givens[j] && !a.prog[pid].grid[j]) return j; return -1; })();
      applyBoth(ab, pid, { type: 'place', cell: i, value: a.solution[i] });
    }
  }
  /* p1 điền hết lưới */
  for (let i = 0; i < 81; i++) {
    if (a.givens[i]) continue;
    applyBoth(ab, 'p1', { type: 'place', cell: i, value: a.solution[i] });
  }
  assert.equal(ab[0].phase, 'ended');
  assert.equal(ab[0].winner, 'p1');
  assert.deepEqual(ab[0].losers, ['p2', 'p3', 'p4']);
  assert.equal(ab[1].winner, 'p1');
});
test('sai 3 lần trong đua: bị loại ở cả 2 bên, ván vẫn tiếp tục', () => {
  const ab = pair();
  const [a] = ab;
  const i = emptyCell(a);
  const wrong = (a.solution[i] % 9) + 1;
  applyBoth(ab, 'p1', { type: 'place', cell: i, value: wrong });
  applyBoth(ab, 'p1', { type: 'place', cell: i, value: wrong });
  applyBoth(ab, 'p1', { type: 'place', cell: i, value: wrong });
  assert.ok(ab[0].prog.p1.failed);
  assert.equal(ab[0].phase, 'playing');
  assert.deepEqual(E.actors(ab[0]), ['p2']);
  assert.deepEqual(E.actors(ab[1]), ['p2']);
});
test('xin thua + hết lượt: 2 bên giống nhau', () => {
  const ab = pair();
  applyBoth(ab, 'p1', { type: 'resign' });
  assert.equal(ab[0].phase, 'playing');
  applyBoth(ab, 'p2', { type: 'resign' });
  assert.equal(ab[0].phase, 'ended');
  assert.equal(ab[0].endReason, 'allfail');
  assert.equal(ab[0].winner, null);
});
test('bot đua: bot điền đúng ở cả 2 bên, không lệch state', () => {
  const ab = pair([{ id: 'p1', name: 'Một' }, { id: 'p2', name: 'Hai', isBot: true }]);
  const [a] = ab;
  for (let k = 0; k < 15; k++) {
    const act = botAction(a, 'p2', a.players[1]);
    assert.ok(act, 'bot phải ra hành động');
    applyBoth(ab, 'p2', act);
  }
  assert.equal(ab[0].prog.p2.mistakes, 0);
  assert.ok(ab[0].prog.p2.grid.some(v => v));
});
test('viewFor không lộ đáp án sau nhiều hành động', () => {
  const ab = pair();
  const [a] = ab;
  applyBoth(ab, 'p1', { type: 'hint' });
  const v = E.viewFor(a, 'p2');
  assert.equal('solution' in v, false);
  assert.equal(JSON.stringify(v).includes('"solution"'), false);
  assert.equal(v.you.hintsLeft, 3);
  assert.equal(v.players.find(p => p.id === 'p1').filled, a.givensCount + 1);
});

console.log(`\nSudoku net: ${pass} kiểm tra passed.`);
