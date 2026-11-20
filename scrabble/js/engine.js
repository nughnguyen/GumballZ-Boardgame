// 🔤 Scrabble — luật chơi (thuần logic, không chạm DOM).
// Bàn 15×15, từ điển tiếng Việt không dấu (js/words.js: danh sách Wordle
// + từ ngắn tự biên + kho từ Nối từ nạp thêm lúc chạy, tổng ~45.000 từ).
// Túi 100 chữ theo phân phối chuẩn, điểm chữ chuẩn.
// Ô thưởng chuẩn 15×15: TW 8, DW 17 (gồm ô trung tâm), TL 12, DL 24.
// Nước đầu phải phủ ô trung tâm (7,7). Từ đặt phải hợp lệ trong từ điển
// VÀ mọi từ phụ (vuông góc) cũng phải hợp lệ; từ phải nối với chữ đã có
// (trừ nước đầu). Dùng hết 7 chữ trên khay = +50 (bingo). Đổi chữ cần
// túi còn ≥ 7 chữ. Hết túi + 1 người hết khay thì kết thúc: mỗi người trừ
// điểm chữ còn lại trên khay, người hết khay được cộng tổng điểm trừ đó.
// Bỏ lượt / đổi chữ liên tiếp đủ 2 vòng (không ai ghi điểm) cũng kết thúc
// (mỗi người trừ điểm khay, không cộng thưởng). Xin thua dừng ván ngay.
// Engine xác định hoàn toàn theo seed (LCG lưu trong state, như Rummikub)
// — không dùng Math.random. viewFor giấu seed, thứ tự túi và khay của
// người khác; không có trường `you`.
// summary cuối trận (theo người chơi): score, wordsPlayed, bingoCount,
// tilesLeft, turns. Điểm nằm ở final.scores + p.score.
import { DICT, WORDS_BY_LEN, DICT_VERSION } from './words.js?v=1';

export const SIZE = 15;
export const CENTER = 7;
export const RACK_SIZE = 7;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const BINGO_BONUS = 50;
/* từ dài nhất bot liệt kê (khay chỉ 7 chữ nên từ dài hơn chủ yếu dùng
   chữ sẵn trên bàn — giới hạn 8 để bot đủ nhanh) */
export const BOT_MAX_LEN = 8;

/* ---------- chữ + điểm ---------- */
export const TILE_VALUE = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1,
  M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
};
export const TILE_DIST = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4,
  M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1, '*': 2,
};
export function buildBag() {
  const bag = [];
  for (const [ch, n] of Object.entries(TILE_DIST)) for (let i = 0; i < n; i++) bag.push(ch);
  return bag; /* 100 chữ */
}

/* ---------- ô thưởng chuẩn ---------- */
const TW = [[0, 0], [0, 7], [0, 14], [7, 0], [7, 14], [14, 0], [14, 7], [14, 14]];
const DW = [[1, 1], [2, 2], [3, 3], [4, 4], [7, 7], [10, 10], [11, 11], [12, 12], [13, 13],
  [1, 13], [2, 12], [3, 11], [4, 10], [10, 4], [11, 3], [12, 2], [13, 1]];
const TL = [[1, 5], [1, 9], [5, 1], [5, 5], [5, 9], [5, 13], [9, 1], [9, 5], [9, 9], [9, 13], [13, 5], [13, 9]];
const DL = [[0, 3], [0, 11], [2, 6], [2, 8], [3, 0], [3, 7], [3, 14], [6, 2], [6, 6], [6, 8], [6, 12],
  [7, 3], [7, 11], [8, 2], [8, 6], [8, 8], [8, 12], [11, 0], [11, 7], [11, 14], [12, 6], [12, 8], [14, 3], [14, 11]];
