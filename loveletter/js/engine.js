// 💌 Love Letter – luật chơi (thuần logic, không chạm DOM).
// 2–4 người, bộ 16 lá: Vệ binh ×5 (1), Linh mục ×2 (2), Nam tước ×2 (3),
// Thị nữ ×2 (4), Hoàng tử ×2 (5), Quốc vương ×1 (6), Nữ bá tước ×1 (7),
// Công chúa ×1 (8). Mỗi vòng: xào bài, úp 1 lá ra ngoài (2 người thì lật
// thêm 3 lá ngửa cho mọi người thấy), chia mỗi người 1 lá. Tới lượt: bốc
// 1 lá (cầm 2 lá) rồi đánh 1 lá, giải hiệu ứng của lá đó. Lá Nữ bá tước
// bắt buộc phải đánh nếu đang cầm chung với Quốc vương hoặc Hoàng tử. Đánh
// hay bị bỏ Công chúa là bị loại. Vòng kết thúc khi bộ bài hết hoặc chỉ
// còn 1 người sống: hết bài thì so lá đang cầm (cao thắng, hòa thì so tổng
// lá đã bỏ), người thắng vòng nhận 1 dấu Yêu; đủ số dấu (2 người: 7,
// 3 người: 5, 4 người: 4) thì thắng cả trận.
// Mọi quyết định ngẫu nhiên đều dùng LCG lưu trong state (giống 2048 /
// Sudoku / Mạt Chược) để mọi máy cùng áp 1 hành động thì giống hệt nhau.
export const CARD_INFO = {
  guard:    { value: 1, name: 'Vệ binh',     icon: '🛡️', desc: 'Chọn 1 người + đoán 1 lá (2–8): đúng thì người đó bị loại.' },
  priest:   { value: 2, name: 'Linh mục',    icon: '⛪', desc: 'Xem bí mật bài trên tay 1 người khác.' },
  baron:    { value: 3, name: 'Nam tước',    icon: '⚖️', desc: 'So bài với 1 người: ai thấp hơn thì bị loại (hòa thì không sao).' },
  handmaid: { value: 4, name: 'Thị nữ',      icon: '🌸', desc: 'Bạn được bảo vệ khỏi mọi hiệu ứng cho tới lượt sau.' },
  prince:   { value: 5, name: 'Hoàng tử',    icon: '🤴', desc: 'Chọn 1 người (kể cả mình): bỏ bài trên tay rồi bốc lá mới.' },
  king:     { value: 6, name: 'Quốc vương',  icon: '👑', desc: 'Đổi bài trên tay với 1 người khác.' },
  countess: { value: 7, name: 'Nữ bá tước',  icon: '🎀', desc: 'Nếu đang cầm chung với Quốc vương / Hoàng tử thì bắt buộc đánh lá này.' },
  princess: { value: 8, name: 'Công chúa',   icon: '👸', desc: 'Nếu phải bỏ lá này vì bất cứ lý do gì thì bạn bị loại.' },
};
export const DECK_SPEC = [
  ['guard', 5], ['priest', 2], ['baron', 2], ['handmaid', 2],
  ['prince', 2], ['king', 1], ['countess', 1], ['princess', 1],
];
export const TOKEN_TARGET = { 2: 7, 3: 5, 4: 4 };
export const OPT_CHOICES = { target: [3, 4, 5, 6, 7] };

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* LCG lưu trong state: mọi lần xào / bốc / chọn người đều qua đây */
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
const kindOf = id => id.slice(0, id.lastIndexOf('-'));
const valueOf = id => CARD_INFO[kindOf(id)].value;
const nameOf = id => CARD_INFO[kindOf(id)].name;
const pOf = (s, id) => s.players.find(p => p.id === id);
const cloneState = s => JSON.parse(JSON.stringify(s));
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < 2 || s.players.length > 4
    || !Array.isArray(s.deck) || typeof s.phase !== 'string' || !s.turn) {
    throw new Error('Trạng thái Love Letter không hợp lệ.');
  }
  return s;
}
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

function buildDeck() {
  const d = [];
  for (const [kind, n] of DECK_SPEC) for (let i = 0; i < n; i++) d.push(`${kind}-${i}`);
  return d;
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 2 || players.length > 4) throw new Error('Love Letter chơi 2–4 người.');
  const n = players.length;
  const target = OPT_CHOICES.target.includes(+opts.target) ? +opts.target : TOKEN_TARGET[n];
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    phase: 'playing', /* 'playing' | 'ended' */
    players: players.map(p => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
      hand: [], discards: [], tokens: 0, alive: true, protected: false, peeks: {},
    })),
    deck: [], setAside: null, faceUp: [],
    turn: null, round: 1, target,
    winner: null, losers: [], endReason: null,
    log: [], startedAt: Date.now(), endedAt: null,
    seed: (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1),
  };
  startRound(s, null);
  return s;
}

