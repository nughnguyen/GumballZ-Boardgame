// 🎭 Đoán Hành Động – luật chơi (thuần logic, không chạm DOM).
// Một người làm DIỄN VIÊN: nhận 1 từ bí mật (chỉ mình họ thấy) rồi
// diễn bằng cơ thể, người còn lại gõ từ đoán vào ô. Mỗi từ 60 giây.
// Đoán đúng +10 cho người đoán, +5 cho diễn viên (chỉ lượt đoán
// đúng ĐẦU TIÊN tính). Người đoán chỉ được đoán 1 lần cho mỗi từ.
// Diễn viên là người chấm: thấy mọi lượt đoán trong nhật ký, bấm ✓
// để xác nhận 1 lượt đoán — engine kiểm tra lượt đó có khớp từ bí
// mật không (chuẩn hoá: bỏ dấu, thường hoá, gọn khoảng trắng). Diễn
// viên được bỏ qua tối đa 2 từ mỗi ván (bốc từ mới, 0 điểm).
// Chơi nhiều người: 3 vòng, mỗi vòng mọi người diễn 1 lần. Chơi đơn:
// xem mô tả hành động rồi chọn từ khớp trong 4 phương án, 10 từ,
// đúng từ 8/10 mới thắng.
// LCG trong state giữ cho các lần rút từ giống hệt nhau ở mọi máy
// cùng áp 1 hành động — dùng Math.random() thì 2 máy lệch nhau.
// Quyết định luật (ghi rõ để parent hiệu chuẩn thành tích):
// - Chơi đơn: đoán đúng ≥ 8/10 từ mới tính là thắng (SOLO_WIN_CORRECT).
// - Mỗi người đoán chỉ được đoán 1 lần cho mỗi từ (tránh spam, giữ
//   nhịp game). Diễn viên chấm lượt đoán bằng 'confirm'.
// - Xin thua: 2 người thì ván kết thúc ngay, người còn lại thắng;
//   3+ người thì ván tiếp tục không có người xin thua (lượt diễn của
//   họ bị bỏ qua; chỉ còn 1 người chưa thua thì người đó thắng ngay).
// - Hết 60 giây: từ đó lộ ra, 0 điểm cho mọi người, không tính là
//   bị đoán trúng cho diễn viên.
import { WORDS } from './words.js?v=1';

export const ROUNDS = 3;
export const SOLO_SETS = 10;
export const SOLO_WIN_CORRECT = 8;
export const GUESS_TIME = 60;
export const MAX_SKIPS = 2;
export const POINTS_CORRECT = 10;
export const POINTS_ACTOR = 5;

/* chuẩn hoá 1 lượt đoán: thường hoá + bỏ dấu tiếng Việt + gọn khoảng trắng
   (để "Con Mèo", "con meo", "  con   mèo " đều khớp "con mèo") */
