// 🤖 Xì Tố — bot (chỉ đọc bài của mình + bài chung + thông tin công khai).
// Easy: ham gọi, ít khi Bỏ, thỉnh thoảng Tố bừa. Hard: theo sức mạnh bài +
// pot odds + vị trí tương đối, Bỏ bài yếu, thỉnh thoảng bluff.
import { best5, blindDueFor, actionInfo } from './engine.js';

const hiRank = r => (r === 1 ? 14 : r);
/* Chen formula (thang 0–20): đôi = max(5, thang quân cao)×2; không đôi = thang
   quân cao − phạt khoảng cách + 2 nếu đồng chất + 1 nếu có khả năng sảnh. */
const chenRank = r => r === 1 ? 10 : r === 13 ? 8 : r === 12 ? 7 : r === 11 ? 6 : r / 2;
function preflopStrength(cards) {
  if (!cards || cards.length !== 2) return 0.3;
  const [a, b] = cards;
  let score;
  if (a.r === b.r) score = Math.max(5, chenRank(a.r)) * 2;
  else {
    const hi = Math.max(hiRank(a.r), hiRank(b.r)), lo = Math.min(hiRank(a.r), hiRank(b.r));
    const gap = hi - lo;
    score = chenRank(hi === 14 ? 1 : hi);
    if (gap === 1) score -= 1; else if (gap === 2) score -= 2; else if (gap === 3) score -= 4; else score -= 5;
    if (a.s === b.s) score += 2;
    if (gap <= 1 && hi < 14) score += 1;
  }
  return Math.max(0, Math.min(1, score / 20));
}
/* sức mạnh sau Flop: hạng tay + thưởng bài chờ (thùng chờ / sảnh chờ). */
function postflopStrength(cards, community) {
  const all = [...cards, ...community];
  const ev = best5(all);
  const base = { 1: 0.12, 2: 0.35, 3: 0.55, 4: 0.68, 5: 0.76, 6: 0.84, 7: 0.91, 8: 0.96, 9: 0.99 }[ev ? ev.cat : 1] || 0.12;
  let draw = 0;
  const suitN = {};
  for (const c of all) suitN[c.s] = (suitN[c.s] || 0) + 1;
  if (Math.max(...Object.values(suitN)) === 4) draw += 0.10; /* thùng chờ */
  const rs = [...new Set(all.map(c => hiRank(c.r)))].sort((a, b) => a - b);
  let bestRun = 1, run = 1;
  for (let i = 1; i < rs.length; i++) { run = rs[i] === rs[i - 1] + 1 ? run + 1 : 1; bestRun = Math.max(bestRun, run); }
  if (bestRun >= 4) draw += 0.07; /* sảnh chờ */
  return Math.min(0.99, base + draw);
}
function strengthOf(s, p) {
  return s.street === 'preflop' ? preflopStrength(p.cards) : postflopStrength(p.cards, s.community);
}
export function chooseAction(s, pid, level = 'easy') {
  const p = s.players.find(x => x.id === pid);
  if (!p || s.phase === 'ended' || p.folded || p.allIn) return null;
  if (s.phase === 'blinds') {
    const due = blindDueFor(s, pid);
    return { type: 'blind', amount: Math.min(due, p.stack) };
  }
  if (s.phase !== 'bet' || s.turn !== pid) return null;
  const info = actionInfo(s, pid);
  if (!info) return null;
  const pot = s.players.reduce((n, q) => n + q.put, 0);
  const strength = strengthOf(s, p);
  const toCall = info.toCall;
  const r = Math.random;
  const raiseTo = amt => {
    const t = Math.min(Math.max(amt, info.minRaiseTo), info.maxRaiseTo);
    return t >= info.maxRaiseTo ? { type: 'allin' } : { type: 'to', amount: t };
  };
  const callOrFold = () => {
    if (toCall === 0) return { type: 'xem' };
    if (toCall >= p.stack) return strength > 0.7 ? { type: 'allin' } : { type: 'bo' };
    return { type: 'theo' };
  };
  if (level === 'hard') {
    const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;
    if (toCall === 0) {
      if (strength > 0.8) return raiseTo(s.toCall + 20);
      if (strength > 0.5 && r() < 0.25) return raiseTo(s.toCall + 10);
      if (r() < 0.08) return raiseTo(s.toCall + 10); /* bluff nhỏ */
      return { type: 'xem' };
    }
    if (strength > 0.85) return raiseTo(s.toCall + 20);
    if (strength > potOdds + 0.15) return callOrFold();
    if (strength > potOdds && r() < 0.5) return callOrFold();
    if (r() < 0.07) return raiseTo(s.toCall + 10); /* bluff hiếm */
    return { type: 'bo' };
  }
  /* Easy: ham gọi, ít khi Bỏ */
  if (toCall === 0) {
    if (strength > 0.5 && r() < 0.3) return raiseTo(s.toCall + 10);
    if (r() < 0.1) return raiseTo(s.toCall + 10);
    return { type: 'xem' };
  }
  if (strength > 0.6) {
    if (strength > 0.75 && r() < 0.3) return raiseTo(s.toCall + 10);
    return callOrFold();
  }
  if (strength > 0.35) return r() < 0.7 ? callOrFold() : { type: 'bo' };
  return r() < 0.2 ? callOrFold() : { type: 'bo' };
}
/* Adapter cho simplenet: cfg.bot(s, pid, player) → hành động của bot đó. */
export function botAction(s, pid, p) { return chooseAction(s, pid, (p && p.level) || 'hard'); }
