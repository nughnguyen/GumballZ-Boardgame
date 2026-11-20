// Đồng bộ 2 Thật 1 Giả: cùng seed + cùng hành động → state giống hệt
// từng byte; deserialize giữa ván rồi chơi tiếp vẫn đồng bộ.
import { createGame, applyAction, actors, serialize, deserialize } from '../js/engine.js';
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

/* 1 action/lượt, lấy lại actors sau mỗi action (vì 'next' đổi stage) */
function driveOne(s, pid, levels) {
  const a = botAction(s, pid, levels[pid]);
  if (!a) return false;
  return applyAction(s, pid, a).ok;
}
function playBotGame(seed, names, levels) {
  const s = createGame(P(names), { seed });
  const lv = {};
  names.forEach((nm, i) => { lv['p' + (i + 1)] = levels[i]; });
  let guard = 0;
  while (s.phase !== 'ended' && guard++ < 500) {
    const act = actors(s);
    if (!act.length) return { s, stuck: true };
    if (!driveOne(s, act[0], lv)) return { s, stuck: true };
  }
  return { s, stuck: s.phase !== 'ended' };
}

/* kịch bản hành động cố định (không dùng bot): người kể nộp bộ tự viết,
   người đoán đoán theo chỉ số cố định, xen kẽ 1 lần hết giờ */
function playScripted(seed, names) {
  const s = createGame(P(names), { seed });
  let guard = 0, step = 0;
  while (s.phase !== 'ended' && guard++ < 500) {
    const act = actors(s);
    if (!act.length) return { s, stuck: true };
    const pid = act[0];
    let a;
    if (s.stage === 'submit') {
      a = { type: 'submit', statements: ['Tôi thích ăn phở.', 'Tôi biết bơi.', 'Tôi từng leo núi.'], lie: step % 3 };
    } else if (s.stage === 'guess') {
      a = (step % 5 === 4) ? { type: 'timeout' } : { type: 'guess', idx: (step + 1) % 3 };
    } else {
      a = { type: 'next' };
    }
    step++;
    const r = applyAction(s, pid, a);
    if (!r.ok) return { s, stuck: true, reason: r.reason };
  }
  return { s, stuck: s.phase !== 'ended' };
}

/* ---- cùng seed + cùng kịch bản → giống hệt từng byte ---- */
{
  let ok = true, bad = -1;
  for (let seed = 1; seed <= 10; seed++) {
    const a = playScripted(seed, ['A', 'B', 'C']);
    const b = playScripted(seed, ['A', 'B', 'C']);
    if (a.stuck || b.stuck || strip(a.s) !== strip(b.s)) { ok = false; bad = seed; break; }
  }
  t('cùng seed + cùng kịch bản → state giống hệt từng byte (10 seed)', ok, bad > 0 ? 'lệch ở seed ' + bad : '');
}

/* ---- bot-vs-bot cùng seed (reseed trước mỗi ván) → giống hệt ---- */
{
  let ok = true, bad = -1;
  for (let seed = 1; seed <= 10; seed++) {
    reseed(); const a = playBotGame(seed, ['A', 'B', 'C', 'D'], ['easy', 'hard', 'easy', 'hard']);
    reseed(); const b = playBotGame(seed, ['A', 'B', 'C', 'D'], ['easy', 'hard', 'easy', 'hard']);
    if (a.stuck || b.stuck || strip(a.s) !== strip(b.s)) { ok = false; bad = seed; break; }
  }
  t('bot-vs-bot cùng seed → state giống hệt (10 seed, 4 người)', ok, bad > 0 ? 'lệch ở seed ' + bad : '');
}

