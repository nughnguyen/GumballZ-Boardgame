// 🌈 Wavelength – luật chơi (thuần logic, không chạm DOM).
// Một người làm NHÀ NGOẠI CẢM (Psychic): thấy 1 vị trí bí mật
// (0–100) trên 1 thang đo 2 đầu đối lập (VD "Nóng ↔ Lạnh"), rồi đưa
// 1 gợi ý ngắn (VD "Nước sôi" cho vị trí gần đầu Nóng). Những người
// còn lại đặt 1 mốc lên thang đo ở chỗ họ nghĩ vị trí bí mật nằm.
// Lật bài: so mốc với vị trí bí mật theo thang điểm (luật nhà):
//   |mốc − đích| ≤ 5 → 4 điểm; ≤ 12 → 3 điểm; ≤ 20 → 2 điểm; còn lại 0.
// Mỗi người đoán được điểm theo mốc của chính mình; Nhà ngoại cảm
// được thưởng khi cả bàn đoán sát: mốc tốt nhất 4 điểm → +2, 3 điểm → +1.
// Ván nhiều người: mỗi người làm Nhà ngoại cảm ĐÚNG 2 LẦN (số lượt =
// 2 × số người: 2 người → 4 lượt, 4 người → 8 lượt) — để không ai bị
// thiệt lượt đoán: với 5 lượt cố định thì người làm Nhà ngoại cảm 3 lần
// chỉ đoán 2 lần, còn người kia đoán 3 lần (người đoán được tối đa 4đ/
// lượt, Nhà ngoại cảm chỉ +2đ tối đa nên lượt đoán đáng giá hơn) —
// đo bằng mô phỏng 100 ván: ghế 2 thắng 53–77%, ghế 1 chỉ 13–29%.
// Ai đạt 10 điểm trước thì thắng ngay, hết lượt thì ai nhiều điểm nhất
// thắng; hòa điểm thì so số lần đạt 4 điểm, rồi mới hòa.
// Chơi đơn: 10 lượt, mỗi lượt game đưa sẵn 1 gợi ý (từ ngân hàng) và
// bạn đặt mốc; đúng từ 25/40 điểm mới thắng.
// LCG trong state giữ cho các lần rút thang/vị trí giống hệt nhau ở
// mọi máy cùng áp 1 hành động — dùng Math.random() thì 2 máy lệch nhau.
// Quyết định luật (ghi rõ để parent hiệu chuẩn thành tích):
// - KHÔNG có đồng hồ đếm giờ (bản gốc Wavelength cũng không có).
// - KHÔNG có điểm thưởng đoán "trái/phải" sau khi lật bài như bản gốc
//   (bỏ cho gọn — chỉ tính điểm mốc).
// - Mốc của người khác bị CHE cho tới khi lật bài (mỗi người chỉ thấy
//   mốc của chính mình + số người đã đặt/chốt); Nhà ngoại cảm không
//   thấy vị trí mốc nào trước khi lật bài.
// - Nhà ngoại cảm bấm "Lật bài ngay" (next lúc guess) để ép lật bài
//   sớm khi đã có ít nhất 1 mốc — chống kẹt ván online.
// - Xin thua: 2 người thì ván kết thúc ngay, người còn lại thắng;
//   3+ người thì ván tiếp tục không có người xin thua (lượt làm Nhà
//   ngoại cảm của họ bị bỏ qua; chỉ còn 1 người chưa thua thì người
//   đó thắng ngay).
import { SPECTRUMS, CLUES } from './words.js?v=1';

export function maxRoundsFor(n) { return n * 2; } /* nhiều người: mỗi người làm Nhà ngoại cảm đúng 2 lần → số lượt = 2 × số người */
export const WIN_POINTS = 10; /* đạt 10 điểm trước thì thắng ngay */
export const SOLO_ROUNDS = 10;
export const SOLO_WIN_POINTS = 25; /* chơi đơn: đúng từ 25/40 điểm mới thắng */
export const BANDS = [ /* [ngưỡng |chênh|, điểm] */
  { max: 5, pts: 4 },
  { max: 12, pts: 3 },
  { max: 20, pts: 2 },
];

