// 🔊 Âm thanh Connect 4 — tổng hợp bằng Web Audio API, không cần file ngoài.
// "tách" khi chọn cột, "cốc" khi quân rơi xuống đáy cột, arpeggio khi thắng.
// Bật/tắt lưu ở localStorage gumballz-connect4-sound.
const KEY = 'gumballz-connect4-sound';
let ctx = null, on = true;
try { on = localStorage.getItem(KEY) !== '0'; } catch (e) {}
export const isSoundOn = () => on;
export function setSound(v) { on = !!v; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {} }
function ac() {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
function knock(a, t, freq, vol) {
  const dur = 0.05;
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource(); src.buffer = buf;
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 1.4;
  const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(bp); bp.connect(g); g.connect(a.destination); src.start(t);
  const o = a.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(freq / 6, t); o.frequency.exponentialRampToValueAtTime(freq / 10, t + 0.05);
  const g2 = a.createGain(); g2.gain.setValueAtTime(vol * 0.45, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  o.connect(g2); g2.connect(a.destination); o.start(t); o.stop(t + 0.07);
}
function blip(freq, vol, dur = 0.07, type = 'triangle') {
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.01);
}
/* tiếng chọn cột: 1 tiếng "tách" nhẹ */
export function select() {
  if (!on) return;
  blip(1200, 0.14, 0.05);
}
/* tiếng quân rơi: 1 tiếng "cốc" giòn */
export function place() {
  if (!on) return;
  const a = ac(); if (!a) return;
  knock(a, a.currentTime, 1600 + Math.random() * 300, 0.5);
}
/* tiếng nước không hợp lệ: 1 nốt trầm */
export function invalid() {
  if (!on) return;
  blip(180, 0.12, 0.12, 'sawtooth');
}
/* tiếng thua: 3 nốt xuống */
export function lose() {
  if (!on) return;
  [392, 330, 262].forEach((f, i) => setTimeout(() => blip(f, 0.14, 0.22, 'sine'), i * 150));
}
/* tiếng hòa: 2 nốt bằng nhau */
export function draw() {
  if (!on) return;
  blip(440, 0.14, 0.18, 'sine');
  setTimeout(() => blip(440, 0.14, 0.18, 'sine'), 220);
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
