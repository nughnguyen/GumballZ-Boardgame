/* 🔥 Khung aura Dragon Ball: aura khí (ki) bốc quanh avatar, vẽ bằng Canvas 2D thuần.
   Pattern theo shared/ui/dragon-frame.js (cùng chữ ký mount: auraSVG/initFrameAuras,
   chu kỳ ~12s, IntersectionObserver, reduced-motion = 1 khung tĩnh, canvas 180cqw phủ khung).
   5 dạng biến hình riêng + 1 dạng tổng hợp chuyển dần SSJ1→SSJ2→SSJ3→God→Blue (mỗi dạng
   2.5s, chuyển màu mượt 0.6s cuối mỗi slot, chu kỳ 12.5s). Mỗi dạng phân biệt bằng màu +
   hình lửa + hiệu ứng riêng: SSJ1 vàng vừa; SSJ2 vàng lớn + tia sét; SSJ3 vàng rất lớn,
   lửa dài; God đỏ thần thánh, lửa mềm chậm; Blue xanh dương + hạt ki xanh.
   HIỆU NĂNG: tối đa 14 lưỡi lửa + 18 hạt/dạng; canvas nhỏ (<150px, lưới chọn khung 54px
   → canvas phủ 180% ≈ 97px) chỉ vẽ 1 khung tĩnh, không chạy vòng lặp; canvas ngoài màn hình
   không vẽ (IO). */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hexRgb = h => { const n = parseInt(String(h).replace('#', ''), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const rgbCss = (c, a = 1) => a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const lerpRgb = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/* ================= CẤU HÌNH TỪNG DẠNG =================
   core/mid/outer: màu lõi → giữa → ngoài của lưỡi lửa; glow: màu hào quang (rgb, thêm alpha
   khi dùng); flames: số lưỡi lửa quanh vòng (≤14); len: độ dài lửa (tỉ lệ bề rộng canvas);
   speed: tốc độ nhấp nháy; particles: số hạt ki bay lên (≤18); lightning: có tia sét không;
   wispy: 1 = lửa mềm mảnh (God), 0 = lửa thường. */
export const AURA_FORMS = {
  ssj1: { label: 'Siêu Saiyan 1', core: '#FFF3C4', mid: '#FFD23C', outer: '#FF9A1F', glow: [255, 190, 60], flames: 10, len: 0.10, speed: 1.0, particles: 10, lightning: false, wispy: 0 },
  ssj2: { label: 'Siêu Saiyan 2', core: '#FFF6CC', mid: '#FFE600', outer: '#FF8A1F', glow: [255, 220, 60], flames: 12, len: 0.13, speed: 1.35, particles: 14, lightning: true, wispy: 0 },
  ssj3: { label: 'Siêu Saiyan 3', core: '#FFFBE0', mid: '#FFD23C', outer: '#FF7A1A', glow: [255, 200, 60], flames: 14, len: 0.17, speed: 1.15, particles: 18, lightning: true, wispy: 0 },
  god: { label: 'Siêu Saiyan God', core: '#FFD9D0', mid: '#FF5A45', outer: '#D61F1F', glow: [255, 80, 60], flames: 10, len: 0.11, speed: 0.6, particles: 12, lightning: false, wispy: 1 },
  blue: { label: 'Siêu Saiyan Blue', core: '#D8F1FF', mid: '#4DC3FF', outer: '#1F5FD6', glow: [80, 170, 255], flames: 12, len: 0.13, speed: 1.2, particles: 16, lightning: false, wispy: 0 },
};
export const AURA_IDS = Object.keys(AURA_FORMS);
/* dạng tổng hợp: thứ tự biến hình cố định, mỗi dạng 2.5s, chu kỳ 12.5s */
export const COMPOSITE_ORDER = ['ssj1', 'ssj2', 'ssj3', 'god', 'blue'];
export const FORM_SECS = 2.5;
export const FADE_SECS = 0.6;
export const AURA_CYCLE = COMPOSITE_ORDER.length * FORM_SECS; // 12.5s
export const normForm = v => (v && AURA_FORMS[v]) ? v : 'ssj1';
/* variant khung: 5 dạng riêng + 'all' (khung tổng hợp) — 'all' KHÔNG phải 1 dạng trong
   AURA_FORMS nên cần hàm riêng, đừng gộp vào normForm */
export const normVariant = v => (v === 'all' || (v && AURA_FORMS[v])) ? v : 'ssj1';

/* ================= HÀM THUẦN (test được bằng node) ================= */
/* màu của 1 dạng, trả về rgb để vẽ + nội suy */
export function auraColors(form) {
  const f = AURA_FORMS[normForm(form)];
  return { core: hexRgb(f.core), mid: hexRgb(f.mid), outer: hexRgb(f.outer), glow: f.glow.slice() };
}
/* nội suy 2 dạng (dùng cho chuyển dạng của khung tổng hợp): k=0 → a, k=1 → b */
export function mixedForm(a, b, k) {
  const fa = AURA_FORMS[normForm(a)], fb = AURA_FORMS[normForm(b)], t = clamp(+k || 0, 0, 1);
  const ca = auraColors(a), cb = auraColors(b);
  return {
    core: lerpRgb(ca.core, cb.core, t), mid: lerpRgb(ca.mid, cb.mid, t), outer: lerpRgb(ca.outer, cb.outer, t),
    glow: lerpRgb(ca.glow, cb.glow, t),
    flames: Math.max(fa.flames, fb.flames), len: fa.len + (fb.len - fa.len) * t,
    speed: fa.speed + (fb.speed - fa.speed) * t,
    particles: Math.max(fa.particles, fb.particles),
    lightning: t < 0.5 ? fa.lightning : fb.lightning, // sét đổi ở giữa nhịp chuyển, không nửa vời
    wispy: fa.wispy + (fb.wispy - fa.wispy) * t,
  };
}
/* dạng tổng hợp tại thời điểm t (giây): slot nào, có đang chuyển dạng không (k 0..1) */
export function compositeAt(t) {
  const cyc = ((+t || 0) % AURA_CYCLE + AURA_CYCLE) % AURA_CYCLE;
  const slot = Math.floor(cyc / FORM_SECS);
  const pos = cyc - slot * FORM_SECS;
  const from = COMPOSITE_ORDER[slot], to = COMPOSITE_ORDER[(slot + 1) % COMPOSITE_ORDER.length];
  const k = pos > FORM_SECS - FADE_SECS ? (pos - (FORM_SECS - FADE_SECS)) / FADE_SECS : 0;
  return { form: from, from, to, k: clamp(k, 0, 1), slot };
}
/* cấu hình đã nội suy của khung tổng hợp tại t (trả về dạng mixedForm, dùng thẳng để vẽ) */
export function compositeForm(t) {
  const c = compositeAt(t);
  return c.k > 0 ? mixedForm(c.from, c.to, c.k) : formConfig(c.form);
}
/* cấu hình vẽ đầy đủ của 1 dạng riêng (rgb + số) */
export function formConfig(form) {
  const f = AURA_FORMS[normForm(form)], c = auraColors(form);
  return { ...c, flames: f.flames, len: f.len, speed: f.speed, particles: f.particles, lightning: f.lightning, wispy: f.wispy };
}
/* độ nhấp nháy của lưỡi lửa i tại t: 0.68..1.32, xác định (không dùng Math.random) */
export function flameFlicker(i, t, speed = 1) {
  const s = Math.max(0.1, +speed || 1);
  return clamp(1 + 0.22 * Math.sin(t * 6 * s + i * 1.7) + 0.10 * Math.sin(t * 11 * s + i * 2.9), 0.6, 1.4);
}
/* vị trí hạt ki thứ i (trong n hạt) tại t — bay lên từ vòng lửa rồi mờ dần, xác định theo seed.
   Trả về toạ độ chuẩn hoá (0..1 theo bề rộng canvas, tâm 0.5) + bán kính + alpha. */
export function particleAt(seed, i, n, t) {
  const r = mulberry32((seed | 0) * 1000 + i * 131 + 7);
  const ph = r(), sp = 0.25 + r() * 0.35, sway = 0.03 + r() * 0.05, baseR = 0.006 + r() * 0.008;
  const life = (t * sp + ph) % 1; // 0 = vừa sinh ở vòng lửa, 1 = bay cao nhất rồi tắt
  const ang = ph * TAU;
  const rr = 0.26 + life * 0.10; // bay chếch ra ngoài khi lên cao
  return {
    x: 0.5 + Math.cos(ang) * rr + Math.sin(life * 5 + ph * TAU) * sway,
    y: 0.5 + Math.sin(ang) * rr - life * 0.22, // bay lên (y giảm)
    r: baseR * (1 - life * 0.4),
    a: clamp(life * 4, 0, 1) * (1 - life), // hiện dần rồi mờ dần
  };
}

/* ================= VẼ ================= */
/* 1 lưỡi lửa hình lá: gốc (bx,by), ngọn (tx,ty), bề rộng w — 2 đường cong đối xứng */
function flamePath(g, bx, by, tx, ty, w) {
  const dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy) || 1;
  const px = -dy / L, py = dx / L; // vuông góc với trục lửa
  const mx = bx + dx * 0.45, my = by + dy * 0.45; // điểm giữa phình ra 2 bên
  g.beginPath();
  g.moveTo(bx - px * w * 0.5, by - py * w * 0.5);
  g.quadraticCurveTo(mx - px * w, my - py * w, tx, ty);
  g.quadraticCurveTo(mx + px * w, my + py * w, bx + px * w * 0.5, by + py * w * 0.5);
  g.closePath();
}
/* 1 tia sét: đường gấp khúc từ vòng lửa vươn ra ngoài, seed theo lát thời gian 0.12s */
function drawBolt(g, W, seed, slice, bi, glowRgb) {
  const r = mulberry32(seed * 7919 + slice * 131 + bi * 17 + 3);
  const a0 = r() * TAU, r0 = 0.27 * W;
  let x = 0.5 * W + Math.cos(a0) * r0, y = 0.5 * W + Math.sin(a0) * r0;
  const dir = a0 + (r() - 0.5) * 0.9; // hướng vươn ra ngoài, lệch ngẫu nhiên
  g.save();
  g.strokeStyle = '#FFF27A'; g.lineWidth = Math.max(1, W * 0.004);
  g.shadowColor = '#FFE600'; g.shadowBlur = W * 0.02;
  g.globalAlpha = 0.45 + r() * 0.55;
  g.globalCompositeOperation = 'lighter';
  g.beginPath(); g.moveTo(x, y);
  let px = x, py = y;
  for (let s = 0; s < 5; s++) {
    const step = (0.03 + r() * 0.035) * W;
    px += Math.cos(dir) * step + (r() - 0.5) * step * 0.9;
    py += Math.sin(dir) * step + (r() - 0.5) * step * 0.9;
    g.lineTo(px, py);
  }
  g.stroke();
  g.restore();
}
/* vẽ toàn bộ aura vào context g (canvas vuông W×H, tâm giữa): hào quang + lửa + sét + hạt ki.
   cfg = formConfig() hoặc compositeForm(); t = giây; seed = số nguyên cố định theo canvas. */
export function drawAura(g, W, H, cfg, t, seed = 1) {
  const S = Math.min(W, H), cx = W / 2, cy = H / 2;
  g.clearRect(0, 0, W, H);
  const pulse = 0.85 + 0.15 * Math.sin(t * 2.1);
  /* hào quang mềm quanh mép avatar */
  const halo = g.createRadialGradient(cx, cy, S * 0.22, cx, cy, S * 0.44);
  halo.addColorStop(0, rgbCss(cfg.glow, 0));
  halo.addColorStop(0.55, rgbCss(cfg.glow, 0.30 * pulse));
  halo.addColorStop(1, rgbCss(cfg.glow, 0));
  g.fillStyle = halo;
  g.beginPath(); g.arc(cx, cy, S * 0.44, 0, TAU); g.fill();
  /* lưỡi lửa quanh vòng — 3 lớp (ngoài mờ → lõi sáng), chế độ lighter để chồng sáng */
  g.save();
  g.globalCompositeOperation = 'lighter';
  const n = cfg.flames, wBase = S * 0.052 * (1 - cfg.wispy * 0.3);
  for (let i = 0; i < n; i++) {
    const th = (i / n) * TAU + t * 0.04; // xoay rất chậm, gần như đứng yên
    const r0 = S * 0.255;
    const bx = cx + Math.cos(th) * r0, by = cy + Math.sin(th) * r0;
    const fl = flameFlicker(i, t, cfg.speed);
    const len = S * cfg.len * fl;
    const sway = Math.sin(t * 3 * cfg.speed + i * 2.1) * S * 0.02; // ngọn lửa đung đưa
    /* ngọn lửa bốc LÊN: hướng = 55% hướng tâm ra ngoài + 75% hướng lên trên */
    let dx = Math.cos(th) * 0.55, dy = Math.sin(th) * 0.55 - 0.75;
    const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    const tx = bx + dx * len + Math.cos(th + Math.PI / 2) * sway;
    const ty = by + dy * len;
    g.globalAlpha = 0.32; g.fillStyle = rgbCss(cfg.outer);
    flamePath(g, bx, by, tx, ty, wBase * 1.5); g.fill();
    g.globalAlpha = 0.55; g.fillStyle = rgbCss(cfg.mid);
    flamePath(g, bx, by, tx, ty, wBase * 1.0); g.fill();
    g.globalAlpha = 0.85; g.fillStyle = rgbCss(cfg.core);
    flamePath(g, bx, by, tx, ty, wBase * 0.55); g.fill();
  }
  g.restore();
  /* tia sét (SSJ2/SSJ3): 2 tia, đổi hình mỗi 0.12s */
  if (cfg.lightning) {
    const slice = Math.floor(t / 0.12);
    drawBolt(g, S, seed, slice, 0);
    drawBolt(g, S, seed, slice, 1);
  }
  /* hạt ki bay lên */
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < cfg.particles; i++) {
    const p = particleAt(seed, i, cfg.particles, t);
    if (p.a <= 0.01) continue;
    g.globalAlpha = p.a * 0.9;
    g.fillStyle = rgbCss(cfg.core);
    g.beginPath(); g.arc(p.x * W, p.y * H, Math.max(0.8, p.r * S), 0, TAU); g.fill();
  }
  g.restore();
}