/* điểm của 1 mốc theo chênh lệch với vị trí bí mật */
export function bandOf(pos, target) {
  const d = Math.abs(pos - target);
  for (const b of BANDS) if (d <= b.max) return b.pts;
  return 0;
}

/* bộ sinh số giả ngẫu nhiên có hạt giống (mulberry32) */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
/* LCG lưu trong state — mọi lần rút số đều qua đây để 2 máy đồng bộ */
function nextRand(s) {
  s.seed = (s.seed * 1103515245 + 12345) % 2147483648;
  return s.seed / 2147483648;
}

const pOf = (s, id) => s.players.find(p => p.id === id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

/* rút 1 thang đo chưa dùng trong ván (theo LCG) */
function drawSpectrum(s) {
  const unused = SPECTRUMS.map((_, i) => i).filter(i => !s.usedSpectrums.includes(i));
  if (!unused.length) return 0; /* hết thang thì dùng lại thang đầu (hiếm) */
  const idx = unused[Math.floor(nextRand(s) * unused.length)];
  s.usedSpectrums.push(idx);
  return idx;
}
/* rút 1 gợi ý chưa dùng cho chơi đơn (theo LCG) */
function drawSoloClue(s) {
  const unused = CLUES.map((_, i) => i).filter(i => !s.usedClues.includes(i));
  if (!unused.length) return null;
  const idx = unused[Math.floor(nextRand(s) * unused.length)];
  s.usedClues.push(idx);
  return CLUES[idx];
}
/* rút vị trí bí mật 0–100 (theo LCG) */
function drawTarget(s) {
  return Math.floor(nextRand(s) * 101);
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 1 || players.length > 6) throw new Error('Wavelength chơi 1–6 người.');
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  const solo = players.length === 1;
  /* người đi đầu: host truyền firstIdx để xoay lượt qua các ván (ván sau =
     ghế sau ván trước); không có thì bốc thăm theo seed — ván đầu ngẫu nhiên,
     không còn cố định ghế 0 mọi ván mới */
  const firstIdx = Number.isInteger(opts.firstIdx) && opts.firstIdx >= 0 && opts.firstIdx < players.length
    ? opts.firstIdx : seed % players.length;
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    seed, /* hạt giống LCG — mọi lần rút số trong ván đều qua nextRand(s) */
    phase: 'playing', /* 'playing' | 'ended' */
    solo,
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null })),
    prog: {},
    round: 1, /* nhiều người: lượt 1..maxRounds; chơi đơn: lượt 1..10 */
    maxRounds: solo ? SOLO_ROUNDS : players.length * 2,
    psychicIdx: firstIdx, /* chỉ số ghế của Nhà ngoại cảm hiện tại (nhiều người) */
    firstIdx, /* ghế Nhà ngoại cảm đầu tiên của ván — để xoay lượt qua các ván + hiện ở phòng chờ */
    stage: solo ? 'guess' : 'clue', /* nhiều người: 'clue' | 'guess' | 'reveal'; chơi đơn: 'guess' | 'reveal' */
    current: null, /* nhiều người: {psychic, spectrumIdx, target, clue, shown, markers:[{pid,pos,locked,band}], revealed} */
    soloSet: null, /* chơi đơn: {index, spectrumIdx, clue, target, picked, locked, revealed, band} */
    lastReveal: null, /* kết quả lật bài gần nhất */
    usedSpectrums: [],
    usedClues: [],
    winner: null, losers: [], endReason: null,
    startedAt: Date.now(), endedAt: null,
    log: [],
  };
  for (const p of s.players) s.prog[p.id] = {
    points: 0, fourCount: 0, bestBand: 0, guesses: 0,
    roundsAsPsychic: 0, resigned: false,
  };
  if (solo) {
    const c = drawSoloClue(s);
    s.soloSet = { index: 0, spectrumIdx: c.spectrum, clue: c.clue, target: c.target, picked: null, locked: false, revealed: false, band: null };
    pushLog(s, `🌈 Ván Wavelength mới — xem gợi ý rồi đặt mốc lên thang đo, 10 lượt, đúng từ ${SOLO_WIN_POINTS}/40 điểm mới thắng!`);
  } else {
    const sp = drawSpectrum(s);
    s.current = { psychic: s.players[firstIdx].id, spectrumIdx: sp, target: drawTarget(s), clue: null, shown: false, markers: [], revealed: false };
    s.prog[s.players[firstIdx].id].roundsAsPsychic = 1;
    pushLog(s, `🌈 Ván Wavelength mới — ${s.players[firstIdx].name} làm Nhà ngoại cảm đầu tiên! ${s.players.length} người, ${s.maxRounds} lượt, mỗi lượt 1 Nhà ngoại cảm đưa gợi ý!`);
  }
  return s;
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s.maxRounds) s.maxRounds = s.solo ? SOLO_ROUNDS : (Array.isArray(s.players) ? s.players.length * 2 : 10); /* save cũ chưa có maxRounds */
  if (!s || !Array.isArray(s.players) || s.players.length < 1 || s.players.length > 6
    || typeof s.phase !== 'string' || !s.prog || !Array.isArray(s.usedSpectrums)
    || !['clue', 'guess', 'reveal'].includes(s.stage)) {
    throw new Error('Trạng thái Wavelength không hợp lệ.');
  }
  if (typeof s.firstIdx !== 'number') s.firstIdx = s.psychicIdx || 0; /* save cũ chưa có firstIdx */
  return s;
}

