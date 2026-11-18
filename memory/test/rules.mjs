// Test luật Memory. Chạy: node memory/test/rules.mjs
// Luật: lật 2 lá giống nhau → giữ ngửa + 1 cặp + được lật tiếp; lật 2 lá khác
// nhau → úp lại sau 1 nhịp (pendingHide) rồi đổi lượt; hết bàn thì ai nhiều
// cặp hơn thắng, bằng nhau thì hòa; chơi đơn thắng khi tìm đủ cặp.
import assert from 'assert/strict';
import * as E from '../js/engine.js';

const P1 = { id: 'p1', name: 'Bạn' }, P2 = { id: 'p2', name: 'Máy', isBot: true };
const fresh = (opts) => E.createGame([P1, P2], opts);
const solo = (opts) => E.createGame([P1], opts);
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };
/* tìm 1 cặp giống nhau trong bộ bài (trả về 2 vị trí) */
const findPair = s => { const seen = {}; for (let i = 0; i < s.cards.length; i++) { const f = s.cards[i].face; if (seen[f] !== undefined) return [seen[f], i]; seen[f] = i; } return null; };
const findMismatch = s => { const [a] = findPair(s); for (let i = 0; i < s.cards.length; i++) if (s.cards[i].face !== s.cards[a].face) return [a, i]; return null; };

test('tạo ván theo từng mức khó: đủ cặp, mỗi mặt đúng 2 lá', () => {
  for (const [lv, n, pairs, cols, rows] of [['easy', 12, 6, 4, 3], ['medium', 16, 8, 4, 4], ['hard', 24, 12, 6, 4]]) {
    const s = fresh({ level: lv, seed: 7 });
    assert.equal(s.level, lv);
    assert.equal(s.total, n); assert.equal(s.pairs, pairs);
    assert.equal(s.cols, cols); assert.equal(s.rows, rows);
    assert.equal(s.cards.length, n);
    assert.ok(s.cards.every(c => !c.up && !c.matched));
    const counts = {};
    for (const c of s.cards) counts[c.face] = (counts[c.face] || 0) + 1;
    assert.equal(Object.keys(counts).length, pairs);
    assert.ok(Object.values(counts).every(x => x === 2), 'mỗi mặt đúng 2 lá');
    assert.equal(s.phase, 'playing');
    assert.equal(s.turn, 'p1');
    assert.equal(s.pendingFlip, null); assert.equal(s.pendingHide, null);
    assert.equal(E.remainingPairs(s), pairs);
  }
});

test('xáo bằng seed cho kết quả xác định; seed khác thì bộ bài khác', () => {
  const a = fresh({ seed: 42 }), b = fresh({ seed: 42 }), c = fresh({ seed: 43 });
  assert.deepEqual(a.cards.map(x => x.face), b.cards.map(x => x.face));
  assert.notDeepEqual(a.cards.map(x => x.face), c.cards.map(x => x.face));
  assert.equal(a.seed, 42);
});

test('lật lá đầu: ngửa lên, chờ lá thứ 2, lượt chưa đổi', () => {
  const s = fresh({ seed: 5 });
  const r = E.applyAction(s, 'p1', { type: 'flip', index: 3 });
  assert.ok(r.ok && r.first);
  assert.equal(s.cards[3].up, true);
  assert.equal(s.pendingFlip, 3);
  assert.equal(s.turn, 'p1');
  assert.equal(s.flips, 1);
  assert.equal(s.history.length, 1);
  assert.equal(s.history[0].i, 3);
});

test('lật 2 lá giống nhau: giữ ngửa + 1 cặp + được lật tiếp', () => {
  const s = fresh({ seed: 5 });
  const [a, b] = findPair(s);
  assert.ok(E.applyAction(s, 'p1', { type: 'flip', index: a }).ok);
  const r = E.applyAction(s, 'p1', { type: 'flip', index: b });
  assert.ok(r.ok && r.match === true);
  assert.deepEqual(r.pair, [a, b]);
  assert.ok(s.cards[a].matched && s.cards[b].matched);
  assert.ok(s.cards[a].up && s.cards[b].up);
  assert.equal(s.players[0].pairs, 1);
  assert.equal(s.turn, 'p1'); /* trúng cặp được lật tiếp */
  assert.equal(s.pendingFlip, null); assert.equal(s.pendingHide, null);
  assert.equal(s.flips, 2);
  assert.equal(E.remainingPairs(s), s.pairs - 1);
});

