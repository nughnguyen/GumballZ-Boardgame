// 🤖 Bot Memory — "nhớ" các lá đã lật qua s.history của state (lịch sử lật là
// thông tin công khai: lá nào lật lên thì cả 2 bên đều thấy mặt).
// Máy Khó = nhớ hoàn hảo mọi lá đã thấy (luôn lấy cặp đã biết khi có, còn lại
// lật lá chưa biết để khám phá). Máy Dễ = chỉ nhớ 3 lần lật gần nhất, lại
// còn 30% đánh bừa. Bot đi được cả khi bàn gần hết (luôn có lá hợp lệ thì
// trả về 1 lá; hết lá thì trả null).
import { legalFlips } from './engine.js';

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
/* trí nhớ từ lịch sử: mặt -> các vị trí lá đã thấy mà vẫn úp + chưa trúng cặp.
   windowN = số lần lật gần nhất được nhớ (Infinity = nhớ hết). */
export function buildMemory(s, windowN = Infinity) {
  const byFace = new Map(), knownIdx = new Set();
  const hist = windowN === Infinity ? s.history : s.history.slice(-windowN);
  for (const h of hist) {
    const c = s.cards[h.i];
    if (!c || c.matched || c.up) continue;
    if (!byFace.has(h.face)) byFace.set(h.face, []);
    if (!byFace.get(h.face).includes(h.i)) byFace.get(h.face).push(h.i);
    knownIdx.add(h.i);
  }
  return { byFace, knownIdx };
}
export function chooseFlip(s, pid, level = 'easy') {
  if (s.phase !== 'playing' || s.turn !== pid || s.pendingHide) return null;
  const legal = legalFlips(s, pid);
  if (!legal.length) return null;
  /* Dễ: 30% đánh bừa (lá hợp lệ bất kỳ) */
  if (level === 'easy' && Math.random() < 0.3) return { index: pick(legal) };
  const windowN = level === 'hard' ? Infinity : 3;
  const { byFace, knownIdx } = buildMemory(s, windowN);
  const pending = s.pendingFlip;
  if (pending !== null) {
    /* đã ngửa 1 lá: tìm lá cùng mặt trong trí nhớ */
    const faceP = s.cards[pending].face;
    const mates = (byFace.get(faceP) || []).filter(i => legal.includes(i));
    if (mates.length) return { index: pick(mates) };
    const unknown = legal.filter(i => !knownIdx.has(i));
    if (unknown.length) return { index: pick(unknown) };
    return { index: pick(legal) };
  }
  /* chưa ngửa lá nào: có cặp đã biết thì lật 1 lá trong cặp đó */
  for (const [, idxs] of byFace) {
    const ready = idxs.filter(i => legal.includes(i));
    if (ready.length >= 2) return { index: pick(ready) };
  }
  const unknown = legal.filter(i => !knownIdx.has(i));
  if (unknown.length) return { index: pick(unknown) };
  return { index: pick(legal) };
}
/* Adapter cho phòng online (simplenet cfg.bot): bot nhận thêm player p (có level) */
export function botAction(s, pid, p) {
  const level = (p && p.level === 'hard') || (p && p.level === 'easy') ? p.level : 'hard';
  const m = chooseFlip(s, pid, level);
  return m ? { type: 'flip', index: m.index } : null;
}
export default { chooseFlip, botAction, buildMemory };
