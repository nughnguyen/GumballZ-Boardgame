// Test Đội Cứu Hộ: node cuuho/test/sim.mjs [số ván]
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('❌', m); } };
const N = +(process.argv[2] || 300), stat = {}, why = {};
for (const np of [2, 3, 4]) for (const epi of [4, 5, 6]) {
  let win = 0, turns = 0, cures = 0;
  for (let g = 0; g < N / 3; g++) {
    const s = E.createGame(Array.from({ length: np }, (_, i) => ({ id: i ? 'bot' + i : 'host', name: 'P' + i, isBot: true })), { epi });
    let n = 0;
    while (s.phase === 'play' && n < 5000) { const id = E.actors(s)[0], a = botAction(E.viewFor(s, id), id); const r = E.applyAction(s, id, a); if (!r.ok) { ok(false, JSON.stringify(a) + ' ' + r.reason); break; } n++; }
    ok(s.phase === 'ended', 'ván không kết thúc');
    for (const c of E.COLORS) ok(E.totalCubes(s, c) <= E.CUBES, 'quá số điểm nguy');
    if (s.result && s.result.win) win++; else why[s.result && s.result.why] = (why[s.result && s.result.why] || 0) + 1;
    turns += n; cures += Object.keys(s.cured).length;
  }
  stat[np + 'p epi' + epi] = `thắng ${(win / (N / 3) * 100).toFixed(0)}% · khắc phục tb ${(cures / (N / 3)).toFixed(1)} · ${Math.round(turns / (N / 3))} việc/ván`;
}
console.table(stat); console.log(why);
/* luật lẻ */
{ const s = E.createGame([{ id: 'host', name: 'A' }, { id: 'p1', name: 'B' }]); const p = s.players[s.turn];
  ok(!E.applyAction(s, p.id, { type: 'move', to: 'camau' }).ok, 'không đi xa được');
  ok(!E.applyAction(s, s.players[1 - s.turn].id, { type: 'pass' }).ok, 'chưa tới lượt');
  ok(!E.applyAction(s, p.id, { type: 'cure', color: 'b' }).ok, 'không khắc phục khi thiếu thẻ');
  const nb = E.NB[p.at][0]; ok(E.applyAction(s, p.id, { type: 'move', to: nb }).ok && s.left === 3, 'đi kề được, còn 3 việc');
  p.hand = ['hanoi', 'laocai', 'sonla', 'halong']; p.at = 'danang'; ok(E.applyAction(s, p.id, { type: 'cure', color: 'b' }).ok || p.role === 'scientist', 'khắc phục ở trạm');
}
console.log(bad ? `❌ ${bad} lỗi` : '✅ ổn'); process.exit(bad ? 1 : 0);
