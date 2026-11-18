// 🔊 Âm thanh Ô Ăn Quan — tổng hợp bằng Web Audio API, không cần file ngoài.
// "cạch" khi rải: tiếng sỏi chạm gỗ (noise ngắn + blip trầm). "leng keng" khi ăn:
// hợp âm trưởng vang lên. Bật/tắt lưu ở localStorage gumballz-oanquan-sound.
const KEY = 'gumballz-oanquan-sound';
let ctx = null, on = true;
try { on = localStorage.getItem(KEY) !== '0'; } catch (e) {}
export const isSoundOn = () => on;
export function setSound(v) { on = !!v; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {} }
function ac() {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
/* tiếng sỏi va gỗ: 1 burst noise qua band-pass + 1 blip sine hạ nhanh */
export function pebble() {
  if (!on) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  const dur = 0.07;
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource(); src.buffer = buf;
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100 + Math.random() * 500; bp.Q.value = 1.2;
  const g = a.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(bp); bp.connect(g); g.connect(a.destination); src.start(t);
  const o = a.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(340, t); o.frequency.exponentialRampToValueAtTime(170, t + 0.06);
  const g2 = a.createGain(); g2.gain.setValueAtTime(0.22, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  o.connect(g2); g2.connect(a.destination); o.start(t); o.stop(t + 0.08);
}
/* tiếng bốc quân: loạt "lách cách" nhỏ */
export function pickup() { if (!on) return; pebble(); setTimeout(pebble, 70); }
/* tiếng leng keng khi ăn quân: arpeggio trưởng (E5 – G#5 – B5 – E6) */
export function chime() {
  if (!on) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  [659.25, 830.61, 987.77, 1318.51].forEach((f, i) => {
    const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = a.createGain();
    const s = t + i * 0.09;
    g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.28, s + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, s + 0.55);
    o.connect(g); g.connect(a.destination); o.start(s); o.stop(s + 0.6);
  });
}
/* tiếng thắng: chime dài hơn, thêm nốt cao */
export function winJingle() { chime(); setTimeout(chime, 320); }
