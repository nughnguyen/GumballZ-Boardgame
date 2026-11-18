// Test luật Cờ Vây. Chạy: node covay/test/rules.mjs
// Kiểm đúng luật: khí/ăn quân, cấm tự sát, luật ko, bỏ lượt → tính điểm
// (kiểu Trung Quốc, komi 7,5), đánh dấu quân chết, xin thua, 3 kích thước bàn.
import assert from 'assert/strict';
import * as E from '../js/engine.js';

const P1 = { id: 'p1', name: 'Bạn' }, P2 = { id: 'p2', name: 'Máy', isBot: true };
const fresh = (opts) => E.createGame([P1, P2], opts);
const set = (s, x, y, m) => { s.cells[y * s.size + x] = m; };
const mv = (s, pid, x, y) => E.applyMove(s, pid, { x, y });
const act = (s, pid, a) => E.applyAction(s, pid, a);
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

test('khởi tạo: bàn 19×19 trống 361 giao điểm, Đen (p1) đi trước', () => {
  const s = fresh();
  assert.equal(s.size, 19);
  assert.equal(s.cells.length, 361);
  assert.ok(s.cells.every(c => c === 0));
  assert.equal(s.phase, 'playing');
  assert.equal(s.turn, 'p1');
  assert.deepEqual(s.players.map(p => p.mark), ['B', 'W']);
  assert.equal(E.emptyCount(s), 361);
  assert.equal(E.KOMI, 7.5);
});

test('kích thước bàn 9/13/19 dùng được; size lạ thì về mặc định 19', () => {
  assert.equal(fresh({ size: 9 }).size, 9);
  assert.equal(fresh({ size: 9 }).cells.length, 81);
  assert.equal(fresh({ size: 13 }).size, 13);
  assert.equal(fresh({ size: 13 }).cells.length, 169);
  assert.equal(fresh({ size: 5 }).size, 19);
  assert.equal(fresh({ size: 99 }).size, 19);
  assert.equal(fresh({}).size, 19);
});

test('ăn 1 quân: Trắng ở (4,4) chỉ còn 1 khí, Đen lấp khí cuối thì ăn', () => {
  const s = fresh({ size: 9 });
  set(s, 4, 4, 2);
  set(s, 3, 4, 1); set(s, 5, 4, 1); set(s, 4, 3, 1);
  const r = mv(s, 'p1', 4, 5);
  assert.ok(r.ok && !r.ended);
  assert.equal(r.captured, 1);
  assert.equal(s.cells[4 * 9 + 4], 0); /* quân Trắng bị gỡ */
  assert.equal(s.prisoners.p1, 1);
  assert.equal(s.turn, 'p2');
});

test('ăn cả nhóm: nhóm Trắng 2 quân chỉ còn 1 khí, Đen lấp thì ăn cả 2', () => {
  const s = fresh({ size: 9 });
  set(s, 4, 4, 2); set(s, 5, 4, 2);
  set(s, 3, 4, 1); set(s, 6, 4, 1); set(s, 4, 3, 1); set(s, 5, 3, 1); set(s, 4, 5, 1);
  const r = mv(s, 'p1', 5, 5);
  assert.ok(r.ok);
  assert.equal(r.captured, 2);
  assert.equal(s.cells[4 * 9 + 4], 0);
  assert.equal(s.cells[4 * 9 + 5], 0);
  assert.equal(s.prisoners.p1, 2);
});

/* hình ko chuẩn trên bàn 9×9:
   y=3:         B ở (4,3)
   y=4:    B(3,4) W(4,4) B(5,4)
   y=5:    W(3,5) .(4,5) W(5,5)
   y=6:         W ở (4,6)
   Đen đánh (4,5) thì ăn W(4,4); Trắng đánh lại (4,4) ngay thì phạm ko. */
const koSetup = () => {
  const s = fresh({ size: 9 });
  set(s, 4, 3, 1); set(s, 3, 4, 1); set(s, 5, 4, 1);
  set(s, 4, 4, 2); set(s, 3, 5, 2); set(s, 5, 5, 2); set(s, 4, 6, 2);
  return s;
};
test('luật ko: ăn xong thì đối thủ KHÔNG được đánh lại ngay', () => {
  const s = koSetup();
  const r = mv(s, 'p1', 4, 5);
  assert.ok(r.ok && r.captured === 1);
  assert.equal(s.cells[4 * 9 + 4], 0);
  const bad = mv(s, 'p2', 4, 4);
  assert.equal(bad.ok, false);
  assert.match(bad.reason, /ko/);
  assert.equal(s.cells[4 * 9 + 4], 0); /* bàn không đổi */
  assert.equal(s.turn, 'p2'); /* lượt vẫn là của Trắng */
  /* Trắng đánh chỗ khác thì được */
  assert.ok(mv(s, 'p2', 0, 0).ok);
  /* Đen lấp luôn điểm ko thì được (không phải đánh lại vị trí cũ) */
  assert.ok(mv(s, 'p1', 4, 4).ok);
});

