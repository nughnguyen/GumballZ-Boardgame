// 🀄 Chắn – luật chơi (thuần logic, không chạm DOM).
// Game bài dân gian Việt Nam (họ tổ tôm), 2–4 người (chuẩn 4 người).
// Bộ 100 lá: 25 loại × 4 lá giống hệt. 1 loại Chi Chi (không chất) +
// 3 chất Vạn / Văn / Sách × số Nhị–Cửu (2–9) = 24 loại. Lá đỏ (20 lá):
// Chi Chi, Cửu Vạn, Cửu Sách, Bát Vạn, Bát Sách; còn lại 80 lá đen.
// Mỗi người 19 lá, người cái (đi trước) 20 lá, còn lại úp thành nọc.
// Chắn = 2 lá giống hệt nhau. Cạ = 2 lá cùng số, khác chất (Chi Chi
// không ghép cạ). Ba đầu = 3 lá cùng số, khác chất. Què = lá lẻ.
// Một lượt: bốc 1 lá từ nọc (lật ngửa cho mọi người thấy) hoặc ăn lá
// ở cửa trên (lá người trước vừa bỏ / vừa bốc mà không ăn) nếu nó tạo
// thành chắn hoặc cạ với bài trên tay; ăn xong thì đánh ra 1 lá. Ù khi
// 20 lá (tay + bài đã ăn + lá vừa bốc/ăn) xếp hết thành 10 cặp chắn/cạ
// và có ít nhất 6 chắn. Chíu: đang giữ 3 lá giống hệt (khàn) mà có lá
// thứ 4 xuất hiện (ai bốc hay đánh ra cũng được) thì được chíu ngay cả
// khi chưa tới lượt — chíu tính là 2 chắn. Hết nọc mà chưa ai ù thì hòa.
// Mọi quyết định ngẫu nhiên đều dùng LCG lưu trong state để mọi máy
// cùng áp 1 hành động thì giống hệt nhau.

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const HAND_SIZE = 19;
export const MIN_CHAN = 6;
export const SUITS = ['V', 'W', 'S'];
export const SUIT_NAMES = { V: 'Vạn', W: 'Văn', S: 'Sách' };
export const SUIT_EMOJI = { V: '🟥', W: '🟦', S: '🟩' };
export const RANK_NAMES = { 2: 'Nhị', 3: 'Tam', 4: 'Tứ', 5: 'Ngũ', 6: 'Lục', 7: 'Thất', 8: 'Bát', 9: 'Cửu' };
/* 5 loại đỏ: Chi Chi, Cửu Vạn, Cửu Sách, Bát Vạn, Bát Sách */
export const RED_TYPES = ['CC', 'V9', 'S9', 'V8', 'S8'];
/* các cước đặc biệt (điểm danh dự, hiện ở hộp thắng) */
export const CUOC_NAMES = {
  thien: 'Thiên ù', chiu: 'Chíu ù', thap: 'Thập thành', bachtu: 'Bạch thủ',
  rong: 'Ù rộng', tamdo: 'Tám đỏ', bachdin: 'Bạch định', tom: 'Tôm',
  leo: 'Lèo', chi: 'Chì', xuong: 'Xuông',
};

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* LCG lưu trong state: mọi lần xào / chọn ngẫu nhiên đều qua đây */
function nextRand(s) {
  s.seed = (s.seed * 1103515245 + 12345) % 2147483648;
  return s.seed / 2147483648;
}
const pOf = (s, id) => s.players.find(p => p.id === id);
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < MIN_PLAYERS || s.players.length > MAX_PLAYERS
    || typeof s.phase !== 'string' || typeof s.turnIdx !== 'number'
    || !Array.isArray(s.nocol)
    || (s.gate !== null && (typeof s.gate !== 'object' || typeof s.gate.card !== 'string'))
    || (s.drawn !== null && typeof s.drawn !== 'string')) {
    throw new Error('Trạng thái Chắn không hợp lệ.');
  }
  return s;
}
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

