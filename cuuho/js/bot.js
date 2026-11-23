// 🤖 Máy cho Đội Cứu Hộ – game hợp tác nên bài ai cũng công khai; máy chỉ dùng những gì cả bàn đều thấy (không nhìn thứ tự chồng thẻ).
import * as E from './engine.js?v=3';
const { COLORS, CITY_COLOR, CITY_IDS, NB } = E;

/* độ nguy của một thành phố: điểm nguy nhiều (sắp vỡ đê) thì rất gấp */
const heat = (v, k) => COLORS.reduce((n, c) => { const x = v.cubes[k][c]; return n + (x >= 3 ? 9 : x === 2 ? 4 : x); }, 0);
const cnt = (p, c) => p.hand.filter(x => CITY_COLOR[x] === c).length;
function nextStep(from, to) { /* bước đầu tiên trên đường ngắn nhất */
  if (from === to) return null; const prev = { [from]: null }, q = [from];
  while (q.length) { const x = q.shift(); if (x === to) break; for (const n of NB[x]) if (!(n in prev)) { prev[n] = x; q.push(n); } }
  let x = to; while (prev[x] && prev[x] !== from) x = prev[x]; return prev[x] === from ? x : null;
}
/* đi tới đích: thẳng nếu kề hoặc có trạm hai đầu; xa thì dùng thẻ nếu thẻ đó không cần cho việc khắc phục */
function goTo(v, p, to, spare) {
  if (p.at === to) return null;
  const ways = E.moveWays(v, p, to), d = E.bfs(p.at)[to];
  const w = ways.find(x => x.type === 'move') || ways.find(x => x.type === 'shuttle');
  if (w) return { type: w.type, to };
  if (d >= 3 && spare(to) && ways.some(x => x.type === 'fly')) return { type: 'fly', to };
  /* đi tới trạm gần nhất rồi nhảy trạm nếu đích có trạm */
  if (v.stations.includes(to) && v.stations.includes(p.at)) return { type: 'shuttle', to };
  const st = nextStep(p.at, to); return st ? { type: 'move', to: st } : null;
}
export function botAction(v, pid) {
  if (!v.cur && v.players[v.turn]) v = { ...v, cur: v.players[v.turn].id }; /* nhận cả state (lớp mạng đưa) lẫn view (test) */
  const p = v.players.find(x => x.id === pid); if (!p || v.phase !== 'play') return null;
  const target = c => (p.role === 'scientist' ? 3 : 4); /* số thẻ cần để khắc phục */
  const goalColor = COLORS.filter(c => !v.cured[c]).sort((a, b) => cnt(p, b) - cnt(p, a))[0];
  const spare = card => { const c = CITY_COLOR[card]; return !c || v.cured[c] || c !== goalColor || cnt(p, c) > target(c); };
  if (v.step === 'discard') return { type: 'discard', card: E.worstCard(v, p) };
  if (v.cur !== pid || v.step !== 'act') return null;
  /* 1. đứng ở trạm và đủ thẻ: khắc phục */
  if (v.stations.includes(p.at)) for (const c of COLORS) if (!v.cured[c] && cnt(p, c) >= E.curePrice(p)) return { type: 'cure', color: c };
  /* 2. đủ thẻ mà chưa ở trạm: đi tới trạm gần nhất (hoặc tự lập trạm nếu là Kỹ sư / có thẻ chỗ đang đứng mà không cần) */
  const ready = COLORS.find(c => !v.cured[c] && cnt(p, c) >= E.curePrice(p));
  if (ready) {
    if (!v.stations.includes(p.at) && (p.role === 'engineer' || (p.hand.includes(p.at) && CITY_COLOR[p.at] !== ready))) return { type: 'build' };
    const d = E.bfs(p.at), st = v.stations.slice().sort((a, b) => d[a] - d[b])[0], m = goTo(v, p, st, spare); if (m) return m;
  }
  /* 3. chỗ đang đứng nguy (≥ 2 điểm, hoặc 1 điểm của loại đã khắc phục) thì cứu */
  const here = v.cubes[p.at], hot = COLORS.filter(c => here[c] > 0).sort((a, b) => here[b] - here[a]);
  if (hot.length && (here[hot[0]] >= 2 || v.cured[hot[0]] || p.role === 'medic')) return { type: 'treat', color: hot[0] };
  /* 3b. có nơi sắp vỡ đê (3 điểm): lao tới – xa thì dùng thẻ bay */
  { const d0 = E.bfs(p.at), urgent = CITY_IDS.filter(k => COLORS.some(c => v.cubes[k][c] >= 3)).sort((a, b) => d0[a] - d0[b]);
    const mine = urgent.find(k => !v.players.some(o => o !== p && o.at === k)); /* chỗ chưa có đồng đội đứng */
    if (mine) { if (d0[mine] >= 2 && p.hand.includes(mine)) return { type: 'fly', to: mine };
      if (d0[mine] >= 3 && p.hand.includes(p.at) && spare(p.at)) return { type: 'charter', to: mine };
      if (d0[mine] <= 4) { const m = goTo(v, p, mine, spare); if (m) return m; } } }
  /* 4. trao thẻ cho đồng đội đứng cùng chỗ đang gom cùng màu nhiều hơn mình */
  for (const o of v.players) if (o !== p && o.at === p.at) {
    const cards = p.role === 'logistic' ? p.hand.filter(E.isCity) : p.hand.filter(x => x === p.at);
    for (const c of cards) { const col = CITY_COLOR[c]; if (!v.cured[col] && cnt(o, col) > cnt(p, col) && o.hand.length < E.HAND_MAX) return { type: 'give', other: o.id, card: c }; }
    if (o.hand.includes(p.at)) { const col = CITY_COLOR[p.at]; if (!v.cured[col] && cnt(p, col) > cnt(o, col) && p.hand.length < E.HAND_MAX) return { type: 'take', other: o.id, card: p.at }; }
  }
  /* 5. kỹ sư lập trạm khi xa trạm */
  if (p.role === 'engineer' && !v.stations.includes(p.at)) { const d = E.bfs(p.at); if (Math.min(...v.stations.map(x => d[x])) >= 3) return { type: 'build' }; }
  /* 6. đi tới chỗ nguy nhất (cân nhắc quãng đường) */
  const d = E.bfs(p.at); let best = null, bs = 0;
  for (const k of CITY_IDS) { const h = heat(v, k); if (!h) continue; const sc = h / (1 + d[k] * 0.9); if (sc > bs) { bs = sc; best = k; } }
  if (hot.length) return { type: 'treat', color: hot[0] };
  if (best) { const m = goTo(v, p, best, spare); if (m) return m; }
  return { type: 'pass' };
}
