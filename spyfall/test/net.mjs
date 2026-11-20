// Test đồng bộ Spyfall: 2 bên áp cùng 1 dãy hành động → cùng trạng thái.
// Chạy: node spyfall/test/net.mjs
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { LOCATIONS } from '../js/locations.js';
import { botAction } from '../js/bot.js';

const P5 = [
  { id: 'p1', name: 'Một' }, { id: 'p2', name: 'Hai' }, { id: 'p3', name: 'Ba' },
  { id: 'p4', name: 'Bốn' }, { id: 'p5', name: 'Năm' },
];
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

/* 2 engine độc lập, cùng seed ván: tạo 1 ván rồi copy state sang bên kia */
function pair(players = P5, opts = {}) {
  const a = E.createGame(players, opts);
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
/* hỏi đáp 1 lượt ở cả 2 bên */
function askAnswerBoth(ab, from, to) {
  applyBoth(ab, from, { type: 'ask', to, text: 'Bạn thường làm gì ở đây?' });
  applyBoth(ab, to, { type: 'answer', text: 'Tôi làm việc ở đây mỗi ngày.' });
}

test('hỏi đáp: 2 bên giống nhau từng byte', () => {
  const ab = pair();
  const [a] = ab;
  askAnswerBoth(ab, a.askerId, a.players.find(p => p.id !== a.askerId).id);
  assert.equal(ab[0].qa.length, 1);
  assert.equal(ab[0].pendingQ, null);
});

/* bỏ phiếu cho cả bàn: mọi người bầu `target`, riêng `target` bầu người khác (không tự bầu mình) */
function voteAllFor(ab, target) {
  const [a] = ab;
  for (const p of a.players) {
    const t = p.id === target ? a.players.find(x => x.id !== target).id : target;
    applyBoth(ab, p.id, { type: 'vote', target: t });
  }
}

test('hô bỏ phiếu + bỏ phiếu buộc tội gián điệp: 2 bên cùng sang pha đoán', () => {
  const ab = pair();
  const [a] = ab;
  askAnswerBoth(ab, a.askerId, a.players.find(p => p.id !== a.askerId).id);
  applyBoth(ab, a.players[0].id, { type: 'callvote' });
  assert.equal(ab[0].phase, 'vote');
  voteAllFor(ab, a.spyId);
  assert.equal(ab[0].phase, 'guess');
  assert.equal(ab[0].accusedId, a.spyId);
});

test('gián điệp đoán sai địa điểm: 2 bên cùng kết thúc, đội thắng', () => {
  const ab = pair(P5, { target: 2 });
  const [a] = ab;
  applyBoth(ab, a.players[0].id, { type: 'callvote' });
  voteAllFor(ab, a.spyId);
  assert.equal(ab[0].phase, 'guess');
  const wrong = LOCATIONS.find(l => l.id !== a.locationId).id;
  applyBoth(ab, a.spyId, { type: 'guess', location: wrong });
  assert.equal(ab[0].phase, 'roundover');
  assert.equal(ab[0].endReason, 'spy-guess-wrong');
  assert.equal(ab[1].endReason, 'spy-guess-wrong');
});

test('buộc tội nhầm người: 2 bên cùng kết thúc, gián điệp thắng', () => {
  const ab = pair(P5, { target: 2 });
  const [a] = ab;
  const civ = a.players.find(p => !p.isSpy).id;
  applyBoth(ab, a.players[0].id, { type: 'callvote' });
  voteAllFor(ab, civ);
  assert.equal(ab[0].phase, 'roundover');
  assert.equal(ab[0].endReason, 'wrong-accuse');
  assert.deepEqual(ab[0].roundWinnerIds, [a.spyId]);
});

test('gián điệp đoán sớm sai: 2 bên cùng kết thúc', () => {
  const ab = pair(P5, { target: 2 });
  const [a] = ab;
  const wrong = LOCATIONS.find(l => l.id !== a.locationId).id;
  applyBoth(ab, a.spyId, { type: 'spyguess', location: wrong });
  assert.equal(ab[0].phase, 'roundover');
  assert.equal(ab[0].endReason, 'spy-early-wrong');
});

test('ván tiếp theo: 2 bên cùng sang ván 2, giữ điểm', () => {
  const ab = pair(P5, { target: 2 });
  const [a] = ab;
  const civ = a.players.find(p => !p.isSpy).id;
  const spy1 = a.spyId;
  applyBoth(ab, a.players[0].id, { type: 'callvote' });
  voteAllFor(ab, civ);
  assert.equal(ab[0].phase, 'roundover');
  applyBoth(ab, a.players[0].id, { type: 'next' });
  assert.equal(ab[0].phase, 'ask');
  assert.equal(ab[0].roundNo, 2);
  assert.equal(ab[0].wins[spy1], 1);
});

test('10 ván bot-vs-bot lockstep: 2 bên không lệch 1 byte', () => {
  for (let g = 0; g < 10; g++) {
    const players = Array.from({ length: 5 }, (_, i) => ({ id: 'b' + i, name: 'Bot' + i, isBot: true, level: i % 2 ? 'hard' : 'easy' }));
    const a = E.createGame(players, { target: 1 });
    const b = E.deserialize(E.serialize(a));
    let steps = 0;
    while (a.phase !== 'ended' && a.phase !== 'roundover' && steps < 500) {
      const acts = E.actors(a);
      assert.ok(acts.length, 'không còn người chơi mà ván chưa kết thúc');
      const pid = acts[0];
      const p = a.players.find(x => x.id === pid);
      const act = botAction(a, pid, p);
      assert.ok(act, 'bot không ra hành động');
      const ra = E.applyAction(a, pid, act);
      const rb = E.applyAction(b, pid, act);
      assert.ok(ra.ok, 'bot ra hành động sai: ' + JSON.stringify(act) + ' → ' + ra.reason);
      assert.deepEqual(ra, rb);
      assert.equal(E.serialize(a), E.serialize(b), `ván ${g} lệch ở bước ${steps}`);
      steps++;
    }
    assert.ok(a.phase === 'roundover' || a.phase === 'ended', `ván ${g} quá 500 bước`);
    assert.equal(b.phase, a.phase);
  }
});

console.log(`\n${pass} test đồng bộ đạt.`);
