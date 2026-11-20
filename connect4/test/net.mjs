// Test đồng bộ online Connect 4 (lockstep): 2 engine độc lập áp cùng action
// phải cho state giống hệt nhau. Chạy: node connect4/test/net.mjs
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { chooseMove } from '../js/bot.js';

const P1 = { id: 'p1', name: 'Đỏ' }, P2 = { id: 'p2', name: 'Vàng' };
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };
/* gid là id ngẫu nhiên của từng ván — 2 engine độc lập có gid khác nhau là
   đúng; serialize() trả về chuỗi JSON nên phải parse rồi mới bỏ gid */
const snap = s => { const o = JSON.parse(E.serialize(s)); delete o.gid; return JSON.stringify(o); };

function runGame(moves) {
  const a = E.createGame([P1, P2]), b = E.createGame([P1, P2]);
  for (const m of moves) {
    const rA = E.applyAction(a, m.pid, m.a);
    const rB = E.applyAction(b, m.pid, m.a);
    assert.ok(rA.ok, `engine A chấp nhận ${JSON.stringify(m)}`);
    assert.ok(rB.ok, `engine B chấp nhận ${JSON.stringify(m)}`);
    assert.equal(snap(a), snap(b), '2 engine giống hệt sau mỗi nước');
  }
  return { a, b };
}

test('luân phiên thả quân: 2 engine giống hệt sau mỗi nước, log đồng bộ', () => {
  runGame([
    { pid: 'p1', a: { type: 'move', col: 3 } },
    { pid: 'p2', a: { type: 'move', col: 3 } },
    { pid: 'p1', a: { type: 'move', col: 4 } },
    { pid: 'p2', a: { type: 'move', col: 4 } },
    { pid: 'p1', a: { type: 'move', col: 2 } },
    { pid: 'p2', a: { type: 'move', col: 5 } },
  ]);
});

test('thắng dọc đồng bộ: Đỏ thắng cột 4, cả 2 bên cùng kết thúc', () => {
  const { a } = runGame([
    { pid: 'p1', a: { type: 'move', col: 3 } },
    { pid: 'p2', a: { type: 'move', col: 0 } },
    { pid: 'p1', a: { type: 'move', col: 3 } },
    { pid: 'p2', a: { type: 'move', col: 1 } },
    { pid: 'p1', a: { type: 'move', col: 3 } },
    { pid: 'p2', a: { type: 'move', col: 2 } },
    { pid: 'p1', a: { type: 'move', col: 3 } },
  ]);
  assert.equal(a.phase, 'ended');
  assert.equal(a.winner, 'p1');
  assert.equal(a.endReason, 'four');
  assert.deepEqual(a.lastMove.winLine.map(c => [c.x, c.y]).sort(), [[3, 2], [3, 3], [3, 4], [3, 5]]);
});

test('10 ván bot vs bot: lockstep không lệch 1 byte, ván nào cũng kết thúc có lý do', () => {
  let draws = 0, wins = 0;
  for (let g = 0; g < 10; g++) {
    const a = E.createGame([P1, P2]), b = E.createGame([P1, P2]);
    let guard = 0;
    while (a.phase !== 'ended' && guard++ < 60) {
      const lvl = g % 2 ? 'easy' : 'hard';
      const pid = a.turn, side = a.players.find(p => p.id === pid).side;
      const act = chooseMove(a, pid, lvl);
      assert.ok(act && act.type === 'move', `bot ${lvl} luôn có nước đi (ván ${g + 1})`);
      const rA = E.applyAction(a, pid, act);
      const rB = E.applyAction(b, pid, act);
      assert.ok(rA.ok && rB.ok);
      assert.equal(snap(a), snap(b), `lockstep lệch ở ván ${g + 1}`);
      void side;
    }
    assert.equal(a.phase, 'ended', `ván ${g + 1} phải kết thúc`);
    assert.ok(['four', 'draw'].includes(a.endReason), `lý do kết thúc hợp lệ (ván ${g + 1})`);
    if (a.draw) draws++; else wins++;
  }
  console.log(`    (10 ván bot-vs-bot: thắng ${wins}, hòa ${draws})`);
});

test('đề nghị hòa + xin thua đồng bộ trên 2 engine', () => {
  const { a } = runGame([
    { pid: 'p1', a: { type: 'move', col: 3 } },
    { pid: 'p2', a: { type: 'draw' } },
    { pid: 'p1', a: { type: 'draw-decline' } },
    { pid: 'p2', a: { type: 'move', col: 4 } },
    { pid: 'p1', a: { type: 'draw' } },
    { pid: 'p2', a: { type: 'draw' } },
  ]);
  assert.equal(a.phase, 'ended');
  assert.equal(a.draw, true);
  assert.equal(a.endReason, 'draw-agree');
  const { a: s2 } = runGame([
    { pid: 'p1', a: { type: 'move', col: 3 } },
    { pid: 'p2', a: { type: 'resign' } },
  ]);
  assert.equal(s2.winner, 'p1');
  assert.equal(s2.endReason, 'resign');
});

test('action JSON qua lại: stringify/parse rồi áp vẫn đồng bộ; nước sai bị từ chối ở cả 2', () => {
  const a = E.createGame([P1, P2]), b = E.createGame([P1, P2]);
  const raw = JSON.stringify({ type: 'move', col: 3 });
  assert.ok(E.applyAction(a, 'p1', JSON.parse(raw)).ok);
  assert.ok(E.applyAction(b, 'p1', JSON.parse(raw)).ok);
  assert.equal(snap(a), snap(b));
  assert.equal(E.applyAction(a, 'p1', JSON.parse(JSON.stringify({ type: 'move', col: 3 }))).ok, false); /* p1 đi sai lượt */
  assert.equal(E.applyAction(b, 'p2', JSON.parse(JSON.stringify({ type: 'move', col: 99 }))).ok, false); /* cột ngoài bàn */
  assert.equal(snap(a), snap(b), 'nước sai bị từ chối giống nhau');
});

test('viewFor 2 bên: cùng cells/lượt, mySide khác nhau, serialize ổn định', () => {
  const a = E.createGame([P1, P2]);
  E.applyAction(a, 'p1', { type: 'move', col: 3 });
  const v1 = E.viewFor(a, 'p1'), v2 = E.viewFor(a, 'p2');
  assert.deepEqual(v1.cells, v2.cells);
  assert.equal(v1.mySide, 'R');
  assert.equal(v2.mySide, 'Y');
  assert.equal(v1.turn, 'p2');
  const s2 = E.deserialize(E.serialize(a));
  assert.deepEqual(E.viewFor(s2, 'p1'), v1);
});

test('host chọn phe Vàng đồng bộ: host Vàng, khách Đỏ đi trước', () => {
  const a = E.createGame([P1, P2], { side: 'yellow' });
  const b = E.createGame([P1, P2], { side: 'yellow' });
  assert.equal(snap(a), snap(b));
  assert.equal(a.turn, 'p2');
  const r = E.applyAction(a, 'p2', { type: 'move', col: 3 });
  assert.ok(r.ok);
  E.applyAction(b, 'p2', { type: 'move', col: 3 });
  assert.equal(snap(a), snap(b));
});

console.log(`\n${pass} test đạt.`);
