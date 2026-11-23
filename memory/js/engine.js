// 🃏 Memory (Lật thẻ nhớ) – luật chơi (thuần logic, không chạm DOM).
// Bộ bài úp trên bàn theo lưới; mỗi lượt lật 2 lá. 2 lá giống nhau → giữ
// ngửa, được 1 cặp VÀ được lật tiếp. 2 lá khác nhau → úp lại sau 1 nhịp rồi
// đổi lượt. Hết bàn (tìm đủ mọi cặp) thì kết thúc: 2 người thì ai nhiều cặp
// hơn thắng, bằng nhau thì hòa; chơi đơn thì thắng khi tìm đủ cặp, điểm tính
// bằng thời gian + số lượt lật (xếp hạng sao do giao diện tính).
// Bộ bài được xáo 1 LẦN khi tạo ván (host xáo, state chung đồng bộ cho khách
// qua view) — không bên nào tự xáo riêng, nên 2 bên luôn thấy cùng 1 bộ bài.
// Mức khó: Dễ 12 lá (6 cặp, 4×3), Vừa 16 lá (8 cặp, 4×4), Khó 24 lá (12 cặp, 6×4).
// Engine cho phép truyền seed (opts.seed) để test: cùng seed → cùng bộ bài.
export const LEVELS = {
  easy: { cards: 12, pairs: 6, cols: 4, rows: 3, label: 'Dễ' },
  medium: { cards: 16, pairs: 8, cols: 4, rows: 4, label: 'Vừa' },
  hard: { cards: 24, pairs: 12, cols: 6, rows: 4, label: 'Khó' },
};
export const FACES = ['🍎', '🍌', '🍇', '🍓', '🍊', '🍉', '🍒', '🥝', '🍍', '🥭', '🍑', '🍐'];
/* RNG xác định (mulberry32) — cùng seed thì xáo ra cùng 1 bộ bài */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const levelOf = lv => LEVELS[lv] || LEVELS.medium;
export const levelKey = lv => (LEVELS[lv] ? lv : 'medium');

export function createGame(players, opts = {}) {
  if (!players || (players.length !== 1 && players.length !== 2)) throw new Error('Memory chơi 1 người (chơi đơn) hoặc 2 người.');
  const solo = players.length === 1;
  const level = levelKey(opts.level);
  const L = LEVELS[level];
  const seed = Number.isInteger(opts.seed) ? (opts.seed >>> 0) : ((Math.random() * 0xFFFFFFFF) >>> 0);
  const rng = mulberry32(seed);
  const deck = [];
  for (const f of FACES.slice(0, L.pairs)) { deck.push(f, f); }
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  /* 🎯 lượt đầu: mặc định ghế 0 (ván đầu theo ghế); chơi lại thì main truyền
     firstIdx (hoặc prevFirstIdx) để ĐỔI người đi đầu qua các ván — mọi client
     cùng thấy vì firstIdx nằm trong state chung. */
  const n = players.length;
  let firstIdx = 0;
  if (Number.isInteger(opts.firstIdx) && opts.firstIdx >= 0 && opts.firstIdx < n) firstIdx = opts.firstIdx;
  else if (Number.isInteger(opts.prevFirstIdx) && opts.prevFirstIdx >= 0 && opts.prevFirstIdx < n && n > 1) firstIdx = (opts.prevFirstIdx + 1) % n;
  const gameNo = Number.isInteger(opts.gameNo) && opts.gameNo > 0 ? opts.gameNo : 1;
  const st = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0, phase: 'playing',
    level, cols: L.cols, rows: L.rows, pairs: L.pairs, total: L.cards, seed, solo,
    cards: deck.map(face => ({ face, up: false, matched: false })),
    players: players.map(p => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local,
      level: p.level || null, pairs: 0,
    })),
    turn: players[firstIdx].id, turnNo: 1, flips: 0, misses: 0,
    firstIdx, firstId: players[firstIdx].id, gameNo,
    pendingFlip: null, pendingHide: null, history: [],
    winner: null, draw: false, scores: null, endReason: null,
    lastFlip: null, log: [],
  };
  pushLog(st, `🎯 ${players[firstIdx].name} đi trước!`);
  return st;
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.cards) || !Array.isArray(s.players) || (s.players.length !== 1 && s.players.length !== 2)) throw new Error('Trạng thái Memory không hợp lệ.');
  if (s.cards.length !== s.total) throw new Error('Số lá không khớp.');
  return s;
}
const pOf = (s, id) => s.players.find(p => p.id === id);
const foeOf = (s, id) => s.players.find(p => p.id !== id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };
export const matchedCount = s => s.cards.reduce((a, c) => a + (c.matched ? 1 : 0), 0);
export const remainingPairs = s => s.pairs - s.players.reduce((a, p) => a + p.pairs, 0);
/* các lá được phép lật: úp, chưa trúng cặp, không phải lá đang ngửa chờ cặp */
export function legalFlips(s, pid) {
  if (s.phase !== 'playing' || s.turn !== pid || s.pendingHide) return [];
  const out = [];
  for (let i = 0; i < s.cards.length; i++) {
    const c = s.cards[i];
    if (!c.matched && !c.up && i !== s.pendingFlip) out.push(i);
  }
  return out;
}
const isLegalFlip = (s, pid, i) => legalFlips(s, pid).includes(i);

