// 🧩 Ghép Hình — luật chơi (engine thuần, không phụ thuộc DOM).
//
// LUẬT:
// - Bức tranh được cắt thành lưới N×N (Dễ 3×3, Vừa 4×4, Khó 5×5).
//   Các mảnh bị xáo trộn theo seed của ván; mỗi mảnh có 1 vị trí đúng
//   duy nhất (mảnh số k thuộc về ô k). Bấm 1 mảnh để chọn, bấm mảnh
//   khác để đổi chỗ 2 mảnh (hoặc kéo-thả — UI xử lý, engine chỉ nhận
//   'swap'). Không xoay mảnh.
// - 'swap' {a, b}: đổi chỗ 2 mảnh ở vị trí a, b. Mỗi mảnh về đúng vị
//   trí sau nước đổi được +10 điểm (1 nước đổi đúng cả 2 mảnh thì
//   +20). Đổi mà không mảnh nào đúng thì 0 điểm, không trừ điểm,
//   không mất mạng — game thư giãn, không có thua do sai.
// - 'peek' (xem hình mẫu): tối đa 3 lần/màn; UI hiện ảnh gốc 5 giây.
// - Chơi đơn: thắng khi ghép đủ cả bức tranh (correct === N×N).
//   Không có thua do hết giờ — chỉ có thắng (mục tiêu là hoàn thành).
// - Đua (đấu máy / online 2–4 người / chung máy 2 người): cùng 1 bức
//   tranh + cùng 1 lần xáo trộn (cùng seed) nên công bằng. Ai ghép
//   xong trước thì thắng; hết 180 giây chưa ai xong thì ai đặt đúng
//   nhiều mảnh hơn thắng, bằng nhau thì hoà; xin thua thì bị loại,
//   người còn lại chơi tiếp; tất cả đều xong mà chưa ai ghép đủ thì
//   so số mảnh đúng, bằng nhau thì hoà.
// - viewFor: mỗi người chỉ thấy bảng của MÌNH; đối thủ chỉ thấy tóm
//   tắt (số mảnh đúng, điểm, trạng thái) — KHÔNG thấy bảng của nhau.
//   Đáp án là ánh xạ đồng nhất (mảnh k thuộc ô k) nên không có gì
//   để lộ thêm; hình mẫu (picId) là chung cho cả ván.
export const SIZES = { easy: 3, medium: 4, hard: 5 };
export const RACE_TIME_MS = 180000; /* đua tối đa 180 giây */
export const PEEKS = 3; /* tối đa 3 lần xem mẫu mỗi màn */
export const PIC_COUNT = 6;

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

/* Xáo trộn Fisher-Yates có seed; đảm bảo ván không bắt đầu ở trạng
   thái đã ghép xong (xác suất nhỏ nhưng vẫn kiểm tra). */
function shuffleTiles(rng, n) {
  const total = n * n;
  const tiles = Array.from({ length: total }, (_, i) => i);
  for (let i = total - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = tiles[i]; tiles[i] = tiles[j]; tiles[j] = t;
  }
  let correct = 0;
  for (let i = 0; i < total; i++) if (tiles[i] === i) correct++;
  if (correct === total) {
    const t = tiles[0]; tiles[0] = tiles[1]; tiles[1] = t;
    correct = total - 2;
  }
  return { tiles, correct };
}

export function correctOf(tiles) {
  let c = 0;
  for (let i = 0; i < tiles.length; i++) if (tiles[i] === i) c++;
  return c;
}

function finishSummary(s) {
  const out = {};
  for (const p of s.players) {
    const pr = s.prog[p.id];
    out[p.id] = {
      correct: pr.correct, swaps: pr.swaps, peeks: pr.peeksUsed,
      score: pr.score,
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
  s.endReason = reason; /* 'complete' | 'percent' | 'resign' | 'draw' */
  for (const p of s.players) if (!s.prog[p.id].doneAt) s.prog[p.id].doneAt = s.endedAt;
  s.final = { summary: finishSummary(s) };
  if (reason === 'draw') pushLog(s, '🤝 Hoà! Không ai hơn ai.', '');
  else if (winner) pushLog(s, `🏆 ${pOf(s, winner).name} thắng ván!`, 'good');
  else pushLog(s, '😢 Hết ván!', '');
}
/* đua: tất cả đều xong mà chưa ai ghép đủ → so số mảnh đúng */
function checkRaceEnd(s) {
  if (s.phase !== 'playing' || s.mode !== 'race') return;
  if (s.players.some(p => s.prog[p.id].status === 'playing')) return;
  const best = Math.max(...s.players.map(p => s.prog[p.id].correct));
  const pool = s.players.filter(p => s.prog[p.id].correct === best);
  if (pool.length === 1) endGame(s, pool[0].id, s.players.filter(p => p.id !== pool[0].id).map(p => p.id), 'percent');
  else endGame(s, null, s.players.map(p => p.id), 'draw');
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 1 || players.length > 4) throw new Error('Ghép Hình chơi 1–4 người (chơi đơn = 1, đua = 2–4).');
  const mode = opts.ghMode === 'solo' ? 'solo' : 'race';
  if (mode === 'solo' && players.length !== 1) throw new Error('Chơi đơn Ghép Hình cần đúng 1 người.');
  if (mode === 'race' && players.length < 2) throw new Error('Đua Ghép Hình cần 2–4 người.');
  const size = [3, 4, 5].includes(opts.size) ? opts.size : 4;
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    seed, rng: seed,
    phase: 'playing', /* 'playing' | 'ended' */
    mode, solo: mode === 'solo', race: mode === 'race',
    size, total: size * size,
    picId: 0,
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null })),
    prog: {},
    winner: null, winnerIds: [], losers: [],
    endReason: null, /* 'complete' | 'percent' | 'resign' | 'draw' */
    startedAt: Date.now(), endedAt: null,
    log: [],
  };
  /* hình mẫu: chọn ngẫu nhiên 1 trong 6 hình bằng RNG có seed */
  s.picId = Math.floor(nextRand(s) * PIC_COUNT);
  const { tiles, correct } = shuffleTiles(() => nextRand(s), size);
  for (const p of s.players) {
    s.prog[p.id] = {
      tiles: tiles.slice(), correct,
      score: 0, swaps: 0, peeksUsed: 0,
      status: 'playing', doneAt: null,
    };
  }
  pushLog(s, mode === 'solo'
    ? `🧩 Ghép Hình — chơi đơn ${size}×${size}: ghép đủ ${s.total} mảnh thành tranh thì thắng!`
    : `🧩 Ghép Hình — đua ${size}×${size}: ai ghép đủ ${s.total} mảnh trước thì thắng! Hết 180 giây thì so số mảnh đúng.`);
  return s;
}

