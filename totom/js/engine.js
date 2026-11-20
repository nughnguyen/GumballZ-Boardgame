// 🀄 Tổ Tôm — engine thuần logic (seeded LCG, KHÔNG dùng Math.random).
//
// LUẬT CHUẨN ÁP DỤNG (tổng hợp từ Wikipedia "Tổ tôm", hocchoi.org,
// to-tom.com, zowin.co — xem test/rules.mjs §0 để biết nguồn từng luật):
// - Bộ bài 120 lá = 30 loại × 4 bản: 3 chất Vạn/Văn/Sách × số Nhất–Cửu
//   (27 loại) + 3 quân yêu Chi Chi, Thang Thang, Ông Cụ. Lá là
//   `${loại}-${bản}` (vd 'V3-2', 'CC-1').
// - Lá đỏ (7 loại × 4 = 28): Chi Chi, Thang Thang, Ông Cụ, Bát Vạn,
//   Cửu Vạn, Bát Sách, Cửu Sách. Còn lại 92 lá đen.
// - 4–5 người (5 người là chuẩn), mỗi người 20 lá, nhà cái được thêm 1 lá
//   rồi đánh 1 lá mở đầu; nọc: 5 người 19 lá, 4 người 39 lá.
// - Phu (tổ hợp 3+ lá): phu dọc (cùng chất, số liên tiếp ≥ 3), phu bí
//   (3 lá cùng số, 3 chất khác nhau), trùng tam (3 lá giống hệt — cũng là
//   phu dọc/bí suy biến), thiên khai (4 lá giống hệt), phu yêu (≥ 3 lá
//   thuộc nhóm yêu: Nhất Vạn, Nhất Văn, Nhất Sách, Chi Chi, Thang Thang,
//   Ông Cụ), và 6 phu đặc biệt 3 lá: tôm (Thất Văn + Tam Sách + Tam Vạn),
//   lèo (Chi Chi + Bát Sách + Cửu Vạn), Cửu Văn + Nhất Sách + Nhất Vạn,
//   Bát Văn + Nhị Sách + Nhị Vạn, Thang Thang + Cửu Sách + Cửu Vạn,
//   Thang Thang + Cửu Sách + Ông Cụ.
// - Lưng (phu đặc biệt — bắt buộc có ít nhất 1 lưng mới được ù): trùng
//   tam, thiên khai, phu 1-2-3 Văn, và 6 phu đặc biệt trên.
// - Ù: 21 lá (tay + phu đã ăn) chia hết thành các phu và có ít nhất 1 lưng.
//   Ù bằng lá bốc từ nọc, lá ăn ở cửa, lá chíu, hoặc thiên ù (nhà cái ù
//   ngay khi chia bài). Hết nọc mà chưa ai ù thì hòa.
// - Ăn: lấy lá ở cửa (hoặc lá vừa bốc) ghép với 2 lá trên tay thành phu.
// - Chíu: tay có 3 lá giống hệt, lá thứ 4 xuất hiện (bốc hoặc người khác
//   đánh) thì được chíu ngoài lượt (ưu tiên hơn ăn); chíu xong úp 4 lá
//   thành phu rồi đánh 1 lá, lượt tiếp tục từ người chíu.
// - Xin thua kết thúc TRẬN ngay; người thắng = người còn lại có nhiều phu
//   nhất (phu đã ăn + phu trong tay theo greedyCover), hòa nhau thì ghế
//   ngồi sớm hơn thắng — người xin thua không bao giờ thắng.
//
// ĐƠN GIẢN HÓA ĐÃ GHI CHÚ (không có trong luật truyền thống, để game
// chơi mượt như Chắn trong repo này):
// - Không có "bài bốc" (lá lật ngửa ở nọc) và không có khàn chờ ù/khàn
//   trình làng; khàn chỉ xuất hiện khi chíu hoặc khi ù (trùng tam trong
//   bài ù). Không có luật "ù rộng / ù hẹp", "báo", "đền", "tiền gà".

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 5;
export const HAND_SIZE = 20;   // lá chia mỗi người
export const WIN_SIZE = 21;    // lá cần để ù (tay + phu đã ăn)
export const NOCOL_5 = 19;     // nọc khi 5 người (120 − 101)
export const NOCOL_4 = 39;     // nọc khi 4 người (120 − 81)

