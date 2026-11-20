// 🔊 Âm thanh Đá Penalty — dùng WebAudio, không cần file.
// Lưu trạng thái bật/tắt trong localStorage.
const KEY = 'gumballz-dapenalty-sound';
let enabled = true;
try { enabled = localStorage.getItem(KEY) !== '0'; } catch (e) { enabled = true; }
let actx = null;

function ctx() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
  }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(freq, dur = 0.12, type = 'sine', vol = 0.12, when = 0) {
  if (!enabled) return;
  const ac = ctx();
  if (!ac) return;
  try {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    const t = ac.currentTime + when;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t); o.stop(t + dur + 0.05);
  } catch (e) { /* bỏ qua lỗi âm thanh */ }
}
export const Sfx = {
  isEnabled: () => enabled,
  setEnabled(v) {
    enabled = !!v;
    try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch (e) {}
  },
  click: () => tone(660, 0.07, 'sine', 0.08),
  /* tiếng sút bóng: bụp trầm */
  kick: () => { tone(150, 0.08, 'square', 0.12); tone(900, 0.04, 'triangle', 0.06); },
  /* vào lưới: 2 nốt vút lên + tiếng reo */
  goal: () => { tone(659, 0.10, 'sine', 0.12); tone(988, 0.16, 'sine', 0.12, 0.09); tone(1319, 0.12, 'sine', 0.08, 0.18); },
  /* cản phá: nốt trầm + vỗ tay nhẹ */
  save: () => { tone(220, 0.15, 'sawtooth', 0.08); tone(440, 0.10, 'triangle', 0.08, 0.08); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'sine', 0.12, i * 0.11)); },
  lose: () => { [392, 330, 262].forEach((f, i) => tone(f, 0.20, 'sine', 0.10, i * 0.13)); },
};
export default Sfx;
