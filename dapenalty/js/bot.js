// 🤖 Bot Đá Penalty — chỉ đọc lịch sử sút/bắt công khai trong state.
// Thủ môn Khó: đọc thói quen sút của đối thủ (vùng sút nhiều nhất) và
// đổ người vào đó 65% số lần (75% nếu đối thủ sút trùng 2 cú gần nhất);
// còn lại chọn góc. Thủ môn Dễ: chọn ngẫu nhiên.
// Sút Khó: chọn góc 70%, tránh vùng thủ môn hay đổ nhất; Sút Dễ: ngẫu nhiên.
// Đi nhanh (400–600ms) khi Khó, chậm (700–900ms) khi Dễ.
// Bot KHÔNG giữ bộ nhớ module-level: mọi thói quen đọc từ prog.kicks
// trong state nên không rò rỉ giữa các ván (bài học từ Nhện).
import { ZONES } from './engine.js?v=1';

export const BOT_NAMES = ['Văn Lâm', 'Quang Hải', 'Tiến Linh', 'Công Phượng', 'Văn Hậu', 'Hùng Dũng', 'Tuấn Anh', 'Xuân Son'];

export function botDelay(s, pid) {
  const p = s.players.find(x => x.id === pid);
  const hard = p && p.level === 'hard';
  return hard ? 400 + Math.random() * 200 : 700 + Math.random() * 200;
}
const CORNERS = ['tl', 'tr', 'bl', 'br'];
const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
function freqOf(zones) {
  const f = {};
  for (const z of zones) f[z] = (f[z] || 0) + 1;
  return f;
}
function mostFreq(f) {
  let best = null, n = 0;
  for (const z of Object.keys(f)) if (f[z] > n) { n = f[z]; best = z; }
  return best;
}

/* thủ môn chọn hướng đổ người */
function keepZone(s, pid, hard) {
  const prog = s.prog;
  const shooter = prog.shooter;
  if (!hard) return rnd(ZONES);
  const hist = prog.kicks.filter(k => k.shooter === shooter).map(k => k.shootZone);
  if (hist.length >= 2) {
    /* đối thủ sút trùng 2 cú gần nhất → bắt bài ngay */
    const last2 = hist.slice(-2);
    if (last2[0] === last2[1] && Math.random() < 0.75) return last2[0];
  }
  if (hist.length >= 3) {
    const f = freqOf(hist);
    const top = mostFreq(f);
    if (top && f[top] >= 2 && Math.random() < 0.65) return top;
  }
  /* mặc định: đổ góc (khó sút vào góc hơn giữa) */
  return Math.random() < 0.6 ? rnd(CORNERS) : rnd(ZONES);
}
/* người sút chọn góc sút — đơn giản mà hiệu quả: sút đều các ô, chỉ
   tránh đúng 1 ô thủ môn hay đổ nhất. (Các bản "thông minh" hơn đều
   phản tác dụng: tránh cả vùng kề thì dồn mình vào ít ô, thủ môn bắt
   bài tốt hơn; sút vào ô ít bị đổ nhất thì lặp lại chu trình đoán
   được — đo được 5.9 bàn/10, tệ hơn sút ngẫu nhiên 7.7 bàn/10.) */
function shootZone(s, pid, hard) {
  const prog = s.prog;
  const keeper = prog.keeper;
  if (!hard) return rnd(ZONES);
  const hist = prog.kicks.filter(k => k.keeper === keeper).map(k => k.keepZone);
  const f = freqOf(hist);
  const top = hist.length >= 2 ? mostFreq(f) : null;
  const pool = top ? ZONES.filter(z => z !== top) : ZONES;
  return rnd(pool);
}

export function botAction(s, pid) {
  const prog = s.prog;
  if (!prog || s.phase !== 'playing') return null;
  if (pid !== prog.shooter && pid !== prog.keeper) return null;
  if (prog.picks[pid] !== undefined) return null;
  const p = s.players.find(x => x.id === pid);
  const hard = p && p.level === 'hard';
  if (pid === prog.shooter) return { type: 'pick', zone: shootZone(s, pid, hard) };
  return { type: 'pick', zone: keepZone(s, pid, hard) };
}
export default { botAction, botDelay, BOT_NAMES };
