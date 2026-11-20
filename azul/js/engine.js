// 🎨 Azul — engine thuần logic (seeded LCG, KHÔNG dùng Math.random).
//
// LUẬT CHUẨN ÁP DỤNG (bản gốc Plan B Games 2017, Michael Kiesling;
// đã tra cứu trước khi code — xem test/rules.mjs §0 để biết nguồn từng luật):
// - 2–4 người; 100 gạch (20 gạch mỗi màu trong 5 màu: xanh dương, vàng,
//   đỏ, đen, trắng); xưởng gạch: 2 người 5 xưởng, 3 người 7 xưởng,
//   4 người 9 xưởng, mỗi xưởng 4 gạch; giữa bàn là khu trung tâm.
// - Mỗi lượt: lấy TẤT CẢ gạch 1 màu từ 1 xưởng (gạch còn lại của xưởng
//   đó chuyển ra trung tâm) HOẶC lấy tất cả gạch 1 màu ở trung tâm (ai
//   lấy ở trung tâm đầu tiên trong vòng thì lấy luôn dấu "1" — người đi
//   đầu vòng sau — và đặt dấu đó lên hàng sàn của mình).
// - Gạch vừa lấy đặt vào 1 hàng mẫu của mình (5 hàng chứa 1/2/3/4/5
//   gạch); mỗi hàng chỉ chứa 1 màu; không được đặt màu mà ô tường của
//   hàng đó đã có; gạch thừa không vừa hàng thì xuống hàng sàn (tối đa
//   7 ô, thừa nữa thì bỏ vào nắp hộp). Được chọn đặt thẳng xuống hàng sàn.
// - Hết lượt lấy (xưởng + trung tâm đều trống) thì ốp tường: mỗi hàng
//   mẫu đã đầy thì chuyển 1 gạch lên ô tường cùng màu của hàng đó và
//   tính điểm ngay (gạch lẻ 1 điểm; có gạch kề ngang thì tính cả hàng
//   ngang, có gạch kề dọc thì tính cả cột dọc, có cả 2 thì cộng cả 2);
//   gạch còn lại trong hàng đầy thì bỏ vào nắp hộp; hàng chưa đầy giữ
//   nguyên sang vòng sau; hàng sàn trừ điểm (-1,-1,-2,-2,-2,-3,-3) rồi
//   dọn sạch (dấu "1" về lại trung tâm, người giữ dấu đi đầu vòng sau).
// - Túi hết gạch thì đổ gạch trong nắp hộp vào túi rồi xào lại.
// - Ván kết thúc sau vòng mà có người hoàn thành 1 hàng ngang trên tường
//   (đủ 5 ô 1 hàng). Điểm cuối ván: +2 mỗi hàng ngang đủ, +7 mỗi cột dọc
//   đủ, +10 mỗi màu đủ 5 gạch trên tường. Hòa điểm: nhiều hàng ngang đủ
//   hơn thắng, rồi nhiều màu đủ hơn; vẫn hòa thì cùng thắng.
// - Xin thua kết thúc TRẬN ngay: trừ điểm hàng sàn hiện tại, cộng điểm
//   cuối ván theo tường hiện tại, người có điểm cao nhất TRONG SỐ NGƯỜI
//   KHÔNG XIN THUA thắng.
//
// MÔ HÌNH:
// - Màu: 'B' xanh dương, 'Y' vàng, 'R' đỏ, 'K' đen, 'W' trắng.
// - Tường là lưới 5×5 cố định: WALL[hàng][cột] = màu của ô đó (mỗi màu
//   xuất hiện đúng 1 lần mỗi hàng và mỗi cột — mẫu chéo chuẩn).
// - Hàng mẫu: { color: null | màu, count: 0 }; hàng sàn: mảng gạch
//   (tối đa 7 ô) + cờ marker (dấu "1" — tính như 1 ô sàn khi trừ điểm).
// - Bàn của mọi người đều là thông tin công khai; chỉ giấu thứ tự túi
//   gạch (và nắp hộp) — viewFor chỉ lộ số gạch còn trong túi.

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const COLORS = ['B', 'Y', 'R', 'K', 'W'];
export const COLOR_NAME = { B: 'xanh dương', Y: 'vàng', R: 'đỏ', K: 'đen', W: 'trắng' };
export const FACTORIES = { 2: 5, 3: 7, 4: 9 };
export const FLOOR_PENALTIES = [-1, -1, -2, -2, -2, -3, -3];
export const LINE_CAP = [1, 2, 3, 4, 5];
/* mẫu tường chuẩn: mỗi hàng là hàng trên dịch phải 1 ô (vòng tròn) */
export const WALL = [
  ['B', 'Y', 'R', 'K', 'W'],
  ['W', 'B', 'Y', 'R', 'K'],
  ['K', 'W', 'B', 'Y', 'R'],
  ['R', 'K', 'W', 'B', 'Y'],
  ['Y', 'R', 'K', 'W', 'B'],
];
export function wallCol(row, color) { return WALL[row].indexOf(color); }

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
function newPlayer(p, i) {
  return {
    id: p.id, name: p.name || ('Người ' + (i + 1)),
    isBot: !!p.isBot, local: !!p.local, level: p.level || null,
    score: 0,
    lines: Array.from({ length: 5 }, () => ({ color: null, count: 0 })),
    wall: Array.from({ length: 5 }, () => [false, false, false, false, false]),
    floor: [], marker: false,
  };
}
const player = (s, pid) => s.players.find(p => p.id === pid);