/* Nhà ngoại cảm hiện tại (nhiều người) */
function psychicId(s) { return s.players[s.psychicIdx] ? s.players[s.psychicIdx].id : null; }
/* những người phải đặt mốc (trừ Nhà ngoại cảm, trừ người đã xin thua) */
function guessers(s) {
  if (s.solo) return s.players.map(p => p.id);
  const ps = psychicId(s);
  return s.players.filter(p => p.id !== ps && !s.prog[p.id].resigned).map(p => p.id);
}

function finishSummary(s) {
  const summary = {};
  for (const p of s.players) {
    const pr = s.prog[p.id];
    summary[p.id] = {
      points: pr.points, bestBand: pr.bestBand, exactCount: pr.fourCount,
      guesses: pr.guesses, roundsAsPsychic: pr.roundsAsPsychic,
    };
  }
  return summary;
}

function checkEnd(s) {
  if (s.phase !== 'playing') return;
  s.phase = 'ended'; s.endedAt = Date.now(); s.seq++;
  if (s.solo) {
    const me = s.players[0], pr = s.prog[me.id];
    if (pr.points >= SOLO_WIN_POINTS) { s.winner = me.id; s.losers = []; }
    else { s.winner = null; s.losers = [me.id]; }
    s.endReason = 'done';
    pushLog(s, s.winner
      ? `🏆 ${me.name} đạt ${pr.points}/40 điểm — thắng Wavelength!`
      : `🏁 ${me.name} đạt ${pr.points}/40 điểm — chưa đủ ${SOLO_WIN_POINTS} điểm để thắng.`);
  } else {
    const ranked = [...s.players].sort((a, b) => {
      const pa = s.prog[a.id], pb = s.prog[b.id];
      if (pb.points !== pa.points) return pb.points - pa.points;
      if (pb.fourCount !== pa.fourCount) return pb.fourCount - pa.fourCount;
      return s.players.indexOf(a) - s.players.indexOf(b);
    });
    const best = ranked[0];
    const tied = ranked.length > 1
      && s.prog[ranked[1].id].points === s.prog[best.id].points
      && s.prog[ranked[1].id].fourCount === s.prog[best.id].fourCount;
    if (tied) {
      s.winner = null; s.losers = []; s.endReason = 'draw';
      pushLog(s, `🤝 Hòa! ${best.name} và ${(ranked[1] || {}).name} cùng ${s.prog[best.id].points} điểm.`, 'draw');
    } else {
      s.winner = best.id; s.losers = s.players.filter(p => p.id !== best.id).map(p => p.id);
      s.endReason = s.endReason || 'done';
      pushLog(s, `🏆 ${best.name} thắng với ${s.prog[best.id].points} điểm!`, 'win');
    }
  }
  s.final = { summary: finishSummary(s) };
}

