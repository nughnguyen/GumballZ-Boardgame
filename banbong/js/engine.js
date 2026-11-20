// 🏀 Bắn Bóng (Breakout) — luật chơi (engine thuần, không phụ thuộc DOM).
//
// LUẬT:
// - Sân 480×640. Vợt rộng 90 ở đáy, di chuyển ngang bằng phím mũi tên /
//   chuột / chạm kéo. Bóng nảy theo vật lý bước cố định (1 tick ≈ 33ms
//   ngoài đời thật — đồng hồ tick chỉ chủ phòng chạy, theo mẫu Rắn Săn
//   Mồi): chạm tường trái/phải/trên thì nảy; chạm vợt thì nảy lên, vx
//   phụ thuộc vị trí chạm trên vợt (lệch trái bay trái, lệch phải bay
//   phải); chạm gạch thì gạch mất máu, bóng nảy lại.
// - Gạch: 10 cột × 6 hàng ở phía trên. Hàng trên cùng là gạch cứng
//   (2 máu, +20đ khi phá); các hàng còn lại 1 máu, +10đ khi phá.
//   Bóng càng phá nhiều gạch càng nhanh: tốc độ = min(9, 6 + 0.06 ×
//   số gạch đã phá).
// - Bóng rơi qua đáy = mất 1 mạng (3 mạng); hết 3 mạng thì thua.
// - Chơi đơn: phá hết gạch thì thắng; hết mạng trước thì thua.
// - Đua (đấu máy / online 2–4 người / chung máy 2 người): ai phá hết
//   gạch trước thì thắng; sau 180 giây (RACE_TICKS tick) chưa ai phá
//   hết thì ai nhiều điểm nhất thắng, bằng điểm thì hoà; mất hết mạng
//   hoặc xin thua thì bị loại, người còn lại chơi tiếp.
// - viewFor: mỗi người chỉ thấy sân + bóng + gạch của MÌNH; đối thủ chỉ
//   thấy tóm tắt (điểm, gạch còn lại, mạng, trạng thái) — KHÔNG thấy
//   sân của đối thủ. Hết ván thì thấy bảng xếp hạng.
export const W = 480;
export const H = 640;
export const PADDLE_W = 90;
export const PADDLE_H = 12;
export const PADDLE_Y = H - 30; /* mép trên của vợt */
export const BALL_R = 6;
export const BRICK_COLS = 10;
export const BRICK_ROWS = 6;
export const BRICK_W = 44;
export const BRICK_H = 20;
export const BRICK_GAP = 2;
export const BRICK_X0 = 10;
export const BRICK_Y0 = 50;
export const LIVES = 3;
export const RACE_TIME_MS = 180000; /* đua tối đa 180 giây */
export const TICK_MS = 33; /* 1 tick mô phỏng ≈ 33ms ngoài đời */
export const RACE_TICKS = Math.round(RACE_TIME_MS / TICK_MS); /* 5454 tick */
export const BASE_SPEED = 6.0;
export const MAX_SPEED = 9.0;
export const PADDLE_KEY_STEP = 16; /* 1 lần bấm phím dịch vợt 16px */
export const PADDLE_MAX_DX = 24; /* 1 hành động 'move' dịch tối đa 24px */
export const SCORE_BRICK = 10; /* phá gạch thường +10đ */
export const SCORE_HARD = 20; /* phá gạch cứng +20đ */
export const TOTAL_BRICKS = BRICK_COLS * BRICK_ROWS; /* 60 gạch */

export function speedFor(bricksCleared) {
  return Math.min(MAX_SPEED, BASE_SPEED + (bricksCleared || 0) * 0.06);
}
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
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

