// Test luật Xì Tố. Chạy: node xito/test/rules.mjs
// Kiểm đúng luật: tạo ván (2 lá tẩy/người, mù 5/10), tính bài 5 lá / tay 7 lá,
// góp mù (kể cả Tất tay thiếu xu), các hành động cược (Xem/Theo/Tố/Tất tay/Bỏ),
// 4 vòng cược tới showdown, chia gà (kể cả side pot), Bỏ hết thì thắng luôn,
// chơi vui 0 xu, viewFor giấu bài, serialize.
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { chooseAction } from '../js/bot.js';

let seed = 1234567;
const rng = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
E.setRandom(rng);

const P = (id, name, extra = {}) => ({ id, name, ...extra });
const C = (r, s) => ({ r, s, id: (r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r)) + s });
const cardsOf = (...rs) => rs.map(([r, s]) => C(r, s));
const fresh = (n = 2, opts = {}) => E.createGame([P('p1', 'An'), P('p2', 'Bình'), P('p3', 'Chi'), P('p4', 'Dũng'), P('p5', 'Em'), P('p6', 'Phúc'), P('p7', 'Giang'), P('p8', 'Hân'), P('p9', 'Khang')].slice(0, n), opts);
/* lật bài chung theo ý muốn: deck.pop() lấy từ cuối — xếp ngược thứ tự lật */
const setCommunity = (s, cards) => { s.deck = [...cards].reverse(); };
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

test('khởi tạo: 2 người, mỗi người 2 lá tẩy, đang góp mù nhỏ', () => {
  const s = fresh();
  assert.equal(s.phase, 'blinds');
  assert.equal(s.street, 'preflop');
  assert.equal(s.players.length, 2);
  for (const p of s.players) assert.equal(p.cards.length, 2);
  assert.equal(s.deck.length, 52 - 4);
  assert.equal(s.opts.blinds, 5);
  assert.equal(s.dealer, 0);
  assert.equal(s.turn, 'p1'); /* 2 người: nhà cái (p1) là mù nhỏ, góp trước */
  assert.deepEqual(E.actors(s), ['p1']);
  assert.equal(E.blindDueFor(s, 'p1'), 5);
  assert.equal(E.blindDueFor(s, 'p2'), 10);
});

test('khởi tạo 9 người: tối đa 9, mù nhỏ sau nhà cái, mù lớn sau nữa', () => {
  const s = fresh(9);
  assert.equal(s.players.length, 9);
  assert.equal(s.turn, 'p2'); /* mù nhỏ = p2 */
  assert.equal(E.blindDueFor(s, 'p2'), 5);
  assert.equal(E.blindDueFor(s, 'p3'), 10);
  assert.equal(E.blindDueFor(s, 'p4'), 0);
  assert.throws(() => E.createGame([P('a', 'A'), P('b', 'B'), P('c', 'C'), P('d', 'D'), P('e', 'E'), P('f', 'F'), P('g', 'G'), P('h', 'H'), P('i', 'I'), P('j', 'J')]), /2–9/);
  assert.throws(() => E.createGame([P('a', 'A')]), /2–9/);
});

