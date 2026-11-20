// 🔊 Xì Tố — hiệu ứng âm thanh (Web Audio, tự tắt theo âm lượng SFX chung).
const LS = 'gumballz-xito-sound';
let ctx = null, on = (localStorage.getItem(LS) ?? '1') === '1';
export const isSoundOn = () => on;
export function setSound(v) { on = !!v; localStorage.setItem(LS, on ? '1' : '0'); }
function ac() {
  if (!on) return null;
  try {
    const sfx = document.querySelector('.sfx-slider');
    if (sfx && +sfx.value <= 0) return null;
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch (e) { return null; }
}
function beep(f, t = 0.07, type = 'sine', vol = 0.08) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t);
  o.connect(g).connect(c.destination);
  o.start(); o.stop(c.currentTime + t);
}
export function deal() { beep(520, 0.06, 'triangle', 0.06); setTimeout(() => beep(660, 0.06, 'triangle', 0.06), 60); }
export function chip() { beep(980, 0.05, 'square', 0.04); setTimeout(() => beep(1240, 0.05, 'square', 0.04), 50); }
export function raise() { beep(440, 0.08, 'sawtooth', 0.05); setTimeout(() => beep(660, 0.1, 'sawtooth', 0.05), 70); }
export function fold() { beep(220, 0.12, 'sine', 0.06); }
export function flip() { beep(760, 0.07, 'triangle', 0.07); setTimeout(() => beep(880, 0.07, 'triangle', 0.07), 70); }
export function turn() { beep(600, 0.08, 'sine', 0.06); }
export function allin() { beep(330, 0.1, 'sawtooth', 0.06); setTimeout(() => beep(495, 0.12, 'sawtooth', 0.06), 90); }
export function winJingle() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.14, 'triangle', 0.09), i * 110)); }
