// 🔊 Âm lượng tổng do người chơi chỉnh ở ⚙️ Cài đặt: nhạc nền ('gumballz-vol-music') và hiệu ứng ('gumballz-vol-sfx'), 0–100, mặc định 100.
// Cách làm: chặn AudioNode.connect – nút nào nối thẳng ra loa (ctx.destination) thì cho đi qua một nút âm lượng chung của trang.
//   • nhạc nền: bgm.js tự đánh dấu bằng musicNode(node); nhạc tự phát (vd. Lô tô) nối vào musicOut(ctx) thay cho ctx.destination;
//   • mọi thứ còn lại (tiếng bài, tiếng bấm, chuông…) coi là hiệu ứng – game KHÔNG phải sửa gì.
// Giọng đọc của máy (speechSynthesis) không đi qua Web Audio → dùng speechVol() gán cho utterance.volume.
// Chỉ cần nạp module này một lần (vd. ở shared/ui/feel.js) là chặn connect có hiệu lực cho mọi game.
const W = typeof window !== 'undefined' ? window : null;
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const KEYS = { music: 'gumballz-vol-music', sfx: 'gumballz-vol-sfx' };
const read = k => { const v = ls.get(KEYS[k]); return v == null || v === '' || isNaN(+v) ? 100 : Math.max(0, Math.min(100, +v)); };
/* nhiều bản module (khác ?v) vẫn dùng chung một trạng thái */
const ST = W ? (W.__gumballzVol = W.__gumballzVol || { masters: new Map(), orig: null }) : { masters: new Map(), orig: null };
const OFF = W && typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext : null;
const offline = ctx => !!(OFF && ctx instanceof OFF);
const gainOf = k => { const x = read(k) / 100; return x * x; }; /* bình phương: kéo thanh trượt nghe đều tai hơn */
function mastersOf(ctx) {
  let m = ST.masters.get(ctx);
  if (!m) { m = {}; for (const k of ['sfx', 'music']) { const g = ctx.createGain(); g.__gumballzMaster = k; g.gain.value = gainOf(k); ST.orig.call(g, ctx.destination); m[k] = g; } ST.masters.set(ctx, m); }
  return m;
}
if (W && typeof AudioNode !== 'undefined' && !ST.orig) {
  ST.orig = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    try { const ctx = this.context; if (dest && ctx && dest === ctx.destination && !this.__gumballzMaster && !offline(ctx)) dest = mastersOf(ctx)[this.__gumballzMusic ? 'music' : 'sfx']; } catch (e) {}
    return ST.orig.call(this, dest, ...rest);
  };
}
function apply() {
  for (const m of ST.masters.values()) for (const k of ['sfx', 'music']) { try { const g = m[k], t = g.context.currentTime; g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(gainOf(k), t, 0.03); } catch (e) {} }
}
export const volume = {
  get: k => read(k),
  set(k, v) { if (!(k in KEYS)) return; ls.set(KEYS[k], String(Math.round(Math.max(0, Math.min(100, +v || 0))))); apply(); try { dispatchEvent(new CustomEvent('gumballz-volume', { detail: { kind: k } })); } catch (e) {} },
};
/* đánh dấu một nút là NHẠC NỀN. Nếu nó đã lỡ nối ra loa (hoặc vào nút hiệu ứng) thì chuyển sang nút nhạc. */
export function musicNode(node) {
  if (!node || node.__gumballzMusic || !ST.orig) return node;
  try {
    node.__gumballzMusic = true; const ctx = node.context; if (offline(ctx)) return node;
    const m = ST.masters.get(ctx); let moved = false;
    if (m) { try { node.disconnect(m.sfx); moved = true; } catch (e) {} }
    try { node.disconnect(ctx.destination); moved = true; } catch (e) {}
    if (moved) ST.orig.call(node, mastersOf(ctx).music);
  } catch (e) {}
  return node;
}
export const musicOut = ctx => (ST.orig && !offline(ctx) ? mastersOf(ctx).music : ctx.destination);
export const speechVol = () => read('sfx') / 100;
if (W) { try { addEventListener('storage', e => { if (e.key === KEYS.music || e.key === KEYS.sfx) apply(); }); } catch (e) {} }

/* ---- hai thanh trượt cho ⚙️ Cài đặt (shared/ui/settings.js nối dây): chèn volumeRowsHTML() vào mục "Âm thanh & cảm giác" rồi gọi bindVolumeRows(ov) ---- */
export const volumeRowsHTML = () => `
      <label class="st-vol"><span>🎵 Nhạc nền</span><input type="range" id="st-vmusic" min="0" max="100" step="5" value="${volume.get('music')}" aria-label="Âm lượng nhạc nền"><b id="st-vmusic-n">${volume.get('music')}%</b></label>
      <label class="st-vol"><span>🔔 Hiệu ứng</span><input type="range" id="st-vsfx" min="0" max="100" step="5" value="${volume.get('sfx')}" aria-label="Âm lượng hiệu ứng"><b id="st-vsfx-n">${volume.get('sfx')}%</b></label>
      <p style="margin:0 0 6px;font-size:12.5px;color:#8a7f96">Âm lượng chung cho mọi game trên máy này. Hiệu ứng gồm tiếng bài, tiếng bấm, chuông báo và giọng đọc.</p>`;
export function bindVolumeRows(root) {
  for (const k of ['music', 'sfx']) {
    const el = root.querySelector('#st-v' + k); if (!el) continue;
    el.oninput = () => { volume.set(k, el.value); const n = root.querySelector('#st-v' + k + '-n'); if (n) n.textContent = el.value + '%'; };
    el.onchange = () => { if (k === 'sfx') import('../ui/feel.js?v=53').then(m => m.uiTick && m.uiTick(true)).catch(() => {}); }; /* thả tay thì kêu thử một tiếng */
  }
}
