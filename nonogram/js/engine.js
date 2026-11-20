// 🧩 Nonogram — luật chơi (engine thuần, không phụ thuộc DOM).
//
// LUẬT:
// - Bảng vuông N×N (Dễ 5×5, Vừa 10×10, Khó 15×15). Câu đố sinh ngẫu
//   nhiên có seed: sinh hình rồi tính gợi ý từ hình nên gợi ý luôn
//   đúng với đáp án. Gợi ý mỗi hàng/cột là độ dài các đoạn ô đen liên
//   tiếp (vd "3 1"), đoạn cách nhau ít nhất 1 ô trắng; hàng/cột trống
//   thì gợi ý là [0].
// - Ô có 4 trạng thái: 0 = trống, 1 = đã tô đen, 2 = đánh dấu X (chắc
//   chắn trắng), 3 = bị khóa (đã tô sai vào ô trắng, hiện ✕ đỏ).
// - 'fill' vào ô đáp án đen → tô đúng (+1 ô đã tô); vào ô đáp án
//   trắng → mất 1 mạng, ô bị khóa trắng (không tô lại được). Hết
//   3 mạng thì thua. 'mark' đánh dấu/bỏ dấu X trên ô trống. 'clear'
//   xóa ô đã tô hoặc dấu X. 'hint' (tối đa 3 lần/màn) tô đúng 1 ô đen
//   chưa tô, chọn ngẫu nhiên bằng RNG có seed của ván.
// - Chơi đơn: thắng khi tô đủ hết các ô đen trước khi hết 3 mạng.
// - Đua (đấu máy / online 2–4 người / chung máy 2 người): cùng 1 câu
//   đố, cùng seed, mỗi người 1 bảng riêng. Ai tô đủ trước thì thắng;
//   hết 180 giây chưa ai xong thì so % hoàn thành (số ô đen đã tô /
//   tổng ô đen), bằng nhau thì hoà; hết 3 mạng/xin thua thì bị loại,
//   người còn lại chơi tiếp; tất cả đều xong mà chưa ai tô đủ thì so
//   %, rồi so số lỗi ít hơn, bằng nhau thì hoà.
// - viewFor: mỗi người chỉ thấy bảng + gợi ý của MÌNH; đáp án (solution)
//   KHÔNG bao giờ lộ ra view. Đối thủ chỉ thấy tóm tắt (%, số lỗi,
//   trạng thái) — KHÔNG thấy bảng của đối thủ.
export const SIZES = { easy: 5, medium: 10, hard: 15 };
export const LIVES = 3; /* mỗi màn có 3 mạng (tô sai 3 lần thì thua) */
export const HINTS = 3; /* tối đa 3 lần gợi ý mỗi màn */
export const RACE_TIME_MS = 180000; /* đua tối đa 180 giây */
export const CELL = { EMPTY: 0, FILLED: 1, MARKED: 2, LOCKED: 3 };

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function nextRand(s) {
  s.rng = (s.rng * 1664525 + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
const pOf = (s, id) => s.players.find(p => p.id === id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

/* Gợi ý 1 hàng/cột: các đoạn ô đen liên tiếp; trống thì [0]. */
export function cluesForLine(line) {
  const out = [];
  let run = 0;
  for (const v of line) {
    if (v) run++;
    else if (run) { out.push(run); run = 0; }
  }
  if (run) out.push(run);
  return out.length ? out : [0];
}

/* Sinh hình ngẫu nhiên có seed: tô ngẫu nhiên rồi làm mịn 2 lượt
   (ô đen nếu >= 5/9 ô trong vùng 3×3 là đen) để tạo hình khối có
   đoạn dài — câu đố dễ suy luận hơn hình nhiễu thuần. Đảm bảo mật độ
   ô đen trong [22%, 68%]; thử tối đa 12 lần rồi dùng hình dự phòng. */
function genPicture(rng, n) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const p = 0.42 + rng() * 0.16;
    let pic = Array.from({ length: n }, () => Array.from({ length: n }, () => (rng() < p ? 1 : 0)));
    for (let pass = 0; pass < 2; pass++) {
      const next = pic.map(r => r.slice());
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          let c = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && nx < n && ny >= 0 && ny < n && pic[ny][nx]) c++;
            }
          }
          next[y][x] = c >= 5 ? 1 : 0;
        }
      }
      pic = next;
    }
    let total = 0;
    for (const row of pic) for (const v of row) total += v;
    if (total >= Math.round(n * n * 0.22) && total <= Math.round(n * n * 0.68)) return { pic, total };
  }
  /* dự phòng: khung + đường chéo (luôn hợp lệ, vẫn đúng seed vì chỉ
     dùng khi các lần thử ngẫu nhiên đều trượt) */
  const pic = Array.from({ length: n }, (_, y) =>
    Array.from({ length: n }, (_, x) => (x === 0 || y === 0 || x === n - 1 || y === n - 1 || x === y ? 1 : 0)));
  let total = 0;
  for (const row of pic) for (const v of row) total += v;
  return { pic, total };
}

