// Đồng bộ mạng Đoán Hành Động: 2 engine cùng seed + cùng actions →
// state byte-identical; deserialize rồi chơi tiếp vẫn đồng bộ.
import { createGame, applyAction, actors, serialize, deserialize } from '../js/engine.js';
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
function playPair(seed, names, levels, splitAt = -1) {
  reseed();
  const sA = createGame(P(names), { seed });
  let sB = createGame(P(names), { seed });
  const lv = {};
  names.forEach((_, i) => { lv['p' + (i + 1)] = levels[i]; });
  let guard = 0, illegal = 0, stuck = 0, actions = 0;
  while (sA.phase !== 'ended' && guard++ < 2000) {
    const act = actors(sA);
    if (!act.length) { stuck++; break; }
    const pid = act[0];
    let a = botAction(sA, pid, lv[pid]);
    if (!a) {
      if (sA.stage === 'guess') a = { type: 'timeout' };
      else { stuck++; break; }
    }
    const rA = applyAction(sA, pid, a);
    const rB = applyAction(sB, pid, a);
    if (!rA.ok || !rB.ok || JSON.stringify(rA) !== JSON.stringify(rB)) { illegal++; break; }
    actions++;
    if (actions === splitAt) sB = deserialize(serialize(sB));
    if (strip(sA) !== strip(sB)) { illegal++; break; }
  }
  return { sA, sB, illegal, stuck, actions, ended: sA.phase === 'ended' };
}

{
  const { sA, sB, illegal, stuck, ended } = playPair(1001, ['A', 'B', 'C', 'D'], ['hard', 'easy', 'hard', 'easy']);
  t('ván 4 người: 2 engine cùng seed + cùng actions chơi tới cùng', ended && illegal === 0 && stuck === 0);
  t('ván 4 người: state giống hệt suốt ván (trừ gid/giờ)', strip(sA) === strip(sB));
}
{
  const { sA, sB, illegal, stuck, ended } = playPair(1002, ['A', 'B'], ['easy', 'hard'], 10);
  t('ván 2 người: deserialize giữa chừng (action 10) rồi chơi tiếp tới cùng', ended && illegal === 0 && stuck === 0);
  t('ván 2 người: state giống hệt sau deserialize + chơi tiếp (trừ gid/giờ)', strip(sA) === strip(sB));
}
{
  /* chơi đơn đồng bộ: cùng seed, cùng lựa chọn */
  reseed();
  const mk = () => createGame(P(['A']), { seed: 1003 });
  const sA = mk(), sB = mk();
  let guard = 0, illegal = 0;
  while (sA.phase !== 'ended' && guard++ < 100) {
    if (sA.stage === 'guess') {
      const idx = (sA.soloSet.correctIdx + 1) % 4; /* luôn chọn sai 1 phương án */
      const rA = applyAction(sA, 'p1', { type: 'guess', idx });
      const rB = applyAction(sB, 'p1', { type: 'guess', idx });
      if (!rA.ok || !rB.ok) { illegal++; break; }
    } else if (sA.stage === 'reveal') {
      const rA = applyAction(sA, 'p1', { type: 'next' });
      const rB = applyAction(sB, 'p1', { type: 'next' });
      if (!rA.ok || !rB.ok) { illegal++; break; }
    } else { illegal++; break; }
    if (strip(sA) !== strip(sB)) { illegal++; break; }
  }
  t('ván đơn: 2 engine cùng seed + cùng lựa chọn → giống hệt (trừ gid/giờ)', sA.phase === 'ended' && illegal === 0 && strip(sA) === strip(sB));
}
{
  const sA = createGame(P(['A', 'B']), { seed: 1004 });
  const sB = createGame(P(['A', 'B']), { seed: 1005 });
  t('seed khác nhau → state khác nhau (sanity)', strip(sA) !== strip(sB));
  t('cùng seed → state ban đầu giống hệt (trừ gid/giờ)', strip(createGame(P(['A', 'B']), { seed: 1004 })) === strip(sA));
}

console.log(`\nNET: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
