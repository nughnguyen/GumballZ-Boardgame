// 🤖 Máy chơi Đoán Nhạc: nghe càng lâu càng dễ nhận ra bài (như người), máy giỏi nhận ra sớm hơn.
import { SONGS, STAGES } from './engine.js?v=1';
const KNOW = [0.18, 0.32, 0.48, 0.62, 0.74, 0.82], LV = { 1: 0.6, 2: 0.8, 3: 1 };
export function botAction(s, pid) {
  const m = s.st[pid], p = s.players.find(x => x.id === pid); if (!m || m.done || s.phase !== 'q' || !p) return null;
  if (Math.random() < KNOW[m.k] * (LV[p.level || 2] || 0.8)) return { type: 'guess', text: SONGS[s.list[s.i]].t };
  return m.k >= STAGES.length - 1 ? { type: 'give' } : { type: 'more' };
}
