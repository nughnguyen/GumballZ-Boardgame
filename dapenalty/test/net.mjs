/* Đá Penalty net tests — serialize/deserialize, lockstep (cùng action
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
  ], { seed, dpMode: 'match' });
}
const key = s => JSON.stringify({
  k: s.prog.kicks, sc: s.prog.scores, sv: s.prog.saves, sh: s.prog.shots,
  st: s.prog.streak, ms: s.prog.maxStreak, tr: s.prog.trailed,
  kick: s.prog.kick, round: s.prog.round, sud: s.prog.sudden, sr: s.prog.suddenRound,
  pk: s.prog.picks, ph: s.phase, w: s.winner, er: s.endReason,
  shr: s.prog.shooter, kpr: s.prog.keeper,
});
function driveStep(s) {
  const acts = actors(s);
  for (const pid of acts) {
    if (s.phase !== 'playing') break;
    if (!actors(s).includes(pid)) continue;
    const a = botAction(s, pid);
    if (!a) return { ok: false, why: 'bot null' };
    const r = applyAction(s, pid, a);
    if (!r.ok) return { ok: false, why: 'action bị từ chối: ' + r.reason };
  }
  return { ok: true };
}

// --- 1. serialize / deserialize ---
{
  const s = matchGame(201);
  applyAction(s, 'p1', { type: 'pick', zone: 'tl' });
  const d = deserialize(serialize(s));
  check('net: serialize → deserialize giữ nguyên trạng thái', key(d) === key(s));
  check('net: deserialize là bản sao độc lập (sửa bản sao không ảnh hưởng gốc)', (() => {
    d.prog.scores.p1 = 99;
    return s.prog.scores.p1 !== 99;
  })());
  check('net: viewFor 2 người thấy cùng lịch sử, me khác nhau', (() => {
    const v1 = viewFor(s, 'p1'), v2 = viewFor(s, 'p2');
    return JSON.stringify(v1.kicks) === JSON.stringify(v2.kicks) && v1.me === 'p1' && v2.me === 'p2';
  })());
  check('net: viewFor giấu vùng của đối thủ', (() => {
    const v2 = viewFor(s, 'p2');
    return v2.myPick === null && v2.oppPicked === true;
  })());
}

// --- 2. lockstep: cùng chuỗi action trên host + bản sao ---
{
  const host = matchGame(202);
  const client = deserialize(serialize(host));
  let steps = 0, ok = true;
  while (host.phase === 'playing' && steps < 400) {
    const acts = actors(host);
    for (const pid of acts) {
      if (host.phase !== 'playing') break;
      if (!actors(host).includes(pid)) continue;
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
    if (!ok) break;
  }
  check('net: lockstep 1 ván đấu đầy đủ không lệch', ok && host.phase === 'ended', 'phase=' + host.phase + ' steps=' + steps);
  check('net: ván lockstep kết thúc có người thắng hoặc hoà', host.winner !== undefined && host.endReason !== null);
}

// --- 3. bot xác định khi seed Math.random ---
{
  const s = matchGame(203);
  applyAction(s, 'p1', { type: 'pick', zone: 'tl' });
  Math.random = mulberry32(7);
  const a1 = botAction(s, 'p2');
  Math.random = mulberry32(7);
  const a2 = botAction(s, 'p2');
  check('net: bot cùng seed → cùng nước đi', JSON.stringify(a1) === JSON.stringify(a2), JSON.stringify(a1) + ' vs ' + JSON.stringify(a2));
  check('net: bot trả về action pick hợp lệ', a1 && a1.type === 'pick' && typeof a1.zone === 'string');
}

// --- 4. lockstep ván chơi đơn (solo): cùng action host → client ---
{
  Math.random = mulberry32(204);
  const host = createGame([
    { id: 'p1', name: 'P1', isBot: true, level: 'hard' },
    { id: 'p2', name: 'Máy', isBot: true, level: 'hard' },
  ], { seed: 204, dpMode: 'solo' });
  const client = deserialize(serialize(host));
  let steps = 0, ok = true;
  while (host.phase === 'playing' && steps < 400) {
    const acts = actors(host);
    for (const pid of acts) {
      if (host.phase !== 'playing') break;
      if (!actors(host).includes(pid)) continue;
      const a = botAction(host, pid);
      if (!a) { ok = false; console.log('  bot solo trả về null ở bước', steps); break; }
      const r1 = applyAction(host, pid, a);
      const r2 = applyAction(client, pid, a);
      if (!r1.ok || !r2.ok || key(host) !== key(client)) { ok = false; console.log('  lệch lockstep solo ở bước', steps, r1.reason, r2.reason); break; }
      steps++;
    }
    if (!ok) break;
  }
  check('net: lockstep solo không lệch, kết thúc trong giới hạn', ok && host.phase === 'ended', 'phase=' + host.phase + ' steps=' + steps);
}

// --- 5. serialize giữa ván (sau nhiều cú) vẫn đồng bộ ---
{
  const s = matchGame(205);
  for (let i = 0; i < 3 && s.phase === 'playing'; i++) driveStep(s);
  const d = deserialize(serialize(s));
  check('net: serialize giữa ván giữ nguyên mọi trường', key(d) === key(s));
  const acts = actors(s);
  let ok = true;
  for (const pid of acts) {
    const a = botAction(s, pid);
    const r1 = applyAction(s, pid, a);
    const r2 = applyAction(d, pid, a);
    if (!r1.ok || !r2.ok) { ok = false; break; }
  }
  check('net: tiếp tục chơi trên bản deserialize vẫn đồng bộ', ok && key(d) === key(s));
}

console.log(`\nĐá Penalty net: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
