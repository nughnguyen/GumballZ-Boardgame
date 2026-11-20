// 🤖 Bot Kéo Búa Bao — chỉ đọc lịch sử lựa chọn công khai trong state.
// Máy Khó: đọc lựa chọn đối thủ hay ra nhất và chặn bằng lựa chọn khắc
// nó 65% số lần (75% nếu đối thủ ra trùng 2 vòng gần nhất); còn lại
// chọn ngẫu nhiên. Máy Dễ: chọn ngẫu nhiên.
// Đi nhanh (400–600ms) khi Khó, chậm (700–900ms) khi Dễ.
// Bot KHÔNG giữ bộ nhớ module-level: mọi thói quen đọc từ prog.rounds
// trong state nên không rò rỉ giữa các ván (bài học từ Nhện).
import { CHOICES } from './engine.js?v=1';

export const BOT_NAMES = ['Minh Quân', 'Đức Anh', 'Tuấn Anh', 'Hải Đăng', 'Quốc Bảo', 'Thanh Tùng', 'Văn Đức', 'Hồng Sơn'];

export function botDelay(s, pid) {
  const p = s.players.find(x => x.id === pid);
  const hard = p && p.level === 'hard';
  return hard ? 400 + Math.random() * 200 : 700 + Math.random() * 200;
}
const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
/* lựa chọn khắc c: Kéo khắc Bao, Bao khắc Búa, Búa khắc Kéo. */
const COUNTER = { keo: 'bua', bua: 'bao', bao: 'keo' };
export function counterOf(c) { return COUNTER[c] || rnd(CHOICES); }
function freqOf(choices) {
  const f = {};
  for (const c of choices) f[c] = (f[c] || 0) + 1;
  return f;
}
function mostFreq(f) {
  let best = null, n = 0;
  for (const c of Object.keys(f)) if (f[c] > n) { n = f[c]; best = c; }
  return best;
}

export function botAction(s, pid) {
  const prog = s.prog;
  if (!prog || s.phase !== 'playing') return null;
  if (!s.players.some(p => p.id === pid)) return null;
  if (prog.picks[pid] !== undefined) return null;
  const p = s.players.find(x => x.id === pid);
  const hard = p && p.level === 'hard';
  if (!hard) return { type: 'pick', choice: rnd(CHOICES) };
  const other = s.players.find(q => q.id !== pid);
  const hist = (prog.rounds || []).map(r => r.picks && r.picks[other.id]).filter(c => CHOICES.includes(c));
  if (hist.length >= 2) {
    /* đối thủ ra trùng 2 vòng gần nhất → bắt bài ngay */
    const last2 = hist.slice(-2);
    if (last2[0] === last2[1] && Math.random() < 0.75) return { type: 'pick', choice: counterOf(last2[0]) };
  }
  if (hist.length >= 3) {
    const f = freqOf(hist);
    const top = mostFreq(f);
    if (top && f[top] >= 2 && Math.random() < 0.65) return { type: 'pick', choice: counterOf(top) };
  }
  return { type: 'pick', choice: rnd(CHOICES) };
}
export default { botAction, botDelay, BOT_NAMES };
