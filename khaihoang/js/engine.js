// 🏝️ Đảo Khai Hoang – luật, thuần logic (2–4 người). Dựng làng ở góc ô, đổ xúc xắc lấy tài nguyên, làm đường, lên thành phố, đổi chác; ai đủ điểm trước thì thắng.
// Tài nguyên: w gỗ (rừng) · b gạch (đồi đất) · g lúa (ruộng) · f cừu (đồng cỏ; giữ khoá 'f' cũ) · o đá (núi). Ô 'd' là bãi cát (không ra gì, tên cướp xuất phát ở đó). Trong code tên cướp vẫn mang tên cũ `storm`, thẻ Hiệp sĩ là `guard`.
// Luật bám sát bản gốc: kho 19 thẻ mỗi loại (không đủ chia thì loại đó không ai được), 25 thẻ phát triển, 15 đường / 5 làng / 4 thành phố.
// Pha: setup (đặt 2 làng + 2 đường, vòng 2 đi ngược) → roll → [discard → storm → steal] → main → … → ended.
import { HEXES, VERTS, EDGES, PORT_EDGES, HEX_ADJ, spiral } from './map.js?v=2';
export const RES = ['w', 'b', 'g', 'f', 'o'];
export const RES_NAME = { w: 'gỗ', b: 'gạch', g: 'lúa', f: 'cừu', o: 'đá' };
export const COST = { road: { w: 1, b: 1 }, village: { w: 1, b: 1, g: 1, f: 1 }, town: { g: 2, o: 3 }, card: { g: 1, f: 1, o: 1 } };
export const LIMIT = { road: 15, village: 5, town: 4 };
export const CARD_NAME = { guard: 'Hiệp sĩ', vp: 'Điểm thắng', road: 'Làm đường', plenty: 'Năm được mùa', mono: 'Độc quyền' };
export const DEFAULT_OPTS = { goal: 10, level: 2, nums: 1 };
export const CHOICES = { goal: [8, 10, 12], level: [1, 2, 3], nums: [1, 0] }; /* nums 1 = số đặt theo vòng xoắn như luật gốc, 0 = rải ngẫu nhiên */
export const SPIRAL = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];
export const optOk = (k, v) => !!CHOICES[k] && CHOICES[k].includes(v);
export const P_COLORS = ['#e2483d', '#2f7de1', '#ff8a1e', '#8e44c9'];
const shuffle = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const empty = () => ({ w: 0, b: 0, g: 0, f: 0, o: 0 });
export const total = h => RES.reduce((n, r) => n + (h[r] || 0), 0);
export const canPay = (h, c) => Object.keys(c).every(r => (h[r] || 0) >= c[r]);
const pay = (h, c, bank) => { for (const r of Object.keys(c)) { h[r] -= c[r]; if (bank) bank[r] += c[r]; } };
const note = (s, t) => { s.log.push(t); if (s.log.length > 30) s.log.shift(); };
const P = (s, id) => s.players.find(p => p.id === id);
export const curId = s => (s.phase === 'setup' ? s.players[s.setup.order[s.setup.i]] : s.players[s.turn] || {}).id;

