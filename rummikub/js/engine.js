// 🀄 Rummikub – luật chơi (thuần logic, không chạm DOM).
// 2–4 người, 106 lá: 2 bộ 1–13 × 4 màu (R đỏ, B xanh dương, O cam,
// K đen) + 2 joker. Mỗi người 14 lá. Bộ hợp lệ: dãy (cùng màu, số liên
// tiếp, ≥3 lá) hoặc nhóm (cùng số, 3–4 màu khác nhau); joker thay bất
// kỳ lá nào. Mở bài lần đầu phải ≥30 điểm (tổng giá trị các bộ mới ra
// từ tay). Sau khi mở bài, được thao tác trên bàn (thêm lá, tách dãy,
// chuyển lá giữa các bộ) miễn cuối lượt mọi bộ đều hợp lệ; xếp bàn
// sai thì thu lại + rút 3 lá phạt, hết lượt. Mỗi lượt hoặc đánh bộ
// hoặc rút 1 lá. Hết bài trên tay thì thắng: người thắng được tổng
// giá trị bài còn lại của các đối thủ (joker = 30), người thua bị trừ
// bằng tổng bài còn lại của mình. Chồng bài hết mà có người phải rút
// thì trận kết thúc, người ít điểm bài trên tay nhất thắng. Mọi quyết
// định ngẫu nhiên đều dùng LCG lưu trong state để mọi máy cùng áp 1
// hành động thì giống hệt nhau.
// Lá là chuỗi duy nhất: "R5-0" (màu + số + bản sao 0/1, vì mỗi lá có
// 2 bản), joker "J-0"/"J-1". summary cuối trận: tilesLeft (lá còn
// trên tay), score, meldsPlayed (tổng số lá đã đánh ra), jokersPlayed
// (tổng số joker đã đánh), turns (số lượt đã đi).
export const COLORS = ['R', 'B', 'O', 'K'];
export const COLOR_NAMES = { R: 'đỏ', B: 'xanh dương', O: 'cam', K: 'đen' };
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const HAND_CARDS = 14;
export const INITIAL_MIN = 30;
export const JOKER_VALUE = 30;
export const DECK_SIZE = 106;

export function isJoker(t) { return typeof t === 'string' && t[0] === 'J'; }
export function tileColor(t) { return t[0]; }
export function tileNumber(t) { return isJoker(t) ? 0 : parseInt(t.slice(1), 10); }
export function tileValue(t) { return isJoker(t) ? JOKER_VALUE : parseInt(t.slice(1), 10); }
export function handValue(hand) { return (hand || []).reduce((s, t) => s + tileValue(t), 0); }

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* LCG lưu trong state: mọi lần xào bài đều qua đây */
function nextRand(s) {
  s.seed = (s.seed * 1103515245 + 12345) % 2147483648;
  return s.seed / 2147483648;
}
function shuffleWith(s, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pOf = (s, id) => s.players.find(p => p.id === id);
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < MIN_PLAYERS || s.players.length > MAX_PLAYERS
    || !Array.isArray(s.table) || !Array.isArray(s.deck)
    || typeof s.phase !== 'string' || typeof s.turnIdx !== 'number') {
    throw new Error('Trạng thái Rummikub không hợp lệ.');
  }
  return s;
}
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

function buildDeck() {
  const d = [];
  for (let copy = 0; copy < 2; copy++) {
    for (const c of COLORS) for (let n = 1; n <= 13; n++) d.push(`${c}${n}-${copy}`);
  }
  d.push('J-0', 'J-1');
  return d;
}
/* sắp tay bài: theo màu (đỏ, xanh, cam, đen) rồi theo số, joker cuối */
export function sortTiles(a, b) {
  const ca = tileColor(a), cb = tileColor(b);
  if (ca === 'J' && cb !== 'J') return 1;
  if (cb === 'J' && ca !== 'J') return -1;
  if (ca !== cb) return COLORS.indexOf(ca) - COLORS.indexOf(cb);
  return tileNumber(a) - tileNumber(b);
}