/* lật bài 1 lượt (nhiều người): chấm mốc, cộng điểm, đặt lastReveal */
function doReveal(s) {
  const cur = s.current;
  if (!cur || cur.revealed) return false;
  cur.revealed = true;
  const sp = SPECTRUMS[cur.spectrumIdx];
  let bestBand = 0;
  const roundPoints = {};
  for (const m of cur.markers) {
    m.band = bandOf(m.pos, cur.target);
    const pr = s.prog[m.pid];
    pr.points += m.band;
    pr.guesses++;
    if (m.band === 4) pr.fourCount++;
    if (m.band > pr.bestBand) pr.bestBand = m.band;
    if (m.band > bestBand) bestBand = m.band;
    roundPoints[m.pid] = m.band;
  }
  /* thưởng Nhà ngoại cảm khi cả bàn đoán sát */
  const pp = s.prog[cur.psychic];
  const bonus = bestBand === 4 ? 2 : bestBand === 3 ? 1 : 0;
  pp.points += bonus;
  roundPoints[cur.psychic] = bonus;
  s.lastReveal = {
    psychic: cur.psychic, spectrumIdx: cur.spectrumIdx,
    left: sp.left, right: sp.right, target: cur.target, clue: cur.clue,
    markers: cur.markers.map(m => ({ pid: m.pid, pos: m.pos, band: m.band })),
    bestBand, roundPoints,
  };
  s.stage = 'reveal'; s.seq++;
  const best = cur.markers.reduce((a, m) => (m.band > (a ? a.band : -1) ? m : a), null);
  pushLog(s, best
    ? `🎯 Lật bài: vị trí bí mật là ${cur.target} — ${pOf(s, best.pid).name} đoán sát nhất (${best.band} điểm)${bonus ? `, Nhà ngoại cảm +${bonus} điểm thưởng` : ''}.`
    : `🎯 Lật bài: vị trí bí mật là ${cur.target} — không ai đặt mốc.`, 'good');
  /* ai đạt 10 điểm trước thì thắng ngay */
  if (s.players.some(p => s.prog[p.id].points >= WIN_POINTS)) { checkEnd(s); return true; }
  return true;
}

/* sang lượt tiếp theo (Nhà ngoại cảm mới), hoặc hết ván */
function advanceRound(s) {
  s.current = null; s.lastReveal = null;
  if (s.round >= s.maxRounds) { checkEnd(s); return true; }
  s.round++;
  let guard = 0;
  do {
    s.psychicIdx++;
    if (s.psychicIdx >= s.players.length) s.psychicIdx = 0;
  } while (s.prog[s.players[s.psychicIdx].id].resigned && guard++ < 20);
  const sp = drawSpectrum(s);
  const ps = s.players[s.psychicIdx].id;
  s.current = { psychic: ps, spectrumIdx: sp, target: drawTarget(s), clue: null, shown: false, markers: [], revealed: false };
  s.prog[ps].roundsAsPsychic++;
  s.stage = 'clue'; s.seq++;
  pushLog(s, `🔄 Lượt ${s.round}/${s.maxRounds} — ${pOf(s, ps).name} làm Nhà ngoại cảm!`);
  return false;
}

/* sang lượt tiếp theo (chơi đơn) */
function advanceSolo(s) {
  const set = s.soloSet;
  if (!set) return;
  if (set.index + 1 >= SOLO_ROUNDS) { checkEnd(s); return; }
  const c = drawSoloClue(s);
  if (!c) { checkEnd(s); return; }
  s.soloSet = { index: set.index + 1, spectrumIdx: c.spectrum, clue: c.clue, target: c.target, picked: null, locked: false, revealed: false, band: null };
  s.stage = 'guess'; s.seq++;
}

