// 🚂 Tàu Xuyên Việt – luật, thuần logic (2–5 người). Gom thẻ toa cùng màu để xây tuyến nối các thành phố, hoàn thành vé đích để ăn điểm.
// Lượt: (a) bốc 2 thẻ toa (thẻ ngửa hoặc chồng úp; đầu máy ngửa tính là 2), (b) xây 1 tuyến, hoặc (c) bốc 3 vé đích giữ ít nhất 1.
// Ai còn ≤ 2 toa thì mỗi người (kể cả người đó) đi thêm đúng 1 lượt rồi tính điểm: điểm tuyến + vé đích (xong cộng, hỏng trừ) + 10 điểm đường dài nhất.
import { CITIES, COLORS, ROUTES, ROUTE_PTS, TICKETS } from './map.js?v=4';
export const DEFAULT_OPTS = { trains: 30, level: 2 };
export const CHOICES = { trains: [22, 30, 38], level: [1, 2, 3] };
export const optOk = (k, v) => !!CHOICES[k] && CHOICES[k].includes(v);
export const P_COLORS = ['#e2483d', '#2f7de1', '#2fb36a', '#f2a51e', '#9b59d0'];
const shuffle = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export function createGame(players, opts = {}, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random;
  const o = { ...DEFAULT_OPTS }; for (const k of Object.keys(CHOICES)) if (optOk(k, opts[k])) o[k] = opts[k];
  const deck = []; for (const c of COLORS) for (let i = 0; i < 12; i++) deck.push(c); for (let i = 0; i < 14; i++) deck.push('L'); shuffle(deck, rnd);
  const tk = shuffle(TICKETS.map(t => t.id), rnd);
  const ps = shuffle(players.slice(0, 5).map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot })), rnd).map((p, i) => ({ ...p, color: P_COLORS[i], trains: o.trains, pts: 0, hand: deck.splice(0, 4 + Math.min(i, 3)), tickets: [], offer: tk.splice(0, 3), need: 2 }));
  /* người đi sau được thêm thẻ lúc đầu (ghế 2: +1, ghế 3: +2, ghế 4–5: +3) để bù thiệt vì bị giành tuyến trước – số đo bằng máy đấu máy */
  const s = { gid: Math.floor(rnd() * 1e9), seq: 0, phase: 'tickets', opts: o, players: ps, turn: 0, deck, discard: [], up: [], tk, owner: {}, drawn: 0, finalLeft: -1, last: null, log: [], result: null };
  fillUp(s, rnd); return s;
}
function draw1(s, rnd) { if (!s.deck.length && s.discard.length) { s.deck = shuffle(s.discard, rnd); s.discard = []; } return s.deck.length ? s.deck.pop() : null; }
function fillUp(s, rnd) { for (let guard = 0; guard < 4; guard++) { while (s.up.length < 5) { const c = draw1(s, rnd); if (!c) break; s.up.push(c); }
    if (s.up.filter(c => c === 'L').length >= 3 && s.deck.length + s.discard.length >= 5) { s.discard.push(...s.up); s.up = []; continue; } break; } } /* 3 đầu máy ngửa: dẹp cả 5 lá, lật lại */
const note = (s, t) => { s.log.push(t); if (s.log.length > 30) s.log.shift(); };
export const curId = s => (s.players[s.turn] || {}).id;
/* tuyến còn xây được: chưa ai xây, và tuyến đôi kia (nếu có) chưa bị chiếm – 4–5 người thì tuyến đôi mở cho người khác, không cho cùng một người */
export const routeFree = (s, id, pid) => { if (s.owner[id] !== undefined) return false; const t = ROUTES[id].tw; if (t == null || s.owner[t] === undefined) return true; return s.players.length >= 4 && pid !== undefined && s.owner[t] !== pid; };
/* các cách trả thẻ để xây tuyến r với bài `hand`: [{ color, locos }] (dùng càng ít đầu máy càng tốt cho mỗi màu) */
export function payOptions(hand, r) {
  const cnt = c => hand.filter(x => x === c).length, L = cnt('L'), out = [];
  for (const c of r.c === 'x' ? COLORS : [r.c]) { const have = cnt(c); if (have + L >= r.n && (have > 0 || r.c !== 'x')) out.push({ color: c, locos: Math.max(0, r.n - have) }); }
  if (L >= r.n && !out.some(o => o.locos === r.n)) out.push({ color: 'L', locos: r.n });
  return out;
}
function endTurn(s, rnd) {
  s.drawn = 0; const p = s.players[s.turn];
  if (s.finalLeft < 0 && p.trains <= 2) { s.finalLeft = s.players.length; note(s, `🚨 ${p.name} sắp hết toa – mỗi người còn đúng 1 lượt!`); }
  else if (s.finalLeft > 0) s.finalLeft--;
  if (s.finalLeft === 0) return finish(s);
  s.turn = (s.turn + 1) % s.players.length;
}
/* cụm thành phố đã nối của một người (để xét vé đích) */
function linked(s, pid, a, b) { const adj = {}; for (const r of ROUTES) if (s.owner[r.id] === pid) { (adj[r.a] = adj[r.a] || []).push(r.b); (adj[r.b] = adj[r.b] || []).push(r.a); }
  const seen = new Set([a]), st = [a]; while (st.length) { const u = st.pop(); if (u === b) return true; for (const v of adj[u] || []) if (!seen.has(v)) { seen.add(v); st.push(v); } } return false; }
