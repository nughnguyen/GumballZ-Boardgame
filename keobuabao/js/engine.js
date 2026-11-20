// ✌️ Kéo Búa Bao — luật chơi (engine thuần, không phụ thuộc DOM).
//
// ACHIEVEMENTS (đăng ký ở stats.js — parent; điều kiện dựa trên view
// cuối ván v + summary sum):
// - kbb-solo-win: thắng chơi đơn (w && v.solo — thắng best-of-5 trước máy).
// - kbb-match-win: thắng 1 trận đấu (w && !v.solo).
// - kbb-comeback: thắng 1 trận đấu sau khi đã từng bị dẫn 0–2 ở số
//   vòng thắng (w && !v.solo && sum.trailed02 === true).
//   (Bị dẫn 0–1 rồi lội lại quá thường — đo được ~45% ván thắng; chỉ
//   tính 0–2 mới là lội ngược dòng thật.)
// - kbb-streak3: thắng 1 trận đấu với chuỗi thắng 3 vòng liên tiếp
//   (w && !v.solo && (sum.maxStreak || 0) >= 3).
//   (Chuỗi 3 vòng = thắng trắng 3–0, chỉ có ở ván thắng áp đảo.)
// (Tỉ lệ đo được xem test/sim.mjs — đã hiệu chuẩn.)
//
// LUẬT (oẳn tù tì 2 người, giấu lựa chọn tới khi cả 2 đã chọn):
// - Mỗi vòng, cả 2 cùng chọn 1 trong 3: Kéo ✌️ / Búa ✊ / Bao ✋, giữ
//   bí mật. Cả 2 đã chọn thì lật bài cùng lúc: Kéo thắng Bao, Bao
//   thắng Búa, Búa thắng Kéo. Cùng lựa chọn = hoà vòng đó, đá lại
//   vòng (không tính điểm).
// - Lựa chọn của đối thủ KHÔNG bao giờ lộ trước khi cả 2 đã chọn
//   (viewFor chỉ cho mỗi người thấy lựa chọn của chính mình + biết
//   đối thủ đã chọn hay chưa).
// - Đấu (2 người): best-of-5 — ai thắng 3 vòng trước thì thắng trận.
//   Hoà vòng không tính, không có giới hạn giờ, không có hoà trận
//   (vòng hoà đá lại tới khi có người thắng vòng).
// - Chơi đơn (luyện tập): người chơi đấu best-of-5 với máy, luật y hệt.
// - Engine xác định: cùng 1 dãy action thì kết quả luôn giống nhau
//   (không dùng Math.random trong engine — chỉ bot dùng, ngoài engine).
export const CHOICES = ['keo', 'bua', 'bao'];
export const CHOICE_NAMES = { keo: 'Kéo', bua: 'Búa', bao: 'Bao' };
export const CHOICE_ICONS = { keo: '✌️', bua: '✊', bao: '✋' };
export function choiceName(c) { return CHOICE_NAMES[c] || c; }
export function choiceIcon(c) { return CHOICE_ICONS[c] || '❓'; }
/* beats(a, b): a thắng b? Kéo > Bao, Bao > Búa, Búa > Kéo. */
const BEATS = { keo: 'bao', bao: 'bua', bua: 'keo' };
export function beats(a, b) {
  if (!CHOICES.includes(a) || !CHOICES.includes(b)) return false;
  return BEATS[a] === b;
}
export const ROUNDS_TO_WIN = 3; /* best-of-5: thắng 3 vòng thì thắng trận */

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* gid phải DUY NHẤT cho mỗi lần tạo ván (bài học từ Nhện: gid chỉ từ
   Math.random sẽ trùng khi test seed Math.random, làm bộ nhớ bot theo
   gid rò rỉ giữa các ván). */
let gidSeq = 0;
const pOf = (s, id) => s.players.find(p => p.id === id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

export function createGame(players, opts = {}) {
  const mode = opts.kbbMode === 'solo' ? 'solo' : 'match';
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  const s = {
    gid: 'g' + (++gidSeq) + '-' + Math.random().toString(36).slice(2, 7),
    seq: 0, seed, rng: seed, rngState: seed,
    phase: 'playing', mode, solo: mode === 'solo', race: mode === 'match',
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null })),
    prog: {
      round: 1,
      picks: {},
      rounds: [],
      lastRound: null,
      roundWins: {}, ties: 0,
      streak: {}, maxStreak: {}, trailed: {}, trailed02: {},
    },
    winner: null, winnerIds: [], losers: [], endReason: null, final: null,
    startedAt: Date.now(), endedAt: null, log: [],
  };
  for (const p of players) {
    s.prog.roundWins[p.id] = 0;
    s.prog.streak[p.id] = 0;
    s.prog.maxStreak[p.id] = 0;
    s.prog.trailed[p.id] = false;
    s.prog.trailed02[p.id] = false;
  }
  return s;
}

/* ai đang phải chọn: cả 2 người chơi chưa chọn ở vòng hiện tại */
export function actors(s) {
  if (!s || s.phase !== 'playing') return [];
  const p = s.prog;
  const out = [];
  for (const pl of s.players) if (p.picks[pl.id] === undefined) out.push(pl.id);
  return out;
}

