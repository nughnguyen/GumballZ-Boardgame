// 🎲 Sim Backgammon — bot đấu bot có hạt giống.
// Chạy: node backgammon/test/sim.mjs
import { createGame, applyAction, actors } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* Math.random có hạt giống (mulberry32) để sim ổn định */
let _s = 42424242;
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

/* chơi 1 ván bot-vs-bot; trả về thống kê */
function playMatch(seed, levelA, levelB) {
  const s = createGame(
    [{ id: 'p0', name: 'A' }, { id: 'p1', name: 'B' }],
    { seed },
  );
  let illegal = 0, doublesOffered = 0, doublesDeclined = 0;
  let guard = 0;
  while (s.phase === 'playing' && guard++ < 2000) {
    const pid = actors(s)[0];
    if (!pid) { illegal++; break; }
    const level = pid === 'p0' ? levelA : levelB;
    const act = botAction(s, pid, level);
    if (!act) { illegal++; break; }
    if (act.type === 'double') doublesOffered++;
    const r = applyAction(s, pid, act);
    if (!r.ok) { illegal++; console.log('  hành động bot bị từ chối:', JSON.stringify(act), r.reason, 'seed', seed); break; }
    if (act.type === 'double') {
      const opp = actors(s)[0];
      const r2 = applyAction(s, opp, { type: 'double-accept' });
      if (!r2.ok) { illegal++; break; }
    }
  }
  return {
    ended: s.phase === 'ended',
    winner: s.winner,
    winType: s.final && s.final.winType,
    endCause: s.endCause,
    turns: s.turnCount,
    illegal,
    doublesOffered,
    stalemate: s.endCause === 'stalemate',
    hitsA: s.players[0].hits,
    hitsB: s.players[1].hits,
  };
}

function runBatch(n, levelA, levelB, baseSeed, label) {
  let winsA = 0, winsB = 0, illegal = 0, stuck = 0, turns = 0;
  let gammon = 0, backgammon = 0, doubles = 0, hits = 0;
  let longest = 0;
  for (let i = 0; i < n; i++) {
    const r = playMatch(baseSeed + i, levelA, levelB);
    if (r.illegal) illegal++;
    if (!r.ended || r.stalemate) stuck++;
    if (r.winner === 'p0') winsA++;
    else if (r.winner === 'p1') winsB++;
    if (r.winType === 'gammon') gammon++;
    if (r.winType === 'backgammon') backgammon++;
    doubles += r.doublesOffered;
    hits += r.hitsA + r.hitsB;
    turns += r.turns;
    if (r.turns > longest) longest = r.turns;
  }
  console.log(`  ${label}: ${n} ván — A thắng ${winsA}, B thắng ${winsB}, gammon ${gammon}, backgammon ${backgammon}, lượt TB ${(turns / n).toFixed(1)}, dài nhất ${longest}, gấp đôi ${doubles}, đánh trúng ${hits}, kẹt ${stuck}, sai luật ${illegal}`);
  return { winsA, winsB, illegal, stuck };
}

/* Khó (p0) đấu Dễ (p1): 100 ván */
const he = runBatch(100, 'hard', 'easy', 2000, 'Khó vs Dễ');
ok('Khó thắng Dễ rõ rệt (>60/100)', he.winsA >= 60);
ok('Khó vs Dễ: 0 ván sai luật', he.illegal === 0);
ok('Khó vs Dễ: 0 ván kẹt', he.stuck === 0);

/* Dễ đấu Dễ: 50 ván */
const ee = runBatch(50, 'easy', 'easy', 5000, 'Dễ vs Dễ');
ok('Dễ vs Dễ: 0 ván sai luật', ee.illegal === 0);
ok('Dễ vs Dễ: 0 ván kẹt', ee.stuck === 0);
ok('Dễ vs Dễ: đủ 50 ván có người thắng', ee.winsA + ee.winsB === 50);

/* Khó đấu Khó: 20 ván */
const hh = runBatch(20, 'hard', 'hard', 8000, 'Khó vs Khó');
ok('Khó vs Khó: 0 ván sai luật', hh.illegal === 0);
ok('Khó vs Khó: 0 ván kẹt', hh.stuck === 0);

/* Dễ (p0) đấu Khó (p1): 50 ván — kiểm tra tính đối xứng */
const eh = runBatch(50, 'easy', 'hard', 9000, 'Dễ vs Khó');
ok('Khó (p1) thắng Dễ (p0) rõ rệt (>60%)', eh.winsB >= 30);
ok('Dễ vs Khó: 0 ván sai luật', eh.illegal === 0);
ok('Dễ vs Khó: 0 ván kẹt', eh.stuck === 0);

console.log(`\nBackgammon sim: ${pass} pass, ${fail} fail.`);
process.exit(fail ? 1 : 0);
