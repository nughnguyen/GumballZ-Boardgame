// 🕷️ Nhện (Spider Solitaire) — luật chơi (engine thuần, không phụ thuộc DOM).
//
// LUẬT (chuẩn Spider):
// - Bộ bài 2 bộ 52 lá (104 lá). 10 cột: 4 cột đầu 6 lá, 6 cột sau 5 lá
//   (54 lá), chỉ lá trên cùng mỗi cột lật ngửa. 5 lần chia thêm, mỗi lần
//   chia 1 lá vào mỗi cột (50 lá còn lại).
// - Di chuyển: xếp lá (hoặc 1 dãy lá cùng chất liên tiếp giảm dần) lên lá
//   lớn hơn 1 bậc bất kỳ chất nào (8♥ lên 9♠ được). Chỉ dãy cùng chất mới
//   được di chuyển nguyên dãy. Cột trống nhận bất kỳ lá/dãy nào.
// - Xếp đủ 1 dãy K→A cùng chất thì dãy tự thu lại (rời bàn, +100 điểm).
// - Độ khó: Dễ = 1 chất (♠), Vừa = 2 chất (♠♥), Khó = 4 chất.
// - Chơi đơn: thắng khi thu đủ 8 dãy K→A. Không có thua do hết giờ —
//   chỉ thắng (mục tiêu là hoàn thành); có Gợi ý (tối đa 5) và Hoàn tác
//   (tối đa 10). Kẹt (không còn nước đi nào mà hết bài chia) thì thua.
// - Đua (đấu máy / online 2–4 / chung máy 2, cùng 1 bộ bài đã xáo + seed,
//   mỗi người 1 bàn): ai thu đủ 8 dãy trước thì thắng; hết 180 giây thì
//   ai thu được nhiều dãy hơn (rồi nhiều điểm hơn) thắng, bằng nhau thì
//   hoà; kẹt/xin thua thì bị loại, người còn lại chơi tiếp.
// - Điểm: thu 1 dãy K→A cùng chất = +100; mỗi lần chia thêm = −5
//   (không âm); thắng chơi đơn cộng thưởng theo độ khó (Dễ +0, Vừa +100,
//   Khó +200).
// - viewFor: mỗi người chỉ thấy bàn của MÌNH (lá úp chỉ thấy là úp,
//   KHÔNG thấy hạng/chất); đối thủ chỉ thấy tóm tắt (dãy đã thu, điểm,
//   trạng thái). Hết ván thì thấy bảng xếp hạng.
export const SUITS = { easy: 1, medium: 2, hard: 4 };
export const RACE_TIME_MS = 180000; /* đua: hết 180s thì so dãy, rồi điểm */
export const HINTS = 5; /* gợi ý tối đa 5 lần/ván */
export const UNDOS = 10; /* hoàn tác tối đa 10 lần/ván */
export const RUN_SCORE = 100; /* thu 1 dãy K→A cùng chất = +100 */
export const DEAL_PENALTY = 5; /* mỗi lần chia thêm = −5 (không âm) */
export const WIN_BONUS = { 1: 0, 2: 100, 4: 200 }; /* thưởng thắng chơi đơn theo số chất */
export const SUIT_CHAR = ['♠', '♥', '♦', '♣'];
export const RANK_LABEL = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
export const rankLabel = r => RANK_LABEL[r] || String(r);

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
const card = (r, s) => ({ r, s, up: false });
const isRed = c => c.s === 1 || c.s === 2;

/* Xây bộ bài 104 lá theo số chất: Dễ 1 chất (8 bộ mỗi hạng),
   Vừa 2 chất (4 bộ mỗi hạng), Khó 4 chất (2 bộ mỗi hạng). */