/* Nhà ngoại cảm bấm xem vị trí bí mật (giai đoạn clue) */
export function applyReady(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (s.solo) return { ok: false, reason: 'Chơi đơn không cần xem vị trí.' };
  if (s.stage !== 'clue') return { ok: false, reason: 'Chưa tới lúc xem vị trí.' };
  if (pid !== psychicId(s)) return { ok: false, reason: 'Chỉ Nhà ngoại cảm mới được xem vị trí.' };
  if (s.current.shown) return { ok: false, reason: 'Đã xem vị trí rồi.' };
  s.current.shown = true; s.seq++;
  pushLog(s, `🎯 ${pOf(s, pid).name} đã xem vị trí bí mật — đang nghĩ gợi ý…`);
  return { ok: true };
}

/* Nhà ngoại cảm đưa gợi ý (1 cụm ngắn) → sang giai đoạn đặt mốc */
export function applyClue(s, pid, text) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (s.solo) return { ok: false, reason: 'Chơi đơn dùng gợi ý có sẵn.' };
  if (s.stage !== 'clue') return { ok: false, reason: 'Chưa tới lúc đưa gợi ý.' };
  if (pid !== psychicId(s)) return { ok: false, reason: 'Chỉ Nhà ngoại cảm mới được đưa gợi ý.' };
  if (!s.current.shown) return { ok: false, reason: 'Xem vị trí bí mật trước đã.' };
  const clean = (text || '').trim();
  if (!clean) return { ok: false, reason: 'Chưa nhập gợi ý.' };
  if (clean.length > 60) return { ok: false, reason: 'Gợi ý tối đa 60 ký tự.' };
  s.current.clue = clean;
  s.stage = 'guess'; s.seq++;
  pushLog(s, `💡 ${pOf(s, pid).name} gợi ý: "${clean}" — mọi người đặt mốc lên thang đo!`);
  return { ok: true };
}

/* người đoán đặt / dời mốc (chưa chốt thì dời thoải mái) */
export function applyPlace(s, pid, pos) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (s.solo) return { ok: false, reason: 'Chơi đơn đặt mốc bằng soloPlace.' };
  if (s.stage !== 'guess') return { ok: false, reason: 'Chưa tới lúc đặt mốc.' };
  if (pid === psychicId(s)) return { ok: false, reason: 'Nhà ngoại cảm không đặt mốc.' };
  if (s.prog[pid] && s.prog[pid].resigned) return { ok: false, reason: 'Bạn đã xin thua rồi.' };
  if (!Number.isFinite(pos) || pos < 0 || pos > 100) return { ok: false, reason: 'Vị trí mốc phải từ 0 tới 100.' };
  const cur = s.current;
  if (!cur || cur.revealed) return { ok: false, reason: 'Lượt này đã lật bài rồi.' };
  const m = cur.markers.find(x => x.pid === pid);
  if (m && m.locked) return { ok: false, reason: 'Bạn đã chốt mốc rồi.' };
  const p = Math.round(pos);
  if (m) m.pos = p;
  else cur.markers.push({ pid, pos: p, locked: false, band: null });
  s.seq++;
  return { ok: true, pos: p };
}