export function percentOf(prog, totalBlack) {
  return totalBlack > 0 ? prog.filled / totalBlack : 0;
}

function finishSummary(s) {
  const out = {};
  for (const p of s.players) {
    const pr = s.prog[p.id];
    out[p.id] = {
      filled: pr.filled, mistakes: pr.mistakes, hintsUsed: pr.hintsUsed,
      percent: percentOf(pr, s.totalBlack),
      timeMs: (pr.doneAt || s.endedAt || Date.now()) - s.startedAt,
    };
  }
  return out;
}
function endGame(s, winner, losers, reason) {
  if (s.phase !== 'playing') return;
  s.phase = 'ended'; s.endedAt = Date.now(); s.seq++;
  s.winner = winner;
  s.winnerIds = winner ? [winner] : [];
  s.losers = losers.slice();
  s.endReason = reason; /* 'complete' | 'percent' | 'dead' | 'resign' | 'draw' */
  for (const p of s.players) if (!s.prog[p.id].doneAt) s.prog[p.id].doneAt = s.endedAt;
  s.final = { summary: finishSummary(s) };
  if (reason === 'draw') pushLog(s, '🤝 Hoà! Không ai hơn ai.', '');
  else if (winner) pushLog(s, `🏆 ${pOf(s, winner).name} thắng ván!`, 'good');
  else pushLog(s, '😢 Hết ván!', '');
}
/* đua: tất cả đều xong mà chưa ai tô đủ → so %, rồi so số lỗi ít hơn */
function checkRaceEnd(s) {
  if (s.phase !== 'playing' || s.mode !== 'race') return;
  if (s.players.some(p => s.prog[p.id].status === 'playing')) return;
  const pct = p => percentOf(s.prog[p.id], s.totalBlack);
  const bestPct = Math.max(...s.players.map(pct));
  let pool = s.players.filter(p => pct(p) === bestPct);
  if (pool.length > 1) {
    const fewest = Math.min(...pool.map(p => s.prog[p.id].mistakes));
    pool = pool.filter(p => s.prog[p.id].mistakes === fewest);
  }
  if (pool.length === 1) endGame(s, pool[0].id, s.players.filter(p => p.id !== pool[0].id).map(p => p.id), 'percent');
  else endGame(s, null, s.players.map(p => p.id), 'draw');
}
function die(s, pid) {
  const prog = s.prog[pid];
  prog.status = 'dead';
  prog.doneAt = Date.now();
  pushLog(s, `💥 ${pOf(s, pid).name} tô sai 3 lần — hết mạng!`, 'bad');
  if (s.mode === 'solo') {
    endGame(s, null, [pid], 'dead');
    return;
  }
  checkRaceEnd(s);
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 1 || players.length > 4) throw new Error('Nonogram chơi 1–4 người (chơi đơn = 1, đua = 2–4).');
  const mode = opts.ngMode === 'solo' ? 'solo' : 'race';
  if (mode === 'solo' && players.length !== 1) throw new Error('Chơi đơn Nonogram cần đúng 1 người.');
  if (mode === 'race' && players.length < 2) throw new Error('Đua Nonogram cần 2–4 người.');
  const size = [5, 10, 15].includes(opts.size) ? opts.size : 10;
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    seed, rng: seed,
    phase: 'playing', /* 'playing' | 'ended' */
    mode, solo: mode === 'solo', race: mode === 'race',
    size,
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null })),
    prog: {},
    solution: null, totalBlack: 0, rowClues: [], colClues: [],
    winner: null, winnerIds: [], losers: [],
    endReason: null, /* 'complete' | 'percent' | 'dead' | 'resign' | 'draw' */
    startedAt: Date.now(), endedAt: null,
    log: [],
  };
  const { pic, total } = genPicture(() => nextRand(s), size);
  s.solution = pic;
  s.totalBlack = total;
  s.rowClues = pic.map(row => cluesForLine(row));
  s.colClues = Array.from({ length: size }, (_, x) => cluesForLine(pic.map(row => row[x])));
  for (const p of s.players) {
    s.prog[p.id] = {
      grid: Array.from({ length: size }, () => Array(size).fill(CELL.EMPTY)),
      filled: 0, mistakes: 0, hintsUsed: 0,
      status: 'playing', doneAt: null,
    };
  }
  pushLog(s, mode === 'solo'
    ? `🧩 Nonogram — chơi đơn ${size}×${size}: tô đúng hết ${total} ô đen thì thắng! Tô sai 3 lần thì thua.`
    : `🧩 Nonogram — đua ${size}×${size}: ai tô đủ ${total} ô đen trước thì thắng! Hết 180 giây thì so % hoàn thành.`);
  return s;
}

