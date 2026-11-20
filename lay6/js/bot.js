// 🤖 Bot Lấy 6 — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Bot chỉ dùng thông tin công khai (4 dãy trên bàn, tay bài của mình) —
// không nhìn tay bài người khác.
// Máy Dễ: 70% đánh bừa, 30% đánh nước tốt. Máy Khó: heuristic — đánh lá
// rơi vào dãy an toàn (khe nhỏ, dãy còn chỗ), tránh lá nhỏ hơn mọi dãy
// (bắt buộc lấy dãy) và tránh lá là lá thứ 6 (lấy cả dãy); khi bắt buộc
// lấy dãy thì lấy dãy ít đầu bò nhất.
import { bullheads, legalCards, legalRows } from './engine.js?v=1';

const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];

/* tổng đầu bò của 1 dãy */
function rowHeads(s, i) {
  return s.rows[i].reduce((t, c) => t + bullheads(c), 0);
}
/* dãy mà lá card sẽ rơi vào (-1 = nhỏ hơn mọi lá cuối -> bắt buộc lấy dãy) */
function targetRow(s, card) {
  const v = +card;
  let best = -1, bestLast = -1;
  s.rows.forEach((r, i) => {
    const last = +r[r.length - 1];
    if (last < v && last > bestLast) { bestLast = last; best = i; }
  });
  return best;
}
/* điểm của 1 lá: càng cao càng nên đánh */
function evalCard(s, card) {
  const row = targetRow(s, card);
  if (row < 0) {
    /* bắt buộc lấy dãy: càng ít đầu bò phải lấy càng đỡ tệ */
    const minHeads = Math.min(...[0, 1, 2, 3].map(i => rowHeads(s, i)));
    return -100 - minHeads;
  }
  const r = s.rows[row];
  if (r.length >= 5) return -50 - rowHeads(s, row); /* lá thứ 6 -> lấy cả dãy */
  const gap = +card - +r[r.length - 1];
  /* khe càng nhỏ càng an toàn (ít khả năng có lá chen giữa làm mình rơi
     sang dãy khác hoặc thành lá thứ 6); dãy càng ít lá càng còn chỗ */
  return 20 - gap - r.length * 2;
}

export function botAction(s, pid, level) {
  if (!s || s.phase !== 'playing') return null;
  const me = s.players.find(p => p.id === pid);
  if (!me) return null;
  const hard = (typeof level === 'string' ? level : level && level.level) === 'hard';

  /* ---------- đang phải chọn dãy để lấy ---------- */
  if (s.stage === 'take' && s.pendingTake && s.pendingTake.pid === pid) {
    const rows = legalRows(s, pid);
    if (!rows.length) return null;
    if (!hard && Math.random() < 0.7) return { type: 'take', row: pick(rows) };
    /* dãy ít đầu bò nhất (hòa thì ít lá hơn) */
    const best = rows.slice().sort((a, b) => rowHeads(s, a) - rowHeads(s, b) || s.rows[a].length - s.rows[b].length)[0];
    return { type: 'take', row: best };
  }

  /* ---------- lượt chọn lá ---------- */
  if (s.stage !== 'pick' || s.picks[pid]) return null;
  const hand = legalCards(s, pid);
  if (!hand.length) return null;
  /* Máy Dễ: 70% đánh bừa */
  if (!hard && Math.random() < 0.7) return { type: 'pick', card: pick(hand) };
  /* Máy Khó (và 30% của máy Dễ): lá an toàn nhất */
  const scored = hand.map(c => ({ card: c, v: evalCard(s, c) })).sort((a, b) => b.v - a.v);
  return { type: 'pick', card: scored[0].card };
}
