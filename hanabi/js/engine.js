// 🎆 Hanabi – luật chơi (thuần logic, không chạm DOM).
// 2–5 người, hợp tác: cả đội cùng thắng hoặc cùng thua. Bộ 50 lá: 5 màu
// (đỏ, vàng, xanh lá, xanh dương, trắng) × (1×3, 2×2, 3×2, 4×2, 5×1).
// Mỗi người thấy bài của mọi người KHÁC, không thấy bài của chính mình —
// chỉ biết những gì đã được gợi ý (marks: số / màu đã biết của từng lá).
// 8 token gợi ý, 3 ngòi nổ. Mỗi lượt làm 1 trong 3 việc: (a) gợi ý cho
// người khác 1 số hoặc 1 màu (tốn 1 token, phải chỉ ra ít nhất 1 lá);
// (b) bỏ 1 lá (hồi 1 token, tối đa 8 — đang đủ 8 thì không được bỏ);
// (c) đánh 1 lá: đúng số tiếp theo của chồng màu đó thì lên chồng (đánh
// lá 5 thì hồi 1 token), sai thì lá vào đống bỏ + mất 1 ngòi nổ (hết 3
// ngòi thì thua ngay). Đánh/bỏ xong thì rút 1 lá (nếu còn bài). Hết bài
// thì mỗi người còn đúng 1 lượt nữa (kể cả người vừa rút lá cuối). Điểm
// = tổng 5 chồng (tối đa 25); đủ 25 thì kết thúc ngay; ≥20 điểm là cả
// đội thắng. Mọi quyết định ngẫu nhiên đều dùng LCG lưu trong state để
// mọi máy cùng áp 1 hành động thì giống hệt nhau.

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 5;
export const WIN_SCORE = 20;
export const MAX_SCORE = 25;
export const START_CLUES = 8;
export const START_FUSES = 3;
export const SUITS = ['r', 'y', 'g', 'b', 'w'];
export const SUIT_NAMES = { r: 'Đỏ', y: 'Vàng', g: 'Xanh lá', b: 'Xanh dương', w: 'Trắng' };
export const SUIT_EMOJI = { r: '🔴', y: '🟡', g: '🟢', b: '🔵', w: '⚪' };
export const RANK_COPIES = { 1: 3, 2: 2, 3: 2, 4: 2, 5: 1 };

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* LCG lưu trong state: mọi lần xào / chọn ngẫu nhiên đều qua đây */
function nextRand(s) {
  s.seed = (s.seed * 1103515245 + 12345) % 2147483648;
  return s.seed / 2147483648;
}
const pOf = (s, id) => s.players.find(p => p.id === id);
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < MIN_PLAYERS || s.players.length > MAX_PLAYERS
    || typeof s.phase !== 'string' || typeof s.turnIdx !== 'number'
    || !s.stacks || typeof s.clues !== 'number' || typeof s.fuses !== 'number'
    || !Array.isArray(s.deck) || !Array.isArray(s.discardPile)) {
    throw new Error('Trạng thái Hanabi không hợp lệ.');
  }
  return s;
}
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

export const suitOf = c => typeof c === 'string' ? c[0] : null;
export const rankOf = c => typeof c === 'string' ? +c[1] : null;
export const cardId = (suit, rank, copy) => `${suit}${rank}-${copy}`;
const freshMarks = () => ({ rank: null, suit: null });
export const scoreOf = s => SUITS.reduce((t, su) => t + s.stacks[su], 0);
const handSizeFor = n => (n <= 3 ? 5 : 4);

function buildDeck() {
  const deck = [];
  for (const su of SUITS) {
    for (let r = 1; r <= 5; r++) {
      for (let k = 1; k <= RANK_COPIES[r]; k++) deck.push(cardId(su, r, k));
    }
  }
  return deck;
}

