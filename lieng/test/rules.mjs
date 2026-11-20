// Test luật Liêng. Chạy: node lieng/test/rules.mjs
// Kiểm đúng luật: tạo ván (góp gà / chơi vui), Sáp > Liêng > Ảnh > Điểm,
// so bài (cùng bậc so lá to, rồi chất), vòng cược Tố/Theo/Bỏ, hết vòng thì
// lật bài chia gà, Bỏ hết thì người còn lại hốt gà không cần lật, chia đều
// khi hoà bài, người không góp gà thì không được chia gà, viewFor giấu bài.
import assert from 'assert/strict';
import * as E from '../js/engine.js';

let seed = 1234567;
const rng = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
E.setRandom(rng);

const P = (id, name, extra = {}) => ({ id, name, ...extra });
const C = (r, s) => ({ r, s, id: (r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r)) + s });
const setHand = (s, pid, cards) => { E.createGame; s.players.find(p => p.id === pid).cards = cards; };
const fresh = (n = 3, opts = {}) => E.createGame([P('p1', 'An'), P('p2', 'Bình'), P('p3', 'Chi')].slice(0, n), opts);
const anteAll = s => { for (const p of s.players) E.applyAction(s, p.id, { type: 'ante' }); };
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

test('khởi tạo: 3 người, mỗi người 3 lá, gà 0, đang chờ góp gà 5 xu', () => {
  const s = fresh();
  assert.equal(s.phase, 'ante');
  assert.equal(s.players.length, 3);
  for (const p of s.players) assert.equal(p.cards.length, 3);
  assert.equal(s.deck.length, 52 - 9);
  assert.equal(s.pot, 0);
  assert.equal(s.currentBet, 5);
  assert.equal(s.turn, null);
  assert.deepEqual(E.actors(s), ['p1', 'p2', 'p3']);
});

test('chơi vui (ante 0): bỏ qua góp gà, vào thẳng vòng cược, gà 0', () => {
  const s = fresh(3, { ante: 0 });
  assert.equal(s.phase, 'bet');
  assert.equal(s.turn, 'p2'); /* sau nhà cái p1 */
  assert.equal(s.currentBet, 0);
  assert.equal(s.pot, 0);
  assert.deepEqual(E.actors(s), ['p2']);
});

test('góp gà đủ 3 người: gà 15 xu, vào vòng cược, p2 tố trước', () => {
  const s = fresh();
  assert.ok(E.applyAction(s, 'p1', { type: 'ante' }).ok);
  assert.equal(s.phase, 'ante');
  assert.ok(E.applyAction(s, 'p2', { type: 'ante' }).ok);
  assert.ok(E.applyAction(s, 'p3', { type: 'ante' }).ok);
  assert.equal(s.phase, 'bet');
  assert.equal(s.pot, 15);
  assert.equal(s.turn, 'p2');
  assert.ok(s.players.every(p => p.paid && p.contrib === 5));
});

test('không đủ xu góp gà (ante-free): vẫn chơi được nhưng không được chia gà', () => {
  const s = fresh();
  E.applyAction(s, 'p1', { type: 'ante' });
  E.applyAction(s, 'p2', { type: 'ante-free' });
  E.applyAction(s, 'p3', { type: 'ante' });
  assert.equal(s.phase, 'bet');
  assert.equal(s.pot, 10);
  assert.equal(s.players.find(p => p.id === 'p2').free, true);
});

