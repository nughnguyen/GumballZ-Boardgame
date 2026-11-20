// 🐍 Rắn Săn Mồi — luật chơi (engine thuần, không phụ thuộc DOM).
//
// LUẬT:
// - Lưới 20×20. Mỗi người 1 bảng riêng. Rắn bắt đầu dài 4 ô ở giữa bảng,
//   đầu ở (10,10), thân trải về bên trái, hướng ban đầu sang phải.
// - Mồi xuất hiện ngẫu nhiên trên ô trống (dùng RNG có seed của ván nên
//   2 state cùng seed đồng bộ lockstep). Ăn mồi: dài +1, +10 điểm.
// - Tốc độ: tick 180ms, nhanh dần 10ms mỗi 5 mồi, tối thiểu 90ms.
//   speedFor(foods) = max(90, 180 − floor(foods/5) × 10).
// - Đổi hướng: 'move' chỉ xếp vào hàng đợi (tối đa 3), mỗi tick áp dụng
//   1 hướng trong hàng đợi; không cho quay đầu 180° so với hướng cuối
//   cùng trong hàng đợi (hoặc hướng hiện tại nếu hàng đợi rỗng).
// - Chết: đâm tường hoặc tự cắn mình. Khi không ăn mồi thì đuôi sẽ nhích
//   đi nên ô đuôi được tính là trống (rắn được phép đi vào ô đuôi cũ);
//   khi ăn mồi thì đuôi không nhích nên ô đuôi cũng là chướng ngại.
// - Chơi đơn: thắng ngay khi rắn dài 20 (ăn 16 mồi); chết trước đó thì thua.
// - Đua (đấu máy / online 2–4 người / chung máy 2 người): ai dài 15 trước
//   thì thắng; nhiều người cùng đạt 15 thì so điểm, bằng điểm thì hoà;
//   chết/xin thua thì bị loại, người còn lại chơi tiếp; tất cả đều xong
//   mà chưa ai đạt 15 thì so độ dài, rồi so điểm, bằng nhau thì hoà.
// - Xin thua = thua ván (đua thì người còn lại chơi tiếp).
// - viewFor: mỗi người chỉ thấy bảng + mồi + điểm của MÌNH; đối thủ chỉ
//   thấy tóm tắt (điểm, độ dài, số mồi, trạng thái) — KHÔNG thấy bảng
//   của đối thủ. Hết ván thì thấy bảng xếp hạng.
export const GRID_W = 20;
export const GRID_H = 20;
export const SOLO_WIN_LEN = 20; /* chơi đơn: thắng khi rắn dài 20 */
export const RACE_WIN_LEN = 15; /* đua: ai dài 15 trước thì thắng */
export const FOOD_SCORE = 10; /* ăn 1 mồi +10 điểm */
export const START_LEN = 4;
export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

export function speedFor(foods) { return Math.max(90, 180 - Math.floor(Math.max(0, foods) / 5) * 10); }
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

function spawnFood(s, prog) {
  const taken = new Set(prog.snake.map(c => c.x + ',' + c.y));
  const free = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (!taken.has(x + ',' + y)) free.push({ x, y });
    }
  }
  if (!free.length) { prog.food = null; return; } /* bảng đầy — không còn chỗ đặt mồi */
  prog.food = free[Math.floor(nextRand(s) * free.length)];
}
function spawnSnake(prog) {
  prog.snake = [];
  for (let i = 0; i < START_LEN; i++) prog.snake.push({ x: 10 - i, y: 10 });
  prog.dir = 'right';
  prog.queue = [];
}

