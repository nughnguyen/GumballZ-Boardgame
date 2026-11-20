// 🀄 Mậu Binh — luật chơi (thuần logic, không chạm DOM, không chạm ví xu).
// Mỗi người 13 lá, xếp thành 3 chi: Đầu (3 lá), Giữa (5 lá), Cuối (5 lá).
// Sức mạnh 3 chi phải tăng dần từ Đầu tới Cuối, nếu không là "binh lủng"
// (thua cả 3 chi trước mọi người). So từng chi với từng đối thủ: thắng 1 chi
// được +1 điểm, thua −1, hòa 0. Bài đặc biệt (Sảnh rồng, 6 đôi, 5 đôi 1 sám,
// 3 thùng, 3 sảnh) thắng luôn cả 3 chi trước mỗi đối thủ. Điểm tổng = tổng
// điểm chi trước mọi đối thủ; ai nhiều điểm nhất thì thắng ván. Tiền cược
// (xu) do giao diện trừ/cộng ở ví chung — engine chỉ ghi điểm chi và delta
// xu, không đụng ví.
let rnd = Math.random;
export function setRandom(f) { rnd = f || Math.random; }
const rand = () => rnd();

export const SUITS = ['S', 'C', 'D', 'H']; // ♠ ♣ ♦ ♥
export const SUIT_SYM = { S: '♠', C: '♣', D: '♦', H: '♥' };
export const SUIT_ORDER = { S: 4, H: 3, D: 2, C: 1 }; // so chất: Bích > Cơ > Rô > Chuồn
export const RANK_TXT = r => r === 1 ? 'Át' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r);
export const RANK_SHORT = r => r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r);
export const cardText = c => RANK_SHORT(c.r) + SUIT_SYM[c.s];
export const C = (r, s) => ({ r, s, id: RANK_SHORT(r) + s });

export const MIN_PLAYERS = 2, MAX_PLAYERS = 4;
export const OPT_CHOICES = { chi: [0, 5, 10], maxPlayers: [2, 3, 4], timer: [0, 30, 60] };
export const CHI_LABEL = v => v === 0 ? 'chơi vui (0 xu)' : `${v} xu/chi`;