function log(s, text, cls) {
  s.log.push({ text, kind: cls || '' });
  if (s.log.length > 120) s.log.splice(0, s.log.length - 120);
}

export function createGame(players, opts = {}) {
  if (!players || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error('Azul cần ' + MIN_PLAYERS + '–' + MAX_PLAYERS + ' người chơi');
  }
  const seed = opts.seed == null ? (Date.now() % 2147483647) : opts.seed;
  const rnd = mulberry32(seed);
  const n = players.length;
  /* chấp nhận cả tên chuỗi ('An') lẫn object ({id, name, isBot, ...}) */
  const plist = players.map((p, i) => (typeof p === 'string' ? { id: 'p' + i, name: p } : p));
  const bag = [];
  for (const c of COLORS) for (let k = 0; k < 20; k++) bag.push(c);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = bag[i]; bag[i] = bag[j]; bag[j] = t;
  }
  const s = {
    gid: 'az-' + seed + '-' + Math.floor(rnd() * 1e9).toString(36),
    seq: 0, phase: 'playing', turnIdx: 0, turnCount: 0, round: 1,
    bag, lid: [],
    factories: [], centre: [], markerInCentre: true,
    firstPlayerIdx: 0, nextFirstIdx: 0,
    players: plist.map(newPlayer),
    winner: null, winners: [], losers: [], endReason: null, endCause: null,
    final: null,
    log: [], startedAt: Date.now(), endedAt: 0, _seed: seed,
  };
  s.turn = s.players[0].id;
  for (let i = 0; i < FACTORIES[n]; i++) s.factories.push([]);
  refillFactories(s);
  log(s, '🎨 Ván bắt đầu — ' + FACTORIES[n] + ' xưởng gạch, mỗi xưởng 4 gạch; dấu "1" ở giữa bàn.', 'info');
  return s;
}

/* rút 1 gạch từ túi; túi hết thì đổ nắp hộp vào túi rồi xào lại */
function drawTile(s, rnd) {
  if (!s.bag.length) {
    if (!s.lid.length) return null;
    s.bag = s.lid.splice(0);
    const r = rnd || mulberry32((s._seed || 1) + s.round * 7919 + s.turnCount);
    for (let i = s.bag.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = s.bag[i]; s.bag[i] = s.bag[j]; s.bag[j] = t;
    }
    log(s, '👜 Túi hết gạch — đổ gạch trong nắp hộp vào túi rồi xào lại.', 'info');
  }
  return s.bag.pop();
}

/* châm đầy các xưởng (mỗi xưởng 4 gạch) vào đầu vòng */
function refillFactories(s) {
  for (const f of s.factories) {
    while (f.length < 4) {
      const t = drawTile(s);
      if (!t) break;
      f.push(t);
    }
  }
}

/* điểm trừ hàng sàn: n ô (gồm dấu "1" nếu có); quá 7 ô thì mỗi ô thêm -3 */
export function floorPenalty(n) {
  let p = 0;
  for (let i = 0; i < Math.min(n, 7); i++) p += -FLOOR_PENALTIES[i];
  if (n > 7) p += 3 * (n - 7);
  return p;
}

