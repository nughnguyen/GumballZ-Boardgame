// 🔊 Âm thanh Blokus — tổng hợp bằng Web Audio API, không cần file ngoài.
// Bật/tắt lưu ở localStorage gumballz-blokus-sound.
const KEY = 'gumballz-blokus-sound';
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
/* đặt mảnh: 1 nốt "tách" cao */
export function place() {
  if (!on) return;
  blip(880, 0.1, 0.06, 'sine');
}
/* nước không hợp lệ: 1 nốt trầm */
export function wrong() {
  if (!on) return;
  blip(160, 0.14, 0.2, 'sawtooth');
}
/* hết lượt: 2 nốt chuông */
export function hint() {
  if (!on) return;
  blip(1046, 0.1, 0.08, 'sine');
  setTimeout(() => blip(1318, 0.1, 0.1, 'sine'), 90);
}
/* bấm ô / chọn: 1 nốt nhẹ */
export function pick() {
  if (!on) return;
  blip(784, 0.08, 0.05, 'sine');
}
/* nước không hợp lệ: 1 nốt trầm ngắn */
export function invalid() {
  if (!on) return;
  blip(180, 0.12, 0.12, 'sawtooth');
}
/* thua: 3 nốt xuống */
export function lose() {
  if (!on) return;
  [392, 330, 262].forEach((f, i) => setTimeout(() => blip(f, 0.14, 0.22, 'sine'), i * 150));
}
/* thắng trận: arpeggio trưởng (C5 – E5 – G5 – C6) */
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