export function normalizeGuess(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

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

const pOf = (s, id) => s.players.find(p => p.id === id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

/* rút 1 từ chưa dùng trong ngân hàng (theo LCG — xác định theo hạt giống) */
function drawWord(s) {
  const unused = WORDS.map((_, i) => i).filter(i => !s.usedWords.includes(i));
  if (!unused.length) return null;
  const idx = unused[Math.floor(nextRand(s) * unused.length)];
  s.usedWords.push(idx);
  return WORDS[idx];
}

/* 4 phương án cho chơi đơn: từ đúng + 3 từ khác (ưu tiên cùng chủ đề),
   xáo thứ tự theo LCG */
function drawSoloOptions(s, correct) {
  const sameCat = WORDS.filter(w => w.cat === correct.cat && w.word !== correct.word);
  const other = WORDS.filter(w => w.cat !== correct.cat);
  const pool = [];
  while (pool.length < 3 && sameCat.length) {
    const i = Math.floor(nextRand(s) * sameCat.length);
    pool.push(sameCat.splice(i, 1)[0].word);
  }
  while (pool.length < 3) {
    const i = Math.floor(nextRand(s) * other.length);
    pool.push(other.splice(i, 1)[0].word);
  }
  const opts = [correct.word, ...pool];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand(s) * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return { options: opts, correctIdx: opts.indexOf(correct.word) };
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 1 || players.length > 6) throw new Error('Đoán Hành Động chơi 1–6 người.');
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  const solo = players.length === 1;
  /* 🎯 diễn viên đầu xoay qua các ván: chủ phòng truyền opts.firstIdx (ván
     đầu ghế 0, ván sau ghế kế tiếp); không truyền thì mặc định ghế 0 để
     các test/luật cũ vẫn ổn định. Chơi đơn không có lượt diễn đầu. */
  const firstIdx = !solo && Number.isInteger(opts.firstIdx) && opts.firstIdx >= 0 && opts.firstIdx < players.length ? opts.firstIdx : 0;
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    seed, /* hạt giống LCG — mọi lần rút số trong ván đều qua nextRand(s) */
    phase: 'playing', /* 'playing' | 'ended' */
    solo,
    firstIdx, firstId: players[firstIdx].id,
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null })),
    prog: {},
    round: 1, /* nhiều người: vòng 1..3 */
    actorIdx: firstIdx, /* chỉ số ghế của diễn viên hiện tại (nhiều người) */
    stage: solo ? 'guess' : 'act', /* nhiều người: 'act' | 'guess' | 'reveal'; chơi đơn: 'guess' | 'reveal' */
    current: null, /* từ đang diễn (nhiều người): {actor, word, cat, guesses:[{id,pid,text,correct}], guessedBy, revealed, skipped, timedOut} */
    soloSet: null, /* chơi đơn: {index, word, cat, act, options, correctIdx, picked, revealed} */
    lastReveal: null, /* kết quả lật bài gần nhất */
    usedWords: [],
    guessSeq: 0, /* id tăng dần cho mỗi lượt đoán (để diễn viên chấm) */
    winner: null, losers: [], endReason: null,
    startedAt: Date.now(), endedAt: null,
    log: [],
  };
  for (const p of s.players) s.prog[p.id] = {
    points: 0, correctGuesses: 0, totalGuesses: 0,
    actedWords: 0, actedGuessed: 0, streak: 0, bestStreak: 0,
    skipsUsed: 0, resigned: false,
  };
  if (solo) {
    const w = drawWord(s);
    const o = drawSoloOptions(s, w);
    s.soloSet = { index: 0, word: w.word, cat: w.cat, act: w.act, options: o.options, correctIdx: o.correctIdx, picked: null, revealed: false };
    pushLog(s, `🎭 Ván Đoán Hành Động mới — xem mô tả hành động rồi chọn từ khớp trong 10 từ, đúng từ ${SOLO_WIN_CORRECT}/10 mới thắng!`);
  } else {
    const w = drawWord(s);
    s.current = { actor: s.players[firstIdx].id, word: w.word, cat: w.cat, guesses: [], guessedBy: null, revealed: false, skipped: false, timedOut: false };
    pushLog(s, `🎭 Ván Đoán Hành Động mới — ${s.players.length} người, ${ROUNDS} vòng, mỗi vòng mọi người diễn 1 lần!`);
    pushLog(s, `🎯 ${s.players[firstIdx].name} diễn trước!`, 'first');
  }
  return s;
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < 1 || s.players.length > 6
    || typeof s.phase !== 'string' || !s.prog || !Array.isArray(s.usedWords)
    || !['act', 'guess', 'reveal'].includes(s.stage)) {
    throw new Error('Trạng thái Đoán Hành Động không hợp lệ.');
  }
  return s;
}

/* diễn viên hiện tại (nhiều người) */
function actorId(s) { return s.players[s.actorIdx] ? s.players[s.actorIdx].id : null; }
/* những người phải đoán từ đang diễn (trừ diễn viên, trừ người đã xin thua) */
function guessers(s) {
  if (s.solo) return s.players.map(p => p.id);
  const ac = actorId(s);
  return s.players.filter(p => p.id !== ac && !s.prog[p.id].resigned).map(p => p.id);
}
/* người đoán đã đoán từ này chưa (mỗi người chỉ 1 lượt đoán / từ) */
function hasGuessed(s, pid) {
  return !!(s.current && s.current.guesses.some(g => g.pid === pid));
}

function finishSummary(s) {
  const summary = {};
  for (const p of s.players) {
    const pr = s.prog[p.id];
    summary[p.id] = {
      points: pr.points, correctGuesses: pr.correctGuesses, totalGuesses: pr.totalGuesses,
      actedWords: pr.actedWords, actedGuessed: pr.actedGuessed,
      bestStreak: pr.bestStreak, skipsUsed: pr.skipsUsed,
    };
  }
  return summary;
}

