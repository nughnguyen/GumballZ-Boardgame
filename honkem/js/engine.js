// 🔼🔽 Hơn Hay Kém (Higher or Lower) – luật chơi, thuần logic (chạy ở máy chủ phòng hoặc trên máy khi chơi một mình).
// Mỗi vòng có 2 thứ cùng loại: thứ bên trái đã lộ số, đoán thứ bên phải HƠN hay KÉM. Cả bàn đoán cùng lúc, hết giờ thì lật.
// Đúng +1 điểm (trả lời nhanh được thưởng thêm), sai mất 1 mạng. Thứ bên phải thành bên trái của vòng sau (như bản gốc), mỗi 5 vòng đổi loại.
import { CATS, ITEMS, GROUPS } from './data.js?v=1';
export { CATS, GROUPS };
export const DAYN = 10;
export const DEFAULT_OPTS = { rounds: 15, lives: 3, t: 12, grp: 'all' };
export const CHOICES = { rounds: [10, 15, 25], lives: [1, 3, 5], t: [8, 12, 20], grp: ['all', ...Object.keys(GROUPS)] };
export const optOk = (k, v) => k in CHOICES && CHOICES[k].includes(v);
export const INTRO_T = 3, REV_T = 4, CHAIN = 5;
const rand = (n, s) => Math.floor((s && s.rs != null ? rnd(s) : Math.random()) * n);
/* 📅 Thử thách hôm nay: số ngẫu nhiên theo ngày (mulberry32) – cả web gặp cùng một dãy cặp */
function rnd(s) { let t = (s.rs = (s.rs + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const seedOf = str => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
const catsOf = grp => Object.keys(CATS).filter(k => (grp === 'all' || CATS[k].g === grp) && (ITEMS[k] || []).length >= 12);
/* độ khó: vòng đầu chọn cặp chênh nhiều + nổi tiếng, càng về sau càng sát nhau */
function pickB(s, cat, a, k) {
  const L = ITEMS[cat], used = new Set(s.used), lvl = Math.min(1, k / Math.max(1, s.opts.rounds - 1));
  const top = Math.max(12, Math.round(L.length * (0.35 + 0.65 * lvl))), minR = 2.2 - 1.15 * lvl; /* tỉ số tối thiểu giữa hai số: 2,2 → 1,05 */
  for (let tries = 0; tries < 400; tries++) {
    const i = rand(Math.min(top, L.length), s), b = L[i]; if (used.has(cat + ':' + i) || b[0] === a[0]) continue;
    const r = CATS[cat].f === 'year' ? 1 + Math.abs(b[1] - a[1]) / (tries > 200 ? 3 : 8) : Math.max(b[1], a[1]) / Math.max(1e-9, Math.min(b[1], a[1]));
    if (b[1] === a[1] || r < (tries > 300 ? 1.02 : minR)) continue;
    return i;
  }
  for (let i = 0; i < L.length; i++) if (!used.has(cat + ':' + i) && L[i][1] !== a[1]) return i;
  return -1;
}
function newPair(s) {
  const cs = catsOf(s.opts.grp).filter(c => c !== s.cat); const cat = cs[rand(cs.length, s)] || catsOf(s.opts.grp)[0];
  const L = ITEMS[cat], ai = rand(Math.min(L.length, 20), s);
  s.cat = cat; s.a = ai; s.used.push(cat + ':' + ai); s.chain = 0;
}
function ask(s) {
  s.k++; if (s.k > 0 && (s.chain >= CHAIN || s.b < 0)) newPair(s); else if (s.k > 0) { s.a = s.b; }
  let bi = pickB(s, s.cat, ITEMS[s.cat][s.a], s.k); for (let t = 0; bi < 0 && t < 30; t++) { if (t === 3) s.used = []; /* chủ đề ít thứ (chơi một mình lâu) thì cho gặp lại */ newPair(s); bi = pickB(s, s.cat, ITEMS[s.cat][s.a], s.k); } s.b = bi; /* loại đã dùng hết thứ thì đổi loại khác */
  s.used.push(s.cat + ':' + s.b); s.chain++;
  s.ans = {}; s.phase = 'q'; s.start = Date.now(); s.deadline = Date.now() + s.opts.t * 1000;
}
export function createGame(players, opts) {
  const o = { ...DEFAULT_OPTS, ...opts };
  if (o.day) { o.lives = 99; if (!optOk('grp', o.grp)) o.grp = 'all'; o.rounds = DAYN; o.t = 12; } /* 📅 thử thách hôm nay kiểu lessgames (anh dặn 26/11/2026): cả web cùng 10 câu, sai vẫn đi tiếp, điểm = số câu đúng */
  if (!players.length) throw new Error('Cần ít nhất 1 người.');
  if (!catsOf(o.grp).length) throw new Error('Chưa có số liệu cho nhóm này.');
  const s = { gid: Math.random().toString(36).slice(2, 9), seq: 0, phase: 'intro', opts: o, rs: o.day ? seedOf('hk' + o.day + (o.grp === 'all' ? '' : o.grp)) : null, k: -1, cat: null, a: -1, b: -1, chain: 0, used: [], ans: {}, start: 0,
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, level: p.level, pts: 0, ok: 0, lives: o.lives, st: 0, best: 0, log: [] })),
    deadline: Date.now() + INTRO_T * 1000 };
  newPair(s); return s;
}
export const P = (s, id) => s.players.find(p => p.id === id);
const alive = s => s.players.filter(p => p.lives > 0);
function reveal(s) {
  const A = ITEMS[s.cat][s.a], B = ITEMS[s.cat][s.b], truth = B[1] > A[1] ? 'up' : 'dn';
  for (const p of alive(s)) {
    const a = s.ans[p.id], ok = !!a && a.c === truth;
    if (ok) { const fast = Math.max(0, 1 - a.ms / (s.opts.t * 1000)); const pts = 10 + Math.round(fast * 5); p.pts += pts; p.ok++; p.st++; p.best = Math.max(p.best, p.st); p.log.push({ ok: 1, p: pts }); }
    else { p.lives--; p.st = 0; p.log.push({ ok: 0, p: 0, none: !a }); }
  }
  s.truth = truth; s.phase = 'rev'; s.deadline = Date.now() + REV_T * 1000;
}
function finish(s) {
  s.phase = 'ended'; s.deadline = null;
  const top = Math.max(...s.players.map(p => p.pts)); s.winners = top > 0 ? s.players.filter(p => p.pts === top).map(p => p.id) : [];
}
export function applyAction(s, pid, a) {
  if (!a || s.phase === 'ended') return { ok: false, reason: 'Ván đã xong.' };
  const late = s.deadline && Date.now() >= s.deadline - 300;
  if (a.type === 'timeout' || (a.type === 'next' && pid === 'host' && s.phase === 'rev')) {
    if (a.type === 'timeout' && !late) return { ok: false, reason: 'Chưa hết giờ.' };
    if (s.phase === 'intro') ask(s);
    else if (s.phase === 'q') reveal(s);
    else if (s.phase === 'rev') {
      const solo = s.players.length === 1, left = alive(s).length;
      if (s.k + 1 >= s.opts.rounds && (!solo || s.opts.day)) finish(s); else if (!left || (!solo && left === 0)) finish(s); else ask(s);
    }
    s.seq++; return { ok: true };
  }
  if (a.type === 'end') { if (pid !== 'host') return { ok: false, reason: 'Chỉ chủ phòng kết thúc được.' }; finish(s); s.seq++; return { ok: true }; }
  const me = P(s, pid); if (!me) return { ok: false, reason: 'Bạn đang xem thôi.' };
  if (a.type !== 'pick') return { ok: false };
  if (s.phase !== 'q') return { ok: false, reason: 'Chưa tới lượt đoán.' };
  if (me.lives <= 0) return { ok: false, reason: 'Bạn hết mạng rồi – xem mọi người chơi tiếp nha.' };
  if (pid in s.ans) return { ok: false, reason: 'Đã chọn rồi.' };
  if (a.c !== 'up' && a.c !== 'dn') return { ok: false };
  s.ans[pid] = { c: a.c, ms: Date.now() - s.start };
  if (alive(s).every(p => p.id in s.ans)) reveal(s);
  s.seq++; return { ok: true };
}
export function actors(s) { return s.phase === 'q' ? alive(s).filter(p => !(p.id in s.ans)).map(p => p.id) : []; }
export function viewFor(s, pid) {
  const me = P(s, pid), rev = s.phase === 'rev' || s.phase === 'ended', A = ITEMS[s.cat][s.a], B = s.b >= 0 ? ITEMS[s.cat][s.b] : null, c = CATS[s.cat];
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, k: s.k, rounds: s.opts.rounds, solo: s.players.length === 1, deadline: s.deadline, now: Date.now(), t: s.opts.t, opts: s.opts,
    cat: s.cat, cn: c, a: A ? { n: A[0], v: rev || s.phase === 'intro' ? A[1] : null, im: A[2] || null } : null, /* kiểu More/less: hai bên đều giấu số tới lúc lật */ b: B && s.phase !== 'intro' ? { n: B[0], v: rev ? B[1] : null, im: B[2] || null } : null, truth: rev ? s.truth : null,
    answered: s.phase === 'q' ? Object.keys(s.ans) : [], picks: rev ? Object.fromEntries(Object.entries(s.ans).map(([k, x]) => [k, x.c])) : {},
    players: s.players.map(p => ({ id: p.id, name: p.name, pts: p.pts, ok: p.ok, lives: p.lives, st: p.st, best: p.best, last: rev ? p.log[p.log.length - 1] || null : null })),
    me: me ? { lives: me.lives, pick: s.ans[pid] ? s.ans[pid].c : null, log: me.log.map(x => x.ok) } : null, spec: !me, winners: s.winners || [],
  };
}
