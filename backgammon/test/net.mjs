// 🎲 Net Backgammon — lockstep: 2 bản engine cùng seed, áp cùng 1 dãy
// hành động (tính 1 lần từ bản A, áp cho cả 2) thì phải byte-identical.
// Chạy: node backgammon/test/net.mjs
import {
  createGame, applyAction, viewFor, actors, serialize, deserialize,
} from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* Math.random có hạt giống (mulberry32) để test ổn định */
let _s = 987654321;
Math.random = function () {
  _s |= 0; _s = (_s + 0x6D2B79F5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ FAIL:', name); }
}

/* 1 lượt: tính hành động 1 lần từ bản A rồi áp CÙNG hành động cho cả A, B.
   (Bot dùng Math.random để phá hòa nên 2 bot chạy riêng sẽ chọn khác
   nhau — lockstep kiểm tra ENGINE với cùng 1 dòng hành động.) */
function playOneTurnBoth(a, b) {
  const pid = actors(a)[0];
  if (!pid) return false;
  let guard = 0;
  while (actors(a)[0] === pid && a.phase === 'playing' && guard++ < 20) {
    const act = botAction(a, pid, 'hard');
    if (!act) return false;
    const ra = applyAction(a, pid, act);
    const rb = applyAction(b, pid, act);
    if (!ra.ok || !rb.ok) {
      console.log('  hành động bị từ chối:', JSON.stringify(act), ra.reason, rb.reason);
      return false;
    }
    if (act.type === 'double') {
      const opp = actors(a)[0];
      const r2a = applyAction(a, opp, { type: 'double-accept' });
      const r2b = applyAction(b, opp, { type: 'double-accept' });
      if (!r2a.ok || !r2b.ok) { console.log('  chấp nhận gấp đôi bị từ chối'); return false; }
    }
  }
  return true;
}

const strip = o => JSON.stringify({ ...o, startedAt: 0, endedAt: 0 });
/* view mang theo startedAt/endedAt (thời gian tạo khác nhau vài ms) */
const viewStrip = v => JSON.stringify({ ...v, startedAt: 0, endedAt: 0 });

for (let match = 0; match < 5; match++) {
  const seed = 1000 + match * 37;
  const a = createGame(['An', 'Bình'], { seed });
  const b = createGame(['An', 'Bình'], { seed });
  ok(`trận ${match}: 2 bản sao cùng seed khởi tạo giống hệt`, strip(a) === strip(b));
  let turns = 0;
  let okAll = true;
  while (a.phase === 'playing' && turns < 300) {
    if (!playOneTurnBoth(a, b)) { okAll = false; break; }
    turns++;
    if (strip(a) !== strip(b)) {
      okAll = false;
      console.log(`  trận ${match}: lệch nhau sau ${turns} lượt`);
      const ja = JSON.parse(strip(a)), jb = JSON.parse(strip(b));
      for (const k of Object.keys(ja)) {
        if (JSON.stringify(ja[k]) !== JSON.stringify(jb[k])) {
          console.log('   trường khác:', k, 'A=', JSON.stringify(ja[k]).slice(0, 200), 'B=', JSON.stringify(jb[k]).slice(0, 200));
        }
      }
      break;
    }
  }
  ok(`trận ${match}: chơi được tới hết ván mà không lỗi`, okAll && a.phase === 'ended');
  ok(`trận ${match}: 2 bản sao vẫn byte-identical ở cuối ván`, strip(a) === strip(b));
  ok(`trận ${match}: view của 2 bản sao giống hệt`, viewStrip(viewFor(a, 'p0')) === viewStrip(viewFor(b, 'p0')));
  if (match === 0) console.log(`  (trận 0 kết thúc sau ${turns} lượt, người thắng ${a.winner}, loại ${a.final && a.final.winType})`);
}

/* serialize → deserialize → tiếp tục chơi vẫn đồng bộ */
{
  const seed = 555;
  const a = createGame(['An', 'Bình'], { seed });
  const b = deserialize(serialize(a));
  ok('deserialize ra state giống hệt', strip(a) === strip(b));
  let turns = 0;
  let okAll = true;
  while (a.phase === 'playing' && turns < 300) {
    if (!playOneTurnBoth(a, b)) { okAll = false; break; }
    turns++;
    if (strip(a) !== strip(b)) { okAll = false; console.log('  lệch sau deserialize, lượt', turns); break; }
  }
  ok('sau deserialize vẫn chơi đồng bộ tới hết ván', okAll && a.phase === 'ended' && strip(a) === strip(b));
}

console.log(`\nBackgammon net: ${pass} pass, ${fail} fail.`);
process.exit(fail ? 1 : 0);
