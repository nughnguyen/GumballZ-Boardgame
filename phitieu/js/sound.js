// 🔊 Âm thanh Phi Tiêu — dùng WebAudio, không cần file.
// Lưu trạng thái bật/tắt trong localStorage.
const KEY = 'gumballz-phitieu-sound';
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
  /* tiếng phi tiêu bay: vút cao rồi cắm vào bảng */
  throw: () => { tone(1200, 0.08, 'triangle', 0.06); tone(180, 0.06, 'square', 0.10, 0.07); },
  /* trúng điểm cao: 2 nốt vút lên */
  hit: () => { tone(784, 0.10, 'sine', 0.12); tone(1047, 0.14, 'sine', 0.10, 0.08); },
  /* trúng bull: reo 3 nốt */
  bull: () => { tone(659, 0.10, 'sine', 0.12); tone(988, 0.12, 'sine', 0.12, 0.08); tone(1319, 0.16, 'sine', 0.10, 0.16); },
  /* bust: nốt trầm xuống */
  bust: () => { tone(330, 0.15, 'sawtooth', 0.08); tone(196, 0.20, 'sawtooth', 0.08, 0.10); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'sine', 0.12, i * 0.11)); },
  lose: () => { [392, 330, 262].forEach((f, i) => tone(f, 0.20, 'sine', 0.10, i * 0.13)); },
};
export default Sfx;
