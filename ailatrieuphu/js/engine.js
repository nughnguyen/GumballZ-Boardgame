// 🏆 Ai Là Triệu Phú – luật chơi (thuần logic, không chạm DOM).
// 15 câu hỏi, 3 bậc khó (câu 1–5 Dễ, 6–10 Vừa, 11–15 Khó), mỗi câu 30s.
// Thang tiền thưởng bản Việt cổ điển, mốc an toàn ở câu 5 (1.000.000)
// và câu 10 (14.000.000). Trả lời sai → giữ tiền mốc an toàn gần nhất.
// Chế độ: chơi đơn (1 người), đua với máy / đua online / chuyền tay
// 2 người cùng 15 câu — ai được nhiều tiền hơn thắng, hòa tiền thì ai
// trả lời nhanh hơn (tổng thời gian) thắng.
// Mốc thời gian: mỗi câu 30s — đồng hồ do client đếm, engine nhận `ms`
// (thời gian đã dùng cho câu đó) kèm hành động trả lời, và hành động
// 'timeout' khi hết giờ. LCG trong state giữ cho các kết quả ngẫu nhiên
// (50:50, gọi điện, khán giả) giống hệt nhau ở mọi máy cùng áp 1 hành
// động — dùng Math.random() thì 2 máy lệch nhau.
import { QUESTIONS } from './questions.js?v=1';

export const LADDER = [100000, 200000, 300000, 500000, 1000000, 2000000, 3000000, 6000000, 10000000, 14000000, 22000000, 30000000, 40000000, 60000000, 150000000];
export const SAFE_LEVELS = [5, 10];
export const TIME_PER_QUESTION = 30; /* giây */
export const QUESTION_COUNT = 15;
export const TIERS = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2]; /* bậc khó của câu 1..15 */

/* bộ sinh số giả ngẫu nhiên có hạt giống (mulberry32) */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* LCG lưu trong state — mọi lần rút số đều qua đây để 2 máy đồng bộ */
function nextRand(s) {
  s.seed = (s.seed * 1103515245 + 12345) % 2147483648;
  return s.seed / 2147483648;
}
function shuffle(arr, rnd) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* tiền giữ được khi trả lời sai ở `level` câu đúng */
export function milestonePrize(level) {
  if (level >= 10) return LADDER[9];
  if (level >= 5) return LADDER[4];
  return 0;
}

const pOf = (s, id) => s.players.find(p => p.id === id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

/* chọn 15 câu (5 Dễ + 5 Vừa + 5 Khó, không trùng) + 2 câu dự phòng mỗi
   bậc cho trợ giúp Đổi câu hỏi; xáo trộn thứ tự phương án từng câu để
   vị trí đáp án đúng thay đổi theo từng ván (đáp án được ánh xạ lại) */
function sampleQuestions(rnd) {
  const qs = [], pool = { 0: [], 1: [], 2: [] };
  for (let tier = 0; tier <= 2; tier++) {
    const idx = shuffle(QUESTIONS[tier].map((_, i) => i), rnd);
    for (let k = 0; k < 7; k++) {
      const src = QUESTIONS[tier][idx[k]];
      const order = shuffle([0, 1, 2, 3], rnd);
      const q = { q: src.q, options: order.map(i => src.options[i]), answer: order.indexOf(src.answer), tier };
      if (k < 5) qs.push(q); else pool[tier].push(q);
    }
  }
  /* qs đang theo thứ tự bậc: 5 Dễ, 5 Vừa, 5 Khó = câu 1..15 */
  return { qs, pool };
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 1 || players.length > 2) throw new Error('Ai Là Triệu Phú chơi 1–2 người.');
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  const rnd = mulberry32(seed);
  const { qs, pool } = sampleQuestions(rnd);
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    seed, /* hạt giống LCG — mọi lần rút số trong ván đều qua nextRand(s) */
    phase: 'playing', /* 'playing' | 'ended' */
    questions: qs,
    switchPool: pool,
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null })),
    prog: {},
    winner: null, losers: [], endReason: null,
    startedAt: Date.now(), endedAt: null,
    log: [],
  };
  for (const p of s.players) s.prog[p.id] = {
    level: 0, correct: 0, prize: 0, done: false, finished: false,
    resigned: false, stopped: false, timedOut: false,
    streak: 0, bestStreak: 0, timeMs: 0,
    lifelines: { fifty: false, phone: false, audience: false, switch: false },
    used50: null, phoneHint: null, audience: null,
    overrides: {}, /* Đổi câu hỏi: câu thay thế theo chỉ số câu (chỉ của riêng mình) */
    switchUsedAt: -1,
  };
  pushLog(s, `🏆 Ván Ai Là Triệu Phú mới — 15 câu hỏi, mốc an toàn câu 5 và câu 10!`);
  return s;
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < 1 || s.players.length > 2
    || !Array.isArray(s.questions) || s.questions.length !== QUESTION_COUNT
    || typeof s.phase !== 'string' || !s.prog || !s.switchPool) {
    throw new Error('Trạng thái Ai Là Triệu Phú không hợp lệ.');
  }
  return s;
}

