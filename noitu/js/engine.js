// 🔗 Nối từ – luật, thuần logic. Từ 2 âm tiết: từ sau phải bắt đầu bằng âm tiết cuối của từ trước ("con gà" → "gà mái").
// Kho từ nạp qua setDict() (noitu/words.txt – danh sách của Hồ Ngọc Đức, GPL). Mỗi người có số mạng; sai / hết giờ / chịu thua lượt thì mất 1 mạng, hết mạng bị loại, còn 1 người là thắng.
export const DEFAULT_OPTS = { time: 20, lives: 3, level: 2, free: 0 };
export const CHOICES = { time: [15, 20, 30], lives: [2, 3, 5], level: [1, 2, 3], free: [0, 1] }; /* free = 1: chế độ Tự do (freestyle) – nối cả cụm từ hoặc câu (2–12 tiếng), không cần có trong từ điển – cả bàn bỏ phiếu nhận hay không; câu sau bắt đầu bằng tiếng cuối của câu trước (anh dặn 16/11/2026) */
export const FREE_MAX = 12;
export const optOk = (k, v) => !!CHOICES[k] && CHOICES[k].includes(v);
/* kho từ để ở một chỗ dùng chung (globalThis): file này có thể được nạp dưới hai địa chỉ khác nhau (có / không có ?v=…) mà vẫn chung một kho */
const D = globalThis.__noituDict || (globalThis.__noituDict = { W: new Set(), BY: new Map(), ST: [], SY: new Set() });
import { clean } from '../../server/src/filter.js';
/* bỏ dấu kiểu cũ / kiểu mới coi như một: "hòa" = "hoà", "thủy" = "thuỷ" (từ điển phần lớn ghi kiểu cũ nên quy hết về kiểu cũ) */
const canon = y => { if (!/[oòóỏõọuùúủũụ][aeyàáảãạèéẻẽẹỳýỷỹỵ]?$/.test(y)) return y; const d = y.normalize('NFD'), m = d.match(/^(.*?)([ou])([\u0300\u0301\u0309\u0303\u0323])([aey])$/);
  if (!m || (m[2] === 'o') === (m[4] === 'y') || /q$/.test(m[1])) return y; return (m[1] + m[2] + m[4] + m[3]).normalize('NFC'); };
