// Test đồng bộ online Cờ Vây (mô phỏng 2 máy). Chạy: node covay/test/net.mjs
// 2 engine chạy cùng 1 chuỗi action {type, x?, y?} → serialize state 2 bên
// phải giống hệt nhau sau MỖI action, kể cả bỏ lượt, xin thua và đánh dấu
// quân chết trong lúc tính điểm. Action JSON đi-về (stringify/parse) không đổi.
import assert from 'assert/strict';
import * as E from '../js/engine.js';

const P1 = { id: 'p1', name: 'Bạn' }, P2 = { id: 'p2', name: 'Máy', isBot: true };
const mkPair = (opts) => {
  const a = E.createGame([P1, P2], opts), b = E.createGame([P1, P2], opts);
  a.gid = b.gid = 'net-test'; /* gid ngẫu nhiên khi tạo — ép bằng nhau để so sánh */
  return [a, b];
};
const applyBoth = (pair, pid, a) => {
  const rs = pair.map(s => E.applyAction(s, pid, a));
  assert.ok(rs[0].ok && rs[1].ok, `action ${JSON.stringify(a)} phải hợp lệ cả 2 bên (lỗi: ${rs[0].reason || rs[1].reason})`);
  assert.deepEqual(E.serialize(pair[0]), E.serialize(pair[1]), `state 2 bên lệch nhau sau action ${JSON.stringify(a)}`);
  return rs[0];
};
const applyBothExpectFail = (pair, pid, a) => {
  const rs = pair.map(s => E.applyAction(s, pid, a));
  assert.equal(rs[0].ok, false);
  assert.equal(rs[1].ok, false);
  assert.deepEqual(E.serialize(pair[0]), E.serialize(pair[1]), `state 2 bên lệch nhau sau action lỗi ${JSON.stringify(a)}`);
};
/* RNG có seed (mulberry32) để ván ngẫu nhiên chạy lại giống hệt nhau */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

test('đánh thường xen kẽ: state giống hệt sau mỗi nước', () => {
  const pair = mkPair({ size: 9 });
  const seq = [
    ['p1', { type: 'move', x: 4, y: 4 }], ['p2', { type: 'move', x: 3, y: 3 }],
    ['p1', { type: 'move', x: 5, y: 5 }], ['p2', { type: 'move', x: 3, y: 4 }],
    ['p1', { type: 'move', x: 4, y: 3 }], ['p2', { type: 'move', x: 0, y: 0 }],
    ['p1', { type: 'move', x: 6, y: 6 }], ['p2', { type: 'move', x: 8, y: 8 }],
  ];
  for (const [pid, a] of seq) applyBoth(pair, pid, a);
  assert.equal(pair[0].turn, 'p1');
  assert.deepEqual(E.counts(pair[0]), { B: 4, W: 4 });
});

test('ăn quân + luật ko đồng bộ cả 2 bên', () => {
  const pair = mkPair({ size: 9 });
  const setBoth = (x, y, m) => { for (const s of pair) s.cells[y * 9 + x] = m; };
  setBoth(4, 3, 1); setBoth(3, 4, 1); setBoth(5, 4, 1);
  setBoth(4, 4, 2); setBoth(3, 5, 2); setBoth(5, 5, 2); setBoth(4, 6, 2);
  const r = applyBoth(pair, 'p1', { type: 'move', x: 4, y: 5 });
  assert.equal(r.captured, 1);
  applyBothExpectFail(pair, 'p2', { type: 'move', x: 4, y: 4 }); /* phạm ko, cả 2 bên cùng từ chối */
  applyBoth(pair, 'p2', { type: 'move', x: 0, y: 0 });
  assert.equal(pair[0].prisoners.p1, 1);
});

test('10 ván ngẫu nhiên có seed trên 9×9: state khớp sau MỖI action', () => {
  for (let g = 0; g < 10; g++) {
    const pair = mkPair({ size: 9 });
    const r = rng(1000 + g);
    let n = 0;
    while (pair[0].phase === 'playing' && n < 40) {
      const pid = pair[0].turn;
      const moves = E.legalMoves(pair[0], pid);
      if (!moves.length || r() < 0.1) { /* thỉnh thoảng bỏ lượt */
        const a = { type: 'pass' };
        const rs = pair.map(s => E.applyAction(s, pid, a));
        assert.ok(rs[0].ok && rs[1].ok);
        assert.deepEqual(E.serialize(pair[0]), E.serialize(pair[1]), `ván ${g}: lệch sau bỏ lượt`);
      } else {
        const m = moves[Math.floor(r() * moves.length)];
        applyBoth(pair, pid, { type: 'move', x: m.x, y: m.y });
      }
      n++;
      if (pair[0].phase === 'scoring') break;
    }
    assert.deepEqual(E.serialize(pair[0]), E.serialize(pair[1]), `ván ${g}: lệch cuối`);
  }
});

