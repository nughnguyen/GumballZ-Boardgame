// Đồng bộ mạng Vẽ Truyền Tin: 2 engine cùng seed + cùng actions →
// state byte-identical (kể cả nét vẽ); deserialize rồi chơi tiếp vẫn
// đồng bộ. Chạy: node vetruyentin/test/net.mjs
import { createGame, applyAction, actors, serialize, deserialize, stepKind } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để bot cho kết quả ổn định — seed: 20261120 */
let _s = 20261120;
function reseed(seed = 20261120) {
  _s = seed;
  Math.random = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
reseed();

let pass = 0, fail = 0;
const t = (n, c, extra = '') => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (extra ? ' — ' + extra : '')); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));

/* so sánh 2 state: bỏ gid (ngẫu nhiên mỗi ván) và startedAt/endedAt (giờ máy) */
function strip(s) {
  const c = JSON.parse(JSON.stringify(s));
  delete c.gid; delete c.startedAt; delete c.endedAt;
  return JSON.stringify(c);
}

/* chơi 1 ván trên 2 engine song song: tính action 1 lần từ ván A rồi
   áp cùng 1 action cho cả 2 ván (bot dùng Math.random nên không được
   gọi botAction 2 lần — lần 2 sẽ rút số khác). splitAt = số action
   thì ván B được serialize/deserialize giữa chừng. */
function playPair(seed, players, opts, levels, splitAt = -1) {
  reseed();
  const sA = createGame(players, { seed, ...opts });
  let sB = createGame(players, { seed, ...opts });
  let guard = 0, illegal = 0, stuck = 0, actions = 0;
  while (sA.phase !== 'ended' && guard++ < 3000) {
    const act = actors(sA);
    if (!act.length) { stuck++; break; }
    /* mỗi lượt có thể nhiều người cùng hành động (nhiều người: 4–8 sổ cùng bước) */
    for (const pid of act) {
      if (sA.phase !== 'playing') break;
      const a = botAction(sA, pid, levels[pid] || 'easy');
      if (!a) { stuck++; break; }
      const rA = applyAction(sA, pid, a);
      const rB = applyAction(sB, pid, a);
      if (!rA.ok || !rB.ok || JSON.stringify(rA) !== JSON.stringify(rB)) { illegal++; break; }
      actions++;
      if (actions === splitAt) sB = deserialize(serialize(sB));
      if (strip(sA) !== strip(sB)) { illegal++; break; }
    }
    if (illegal) break;
  }
  return { sA, sB, illegal, stuck, actions, ended: sA.phase === 'ended' };
}

{
  const lv = { p1: 'hard', p2: 'easy', p3: 'hard', p4: 'easy' };
  const { sA, sB, illegal, stuck, ended } = playPair(1001, P(['A', 'B', 'C', 'D']), { vtMode: 'multi' }, lv);
  t('ván 4 người: 2 engine cùng seed + cùng actions chơi tới cùng', ended && illegal === 0 && stuck === 0);
  t('ván 4 người: state giống hệt suốt ván, kể cả nét vẽ (trừ gid/giờ)', strip(sA) === strip(sB));
  t('ván 4 người: mọi sổ đều có đủ 5 entry (từ + 4 lượt)', sA.books.every(b => b.entries.length === 5));
}
{
  const lv = { p1: 'easy', p2: 'hard', p3: 'easy', p4: 'hard', p5: 'easy', p6: 'hard' };
  const { sA, sB, illegal, stuck, ended } = playPair(1002, P(['A', 'B', 'C', 'D', 'E', 'F']), { vtMode: 'multi' }, lv, 10);
  t('ván 6 người: deserialize giữa chừng (action 10) rồi chơi tiếp tới cùng', ended && illegal === 0 && stuck === 0);
  t('ván 6 người: state giống hệt sau deserialize + chơi tiếp (trừ gid/giờ)', strip(sA) === strip(sB));
}
{
  /* chơi đơn đồng bộ: người vẽ (botAction giả làm người), máy đoán */
  const lv = { p1: 'hard', bot1: 'hard' };
  const { sA, sB, illegal, stuck, ended } = playPair(1003, P(['A']), { vtMode: 'solo', botLevel: 'hard' }, lv);
  t('ván đơn: 2 engine cùng seed + cùng actions chơi tới cùng', ended && illegal === 0 && stuck === 0);
  t('ván đơn: state giống hệt (trừ gid/giờ)', strip(sA) === strip(sB));
}
{
  /* đấu máy đồng bộ: sổ của máy do engine tự chơi bằng LCG — 2 máy phải giống hệt */
  const players = [{ id: 'p1', name: 'A' }, { id: 'bot9', name: 'Mochi 🤖', isBot: true, level: 'hard' }];
  const lv = { p1: 'easy', bot9: 'hard' };
  const { sA, sB, illegal, stuck, ended } = playPair(1004, players, { vtMode: 'race', botLevel: 'hard' }, lv, 5);
  t('ván đấu máy: 2 engine cùng seed + cùng actions chơi tới cùng', ended && illegal === 0 && stuck === 0);
  t('ván đấu máy: state giống hệt, kể cả sổ máy tự chơi (trừ gid/giờ)', strip(sA) === strip(sB));
  t('ván đấu máy: sổ máy có đủ 11 entry ở cả 2 engine', sA.books[1].entries.length === 11 && sB.books[1].entries.length === 11);
}
{
  const sA = createGame(P(['A', 'B', 'C', 'D']), { seed: 1005, vtMode: 'multi' });
  const sB = createGame(P(['A', 'B', 'C', 'D']), { seed: 1006, vtMode: 'multi' });
  t('seed khác nhau → state khác nhau (sanity)', strip(sA) !== strip(sB));
  t('cùng seed → state ban đầu giống hệt (trừ gid/giờ)', strip(createGame(P(['A', 'B', 'C', 'D']), { seed: 1005, vtMode: 'multi' })) === strip(sA));
}
{
  /* nét vẽ đồng bộ: 1 action draw với strokes cụ thể → 2 engine giống hệt */
  reseed();
  const strokes = [{ color: '#E5484D', width: 8, pts: [[10, 10], [20, 30], [40, 50]] }, { color: '#2F6FED', width: 4, pts: [[100, 100], [120, 110]] }];
  const sA = createGame(P(['A', 'B', 'C', 'D']), { seed: 1007, vtMode: 'multi' });
  const sB = createGame(P(['A', 'B', 'C', 'D']), { seed: 1007, vtMode: 'multi' });
  applyAction(sA, 'p1', { type: 'draw', strokes });
  applyAction(sB, 'p1', { type: 'draw', strokes });
  t('nét vẽ: cùng 1 action draw → strokes giống hệt ở 2 engine', JSON.stringify(sA.books[0].entries[1].strokes) === JSON.stringify(strokes) && strip(sA) === strip(sB));
}

console.log(`\nNET: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
