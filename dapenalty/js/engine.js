// ⚽ Đá Penalty — luật chơi (engine thuần, không phụ thuộc DOM).
//
// ACHIEVEMENTS (đăng ký ở stats.js — parent; điều kiện dựa trên view
// cuối ván v + summary sum):
// - dp-solo-win: thắng chơi đơn (w && v.solo — ghi >= SOLO_WIN_GOALS
//   bàn sau SOLO_SHOTS cú sút).
// - dp-clean5: thắng 1 trận đấu (không phải chơi đơn) mà chỉ để lọt
//   lưới tối đa 1 bàn (w && !v.solo && (sum.conceded || 0) <= 1).
//   (Giữ sạch lưới tuyệt đối 0 bàn gần như không thể vì thủ môn phải
//   cản phá cả 5 cú — đo được 0/80 ván ở bản chỉ tính ô trùng.)
// - dp-comeback: thắng 1 trận đấu sau khi đã từng bị dẫn trước
//   (w && !v.solo && sum.trailed === true).
// - dp-streak5: ghi 5 bàn liên tiếp trong 1 trận
//   (w && !v.solo && (sum.maxStreak || 0) >= 5).
//   (3-4 bàn liên tiếp gần như tự động vì tỉ lệ ghi bàn cao — đo được
//   71% ván thắng có chuỗi ≥ 4; chuỗi 5 mới là thử thách.)
//
// LUẬT (sút luân lưu 3×3):
// - Khung thành chia 3×3 ô: trên/giữa/dưới × trái/giữa/phải. Người sút
//   chọn 1 ô bí mật, thủ môn chọn 1 ô bí mật để đổ người. Cả 2 đã
//   chọn thì lật bài: cùng ô → thủ môn CẢN PHÁ 100%; ô KỀ (chung cạnh)
//   thì thủ môn cản phá được 50% (xổ số xác định theo seed của ván —
//   xem rngNext); ô xa → VÀO.
// - Lựa chọn của đối thủ KHÔNG bao giờ lộ trước khi cả 2 đã chọn
//   (viewFor chỉ cho mỗi người thấy lựa chọn của chính mình + biết
//   đối thủ đã chọn hay chưa).
// - Đấu (2 người): đá luân phiên sút/bắt, 5 vòng mỗi người (10 cú).
//   Hết 5 vòng ai nhiều bàn hơn thì thắng; nếu có thể kết thúc sớm
//   (đối thủ không còn đủ cú sút để gỡ) thì kết thúc ngay. Hoà 5-5
//   thì vào luân lưu: mỗi vòng 1 cú/người, ai dẫn trước sau 1 vòng
//   thì thắng; quá MAX_SUDDEN vòng vẫn hoà thì hoà.
// - Chơi đơn (luyện tập): người chơi sút 10 cú liên tiếp trước thủ môn
//   máy; ghi >= SOLO_WIN_GOALS bàn thì thắng, ít hơn thì thua.
// - Không có giới hạn giờ (chọn theo lượt, không đồng hồ).
// - Engine xác định: cùng 1 dãy action thì kết quả luôn giống nhau
//   (không dùng Math.random trong engine — chỉ bot dùng, ngoài engine).
export const ZONES = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'];
export const ZONE_NAMES = {
  tl: 'Trên trái', tc: 'Trên giữa', tr: 'Trên phải',
  ml: 'Giữa trái', mc: 'Giữa', mr: 'Giữa phải',
  bl: 'Dưới trái', bc: 'Dưới giữa', br: 'Dưới phải',
};
export function zoneName(z) { return ZONE_NAMES[z] || z; }
/* tọa độ hàng/cột của mỗi ô (dùng tính ô kề) */
export const ZONE_RC = {
  tl: [0, 0], tc: [0, 1], tr: [0, 2],
  ml: [1, 0], mc: [1, 1], mr: [1, 2],
  bl: [2, 0], bc: [2, 1], br: [2, 2],
};
/* 2 ô kề nhau nếu chung 1 cạnh (khoảng cách Manhattan = 1) */
export function isAdjacent(a, b) {
  const ra = ZONE_RC[a], rb = ZONE_RC[b];
  if (!ra || !rb) return false;
  return Math.abs(ra[0] - rb[0]) + Math.abs(ra[1] - rb[1]) === 1;
}
export const ADJACENT_SAVE_P = 0.5; /* đổ vào ô kề thì cản phá được 50% */
export const ROUNDS = 5; /* 5 vòng sút mỗi người ở đấu thường */
export const SOLO_SHOTS = 10; /* chơi đơn: 10 cú sút */
export const SOLO_WIN_GOALS = 7; /* chơi đơn: >= 7 bàn thì thắng */
export const MAX_SUDDEN = 10; /* tối đa 10 vòng luân lưu, quá thì hoà */

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
/* Xổ số xác định của ván: 1 bước mulberry32, trạng thái lưu trong s
   (số nguyên) nên serialize/deserialize giữ nguyên được — cùng 1 dãy
   action thì cùng kết quả (đồng bộ online + test). */
