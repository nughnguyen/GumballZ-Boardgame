// Máy chơi Đảo Chính. Chỉ dùng lá của chính mình + thông tin công khai (xu, lá đã lật, ai xưng gì) – không nhìn lá úp của người khác hay chồng bài.
import { ACTS, alive } from './engine.js?v=2';
const KEEP = { duke: 5, assassin: 4, captain: 3, contessa: 2, ambassador: 1 }; /* lá nào đáng giữ hơn */
const mine = p => p.cards.filter(c => !c.dead).map(c => c.r);
/* đếm số lá vai r mình biết chắc không nằm trong tay người khác: lá đã lật của cả bàn + lá của mình */
const known = (s, me, r) => s.players.reduce((n, p) => n + p.cards.filter(c => (c.dead || p.id === me.id) && c.r === r).length, 0);
const foes = (s, me) => s.players.filter(p => p.id !== me.id && alive(p));
const lives = p => p.cards.filter(c => !c.dead).length;
/* đối thủ đáng đánh nhất: nhiều lá, nhiều xu */
const threat = p => lives(p) * 10 + p.coins;
const pickTarget = (s, me, f = () => true) => foes(s, me).filter(f).sort((a, b) => threat(b) - threat(a))[0];

export function botAction(s, pid, _p, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random;
  const me = s.players.find(p => p.id === pid); if (!me || s.phase === 'ended') return null;
  const lv = s.opts.level || 2, R = mine(me), has = r => R.includes(r);
  const bluff = [0, .08, .2, .25][lv];
  if (s.lose.length) { /* bỏ lá kém nhất (trùng thì bỏ lá trùng) */
    if (s.lose[0].pid !== pid) return null;
    const idx = me.cards.map((c, i) => ({ c, i })).filter(x => !x.c.dead);
    const dup = idx.find(x => idx.some(y => y !== x && y.c.r === x.c.r));
    const worst = dup || idx.sort((a, b) => KEEP[a.c.r] - KEEP[b.c.r])[0];
    return { type: 'lose', i: worst.i };
  }
  if (s.phase === 'exchange') {
    if (!s.ex || s.ex.pid !== pid) return null;
    const order = s.ex.pool.map((r, i) => ({ r, i })).sort((a, b) => KEEP[b.r] - KEEP[a.r]);
    const keep = []; for (const x of order) if (keep.length < s.ex.keep && !keep.some(k => s.ex.pool[k] === x.r)) keep.push(x.i);
    for (const x of order) if (keep.length < s.ex.keep && !keep.includes(x.i)) keep.push(x.i);
    return { type: 'keep', idx: keep };
  }
  if (s.phase === 'action') {
    if (s.players[s.turn].id !== pid) return null;
    const t = pickTarget(s, me);
    if (me.coins >= 10 || (me.coins >= 7 && (lv > 1 || rnd() < .7))) return { type: 'act', act: 'coup', target: t.id };
    const weak = pickTarget(s, me, p => lives(p) === 1) || t;
    const can = r => has(r) || (rnd() < bluff && known(s, me, r) < 2);
    if (me.coins >= 3 && (has('assassin') || (lv > 1 && rnd() < bluff / 2 && known(s, me, 'assassin') < 2))) return { type: 'act', act: 'assassinate', target: weak.id };
    if (can('duke')) return { type: 'act', act: 'tax' };
    const rich = pickTarget(s, me, p => p.coins >= 2);
    if (rich && can('captain')) return { type: 'act', act: 'steal', target: rich.id };
    if (has('ambassador') && R.length === 2 && R[0] === R[1]) return { type: 'act', act: 'exchange' };
    if (has('ambassador') && rnd() < .3) return { type: 'act', act: 'exchange' };
    return { type: 'act', act: known(s, me, 'duke') >= 3 || rnd() < .55 ? 'aid' : 'income' };
  }
  if (s.phase === 'respond') {
    const f = s.flow; if (!f) return null;
    const A = ACTS[f.act], target = f.target === pid;
    const doubt = role => { /* nên nghi lời xưng vai `role` không? */
      const k = known(s, me, role);
      if (k >= 3) return true;
      const stake = target && (f.act === 'assassinate' || f.act === 'steal') ? 2 : 1;
      const base = [0, .05, .08, .1][lv] * stake + (k === 2 ? [0, .15, .35, .45][lv] : 0);
      const b2 = s.opts && s.opts.bonus ? base * 1.4 : base; /* có thưởng nghi đúng thì nghi hăng hơn chút */
      return rnd() < (lives(me) === 2 ? b2 : b2 / 2);
    };
    if (f.step === 'chal') {
      if (target && f.act === 'assassinate' && lives(me) === 1 && !has('contessa') && lv > 1) return { type: known(s, me, 'contessa') >= 2 ? 'challenge' : 'pass' }; /* để bước chặn bịp Nữ bá tước */
      return { type: doubt(A.role) ? 'challenge' : 'pass' };
    }
    if (f.step === 'block') {
      const real = A.block.find(has); if (real) return { type: 'block', role: real };
      if (target && f.act === 'assassinate' && lv > 1 && known(s, me, 'contessa') < 3 && (lives(me) === 1 || rnd() < .3)) return { type: 'block', role: 'contessa' };
      const fake = A.block.filter(r => known(s, me, r) < 2);
      if (fake.length && rnd() < (target ? bluff : bluff / 3)) return { type: 'block', role: fake[Math.floor(rnd() * fake.length)] };
      return { type: 'pass' };
    }
    if (f.step === 'bchal') {
      if (known(s, me, f.brole) >= 3) return { type: 'challenge' };
      const mineAct = f.by === pid, k = known(s, me, f.brole);
      const p = (mineAct ? [0, .1, .15, .2][lv] : [0, .03, .05, .05][lv]) + (k === 2 ? .3 : 0);
      return { type: rnd() < (lives(me) === 2 || mineAct ? p : p / 2) ? 'challenge' : 'pass' };
    }
  }
  return null;
}