function checkEnd(s) {
  if (s.phase !== 'playing') return;
  s.phase = 'ended'; s.endedAt = Date.now(); s.seq++;
  if (s.solo) {
    const me = s.players[0], pr = s.prog[me.id];
    if (pr.correctGuesses >= SOLO_WIN_CORRECT) { s.winner = me.id; s.losers = []; }
    else { s.winner = null; s.losers = [me.id]; }
    s.endReason = 'done';
    pushLog(s, s.winner
      ? `🏆 ${me.name} đoán đúng ${pr.correctGuesses}/${SOLO_SETS} — thắng Đoán Hành Động!`
      : `🏁 ${me.name} đoán đúng ${pr.correctGuesses}/${SOLO_SETS} — chưa đủ ${SOLO_WIN_CORRECT} từ để thắng.`);
  } else {
    const ranked = [...s.players].sort((a, b) => {
      const pa = s.prog[a.id], pb = s.prog[b.id];
      if (pb.points !== pa.points) return pb.points - pa.points;
      if (pb.correctGuesses !== pa.correctGuesses) return pb.correctGuesses - pa.correctGuesses;
      return s.players.indexOf(a) - s.players.indexOf(b); /* hòa hết → ghế trước thắng */
    });
    const best = ranked[0];
    const tied = ranked.length > 1
      && s.prog[ranked[1].id].points === s.prog[best.id].points
      && s.prog[ranked[1].id].correctGuesses === s.prog[best.id].correctGuesses;
    if (tied) {
      s.winner = null; s.losers = []; s.endReason = 'draw';
      pushLog(s, `🤝 Hòa! ${best.name} và ${(ranked[1] || {}).name} cùng ${s.prog[best.id].points} điểm.`, 'draw');
    } else {
      s.winner = best.id; s.losers = s.players.filter(p => p.id !== best.id).map(p => p.id);
      s.endReason = s.endReason || 'done';
      pushLog(s, `🏆 ${best.name} thắng với ${s.prog[best.id].points} điểm!`, 'win');
    }
  }
  s.final = { summary: finishSummary(s) };
}

/* kết thúc 1 từ đang diễn (nhiều người): ghi actedWords/actedGuessed cho
   diễn viên, đặt lastReveal, sang giai đoạn lật bài */
function finishWord(s, how, guesserId) {
  const cur = s.current;
  if (!cur || cur.revealed) return;
  cur.revealed = true;
  const ap = s.prog[cur.actor];
  ap.actedWords++;
  if (how === 'guessed') ap.actedGuessed++;
  s.lastReveal = {
    actor: cur.actor, word: cur.word, cat: cur.cat,
    how, /* 'guessed' | 'timeout' | 'skip' */
    guesser: guesserId || null,
    guesses: cur.guesses.map(g => ({ pid: g.pid, text: g.text, correct: g.correct })),
  };
  s.stage = 'reveal'; s.seq++;
  const actor = pOf(s, cur.actor);
  if (how === 'guessed') {
    const g = pOf(s, guesserId);
    pushLog(s, `✅ ${g ? g.name : '?'} đoán đúng "${cur.word}"! (+${POINTS_CORRECT} điểm, ${actor ? actor.name : '?'} +${POINTS_ACTOR} điểm diễn)`, 'good');
  } else if (how === 'timeout') {
    pushLog(s, `⏰ Hết 60 giây — không ai đoán ra "${cur.word}".`, 'bad');
  } else {
    pushLog(s, `⏭️ ${actor ? actor.name : '?'} bỏ qua từ "${cur.word}".`);
  }
}

/* sang diễn viên tiếp theo (bỏ qua người đã xin thua), hoặc vòng mới,
   hoặc hết ván — trả về true nếu ván đã kết thúc */
function advanceToNextActor(s) {
  s.current = null; s.lastReveal = null;
  let guard = 0;
  do {
    s.actorIdx++;
    if (s.actorIdx >= s.players.length) {
      s.actorIdx = 0; s.round++;
      if (s.round > ROUNDS) { checkEnd(s); return true; }
      pushLog(s, `🔄 Sang vòng ${s.round}/${ROUNDS}!`);
    }
  } while (s.prog[s.players[s.actorIdx].id].resigned && guard++ < 20);
  const w = drawWord(s);
  if (!w) { checkEnd(s); return true; }
  s.current = { actor: s.players[s.actorIdx].id, word: w.word, cat: w.cat, guesses: [], guessedBy: null, revealed: false, skipped: false, timedOut: false };
  s.stage = 'act'; s.seq++;
  return false;
}

