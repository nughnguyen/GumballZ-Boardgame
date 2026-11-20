// 🤖 Bot Liêng.
// Máy Dễ: đánh lỏng — hiếm khi Bỏ (chỉ Bỏ khi bị Tố mạnh mà bài yếu),
// hay Tố khi bài khá, 30% đánh bừa 1 nước hợp lệ.
// Máy Khó: đánh theo sức mạnh bài + tỉ lệ gà — bài yếu mà bị Tố thì Bỏ,
// bài vừa thì Theo, bài mạnh thì Tố; thỉnh thoảng bluff khi chưa ai Tố.
// Không bao giờ trả nước không hợp lệ và không bao giờ trả null khi đang
// đánh (hết nước thì Bỏ).
import { handInfo, toCallOf, RAISES } from './engine.js';

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
/* sức mạnh tay bài 0..100: Sáp 100, Liêng 90, Ảnh 80, Điểm 9 → 70 … 0 → 0 */
export function strengthOf(cards) {
  const info = handInfo(cards);
  if (info.kind === 'sap') return 100;
  if (info.kind === 'lieng') return 90;
  if (info.kind === 'anh') return 80;
  return info.pts * 7 + (info.pts === 9 ? 7 : 0); /* 9 nút: 70, 8: 56, 7: 49, …, 0: 0 */
}
export function chooseAction(s, pid, level = 'easy') {
  if (!s || s.phase === 'ended') return null;
  const p = s.players.find(x => x.id === pid);
  if (!p || p.folded) return null;
  if (s.phase === 'ante') return { type: 'ante' }; /* bot luôn góp gà (tiền ảo của máy) */
  if (s.phase !== 'bet' || s.turn !== pid) return null;
  const toCall = toCallOf(s, pid);
  const str = strengthOf(p.cards);
  const canRaise = (s.raises || 0) < 3;
  if (level === 'easy') {
    if (Math.random() < 0.3) {
      /* 30% đánh bừa: Bỏ / Theo / Tố (Tố chỉ khi bài không quá yếu và còn lượt Tố) */
      const opts = ['theo', 'theo', (str >= 30 && canRaise) ? 'to' : 'theo', toCall > 0 && str < 15 ? 'bo' : 'theo'];
      const a = pick(opts);
      return a === 'to' ? { type: 'to', raise: pick(RAISES) } : { type: a };
    }
    if (toCall > 0 && str < 12 && Math.random() < 0.6) return { type: 'bo' }; /* bài rác, bị Tố: hay Bỏ */
    if (canRaise && str >= 45 && Math.random() < 0.45) return { type: 'to', raise: pick(RAISES) }; /* bài khá: hay Tố */
    return { type: 'theo' };
  }
  /* Máy Khó */
  const pot = s.pot || 0;
  if (toCall === 0) {
    if (canRaise && str >= 60) return { type: 'to', raise: str >= 85 ? 10 : 5 }; /* bài mạnh: Tố */
    if (canRaise && str < 15 && Math.random() < 0.08) return { type: 'to', raise: 5 }; /* thỉnh thoảng bluff */
    return { type: 'theo' }; /* check */
  }
  /* đang bị Tố: so tiền phải Theo với gà và sức mạnh bài */
  if (str < 20 && toCall > Math.max(5, Math.floor(pot / 4))) return { type: 'bo' }; /* bài yếu, Tố đắt: Bỏ */
  if (canRaise && str >= 70) return { type: 'to', raise: str >= 90 ? 10 : 5 }; /* bài mạnh: Tố lại */
  if (canRaise && str >= 45 && toCall <= 5) return { type: 'to', raise: 5 }; /* bài khá, Tố rẻ: Tố */
  if (str >= 15 || toCall <= Math.max(5, Math.floor(pot / 3))) return { type: 'theo' }; /* bài vừa hoặc Tố rẻ: Theo */
  return { type: 'bo' };
}
/* Adapter cho phòng online (simplenet cfg.bot). */
export function botAction(s, pid, p) {
  if (!s || s.phase === 'ended') return null;
  return chooseAction(s, pid, (p && p.level) || 'hard');
}
export default { chooseAction, botAction, strengthOf };
