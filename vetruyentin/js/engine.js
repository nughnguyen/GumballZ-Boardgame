// 🎨 Vẽ Truyền Tin – luật chơi (thuần logic, không chạm DOM).
// Telestrations (truyền tin bằng vẽ): mỗi người có 1 quyển sổ, bắt
// đầu bằng 1 từ bí mật. Các lượt xen kẽ VẼ → ĐOÁN → VẼ → ĐOÁN…:
// vẽ từ mình thấy, chuyền sổ sang trái; người tiếp theo đoán bức vẽ
// là từ gì, chuyền tiếp; người sau vẽ lại từ vừa đoán… Hết lượt thì
// lật hết các quyển sổ ra xem cả chuỗi đã "tam sao thất bản" ra sao.
//
// Mô hình chung (cả 3 chế độ): mỗi quyển sổ có 1 chuỗi entry.
// Entry 0 = từ gốc. Bước k (0-based) thêm entry k+1: k chẵn → VẼ
// (vẽ từ hiện tại của sổ), k lẻ → ĐOÁN (đoán bức vẽ ở entry trước).
// - Chơi nhiều người (4–8): N quyển sổ, N bước mỗi sổ; ở bước k,
//   người chơi (b+k)%N cầm sổ b — mỗi người cầm mỗi sổ đúng 1 lần.
// - Chơi đơn: 1 sổ, 10 bước (5 lần vẽ + 5 lần đoán); bước chẵn do
//   người vẽ, bước lẻ do máy đoán.
// - Đấu máy (đua): 2 sổ, 10 bước mỗi sổ; sổ 0 của người (như chơi
//   đơn), sổ 1 của máy — máy tự chơi sổ của nó hoàn toàn trong
//   engine (vẽ = "phác thảo máy", đoán theo mô hình chính xác).
//
// Quyết định luật (ghi rõ để parent hiệu chuẩn thành tích):
// - Từ: 120 từ, 6 nhóm × 20, chia không trùng trong 1 ván (LCG).
// - Đoán đúng = chuẩn hoá (thường hoá dấu, đ→d, chỉ giữ a-z0-9)
//   khớp với từ mà bức vẽ miêu tả. Đoán đúng: người đoán +10, người
//   vẽ bức đó +5 (chế độ nhiều người). Chơi đơn/đua: chủ sổ +10 mỗi
//   lần từ trong sổ của mình được đoán đúng (điểm theo sổ, không
//   theo người đoán — vì ở 2 chế độ này máy mới là người đoán).
// - Từ trong sổ chỉ đổi khi có đoán SAI mà có chữ: từ mới = từ vừa
//   đoán. Đoán sai mà trống chữ (hết giờ / xin thua) thì từ giữ
//   nguyên — chuỗi không chết vì 1 lượt trống.
// - Thắng ván (nhiều người): nhiều điểm nhất → nhiều đoán đúng nhất
//   → hoà (winner null, endReason 'draw').
// - Chơi đơn: thắng khi máy đoán đúng ≥3/5 lần (từ được giữ ≥3 lần).
//   ⚠️ LƯU Ý HIỆU CHUẨN: người chơi thắng khi MÁY đoán đúng, nên
//   máy càng giỏi thì chơi đơn càng DỄ: máy Dễ (đoán đúng ~35%) thì
//   thắng ~24%, máy Khó (~65%) thì thắng ~76% (xác suất nhị thức
//   Bin(5, acc) ≥ 3). Đây là bản chất của luật "vẽ cho máy đoán" —
//   độ khó ở đây là độ giỏi của máy đoán, không phải độ khó cho
//   người vẽ. Ngưỡng ≥3/5 giữ nguyên vì cả 2 mức đều chơi được
//   (không gần như không thể, cũng không tầm thường).
// - Đấu máy (đua): so số lần từ được giữ trong sổ của mỗi bên
//   (wordsKept); nhiều hơn thì thắng; hoà thì so điểm rồi mới hoà.
// - Xin thua (luật nhà): người xin thua bị LOẠI khỏi chuỗi — lượt
//   hiện tại và mọi lượt sau của họ được engine tự nộp trắng (vẽ
//   trống / đoán trống), sổ vẫn xoay bình thường để không vỡ vòng
//   chuyền. Còn đúng 1 người chưa thua thì người đó thắng ngay
//   (endReason 'resign'). Chơi đơn xin thua = thua ngay.
// - Hết giờ 120s mỗi lượt (đồng hồ ở giao diện): nộp trắng như trên.
// - LCG trong state giữ cho mọi lần rút số (chia từ, sổ của máy,
//   phác thảo máy) giống hệt nhau ở mọi máy cùng áp 1 hành động —
//   dùng Math.random() thì 2 máy lệch nhau. Bot bên ngoài (bot.js)
//   vẫn dùng Math.random như các game khác (test gieo hạt lại).
// - Bot đọc từ của bức vẽ từ state gốc CHỈ để giả lập độ chính xác
//   khi đoán (giống bot Ai Là Triệu Phú / Đoán Hành Động) — ngoài
//   đời thật bot "nhìn" bức vẽ rồi đoán; ở đây bot không xem được
//   nét vẽ nên mô phỏng bằng xác suất. Bot KHÔNG đọc đoán của người
//   khác, không xem sổ người khác cầm.
import { WORDS, BOT_NAMES, PALETTE, BRUSH_SIZES } from './words.js?v=1';

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 8;
export const SOLO_STEPS = 10; /* chơi đơn/đua: 5 lần vẽ + 5 lần đoán */
export const SOLO_WIN_CORRECT = 3; /* chơi đơn: giữ được từ ≥3/5 lần thì thắng */
export const STEP_TIME = 120; /* giây mỗi lượt vẽ/đoán (đồng hồ ở giao diện) */
export const GUESS_POINTS = 10;
export const DRAW_POINTS = 5;
export const CANVAS_W = 640;
export const CANVAS_H = 400;

