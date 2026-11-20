/* Xếp Kẹo net tests — lockstep: 2 states cùng seed + cùng dãy hành
   động phải cho serialize giống hệt nhau (kể cả bảng sau khi nổ).
   Không có tick — mỗi nước là 1 lần đổi kẹo do người/bot gửi. */
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
/* Chạy 1 ván bằng bot cho cả 2 state song song (cùng Math.random đã seed). */
function driveBoth(a, b, maxMoves = 200) {
  let same = true, illegal = 0, moves = 0;
  while (a.phase === 'playing' && moves < maxMoves) {
    moves++;
    for (const pid of actors(a)) {
      if (a.phase !== 'playing') break;
      const act = botAction(a, pid);
      if (!act) continue;
      const r1 = applyAction(a, pid, act);
      const r2 = applyAction(b, pid, act);
      if (!r1.ok || !r2.ok) illegal++;
      if (canon(a) !== canon(b)) { same = false; break; }
    }
    if (!same) break;
  }
  return { same, illegal, moves, ended: a.phase === 'ended' && b.phase === 'ended' };
}

// 1. chơi đơn bot: cùng seed + cùng nước bot → serialize giống hệt
{
  Math.random = mulberry32(777);
  const a = createGame([{ id: 'p1', name: 'P1', isBot: true, level: 'hard' }], { seed: 777, xcMode: 'solo' });
  Math.random = mulberry32(777);
  const b = createGame([{ id: 'p1', name: 'P1', isBot: true, level: 'hard' }], { seed: 777, xcMode: 'solo' });
  const r = driveBoth(a, b);
  check('lockstep solo bot: serialize giống hệt sau mỗi nước', r.same);
  check('lockstep solo bot: 0 nước sai luật', r.illegal === 0, `illegal=${r.illegal}`);
  check('lockstep solo bot: ván kết thúc', r.ended, `phase=${a.phase}`);
  check('lockstep solo bot: cùng điểm', a.prog.p1.score === b.prog.p1.score, `${a.prog.p1.score} vs ${b.prog.p1.score}`);
  check('lockstep solo bot: cùng bảng', JSON.stringify(a.prog.p1.grid) === JSON.stringify(b.prog.p1.grid));
}

// 2. khác seed → bảng đầu khác nhau (rất có thể)
{
  const a = createGame(P(1), { seed: 11, xcMode: 'solo' });
  const b = createGame(P(1), { seed: 22, xcMode: 'solo' });
  check('khác seed → bảng đầu khác nhau',
    JSON.stringify(a.prog.p1.grid) !== JSON.stringify(b.prog.p1.grid));
}

// 3. đua 2 người: cả 2 dùng botAction, 2 state song song phải đồng bộ
{
  const mk = () => createGame(
    [{ id: 'p1', name: 'P1', isBot: true, level: 'hard' }, { id: 'p2', name: 'P2', isBot: true, level: 'easy' }],
    { seed: 999, xcMode: 'race' });
  Math.random = mulberry32(999);
  const a = mk();
  Math.random = mulberry32(999);
  const b = mk();
  const r = driveBoth(a, b);
  check('lockstep đua bot: serialize giống hệt sau mỗi nước', r.same);
  check('lockstep đua bot: 0 nước sai luật', r.illegal === 0, `illegal=${r.illegal}`);
  check('lockstep đua bot: ván kết thúc', r.ended, `phase=${a.phase}`);
  check('lockstep đua bot: cùng người thắng', a.winner === b.winner, `${a.winner} vs ${b.winner}`);
  check('lockstep đua bot: cùng điểm 2 người',
    a.prog.p1.score === b.prog.p1.score && a.prog.p2.score === b.prog.p2.score);
}

// 4. đua 4 người lockstep
{
  const mk = () => createGame(
    [1, 2, 3, 4].map(i => ({ id: 'p' + i, name: 'P' + i, isBot: true, level: i % 2 ? 'hard' : 'easy' })),
    { seed: 1234, xcMode: 'race' });
  Math.random = mulberry32(1234);
  const a = mk();
  Math.random = mulberry32(1234);
  const b = mk();
  const r = driveBoth(a, b);
  check('lockstep đua 4 người: serialize giống hệt', r.same);
  check('lockstep đua 4 người: 0 nước sai luật', r.illegal === 0, `illegal=${r.illegal}`);
  check('lockstep đua 4 người: ván kết thúc', r.ended, `phase=${a.phase}`);
}

// 5. deserialize rồi chơi tiếp vẫn đồng bộ
{
  Math.random = mulberry32(555);
  const a = createGame(P(1), { seed: 555, xcMode: 'solo' });
  const act = botAction(a, 'p1');
  if (act) applyAction(a, 'p1', act);
  const b = deserialize(serialize(a));
  Math.random = mulberry32(555);
  const act2 = botAction(a, 'p1');
  if (act2) { applyAction(a, 'p1', act2); applyAction(b, 'p1', act2); }
  check('deserialize xong chơi tiếp vẫn đồng bộ', canon(a) === canon(b));
}

// 6. viewFor của 2 người khác nhau (mỗi người thấy bảng của mình)
{
  const s = createGame(P(2), { seed: 31, xcMode: 'race' });
  const v1 = viewFor(s, 'p1');
  const v2 = viewFor(s, 'p2');
  check('view p1 khác view p2 (bảng khác nhau)', JSON.stringify(v1.my.grid) !== JSON.stringify(v2.my.grid));
  check('view p1.me = p1, view p2.me = p2', v1.me === 'p1' && v2.me === 'p2');
  check('view không lộ bảng đối thủ (players chỉ có tóm tắt)', v1.players.every(p => !('grid' in p)));
  check('view p1 thấy điểm/lượt p2 qua tóm tắt',
    typeof v1.players.find(p => p.id === 'p2').score === 'number' &&
    v1.players.find(p => p.id === 'p2').movesLeft === 30);
}

console.log(`\nXếp Kẹo net: ${pass} pass, ${fail} fail.`);
