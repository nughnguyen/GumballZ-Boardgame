/* Rắn Săn Mồi net tests — lockstep: 2 states cùng seed + cùng dãy hành
   động phải cho serialize giống hệt nhau (kể cả vị trí mồi). */
import { createGame, applyAction, actors, viewFor, serialize, deserialize, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

Math.random = mulberry32(424242);

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }
const P = n => Array.from({ length: n }, (_, i) => ({ id: 'p' + (i + 1), name: 'P' + (i + 1) }));
/* serialize chứa startedAt/endedAt/timeMs/doneAt (thời gian thật) nên 2
   state giống hệt nhau về luật vẫn khác nhau ở các trường thời gian —
   khi so lockstep phải chuẩn hoá bỏ chúng. */
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
    { type: 'move', dir: 'up' }, { type: 'tick' }, { type: 'tick' },
    { type: 'move', dir: 'left' }, { type: 'tick' }, { type: 'tick' },
    { type: 'move', dir: 'down' }, { type: 'tick' },
    { type: 'move', dir: 'right' }, { type: 'tick' }, { type: 'tick' },
    { type: 'tick' }, { type: 'tick' }, { type: 'move', dir: 'up' },
    { type: 'tick' }, { type: 'tick' }, { type: 'tick' },
  ];
  const a = createGame(P(1), { seed: 777, rsMode: 'solo' });
  const b = createGame(P(1), { seed: 777, rsMode: 'solo' });
  let same = true;
  for (const act of script) {
    applyAction(a, 'p1', act);
    applyAction(b, 'p1', act);
    if (canon(a) !== canon(b)) { same = false; break; }
  }
  check('lockstep: cùng seed + cùng hành động → serialize giống hệt', same);
  check('lockstep: rắn/điểm/mồi giống nhau',
    JSON.stringify(a.prog.p1.snake) === JSON.stringify(b.prog.p1.snake) &&
    a.prog.p1.score === b.prog.p1.score &&
    JSON.stringify(a.prog.p1.food) === JSON.stringify(b.prog.p1.food));
}

// 2. khác seed → mồi đầu khác nhau (rất có thể) và rắn đi khác nhau
{
  const a = createGame(P(1), { seed: 11, rsMode: 'solo' });
  const b = createGame(P(1), { seed: 22, rsMode: 'solo' });
  check('khác seed → mồi đầu khác nhau',
    JSON.stringify(a.prog.p1.food) !== JSON.stringify(b.prog.p1.food),
    `${JSON.stringify(a.prog.p1.food)} vs ${JSON.stringify(b.prog.p1.food)}`);
}

// 3. đua 2 người: cả 2 dùng botAction + tick, 2 state song song phải đồng bộ
{
  const mk = () => createGame(
    [{ id: 'p1', name: 'P1', isBot: true, level: 'hard' }, { id: 'p2', name: 'P2', isBot: true, level: 'easy' }],
    { seed: 999, rsMode: 'race' });
  const a = mk(), b = mk();
  let same = true, steps = 0, illegal = 0;
  while (a.phase === 'playing' && steps < 5000) {
    steps++;
    for (const pid of actors(a)) {
      if (a.phase !== 'playing') break; // người trước có thể vừa kết thúc ván
      const act = botAction(a, pid);
      if (act) {
        const r1 = applyAction(a, pid, act);
        const r2 = applyAction(b, pid, act);
        if (!r1.ok || !r2.ok) illegal++;
      }
      const t1 = applyAction(a, pid, { type: 'tick' });
      const t2 = applyAction(b, pid, { type: 'tick' });
      if (!t1.ok || !t2.ok) illegal++;
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
  const a = createGame(P(1), { seed: 555, rsMode: 'solo' });
  applyAction(a, 'p1', { type: 'move', dir: 'up' });
  applyAction(a, 'p1', { type: 'tick' });
  applyAction(a, 'p1', { type: 'tick' });
  const b = deserialize(serialize(a));
  applyAction(a, 'p1', { type: 'move', dir: 'left' });
  applyAction(b, 'p1', { type: 'move', dir: 'left' });
  applyAction(a, 'p1', { type: 'tick' });
  applyAction(b, 'p1', { type: 'tick' });
  check('deserialize xong chơi tiếp vẫn đồng bộ', canon(a) === canon(b));
}

// 5. viewFor của 2 người khác nhau (mỗi người thấy bảng của mình)
{
  const s = createGame(P(2), { seed: 31, rsMode: 'race' });
  applyAction(s, 'p1', { type: 'tick' });
  const v1 = viewFor(s, 'p1');
  const v2 = viewFor(s, 'p2');
  check('view p1 khác view p2 (rắn/mồi khác nhau)', JSON.stringify(v1.my.snake) !== JSON.stringify(v2.my.snake));
  check('view p1.me = p1, view p2.me = p2', v1.me === 'p1' && v2.me === 'p2');
  check('view không lộ rắn/mồi đối thủ (players chỉ có tóm tắt)', v1.players.every(p => !('snake' in p) && !('food' in p)));
  check('view p1 thấy độ dài/điểm p2 qua tóm tắt', v1.players.find(p => p.id === 'p2').length === 4 && typeof v1.players.find(p => p.id === 'p2').score === 'number');
}

console.log(`\nRắn Săn Mồi net: ${pass} pass, ${fail} fail.`);
