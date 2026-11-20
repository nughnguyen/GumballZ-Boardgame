// 🌹💀 Skull – luật chơi (thuần logic, không chạm DOM).
// 3–6 người, mỗi người 4 đĩa úp: 3 hoa hồng + 1 đầu lâu. Mỗi vòng 3 giai
// đoạn: (1) ĐẶT — lần lượt mỗi người đặt úp 1 đĩa lên thảm của mình;
// (2) RA GIÁ — người sau người đặt cuối cùng bắt đầu: lần lượt ra giá
// (tối thiểu 1, phải cao hơn giá trước) hoặc bỏ; tới khi chỉ còn 1 người
// chưa bỏ thì người đó thắng giá; (3) LẬT — người thắng giá lật đúng số
// đĩa đã ra giá, bắt đầu bằng đĩa trên cùng của CHÍNH MÌNH, rồi đĩa trên
// cùng của thảm bất kỳ (chọn thảm nào cũng được, thứ tự nào cũng được).
// Toàn hoa hồng thì +1 điểm; gặp đầu lâu thì không điểm và MẤT 1 đĩa:
// các đĩa đã đặt trả về tay, rồi 1 đĩa của người đó bị chọn ngẫu nhiên
// (xào úp, người khác chọn) và bỏ đi vĩnh viễn. Ai được 2 điểm thì
// thắng trận; ai mất hết đĩa thì bị loại (chỉ còn 1 người thì người đó
// thắng). Mọi quyết định ngẫu nhiên đều dùng LCG lưu trong state để mọi
// máy cùng áp 1 hành động thì giống hệt nhau.

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 6;
export const POINTS_TO_WIN = 2;

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
    || typeof s.phase !== 'string' || typeof s.round !== 'number' || typeof s.turnIdx !== 'number'
    || !['place', 'bid', 'flip'].includes(s.stage) || !s.bid || typeof s.bid.amount !== 'number') {
    throw new Error('Trạng thái Skull không hợp lệ.');
  }
  return s;
}
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

export const isSkull = c => typeof c === 'string' && c.startsWith('skull');
export const isRose = c => typeof c === 'string' && c.startsWith('rose');
const alivePlayers = s => s.players.filter(p => p.alive);
const totalPlaced = s => alivePlayers(s).reduce((t, p) => t + p.placed.length, 0);
/* chỉ số ghế kế tiếp còn sống sau fromIdx (đi vòng) */
function nextAliveIdx(s, fromIdx) {
  const n = s.players.length;
  for (let k = 1; k <= n; k++) {
    const i = (fromIdx + k) % n;
    if (s.players[i].alive) return i;
  }
  return fromIdx;
}

function rankPlayers(s, list) {
  return [...list].sort((a, b) =>
    b.points - a.points || s.players.indexOf(a) - s.players.indexOf(b));
}

function endMatch(s, reason, winnerId) {
  s.phase = 'ended';
  s.endReason = reason;
  s.endedAt = Date.now();
  const ranked = rankPlayers(s, s.players);
  s.winner = winnerId || ranked[0].id;
  s.losers = s.players.filter(x => x.id !== s.winner).map(x => x.id);
  const w = pOf(s, s.winner);
  pushLog(s, `${w.name} thắng trận!`, 'win');
}

/* trả mọi đĩa đã đặt về tay của chủ nó — cả đĩa đã lật (đĩa lật rồi đã
   pop khỏi placed nên phải trả riêng từ flip.flipped, nếu không sẽ mất đĩa) */
function returnDiscs(s) {
  if (s.flip) {
    for (const f of s.flip.flipped) {
      const owner = pOf(s, f.pid);
      if (owner) owner.hand.push(f.card);
    }
  }
  for (const p of s.players) {
    if (p.placed.length) { p.hand.push(...p.placed); p.placed = []; }
  }
}

/* mở 1 vòng mới: dọn thảm, giai đoạn đặt, lượt bắt đầu xoay ghế */
function startRound(s, round) {
  s.round = round;
  s.stage = 'place';
  s.bid = { amount: 0, bidder: null, passed: [] };
  /* KHÔNG gọi returnDiscs ở đây: đĩa đã được trả ở cuối vòng trước
     (endRoundSuccess/endRoundSkull, khi flip còn giữ danh sách đĩa đã
     lật); gọi lại ở đây sẽ trả trùng đĩa lật */
  s.flip = null;
  /* vòng 1 bắt đầu ở ghế 0; các vòng sau bắt đầu ở ghế còn sống kế tiếp
     sau người bắt đầu vòng trước (xoay ghế) */
  if (round === 1) {
    s.firstIdx = 0;
  } else {
    s.firstIdx = nextAliveIdx(s, s.firstIdx);
  }
  s.turnIdx = s.firstIdx;
  pushLog(s, `— Vòng ${round} bắt đầu: ${alivePlayers(s).length} người, mỗi người đặt úp 1 đĩa. —`);
}

