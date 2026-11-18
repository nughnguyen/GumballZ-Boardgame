// 🤖 Bot Cờ Thú — heuristic 1 nước.
// Chấm điểm mỗi nước hợp lệ: ăn quân (theo hạng) > vào hang địch > tiến về
// hang địch > cứu quân đang bị đe dọa > tránh vào bẫy địch khi có địch kề >
// tránh để quân bị ăn > thủ hang mình. Tránh lặp lại vị trí cũ (chống kẹt
// ván) và càng về cuối càng ưu tiên ăn quân để ván luôn kết thúc.
// Máy Khó: luôn lấy nước điểm cao nhất. Máy Dễ: 30% đánh bừa 1 nước hợp lệ.
// Bot không bao giờ đánh nước không hợp lệ (ứng viên lấy từ legalMoves) và
// không bao giờ trả null khi đang đánh (hết nước thì xin thua).
import { W, H, DIRS, DENS, TRAPS, idx, inBoard, isRiver, isTrapOf, sideOf, rankOf, animalOf, effRank, genMovesFor, movesFromCells, legalMoves, pieceAt } from './engine.js';

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const foeSide = s => (s === 'R' ? 'B' : 'R');
const manhattan = (x1, y1, x2, y2) => Math.abs(x1 - x2) + Math.abs(y1 - y2);
const hashCells = cells => cells.join(',');

/* quân ở (x,y) có bị phe địch ăn được ngay trong nước tới không?
   (dùng genMovesFor của địch trên bàn sau nước đi) */
function capturableAfter(cells, side, x, y) {
  const foe = foeSide(side);
  const moves = genMovesFor(cells, foe);
  return moves.some(m => m.tx === x && m.ty === y && m.capture);
}
/* có quân địch nào kề ô (x,y) không (đe dọa quân vừa bước vào bẫy)? */
function enemyAdjacent(cells, side, x, y) {
  const foe = foeSide(side);
  for (const [dx, dy] of DIRS) {
    const v = pieceAt(cells, x + dx, y + dy);
    if (v !== 0 && sideOf(v) === foe) return true;
  }
  return false;
}

export function scoreMove(s, pid, m) {
  const me = s.players.find(p => p.id === pid);
  const side = me.side, foe = foeSide(side);
  const rank = rankOf(pieceAt(s.cells, m.fx, m.fy));
  const cells = s.cells.slice();
  cells[idx(m.tx, m.ty)] = cells[idx(m.fx, m.fy)];
  cells[idx(m.fx, m.fy)] = 0;
  let sc = 0;
  /* thắng ngay: vào hang địch hoặc ăn quân cuối */
  const [dx, dy] = DENS[foe];
  if (m.tx === dx && m.ty === dy) return 100000;
  let foeLeft = 0;
  for (const c of cells) if (c !== 0 && sideOf(c) === foe) foeLeft++;
  if (m.capture && foeLeft === 0) return 100000;
  /* ăn quân: càng hạng cao càng quý; Chuột ăn Voi là nước hay */
  if (m.capture) {
    sc += 120 * m.capRank;
    if (rank === 1 && m.capRank === 8) sc += 150;
    if (m.capRank >= 6) sc += 60;
    if (s.quietPlies >= 40) sc += s.quietPlies * 2; /* ván ì quá thì càng ưu tiên ăn */
  }
  /* tiến về hang địch */
  const dBefore = manhattan(m.fx, m.fy, dx, dy);
  const dAfter = manhattan(m.tx, m.ty, dx, dy);
  sc += (dBefore - dAfter) * 25;
  /* vào bẫy địch: hạng thành 0 — nguy hiểm nếu có địch kề, không thì chỉ hơi dở */
  if (isTrapOf(foe, m.tx, m.ty)) {
    sc -= enemyAdjacent(cells, side, m.tx, m.ty) ? 180 : 40;
  }
  /* cứu quân đang bị đe dọa: quân ở ô xuất phát bị ăn được mà sau khi chạy thì không */
  const wasThreatened = capturableAfter(s.cells, side, m.fx, m.fy);
  const nowThreatened = capturableAfter(cells, side, m.tx, m.ty);
  if (wasThreatened && !nowThreatened) sc += 50;
  if (!wasThreatened && nowThreatened) sc -= 18 * rank; /* tự đưa quân vào chỗ chết */
  else if (wasThreatened && nowThreatened) sc -= 8 * rank;
  /* thủ hang mình: địch đã áp sát hang thì kéo quân về chặn hoặc ăn nó */
  const [hx, hy] = DENS[side];
  let foeNearDen = false;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = cells[idx(x, y)];
    if (v !== 0 && sideOf(v) === foe && manhattan(x, y, hx, hy) <= 2) foeNearDen = true;
  }
  if (foeNearDen) {
    if (manhattan(m.tx, m.ty, hx, hy) <= 1) sc += 60;
    if (m.capture) sc += 40;
  }
  /* nhảy sông để tấn công thì hay hơn đi thường một chút */
  if (m.jump) sc += 10;
  /* chống lặp: nước đi làm bàn về lại vị trí đã từng có thì trừ nặng */
  if (s.hashes && s.hashes.includes(hashCells(cells))) sc -= 300;
  sc += Math.random() * 6; /* phá hòa ngẫu nhiên */
  return sc;
}

export function chooseMove(s, pid, level = 'easy') {
  if (s.phase !== 'playing' || s.turn !== pid) return null;
  const moves = legalMoves(s, pid);
  if (!moves.length) return { type: 'resign' };
  if (level === 'easy' && Math.random() < 0.3) {
    const m = pick(moves);
    return { type: 'move', from: { x: m.fx, y: m.fy }, to: { x: m.tx, y: m.ty } };
  }
  let best = -Infinity, bestMoves = [];
  for (const m of moves) {
    const sc = scoreMove(s, pid, m);
    if (sc > best) { best = sc; bestMoves = [m]; }
    else if (sc === best) bestMoves.push(m);
  }
  const m = pick(bestMoves);
  return { type: 'move', from: { x: m.fx, y: m.fy }, to: { x: m.tx, y: m.ty } };
}
/* Adapter cho phòng online (simplenet cfg.bot). */
export function botAction(s, pid, p) {
  if (s.phase !== 'playing') return null;
  const level = (p && p.level === 'hard') || (p && p.level === 'easy') ? p.level : 'hard';
  return chooseMove(s, pid, level);
}
export default { chooseMove, botAction, scoreMove };