/* ---------------- bộ bài ---------------- */
export function newDeck() {
  const d = [];
  for (const s of SUITS) for (let r = 1; r <= 13; r++) d.push({ r, s, id: RANK_SHORT(r) + s });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

/* ---------------- tính bài ---------------- */
const hiRank = r => (r === 1 ? 14 : r); /* so lá to nhất: Át to nhất */
const byHi = (a, b) => hiRank(b.r) - hiRank(a.r);
const rankCounts = cards => { const m = {}; for (const c of cards) m[c.r] = (m[c.r] || 0) + 1; return m; };
/* sảnh: trả lá cao nhất (5 cho A-2-3-4-5, 14 cho 10-J-Q-K-A, 3 cho A-2-3), không phải thì 0 */
function straightHi(cards) {
  const rs = [...new Set(cards.map(c => c.r))].sort((a, b) => a - b);
  if (rs.length !== cards.length) return 0;
  if (rs.length === 5) {
    if (rs[0] === 1 && rs[1] === 10 && rs[2] === 11 && rs[3] === 12 && rs[4] === 13) return 14; /* 10-J-Q-K-A */
    if (rs[4] - rs[0] === 4) return rs[4] === 5 && rs[0] === 1 ? 5 : rs[4]; /* A-2-3-4-5 → 5 */
  }
  if (rs.length === 3) {
    if (rs[0] === 1 && rs[1] === 12 && rs[2] === 13) return 14; /* Q-K-A */
    if (rs[2] - rs[0] === 2) return rs[2]; /* A-2-3 → 3 */
  }
  return 0;
}
const isFlush = cards => cards.every(c => c.s === cards[0].s);
const CAT5 = { 9: 'Thùng phá sảnh', 8: 'Tứ quý', 7: 'Cù lũ', 6: 'Thùng', 5: 'Sảnh', 4: 'Sám cô', 3: 'Hai đôi', 2: 'Một đôi', 1: 'Mậu thầu' };
/* Đánh giá 1 tay 5 lá: {cat, tb, label}. cat: 9 thùng phá sảnh > 8 tứ quý > 7 cù lũ > 6 thùng > 5 sảnh > 4 sám > 3 hai đôi > 2 đôi > 1 mậu thầu. */
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
/* Đánh giá 1 tay 3 lá: {cat, tb, label}. cat dùng chung thang với 5 lá để so liên chi: 4 sám > 2 đôi > 1 mậu thầu. */
export function eval3(cards) {
  if (!cards || cards.length !== 3) return { cat: 0, tb: [0], label: 'Chưa đủ bài' };
  const cnt = rankCounts(cards);
  const groups = Object.entries(cnt).map(([r, n]) => ({ r: +r, n })).sort((a, b) => b.n - a.n || hiRank(b.r) - hiRank(a.r));
  const desc = [...cards].sort(byHi).map(c => hiRank(c.r));
  const R = r => RANK_TXT(r);
  if (groups[0].n === 3) return { cat: 4, tb: [hiRank(groups[0].r)], label: `Sám cô ${R(groups[0].r)}` };
  if (groups[0].n === 2) return { cat: 2, tb: [hiRank(groups[0].r), hiRank(groups[1].r)], label: `Đôi ${R(groups[0].r)}` };
  return { cat: 1, tb: desc, label: `Mậu thầu (${R(desc[0] === 14 ? 1 : desc[0])} cao)` };
}
/* So 2 tay đã đánh giá: >0 a thắng · <0 b thắng · 0 hòa. */
export function compareEval(a, b) {
  if (!a || !b) return 0;
  if (a.cat !== b.cat) return a.cat - b.cat;
  const n = Math.max(a.tb.length, b.tb.length);
  for (let i = 0; i < n; i++) { const d = (a.tb[i] || 0) - (b.tb[i] || 0); if (d) return d; }
  return 0;
}
/* Đánh giá cả 3 chi đã xếp: {top, mid, bot, foul}. foul = chi trên mạnh hơn chi dưới. */
export function evaluateRows(rows) {
  if (!rows || !rows.top || !rows.mid || !rows.bot) return null;
  const top = eval3(rows.top), mid = eval5(rows.mid), bot = eval5(rows.bot);
  const foul = compareEval(top, mid) > 0 || compareEval(mid, bot) > 0;
  return { top, mid, bot, foul };
}

/* ---------------- bài đặc biệt ---------------- */
/* Sảnh rồng: 13 lá đủ 13 số khác nhau. 6 đôi: 6 đôi + 1 lẻ. 5 đôi 1 sám: 1 sám + 5 đôi. */
function specialByCounts(cards) {
  const cnt = rankCounts(cards);
  const vals = Object.values(cnt);
  if (vals.length === 13) return { kind: 'dragon', label: 'Sảnh rồng — 13 lá liên tiếp!' };
  if (vals.filter(v => v === 2).length === 6 && vals.filter(v => v === 1).length === 1) return { kind: 'sixpairs', label: '6 đôi!' };
  if (vals.filter(v => v === 3).length === 1 && vals.filter(v => v === 2).length === 5) return { kind: 'fivepairs', label: '5 đôi 1 sám!' };
  return null;
}
/* 3 thùng: chia được thành 3 chi cùng chất (3/5/5). Duyệt gán chất cho từng chi. */
function isThreeFlush(cards) {
  const cnt = { S: 0, C: 0, D: 0, H: 0 };
  for (const c of cards) cnt[c.s]++;
  const sizes = [3, 5, 5];
  const rec = (gi, rest) => {
    if (gi === 3) return true;
    for (const s of SUITS) {
      if ((rest[s] || 0) >= sizes[gi]) {
        const r2 = { ...rest }; r2[s] -= sizes[gi];
        if (rec(gi + 1, r2)) return true;
      }
    }
    return false;
  };
  return rec(0, { ...cnt });
}
/* 3 sảnh: chia được thành 3 chi đều là sảnh (3/5/5). Duyệt mọi cách chia. */
function isThreeStraight(cards) {
  const idx = cards.map((_, i) => i);
  const combos = (arr, k, start = 0, cur = [], out = []) => {
    if (cur.length === k) { out.push([...cur]); return out; }
    for (let i = start; i <= arr.length - (k - cur.length); i++) { cur.push(arr[i]); combos(arr, k, i + 1, cur, out); cur.pop(); }
    return out;
  };
  for (const top of combos(idx, 3)) {
    const topCards = top.map(i => cards[i]);
    if (!straightHi(topCards)) continue;
    const rest = idx.filter(i => !top.includes(i));
    for (const mid of combos(rest, 5)) {
      const midCards = mid.map(i => cards[i]);
      if (!straightHi(midCards)) continue;
      const bot = rest.filter(i => !mid.includes(i)).map(i => cards[i]);
      if (straightHi(bot)) return true;
    }
  }
  return false;
}
export function detectSpecial(cards) {
  if (!cards || cards.length !== 13) return null;
  const byCount = specialByCounts(cards);
  if (byCount) return byCount;
  if (isThreeFlush(cards)) return { kind: 'threeflush', label: '3 thùng!' };
  if (isThreeStraight(cards)) return { kind: 'threestraight', label: '3 sảnh!' };
  return null;
}
export const SPECIAL_NAME = { dragon: 'Sảnh rồng', sixpairs: '6 đôi', fivepairs: '5 đôi 1 sám', threeflush: '3 thùng', threestraight: '3 sảnh' };

/* ---------------- tạo ván ---------------- */
export function cleanOpts(o = {}) {
  const r = { chi: 5, maxPlayers: 4, timer: 0 };
  for (const k of Object.keys(OPT_CHOICES)) if (o && OPT_CHOICES[k].includes(o[k])) r[k] = o[k];
  return r;
}
export function createGame(players, opts = {}) {
  const o = cleanOpts(opts);
  if (!players || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) throw new Error('Mậu Binh chơi 2–4 người.');
  if (players.length > o.maxPlayers) throw new Error(`Phòng này tối đa ${o.maxPlayers} người.`);
  const deck = newDeck();
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0, round: 1,
    phase: 'arrange',
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null, cards: [], special: null, arranged: false, rows: null, res: null })),
    deck, winners: [], winnerIds: [], endReason: null, winLabel: '',
    log: [], opts: o,
  };
  /* chia 13 lá mỗi người, vòng tròn từ sau nhà cái */
  const ids = players.map(p => p.id);
  const start = 1 % ids.length;
  for (let r = 0; r < 13; r++) for (let k = 0; k < ids.length; k++) getP(s, ids[(start + k) % ids.length]).cards.push(s.deck.pop());
  for (const p of s.players) p.special = detectSpecial(p.cards);
  const sp = s.players.filter(p => p.special).length;
  pushLog(s, `🀄 Ván ${s.round}: mỗi người 13 lá, xếp thành 3 chi — Đầu 3 lá, Giữa 5 lá, Cuối 5 lá. Mỗi chi ${o.chi === 0 ? 'tính điểm (chơi vui)' : `${o.chi} xu`}.${sp ? ` Có ${sp} người có bài đặc biệt!` : ''}`);
  return s;
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < MIN_PLAYERS || s.players.length > MAX_PLAYERS || !Array.isArray(s.deck)) throw new Error('Trạng thái Mậu Binh không hợp lệ.');
  return s;
}
const getP = (s, id) => s.players.find(p => p.id === id);
const nameOf = (s, id) => (getP(s, id) || {}).name || '?';
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

