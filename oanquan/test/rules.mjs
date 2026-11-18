// Test luật Ô Ăn Quan. Chạy: node oanquan/test/rules.mjs
import assert from 'assert/strict';
import * as E from '../js/engine.js';

const P1 = { id: 'p1', name: 'Bạn' }, P2 = { id: 'p2', name: 'Máy', isBot: true };
const fresh = (opts) => E.createGame([P1, P2], opts);
const set = (s, i, q, d) => { s.cells[i] = { q, d }; };
const tot = (s, i) => s.cells[i].q + s.cells[i].d;
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

test('khởi tạo: 2 Quan ở 2 ô Quan, mỗi ô dân 5 Dân, lượt p1', () => {
  const s = fresh();
  assert.equal(s.phase, 'playing');
  assert.deepEqual(s.cells[0], { q: 1, d: 0 });
  assert.deepEqual(s.cells[6], { q: 1, d: 0 });
  for (const c of [1, 2, 3, 4, 5, 7, 8, 9, 10, 11]) assert.deepEqual(s.cells[c], { q: 0, d: 5 });
  assert.equal(s.turn, 'p1');
  assert.equal(s.opts.quanValue, 10);
});

test('rải sang Phải (+1) từ ô 7: thả vào 8,9,10,11,0 rồi bốc tiếp ô 1 và ăn ô 8', () => {
  const s = fresh();
  const r = E.applyMove(s, 'p1', { cell: 7, dir: 1 });
  assert.ok(r.ok);
  assert.equal(tot(s, 7), 0);
  assert.equal(tot(s, 8), 0); /* bị ăn */
  assert.equal(tot(s, 9), 6); assert.equal(tot(s, 10), 6); assert.equal(tot(s, 11), 6);
  assert.deepEqual(s.cells[0], { q: 1, d: 1 });
  assert.equal(tot(s, 1), 0); assert.equal(tot(s, 2), 6); assert.equal(tot(s, 6), 2); /* ô Quan phải: 1 Quan + 1 Dân rơi vào */
  assert.deepEqual(r.eaten, { q: 0, d: 6 });
  assert.equal(s.players[0].bag.d, 6);
  assert.equal(s.turn, 'p2'); /* đổi lượt */
});

test('rải sang Trái (−1) từ ô 7: thả vào 6,5,4,3,2 rồi bốc tiếp ô 1 và ăn Quan ô 6', () => {
  const s = fresh();
  const r = E.applyMove(s, 'p1', { cell: 7, dir: -1 });
  assert.ok(r.ok);
  assert.deepEqual(s.cells[6], { q: 0, d: 0 }); /* Quan bị ăn */
  assert.deepEqual(r.eaten, { q: 1, d: 1 });
  assert.deepEqual(s.players[0].bag, { q: 1, d: 1 });
  assert.equal(tot(s, 1), 0); assert.equal(tot(s, 2), 6);
  assert.equal(s.turn, 'p2');
});

test('chững vì Quan (B): thả viên cuối xong, ô kế là ô Quan đang có quân → mất lượt, không ăn', () => {
  const s = fresh();
  set(s, 10, 0, 1);
  const r = E.applyMove(s, 'p1', { cell: 10, dir: 1 });
  assert.ok(r.ok);
  assert.equal(tot(s, 10), 0); assert.equal(tot(s, 11), 6);
  assert.deepEqual(r.eaten, { q: 0, d: 0 });
  assert.equal(r.trace.at(-1).why, 'mandarin');
  assert.equal(s.turn, 'p2');
});

test('mất lượt do 2 ô trống (D): thả xong, ô kế trống và ô sau cũng trống', () => {
  const s = fresh();
  set(s, 7, 0, 1); set(s, 8, 0, 0); set(s, 9, 0, 0); set(s, 10, 0, 0);
  const r = E.applyMove(s, 'p1', { cell: 7, dir: 1 });
  assert.ok(r.ok);
  assert.equal(tot(s, 8), 1);
  assert.deepEqual(r.eaten, { q: 0, d: 0 });
  assert.equal(r.trace.at(-1).why, 'empty');
  assert.equal(s.turn, 'p2');
});