export function brickRect(c, r) {
  return {
    x: BRICK_X0 + c * (BRICK_W + BRICK_GAP),
    y: BRICK_Y0 + r * (BRICK_H + BRICK_GAP),
    w: BRICK_W, h: BRICK_H,
  };
}
function makeBricks() {
  const b = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    const row = [];
    for (let c = 0; c < BRICK_COLS; c++) row.push(r === 0 ? 2 : 1); /* hàng 0 = gạch cứng */
    b.push(row);
  }
  return b;
}
function bricksLeft(prog) {
  let n = 0;
  for (const row of prog.bricks) for (const hp of row) if (hp > 0) n++;
  return n;
}
/* Bóng mới: đặt trên vợt, bay lên, vx lệch ngẫu nhiên (RNG có seed). */
function serveBall(s, prog) {
  const sp = speedFor(prog.bricksCleared);
  const sign = nextRand(s) < 0.5 ? -1 : 1;
  prog.ball = {
    x: prog.paddleX + PADDLE_W / 2,
    y: PADDLE_Y - BALL_R - 1,
    vx: sign * sp * 0.35,
    vy: -Math.sqrt(sp * sp - (sp * 0.35) * (sp * 0.35)),
  };
}

function die(s, pid) {
  const prog = s.prog[pid];
  prog.status = 'dead';
  prog.doneAt = Date.now();
  pushLog(s, `💥 ${pOf(s, pid).name} hết mạng!`, 'bad');
  if (s.mode === 'solo') {
    endGame(s, null, [pid], 'dead');
    return;
  }
  checkRaceEnd(s);
}
/* đua: ai phá hết gạch trước thì thắng; nhiều người cùng phá hết thì so điểm, hoà điểm thì hoà */
function checkRaceWin(s) {
  const done = s.players.filter(p => bricksLeft(s.prog[p.id]) === 0 && s.prog[p.id].status === 'playing');
  if (!done.length) return;
  if (done.length === 1) {
    const w = done[0];
    endGame(s, w.id, s.players.filter(p => p.id !== w.id).map(p => p.id), 'clear');
    return;
  }
  const best = Math.max(...done.map(p => s.prog[p.id].score || 0));
  const top = done.filter(p => (s.prog[p.id].score || 0) === best);
  if (top.length === 1) endGame(s, top[0].id, s.players.filter(p => p.id !== top[0].id).map(p => p.id), 'clear');
  else endGame(s, null, s.players.map(p => p.id), 'draw');
}
/* đua: tất cả đều xong (chết/xin thua) mà chưa ai phá hết → so điểm, hoà thì hoà */
function checkRaceEnd(s) {
  if (s.phase !== 'playing' || s.mode !== 'race') return;
  if (s.players.some(p => s.prog[p.id].status === 'playing')) return;
  const best = Math.max(...s.players.map(p => s.prog[p.id].score || 0));
  const top = s.players.filter(p => (s.prog[p.id].score || 0) === best);
  if (top.length === 1) endGame(s, top[0].id, s.players.filter(p => p.id !== top[0].id).map(p => p.id), 'score');
  else endGame(s, null, s.players.map(p => p.id), 'draw');
}
/* đua: hết 180 giây → so điểm, hoà thì hoà */
function checkRaceTimeout(s) {
  if (s.phase !== 'playing' || s.mode !== 'race') return;
  const maxTicks = Math.max(...s.players.map(p => s.prog[p.id].tickCount || 0));
  if (maxTicks < RACE_TICKS) return;
  const best = Math.max(...s.players.map(p => s.prog[p.id].score || 0));
  const top = s.players.filter(p => (s.prog[p.id].score || 0) === best);
  if (top.length === 1) endGame(s, top[0].id, s.players.filter(p => p.id !== top[0].id).map(p => p.id), 'timeout');
  else endGame(s, null, s.players.map(p => p.id), 'draw');
}
function finishSummary(s) {
  const out = {};
  for (const p of s.players) {
    const pr = s.prog[p.id];
    out[p.id] = {
      score: pr.score, bricksCleared: pr.bricksCleared, livesLeft: pr.lives,
      ballsLost: pr.ballsLost,
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
  s.endReason = reason; /* 'clear' | 'score' | 'timeout' | 'dead' | 'resign' | 'draw' */
  for (const p of s.players) if (!s.prog[p.id].doneAt) s.prog[p.id].doneAt = s.endedAt;
  s.final = { summary: finishSummary(s) };
  if (reason === 'draw') pushLog(s, '🤝 Hoà! Không ai hơn ai.', '');
  else if (winner) pushLog(s, `🏆 ${pOf(s, winner).name} thắng ván!`, 'good');
  else pushLog(s, '😢 Hết ván!', '');
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 1 || players.length > 4) throw new Error('Bắn Bóng chơi 1–4 người (chơi đơn = 1, đua = 2–4).');
  const mode = opts.bbMode === 'solo' ? 'solo' : 'race';
  if (mode === 'solo' && players.length !== 1) throw new Error('Chơi đơn Bắn Bóng cần đúng 1 người.');
  if (mode === 'race' && players.length < 2) throw new Error('Đua Bắn Bóng cần 2–4 người.');
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    seed, rng: seed,
    phase: 'playing', /* 'playing' | 'ended' */
    mode, solo: mode === 'solo', race: mode === 'race',
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null })),
    prog: {},
    winner: null, winnerIds: [], losers: [],
    endReason: null, /* 'clear' | 'score' | 'timeout' | 'dead' | 'resign' | 'draw' */
    startedAt: Date.now(), endedAt: null,
    log: [],
  };
  /* warm-up RNG: LCG cho lần random đầu với seed nhỏ luôn < 0.5 (bóng
     ban đầu lúc nào cũng bay sang trái) — quay 3 vòng cho trộn đều. */
  for (let i = 0; i < 3; i++) nextRand(s);
  for (const p of s.players) {
    const prog = {
      paddleX: (W - PADDLE_W) / 2,
      ball: null,
      bricks: makeBricks(),
      score: 0, bricksCleared: 0, lives: LIVES, ballsLost: 0,
      tickCount: 0,
      status: 'playing', doneAt: null,
    };
    s.prog[p.id] = prog;
    serveBall(s, prog);
  }
  pushLog(s, mode === 'solo'
    ? '🏀 Bắn Bóng — chơi đơn: phá hết 60 gạch trước khi hết 3 mạng thì thắng!'
    : '🏀 Bắn Bóng — đua: ai phá hết gạch trước thì thắng! Hết 180 giây thì so điểm.');
  return s;
}