/* ---------- nhận mặt quân bài ---------- */
/* id lá: `${loại}-${bản}` — loại CC | V2..V9 | W2..W9 | S2..S9, bản 1–4 */
export const typeOf = c => typeof c === 'string' ? c.split('-')[0] : null;
export const rankOf = t => t === 'CC' ? 1 : +String(t).slice(1);
export const suitOf = t => t === 'CC' ? null : String(t)[0];
export const isRedType = t => RED_TYPES.includes(t);
export const isRedCard = c => isRedType(typeOf(c));
export const typeName = t => t === 'CC' ? 'Chi Chi' : `${RANK_NAMES[rankOf(t)]} ${SUIT_NAMES[suitOf(t)]}`;
export const cardName = c => typeName(typeOf(c));
/* chắn: 2 lá giống hệt nhau (cùng loại) */
export const isChan = (a, b) => typeOf(a) === typeOf(b);
/* cạ: cùng số, khác chất — Chi Chi không ghép cạ */
export const isCa = (a, b) => {
  const ta = typeOf(a), tb = typeOf(b);
  if (ta === 'CC' || tb === 'CC') return false;
  return rankOf(ta) === rankOf(tb) && suitOf(ta) !== suitOf(tb);
};
export const pairsWith = (a, b) => isChan(a, b) || isCa(a, b);

function buildDeck() {
  const deck = [];
  const types = ['CC'];
  for (const su of SUITS) for (let r = 2; r <= 9; r++) types.push(su + r);
  for (const t of types) for (let k = 1; k <= 4; k++) deck.push(`${t}-${k}`);
  return deck;
}

/* ---------- xếp 20 lá thành 10 cặp chắn/cạ ---------- */
/* Trả về {pairs: [[a,b]...], chan: số chắn} có số chắn LỚN NHẤT, hoặc
   null nếu không xếp hết được. Tìm kiếm quay lui: lấy lá chưa xếp đầu
   tiên, thử ghép với từng lá tương thích (chắn trước, cạ sau). */
export function partition20(cards) {
  if (!cards || cards.length !== 20) return null;
  const rest = cards.slice();
  let best = null;
  const used = new Array(20).fill(false);
  const pairs = [];
  function rec(chan) {
    /* cắt tỉa: dù xếp hết số còn lại thành chắn cũng không hơn best */
    const left = used.filter(u => !u).length;
    if (best && chan + left / 2 <= best.chan) return;
    let i = -1;
    for (let k = 0; k < 20; k++) if (!used[k]) { i = k; break; }
    if (i === -1) {
      if (!best || chan > best.chan) best = { pairs: pairs.map(p => p.slice()), chan };
      return;
    }
    used[i] = true;
    /* thử chắn trước (cùng loại), rồi cạ (cùng số khác chất) */
    const mates = [];
    for (let j = i + 1; j < 20; j++) if (!used[j]) mates.push(j);
    mates.sort((a, b) => {
      const ca = isChan(cards[i], cards[a]) ? 0 : 1;
      const cb = isChan(cards[i], cards[b]) ? 0 : 1;
      return ca - cb;
    });
    for (const j of mates) {
      if (!pairsWith(cards[i], cards[j])) continue;
      used[j] = true;
      pairs.push([cards[i], cards[j]]);
      rec(chan + (isChan(cards[i], cards[j]) ? 1 : 0));
      pairs.pop();
      used[j] = false;
      if (best && best.chan >= 10) break; /* không thể hơn 10 chắn */
    }
    used[i] = false;
  }
  rec(0);
  return best;
}
/* có ù không: xếp được hết 20 lá và đủ ít nhất 6 chắn */
export function canUu(cards) {
  const p = partition20(cards);
  return p && p.chan >= MIN_CHAN ? p : null;
}
/* số chắn đang có trên tay + bài đã ăn (đếm nhanh, không cần xếp cạ) */
export function countChan(cards) {
  const byType = {};
  for (const c of cards) byType[typeOf(c)] = (byType[typeOf(c)] || 0) + 1;
  return Object.values(byType).reduce((t, n) => t + Math.floor(n / 2), 0);
}
/* lá què: không ghép được chắn hay cạ với lá nào khác trong danh sách */
export function isQue(card, cards) {
  return !cards.some(c => c !== card && pairsWith(card, c));
}

