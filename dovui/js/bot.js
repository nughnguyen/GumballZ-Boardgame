// Máy chơi Đố Vui Siêu Tốc: "biết" đáp án theo xác suất (tra trong kho câu hỏi công khai questions.js – không đọc gì riêng của ván),
// mức 1/2/3 trả lời đúng khoảng 45/65/85% (câu khó thì giảm), trả lời sau vài giây như người.
import { QS } from './questions.js?v=4';
import { viewFor } from './engine.js?v=4';
const ACC = { 1: [.62, .45, .35, .25, .2], 2: [.86, .7, .55, .42, .32], 3: [.97, .9, .8, .68, .55] }; /* [mức máy][độ khó 1–5] */
export function botAction(s, pid) {
  const v = viewFor(s, pid); if (v.phase !== 'q' || !v.q || !v.me || v.me.ans !== null) return null;
  const q = QS.find(x => x.id === v.q.id); if (!q) return { type: 'ans', c: 0 };
  const right = v.q.o.indexOf(q.o[0]), ok = Math.random() < ACC[v.opts.bot || 2][v.q.d - 1];
  const wrong = [0, 1, 2, 3].filter(i => i !== right && !v.me.hid.includes(i));
  return { type: 'ans', c: ok || !wrong.length ? right : wrong[Math.floor(Math.random() * wrong.length)] };
}
