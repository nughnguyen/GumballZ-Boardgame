// Test đồng bộ online Memory (mô phỏng 2 máy). Chạy: node memory/test/net.mjs
// 2 engine cùng seed + cùng chuỗi action flip/hide → serialize state 2 bên phải
// giống hệt nhau sau MỖI action. Action JSON đi-về (stringify/parse) không đổi.
// Bộ bài do host xáo 1 lần (cùng seed) nên 2 bên thấy cùng 1 bộ bài.
import assert from 'assert/strict';
import * as E from '../js/engine.js';

const P1 = { id: 'p1', name: 'Bạn' }, P2 = { id: 'p2', name: 'Máy', isBot: true };
const mkPair = (opts) => {
  const a = E.createGame([P1, P2], opts), b = E.createGame([P1, P2], opts);
  a.gid = b.gid = 'net-test'; /* gid ngẫu nhiên khi tạo — ép bằng nhau để so sánh */
  return [a, b];
};
const applyBoth = (pair, pid, a) => {
  const rs = pair.map(s => E.applyAction(s, pid, JSON.parse(JSON.stringify(a)))); /* action đi-về JSON như qua mạng */
  assert.ok(rs[0].ok && rs[1].ok, `action ${JSON.stringify(a)} phải hợp lệ cả 2 bên (lỗi: ${rs[0].reason || rs[1].reason})`);
  assert.deepEqual(E.serialize(pair[0]), E.serialize(pair[1]), `state 2 bên lệch nhau sau action ${JSON.stringify(a)}`);
  return rs[0];
};
const rejectBoth = (pair, pid, a) => {
  const rs = pair.map(s => E.applyAction(s, pid, a));
  assert.ok(!rs[0].ok && !rs[1].ok, `action ${JSON.stringify(a)} phải bị từ chối cả 2 bên`);
  assert.deepEqual(E.serialize(pair[0]), E.serialize(pair[1]), `state 2 bên lệch nhau sau action bị từ chối ${JSON.stringify(a)}`);
};
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

test('cùng seed thì bộ bài giống hệt nhau (host xáo 1 lần, khách nhận state chung)', () => {
  const [a, b] = mkPair({ level: 'medium', seed: 123 });
  assert.deepEqual(a.cards.map(c => c.face), b.cards.map(c => c.face));
  assert.equal(a.seed, b.seed);
});

test('lật trượt + úp lại: state giống hệt sau mỗi action, lượt đổi sang p2', () => {
  const pair = mkPair({ level: 'easy', seed: 5 });
  const s = pair[0];
  const [x] = [0];
  let y = 1; while (s.cards[y].face === s.cards[x].face) y++;
  applyBoth(pair, 'p1', { type: 'flip', index: x });
  applyBoth(pair, 'p1', { type: 'flip', index: y });
  assert.deepEqual(pair[0].pendingHide, [x, y]);
  assert.equal(pair[0].misses, 1);
  applyBoth(pair, 'p1', { type: 'hide' });
  assert.equal(pair[0].pendingHide, null);
  assert.equal(pair[0].turn, 'p2');
  assert.equal(pair[0].cards[x].up, false);
});

test('trúng cặp: state giống hệt, lượt không đổi, cặp giữ ngửa', () => {
  const pair = mkPair({ level: 'easy', seed: 5 });
  const s = pair[0];
  const byFace = {};
  s.cards.forEach((c, i) => { (byFace[c.face] = byFace[c.face] || []).push(i); });
  const [a, b] = byFace[Object.keys(byFace)[0]];
  applyBoth(pair, 'p1', { type: 'flip', index: a });
  const r = applyBoth(pair, 'p1', { type: 'flip', index: b });
  assert.ok(r.match === true);
  assert.equal(pair[0].players[0].pairs, 1);
  assert.equal(pair[0].turn, 'p1');
  assert.ok(pair[0].cards[a].matched && pair[0].cards[b].matched);
});

