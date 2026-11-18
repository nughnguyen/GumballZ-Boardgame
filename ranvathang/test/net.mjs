// Test đồng bộ online Rắn và Thang (mô phỏng 2 máy). Chạy: node ranvathang/test/net.mjs
// 2 engine chạy cùng 1 chuỗi action {type:'roll', value} với số xúc xắc cố
// định → serialize state 2 bên phải giống hệt nhau sau MỖI action, kể cả
// leo thang, trượt rắn, tung quá ô 100, tung 6 được tung tiếp và xin thua.
// Action JSON đi-về (stringify/parse) không đổi.
import assert from 'assert/strict';
import * as E from '../js/engine.js';

const P1 = { id: 'p1', name: 'Bạn' }, P2 = { id: 'p2', name: 'Máy', isBot: true };
const mkPair = (ps = [P1, P2], opts) => {
  const a = E.createGame(ps, opts), b = E.createGame(ps, opts);
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
/* RNG có seed (mulberry32) để chuỗi tung chạy lại giống hệt nhau */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rollVal = r => 1 + Math.floor(r() * 6);
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

test('tung xen kẽ với số cố định: state giống hệt sau mỗi lượt', () => {
  const pair = mkPair();
  const seq = [
    ['p1', 2], /* p1 leo thang 2→38 */
    ['p2', 3],
    ['p1', 4], /* 38 → 42, leo thang 42? không — 42 là đầu thang 21→42, đáp xuống đầu thang không leo */
    ['p2', 6], /* p2 tung 6, được tung tiếp */
    ['p2', 5],
    ['p1', 1],
  ];
  for (const [pid, v] of seq) applyBoth(pair, pid, { type: 'roll', value: v });
  assert.equal(pair[0].pos.p1, 43);
  assert.equal(pair[0].pos.p2, 14); /* 3 → 9? không: p2 tung 3 từ 0 → 3, tung 6 → 9, tung 5 → 14 (thang 7→14? không — 14 là đầu thang, đáp xuống đầu thang không leo) */
  assert.equal(pair[0].turn, 'p2'); /* p1 tung 1 (không phải 6) nên lượt sang p2 */
});

test('leo thang + trượt rắn đồng bộ cả 2 bên', () => {
  const pair = mkPair();
  /* p1: 0 → 2 (thang lên 38) → p2 đi → p1 tung 4 → 42 (đầu thang, không leo) */
  applyBoth(pair, 'p1', { type: 'roll', value: 2 });
  assert.equal(pair[0].pos.p1, 38);
  applyBoth(pair, 'p2', { type: 'roll', value: 1 });
  applyBoth(pair, 'p1', { type: 'roll', value: 4 });
  assert.equal(pair[0].pos.p1, 42);
  /* p2 từ ô 1 tung 6 → 7 (thang lên 14), được tung tiếp */
  const r = applyBoth(pair, 'p2', { type: 'roll', value: 6 });
  assert.ok(r.extra);
  assert.equal(pair[0].pos.p2, 14);
  assert.equal(pair[0].turn, 'p2');
  /* p2 tung 2 → 16 (đầu rắn, trượt về 6) */
  applyBoth(pair, 'p2', { type: 'roll', value: 2 });
  assert.equal(pair[0].pos.p2, 6);
});

test('10 ván ngẫu nhiên có seed: state khớp sau MỖI action', () => {
  for (let g = 0; g < 10; g++) {
    const pair = mkPair();
    const r = rng(2000 + g);
    let n = 0;
    while (pair[0].phase === 'playing' && n < 2000) {
      const pid = pair[0].turn;
      applyBoth(pair, pid, { type: 'roll', value: rollVal(r) });
      n++;
    }
    assert.equal(pair[0].phase, 'ended', `ván ${g}: không kết thúc sau ${n} lượt`);
    assert.equal(pair[0].pos[pair[0].winner], 100);
    assert.deepEqual(E.serialize(pair[0]), E.serialize(pair[1]), `ván ${g}: lệch cuối`);
  }
});

test('tung quá ô 100 + về đích đúng số: 2 bên cùng kết quả', () => {
  const pair = mkPair();
  for (const s of pair) { s.pos.p1 = 97; s.pos.p2 = 50; }
  /* p1 tung 4 → quá, đứng yên tại 97, lượt sang p2 */
  const r = applyBoth(pair, 'p1', { type: 'roll', value: 4 });
  assert.ok(r.overshoot);
  assert.equal(pair[0].pos.p1, 97);
  assert.equal(pair[0].turn, 'p2');
  applyBoth(pair, 'p2', { type: 'roll', value: 2 });
  /* p1 tung 3 → về đúng ô 100, thắng */
  const fin = applyBoth(pair, 'p1', { type: 'roll', value: 3 });
  assert.ok(fin.ended);
  assert.equal(pair[0].phase, 'ended');
  assert.equal(pair[0].winner, 'p1');
  assert.equal(pair[0].endReason, 'win');
  assert.equal(pair[0].pos.p1, 100);
});

test('xin thua online: 2 bên cùng thấy người thắng + lý do', () => {
  const pair = mkPair();
  applyBoth(pair, 'p1', { type: 'roll', value: 2 });
  applyBoth(pair, 'p2', { type: 'roll', value: 3 });
  const r = applyBoth(pair, 'p1', { type: 'resign' });
  assert.ok(r.ended);
  assert.equal(pair[0].winner, 'p2');
  assert.equal(pair[0].endReason, 'resign');
  applyBothExpectFail(pair, 'p2', { type: 'roll', value: 2 }); /* ván đã kết thúc */
});

test('action JSON đi-về không đổi; action lạ bị từ chối ở cả 2 bên', () => {
  const a = { type: 'roll', value: 4 };
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  const pair = mkPair();
  const bad = [{ type: 'roll', value: 0 }, { type: 'roll', value: 7 }, { type: 'roll', value: 2.5 }, { type: 'roll' }, { type: 'move', x: 1 }, null, { value: 3 }];
  for (const b of bad) applyBothExpectFail(pair, 'p1', b);
  /* tung sai lượt cũng bị từ chối đồng đều */
  applyBothExpectFail(pair, 'p2', { type: 'roll', value: 3 });
  assert.deepEqual(E.serialize(pair[0]), E.serialize(pair[1]));
});

test('viewFor 2 bên: cùng pos/lượt/winner, khác myColor', () => {
  const pair = mkPair();
  applyBoth(pair, 'p1', { type: 'roll', value: 2 });
  applyBoth(pair, 'p2', { type: 'roll', value: 3 });
  const v1 = E.viewFor(pair[0], 'p1'), v2 = E.viewFor(pair[1], 'p2');
  assert.deepEqual(v1.pos, v2.pos);
  assert.equal(v1.turn, v2.turn);
  assert.equal(v1.myColor, 0);
  assert.equal(v2.myColor, 1);
  assert.deepEqual(v1.lastRoll, v2.lastRoll);
});

console.log(`\n${pass} test đạt.`);
