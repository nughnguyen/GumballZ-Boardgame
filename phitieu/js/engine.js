// 🎯 Phi Tiêu — luật chơi (engine thuần, không phụ thuộc DOM).
//
// ACHIEVEMENTS (đăng ký ở stats.js — parent; điều kiện dựa trên view
// cuối ván v + summary sum):
// - ph-solo-win: thắng chơi đơn (w && v.solo — tổng điểm sau
//   SOLO_VISITS lượt ≥ SOLO_WIN_SCORE).
// - ph-180: ném được 1 lượt 180 điểm (3 phi tiêu đều vào treble 20)
//   (sum.maxVisit >= 180 — không cần thắng, vì 180 đã đủ hiếm).
// - ph-match-win: thắng 1 trận đấu (w && !v.solo).
// - ph-ton3: thắng 1 trận đấu với ≥ 3 lượt ≥ 100 điểm
//   (w && !v.solo && (sum.tons || 0) >= 3).
// (Tỉ lệ đo được xem test/sim.mjs — đã hiệu chuẩn: solo Hard thắng
// ~50% ở ngưỡng SOLO_WIN_SCORE; 180: ~21% solo Hard, ~24% đấu;
// ton3: 10–30% ván thắng đấu.
// LƯU Ý: brief gốc đề xuất ph-bull (trúng bull trong trong 1 ván thắng)
// nhưng đo được 0/100 solo và 0/50 ván thắng đấu — bot không bao giờ
// ngắm bull (trừ checkout đúng 50, rất hiếm) và bull trong chỉ r ≤ 8
// nên gần như không mở được bằng lối chơi bình thường → đổi thành
// ph-ton3 (lượt 100+ ổn định), vẫn giữ trường bulls trong summary.)
//
// LUẬT (phi tiêu chuẩn):
// - Bàn 20 ô theo thứ tự [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,
//   14,9,12,5], ô 20 ở trên cùng, đi theo chiều kim đồng hồ. Vòng:
//   bull trong 50, bull ngoài 25, treble ×3, double ×2, đơn ×1, ngoài
//   bàn 0 điểm.
// - Đấu (2 người): xuất phát 501 điểm, luân phiên mỗi lượt 3 phi tiêu,
//   ai về đúng 0 trước thì thắng. Cú cuối PHẢI là double (vòng double
//   hoặc bull trong tính là double). Vượt quá 0, hoặc còn đúng 1 điểm,
//   hoặc về 0 mà không phải double → BUST: lượt đó 0 điểm, điểm giữ
//   nguyên như đầu lượt, mất luôn các phi tiêu còn lại của lượt.
// - Chơi đơn: 10 lượt × 3 phi tiêu = 30 phi tiêu, tính tổng điểm;
//   ≥ SOLO_WIN_SCORE thì thắng.
// - Không có giới hạn giờ (ném theo lượt, không đồng hồ). Đấu quá
//   MAX_VISITS lượt/người vẫn chưa xong thì hoà (van an toàn, gần như
//   không bao giờ xảy ra).
// - Engine xác định: cùng 1 dãy action thì kết quả luôn giống nhau.
//   Sai số tay (độ lệch khỏi điểm ngắm) dùng xổ số xác định theo seed
//   của ván (rngNext, trạng thái lưu trong s.rngState) nên
//   serialize/deserialize giữ nguyên được — đồng bộ online + test.
//   (Không dùng Math.random trong engine — chỉ bot dùng, ngoài engine.)
export const SEGMENTS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
export const START_SCORE = 501; /* đấu: xuất phát 501 điểm */
export const SOLO_VISITS = 10; /* chơi đơn: 10 lượt */
export const SOLO_WIN_SCORE = 880; /* chơi đơn: ≥ 880 điểm / 30 phi tiêu thì thắng (đã hiệu chuẩn: Hard trung vị 881, Easy tối đa 799 — xem sim.mjs) */
export const MAX_VISITS = 40; /* đấu: quá 40 lượt/người vẫn chưa xong thì hoà */
export const BOARD_R = 190; /* bán kính bàn (tọa độ bàn 0..400, tâm 200,200) */
export const R_BULL_IN = 8; /* bull trong: r ≤ 8 → 50 */
export const R_BULL_OUT = 20; /* bull ngoài: r ≤ 20 → 25 */
export const R_TREBLE_LO = 99; /* treble: 99 ≤ r ≤ 115 */
export const R_TREBLE_HI = 115;
export const R_DOUBLE_LO = 162; /* double: 162 ≤ r ≤ 178 */
export const R_DOUBLE_HI = 178;
/* độ lệch tay (bán kính đĩa sai số, đơn vị tọa độ bàn) theo cấp độ
   người ném: Khó 24, người (mặc định) 24, Dễ 32. Đã hiệu chuẩn:
   Khó ném treble 20 trúng ~34%, trung bình ~29 điểm/phi tiêu. */
