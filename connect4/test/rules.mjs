// Test luật Connect 4. Chạy: node connect4/test/rules.mjs
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { chooseMove } from '../js/bot.js';

const P1 = { id: 'p1', name: 'Đỏ' }, P2 = { id: 'p2', name: 'Vàng' };
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

test('vị trí xuất phát: bàn trống 42 ô, Đỏ đi trước, 7 cột đều đi được', () => {
  const s = E.createGame([P1, P2]);
  assert.deepEqual(E.counts(s.cells), { R: 0, Y: 0, total: 0 });
  assert.equal(s.turn, 'p1');
  assert.equal(s.players[0].side, 'R');
  assert.equal(s.players[1].side, 'Y');
  assert.deepEqual(E.legalCols(s.cells), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(E.legalMoves(s, 'p1').map(m => m.col), [0, 1, 2, 3, 4, 5, 6]);
});

test('quân rơi xuống ô trống thấp nhất: Đỏ cột 4 rơi hàng 6, Vàng cột 4 rơi hàng 5', () => {
  const s = E.createGame([P1, P2]);
  let r = E.applyAction(s, 'p1', { type: 'move', col: 3 });
  assert.ok(r.ok && !r.ended);
  assert.equal(s.cells[E.idx(3, 5)], 1);
  assert.equal(s.lastMove.row, 5);
  r = E.applyAction(s, 'p2', { type: 'move', col: 3 });
  assert.ok(r.ok);
  assert.equal(s.cells[E.idx(3, 4)], 2);
  assert.equal(s.lastMove.row, 4);
  assert.deepEqual(E.counts(s.cells), { R: 1, Y: 1, total: 2 });
  assert.equal(s.turn, 'p1');
});

test('thắng ngang: Đỏ xếp 4 quân hàng dưới, thắng ngay, đường thắng đúng 4 ô', () => {
  const s = E.createGame([P1, P2]);
  s.cells[E.idx(0, 5)] = 1; s.cells[E.idx(1, 5)] = 1; s.cells[E.idx(2, 5)] = 1;
  s.moveCount = 3; s.turn = 'p1';
  const r = E.applyAction(s, 'p1', { type: 'move', col: 3 });
  assert.ok(r.ok && r.ended && r.win && r.dir === 'h');
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'p1');
  assert.equal(s.endReason, 'four');
  assert.equal(s.lastMove.winLine.length, 4);
  assert.deepEqual(s.lastMove.winLine.map(c => [c.x, c.y]).sort(), [[0, 5], [1, 5], [2, 5], [3, 5]]);
});

test('thắng dọc: Đỏ xếp 4 quân cột 4, thắng ngay', () => {
  const s = E.createGame([P1, P2]);
  s.cells[E.idx(3, 5)] = 1; s.cells[E.idx(3, 4)] = 1; s.cells[E.idx(3, 3)] = 1;
  s.cells[E.idx(0, 5)] = 2; s.cells[E.idx(1, 5)] = 2;
  s.moveCount = 5; s.turn = 'p1';
  const r = E.applyAction(s, 'p1', { type: 'move', col: 3 });
  assert.ok(r.ok && r.ended && r.win && r.dir === 'v');
  assert.equal(s.winner, 'p1');
  assert.deepEqual(s.lastMove.winLine.map(c => [c.x, c.y]).sort(), [[3, 2], [3, 3], [3, 4], [3, 5]]);
});

test('thắng chéo \\: Đỏ (1,6)-(2,5)-(3,4) rồi thả cột 4 xuống hàng 3', () => {
  const s = E.createGame([P1, P2]);
  s.cells[E.idx(0, 5)] = 1; s.cells[E.idx(1, 4)] = 1; s.cells[E.idx(2, 3)] = 1;
  s.cells[E.idx(1, 5)] = 2; s.cells[E.idx(2, 5)] = 2; s.cells[E.idx(2, 4)] = 2;
  s.cells[E.idx(3, 5)] = 2; s.cells[E.idx(3, 4)] = 2; s.cells[E.idx(3, 3)] = 2;
  s.moveCount = 9; s.turn = 'p1';
  const r = E.applyAction(s, 'p1', { type: 'move', col: 3 });
  assert.ok(r.ok && r.ended && r.win && r.dir === 'd');
  assert.equal(s.winner, 'p1');
  assert.equal(s.lastMove.row, 2);
  assert.deepEqual(s.lastMove.winLine.map(c => [c.x, c.y]).sort(), [[0, 5], [1, 4], [2, 3], [3, 2]]);
});

