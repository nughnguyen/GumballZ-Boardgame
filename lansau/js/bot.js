// Máy chơi Lặn Sâu: "nghĩ ra" một đáp án trong kho – máy yếu hay nghĩ đáp án phổ biến,
// máy giỏi hay nghĩ đáp án hiếm (như người chơi giỏi nhớ được thứ ít ai nghĩ tới).
import { QS } from './questions.js?v=1';
import { viewFor } from './engine.js?v=1';
export function botAction(s, pid) {
  const v = viewFor(s, pid); if (v.phase !== 'q' || !v.q || !v.me || v.me.ans !== null) return null;
  const q = QS.find(x => x.id === v.q.id); if (!q || !q.a.length) return null;
  const lv = s.opts.bot || 2;
  const w = p => lv === 1 ? (p <= 15 ? 6 : p === 30 ? 2 : 0.5) : lv === 2 ? (p <= 15 ? 4 : p === 30 ? 3 : 1) : (p <= 15 ? 2 : p === 30 ? 3 : 2.5);
  let tot = 0; const ws = q.a.map(([, p]) => { const x = w(p); tot += x; return x; });
  let r = Math.random() * tot, pick = q.a[0][0];
  for (let i = 0; i < q.a.length; i++) { r -= ws[i]; if (r <= 0) { pick = q.a[i][0]; break; } }
  return { type: 'ans', text: pick };
}
