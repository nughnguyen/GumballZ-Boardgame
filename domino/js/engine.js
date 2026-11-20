// 🎲 Domino (cờ Domino, bộ Double-6) – luật chơi (thuần logic, không chạm DOM).
// 28 quân (0-0 … 6-6), 2–4 người, mỗi người 7 quân, còn lại là chồng rút.
// - Mở màn: người có đôi lớn nhất trong cả bàn (6-6 to nhất) đi trước bằng
//   đúng quân đó; các ván sau, người thắng ván trước mở màn bằng đôi lớn nhất
//   trong tay mình (không có đôi thì quân nhiều nút nhất trong tay).
// - Đặt 1 quân vào 1 trong 2 đầu dây sao cho 1 nửa quân trùng số với đầu dây
//   đó; quân đôi đặt ngang (không ảnh hưởng luật, chỉ khác cách vẽ).
// - Không có quân hợp thì rút 1 quân từ chồng rút cho tới khi có quân hợp
//   hoặc chồng rút hết; chồng rút hết mà vẫn không có quân hợp thì tự động
//   BỎ LƯỢT. Cả bàn lần lượt bỏ lượt (không ai đi được nữa) thì ván bị khóa.
// - Hết 1 quân trên tay (Domino!) thì thắng ván; ván khóa thì người ít nút
//   nhất thắng ván (hòa nút thì ván hòa, không ai được điểm).
// - Điểm ván: người thắng được tổng số nút còn lại trên tay mọi đối thủ,
//   trừ trường hợp ván khóa thì được tổng nút đối thủ trừ đi nút của mình.
//   Đủ điểm mục tiêu (chủ phòng chọn: ván đơn / 50 / 100 / 150) thì thắng trận.
let rnd = Math.random;
export function setRandom(f) { rnd = f || Math.random; }
const rand = () => rnd();

/* ---------------- bộ quân ---------------- */
/* id 0..27: liệt kê (a,b) với a<=b: (0,0)..(0,6), (1,1)..(1,6), …, (6,6) */
export const TILES = [];
for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) TILES.push({ id: TILES.length, a, b, pips: a + b, double: a === b });
export const tileOf = id => TILES[id] || null;
export const tilePips = id => (TILES[id] || { pips: 0 }).pips;
export const isDouble = id => (TILES[id] || {}).double === true;
const handPips = hand => hand.reduce((s, t) => s + tilePips(t), 0);
const sortHand = hand => hand.slice().sort((x, y) => tilePips(y) - tilePips(x) || TILES[y].b - TILES[x].b || TILES[y].a - TILES[x].a);

export const MIN_PLAYERS = 2, MAX_PLAYERS = 4;
export const OPT_CHOICES = { target: [0, 50, 100, 150], maxPlayers: [2, 3, 4], timer: [0, 30, 60] };
export const TARGET_LABEL = { 0: 'Ván đơn (1 ván)', 50: '50 điểm', 100: '100 điểm', 150: '150 điểm' };

