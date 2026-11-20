// Test đồng bộ online Domino (mô phỏng 2 máy). Chạy: node domino/test/net.mjs
// 2 engine chạy cùng 1 chuỗi action {type, tile?, end?} → serialize state 2
// bên phải giống hệt nhau sau MỖI action, kể cả đặt quân 2 đầu, rút quân,
// bỏ lượt tự động, khóa ván, mở ván mới và xin thua. Action JSON đi-về
// (stringify/parse) không đổi.
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { chooseMove } from '../js/bot.js';

const P1 = { id: 'p1', name: 'An' }, P2 = { id: 'p2', name: 'Bình' };
const P3 = { id: 'p3', name: 'Chi' };
const T = (a, b) => E.TILES.find(t => t.a === a && t.b === b).id;
const mkPair = (players = [P1, P2], opts) => {
  E.setRandom(() => 0.42); /* chia bài giống hệt 2 bên */
  const a = E.createGame(players, opts), b = E.createGame(players, opts);
  E.setRandom(null);
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
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

test('mở màn + đặt quân xen kẽ: state giống hệt sau mỗi nước', () => {
  const pair = mkPair();
  const st = pair[0].starter;
  const r = applyBoth(pair, st.pid, { type: 'play', tile: st.tile, end: 'left' });
  assert.ok(r.ok);
  assert.equal(pair[0].chain.length, 1);
  const other = st.pid === 'p1' ? 'p2' : 'p1';
  /* nước thứ 2: đối thủ đặt quân hợp lệ (tính từ state bên A) */
  const moves = E.legalPlays(pair[0], other);
  if (moves.length) {
    const m = moves[0];
    const r2 = applyBoth(pair, other, { type: 'play', tile: m.tile, end: m.ends[0] });
    assert.ok(r2.ok);
    assert.equal(pair[0].chain.length, 2);
  } else {
    /* không có quân hợp: rút quân đồng bộ */
    assert.ok(pair[0].boneyard.length > 0);
    const r2 = applyBoth(pair, other, { type: 'draw' });
    assert.ok(r2.ok);
    assert.equal(pair[0].players.find(p => p.id === other).hand.length, 8);
  }
});

test('đặt quân 2 đầu + rút quân đồng bộ cả 2 bên', () => {
  const pair = mkPair();
  for (const s of pair) {
    s.chain = [{ tile: T(2, 4), left: 2, right: 4 }];
    s.players[0].hand = [T(2, 5), T(4, 6), T(0, 0)];
    s.players[1].hand = [T(0, 1), T(1, 3), T(3, 3)];
    s.boneyard = [T(1, 1), T(5, 5)];
    s.turn = 'p1';
  }
  applyBoth(pair, 'p1', { type: 'play', tile: T(2, 5), end: 'left' });
  assert.deepEqual(E.openEnds(pair[0]), { left: 5, right: 4 });
  /* P2 không có quân hợp (0,1,3 vs 5/4) → rút quân */
  const r = applyBoth(pair, 'p2', { type: 'draw' });
  assert.ok(r.ok && r.drew === T(5, 5));
  /* P2 rút được [5|5] khớp đầu trái → đặt */
  applyBoth(pair, 'p2', { type: 'play', tile: T(5, 5), end: 'left' });
  assert.deepEqual(E.openEnds(pair[0]), { left: 5, right: 4 });
  /* P1 đặt [4|6] vào đầu phải */
  applyBoth(pair, 'p1', { type: 'play', tile: T(4, 6), end: 'right' });
  assert.deepEqual(E.openEnds(pair[0]), { left: 5, right: 6 });
});

test('bỏ lượt tự động + khóa ván đồng bộ cả 2 bên', () => {
  const pair = mkPair();
  for (const s of pair) {
    s.chain = [{ tile: T(2, 4), left: 2, right: 4 }];
    s.players[0].hand = [T(2, 5), T(0, 6)];
    s.players[1].hand = [T(0, 1), T(1, 3)];
    s.boneyard = [];
    s.turn = 'p1';
  }
  applyBoth(pair, 'p1', { type: 'play', tile: T(2, 5), end: 'left' });
  /* P2 bỏ lượt, P1 còn [0|6] không khớp 5/4 → bỏ lượt → khóa ván */
  assert.ok(pair[0].handEnd && pair[0].handEnd.reason === 'blocked');
  assert.equal(pair[0].handEnd.winnerId, 'p2');
  assert.equal(pair[0].handEnd.points, 1);
  /* mở ván mới đồng bộ — chia bài ván mới là xáo ngẫu nhiên, trong test ép cùng
     một hàm ngẫu nhiên cho cả 2 bên (trong game thật chủ phòng xáo rồi gửi view cho mọi người, nên không cần đồng bộ 2 engine) */
  E.setRandom(() => 0.42);
  const r = applyBoth(pair, 'p1', { type: 'next-hand' });
  E.setRandom(null);
  assert.ok(r.ok && r.handNo === 2);
  assert.equal(pair[0].handNo, 2);
  assert.equal(pair[0].players[0].hand.length, 7);
  assert.equal(pair[0].chain.length, 0);
});

test('5 trận bot-vs-bot (3 người): state khớp sau MỖI action', () => {
  for (let g = 0; g < 5; g++) {
    const pair = mkPair([P1, P2, P3], { target: 50 });
    let n = 0;
    E.setRandom(() => 0.42); /* xáo bài ván mới giống hệt 2 bên (lý do như trên) */
    while (pair[0].phase === 'playing' && n < 500) {
      if (pair[0].handEnd) { applyBoth(pair, pair[0].players[0].id, { type: 'next-hand' }); n++; continue; }
      const pid = pair[0].turn;
      const a = chooseMove(pair[0], pid, g % 2 ? 'easy' : 'hard');
      assert.ok(a, `trận ${g}: bot không trả action (lượt ${pid}, tay ${JSON.stringify(pair[0].players.find(p => p.id === pid).hand)})`);
      applyBoth(pair, pid, a);
      n++;
    }
    assert.equal(pair[0].phase, 'ended', `trận ${g}: chưa kết thúc sau ${n} action`);
    assert.deepEqual(E.serialize(pair[0]), E.serialize(pair[1]), `trận ${g}: lệch cuối`);
    E.setRandom(null);
  }
});

test('xin thua online: 2 bên cùng thấy người thắng + lý do', () => {
  const pair = mkPair();
  pair[0].players[0].score = 10; pair[0].players[1].score = 30;
  pair[1].players[0].score = 10; pair[1].players[1].score = 30;
  const r = applyBoth(pair, 'p1', { type: 'resign' });
  assert.ok(r.ended);
  assert.equal(pair[0].winner, 'p2');
  assert.equal(pair[0].endReason, 'resign');
  applyBothExpectFail(pair, 'p2', { type: 'play', tile: T(0, 0), end: 'left' }); /* trận đã kết thúc */
});

test('action JSON đi-về không đổi; action lạ bị từ chối ở cả 2 bên', () => {
  const a = { type: 'play', tile: T(2, 5), end: 'left' };
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  const pair = mkPair();
  const bad = [
    { type: 'fire', tile: T(2, 5), end: 'left' },
    { type: 'play', tile: 99, end: 'left' },
    { type: 'play', tile: T(0, 0), end: 'up' },
    { type: 'next-hand' }, /* ván chưa xong */
    null, { tile: T(2, 5) }, { type: 'play' },
  ];
  for (const b of bad) applyBothExpectFail(pair, pair[0].turn, b);
  /* nước đi sai lượt cũng bị từ chối đồng đều */
  const other = pair[0].turn === 'p1' ? 'p2' : 'p1';
  applyBothExpectFail(pair, other, { type: 'play', tile: pair[0].starter.tile, end: 'left' });
  assert.deepEqual(E.serialize(pair[0]), E.serialize(pair[1]));
});

test('viewFor 2 bên: cùng dây/lượt/điểm, khác quân trên tay', () => {
  const pair = mkPair();
  const st = pair[0].starter;
  applyBoth(pair, st.pid, { type: 'play', tile: st.tile, end: 'left' });
  const v1 = E.viewFor(pair[0], 'p1'), v2 = E.viewFor(pair[1], 'p2');
  assert.deepEqual(v1.chain, v2.chain);
  assert.equal(v1.turn, v2.turn);
  assert.equal(v1.boneyardN, v2.boneyardN);
  assert.notDeepEqual(v1.you.hand, v2.you.hand);
  assert.equal(v1.players.find(p => p.id === 'p2').hand, null);
  assert.equal(v2.players.find(p => p.id === 'p1').hand, null);
});

console.log(`\n${pass} test đạt.`);