/* chuẩn hoá đáp án: thường hoá dấu, đ→d, chỉ giữ a-z0-9, gộp khoảng trắng */
export function normalizeGuess(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim();
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
/* LCG lưu trong state — mọi lần rút số trong engine đều qua đây */
function nextRand(s) {
  s.seed = (s.seed * 1103515245 + 12345) % 2147483648;
  return s.seed / 2147483648;
}

const pOf = (s, id) => s.players.find(p => p.id === id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };
function cleanName(n) { return String(n == null ? '' : n).trim().slice(0, 24); }

/* tra nhóm của 1 từ trong ngân hàng (để máy đoán sai cùng nhóm) */
export function catOf(word) {
  const w = WORDS.find(x => normalizeGuess(x.word) === normalizeGuess(word));
  return w ? w.cat : null;
}
/* 1 từ sai cùng nhóm với từ đúng (không bao giờ trùng từ đúng) */
export function wrongWord(s, word) {
  const cat = catOf(word);
  const pool = WORDS.filter(x => normalizeGuess(x.word) !== normalizeGuess(word) && (!cat || x.cat === cat));
  const use = pool.length ? pool : WORDS.filter(x => normalizeGuess(x.word) !== normalizeGuess(word));
  return use[Math.floor(nextRand(s) * use.length)].word;
}
/* phác thảo máy: vài nét nguệch ngoạc ngẫu nhiên (LCG — đồng bộ 2 máy) */
export function genScribble(s) {
  const n = 3 + Math.floor(nextRand(s) * 3); /* 3–5 nét */
  const out = [];
  for (let i = 0; i < n; i++) {
    let x = 60 + nextRand(s) * (CANVAS_W - 120);
    let y = 60 + nextRand(s) * (CANVAS_H - 120);
    const pts = [[Math.round(x), Math.round(y)]];
    const m = 4 + Math.floor(nextRand(s) * 7);
    for (let j = 0; j < m; j++) {
      x += (nextRand(s) - 0.5) * 160;
      y += (nextRand(s) - 0.5) * 120;
      x = Math.max(8, Math.min(CANVAS_W - 8, x));
      y = Math.max(8, Math.min(CANVAS_H - 8, y));
      pts.push([Math.round(x), Math.round(y)]);
    }
    out.push({ color: PALETTE[Math.floor(nextRand(s) * PALETTE.length)], width: BRUSH_SIZES[Math.floor(nextRand(s) * BRUSH_SIZES.length)], pts });
  }
  return out;
}

/* làm sạch nét vẽ gửi lên: chặn nét quá dài / toạ độ ngoài khung */
export function sanitizeStrokes(strokes) {
  if (!Array.isArray(strokes)) return [];
  const out = [];
  for (const st of strokes.slice(0, 60)) {
    if (!st || !Array.isArray(st.pts) || !st.pts.length) continue;
    const color = PALETTE.includes(st.color) ? st.color : '#1B1425';
    const width = BRUSH_SIZES.includes(st.width) ? st.width : 8;
    const pts = [];
    for (const p of st.pts.slice(0, 600)) {
      if (!Array.isArray(p) || p.length < 2) continue;
      const x = Math.max(0, Math.min(CANVAS_W, Math.round(+p[0] || 0)));
      const y = Math.max(0, Math.min(CANVAS_H, Math.round(+p[1] || 0)));
      if (!pts.length || pts[pts.length - 1][0] !== x || pts[pts.length - 1][1] !== y) pts.push([x, y]);
    }
    if (pts.length) out.push({ color, width, pts });
  }
  return out;
}

export function stepKind(step) { return step % 2 === 0 ? 'draw' : 'guess'; }

/* id của máy: chơi đơn do engine tự thêm ('bot1'); đấu máy là người
   chơi thứ 2 mà phòng chờ thêm (id do lobby gán, KHÔNG hardcode) */
export function botId(s) {
  if (s.mode === 'solo') return 'bot1';
  if (s.mode === 'race') return s.players[1] ? s.players[1].id : 'bot1';
  return null;
}

/* ai cầm sổ b ở bước k */
export function holderOf(s, bookIdx, step) {
  if (s.mode === 'solo' || s.mode === 'race') {
    if (bookIdx === 0) return step % 2 === 0 ? s.players[0].id : botId(s);
    return botId(s); /* sổ của máy (đua): máy tự chơi trong engine */
  }
  const n = s.players.length;
  return s.players[(bookIdx + step) % n].id;
}
/* sổ mà người chơi pid đang cầm ở bước hiện tại (null nếu không cầm sổ nào / đã nộp) */
export function heldBook(s, pid) {
  if (s.phase !== 'playing') return -1;
  for (let b = 0; b < s.books.length; b++) {
    if (holderOf(s, b, s.step) !== pid) continue;
    if (s.books[b].entries.length <= s.step + 1) return b;
  }
  return -1;
}

export function createGame(players, opts = {}) {
  if (!players || !players.length || players.length > MAX_PLAYERS) throw new Error('Vẽ Truyền Tin chơi 1–8 người (chơi đơn = 1, đấu máy = 2, nhiều người = 4–8).');
  const mode = opts.vtMode === 'solo' ? 'solo' : opts.vtMode === 'race' ? 'race' : 'multi';
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  const botLevel = opts.botLevel === 'hard' ? 'hard' : 'easy';
  let all = players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null }));
  /* chơi đơn: engine tự thêm 1 máy làm người đoán (giống The Resistance tự thêm máy) */
  if (mode === 'solo' && all.length === 1) {
    all.push({ id: 'bot1', name: BOT_NAMES[0], isBot: true, local: false, level: botLevel });
  }
  if (mode === 'multi' && (all.length < MIN_PLAYERS || all.length > MAX_PLAYERS)) throw new Error('Vẽ Truyền Tin nhiều người cần 4–8 người.');
  if (mode === 'race' && all.length !== 2) throw new Error('Đấu máy Vẽ Truyền Tin cần đúng 2 người (bạn + 1 máy).');
  if (mode === 'solo' && all.length !== 2) throw new Error('Chơi đơn Vẽ Truyền Tin cần 1 người (engine tự thêm máy).');
  const nBooks = mode === 'multi' ? all.length : mode === 'race' ? 2 : 1;
  const totalSteps = mode === 'multi' ? all.length : SOLO_STEPS;
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    seed, phase: 'playing', /* 'playing' | 'ended' */
    mode, solo: mode === 'solo', race: mode === 'race',
    botLevel,
    players: all,
    books: [],
    step: 0, totalSteps,
    winner: null, winnerIds: [], losers: [], endReason: null,
    startedAt: Date.now(), endedAt: null,
    log: [],
  };
  /* chia từ gốc cho mỗi sổ, không trùng trong 1 ván (LCG) */
  const idx = WORDS.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand(s) * (i + 1));
    const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
  }
  for (let b = 0; b < nBooks; b++) {
    const w = WORDS[idx[b]];
    /* chủ sổ: nhiều người = người b; chơi đơn/đua: sổ 0 của người, sổ 1 của máy */
    const owner = mode === 'multi' ? all[b].id : (b === 0 ? all[0].id : all[1].id);
    s.books.push({
      owner, curWord: w.word, curCat: w.cat, correctRun: 0,
      entries: [{ type: 'word', word: w.word, cat: w.cat }],
    });
  }
  s.prog = {};
  for (const p of s.players) s.prog[p.id] = {
    points: 0, correctGuesses: 0, totalGuesses: 0, drawingsMade: 0,
    bestChain: 0, wordsKept: 0, resigned: false,
  };
  pushLog(s, mode === 'solo'
    ? `🎨 Vẽ Truyền Tin — chơi đơn: bạn vẽ, máy ${botLevel === 'hard' ? 'Khó' : 'Dễ'} đoán. Giữ được từ ≥${SOLO_WIN_CORRECT}/5 lần thì thắng!`
    : mode === 'race'
      ? `🎨 Vẽ Truyền Tin — đấu máy: mỗi bên 1 sổ, 10 bước. Sổ nào giữ được từ nhiều lần hơn thì thắng!`
      : `🎨 Vẽ Truyền Tin — ${all.length} người, ${all.length} quyển sổ! Vẽ từ mình thấy, chuyền sổ sang trái, đoán bức vẽ người khác.`);
  return s;
}

