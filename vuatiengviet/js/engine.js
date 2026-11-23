// 👑 Vua Tiếng Việt – luật chơi, thuần logic (chạy ở máy chủ phòng).
// Mỗi trận 7 vòng: đề chọn ngẫu nhiên 1 từ/câu, xáo hết vị trí các chữ cái
// (cụm từ: xáo trong từng từ, giữ khoảng trắng), ai đoán đúng TRƯỚC thì
// thắng vòng và được cộng điểm phòng (Dễ 10 / TB 20 / Khó 30). Đoán sai
// được đoán lại ngay. Hết 30s không ai đúng thì mở 1 ô chữ, sau đó cứ +10s
// mở thêm 1 ô; mở hết các ô thì vòng kết thúc không ai được điểm.
// ĐIỂM PHÒNG CHỈ TÍNH TRONG PHÒNG — engine không hề đụng tới XP/xu hay
// BXH: final.summary chỉ có score/right/wins/best/timeMs (điểm phòng).
// Gõ có dấu hay không dấu đều được (chuẩn hoá bỏ dấu khi so sánh).
// opt ẩn `fast` (chỉ test dùng qua ?fast=1): vòng 3s, mở ô mỗi 2s.
import { WORDS } from './words.js?v=1';
import { PROVERBS } from './proverbs.js?v=1';

export const ROUNDS = 7, ROUND_TIME = 30, REVEAL_STEP = 10, INTRO_T = 4, REV_T = 8;
export const PTS = { de: 10, tb: 20, kho: 30 };
export const DEFAULT_OPTS = { bot: 2, fast: false };
export const CHOICES = { bot: [1, 2, 3] };
export function optOk(k, v) {
  if (k === 'fast') return typeof v === 'boolean';
  return k in CHOICES && CHOICES[k].includes(v);
}

/* chuẩn hoá tiếng Việt: bỏ dấu + thường hoá + gọn khoảng trắng (như Lặn Sâu) */
export function norm(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().trim().replace(/\s+/g, ' ');
}
export const lettersOf = text => norm(text).replace(/ /g, '').length;
export function tierOf(text, kind) {
  if (kind === 'proverb') return 'kho';
  const n = lettersOf(text);
  return n <= 5 ? 'de' : n <= 8 ? 'tb' : 'kho';
}
export const pointsOf = (text, kind) => PTS[tierOf(text, kind)];