export const SUITS = ['V', 'W', 'S'];
export const SUIT_NAMES = { V: 'Vạn', W: 'Văn', S: 'Sách' };
export const RANK_NAMES = ['', 'Nhất', 'Nhị', 'Tam', 'Tứ', 'Ngũ', 'Lục', 'Thất', 'Bát', 'Cửu'];
/* 3 quân yêu riêng: Chi Chi (CC), Thang Thang (TT), Ông Cụ (OC) */
export const YEU_TYPES = ['V1', 'W1', 'S1', 'CC', 'TT', 'OC'];
export const RED_TYPES = ['CC', 'TT', 'OC', 'V8', 'V9', 'S8', 'S9'];
/* 6 phu đặc biệt 3 lá (tôm, lèo + 4 phu lẻ khác) */
export const TOM_TRIPLE = ['V3', 'W7', 'S3'];
export const LEO_TRIPLE = ['CC', 'S8', 'V9'];
export const SPECIAL_TRIPLES = [
  ['V3', 'W7', 'S3'],   // tôm
  ['CC', 'S8', 'V9'],   // lèo
  ['V1', 'W9', 'S1'],
  ['V2', 'W8', 'S2'],
  ['TT', 'S9', 'V9'],
  ['TT', 'S9', 'OC'],
];
export const CUOC_NAMES = {
  thien: 'Thiên ù', tom: 'Tôm', leo: 'Lèo', thapdo: 'Thập điều',
  bachdinh: 'Bạch định', kinhcu: 'Kính cụ', chinay: 'Chi nảy',
  khan: 'Khàn', suong: 'Ù suông',
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const typeOf = c => typeof c === 'string' ? c.split('-')[0] : null;
export const rankOf = t => (t === 'CC' || t === 'TT' || t === 'OC') ? 0 : +String(t).slice(1);
export const suitOf = t => (t === 'CC' || t === 'TT' || t === 'OC') ? null : String(t)[0];
export const isYeuType = t => YEU_TYPES.includes(t);
export const isRedType = t => RED_TYPES.includes(t);
export const isRedCard = c => isRedType(typeOf(c));
export function typeName(t) {
  if (t === 'CC') return 'Chi Chi';
  if (t === 'TT') return 'Thang Thang';
  if (t === 'OC') return 'Ông Cụ';
  return RANK_NAMES[rankOf(t)] + ' ' + SUIT_NAMES[suitOf(t)];
}
export const cardName = c => typeName(typeOf(c));

/* ---------- phu ---------- */
/* isPhu(nhóm lá): nhóm ≥ 3 lá có phải 1 phu hợp lệ không (lá = id đầy đủ). */
export function isPhu(group) {
  if (!group || group.length < 3) return false;
  const types = group.map(typeOf);
  if (types.some(t => !t)) return false;
  /* trùng tam / thiên khai: 3 hoặc 4 lá giống hệt */
  if (types.every(t => t === types[0])) return types.length === 3 || types.length === 4;
  /* phu dọc: cùng chất, số liên tiếp, ≥ 3 lá */
  const suits = types.map(suitOf);
  if (suits.every(s => s !== null && s === suits[0])) {
    const ranks = types.map(rankOf).sort((a, b) => a - b);
    let ok = ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1);
    if (ok) return true;
  }
  if (types.length === 3) {
    /* phu bí: cùng số, 3 chất khác nhau (Chi Chi không có chất nên loại) */
    const ranks = types.map(rankOf);
    if (ranks.every(r => r === ranks[0]) && ranks[0] >= 1 && new Set(suits).size === 3) return true;
    /* 6 phu đặc biệt 3 lá */
    const key = types.slice().sort().join(',');
    if (SPECIAL_TRIPLES.some(tr => tr.slice().sort().join(',') === key)) return true;
  }
  /* phu yêu: ≥ 3 lá đều thuộc nhóm yêu */
  if (types.every(isYeuType)) return true;
  return false;
}
/* isTom / isLeo: phu có phải tôm / lèo không */
const sameTriple = (g, tr) => {
  const ts = g.map(typeOf).sort();
  return ts.length === 3 && ts.join(',') === tr.slice().sort().join(',');
};
export const isTom = g => sameTriple(g, TOM_TRIPLE);
export const isLeo = g => sameTriple(g, LEO_TRIPLE);
/* isSpecialTriple: phu có phải 1 trong 6 phu đặc biệt 3 lá không */
export const isSpecialTriple = g => {
  const ts = g.map(typeOf);
  return ts.length === 3 && SPECIAL_TRIPLES.some(tr => sameTriple(g, tr));
};
/* isLung(phu): phu có phải lưng (phu đặc biệt) không — bắt buộc có ≥1 để ù */
export function isLung(group) {
  const types = group.map(typeOf);
  if ((types.length === 3 || types.length === 4) && types.every(t => t === types[0])) return true;
  if (types.length === 3) {
    if (types.slice().sort().join(',') === ['W1', 'W2', 'W3'].join(',')) return true;
    if (isSpecialTriple(group)) return true;
  }
  return false;
}

