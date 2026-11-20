// 🎲 Backgammon — engine thuần logic (seeded, KHÔNG dùng Math.random).
//
// LUẬT CHUẨN ÁP DỤNG (theo luật Backgammon cổ điển / USBGF):
// - 2 người, bàn 24 điểm, mỗi người 15 quân. Điểm đánh số 1–24 (trong
//   code là chỉ số 0–23). Người p0 (Đỏ) đi từ điểm 24 về 1 rồi ra ngoài;
//   người p1 (Xanh) đi từ điểm 1 lên 24 rồi ra ngoài. Sân nhà p0 là
//   điểm 1–6 (chỉ số 0–5), sân nhà p1 là điểm 19–24 (chỉ số 18–23).
// - Thế cờ đầu chuẩn: mỗi bên 2 quân ở điểm 24 (p0) / 1 (p1), 5 quân ở
//   điểm 13 / 12, 3 quân ở điểm 8 / 17, 5 quân ở điểm 6 / 19.
// - Mỗi lượt gieo 2 xúc xắc; ra đôi thì được 4 nước bằng số đó. Mỗi
//   xúc xắc là 1 nước đi (1 quân đi đúng số điểm đó). Điểm đến phải
//   TRỐNG, có quân mình, hoặc đúng 1 quân địch (đánh trúng = blot).
// - PHẢI DÙNG TỐI ĐA số xúc xắc có thể: nếu chỉ dùng được 1 trong 2
//   xúc xắc thì BẮT BUỘC dùng xúc xắc lớn hơn. Engine liệt kê mọi chuỗi
//   nước đi đầy đủ và chỉ cho phép nước đầu của các chuỗi dài nhất
//   (chuỗi dài 1 thì chỉ giữ chuỗi dùng xúc xắc lớn nhất).
// - Đánh trúng: quân địch bị đánh trúng lên "bar" (vạch giữa). Người có
//   quân trên bar BẮT BUỘC phải vào lại trước (vào sân nhà của địch,
//   theo xúc xắc), không được đi quân khác khi bar còn quân. Nếu mọi
//   cửa vào đều bị chặn (2+ quân địch) thì mất lượt.
// - Ra quân (bear off): khi cả 15 quân đã về sân nhà thì được ra quân:
//   xúc xắc đúng số điểm, HOẶC xúc xắc lớn hơn khi không còn quân nào
//   ở điểm cao hơn trong sân nhà.
// - Thắng: ra hết 15 quân trước. Gammon = thắng khi địch chưa ra quân
//   nào (×2); Backgammon = thắng khi địch chưa ra quân nào VÀ còn quân
//   trên bar hoặc trong sân nhà của mình (×3). Ghi winType vào cuối ván.
// - Xúc xắc gấp đôi (doubling cube): bắt đầu ×1 ở giữa; trước khi gieo
//   xúc xắc, người đang giữ cube (hoặc bất kỳ ai khi cube ở giữa) được
//   đề nghị gấp đôi; đối thủ chấp nhận (cube về tay họ, giá trị ×2) hoặc
//   từ chối (người đề nghị thắng ngay với giá trị cube hiện tại).
// - Xin thua kết thúc TRẬN ngay; người còn lại thắng.
// - LƯỢT ĐẦU: người đi trước chọn ngẫu nhiên có hạt giống (nhiều bản
//   digital làm vậy thay cho nghi thức mỗi bên gieo 1 xúc xắc để quyết
//   định người đi trước).
// - BẾ TẮC (luật nhà, van an toàn): nếu ván kéo quá 1500 lượt thì kết
//   thúc, người ra nhiều quân hơn thắng (hòa thì ít pip hơn thắng) —
//   trên thực tế không xảy ra, chỉ để ván không bao giờ kẹt vĩnh viễn.
//
// MÔ HÌNH:
// - s.points[24]: {owner: pid|null, count} — quân trên từng điểm.
// - Quân mỗi người: player.bar (trên vạch), player.off (đã ra ngoài),
//   player.hits (số quân địch đã đánh trúng trong ván), player.turns,
//   player.score (= off, số quân đã ra).
// - Xúc xắc: s.dice = [a, b] đã gieo; s.diceLeft = các giá trị còn dùng
//   được (đôi → 4 giá trị). s.step: 'roll' (chưa gieo) | 'move' (đang
//   đi) | 'double' (đang chờ trả lời gấp đôi).
// - RNG: LCG lưu trong s._rng (số nguyên, serialize được) — 2 bản sao
//   cùng seed cho cùng 1 dãy xúc xắc, nên net lockstep byte-identical.
// - viewFor công khai bàn + xúc xắc (xúc xắc là thông tin công khai) —
//   chỉ giấu _seed/_rng; không có trường `you`.

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 2;
export const POINTS = 24;
export const CHECKERS = 15;
export const MAX_TURNS = 1500;