/* ---------------- so chi giữa 2 người ---------------- */
// Trả [cĐầu, cGiữa, cCuối] theo góc nhìn của a: 1 thắng · 0 hòa · −1 thua.
function chiBetween(a, b) {
  if (a.special && b.special) return [0, 0, 0];
  if (a.special) return [1, 1, 1];
  if (b.special) return [-1, -1, -1];
  const fa = a.foul, fb = b.foul;
  if (fa && fb) return [0, 0, 0];
  if (fa) return [-1, -1, -1];
  if (fb) return [1, 1, 1];
  const ev = a.evals, bv = b.evals;
  return [Math.sign(compareEval(ev.top, bv.top)), Math.sign(compareEval(ev.mid, bv.mid)), Math.sign(compareEval(ev.bot, bv.bot))];
}
function finish(s) {
  const chiVal = s.opts.chi || 0;
  /* đánh giá bài từng người */
  for (const p of s.players) {
    if (p.special) { p.evals = null; p.foul = false; }
    else {
      p.evals = evaluateRows(p.rows);
      p.foul = !!(p.evals && p.evals.foul);
    }
  }
  const scores = {};
  const vsMap = {};
  for (const p of s.players) { scores[p.id] = 0; vsMap[p.id] = {}; }
  for (const a of s.players) {
    for (const b of s.players) {
      if (a.id === b.id) continue;
      const chis = chiBetween(a, b);
      vsMap[a.id][b.id] = chis;
      scores[a.id] += chis[0] + chis[1] + chis[2];
    }
  }
  let best = -Infinity;
  for (const p of s.players) best = Math.max(best, scores[p.id]);
  const winners = best > 0 ? s.players.filter(p => scores[p.id] === best).map(p => p.id) : [];
  s.phase = 'ended';
  s.winnerIds = winners; s.winners = winners;
  s.endReason = winners.length ? 'showdown' : 'draw';
  s.winLabel = winners.length
    ? `${winners.map(id => nameOf(s, id)).join(' & ')} thắng ${best} chi!`
    : 'Hòa — không ai hơn ai!';
  for (const p of s.players) {
    const sc = scores[p.id];
    const sweep = Object.values(vsMap[p.id]).some(chis => chis[0] === 1 && chis[1] === 1 && chis[2] === 1);
    const quadsBot = !!(p.evals && p.evals.bot && p.evals.bot.cat === 8);
    p.res = {
      r: winners.includes(p.id) ? 'win' : (sc === 0 ? 'draw' : 'lose'),
      score: sc, delta: sc * chiVal,
      special: p.special ? p.special.kind : null, specialLabel: p.special ? p.special.label : null,
      foul: !!p.foul, sweep, quadsBot,
      vs: vsMap[p.id],
      evals: p.evals ? { top: { cat: p.evals.top.cat, label: p.evals.top.label }, mid: { cat: p.evals.mid.cat, label: p.evals.mid.label }, bot: { cat: p.evals.bot.cat, label: p.evals.bot.label } } : null,
      label: p.special ? SPECIAL_NAME[p.special.kind] : (p.foul ? 'Binh lủng!' : (sc > 0 ? `Thắng ${sc} chi` : sc < 0 ? `Thua ${-sc} chi` : 'Hòa chi')),
    };
  }
  s.seq++;
  pushLog(s, '🏁 ' + s.winLabel, 'win');
}