/* người đoán chốt mốc — mọi người đoán đã chốt thì lật bài ngay */
export function applyLock(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (s.solo) return { ok: false, reason: 'Chơi đơn chốt mốc bằng soloLock.' };
  if (s.stage !== 'guess') return { ok: false, reason: 'Chưa tới lúc chốt mốc.' };
  if (pid === psychicId(s)) return { ok: false, reason: 'Nhà ngoại cảm không đặt mốc.' };
  if (s.prog[pid] && s.prog[pid].resigned) return { ok: false, reason: 'Bạn đã xin thua rồi.' };
  const cur = s.current;
  if (!cur || cur.revealed) return { ok: false, reason: 'Lượt này đã lật bài rồi.' };
  const m = cur.markers.find(x => x.pid === pid);
  if (!m) return { ok: false, reason: 'Đặt mốc lên thang đo trước đã.' };
  if (m.locked) return { ok: false, reason: 'Bạn đã chốt mốc rồi.' };
  m.locked = true; s.seq++;
  pushLog(s, `📍 ${pOf(s, pid).name} đã chốt mốc.`);
  const alive = guessers(s);
  if (alive.every(g => { const mm = cur.markers.find(x => x.pid === g); return mm && mm.locked; })) {
    doReveal(s);
  }
  return { ok: true, revealed: s.stage === 'reveal' };
}

/* chơi đơn: đặt / dời mốc */
export function applySoloPlace(s, pid, pos) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (!s.solo) return { ok: false, reason: 'Chơi nhiều người đặt mốc bằng place.' };
  if (s.stage !== 'guess') return { ok: false, reason: 'Chưa tới lúc đặt mốc.' };
  if (!Number.isFinite(pos) || pos < 0 || pos > 100) return { ok: false, reason: 'Vị trí mốc phải từ 0 tới 100.' };
  const set = s.soloSet;
  if (!set || set.revealed || set.locked) return { ok: false, reason: 'Lượt này đã lật bài rồi.' };
  set.picked = Math.round(pos);
  s.seq++;
  return { ok: true, pos: set.picked };
}

/* chơi đơn: chốt mốc → chấm điểm, lật bài */
export function applySoloLock(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (!s.solo) return { ok: false, reason: 'Chơi nhiều người chốt mốc bằng lock.' };
  if (s.stage !== 'guess') return { ok: false, reason: 'Chưa tới lúc chốt mốc.' };
  const set = s.soloSet;
  if (!set || set.revealed || set.locked) return { ok: false, reason: 'Lượt này đã lật bài rồi.' };
  if (set.picked == null) return { ok: false, reason: 'Đặt mốc lên thang đo trước đã.' };
  set.locked = true; set.revealed = true;
  set.band = bandOf(set.picked, set.target);
  const pr = s.prog[pid];
  pr.points += set.band;
  pr.guesses++;
  if (set.band === 4) pr.fourCount++;
  if (set.band > pr.bestBand) pr.bestBand = set.band;
  s.lastReveal = {
    psychic: null, spectrumIdx: set.spectrumIdx,
    left: SPECTRUMS[set.spectrumIdx].left, right: SPECTRUMS[set.spectrumIdx].right,
    target: set.target, clue: set.clue,
    markers: [{ pid, pos: set.picked, band: set.band }],
    bestBand: set.band, roundPoints: { [pid]: set.band },
  };
  s.stage = 'reveal'; s.seq++;
  pushLog(s, set.band === 4
    ? `🎯 Chính xác! Mốc của bạn cách đích ${Math.abs(set.picked - set.target)} — +4 điểm!`
    : set.band > 0
      ? `🎯 Mốc của bạn cách đích ${Math.abs(set.picked - set.target)} — +${set.band} điểm.`
      : `🎯 Mốc của bạn cách đích ${Math.abs(set.picked - set.target)} — 0 điểm. Đích là ${set.target}.`, set.band === 4 ? 'good' : 'bad');
  return { ok: true, band: set.band };
}

/* đã xem lật bài xong → sang lượt tiếp theo; lúc guess thì Nhà ngoại
   cảm ép lật bài sớm (cần ít nhất 1 mốc đã đặt) */
export function applyNext(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (s.solo) {
    if (s.stage !== 'reveal') return { ok: false, reason: 'Chưa lật bài xong.' };
    advanceSolo(s);
    return { ok: true };
  }
  if (s.stage === 'reveal') {
    advanceRound(s);
    return { ok: true };
  }
  if (s.stage === 'guess' && pid === psychicId(s)) {
    const cur = s.current;
    if (!cur || cur.revealed) return { ok: false, reason: 'Lượt này đã lật bài rồi.' };
    if (!cur.markers.length) return { ok: false, reason: 'Chưa ai đặt mốc.' };
    doReveal(s);
    return { ok: true };
  }
  return { ok: false, reason: 'Chưa lật bài xong.' };
}