test('chơi trọn ván (ăn hết cặp, xen kẽ trượt): serialize khớp sau MỖI action', () => {
  const pair = mkPair({ level: 'medium', seed: 99 });
  const s = pair[0];
  const byFace = {};
  s.cards.forEach((c, i) => { (byFace[c.face] = byFace[c.face] || []).push(i); });
  const faces = Object.keys(byFace);
  /* p1 ăn 2 cặp, trượt 1 lần (đổi lượt), p2 ăn 1 cặp, trượt 1 lần, p1 ăn nốt */
  const eat = (pid, f) => { const [a, b] = byFace[f]; applyBoth(pair, pid, { type: 'flip', index: a }); applyBoth(pair, pid, { type: 'flip', index: b }); };
  const miss = (pid, f1, f2) => { const a = byFace[f1][0], b = byFace[f2][0]; applyBoth(pair, pid, { type: 'flip', index: a }); applyBoth(pair, pid, { type: 'flip', index: b }); applyBoth(pair, pid, { type: 'hide' }); };
  eat('p1', faces[0]); eat('p1', faces[1]);
  miss('p1', faces[2], faces[3]);
  assert.equal(pair[0].turn, 'p2');
  eat('p2', faces[4]);
  miss('p2', faces[2], faces[5]);
  assert.equal(pair[0].turn, 'p1');
  eat('p1', faces[2]); eat('p1', faces[3]); eat('p1', faces[5]);
  eat('p1', faces[6]); eat('p1', faces[7]);
  assert.equal(pair[0].phase, 'ended');
  assert.equal(pair[0].winner, 'p1');
  assert.deepEqual(pair[0].scores, [{ id: 'p1', total: 7 }, { id: 'p2', total: 1 }]);
});

test('action JSON đi-về không đổi; action sai bị từ chối đồng đều cả 2 bên', () => {
  const pair = mkPair({ level: 'easy', seed: 5 });
  const a = { type: 'flip', index: 2 };
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  applyBoth(pair, 'p1', a);
  rejectBoth(pair, 'p2', { type: 'flip', index: 3 }); /* sai lượt */
  rejectBoth(pair, 'p1', { type: 'flip', index: 2 }); /* lật 1 lá 2 lần */
  rejectBoth(pair, 'p1', { type: 'hide' }); /* không có gì để úp */
  rejectBoth(pair, 'p1', { type: 'flip', index: 99 }); /* ngoài bàn */
  rejectBoth(pair, 'p1', { type: 'flip', index: 'x' }); /* không nguyên */
  assert.equal(pair[0].seq, pair[1].seq);
  assert.equal(pair[0].flips, 1);
});

test('viewFor 2 bên: cùng bàn/cùng điểm, khác me/myPairs, giấu mặt lá úp', () => {
  const pair = mkPair({ level: 'easy', seed: 5 });
  const s = pair[0];
  const byFace = {};
  s.cards.forEach((c, i) => { (byFace[c.face] = byFace[c.face] || []).push(i); });
  const [a, b] = byFace[Object.keys(byFace)[0]];
  applyBoth(pair, 'p1', { type: 'flip', index: a });
  applyBoth(pair, 'p1', { type: 'flip', index: b });
  const v1 = E.viewFor(pair[0], 'p1'), v2 = E.viewFor(pair[1], 'p2');
  assert.equal(v1.me, 'p1'); assert.equal(v2.me, 'p2');
  assert.equal(v1.myPairs, 1); assert.equal(v2.myPairs, 0);
  assert.deepEqual(v1.cards, v2.cards);
  assert.equal(v1.cards[a].face, s.cards[a].face);
  const hidden = v1.cards.find((c, i) => !pair[0].cards[i].matched && !pair[0].cards[i].up);
  assert.ok(hidden.face === null, 'đối thủ không xem được mặt lá úp qua view');
});

console.log(`\n${pass} test đạt. Bao phủ: match=✓ miss+hide=✓ turn=✓ end=✓ reject=✓ view=✓`);