function rngNext(s) {
  let a = (s.rngState |= 0);
  a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  s.rngState = a;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
let gidSeq = 0;
const pOf = (s, id) => s.players.find(p => p.id === id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

/* cặp sút/bắt của cú sút tiếp theo (chỉ số cú sút = prog.kick) */
function currentPair(s) {
  if (s.solo) return { shooter: s.players[0].id, keeper: s.players[1] ? s.players[1].id : null };
  const k = s.prog.kick;
  return { shooter: s.players[k % 2].id, keeper: s.players[(k + 1) % 2].id };
}
/* số cú sút còn lại của người chơi ở vị trí idx (0/1) từ cú kick trở đi */
function remainingKicks(kick, idx) {
  let n = 0;
  for (let k = kick; k < ROUNDS * 2; k++) if (k % 2 === idx) n++;
  return n;
}

export function createGame(players, opts = {}) {
  const mode = opts.dpMode === 'solo' ? 'solo' : 'match';
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  const s = {
    gid: 'g' + (++gidSeq) + '-' + Math.random().toString(36).slice(2, 7),
    seq: 0, seed, rng: seed, rngState: seed,
    phase: 'playing', mode, solo: mode === 'solo', race: mode === 'match',
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null })),
    prog: {
      kick: 0, round: 1, sudden: false, suddenRound: 0,
      shooter: players[0].id,
      keeper: players[1] ? players[1].id : null,
      picks: {},
      kicks: [],
      lastKick: null,
      scores: {}, saves: {}, shots: {}, streak: {}, maxStreak: {}, trailed: {},
    },
    winner: null, winnerIds: [], losers: [], endReason: null, final: null,
    startedAt: Date.now(), endedAt: null, log: [],
  };
  for (const p of players) {
    s.prog.scores[p.id] = 0;
    s.prog.saves[p.id] = 0;
    s.prog.shots[p.id] = 0;
    s.prog.streak[p.id] = 0;
    s.prog.maxStreak[p.id] = 0;
    s.prog.trailed[p.id] = false;
  }
  return s;
}

/* ai đang phải chọn: người sút + thủ môn của cú hiện tại, trừ ai đã chọn */
export function actors(s) {
  if (!s || s.phase !== 'playing') return [];
  const p = s.prog;
  const out = [];
  if (p.shooter && p.picks[p.shooter] === undefined) out.push(p.shooter);
  if (p.keeper && p.picks[p.keeper] === undefined) out.push(p.keeper);
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
    const other = s.players.find(q => q.id !== pl.id);
    s.final.summary[pl.id] = {
      goals: p.scores[pl.id] || 0,
      saves: p.saves[pl.id] || 0,
      conceded: s.solo ? 0 : (other ? (p.scores[other.id] || 0) : 0),
      shots: p.shots[pl.id] || 0,
      maxStreak: p.maxStreak[pl.id] || 0,
      trailed: !!p.trailed[pl.id],
      timeMs: s.endedAt - s.startedAt,
    };
  }
}

function checkEnd(s) {
  const p = s.prog;
  if (s.solo) {
    if (p.kick >= SOLO_SHOTS) {
      const me = s.players[0].id;
      const goals = p.scores[me] || 0;
      if (goals >= SOLO_WIN_GOALS) endGame(s, me, s.players.slice(1).map(q => q.id), 'win');
      else endGame(s, null, [me], 'win');
    }
    return;
  }
  const [a, b] = s.players;
  const sa = p.scores[a.id] || 0, sb = p.scores[b.id] || 0;
  if (!p.sudden) {
    /* kết thúc sớm: đối thủ không còn đủ cú sút để gỡ */
    const remA = remainingKicks(p.kick, 0);
    const remB = remainingKicks(p.kick, 1);
    if (sa > sb + remB) { endGame(s, a.id, [b.id], 'win'); return; }
    if (sb > sa + remA) { endGame(s, b.id, [a.id], 'win'); return; }
    if (p.kick >= ROUNDS * 2) {
      if (sa !== sb) { endGame(s, sa > sb ? a.id : b.id, [sa > sb ? b.id : a.id], 'win'); return; }
      p.sudden = true;
      p.suddenRound = 1;
      p.round = ROUNDS + 1;
      pushLog(s, '🤝 Hoà 5-5 — vào loạt luân lưu!', '');
    }
    return;
  }
  /* luân lưu: kiểm tra sau mỗi vòng (2 cú, 1 cú/người) */
  if (p.kick % 2 === 0) {
    if (sa !== sb) { endGame(s, sa > sb ? a.id : b.id, [sa > sb ? b.id : a.id], 'win'); return; }
    if (p.kick >= ROUNDS * 2 + 2 * MAX_SUDDEN) endGame(s, null, [a.id, b.id], 'draw');
  }
}