/* ================= MOUNT (khung avatar) ================= */
/* Giữ chữ ký gọi kiểu dragonSVG: auraSVG(variant, phase) — trả <canvas> để profile.js chèn
   vào khung; mount bằng initFrameAuras(root) sau khi vẽ HTML (như initFrameDragons). */
const escA = s => String(s ?? '').replace(/["&<>]/g, c => ({ '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
export function auraSVG(variant, phase = 0) {
  return `<canvas class="aov" data-aura="${escA(normVariant(variant))}" data-phase="${+phase || 0}" width="360" height="360" aria-hidden="true"></canvas>`;
}
const AV = new Set();
let avTick = false, avIO = null, avRM = false;
function avReduced() { try { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
function avDraw(c, t) {
  const d = c._av; if (!d) return;
  const W = c.clientWidth || 0, H = c.clientHeight || 0;
  if (!W || !H) return;
  const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
  const bw = Math.round(W * dpr), bh = Math.round(H * dpr);
  if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }
  const g = c.getContext('2d'); if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cfg = d.variant === 'all' ? compositeForm(t) : formConfig(d.variant);
  drawAura(g, W, H, cfg, t, d.seed);
}
function avLoop(ms) {
  const nowSec = ms / 1000;
  AV.forEach(c => {
    if (!c.isConnected) { AV.delete(c); return; }
    if (!c._avv || avRM || c._avStatic) return;
    const d = c._av;
    const t = nowSec + d.phase * AURA_CYCLE; // phase lệch cho khung tổng hợp nhiều canvas
    avDraw(c, t);
  });
  requestAnimationFrame(avLoop);
}
export function initFrameAuras(root) {
  if (!root || typeof document === 'undefined') return;
  avRM = avReduced();
  if (!avIO && typeof IntersectionObserver !== 'undefined') {
    avIO = new IntersectionObserver(es => es.forEach(e => { e.target._avv = e.isIntersecting; }), { rootMargin: '100px' });
  }
  let idx = AV.size;
  root.querySelectorAll('canvas.aov').forEach(c => {
    if (AV.has(c)) return;
    AV.add(c);
    const variant = normVariant(c.dataset.aura || 'ssj1');
    const phase = +c.dataset.phase || 0;
    c._av = { variant, phase, seed: 1234 + (idx++) * 777 + Math.round(phase * 100) };
    if (avIO) avIO.observe(c); else c._avv = true;
    /* canvas nhỏ (<150px: lưới chọn khung 54px → canvas phủ 180% ≈ 97px): vẽ 1 khung tĩnh,
       không chạy vòng lặp — vừa nhẹ vừa đủ nhận ra màu/effect; khung lớn mới animate.
       reduced-motion: tĩnh hết. */
    const small = (c.clientWidth || 0) > 0 && c.clientWidth < 150;
    if (avRM || small) {
      c._avStatic = true;
      avDraw(c, 1.3 + phase * FORM_SECS);
    }
  });
  if (!avTick && !avRM && typeof requestAnimationFrame === 'function') { avTick = true; requestAnimationFrame(avLoop); }
}