/* úp lại 2 lá vừa lật trượt, rồi đổi lượt (chơi đơn: lượt vẫn là người đó) */
function applyHide(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (!s.pendingHide) return { ok: false, reason: 'Không có lá nào cần úp.' };
  if (s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  const [j, i] = s.pendingHide;
  s.cards[j].up = false; s.cards[i].up = false;
  s.pendingHide = null; s.seq++;
  if (!s.solo) { const foe = foeOf(s, pid); s.turn = foe.id; s.turnNo++; }
  return { ok: true, hid: [j, i] };
}

function applyFlip(s, pid, index) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  if (s.pendingHide) return { ok: false, reason: 'Đang úp lại 2 lá vừa lật, chờ chút…' };
  if (s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  if (!Number.isInteger(index)) return { ok: false, reason: 'Vị trí lá không hợp lệ.' };
  if (index < 0 || index >= s.cards.length) return { ok: false, reason: 'Ngoài bàn.' };
  const card = s.cards[index];
  if (card.matched) return { ok: false, reason: 'Lá này đã trúng cặp rồi.' };
  if (s.pendingFlip === index) return { ok: false, reason: 'Không lật 1 lá 2 lần.' };
  if (card.up) return { ok: false, reason: 'Lá này đang ngửa rồi.' };
  card.up = true;
  s.seq++; s.flips++;
  s.history.push({ i: index, face: card.face, by: pid, seq: s.seq });
  if (s.history.length > 300) s.history.splice(0, s.history.length - 300);
  s.lastFlip = { by: pid, i: index, face: card.face, match: null, pair: null };
  if (s.pendingFlip === null) {
    s.pendingFlip = index;
    pushLog(s, `${me.name} lật lá ${index + 1} (${card.face})`);
    return { ok: true, first: true, flip: { i: index, face: card.face } };
  }
  const j = s.pendingFlip;
  const faceJ = s.cards[j].face;
  s.pendingFlip = null;
  s.lastFlip.pair = [j, index];
  if (faceJ === card.face) {
    /* trúng cặp: giữ ngửa, +1 cặp, ĐƯỢC LẬT TIẾP (lượt không đổi) */
    s.cards[j].matched = true; card.matched = true;
    me.pairs++;
    s.lastFlip.match = true;
    pushLog(s, `🎉 ${me.name} trúng cặp ${card.face}! (${me.pairs}/${s.pairs} cặp)`, 'win');
    if (matchedCount(s) === s.total) {
      s.phase = 'ended'; s.endReason = 'done';
      s.scores = s.players.map(p => ({ id: p.id, total: p.pairs }));
      if (s.solo) { s.winner = pid; pushLog(s, `🏆 ${me.name} tìm đủ ${s.pairs} cặp sau ${s.flips} lượt lật!`, 'win'); }
      else {
        const foe = foeOf(s, pid);
        if (me.pairs > foe.pairs) { s.winner = pid; pushLog(s, `🏆 ${me.name} thắng ${me.pairs} – ${foe.pairs}!`, 'win'); }
        else if (foe.pairs > me.pairs) { s.winner = foe.id; pushLog(s, `🏆 ${foe.name} thắng ${foe.pairs} – ${me.pairs}!`, 'win'); }
        else { s.draw = true; pushLog(s, `🤝 Hòa ${me.pairs} – ${foe.pairs}!`, 'win'); }
      }
      return { ok: true, match: true, pair: [j, index], ended: true, win: !!s.winner, draw: s.draw };
    }
    return { ok: true, match: true, pair: [j, index] };
  }
  /* lật trượt: 2 lá giữ ngửa chờ úp lại (pendingHide) — lượt đổi SAU khi úp */
  s.pendingHide = [j, index];
  s.misses++;
  s.lastFlip.match = false;
  pushLog(s, `😕 ${me.name} lật ${faceJ} với ${card.face} — không khớp!`);
  return { ok: true, match: false, pair: [j, index] };
}

/* Adapter cho phòng online (simplenet): action { type:'flip', index } hoặc { type:'hide' }.
   Bộ bài nằm trong state chung (host xáo 1 lần khi tạo ván), mỗi action chỉ có
   vị trí lá — 2 bên áp cùng 1 action vào bản engine local sẽ ra cùng 1 trạng thái. */
export function applyAction(s, pid, a, ctx) {
  if (!a) return { ok: false, reason: 'Hành động không hợp lệ.' };
  if (a.type === 'hide') return applyHide(s, pid);
  if (a.type !== 'flip') return { ok: false, reason: 'Hành động không hợp lệ.' };
  return applyFlip(s, pid, a.index);
}
export const actors = s => (s.phase === 'playing' && !s.pendingHide && s.turn ? [s.turn] : []);
export function viewFor(s, pid) {
  const me = pOf(s, pid);
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, level: s.level, cols: s.cols, rows: s.rows,
    pairs: s.pairs, total: s.total, seed: s.seed, solo: s.solo,
    /* mặt lá úp CHƯA lộ: chỉ gửi mặt khi lá đang ngửa hoặc đã trúng cặp — đối
       thủ không xem trộm được bộ bài qua state. */
    cards: s.cards.map(c => (c.matched || c.up) ? { face: c.face, up: c.up, matched: c.matched } : { face: null, up: false, matched: false }),
    players: s.players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null, pairs: p.pairs })),
    turn: s.turn, turnNo: s.turnNo, flips: s.flips, misses: s.misses,
    firstIdx: s.firstIdx, firstId: s.firstId, gameNo: s.gameNo || 1,
    pendingFlip: s.pendingFlip, pendingHide: s.pendingHide,
    winner: s.winner, draw: s.draw, scores: s.scores, endReason: s.endReason,
    lastFlip: s.lastFlip, log: s.log.slice(-30),
    me: pid, myPairs: me ? me.pairs : 0,
  };
}
