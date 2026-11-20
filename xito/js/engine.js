// 🃏 Xì Tố — Texas Hold'em (thuần logic, không chạm DOM, không chạm ví xu).
// Mỗi người 2 lá tẩy + 5 lá chung (Flop 3, Turn 1, River 1). 4 vòng cược:
// pre-flop, flop, turn, river — Xem / Theo / Tố / Tất tay / Bỏ. Mù nhỏ 5 xu,
// mù lớn 10 xu (chủ phòng chọn chơi vui 0 xu). Mỗi người 200 chip/ván; tiền
// cược (xu) do giao diện trừ/cộng ở ví chung — engine chỉ ghi put/won/net.
let rnd = Math.random;
export function setRandom(f) { rnd = f || Math.random; }
const rand = () => rnd();

export const SUITS = ['S', 'C', 'D', 'H']; // ♠ ♣ ♦ ♥
export const SUIT_SYM = { S: '♠', C: '♣', D: '♦', H: '♥' };
export const RANK_TXT = r => r === 1 ? 'Át' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r);
export const RANK_SHORT = r => r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r);
export const cardText = c => RANK_SHORT(c.r) + SUIT_SYM[c.s];
export const C = (r, s) => ({ r, s, id: RANK_SHORT(r) + s });

export const MIN_PLAYERS = 2, MAX_PLAYERS = 9;
export const STACK = 200; /* chip mỗi người mỗi ván */
export const MIN_RAISE = 10; /* Tố tối thiểu thêm 10 xu trên mức cược hiện tại */
export const OPT_CHOICES = { blinds: [0, 5], maxPlayers: [2, 3, 4, 5, 6, 7, 8, 9], timer: [0, 30, 60] };
export const BLINDS_LABEL = v => v === 0 ? 'chơi vui (0 xu)' : 'mù 5/10 xu';
export const sbOf = o => (o.blinds || 0);
export const bbOf = o => (o.blinds || 0) * 2;
export const STREETS = ['preflop', 'flop', 'turn', 'river'];
export const STREET_NAME = { preflop: 'Pre-flop', flop: 'Flop', turn: 'Turn', river: 'River' };

