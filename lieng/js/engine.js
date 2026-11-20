// 🃏 Liêng — luật chơi (thuần logic, không chạm DOM, không chạm ví xu).
// Mỗi người 3 lá. Thứ tự bài từ to xuống nhỏ:
//   Sáp (3 lá cùng số, Át to nhất) > Liêng (3 lá liên tiếp, Q-K-Át to nhất,
//   Át-2-3 nhỏ nhất) > Ảnh (3 lá tây J/Q/K, không liên tiếp) > Điểm
//   (tổng điểm 3 lá lấy chữ số hàng đơn vị; Át = 1, 2–9 đúng số, 10/J/Q/K = 10).
// Bằng bậc thì so lá to nhất, rồi so chất (♠ > ♥ > ♦ > ♣).
// Một ván: góp gà (ante) → chia 3 lá → 1 vòng cược (Tố / Theo / Bỏ) → lật
// bài, bài to nhất hốt gà; mọi người cùng Bỏ thì người còn lại hốt gà mà
// không cần lật. Tiền cược (xu) do giao diện trừ/cộng ở ví chung — engine
// chỉ ghi số xu mỗi người đã góp (contrib) và gà (pot), không đụng ví.
let rnd = Math.random;
export function setRandom(f) { rnd = f || Math.random; }
const rand = () => rnd();

export const SUITS = ['S', 'C', 'D', 'H']; // ♠ ♣ ♦ ♥
export const SUIT_SYM = { S: '♠', C: '♣', D: '♦', H: '♥' };
export const SUIT_ORDER = { S: 4, H: 3, D: 2, C: 1 }; // so chất: Bích > Cơ > Rô > Chuồn
export const RANK_TXT = r => r === 1 ? 'Át' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r);
export const RANK_SHORT = r => r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r);
export const cardText = c => RANK_SHORT(c.r) + SUIT_SYM[c.s];

export const MIN_PLAYERS = 2, MAX_PLAYERS = 6;
export const OPT_CHOICES = { ante: [0, 5, 10], maxPlayers: [2, 3, 4, 5, 6], timer: [0, 30, 60] };
export const RAISES = [5, 10]; /* Tố thêm 5 hoặc 10 xu */

