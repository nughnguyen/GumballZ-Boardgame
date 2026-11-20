// Test luật Cờ Đam. Chạy: node codam/test/rules.mjs
// Kiểm đúng luật: xuất phát, đi chéo 1 ô về trước, ăn bắt buộc (cả phe),
// nhảy nhiều lần (đúng quân đó), phong Vua (dừng lượt, đi mọi hướng),
// thắng (ăn hết / chặn hết nước), hòa (đồng ý / 40 nước / lặp vị trí),
// xin thua, serialize/deserialize, viewFor.
import assert from 'assert/strict';
import * as E from '../js/engine.js';

const P1 = { id: 'p1', name: 'Đỏ' }, P2 = { id: 'p2', name: 'Đen', isBot: true };
const fresh = (opts) => E.createGame([P1, P2], opts);
const set = (s, x, y, v) => { s.cells[y * 8 + x] = v; };
const mv = (s, pid, fx, fy, tx, ty) => E.applyMove(s, pid, { from: { x: fx, y: fy }, to: { x: tx, y: ty } });
const act = (s, pid, a) => E.applyAction(s, pid, a);
const clear = s => { s.cells.fill(0); };
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

test('khởi tạo: 24 quân đúng vị trí ô tối, Đỏ (p1) đi trước, 7 nước mở đầu', () => {
  const s = fresh();
  assert.equal(s.cells.length, 64);
  assert.equal(s.phase, 'playing');
  assert.equal(s.turn, 'p1');
  assert.deepEqual(s.players.map(p => p.side), ['R', 'B']);
  assert.deepEqual(E.counts(s), { R: 12, B: 12, RK: 0, BK: 0, Rtotal: 12, Btotal: 12 });
  /* Đen 3 hàng trên (y 0..2), Đỏ 3 hàng dưới (y 5..7), chỉ ô tối */
  assert.equal(E.pieceAt(s.cells, 1, 0), -1);
  assert.equal(E.pieceAt(s.cells, 0, 0), 0);
  assert.equal(E.pieceAt(s.cells, 0, 5), 1);
  assert.equal(E.pieceAt(s.cells, 0, 7), 1);
  assert.equal(E.pieceAt(s.cells, 7, 7), 0);
  assert.equal(E.legalMoves(s, 'p1').length, 7);
  assert.equal(E.legalMoves(s, 'p2').length, 0); /* chưa tới lượt Đen */
  assert.equal(s.timer, 0);
});

test('chọn phe: side=black thì p1 cầm Đen, p2 (Đỏ) đi trước', () => {
  const s = fresh({ side: 'black' });
  assert.deepEqual(s.players.map(p => p.side), ['B', 'R']);
  assert.equal(s.turn, 'p2'); /* Đỏ đi trước */
  const s2 = fresh({ side: 'red', timer: 60 });
  assert.equal(s2.timer, 60);
  const rSide = fresh({ side: 'random' }).players[0].side;
  assert.ok(rSide === 'R' || rSide === 'B');
});

test('quân thường đi chéo 1 ô về trước; đi ngang/dọc/lùi/2 ô/ô sáng đều bị từ chối', () => {
  const s = fresh();
  const r = mv(s, 'p1', 0, 5, 1, 4); /* Đỏ tiến chéo 1 ô */
  assert.ok(r.ok && !r.ended && r.captured === 0);
  assert.equal(s.cells[4 * 8 + 1], 1);
  assert.equal(s.cells[5 * 8 + 0], 0);
  assert.equal(s.turn, 'p2');
  assert.equal(s.moveCount, 1);
  assert.deepEqual(s.lastMove.from, { x: 0, y: 5 });
  assert.deepEqual(s.lastMove.to, { x: 1, y: 4 });
  const s2 = fresh();
  assert.equal(mv(s2, 'p1', 0, 5, 1, 5).ok, false); /* đi ngang */
  assert.equal(mv(s2, 'p1', 0, 5, 0, 4).ok, false); /* đi dọc */
  assert.equal(mv(s2, 'p1', 0, 5, 1, 6).ok, false); /* quân thường không đi lùi */
  assert.equal(mv(s2, 'p1', 0, 5, 2, 3).ok, false); /* 2 ô không nhảy */
  assert.equal(mv(s2, 'p1', 0, 5, 0, 5).ok, false); /* đứng yên */
  assert.equal(mv(s2, 'p1', 1, 0, 2, 1).ok, false); /* quân Đen, sai lượt + sai phe */
  assert.equal(mv(s2, 'p2', 1, 0, 2, 1).ok, false); /* sai lượt */
  assert.equal(mv(s2, 'p1', 4, 4, 5, 3).ok, false); /* ô trống, không có quân */
});

