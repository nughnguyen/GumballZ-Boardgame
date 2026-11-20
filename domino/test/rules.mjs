// Test luật Domino. Chạy: node domino/test/rules.mjs
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { chooseMove } from '../js/bot.js';

const P1 = { id: 'p1', name: 'An' }, P2 = { id: 'p2', name: 'Bình' };
const P3 = { id: 'p3', name: 'Chi' }, P4 = { id: 'p4', name: 'Dũng' };
/* id quân: (a,b) với a<=b — tra bảng TILES: [0|0]=0, [0|6]=6, [1|1]=7,
   [2|2]=13, [3|3]=18, [4|4]=22, [5|5]=25, [6|6]=27, [2|4]=15, [5|6]=26 */
const T = (a, b) => E.TILES.find(t => t.a === a && t.b === b).id;
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

test('bộ quân 28 quân duy nhất, chia 7 mỗi người, chồng rút đúng số', () => {
  const s2 = E.createGame([P1, P2]);
  assert.equal(s2.players[0].hand.length, 7);
  assert.equal(s2.players[1].hand.length, 7);
  assert.equal(s2.boneyard.length, 14);
  const all = [...s2.players[0].hand, ...s2.players[1].hand, ...s2.boneyard];
  assert.equal(new Set(all).size, 28);
  const s3 = E.createGame([P1, P2, P3]);
  assert.equal(s3.boneyard.length, 7);
  const s4 = E.createGame([P1, P2, P3, P4]);
  assert.equal(s4.boneyard.length, 0);
  assert.throws(() => E.createGame([P1]), /2–4 người/);
  assert.throws(() => E.createGame([P1, P2, P3, P4, { id: 'p5', name: 'E' }]), /2–4 người/);
});

test('mở màn: người có đôi lớn nhất đi trước bằng đúng quân đó, quân khác bị từ chối', () => {
  E.setRandom(() => 0.5);
  const s = E.createGame([P1, P2]);
  E.setRandom(null);
  const st = s.starter;
  const holder = s.players.find(p => p.hand.includes(st.tile));
  assert.equal(st.pid, holder.id);
  assert.equal(s.turn, st.pid);
  assert.ok(E.isDouble(st.tile) || E.tilePips(st.tile) >= 11); /* đôi lớn nhất, hoặc quân nhiều nút nhất nếu không có đôi */
  const other = holder.hand.find(t => t !== st.tile);
  assert.equal(E.applyAction(s, st.pid, { type: 'play', tile: other, end: 'left' }).ok, false);
  const r = E.applyAction(s, st.pid, { type: 'play', tile: st.tile, end: 'left' });
  assert.ok(r.ok && !r.ended);
  assert.equal(s.chain.length, 1);
  assert.equal(s.turn, s.players.find(p => p.id !== st.pid).id);
});

test('đặt quân 2 đầu dây: khớp trái/phải, quân không khớp bị từ chối, sai lượt bị từ chối', () => {
  const s = E.createGame([P1, P2]);
  /* dàn ván: dây [2|4] (trái 2, phải 4); P1 cầm [2|5] + [4|6]; P2 cầm [0|0] */
  s.chain = [{ tile: T(2, 4), left: 2, right: 4 }];
  s.players[0].hand = [T(2, 5), T(4, 6)];
  s.players[1].hand = [T(0, 0)];
  s.boneyard = [];
  s.turn = 'p1';
  assert.deepEqual(E.openEnds(s), { left: 2, right: 4 });
  /* sai lượt */
  assert.equal(E.applyAction(s, 'p2', { type: 'play', tile: T(0, 0), end: 'left' }).ok, false);
  /* quân không khớp đầu nào */
  s.players[0].hand.push(T(5, 5));
  assert.equal(E.applyAction(s, 'p1', { type: 'play', tile: T(5, 5), end: 'left' }).ok, false);
  /* đặt [2|5] vào đầu trái (khớp 2): đầu trái mới = 5 */
  let r = E.applyAction(s, 'p1', { type: 'play', tile: T(2, 5), end: 'left' });
  assert.ok(r.ok);
  assert.deepEqual(E.openEnds(s), { left: 5, right: 4 });
  assert.equal(s.chain[0].tile, T(2, 5));
  /* P2 không có quân hợp ([0|0] không khớp 5/4) + hết quân rút → tự bỏ lượt ngay, lượt quay về P1 */
  assert.equal(s.turn, 'p1');
  assert.ok(s.lastPass && s.lastPass.by === 'p2');
  /* P1 đặt [4|6] vào đầu phải (khớp 4): đầu phải mới = 6 */
  r = E.applyAction(s, 'p1', { type: 'play', tile: T(4, 6), end: 'right' });
  assert.ok(r.ok);
  assert.deepEqual(E.openEnds(s), { left: 5, right: 6 });
});

