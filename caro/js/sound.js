// 🔊 Âm thanh Cờ Caro — tổng hợp bằng Web Audio API, không cần file ngoài.
// "cạch" khi đặt quân: tiếng quân gỗ chạm bàn (noise ngắn + blip trầm).
// "leng keng" khi thắng: arpeggio trưởng. Bật/tắt lưu ở localStorage gumballz-caro-sound.
const KEY = 'gumballz-caro-sound';
let ctx = null, on = true;
try { on = localStorage.getItem(KEY) !== '0'; } catch (e) {}
export const isSoundOn = () => on;
export function setSound(v) { on = !!v; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {} }
function ac() {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
/* tiếng đặt quân: 1 burst noise qua band-pass + 1 blip sine hạ nhanh */
export function place() {
  if (!on) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime, dur = 0.06;
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource(); src.buffer = buf;
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400 + Math.random() * 400; bp.Q.value = 1.2;
  const g = a.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(bp); bp.connect(g); g.connect(a.destination); src.start(t);
  const o = a.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.05);
  const g2 = a.createGain(); g2.gain.setValueAtTime(0.2, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  o.connect(g2); g2.connect(a.destination); o.start(t); o.stop(t + 0.07);
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
