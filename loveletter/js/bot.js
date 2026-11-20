// 🤖 Bot Love Letter — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Bot chỉ dùng thông tin công khai (bài đã bỏ, lá ngửa, lượt đi) + tay bài
// của mình + những lần Linh mục của mình đã xem (peeks lưu trong state).
// Máy Dễ: đánh bừa lá hợp lệ, chọn bừa mục tiêu, đoán bừa. Máy Khó: tính
// xác suất theo số lá còn chưa thấy, giữ Công chúa / Nữ bá tước an toàn,
// Vệ binh đoán lá nhiều khả năng nhất, Nam tước chỉ so khi chắc thắng,
// Hoàng tử nhắm người nhiều khả năng cầm Công chúa nhất.
import { CARD_INFO, legalCards } from './engine.js?v=1';

const VALUE = k => CARD_INFO[k].value;
const DECK_COUNT = { guard: 5, priest: 2, baron: 2, handmaid: 2, prince: 2, king: 1, countess: 1, princess: 1 };
const kindOf = id => id.slice(0, id.lastIndexOf('-'));
const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];

function seenCounts(v) {
  const seen = {};
  for (const p of v.players) {
    for (const c of (p.discards || [])) seen[kindOf(c)] = (seen[kindOf(c)] || 0) + 1;
    if (p.hand && p.hand.length) for (const c of p.hand) seen[kindOf(c)] = (seen[kindOf(c)] || 0) + 1;
  }
  for (const c of (v.faceUp || [])) seen[kindOf(c)] = (seen[kindOf(c)] || 0) + 1;
  return seen;
}
/* số lá mỗi loại còn chưa thấy (còn trong bộ bài / tay người khác / lá úp) */
function remaining(v) {
  const seen = seenCounts(v);
  const out = {};
  for (const k of Object.keys(DECK_COUNT)) out[k] = DECK_COUNT[k] - (seen[k] || 0);
  return out;
}
function opponents(v, me) {
  return v.players.filter(p => p.id !== me.id && p.alive);
}
function targetable(v, me, allowSelf) {
  return opponents(v, me).filter(p => !p.protected || (allowSelf && p.id === me.id));
}