test('tính bài 5 lá: thùng phá sảnh > tứ quý > cù lũ > thùng > sảnh > sám > hai đôi > đôi > mậu thầu', () => {
  const ev = cards => E.eval5(cards);
  assert.equal(ev(cardsOf([10, 'S'], [11, 'S'], [12, 'S'], [13, 'S'], [1, 'S'])).cat, 9); /* thùng phá sảnh Át cao */
  assert.equal(ev(cardsOf([9, 'S'], [9, 'H'], [9, 'D'], [9, 'C'], [2, 'S'])).cat, 8); /* tứ quý 9 */
  assert.equal(ev(cardsOf([8, 'S'], [8, 'H'], [8, 'D'], [5, 'C'], [5, 'S'])).cat, 7); /* cù lũ */
  assert.equal(ev(cardsOf([1, 'S'], [9, 'S'], [7, 'S'], [5, 'S'], [2, 'S'])).cat, 6); /* thùng Át cao */
  assert.equal(ev(cardsOf([5, 'S'], [6, 'H'], [7, 'D'], [8, 'C'], [9, 'S'])).cat, 5); /* sảnh 9 cao */
  assert.equal(ev(cardsOf([1, 'S'], [2, 'H'], [3, 'D'], [4, 'C'], [5, 'S'])).cat, 5); /* sảnh 5 cao (A-2-3-4-5) */
  assert.equal(ev(cardsOf([7, 'S'], [7, 'H'], [7, 'D'], [13, 'C'], [2, 'S'])).cat, 4); /* sám 7 */
  assert.equal(ev(cardsOf([12, 'S'], [12, 'H'], [5, 'D'], [5, 'C'], [2, 'S'])).cat, 3); /* hai đôi */
  assert.equal(ev(cardsOf([1, 'S'], [1, 'H'], [5, 'D'], [4, 'C'], [2, 'S'])).cat, 2); /* đôi Át */
  assert.equal(ev(cardsOf([1, 'S'], [13, 'H'], [9, 'D'], [7, 'C'], [2, 'S'])).cat, 1); /* mậu thầu */
  /* so trong cùng bậc: tứ quý Át > tứ quý K; sảnh Át cao > sảnh 5 cao; thùng Át cao > thùng K cao */
  assert.ok(E.compareEval(ev(cardsOf([1, 'S'], [1, 'H'], [1, 'D'], [1, 'C'], [2, 'S'])), ev(cardsOf([13, 'S'], [13, 'H'], [13, 'D'], [13, 'C'], [2, 'S']))) > 0);
  assert.ok(E.compareEval(ev(cardsOf([10, 'S'], [11, 'H'], [12, 'D'], [13, 'C'], [1, 'S'])), ev(cardsOf([1, 'S'], [2, 'H'], [3, 'D'], [4, 'C'], [5, 'S']))) > 0);
  assert.ok(E.compareEval(ev(cardsOf([1, 'S'], [9, 'S'], [7, 'S'], [5, 'S'], [2, 'S'])), ev(cardsOf([13, 'S'], [9, 'S'], [7, 'S'], [5, 'S'], [2, 'S']))) > 0);
  /* hòa: cùng đôi Át, cùng kicker thì bằng nhau */
  assert.equal(E.compareEval(ev(cardsOf([1, 'S'], [1, 'H'], [5, 'D'], [4, 'C'], [2, 'S'])), ev(cardsOf([1, 'D'], [1, 'C'], [5, 'H'], [4, 'S'], [2, 'H']))), 0);
});

test('tay 7 lá: chọn 5 lá mạnh nhất trong 21 tổ hợp', () => {
  /* A♠ K♠ + Q♠ J♠ 10♠ 9♦ 2♣ → thùng phá sảnh K cao? không — cần 10♠ J♠ Q♠ K♠ A♠ */
  const royal = E.best5(cardsOf([1, 'S'], [13, 'S'], [12, 'S'], [11, 'S'], [10, 'S'], [9, 'D'], [2, 'C']));
  assert.equal(royal.cat, 9);
  /* K♠ K♥ + Q♠ J♠ 10♠ 9♠ 2♣ → sảnh thùng K cao (K♠ Q♠ J♠ 10♠ 9♠) */
  const sf = E.best5(cardsOf([13, 'S'], [13, 'H'], [12, 'S'], [11, 'S'], [10, 'S'], [9, 'S'], [2, 'C']));
  assert.equal(sf.cat, 9);
  /* A♠ A♥ + Q♠ J♠ 10♠ 9♠ 2♣ → thùng Át cao (A♠ Q♠ J♠ 10♠ 9♠) */
  const fl = E.best5(cardsOf([1, 'S'], [1, 'H'], [12, 'S'], [11, 'S'], [10, 'S'], [9, 'S'], [2, 'C']));
  assert.equal(fl.cat, 6);
  /* 7 lá toàn đôi lẻ → chỉ có đôi cao nhất */
  const pr = E.best5(cardsOf([1, 'S'], [13, 'H'], [12, 'D'], [11, 'C'], [9, 'S'], [7, 'H'], [2, 'C']));
  assert.equal(pr.cat, 1);
  assert.equal(E.handInfo(cardsOf([1, 'S'], [1, 'H'])).label, 'Đôi Át');
  assert.ok(E.handInfo(cardsOf([1, 'S'], [13, 'S'])).label.includes('đồng chất'));
});

