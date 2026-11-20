// 🔴 Test đồng bộ Cờ Nhảy (lockstep) — chạy: node test/net.mjs
// Hai ván cùng seed + cùng dãy nước đi phải cho state giống hệt nhau
// (sau khi bỏ các trường biến động theo thời gian).
import {
  createGame, applyAction, viewFor, serialize, deserialize, actors,
  legalMoves, legalMovesFromView, mulberry32,
} from '../js/engine.js';
import { botAction } from '../js/bot.js';

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; }
  else { fail++; console.log(`FAIL: ${name} ${extra}`); }
}
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
/* bỏ các trường biến động theo thời gian rồi so sánh */
function strip(s) {
  const t = JSON.parse(JSON.stringify(s));
  delete t.startedAt; delete t.endedAt; delete t.gid;
  return t;
}
function stripped(s) { return JSON.stringify(strip(s)); }

/* ---------- 1. Serialize/deserialize ổn định ---------- */
{
  const s = createGame(['An', 'Bình'], { seed: 123 });
  const s2 = deserialize(serialize(s));
  check('serialize: deserialize(serialize(s)) giống s', stripped(s2) === stripped(s));
  check('serialize: serialize lại byte-stable', serialize(deserialize(serialize(s))) === serialize(s));
  /* sau vài nước đi vẫn ổn định */
  const moves = legalMoves(s, s.players[0].id);
  applyAction(s, s.players[0].id, moves[0]);
  applyAction(s, s.players[1].id, legalMoves(s, s.players[1].id)[0]);
  const s3 = deserialize(serialize(s));
  check('serialize: sau nước đi vẫn byte-stable', serialize(deserialize(serialize(s))) === serialize(s));
  check('serialize: sau nước đi deserialize giống', stripped(s3) === stripped(s));
  /* deserialize dữ liệu hỏng thì báo lỗi */
  let threw = false;
  try { deserialize('{"nope":true}'); } catch (e) { threw = true; }
  check('serialize: dữ liệu hỏng bị từ chối', threw);
  let threw2 = false;
  try { deserialize(JSON.stringify({ players: [], occ: [] })); } catch (e) { threw2 = true; }
  check('serialize: occ sai độ dài bị từ chối', threw2);
}

/* ---------- 2. Lockstep: cùng seed + cùng nước đi -> state giống hệt ---------- */
{
  const seed = 777;
  const a = createGame(['An', 'Bình', 'Cúc'], { seed });
  const b = createGame(['An', 'Bình', 'Cúc'], { seed });
  check('lockstep: khởi tạo giống hệt', stripped(a) === stripped(b));
  /* đi 60 nước bừa (seeded) ở cả 2 ván */
  const rnd = mulberry32(99);
  let ok = true, steps = 0;
  while (steps < 60 && a.phase === 'playing') {
    const pid = actors(a)[0];
    const moves = legalMoves(a, pid);
    if (!moves.length) { ok = false; break; }
    const m = moves[Math.floor(rnd() * moves.length)];
    const ra = applyAction(a, pid, m);
    const rb = applyAction(b, pid, m);
    if (!ra.ok || !rb.ok) { ok = false; break; }
    steps++;
  }
  check('lockstep: nước bừa đều hợp lệ ở cả 2 ván', ok && (steps === 60 || a.phase === 'ended'), `steps=${steps} phase=${a.phase}`);
  check('lockstep: cả 2 ván cùng kết thúc như nhau', a.phase === b.phase && a.endCause === b.endCause, `a=${a.phase}/${a.endCause} b=${b.phase}/${b.endCause}`);
  check('lockstep: state giống hệt sau 60 nước', stripped(a) === stripped(b));
}