/* ---------- cước của 1 bài ù ---------- */
/* winCard: lá vừa bốc/ăn/chíu để ù; method: 'draw' | 'gate' | 'chiu' | 'thien' */
export function computeCuoc(cards20, winCard, method) {
  const part = partition20(cards20);
  if (!part) return [];
  const out = [];
  const winPair = part.pairs.find(pr => pr.includes(winCard));
  const winIsChan = winPair ? isChan(winPair[0], winPair[1]) : false;
  const reds = cards20.filter(isRedCard).length;
  const hasChanPair = t => part.pairs.some(pr => isChan(pr[0], pr[1]) && typeOf(pr[0]) === t);
  if (method === 'thien') out.push('thien');
  else if (method === 'chiu') out.push('chiu');
  else if (part.chan === MIN_CHAN && winIsChan) out.push('bachtu');
  else out.push('rong');
  if (part.chan >= 10) out.push('thap');
  if (reds >= 8) out.push('tamdo');
  if (reds === 0) out.push('bachdin');
  /* Tôm: chắn Thất Văn + chắn Tam Sách + chắn Tam Vạn */
  if (hasChanPair('W7') && hasChanPair('S3') && hasChanPair('V3')) out.push('tom');
  /* Lèo: chắn Chi Chi + chắn Cửu Vạn + chắn Bát Sách */
  if (hasChanPair('CC') && hasChanPair('V9') && hasChanPair('S8')) out.push('leo');
  /* Chì: ù bằng lá mình tự bốc ở cửa của mình */
  if (method === 'draw') out.push('chi');
  /* Xuông: ù rộng mà không có cước đặc biệt nào khác */
  if (out.length === 1 && out[0] === 'rong') out.push('xuong');
  return out;
}

function allCardsOf(p) {
  return p.hand.concat(p.melds.flat());
}
function endGame(s, reason, cause, winnerId, cuoc, winCard, winMethod) {
  s.phase = 'ended';
  s.endReason = reason;
  s.endCause = cause;
  s.endedAt = Date.now();
  s.cuoc = cuoc || [];
  s.winCard = winCard || null;
  s.winMethod = winMethod || null;
  if (winnerId) {
    s.winner = winnerId;
    s.winners = [winnerId];
    s.losers = s.players.map(p => p.id).filter(id => id !== winnerId);
  } else {
    s.winner = null;
    s.winners = [];
    s.losers = s.players.map(p => p.id);
  }
  const w = winnerId ? pOf(s, winnerId) : null;
  if (w) {
    const names = (s.cuoc || []).map(c => CUOC_NAMES[c] || c).join(' · ');
    pushLog(s, `🏆 ${w.name} ù!${names ? ` (${names})` : ''}`, 'win');
  } else if (cause === 'draw') {
    pushLog(s, '🤝 Hết nọc mà chưa ai ù — ván hòa.', 'info');
  }
}

/* hết lượt: xoay ghế, về bước bốc/ăn */
function advanceTurn(s) {
  if (s.phase !== 'playing') return;
  s.turnIdx = (s.turnIdx + 1) % s.players.length;
  s.turnCount++;
  s.step = 'draw-or-eat';
  s.drawn = null;
}
/* ai đang giữ 3 lá cùng loại với lá vừa xuất hiện (để chíu)? — tối đa
   1 người vì mỗi loại chỉ có 4 lá và lá thứ 4 đang ở ngoài */