/* câu hỏi hiệu lực của 1 người ở chỉ số `level` (0-based) — có thể đã
   bị Đổi câu hỏi thay thế riêng cho người đó */
export function effectiveQuestion(s, pid, levelIdx) {
  const pr = s.prog[pid];
  if (pr && pr.overrides && pr.overrides[levelIdx]) return pr.overrides[levelIdx];
  return s.questions[levelIdx];
}

function finishSummary(s) {
  const summary = {};
  for (const p of s.players) {
    const pr = s.prog[p.id];
    summary[p.id] = {
      level: pr.level, correct: pr.correct, prize: pr.prize,
      lifelinesUsed: Object.values(pr.lifelines).filter(Boolean).length,
      bestStreak: pr.bestStreak, timeMs: pr.timeMs, stopped: pr.stopped,
    };
  }
  return summary;
}

function checkEnd(s) {
  if (s.phase !== 'playing') return;
  if (!s.players.every(p => s.prog[p.id].done)) return;
  s.phase = 'ended'; s.endedAt = Date.now(); s.seq++;
  const ranked = [...s.players].sort((a, b) => {
    const pa = s.prog[a.id], pb = s.prog[b.id];
    if (pb.prize !== pa.prize) return pb.prize - pa.prize;
    return pa.timeMs - pb.timeMs;
  });
  const best = ranked[0], pr = s.prog[best.id];
  const tied = ranked.length > 1 && s.prog[ranked[1].id].prize === pr.prize && s.prog[ranked[1].id].timeMs === pr.timeMs;
  if (s.players.length === 1) {
    const me = s.prog[best.id];
    if (me.level >= QUESTION_COUNT) { s.winner = best.id; s.losers = []; s.endReason = 'win150'; }
    else {
      s.winner = null; s.losers = [best.id];
      s.endReason = me.stopped ? 'stop' : me.resigned ? 'resign' : me.timedOut ? 'timeout' : 'out';
    }
  } else if (tied) {
    s.winner = null; s.losers = []; s.endReason = 'draw';
    pushLog(s, '🤝 Hòa! Cả 2 cùng số tiền và cùng tổng thời gian trả lời.', 'draw');
  } else {
    s.winner = best.id; s.losers = s.players.filter(p => p.id !== best.id).map(p => p.id);
    s.endReason = pr.level >= QUESTION_COUNT ? 'win150' : pr.stopped ? 'stop' : 'out';
  }
  s.final = { summary: finishSummary(s) };
  if (s.winner) pushLog(s, `🏆 ${(pOf(s, s.winner) || {}).name || '?'} thắng với ${pr.prize.toLocaleString('vi-VN')} đồng!`, 'win');
}

/* trả lời 1 câu: đúng → lên 1 bậc; sai → giữ tiền mốc an toàn, hết lượt */
export function applyAnswer(s, pid, opt, ms) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.done) return { ok: false, reason: 'Bạn đã hết lượt chơi.' };
  if (!Number.isInteger(opt) || opt < 0 || opt > 3) return { ok: false, reason: 'Phương án không hợp lệ.' };
  if (pr.used50 && pr.used50.includes(opt)) return { ok: false, reason: 'Phương án này đã bị loại bởi 50:50.' };
  const q = effectiveQuestion(s, pid, pr.level);
  if (!q) return { ok: false, reason: 'Không còn câu hỏi.' };
  const t = Math.max(0, Math.min(TIME_PER_QUESTION * 1000, Math.round(+ms) || 0));
  pr.timeMs += t;
  s.seq++;
  if (opt === q.answer) {
    pr.level++; pr.correct++; pr.streak++; pr.bestStreak = Math.max(pr.bestStreak, pr.streak);
    pr.prize = LADDER[pr.level - 1];
    pr.used50 = null; pr.phoneHint = null; pr.audience = null;
    pushLog(s, `✅ ${(pOf(s, pid) || {}).name || '?'} trả lời đúng câu ${pr.level} — ${pr.prize.toLocaleString('vi-VN')} đồng.`, 'good');
    if (pr.level >= QUESTION_COUNT) {
      pr.done = true; pr.finished = true;
      pushLog(s, `🎉 ${(pOf(s, pid) || {}).name || '?'} trả lời đúng cả 15 câu — 150 TRIỆU ĐỒNG!`, 'win');
    }
    checkEnd(s);
    return { ok: true, correct: true, level: pr.level, prize: pr.prize, finished: pr.done };
  }
  pr.done = true; pr.streak = 0;
  pr.prize = milestonePrize(pr.level);
  pushLog(s, `❌ ${(pOf(s, pid) || {}).name || '?'} trả lời sai câu ${pr.level + 1} — dừng ở ${pr.prize.toLocaleString('vi-VN')} đồng.`, 'bad');
  checkEnd(s);
  return { ok: true, correct: false, correctAnswer: q.answer, prize: pr.prize, finished: true };
}