export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || typeof s !== 'object' || !Array.isArray(s.players) || !s.prog) throw new Error('Trạng thái Bắn Bóng không hợp lệ.');
  return s;
}

export function actors(s) {
  if (s.phase !== 'playing') return [];
  return s.players.filter(p => s.prog[p.id] && s.prog[p.id].status === 'playing').map(p => p.id);
}

/* 1 tick vật lý: di chuyển bóng, nảy tường/vợt/gạch, mất bóng. */
function stepBall(s, pid) {
  const prog = s.prog[pid];
  const b = prog.ball;
  if (!b) return;
  const sp = speedFor(prog.bricksCleared);
  const px = b.x, py = b.y; /* vị trí trước khi di chuyển — để quyết định hướng nảy */
  let nx = b.x + b.vx, ny = b.y + b.vy;

  /* tường trái/phải/trên */
  if (nx < BALL_R) { nx = BALL_R; b.vx = Math.abs(b.vx); }
  else if (nx > W - BALL_R) { nx = W - BALL_R; b.vx = -Math.abs(b.vx); }
  if (ny < BALL_R) { ny = BALL_R; b.vy = Math.abs(b.vy); }

  /* vợt: chỉ nảy khi bóng đang rơi xuống và vừa chạm mép trên vợt */
  if (b.vy > 0 && py + BALL_R <= PADDLE_Y && ny + BALL_R >= PADDLE_Y &&
      nx >= prog.paddleX - BALL_R && nx <= prog.paddleX + PADDLE_W + BALL_R) {
    const offset = clamp((nx - (prog.paddleX + PADDLE_W / 2)) / (PADDLE_W / 2), -1, 1);
    b.vx = offset * 0.85 * sp;
    b.vy = -Math.sqrt(Math.max(0.25 * sp * sp, sp * sp - b.vx * b.vx));
    ny = PADDLE_Y - BALL_R - 0.1;
  }

  /* gạch: tìm gạch đầu tiên chạm bóng (hình tròn chạm hình chữ nhật) */
  let hit = null;
  for (let r = 0; r < BRICK_ROWS && !hit; r++) {
    for (let c = 0; c < BRICK_COLS && !hit; c++) {
      if (prog.bricks[r][c] <= 0) continue;
      const rc = brickRect(c, r);
      const cx = clamp(nx, rc.x, rc.x + rc.w);
      const cy = clamp(ny, rc.y, rc.y + rc.h);
      const dx = nx - cx, dy = ny - cy;
      if (dx * dx + dy * dy < BALL_R * BALL_R) hit = { c, r, rc };
    }
  }
  if (hit) {
    const { c, r, rc } = hit;
    const hard = r === 0;
    prog.bricks[r][c]--;
    if (prog.bricks[r][c] <= 0) {
      prog.score += hard ? SCORE_HARD : SCORE_BRICK;
      prog.bricksCleared++;
      pushLog(s, `🧱 ${pOf(s, pid).name} phá gạch${hard ? ' cứng' : ''} (+${hard ? SCORE_HARD : SCORE_BRICK}đ)`, '');
    } else {
      pushLog(s, `🧱 ${pOf(s, pid).name} nứt gạch cứng!`, '');
    }
    /* quyết định hướng nảy: bóng từ trên/dưới tới thì nảy dọc, từ bên thì nảy ngang */
    if (py + BALL_R <= rc.y || py - BALL_R >= rc.y + rc.h) {
      b.vy = -b.vy;
      ny = b.vy > 0 ? rc.y + rc.h + BALL_R + 0.1 : rc.y - BALL_R - 0.1;
    } else {
      b.vx = -b.vx;
      nx = b.vx > 0 ? rc.x + rc.w + BALL_R + 0.1 : rc.x - BALL_R - 0.1;
    }
  }

  b.x = nx; b.y = ny;

  /* bóng rơi qua đáy */
  if (b.y - BALL_R > H) {
    prog.ballsLost++;
    prog.lives--;
    pushLog(s, `💥 ${pOf(s, pid).name} để bóng rơi! Còn ${prog.lives} mạng.`, 'bad');
    if (prog.lives <= 0) { die(s, pid); return; }
    serveBall(s, prog);
    return;
  }

  /* phá hết gạch → thắng (đua: kiểm tra ai thắng trước) */
  if (bricksLeft(prog) === 0) {
    if (s.mode === 'solo') {
      endGame(s, pid, s.players.filter(p => p.id !== pid).map(p => p.id), 'clear');
    } else {
      checkRaceWin(s);
    }
  }
}