/* sang từ tiếp theo (chơi đơn) */
function advanceSolo(s) {
  const set = s.soloSet;
  if (!set) return;
  if (set.index + 1 >= SOLO_SETS) { checkEnd(s); return; }
  const w = drawWord(s);
  if (!w) { checkEnd(s); return; }
  const o = drawSoloOptions(s, w);
  s.soloSet = { index: set.index + 1, word: w.word, cat: w.cat, act: w.act, options: o.options, correctIdx: o.correctIdx, picked: null, revealed: false };
  s.stage = 'guess'; s.seq++;
}

/* diễn viên sẵn sàng diễn: bắt đầu tính 60 giây đoán */
export function applyReady(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (s.solo) return { ok: false, reason: 'Chơi đơn không cần diễn.' };
  if (s.stage !== 'act') return { ok: false, reason: 'Chưa tới lượt diễn.' };
  if (pid !== actorId(s)) return { ok: false, reason: 'Chưa tới lượt bạn diễn.' };
  s.stage = 'guess'; s.seq++;
  pushLog(s, `🎭 ${pOf(s, pid).name} bắt đầu diễn — mọi người có 60 giây để đoán!`);
  return { ok: true };
}

/* diễn viên bỏ qua từ này (tối đa 2 lần/ván): bốc từ mới (giai đoạn 'act')
   hoặc kết thúc từ đang diễn không điểm (giai đoạn 'guess') */
export function applySkip(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (s.solo) return { ok: false, reason: 'Chơi đơn không bỏ qua được.' };
  if (pid !== actorId(s)) return { ok: false, reason: 'Chỉ diễn viên mới được bỏ qua.' };
  const pr = s.prog[pid];
  if (pr.skipsUsed >= MAX_SKIPS) return { ok: false, reason: `Đã hết ${MAX_SKIPS} lượt bỏ qua.` };
  if (s.stage === 'act') {
    const w = drawWord(s);
    if (!w) return { ok: false, reason: 'Hết từ để bốc.' };
    pr.skipsUsed++;
    s.current = { actor: pid, word: w.word, cat: w.cat, guesses: [], guessedBy: null, revealed: false, skipped: false, timedOut: false };
    s.seq++;
    pushLog(s, `⏭️ ${pOf(s, pid).name} bỏ qua 1 từ, bốc từ mới (còn ${MAX_SKIPS - pr.skipsUsed} lượt bỏ qua).`);
    return { ok: true };
  }
  if (s.stage === 'guess') {
    pr.skipsUsed++;
    s.current.skipped = true;
    finishWord(s, 'skip');
    return { ok: true };
  }
  return { ok: false, reason: 'Lúc này không bỏ qua được.' };
}

/* người đoán gõ 1 từ (mỗi người chỉ 1 lượt đoán / từ) — lượt đoán được
   ghi lại để diễn viên chấm; engine KHÔNG tự chấm ở đây */
export function applyGuess(s, pid, text) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (s.stage !== 'guess') return { ok: false, reason: 'Chưa tới lượt đoán.' };
  if (s.solo) {
    /* chơi đơn: 'guess' nhận idx (số) qua applyAction; gọi trực tiếp
       bằng chuỗi sẽ bị từ chối ở đây */
    return { ok: false, reason: 'Chơi đơn đoán bằng cách chọn 1 trong 4 phương án.' };
  }
  if (pid === actorId(s)) return { ok: false, reason: 'Diễn viên không được đoán từ của mình.' };
  if (s.prog[pid] && s.prog[pid].resigned) return { ok: false, reason: 'Bạn đã xin thua rồi.' };
  if (hasGuessed(s, pid)) return { ok: false, reason: 'Bạn đã đoán từ này rồi (mỗi người 1 lượt đoán).' };
  const clean = (text || '').trim();
  if (!clean) return { ok: false, reason: 'Chưa nhập từ đoán.' };
  if (clean.length > 60) return { ok: false, reason: 'Từ đoán tối đa 60 ký tự.' };
  const cur = s.current;
  if (!cur || cur.revealed) return { ok: false, reason: 'Từ này đã lật bài rồi.' };
  s.guessSeq++;
  cur.guesses.push({ id: s.guessSeq, pid, text: clean, correct: null });
  s.seq++;
  pushLog(s, `🤔 ${pOf(s, pid).name} đã đoán 1 từ.`);
  return { ok: true, guessId: s.guessSeq };
}