function die(s, pid, how) {
  const prog = s.prog[pid];
  prog.status = 'dead';
  prog.doneAt = Date.now();
  pushLog(s, `💥 ${pOf(s, pid).name} ${how === 'wall' ? 'đâm tường' : 'tự cắn mình'}!`, 'bad');
  if (s.mode === 'solo') {
    endGame(s, null, [pid], 'dead');
    return;
  }
  checkRaceEnd(s);
}
/* đua: ai đủ 15 trước thì thắng; nhiều người cùng đủ thì so điểm, hoà điểm thì hoà */
function checkRaceWin(s) {
  const done = s.players.filter(p => (s.prog[p.id].snake || []).length >= RACE_WIN_LEN);
  if (!done.length) return;
  if (done.length === 1) {
    const w = done[0];
    endGame(s, w.id, s.players.filter(p => p.id !== w.id).map(p => p.id), 'length');
    return;
  }
  const best = Math.max(...done.map(p => s.prog[p.id].score || 0));
  const top = done.filter(p => (s.prog[p.id].score || 0) === best);
  if (top.length === 1) endGame(s, top[0].id, s.players.filter(p => p.id !== top[0].id).map(p => p.id), 'length');
  else endGame(s, null, s.players.map(p => p.id), 'draw');
}
/* đua: tất cả đều xong (chết/xin thua) mà chưa ai đủ 15 → so độ dài, rồi điểm, hoà thì hoà */
function checkRaceEnd(s) {
  if (s.phase !== 'playing' || s.mode !== 'race') return;
  if (s.players.some(p => s.prog[p.id].status === 'playing')) return;
  const len = p => (s.prog[p.id].snake || []).length;
  const bestLen = Math.max(...s.players.map(len));
  const topLen = s.players.filter(p => len(p) === bestLen);
  const pool = topLen.length === 1 ? topLen : topLen.filter(p => (s.prog[p.id].score || 0) === Math.max(...topLen.map(q => s.prog[q.id].score || 0)));
  if (pool.length === 1) endGame(s, pool[0].id, s.players.filter(p => p.id !== pool[0].id).map(p => p.id), 'score');
  else endGame(s, null, s.players.map(p => p.id), 'draw');
}
function finishSummary(s) {
  const out = {};
  for (const p of s.players) {
    const pr = s.prog[p.id];
    out[p.id] = {
      score: pr.score, length: pr.snake.length, foods: pr.foods,
      maxLength: pr.maxLength,
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
  s.endReason = reason; /* 'length' | 'score' | 'dead' | 'resign' | 'draw' */
  for (const p of s.players) if (!s.prog[p.id].doneAt) s.prog[p.id].doneAt = s.endedAt;
  s.final = { summary: finishSummary(s) };
  if (reason === 'draw') pushLog(s, '🤝 Hoà! Không ai hơn ai.', '');
  else if (winner) pushLog(s, `🏆 ${pOf(s, winner).name} thắng ván!`, 'good');
  else pushLog(s, '😢 Hết ván!', '');
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 1 || players.length > 4) throw new Error('Rắn Săn Mồi chơi 1–4 người (chơi đơn = 1, đua = 2–4).');
  const mode = opts.rsMode === 'solo' ? 'solo' : 'race';
  if (mode === 'solo' && players.length !== 1) throw new Error('Chơi đơn Rắn Săn Mồi cần đúng 1 người.');
  if (mode === 'race' && players.length < 2) throw new Error('Đua Rắn Săn Mồi cần 2–4 người.');
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    seed, rng: seed,
    phase: 'playing', /* 'playing' | 'ended' */
    mode, solo: mode === 'solo', race: mode === 'race',
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null })),
    prog: {},
    winner: null, winnerIds: [], losers: [],
    endReason: null, /* 'length' | 'score' | 'dead' | 'resign' | 'draw' */
    startedAt: Date.now(), endedAt: null,
    log: [],
  };
  for (const p of s.players) {
    const prog = {
      snake: [], dir: 'right', queue: [], food: null,
      score: 0, foods: 0, maxLength: START_LEN,
      status: 'playing', doneAt: null,
    };
    s.prog[p.id] = prog;
    spawnSnake(prog);
    spawnFood(s, prog);
  }
  pushLog(s, mode === 'solo'
    ? '🐍 Rắn Săn Mồi — chơi đơn: ăn tới khi rắn dài 20 thì thắng! Đừng đâm tường hay tự cắn mình.'
    : '🐍 Rắn Săn Mồi — đua: ai dài 15 trước thì thắng! Mỗi người 1 bảng riêng.');
  return s;
}