/* ---------------- bộ bài ---------------- */
export function newDeck() {
  const d = [];
  for (const s of SUITS) for (let r = 1; r <= 13; r++) d.push({ r, s, id: RANK_SHORT(r) + s });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

/* ---------------- tính bài ---------------- */
const hiRank = r => (r === 1 ? 14 : r);
const byHi = (a, b) => hiRank(b.r) - hiRank(a.r);
const rankCounts = cards => { const m = {}; for (const c of cards) m[c.r] = (m[c.r] || 0) + 1; return m; };
/* sảnh 5 lá: trả lá cao nhất (5 cho A-2-3-4-5, 14 cho 10-J-Q-K-A), không phải thì 0 */
function straightHi(cards) {
  const rs = [...new Set(cards.map(c => c.r))].sort((a, b) => a - b);
  if (rs.length !== 5) return 0;
  if (rs[0] === 1 && rs[1] === 10 && rs[2] === 11 && rs[3] === 12 && rs[4] === 13) return 14;
  if (rs[4] - rs[0] === 4) return rs[4] === 5 && rs[0] === 1 ? 5 : rs[4];
  return 0;
}
const isFlush = cards => cards.every(c => c.s === cards[0].s);
const CAT5 = { 9: 'Thùng phá sảnh', 8: 'Tứ quý', 7: 'Cù lũ', 6: 'Thùng', 5: 'Sảnh', 4: 'Sám cô', 3: 'Hai đôi', 2: 'Một đôi', 1: 'Mậu thầu' };
/* Đánh giá 1 tay 5 lá: {cat, tb, label}. 9 thùng phá sảnh > 8 tứ quý > 7 cù lũ > 6 thùng > 5 sảnh > 4 sám > 3 hai đôi > 2 đôi > 1 mậu thầu. */
export function eval5(cards) {
  if (!cards || cards.length !== 5) return { cat: 0, tb: [0], label: 'Chưa đủ bài' };
  const cnt = rankCounts(cards);
  const groups = Object.entries(cnt).map(([r, n]) => ({ r: +r, n })).sort((a, b) => b.n - a.n || hiRank(b.r) - hiRank(a.r));
  const flush = isFlush(cards), stHi = straightHi(cards);
  const desc = [...cards].sort(byHi).map(c => hiRank(c.r));
  const R = r => RANK_TXT(r);
  if (flush && stHi) return { cat: 9, tb: [stHi], label: `Thùng phá sảnh (${stHi === 14 ? 'Át cao' : stHi === 5 ? '5 cao' : R(stHi) + ' cao'})` };
  if (groups[0].n === 4) return { cat: 8, tb: [hiRank(groups[0].r), hiRank(groups[1].r)], label: `Tứ quý ${R(groups[0].r)}` };
  if (groups[0].n === 3 && groups[1].n === 2) return { cat: 7, tb: [hiRank(groups[0].r), hiRank(groups[1].r)], label: `Cù lũ (${R(groups[0].r)} trên ${R(groups[1].r)})` };
  if (flush) return { cat: 6, tb: desc, label: `Thùng (${R(desc[0] === 14 ? 1 : desc[0])} cao)` };
  if (stHi) return { cat: 5, tb: [stHi], label: `Sảnh (${stHi === 14 ? 'Át cao' : stHi === 5 ? '5 cao' : R(stHi) + ' cao'})` };
  if (groups[0].n === 3) return { cat: 4, tb: [hiRank(groups[0].r), ...groups.slice(1).map(g => hiRank(g.r)).sort((a, b) => b - a)], label: `Sám cô ${R(groups[0].r)}` };
  if (groups[0].n === 2 && groups[1].n === 2) return { cat: 3, tb: [hiRank(groups[0].r), hiRank(groups[1].r), hiRank(groups[2].r)], label: `Hai đôi (${R(groups[0].r)} và ${R(groups[1].r)})` };
  if (groups[0].n === 2) return { cat: 2, tb: [hiRank(groups[0].r), ...groups.slice(1).map(g => hiRank(g.r)).sort((a, b) => b - a)], label: `Đôi ${R(groups[0].r)}` };
  return { cat: 1, tb: desc, label: `Mậu thầu (${R(desc[0] === 14 ? 1 : desc[0])} cao)` };
}
/* So 2 tay đã đánh giá: >0 a thắng · <0 b thắng · 0 hòa (chia gà). */
export function compareEval(a, b) {
  if (!a || !b) return 0;
  if (a.cat !== b.cat) return a.cat - b.cat;
  const n = Math.max(a.tb.length, b.tb.length);
  for (let i = 0; i < n; i++) { const d = (a.tb[i] || 0) - (b.tb[i] || 0); if (d) return d; }
  return 0;
}
/* Tay mạnh nhất trong 5–7 lá (2 lá tẩy + lá chung đã lật): duyệt C(n,5) tổ hợp. */
export function best5(cards) {
  if (!cards || cards.length < 5) return null;
  let best = null;
  const n = cards.length;
  const rec = (start, cur) => {
    if (cur.length === 5) {
      const ev = eval5(cur.map(i => cards[i]));
      if (!best || compareEval(ev, best) > 0) best = ev;
      return;
    }
    for (let i = start; i <= n - (5 - cur.length); i++) { cur.push(i); rec(i + 1, cur); cur.pop(); }
  };
  rec(0, []);
  return best;
}
/* Nhãn bài để hiện trong game: >= 5 lá thì tay mạnh nhất; 2 lá thì đôi / đồng chất. */
export function handInfo(cards) {
  if (!cards || !cards.length) return null;
  if (cards.length >= 5) { const ev = best5(cards); return ev ? { cat: ev.cat, label: ev.label } : null; }
  if (cards.length === 2) {
    const [a, b] = cards;
    if (a.r === b.r) return { cat: 0, label: `Đôi ${RANK_TXT(a.r)}` };
    return { cat: 0, label: `${RANK_SHORT(a.r)}${SUIT_SYM[a.s]} ${RANK_SHORT(b.r)}${SUIT_SYM[b.s]}${a.s === b.s ? ' đồng chất' : ''}` };
  }
  return null;
}

/* ---------------- tạo ván ---------------- */
export function cleanOpts(o = {}) {
  const r = { blinds: 5, maxPlayers: 9, timer: 0 };
  for (const k of Object.keys(OPT_CHOICES)) if (o && OPT_CHOICES[k].includes(o[k])) r[k] = o[k];
  return r;
}
const getP = (s, id) => s.players.find(p => p.id === id);
const nameOf = (s, id) => (getP(s, id) || {}).name || '?';
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };
const potOf = s => s.players.reduce((n, p) => n + (p.put || 0), 0);
/* vị trí mù: 2 người thì nhà cái (dealer) là mù nhỏ, người kia mù lớn; >= 3 người thì mù nhỏ = sau dealer, mù lớn = sau nữa. */
export const sbIdx = s => s.players.length === 2 ? s.dealer : (s.dealer + 1) % s.players.length;
export const bbIdx = s => s.players.length === 2 ? (s.dealer + 1) % s.players.length : (s.dealer + 2) % s.players.length;
/* người hành động đầu tiên pre-flop: 2 người thì dealer (mù nhỏ) đi trước; >= 3 người thì người sau mù lớn. */
const utgIdx = s => s.players.length === 2 ? s.dealer : (s.dealer + 3) % s.players.length;
/* người còn chơi (chưa Bỏ, chưa Tất tay) tiếp theo sau ghế fromIdx, -1 nếu không còn ai. */
const nextActiveIdx = (s, fromIdx) => {
  const n = s.players.length;
  for (let k = 1; k <= n; k++) { const p = s.players[(fromIdx + k) % n]; if (!p.folded && !p.allIn) return (fromIdx + k) % n; }
  return -1;
};
export const blindDueFor = (s, pid) => {
  if (s.phase !== 'blinds') return 0;
  if (pid === s.players[sbIdx(s)].id) return sbOf(s.opts);
  if (pid === s.players[bbIdx(s)].id) return bbOf(s.opts);
  return 0;
};
/* thông tin hành động hợp lệ của 1 người (bot + giao diện cùng dùng): */
export function actionInfo(s, pid) {
  const p = getP(s, pid);
  if (!p || s.phase !== 'bet' || s.turn !== pid || p.folded || p.allIn) return null;
  const toCall = Math.max(0, s.toCall - p.bet);
  return {
    canCheck: toCall === 0,
    toCall,
    callCost: Math.min(toCall, p.stack),
    minRaiseTo: Math.min(s.toCall + MIN_RAISE, p.bet + p.stack),
    maxRaiseTo: p.bet + p.stack,
    stack: p.stack,
  };
}
export function createGame(players, opts = {}) {
  const o = cleanOpts(opts);
  if (!players || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) throw new Error('Xì Tố chơi 2–9 người.');
  if (players.length > o.maxPlayers) throw new Error(`Phòng này tối đa ${o.maxPlayers} người.`);
  const deck = newDeck();
  const bb = bbOf(o);
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0, round: 1,
    phase: bb > 0 ? 'blinds' : 'bet',
    street: 'preflop',
    dealer: 0,
    turn: null,
    toCall: 0,
    community: [],
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null, cards: [], stack: STACK, put: 0, bet: 0, folded: false, allIn: false, acted: false, blindPosted: false, res: null })),
    deck, winners: [], winnerIds: [], endReason: null, winLabel: '',
    log: [], opts: o,
  };
  /* chia 2 lá tẩy mỗi người, vòng tròn từ sau nhà cái */
  const n = players.length;
  const start = 1 % n;
  for (let r = 0; r < 2; r++) for (let k = 0; k < n; k++) getP(s, players[(start + k) % n].id).cards.push(s.deck.pop());
  if (bb > 0) {
    s.turn = s.players[sbIdx(s)].id;
  } else {
    s.turn = s.players[utgIdx(s)].id;
  }
  pushLog(s, `🃏 Ván ${s.round}: ${n} người, mỗi người ${STACK} chip. ${bb > 0 ? `Mù nhỏ ${sbOf(o)} xu, mù lớn ${bb} xu.` : 'Chơi vui (0 xu) — không cần góp mù.'}`);
  return s;
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < MIN_PLAYERS || s.players.length > MAX_PLAYERS || !Array.isArray(s.deck)) throw new Error('Trạng thái Xì Tố không hợp lệ.');
  return s;
}

