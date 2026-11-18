// 🎪 Gánh Xiếc Thú – thuần logic. 2–5 người; cơ chế kiểu Fliptoons (xây bộ bài + lật 6 thẻ thành sân khấu 3×2) nhưng tên, các con thú và khả năng đều tự nghĩ.
// Mỗi vòng: ai cũng xào bộ bài của mình rồi lật lần lượt vào 6 ô (hàng trên trái→phải rồi hàng dưới) → tính danh tiếng → lần lượt dùng danh tiếng
// thuê thú mới ở chợ hoặc mời một con trên sân khấu ra khỏi gánh (5 danh tiếng). Danh tiếng không dùng thì mất. Ai đạt 30 danh tiếng trong một vòng
// → mọi người diễn thêm đúng 1 đêm cuối; ai nhiều danh tiếng nhất đêm cuối thắng (người đạt cao nhất lúc chạm mốc được +3 "Khen của báo").
export const GOAL = 30, PRICES = [2, 3, 5, 7, 9], DISMISS = 5, CRITIC = 3, ACTIONS = 2, MIN_KEEP = 4;
/* thú: rank (bậc, xếp chợ), fame (danh tiếng gốc), n (số thẻ trong chồng chợ), fx (khả năng) */
export const TOONS = {
  sau:   { name: 'Sâu nhỏ', icon: '🐛', rank: 0, fame: 1, start: 2, fx: '' },
  chon:  { name: 'Chồn hôi', icon: '🦨', rank: 0, fame: -1, start: 1, fx: 'Hôi quá: −1 danh tiếng. Mời ra khỏi gánh cho đỡ.' },
  chuon: { name: 'Chuồn chuồn', icon: '🪽', rank: 0, fame: 1, start: 1, fx: '+1 nếu đứng cạnh Ong.' },
  ong:   { name: 'Ong', icon: '🐝', rank: 0, fame: 1, start: 1, fx: '' },
  oc:    { name: 'Ốc sên', icon: '🐌', rank: 0, fame: 2, start: 1, fx: 'Đi chậm: luôn bò vào ô trống cuối cùng.' },
  meo:   { name: 'Mèo hề', icon: '🐱', rank: 1, fame: 2, n: 6, fx: '' },
  cho:   { name: 'Chó tung hứng', icon: '🐶', rank: 1, fame: 1, n: 5, fx: '+1 cho mỗi Chó tung hứng đứng cạnh.' },
  ech:   { name: 'Ếch nhảy', icon: '🐸', rank: 2, fame: 1, n: 4, fx: '+2 nếu đứng ở hàng dưới.' },
  thao:  { name: 'Thỏ ảo thuật', icon: '🐰', rank: 2, fame: 2, n: 4, fx: 'Khi lật: rút thêm 1 thẻ chồng lên chính ô này (cả hai cùng diễn).' },
  vet:   { name: 'Vẹt nhại', icon: '🦜', rank: 2, fame: 0, n: 4, fx: 'Nhại: được bằng danh tiếng của thẻ bên trái.' },
  heo:   { name: 'Heo đất', icon: '🐷', rank: 3, fame: 1, n: 3, fx: 'Tiết kiệm: vòng này thuê thú rẻ đi 2.' },
  khi:   { name: 'Khỉ nghịch', icon: '🐵', rank: 3, fame: 3, n: 4, fx: 'Khi lật: úp mặt 1 thẻ kề có danh tiếng thấp nhất (đuổi Chồn hôi!).' },
  cut:   { name: 'Cánh cụt', icon: '🐧', rank: 3, fame: 2, n: 4, fx: '+1 cho mỗi Cánh cụt khác trên sân khấu.' },
  su:    { name: 'Sư tử', icon: '🦁', rank: 4, fame: 6, n: 3, fx: 'Oai quá: −1 cho mỗi thẻ ngửa đứng cạnh.' },
  gau:   { name: 'Gấu trúc', icon: '🐼', rank: 4, fame: 3, n: 3, fx: '+1 cho mỗi thẻ úp trên sân khấu.' },
  cao:   { name: 'Cáo diễn viên', icon: '🦊', rank: 4, fame: 2, n: 3, fx: 'Đứng giữa (cột giữa) thì danh tiếng ×2.' },
  voi:   { name: 'Voi', icon: '🐘', rank: 5, fame: 6, n: 2, fx: 'Không mời ra được.' },
  lan:   { name: 'Kỳ lân', icon: '🦄', rank: 5, fame: 3, n: 2, fx: '+1 cho mỗi loại thú khác nhau trên sân khấu.' },
};
export const START_DECK = Object.entries(TOONS).flatMap(([k, t]) => Array(t.start || 0).fill(k));
export const DEFAULT_OPTS = { goal: 30 };
export const CHOICES = { goal: [20, 30, 40] };
export const optOk = (k, v) => k in CHOICES && CHOICES[k].includes(v);