/* bắt đầu 1 vòng: xào, úp 1 lá, 2 người thì lật 3 lá ngửa, chia 1 lá/người,
   người bắt đầu vòng bốc thêm 1 lá (cầm 2 lá) */
function startRound(s, firstPid) {
  s.deck = shuffleWith(s, buildDeck());
  s.setAside = s.deck.pop();
  s.faceUp = s.players.length === 2 ? [s.deck.pop(), s.deck.pop(), s.deck.pop()] : [];
  for (const p of s.players) {
    p.hand = [s.deck.pop()];
    p.discards = [];
    p.alive = true;
    p.protected = false;
    p.peeks = {};
  }
  const alive = s.players.filter(p => p.alive);
  s.turn = firstPid || alive[Math.floor(nextRand(s) * alive.length)].id;
  drawFor(s, s.turn);
  /* công bố đúng luật: vòng 1 bốc thăm ngẫu nhiên, từ vòng 2 người thắng vòng
     trước đi trước — nêu rõ tên người đi đầu */
  pushLog(s, `— Vòng ${s.round} bắt đầu (${s.players.length} người, cần ${s.target} dấu Yêu để thắng trận) — ${pOf(s, s.turn).name} đi trước${firstPid ? ' (thắng vòng trước)' : ' (bốc thăm ngẫu nhiên)'}. —`);
}

function drawFor(s, pid) {
  const p = pOf(s, pid);
  if (!p || !p.alive) return;
  if (s.deck.length) p.hand.push(s.deck.pop());
  else if (s.setAside) { p.hand.push(s.setAside); s.setAside = null; pushLog(s, `${p.name} bốc lá úp ngoài bàn (bộ bài đã hết).`); }
}

/* loại 1 người khỏi vòng: lá đang cầm vào đống bỏ */
function eliminate(s, p, why) {
  if (!p.alive) return;
  p.alive = false;
  p.protected = false;
  for (const c of p.hand) p.discards.push(c);
  p.hand = [];
  pushLog(s, `💥 ${p.name} bị loại (${why}).`, 'bad');
}

/* kiểm tra kết thúc vòng sau mỗi lượt; trả về true nếu vòng/trận đã xong */
function checkRoundEnd(s) {
  const alive = s.players.filter(p => p.alive);
  if (alive.length <= 1) {
    if (alive.length === 1) return endRound(s, [alive[0]], 'last');
    return endRound(s, [], 'allout');
  }
  if (s.deck.length === 0) {
    const best = Math.max(...alive.map(p => valueOf(p.hand[0])));
    let winners = alive.filter(p => valueOf(p.hand[0]) === best);
    if (winners.length > 1) {
      const sum = p => p.discards.reduce((t, c) => t + valueOf(c), 0);
      const top = Math.max(...winners.map(sum));
      winners = winners.filter(p => sum(p) === top);
    }
    return endRound(s, winners, 'showdown');
  }
  return false;
}

function endRound(s, winners, how) {
  for (const w of winners) {
    w.tokens++;
    pushLog(s, `🏆 ${w.name} thắng vòng ${s.round}${how === 'showdown' ? ` (lá cao nhất: ${nameOf(w.hand[0])})` : ''} — nhận 1 dấu Yêu (${w.tokens}/${s.target}).`, 'good');
  }
  if (winners.length === 0) pushLog(s, `Vòng ${s.round} không có người thắng.`, 'bad');
  const champ = s.players.find(p => p.tokens >= s.target);
  if (champ) {
    s.phase = 'ended';
    s.winner = champ.id;
    s.losers = s.players.filter(p => p.id !== champ.id).map(p => p.id);
    s.endReason = 'match';
    s.endedAt = Date.now();
    pushLog(s, `👑 ${champ.name} đủ ${s.target} dấu Yêu — thắng cả trận!`, 'good');
    s.seq++;
    return true;
  }
  s.round++;
  const first = winners.length ? winners[0].id : null;
  startRound(s, first);
  s.seq++;
  return true;
}

