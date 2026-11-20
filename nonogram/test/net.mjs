/* Nonogram net tests — lockstep: 2 states cùng seed + cùng dãy hành
   động phải cho serialize giống hệt nhau (kể cả câu đố sinh ra). */
import { createGame, applyAction, actors, viewFor, serialize, deserialize, mulberry32 } from '../js/engine.js';
import { botAction } from '../js/bot.js';

Math.random = mulberry32(424242);

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }
const P = n => Array.from({ length: n }, (_, i) => ({ id: 'p' + (i + 1), name: 'P' + (i + 1) }));
const blackCells = s => { const out = []; for (let y = 0; y < s.size; y++) for (let x = 0; x < s.size; x++) if (s.solution[y][x] === 1) out.push({ x, y }); return out; };
const whiteCells = s => { const out = []; for (let y = 0; y < s.size; y++) for (let x = 0; x < s.size; x++) if (s.solution[y][x] === 0) out.push({ x, y }); return out; };
/* serialize chứa startedAt/endedAt/timeMs/doneAt (thời gian thật) nên 2
   state giống hệt nhau về luật vẫn khác nhau ở các trường thời gian —
   khi so lockstep phải chuẩn hoá bỏ chúng. */
function canon(s) {
  const o = JSON.parse(serialize(s));
  delete o.startedAt; delete o.endedAt; delete o.gid; // gid ngẫu nhiên theo ván, thời gian thật
  if (o.prog) for (const p of Object.values(o.prog)) delete p.doneAt; // doneAt = Date.now() khi xong
  if (o.final && o.final.summary) for (const p of Object.values(o.final.summary)) delete p.timeMs;
  return JSON.stringify(o);
}

// 1. cùng seed, cùng dãy hành động tay → serialize giống hệt
{
  const seed = 777;
  const mk = () => createGame(P(1), { seed, ngMode: 'solo', size: 10 });
  const probe = mk();
  const bs = blackCells(probe), ws = whiteCells(probe);
  const script = [
    { type: 'fill', x: bs[0].x, y: bs[0].y },
    { type: 'fill', x: bs[1].x, y: bs[1].y },
    { type: 'mark', x: ws[0].x, y: ws[0].y },
    { type: 'fill', x: ws[1].x, y: ws[1].y }, /* tô sai 1 */
    { type: 'clear', x: bs[0].x, y: bs[0].y },
    { type: 'fill', x: bs[0].x, y: bs[0].y },
    { type: 'hint' },
    { type: 'mark', x: ws[0].x, y: ws[0].y }, /* bỏ dấu */
    { type: 'fill', x: bs[2].x, y: bs[2].y },
  ];
  const a = mk(), b = mk();
  let same = true;
  for (const act of script) {
    applyAction(a, 'p1', act);
    applyAction(b, 'p1', act);
    if (canon(a) !== canon(b)) { same = false; break; }
  }
  check('lockstep: cùng seed + cùng hành động → serialize giống hệt', same);
  check('lockstep: bảng/mistakes/hints giống nhau',
    JSON.stringify(a.prog.p1.grid) === JSON.stringify(b.prog.p1.grid) &&
    a.prog.p1.mistakes === b.prog.p1.mistakes && a.prog.p1.hintsUsed === b.prog.p1.hintsUsed);
  check('lockstep: câu đố giống nhau (cùng seed)', JSON.stringify(a.solution) === JSON.stringify(b.solution));
}

// 2. khác seed → câu đố khác nhau (rất có thể)
{
  const a = createGame(P(1), { seed: 11, ngMode: 'solo', size: 10 });
  const b = createGame(P(1), { seed: 22, ngMode: 'solo', size: 10 });
  check('khác seed → đáp án khác nhau',
    JSON.stringify(a.solution) !== JSON.stringify(b.solution),
    `totalBlack ${a.totalBlack} vs ${b.totalBlack}`);
}