/* chơi đơn: chọn 1 trong 4 phương án (idx 0..3) */
export function applySoloGuess(s, pid, idx) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (!s.solo) return { ok: false, reason: 'Chơi nhiều người đoán bằng cách gõ từ.' };
  if (s.stage !== 'guess') return { ok: false, reason: 'Chưa tới lượt đoán.' };
  if (!Number.isInteger(idx) || idx < 0 || idx > 3) return { ok: false, reason: 'Chọn 1 trong 4 phương án.' };
  const set = s.soloSet;
  if (!set || set.revealed) return { ok: false, reason: 'Từ này đã lật bài rồi.' };
  if (set.picked != null) return { ok: false, reason: 'Bạn đã chọn từ này rồi.' };
  set.picked = idx; set.revealed = true;
  const pr = s.prog[pid];
  pr.totalGuesses++;
  let correct = false;
  if (idx === set.correctIdx) {
    pr.points += POINTS_CORRECT; pr.correctGuesses++; pr.streak++;
    pr.bestStreak = Math.max(pr.bestStreak, pr.streak);
    correct = true;
  } else pr.streak = 0;
  s.lastReveal = {
    actor: null, word: set.word, cat: set.cat,
    how: correct ? 'guessed' : 'wrong',
    guesser: pid,
    guesses: [{ pid, text: set.options[idx], correct }],
  };
  s.stage = 'reveal'; s.seq++;
  pushLog(s, correct
    ? `✅ ${pOf(s, pid).name} chọn đúng "${set.word}"! (+${POINTS_CORRECT} điểm)`
    : `❌ ${pOf(s, pid).name} chọn sai — từ đúng là "${set.word}".`, correct ? 'good' : 'bad');
  return { ok: true, correct, word: set.word };
}

/* diễn viên chấm 1 lượt đoán: khớp từ bí mật (chuẩn hoá) thì lượt đó
   đúng — người đoán +10, diễn viên +5, từ kết thúc; không khớp thì
   lượt đó bị đánh dấu sai, từ vẫn tiếp tục */
export function applyConfirm(s, pid, guessId) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (s.solo) return { ok: false, reason: 'Chơi đơn không cần chấm.' };
  if (s.stage !== 'guess') return { ok: false, reason: 'Chưa tới lúc chấm.' };
  if (pid !== actorId(s)) return { ok: false, reason: 'Chỉ diễn viên mới được chấm.' };
  const cur = s.current;
  if (!cur || cur.revealed) return { ok: false, reason: 'Từ này đã lật bài rồi.' };
  const g = cur.guesses.find(x => x.id === guessId);
  if (!g) return { ok: false, reason: 'Không có lượt đoán này.' };
  if (g.correct != null) return { ok: false, reason: 'Lượt đoán này đã được chấm rồi.' };
  const ok = normalizeGuess(g.text) === normalizeGuess(cur.word);
  g.correct = ok;
  s.seq++;
  if (ok) {
    const gp = s.prog[g.pid];
    gp.points += POINTS_CORRECT; gp.correctGuesses++; gp.totalGuesses++; gp.streak++;
    gp.bestStreak = Math.max(gp.bestStreak, gp.streak);
    s.prog[pid].points += POINTS_ACTOR;
    cur.guessedBy = g.pid;
    finishWord(s, 'guessed', g.pid);
    return { ok: true, correct: true, guesser: g.pid };
  }
  /* đoán sai: lượt đó bị đánh dấu, người đoán mất chuỗi đúng */
  s.prog[g.pid].totalGuesses++;
  s.prog[g.pid].streak = 0;
  pushLog(s, `❌ Lượt đoán "${g.text}" của ${pOf(s, g.pid).name} không đúng.`, 'bad');
  return { ok: true, correct: false };
}