/* ---------------- kết thúc ván ---------------- */
function finishFoldwin(s) {
  const alive = s.players.filter(p => !p.folded);
  const pot = potOf(s);
  const w = alive[0];
  s.phase = 'ended';
  s.winnerIds = w && (pot - w.put) > 0 ? [w.id] : [];
  s.winners = s.winnerIds;
  s.endReason = 'foldwin';
  for (const p of s.players) {
    const won = p.id === (w && w.id) ? pot : 0;
    const net = won - p.put;
    p.res = {
      r: p.folded ? 'fold' : net > 0 ? 'win' : net === 0 ? 'draw' : 'lose',
      won, net, put: p.put, allin: !!p.allIn,
      handCat: null, handLabel: null,
      label: p.folded ? 'Đã Bỏ' : net > 0 ? `Hốt ${won} xu (mọi người Bỏ)` : 'Hòa gà',
    };
  }
  s.winLabel = w ? `${w.name} thắng ${pot} xu — mọi người khác đều Bỏ, không cần lật bài!` : 'Ván kết thúc.';
  s.seq++;
  pushLog(s, '🏁 ' + s.winLabel, 'win');
}
function showdown(s) {
  /* tay mạnh nhất của từng người còn bài */
  for (const p of s.players) {
    if (!p.folded) { const ev = best5([...p.cards, ...s.community]); p.hand = ev; }
    else p.hand = null;
  }
  /* chia gà theo từng lớp (side pot): mỗi lớp là phần gà mà mọi người đều
     góp tới mức đó; ai Tất tay ít xu hơn chỉ được chia lớp tới mức mình góp. */
  const won = {};
  const thresholds = [...new Set(s.players.filter(p => p.put > 0).map(p => p.put))].sort((a, b) => a - b);
  let prev = 0;
  for (const t of thresholds) {
    let layerPot = 0;
    for (const p of s.players) layerPot += Math.min(p.put, t) - Math.min(p.put, prev);
    const elig = s.players.filter(p => !p.folded && p.put >= t && p.hand);
    if (elig.length && layerPot > 0) {
      let bestEv = null;
      for (const p of elig) if (!bestEv || compareEval(p.hand, bestEv) > 0) bestEv = p.hand;
      const winners = elig.filter(p => compareEval(p.hand, bestEv) === 0);
      /* chia đều, xu lẻ cho người ngồi sau nhà cái trước */
      const share = Math.floor(layerPot / winners.length);
      let rem = layerPot - share * winners.length;
      const ordered = winners.slice().sort((a, b) => {
        const ia = s.players.indexOf(a), ib = s.players.indexOf(b);
        return ((ia - s.dealer + s.players.length) % s.players.length) - ((ib - s.dealer + s.players.length) % s.players.length);
      });
      for (const w of ordered) { won[w.id] = (won[w.id] || 0) + share + (rem > 0 ? 1 : 0); if (rem > 0) rem--; }
    }
    prev = t;
  }
  s.phase = 'ended';
  const winIds = [];
  for (const p of s.players) {
    const w = won[p.id] || 0;
    const net = w - p.put;
    if (net > 0) winIds.push(p.id);
    p.res = {
      r: p.folded ? 'fold' : net > 0 ? 'win' : net === 0 ? 'draw' : 'lose',
      won: w, net, put: p.put, allin: !!p.allIn,
      handCat: p.hand ? p.hand.cat : null, handLabel: p.hand ? p.hand.label : null,
      label: p.folded ? 'Đã Bỏ' : p.hand ? `${p.hand.label} — ${net > 0 ? `+${net} xu` : net < 0 ? `${net} xu` : 'hòa gà'}` : '—',
    };
  }
  s.winnerIds = winIds;
  s.winners = winIds;
  s.endReason = winIds.length ? 'showdown' : 'draw';
  if (winIds.length === 1) {
    const w = getP(s, winIds[0]);
    s.winLabel = `${w.name} thắng ${won[w.id]} xu với ${w.hand.label}!`;
  } else if (winIds.length > 1) {
    s.winLabel = `${winIds.map(id => nameOf(s, id)).join(' & ')} chia gà — bài bằng nhau!`;
  } else {
    s.winLabel = 'Hòa gà — không ai hơn ai!';
  }
  s.seq++;
  pushLog(s, '🏁 ' + s.winLabel, 'win');
}
function streetDone(s) {
  const act = s.players.filter(p => !p.folded && !p.allIn);
  return act.every(p => p.acted && p.bet === s.toCall);
}
function advanceStreet(s) {
  for (const p of s.players) { p.bet = 0; p.acted = false; }
  s.toCall = 0;
  if (s.street === 'preflop') {
    s.community.push(s.deck.pop(), s.deck.pop(), s.deck.pop());
    s.street = 'flop';
    pushLog(s, `🃏 Flop: ${s.community.map(cardText).join(' ')}`);
  } else if (s.street === 'flop') {
    s.community.push(s.deck.pop());
    s.street = 'turn';
    pushLog(s, `🃏 Turn: ${cardText(s.community[3])}`);
  } else if (s.street === 'turn') {
    s.community.push(s.deck.pop());
    s.street = 'river';
    pushLog(s, `🃏 River: ${cardText(s.community[4])}`);
  } else { showdown(s); return; }
  const idx = nextActiveIdx(s, s.dealer);
  if (idx < 0) { advanceStreet(s); return; } /* mọi người còn lại đều Tất tay: lật nốt bài chung */
  s.turn = s.players[idx].id;
}

