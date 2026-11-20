// Test đồng bộ online Mậu Binh (mô phỏng 2 máy). Chạy: node maubinh/test/net.mjs
// 2 engine chạy cùng 1 chuỗi action (xếp bài / nhận bài đặc biệt) → serialize
// state 2 bên phải giống hệt nhau sau MỖI action. Action JSON đi-về
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

test('xếp bài 3 người (máy Khó): state giống hệt sau mỗi action, ván kết thúc có điểm', () => {
  const pair = mkPair({ chi: 5 });
  for (const pid of ['p1', 'p2', 'p3']) {
    const a = chooseAction(pair[0], pid, 'hard');
    assert.ok(a, `bot ${pid} phải trả action`);
    applyBoth(pair, pid, a);
  }
  assert.equal(pair[0].phase, 'ended');
  assert.equal(pair[0].endReason, 'showdown');
  assert.ok(pair[0].players.every(p => p.res && typeof p.res.score === 'number'));
});

test('xếp bài sai thì 2 bên cùng từ chối, state không đổi', () => {
  const pair = mkPair({ chi: 5 });
  const hand = pair[0].players[0].cards;
  applyBothExpectFail(pair, 'p1', { type: 'arrange', rows: { top: hand.slice(0, 3).map(c => c.id), mid: hand.slice(3, 7).map(c => c.id), bot: hand.slice(7, 12).map(c => c.id) } });
  applyBothExpectFail(pair, 'p2', { type: 'arrange', rows: { top: [], mid: [], bot: [] } });
  const noSp = pair[0].players.find(p => !p.special);
  assert.ok(noSp, 'phải có ít nhất 1 người không có bài đặc biệt');
  applyBothExpectFail(pair, noSp.id, { type: 'special' }); /* không có bài đặc biệt mà nhận thì bị từ chối */
  assert.equal(pair[0].phase, 'arrange');
});

test('nhận bài đặc biệt đồng bộ: 1 người có sảnh rồng thì thắng 3 chi', () => {
  const pair = mkPair({ chi: 5 });
  const dragon = [
    { r: 1, s: 'S', id: 'AS' }, { r: 2, s: 'H', id: '2H' }, { r: 3, s: 'D', id: '3D' },
    { r: 4, s: 'C', id: '4C' }, { r: 5, s: 'S', id: '5S' }, { r: 6, s: 'H', id: '6H' },
    { r: 7, s: 'D', id: '7D' }, { r: 8, s: 'C', id: '8C' }, { r: 9, s: 'S', id: '9S' },
    { r: 10, s: 'H', id: '10H' }, { r: 11, s: 'D', id: 'JD' }, { r: 12, s: 'C', id: 'QC' },
    { r: 13, s: 'S', id: 'KS' }];
  for (const s of pair) { s.players[0].cards = dragon; s.players[0].special = E.detectSpecial(dragon); }
  assert.equal(pair[0].players[0].special.kind, 'dragon');
  applyBoth(pair, 'p1', { type: 'special' });
  assert.equal(pair[0].players[0].arranged, true);
  for (const pid of ['p2', 'p3']) {
    const a = chooseAction(pair[0], pid, 'hard');
    applyBoth(pair, pid, a);
  }
  assert.equal(pair[0].phase, 'ended');
  assert.equal(pair[0].players[0].res.score, 6); /* thắng 3 chi × 2 đối thủ */
  assert.deepEqual(pair[0].winnerIds, ['p1']);
});

test('bot đấu bot qua action: 20 ván, state 2 bên giống hệt tới cuối ván', () => {
  for (let g = 0; g < 20; g++) {
    const pair = mkPair({ chi: [0, 5, 10][g % 3] });
    let acts = 0;
    while (pair[0].phase !== 'ended' && acts < 50) {
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
  const pair = mkPair({ chi: 5 });
  const checkViews = () => {
    for (const pid of ['p1', 'p2', 'p3']) {
      assert.deepEqual(E.viewFor(pair[0], pid), E.viewFor(pair[1], pid), `view của ${pid} lệch nhau`);
    }
  };
  checkViews();
  const a1 = chooseAction(pair[0], 'p1', 'hard');
  applyBoth(pair, 'p1', a1);
  checkViews();
  const a2 = chooseAction(pair[0], 'p2', 'hard');
  applyBoth(pair, 'p2', a2);
  checkViews();
  const a3 = chooseAction(pair[0], 'p3', 'hard');
  applyBoth(pair, 'p3', a3);
  checkViews();
  assert.equal(pair[0].phase, 'ended');
});

console.log(`\n${pass} test đồng bộ Mậu Binh ĐẠT.`);
