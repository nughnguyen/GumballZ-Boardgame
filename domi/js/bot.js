// 💣 Bot Dò Mìn — chỉ suy luận từ những gì người chơi đã thấy (ô đã mở
// + số + cờ của chính mình), KHÔNG nhìn trộm vị trí mìn trong state.
// Máy Dễ: 70% mở bừa, 30% dùng luật chắc ăn. Máy Khó: luật chắc ăn trước,
// còn lại mở ô có xác suất trúng mìn thấp nhất.
import { neighborsOf } from './engine.js?v=1';

function myBoard(s, pid) {
  const pr = s.prog[pid];
  const revealed = new Set(pr.revealed);
  const flags = new Set(Object.keys(pr.flags || {}).map(x => +x));
  return { pr, revealed, flags };
}
/* các ô chưa mở, chưa cắm cờ */
function unknownCells(s, revealed, flags) {
  const out = [];
  for (let i = 0; i < s.rows * s.cols; i++) if (!revealed.has(i) && !flags.has(i)) out.push(i);
  return out;
}
/* 1 nước chắc ăn: trả về {type, cell} hoặc null.
   - số kề còn thiếu = 0 → các ô kề chưa biết đều an toàn → mở 1 ô
   - số kề còn thiếu = số ô kề chưa biết → tất cả đều là mìn → cắm cờ 1 ô */
function certainMove(s, revealed, flags) {
  if (!s.numbers) return null;
  for (const i of revealed) {
    const n = s.numbers[i];
    if (n <= 0) continue;
    const nbs = neighborsOf(i, s.rows, s.cols);
    let flagged = 0;
    const unknown = [];
    for (const nb of nbs) {
      if (flags.has(nb)) flagged++;
      else if (!revealed.has(nb)) unknown.push(nb);
    }
    const need = n - flagged;
    if (!unknown.length) continue;
    if (need === 0) return { type: 'reveal', cell: unknown[0] };
    if (need === unknown.length) return { type: 'flag', cell: unknown[0] };
  }
  return null;
}
/* ô có xác suất trúng mìn thấp nhất (theo các số kề đã mở) */
function safestCell(s, revealed, flags) {
  if (!s.numbers) return null;
  let best = null, bestP = 2;
  const cand = new Set();
  for (const i of revealed) {
    if (s.numbers[i] <= 0) continue;
    for (const nb of neighborsOf(i, s.rows, s.cols)) if (!revealed.has(nb) && !flags.has(nb)) cand.add(nb);
  }
  for (const c of cand) {
    let worst = 0, n = 0;
    for (const nb of neighborsOf(c, s.rows, s.cols)) {
      if (!revealed.has(nb) || s.numbers[nb] <= 0) continue;
      const adj = neighborsOf(nb, s.rows, s.cols);
      let flagged = 0, unknown = 0;
      for (const a of adj) { if (flags.has(a)) flagged++; else if (!revealed.has(a)) unknown++; }
      if (!unknown) continue;
      const p = (s.numbers[nb] - flagged) / unknown;
      worst = Math.max(worst, p);
      n++;
    }
    const p = n ? worst : 0.5;
    if (p < bestP) { bestP = p; best = c; }
  }
  return best == null ? null : { type: 'reveal', cell: best };
}

export function botAction(s, pid, player) {
  if (!s || s.phase !== 'playing') return null;
  const pr = s.prog[pid];
  if (!pr || pr.failed || pr.finishedAt) return null;
  const { revealed, flags } = myBoard(s, pid);
  const hard = player && player.level === 'hard';
  /* chưa mở ô nào: bấm bừa 1 ô (cú bấm đầu luôn an toàn) */
  if (!revealed.size) {
    const cells = unknownCells(s, revealed, flags);
    if (!cells.length) return null;
    return { type: 'reveal', cell: cells[Math.floor(Math.random() * cells.length)] };
  }
  const certain = certainMove(s, revealed, flags);
  if (certain) {
    if (hard) return certain;
    /* máy Dễ thỉnh thoảng bỏ qua nước chắc ăn để mở bừa */
    if (Math.random() < 0.3) return certain;
  }
  if (hard) {
    const safe = safestCell(s, revealed, flags);
    if (safe) return safe;
  }
  const cells = unknownCells(s, revealed, flags);
  if (!cells.length) return null;
  return { type: 'reveal', cell: cells[Math.floor(Math.random() * cells.length)] };
}