/* vòng kết thúc có điểm: người thắng giá +1 điểm */
function endRoundSuccess(s) {
  const bidder = pOf(s, s.flip.bidder);
  bidder.points++;
  pushLog(s, `🌹 ${bidder.name} lật đủ ${s.flip.target} hoa hồng — +1 điểm (đang có ${bidder.points})!`, 'win');
  returnDiscs(s);
  if (bidder.points >= POINTS_TO_WIN) {
    endMatch(s, 'match', bidder.id);
    return;
  }
  startRound(s, s.round + 1);
}

/* vòng kết thúc vì gặp đầu lâu: người thắng giá mất 1 đĩa ngẫu nhiên
   trong tay (xào úp rồi chọn — dùng LCG trong state để đồng bộ) */
function endRoundSkull(s) {
  const bidder = pOf(s, s.flip.bidder);
  const lostCard = s.flip.flipped.find(f => isSkull(f.card));
  pushLog(s, `💀 ${bidder.name} lật trúng đầu lâu của ${pOf(s, lostCard.pid).name} — không điểm, mất 1 đĩa!`, 'info');
  returnDiscs(s);
  /* tay bài sau khi trả đĩa: xào bằng LCG rồi bỏ 1 đĩa ngẫu nhiên */
  const idx = Math.floor(nextRand(s) * bidder.hand.length);
  const lost = bidder.hand.splice(idx, 1)[0];
  bidder.lost.push(lost);
  pushLog(s, `${bidder.name} mất 1 đĩa (còn ${bidder.hand.length} đĩa).`, 'info');
  if (bidder.hand.length === 0) {
    bidder.alive = false;
    pushLog(s, `💀 ${bidder.name} hết đĩa — bị loại khỏi trận!`, 'info');
    const alive = alivePlayers(s);
    if (alive.length === 1) {
      endMatch(s, 'match', alive[0].id);
      return;
    }
  }
  startRound(s, s.round + 1);
}

export function createGame(players, opts = {}) {
  if (!players || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error('Skull chơi 3–6 người.');
  }
  const seed = typeof opts.seed === 'number' ? opts.seed : (Date.now() % 2147483647);
  const s = {
    gid: 'g' + seed.toString(36) + '-' + (seed % 9973).toString(36), seq: 0,
    phase: 'playing', /* 'playing' | 'ended' */
    seed,
    players: players.map((p, i) => ({
      id: p.id, name: p.name || ('Người ' + (i + 1)),
      isBot: !!p.isBot, level: p.level || null, local: !!p.local,
      hand: ['rose-1', 'rose-2', 'rose-3', 'skull-1'],
      placed: [], points: 0, lost: [], alive: true,
    })),
    round: 1, stage: 'place', turnIdx: 0, firstIdx: 0,
    bid: { amount: 0, bidder: null, passed: [] },
    flip: null,
    winner: null, losers: [], endReason: null,
    startedAt: Date.now(), endedAt: 0, log: [],
  };
  startRound(s, 1);
  return s;
}

