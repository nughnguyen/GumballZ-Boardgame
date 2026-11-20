// Kiểm đồng bộ mạng Dò Mìn: 2 engine cùng seed + cùng dãy hành động
// phải cho state byte-identical (kể cả đua 4 người).
// Chạy: node domi/test/net.mjs
import * as E from '../js/engine.js';

let pass = 0, fail = 0;
function t(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.log(`  ✗ ${name}`); }
}

const P4 = [
  { id: 'p1', name: 'A' }, { id: 'p2', name: 'B' },
  { id: 'p3', name: 'C' }, { id: 'p4', name: 'D' },
];

/* chuẩn hoá timestamp trước khi so sánh: startedAt/endedAt/finishedAt
   là Date.now() nên 2 máy chạy lệch nhau vài ms là đúng, không phải lệch luật */
function norm(x) {
  const s = JSON.parse(JSON.stringify(x));
  s.startedAt = 0; s.endedAt = 0;
  for (const p of Object.values(s.prog || {})) p.finishedAt = 0;
  return JSON.stringify(s);
}

function runRace(seed, diff, steps) {
  const a = E.createGame(P4, { difficulty: diff, seed });
  const b = E.createGame(P4, { difficulty: diff, seed });
  a.gid = b.gid = 'net-test'; /* gid sinh bằng Math.random — đồng nhất để so sánh */
  const rnd = E.mulberry32(seed ^ 0x9e3779b9);
  const total = a.rows * a.cols;
  let same = true;
  for (let i = 0; i < steps; i++) {
    if (a.phase !== 'playing' || b.phase !== 'playing') break;
    const pid = P4[i % 4].id;
    const cell = Math.floor(rnd() * total);
    const type = rnd() < 0.75 ? 'reveal' : 'flag';
    const ra = E.applyAction(a, pid, { type, cell });
    const rb = E.applyAction(b, pid, { type, cell });
    if (JSON.stringify(ra) !== JSON.stringify(rb) || norm(a) !== norm(b)) { same = false; break; }
    /* cả 2 phải thấy cùng 1 view (trừ me) */
    const va = E.viewFor(a, pid), vb = E.viewFor(b, pid);
    va.startedAt = vb.startedAt = 0; va.endedAt = vb.endedAt = 0;
    if (JSON.stringify(va) !== JSON.stringify(vb)) { same = false; break; }
  }
  return { same, a, b };
}

for (const diff of ['easy', 'medium', 'hard']) {
  const { same, a } = runRace(1234, diff, 400);
  t(`đua 4 người ${diff}: 400 hành động byte-identical`, same);
  t(`đua 4 người ${diff}: serialize roundtrip sau đua`, E.serialize(E.deserialize(E.serialize(a))) === E.serialize(a));
}
/* đua tới khi kết thúc vẫn identical */
{
  const { same, a } = runRace(777, 'easy', 2000);
  t('đua 4 người tới khi kết thúc: byte-identical', same && a.phase === 'ended');
}
/* seed khác nhau → bãi mìn khác nhau */
{
  const a = E.createGame(P4, { difficulty: 'easy', seed: 1 });
  const b = E.createGame(P4, { difficulty: 'easy', seed: 2 });
  E.applyAction(a, 'p1', { type: 'reveal', cell: 40 });
  E.applyAction(b, 'p1', { type: 'reveal', cell: 40 });
  t('seed khác → bãi mìn khác', JSON.stringify(a.mines) !== JSON.stringify(b.mines));
}

console.log(`\nĐồng bộ Dò Mìn: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