// 3. đua 2 người: cả 2 dùng botAction, 2 state song song phải đồng bộ
{
  const mk = () => createGame(
    [{ id: 'p1', name: 'P1', isBot: true, level: 'hard' }, { id: 'p2', name: 'P2', isBot: true, level: 'easy' }],
    { seed: 999, ngMode: 'race', size: 10 });
  const a = mk(), b = mk();
  let same = true, steps = 0, illegal = 0;
  while (a.phase === 'playing' && steps < 5000) {
    steps++;
    for (const pid of actors(a)) {
      if (a.phase !== 'playing') break; // người trước có thể vừa kết thúc ván
      const act = botAction(a, pid);
      if (act) {
        const r1 = applyAction(a, pid, act);
        const r2 = applyAction(b, pid, act);
        if (!r1.ok || !r2.ok) illegal++;
      }
      if (canon(a) !== canon(b)) { same = false; break; }
    }
    if (!same) break;
  }
  check('lockstep đua bot: serialize giống hệt sau mỗi nước', same);
  check('lockstep đua bot: 0 nước sai luật', illegal === 0, `illegal=${illegal}`);
  check('lockstep đua bot: ván kết thúc', a.phase === 'ended' && b.phase === 'ended', `phase=${a.phase}`);
  check('lockstep đua bot: cùng người thắng', a.winner === b.winner, `${a.winner} vs ${b.winner}`);
}

// 4. deserialize rồi chơi tiếp vẫn đồng bộ
{
  const a = createGame(P(1), { seed: 555, ngMode: 'solo', size: 10 });
  const bs = blackCells(a);
  applyAction(a, 'p1', { type: 'fill', x: bs[0].x, y: bs[0].y });
  applyAction(a, 'p1', { type: 'hint' });
  const b = deserialize(serialize(a));
  applyAction(a, 'p1', { type: 'fill', x: bs[1].x, y: bs[1].y });
  applyAction(b, 'p1', { type: 'fill', x: bs[1].x, y: bs[1].y });
  applyAction(a, 'p1', { type: 'mark', x: 0, y: 0 });
  applyAction(b, 'p1', { type: 'mark', x: 0, y: 0 });
  check('deserialize xong chơi tiếp vẫn đồng bộ', canon(a) === canon(b));
}

// 5. viewFor của 2 người khác nhau (mỗi người thấy bảng của mình)
{
  const s = createGame(P(2), { seed: 31, ngMode: 'race', size: 10 });
  const bs = blackCells(s);
  applyAction(s, 'p1', { type: 'fill', x: bs[0].x, y: bs[0].y });
  const v1 = viewFor(s, 'p1');
  const v2 = viewFor(s, 'p2');
  check('view p1 khác view p2 (bảng khác nhau)', JSON.stringify(v1.my.grid) !== JSON.stringify(v2.my.grid));
  check('view p1.me = p1, view p2.me = p2', v1.me === 'p1' && v2.me === 'p2');
  check('view không lộ đáp án (không có solution)', !('solution' in v1) && !('solution' in v2));
  check('view không lộ grid đối thủ (players chỉ có tóm tắt)', v1.players.every(p => !('grid' in p) && !('rowClues' in p)));
  check('view p1 thấy % và lỗi của p2 qua tóm tắt', typeof v1.players.find(p => p.id === 'p2').percent === 'number' && typeof v1.players.find(p => p.id === 'p2').mistakes === 'number');
  check('view p1 và p2 thấy cùng gợi ý (cùng câu đố)', JSON.stringify(v1.my.rowClues) === JSON.stringify(v2.my.rowClues));
}

// 6. timeout đồng bộ ở cả 2 state
{
  const mk = () => createGame(P(2), { seed: 77, ngMode: 'race', size: 5 });
  const a = mk(), b = mk();
  const bs = blackCells(a);
  applyAction(a, 'p1', { type: 'fill', x: bs[0].x, y: bs[0].y });
  applyAction(b, 'p1', { type: 'fill', x: bs[0].x, y: bs[0].y });
  applyAction(a, 'p1', { type: 'timeout' });
  applyAction(b, 'p1', { type: 'timeout' });
  check('timeout đồng bộ: cùng người thắng + cùng endReason', a.winner === b.winner && a.endReason === b.endReason, `${a.winner}/${a.endReason}`);
  check('timeout đồng bộ: serialize giống hệt', canon(a) === canon(b));
}

console.log(`\nNonogram net: ${pass} pass, ${fail} fail.`);