export function botAction(s, pid, level) {
  if (!s || s.phase !== 'playing' || s.turn !== pid) return null;
  const me = s.players.find(p => p.id === pid);
  if (!me || !me.alive || !me.hand.length) return null;
  const hard = (typeof level === 'string' ? level : level && level.level) === 'hard';
  const legal = legalCards(s, pid);
  if (!legal.length) return null;
  const view = {
    players: s.players.map(p => ({
      id: p.id, alive: p.alive, protected: p.protected,
      hand: p.id === pid ? p.hand.slice() : [],
      discards: p.discards.slice(), tokens: p.tokens,
    })),
    faceUp: s.faceUp.slice(), deckCount: s.deck.length,
  };
  const myHand = me.hand.map(kindOf);
  const other = myHand.length === 2 ? myHand : [myHand[0]];
  const peekOf = id => (me.peeks || {})[id] || null;

  /* ---------- Máy Dễ: bừa hết ---------- */
  if (!hard) {
    const card = pick(legal);
    const kind = kindOf(card);
    const act = { type: 'play', card };
    if (['guard', 'priest', 'baron', 'king'].includes(kind)) {
      const ts = targetable(view, me, false);
      if (ts.length) {
        act.target = pick(ts).id;
        if (kind === 'guard') act.guess = 2 + rnd(7);
      }
      /* không có ai để chọn (mọi người đang được bảo vệ) thì đánh lá
         không hiệu ứng — vẫn là nước đi hợp lệ */
    } else if (kind === 'prince') {
      /* Hoàng tử được chọn cả mình; đối thủ đang được bảo vệ thì không chọn được */
      const ts = [...targetable(view, me, false), me];
      act.target = pick(ts).id;
    }
    return act;
  }

  /* ---------- Máy Khó ---------- */
  const rem = remaining(view);
  const totalUnseen = Object.values(rem).reduce((a, b) => a + b, 0) || 1;
  /* xác suất 1 người chưa biết tay đang cầm lá loại k */
  const prob = k => rem[k] / totalUnseen;
  /* người có khả năng cầm Công chúa nhất (Linh mục đã xem thì biết chắc) */
  function princessSuspect() {
    let best = null, bestP = -1;
    for (const p of opponents(view, me)) {
      if (p.protected) continue;
      const pk = peekOf(p.id);
      const pr = pk === 'princess' ? 1 : pk ? 0 : prob('princess');
      if (pr > bestP) { bestP = pr; best = p; }
    }
    return best ? { p: best, pr: bestP } : null;
  }

  const scores = [];
  for (const card of legal) {
    const kind = kindOf(card);
    const otherKind = other.find(k => k !== kind) || other[0];
    let score = 0, target = null, guess = null;
    if (kind === 'countess') {
      score = 10; /* bị ép đánh thì đánh; không thì tránh (điểm thấp) */
      if (myHand.includes('king') || myHand.includes('prince')) score = 50;
    } else if (kind === 'princess') {
      score = -100; /* không bao giờ tự bỏ Công chúa */
    } else if (kind === 'guard') {
      const ts = targetable(view, me, false);
      if (!ts.length) { score = -50; }
      else {
        /* ưu tiên người đã xem: đoán đúng 100%; không thì đoán lá nhiều nhất */
        let bestG = null, bestT = null, bestP = -1;
        for (const t of ts) {
          const pk = peekOf(t.id);
          if (pk && pk !== 'guard') { bestG = VALUE(pk); bestT = t; bestP = 2; break; }
          for (const k of Object.keys(DECK_COUNT)) {
            if (k === 'guard') continue;
            const pr = prob(k);
            if (pr > bestP) { bestP = pr; bestG = VALUE(k); bestT = t; }
          }
        }
        if (bestT) { target = bestT.id; guess = bestG; score = 30 + bestP * 40; }
      }
    } else if (kind === 'priest') {
      const unpeeked = targetable(view, me, false).filter(t => !peekOf(t.id));
      const ts = unpeeked.length ? unpeeked : targetable(view, me, false);
      if (ts.length) { target = pick(ts).id; score = unpeeked.length ? 34 : 12; }
      else score = 5; /* không có ai để xem thì lá không có hiệu ứng */
    } else if (kind === 'baron') {
      const ts = targetable(view, me, false);
      if (!ts.length) { score = -50; }
      else {
        let bestT = null, bestScore = -Infinity;
        for (const t of ts) {
          const pk = peekOf(t.id);
          let sc;
          if (pk) sc = VALUE(otherKind) > VALUE(pk) ? 60 : -40;
          else sc = VALUE(otherKind) >= 6 ? 25 : VALUE(otherKind) >= 4 ? 5 : -20;
          if (sc > bestScore) { bestScore = sc; bestT = t; }
        }
        target = bestT.id; score = bestScore;
      }
    } else if (kind === 'handmaid') {
      /* giữ Công chúa / Vua thì che chắn, không thì đánh muộn */
      score = (otherKind === 'princess' || otherKind === 'king') ? 45 : 8;
    } else if (kind === 'prince') {
      const sus = princessSuspect();
      if (sus && sus.pr >= 0.5) { target = sus.p.id; score = 55; }
      else if (VALUE(otherKind) <= 2) { target = pid; score = 30; } /* tự đổi lá thấp */
      else {
        const ts = targetable(view, me, false);
        if (ts.length) { target = pick(ts).id; score = 12; }
        else { target = pid; score = 20; }
      }
    } else if (kind === 'king') {
      const ts = targetable(view, me, false);
      if (!ts.length) { score = -50; }
      else if (VALUE(otherKind) <= 3) {
        /* đổi lá thấp lấy lá cao: nhắm người đã xem cầm lá cao */
        let bestT = ts[0], bestV = -1;
        for (const t of ts) {
          const pk = peekOf(t.id);
          const v = pk ? VALUE(pk) : 4;
          if (v > bestV) { bestV = v; bestT = t; }
        }
        target = bestT.id; score = 28;
      } else {
        /* cầm lá cao thì đừng đổi — nhưng nếu buộc phải đánh Quốc vương thì
           vẫn cần chọn 1 người (đổi với người có bài thấp nhất có thể) */
        let worst = ts[0], worstV = 99;
        for (const t of ts) {
          const pk = peekOf(t.id);
          const v = pk ? VALUE(pk) : 4;
          if (v < worstV) { worstV = v; worst = t; }
        }
        target = worst.id; score = -10;
      }
    }
    scores.push({ card, score, target, guess });
  }
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const act = { type: 'play', card: best.card };
  if (best.target) act.target = best.target;
  if (best.guess) act.guess = best.guess;
  return act;
}