/* cả 2 đã chọn → lật bài, tính bàn/cản phá, chuyển sang cú tiếp theo */
function resolveKick(s) {
  const p = s.prog;
  const shooter = p.shooter, keeper = p.keeper;
  const shootZone = p.picks[shooter];
  const keepZone = p.picks[keeper];
  /* cùng ô → cản phá chắc chắn; ô kề → 50% cản phá (xổ số xác định
     theo seed ván); ô xa → vào */
  const exact = shootZone === keepZone;
  const adjacent = !exact && isAdjacent(shootZone, keepZone);
  const saved = exact || (adjacent && rngNext(s) < ADJACENT_SAVE_P);
  const goal = !saved;
  const kick = {
    id: p.kick + 1, round: p.round, sudden: p.sudden,
    shooter, keeper, shootZone, keepZone, goal, adjacent: adjacent && saved,
  };
  p.kicks.push(kick);
  p.lastKick = { ...kick };
  p.shots[shooter]++;
  if (goal) {
    p.scores[shooter]++;
    p.streak[shooter]++;
    if (p.streak[shooter] > p.maxStreak[shooter]) p.maxStreak[shooter] = p.streak[shooter];
    pushLog(s, `⚽ ${pOf(s, shooter).name} ghi bàn (${zoneName(shootZone)})!`, '');
  } else if (adjacent) {
    p.saves[keeper]++;
    p.streak[shooter] = 0;
    pushLog(s, `🧤 ${pOf(s, keeper).name} với tay cản phá ở ô kề (${zoneName(shootZone)})!`, 'bad');
  } else {
    p.saves[keeper]++;
    p.streak[shooter] = 0;
    pushLog(s, `🧤 ${pOf(s, keeper).name} cản phá cú sút ${zoneName(shootZone)}!`, 'bad');
  }
  /* ai đang bị dẫn thì đánh dấu "đã từng bị dẫn" (cho dp-comeback) */
  if (!s.solo) {
    for (const pl of s.players) {
      const other = s.players.find(q => q.id !== pl.id);
      if ((p.scores[pl.id] || 0) < (p.scores[other.id] || 0)) p.trailed[pl.id] = true;
    }
  }
  p.kick++;
  p.picks = {};
  const pair = currentPair(s);
  p.shooter = pair.shooter;
  p.keeper = pair.keeper;
  if (s.solo) {
    p.round = Math.min(p.kick + 1, SOLO_SHOTS);
  } else if (p.kick < ROUNDS * 2) {
    p.round = Math.floor(p.kick / 2) + 1;
  } else {
    /* hết 5 vòng: checkEnd sẽ bật sudden nếu hoà; hiển thị vòng luân lưu */
    p.suddenRound = Math.floor((p.kick - ROUNDS * 2) / 2) + 1;
    p.round = ROUNDS + p.suddenRound;
  }
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
    if (!ZONES.includes(a.zone)) return { ok: false, reason: 'Vùng sút không hợp lệ.' };
    if (pid !== prog.shooter && pid !== prog.keeper) return { ok: false, reason: 'Chưa tới lượt chọn của bạn.' };
    if (prog.picks[pid] !== undefined) return { ok: false, reason: 'Bạn đã chọn rồi.' };
    prog.picks[pid] = a.zone;
    s.seq++;
    if (prog.picks[prog.shooter] !== undefined && prog.picks[prog.keeper] !== undefined) resolveKick(s);
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
    round: p.round, sudden: p.sudden, suddenRound: p.suddenRound,
    kick: p.kick,
    shooter: p.shooter, keeper: p.keeper,
    /* lựa chọn: chỉ mình thấy lựa chọn của mình; chỉ biết đối thủ đã
       chọn hay chưa — không bao giờ lộ vùng của đối thủ khi chưa lật */
    myPick: p.picks[pid] !== undefined ? p.picks[pid] : null,
    oppPicked: other ? p.picks[other.id] !== undefined : false,
    lastKick: p.lastKick ? { ...p.lastKick } : null,
    kicks: p.kicks.map(k => ({ ...k })),
    scores: { ...p.scores }, saves: { ...p.saves }, shots: { ...p.shots },
    streak: { ...p.streak }, maxStreak: { ...p.maxStreak },
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