test('ăn quân: nhảy qua địch sang ô trống phía sau, quân bị ăn biến mất', () => {
  const s = fresh(); clear(s);
  set(s, 3, 4, 1); set(s, 4, 3, -1); /* Đỏ kề Đen chéo trước */
  const r = mv(s, 'p1', 3, 4, 5, 2);
  assert.ok(r.ok && r.captured === 1);
  assert.equal(s.cells[2 * 8 + 5], 1);
  assert.equal(s.cells[3 * 8 + 4], 0); /* ô đích trống trước đó */
  assert.equal(s.captured.p1.length, 1);
  assert.equal(s.captured.p1[0].king, false);
  /* nhảy khi ô đích bị chặn thì không được */
  const s2 = fresh(); clear(s2);
  set(s2, 3, 4, 1); set(s2, 4, 3, -1); set(s2, 5, 2, 1); /* ô đích có quân mình */
  assert.equal(mv(s2, 'p1', 3, 4, 5, 2).ok, false);
  /* nhảy qua quân mình thì không được */
  const s3 = fresh(); clear(s3);
  set(s3, 3, 4, 1); set(s3, 4, 3, 1);
  assert.equal(mv(s3, 'p1', 3, 4, 5, 2).ok, false);
  /* quân thường không ăn lùi */
  const s4 = fresh(); clear(s4);
  set(s4, 3, 4, 1); set(s4, 4, 5, -1); /* Đen ở phía sau */
  assert.equal(mv(s4, 'p1', 3, 4, 5, 6).ok, false);
});

test('ăn là BẮT BUỘC cả phe: có nước ăn ở quân khác thì không được đi thường', () => {
  const s = fresh(); clear(s);
  set(s, 3, 4, 1); set(s, 4, 3, -1); /* quân A ăn được */
  set(s, 1, 6, 1); /* quân B đi thường được */
  const all = E.legalMoves(s, 'p1');
  assert.ok(all.length > 0 && all.every(m => m.capture));
  assert.equal(mv(s, 'p1', 1, 6, 0, 5).ok, false); /* đi thường bị từ chối */
  assert.equal(mv(s, 'p1', 1, 6, 2, 5).ok, false);
  assert.ok(mv(s, 'p1', 3, 4, 5, 2).ok);
  /* legalMovesFrom của quân không ăn được thì trả rỗng khi phe có nước ăn */
  const s2 = fresh(); clear(s2);
  set(s2, 3, 4, 1); set(s2, 4, 3, -1); set(s2, 1, 6, 1);
  assert.equal(E.legalMovesFrom(s2, 'p1', 1, 6).length, 0);
  assert.equal(E.legalMovesFrom(s2, 'p1', 3, 4).length, 1);
  assert.equal(E.mustCaptureNow(s2), true);
});