export const PLAYER_COLORS = ['#E05D5D', '#5B8DEF'];
export const PLAYER_EMOJI = ['🔴', '🔵'];
export const PLAYER_COLOR_NAME = ['đỏ', 'xanh dương'];

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- trạng thái ván ---------- */
function log(s, text, cls) {
  s.log.push({ text, kind: cls || '' });
  if (s.log.length > 120) s.log.splice(0, s.log.length - 120);
}
const player = (s, pid) => s.players.find(p => p.id === pid);
/* p0 đi -1 (24→1), p1 đi +1 (1→24) */
const dirOf = pl => (pl.dir === -1 ? -1 : 1);
/* số pip còn lại để ra quân của 1 quân ở điểm idx (bar = 25) */
export function pipsOfPoint(pl, idx) {
  if (idx === 'bar') return 25;
  return pl.dir === -1 ? idx + 1 : POINTS - idx;
}
export function pipCount(pl, points) {
  let n = pl.bar * 25;
  for (let i = 0; i < POINTS; i++) {
    const pt = points[i];
    if (pt.owner === pl.id) n += pt.count * pipsOfPoint(pl, i);
  }
  return n;
}
/* mọi quân của pl đã về sân nhà chưa (bar phải trống) */
function allInHome(pl, points) {
  if (pl.bar > 0) return false;
  const lo = pl.dir === -1 ? 0 : 18;
  const hi = pl.dir === -1 ? 5 : 23;
  for (let i = 0; i < POINTS; i++) {
    const pt = points[i];
    if (pt.owner === pl.id && (i < lo || i > hi)) return false;
  }
  return true;
}
/* còn quân nào của pl ở điểm CAO HƠN `from` trong sân nhà không?
   (p0: điểm cao hơn = chỉ số lớn hơn; p1: chỉ số nhỏ hơn) */
function hasCheckerHigher(pl, points, from) {
  for (let i = 0; i < POINTS; i++) {
    const pt = points[i];
    if (!pt.owner || pt.owner !== pl.id) continue;
    if (pl.dir === -1 && i > from) return true;
    if (pl.dir === 1 && i < from) return true;
  }
  return false;
}

