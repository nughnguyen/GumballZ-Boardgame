// 🎱 Bida 8-ball — luật chơi (engine thuần, không phụ thuộc DOM).
//
// LUẬT (8-ball chuẩn, giản lược cho web 2D):
// - Bàn 900×450 (khung 30px), 6 lỗ (4 góc + 2 giữa cạnh dài). 15 bi mục
//   tiêu (trơn 1–7, sọc 9–15, bi 8) + bi cái. Xếp tam giác chuẩn ở điểm
//   chân (apex 660,255), bi cái ở điểm đầu (240,255).
// - Lượt đầu là cú phá (break): bàn vẫn mở (không chia nhóm), bi 8 vào
//   lỗ khi phá thì đặt lại ở điểm chân. Sau cú phá, bi đầu tiên vào lỗ
//   (không tính bi 8) sẽ chia nhóm: trơn/sọc.
// - Mỗi lượt: bắn bi cái vào 1 bi thuộc nhóm của mình (hoặc bất kỳ bi
//   nào khi bàn còn mở, trừ bi 8). Vào lỗ đúng nhóm thì được bắn tiếp;
//   không vào lỗ hoặc phạm lỗi thì đổi lượt.
// - Phạm lỗi: bi cái rơi lỗ (scratch), bi cái không chạm bi nào, chạm
//   bi đối thủ (hoặc bi 8) trước, hoặc sau khi chạm mà không có bi nào
//   chạm băng hay rơi lỗ. Phạm lỗi → đối thủ được đặt bi cái tự do
//   (ball in hand).
// - Hết nhóm của mình thì phải đánh bi 8 cuối cùng: vào bi 8 đúng luật
//   thì thắng; vào bi 8 sớm (chưa hết nhóm) hoặc kèm phạm lỗi thì thua
//   (foul8).
// - Đấu (2 người, 1 bàn chung): giới hạn 600 giây; hết giờ thì ai vào
//   lỗ nhiều bi hơn thắng, bằng nhau thì so ít lỗi hơn, bằng nữa thì hoà.
// - Chơi đơn (luyện tập): vào hết 15 bi thì thắng; không giới hạn giờ.
// - Vật lý 2D xác định (không dùng Math.random): va chạm đàn hồi giữa
//   các bi, nảy băng, rơi lỗ, ma sát — cùng 1 dãy action thì kết quả
//   luôn giống nhau (đồng bộ online + test).
// - viewFor: cả 2 người đều thấy toàn bộ bàn (bida là thông tin mở).
export const TABLE_W = 900;
export const TABLE_H = 450;
export const RAIL = 30;
export const MIN_X = RAIL;
export const MAX_X = RAIL + TABLE_W; /* 930 */
export const MIN_Y = RAIL;
export const MAX_Y = RAIL + TABLE_H; /* 480 */
export const BALL_R = 11;
export const POCKET_R = 24;
/* 6 lỗ: tâm lỗ dời vào trong 15px so với góc/mép bàn (45 thay vì 30)
   để bi lăn tới lỗ được bắt trước khi chạm băng — nếu tâm lỗ ở đúng
   góc (30,30) thì đường bi tới lỗ góc chạm băng trước (cách tâm lỗ
   24.6px, ngoài vùng bắt 24px) và lỗ góc gần như không vào được. */