export function createGame(players, opts = {}, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random;
  const o = { ...DEFAULT_OPTS }; for (const k of Object.keys(CHOICES)) if (optOk(k, opts[k])) o[k] = opts[k];
  let hexes;
  for (let guard = 0; guard < 200; guard++) { /* xếp ô + số; số 6 và 8 không nằm sát nhau */
    const ts = shuffle([...'wwwwbbbggggffffooo', 'd'], rnd), ns = shuffle([2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12], rnd); let k = 0;
    hexes = ts.map(t => ({ t, n: t === 'd' ? 0 : ns[k++] }));
    if (o.nums) { const sp = spiral(Math.floor(rnd() * 6)); let j = 0; for (const i of sp) hexes[i].n = hexes[i].t === 'd' ? 0 : SPIRAL[j++]; break; } /* thứ tự số của luật gốc đã tránh 6/8 kề nhau */
    if (!hexes.some((h, i) => (h.n === 6 || h.n === 8) && HEX_ADJ[i].some(j => hexes[j].n === 6 || hexes[j].n === 8))) break;
  }
  const pt = shuffle(['*', '*', '*', '*', 'w', 'b', 'g', 'f', 'o'], rnd);
  const ports = PORT_EDGES.map((e, i) => ({ e, v: [EDGES[e].a, EDGES[e].b], t: pt[i] }));
  const deck = shuffle([...Array(14).fill('guard'), ...Array(5).fill('vp'), 'road', 'road', 'plenty', 'plenty', 'mono', 'mono'], rnd);
  const ps = shuffle(players.slice(0, 4).map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot })), rnd).map((p, i) => ({ ...p, color: P_COLORS[i], hand: empty(), dev: [], fresh: [], guards: 0 }));
  const n = ps.length, order = [...Array(n).keys(), ...[...Array(n).keys()].reverse()];
  return { gid: Math.floor(rnd() * 1e9), seq: 0, phase: 'setup', opts: o, players: ps, turn: 0, hexes, storm: hexes.findIndex(h => h.t === 'd'), ports, B: {}, R: {}, deck,
    bank: { w: 19, b: 19, g: 19, f: 19, o: 19 }, dice: null, setup: { order, i: 0, need: 'village', v: -1 }, need: {}, back: 'main', free: 0, played: false, offer: null, oid: 0, offN: 0, longest: null, army: null, last: null, log: [], result: null };
}
// ---------- đếm & luật đặt ----------
export const count = (s, pid, kind) => (kind === 'road' ? Object.values(s.R).filter(x => x === pid).length : Object.values(s.B).filter(x => x.p === pid && x.t === (kind === 'town' ? 2 : 1)).length);
/* các chỗ đặt hợp lệ (chưa xét tiền): kind = road | village | town */
export function spots(s, pid, kind) {
  const out = [], setup = s.phase === 'setup';
  if (kind === 'town') { for (const v in s.B) if (s.B[v].p === pid && s.B[v].t === 1) out.push(+v); return out; }
  if (kind === 'village') { for (const v of VERTS) { if (s.B[v.id] || v.adj.some(a => s.B[a])) continue; if (setup || v.edges.some(e => s.R[e] === pid)) out.push(v.id); } return out; }
  for (const e of EDGES) { if (s.R[e.id] !== undefined) continue;
    if (setup) { if (e.a === s.setup.v || e.b === s.setup.v) out.push(e.id); continue; }
    if ([e.a, e.b].some(x => { const b = s.B[x]; if (b) return b.p === pid; return VERTS[x].edges.some(k => k !== e.id && s.R[k] === pid); })) out.push(e.id); }
  return out;
}
/* tỉ lệ đổi với kho của một loại tài nguyên: 4, có bến chung thì 3, có bến riêng thì 2 */
export function rate(s, pid, r) { let best = 4; for (const p of s.ports) if (p.v.some(v => s.B[v] && s.B[v].p === pid)) { if (p.t === r) return 2; if (p.t === '*') best = 3; } return best; }
/* đường liền dài nhất của một người (làng/phố của người khác chắn ngang thì đứt) */
export function roadLen(s, pid) {
  const mine = EDGES.filter(e => s.R[e.id] === pid); let best = 0;
  const go = (v, used, len) => { if (len > best) best = len; if (len && s.B[v] && s.B[v].p !== pid) return;
    for (const e of mine) { if (used.has(e.id) || (e.a !== v && e.b !== v)) continue; used.add(e.id); go(e.a === v ? e.b : e.a, used, len + 1); used.delete(e.id); } };
  for (const v of new Set(mine.flatMap(e => [e.a, e.b]))) go(v, new Set(), 0);
  return best;
}
function fixLongest(s) {
  const lens = s.players.map(p => [p.id, roadLen(s, p.id)]), top = Math.max(...lens.map(x => x[1])), tops = lens.filter(x => x[1] === top).map(x => x[0]);
  const before = s.longest;
  if (top < 5) s.longest = null; else if (tops.includes(s.longest)) { /* giữ */ } else if (tops.length === 1) s.longest = tops[0]; else s.longest = null;
  if (s.longest && s.longest !== before) note(s, `🛤️ ${P(s, s.longest).name} giữ Đường dài nhất (+2).`);
}
function fixArmy(s, p) { if (p.guards >= 3 && (!s.army || p.guards > P(s, s.army).guards) && s.army !== p.id) { s.army = p.id; note(s, `🛡️ ${p.name} giữ Đội quân mạnh nhất (+2).`); } }
/* điểm: full = tính cả thẻ Điểm thắng đang giấu */
export function points(s, pid, full) { const p = P(s, pid); if (!p) return 0;
  return count(s, pid, 'village') + 2 * count(s, pid, 'town') + (s.longest === pid ? 2 : 0) + (s.army === pid ? 2 : 0) + (full ? [...p.dev, ...p.fresh].filter(c => c === 'vp').length : 0); }
