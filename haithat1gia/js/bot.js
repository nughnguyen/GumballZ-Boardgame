// 🤖 Bot 2 Thật 1 Giả — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Bot kể: lấy 1 bộ có sẵn trong ngân hàng. Bot đoán: đoán đúng với xác
// suất theo cấp độ (Máy Dễ ~40%, Máy Khó ~70%), còn lại chọn bừa 1 câu
// sai. Bot quyết định từ viewFor của chính mình (bộ đang kể, đã đoán
// chưa, tới lượt mình không) — KHÔNG đọc lượt đoán hay bộ nộp của đối
// thủ. Ngoại lệ duy nhất, ghi rõ ở đây: để "biết" câu giả với xác suất
// theo cấp độ (mô phỏng khả năng phán đoán), bot đọc chỉ số câu giả của
// bộ hiện tại từ state — đó là cách duy nhất để bot đoán đạt tỉ lệ đúng
// mục tiêu; bot không bao giờ đọc đáp án của đối thủ hay bộ họ đã nộp.
import { viewFor } from './engine.js?v=1';

const rnd = n => Math.floor(Math.random() * n);

export function botAction(s, pid, p) {
  if (!s || s.phase !== 'playing') return null;
  const level = typeof p === 'string' ? p : (p && p.level);
  const hard = level === 'hard';
  const v = viewFor(s, pid);
  if (!v) return null;

  /* đã lật bài xong → bấm Tiếp tục sang lượt sau */
  if (v.stage === 'reveal') return { type: 'next' };

  /* tới lượt kể → lấy 1 bộ có sẵn (bot không tự nghĩ câu) */
  if (v.stage === 'submit') {
    if (v.presenter !== pid) return null;
    return { type: 'draw' };
  }

  /* tới lượt đoán */
  if (v.stage === 'guess') {
    const acc = hard ? 0.7 : 0.4;
    if (v.solo) {
      const set = s.soloSet;
      if (!set || set.guessed != null) return null;
      if (Math.random() < acc) return { type: 'guess', idx: set.lie };
      const wrong = [0, 1, 2].filter(i => i !== set.lie);
      return { type: 'guess', idx: wrong[rnd(wrong.length)] };
    }
    const cur = s.current;
    if (!cur || cur.revealed) return null;
    if (cur.presenter === pid) return null;
    if (cur.guesses[pid] != null) return null;
    if (Math.random() < acc) return { type: 'guess', idx: cur.lie };
    const wrong = [0, 1, 2].filter(i => i !== cur.lie);
    return { type: 'guess', idx: wrong[rnd(wrong.length)] };
  }
  return null;
}
