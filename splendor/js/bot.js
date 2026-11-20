// 💎 Bot Splendor — chỉ dùng viewFor (không bao giờ đọc state thô).
// - Dễ: 70% nước bừa, 30% nước tốt.
// - Khó: chấm điểm mọi nước hợp lệ theo view — mua thẻ lấy điểm + giảm
//   giá + đón quý tộc, lấy đá hướng tới thẻ mục tiêu (thẻ đã giữ + thẻ
//   trên bàn sắp mua được), giữ thẻ giá trị cao / chặn đối thủ, giữ vàng
//   (vàng quý nên chỉ xài khi đáng), và tăng trọng số điểm khi ván sắp
//   hết (có người ≥ 12 điểm). Bot không biết thứ tự chồng bài (chỉ biết
//   số thẻ còn) và không biết thẻ úp nào sẽ lên bàn.
import {
  viewFor, legalMovesFromView, cardById, nobleById,
  paymentFor, bonusCounts, prestige, tokenCount,
  COLORS, GOLD, MAX_TOKENS,
} from './engine.js';

export function botAction(s, pid, level) {
  if (!s || s.phase !== 'playing') return null;
  /* QUAN TRỌNG: bot chỉ nhìn view của chính mình — không đọc state thô */
  const v = viewFor(s, pid);
  const moves = legalMovesFromView(v, pid);
  if (!moves.length) return null;
  const hard = (typeof level === 'string' ? level : level && level.level) === 'hard';
  /* Máy Dễ: 70% đánh bừa */
  if (!hard && Math.random() < 0.7) return moves[Math.floor(Math.random() * moves.length)];
  /* Máy Khó (và 30% của máy Dễ): nước tốt nhất theo view */
  return goodMove(v, moves);
}

/* số đá còn thiếu để mua 1 thẻ (sau giảm giá, trừ đá đang cầm) */
function remainingNeed(me, card) {
  const bonuses = bonusCounts(me);
  let need = 0;
  const byColor = {};
  for (const c of COLORS) {
    const n = Math.max(0, (card.cost[c] || 0) - (bonuses[c] || 0) - (me.tokens[c] || 0));
    byColor[c] = n;
    need += n;
  }
  return { total: need, byColor };
}
/* thẻ mục tiêu: thẻ đã giữ trước, rồi thẻ trên bàn sắp mua được */
function targetCards(v, me) {
  const out = [];
  for (const id of me.reserved) {
    const c = cardById(id);
    if (c) out.push({ card: c, reserved: true });
  }
  for (const lvl of [1, 2, 3]) for (const id of (v.table[lvl] || [])) {
    const c = cardById(id);
    if (c) out.push({ card: c, reserved: false });
  }
  return out;
}
/* quý tộc trên bàn còn thiếu bao nhiêu thẻ mỗi màu (theo bonus của mình) */
function nobleGaps(v, me) {
  const bonuses = bonusCounts(me);
  return v.nobles.map(nobleById).filter(Boolean).map(n => {
    let gap = 0;
    const gapByColor = {};
    for (const [c, need] of Object.entries(n.req)) {
      const g = Math.max(0, need - (bonuses[c] || 0));
      gapByColor[c] = g;
      gap += g;
    }
    return { noble: n, gap, gapByColor };
  });
}