function chiuCandidate(s, card, excludeId) {
  const t = typeOf(card);
  for (const p of s.players) {
    if (p.id === excludeId) continue;
    const n = p.hand.filter(c => typeOf(c) === t).length;
    if (n >= 3) return p;
  }
  return null;
}
/* mở lời chíu (nếu có người đủ 3 lá), trả về true nếu đã mở */
function maybeOfferChiu(s, card, from, excludeId) {
  const cand = chiuCandidate(s, card, excludeId);
  if (!cand) return false;
  s.chiuOffer = { card, candidate: cand.id, from };
  s.step = 'chiu';
  pushLog(s, `🖐️ ${cand.name} có 3 lá ${cardName(card)} — được quyền chíu!`);
  return true;
}
/* kiểm tra ù cho người chơi p với lá mới (lá bốc / lá ăn / lá chíu):
   tổng tay + bài đã ăn (+ lá mới, nếu chưa nằm trong đó) phải đủ 20 lá
   và xếp được ≥6 chắn. Lưu ý: lá ăn/chíu đã nằm trong bài đã ăn rồi
   nên không cộng thêm nữa; lá vừa bốc thì chưa nằm trong tay. */
function tryUu(s, p, winCard, method) {
  let cards = allCardsOf(p);
  if (!cards.includes(winCard)) cards = cards.concat([winCard]);
  if (cards.length !== 20) return false;
  const part = canUu(cards);
  if (!part) return false;
  const cuoc = computeCuoc(cards, winCard, method);
  endGame(s, 'match', 'uu', p.id, cuoc, winCard, method);
  return true;
}

export function createGame(players, opts = {}) {
  if (!players || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error('Chắn chơi 2–4 người.');
  }
  const seed = typeof opts.seed === 'number' ? opts.seed : (Date.now() % 2147483647);
  const n = players.length;
  const deck = buildDeck();
  const tmp = { seed };
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand(tmp) * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const s = {
    gid: 'g' + seed.toString(36) + '-' + (seed % 9973).toString(36), seq: 0,
    phase: 'playing', /* 'playing' | 'ended' */
    seed,
    players: players.map((p, i) => ({
      id: p.id, name: p.name || ('Người ' + (i + 1)),
      isBot: !!p.isBot, level: p.level || null, local: !!p.local,
      hand: [], melds: [], chiu: false, chiuCount: 0,
    })),
    nocol: [], gate: null, /* gate: {card, by} — lá ở cửa, người tới lượt được ăn */
    drawn: null, /* lá vừa bốc, đang chờ quyết định ăn hay bỏ */
    chiuOffer: null, /* {card, candidate, from: 'draw'|'discard'} */
    step: 'discard', /* người cái (ghế 0) có 20 lá, đánh ra 1 lá mở đầu */
    turnIdx: 0, turnCount: 1,
    winner: null, winners: [], losers: [],
    endReason: null, endCause: null, cuoc: [], winCard: null, winMethod: null,
    startedAt: Date.now(), endedAt: 0, log: [],
  };
  /* chia bài vòng tròn: mỗi người 19 lá, người cái thêm 1 lá */
  let di = 0;
  for (let k = 0; k < HAND_SIZE; k++) {
    for (const p of s.players) p.hand.push(deck[di++]);
  }
  s.players[0].hand.push(deck[di++]); /* lá cái cho người đi trước */
  s.nocol = deck.slice(di);
  pushLog(s, `🀄 Chắn bắt đầu: ${n} người, mỗi người ${HAND_SIZE} lá, người cái 20 lá. Nọc còn ${s.nocol.length} lá.`);
  /* Thiên ù: người cái ù ngay với 20 lá vừa chia */
  const dealer = s.players[0];
  if (canUu(dealer.hand)) {
    const cuoc = computeCuoc(dealer.hand, dealer.hand[dealer.hand.length - 1], 'thien');
    endGame(s, 'match', 'uu', dealer.id, cuoc, null, 'thien');
    return s;
  }
  return s;
}

