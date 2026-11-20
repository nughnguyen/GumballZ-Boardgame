// 🎆 Bot Hanabi — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Bot CHỈ dùng thông tin từ viewFor của chính mình — tức là bài của người
// khác (thấy hết) + gợi ý mình đã nhận (marks trên tay mình) + chồng,
// token, ngòi, đống bỏ. Bot không bao giờ đọc state thô, không nhìn bài
// của chính mình. (legalMoves chỉ cho danh sách nước đi hợp lệ — vị trí
// lá và gợi ý có thể có — không tiết lộ lá nào là lá nào.)
// Máy Dễ: 70% đánh bừa, 30% đánh nước tốt. Máy Khó: đánh lá chắc chắn
// đánh được → gợi ý lá đánh được cho người khác (ưu tiên gợi ý chính xác,
// giữ lá 5) → bỏ lá chết đã biết / lá chưa được gợi ý (cũ nhất) → gợi ý
// lá sắp đánh được.
import { viewFor, legalMoves, SUITS } from './engine.js?v=1';

const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];

/* lá trên tay mình có "chắc chắn đánh được" không — chỉ từ gợi ý đã nhận:
   biết cả số lẫn màu và đúng số tiếp theo của chồng đó; hoặc biết số và
   số đó là số tiếp theo của MỌI màu (VD: biết là 1 khi mọi chồng còn 0) */
function knownPlayable(v, me, i) {
  const card = me.hand[i];
  const rank = card.rank, suit = card.suit;
  if (rank != null && suit != null) return v.stacks[suit] === rank - 1;
  if (rank != null && suit == null) return SUITS.every(su => v.stacks[su] === rank - 1);
  return false;
}
/* lá đã biết là "chết" (số <= số đã có trên chồng màu đó) */
function knownDead(v, me, i) {
  const card = me.hand[i];
  if (card.rank != null && card.suit != null) return v.stacks[card.suit] >= card.rank;
  return false;
}
/* người q đã biết lá j của mình đánh được chưa (đủ cả số lẫn màu) */
function targetKnowsPlayable(v, q, j) {
  const card = q.hand[j];
  if (!card || card.rank == null || card.suit == null) return false;
  return v.stacks[card.suit] === card.rank - 1;
}

/* tìm 1 gợi ý hữu ích: ưu tiên gợi ý lá đánh được ngay, rồi giữ lá 5,
   rồi gợi ý lá sắp đánh được (cần thêm 1 lá nữa của màu đó).
   QUAN TRỌNG: muốn người nhận đánh được lá đó thì họ phải biết CẢ số
   lẫn màu — nên nếu họ đã biết 1 trong 2 thì gợi ý nốt cái còn lại
   (hoàn thiện lá đó); chưa biết gì thì gợi ý số trước. */
