// 🔊 Âm thanh Kéo Búa Bao — dùng WebAudio, không cần file.
// Lưu trạng thái bật/tắt trong localStorage.
const KEY = 'gumballz-keobuabao-sound';
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
  /* tiếng ra tay: bụp nhẹ */
  pick: () => { tone(520, 0.07, 'triangle', 0.10); tone(780, 0.06, 'sine', 0.08, 0.05); },
  /* thắng vòng: 2 nốt vút lên */
  win: () => { tone(659, 0.10, 'sine', 0.12); tone(988, 0.16, 'sine', 0.12, 0.09); },
  /* thua vòng: nốt trầm */
  lose: () => { tone(330, 0.14, 'sawtooth', 0.08); },
  /* hoà vòng: 1 nốt giữa */
  tie: () => { tone(440, 0.10, 'triangle', 0.10); },
  /* thắng trận: fanfare 4 nốt */
  fanfare: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'sine', 0.12, i * 0.11)); },
};
export default Sfx;