/* ---------- ứng cử viên phu chứa 1 lá ---------- */
/* Trả về danh sách phu (mảng id lá, lấy từ `rest`) chứa lá `first`, xếp
   theo thứ tự ưu tiên: trùng tam → phu đặc biệt → phu bí → phu dọc
   (ngắn trước) → phu yêu. Dùng cho chia phu chính xác và greedy. */
export function candidatePhu(first, rest) {
  const out = [];
  const ft = typeOf(first);
  const byType = {};
  for (const c of rest) (byType[typeOf(c)] = byType[typeOf(c)] || []).push(c);
  const pick = types => {
    const ids = [];
    for (const ty of types) {
      const avail = (byType[ty] || []).filter(c => !ids.includes(c));
      if (!avail.length) return null;
      ids.push(avail[0]);
    }
    return ids;
  };
  /* trùng tam / thiên khai: 2 lá giống hệt nữa (thiên khai 4 lá cũng thử) */
  {
    const others = (byType[ft] || []).filter(c => c !== first);
    if (others.length >= 2) out.push([first, others[0], others[1]]);
    if (others.length >= 3) out.push([first, others[0], others[1], others[2]]);
  }
  /* 6 phu đặc biệt 3 lá chứa loại của first */
  for (const tr of SPECIAL_TRIPLES) {
    if (!tr.includes(ft)) continue;
    const ids = pick(tr);
    if (ids && ids.includes(first)) out.push(ids);
  }
  /* phu bí: cùng số, 3 chất khác nhau */
  const r = rankOf(ft);
  if (r >= 1) {
    const tri = SUITS.map(s => s + r);
    if (tri.includes(ft) && tri.every(ty => (byType[ty] || []).length)) {
      const ids = pick(tri);
      if (ids && ids.includes(first)) out.push(ids);
    }
  }
  /* phu dọc: chạy cùng chất chứa số của first, dài 3 → 9 (ngắn trước) */
  const s = suitOf(ft);
  if (s) {
    for (let len = 3; len <= 9; len++) {
      for (let start = r - len + 1; start <= r; start++) {
        if (start < 1 || start + len - 1 > 9) continue;
        const types = [];
        for (let k = 0; k < len; k++) types.push(s + (start + k));
        if (!types.includes(ft)) continue;
        const ids = pick(types);
        if (ids && ids.includes(first)) out.push(ids);
      }
    }
  }
  /* phu yêu: first là lá yêu → ghép với 2 lá yêu khác (tối đa 10 ứng viên) */
  if (isYeuType(ft)) {
    const yeu = rest.filter(c => isYeuType(typeOf(c)) && c !== first);
    const seen = new Set();
    let added = 0;
    for (let i = 0; i < yeu.length && added < 10; i++) {
      for (let j = i + 1; j < yeu.length && added < 10; j++) {
        const ids = [first, yeu[i], yeu[j]];
        if (!isPhu(ids)) continue;
        const key = ids.map(typeOf).sort().join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(ids);
        added++;
      }
    }
  }
  return out;
}

/* ---------- chia phu chính xác (backtracking + memo) ---------- */
/* partition21(21 lá) → { phu: [[lá…], …] } hoặc null (không chia được).
   Giới hạn 200k nút để không treo với tay bài xấu. */
