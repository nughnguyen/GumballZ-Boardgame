// Máy chơi Vua Tiếng Việt: máy "nghĩ" rồi đoán đáp án đúng của vòng.
// Máy càng giỏi thì mỗi lần đoán càng dễ trúng (lv1 35% / lv2 60% / lv3 90%);
// đoán sai thì máy đoán lại sau (độ trễ botDelay ở def.js). Đoán sai của máy
// là đáp án lấy từ các ô chữ đã xáo (gần như chắc chắn sai).
import { viewFor } from './engine.js?v=1';
export function botAction(s, pid) {
  const v = viewFor(s, pid);
  if (v.phase !== 'q' || !v.q || !v.me) return null;
  const q = s.qs[s.i]; if (!q) return null;
  const lv = s.opts.bot || 2;
  const pHit = lv === 1 ? 0.35 : lv === 2 ? 0.6 : 0.9;
  if (Math.random() < pHit) return { type: 'ans', text: q.text };
  // đoán sai: ghép các ô chữ theo đúng thứ tự đang hiện (xáo sẵn nên sai)
  const wrong = q.tiles.map(w => w.join('')).join(' ');
  if (wrong === q.text) return { type: 'ans', text: 'không biết' };
  return { type: 'ans', text: wrong };
}