/* điểm khi ốp 1 gạch lên tường tại (r, c) — tường wall đã có gạch đó */
export function wallScore(wall, r, c) {
  let h = 1, v = 1;
  for (let cc = c - 1; cc >= 0 && wall[r][cc]; cc--) h++;
  for (let cc = c + 1; cc < 5 && wall[r][cc]; cc++) h++;
  for (let rr = r - 1; rr >= 0 && wall[rr][c]; rr--) v++;
  for (let rr = r + 1; rr < 5 && wall[rr][c]; rr++) v++;
  if (h === 1 && v === 1) return 1;
  return (h > 1 ? h : 0) + (v > 1 ? v : 0);
}

/* số hàng ngang đủ / cột dọc đủ / màu đủ 5 gạch trên 1 tường */
export function wallStats(wall) {
  let rows = 0, cols = 0;
  for (let r = 0; r < 5; r++) if (wall[r].every(Boolean)) rows++;
  for (let c = 0; c < 5; c++) if (wall.every(row => row[c])) cols++;
  let colours = 0;
  for (const col of COLORS) {
    let ok = true;
    for (let r = 0; r < 5; r++) if (!wall[r][wallCol(r, col)]) { ok = false; break; }
    if (ok) colours++;
  }
  return { rows, cols, colours, bonus: 2 * rows + 7 * cols + 10 * colours };
}

/* ---------- nước đi hợp lệ ---------- */
/* line = -1 là đặt thẳng xuống hàng sàn (luôn được); line 0..4 là hàng mẫu:
   hàng phải trống hoặc cùng màu, chưa đầy, và ô tường của hàng đó chưa
   có màu này. */
export function canPlaceLine(pl, line, color) {
  if (line === -1) return true;
  if (line < 0 || line > 4 || !COLORS.includes(color)) return false;
  const L = pl.lines[line];
  if (!L) return false;
  if (L.count >= LINE_CAP[line]) return false;
  if (L.color !== null && L.color !== color) return false;
  if (pl.wall[line][wallCol(line, color)]) return false;
  return true;
}

/* mọi nước lấy gạch hợp lệ cho người pid, tính từ 1 state/view có dạng
   { factories, centre, markerInCentre, players, turn, phase } — bot chỉ
   dùng view nên hàm này nhận view được (không đọc state thô). */
export function legalMovesFromView(v, pid) {
  if (!v || v.phase !== 'playing' || v.turn !== pid) return [];
  const me = v.players.find(p => p.id === pid);
  if (!me) return [];
  const out = [];
  const consider = (from, source, tiles) => {
    const present = [...new Set(tiles)];
    for (const color of present) {
      for (let line = -1; line < 5; line++) {
        if (canPlaceLine(me, line, color)) out.push({ type: 'take', from, source, color, line });
      }
    }
  };
  v.factories.forEach((f, i) => { if (f.length) consider('factory', i, f); });
  if (v.centre.length) consider('centre', -1, v.centre);
  return out;
}

export function legalMoves(s, pid) {
  if (!s || s.phase !== 'playing') return [];
  if (actors(s)[0] !== pid) return [];
  return legalMovesFromView({
    phase: s.phase, turn: s.players[s.turnIdx].id, me: pid,
    factories: s.factories, centre: s.centre, markerInCentre: s.markerInCentre,
    players: s.players,
  }, pid);
}

