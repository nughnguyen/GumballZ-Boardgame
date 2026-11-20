// 🤖 Bot Sushi Go — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Bot chỉ dùng thông tin công khai (bài đã đặt của mọi người, tay bài của
// mình, số lá còn chưa thấy) — không nhìn tay bài người khác.
// Máy Dễ: 70% đánh bừa, 30% đánh nước tốt. Máy Khó: heuristic — tính điểm
// biên chính xác (điểm vòng trước/sau khi đặt lá, kể cả Maki nhất/nhì và
// Wasabi ×3), cộng điểm phủ đầu (cướp lá đối thủ đang cần để hoàn bộ),
// ưu tiên hoàn thành bộ, tranh Maki, giữ Pudding cuối trận, dùng Đũa khi
// 2 lá cùng có giá trị.
import { CARD_INFO, DECK_SPEC, MAKI_ICONS, NIGIRI_POINTS, DUMPLING_POINTS, scoreRound, legalCards, hasChopsticksPlayed, openWasabi } from './engine.js?v=1';

const kindOf = id => id.slice(0, id.lastIndexOf('-'));
const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];
const NIGIRI_KINDS = ['salmon', 'squid', 'egg'];

/* số lá mỗi loại còn chưa thấy (chưa đặt xuống, không ở tay mình) */
function unseenCounts(s, me) {
  const seen = {};
  for (const p of s.players) {
    for (const e of (p.played || [])) seen[e.kind] = (seen[e.kind] || 0) + 1;
    if (p.id === me.id) for (const c of p.hand) seen[kindOf(c)] = (seen[kindOf(c)] || 0) + 1;
  }
  const out = {};
  for (const [k, n] of DECK_SPEC) out[k] = n - (seen[k] || 0);
  return out;
}

/* điểm vòng của người idx tăng thêm bao nhiêu nếu đặt thêm các lá kinds
   (tính đúng Maki nhất/nhì và Nigiri trên Wasabi) */
function marginalPoints(s, idx, kinds) {
  const base = scoreRound(s.players.map(p => ({ played: p.played || [] })));
  const afterPlayers = s.players.map((p, i) => {
    if (i !== idx) return { played: p.played || [] };
    const played = (p.played || []).map(e => ({ ...e }));
    for (const kind of kinds) {
      const entry = { id: 'tmp-' + kind, kind };
      if (NIGIRI_KINDS.includes(kind)) {
        const w = played.find(e => e.kind === 'wasabi' && !e.used);
        if (w) { w.used = true; entry.wasabi = true; }
      }
      played.push(entry);
    }
    return { played };
  });
  const after = scoreRound(afterPlayers);
  return after[idx].points - base[idx].points;
}

/* giá trị tương lai của 1 lá (bộ chưa hoàn thành, Wasabi chờ Nigiri,
   Pudding cuối trận, Đũa mở nước đôi sau này) */
function futurePotential(s, me, kind) {
  const count = k => (me.played || []).filter(e => e.kind === k).length;
  const turnsLeft = s.handSize - s.turnNum;
  if (kind === 'tempura') return count('tempura') % 2 === 0 ? 1.0 : 0;
  if (kind === 'sashimi') {
    const n = count('sashimi') % 3;
    return n === 0 ? 0.8 : n === 1 ? 1.2 : 0;
  }
  if (kind === 'dumpling') return 0.3;
  if (kind === 'wasabi') {
    if (openWasabi(s, me.id) > 0) return 0.2; /* đã có Wasabi mở thì thêm nữa gần như vô dụng */
    const unseen = unseenCounts(s, me);
    const unseenTotal = Math.max(1, Object.values(unseen).reduce((a, b) => a + b, 0));
    const unseenNigiri = (unseen.salmon || 0) + (unseen.squid || 0) + (unseen.egg || 0);
    const prob = unseenNigiri / unseenTotal;
    const chance = Math.min(1, turnsLeft / 3 + 0.3);
    return 0.5 + prob * 6 * chance;
  }
  if (kind === 'pudding') {
    const myPud = me.puddings + count('pudding');
    const oppPud = s.players.filter(p => p.id !== me.id)
      .map(p => p.puddings + (p.played || []).filter(e => e.kind === 'pudding').length);
    const maxOppPud = Math.max(0, ...oppPud), minOppPud = Math.min(...oppPud, myPud);
    if (s.round < 3) return myPud < maxOppPud ? 1.0 : 0.5;
    if (myPud + 1 > maxOppPud) return 4;
    if (myPud <= minOppPud && myPud + 1 > minOppPud) return 4;
    if (myPud === maxOppPud && maxOppPud > minOppPud) return 0.5;
    return 1;
  }
  if (kind === 'chopsticks') return turnsLeft >= 2 ? 1.0 : 0.2;
  return 0;
}

/* tổng giá trị khi đặt 1–2 lá cùng lúc: điểm biên + tiềm năng + phủ đầu
   (cướp lá đối thủ đang cần: đối thủ được bao nhiêu điểm nếu cầm lá đó) */
function evalKinds(s, me, kinds) {
  const meIdx = s.players.findIndex(p => p.id === me.id);
  const gain = marginalPoints(s, meIdx, kinds);
  let future = 0, denial = 0;
  for (const kind of kinds) {
    future += futurePotential(s, me, kind);
    for (let i = 0; i < s.players.length; i++) {
      if (i === meIdx) continue;
      denial += marginalPoints(s, i, [kind]);
    }
  }
  return gain + future + 0.5 * denial + (kinds.length === 2 ? 0.8 : 0);
}

export function botAction(s, pid, level) {
  if (!s || s.phase !== 'playing' || s.picks[pid]) return null;
  const me = s.players.find(p => p.id === pid);
  if (!me || !me.hand.length) return null;
  const hard = (typeof level === 'string' ? level : level && level.level) === 'hard';
  const hand = me.hand.slice();
  const canChop = hasChopsticksPlayed(s, pid) && hand.length >= 2;

  /* ---------- Máy Dễ: 70% bừa, 30% nước tốt ---------- */
  if (!hard && Math.random() < 0.7) {
    const card = pick(hand);
    if (canChop && Math.random() < 0.25) {
      const rest = hand.filter(c => c !== card);
      return { type: 'play', card, card2: pick(rest) };
    }
    return { type: 'play', card };
  }

  /* ---------- Máy Khó (và 30% của máy Dễ) ---------- */
  const scored = hand.map(c => ({ card: c, kind: kindOf(c), v: evalKinds(s, me, [kindOf(c)]) }))
    .sort((a, b) => b.v - a.v);
  const best = scored[0];
  if (!canChop) return { type: 'play', card: best.card };
  /* có Đũa: so cặp 2 lá tốt nhất với lá đơn tốt nhất */
  const pairVal = evalKinds(s, me, [scored[0].kind, scored[1].kind]);
  if (pairVal > best.v + 0.5) return { type: 'play', card: scored[0].card, card2: scored[1].card };
  return { type: 'play', card: best.card };
}
