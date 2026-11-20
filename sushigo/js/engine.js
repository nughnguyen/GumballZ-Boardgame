// 🍣 Sushi Go – luật chơi (thuần logic, không chạm DOM).
// 2–5 người, 3 vòng, bộ 108 lá. Mỗi vòng chia mỗi người 10/9/8/7 lá
// (2/3/4/5 người); mỗi lượt mọi người cùng chọn 1 lá đặt xuống rồi
// chuyền tay (vòng 1 chuyền trái, vòng 2 chuyền phải, vòng 3 chuyền
// trái); hết tay thì hết vòng, tính điểm. Tempura cặp=5, Sashimi bộ
// 3=10, Há cảo 1/2/3/4/5+ = 1/3/6/10/15, Maki nhiều nhất=6 nhì=3
// (hòa thì chia đều, làm tròn xuống), Nigiri Cá hồi/Mực=3 Trứng=1,
// Wasabi nhân 3 lá Nigiri kế tiếp đặt lên nó, Đũa đã đặt xuống thì
// một lượt sau được đặt 2 lá cùng lúc và trả Đũa về tay. Pudding tính
// cuối trận (sau 3 vòng): nhiều nhất +6, ít nhất −6, hòa thì chia.
// Mọi quyết định ngẫu nhiên đều dùng LCG lưu trong state (giống
// Love Letter) để mọi máy cùng áp 1 hành động thì giống hệt nhau.
export const CARD_INFO = {
  tempura:    { name: 'Tempura',      icon: '🍤', desc: 'Mỗi cặp Tempura = 5 điểm.' },
  sashimi:    { name: 'Sashimi',      icon: '🐟', desc: 'Mỗi bộ 3 Sashimi = 10 điểm.' },
  dumpling:   { name: 'Há cảo',       icon: '🥟', desc: '1/2/3/4/5+ lá = 1/3/6/10/15 điểm.' },
  maki1:      { name: 'Maki ×1',      icon: '🍣', desc: '1 biểu tượng Maki.' },
  maki2:      { name: 'Maki ×2',      icon: '🍣', desc: '2 biểu tượng Maki.' },
  maki3:      { name: 'Maki ×3',      icon: '🍣', desc: '3 biểu tượng Maki.' },
  salmon:     { name: 'Nigiri Cá hồi', icon: '🍣', desc: '3 điểm (×3 nếu đặt lên Wasabi).' },
  squid:      { name: 'Nigiri Mực',   icon: '🦑', desc: '3 điểm (×3 nếu đặt lên Wasabi).' },
  egg:        { name: 'Nigiri Trứng', icon: '🍳', desc: '1 điểm (×3 nếu đặt lên Wasabi).' },
  pudding:    { name: 'Pudding',      icon: '🍮', desc: 'Cuối trận: nhiều nhất +6, ít nhất −6.' },
  wasabi:     { name: 'Wasabi',       icon: '🌶️', desc: 'Lá Nigiri kế tiếp đặt lên sẽ nhân 3 điểm.' },
  chopsticks: { name: 'Đũa',          icon: '🥢', desc: 'Đã đặt xuống rồi thì một lượt sau được đặt 2 lá cùng lúc, trả Đũa về tay.' },
};
export const DECK_SPEC = [
  ['tempura', 14], ['sashimi', 14], ['dumpling', 14],
  ['maki1', 6], ['maki2', 12], ['maki3', 8],
  ['salmon', 10], ['squid', 5], ['egg', 5],
  ['pudding', 10], ['wasabi', 6], ['chopsticks', 4],
];
export const HAND_SIZE = { 2: 10, 3: 9, 4: 8, 5: 7 };
export const MAKI_ICONS = { maki1: 1, maki2: 2, maki3: 3 };
export const NIGIRI_POINTS = { salmon: 3, squid: 3, egg: 1 };
export const DUMPLING_POINTS = [0, 1, 3, 6, 10, 15];
const NIGIRI_KINDS = ['salmon', 'squid', 'egg'];

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
const kindOf = id => id.slice(0, id.lastIndexOf('-'));
const pOf = (s, id) => s.players.find(p => p.id === id);
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < 2 || s.players.length > 5
    || !Array.isArray(s.deck) || typeof s.phase !== 'string'
    || typeof s.round !== 'number' || typeof s.turnNum !== 'number') {
    throw new Error('Trạng thái Sushi Go không hợp lệ.');
  }
  return s;
}
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

