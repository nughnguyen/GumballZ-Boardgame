// Test đồng bộ Mật Thư: 2 bên áp cùng 1 dãy hành động → cùng trạng thái.
// Chạy: node matthu/test/net.mjs
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';

const P4 = [
  { id: 'p1', name: 'Đỏ1' }, { id: 'p2', name: 'Xanh1' },
  { id: 'p3', name: 'Đỏ2' }, { id: 'p4', name: 'Xanh2' },
];
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

/* 2 engine độc lập, cùng seed bàn: tạo 1 ván rồi copy state sang bên kia */
function pair() {
  const a = E.createGame(P4);
  const b = E.deserialize(E.serialize(a));
  return [a, b];
}
function applyBoth(ab, pid, action) {
  const [a, b] = ab;
  const ra = E.applyAction(a, pid, action);
  const rb = E.applyAction(b, pid, action);
  assert.deepEqual(ra, rb, 'kết quả hành động khác nhau');
  assert.equal(E.serialize(a), E.serialize(b), 'state lệch sau ' + JSON.stringify(action));
  return ra;
}
const snap = s => E.serialize(s).replace(/"gid":"[^"]+"/, '"gid":"X"');

test('gợi ý + đoán đúng + đoán sai: 2 bên giống nhau từng byte', () => {
  const ab = pair();
  applyBoth(ab, 'p1', { type: 'clue', word: 'QWERTY', num: 2 });
  const [a] = ab;
  const ownIdx = a.colors.findIndex(c => c === 'R');
  const byIdx = a.colors.findIndex(c => c === 'N');
  applyBoth(ab, 'p3', { type: 'guess', idx: ownIdx });
  applyBoth(ab, 'p3', { type: 'guess', idx: byIdx });
  assert.equal(ab[0].turn, 'B');
  assert.equal(ab[0].phase, 'clue');
});

test('đoán trúng sát thủ: thua ngay, 2 bên cùng kết thúc', () => {
  const ab = pair();
  applyBoth(ab, 'p1', { type: 'clue', word: 'QWERTY', num: 2 });
  const assIdx = ab[0].colors.findIndex(c => c === 'A');
  const r = applyBoth(ab, 'p3', { type: 'guess', idx: assIdx });
  assert.ok(r.ended && r.kind === 'assassin');
  assert.equal(ab[0].winner, 'B');
  assert.equal(ab[1].winner, 'B');
});

test('bỏ lượt + xin thua: 2 bên giống nhau', () => {
  const ab = pair();
  applyBoth(ab, 'p1', { type: 'pass' });
  assert.equal(ab[0].turn, 'B');
  applyBoth(ab, 'p2', { type: 'clue', word: 'ZXCVB', num: 1 });
  const r = applyBoth(ab, 'p4', { type: 'resign' });
  assert.ok(r.ended);
  assert.equal(ab[0].winner, 'R');
});

test('hành động sai chỉ 1 bên từ chối → không lệch (bên kia cũng từ chối)', () => {
  const ab = pair();
  const ra = E.applyAction(ab[0], 'p3', { type: 'clue', word: 'X', num: 1 });
  const rb = E.applyAction(ab[1], 'p3', { type: 'clue', word: 'X', num: 1 });
  assert.equal(ra.ok, false);
  assert.deepEqual(ra, rb);
  assert.equal(E.serialize(ab[0]), E.serialize(ab[1]));
});

test('10 ván bot-đấu-bot lockstep: áp cùng dãy hành động bot, 0 byte lệch', () => {
  let games = 0, actions = 0, wins = { R: 0, B: 0 };
  for (let g = 0; g < 10; g++) {
    const ab = pair();
    let steps = 0;
    while (ab[0].phase !== 'ended' && steps < 400) {
      const actors = E.actors(ab[0]);
      assert.ok(actors.length > 0, 'đang chơi mà không còn người chơi');
      const pid = actors[0];
      const p = ab[0].players.find(x => x.id === pid);
      const a = botAction(ab[0], pid, p);
      assert.ok(a, 'bot không ra hành động');
      applyBoth(ab, pid, a);
      steps++; actions++;
    }
    assert.equal(ab[0].phase, 'ended', 'ván không kết thúc trong 400 bước');
    wins[ab[0].winner]++;
    games++;
  }
  console.log(`    (10 ván, ${actions} hành động, thắng Đỏ ${wins.R} – Xanh ${wins.B})`);
});

test('viewFor của 2 bên: cùng lá đã lật, cùng lượt, cùng gợi ý', () => {
  const ab = pair();
  applyBoth(ab, 'p1', { type: 'clue', word: 'QWERTY', num: 2 });
  const va = E.viewFor(ab[0], 'p3'), vb = E.viewFor(ab[1], 'p3');
  assert.deepEqual(va.shown, vb.shown);
  assert.deepEqual(va.clue, vb.clue);
  assert.equal(va.turn, vb.turn);
  assert.equal(va.key, null);
  assert.deepEqual(E.viewFor(ab[0], 'p1').key, E.viewFor(ab[1], 'p1').key);
});

test('snapshot: cùng dãy hành động trên 2 ván khác seed vẫn cho cùng cấu trúc', () => {
  const ab = pair();
  applyBoth(ab, 'p1', { type: 'clue', word: 'QWERTY', num: 1 });
  const a = JSON.parse(snap(ab[0])), b = JSON.parse(snap(ab[1]));
  assert.deepEqual(a, b);
});

console.log(`\n${pass} test đạt.`);
