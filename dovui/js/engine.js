// 🧠 Đố Vui Siêu Tốc – luật chơi, thuần logic (chạy ở máy chủ phòng).
// Cả bàn cùng trả lời một câu (4 đáp án), trả lời đúng được điểm theo độ khó + thưởng nhanh tay. Câu dễ trước, khó dần.
// Quyền trợ giúp kiểu gameshow, mỗi người 1 lần mỗi ván: 50:50 (bỏ 2 đáp án sai), Hỏi ý kiến khán giả (biểu đồ %), Gọi điện cho người thân
// (đoán kèm độ chắc chắn, có thể sai), và Nhân đôi riêng của GumballZ (câu đó đúng được ×2, sai bị trừ nửa điểm gốc).
import { QS, CATS } from './questions.js?v=4';
export { CATS };
export const DEFAULT_OPTS = { n: 15, t: 20, cats: CATS.map(c => c.id), help: 1, bot: 2, seen: [], seed: null };
export const CHOICES = { n: [10, 15, 20], t: [12, 20, 30], help: [0, 1], bot: [1, 2, 3] };
const CAT_IDS = CATS.map(c => c.id);
export function optOk(k, v) {
  if (k === 'seen') return Array.isArray(v) && v.length <= 400 && v.every(x => typeof x === 'string' && x.length <= 8);
  if (k === 'seed') return v === null || v === undefined || (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.length <= 32);
  if (k === 'cats') return Array.isArray(v) && v.length >= 1 && v.every(x => CAT_IDS.includes(x)) && new Set(v).size === v.length;
  return k in CHOICES && CHOICES[k].includes(v);
}
/* seed → PRNG xác định (mulberry32, mẫu lansau): cùng seed cho cùng thứ tự câu hỏi + thứ tự đáp án;
   không truyền seed (null) thì lấy ngẫu nhiên mỗi ván. Chuỗi seed được băm FNV-1a thành số. */
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function rngFromSeed(seed) {
  const n = seed == null || seed === '' ? (Math.random() * 0xFFFFFFFF) >>> 0 : typeof seed === 'number' ? seed >>> 0 : hashStr(String(seed));
  return { rnd: mulberry32(n), seed: n };
}
export const BASE = { 1: 100, 2: 200, 3: 300, 4: 500, 5: 800 }, INTRO_T = 4, REV_T = 8; /* điểm gốc theo độ khó – càng về cuối càng giá trị */
let gidSeq = 0; /* mã ván duy nhất tăng dần (không dùng Math.random trần – tránh trùng khi test có seed) */
const rand = n => Math.floor(Math.random() * n);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/* xáo có seed (dùng cho thứ tự câu hỏi + thứ tự đáp án – phải đi theo rnd của ván) */
const shuffleWith = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/* thang câu hỏi kiểu gameshow: câu đầu dễ nhất, khó dần tới câu cuối (độ khó 1 → 5); không lặp câu đã hỏi gần đây trong phòng (opts.seen) */
export const ladder = n => Array.from({ length: n }, (_, i) => 1 + Math.min(4, Math.floor(i * 5 / n)));
export function pickQs(o, avoid = [], rnd = Math.random) {
  const pool = QS.filter(q => o.cats.includes(q.c)), av = new Set(avoid), used = new Set(), out = [];
  for (const d of ladder(o.n)) {
    let q = null;
    for (const dd of [d, d + 1, d - 1, d + 2, d - 2, d + 3, d - 3, d + 4, d - 4]) { /* thiếu câu đúng độ khó thì lấy câu gần nhất */
      const c = pool.filter(x => x.d === dd && !used.has(x.id)), fresh = c.filter(x => !av.has(x.id)), lastC = out.length ? out[out.length - 1].c : null;
      const pickFrom = (fresh.length ? fresh : c), notSame = pickFrom.filter(x => x.c !== lastC); /* tránh 2 câu liền cùng chủ đề */
      const src = notSame.length ? notSame : pickFrom; if (src.length) { q = src[Math.floor(rnd() * src.length)]; break; }
    }
    if (!q) break; used.add(q.id); out.push(q);
  }
  return out;
}
export function createGame(players, opts) {
  const o = { ...DEFAULT_OPTS, ...opts };
  if (!players.length) throw new Error('Cần ít nhất 1 người.');
  const { rnd, seed } = rngFromSeed(o.seed); /* cùng seed → cùng thứ tự câu hỏi + đáp án */
  const qs = pickQs(o, o.seen || [], rnd).map(q => { const ord = shuffleWith([0, 1, 2, 3], rnd); return { id: q.id, c: q.c, d: q.d, q: q.q, o: ord.map(i => q.o[i]), a: ord.indexOf(0), f: q.f }; });
  if (!qs.length) throw new Error('Không đủ câu hỏi cho chủ đề đã chọn.');
  return {
    gid: 'g' + (++gidSeq) + '-' + Math.random().toString(36).slice(2, 7), seq: 0, phase: 'intro', opts: o, seed, qs, i: -1, createdAt: Date.now(),
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, level: p.level, score: 0, right: 0, streak: 0, best: 0, fifty: o.help ? 1 : 0, dbl: o.help ? 1 : 0, aud: o.help ? 1 : 0, call: o.help ? 1 : 0 })),
    ans: {}, hid: {}, dbl: {}, aud: {}, call: {}, gain: null, start: 0, deadline: Date.now() + INTRO_T * 1000, log: [],
  };
}
export const P = (s, id) => s.players.find(p => p.id === id);
const dl = (s, sec) => { s.deadline = sec ? Date.now() + sec * 1000 : null; };
function ask(s) { s.i++; s.ans = {}; s.hid = {}; s.dbl = {}; s.aud = {}; s.call = {}; s.gain = null; s.phase = 'q'; s.start = Date.now(); dl(s, s.opts.t); }
function reveal(s) {
  const q = s.qs[s.i], T = s.opts.t * 1000; s.gain = {};
  for (const p of s.players) {
    const a = s.ans[p.id], ok = a && a.c === q.a, base = BASE[q.d];
    let g = 0;
    if (ok) { g = Math.round(base * (1 + 0.5 * Math.max(0, 1 - a.ms / T)) / 5) * 5; p.right++; p.streak++; p.best = Math.max(p.best, p.streak); if (p.streak >= 3) g += 50; }
    else { p.streak = 0; }
    if (s.dbl[p.id]) g = ok ? g * 2 : -Math.round(base / 2);
    p.score = Math.max(0, p.score + g); s.gain[p.id] = { g, ok: !!ok, c: a ? a.c : null, ms: a ? a.ms : null, streak: p.streak };
  }
  s.phase = 'rev'; dl(s, REV_T);
}
function finish(s) {
  s.phase = 'ended'; s.deadline = null;
  const top = Math.max(...s.players.map(p => p.score));
  s.winners = top > 0 ? s.players.filter(p => p.score === top).map(p => p.id) : [];
  s.final = { summary: {} };
  for (const p of s.players) s.final.summary[p.id] = { score: p.score, right: p.right, best: p.best, streak: p.streak, timeMs: Date.now() - (s.createdAt || Date.now()) };
}
export function applyAction(s, pid, a) {
  if (!a || s.phase === 'ended') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = P(s, pid), late = s.deadline && Date.now() >= s.deadline - 400;
  if (a.type === 'timeout' || (a.type === 'next' && pid === 'host' && s.phase !== 'q')) {
    if (a.type === 'timeout' && !late) return { ok: false, reason: 'Chưa hết giờ.' };
    if (s.phase === 'intro') ask(s);
    else if (s.phase === 'q') reveal(s);
    else if (s.phase === 'rev') { if (s.i + 1 >= s.qs.length) finish(s); else ask(s); }
    s.seq++; return { ok: true };
  }
  if (a.type === 'end') { if (pid !== 'host') return { ok: false, reason: 'Chỉ chủ phòng kết thúc được.' }; finish(s); s.seq++; return { ok: true }; }
  if (!me) return { ok: false, reason: 'Bạn đang xem thôi.' };
  if (s.phase !== 'q') return { ok: false, reason: 'Chưa tới câu hỏi.' };
  const q = s.qs[s.i];
  if (a.type === 'ans') {
    if (pid in s.ans) return { ok: false, reason: 'Bạn đã chốt đáp án rồi.' };
    const c = a.c | 0; if (c < 0 || c > 3 || (s.hid[pid] || []).includes(c)) return { ok: false, reason: 'Đáp án không hợp lệ.' };
    s.ans[pid] = { c, ms: Math.max(0, Date.now() - s.start) };
    if (s.players.every(p => p.id in s.ans)) reveal(s);
  } else if (a.type === 'fifty') {
    if (!me.fifty || pid in s.ans || s.hid[pid]) return { ok: false, reason: 'Hết lượt 50:50 rồi.' };
    me.fifty = 0; s.hid[pid] = shuffle([0, 1, 2, 3].filter(i => i !== q.a)).slice(0, 2);
  } else if (a.type === 'dbl') {
    if (!me.dbl || pid in s.ans || s.dbl[pid]) return { ok: false, reason: 'Hết lượt Nhân đôi rồi.' };
    me.dbl = 0; s.dbl[pid] = 1;
  } else if (a.type === 'aud') {
    if (!me.aud || pid in s.ans || s.aud[pid]) return { ok: false, reason: 'Hết lượt hỏi khán giả rồi.' };
    me.aud = 0; s.aud[pid] = audience(q, s.hid[pid] || []);
  } else if (a.type === 'call') {
    if (!me.call || pid in s.ans || s.call[pid]) return { ok: false, reason: 'Hết lượt gọi điện rồi.' };
    me.call = 0; s.call[pid] = phone(q, s.hid[pid] || []);
  } else return { ok: false };
  s.seq++; return { ok: true };
}
/* 👥 khán giả trong trường quay: đa số chọn đúng, câu càng khó càng phân vân */
function audience(q, hid) {
  const live = [0, 1, 2, 3].filter(i => !hid.includes(i)), base = { 1: [55, 80], 2: [42, 66], 3: [32, 56], 4: [26, 48], 5: [20, 42] }[q.d] || [26, 48];
  let right = base[0] + rand(base[1] - base[0] + 1); if (Math.random() < (q.d >= 4 ? .2 : q.d === 3 ? .15 : .06)) right = 12 + rand(14); /* đôi khi khán giả cũng "trật" */
  const pct = [0, 0, 0, 0]; pct[q.a] = right; const others = live.filter(i => i !== q.a), w = others.map(() => 1 + Math.random() * 3), sw = w.reduce((a, b) => a + b, 0) || 1;
  others.forEach((i, k) => { pct[i] = Math.round((100 - right) * w[k] / sw); });
  const diff = 100 - pct.reduce((a, b) => a + b, 0); pct[others.length ? others[0] : q.a] += diff;
  return pct;
}
/* 📞 gọi người thân: đoán một đáp án kèm độ chắc chắn – có lúc đoán sai */
const CALLERS = ['Bố', 'Mẹ', 'Cô giáo cũ', 'Bạn thân', 'Ông nội', 'Chị họ', 'Anh hàng xóm', 'Bà ngoại'];
function phone(q, hid) {
  const live = [0, 1, 2, 3].filter(i => !hid.includes(i)), ok = Math.random() < ({ 1: .9, 2: .78, 3: .65, 4: .52, 5: .42 }[q.d] || .5);
  const wrong = live.filter(i => i !== q.a), c = ok || !wrong.length ? q.a : wrong[rand(wrong.length)];
  const sure = ok ? 60 + rand(36) : 35 + rand(35);
  return { who: CALLERS[rand(CALLERS.length)], c, sure };
}
export function actors(s) { return s.phase === 'q' ? s.players.filter(p => !(p.id in s.ans)).map(p => p.id) : []; }
export function viewFor(s, pid) {
  const me = P(s, pid), q = s.qs[s.i], showA = s.phase === 'rev' || s.phase === 'ended';
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, i: s.i, total: s.qs.length, deadline: s.deadline, now: Date.now(), t: s.opts.t, opts: s.opts, seed: s.seed ?? null,
    q: q && s.phase !== 'intro' ? { id: q.id, d: q.d, q: q.q, o: q.o, a: showA ? q.a : null, f: showA ? q.f : null } : null,
    answered: s.phase === 'q' ? Object.keys(s.ans) : [], gain: s.phase === 'rev' ? s.gain : null,
    players: s.players.map(p => ({ id: p.id, name: p.name, score: p.score, right: p.right, best: p.best, streak: p.streak })),
    me: me ? { ans: s.ans[pid] ? s.ans[pid].c : null, hid: s.hid[pid] || [], dbl: !!s.dbl[pid], fifty: me.fifty, dblLeft: me.dbl, aud: s.aud[pid] || null, call: s.call[pid] || null, audLeft: me.aud, callLeft: me.call } : null,
    winners: s.winners || [], solo: s.players.filter(p => !p.isBot).length <= 1, spec: !me, ids: s.phase === 'ended' ? s.qs.map(x => x.id) : null,
    final: s.final || null,
  };
}
