// Sim bot đấu bot Mậu Binh. Chạy: node maubinh/test/sim.mjs [n=100] [easy|hard|mix]
// Bot phải xếp bài hợp lệ mọi ván, không kẹt, ván kết thúc hợp lệ
// (so chi xong, có điểm tổng). Đo cả thời gian xếp bài trung bình.
import * as E from '../js/engine.js';
import { chooseAction } from '../js/bot.js';

const N = Number(process.argv[2]) || 100;
const LVL = process.argv[3] || 'mix';
const levelOf = pid => LVL === 'easy' ? 'easy' : LVL === 'hard' ? 'hard' : (pid === 'p1' ? 'easy' : 'hard');
const mkPlayers = n => Array.from({ length: n }, (_, i) => ({ id: 'p' + (i + 1), name: 'Bot ' + (i + 1), isBot: true }));
const result = { wins: {}, fouls: { easy: 0, hard: 0 }, specials: 0, stuck: 0, scores: [], worstMs: 0, totalMs: 0, totalActs: 0 };
for (let g = 0; g < N; g++) {
  const n = 2 + (g % 3); /* 2–4 người, xoay vòng */
  const players = mkPlayers(n);
  const s = E.createGame(players, { chi: [0, 5, 10][g % 3] });
  for (const p of s.players) if (p.special) result.specials++;
  let acts = 0, stuck = false;
  while (s.phase !== 'ended' && acts < 50) {
    const actorIds = E.actors(s);
    if (!actorIds.length) { stuck = true; break; }
    const pid = actorIds[0];
    const lvl = levelOf(pid);
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
    for (const p of s.players) {
      if (p.res.foul) result.fouls[levelOf(p.id)]++;
      result.scores.push(p.res.score);
    }
    for (const w of s.winnerIds) result.wins[w] = (result.wins[w] || 0) + 1;
  }
}
const avg = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '0';
console.log(`Sim Mậu Binh: ${N} ván (${LVL}), ${result.stuck} ván kẹt`);
console.log(`  bài đặc biệt: ${result.specials} lượt; binh lủng: Dễ ${result.fouls.easy}, Khó ${result.fouls.hard}`);
console.log(`  điểm chi TB/người: ${avg(result.scores)}; thắng theo ghế: ${JSON.stringify(result.wins)}`);
console.log(`  thời gian bot TB: ${(result.totalMs / Math.max(1, result.totalActs)).toFixed(2)}ms/hành động, tệ nhất ${result.worstMs}ms`);
if (result.stuck) { console.log('  ✗ CÓ VÁN KẸT!'); process.exit(1); }
console.log('  ✓ 0 ván kẹt.');