export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || !s.players.length || s.players.length > MAX_PLAYERS
    || !Array.isArray(s.books) || !s.books.length
    || !['solo', 'race', 'multi'].includes(s.mode)
    || typeof s.phase !== 'string' || !s.prog
    || typeof s.step !== 'number' || s.step < 0 || typeof s.totalSteps !== 'number' || s.totalSteps < 1) {
    throw new Error('Trạng thái Vẽ Truyền Tin không hợp lệ.');
  }
  for (const b of s.books) {
    if (!Array.isArray(b.entries) || !b.entries.length || b.entries[0].type !== 'word') throw new Error('Trạng thái Vẽ Truyền Tin không hợp lệ.');
  }
  return s;
}

/* ai đang phải hành động (máy trong sổ đua không tính — engine tự lo) */
export function actors(s) {
  if (s.phase !== 'playing') return [];
  const out = [];
  for (let b = 0; b < s.books.length; b++) {
    if (s.books[b].entries.length > s.step + 1) continue; /* sổ này đã nộp bước này */
    const h = holderOf(s, b, s.step);
    if (s.mode === 'race' && b === 1) continue; /* sổ của máy: engine tự chơi */
    const pr = s.prog[h];
    if (!pr || pr.resigned) continue;
    if (!out.includes(h)) out.push(h);
  }
  return out;
}