export const ticketDone = (s, pid, tid) => { const t = TICKETS[tid]; return linked(s, pid, t.a, t.b); };
/* đường liên tục dài nhất (tính theo số toa, mỗi tuyến đi một lần) */
export function longest(s, pid) { const mine = ROUTES.filter(r => s.owner[r.id] === pid); let best = 0;
  const go = (city, used, len) => { if (len > best) best = len; for (const r of mine) { if (used.has(r.id) || (r.a !== city && r.b !== city)) continue; used.add(r.id); go(r.a === city ? r.b : r.a, used, len + r.n); used.delete(r.id); } };
  for (const c of new Set(mine.flatMap(r => [r.a, r.b]))) go(c, new Set(), 0); return best; }
function finish(s) {
  s.phase = 'ended'; const lens = s.players.map(p => longest(s, p.id)), top = Math.max(...lens);
  s.result = s.players.map((p, i) => { const tks = p.tickets.map(id => ({ id, ok: ticketDone(s, p.id, id) })), tp = tks.reduce((n, t) => n + (t.ok ? 1 : -1) * TICKETS[t.id].pts, 0), bonus = top > 0 && lens[i] === top ? 10 : 0;
    return { id: p.id, route: p.pts, tickets: tks, tpts: tp, long: lens[i], bonus, total: p.pts + tp + bonus }; });
  const best = Math.max(...s.result.map(r => r.total)); const win = s.result.filter(r => r.total === best); s.winner = win[0].id; s.winners = win.map(r => r.id);
}
export function applyAction(s, pid, a, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random;
  if (!a) return { ok: false, reason: 'Thao tác lạ.' };
  const p = s.players.find(x => x.id === pid); if (!p) return { ok: false, reason: 'Bạn đang xem.' };
  if (s.phase === 'ended') return { ok: false, reason: 'Ván đã xong.' };
  if (a.type === 'keep') { /* giữ vé đích: đầu ván giữ ≥ 2 trong 3, giữa ván giữ ≥ 1 */
    if (!p.offer) return { ok: false, reason: 'Bạn không có vé nào đang chờ chọn.' };
    const ids = [...new Set(Array.isArray(a.ids) ? a.ids : [])].filter(id => p.offer.includes(id));
    if (ids.length < p.need) return { ok: false, reason: `Phải giữ ít nhất ${p.need} vé.` };
    s.seq++; p.tickets.push(...ids); s.tk.unshift(...p.offer.filter(id => !ids.includes(id))); p.offer = null;
    if (s.phase === 'tickets') { if (s.players.every(q => !q.offer)) { s.phase = 'play'; note(s, '🚂 Tàu chuyển bánh!'); } }
    else { note(s, `🎫 ${p.name} lấy thêm ${ids.length} vé đích.`); endTurn(s, rnd); }
    return { ok: true };
  }
  if (s.phase !== 'play') return { ok: false, reason: 'Chờ mọi người chọn vé xong đã.' };
  if (curId(s) !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  if (p.offer) return { ok: false, reason: 'Chọn vé đích trước đã.' };
  if (a.type === 'deck' || a.type === 'up') {
    let c;
    if (a.type === 'deck') { c = draw1(s, rnd); if (!c) return { ok: false, reason: 'Hết thẻ toa rồi.' }; }
    else { const i = a.i | 0; c = s.up[i]; if (!c) return { ok: false, reason: 'Không có thẻ đó.' }; if (c === 'L' && s.drawn) return { ok: false, reason: 'Đã bốc 1 thẻ rồi thì không lấy đầu máy đang ngửa được.' }; s.up.splice(i, 1); }
    s.seq++; s.passes = 0; p.hand.push(c); s.drawn += a.type === 'up' && c === 'L' ? 2 : 1; s.last = { t: 'draw', by: pid, up: a.type === 'up' ? c : null };
    fillUp(s, rnd);
    if (s.drawn >= 2 || (!s.deck.length && !s.discard.length && !s.up.some(x => x !== 'L' || !s.drawn))) { note(s, `🃏 ${p.name} bốc thẻ toa.`); endTurn(s, rnd); }
    return { ok: true };
  }
  if (a.type === 'pass') { /* chỉ khi hết sạch thẻ để bốc: bỏ lượt. Cả bàn bỏ lượt liền nhau thì kết thúc ván. */
    if (s.deck.length || s.discard.length || s.up.some(c => c !== 'L' || !s.drawn)) return { ok: false, reason: 'Còn thẻ để bốc mà, chưa bỏ lượt được.' };
    s.seq++; s.passes = (s.passes || 0) + 1; note(s, `⏭️ ${p.name} bỏ lượt (hết thẻ).`); if (s.passes >= s.players.length) { finish(s); return { ok: true }; } endTurn(s, rnd); return { ok: true };
  }
  if (s.drawn) return { ok: false, reason: 'Bạn đang bốc dở – bốc nốt thẻ thứ hai đi.' };
  if (a.type === 'tickets') {
    if (s.tk.length < 1) return { ok: false, reason: 'Hết vé đích rồi.' };
    s.seq++; p.offer = s.tk.splice(-Math.min(3, s.tk.length)); p.need = 1; return { ok: true };
  }
  if (a.type === 'claim') {
    const r = ROUTES[a.route | 0]; if (!r || a.route !== r.id) return { ok: false, reason: 'Tuyến lạ.' };
    if (!routeFree(s, r.id, pid)) return { ok: false, reason: s.owner[r.id] === undefined ? (s.players.length < 4 ? 'Tuyến đôi: bàn dưới 4 người chỉ xây được một trong hai.' : 'Không được xây cả hai tuyến đôi.') : 'Tuyến này có chủ rồi.' };
    if (p.trains < r.n) return { ok: false, reason: `Bạn chỉ còn ${p.trains} toa, tuyến này cần ${r.n}.` };
    const opt = payOptions(p.hand, r).find(o => o.color === a.color); if (!opt) return { ok: false, reason: 'Không đủ thẻ màu đó.' };
    s.seq++; let needC = r.n - opt.locos, needL = opt.locos; const keep = [];
    for (const c of p.hand) { if (c === opt.color && opt.color !== 'L' && needC > 0) { needC--; s.discard.push(c); } else if (c === 'L' && needL > 0) { needL--; s.discard.push(c); } else keep.push(c); }
    s.passes = 0; p.hand = keep; p.trains -= r.n; p.pts += ROUTE_PTS[r.n]; s.owner[r.id] = pid; s.last = { t: 'claim', by: pid, route: r.id };
    note(s, `🛤️ ${p.name} xây ${CITIES[r.a][0]} – ${CITIES[r.b][0]} (+${ROUTE_PTS[r.n]}).`); endTurn(s, rnd); return { ok: true };
  }
  return { ok: false, reason: 'Thao tác lạ.' };
}
export const actors = s => (s.phase === 'ended' ? [] : s.phase === 'tickets' ? s.players.filter(p => p.offer).map(p => p.id) : [curId(s)]);
/* mỗi người chỉ thấy bài + vé của mình; của người khác chỉ thấy số lượng (hết ván mới lộ vé) */
export function viewFor(s, pid) {
  const me = s.players.find(p => p.id === pid);
  return { gid: s.gid, seq: s.seq, phase: s.phase, opts: s.opts, cur: s.phase === 'play' ? curId(s) : null, up: s.up, deckN: s.deck.length + s.discard.length, tkN: s.tk.length, owner: s.owner, drawn: s.drawn, finalLeft: s.finalLeft, last: s.last, log: s.log.slice(-6), canPass: !(s.deck.length || s.discard.length || s.up.some(c => c !== 'L' || !s.drawn)),
    players: s.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, color: p.color, trains: p.trains, pts: p.pts, cards: p.hand.length, tks: p.tickets.length, choosing: !!p.offer })),
    hand: me ? me.hand : [], tickets: me ? me.tickets.map(id => ({ id, ok: ticketDone(s, pid, id) })) : [], offer: me ? me.offer : null, need: me ? me.need : 0,
    result: s.result, winner: s.winner, winners: s.winners, spec: !me };
}
