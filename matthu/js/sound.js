// 🔊 Âm thanh Mật Thư — tổng hợp bằng Web Audio API, không cần file ngoài.
// "lật" khi lật lá, 2 nốt lên khi đoán đúng, nốt trầm khi đoán sai,
// 3 nốt xuống khi chạm sát thủ, arpeggio khi thắng.
// Bật/tắt lưu ở localStorage gumballz-matthu-sound.
const KEY = 'gumballz-matthu-sound';
let ctx = null, on = true;
try { on = localStorage.getItem(KEY) !== '0'; } catch (e) {}
export const isSoundOn = () => on;
export function setSound(v) { on = !!v; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {} }
function ac() {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
function blip(freq, vol, dur = 0.07, type = 'triangle') {
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.01);
}
/* tiếng lật lá: 1 tiếng "tách" nhẹ */
export function flip() {
  if (!on) return;
  blip(900, 0.12, 0.05);
}
/* tiếng đoán đúng: 2 nốt đi lên */
export function correct() {
  if (!on) return;
  blip(660, 0.13, 0.09);
  setTimeout(() => blip(880, 0.13, 0.12), 90);
}
/* tiếng đoán sai: 1 nốt trầm */
export function wrong() {
  if (!on) return;
  blip(196, 0.13, 0.18, 'sawtooth');
}
/* tiếng chạm sát thủ: 3 nốt xuống, trầm dần */
export function assassin() {
  if (!on) return;
  [330, 262, 165].forEach((f, i) => setTimeout(() => blip(f, 0.15, 0.25, 'sawtooth'), i * 170));
}
/* tiếng gợi ý đã gửi: 1 nốt "ting" */
export function clue() {
  if (!on) return;
  blip(1046, 0.1, 0.08, 'sine');
}
/* tiếng nước không hợp lệ: 1 nốt trầm ngắn */
export function invalid() {
  if (!on) return;
  blip(180, 0.12, 0.12, 'sawtooth');
}
/* tiếng thua: 3 nốt xuống */
export function lose() {
  if (!on) return;
  [392, 330, 262].forEach((f, i) => setTimeout(() => blip(f, 0.14, 0.22, 'sine'), i * 150));
}
/* tiếng thắng: arpeggio trưởng (C5 – E5 – G5 – C6) */
export function winJingle() {
  if (!on) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = a.createGain();
    const st = t + i * 0.11;
    g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.26, st + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, st + 0.5);
    o.connect(g); g.connect(a.destination); o.start(st); o.stop(st + 0.55);
  });
}
