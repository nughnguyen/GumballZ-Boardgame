// 🤖 Bot Ai là Gián Điệp – chỉ dùng thông tin của chính nó (từ của mình + mô tả
// công khai của mọi người). Không đọc từ hay vai trò của người khác.
// Mô tả: lấy câu mẫu gắn với từ của mình (gián điệp cũng chỉ biết từ của nó,
// giống người thật). Bỏ phiếu: nghi ai mô tả "lệch" khỏi từ của mình nhất
// (mô tả của người cùng từ thường trùng từ khóa với từ của mình).
import { WORD_PAIRS } from './words.js?v=1';
import { norm, saysWord } from './engine.js?v=1';

export const GENERIC_DESC = [
  'Thứ này quen lắm, ngày nào mình cũng thấy.',
  'Nói sao nhỉ… nó gắn với thói quen hằng ngày của mình.',
  'Mình gặp nó lần đầu từ hồi còn nhỏ xíu.',
  'Cái này ai cũng biết, khỏi phải nói nhiều.',
];

// số từ khóa của từ mình xuất hiện trong 1 câu mô tả (đã bỏ dấu)
const overlapScore = (text, keys) => {
  const t = norm(text);
  let n = 0;
  for (const k of keys) if (k && t.includes(k)) n++;
  return n;
};

export function botAction(s, pid) {
  const p = s.players.find(x => x.id === pid);
  if (!p || !p.alive) return null;
  const pair = WORD_PAIRS[s.pairId];
  if (!pair) return null;
  if (s.phase === 'describe' && s.turn === pid && !p.described) {
    // Chỉ dùng câu mẫu không chứa từ của mình (phòng khi 1 câu mẫu nào đó
    // lỡ chứa từ: mô tả bị từ chối thì simplenet không hẹn bot lại, ván kẹt).
    const hints = (p.role === 'spy' ? pair.spyHints : pair.civHints)
      .filter(h => !saysWord(h, p.word));
    const pool = hints.length ? hints : GENERIC_DESC;
    const text = Math.random() < 0.85
      ? pool[Math.floor(Math.random() * pool.length)]
      : GENERIC_DESC[Math.floor(Math.random() * GENERIC_DESC.length)];
    return { type: 'describe', text };
  }
  if (s.phase === 'vote' && !p.voted) {
    const myKeys = p.role === 'spy' ? pair.spyKeys : pair.civKeys;
    const others = s.players.filter(x => x.alive && x.id !== pid);
    if (!others.length) return null;
    let best = null, bestScore = Infinity;
    for (const o of others) {
      const d = s.descs.find(x => x.pid === o.id);
      const score = d ? overlapScore(d.text, myKeys) : 0;
      const jitter = Math.random() * 0.4; // nhiễu để bot không đoán máy móc
      if (score + jitter < bestScore) { bestScore = score + jitter; best = o; }
    }
    if (Math.random() < 0.15) best = others[Math.floor(Math.random() * others.length)]; // 15% bỏ phiếu ngẫu nhiên
    return best ? { type: 'vote', target: best.id } : null;
  }
  return null;
}