/* hết 60 giây: từ đang diễn lộ ra, 0 điểm (chơi đơn: từ đó tính sai) */
export function applyTimeout(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (s.stage !== 'guess') return { ok: false, reason: 'Chưa tới lượt đoán.' };
  if (s.solo) {
    const set = s.soloSet;
    if (!set || set.revealed || set.picked != null) return { ok: false, reason: 'Từ này đã lật bài rồi.' };
    set.picked = -1; set.revealed = true;
    s.prog[pid].streak = 0;
    s.lastReveal = {
      actor: null, word: set.word, cat: set.cat, how: 'timeout',
      guesser: null, guesses: [{ pid, text: '', correct: false }],
    };
    s.stage = 'reveal'; s.seq++;
    pushLog(s, `⏰ ${pOf(s, pid).name} hết giờ — từ đúng là "${set.word}".`, 'bad');
    return { ok: true };
  }
  const cur = s.current;
  if (!cur || cur.revealed) return { ok: false, reason: 'Từ này đã lật bài rồi.' };
  cur.timedOut = true;
  /* những người chưa đoán được tính là hết giờ: mất chuỗi đúng */
  for (const g of guessers(s)) s.prog[g].streak = 0;
  finishWord(s, 'timeout');
  return { ok: true };
}

/* đã xem lật bài xong → sang lượt diễn / từ tiếp theo */
export function applyNext(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (s.stage !== 'reveal') return { ok: false, reason: 'Chưa lật bài xong.' };
  if (s.solo) { advanceSolo(s); return { ok: true }; }
  advanceToNextActor(s);
  return { ok: true };
}

/* xin thua: 2 người thì ván kết thúc ngay; 3+ người thì ván tiếp tục
   không có người xin thua (lượt diễn của họ bị bỏ qua) */
export function applyResign(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.resigned) return { ok: false, reason: 'Bạn đã xin thua rồi.' };
  pr.resigned = true;
  s.seq++;
  pushLog(s, `🏳️ ${pOf(s, pid).name} xin thua.`);
  if (s.solo) {
    s.winner = null; s.losers = [pid]; s.endReason = 'resign';
    s.phase = 'ended'; s.endedAt = Date.now(); s.seq++;
    s.final = { summary: finishSummary(s) };
    return { ok: true, ended: true };
  }
  const alive = s.players.filter(p => !s.prog[p.id].resigned);
  if (alive.length <= 1) {
    s.endReason = 'resign';
    if (alive.length === 1) { s.winner = alive[0].id; s.losers = s.players.filter(p => p.id !== alive[0].id).map(p => p.id); }
    else { s.winner = null; s.losers = s.players.map(p => p.id); }
    s.phase = 'ended'; s.endedAt = Date.now(); s.seq++;
    s.final = { summary: finishSummary(s) };
    return { ok: true, ended: true };
  }
  /* còn ≥2 người: nếu người xin thua đang diễn thì hủy từ đang diễn,
     sang diễn viên tiếp theo */
  if (s.stage === 'act' && actorId(s) === pid) {
    if (advanceToNextActor(s)) return { ok: true, ended: true };
  } else if (s.stage === 'guess' && s.current && s.current.actor === pid) {
    s.current = null; s.lastReveal = null;
    if (advanceToNextActor(s)) return { ok: true, ended: true };
  }
  return { ok: true, ended: false };
}

/* ai đang phải hành động (cho bot): diễn viên lúc 'act', người đoán
   (chưa đoán) + diễn viên (chấm) lúc 'guess', bất kỳ ai lúc 'reveal' */
export const actors = s => {
  if (s.phase !== 'playing') return [];
  if (s.stage === 'act') return [actorId(s)];
  if (s.stage === 'guess') {
    if (s.solo) {
      const set = s.soloSet;
      return set && set.picked == null ? [s.players[0].id] : [];
    }
    const cur = s.current;
    if (!cur) return [];
    const out = guessers(s).filter(g => !hasGuessed(s, g));
    if (!cur.revealed) out.push(actorId(s)); /* diễn viên chấm lượt đoán */
    return out;
  }
  if (s.stage === 'reveal') return s.players.filter(p => !s.prog[p.id].resigned).map(p => p.id);
  return [];
};

/* góc nhìn riêng của 1 người chơi: từ bí mật CHỈ lộ với diễn viên
   hoặc sau khi lật bài; lượt đoán của người khác chỉ lộ với diễn
   viên (người đoán chỉ thấy lượt của mình + số người đã đoán), sau
   khi lật bài thì lộ hết */
