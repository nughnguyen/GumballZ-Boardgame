// Test luật Mậu Binh. Chạy: node maubinh/test/rules.mjs
// Kiểm đúng luật: tạo ván (13 lá/người, phát hiện bài đặc biệt), tính bài
// 5 lá/3 lá, so chi liên cỡ, binh lủng, bài đặc biệt, xếp bài (đủ 13 lá,
// không trùng, đúng bài của mình), tính điểm chi trước từng đối thủ, lật
// bài cuối ván, viewFor giấu bài, serialize.
import assert from 'assert/strict';
import * as E from '../js/engine.js';

let seed = 1234567;
const rng = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
E.setRandom(rng);

const P = (id, name, extra = {}) => ({ id, name, ...extra });
const C = (r, s) => ({ r, s, id: (r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r)) + s });
const cardsOf = (...rs) => rs.map(([r, s]) => C(r, s));
const setCards = (s, pid, cards) => { const p = s.players.find(x => x.id === pid); p.cards = cards; p.special = E.detectSpecial(cards); };
const setRows = (s, pid, top, mid, bot) => {
  const p = s.players.find(x => x.id === pid);
  const all = [...top, ...mid, ...bot];
  p.cards = all;
  const r = E.applyAction(s, pid, { type: 'arrange', rows: { top: top.map(c => c.id), mid: mid.map(c => c.id), bot: bot.map(c => c.id) } });
  assert.ok(r.ok, `xếp bài phải hợp lệ: ${r.reason || ''}`);
};
const fresh = (n = 2, opts = {}) => E.createGame([P('p1', 'An'), P('p2', 'Bình'), P('p3', 'Chi'), P('p4', 'Dũng')].slice(0, n), opts);
/* 2 bộ bài mẫu hợp lệ, không trùng lá: STRONG thắng cả 3 chi trước WEAK */
const STRONG = [
  cardsOf([9, 'S'], [9, 'H'], [2, 'D']),
  cardsOf([5, 'S'], [6, 'H'], [7, 'D'], [8, 'C'], [9, 'D']),
  cardsOf([1, 'S'], [13, 'S'], [11, 'S'], [7, 'S'], [3, 'S'])];
const WEAK = [
  cardsOf([7, 'S'], [7, 'H'], [3, 'D']),
  cardsOf([1, 'S'], [1, 'H'], [5, 'D'], [4, 'C'], [2, 'S']),
  cardsOf([13, 'S'], [13, 'H'], [12, 'D'], [12, 'C'], [6, 'D'])];
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

test('khởi tạo: 2 người, mỗi người 13 lá, đang chờ xếp bài', () => {
  const s = fresh();
  assert.equal(s.phase, 'arrange');
  assert.equal(s.players.length, 2);
  for (const p of s.players) assert.equal(p.cards.length, 13);
  assert.equal(s.deck.length, 52 - 26);
  assert.equal(s.opts.chi, 5);
  assert.deepEqual(E.actors(s), ['p1', 'p2']);
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
  /* so trong cùng bậc: tứ quý Át > tứ quý K; sảnh Át cao > sảnh 5 cao */
  assert.ok(E.compareEval(ev(cardsOf([1, 'S'], [1, 'H'], [1, 'D'], [1, 'C'], [2, 'S'])), ev(cardsOf([13, 'S'], [13, 'H'], [13, 'D'], [13, 'C'], [2, 'S']))) > 0);
  assert.ok(E.compareEval(ev(cardsOf([10, 'S'], [11, 'H'], [12, 'D'], [13, 'C'], [1, 'S'])), ev(cardsOf([1, 'S'], [2, 'H'], [3, 'D'], [4, 'C'], [5, 'S']))) > 0);
});