export const norm = t => String(t == null ? '' : t).normalize('NFC').toLowerCase().replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim().split(' ').map(canon).join(' ');
export function setDict(list) {
  const WORDS = D.W = new Set(), BY = D.BY = new Map(), SY = D.SY = new Set();
  for (const raw of list) { const w = norm(raw), p = w.split(' '); if (p.length !== 2) continue; WORDS.add(w); SY.add(p[0]); SY.add(p[1]); if (!BY.has(p[0])) BY.set(p[0], []); BY.get(p[0]).push(w); }
  /* từ mở đầu: âm cuối phải có ít nhất 8 cách nối để ván khởi động dễ */
  D.ST = [...WORDS].filter(w => (BY.get(w.split(' ')[1]) || []).length >= 8);
}
export const dictSize = () => D.W.size;
/* thêm từ do người chơi bỏ phiếu nhận + máy kiểm tra trên mạng (kho từ cộng đồng, máy chủ giữ ở bảng nt của Lobby) */
export function addWords(list) { for (const raw of list || []) { const w = norm(raw), p = w.split(' '); if (p.length !== 2 || D.W.has(w)) continue; D.W.add(w); D.SY.add(p[0]); D.SY.add(p[1]); if (!D.BY.has(p[0])) D.BY.set(p[0], []); D.BY.get(p[0]).push(w); } }
export const hasWord = w => D.W.has(norm(w));
export const VOTE_MS = 12000;
/* từ từ điển chưa có: cả bàn bỏ phiếu (người thật, trừ người đưa từ). Không còn ai bỏ phiếu được (chơi với máy) thì nhận luôn nếu cả hai tiếng là tiếng có thật */
const voters = (s, by) => s.players.filter(q => !q.out && !q.isBot && q.id !== by).map(q => q.id);
export const tailOf = w => { const p = String(w).split(' '); return canon(p[p.length - 1]); }, headOf = w => w.split(' ')[0]; /* tiếng cuối – chế độ Tự do nối cả cụm / câu */
/* các từ nối được sau âm tiết `syl` mà chưa dùng trong ván */
export const nexts = (syl, used) => (D.BY.get(syl) || []).filter(w => !used.includes(w));
const pick = (a, rnd) => a[Math.floor(rnd() * a.length)];
export function createGame(players, opts = {}, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random;
  const o = { ...DEFAULT_OPTS }; for (const k of Object.keys(CHOICES)) if (optOk(k, opts[k])) o[k] = opts[k];
  const ps = players.slice(0, 8).map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, lives: o.lives, out: false, n: 0 }));
  const s = { gid: Math.floor(rnd() * 1e9), seq: 0, phase: 'play', opts: o, players: ps, turn: Math.floor(rnd() * ps.length), word: '', used: [], chain: [], last: null, round: 0, winner: null, deadline: 0, rndSeed: 0 };
  newChain(s, rnd); return s;
}
function clock(s) { s.deadline = s.phase === 'play' ? Date.now() + s.opts.time * 1000 : 0; }
function newChain(s, rnd = Math.random) { const pool = D.ST.filter(w => !s.used.includes(w)); s.word = pool.length ? pick(pool, rnd) : pick(D.ST.length ? D.ST : [...D.W], rnd) || 'bạn bè'; s.used.push(s.word); s.chain = [{ w: s.word, by: null }]; s.round++; clock(s); }
export const curId = s => (s.players[s.turn] || {}).id;
function advance(s) { for (let k = 0; k < s.players.length; k++) { s.turn = (s.turn + 1) % s.players.length; if (!s.players[s.turn].out) return; } }
function lose(s, p, why, word, rnd) {
  p.lives--; if (p.lives <= 0) { p.lives = 0; p.out = true; }
  s.last = { t: 'miss', by: p.id, why, word: word || '', out: p.out, hint: (nexts(tailOf(s.word), s.used)[0]) || '' }; /* gợi ý một từ lẽ ra nối được, cho mọi người cùng học */
  const alive = s.players.filter(q => !q.out);
  if (alive.length <= 1) { s.phase = 'ended'; s.winner = alive[0] ? alive[0].id : null; s.deadline = 0; return; }
  advance(s); newChain(s, rnd);
}
export function applyAction(s, pid, a, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random; /* simplenet có thể truyền thứ khác vào tham số thứ tư */
  if (!a) return { ok: false, reason: 'Thao tác lạ.' };
  const p = s.players.find(x => x.id === pid); if (!p) return { ok: false, reason: 'Bạn đang xem.' };
  if (s.phase === 'vote') {
    const V = s.vote;
    if (a.type === 'vote' && V.vs.includes(pid) && !V.yes.includes(pid) && !V.no.includes(pid)) { (a.ok ? V.yes : V.no).push(pid); s.seq++; if (V.yes.length + V.no.length < V.vs.length) return { ok: true }; return closeVote(s, rnd); }
    if (a.type === 'timeout') { if (Date.now() < s.deadline - 250) return { ok: false, reason: 'Chưa hết giờ.' }; return closeVote(s, rnd); }
    return { ok: false, reason: 'Đang chờ cả bàn bỏ phiếu.' };
  }
  if (s.phase !== 'play') return { ok: false, reason: 'Ván đã xong.' };
  if (a.type === 'timeout') { /* ai trong bàn cũng báo được, engine tự kiểm giờ */
    if (!s.deadline || Date.now() < s.deadline - 250) return { ok: false, reason: 'Chưa hết giờ.' };
    s.seq++; lose(s, s.players[s.turn], 'time', '', rnd); return { ok: true };
  }
  if (curId(s) !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  if (a.type === 'pass') { s.seq++; lose(s, p, 'pass', '', rnd); return { ok: true }; }
  if (a.type !== 'word') return { ok: false, reason: 'Thao tác lạ.' };
  const w = norm(a.text), need = tailOf(s.word), parts = w.split(' ');
  if (s.opts.free) { /* Tự do: cụm từ / câu 2–12 tiếng; từ 2 tiếng có trong từ điển thì nhận luôn, còn lại cả bàn bỏ phiếu (anh dặn 16/11/2026) */
    if (parts.length < 2) return { ok: false, reason: 'Nối thêm ít nhất 1 tiếng nữa nha.' };
    if (parts.length > FREE_MAX || w.length > 80) return { ok: false, reason: `Dài quá – tối đa ${FREE_MAX} tiếng thôi nha.` };
    if (parts[0] !== need) return { ok: false, reason: `Phải bắt đầu bằng "${need}".` };
    if (s.used.includes(w)) return { ok: false, reason: 'Câu này dùng rồi, nghĩ câu khác đi!' };
    if (clean(w).hit) return { ok: false, reason: 'Câu này không hợp lệ – nhẹ nhàng thôi nha 😅' };
    if (!D.W.has(w)) { const vs = voters(s, pid); if (vs.length) { s.seq++; s.vote = { by: pid, w, vs, yes: [], no: [], left: Math.max(5000, s.deadline - Date.now()) }; s.phase = 'vote'; s.deadline = Date.now() + VOTE_MS; return { ok: true }; } }
    return accept(s, p, w, rnd);
  }
  if (parts.length !== 2) return { ok: false, reason: 'Phải là từ có đúng 2 tiếng nha.' };
  if (parts[0] !== need) return { ok: false, reason: `Từ phải bắt đầu bằng "${need}".` };
  if (s.used.includes(w)) return { ok: false, reason: 'Từ này dùng rồi, tìm từ khác đi!' };
  if (!D.W.has(w)) { /* kho từ không đủ hết mọi cách nói ("tỏi phi"…) → hỏi cả bàn */
    if (!D.SY.has(parts[1])) return { ok: false, reason: `"${parts[1]}" nghe lạ quá – thử từ khác nha.` };
    const vs = voters(s, pid);
    if (vs.length) { s.seq++; s.vote = { by: pid, w, vs, yes: [], no: [], left: Math.max(5000, s.deadline - Date.now()) }; s.phase = 'vote'; s.deadline = Date.now() + VOTE_MS; return { ok: true }; }
  }
  return accept(s, p, w, rnd);
}
function accept(s, p, w, rnd, voted) {
  const pid = p.id;
  s.seq++; p.n++; s.word = w; s.used.push(w); s.chain.push({ w, by: pid }); if (s.chain.length > 14) s.chain.shift();
  s.last = { t: 'ok', by: pid, word: w }; if (voted) s.last.voted = voted;
  advance(s);
  /* từ "bí" (từ điển không còn từ nào nối được): KHÔNG trừ mạng ngay – người kế vẫn được thử nối (có thể ra từ mới, cả bàn bỏ phiếu); hết giờ / chịu thua mới mất mạng (anh dặn 16/11/2026) */
  clock(s); return { ok: true };
}
/* chốt phiếu: đồng ý nhiều hơn hoặc bằng không đồng ý (ai chưa bấm thì không tính) → nhận từ */
function closeVote(s, rnd) {
  const V = s.vote; s.vote = null; s.phase = 'play'; const p = s.players.find(q => q.id === V.by);
  if (V.yes.length >= V.no.length) return accept(s, p, V.w, rnd, { yes: V.yes.length, no: V.no.length });
  s.seq++; s.last = { t: 'rej', by: V.by, word: V.w, yes: V.yes.length, no: V.no.length }; s.deadline = Date.now() + V.left; return { ok: true };
}
export const actors = s => (s.phase === 'play' ? [curId(s)] : s.phase === 'vote' ? s.vote.vs.filter(id => !s.vote.yes.includes(id) && !s.vote.no.includes(id)) : []);
export function viewFor(s, pid) {
  return { gid: s.gid, seq: s.seq, phase: s.phase, opts: s.opts, players: s.players, cur: s.phase !== 'ended' ? curId(s) : null, word: s.word, need: s.word ? tailOf(s.word) : '', chain: s.chain, last: s.last, round: s.round,
    left: s.deadline ? Math.max(0, s.deadline - Date.now()) : -1, winner: s.winner, vote: s.vote ? { by: s.vote.by, w: s.vote.w, vs: s.vote.vs, yes: s.vote.yes.length, no: s.vote.no.length, done: [...s.vote.yes, ...s.vote.no] } : null, spec: !s.players.some(p => p.id === pid) };
}
