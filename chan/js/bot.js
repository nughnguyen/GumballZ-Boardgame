// 🀄 Bot Chắn — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Bot CHỈ dùng thông tin từ viewFor của chính mình — tức là bài của mình
// (thấy hết) + bài đã ăn của mọi người (ngửa) + lá ở cửa + lá vừa bốc +
// nọc còn bao nhiêu lá. Bot không bao giờ đọc state thô, không nhìn bài
// của người khác. (legalMoves chỉ cho danh sách nước đi hợp lệ — lá nào
// ghép được với lá ở cửa / lá vừa bốc — không tiết lộ lá nào là lá nào.)
// Máy Dễ: 70% đánh bừa, 30% đánh nước tốt. Máy Khó: ăn khi ghép được
// chắn/cạ mà không phá chắn có sẵn → chíu luôn khi được mời → bốc bài →
// đánh lá què vô dụng nhất (không phá chắn/cạ, giữ lá đỏ để chờ tám đỏ).
import { viewFor, legalMoves, typeOf, rankOf, suitOf, isChan, isCa, pairsWith, isRedType } from './engine.js?v=1';

const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];

/* lá i trên tay có nằm trong 1 chắn / 1 cạ sẵn có không? */
function pairStatus(hand, i) {
  const c = hand[i];
  let chan = false, ca = false, baDau = 0;
  for (let j = 0; j < hand.length; j++) {
    if (j === i) continue;
    if (isChan(c, hand[j])) chan = true;
    if (isCa(c, hand[j])) { ca = true; baDau++; }
  }
  return { chan, ca, baDau };
}
/* độ hữu dụng của lá i khi giữ lại (càng cao càng nên giữ) */
function keepScore(hand, i) {
  const st = pairStatus(hand, i);
  let s = 0;
  if (st.chan) s += 10;
  if (st.ca) s += 6;
  if (st.baDau >= 2) s += 2; /* ba đầu: 3 lá cùng số khác chất */
  if (isRedType(typeOf(hand[i]))) s += 2; /* giữ lá đỏ để chờ tám đỏ */
  return s;
}
/* điểm của 1 nước ăn (eat-gate / eat-drawn): ghép chắn tốt hơn ghép cạ;
   phá chắn/cạ sẵn có để ăn thì trừ điểm; ăn bằng lá què thì tốt nhất */
function eatScore(hand, move) {
  const withCard = move.with;
  const idx = hand.indexOf(withCard);
  if (idx === -1) return -99;
  const st = pairStatus(hand, idx);
  const gateCard = move._card; /* lá ở cửa / lá vừa bốc (bot tự gắn vào) */
  let s = 0;
  if (isChan(gateCard, withCard)) s += 10;
  else if (isCa(gateCard, withCard)) s += 6;
  else return -99; /* không ghép được — không bao giờ ăn */
  if (st.chan) s -= 8; /* phá 1 chắn sẵn có để ăn */
  else if (st.ca) s -= 4; /* phá 1 cạ sẵn có để ăn */
  else s += 2; /* ăn bằng lá què: biến què thành cặp */
  return s;
}

function bestMove(v, moves) {
  const me = v.players.find(p => p.id === v.me);
  const hand = me.hand || [];
  /* 1. được mời chíu thì chíu luôn (thêm 2 chắn, gần như luôn tốt) */
  const chiu = moves.find(m => m.type === 'chiu');
  if (chiu) return chiu;
  /* 2. ăn lá ở cửa / lá vừa bốc nếu điểm ăn dương */
  const eats = moves.filter(m => m.type === 'eat-gate' || m.type === 'eat-drawn');
  if (eats.length) {
    for (const m of eats) m._card = m.type === 'eat-gate' ? (v.gate ? v.gate.card : null) : v.drawn;
    let best = null, bestScore = 0;
    for (const m of eats) {
      const sc = eatScore(hand, m);
      if (sc > bestScore) { bestScore = sc; best = m; }
    }
    if (best) {
      const out = { type: best.type, with: best.with };
      return out;
    }
  }
  /* 3. bốc bài (hoặc bỏ qua lá vừa bốc nếu không ăn) */
  const draw = moves.find(m => m.type === 'draw');
  if (draw) return draw;
  const leave = moves.find(m => m.type === 'leave');
  if (leave) return leave;
  /* 4. đánh ra lá vô dụng nhất (điểm giữ thấp nhất, lá trái nhất) */
  const discs = moves.filter(m => m.type === 'discard');
  if (discs.length) {
    let best = discs[0], bestScore = Infinity;
    for (const m of discs) {
      const idx = hand.indexOf(m.card);
      const sc = idx === -1 ? 0 : keepScore(hand, idx);
      if (sc < bestScore) { bestScore = sc; best = m; }
    }
    return { type: 'discard', card: best.card };
  }
  /* 5. đường cùng: từ chối chíu (nếu còn nước này) */
  const pass = moves.find(m => m.type === 'chiu-pass');
  if (pass) return pass;
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
