// Test luật Cờ Lật. Chạy: node colat/test/rules.mjs
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { chooseMove } from '../js/bot.js';

const P1 = { id: 'p1', name: 'Đen' }, P2 = { id: 'p2', name: 'Trắng' };
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

test('vị trí xuất phát: 2 Đen + 2 Trắng chéo nhau ở giữa, Đen đi trước, 4 nước hợp lệ', () => {
  const s = E.createGame([P1, P2]);
  assert.deepEqual(E.counts(s.cells), { B: 2, W: 2, total: 4 });
  assert.equal(s.cells[E.idx(3, 3)], 2); assert.equal(s.cells[E.idx(4, 3)], 1);
  assert.equal(s.cells[E.idx(3, 4)], 1); assert.equal(s.cells[E.idx(4, 4)], 2);
  assert.equal(s.turn, 'p1');
  const ms = E.legalMoves(s, 'p1');
  assert.equal(ms.length, 4);
  assert.deepEqual(ms.map(m => [m.x, m.y]).sort(), [[2, 3], [3, 2], [4, 5], [5, 4]]);
  assert.ok(ms.every(m => m.flips.length === 1));
});

test('nước đi kẹp 1 hướng: Đen d6 (3,2) lật đúng 1 quân, lượt đổi sang Trắng', () => {
  const s = E.createGame([P1, P2]);
  const r = E.applyAction(s, 'p1', { type: 'move', x: 3, y: 2 });
  assert.ok(r.ok && !r.ended && r.flipped === 1);
  assert.equal(s.cells[E.idx(3, 2)], 1);
  assert.equal(s.cells[E.idx(3, 3)], 1); /* quân Trắng d5 bị lật */
  assert.deepEqual(E.counts(s.cells), { B: 4, W: 1, total: 5 });
  assert.equal(s.turn, 'p2');
  assert.equal(s.lastMove.at.x, 3); assert.equal(s.lastMove.flipped.length, 1);
});

test('nước đi kẹp 2 hướng cùng lúc: lật 2 quân', () => {
  const s = E.createGame([P1, P2]);
  for (const st of [s]) {
    st.cells.fill(0);
    st.cells[E.idx(5, 2)] = 2; st.cells[E.idx(6, 2)] = 1; /* phải: W rồi B */
    st.cells[E.idx(4, 3)] = 2; st.cells[E.idx(4, 4)] = 1; /* dưới: W rồi B */
    st.cells[E.idx(0, 0)] = 1; st.cells[E.idx(7, 7)] = 2;
    st.cells[E.idx(5, 5)] = 2; /* Trắng còn nước (3,3) sau nước này → lượt đổi */
  }
  const r = E.applyAction(s, 'p1', { type: 'move', x: 4, y: 2 });
  assert.ok(r.ok && r.flipped === 2);
  assert.equal(s.cells[E.idx(5, 2)], 1);
  assert.equal(s.cells[E.idx(4, 3)], 1);
  assert.equal(s.turn, 'p2');
});

test('nước không hợp lệ bị từ chối: ô đã có quân, ô không lật được quân nào, sai lượt, ngoài bàn', () => {
  const s = E.createGame([P1, P2]);
  assert.equal(E.applyAction(s, 'p1', { type: 'move', x: 3, y: 3 }).ok, false); /* đã có quân */
  assert.equal(E.applyAction(s, 'p1', { type: 'move', x: 0, y: 0 }).ok, false); /* không kẹp được */
  assert.equal(E.applyAction(s, 'p1', { type: 'move', x: 9, y: 9 }).ok, false);
  assert.equal(E.applyAction(s, 'p2', { type: 'move', x: 3, y: 2 }).ok, false); /* sai lượt */
  assert.equal(E.applyAction(s, 'p1', { type: 'move', x: 3, y: 2 }).ok, true);
  assert.equal(E.applyAction(s, 'p1', { type: 'move', x: 2, y: 2 }).ok, false); /* giờ tới lượt Trắng */
});

