// 🧱 Tetris — luật chơi (engine thuần, không phụ thuộc DOM).
//
// LUẬT (chuẩn guideline, đã ghi rõ mọi chỗ đơn giản hoá):
// - Giếng 10 cột × 20 hàng. KHÔNG có hàng ẩn: khối xuất hiện ở hàng 0;
//   nếu vị trí xuất hiện đã bị chặn thì người đó thua ngay (top-out).
// - 7-bag: mỗi túi chứa đủ 7 khối (I O T S Z J L) xáo ngẫu nhiên bằng LCG,
//   không trùng trong túi; túi mới xáo khi túi cũ hết.
// - Xoay: thử lần lượt các kick [(0,0), (-1,0), (1,0), (0,-1), (-2,0),
//   (2,0)] — kick đầu tiên vừa thì xoay; không kick nào vừa thì giữ nguyên.
//   KHÔNG dùng bảng kick SRS đầy đủ (đơn giản hoá, đã ghi rõ).
// - Rơi: tốc độ theo level, level = floor(hàng/10) + 1; speedFor(level) =
//   max(50, round(800 × 0.9^(level-1))) ms/hàng (lv1 800ms, lv5 ~525ms,
//   lv10 ~310ms, lv15 ~183ms, lv20 ~108ms). KHÔNG có lock delay: khối chạm
//   đáy thì khoá ngay ở tick rơi tiếp theo (đơn giản hoá so với guideline).
// - Điểm (chuẩn guideline): 1 hàng 100, 2 hàng 300, 3 hàng 500, Tetris
//   (4 hàng) 800 — tất cả × level lúc xoá; soft drop +1/ô, hard drop +2/ô;
//   combo: mỗi lần xoá liên tiếp (không có lượt khoá trắng xen giữa) tăng
//   combo, thưởng +50 × (combo-1) × level từ lần xoá liên tiếp thứ 2.
//   Level tăng mỗi 10 hàng.
// - Giữ khối (hold): 1 lần mỗi khối — sau khi khoá khối mới thì được giữ lại.
// - Chơi đơn (marathon): thắng ngay khi xoá đủ 100 hàng (lên level 10);
//   thua khi top-out trước đó.
// - Đua 40 hàng (đấu máy / online 2–4 người / chung máy 2 người): mỗi người
//   1 giếng riêng, ai xoá đủ 40 hàng trước thì thắng; KHÔNG gửi hàng rác
//   sang đối thủ (đua song song thuần — cùng pattern Sudoku/Wordle/Dò Mìn/
//   2048 của site). Nếu tất cả cùng top-out/xin thua trước 40 hàng thì
//   so điểm cao nhất, bằng điểm thì hoà. Người xin thua thì thua, các
//   người còn lại chơi tiếp (không tự động thắng hộ).
// - viewFor: mỗi người chỉ thấy giếng + hold/next/điểm của MÌNH; đối thủ
//   chỉ thấy tóm tắt (điểm, hàng, level, trạng thái) — KHÔNG thấy giếng
//   của đối thủ (đỡ tốn băng thông đồng bộ). Hết ván thì thấy bảng xếp hạng.
import { TYPES, COLORS, cellsOf } from './pieces.js?v=1';

export const W = 10;
export const H = 20;
export const RACE_LINES = 40; /* đua: ai xoá đủ 40 hàng trước thì thắng */
export const SOLO_LINES = 100; /* chơi đơn: thắng khi xoá đủ 100 hàng */
export const SCORES = { 1: 100, 2: 300, 3: 500, 4: 800 };
export const COMBO_BONUS = 50;
export const KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]];
export const SPAWN_X = 3;