export function applyAction(s, pid, act) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Trận đã kết thúc.' };
  const p = pOf(s, pid);
  if (!p) return { ok: false, reason: 'Không tìm thấy người chơi.' };
  if (!act || typeof act.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };

  /* ---------- xin thua: kết thúc trận luôn; người còn lại có bài
     mạnh nhất (nhiều chắn nhất) thắng, người xin thua chắc chắn thua */
  if (act.type === 'resign') {
    let best = null, bestChan = -1;
    for (const q of s.players) {
      if (q.id === pid) continue;
      const c = countChan(allCardsOf(q));
      if (c > bestChan || (c === bestChan && !best)) { best = q; bestChan = c; }
    }
    s.seq++;
    pushLog(s, `${p.name} xin thua.`, 'resign');
    endGame(s, 'resign', 'resign', best ? best.id : null, [], null, 'resign');
    return { ok: true };
  }

  /* ---------- CHÍU (ngoài lượt): chỉ người được mời mới chíu được */
  if (act.type === 'chiu' || act.type === 'chiu-pass') {
    if (s.step !== 'chiu' || !s.chiuOffer) return { ok: false, reason: 'Không có lời chíu nào.' };
    if (s.chiuOffer.candidate !== pid) return { ok: false, reason: 'Không phải bạn được mời chíu.' };
    const offer = s.chiuOffer;
    s.chiuOffer = null;
    s.seq++;
    if (act.type === 'chiu-pass') {
      pushLog(s, `${p.name} không chíu.`);
      if (offer.from === 'draw') {
        /* quay lại người vừa bốc để quyết định ăn hay bỏ lá đó */
        s.step = 'decide';
      } else {
        advanceTurn(s);
      }
      return { ok: true };
    }
    /* chíu: lấy lá thứ 4 + 3 lá trên tay, hạ thành 2 chắn */
    const t = typeOf(offer.card);
    const held = p.hand.filter(c => typeOf(c) === t);
    if (held.length < 3) return { ok: false, reason: 'Bạn không đủ 3 lá để chíu.' };
    const three = held.slice(0, 3);
    for (const c of three) p.hand.splice(p.hand.indexOf(c), 1);
    p.melds.push([three[0], three[1]], [three[2], offer.card]);
    p.chiu = true; p.chiuCount++;
    if (offer.from === 'draw') s.drawn = null;
    else s.gate = null;
    /* lượt chuyển về người vừa chíu */
    s.turnIdx = s.players.findIndex(q => q.id === pid);
    pushLog(s, `🖐️ ${p.name} chíu ${cardName(offer.card)}! (tính là 2 chắn)`, 'win');
    /* chíu xong có ù luôn không? */
    if (tryUu(s, p, offer.card, 'chiu')) return { ok: true };
    if (!p.hand.length) { endGame(s, 'match', 'draw', null, [], null, 'draw'); return { ok: true }; }
    s.step = 'discard';
    return { ok: true };
  }

  /* các hành động còn lại chỉ người tới lượt mới được đi */
  if (s.players[s.turnIdx].id !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };

  /* ---------- BỐC 1 lá từ nọc ---------- */
  if (act.type === 'draw') {
    if (s.step !== 'draw-or-eat') return { ok: false, reason: 'Lúc này không bốc được.' };
    if (!s.nocol.length) {
      endGame(s, 'match', 'draw', null, [], null, 'draw');
      return { ok: true };
    }
    const card = s.nocol.pop();
    s.drawn = card;
    s.seq++;
    pushLog(s, `${p.name} bốc được ${cardName(card)}.`);
    /* bốc được lá ù luôn? */
    if (tryUu(s, p, card, 'draw')) return { ok: true };
    /* người khác có 3 lá giống lá vừa bốc thì được chíu trước */
    if (maybeOfferChiu(s, card, 'draw', pid)) return { ok: true };
    s.step = 'decide';
    return { ok: true };
  }

  /* ---------- ĂN lá ở cửa (lá người trước vừa bỏ / vừa bốc) ---------- */
  if (act.type === 'eat-gate') {
    if (s.step !== 'draw-or-eat') return { ok: false, reason: 'Lúc này không ăn được.' };
    if (!s.gate) return { ok: false, reason: 'Không có lá nào ở cửa để ăn.' };
    const withCard = act.with;
    if (!withCard || !p.hand.includes(withCard)) return { ok: false, reason: 'Không có lá này trên tay bạn.' };
    if (!pairsWith(s.gate.card, withCard)) return { ok: false, reason: 'Lá ở cửa không tạo chắn hay cạ với lá này.' };
    const gateCard = s.gate.card;
    s.gate = null;
    p.hand.splice(p.hand.indexOf(withCard), 1);
    p.melds.push([gateCard, withCard]);
    s.seq++;
    pushLog(s, `${p.name} ăn ${cardName(gateCard)} thành ${isChan(gateCard, withCard) ? 'chắn' : 'cạ'} ${cardName(withCard)}.`, 'win');
    if (tryUu(s, p, gateCard, 'gate')) return { ok: true };
    if (!p.hand.length) { endGame(s, 'match', 'draw', null, [], null, 'draw'); return { ok: true }; }
    s.step = 'discard';
    return { ok: true };
  }

  /* ---------- ĂN lá vừa bốc (ghép với 1 lá trên tay) ---------- */
  if (act.type === 'eat-drawn') {
    if (s.step !== 'decide' || !s.drawn) return { ok: false, reason: 'Lúc này không ăn được lá vừa bốc.' };
    const withCard = act.with;
    if (!withCard || !p.hand.includes(withCard)) return { ok: false, reason: 'Không có lá này trên tay bạn.' };
    if (!pairsWith(s.drawn, withCard)) return { ok: false, reason: 'Lá vừa bốc không tạo chắn hay cạ với lá này.' };
    const drawn = s.drawn;
    s.drawn = null;
    p.hand.splice(p.hand.indexOf(withCard), 1);
    p.melds.push([drawn, withCard]);
    s.seq++;
    pushLog(s, `${p.name} ăn lá vừa bốc ${cardName(drawn)} thành ${isChan(drawn, withCard) ? 'chắn' : 'cạ'} ${cardName(withCard)}.`, 'win');
    /* lá vừa bốc là lá ở cửa của chính mình nên ù bằng nó cũng tính chì */
    if (tryUu(s, p, drawn, 'draw')) return { ok: true };
    if (!p.hand.length) { endGame(s, 'match', 'draw', null, [], null, 'draw'); return { ok: true }; }
    s.step = 'discard';
    return { ok: true };
  }

  /* ---------- BỎ QUA lá vừa bốc: để nó ở cửa cho người sau ăn ---------- */
  if (act.type === 'leave') {
    if (s.step !== 'decide' || !s.drawn) return { ok: false, reason: 'Lúc này không bỏ qua được.' };
    const card = s.drawn;
    s.drawn = null;
    s.gate = { card, by: pid };
    s.seq++;
    pushLog(s, `${p.name} không ăn ${cardName(card)}, để ở cửa.`);
    if (maybeOfferChiu(s, card, 'discard', pid)) return { ok: true };
    advanceTurn(s);
    return { ok: true };
  }

  /* ---------- ĐÁNH RA 1 lá (mở đầu của người cái, hoặc sau khi ăn) ---------- */
  if (act.type === 'discard') {
    if (s.step !== 'discard') return { ok: false, reason: 'Lúc này không đánh bài được.' };
    const card = act.card;
    if (!card || !p.hand.includes(card)) return { ok: false, reason: 'Không có lá này trên tay bạn.' };
    p.hand.splice(p.hand.indexOf(card), 1);
    s.gate = { card, by: pid };
    s.seq++;
    pushLog(s, `${p.name} đánh ra ${cardName(card)}.`);
    if (maybeOfferChiu(s, card, 'discard', pid)) return { ok: true };
    advanceTurn(s);
    return { ok: true };
  }

  return { ok: false, reason: 'Hành động không hợp lệ.' };
}

