// 🏮 Chợ Lớn – game mặc cả mở tiệm (lấy cảm hứng từ dòng game "đổi đất, gom tiệm"; tên, bàn chơi và hình đều do GumballZ tự làm).
// 6 năm. Mỗi năm: nhận sổ đất (giữ một phần) → nhận biển hiệu tiệm → tự do mặc cả đổi đất / biển hiệu / tiền và dựng tiệm → thu tiền.
// Tiệm cùng loại nằm liền nhau (chung cạnh, cùng khu) trên đất của mình tạo thành một chuỗi; chuỗi đủ số tiệm của loại đó thì được thưởng lớn. Hết 6 năm ai nhiều tiền nhất thắng.
export const YEARS = 6, START_CASH = 50; /* đơn vị: nghìn đồng bạc */
/* bàn: 6 khu, mỗi khu là lưới 5 × 3 (khu đầu đủ 15 lô, các khu sau khuyết 1 góc) → 85 lô đất, đánh số 1..85 */
export const LOTS = []; export const DISTRICTS = ['Bến Bình Tây', 'Phố Thuốc Bắc', 'Hẻm Hào Sĩ Phường', 'Chợ Kim Biên', 'Phố Lồng Đèn', 'Bến Hàm Tử'];
{ let id = 1; for (let d = 0; d < 6; d++) for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { if (d > 0 && r === (d % 2 ? 0 : 2) && c === (d % 3 === 0 ? 0 : 4)) continue; LOTS.push({ id: id++, d, r, c }); } }
export const lot = id => LOTS[id - 1];
const NB = {}; for (const a of LOTS) NB[a.id] = LOTS.filter(b => b.d === a.d && Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1).map(b => b.id);
export const neighbors = id => NB[id];
/* 12 loại tiệm: need = số tiệm liền nhau để thành chuỗi hoàn chỉnh; mỗi loại có need + 3 biển hiệu */
export const SHOPS = [
  { k: 'tra', n: 'Tiệm trà', e: '🍵', need: 3 }, { k: 'anh', n: 'Tiệm ảnh', e: '📷', need: 3 }, { k: 'haisan', n: 'Vựa hải sản', e: '🦐', need: 3 },
  { k: 'vang', n: 'Tiệm vàng', e: '💍', need: 4 }, { k: 'thuoc', n: 'Tiệm thuốc bắc', e: '🌿', need: 4 }, { k: 'may', n: 'Tiệm may', e: '🧵', need: 4 },
  { k: 'mi', n: 'Tiệm mì', e: '🍜', need: 5 }, { k: 'giat', n: 'Tiệm giặt ủi', e: '🧺', need: 5 }, { k: 'doco', n: 'Tiệm đồ cổ', e: '🏺', need: 5 },
  { k: 'nhahang', n: 'Tửu lầu', e: '🥟', need: 6 }, { k: 'moc', n: 'Xưởng mộc', e: '🪑', need: 6 }, { k: 'taphoa', n: 'Tiệm lồng đèn', e: '🏮', need: 6 },
];
export const shop = k => SHOPS.find(s => s.k === k);
const PART = [0, 10, 20, 40, 60, 80], FULL = { 3: 50, 4: 80, 5: 110, 6: 140 };
/* tiền thu của một chuỗi `size` tiệm loại cần `need`: đủ bộ thì lãnh thưởng, phần dư tính như chuỗi mới */
export function payOf(size, need) { let p = 0; while (size >= need) { p += FULL[need]; size -= need; } return p + PART[size]; }
/* số sổ đất phát / được giữ và số biển hiệu mỗi năm theo số người chơi */
export function dealOf(n, year) { const first = year === 1; return n <= 3 ? { get: first ? 7 : 6, keep: first ? 5 : 4, tiles: first ? 7 : 4 } : n === 4 ? { get: first ? 6 : 5, keep: first ? 4 : 3, tiles: first ? 6 : 3 } : { get: first ? 5 : 4, keep: first ? 3 : 2, tiles: first ? 5 : 2 }; }
export const DEFAULT_OPTS = { years: 6 };
export const CHOICES = { years: [6, 4] };
export const optOk = (k, v) => k in CHOICES && CHOICES[k].includes(v);
const shuffle = (a, rnd = Math.random) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const COLORS = ['#e0432f', '#2f7bff', '#12a66a', '#f59e0b', '#a259ff'];