/* ---------------- hành động ---------------- */
// a: {type:'arrange', rows:{top:[id…], mid:[id…], bot:[id…]}} | {type:'special'}
export function applyAction(s, pid, a) {
  const p = getP(s, pid);
  if (!p) return { ok: false, reason: 'Không có người chơi này.' };
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  if (s.phase !== 'arrange') return { ok: false, reason: 'Ván đã xếp xong rồi.' };
  if (p.arranged) return { ok: false, reason: 'Bạn đã xếp xong rồi.' };
  if (a.type === 'special') {
    if (!p.special) return { ok: false, reason: 'Bạn không có bài đặc biệt.' };
    p.arranged = true; p.rows = null; s.seq++;
    pushLog(s, `🌟 ${p.name} có bài đặc biệt: ${p.special.label}`);
    if (s.players.every(q => q.arranged)) finish(s);
    return { ok: true, ended: s.phase === 'ended' };
  }
  if (a.type === 'arrange') {
    const rows = a.rows || {};
    const top = rows.top || [], mid = rows.mid || [], bot = rows.bot || [];
    if (top.length !== 3 || mid.length !== 5 || bot.length !== 5) return { ok: false, reason: 'Xếp chưa đủ 13 lá (Đầu 3, Giữa 5, Cuối 5).' };
    const ids = [...top, ...mid, ...bot];
    if (new Set(ids).size !== 13) return { ok: false, reason: 'Có lá bài bị trùng hoặc xếp 2 lần.' };
    const hand = new Map(p.cards.map(c => [c.id, c]));
    for (const id of ids) if (!hand.has(id)) return { ok: false, reason: 'Có lá bài không phải của bạn.' };
    p.rows = { top: top.map(id => ({ ...hand.get(id) })), mid: mid.map(id => ({ ...hand.get(id) })), bot: bot.map(id => ({ ...hand.get(id) })) };
    p.arranged = true; s.seq++;
    pushLog(s, `✅ ${p.name} đã xếp xong 3 chi.`);
    if (s.players.every(q => q.arranged)) finish(s);
    return { ok: true, ended: s.phase === 'ended' };
  }
  return { ok: false, reason: 'Hành động không hợp lệ.' };
}

/* ai đang phải hành động (để hẹn bot / người rớt mạng) */
export function actors(s) {
  if (s.phase !== 'arrange') return [];
  return s.players.filter(p => !p.arranged).map(p => p.id);
}

/* ---------------- góc nhìn từng người (giấu bài người khác) ---------------- */
export function viewFor(s, pid) {
  const end = s.phase === 'ended';
  const me = getP(s, pid);
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, round: s.round,
    chi: s.opts.chi, maxPlayers: s.opts.maxPlayers, timer: s.opts.timer,
    me: pid,
    you: me ? { id: me.id, cards: me.cards.map(c => ({ ...c })), special: me.special, arranged: me.arranged, rows: me.rows ? JSON.parse(JSON.stringify(me.rows)) : null, res: end ? me.res : null } : null,
    players: s.players.map(p => {
      const open = p.id === pid || end;
      return {
        id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
        arranged: p.arranged,
        special: open ? p.special : null,
        cards: open ? p.cards.map(c => ({ ...c })) : null,
        rows: open && p.rows ? JSON.parse(JSON.stringify(p.rows)) : null,
        res: end ? p.res : null,
      };
    }),
    winners: s.winners, winnerIds: s.winnerIds,
    endReason: s.endReason, winLabel: s.winLabel,
    log: s.log.slice(-30),
  };
}
