// 🔊 Âm thanh The Resistance — tổng hợp bằng Web Audio API, không cần file ngoài.
// Bật/tắt lưu ở localStorage gumballz-resistance-sound.
const KEY = 'gumballz-resistance-sound';
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
/* bấm nút / chọn đáp án: 1 nốt nhẹ */
export function pick() {
  if (!on) return;
  blip(784, 0.08, 0.05, 'sine');
}
/* đoán đúng: 2 nốt lên */
export function correct() {
  if (!on) return;
  blip(659, 0.12, 0.09, 'sine');
  setTimeout(() => blip(880, 0.12, 0.12, 'sine'), 100);
}
/* đoán sai: 1 nốt trầm */
export function wrong() {
  if (!on) return;
  blip(160, 0.14, 0.25, 'sawtooth');
}
/* lật bài: 1 nốt chuông */
export function reveal() {
  if (!on) return;
  blip(1046, 0.1, 0.08, 'sine');
  setTimeout(() => blip(1318, 0.1, 0.1, 'sine'), 90);
}
/* hết giờ: 2 nốt xuống */
export function timeout() {
  if (!on) return;
  blip(330, 0.12, 0.15, 'sine');
  setTimeout(() => blip(220, 0.12, 0.2, 'sine'), 140);
}
/* thua: 3 nốt xuống */
export function lose() {
  if (!on) return;
  [392, 330, 262].forEach((f, i) => setTimeout(() => blip(f, 0.14, 0.22, 'sine'), i * 150));
}
/* thắng: arpeggio trưởng dài */
export function winJingle() {
  if (!on) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
    const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = a.createGain();
    const st = t + i * 0.13;
    g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.26, st + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, st + 0.5);
    o.connect(g); g.connect(a.destination); o.start(st); o.stop(st + 0.55);
  });
}
/* bấm nút không hợp lệ */
export function invalid() {
  if (!on) return;
  blip(180, 0.12, 0.12, 'sawtooth');
}
export default { isSoundOn, setSound, pick, correct, wrong, reveal, timeout, lose, winJingle, invalid };
