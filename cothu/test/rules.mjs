// Test luật Cờ Thú. Chạy: node cothu/test/rules.mjs
// Kiểm đúng luật: xuất phát, đi 1 ô, thứ bậc ăn quân (Chuột ăn Voi, Voi
// không ăn Chuột, cùng hạng), bẫy (hạng 0), sông (chỉ Chuột vào), Hổ/Sư tử
// nhảy sông (đường trống / bị Chuột chặn), Chuột trong sông, hang (không vào
// hang mình, vào hang địch thắng), ăn hết quân thắng, xin thua.
import assert from 'assert/strict';
import * as E from '../js/engine.js';

const P1 = { id: 'p1', name: 'Đỏ' }, P2 = { id: 'p2', name: 'Xanh', isBot: true };
const fresh = () => E.createGame([P1, P2]);
const set = (s, x, y, v) => { s.cells[y * 7 + x] = v; };
const mv = (s, pid, fx, fy, tx, ty) => E.applyMove(s, pid, { from: { x: fx, y: fy }, to: { x: tx, y: ty } });
const act = (s, pid, a) => E.applyAction(s, pid, a);
const clear = s => { s.cells.fill(0); };
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

test('khởi tạo: 16 quân đúng vị trí, Đỏ (p1) đi trước, 26 nước đi đầu', () => {
  const s = fresh();
  assert.equal(s.cells.length, 63);
  assert.equal(s.phase, 'playing');
  assert.equal(s.turn, 'p1');
  assert.deepEqual(s.players.map(p => p.side), ['R', 'B']);
  assert.deepEqual(E.counts(s), { R: 8, B: 8 });
  /* vị trí xuất phát chuẩn */
  assert.equal(E.pieceAt(s.cells, 0, 8), 7); /* Sư tử Đỏ */
  assert.equal(E.pieceAt(s.cells, 6, 8), 6); /* Hổ Đỏ */
  assert.equal(E.pieceAt(s.cells, 0, 6), 1); /* Chuột Đỏ */
  assert.equal(E.pieceAt(s.cells, 6, 6), 8); /* Voi Đỏ */
  assert.equal(E.pieceAt(s.cells, 6, 0), -7); /* Sư tử Xanh */
  assert.equal(E.pieceAt(s.cells, 0, 0), -6); /* Hổ Xanh */
  assert.equal(E.pieceAt(s.cells, 6, 2), -1); /* Chuột Xanh */
  assert.equal(E.pieceAt(s.cells, 0, 2), -8); /* Voi Xanh */
  assert.equal(E.legalMoves(s, 'p1').length, 24); /* Báo (2,6) và Sói (4,6) không đi được vào sông ở (2,5)/(4,5) */
  assert.equal(E.legalMoves(s, 'p2').length, 0); /* chưa tới lượt Xanh */
});

test('đi 1 ô ngang/dọc được; đi chéo, đi 2 ô, đi quân địch đều bị từ chối', () => {
  const s = fresh();
  const r = mv(s, 'p1', 0, 6, 0, 5); /* Chuột Đỏ tiến 1 ô */
  assert.ok(r.ok && !r.ended);
  assert.equal(s.cells[5 * 7 + 0], 1);
  assert.equal(s.cells[6 * 7 + 0], 0);
  assert.equal(s.turn, 'p2');
  assert.equal(s.moveCount, 1);
  assert.deepEqual(s.lastMove.from, { x: 0, y: 6 });
  assert.deepEqual(s.lastMove.to, { x: 0, y: 5 });
  const s2 = fresh();
  assert.equal(mv(s2, 'p1', 0, 6, 1, 5).ok, false); /* chéo */
  assert.equal(mv(s2, 'p1', 0, 6, 0, 4).ok, false); /* 2 ô */
  assert.equal(mv(s2, 'p1', 0, 6, 0, 6).ok, false); /* đứng yên */
  assert.equal(mv(s2, 'p1', 6, 2, 6, 3).ok, false); /* quân Xanh, sai lượt + sai phe */
  assert.equal(mv(s2, 'p2', 6, 2, 6, 3).ok, false); /* sai lượt */
  assert.equal(mv(s2, 'p1', 3, 3, 3, 4).ok, false); /* ô trống, không có quân */
});

