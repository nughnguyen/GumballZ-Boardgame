// 🎧 Đoán Nhạc (Songless) – luật chơi, thuần logic (máy chủ phòng hoặc trên máy khi chơi một mình).
// Mỗi vòng một bài hát: nghe 1 giây đầu, đoán tên bài. Đoán sai hoặc bấm "Nghe thêm" thì được nghe dài hơn (1 → 2 → 4 → 7 → 11 → 16 giây)
// nhưng ít điểm hơn. Nhạc là bản nghe thử chính thức của Apple Music (mỗi máy tự tải theo mã bài) – web không lưu file nhạc nào.
import { SONGS, PACKS } from './songs.js?v=1';
import { GORDER, START } from './daily.js?v=1';
export { SONGS, PACKS };
export const STAGES = [1, 2, 4, 7, 11, 16], PTS = [100, 80, 60, 40, 25, 15];
export const DEFAULT_OPTS = { pack: 'mix', rounds: 8, t: 45 };
export const CHOICES = { pack: ['mix', ...Object.keys(PACKS)], rounds: [5, 8, 12], t: [30, 45, 60] };
export const optOk = (k, v) => k in CHOICES && CHOICES[k].includes(v);
export const INTRO_T = 3, REV_T = 14, MAXLEN = 80;
const rand = n => Math.floor(Math.random() * n);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\(.*?\)|\[.*?\]|feat\..*$|ft\..*$/g, '').replace(/[^\p{L}\p{N}]/gu, ''); /* giữ cả chữ Nhật / Hàn để đoán tên gốc */
function lev(a, b) { if (Math.abs(a.length - b.length) > 2) return 9; const d = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return d[b.length]; }
/* đúng khi gõ đúng tên bài (không dấu, không cần hoa/thường), sai một chữ cũng nhận nếu tên dài; gõ kèm "– ca sĩ" cũng được */
export function isRight(song, text) {
  const g0 = String(text || '').split(/\s[–-]\s/)[0], g = fold(g0); if (!g) return false;
  return [song.t, ...(song.alt || [])].some(n => { const f = fold(n); return f === g || (f.length >= 7 && lev(f, g) <= 1) || (f.length >= 14 && lev(f, g) <= 2); });
}
/* 🎧 bài anh xoá / đổi nguồn ở trang Quản trị (GET /doannhac/off) */
const OFF = new Set(), SC0 = new Map(SONGS.map(s => [String(s.id), s.sc]));
let SRC = null;
export const setOff = (ids, src) => {
  if (src === undefined) src = SRC; else SRC = src; /* chỉ gửi danh sách xoá thì giữ nguồn đã đổi */
  OFF.clear(); for (const x of ids || []) OFF.add(String(x));
  for (const s of SONGS) { const k = String(s.id), o = src && Object.prototype.hasOwnProperty.call(src, k) ? src[k] : undefined; const v = o === undefined ? SC0.get(k) : o || undefined; if (v) s.sc = v; else delete s.sc; }
};
export const live = s => !OFF.has(String(s.id)) && !!(s.sc || typeof s.id === 'number');
export const packOf = pk => SONGS.map((s, i) => [s, i]).filter(([s]) => live(s) && (pk === 'mix' || s.p === pk)).map(([, i]) => i);
export const DPACKS = Object.keys(GORDER); /* thể loại có Bài hôm nay: mix (tổng hợp) + từng gói */
export function songOfDay(day, pk = 'mix') {
  const O = GORDER[pk] || GORDER.mix, n = O.length, k0 = Math.round((Date.parse(day) - Date.parse(START)) / 864e5), at = k => SONGS.findIndex(x => x.id === O[((k % n) + n) % n]);
  let i = at(k0); if (i >= 0 && live(SONGS[i])) return i;
  const L = O.map(id => SONGS.findIndex(x => x.id === id)).filter(j => j >= 0 && live(SONGS[j])); if (!L.length) return -1;
  return L[(((k0 * 7919 + 104729) % L.length) + L.length) % L.length]; /* ngày rơi vào bài đã xoá: lấy bài khác theo số ngày */
}
export function createGame(players, opts) {
  const o = { ...DEFAULT_OPTS, ...opts };
  if (Array.isArray(o.off)) { if (o.off.length) setOff(o.off.map(String).slice(0, 2000)); delete o.off; } /* phòng online: chủ phòng gửi kèm danh sách bài anh đã xoá */
  if (!players.length) throw new Error('Cần ít nhất 1 người.');
  let pool;
  if (o.day) { const dpk = GORDER[o.dpk] ? o.dpk : 'mix', i = songOfDay(o.day, dpk); if (i < 0) throw new Error('Chưa có bài hôm nay.'); pool = [i]; o.rounds = 1; o.t = 900; o.pack = 'mix'; o.dpk = dpk; } /* 📅 Bài hôm nay: cả web chung một bài */
  else { pool = shuffle(packOf(o.pack)); if (pool.length < o.rounds) throw new Error('Gói nhạc này chưa đủ bài.'); }
  return { gid: Math.random().toString(36).slice(2, 9), seq: 0, phase: 'intro', opts: o, list: pool.slice(0, o.rounds), i: -1, st: {}, start: 0,
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, level: p.level, pts: 0, ok: 0, log: [] })), deadline: Date.now() + (o.day ? 0.6 : INTRO_T) * 1000 };
}
export const P = (s, id) => s.players.find(p => p.id === id);
function ask(s) { s.i++; s.st = {}; for (const p of s.players) s.st[p.id] = { k: 0, done: 0, ok: 0, tries: [] }; s.phase = 'q'; s.start = Date.now(); s.deadline = Date.now() + s.opts.t * 1000; }
function reveal(s) {
  for (const p of s.players) { const m = s.st[p.id]; const pts = m.ok ? PTS[m.k] : 0; p.pts += pts; if (m.ok) p.ok++; p.log[s.i] = { ok: m.ok, k: m.k, p: pts }; }
  s.phase = 'rev'; s.deadline = Date.now() + (s.players.filter(p => !p.isBot).length <= 1 ? 300 : REV_T) * 1000; /* chơi một mình: xem kết quả thong thả, bấm Tiếp mới qua bài */
}
function finish(s) { s.phase = 'ended'; s.deadline = null; const top = Math.max(...s.players.map(p => p.pts)); s.winners = top > 0 ? s.players.filter(p => p.pts === top).map(p => p.id) : []; }
export function applyAction(s, pid, a) {
  if (!a || s.phase === 'ended') return { ok: false, reason: 'Ván đã xong.' };
  const late = s.deadline && Date.now() >= s.deadline - 300;
  if (a.type === 'timeout' || (a.type === 'next' && pid === 'host' && s.phase === 'rev')) {
    if (a.type === 'timeout' && !late) return { ok: false, reason: 'Chưa hết giờ.' };
    if (s.phase === 'intro') ask(s); else if (s.phase === 'q') reveal(s); else if (s.phase === 'rev') { if (s.i + 1 >= s.list.length) finish(s); else ask(s); }
    s.seq++; return { ok: true };
  }
  if (a.type === 'end') { if (pid !== 'host') return { ok: false, reason: 'Chỉ chủ phòng kết thúc được.' }; finish(s); s.seq++; return { ok: true }; }
  const me = P(s, pid), m = s.st[pid]; if (!me || !m) return { ok: false, reason: 'Bạn đang xem thôi.' };
  if (s.phase !== 'q') return { ok: false, reason: 'Chưa tới bài.' };
  if (m.done) return { ok: false, reason: 'Bài này bạn xong rồi.' };
  const song = SONGS[s.list[s.i]];
  if (a.type === 'more') { if (m.k >= STAGES.length - 1) { m.done = 1; } else { m.k++; m.tries.push(''); } }
  else if (a.type === 'give') m.done = 1;
  else if (a.type === 'guess') {
    const w = String(a.text == null ? '' : a.text).replace(/\s+/g, ' ').trim().slice(0, MAXLEN); if (!w) return { ok: false };
    if (isRight(song, w)) { m.ok = 1; m.done = 1; }
    else { m.tries.push(w); if (m.k >= STAGES.length - 1) m.done = 1; else m.k++; }
  } else return { ok: false };
  if (s.players.every(p => s.st[p.id].done)) reveal(s);
  s.seq++; return { ok: true };
}
export function actors(s) { return s.phase === 'q' ? s.players.filter(p => !s.st[p.id].done).map(p => p.id) : []; }
export function viewFor(s, pid) {
  const me = P(s, pid), rev = s.phase === 'rev' || s.phase === 'ended', song = s.i >= 0 ? SONGS[s.list[s.i]] : null, m = s.st[pid];
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, i: s.i, total: s.list.length, deadline: s.deadline, now: Date.now(), t: s.opts.t, opts: s.opts,
    tr: song && s.phase !== 'intro' ? { id: song.id, cc: song.cc || 'VN', sc: song.sc || null } : null, /* mã bài để mỗi máy tự tải bản nghe thử */
    song: song && rev ? { t: song.t, a: song.a, y: song.y || '', id: song.id } : null,
    list: s.phase === 'ended' ? s.list.map(i => ({ t: SONGS[i].t, a: SONGS[i].a, id: SONGS[i].id })) : null,
    players: s.players.map(p => ({ id: p.id, name: p.name, pts: p.pts, ok: p.ok, k: s.st[p.id] ? s.st[p.id].k : 0, done: s.st[p.id] ? !!s.st[p.id].done : false, last: rev ? p.log[s.i] || null : null })),
    me: me && m ? { k: m.k, done: !!m.done, ok: !!m.ok, tries: m.tries } : null, spec: !me, winners: s.winners || [], solo: s.players.filter(p => !p.isBot).length <= 1,
  };
}