export const PREMIUM = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
for (const [r, c] of TW) PREMIUM[r][c] = 'TW';
for (const [r, c] of DW) PREMIUM[r][c] = 'DW';
for (const [r, c] of TL) PREMIUM[r][c] = 'TL';
for (const [r, c] of DL) PREMIUM[r][c] = 'DL';
export const PREMIUM_COUNTS = {
  TW: TW.length, DW: DW.length, TL: TL.length, DL: DL.length,
};

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* LCG lưu trong state: mọi lần xào/rút đều qua đây (như Rummikub) */
function nextRand(s) {
  s.seed = (s.seed * 1103515245 + 12345) % 2147483648;
  return s.seed / 2147483648;
}
function shuffleWith(s, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const inBoard = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
const idx = (r, c) => r * SIZE + c;
const pOf = (s, id) => s.players.find(p => p.id === id);
const cellValue = cell => (cell.blank ? 0 : (typeof cell.value === 'number' ? cell.value : TILE_VALUE[cell.ch]));
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < MIN_PLAYERS || s.players.length > MAX_PLAYERS
    || !Array.isArray(s.board) || s.board.length !== SIZE * SIZE || !Array.isArray(s.bag)
    || typeof s.phase !== 'string' || typeof s.turnIdx !== 'number') {
    throw new Error('Trạng thái Scrabble không hợp lệ.');
  }
  return s;
}
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };
const rackValue = rack => (rack || []).reduce((a, ch) => a + (ch === '*' ? 0 : TILE_VALUE[ch]), 0);

/* ---------- kiểm tra + tính điểm 1 nước đặt ---------- */
/* board: mảng 225 ô (null | {ch, blank, value?}); rack: mảng chữ ('*' = ô trống).
   blanksOpt: mảng vị trí trong từ dùng ô trống (null = engine tự chọn:
   ưu tiên chữ thật, còn thiếu mới dùng ô trống).
   Trả {ok, reason, score, used, blanks, newCount, bingo, crosses}.
   used[i] = {board:true, ch} | {board:false, rackIdx, ch, blank}. */