function checkWin(s, pid) {
  if (points(s, pid, true) < s.opts.goal) return false;
  s.phase = 'ended'; s.offer = null; s.winner = pid; s.winners = [pid];
  s.result = s.players.map(p => ({ id: p.id, village: count(s, p.id, 'village'), town: count(s, p.id, 'town'), long: s.longest === p.id, army: s.army === p.id, vp: [...p.dev, ...p.fresh].filter(c => c === 'vp').length, road: roadLen(s, p.id), guards: p.guards, total: points(s, p.id, true) }));
  note(s, `🏆 ${P(s, pid).name} thắng!`); return true;
}
function produce(s, sum) { /* kho không đủ chia cho mọi người thì loại đó không ai được (trừ khi chỉ một người được nhận: lấy hết phần còn lại) */
  const want = {}, gain = {};
  HEXES.forEach((h, i) => { const x = s.hexes[i]; if (x.n !== sum || i === s.storm) return; for (const v of h.v) { const b = s.B[v]; if (b) (want[b.p] = want[b.p] || empty())[x.t] += b.t; } });
  for (const r of RES) { const who = Object.keys(want).filter(id => want[id][r]), need = who.reduce((n, id) => n + want[id][r], 0); if (!need) continue;
    if (need > s.bank[r] && who.length > 1) continue;
    for (const id of who) { const n = Math.min(want[id][r], s.bank[r]); if (!n) continue; s.bank[r] -= n; P(s, id).hand[r] += n; (gain[id] = gain[id] || empty())[r] += n; } }
  return gain;
}
function stealFrom(s, p, vid, rnd) { const v = P(s, vid), bag = RES.flatMap(r => Array(v.hand[r]).fill(r)); if (!bag.length) return null; const r = bag[Math.floor(rnd() * bag.length)]; v.hand[r]--; p.hand[r]++; return r; }
function afterStorm(s) { s.phase = s.back; s.back = 'main'; }
function endTurn(s) { const p = s.players[s.turn]; p.dev.push(...p.fresh); p.fresh = []; s.played = false; s.free = 0; s.offer = null; s.offN = 0; s.turn = (s.turn + 1) % s.players.length; s.phase = 'roll'; s.dice = null; }
const cleanBag = x => { const o = empty(); if (x && typeof x === 'object') for (const r of RES) o[r] = Math.max(0, Math.min(30, x[r] | 0)); return o; };