/* ---------- kiểm tra 1 bộ ---------- */
/* meldInfo(meld) -> {valid, kind: 'run'|'group'|null, value}.
   value = tổng giá trị các lá, joker tính theo lá nó đại diện: ở nhóm
   thì bằng số của nhóm; ở dãy thì bằng số còn thiếu cao nhất trong
   dãy (chọn dãy bắt đầu cao nhất có thể — có lợi nhất cho người chơi
   khi tính điểm mở bài, VD [10,11,J] tính J=12 được 33 điểm). */
export function meldInfo(meld) {
  if (!Array.isArray(meld) || meld.length < 3) return { valid: false, kind: null, value: 0 };
  const tiles = meld.slice();
  const jokers = tiles.filter(isJoker);
  const nums = tiles.filter(t => !isJoker(t));
  if (!nums.length) return { valid: false, kind: null, value: 0 };
  const total = tiles.length;
  /* nhóm: cùng số, màu khác nhau, 3–4 lá */
  const groupNum = tileNumber(nums[0]);
  const groupColors = new Set(nums.map(tileColor));
  if (nums.every(t => tileNumber(t) === groupNum) && groupColors.size === nums.length && total >= 3 && total <= 4) {
    return { valid: true, kind: 'group', value: groupNum * total };
  }
  /* dãy: cùng màu, số khác nhau, có 1 dãy liên tiếp chứa hết các số */
  const color = tileColor(nums[0]);
  const numbers = nums.map(tileNumber);
  const distinct = new Set(numbers);
  if (nums.every(t => tileColor(t) === color) && distinct.size === numbers.length && total <= 13) {
    const min = Math.min(...numbers), max = Math.max(...numbers);
    if (max - min + 1 <= total) {
      /* dãy bắt đầu cao nhất có thể mà vẫn chứa hết các số đã có */
      const s0 = Math.min(min, 14 - total);
      if (s0 <= min && s0 + total - 1 <= 13) {
        let value = numbers.reduce((a, b) => a + b, 0);
        const present = new Set(numbers);
        for (let x = s0; x < s0 + total; x++) if (!present.has(x)) value += x;
        return { valid: true, kind: 'run', value };
      }
    }
  }
  return { valid: false, kind: null, value: 0 };
}
export function validateTable(table) {
  if (!Array.isArray(table)) return false;
  return table.every(m => meldInfo(m).valid);
}

/* ---------- kiểm tra 1 lượt đánh bộ ---------- */
/* Làm việc thuần trên dữ liệu (bàn + tay + đã mở bài chưa) để bot
   (chỉ có view) và engine dùng chung 1 hàm. Trả về
   {ok, reason, used: [lá lấy từ tay], value}. */
export function validatePlayTable(table, hand, melded, newTable) {
  if (!Array.isArray(newTable)) return { ok: false, reason: 'Bàn không hợp lệ.', used: [], value: 0 };
  const flat = newTable.flat();
  if (new Set(flat).size !== flat.length) return { ok: false, reason: 'Có lá bị dùng 2 lần.', used: [], value: 0 };
  const oldFlat = (table || []).flat();
  const handSet = new Set(hand || []);
  const oldSet = new Set(oldFlat);
  for (const t of flat) {
    if (!oldSet.has(t) && !handSet.has(t)) return { ok: false, reason: 'Có lá không thuộc về bạn hay trên bàn.', used: [], value: 0 };
  }
  const newSet = new Set(flat);
  for (const t of oldFlat) {
    if (!newSet.has(t)) return { ok: false, reason: 'Không được lấy lá trên bàn về tay.', used: [], value: 0 };
  }
  for (const m of newTable) {
    if (!meldInfo(m).valid) return { ok: false, reason: 'Có bộ chưa hợp lệ trên bàn.', used: [], value: 0 };
  }
  const used = flat.filter(t => handSet.has(t) && !oldSet.has(t));
  if (!used.length) return { ok: false, reason: 'Lượt này bạn chưa đánh lá nào.', used: [], value: 0 };
  if (!melded) {
    /* chưa mở bài: không được động vào bộ có sẵn trên bàn */
    const key = m => [...m].sort().join(',');
    const oldKeys = new Set((table || []).map(key));
    const newKeys = new Set(newTable.map(key));
    for (const k of oldKeys) {
      if (!newKeys.has(k)) return { ok: false, reason: 'Chưa mở bài thì chưa được thao tác bộ trên bàn.', used: [], value: 0 };
    }
    /* điểm mở bài = tổng giá trị các bộ mới toàn lá trên tay */
    let value = 0;
    for (const m of newTable) {
      if (m.every(t => handSet.has(t) && !oldSet.has(t))) value += meldInfo(m).value;
    }
    if (value < INITIAL_MIN) return { ok: false, reason: `Mở bài lần đầu phải từ ${INITIAL_MIN} điểm trở lên (đang ${value} điểm).`, used: [], value };
    return { ok: true, reason: '', used, value };
  }
  return { ok: true, reason: '', used, value: 0 };
}
export function validatePlay(s, pid, newTable) {
  const p = pOf(s, pid);
  if (!p) return { ok: false, reason: 'Không tìm thấy người chơi.', used: [], value: 0 };
  return validatePlayTable(s.table, p.hand, p.melded, newTable);
}