export function createGame(players, opts = {}, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random;
  const o = { ...DEFAULT_OPTS, ...opts };
  const s = { gid: Math.random().toString(36).slice(2, 8), seq: 0, phase: 'play', stage: 'keep', year: 1, opts: o,
    players: players.map((p, i) => ({ id: p.id, name: p.name, isBot: !!p.isBot, color: COLORS[i % COLORS.length] })),
    cash: {}, tiles: {}, owner: {}, built: {}, dealt: {}, kept: {}, ready: {}, offers: [], offerN: 0, income: null, log: [],
    deck: shuffle(LOTS.map(l => l.id), rnd), bag: shuffle(SHOPS.flatMap(t => Array(t.need + 3).fill(t.k)), rnd), result: null };
  for (const p of s.players) { s.cash[p.id] = START_CASH; s.tiles[p.id] = []; }
  deal(s, rnd); return s;
}
function deal(s, rnd = Math.random) {
  const d = dealOf(s.players.length, s.year); s.stage = 'keep'; s.kept = {}; s.ready = {}; s.offers = []; s.need = d.keep;
  for (const p of s.players) s.dealt[p.id] = s.deck.splice(0, Math.min(d.get, Math.floor(s.deck.length / Math.max(1, s.players.length - s.players.indexOf(p)))));
}
function toTrade(s, rnd = Math.random) {
  const back = []; for (const p of s.players) { for (const id of s.dealt[p.id]) { if (s.kept[p.id].includes(id)) s.owner[id] = p.id; else back.push(id); } s.dealt[p.id] = []; }
  s.deck.push(...back); shuffle(s.deck, rnd);
  const d = dealOf(s.players.length, s.year); for (const p of s.players) s.tiles[p.id].push(...s.bag.splice(0, d.tiles));
  s.stage = 'trade'; s.ready = {}; s.log.push(`📜 Năm ${s.year}: phát đất và biển hiệu xong – mặc cả đi nào!`);
}
/* các chuỗi tiệm của một người: [{ k, lots: [...] }] */
export function chains(s, pid) {
  const seen = new Set(), out = [];
  for (const l of LOTS) { const id = l.id; if (seen.has(id) || s.owner[id] !== pid || !s.built[id]) continue; const k = s.built[id], grp = [], st = [id]; seen.add(id);
    while (st.length) { const x = st.pop(); grp.push(x); for (const y of NB[x]) if (!seen.has(y) && s.owner[y] === pid && s.built[y] === k) { seen.add(y); st.push(y); } }
    out.push({ k, lots: grp }); }
  return out;
}
export const incomeOf = (s, pid) => chains(s, pid).reduce((n, c) => n + payOf(c.lots.length, shop(c.k).need), 0);
function payDay(s, rnd = Math.random) {
  s.income = { year: s.year, by: {} }; for (const p of s.players) { const inc = incomeOf(s, p.id); s.cash[p.id] += inc; s.income.by[p.id] = inc; }
  s.log.push(`💰 Hết năm ${s.year}: ${s.players.map(p => `${p.name} +${s.income.by[p.id]}`).join(' · ')}`);
  if (s.year >= s.opts.years) { s.phase = 'ended'; s.stage = 'over'; s.offers = []; const order = s.players.map(p => p.id).sort((a, b) => s.cash[b] - s.cash[a]); s.result = { order, cash: { ...s.cash } }; s.winner = order[0]; return; }
  s.year++; deal(s, rnd);
}
const clean = x => ({ lots: [...new Set((x && Array.isArray(x.lots) ? x.lots : []).map(Number))].filter(i => lot(i)).slice(0, 12), tiles: (x && Array.isArray(x.tiles) ? x.tiles : []).filter(k => shop(k)).slice(0, 12), cash: Math.max(0, Math.min(999, Math.floor(+(x && x.cash) || 0))) });
const has = (s, pid, side) => side.lots.every(i => s.owner[i] === pid) && side.cash <= s.cash[pid] && (() => { const t = s.tiles[pid].slice(); return side.tiles.every(k => { const i = t.indexOf(k); if (i < 0) return false; t.splice(i, 1); return true; }); })();
function move(s, from, to, side) { for (const i of side.lots) s.owner[i] = to; for (const k of side.tiles) { s.tiles[from].splice(s.tiles[from].indexOf(k), 1); s.tiles[to].push(k); } s.cash[from] -= side.cash; s.cash[to] += side.cash; }
export function applyAction(s, pid, a, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random; /* simplenet có thể truyền thêm tham số khác vào đây */
  if (!s || s.phase !== 'play') return { ok: false, reason: 'Ván đã xong.' };
  const me = s.players.find(p => p.id === pid); if (!me) return { ok: false, reason: 'Bạn đang xem ván này.' };
  if (a.type === 'keep') {
    if (s.stage !== 'keep' || s.kept[pid]) return { ok: false, reason: 'Không phải lúc chọn đất.' };
    const pick = [...new Set((a.lots || []).map(Number))], need = Math.min(s.need, s.dealt[pid].length);
    if (pick.length !== need || pick.some(i => !s.dealt[pid].includes(i))) return { ok: false, reason: `Chọn đúng ${need} lô để giữ.` };
    s.kept[pid] = pick; if (s.players.every(p => s.kept[p.id])) toTrade(s, rnd);
  } else if (s.stage !== 'trade') return { ok: false, reason: 'Chờ mọi người chọn đất xong đã.' };
  else if (a.type === 'place') {
    const i = a.lot | 0, k = String(a.tile || ''); if (s.owner[i] !== pid) return { ok: false, reason: 'Đây không phải đất của bạn.' };
    if (s.built[i]) return { ok: false, reason: 'Lô này đã có tiệm rồi.' }; const t = s.tiles[pid].indexOf(k); if (t < 0) return { ok: false, reason: 'Bạn không có biển hiệu đó.' };
    s.tiles[pid].splice(t, 1); s.built[i] = k; s.offers = s.offers.filter(o => has(s, o.from, o.give) && has(s, o.to, o.get)); /* lời mời nào không còn đủ đồ thì tự huỷ */
  } else if (a.type === 'offer') {
    const to = s.players.find(p => p.id === a.to && p.id !== pid); if (!to) return { ok: false, reason: 'Chọn người để mặc cả.' };
    const give = clean(a.give), get = clean(a.get); if (!give.lots.length && !give.tiles.length && !give.cash && !get.lots.length && !get.tiles.length && !get.cash) return { ok: false, reason: 'Lời mời đang trống.' };
    if (!has(s, pid, give)) return { ok: false, reason: 'Bạn không có đủ những thứ định đưa.' }; if (!has(s, to.id, get)) return { ok: false, reason: `${to.name} không có đủ những thứ bạn muốn lấy.` };
    if (s.offers.filter(o => o.from === pid).length >= 4) return { ok: false, reason: 'Bạn đang có 4 lời mời chờ trả lời – huỷ bớt rồi gửi tiếp.' };
    s.offers.push({ id: ++s.offerN, from: pid, to: to.id, give, get }); s.ready[to.id] = false;
  } else if (a.type === 'cancel' || a.type === 'decline') {
    const o = s.offers.find(o => o.id === a.id && (a.type === 'cancel' ? o.from : o.to) === pid); if (!o) return { ok: false, reason: 'Lời mời không còn nữa.' };
    s.offers = s.offers.filter(x => x !== o); if (a.type === 'decline') s.log.push(`🙅 ${me.name} từ chối lời mời của ${s.players.find(p => p.id === o.from).name}.`);
  } else if (a.type === 'accept') {
    const o = s.offers.find(o => o.id === a.id && o.to === pid); if (!o) return { ok: false, reason: 'Lời mời không còn nữa.' };
    if (!has(s, o.from, o.give) || !has(s, o.to, o.get)) { s.offers = s.offers.filter(x => x !== o); return { ok: false, reason: 'Lời mời không còn hợp lệ.' }; }
    move(s, o.from, o.to, o.give); move(s, o.to, o.from, o.get); s.ready[o.from] = s.ready[o.to] = false;
    s.offers = s.offers.filter(x => x !== o && has(s, x.from, x.give) && has(s, x.to, x.get));
    s.log.push(`🤝 ${s.players.find(p => p.id === o.from).name} và ${me.name} vừa chốt một vụ đổi chác.`);
  } else if (a.type === 'ready') {
    s.ready[pid] = a.on !== false; if (s.players.every(p => s.ready[p.id])) payDay(s, rnd);
  } else if (a.type === 'force') { /* chủ phòng chốt sổ khi có người treo máy */
    if (pid !== 'host') return { ok: false, reason: 'Chỉ chủ phòng được chốt sổ.' }; payDay(s, rnd);
  } else return { ok: false, reason: 'Không hiểu.' };
  if (s.log.length > 40) s.log.splice(0, s.log.length - 40);
  s.seq++; return { ok: true };
}
export const actors = s => (s.phase !== 'play' ? [] : s.stage === 'keep' ? s.players.filter(p => !s.kept[p.id]).map(p => p.id) : s.players.filter(p => !s.ready[p.id]).map(p => p.id));
export function viewFor(s, pid) {
  const { deck, bag, dealt, kept, ...v } = s, ended = s.phase === 'ended';
  return { ...v, deckN: deck.length, bagN: bag.length, dealt: dealt[pid] || [], iKept: !!kept[pid], keptN: Object.keys(kept).length,
    cash: ended ? s.cash : Object.fromEntries(s.players.map(p => [p.id, p.id === pid ? s.cash[p.id] : null])), /* tiền của người khác là bí mật tới hết ván */
    incomeNow: Object.fromEntries(s.players.map(p => [p.id, incomeOf(s, p.id)])), me: pid };
}