export const SIGMA = { hard: 24, easy: 32, human: 24 };

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* Xổ số xác định của ván: 1 bước mulberry32, trạng thái lưu trong s
   (số nguyên) nên serialize/deserialize giữ nguyên được. */
/* gid phải DUY NHẤT cho mỗi lần tạo ván (bài học từ Nhện: gid chỉ từ
   Math.random sẽ trùng khi test seed Math.random, làm bộ nhớ bot theo
   gid rò rỉ giữa các ván). */
let gidSeq = 0;
function rngNext(s) {
  let a = (s.rngState |= 0);
  a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  s.rngState = a;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pOf = (s, id) => s.players.find(p => p.id === id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

/* ---- hình học bàn ---- */
/* góc của ô thứ i (0 = ô 20 ở trên cùng), tính theo chiều kim đồng hồ,
   đơn vị độ, 0° = hướng lên trên */
export function segmentAngle(i) { return i * 18; }
/* điểm ngắm ở giữa vùng (ô, vòng): trả {x, y} trong tọa độ bàn 0..400 */
export function pointFor(segment, ring) {
  const i = SEGMENTS.indexOf(segment);
  if (ring === 'inner') return { x: 200, y: 200 };
  if (ring === 'outer') return { x: 200 + 14, y: 200 };
  const r = ring === 'treble' ? (R_TREBLE_LO + R_TREBLE_HI) / 2
    : ring === 'double' ? (R_DOUBLE_LO + R_DOUBLE_HI) / 2
    : 60; /* single trong: r = 60 */
  if (i < 0) return { x: 200, y: 200 - r };
  const a = (segmentAngle(i) * Math.PI) / 180;
  return { x: 200 + r * Math.sin(a), y: 200 - r * Math.cos(a) };
}
/* điểm (x, y) → {segment, ring, points}. segment = số ô (20/1/…) hoặc
   null với bull; ring = 'inner' | 'outer' | 'treble' | 'double' |
   'single' | 'miss'. */
export function scoreOf(x, y) {
  const dx = x - 200, dy = y - 200;
  const r = Math.hypot(dx, dy);
  if (r <= R_BULL_IN) return { segment: null, ring: 'inner', points: 50 };
  if (r <= R_BULL_OUT) return { segment: null, ring: 'outer', points: 25 };
  if (r > BOARD_R) return { segment: null, ring: 'miss', points: 0 };
  /* góc theo chiều kim đồng hồ từ hướng lên trên, 0..360 */
  let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  const idx = Math.floor((deg + 9) / 18) % 20;
  const segment = SEGMENTS[idx];
  let ring;
  if (r >= R_TREBLE_LO && r <= R_TREBLE_HI) ring = 'treble';
  else if (r >= R_DOUBLE_LO && r <= R_DOUBLE_HI) ring = 'double';
  else ring = 'single';
  const points = ring === 'treble' ? segment * 3 : ring === 'double' ? segment * 2 : segment;
  return { segment, ring, points };
}
/* cú cuối về 0 có phải double-out không (vòng double, hoặc bull trong) */
export function isDoubleOut(res) {
  return res && (res.ring === 'double' || res.ring === 'inner');
}
export function ringName(res) {
  if (!res) return '';
  if (res.ring === 'inner') return 'Bull 50';
  if (res.ring === 'outer') return 'Bull 25';
  if (res.ring === 'miss') return 'Trượt';
  const base = res.ring === 'treble' ? 'Treble' : res.ring === 'double' ? 'Double' : 'Đơn';
  return `${base} ${res.segment}`;
}

export function createGame(players, opts = {}) {
  const mode = opts.phMode === 'solo' ? 'solo' : 'match';
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  /* 🔄 Người ném trước xoay qua các ván: host truyền opts.firstIdx (bộ
     đếm ván ở main.js, lưu localStorage nên sống qua cả tải lại trang);
     không có thì ghế 0 như cũ; chơi đơn luôn người chơi ném. */
  const firstIdx = mode === 'solo' ? 0
    : Number.isInteger(opts.firstIdx) ? ((opts.firstIdx % players.length) + players.length) % players.length
    : 0;
  const s = {
    gid: 'g' + (++gidSeq) + '-' + Math.random().toString(36).slice(2, 7),
    seq: 0, seed, rngState: seed, firstIdx,
    phase: 'playing', mode, solo: mode === 'solo', race: false,
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null })),
    prog: {
      turn: players[firstIdx].id, /* người đang ném */
      visit: 1, /* lượt hiện tại (1..) */
      visitDarts: [], /* các phi tiêu đã ném trong lượt hiện tại */
      visitStart: mode === 'solo' ? 0 : START_SCORE, /* điểm còn lại đầu lượt (để bust khôi phục) */
      remaining: {}, /* điểm còn lại (đấu) */
      total: {}, /* tổng điểm đã ghi (cả 2 chế độ) */
      darts: {}, /* tổng số phi tiêu đã ném */
      tons: {}, /* số lượt ≥ 100 điểm */
      maxVisit: {}, /* lượt cao điểm nhất */
      bulls: {}, /* số lần trúng bull trong */
      throws: [], /* lịch sử mọi phi tiêu */
      lastThrow: null,
    },
    winner: null, winnerIds: [], losers: [], endReason: null, final: null,
    startedAt: Date.now(), endedAt: null, log: [],
  };
  for (const p of players) {
    s.prog.remaining[p.id] = START_SCORE;
    s.prog.total[p.id] = 0;
    s.prog.darts[p.id] = 0;
    s.prog.tons[p.id] = 0;
    s.prog.maxVisit[p.id] = 0;
    s.prog.bulls[p.id] = 0;
  }
  pushLog(s, `🎯 ${s.players[firstIdx].name} ném trước!`);
  return s;
}

