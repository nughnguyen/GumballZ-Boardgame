// 🎲 Âm thanh Backgammon — tổng hợp bằng Web Audio API, không cần file ngoài.
// Bật/tắt lưu ở localStorage gumballz-backgammon-sound.
const KEY = 'gumballz-backgammon-sound';
let ctx = null, on = true;
try { on = localStorage.getItem(KEY) !== '0'; } catch (e) {}
export const isSoundOn = () => on;
export function setSound(v) { on = !!v; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {} }
function ac() {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
function blip(freq, vol, dur = 0.07, type = 'triangle', slideTo = null) {
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator(); o.type = type; o.frequency.value = freq;
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.01);
}
function knock(vol = 0.3, freq = 900) {
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  const len = Math.max(1, Math.floor(a.sampleRate * 0.04));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  const g = a.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(a.destination); src.start(t);
}
/* đi quân: tiếng gõ gỗ nhẹ */
export function place() {
  if (!on) return;
  blip(320, 0.12, 0.06, 'triangle');
  knock(0.18, 900);
}
/* đánh trúng blot: tiếng "bốp" trầm */
export function eat() {
  if (!on) return;
  blip(180, 0.2, 0.16, 'sine', 70);
  knock(0.3, 700);
}
/* chọn / bỏ chọn: 1 nốt nhẹ */
export function hint() {
  if (!on) return;
  blip(660, 0.08, 0.05, 'sine');
}
/* bấm chọn: 1 nốt nhẹ */
export function pick() {
  if (!on) return;
  blip(784, 0.08, 0.05, 'sine');
}
/* nước không hợp lệ: 1 nốt trầm ngắn */
export function invalid() {
  if (!on) return;
  blip(180, 0.12, 0.12, 'sawtooth');
}
/* bấm nút thường: 1 nốt nhẹ */
export function click() {
  if (!on) return;
  blip(520, 0.08, 0.05, 'triangle');
}
/* gieo xúc xắc: 2 tiếng lách cách */
export function dice() {
  if (!on) return;
  knock(0.35, 2400);
  setTimeout(() => knock(0.3, 1800), 90);
}
/* ra quân: 2 nốt chuông lên cao */
export function bearOff() {
  if (!on) return;
  blip(660, 0.12, 0.1, 'sine');
  setTimeout(() => blip(880, 0.12, 0.14, 'sine'), 90);
}
/* đề nghị gấp đôi: 2 nốt cảnh báo */
export function double() {
  if (!on) return;
  blip(440, 0.1, 0.1, 'square');
  setTimeout(() => blip(554, 0.1, 0.13, 'square'), 110);
}
/* thua / hòa: 3 nốt xuống */
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