/* ---------------- bộ bài ---------------- */
export function newDeck() {
  const d = [];
  for (const s of SUITS) for (let r = 1; r <= 13; r++) d.push({ r, s, id: RANK_SHORT(r) + s });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

/* ---------------- tính bài ---------------- */
export const cardPts = c => (c.r === 1 ? 1 : c.r >= 10 ? 10 : c.r); /* Át 1, 2–9 đúng số, 10/J/Q/K = 10 */
export const isFace = c => c.r >= 11;
const hiRank = r => (r === 1 ? 14 : r); /* so lá to nhất: Át to nhất */
const hiOf = cards => cards.reduce((b, c) => (!b || hiRank(c.r) > hiRank(b.r) || (hiRank(c.r) === hiRank(b.r) && SUIT_ORDER[c.s] > SUIT_ORDER[b.s]) ? c : b), null);
const sortedRanks = cards => cards.map(c => c.r).sort((a, b) => a - b);
/* Liêng (sảnh 3 lá): (1,2,3), (2,3,4), …, (11,12,13), (12,13,1). Trả lá to nhất (3 cho Át-2-3, 14 cho Q-K-Át), không phải thì 0. */
function straightHi(cards) {
  if (cards.length !== 3) return 0;
  const rs = sortedRanks(cards);
  if (rs[0] + 1 === rs[1] && rs[1] + 1 === rs[2]) return rs[2];
  if (rs[0] === 1 && rs[1] === 12 && rs[2] === 13) return 14; /* Q-K-Át */
  return 0;
}
/* Thông tin 1 tay bài: { kind: 'sap'|'lieng'|'anh'|'diem', pts, tier, hi, label }.
   tier: Sáp 4 > Liêng 3 > Ảnh 2 > Điểm 1. hi: số để so trong cùng bậc. */
export function handInfo(cards) {
  if (!cards || cards.length !== 3) return { kind: 'diem', pts: 0, tier: 0, hi: 0, label: 'Chưa đủ bài' };
  const pts = cards.reduce((t, c) => t + cardPts(c), 0) % 10;
  const sap = cards.every(c => c.r === cards[0].r);
  const stHi = straightHi(cards);
  const anh = !sap && !stHi && cards.every(isFace);
  const best = hiOf(cards);
  if (sap) return { kind: 'sap', pts, tier: 4, hi: hiRank(cards[0].r), label: 'Sáp ' + RANK_TXT(cards[0].r) };
  if (stHi) return { kind: 'lieng', pts, tier: 3, hi: stHi, label: 'Liêng ' + (stHi === 14 ? 'Q-K-Át' : stHi === 3 ? 'Át-2-3' : RANK_TXT(stHi - 2) + '-' + RANK_TXT(stHi - 1) + '-' + RANK_TXT(stHi)) };
  if (anh) return { kind: 'anh', pts, tier: 2, hi: hiRank(best.r) * 10 + SUIT_ORDER[best.s], label: 'Ảnh (3 lá tây)' };
  return { kind: 'diem', pts, tier: 1, hi: pts * 100 + hiRank(best.r) * 10 + SUIT_ORDER[best.s], label: pts === 0 ? 'Bù (0 nút)' : pts + ' nút' };
}
/* So 2 tay bài. >0: a thắng · <0: b thắng · 0: hoà tuyệt đối. */
export function compareHands(a, b) {
  const A = handInfo(a), B = handInfo(b);
  if (A.tier !== B.tier) return { c: A.tier - B.tier, why: 'bậc bài' };
  if (A.hi !== B.hi) return { c: A.hi - B.hi, why: A.kind === 'sap' ? 'sáp to hơn' : A.kind === 'lieng' ? 'liêng cao hơn' : A.kind === 'anh' ? 'ảnh to hơn' : 'điểm cao hơn' };
  /* cùng bậc, cùng hi: so chất của lá to nhất */
  const ka = hiOf(a), kb = hiOf(b);
  if (SUIT_ORDER[ka.s] !== SUIT_ORDER[kb.s]) return { c: SUIT_ORDER[ka.s] - SUIT_ORDER[kb.s], why: 'chất to hơn' };
  return { c: 0, why: 'hoà' };
}
export const KIND_NAME = { sap: 'Sáp', lieng: 'Liêng', anh: 'Ảnh', diem: 'Điểm' };

/* ---------------- tạo ván ---------------- */
export function cleanOpts(o = {}) {
  const r = { ante: 5, maxPlayers: 6, timer: 0 };
  for (const k of Object.keys(OPT_CHOICES)) if (o && OPT_CHOICES[k].includes(o[k])) r[k] = o[k];
  return r;
}
export function createGame(players, opts = {}) {
  const o = cleanOpts(opts);
  if (!players || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) throw new Error('Liêng chơi 2–6 người.');
  if (players.length > o.maxPlayers) throw new Error(`Phòng này tối đa ${o.maxPlayers} người.`);
  const deck = newDeck();
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0, round: 1,
    phase: o.ante === 0 ? 'bet' : 'ante', /* cược 0 xu: bỏ qua bước góp gà */
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null, cards: [], folded: false, contrib: 0, paid: o.ante === 0, free: false, acted: false, res: null })),
    deck, pot: 0, currentBet: o.ante, dealerId: players[0].id, turn: null, lastRaiser: null,
    raises: 0, /* mỗi vòng cược chỉ được Tố tối đa 3 lần (kẻo Tố qua Tố lại mãi không hết ván) */
    winners: [], winnerIds: [], endReason: null, winLabel: '', hands: null,
    log: [], opts: o,
  };
  /* chia 3 lá mỗi người, vòng tròn từ sau nhà cái */
  const ids = players.map(p => p.id);
  const start = 1 % ids.length;
  for (let r = 0; r < 3; r++) for (let k = 0; k < ids.length; k++) getP(s, ids[(start + k) % ids.length]).cards.push(s.deck.pop());
  if (o.ante === 0) {
    s.turn = ids[start];
    pushLog(s, `🃏 Ván ${s.round}: chơi vui không cược — ${nameOf(s, s.turn)} tố trước.`);
  } else {
    pushLog(s, `🃏 Ván ${s.round}: mỗi người góp ${o.ante} xu vào gà, rồi tố 1 vòng.`);
  }
  return s;
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < MIN_PLAYERS || s.players.length > MAX_PLAYERS || !Array.isArray(s.deck)) throw new Error('Trạng thái Liêng không hợp lệ.');
  return s;
}
const getP = (s, id) => s.players.find(p => p.id === id);
const nameOf = (s, id) => (getP(s, id) || {}).name || '?';
const active = s => s.players.filter(p => !p.folded);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };
export const toCallOf = (s, pid) => Math.max(0, s.currentBet - ((getP(s, pid) || {}).contrib || 0));
/* người tiếp theo sau pid trong vòng ghế (chỉ tính người chưa Bỏ) */
function nextActive(s, pid) {
  const ps = s.players, i = ps.findIndex(p => p.id === pid);
  for (let k = 1; k <= ps.length; k++) { const p = ps[(i + k) % ps.length]; if (!p.folded) return p.id; }
  return null;
}
function betRoundDone(s) {
  const act = active(s);
  if (act.length <= 1) return false;
  return act.every(p => p.acted && p.contrib === s.currentBet);
}
function finishByFold(s, winnerId) {
  const w = getP(s, winnerId);
  endHand(s, [winnerId], 'fold-win', `${w.name} hốt gà — mọi người khác đều Bỏ, không cần lật bài! 🙈`);
}
function showdown(s) {
  const act = active(s);
  const infos = {};
  for (const p of act) infos[p.id] = handInfo(p.cards);
  /* người được chia gà: bài to nhất trong số người ĐÃ góp (người chơi
     không góp được (free) vẫn được lật bài nhưng không được chia gà). */
  const eligible = act.filter(p => !p.free);
  const pool = eligible.length ? eligible : [];
  let best = [];
  for (const p of pool) {
    if (!best.length) { best = [p.id]; continue; }
    const c = compareHands(p.cards, getP(s, best[0]).cards).c;
    if (c > 0) best = [p.id]; else if (c === 0) best.push(p.id);
  }
  const bestHand = best.length ? infos[best[0]] : (act.length ? infos[act.slice().sort((a, b) => compareHands(b.cards, a.cards).c)[0].id] : null);
  endHand(s, best, 'showdown', best.length
    ? `${best.map(id => nameOf(s, id)).join(' & ')} thắng với ${bestHand.label}${best.length > 1 ? ' — chia đều gà!' : ''}!`
    : 'Không ai đủ điều kiện chia gà — gà trôi mất tiêu!');
  return infos;
}
function endHand(s, winnerIds, reason, label) {
  s.phase = 'ended'; s.winnerIds = winnerIds; s.winners = winnerIds; s.endReason = reason; s.winLabel = label;
  s.hands = {};
  for (const p of s.players) if (!p.folded) s.hands[p.id] = handInfo(p.cards);
  const share = winnerIds.length ? Math.floor(s.pot / winnerIds.length) : 0;
  let rem = winnerIds.length ? s.pot - share * winnerIds.length : 0;
  for (const p of s.players) {
    const info = s.hands[p.id] || null;
    if (winnerIds.includes(p.id)) {
      const got = share + (rem > 0 ? 1 : 0); if (rem > 0) rem--;
      p.res = { r: 'win', delta: got - p.contrib, share: got, kind: info ? info.kind : null, pts: info ? info.pts : 0, label: info ? info.label : '', why: reason === 'fold-win' ? 'Mọi người khác đều Bỏ' : (winnerIds.length > 1 ? `Chia gà ${winnerIds.length} người` : `Hốt gà ${got} xu`) };
    } else if (p.folded) {
      p.res = { r: 'fold', delta: -p.contrib, share: 0, kind: info ? info.kind : null, pts: info ? info.pts : 0, label: '', why: 'Đã Bỏ' };
    } else if (p.free) {
      /* bài to nhất nhưng không góp: thắng ván bài, không được chia gà */
      const bestFree = !winnerIds.length || compareHands(p.cards, getP(s, winnerIds[0]).cards).c > 0;
      p.res = { r: bestFree ? 'winhand' : 'lose', delta: -p.contrib, share: 0, kind: info ? info.kind : null, pts: info ? info.pts : 0, label: info ? info.label : '', why: bestFree ? 'Bài to nhất nhưng không góp gà nên không được chia' : 'Thua bài' };
    } else {
      p.res = { r: 'lose', delta: -p.contrib, share: 0, kind: info ? info.kind : null, pts: info ? info.pts : 0, label: info ? info.label : '', why: 'Thua bài' };
    }
  }
  s.seq++;
  pushLog(s, '🏁 ' + label, 'win');
}