test('góp mù: mù nhỏ 5, mù lớn 10, xong thì Pre-flop tới lượt UTG (nhà cái, 2 người)', () => {
  const s = fresh();
  assert.equal(E.applyAction(s, 'p2', { type: 'blind', amount: 10 }).ok, false); /* chưa tới lượt p2 */
  assert.equal(E.applyAction(s, 'p1', { type: 'theo' }).ok, false); /* đang góp mù, chưa cược được */
  assert.ok(E.applyAction(s, 'p1', { type: 'blind', amount: 5 }).ok);
  assert.equal(s.players[0].put, 5);
  assert.equal(s.players[0].stack, 195);
  assert.equal(s.turn, 'p2');
  assert.equal(E.applyAction(s, 'p1', { type: 'blind', amount: 5 }).ok, false); /* góp 2 lần */
  assert.ok(E.applyAction(s, 'p2', { type: 'blind', amount: 10 }).ok);
  assert.equal(s.phase, 'bet');
  assert.equal(s.street, 'preflop');
  assert.equal(s.toCall, 10);
  assert.equal(s.turn, 'p1'); /* 2 người: UTG = nhà cái */
});

test('góp mù thiếu xu: chỉ có 3 xu thì Tất tay 3 xu, vẫn chơi được', () => {
  const s = fresh(2);
  s.players[0].stack = 3; /* p1 (mù nhỏ) chỉ còn 3 xu */
  assert.ok(E.applyAction(s, 'p1', { type: 'blind', amount: 3 }).ok);
  assert.equal(s.players[0].stack, 0);
  assert.equal(s.players[0].allIn, true);
  assert.ok(E.applyAction(s, 'p2', { type: 'blind', amount: 10 }).ok);
  /* p1 đã Tất tay nên lượt Pre-flop thuộc về p2 (người duy nhất còn chơi được) */
  assert.equal(s.turn, 'p2');
});

test('không góp được mù (0 xu) thì Bỏ luôn ván', () => {
  const s = fresh(3);
  s.players[1].stack = 0; /* p2 là mù nhỏ, không còn xu */
  assert.ok(E.applyAction(s, 'p2', { type: 'blind', amount: 0 }).ok);
  assert.equal(s.players[1].folded, true);
  assert.ok(E.applyAction(s, 'p3', { type: 'blind', amount: 10 }).ok);
  assert.equal(s.phase, 'bet');
});

test('hành động cược: Xem khi có người Tố thì lỗi; Tố dưới mức tối thiểu thì lỗi; Theo/Tố/Bỏ đúng', () => {
  const s = fresh();
  E.applyAction(s, 'p1', { type: 'blind', amount: 5 });
  E.applyAction(s, 'p2', { type: 'blind', amount: 10 });
  /* p1 phải Theo 5 xu mới đủ 10; Xem thì lỗi */
  assert.equal(E.applyAction(s, 'p1', { type: 'xem' }).ok, false);
  assert.equal(E.applyAction(s, 'p1', { type: 'to', amount: 15 }).ok, false); /* Tố lên 15 < 10+10 */
  assert.equal(E.applyAction(s, 'p1', { type: 'to', amount: 500 }).ok, false); /* vượt chip */
  assert.ok(E.applyAction(s, 'p1', { type: 'to', amount: 20 }).ok); /* Tố lên 20 */
  assert.equal(s.toCall, 20);
  assert.equal(s.players[0].bet, 20);
  /* p2: Tố xong thì phải hành động lại — Xem lỗi, Theo 10 xu */
  assert.equal(E.applyAction(s, 'p2', { type: 'xem' }).ok, false);
  assert.ok(E.applyAction(s, 'p2', { type: 'theo' }).ok);
  assert.equal(s.players[1].put, 20); /* cược vòng này xong thì bet reset về 0 ở Flop — put vẫn giữ */
  assert.equal(s.players[0].put, 20);
  assert.equal(s.street, 'flop');
  assert.equal(s.community.length, 3);
  assert.equal(s.toCall, 0);
  /* Flop: p2 (sau nhà cái) đi trước, Xem được */
  assert.equal(s.turn, 'p2');
  assert.ok(E.applyAction(s, 'p2', { type: 'xem' }).ok);
  assert.ok(E.applyAction(s, 'p1', { type: 'xem' }).ok);
  assert.equal(s.street, 'turn');
});