test('tính bài: Sáp > Liêng > Ảnh > Điểm; Q-K-Át là Liêng, Át-2-3 là Liêng nhỏ nhất', () => {
  assert.equal(E.handInfo([C(12, 'S'), C(13, 'H'), C(1, 'D')]).kind, 'lieng'); /* Q-K-Át: Liêng, không phải Ảnh */
  assert.equal(E.handInfo([C(1, 'S'), C(2, 'H'), C(3, 'D')]).kind, 'lieng');
  assert.equal(E.handInfo([C(11, 'S'), C(12, 'H'), C(13, 'D')]).kind, 'lieng'); /* J-Q-K: Liêng */
  assert.equal(E.handInfo([C(11, 'S'), C(11, 'H'), C(12, 'D')]).kind, 'anh'); /* J-J-Q: Ảnh */
  assert.equal(E.handInfo([C(7, 'S'), C(7, 'H'), C(7, 'D')]).kind, 'sap');
  assert.equal(E.handInfo([C(13, 'S'), C(5, 'H'), C(4, 'D')]).pts, 9); /* K=10 + 5 + 4 = 19 → 9 nút */
  assert.equal(E.handInfo([C(10, 'S'), C(10, 'H'), C(10, 'D')]).pts, 0); /* 30 → Bù */
  assert.equal(E.handInfo([C(1, 'S'), C(9, 'H'), C(9, 'D')]).pts, 9); /* Át=1 + 9 + 9 = 19 → 9 */
});

test('so bài: Sáp Át > Sáp K; Liêng QKA > Liêng A23; Điểm 9 > 8; hoà thì so chất', () => {
  assert.ok(E.compareHands([C(1, 'S'), C(1, 'H'), C(1, 'D')], [C(13, 'S'), C(13, 'H'), C(13, 'D')]).c > 0);
  assert.ok(E.compareHands([C(7, 'S'), C(7, 'H'), C(7, 'D')], [C(12, 'S'), C(13, 'H'), C(1, 'D')]).c > 0); /* Sáp > Liêng */
  assert.ok(E.compareHands([C(12, 'S'), C(13, 'H'), C(1, 'D')], [C(1, 'S'), C(2, 'H'), C(3, 'D')]).c > 0); /* QKA > A23 */
  assert.ok(E.compareHands([C(11, 'S'), C(11, 'H'), C(12, 'D')], [C(13, 'S'), C(5, 'H'), C(4, 'D')]).c > 0); /* Ảnh > 9 nút */
  assert.ok(E.compareHands([C(13, 'S'), C(5, 'H'), C(4, 'D')], [C(13, 'C'), C(4, 'H'), C(4, 'D')]).c > 0); /* 9 nút > 8 nút */
  /* cùng 9 nút, cùng lá to K: so chất lá K — K Bích thắng K Chuồn */
  assert.ok(E.compareHands([C(13, 'S'), C(5, 'H'), C(4, 'D')], [C(13, 'C'), C(5, 'H'), C(4, 'D')]).c > 0);
  assert.equal(E.compareHands([C(13, 'S'), C(5, 'H'), C(4, 'D')], [C(13, 'S'), C(5, 'H'), C(4, 'D')]).c, 0);
});

test('vòng cược: Theo không tốn thêm xu khi đã bằng gà; Tố +5 nâng gà, người khác phải hành động lại', () => {
  const s = fresh(); anteAll(s);
  assert.equal(E.toCallOf(s, 'p2'), 0);
  assert.ok(E.applyAction(s, 'p2', { type: 'theo' }).ok); /* check */
  assert.equal(s.turn, 'p3');
  assert.ok(E.applyAction(s, 'p3', { type: 'to', raise: 5 }).ok);
  assert.equal(s.currentBet, 10);
  assert.equal(s.pot, 20);
  assert.equal(s.turn, 'p1');
  assert.equal(s.players.find(p => p.id === 'p2').acted, false); /* Tố xong: người khác phải hành động lại */
  assert.equal(E.toCallOf(s, 'p1'), 5);
  assert.ok(E.applyAction(s, 'p1', { type: 'theo' }).ok);
  assert.equal(s.turn, 'p2');
  assert.ok(E.applyAction(s, 'p2', { type: 'theo' }).ok);
  assert.equal(s.phase, 'ended'); /* cả 3 đều đã hành động và bằng gà → lật bài */
  assert.equal(s.endReason, 'showdown');
});

