// Sim bot đấu bot Rắn và Thang. Chạy: node ranvathang/test/sim.mjs [n=50]
// Bot chỉ tung xúc xắc công bằng (1–6 ngẫu nhiên) — ván nào cũng phải kết
// thúc (có người về đúng ô 100), không kẹt. Đo cả số lượt tung trung bình.
import * as E from '../js/engine.js';
import { chooseRoll } from '../js/bot.js';

const N = Number(process.argv[2]) || 50;
const MAX_ROLLS = 5000; /* ván Rắn và Thang dài nhất cũng chỉ vài trăm lượt tung */
const result = { p1: 0, p2: 0, p3: 0, p4: 0, stuck: 0, rolls: [], sixes: 0, ladders: 0, snakes: 0, overshoots: 0 };
function playGame(players) {
  const s = E.createGame(players);
  let rolls = 0;
  while (s.phase !== 'ended' && rolls < MAX_ROLLS) {
    const pid = s.turn;
    const a = chooseRoll(s, pid);
    if (!a) return { stuck: true, s, rolls };
    const r = E.applyAction(s, pid, a);
    if (!r.ok) return { stuck: true, s, rolls };
    rolls++;
    if (a.value === 6) result.sixes++;
    if (r.ladder) result.ladders++;
    if (r.snake) result.snakes++;
    if (r.overshoot) result.overshoots++;
  }
  if (s.phase !== 'ended') return { stuck: true, s, rolls };
  return { stuck: false, s, rolls };
}
for (let g = 0; g < N; g++) {
  const P1 = { id: 'p1', name: 'Bot Đỏ' }, P2 = { id: 'p2', name: 'Bot Xanh', isBot: true };
  const { stuck, s, rolls } = playGame([P1, P2]);
  if (stuck) { result.stuck++; console.log(`  ✗ ván 2 người ${g + 1}: kẹt sau ${rolls} lượt tung`); continue; }
  if (s.winner === 'p1') result.p1++;
  else if (s.winner === 'p2') result.p2++;
  else { result.stuck++; console.log(`  ✗ ván 2 người ${g + 1}: người thắng lạ: ${s.winner}`); continue; }
  assertPos(s);
  result.rolls.push(rolls);
}
function assertPos(s) {
  for (const p of s.players) {
    const pos = s.pos[p.id];
    if (pos < 0 || pos > 100) throw new Error('vị trí ngoài bàn: ' + pos);
  }
  if (s.pos[s.winner] !== 100) throw new Error('người thắng không ở ô 100');
}
/* ván 4 người: cũng phải kết thúc, người thắng phải ở ô 100 */
for (let g = 0; g < 20; g++) {
  const ps = [
    { id: 'p1', name: 'Bot Đỏ' }, { id: 'p2', name: 'Bot Xanh', isBot: true },
    { id: 'p3', name: 'Bot Lá', isBot: true }, { id: 'p4', name: 'Bot Vàng', isBot: true },
  ];
  const { stuck, s, rolls } = playGame(ps);
  if (stuck) { result.stuck++; console.log(`  ✗ ván 4 người ${g + 1}: kẹt sau ${rolls} lượt tung`); continue; }
  const w = s.winner;
  if (w === 'p1') result.p1++;
  else if (w === 'p2') result.p2++;
  else if (w === 'p3') result.p3++;
  else if (w === 'p4') result.p4++;
  else { result.stuck++; console.log(`  ✗ ván 4 người ${g + 1}: người thắng lạ: ${w}`); continue; }
  assertPos(s);
  result.rolls.push(rolls);
}
const avg = result.rolls.length ? (result.rolls.reduce((a, b) => a + b, 0) / result.rolls.length).toFixed(1) : 0;
console.log(`\n${N} ván 2 người + 20 ván 4 người: Đỏ thắng ${result.p1} · Xanh thắng ${result.p2} · Lá thắng ${result.p3} · Vàng thắng ${result.p4} · kẹt ${result.stuck}`);
console.log(`Số lượt tung/ván trung bình: ${avg} (min ${result.rolls.length ? Math.min(...result.rolls) : 0} · max ${result.rolls.length ? Math.max(...result.rolls) : 0}) · tung 6: ${result.sixes} · leo thang: ${result.ladders} · trượt rắn: ${result.snakes} · tung quá: ${result.overshoots}`);
if (result.stuck > 0) { console.log('SIM THẤT BẠI: có ván kẹt.'); process.exit(1); }
console.log('Sim đạt: 0 ván kẹt, mọi ván đều có người về đúng ô 100.');
