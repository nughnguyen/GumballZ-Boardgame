// 🤖 Bot Nhện — chỉ đọc BÀN CỦA MÌNH + trạng thái công khai từ state thô
// (không đọc bàn của đối thủ, không đọc RNG của engine).
// Khó: ưu tiên (1) nước thu được dãy K→A, (2) nước lật được lá úp,
// (3) nước tạo cột trống, (4) nước xếp dãy cùng chất dài nhất — chọn nước
// dẫn tới vị thế tốt nhất theo evaluatePosition của engine;
// đi nhanh (300–500ms/nước).
// Dễ: đi ngẫu nhiên 1 nước hợp lệ (đúng brief) — mọi nước xếp bài +
// chia thêm đều có cơ hội như nhau; đi chậm (800–1200ms/nước).
// Chống lặp (cả 2 mức): không đi nước ngược đúng nước vừa đi, và tránh
// nước đưa bàn về 1 vị trí đã gặp trong 500 nước gần nhất (bộ nhớ theo
// gid, chỉ dùng để chọn nước — không ảnh hưởng luật hay lockstep).
// Tiến triển: bot ưu tiên nước "có ích" (thu dãy / lật lá úp); không có
// nước có ích thì đi nước cải thiện vị thế (xây liên kết / mở nước có ích);
// chỉ CHIA THÊM khi không còn nước nào cải thiện vị thế — chia sớm chôn
// vùi cả bàn dưới 50 lá mới, ván coi như chết.
import { legalMoves, isProductiveMove, evaluatePosition, simulateMove } from './engine.js?v=1';

export const BOT_NAMES = ['Kẹo', 'Xôi', 'Gấu Bông', 'Đậu', 'Nấm', 'Sữa', 'Mochi', 'Pudding'];

const seenPos = new Map(); /* gid -> mảng hash vị trí gần đây (tối đa 500) */
const stallCount = new Map(); /* gid|pid -> số nước liên tiếp không có ích
   và không chia bài; bot "bỏ cuộc" (xin thua) khi chạm STALL_LIMIT —
   ván Nhện có thể rơi vào thế bế tắc mà vẫn còn nước xếp bài hợp lệ,
   cứ xáo mãi thì ván không bao giờ kết thúc */
const STALL_LIMIT = 250;
function stallKey(s, pid) { return (s.gid || '') + '|' + pid; }
function posHash(prog) {
  return JSON.stringify(prog.cols) + '|' + prog.stock.length;
}
function remember(gid, hash) {
  if (!gid) return;
  let arr = seenPos.get(gid);
  if (!arr) { arr = []; seenPos.set(gid, arr); }
  arr.push(hash);
  if (arr.length > 500) arr.shift();
  if (seenPos.size > 8) { const k = seenPos.keys().next().value; seenPos.delete(k); }
}
function wasSeen(gid, hash) {
  const arr = gid && seenPos.get(gid);
  return !!arr && arr.includes(hash);
}
function applyMoveToHash(prog, m) {
  /* hash vị trí SAU khi đi nước m (không sửa state thật) */
  const cols = prog.cols.map(c => c.map(x => ({ ...x })));
  const moved = cols[m.from].splice(cols[m.from].length - m.count, m.count);
  cols[m.to].push(...moved);
  return JSON.stringify(cols) + '|' + prog.stock.length;
}
function reverseOf(m) {
  return m ? { from: m.to, to: m.from, count: m.count } : null;
}