test('thứ bậc: mạnh ăn yếu, cùng hạng ăn được, yếu không ăn được mạnh', () => {
  const s = fresh(); clear(s);
  set(s, 3, 4, 3); set(s, 3, 5, -2); /* Chó Đỏ (3) kề Mèo Xanh (2) */
  let r = mv(s, 'p1', 3, 4, 3, 5);
  assert.ok(r.ok && r.captured === 2);
  assert.equal(s.cells[5 * 7 + 3], 3);
  assert.deepEqual(s.captured.p1, [{ rank: 2, side: 'B' }]);
  const s2 = fresh(); clear(s2);
  set(s2, 3, 4, 2); set(s2, 3, 5, -3); /* Mèo Đỏ (2) kề Chó Xanh (3) */
  assert.equal(mv(s2, 'p1', 3, 4, 3, 5).ok, false); /* yếu không ăn được mạnh */
  const s3 = fresh(); clear(s3);
  set(s3, 3, 4, 3); set(s3, 3, 5, -3); /* Chó vs Chó */
  assert.ok(mv(s3, 'p1', 3, 4, 3, 5).ok); /* cùng hạng ăn được */
  const s4 = fresh(); clear(s4);
  set(s4, 3, 4, 7); set(s4, 3, 5, -7); /* Sư tử vs Sư tử */
  assert.ok(mv(s4, 'p1', 3, 4, 3, 5).ok);
});

test('Chuột ăn được Voi; Voi KHÔNG ăn được Chuột', () => {
  const s = fresh(); clear(s);
  set(s, 3, 4, 1); set(s, 3, 5, -8); /* Chuột Đỏ kề Voi Xanh */
  const r = mv(s, 'p1', 3, 4, 3, 5);
  assert.ok(r.ok && r.captured === 8);
  const s2 = fresh(); clear(s2);
  set(s2, 3, 4, 8); set(s2, 3, 5, -1); /* Voi Đỏ kề Chuột Xanh */
  assert.equal(mv(s2, 'p1', 3, 4, 3, 5).ok, false);
  /* nhưng Voi vẫn ăn được các quân khác hạng <= 8 (trừ Chuột) */
  const s3 = fresh(); clear(s3);
  set(s3, 3, 4, 8); set(s3, 3, 5, -7);
  assert.ok(mv(s3, 'p1', 3, 4, 3, 5).ok);
});

test('bẫy: quân trong bẫy địch hạng thành 0, Chuột cũng ăn được Sư tử', () => {
  const s = fresh(); clear(s);
  /* Sư tử Xanh đứng trong bẫy Đỏ (2,8) */
  set(s, 2, 8, -7); set(s, 2, 7, 1); /* Chuột Đỏ kề */
  assert.equal(E.effRank(s.cells, 2, 8), 0);
  const r = mv(s, 'p1', 2, 7, 2, 8);
  assert.ok(r.ok && r.captured === 7);
  /* Sư tử trong bẫy không ăn được Chó (hạng hiệu dụng 0 < 3) */
  const s2 = fresh(); clear(s2);
  set(s2, 2, 8, -7); set(s2, 2, 7, 3); /* Chó Đỏ kề Sư tử Xanh trong bẫy */
  assert.ok(mv(s2, 'p1', 2, 7, 2, 8).ok);
  /* Sư tử trong bẫy không ăn được Chó (hạng hiệu dụng 0 < 3) */
  const s4 = fresh(); clear(s4);
  set(s4, 2, 8, -7);
  set(s4, 1, 8, 3); /* Chó Đỏ kề */
  /* tới lượt Xanh: set turn */
  s4.turn = 'p2';
  assert.equal(mv(s4, 'p2', 2, 8, 1, 8).ok, false); /* Sư tử bị bẫy (hạng 0) không ăn được Chó hạng 3 */
  /* bẫy của mình KHÔNG làm yếu quân mình: Sư tử Đỏ trong bẫy Đỏ vẫn hạng 7 */
  const s5 = fresh(); clear(s5);
  set(s5, 2, 8, 7); /* Sư tử Đỏ trong bẫy Đỏ */
  assert.equal(E.effRank(s5.cells, 2, 8), 7);
  set(s5, 2, 7, -3); /* Chó Xanh kề */
  assert.ok(mv(s5, 'p1', 2, 8, 2, 7).ok);
});

