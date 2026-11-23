// 🤥 2 Thật 1 Giả – luật chơi (thuần logic, không chạm DOM).
// Mỗi người kể 3 câu về mình (2 thật, 1 giả), người còn lại đoán xem
// câu nào là câu giả. Đoán đúng +10 điểm; người kể được +5 cho mỗi
// người bị mình đánh lừa. Chơi nhiều người: 3 vòng, mỗi vòng mọi người
// kể 1 lần (theo thứ tự ghế). Chơi đơn: đoán 10 bộ có sẵn liên tiếp.
// Mốc thời gian: mỗi lượt đoán 60s — đồng hồ do client đếm, engine
// nhận hành động 'timeout' khi hết giờ. LCG trong state giữ cho các
// lần rút bộ câu hỏi giống hệt nhau ở mọi máy cùng áp 1 hành động —
// dùng Math.random() thì 2 máy lệch nhau.
// Quyết định luật (ghi rõ để parent hiệu chuẩn thành tích):
// - Chơi đơn: đoán đúng ≥ 8/10 bộ mới tính là thắng (SOLO_WIN_CORRECT),
//   dưới 8 thì tính thua (winner null, losers có mình).
// - Xin thua: ván kết thúc ngay; người có điểm cao nhất trong số người
//   còn lại thắng (hòa điểm → nhiều câu đoán đúng hơn → ghế trước).
// - Hết giờ đoán (timeout): không tính là 1 lượt đoán (totalGuesses
//   không tăng), 0 điểm, KHÔNG tính là bị đánh lừa cho người kể.
import { SETS } from './statements.js?v=1';

export const ROUNDS = 3;
export const SOLO_SETS = 10;
export const SOLO_WIN_CORRECT = 8;
export const GUESS_SECONDS = 60;
export const POINTS_CORRECT = 10;
export const POINTS_FOOL = 5;

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

/* rút 1 bộ chưa dùng trong ngân hàng (theo LCG — xác định theo hạt giống) */
function drawBankSet(s) {
  const unused = SETS.map((_, i) => i).filter(i => !s.usedBank.includes(i));
  if (!unused.length) return null;
  const idx = unused[Math.floor(nextRand(s) * unused.length)];
  s.usedBank.push(idx);
  const src = SETS[idx];
  return { statements: src.statements.slice(), lie: src.lie, topic: src.topic, source: 'bank' };
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 1 || players.length > 6) throw new Error('2 Thật 1 Giả chơi 1–6 người.');
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  const solo = players.length === 1;
  /* 🎯 người kể đầu xoay qua các ván: chủ phòng truyền opts.firstIdx (ván
     đầu ghế 0, ván sau ghế kế tiếp); không truyền thì mặc định ghế 0 để
     các test/luật cũ vẫn ổn định. Chơi đơn không có lượt kể đầu. */
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
    presenterIdx: firstIdx, /* chỉ số ghế của người đang kể (nhiều người) */
    stage: solo ? 'guess' : 'submit', /* 'submit' | 'guess' | 'reveal' */
    current: null, /* bộ đang kể (nhiều người): {presenter, statements, lie, source, topic, guesses:{pid:idx|-1}, revealed} */
    soloSet: null, /* chơi đơn: {index (0-based), statements, lie, topic, guessed: idx|-1|null, revealed} */
    lastReveal: null, /* kết quả lật bài gần nhất (để giao diện chiếu sau khi tự chuyển lượt) */
    usedBank: [],
    winner: null, losers: [], endReason: null,
    startedAt: Date.now(), endedAt: null,
    log: [],
  };
  for (const p of s.players) s.prog[p.id] = {
    points: 0, correctGuesses: 0, totalGuesses: 0,
    fooled: 0, maxFooled: 0, caughtSets: 0, setsPresented: 0, streak: 0, bestStreak: 0,
    resigned: false,
  };
  if (solo) {
    s.soloSet = { index: 0, ...drawBankSet(s), guessed: null, revealed: false };
    pushLog(s, `🤥 Ván 2 Thật 1 Giả mới — đoán câu giả trong 10 bộ, đúng từ ${SOLO_WIN_CORRECT}/10 mới thắng!`);
  } else {
    pushLog(s, `🤥 Ván 2 Thật 1 Giả mới — ${s.players.length} người, ${ROUNDS} vòng, mỗi vòng mọi người kể 1 lần!`);
    pushLog(s, `🎯 ${s.players[firstIdx].name} kể trước!`, 'first');
  }
  return s;
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < 1 || s.players.length > 6
    || typeof s.phase !== 'string' || !s.prog || !Array.isArray(s.usedBank)
    || !['submit', 'guess', 'reveal'].includes(s.stage)) {
    throw new Error('Trạng thái 2 Thật 1 Giả không hợp lệ.');
  }
  return s;
}

