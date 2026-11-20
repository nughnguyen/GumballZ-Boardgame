// 🎯 Bot Phi Tiêu — chỉ đọc state công khai, không giữ bộ nhớ module-level.
// Khó: ghi điểm thì ngắm treble 20; vào tầm checkout (≤170) thì tính nước
// về đích (double đúng, hoặc dọn điểm lẻ để chừa double); đi 400–600ms.
// Dễ: 30% ném bừa, còn lại ngắm treble 20 nhưng sai số lớn; đi 700–900ms.
// Sai số tay nằm ở engine (theo level người ném) nên bot chỉ cần chọn
// điểm ngắm — cùng 1 seed thì cùng kết quả.
import { pointFor } from './engine.js?v=1';

export const BOT_NAMES = ['Minh Quân', 'Đức Anh', 'Tuấn Anh', 'Hải Đăng', 'Quốc Bảo', 'Thanh Tùng', 'Văn Đức', 'Hồng Sơn'];

export function botDelay(s, pid) {
  const p = s.players.find(x => x.id === pid);
  const hard = p && p.level === 'hard';
  return hard ? 400 + Math.random() * 200 : 700 + Math.random() * 200;
}
const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
/* điểm ngắm ngẫu nhiên trên bàn (tọa độ 0..400, r ≤ 185) */
function randomPoint() {
  const a = Math.random() * Math.PI * 2;
  const r = 185 * Math.sqrt(Math.random());
  return { x: 200 + r * Math.cos(a), y: 200 + r * Math.sin(a) };
}
/* nước checkout cho số điểm còn lại (đấu 501): trả điểm ngắm {x, y}.
   - 50 → bull trong; chẵn 2..40 → double (điểm/2); lẻ → dọn về số chẵn
     bằng 1 phi đơn: chừa 2 (double 1) nếu được, không thì chừa 40
     (double 20), không thì treble 20 rồi checkout. */
export function checkoutAim(remaining) {
  if (remaining === 50) return pointFor(25, 'inner');
  if (remaining % 2 === 0 && remaining >= 2 && remaining <= 40) {
    return pointFor(remaining / 2, 'double');
  }
  if (remaining % 2 === 1) {
    /* lẻ: dọn 1 phi đơn để chừa 2 (double 1) — vd còn 3 → đơn 1, còn 5 → đơn 3 */
    const toTwo = remaining - 2;
    if (toTwo >= 1 && toTwo <= 20) return pointFor(toTwo, 'single');
    const toForty = remaining - 40;
    if (toForty >= 1 && toForty <= 20) return pointFor(toForty, 'single');
    const afterT20 = remaining - 60;
    if (afterT20 === 50 || (afterT20 % 2 === 0 && afterT20 >= 2 && afterT20 <= 40)) {
      return pointFor(20, 'treble');
    }
    return pointFor(1, 'single');
  }
  return pointFor(20, 'treble');
}

export function botAction(s, pid) {
  const prog = s.prog;
  if (!prog || s.phase !== 'playing') return null;
  if (pid !== prog.turn && !(s.solo && pid === s.players[0].id)) return null;
  const p = s.players.find(x => x.id === pid);
  const hard = p && p.level === 'hard';
  if (!hard && Math.random() < 0.3) {
    const pt = randomPoint();
    return { type: 'throw', x: pt.x, y: pt.y };
  }
  if (!s.solo) {
    const rem = prog.remaining[pid];
    if (rem <= 170) {
      const pt = checkoutAim(rem);
      return { type: 'throw', x: pt.x, y: pt.y };
    }
  }
  const pt = pointFor(20, 'treble');
  return { type: 'throw', x: pt.x, y: pt.y };
}
export default { botAction, botDelay, BOT_NAMES };