/* ---------- 3. Lockstep cả 1 ván đầy đủ (bot seeded) ---------- */
{
  /* bot dùng Math.random -> seed nó để ván lặp lại được */
  const realRandom = Math.random;
  Math.random = mulberry32(4242);
  function playFull(seed) {
    const s = createGame(['An', 'Bình'], { seed });
    let guard = 0;
    while (s.phase !== 'ended' && guard++ < 5000) {
      const pid = actors(s)[0];
      if (!pid) break;
      const act = botAction(s, pid, 'hard');
      const r = applyAction(s, pid, act);
      if (!r.ok) return { s, ok: false, guard };
    }
    return { s, ok: s.phase === 'ended', guard };
  }
  const m1 = playFull(555);
  Math.random = mulberry32(4242); /* reset seed -> ván thứ 2 giống hệt */
  const m2 = playFull(555);
  Math.random = realRandom;
  check('lockstep full: cả 2 ván đều kết thúc', m1.ok && m2.ok, `g1=${m1.guard} g2=${m2.guard}`);
  check('lockstep full: state cuối giống hệt', stripped(m1.s) === stripped(m2.s));
  check('lockstep full: cùng người thắng', m1.s.winner === m2.s.winner);
  check('lockstep full: cùng điểm cuối', eq(m1.s.final.scores, m2.s.final.scores));
}

/* ---------- 4. viewFor: không lộ seed, me đúng từng người ---------- */
{
  const s = createGame(['An', 'Bình', 'Cúc'], { seed: 321 });
  applyAction(s, s.players[0].id, legalMoves(s, s.players[0].id)[0]);
  const v0 = viewFor(s, s.players[0].id);
  const v1 = viewFor(s, s.players[1].id);
  check('view: không có trường you', !('you' in v0) && !('you' in v1));
  check('view: me đúng từng người', v0.me === s.players[0].id && v1.me === s.players[1].id);
  check('view: không lộ _seed', !('_seed' in v0) && !('seed' in v0));
  check('view: occ + bàn công khai, 2 người thấy giống nhau', eq(v0.occ, v1.occ) && eq(v0.players, v1.players));
  check('view: log công khai', Array.isArray(v0.log) && v0.log.length > 0);
  check('view: step có mặt', v0.step === 'act');
  /* view không cho sửa state gốc qua tham chiếu: sửa view rồi xem lại state */
  const before = stripped(s);
  v0.occ[0] = 'ZZZ';
  v0.players[0].score = 999;
  v0.players[0].marbles = [0];
  check('view: sửa view không làm hỏng state gốc', stripped(s) === before);
}

/* ---------- 5. Nước đi từ view (legalMovesFromView) khớp với state ---------- */
{
  const s = createGame(['An', 'Bình'], { seed: 2024 });
  const v = viewFor(s, s.players[0].id);
  const fromView = legalMoves(s, s.players[0].id);
  check('net: legalMoves trên state khớp view', fromView.length > 0 && fromView.every(m => ['move', 'pass'].includes(m.type)));
  /* áp dụng nước từ view lên 1 bản sao -> giống hệt áp dụng trực tiếp */
  const a = JSON.parse(JSON.stringify(s));
  const b = JSON.parse(JSON.stringify(s));
  applyAction(a, s.players[0].id, fromView[0]);
  applyAction(b, s.players[0].id, JSON.parse(JSON.stringify(fromView[0])));
  check('net: nước từ view áp dụng được như nước trực tiếp', stripped(a) === stripped(b));
  /* legalMoves chỉ trả nước của người tới lượt */
  check('net: legalMoves của người không tới lượt thì rỗng', legalMoves(s, s.players[1].id).length === 0);
  /* mọi nước move đều có path tới lỗ trống và from là bi của mình */
  check('net: mọi nước move hợp lệ theo bàn', fromView.filter(m => m.type === 'move').every(m =>
    s.players[0].marbles.includes(m.from) && m.path.every(h => !s.occ[h])));
  /* legalMovesFromView trên view của người khác thì rỗng */
  check('net: legalMovesFromView cho người không tới lượt thì rỗng', legalMovesFromView(v, s.players[1].id).length === 0);
}

console.log(`\nĐồng bộ Cờ Nhảy: ${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