/* dừng lại lấy tiền: chỉ được sau khi đã trả lời đúng ít nhất 1 câu */
export function applyStop(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.done) return { ok: false, reason: 'Bạn đã hết lượt chơi.' };
  if (pr.level < 1) return { ok: false, reason: 'Trả lời đúng ít nhất 1 câu mới được dừng lấy tiền.' };
  pr.done = true; pr.finished = true; pr.stopped = true;
  pr.prize = LADDER[pr.level - 1];
  s.seq++;
  pushLog(s, `🛑 ${(pOf(s, pid) || {}).name || '?'} dừng lại, mang về ${pr.prize.toLocaleString('vi-VN')} đồng.`, 'stop');
  checkEnd(s);
  return { ok: true, prize: pr.prize };
}

/* hết 30s chưa trả lời: tính như trả lời sai */
export function applyTimeout(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.done) return { ok: false, reason: 'Bạn đã hết lượt chơi.' };
  pr.done = true; pr.timedOut = true; pr.streak = 0;
  pr.prize = milestonePrize(pr.level);
  pr.timeMs += TIME_PER_QUESTION * 1000;
  s.seq++;
  pushLog(s, `⏰ ${(pOf(s, pid) || {}).name || '?'} hết 30 giây ở câu ${pr.level + 1} — dừng ở ${pr.prize.toLocaleString('vi-VN')} đồng.`, 'bad');
  checkEnd(s);
  return { ok: true, prize: pr.prize };
}

/* trợ giúp: mỗi loại 1 lần trong 1 lượt chơi */
export function applyLifeline(s, pid, kind) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.done) return { ok: false, reason: 'Bạn đã hết lượt chơi.' };
  if (!['fifty', 'phone', 'audience', 'switch'].includes(kind)) return { ok: false, reason: 'Trợ giúp không hợp lệ.' };
  if (pr.lifelines[kind]) return { ok: false, reason: 'Trợ giúp này đã dùng rồi.' };
  const q = effectiveQuestion(s, pid, pr.level);
  if (!q) return { ok: false, reason: 'Không còn câu hỏi.' };
  pr.lifelines[kind] = true;
  s.seq++;
  if (kind === 'fifty') {
    const wrong = [0, 1, 2, 3].filter(i => i !== q.answer);
    const removed = [];
    while (removed.length < 2) {
      const pick = wrong[Math.floor(nextRand(s) * wrong.length)];
      if (!removed.includes(pick)) removed.push(pick);
    }
    pr.used50 = removed.sort((a, b) => a - b);
    return { ok: true, kind, removed: pr.used50 };
  }
  if (kind === 'phone') {
    /* người thân đoán đúng ~70% */
    if (nextRand(s) < 0.7) pr.phoneHint = q.answer;
    else {
      const wrong = [0, 1, 2, 3].filter(i => i !== q.answer);
      pr.phoneHint = wrong[Math.floor(nextRand(s) * wrong.length)];
    }
    return { ok: true, kind, hint: pr.phoneHint };
  }
  if (kind === 'audience') {
    /* đáp án đúng chiếm đa số ~55–75%, còn lại chia cho 3 phương án kia */
    const main = 55 + Math.floor(nextRand(s) * 21);
    let rest = 100 - main;
    const shares = [0, 0, 0];
    for (let i = 0; i < 2; i++) {
      shares[i] = 1 + Math.floor(nextRand(s) * Math.max(1, rest - 2));
      rest -= shares[i];
    }
    shares[2] = rest;
    const aud = [0, 0, 0, 0];
    let si = 0;
    for (let i = 0; i < 4; i++) aud[i] = i === q.answer ? main : shares[si++];
    pr.audience = aud;
    return { ok: true, kind, audience: aud };
  }
  /* switch: thay câu hiện tại bằng 1 câu cùng bậc chưa dùng (riêng người này) */
  const pool = s.switchPool[q.tier];
  const next = pool && pool.length ? pool.shift() : null;
  if (!next) return { ok: false, reason: 'Hết câu dự phòng cùng bậc.' };
  pr.overrides[pr.level] = next;
  pr.used50 = null; pr.phoneHint = null; pr.audience = null;
  pr.switchUsedAt = pr.level;
  return { ok: true, kind, switched: true };
}