export function partition21(cards) {
  if (!cards || cards.length !== WIN_SIZE) return null;
  const memo = new Map();
  let nodes = 0;
  const NODE_CAP = 200000;
  const keyOf = rest => rest.map(typeOf).sort().join(',');
  function rec(rest) {
    if (rest.length === 0) return [];
    if (nodes++ > NODE_CAP) return null;
    const key = keyOf(rest);
    if (memo.has(key)) return memo.get(key);
    const first = rest[0];
    const cands = candidatePhu(first, rest);
    let result = null;
    for (const phu of cands) {
      const next = rest.slice();
      let ok = true;
      for (const c of phu) {
        const idx = next.indexOf(c);
        if (idx === -1) { ok = false; break; }
        next.splice(idx, 1);
      }
      if (!ok) continue;
      const sub = rec(next);
      if (sub) { result = [phu].concat(sub); break; }
    }
    memo.set(key, result);
    return result;
  }
  const out = rec(cards.slice());
  return out ? { phu: out } : null;
}
/* canUu(21 lá): chia được thành phu VÀ có ít nhất 1 lưng */
export function canUu(cards) {
  if (!cards || cards.length !== WIN_SIZE) return false;
  const part = partition21(cards);
  return !!part && part.phu.some(isLung);
}
/* greedyCover(lá): tham lam tách phu (cho bot + tính điểm xin thua).
   Ưu tiên phu DÀI nhất chứa lá đầu tiên (phu dài dùng được nhiều lá
   hơn, giảm què hiệu quả hơn phu ngắn — vd chạy 4 lá tốt hơn chạy 3 lá
   + 1 lá què). */
export function greedyCover(cards) {
  const rest = cards.slice();
  const phu = [];
  while (rest.length >= 3) {
    let found = null;
    for (const c of rest) {
      const cands = candidatePhu(c, rest);
      if (cands.length) {
        /* phu dài nhất (trùng tam/thiên khai 4 lá cũng tính là dài) */
        found = cands.reduce((a, b) => (b.length > a.length ? b : a), cands[0]);
        break;
      }
    }
    if (!found) break;
    phu.push(found);
    for (const c of found) rest.splice(rest.indexOf(c), 1);
  }
  return { phu, que: rest };
}
export const countPhuGreedy = cards => greedyCover(cards).phu.length;
/* eatPairs(tay, lá đích): các cặp lá trên tay ghép với lá đích thành phu
   (loại trùng theo cặp loại — vd 2 bản V3 giống nhau chỉ tính 1 lần) */
export function eatPairs(hand, target) {
  const out = [];
  const seen = new Set();
  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      if (!isPhu([target, hand[i], hand[j]])) continue;
      const key = [typeOf(hand[i]), typeOf(hand[j])].sort().join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push([hand[i], hand[j]]);
    }
  }
  return out;
}
/* canPairWith(lá đích, lá trên tay, tay): lá này có lá khác ghép phu với
   lá đích không (dùng tô sáng lá ăn được trên giao diện) */
export function canPairWith(target, card, hand) {
  return hand.some(c => c !== card && isPhu([target, card, c]));
}

/* ---------- cước khi ù ---------- */
export function computeCuoc(cards21, part, winCard, method, player) {
  const out = [];
  const reds = cards21.filter(isRedCard).length;
  const hasTom = part.phu.some(isTom);
  const hasLeo = part.phu.some(isLeo);
  const hasKhan = part.phu.some(g => {
    const ts = g.map(typeOf);
    return ts.length >= 3 && ts.every(t => t === ts[0]);
  });
  if (method === 'thien') out.push('thien');
  if (hasTom) out.push('tom');
  if (hasLeo) out.push('leo');
  if (reds >= 10) out.push('thapdo');
  if (reds === 0) out.push('bachdinh');
  const redTypes = cards21.map(typeOf).filter(isRedType);
  if (reds === 1 && redTypes[0] === 'OC') out.push('kinhcu');
  if (winCard && typeOf(winCard) === 'CC') out.push('chinay');
  if (hasKhan || (player && player.chiuCount > 0)) out.push('khan');
  const specials = ['thien', 'tom', 'leo', 'thapdo', 'bachdinh', 'kinhcu', 'chinay'];
  if (!out.some(c => specials.includes(c))) out.push('suong');
  return out;
}

/* ---------- trạng thái ván ---------- */
export function buildDeck() {
  const types = [];
  for (const s of SUITS) for (let r = 1; r <= 9; r++) types.push(s + r);
  types.push('CC', 'TT', 'OC');
  const deck = [];
  for (const t of types) for (let k = 1; k <= 4; k++) deck.push(t + '-' + k);
  return deck;
}