function buildDeck() {
  const d = [];
  for (const [kind, n] of DECK_SPEC) for (let i = 0; i < n; i++) d.push(`${kind}-${i}`);
  return d;
}

/* ---------- tính điểm ---------- */
/* điểm của 1 đống lá đã đặt (chưa tính Maki nhất/nhì và Pudding cuối trận) */
export function scorePlayed(played) {
  let tempura = 0, sashimi = 0, dumpling = 0, maki = 0, nigiri = 0, pudding = 0;
  for (const e of played) {
    const k = e.kind;
    if (k === 'tempura') tempura++;
    else if (k === 'sashimi') sashimi++;
    else if (k === 'dumpling') dumpling++;
    else if (k in MAKI_ICONS) maki += MAKI_ICONS[k];
    else if (k in NIGIRI_POINTS) nigiri += NIGIRI_POINTS[k] * (e.wasabi ? 3 : 1);
    else if (k === 'pudding') pudding++;
  }
  const points = Math.floor(tempura / 2) * 5 + Math.floor(sashimi / 3) * 10
    + DUMPLING_POINTS[Math.min(dumpling, 5)] + nigiri;
  return { points, maki, pudding, tempura, sashimi, dumpling, nigiri };
}
/* điểm vòng của mọi người (đã gồm Maki nhất/nhì); trả về [{points, makiPoints, base}] */
export function scoreRound(players) {
  const bases = players.map(p => scorePlayed(p.played));
  const icons = bases.map(b => b.maki);
  const maxIcons = Math.max(...icons, 0);
  const makiPoints = players.map(() => 0);
  if (maxIcons > 0) {
    const top = icons.map((v, i) => (v === maxIcons ? i : -1)).filter(i => i >= 0);
    const topEach = Math.floor(6 / top.length);
    for (const i of top) makiPoints[i] = topEach;
    if (top.length === 1) {
      /* chỉ có 1 người nhất mới có nhì */
      const rest = icons.filter(v => v > 0 && v < maxIcons);
      if (rest.length) {
        const second = Math.max(...rest);
        const secs = icons.map((v, i) => (v === second ? i : -1)).filter(i => i >= 0);
        const secEach = Math.floor(3 / secs.length);
        for (const i of secs) makiPoints[i] = secEach;
      }
    }
  }
  return players.map((p, i) => ({
    points: bases[i].points + makiPoints[i],
    makiPoints: makiPoints[i], base: bases[i].points,
    maki: bases[i].maki, pudding: bases[i].pudding,
  }));
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 2 || players.length > 5) throw new Error('Sushi Go chơi 2–5 người.');
  const n = players.length;
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    phase: 'playing', /* 'playing' | 'ended' */
    players: players.map(p => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
      hand: [], played: [], roundScores: [], total: 0, puddings: 0,
    })),
    deck: [], round: 1, turnNum: 1, handSize: HAND_SIZE[n], direction: 1,
    picks: {},
    winner: null, losers: [], endReason: null,
    log: [], startedAt: Date.now(), endedAt: null,
    seed: (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1),
  };
  dealRound(s);
  pushLog(s, `— Vòng 1 bắt đầu (${n} người, mỗi tay ${s.handSize} lá, chuyền sang trái) —`);
  return s;
}

/* chia bài vòng mới: xào cả bộ 108 lá, chia mỗi người handSize lá */
function dealRound(s) {
  s.deck = shuffleWith(s, buildDeck());
  for (const p of s.players) {
    p.hand = [];
    for (let i = 0; i < s.handSize; i++) p.hand.push(s.deck.pop());
    p.played = [];
  }
  s.turnNum = 1;
  s.picks = {};
  s.direction = s.round % 2 === 1 ? 1 : -1; /* vòng lẻ chuyền trái, vòng chẵn chuyền phải */
}

