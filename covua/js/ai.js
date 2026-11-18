// 🤖 Máy tính cờ vua: chấm điểm thế cờ + tìm nước (alpha-beta, đào sâu dần, tìm tĩnh khi ăn quân). Dùng cho bot, 💡 gợi ý và thanh đánh giá.
// Chỉ đọc bàn cờ (thông tin công khai). Điểm tính bằng "phần trăm tốt" (100 = hơn 1 tốt), dương là bên đang xét có lợi.
import { pseudo, make, inCheck, legal, pOf, mFrom, mTo, mPromo, PROMO, posKey } from './engine.js?v=1';
const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
/* bảng vị trí (nhìn từ phía Trắng, hàng 0 = hàng 8) */
const PST = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
  ke: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50],
};
export const MATE = 100000;
// điểm thế cờ nhìn từ bên tới lượt
export function evaluate(P) {
  const b = P.b; let sc = 0, heavy = 0;
  for (let i = 0; i < 64; i++) { const p = b[i]; if (p && 'QRqr'.includes(p)) heavy++; }
  const end = heavy <= 2; /* tàn cuộc: vua nên ra giữa bàn */
  for (let i = 0; i < 64; i++) {
    const p = b[i]; if (!p) continue; const k = p.toLowerCase(), W = p !== k, t = k === 'k' && end ? PST.ke : PST[k];
    const v = VAL[k] + t[W ? i : (7 - (i >> 3)) * 8 + (i & 7)]; sc += W ? v : -v;
  }
  for (const ch of P.c) sc += ch === 'K' || ch === 'Q' ? 14 : -14; /* còn quyền nhập thành là có giá: đừng đi Vua lung tung lúc khai cuộc */
  return P.t === 'w' ? sc : -sc;
}
const order = (P, ms) => { const b = P.b; return ms.map(m => { const c = b[(m >> 6) & 63]; return [m, (c ? 10 * VAL[c.toLowerCase()] - VAL[b[m & 63].toLowerCase()] : 0) + (mPromo(m) === 1 ? 800 : 0)]; }).sort((x, y) => y[1] - x[1]).map(x => x[0]); };
let nodes = 0, deadline = 0, stop = false;
function quiesce(P, a, be) {
  const stand = evaluate(P); if (stand >= be) return be; if (stand > a) a = stand;
  for (const m of order(P, pseudo(P, true))) { const Q = make(P, m); if (inCheck(Q, P.t)) continue; const sc = -quiesce(Q, -be, -a); if (sc >= be) return be; if (sc > a) a = sc; }
  return a;
}
function search(P, d, a, be, ply) {
  if ((++nodes & 1023) === 0 && Date.now() > deadline) stop = true; if (stop) return 0;
  const chk = inCheck(P); if (chk) d++; /* đang bị chiếu thì nghĩ sâu thêm một nước */
  if (d <= 0) return quiesce(P, a, be);
  let any = false;
  for (const m of order(P, pseudo(P))) {
    const Q = make(P, m); if (inCheck(Q, P.t)) continue; any = true;
    const sc = -search(Q, d - 1, -be, -a, ply + 1); if (stop) return 0;
    if (sc >= be) return be; if (sc > a) a = sc;
  }
  if (!any) return chk ? -MATE + ply : 0; /* chiếu bí (càng gần càng tệ) hoặc hết nước = hoà */
  return a;
}
// tìm nước hay nhất: trả { move, score (từ phía bên tới lượt), depth, list: [[move, score]…] }
export function think(P, { depth = 3, ms = 600, seen = null } = {}) {
  const ms0 = legal(P); if (!ms0.length) return { move: null, score: inCheck(P) ? -MATE : 0, depth: 0, list: [] };
  let best = { move: ms0[0], score: 0, depth: 0, list: ms0.map(m => [m, 0]) }, ord = order(P, ms0);
  nodes = 0; stop = false; deadline = Date.now() + ms;
  for (let d = 1; d <= depth; d++) {
    const list = []; let a = -MATE * 2;
    for (const m of ord) {
      const Q = make(P, m); let sc = -search(Q, d - 1, -MATE * 2, MATE * 2, 1); /* cửa sổ đầy đủ để có điểm thật của mọi nước (cần cho mức dễ và gợi ý) */ if (stop) break;
      if (seen && seen.has(posKey(Q)) && sc > -50) sc -= 40; /* tránh đi lòng vòng lặp lại thế cũ khi đang không thua */
      list.push([m, sc]); if (sc > a) a = sc;
    }
    if (stop && list.length < ord.length) break;
    list.sort((x, y) => y[1] - x[1]); best = { move: list[0][0], score: list[0][1], depth: d, list }; ord = list.map(x => x[0]);
    if (Math.abs(best.score) > MATE - 100) break; /* đã thấy chiếu bí thì khỏi nghĩ thêm */
  }
  return best;
}
// có chiếu bí trong n nước của bên tới lượt không → nước đầu tiên (hoặc null). Dùng cho cờ thế.
export function mateIn(P, n) {
  for (const m of legal(P)) { const Q = make(P, m), rs = legal(Q); if (!rs.length) { if (inCheck(Q)) return m; continue; } if (n > 1 && rs.every(r => mateIn(make(Q, r), n - 1) != null)) return m; }
  return null;
}
export const LEVELS = { easy: { depth: 1, ms: 200, noise: 140 }, normal: { depth: 2, ms: 500, noise: 22 }, hard: { depth: 4, ms: 900, noise: 0 } };
export function bestMove(P, level = 'normal', seen = null) {
  const L = LEVELS[level] || LEVELS.normal, r = think(P, { depth: L.depth, ms: L.ms, seen }); if (r.move == null) return null;
  if (!L.noise) return r.move;
  const top = r.list[0][1], ok = r.list.filter(x => x[1] >= top - L.noise && (top < MATE - 100 || x[1] >= MATE - 100)); /* mức dễ: chọn ngẫu nhiên trong các nước "tàm tạm", nhưng thấy chiếu bí thì vẫn chiếu */
  return ok[Math.floor(Math.random() * ok.length)][0];
}
export function botAction(s, pid) {
  const me = s.players.find(p => p.id === pid); if (!me || s.phase !== 'playing') return null;
  if (s.undo && s.undo.by !== me.side) return { type: 'undoOk' };
  if (s.offer && s.offer !== me.side) return { type: evaluate(s.pos) * (s.pos.t === me.side ? 1 : -1) < -150 ? 'draw' : 'drawNo' }; /* đang kém thì nhận hoà */
  if (s.pos.t !== me.side) return null;
  const m = bestMove(s.pos, me.level || 'normal', new Set(s.keys)); if (m == null) return null;
  return { type: 'move', from: mFrom(m), to: mTo(m), promo: PROMO[mPromo(m)] };
}
/* bot cũng cần được gọi khi đối thủ xin đi lại / cầu hoà dù chưa tới lượt nó */
export const botWants = s => { const ids = []; if (s.phase !== 'playing') return ids; const t = pOf(s, s.pos.t); ids.push(t.id); for (const p of s.players) if (p.id !== t.id && ((s.undo && s.undo.by !== p.side) || (s.offer && s.offer !== p.side))) ids.push(p.id); return ids; };