function buildDeck(suitCount) {
  const deck = [];
  const suits = suitCount === 1 ? [0] : suitCount === 2 ? [0, 1] : [0, 1, 2, 3];
  const copies = 8 / suits.length;
  for (let r = 1; r <= 13; r++) {
    for (const s of suits) for (let k = 0; k < copies; k++) deck.push(card(r, s));
  }
  return deck;
}
function shuffle(deck, s) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand(s) * (i + 1));
    const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
  }
  return deck;
}
/* số lá ngửa liên tiếp từ trên cùng của 1 cột */
function faceUpCount(col) {
  let n = 0;
  for (let i = col.length - 1; i >= 0; i--) { if (!col[i].up) break; n++; }
  return n;
}
/* dãy count lá trên cùng có phải dãy cùng chất giảm dần liên tiếp không */
function movableSeq(col, count) {
  if (count < 1 || count > faceUpCount(col)) return null;
  const seq = col.slice(col.length - count);
  for (let i = 1; i < seq.length; i++) {
    if (seq[i].s !== seq[0].s || seq[i].r !== seq[i - 1].r - 1) return null;
  }
  return seq;
}
/* 13 lá trên cùng có tạo thành dãy K→A cùng chất không */
function topRun(col) {
  if (col.length < 13) return false;
  const seq = col.slice(col.length - 13);
  if (seq[0].r !== 13) return false;
  for (let i = 0; i < 13; i++) {
    if (!seq[i].up || seq[i].s !== seq[0].s || seq[i].r !== 13 - i) return false;
  }
  return true;
}
/* thu hết các dãy K→A đang có trên cùng của cột (có thể có 2 dãy chồng nhau) */
function collectRuns(prog, colIdx) {
  const col = prog.cols[colIdx];
  let n = 0;
  while (topRun(col)) {
    col.splice(col.length - 13, 13);
    prog.runs++;
    prog.score += RUN_SCORE;
    n++;
  }
  if (n) {
    if (col.length && !col[col.length - 1].up) col[col.length - 1].up = true;
  }
  return n;
}
/* mọi nước 'move' hợp lệ của 1 bàn (dùng cho bot, gợi ý, kiểm tra kẹt) */
export function legalMoves(prog) {
  const out = [];
  for (let from = 0; from < 10; from++) {
    const col = prog.cols[from];
    const up = faceUpCount(col);
    if (!up) continue;
    for (let count = 1; count <= up; count++) {
      const seq = movableSeq(col, count);
      if (!seq) continue;
      const head = seq[0];
      for (let to = 0; to < 10; to++) {
        if (to === from) continue;
        const tcol = prog.cols[to];
        if (!tcol.length) { out.push({ type: 'move', from, to, count }); continue; }
        const top = tcol[tcol.length - 1];
        if (top.up && top.r === head.r + 1) out.push({ type: 'move', from, to, count });
      }
    }
  }
  return out;
}
/* nước "có ích": sau khi đi thì thu được dãy K→A hoặc lật được 1 lá úp.
   Số nước có ích trong 1 ván là hữu hạn (tối đa 8 dãy + 44 lá úp ban đầu)
   nên bot ưu tiên nước có ích sẽ luôn tiến tới, không xáo bài vô hạn.
   (Không copy bàn — chỉ đọc chỉ số — để bot tìm kiếm gọi được nhiều lần.) */
export function isProductiveMove(prog, m) {
  const fromCol = prog.cols[m.from];
  /* lật lá úp: lá mới lộ ở cột nguồn có úp không */
  const newTopIdx = fromCol.length - m.count - 1;
  if (newTopIdx >= 0 && !fromCol[newTopIdx].up) return true;
  /* thu dãy: 13 lá trên cùng của cột đích sau khi xếp (gồm phần cuối của
     cột đích + dãy được chuyển sang), phải là K→A cùng chất, đều ngửa */
  const toCol = prog.cols[m.to];
  const total = toCol.length + m.count;
  if (total < 13) return false;
  const need = 13 - m.count; /* số lá lấy từ cuối cột đích */
  const top = [];
  for (let i = toCol.length - need; i < toCol.length; i++) top.push(toCol[i]);
  for (let i = fromCol.length - m.count; i < fromCol.length; i++) top.push(fromCol[i]);
  if (top[0].r !== 13) return false;
  for (let i = 0; i < 13; i++) {
    if (!top[i].up || top[i].s !== top[0].s || top[i].r !== 13 - i) return false;
  }
  return true;
}
/* mô phỏng 1 nước đi trên bản sao (không động tới prog gốc) — dùng cho
   bot tìm kiếm: trả về {cols, runs, score, flipped} */