test('thắng chéo /: Đỏ (4,6)-(3,5)-(2,4) rồi thả cột 1 xuống hàng 3', () => {
  const s = E.createGame([P1, P2]);
  s.cells[E.idx(3, 5)] = 1; s.cells[E.idx(2, 4)] = 1; s.cells[E.idx(1, 3)] = 1;
  s.cells[E.idx(2, 5)] = 2; s.cells[E.idx(1, 5)] = 2; s.cells[E.idx(1, 4)] = 2;
  s.cells[E.idx(0, 5)] = 2; s.cells[E.idx(0, 4)] = 2; s.cells[E.idx(0, 3)] = 2;
  s.moveCount = 9; s.turn = 'p1';
  const r = E.applyAction(s, 'p1', { type: 'move', col: 0 });
  assert.ok(r.ok && r.ended && r.win && r.dir === 'd');
  assert.equal(s.winner, 'p1');
  assert.equal(s.lastMove.row, 2);
  assert.deepEqual(s.lastMove.winLine.map(c => [c.x, c.y]).sort(), [[0, 2], [1, 3], [2, 4], [3, 5]]);
});

test('nước không hợp lệ bị từ chối: cột đầy, cột ngoài bàn, sai lượt, ván đã kết thúc', () => {
  const s = E.createGame([P1, P2]);
  for (let y = 0; y < 6; y++) s.cells[E.idx(0, y)] = (y % 2 ? 2 : 1);
  assert.equal(E.applyAction(s, 'p1', { type: 'move', col: 0 }).ok, false); /* cột đầy */
  assert.equal(E.applyAction(s, 'p1', { type: 'move', col: 7 }).ok, false);
  assert.equal(E.applyAction(s, 'p1', { type: 'move', col: -1 }).ok, false);
  assert.equal(E.applyAction(s, 'p2', { type: 'move', col: 3 }).ok, false); /* sai lượt */
  assert.equal(E.applyAction(s, 'p1', { type: 'move', col: 3 }).ok, true);
  assert.equal(E.legalMoveAt(s, 'p1', 0), null); /* cột đầy → không có nước */
  assert.deepEqual(E.legalMoveAt(s, 'p2', 3), { col: 3, row: 4 });
});

test('chặn nước thắng: Vàng có 3 quân hàng dưới chờ cột 4, Đỏ thả cột 4 thì blocked=true', () => {
  const s = E.createGame([P1, P2]);
  s.cells[E.idx(0, 5)] = 2; s.cells[E.idx(1, 5)] = 2; s.cells[E.idx(2, 5)] = 2;
  s.moveCount = 3; s.turn = 'p1';
  const r = E.applyAction(s, 'p1', { type: 'move', col: 3 });
  assert.ok(r.ok && !r.ended && r.blocked === true);
  assert.equal(s.blocks.p1, 1);
  /* nước không chặn thì blocked=false */
  const s2 = E.createGame([P1, P2]);
  s2.cells[E.idx(0, 5)] = 2; s2.cells[E.idx(1, 5)] = 2; s2.cells[E.idx(2, 5)] = 2;
  s2.moveCount = 3; s2.turn = 'p1';
  const r2 = E.applyAction(s2, 'p1', { type: 'move', col: 6 });
  assert.ok(r2.ok && r2.blocked === false);
  assert.equal(s2.blocks.p1 || 0, 0);
});

test('hòa khi bàn đầy: mẫu bàn đầy không có 4 liên tiếp, nước cuối cùng hòa', () => {
  const s = E.createGame([P1, P2]);
  /* mẫu cặp đôi xen kẽ: mỗi hàng RR YY RR Y, hàng kế đổi màu — không có
     4 liên tiếp ngang/dọc/chéo nào (kiểm chứng bằng vòng lặp dưới đây) */
  const rows = [
    [2, 2, 1, 1, 2, 2, 1],
    [1, 1, 2, 2, 1, 1, 2],
    [2, 2, 1, 1, 2, 2, 1],
    [1, 1, 2, 2, 1, 1, 2],
    [2, 2, 1, 1, 2, 2, 1],
    [1, 1, 2, 2, 1, 1, 2],
  ];
  for (let y = 0; y < 6; y++) for (let x = 0; x < 7; x++) s.cells[E.idx(x, y)] = rows[y][x];
  s.cells[E.idx(6, 0)] = 0; /* chừa ô cuối: cột 7 hàng 1 */
  for (let y = 0; y < 6; y++) for (let x = 0; x < 7; x++) {
    if (s.cells[E.idx(x, y)] !== 0) assert.equal(E.checkWin(s.cells, x, y).win, false, `ô (${x},${y}) không được có 4`);
  }
  assert.deepEqual(E.counts(s.cells), { R: 20, Y: 21, total: 41 });
  s.moveCount = 41; s.turn = 'p2'; /* nước 42 là Vàng (nước chẵn) */
  const r = E.applyAction(s, 'p2', { type: 'move', col: 6 });
  assert.ok(r.ok && r.ended && r.draw === true);
  assert.equal(s.phase, 'ended');
  assert.equal(s.draw, true);
  assert.equal(s.winner, null);
  assert.equal(s.endReason, 'draw');
  assert.deepEqual(E.counts(s.cells), { R: 20, Y: 22, total: 42 });
});