/* nộp trắng cho người đã xin thua (vẽ trống / đoán trống) */
function blankEntry(s, book, holder) {
  if (stepKind(s.step) === 'draw') {
    return { type: 'drawing', word: book.curWord, cat: book.curCat, strokes: [], by: holder, blank: true };
  }
  const prev = book.entries[book.entries.length - 1];
  return { type: 'guess', text: '', by: holder, correct: false, target: prev && prev.type === 'drawing' ? prev.word : book.curWord };
}
/* điền entry trắng cho mọi sổ mà người cầm đã xin thua (để bước không kẹt) */
function fillResigned(s) {
  for (let b = 0; b < s.books.length; b++) {
    const book = s.books[b];
    if (book.entries.length > s.step + 1) continue;
    const h = holderOf(s, b, s.step);
    if (s.mode === 'race' && b === 1) continue;
    const pr = s.prog[h];
    if (pr && pr.resigned) book.entries.push(blankEntry(s, book, h));
  }
}

/* chấm điểm các entry mới của bước vừa xong + cập nhật từ hiện tại của sổ */
function finalizeStep(s) {
  for (const book of s.books) {
    const e = book.entries[book.entries.length - 1];
    if (!e || e.type === 'word') continue;
    const owner = book.owner;
    const op = s.prog[owner];
    if (e.type === 'drawing') {
      const dp = s.prog[e.by];
      if (dp) dp.drawingsMade++;
      continue;
    }
    /* đoán: chấm đúng/sai, cộng điểm, cập nhật chuỗi giữ từ */
    const prev = book.entries[book.entries.length - 2];
    const target = prev && prev.type === 'drawing' ? prev.word : book.curWord;
    const correct = normalizeGuess(e.text) === normalizeGuess(target);
    e.correct = correct;
    e.target = target;
    const gp = s.prog[e.by];
    if (gp) { gp.totalGuesses++; if (correct) gp.correctGuesses++; }
    if (correct) {
      if (s.mode === 'multi') {
        if (gp) gp.points += GUESS_POINTS;
        const dp = prev && s.prog[prev.by];
        if (dp) dp.points += DRAW_POINTS;
      } else if (op) {
        op.points += GUESS_POINTS; /* chơi đơn/đua: điểm theo sổ */
      }
      book.correctRun++;
      if (op) {
        op.wordsKept++;
        if (book.correctRun > op.bestChain) op.bestChain = book.correctRun;
      }
    } else {
      book.correctRun = 0;
      if (e.text && normalizeGuess(e.text)) {
        book.curWord = e.text.trim();
        book.curCat = catOf(e.text);
      }
    }
  }
}