export function createGame(players, opts = {}) {
  if (!players || players.length !== 2) {
    throw new Error('Backgammon cần đúng 2 người chơi');
  }
  const seed = opts.seed == null ? (Date.now() % 2147483647) : opts.seed;
  const plist = players.map((p, i) => (typeof p === 'string' ? { id: 'p' + i, name: p } : p));
  const points = Array.from({ length: POINTS }, () => ({ owner: null, count: 0 }));
  const put = (idx, pid, n) => { points[idx] = { owner: pid, count: n }; };
  /* thế cờ đầu chuẩn (đối xứng qua tâm bàn: điểm p ↔ 25-p) */
  put(23, plist[0].id, 2); put(12, plist[0].id, 5); put(7, plist[0].id, 3); put(5, plist[0].id, 5);
  put(0, plist[1].id, 2); put(11, plist[1].id, 5); put(16, plist[1].id, 3); put(18, plist[1].id, 5);
  const statePlayers = plist.map((p, i) => ({
    id: p.id, name: p.name || ('Người ' + (i + 1)),
    isBot: !!p.isBot, local: !!p.local, level: p.level || null,
    color: PLAYER_COLORS[i], emoji: PLAYER_EMOJI[i],
    dir: i === 0 ? -1 : 1,
    bar: 0, off: 0, hits: 0, turns: 0, score: 0,
  }));
  const rng = mulberry32(seed);
  const firstIdx = Math.floor(rng() * 2);
  const s = {
    gid: 'bg-' + seed,
    seq: 0, phase: 'playing', turnIdx: firstIdx, turnCount: 0, round: 1,
    step: 'roll', dice: [], diceLeft: [],
    points,
    players: statePlayers,
    cube: { value: 1, owner: null },
    doubleOffer: null,
    winner: null, winners: [], losers: [], endReason: null, endCause: null,
    final: null,
    log: [], startedAt: Date.now(), endedAt: 0, _seed: seed,
    _rng: Math.floor(rng() * 2147483647),
  };
  s.turn = s.players[firstIdx].id;
  log(s, `🎲 Ván bắt đầu — ${statePlayers[firstIdx].name} đi trước (chọn ngẫu nhiên). Ra hết 15 quân trước thì thắng.`, 'info');
  return s;
}

/* ---------- RNG có hạt giống (LCG, serialize được) ---------- */
function nextRand(s) {
  /* LCG 32-bit không dấu: Math.imul có thể trả số âm nên phải >>> 0 */
  s._rng = (Math.imul(s._rng, 1103515245) + 12345) >>> 0;
  return s._rng / 4294967296;
}
function rollDie(s) { return 1 + Math.floor(nextRand(s) * 6); }

/* ---------- liệt kê nước đi ---------- */
/* 1 nước đi đơn (1 xúc xắc) hợp lệ với diceLeft hiện tại.
   Trả về [{from, to, die}] — from: chỉ số điểm | 'bar'; to: chỉ số | 'off'. */
function singleMoves(v, pid, diceLeft) {
  const me = v.players.find(p => p.id === pid);
  if (!me) return [];
  const out = [];
  const uniqDice = [...new Set(diceLeft)].sort((a, b) => a - b);
  const dir = me.dir;
  const inHome = allInHome(me, v.points);
  /* có quân trên bar: BẮT BUỘC vào lại trước, không đi quân khác */
  if (me.bar > 0) {
    for (const d of uniqDice) {
      const entry = dir === -1 ? POINTS - d : d - 1;
      const pt = v.points[entry];
      if (!pt.owner || pt.owner === pid || pt.count === 1) {
        out.push({ type: 'move', from: 'bar', to: entry, die: d });
      }
    }
    return out;
  }
  for (let from = 0; from < POINTS; from++) {
    const pt = v.points[from];
    if (!pt.owner || pt.owner !== pid) continue;
    for (const d of uniqDice) {
      const to = from + dir * d;
      if (to >= 0 && to < POINTS) {
        const dest = v.points[to];
        if (!dest.owner || dest.owner === pid || dest.count === 1) {
          out.push({ type: 'move', from, to, die: d });
        }
      } else if (inHome) {
        /* ra quân: đúng số, hoặc lớn hơn khi không còn quân ở điểm cao hơn */
        const dist = pipsOfPoint(me, from);
        if (d === dist) out.push({ type: 'move', from, to: 'off', die: d });
        else if (d > dist && !hasCheckerHigher(me, v.points, from)) {
          out.push({ type: 'move', from, to: 'off', die: d });
        }
      }
    }
  }
  return out;
}
function removeOneDice(diceLeft, die) {
  const a = diceLeft.slice();
  const i = a.indexOf(die);
  if (i >= 0) a.splice(i, 1);
  return a;
}
/* mô phỏng 1 nước đi đơn trên bản sao của view (không sửa view gốc);
   bot dùng để đánh giá chuỗi nước đi đầy đủ. */
