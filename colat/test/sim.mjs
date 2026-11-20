// Sim bot đấu bot Cờ Lật. Chạy: node colat/test/sim.mjs [n=50] [easy|hard|mix]
// Bot phải đi được mọi nước hợp lệ, không kẹt, ván kết thúc hợp lệ
// (đủ quân / hòa). Đo cả thời gian đi trung bình của bot.
import * as E from '../js/engine.js';
import { chooseMove } from '../js/bot.js';

const N = Number(process.argv[2]) || 50;
const LVL = process.argv[3] || 'mix';
const P1 = { id: 'p1', name: 'Bot Dễ' }, P2 = { id: 'p2', name: 'Bot Khó', isBot: true };
const MAX_MOVES = 200; /* 1 ván Reversi tối đa 60 nước đặt quân */
const result = { p1: 0, p2: 0, draw: 0, stuck: 0, moves: [], worstMs: 0, totalMs: 0, totalMoves: 0, reasons: {} };
for (let g = 0; g < N; g++) {
  const s = E.createGame([P1, P2]);
  let moves = 0, stuck = false;
  const t0 = Date.now();
  while (s.phase !== 'ended' && moves < MAX_MOVES) {
    const pid = s.turn;
    const lvl = LVL === 'easy' ? 'easy' : LVL === 'hard' ? 'hard' : (pid === 'p1' ? 'easy' : 'hard');
    const m0 = Date.now();
    const a = chooseMove(s, pid, lvl);
    const dt = Date.now() - m0;
    if (dt > result.worstMs) result.worstMs = dt;
    if (!a) { stuck = true; console.log(`  ✗ ván ${g + 1}: bot ${lvl} không trả action sau ${moves} nước`); break; }
    const r = E.applyAction(s, pid, a);
    if (!r.ok) { stuck = true; console.log(`  ✗ ván ${g + 1}: bot đi nước không hợp lệ ${JSON.stringify(a)}: ${r.reason}`); break; }
    moves++;
  }
  const dtGame = Date.now() - t0;
  result.totalMs += dtGame; result.totalMoves += moves;
  if (s.phase !== 'ended' || stuck) { result.stuck++; console.log(`  ✗ ván ${g + 1}: kẹt sau ${moves} nước (phase=${s.phase})`); continue; }
  result.reasons[s.endReason] = (result.reasons[s.endReason] || 0) + 1;
  if (s.draw) result.draw++;
  else if (s.winner === 'p1') result.p1++;
  else result.p2++;
  result.moves.push(moves);
}
const avg = result.moves.length ? (result.moves.reduce((a, b) => a + b, 0) / result.moves.length).toFixed(1) : 0;
console.log(`\n${N} ván bot-vs-bot (${LVL}): Dễ thắng ${result.p1} · Khó thắng ${result.p2} · hòa ${result.draw} · kẹt ${result.stuck}`);
console.log(`Số nước/ván trung bình: ${avg} (min ${result.moves.length ? Math.min(...result.moves) : 0} · max ${result.moves.length ? Math.max(...result.moves) : 0})`);
console.log(`Lý do kết thúc: ${Object.entries(result.reasons).map(([k, v]) => k + ' ' + v).join(' · ')}`);
console.log(`Thời gian bot: trung bình ${(result.totalMs / Math.max(1, result.totalMoves)).toFixed(2)}ms/nước · chậm nhất ${result.worstMs}ms · tổng ${result.totalMs}ms`);
if (result.stuck > 0) { console.log('SIM THẤT BẠI: có ván kẹt.'); process.exit(1); }
if (LVL === 'mix' && result.p2 <= result.p1) { console.log('SIM THẤT BẠI: bot Khó không thắng nhiều hơn bot Dễ.'); process.exit(1); }
console.log('Sim đạt: 0 ván kẹt' + (LVL === 'mix' ? ', bot Khó thắng nhiều hơn bot Dễ.' : '.'));
