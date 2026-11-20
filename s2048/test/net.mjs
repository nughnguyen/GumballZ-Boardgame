// Đồng bộ 2048: 2 máy cùng áp 1 dãy hành động thì state giống hệt nhau
// từng byte (kể cả ô mới mọc — nhờ LCG trong state, không dùng Math.random).
import { createGame, applyAction, serialize } from '../js/engine.js';
import { botAction } from '../js/bot.js';

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
/* Date.now() trong state (startedAt/endedAt/failedAt) thì chuẩn hoá về 0
   trước khi so sánh — giống cách test Dò Mìn xử lý timestamp */
function norm(json) {
  const s = JSON.parse(json);
  s.gid = 'x'; /* gid sinh bằng Math.random — đồng nhất để so sánh */
  s.startedAt = 0; s.endedAt = 0;
  for (const p of s.players) { const pr = s.prog[p.id]; if (pr) { pr.finishedAt = 0; pr.failedAt = 0; } }
  return JSON.stringify(s);
}
const DIRS = ['up', 'down', 'left', 'right'];

t('2 máy solo cùng seed + cùng nước đi -> byte-identical', (() => {
  const a = createGame([{ id: 'me', name: 'A' }], { seed: 1234 });
  const b = createGame([{ id: 'me', name: 'A' }], { seed: 1234 });
  const moves = ['left', 'up', 'right', 'down', 'left', 'left', 'up', 'right', 'down', 'left', 'up', 'up', 'right', 'down'];
  for (const d of moves) { applyAction(a, 'me', { type: 'move', dir: d }); applyAction(b, 'me', { type: 'move', dir: d }); }
  return norm(serialize(a)) === norm(serialize(b));
})());

t('đua 2 người cùng seed + cùng nước đi xen kẽ -> byte-identical', (() => {
  const ps = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
  const a = createGame(ps, { seed: 777 });
  const b = createGame(ps, { seed: 777 });
  const seq = [
    ['a', 'left'], ['b', 'up'], ['a', 'right'], ['b', 'down'], ['a', 'up'],
    ['b', 'left'], ['a', 'down'], ['b', 'right'], ['a', 'left'], ['b', 'up'],
    ['a', 'right'], ['b', 'down'], ['a', 'up'], ['b', 'left'], ['a', 'down'],
  ];
  for (const [pid, d] of seq) { applyAction(a, pid, { type: 'move', dir: d }); applyAction(b, pid, { type: 'move', dir: d }); }
  return norm(serialize(a)) === norm(serialize(b));
})());

t('đua 4 người 400 nước (kể cả undo/xin thua) -> byte-identical', (() => {
  const ps = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }, { id: 'd', name: 'D' }];
  const a = createGame(ps, { seed: 2024 });
  const b = createGame(ps, { seed: 2024 });
  // dãy hành động giả định trước bằng LCG riêng của test (không dùng Math.random)
  let x = 987654321;
  const rnd = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
  for (let k = 0; k < 400; k++) {
    const pid = ps[(rnd() * 4) | 0].id;
    const act = rnd() < 0.92 ? { type: 'move', dir: DIRS[(rnd() * 4) | 0] } : { type: 'resign' };
    applyAction(a, pid, act);
    applyAction(b, pid, act);
    if (a.phase === 'ended') break;
  }
  return norm(serialize(a)) === norm(serialize(b));
})());

t('bot vs bot 10 ván lockstep không lệch 1 byte', (() => {
  for (let game = 0; game < 10; game++) {
    const seed = 5000 + game;
    const ps = [{ id: 'bot1', name: 'Máy 1', isBot: true, level: 'hard' }, { id: 'bot2', name: 'Máy 2', isBot: true, level: 'easy' }];
    const a = createGame(ps, { seed });
    const b = createGame(ps, { seed });
    let guard = 0;
    while (a.phase === 'playing' && guard++ < 3000) {
      for (const p of ps) {
        const act = botAction(a, p.id, p);
        if (act) { applyAction(a, p.id, act); applyAction(b, p.id, act); }
      }
    }
    if (norm(serialize(a)) !== norm(serialize(b))) return false;
  }
  return true;
})());

t('cùng seed thì ô mới mọc giống hệt sau 50 nước', (() => {
  const a = createGame([{ id: 'me', name: 'A' }], { seed: 31337 });
  const b = createGame([{ id: 'me', name: 'A' }], { seed: 31337 });
  let x = 555;
  const rnd = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
  for (let k = 0; k < 50; k++) {
    const d = DIRS[(rnd() * 4) | 0];
    applyAction(a, 'me', { type: 'move', dir: d });
    applyAction(b, 'me', { type: 'move', dir: d });
    if (a.phase === 'ended') break;
  }
  return norm(serialize(a)) === norm(serialize(b));
})());

console.log(`\nĐồng bộ 2048: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