/* người kể hiện tại (nhiều người) */
function presenterId(s) { return s.players[s.presenterIdx] ? s.players[s.presenterIdx].id : null; }
/* những người phải đoán bộ đang kể (trừ người kể) */
function guessers(s) {
  if (s.solo) return s.players.map(p => p.id);
  const pr = presenterId(s);
  return s.players.filter(p => p.id !== pr && !s.prog[p.id].resigned).map(p => p.id);
}

function finishSummary(s) {
  const summary = {};
  for (const p of s.players) {
    const pr = s.prog[p.id];
    summary[p.id] = {
      points: pr.points, correctGuesses: pr.correctGuesses, totalGuesses: pr.totalGuesses,
      fooled: pr.fooled, maxFooled: pr.maxFooled || 0, caughtSets: pr.caughtSets || 0,
      setsPresented: pr.setsPresented, bestStreak: pr.bestStreak,
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
      ? `🏆 ${me.name} đoán đúng ${pr.correctGuesses}/${SOLO_SETS} — thắng 2 Thật 1 Giả!`
      : `🏁 ${me.name} đoán đúng ${pr.correctGuesses}/${SOLO_SETS} — chưa đủ ${SOLO_WIN_CORRECT} câu để thắng.`);
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
      s.winner = null; s.losers = [];
      pushLog(s, `🤝 Hòa! ${best.name} và ${(ranked[1] || {}).name} cùng ${s.prog[best.id].points} điểm.`, 'draw');
    } else {
      s.winner = best.id; s.losers = s.players.filter(p => p.id !== best.id).map(p => p.id);
      pushLog(s, `🏆 ${best.name} thắng với ${s.prog[best.id].points} điểm!`, 'win');
    }
    s.endReason = s.endReason || 'done';
  }
  s.final = { summary: finishSummary(s) };
}

/* chấm điểm 1 bộ đã lật bài (nhiều người): đoán đúng +10, người kể +5
   cho mỗi người đoán sai; hết giờ không tính đoán, không tính bị lừa */
function scoreSet(s, cur) {
  const pr = s.prog[cur.presenter];
  let correct = 0, fooled = 0;
  for (const pid of Object.keys(cur.guesses)) {
    const g = cur.guesses[pid];
    const gp = s.prog[pid];
    if (g === -1) { gp.streak = 0; continue; /* hết giờ: 0 điểm, không tính */
    }
    gp.totalGuesses++;
    if (g === cur.lie) {
      gp.points += POINTS_CORRECT; gp.correctGuesses++; gp.streak++;
      gp.bestStreak = Math.max(gp.bestStreak, gp.streak);
      correct++;
    } else {
      gp.streak = 0;
      pr.points += POINTS_FOOL; pr.fooled++; fooled++;
    }
  }
  pr.setsPresented++;
  pr.maxFooled = Math.max(pr.maxFooled || 0, fooled);
  if (correct > 0) pr.caughtSets++;
  return { correct, fooled };
}

/* mọi người đoán xong (hoặc hết giờ) → lật bài, chấm điểm, chờ 'next' */
function revealCurrent(s) {
  const cur = s.current;
  if (!cur || cur.revealed) return;
  cur.revealed = true;
  const res = scoreSet(s, cur);
  s.lastReveal = {
    presenter: cur.presenter, statements: cur.statements.slice(), lie: cur.lie,
    topic: cur.topic || null, source: cur.source,
    guesses: { ...cur.guesses }, correct: res.correct, fooled: res.fooled,
  };
  s.stage = 'reveal'; s.seq++;
  const pr = pOf(s, cur.presenter);
  pushLog(s, `🔍 Lật bài của ${pr ? pr.name : '?'}: câu giả là "${cur.statements[cur.lie]}" — ${res.correct} người đoán đúng, ${res.fooled} người bị lừa.`, 'reveal');
}

/* sang người kể tiếp theo (bỏ qua người đã xin thua), hoặc vòng mới,
   hoặc hết ván — trả về true nếu ván đã kết thúc */
function advanceToNextPresenter(s) {
  s.current = null; s.lastReveal = null;
  let guard = 0;
  do {
    s.presenterIdx++;
    if (s.presenterIdx >= s.players.length) {
      s.presenterIdx = 0; s.round++;
      if (s.round > ROUNDS) { checkEnd(s); return true; }
      pushLog(s, `🔄 Sang vòng ${s.round}/${ROUNDS}!`);
    }
  } while (s.prog[s.players[s.presenterIdx].id].resigned && guard++ < 20);
  s.stage = 'submit'; s.seq++;
  return false;
}