function newPlayer(p, i) {
  return {
    id: p.id, name: p.name || ('Người ' + (i + 1)),
    isBot: !!p.isBot, local: !!p.local, level: p.level || null,
    hand: [], melds: [], chiu: false, chiuCount: 0,
  };
}

export function createGame(players, opts = {}) {
  if (!players || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error('Tổ Tôm cần ' + MIN_PLAYERS + '–' + MAX_PLAYERS + ' người chơi');
  }
  const seed = opts.seed == null ? (Date.now() % 2147483647) : opts.seed;
  const rnd = mulberry32(seed);
  const s = {
    gid: 'tt-' + seed + '-' + Math.floor(rnd() * 1e9).toString(36),
    seq: 0, phase: 'playing', turnIdx: 0, turnCount: 0,
    step: 'discard',           // 'discard' | 'draw-or-eat' | 'decide' | 'chiu'
    nocol: [], drawn: null, gate: null, chiuOffer: null,
    players: players.map(newPlayer),
    winner: null, winners: [], losers: [], endReason: null, endCause: null,
    cuoc: [], winCard: null, winMethod: null,
    log: [], startedAt: Date.now(), endedAt: 0, _seed: seed,
  };
  /* xào bài + chia 20 lá mỗi người, nhà cái (ghế 0) thêm 1 lá */
  const deck = buildDeck();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
  }
  for (let k = 0; k < HAND_SIZE; k++) {
    for (const p of s.players) p.hand.push(deck.pop());
  }
  s.players[0].hand.push(deck.pop());
  s.nocol = deck;
  /* thiên ù: nhà cái ù ngay với 21 lá vừa chia (không có lá ù cụ thể) */
  const thienCards = s.players[0].hand.slice();
  if (canUu(thienCards)) {
    const part = partition21(thienCards);
    endGame(s, s.players[0], 'thien', thienCards, part, null);
  } else {
    log(s, 'Ván bắt đầu — ' + s.players[0].name + ' là nhà cái, đánh 1 lá mở đầu.');
  }
  return s;
}

function log(s, text, cls) {
  s.log.push({ text, kind: cls || '' });
  if (s.log.length > 120) s.log.splice(0, s.log.length - 120);
}
const me = s => s.players[s.turnIdx];
function sortHand(p) {
  const order = t => {
    if (t === 'CC') return 0; if (t === 'TT') return 1; if (t === 'OC') return 2;
    return 3 + (SUITS.indexOf(suitOf(t)) * 10 + rankOf(t));
  };
  p.hand.sort((a, b) => order(typeOf(a)) - order(typeOf(b)) || a.localeCompare(b));
}

/* ---------- kết thúc ván ---------- */
function endGame(s, winner, method, winCards, part, winCard) {
  s.phase = 'ended';
  s.winner = winner ? winner.id : null;
  s.winners = winner ? [winner.id] : [];
  s.losers = winner ? s.players.filter(p => p.id !== winner.id).map(p => p.id) : s.players.map(p => p.id);
  s.endReason = 'match';
  s.endCause = method === 'thien' ? 'thien' : (method === 'resign' ? 'resign' : (winCards ? 'uu' : 'draw'));
  s.winCard = winCard || null;
  s.winMethod = method || null;
  if (winner && part) {
    s.cuoc = computeCuoc(winCards, part, winCard, method, winner);
  } else if (winner) {
    s.cuoc = [];
  }
  s.endedAt = Date.now();
  if (winner) {
    const cuocTxt = s.cuoc.length ? ' (' + s.cuoc.map(c => CUOC_NAMES[c]).join(', ') + ')' : '';
    log(s, '🏆 ' + winner.name + ' ù!' + cuocTxt, 'win');
  } else {
    log(s, '🤝 Ván hòa — hết nọc mà chưa ai ù.', 'info');
  }
}

/* thử ù cho người chơi p với lá vừa nhận được (winCard) */
function tryUu(s, p, winCard, method) {
  const cards = p.hand.concat(p.melds.flat());
  if (winCard && !cards.includes(winCard)) cards.push(winCard);
  if (cards.length !== WIN_SIZE) return false;
  const part = partition21(cards);
  if (!part || !part.phu.some(isLung)) return false;
  endGame(s, p, method || 'uu', cards, part, winCard);
  return true;
}