const PIN = 15; /* độ lùi tâm lỗ vào trong so với mép bàn */
export const POCKETS = [[MIN_X + PIN, MIN_Y + PIN], [MIN_X + TABLE_W / 2, MIN_Y + PIN], [MAX_X - PIN, MIN_Y + PIN], [MIN_X + PIN, MAX_Y - PIN], [MIN_X + TABLE_W / 2, MAX_Y - PIN], [MAX_X - PIN, MAX_Y - PIN]];
export const REST_CUSHION = 0.72; /* hệ số nảy băng */
export const REST_BALL = 0.95; /* hệ số nảy bi-bi */
export const FRICTION = 1.1; /* ma sát lăn, suy giảm theo e^(-1.1 t) */
export const STOP_SPEED = 8; /* px/s: chậm hơn thì coi như dừng */
export const DT = 1 / 120; /* bước mô phỏng */
export const MAX_SIM_STEPS = 120 * 45; /* tối đa 45 giây mô phỏng / cú */
export const RACE_TIME_MS = 600000; /* đấu tối đa 10 phút */
export const MAX_SHOTS = 150; /* quá số cú này thì hoà (chống ván kẹt) */
export const CUE_SPOT = { x: 240, y: 255 };
export const FOOT_SPOT = { x: 660, y: 255 };
export const BALL_COLORS = {
  1: '#F6C90E', 2: '#2B59FF', 3: '#E63329', 4: '#7B2CBF',
  5: '#FF7A00', 6: '#1E7D32', 7: '#8D2B2B', 8: '#232323',
  9: '#F6C90E', 10: '#2B59FF', 11: '#E63329', 12: '#7B2CBF',
  13: '#FF7A00', 14: '#1E7D32', 15: '#8D2B2B',
};
export function groupOf(id) {
  if (id === 0) return null;
  if (id === 8) return 'eight';
  return id < 8 ? 'solid' : 'stripe';
}

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* gid phải DUY NHẤT cho mỗi lần tạo ván: bot giữ bộ nhớ chống lặp theo
   gid, mà gid lấy từ Math.random() nên khi test seed Math.random (chuẩn
   của mọi test node) hai ván cùng seed sẽ trùng gid và ván sau thừa hưởng
   bộ nhớ của ván trước → bot xin thua sớm. (Bài học từ Nhện.) */
