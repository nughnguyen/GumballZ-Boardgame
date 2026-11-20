// 🟩 Wordle – luật chơi (thuần logic, không chạm DOM).
// Đoán từ 5 chữ cái trong 6 lượt. Sau mỗi lượt đoán: xanh lá = đúng chữ
// đúng chỗ, vàng = có chữ đó trong từ nhưng sai chỗ, xám = không có chữ
// đó trong từ (tính theo số lần xuất hiện: 1 chữ chỉ xanh/vàng tối đa
// bằng số lần nó xuất hiện trong đáp án). Chế độ: chơi đơn, đua với máy
// hoặc đua online 2–4 người cùng 1 từ — ít lượt đoán nhất thắng, hoà thì
// ai đoán xong trước thắng. Đoán sai 6 lần là thua.
import { WORDS, VALID } from './words.js?v=1';

export const WORD_LEN = 5;
export const MAX_GUESSES = 6;

/* bộ sinh số giả ngẫu nhiên có hạt giống (mulberry32) */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* LCG lưu trong state: chọn đáp án phải giống hệt nhau ở mọi máy cùng
   áp 1 hành động — dùng Math.random() thì 2 máy lệch nhau */
function nextRand(s) {
  s.seed = (s.seed * 1103515245 + 12345) % 2147483648;
  return s.seed / 2147483648;
}

/* tính màu cho 1 lượt đoán: xanh trước, vàng sau, theo số lần xuất hiện */
export function computeMarks(answer, guess) {
  const marks = new Array(WORD_LEN).fill('gray');
  const counts = {};
  for (const ch of answer) counts[ch] = (counts[ch] || 0) + 1;
  for (let i = 0; i < WORD_LEN; i++) {
    if (guess[i] === answer[i]) { marks[i] = 'green'; counts[guess[i]]--; }
  }
  for (let i = 0; i < WORD_LEN; i++) {
    if (marks[i] === 'green') continue;
    const ch = guess[i];
    if ((counts[ch] || 0) > 0) { marks[i] = 'yellow'; counts[ch]--; }
  }
  return marks;
}
/* 1 từ có khớp với tất cả (lượt đoán, màu) đã biết không — để bot Hard loại trừ */
export function consistent(word, guesses) {
  for (const g of guesses) {
    const m = computeMarks(word, g.word);
    for (let i = 0; i < WORD_LEN; i++) if (m[i] !== g.marks[i]) return false;
  }
  return true;
}

const pOf = (s, id) => s.players.find(p => p.id === id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

function finishWin(s, pid) {
  s.phase = 'ended'; s.winner = pid;
  s.losers = s.players.filter(p => p.id !== pid).map(p => p.id);
  s.endReason = 'win'; s.endedAt = Date.now();
  const pr = s.prog[pid];
  if (pr) pr.finishedAt = s.endedAt;
  s.seq++;
  const n = pr ? pr.guesses.length : 0;
  pushLog(s, `🎉 ${(pOf(s, pid) || {}).name || '?'} đoán đúng từ chỉ sau ${n} lượt — thắng cuộc đua!`, 'win');
}
function finishAllFail(s, reason) {
  s.phase = 'ended'; s.winner = null;
  s.losers = s.players.map(p => p.id);
  s.endReason = reason; s.endedAt = Date.now();
  s.seq++;
  pushLog(s, reason === 'resign' ? '🏳️ Mọi người đều đã xin thua — không ai thắng.' : '😢 Mọi người đều đoán sai 6 lần — không ai thắng.', 'win');
}
function checkAllFailed(s) {
  if (s.phase !== 'playing') return;
  if (s.players.every(p => s.prog[p.id].failed)) finishAllFail(s, 'allfail');
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 1 || players.length > 4) throw new Error('Wordle chơi 1–4 người.');
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  let answer = null;
  if (typeof opts.answer === 'string') {
    const a = opts.answer.toUpperCase();
    if (WORDS.includes(a)) answer = a;
  }
  if (!answer) {
    const rnd = mulberry32(seed);
    answer = WORDS[Math.floor(rnd() * WORDS.length)];
  }
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    seed, /* hạt giống LCG — chọn đáp án phải giống hệt ở mọi máy */
    phase: 'playing', /* 'playing' | 'ended' */
    answer,
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null })),
    prog: {},
    winner: null, losers: [], endReason: null,
    startedAt: Date.now(), endedAt: null,
    log: [],
  };
  for (const p of s.players) s.prog[p.id] = { guesses: [], finishedAt: null, failed: false, resigned: false };
  pushLog(s, `🟩 Ván Wordle mới — đoán từ 5 chữ cái trong ${MAX_GUESSES} lượt!`);
  return s;
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < 1 || s.players.length > 4
    || typeof s.answer !== 'string' || s.answer.length !== WORD_LEN || !WORDS.includes(s.answer)
    || typeof s.phase !== 'string' || !s.prog) {
    throw new Error('Trạng thái Wordle không hợp lệ.');
  }
  return s;
}

