// 🚁 Đội Cứu Hộ – thuần logic. Chơi hợp tác 2–4 người (cơ chế kiểu Pandemic, đổi thành 4 loại thiên tai trên bản đồ Việt Nam).
// Cả đội thắng khi khắc phục đủ 4 loại thiên tai; thua khi vỡ đê 8 lần, hết điểm nguy của một loại, hoặc hết chồng thẻ cứu hộ.
// Cân bằng (17/11/2026, cuuho/test/sim.mjs, máy đấu máy): mỗi thành phố 2 thẻ, 24 điểm nguy mỗi loại → 2 người thắng 88/71/61% (4/5/6 Siêu thiên tai), 4 người 58/38/20%.
import { CITIES, ROUTES } from '../../xuyenviet/js/map.js?v=4';

export const COLORS = ['b', 'y', 'r', 'o'];
export const HAZ = { b: 'Lũ quét', y: 'Bão', r: 'Cháy rừng', o: 'Hạn mặn' };
export const HAZ_ICON = { b: '🌊', y: '🌀', r: '🔥', o: '🏜️' };
/* mỗi vùng 7 thành phố, mỗi vùng một loại thiên tai */
const REGION = {
  b: ['laocai', 'hagiang', 'dienbien', 'sonla', 'langson', 'hanoi', 'halong'],
  y: ['haiphong', 'ninhbinh', 'thanhhoa', 'vinh', 'donghoi', 'hue', 'danang'],
  r: ['quangngai', 'kontum', 'pleiku', 'quynhon', 'bmt', 'nhatrang', 'dalat'],
  o: ['phanthiet', 'hcm', 'vungtau', 'tayninh', 'cantho', 'rachgia', 'camau'],
};
export const CITY_COLOR = {}; for (const c of COLORS) for (const k of REGION[c]) CITY_COLOR[k] = c;
export const CITY_IDS = Object.keys(CITIES).filter(k => CITY_COLOR[k]);
export const NB = {}; for (const k of CITY_IDS) NB[k] = new Set();
for (const r of ROUTES) if (!r.xv && NB[r.a] && NB[r.b]) { NB[r.a].add(r.b); NB[r.b].add(r.a); }
for (const k of CITY_IDS) NB[k] = [...NB[k]];
export const cityName = k => (CITIES[k] || [k])[0];

export const ROLES = ['medic', 'engineer', 'scientist', 'logistic', 'guard'];
export const ROLE_NAME = { medic: 'Y tế', engineer: 'Kỹ sư', scientist: 'Khí tượng', logistic: 'Hậu cần', guard: 'Bộ đội' };
export const ROLE_ICON = { medic: '🩺', engineer: '🏗️', scientist: '📡', logistic: '📦', guard: '🪖' };
export const ROLE_COLOR = { medic: '#e11d48', engineer: '#d97706', scientist: '#0891b2', logistic: '#7c3aed', guard: '#15803d' };
export const ROLE_DO = {
  medic: 'Cứu nạn là dọn sạch mọi điểm nguy cùng loại ở thành phố đó. Loại đã khắc phục thì tự dọn khi đi tới.',
  engineer: 'Lập trạm cứu hộ không cần thẻ.',
  scientist: 'Khắc phục một loại thiên tai chỉ cần 3 thẻ cùng màu thay vì 4.',
  logistic: 'Trao được BẤT KỲ thẻ thành phố nào cho đồng đội đứng cùng chỗ (không cần đúng thẻ thành phố đang đứng).',
  guard: 'Thành phố đang đứng và các thành phố kề bên không bị thêm điểm nguy (kể cả vỡ đê lan tới).',
};
export const EVENTS = ['heli', 'camp', 'calm', 'fund'];
export const EVENT_NAME = { heli: 'Trực thăng', camp: 'Trạm dã chiến', calm: 'Trời yên biển lặng', fund: 'Ngân sách khẩn' };
export const EVENT_ICON = { heli: '🚁', camp: '⛺', calm: '🌤️', fund: '💰' };
export const EVENT_DO = {
  heli: 'Đưa 1 người bất kỳ tới thành phố bất kỳ.',
  camp: 'Lập 1 trạm cứu hộ ở thành phố bất kỳ, không cần thẻ.',
  calm: 'Bỏ qua bước thiên tai ập tới của lượt này.',
  fund: 'Bỏ hẳn 1 thẻ khỏi chồng thẻ thiên tai đã bốc (thành phố đó khó bị lại).',
};
export const RATE = [2, 2, 2, 2, 3, 3, 4], MAX_OUT = 8, CUBES = 24, MAX_STATIONS = 6, HAND_MAX = 7, CURE_N = 4, START = 'danang';
export const DEFAULT_OPTS = { epi: 4 };
export const CHOICES = { epi: [4, 5, 6] };
export const optOk = (k, v) => k in CHOICES && CHOICES[k].includes(v);