function nextTurn(s) {
  s.turnIdx = (s.turnIdx + 1) % s.players.length;
  if (s.turnIdx === 0) s.round++;
}
function endMatch(s, reason, winnerId) {
  s.phase = 'ended';
  s.endReason = reason;
  s.endCause = reason === 'resign' ? 'resign' : (reason === 'pool' ? 'pool-empty' : 'empty-hand');
  s.endedAt = Date.now();
  s.winner = winnerId;
  s.losers = s.players.filter(p => p.id !== winnerId).map(p => p.id);
  const winner = pOf(s, winnerId);
  let winScore = 0;
  for (const p of s.players) if (p.id !== winnerId) winScore += handValue(p.hand);
  const summary = {};
  const scores = [];
  for (const p of s.players) {
    const hv = handValue(p.hand);
    const score = p.id === winnerId ? winScore : -hv;
    p.score = score;
    summary[p.id] = { tilesLeft: p.hand.length, score, meldsPlayed: p.meldsPlayed, jokersPlayed: p.jokersPlayed, turns: p.turns };
    scores.push({ id: p.id, name: p.name, score });
  }
  scores.sort((a, b) => b.score - a.score);
  s.final = { summary, scores };
  pushLog(s, `${winner ? winner.name : 'Ai đó'} thắng trận với ${winScore} điểm!`, 'win');
}

export function createGame(players, opts = {}) {
  if (!players || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error('Rummikub chơi 2–4 người.');
  }
  const seed = typeof opts.seed === 'number' ? opts.seed : (Date.now() % 2147483647);
  const s = {
    gid: 'rk-' + seed.toString(36) + '-' + (seed % 9973).toString(36), seq: 0,
    phase: 'playing', /* 'playing' | 'ended' */
    seed,
    players: players.map((p, i) => ({
      id: p.id, name: p.name || ('Người ' + (i + 1)),
      isBot: !!p.isBot, level: p.level || null, local: !!p.local,
      hand: [], melded: false, meldsPlayed: 0, jokersPlayed: 0, turns: 0, score: 0,
    })),
    deck: [], table: [],
    turnIdx: 0, round: 1,
    winner: null, losers: [], endReason: null, endCause: null, final: null,
    startedAt: Date.now(), endedAt: 0, log: [],
  };
  const deck = shuffleWith(s, buildDeck());
  s.players.forEach(p => {
    p.hand = deck.splice(0, HAND_CARDS).sort(sortTiles);
  });
  s.deck = deck;
  pushLog(s, `Ván mới: ${s.players.length} người, mỗi người 14 lá, 106 lá (2 bộ 1–13 × 4 màu + 2 joker).`);
  return s;
}

