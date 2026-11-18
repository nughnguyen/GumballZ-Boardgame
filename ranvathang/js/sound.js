// 🔊 Âm thanh Rắn và Thang — tổng hợp bằng Web Audio API, không cần file ngoài.
// Lắc xúc xắc: tiếng lách cách; bước đi: tiếng "tách" nhẹ; leo thang: nốt đi
// lên; trượt rắn: tiếng trượt đi xuống; thắng: nhạc thắng. Bật/tắt lưu ở
// localStorage gumballz-ranvathang-sound.
const KEY = 'gumballz-ranvathang-sound';
let ctx = null, on = true;
try { on = localStorage.getItem(KEY) !== '0'; } catch (e) {}
export const isSoundOn = () => on;
export function setSound(v) { on = !!v; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {} }
function ac() {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
function blip(a, t, freq, dur, type = 'sine', vol = 0.22) {
  const o = a.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
}
function noiseBurst(a, t, dur, freq, vol) {
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource(); src.buffer = buf;
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 1.2;
  const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(bp); bp.connect(g); g.connect(a.destination); src.start(t);
}
/* tiếng lắc xúc xắc: 3 tiếng lách cách liền nhau */
export function rattle() {
  if (!on) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  for (let i = 0; i < 3; i++) noiseBurst(a, t + i * 0.09, 0.05, 2400 + Math.random() * 1200, 0.4);
}
/* tiếng bước đi: 1 tiếng "tách" nhẹ */
export function step() {
  if (!on) return;
  const a = ac(); if (!a) return;
  blip(a, a.currentTime, 660, 0.07, 'triangle', 0.14);
}
/* leo thang: 3 nốt đi lên (C5 – E5 – G5) */
export function climb() {
  if (!on) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  [523.25, 659.25, 783.99].forEach((f, i) => blip(a, t + i * 0.09, f, 0.16, 'sine', 0.24));
}
/* trượt rắn: tiếng trượt đi xuống (nốt cao trượt xuống nốt thấp) */
export function slide() {
  if (!on) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(180, t + 0.45);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.55);
}
/* tiếng thắng: arpeggio trưởng (C5 – E5 – G5 – C6) */
export function winJingle() {
  if (!on) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    blip(a, t + i * 0.11, f, 0.5, 'sine', 0.26);
  });
}