test('bỏ lượt tự động: Trắng hết nước thì Đen đi tiếp, ván không kẹt', () => {
  const s = E.createGame([P1, P2]);
  s.cells.fill(1);
  s.cells[E.idx(1, 0)] = 2; s.cells[E.idx(6, 7)] = 2;
  s.cells[E.idx(0, 0)] = 0; s.cells[E.idx(7, 7)] = 0;
  /* Đen (0,0) lật (1,0); sau đó Trắng không còn nước nào ở (7,7) → bỏ lượt */
  const r = E.applyAction(s, 'p1', { type: 'move', x: 0, y: 0 });
  assert.ok(r.ok && !r.ended && r.passed === 'p2');
  assert.equal(s.turn, 'p1'); /* Đen đi tiếp */
  assert.equal(s.lastPass.by, 'p2');
  assert.deepEqual(E.counts(s.cells), { B: 62, W: 1, total: 63 });
  /* Đen đánh nốt (7,7) lật (6,7) → bàn đầy → kết thúc, Đen thắng 64–0 */
  const r2 = E.applyAction(s, 'p1', { type: 'move', x: 7, y: 7 });
  assert.ok(r2.ok && r2.ended);
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'p1');
  assert.equal(s.endReason, 'count');
  assert.deepEqual(E.counts(s.cells), { B: 64, W: 0, total: 64 });
});

test('cả 2 đều hết nước thì ván kết thúc ngay, đếm quân phân thắng thua', () => {
  const s = E.createGame([P1, P2]);
  s.cells.fill(1);
  s.cells[E.idx(0, 0)] = 0; s.cells[E.idx(7, 7)] = 0;
  s.cells[E.idx(1, 0)] = 2; s.cells[E.idx(6, 7)] = 2;
  s.cells[E.idx(0, 7)] = 2; s.cells[E.idx(7, 0)] = 2;
  /* Đen (0,0) lật (1,0); Trắng ở (7,7) vẫn còn nước (cột 7 kẹp tới (7,0) là Trắng)
     nên không bỏ lượt — kiểm tra ván vẫn tiếp tục đúng luật */
  const r = E.applyAction(s, 'p1', { type: 'move', x: 0, y: 0 });
  assert.ok(r.ok && !r.ended && !r.passed);
  assert.equal(s.turn, 'p2');
  /* Trắng (7,7) lật dọc 6 quân → bàn đầy → Đen vẫn nhiều quân hơn (54–10) */
  const r2 = E.applyAction(s, 'p2', { type: 'move', x: 7, y: 7 });
  assert.ok(r2.ok && r2.ended);
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'p1');
  assert.deepEqual(E.counts(s.cells), { B: 54, W: 10, total: 64 });
});

test('hòa khi bằng quân: ván kết thúc với draw=true, không có winner', () => {
  const s = E.createGame([P1, P2]);
  /* Trước nước cuối: Đen 30, Trắng 33, ô (0,0) trống. Đen (0,0) chỉ lật đúng
     1 quân (1,0) theo hàng ngang — (0,1) và (1,1) đều là Đen nên chặn 2
     hướng còn lại → sau nước: 32–32, bàn đầy, hòa. */
  s.cells.fill(1);
  const W = [[1, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0],
    [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2],
    [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3],
    [0, 4], [1, 4], [2, 4], [3, 4], [4, 4]];
  for (const [x, y] of W) s.cells[E.idx(x, y)] = 2;
  s.cells[E.idx(0, 0)] = 0;
  assert.deepEqual(E.counts(s.cells), { B: 30, W: 33, total: 63 });
  const r = E.applyAction(s, 'p1', { type: 'move', x: 0, y: 0 });
  assert.ok(r.ok && r.ended && r.flipped === 1);
  assert.equal(s.draw, true);
  assert.equal(s.winner, null);
  assert.equal(s.endReason, 'draw');
  assert.deepEqual(E.counts(s.cells), { B: 32, W: 32, total: 64 });
});