test('ăn 1 ô (C) + ăn dây qua ô Quan: ăn ô 10 rồi ăn tiếp Quan ô 0', () => {
  const s = fresh();
  set(s, 7, 0, 1); set(s, 8, 0, 0); set(s, 9, 0, 0); set(s, 10, 0, 3);
  set(s, 11, 0, 0); set(s, 1, 0, 0); set(s, 2, 0, 0);
  const r = E.applyMove(s, 'p1', { cell: 7, dir: 1 });
  assert.ok(r.ok);
  assert.deepEqual(r.eaten, { q: 1, d: 3 });
  assert.equal(r.chain, 2);
  assert.deepEqual(s.cells[10], { q: 0, d: 0 });
  assert.deepEqual(s.cells[0], { q: 0, d: 0 }); /* Quan bị ăn */
  assert.deepEqual(s.players[0].bag, { q: 1, d: 3 });
  assert.equal(s.turn, 'p2');
});

test('ăn dây qua ô Quan trống: ăn ô 5, ô kế là ô Quan trống, ô sau có quân → ăn tiếp ô 7', () => {
  const s = fresh();
  set(s, 11, 0, 4); set(s, 4, 0, 0); set(s, 5, 0, 2);
  set(s, 6, 0, 0); /* ô Quan phải trống */
  set(s, 7, 0, 3); set(s, 8, 0, 0); set(s, 9, 0, 0);
  const r = E.applyMove(s, 'p1', { cell: 11, dir: 1 });
  assert.ok(r.ok);
  assert.deepEqual(r.eaten, { q: 0, d: 5 });
  assert.equal(r.chain, 2);
  assert.deepEqual(s.cells[5], { q: 0, d: 0 });
  assert.deepEqual(s.cells[7], { q: 0, d: 0 });
  assert.equal(s.turn, 'p2');
});

test('ăn dây dừng khi gặp ô có quân chặn: ăn ô 10, ô kế ô 11 có quân → dừng', () => {
  const s = fresh();
  set(s, 7, 0, 1); set(s, 8, 0, 0); set(s, 9, 0, 0); set(s, 10, 0, 3); set(s, 11, 0, 2);
  const r = E.applyMove(s, 'p1', { cell: 7, dir: 1 });
  assert.ok(r.ok);
  assert.deepEqual(r.eaten, { q: 0, d: 3 });
  assert.equal(r.chain, 1);
  assert.equal(tot(s, 11), 2); /* không ăn */
});

test('vòng lặp chỉ số: nextCell quấn 11→0 và 0→11; rải 12 quân từ ô 7 sang trái quấn hết vòng', () => {
  assert.equal(E.nextCell(11, 1), 0);
  assert.equal(E.nextCell(0, -1), 11);
  assert.equal(E.nextCell(0, 1), 1);
  const s = fresh();
  set(s, 7, 0, 12);
  const r = E.applyMove(s, 'p1', { cell: 7, dir: -1 });
  assert.ok(r.ok);
  assert.equal(tot(s, 7), 1); /* quân cuối rơi lại đúng ô 7 */
  assert.equal(s.cells[6].d, 1);
  assert.equal(s.turn, 'p2');
});

test('cứu dân đủ điểm: bên p2 hết quân, túi có 7 Dân → rải đều mỗi ô 1, túi còn 2', () => {
  const s = fresh();
  for (const c of [1, 2, 3, 4, 5]) set(s, c, 0, 0);
  s.players[1].bag.d = 7;
  set(s, 7, 0, 1); set(s, 8, 0, 0); set(s, 9, 0, 0); set(s, 10, 0, 0);
  const r = E.applyMove(s, 'p1', { cell: 7, dir: 1 });
  assert.ok(r.ok);
  assert.ok(r.rescue && !r.rescue.failed);
  assert.equal(r.rescue.fromBag, 5); assert.equal(r.rescue.converted, 0); assert.equal(r.rescue.borrowed, 0);
  for (const c of [1, 2, 3, 4, 5]) assert.equal(tot(s, c), 1);
  assert.equal(s.players[1].bag.d, 2);
  assert.equal(s.turn, 'p2');
});

