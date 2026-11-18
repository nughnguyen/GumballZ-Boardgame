// Sim bot đấu bot TicTacToe. Chạy: node tictactoe/test/sim.mjs [n=50]
// Bot phải đi được mọi nước hợp lệ, không kẹt, ván kết thúc hợp lệ (thắng 3 quân
// hoặc hòa khi bàn đầy). Máy Khó dùng minimax đầy đủ nên KHÔNG BAO GIỜ thua:
// Khó đấu Khó phải hòa 100%; Khó đấu Dễ thì Khó chỉ thắng hoặc hòa.
import * as E from '../js/engine.js';
import { chooseMove } from '../js/bot.js';

const N = Number(process.argv[2]) || 50;
const P1 = { id: 'p1', name: 'Bot 1' }, P2 = { id: 'p2', name: 'Bot 2', isBot: true };

function playGame(lvl1, lvl2) {
  const s = E.createGame([P1, P2]);
  let moves = 0, stuck = false;
  while (s.phase === 'playing' && moves < 9) {
    const pid = s.turn;
    const m = chooseMove(s, pid, pid === 'p1' ? lvl1 : lvl2);
    if (!m) { stuck = true; break; }
    const r = E.applyMove(s, pid, m);
    if (!r.ok) { stuck = true; break; }
    moves++;
  }
  if (s.phase !== 'ended' || stuck) return { stuck: true, moves };
  return { stuck: false, moves, draw: s.draw, winner: s.winner };
}

let fail = 0;
const hardVsHard = { p1: 0, p2: 0, draw: 0, stuck: 0 };
for (let g = 0; g < N; g++) {
  const r = playGame('hard', 'hard');
  if (r.stuck) { hardVsHard.stuck++; fail++; continue; }
  if (r.draw) hardVsHard.draw++;
  else if (r.winner === 'p1') hardVsHard.p1++;
  else hardVsHard.p2++;
}
console.log(`${N} ván Khó-vs-Khó: X thắng ${hardVsHard.p1} · O thắng ${hardVsHard.p2} · hòa ${hardVsHard.draw} · kẹt ${hardVsHard.stuck}`);
if (hardVsHard.p1 > 0 || hardVsHard.p2 > 0) { console.log('  ✗ SIM THẤT BẠI: minimax Khó phải hòa 100% khi đấu nhau, không được thua.'); fail++; }
if (hardVsHard.stuck > 0) { console.log('  ✗ SIM THẤT BẠI: có ván kẹt.'); fail++; }

const easyVsHard = { p1: 0, p2: 0, draw: 0, stuck: 0 };
for (let g = 0; g < N; g++) {
  const r = playGame('easy', 'hard');
  if (r.stuck) { easyVsHard.stuck++; fail++; continue; }
  if (r.draw) easyVsHard.draw++;
  else if (r.winner === 'p1') easyVsHard.p1++;
  else easyVsHard.p2++;
}
console.log(`${N} ván Dễ-vs-Khó: Dễ thắng ${easyVsHard.p1} · Khó thắng ${easyVsHard.p2} · hòa ${easyVsHard.draw} · kẹt ${easyVsHard.stuck}`);
if (easyVsHard.p1 > 0) { console.log('  ✗ SIM THẤT BẠI: Máy Dễ thắng được Máy Khó — minimax Khó không được thua.'); fail++; }
if (easyVsHard.stuck > 0) { console.log('  ✗ SIM THẤT BẠI: có ván kẹt.'); fail++; }

/* bot đi được cả khi chỉ còn 1 ô trống */
{
  const s = E.createGame([P1, P2]);
  const seq = [[0, 0], [1, 0], [2, 0], [1, 1], [0, 1], [2, 1], [1, 2], [0, 2]];
  for (let n = 0; n < seq.length; n++) {
    const r = E.applyMove(s, n % 2 === 0 ? 'p1' : 'p2', { x: seq[n][0], y: seq[n][1] });
    if (!r.ok) { console.log('  ✗ SIM THẤT BẠI: nước dọn bàn không hợp lệ.'); fail++; break; }
  }
  const m = chooseMove(s, 'p1', 'hard');
  if (!m || m.x !== 2 || m.y !== 2) { console.log(`  ✗ SIM THẤT BẠI: còn 1 ô (2,2) mà bot không chọn, được ${JSON.stringify(m)}.`); fail++; }
  else console.log('  ✓ bot đi được khi chỉ còn 1 ô trống (2,2)');
}

if (fail > 0) { console.log('SIM THẤT BẠI.'); process.exit(1); }
console.log('Sim đạt: 0 ván kẹt, Máy Khó không bao giờ thua.');