test('luật ko: sau 1 nước bỏ lượt thì được đánh lại (ko đã "xả")', () => {
  const s = koSetup();
  assert.ok(mv(s, 'p1', 4, 5).ok); /* Đen ăn ko */
  assert.ok(act(s, 'p2', { type: 'pass' }).ok); /* Trắng bỏ lượt */
  assert.ok(mv(s, 'p1', 0, 0).ok); /* Đen đánh chỗ khác */
  const r = mv(s, 'p2', 4, 4); /* Trắng ăn lại — bàn có thêm quân Đen ở (0,0) nên không phải vị trí cũ */
  assert.ok(r.ok, 'sau khi đã có nước xen vào thì ăn lại ko được phép');
  assert.equal(r.captured, 1);
});

test('cấm tự sát: Đen đặt vào ô 4 phía đều là Trắng mà không ăn được quân nào', () => {
  const s = fresh({ size: 9 });
  set(s, 3, 4, 2); set(s, 5, 4, 2); set(s, 4, 3, 2); set(s, 4, 5, 2);
  const before = E.serialize(s);
  const r = mv(s, 'p1', 4, 4);
  assert.equal(r.ok, false);
  assert.match(r.reason, /tự sát/);
  assert.equal(E.serialize(s), before); /* bàn không đổi */
  assert.equal(s.turn, 'p1');
  /* nhưng nếu nước đó ăn được quân thì KHÔNG phải tự sát */
  const s2 = fresh({ size: 9 });
  set(s2, 4, 4, 2); /* Trắng 1 quân, khí còn (4,5) */
  set(s2, 3, 4, 1); set(s2, 5, 4, 1); set(s2, 4, 3, 1);
  /* Đen đánh (4,5): ăn Trắng, nhóm Đen mới có khí từ ô vừa ăn — hợp lệ */
  const r2 = mv(s2, 'p1', 4, 5);
  assert.ok(r2.ok && r2.captured === 1);
});

test('nước đi không hợp lệ: ô đã có quân, ngoài bàn, sai lượt', () => {
  const s = fresh({ size: 9 });
  assert.ok(mv(s, 'p1', 4, 4).ok);
  assert.equal(mv(s, 'p2', 4, 4).ok, false); /* ô đã có quân */
  assert.equal(mv(s, 'p2', 9, 0).ok, false); /* ngoài bàn */
  assert.equal(mv(s, 'p2', -1, 0).ok, false);
  assert.equal(mv(s, 'p1', 0, 0).ok, false); /* sai lượt */
  assert.equal(mv(s, 'p2', 0.5, 0).ok, false); /* tọa độ không nguyên */
});

/* vòng Đen 8 quân quanh (2,2) + 1 quân Trắng ở (8,8) — bàn 9×9 */
const ringSetup = (whiteInside) => {
  const s = fresh({ size: 9 });
  for (const [x, y] of [[1, 1], [2, 1], [3, 1], [1, 2], [3, 2], [1, 3], [2, 3], [3, 3]]) set(s, x, y, 1);
  if (whiteInside) set(s, 2, 2, 2);
  else set(s, 8, 8, 2);
  return s;
};
test('bỏ lượt 2 lần liên tiếp thì vào tính điểm; đánh tiếp thì không được', () => {
  const s = ringSetup(false);
  assert.ok(act(s, 'p1', { type: 'pass' }).ok);
  assert.equal(s.phase, 'playing');
  assert.equal(s.passes, 1);
  const r = act(s, 'p2', { type: 'pass' });
  assert.ok(r.ok && r.scoring);
  assert.equal(s.phase, 'scoring');
  assert.equal(mv(s, 'p1', 0, 0).ok, false);
  assert.equal(act(s, 'p1', { type: 'pass' }).ok, false);
});

