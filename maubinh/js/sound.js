// 🔊 Âm thanh Mậu Binh — tổng hợp bằng Web Audio API, không cần file ngoài.
// "xoẹt" khi chia bài, "tách" khi đặt lá bài, "cốc" khi lật bài, nhạc thắng.
// Bật/tắt lưu ở localStorage gumballz-maubinh-sound.
const KEY = 'gumballz-maubinh-sound';
let ctx = null, on = true;
try { on = localStorage.getItem(KEY) !== '0'; } catch (e) {}
export const isSoundOn = () => on;
export function setSound(v) { on = !!v; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {} }
function ac() {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
function blip(freq, vol, dur = 0.07, type = 'triangle', when = 0) {
  if (!on) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.01);
}
function chipKnock(freq, vol) {
  if (!on) return;
  const a = ac(); if (!a) return;
  const dur = 0.05, t = a.currentTime;
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource(); src.buffer = buf;
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 1.4;
  const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(bp); bp.connect(g); g.connect(a.destination); src.start(t);
}
/* tiếng chia bài: 3 tiếng xoẹt nhẹ */
export function deal() {
  blip(900, 0.1, 0.05, 'sine', 0);
  blip(1100, 0.1, 0.05, 'sine', 0.07);
  blip(1300, 0.1, 0.05, 'sine', 0.14);
}
/* tiếng đặt lá bài vào chi: 1 tiếng tách */
export function place() {
  blip(700, 0.12, 0.05, 'triangle');
}
/* tiếng xếp xong: 2 tiếng tách liền nhau */
export function arrange() {
  blip(660, 0.12, 0.06, 'triangle');
  blip(880, 0.12, 0.08, 'triangle', 0.07);
}
/* tiếng lật bài: 1 tiếng cốc giòn */
export function flip() {
  chipKnock(1600, 0.5);
}
/* tiếng tới lượt mình: 2 nốt cao */
export function turn() {
  blip(660, 0.12, 0.08);
  blip(880, 0.12, 0.1, 'triangle', 0.08);
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