/* sổ của máy (đua): engine tự chơi bước này bằng LCG (đồng bộ 2 máy) */
function resolveBotBook(s) {
  if (s.mode !== 'race') return;
  const book = s.books[1];
  const bid = botId(s);
  if (book.entries.length > s.step + 1) return;
  if (stepKind(s.step) === 'draw') {
    book.entries.push({ type: 'drawing', word: book.curWord, cat: book.curCat, strokes: genScribble(s), by: bid, simulated: true });
  } else {
    const acc = s.botLevel === 'hard' ? 0.65 : 0.35;
    const correct = nextRand(s) < acc;
    const text = correct ? book.curWord : wrongWord(s, book.curWord);
    const prev = book.entries[book.entries.length - 1];
    book.entries.push({ type: 'guess', text, by: bid, correct, target: prev && prev.type === 'drawing' ? prev.word : book.curWord });
  }
}

/* bước đã đủ entry cho mọi sổ chưa → chấm điểm, sang bước sau hoặc kết thúc */
function maybeAdvance(s) {
  /* sổ của máy (đua) do engine tự chơi trước khi kiểm tra — không thì bước không bao giờ đủ entry */
  if (s.mode === 'race') resolveBotBook(s);
  for (const book of s.books) {
    if (book.entries.length <= s.step + 1) return; /* còn sổ chưa nộp */
  }
  finalizeStep(s);
  s.seq++;
  if (s.step + 1 >= s.totalSteps) { endGameNatural(s); return; }
  s.step++;
  fillResigned(s);
  maybeAdvance(s); /* bước mới có thể đã đủ entry vì toàn người xin thua */
}