export function tryPlacement(board, rack, dir, r, c, word, firstMove, blanksOpt = null) {
  if (typeof word !== 'string') return { ok: false, reason: 'Từ không hợp lệ.' };
  word = word.toUpperCase();
  if (word.length < 2) return { ok: false, reason: 'Từ phải dài ít nhất 2 chữ.' };
  if (!DICT.has(word)) return { ok: false, reason: `Từ "${word}" không có trong từ điển.` };
  const L = word.length;
  const dr = dir === 'V' ? 1 : 0, dc = dir === 'H' ? 1 : 0;
  const endR = r + dr * (L - 1), endC = c + dc * (L - 1);
  if (r < 0 || c < 0 || endR >= SIZE || endC >= SIZE) return { ok: false, reason: 'Từ lòi ra ngoài bàn.' };
  /* ô ngay trước / sau từ (cùng hướng) phải trống, không thì từ còn dài hơn */
  const br = r - dr, bc = c - dc, ar = endR + dr, ac = endC + dc;
  if (inBoard(br, bc) && board[idx(br, bc)]) return { ok: false, reason: 'Từ dính liền với chữ có sẵn — phải đặt thành 1 từ dài hơn.' };
  if (inBoard(ar, ac) && board[idx(ar, ac)]) return { ok: false, reason: 'Từ dính liền với chữ có sẵn — phải đặt thành 1 từ dài hơn.' };
  /* gom các vị trí: chữ có sẵn trên bàn / chữ mới cần lấy từ khay */
  const used = new Array(L).fill(null);
  const need = [];
  let newCount = 0;
  for (let i = 0; i < L; i++) {
    const rr = r + dr * i, cc = c + dc * i;
    const cell = board[idx(rr, cc)];
    if (cell) {
      if (cell.ch !== word[i]) return { ok: false, reason: `Ô hàng ${rr + 1} cột ${cc + 1} đã có chữ ${cell.ch}, không khớp ${word[i]}.` };
      used[i] = { board: true, ch: word[i] };
    } else {
      need.push({ i, rr, cc, ch: word[i] });
      newCount++;
    }
  }
  if (newCount === 0) return { ok: false, reason: 'Phải đặt ít nhất 1 chữ mới.' };
  /* gán chữ từ khay: chữ thật trước, ô trống sau (hoặc theo blanksOpt) */
  const avail = rack.map((ch, i) => ({ ch, i, used: false }));
  const blanks = [];
  if (blanksOpt) {
    const blankSet = new Set(blanksOpt);
    for (const n of need) {
      if (blankSet.has(n.i)) {
        const b = avail.find(t => !t.used && t.ch === '*');
        if (!b) return { ok: false, reason: 'Khay không còn ô trống để dùng.' };
        b.used = true;
        used[n.i] = { board: false, rackIdx: b.i, ch: n.ch, blank: true };
        blanks.push(n.i);
      }
    }
    for (const n of need) {
      if (used[n.i]) continue;
      const ex = avail.find(t => !t.used && t.ch === n.ch);
      if (!ex) return { ok: false, reason: `Khay không có chữ ${n.ch}.` };
      ex.used = true;
      used[n.i] = { board: false, rackIdx: ex.i, ch: n.ch, blank: false };
    }
  } else {
    for (const n of need) {
      const ex = avail.find(t => !t.used && t.ch === n.ch);
      if (ex) { ex.used = true; used[n.i] = { board: false, rackIdx: ex.i, ch: n.ch, blank: false }; }
    }
    for (const n of need) {
      if (used[n.i]) continue;
      const b = avail.find(t => !t.used && t.ch === '*');
      if (!b) return { ok: false, reason: `Khay không có chữ ${n.ch}.` };
      b.used = true;
      used[n.i] = { board: false, rackIdx: b.i, ch: n.ch, blank: true };
      blanks.push(n.i);
    }
  }
  /* nối bàn: nước đầu phủ trung tâm; nước sau phải chạm chữ có sẵn */
  if (firstMove) {
    let covers = false;
    for (let i = 0; i < L; i++) if (r + dr * i === CENTER && c + dc * i === CENTER) covers = true;
    if (!covers) return { ok: false, reason: 'Nước đầu tiên phải phủ ô trung tâm ★.' };
  } else {
    let touches = false;
    for (let i = 0; i < L; i++) {
      if (used[i].board) { touches = true; break; }
      const rr = r + dr * i, cc = c + dc * i;
      for (const [adr, adc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nr = rr + adr, nc = cc + adc;
        if (inBoard(nr, nc) && board[idx(nr, nc)]) { touches = true; break; }
      }
      if (touches) break;
    }
    if (!touches) return { ok: false, reason: 'Từ phải nối với chữ đã có trên bàn.' };
  }
  /* từ phụ (vuông góc) ở mỗi chữ mới — phải có trong từ điển */
  const pdr = dir === 'H' ? 1 : 0, pdc = dir === 'H' ? 0 : 1;
  const crosses = [];
  for (const n of need) {
    let sr = n.rr, sc = n.cc;
    while (inBoard(sr - pdr, sc - pdc) && board[idx(sr - pdr, sc - pdc)]) { sr -= pdr; sc -= pdc; }
    let er = n.rr, ec = n.cc;
    while (inBoard(er + pdr, ec + pdc) && board[idx(er + pdr, ec + pdc)]) { er += pdr; ec += pdc; }
    const len = Math.abs(er - sr) + Math.abs(ec - sc) + 1;
    if (len < 2) continue;
    let w = '';
    for (let k = 0; k < len; k++) {
      const rr = sr + pdr * k, cc = sc + pdc * k;
      w += (rr === n.rr && cc === n.cc) ? n.ch : board[idx(rr, cc)].ch;
    }
    if (!DICT.has(w)) return { ok: false, reason: `Từ phụ "${w}" không có trong từ điển.` };
    crosses.push({ word: w, r: sr, c: sc, dir: dir === 'H' ? 'V' : 'H', at: n });
  }
  /* tính điểm: từ chính (nhân chữ trước, nhân từ sau) + từ phụ */
  let wordMult = 1, mainSum = 0;
  for (let i = 0; i < L; i++) {
    const rr = r + dr * i, cc = c + dc * i;
    const u = used[i];
    let lv;
    if (u.board) lv = cellValue(board[idx(rr, cc)]);
    else if (u.blank) lv = 0;
    else lv = TILE_VALUE[u.ch];
    if (!u.board) {
      const prem = PREMIUM[rr][cc];
      if (prem === 'DL') lv *= 2;
      else if (prem === 'TL') lv *= 3;
      if (prem === 'DW') wordMult *= 2;
      else if (prem === 'TW') wordMult *= 3;
    }
    mainSum += lv;
  }
  let score = mainSum * wordMult;
  for (const cr of crosses) {
    const n = cr.at;
    const u = used[n.i];
    const prem = PREMIUM[n.rr][n.cc];
    let csum = 0, cmult = 1;
    const cdr = cr.dir === 'V' ? 1 : 0, cdc = cr.dir === 'H' ? 1 : 0;
    for (let k = 0; k < cr.word.length; k++) {
      const rr = cr.r + cdr * k, cc = cr.c + cdc * k;
      if (rr === n.rr && cc === n.cc) {
        let lv = u.blank ? 0 : TILE_VALUE[n.ch];
        if (prem === 'DL') lv *= 2;
        else if (prem === 'TL') lv *= 3;
        csum += lv;
      } else {
        csum += cellValue(board[idx(rr, cc)]);
      }
    }
    if (prem === 'DW') cmult = 2;
    else if (prem === 'TW') cmult = 3;
    score += csum * cmult;
  }
  const bingo = newCount === RACK_SIZE;
  if (bingo) score += BINGO_BONUS;
  return { ok: true, reason: '', score, used, blanks, newCount, bingo, crosses };
}

/* ---------- kiểm tra 1 nước đặt (dùng cho cả UI + engine) ---------- */
export function validatePlace(s, pid, act) {
  const p = pOf(s, pid);
  if (!p) return { ok: false, reason: 'Không tìm thấy người chơi.' };
  if (!act || act.type !== 'place') return { ok: false, reason: 'Hành động không hợp lệ.' };
  if (s.phase !== 'playing') return { ok: false, reason: 'Trận đã kết thúc.' };
  if (s.players[s.turnIdx].id !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  const rack = p.rack || [];
  const firstMove = s.board.every(c => !c);
  const blanks = Array.isArray(act.blanks) ? act.blanks : null;
  return tryPlacement(s.board, rack, act.dir, act.r, act.c, act.word, firstMove, blanks);
}

/* ---------- liệt kê mọi nước đặt hợp lệ của 1 người ---------- */
/* Chỉ mục từ theo (độ dài, vị trí, chữ) để lọc nhanh: một nước đi chỉ
   được thử khi từ khớp chữ đã có trên bàn trong đoạn đặt, hoặc khớp chữ
   trên khay tại vị trí neo. Không có bộ lọc này, mỗi nước bot phải thử
   ~200k ứng viên và 1 ván mất ~7 giây. */
const _byLenPos = {};
function byLenPos(L, k, ch) {
  /* khóa gồm DICT_VERSION: từ điển nạp thêm lúc chạy làm bộ đệm cũ hết hạn */
  const key = DICT_VERSION + ':' + L + ':' + k + ':' + ch;
  if (!_byLenPos[key]) {
    _byLenPos[key] = (WORDS_BY_LEN[L] || []).filter(w => w[k] === ch);
  }
  return _byLenPos[key];
}
/* Lọc nhanh trước tryPlacement (patch 20261119-50): từ điển ~45.000 từ
   nên không thể thử đặt từng ứng viên — loại trước các từ mà khay không
   đủ chữ (kể cả ô trống) hoặc không khớp chữ đã có trên bàn trong đoạn
   đặt. Lọc này là điều kiện cần của tryPlacement nên không đổi kết quả,
   chỉ giảm số lần gọi tryPlacement (đắt: kiểm từ phụ + tính điểm). */
function rackCanCover(seg, word, rackCounts, blankCount) {
  const need = {};
  for (let i = 0; i < seg.length; i++) {
    if (seg[i].board) {
      if (seg[i].ch !== word[i]) return false;
    } else {
      const ch = word[i];
      need[ch] = (need[ch] || 0) + 1;
    }
  }
  let blanks = 0;
  for (const ch in need) {
    const short = need[ch] - (rackCounts[ch] || 0);
    if (short > 0) {
      blanks += short;
      if (blanks > blankCount) return false;
    }
  }
  return true;
}
export function legalMoves(s, pid) {
  const p = pOf(s, pid);
  if (!p || s.phase !== 'playing') return [];
  const rack = p.rack || [];
  const board = s.board;
  const firstMove = board.every(c => !c);
  const anchors = [];
  if (firstMove) anchors.push([CENTER, CENTER]);
  else {
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      if (board[idx(r, c)]) continue;
      if ((r > 0 && board[idx(r - 1, c)]) || (r < SIZE - 1 && board[idx(r + 1, c)])
        || (c > 0 && board[idx(r, c - 1)]) || (c < SIZE - 1 && board[idx(r, c + 1)])) anchors.push([r, c]);
    }
  }
  const rackSet = new Set(rack);
  const hasBlank = rack.includes('*');
  const rackCounts = {};
  let blankCount = 0;
  for (const ch of rack) {
    if (ch === '*') blankCount++;
    else rackCounts[ch] = (rackCounts[ch] || 0) + 1;
  }
  const out = [];
  const seen = new Set();
  for (const [ar, ac] of anchors) {
    for (const dir of ['H', 'V']) {
      for (let L = 2; L <= BOT_MAX_LEN; L++) {
        const list = WORDS_BY_LEN[L];
        if (!list) continue;
        for (let k = 0; k < L; k++) {
          const r = ar - (dir === 'V' ? k : 0), c = ac - (dir === 'H' ? k : 0);
          if (r < 0 || c < 0) continue;
          const endR = r + (dir === 'V' ? L - 1 : 0), endC = c + (dir === 'H' ? L - 1 : 0);
          if (endR >= SIZE || endC >= SIZE) continue;
          /* chữ đã có trên bàn trong đoạn đặt (nếu có) + đoạn bàn để lọc nhanh */
          let pattern = null;
          const seg = [];
          for (let i = 0; i < L; i++) {
            const cell = board[idx(r + (dir === 'V' ? i : 0), c + (dir === 'H' ? i : 0))];
            seg.push(cell ? { board: true, ch: cell.ch } : { board: false, ch: null });
            if (cell && !pattern) pattern = [i, cell.ch];
          }
          let candidates;
          if (pattern) {
            candidates = byLenPos(L, pattern[0], pattern[1]);
          } else if (hasBlank) {
            candidates = list;
          } else {
            const seenW = new Set();
            candidates = [];
            for (const ch of rackSet) {
              for (const w of byLenPos(L, k, ch)) {
                if (!seenW.has(w)) { seenW.add(w); candidates.push(w); }
              }
            }
          }
          for (const w of candidates) {
            const key = dir + '|' + r + '|' + c + '|' + w;
            if (seen.has(key)) continue;
            seen.add(key);
            if (!rackCanCover(seg, w, rackCounts, blankCount)) continue;
            const res = tryPlacement(board, rack, dir, r, c, w, firstMove);
            if (res.ok) {
              out.push({
                type: 'place', dir, r, c, word: w, blanks: res.blanks, score: res.score,
                newCount: res.newCount, bingo: res.bingo,
                usedIdx: res.used.filter(u => u && !u.board).map(u => u.rackIdx),
              });
            }
          }
        }
      }
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

/* ---------- xếp hạng: điểm cao hơn thắng; hòa thì ít chữ trên khay hơn; rồi theo ghế ---------- */
function rankPlayers(s, ids) {
  const info = ids.map((id, i) => {
    const p = pOf(s, id);
    return { id, idx: i, score: p.score, tilesLeft: p.rack.length };
  });
  info.sort((a, b) => b.score - a.score || a.tilesLeft - b.tilesLeft || a.idx - b.idx);
  return info;
}
function nextTurn(s) {
  s.turnIdx = (s.turnIdx + 1) % s.players.length;
  if (s.turnIdx === 0) s.round++;
}
function finishEnd(s, reason, cause, winnerId) {
  s.phase = 'ended';
  s.endReason = reason;
  s.endCause = cause;
  s.endedAt = Date.now();
  s.winner = winnerId;
  s.losers = s.players.filter(p => p.id !== winnerId).map(p => p.id);
  const summary = {};
  const scores = [];
  for (const p of s.players) {
    summary[p.id] = {
      score: p.score, wordsPlayed: p.wordsPlayed, bingoCount: p.bingoCount,
      tilesLeft: p.rack.length, turns: p.turns,
    };
    scores.push({ id: p.id, name: p.name, score: p.score });
  }
  scores.sort((a, b) => b.score - a.score);
  s.final = { summary, scores };
  const winner = pOf(s, winnerId);
  pushLog(s, `${winner ? winner.name : 'Ai đó'} thắng trận!`, 'win');
}

export function createGame(players, opts = {}) {
  if (!players || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error('Scrabble chơi 2–4 người.');
  }
  const seed = typeof opts.seed === 'number' ? opts.seed : (Date.now() % 2147483647);
  const s = {
    gid: 'sc-' + seed.toString(36) + '-' + (seed % 9973).toString(36), seq: 0,
    phase: 'playing', /* 'playing' | 'ended' */
    seed,
    players: players.map((p, i) => ({
      id: p.id, name: p.name || ('Người ' + (i + 1)),
      isBot: !!p.isBot, level: p.level || null, local: !!p.local,
      rack: [], score: 0, turns: 0, wordsPlayed: 0, bingoCount: 0,
    })),
    board: new Array(SIZE * SIZE).fill(null),
    bag: [], turnIdx: 0, round: 1, consecutivePasses: 0,
    winner: null, losers: [], endReason: null, endCause: null, final: null,
    startedAt: Date.now(), endedAt: 0, log: [],
  };
  s.bag = shuffleWith(s, buildBag());
  for (const p of s.players) {
    while (p.rack.length < RACK_SIZE && s.bag.length) p.rack.push(s.bag.pop());
    p.rack.sort((a, b) => (a === '*' ? 1 : b === '*' ? -1 : a.localeCompare(b)));
  }
  pushLog(s, `Ván mới: ${players.length} người, bàn 15×15, túi 100 chữ. Nước đầu phải phủ ô trung tâm ★.`);
  return s;
}

export function applyAction(s, pid, act) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Trận đã kết thúc.' };
  const p = pOf(s, pid);
  if (!p) return { ok: false, reason: 'Không tìm thấy người chơi.' };
  if (!act || typeof act.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };

  /* ---------- xin thua: người còn lại điểm cao nhất thắng ---------- */
  if (act.type === 'resign') {
    const others = s.players.filter(x => x.id !== pid).map(x => x.id);
    const ranked = rankPlayers(s, others);
    finishEnd(s, 'resign', 'resign', ranked[0].id);
    s.seq++;
    pushLog(s, `${p.name} xin thua.`, 'resign');
    return { ok: true };
  }

  /* chỉ người tới lượt mới được đi */
  if (s.players[s.turnIdx].id !== pid) {
    return { ok: false, reason: 'Chưa tới lượt bạn.' };
  }

  /* ---------- đặt từ ---------- */
  if (act.type === 'place') {
    const chk = validatePlace(s, pid, act);
    if (!chk.ok) return { ok: false, reason: chk.reason };
    const dr = act.dir === 'V' ? 1 : 0, dc = act.dir === 'H' ? 1 : 0;
    for (let i = 0; i < act.word.length; i++) {
      const rr = act.r + dr * i, cc = act.c + dc * i;
      if (!s.board[idx(rr, cc)]) {
        s.board[idx(rr, cc)] = {
          ch: act.word[i], blank: !!chk.used[i].blank,
          value: chk.used[i].blank ? 0 : TILE_VALUE[act.word[i]],
        };
      }
    }
    const usedIdx = chk.used.filter(u => u && !u.board).map(u => u.rackIdx).sort((a, b) => b - a);
    for (const i of usedIdx) p.rack.splice(i, 1);
    while (p.rack.length < RACK_SIZE && s.bag.length) p.rack.push(s.bag.pop());
    p.score += chk.score;
    p.wordsPlayed++;
    if (chk.bingo) p.bingoCount++;
    p.turns++;
    s.consecutivePasses = 0;
    pushLog(s, `${p.name} đặt "${act.word}" được ${chk.score} điểm${chk.bingo ? ' (BINGO +50!)' : ''}.`, 'place');
    /* hết túi + hết khay: kết thúc, trừ điểm khay còn lại, người hết khay ăn tổng */
    if (s.bag.length === 0 && p.rack.length === 0) {
      let total = 0;
      for (const q of s.players) {
        const v = rackValue(q.rack);
        total += v;
        q.score -= v;
      }
      p.score += total;
      finishEnd(s, 'match', 'bag-out', rankPlayers(s, s.players.map(x => x.id))[0].id);
      s.seq++;
      return { ok: true, score: chk.score };
    }
    nextTurn(s);
    s.seq++;
    return { ok: true, score: chk.score };
  }

  /* ---------- đổi chữ (cần túi còn ≥ 7 chữ) ---------- */
  if (act.type === 'exchange') {
    const tiles = Array.isArray(act.tiles) ? act.tiles : [];
    if (!tiles.length || tiles.length > RACK_SIZE) return { ok: false, reason: 'Chọn 1–7 chữ trên khay để đổi.' };
    if (new Set(tiles).size !== tiles.length) return { ok: false, reason: 'Chọn trùng chữ.' };
    if (tiles.some(t => typeof t !== 'number' || t < 0 || t >= p.rack.length)) return { ok: false, reason: 'Vị trí chữ không hợp lệ.' };
    if (s.bag.length < RACK_SIZE) return { ok: false, reason: 'Túi còn ít hơn 7 chữ — không đổi được, hãy bỏ lượt.' };
    const old = tiles.slice().sort((a, b) => b - a).map(i => p.rack[i]);
    for (const i of tiles.slice().sort((a, b) => b - a)) p.rack.splice(i, 1);
    for (let i = 0; i < old.length; i++) p.rack.push(s.bag.pop());
    s.bag.push(...shuffleWith(s, old));
    p.rack.sort((a, b) => (a === '*' ? 1 : b === '*' ? -1 : a.localeCompare(b)));
    p.turns++;
    s.consecutivePasses++;
    pushLog(s, `${p.name} đổi ${old.length} chữ.`, 'exchange');
    if (s.consecutivePasses >= s.players.length * 2) {
      for (const q of s.players) q.score -= rackValue(q.rack);
      finishEnd(s, 'match', 'passes', rankPlayers(s, s.players.map(x => x.id))[0].id);
      s.seq++;
      return { ok: true };
    }
    nextTurn(s);
    s.seq++;
    return { ok: true };
  }

  /* ---------- bỏ lượt ---------- */
  if (act.type === 'pass') {
    s.consecutivePasses++;
    pushLog(s, `${p.name} bỏ lượt.`, 'pass');
    if (s.consecutivePasses >= s.players.length * 2) {
      for (const q of s.players) q.score -= rackValue(q.rack);
      finishEnd(s, 'match', 'passes', rankPlayers(s, s.players.map(x => x.id))[0].id);
      s.seq++;
      return { ok: true };
    }
    nextTurn(s);
    s.seq++;
    return { ok: true };
  }

  return { ok: false, reason: 'Hành động không hợp lệ.' };
}

/* người đang tới lượt */
export function actors(s) {
  if (!s || s.phase !== 'playing') return [];
  return [s.players[s.turnIdx].id];
}

export function viewFor(s, pid) {
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    round: s.round, turn: s.players[s.turnIdx] ? s.players[s.turnIdx].id : null, turnIdx: s.turnIdx,
    board: s.board.map(c => (c ? { ch: c.ch, blank: !!c.blank } : null)),
    players: s.players.map(p => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
      rack: p.id === pid ? p.rack.slice() : null, rackCount: p.rack.length,
      score: p.score, turns: p.turns, wordsPlayed: p.wordsPlayed, bingoCount: p.bingoCount,
    })),
    bagCount: s.bag.length,
    winner: s.winner, losers: (s.losers || []).slice(), endReason: s.endReason, endCause: s.endCause,
    final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    log: s.log.slice(), startedAt: s.startedAt, endedAt: s.endedAt,
    me: pid,
  };
}

export default {
  createGame, applyAction, viewFor, actors, validatePlace, tryPlacement,
  legalMoves, buildBag, PREMIUM_COUNTS, TILE_VALUE, TILE_DIST,
};