/* tìm người có 3 lá giống hệt với lá vừa xuất hiện (để chíu) */
function findChiu(s, card, excludeId) {
  const ty = typeOf(card);
  for (const p of s.players) {
    if (p.id === excludeId) continue;
    const same = p.hand.filter(c => typeOf(c) === ty);
    if (same.length >= 3) return p;
  }
  return null;
}
/* rao chíu (nếu có) rồi trả về bước tiếp theo nếu không ai chíu */
function maybeOfferChiu(s, card, from, excludeId, nextStep) {
  if (!card) { s.step = nextStep; return; }
  const cand = findChiu(s, card, excludeId);
  if (!cand) { s.step = nextStep; return; }
  s.chiuOffer = { card, candidate: cand.id, from };
  s.step = 'chiu';
}
function advanceTurn(s) {
  s.turnIdx = (s.turnIdx + 1) % s.players.length;
  s.turnCount++;
  s.step = 'draw-or-eat';
  s.drawn = null;
}

/* ---------- người được hành động ---------- */
export function actors(s) {
  if (!s || s.phase !== 'playing') return [];
  if (s.step === 'chiu' && s.chiuOffer) return [s.chiuOffer.candidate];
  return [me(s).id];
}

/* Ăn/chíu mà để tay trống (0 lá) mà không ù thì ván kẹt (không còn lá
   để đánh). Chỉ cho phép nước đó khi 21 lá sau nước đi ù được. */
function eatLeavesEmptyUu(s, p, target, withCards) {
  if (p.hand.length !== 2) return true;
  const cards = p.melds.flat().concat([target].concat(withCards));
  return cards.length === WIN_SIZE && canUu(cards);
}
function chiuLeavesEmptyUu(s, p, offerCard) {
  if (p.hand.length !== 3) return true;
  const ty = typeOf(offerCard);
  const same = p.hand.filter(c => typeOf(c) === ty);
  if (same.length < 3) return false;
  const cards = p.melds.flat().concat([offerCard].concat(same.slice(0, 3)));
  return cards.length === WIN_SIZE && canUu(cards);
}

/* ---------- nước đi hợp lệ ---------- */
export function legalMoves(s, pid) {
  if (!s || s.phase !== 'playing') return [];
  const p = s.players.find(x => x.id === pid);
  if (!p) return [];
  if (s.step === 'chiu' && s.chiuOffer && s.chiuOffer.candidate === pid) {
    const moves = [{ type: 'chiu-pass' }];
    if (chiuLeavesEmptyUu(s, p, s.chiuOffer.card)) moves.unshift({ type: 'chiu' });
    return moves;
  }
  if (me(s).id !== pid) return [];
  if (s.step === 'discard') {
    return p.hand.map(c => ({ type: 'discard', card: c }));
  }
  if (s.step === 'draw-or-eat') {
    const moves = [];
    if (s.gate) {
      for (const [c1, c2] of eatPairs(p.hand, s.gate.card)) {
        if (eatLeavesEmptyUu(s, p, s.gate.card, [c1, c2])) {
          moves.push({ type: 'eat-gate', with: [c1, c2] });
        }
      }
    }
    /* hết nọc mà còn lá ở cửa ăn được thì bắt buộc ăn */
    if (s.nocol.length > 0 || moves.length === 0) moves.push({ type: 'draw' });
    return moves;
  }
  if (s.step === 'decide') {
    const moves = [];
    if (s.drawn) {
      for (const [c1, c2] of eatPairs(p.hand, s.drawn)) {
        if (eatLeavesEmptyUu(s, p, s.drawn, [c1, c2])) {
          moves.push({ type: 'eat-drawn', with: [c1, c2] });
        }
      }
    }
    moves.push({ type: 'leave' });
    return moves;
  }
  return [];
}

