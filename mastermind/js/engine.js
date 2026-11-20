// 🔴 Mastermind – luật chơi (thuần logic, không chạm DOM).
// Đấu song song 2 bàn: mỗi người tự đặt 1 mã bí mật 4 chốt (6 màu,
// màu được lặp lại), rồi luân phiên đoán mã của đối thủ — ai đoán ra
// trước (4 chốt đen) thì thắng. Mỗi người tối đa 10 lượt đoán.
// Phản hồi chuẩn: chốt đen = đúng màu đúng vị trí; chốt trắng = đúng
// màu sai vị trí, mỗi chốt của mã bí mật chỉ được tính tối đa 1 lần
// (không tính trùng lặp quá số lần màu xuất hiện trong mã).
// Hết 10 lượt cả 2 đều chưa đoán ra: so lượt đoán tốt nhất (nhiều chốt
// đen hơn, rồi nhiều chốt trắng hơn); vẫn hòa thì hòa. Xin thua dừng
// ván ngay, đối thủ thắng.
// Engine xác định hoàn toàn theo seed (không dùng Math.random).
// summary cuối trận (theo người chơi): guesses (số lượt đã đoán),
// cracked (đoán ra mã hay chưa), bestBlack/bestWhite (phản hồi tốt
// nhất), turns (số lượt đã đoán). Điểm nằm ở final.scores + p.score:
// người thắng (đoán ra mã, hoặc hơn lượt đoán tốt nhất khi hết lượt)
// = (11 − số lượt đoán) × 10; người thua = chốt đen tốt nhất × 2;
// hòa thì cả 2 lấy điểm theo chốt đen tốt nhất.
export const CODE_LEN = 4;
export const COLOR_COUNT = 6;
export const MAX_GUESSES = 10;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 2;
export const COLORS = [
  { idx: 0, name: 'Đỏ', css: 'c0', hex: '#e05d5d' },
  { idx: 1, name: 'Xanh dương', css: 'c1', hex: '#5b8def' },
  { idx: 2, name: 'Vàng', css: 'c2', hex: '#f2b705' },
  { idx: 3, name: 'Xanh lá', css: 'c3', hex: '#3fae6a' },
  { idx: 4, name: 'Cam', css: 'c4', hex: '#f28c38' },
  { idx: 5, name: 'Tím', css: 'c5', hex: '#9b6dd6' },
];

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const isCode = c => Array.isArray(c) && c.length === CODE_LEN
  && c.every(x => Number.isInteger(x) && x >= 0 && x < COLOR_COUNT);
const pOf = (s, id) => s.players.find(p => p.id === id);
const oppOf = (s, id) => s.players.find(p => p.id !== id);
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length !== 2
    || !Array.isArray(s.players[0].guesses) || !Array.isArray(s.players[1].guesses)
    || typeof s.phase !== 'string' || typeof s.turnIdx !== 'number') {
    throw new Error('Trạng thái Mastermind không hợp lệ.');
  }
  return s;
}
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

/* ---------- phản hồi 1 lượt đoán ---------- */
/* black = đúng màu đúng vị trí; white = đúng màu sai vị trí, mỗi chốt
   của mã bí mật chỉ tính tối đa 1 lần. */
export function feedback(secret, guess) {
  let black = 0;
  const sRem = [], gRem = [];
  for (let i = 0; i < CODE_LEN; i++) {
    if (secret[i] === guess[i]) black++;
    else { sRem.push(secret[i]); gRem.push(guess[i]); }
  }
  let white = 0;
  const counts = {};
  for (const c of sRem) counts[c] = (counts[c] || 0) + 1;
  for (const c of gRem) {
    if (counts[c]) { counts[c]--; white++; }
  }
  return { black, white };
}

/* ---------- mọi mã có thể (6^4 = 1296), theo thứ tự từ điển ---------- */
export function allCodes() {
  const out = [];
  for (let a = 0; a < COLOR_COUNT; a++)
    for (let b = 0; b < COLOR_COUNT; b++)
      for (let c = 0; c < COLOR_COUNT; c++)
        for (let d = 0; d < COLOR_COUNT; d++) out.push([a, b, c, d]);
  return out;
}