export function applyAction(s, pid, a, ctx) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const prog = s.prog[pid];
  if (!prog || prog.status !== 'playing') return { ok: false, reason: 'Người chơi không còn trong ván.' };
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'move': {
      /* dịch vợt trái/phải theo bước cố định (phím mũi tên) */
      const dx = +a.dx;
      if (!Number.isFinite(dx)) return { ok: false, reason: 'dx không hợp lệ.' };
      prog.paddleX = clamp(prog.paddleX + clamp(dx, -PADDLE_MAX_DX, PADDLE_MAX_DX), 0, W - PADDLE_W);
      break;
    }
    case 'setX': {
      /* đặt vị trí vợt theo tâm x (chuột/chạm/bot) */
      const x = +a.x;
      if (!Number.isFinite(x)) return { ok: false, reason: 'x không hợp lệ.' };
      prog.paddleX = clamp(x - PADDLE_W / 2, 0, W - PADDLE_W);
      break;
    }
    case 'tick': {
      prog.tickCount++;
      stepBall(s, pid);
      if (s.phase !== 'playing') return { ok: true }; /* vừa kết thúc ván trong stepBall */
      checkRaceTimeout(s);
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
  const my = me.ball ? {
    paddleX: me.paddleX,
    ball: { x: me.ball.x, y: me.ball.y, vx: me.ball.vx, vy: me.ball.vy },
    bricks: (me.bricks || []).map(row => row.slice()),
    score: me.score, lives: me.lives, bricksLeft: bricksLeft(me),
    bricksCleared: me.bricksCleared, speed: speedFor(me.bricksCleared),
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
        score: q.score || 0, bricksLeft: q.bricks ? bricksLeft(q) : 0, lives: q.lives || 0,
        status: q.status || 'playing',
      };
    }),
    log: s.log.slice(-20),
    me: pid,
  };
}