/* ---------- áp dụng 1 nước đi ---------- */
export function applyAction(s, pid, act) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'ended' };
  if (!act || typeof act.type !== 'string') return { ok: false, reason: 'bad-action' };
  const p = player(s, pid);
  if (!p) return { ok: false, reason: 'no-player' };

  /* xin thua: kết thúc TRẬN ngay (trừ điểm sàn hiện tại + điểm cuối ván
     theo tường hiện tại, rồi chọn người cao điểm nhất không xin thua) */
  if (act.type === 'resign') {
    endGame(s, 'resign', pid);
    log(s, '🏳️ ' + p.name + ' xin thua — ván dừng lại ngay.', 'resign');
    s.seq++;
    return { ok: true };
  }

  if (actors(s)[0] !== pid) return { ok: false, reason: 'not-your-turn' };

  if (act.type === 'take') {
    const { from, source, color, line } = act;
    if (!COLORS.includes(color)) return { ok: false, reason: 'bad-color' };
    if (line !== -1 && (line < 0 || line > 4)) return { ok: false, reason: 'bad-line' };
    let tiles;
    if (from === 'factory') {
      if (!Number.isInteger(source) || source < 0 || source >= s.factories.length) return { ok: false, reason: 'bad-factory' };
      tiles = s.factories[source];
    } else if (from === 'centre') {
      tiles = s.centre;
    } else {
      return { ok: false, reason: 'bad-source' };
    }
    const count = tiles.filter(c => c === color).length;
    if (!count) return { ok: false, reason: 'no-color' };
    if (!canPlaceLine(p, line, color)) return { ok: false, reason: 'bad-line' };

    /* lấy gạch khỏi nguồn */
    if (from === 'factory') {
      const rest = tiles.filter(c => c !== color);
      s.factories[source] = [];
      s.centre.push(...rest);
    } else {
      s.centre = s.centre.filter(c => c !== color);
    }
    /* lấy dấu "1" ở trung tâm (nếu còn) — người giữ dấu đi đầu vòng sau */
    let tookMarker = false;
    if (from === 'centre' && s.markerInCentre) {
      s.markerInCentre = false;
      p.marker = true;
      s.nextFirstIdx = s.players.findIndex(x => x.id === pid);
      tookMarker = true;
    }
    /* đặt gạch vào hàng mẫu, thừa xuống hàng sàn */
    let overflow = count;
    if (line >= 0) {
      const L = p.lines[line];
      const free = LINE_CAP[line] - L.count;
      const placed = Math.min(count, free);
      L.color = color;
      L.count += placed;
      overflow = count - placed;
    }
    for (let i = 0; i < overflow; i++) {
      if (p.floor.length < 7) p.floor.push(color);
      else s.lid.push(color);
    }
    const srcName = from === 'factory' ? ('xưởng ' + (source + 1)) : 'trung tâm';
    log(s, `🎨 ${p.name} lấy ${count} gạch ${COLOR_NAME[color]} ở ${srcName}${tookMarker ? ' (+ dấu "1")' : ''} → ${line === -1 ? 'hàng sàn' : 'hàng mẫu ' + (line + 1)}${overflow ? ' (thừa ' + overflow + ' xuống sàn)' : ''}.`, '');
    s.seq++;
    s.turnCount++;
    if (draftOver(s)) {
      endRound(s);
    } else {
      s.turnIdx = (s.turnIdx + 1) % s.players.length;
      s.turn = s.players[s.turnIdx].id;
    }
    return { ok: true };
  }

  return { ok: false, reason: 'illegal' };
}

/* hết lượt lấy khi mọi xưởng + trung tâm đều trống */
function draftOver(s) {
  return s.factories.every(f => f.length === 0) && s.centre.length === 0;
}

/* ---------- ốp tường cuối vòng ---------- */
function endRound(s) {
  log(s, '🧱 Hết gạch để lấy — ốp tường cuối vòng ' + s.round + '.', 'info');
  let gameEnds = false;
  for (const p of s.players) {
    /* ốp tường: duyệt hàng mẫu từ trên xuống dưới */
    for (let line = 0; line < 5; line++) {
      const L = p.lines[line];
      if (L.count < LINE_CAP[line] || !L.color) continue;
      const col = wallCol(line, L.color);
      p.wall[line][col] = true;
      const pts = wallScore(p.wall, line, col);
      p.score += pts;
      log(s, `⭐ ${p.name} ốp gạch ${COLOR_NAME[L.color]} lên tường hàng ${line + 1} +${pts} điểm.`, 'win');
      for (let i = 0; i < L.count - 1; i++) s.lid.push(L.color);
      L.color = null;
      L.count = 0;
    }
    /* trừ điểm hàng sàn rồi dọn sạch */
    const nFloor = p.floor.length + (p.marker ? 1 : 0);
    if (nFloor > 0) {
      const pen = floorPenalty(nFloor);
      p.score = Math.max(0, p.score - pen);
      log(s, `⬇️ ${p.name} bị trừ ${pen} điểm hàng sàn (${nFloor} ô${p.marker ? ' gồm dấu "1"' : ''}).`, 'info');
      for (const c of p.floor) s.lid.push(c);
      p.floor = [];
    }
    if (p.marker) { p.marker = false; }
    if (p.wall.some(row => row.every(Boolean))) gameEnds = true;
  }
  s.markerInCentre = true; /* dấu "1" về lại giữa bàn */
  if (gameEnds) {
    endGame(s, 'tiles');
    return;
  }
  /* vòng mới: người giữ dấu "1" đi đầu, châm lại các xưởng */
  s.firstPlayerIdx = s.nextFirstIdx;
  s.turnIdx = s.firstPlayerIdx;
  s.turn = s.players[s.turnIdx].id;
  s.round++;
  refillFactories(s);
  log(s, '🎨 Vòng ' + s.round + ' — ' + s.players[s.turnIdx].name + ' đi đầu.', 'info');
}

