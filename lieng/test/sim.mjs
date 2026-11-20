// Sim bot đấu bot Liêng. Chạy: node lieng/test/sim.mjs [n=100] [easy|hard|mix]
// Bot phải hành động hợp lệ mọi lượt, không kẹt, ván kết thúc hợp lệ
// (lật bài chia gà / hốt gà do Bỏ hết). Đo cả thời gian đi trung bình.
import * as E from '../js/engine.js';
import { chooseAction } from '../js/bot.js';

const N = Number(process.argv[2]) || 100;
const LVL = process.argv[3] || 'mix';
const mkPlayers = n => Array.from({ length: n }, (_, i) => ({ id: 'p' + (i + 1), name: 'Bot ' + (i + 1), isBot: true }));
const MAX_ACTS = 200;
const result = { wins: {}, foldWin: 0, showdown: 0, stuck: 0, acts: [], worstMs: 0, totalMs: 0, totalActs: 0, pots: [], anteFree: 0 };
for (let g = 0; g < N; g++) {
  const n = 2 + (g % 5); /* 2–6 người, xoay vòng */
  const players = mkPlayers(n);
  const ante = [0, 5, 10][g % 3];
  const s = E.createGame(players, { ante });
  let acts = 0, stuck = false;
  const t0 = Date.now();
  while (s.phase !== 'ended' && acts < MAX_ACTS) {
    const actorIds = E.actors(s);
    if (!actorIds.length) { stuck = true; break; }
    const pid = actorIds[0];
    const lvl = LVL === 'easy' ? 'easy' : LVL === 'hard' ? 'hard' : (pid === 'p1' ? 'easy' : 'hard');
    const m0 = Date.now();
    const a = chooseAction(s, pid, lvl);
    const ms = Date.now() - m0;
    result.totalMs += ms; result.worstMs = Math.max(result.worstMs, ms); result.totalActs++;
    if (!a) { stuck = true; break; }
    const r = E.applyAction(s, pid, a);
    if (!r.ok) { stuck = true; console.log(`  ván ${g}: bot ${pid} (${lvl}) trả nước lỗi ${JSON.stringify(a)} — ${r.reason}`); break; }
    acts++;
  }
  if (s.phase !== 'ended') { stuck = true; }
  if (stuck) result.stuck++;
  else {
    result.acts.push(acts);
    result.pots.push(s.pot);
    if (s.endReason === 'fold-win') result.foldWin++;
    else result.showdown++;
    for (const w of s.winnerIds) result.wins[w] = (result.wins[w] || 0) + 1;
  }
}
const avg = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '0';
console.log(`Sim Liêng: ${N} ván (${LVL}), ${result.stuck} ván kẹt`);
console.log(`  kết thúc: lật bài ${result.showdown}, hốt gà do Bỏ hết ${result.foldWin}`);
console.log(`  thắng theo ghế: ${JSON.stringify(result.wins)}`);
console.log(`  số hành động/ván TB: ${avg(result.acts)}; gà TB: ${avg(result.pots)} xu`);
console.log(`  thời gian bot TB: ${(result.totalMs / Math.max(1, result.totalActs)).toFixed(2)}ms/hành động, tệ nhất ${result.worstMs}ms`);
if (result.stuck) { console.log('  ✗ CÓ VÁN KẸT!'); process.exit(1); }
console.log('  ✓ 0 ván kẹt.');