export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || typeof s !== 'object' || !Array.isArray(s.players) || !s.prog || !Array.isArray(s.prog[s.players[0] && s.players[0].id] && s.prog[s.players[0].id].tiles)) throw new Error('Trạng thái Ghép Hình không hợp lệ.');
  return s;
}

export function actors(s) {
  if (s.phase !== 'playing') return [];
  return s.players.filter(p => s.prog[p.id] && s.prog[p.id].status === 'playing').map(p => p.id);
}

function validPos(s, i) {
  return Number.isInteger(i) && i >= 0 && i < s.total;
}

export function applyAction(s, pid, a, ctx) {
  /* 'timeout' là lệnh của chủ phòng khi hết 180 giây đua — không phụ
     thuộc người chơi gửi, xử lý trước mọi kiểm tra trạng thái. */
  if (a && a.type === 'timeout') {
    if (!s || s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
    if (s.mode !== 'race') return { ok: false, reason: 'Chỉ đua mới có giới hạn giờ.' };
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
    case 'swap': {
      if (!validPos(s, a.a) || !validPos(s, a.b)) return { ok: false, reason: 'Vị trí không hợp lệ.' };
      if (a.a === a.b) return { ok: false, reason: 'Đổi 2 mảnh khác nhau.' };
      const before = (prog.tiles[a.a] === a.a ? 1 : 0) + (prog.tiles[a.b] === a.b ? 1 : 0);
      const t = prog.tiles[a.a]; prog.tiles[a.a] = prog.tiles[a.b]; prog.tiles[a.b] = t;
      const after = (prog.tiles[a.a] === a.a ? 1 : 0) + (prog.tiles[a.b] === a.b ? 1 : 0);
      prog.correct += after - before;
      prog.score += Math.max(0, after - before) * 10;
      prog.swaps++;
      if (prog.correct >= s.total) {
        s.seq++;
        endGame(s, pid, s.players.filter(p => p.id !== pid).map(p => p.id), 'complete');
        return { ok: true };
      }
      break;
    }
    case 'peek': {
      if (prog.peeksUsed >= PEEKS) return { ok: false, reason: 'Đã hết lượt xem mẫu (tối đa 3).' };
      prog.peeksUsed++;
      pushLog(s, `👀 ${pOf(s, pid).name} xem hình mẫu (còn ${PEEKS - prog.peeksUsed} lượt).`, '');
      break;
    }
    case 'resign': {
      prog.status = 'resigned';
      prog.doneAt = Date.now();
      pushLog(s, `🏳️ ${pOf(s, pid).name} xin thua.`, 'bad');
      if (s.mode === 'solo') {
        endGame(s, null, [pid], 'resign');
      } else {
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
  const my = me.tiles ? {
    tiles: me.tiles.slice(),
    size: s.size, total: s.total, picId: s.picId,
    correct: me.correct, score: me.score, swaps: me.swaps,
    peeksLeft: Math.max(0, PEEKS - (me.peeksUsed || 0)),
    peeksUsed: me.peeksUsed,
    status: me.status,
  } : null;
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    startedAt: s.startedAt, endedAt: s.endedAt,
    winner: s.winner, winnerIds: (s.winnerIds || []).slice(), losers: (s.losers || []).slice(), endReason: s.endReason,
    final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    mode: s.mode, solo: s.solo, race: s.race,
    size: s.size, total: s.total, picId: s.picId,
    my,
    players: s.players.map(p => {
      const q = s.prog[p.id] || {};
      return {
        id: p.id, name: p.name, isBot: !!p.isBot, botLevel: p.level || null,
        score: q.score || 0, correct: q.correct || 0,
        status: q.status || 'playing',
      };
    }),
    log: s.log.slice(-20),
    me: pid,
  };
}
