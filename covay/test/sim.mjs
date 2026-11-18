// Sim bot đấu bot Cờ Vây. Chạy: node covay/test/sim.mjs [n=20] [size=9]
// Bot phải đi được mọi nước hợp lệ (hoặc bỏ lượt), không kẹt, ván kết thúc
// hợp lệ (tính điểm sau 2 lần bỏ lượt, hoặc xin thua không bao giờ do bot).
// Đo cả thời gian đi trung bình của bot trên bàn 9×9.
import * as E from '../js/engine.js';
import { chooseMove } from '../js/bot.js';

const N = Number(process.argv[2]) || 20;
const SIZE = Number(process.argv[3]) || 9;
const P1 = { id: 'p1', name: 'Bot Dễ' }, P2 = { id: 'p2', name: 'Bot Khó', isBot: true };
const MAX_MOVES = 600; /* bàn 9×9 tối đa 81 giao điểm, nhưng ăn quân rồi đánh lại được nên cho dư */
const result = { p1: 0, p2: 0, draw: 0, stuck: 0, moves: [], worstMs: 0, totalMs: 0, totalMoves: 0, passes: 0 };
for (let g = 0; g < N; g++) {
  const s = E.createGame([P1, P2], { size: SIZE });
  let moves = 0, stuck = false, passes = 0;
  const t0 = Date.now();
  while (s.phase !== 'ended' && moves < MAX_MOVES) {
    const pid = s.turn;
    const lvl = pid === 'p1' ? 'easy' : 'hard';
    const m0 = Date.now();
    const a = chooseMove(s, pid, lvl);
    const dt = Date.now() - m0;
    if (dt > result.worstMs) result.worstMs = dt;
    if (!a) { stuck = true; console.log(`  ✗ ván ${g + 1}: bot ${lvl} không trả action sau ${moves} nước`); break; }
    let r;
    if (a.type === 'pass') { passes++; r = E.applyAction(s, pid, a); }
    else r = E.applyAction(s, pid, a);
    if (!r.ok) { stuck = true; console.log(`  ✗ ván ${g + 1}: bot đi nước không hợp lệ ${JSON.stringify(a)}: ${r.reason}`); break; }
    moves++;
    /* kẹt trong tính điểm: bot không hành động ở đó — ván bot-vs-bot phải
       có người chốt điểm; ở đây test tự chốt khi vào tính điểm */
    if (s.phase === 'scoring') {
      const f = E.applyAction(s, s.players[0].id, { type: 'finish' });
      if (!f.ok) { stuck = true; console.log(`  ✗ ván ${g + 1}: không chốt điểm được`); break; }
    }
  }
  const dtGame = Date.now() - t0;
  result.totalMs += dtGame; result.totalMoves += moves; result.passes += passes;
  if (s.phase !== 'ended' || stuck) { result.stuck++; console.log(`  ✗ ván ${g + 1}: kẹt sau ${moves} nước (phase=${s.phase})`); continue; }
  if (s.draw) result.draw++;
  else if (s.winner === 'p1') result.p1++;
  else result.p2++;
  result.moves.push(moves);
}
const avg = result.moves.length ? (result.moves.reduce((a, b) => a + b, 0) / result.moves.length).toFixed(1) : 0;
console.log(`\n${N} ván bot-vs-bot (${SIZE}×${SIZE}): Dễ thắng ${result.p1} · Khó thắng ${result.p2} · hòa ${result.draw} · kẹt ${result.stuck}`);
console.log(`Số nước/ván trung bình: ${avg} (min ${result.moves.length ? Math.min(...result.moves) : 0} · max ${result.moves.length ? Math.max(...result.moves) : 0}) · bỏ lượt ${result.passes}`);
console.log(`Thời gian bot: trung bình ${(result.totalMs / Math.max(1, result.totalMoves)).toFixed(2)}ms/nước · chậm nhất ${result.worstMs}ms · tổng ${result.totalMs}ms`);
if (result.stuck > 0) { console.log('SIM THẤT BẠI: có ván kẹt.'); process.exit(1); }
if (result.p2 <= result.p1) { console.log('SIM THẤT BẠI: bot Khó không thắng nhiều hơn bot Dễ.'); process.exit(1); }
console.log('Sim đạt: 0 ván kẹt, bot Khó thắng nhiều hơn bot Dễ.');