test('nhảy nhiều lần: ăn xong còn ăn tiếp thì PHẢI ăn tiếp bằng đúng quân đó', () => {
  const s = fresh(); clear(s);
  set(s, 2, 5, 1); set(s, 3, 4, -1); set(s, 5, 2, -1);
  /* Đỏ (2,5) ăn (3,4) → (4,3), rồi ăn tiếp (5,2) → (6,1) */
  let r = mv(s, 'p1', 2, 5, 4, 3);
  assert.ok(r.ok && r.continued === true && !r.ended);
  assert.deepEqual(s.midJump, { x: 4, y: 3 });
  assert.equal(s.turn, 'p1'); /* lượt chưa đổi */
  assert.equal(E.legalMoves(s, 'p1').length, 1);
  /* ép đi quân khác trong lúc nhảy dở thì bị từ chối */
  set(s, 0, 5, 1);
  assert.equal(mv(s, 'p1', 0, 5, 1, 4).ok, false);
  /* ép đi thường bằng đúng quân đang nhảy thì bị từ chối (phải ăn) */
  assert.equal(mv(s, 'p1', 4, 3, 3, 2).ok, false);
  r = mv(s, 'p1', 4, 3, 6, 1);
  assert.ok(r.ok && !r.continued);
  assert.equal(s.midJump, null);
  assert.equal(s.turn, 'p2');
  assert.equal(s.captured.p1.length, 2);
  assert.equal(E.counts(s).Btotal, 0);
  assert.equal(s.phase, 'ended'); /* ăn hết quân Đen */
  assert.equal(s.winner, 'p1');
  assert.equal(s.endReason, 'capture');
});

test('phong Vua: lên hàng cuối thì thành Vua, DỪNG lượt ngay (không nhảy tiếp)', () => {
  const s = fresh(); clear(s);
  set(s, 1, 2, 1); set(s, 2, 1, -1); /* Đỏ ăn lên (3,0) = hàng cuối */
  let r = mv(s, 'p1', 1, 2, 3, 0);
  assert.ok(r.ok && r.crowned === true && !r.continued);
  assert.equal(s.cells[0 * 8 + 3], 2); /* thành Vua Đỏ */
  assert.equal(s.turn, 'p2');
  /* Vua đi và ăn chéo mọi hướng, kể cả lùi */
  const s2 = fresh(); clear(s2);
  set(s2, 2, 3, 2); /* Vua Đỏ */
  set(s2, 3, 4, -1); /* Đen phía sau */
  assert.ok(mv(s2, 'p1', 2, 3, 4, 5).ok); /* Vua ăn lùi */
  assert.equal(s2.cells[5 * 8 + 4], 2);
  const s3 = fresh(); clear(s3);
  set(s3, 2, 3, 2);
  assert.ok(mv(s3, 'p1', 2, 3, 1, 4).ok); /* Vua đi lùi thường */
  const s4 = fresh(); clear(s4);
  set(s4, 2, 3, 2);
  assert.ok(mv(s4, 'p1', 2, 3, 3, 2).ok); /* Vua đi tiến thường */
  /* quân thường tới hàng cuối bằng nước đi thường cũng phong Vua */
  const s5 = fresh(); clear(s5);
  set(s5, 2, 1, 1);
  const r5 = mv(s5, 'p1', 2, 1, 1, 0);
  assert.ok(r5.ok && r5.crowned);
  assert.equal(s5.cells[0 * 8 + 1], 2);
});

test('thắng khi chặn địch hết nước đi (blocked)', () => {
  const s = fresh(); clear(s);
  /* Vua Đen (1,0) bị kẹp: 2 ô đi (0,1),(2,1) đều có quân Đỏ, nhảy qua (2,1) thì ô đáp (3,2) cũng có quân Đỏ */
  set(s, 1, 0, -2); set(s, 0, 1, 1); set(s, 2, 1, 1); set(s, 3, 2, 1);
  set(s, 4, 5, 1);
  const r = mv(s, 'p1', 4, 5, 3, 4);
  assert.ok(r.ok && r.ended);
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'p1');
  assert.equal(s.endReason, 'blocked');
  assert.equal(E.legalMoves(s, 'p2').length, 0);
});

