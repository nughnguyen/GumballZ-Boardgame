/* Kéo Búa Bao net tests — serialize/deserialize + lockstep (host/client
   cùng áp cùng action; so sánh toàn bộ trạng thái sau mỗi bước). */
import {
  createGame, applyAction, actors, viewFor, serialize, deserialize,
  mulberry32,
} from '../js/engine.js?v=1';
import { botAction } from '../js/bot.js?v=1';

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('  ✓ ' + name + (extra ? ' — ' + extra : '')); }
  else { fail++; console.log('  ✗ FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}
const P = (l1 = 'hard', l2 = 'hard') => [
  { id: 'p1', name: 'P1', isBot: false, level: l1 },
  { id: 'p2', name: 'P2', isBot: true, level: l2 },
];
function mkGame(seed, mode = 'match', l1 = 'hard', l2 = 'hard') {
  Math.random = mulberry32(seed);
  return createGame(P(l1, l2), { seed, kbbMode: mode });
}
/* snapshot so sánh được: loại gid + đồng hồ tường (startedAt/endedAt,
   timeMs trong final.summary) — bài học từ Phi Tiêu: các trường này
   khác mili-giây giữa host/client sẽ drift giả ở bước 0. */
function snap(s) {
  const c = JSON.parse(JSON.stringify(s));
  delete c.gid; delete c.startedAt; delete c.endedAt;
  if (c.final && c.final.summary) for (const k of Object.keys(c.final.summary)) c.final.summary[k].timeMs = 0;
  return JSON.stringify(c);
}
/* 1 ván lockstep: host + client cùng áp cùng action; so sánh toàn bộ
   trạng thái (đã chuẩn hoá) sau mỗi bước. Trả về ván host đã kết thúc. */
function lockstep(seed, mode, l1, l2, maxSteps = 100) {
  Math.random = mulberry32(seed);
  const host = createGame(P(l1, l2), { seed, kbbMode: mode });
  Math.random = mulberry32(seed);
  const client = createGame(P(l1, l2), { seed, kbbMode: mode });
  let steps = 0, driftAt = -1;
  while (host.phase === 'playing' && steps < maxSteps) {
    const acts = actors(host);
    if (!acts.length) break;
    for (const pid of acts) {
      if (host.phase !== 'playing') break;
      if (!actors(host).includes(pid)) continue;
      /* host tính action bằng bot; client áp Y HỆT action đó (lockstep) */
      const a = botAction(host, pid);
      if (!a) return { ok: false, why: 'bot null', host };
      const rh = applyAction(host, pid, a);
      const rc = applyAction(client, pid, a);
      if (!rh.ok || !rc.ok) return { ok: false, why: 'rejected', host };
      if (snap(host) !== snap(client)) { driftAt = steps; break; }
      steps++;
    }
    if (driftAt >= 0) break;
  }
  return {
    ok: host.phase === 'ended' && client.phase === 'ended' && snap(host) === snap(client),
    why: driftAt >= 0 ? 'drift tại bước ' + driftAt : host.phase,
    host, client,
  };
}

console.log('Kéo Búa Bao net:');

// 1. serialize/deserialize round-trip giữa ván
{
  const s = mkGame(31);
  applyAction(s, 'p1', { type: 'pick', choice: 'keo' });
  applyAction(s, 'p2', { type: 'pick', choice: 'bao' });
  const s2 = deserialize(serialize(s));
  check('round-trip giữa ván bằng JSON', snap(s) === snap(s2));
  check('round-trip giữ nguyên vòng + tỉ số', s2.prog.round === 2 && s2.prog.roundWins.p1 === 1 && s2.prog.rounds.length === 1);
  const r1 = applyAction(s, 'p1', { type: 'pick', choice: 'bua' });
  const r2 = applyAction(s2, 'p1', { type: 'pick', choice: 'bua' });
  check('tiếp tục từ bản sao → cùng kết quả', r1.ok === true && r2.ok === true && snap(s) === snap(s2));
}

// 2. lockstep match Hard vs Hard
{
  const r = lockstep(101, 'match', 'hard', 'hard');
  check('lockstep match HvH: không drift, cùng kết thúc', r.ok, r.why);
  check('lockstep match HvH: có người thắng hợp lệ', r.host.winner !== null && r.host.winner !== undefined);
}

// 3. lockstep match Hard vs Easy
{
  const r = lockstep(102, 'match', 'hard', 'easy');
  check('lockstep match HvE: không drift', r.ok, r.why);
}

// 4. lockstep match Easy vs Hard
{
  const r = lockstep(103, 'match', 'easy', 'hard');
  check('lockstep match EvH: không drift', r.ok, r.why);
}

// 5. lockstep match Easy vs Easy
{
  const r = lockstep(104, 'match', 'easy', 'easy');
  check('lockstep match EvE: không drift', r.ok, r.why);
}

// 6. lockstep solo Hard
{
  const r = lockstep(105, 'solo', 'hard', 'hard');
  check('lockstep solo Hard: không drift', r.ok, r.why);
  check('lockstep solo: có người thắng', r.host.winner !== null);
}

// 7. lockstep solo Easy
{
  const r = lockstep(106, 'solo', 'easy', 'easy');
  check('lockstep solo Easy: không drift', r.ok, r.why);
}

// 8. viewFor giống nhau giữa 2 bản (trừ gid/timeMs)
{
  Math.random = mulberry32(107);
  const a = createGame(P(), { seed: 107 });
  Math.random = mulberry32(107);
  const b = createGame(P(), { seed: 107 });
  applyAction(a, 'p1', { type: 'pick', choice: 'bao' });
  applyAction(b, 'p1', { type: 'pick', choice: 'bao' });
  applyAction(a, 'p2', { type: 'pick', choice: 'keo' });
  applyAction(b, 'p2', { type: 'pick', choice: 'keo' });
  const va = viewFor(a, 'p1'), vb = viewFor(b, 'p1');
  delete va.gid; delete vb.gid; delete va.startedAt; delete vb.startedAt;
  check('lockstep solo: 2 bản viewFor giống nhau (trừ gid)', JSON.stringify(va) === JSON.stringify(vb));
}

// 9. bot xác định: cùng seed → cùng dãy action
{
  function seq(seed) {
    Math.random = mulberry32(seed);
    const s = createGame(P(), { seed });
    const out = [];
    let steps = 0;
    while (s.phase === 'playing' && steps < 50) {
      for (const pid of actors(s)) {
        if (s.phase !== 'playing') break;
        const a = botAction(s, pid);
        out.push(a.choice);
        applyAction(s, pid, a);
        steps++;
      }
    }
    return out.join(',');
  }
  check('bot xác định: cùng seed → cùng dãy action', seq(201) === seq(201));
  check('bot khác seed → khác dãy action (hầu như chắc)', seq(201) !== seq(202));
}

// 10. resign lockstep: host/client cùng kết quả
{
  Math.random = mulberry32(301);
  const h = createGame(P(), { seed: 301 });
  Math.random = mulberry32(301);
  const c = createGame(P(), { seed: 301 });
  applyAction(h, 'p1', { type: 'pick', choice: 'keo' });
  applyAction(c, 'p1', { type: 'pick', choice: 'keo' });
  applyAction(h, 'p2', { type: 'resign' });
  applyAction(c, 'p2', { type: 'resign' });
  check('resign lockstep: host/client cùng kết quả', snap(h) === snap(c) && h.winner === 'p1' && h.endReason === 'resign');
}

console.log(`\nKéo Búa Bao net: ${pass} pass, ${fail} fail.`);