function finishSummary(s) {
  const out = {};
  for (const p of s.players) {
    const pr = s.prog[p.id];
    out[p.id] = {
      points: pr.points, correctGuesses: pr.correctGuesses, totalGuesses: pr.totalGuesses,
      drawingsMade: pr.drawingsMade, bestChain: pr.bestChain, wordsKept: pr.wordsKept,
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
  s.endReason = reason;
  s.final = { summary: finishSummary(s) };
  if (reason === 'draw') pushLog(s, '🤝 Hoà! Không ai hơn ai — chuỗi nào cũng "tam sao thất bản" như nhau.', '');
  else if (reason === 'resign') pushLog(s, `🏳️ Có người xin thua — ${winner ? cleanName(pOf(s, winner).name) + ' thắng ván!' : 'ván kết thúc.'}`, '');
  else if (winner) pushLog(s, `🏆 ${cleanName(pOf(s, winner).name)} thắng ván!`, 'good');
  else pushLog(s, '😢 Hết lượt — không ai thắng ván này.', 'bad');
}

/* kết thúc tự nhiên khi hết bước: ai thắng? */
function endGameNatural(s) {
  if (s.mode === 'solo') {
    const me = s.players[0].id;
    const kept = s.prog[me].wordsKept;
    if (kept >= SOLO_WIN_CORRECT) endGame(s, me, s.players.filter(p => p.id !== me).map(p => p.id), 'win');
    else endGame(s, null, [me], 'lose');
    return;
  }
  if (s.mode === 'race') {
    const me = s.players[0].id;
    const bid = botId(s);
    const a = s.prog[me], b = s.prog[bid];
    const ka = a ? a.wordsKept : 0, kb = b ? b.wordsKept : 0;
    if (ka !== kb) {
      const w = ka > kb ? me : bid;
      endGame(s, w, [w === me ? bid : me], 'win');
    } else if ((a ? a.points : 0) !== (b ? b.points : 0)) {
      const w = (a.points > b.points) ? me : bid;
      endGame(s, w, [w === me ? bid : me], 'win');
    } else {
      endGame(s, null, [], 'draw');
    }
    return;
  }
  /* nhiều người: nhiều điểm nhất → nhiều đoán đúng nhất → hoà */
  let best = null;
  for (const p of s.players) {
    const pr = s.prog[p.id];
    if (pr.resigned) continue;
    if (!best) { best = p.id; continue; }
    const bp = s.prog[best];
    if (pr.points > bp.points || (pr.points === bp.points && pr.correctGuesses > bp.correctGuesses)) best = p.id;
  }
  const bp = best ? s.prog[best] : null;
  const tied = s.players.filter(p => !s.prog[p.id].resigned && s.prog[p.id].points === bp.points && s.prog[p.id].correctGuesses === bp.correctGuesses);
  if (tied.length > 1) endGame(s, null, [], 'draw');
  else endGame(s, best, s.players.filter(p => p.id !== best).map(p => p.id), 'win');
}

/* nộp 1 bức vẽ cho sổ đang cầm */
export function applyDraw(s, pid, strokes) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (stepKind(s.step) !== 'draw') return { ok: false, reason: 'Lượt này phải đoán, không phải vẽ.' };
  const b = heldBook(s, pid);
  if (b < 0) return { ok: false, reason: 'Không tới lượt bạn vẽ.' };
  const book = s.books[b];
  const clean = sanitizeStrokes(strokes);
  book.entries.push({ type: 'drawing', word: book.curWord, cat: book.curCat, strokes: clean, by: pid });
  s.seq++;
  pushLog(s, `✏️ ${cleanName(pOf(s, pid).name)} đã vẽ xong (${clean.length} nét) — chuyền sổ đi!`);
  maybeAdvance(s);
  return { ok: true };
}

/* nộp 1 đáp án đoán cho bức vẽ đang cầm */
export function applyGuess(s, pid, text) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (stepKind(s.step) !== 'guess') return { ok: false, reason: 'Lượt này phải vẽ, không phải đoán.' };
  const b = heldBook(s, pid);
  if (b < 0) return { ok: false, reason: 'Không tới lượt bạn đoán.' };
  const book = s.books[b];
  const t = String(text == null ? '' : text).trim().slice(0, 60);
  const prev = book.entries[book.entries.length - 1];
  const target = prev && prev.type === 'drawing' ? prev.word : book.curWord;
  const correct = normalizeGuess(t) === normalizeGuess(target);
  book.entries.push({ type: 'guess', text: t, by: pid, correct, target });
  s.seq++;
  pushLog(s, correct
    ? `✅ ${cleanName(pOf(s, pid).name)} đoán đúng "${t}"!`
    : `❓ ${cleanName(pOf(s, pid).name)} đoán "${t || '(trống)'}" — ${correct ? '' : 'chưa đúng, từ đổi thành "' + (t || book.curWord) + '"!'}`);
  maybeAdvance(s);
  return { ok: true, correct };
}

/* hết giờ: nộp trắng lượt hiện tại */
export function applyTimeout(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const b = heldBook(s, pid);
  if (b < 0) return { ok: false, reason: 'Không tới lượt bạn.' };
  const book = s.books[b];
  book.entries.push(blankEntry(s, book, pid));
  s.seq++;
  pushLog(s, `⏰ ${cleanName(pOf(s, pid).name)} hết giờ — nộp trắng lượt này.`, 'bad');
  maybeAdvance(s);
  return { ok: true };
}

/* xin thua = bị loại khỏi chuỗi (lượt hiện tại + sau này tự nộp trắng);
   còn đúng 1 người chưa thua thì người đó thắng ngay */