test('cứu dân đổi Quan: túi 2 Dân + 1 Quan → đổi Quan, rải đều, túi còn 7 Dân', () => {
  const s = fresh();
  for (const c of [1, 2, 3, 4, 5]) set(s, c, 0, 0);
  s.players[1].bag = { q: 1, d: 2 };
  set(s, 7, 0, 1); set(s, 8, 0, 0); set(s, 9, 0, 0); set(s, 10, 0, 0);
  const r = E.applyMove(s, 'p1', { cell: 7, dir: 1 });
  assert.ok(r.ok);
  assert.equal(r.rescue.converted, 1); assert.equal(r.rescue.fromBag, 2);
  assert.deepEqual(s.players[1].bag, { q: 0, d: 7 });
  for (const c of [1, 2, 3, 4, 5]) assert.equal(tot(s, c), 1);
});

test('cứu dân vay đối phương: túi 1 Dân, vay 4 Dân của p1 → nợ 4, túi p1 còn 6', () => {
  const s = fresh();
  for (const c of [1, 2, 3, 4, 5]) set(s, c, 0, 0);
  s.players[1].bag = { q: 0, d: 1 };
  s.players[0].bag.d = 10;
  set(s, 7, 0, 1); set(s, 8, 0, 0); set(s, 9, 0, 0); set(s, 10, 0, 0);
  const r = E.applyMove(s, 'p1', { cell: 7, dir: 1 });
  assert.ok(r.ok);
  assert.equal(r.rescue.borrowed, 4); assert.equal(r.rescue.fromBag, 1);
  assert.equal(s.players[1].debt, 4);
  assert.equal(s.players[0].bag.d, 6);
  for (const c of [1, 2, 3, 4, 5]) assert.equal(tot(s, c), 1);
  assert.equal(s.phase, 'playing');
});

test('cứu dân không được: không Dân, không Quan, đối phương chỉ có 3 Dân → ván kết thúc ngay', () => {
  const s = fresh();
  for (const c of [1, 2, 3, 4, 5]) set(s, c, 0, 0);
  s.players[1].bag = { q: 0, d: 0 };
  s.players[0].bag.d = 3;
  set(s, 7, 0, 1); set(s, 8, 0, 0); set(s, 9, 0, 0); set(s, 10, 0, 0); set(s, 11, 0, 0);
  const r = E.applyMove(s, 'p1', { cell: 7, dir: 1 });
  assert.ok(r.ok);
  assert.equal(r.ended, true); assert.equal(r.rescueFailed, true);
  assert.equal(s.phase, 'ended'); assert.equal(s.endReason, 'rescue');
  /* quân trong 2 ô Quan KHÔNG tính cho bên nào */
  const sc = s.scores;
  assert.equal(sc[0].total, 4); /* túi 3 Dân + tàn quân 1 Dân (ô 8 sau khi rải) */
  assert.equal(sc[1].total, 0);
  assert.equal(s.winner, 'p1');
});

test('kết thúc khi cả 2 ô Quan trống + tính điểm tàn quân, Quan 10 vs 5', () => {
  const mkEnd = qv => {
    const s = fresh({ quanValue: qv });
    set(s, 0, 0, 1); set(s, 6, 0, 0); /* chỉ còn 1 Dân ở ô Quan trái */
    set(s, 9, 0, 1); set(s, 10, 0, 0); set(s, 11, 0, 0);
    set(s, 1, 0, 0); set(s, 2, 0, 0);
    s.players[0].bag = { q: 1, d: 4 };
    s.players[1].bag = { q: 0, d: 1 };
    set(s, 7, 0, 1); set(s, 8, 0, 0); /* tàn quân p1: ô 7 có 1 Dân */
    set(s, 3, 0, 2); set(s, 4, 0, 0); set(s, 5, 0, 0); /* tàn quân p2: ô 3 có 2 Dân */
    const r = E.applyMove(s, 'p1', { cell: 9, dir: 1 });
    assert.ok(r.ok); assert.equal(r.ended, true);
    assert.equal(s.phase, 'ended'); assert.equal(s.endReason, 'mandarin');
    return s.scores;
  };
  const sc10 = mkEnd(10), sc5 = mkEnd(5);
  /* p1: túi 1 Quan + 4 Dân + ăn thêm 1 Dân ở ô Quan + tàn quân 1 Dân (ô 7) + ô 10 có 1 Dân sau khi rải */
  assert.equal(sc10[0].total, 10 + 4 + 1 + 2);
  assert.equal(sc5[0].total, 5 + 4 + 1 + 2);
  assert.equal(sc10[1].total, 1 + 2);
  assert.equal(sc10[0].total - sc5[0].total, 5); /* chênh đúng giá trị Quan */
});

