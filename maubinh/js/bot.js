// 🤖 Bot Mậu Binh.
// Máy Khó: duyệt mọi cách chia 13 lá thành 3 chi (3/5/5), chọn cách có tổng
// xác suất thắng từng chi cao nhất và không binh lủng — gần như không bao giờ
// lủng. Máy Dễ: xếp tham lam theo số (yếu lên Đầu, mạnh xuống Cuối), 30%
// xáo ngẫu nhiên nên thỉnh thoảng binh lủng.
// Không bao giờ trả nước không hợp lệ và không bao giờ trả null khi đang xếp.
import { eval5, eval3, compareEval, evaluateRows } from './engine.js';

/* xác suất thắng ước lượng của 1 chi trước 1 chi ngẫu nhiên cùng cỡ */
const VALUE5 = { 1: 0.12, 2: 0.28, 3: 0.42, 4: 0.52, 5: 0.64, 6: 0.74, 7: 0.89, 8: 0.97, 9: 0.995 };
const VALUE3 = { 1: 0.40, 2: 0.85, 4: 0.97 };
const tbNorm = ev => (ev.tb && ev.tb.length ? ev.tb[0] / 14 : 0);
export const value5 = ev => (VALUE5[ev.cat] || 0) + tbNorm(ev) * 0.02;
export const value3 = ev => (VALUE3[ev.cat] || 0) + tbNorm(ev) * 0.02;

/* mọi tập con k phần tử của mảng idx (chỉ số), trả mảng các mảng chỉ số */
function subsets(idx, k) {
  const out = [];
  const rec = (start, cur) => {
    if (cur.length === k) { out.push([...cur]); return; }
    for (let i = start; i <= idx.length - (k - cur.length); i++) { cur.push(idx[i]); rec(i + 1, cur); cur.pop(); }
  };
  rec(0, []);
  return out;
}
/* Cách xếp tốt nhất cho 13 lá: {top:[3 lá], mid:[5 lá], bot:[5 lá]}.
   Duyệt mọi cách chia (1287 cách chọn Cuối × 56 cách chọn Giữa), đánh giá
   5 lá/3 lá có cache theo mặt nạ bit — ~10ms/lần gọi. */
export function bestArrangement(cards) {
  const n = cards.length;
  const ev5Cache = new Map(), ev3Cache = new Map();
  const maskOf = idxs => idxs.reduce((m, i) => m | (1 << i), 0);
  const ev5 = idxs => { const k = maskOf(idxs); let e = ev5Cache.get(k); if (!e) { e = eval5(idxs.map(i => cards[i])); ev5Cache.set(k, e); } return e; };
  const ev3 = idxs => { const k = maskOf(idxs); let e = ev3Cache.get(k); if (!e) { e = eval3(idxs.map(i => cards[i])); ev3Cache.set(k, e); } return e; };
  const all = []; for (let i = 0; i < n; i++) all.push(i);
  let best = null, bestScore = -1;
  for (const botIdx of subsets(all, 5)) {
    const botSet = new Set(botIdx);
    const rest = all.filter(i => !botSet.has(i));
    const botEv = ev5(botIdx), botVal = value5(botEv);
    for (const midIdx of subsets(rest, 5)) {
      const midSet = new Set(midIdx);
      const topIdx = rest.filter(i => !midSet.has(i));
      const midEv = ev5(midIdx), topEv = ev3(topIdx);
      if (compareEval(topEv, midEv) > 0 || compareEval(midEv, botEv) > 0) continue; /* binh lủng */
      const score = botVal + value5(midEv) + value3(topEv);
      if (score > bestScore) {
        bestScore = score;
        best = { top: topIdx.map(i => cards[i]), mid: midIdx.map(i => cards[i]), bot: botIdx.map(i => cards[i]) };
      }
    }
  }
  if (best) return best;
  /* dự phòng (lý thuyết: luôn có cách xếp hợp lệ): yếu lên Đầu, mạnh xuống Cuối */
  const sorted = [...cards].sort((a, b) => (a.r === 1 ? 14 : a.r) - (b.r === 1 ? 14 : b.r));
  return { top: sorted.slice(0, 3), mid: sorted.slice(3, 8), bot: sorted.slice(8, 13) };
}
export function arrangeCards(cards, level = 'easy') {
  if (level === 'hard') return bestArrangement(cards);
  /* Máy Dễ: 30% xáo ngẫu nhiên rồi chia — hay binh lủng; 70% xáo tới khi
     hợp lệ (bài yếu, không tối ưu) — thỉnh thoảng lủng, thường thì yếu. */
  const shuffled = () => {
    const sh = [...cards];
    for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
    return { top: sh.slice(0, 3), mid: sh.slice(3, 8), bot: sh.slice(8, 13) };
  };
  if (Math.random() < 0.3) return shuffled();
  for (let t = 0; t < 30; t++) {
    const rows = shuffled();
    if (!evaluateRows(rows).foul) return rows;
  }
  return bestArrangement(cards);
}
export function chooseAction(s, pid, level = 'easy') {
  if (!s || s.phase !== 'arrange') return null;
  const p = s.players.find(x => x.id === pid);
  if (!p || p.arranged) return null;
  if (p.special) return { type: 'special' }; /* bài đặc biệt: nhận luôn, khỏi xếp */
  const rows = arrangeCards(p.cards, level);
  return { type: 'arrange', rows: { top: rows.top.map(c => c.id), mid: rows.mid.map(c => c.id), bot: rows.bot.map(c => c.id) } };
}
/* Adapter cho phòng online (simplenet cfg.bot). */
export function botAction(s, pid, p) {
  if (!s || s.phase !== 'arrange') return null;
  return chooseAction(s, pid, (p && p.level) || 'hard');
}
export default { chooseAction, botAction, bestArrangement, arrangeCards, value5, value3 };