export function applyResign(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Người chơi không tồn tại.' };
  if (pr.resigned) return { ok: false, reason: 'Bạn đã xin thua rồi.' };
  pr.resigned = true;
  s.seq++;
  pushLog(s, `🏳️ ${cleanName(pOf(s, pid).name)} xin thua — bị loại khỏi chuỗi, các lượt sau tự nộp trắng.`, 'bad');
  if (s.mode === 'solo') {
    endGame(s, null, [pid], 'resign');
    return { ok: true, ended: true };
  }
  const alive = s.players.filter(p => !s.prog[p.id].resigned);
  if (alive.length <= 1) {
    const w = alive[0] ? alive[0].id : null;
    endGame(s, w, s.players.filter(p => p.id !== w).map(p => p.id), 'resign');
    return { ok: true, ended: true };
  }
  fillResigned(s);
  maybeAdvance(s);
  return { ok: true };
}

/* Adapter cho phòng online (simplenet): action { type, strokes?, text? } */
export function applyAction(s, pid, a, ctx) {
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'draw': return applyDraw(s, pid, a.strokes);
    case 'guess': return applyGuess(s, pid, a.text);
    case 'timeout': return applyTimeout(s, pid);
    case 'resign': return applyResign(s, pid);
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}

/* viewFor: mỗi người CHỈ thấy entry cuối của sổ mình đang cầm — không
   thấy sổ khác, không thấy cả chuỗi trước khi lật sổ (phase ended). */
export function viewFor(s, pid) {
  const me = s.prog[pid] || {};
  const myIdx = s.players.findIndex(p => p.id === pid);
  const b = heldBook(s, pid);
  let held = null;
  if (b >= 0) {
    const book = s.books[b];
    const last = book.entries[book.entries.length - 1];
    if (stepKind(s.step) === 'draw') {
      held = { book: book.owner, kind: 'draw', word: book.curWord, cat: book.curCat };
    } else if (last && last.type === 'drawing') {
      /* lượt đoán: CHỈ đưa nét vẽ cho người đoán — KHÔNG đưa từ mà bức
         vẽ miêu tả (nó nằm trong entry drawing, lộ ra là người đoán
         đọc được đáp án trong view) */
      held = { book: book.owner, kind: 'guess', drawing: { strokes: JSON.parse(JSON.stringify(last.strokes || [])), by: last.by, blank: !!last.blank } };
    }
  }
  /* đoán cuối của máy ở sổ của mình (chơi đơn/đua) — hiện .vt-bot-guess */
  let lastBotGuess = null;
  if ((s.mode === 'solo' || s.mode === 'race')) {
    const book0 = s.books[0];
    const bid = botId(s);
    for (let i = book0.entries.length - 1; i >= 0; i--) {
      const e = book0.entries[i];
      if (e.type === 'guess' && e.by === bid) { lastBotGuess = { text: e.text, correct: !!e.correct }; break; }
    }
  }
  const books = s.phase === 'ended'
    ? s.books.map(bk => ({
      owner: bk.owner,
      entries: JSON.parse(JSON.stringify(bk.entries)),
    }))
    : null;
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    startedAt: s.startedAt, endedAt: s.endedAt,
    winner: s.winner, winnerIds: (s.winnerIds || []).slice(), losers: (s.losers || []).slice(), endReason: s.endReason,
    final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    mode: s.mode, solo: s.solo, race: s.race,
    step: s.step, totalSteps: s.totalSteps, stepKind: stepKind(s.step),
    held, lastBotGuess,
    chainCorrect: (s.prog[pid] || {}).wordsKept || 0,
    chainTotal: s.books[0] ? s.books[0].entries.filter(e => e.type === 'guess').length : 0,
    books,
    players: s.players.map(p => {
      const q = s.prog[p.id] || {};
      const hb = heldBook(s, p.id);
      return {
        id: p.id, name: p.name, isBot: !!p.isBot, level: p.level || null,
        points: q.points || 0, correctGuesses: q.correctGuesses || 0,
        resigned: !!q.resigned,
        submitted: hb < 0,
      };
    }),
    log: s.log.slice(-20),
    me: pid,
  };
}

export default { createGame, applyAction, viewFor, actors, serialize, deserialize, mulberry32, normalizeGuess, holderOf, heldBook, stepKind, botId };