test('tính bài 3 lá: sám > đôi > mậu thầu; so liên cỡ với 5 lá', () => {
  const e3 = cards => E.eval3(cards), e5 = cards => E.eval5(cards);
  assert.equal(e3(cardsOf([1, 'S'], [1, 'H'], [1, 'D'])).cat, 4); /* sám Át */
  assert.equal(e3(cardsOf([9, 'S'], [9, 'H'], [2, 'D'])).cat, 2); /* đôi 9 */
  assert.equal(e3(cardsOf([1, 'S'], [13, 'H'], [7, 'D'])).cat, 1); /* mậu thầu */
  /* sám 3 lá (cat 4) mạnh ngang sám 5 lá; đôi Át 3 lá (cat 2) mạnh hơn đôi 2 năm lá (cat 2, so lá) */
  assert.ok(E.compareEval(e3(cardsOf([1, 'S'], [1, 'H'], [1, 'D'])), e5(cardsOf([7, 'S'], [7, 'H'], [7, 'D'], [13, 'C'], [2, 'S'])) ) > 0); /* sám Át > sám 7 */
  assert.ok(E.compareEval(e3(cardsOf([1, 'S'], [1, 'H'], [5, 'D'])), e5(cardsOf([2, 'S'], [2, 'H'], [5, 'D'], [4, 'C'], [3, 'S'])) ) > 0); /* đôi Át > đôi 2 */
  assert.ok(E.compareEval(e3(cardsOf([2, 'S'], [2, 'H'], [5, 'D'])), e5(cardsOf([1, 'S'], [1, 'H'], [5, 'D'], [4, 'C'], [3, 'S'])) ) < 0); /* đôi 2 < đôi Át */
});

test('bài đặc biệt: sảnh rồng, 6 đôi, 5 đôi 1 sám, 3 thùng, 3 sảnh', () => {
  const dragon = cardsOf([1, 'S'], [2, 'H'], [3, 'D'], [4, 'C'], [5, 'S'], [6, 'H'], [7, 'D'], [8, 'C'], [9, 'S'], [10, 'H'], [11, 'D'], [12, 'C'], [13, 'S']);
  assert.equal(E.detectSpecial(dragon).kind, 'dragon');
  const six = cardsOf([2, 'S'], [2, 'H'], [3, 'S'], [3, 'H'], [4, 'S'], [4, 'H'], [5, 'S'], [5, 'H'], [6, 'S'], [6, 'H'], [7, 'S'], [7, 'H'], [8, 'S']);
  assert.equal(E.detectSpecial(six).kind, 'sixpairs');
  const five = cardsOf([7, 'S'], [7, 'H'], [7, 'D'], [2, 'S'], [2, 'H'], [3, 'S'], [3, 'H'], [4, 'S'], [4, 'H'], [5, 'S'], [5, 'H'], [6, 'S'], [6, 'H']);
  assert.equal(E.detectSpecial(five).kind, 'fivepairs');
  const flush3 = cardsOf([1, 'S'], [2, 'S'], [3, 'S'], [4, 'S'], [5, 'S'], [6, 'S'], [7, 'S'], [8, 'S'], [1, 'H'], [9, 'H'], [10, 'H'], [11, 'H'], [12, 'H']);
  assert.equal(E.detectSpecial(flush3).kind, 'threeflush');
  const straight3 = cardsOf([1, 'S'], [2, 'H'], [3, 'D'], [4, 'C'], [5, 'S'], [6, 'H'], [7, 'D'], [8, 'C'], [10, 'S'], [11, 'H'], [12, 'D'], [13, 'C'], [1, 'H']);
  assert.equal(E.detectSpecial(straight3).kind, 'threestraight');
  const normal = cardsOf([2, 'S'], [2, 'H'], [3, 'D'], [4, 'C'], [5, 'S'], [6, 'H'], [7, 'D'], [8, 'C'], [9, 'S'], [10, 'H'], [11, 'D'], [12, 'C'], [13, 'S']);
  assert.equal(E.detectSpecial(normal), null);
});

test('xếp bài sai: thiếu lá, trùng lá, lá không phải của mình, xếp 2 lần', () => {
  const s = fresh();
  const hand = s.players[0].cards;
  assert.equal(E.applyAction(s, 'p1', { type: 'arrange', rows: { top: hand.slice(0, 3).map(c => c.id), mid: hand.slice(3, 7).map(c => c.id), bot: hand.slice(7, 12).map(c => c.id) } }).ok, false); /* thiếu 1 lá */
  assert.equal(E.applyAction(s, 'p1', { type: 'arrange', rows: { top: hand.slice(0, 3).map(c => c.id), mid: hand.slice(3, 8).map(c => c.id), bot: [...hand.slice(8, 12).map(c => c.id), hand[0].id] } }).ok, false); /* trùng lá */
  assert.equal(E.applyAction(s, 'p1', { type: 'arrange', rows: { top: hand.slice(0, 2).map(c => c.id).concat(['XX']), mid: hand.slice(3, 8).map(c => c.id), bot: hand.slice(8, 13).map(c => c.id) } }).ok, false); /* lá lạ */
  const ok = E.applyAction(s, 'p1', { type: 'arrange', rows: { top: hand.slice(0, 3).map(c => c.id), mid: hand.slice(3, 8).map(c => c.id), bot: hand.slice(8, 13).map(c => c.id) } });
  assert.ok(ok.ok);
  assert.equal(E.applyAction(s, 'p1', { type: 'arrange', rows: { top: hand.slice(0, 3).map(c => c.id), mid: hand.slice(3, 8).map(c => c.id), bot: hand.slice(8, 13).map(c => c.id) } }).ok, false); /* xếp 2 lần */
});