test('Bỏ hết thì người còn lại hốt gà không cần lật bài', () => {
  const s = fresh(); anteAll(s);
  assert.ok(E.applyAction(s, 'p2', { type: 'bo' }).ok);
  assert.equal(s.phase, 'bet');
  assert.ok(E.applyAction(s, 'p3', { type: 'bo' }).ok);
  assert.equal(s.phase, 'ended');
  assert.equal(s.endReason, 'fold-win');
  assert.deepEqual(s.winnerIds, ['p1']);
  const res = s.players.find(p => p.id === 'p1').res;
  assert.equal(res.r, 'win');
  assert.equal(res.share, 15);
  assert.equal(res.delta, 10); /* góp 5, hốt 15 → +10 */
  assert.equal(s.players.find(p => p.id === 'p2').res.delta, -5);
});

test('lật bài: bài to nhất hốt gà; Sáp thắng Liêng', () => {
  const s = fresh(); anteAll(s);
  setHand(s, 'p1', [C(7, 'S'), C(7, 'H'), C(7, 'D')]); /* Sáp 7 */
  setHand(s, 'p2', [C(12, 'S'), C(13, 'H'), C(1, 'D')]); /* Liêng QKA */
  setHand(s, 'p3', [C(13, 'S'), C(5, 'H'), C(4, 'D')]); /* 9 nút */
  E.applyAction(s, 'p2', { type: 'theo' });
  E.applyAction(s, 'p3', { type: 'theo' });
  const r = E.applyAction(s, 'p1', { type: 'theo' });
  assert.ok(r.ok && r.ended);
  assert.equal(s.phase, 'ended');
  assert.deepEqual(s.winnerIds, ['p1']);
  assert.equal(s.hands.p1.kind, 'sap');
  assert.equal(s.players.find(p => p.id === 'p1').res.share, 15);
});

test('hoà bài thì chia đều gà (15 xu / 2 người = 7 + 8)', () => {
  const s = fresh(2); anteAll(s);
  setHand(s, 'p1', [C(13, 'S'), C(5, 'H'), C(4, 'D')]); /* 9 nút, K Bích */
  setHand(s, 'p2', [C(13, 'S'), C(5, 'C'), C(4, 'H')]); /* 9 nút, K Bích — hoà tuyệt đối */
  E.applyAction(s, 'p2', { type: 'theo' });
  E.applyAction(s, 'p1', { type: 'theo' });
  assert.equal(s.phase, 'ended');
  assert.deepEqual(s.winnerIds, ['p1', 'p2']);
  assert.equal(s.players.find(p => p.id === 'p1').res.share, 5); /* 10 xu / 2 = 5 đều (gà 2 người = 10) */
  assert.equal(s.players.find(p => p.id === 'p2').res.share, 5);
});

test('người không góp gà mà bài to nhất: không được chia gà, gà về người góp có bài to nhất', () => {
  const s = fresh();
  E.applyAction(s, 'p1', { type: 'ante' });
  E.applyAction(s, 'p2', { type: 'ante-free' });
  E.applyAction(s, 'p3', { type: 'ante' });
  setHand(s, 'p1', [C(13, 'S'), C(5, 'H'), C(4, 'D')]); /* 9 nút */
  setHand(s, 'p2', [C(1, 'S'), C(1, 'H'), C(1, 'D')]); /* Sáp Át — to nhất nhưng free */
  setHand(s, 'p3', [C(13, 'C'), C(4, 'H'), C(4, 'D')]); /* 8 nút */
  E.applyAction(s, 'p2', { type: 'theo' });
  E.applyAction(s, 'p3', { type: 'theo' });
  E.applyAction(s, 'p1', { type: 'theo' });
  assert.equal(s.phase, 'ended');
  assert.deepEqual(s.winnerIds, ['p1']); /* p2 Sáp Át nhưng free → gà về p1 */
  assert.equal(s.players.find(p => p.id === 'p2').res.r, 'winhand');
  assert.equal(s.players.find(p => p.id === 'p2').res.share, 0);
});