export function applyAction(s, pid, act) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Trận đã kết thúc.' };
  const p = pOf(s, pid);
  if (!p) return { ok: false, reason: 'Không tìm thấy người chơi.' };
  if (!act || typeof act.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };

  /* ---------- xin thua: kết thúc trận luôn ---------- */
  if (act.type === 'resign') {
    const others = s.players.filter(x => x.id !== pid && x.alive);
    const ranked = others.length ? rankPlayers(s, others) : [p];
    endMatch(s, 'resign', ranked[0].id);
    s.seq++;
    pushLog(s, `${p.name} xin thua. ${ranked[0].name} thắng trận!`, 'resign');
    return { ok: true };
  }

  /* chỉ người tới lượt mới được đi */
  if (s.players[s.turnIdx].id !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };

  /* ---------- ĐẶT 1 đĩa úp ---------- */
  if (act.type === 'place') {
    if (s.stage !== 'place') return { ok: false, reason: 'Giờ không phải giai đoạn đặt đĩa.' };
    const card = String(act.card);
    const idx = p.hand.indexOf(card);
    if (idx < 0) return { ok: false, reason: 'Đĩa không có trên tay bạn.' };
    p.hand.splice(idx, 1);
    p.placed.push(card);
    s.seq++;
    pushLog(s, `${p.name} đặt úp 1 đĩa.`);
    /* mọi người còn sống đều đã đặt → sang giai đoạn ra giá, người sau
       người đặt cuối cùng ra giá trước */
    if (alivePlayers(s).every(x => x.placed.length >= 1)) {
      s.stage = 'bid';
      s.bid = { amount: 0, bidder: null, passed: [] };
      s.turnIdx = nextAliveIdx(s, s.turnIdx);
      pushLog(s, `Mọi người đã đặt xong (${totalPlaced(s)} đĩa trên bàn) — tới giai đoạn ra giá.`);
    } else {
      s.turnIdx = nextAliveIdx(s, s.turnIdx);
    }
    return { ok: true };
  }

  /* ---------- RA GIÁ ---------- */
  if (act.type === 'bid') {
    if (s.stage !== 'bid') return { ok: false, reason: 'Giờ không phải giai đoạn ra giá.' };
    if (s.bid.passed.includes(pid)) return { ok: false, reason: 'Bạn đã bỏ giá rồi.' };
    const amount = act.amount;
    if (!Number.isInteger(amount) || amount <= s.bid.amount) {
      return { ok: false, reason: `Giá phải cao hơn giá hiện tại (${s.bid.amount}).` };
    }
    const max = totalPlaced(s);
    if (amount > max) return { ok: false, reason: `Không thể ra giá quá số đĩa trên bàn (${max}).` };
    s.bid.amount = amount;
    s.bid.bidder = pid;
    s.seq++;
    pushLog(s, `${p.name} ra giá ${amount} đĩa.`);
    /* ra giá bằng đúng tổng số đĩa trên bàn thì không ai trả cao hơn được */
    if (amount >= max) {
      s.stage = 'flip';
      s.flip = { bidder: pid, target: amount, flipped: [] };
      s.turnIdx = s.players.findIndex(x => x.id === pid);
      pushLog(s, `${p.name} ra giá tối đa ${amount} — thắng giá, bắt đầu lật!`);
      return { ok: true };
    }
    /* chuyển lượt cho người chưa bỏ tiếp theo (không phải chính mình);
       nếu không còn ai thì người vừa ra giá thắng giá luôn */
    const n = s.players.length;
    let next = -1;
    for (let k = 1; k <= n; k++) {
      const i = (s.turnIdx + k) % n;
      const cand = s.players[i];
      if (cand.alive && !s.bid.passed.includes(cand.id) && cand.id !== pid) { next = i; break; }
    }
    if (next < 0) {
      s.stage = 'flip';
      s.flip = { bidder: pid, target: amount, flipped: [] };
      s.turnIdx = s.players.findIndex(x => x.id === pid);
      pushLog(s, `Mọi người đều đã bỏ — ${p.name} thắng giá ${amount}, bắt đầu lật!`);
      return { ok: true };
    }
    s.turnIdx = next;
    return { ok: true };
  }

  /* ---------- BỎ GIÁ ---------- */
  if (act.type === 'pass') {
    if (s.stage !== 'bid') return { ok: false, reason: 'Giờ không phải giai đoạn ra giá.' };
    /* luật nhà: chưa có giá nào thì không được bỏ — phải có người mở giá
       ít nhất 1, nếu không vòng sẽ không có người thắng giá để lật */
    if (s.bid.amount === 0) return { ok: false, reason: 'Chưa có giá nào — người đầu tiên phải ra giá ít nhất 1.' };
    if (s.bid.passed.includes(pid)) return { ok: false, reason: 'Bạn đã bỏ giá rồi.' };
    s.bid.passed.push(pid);
    s.seq++;
    pushLog(s, `${p.name} bỏ giá.`);
    const remaining = alivePlayers(s).filter(x => !s.bid.passed.includes(x.id));
    if (remaining.length === 1) {
      const winner = remaining[0];
      s.stage = 'flip';
      s.flip = { bidder: winner.id, target: s.bid.amount, flipped: [] };
      s.turnIdx = s.players.findIndex(x => x.id === winner.id);
      pushLog(s, `${winner.name} thắng giá ${s.bid.amount} (mọi người khác đã bỏ), bắt đầu lật!`);
      return { ok: true };
    }
    const n = s.players.length;
    for (let k = 1; k <= n; k++) {
      const i = (s.turnIdx + k) % n;
      const cand = s.players[i];
      if (cand.alive && !s.bid.passed.includes(cand.id)) { s.turnIdx = i; break; }
    }
    return { ok: true };
  }

  /* ---------- LẬT 1 ĐĨA ---------- */
  if (act.type === 'flip') {
    if (s.stage !== 'flip') return { ok: false, reason: 'Giờ không phải giai đoạn lật đĩa.' };
    if (!s.flip || s.flip.bidder !== pid) return { ok: false, reason: 'Chỉ người thắng giá mới được lật.' };
    const target = pOf(s, act.target);
    if (!target || !target.alive) return { ok: false, reason: 'Không có người chơi này.' };
    if (!target.placed.length) return { ok: false, reason: `${target.name} không còn đĩa nào trên thảm để lật.` };
    /* lượt lật đầu tiên bắt buộc là đĩa trên cùng của chính mình */
    if (s.flip.flipped.length === 0 && target.id !== pid) {
      return { ok: false, reason: 'Lượt lật đầu tiên phải là đĩa của chính bạn.' };
    }
    const card = target.placed.pop();
    s.flip.flipped.push({ pid: target.id, card });
    s.seq++;
    pushLog(s, `${p.name} lật đĩa của ${target.name}: ${isSkull(card) ? '💀 ĐẦU LÂU!' : '🌹 hoa hồng.'}`, isSkull(card) ? 'info' : '');
    if (isSkull(card)) {
      endRoundSkull(s);
      return { ok: true };
    }
    if (s.flip.flipped.length >= s.flip.target) {
      endRoundSuccess(s);
      return { ok: true };
    }
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
  if (!p || !p.alive) return [];
  if (s.players[s.turnIdx].id !== pid) return [];
  const out = [];
  if (s.stage === 'place') {
    for (const card of p.hand) out.push({ type: 'place', card });
  } else if (s.stage === 'bid') {
    const max = totalPlaced(s);
    for (let a = s.bid.amount + 1; a <= max; a++) out.push({ type: 'bid', amount: a });
    if (s.bid.amount > 0) out.push({ type: 'pass' });
  } else if (s.stage === 'flip') {
    if (s.flip && s.flip.bidder === pid) {
      if (s.flip.flipped.length === 0) {
        if (p.placed.length) out.push({ type: 'flip', target: pid });
      } else {
        for (const t of alivePlayers(s)) {
          if (t.placed.length) out.push({ type: 'flip', target: t.id });
        }
      }
    }
  }
  return out;
}

