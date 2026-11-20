// 🤖 Bot Wavelength.
//
// LƯU Ý QUAN TRỌNG (giống bot Ai Là Triệu Phú / 2 Thật 1 Giả / Đoán
// Hành Động): bot đọc vị trí bí mật và gợi ý từ state gốc CHỈ để giả
// lập độ chính xác của nó — vì ngoài đời thật, "đoán" nghĩa là bot có
// hiểu gợi ý của Nhà ngoại cảm hay không. Bot KHÔNG BAO GIỜ đọc mốc
// của đối thủ, không nhìn trộm ai đặt mốc ở đâu. Trong một ván online
// thật, phía server/bot chỉ thấy viewFor của chính nó.
//
// - Bot làm Nhà ngoại cảm: bấm xem vị trí, rồi chọn trong ngân hàng
//   gợi ý của thang đo đó cái có đích gần vị trí bí mật nhất (nó "biết"
//   mình muốn gợi ý tới đâu) và gửi gợi ý đó.
// - Bot đoán: đọc gợi ý đang hiện (ai cũng thấy), tra ngân hàng để
//   biết gợi ý đó thường chỉ tới vị trí nào, rồi đặt mốc quanh đó với
//   nhiễu Gauss theo độ khó (Dễ σ≈25, Khó σ≈12). Nếu gợi ý là do
//   người tự gõ (không có trong ngân hàng), bot "không hiểu" nên đặt
//   mốc quanh giữa thang (50) với nhiễu lớn — đó là giới hạn cố ý,
//   không phải lỗi: bot không được đọc vị trí bí mật để đoán.
// - Chơi đơn: không dùng bot (chơi đơn là tự đặt mốc theo gợi ý).
import { SPECTRUMS, CLUES } from './words.js?v=1';
import { actors } from './engine.js?v=1';

const SIGMA = { easy: 25, hard: 12 };

/* simplenet gọi bot(s, pid, p) với p là object người chơi (có .level),
   còn test gọi botAction(s, pid, 'easy'|'hard') — chuẩn hoá cả hai */
function normLevel(x) {
  if (typeof x === 'string') return x === 'hard' ? 'hard' : 'easy';
  if (x && typeof x === 'object') return x.level === 'hard' ? 'hard' : 'easy';
  return 'easy';
}

/* nhiễu Gauss (Box-Muller trên Math.random — test gieo hạt được) */
function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const clampPos = p => Math.max(0, Math.min(100, Math.round(p)));

/* bot làm Nhà ngoại cảm: 'ready' để xem vị trí, rồi gửi gợi ý trong
   ngân hàng gần vị trí bí mật nhất */
export function botPsychic(s, pid, level = 'easy') {
  if (s.solo || s.phase !== 'playing' || s.stage !== 'clue') return null;
  const cur = s.current;
  if (!cur || cur.psychic !== pid) return null;
  if (!cur.shown) return { type: 'ready' };
  if (cur.clue) return null;
  const spec = SPECTRUMS[cur.spectrumIdx];
  let best = spec.clues[0], bd = Infinity;
  for (const c of spec.clues) {
    const d = Math.abs(c.target - cur.target);
    if (d < bd) { bd = d; best = c; }
  }
  return { type: 'clue', text: best.clue };
}

/* bot đoán: đặt mốc quanh đích của gợi ý (tra ngân hàng), rồi chốt */
export function botGuesser(s, pid, level = 'easy') {
  if (s.solo || s.phase !== 'playing' || s.stage !== 'guess') return null;
  const cur = s.current;
  if (!cur || cur.psychic === pid) return null;
  const m = cur.markers.find(x => x.pid === pid);
  if (m && m.locked) return null;
  if (!m) {
    /* đích mà gợi ý đang chỉ tới (nếu gợi ý có trong ngân hàng);
       gợi ý lạ do người tự gõ thì bot không hiểu → đặt quanh giữa */
    let aim = 50;
    const hit = CLUES.find(c => c.clue === cur.clue);
    if (hit) aim = hit.target;
    const pos = clampPos(aim + gauss() * SIGMA[normLevel(level)]);
    return { type: 'place', pos };
  }
  return { type: 'lock' };
}

/* hành động tiếp theo của 1 bot trong ván nhiều người */
export function botAction(s, pid, level = 'easy') {
  if (s.solo || s.phase !== 'playing') return null;
  if (s.stage === 'clue') return botPsychic(s, pid, normLevel(level));
  if (s.stage === 'guess') {
    if (s.current && s.current.psychic === pid) return null; /* Nhà ngoại cảm (bot) không ép lật bài */
    return botGuesser(s, pid, normLevel(level));
  }
  if (s.stage === 'reveal') return { type: 'next' };
  return null;
}

export { actors };
export default botAction;
