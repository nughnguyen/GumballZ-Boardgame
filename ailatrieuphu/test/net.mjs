// Đồng bộ Ai Là Triệu Phú: 2 engine cùng seed + cùng hành động (kể cả
// trợ giúp dùng LCG) phải giống hệt từng byte; đua xen kẽ thứ tự khác
// nhau nhưng cùng tập hành động thì kết quả cuối giống nhau.
import { createGame, applyAction, actors, viewFor, serialize, deserialize, effectiveQuestion } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để bot cho kết quả ổn định — seed: 20261120 */
let _s = 20261120;
function reseed() {
  _s = 20261120;
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
const correctOpt = (s, pid) => effectiveQuestion(s, pid, s.prog[pid].level).answer;

/* chạy 1 ván mẫu: p1 trả lời đúng 6 câu rồi dùng 50:50 + gọi điện, p2 trả lời đúng 3 câu rồi sai */
function sampleActions() {
  return [
    ['p1', { type: 'answer', opt: 'C0', ms: 4000 }],
    ['p2', { type: 'answer', opt: 'C0', ms: 3000 }],
    ['p1', { type: 'answer', opt: 'C0', ms: 5000 }],
    ['p2', { type: 'answer', opt: 'C0', ms: 6000 }],
    ['p1', { type: 'answer', opt: 'C0', ms: 4000 }],
    ['p2', { type: 'answer', opt: 'C0', ms: 5000 }],
    ['p1', { type: 'lifeline', kind: 'fifty' }],
    ['p1', { type: 'answer', opt: 'C0', ms: 7000 }],
    ['p1', { type: 'lifeline', kind: 'phone' }],
    ['p1', { type: 'answer', opt: 'C0', ms: 8000 }],
    ['p1', { type: 'answer', opt: 'C0', ms: 9000 }],
    ['p2', { type: 'answer', opt: 'W0', ms: 4000 }],
    ['p1', { type: 'lifeline', kind: 'audience' }],
    ['p1', { type: 'answer', opt: 'C0', ms: 10000 }],
    ['p1', { type: 'answer', opt: 'C0', ms: 11000 }],
    ['p1', { type: 'answer', opt: 'C0', ms: 12000 }],
    ['p1', { type: 'answer', opt: 'C0', ms: 13000 }],
    ['p1', { type: 'answer', opt: 'C0', ms: 14000 }],
    ['p1', { type: 'answer', opt: 'C0', ms: 15000 }],
    ['p1', { type: 'answer', opt: 'C0', ms: 16000 }],
    ['p1', { type: 'answer', opt: 'C0', ms: 17000 }],
    ['p1', { type: 'answer', opt: 'C0', ms: 18000 }],
  ];
}
function resolve(action, s, pid) {
  if (action.opt === 'C0') return { ...action, opt: correctOpt(s, pid) };
  if (action.opt === 'W0') return { ...action, opt: (correctOpt(s, pid) + 1) % 4 };
  return action;
}
function playSeq(seed, actions) {
  const s = createGame(P(['A', 'B']), { seed });
  for (const [pid, a] of actions) {
    const r = applyAction(s, pid, resolve(a, s, pid));
    if (!r.ok && s.phase === 'playing') return { s, bad: JSON.stringify([pid, a, r.reason]) };
  }
  return { s, bad: null };
}

{
  const acts = sampleActions();
  const a = playSeq(777, acts);
  const b = playSeq(777, acts);
  t('cùng seed + cùng hành động → state giống hệt từng byte', !a.bad && !b.bad && strip(a.s) === strip(b.s), a.bad || b.bad || '');
  t('ván mẫu kết thúc có người thắng', a.s.phase === 'ended' && a.s.winner === 'p1', `winner=${a.s.winner} phase=${a.s.phase}`);
  const v1 = viewFor(a.s, 'p1'), v2 = viewFor(b.s, 'p1');
  const sv = v => { const c = JSON.parse(JSON.stringify(v)); delete c.gid; delete c.startedAt; delete c.endedAt; return JSON.stringify(c); };
  t('viewFor của 2 engine giống hệt (sau khi bỏ gid + giờ máy)', sv(v1) === sv(v2));
}
{
  /* 10 seed đều đồng bộ */
  let ok = true, badSeed = null;
  for (let seed = 1; seed <= 10; seed++) {
    const a = playSeq(seed, sampleActions());
    const b = playSeq(seed, sampleActions());
    if (a.bad || b.bad || strip(a.s) !== strip(b.s)) { ok = false; badSeed = seed; break; }
  }
  t('10 seed khác nhau đều đồng bộ', ok, badSeed != null ? 'seed ' + badSeed : '');
}
{
  /* serialize/deserialize rồi chơi tiếp vẫn đồng bộ */
  const acts = sampleActions();
  const a = playSeq(555, acts.slice(0, 8));
  const b = playSeq(555, acts.slice(0, 8));
  const a2 = deserialize(serialize(a.s));
  const b2 = deserialize(serialize(b.s));
  for (const [pid, act] of acts.slice(8)) {
    applyAction(a2, pid, resolve(act, a2, pid));
    applyAction(b2, pid, resolve(act, b2, pid));
  }
  t('deserialize xong chơi tiếp vẫn đồng bộ', strip(a2) === strip(b2));
}
{
  /* đua xen kẽ thứ tự khác nhau (chỉ hành động trả lời, không dùng LCG) → cùng kết quả cuối */
  function raceInterleaved(seed, order) {
    const s = createGame(P(['A', 'B']), { seed });
    const plan = [];
    for (let i = 0; i < 5; i++) plan.push(['p1', 'C']);
    plan.push(['p1', 'W']);
    for (let i = 0; i < 8; i++) plan.push(['p2', 'C']);
    plan.push(['p2', 'W']);
    const seq = order === 'ab' ? plan : [...plan.filter(x => x[0] === 'p2'), ...plan.filter(x => x[0] === 'p1')];
    for (const [pid, kind] of seq) {
      const opt = kind === 'C' ? correctOpt(s, pid) : (correctOpt(s, pid) + 1) % 4;
      applyAction(s, pid, { type: 'answer', opt, ms: 5000 });
    }
    return s;
  }
  let ok = true;
  for (let seed = 1; seed <= 5; seed++) {
    const ab = raceInterleaved(seed, 'ab');
    const ba = raceInterleaved(seed, 'ba');
    if (ab.winner !== ba.winner || JSON.stringify(ab.final) !== JSON.stringify(ba.final)) { ok = false; break; }
  }
  t('xáo thứ tự xen kẽ 2 người → cùng người thắng + cùng summary', ok);
}
{
  /* bot đấu bot đồng bộ: cùng seed, cùng lượt bot → giống hệt */
  function botRace(seed, l1 = 'hard', l2 = 'easy') {
    const s = createGame(P(['A', 'B']), { seed });
    const lv = { p1: l1, p2: l2 };
    let guard = 0;
    while (s.phase !== 'ended' && guard++ < 100) {
      for (const pid of actors(s)) {
        let act = botAction(s, pid, lv[pid]);
        let inner = 0;
        while (act && act.type === 'lifeline' && inner++ < 5) {
          applyAction(s, pid, act);
          act = botAction(s, pid, lv[pid]);
        }
        if (act) applyAction(s, pid, act);
      }
    }
    return s;
  }
  reseed(); const a = botRace(99);
  reseed(); const b = botRace(99);
  t('bot đấu bot cùng seed → state giống hệt', strip(a) === strip(b) && a.phase === 'ended');
  t('bot đấu bot kết thúc có người thắng hoặc hòa', a.phase === 'ended' && (a.winner || a.endReason === 'draw'));
}

console.log(`\nĐồng bộ Ai Là Triệu Phú: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
