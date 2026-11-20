// 🤖 Bot Vẽ Truyền Tin.
// Bot đoán: đọc từ của bức vẽ từ state gốc CHỈ để giả lập độ chính
// xác khi đoán — ngoài đời thật bot "nhìn" bức vẽ rồi đoán; ở đây bot
// không xem được nét vẽ nên mô phỏng bằng xác suất (giống bot Ai Là
// Triệu Phú / 2 Thật 1 Giả / Đoán Hành Động / Wavelength). Bot KHÔNG
// đọc đoán của người khác, không xem sổ người khác cầm, không xem
// cả chuỗi. Đoán đúng với xác suất acc (Dễ 0.35 / Khó 0.65), đoán
// sai thì chọn 1 từ cùng nhóm (không bao giờ trùng từ đúng).
// Bot vẽ: không vẽ thật — trả về vài nét nguệch ngoạc ngẫu nhiên
// (phác thảo máy). Ở chế độ đấu máy, sổ của máy do engine tự chơi
// bằng LCG (genScribble), không qua bot này.
import { WORDS, PALETTE, BRUSH_SIZES } from './words.js?v=1';
import { normalizeGuess, holderOf, heldBook, stepKind } from './engine.js?v=1';

export function botLevel(s, pid) {
  const p = (s.players || []).find(x => x.id === pid);
  return p && p.level ? p.level : (s.botLevel || 'easy');
}
export function botAcc(level) { return level === 'hard' ? 0.65 : 0.35; }

/* bot làm hành động cho lượt của mình: vẽ → nét nguệch ngoạc;
   đoán → đoán theo xác suất. Đọc từ bức vẽ từ state gốc CHỈ để
   giả lập độ chính xác (xem chú thích đầu file). */
export function botAction(s, pid, level) {
  if (!s || s.phase !== 'playing') return null;
  const lv = typeof level === 'string' ? level : botLevel(s, pid);
  const acc = botAcc(lv);
  const b = heldBook(s, pid);
  if (b < 0) return null;
  const book = s.books[b];
  if (stepKind(s.step) === 'draw') {
    /* phác thảo máy: 3–5 nét nguệch ngoạc ngẫu nhiên */
    const strokes = [];
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      let x = 60 + Math.random() * 520;
      let y = 60 + Math.random() * 280;
      const pts = [[Math.round(x), Math.round(y)]];
      const m = 4 + Math.floor(Math.random() * 7);
      for (let j = 0; j < m; j++) {
        x = Math.max(8, Math.min(632, x + (Math.random() - 0.5) * 160));
        y = Math.max(8, Math.min(392, y + (Math.random() - 0.5) * 120));
        pts.push([Math.round(x), Math.round(y)]);
      }
      strokes.push({ color: PALETTE[Math.floor(Math.random() * PALETTE.length)], width: BRUSH_SIZES[Math.floor(Math.random() * BRUSH_SIZES.length)], pts });
    }
    return { type: 'draw', strokes };
  }
  /* đoán: bức vẽ ở entry cuối của sổ đang cầm */
  const last = book.entries[book.entries.length - 1];
  const target = last && last.type === 'drawing' ? last.word : book.curWord;
  if (Math.random() < acc) return { type: 'guess', text: target };
  const cat = last && last.cat ? last.cat : null;
  const pool = WORDS.filter(x => normalizeGuess(x.word) !== normalizeGuess(target) && (!cat || x.cat === cat));
  const use = pool.length ? pool : WORDS.filter(x => normalizeGuess(x.word) !== normalizeGuess(target));
  return { type: 'guess', text: use[Math.floor(Math.random() * use.length)].word };
}

/* độ trễ giả người: đoán sau 5–20s (Dễ) / 3–10s (Khó); vẽ nhanh hơn 1–4s */
export function botDelay(s, pid) {
  const lv = botLevel(s, pid);
  if (stepKind(s.step) === 'draw') return 1000 + Math.random() * 3000;
  return lv === 'hard' ? 3000 + Math.random() * 7000 : 5000 + Math.random() * 15000;
}

export default { botAction, botDelay, botLevel, botAcc };