test('hoà điểm: 2 bên bằng điểm thì draw, không có winner', () => {
  const s = fresh();
  set(s, 0, 0, 1); set(s, 6, 0, 0);
  set(s, 9, 0, 1); set(s, 10, 0, 0); set(s, 11, 0, 0);
  set(s, 1, 0, 0); set(s, 2, 0, 0);
  s.players[0].bag = { q: 0, d: 0 };
  s.players[1].bag = { q: 0, d: 0 };
  set(s, 7, 0, 0); set(s, 8, 0, 0); set(s, 3, 0, 2); set(s, 4, 0, 0); set(s, 5, 0, 0);
  const r = E.applyMove(s, 'p1', { cell: 9, dir: 1 });
  assert.ok(r.ok && r.ended);
  /* p1: ăn 1 Dân ở ô Quan (túi 1) + tàn quân ô 10 có 1 Dân = 2; p2: tàn quân ô 3 có 2 Dân = 2 */
  assert.equal(s.scores[0].total, 2);
  assert.equal(s.scores[1].total, 2);
  assert.equal(s.winner, null);
  assert.equal(s.draw, true);
});

test('nước đi không hợp lệ: sai lượt, ô trống, ô Quan, ô đối phương, sai hướng', () => {
  const s = fresh();
  assert.equal(E.applyMove(s, 'p2', { cell: 1, dir: 1 }).ok, false); /* sai lượt */
  assert.equal(E.applyMove(s, 'p1', { cell: 0, dir: 1 }).ok, false); /* ô Quan */
  assert.equal(E.applyMove(s, 'p1', { cell: 1, dir: 1 }).ok, false); /* ô đối phương */
  assert.equal(E.applyMove(s, 'p1', { cell: 7, dir: 0 }).ok, false); /* sai hướng */
  set(s, 7, 0, 0);
  assert.equal(E.applyMove(s, 'p1', { cell: 7, dir: 1 }).ok, false); /* ô trống */
});

test('legalMoves chỉ trả ô dân bên mình còn quân, mỗi ô 2 hướng', () => {
  const s = fresh();
  set(s, 7, 0, 0); set(s, 9, 0, 0);
  const ms = E.legalMoves(s, 'p1');
  assert.equal(ms.length, 6); /* 3 ô × 2 hướng */
  assert.ok(ms.every(m => [8, 10, 11].includes(m.cell)));
  assert.equal(E.legalMoves(s, 'p2').length, 0); /* chưa tới lượt p2 */
});

test('cloneState tách biệt: sửa bản sao không ảnh hưởng bản gốc', () => {
  const s = fresh();
  const c = E.cloneState(s);
  c.cells[7].d = 99; c.players[0].bag.d = 99;
  assert.equal(s.cells[7].d, 5);
  assert.equal(s.players[0].bag.d, 0);
});

test('cứu dân đổi Quan với Quan=5: 1 Quan (trị giá 5) đổi được 10 Dân theo đặc tả', () => {
  const s = fresh({ quanValue: 5 });
  for (const c of [1, 2, 3, 4, 5]) set(s, c, 0, 0);
  s.players[1].bag = { q: 1, d: 0 };
  set(s, 7, 0, 1); set(s, 8, 0, 0); set(s, 9, 0, 0); set(s, 10, 0, 0);
  const r = E.applyMove(s, 'p1', { cell: 7, dir: 1 });
  assert.ok(r.ok);
  assert.equal(r.rescue.converted, 1);
  assert.deepEqual(s.players[1].bag, { q: 0, d: 5 }); /* 10 Dân đổi ra, rải 5, còn 5 */
});

test('dirFromNeighbor hàng trên (ô 3): trái=2 → −1, phải=4 → +1; ô không kề → 0', () => {
  assert.equal(E.dirFromNeighbor(3, 2), -1);
  assert.equal(E.dirFromNeighbor(3, 4), 1);
  assert.equal(E.dirFromNeighbor(3, 5), 0);
  assert.equal(E.dirFromNeighbor(3, 3), 0);
});

