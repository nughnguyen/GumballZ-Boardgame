// 🀄 Tứ sắc (luật Nam) – thuần logic, không đụng tới giao diện. 112 lá: 7 quân × 4 màu × 4 lá giống nhau.
// Lá c = 0..111: loại t = c >> 2 (0..27), quân = t % 7, màu = t / 7.
export const RANKS = ['Tướng', 'Sĩ', 'Tượng', 'Xe', 'Pháo', 'Mã', 'Tốt'], HAN = ['將', '士', '象', '車', '砲', '馬', '卒'];
export const COLORS = ['do', 'vang', 'xanh', 'trang'], COLOR_VN = ['đỏ', 'vàng', 'xanh', 'trắng'];
export const type = c => c >> 2, rank = c => (c >> 2) % 7, color = c => ((c >> 2) / 7) | 0;
export const cardTxt = c => `${RANKS[rank(c)]} ${COLOR_VN[color(c)]}`;
export const sortHand = h => h.slice().sort((a, b) => a - b);
export const DEFAULT_OPTS = { chiu: true };
export const CHOICES = { chiu: [true, false] };
export const optOk = (k, v) => k in CHOICES && CHOICES[k].includes(v);
export const STOP = 7; /* nọc còn 7 lá mà chưa ai tới thì hoà */
/* tên bộ + số lệnh: khạp/quằn nằm kín trên tay nhiều lệnh hơn khui ra bàn */
export const MELD_VN = { tuong: 'Tướng', doi: 'Đôi', le: 'Lẻ', khap: 'Khạp', quan: 'Quằn', tot3: 'Tốt 3 màu', tot4: 'Tốt 4 màu' };
export const meldPts = (k, open) => ({ tuong: 1, doi: 0, le: 1, khap: open ? 1 : 3, quan: open ? 6 : 8, tot3: 1, tot4: 4 })[k];
const shuffle = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const counts = cards => { const n = Array(28).fill(0); for (const c of cards) n[c >> 2]++; return n; };

/* liệt kê mọi bộ (kín) chứa loại t – t là loại nhỏ nhất còn lá trên tay */
function meldsAt(cnt, t) {
  const r = t % 7, base = t - r, out = [];
  if (r === 0) out.push(['tuong', [t]]);
  if (cnt[t] >= 2) out.push(['doi', [t, t]]); if (cnt[t] >= 3) out.push(['khap', [t, t, t]]); if (cnt[t] >= 4) out.push(['quan', [t, t, t, t]]);
  if (r === 0 && cnt[base + 1] && cnt[base + 2]) out.push(['le', [t, base + 1, base + 2]]);
  if (r === 3 && cnt[base + 4] && cnt[base + 5]) out.push(['le', [t, base + 4, base + 5]]);
  if (r === 6) { const o = [13, 20, 27].filter(x => x > t && cnt[x]); for (let i = 0; i < o.length; i++) for (let j = i + 1; j < o.length; j++) out.push(['tot3', [t, o[i], o[j]]]); if (o.length === 3) out.push(['tot4', [t, ...o]]); }
  return out;
}
/* xếp TOÀN BỘ số lá thành bộ, nhiều lệnh nhất; không xếp hết được thì trả null */
function bestCnt(cnt, memo) {
  const t = cnt.findIndex(n => n > 0); if (t < 0) return { p: 0, ms: [] };
  const key = cnt.join(''); if (memo.has(key)) return memo.get(key);
  let b = null;
  for (const [k, ts] of meldsAt(cnt, t)) { for (const x of ts) cnt[x]--; const ok = ts.every(x => cnt[x] >= 0), v = ok ? bestCnt(cnt, memo) : null; for (const x of ts) cnt[x]++; if (v && (!b || v.p + meldPts(k, false) > b.p)) b = { p: v.p + meldPts(k, false), ms: [[k, ts], ...v.ms] }; }
  memo.set(key, b); return b;
}
export function arrange(cards) { /* → { pts, melds: [{ k, cards }] } hoặc null nếu còn lá rác */
  const b = bestCnt(counts(cards), new Map()); if (!b) return null;
  const pool = {}; for (const c of sortHand(cards)) (pool[c >> 2] = pool[c >> 2] || []).push(c);
  return { pts: b.p, melds: b.ms.map(([k, ts]) => ({ k, cards: ts.map(t => pool[t].shift()) })) };
}
/* số lá rác ít nhất (bot dùng để cân nhắc) */
function leftCnt(cnt, memo) {
  const t = cnt.findIndex(n => n > 0); if (t < 0) return 0;
  const key = cnt.join(''); if (memo.has(key)) return memo.get(key);
  cnt[t]--; let b = 1 + leftCnt(cnt, memo); cnt[t]++;
  for (const [, ts] of meldsAt(cnt, t)) { for (const x of ts) cnt[x]--; if (ts.every(x => cnt[x] >= 0)) b = Math.min(b, leftCnt(cnt, memo)); for (const x of ts) cnt[x]++; if (!b) break; }
  memo.set(key, b); return b;
}
export const minLeft = cards => leftCnt(counts(cards), new Map());