test('quân đôi đặt ngang: đầu dây vẫn đúng 1 số', () => {
  const s = E.createGame([P1, P2]);
  s.chain = [{ tile: T(3, 5), left: 3, right: 5 }];
  s.players[0].hand = [T(5, 5)];
  s.players[1].hand = [T(0, 1)];
  s.boneyard = [];
  s.turn = 'p1';
  const r = E.applyAction(s, 'p1', { type: 'play', tile: T(5, 5), end: 'right' });
  assert.ok(r.ok);
  assert.deepEqual(E.openEnds(s), { left: 3, right: 5 });
  assert.equal(s.chain[s.chain.length - 1].left, 5);
  assert.equal(s.chain[s.chain.length - 1].right, 5);
});

test('rút quân: chỉ được rút khi không có quân hợp; rút xong có quân hợp thì phải đặt', () => {
  const s = E.createGame([P1, P2]);
  s.chain = [{ tile: T(2, 4), left: 2, right: 4 }];
  s.players[0].hand = [T(0, 0), T(1, 1)]; /* không khớp 2/4 */
  s.players[1].hand = [T(3, 3)];
  s.boneyard = [T(2, 6), T(5, 5)];
  s.turn = 'p1';
  assert.ok(E.canDraw(s, 'p1'));
  let r = E.applyDraw(s, 'p1');
  assert.ok(r.ok && r.drew === T(5, 5)); /* pop() lấy quân cuối */
  assert.equal(s.players[0].hand.length, 3);
  assert.equal(s.boneyard.length, 1);
  assert.equal(s.turn, 'p1'); /* rút xong vẫn chưa có quân hợp → rút tiếp */
  r = E.applyDraw(s, 'p1');
  assert.ok(r.ok && r.drew === T(2, 6));
  assert.equal(s.turn, 'p1'); /* giờ có [2|6] khớp đầu trái → phải đặt */
  assert.equal(E.applyDraw(s, 'p1').ok, false); /* còn quân hợp thì không được rút nữa */
  assert.ok(!E.canDraw(s, 'p1'));
  r = E.applyAction(s, 'p1', { type: 'play', tile: T(2, 6), end: 'left' });
  assert.ok(r.ok);
});

test('tự bỏ lượt + Domino: không có quân hợp + hết quân rút thì tự bỏ lượt', () => {
  const s = E.createGame([P1, P2]);
  s.chain = [{ tile: T(2, 4), left: 2, right: 4 }];
  s.players[0].hand = [T(2, 5), T(5, 5)]; /* [2|5] khớp trái 2 */
  s.players[1].hand = [T(6, 6), T(0, 1)]; /* không khớp 5/4 sau nước của P1 */
  s.boneyard = [];
  s.turn = 'p1';
  const r = E.applyAction(s, 'p1', { type: 'play', tile: T(2, 5), end: 'left' });
  assert.ok(r.ok);
  /* P2 không khớp (đầu 5/4) + hết quân rút → bỏ lượt; P1 còn [5|5] khớp đầu trái 5 → P1 đi tiếp, không khóa */
  assert.equal(s.turn, 'p1');
  assert.ok(s.lastPass && s.lastPass.by === 'p2');
  assert.equal(s.passStreak, 1);
  /* P1 đặt [5|5] vào đầu trái → hết quân → Domino, điểm = nút còn lại của P2 (12+1) */
  const r2 = E.applyAction(s, 'p1', { type: 'play', tile: T(5, 5), end: 'left' });
  assert.ok(r2.ok && r2.domino);
  assert.equal(s.handEnd.reason, 'domino');
  assert.equal(s.handEnd.winnerId, 'p1');
  assert.equal(s.handEnd.points, 12 + 1);
  assert.equal(s.players[0].score, 13);
});