export function viewFor(s, pid) {
  const me = pOf(s, pid);
  const ended = s.phase === 'ended';
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, round: s.round, stage: s.stage,
    turn: s.players[s.turnIdx] ? s.players[s.turnIdx].id : null,
    firstIdx: s.firstIdx,
    bid: { amount: s.bid.amount, bidder: s.bid.bidder, passed: s.bid.passed.slice() },
    flip: s.flip ? { bidder: s.flip.bidder, target: s.flip.target, flipped: s.flip.flipped.map(f => ({ ...f })) } : null,
    totalPlaced: totalPlaced(s),
    players: s.players.map(p => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
      points: p.points, alive: p.alive,
      handCount: p.hand.length,
      /* đĩa trên tay chỉ mình biết (trừ khi trận đã kết thúc) */
      hand: (ended || (me && p.id === pid)) ? p.hand.slice() : [],
      placedCount: p.placed.length,
      /* đĩa đã đặt: chủ nó biết là đĩa nào, người khác chỉ thấy mặt úp */
      placed: (ended || (me && p.id === pid)) ? p.placed.slice() : p.placed.map(() => 'back'),
      lostCount: p.lost.length,
      lost: (ended || (me && p.id === pid)) ? p.lost.slice() : [],
    })),
    winner: s.winner, losers: (s.losers || []).slice(), endReason: s.endReason,
    log: s.log.slice(), startedAt: s.startedAt, endedAt: s.endedAt,
    me: pid,
  };
}