export function speedFor(level) { return Math.max(50, Math.round(800 * Math.pow(0.9, Math.max(1, level) - 1))); }
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
const emptyGrid = () => Array.from({ length: H }, () => Array(W).fill(0));
const pOf = (s, id) => s.players.find(p => p.id === id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

export function canPlace(prog, type, rot, x, y) {
  for (const [cx, cy] of cellsOf(type, rot)) {
    const gx = x + cx, gy = y + cy;
    if (gx < 0 || gx >= W || gy < 0 || gy >= H) return false;
    if (prog.grid[gy][gx]) return false;
  }
  return true;
}
export function ghostY(prog) {
  if (!prog.cur) return 0;
  let y = prog.cur.y;
  while (canPlace(prog, prog.cur.type, prog.cur.rot, prog.cur.x, y + 1)) y++;
  return y;
}
function drawBag(s) {
  const bag = TYPES.slice();
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand(s) * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}
function refillNext(s, prog) {
  while (prog.next.length < 7) {
    if (!prog.bag.length) prog.bag = drawBag(s);
    prog.next.push(prog.bag.shift());
  }
}
function spawnPiece(s, pid) {
  const prog = s.prog[pid];
  refillNext(s, prog);
  const type = prog.next.shift();
  refillNext(s, prog);
  prog.cur = { type, rot: 0, x: SPAWN_X, y: 0 };
  /* canHold KHÔNG reset ở đây: giữ khối xong sinh khối mới vẫn chưa được
     giữ lại — chỉ khi khoá khối thì mới được giữ (xem lockPiece) */
  if (!canPlace(prog, type, 0, SPAWN_X, 0)) {
    prog.cur = null;
    topOut(s, pid);
    return false;
  }
  return true;
}
function clearLines(prog) {
  let n = 0;
  const kept = [];
  for (const row of prog.grid) {
    if (row.every(c => c)) n++;
    else kept.push(row);
  }
  while (kept.length < H) kept.unshift(Array(W).fill(0));
  prog.grid = kept;
  return n;
}
function lockPiece(s, pid) {
  const prog = s.prog[pid];
  if (!prog.cur) return;
  const { type, rot, x, y } = prog.cur;
  for (const [cx, cy] of cellsOf(type, rot)) {
    const gx = x + cx, gy = y + cy;
    if (gy >= 0 && gy < H && gx >= 0 && gx < W) prog.grid[gy][gx] = COLORS[type];
  }
  prog.cur = null;
  prog.piecesPlaced++;
  prog.canHold = true; /* khoá xong thì được giữ khối trở lại */
  const n = clearLines(prog);
  if (n > 0) {
    prog.combo++;
    prog.score += SCORES[n] * prog.level + COMBO_BONUS * (prog.combo - 1) * prog.level;
    prog.lines += n;
    if (n === 4) prog.tetrisCount++;
    if (prog.combo > prog.maxCombo) prog.maxCombo = prog.combo;
    prog.level = Math.floor(prog.lines / 10) + 1;
    pushLog(s, `🧱 ${pOf(s, pid).name} xoá ${n} hàng (+${SCORES[n] * prog.level}đ)`, n === 4 ? 'good' : '');
  } else {
    prog.combo = 0;
  }
  if (s.phase !== 'playing') return;
  if (s.mode === 'solo' && prog.lines >= SOLO_LINES) {
    endGame(s, pid, s.players.filter(p => p.id !== pid).map(p => p.id), 'lines');
    return;
  }
  if (s.mode === 'race' && prog.lines >= RACE_LINES) {
    checkRaceWin(s);
    return;
  }
  spawnPiece(s, pid);
}
function topOut(s, pid) {
  const prog = s.prog[pid];
  prog.status = 'lost';
  prog.doneAt = Date.now();
  pushLog(s, `💥 ${pOf(s, pid).name} chạm nóc!`, 'bad');
  if (s.mode === 'solo') {
    endGame(s, null, [pid], 'topout');
    return;
  }
  checkRaceEnd(s);
}
/* đua: ai đủ 40 hàng trước thì thắng; nhiều người cùng đủ thì so điểm, hoà điểm thì hoà */
function checkRaceWin(s) {
  const done = s.players.filter(p => (s.prog[p.id].lines || 0) >= RACE_LINES);
  if (!done.length) return;
  if (done.length === 1) {
    const w = done[0];
    endGame(s, w.id, s.players.filter(p => p.id !== w.id).map(p => p.id), 'lines');
    return;
  }
  const best = Math.max(...done.map(p => s.prog[p.id].score || 0));
  const top = done.filter(p => (s.prog[p.id].score || 0) === best);
  if (top.length === 1) endGame(s, top[0].id, s.players.filter(p => p.id !== top[0].id).map(p => p.id), 'lines');
  else endGame(s, null, s.players.map(p => p.id), 'draw');
}
/* đua: tất cả đều xong (top-out/xin thua) mà chưa ai đủ 40 hàng → so điểm, hoà điểm thì hoà */
function checkRaceEnd(s) {
  if (s.phase !== 'playing' || s.mode !== 'race') return;
  if (s.players.some(p => s.prog[p.id].status === 'playing')) return;
  const best = Math.max(...s.players.map(p => s.prog[p.id].score || 0));
  const top = s.players.filter(p => (s.prog[p.id].score || 0) === best);
  if (top.length === 1) endGame(s, top[0].id, s.players.filter(p => p.id !== top[0].id).map(p => p.id), 'score');
  else endGame(s, null, s.players.map(p => p.id), 'draw');
}
function finishSummary(s) {
  const out = {};
  for (const p of s.players) {
    const pr = s.prog[p.id];
    out[p.id] = {
      score: pr.score, lines: pr.lines, level: pr.level,
      tetrisCount: pr.tetrisCount, maxCombo: pr.maxCombo,
      piecesPlaced: pr.piecesPlaced,
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
  s.endReason = reason; /* 'lines' | 'score' | 'topout' | 'resign' | 'draw' */
  for (const p of s.players) if (!s.prog[p.id].doneAt) s.prog[p.id].doneAt = s.endedAt;
  s.final = { summary: finishSummary(s) };
  if (reason === 'draw') pushLog(s, '🤝 Hoà! Không ai hơn ai.', '');
  else if (winner) pushLog(s, `🏆 ${pOf(s, winner).name} thắng ván!`, 'good');
  else pushLog(s, '😢 Hết ván!', '');
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 1 || players.length > 4) throw new Error('Tetris chơi 1–4 người (chơi đơn = 1, đua = 2–4).');
  const mode = opts.ttMode === 'solo' ? 'solo' : 'race';
  if (mode === 'solo' && players.length !== 1) throw new Error('Chơi đơn Tetris cần đúng 1 người.');
  if (mode === 'race' && players.length < 2) throw new Error('Đua Tetris cần 2–4 người.');
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  let all = players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null }));
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    seed, rng: seed,
    phase: 'playing', /* 'playing' | 'ended' */
    mode, solo: mode === 'solo', race: mode === 'race',
    players: all,
    prog: {},
    winner: null, winnerIds: [], losers: [],
    endReason: null, /* 'lines' | 'score' | 'topout' | 'resign' | 'draw' */
    startedAt: Date.now(), endedAt: null,
    log: [],
  };
  for (const p of s.players) {
    s.prog[p.id] = {
      grid: emptyGrid(), cur: null, next: [], bag: [],
      hold: null, canHold: true,
      score: 0, lines: 0, level: 1, combo: 0,
      tetrisCount: 0, maxCombo: 0, piecesPlaced: 0,
      status: 'playing', doneAt: null,
    };
  }
  for (const p of s.players) spawnPiece(s, p.id);
  pushLog(s, mode === 'solo'
    ? '🧱 Tetris — chơi đơn: xếp đủ 100 hàng thì thắng! C = giữ khối, Space = thả nhanh.'
    : '🧱 Tetris — đua 40 hàng: ai xoá đủ 40 hàng trước thì thắng! Không có hàng rác.');
  return s;
}

