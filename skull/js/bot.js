// 🌹 Bot Skull — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Bot chỉ dùng thông tin công khai + đĩa của chính mình — không nhìn tay
// bài hay đĩa đã đặt của người khác. (Đĩa của người khác chỉ biết là úp
// hay đã lật, không biết là hoa hay đầu lâu.)
// Máy Dễ: 70% đánh bừa, 30% đánh nước tốt. Máy Khó: heuristic — đặt đầu
// lâu sớm để dọa giá thấp, không bao giờ thắng giá khi đĩa mình đặt là đầu
// lâu (lật đầu tiên là đĩa mình — trúng ngay), ra giá theo số đĩa chắc
// chắn là hoa + kỳ vọng, lật thảm ít khả năng có đầu lâu nhất (người đã
// mất đầu lâu là an toàn tuyệt đối; tay càng nhiều đĩa thì đĩa úp càng ít
// khả năng là đầu lâu).
import { legalMoves, isSkull, isRose } from './engine.js?v=1';

const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];

/* xác suất đĩa úp của 1 người là đầu lâu: đã mất đầu lâu thì 0; nếu không
   thì 1 / số đĩa trên tay (đĩa họ đặt là 1 trong các đĩa còn trên tay) */
function skullProb(s, p) {
  if (p.lost.some(isSkull)) return 0;
  if (!p.hand.length) return 0;
  return 1 / p.hand.length;
}

function scoreMove(s, pid, mv) {
  const me = s.players.find(p => p.id === pid);
  const stage = s.stage;

  if (mv.type === 'place') {
    /* Đặt đầu lâu sớm: dọa người khác ra giá thấp, và nếu bị ép lật thì
       người thắng giá phải lật đĩa mình trước — nhưng chính mình cũng
       không muốn thắng giá khi đã đặt đầu lâu, nên chỉ dọa khi còn nhiều
       hoa để lật sau. (Trong đấu với máy bừa, đặt đầu lâu mọi vòng rồi bỏ
       giá là chiến lược thắng nhờ loại đối thủ: người lật chịu mọi rủi ro
       mất đĩa, còn mình không bao giờ lật nên không bao giờ mất đĩa.) */
    if (isSkull(mv.card)) {
      const rosesLeft = me.hand.filter(isRose).length;
      return rosesLeft >= 2 ? 55 : 10;
    }
    return 40;
  }

  if (mv.type === 'bid') {
    const myPlaced = me.placed[0];
    /* đĩa mình đặt là đầu lâu thì thắng giá = tự lật trúng ngay — không bao giờ ra giá */
    if (myPlaced && isSkull(myPlaced)) return -1000;
    const total = s.players.reduce((t, p) => t + p.placed.length, 0);
    /* số đĩa chắc chắn là hoa: đĩa mình (nếu là hoa) + đĩa đã lật thấy hoa */
    let knownRoses = (myPlaced && isRose(myPlaced)) ? 1 : 0;
    /* kỳ vọng hoa trong các đĩa úp còn lại (trừ đĩa mình): mỗi đĩa ~3/4 là hoa
       nếu người đó còn đầu lâu, ~1 nếu đã mất đầu lâu */
    let expected = 0;
    for (const p of s.players) {
      if (p.id === pid) continue;
      if (!p.placed.length) continue;
      expected += 1 - skullProb(s, p);
    }
    const safe = knownRoses + Math.floor(expected);
    const over = mv.amount - safe;
    /* ra giá trong vùng an toàn thì tốt, vượt quá thì càng cao càng tệ */
    return over <= 0 ? 60 - over * 2 : 40 - over * 45;
  }

  if (mv.type === 'pass') {
    const myPlaced = me.placed[0];
    if (myPlaced && isSkull(myPlaced)) return 70; /* đặt đầu lâu thì bỏ giá luôn */
    return 20;
  }

  if (mv.type === 'flip') {
    /* lượt đầu bắt buộc lật đĩa mình (engine chỉ cho nước đó) */
    if (s.flip.flipped.length === 0) return 50;
    const target = s.players.find(p => p.id === mv.target);
    const prob = skullProb(s, target);
    /* chọn thảm ít khả năng có đầu lâu nhất; đĩa đã lật thấy hoa thì
       thảm đó hết đĩa rồi (engine không cho lật lại) */
    return 80 - prob * 100;
  }

  return 0;
}

export function botAction(s, pid, level) {
  if (!s || s.phase !== 'playing') return null;
  const me = s.players.find(p => p.id === pid);
  if (!me) return null;
  const hard = (typeof level === 'string' ? level : level && level.level) === 'hard';
  const moves = legalMoves(s, pid);
  if (!moves.length) return null;
  /* Máy Dễ: 70% đánh bừa */
  if (!hard && Math.random() < 0.7) return pick(moves);
  /* Máy Khó (và 30% của máy Dễ): nước điểm cao nhất */
  let best = null, bestV = -Infinity;
  for (const mv of moves) {
    const v = scoreMove(s, pid, mv) + Math.random() * 0.5;
    if (v > bestV) { bestV = v; best = mv; }
  }
  return best;
}
