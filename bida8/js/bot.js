// 🤖 Bot Bida 8-ball — chỉ đọc bàn chung + trạng thái công khai.
// Khó: duyệt mọi cặp (bi mục tiêu, lỗ), tính góc cắt + đường thoáng
// bằng aimFor của engine, rồi MÔ PHỎNG thử 4 ứng viên tốt nhất và chọn
// nước thật sự vào lỗ (sai số ngắm nhỏ ±0.4°); đi nhanh (400–600ms).
// Dễ: chọn ngẫu nhiên 1 trong 5 ứng viên tốt nhất, sai số ngắm lớn
// (±4°) + lực ngẫu nhiên; đi chậm (700–900ms).
// Không có nước vào lỗ: bắn nhẹ vào bi gần nhất (kiểu đánh an toàn).
// Đặt bi cái (ball in hand): thử các điểm ưu tiên, chọn điểm cho nước
// ngắm tốt nhất.
import { aimFor, simulateShot, isFreeSpot, clearPath, groupOf, BALL_R } from './engine.js?v=1';

export const BOT_NAMES = ['Kẹo', 'Xôi', 'Gấu Bông', 'Đậu', 'Nấm', 'Sữa', 'Mochi', 'Pudding'];

export function botDelay(s, pid) {
  const p = s.players.find(x => x.id === pid);
  const hard = p && p.level === 'hard';
  return hard ? 400 + Math.random() * 200 : 700 + Math.random() * 200;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* các bi bot được phép đánh vào (theo nhóm đã chia / bàn mở / bi 8) */
function legalTargetIds(s, pid) {
  const prog = s.prog;
  const balls = prog.balls;
  if (s.solo) {
    /* chơi đơn: mọi bi trừ bi 8; chỉ ngắm bi 8 khi đó là bi cuối cùng */
    const left = balls.filter(b => b.id !== 0 && b.id !== 8 && !b.potted);
    if (left.length) return left.map(b => b.id);
    return balls.filter(b => b.id === 8 && !b.potted).map(b => b.id);
  }
  if (prog.openTable) return balls.filter(b => b.id !== 0 && b.id !== 8 && !b.potted).map(b => b.id);
  const g = prog.groups[pid];
  if (!g) return balls.filter(b => b.id !== 0 && b.id !== 8 && !b.potted).map(b => b.id);
  const own = balls.filter(b => !b.potted && groupOf(b.id) === g).map(b => b.id);
  if (own.length) return own;
  return [8]; /* hết nhóm → chỉ còn bi 8 */
}
function bestCandidates(balls, targets, cuePos = null) {
  const cands = [];
  for (const t of targets) {
    for (let pk = 0; pk < 6; pk++) {
      const a = aimFor(balls, t, pk, cuePos);
      if (a) cands.push(a);
    }
  }
  cands.sort((x, y) => y.score - x.score);
  return cands;
}
/* chọn chỗ đặt bi cái: thử các điểm ưu tiên, lấy điểm cho nước tốt nhất */
function placeSpot(s, pid) {
  const prog = s.prog;
  const targets = legalTargetIds(s, pid);
  const spots = [
    { x: 240, y: 255 }, { x: 480, y: 255 }, { x: 660, y: 255 },
    { x: 240, y: 150 }, { x: 240, y: 360 }, { x: 480, y: 150 },
    { x: 480, y: 360 }, { x: 660, y: 150 }, { x: 660, y: 360 },
    { x: 120, y: 255 }, { x: 840, y: 255 }, { x: 360, y: 255 },
  ];
  let bestSpot = null, bestScore = -Infinity;
  for (const sp of spots) {
    if (!isFreeSpot(prog.balls, sp.x, sp.y)) continue;
    const cands = bestCandidates(prog.balls, targets, sp);
    const sc = cands.length ? cands[0].score : -1000;
    if (sc > bestScore) { bestScore = sc; bestSpot = sp; }
  }
  if (bestSpot) return bestSpot;
  /* hết điểm ưu tiên: quét lưới tìm chỗ trống đầu tiên */
  for (let y = 60; y <= 450; y += 23) {
    for (let x = 60; x <= 900; x += 23) {
      if (isFreeSpot(prog.balls, x, y)) return { x, y };
    }
  }
  return { x: 240, y: 255 };
}

export function botAction(s, pid) {
  const prog = s.prog;
  if (!prog || s.phase !== 'playing' || prog.turn !== pid) return null;
  if (prog.ballInHand === pid) {
    return { type: 'place', ...placeSpot(s, pid) };
  }
  const p = s.players.find(x => x.id === pid);
  const hard = p && p.level === 'hard';
  /* cú phá: bắn thẳng vào bi 1 ở đỉnh tam giác với lực tối đa */
  if (!prog.breakDone) {
    const apex = prog.balls.find(b => b.id === 1);
    const cue = prog.balls[0];
    if (apex && !apex.potted && cue && !cue.potted) {
      return { type: 'shoot', angle: Math.atan2(apex.y - cue.y, apex.x - cue.x), power: 1 };
    }
  }
  const targets = legalTargetIds(s, pid);
  if (!targets.length) return { type: 'resign' };
  const cands = bestCandidates(prog.balls, targets);
  if (!hard) {
    /* Dễ: chọn ngẫu nhiên 1 trong 5 ứng viên tốt nhất, sai số lớn */
    if (cands.length && Math.random() < 0.85) {
      const a = cands[Math.floor(Math.random() * Math.min(cands.length, 5))];
      return {
        type: 'shoot',
        angle: a.angle + (Math.random() - 0.5) * 0.14,
        power: clamp(a.power + (Math.random() - 0.5) * 0.3, 0.15, 1),
      };
    }
    const t = targets[Math.floor(Math.random() * targets.length)];
    const tb = prog.balls.find(b => b.id === t);
    const cue = prog.balls[0];
    return {
      type: 'shoot',
      angle: Math.atan2(tb.y - cue.y, tb.x - cue.x) + (Math.random() - 0.5) * 0.2,
      power: 0.3 + Math.random() * 0.6,
    };
  }
  /* Khó: mô phỏng thử 4 ứng viên tốt nhất, chọn nước thật sự vào lỗ.
     Bỏ nước nào làm bi 8 vào lỗ sớm (không phải mục tiêu) — thua ngay. */
  for (const a of cands.slice(0, 4)) {
    const res = simulateShot(prog.balls, a.angle, a.power);
    if (res.potted.includes(8) && a.targetId !== 8) continue;
    if (res.potted.includes(a.targetId) && !res.potted.includes(0)) {
      return { type: 'shoot', angle: a.angle + (Math.random() - 0.5) * 0.014, power: a.power };
    }
  }
  if (cands.length) {
    const a = cands[0];
    /* kể cả nước dự phòng cũng không được đẩy bi 8 vào lỗ sớm */
    const res = simulateShot(prog.balls, a.angle, a.power);
    if (!res.potted.includes(8) || a.targetId === 8) {
      return { type: 'shoot', angle: a.angle + (Math.random() - 0.5) * 0.02, power: a.power };
    }
  }
  /* không có nước vào lỗ: bắn nhẹ vào bi gần nhất — nhưng phải kiểm tra
     đường đi thoáng (không chạm bi 8 trước) và mô phỏng để không đẩy bi 8
     vào lỗ; nếu không bi nào an toàn thì bắn thật nhẹ vào bi gần nhất. */
  const cue = prog.balls[0];
  const sorted = targets
    .map(t => ({ t, tb: prog.balls.find(b => b.id === t) }))
    .filter(x => x.tb && !x.tb.potted)
    .map(x => ({ ...x, d: Math.hypot(x.tb.x - cue.x, x.tb.y - cue.y) }))
    .sort((a, b) => a.d - b.d);
  for (const { t, tb } of sorted) {
    const angle = Math.atan2(tb.y - cue.y, tb.x - cue.x);
    if (!clearPath(prog.balls, cue, tb, t)) continue;
    const res = simulateShot(prog.balls, angle, 0.25);
    if (res.potted.includes(8) && t !== 8) continue;
    if (res.potted.includes(0)) continue;
    return { type: 'shoot', angle: angle + (Math.random() - 0.5) * 0.02, power: 0.25 };
  }
  const last = sorted.find(x => x.t !== 8) || sorted[0];
  if (!last) return { type: 'resign' };
  return { type: 'shoot', angle: Math.atan2(last.tb.y - cue.y, last.tb.x - cue.x), power: 0.12 };
}
export default { botAction, botDelay, BOT_NAMES };