export function simulateMove(prog, m) {
  const cols = prog.cols.map(c => c.map(x => ({ ...x })));
  let runs = prog.runs, score = prog.score, flipped = false;
  const moved = cols[m.from].splice(cols[m.from].length - m.count, m.count);
  cols[m.to].push(...moved);
  const scol = cols[m.from];
  if (scol.length && !scol[scol.length - 1].up) { scol[scol.length - 1].up = true; flipped = true; }
  const tcol = cols[m.to];
  if (tcol.length >= 13) {
    const s13 = tcol.slice(tcol.length - 13);
    if (s13[0].r === 13 && s13.every((c, i) => c.up && c.s === s13[0].s && c.r === 13 - i)) {
      tcol.splice(tcol.length - 13, 13);
      runs++; score += RUN_SCORE;
      const nt = tcol[tcol.length - 1];
      if (nt && !nt.up) { nt.up = true; flipped = true; }
    }
  }
  return { cols, runs, score, flipped };
}
/* chấm điểm 1 vị thế (dùng cho bot Khó): dãy đã thu, lá đã lật, liên kết
   cùng chất, cột trống, và — quan trọng nhất — số nước có ích đang mở ra
   (vị thế có nhiều nước lật/thu thì dễ tiến triển, tránh bế tắc) */
export function evaluatePosition(prog) {
  let sc = prog.runs * 10000;
  let fd = 0, links = 0, empty = 0;
  for (const col of prog.cols) {
    if (!col.length) { empty++; continue; }
    for (const c of col) if (!c.up) fd++;
    for (let i = 1; i < col.length; i++) {
      const a = col[i - 1], b = col[i];
      if (a.up && b.up && b.s === a.s && b.r === a.r - 1) links++;
    }
  }
  sc += (44 - fd) * 100;
  sc += links * 20;
  sc += empty * 50;
  const moves = legalMoves(prog);
  let prod = 0;
  for (const m of moves) if (isProductiveMove(prog, m)) prod++;
  sc += prod * 300;
  return sc;
}
/* gợi ý tốt nhất: nước đi dẫn tới vị thế tốt nhất (đánh giá bằng
   evaluatePosition); không còn nước xếp bài mà còn bài chia thì gợi ý chia */