/* ---------- áp dụng 1 nước đi ---------- */
export function applyAction(s, pid, act) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'ended' };
  if (!act || typeof act.type !== 'string') return { ok: false, reason: 'bad-action' };
  const p = s.players.find(x => x.id === pid);
  if (!p) return { ok: false, reason: 'no-player' };

  /* xin thua: kết thúc TRẬN ngay (bất cứ lúc nào, kể cả khi chờ chíu) */
  if (act.type === 'resign') {
    const others = s.players.filter(x => x.id !== pid);
    let best = null, bestScore = -1;
    for (const q of others) {
      const score = q.melds.length + countPhuGreedy(q.hand);
      if (score > bestScore) { bestScore = score; best = q; }
    }
    s.phase = 'ended';
    s.winner = best ? best.id : null;
    s.winners = best ? [best.id] : [];
    s.losers = s.players.filter(x => x.id !== (best ? best.id : '')).map(x => x.id);
    s.endReason = 'resign';
    s.endCause = 'resign';
    s.winCard = null; s.winMethod = 'resign'; s.cuoc = [];
    s.endedAt = Date.now();
    log(s, '🏳️ ' + p.name + ' xin thua — ' + (best ? best.name : 'không ai') + ' thắng (nhiều phu nhất).', 'resign');
    s.seq++;
    return { ok: true };
  }

  /* chíu */
  if (s.step === 'chiu' && s.chiuOffer && s.chiuOffer.candidate === pid) {
    if (act.type === 'chiu-pass') {
      const from = s.chiuOffer.from;
      s.chiuOffer = null;
      s.step = from === 'draw' ? 'decide' : 'draw-or-eat';
      if (from === 'discard') advanceTurn(s);
      s.seq++;
      return { ok: true };
    }
    if (act.type === 'chiu') {
      const offer = s.chiuOffer;
      const ty = typeOf(offer.card);
      const same = p.hand.filter(c => typeOf(c) === ty);
      if (same.length < 3) return { ok: false, reason: 'no-khan' };
      if (!chiuLeavesEmptyUu(s, p, offer.card)) return { ok: false, reason: 'empty-hand' };
      const meld = [offer.card].concat(same.slice(0, 3));
      for (const c of same.slice(0, 3)) p.hand.splice(p.hand.indexOf(c), 1);
      p.melds.push(meld);
      p.chiu = true; p.chiuCount++;
      s.chiuOffer = null;
      /* lá chíu bị lấy khỏi cửa / lá vừa bốc */
      if (offer.from === 'discard') s.gate = null;
      if (offer.from === 'draw') s.drawn = null;
      s.turnIdx = s.players.findIndex(x => x.id === pid);
      log(s, '🀄 ' + p.name + ' chíu ' + cardName(offer.card) + '!', 'info');
      if (tryUu(s, p, offer.card, 'chiu')) { s.seq++; return { ok: true }; }
      s.step = 'discard';
      s.seq++;
      return { ok: true };
    }
    return { ok: false, reason: 'not-your-move' };
  }
  if (s.step === 'chiu') return { ok: false, reason: 'chiu-pending' };
  if (me(s).id !== pid) return { ok: false, reason: 'not-your-turn' };

  /* đánh 1 lá (mở đầu ván hoặc sau khi ăn/chíu) */
  if (act.type === 'discard' && s.step === 'discard') {
    const idx = p.hand.indexOf(act.card);
    if (idx === -1) return { ok: false, reason: 'not-in-hand' };
    p.hand.splice(idx, 1);
    s.gate = { card: act.card, by: pid };
    log(s, '🃏 ' + p.name + ' đánh ' + cardName(act.card) + '.');
    sortHand(p);
    maybeOfferChiu(s, act.card, 'discard', pid, 'draw-or-eat');
    if (s.step === 'draw-or-eat') advanceTurn(s);
    s.seq++;
    return { ok: true };
  }

  /* bốc 1 lá từ nọc, hoặc ăn lá ở cửa */
  if (act.type === 'draw' && s.step === 'draw-or-eat') {
    if (s.nocol.length === 0) {
      /* hết nọc mà không ăn được lá ở cửa thì hòa (luật "hết nọc") */
      endGame(s, null, 'draw', null, null, null);
      s.seq++;
      return { ok: true };
    }
    s.drawn = s.nocol.pop();
    log(s, '🎴 ' + p.name + ' bốc 1 lá từ nọc.');
    if (tryUu(s, p, s.drawn, 'draw')) { s.seq++; return { ok: true }; }
    maybeOfferChiu(s, s.drawn, 'draw', pid, 'decide');
    s.seq++;
    return { ok: true };
  }
  if (act.type === 'eat-gate' && s.step === 'draw-or-eat') {
    if (!s.gate) return { ok: false, reason: 'no-gate' };
    const ok = eatCheck(s, p, s.gate.card, act.with);
    if (!ok.ok) return ok;
    const meld = [s.gate.card].concat(act.with);
    for (const c of act.with) p.hand.splice(p.hand.indexOf(c), 1);
    p.melds.push(meld);
    const winCard = s.gate.card;
    s.gate = null;
    log(s, '🍜 ' + p.name + ' ăn ' + cardName(winCard) + ' thành phu.');
    if (tryUu(s, p, winCard, 'eat')) { s.seq++; return { ok: true }; }
    sortHand(p);
    s.step = 'discard';
    s.seq++;
    return { ok: true };
  }

  /* ăn lá vừa bốc, hoặc bỏ qua lá vừa bốc */
  if (act.type === 'eat-drawn' && s.step === 'decide') {
    if (!s.drawn) return { ok: false, reason: 'no-drawn' };
    const ok = eatCheck(s, p, s.drawn, act.with);
    if (!ok.ok) return ok;
    const meld = [s.drawn].concat(act.with);
    for (const c of act.with) p.hand.splice(p.hand.indexOf(c), 1);
    p.melds.push(meld);
    const winCard = s.drawn;
    s.drawn = null;
    log(s, '🍜 ' + p.name + ' ăn lá vừa bốc ' + cardName(winCard) + ' thành phu.');
    if (tryUu(s, p, winCard, 'eat')) { s.seq++; return { ok: true }; }
    sortHand(p);
    s.step = 'discard';
    s.seq++;
    return { ok: true };
  }
  if (act.type === 'leave' && s.step === 'decide') {
    s.gate = { card: s.drawn, by: pid };
    s.drawn = null;
    log(s, '↩️ ' + p.name + ' bỏ qua lá vừa bốc.');
    maybeOfferChiu(s, s.gate.card, 'discard', pid, 'draw-or-eat');
    if (s.step === 'draw-or-eat') advanceTurn(s);
    s.seq++;
    return { ok: true };
  }

  return { ok: false, reason: 'illegal' };
}