test('cả bàn Bỏ thì người còn lại hốt gà, không cần lật bài', () => {
  const s = fresh();
  E.applyAction(s, 'p1', { type: 'blind', amount: 5 });
  E.applyAction(s, 'p2', { type: 'blind', amount: 10 });
  assert.ok(E.applyAction(s, 'p1', { type: 'bo' }).ok);
  assert.equal(s.phase, 'ended');
  assert.equal(s.endReason, 'foldwin');
  assert.deepEqual(s.winnerIds, ['p2']);
  assert.equal(s.players[1].res.won, 15);
  assert.equal(s.players[1].res.net, 5);
  assert.equal(s.players[0].res.r, 'fold');
  assert.equal(E.applyAction(s, 'p2', { type: 'xem' }).ok, false); /* ván đã kết thúc */
});

test('showdown đầy đủ 4 vòng: sảnh thùng K cao thắng thùng Át cao', () => {
  const s = fresh();
  s.players[0].cards = cardsOf([1, 'S'], [1, 'H']); /* p1: đôi Át */
  s.players[1].cards = cardsOf([13, 'S'], [13, 'H']); /* p2: đôi K */
  setCommunity(s, cardsOf([12, 'S'], [11, 'S'], [10, 'S'], [9, 'S'], [2, 'C']));
  E.applyAction(s, 'p1', { type: 'blind', amount: 5 });
  E.applyAction(s, 'p2', { type: 'blind', amount: 10 });
  assert.ok(E.applyAction(s, 'p1', { type: 'theo' }).ok);
  assert.ok(E.applyAction(s, 'p2', { type: 'xem' }).ok); /* mù lớn được Xem (đã đủ cược) */
  assert.equal(s.street, 'flop');
  assert.deepEqual(s.community.map(c => c.id), ['QS', 'JS', '10S']);
  assert.ok(E.applyAction(s, 'p2', { type: 'xem' }).ok);
  assert.ok(E.applyAction(s, 'p1', { type: 'xem' }).ok);
  assert.equal(s.street, 'turn');
  assert.ok(E.applyAction(s, 'p2', { type: 'xem' }).ok);
  assert.ok(E.applyAction(s, 'p1', { type: 'xem' }).ok);
  assert.equal(s.street, 'river');
  assert.ok(E.applyAction(s, 'p2', { type: 'xem' }).ok);
  assert.ok(E.applyAction(s, 'p1', { type: 'xem' }).ok);
  assert.equal(s.phase, 'ended');
  assert.equal(s.endReason, 'showdown');
  assert.deepEqual(s.winnerIds, ['p2']); /* p2: sảnh thùng K cao (K♠ Q♠ J♠ 10♠ 9♠) */
  assert.equal(s.players[1].res.handCat, 9);
  assert.equal(s.players[0].res.handCat, 6); /* p1: thùng Át cao */
  assert.equal(s.players[1].res.won, 20);
  assert.equal(s.players[1].res.net, 10);
  assert.equal(s.players[0].res.net, -10);
});

test('hòa bài: 2 người cùng thùng phá sảnh thì chia đều gà', () => {
  const s = fresh();
  s.players[0].cards = cardsOf([2, 'D'], [3, 'H']);
  s.players[1].cards = cardsOf([4, 'D'], [5, 'H']);
  setCommunity(s, cardsOf([10, 'S'], [11, 'S'], [12, 'S'], [13, 'S'], [1, 'S'])); /* thùng phá sảnh chung */
  E.applyAction(s, 'p1', { type: 'blind', amount: 5 });
  E.applyAction(s, 'p2', { type: 'blind', amount: 10 });
  E.applyAction(s, 'p1', { type: 'theo' });
  E.applyAction(s, 'p2', { type: 'xem' });
  for (let i = 0; i < 3; i++) {
    const t = s.turn;
    E.applyAction(s, t, { type: 'xem' });
    E.applyAction(s, s.turn, { type: 'xem' });
  }
  assert.equal(s.phase, 'ended');
  assert.equal(s.players[0].res.won, 10);
  assert.equal(s.players[1].res.won, 10);
  assert.equal(s.players[0].res.net, 0);
  assert.deepEqual(s.winnerIds, []); /* hòa gà, không ai lãi */
  assert.equal(s.endReason, 'draw');
});