/* sang người kể tiếp theo (hoặc vòng mới, hoặc hết ván) */
function advancePresenter(s) { advanceToNextPresenter(s); }

/* sang bộ tiếp theo (chơi đơn) */
function advanceSolo(s) {
  const set = s.soloSet;
  if (!set) return;
  if (set.index + 1 >= SOLO_SETS) { checkEnd(s); return; }
  s.soloSet = { index: set.index + 1, ...drawBankSet(s), guessed: null, revealed: false };
  s.stage = 'guess'; s.seq++;
}

/* người kể nộp bộ của mình: 3 câu + chỉ số câu giả */
export function applySubmit(s, pid, statements, lie) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (s.solo) return { ok: false, reason: 'Chơi đơn không cần kể — chỉ đoán thôi.' };
  if (s.stage !== 'submit') return { ok: false, reason: 'Chưa tới lượt kể.' };
  if (pid !== presenterId(s)) return { ok: false, reason: 'Chưa tới lượt bạn kể.' };
  if (!Array.isArray(statements) || statements.length !== 3) return { ok: false, reason: 'Cần đúng 3 câu.' };
  const clean = statements.map(x => (x || '').trim());
  if (clean.some(x => !x)) return { ok: false, reason: 'Không được để trống câu nào.' };
  if (clean.some(x => x.length > 120)) return { ok: false, reason: 'Mỗi câu tối đa 120 ký tự.' };
  if (new Set(clean).size !== 3) return { ok: false, reason: '3 câu phải khác nhau.' };
  if (!Number.isInteger(lie) || lie < 0 || lie > 2) return { ok: false, reason: 'Câu giả phải là 1 trong 3 câu.' };
  s.current = { presenter: pid, statements: clean, lie, source: 'custom', topic: null, guesses: {}, revealed: false };
  s.stage = 'guess'; s.seq++;
  pushLog(s, `🎤 ${pOf(s, pid).name} đã kể xong 3 câu — mọi người đoán xem câu nào là giả!`);
  return { ok: true };
}

/* người kể lấy 1 bộ có sẵn trong ngân hàng thay vì tự nghĩ */
export function applyDraw(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (s.solo) return { ok: false, reason: 'Chơi đơn không cần kể — chỉ đoán thôi.' };
  if (s.stage !== 'submit') return { ok: false, reason: 'Chưa tới lượt kể.' };
  if (pid !== presenterId(s)) return { ok: false, reason: 'Chưa tới lượt bạn kể.' };
  const set = drawBankSet(s);
  if (!set) return { ok: false, reason: 'Hết bộ có sẵn.' };
  s.current = { presenter: pid, statements: set.statements, lie: set.lie, source: 'bank', topic: set.topic, guesses: {}, revealed: false };
  s.stage = 'guess'; s.seq++;
  pushLog(s, `🎤 ${pOf(s, pid).name} lấy 1 bộ có sẵn để kể — mọi người đoán xem câu nào là giả!`);
  return { ok: true };
}

/* đoán câu nào là giả (chỉ số 0..2) */
export function applyGuess(s, pid, idx) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (s.stage !== 'guess') return { ok: false, reason: 'Chưa tới lượt đoán.' };
  if (!Number.isInteger(idx) || idx < 0 || idx > 2) return { ok: false, reason: 'Chọn 1 trong 3 câu.' };
  if (s.solo) {
    const set = s.soloSet;
    if (!set || set.revealed) return { ok: false, reason: 'Bộ này đã lật bài rồi.' };
    if (set.guessed != null) return { ok: false, reason: 'Bạn đã đoán bộ này rồi.' };
    set.guessed = idx; set.revealed = true;
    const pr = s.prog[pid];
    pr.totalGuesses++;
    let correct = false;
    if (idx === set.lie) {
      pr.points += POINTS_CORRECT; pr.correctGuesses++; pr.streak++;
      pr.bestStreak = Math.max(pr.bestStreak, pr.streak);
      correct = true;
    } else pr.streak = 0;
    s.lastReveal = {
      presenter: null, statements: set.statements.slice(), lie: set.lie,
      topic: set.topic, source: 'bank', guesses: { [pid]: idx },
      correct: correct ? 1 : 0, fooled: 0,
    };
    s.stage = 'reveal'; s.seq++;
    pushLog(s, correct
      ? `✅ ${pOf(s, pid).name} đoán đúng câu giả! (+${POINTS_CORRECT} điểm)`
      : `❌ ${pOf(s, pid).name} đoán sai — câu giả là "${set.statements[set.lie]}".`, correct ? 'good' : 'bad');
    return { ok: true, correct, lie: set.lie };
  }
  const cur = s.current;
  if (!cur || cur.revealed) return { ok: false, reason: 'Bộ này đã lật bài rồi.' };
  if (pid === cur.presenter) return { ok: false, reason: 'Người kể không được đoán bộ của mình.' };
  if (cur.guesses[pid] != null) return { ok: false, reason: 'Bạn đã đoán rồi.' };
  cur.guesses[pid] = idx; s.seq++;
  pushLog(s, `🤔 ${pOf(s, pid).name} đã đoán xong.`);
  if (guessers(s).every(g => cur.guesses[g] != null)) revealCurrent(s);
  return { ok: true };
}