test('khóa ván: điểm = tổng nút đối thủ trừ nút mình; hòa nút thì ván hòa', () => {
  const s = E.createGame([P1, P2]);
  s.chain = [{ tile: T(2, 4), left: 2, right: 4 }];
  s.players[0].hand = [T(2, 5), T(0, 6)]; /* P1: [2|5] khớp trái; [0|6] không khớp 5/4 */
  s.players[1].hand = [T(0, 1), T(1, 3)]; /* P2: không khớp */
  s.boneyard = [];
  s.turn = 'p1';
  E.applyAction(s, 'p1', { type: 'play', tile: T(2, 5), end: 'left' });
  /* P2 bỏ lượt; P1 còn [0|6] không khớp → bỏ lượt → khóa ván */
  assert.equal(s.handEnd.reason, 'blocked');
  /* P1 còn 6 nút, P2 còn 1+4=5 nút → P2 thắng, điểm = 6 − 5 = 1 */
  assert.equal(s.handEnd.winnerId, 'p2');
  assert.equal(s.handEnd.points, 1);
  assert.equal(s.players[1].score, 1);
  /* hòa nút: 2 bên cùng 6 nút → ván hòa, không ai được điểm */
  const s2 = E.createGame([P1, P2]);
  s2.chain = [{ tile: T(2, 4), left: 2, right: 4 }];
  s2.players[0].hand = [T(2, 5), T(0, 6)]; /* còn 6 nút sau khi đặt [2|5] */
  s2.players[1].hand = [T(3, 3)]; /* 6 nút, không khớp 5/4 */
  s2.boneyard = [];
  s2.turn = 'p1';
  E.applyAction(s2, 'p1', { type: 'play', tile: T(2, 5), end: 'left' });
  assert.equal(s2.handEnd.reason, 'tie');
  assert.equal(s2.handEnd.winnerId, null);
  assert.equal(s2.handEnd.points, 0);
  assert.equal(s2.players[0].score, 0);
  assert.equal(s2.players[1].score, 0);
});

test('thắng ván khi hết quân (Domino): điểm = tổng nút đối thủ; ván đơn thì hết trận ngay', () => {
  const s = E.createGame([P1, P2], { target: 0 });
  s.chain = [{ tile: T(2, 4), left: 2, right: 4 }];
  s.players[0].hand = [T(2, 5)];
  s.players[1].hand = [T(3, 3), T(4, 5)];
  s.boneyard = [];
  s.turn = 'p1';
  const r = E.applyAction(s, 'p1', { type: 'play', tile: T(2, 5), end: 'left' });
  assert.ok(r.ok && r.domino && r.ended);
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'p1');
  assert.equal(s.endReason, 'hand');
  assert.equal(s.handEnd.points, 6 + 9);
});

test('đủ điểm mục tiêu thì thắng trận; chưa đủ thì mở ván mới, người thắng mở màn', () => {
  const s = E.createGame([P1, P2], { target: 50 });
  s.players[0].score = 45;
  s.chain = [{ tile: T(2, 4), left: 2, right: 4 }];
  s.players[0].hand = [T(2, 5)];
  s.players[1].hand = [T(3, 3), T(4, 5)];
  s.boneyard = [];
  s.turn = 'p1';
  E.applyAction(s, 'p1', { type: 'play', tile: T(2, 5), end: 'left' });
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'p1');
  assert.equal(s.endReason, 'target');
  assert.equal(s.players[0].score, 45 + 15);
  /* chưa đủ điểm: ván mới */
  const s2 = E.createGame([P1, P2], { target: 100 });
  s2.chain = [{ tile: T(2, 4), left: 2, right: 4 }];
  s2.players[0].hand = [T(2, 5)];
  s2.players[1].hand = [T(3, 3), T(4, 5)];
  s2.boneyard = [];
  s2.turn = 'p1';
  E.applyAction(s2, 'p1', { type: 'play', tile: T(2, 5), end: 'left' });
  assert.equal(s2.phase, 'playing');
  assert.ok(s2.handEnd && s2.handEnd.winnerId === 'p1');
  const r = E.applyAction(s2, 'p1', { type: 'next-hand' });
  assert.ok(r.ok && r.handNo === 2);
  assert.equal(s2.handNo, 2);
  assert.equal(s2.players[0].hand.length, 7);
  assert.equal(s2.chain.length, 0);
  assert.equal(s2.starter.pid, 'p1'); /* người thắng ván trước mở màn */
  assert.equal(s2.turn, 'p1');
  assert.equal(E.applyAction(s2, 'p1', { type: 'next-hand' }).ok, false); /* ván chưa xong thì không mở ván mới */
});

