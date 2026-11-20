// Mô phỏng bot Connect 4: N ván Hard vs Easy, kiểm tra không ván nào kẹt
// (vòng lặp vô hạn / không có nước đi) và Hard thắng nhiều hơn Easy.
// Chạy: node connect4/test/sim.mjs [N=20]
import * as E from '../js/engine.js';
import { chooseMove } from '../js/bot.js';

const N = Number(process.argv[2]) || 20;
const P1 = { id: 'p1', name: 'Đỏ' }, P2 = { id: 'p2', name: 'Vàng' };
let hardWins = 0, easyWins = 0, draws = 0, stuck = 0, maxMoves = 0, totalMoves = 0;
let hardTime = 0, easyTime = 0, hardMoves = 0, easyMoves = 0;
const t0 = Date.now();

for (let g = 0; g < N; g++) {
  const hardIsP1 = g % 2 === 0; /* đổi phe cho công bằng */
  const s = E.createGame([P1, P2]);
  let guard = 0, moves = 0;
  while (s.phase !== 'ended' && guard++ < 60) {
    const pid = s.turn;
    const lvl = (pid === 'p1') === hardIsP1 ? 'hard' : 'easy';
    const t1 = Date.now();
    const act = chooseMove(s, pid, lvl);
    const dt = Date.now() - t1;
    if (lvl === 'hard') { hardTime += dt; hardMoves++; } else { easyTime += dt; easyMoves++; }
    if (!act || act.type !== 'move' || act.col < 0 || act.col > 6) { stuck++; break; }
    const r = E.applyAction(s, pid, act);
    if (!r.ok) { stuck++; break; }
    moves++;
  }
  if (s.phase !== 'ended') { stuck++; console.log(`  ✗ ván ${g + 1} KẸT (phase ${s.phase}, moves ${moves})`); continue; }
  totalMoves += moves;
  maxMoves = Math.max(maxMoves, moves);
  if (s.draw) draws++;
  else if ((s.winner === 'p1') === hardIsP1) hardWins++;
  else easyWins++;
}

const wall = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n${N} ván Hard vs Easy (đổi phe mỗi ván):`);
console.log(`  Hard thắng ${hardWins} · Easy thắng ${easyWins} · hòa ${draws} · kẹt ${stuck}`);
console.log(`  nước/ván trung bình ${(totalMoves / N).toFixed(1)}, dài nhất ${maxMoves}`);
console.log(`  thời gian bot: Hard ${(hardTime / Math.max(1, hardMoves)).toFixed(0)}ms/nước, Easy ${(easyTime / Math.max(1, easyMoves)).toFixed(0)}ms/nước, tổng ${wall}s`);
if (stuck > 0) { console.log('  ✗ CÓ VÁN KẸT — xem lại bot.'); process.exit(1); }
if (hardWins <= easyWins) { console.log('  ✗ Hard không thắng nhiều hơn Easy — xem lại bot.'); process.exit(1); }
console.log('  ✓ 0 ván kẹt, Hard thắng nhiều hơn Easy.');