let gidSeq = 0;
const pOf = (s, id) => s.players.find(p => p.id === id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

/* Xếp tam giác chuẩn: đỉnh là bi 1 ở điểm chân, bi 8 ở giữa, 2 góc cuối
   1 trơn 1 sọc. Hàng cách nhau 19.2px, trong hàng cách nhau 22.6px. */
function rackBalls() {
  const rows = [[1], [9, 2], [3, 8, 10], [11, 4, 12, 5], [6, 13, 7, 14, 15]];
  const balls = [{ id: 0, x: CUE_SPOT.x, y: CUE_SPOT.y, vx: 0, vy: 0, potted: false }];
  for (let r = 0; r < rows.length; r++) {
    for (let i = 0; i < rows[r].length; i++) {
      balls.push({
        id: rows[r][i],
        x: FOOT_SPOT.x + r * 19.2,
        y: FOOT_SPOT.y + (i - r / 2) * 22.6,
        vx: 0, vy: 0, potted: false,
      });
    }
  }
  balls.sort((a, b) => a.id - b.id);
  return balls;
}

/* ---------- vật lý: mô phỏng 1 cú bắn tới khi mọi bi dừng ---------- */
function snapshot(balls) {
  return balls.map(b => ({ id: b.id, x: b.x, y: b.y, potted: b.potted }));
}
export function simulateShot(ballsIn, angle, power, recordPath = false) {
  const balls = ballsIn.map(b => ({ id: b.id, x: b.x, y: b.y, vx: 0, vy: 0, potted: !!b.potted }));
  const cue = balls[0];
  if (!cue || cue.potted) return { balls, potted: [], firstContact: null, railAfterContact: false, steps: 0, path: recordPath ? [snapshot(balls)] : null };
  const speed = 120 + clamp(power, 0, 1) * 1280;
  cue.vx = Math.cos(angle) * speed;
  cue.vy = Math.sin(angle) * speed;
  const potted = [];
  let firstContact = null;
  let railAfterContact = false;
  const path = recordPath ? [snapshot(balls)] : null;
  const decay = Math.exp(-FRICTION * DT);
  let steps = 0;
  while (steps < MAX_SIM_STEPS) {
    let moving = false;
    for (const b of balls) {
      if (b.potted || (b.vx === 0 && b.vy === 0)) continue;
      moving = true;
      b.x += b.vx * DT;
      b.y += b.vy * DT;
    }
    if (!moving) break;
    /* rơi lỗ (kiểm tra trước khi nảy băng để bi không nảy qua miệng lỗ) */
    for (const b of balls) {
      if (b.potted || (b.vx === 0 && b.vy === 0)) continue;
      for (const [px, py] of POCKETS) {
        const dx = b.x - px, dy = b.y - py;
        if (dx * dx + dy * dy < POCKET_R * POCKET_R) {
          b.potted = true; b.vx = 0; b.vy = 0; b.x = -100; b.y = -100;
          potted.push(b.id);
          break;
        }
      }
    }
    /* nảy băng */
    for (const b of balls) {
      if (b.potted || (b.vx === 0 && b.vy === 0)) continue;
      if (b.x < MIN_X + BALL_R) { b.x = MIN_X + BALL_R; if (b.vx < 0) { b.vx = -b.vx * REST_CUSHION; if (firstContact !== null) railAfterContact = true; } }
      else if (b.x > MAX_X - BALL_R) { b.x = MAX_X - BALL_R; if (b.vx > 0) { b.vx = -b.vx * REST_CUSHION; if (firstContact !== null) railAfterContact = true; } }
      if (b.y < MIN_Y + BALL_R) { b.y = MIN_Y + BALL_R; if (b.vy < 0) { b.vy = -b.vy * REST_CUSHION; if (firstContact !== null) railAfterContact = true; } }
      else if (b.y > MAX_Y - BALL_R) { b.y = MAX_Y - BALL_R; if (b.vy > 0) { b.vy = -b.vy * REST_CUSHION; if (firstContact !== null) railAfterContact = true; } }
    }
    /* va chạm bi-bi (khối lượng bằng nhau, đàn hồi) */
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      if (a.potted) continue;
      for (let j = i + 1; j < balls.length; j++) {
        const c = balls[j];
        if (c.potted) continue;
        const dx = c.x - a.x, dy = c.y - a.y;
        const d2 = dx * dx + dy * dy;
        const minD = 2 * BALL_R;
        if (d2 >= minD * minD || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d, ny = dy / d;
        const overlap = (minD - d) / 2;
        a.x -= nx * overlap; a.y -= ny * overlap;
        c.x += nx * overlap; c.y += ny * overlap;
        if (firstContact === null && (a.id === 0 || c.id === 0)) {
          firstContact = a.id === 0 ? c.id : a.id;
        }
        const rvx = c.vx - a.vx, rvy = c.vy - a.vy;
        const vn = rvx * nx + rvy * ny;
        if (vn < 0) {
          const imp = -(1 + REST_BALL) * vn / 2;
          a.vx -= imp * nx; a.vy -= imp * ny;
          c.vx += imp * nx; c.vy += imp * ny;
        }
      }
    }
    /* ma sát lăn */
    for (const b of balls) {
      if (b.potted || (b.vx === 0 && b.vy === 0)) continue;
      b.vx *= decay; b.vy *= decay;
      if (Math.hypot(b.vx, b.vy) < STOP_SPEED) { b.vx = 0; b.vy = 0; }
    }
    steps++;
    if (recordPath && steps % 4 === 0) path.push(snapshot(balls));
  }
  if (recordPath) path.push(snapshot(balls));
  return { balls, potted, firstContact, railAfterContact, steps, path };
}

/* ---------- hỗ trợ ngắm ---------- */
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}
/* đường đi có thoáng không (không bi nào chắn trong vòng 2R) */
export function clearPath(balls, x1, y1, x2, y2, ignore = []) {
  for (const b of balls) {
    if (b.potted || ignore.includes(b.id)) continue;
    if (distToSegment(b.x, b.y, x1, y1, x2, y2) < 2 * BALL_R + 1) return false;
  }
  return true;
}
/* Ngắm bi mục tiêu vào 1 lỗ: trả về góc bắn + lực + vị trí bi ảo
   (ghost ball) + góc cắt. cuePos cho phép ngắm thử từ 1 vị trí khác
   (dùng khi bot chọn chỗ đặt bi cái). */