test('side pot: người Tất tay ít xu chỉ được chia lớp gà tới mức mình góp', () => {
  const s = fresh(3);
  s.players[0].stack = 20; /* p1 (nhà cái) chỉ còn 20 chip */
  s.players[0].cards = cardsOf([1, 'S'], [1, 'H']); /* đôi Át — mạnh nhất */
  s.players[1].cards = cardsOf([13, 'S'], [13, 'H']); /* đôi K */
  s.players[2].cards = cardsOf([12, 'S'], [12, 'H']); /* đôi Q */
  setCommunity(s, cardsOf([2, 'D'], [7, 'C'], [9, 'H'], [3, 'S'], [5, 'D']));
  E.applyAction(s, 'p2', { type: 'blind', amount: 5 }); /* p2 mù nhỏ */
  E.applyAction(s, 'p3', { type: 'blind', amount: 10 }); /* p3 mù lớn */
  assert.ok(E.applyAction(s, 'p1', { type: 'allin' }).ok); /* p1 Tất tay 20 */
  assert.equal(s.players[0].bet, 20);
  assert.ok(E.applyAction(s, 'p2', { type: 'theo' }).ok);
  assert.ok(E.applyAction(s, 'p3', { type: 'theo' }).ok);
  assert.equal(s.street, 'flop');
  /* Flop: p2 Tố lên 40 — mức Tố tính theo vòng cược này (bet đã reset về 0),
     nên p2 phải bỏ thêm 40 xu, tổng góp lên 60; p3 Theo 40 xu cũng lên 60 */
  assert.ok(E.applyAction(s, 'p2', { type: 'to', amount: 40 }).ok);
  assert.ok(E.applyAction(s, 'p3', { type: 'theo' }).ok);
  assert.ok(E.applyAction(s, 'p2', { type: 'xem' }).ok);
  assert.ok(E.applyAction(s, 'p3', { type: 'xem' }).ok);
  assert.ok(E.applyAction(s, 'p2', { type: 'xem' }).ok);
  assert.ok(E.applyAction(s, 'p3', { type: 'xem' }).ok);
  assert.equal(s.phase, 'ended');
  /* gà 140 xu: lớp 20 (cả 3 cùng góp) = 60 → p1 (đôi Át); lớp 20–60 = 80 → p2 (đôi K > đôi Q) */
  assert.equal(s.players[0].res.won, 60);
  assert.equal(s.players[1].res.won, 80);
  assert.equal(s.players[2].res.won, 0);
  assert.equal(s.players[0].res.net, 40);
  assert.equal(s.players[1].res.net, 20);
  assert.equal(s.players[2].res.net, -60);
  assert.deepEqual(s.winnerIds, ['p1', 'p2']);
});

test('Tất tay thắng: người Tất tay mà thắng thì res.allin = true', () => {
  const s = fresh(2);
  s.players[0].cards = cardsOf([1, 'S'], [1, 'H']);
  s.players[1].cards = cardsOf([2, 'S'], [2, 'H']);
  setCommunity(s, cardsOf([3, 'D'], [7, 'C'], [9, 'H'], [4, 'S'], [5, 'D']));
  E.applyAction(s, 'p1', { type: 'blind', amount: 5 });
  E.applyAction(s, 'p2', { type: 'blind', amount: 10 });
  assert.ok(E.applyAction(s, 'p1', { type: 'allin' }).ok);
  assert.ok(E.applyAction(s, 'p2', { type: 'theo' }).ok);
  /* cả 2 đều không còn ai hành động được nữa (p1 Tất tay, p2 đủ cược) → lật nốt bài chung */
  assert.equal(s.phase, 'ended');
  assert.equal(s.players[0].res.allin, true);
  assert.deepEqual(s.winnerIds, ['p1']);
});