function endGame(s, reason, cause) {
  s.phase = 'ended';
  s.endReason = reason;
  s.endCause = cause;
  s.endedAt = Date.now();
  s.score = scoreOf(s);
  /* hợp tác: cả đội cùng thắng (≥20) hoặc cùng thua */
  s.teamWin = reason !== 'resign' && s.score >= WIN_SCORE;
  s.winners = s.teamWin ? s.players.map(p => p.id) : [];
  s.losers = s.teamWin ? [] : s.players.map(p => p.id);
  s.winner = s.winners[0] || null;
  if (s.teamWin) pushLog(s, `🎆 Cả đội thắng với ${s.score}/25 điểm!`, 'win');
  else if (cause === 'fuses') pushLog(s, `💥 Hết ngòi nổ — cả đội thua với ${s.score}/25 điểm.`, 'info');
  else pushLog(s, `🏁 Hết bài — cả đội được ${s.score}/25 điểm${s.teamWin ? ', thắng!' : ', chưa đủ 20 để thắng.'}`, s.teamWin ? 'win' : 'info');
}

/* rút 1 lá cho p (nếu còn bài); rút lá cuối thì mở vòng cuối: mỗi người
   còn đúng 1 lượt nữa, kể cả người vừa rút (nên đếm n+1 lượt vì lượt
   hiện tại cũng sẽ trừ 1 khi advanceTurn) */
function drawCard(s, p) {
  if (!s.deck.length) return null;
  const card = s.deck.pop();
  p.hand.push(card);
  p.marks.push(freshMarks());
  if (!s.deck.length && !s.finalRound) {
    s.finalRound = true;
    s.finalTurnsLeft = s.players.length + 1;
    pushLog(s, '🃏 Bài đã hết — mỗi người còn đúng 1 lượt nữa!', 'info');
  }
  return card;
}

/* hết lượt: xoay ghế; vòng cuối thì trừ lượt còn lại, hết thì kết thúc */
function advanceTurn(s) {
  if (s.phase !== 'playing') return;
  if (s.finalRound) {
    s.finalTurnsLeft--;
    if (s.finalTurnsLeft <= 0) { endGame(s, 'match', 'deck'); return; }
  }
  s.turnIdx = (s.turnIdx + 1) % s.players.length;
  s.turnCount++;
}

export function createGame(players, opts = {}) {
  if (!players || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error('Hanabi chơi 2–5 người.');
  }
  const seed = typeof opts.seed === 'number' ? opts.seed : (Date.now() % 2147483647);
  const n = players.length;
  const handSize = handSizeFor(n);
  const deck = buildDeck();
  /* xào bằng LCG trong state */
  const tmp = { seed };
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand(tmp) * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const s = {
    gid: 'g' + seed.toString(36) + '-' + (seed % 9973).toString(36), seq: 0,
    phase: 'playing', /* 'playing' | 'ended' */
    seed,
    players: players.map((p, i) => ({
      id: p.id, name: p.name || ('Người ' + (i + 1)),
      isBot: !!p.isBot, level: p.level || null, local: !!p.local,
      hand: [], marks: [],
    })),
    deck, discardPile: [],
    stacks: { r: 0, y: 0, g: 0, b: 0, w: 0 },
    clues: START_CLUES, fuses: START_FUSES,
    turnIdx: 0, turnCount: 1,
    finalRound: false, finalTurnsLeft: 0,
    score: 0, teamWin: false, winner: null, winners: [], losers: [],
    endReason: null, endCause: null,
    startedAt: Date.now(), endedAt: 0, log: [],
  };
  /* chia bài vòng tròn: mỗi người handSize lá */
  for (let k = 0; k < handSize; k++) {
    for (const p of s.players) drawCard(s, p);
  }
  pushLog(s, `🎆 Hanabi bắt đầu: ${n} người, mỗi người ${handSize} lá. Cả đội cùng thắng khi ≥${WIN_SCORE}/25 điểm!`);
  return s;
}