export function findHint(prog) {
  const moves = legalMoves(prog);
  if (!moves.length) return prog.stock.length >= 10 ? { type: 'deal' } : null;
  let best = null, bestScore = -Infinity;
  for (const m of moves) {
    const sc = evaluatePosition(simulateMove(prog, m));
    if (sc > bestScore) { bestScore = sc; best = m; }
  }
  return best;
}
function hasAnyAction(prog) {
  return legalMoves(prog).length > 0 || prog.stock.length >= 10;
}
function snapshot(prog) {
  return JSON.stringify({ cols: prog.cols, stock: prog.stock, runs: prog.runs, score: prog.score });
}
function restore(prog, snap) {
  const d = JSON.parse(snap);
  prog.cols = d.cols; prog.stock = d.stock; prog.runs = d.runs; prog.score = d.score;
}
function finishSummary(s) {
  const out = {};
  for (const p of s.players) {
    const pr = s.prog[p.id];
    out[p.id] = {
      runs: pr.runs, score: pr.score, moves: pr.moves, deals: pr.deals,
      hintsUsed: pr.hintsUsed, undosUsed: pr.undosUsed,
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
  s.endReason = reason; /* 'win' | 'stuck' | 'resign' | 'timeout' | 'draw' */
  for (const p of s.players) if (!s.prog[p.id].doneAt) s.prog[p.id].doneAt = s.endedAt;
  s.final = { summary: finishSummary(s) };
  if (reason === 'draw') pushLog(s, '🤝 Hoà! Không ai hơn ai.', '');
  else if (winner) pushLog(s, `🏆 ${pOf(s, winner).name} thắng ván!`, 'good');
  else pushLog(s, '😢 Hết ván!', '');
}
/* đua: 1 người thu đủ 8 dãy thì thắng ngay */
function checkRaceWin(s) {
  const done = s.players.filter(p => s.prog[p.id].runs >= 8);
  if (!done.length) return;
  if (done.length === 1) {
    const w = done[0];
    endGame(s, w.id, s.players.filter(p => p.id !== w.id).map(p => p.id), 'win');
    return;
  }
  const best = Math.max(...done.map(p => s.prog[p.id].score || 0));
  const top = done.filter(p => (s.prog[p.id].score || 0) === best);
  if (top.length === 1) endGame(s, top[0].id, s.players.filter(p => p.id !== top[0].id).map(p => p.id), 'win');
  else endGame(s, null, s.players.map(p => p.id), 'draw');
}
/* đua: tất cả đều xong (thu đủ/kẹt/xin thua) mà chưa ai thắng → so dãy, rồi điểm */
function checkRaceEnd(s) {
  if (s.phase !== 'playing' || s.mode !== 'race') return;
  if (s.players.some(p => s.prog[p.id].status === 'playing')) return;
  const runs = p => s.prog[p.id].runs || 0;
  const bestRuns = Math.max(...s.players.map(runs));
  let pool = s.players.filter(p => runs(p) === bestRuns);
  if (pool.length > 1) {
    const bestScore = Math.max(...pool.map(p => s.prog[p.id].score || 0));
    pool = pool.filter(p => (s.prog[p.id].score || 0) === bestScore);
  }
  if (pool.length === 1) endGame(s, pool[0].id, s.players.filter(p => p.id !== pool[0].id).map(p => p.id), 'timeout');
  else endGame(s, null, s.players.map(p => p.id), 'draw');
}
/* đua hết 180 giây: kết thúc ván ngay, so dãy rồi điểm (dù còn người đang chơi) */
function endRaceByTimeout(s) {
  if (s.phase !== 'playing' || s.mode !== 'race') return false;
  const runs = p => s.prog[p.id].runs || 0;
  const bestRuns = Math.max(...s.players.map(runs));
  let pool = s.players.filter(p => runs(p) === bestRuns);
  if (pool.length > 1) {
    const bestScore = Math.max(...pool.map(p => s.prog[p.id].score || 0));
    pool = pool.filter(p => (s.prog[p.id].score || 0) === bestScore);
  }
  if (pool.length === 1) endGame(s, pool[0].id, s.players.filter(p => p.id !== pool[0].id).map(p => p.id), 'timeout');
  else endGame(s, null, s.players.map(p => p.id), 'draw');
  return true;
}
function markDone(s, pid, how) {
  const prog = s.prog[pid];
  prog.status = 'done';
  prog.doneAt = Date.now();
  if (how === 'stuck') pushLog(s, `😶 ${pOf(s, pid).name} hết nước đi!`, 'bad');
  if (s.mode === 'solo') {
    endGame(s, null, [pid], 'stuck');
    return;
  }
  checkRaceEnd(s);
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 1 || players.length > 4) throw new Error('Nhện chơi 1–4 người (chơi đơn = 1, đua = 2–4).');
  const mode = opts.nhMode === 'solo' ? 'solo' : 'race';
  if (mode === 'solo' && players.length !== 1) throw new Error('Chơi đơn Nhện cần đúng 1 người.');
  if (mode === 'race' && players.length < 2) throw new Error('Đua Nhện cần 2–4 người.');
  const suits = SUITS[opts.suits] || 1;
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    seed, rng: seed,
    phase: 'playing', /* 'playing' | 'ended' */
    mode, solo: mode === 'solo', race: mode === 'race',
    suits,
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null })),
    prog: {},
    winner: null, winnerIds: [], losers: [],
    endReason: null, /* 'win' | 'stuck' | 'resign' | 'timeout' | 'draw' */
    startedAt: Date.now(), endedAt: null,
    log: [],
  };
  for (const p of s.players) {
    const deck = shuffle(buildDeck(suits), s);
    const cols = [];
    for (let c = 0; c < 10; c++) {
      const n = c < 4 ? 6 : 5;
      const col = deck.splice(0, n);
      col[col.length - 1].up = true;
      cols.push(col);
    }
    s.prog[p.id] = {
      cols, stock: deck,
      runs: 0, score: 0, moves: 0, deals: 0,
      hintsUsed: 0, hintsLeft: HINTS, undosUsed: 0, undosLeft: UNDOS,
      history: [], hint: null, lastMove: null,
      status: 'playing', doneAt: null,
    };
  }
  pushLog(s, mode === 'solo'
    ? `🕷️ Nhện — chơi đơn ${suits} chất: xếp dãy K→A cùng chất để thu, đủ 8 dãy thì thắng!`
    : `🕷️ Nhện — đua ${suits} chất: ai thu đủ 8 dãy trước thì thắng, hết 180 giây thì so dãy rồi điểm!`);
  return s;
}