test('xin thua: người có điểm cao nhất trong số còn lại thắng trận', () => {
  const s = E.createGame([P1, P2, P3], { target: 100 });
  s.players[0].score = 10; s.players[1].score = 30; s.players[2].score = 20;
  const r = E.applyAction(s, 'p1', { type: 'resign' });
  assert.ok(r.ok && r.ended);
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'p2');
  assert.equal(s.endReason, 'resign');
  assert.equal(E.applyAction(s, 'p2', { type: 'resign' }).ok, false); /* trận đã kết thúc */
});

test('viewFor + serialize/deserialize: giấu quân đối thủ, lật hết khi hết trận', () => {
  const s = E.createGame([P1, P2]);
  const v1 = E.viewFor(s, 'p1'), v2 = E.viewFor(s, 'p2');
  assert.deepEqual(v1.players.find(p => p.id === 'p1').hand, s.players[0].hand);
  assert.equal(v1.players.find(p => p.id === 'p2').hand, null);
  assert.equal(v2.players.find(p => p.id === 'p1').hand, null);
  assert.deepEqual(v1.you.hand, s.players[0].hand);
  assert.equal(v1.you.starterTile, s.starter.tile);
  assert.equal(v1.boneyardN, 14);
  const s2 = E.deserialize(E.serialize(s));
  assert.deepEqual(E.serialize(s2), E.serialize(s));
  /* hết trận thì lật hết quân */
  s.phase = 'ended'; s.winner = 'p1';
  const v3 = E.viewFor(s, 'p1');
  assert.deepEqual(v3.players.find(p => p.id === 'p2').hand, s.players[1].hand);
});

test('bot Easy/Hard đều trả hành động hợp lệ từ vị trí mở màn và giữa ván', () => {
  E.setRandom(() => 0.5);
  const s = E.createGame([P1, P2]);
  E.setRandom(null);
  for (const lvl of ['easy', 'hard']) {
    const a = chooseMove(s, s.turn, lvl);
    assert.ok(a && a.type === 'play', `bot ${lvl} mở màn bằng quân mở màn`);
    assert.equal(a.tile, s.starter.tile);
  }
  /* giữa ván: bot trả nước hợp lệ */
  s.chain = [{ tile: T(2, 4), left: 2, right: 4 }];
  s.players[0].hand = [T(2, 5), T(4, 6), T(0, 0)];
  s.players[1].hand = [T(3, 3)];
  s.boneyard = [T(1, 1)];
  s.turn = 'p1';
  for (const lvl of ['easy', 'hard']) {
    for (let i = 0; i < 5; i++) {
      const a = chooseMove(s, 'p1', lvl);
      assert.ok(a && a.type === 'play');
      const legal = E.legalPlays(s, 'p1').find(m => m.tile === a.tile);
      assert.ok(legal && legal.ends.includes(a.end), `bot ${lvl} đi nước hợp lệ`);
    }
  }
  /* bot rút quân khi không có quân hợp */
  s.players[0].hand = [T(0, 0)];
  const a = chooseMove(s, 'p1', 'hard');
  assert.ok(a && a.type === 'draw');
  /* bot trả null khi hết quân rút + không có quân hợp (engine tự bỏ lượt) */
  s.boneyard = [];
  assert.equal(chooseMove(s, 'p1', 'hard'), null);
});

console.log(`\n${pass} test đạt.`);