export function aimFor(balls, targetId, pocketIdx, cuePos = null) {
  const cue = cuePos || balls.find(b => b.id === 0);
  const target = balls.find(b => b.id === targetId);
  if (!cue || !target || target.potted) return null;
  if (!cuePos && cue.potted) return null;
  const [px, py] = POCKETS[pocketIdx];
  const dx = px - target.x, dy = py - target.y;
  const dTP = Math.hypot(dx, dy);
  if (dTP < 1) return null;
  const ux = dx / dTP, uy = dy / dTP;
  const gx = target.x - ux * 2 * BALL_R;
  const gy = target.y - uy * 2 * BALL_R;
  const cx = gx - cue.x, cy = gy - cue.y;
  const dCG = Math.hypot(cx, cy);
  if (dCG < 1) return null;
  const angle = Math.atan2(cy, cx);
  const cosCut = clamp((cx * ux + cy * uy) / dCG, -1, 1);
  const cut = Math.acos(cosCut);
  if (cut > 1.35) return null; /* cắt quá 77° thì gần như không vào được */
  if (!clearPath(balls, cue.x, cue.y, gx, gy, [0, targetId])) return null;
  if (!clearPath(balls, target.x, target.y, px, py, [targetId])) return null;
  const power = clamp(((dCG + dTP) * 1.25 + 100) / 1400, 0.12, 1);
  const score = 100 - (cut * 180 / Math.PI) * 1.2 - dCG * 0.03 - dTP * 0.02;
  return { angle, power, ghost: { x: gx, y: gy }, cutDeg: cut * 180 / Math.PI, score, targetId, pocketIdx };
}
/* Dự đoán đường bi cái khi ngắm theo 1 góc: bi đầu tiên chạm phải,
   vị trí bi ảo, hướng bi mục tiêu bay sau va chạm, và lỗ nào nằm trên
   hướng đó (nếu có). Dùng để vẽ đường ngắm trong giao diện. */
export function guideInfo(balls, angle) {
  const cue = balls.find(b => b.id === 0);
  if (!cue || cue.potted) return null;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let best = null, bestT = Infinity;
  for (const b of balls) {
    if (b.id === 0 || b.potted) continue;
    /* giao của tia (cue + t*dir) với hình tròn bán kính 2R quanh bi b */
    const rx = b.x - cue.x, ry = b.y - cue.y;
    const proj = rx * dx + ry * dy;
    if (proj < 0) continue;
    const perp2 = rx * rx + ry * ry - proj * proj;
    const rr = 2 * BALL_R;
    if (perp2 >= rr * rr) continue;
    const t = proj - Math.sqrt(rr * rr - perp2);
    if (t < bestT) { bestT = t; best = b; }
  }
  if (!best) {
    /* không chạm bi nào: tia tới băng */
    let t = Infinity;
    if (dx > 0) t = Math.min(t, (MAX_X - BALL_R - cue.x) / dx);
    if (dx < 0) t = Math.min(t, (MIN_X + BALL_R - cue.x) / dx);
    if (dy > 0) t = Math.min(t, (MAX_Y - BALL_R - cue.y) / dy);
    if (dy < 0) t = Math.min(t, (MIN_Y + BALL_R - cue.y) / dy);
    return { hitId: null, ghost: { x: cue.x + dx * t, y: cue.y + dy * t }, targetDir: null, pocketIdx: -1 };
  }
  const gx = cue.x + dx * bestT, gy = cue.y + dy * bestT;
  /* bi mục tiêu bay theo hướng từ vị trí bi ảo tới tâm bi mục tiêu */
  let tx = best.x - gx, ty = best.y - gy;
  const tl = Math.hypot(tx, ty) || 1;
  tx /= tl; ty /= tl;
  let pocketIdx = -1, bestAlign = 0.93; /* hướng tới lỗ phải gần thẳng */
  for (let i = 0; i < POCKETS.length; i++) {
    const [px, py] = POCKETS[i];
    const pdx = px - best.x, pdy = py - best.y;
    const pl = Math.hypot(pdx, pdy) || 1;
    const align = (tx * pdx + ty * pdy) / pl;
    if (align > bestAlign) { bestAlign = align; pocketIdx = i; }
  }
  return { hitId: best.id, ghost: { x: gx, y: gy }, targetDir: { x: tx, y: ty }, pocketIdx };
}

