// 🤖 Bot Connect 4 — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Easy: 30% đi bừa, còn lại 1-ply: thắng ngay > chặn đối thủ thắng ngay >
// ưu tiên cột giữa, có nhiễu nhẹ.
// Hard: minimax alpha-beta (độ sâu 6, tàn cuộc ≤10 ô trống thì sâu 8),
// điểm theo cửa sổ 4 ô: 4 liên tiếp ±100000, 3+1 trống ±120 (cả 2 đầu
// thoáng thì cộng thêm), 2+2 trống ±12, quân ở cột giữa +6. Bot cũng biết
// trả lời đề nghị hòa: đang thua từ 6 quân trở lên thì đồng ý.
import { landingRow, checkWin, legalCols, counts, foeSide, W, H, idx } from './engine.js';

/* mọi cửa sổ 4 ô liên tiếp trên bàn (ngang/dọc/chéo) */
const WINDOWS = [];
for (let y = 0; y < H; y++) for (let x = 0; x <= W - 4; x++) WINDOWS.push([[x, y], [x + 1, y], [x + 2, y], [x + 3, y]]);
for (let x = 0; x < W; x++) for (let y = 0; y <= H - 4; y++) WINDOWS.push([[x, y], [x, y + 1], [x, y + 2], [x, y + 3]]);
for (let y = 0; y <= H - 4; y++) for (let x = 0; x <= W - 4; x++) WINDOWS.push([[x, y], [x + 1, y + 1], [x + 2, y + 2], [x + 3, y + 3]]);
for (let y = 3; y < H; y++) for (let x = 0; x <= W - 4; x++) WINDOWS.push([[x, y], [x + 1, y - 1], [x + 2, y - 2], [x + 3, y - 3]]);

const CENTRE = [0, 2, 4, 7, 4, 2, 0]; /* cột 4 (giữa) quý nhất */

function scoreWindow(cells, win, me, foe) {
  let mn = 0, th = 0, em = 0;
  for (const [x, y] of win) {
    const v = cells[idx(x, y)];
    if (v === me) mn++; else if (v === foe) th++; else em++;
  }
  if (mn && th) return 0;
  if (mn === 4) return 100000;
  if (th === 4) return -100000;
  if (mn === 3 && em === 1) return 120;
  if (th === 3 && em === 1) return -130;
  if (mn === 2 && em === 2) return 12;
  if (th === 2 && em === 2) return -12;
  if (mn === 1 && em === 3) return 2;
  if (th === 1 && em === 3) return -2;
  return 0;
}
function evaluate(cells, side) {
  const me = side === 'R' ? 1 : 2, foe = side === 'R' ? 2 : 1;
  let score = 0;
  for (const w of WINDOWS) score += scoreWindow(cells, w, me, foe);
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    if (cells[idx(x, y)] === me) score += CENTRE[x];
    else if (cells[idx(x, y)] === foe) score -= CENTRE[x];
  }
  return score;
}
/* thả quân phe side vào cột c trên bản sao, trả mảng mới (null nếu cột đầy) */
function dropToCells(cells, side, c) {
  const r = landingRow(cells, c);
  if (r === -1) return null;
  const t = cells.slice();
  t[idx(c, r)] = side === 'R' ? 1 : 2;
  return { cells: t, row: r };
}

let nodes = 0;
const NODE_CAP = 30000;
function negamax(cells, side, depth, alpha, beta) {
  if (nodes >= NODE_CAP) return evaluate(cells, side);
  nodes++;
  const cols = legalCols(cells);
  if (cols.length === 0) return 0; /* bàn đầy = hòa */
  if (depth === 0) return evaluate(cells, side);
  let best = -Infinity;
  /* xếp cột giữa trước để cắt tỉa tốt hơn */
  const ordered = cols.slice().sort((a, b) => CENTRE[b] - CENTRE[a]);
  for (const c of ordered) {
    const d = dropToCells(cells, side, c);
    if (!d) continue;
    if (checkWin(d.cells, c, d.row).win) return 100000 + depth; /* thắng ngay */
    const v = -negamax(d.cells, foeSide(side), depth - 1, -beta, -alpha);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export function chooseMove(s, pid, level = 'easy') {
  const me = s.players.find(p => p.id === pid);
  if (!me || s.phase !== 'playing') return null;
  const cols = legalCols(s.cells);
  if (!cols.length) return null;
  /* nước thắng ngay (cả 2 cấp đều lấy) */
  for (const c of cols) {
    const d = dropToCells(s.cells, me.side, c);
    if (d && checkWin(d.cells, c, d.row).win) return { type: 'move', col: c };
  }
  /* chặn đối thủ thắng ngay (cả 2 cấp đều lấy) */
  const foe = foeSide(me.side);
  const threats = [];
  for (const c of cols) {
    const d = dropToCells(s.cells, foe, c);
    if (d && checkWin(d.cells, c, d.row).win) threats.push(c);
  }
  if (level !== 'hard') {
    /* Easy: 30% bừa; còn lại chặn nếu có, không thì ưu tiên cột giữa + nhiễu */
    if (Math.random() < 0.3) {
      const c = cols[Math.floor(Math.random() * cols.length)];
      return { type: 'move', col: c };
    }
    if (threats.length) return { type: 'move', col: threats[0] };
    let best = null, bestScore = -Infinity;
    for (const c of cols) {
      const sc = CENTRE[c] + Math.random() * 3;
      if (sc > bestScore) { bestScore = sc; best = c; }
    }
    return { type: 'move', col: best };
  }
  /* Hard: chặn trước nếu có ≥2 mối đe dọa (chỉ chặn được 1), rồi minimax */
  if (threats.length) return { type: 'move', col: threats[0] };
  const empties = W * H - counts(s.cells).total;
  const depth = empties <= 10 ? 8 : empties <= 16 ? 7 : 6;
  nodes = 0;
  const ordered = cols.slice().sort((a, b) => CENTRE[b] - CENTRE[a]);
  let best = ordered[0], bestVal = -Infinity;
  for (const c of ordered) {
    const d = dropToCells(s.cells, me.side, c);
    if (!d) continue;
    const v = -negamax(d.cells, foe, depth - 1, -Infinity, Infinity);
    if (v > bestVal) { bestVal = v; best = c; }
    if (nodes >= NODE_CAP) break;
  }
  return { type: 'move', col: best };
}

/* Bot hành động 1 lượt: trả lời đề nghị hòa trước, rồi đi nước. */
export function botAction(s, pid, p) {
  if (s.phase !== 'playing' || s.turn !== pid) return null;
  if (s.drawOffer && s.drawOffer !== pid) {
    const me = s.players.find(pp => pp.id === pid);
    const c = counts(s.cells);
    const mine = me.side === 'R' ? c.R : c.Y;
    const theirs = me.side === 'R' ? c.Y : c.R;
    if (mine + 6 <= theirs) return { type: 'draw' }; /* đang thua nhiều thì hòa */
    return { type: 'draw-decline' };
  }
  return chooseMove(s, pid, (p && p.level) || 'easy');
}
