// 🔊 Âm thanh Memory — tổng hợp bằng Web Audio API, không cần file ngoài.
// "tách" khi lật thẻ: blip ngắn. "ting" khi trúng cặp: 2 nốt chuông.
// "bụp" khi lật trượt: blip trầm. "leng keng" khi thắng: arpeggio trưởng.
// Bật/tắt lưu ở localStorage gumballz-memory-sound.
const KEY = 'gumballz-memory-sound';
let ctx = null, on = true;
try { on = localStorage.getItem(KEY) !== '0'; } catch (e) {}
export const isSoundOn = () => on;
export function setSound(v) { on = !!v; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {} }
function ac() {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
function blip(freq, dur = 0.08, type = 'sine', vol = 0.22, slideTo = null) {
  if (!on) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
/* tiếng lật thẻ: "tách" cao, ngắn */
export function flip() { blip(880, 0.07, 'triangle', 0.2, 1320); }
/* tiếng trúng cặp: 2 nốt chuông (E5 → A5) */
export function match() {
  if (!on) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  [659.25, 880].forEach((f, i) => {
    const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = a.createGain();
    const st = t + i * 0.09;
    g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.24, st + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, st + 0.35);
    o.connect(g); g.connect(a.destination); o.start(st); o.stop(st + 0.4);
  });
}
/* tiếng lật trượt: "bụp" trầm */
export function miss() { blip(220, 0.12, 'sine', 0.18, 140); }
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
