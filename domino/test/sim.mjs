// Sim bot đấu bot Domino. Chạy: node domino/test/sim.mjs [n=30] [easy|hard|mix]
// Bot phải đi được mọi nước hợp lệ (đặt/rút), không kẹt, trận kết thúc hợp
// lệ (đủ điểm mục tiêu / xin thua không xảy ra). Đo cả thời gian đi của bot.
import * as E from '../js/engine.js';
import { chooseMove } from '../js/bot.js';

const N = Number(process.argv[2]) || 30;
const LVL = process.argv[3] || 'mix';
const P = [
  { id: 'p1', name: 'Bot 1' }, { id: 'p2', name: 'Bot 2', isBot: true },
  { id: 'p3', name: 'Bot 3', isBot: true }, { id: 'p4', name: 'Bot 4', isBot: true },
];
const MAX_ACT = 1000;
const result = { p1: 0, p2: 0, p3: 0, p4: 0, draw: 0, stuck: 0, acts: [], worstMs: 0, totalMs: 0, totalActs: 0, reasons: {}, hands: 0 };
for (let g = 0; g < N; g++) {
  const nP = 2 + (g % 3); /* 2, 3, 4 người xen kẽ */
  const s = E.createGame(P.slice(0, nP), { target: 50 });
  let acts = 0, stuck = false;
  const t0 = Date.now();
  while (s.phase !== 'ended' && acts < MAX_ACT) {
    if (s.handEnd) {
      const r = E.applyAction(s, s.players[0].id, { type: 'next-hand' });
      if (!r.ok) { stuck = true; console.log(`  ✗ trận ${g + 1}: không mở được ván mới: ${r.reason}`); break; }
      result.hands++;
      acts++;
      continue;
    }
    const pid = s.turn;
    const lvl = LVL === 'easy' ? 'easy' : LVL === 'hard' ? 'hard' : (pid === 'p1' ? 'easy' : 'hard');
    const m0 = Date.now();
    const a = chooseMove(s, pid, lvl);
    const dt = Date.now() - m0;
    if (dt > result.worstMs) result.worstMs = dt;
    if (!a) { stuck = true; console.log(`  ✗ trận ${g + 1}: bot ${lvl} không trả action (lượt ${pid}, tay ${JSON.stringify(s.players.find(p => p.id === pid).hand)}, dây ${s.chain.length}, rút ${s.boneyard.length})`); break; }
    const r = E.applyAction(s, pid, a);
    if (!r.ok) { stuck = true; console.log(`  ✗ trận ${g + 1}: bot đi nước không hợp lệ ${JSON.stringify(a)}: ${r.reason}`); break; }
    acts++;
  }
  const dtGame = Date.now() - t0;
  result.totalMs += dtGame; result.totalActs += acts;
  if (s.phase !== 'ended' || stuck) { result.stuck++; console.log(`  ✗ trận ${g + 1}: kẹt sau ${acts} action (phase=${s.phase})`); continue; }
  result.reasons[s.endReason] = (result.reasons[s.endReason] || 0) + 1;
  if (s.draw) result.draw++;
  else result[s.winner]++;
  result.acts.push(acts);
}
const avg = result.acts.length ? (result.acts.reduce((a, b) => a + b, 0) / result.acts.length).toFixed(1) : 0;
console.log(`\n${N} trận bot-vs-bot (${LVL}): thắng p1 ${result.p1} · p2 ${result.p2} · p3 ${result.p3} · p4 ${result.p4} · hòa ${result.draw} · kẹt ${result.stuck}`);
console.log(`Số action/trận trung bình: ${avg} (min ${result.acts.length ? Math.min(...result.acts) : 0} · max ${result.acts.length ? Math.max(...result.acts) : 0}) · tổng ${result.hands} ván`);
console.log(`Lý do kết thúc: ${Object.entries(result.reasons).map(([k, v]) => k + ' ' + v).join(' · ')}`);
console.log(`Thời gian bot: trung bình ${(result.totalMs / Math.max(1, result.totalActs)).toFixed(2)}ms/action · chậm nhất ${result.worstMs}ms · tổng ${result.totalMs}ms`);
if (result.stuck > 0) { console.log('SIM THẤT BẠI: có trận kẹt.'); process.exit(1); }
if (LVL === 'mix' && (result.p2 + result.p3 + result.p4) <= result.p1) { console.log('SIM THẤT BẠI: bot Khó không thắng nhiều hơn bot Dễ.'); process.exit(1); }
console.log('Sim đạt: 0 trận kẹt' + (LVL === 'mix' ? ', bot Khó thắng nhiều hơn bot Dễ.' : '.'));