export function newSet() {
  const d = TILES.map(t => t.id);
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1));[d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
/* quân mở màn của 1 tay bài: đôi lớn nhất, không có đôi thì quân nhiều nút nhất */
export function starterTileOf(hand) {
  let best = null;
  for (const t of hand) {
    const o = tileOf(t);
    if (!best) { best = t; continue; }
    const b = tileOf(best);
    if (o.double && !b.double) best = t;
    else if (o.double === b.double && (o.pips > b.pips || (o.pips === b.pips && o.b > b.b))) best = t;
  }
  return best;
}
export const tileName = id => { const t = tileOf(id); return t ? `[${t.a}|${t.b}]` : '?'; };

/* ---------------- trạng thái ---------------- */
function dealHand(s, starterPid) {
  const deck = newSet();
  for (const p of s.players) { p.hand = sortHand(deck.splice(0, 7)); p.out = false; }
  s.boneyard = deck;
  s.chain = [];
  /* người mở màn + quân mở màn */
  let spid = starterPid, stile = null;
  if (!spid) {
    /* ván đầu: người có đôi lớn nhất cả bàn (không có đôi thì quân nhiều nút nhất) */
    let bestTile = -1;
    for (const p of s.players) {
      const t = starterTileOf(p.hand);
      if (bestTile < 0 || tileOf(t).double > tileOf(bestTile).double || (tileOf(t).double === tileOf(bestTile).double && tileOf(t).pips > tileOf(bestTile).pips)) { bestTile = t; spid = p.id; }
    }
    stile = bestTile;
  } else {
    const sp = s.players.find(p => p.id === spid);
    stile = starterTileOf(sp.hand);
  }
  s.starter = { pid: spid, tile: stile };
  s.turn = spid;
  s.passStreak = 0;
  s.handEnd = null;
  s.lastPlay = null;
  s.lastDraw = null;
  s.lastPass = null;
}

export function createGame(players, opts = {}) {
  if (!players || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) throw new Error('Domino chơi 2–4 người.');
  const target = OPT_CHOICES.target.includes(+opts.target) ? +opts.target : 100;
  const timer = OPT_CHOICES.timer.includes(+opts.timer) ? +opts.timer : 0;
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0, phase: 'playing',
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null, hand: [], score: 0, handWins: 0, out: false })),
    boneyard: [], chain: [], turn: null, handNo: 1, target, timer,
    starter: { pid: null, tile: null }, handEnd: null,
    lastPlay: null, lastDraw: null, lastPass: null, passStreak: 0,
    winner: null, draw: false, endReason: null, log: [],
  };
  dealHand(s, null);
  pushLog(s, `🎲 Ván 1 bắt đầu — ${nameOf(s, s.starter.pid)} mở màn bằng ${tileName(s.starter.tile)}!`);
  return s;
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < MIN_PLAYERS || s.players.length > MAX_PLAYERS || !Array.isArray(s.chain) || !Array.isArray(s.boneyard)) throw new Error('Trạng thái Domino không hợp lệ.');
  return s;
}
const pIdx = (s, id) => s.players.findIndex(p => p.id === id);
const pOf = (s, id) => s.players.find(p => p.id === id);
const nameOf = (s, id) => (pOf(s, id) || {}).name || '???';
const nextPid = (s, id) => s.players[(pIdx(s, id) + 1) % s.players.length].id;
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

/* 2 đầu dây hiện tại: { left, right } (null khi dây trống) */
export function openEnds(s) {
  if (!s.chain.length) return { left: null, right: null };
  return { left: s.chain[0].left, right: s.chain[s.chain.length - 1].right };
}
/* các quân hợp lệ của 1 người: [{ tile, ends: ['left','right'] }] */
export function legalPlays(s, pid) {
  const p = pOf(s, pid);
  if (!p || s.phase !== 'playing' || s.handEnd || s.turn !== pid) return [];
  if (!s.chain.length) {
    /* nước mở màn: bắt buộc đúng quân mở màn */
    return p.hand.includes(s.starter.tile) ? [{ tile: s.starter.tile, ends: ['left'] }] : [];
  }
  const { left, right } = openEnds(s);
  const out = [];
  for (const t of p.hand) {
    const o = tileOf(t), ends = [];
    if (o.a === left || o.b === left) ends.push('left');
    if (o.a === right || o.b === right) ends.push('right');
    if (ends.length) out.push({ tile: t, ends });
  }
  return out;
}
export const playableTiles = (s, pid) => legalPlays(s, pid).map(m => m.tile);
export const canDraw = (s, pid) => {
  const p = pOf(s, pid);
  return !!p && s.phase === 'playing' && !s.handEnd && s.turn === pid && legalPlays(s, pid).length === 0 && s.boneyard.length > 0;
};

function endMatch(s, winnerId, reason) {
  s.phase = 'ended'; s.winner = winnerId || null; s.endReason = reason; s.seq++;
  if (!winnerId) s.draw = true;
}