/* ---------- kết thúc ván ---------- */
function endGame(s, cause, resignerId = null) {
  s.phase = 'ended';
  s.endReason = cause === 'resign' ? 'resign' : 'match';
  s.endCause = cause;
  /* xin thua giữa vòng: trừ điểm sàn hiện tại (bình thường trừ ở cuối vòng) */
  if (cause === 'resign') {
    for (const p of s.players) {
      const nFloor = p.floor.length + (p.marker ? 1 : 0);
      if (nFloor > 0) {
        const pen = floorPenalty(nFloor);
        p.score = Math.max(0, p.score - pen);
        p.floor = [];
        p.marker = false;
      }
    }
  }
  const summary = {};
  for (const p of s.players) {
    const st = wallStats(p.wall);
    p.score += st.bonus;
    summary[p.id] = st;
  }
  /* chọn người thắng: điểm cao nhất; hòa thì nhiều hàng ngang đủ hơn,
     rồi nhiều màu đủ hơn; vẫn hòa thì cùng thắng */
  let best = null;
  for (const p of s.players) {
    if (resignerId && p.id === resignerId) continue;
    const st = summary[p.id];
    const key = [p.score, st.rows, st.colours];
    if (!best || key[0] > best.key[0] || (key[0] === best.key[0] && key[1] > best.key[1])
      || (key[0] === best.key[0] && key[1] === best.key[1] && key[2] > best.key[2])) {
      best = { key, ids: [p.id] };
    } else if (key[0] === best.key[0] && key[1] === best.key[1] && key[2] === best.key[2]) {
      best.ids.push(p.id);
    }
  }
  s.winners = best ? best.ids : [];
  s.winner = s.winners[0] || null;
  s.losers = s.players.filter(p => !s.winners.includes(p.id)).map(p => p.id);
  s.final = {
    summary,
    walls: Object.fromEntries(s.players.map(p => [p.id, p.wall.map(r => r.slice())])),
    scores: s.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
  };
  s.endedAt = Date.now();
  if (s.winners.length) {
    const names = s.winners.map(id => player(s, id).name).join(' + ');
    const bestScore = player(s, s.winners[0]).score;
    log(s, `🏆 ${names} thắng với ${bestScore} điểm!`, 'win');
  } else {
    log(s, '🤝 Ván kết thúc mà không có người thắng.', 'info');
  }
}

/* ---------- người được hành động ---------- */
export function actors(s) {
  if (!s || s.phase !== 'playing') return [];
  const p = s.players[s.turnIdx];
  return p ? [p.id] : [];
}

/* ---------- góc nhìn của 1 người chơi ---------- */
/* Bàn của mọi người, xưởng và trung tâm đều công khai; chỉ giấu thứ tự
   túi gạch (chỉ lộ số gạch còn) và nắp hộp. Không có trường `you`. */
export function viewFor(s, pid) {
  const turnPid = s.players[s.turnIdx] ? s.players[s.turnIdx].id : null;
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, round: s.round,
    turn: turnPid, turnCount: s.turnCount,
    factories: s.factories.map(f => f.slice()),
    centre: s.centre.slice(), markerInCentre: s.markerInCentre,
    bagCount: s.bag.length, lidCount: s.lid.length,
    players: s.players.map(pl => ({
      id: pl.id, name: pl.name, isBot: pl.isBot, local: pl.local, level: pl.level,
      score: pl.score,
      lines: pl.lines.map(l => ({ color: l.color, count: l.count })),
      wall: pl.wall.map(r => r.slice()),
      floor: pl.floor.slice(), marker: pl.marker,
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
  if (!s || !Array.isArray(s.players) || !Array.isArray(s.factories) || !Array.isArray(s.bag)) throw new Error('bad save');
  return s;
}
export default { createGame, applyAction, viewFor, actors, legalMoves };