test('tính điểm online: bỏ lượt 2 lần → đánh dấu chết → chốt điểm, 2 bên cùng kết quả', () => {
  const pair = mkPair({ size: 9 });
  const r = rng(42);
  let n = 0;
  while (pair[0].phase === 'playing' && n < 20) {
    const pid = pair[0].turn;
    const moves = E.legalMoves(pair[0], pid);
    if (!moves.length) break;
    const m = moves[Math.floor(r() * moves.length)];
    applyBoth(pair, pid, { type: 'move', x: m.x, y: m.y });
    n++;
  }
  /* 2 lần bỏ lượt → tính điểm */
  const p1 = pair[0].turn;
  const p2 = p1 === 'p1' ? 'p2' : 'p1';
  applyBoth(pair, p1, { type: 'pass' });
  const sc = applyBoth(pair, p2, { type: 'pass' });
  assert.ok(sc.scoring);
  assert.equal(pair[0].phase, 'scoring');
  /* đánh dấu chết 1 nhóm bất kỳ có trên bàn (nếu có), rồi gỡ, rồi đánh dấu lại */
  const occ = [];
  pair[0].cells.forEach((c, i) => { if (c !== 0) occ.push(i); });
  if (occ.length) {
    const i = occ[Math.floor(r() * occ.length)];
    const x = i % 9, y = Math.floor(i / 9);
    applyBoth(pair, 'p1', { type: 'toggleDead', x, y });
    assert.ok(pair[0].dead.length > 0);
    applyBoth(pair, 'p2', { type: 'toggleDead', x, y }); /* bấm lại → gỡ */
    assert.deepEqual(pair[0].dead, []);
    applyBoth(pair, 'p1', { type: 'toggleDead', x, y });
    assert.ok(pair[0].dead.length > 0);
  }
  /* đánh tiếp rồi lại vào tính điểm, chốt điểm */
  applyBoth(pair, 'p2', { type: 'resume' });
  assert.equal(pair[0].phase, 'playing');
  assert.deepEqual(pair[0].dead, []);
  const q1 = pair[0].turn, q2 = q1 === 'p1' ? 'p2' : 'p1';
  applyBoth(pair, q1, { type: 'pass' });
  applyBoth(pair, q2, { type: 'pass' });
  assert.equal(pair[0].phase, 'scoring');
  const fin = applyBoth(pair, 'p1', { type: 'finish' });
  assert.ok(fin.ended);
  assert.equal(pair[0].phase, 'ended');
  assert.equal(pair[0].endReason, 'scored');
  assert.ok(pair[0].winner === 'p1' || pair[0].winner === 'p2');
  assert.deepEqual(pair[0].scores, pair[1].scores);
});

test('xin thua online: 2 bên cùng thấy người thắng + lý do', () => {
  const pair = mkPair({ size: 9 });
  applyBoth(pair, 'p1', { type: 'move', x: 4, y: 4 });
  applyBoth(pair, 'p2', { type: 'move', x: 0, y: 0 });
  const r = applyBoth(pair, 'p1', { type: 'resign' });
  assert.ok(r.ended);
  assert.equal(pair[0].winner, 'p2');
  assert.equal(pair[0].endReason, 'resign');
  applyBothExpectFail(pair, 'p2', { type: 'move', x: 1, y: 1 }); /* ván đã kết thúc */
});

test('action JSON đi-về không đổi; action lạ bị từ chối ở cả 2 bên', () => {
  const a = { type: 'move', x: 4, y: 4 };
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  const pair = mkPair({ size: 9 });
  const bad = [{ type: 'fire', x: 1, y: 1 }, { type: 'move', x: 9, y: 1 }, null, { x: 1, y: 1 }, { type: 'finish' }, { type: 'toggleDead', x: 1, y: 1 }];
  for (const b of bad) applyBothExpectFail(pair, 'p1', b);
  /* nước đi sai lượt cũng bị từ chối đồng đều */
  applyBothExpectFail(pair, 'p2', { type: 'move', x: 1, y: 1 });
  assert.deepEqual(E.serialize(pair[0]), E.serialize(pair[1]));
});

test('viewFor 2 bên: cùng cells/lượt/winner, khác myMark; size trong state', () => {
  const pair = mkPair({ size: 13 });
  applyBoth(pair, 'p1', { type: 'move', x: 6, y: 6 });
  applyBoth(pair, 'p2', { type: 'move', x: 5, y: 5 });
  const v1 = E.viewFor(pair[0], 'p1'), v2 = E.viewFor(pair[1], 'p2');
  assert.deepEqual(v1.cells, v2.cells);
  assert.equal(v1.turn, v2.turn);
  assert.equal(v1.size, 13);
  assert.equal(v1.myMark, 'B');
  assert.equal(v2.myMark, 'W');
});

console.log(`\n${pass} test đạt.`);