test('xin thua + đề nghị hòa: đồng ý hòa, từ chối hòa, rút đề nghị', () => {
  const s = E.createGame([P1, P2]);
  E.applyAction(s, 'p1', { type: 'move', col: 3 });
  let r = E.applyAction(s, 'p2', { type: 'draw' });
  assert.ok(r.ok && r.offered && s.drawOffer === 'p2');
  r = E.applyAction(s, 'p1', { type: 'draw-decline' });
  assert.ok(r.ok && r.declined && s.drawOffer === null && s.phase === 'playing');
  r = E.applyAction(s, 'p1', { type: 'draw' });
  assert.ok(r.ok && r.offered);
  r = E.applyAction(s, 'p1', { type: 'draw' }); /* bấm lại = rút đề nghị */
  assert.ok(r.ok && r.cancelled && s.drawOffer === null);
  E.applyAction(s, 'p2', { type: 'draw' });
  r = E.applyAction(s, 'p1', { type: 'draw' });
  assert.ok(r.ok && r.agreed && r.ended && s.draw === true && s.endReason === 'draw-agree');
  assert.equal(E.applyAction(s, 'p2', { type: 'move', col: 2 }).ok, false); /* ván đã kết thúc */
  const s2 = E.createGame([P1, P2]);
  const rr = E.applyAction(s2, 'p1', { type: 'resign' });
  assert.ok(rr.ok && rr.ended && s2.winner === 'p2' && s2.endReason === 'resign');
});

test('host chọn phe Vàng: host là Vàng, đối thủ Đỏ đi trước', () => {
  const s = E.createGame([P1, P2], { side: 'yellow' });
  assert.equal(s.players[0].side, 'Y');
  assert.equal(s.players[1].side, 'R');
  assert.equal(s.turn, 'p2'); /* Đỏ đi trước */
  assert.deepEqual(E.viewFor(s, 'p1').mySide, 'Y');
  assert.deepEqual(E.viewFor(s, 'p2').mySide, 'R');
});

test('viewFor + serialize/deserialize: 2 bên thấy cùng cells/lượt, khác mySide', () => {
  const s = E.createGame([P1, P2]);
  E.applyAction(s, 'p1', { type: 'move', col: 3 });
  const v1 = E.viewFor(s, 'p1'), v2 = E.viewFor(s, 'p2');
  assert.deepEqual(v1.cells, v2.cells);
  assert.equal(v1.turn, v2.turn);
  assert.equal(v1.mySide, 'R'); assert.equal(v2.mySide, 'Y');
  assert.deepEqual(v1.counts, { R: 1, Y: 0, total: 1 });
  const s2 = E.deserialize(E.serialize(s));
  assert.deepEqual(E.serialize(s2), E.serialize(s));
  const r = E.applyAction(s2, 'p2', { type: 'move', col: 3 });
  assert.ok(r.ok);
});

test('bot Easy/Hard đều trả nước hợp lệ; Hard lấy nước thắng ngay và chặn nước thắng', () => {
  const s = E.createGame([P1, P2]);
  for (const lvl of ['easy', 'hard']) {
    const a = chooseMove(s, 'p1', lvl);
    assert.ok(a && a.type === 'move' && a.col >= 0 && a.col < 7, `bot ${lvl} đi nước hợp lệ`);
  }
  /* Hard lấy nước thắng ngay: Đỏ có 3 quân hàng dưới chờ cột 4 */
  const s2 = E.createGame([P1, P2]);
  s2.cells[E.idx(0, 5)] = 1; s2.cells[E.idx(1, 5)] = 1; s2.cells[E.idx(2, 5)] = 1;
  s2.moveCount = 3; s2.turn = 'p1';
  assert.equal(chooseMove(s2, 'p1', 'hard').col, 3);
  /* Hard chặn nước thắng của đối thủ: Vàng có 3 quân chờ cột 4 */
  const s3 = E.createGame([P1, P2]);
  s3.cells[E.idx(0, 5)] = 2; s3.cells[E.idx(1, 5)] = 2; s3.cells[E.idx(2, 5)] = 2;
  s3.moveCount = 3; s3.turn = 'p1';
  assert.equal(chooseMove(s3, 'p1', 'hard').col, 3);
  /* Hard giữa ván không bao giờ chọn cột đầy */
  const s4 = E.createGame([P1, P2]);
  for (let y = 0; y < 6; y++) s4.cells[E.idx(0, y)] = (y % 2 ? 2 : 1);
  for (let i = 0; i < 5; i++) assert.notEqual(chooseMove(s4, 'p1', 'hard').col, 0);
});

console.log(`\n${pass} test đạt.`);
