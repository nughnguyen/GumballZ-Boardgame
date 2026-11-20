/* Ghép Hình net tests — lockstep: 2 trạng thái cùng seed, cùng dãy
   nước thì phải đồng bộ từng bước (canon bỏ các trường thời gian:
   gid/startedAt/endedAt/doneAt/timeMs — giống bài học Tetris). */
import { createGame, applyAction, actors, viewFor, serialize, deserialize, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }

function canon(s) {
  const c = JSON.parse(JSON.stringify(s));
  delete c.gid; delete c.startedAt; delete c.endedAt;
  for (const p of c.players) {
    const pr = c.prog[p.id];
    if (pr) delete pr.doneAt;
  }
  if (c.final && c.final.summary) {
    for (const k of Object.keys(c.final.summary)) delete c.final.summary[k].timeMs;
  }
  return JSON.stringify(c);
}
function makeGame(levels, seed, size = 4) {
  Math.random = mulberry32(seed);
  return createGame(levels.map((l, i) => ({ id: 'p' + (i + 1), name: 'P' + (i + 1), isBot: true, level: l })), { seed, ghMode: 'race', size });
}

/* --- lockstep đua 2 người: cùng dãy nước bot thì 2 state giống nhau --- */
{
  const a = makeGame(['hard', 'easy'], 500, 4);
  const b = makeGame(['hard', 'easy'], 500, 4);
  check('cùng seed thì canon ban đầu giống nhau', canon(a) === canon(b));
  let steps = 0, illegal = 0, diverged = false;
  while (a.phase === 'playing' && steps < 500) {
    steps++;
    for (const pid of actors(a)) {
      if (a.phase !== 'playing') break;
      const act = botAction(a, pid);
      if (!act) continue;
      const ra = applyAction(a, pid, act);
      const rb = applyAction(b, pid, act);
      if (!ra.ok || !rb.ok) illegal++;
      if (canon(a) !== canon(b)) { diverged = true; break; }
    }
    if (diverged) break;
  }
  check('lockstep: 2 state đồng bộ sau cùng dãy nước', !diverged, `steps=${steps}`);
  check('lockstep: 0 nước sai luật', illegal === 0, `illegal=${illegal}`);
  check('lockstep: ván kết thúc', a.phase === 'ended' && b.phase === 'ended');
  check('lockstep: cùng người thắng', a.winner === b.winner, `winner=${a.winner}/${b.winner}`);
}

/* --- lockstep chơi đơn: bot Khó tự chơi tới thắng --- */
{
  Math.random = mulberry32(501);
  const a = createGame([{ id: 'p1', name: 'P1', isBot: true, level: 'hard' }], { seed: 501, ghMode: 'solo', size: 4 });
  Math.random = mulberry32(501);
  const b = createGame([{ id: 'p1', name: 'P1', isBot: true, level: 'hard' }], { seed: 501, ghMode: 'solo', size: 4 });
  let steps = 0, diverged = false;
  while (a.phase === 'playing' && steps < 100) {
    steps++;
    const act = botAction(a, 'p1');
    if (!act) break;
    applyAction(a, 'p1', act);
    applyAction(b, 'p1', act);
    if (canon(a) !== canon(b)) { diverged = true; break; }
  }
  check('lockstep solo: đồng bộ', !diverged, `steps=${steps}`);
  check('lockstep solo: bot Khó thắng', a.winner === 'p1' && a.phase === 'ended');
}

/* --- serialize giữa ván rồi deserialize vẫn chơi tiếp được --- */
{
  const a = makeGame(['hard', 'easy'], 502, 4);
  for (let i = 0; i < 5 && a.phase === 'playing'; i++) {
    for (const pid of actors(a)) {
      const act = botAction(a, pid);
      if (act) applyAction(a, pid, act);
    }
  }
  const b = deserialize(serialize(a));
  check('serialize/deserialize giữa ván giữ nguyên canon', canon(a) === canon(b));
  let diverged = false, steps = 0;
  while (a.phase === 'playing' && steps < 500) {
    steps++;
    for (const pid of actors(a)) {
      if (a.phase !== 'playing') break;
      const act = botAction(a, pid);
      if (!act) continue;
      applyAction(a, pid, act);
      applyAction(b, pid, act);
      if (canon(a) !== canon(b)) { diverged = true; break; }
    }
    if (diverged) break;
  }
  check('sau deserialize vẫn lockstep', !diverged, `steps=${steps}`);
  check('sau deserialize cùng kết quả', a.winner === b.winner && a.endReason === b.endReason);
}

/* --- viewFor 2 người cùng xem 1 state thì giống nhau --- */
{
  const a = makeGame(['hard', 'easy'], 503, 4);
  const v1 = viewFor(a, 'p1');
  const v2 = viewFor(a, 'p1');
  check('viewFor ổn định (2 lần xem giống nhau)', JSON.stringify(v1) === JSON.stringify(v2));
  check('viewFor không lộ tiles đối thủ', !('tiles' in v1.players.find(p => p.id === 'p2')));
}

/* --- timeout lockstep: cùng timeout thì cùng kết quả --- */
{
  const a = makeGame(['hard', 'easy'], 504, 4);
  const b = makeGame(['hard', 'easy'], 504, 4);
  for (let i = 0; i < 3; i++) {
    for (const pid of actors(a)) {
      const act = botAction(a, pid);
      if (act) { applyAction(a, pid, act); applyAction(b, pid, act); }
    }
  }
  applyAction(a, 'p1', { type: 'timeout' });
  applyAction(b, 'p1', { type: 'timeout' });
  check('timeout lockstep: cùng kết quả', a.winner === b.winner && a.endReason === b.endReason && canon(a) === canon(b));
}

console.log(`\nGhép Hình net: ${pass} pass, ${fail} fail.`);