/* kiểm tra 1 nước ăn: 2 lá `with` phải ở trên tay và ghép với lá đích
   thành 1 phu; ăn mà để tay trống mà không ù thì bị từ chối (ván sẽ kẹt) */
function eatCheck(s, p, target, withCards) {
  if (!Array.isArray(withCards) || withCards.length !== 2) return { ok: false, reason: 'need-2' };
  if (withCards[0] === withCards[1]) return { ok: false, reason: 'same-card' };
  if (!p.hand.includes(withCards[0]) || !p.hand.includes(withCards[1])) {
    return { ok: false, reason: 'not-in-hand' };
  }
  if (!isPhu([target, withCards[0], withCards[1]])) return { ok: false, reason: 'not-phu' };
  if (!eatLeavesEmptyUu(s, p, target, withCards)) return { ok: false, reason: 'empty-hand' };
  return { ok: true };
}

/* ---------- góc nhìn của 1 người chơi (che bài + nọc) ---------- */
export function viewFor(s, pid) {
  const ended = s.phase === 'ended';
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, turn: me(s).id, turnCount: s.turnCount,
    step: s.step, nocolCount: s.nocol.length, drawn: s.drawn, gate: s.gate,
    chiuOffer: s.chiuOffer,
    players: s.players.map(p => ({
      id: p.id, name: p.name, isBot: p.isBot, local: p.local, level: p.level,
      handCount: p.hand.length, meldCount: p.melds.length,
      hand: (ended || p.id === pid) ? p.hand.slice() : null,
      melds: p.melds.map(m => m.slice()),
      chiu: p.chiu, chiuCount: p.chiuCount,
    })),
    winner: s.winner, winners: s.winners.slice(), losers: s.losers.slice(),
    endReason: s.endReason, endCause: s.endCause, cuoc: s.cuoc.slice(),
    winCard: s.winCard, winMethod: s.winMethod,
    log: s.log.slice(-40), startedAt: s.startedAt, endedAt: s.endedAt, me: pid,
  };
}

export function serialize(s) { return JSON.stringify(s); }
export function deserialize(json) {
  const s = JSON.parse(json);
  if (!s || !Array.isArray(s.players) || !Array.isArray(s.nocol)) throw new Error('bad save');
  return s;
}
export default { createGame, applyAction, viewFor, actors, legalMoves };