function findUsefulClue(v) {
  const myIdx = v.players.findIndex(p => p.id === v.me);
  const n = v.players.length;
  /* duyệt người khác theo thứ tự ghế sau mình (họ đi sớm nhất) */
  const order = [];
  for (let k = 1; k < n; k++) order.push(v.players[(myIdx + k) % n]);
  /* 1. gợi ý 1 lá đánh được ngay mà người đó chưa đánh được */
  let best = null, bestScore = -1;
  for (const q of order) {
    for (let j = 0; j < q.hand.length; j++) {
      const card = q.hand[j];
      if (!card || !card.id) continue;
      const rank = +card.id[1], suit = card.id[0];
      if (v.stacks[suit] !== rank - 1) continue;
      if (targetKnowsPlayable(v, q, j)) continue;
      /* đã biết số thì gợi ý nốt màu (hoàn thiện), đã biết màu thì gợi
         ý nốt số; chưa biết gì thì gợi ý số trước */
      const kinds = [];
      if (card.rank != null && card.suit == null) kinds.push(['suit', suit]);
      else if (card.suit != null && card.rank == null) kinds.push(['rank', rank]);
      else kinds.push(['rank', rank], ['suit', suit]);
      for (const [kind, value] of kinds) {
        const matches = q.hand.filter(c => c.id && (kind === 'rank' ? +c.id[1] === value : c.id[0] === value)).length;
        /* hoàn thiện 1 lá (chỉ còn thiếu 1 thông tin) thì ưu tiên cao */
        const completes = (card.rank != null) !== (card.suit != null) ? 50 : 0;
        const score = completes + 100 - matches * 10;
        if (score > bestScore) { bestScore = score; best = { type: 'clue', target: q.id, kind, value }; }
      }
    }
  }
  if (best) return best;
  /* 2. giữ lá 5 chưa được gợi ý (lá 5 chỉ có 1 bản — bỏ là mất vĩnh viễn) */
  for (const q of order) {
    for (let j = 0; j < q.hand.length; j++) {
      const card = q.hand[j];
      if (!card || !card.id) continue;
      if (+card.id[1] !== 5) continue;
      if (card.rank === 5) continue;
      return { type: 'clue', target: q.id, kind: 'rank', value: 5 };
    }
  }
  /* 3. gợi ý lá sắp đánh được (cần thêm đúng 1 lá nữa của màu đó) */
  for (const q of order) {
    for (let j = 0; j < q.hand.length; j++) {
      const card = q.hand[j];
      if (!card || !card.id) continue;
      const rank = +card.id[1], suit = card.id[0];
      if (v.stacks[suit] !== rank - 2) continue;
      if (card.rank != null && card.suit != null) continue;
      return { type: 'clue', target: q.id, kind: 'rank', value: rank };
    }
  }
  return null;
}

function bestMove(v, moves) {
  const me = v.players.find(p => p.id === v.me);
  const myHand = me.hand;
  /* 1. đánh lá chắc chắn đánh được (lá trái nhất) */
  for (let i = 0; i < myHand.length; i++) {
    if (knownPlayable(v, me, i)) return { type: 'play', index: i };
  }
  /* 2. gợi ý hữu ích (nếu còn token) */
  if (v.clues > 0) {
    const clue = findUsefulClue(v);
    if (clue) return clue;
  }
  /* 3. bỏ lá: lá chết đã biết → lá chưa được gợi ý (cũ nhất) →
     lá đã gợi ý nhưng không đánh được và không phải 5 */
  const discards = moves.filter(m => m.type === 'discard');
  if (discards.length) {
    for (let i = 0; i < myHand.length; i++) {
      if (knownDead(v, me, i)) return { type: 'discard', index: i };
    }
    for (let i = 0; i < myHand.length; i++) {
      const c = myHand[i];
      if (c.rank == null && c.suit == null) return { type: 'discard', index: i };
    }
    for (let i = 0; i < myHand.length; i++) {
      const c = myHand[i];
      if (c.rank === 5) continue;
      if (!knownPlayable(v, me, i)) return { type: 'discard', index: i };
    }
    return discards[0];
  }
  /* 4. đang đủ 8 token nên không bỏ được mà cũng không có nước tốt:
     gợi ý bất kỳ (token còn thì cứ gợi ý) */
  const clues = moves.filter(m => m.type === 'clue');
  if (clues.length) return clues[0];
  /* 5. đường cùng: đánh lá ít rủi ro nhất (lá chưa biết gì, cũ nhất) */
  const plays = moves.filter(m => m.type === 'play');
  if (plays.length) return plays[0];
  return moves[0];
}

export function botAction(s, pid, level) {
  if (!s || s.phase !== 'playing') return null;
  /* QUAN TRỌNG: bot chỉ nhìn view của chính mình — không đọc state thô */
  const v = viewFor(s, pid);
  const moves = legalMoves(s, pid);
  if (!moves.length) return null;
  const hard = (typeof level === 'string' ? level : level && level.level) === 'hard';
  /* Máy Dễ: 70% đánh bừa */
  if (!hard && Math.random() < 0.7) return pick(moves);
  /* Máy Khó (và 30% của máy Dễ): nước tốt nhất theo view */
  return bestMove(v, moves);
}