/* xin thua: bị loại, giữ tiền mốc an toàn; chơi đơn thì ván kết thúc luôn */
export function applyResign(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.done) return { ok: false, reason: 'Bạn đã hết lượt chơi.' };
  pr.done = true; pr.resigned = true;
  pr.prize = milestonePrize(pr.level);
  s.seq++;
  pushLog(s, `🏳️ ${(pOf(s, pid) || {}).name || '?'} xin thua — dừng ở ${pr.prize.toLocaleString('vi-VN')} đồng.`);
  checkEnd(s);
  return { ok: true, ended: s.phase === 'ended' };
}

/* ai đang phải hành động (cho bot): mọi người chưa xong lượt chơi */
export const actors = s => {
  if (s.phase !== 'playing') return [];
  return s.players.filter(p => { const pr = s.prog[p.id]; return pr && !pr.done; }).map(p => p.id);
};

/* góc nhìn riêng của 1 người chơi: câu hỏi hiện tại CỦA MÌNH (không lộ
   đáp án), tiến độ của mình + tiến độ tổng của đối thủ (bậc, tiền, đã
   xong chưa — không lộ đáp án hay phương án đối thủ đã chọn); đáp án
   của mọi câu chỉ lộ khi ván đã kết thúc */
export function viewFor(s, pid) {
  const pr = s.prog[pid] || { level: 0, correct: 0, prize: 0, done: true, lifelines: {}, timeMs: 0, streak: 0, bestStreak: 0 };
  const ended = s.phase === 'ended';
  const cur = !pr.done && pr.level < QUESTION_COUNT ? effectiveQuestion(s, pid, pr.level) : null;
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    startedAt: s.startedAt, endedAt: s.endedAt,
    winner: s.winner, losers: (s.losers || []).slice(), endReason: s.endReason,
    final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    answers: ended ? s.questions.map(q => q.answer) : null,
    players: s.players.map(p => {
      const q = s.prog[p.id] || {};
      /* câu hỏi hiện tại của từng người (KHÔNG kèm đáp án) + cờ trợ giúp
         đã dùng — cần cho chế độ chuyền tay: người cầm máy có thể là
         người chơi thứ 2, UI phải vẽ được câu hỏi của họ từ view của host.
         Đáp án và phương án đã chọn của đối thủ vẫn không lộ. */
      const pq = !q.done && (q.level || 0) < QUESTION_COUNT ? effectiveQuestion(s, p.id, q.level || 0) : null;
      return {
        id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
        qLevel: q.level || 0, correct: q.correct || 0, prize: q.prize || 0,
        done: !!q.done, finished: !!q.finished, stopped: !!q.stopped, resigned: !!q.resigned,
        timeMs: q.timeMs || 0, lifelinesUsed: Object.values(q.lifelines || {}).filter(Boolean).length,
        lifelines: { ...(q.lifelines || {}) },
        question: pq ? { q: pq.q, options: pq.options.slice(), tier: pq.tier, level: (q.level || 0) + 1, prizeNext: LADDER[q.level || 0] } : null,
      };
    }),
    you: {
      level: pr.level, correct: pr.correct, prize: pr.prize, done: pr.done,
      finished: pr.finished, stopped: pr.stopped, resigned: pr.resigned,
      streak: pr.streak, bestStreak: pr.bestStreak, timeMs: pr.timeMs,
      lifelines: { ...pr.lifelines },
      used50: pr.used50 ? pr.used50.slice() : null,
      phoneHint: pr.phoneHint, audience: pr.audience ? pr.audience.slice() : null,
      question: cur ? { q: cur.q, options: cur.options.slice(), tier: cur.tier, level: pr.level + 1, prizeNext: LADDER[pr.level] } : null,
    },
    log: s.log.slice(-20),
    me: pid,
  };
}

/* Adapter cho phòng online (simplenet): action { type, opt?, ms?, kind? } */
export function applyAction(s, pid, a, ctx) {
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'answer': return applyAnswer(s, pid, a.opt, a.ms);
    case 'stop': return applyStop(s, pid);
    case 'timeout': return applyTimeout(s, pid);
    case 'lifeline': return applyLifeline(s, pid, a.kind);
    case 'resign': return applyResign(s, pid);
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}

export default { createGame, applyAction, viewFor, actors, milestonePrize, effectiveQuestion, serialize, deserialize, mulberry32 };