export function botAction(s, pid) {
  const prog = s.prog && s.prog[pid];
  if (!prog || prog.status !== 'playing' || !prog.cols) return null;
  const p = s.players.find(x => x.id === pid);
  const hard = p && p.level === 'hard';
  /* nhớ vị trí hiện tại trước khi chọn nước (chống lặp vị trí) */
  if (s.gid) remember(s.gid, posHash(prog));
  const moves = legalMoves(prog);
  const last = prog.lastMove || null;
  /* lọc nước ngược đúng nước vừa đi */
  const noReverse = moves.filter(m => !(last && m.from === last.to && m.to === last.from && m.count === last.count));
  const pool0 = noReverse.length ? noReverse : moves;
  const canDeal = prog.stock.length >= 10 && prog.cols.every(c => c.length);
  if (!hard) {
    /* Dễ (đúng brief): đi NGẪU NHIÊN 1 nước hợp lệ — mọi nước xếp bài
       + chia thêm (nếu được) đều có cơ hội như nhau, không ưu tiên gì cả.
       Yếu đúng nghĩa: phá dãy, chia sai lúc, không biết giữ bài. */
    const opts = pool0.slice();
    if (canDeal) opts.push({ type: 'deal' });
    if (!opts.length) return null;
    const pick = opts[Math.floor(Math.random() * opts.length)];
    /* Dễ cũng xin thua nếu xáo vô ích quá lâu (tránh ván kéo dài vô hạn) */
    const key = stallKey(s, pid);
    if (pick.type === 'deal' || isProductiveMove(prog, pick)) {
      stallCount.set(key, 0);
    } else {
      const n = (stallCount.get(key) || 0) + 1;
      if (n >= STALL_LIMIT) { stallCount.delete(key); return { type: 'resign' }; }
      stallCount.set(key, n);
    }
    return pick;
  }
  if (!pool0.length) {
    /* không còn nước xếp bài: chia thêm nếu còn bài và không có cột trống */
    if (prog.stock.length >= 10 && prog.cols.every(c => c.length)) { stallCount.set(stallKey(s, pid), 0); return { type: 'deal' }; }
    return null;
  }
  /* chấm điểm mọi nước (1 lần) để tái dùng cho cả 3 nhánh chọn nước */
  const curEval = evaluatePosition(prog);
  const scored = pool0.map(m => ({ m, sc: evaluatePosition(simulateMove(prog, m)), prod: isProductiveMove(prog, m) }));
  const productive = scored.filter(x => x.prod);
  const improving = scored.filter(x => x.sc > curEval);
  const bestOf = (pool) => { let b = null, bs = -Infinity; for (const x of pool) if (x.sc > bs) { bs = x.sc; b = x; } return b; };
  let pick = null;
  if (productive.length) {
    /* (1) có nước có ích (thu dãy / lật lá úp): chọn nước tốt nhất */
    pick = bestOf(productive).m;
  } else if (improving.length) {
    /* (2) không có nước có ích nhưng có nước cải thiện vị thế (xây liên
       kết cùng chất / mở ra nước có ích): đi nước đó THAY VÌ chia bài vội
       — chia sớm chôn vùi cả bàn dưới 50 lá mới, ván coi như chết */
    const b = bestOf(improving);
    pick = b.m;
  } else if (canDeal) {
    /* (3) không còn nước nào cải thiện vị thế: chia thêm 1 vòng */
    stallCount.set(stallKey(s, pid), 0);
    return { type: 'deal' };
  } else {
    /* (4) không chia được (còn cột trống) và không còn nước cải thiện:
       xáo nước tốt nhất để chờ — bộ đếm bế tắc sẽ xin thua nếu kéo dài */
    const b = bestOf(scored);
    pick = b.m;
  }
  /* tránh lặp vị trí: nếu nước chọn đưa về vị trí đã gặp, thử nước khác */
  const gid = s.gid;
  if (gid && pool0.length > 1) {
    const h1 = applyMoveToHash(prog, pick);
    if (wasSeen(gid, h1)) {
      const alt = scored.find(x => !wasSeen(gid, applyMoveToHash(prog, x.m)));
      if (alt) pick = alt.m;
    }
  }
  /* đếm nước xáo vô ích: chỉ nước có ích (lật lá / thu dãy) mới reset —
     nước "cải thiện điểm" (xây liên kết) KHÔNG tính là tiến triển, vì
     xây liên kết có thể xáo qua lại vô hạn mà không lật được lá nào;
     chạm giới hạn thì bot xin thua */
  const key = stallKey(s, pid);
  if (isProductiveMove(prog, pick)) {
    stallCount.set(key, 0);
  } else {
    const n = (stallCount.get(key) || 0) + 1;
    if (n >= STALL_LIMIT) {
      stallCount.delete(key);
      return { type: 'resign' };
    }
    stallCount.set(key, n);
  }
  return pick;
}
export function botDelay(s, pid) {
  const p = s.players.find(x => x.id === pid);
  if (p && p.level === 'hard') return 300 + Math.random() * 200;
  return 800 + Math.random() * 400;
}
export default botAction;