/* các cách lấy lá c: natural = tới lượt mình (ăn đôi / lẻ / tốt màu), drawer = chính mình vừa bốc lá đó (được giữ Tướng).
   Người ngoài lượt chỉ được khui (có sẵn đôi → khạp, có sẵn khạp → quằn) hoặc lấy để TỚI. */
export function takeOpts(hand, c, natural, drawer, chiu = true) {
  const t = c >> 2, r = t % 7, base = t - r, same = hand.filter(x => x >> 2 === t), one = x => hand.find(y => y >> 2 === x), all = [];
  if (same.length >= 3) all.push({ k: 'quan', use: same.slice(0, 3) });
  if (same.length >= 2) all.push({ k: 'khap', use: same.slice(0, 2) });
  if (same.length >= 1) all.push({ k: 'doi', use: same.slice(0, 1), nat: 1 });
  if (r < 6) { const g = r < 3 ? [base, base + 1, base + 2] : [base + 3, base + 4, base + 5], o = g.filter(x => x !== t).map(one); if (o.every(x => x != null)) all.push({ k: 'le', use: o, nat: 1 }); }
  else { const o = [6, 13, 20, 27].filter(x => x !== t).map(one).filter(x => x != null); for (let i = 0; i < o.length; i++) for (let j = i + 1; j < o.length; j++) all.push({ k: 'tot3', use: [o[i], o[j]], nat: 1 }); if (o.length === 3) all.push({ k: 'tot4', use: o, nat: 1 }); }
  if (r === 0) all.push({ k: 'tuong', use: [], nat: 1, own: 1 });
  const out = [];
  for (const o of all) {
    const rest = hand.filter(x => !o.use.includes(x)), a = arrange(rest), win = !!a;
    const allowed = o.own ? drawer : o.nat ? natural : (natural || chiu);
    if (allowed || win) out.push({ k: o.k, use: o.use, win, pts: win ? a.pts + meldPts(o.k, true) : 0 });
  }
  return out;
}

export function createGame(players, opts = {}, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random;
  const o = { ...DEFAULT_OPTS, ...opts }, deck = shuffle([...Array(112).keys()], rnd), n = players.length, dealer = Math.floor(rnd() * n);
  const s = { gid: Math.random().toString(36).slice(2, 8), seq: 0, phase: 'play', stage: 'discard', opts: o, players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot })),
    hands: {}, melds: {}, piles: {}, deck: null, dealer, cur: players[dealer].id, card: null, cardBy: null, cardKind: null, natural: null, second: false, queue: [], last: null, winner: null, result: null };
  players.forEach((p, i) => { s.hands[p.id] = sortHand(deck.splice(0, i === dealer ? 21 : 20)); s.melds[p.id] = []; s.piles[p.id] = []; });
  s.deck = deck; return s;
}
const idx = (s, pid) => s.players.findIndex(p => p.id === pid);
const nextOf = (s, pid) => s.players[(idx(s, pid) + 1) % s.players.length].id;
const exposedPts = (s, pid) => s.melds[pid].reduce((n, m) => n + meldPts(m.k, true), 0);