test('tính điểm: thắng cả 3 chi được +3, thua cả 3 chi −3 (chi 5 xu → ±15 xu)', () => {
  const s = fresh(2, { chi: 5 });
  /* p1 STRONG thắng cả 3 chi trước p2 WEAK */
  setRows(s, 'p1', STRONG[0], STRONG[1], STRONG[2]);
  setRows(s, 'p2', WEAK[0], WEAK[1], WEAK[2]);
  assert.equal(s.phase, 'ended');
  assert.deepEqual(s.winnerIds, ['p1']);
  assert.equal(s.players[0].res.score, 3);
  assert.equal(s.players[0].res.delta, 15);
  assert.equal(s.players[1].res.score, -3);
  assert.equal(s.players[1].res.delta, -15);
  assert.deepEqual(s.players[0].res.vs.p2, [1, 1, 1]);
});

test('binh lủng: Đầu sám Át mà Giữa chỉ có đôi → thua cả 3 chi', () => {
  const s = fresh(2, { chi: 5 });
  setRows(s, 'p1',
    cardsOf([1, 'S'], [1, 'H'], [1, 'D']),
    cardsOf([2, 'S'], [2, 'H'], [5, 'D'], [4, 'C'], [3, 'S']),
    cardsOf([13, 'S'], [13, 'H'], [13, 'D'], [13, 'C'], [6, 'C']));
  setRows(s, 'p2', STRONG[0], STRONG[1], STRONG[2]);
  assert.equal(s.phase, 'ended');
  assert.equal(s.players[0].res.foul, true);
  assert.equal(s.players[0].res.score, -3);
  assert.deepEqual(s.winnerIds, ['p2']);
});

test('bài đặc biệt thắng luôn 3 chi; 2 người cùng đặc biệt thì hòa nhau', () => {
  const s = fresh(2, { chi: 5 });
  const dragon = cardsOf([1, 'S'], [2, 'H'], [3, 'D'], [4, 'C'], [5, 'S'], [6, 'H'], [7, 'D'], [8, 'C'], [9, 'S'], [10, 'H'], [11, 'D'], [12, 'C'], [13, 'S']);
  setCards(s, 'p1', dragon);
  assert.equal(s.players[0].special.kind, 'dragon');
  assert.ok(E.applyAction(s, 'p1', { type: 'special' }).ok);
  setRows(s, 'p2', STRONG[0], STRONG[1], STRONG[2]);
  assert.equal(s.phase, 'ended');
  assert.equal(s.players[0].res.score, 3);
  assert.equal(s.players[0].res.special, 'dragon');
  assert.deepEqual(s.winnerIds, ['p1']);
  /* 2 người cùng đặc biệt: hòa 0-0 */
  const s2 = fresh(2, { chi: 5 });
  setCards(s2, 'p1', dragon);
  setCards(s2, 'p2', dragon);
  E.applyAction(s2, 'p1', { type: 'special' });
  E.applyAction(s2, 'p2', { type: 'special' });
  assert.equal(s2.phase, 'ended');
  assert.equal(s2.players[0].res.score, 0);
  assert.equal(s2.players[1].res.score, 0);
  assert.deepEqual(s2.winnerIds, []);
  assert.equal(s2.endReason, 'draw');
});

test('hòa chi: xếp giống hệt nhau thì hòa 0-0, không ai thắng', () => {
  const s = fresh(2, { chi: 5 });
  setRows(s, 'p1', STRONG[0], STRONG[1], STRONG[2]);
  setRows(s, 'p2', STRONG[0], STRONG[1], STRONG[2]);
  assert.equal(s.phase, 'ended');
  assert.equal(s.players[0].res.score, 0);
  assert.deepEqual(s.winnerIds, []);
});