test('sông: chỉ Chuột được vào; Hổ, Sư tử, Voi không vào được', () => {
  const s = fresh(); clear(s);
  set(s, 0, 3, 6); /* Hổ Đỏ kề sông (1,3) */
  assert.equal(mv(s, 'p1', 0, 3, 1, 3).ok, false);
  const s2 = fresh(); clear(s2);
  set(s2, 0, 3, 1); /* Chuột Đỏ kề sông */
  assert.ok(mv(s2, 'p1', 0, 3, 1, 3).ok);
  assert.equal(s2.cells[3 * 7 + 1], 1);
  const s3 = fresh(); clear(s3);
  set(s3, 1, 2, 8); /* Voi Đỏ kề sông (1,3) */
  assert.equal(mv(s3, 'p1', 1, 2, 1, 3).ok, false);
  const s4 = fresh(); clear(s4);
  set(s4, 3, 2, 7); /* Sư tử Đỏ kề sông? (3,2) kề (3,3) là đất — Sư tử đi (3,3) được */
  assert.ok(mv(s4, 'p1', 3, 2, 3, 3).ok);
});

test('nhảy sông: Hổ/Sư tử nhảy ngang + dọc khi đường trống', () => {
  const s = fresh(); clear(s);
  set(s, 0, 4, 6); /* Hổ Đỏ ở (0,4), sông (1,4),(2,4) trống */
  let r = mv(s, 'p1', 0, 4, 3, 4);
  assert.ok(r.ok && r.captured === 0);
  assert.equal(s.cells[4 * 7 + 3], 6);
  assert.equal(s.lastMove.jump, true);
  const s2 = fresh(); clear(s2);
  set(s2, 1, 2, 7); /* Sư tử Đỏ ở (1,2), sông (1,3),(1,4),(1,5) trống */
  r = mv(s2, 'p1', 1, 2, 1, 6);
  assert.ok(r.ok);
  assert.equal(s2.cells[6 * 7 + 1], 7);
  assert.equal(s2.lastMove.jump, true);
  /* nhảy ngang chiều ngược lại */
  const s3 = fresh(); clear(s3);
  set(s3, 6, 5, 6); /* Hổ Đỏ ở (6,5), sông (5,5),(4,5) trống */
  assert.ok(mv(s3, 'p1', 6, 5, 3, 5).ok);
  /* nhảy dọc chiều ngược lại */
  const s4 = fresh(); clear(s4);
  set(s4, 4, 6, 7); /* Sư tử Đỏ ở (4,6) */
  assert.ok(mv(s4, 'p1', 4, 6, 4, 2).ok);
  /* nhảy để ăn quân bên kia sông */
  const s5 = fresh(); clear(s5);
  set(s5, 0, 4, 6); set(s5, 3, 4, -3); /* Chó Xanh ở (3,4) */
  r = mv(s5, 'p1', 0, 4, 3, 4);
  assert.ok(r.ok && r.captured === 3);
});

test('nhảy sông bị chặn: Chuột trong sông chặn đường nhảy', () => {
  const s = fresh(); clear(s);
  set(s, 0, 4, 6); set(s, 1, 4, -1); /* Chuột Xanh bơi ở (1,4) */
  assert.equal(mv(s, 'p1', 0, 4, 3, 4).ok, false);
  /* Hổ vẫn đi ô thường khác được */
  assert.ok(mv(s, 'p1', 0, 4, 0, 3).ok);
  const s2 = fresh(); clear(s2);
  set(s2, 1, 2, 7); set(s2, 1, 5, 1); /* Chuột Đỏ ở (1,5) chặn đường nhảy dọc */
  assert.equal(mv(s2, 'p1', 1, 2, 1, 6).ok, false);
  /* Chuột không nhảy: Chuột chỉ đi 1 ô, không nhảy qua sông */
  const s3 = fresh(); clear(s3);
  set(s3, 0, 4, 1);
  assert.equal(mv(s3, 'p1', 0, 4, 3, 4).ok, false);
  assert.ok(mv(s3, 'p1', 0, 4, 1, 4).ok); /* nhưng vào sông được */
});