/* khóa ván: ai cũng bỏ lượt liên tiếp → ít nút nhất thắng, hòa nút thì hòa ván */
function resolveBlocked(s) {
  const pips = {};
  for (const p of s.players) pips[p.id] = handPips(p.hand);
  const min = Math.min(...Object.values(pips));
  const leaders = s.players.filter(p => pips[p.id] === min);
  if (leaders.length > 1) {
    s.handEnd = { winnerId: null, reason: 'tie', points: 0, pips, handNo: s.handNo, scores: Object.fromEntries(s.players.map(p => [p.id, p.score])) };
    pushLog(s, `🔒 Ván khóa — hòa nút ${min}! Không ai được điểm.`, 'win');
    s.seq++;
    return;
  }
  const w = leaders[0];
  /* điểm = tổng nút đối thủ trừ đi nút của mình (ít nút nhất thắng) */
  const pts = Object.values(pips).reduce((a, b) => a + b, 0) - 2 * min;
  w.score += pts; w.handWins++;
  s.handEnd = { winnerId: w.id, reason: 'blocked', points: pts, pips, handNo: s.handNo, scores: Object.fromEntries(s.players.map(p => [p.id, p.score])) };
  pushLog(s, `🔒 Ván khóa — ${w.name} ít nút nhất (${min} nút), thắng ${pts} điểm!`, 'win');
  s.seq++;
  checkMatchEnd(s, w);
}
/* thắng ván khi hết quân: được tổng nút còn lại của đối thủ */
function resolveDomino(s, pid) {
  const w = pOf(s, pid);
  let pts = 0;
  const pips = {};
  for (const p of s.players) { pips[p.id] = handPips(p.hand); if (p.id !== pid) pts += pips[p.id]; }
  w.score += pts; w.handWins++;
  s.handEnd = { winnerId: pid, reason: 'domino', points: pts, pips, handNo: s.handNo, scores: Object.fromEntries(s.players.map(p => [p.id, p.score])) };
  pushLog(s, `🎉 ${w.name} hết quân — Domino! Thắng ${pts} điểm!`, 'win');
  s.seq++;
  checkMatchEnd(s, w);
}
/* đủ điểm mục tiêu (hoặc ván đơn) thì hết trận */
function checkMatchEnd(s, w) {
  if (s.target === 0) { endMatch(s, w.id, 'hand'); pushLog(s, `🏆 ${w.name} thắng trận!`, 'win'); return; }
  if (w.score >= s.target) { endMatch(s, w.id, 'target'); pushLog(s, `🏆 ${w.name} đủ ${s.target} điểm — thắng trận!`, 'win'); }
}
/* sau mỗi hành động: bỏ lượt tự động cho người không đi được mà hết quân rút;
   cả bàn bỏ lượt liên tiếp thì khóa ván. */
function autoPass(s) {
  let guard = 0;
  while (s.phase === 'playing' && !s.handEnd && guard++ < 20) {
    const cur = pOf(s, s.turn);
    if (!cur) break;
    if (legalPlays(s, s.turn).length > 0 || s.boneyard.length > 0) break;
    s.passStreak++;
    s.lastPass = { by: s.turn, n: s.seq };
    pushLog(s, `⏭️ ${cur.name} không có quân hợp + hết quân rút — bỏ lượt!`);
    s.seq++;
    if (s.passStreak >= s.players.length) { resolveBlocked(s); return; }
    s.turn = nextPid(s, s.turn);
  }
}

export function applyPlay(s, pid, tile, end) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Trận đã kết thúc.' };
  if (s.handEnd) return { ok: false, reason: 'Ván này đã xong — chờ mở ván mới.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  if (s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  if (!Number.isInteger(tile) || !tileOf(tile) || !me.hand.includes(tile)) return { ok: false, reason: 'Bạn không có quân này.' };
  const legal = legalPlays(s, pid).find(m => m.tile === tile);
  if (!legal) return { ok: false, reason: 'Quân này không khớp đầu dây nào.' };
  let placeEnd = end;
  if (!s.chain.length) placeEnd = 'left'; /* nước mở màn: đặt giữa dây */
  else {
    if (!legal.ends.includes(placeEnd)) placeEnd = legal.ends[0];
    if (placeEnd !== 'left' && placeEnd !== 'right') return { ok: false, reason: 'Chọn đầu dây trái hoặc phải.' };
  }
  const o = tileOf(tile);
  me.hand = me.hand.filter(t => t !== tile);
  let placed;
  if (!s.chain.length) {
    placed = { tile, left: o.a, right: o.b };
    s.chain.push(placed);
  } else if (placeEnd === 'left') {
    const lv = s.chain[0].left;
    placed = o.b === lv ? { tile, left: o.a, right: o.b } : { tile, left: o.b, right: o.a };
    s.chain.unshift(placed);
  } else {
    const rv = s.chain[s.chain.length - 1].right;
    placed = o.a === rv ? { tile, left: o.a, right: o.b } : { tile, left: o.b, right: o.a };
    s.chain.push(placed);
  }
  s.seq++;
  s.lastPlay = { by: pid, tile, end: placeEnd, n: s.seq, emptied: me.hand.length === 0 };
  pushLog(s, `${me.name} đặt ${tileName(tile)} vào đầu ${placeEnd === 'left' ? 'trái' : 'phải'}${me.hand.length === 0 ? ' — hết quân!' : ` (còn ${me.hand.length} quân)`}`);
  s.passStreak = 0;
  if (me.hand.length === 0) { resolveDomino(s, pid); return { ok: true, ended: s.phase === 'ended', domino: true }; }
  s.turn = nextPid(s, pid);
  autoPass(s);
  return { ok: true, ended: s.phase === 'ended' };
}

