// Sim bot đấu bot Ô Ăn Quan. Chạy: node oanquan/test/sim.mjs [n=50]
import * as E from '../js/engine.js';
import { chooseMove } from '../js/bot.js';

const N = Number(process.argv[2]) || 50;
const P1 = { id: 'p1', name: 'Bot Dễ' }, P2 = { id: 'p2', name: 'Bot Khó', isBot: true };
const MAX_MOVES = 2000; /* mỗi ván không quá 2000 nước — kẹt thì báo ngay */
const result = { p1: 0, p2: 0, draw: 0, stuck: 0, moves: [], conservation: 0 };
for (let g = 0; g < N; g++) {
  const s = E.createGame([P1, P2], { quanValue: g % 2 ? 5 : 10 });
  let moves = 0, stuck = false, conversions = 0;
  while (s.phase === 'playing' && moves < MAX_MOVES) {
    const pid = s.turn;
    const lvl = pid === 'p1' ? 'easy' : 'hard';
    const m = chooseMove(s, pid, lvl);
    if (!m) { stuck = true; break; }
    const r = E.applyMove(s, pid, m);
    if (!r.ok) { stuck = true; break; }
    if (r.rescue?.converted) conversions += r.rescue.converted;
    moves++;
  }
  if (s.phase !== 'ended' || stuck) { result.stuck++; console.log(`  ✗ ván ${g + 1}: kẹt sau ${moves} nước (phase=${s.phase})`); continue; }
  const sc = s.scores;
  /* bảo toàn điểm: tổng 2 bên + tổng nợ + giá trị quân còn trong 2 ô Quan
     = 50 Dân + 2 Quan × giá trị Quan. (Ô Quan còn quân chỉ xảy ra khi ván kết thúc
     do không cứu được dân — quân đó không tính cho bên nào.) */
  const qv = s.opts.quanValue;
  const debt = s.players[0].debt + s.players[1].debt;
  const mandarinValue = (s.cells[0].q + s.cells[6].q) * qv + s.cells[0].d + s.cells[6].d;
  const raw = s.players.map((p, i) => p.bag.q * qv + p.bag.d
    + E.SIDE_CELLS[i].reduce((a, c) => a + s.cells[c].d, 0) - p.debt);
  /* lưu ý: đổi 1 Quan = 10 Dân khi cứu dân (theo đặc tả, bất kể giá trị Quan 5 hay 10),
     nên mỗi lần đổi tạo thêm (10 − giá trị Quan) điểm vào tổng toàn bàn */
  if (raw[0] + raw[1] + debt + mandarinValue !== 50 + 2 * qv + conversions * (10 - qv)) result.conservation++;
  if (sc[0].total !== Math.max(0, raw[0]) || sc[1].total !== Math.max(0, raw[1])) result.conservation++;
  if (s.draw) result.draw++;
  else if (s.winner === 'p1') result.p1++;
  else result.p2++;
  result.moves.push(moves);
}
const avg = result.moves.length ? (result.moves.reduce((a, b) => a + b, 0) / result.moves.length).toFixed(1) : 0;
console.log(`\nSim ${N} ván (Dễ vs Khó, Quan 5/10 xen kẽ): p1 thắng ${result.p1}, p2 thắng ${result.p2}, hoà ${result.draw}, kẹt ${result.stuck}, sai bảo toàn điểm ${result.conservation}, trung bình ${avg} nước/ván.`);
if (result.stuck > 0 || result.conservation > 0) { console.log('SIM THẤT BẠI'); process.exit(1); }
console.log('SIM ĐẠT.');
