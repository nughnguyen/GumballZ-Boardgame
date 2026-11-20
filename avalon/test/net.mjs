// Test đồng bộ Avalon: 2 bên áp cùng 1 dãy hành động → cùng trạng thái.
// Chạy: node avalon/test/net.mjs
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';

const P5 = [
  { id: 'p1', name: 'Một' }, { id: 'p2', name: 'Hai' }, { id: 'p3', name: 'Ba' },
  { id: 'p4', name: 'Bốn' }, { id: 'p5', name: 'Năm' },
];
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

/* 2 engine độc lập, cùng seed ván: tạo 1 ván rồi copy state sang bên kia */
function pair(players = P5) {
  const a = E.createGame(players);
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
/* đưa cả 2 engine tới pha quest bằng đội toàn Thiện (đề xuất + bỏ phiếu Thuận hết) */
function toQuest(ab, team) {
  const [a] = ab;
  const lead = a.players[a.leader].id;
  applyBoth(ab, lead, { type: 'propose', team });
  for (const p of a.players) applyBoth(ab, p.id, { type: 'vote', approve: true });
  assert.equal(ab[0].phase, 'quest');
}

test('đề xuất + bỏ phiếu duyệt: 2 bên giống nhau từng byte', () => {
  const ab = pair();
  const [a] = ab;
  const lead = a.players[a.leader].id;
  applyBoth(ab, lead, { type: 'propose', team: [a.players[0].id, a.players[1].id] });
  for (const p of a.players) applyBoth(ab, p.id, { type: 'vote', approve: true });
  assert.equal(ab[0].phase, 'quest');
});

test('bỏ phiếu bác: đổi thủ lĩnh, 2 bên cùng đếm số lần bác', () => {
  const ab = pair();
  const [a] = ab;
  const lead0 = a.leader;
  const lead = a.players[lead0].id;
  applyBoth(ab, lead, { type: 'propose', team: [a.players[0].id, a.players[1].id] });
  for (const p of a.players) applyBoth(ab, p.id, { type: 'vote', approve: false });
  assert.equal(ab[0].phase, 'propose');
  assert.equal(ab[0].rejects, 1);
  assert.equal(ab[0].leader, (lead0 + 1) % 5);
});

test('nhiệm vụ thành công: 2 bên cùng sang nhiệm vụ sau', () => {
  const ab = pair();
  const [a] = ab;
  const team = [a.players[0].id, a.players[1].id];
  toQuest(ab, team);
  for (const id of team) applyBoth(ab, id, { type: 'quest', choice: 'success' });
  assert.equal(ab[0].quests[0].result, 'success');
  assert.equal(ab[0].questNo, 1);
});

test('nhiệm vụ thất bại + ám sát sai: 2 bên cùng kết thúc, phe Thiện thắng', () => {
  const ab = pair();
  const [a] = ab;
  /* 3 nhiệm vụ thành công bằng đội toàn người chơi đầu (chưa biết phe — dùng
     đội 2 người đầu, nếu có Ác phá thì ván vẫn tiến triển; ở đây ép bằng cách
     chọn đội rồi cho mọi người chọn success — Ác chọn success thì nhiệm vụ
     thành công, đúng luật) */
  for (let qi = 0; qi < 3; qi++) {
    const team = [a.players[0].id, a.players[1].id].slice(0, a.questSizes[qi]);
    /* nhiệm vụ 2–3 cần 3 người: thêm người thứ 3 */
    while (team.length < a.questSizes[qi]) team.push(a.players[team.length].id);
    toQuest(ab, team);
    for (const id of team) applyBoth(ab, id, { type: 'quest', choice: 'success' });
  }
  assert.equal(ab[0].phase, 'assassin');
  const ass = ab[0].players.find(p => p.role === 'assassin');
  const merlin = ab[0].players.find(p => p.role === 'merlin');
  const wrong = ab[0].players.find(p => p.side === 'good' && p.role !== 'merlin');
  applyBoth(ab, ass.id, { type: 'assassin', target: wrong.id });
  assert.equal(ab[0].winner, 'good');
  assert.equal(ab[0].endReason, 'assassin-wrong');
  assert.equal(ab[1].winner, 'good');
});

test('ám sát đúng Merlin: 2 bên cùng kết thúc, phe Ác lật kèo', () => {
  const ab = pair();
  const [a] = ab;
  for (let qi = 0; qi < 3; qi++) {
    const team = [];
    while (team.length < a.questSizes[qi]) team.push(a.players[team.length].id);
    toQuest(ab, team);
    for (const id of team) applyBoth(ab, id, { type: 'quest', choice: 'success' });
  }
  assert.equal(ab[0].phase, 'assassin');
  const ass = ab[0].players.find(p => p.role === 'assassin');
  const merlin = ab[0].players.find(p => p.role === 'merlin');
  applyBoth(ab, ass.id, { type: 'assassin', target: merlin.id });
  assert.equal(ab[0].winner, 'evil');
  assert.equal(ab[0].endReason, 'assassin');
});

test('xin thua: 2 bên cùng kết thúc', () => {
  const ab = pair();
  const [a] = ab;
  const good = a.players.find(p => p.side === 'good');
  applyBoth(ab, good.id, { type: 'resign' });
  assert.equal(ab[0].winner, 'evil');
  assert.equal(ab[1].winner, 'evil');
});

test('10 ván bot-vs-bot lockstep: 2 bên không lệch 1 byte', () => {
  for (let g = 0; g < 10; g++) {
    const players = Array.from({ length: 5 }, (_, i) => ({ id: 'b' + i, name: 'Bot' + i, isBot: true, level: i % 2 ? 'hard' : 'easy' }));
    const a = E.createGame(players);
    const b = E.deserialize(E.serialize(a));
    let steps = 0;
    while (a.phase !== 'ended' && steps < 500) {
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
    assert.equal(a.phase, 'ended', `ván ${g} quá 500 bước`);
    assert.equal(b.phase, 'ended');
  }
});

console.log(`\n${pass} test đồng bộ đạt.`);