test('xin thua + đề nghị hòa: đồng ý hòa, từ chối hòa, rút đề nghị', () => {
  const s = E.createGame([P1, P2]);
  E.applyAction(s, 'p1', { type: 'move', x: 3, y: 2 });
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
  assert.equal(E.applyAction(s, 'p2', { type: 'move', x: 2, y: 2 }).ok, false); /* ván đã kết thúc */
  const s2 = E.createGame([P1, P2]);
  const rr = E.applyAction(s2, 'p1', { type: 'resign' });
  assert.ok(rr.ok && rr.ended && s2.winner === 'p2' && s2.endReason === 'resign');
});

test('host chọn phe Trắng: host là Trắng, đối thủ Đen đi trước', () => {
  const s = E.createGame([P1, P2], { side: 'white' });
  assert.equal(s.players[0].side, 'W');
  assert.equal(s.players[1].side, 'B');
  assert.equal(s.turn, 'p2'); /* Đen đi trước */
  assert.deepEqual(E.viewFor(s, 'p1').mySide, 'W');
  assert.deepEqual(E.viewFor(s, 'p2').mySide, 'B');
});

test('viewFor + serialize/deserialize: 2 bên thấy cùng cells/lượt, khác mySide', () => {
  const s = E.createGame([P1, P2]);
  E.applyAction(s, 'p1', { type: 'move', x: 3, y: 2 });
  const v1 = E.viewFor(s, 'p1'), v2 = E.viewFor(s, 'p2');
  assert.deepEqual(v1.cells, v2.cells);
  assert.equal(v1.turn, v2.turn);
  assert.equal(v1.mySide, 'B'); assert.equal(v2.mySide, 'W');
  assert.deepEqual(v1.counts, { B: 4, W: 1, total: 5 });
  const s2 = E.deserialize(E.serialize(s));
  assert.deepEqual(E.serialize(s2), E.serialize(s));
  const r = E.applyAction(s2, 'p2', { type: 'move', x: 2, y: 2 });
  assert.ok(r.ok);
  assert.deepEqual(E.serialize(s2).length > 0, true);
});

test('bot Easy/Hard đều trả nước hợp lệ từ vị trí xuất phát và giữa ván', () => {
  const s = E.createGame([P1, P2]);
  for (const lvl of ['easy', 'hard']) {
    const a = chooseMove(s, 'p1', lvl);
    assert.ok(a && a.type === 'move');
    assert.ok(E.legalMoves(s, 'p1').some(m => m.x === a.x && m.y === a.y), `bot ${lvl} đi nước hợp lệ`);
  }
  E.applyAction(s, 'p1', { type: 'move', x: 3, y: 2 });
  const a = chooseMove(s, 'p2', 'hard');
  assert.ok(a && E.legalMoves(s, 'p2').some(m => m.x === a.x && m.y === a.y));
  /* bot Hard không bao giờ chọn nước ngoài bàn hay ô đã có quân */
  for (let i = 0; i < 5; i++) {
    const m = chooseMove(s, 'p2', 'hard');
    assert.ok(E.inBoard(m.x, m.y) && s.cells[E.idx(m.x, m.y)] === 0);
  }
});

test('legalMoveAt: trả đúng nước + danh sách quân lật để hiện gợi ý', () => {
  const s = E.createGame([P1, P2]);
  const m = E.legalMoveAt(s, 'p1', 3, 2);
  assert.ok(m && m.flips.length === 1 && m.flips[0].x === 3 && m.flips[0].y === 3);
  assert.equal(E.legalMoveAt(s, 'p1', 0, 0), null);
  assert.equal(E.legalMoveAt(s, 'p2', 3, 2), null); /* sai lượt */
});

console.log(`\n${pass} test đạt.`);