/* ---------- tạo ván ---------- */
export function createGame(players, opts = {}) {
  const mode = opts.bdMode === 'solo' ? 'solo' : 'match';
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  /* 🔄 Người phá xoay qua các ván: host truyền opts.firstIdx (bộ đếm ván
     ở main.js, lưu localStorage nên sống qua cả tải lại trang); không có
     thì ghế 0 như cũ; chơi đơn luôn người chơi phá. */
  const firstIdx = mode === 'solo' ? 0
    : Number.isInteger(opts.firstIdx) ? ((opts.firstIdx % players.length) + players.length) % players.length
    : 0;
  const s = {
    gid: 'g' + (++gidSeq) + '-' + Math.random().toString(36).slice(2, 7),
    seq: 0, seed, rng: seed, firstIdx,
    phase: 'playing', mode, solo: mode === 'solo', race: mode === 'match',
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null })),
    prog: {
      balls: rackBalls(),
      turn: players[firstIdx].id,
      groups: {}, openTable: true, ballInHand: null, breakDone: false,
      shots: {}, pots: {}, fouls: {}, lastShot: null,
    },
    winner: null, winnerIds: [], losers: [], endReason: null, final: null,
    startedAt: Date.now(), endedAt: null, log: [],
  };
  for (const p of players) {
    s.prog.shots[p.id] = 0;
    s.prog.pots[p.id] = 0;
    s.prog.fouls[p.id] = 0;
    s.prog.groups[p.id] = null;
  }
  pushLog(s, `🎱 ${s.players[firstIdx].name} phá trước!`);
  return s;
}

export function actors(s) {
  if (!s || s.phase !== 'playing') return [];
  return [s.prog.turn];
}
function groupCleared(prog, pid) {
  const g = prog.groups[pid];
  if (!g) return false;
  return prog.balls.every(b => b.id === 0 || groupOf(b.id) !== g || b.potted);
}
function ballsLeft(prog, pid) {
  const g = prog.groups[pid];
  if (!g) return prog.balls.slice(1).filter(b => !b.potted).length;
  const eight = prog.balls.find(b => b.id === 8);
  return prog.balls.slice(1).filter(b => !b.potted && groupOf(b.id) === g).length + (eight && !eight.potted ? 1 : 0);
}
/* chỗ đặt bi cái có hợp lệ không (trả về null nếu được, chuỗi lỗi nếu không) */
export function placeError(balls, x, y) {
  if (x < MIN_X + BALL_R || x > MAX_X - BALL_R || y < MIN_Y + BALL_R || y > MAX_Y - BALL_R) return 'Chỗ đặt ngoài bàn.';
  for (const [px, py] of POCKETS) {
    if (Math.hypot(x - px, y - py) < POCKET_R + 2) return 'Không đặt bi trong lỗ.';
  }
  for (const b of balls) {
    if (b.potted || b.id === 0) continue;
    if (Math.hypot(x - b.x, y - b.y) < 2 * BALL_R + 1) return 'Chỗ đó đã có bi.';
  }
  return null;
}
export function isFreeSpot(balls, x, y) {
  return placeError(balls, x, y) === null;
}
/* đặt lại bi 8 ở điểm chân (khi vào lỗ ở cú phá); điểm chân bận thì tìm
   chỗ trống gần nhất dọc theo đường giữa bàn */
