// 🀄 Bot Tổ Tôm — chỉ dùng viewFor (không bao giờ đọc state thô).
// - Dễ: 70% nước bừa, 30% nước tốt.
// - Khó: chíu khi được rao; ăn khi ghép phu có lợi (đo bằng què còn lại);
//   bốc khi không ăn được; bỏ lá thừa nhất (ít què nhất, ưu tiên bỏ lá
//   đen trước để giữ lá đỏ làm thập điều).
import {
  viewFor, legalMoves, eatPairs, greedyCover, isPhu, typeOf, isRedType,
} from './engine.js';

export function botAction(s, pid, level = 'easy') {
  const v = viewFor(s, pid);
  const moves = legalMoves(s, pid);
  if (!moves.length) return null;
  if (level === 'easy' && Math.random() < 0.7) {
    return moves[Math.floor(Math.random() * moves.length)];
  }
  return goodMove(v, moves);
}

function goodMove(v, moves) {
  const me = v.players.find(p => p.id === v.me);
  const hand = me.hand || [];
  const melds = me.melds || [];
  const queOf = cards => greedyCover(cards).que.length;
  const baseQue = queOf(hand);
  const basePhu = greedyCover(hand).phu.length;

  /* chíu: luôn chíu (1 phu miễn phí, lại được đánh tiếp) */
  const chiu = moves.find(m => m.type === 'chiu');
  if (chiu) return chiu;

  /* đánh bài: bỏ lá thừa nhất — ít què nhất, ưu tiên lá đen */
  if (v.step === 'discard') {
    const discards = moves.filter(m => m.type === 'discard');
    let best = discards[0], bestScore = -Infinity;
    for (const m of discards) {
      const rest = hand.filter(c => c !== m.card);
      const score = -queOf(rest) * 10 + (isRedType(typeOf(m.card)) ? 0 : 2);
      if (score > bestScore) { bestScore = score; best = m; }
    }
    return best;
  }

  /* ăn lá ở cửa / lá vừa bốc: ăn khi ghép phu có lợi — ăn là cách chính
     để giảm què (2 lá rời tay vào phu) và giữ nọc; bỏ qua khi ăn phá
     phu sẵn có mà không bù lại được (điểm < 0) */
  const eats = moves.filter(m => m.type === 'eat-gate' || m.type === 'eat-drawn');
  for (const m of eats) {
    const rest = hand.filter(c => !m.with.includes(c));
    const cover = greedyCover(rest);
    /* lợi = +1 phu đã ăn, cộng phu trong tay sau khi ăn, trừ què tăng */
    const score = 10 + (cover.phu.length - basePhu) * 10 - (cover.que.length - baseQue) * 3;
    if (score >= 0) return m;
  }

  /* bốc / bỏ qua lá vừa bốc */
  const draw = moves.find(m => m.type === 'draw');
  if (draw) return draw;
  const leave = moves.find(m => m.type === 'leave');
  if (leave) return leave;
  const pass = moves.find(m => m.type === 'chiu-pass');
  if (pass) return pass;
  return moves[0];
}

export default { botAction };