/* đoán 1 từ: sai luật thì không tính lượt; đúng hết 5 ô xanh là thắng */
export function applyGuess(s, pid, word) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.failed) return { ok: false, reason: 'Bạn đã hết lượt đoán.' };
  if (pr.finishedAt) return { ok: false, reason: 'Bạn đã đoán đúng rồi.' };
  if (typeof word !== 'string') return { ok: false, reason: 'Từ không hợp lệ.' };
  const w = word.toUpperCase();
  if (w.length !== WORD_LEN || /[^A-Z]/.test(w)) return { ok: false, reason: `Từ phải có đúng ${WORD_LEN} chữ cái A–Z.` };
  if (!VALID.has(w)) return { ok: false, reason: 'Từ này không có trong từ điển — thử từ khác.' };
  if (pr.guesses.some(g => g.word === w)) return { ok: false, reason: 'Bạn đã đoán từ này rồi.' };
  const marks = computeMarks(s.answer, w);
  pr.guesses.push({ word: w, marks });
  s.seq++;
  if (marks.every(m => m === 'green')) {
    pr.finishedAt = Date.now();
    finishWin(s, pid);
    return { ok: true, marks, solved: true, guesses: pr.guesses.length };
  }
  if (pr.guesses.length >= MAX_GUESSES) {
    pr.failed = true;
    pushLog(s, `❌ ${(pOf(s, pid) || {}).name || '?'} đoán sai ${MAX_GUESSES} lần — hết lượt!`);
    checkAllFailed(s);
    return { ok: true, marks, failed: true, guesses: pr.guesses.length };
  }
  return { ok: true, marks, guesses: pr.guesses.length };
}

/* xin thua: bị loại; chơi đơn thì ván kết thúc luôn */
export function applyResign(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.failed) return { ok: false, reason: 'Bạn đã bị loại rồi.' };
  pr.failed = true; pr.resigned = true;
  pushLog(s, `🏳️ ${(pOf(s, pid) || {}).name || '?'} xin thua.`);
  s.seq++;
  if (s.players.length === 1) { finishAllFail(s, 'resign'); return { ok: true, ended: true }; }
  checkAllFailed(s);
  return { ok: true };
}

/* ai đang phải hành động (cho bot): mọi người chưa xong và chưa hết lượt */
export const actors = s => {
  if (s.phase !== 'playing') return [];
  return s.players.filter(p => { const pr = s.prog[p.id]; return pr && !pr.failed && !pr.finishedAt; }).map(p => p.id);
};

/* góc nhìn riêng của 1 người chơi: lượt đoán CỦA MÌNH + tiến độ của mọi
   người (số lượt đã đoán, đã giải xong chưa — không lộ từ đã đoán hay đáp
   án của người khác); đáp án chỉ lộ khi ván đã kết thúc */
export function viewFor(s, pid) {
  const pr = s.prog[pid] || { guesses: [], finishedAt: null, failed: false };
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    answer: s.phase === 'ended' ? s.answer : null,
    startedAt: s.startedAt, endedAt: s.endedAt,
    winner: s.winner, losers: (s.losers || []).slice(), endReason: s.endReason,
    players: s.players.map(p => {
      const q = s.prog[p.id] || {};
      return { id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null, attempts: (q.guesses || []).length, solved: !!q.finishedAt, failed: !!q.failed };
    }),
    you: { guesses: pr.guesses.map(g => ({ word: g.word, marks: g.marks.slice() })), attempts: pr.guesses.length, solved: !!pr.finishedAt, failed: pr.failed },
    log: s.log.slice(-20),
    me: pid,
  };
}

/* Adapter cho phòng online (simplenet): action { type, word? } */
export function applyAction(s, pid, a, ctx) {
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'guess': return applyGuess(s, pid, a.word);
    case 'resign': return applyResign(s, pid);
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}
