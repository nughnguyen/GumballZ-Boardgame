// 🤖 Máy chơi Đảo Khai Hoang: chỉ dùng bài của chính nó + những gì cả bàn thấy (bản đồ, làng, đường, số thẻ của người khác). Không nhìn bài hay thẻ úp của ai.
import { HEXES, VERTS, EDGES, PIP, edgeOf } from './map.js?v=2';
import { RES, COST, LIMIT, canPay, total, spots, rate, count, points, curId, roadLen, applyAction } from './engine.js?v=4';
const pips = (s, v) => VERTS[v].hex.reduce((n, h) => n + (h === s.storm ? 0 : PIP[s.hexes[h].n] || 0), 0);
/* độ ngon của một góc với người pid: tổng chấm + thưởng loại tài nguyên mình chưa có + bến thuyền */
function vScore(s, pid, v) {
  const have = new Set(); for (const k in s.B) if (s.B[k].p === pid) for (const h of VERTS[k].hex) have.add(s.hexes[h].t);
  let sc = VERTS[v].hex.reduce((n, h) => n + (PIP[s.hexes[h].n] || 0), 0);
  for (const t of new Set(VERTS[v].hex.map(h => s.hexes[h].t))) if (t !== 'd' && !have.has(t)) sc += 1.5;
  if (s.ports.some(p => p.v.includes(v))) sc += 1;
  return sc;
}
const free = (s, v) => !s.B[v] && !VERTS[v].adj.some(a => s.B[a]);
/* đường nào dẫn tới chỗ dựng làng ngon nhất (nhìn trước 2 bước) */
function bestRoad(s, pid, list) {
  let best = null, bs = -1;
  for (const e of list) { const E = EDGES[e];
    for (const end of [E.a, E.b]) { if (s.B[end] && s.B[end].p !== pid) continue; let sc = free(s, end) ? vScore(s, pid, end) + 3 : 0;
      for (const n of VERTS[end].adj) if (free(s, n)) sc = Math.max(sc, vScore(s, pid, n) * .8);
      if (sc > bs) { bs = sc; best = e; } } }
  return best ?? list[0];
}
const E_total = h => RES.reduce((n, r) => n + (h[r] || 0), 0);
const miss = (h, c) => Object.keys(c).reduce((n, r) => n + Math.max(0, c[r] - h[r]), 0);
// ---------- mức Khó: thử từng nước đi hợp lệ trên bản sao ván, chấm điểm thế cờ sau nước đó, chọn nước tốt nhất ----------
// Ý tưởng "chấm điểm thế cờ theo các đặc trưng có trọng số" tham khảo bài viết của tác giả catanatron (bcollazo); code ở đây tự viết.
// Bản sao chỉ dùng thông tin công khai + bài của chính mình: nước "mua thẻ" không bốc thật mà tính như có thêm 1 thẻ chưa biết.
const PROB = n => (PIP[n] || 0) / 36;
function prodOf(s, pid) { /* sản lượng kỳ vọng mỗi lượt theo từng loại tài nguyên (ô có tên cướp không tính) */
  const r = { w: 0, b: 0, g: 0, f: 0, o: 0 };
  for (const k in s.B) { const b = s.B[k]; if (b.p !== pid) continue; for (const h of VERTS[k].hex) { const x = s.hexes[h]; if (x.t !== 'd' && h !== s.storm) r[x.t] += PROB(x.n) * b.t; } }
  return r;
}
const W = { vp: 1000, prod: 60, variety: 6, enemy: -18, reach: 14, nodes: 3, synergy: 8, hand: .4, discard: -6, dev: 4, army: 5, road: 1.2, port: 2.5 };
function value(s, pid) {
  const p = s.players.find(x => x.id === pid), h = p.hand, pr = prodOf(s, pid);
  let v = W.vp * points(s, pid, true);
  v += W.prod * RES.reduce((n, r) => n + pr[r], 0) + W.variety * RES.filter(r => pr[r] > 0).length;
  const others = s.players.filter(q => q.id !== pid); if (others.length) v += W.enemy * others.reduce((n, q) => { const x = prodOf(s, q.id); return n + RES.reduce((m, r) => m + x[r], 0); }, 0) / others.length;
  /* chỗ dựng làng: ngay bây giờ (đang nối đường) và cách thêm 1 đoạn */
  const now = spots(s, pid, 'village'); v += W.nodes * now.length + W.reach * now.reduce((n, x) => Math.max(n, VERTS[x].hex.reduce((m, h) => m + PROB(s.hexes[h].n), 0)), 0) * 3;
  const ends = new Set(); for (const e of EDGES) if (s.R[e.id] === pid) for (const x of [e.a, e.b]) if (!s.B[x] || s.B[x].p === pid) for (const y of VERTS[x].adj) if (free(s, y) && s.R[edgeOf(x, y)] === undefined) ends.add(y);
  let bestReach = 0; for (const y of ends) bestReach = Math.max(bestReach, VERTS[y].hex.reduce((m, hh) => m + PROB(s.hexes[hh].n), 0)); v += W.reach * bestReach;
  /* bài trên tay: gần đủ làng / thành phố thì tốt, cầm quá 7 thì dễ mất */
  const dCity = (Math.max(0, 2 - h.g) + Math.max(0, 3 - h.o)) / 5, dVil = (Math.max(0, 1 - h.w) + Math.max(0, 1 - h.b) + Math.max(0, 1 - h.g) + Math.max(0, 1 - h.f)) / 4;
  v += W.synergy * (2 - dCity - dVil) + W.hand * total(h) + (total(h) > 7 ? W.discard * (total(h) - 7) : 0);
  v += W.dev * (p.dev.length + p.fresh.length) + W.army * p.guards + W.road * roadLen(s, pid) * (now.length ? .3 : 1);
  for (const pt of s.ports) if (pt.v.some(x => s.B[x] && s.B[x].p === pid)) v += W.port * (pt.t === '*' ? 1 : pr[pt.t] * 20);
  return v;
}
function candidates(s, pid) {
  const p = s.players.find(x => x.id === pid), out = [{ type: 'end' }];
  const vs = count(s, pid, 'village') < LIMIT.village ? spots(s, pid, 'village') : [];
  for (const k of ['village', 'town', 'road']) if (count(s, pid, k) < LIMIT[k] && (canPay(p.hand, COST[k]) || (k === 'road' && s.free > 0)) && (k !== 'road' || s.free > 0 || !vs.length || total(p.hand) > 7)) for (const at of spots(s, pid, k)) out.push({ type: 'build', kind: k, at }); /* đường: chỉ khi hết chỗ dựng làng, có đường miễn phí, hoặc cầm nhiều bài */
  /* mua thẻ, đổi kho, mời đổi: để phần nhắm mục tiêu của mức Vừa lo (chấm điểm từng bước thì máy hay tiêu mất đá/lúa đang dành lên thành phố) */
  if (!s.played) {
    if (p.dev.includes('road') && count(s, pid, 'road') < LIMIT.road) out.push({ type: 'play', card: 'road' });
    if (p.dev.includes('plenty')) for (const a of RES) for (const b of RES) if (a <= b && (a === b ? s.bank[a] >= 2 : s.bank[a] && s.bank[b])) out.push({ type: 'play', card: 'plenty', a, b });
    if (p.dev.includes('mono')) for (const r of RES) out.push({ type: 'play', card: 'mono', r, guess: true });
  }
  return out;
}
function hardMove(s, pid, rnd) {
  const base = value(s, pid); let best = { type: 'end' }, bv = base;
  for (const a of candidates(s, pid)) {
    if (a.type === 'end') continue;
    const c = structuredClone(s), me = c.players.find(x => x.id === pid);
    if (a.type === 'buy') { for (const r of Object.keys(COST.card)) { me.hand[r] -= COST.card[r]; c.bank[r] += COST.card[r]; } me.fresh.push('?'); c.deck.pop(); }
    else if (a.guess) { /* Độc quyền: không biết bài người khác → ước lượng mỗi người có 1/5 số thẻ của họ là loại đó */
      const n = Math.round(c.players.filter(q => q.id !== pid).reduce((m, q) => m + total(q.hand), 0) / 5); me.hand[a.r] += n; me.dev.splice(me.dev.indexOf('mono'), 1); c.played = true;
      if (n < 3) continue; }
    else if (!applyAction(c, pid, a, rnd).ok) continue;
    let val = value(c, pid);
    if (a.type === 'play' && a.card === 'road') val += 2; /* đường miễn phí: chấm sau khi đặt (bước kế) */
    if (val > bv + .01) { bv = val; best = a; }
  }
  if (best.guess) { const { guess, ...a } = best; return a; }
  return best;
}
export function botAction(s, pid, _p, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random;
  const p = s.players.find(x => x.id === pid); if (!p || s.phase === 'ended') return null;
  const lv = s.opts.level, h = p.hand;
  if (s.phase === 'discard') { if (!s.need[pid]) return null; const c = { w: 0, b: 0, g: 0, f: 0, o: 0 }, left = { ...h }; for (let i = 0; i < s.need[pid]; i++) { const r = [...RES].sort((a, b) => left[b] - left[a])[0]; left[r]--; c[r]++; } return { type: 'discard', cards: c }; }
  if (s.offer && s.phase === 'main' && s.offer.from !== pid) { /* lời mời đổi: nhận khi thứ được nhận đang thiếu, thứ phải đưa đang dư, và người mời chưa sắp thắng */
    const of = s.offer; if (of.no.includes(pid)) return null;
    const lead = points(s, of.from) >= s.opts.goal - 2, okPay = canPay(h, of.get);
    const want = RES.every(r => !of.give[r] || h[r] <= 1), spare = RES.every(r => !of.get[r] || h[r] - of.get[r] >= 1), fair = total(of.give) >= total(of.get);
    return { type: okPay && !lead && (lv === 1 ? fair && rnd() < .6 : want && spare && fair) ? 'accept' : 'decline' };
  }
  if (s.offer && s.phase === 'main' && s.offer.from === pid) { /* mình đang mời: chờ người thật trả lời 12 giây, không ai nhận thì rút lời mời */
    const id = s.offer.id; return new Promise(r => setTimeout(() => r(s.offer && s.offer.id === id ? { type: 'cancel' } : null), 12000));
  }
  if (curId(s) !== pid) return null;
  if (s.phase === 'setup') { const k = s.setup.need, list = spots(s, pid, k); if (!list.length) return null;
    if (k === 'village') { const sc = v => vScore(s, pid, v) + (lv === 1 ? rnd() * 6 : rnd() * .5); return { type: 'build', kind: k, at: list.reduce((a, b) => (sc(b) > sc(a) ? b : a)) }; }
    return { type: 'build', kind: k, at: bestRoad(s, pid, list) }; }
  if (s.phase === 'storm') { /* dời tên cướp tới ô ngon nhất của người đang dẫn đầu, tránh ô của mình */
    let best = -1, bs = -1e9; const top = Math.max(...s.players.filter(q => q.id !== pid).map(q => points(s, q.id)));
    HEXES.forEach((hx, i) => { if (i === s.storm) return; let sc = rnd() * .5; const own = hx.v.map(v => s.B[v]).filter(Boolean);
      if (own.some(b => b.p === pid)) sc -= 20; for (const b of own) if (b.p !== pid) sc += (PIP[s.hexes[i].n] || 0) * b.t * (lv >= 2 && points(s, b.p) === top ? 1.6 : 1);
      if (sc > bs) { bs = sc; best = i; } });
    return { type: 'storm', hex: best }; }
  if (s.phase === 'steal') { const v = [...s.vic].sort((a, b) => points(s, b) - points(s, a)); return { type: 'steal', from: lv === 1 ? s.vic[Math.floor(rnd() * s.vic.length)] : v[0] }; }
  const mineHex = HEXES[s.storm].v.some(v => s.B[v] && s.B[v].p === pid);
  if (!s.played && p.dev.includes('guard') && (mineHex || (lv >= 2 && s.phase === 'main' && p.guards >= 2))) return { type: 'play', card: 'guard' };
  if (s.phase === 'roll') return { type: 'roll' };
  if (s.phase !== 'main') return null;
  if (lv >= 3) {
    if (s.free > 0) { const rs = spots(s, pid, 'road'); if (rs.length) return hardMove({ ...s }, pid, rnd); }
    const m = hardMove(s, pid, rnd); if (m.type !== 'end') return m;
  }
  const nV = count(s, pid, 'village'), nT = count(s, pid, 'town'), nR = count(s, pid, 'road');
  const vs = nV < LIMIT.village ? spots(s, pid, 'village') : [], ts = nT < LIMIT.town ? spots(s, pid, 'town') : [], rs = nR < LIMIT.road ? spots(s, pid, 'road') : [];
  if (s.free > 0 && rs.length) return { type: 'build', kind: 'road', at: bestRoad(s, pid, rs) };
  if (ts.length && canPay(h, COST.town)) return { type: 'build', kind: 'town', at: ts.reduce((a, b) => (pips(s, b) > pips(s, a) ? b : a)) };
  if (vs.length && canPay(h, COST.village)) return { type: 'build', kind: 'village', at: vs.reduce((a, b) => (vScore(s, pid, b) > vScore(s, pid, a) ? b : a)) };
  if (!s.played && lv >= 2) {
    if (p.dev.includes('road') && rs.length && nR <= LIMIT.road - 2) return { type: 'play', card: 'road' };
    if (p.dev.includes('plenty')) { const goal = ts.length ? COST.town : COST.village, need = RES.filter(r => (goal[r] || 0) > h[r]); const x = need[0], y = need[1] || need[0]; if (need.length && miss(h, goal) <= 2 && (x === y ? s.bank[x] >= 2 : s.bank[x] > 0 && s.bank[y] > 0)) return { type: 'play', card: 'plenty', a: x, b: y }; }
    if (p.dev.includes('mono') && s.players.some(q => q.id !== pid && q.cards !== 0)) { const goal = ts.length ? COST.town : COST.village, need = RES.filter(r => (goal[r] || 0) > h[r]); if (need.length === 1) return { type: 'play', card: 'mono', r: need[0] }; }
  }
  const wantRoad = rs.length && !vs.length && nV < LIMIT.village; /* hết chỗ dựng làng thì mới làm đường tìm chỗ mới */
  if (wantRoad && canPay(h, COST.road)) return { type: 'build', kind: 'road', at: bestRoad(s, pid, rs) };
  /* thiếu đúng 1 thẻ cho việc đang nhắm tới → mời cả bàn đổi 1 thẻ đang dư (mỗi lượt 1 lần) */
  if (lv >= 2 && !s.offN && s.players.some(q => q.id !== pid && E_total(q.hand) > 0)) for (const g of [ts.length ? COST.town : null, vs.length ? COST.village : null].filter(Boolean)) {
    const need = RES.filter(r => (g[r] || 0) > h[r]); if (need.length !== 1 || g[need[0]] - h[need[0]] !== 1) continue;
    const spare = RES.filter(r => r !== need[0] && h[r] - (g[r] || 0) >= 1).sort((a, b) => (h[b] - (g[b] || 0)) - (h[a] - (g[a] || 0)));
    if (spare.length && rate(s, pid, spare[0]) > h[spare[0]] - (g[spare[0]] || 0)) return { type: 'offer', give: { [spare[0]]: 1 }, get: { [need[0]]: 1 } };
  }
  /* chọn việc đang nhắm tới, rồi đổi phần dư với kho cho đủ */
  const goals = []; if (ts.length) goals.push(COST.town); if (vs.length) goals.push(COST.village); if (wantRoad) goals.push(COST.road); if (s.deck.length && lv >= 2) goals.push(COST.card);
  for (const g of goals) { const need = RES.filter(r => (g[r] || 0) > h[r]); if (!need.length) continue;
    const give = RES.filter(r => h[r] - (g[r] || 0) >= rate(s, pid, r)).sort((a, b) => (h[b] - (g[b] || 0)) - (h[a] - (g[a] || 0)));
    const can = give.reduce((n, r) => n + Math.floor((h[r] - (g[r] || 0)) / rate(s, pid, r)), 0);
    if (give.length && can >= miss(h, g) && need.every(r => s.bank[r] > 0)) return { type: 'bank', give: give[0], get: need[0] }; }
  if (s.deck.length && canPay(h, COST.card) && (lv >= 2 || rnd() < .5) && !(ts.length && h.o >= 2) && (total(h) > 5 || !vs.length)) return { type: 'buy' };
  if (total(h) > 7 && rs.length && canPay(h, COST.road) && nR < 12) return { type: 'build', kind: 'road', at: bestRoad(s, pid, rs) }; /* cầm nhiều bài quá thì tiêu bớt kẻo gặp tên cướp */
  return { type: 'end' };
}