test('chơi vui (blinds 0): bỏ qua góp mù, cược bằng chip, thắng không đụng ví', () => {
  const s = fresh(2, { blinds: 0 });
  assert.equal(s.phase, 'bet');
  assert.equal(s.toCall, 0);
  assert.equal(s.turn, 'p1'); /* UTG = nhà cái */
  assert.ok(E.applyAction(s, 'p1', { type: 'xem' }).ok);
  assert.ok(E.applyAction(s, 'p2', { type: 'xem' }).ok);
  assert.equal(s.street, 'flop');
  assert.equal(s.players[0].put, 0);
});

test('viewFor: giấu bài người khác khi đang chơi; hết ván mới lật bài người còn bài', () => {
  const s = fresh();
  let v = E.viewFor(s, 'p1');
  assert.equal(v.players.find(p => p.id === 'p1').cards.length, 2);
  assert.equal(v.players.find(p => p.id === 'p2').cards, null);
  assert.equal(v.you.cards.length, 2);
  assert.equal(v.you.toCall, 5); /* p1 là mù nhỏ, còn phải Theo 5 xu nữa sau khi góp mù */
  E.applyAction(s, 'p1', { type: 'blind', amount: 5 });
  E.applyAction(s, 'p2', { type: 'blind', amount: 10 });
  E.applyAction(s, 'p1', { type: 'bo' });
  v = E.viewFor(s, 'p2');
  assert.equal(v.phase, 'ended');
  assert.equal(v.players.find(p => p.id === 'p1').cards, null); /* p1 đã Bỏ — bài úp luôn */
  assert.equal(v.players.find(p => p.id === 'p2').cards.length, 2);
});

test('serialize/deserialize: state giống hệt sau khi đi-về JSON', () => {
  const s = fresh();
  E.applyAction(s, 'p1', { type: 'blind', amount: 5 });
  E.applyAction(s, 'p2', { type: 'blind', amount: 10 });
  E.applyAction(s, 'p1', { type: 'to', amount: 20 });
  const s2 = E.deserialize(E.serialize(s));
  assert.deepEqual(s2, s);
});

test('actors: góp mù thì chờ người góp; đang cược thì chờ người tới lượt; hết ván thì không ai', () => {
  const s = fresh();
  assert.deepEqual(E.actors(s), ['p1']);
  E.applyAction(s, 'p1', { type: 'blind', amount: 5 });
  assert.deepEqual(E.actors(s), ['p2']);
  E.applyAction(s, 'p2', { type: 'blind', amount: 10 });
  assert.deepEqual(E.actors(s), ['p1']);
  E.applyAction(s, 'p1', { type: 'bo' });
  assert.deepEqual(E.actors(s), []);
});

test('bot: Easy và Hard luôn trả hành động hợp lệ (mù + cược)', () => {
  const s = fresh(4);
  for (const pid of ['p2', 'p3']) {
    const a = chooseAction(s, pid, 'easy');
    assert.ok(a && a.type === 'blind', `bot ${pid} phải góp mù`);
    assert.ok(E.applyAction(s, pid, a).ok);
  }
  let guard = 0;
  while (s.phase !== 'ended' && guard++ < 200) {
    const pid = s.turn;
    const lvl = guard % 2 ? 'easy' : 'hard';
    const a = chooseAction(s, pid, lvl);
    assert.ok(a, `bot ${pid} (${lvl}) phải trả action ở ${s.phase}/${s.street}`);
    const r = E.applyAction(s, pid, a);
    assert.ok(r.ok, `bot ${pid} action ${JSON.stringify(a)} phải hợp lệ: ${r.reason || ''}`);
  }
  assert.equal(s.phase, 'ended', 'ván bot phải kết thúc');
});

test('cleanOpts: giá trị lạ thì về mặc định; maxPlayers giới hạn số người', () => {
  const o = E.cleanOpts({ blinds: 99, maxPlayers: 3, timer: 999 });
  assert.equal(o.blinds, 5);
  assert.equal(o.maxPlayers, 3);
  assert.equal(o.timer, 0);
  assert.throws(() => E.createGame([P('a', 'A'), P('b', 'B'), P('c', 'C'), P('d', 'D')], { maxPlayers: 3 }), /tối đa 3/);
});

console.log(`\n${pass} test luật Xì Tố ĐẠT.`);