function respotEight(prog) {
  const eight = prog.balls.find(b => b.id === 8);
  if (!eight) return;
  eight.potted = false; eight.vx = 0; eight.vy = 0;
  const spots = [];
  for (let k = 0; k <= 8; k++) {
    spots.push([FOOT_SPOT.x + k * 23, FOOT_SPOT.y]);
    if (k > 0) spots.push([FOOT_SPOT.x - k * 23, FOOT_SPOT.y]);
    spots.push([FOOT_SPOT.x, FOOT_SPOT.y + k * 23]);
    spots.push([FOOT_SPOT.x, FOOT_SPOT.y - k * 23]);
  }
  for (const [x, y] of spots) {
    if (isFreeSpot(prog.balls, x, y)) { eight.x = x; eight.y = y; return; }
  }
  /* hết cách: quét lưới toàn bàn */
  for (let y = MIN_Y + BALL_R; y <= MAX_Y - BALL_R; y += 23) {
    for (let x = MIN_X + BALL_R; x <= MAX_X - BALL_R; x += 23) {
      if (isFreeSpot(prog.balls, x, y)) { eight.x = x; eight.y = y; return; }
    }
  }
  eight.x = FOOT_SPOT.x; eight.y = FOOT_SPOT.y;
}

function endGame(s, winner, losers, reason) {
  s.phase = 'ended';
  s.winner = winner;
  s.winnerIds = winner ? [winner] : [];
  s.losers = losers || [];
  s.endReason = reason;
  s.endedAt = Date.now();
  s.final = { summary: {} };
  for (const p of s.players) {
    s.final.summary[p.id] = {
      pots: s.prog.pots[p.id] || 0,
      fouls: s.prog.fouls[p.id] || 0,
      ballsLeft: ballsLeft(s.prog, p.id),
      timeMs: s.endedAt - s.startedAt,
      shots: s.prog.shots[p.id] || 0,
    };
  }
}
function checkShotCap(s) {
  const total = s.players.reduce((n, p) => n + (s.prog.shots[p.id] || 0), 0);
  if (total >= MAX_SHOTS && s.phase === 'playing') {
    endGame(s, null, s.players.map(p => p.id), 'draw');
    pushLog(s, `⏱️ Quá ${MAX_SHOTS} cú bắn — hoà.`, 'bad');
  }
}
function timeoutMatch(s) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (Date.now() - s.startedAt < RACE_TIME_MS) return { ok: false, reason: 'Chưa hết giờ.' };
  const [a, b] = s.players;
  const pa = s.prog.pots[a.id] || 0, pb = s.prog.pots[b.id] || 0;
  if (pa !== pb) {
    const w = pa > pb ? a : b, l = pa > pb ? b : a;
    endGame(s, w.id, [l.id], 'timeout');
  } else if ((s.prog.fouls[a.id] || 0) !== (s.prog.fouls[b.id] || 0)) {
    const w = (s.prog.fouls[a.id] || 0) < (s.prog.fouls[b.id] || 0) ? a : b;
    const l = w === a ? b : a;
    endGame(s, w.id, [l.id], 'timeout');
  } else {
    endGame(s, null, s.players.map(p => p.id), 'draw');
  }
  s.seq++;
  return { ok: true };
}