export function applyAction(s, pid, act) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Trận đã kết thúc.' };
  const p = pOf(s, pid);
  if (!p) return { ok: false, reason: 'Không tìm thấy người chơi.' };
  if (!act || typeof act.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };

  /* ---------- xin thua: kết thúc trận luôn, cả đội thua ---------- */
  if (act.type === 'resign') {
    endGame(s, 'resign', 'resign');
    s.seq++;
    pushLog(s, `${p.name} xin thua. Cả đội dừng lại ở ${s.score}/25 điểm.`, 'resign');
    return { ok: true };
  }

  /* chỉ người tới lượt mới được đi */
  if (s.players[s.turnIdx].id !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };

  /* ---------- GỢI Ý: tốn 1 token, phải chỉ ra ít nhất 1 lá ---------- */
  if (act.type === 'clue') {
    if (s.clues <= 0) return { ok: false, reason: 'Hết token gợi ý rồi — bỏ 1 lá để hồi token.' };
    const target = pOf(s, act.target);
    if (!target) return { ok: false, reason: 'Không có người chơi này.' };
    if (target.id === pid) return { ok: false, reason: 'Không được gợi ý cho chính mình.' };
    if (act.kind !== 'rank' && act.kind !== 'suit') return { ok: false, reason: 'Gợi ý phải là số hoặc màu.' };
    const value = act.kind === 'rank' ? +act.value : String(act.value);
    if (act.kind === 'rank' && !(value >= 1 && value <= 5)) return { ok: false, reason: 'Số gợi ý phải từ 1 tới 5.' };
    if (act.kind === 'suit' && !SUITS.includes(value)) return { ok: false, reason: 'Màu gợi ý không hợp lệ.' };
    let matched = 0;
    target.hand.forEach((card, i) => {
      const hit = act.kind === 'rank' ? rankOf(card) === value : suitOf(card) === value;
      if (hit) {
        matched++;
        if (act.kind === 'rank') target.marks[i].rank = value;
        else target.marks[i].suit = value;
      }
    });
    if (!matched) return { ok: false, reason: 'Gợi ý phải chỉ ra ít nhất 1 lá trên tay người đó.' };
    s.clues--;
    s.seq++;
    pushLog(s, `${p.name} gợi ý cho ${target.name}: ${act.kind === 'rank' ? `số ${value}` : `màu ${SUIT_NAMES[value]}`} (${matched} lá) · còn 💡 ${s.clues}/8.`);
    advanceTurn(s);
    return { ok: true };
  }

  /* ---------- BỎ 1 lá: hồi 1 token, rồi rút ---------- */
  if (act.type === 'discard') {
    if (s.clues >= START_CLUES) return { ok: false, reason: 'Đang đủ 8 token gợi ý rồi — không được bỏ lá để hồi thêm.' };
    const idx = act.index;
    if (!Number.isInteger(idx) || idx < 0 || idx >= p.hand.length) return { ok: false, reason: 'Không có lá này trên tay bạn.' };
    const card = p.hand.splice(idx, 1)[0];
    p.marks.splice(idx, 1);
    s.discardPile.push(card);
    s.clues = Math.min(START_CLUES, s.clues + 1);
    s.seq++;
    pushLog(s, `${p.name} bỏ lá ${SUIT_EMOJI[suitOf(card)]} ${SUIT_NAMES[suitOf(card)]} ${rankOf(card)} · hồi 1 token (💡 ${s.clues}/8).`);
    drawCard(s, p);
    advanceTurn(s);
    return { ok: true };
  }

  /* ---------- ĐÁNH 1 lá ---------- */
  if (act.type === 'play') {
    const idx = act.index;
    if (!Number.isInteger(idx) || idx < 0 || idx >= p.hand.length) return { ok: false, reason: 'Không có lá này trên tay bạn.' };
    const card = p.hand.splice(idx, 1)[0];
    p.marks.splice(idx, 1);
    const su = suitOf(card), r = rankOf(card);
    s.seq++;
    if (r === s.stacks[su] + 1) {
      s.stacks[su] = r;
      pushLog(s, `${p.name} đánh ${SUIT_EMOJI[su]} ${SUIT_NAMES[su]} ${r} — lên chồng! (${scoreOf(s)}/25)`, 'win');
      if (r === 5) {
        s.clues = Math.min(START_CLUES, s.clues + 1);
        pushLog(s, `🎉 Hoàn thành chồng ${SUIT_NAMES[su]} — hồi 1 token gợi ý (💡 ${s.clues}/8)!`, 'win');
      }
      drawCard(s, p);
      if (scoreOf(s) >= MAX_SCORE) { endGame(s, 'match', 'perfect'); return { ok: true }; }
      advanceTurn(s);
      return { ok: true };
    }
    /* đánh sai: lá vào đống bỏ + mất 1 ngòi nổ */
    s.discardPile.push(card);
    s.fuses--;
    pushLog(s, `${p.name} đánh ${SUIT_EMOJI[su]} ${SUIT_NAMES[su]} ${r} — SAI! Cần ${SUIT_NAMES[su]} ${s.stacks[su] + 1}. Mất 1 ngòi nổ (🧨 còn ${s.fuses}/3).`, 'info');
    if (s.fuses <= 0) { endGame(s, 'match', 'fuses'); return { ok: true }; }
    drawCard(s, p);
    advanceTurn(s);
    return { ok: true };
  }

  return { ok: false, reason: 'Hành động không hợp lệ.' };
}

