// 🤖 Bot Wordle — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Bot đua đoán cùng 1 từ với người chơi: mỗi lượt đoán 1 từ.
// Máy Dễ: đoán ngẫu nhiên trong từ điển (chưa đoán). Máy Khó: loại trừ —
// chỉ đoán từ còn khớp với tất cả màu đã biết, chọn từ có điểm tần suất
// chữ cái cao nhất để loại được nhiều đáp án nhất. Bot không bao giờ đoán
// từ ngoài từ điển, không nhìn lượt đoán hay đáp án của người khác.
import { WORDS, VALID } from './words.js?v=1';
import { consistent } from './engine.js?v=1';

function candidatesFor(guesses) {
  return WORDS.filter(w => consistent(w, guesses));
}
function freqScore(word, cands) {
  const freq = {};
  for (const c of cands) for (const ch of new Set(c)) freq[ch] = (freq[ch] || 0) + 1;
  let s = 0;
  for (const ch of new Set(word)) s += freq[ch] || 0;
  return s;
}

export function botAction(s, pid, p) {
  if (!s || s.phase !== 'playing') return null;
  const pr = s.prog[pid];
  if (!pr || pr.failed || pr.finishedAt) return null;
  const guessed = new Set(pr.guesses.map(g => g.word));
  if (p && p.level === 'hard') {
    const cands = candidatesFor(pr.guesses).filter(w => !guessed.has(w));
    if (!cands.length) return null;
    let best = cands[0], bestScore = -1;
    for (const w of cands) {
      const sc = freqScore(w, cands);
      if (sc > bestScore) { bestScore = sc; best = w; }
    }
    return { type: 'guess', word: best };
  }
  // Máy Dễ: ngẫu nhiên trong VALID (cả từ không phải đáp án) cho giống người mới chơi
  const pool = [...VALID].filter(w => !guessed.has(w));
  if (!pool.length) return null;
  const word = pool[(Math.random() * pool.length) | 0];
  return { type: 'guess', word };
}