export function actors(s) {
  if (!s || s.phase !== 'playing') return [];
  return s.players.filter(p => !s.picks[p.id]).map(p => p.id);
}

export function legalCards(s, pid) {
  const p = pOf(s, pid);
  if (!p || s.phase !== 'playing' || s.picks[pid]) return [];
  return p.hand.slice();
}

/* người chơi có Đũa đã đặt xuống (chưa dùng) để được đặt 2 lá không */
export function hasChopsticksPlayed(s, pid) {
  const p = pOf(s, pid);
  return !!p && p.played.some(e => e.kind === 'chopsticks');
}
/* số Wasabi đang mở (đã đặt, chưa có Nigiri lên) của 1 người */
export function openWasabi(s, pid) {
  const p = pOf(s, pid);
  return p ? p.played.filter(e => e.kind === 'wasabi' && !e.used).length : 0;
}

export function applyAction(s, pid, act) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Trận đã kết thúc.' };
  const me = pOf(s, pid);
  if (!me) return { ok: false, reason: 'Không có người chơi này.' };
  if (act.type === 'resign') {
    pushLog(s, `🏳️ ${me.name} xin thua.`, 'bad');
    /* xin thua = bỏ cả trận (giống Love Letter): người còn lại có tổng
       điểm cao nhất (các vòng đã xong) thắng trận; hòa thì người ngồi
       trước thắng. */
    const others = s.players.filter(p => p.id !== pid);
    let champ = others[0];
    for (const p of others) if (p.total > champ.total) champ = p;
    s.phase = 'ended'; s.winner = champ.id;
    s.losers = s.players.filter(p => p.id !== champ.id).map(p => p.id);
    s.endReason = 'resign'; s.endedAt = Date.now();
    pushLog(s, `👑 ${champ.name} thắng trận — ${me.name} xin thua!`, 'good');
    s.seq++;
    return { ok: true };
  }
  if (act.type !== 'play') return { ok: false, reason: 'Hành động không hợp lệ.' };
  if (s.picks[pid]) return { ok: false, reason: 'Bạn đã chọn lá rồi — chờ mọi người.' };
  const card = act.card;
  if (!card || !me.hand.includes(card)) return { ok: false, reason: 'Bạn không có lá này.' };
  const card2 = act.card2 || null;
  if (card2) {
    if (!hasChopsticksPlayed(s, pid)) return { ok: false, reason: 'Muốn đặt 2 lá thì phải có Đũa đã đặt xuống từ lượt trước.' };
    if (card2 === card || !me.hand.includes(card2)) return { ok: false, reason: 'Lá thứ hai không có trên tay.' };
  }
  s.picks[pid] = card2 ? { card, card2 } : { card };
  s.seq++;
  if (Object.keys(s.picks).length === s.players.length) resolveTurn(s);
  return { ok: true };
}

/* mọi người đã chọn xong: đặt lá xuống, trả Đũa về tay (nếu dùng), chuyền tay */
function resolveTurn(s) {
  const n = s.players.length;
  for (const p of s.players) {
    const pick = s.picks[p.id];
    const names = [];
    for (const cid of [pick.card, pick.card2].filter(Boolean)) {
      const kind = kindOf(cid);
      p.hand = p.hand.filter(c => c !== cid);
      const entry = { id: cid, kind };
      if (NIGIRI_KINDS.includes(kind)) {
        /* Nigiri đặt lên Wasabi đang mở thì nhân 3 */
        const w = p.played.find(e => e.kind === 'wasabi' && !e.used);
        if (w) { w.used = true; entry.wasabi = true; }
      }
      p.played.push(entry);
      names.push(`${CARD_INFO[kind].icon} ${CARD_INFO[kind].name}`);
    }
    if (pick.card2) {
      /* trả 1 Đũa đã đặt xuống về tay */
      const idx = p.played.findIndex(e => e.kind === 'chopsticks');
      if (idx >= 0) {
        const [chop] = p.played.splice(idx, 1);
        p.hand.push(chop.id);
      }
    }
    pushLog(s, `${p.name} đặt ${names.join(' + ')}${pick.card2 ? ' (dùng Đũa 🥢)' : ''}.`);
  }
  s.picks = {};
  s.seq++;
  if (s.turnNum >= s.handSize) { endRound(s); return; }
  /* chuyền tay: +1 = sang trái (tay sang người kế tiếp), −1 = sang phải */
  const oldHands = s.players.map(p => p.hand);
  for (let i = 0; i < n; i++) {
    const from = (i - s.direction + n) % n;
    s.players[i].hand = oldHands[from];
  }
  s.turnNum++;
}