export function applyMoveToView(v, pid, m) {
  const points = v.points.map(p => ({ owner: p.owner, count: p.count }));
  const players = v.players.map(p => ({ ...p }));
  const me = players.find(p => p.id === pid);
  const opp = players.find(p => p.id !== pid);
  if (m.from === 'bar') {
    me.bar--;
  } else {
    const pt = points[m.from];
    pt.count--;
    if (pt.count === 0) pt.owner = null;
  }
  if (m.to === 'off') {
    me.off++;
  } else {
    const dest = points[m.to];
    if (dest.owner && dest.owner !== pid && dest.count === 1) {
      /* đánh trúng blot của địch */
      dest.owner = pid; dest.count = 1;
      opp.bar++;
    } else if (!dest.owner) {
      dest.owner = pid; dest.count = 1;
    } else {
      dest.count++;
    }
  }
  return { ...v, points, players, diceLeft: removeOneDice(v.diceLeft, m.die) };
}
/* mọi chuỗi nước đi đầy đủ (tối đa) từ view hiện tại; trả về
   {legal, maxLen} — legal là các chuỗi dài nhất (đã lọc xúc xắc lớn
   hơn khi chỉ dùng được 1 xúc xắc), mỗi chuỗi là danh sách nước đơn. */
function sequencesFromView(v, pid) {
  const diceLeft = v.diceLeft.slice();
  function rec(vv) {
    const moves = singleMoves(vv, pid, vv.diceLeft);
    if (!moves.length || !vv.diceLeft.length) return [[]];
    const out = [];
    for (const m of moves) {
      const v2 = applyMoveToView(vv, pid, m);
      for (const rest of rec(v2)) out.push([m, ...rest]);
    }
    return out;
  }
  const all = rec({ ...v, diceLeft });
  let maxLen = 0;
  for (const s of all) if (s.length > maxLen) maxLen = s.length;
  let legal = all.filter(s => s.length === maxLen);
  /* chỉ dùng được 1 xúc xắc → bắt buộc dùng xúc xắc lớn hơn */
  if (maxLen === 1 && legal.length > 1) {
    const maxDie = Math.max(...legal.map(s => s[0].die));
    legal = legal.filter(s => s[0].die === maxDie);
  }
  return { legal, maxLen };
}
export { sequencesFromView };
/* mọi nước đi đơn hợp lệ LÚC NÀY của pid (nước đầu của chuỗi dài nhất);
   không còn nước nào → [{type:'pass'}]. */
export function legalMovesFromView(v, pid) {
  if (!v || v.phase !== 'playing' || v.turn !== pid) return [];
  if (v.step !== 'move') return [];
  const { legal } = sequencesFromView(v, pid);
  const seen = new Set();
  const out = [];
  for (const seq of legal) {
    if (!seq.length) continue;
    const m = seq[0];
    const k = m.from + '>' + m.to + ':' + m.die;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ type: 'move', from: m.from, to: m.to, die: m.die });
  }
  if (!out.length) out.push({ type: 'pass' });
  return out;
}
export function legalMoves(s, pid) {
  if (!s || s.phase !== 'playing') return [];
  if (actors(s)[0] !== pid) return [];
  return legalMovesFromView(viewFor(s, pid), pid);
}
/* các điểm đến hợp lệ khi đã chọn 1 quân ở `from` (cho UI tô sáng) */
export function destsFor(v, pid, from) {
  return legalMovesFromView(v, pid)
    .filter(m => m.type === 'move' && String(m.from) === String(from))
    .map(m => ({ to: m.to, die: m.die }));
}
export function scoreOf(pl) { return pl.off; }
function refreshScore(s, pl) { pl.score = pl.off; }

/* ---------- áp dụng 1 hành động ---------- */
function endTurn(s) {
  s.step = 'roll';
  s.dice = [];
  s.diceLeft = [];
  s.turnIdx = (s.turnIdx + 1) % s.players.length;
  s.turn = s.players[s.turnIdx].id;
  s.turnCount++;
  if (s.turnIdx === 0) s.round++;
  /* van an toàn: ván quá dài thì kết thúc theo số quân đã ra */
  if (s.turnCount >= MAX_TURNS) {
    endGame(s, 'stalemate');
  }
}