function scoreMove(v, me, move) {
  const bonuses = bonusCounts(me);
  const targets = targetCards(v, me);
  const gaps = nobleGaps(v, me);
  const myScore = me.score;
  const oppBest = Math.max(0, ...v.players.filter(p => p.id !== me.id).map(p => p.score));
  const endgame = oppBest >= 12 || myScore >= 12;
  const myTokens = tokenCount(me);
  let val = 0;

  if (move.type === 'buy') {
    const card = cardById(move.cardId);
    if (!card) return -999;
    const pay = paymentFor(me, card);
    if (!pay) return -999;
    const spent = Object.values(pay).reduce((a, n) => a + n, 0);
    const goldSpent = pay.gold || 0;
    /* mua thẻ là cách DUY NHẤT để ghi điểm + xây giảm giá vĩnh viễn:
       luôn đáng hơn lấy đá khi mua được */
    val += 2.5 + card.pts * (endgame ? 5 : 3.5);
    /* mua xong mà thắng luôn thì cực kỳ giá trị */
    if (myScore + card.pts >= 15) val += 8;
    /* giảm giá vĩnh viễn: màu nào cũng có ích, màu quý tộc đang thiếu càng ích */
    val += 1.2;
    for (const g of gaps) if ((g.gapByColor[card.bonus] || 0) > 0) val += 0.9;
    /* mua thẻ giúp mua thẻ đã giữ dễ hơn */
    for (const t of targets) {
      if (t.reserved && (t.card.cost[card.bonus] || 0) > 0) val += 0.5;
    }
    /* mua thẻ mà đón được quý tộc ngay */
    for (const g of gaps) {
      if (g.gap === 1 && (g.gapByColor[card.bonus] || 0) === 1) val += 5;
    }
    /* hiệu quả: càng rẻ càng tốt; vàng là tài nguyên quý */
    val -= spent * 0.12;
    val -= goldSpent * 0.4;
    /* mua thẻ cấp cao (điểm nhiều) đáng giữ chỗ trên bàn ít hơn */
    if (card.level === 3) val += 0.4;
    return val;
  }

  if (move.type === 'reserve') {
    const card = move.from === 'table' ? cardById(v.table[move.level][move.slot]) : null;
    /* giữ úp từ chồng: chủ yếu để lấy vàng + hy vọng thẻ ngon */
    if (!card) {
      val += 1.0 + (v.tokens.gold > 0 ? 0.8 : 0);
      if (me.reserved.length === 0) val += 0.3;
      return val;
    }
    const need = remainingNeed(me, card);
    /* đừng giữ thẻ mà còn lâu mới mua nổi — chỉ chiếm chỗ giữ */
    if (need.total > 8) val -= 3;
    else if (need.total > 5) val -= 1;
    val += 1.0 + card.pts * 0.6;
    if (v.tokens.gold > 0) val += 0.7;
    /* giữ thẻ mà mình sắp mua được (thiếu ≤ 3 đá) */
    if (need.total <= 3) val += 1.2;
    /* chặn đối thủ: đối thủ mua được thẻ này mà điểm cao */
    for (const opp of v.players) {
      if (opp.id === me.id) continue;
      if (paymentFor(opp, card) && card.pts >= 2) { val += 2.5; break; }
    }
    /* đừng giữ thẻ rẻ vô dụng khi đang cần đá */
    if (card.level === 1 && card.pts === 0 && need.total > 5) val -= 1.5;
    return val;
  }

  if (move.type === 'take3' || move.type === 'take2') {
    const taken = move.type === 'take3' ? move.colors : [move.color, move.color];
    /* chỉ tính thẻ mục tiêu "sống": thẻ đã giữ, hoặc thẻ trên bàn còn
       thiếu ≤ 5 đá — thẻ đắt xa vời không đáng để dành đá */
    const live = targets.filter(t => {
      const need = remainingNeed(me, t.card);
      return t.reserved || need.total <= 5;
    });
    /* mỗi đá lấy được mà giảm nhu cầu của thẻ mục tiêu thì có giá */
    let useful = 0;
    for (const c of new Set(taken)) {
      for (const t of live) {
        const need = remainingNeed(me, t.card);
        if ((need.byColor[c] || 0) > 0) { useful += t.reserved ? 1.6 : 1.0; break; }
      }
      /* đá giúp đón quý tộc (qua thẻ mục tiêu có màu thưởng đó) */
      for (const t of live) {
        if (t.card.bonus === c) {
          for (const g of gaps) if ((g.gapByColor[c] || 0) > 0) { useful += 0.5; break; }
        }
      }
    }
    val += useful + taken.length * 0.25;
    /* lấy đá mà mua được thẻ ngay lượt sau thì rất tốt */
    for (const t of live) {
      const need = remainingNeed(me, t.card);
      let after = need.total;
      for (const c of taken) if ((need.byColor[c] || 0) > 0) after--;
      if (need.total > 0 && after <= 0) { val += 2.0; break; }
    }
    /* lấy 2 cùng màu chỉ đáng khi màu đó thật sự cần */
    if (move.type === 'take2') {
      const need = live.some(t => (remainingNeed(me, t.card).byColor[move.color] || 0) > 0);
      val += need ? 1.0 : -0.5;
    }
    /* lấy quá 10 đá thì phải trả lại — lãng phí */
    const excess = myTokens + taken.length - MAX_TOKENS;
    if (excess > 0) val -= excess * 1.2;
    return val;
  }

  if (move.type === 'noble') return 3;
  if (move.type === 'discard') return 3;
  if (move.type === 'pass') return 0;
  return 0;
}

function goodMove(v, moves) {
  const me = v.players.find(p => p.id === v.me);
  if (!me) return moves[0];
  let best = null, bestV = -Infinity;
  for (const m of moves) {
    let val = scoreMove(v, me, m);
    val += Math.random() * 0.4;
    if (val > bestV) { bestV = val; best = m; }
  }
  return best || moves[0];
}

export default { botAction };