export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || typeof s !== 'object' || !Array.isArray(s.players) || !s.prog) throw new Error('Trạng thái Nhện không hợp lệ.');
  return s;
}

export function actors(s) {
  if (s.phase !== 'playing') return [];
  return s.players.filter(p => s.prog[p.id] && s.prog[p.id].status === 'playing').map(p => p.id);
}

export function applyAction(s, pid, a, ctx) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  /* timeout hết giờ đua: không gắn với người chơi nào (chủ phòng có thể đã kẹt) */
  if (a.type === 'timeout') {
    if (s.mode !== 'race') return { ok: false, reason: 'Chơi đơn không có giới hạn giờ.' };
    endRaceByTimeout(s);
    s.seq++;
    return { ok: true };
  }
  const prog = s.prog[pid];
  if (!prog || prog.status !== 'playing') return { ok: false, reason: 'Người chơi không còn trong ván.' };
  switch (a.type) {
    case 'move': {
      const { from, to, count } = a;
      if (!Number.isInteger(from) || !Number.isInteger(to) || !Number.isInteger(count) ||
        from < 0 || from > 9 || to < 0 || to > 9 || from === to || count < 1) {
        return { ok: false, reason: 'Nước đi không hợp lệ.' };
      }
      const seq = movableSeq(prog.cols[from], count);
      if (!seq) return { ok: false, reason: 'Chỉ di chuyển được dãy cùng chất giảm dần đang ngửa.' };
      const tcol = prog.cols[to];
      if (tcol.length) {
        const top = tcol[tcol.length - 1];
        if (!top.up || top.r !== seq[0].r + 1) return { ok: false, reason: 'Lá đích phải lớn hơn lá đầu dãy 1 bậc.' };
      }
      prog.history.push(snapshot(prog));
      if (prog.history.length > UNDOS) prog.history.shift();
      prog.cols[from].splice(prog.cols[from].length - count, count);
      prog.cols[to].push(...seq);
      prog.lastMove = { from, to, count };
      const scol = prog.cols[from];
      if (scol.length && !scol[scol.length - 1].up) scol[scol.length - 1].up = true;
      prog.moves++;
      prog.hint = null;
      const got = collectRuns(prog, to);
      if (got) pushLog(s, `🎉 ${pOf(s, pid).name} thu ${got} dãy K→A (+${got * RUN_SCORE}đ)!`, 'good');
      if (prog.runs >= 8) {
        if (s.mode === 'solo') {
          prog.score += WIN_BONUS[s.suits] || 0;
          endGame(s, pid, s.players.filter(p => p.id !== pid).map(p => p.id), 'win');
        } else {
          checkRaceWin(s);
        }
        s.seq++;
        return { ok: true };
      }
      if (!hasAnyAction(prog)) { markDone(s, pid, 'stuck'); s.seq++; return { ok: true }; }
      break;
    }
    case 'deal': {
      if (prog.stock.length < 10) return { ok: false, reason: 'Hết bài để chia thêm.' };
      prog.history.push(snapshot(prog));
      if (prog.history.length > UNDOS) prog.history.shift();
      for (let c = 0; c < 10; c++) {
        const c0 = prog.stock.pop();
        c0.up = true;
        prog.cols[c].push(c0);
      }
      prog.deals++;
      prog.score = Math.max(0, prog.score - DEAL_PENALTY);
      prog.hint = null;
      let got = 0;
      for (let c = 0; c < 10; c++) got += collectRuns(prog, c);
      if (got) pushLog(s, `🎉 ${pOf(s, pid).name} thu ${got} dãy K→A sau khi chia (+${got * RUN_SCORE}đ)!`, 'good');
      if (prog.runs >= 8) {
        if (s.mode === 'solo') {
          prog.score += WIN_BONUS[s.suits] || 0;
          endGame(s, pid, s.players.filter(p => p.id !== pid).map(p => p.id), 'win');
        } else {
          checkRaceWin(s);
        }
        s.seq++;
        return { ok: true };
      }
      if (!hasAnyAction(prog)) { markDone(s, pid, 'stuck'); s.seq++; return { ok: true }; }
      break;
    }
    case 'hint': {
      if (prog.hintsLeft <= 0) return { ok: false, reason: 'Hết lượt gợi ý.' };
      const h = findHint(prog);
      if (!h) {
        if (prog.stock.length >= 10) {
          prog.hintsUsed++;
          prog.hintsLeft--;
          prog.hint = { type: 'deal' };
          return { ok: true, hint: prog.hint };
        }
        return { ok: false, reason: 'Không còn nước đi nào.' };
      }
      prog.hintsUsed++;
      prog.hintsLeft--;
      prog.hint = h;
      break;
    }
    case 'undo': {
      if (prog.undosLeft <= 0) return { ok: false, reason: 'Hết lượt hoàn tác.' };
      if (!prog.history.length) return { ok: false, reason: 'Không có nước nào để hoàn tác.' };
      restore(prog, prog.history.pop());
      prog.undosUsed++;
      prog.undosLeft--;
      prog.hint = null;
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
  return { ok: true, hint: prog.hint || undefined };
}

export function viewFor(s, pid) {
  const me = s.prog[pid] || {};
  const my = me.cols ? {
    cols: me.cols.map(col => col.map(c => c.up ? { r: c.r, s: c.s, up: true } : { up: false })),
    stock: me.stock.length,
    runs: me.runs, score: me.score, moves: me.moves, deals: me.deals,
    hintsLeft: me.hintsLeft, hintsUsed: me.hintsUsed,
    undosLeft: me.undosLeft, undosUsed: me.undosUsed,
    hint: me.hint || null,
    status: me.status,
  } : null;
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    startedAt: s.startedAt, endedAt: s.endedAt,
    winner: s.winner, winnerIds: (s.winnerIds || []).slice(), losers: (s.losers || []).slice(), endReason: s.endReason,
    final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    mode: s.mode, solo: s.solo, race: s.race,
    suits: s.suits,
    my,
    players: s.players.map(p => {
      const q = s.prog[p.id] || {};
      return {
        id: p.id, name: p.name, isBot: !!p.isBot, botLevel: p.level || null,
        runs: q.runs || 0, score: q.score || 0, moves: q.moves || 0,
        status: q.status || 'playing',
      };
    }),
    log: s.log.slice(-20),
    me: pid,
  };
}
