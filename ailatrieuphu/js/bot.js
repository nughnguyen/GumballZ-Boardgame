// 🤖 Bot Ai Là Triệu Phú — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Bot đua cùng 15 câu với người chơi. Máy Dễ: trả lời đúng ~55%, nghĩ
// 8–20s, thỉnh thoảng dùng 50:50. Máy Khó: trả lời đúng ~85%, nghĩ 3–8s,
// dùng trợ giúp hợp lý (50:50 ở câu khó, gọi điện ở câu rất khó).
// Bot quyết định từ viewFor của chính mình (câu hỏi, trợ giúp đã dùng,
// phương án đã bị loại) — KHÔNG đọc lượt trả lời hay đáp án của đối thủ.
// Ngoại lệ duy nhất, ghi rõ ở đây: để "biết" đáp án với xác suất theo
// cấp độ (mô phỏng kiến thức), bot đọc đáp án đúng của câu hiện tại từ
// state — đó là cách duy nhất để bot trắc nghiệm đạt tỉ lệ đúng mục
// tiêu; bot không bao giờ đọc đáp án của đối thủ hay lượt chơi của họ.
import { viewFor, effectiveQuestion } from './engine.js?v=1';

const rnd = n => Math.floor(Math.random() * n);

export function botAction(s, pid, p) {
  if (!s || s.phase !== 'playing') return null;
  const level = typeof p === 'string' ? p : (p && p.level);
  const hard = level === 'hard';
  const v = viewFor(s, pid);
  const you = v.you;
  if (!you || you.done || !you.question) return null;
  const pr = s.prog[pid];
  const q = effectiveQuestion(s, pid, pr.level);
  const acc = hard ? 0.85 : 0.55;

  /* ----- dùng trợ giúp trước khi trả lời ----- */
  if (!you.lifelines.fifty && !you.used50) {
    const useFifty = hard
      ? (pr.level >= 10 && Math.random() < 0.6) || (pr.level >= 5 && Math.random() < 0.15)
      : (pr.level >= 5 && Math.random() < 0.2);
    if (useFifty) return { type: 'lifeline', kind: 'fifty' };
  }
  if (!you.lifelines.phone && you.phoneHint == null && pr.level >= 11 && Math.random() < (hard ? 0.4 : 0.15)) {
    return { type: 'lifeline', kind: 'phone' };
  }
  if (!you.lifelines.audience && you.audience == null && pr.level >= 12 && Math.random() < (hard ? 0.25 : 0.1)) {
    return { type: 'lifeline', kind: 'audience' };
  }

  /* ----- chọn đáp án ----- */
  const removed = new Set(you.used50 || []);
  const choices = [0, 1, 2, 3].filter(i => !removed.has(i));
  let pick;
  if (you.phoneHint != null && !removed.has(you.phoneHint) && Math.random() < (hard ? 0.75 : 0.55)) {
    /* nghe theo người thân */
    pick = you.phoneHint;
  } else if (you.audience && Math.random() < (hard ? 0.6 : 0.4)) {
    /* nghe theo khán giả: chọn phương án có tỉ lệ cao nhất */
    let best = choices[0];
    for (const c of choices) if (you.audience[c] > you.audience[best]) best = c;
    pick = best;
  } else if (Math.random() < acc) {
    pick = q.answer;
  } else {
    const wrong = choices.filter(i => i !== q.answer);
    pick = wrong.length ? wrong[rnd(wrong.length)] : q.answer;
  }
  const ms = hard ? 3000 + Math.random() * 5000 : 8000 + Math.random() * 12000;
  return { type: 'answer', opt: pick, ms: Math.round(ms) };
}
