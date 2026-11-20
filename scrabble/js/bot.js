// 🤖 Bot Scrabble — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Bot chỉ dùng viewFor (bàn cờ + khay của mình) — không nhìn state thô.
// Máy Dễ: 70% chọn bừa trong top 10 nước tốt nhất, 30% chơi nước tốt nhất.
// Máy Khó: tham lam — chọn nước có điểm cao nhất, cộng thêm điểm "giữ khay"
// (khay còn lại có cả nguyên âm lẫn phụ âm thì dễ đi tiếp).
// Hết nước đặt: đổi chữ nếu túi còn ≥ 7 chữ, không thì bỏ lượt.
import { viewFor, legalMoves, TILE_VALUE } from './engine.js?v=1';

const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

/* điểm giữ khay: sau nước đi, khay còn lại có cả nguyên âm + phụ âm thì +3,
   không còn nguyên âm nào thì −5 (khó nối từ sau). Ô trống giữ lại +2. */
function leaveScore(view, pid, act) {
  const me = view.players.find(p => p.id === pid);
  if (!me || !me.rack) return 0;
  const usedIdx = new Set((act.usedIdx || []).map(Number));
  const rest = me.rack.filter((_, i) => !usedIdx.has(i));
  let s = 0;
  if (rest.includes('*')) s += 2;
  const hasV = rest.some(c => VOWELS.has(c));
  const hasC = rest.some(c => !VOWELS.has(c) && c !== '*');
  if (hasV && hasC) s += 3;
  else if (!hasV && rest.length) s -= 5;
  return s;
}

export function botAction(s, pid, level) {
  if (!s || s.phase !== 'playing') return null;
  /* QUAN TRỌNG: bot chỉ nhìn view của chính mình — không đọc state thô */
  const v = viewFor(s, pid);
  const me = v.players.find(p => p.id === pid);
  if (!me || v.turn !== pid) return null;
  const hard = (typeof level === 'string' ? level : level && level.level) === 'hard';
  const moves = legalMoves(v, pid);
  if (moves.length) {
    /* ---------- Máy Dễ: 70% bừa trong top 10, 30% nước tốt nhất ---------- */
    if (!hard && Math.random() < 0.7) return pick(moves.slice(0, 10));
    /* ---------- Máy Khó (và 30% của máy Dễ): điểm cao nhất + giữ khay ---------- */
    let best = null, bestScore = -Infinity;
    for (const m of moves.slice(0, 40)) {
      const sc = m.score + leaveScore(v, pid, m) + (m.bingo ? 5 : 0);
      if (sc > bestScore || (sc === bestScore && Math.random() < 0.5)) {
        bestScore = sc; best = m;
      }
    }
    return best;
  }
  /* hết nước đặt: đổi chữ nếu túi còn đủ, không thì bỏ lượt */
  const rack = me.rack || [];
  if (v.bagCount >= 7 && rack.length) {
    /* đổi các chữ khó xài nhất (điểm cao, trùng phụ âm) — luôn giữ lại
       ít nhất 1 nguyên âm nếu khay đang có */
    const vowelCount = rack.filter(c => VOWELS.has(c)).length;
    const order = rack
      .map((ch, i) => ({ ch, i, v: ch === '*' ? 99 : TILE_VALUE[ch] }))
      .sort((a, b) => b.v - a.v);
    const tiles = [];
    let vowelsKept = vowelCount;
    for (const t of order) {
      if (tiles.length >= Math.min(7, rack.length)) break;
      if (t.ch === '*') continue; /* không bao giờ đổi ô trống */
      if (VOWELS.has(t.ch) && vowelsKept <= 1) continue; /* giữ 1 nguyên âm */
      if (VOWELS.has(t.ch)) vowelsKept--;
      tiles.push(t.i);
    }
    if (tiles.length) return { type: 'exchange', tiles: tiles.slice(0, 7) };
  }
  return { type: 'pass' };
}

export default { botAction };