/* xin thua: 2 người thì ván kết thúc ngay; 3+ người thì ván tiếp tục
   không có người xin thua (lượt làm Nhà ngoại cảm của họ bị bỏ qua) */
export function applyResign(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Không có người này.' };
  if (pr.resigned) return { ok: false, reason: 'Bạn đã xin thua rồi.' };
  pr.resigned = true;
  s.seq++;
  pushLog(s, `🏳️ ${pOf(s, pid).name} xin thua.`);
  if (s.solo) {
    s.winner = null; s.losers = [pid]; s.endReason = 'resign';
    s.phase = 'ended'; s.endedAt = Date.now(); s.seq++;
    s.final = { summary: finishSummary(s) };
    return { ok: true, ended: true };
  }
  const alive = s.players.filter(p => !s.prog[p.id].resigned);
  if (alive.length <= 1) {
    s.endReason = 'resign';
    if (alive.length === 1) { s.winner = alive[0].id; s.losers = s.players.filter(p => p.id !== alive[0].id).map(p => p.id); }
    else { s.winner = null; s.losers = s.players.map(p => p.id); }
    s.phase = 'ended'; s.endedAt = Date.now(); s.seq++;
    s.final = { summary: finishSummary(s) };
    return { ok: true, ended: true };
  }
  /* còn ≥2 người: nếu người xin thua đang làm Nhà ngoại cảm thì hủy
     lượt này, chuyển Nhà ngoại cảm cho người tiếp theo (cùng số lượt) */
  if (!s.solo && (s.stage === 'clue' || s.stage === 'guess') && s.current && s.current.psychic === pid) {
    s.current = null; s.lastReveal = null;
    let guard = 0;
    do {
      s.psychicIdx++;
      if (s.psychicIdx >= s.players.length) s.psychicIdx = 0;
    } while (s.prog[s.players[s.psychicIdx].id].resigned && guard++ < 20);
    const sp = drawSpectrum(s);
    const ps = s.players[s.psychicIdx].id;
    s.current = { psychic: ps, spectrumIdx: sp, target: drawTarget(s), clue: null, shown: false, markers: [], revealed: false };
    s.prog[ps].roundsAsPsychic++;
    s.stage = 'clue'; s.seq++;
    pushLog(s, `🔄 ${pOf(s, ps).name} làm Nhà ngoại cảm thay!`);
  } else if (!s.solo && s.stage === 'guess' && s.current) {
    /* người đoán xin thua: bỏ mốc của họ; nếu mọi người còn lại đã
       chốt thì lật bài */
    s.current.markers = s.current.markers.filter(m => m.pid !== pid);
    const aliveG = guessers(s);
    if (aliveG.length && aliveG.every(g => { const mm = s.current.markers.find(x => x.pid === g); return mm && mm.locked; })) {
      doReveal(s);
    }
  }
  return { ok: true, ended: false };
}

/* ai đang phải hành động (cho bot): Nhà ngoại cảm lúc 'clue', người
   đoán chưa chốt lúc 'guess', bất kỳ ai lúc 'reveal' */
export const actors = s => {
  if (s.phase !== 'playing') return [];
  if (s.stage === 'clue') return [psychicId(s)];
  if (s.stage === 'guess') {
    if (s.solo) {
      const set = s.soloSet;
      return set && !set.locked ? [s.players[0].id] : [];
    }
    const cur = s.current;
    if (!cur) return [];
    return guessers(s).filter(g => {
      const m = cur.markers.find(x => x.pid === g);
      return !m || !m.locked;
    });
  }
  if (s.stage === 'reveal') return s.players.filter(p => !s.prog[p.id].resigned).map(p => p.id);
  return [];
};

