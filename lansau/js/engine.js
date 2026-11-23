// 🤿 Lặn Sâu – luật chơi, thuần logic (chạy ở máy chủ phòng).
// Mỗi ván 7 câu, mỗi câu 25 giây: kể tên một thứ – đáp án càng ít người nghĩ tới càng nhiều điểm.
// 1 điểm = lặn sâu thêm 10m; tối đa 700đ/ván = chạm đáy rãnh (7.000m). Đáp án không có trong kho = 0đ.
// Chế độ: 'free' (câu ngẫu nhiên) và 'daily' (7 câu theo ngày VN, seed theo ngày – cả server cùng 1 bộ câu).
import { QS } from './questions.js?v=1';
export const Q_PER_GAME = 7, Q_TIME = 25, INTRO_T = 4, REV_T = 8, MAX_TOTAL = 700, MAX_DEPTH_M = 7000;
export const DEFAULT_OPTS = { mode: 'free', bot: 2, seen: [] };
export const CHOICES = { mode: ['free', 'daily'], bot: [1, 2, 3] };
export function optOk(k, v) {
  if (k === 'seen') return Array.isArray(v) && v.length <= 400 && v.every(x => typeof x === 'string' && x.length <= 8);
  return k in CHOICES && CHOICES[k].includes(v);
}
/* chuẩn hoá đáp án tiếng Việt: bỏ dấu + thường hoá + gọn khoảng trắng, rồi so khớp chính xác */
export function norm(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().trim().replace(/\s+/g, ' ');
}
export function scoreOf(q, text) {
  const n = norm(text), hit = (q.a || []).find(([t]) => norm(t) === n);
  return hit ? hit[1] : 0;
}
export const depthOf = score => Math.max(0, score) * 10;
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/* ngày VN (UTC+7) dạng YYYY-MM-DD – dùng làm seed cho chế độ 7 câu mỗi ngày */
export function vnDateStr(d = new Date()) { const vn = new Date(d.getTime() + (7 * 60 + d.getTimezoneOffset()) * 60000); return vn.toISOString().slice(0, 10); }
export function dailyQs(dateStr) {
  const rnd = mulberry32(hashStr('lansau-daily-' + dateStr)), pool = [...QS];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, Q_PER_GAME);
}
const rand = n => Math.floor(Math.random() * n);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export function pickQs(o) {
  const avoid = new Set(o.seen || []), fresh = QS.filter(q => !avoid.has(q.id));
  const pool = shuffle(fresh.length >= Q_PER_GAME ? [...fresh] : [...QS]);
  return pool.slice(0, Q_PER_GAME);
}
let gidSeq = 0;
export function createGame(players, opts) {
  const o = { ...DEFAULT_OPTS, ...opts };
  if (!players.length) throw new Error('Cần ít nhất 1 người.');
  const qs = o.mode === 'daily' ? dailyQs(vnDateStr()) : pickQs(o);
  if (qs.length < Q_PER_GAME) throw new Error('Không đủ câu hỏi.');
  return {
    gid: 'g' + (++gidSeq) + '-' + Math.random().toString(36).slice(2, 7), seq: 0, phase: 'intro', opts: o, qs, i: -1, createdAt: Date.now(),
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, level: p.level, score: 0, right: 0, streak: 0, best: 0, rare: 0 })),
    ans: {}, gain: null, start: 0, deadline: Date.now() + INTRO_T * 1000, log: [],
  };
}
export const P = (s, id) => s.players.find(p => p.id === id);
const dl = (s, sec) => { s.deadline = sec ? Date.now() + sec * 1000 : null; };
function ask(s) { s.i++; s.ans = {}; s.gain = null; s.phase = 'q'; s.start = Date.now(); dl(s, Q_TIME); }
function reveal(s) {
  const q = s.qs[s.i]; s.gain = {};
  for (const p of s.players) {
    const a = s.ans[p.id], text = a ? a.text : null, g = a ? scoreOf(q, text) : 0;
    if (g > 0) { p.right++; p.streak++; p.best = Math.max(p.best, p.streak); if (g >= 85) p.rare++; }
    else p.streak = 0;
    p.score += g; s.gain[p.id] = { g, ok: g > 0, text, rare: g >= 85 };
  }
  s.phase = 'rev'; dl(s, REV_T);
}
function finish(s) {
  s.phase = 'ended'; s.deadline = null;
  const top = Math.max(...s.players.map(p => p.score));
  s.winners = top > 0 ? s.players.filter(p => p.score === top).map(p => p.id) : [];
  s.draw = s.players.length > 1 && top > 0 && s.players.every(p => p.score === top);
  s.final = { summary: {} };
  for (const p of s.players) s.final.summary[p.id] = { score: p.score, right: p.right, best: p.best, rare: p.rare, depth: depthOf(p.score), timeMs: Date.now() - (s.createdAt || Date.now()) };
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
  if (a.type === 'ans') {
    if (pid in s.ans) return { ok: false, reason: 'Bạn đã chốt đáp án rồi.' };
    const text = String(a.text || '').trim();
    if (!text) return { ok: false, reason: 'Hãy gõ một đáp án.' };
    if (text.length > 40) return { ok: false, reason: 'Đáp án quá dài.' };
    s.ans[pid] = { text, ms: Math.max(0, Date.now() - s.start) };
    if (s.players.every(p => p.id in s.ans)) reveal(s);
  } else return { ok: false };
  s.seq++; return { ok: true };
}
export function actors(s) { return s.phase === 'q' ? s.players.filter(p => !(p.id in s.ans)).map(p => p.id) : []; }
export function viewFor(s, pid) {
  const me = P(s, pid), q = s.qs[s.i], showList = s.phase === 'rev' || s.phase === 'ended';
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, i: s.i, total: s.qs.length, deadline: s.deadline, now: Date.now(), t: Q_TIME, opts: s.opts,
    daily: s.opts.mode === 'daily' ? vnDateStr() : null,
    q: q && s.phase !== 'intro' ? { id: q.id, q: q.q, list: showList ? [...q.a].sort((x, y) => y[1] - x[1]) : null } : null,
    answered: s.phase === 'q' ? Object.keys(s.ans) : [], gain: s.phase === 'rev' ? s.gain : null,
    players: s.players.map(p => ({ id: p.id, name: p.name, score: p.score, right: p.right, best: p.best, streak: p.streak, rare: p.rare })),
    me: me ? { ans: s.ans[pid] ? s.ans[pid].text : null, depth: depthOf(me.score) } : null,
    winners: s.winners || [], draw: !!s.draw, solo: s.players.filter(p => !p.isBot).length <= 1, spec: !me,
    ids: s.phase === 'ended' ? s.qs.map(x => x.id) : null, final: s.final || null,
  };
}