/* 6 ô: 0 1 2 / 3 4 5 – kề nhau khi chung cạnh */
export const ADJ = [[1, 3], [0, 2, 4], [1, 5], [0, 4], [1, 3, 5], [2, 4]];
function rand(s) { s.seed = (s.seed * 1103515245 + 12345) % 2147483648; return s.seed / 2147483648; }
const shuffle = (s, a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand(s) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
let uid = 0; const card = k => ({ k, id: 'c' + (++uid).toString(36) + Math.random().toString(36).slice(2, 5) });

export function createGame(players, opts = {}, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random;
  const o = { ...DEFAULT_OPTS, ...opts }; if (!CHOICES.goal.includes(o.goal)) o.goal = GOAL;
  const s = { gid: Math.random().toString(36).slice(2, 8), seq: 0, phase: 'play', opts: o, seed: Math.floor(rnd() * 2147483647),
    players: players.slice(0, 5).map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, deck: START_DECK.map(card), out: [], grid: [], fame: 0, best: 0, left: 0, disc: 0, done: false })),
    pile: [], market: [], round: 0, first: 0, cur: 0, final: false, critic: null, log: [], winner: null, winners: [], last: null };
  s.pile = shuffle(s, Object.entries(TOONS).flatMap(([k, t]) => Array(t.n || 0).fill(k)).map(card));
  refill(s); newRound(s);
  return s;
}
function refill(s) { while (s.market.length < 5 && s.pile.length) s.market.push(s.pile.pop()); s.market.sort((a, b) => TOONS[a.k].rank - TOONS[b.k].rank); }
const say = (s, m) => { s.log.push(m); if (s.log.length > 30) s.log.shift(); };
/* lật bộ bài vào sân khấu; grid[i] = danh sách thẻ trong ô (chồng), mỗi thẻ { k, id, up } */
function flip(s, p) {
  const deck = shuffle(s, p.deck.slice()), grid = Array.from({ length: 6 }, () => []);
  const free = () => grid.findIndex(x => !x.length), lastFree = () => { for (let i = 5; i >= 0; i--) if (!grid[i].length) return i; return -1; };
  let i = 0; p.order = [];
  while (i < deck.length && free() >= 0) {
    const c = deck[i++], k = c.k, at = k === 'oc' ? lastFree() : free(); grid[at].push({ ...c, up: true }); p.order.push(c.id);
    if (k === 'thao' && i < deck.length) { const d = deck[i++]; grid[at].push({ ...d, up: true }); p.order.push(d.id); }
    if (k === 'khi') { /* úp mặt thẻ kề có danh tiếng gốc thấp nhất */
      const cand = ADJ[at].flatMap(j => grid[j].filter(x => x.up)).sort((a, b) => TOONS[a.k].fame - TOONS[b.k].fame)[0]; if (cand) cand.up = false; }
  }
  p.grid = grid; p.rest = deck.length - i;
}
export function scoreGrid(grid) {
  const at = (i) => grid[i].filter(x => x.up), parts = [];
  const kinds = new Set(grid.flat().filter(x => x.up).map(x => x.k)), down = grid.flat().filter(x => !x.up).length, cuts = grid.flat().filter(x => x.up && x.k === 'cut').length;
  let total = 0;
  grid.forEach((cell, i) => cell.forEach(c => {
    if (!c.up) { parts.push({ id: c.id, f: 0 }); return; }
    const t = TOONS[c.k], adj = ADJ[i].flatMap(j => at(j)); let f = t.fame;
    if (c.k === 'chuon' && adj.some(x => x.k === 'ong')) f += 1;
    if (c.k === 'cho') f += adj.filter(x => x.k === 'cho').length;
    if (c.k === 'ech' && i >= 3) f += 2;
    if (c.k === 'vet') { const l = i % 3 ? at(i - 1) : []; f = l.reduce((n, x) => n + Math.max(0, x.k === 'vet' ? 0 : TOONS[x.k].fame), 0); }
    if (c.k === 'cut') f += cuts - 1;
    if (c.k === 'su') f -= adj.length;
    if (c.k === 'gau') f += down;
    if (c.k === 'cao' && i % 3 === 1) f *= 2;
    if (c.k === 'lan') f += kinds.size - 1;
    parts.push({ id: c.id, f }); total += f;
  }));
  return { total, parts };
}
function newRound(s) {
  s.round++; s.seq++;
  for (const p of s.players) { flip(s, p); const r = scoreGrid(p.grid); p.fame = Math.max(0, r.total); p.parts = r.parts; p.best = Math.max(p.best, p.fame); p.left = ACTIONS; p.done = false;
    p.disc = p.grid.flat().some(c => c.up && c.k === 'heo') ? 2 : 0; }
  if (s.final) return finish(s);
  const top = Math.max(...s.players.map(p => p.fame));
  if (top >= s.opts.goal) {
    const lead = s.players.filter(p => p.fame === top); s.final = true;
    s.critic = lead.length === 1 ? lead[0].id : null;
    say(s, `🎉 ${lead.map(p => p.name).join(', ')} chạm ${top} danh tiếng! Còn đúng 1 đêm diễn cuối.${s.critic ? ` ${lead[0].name} được báo khen (+${CRITIC} đêm cuối).` : ''}`);
  } else say(s, `🎪 Đêm diễn ${s.round}: ${s.players.map(p => `${p.name} ${p.fame}`).join(' · ')}`);
  s.cur = s.first; s.phase = 'play';
}
function finish(s) {
  for (const p of s.players) p.final = p.fame + (s.critic === p.id ? CRITIC : 0);
  const top = Math.max(...s.players.map(p => p.final)); s.winners = s.players.filter(p => p.final === top).map(p => p.id); s.winner = s.winners[0];
  s.phase = 'ended'; say(s, `🏆 Đêm cuối: ${s.players.map(p => `${p.name} ${p.final}`).join(' · ')}`);
}
export const hirePrice = (s, p, i) => Math.max(0, PRICES[i] - (p.disc || 0));
function nextPlayer(s) {
  s.players[s.cur].done = true; refill(s);
  if (s.players.length === 2 && s.players.every(p => p.done) && s.market.length) { /* 2 người: chợ quay vòng nhanh hơn */ s.market.shift(); if (s.market.length) s.market.pop(); refill(s); }
  if (s.players.every(p => p.done)) { if (!s.pile.length && !s.market.length) s.final = true; s.first = (s.first + 1) % s.players.length; newRound(s); return; }
  s.cur = (s.cur + 1) % s.players.length; s.seq++;
}
export function applyAction(s, pid, a) {
  if (s.phase !== 'play' || !a) return { ok: false, reason: 'Ván đã xong.' };
  const p = s.players.find(x => x.id === pid); if (!p) return { ok: false, reason: 'Bạn đang xem.' };
  if (s.players[s.cur] !== p) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  if (a.type === 'done') { s.last = { by: pid, t: 'done' }; nextPlayer(s); return { ok: true }; }
  if (p.left <= 0) return { ok: false, reason: 'Hết lượt làm rồi.' };
  if (a.type === 'hire') {
    const i = a.i; if (!Number.isInteger(i) || !s.market[i]) return { ok: false, reason: 'Không có thú này.' };
    const cost = hirePrice(s, p, i); if (p.fame < cost) return { ok: false, reason: `Cần ${cost} danh tiếng.` };
    const c = s.market.splice(i, 1)[0]; p.fame -= cost; p.deck.push(c); p.left--; s.seq++;
    s.last = { by: pid, t: 'hire', k: c.k }; say(s, `${p.name} thuê ${TOONS[c.k].icon} ${TOONS[c.k].name} (${cost}).`);
    if (p.left <= 0) nextPlayer(s); return { ok: true };
  }
  if (a.type === 'dismiss') {
    const c = p.grid.flat().find(x => x.id === a.id && x.up); if (!c) return { ok: false, reason: 'Chỉ mời ra được thẻ đang ngửa trên sân khấu.' };
    if (c.k === 'voi') return { ok: false, reason: 'Voi không chịu đi đâu 🐘' };
    if (p.fame < DISMISS) return { ok: false, reason: `Cần ${DISMISS} danh tiếng.` };
    if (p.deck.length <= MIN_KEEP) return { ok: false, reason: `Gánh phải giữ ít nhất ${MIN_KEEP} thú.` };
    p.fame -= DISMISS; p.deck = p.deck.filter(x => x.id !== c.id); p.out.push(c); c.gone = true; p.left--; s.seq++;
    s.last = { by: pid, t: 'dismiss', k: c.k }; say(s, `${p.name} mời ${TOONS[c.k].icon} ${TOONS[c.k].name} ra khỏi gánh.`);
    if (p.left <= 0) nextPlayer(s); return { ok: true };
  }
  return { ok: false, reason: 'Thao tác lạ.' };
}
export const actors = s => (s.phase === 'play' ? [s.players[s.cur].id] : []);
export function viewFor(s, pid) {
  /* mọi thứ đều công khai (bộ bài ai cũng xem được) – chỉ giấu chồng chợ còn úp */
  return { gid: s.gid, seq: s.seq, phase: s.phase, opts: s.opts, round: s.round, final: s.final, critic: s.critic, market: s.market, pileN: s.pile.length,
    prices: PRICES, cur: s.phase === 'play' ? s.players[s.cur].id : null, players: s.players, log: s.log.slice(-6), last: s.last, winner: s.winner, winners: s.winners,
    spec: !s.players.some(p => p.id === pid) };
}
