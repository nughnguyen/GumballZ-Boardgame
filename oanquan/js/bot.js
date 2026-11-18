// 🤖 Bot Ô Ăn Quan — 2 mức: dễ (ngẫu nhiên), khó (mô phỏng minimax độ sâu 3).
// Khó ưu tiên nước ăn nhiều điểm nhất (đặc biệt ăn Quan), tránh để đối phương ăn Quan
// ở lượt sau, và cộng điểm cho nước cứu dân/không chững.
// Bot chỉ dùng thông tin công khai trên bàn (toàn bộ bàn đều nhìn thấy được).
import { cloneState, legalMoves, applyMove, scores, cellTotal, isMandarin } from './engine.js';

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
/* điểm ăn được ngay của 1 nước: Dân ăn được + Quan ăn được × giá trị Quan */
function eatValue(r, qv) {
  if (!r.ok) return -Infinity;
  return (r.eaten?.d || 0) + (r.eaten?.q || 0) * qv;
}
/* đánh giá trạng thái theo góc nhìn của pid (càng cao càng tốt) */
function evaluate(s, pid) {
  const sc = scores(s);
  const me = sc.find(x => x.id === pid), foe = sc.find(x => x.id !== pid);
  let v = (me.total - foe.total) * 10;
  /* ăn Quan của đối phương ở lượt sau là mối đe doạ lớn: trừ điểm nếu đối phương đang có
     nước ăn được Quan ngay (kiểm tra nhanh 1 lượt) */
  if (s.phase === 'playing' && s.turn !== pid) {
    for (const m of legalMoves(s, foe.id)) {
      const c = cloneState(s), r = applyMove(c, foe.id, m);
      if (r.ok && (r.eaten?.q || 0) > 0) v -= 60 * (r.eaten.q || 0);
    }
  }
  /* quân còn trên bàn phía mình là tài sản, quân phía đối phương là mối đe doạ nhẹ */
  return v;
}
export function hardMove(s, pid, depth = 3) {
  const moves = legalMoves(s, pid);
  if (!moves.length) return null;
  const qv = s.opts.quanValue || 10;
  let best = null, bestScore = -Infinity;
  for (const m of moves) {
    const c = cloneState(s);
    const r = applyMove(c, pid, m);
    if (!r.ok) continue;
    let v = eatValue(r, qv) * 10;
    if (r.ended && c.winner === pid) v += 1000;
    if (r.ended && c.winner && c.winner !== pid) v -= 1000;
    if (r.rescue) v += 2; /* cứu dân thành công là tốt (không bị kẹt) */
    if (r.rescueFailed) v -= 500; /* để đối phương kẹt cứu dân thì ván kết thúc — tốt nếu mình đang dẫn */
    /* nhìn trước: đối phương đi nước tốt nhất của họ (minimax 2–3 nước) */
    if (!r.ended && depth > 1) {
      const foeId = c.turn;
      let foeBest = -Infinity;
      for (const fm of legalMoves(c, foeId)) {
        const c2 = cloneState(c), r2 = applyMove(c2, foeId, fm);
        if (!r2.ok) continue;
        let fv = eatValue(r2, qv) * 10;
        if (depth > 2 && !r2.ended) {
          const c3 = cloneState(c2);
          const myMoves = legalMoves(c3, pid);
          let myBest = -Infinity;
          for (const mm of myMoves) {
            const c4 = cloneState(c3), r4 = applyMove(c4, pid, mm);
            if (r4.ok) myBest = Math.max(myBest, eatValue(r4, qv) * 10);
          }
          fv -= (myBest === -Infinity ? 0 : myBest);
        }
        foeBest = Math.max(foeBest, fv);
      }
      v -= (foeBest === -Infinity ? 0 : foeBest);
    }
    v += evaluate(c, pid) * 0.1;
    if (v > bestScore) { bestScore = v; best = m; }
  }
  return best || pick(moves);
}
export function chooseMove(state, pid, level = 'easy') {
  const moves = legalMoves(state, pid);
  if (!moves.length) return null;
  if (level === 'hard') return hardMove(state, pid, 3);
  return pick(moves);
}
export default { chooseMove, hardMove };