test('lật 2 lá khác nhau: giữ ngửa chờ úp, úp lại rồi đổi lượt', () => {
  const s = fresh({ seed: 5 });
  const [a, b] = findMismatch(s);
  assert.ok(E.applyAction(s, 'p1', { type: 'flip', index: a }).ok);
  const r = E.applyAction(s, 'p1', { type: 'flip', index: b });
  assert.ok(r.ok && r.match === false);
  assert.deepEqual(s.pendingHide, [a, b]);
  assert.equal(s.misses, 1);
  assert.ok(s.cards[a].up && s.cards[b].up); /* vẫn ngửa trong lúc chờ úp */
  assert.equal(s.turn, 'p1'); /* lượt đổi SAU khi úp */
  /* đang chờ úp thì không lật được lá khác */
  const blocked = E.applyAction(s, 'p1', { type: 'flip', index: (b + 1) % s.total });
  assert.ok(!blocked.ok);
  /* úp lại: 2 lá xuống, đổi lượt sang p2 */
  const h = E.applyAction(s, 'p1', { type: 'hide' });
  assert.ok(h.ok);
  assert.equal(s.cards[a].up, false); assert.equal(s.cards[b].up, false);
  assert.equal(s.pendingHide, null);
  assert.equal(s.turn, 'p2');
  assert.equal(s.turnNo, 2);
  /* úp khi không có gì để úp thì bị từ chối */
  assert.ok(!E.applyAction(s, 'p2', { type: 'hide' }).ok);
});

test('nước lật không hợp lệ đều bị từ chối', () => {
  const s = fresh({ seed: 5 });
  const [a, b] = findPair(s);
  assert.ok(!E.applyAction(s, 'p2', { type: 'flip', index: a }).ok, 'sai lượt');
  assert.ok(!E.applyAction(s, 'p1', { type: 'flip', index: -1 }).ok, 'ngoài bàn');
  assert.ok(!E.applyAction(s, 'p1', { type: 'flip', index: 99 }).ok, 'ngoài bàn');
  assert.ok(!E.applyAction(s, 'p1', { type: 'flip', index: 1.5 }).ok, 'không nguyên');
  assert.ok(!E.applyAction(s, 'p1', { type: 'bogus', index: a }).ok, 'action lạ');
  assert.ok(E.applyAction(s, 'p1', { type: 'flip', index: a }).ok);
  assert.ok(!E.applyAction(s, 'p1', { type: 'flip', index: a }).ok, 'lật 1 lá 2 lần');
  assert.ok(E.applyAction(s, 'p1', { type: 'flip', index: b }).ok, 'trúng cặp');
  assert.ok(!E.applyAction(s, 'p1', { type: 'flip', index: a }).ok, 'lật lá đã trúng cặp');
  assert.ok(!E.applyAction(s, 'p1', { type: 'flip', index: b }).ok, 'lật lá đã trúng cặp');
  assert.deepEqual(E.legalFlips(s, 'p1').filter(i => i === a || i === b), [], 'lá đã trúng không còn trong legalFlips');
});

/* dựng sẵn 1 ván gần hết: n cặp đã trúng (p1 có a cặp, p2 có b cặp), còn 1 cặp chưa trúng */
const riggedEnd = (a, b, turnPid) => {
  const s = fresh({ level: 'easy', seed: 11 });
  const byFace = {};
  s.cards.forEach((c, i) => { (byFace[c.face] = byFace[c.face] || []).push(i); });
  const faces = Object.keys(byFace); /* 6 mặt */
  for (let k = 0; k < a + b; k++) for (const i of byFace[faces[k]]) s.cards[i].matched = s.cards[i].up = true;
  s.players[0].pairs = a; s.players[1].pairs = b;
  s.turn = turnPid;
  return { s, last: byFace[faces[a + b]] };
};

