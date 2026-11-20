// 🤖 Bot Đoán Hành Động.
//
// LƯU Ý QUAN TRỌNG (giống bot Ai Là Triệu Phú / 2 Thật 1 Giả): bot đọc
// từ bí mật từ state gốc (s.current.word) CHỈ để giả lập xác suất đoán
// đúng của nó — vì ngoài đời thật, "đoán" nghĩa là bot có nghe được
// diễn viên diễn hay không. Bot KHÔNG BAO GIỜ đọc lượt đoán của đối
// thủ, không nhìn trộm ai đoán gì, và khi nó làm diễn viên thì nó
// chấm lượt đoán bằng engine (applyConfirm tự kiểm tra bằng
// normalizeGuess) — không tự ý cho điểm. Trong một ván online thật,
// phía server/bot chỉ thấy viewFor của chính nó.
//
// - Bot đoán: Easy đoán đúng ~35% mỗi từ, Hard ~65% mỗi từ. Khi đoán
//   đúng, bot gửi đúng từ bí mật (sau 1 khoảng chờ ngẫu nhiên); khi
//   đoán sai, bot gửi 1 từ gần nghĩa trong ngân hàng (sai chắc).
// - Bot làm diễn viên: bắt đầu diễn ngay; chấm lượt đoán bằng
//   'confirm' (engine tự kiểm tra đúng/sai); có 10% khả năng bỏ qua
//   từ đang diễn.
// - Chơi đơn: không dùng bot (chơi đơn là trắc nghiệm 4 phương án).
import { WORDS } from './words.js?v=1';
import { normalizeGuess } from './engine.js?v=1';
import { actors } from './engine.js?v=1';

const RATES = { easy: 0.35, hard: 0.65 };

/* simplenet gọi bot(s, pid, p) với p là object người chơi (có .level),
   còn test gọi botAction(s, pid, 'easy'|'hard') — chuẩn hoá cả hai */
function normLevel(x) {
  if (typeof x === 'string') return x === 'hard' ? 'hard' : 'easy';
  if (x && typeof x === 'object') return x.level === 'hard' ? 'hard' : 'easy';
  return 'easy';
}

/* bot đoán 1 từ khi làm người đoán: trả về {type:'guess', text}
   hoặc null (chưa tới lượt đoán / đã đoán rồi) */
export function botGuess(s, pid, level = 'easy') {
  if (s.solo || s.phase !== 'playing' || s.stage !== 'guess') return null;
  const cur = s.current;
  if (!cur || cur.revealed || cur.actor === pid) return null;
  if (cur.guesses.some(g => g.pid === pid)) return null;
  const rate = RATES[normLevel(level)] || RATES.easy;
  const hit = Math.random() < rate;
  if (hit) return { type: 'guess', text: cur.word };
  /* đoán sai: lấy 1 từ khác trong ngân hàng (cùng chủ đề nếu có) */
  const same = WORDS.filter(w => w.cat === cur.cat && normalizeGuess(w.word) !== normalizeGuess(cur.word));
  const pool = same.length ? same : WORDS.filter(w => normalizeGuess(w.word) !== normalizeGuess(cur.word));
  const wrong = pool[Math.floor(Math.random() * pool.length)];
  return { type: 'guess', text: wrong.word };
}

/* bot làm diễn viên: 'ready' khi chuẩn bị, 'skip' 10% mỗi từ,
   'confirm' khi có lượt đoán đang chờ chấm */
export function botActor(s, pid, level = 'easy') {
  if (s.solo || s.phase !== 'playing') return null;
  if (s.stage === 'act') {
    if (pid !== s.players[s.actorIdx].id) return null;
    /* bot-as-actor có 10% khả năng bỏ qua từ (dùng 1 lượt bỏ qua) */
    const pr = s.prog[pid];
    if (pr.skipsUsed < 2 && Math.random() < 0.10) return { type: 'skip' };
    return { type: 'ready' };
  }
  if (s.stage === 'guess') {
    const cur = s.current;
    if (!cur || cur.revealed || cur.actor !== pid) return null;
    const pending = cur.guesses.find(g => g.correct == null);
    if (pending) return { type: 'confirm', guessId: pending.id };
    return null;
  }
  return null;
}

/* hành động tiếp theo của 1 bot trong ván nhiều người: diễn viên thì
   ready/skip/confirm, người đoán thì đoán 1 từ */
export function botAction(s, pid, level = 'easy') {
  if (s.solo || s.phase !== 'playing') return null;
  const cur = s.current;
  if (!cur) return null;
  if (s.stage === 'act') return botActor(s, pid, normLevel(level));
  if (s.stage === 'guess') {
    if (cur.actor === pid) return botActor(s, pid, normLevel(level));
    return botGuess(s, pid, normLevel(level));
  }
  if (s.stage === 'reveal') return { type: 'next' };
  return null;
}

export { actors };
export default botAction;
