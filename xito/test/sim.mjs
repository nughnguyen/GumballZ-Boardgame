// Mô phỏng bot đấu bot Xì Tố. Chạy: node xito/test/sim.mjs
// Đếm ván kẹt (không kết thúc sau 500 action) và phân bố thắng theo cấp bot.
import * as E from '../js/engine.js';
import { chooseAction } from '../js/bot.js';

let seed = 424242;
const rng = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
E.setRandom(rng);

const P = (id, name, level) => ({ id, name, isBot: true, level });
function playGame(n, levels, opts = {}) {
  const players = Array.from({ length: n }, (_, i) => P('p' + (i + 1), 'Bot' + (i + 1), levels[i % levels.length]));
  const s = E.createGame(players, opts);
  let acts = 0;
  while (s.phase !== 'ended' && acts < 500) {
    const pid = s.turn;
    if (!pid) break;
    const p = s.players.find(x => x.id === pid);
    const a = chooseAction(s, pid, p.level);
    if (!a) break;
    const r = E.applyAction(s, pid, a);
    if (!r.ok) return { stuck: true, reason: `bot ${pid} action ${JSON.stringify(a)} lỗi: ${r.reason}`, s };
    acts++;
  }
  return { stuck: s.phase !== 'ended', acts, s };
}
let stuck = 0, games = 0;
const wins = { easy: 0, hard: 0 };
const streetCount = { showdown: 0, foldwin: 0, draw: 0 };
function run(n, levels, opts, label) {
  let st = 0;
  for (let g = 0; g < n; g++) {
    const r = playGame(levels.length, levels, opts);
    games++;
    if (r.stuck) { st++; stuck++; console.log(`  KẸT ván ${label} #${g}: ${r.reason || 'không kết thúc sau 500 action'} (${r.s.phase}/${r.s.street}, lượt ${r.s.turn})`); continue; }
    streetCount[r.s.endReason] = (streetCount[r.s.endReason] || 0) + 1;
    for (const w of r.s.winnerIds) {
      const p = r.s.players.find(x => x.id === w);
      wins[p.level] = (wins[p.level] || 0) + 1;
    }
  }
  console.log(`  ${label}: ${n} ván, kẹt ${st}`);
}
run(100, ['easy', 'hard', 'hard'], { blinds: 5 }, '3 người Easy-vs-Hard (mù 5/10)');
run(100, ['hard', 'hard'], { blinds: 5 }, '2 người Hard-vs-Hard (mù 5/10)');
run(50, ['easy', 'easy', 'easy', 'easy'], { blinds: 0 }, '4 người Easy (chơi vui 0 xu)');
run(30, ['hard', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard'], { blinds: 5 }, '9 người Hard (mù 5/10)');
console.log(`\nTổng: ${games} ván, kẹt ${stuck}, thắng theo cấp bot:`, wins, '· kết thúc:', streetCount);
if (stuck) { console.log('SIM KẸT — cần xem lại bot/engine.'); process.exit(1); }
console.log('SIM Xì Tố ĐẠT.');