/* Xử lý kết quả 1 cú bắn: phạm lỗi, chia nhóm, đổi lượt, thắng/thua. */
function resolveShot(s, pid, res) {
  const prog = s.prog;
  const solo = s.solo;
  const other = solo ? null : s.players.find(p => p.id !== pid);
  const potted = res.potted;
  const cueOut = potted.includes(0);
  const eightOut = potted.includes(8);
  const objPotted = potted.filter(id => id !== 0 && id !== 8);
  const wasBreak = !prog.breakDone;
  prog.breakDone = true;
  let foul = false, foulReason = '';
  if (cueOut) { foul = true; foulReason = 'Bi cái rơi lỗ.'; }
  else if (res.firstContact === null) { foul = true; foulReason = 'Bi cái không chạm bi nào.'; }
  else if (!wasBreak && prog.openTable) {
    /* chơi đơn: bi 8 là bi cuối cùng thì được chạm trước */
    const onlyEightLeft = solo && prog.balls.slice(1).every(b => b.id === 8 || b.potted);
    if (res.firstContact === 8 && !onlyEightLeft) { foul = true; foulReason = 'Chạm bi số 8 trước khi chia nhóm.'; }
  } else if (!wasBreak && !prog.openTable) {
    const g = prog.groups[pid];
    const fg = groupOf(res.firstContact);
    if (fg === 'eight') {
      if (!groupCleared(prog, pid)) { foul = true; foulReason = 'Chạm bi số 8 trước khi hết nhóm.'; }
    } else if (fg !== g) { foul = true; foulReason = 'Chạm nhầm bi của đối thủ trước.'; }
  }
  if (!foul && res.firstContact !== null && !res.railAfterContact && objPotted.length === 0 && !eightOut) {
    foul = true; foulReason = 'Sau khi chạm bi, không bi nào chạm băng hay rơi lỗ.';
  }
  /* bi 8 vào lỗ ở cú phá → đặt lại ở điểm chân, không tính thắng/thua */
  if (eightOut && wasBreak) {
    respotEight(prog);
    pushLog(s, '🎱 Bi 8 vào lỗ khi phá — đặt lại ở điểm chân.', '');
  }
  /* chia nhóm: chỉ ở đấu 2 người — chơi đơn không chia nhóm, cả 15 bi
     đều là của người chơi; bi đầu tiên vào lỗ (không tính cú phá) quyết định nhóm */
  if (prog.openTable && !wasBreak && objPotted.length > 0 && !solo) {
    const g = groupOf(objPotted[0]);
    prog.groups[pid] = g;
    if (other) prog.groups[other.id] = g === 'solid' ? 'stripe' : 'solid';
    prog.openTable = false;
    pushLog(s, `🎯 ${pOf(s, pid).name} nhận nhóm ${g === 'solid' ? 'bi trơn (1–7)' : 'bi sọc (9–15)'}`, '');
  }
  prog.pots[pid] += objPotted.length + (eightOut && !wasBreak ? 1 : 0);
  if (foul) prog.fouls[pid]++;
  if (prog.lastShot) prog.lastShot.foul = foul;
  if (foul) pushLog(s, `⚠️ ${pOf(s, pid).name} phạm lỗi: ${foulReason}`, 'bad');
  else if (objPotted.length > 0) pushLog(s, `🎱 ${pOf(s, pid).name} vào ${objPotted.length} bi.`, '');
  /* bi 8 (không phải cú phá): thắng nếu hết nhóm + không lỗi, còn lại thua.
     chơi đơn "hết nhóm" = đã vào hết 15 bi (không chia nhóm ở solo). */
  if (eightOut && !wasBreak) {
    const cleared = solo
      ? prog.balls.slice(1).every(b => b.id === 8 || b.potted)
      : groupCleared(prog, pid);
    if (!foul && cleared) {
      endGame(s, pid, other ? [other.id] : [], 'win');
      return;
    }
    if (solo) endGame(s, null, [pid], 'foul8');
    else endGame(s, other.id, [pid], 'foul8');
    return;
  }
  /* chơi đơn: phạm lỗi thì tự đặt bi cái; thắng chỉ qua bi 8 (đã xử lý ở trên) */
  if (solo) {
    if (foul) prog.ballInHand = pid;
    checkShotCap(s);
    return;
  }
  /* đấu: phạm lỗi → đối thủ được đặt bi + đổi lượt */
  if (foul) {
    prog.ballInHand = other.id;
    prog.turn = other.id;
    checkShotCap(s);
    return;
  }
  /* vào đúng nhóm thì bắn tiếp, còn lại đổi lượt */
  const g = prog.groups[pid];
  const ownPotted = objPotted.filter(id => !g || groupOf(id) === g).length;
  if (ownPotted === 0) prog.turn = other.id;
  checkShotCap(s);
}