export function applyAction(s, pid, act) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Trận đã kết thúc.' };
  const p = pOf(s, pid);
  if (!p) return { ok: false, reason: 'Không tìm thấy người chơi.' };
  if (!act || typeof act.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };

  /* ---------- xin thua: kết thúc trận luôn ---------- */
  if (act.type === 'resign') {
    const others = s.players.filter(x => x.id !== pid);
    const ranked = [...others].sort((a, b) => handValue(a.hand) - handValue(b.hand)
      || s.players.indexOf(a) - s.players.indexOf(b));
    endMatch(s, 'resign', ranked[0].id);
    s.seq++;
    pushLog(s, `${p.name} xin thua. ${ranked[0].name} thắng trận!`, 'resign');
    return { ok: true };
  }

  /* chỉ người tới lượt mới được đánh / rút */
  if (s.players[s.turnIdx].id !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };

  /* ---------- đánh bộ: gửi toàn bộ bàn mới ---------- */
  if (act.type === 'play') {
    const v = validatePlay(s, pid, act.table);
    if (!v.ok) {
      /* xếp bàn sai: thu lại + rút 3 lá phạt, hết lượt */
      const drawn = [];
      for (let i = 0; i < 3 && s.deck.length; i++) drawn.push(s.deck.pop());
      p.hand.push(...drawn);
      p.hand.sort(sortTiles);
      p.turns++;
      pushLog(s, `${p.name} xếp bàn chưa hợp lệ (${v.reason}) — thu lại và rút ${drawn.length} lá phạt.`, 'bad');
      nextTurn(s);
      s.seq++;
      return { ok: true, penalized: true, reason: v.reason };
    }
    const usedSet = new Set(v.used);
    p.hand = p.hand.filter(t => !usedSet.has(t));
    s.table = act.table.map(m => m.slice());
    if (!p.melded) p.melded = true;
    p.meldsPlayed += v.used.length;
    p.jokersPlayed += v.used.filter(isJoker).length;
    p.turns++;
    pushLog(s, `${p.name} đánh ${v.used.length} lá${v.value ? ` (mở bài ${v.value} điểm)` : ''}.`, 'play');
    if (p.hand.length === 0) {
      endMatch(s, 'match', pid);
      s.seq++;
      return { ok: true };
    }
    nextTurn(s);
    s.seq++;
    return { ok: true };
  }

  /* ---------- rút 1 lá ---------- */
  if (act.type === 'draw') {
    if (!s.deck.length) {
      /* chồng hết: người ít điểm bài trên tay nhất thắng */
      const ranked = [...s.players].sort((a, b) => handValue(a.hand) - handValue(b.hand)
        || s.players.indexOf(a) - s.players.indexOf(b));
      pushLog(s, `Chồng bài đã hết — ${ranked[0].name} ít điểm bài nhất nên thắng trận.`, 'info');
      endMatch(s, 'pool', ranked[0].id);
      s.seq++;
      return { ok: true };
    }
    p.hand.push(s.deck.pop());
    p.hand.sort(sortTiles);
    p.turns++;
    pushLog(s, `${p.name} rút 1 lá (còn ${s.deck.length} lá trong chồng).`, 'draw');
    nextTurn(s);
    s.seq++;
    return { ok: true };
  }

  return { ok: false, reason: 'Hành động không hợp lệ.' };
}

/* người đang tới lượt (mỗi lượt chỉ 1 người hành động) */
export function actors(s) {
  if (!s || s.phase !== 'playing') return [];
  const p = s.players[s.turnIdx];
  return p ? [p.id] : [];
}

export function viewFor(s, pid) {
  const me = pOf(s, pid);
  const ended = s.phase === 'ended';
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    round: s.round, turn: s.players[s.turnIdx] ? s.players[s.turnIdx].id : null, turnIdx: s.turnIdx,
    table: s.table.map(m => m.slice()),
    deckCount: s.deck.length,
    players: s.players.map(p => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
      melded: !!p.melded, handCount: p.hand.length, score: p.score,
      /* tay bài chỉ hiện cho chính mình (hoặc khi trận đã xong thì hiện hết) */
      hand: (ended || (me && p.id === pid)) ? p.hand.slice() : [],
      meldsPlayed: p.meldsPlayed, jokersPlayed: p.jokersPlayed, turns: p.turns,
    })),
    winner: s.winner, losers: (s.losers || []).slice(), endReason: s.endReason, endCause: s.endCause,
    final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    log: s.log.slice(), startedAt: s.startedAt, endedAt: s.endedAt,
    me: pid,
  };
}

export default { createGame, applyAction, viewFor, actors, meldInfo, validateTable, validatePlay };