test('hết bàn 2 người: ai nhiều cặp hơn thắng', () => {
  const { s, last } = riggedEnd(3, 2, 'p1'); /* p1 3 cặp, p2 2 cặp, còn 1 cặp */
  assert.ok(E.applyAction(s, 'p1', { type: 'flip', index: last[0] }).ok);
  const r = E.applyAction(s, 'p1', { type: 'flip', index: last[1] });
  assert.ok(r.ok && r.match === true && r.ended === true);
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'p1');
  assert.equal(s.draw, false);
  assert.deepEqual(s.scores, [{ id: 'p1', total: 4 }, { id: 'p2', total: 2 }]);
  assert.ok(!E.applyAction(s, 'p1', { type: 'flip', index: 0 }).ok, 'ván đã kết thúc thì không lật được');
});

test('hết bàn 2 người: bằng cặp thì hòa', () => {
  const { s, last } = riggedEnd(3, 2, 'p2'); /* p2 ăn cặp cuối → 3–3 */
  assert.ok(E.applyAction(s, 'p2', { type: 'flip', index: last[0] }).ok);
  const r = E.applyAction(s, 'p2', { type: 'flip', index: last[1] });
  assert.ok(r.ok && r.ended === true);
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, null);
  assert.equal(s.draw, true);
  assert.deepEqual(s.scores, [{ id: 'p1', total: 3 }, { id: 'p2', total: 3 }]);
});

test('chơi đơn: 1 người, lật trượt úp xong lượt vẫn là mình, hết bàn là thắng', () => {
  const s = solo({ level: 'easy', seed: 9 });
  assert.equal(s.solo, true);
  assert.equal(s.players.length, 1);
  const [a, b] = findMismatch(s);
  assert.ok(E.applyAction(s, 'p1', { type: 'flip', index: a }).ok);
  assert.ok(E.applyAction(s, 'p1', { type: 'flip', index: b }).ok);
  assert.deepEqual(s.pendingHide, [a, b]);
  assert.ok(E.applyAction(s, 'p1', { type: 'hide' }).ok);
  assert.equal(s.turn, 'p1'); /* chơi đơn không đổi lượt */
  assert.equal(s.misses, 1);
  /* ăn hết mọi cặp: thắng */
  const byFace = {};
  s.cards.forEach((c, i) => { if (!c.matched) (byFace[c.face] = byFace[c.face] || []).push(i); });
  let last;
  for (const f of Object.keys(byFace)) {
    const [x, y] = byFace[f];
    assert.ok(E.applyAction(s, 'p1', { type: 'flip', index: x }).ok);
    last = E.applyAction(s, 'p1', { type: 'flip', index: y });
    assert.ok(last.ok && last.match === true);
  }
  assert.ok(last.ended);
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'p1');
  assert.equal(s.players[0].pairs, 6);
  assert.equal(s.flips, 2 + 12); /* 2 lá trượt đầu + 12 lá trúng */
});

test('serialize/deserialize giữ nguyên trạng thái; viewFor giấu mặt lá úp', () => {
  const s = fresh({ seed: 5 });
  const [a, b] = findPair(s);
  E.applyAction(s, 'p1', { type: 'flip', index: a });
  E.applyAction(s, 'p1', { type: 'flip', index: b });
  const s2 = E.deserialize(E.serialize(s));
  assert.deepEqual(E.serialize(s2), E.serialize(s));
  assert.deepEqual(E.cloneState(s), s);
  const v = E.viewFor(s, 'p1');
  assert.equal(v.me, 'p1');
  assert.equal(v.myPairs, 1);
  assert.equal(v.cards[a].face, s.cards[a].face, 'lá đã trúng thì lộ mặt');
  const hidden = v.cards.find((c, i) => !s.cards[i].matched && !s.cards[i].up);
  assert.ok(hidden && hidden.face === null, 'lá úp chưa trúng thì giấu mặt');
  assert.equal(v.log.length, s.log.length);
});

console.log(`\n${pass} test đạt.`);