/* chuyển lượt cho người sống tiếp theo (theo vòng tròn), bốc bài cho họ */
function advanceTurn(s) {
  const n = s.players.length;
  let i = s.players.findIndex(p => p.id === s.turn);
  for (let k = 1; k <= n; k++) {
    const p = s.players[(i + k) % n];
    if (!p.alive) continue;
    p.protected = false; /* hết lượt bảo vệ khi tới lượt mình lần nữa */
    s.turn = p.id;
    drawFor(s, p.id);
    return;
  }
}

export function actors(s) {
  return s.phase === 'playing' && s.turn ? [s.turn] : [];
}

/* các lá hợp lệ được đánh lúc này (Nữ bá tước bắt buộc nếu cầm chung Vua/Hoàng tử) */
export function legalCards(s, pid) {
  const p = pOf(s, pid);
  if (!p || !p.alive || s.phase !== 'playing' || s.turn !== pid) return [];
  const kinds = p.hand.map(kindOf);
  if (kinds.includes('countess') && (kinds.includes('king') || kinds.includes('prince'))) {
    return p.hand.filter(c => kindOf(c) === 'countess');
  }
  return p.hand.slice();
}

export function applyAction(s, pid, act) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = pOf(s, pid);
  if (!me) return { ok: false, reason: 'Không có người chơi này.' };
  if (act.type === 'resign') {
    if (!me.alive) return { ok: false, reason: 'Bạn đã bị loại rồi.' };
    pushLog(s, `🏳️ ${me.name} xin thua.`, 'bad');
    /* xin thua = bỏ cả trận (giống Cờ Đam / Cờ Lật / Domino): người còn lại
       có nhiều dấu Yêu nhất thắng trận (hòa dấu thì người ngồi trước thắng).
       Không để vòng sau chia bài lại cho người đã xin thua rồi kẹt chờ lượt
       của họ — đó là lỗi khiến trận đấu máy đứng im sau khi xin thua. */
    const others = s.players.filter(p => p.id !== pid);
    let champ = others[0];
    for (const p of others) if (p.tokens > champ.tokens) champ = p;
    eliminate(s, me, 'xin thua');
    s.phase = 'ended'; s.winner = champ.id;
    s.losers = s.players.filter(p => p.id !== champ.id).map(p => p.id);
    s.endReason = 'resign'; s.endedAt = Date.now();
    pushLog(s, `👑 ${champ.name} thắng trận — ${me.name} xin thua!`, 'good');
    s.seq++;
    return { ok: true };
  }
  if (act.type !== 'play') return { ok: false, reason: 'Hành động không hợp lệ.' };
  if (s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  if (!me.alive) return { ok: false, reason: 'Bạn đã bị loại.' };
  const card = act.card;
  if (!card || !me.hand.includes(card)) return { ok: false, reason: 'Bạn không có lá này.' };
  const legal = legalCards(s, pid);
  if (!legal.includes(card)) return { ok: false, reason: 'Đang cầm Nữ bá tước chung với Quốc vương / Hoàng tử thì bắt buộc đánh Nữ bá tước.' };
  const kind = kindOf(card);
  let target = act.target ? pOf(s, act.target) : null;
  const needsTarget = ['guard', 'priest', 'baron', 'prince', 'king'].includes(kind);
  /* Hoàng tử không chọn ai thì mặc định chọn chính mình */
  if (kind === 'prince' && !target) target = me;
  if (needsTarget && !target) {
    /* còn người chọn được thì bắt buộc phải chọn; nếu mọi đối thủ đang
       được Thị nữ bảo vệ thì lá đánh ra không có hiệu ứng (luật gốc) */
    const anyValid = s.players.some(p => p.alive && p.id !== pid && !p.protected);
    if (anyValid) return { ok: false, reason: 'Lá này cần chọn 1 người.' };
  }
  if (target) {
    if (!target.alive) return { ok: false, reason: 'Người đó đã bị loại.' };
    if (kind !== 'prince' && target.id === pid) return { ok: false, reason: 'Không được chọn chính mình với lá này.' };
    if (target.protected && target.id !== pid) return { ok: false, reason: `${target.name} đang được Thị nữ bảo vệ.` };
  }
  if (kind === 'guard' && target) {
    const g = +act.guess;
    if (![2, 3, 4, 5, 6, 7, 8].includes(g)) return { ok: false, reason: 'Vệ binh chỉ đoán lá 2–8.' };
  }

  /* đánh lá: bỏ lá vào đống bỏ, còn 1 lá trên tay */
  me.hand = me.hand.filter(c => c !== card);
  me.discards.push(card);
  const info = CARD_INFO[kind];
  pushLog(s, `${me.name} đánh ${info.icon} ${info.name}.`);

  if (kind === 'guard') {
    if (!target) { pushLog(s, `🛡️ ${me.name} đánh Vệ binh nhưng không có ai để đoán — lá không có hiệu ứng.`); }
    else {
      const g = +act.guess;
      const held = target.hand[0];
      if (held && valueOf(held) === g) {
        pushLog(s, `🎯 Đoán đúng! ${target.name} đang cầm ${nameOf(held)} (${g}).`, 'good');
        eliminate(s, target, `Vệ binh đoán trúng ${nameOf(held)}`);
      } else {
        pushLog(s, `❌ Đoán sai — ${target.name} không cầm lá ${g}.`);
      }
    }
  } else if (kind === 'priest') {
    if (!target) { pushLog(s, `⛪ ${me.name} đánh Linh mục nhưng không có ai để xem — lá không có hiệu ứng.`); }
    else {
      const held = target.hand[0];
      me.peeks[target.id] = held ? kindOf(held) : null;
      pushLog(s, `⛪ ${me.name} xem bài của ${target.name} (chỉ ${me.name} thấy).`);
    }
  } else if (kind === 'baron') {
    if (!target) { pushLog(s, `⚖️ ${me.name} đánh Nam tước nhưng không có ai để so — lá không có hiệu ứng.`); }
    else {
      const myCard = me.hand[0], theirCard = target.hand[0];
      pushLog(s, `⚖️ So bài: ${me.name} (${nameOf(myCard)}) vs ${target.name} (${nameOf(theirCard)}).`);
      if (valueOf(myCard) > valueOf(theirCard)) eliminate(s, target, `Nam tước so bài thua ${nameOf(myCard)}`);
      else if (valueOf(theirCard) > valueOf(myCard)) eliminate(s, me, `Nam tước so bài thua ${nameOf(theirCard)}`);
      else pushLog(s, `🤝 Hòa — không ai bị loại.`);
    }
  } else if (kind === 'handmaid') {
    me.protected = true;
    pushLog(s, `🌸 ${me.name} được Thị nữ bảo vệ tới lượt sau.`);
  } else if (kind === 'prince') {
    const discarded = target.hand[0];
    target.hand = [];
    if (discarded) {
      target.discards.push(discarded);
      pushLog(s, `🤴 ${target.name} phải bỏ ${nameOf(discarded)} rồi bốc lá mới.`);
      if (kindOf(discarded) === 'princess') {
        eliminate(s, target, 'Hoàng tử bắt bỏ Công chúa');
      } else {
        drawFor(s, target.id);
      }
    }
  } else if (kind === 'king') {
    if (!target) { pushLog(s, `👑 ${me.name} đánh Quốc vương nhưng không có ai để đổi — lá không có hiệu ứng.`); }
    else {
      const myCard = me.hand[0], theirCard = target.hand[0];
      me.hand = theirCard ? [theirCard] : [];
      target.hand = myCard ? [myCard] : [];
      pushLog(s, `👑 ${me.name} đổi bài với ${target.name}.`);
    }
  } else if (kind === 'countess') {
    pushLog(s, `🎀 ${me.name} đánh Nữ bá tước (không có hiệu ứng).`);
  } else if (kind === 'princess') {
    eliminate(s, me, 'tự bỏ Công chúa');
  }

  s.seq++;
  if (checkRoundEnd(s)) return { ok: true };
  advanceTurn(s);
  s.seq++;
  return { ok: true };
}

export function viewFor(s, pid) {
  const me = pOf(s, pid);
  const ended = s.phase === 'ended';
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    round: s.round, target: s.target,
    turn: s.turn, deckCount: s.deck.length,
    setAside: null, /* lá úp không bao giờ lộ */
    faceUp: s.faceUp.slice(),
    players: s.players.map(p => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
      tokens: p.tokens, alive: p.alive, protected: p.protected,
      handCount: p.hand.length,
      /* tay bài chỉ hiện cho chính mình (hoặc khi ván đã xong thì hiện hết) */
      hand: (ended || (me && p.id === pid)) ? p.hand.slice() : [],
      discards: p.discards.slice(),
      peeks: (me && p.id === pid) ? { ...p.peeks } : {},
    })),
    winner: s.winner, losers: (s.losers || []).slice(), endReason: s.endReason,
    log: s.log.slice(), startedAt: s.startedAt, endedAt: s.endedAt,
    me: pid,
  };
}