test('tính điểm kiểu Trung Quốc: đá + đất + komi 7,5; đất trong vòng Đen tính cho Đen', () => {
  const s = ringSetup(false);
  act(s, 'p1', { type: 'pass' }); act(s, 'p2', { type: 'pass' });
  const sc = E.computeScores(s);
  const b = sc.find(x => x.mark === 'B'), w = sc.find(x => x.mark === 'W');
  assert.equal(b.stones, 8);
  assert.equal(b.territory, 1); /* ô (2,2) trong vòng Đen */
  assert.equal(b.komi, 0);
  assert.equal(b.total, 9);
  assert.equal(w.stones, 1);
  assert.equal(w.territory, 0);
  assert.equal(w.komi, 7.5);
  assert.equal(w.total, 8.5);
  /* chốt điểm: Đen thắng 9 – 8,5, không hòa nhờ komi */
  const r = act(s, 'p1', { type: 'finish' });
  assert.ok(r.ok && r.ended);
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'p1');
  assert.equal(s.endReason, 'scored');
  assert.equal(s.draw, false);
});

test('đánh dấu quân chết: quân Trắng trong vòng Đen bị gỡ, tính là tù binh của Đen', () => {
  const s = ringSetup(true); /* Trắng ở (2,2) trong vòng Đen */
  act(s, 'p1', { type: 'pass' }); act(s, 'p2', { type: 'pass' });
  /* chưa đánh dấu: Trắng vẫn có 1 đá, đất trong vòng là 0 (ô (2,2) có quân) */
  let sc = E.computeScores(s);
  assert.equal(sc.find(x => x.mark === 'W').stones, 1);
  assert.equal(sc.find(x => x.mark === 'B').territory, 0);
  /* đánh dấu chết quân Trắng ở (2,2) */
  assert.ok(act(s, 'p2', { type: 'toggleDead', x: 2, y: 2 }).ok);
  assert.deepEqual(s.dead, [2 * 9 + 2]);
  sc = E.computeScores(s);
  assert.equal(sc.find(x => x.mark === 'W').stones, 0);
  assert.equal(sc.find(x => x.mark === 'B').territory, 1); /* ô (2,2) giờ là đất Đen */
  assert.equal(sc.find(x => x.mark === 'B').prisoners, 1); /* quân chết tính là tù binh của Đen */
  assert.equal(sc.find(x => x.mark === 'B').total, 9);
  assert.equal(sc.find(x => x.mark === 'W').total, 7.5);
  /* bấm lại thì gỡ đánh dấu */
  assert.ok(act(s, 'p1', { type: 'toggleDead', x: 2, y: 2 }).ok);
  assert.deepEqual(s.dead, []);
  /* đánh dấu ô trống thì bị từ chối */
  assert.equal(act(s, 'p1', { type: 'toggleDead', x: 0, y: 0 }).ok, false);
});

test('komi quyết định: bàn chỉ có 1 quân mỗi bên, đất chung không tính — Trắng thắng nhờ komi', () => {
  const s = fresh({ size: 9 });
  set(s, 4, 4, 1); set(s, 0, 0, 2);
  act(s, 'p1', { type: 'pass' }); act(s, 'p2', { type: 'pass' });
  const sc = E.computeScores(s);
  assert.equal(sc.find(x => x.mark === 'B').territory, 0); /* đất chung (dame) không tính */
  assert.equal(sc.find(x => x.mark === 'W').territory, 0);
  assert.equal(sc.find(x => x.mark === 'B').total, 1);
  assert.equal(sc.find(x => x.mark === 'W').total, 8.5);
  act(s, 'p1', { type: 'finish' });
  assert.equal(s.winner, 'p2');
});

test('đất ở góc bàn: tường Đen chạm mép bàn thì vùng góc tính là đất Đen', () => {
  const s = fresh({ size: 9 });
  /* tường Đen từ mép trái sang mép trên, vây góc trái-trên (9 ô) */
  for (const [x, y] of [[0, 3], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [3, 0]]) set(s, x, y, 1);
  set(s, 8, 8, 2); /* Trắng ở góc đối diện — đất ngoài tường thành đất chung */
  act(s, 'p1', { type: 'pass' }); act(s, 'p2', { type: 'pass' });
  const sc = E.computeScores(s);
  assert.equal(sc.find(x => x.mark === 'B').stones, 7);
  assert.equal(sc.find(x => x.mark === 'B').territory, 9);
  assert.equal(sc.find(x => x.mark === 'B').total, 16);
  assert.equal(sc.find(x => x.mark === 'W').territory, 0);
  assert.equal(sc.find(x => x.mark === 'W').total, 8.5);
});

test('đánh tiếp: từ tính điểm quay lại đánh, quân chết được gỡ, số lượt bỏ về 0', () => {
  const s = ringSetup(true);
  act(s, 'p1', { type: 'pass' }); act(s, 'p2', { type: 'pass' });
  act(s, 'p1', { type: 'toggleDead', x: 2, y: 2 });
  assert.equal(s.dead.length, 1);
  const r = act(s, 'p2', { type: 'resume' });
  assert.ok(r.ok && !r.ended);
  assert.equal(s.phase, 'playing');
  assert.deepEqual(s.dead, []);
  assert.equal(s.passes, 0);
  assert.ok(mv(s, 'p1', 0, 0).ok); /* đánh tiếp được bình thường */
});