function endRound(s) {
  const res = scoreRound(s.players);
  for (let i = 0; i < s.players.length; i++) {
    const p = s.players[i], r = res[i];
    p.roundScores.push(r.points);
    p.total += r.points;
    p.puddings += r.pudding;
    pushLog(s, `📊 Vòng ${s.round}: ${p.name} +${r.points} điểm (bài ${r.base}${r.makiPoints ? `, Maki +${r.makiPoints}` : ''}${r.pudding ? `, Pudding ×${r.pudding}` : ''}) — tổng ${p.total}.`, 'good');
  }
  s.seq++;
  if (s.round >= 3) { endMatch(s); return; }
  s.round++;
  dealRound(s);
  pushLog(s, `— Vòng ${s.round} bắt đầu (mỗi tay ${s.handSize} lá, chuyền sang ${s.direction === 1 ? 'trái' : 'phải'}) —`);
}

function endMatch(s) {
  /* Pudding cuối trận: nhiều nhất +6, ít nhất −6; hòa thì chia đều (làm tròn xuống) */
  const counts = s.players.map(p => p.puddings);
  const maxP = Math.max(...counts), minP = Math.min(...counts);
  if (maxP > minP) {
    const tops = s.players.filter(p => p.puddings === maxP);
    const bots = s.players.filter(p => p.puddings === minP);
    const topEach = Math.floor(6 / tops.length);
    const botEach = Math.floor(6 / bots.length);
    for (const p of tops) { p.total += topEach; pushLog(s, `🍮 ${p.name} nhiều Pudding nhất (+${topEach}).`, 'good'); }
    for (const p of bots) { p.total -= botEach; pushLog(s, `🍮 ${p.name} ít Pudding nhất (−${botEach}).`, 'bad'); }
  } else {
    pushLog(s, '🍮 Mọi người hòa Pudding — không ai được/mất điểm.');
  }
  let champ = s.players[0];
  for (const p of s.players) if (p.total > champ.total) champ = p;
  s.phase = 'ended';
  s.winner = champ.id;
  s.losers = s.players.filter(p => p.id !== champ.id).map(p => p.id);
  s.endReason = 'match';
  s.endedAt = Date.now();
  pushLog(s, `👑 ${champ.name} thắng trận với ${champ.total} điểm!`, 'good');
  s.seq++;
}

export function viewFor(s, pid) {
  const me = pOf(s, pid);
  const ended = s.phase === 'ended';
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    round: s.round, turnNum: s.turnNum, handSize: s.handSize, direction: s.direction,
    deckCount: s.deck.length,
    players: s.players.map(p => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
      total: p.total, roundScores: p.roundScores.slice(), puddings: p.puddings,
      handCount: p.hand.length,
      /* tay bài chỉ hiện cho chính mình (hoặc khi trận đã xong thì hiện hết) */
      hand: (ended || (me && p.id === pid)) ? p.hand.slice() : [],
      /* bài đã đặt thì ai cũng thấy; đã chọn hay chưa thì ai cũng thấy */
      played: p.played.map(e => ({ ...e })),
      picked: !!s.picks[p.id],
      chopsticks: p.played.some(e => e.kind === 'chopsticks'),
      wasabiOpen: p.played.filter(e => e.kind === 'wasabi' && !e.used).length,
    })),
    winner: s.winner, losers: (s.losers || []).slice(), endReason: s.endReason,
    log: s.log.slice(), startedAt: s.startedAt, endedAt: s.endedAt,
    me: pid,
  };
}