test('dirFromNeighbor hàng dưới (ô 8): trái=9 → +1, phải=7 → −1 (ngược hàng trên, đúng màn hình)', () => {
  assert.equal(E.dirFromNeighbor(8, 9), 1);  /* ô 9 nằm bên TRÁI ô 8 trên màn hình */
  assert.equal(E.dirFromNeighbor(8, 7), -1); /* ô 7 nằm bên PHẢI ô 8 trên màn hình */
  assert.equal(E.dirFromNeighbor(8, 10), 0);
});

test('dirFromNeighbor ô biên kề ô Quan: ô 7 kề 6/8, ô 11 kề 10/0, ô 1 kề 0/2, ô 5 kề 4/6', () => {
  assert.equal(E.dirFromNeighbor(7, 6), -1);
  assert.equal(E.dirFromNeighbor(7, 8), 1);
  assert.equal(E.dirFromNeighbor(11, 10), -1);
  assert.equal(E.dirFromNeighbor(11, 0), 1);
  assert.equal(E.dirFromNeighbor(1, 0), -1);
  assert.equal(E.dirFromNeighbor(1, 2), 1);
  assert.equal(E.dirFromNeighbor(5, 4), -1);
  assert.equal(E.dirFromNeighbor(5, 6), 1);
  assert.deepEqual(E.neighborCells(7), [6, 8]);
  assert.deepEqual(E.neighborCells(0), [11, 1]);
});

test('resolveHoldClick: bốc ô mình còn quân; ô trống / ô đối phương thì bỏ qua', () => {
  const side = [7, 8, 9, 10, 11];
  assert.deepEqual(E.resolveHoldClick({ heldCell: null, clicked: 8, mySide: side, stones: 5 }), { action: 'pickup' });
  assert.deepEqual(E.resolveHoldClick({ heldCell: null, clicked: 8, mySide: side, stones: 0 }), { action: 'ignore' });
  assert.deepEqual(E.resolveHoldClick({ heldCell: null, clicked: 3, mySide: side, stones: 5 }), { action: 'ignore' });
});

test('resolveHoldClick khi đang bốc: bấm lại ô gốc → đặt xuống; bấm ô kề → rải đúng hướng màn hình; bấm ô khác → giữ nguyên', () => {
  const side = [7, 8, 9, 10, 11];
  /* đang bốc ô 8 (hàng dưới): trái màn hình là ô 9 → dir +1; phải màn hình là ô 7 → dir −1 */
  assert.deepEqual(E.resolveHoldClick({ heldCell: 8, clicked: 8, mySide: side, stones: 0 }), { action: 'putback' });
  assert.deepEqual(E.resolveHoldClick({ heldCell: 8, clicked: 9, mySide: side, stones: 6 }), { action: 'sow', dir: 1 });
  assert.deepEqual(E.resolveHoldClick({ heldCell: 8, clicked: 7, mySide: side, stones: 6 }), { action: 'sow', dir: -1 });
  assert.deepEqual(E.resolveHoldClick({ heldCell: 8, clicked: 10, mySide: side, stones: 3 }), { action: 'ignore' });
  assert.deepEqual(E.resolveHoldClick({ heldCell: 8, clicked: 3, mySide: side, stones: 5 }), { action: 'ignore' });
  /* đang bốc ô 3 (hàng trên): trái màn hình là ô 2 → dir −1; phải màn hình là ô 4 → dir +1 */
  assert.deepEqual(E.resolveHoldClick({ heldCell: 3, clicked: 2, mySide: [1, 2, 3, 4, 5], stones: 6 }), { action: 'sow', dir: -1 });
  assert.deepEqual(E.resolveHoldClick({ heldCell: 3, clicked: 4, mySide: [1, 2, 3, 4, 5], stones: 6 }), { action: 'sow', dir: 1 });
  /* đang bốc ô 7, bấm ô Quan kề 6 (bên phải màn hình) → rải dir −1 */
  assert.deepEqual(E.resolveHoldClick({ heldCell: 7, clicked: 6, mySide: side, stones: 1 }), { action: 'sow', dir: -1 });
});

test('điểm không âm khi nợ lớn hơn tổng có', () => {
  const s = fresh();
  for (const c of [7, 8, 9, 10, 11]) set(s, c, 0, 0); /* dọn tàn quân để chỉ còn túi */
  s.players[0].bag = { q: 0, d: 2 }; s.players[0].debt = 5;
  assert.equal(E.scores(s)[0].total, 0);
});

console.log(`\n${pass} test đạt.`);
