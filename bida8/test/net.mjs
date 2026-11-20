/* Bida 8-ball net tests — serialize/deserialize, lockstep (cùng action
   trên 2 bản sao → cùng trạng thái), viewFor, bot xác định khi seed. */
import { createGame, applyAction, actors, viewFor, serialize, deserialize, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }

function matchGame(seed) {
  Math.random = mulberry32(seed);
  return createGame([
    { id: 'p1', name: 'P1', isBot: false },
    { id: 'p2', name: 'P2', isBot: true, level: 'hard' },
  ], { seed, bdMode: 'match' });
}
const key = s => JSON.stringify({ b: s.prog.balls, t: s.prog.turn, g: s.prog.groups, o: s.prog.openTable, br: s.prog.breakDone, ph: s.phase, w: s.winner, er: s.endReason });

// --- 1. serialize / deserialize ---
{
  const s = matchGame(201);
  applyAction(s, 'p1', { type: 'shoot', angle: 0, power: 1 });
  const d = deserialize(serialize(s));
  check('net: serialize → deserialize giữ nguyên trạng thái', key(d) === key(s));
  check('net: deserialize là bản sao độc lập (sửa bản sao không ảnh hưởng gốc)', (() => {
    d.prog.balls[0].x = 1;
    return s.prog.balls[0].x !== 1;
  })());
  check('net: viewFor 2 người thấy cùng bàn, me khác nhau', (() => {
    const v1 = viewFor(s, 'p1'), v2 = viewFor(s, 'p2');
    return JSON.stringify(v1.balls) === JSON.stringify(v2.balls) && v1.me === 'p1' && v2.me === 'p2';
  })());
}

// --- 2. lockstep: cùng chuỗi action trên host + bản sao ---
{
  const host = matchGame(202);
  const client = deserialize(serialize(host));
  let steps = 0, ok = true;
  while (host.phase === 'playing' && steps < 200) {
    const pid = actors(host)[0];
    const a = botAction(host, pid);
    if (!a) { ok = false; console.log('  bot trả về null ở bước', steps); break; }
    const r1 = applyAction(host, pid, a);
    const r2 = applyAction(client, pid, a);
    if (!r1.ok || !r2.ok || key(host) !== key(client)) {
      ok = false;
      console.log('  lệch lockstep ở bước', steps, 'r1', r1.ok, 'r2', r2.ok, r1.reason, r2.reason);
      break;
    }
    steps++;
  }
  check('net: lockstep 1 ván đấu đầy đủ không lệch', ok && host.phase === 'ended', 'phase=' + host.phase + ' steps=' + steps);
  check('net: ván lockstep kết thúc có người thắng hoặc hoà', host.winner !== undefined && host.endReason !== null);
}

// --- 3. bot xác định khi seed Math.random ---
{
  const s = matchGame(203);
  applyAction(s, 'p1', { type: 'shoot', angle: 0, power: 1 });
  const pid = actors(s)[0];
  Math.random = mulberry32(7);
  const a1 = botAction(s, pid);
  Math.random = mulberry32(7);
  const a2 = botAction(s, pid);
  check('net: bot cùng seed → cùng nước đi', JSON.stringify(a1) === JSON.stringify(a2), JSON.stringify(a1) + ' vs ' + JSON.stringify(a2));
  check('net: bot trả về action hợp lệ (shoot hoặc place)', a1 && (a1.type === 'shoot' || a1.type === 'place'));
}

// --- 4. lockstep ván chơi đơn (solo) ---
{
  Math.random = mulberry32(204);
  const host = createGame([{ id: 'p1', name: 'P1', isBot: true, level: 'hard' }], { seed: 204, bdMode: 'solo' });
  const client = deserialize(serialize(host));
  let steps = 0, ok = true;
  while (host.phase === 'playing' && steps < 200) {
    const a = botAction(host, 'p1');
    if (!a) { ok = false; break; }
    const r1 = applyAction(host, 'p1', a);
    const r2 = applyAction(client, 'p1', a);
    if (!r1.ok || !r2.ok || key(host) !== key(client)) { ok = false; console.log('  lệch lockstep solo ở bước', steps, r1.reason, r2.reason); break; }
    steps++;
  }
  check('net: lockstep solo không lệch, kết thúc trong giới hạn', ok && host.phase === 'ended', 'phase=' + host.phase + ' steps=' + steps);
}

// --- 5. serialize giữa ván (sau nhiều cú) vẫn đồng bộ ---
{
  const s = matchGame(205);
  for (let i = 0; i < 5 && s.phase === 'playing'; i++) {
    const pid = actors(s)[0];
    const a = botAction(s, pid);
    if (!a) break;
    applyAction(s, pid, a);
  }
  const d = deserialize(serialize(s));
  check('net: serialize giữa ván giữ nguyên mọi trường', key(d) === key(s));
  const pid = actors(s)[0];
  const a = botAction(s, pid);
  const r1 = applyAction(s, pid, a);
  const r2 = applyAction(d, pid, a);
  check('net: tiếp tục chơi trên bản deserialize vẫn đồng bộ', r1.ok && r2.ok && key(d) === key(s));
}

console.log(`\nBida net: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