export function applyAction(s, pid, act) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'ended' };
  if (!act || typeof act.type !== 'string') return { ok: false, reason: 'bad-action' };
  const p = player(s, pid);
  if (!p) return { ok: false, reason: 'no-player' };

  /* xin thua: kết thúc TRẬN ngay (bất kể đang ở bước nào) */
  if (act.type === 'resign') {
    endGame(s, 'resign', pid);
    log(s, '🏳️ ' + p.name + ' xin thua — ván dừng lại ngay.', 'resign');
    s.seq++;
    return { ok: true };
  }

  /* trả lời đề nghị gấp đôi: chỉ đối thủ của người đề nghị được trả lời */
  if (act.type === 'double-accept' || act.type === 'double-decline') {
    if (s.step !== 'double' || !s.doubleOffer) return { ok: false, reason: 'no-offer' };
    if (s.doubleOffer.by === pid) return { ok: false, reason: 'not-your-turn' };
    if (act.type === 'double-accept') {
      s.cube.value = s.doubleOffer.value;
      s.cube.owner = pid;
      log(s, `📈 ${p.name} chấp nhận gấp đôi — cube lên ×${s.cube.value}, giờ cube thuộc về ${p.name}.`, 'info');
      s.doubleOffer = null;
      s.step = 'roll';
      s.seq++;
      return { ok: true };
    }
    /* từ chối = thua ngay với giá trị cube HIỆN TẠI (chưa nhân đôi) */
    log(s, `📈 ${p.name} từ chối gấp đôi — ${player(s, s.doubleOffer.by).name} thắng với cube ×${s.cube.value}.`, 'win');
    s.seq++;
    endGame(s, 'double', pid);
    return { ok: true };
  }

  if (actors(s)[0] !== pid) return { ok: false, reason: 'not-your-turn' };

  /* đề nghị gấp đôi: chỉ trước khi gieo xúc xắc; chỉ người đang giữ
     cube mới được gấp đôi (cube ở giữa thì ai cũng được) */
  if (act.type === 'double') {
    if (s.step !== 'roll') return { ok: false, reason: 'too-late' };
    if (s.cube.owner && s.cube.owner !== pid) return { ok: false, reason: 'not-cube-owner' };
    const opp = s.players.find(x => x.id !== pid);
    s.doubleOffer = { by: pid, value: s.cube.value * 2 };
    s.step = 'double';
    log(s, `📈 ${p.name} đề nghị gấp đôi lên ×${s.doubleOffer.value} — chờ ${opp.name} trả lời.`, 'info');
    s.seq++;
    return { ok: true };
  }

  /* gieo xúc xắc */
  if (act.type === 'roll') {
    if (s.step !== 'roll') return { ok: false, reason: 'already-rolled' };
    const d1 = rollDie(s), d2 = rollDie(s);
    s.dice = [d1, d2];
    s.diceLeft = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
    s.step = 'move';
    p.turns++;
    log(s, `🎲 ${p.name} gieo ${d1}–${d2}${d1 === d2 ? ' — ĐÔI! được 4 nước ' + d1 : ''}.`, '');
    s.seq++;
    /* gieo xong mà không có nước nào (bar bị chặn hết) → mất lượt luôn */
    const moves = legalMovesFromView(viewFor(s, pid), pid).filter(m => m.type === 'move');
    if (!moves.length) {
      log(s, `😶 ${p.name} không đi được nước nào — mất lượt.`, 'info');
      endTurn(s);
    }
    return { ok: true };
  }

  /* bỏ lượt: chỉ hợp lệ khi không còn nước nào với xúc xắc còn lại */
  if (act.type === 'pass') {
    if (s.step !== 'move') return { ok: false, reason: 'illegal' };
    const moves = legalMovesFromView(viewFor(s, pid), pid).filter(m => m.type === 'move');
    if (moves.length) return { ok: false, reason: 'illegal' };
    log(s, `⏭️ ${p.name} hết nước đi với xúc xắc còn lại — kết thúc lượt.`, 'info');
    s.seq++;
    endTurn(s);
    return { ok: true };
  }

  /* đi 1 quân bằng 1 xúc xắc */
  if (act.type === 'move') {
    if (s.step !== 'move') return { ok: false, reason: 'not-move-step' };
    const legal = legalMovesFromView(viewFor(s, pid), pid)
      .filter(m => m.type === 'move');
    const m = legal.find(x =>
      String(x.from) === String(act.from) && String(x.to) === String(act.to) && x.die === act.die);
    if (!m) return { ok: false, reason: 'illegal' };
    const opp = s.players.find(x => x.id !== pid);
    let hit = false;
    if (m.from === 'bar') {
      p.bar--;
    } else {
      const pt = s.points[m.from];
      pt.count--;
      if (pt.count === 0) pt.owner = null;
    }
    if (m.to === 'off') {
      p.off++;
      refreshScore(s, p);
    } else {
      const dest = s.points[m.to];
      if (dest.owner && dest.owner !== pid && dest.count === 1) {
        dest.owner = pid; dest.count = 1;
        opp.bar++;
        p.hits++;
        hit = true;
      } else if (!dest.owner) {
        dest.owner = pid; dest.count = 1;
      } else {
        dest.count++;
      }
    }
    s.diceLeft = removeOneDice(s.diceLeft, m.die);
    s.seq++;
    const fromTxt = m.from === 'bar' ? 'bar' : 'điểm ' + (m.from + 1);
    const toTxt = m.to === 'off' ? 'ra ngoài' : 'điểm ' + (m.to + 1);
    log(s, `🔴 ${p.name} đi ${fromTxt} → ${toTxt} (${m.die})${hit ? ' 💥 đánh trúng 1 quân địch!' : ''} · đã ra ${p.off}/15.`, hit ? 'win' : '');
    if (p.off >= CHECKERS) {
      endGame(s, 'match');
      return { ok: true };
    }
    if (!s.diceLeft.length) {
      endTurn(s);
      return { ok: true };
    }
    /* còn xúc xắc mà hết nước → mất phần còn lại của lượt */
    const rest = legalMovesFromView(viewFor(s, pid), pid).filter(x => x.type === 'move');
    if (!rest.length) {
      log(s, `😶 ${p.name} hết nước đi với xúc xắc còn lại — kết thúc lượt.`, 'info');
      endTurn(s);
    }
    return { ok: true };
  }

  return { ok: false, reason: 'illegal' };
}

