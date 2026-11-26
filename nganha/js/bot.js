// 🌌 Săn Thú Ngân Hà – máy chơi. Chỉ dùng bài của chính nó + thông tin công khai (quái trong hang, xúc xắc trên bàn, quái người khác đã thu).
import { EL_KEYS, MONS, BEASTS, CHARS } from './cards.js?v=1';
import * as E from './engine.js?v=1';

/* xác suất d6 + x ≥ d6 + y */
const pWin = (x, y) => { let w = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + x >= b + y) w++; return w / 36; };
const fx = p => CHARS[p.ch].fx;
const has = (p, k) => p.hand.filter(c => c.k === k).length;

export function botAction(s, id) {
  const p = s.players.find(q => q.id === id); if (!p) return null;
  if (s.pend) return fightMove(s, p);
  if (s.players[s.cur].id !== id) return null;
  const card = k => p.hand.find(c => c.k === k && E.canPlay(s, p, c));
  /* bảo bối dùng ngay trong lượt */
  if (p.chk < 3 && card('tui')) return { type: 'card', cid: card('tui').id };
  if (p.hand.length <= 4 && card('sach')) return { type: 'card', cid: card('sach').id };
  const kiemX = Math.min(2, has(p, 'kiem')) * 2 + (has(p, 'khien') ? 1 : 0);
  /* siêu thú */
  const noBeast = !EL_KEYS.some(e => s.beasts[e]);
  if (!s.tf.beast) for (const el of EL_KEYS) {
    if (s.beasts[el]) continue; const ids = E.bestSet(p, el); if (!ids) continue;
    const pb = ids.reduce((n, mid) => n + MONS[p.mons.find(m => m.id === mid).k].pw, 0) + (fx(p) === 'beast2' ? 2 : 0) + p.boost + kiemX;
    const pr = pWin(pb, BEASTS[el].pw + (E.evOn(s, 'tron') ? 1 : 0));
    if (pr >= .4 || (noBeast && s.day >= 6 && pr >= .15) || s.day === E.DAYS) return { type: 'beast', el, ids };
  }
  /* hang */
  if (!s.tf.cave) {
    let best = null, bv = 0;
    s.caves.forEach((c, i) => {
      if (!c.m) return; const cost = E.caveCost(s, i); if (p.chk < cost) return;
      const M = MONS[c.m.k], mb = M.pw + (E.evOn(s, 'nhat') ? 1 : 0);
      const pb = p.boost + kiemX + (fx(p) === 'cave3' && c.cost === 3 ? 1 : 0) + (fx(p) === 'cave1' && c.cost <= 2 ? 1 : 0) + (fx(p) === 'freeRef' && M.el === 'dat' ? 1 : 0);
      const pr = pWin(pb, mb), want = s.beasts[M.el] ? 0 : p.mons.filter(m => MONS[m.k].el === M.el).length >= 1 ? 2 : 0.8;
      const gain = c.cost + (M.pw >= 2 ? 1 : 0) + (E.evOn(s, 'sao') ? 1 : 0) + 0.8 + want;
      const v = pr * gain - cost * (s.day >= E.DAYS - 1 ? 0.2 : 0.55);
      if (v > bv) { bv = v; best = i; }
    });
    if (best != null && bv > 0.4) return { type: 'enter', cave: best };
    if (!s.tf.ref && p.chk >= E.refreshCost(s, p) + 2 && (E.refreshCost(s, p) === 0 || Math.random() < .5)) return { type: 'refresh' };
    if (best != null && bv > 0) return { type: 'enter', cave: best };
  }
  return { type: 'end' };
}
function fightMove(s, p) {
  const pd = s.pend, A = E.total(pd, 'a'), B = E.total(pd, 'b'), mine = pd.by === p.id;
  const card = k => p.hand.find(c => c.k === k && E.canPlay(s, p, c));
  const pick = c => (c ? { type: 'card', cid: c.id } : null);
  if (mine) {
    const d = B - A; if (d <= 0) return { type: 'pass' };
    const cut = [...pd.mods].reverse().find(m => m.by !== p.id && m.v && !m.x);
    if (cut && cut.v < 0 && -cut.v >= d && card('gay')) return pick(card('gay'));
    if (d <= 1 && card('khien')) return pick(card('khien'));
    if (d <= 2 && card('kiem')) return pick(card('kiem'));
    if (E.canReroll(s, p) && pd.a <= 3) return { type: 'reroll' };
    if (pd.b >= 4 && card('bom')) return pick(card('bom'));
    if (pd.a <= 3 && card('giay')) return pick(card('giay'));
    if (card('kiem')) return pick(card('kiem'));
    return { type: 'pass' };
  }
  const by = s.players.find(q => q.id === pd.by), margin = A - B;
  const threat = pd.what === 'beast' || by.pts + 2 >= p.pts;
  if (margin < 0 || !threat) return { type: 'pass' };
  /* phá vừa phải: không phải trận nào cũng phá */
  const roll = (s.seq * 7 + p.id.length * 13 + pd.a) % 10;
  if (pd.what === 'cave' && roll >= 6) return { type: 'pass' };
  const hit = fx(p) === 'sting' ? 3 : 2;
  if (margin < hit && card('gio')) return pick(card('gio'));
  const last = [...pd.mods].reverse().find(m => m.by !== p.id && m.v && !m.x); /* Gậy luôn huỷ lá cộng/trừ gần nhất của người khác */
  if (last && last.v > 0 && margin < last.v && card('gay')) return pick(card('gay'));
  if (pd.a >= 5 && card('bom')) return pick(card('bom'));
  return { type: 'pass' };
}