const shuffle = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/* RNG gieo từ seed (patch chơi lại ván cũ): cùng seed → cùng dãy số → cùng bài chia ban đầu. */
export function mulberry32(seed) { let x = (Math.floor(seed) || 0) >>> 0; return () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const isCity = c => typeof c === 'string' && !!CITY_COLOR[c];
export const isEvent = c => typeof c === 'string' && c.startsWith('ev:');
export const cardColor = c => CITY_COLOR[c] || null;

export function createGame(players, opts = {}, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random;
  const o = { ...DEFAULT_OPTS, ...opts }; if (!CHOICES.epi.includes(o.epi)) o.epi = 4;
  /* seed ván (patch chơi lại ván cũ): có seed thì mọi lần xào bài đều chạy bằng mulberry32(seed)
     → cùng seed + cùng người chơi + cùng độ khó = cùng bài chia ban đầu, chơi lại được y hệt.
     Không đưa seed thì sinh ngẫu nhiên rồi cũng dùng nó, để ván nào cũng tái hiện được. */
  const seed = Number.isFinite(+o.seed) ? Math.floor(+o.seed) : Math.floor(Math.random() * 1e9);
  rnd = mulberry32(seed);
  const ps = players.slice(0, 4), roles = shuffle(ROLES.slice(), rnd);
  const s = { gid: Math.random().toString(36).slice(2, 8), seed, seq: 0, phase: 'play', opts: o,
    players: ps.map((p, i) => ({ id: p.id, name: p.name, isBot: !!p.isBot, role: roles[i], at: START, hand: [] })),
    cubes: {}, stations: [START], cured: {}, gone: {}, outbreaks: 0, rateI: 0,
    infDeck: shuffle(CITY_IDS.slice(), rnd), infDisc: [], pDeck: [], pDisc: [],
    turn: 0, left: 4, step: 'act', calm: false, log: [], last: null, result: null, burst: [] };
  for (const k of CITY_IDS) s.cubes[k] = { b: 0, y: 0, r: 0, o: 0 };
  /* bày thiên tai đầu ván: 3 thành phố ×3, 3 ×2, 3 ×1 */
  for (const n of [3, 3, 2, 2, 1, 1]) { const c = s.infDeck.shift(); s.infDisc.push(c); for (let k = 0; k < n; k++) addCube(s, c, CITY_COLOR[c], new Set()); }
  s.outbreaks = 0; s.burst = [];
  /* chia thẻ: 2 người 4 lá, 3 người 3 lá, 4 người 2 lá */
  const deck = shuffle([...CITY_IDS, ...CITY_IDS, ...EVENTS.map(e => "ev:" + e)], rnd) /* bản đồ nhỏ (28 thành phố) nên mỗi thành phố có 2 thẻ */, per = { 2: 4, 3: 3, 4: 2 }[ps.length] || 4;
  for (const p of s.players) for (let k = 0; k < per; k++) p.hand.push(deck.shift());
  /* chia chồng còn lại thành epi phần, mỗi phần nhét 1 thẻ Siêu thiên tai ở chỗ ngẫu nhiên */
  const parts = Array.from({ length: o.epi }, () => []); deck.forEach((c, i) => parts[i % o.epi].push(c));
  s.pDeck = parts.flatMap(part => { part.splice(Math.floor(rnd() * (part.length + 1)), 0, 'epi'); return part; });
  s.rndSeed = Math.floor(rnd() * 1e9);
  s.log.push('Đội cứu hộ tập trung ở Đà Nẵng. Bắt đầu!');
  return s;
}
/* số ngẫu nhiên của ván (giữ trong state để ván tiếp tục được sau khi lưu / máy chủ ngủ dậy) */
function rand(s) { let x = (s.rndSeed = (s.rndSeed * 1103515245 + 12345) % 2147483648); return x / 2147483648; }
const cur = s => s.players[s.turn];
const pl = (s, id) => s.players.find(p => p.id === id);
const guarded = (s, city) => s.players.some(p => p.role === 'guard' && (p.at === city || NB[p.at].includes(city)));
export const totalCubes = (s, c) => CITY_IDS.reduce((n, k) => n + s.cubes[k][c], 0);
const say = (s, m) => { s.log.push(m); if (s.log.length > 40) s.log.shift(); };
function lose(s, why) { if (s.phase === 'ended') return; s.phase = 'ended'; s.result = { win: false, why }; say(s, '💀 Thua: ' + why); }
/* thêm 1 điểm nguy; đã có 3 thì vỡ đê, lan sang các thành phố kề */
function addCube(s, city, c, chain) {
  if (s.phase === 'ended' || s.gone[c] || guarded(s, city)) return;
  if (s.cubes[city][c] >= 3) {
    if (chain.has(city)) return; chain.add(city);
    s.outbreaks++; s.burst.push(city); say(s, `💥 Vỡ đê ở ${cityName(city)} (${HAZ[c]})! (${s.outbreaks}/${MAX_OUT})`);
    if (s.outbreaks >= MAX_OUT) return lose(s, `vỡ đê ${MAX_OUT} lần`);
    for (const n of NB[city]) addCube(s, n, c, chain);
    return;
  }
  if (totalCubes(s, c) >= CUBES) return lose(s, `${HAZ[c]} lan khắp nơi (hết điểm nguy)`);
  s.cubes[city][c]++;
}
/* Y tế đi tới đâu thì loại đã khắc phục ở đó tự sạch */
function medicSweep(s, p) { if (p.role !== 'medic') return; for (const c of COLORS) if (s.cured[c] && s.cubes[p.at][c]) { s.cubes[p.at][c] = 0; checkGone(s, c); } }
function checkGone(s, c) { if (s.cured[c] && !s.gone[c] && totalCubes(s, c) === 0) { s.gone[c] = true; say(s, `✨ ${HAZ[c]} đã bị dập tắt hoàn toàn!`); } }
export const curePrice = p => (p.role === 'scientist' ? CURE_N - 1 : CURE_N);
function useAction(s) { s.seq++; s.left--; if (s.left <= 0) { s.step = 'draw'; drawCards(s); } }
/* hết 4 việc: bốc 2 thẻ, gặp Siêu thiên tai thì xử lý */
function drawCards(s) {
  const p = cur(s);
  for (let k = 0; k < 2 && s.phase !== 'ended'; k++) {
    if (!s.pDeck.length) return lose(s, 'hết thẻ cứu hộ – đội không kịp trở tay');
    const c = s.pDeck.shift();
    if (c === 'epi') epidemic(s); else p.hand.push(c);
  }
  if (s.phase === 'ended') return;
  if (p.hand.length > HAND_MAX) { s.step = 'discard'; return; }
  infectStep(s);
}
function epidemic(s) {
  s.rateI = Math.min(RATE.length - 1, s.rateI + 1); s.burst = [];
  const c = s.infDeck.pop(); say(s, `⚠️ SIÊU THIÊN TAI ở ${cityName(c)}! Mức thiên tai lên ${RATE[s.rateI]}.`);
  for (let k = 0; k < 3; k++) { if (s.cubes[c][CITY_COLOR[c]] >= 3) { addCube(s, c, CITY_COLOR[c], new Set()); break; } addCube(s, c, CITY_COLOR[c], new Set()); }
  s.infDisc.push(c);
  /* xào chồng đã bốc rồi đặt lên trên: các nơi vừa bị sẽ bị lại */
  const back = s.infDisc.splice(0); for (let i = back.length - 1; i > 0; i--) { const j = Math.floor(rand(s) * (i + 1)); [back[i], back[j]] = [back[j], back[i]]; }
  s.infDeck = back.concat(s.infDeck); s.lastEpi = c;
}
function infectStep(s) {
  s.burst = []; const hits = [];
  if (s.calm) { s.calm = false; say(s, '🌤️ Trời yên biển lặng – không có thiên tai lượt này.'); }
  else for (let k = 0; k < RATE[s.rateI] && s.phase !== 'ended'; k++) {
    if (!s.infDeck.length) { s.infDeck = s.infDisc.splice(0); }
    const c = s.infDeck.shift(); s.infDisc.push(c); hits.push(c); addCube(s, c, CITY_COLOR[c], new Set());
  }
  if (hits.length) say(s, `${hits.map(c => HAZ_ICON[CITY_COLOR[c]] + ' ' + cityName(c)).join(', ')} bị thiên tai.`);
  s.hits = hits;
  if (s.phase === 'ended') return;
  s.turn = (s.turn + 1) % s.players.length; s.left = 4; s.step = 'act'; s.seq++;
  for (const p of s.players) medicSweep(s, p);
}
function bfs(from) { const d = { [from]: 0 }, q = [from]; while (q.length) { const x = q.shift(); for (const n of NB[x]) if (d[n] == null) { d[n] = d[x] + 1; q.push(n); } } return d; }
export const dist = (a, b) => bfs(a)[b];
export { bfs };
/* các cách tới một thành phố từ chỗ đang đứng (để giao diện và máy chọn) */
export function moveWays(s, p, to) {
  const out = [];
  if (to === p.at || !CITY_COLOR[to]) return out;
  if (NB[p.at].includes(to)) out.push({ type: 'move', to });
  if (s.stations.includes(p.at) && s.stations.includes(to)) out.push({ type: 'shuttle', to });
  if (p.hand.includes(to)) out.push({ type: 'fly', to });
  if (p.hand.includes(p.at)) out.push({ type: 'charter', to });
  return out;
}

/* ---------- Hoàn tác (patch undo/replay) ----------
   Lịch sử nằm NGOÀI state (WeakMap theo object state), vì state được JSON hoá vào
   snapshot phòng (localStorage / máy chủ) mỗi lần broadcast — nhét ~60 ảnh chụp
   vào state sẽ phình snapshot ~60 lần. Hồi phục ván từ snapshot thì lịch sử trống
   (chỉ mất hoàn tác, ván vẫn chơi tiếp được). Mỗi snapshot là ảnh chụp toàn bộ
   state TRƯỚC một nước đi thành công; hoàn tác quay về nước của chính người bấm
   gần nhất (bỏ qua các nước máy chen giữa), nên 1 lần bấm = lùi đúng 1 nước của mình. */
const HIST = new WeakMap();
const snapOf = s => JSON.parse(JSON.stringify(s));
const histOf = s => { let h = HIST.get(s); if (!h) { h = []; HIST.set(s, h); } return h; };
export const canUndo = (s, pid) => { const i = (s.players || []).findIndex(p => p.id === pid); if (i < 0) return false; return (HIST.get(s) || []).some(x => x.turn === i && x.step === 'act'); };
export function undoLast(s, pid) {
  const i = (s.players || []).findIndex(p => p.id === pid); if (i < 0) return { ok: false, reason: 'Bạn đang xem.' };
  const h = HIST.get(s) || []; let snap = null;
  while (h.length) { const x = h.pop(); if (x.turn === i && x.step === 'act') { snap = x; break; } }
  if (!snap) return { ok: false, reason: 'Không còn nước để hoàn tác.' };
  for (const k of Object.keys(s)) delete s[k]; Object.assign(s, snap); s.seq++;
  say(s, `↩️ ${s.players[i].name} hoàn tác.`);
  return { ok: true };
}
export function applyAction(s, pid, a) {
  if (a && a.type === 'undo') return undoLast(s, pid);
  const snap = snapOf(s); const r = applyActionInner(s, pid, a);
  if (r && r.ok) { const h = histOf(s); h.push(snap); if (h.length > 60) h.shift(); }
  return r;
}
function applyActionInner(s, pid, a) {
  if (s.phase !== 'play' || !a) return { ok: false, reason: 'Ván đã xong.' };
  const p = pl(s, pid); if (!p) return { ok: false, reason: 'Bạn đang xem.' };
  if (a.type === 'event') return playEvent(s, p, a);
  if (s.step === 'discard') {
    if (p !== cur(s)) return { ok: false, reason: 'Chờ người đang bỏ bớt thẻ.' };
    if (a.type !== 'discard') return { ok: false, reason: 'Bỏ bớt thẻ cho còn 7 lá đã.' };
    const i = p.hand.indexOf(a.card); if (i < 0) return { ok: false, reason: 'Không có thẻ này.' };
    p.hand.splice(i, 1); s.pDisc.push(a.card); s.seq++;
    if (p.hand.length <= HAND_MAX) infectStep(s);
    return { ok: true };
  }
  if (p !== cur(s)) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  if (s.step !== 'act') return { ok: false, reason: 'Đang xử lý…' };
  const spend = c => { const i = p.hand.indexOf(c); p.hand.splice(i, 1); s.pDisc.push(c); };
  switch (a.type) {
    case 'move': case 'fly': case 'charter': case 'shuttle': {
      const w = moveWays(s, p, a.to).find(x => x.type === a.type); if (!w) return { ok: false, reason: 'Không đi được tới đó bằng cách này.' };
      if (a.type === 'fly') spend(a.to); if (a.type === 'charter') spend(p.at);
      const from = p.at; p.at = a.to; s.last = { by: pid, t: a.type, from, to: a.to }; medicSweep(s, p);
      say(s, `${p.name} ${{ move: 'đi', fly: 'bay', charter: 'thuê chuyến bay', shuttle: 'đi giữa hai trạm' }[a.type]} tới ${cityName(a.to)}.`);
      useAction(s); return { ok: true };
    }
    case 'treat': {
      const c = COLORS.includes(a.color) ? a.color : null; if (!c || !s.cubes[p.at][c]) return { ok: false, reason: 'Ở đây không có điểm nguy loại này.' };
      const n = p.role === 'medic' || s.cured[c] ? s.cubes[p.at][c] : 1; s.cubes[p.at][c] -= n; checkGone(s, c);
      s.last = { by: pid, t: 'treat', at: p.at, c }; say(s, `${p.name} cứu nạn ở ${cityName(p.at)} (−${n} ${HAZ[c]}).`);
      useAction(s); return { ok: true };
    }
    case 'build': {
      if (s.stations.includes(p.at)) return { ok: false, reason: 'Ở đây đã có trạm.' };
      if (p.role !== 'engineer' && !p.hand.includes(p.at)) return { ok: false, reason: 'Cần thẻ của chính thành phố này.' };
      if (p.role !== 'engineer') spend(p.at);
      if (s.stations.length >= MAX_STATIONS) { const old = s.stations.find(x => x !== START) || s.stations[0]; s.stations = s.stations.filter(x => x !== old); }
      s.stations.push(p.at); s.last = { by: pid, t: 'build', at: p.at }; say(s, `${p.name} lập trạm cứu hộ ở ${cityName(p.at)}.`);
      useAction(s); return { ok: true };
    }
    case 'give': case 'take': {
      const o = pl(s, a.other); if (!o || o === p || o.at !== p.at) return { ok: false, reason: 'Hai người phải đứng cùng thành phố.' };
      const giver = a.type === 'give' ? p : o, getter = a.type === 'give' ? o : p, card = a.card;
      if (!giver.hand.includes(card) || !isCity(card)) return { ok: false, reason: 'Không có thẻ này.' };
      if (card !== p.at && giver.role !== 'logistic') return { ok: false, reason: 'Chỉ trao được thẻ của chính thành phố đang đứng (trừ Hậu cần).' };
      giver.hand.splice(giver.hand.indexOf(card), 1); getter.hand.push(card);
      s.last = { by: pid, t: 'give', card }; say(s, `${giver.name} trao thẻ ${cityName(card)} cho ${getter.name}.`);
      if (getter.hand.length > HAND_MAX) { /* người nhận vượt 7 lá: tự bỏ thẻ ít giá trị nhất của màu họ có ít nhất */
        const bad = worstCard(s, getter); getter.hand.splice(getter.hand.indexOf(bad), 1); s.pDisc.push(bad); say(s, `${getter.name} quá 7 lá, bỏ ${cardLabel(bad)}.`); }
      useAction(s); return { ok: true };
    }
    case 'cure': {
      const c = a.color; if (!COLORS.includes(c) || s.cured[c]) return { ok: false, reason: 'Loại này đã khắc phục rồi.' };
      if (!s.stations.includes(p.at)) return { ok: false, reason: 'Phải đứng ở trạm cứu hộ.' };
      const need = curePrice(p), have = p.hand.filter(x => CITY_COLOR[x] === c); if (have.length < need) return { ok: false, reason: `Cần ${need} thẻ ${HAZ[c]}.` };
      const use = Array.isArray(a.cards) && a.cards.length === need && a.cards.every(x => have.includes(x)) && new Set(a.cards).size === need ? a.cards : have.slice(0, need);
      for (const x of use) spend(x);
      s.cured[c] = true; checkGone(s, c); for (const q of s.players) medicSweep(s, q);
      s.last = { by: pid, t: 'cure', c }; say(s, `🎉 ${p.name} tìm ra cách khắc phục ${HAZ[c]}!`);
      if (COLORS.every(x => s.cured[x])) { s.phase = 'ended'; s.result = { win: true }; say(s, '🏆 Cả đội đã khắc phục đủ 4 loại thiên tai!'); s.seq++; return { ok: true }; }
      useAction(s); return { ok: true };
    }
    case 'pass': { s.left = 1; useAction(s); return { ok: true }; }
  }
  return { ok: false, reason: 'Thao tác lạ.' };
}
export const cardLabel = c => c === 'epi' ? 'Siêu thiên tai' : isEvent(c) ? EVENT_ICON[c.slice(3)] + ' ' + EVENT_NAME[c.slice(3)] : cityName(c);
function playEvent(s, p, a) {
  const card = 'ev:' + a.ev; if (!p.hand.includes(card)) return { ok: false, reason: 'Không có thẻ này.' };
  if (a.ev === 'heli') { const t = pl(s, a.who); if (!t || !CITY_COLOR[a.to]) return { ok: false, reason: 'Chọn người và thành phố.' }; t.at = a.to; medicSweep(s, t); say(s, `🚁 Trực thăng đưa ${t.name} tới ${cityName(a.to)}.`); }
  else if (a.ev === 'camp') { if (!CITY_COLOR[a.to] || s.stations.includes(a.to)) return { ok: false, reason: 'Chọn thành phố chưa có trạm.' }; if (s.stations.length >= MAX_STATIONS) s.stations.splice(s.stations.findIndex(x => x !== START), 1); s.stations.push(a.to); say(s, `⛺ Lập trạm dã chiến ở ${cityName(a.to)}.`); }
  else if (a.ev === 'calm') { if (s.calm) return { ok: false, reason: 'Đã dùng rồi.' }; s.calm = true; say(s, '🌤️ Trời yên biển lặng: lần thiên tai kế tiếp được bỏ qua.'); }
  else if (a.ev === 'fund') { const i = s.infDisc.indexOf(a.city); if (i < 0) return { ok: false, reason: 'Chọn thành phố trong chồng thẻ thiên tai đã bốc.' }; s.infDisc.splice(i, 1); say(s, `💰 Ngân sách khẩn: ${cityName(a.city)} được gia cố, bỏ khỏi chồng thiên tai.`); }
  else return { ok: false, reason: 'Thẻ lạ.' };
  p.hand.splice(p.hand.indexOf(card), 1); s.pDisc.push(card); s.seq++; s.last = { by: p.id, t: 'event', ev: a.ev };
  if (s.step === 'discard' && cur(s).hand.length <= HAND_MAX) infectStep(s);
  return { ok: true };
}
/* thẻ ít giá trị nhất: màu đã khắc phục, rồi màu mình ít thẻ nhất */
export function worstCard(s, p) {
  const cnt = c => p.hand.filter(x => CITY_COLOR[x] === c).length;
  return p.hand.filter(isCity).sort((x, y) => (s.cured[CITY_COLOR[y]] ? 1 : 0) - (s.cured[CITY_COLOR[x]] ? 1 : 0) || cnt(CITY_COLOR[x]) - cnt(CITY_COLOR[y]))[0] || p.hand[0];
}
export const actors = s => (s.phase !== 'play' ? [] : [cur(s).id]);
export function viewFor(s, pid) {
  /* game hợp tác: bài ai cũng thấy; chỉ giấu thứ tự chồng thẻ */
  return { gid: s.gid, seq: s.seq, phase: s.phase, opts: s.opts, seed: s.seed != null ? s.seed : null, canUndo: canUndo(s, pid), players: s.players, cubes: s.cubes, stations: s.stations, cured: s.cured, gone: s.gone,
    outbreaks: s.outbreaks, rate: RATE[s.rateI], rateI: s.rateI, infDisc: s.infDisc, pDeckN: s.pDeck.length, epiLeft: s.pDeck.filter(c => c === 'epi').length,
    cur: s.phase === 'play' ? cur(s).id : null, left: s.left, step: s.step, calm: s.calm, log: s.log.slice(-8), last: s.last, result: s.result, burst: s.burst, hits: s.hits || [], lastEpi: s.lastEpi || null,
    spec: !s.players.some(p => p.id === pid) };
}