/* ---------- kết thúc ván ---------- */
function endGame(s, cause, resignerId = null) {
  s.phase = 'ended';
  s.endReason = cause === 'resign' ? 'resign' : 'match';
  s.endCause = cause;
  const cubeUsed = s.cube.value >= 2;
  const summary = {};
  for (const p of s.players) {
    refreshScore(s, p);
    summary[p.id] = {
      score: p.score,
      borneOff: p.off,
      checkersOnBar: p.bar,
      points: pipCount(p, s.points),
      winType: null,
      hits: p.hits,
      cubeValue: s.cube.value,
      cubeUsed,
      turns: p.turns,
    };
  }
  let winnerId = null;
  let winType = null;
  if (cause === 'match') {
    const w = s.players.find(p => p.off >= CHECKERS);
    winnerId = w ? w.id : null;
    if (w) {
      const loser = s.players.find(p => p.id !== w.id);
      if (loser.off === 0) {
        /* gammon/backgammon: địch chưa ra quân nào */
        const loserInWinnerHome = (() => {
          const lo = w.dir === -1 ? 0 : 18;
          const hi = w.dir === -1 ? 5 : 23;
          for (let i = lo; i <= hi; i++) {
            const pt = s.points[i];
            if (pt.owner === loser.id) return true;
          }
          return false;
        })();
        winType = (loser.bar > 0 || loserInWinnerHome) ? 'backgammon' : 'gammon';
      } else {
        winType = 'single';
      }
    }
  } else if (cause === 'double') {
    /* từ chối gấp đôi: người đề nghị thắng, không tính gammon */
    winnerId = s.doubleOffer ? s.doubleOffer.by : null;
    winType = 'double';
  } else if (cause === 'resign') {
    winnerId = s.players.find(p => p.id !== resignerId)?.id || null;
    winType = null;
  } else {
    /* stalemate (van an toàn): ra nhiều quân hơn thắng, hòa thì ít pip hơn */
    const [a, b] = s.players;
    if (a.off !== b.off) winnerId = a.off > b.off ? a.id : b.id;
    else {
      const pa = pipCount(a, s.points), pb = pipCount(b, s.points);
      winnerId = pa !== pb ? (pa < pb ? a.id : b.id) : null;
    }
    winType = null;
  }
  if (winnerId && winType) summary[winnerId].winType = winType;
  s.winners = winnerId ? [winnerId] : [];
  s.winner = winnerId;
  s.losers = s.players.filter(p => p.id !== winnerId).map(p => p.id);
  s.final = {
    summary,
    scores: s.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
    cubeValue: s.cube.value,
    winType,
  };
  s.endedAt = Date.now();
  if (winnerId) {
    const w = player(s, winnerId);
    const mult = winType === 'gammon' ? ' (Gammon ×2)' : winType === 'backgammon' ? ' (Backgammon ×3)' : winType === 'double' ? ` (thắng gấp đôi ×${s.cube.value})` : '';
    log(s, `🏆 ${w.name} thắng với ${w.off}/15 quân ra ngoài${mult}!`, 'win');
  } else {
    log(s, '🤝 Ván kết thúc mà không có người thắng.', 'info');
  }
}

