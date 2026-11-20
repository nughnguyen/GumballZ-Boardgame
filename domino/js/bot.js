// 🤖 Bot Domino — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Easy: 30% đi bừa, còn lại ưu tiên xả quân nhiều nút.
// Hard: 1-ply — thử từng nước, chấm điểm theo nút xả được + độ khó của đầu
// dây mới (đối thủ càng ít quân khớp đầu dây càng tốt) + giữ quân đôi muộn.
// Không có quân hợp thì rút quân; hết quân rút thì engine tự bỏ lượt.
import { legalPlays, openEnds, tileOf, tilePips, isDouble, cloneState, applyAction, TILES } from './engine.js';

export function legalMoves(s, pid) {
  const out = [];
  for (const m of legalPlays(s, pid)) for (const end of m.ends) out.push({ tile: m.tile, end });
  return out;
}
/* số quân chưa thấy (không ở dây, không ở tay mình) khớp với 1 đầu dây */
function unseenMatching(s, pid, value) {
  const me = s.players.find(p => p.id === pid);
  const seen = new Set([...s.chain.map(c => c.tile), ...(me ? me.hand : [])]);
  let n = 0;
  for (const t of TILES) {
    if (seen.has(t.id)) continue;
    if (t.a === value || t.b === value) n++;
  }
  return n;
}
function scorePlay(s, pid, m) {
  const me = s.players.find(p => p.id === pid);
  const pips = tilePips(m.tile);
  /* mô phỏng nước đi trên bản sao để xem đầu dây mới */
  const c = cloneState(s);
  const r = applyAction(c, pid, { type: 'play', tile: m.tile, end: m.end });
  if (!r.ok) return -999;
  const ends = openEnds(c);
  const after = (me ? me.hand.length : 0) - 1;
  let sc = pips * 3 + Math.random() * 2;
  if (isDouble(m.tile)) sc += 3; /* xả quân đôi sớm: đỡ bị kẹt nút to cuối ván */
  if (after === 1) sc += 15;
  if (after === 0) sc += 100;
  /* đầu dây mới càng ít quân chưa thấy khớp thì đối thủ càng khó theo */
  if (ends.left != null) sc -= unseenMatching(c, pid, ends.left) * 2;
  if (ends.right != null && ends.right !== ends.left) sc -= unseenMatching(c, pid, ends.right) * 2;
  return sc;
}

export function chooseMove(s, pid, level = 'easy') {
  const me = s.players.find(p => p.id === pid);
  if (!me || s.phase !== 'playing' || s.handEnd || s.turn !== pid) return null;
  const moves = legalMoves(s, pid);
  if (!moves.length) {
    if (s.boneyard.length > 0) return { type: 'draw' };
    return null; /* hết quân rút: engine tự bỏ lượt */
  }
  if (level !== 'hard') {
    if (Math.random() < 0.3) { const m = moves[Math.floor(Math.random() * moves.length)]; return { type: 'play', tile: m.tile, end: m.end }; }
    let best = moves[0], bestScore = -Infinity;
    for (const m of moves) {
      const sc = tilePips(m.tile) * 2 + Math.random() * 3;
      if (sc > bestScore) { bestScore = sc; best = m; }
    }
    return { type: 'play', tile: best.tile, end: best.end };
  }
  let best = moves[0], bestScore = -Infinity;
  for (const m of moves) {
    const sc = scorePlay(s, pid, m);
    if (sc > bestScore) { bestScore = sc; best = m; }
  }
  return { type: 'play', tile: best.tile, end: best.end };
}

/* Bot hành động 1 lượt: rút quân khi không có quân hợp, còn không thì đặt quân. */
export function botAction(s, pid, p) {
  if (s.phase !== 'playing' || s.handEnd || s.turn !== pid) return null;
  return chooseMove(s, pid, (p && p.level) || 'easy');
}