/* hết 60s chưa đoán: tính là không đoán (0 điểm, không tính bị lừa) */
export function applyTimeout(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (s.stage !== 'guess') return { ok: false, reason: 'Chưa tới lượt đoán.' };
  if (s.solo) {
    const set = s.soloSet;
    if (!set || set.revealed || set.guessed != null) return { ok: false, reason: 'Bộ này đã lật bài rồi.' };
    set.guessed = -1; set.revealed = true;
    s.prog[pid].streak = 0;
    s.lastReveal = {
      presenter: null, statements: set.statements.slice(), lie: set.lie,
      topic: set.topic, source: 'bank', guesses: { [pid]: -1 },
      correct: 0, fooled: 0,
    };
    s.stage = 'reveal'; s.seq++;
    pushLog(s, `⏰ ${pOf(s, pid).name} hết 60 giây — câu giả là "${set.statements[set.lie]}".`, 'bad');
    return { ok: true };
  }
  const cur = s.current;
  if (!cur || cur.revealed) return { ok: false, reason: 'Bộ này đã lật bài rồi.' };
  if (pid === cur.presenter) return { ok: false, reason: 'Người kể không cần đoán.' };
  if (cur.guesses[pid] != null) return { ok: false, reason: 'Bạn đã đoán rồi.' };
  cur.guesses[pid] = -1; s.seq++;
  s.prog[pid].streak = 0;
  pushLog(s, `⏰ ${pOf(s, pid).name} hết 60 giây chưa đoán.`, 'bad');
  if (guessers(s).every(g => cur.guesses[g] != null)) revealCurrent(s);
  return { ok: true };
}

/* đã xem lật bài xong → sang lượt kể / bộ tiếp theo */
export function applyNext(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (s.stage !== 'reveal') return { ok: false, reason: 'Chưa lật bài xong.' };
  if (s.solo) { advanceSolo(s); return { ok: true }; }
  advancePresenter(s);
  return { ok: true };
}

/* xin thua: ván kết thúc ngay; người còn lại có điểm cao nhất thắng */
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
  /* nhiều người: người xin thua bị loại khỏi lượt kể/đoán; nếu chỉ còn
     1 người chưa xin thua thì ván kết thúc, người đó thắng */
  const alive = s.players.filter(p => !s.prog[p.id].resigned);
  if (alive.length <= 1) {
    s.endReason = 'resign';
    if (alive.length === 1) { s.winner = alive[0].id; s.losers = s.players.filter(p => p.id !== alive[0].id).map(p => p.id); }
    else { s.winner = null; s.losers = s.players.map(p => p.id); }
    s.phase = 'ended'; s.endedAt = Date.now(); s.seq++;
    s.final = { summary: finishSummary(s) };
    return { ok: true, ended: true };
  }
  /* còn ≥2 người: nếu người xin thua đang kể thì hủy bộ đang kể, sang
     người kể tiếp theo; nếu đang đoán thì coi như hết giờ */
  if (!s.solo && s.stage === 'submit' && s.current == null && presenterId(s) === pid) {
    advanceToNextPresenter(s);
  } else if (!s.solo && s.stage === 'guess' && s.current && s.current.presenter === pid) {
    s.current = null; s.lastReveal = null;
    if (advanceToNextPresenter(s)) return { ok: true, ended: true };
  } else if (!s.solo && s.stage === 'guess' && s.current && s.current.guesses[pid] == null) {
    s.current.guesses[pid] = -1;
    if (guessers(s).every(g => s.current.guesses[g] != null)) revealCurrent(s);
  }
  return { ok: true, ended: false };
}