test('xin thua: người xin thua thì thua ngay, đối thủ thắng', () => {
  const s = fresh({ size: 9 });
  mv(s, 'p1', 4, 4); mv(s, 'p2', 0, 0);
  const r = act(s, 'p1', { type: 'resign' });
  assert.ok(r.ok && r.ended);
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'p2');
  assert.equal(s.endReason, 'resign');
  assert.equal(mv(s, 'p2', 1, 1).ok, false);
  assert.equal(act(s, 'p1', { type: 'pass' }).ok, false);
});

test('legalMoves: không chứa điểm tự sát, không chứa điểm phạm ko', () => {
  /* điểm tự sát */
  const s = fresh({ size: 9 });
  set(s, 3, 4, 2); set(s, 5, 4, 2); set(s, 4, 3, 2); set(s, 4, 5, 2);
  assert.ok(!E.legalMoves(s, 'p1').some(m => m.x === 4 && m.y === 4));
  assert.equal(E.legalMoves(s, 'p2').length, 0); /* chưa tới lượt p2 */
  assert.equal(E.legalMoves(s, 'p1').length, 81 - 4 - 1); /* 81 ô trừ 4 quân Trắng, trừ 1 điểm tự sát */
  /* điểm ko */
  const k = koSetup();
  mv(k, 'p1', 4, 5); /* Đen ăn ko */
  assert.ok(!E.legalMoves(k, 'p2').some(m => m.x === 4 && m.y === 4));
});

test('serialize/deserialize: JSON đi-về giữ nguyên trạng thái', () => {
  const s = fresh({ size: 9 });
  mv(s, 'p1', 4, 4); mv(s, 'p2', 0, 0); mv(s, 'p1', 5, 5);
  const json = E.serialize(s);
  assert.equal(typeof json, 'string');
  const back = E.deserialize(json);
  assert.deepEqual(back, s);
  assert.throws(() => E.deserialize('{"size":5,"cells":[1,2],"players":[]}'));
  assert.throws(() => E.deserialize('không phải json'));
});

test('cloneState tách biệt; counts đếm đúng số đá mỗi bên', () => {
  const s = fresh({ size: 9 });
  mv(s, 'p1', 1, 1); mv(s, 'p2', 2, 2); mv(s, 'p1', 3, 3);
  const c = E.cloneState(s);
  c.cells[0] = 2;
  assert.equal(s.cells[0], 0);
  assert.deepEqual(E.counts(s), { B: 2, W: 1 });
});

test('viewFor: có myMark/size, scorePreview chỉ có trong lúc tính điểm', () => {
  const s = fresh({ size: 13 });
  let v = E.viewFor(s, 'p1');
  assert.equal(v.myMark, 'B');
  assert.equal(v.size, 13);
  assert.equal(v.scorePreview, null);
  assert.equal(E.viewFor(s, 'p2').myMark, 'W');
  act(s, 'p1', { type: 'pass' }); act(s, 'p2', { type: 'pass' });
  v = E.viewFor(s, 'p1');
  assert.equal(v.phase, 'scoring');
  assert.ok(Array.isArray(v.scorePreview) && v.scorePreview.length === 2);
  assert.equal(v.scorePreview.find(x => x.mark === 'W').total, 7.5); /* bàn trống: Trắng thắng nhờ komi */
});

test('applyAction lạ / sai lượt đều bị từ chối', () => {
  const s = fresh({ size: 9 });
  for (const a of [{ type: 'fire', x: 1, y: 1 }, { type: 'move', x: 10, y: 1 }, null, { x: 1, y: 1 }, { type: 'finish' }]) {
    assert.equal(act(s, 'p1', a).ok, false);
  }
  assert.equal(act(s, 'p2', { type: 'move', x: 1, y: 1 }).ok, false); /* sai lượt */
  assert.equal(act(s, 'p2', { type: 'pass' }).ok, false);
});

test('hoshi + tên tọa độ: điểm sao đúng, cột bỏ chữ I', () => {
  assert.deepEqual(E.hoshiPoints(9), [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]]);
  assert.equal(E.hoshiPoints(19).length, 9);
  assert.equal(E.colLabel(0), 'A');
  assert.equal(E.colLabel(7), 'H');
  assert.equal(E.colLabel(8), 'J'); /* bỏ chữ I */
  assert.equal(E.colLabel(18), 'T');
  assert.equal(E.coordName(8, 3), 'J4');
});

console.log(`\n${pass} test đạt.`);