/* ---- deserialize giữa ván rồi chơi tiếp vẫn đồng bộ ---- */
{
  let ok = true, bad = -1;
  for (let seed = 1; seed <= 5; seed++) {
    const a = playScripted(seed, ['A', 'B']);
    /* chơi lại tới giữa ván, deserialize, rồi chơi tiếp bằng kịch bản */
    const m = createGame(P(['A', 'B']), { seed });
    let step = 0;
    while (m.stage !== 'guess' && m.phase === 'playing' && step++ < 20) {
      const act = actors(m);
      if (!act.length) break;
      applyAction(m, act[0], { type: 'submit', statements: ['Tôi thích ăn phở.', 'Tôi biết bơi.', 'Tôi từng leo núi.'], lie: step % 3 });
    }
    const restored = deserialize(serialize(m));
    if (JSON.stringify(restored) !== JSON.stringify(m)) { ok = false; bad = seed; break; }
    /* chơi tiếp cả 2 bản bằng cùng kịch bản */
    const finA = (() => {
      let g = 0;
      while (m.phase !== 'ended' && g++ < 500) {
        const act = actors(m);
        if (!act.length) break;
        const pid = act[0];
        let ac;
        if (m.stage === 'submit') ac = { type: 'submit', statements: ['Tôi thích ăn phở.', 'Tôi biết bơi.', 'Tôi từng leo núi.'], lie: g % 3 };
        else if (m.stage === 'guess') ac = (g % 5 === 4) ? { type: 'timeout' } : { type: 'guess', idx: (g + 1) % 3 };
        else ac = { type: 'next' };
        if (!applyAction(m, pid, ac).ok) break;
      }
      return m;
    })();
    const finB = (() => {
      let g = 0;
      const s = restored;
      while (s.phase !== 'ended' && g++ < 500) {
        const act = actors(s);
        if (!act.length) break;
        const pid = act[0];
        let ac;
        if (s.stage === 'submit') ac = { type: 'submit', statements: ['Tôi thích ăn phở.', 'Tôi biết bơi.', 'Tôi từng leo núi.'], lie: g % 3 };
        else if (s.stage === 'guess') ac = (g % 5 === 4) ? { type: 'timeout' } : { type: 'guess', idx: (g + 1) % 3 };
        else ac = { type: 'next' };
        if (!applyAction(s, pid, ac).ok) break;
      }
      return s;
    })();
    if (strip(finA) !== strip(finB)) { ok = false; bad = seed; break; }
  }
  t('deserialize giữa ván rồi chơi tiếp vẫn đồng bộ (5 seed)', ok, bad > 0 ? 'lệch ở seed ' + bad : '');
}

/* ---- chơi đơn cùng seed + cùng kịch bản → giống hệt ---- */
{
  let ok = true;
  for (let seed = 1; seed <= 10; seed++) {
    const run = () => {
      const s = createGame(P(['A']), { seed });
      let g = 0;
      while (s.phase !== 'ended' && g++ < 100) {
        const act = actors(s);
        if (!act.length) break;
        const pid = act[0];
        let a;
        if (s.stage === 'guess') a = { type: 'guess', idx: g % 3 };
        else a = { type: 'next' };
        if (!applyAction(s, pid, a).ok) break;
      }
      return s;
    };
    if (strip(run()) !== strip(run())) { ok = false; break; }
  }
  t('chơi đơn cùng seed + cùng kịch bản → state giống hệt (10 seed)', ok);
}

/* ---- serialize không làm mất lượt kể/đoán giữa chừng ---- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 77 });
  applyAction(s, 'p1', { type: 'submit', statements: ['a1', 'b1', 'c1'], lie: 1 });
  applyAction(s, 'p2', { type: 'guess', idx: 1 });
  const b = deserialize(serialize(s));
  t('serialize giữa lượt đoán giữ nguyên stage/guesses', b.stage === 'guess' && b.current.guesses.p2 === 1 && b.current.lie === 1);
  t('serialize giữ nguyên điểm đã ghi', b.prog.p1.points === 0 && b.prog.p2.totalGuesses === 0);
}

console.log(`\nĐồng bộ 2 Thật 1 Giả: ${pass} pass, ${fail} fail.`);
process.exit(fail ? 1 : 0);