/* ai đang phải hành động (cho bot): người kể lúc 'submit', người đoán
   lúc 'guess', bất kỳ ai lúc 'reveal' (bấm Tiếp tục) */
export const actors = s => {
  if (s.phase !== 'playing') return [];
  if (s.stage === 'submit') return [presenterId(s)];
  if (s.stage === 'guess') {
    if (s.solo) {
      const set = s.soloSet;
      return set && set.guessed == null ? [s.players[0].id] : [];
    }
    const cur = s.current;
    if (!cur) return [];
    return guessers(s).filter(g => cur.guesses[g] == null);
  }
  if (s.stage === 'reveal') return s.players.filter(p => !s.prog[p.id].resigned).map(p => p.id);
  return [];
};

/* góc nhìn riêng của 1 người chơi: câu giả của bộ đang kể CHỈ lộ với
   người kể hoặc sau khi lật bài; bộ chưa kể thì không lộ gì; đáp án
   đoán của người khác chỉ lộ sau khi lật bài (trước đó chỉ lộ số người
   đã đoán) */
export function viewFor(s, pid) {
  const pr = s.prog[pid] || { points: 0, correctGuesses: 0, totalGuesses: 0, fooled: 0, setsPresented: 0, bestStreak: 0, streak: 0 };
  const ended = s.phase === 'ended';
  const cur = s.current;
  const isPresenter = !s.solo && cur && cur.presenter === pid;
  const myGuess = s.solo
    ? (s.soloSet ? s.soloSet.guessed : null)
    : (cur && cur.guesses[pid] != null ? cur.guesses[pid] : null);
  let currentView = null;
  if (!s.solo && cur) {
    currentView = {
      presenter: cur.presenter,
      statements: cur.statements.slice(),
      topic: cur.topic || null,
      source: cur.source,
      lie: (isPresenter || cur.revealed) ? cur.lie : null,
      revealed: !!cur.revealed,
      responded: Object.keys(cur.guesses),
      respondedCount: Object.keys(cur.guesses).length,
      totalGuessers: guessers(s).length,
      guesses: cur.revealed ? { ...cur.guesses } : null,
    };
  }
  let soloView = null;
  if (s.solo && s.soloSet) {
    const set = s.soloSet;
    soloView = {
      index: set.index + 1, total: SOLO_SETS,
      statements: set.statements.slice(), topic: set.topic,
      lie: set.revealed ? set.lie : null,
      guessed: set.guessed, revealed: !!set.revealed,
    };
  }
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    startedAt: s.startedAt, endedAt: s.endedAt,
    winner: s.winner, losers: (s.losers || []).slice(), endReason: s.endReason,
    final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    solo: s.solo, round: s.round, rounds: ROUNDS,
    stage: s.stage, presenter: presenterId(s),
    firstIdx: s.firstIdx ?? 0, firstId: s.firstId || presenterId(s),
    setsDone: s.solo ? (s.soloSet ? s.soloSet.index : 0) : (s.round - 1) * s.players.length + s.presenterIdx,
    totalSets: s.solo ? SOLO_SETS : ROUNDS * s.players.length,
    current: currentView, soloSet: soloView,
    lastReveal: s.lastReveal ? JSON.parse(JSON.stringify(s.lastReveal)) : null,
    players: s.players.map(p => {
      const q = s.prog[p.id] || {};
      return {
        id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
        points: q.points || 0, correctGuesses: q.correctGuesses || 0, totalGuesses: q.totalGuesses || 0,
        setsPresented: q.setsPresented || 0, bestStreak: q.bestStreak || 0,
        resigned: !!q.resigned,
      };
    }),
    you: {
      points: pr.points, correctGuesses: pr.correctGuesses, totalGuesses: pr.totalGuesses,
      fooled: pr.fooled, setsPresented: pr.setsPresented,
      streak: pr.streak, bestStreak: pr.bestStreak,
      isPresenter: !!isPresenter, myGuess,
    },
    log: s.log.slice(-20),
    me: pid,
  };
}

/* Adapter cho phòng online (simplenet): action { type, statements?, lie?, idx? } */
export function applyAction(s, pid, a, ctx) {
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'submit': return applySubmit(s, pid, a.statements, a.lie);
    case 'draw': return applyDraw(s, pid);
    case 'guess': return applyGuess(s, pid, a.idx);
    case 'timeout': return applyTimeout(s, pid);
    case 'next': return applyNext(s, pid);
    case 'resign': return applyResign(s, pid);
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}

export default { createGame, applyAction, viewFor, actors, serialize, deserialize, mulberry32 };