export function applyDraw(s, pid) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Trận đã kết thúc.' };
  if (s.handEnd) return { ok: false, reason: 'Ván này đã xong — chờ mở ván mới.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  if (s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  if (legalPlays(s, pid).length > 0) return { ok: false, reason: 'Bạn còn quân hợp lệ — phải đặt quân, không được rút.' };
  if (!s.boneyard.length) return { ok: false, reason: 'Hết quân rút rồi.' };
  const t = s.boneyard.pop();
  me.hand = sortHand([...me.hand, t]);
  s.seq++;
  s.lastDraw = { by: pid, tile: t, n: s.seq };
  pushLog(s, `${me.name} rút 1 quân (còn ${s.boneyard.length} quân rút).`);
  s.passStreak = 0;
  /* rút xong vẫn không có quân hợp + hết quân rút → bỏ lượt ngay */
  if (legalPlays(s, pid).length === 0 && s.boneyard.length === 0) {
    s.turn = nextPid(s, pid);
    autoPass(s);
  }
  return { ok: true, drew: t };
}

export function applyNextHand(s, pid) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Trận đã kết thúc.' };
  if (!s.handEnd) return { ok: false, reason: 'Ván này chưa xong.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  const prevWinner = s.handEnd.winnerId;
  let starterPid = prevWinner;
  if (!starterPid) {
    /* ván hòa: người sau người mở màn ván trước mở màn ván này */
    starterPid = nextPid(s, s.starter.pid);
  }
  s.handNo++;
  dealHand(s, starterPid);
  s.seq++;
  pushLog(s, `🎲 Ván ${s.handNo} bắt đầu — ${nameOf(s, s.starter.pid)} mở màn bằng ${tileName(s.starter.tile)}!`);
  return { ok: true, handNo: s.handNo };
}

export function applyResign(s, pid) {
  if (s.phase === 'ended') return { ok: false, reason: 'Trận đã kết thúc.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  /* người xin thua: người có điểm cao nhất trong số còn lại thắng trận */
  const others = s.players.filter(p => p.id !== pid);
  let w = others[0];
  for (const p of others) if (p.score > w.score) w = p;
  endMatch(s, w.id, 'resign');
  pushLog(s, `${me.name} xin thua — 🏆 ${w.name} thắng trận!`, 'win');
  return { ok: true, ended: true };
}

export const actors = s => (s.phase === 'playing' && !s.handEnd && s.turn ? [s.turn] : []);
export function viewFor(s, pid) {
  const me = pOf(s, pid);
  const ends = openEnds(s);
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, turn: s.turn, handNo: s.handNo,
    target: s.target, timer: s.timer, chain: s.chain.map(c => ({ ...c })),
    boneyardN: s.boneyard.length, leftEnd: ends.left, rightEnd: ends.right,
    starter: { ...s.starter }, handEnd: s.handEnd ? { ...s.handEnd } : null,
    lastPlay: s.lastPlay ? { ...s.lastPlay } : null,
    lastDraw: s.lastDraw ? { ...s.lastDraw } : null,
    lastPass: s.lastPass ? { ...s.lastPass } : null,
    winner: s.winner, draw: s.draw, endReason: s.endReason,
    players: s.players.map(p => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
      n: p.hand.length, score: p.score, handWins: p.handWins, out: !!p.out,
      /* hết trận thì lật hết quân mọi người cho xem */
      hand: (p.id === pid || s.phase === 'ended') ? [...p.hand] : null,
    })),
    you: me ? {
      id: me.id, hand: [...me.hand], score: me.score,
      playable: playableTiles(s, pid), canDraw: canDraw(s, pid),
      starterTile: s.starter.tile, isStarter: s.starter.pid === pid,
      pips: handPips(me.hand),
    } : null,
    me: pid,
    log: s.log.slice(-30),
  };
}
/* Adapter cho phòng online (simplenet): action { type, tile?, end? }.
   Cả 2 bên áp cùng 1 action sẽ ra cùng 1 trạng thái. */
export function applyAction(s, pid, a, ctx) {
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'play': return applyPlay(s, pid, a.tile, a.end);
    case 'draw': return applyDraw(s, pid);
    case 'next-hand': return applyNextHand(s, pid);
    case 'resign': return applyResign(s, pid);
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}