test('chơi vui (chi 0): điểm vẫn tính, delta xu = 0', () => {
  const s = fresh(2, { chi: 0 });
  setRows(s, 'p1', STRONG[0], STRONG[1], STRONG[2]);
  setRows(s, 'p2', WEAK[0], WEAK[1], WEAK[2]);
  assert.equal(s.players[0].res.score, 3);
  assert.equal(s.players[0].res.delta, 0);
});

test('4 người: điểm tổng là tổng trước từng đối thủ', () => {
  const s = fresh(4, { chi: 5 });
  setRows(s, 'p1', STRONG[0], STRONG[1], STRONG[2]);
  setRows(s, 'p2', WEAK[0], WEAK[1], WEAK[2]);
  setRows(s, 'p3', WEAK[0], WEAK[1], WEAK[2]);
  setRows(s, 'p4', WEAK[0], WEAK[1], WEAK[2]);
  assert.equal(s.players[0].res.score, 9); /* thắng 3 chi × 3 đối thủ */
  assert.equal(s.players[0].res.delta, 45);
  assert.equal(s.players[1].res.score, -3); /* thua p1 3 chi, hòa p3/p4 */
  assert.deepEqual(s.winnerIds, ['p1']);
});

test('serialize/deserialize: state giống hệt sau khi đi-về JSON', () => {
  const s = fresh();
  const hand = s.players[0].cards;
  E.applyAction(s, 'p1', { type: 'arrange', rows: { top: hand.slice(0, 3).map(c => c.id), mid: hand.slice(3, 8).map(c => c.id), bot: hand.slice(8, 13).map(c => c.id) } });
  const s2 = E.deserialize(E.serialize(s));
  assert.deepEqual(s2, s);
});

test('viewFor: giấu bài người khác khi đang xếp; hết ván mới lật hết', () => {
  const s = fresh();
  let v = E.viewFor(s, 'p1');
  assert.equal(v.players.find(p => p.id === 'p1').cards.length, 13);
  assert.equal(v.players.find(p => p.id === 'p2').cards, null);
  assert.equal(v.players.find(p => p.id === 'p2').rows, null);
  assert.equal(v.you.cards.length, 13);
  const hand = s.players[0].cards;
  E.applyAction(s, 'p1', { type: 'arrange', rows: { top: hand.slice(0, 3).map(c => c.id), mid: hand.slice(3, 8).map(c => c.id), bot: hand.slice(8, 13).map(c => c.id) } });
  const hand2 = s.players[1].cards;
  E.applyAction(s, 'p2', { type: 'arrange', rows: { top: hand2.slice(0, 3).map(c => c.id), mid: hand2.slice(3, 8).map(c => c.id), bot: hand2.slice(8, 13).map(c => c.id) } });
  v = E.viewFor(s, 'p2');
  assert.equal(v.phase, 'ended');
  assert.equal(v.players.find(p => p.id === 'p1').cards.length, 13);
  assert.equal(v.players.find(p => p.id === 'p1').rows.top.length, 3);
  assert.equal(v.players.find(p => p.id === 'p1').res.score, v.players.find(p => p.id === 'p1').res.score);
});

test('actors: đang xếp thì chờ người chưa xếp; hết ván thì không ai', () => {
  const s = fresh();
  assert.deepEqual(E.actors(s), ['p1', 'p2']);
  const hand = s.players[0].cards;
  E.applyAction(s, 'p1', { type: 'arrange', rows: { top: hand.slice(0, 3).map(c => c.id), mid: hand.slice(3, 8).map(c => c.id), bot: hand.slice(8, 13).map(c => c.id) } });
  assert.deepEqual(E.actors(s), ['p2']);
  const hand2 = s.players[1].cards;
  E.applyAction(s, 'p2', { type: 'arrange', rows: { top: hand2.slice(0, 3).map(c => c.id), mid: hand2.slice(3, 8).map(c => c.id), bot: hand2.slice(8, 13).map(c => c.id) } });
  assert.deepEqual(E.actors(s), []);
});

console.log(`\n${pass} test luật Mậu Binh ĐẠT.`);
