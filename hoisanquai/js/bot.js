// 🤖 Máy cho Hội Săn Quái – chỉ dùng bài trên tay mình + những gì trên bàn ai cũng thấy (đội, quái, chồng bỏ, số lá trên tay người khác).
// Nhận được cả state (lớp mạng đưa) lẫn view: không đọc tay bài / chồng rút của người khác.
import { HEROES, ITEMS, MAGIC, MODS, MONSTERS, LEADERS, ALL, PICK, CLS_KEYS } from './cards.js?v=1';
import * as E from './engine.js?v=2';

const C = c => ALL[c.k];
/* xác suất 2 xúc xắc ≥ x */
const P2 = x => { let n = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= x) n++; return n / 36; };
const curId = s => (typeof s.cur === 'number' ? s.players[s.cur].id : s.cur);
const prog = p => p.slain.length * 2.2 + E.classesOf(p).size; /* mức sắp thắng của một người */
const EFF_V = { steal: 5, destroy: 4, destroyDraw: 4.5, ret: 3, pullAll: 3, pull2: 2.6, everyGive: 3, draw2: 2, drawAp: 2, trade: 1.2, pull1: 1.4, discAll: 1.2, digHero: 1.8, digAny: 1.4, digMagic: 1.2, digItem: 1, digChal: 1, fetchMagic: 1.3, drawItem: 1.2, drawPlay: 1.6, draw1: 1, ap: 1, ap2: 2, shield: 0.6, atkBuff: 0.4, grabItem: 1, wipeItems: 0.5 };