test('mỗi vòng chỉ được Tố tối đa 3 lần (kẻo Tố qua Tố lại mãi)', () => {
  const s = fresh(); anteAll(s);
  E.applyAction(s, 'p2', { type: 'to', raise: 5 }); /* Tố 1: gà 10 */
  E.applyAction(s, 'p3', { type: 'to', raise: 5 }); /* Tố 2: gà 15 */
  E.applyAction(s, 'p1', { type: 'to', raise: 5 }); /* Tố 3: gà 20 */
  assert.equal(s.raises, 3);
  assert.equal(E.applyAction(s, 'p2', { type: 'to', raise: 5 }).ok, false); /* Tố lần 4: bị chặn */
  E.applyAction(s, 'p2', { type: 'theo' });
  E.applyAction(s, 'p3', { type: 'theo' });
  E.applyAction(s, 'p1', { type: 'theo' });
  assert.equal(s.phase, 'ended'); /* hết 3 lần Tố thì chỉ còn Theo/Bỏ, ván vẫn kết thúc được */
  const s2 = fresh(); anteAll(s2);
  E.applyAction(s2, 'p2', { type: 'to', raise: 5 });
  E.applyAction(s2, 'p3', { type: 'to', raise: 5 });
  E.applyAction(s2, 'p1', { type: 'to', raise: 5 });
  assert.equal(E.applyAction(s2, 'p2', { type: 'to', raise: 5 }).ok, false); /* Tố lần 4: bị chặn */
});

test('hành động sai: không tới lượt, Bỏ 2 lần, Tố số lạ thì mặc định +5', () => {
  const s = fresh(); anteAll(s);
  assert.equal(E.applyAction(s, 'p3', { type: 'theo' }).ok, false); /* chưa tới lượt p3 */
  assert.equal(E.applyAction(s, 'p2', { type: 'bo' }).ok, true);
  assert.equal(E.applyAction(s, 'p2', { type: 'bo' }).ok, false); /* đã Bỏ rồi */
  assert.ok(E.applyAction(s, 'p3', { type: 'to', raise: 99 }).ok);
  assert.equal(s.currentBet, 10); /* raise lạ → mặc định +5 */
  assert.equal(E.applyAction(s, 'p1', { type: 'ante' }).ok, false); /* hết giai đoạn góp gà */
});

test('serialize/deserialize: state giống hệt sau khi đi-về JSON', () => {
  const s = fresh(); anteAll(s);
  E.applyAction(s, 'p2', { type: 'to', raise: 10 });
  const s2 = E.deserialize(E.serialize(s));
  assert.deepEqual(s2, s);
});

test('viewFor: giấu bài người khác; hết ván mới lật bài người chưa Bỏ', () => {
  const s = fresh(); anteAll(s);
  let v = E.viewFor(s, 'p1');
  assert.equal(v.players.find(p => p.id === 'p1').cards.length, 3);
  assert.equal(v.players.find(p => p.id === 'p2').cards, null);
  assert.equal(v.you.toCall, 0);
  assert.equal(v.pot, 15);
  E.applyAction(s, 'p2', { type: 'bo' });
  E.applyAction(s, 'p3', { type: 'bo' });
  v = E.viewFor(s, 'p2');
  assert.equal(v.phase, 'ended');
  assert.equal(v.players.find(p => p.id === 'p1').cards.length, 3); /* người thắng: lật bài */
  assert.equal(v.players.find(p => p.id === 'p3').cards, null); /* người khác đã Bỏ: vẫn úp với người xem */
  assert.equal(v.players.find(p => p.id === 'p2').cards.length, 3); /* bài của chính mình thì lúc nào cũng thấy */
  assert.equal(v.winnerIds[0], 'p1');
});

test('actors: góp gà thì chờ người chưa góp; cược thì chỉ người tới lượt; hết ván thì không ai', () => {
  const s = fresh();
  assert.deepEqual(E.actors(s), ['p1', 'p2', 'p3']);
  E.applyAction(s, 'p1', { type: 'ante' });
  assert.deepEqual(E.actors(s), ['p2', 'p3']);
  anteAll(s);
  assert.deepEqual(E.actors(s), ['p2']);
  E.applyAction(s, 'p2', { type: 'bo' });
  E.applyAction(s, 'p3', { type: 'bo' });
  assert.deepEqual(E.actors(s), []);
});

console.log(`\n${pass} test luật Liêng ĐẠT.`);