/* ---------- người được hành động ---------- */
export function actors(s) {
  if (!s || s.phase !== 'playing') return [];
  if (s.step === 'double' && s.doubleOffer) {
    const opp = s.players.find(p => p.id !== s.doubleOffer.by);
    return opp ? [opp.id] : [];
  }
  const p = s.players[s.turnIdx];
  return p ? [p.id] : [];
}

/* ---------- góc nhìn của 1 người chơi ---------- */
/* Bàn + xúc xắc đều công khai — chỉ giấu _seed/_rng. Không có trường `you`. */
export function viewFor(s, pid) {
  const turnPid = s.players[s.turnIdx] ? s.players[s.turnIdx].id : null;
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, round: s.round,
    turn: turnPid, turnCount: s.turnCount,
    step: s.step,
    dice: s.dice.slice(), diceLeft: s.diceLeft.slice(),
    cube: { value: s.cube.value, owner: s.cube.owner },
    doubleOffer: s.doubleOffer ? { ...s.doubleOffer } : null,
    points: s.points.map(pt => ({ owner: pt.owner, count: pt.count })),
    players: s.players.map(pl => ({
      id: pl.id, name: pl.name, isBot: pl.isBot, local: pl.local, level: pl.level,
      color: pl.color, emoji: pl.emoji, dir: pl.dir,
      bar: pl.bar, off: pl.off, hits: pl.hits, turns: pl.turns, score: pl.score,
      pips: pipCount(pl, s.points),
    })),
    winner: s.winner, winners: s.winners.slice(), losers: s.losers.slice(),
    endReason: s.endReason, endCause: s.endCause,
    final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    log: s.log.slice(-40), startedAt: s.startedAt, endedAt: s.endedAt, me: pid,
  };
}

export function serialize(s) { return JSON.stringify(s); }
export function deserialize(json) {
  const s = JSON.parse(json);
  if (!s || !Array.isArray(s.players) || !Array.isArray(s.points) || s.points.length !== POINTS) throw new Error('bad save');
  return s;
}
export default { createGame, applyAction, viewFor, actors, legalMoves };