/* mã ứng cử có khớp với mọi phản hồi đã có không */
export function consistent(code, guesses, feedbacks) {
  for (let i = 0; i < guesses.length; i++) {
    const f = feedback(code, guesses[i]);
    if (f.black !== feedbacks[i].black || f.white !== feedbacks[i].white) return false;
  }
  return true;
}

/* ---------- kiểm tra 1 lượt đoán (dùng cho UI) ---------- */
export function validateGuess(s, pid, guess) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Trận chưa bắt đầu hoặc đã kết thúc.' };
  if (s.players[s.turnIdx].id !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  if (!isCode(guess)) return { ok: false, reason: 'Chọn đủ 4 chốt màu để đoán.' };
  return { ok: true, reason: '' };
}

/* ---------- mọi lượt đoán còn hợp lệ với phản hồi đã có ---------- */
export function legalGuesses(s, pid) {
  const p = pOf(s, pid);
  if (!p || s.phase !== 'playing') return [];
  return allCodes().filter(c => consistent(c, p.guesses, p.feedbacks));
}

function nextTurn(s) {
  s.turnIdx = (s.turnIdx + 1) % s.players.length;
  if (s.phase === 'playing' && s.turnIdx === 0) s.round++;
}

function endMatch(s, reason, winnerId) {
  s.phase = 'ended';
  s.endReason = reason;
  s.endCause = reason;
  s.endedAt = Date.now();
  s.winner = winnerId;
  s.losers = winnerId ? s.players.filter(p => p.id !== winnerId).map(p => p.id) : [];
  const summary = {};
  const scores = [];
  for (const p of s.players) {
    const won = p.id === winnerId;
    const score = won
      ? (MAX_GUESSES + 1 - p.guesses.length) * 10
      : p.bestBlack * 2;
    p.score = score;
    summary[p.id] = {
      guesses: p.guesses.length, won, cracked: p.cracked,
      bestBlack: p.bestBlack, bestWhite: p.bestWhite, turns: p.turns,
    };
    scores.push({ id: p.id, name: p.name, score });
  }
  scores.sort((a, b) => b.score - a.score);
  s.final = { summary, scores };
  if (winnerId) {
    const winner = pOf(s, winnerId);
    pushLog(s, `${winner ? winner.name : 'Ai đó'} đoán ra mã bí mật và thắng trận!`, 'win');
  } else {
    pushLog(s, 'Cả 2 đều hết 10 lượt mà không đoán ra mã — trận hòa!', 'draw');
  }
}

export function createGame(players, opts = {}) {
  if (!players || players.length !== 2) {
    throw new Error('Mastermind chơi đúng 2 người.');
  }
  const seed = typeof opts.seed === 'number' ? opts.seed : (Date.now() % 2147483647);
  const s = {
    gid: 'mm-' + seed.toString(36) + '-' + (seed % 9973).toString(36), seq: 0,
    phase: 'setup', /* 'setup' | 'playing' | 'ended' */
    seed,
    players: players.map((p, i) => ({
      id: p.id, name: p.name || ('Người ' + (i + 1)),
      isBot: !!p.isBot, level: p.level || null, local: !!p.local,
      secret: null, guesses: [], feedbacks: [],
      turns: 0, score: 0, bestBlack: 0, bestWhite: 0, cracked: false,
    })),
    turnIdx: 0, round: 1,
    winner: null, losers: [], endReason: null, endCause: null, final: null,
    startedAt: Date.now(), endedAt: 0, log: [],
  };
  pushLog(s, 'Ván mới: mỗi người đặt 1 mã bí mật 4 chốt (6 màu), rồi luân phiên đoán mã của nhau — ai đoán ra trước thì thắng, tối đa 10 lượt mỗi người.');
  return s;
}

