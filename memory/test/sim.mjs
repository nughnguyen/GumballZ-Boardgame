// Sim bot đấu bot Memory. Chạy: node memory/test/sim.mjs [n=20]
// Bot phải lật được mọi lá hợp lệ, không kẹt, ván kết thúc hợp lệ (hết bàn,
// ai nhiều cặp hơn thắng hoặc hòa). Máy Khó (nhớ hoàn hảo) phải thắng Máy Dễ
// (chỉ nhớ 3 lần lật gần nhất) đa số. Đo cả thời gian bot.
import * as E from '../js/engine.js';
import { chooseFlip } from '../js/bot.js';

const N = Number(process.argv[2]) || 20;
const P1 = { id: 'p1', name: 'Bot Dễ' }, P2 = { id: 'p2', name: 'Bot Khó', isBot: true };
const MAX_FLIPS = 500;
const result = { p1: 0, p2: 0, draw: 0, stuck: 0, flips: [], misses: [], worstMs: 0, totalMs: 0, totalFlips: 0 };
for (let g = 0; g < N; g++) {
  const s = E.createGame([P1, P2], { level: 'medium' });
  let n = 0, stuck = false;
  const t0 = Date.now();
  while (s.phase === 'playing' && n < MAX_FLIPS) {
    const pid = s.turn;
    const lvl = pid === 'p1' ? 'easy' : 'hard';
    const m0 = Date.now();
    const m = chooseFlip(s, pid, lvl);
    const dt = Date.now() - m0;
    if (dt > result.worstMs) result.worstMs = dt;
    if (!m) { stuck = true; console.log(`  ✗ ván ${g + 1}: bot ${lvl} không lật được sau ${n} lần lật`); break; }
    const r = E.applyAction(s, pid, { type: 'flip', index: m.index });
    if (!r.ok) { stuck = true; console.log(`  ✗ ván ${g + 1}: bot lật không hợp lệ ${JSON.stringify(m)}: ${r.reason}`); break; }
    n++;
    if (s.pendingHide) { /* úp lại như giao diện vẫn làm sau ~900ms */
      const h = E.applyAction(s, pid, { type: 'hide' });
      if (!h.ok) { stuck = true; console.log(`  ✗ ván ${g + 1}: không úp được sau khi trượt`); break; }
    }
  }
  const dtGame = Date.now() - t0;
  result.totalMs += dtGame; result.totalFlips += n;
  if (s.phase !== 'ended' || stuck) { result.stuck++; console.log(`  ✗ ván ${g + 1}: kẹt sau ${n} lần lật (phase=${s.phase})`); continue; }
  if (s.draw) result.draw++;
  else if (s.winner === 'p1') result.p1++;
  else result.p2++;
  result.flips.push(n); result.misses.push(s.misses);
}
const avg = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : 0;
console.log(`\n${N} ván bot-vs-bot (mức Vừa, 16 lá): Dễ thắng ${result.p1} · Khó thắng ${result.p2} · hòa ${result.draw} · kẹt ${result.stuck}`);
console.log(`Số lần lật/ván trung bình: ${avg(result.flips)} (min ${Math.min(...result.flips)} · max ${Math.max(...result.flips)}) · trượt/ván trung bình: ${avg(result.misses)}`);
console.log(`Thời gian bot: trung bình ${(result.totalMs / Math.max(1, result.totalFlips)).toFixed(2)}ms/lần lật · chậm nhất ${result.worstMs}ms · tổng ${result.totalMs}ms`);
if (result.stuck > 0) { console.log('SIM THẤT BẠI: có ván kẹt.'); process.exit(1); }
if (result.p2 < result.p1) { console.log('SIM CẢNH BÁO: Máy Khó thắng ít hơn Máy Dễ — trí nhớ bot có vấn đề.'); process.exit(1); }
console.log('Sim đạt: 0 ván kẹt, Máy Khó thắng đa số.');
