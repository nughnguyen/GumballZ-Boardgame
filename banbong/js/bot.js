// 🤖 Bot Bắn Bóng — chỉ đọc SÂN CỦA MÌNH + trạng thái công khai từ
// state thô để mô phỏng cách chơi (không đọc sân của đối thủ, không đọc
// RNG của engine).
// Khó: dự đoán vị trí bóng chạm tới đường vợt (mô phỏng quỹ đạo, tính cả
// nảy tường trái/phải/trên) rồi đặt vợt LỆCH khỏi điểm rơi để ngắm bóng
// về phía còn nhiều gạch (bóng đi thẳng đứng thì chỉ phá được 1 cột rồi
// kẹt vòng lặp — bài học từ probe đầu tiên: bot chỉ căn giữa vợt thì
// thắng solo 0/20 và thua Dễ 18/20 ở đua). Đi nhanh (150–300ms/nước).
// Dễ: bám theo vị trí x hiện tại của bóng + sai số ngẫu nhiên ±70, không
// ngắm; đi chậm (400–700ms/nước).
// Bot chỉ trả về 'setX' khi cần dịch vợt (cách tâm vợt > 4px) — còn
// không thì trả null (đồng hồ tick của chủ phòng vẫn đẩy bóng đi).
import { W, H, PADDLE_W, PADDLE_Y, BALL_R, BRICK_COLS, BRICK_ROWS, BRICK_W, BRICK_GAP, BRICK_X0 } from './engine.js?v=1';

export const BOT_NAMES = ['Kẹo', 'Xôi', 'Gấu Bông', 'Đậu', 'Nấm', 'Sữa', 'Mochi', 'Pudding'];

/* Dự đoán x nơi bóng chạm đường vợt (y = PADDLE_Y - BALL_R): mô phỏng
   từng bước, chỉ nảy tường trái/phải/trên (bỏ qua gạch — gạch có thể
   đổi hướng bóng, bot sẽ dự đoán lại ở nước sau). */
export function predictLanding(ball) {
  let x = ball.x, y = ball.y, vx = ball.vx, vy = ball.vy;
  const targetY = PADDLE_Y - BALL_R;
  for (let i = 0; i < 2000; i++) {
    x += vx; y += vy;
    if (x < BALL_R) { x = BALL_R; vx = Math.abs(vx); }
    else if (x > W - BALL_R) { x = W - BALL_R; vx = -Math.abs(vx); }
    if (y < BALL_R) { y = BALL_R; vy = Math.abs(vy); }
    if (vy > 0 && y >= targetY) return x;
    if (y - BALL_R > H) return x; /* bóng rơi — không cứu được */
  }
  return x;
}

/* Hướng ngắm: phía nào (trái/phải của vị trí bóng) còn nhiều gạch hơn?
   Trả về +1 (ngắm sang phải), -1 (ngắm sang trái). Khi 2 bên bằng nhau
   thì ngắm về cột gạch còn lại gần bóng nhất — KHÔNG bao giờ trả 0,
   vì bóng đi thẳng đứng sẽ chui qua cột đã phá rồi kẹt vòng lặp. */
function aimDir(prog) {
  const bx = prog.ball.x;
  let left = 0, right = 0;
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      if (prog.bricks[r][c] <= 0) continue;
      const cx = BRICK_X0 + c * (BRICK_W + BRICK_GAP) + BRICK_W / 2;
      if (cx < bx) left++; else right++;
    }
  }
  if (right > left) return 1;
  if (left > right) return -1;
  /* bằng nhau: ngắm về viên gạch còn lại gần bóng nhất */
  let best = 0, bestD = Infinity;
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      if (prog.bricks[r][c] <= 0) continue;
      const cx = BRICK_X0 + c * (BRICK_W + BRICK_GAP) + BRICK_W / 2;
      const d = Math.abs(cx - bx);
      if (d < bestD) { bestD = d; best = cx < bx ? -1 : 1; }
    }
  }
  return best;
}

export function botAction(s, pid) {
  const prog = s.prog && s.prog[pid];
  if (!prog || prog.status !== 'playing' || !prog.ball) return null;
  const p = s.players.find(x => x.id === pid);
  const hard = p && p.level === 'hard';
  const center = prog.paddleX + PADDLE_W / 2;
  let target;
  if (hard) {
    /* Ngắm: đặt vợt lệch khỏi điểm rơi để bóng nảy chéo về phía còn
       nhiều gạch. Độ lệch 0.45–0.75 × nửa vợt (≈20–34px) cho
       vx ≈ 0.4–0.6 × tốc độ. Jitter là BẮT BUỘC: ngắm cố định tạo
       quỹ đạo tuần hoàn — bóng đi đúng 1 đường qua khe gạch đã phá,
       không bao giờ chạm gạch còn lại (probe: kẹt 54/60 ở 40000 tick). */
    const landX = predictLanding(prog.ball);
    const dir = aimDir(prog);
    const mag = 0.45 + Math.random() * 0.3;
    const offset = dir * mag * (PADDLE_W / 2);
    target = landX - offset;
  } else {
    /* Dễ: bám theo vị trí x hiện tại của bóng, sai số ngẫu nhiên ±70 */
    target = prog.ball.x + (Math.random() - 0.5) * 140;
  }
  target = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, target));
  if (Math.abs(target - center) <= 4) return null;
  return { type: 'setX', x: target };
}
export function botDelay(s, pid) {
  const p = s.players.find(x => x.id === pid);
  if (p && p.level === 'hard') return 150 + Math.random() * 150;
  return 400 + Math.random() * 300;
}
export default botAction;
