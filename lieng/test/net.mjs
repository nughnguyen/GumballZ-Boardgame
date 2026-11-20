// Test đồng bộ online Liêng (mô phỏng 2 máy). Chạy: node lieng/test/net.mjs
// 2 engine chạy cùng 1 chuỗi action (góp gà, Tố/Theo/Bỏ) → serialize state
// 2 bên phải giống hệt nhau sau MỖI action. Action JSON đi-về
// (stringify/parse) không đổi. Dùng RNG có seed để 2 bên chia bài giống nhau.
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { chooseAction } from '../js/bot.js';

let seed = 987654321;
const rng = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
E.setRandom(rng);

const P1 = { id: 'p1', name: 'An' }, P2 = { id: 'p2', name: 'Bình', isBot: true }, P3 = { id: 'p3', name: 'Chi', isBot: true };
const mkPair = (opts) => {
  seed = 987654321; /* reset seed để 2 engine chia bài giống hệt nhau */
  const a = E.createGame([P1, P2, P3], opts);
  seed = 987654321;
  const b = E.createGame([P1, P2, P3], opts);
  a.gid = b.gid = 'net-test';
  return [a, b];
};
const applyBoth = (pair, pid, a) => {
  const rs = pair.map(s => E.applyAction(s, pid, JSON.parse(JSON.stringify(a))));
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

test('góp gà + Tố/Theo xen kẽ: state giống hệt sau mỗi action', () => {
  const pair = mkPair({ ante: 5 });
  applyBoth(pair, 'p1', { type: 'ante' });
  applyBoth(pair, 'p2', { type: 'ante' });
  applyBoth(pair, 'p3', { type: 'ante' });
  applyBoth(pair, 'p2', { type: 'to', raise: 5 });
  applyBoth(pair, 'p3', { type: 'theo' });
  applyBoth(pair, 'p1', { type: 'theo' }); /* p1 Theo xong thì cả 3 đều đã hành động và bằng gà → lật bài */
  assert.equal(pair[0].phase, 'ended');
  assert.equal(pair[0].endReason, 'showdown');
});

test('Bỏ hết → hốt gà: state giống hệt, gà chia đúng', () => {
  const pair = mkPair({ ante: 10 });
  applyBoth(pair, 'p1', { type: 'ante' });
  applyBoth(pair, 'p2', { type: 'ante' });
  applyBoth(pair, 'p3', { type: 'ante' });
  applyBoth(pair, 'p2', { type: 'bo' });
  applyBoth(pair, 'p3', { type: 'bo' });
  assert.equal(pair[0].phase, 'ended');
  assert.equal(pair[0].endReason, 'fold-win');
  assert.deepEqual(pair[0].winnerIds, ['p1']);
  assert.equal(pair[0].players.find(p => p.id === 'p1').res.share, 30);
});

test('chơi vui (ante 0): Tố/Theo/Bỏ đồng bộ, không cần góp gà', () => {
  const pair = mkPair({ ante: 0 });
  applyBothExpectFail(pair, 'p1', { type: 'ante' }); /* chơi vui thì không có bước góp gà */
  applyBoth(pair, 'p2', { type: 'to', raise: 10 });
  applyBoth(pair, 'p3', { type: 'bo' });
  applyBoth(pair, 'p1', { type: 'theo' }); /* p1 Theo xong thì cả 2 người còn lại đều đã hành động và bằng gà → lật bài */
  assert.equal(pair[0].phase, 'ended');
  assert.equal(pair[0].pot, 20); /* chơi vui: gà vẫn tính bằng ĐIỂM (20 điểm), không phải xu — ví không đụng tới */
});

test('ante-free đồng bộ: 1 người không góp, ván vẫn chạy và chia gà đúng', () => {
  const pair = mkPair({ ante: 5 });
  applyBoth(pair, 'p1', { type: 'ante' });
  applyBoth(pair, 'p2', { type: 'ante-free' });
  applyBoth(pair, 'p3', { type: 'ante' });
  assert.equal(pair[0].pot, 10);
  applyBoth(pair, 'p2', { type: 'theo' });
  applyBoth(pair, 'p3', { type: 'theo' });
  applyBoth(pair, 'p1', { type: 'theo' });
  assert.equal(pair[0].phase, 'ended');
});

test('bot đấu bot qua action: 20 ván, state 2 bên giống hệt tới cuối ván', () => {
  for (let g = 0; g < 20; g++) {
    const pair = mkPair({ ante: [0, 5, 10][g % 3] });
    let acts = 0;
    while (pair[0].phase !== 'ended' && acts < 100) {
      const ids = E.actors(pair[0]);
      if (!ids.length) break;
      const pid = ids[0];
      const a = chooseAction(pair[0], pid, g % 2 ? 'easy' : 'hard');
      if (!a) break;
      applyBoth(pair, pid, a);
      acts++;
    }
    assert.equal(pair[0].phase, 'ended', `ván ${g} phải kết thúc`);
    assert.deepEqual(E.serialize(pair[0]), E.serialize(pair[1]), `ván ${g}: state cuối 2 bên phải giống hệt`);
  }
});

test('viewFor giống hệt 2 bên sau mỗi action (kể cả bài giấu)', () => {
  const pair = mkPair({ ante: 5 });
  const checkViews = () => {
    for (const pid of ['p1', 'p2', 'p3']) {
      assert.deepEqual(E.viewFor(pair[0], pid), E.viewFor(pair[1], pid), `view của ${pid} lệch nhau`);
    }
  };
  checkViews();
  applyBoth(pair, 'p1', { type: 'ante' });
  checkViews();
  applyBoth(pair, 'p2', { type: 'ante' });
  applyBoth(pair, 'p3', { type: 'ante' });
  checkViews();
  applyBoth(pair, 'p2', { type: 'to', raise: 5 });
  checkViews();
  applyBoth(pair, 'p3', { type: 'theo' });
  applyBoth(pair, 'p1', { type: 'theo' }); /* p1 Theo xong thì lật bài */
  checkViews();
  assert.equal(pair[0].phase, 'ended');
});

console.log(`\n${pass} test đồng bộ Liêng ĐẠT.`);