/* người đang tới lượt, hoặc người được mời chíu (ngoài lượt) */
export function actors(s) {
  if (!s || s.phase !== 'playing') return [];
  if (s.step === 'chiu' && s.chiuOffer) return [s.chiuOffer.candidate];
  return [s.players[s.turnIdx].id];
}

/* tất cả nước đi hợp lệ của người chơi (UI và bot đều chỉ dùng danh sách này) */
export function legalMoves(s, pid) {
  if (!s || s.phase !== 'playing') return [];
  const p = pOf(s, pid);
  if (!p) return [];
  if (s.step === 'chiu') {
    if (s.chiuOffer && s.chiuOffer.candidate === pid) return [{ type: 'chiu' }, { type: 'chiu-pass' }];
    return [];
  }
  if (s.players[s.turnIdx].id !== pid) return [];
  const out = [];
  if (s.step === 'discard') {
    for (const c of p.hand) out.push({ type: 'discard', card: c });
    return out;
  }
  if (s.step === 'draw-or-eat') {
    /* hết nọc mà còn lá ở cửa ăn được thì bắt buộc ăn (không được bốc) */
    const canEat = s.gate && p.hand.some(c => pairsWith(s.gate.card, c));
    if (s.nocol.length > 0 || !canEat) out.push({ type: 'draw' });
    if (s.gate) {
      /* mỗi loại lá trên tay chỉ cần 1 lựa chọn ghép (tránh trùng lặp) */
      const seen = new Set();
      for (const c of p.hand) {
        const t = typeOf(c);
        if (seen.has(t)) continue;
        if (pairsWith(s.gate.card, c)) { seen.add(t); out.push({ type: 'eat-gate', with: c }); }
      }
    }
    return out;
  }
  if (s.step === 'decide' && s.drawn) {
    const seen = new Set();
    for (const c of p.hand) {
      const t = typeOf(c);
      if (seen.has(t)) continue;
      if (pairsWith(s.drawn, c)) { seen.add(t); out.push({ type: 'eat-drawn', with: c }); }
    }
    out.push({ type: 'leave' });
    return out;
  }
  return out;
}