/* ai đang phải ném: người của lượt hiện tại (chơi đơn: chỉ người chơi) */
export function actors(s) {
  if (!s || s.phase !== 'playing') return [];
  if (s.solo) return [s.players[0].id];
  return [s.prog.turn];
}

function endGame(s, winner, losers, reason) {
  const p = s.prog;
  s.phase = 'ended';
  s.winner = winner;
  s.winnerIds = winner ? [winner] : [];
  s.losers = losers || [];
  s.endReason = reason;
  s.endedAt = Date.now();
  s.final = { summary: {} };
  for (const pl of s.players) {
    s.final.summary[pl.id] = {
      score: p.total[pl.id] || 0,
      darts: p.darts[pl.id] || 0,
      tons: p.tons[pl.id] || 0,
      maxVisit: p.maxVisit[pl.id] || 0,
      bulls: p.bulls[pl.id] || 0,
      timeMs: s.endedAt - s.startedAt,
    };
  }
}

function checkEnd(s) {
  const p = s.prog;
  if (s.solo) {
    if (p.visit > SOLO_VISITS) {
      const me = s.players[0].id;
      if ((p.total[me] || 0) >= SOLO_WIN_SCORE) endGame(s, me, s.players.slice(1).map(q => q.id), 'win');
      else endGame(s, null, [me], 'win');
    }
    return;
  }
  if (p.visit > MAX_VISITS) endGame(s, null, [], 'draw'); /* hoà: losers rỗng để watch trả null (chỉ tính 1 ván đã chơi, không tính thua) — như Đá Penalty */
}

/* kết thúc 1 lượt: tính điểm lượt, chuyển người ném */
function endVisit(s, busted) {
  const p = s.prog;
  const pid = p.turn;
  const visitScore = busted ? 0 : p.visitDarts.reduce((t, d) => t + d.points, 0);
  if (visitScore >= 100) p.tons[pid]++;
  if (visitScore > p.maxVisit[pid]) p.maxVisit[pid] = visitScore;
  p.visitDarts = [];
  if (s.solo) {
    p.visit++;
    p.visitStart = 0;
    checkEnd(s);
    return;
  }
  const idx = s.players.findIndex(q => q.id === pid);
  const next = s.players[(idx + 1) % s.players.length];
  p.turn = next.id;
  if (next.id === s.players[0].id) p.visit++;
  p.visitStart = p.remaining[p.turn];
  checkEnd(s);
}