/* ---------------- hành động ---------------- */
// a: {type:'ante'} | {type:'ante-free'} | {type:'bo'} | {type:'theo'} | {type:'to', raise: 5|10}
export function applyAction(s, pid, a) {
  const p = getP(s, pid);
  if (!p) return { ok: false, reason: 'Không có người chơi này.' };
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'ante': {
      if (s.phase !== 'ante') return { ok: false, reason: 'Không phải lúc góp gà.' };
      if (p.paid) return { ok: false, reason: 'Bạn đã góp gà rồi.' };
      p.paid = true; p.contrib += s.opts.ante; s.pot += s.opts.ante; s.seq++;
      pushLog(s, `🐔 ${p.name} góp ${s.opts.ante} xu vào gà.`);
      maybeStartBet(s);
      return { ok: true };
    }
    case 'ante-free': {
      if (s.phase !== 'ante') return { ok: false, reason: 'Không phải lúc góp gà.' };
      if (p.paid) return { ok: false, reason: 'Bạn đã góp gà rồi.' };
      p.paid = true; p.free = true; s.seq++;
      pushLog(s, `🆓 ${p.name} không đủ xu góp gà — chơi ván này không được chia gà.`);
      maybeStartBet(s);
      return { ok: true };
    }
    case 'bo': {
      if (s.phase !== 'bet') return { ok: false, reason: 'Chưa tới vòng cược.' };
      if (s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
      if (p.folded) return { ok: false, reason: 'Bạn đã Bỏ rồi.' };
      p.folded = true; p.acted = true; s.seq++;
      pushLog(s, `🙈 ${p.name} Bỏ — úp bài, chờ ván sau.`);
      if (active(s).length === 1) { finishByFold(s, active(s)[0].id); return { ok: true, ended: true }; }
      advanceTurn(s);
      return { ok: true };
    }
    case 'theo': {
      if (s.phase !== 'bet') return { ok: false, reason: 'Chưa tới vòng cược.' };
      if (s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
      if (p.folded) return { ok: false, reason: 'Bạn đã Bỏ rồi.' };
      const cost = toCallOf(s, pid);
      p.contrib += cost; s.pot += cost; p.acted = true; s.seq++;
      pushLog(s, cost > 0 ? `🤝 ${p.name} Theo ${cost} xu.` : `👌 ${p.name} Theo (không cần thêm xu).`);
      if (betRoundDone(s)) { showdown(s); return { ok: true, ended: true }; }
      advanceTurn(s);
      return { ok: true };
    }
    case 'to': {
      if (s.phase !== 'bet') return { ok: false, reason: 'Chưa tới vòng cược.' };
      if (s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
      if (p.folded) return { ok: false, reason: 'Bạn đã Bỏ rồi.' };
      if ((s.raises || 0) >= 3) return { ok: false, reason: 'Mỗi vòng chỉ được Tố tối đa 3 lần.' };
      const raise = RAISES.includes(+a.raise) ? +a.raise : 5;
      const cost = toCallOf(s, pid) + raise;
      s.currentBet += raise; s.raises = (s.raises || 0) + 1;
      p.contrib += cost; s.pot += cost; s.lastRaiser = pid; s.seq++;
      for (const q of active(s)) if (q.id !== pid) q.acted = false;
      p.acted = true;
      pushLog(s, `🔥 ${p.name} Tố thêm ${raise} xu (gà đang ${s.currentBet} xu)!`);
      advanceTurn(s);
      return { ok: true };
    }
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}
function maybeStartBet(s) {
  if (s.phase !== 'ante') return;
  if (!s.players.every(p => p.paid)) return;
  s.phase = 'bet';
  const ids = s.players.map(p => p.id);
  s.turn = ids[1 % ids.length];
  s.seq++;
  pushLog(s, `🎲 Góp gà xong — gà ${s.pot} xu. ${nameOf(s, s.turn)} tố trước.`);
}
function advanceTurn(s) {
  if (s.phase !== 'bet') return;
  s.turn = nextActive(s, s.turn);
  s.seq++;
}

/* ai đang phải hành động (để hẹn bot / người rớt mạng) */
export function actors(s) {
  if (s.phase === 'ante') return s.players.filter(p => !p.paid).map(p => p.id);
  if (s.phase === 'bet' && s.turn) return [s.turn];
  return [];
}

/* ---------------- góc nhìn từng người (giấu bài người khác) ---------------- */
export function viewFor(s, pid) {
  const end = s.phase === 'ended';
  const me = getP(s, pid);
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, round: s.round,
    pot: s.pot, currentBet: s.currentBet, dealerId: s.dealerId, turn: s.turn,
    lastRaiser: s.lastRaiser, raises: s.raises || 0, winners: s.winners, winnerIds: s.winnerIds,
    endReason: s.endReason, winLabel: s.winLabel, ante: s.opts.ante,
    maxPlayers: s.opts.maxPlayers, timer: s.opts.timer,
    me: pid,
    you: me ? { id: me.id, contrib: me.contrib, toCall: toCallOf(s, pid), free: me.free, paid: me.paid, folded: me.folded, info: handInfo(me.cards) } : null,
    players: s.players.map(p => {
      const open = p.id === pid || (end && !p.folded);
      const o = { id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null, folded: p.folded, contrib: p.contrib, paid: p.paid, free: p.free, acted: p.acted, n: p.cards.length, res: end ? p.res : null };
      if (open && p.cards.length) { o.cards = p.cards.map(c => ({ ...c })); o.info = handInfo(p.cards); }
      else o.cards = null;
      return o;
    }),
    log: s.log.slice(-30),
  };
}