export function viewFor(s, pid) {
  const ended = s.phase === 'ended';
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    turn: s.players[s.turnIdx] ? s.players[s.turnIdx].id : null,
    turnCount: s.turnCount, step: s.step,
    nocolCount: s.nocol.length,
    /* lá vừa bốc và lá ở cửa đều lật ngửa cho mọi người thấy */
    drawn: s.drawn,
    gate: s.gate ? { card: s.gate.card, by: s.gate.by } : null,
    chiuOffer: s.chiuOffer ? { card: s.chiuOffer.card, candidate: s.chiuOffer.candidate, from: s.chiuOffer.from } : null,
    players: s.players.map(p => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
      handCount: p.hand.length,
      meldCount: p.melds.flat().length,
      /* bài đã ăn thì ngửa hết; bài trên tay chỉ mình thấy (hết trận thì lộ hết) */
      hand: (ended || p.id === pid) ? p.hand.slice() : null,
      melds: p.melds.map(pr => pr.slice()),
      chiu: !!p.chiu, chiuCount: p.chiuCount,
    })),
    winner: s.winner, winners: (s.winners || []).slice(), losers: (s.losers || []).slice(),
    endReason: s.endReason, endCause: s.endCause,
    cuoc: (s.cuoc || []).slice(), winCard: s.winCard, winMethod: s.winMethod,
    log: s.log.slice(), startedAt: s.startedAt, endedAt: s.endedAt,
    me: pid,
  };
}