/* ---------------- hành động ---------------- */
// a: {type:'blind', amount} | {type:'xem'} | {type:'theo'} | {type:'to', amount} | {type:'allin'} | {type:'bo'}
export function applyAction(s, pid, a) {
  const p = getP(s, pid);
  if (!p) return { ok: false, reason: 'Không có người chơi này.' };
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  if (s.phase === 'ended') return { ok: false, reason: 'Ván đã kết thúc rồi.' };
  if (p.folded) return { ok: false, reason: 'Bạn đã Bỏ rồi.' };
  if (p.allIn) return { ok: false, reason: 'Bạn đã Tất tay rồi, chỉ chờ lật bài.' };
  if (s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };

  if (s.phase === 'blinds') {
    if (a.type !== 'blind') return { ok: false, reason: 'Đang góp mù — chưa cược được.' };
    if (p.blindPosted) return { ok: false, reason: 'Bạn đã góp mù rồi.' };
    const due = blindDueFor(s, pid);
    const amt = Math.max(0, Math.min(Math.floor(+a.amount || 0), due, p.stack));
    p.blindPosted = true;
    if (amt <= 0) {
      p.folded = true;
      pushLog(s, `🙈 ${p.name} không góp được mù (${due} xu) — Bỏ luôn ván này.`);
    } else {
      p.put += amt; p.bet += amt; p.stack -= amt;
      if (p.stack === 0) p.allIn = true;
      pushLog(s, `🪙 ${p.name} góp mù ${amt} xu${amt < due ? ' (Tất tay, chỉ có từng ấy xu)' : ''}.`);
    }
    s.seq++;
    if (s.players.filter(q => !q.folded).length <= 1) { finishFoldwin(s); return { ok: true, ended: true }; }
    /* chuyển sang người góp mù tiếp theo, hoặc bắt đầu vòng pre-flop */
    const sbI = sbIdx(s), bbI = bbIdx(s);
    if (!getP(s, s.players[sbI].id).blindPosted) s.turn = s.players[sbI].id;
    else if (!getP(s, s.players[bbI].id).blindPosted) s.turn = s.players[bbI].id;
    else {
      s.phase = 'bet';
      s.street = 'preflop';
      s.toCall = bbOf(s.opts);
      /* UTG là người còn chơi đầu tiên từ sau mù lớn (mù nhỏ có thể đã Tất
         tay thiếu xu hoặc Bỏ vì không góp được) */
      const n = s.players.length;
      const uti = utgIdx(s);
      let found = -1;
      for (let k = 0; k < n; k++) { const p = s.players[(uti + k) % n]; if (!p.folded && !p.allIn) { found = (uti + k) % n; break; } }
      if (found < 0) { advanceStreet(s); return { ok: true, ended: s.phase === 'ended' }; }
      s.turn = s.players[found].id;
      pushLog(s, `⚔️ Vòng Pre-flop — mức cược hiện tại ${s.toCall} xu, tới lượt ${nameOf(s, s.turn)}.`);
    }
    return { ok: true, ended: false };
  }

  /* --- vòng cược --- */
  if (s.phase !== 'bet') return { ok: false, reason: 'Chưa tới vòng cược.' };
  const toCall = Math.max(0, s.toCall - p.bet);
  const put = amt => { p.put += amt; p.bet += amt; p.stack -= amt; if (p.stack === 0) p.allIn = true; };
  if (a.type === 'bo') {
    p.folded = true;
    pushLog(s, `🙈 ${p.name} Bỏ bài.`);
  } else if (a.type === 'xem') {
    if (toCall !== 0) return { ok: false, reason: 'Đang có người Tố — không Xem được, phải Theo hoặc Bỏ.' };
    pushLog(s, `👌 ${p.name} Xem (không cược thêm).`);
  } else if (a.type === 'theo') {
    const cost = Math.min(toCall, p.stack);
    put(cost);
    pushLog(s, `🤝 ${p.name} Theo ${cost} xu${p.allIn ? ' — Tất tay!' : ''}.`);
  } else if (a.type === 'to') {
    const amount = Math.floor(+a.amount || 0);
    if (!(amount > s.toCall)) return { ok: false, reason: 'Tố phải cao hơn mức cược hiện tại.' };
    if (amount < s.toCall + MIN_RAISE && amount !== p.bet + p.stack) return { ok: false, reason: `Tố tối thiểu lên ${s.toCall + MIN_RAISE} xu (hoặc Tất tay).` };
    const cost = amount - p.bet;
    if (cost <= 0 || cost > p.stack) return { ok: false, reason: 'Không đủ chip để Tố tới mức đó.' };
    put(cost);
    s.toCall = amount;
    for (const q of s.players) if (q.id !== pid && !q.folded && !q.allIn) q.acted = false; /* có người Tố: mọi người phải hành động lại */
    pushLog(s, `🔥 ${p.name} Tố lên ${amount} xu${p.allIn ? ' — Tất tay!' : ''}.`);
  } else if (a.type === 'allin') {
    if (p.stack <= 0) return { ok: false, reason: 'Bạn hết chip rồi.' };
    const cost = p.stack;
    put(cost);
    if (p.bet > s.toCall) {
      s.toCall = p.bet;
      for (const q of s.players) if (q.id !== pid && !q.folded && !q.allIn) q.acted = false;
    }
    pushLog(s, `🔥 ${p.name} Tất tay ${cost} xu!`);
  } else {
    return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
  p.acted = true;
  s.seq++;
  if (s.players.filter(q => !q.folded).length <= 1) { finishFoldwin(s); return { ok: true, ended: true }; }
  if (streetDone(s)) { advanceStreet(s); return { ok: true, ended: s.phase === 'ended' }; }
  /* chuyển lượt sang người còn chơi tiếp theo chưa hành động / chưa đủ cược */
  const n = s.players.length;
  const curIdx = s.players.findIndex(q => q.id === pid);
  for (let k = 1; k <= n; k++) {
    const q = s.players[(curIdx + k) % n];
    if (!q.folded && !q.allIn && (!q.acted || q.bet < s.toCall)) { s.turn = q.id; return { ok: true, ended: false }; }
  }
  /* không còn ai cần hành động nữa (phòng hờ): sang đường khác */
  advanceStreet(s);
  return { ok: true, ended: s.phase === 'ended' };
}

/* ai đang phải hành động (để hẹn bot / người rớt mạng) */
export function actors(s) {
  if (s.phase !== 'blinds' && s.phase !== 'bet') return [];
  return s.turn ? [s.turn] : [];
}

/* ---------------- góc nhìn từng người (giấu bài người khác) ---------------- */
export function viewFor(s, pid) {
  const end = s.phase === 'ended';
  const me = getP(s, pid);
  const pot = potOf(s);
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, street: s.street, dealer: s.dealer,
    turn: s.turn, toCall: s.toCall, minRaise: MIN_RAISE, pot,
    blinds: s.opts.blinds, maxPlayers: s.opts.maxPlayers, timer: s.opts.timer,
    blindDue: s.phase === 'blinds' && s.turn ? blindDueFor(s, s.turn) : 0,
    me: pid,
    community: s.community.map(c => ({ ...c })),
    you: me ? {
      id: me.id, cards: me.cards.map(c => ({ ...c })), stack: me.stack, put: me.put, bet: me.bet,
      folded: me.folded, allIn: me.allIn, acted: me.acted, blindPosted: me.blindPosted,
      toCall: s.phase === 'bet' ? Math.max(0, s.toCall - me.bet) : (s.phase === 'blinds' && s.turn === me.id ? blindDueFor(s, me.id) : 0),
      hand: handInfo([...me.cards, ...s.community]),
      res: end ? me.res : null,
    } : null,
    players: s.players.map(p => {
      const open = p.id === pid || (end && !p.folded);
      return {
        id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
        stack: p.stack, put: p.put, bet: p.bet, folded: p.folded, allIn: p.allIn, acted: p.acted, blindPosted: p.blindPosted,
        cards: open ? p.cards.map(c => ({ ...c })) : null,
        hand: (end && !p.folded && p.hand) ? { cat: p.hand.cat, label: p.hand.label } : null,
        res: end ? p.res : null,
      };
    }),
    winners: s.winners, winnerIds: s.winnerIds,
    endReason: s.endReason, winLabel: s.winLabel,
    log: s.log.slice(-30),
  };
}
