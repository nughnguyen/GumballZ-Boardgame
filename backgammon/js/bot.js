// 🎲 Bot Backgammon — chỉ dùng viewFor (không bao giờ đọc state thô).
// - Dễ: 70% chọn chuỗi nước đi bừa, 30% chọn chuỗi tốt nhất; không bao
//   giờ đề nghị gấp đôi; gần như luôn chấp nhận gấp đôi.
// - Khó: liệt kê mọi chuỗi nước đi đầy đủ (đã lọc theo luật dùng tối đa
//   xúc xắc) và chọn chuỗi tốt nhất theo điểm vị thế: giảm pip, đánh
//   trúng blot, tạo điểm (2+ quân), ra quân, ít blot hở — cộng thưởng
//   thắng ngay. Gấp đôi khi đang hơn pip rõ rệt; từ chối gấp đôi khi
//   đang thua xa và có nguy cơ bị gammon.
// Bot không biết gì ngoài view (bàn + xúc xắc đều công khai).
import {
  viewFor, legalMovesFromView, sequencesFromView, applyMoveToView,
  pipCount,
} from './engine.js';

export function botAction(s, pid, level) {
  if (!s || s.phase !== 'playing') return null;
  /* QUAN TRỌNG: bot chỉ nhìn view của chính mình — không đọc state thô */
  const v = viewFor(s, pid);
  const hard = (typeof level === 'string' ? level : level && level.level) === 'hard';
  const me = v.players.find(p => p.id === pid);
  if (!me) return null;

  /* đang được hỏi có chấp nhận gấp đôi không */
  if (v.step === 'double' && v.doubleOffer) {
    return decideDouble(v, me, hard);
  }

  /* trước khi gieo: Khó có thể đề nghị gấp đôi */
  if (v.step === 'roll') {
    if (hard && shouldDouble(v, me)) return { type: 'double' };
    return { type: 'roll' };
  }

  /* đang đi: không còn nước nào thì bỏ lượt */
  if (v.step !== 'move') return null;
  const moves = legalMovesFromView(v, pid).filter(m => m.type === 'move');
  if (!moves.length) return { type: 'pass' };
  const { legal } = sequencesFromView(v, pid);
  if (!legal.length || !legal[0].length) return { type: 'pass' };
  /* Máy Dễ: 70% chuỗi bừa */
  if (!hard && Math.random() < 0.7) {
    const seq = legal[Math.floor(Math.random() * legal.length)];
    return seq[0];
  }
  /* Máy Khó (và 30% của máy Dễ): chuỗi tốt nhất */
  return bestSequenceFirst(v, me, legal);
}

/* ---------- đánh giá 1 chuỗi nước đi đầy đủ ---------- */
function blotsOf(points, pid) {
  let n = 0;
  for (const pt of points) if (pt.owner === pid && pt.count === 1) n++;
  return n;
}
function pointsMade(points, pid) {
  let n = 0;
  for (const pt of points) if (pt.owner === pid && pt.count >= 2) n++;
  return n;
}
function scoreSequence(v, me, seq) {
  let vv = v;
  let hits = 0;
  let borne = 0;
  for (const m of seq) {
    if (m.to !== 'off') {
      const dest = vv.points[m.to];
      if (dest && dest.owner && dest.owner !== me.id && dest.count === 1) hits++;
    } else {
      borne++;
    }
    vv = applyMoveToView(vv, me.id, m);
  }
  const meAfter = vv.players.find(p => p.id === me.id);
  const oppAfter = vv.players.find(p => p.id !== me.id);
  const pipsBefore = pipCount(me, v.points);
  const pipsAfter = pipCount(meAfter, vv.points);
  let val = (pipsBefore - pipsAfter) * 1.0;
  val += hits * 6;
  val += (pointsMade(vv.points, me.id) - pointsMade(v.points, me.id)) * 3;
  val -= (blotsOf(vv.points, me.id) - blotsOf(v.points, me.id)) * 2;
  val += borne * 8;
  val += oppAfter.bar * 2; /* địch kẹt trên bar là tốt */
  if (meAfter.off >= 15) val += 100;
  /* tránh để quân lẻ loi ở sân nhà địch quá lâu: trừ nhẹ blot trong
     sân nhà địch (dễ bị đánh trúng khi địch về) */
  val -= blotsOf(vv.points, me.id) * 0.5;
  return val;
}
function bestSequenceFirst(v, me, legal) {
  let best = null, bestV = -Infinity;
  for (const seq of legal) {
    let val = scoreSequence(v, me, seq);
    val += Math.random() * 0.4; /* phá hòa ngẫu nhiên */
    if (val > bestV) { bestV = val; best = seq; }
  }
  return (best && best[0]) || legal[0][0];
}

/* ---------- xúc xắc gấp đôi ---------- */
function shouldDouble(v, me) {
  /* chỉ gấp đôi khi đang hơn pip rõ và không quá hở */
  if (v.cube.owner && v.cube.owner !== me.id) return false;
  const opp = v.players.find(p => p.id !== me.id);
  if (!opp) return false;
  const myPips = pipCount(me, v.points);
  const oppPips = pipCount(opp, v.points);
  if (oppPips - myPips < 20) return false;
  if (blotsOf(v.points, me.id) > 3) return false;
  return true;
}
function decideDouble(v, me, hard) {
  const opp = v.players.find(p => p.id !== me.id);
  const myPips = pipCount(me, v.points);
  const oppPips = opp ? pipCount(opp, v.points) : 0;
  if (!hard) {
    /* Máy Dễ: gần như luôn chấp nhận */
    return Math.random() < 0.9 ? { type: 'double-accept' } : { type: 'double-decline' };
  }
  /* Máy Khó: từ chối khi đang thua xa và địch sắp gammon mình
     (địch gần ra hết mà mình còn nhiều pip) */
  const losingBadly = myPips - oppPips >= 35 && oppPips < 60;
  if (losingBadly) return { type: 'double-decline' };
  return { type: 'double-accept' };
}

export default { botAction };