function endGame(s, winner, losers, reason) {
  const p = s.prog;
  s.phase = 'ended';
  s.winner = winner;
  s.winnerIds = winner ? [winner] : [];
  s.losers = losers || [];
  s.endReason = reason;
  s.endedAt = Date.now();
  s.final = { summary: {} };
  for (const pl of s.players) {
    s.final.summary[pl.id] = {
      roundWins: p.roundWins[pl.id] || 0,
      rounds: p.rounds.length,
      ties: p.ties || 0,
      maxStreak: p.maxStreak[pl.id] || 0,
      trailed02: !!p.trailed02[pl.id],
      timeMs: s.endedAt - s.startedAt,
    };
  }
}

function checkEnd(s) {
  const p = s.prog;
  for (const pl of s.players) {
    if ((p.roundWins[pl.id] || 0) >= ROUNDS_TO_WIN) {
      const other = s.players.find(q => q.id !== pl.id);
      endGame(s, pl.id, other ? [other.id] : [], 'win');
      return;
    }
  }
}

/* cả 2 đã chọn → lật bài, tính thắng vòng, chuyển sang vòng tiếp theo */
function resolveRound(s) {
  const p = s.prog;
  const [a, b] = s.players;
  const ca = p.picks[a.id];
  const cb = p.picks[b.id];
  const tie = ca === cb;
  const winner = tie ? null : (beats(ca, cb) ? a.id : b.id);
  const round = {
    id: p.rounds.length + 1, round: p.round,
    picks: { [a.id]: ca, [b.id]: cb },
    winner, tie,
  };
  p.rounds.push(round);
  p.lastRound = { ...round };
  if (tie) {
    p.ties++;
    pushLog(s, `🤝 Vòng ${p.round}: cả 2 cùng ra ${choiceIcon(ca)} ${choiceName(ca)} — hoà, đá lại!`, '');
  } else {
    const w = pOf(s, winner);
    const l = winner === a.id ? b : a;
    p.roundWins[winner]++;
    p.streak[winner]++;
    if (p.streak[winner] > p.maxStreak[winner]) p.maxStreak[winner] = p.streak[winner];
    p.streak[l.id] = 0;
    pushLog(s, `🏆 Vòng ${p.round}: ${choiceIcon(ca)} ${choiceName(ca)} vs ${choiceIcon(cb)} ${choiceName(cb)} — ${w.name} thắng vòng!`, '');
    /* ai đang bị dẫn 0–2 thì đánh dấu "đã từng bị dẫn 0–2" (cho kbb-comeback) */
    for (const pl of s.players) {
      const other = s.players.find(q => q.id !== pl.id);
      if ((p.roundWins[pl.id] || 0) < (p.roundWins[other.id] || 0)) p.trailed[pl.id] = true;
      if ((p.roundWins[pl.id] || 0) === 0 && (p.roundWins[other.id] || 0) >= 2) p.trailed02[pl.id] = true;
    }
  }
  p.picks = {};
  p.round++;
  checkEnd(s);
}

export function applyAction(s, pid, a, ctx) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  const prog = s.prog;
  if (a.type === 'resign') {
    if (s.solo) endGame(s, null, [pid], 'resign');
    else {
      const other = s.players.find(p => p.id !== pid);
      endGame(s, other ? other.id : null, [pid], 'resign');
    }
    s.seq++;
    return { ok: true };
  }
  if (a.type === 'pick') {
    if (!CHOICES.includes(a.choice)) return { ok: false, reason: 'Lựa chọn không hợp lệ.' };
    if (!s.players.some(p => p.id === pid)) return { ok: false, reason: 'Chưa tới lượt chọn của bạn.' };
    if (prog.picks[pid] !== undefined) return { ok: false, reason: 'Bạn đã chọn rồi.' };
    prog.picks[pid] = a.choice;
    s.seq++;
    if (prog.picks[s.players[0].id] !== undefined && prog.picks[s.players[1].id] !== undefined) resolveRound(s);
    return { ok: true };
  }
  return { ok: false, reason: 'Hành động không hợp lệ.' };
}

export function viewFor(s, pid) {
  const p = s.prog;
  const other = s.players.find(q => q.id !== pid);
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    startedAt: s.startedAt, endedAt: s.endedAt,
    winner: s.winner, winnerIds: (s.winnerIds || []).slice(), losers: (s.losers || []).slice(),
    endReason: s.endReason, final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    mode: s.mode, solo: s.solo, race: s.race,
    round: p.round,
    /* lựa chọn: chỉ mình thấy lựa chọn của mình; chỉ biết đối thủ đã
       chọn hay chưa — không bao giờ lộ lựa chọn của đối thủ khi chưa lật */
    myPick: p.picks[pid] !== undefined ? p.picks[pid] : null,
    oppPicked: other ? p.picks[other.id] !== undefined : false,
    lastRound: p.lastRound ? JSON.parse(JSON.stringify(p.lastRound)) : null,
    rounds: p.rounds.map(r => JSON.parse(JSON.stringify(r))),
    roundWins: { ...p.roundWins }, ties: p.ties,
    players: s.players.map(pl => ({ id: pl.id, name: pl.name, isBot: !!pl.isBot, botLevel: pl.level || null })),
    log: s.log.slice(-20),
    me: pid,
  };
}

export function serialize(s) {
  return JSON.parse(JSON.stringify(s));
}
export function deserialize(d) {
  return JSON.parse(JSON.stringify(d));
}
export default { createGame, applyAction, actors, viewFor, serialize, deserialize };