export function applyAction(s, pid, a, ctx) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  if (a.type === 'timeout') {
    if (s.mode !== 'match') return { ok: false, reason: 'Chơi đơn không có giới hạn giờ.' };
    return timeoutMatch(s);
  }
  const prog = s.prog;
  if (a.type === 'resign') {
    if (s.solo) endGame(s, null, [pid], 'resign');
    else {
      const other = s.players.find(p => p.id !== pid);
      endGame(s, other ? other.id : null, [pid], 'resign');
    }
    s.seq++;
    return { ok: true };
  }
  if (pid !== prog.turn) return { ok: false, reason: 'Chưa tới lượt của bạn.' };
  if (a.type === 'place') {
    if (prog.ballInHand !== pid) return { ok: false, reason: 'Không được đặt bi lúc này.' };
    const err = placeError(prog.balls, a.x, a.y);
    if (err) return { ok: false, reason: err };
    const cue = prog.balls[0];
    cue.x = a.x; cue.y = a.y; cue.vx = 0; cue.vy = 0; cue.potted = false;
    prog.ballInHand = null;
    prog.lastShot = null;
    s.seq++;
    return { ok: true };
  }
  if (a.type === 'shoot') {
    if (prog.ballInHand) return { ok: false, reason: 'Hãy đặt bi cái trước khi bắn.' };
    if (!Number.isFinite(a.angle) || !Number.isFinite(a.power)) return { ok: false, reason: 'Cú bắn không hợp lệ.' };
    const p = clamp(a.power, 0.05, 1);
    const res = simulateShot(prog.balls, a.angle, p);
    prog.balls = res.balls;
    prog.shots[pid]++;
    prog.lastShot = { angle: a.angle, power: p, potted: res.potted.slice(), firstContact: res.firstContact, foul: false };
    resolveShot(s, pid, res);
    s.seq++;
    return { ok: true };
  }
  return { ok: false, reason: 'Hành động không hợp lệ.' };
}

export function viewFor(s, pid) {
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, firstIdx: s.firstIdx,
    startedAt: s.startedAt, endedAt: s.endedAt,
    winner: s.winner, winnerIds: (s.winnerIds || []).slice(), losers: (s.losers || []).slice(),
    endReason: s.endReason, final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    mode: s.mode, solo: s.solo, race: s.race,
    balls: s.prog.balls.map(b => ({ id: b.id, x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, potted: b.potted })),
    turn: s.prog.turn,
    groups: { ...s.prog.groups },
    openTable: s.prog.openTable,
    ballInHand: s.prog.ballInHand,
    breakDone: s.prog.breakDone,
    shots: { ...s.prog.shots }, pots: { ...s.prog.pots }, fouls: { ...s.prog.fouls },
    lastShot: s.prog.lastShot ? { ...s.prog.lastShot } : null,
    players: s.players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, botLevel: p.level || null })),
    log: s.log.slice(-20),
    me: pid,
  };
}

export function serialize(s) {
  return JSON.parse(JSON.stringify(s));
}
export function deserialize(d) {
  return JSON.parse(JSON.stringify(d));
}
export default { createGame, applyAction, actors, viewFor, serialize, deserialize };
