// 🤖 Bot Mạt Chược — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Bot đua gỡ cặp trên bàn CỦA MÌNH: mỗi lượt gỡ 1 cặp.
// Máy Dễ gỡ bừa 1 cặp trống; Máy Khó gỡ cặp mở khóa nhiều quân nhất (gỡ xong
// thì nhiều quân khác được trống). Hết cặp thì xào bài nếu còn lượt, không thì
// thôi (engine sẽ tính là kẹt). Bot không nhìn bàn của người khác, chỉ gỡ
// bàn của chính mình. Tốc độ đặt ở botDelay trong main.js.
import { allPairs, unblockedBy } from './engine.js?v=1';

export function botAction(s, pid, p) {
  if (!s || s.phase !== 'playing') return null;
  const pr = s.prog[pid];
  if (!pr || pr.failed || pr.finishedAt) return null;
  const pairs = allPairs(pr.tiles);
  if (!pairs.length) {
    if (pr.shufflesLeft > 0) return { type: 'shuffle' };
    return null;
  }
  const hard = (typeof p === 'string' ? p : p && p.level) === 'hard';
  if (!hard) {
    const [a, b] = pairs[(Math.random() * pairs.length) | 0];
    return { type: 'remove', a, b };
  }
  let best = pairs[0], bestScore = -Infinity;
  for (const [a, b] of pairs) {
    const ta = pr.tiles.find(t => t.id === a);
    const tb = pr.tiles.find(t => t.id === b);
    // Mở khóa được bao nhiêu quân + sau nước này còn mấy cặp để đi tiếp
    // (giữ bàn "thoáng" mới tránh kẹt) + ưu tiên quân tầng cao.
    const un = unblockedBy(pr.tiles, ta, tb);
    const rest = pr.tiles.map(o => (o.id === a || o.id === b) ? { ...o, removed: true } : o);
    const pairsAfter = allPairs(rest).length;
    const sc = un * 5 + pairsAfter * 3 + (ta.z + tb.z);
    if (sc > bestScore) { bestScore = sc; best = [a, b]; }
  }
  return { type: 'remove', a: best[0], b: best[1] };
}