test('Chuột trong sông: chỉ ăn Chuột khác trong sông, không ăn quân trên bờ', () => {
  const s = fresh(); clear(s);
  set(s, 1, 4, 1); /* Chuột Đỏ trong sông */
  set(s, 1, 3, -1); /* Chuột Xanh trong sông kề */
  let r = mv(s, 'p1', 1, 4, 1, 3);
  assert.ok(r.ok && r.captured === 1);
  const s2 = fresh(); clear(s2);
  set(s2, 1, 4, 1); /* Chuột Đỏ trong sông */
  set(s2, 1, 2, -3); /* Chó Xanh trên bờ kề */
  assert.equal(mv(s2, 'p1', 1, 4, 1, 2).ok, false); /* không ăn được quân trên bờ */
  const s3 = fresh(); clear(s3);
  set(s3, 1, 4, 1); set(s3, 0, 4, -2); /* Mèo Xanh trên bờ kề */
  assert.equal(mv(s3, 'p1', 1, 4, 0, 4).ok, false);
  /* Chuột trên bờ KHÔNG ăn được Chuột trong sông */
  const s4 = fresh(); clear(s4);
  set(s4, 0, 4, 1); set(s4, 1, 4, -1); /* Chuột Xanh trong sông */
  assert.equal(mv(s4, 'p1', 0, 4, 1, 4).ok, false);
  /* Chuột trong sông đi ô sông trống được, và lên bờ ô trống được */
  const s5 = fresh(); clear(s5);
  set(s5, 1, 4, 1);
  assert.ok(mv(s5, 'p1', 1, 4, 2, 4).ok);
  const s6 = fresh(); clear(s6);
  set(s6, 1, 4, 1);
  assert.ok(mv(s6, 'p1', 1, 4, 1, 5).ok);
  const s7 = fresh(); clear(s7);
  set(s7, 1, 3, 1);
  assert.ok(mv(s7, 'p1', 1, 3, 1, 2).ok); /* lên bờ */
});

test('hang: không được vào hang mình; vào hang địch thắng ngay', () => {
  const s = fresh(); clear(s);
  set(s, 3, 7, 5); /* Báo Đỏ kề hang Đỏ (3,8) */
  assert.equal(mv(s, 'p1', 3, 7, 3, 8).ok, false);
  const s2 = fresh(); clear(s2);
  set(s2, 3, 1, 5); /* Báo Đỏ kề hang Xanh (3,0) */
  const r = mv(s2, 'p1', 3, 1, 3, 0);
  assert.ok(r.ok && r.ended);
  assert.equal(s2.phase, 'ended');
  assert.equal(s2.winner, 'p1');
  assert.equal(s2.endReason, 'den');
  /* Xanh cũng vậy */
  const s3 = fresh(); clear(s3);
  set(s3, 3, 7, -5); /* Báo Xanh kề hang Đỏ (3,8) */
  s3.turn = 'p2';
  const r3 = mv(s3, 'p2', 3, 7, 3, 8);
  assert.ok(r3.ok && r3.ended);
  assert.equal(s3.winner, 'p2');
  assert.equal(s3.endReason, 'den');
});

test('ăn hết quân địch thì thắng', () => {
  const s = fresh(); clear(s);
  set(s, 3, 4, 7); set(s, 3, 5, -1); /* Sư tử Đỏ vs Chuột Xanh cuối cùng */
  const r = mv(s, 'p1', 3, 4, 3, 5);
  assert.ok(r.ok && r.ended);
  assert.equal(s.winner, 'p1');
  assert.equal(s.endReason, 'capture');
  assert.deepEqual(E.counts(s), { R: 1, B: 0 });
});