export function applyAction(s, pid, a, ctx) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
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
  if (a.type === 'throw') {
    if (pid !== prog.turn && !(s.solo && pid === s.players[0].id)) return { ok: false, reason: 'Chưa tới lượt ném của bạn.' };
    if (typeof a.x !== 'number' || typeof a.y !== 'number' || !isFinite(a.x) || !isFinite(a.y)) return { ok: false, reason: 'Điểm ngắm không hợp lệ.' };
    if (a.x < 0 || a.x > 400 || a.y < 0 || a.y > 400) return { ok: false, reason: 'Điểm ngắm ngoài bàn.' };
    /* sai số tay: đĩa đều bán kính sigma theo cấp độ người ném */
    const pl = pOf(s, pid);
    const sigma = SIGMA[(pl && pl.level) || 'human'] || SIGMA.human;
    const ang = rngNext(s) * Math.PI * 2;
    const dist = sigma * Math.sqrt(rngNext(s));
    const lx = a.x + dist * Math.cos(ang);
    const ly = a.y + dist * Math.sin(ang);
    const res = scoreOf(lx, ly);
    const dart = {
      id: prog.throws.length + 1, pid, visit: prog.visit,
      aimX: a.x, aimY: a.y, x: lx, y: ly,
      segment: res.segment, ring: res.ring, points: res.points,
    };
    prog.throws.push(dart);
    prog.lastThrow = { ...dart };
    prog.darts[pid]++;
    if (res.ring === 'inner') prog.bulls[pid]++;
    s.seq++;
    if (s.solo) {
      /* chơi đơn: cộng điểm, hết 3 phi tiêu thì sang lượt sau */
      prog.total[pid] += res.points;
      prog.visitDarts.push(dart);
      pushLog(s, `🎯 ${pOf(s, pid).name} ném ${ringName(res)} (${res.points}đ)!`, res.points >= 60 ? '' : 'bad');
      if (prog.visitDarts.length >= 3) endVisit(s, false);
      return { ok: true, dart };
    }
    /* đấu: tính điểm còn lại + bust / về đích */
    const remBefore = prog.remaining[pid];
    const remAfter = remBefore - res.points;
    if (remAfter < 0 || remAfter === 1 || (remAfter === 0 && !isDoubleOut(res))) {
      /* BUST: lượt 0 điểm, điểm giữ nguyên, mất các phi tiêu còn lại */
      prog.remaining[pid] = prog.visitStart;
      pushLog(s, `💥 ${pOf(s, pid).name} BUST (${ringName(res)}) — lượt 0 điểm!`, 'bad');
      prog.visitDarts.push(dart);
      endVisit(s, true);
      return { ok: true, dart, busted: true };
    }
    prog.remaining[pid] = remAfter;
    prog.total[pid] += res.points;
    prog.visitDarts.push(dart);
    pushLog(s, `🎯 ${pOf(s, pid).name} ném ${ringName(res)} (${res.points}đ) — còn ${remAfter}!`, res.points >= 60 ? '' : 'bad');
    if (remAfter === 0) {
      /* về đích bằng double-out */
      endGame(s, pid, s.players.filter(q => q.id !== pid).map(q => q.id), 'win');
      return { ok: true, dart };
    }
    if (prog.visitDarts.length >= 3) endVisit(s, false);
    return { ok: true, dart };
  }
  return { ok: false, reason: 'Hành động không hợp lệ.' };
}

export function viewFor(s, pid) {
  const p = s.prog;
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, firstIdx: s.firstIdx,
    startedAt: s.startedAt, endedAt: s.endedAt,
    winner: s.winner, winnerIds: (s.winnerIds || []).slice(), losers: (s.losers || []).slice(),
    endReason: s.endReason, final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    mode: s.mode, solo: s.solo, race: s.race,
    turn: p.turn, visit: p.visit,
    visitDarts: p.visitDarts.map(d => ({ ...d })),
    remaining: { ...p.remaining }, total: { ...p.total },
    darts: { ...p.darts }, tons: { ...p.tons }, maxVisit: { ...p.maxVisit }, bulls: { ...p.bulls },
    lastThrow: p.lastThrow ? { ...p.lastThrow } : null,
    throws: p.throws.slice(-30).map(d => ({ ...d })),
    players: s.players.map(pl => ({ id: pl.id, name: pl.name, isBot: !!pl.isBot, botLevel: pl.level || null })),
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
