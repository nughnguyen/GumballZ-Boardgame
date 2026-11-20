// 🔴 Bot Cờ Nhảy — chỉ dùng viewFor (không bao giờ đọc state thô).
// - Dễ: 70% nước bừa, 30% nước tốt.
// - Khó: tham lam theo view — chọn nước làm giảm nhiều nhất tổng
//   bình phương KHOẢNG CÁCH BFS các bi tới tam giác đích (khoảng cách
//   BFS đo theo hình dạng bàn nên bi không bị kẹt ở "hố" cục bộ như khi
//   đo thẳng tới đỉnh; bình phương để kéo cả bi tụt lại phía sau lên,
//   không chỉ đẩy bi đầu đi trước), cộng thưởng thắng ngay.
//   Ngoài tiến độ, bot còn thưởng nước đi MỞ CỬA ĐÍCH (dời bi nhà ra khỏi
//   hàng cửa để bi ngoài bước vào) — nếu không, ở cuối ván khi bi cuối bị
//   chặn ở cửa đích, mọi nước đều "không tiến bộ" và bot sẽ xáo bi qua lại
//   mãi không thắng (lỗi từng gặp: ván Khó–Dễ kẹt 5000 lượt). Lưu ý: KHÔNG
//   dùng "tổng điểm đến của bi ngoài đích" làm thước đo — bi bước vào đích
//   sẽ làm tổng đó GIẢM (nó không còn là bi ngoài nữa) nên bot sẽ phạt oan
//   nước vào đích và chọn xáo bi nhà thay vì thắng (lỗi từng gặp ở ván
//   Khó–Khó, seed 555: bot nhảy bi nhà (-7,2)->(-5,0) qua lại thay vì cho
//   bi (-4,0) bước vào (-5,0)).
// Bot không biết gì ngoài view (bàn công khai hoàn toàn).
import {
  viewFor, legalMovesFromView, TRIANGLES, bfsDistToDest,
  stepDests, jumpDests,
} from './engine.js';

export function botAction(s, pid, level) {
  if (!s || s.phase !== 'playing') return null;
  /* QUAN TRỌNG: bot chỉ nhìn view của chính mình — không đọc state thô */
  const v = viewFor(s, pid);
  const moves = legalMovesFromView(v, pid);
  if (!moves.length) return null;
  const hard = (typeof level === 'string' ? level : level && level.level) === 'hard';
  /* Máy Dễ: 70% đánh bừa */
  if (!hard && Math.random() < 0.7) return moves[Math.floor(Math.random() * moves.length)];
  /* Máy Khó (và 30% của máy Dễ): nước tốt nhất theo view */
  return goodMove(v, moves);
}

/* tổng bình phương khoảng cách BFS các bi của pid tới tam giác đích */
function distSqSum(v, pid) {
  const me = v.players.find(p => p.id === pid);
  if (!me) return 0;
  let sum = 0;
  for (const h of me.marbles) {
    const d = bfsDistToDest(h, me.destTri);
    sum += d * d;
  }
  return sum;
}

/* tập lỗ của 1 tam giác (cache) */
const _triSets = new Map();
function destTriangleHoles(tri) {
  if (!_triSets.has(tri)) _triSets.set(tri, new Set(TRIANGLES[tri]));
  return _triSets.get(tri);
}

/* mô phỏng 1 nước đi trên bản sao của view (không sửa view gốc) */
function simulateMove(v, me, move) {
  const occ = v.occ.slice();
  const marbles = me.marbles.slice();
  const dest = move.path[move.path.length - 1];
  occ[move.from] = null;
  occ[dest] = me.id;
  marbles[marbles.indexOf(move.from)] = dest;
  return {
    ...v,
    occ,
    turn: me.id, /* giữ lượt để stepDests/jumpDests tính được */
    players: v.players.map(p => (p.id === me.id ? { ...p, marbles } : p)),
  };
}

/* có bi ngoài đích nào có nước đi VÀO đích ngay không? (cửa đã mở) */
function canEnterNext(v, me) {
  const destSet = destTriangleHoles(me.destTri);
  for (const h of me.marbles) {
    if (destSet.has(h)) continue;
    if (stepDests(v, me.id, h).some(d => destSet.has(d))) return true;
    if (jumpDests(v, me.id, h, [h]).some(d => destSet.has(d))) return true;
  }
  return false;
}

function scoreMove(v, me, move) {
  if (move.type === 'pass') return -100;
  const before = distSqSum(v, me.id);
  /* nước đi chỉ dời 1 bi: tính lại tổng bằng cách trừ bi cũ, cộng bi mới */
  const from = move.from;
  const dest = move.path[move.path.length - 1];
  const dFrom = bfsDistToDest(from, me.destTri);
  const dDest = bfsDistToDest(dest, me.destTri);
  const after = before - dFrom * dFrom + dDest * dDest;
  /* giảm tổng bình phương khoảng cách BFS = tiến bộ (càng giảm càng tốt).
     Chuỗi nhảy dài tự động có giá trị cao vì nó dời bi đi xa trong 1 lượt. */
  let val = (before - after) * 2;
  /* MỞ CỬA ĐÍCH: nếu trước nước đi không có bi nào vào được đích mà sau
     nước đi thì có (dời bi nhà ra khỏi hàng cửa để bi ngoài bước vào) —
     đây là nước then chốt ở cuối ván, khi bi cuối bị chặn ở cửa đích. */
  const v2 = simulateMove(v, me, move);
  const opensDoor = !canEnterNext(v, me) && canEnterNext(v2, me);
  if (opensDoor) val += 8;
  /* nước không thay đổi gì (không tiến bộ, không mở cửa) thì hơi xấu —
     tránh xáo bi qua lại vô nghĩa ở cuối ván. */
  if (before === after && !opensDoor) val -= 0.3;
  /* thắng ngay thì giá trị lớn nhất: đếm bi trong tam giác đích sau nước đi */
  const destSet = destTriangleHoles(me.destTri);
  let home = 0;
  for (const h of me.marbles) {
    const hh = h === from ? dest : h;
    if (destSet.has(hh)) home++;
  }
  if (home >= 10) val += 100;
  return val;
}

function goodMove(v, moves) {
  const me = v.players.find(p => p.id === v.me);
  if (!me) return moves[0];
  let best = null, bestV = -Infinity;
  for (const m of moves) {
    let val = scoreMove(v, me, m);
    val += Math.random() * 0.4;
    if (val > bestV) { bestV = val; best = m; }
  }
  return best || moves[0];
}

export default { botAction };