test('xin thua: người xin thua thì thua ngay, đối thủ thắng', () => {
  const s = fresh();
  mv(s, 'p1', 0, 6, 0, 5);
  const r = act(s, 'p2', { type: 'resign' });
  assert.ok(r.ok && r.ended);
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'p1');
  assert.equal(s.endReason, 'resign');
  assert.equal(mv(s, 'p1', 0, 5, 0, 4).ok, false);
});

test('legalMovesFrom: chỉ nước của quân đó; quân bị chặn thì không có nước', () => {
  const s = fresh();
  const m = E.legalMovesFrom(s, 'p1', 0, 6); /* Chuột Đỏ */
  assert.equal(m.length, 3);
  assert.ok(m.some(x => x.tx === 0 && x.ty === 5));
  assert.ok(m.some(x => x.tx === 0 && x.ty === 7));
  assert.ok(m.some(x => x.tx === 1 && x.ty === 6));
  assert.equal(E.legalMovesFrom(s, 'p1', 3, 3).length, 0); /* ô trống */
  assert.equal(E.legalMovesFrom(s, 'p1', 6, 2).length, 0); /* quân Xanh */
  assert.equal(E.legalMovesFrom(s, 'p2', 0, 6).length, 0); /* sai lượt */
  /* quân bị chặn hết: Chuột Đỏ bị 3 quân mình vây */
  const s2 = fresh(); clear(s2);
  set(s2, 3, 4, 1); set(s2, 3, 3, 2); set(s2, 3, 5, 2); set(s2, 2, 4, 2); set(s2, 4, 4, 2);
  assert.equal(E.legalMovesFrom(s2, 'p1', 3, 4).length, 0);
});

test('serialize/deserialize: JSON đi-về giữ nguyên trạng thái', () => {
  const s = fresh();
  mv(s, 'p1', 0, 6, 0, 5); mv(s, 'p2', 6, 2, 6, 3); mv(s, 'p1', 0, 5, 0, 4);
  const json = E.serialize(s);
  assert.equal(typeof json, 'string');
  const back = E.deserialize(json);
  assert.deepEqual(back, s);
  assert.throws(() => E.deserialize('{"cells":[1,2],"players":[]}'));
  assert.throws(() => E.deserialize('không phải json'));
});

test('cloneState tách biệt; viewFor có mySide/captured', () => {
  const s = fresh();
  mv(s, 'p1', 0, 6, 0, 5);
  const c = E.cloneState(s);
  c.cells[0] = 1;
  assert.equal(s.cells[0], -6); /* Hổ Xanh ở (0,0) không đổi */
  const v = E.viewFor(s, 'p1');
  assert.equal(v.mySide, 'R');
  assert.equal(E.viewFor(s, 'p2').mySide, 'B');
  assert.deepEqual(v.captured, { p1: [], p2: [] });
  assert.equal(v.cells.length, 63);
});

test('applyAction lạ / sai lượt đều bị từ chối', () => {
  const s = fresh();
  for (const a of [{ type: 'fire' }, { type: 'move', from: { x: 0, y: 6 }, to: { x: 9, y: 9 } }, null, { from: { x: 0, y: 6 } }, { type: 'move', from: { x: 0.5, y: 6 }, to: { x: 0, y: 5 } }]) {
    assert.equal(act(s, 'p1', a).ok, false);
  }
  assert.equal(act(s, 'p2', { type: 'move', from: { x: 6, y: 2 }, to: { x: 6, y: 3 } }).ok, false); /* sai lượt */
});

test('khay quân đã ăn: ăn 2 quân thì khay ghi đủ 2', () => {
  const s = fresh(); clear(s);
  set(s, 3, 4, 7); set(s, 3, 5, -2); set(s, 4, 4, -1);
  mv(s, 'p1', 3, 4, 3, 5); /* ăn Mèo */
  s.turn = 'p1'; /* ép lượt lại để test tiếp (không phải nước hợp lệ trong ván thật) */
  mv(s, 'p1', 3, 5, 4, 5); /* Sư tử đi (4,5) trống — không ăn */
  assert.equal(s.captured.p1.length, 1);
  assert.equal(s.captured.p1[0].rank, 2);
});

console.log(`\n${pass} test đạt.`);