export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || typeof s !== 'object' || !Array.isArray(s.players) || !s.prog) throw new Error('Trạng thái Tetris không hợp lệ.');
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
      const dx = a.dx > 0 ? 1 : -1;
      if (prog.cur && canPlace(prog, prog.cur.type, prog.cur.rot, prog.cur.x + dx, prog.cur.y)) prog.cur.x += dx;
      break;
    }
    case 'rotate': {
      if (!prog.cur) break;
      const dir = a.dir < 0 ? -1 : 1;
      const nr = ((prog.cur.rot + dir) % 4 + 4) % 4;
      for (const [kx, ky] of KICKS) {
        if (canPlace(prog, prog.cur.type, nr, prog.cur.x + kx, prog.cur.y + ky)) {
          prog.cur.rot = nr; prog.cur.x += kx; prog.cur.y += ky;
          break;
        }
      }
      break;
    }
    case 'soft': {
      if (!prog.cur) break;
      if (canPlace(prog, prog.cur.type, prog.cur.rot, prog.cur.x, prog.cur.y + 1)) {
        prog.cur.y++; prog.score++;
      } else lockPiece(s, pid);
      break;
    }
    case 'hard': {
      if (!prog.cur) break;
      const gy = ghostY(prog);
      prog.score += 2 * Math.max(0, gy - prog.cur.y);
      prog.cur.y = gy;
      lockPiece(s, pid);
      break;
    }
    case 'hold': {
      if (!prog.cur) break;
      if (!prog.canHold) return { ok: false, reason: 'Mỗi khối chỉ giữ được 1 lần.' };
      const held = prog.hold;
      prog.hold = prog.cur.type;
      prog.canHold = false;
      if (held) {
        prog.cur = { type: held, rot: 0, x: SPAWN_X, y: 0 };
        if (!canPlace(prog, held, 0, SPAWN_X, 0)) { prog.cur = null; topOut(s, pid); }
      } else {
        spawnPiece(s, pid);
      }
      break;
    }
    case 'tick': {
      if (!prog.cur) break;
      if (canPlace(prog, prog.cur.type, prog.cur.rot, prog.cur.x, prog.cur.y + 1)) prog.cur.y++;
      else lockPiece(s, pid);
      break;
    }
    case 'resign': {
      prog.status = 'resigned';
      prog.doneAt = Date.now();
      if (prog.cur) prog.cur = null;
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
  const my = me.cur ? {
    grid: me.grid,
    cur: { ...me.cur },
    ghostY: ghostY(me),
    next: (me.next || []).slice(0, 3),
    hold: me.hold, canHold: !!me.canHold,
    combo: me.combo, tetrisCount: me.tetrisCount, piecesPlaced: me.piecesPlaced,
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
        score: q.score || 0, lines: q.lines || 0, lvl: q.level || 1,
        status: q.status || 'playing',
      };
    }),
    log: s.log.slice(-20),
    me: pid,
  };
}