test('xin thua: người xin thua thì thua ngay', () => {
  const s = fresh();
  mv(s, 'p1', 0, 5, 1, 4);
  const r = act(s, 'p2', { type: 'resign' });
  assert.ok(r.ok && r.ended);
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'p1');
  assert.equal(s.endReason, 'resign');
  assert.equal(mv(s, 'p1', 1, 4, 0, 3).ok, false); /* ván đã kết thúc */
  assert.equal(act(s, 'p2', { type: 'resign' }).ok, false);
});

test('hòa: đề nghị → đồng ý thì hòa; từ chối thì đánh tiếp; rút đề nghị được', () => {
  const s = fresh();
  let r = act(s, 'p1', { type: 'draw' });
  assert.ok(r.ok && r.offered);
  assert.equal(s.drawOffer, 'p1');
  /* người đề nghị bấm lại = rút */
  r = act(s, 'p1', { type: 'draw' });
  assert.ok(r.ok && r.cancelled);
  assert.equal(s.drawOffer, null);
  /* đề nghị lại, đối thủ đồng ý */
  act(s, 'p1', { type: 'draw' });
  r = act(s, 'p2', { type: 'draw' });
  assert.ok(r.ok && r.ended && r.agreed);
  assert.equal(s.phase, 'ended');
  assert.equal(s.draw, true);
  assert.equal(s.endReason, 'draw-agree');
  assert.equal(s.winner, null);
  const s2 = fresh();
  act(s2, 'p1', { type: 'draw' });
  r = act(s2, 'p2', { type: 'draw-decline' });
  assert.ok(r.ok && r.declined);
  assert.equal(s2.drawOffer, null);
  assert.equal(s2.phase, 'playing');
  /* từ chối khi không có đề nghị thì bị từ chối */
  assert.equal(act(s2, 'p2', { type: 'draw-decline' }).ok, false);
  /* người đề nghị không tự từ chối được */
  act(s2, 'p1', { type: 'draw' });
  assert.equal(act(s2, 'p1', { type: 'draw-decline' }).ok, false);
});

test('hòa 40 nước không ăn quân nào (quietPlies >= 80)', () => {
  const s = fresh(); clear(s);
  set(s, 2, 1, 2); set(s, 5, 6, -2); /* 2 Vua đi qua đi lại */
  s.quietPlies = 78;
  let r = mv(s, 'p1', 2, 1, 1, 0); /* nước 79 */
  assert.ok(r.ok && !r.ended);
  r = mv(s, 'p2', 5, 6, 4, 7); /* nước 80 → hòa */
  assert.ok(r.ok && r.ended);
  assert.equal(s.phase, 'ended');
  assert.equal(s.draw, true);
  assert.equal(s.endReason, 'draw-40');
  /* ăn quân reset quietPlies */
  const s2 = fresh(); clear(s2);
  set(s2, 3, 4, 1); set(s2, 4, 3, -1);
  s2.quietPlies = 50;
  mv(s2, 'p1', 3, 4, 5, 2);
  assert.equal(s2.quietPlies, 0);
});

test('hòa lặp lại vị trí 3 lần (hash >= 3)', () => {
  const s = fresh(); clear(s);
  set(s, 2, 1, 2); set(s, 5, 6, -2);
  /* Vua Đỏ đi qua lại (2,1)-(1,0), Vua Đen đi qua lại (5,6)-(4,7).
     Lưu ý: hash ban đầu trong s.hashes là của bàn xuất phát chuẩn, nên vị
     trí tự đặt này phải lặp đủ 3 lần mới hòa (12 nước = 3 chu kỳ). */
  const cycle = () => {
    mv(s, 'p1', 2, 1, 1, 0);
    mv(s, 'p2', 5, 6, 4, 7);
    mv(s, 'p1', 1, 0, 2, 1);
    return mv(s, 'p2', 4, 7, 5, 6);
  };
  let r = cycle(); /* lần 1 */
  assert.ok(r.ok && !r.ended);
  r = cycle(); /* lần 2 */
  assert.ok(r.ok && !r.ended);
  /* lần 3: vị trí sau nước đầu tiên của chu kỳ đã lặp đủ 3 lần → hòa ngay
     ở nước thứ 9 (không phải nước 12) vì mọi vị trí trong chu kỳ đều lặp. */
  r = mv(s, 'p1', 2, 1, 1, 0);
  assert.ok(r.ok && r.ended);
  assert.equal(s.phase, 'ended');
  assert.equal(s.draw, true);
  assert.equal(s.endReason, 'draw-rep');
});

