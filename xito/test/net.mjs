// Test đồng bộ online Xì Tố (mô phỏng 2 máy). Chạy: node xito/test/net.mjs
// 2 engine chạy cùng 1 chuỗi action (góp mù / cược) → serialize state 2 bên
// phải giống hệt nhau sau MỖI action. Action JSON đi-về (stringify/parse)
// không đổi. Dùng RNG có seed để 2 bên chia bài giống nhau.
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { chooseAction } from '../js/bot.js';

let seed = 987654321;
const rng = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
E.setRandom(rng);

const P1 = { id: 'p1', name: 'An' }, P2 = { id: 'p2', name: 'Bình', isBot: true }, P3 = { id: 'p3', name: 'Chi', isBot: true }, P4 = { id: 'p4', name: 'Dũng', isBot: true };
const mkPair = (players, opts) => {
  seed = 987654321; /* reset seed để 2 engine chia bài giống hệt nhau */
  const a = E.createGame(players, opts);
  seed = 987654321;
  const b = E.createGame(players, opts);
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

test('góp mù + cược 3 người: state giống hệt sau mỗi action, ván kết thúc có kết quả', () => {
  const pair = mkPair([P1, P2, P3], { blinds: 5 });
  let acts = 0;
  while (pair[0].phase !== 'ended' && acts < 200) {
    const pid = pair[0].turn;
    const a = chooseAction(pair[0], pid, pid === 'p1' ? 'hard' : 'easy');
    assert.ok(a, `phải có action cho ${pid}`);
    applyBoth(pair, pid, a);
    acts++;
  }
  assert.equal(pair[0].phase, 'ended');
  assert.ok(pair[0].players.every(p => p.res && typeof p.res.net === 'number'));
  assert.ok(['showdown', 'foldwin', 'draw'].includes(pair[0].endReason));
});

test('action sai thì 2 bên cùng từ chối, state không đổi', () => {
  const pair = mkPair([P1, P2], { blinds: 5 });
  applyBothExpectFail(pair, 'p2', { type: 'blind', amount: 10 }); /* chưa tới lượt p2 */
  applyBothExpectFail(pair, 'p1', { type: 'theo' }); /* đang góp mù */
  applyBothExpectFail(pair, 'p1', { type: 'to', amount: 20 }); /* đang góp mù, chưa cược được */
  assert.equal(pair[0].phase, 'blinds');
});

test('bot đấu bot qua action: 20 ván (mù 0/5, 2–4 người), state 2 bên giống hệt tới cuối ván', () => {
  for (let g = 0; g < 20; g++) {
    const players = [P1, P2, P3, P4].slice(0, 2 + (g % 3));
    const pair = mkPair(players, { blinds: [0, 5][g % 2] });
    let acts = 0;
    while (pair[0].phase !== 'ended' && acts < 200) {
      const pid = pair[0].turn;
      if (!pid) break;
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
  const pair = mkPair([P1, P2, P3], { blinds: 5 });
  const checkViews = () => {
    for (const pid of ['p1', 'p2', 'p3']) {
      assert.deepEqual(E.viewFor(pair[0], pid), E.viewFor(pair[1], pid), `view của ${pid} lệch nhau`);
    }
  };
  checkViews();
  for (let i = 0; i < 3; i++) {
    const pid = pair[0].turn;
    const a = chooseAction(pair[0], pid, 'hard');
    applyBoth(pair, pid, a);
    checkViews();
  }
});

console.log(`\n${pass} test đồng bộ Xì Tố ĐẠT.`);