/* lật lá c ra giữa bàn rồi lập hàng hỏi: ai TỚI được hỏi trước, rồi quằn, rồi khạp, cuối cùng là người tới lượt */
function expose(s, c, by, kind, natural, only) {
  Object.assign(s, { stage: 'claim', card: c, cardBy: by, cardKind: kind, natural });
  const n = s.players.length, start = idx(s, natural), q = [];
  for (let i = 0; i < n; i++) {
    const pid = s.players[(start + i) % n].id; if ((kind === 'disc' || s.second) && pid === by) continue; if (only && pid !== only) continue;
    const opts = takeOpts(s.hands[pid], c, pid === natural, kind === 'draw' && !s.second && pid === by, s.opts.chiu).map(o => (o.win ? { ...o, pts: o.pts + exposedPts(s, pid) } : o));
    if (!opts.length) continue;
    q.push({ pid, opts, lv: opts.some(o => o.win) ? 0 : pid === natural ? 3 : opts.some(o => o.k === 'quan') ? 1 : 2, i });
  }
  s.queue = q.sort((a, b) => a.lv - b.lv || a.i - b.i).map(({ pid, opts }) => ({ pid, opts }));
  if (!s.queue.length) noTake(s);
}
function noTake(s) {
  const c = s.card, by = s.cardBy;
  if (s.cardKind === 'draw' && !s.second) { s.second = true; return expose(s, c, by, 'draw', nextOf(s, by), nextOf(s, by)); } /* người bốc không dùng → thành lá tỳ cho người kế */
  s.piles[by].push(c); s.card = null; const who = s.natural; s.second = false; drawFor(s, who);
}
function drawFor(s, pid) {
  if (s.deck.length <= STOP) return finish(s, null);
  const c = s.deck.pop(); s.second = false; s.last = { type: 'draw', by: pid, card: c }; expose(s, c, pid, 'draw', pid);
}
function finish(s, pid, pts = 0) {
  s.phase = 'ended'; s.stage = null; s.queue = []; s.winner = pid; const chips = {}; for (const p of s.players) chips[p.id] = pid ? (p.id === pid ? pts * (s.players.length - 1) : -pts) : 0;
  s.result = { winner: pid, pts, chips, hand: pid ? arrange(s.hands[pid]) : null };
}
export const canDiscard = (hand, c) => hand.includes(c) && (rank(c) !== 0 || hand.every(x => rank(x) === 0));

export function applyAction(s, pid, a) {
  if (s.phase !== 'play' || !a) return { ok: false, reason: 'Ván đã xong.' };
  if (s.stage === 'discard') {
    if (pid !== s.cur || a.type !== 'discard') return { ok: false, reason: 'Chưa tới lượt bạn.' };
    if (!canDiscard(s.hands[pid], a.card)) return { ok: false, reason: 'Không đánh Tướng được – Tướng tự nó đã là một bộ.' };
    s.hands[pid] = s.hands[pid].filter(x => x !== a.card); s.seq++; s.last = { type: 'disc', by: pid, card: a.card }; s.second = false;
    expose(s, a.card, pid, 'disc', nextOf(s, pid)); return { ok: true };
  }
  const q = s.queue[0]; if (!q || q.pid !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  if (a.type === 'pass') { s.seq++; s.queue.shift(); if (!s.queue.length) noTake(s); return { ok: true }; }
  if (a.type !== 'take') return { ok: false, reason: 'Thao tác lạ.' };
  const o = q.opts[a.i]; if (!o) return { ok: false, reason: 'Không có cách ăn đó.' };
  s.seq++; s.hands[pid] = s.hands[pid].filter(x => !o.use.includes(x)); s.melds[pid].push({ k: o.k, cards: sortHand([...o.use, s.card]) });
  s.last = { type: 'take', by: pid, card: s.card, from: s.cardBy, k: o.k, kind: s.cardKind }; s.card = null; s.queue = []; s.second = false;
  if (o.win) finish(s, pid, o.pts); else { s.stage = 'discard'; s.cur = pid; }
  return { ok: true };
}
export const actors = s => (s.phase !== 'play' ? [] : s.stage === 'discard' ? [s.cur] : s.queue[0] ? [s.queue[0].pid] : []);
export function viewFor(s, pid) {
  const inGame = pid in s.hands, ended = s.phase === 'ended', q = s.queue[0];
  return { gid: s.gid, seq: s.seq, phase: s.phase, stage: s.stage, opts: s.opts, players: s.players.map(p => ({ ...p, n: s.hands[p.id].length })), dealer: s.players[s.dealer].id,
    cur: s.stage === 'discard' ? s.cur : q ? q.pid : null, card: s.card, cardBy: s.cardBy, cardKind: s.cardKind, natural: s.natural, second: s.second,
    myOpts: q && q.pid === pid ? q.opts : null, melds: s.melds, piles: s.piles, deckN: s.deck.length, hand: inGame ? s.hands[pid] : [], spec: !inGame,
    last: s.last, winner: s.winner, result: s.result, reveal: ended ? s.hands : null };
}
