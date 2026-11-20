/* Tetris net tests — lockstep: 2 states cùng seed + cùng dãy hành động
   phải cho serialize giống hệt nhau (kể cả thứ tự túi). */
import { createGame, applyAction, actors, viewFor, serialize, deserialize, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

Math.random = mulberry32(424242);

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }
const P = n => Array.from({ length: n }, (_, i) => ({ id: 'p' + (i + 1), name: 'P' + (i + 1) }));
/* serialize chứa startedAt/endedAt/timeMs (thời gian thật) nên 2 state
   giống hệt nhau về luật vẫn khác nhau ở các trường thời gian — khi so
   lockstep phải chuẩn hoá bỏ chúng. */
function canon(s) {
  const o = JSON.parse(serialize(s));
  delete o.startedAt; delete o.endedAt; delete o.gid; // gid ngẫu nhiên theo ván, thời gian thật
  if (o.prog) for (const p of Object.values(o.prog)) delete p.doneAt; // doneAt = Date.now() khi xong
  if (o.final && o.final.summary) for (const p of Object.values(o.final.summary)) delete p.timeMs;
  return JSON.stringify(o);
}

// 1. cùng seed, cùng dãy hành động tay → serialize giống hệt
{
  const script = [
    { type: 'move', dx: -1 }, { type: 'move', dx: -1 }, { type: 'rotate', dir: 1 },
    { type: 'hard' }, { type: 'move', dx: 1 }, { type: 'rotate', dir: -1 },
    { type: 'soft' }, { type: 'soft' }, { type: 'hard' }, { type: 'hold' },
    { type: 'move', dx: 1 }, { type: 'move', dx: 1 }, { type: 'hard' },
    { type: 'tick' }, { type: 'tick' }, { type: 'hard' }, { type: 'hard' },
  ];
  const a = createGame(P(1), { seed: 777, ttMode: 'solo' });
  const b = createGame(P(1), { seed: 777, ttMode: 'solo' });
  let same = true;
  for (const act of script) {
    applyAction(a, 'p1', act);
    applyAction(b, 'p1', act);
    if (canon(a) !== canon(b)) { same = false; break; }
  }
  check('lockstep: cùng seed + cùng hành động → serialize giống hệt', same);
  check('lockstep: điểm/hàng giống nhau', a.prog.p1.score === b.prog.p1.score && a.prog.p1.lines === b.prog.p1.lines);
}

// 2. khác seed → túi khác nhau (ít nhất là khác ở 7 khối đầu)
{
  const a = createGame(P(1), { seed: 11, ttMode: 'solo' });
  const b = createGame(P(1), { seed: 22, ttMode: 'solo' });
  const orderA = [a.prog.p1.cur.type, ...a.prog.p1.next.slice(0, 6)].join('');
  const orderB = [b.prog.p1.cur.type, ...b.prog.p1.next.slice(0, 6)].join('');
  check('khác seed → thứ tự túi khác nhau', orderA !== orderB, `${orderA} vs ${orderB}`);
}

// 3. đua 2 người: cả 2 dùng botAction, 2 state song song phải đồng bộ
{
  const mk = () => createGame(
    [{ id: 'p1', name: 'P1', isBot: true, level: 'hard' }, { id: 'p2', name: 'P2', isBot: true, level: 'easy' }],
    { seed: 999, ttMode: 'race' });
  const a = mk(), b = mk();
  let same = true, steps = 0, illegal = 0;
  while (a.phase === 'playing' && steps < 5000) {
    steps++;
    for (const pid of actors(a)) {
      if (a.phase !== 'playing') break; // người trước có thể vừa kết thúc ván
      const act = botAction(a, pid);
      if (!act) continue;
      const r1 = applyAction(a, pid, act);
      const r2 = applyAction(b, pid, act);
      if (!r1.ok || !r2.ok) illegal++;
      if (canon(a) !== canon(b)) { same = false; break; }
    }
    if (!same) break;
  }
  check('lockstep đua bot: serialize giống hệt sau mỗi nước', same);
  check('lockstep đua bot: 0 nước sai luật', illegal === 0, `illegal=${illegal}`);
  check('lockstep đua bot: ván kết thúc', a.phase === 'ended' && b.phase === 'ended', `phase=${a.phase}`);
  check('lockstep đua bot: cùng người thắng', a.winner === b.winner, `${a.winner} vs ${b.winner}`);
}

// 4. deserialize rồi chơi tiếp vẫn đồng bộ
{
  const a = createGame(P(1), { seed: 555, ttMode: 'solo' });
  applyAction(a, 'p1', { type: 'move', dx: 1 });
  applyAction(a, 'p1', { type: 'hard' });
  const b = deserialize(serialize(a));
  applyAction(a, 'p1', { type: 'rotate', dir: 1 });
  applyAction(b, 'p1', { type: 'rotate', dir: 1 });
  applyAction(a, 'p1', { type: 'hard' });
  applyAction(b, 'p1', { type: 'hard' });
  check('deserialize xong chơi tiếp vẫn đồng bộ', canon(a) === canon(b));
}

// 5. viewFor của 2 người khác nhau (mỗi người thấy giếng của mình)
{
  const s = createGame(P(2), { seed: 31, ttMode: 'race' });
  applyAction(s, 'p1', { type: 'move', dx: -1 });
  const v1 = viewFor(s, 'p1');
  const v2 = viewFor(s, 'p2');
  check('view p1 khác view p2 (khối đang rơi khác vị trí)', JSON.stringify(v1.my.cur) !== JSON.stringify(v2.my.cur));
  check('view p1.me = p1, view p2.me = p2', v1.me === 'p1' && v2.me === 'p2');
}

console.log(`\nTetris net: ${pass} pass, ${fail} fail.`);