export function applyAction(s, pid, a, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random;
  if (!a || typeof a !== 'object') return { ok: false, reason: 'Thao tác lạ.' };
  const p = P(s, pid); if (!p) return { ok: false, reason: 'Bạn đang xem.' };
  if (s.phase === 'ended') return { ok: false, reason: 'Ván đã xong.' };
  const no = reason => ({ ok: false, reason }), yes = () => { s.seq++; return { ok: true }; };
  // ----- việc ai cũng làm được khi tới phiên mình: bỏ bớt bài, trả lời lời mời đổi -----
  if (a.type === 'discard') {
    const n = s.need[pid]; if (s.phase !== 'discard' || !n) return no('Bạn không phải bỏ bài.');
    const c = cleanBag(a.cards); if (total(c) !== n) return no(`Phải bỏ đúng ${n} thẻ.`); if (!canPay(p.hand, c)) return no('Bạn không có đủ các thẻ đó.');
    pay(p.hand, c, s.bank); delete s.need[pid]; note(s, `🥷 ${p.name} bị cướp mất ${n} thẻ.`); if (!Object.keys(s.need).length) s.phase = 'storm'; return yes();
  }
  if (a.type === 'accept' || a.type === 'decline') {
    const of = s.offer; if (!of || of.from === pid || s.phase !== 'main') return no('Không có lời mời nào.');
    if (a.type === 'decline') { if (!of.no.includes(pid)) of.no.push(pid); if (of.no.length >= s.players.length - 1) { s.offer = null; note(s, '🤝 Không ai chịu đổi.'); } return yes(); }
    const from = P(s, of.from); if (!canPay(p.hand, of.get)) return no('Bạn không đủ thứ họ cần.'); if (!canPay(from.hand, of.give)) { s.offer = null; s.seq++; return no('Người mời không còn đủ hàng.'); }
    for (const r of RES) { from.hand[r] += of.get[r] - of.give[r]; p.hand[r] += of.give[r] - of.get[r]; }
    s.offer = null; s.last = { t: 'trade', by: of.from, with: pid }; note(s, `🤝 ${from.name} đổi hàng với ${p.name}.`); return yes();
  }
  if (curId(s) !== pid) return no('Chưa tới lượt bạn.');
  // ----- đầu ván: đặt làng rồi đường, vòng 2 đi ngược -----
  if (s.phase === 'setup') {
    const st = s.setup;
    if (a.type !== 'build' || a.kind !== st.need) return no(st.need === 'village' ? 'Đặt một làng trước đã.' : 'Đặt một con đường cạnh làng vừa dựng.');
    if (!spots(s, pid, st.need).includes(a.at)) return no('Chỗ đó không đặt được.');
    if (st.need === 'village') { s.B[a.at] = { p: pid, t: 1 }; st.v = a.at; st.need = 'road';
      if (st.i >= s.players.length) for (const h of VERTS[a.at].hex) { const t = s.hexes[h].t; if (t !== 'd' && s.bank[t] > 0) { p.hand[t]++; s.bank[t]--; } } /* làng thứ hai: nhận ngay tài nguyên quanh nó */
      s.last = { t: 'build', kind: 'village', at: a.at, by: pid }; return yes(); }
    s.R[a.at] = pid; s.last = { t: 'build', kind: 'road', at: a.at, by: pid }; st.i++; st.need = 'village'; st.v = -1;
    if (st.i >= st.order.length) { s.phase = 'roll'; s.turn = 0; note(s, '🏝️ Khai hoang bắt đầu!'); }
    return yes();
  }
  if (s.phase === 'discard') return no('Chờ mọi người bỏ bớt bài đã.');
  if (s.phase === 'storm') {
    if (a.type !== 'storm') return no('Dời tên cướp sang ô khác trước đã.');
    const h = a.hex | 0; if (!HEXES[h] || a.hex !== h || h === s.storm) return no('Tên cướp phải dời sang ô khác.');
    s.storm = h; const vic = [...new Set(HEXES[h].v.map(v => s.B[v] && s.B[v].p).filter(x => x && x !== pid && total(P(s, x).hand) > 0))];
    s.last = { t: 'storm', hex: h, by: pid }; note(s, `🥷 ${p.name} dời tên cướp.`);
    if (vic.length > 1) { s.phase = 'steal'; s.vic = vic; } else { if (vic.length) { stealFrom(s, p, vic[0], rnd); note(s, `🫳 ${p.name} lấy 1 thẻ của ${P(s, vic[0]).name}.`); } afterStorm(s); }
    return yes();
  }
  if (s.phase === 'steal') {
    if (a.type !== 'steal' || !(s.vic || []).includes(a.from)) return no('Chọn một người để lấy 1 thẻ.');
    stealFrom(s, p, a.from, rnd); note(s, `🫳 ${p.name} lấy 1 thẻ của ${P(s, a.from).name}.`); s.vic = null; afterStorm(s); return yes();
  }
  if (a.type === 'play') {
    const c = a.card; if (!p.dev.includes(c) || c === 'vp') return no('Bạn không có thẻ đó (thẻ mới mua phải chờ lượt sau).');
    if (s.played) return no('Mỗi lượt chỉ dùng 1 thẻ.'); /* luật gốc: thẻ nào cũng dùng được cả trước khi đổ */
    let extra = null;
    if (c === 'plenty') { extra = [a.a, a.b]; if (!extra.every(r => RES.includes(r))) return no('Chọn 2 tài nguyên.'); if (extra[0] === extra[1] ? s.bank[extra[0]] < 2 : extra.some(r => s.bank[r] < 1)) return no('Kho không còn đủ loại đó.'); }
    if (c === 'mono' && !RES.includes(a.r)) return no('Chọn 1 loại tài nguyên.');
    p.dev.splice(p.dev.indexOf(c), 1); s.played = true; s.offer = null; s.last = { t: 'card', card: c, by: pid };
    if (c === 'guard') { p.guards++; fixArmy(s, p); s.back = s.phase; s.phase = 'storm'; note(s, `🛡️ ${p.name} dùng Hiệp sĩ.`); if (checkWin(s, pid)) return yes(); }
    else if (c === 'road') { s.free = Math.min(2, LIMIT.road - count(s, pid, 'road')); note(s, `🛤️ ${p.name} dùng Làm đường: làm 2 đường miễn phí.`); }
    else if (c === 'plenty') { for (const r of extra) { p.hand[r]++; s.bank[r]--; } note(s, `🌾 ${p.name} dùng Năm được mùa.`); }
    else { let n = 0; for (const q of s.players) if (q.id !== pid) { n += q.hand[a.r]; p.hand[a.r] += q.hand[a.r]; q.hand[a.r] = 0; } note(s, `🧺 ${p.name} dùng Độc quyền: gom ${n} ${RES_NAME[a.r]} của cả bàn.`); }
    return yes();
  }
  if (s.phase === 'roll' && !(a.type === 'build' && a.kind === 'road' && s.free > 0)) { /* đường miễn phí của thẻ Làm đường đặt được cả trước khi đổ */
    if (a.type !== 'roll') return no('Đổ xúc xắc trước đã.');
    const d = [1 + Math.floor(rnd() * 6), 1 + Math.floor(rnd() * 6)], sum = d[0] + d[1]; s.dice = d;
    if (sum === 7) { s.need = {}; for (const q of s.players) { const n = total(q.hand); if (n > 7) s.need[q.id] = Math.floor(n / 2); }
      s.back = 'main'; s.phase = Object.keys(s.need).length ? 'discard' : 'storm'; s.last = { t: 'roll', d, by: pid, gain: {} }; note(s, `🎲 ${p.name} đổ ra 7 – tên cướp ra tay!`); }
    else { const gain = produce(s, sum); s.phase = 'main'; s.last = { t: 'roll', d, by: pid, gain }; note(s, `🎲 ${p.name} đổ ra ${sum}.`); }
    return yes();
  }
  // ----- pha chính -----
  if (a.type === 'build') {
    const k = a.kind; if (!COST[k] || k === 'card') return no('Thao tác lạ.');
    if (count(s, pid, k) >= LIMIT[k]) return no('Bạn đã dùng hết quân loại này.');
    if (!spots(s, pid, k).includes(a.at)) return no('Chỗ đó không đặt được.');
    const free = k === 'road' && s.free > 0; if (!free && !canPay(p.hand, COST[k])) return no('Bạn chưa đủ tài nguyên.');
    if (free) s.free--; else pay(p.hand, COST[k], s.bank);
    if (k === 'road') s.R[a.at] = pid; else s.B[a.at] = { p: pid, t: k === 'town' ? 2 : 1 };
    s.offer = null; s.last = { t: 'build', kind: k, at: a.at, by: pid }; note(s, `${k === 'road' ? '🛤️' : k === 'village' ? '🏠' : '🏘️'} ${p.name} ${k === 'road' ? 'làm đường' : k === 'village' ? 'dựng làng' : 'lên thành phố'}.`);
    if (k !== 'town') fixLongest(s); checkWin(s, pid); return yes();
  }
  if (a.type === 'buy') {
    if (!s.deck.length) return no('Hết thẻ rồi.'); if (!canPay(p.hand, COST.card)) return no('Bạn chưa đủ tài nguyên.');
    pay(p.hand, COST.card, s.bank); const c = s.deck.pop(); p.fresh.push(c); s.offer = null; s.last = { t: 'buy', by: pid }; note(s, `🎴 ${p.name} mua 1 thẻ.`); checkWin(s, pid); return yes();
  }
  if (a.type === 'bank') {
    if (!RES.includes(a.give) || !RES.includes(a.get) || a.give === a.get) return no('Chọn thứ đưa và thứ nhận.');
    const r = rate(s, pid, a.give); if (p.hand[a.give] < r) return no(`Cần ${r} ${RES_NAME[a.give]} để đổi.`);
    if (s.bank[a.get] < 1) return no(`Kho hết ${RES_NAME[a.get]} rồi.`);
    p.hand[a.give] -= r; s.bank[a.give] += r; p.hand[a.get]++; s.bank[a.get]--; s.offer = null; s.last = { t: 'bank', by: pid }; note(s, `🏦 ${p.name} đổi ${r} ${RES_NAME[a.give]} lấy 1 ${RES_NAME[a.get]}.`); return yes();
  }
  if (a.type === 'offer') {
    const give = cleanBag(a.give), get = cleanBag(a.get); if (!total(give) || !total(get)) return no('Phải có cả thứ đưa lẫn thứ nhận.');
    if (RES.some(r => give[r] && get[r])) return no('Không đổi cùng một loại.'); if (!canPay(p.hand, give)) return no('Bạn không đủ hàng để đưa.');
    if (s.offN >= 3) return no('Mỗi lượt mời đổi tối đa 3 lần thôi.');
    s.offN++; s.offer = { id: ++s.oid, from: pid, give, get, no: [] }; note(s, `🤝 ${p.name} mời đổi hàng.`); return yes();
  }
  if (a.type === 'cancel') { if (!s.offer) return no('Không có lời mời nào.'); s.offer = null; return yes(); }
  if (a.type === 'end') { endTurn(s); return yes(); }
  return no('Thao tác lạ.');
}
/* ai đang phải làm gì đó (để máy biết lúc nào tới phiên) */
export function actors(s) {
  if (s.phase === 'ended') return [];
  if (s.phase === 'discard') return Object.keys(s.need);
  if (s.offer && s.phase === 'main') return [...s.players.filter(p => p.id !== s.offer.from && !s.offer.no.includes(p.id)).map(p => p.id), s.offer.from];
  return [curId(s)];
}
/* mỗi người chỉ thấy bài + thẻ của mình; của người khác chỉ thấy số lượng */
export function viewFor(s, pid) {
  const me = P(s, pid), ended = s.phase === 'ended';
  return { gid: s.gid, seq: s.seq, phase: s.phase, opts: s.opts, cur: ended ? null : curId(s), hexes: s.hexes, storm: s.storm, ports: s.ports, B: s.B, R: s.R, dice: s.dice, bank: s.bank,
    setup: s.phase === 'setup' ? { need: s.setup.need, v: s.setup.v, round: s.setup.i >= s.players.length ? 2 : 1 } : null, need: s.need, vic: s.vic || null, free: s.free, played: s.played, offer: s.offer,
    longest: s.longest, army: s.army, last: s.last, log: s.log.slice(-6), deckN: s.deck.length,
    players: s.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, color: p.color, cards: total(p.hand), devN: p.dev.length + p.fresh.length, guards: p.guards, pts: points(s, p.id, ended), road: roadLen(s, p.id) })),
    hand: me ? me.hand : empty(), dev: me ? me.dev : [], fresh: me ? me.fresh : [], myPts: me ? points(s, pid, true) : 0,
    result: s.result, winner: s.winner, winners: s.winners, spec: !me };
}