export function botAction(s, pid) {
  const me = s.players.find(p => p.id === pid); if (!me || s.phase !== 'play') return null;
  const hand = me.hand || [], foes = s.players.filter(p => p.id !== pid), lead = foes.slice().sort((a, b) => prog(b) - prog(a))[0];
  const pd = s.pend;
  const mods = hand.filter(c => C(c).t === 'mod');
  const boost = v => v + Math.sign(v) * E.fxOf(me).filter(x => x === 'mod1').length;
  /* ---- có người chơi lá: Thách không? ---- */
  if (pd && pd.k === 'chal') {
    const ch = hand.find(c => C(c).t === 'chal'); if (!ch || pd.by === pid) return { type: 'pass' };
    const K = ALL[pd.play.card.k], owner = s.players.find(p => p.id === pd.by);
    let want = 0;
    if (pd.play.tgt && pd.play.tgt.pid === pid) want = 0.95; /* phép / vật phẩm xui nhắm vào mình */
    else if (K.t === 'hero') { const newCls = !E.classesOf(owner).has(K.cls); want = (newCls && E.classesOf(owner).size >= 4 ? 0.8 : 0) + (EFF_V[K.eff] || 1) / 10 + (owner === lead ? 0.15 : 0); }
    else if (K.t === 'magic') want = (EFF_V[K.eff] || 1) / 8 + (owner === lead ? 0.15 : 0);
    else if (K.t === 'item') want = K.mask && !E.classesOf(owner).has(K.mask) ? 0.5 : 0.15;
    if (prog(owner) >= 6.5) want += 0.3;
    return Math.random() < want ? { type: 'chal', cid: ch.id } : { type: 'pass' };
  }
  /* ---- có người tung xúc xắc: đánh Cộng / Trừ không? ---- */
  if (pd && pd.k === 'roll') {
    if (!mods.length) return { type: 'pass' };
    const A = E.rollTotal(pd, 'a'), B = pd.two ? E.rollTotal(pd, 'b') : 0;
    const plus = mods.map(c => ({ c, v: boost(Math.max(...MODS[c.k].vals)), raw: Math.max(...MODS[c.k].vals) })).filter(x => x.raw > 0).sort((a, b) => a.v - b.v);
    const minus = mods.map(c => ({ c, v: boost(Math.min(...MODS[c.k].vals)), raw: Math.min(...MODS[c.k].vals) })).filter(x => x.raw < 0).sort((a, b) => b.v - a.v);
    const help = (gap, on) => { const m = plus.find(x => x.v >= gap); return m ? { type: 'mod', cid: m.c.id, v: m.raw, on } : null; };
    const hurt = (gap, on) => { const m = minus.find(x => -x.v >= gap); return m ? { type: 'mod', cid: m.c.id, v: m.raw, on } : null; };
    if (pd.what === 'use') {
      const need = HEROES[pd.ctx.k].roll, val = EFF_V[HEROES[pd.ctx.k].eff] || 1;
      if (pd.by === pid) { if (A < need && val >= 1.4) return help(need - A, 'a') || { type: 'pass' }; return { type: 'pass' }; }
      const roller = s.players.find(p => p.id === pd.by);
      /* chỉ phá tung của người đã gần thắng (prog ≥ 6) – không trừ điểm bừa mọi lần tung */
      if (A >= need && prog(roller) >= 6 && (val >= 3 || roller === lead) && Math.random() < 0.8) return hurt(A - need + 1, 'a') || { type: 'pass' };
      return { type: 'pass' };
    }
    if (pd.what === 'atk') {
      const M = MONSTERS[pd.ctx.k];
      if (pd.by === pid) { if (A < M.win) return help(M.win - A, 'a') || (A <= M.lose ? help(M.lose + 1 - A, 'a') : null) || { type: 'pass' }; return { type: 'pass' }; }
      const roller = s.players.find(p => p.id === pd.by);
      if (A >= M.win && prog(roller) >= 6) return hurt(A - M.win + 1, 'a') || { type: 'pass' };
      return { type: 'pass' };
    }
    if (pd.what === 'chal') {
      if (pd.by === pid && A <= B) return help(B - A + 1, 'a') || hurt(B - A + 1, 'b') || { type: 'pass' };
      if (pd.two === pid && A > B) return help(A - B, 'b') || hurt(A - B, 'a') || { type: 'pass' };
      return { type: 'pass' };
    }
    return { type: 'pass' };
  }
  /* ---- chọn mục tiêu ---- */
  if (pd && pd.k === 'pick') {
    if (pd.by !== pid) return null;
    const o = E.pickOptions(s, pd); if (!o.length) return { type: 'pick' };
    const score = t => {
      if (pd.what === 'hero') { const q = s.players.find(p => p.id === t.pid), h = q.party.find(x => x.id === t.hid), cl = E.heroCls(h); const uniq = q.party.filter(x => E.heroCls(x) === cl).length === 1 && LEADERS[q.leader].cls !== cl; return prog(q) * 2 + (uniq ? 4 : 0) + (EFF_V[HEROES[h.k].eff] || 1) + (pd.eff === 'steal' && !E.classesOf(me).has(cl) ? 5 : 0); }
      if (pd.what === 'own') { const h = me.party.find(x => x.id === t.hid), cl = E.heroCls(h); const dup = me.party.filter(x => E.heroCls(x) === cl).length > 1 || LEADERS[me.leader].cls === cl; return (dup ? 10 : 0) - (EFF_V[HEROES[h.k].eff] || 1); }
      if (pd.what === 'player') { const q = s.players.find(p => p.id === t.pid); return pd.eff === 'trade' ? E.handLen(q) - hand.length : E.handLen(q) + prog(q); }
      if (pd.what === 'item') { const q = s.players.find(p => p.id === t.pid), h = q.party.find(x => x.id === t.hid), I = ITEMS[h.item.k]; return q.id === pid ? (I.curse ? 10 : -5) : (I.curse ? -5 : 4 + prog(q) / 3); }
      const c = s.disc.find(x => x.id === t.cid), K = C(c);
      return K.t === 'hero' ? (E.classesOf(me).has(K.cls) ? 3 : 8) + K.roll / 10 : K.t === 'magic' ? 4 : K.t === 'item' ? 3 : K.t === 'mod' ? 2.5 : 2;
    };
    const best = o.slice().sort((a, b) => score(b) - score(a))[0];
    return { type: 'pick', ...best };
  }
  /* ---- lượt của mình ---- */
  if (pd || curId(s) !== pid) return null;
  const ap = s.ap, fx = E.fxOf(me), bestPlus = Math.max(0, ...mods.map(c => boost(Math.max(...MODS[c.k].vals))));
  /* 1. đánh quái nếu cửa thắng khá */
  if (ap >= 2) {
    let pick = null, pBest = 0;
    for (const m of s.mons) {
      if (!E.canAttack(me, m)) continue; const M = MONSTERS[m.k], b = E.bonusOf(s, me, 'atk');
      const p = P2(M.win - b - bestPlus * 0.7), risk = 1 - P2(M.lose - b + 1);
      const sc = p - risk * (M.pen.startsWith('sac') ? 0.5 : 0.2) + (me.slain.length === 2 ? 0.25 : 0);
      if (sc > pBest) { pBest = sc; pick = m; }
    }
    if (pick && pBest >= 0.42) return { type: 'atk', mid: pick.id };
  }
  const freeHero = fx.includes('heroFree') && !(s.tf && s.tf.hero), freeItem = fx.includes('itemFree');
  /* 2. chơi anh hùng (ưu tiên hệ chưa có) */
  const heroes = hand.filter(c => C(c).t === 'hero').sort((a, b) => (E.classesOf(me).has(C(a).cls) ? 1 : 0) - (E.classesOf(me).has(C(b).cls) ? 1 : 0) || (EFF_V[C(b).eff] || 1) - (EFF_V[C(a).eff] || 1));
  if (heroes.length && (ap >= 1 || freeHero) && (!E.classesOf(me).has(C(heroes[0]).cls) || me.party.length < 5)) return { type: 'play', cid: heroes[0].id };
  /* 3. vật phẩm */
  if (ap >= 1 || freeItem) for (const c of hand.filter(x => C(x).t === 'item')) {
    const I = ITEMS[c.k];
    if (I.curse) { const q = lead; const h = q && q.party.filter(x => !x.item).sort((a, b) => (EFF_V[HEROES[b.k].eff] || 1) - (EFF_V[HEROES[a.k].eff] || 1))[0]; if (h) return { type: 'play', cid: c.id, pid: q.id, hid: h.id }; continue; }
    const free = me.party.filter(x => !x.item); if (!free.length) continue;
    if (I.mask) { if (E.classesOf(me).has(I.mask)) continue; const dup = free.find(h => me.party.filter(x => E.heroCls(x) === E.heroCls(h)).length > 1 || LEADERS[me.leader].cls === E.heroCls(h)); if (dup) return { type: 'play', cid: c.id, pid, hid: dup.id }; continue; }
    const h = free.sort((a, b) => (EFF_V[HEROES[b.k].eff] || 1) - (EFF_V[HEROES[a.k].eff] || 1))[0]; return { type: 'play', cid: c.id, pid, hid: h.id };
  }
  /* 4. phép */
  if (ap >= 1) for (const c of hand.filter(x => C(x).t === 'magic')) {
    const K = MAGIC[c.k];
    if (K.need === 'hero') {
      /* phá đội người khác (huỷ / lấy / trả về) chỉ khi người đó đã gần thắng (prog ≥ 6),
         không phá bừa từ đầu ván – nếu không đội ai cũng không xây nổi */
      let o = E.heroTargets(s, pid, K.eff);
      if (['destroy', 'destroyDraw', 'steal', 'ret'].includes(K.eff)) o = o.filter(t => prog(s.players.find(p => p.id === t.pid)) >= 6);
      if (!o.length) continue;
      const t = o.sort((a, b) => prog(s.players.find(p => p.id === b.pid)) - prog(s.players.find(p => p.id === a.pid)))[0];
      return { type: 'play', cid: c.id, pid: t.pid, hid: t.hid };
    }
    if (K.need === 'player') { const q = foes.filter(p => E.handLen(p)).sort((a, b) => E.handLen(b) - E.handLen(a))[0]; if (!q) continue; return { type: 'play', cid: c.id, pid: q.id }; }
    if (K.eff === 'wipeItems') { const mine = me.party.filter(h => h.item && ITEMS[h.item.k].curse).length, theirs = foes.reduce((n, q) => n + q.party.filter(h => h.item && !ITEMS[h.item.k].curse).length, 0); if (mine + theirs < 2) continue; }
    if (K.eff === 'digHero' && !s.disc.some(x => C(x).t === 'hero')) continue;
    return { type: 'play', cid: c.id };
  }
  /* 5. dùng kỹ năng anh hùng */
  if (ap >= 1) {
    const used = s.used || {}, b = E.bonusOf;
    const cand = me.party.filter(h => !used[h.id] && !(h.item && ITEMS[h.item.k].sleep)).map(h => {
      const H = HEROES[h.k], pk = PICK[H.eff]; let ok = true;
      if (pk === 'hero') {
        const o = E.heroTargets(s, pid, H.eff);
        /* kỹ năng phá đội (huỷ / lấy / trả về) chỉ nhắm người đã gần thắng (prog ≥ 6) */
        if (['destroy', 'destroyDraw', 'steal', 'ret'].includes(H.eff)) ok = o.some(t => prog(s.players.find(p => p.id === t.pid)) >= 6);
        else ok = o.length > 0;
      }
      if (pk === 'player') ok = foes.some(q => E.handLen(q));
      if (pk === 'item') ok = s.players.some(q => q.party.some(x => x.item));
      if (H.eff === 'atkBuff') ok = ap >= 3 && s.mons.some(m => E.canAttack(me, m));
      return { h, sc: ok ? P2(H.roll - b(s, me, 'use', { hid: h.id })) * (EFF_V[H.eff] || 1) : 0 };
    }).filter(x => x.sc > 0.25).sort((a, b) => b.sc - a.sc);
    if (cand.length) return { type: 'use', hid: cand[0].h.id };
  }
  /* 6. rút bài */
  if (ap >= 1 || (fx.includes('freeDraw') && !(s.tf && s.tf.drew))) return { type: 'draw' };
  return { type: 'end' };
}