export function applyAction(s, pid, act) {
  if (!s || s.phase === 'ended') return { ok: false, reason: 'Trận đã kết thúc.' };
  const p = pOf(s, pid);
  if (!p) return { ok: false, reason: 'Không tìm thấy người chơi.' };
  if (!act || typeof act.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };

  /* ---------- xin thua: đối thủ thắng ngay ---------- */
  if (act.type === 'resign') {
    const other = oppOf(s, pid);
    endMatch(s, 'resign', other.id);
    s.seq++;
    pushLog(s, `${p.name} xin thua. ${other.name} thắng trận!`, 'resign');
    return { ok: true };
  }

  /* chỉ người tới lượt mới được hành động */
  if (s.players[s.turnIdx].id !== pid) {
    return { ok: false, reason: 'Chưa tới lượt bạn.' };
  }

  /* ---------- đặt mã bí mật (giai đoạn chuẩn bị) ---------- */
  if (act.type === 'setcode') {
    if (s.phase !== 'setup') return { ok: false, reason: 'Đã qua giai đoạn đặt mã.' };
    if (!isCode(act.code)) return { ok: false, reason: 'Mã bí mật phải đủ 4 chốt màu (mỗi chốt 1 trong 6 màu).' };
    if (p.secret) return { ok: false, reason: 'Bạn đã đặt mã rồi.' };
    p.secret = act.code.slice();
    pushLog(s, `${p.name} đã đặt xong mã bí mật.`, 'setup');
    if (s.players.every(x => x.secret)) {
      s.phase = 'playing';
      s.turnIdx = 0;
      pushLog(s, 'Cả 2 đã đặt mã xong — bắt đầu đoán! Người đi trước đoán trước.', 'setup');
    } else {
      nextTurn(s);
    }
    s.seq++;
    return { ok: true };
  }

  /* ---------- đoán 1 lượt ---------- */
  if (act.type === 'guess') {
    const chk = validateGuess(s, pid, act.guess);
    if (!chk.ok) return chk;
    const opp = oppOf(s, pid);
    const fb = feedback(opp.secret, act.guess);
    p.guesses.push(act.guess.slice());
    p.feedbacks.push(fb);
    p.turns++;
    if (fb.black > p.bestBlack || (fb.black === p.bestBlack && fb.white > p.bestWhite)) {
      p.bestBlack = fb.black;
      p.bestWhite = fb.white;
    }
    const guessText = act.guess.map(c => COLORS[c].name).join(' · ');
    pushLog(s, `${p.name} đoán [${guessText}] → ${fb.black} đen, ${fb.white} trắng.`, fb.black === CODE_LEN ? 'win' : 'guess');
    if (fb.black === CODE_LEN) {
      p.cracked = true;
      endMatch(s, 'cracked', pid);
      s.seq++;
      return { ok: true };
    }
    /* cả 2 đều hết 10 lượt: so lượt đoán tốt nhất */
    if (p.guesses.length >= MAX_GUESSES && opp.guesses.length >= MAX_GUESSES) {
      const better = (a, b) => (a.bestBlack - b.bestBlack) || (a.bestWhite - b.bestWhite);
      const d = better(p, opp);
      endMatch(s, d === 0 ? 'draw' : 'outofguesses', d === 0 ? null : (d > 0 ? p.id : opp.id));
      s.seq++;
      return { ok: true };
    }
    nextTurn(s);
    s.seq++;
    return { ok: true };
  }

  return { ok: false, reason: 'Hành động không hợp lệ.' };
}

/* người đang tới lượt (đặt mã ở giai đoạn chuẩn bị, đoán ở giai đoạn chơi) */
export function actors(s) {
  if (!s || s.phase === 'ended') return [];
  return [s.players[s.turnIdx].id];
}

export function viewFor(s, pid) {
  const ended = s.phase === 'ended';
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    round: s.round, turn: s.players[s.turnIdx] ? s.players[s.turnIdx].id : null, turnIdx: s.turnIdx,
    players: s.players.map(p => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
      /* mã bí mật chỉ mình chủ của nó thấy (hoặc cả 2 thấy khi hết ván) */
      secret: (ended || p.id === pid) && p.secret ? p.secret.slice() : null,
      guesses: p.guesses.map(g => g.slice()),
      feedbacks: p.feedbacks.map(f => ({ black: f.black, white: f.white })),
      score: p.score, turns: p.turns, bestBlack: p.bestBlack, bestWhite: p.bestWhite, cracked: p.cracked,
    })),
    winner: s.winner, losers: (s.losers || []).slice(), endReason: s.endReason, endCause: s.endCause,
    final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    log: s.log.slice(), startedAt: s.startedAt, endedAt: s.endedAt,
    me: pid,
  };
}

export default {
  createGame, applyAction, viewFor, actors, feedback, consistent,
  allCodes, legalGuesses, validateGuess, serialize, deserialize, mulberry32,
};