export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || typeof s !== 'object' || !Array.isArray(s.players) || !s.prog) throw new Error('Trạng thái Rắn Săn Mồi không hợp lệ.');
  return s;
}

export function actors(s) {
  if (s.phase !== 'playing') return [];
  return s.players.filter(p => s.prog[p.id] && s.prog[p.id].status === 'playing').map(p => p.id);
}

export function applyAction(s, pid, a, ctx) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const prog = s.prog[pid];
  if (!prog || prog.status !== 'playing') return { ok: false, reason: 'Người chơi không còn trong ván.' };
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'move': {
      /* xếp hướng vào hàng đợi (tối đa 3); không cho quay đầu 180° */
      const dir = a.dir;
      if (!DIRS[dir]) return { ok: false, reason: 'Hướng không hợp lệ.' };
      const last = prog.queue.length ? prog.queue[prog.queue.length - 1] : prog.dir;
      if (OPP[dir] === last) break; /* quay đầu 180°: bỏ qua, không lỗi */
      if (prog.queue.length < 3 && prog.queue[prog.queue.length - 1] !== dir) prog.queue.push(dir);
      break;
    }
    case 'tick': {
      if (prog.queue.length) prog.dir = prog.queue.shift();
      const d = DIRS[prog.dir];
      const head = prog.snake[0];
      const nh = { x: head.x + d.x, y: head.y + d.y };
      if (nh.x < 0 || nh.x >= GRID_W || nh.y < 0 || nh.y >= GRID_H) { s.seq++; die(s, pid, 'wall'); return { ok: true }; }
      const eating = prog.food && nh.x === prog.food.x && nh.y === prog.food.y;
      /* không ăn thì đuôi sẽ nhích đi nên ô đuôi được tính là trống */
      const body = eating ? prog.snake : prog.snake.slice(0, -1);
      if (body.some(c => c.x === nh.x && c.y === nh.y)) { s.seq++; die(s, pid, 'self'); return { ok: true }; }
      prog.snake.unshift(nh);
      if (eating) {
        prog.score += FOOD_SCORE;
        prog.foods++;
        if (prog.snake.length > prog.maxLength) prog.maxLength = prog.snake.length;
        pushLog(s, `🍎 ${pOf(s, pid).name} ăn mồi (+${FOOD_SCORE}đ, dài ${prog.snake.length})`, '');
        spawnFood(s, prog);
        if (s.phase !== 'playing') return { ok: true }; /* spawnFood không kết thúc ván, chỉ phòng thủ */
        if (s.mode === 'solo' && prog.snake.length >= SOLO_WIN_LEN) {
          endGame(s, pid, s.players.filter(p => p.id !== pid).map(p => p.id), 'length');
          s.seq++;
          return { ok: true };
        }
        if (s.mode === 'race' && prog.snake.length >= RACE_WIN_LEN) {
          checkRaceWin(s);
          s.seq++;
          return { ok: true };
        }
      } else {
        prog.snake.pop();
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
  const my = me.snake ? {
    snake: me.snake.map(c => ({ x: c.x, y: c.y })),
    dir: me.dir,
    food: me.food ? { x: me.food.x, y: me.food.y } : null,
    score: me.score, foods: me.foods, length: me.snake.length,
    maxLength: me.maxLength, speedMs: speedFor(me.foods || 0),
  } : null;
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    startedAt: s.startedAt, endedAt: s.endedAt,
    winner: s.winner, winnerIds: (s.winnerIds || []).slice(), losers: (s.losers || []).slice(), endReason: s.endReason,
    final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    mode: s.mode, solo: s.solo, race: s.race,
    my,
    players: s.players.map(p => {
      const q = s.prog[p.id] || {};
      return {
        id: p.id, name: p.name, isBot: !!p.isBot, botLevel: p.level || null,
        score: q.score || 0, length: (q.snake || []).length, foods: q.foods || 0,
        status: q.status || 'playing',
      };
    }),
    log: s.log.slice(-20),
    me: pid,
  };
}