/* người đang tới lượt (chỉ 1 người đi mỗi lượt) */
export function actors(s) {
  if (!s || s.phase !== 'playing') return [];
  return [s.players[s.turnIdx].id];
}

/* tất cả nước đi hợp lệ của người chơi (UI và bot đều chỉ dùng danh sách này) */
export function legalMoves(s, pid) {
  if (!s || s.phase !== 'playing') return [];
  const p = pOf(s, pid);
  if (!p) return [];
  if (s.players[s.turnIdx].id !== pid) return [];
  const out = [];
  if (s.clues > 0) {
    for (const q of s.players) {
      if (q.id === pid) continue;
      const ranks = [...new Set(q.hand.map(rankOf))];
      const suits = [...new Set(q.hand.map(suitOf))];
      for (const r of ranks) out.push({ type: 'clue', target: q.id, kind: 'rank', value: r });
      for (const su of suits) out.push({ type: 'clue', target: q.id, kind: 'suit', value: su });
    }
  }
  for (let i = 0; i < p.hand.length; i++) {
    out.push({ type: 'play', index: i });
    if (s.clues < START_CLUES) out.push({ type: 'discard', index: i });
  }
  return out;
}

export function viewFor(s, pid) {
  const ended = s.phase === 'ended';
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    turn: s.players[s.turnIdx] ? s.players[s.turnIdx].id : null,
    turnCount: s.turnCount,
    stacks: { ...s.stacks }, score: scoreOf(s),
    clues: s.clues, fuses: s.fuses,
    deckCount: s.deck.length,
    discardPile: s.discardPile.slice(),
    discardCount: s.discardPile.length,
    finalRound: s.finalRound, finalTurnsLeft: s.finalTurnsLeft,
    players: s.players.map(p => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
      handCount: p.hand.length,
      /* bài của mình thì chỉ thấy mặt úp + những gì đã được gợi ý;
         bài người khác thì thấy hết (kể cả gợi ý họ đã nhận — công khai);
         trận kết thúc thì lộ hết */
      hand: p.hand.map((card, i) => {
        const m = p.marks[i] || freshMarks();
        const revealed = ended || p.id !== pid;
        return revealed
          ? { id: card, back: false, rank: m.rank, suit: m.suit }
          : { id: null, back: true, rank: m.rank, suit: m.suit };
      }),
    })),
    winner: s.winner, winners: (s.winners || []).slice(), losers: (s.losers || []).slice(),
    teamWin: s.teamWin, endReason: s.endReason, endCause: s.endCause,
    log: s.log.slice(), startedAt: s.startedAt, endedAt: s.endedAt,
    me: pid,
  };
}