export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || typeof s !== 'object' || !Array.isArray(s.players) || !s.prog || !s.solution) throw new Error('Trạng thái Nonogram không hợp lệ.');
  return s;
}

export function actors(s) {
  if (s.phase !== 'playing') return [];
  return s.players.filter(p => s.prog[p.id] && s.prog[p.id].status === 'playing').map(p => p.id);
}

function validCell(s, x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < s.size && y >= 0 && y < s.size;
}

export function applyAction(s, pid, a, ctx) {
  /* 'timeout' là lệnh của chủ phòng khi hết 180 giây đua — không phụ
     thuộc người chơi gửi, xử lý trước mọi kiểm tra trạng thái. */
  if (a && a.type === 'timeout') {
    if (!s || s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
    if (s.mode !== 'race') return { ok: false, reason: 'Chỉ đua mới có giới hạn giờ.' };
    /* hết giờ: ai cũng bị tính là xong, so % hoàn thành */
    for (const p of s.players) {
      const pr = s.prog[p.id];
      if (pr.status === 'playing') { pr.status = 'done'; pr.doneAt = Date.now(); }
    }
    s.seq++;
    checkRaceEnd(s);
    return { ok: true };
  }
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const prog = s.prog[pid];
  if (!prog || prog.status !== 'playing') return { ok: false, reason: 'Người chơi không còn trong ván.' };
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'fill': {
      if (!validCell(s, a.x, a.y)) return { ok: false, reason: 'Ô không hợp lệ.' };
      const cur = prog.grid[a.y][a.x];
      if (cur === CELL.FILLED) return { ok: false, reason: 'Ô này đã tô rồi.' };
      if (cur === CELL.LOCKED) return { ok: false, reason: 'Ô này đã bị khóa vì tô sai.' };
      if (s.solution[a.y][a.x] === 1) {
        prog.grid[a.y][a.x] = CELL.FILLED;
        prog.filled++;
        if (prog.filled >= s.totalBlack) {
          s.seq++;
          endGame(s, pid, s.players.filter(p => p.id !== pid).map(p => p.id), 'complete');
          return { ok: true };
        }
      } else {
        prog.grid[a.y][a.x] = CELL.LOCKED;
        prog.mistakes++;
        pushLog(s, `❌ ${pOf(s, pid).name} tô sai 1 ô (còn ${LIVES - prog.mistakes} mạng).`, 'bad');
        if (prog.mistakes >= LIVES) { s.seq++; die(s, pid); return { ok: true }; }
      }
      break;
    }
    case 'mark': {
      if (!validCell(s, a.x, a.y)) return { ok: false, reason: 'Ô không hợp lệ.' };
      const cur = prog.grid[a.y][a.x];
      if (cur === CELL.FILLED || cur === CELL.LOCKED) return { ok: false, reason: 'Không đánh dấu được ô này.' };
      prog.grid[a.y][a.x] = cur === CELL.MARKED ? CELL.EMPTY : CELL.MARKED;
      break;
    }
    case 'clear': {
      if (!validCell(s, a.x, a.y)) return { ok: false, reason: 'Ô không hợp lệ.' };
      const cur = prog.grid[a.y][a.x];
      if (cur === CELL.LOCKED) return { ok: false, reason: 'Ô bị khóa không xóa được.' };
      if (cur === CELL.EMPTY) return { ok: false, reason: 'Ô này đang trống.' };
      if (cur === CELL.FILLED) prog.filled--;
      prog.grid[a.y][a.x] = CELL.EMPTY;
      break;
    }
    case 'hint': {
      if (prog.hintsUsed >= HINTS) return { ok: false, reason: 'Đã hết lượt gợi ý (tối đa 3).' };
      const missing = [];
      for (let y = 0; y < s.size; y++) {
        for (let x = 0; x < s.size; x++) {
          if (s.solution[y][x] === 1 && prog.grid[y][x] !== CELL.FILLED) missing.push({ x, y });
        }
      }
      if (!missing.length) return { ok: false, reason: 'Không còn ô đen nào chưa tô.' };
      const pick = missing[Math.floor(nextRand(s) * missing.length)];
      prog.grid[pick.y][pick.x] = CELL.FILLED;
      prog.filled++;
      prog.hintsUsed++;
      pushLog(s, `💡 ${pOf(s, pid).name} dùng gợi ý (còn ${HINTS - prog.hintsUsed} lượt).`, '');
      if (prog.filled >= s.totalBlack) {
        s.seq++;
        endGame(s, pid, s.players.filter(p => p.id !== pid).map(p => p.id), 'complete');
        return { ok: true };
      }
      break;
    }
    case 'resign': {
      prog.status = 'resigned';
      prog.doneAt = Date.now();
      pushLog(s, `🏳️ ${pOf(s, pid).name} xin thua.`, 'bad');
      if (s.mode === 'solo') {
        endGame(s, null, [pid], 'resign');
      } else {
        /* đua: người xin thua thì thua, các người còn lại chơi tiếp */
        checkRaceEnd(s);
      }
      break;
    }
    default:
      return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
  s.seq++;
  return { ok: true };
}

export function viewFor(s, pid) {
  const me = s.prog[pid] || {};
  const my = me.grid ? {
    grid: me.grid.map(row => row.slice()),
    rowClues: s.rowClues.map(c => c.slice()),
    colClues: s.colClues.map(c => c.slice()),
    size: s.size, totalBlack: s.totalBlack,
    filled: me.filled, mistakes: me.mistakes,
    livesLeft: Math.max(0, LIVES - (me.mistakes || 0)),
    hintsLeft: Math.max(0, HINTS - (me.hintsUsed || 0)),
    hintsUsed: me.hintsUsed,
    percent: percentOf(me, s.totalBlack),
    status: me.status,
  } : null;
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    startedAt: s.startedAt, endedAt: s.endedAt,
    winner: s.winner, winnerIds: (s.winnerIds || []).slice(), losers: (s.losers || []).slice(), endReason: s.endReason,
    final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    mode: s.mode, solo: s.solo, race: s.race,
    size: s.size, totalBlack: s.totalBlack,
    my,
    players: s.players.map(p => {
      const q = s.prog[p.id] || {};
      return {
        id: p.id, name: p.name, isBot: !!p.isBot, botLevel: p.level || null,
        score: q.filled || 0, filled: q.filled || 0,
        percent: percentOf(q, s.totalBlack), mistakes: q.mistakes || 0,
        status: q.status || 'playing',
      };
    }),
    log: s.log.slice(-20),
    me: pid,
  };
}
