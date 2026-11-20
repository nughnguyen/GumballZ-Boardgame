/* Phi Tiêu net tests — serialize/deserialize + lockstep (host/client
   cùng dãy action → cùng trạng thái, không drift), bot xác định. */
import {
  createGame, applyAction, actors, viewFor, serialize, deserialize,
  mulberry32,
} from '../js/engine.js?v=1';
import { botAction } from '../js/bot.js?v=1';

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function mkPlayers(l1 = 'hard', l2 = 'hard') {
  return [
    { id: 'p1', name: 'P1', isBot: true, level: l1 },
    { id: 'p2', name: 'P2', isBot: true, level: l2 },
  ];
}
/* 1 ván lockstep: host + client cùng áp cùng action; so sánh toàn bộ
   trạng thái (trừ gid/timeMs) sau mỗi bước. Trả về ván host đã kết thúc. */
function lockstep(seed, phMode, l1, l2, maxSteps = 600) {
  Math.random = mulberry32(seed);
  const host = createGame(mkPlayers(l1, l2), { seed, phMode });
  Math.random = mulberry32(seed);
  const client = createGame(mkPlayers(l1, l2), { seed, phMode });
  const snap = s => {
    const c = JSON.parse(JSON.stringify(s));
    delete c.gid; delete c.startedAt; delete c.endedAt;
    /* timeMs trong final.summary cũng là đồng hồ tường (endedAt - startedAt)
       nên phải chuẩn hoá về 0 trước khi so sánh — nếu không host/client
       tạo/kết thúc khác mili-giây sẽ drift giả ở bước 0 */
    if (c.final && c.final.summary) for (const k of Object.keys(c.final.summary)) c.final.summary[k].timeMs = 0;
    return JSON.stringify(c);
  };
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

console.log('Phi Tiêu net:');

// 1. serialize/deserialize round-trip giữa ván
{
  Math.random = mulberry32(5);
  const s = createGame(mkPlayers(), { seed: 5, phMode: 'match' });
  for (let i = 0; i < 5; i++) {
    const pid = actors(s)[0];
    const a = botAction(s, pid);
    applyAction(s, pid, a);
  }
  const d = deserialize(serialize(s));
  check('round-trip giữa ván bằng JSON', JSON.stringify(d) === JSON.stringify(s));
  check('round-trip giữ nguyên lượt + điểm', d.prog.turn === s.prog.turn && d.prog.remaining.p1 === s.prog.remaining.p1);
  /* tiếp tục chơi từ bản sao → cùng kết quả với bản gốc */
  const cont = (g, seed) => {
    Math.random = mulberry32(seed);
    let n = 0;
    while (g.phase === 'playing' && n < 600) {
      for (const pid of actors(g)) {
        if (g.phase !== 'playing') break;
        const a = botAction(g, pid);
        if (!applyAction(g, pid, a).ok) return false;
        n++;
      }
    }
    return g.phase === 'ended';
  };
  const okA = cont(s, 999);
  const okB = cont(d, 999);
  const strip = g => {
    const f = JSON.parse(JSON.stringify(g.final));
    for (const pid of Object.keys(f.summary || {})) delete f.summary[pid].timeMs;
    return JSON.stringify({ w: g.winner, r: g.endReason, f });
  };
  check('tiếp tục từ bản sao → cùng kết quả', okA && okB && strip(s) === strip(d));
}

// 2. lockstep match Hard vs Hard
{
  const r = lockstep(101, 'match', 'hard', 'hard');
  check('lockstep match HvH: không drift, cùng kết thúc', r.ok);
  if (!r.ok) console.log('    lý do: ' + r.why);
  else check('lockstep match HvH: có người thắng hoặc hoà hợp lệ', r.host.winner !== undefined);
}

// 3. lockstep match Hard vs Easy
{
  const r = lockstep(102, 'match', 'hard', 'easy');
  check('lockstep match HvE: không drift', r.ok);
  if (!r.ok) console.log('    lý do: ' + r.why);
}

// 4. lockstep match Easy vs Hard
{
  const r = lockstep(103, 'match', 'easy', 'hard');
  check('lockstep match EvH: không drift', r.ok);
  if (!r.ok) console.log('    lý do: ' + r.why);
}

// 5. lockstep solo Hard (cùng dãy action, 30 phi)
{
  const r = lockstep(104, 'solo', 'hard', 'hard');
  check('lockstep solo Hard: không drift', r.ok);
  if (r.ok) {
    check('lockstep solo: đủ 30 phi', r.host.final.summary.p1.darts === 30);
    /* viewFor chứa gid (mỗi ván tạo riêng có gid khác — trong ván thật
       host/client dùng chung 1 gid) và timeMs (đồng hồ tường) → loại
       2 trường này rồi so sánh. */
    const stripView = v => {
      const c = JSON.parse(JSON.stringify(v));
      delete c.gid;
      if (c.final) for (const pid of Object.keys(c.final.summary || {})) delete c.final.summary[pid].timeMs;
      return JSON.stringify(c);
    };
    check('lockstep solo: 2 bản viewFor giống nhau (trừ gid/timeMs)', stripView(viewFor(r.host, 'p1')) === stripView(viewFor(r.client, 'p1')));
  } else console.log('    lý do: ' + r.why);
}

// 6. lockstep solo Easy
{
  const r = lockstep(105, 'solo', 'easy', 'easy');
  check('lockstep solo Easy: không drift', r.ok);
  if (!r.ok) console.log('    lý do: ' + r.why);
}

// 7. bot xác định với cùng seed (2 lần chạy y hệt)
{
  const run = seed => {
    Math.random = mulberry32(seed);
    const s = createGame(mkPlayers(), { seed, phMode: 'match' });
    const acts = [];
    let n = 0;
    while (s.phase === 'playing' && n < 600) {
      for (const pid of actors(s)) {
        if (s.phase !== 'playing') break;
        const a = botAction(s, pid);
        acts.push(JSON.stringify(a));
        applyAction(s, pid, a);
        n++;
      }
    }
    return acts.join('|');
  };
  check('bot xác định: cùng seed → cùng dãy action', run(77) === run(77));
  check('bot khác seed → khác dãy action (hầu như chắc)', run(77) !== run(78));
}

// 8. lockstep với resign giữa chừng
{
  Math.random = mulberry32(201);
  const host = createGame(mkPlayers(), { seed: 201, phMode: 'match' });
  Math.random = mulberry32(201);
  const client = createGame(mkPlayers(), { seed: 201, phMode: 'match' });
  for (let i = 0; i < 4; i++) {
    const pid = actors(host)[0];
    const a = botAction(host, pid);
    applyAction(host, pid, a);
    applyAction(client, pid, a);
  }
  applyAction(host, 'p2', { type: 'resign' });
  applyAction(client, 'p2', { type: 'resign' });
  const strip = s => JSON.stringify({ w: s.winner, r: s.endReason, p: s.phase });
  check('resign lockstep: host/client cùng kết quả', strip(host) === strip(client) && host.winner === 'p1');
}

console.log(`\nPhi Tiêu net: ${pass} pass, ${fail} fail.`);
process.exit(fail ? 1 : 0);
