// 🧩 Cấp độ giải đố Cờ Vua: kho = PUZZLES + DAILY gộp theo số nước chiếu bí (n).
// PUZZLES chỉ có n=1 (40 bài) và n=2 (80 bài) — không có bài n>=3 — nên cấp Trung bình + Khó lấy từ DAILY
// (Lichess, n=3: 172 bài, n=4: 114 bài). 2 kho không trùng FEN nào (đã kiểm: 0/400 trùng),
// dùng lại trong cấp độ không ảnh hưởng bài "hôm nay" (bài hôm nay tính riêng theo ngày).
import { PUZZLES } from './puzzles.js?v=2';
import { DAILY, START as D_START } from './daily.js?v=1';
export const LEVELS = { de: 'Dễ', tb: 'Trung bình', kho: 'Khó' };
export const LEVEL_N = { de: '1–2 nước', tb: '3 nước', kho: '4 nước' };
export const POOLS = {
  de: [...PUZZLES.filter(p => p.n <= 2), ...DAILY.filter(p => p.n <= 2)],
  tb: [...DAILY.filter(p => p.n === 3)],
  kho: [...DAILY.filter(p => p.n >= 4)],
};
const START = Date.parse(D_START + 'T00:00:00Z');
export const dayKey = (t = Date.now()) => new Date(t + 7 * 3600e3).toISOString().slice(0, 10);
const dayNo = k => Math.round((Date.parse(k + 'T00:00:00Z') - START) / 864e5);
/* bài của cấp `lv` trong ngày k: xoay vòng theo chỉ số ngày trong kho của cấp — cùng cấp, các ngày khác nhau ra bài khác nhau cho tới khi hết kho mới quay lại */
export function puzzleFor(lv, k = dayKey()) { const pool = POOLS[lv]; if (!pool || !pool.length) return null; return pool[((dayNo(k) % pool.length) + pool.length) % pool.length]; }
export function indexOf(lv, id) { const pool = POOLS[lv]; return pool ? pool.findIndex(p => p.id === id) : -1; }
export function byId(lv, id) { const pool = POOLS[lv]; return pool ? pool.find(p => p.id === id) || null : null; }
/* bài tiếp theo cùng cấp sau bài `id`: ưu tiên bài chưa giải (solved = map id→1), quét tiếp từ sau bài hiện tại, hết kho quay lại đầu */
export function nextPuzzle(lv, id, solved = {}) {
  const pool = POOLS[lv]; if (!pool || !pool.length) return null;
  const i = indexOf(lv, id);
  for (let step = 1; step <= pool.length; step++) { const p = pool[(i + step) % pool.length]; if (!solved[p.id]) return p; }
  return pool[(i + 1) % pool.length];
}
