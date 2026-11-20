/* Nhện net tests — lockstep: 2 state cùng seed phải đồng bộ sau cùng
   dãy nước (kể cả sau serialize/deserialize giữa ván và sau timeout).
   Math.random được seed lại trước mỗi ván để kết quả ổn định. */
import { createGame, applyAction, actors, serialize, deserialize, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }

/* canon: bỏ các trường không xác định (thời gian thực, id ngẫu nhiên) */
function canon(s) {
  const c = JSON.parse(JSON.stringify(s));
  delete c.gid; delete c.startedAt; delete c.endedAt;
  for (const p of Object.values(c.prog)) delete p.doneAt;
  if (c.final && c.final.summary) for (const q of Object.values(c.final.summary)) delete q.timeMs;
  return JSON.stringify(c);
}
function drive(s, maxSteps = 5000) {
  /* chạy 1 ván tới khi kết thúc bằng bot: mỗi bước, mỗi actor đi 1 nước */
  let steps = 0, illegal = 0, stuck = false;
  while (s.phase === 'playing' && steps < maxSteps) {
    steps++;
    let acted = false;
    for (const pid of actors(s)) {
      if (s.phase !== 'playing') break;
      const a = botAction(s, pid);
      if (a) {
        acted = true;
        const r = applyAction(s, pid, a);
        if (!r.ok) illegal++;
      }
    }
    if (!acted && s.phase === 'playing') { stuck = true; break; }
  }
  if (s.phase === 'playing') stuck = true;
  return { steps, illegal, ended: s.phase === 'ended', stuck };
}
function mkGame(players, opts, seed) {
  Math.random = mulberry32(seed);
  return createGame(players, { seed, ...opts });
}
const soloHard = lvl => [{ id: 'p1', name: 'P1', isBot: true, level: lvl }];
const raceHE = [{ id: 'p1', name: 'P1', isBot: true, level: 'hard' }, { id: 'p2', name: 'P2', isBot: true, level: 'easy' }];

// --- 1. lockstep chơi đơn: cùng seed + cùng dãy nước bot → cùng state ---
{
  let ok = true, ended = 0;
  for (let seed = 100; seed < 105; seed++) {
    const a = mkGame(soloHard('hard'), { nhMode: 'solo', suits: 'easy' }, seed);
    const b = mkGame(soloHard('hard'), { nhMode: 'solo', suits: 'easy' }, seed);
    /* cùng dãy nước: lấy nước từ a, áp cho cả a và b */
    let steps = 0;
    while (a.phase === 'playing' && steps++ < 5000) {
      for (const pid of actors(a)) {
        if (a.phase !== 'playing') break;
        const act = botAction(a, pid);
        if (act) {
          const ra = applyAction(a, pid, act);
          const rb = applyAction(b, pid, act);
          if (ra.ok !== rb.ok) ok = false;
        }
      }
    }
    if (canon(a) !== canon(b)) ok = false;
    if (a.phase === 'ended') ended++;
  }
  check('lockstep chơi đơn: 5 ván cùng seed đồng bộ hoàn toàn', ok);
  check('lockstep chơi đơn: các ván đều kết thúc', ended === 5, 'ended=' + ended);
}

// --- 2. lockstep đua 2 người ---
{
  let ok = true, ended = 0;
  for (let seed = 200; seed < 205; seed++) {
    const a = mkGame(raceHE, { nhMode: 'race', suits: 'medium' }, seed);
    const b = mkGame(raceHE, { nhMode: 'race', suits: 'medium' }, seed);
    let steps = 0;
    while (a.phase === 'playing' && steps++ < 5000) {
      for (const pid of actors(a)) {
        if (a.phase !== 'playing') break;
        const act = botAction(a, pid);
        if (act) {
          const ra = applyAction(a, pid, act);
          const rb = applyAction(b, pid, act);
          if (ra.ok !== rb.ok) ok = false;
        }
      }
    }
    if (canon(a) !== canon(b)) ok = false;
    if (a.phase === 'ended') ended++;
  }
  check('lockstep đua 2 người: 5 ván cùng seed đồng bộ hoàn toàn', ok);
  check('lockstep đua 2 người: các ván đều kết thúc', ended === 5, 'ended=' + ended);
}

// --- 3. serialize giữa ván rồi chơi tiếp vẫn lockstep ---
{
  let ok = true;
  const a = mkGame(soloHard('hard'), { nhMode: 'solo', suits: 'easy' }, 300);
  const b = mkGame(soloHard('hard'), { nhMode: 'solo', suits: 'easy' }, 300);
  /* chơi 20 nước trên cả 2, rồi serialize a → deserialize thành c, chơi tiếp */
  for (let i = 0; i < 20 && a.phase === 'playing'; i++) {
    for (const pid of actors(a)) {
      if (a.phase !== 'playing') break;
      const act = botAction(a, pid);
      if (act) { applyAction(a, pid, act); applyAction(b, pid, act); }
    }
  }
  const c = deserialize(serialize(a));
  check('serialize giữa ván: deserialize giữ nguyên state', canon(c) === canon(a));
  let steps = 0;
  while (a.phase === 'playing' && steps++ < 5000) {
    for (const pid of actors(a)) {
      if (a.phase !== 'playing') break;
      const act = botAction(a, pid);
      if (act) {
        applyAction(a, pid, act);
        applyAction(c, pid, act);
        applyAction(b, pid, act);
      }
    }
  }
  check('serialize giữa ván: chơi tiếp vẫn lockstep (c == a == b)', canon(c) === canon(a) && canon(b) === canon(a));
  check('serialize giữa ván: ván kết thúc', a.phase === 'ended');
}

// --- 4. timeout lockstep ---
{
  const a = mkGame(raceHE, { nhMode: 'race', suits: 'easy' }, 400);
  const b = mkGame(raceHE, { nhMode: 'race', suits: 'easy' }, 400);
  a.prog.p1.runs = 2; a.prog.p1.score = 200;
  b.prog.p1.runs = 2; b.prog.p1.score = 200;
  a.prog.p2.runs = 1; a.prog.p2.score = 500;
  b.prog.p2.runs = 1; b.prog.p2.score = 500;
  applyAction(a, 'p1', { type: 'timeout' });
  applyAction(b, 'p1', { type: 'timeout' });
  check('timeout lockstep: cùng kết quả', canon(a) === canon(b) && a.winner === 'p1' && b.winner === 'p1');
}

// --- 5. undo/hint/deal lockstep ---
{
  let ok = true;
  const a = mkGame(soloHard('hard'), { nhMode: 'solo', suits: 'easy' }, 500);
  const b = mkGame(soloHard('hard'), { nhMode: 'solo', suits: 'easy' }, 500);
  const seq = [
    { type: 'hint' }, { type: 'deal' },
    { type: 'hint' }, { type: 'undo' }, { type: 'undo' },
  ];
  for (const act of seq) {
    const ra = applyAction(a, 'p1', act);
    const rb = applyAction(b, 'p1', act);
    if (ra.ok !== rb.ok) ok = false;
  }
  /* rồi chơi tiếp bằng bot tới khi kết thúc */
  let steps = 0;
  while (a.phase === 'playing' && steps++ < 5000) {
    for (const pid of actors(a)) {
      if (a.phase !== 'playing') break;
      const act = botAction(a, pid);
      if (act) { applyAction(a, pid, act); applyAction(b, pid, act); }
    }
  }
  check('undo/hint/deal lockstep: cùng state sau dãy hành động đặc biệt', ok && canon(a) === canon(b));
}

console.log(`\nNhện net: ${pass} pass, ${fail} fail.`);