/* góc nhìn riêng của 1 người chơi: vị trí bí mật CHỈ lộ với Nhà ngoại
   cảm (sau khi bấm xem) hoặc sau khi lật bài; mốc của người khác bị
   CHE tới khi lật bài (mỗi người chỉ thấy mốc của chính mình + số
   người đã đặt/chốt), Nhà ngoại cảm không thấy vị trí mốc nào trước
   khi lật bài */
export function viewFor(s, pid) {
  const pr = s.prog[pid] || { points: 0, fourCount: 0, bestBand: 0, guesses: 0, roundsAsPsychic: 0, resigned: false };
  const ended = s.phase === 'ended';
  const cur = s.current;
  const isPsychic = !s.solo && cur && cur.psychic === pid;
  let currentView = null;
  if (!s.solo && cur) {
    const sp = SPECTRUMS[cur.spectrumIdx];
    const revealed = cur.revealed;
    currentView = {
      psychic: cur.psychic,
      spectrumIdx: cur.spectrumIdx,
      left: sp.left, right: sp.right,
      target: (isPsychic && cur.shown) || revealed ? cur.target : null,
      clue: cur.clue,
      shown: !!cur.shown,
      revealed: !!revealed,
      markers: cur.markers.map(m => ({
        pid: m.pid,
        pos: (revealed || m.pid === pid) ? m.pos : null,
        locked: !!m.locked,
        band: revealed ? m.band : null,
      })),
      placedCount: cur.markers.length,
      lockedCount: cur.markers.filter(m => m.locked).length,
      totalGuessers: guessers(s).length,
    };
  }
  let soloView = null;
  if (s.solo && s.soloSet) {
    const set = s.soloSet;
    const sp = SPECTRUMS[set.spectrumIdx];
    soloView = {
      index: set.index + 1, total: SOLO_ROUNDS,
      left: sp.left, right: sp.right,
      clue: set.clue,
      picked: set.picked, locked: !!set.locked, revealed: !!set.revealed,
      band: set.revealed ? set.band : null,
      target: set.revealed ? set.target : null,
    };
  }
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    startedAt: s.startedAt, endedAt: s.endedAt,
    winner: s.winner, losers: (s.losers || []).slice(), endReason: s.endReason,
    final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    solo: s.solo, round: s.round, rounds: s.maxRounds,
    stage: s.stage, psychic: psychicId(s), firstIdx: s.firstIdx,
    wordsDone: s.solo ? (s.soloSet ? s.soloSet.index : 0) : s.round - 1,
    totalWords: s.maxRounds,
    current: currentView, soloSet: soloView,
    lastReveal: s.lastReveal ? JSON.parse(JSON.stringify(s.lastReveal)) : null,
    players: s.players.map(p => {
      const q = s.prog[p.id] || {};
      return {
        id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
        points: q.points || 0, fourCount: q.fourCount || 0, bestBand: q.bestBand || 0,
        guesses: q.guesses || 0, roundsAsPsychic: q.roundsAsPsychic || 0, resigned: !!q.resigned,
      };
    }),
    you: {
      points: pr.points, fourCount: pr.fourCount, bestBand: pr.bestBand,
      guesses: pr.guesses, roundsAsPsychic: pr.roundsAsPsychic,
      isPsychic: !!isPsychic,
    },
    log: s.log.slice(-20),
    me: pid,
  };
}

/* Adapter cho phòng online (simplenet): action { type, text?, pos? } */
export function applyAction(s, pid, a, ctx) {
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'ready': return applyReady(s, pid);
    case 'clue': return applyClue(s, pid, a.text);
    case 'place':
      if (s.solo) return applySoloPlace(s, pid, a.pos);
      return applyPlace(s, pid, a.pos);
    case 'lock':
      if (s.solo) return applySoloLock(s, pid);
      return applyLock(s, pid);
    case 'next': return applyNext(s, pid);
    case 'resign': return applyResign(s, pid);
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}

export default { createGame, applyAction, viewFor, actors, serialize, deserialize, mulberry32, bandOf };