test('legalMovesFrom: chỉ nước của quân đó; quân bị chặn thì không có nước', () => {
  const s = fresh();
  const m = E.legalMovesFrom(s, 'p1', 0, 5);
  assert.equal(m.length, 1);
  assert.deepEqual([m[0].tx, m[0].ty], [1, 4]);
  assert.equal(E.legalMovesFrom(s, 'p1', 4, 4).length, 0); /* ô trống */
  assert.equal(E.legalMovesFrom(s, 'p1', 1, 0).length, 0); /* quân Đen */
  assert.equal(E.legalMovesFrom(s, 'p2', 0, 5).length, 0); /* sai lượt */
  /* quân bị chặn hết */
  const s2 = fresh(); clear(s2);
  set(s2, 2, 3, 1); set(s2, 1, 2, 1); set(s2, 3, 2, 1);
  assert.equal(E.legalMovesFrom(s2, 'p1', 2, 3).length, 0);
});

test('serialize/deserialize: JSON đi-về giữ nguyên trạng thái', () => {
  const s = fresh();
  mv(s, 'p1', 0, 5, 1, 4); mv(s, 'p2', 1, 2, 0, 3); mv(s, 'p1', 1, 4, 2, 3);
  const json = E.serialize(s);
  assert.equal(typeof json, 'string');
  const back = E.deserialize(json);
  assert.deepEqual(back, s);
  assert.throws(() => E.deserialize('{"cells":[1,2],"players":[]}'));
  assert.throws(() => E.deserialize('không phải json'));
});

test('cloneState tách biệt; viewFor có mySide/captured/midJump/drawOffer', () => {
  const s = fresh();
  mv(s, 'p1', 0, 5, 1, 4);
  const c = E.cloneState(s);
  c.cells[0] = 1;
  assert.equal(s.cells[0], 0); /* ô (0,0) trống, không đổi */
  const v = E.viewFor(s, 'p1');
  assert.equal(v.mySide, 'R');
  assert.equal(E.viewFor(s, 'p2').mySide, 'B');
  assert.deepEqual(v.captured, { p1: [], p2: [] });
  assert.equal(v.cells.length, 64);
  assert.equal(v.midJump, null);
  assert.equal(v.drawOffer, null);
  assert.equal(v.mustCapture, false);
});

test('applyAction lạ / sai lượt đều bị từ chối', () => {
  const s = fresh();
  for (const a of [{ type: 'fire' }, { type: 'move', from: { x: 0, y: 5 }, to: { x: 9, y: 9 } }, null, { from: { x: 0, y: 5 } }, { type: 'move', from: { x: 0.5, y: 5 }, to: { x: 1, y: 4 } }]) {
    assert.equal(act(s, 'p1', a).ok, false);
  }
  assert.equal(act(s, 'p2', { type: 'move', from: { x: 1, y: 2 }, to: { x: 0, y: 3 } }).ok, false); /* sai lượt */
});

test('khay quân đã ăn: ăn 2 quân thì khay ghi đủ 2, có ghi Vua', () => {
  const s = fresh(); clear(s);
  set(s, 2, 5, 1); set(s, 3, 4, -2); set(s, 5, 2, -1); /* Vua Đen + quân Đen */
  mv(s, 'p1', 2, 5, 4, 3); /* ăn Vua */
  mv(s, 'p1', 4, 3, 6, 1); /* ăn tiếp quân thường */
  assert.equal(s.captured.p1.length, 2);
  assert.equal(s.captured.p1[0].king, true);
  assert.equal(s.captured.p1[1].king, false);
});

console.log(`\n${pass} test đạt.`);