/* tách 1 từ thành các cụm chữ cái (chữ gốc + dấu đi kèm, vd "ờ" là 1 cụm) */
export function graphemes(word) {
  const out = [];
  for (const ch of String(word).normalize('NFD')) {
    if (/[̀-ͯ]/.test(ch) && out.length) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out.map(g => g.normalize('NFC'));
}
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/* xáo 1 từ: trả về mảng cụm đã xáo; cố xáo khác thứ tự gốc (thử tối đa 10 lần) */
export function scrambleWord(word) {
  const g = graphemes(word);
  if (g.length <= 1 || new Set(g).size === 1) return g;
  let out = g;
  for (let t = 0; t < 10; t++) { out = shuffle([...g]); if (out.join('') !== g.join('')) break; }
  return out;
}
/* xáo cả đáp án: xáo trong từng từ, giữ khoảng trắng giữa các từ */
export function scramble(text) { return String(text).split(' ').map(w => scrambleWord(w)); }

function pickQuestions() {
  const byTier = { de: [], tb: [], kho: [] };
  for (const w of WORDS) byTier[tierOf(w, 'word')].push(w);
  const take = (arr, n, used) => {
    const pool = shuffle(arr.filter(x => !used.has(x)));
    const got = pool.slice(0, n); got.forEach(x => used.add(x)); return got;
  };
  const used = new Set(), qs = [];
  for (const w of take(byTier.de, 2, used)) qs.push({ text: w, kind: 'word' });
  for (const w of take(byTier.tb, 2, used)) qs.push({ text: w, kind: 'word' });
  for (const w of take(byTier.kho, 1, used)) qs.push({ text: w, kind: 'word' });
  for (const p of take(PROVERBS, 2, used)) qs.push({ text: p, kind: 'proverb' });
  // kho thiếu thì bù bằng từ bất kỳ (không trùng) rồi xáo thứ tự
  let guard = 0;
  while (qs.length < ROUNDS && guard++ < 50) {
    const rest = shuffle(WORDS.filter(w => !used.has(w)));
    if (!rest.length) break;
    used.add(rest[0]); qs.push({ text: rest[0], kind: 'word' });
  }
  shuffle(qs);
  return qs.map((q, i) => ({
    id: (q.kind === 'proverb' ? 'p' : 'w') + (i + 1) + '-' + Math.random().toString(36).slice(2, 6),
    text: q.text, kind: q.kind, tier: tierOf(q.text, q.kind), pts: pointsOf(q.text, q.kind),
    tiles: scramble(q.text), total: lettersOf(q.text),
  }));
}

let gidSeq = 0;
export function createGame(players, opts) {
  const o = { ...DEFAULT_OPTS, ...opts };
  if (!players.length) throw new Error('Cần ít nhất 1 người.');
  const qs = pickQuestions();
  if (qs.length < ROUNDS) throw new Error('Không đủ đề.');
  return {
    gid: 'g' + (++gidSeq) + '-' + Math.random().toString(36).slice(2, 7), seq: 0, phase: 'intro', opts: o, qs, i: -1, createdAt: Date.now(),
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, level: p.level, score: 0, right: 0, wins: 0, streak: 0, best: 0 })),
    ans: {}, tries: {}, rev: [], win: null, start: 0,
    roundT: o.fast ? 3 : ROUND_TIME, revStep: o.fast ? 2 : REVEAL_STEP,
    deadline: Date.now() + INTRO_T * 1000, log: [],
  };
}
export const P = (s, id) => s.players.find(p => p.id === id);
const dl = (s, sec) => { s.deadline = sec ? Date.now() + sec * 1000 : null; };
function ask(s) { s.i++; s.ans = {}; s.tries = {}; s.rev = []; s.win = null; s.phase = 'q'; s.start = Date.now(); dl(s, s.roundT); }
function revealRound(s, winnerId) {
  const q = s.qs[s.i];
  s.win = winnerId ? { pid: winnerId, pts: q.pts } : null;
  for (const p of s.players) {
    if (p.id === winnerId) { p.score += q.pts; p.right++; p.wins++; p.streak++; p.best = Math.max(p.best, p.streak); }
    else p.streak = 0;
  }
  s.phase = 'rev'; dl(s, REV_T);
}
function finish(s) {
  s.phase = 'ended'; s.deadline = null;
  const top = Math.max(...s.players.map(p => p.score));
  s.winners = top > 0 ? s.players.filter(p => p.score === top).map(p => p.id) : [];
  s.draw = s.players.length > 1 && top > 0 && s.players.every(p => p.score === top);
  s.final = { summary: {} };
  for (const p of s.players) s.final.summary[p.id] = { score: p.score, right: p.right, wins: p.wins, best: p.best, timeMs: Date.now() - (s.createdAt || Date.now()) };
}
export function applyAction(s, pid, a) {
  if (!a || s.phase === 'ended') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = P(s, pid), late = s.deadline && Date.now() >= s.deadline - 400;
  if (a.type === 'timeout' || (a.type === 'next' && pid === 'host' && s.phase !== 'q')) {
    if (a.type === 'timeout' && !late) return { ok: false, reason: 'Chưa hết giờ.' };
    if (s.phase === 'intro') ask(s);
    else if (s.phase === 'q') {
      const q = s.qs[s.i];
      if (s.rev.length < q.total) {
        // mở 1 ô chưa mở (ngẫu nhiên), +10s (fast: +2s) rồi chờ tiếp
        const left = [];
        for (let k = 0; k < q.total; k++) if (!s.rev.includes(k)) left.push(k);
        s.rev.push(left[Math.floor(Math.random() * left.length)]);
        dl(s, s.revStep); s.seq++; return { ok: true, revealed: s.rev.length };
      }
      revealRound(s, null);
    } else if (s.phase === 'rev') { if (s.i + 1 >= s.qs.length) finish(s); else ask(s); }
    s.seq++; return { ok: true };
  }
  if (a.type === 'end') { if (pid !== 'host') return { ok: false, reason: 'Chỉ chủ phòng kết thúc được.' }; finish(s); s.seq++; return { ok: true }; }
  if (!me) return { ok: false, reason: 'Bạn đang xem thôi.' };
  if (s.phase !== 'q') return { ok: false, reason: 'Chưa tới vòng chơi.' };
  if (a.type === 'ans') {
    const q = s.qs[s.i], text = String(a.text || '').trim();
    if (!text) return { ok: false, reason: 'Hãy gõ đáp án đã nha.' };
    if (text.length > 60) return { ok: false, reason: 'Đáp án quá dài.' };
    if (norm(text) === norm(q.text)) { revealRound(s, pid); s.seq++; return { ok: true, correct: true, pts: q.pts }; }
    s.tries[pid] = (s.tries[pid] || 0) + 1; s.ans[pid] = { text };
    s.seq++; return { ok: true, correct: false, tries: s.tries[pid] };
  }
  return { ok: false };
}
/* gợi ý: mỗi từ là mảng [chữ đã mở | null] theo vị trí gốc */
export function hintFor(q, rev) {
  const set = new Set(rev); let k = 0;
  return String(q.text).split(' ').map(w => graphemes(w).map(g => (set.has(k++) ? g : null)));
}
export function actors(s) { return s.phase === 'q' ? s.players.map(p => p.id) : []; }
export function viewFor(s, pid) {
  const me = P(s, pid), q = s.qs[s.i], inQ = s.phase === 'q';
  const showAns = s.phase === 'rev' || s.phase === 'ended';
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, i: s.i, total: s.qs.length, deadline: s.deadline, now: Date.now(), roundT: s.roundT, revStep: s.revStep,
    t: inQ ? (s.rev.length === 0 ? s.roundT : s.revStep) : (s.phase === 'rev' ? REV_T : INTRO_T), opts: s.opts,
    q: q && s.phase !== 'intro' ? {
      id: q.id, kind: q.kind, tier: q.tier, pts: q.pts, total: q.total,
      tiles: q.tiles, hint: hintFor(q, s.rev), opened: s.rev.length,
      text: showAns ? q.text : null,
    } : null,
    win: s.phase === 'rev' ? s.win : null,
    tried: Object.keys(s.tries),
    players: s.players.map(p => ({ id: p.id, name: p.name, score: p.score, right: p.right, wins: p.wins, best: p.best, streak: p.streak })),
    me: me ? { tries: s.tries[pid] || 0, lastWrong: s.ans[pid] ? s.ans[pid].text : null } : null,
    winners: s.winners || [], draw: !!s.draw, solo: s.players.filter(p => !p.isBot).length <= 1, spec: !me,
    ids: s.phase === 'ended' ? s.qs.map(x => x.id) : null, final: s.final || null,
  };
}