export function viewFor(s, pid) {
  const pr = s.prog[pid] || { points: 0, correctGuesses: 0, totalGuesses: 0, actedWords: 0, actedGuessed: 0, bestStreak: 0, streak: 0, skipsUsed: 0 };
  const ended = s.phase === 'ended';
  const cur = s.current;
  const isActor = !s.solo && cur && cur.actor === pid;
  let currentView = null;
  if (!s.solo && cur) {
    const revealed = cur.revealed;
    currentView = {
      actor: cur.actor,
      word: (isActor || revealed) ? cur.word : null,
      cat: cur.cat,
      revealed: !!revealed,
      skipped: !!cur.skipped,
      timedOut: !!cur.timedOut,
      guessedBy: cur.guessedBy,
      /* diễn viên thấy hết nội dung lượt đoán; người đoán chỉ thấy
         lượt của mình, lượt người khác chỉ hiện "đã đoán" */
      guesses: cur.guesses.map(g => ({
        id: g.id, pid: g.pid,
        text: (isActor || revealed || g.pid === pid) ? g.text : null,
        correct: revealed ? g.correct : (isActor ? g.correct : (g.pid === pid ? g.correct : null)),
      })),
      guessedCount: cur.guesses.length,
      totalGuessers: guessers(s).length,
    };
  }
  let soloView = null;
  if (s.solo && s.soloSet) {
    const set = s.soloSet;
    soloView = {
      index: set.index + 1, total: SOLO_SETS,
      act: set.act, cat: set.cat,
      options: set.options.slice(),
      picked: set.picked, revealed: !!set.revealed,
      correctIdx: set.revealed ? set.correctIdx : null,
      word: set.revealed ? set.word : null,
    };
  }
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    startedAt: s.startedAt, endedAt: s.endedAt,
    winner: s.winner, losers: (s.losers || []).slice(), endReason: s.endReason,
    final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    solo: s.solo, round: s.round, rounds: ROUNDS,
    stage: s.stage, actor: actorId(s),
    firstIdx: s.firstIdx ?? 0, firstId: s.firstId || actorId(s),
    wordsDone: s.solo ? (s.soloSet ? s.soloSet.index : 0) : (s.round - 1) * s.players.length + s.actorIdx,
    totalWords: s.solo ? SOLO_SETS : ROUNDS * s.players.length,
    current: currentView, soloSet: soloView,
    lastReveal: s.lastReveal ? JSON.parse(JSON.stringify(s.lastReveal)) : null,
    players: s.players.map(p => {
      const q = s.prog[p.id] || {};
      return {
        id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
        points: q.points || 0, correctGuesses: q.correctGuesses || 0, totalGuesses: q.totalGuesses || 0,
        actedWords: q.actedWords || 0, actedGuessed: q.actedGuessed || 0, bestStreak: q.bestStreak || 0,
        skipsUsed: q.skipsUsed || 0, resigned: !!q.resigned,
      };
    }),
    you: {
      points: pr.points, correctGuesses: pr.correctGuesses, totalGuesses: pr.totalGuesses,
      actedWords: pr.actedWords, actedGuessed: pr.actedGuessed,
      streak: pr.streak, bestStreak: pr.bestStreak, skipsUsed: pr.skipsUsed,
      isActor: !!isActor,
    },
    log: s.log.slice(-20),
    me: pid,
  };
}

/* Adapter cho phòng online (simplenet): action { type, text?, idx?, guessId? } */
export function applyAction(s, pid, a, ctx) {
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'ready': return applyReady(s, pid);
    case 'skip': return applySkip(s, pid);
    case 'guess':
      if (s.solo) {
        if (typeof a.idx === 'number') return applySoloGuess(s, pid, a.idx);
        return { ok: false, reason: 'Chơi đơn đoán bằng cách chọn 1 trong 4 phương án.' };
      }
      return applyGuess(s, pid, a.text);
    case 'confirm': return applyConfirm(s, pid, a.guessId);
    case 'timeout': return applyTimeout(s, pid);
    case 'next': return applyNext(s, pid);
    case 'resign': return applyResign(s, pid);
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}

export default { createGame, applyAction, viewFor, actors, serialize, deserialize, mulberry32, normalizeGuess };
