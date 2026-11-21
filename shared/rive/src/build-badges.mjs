// Build 4 file .riv cho huy hiệu 4 bậc (patch -109 — xem shared/rive/src/README.md).
// Chạy:
//   cp shared/rive/src/build-badges.mjs /tmp/rive-gen/build-badges.mjs
//   cd /tmp/rive-gen && node build-badges.mjs
// Artboard 160×28 (tỉ lệ pill huy hiệu ~5,7:1), NỀN TRONG SUỐT — nền pill vẫn do CSS
// (gradient của badges.css) quyết định, .riv chỉ vẽ LỚP HIỆU ỨNG: vệt sáng quét,
// tia lấp lánh, hào quang nhấp, hạt bay. Chữ tên bậc + icon emoji GIỮ LÀ HTML
// đè lên canvas (sắc nét, đổi được), không vẽ chữ trong Rive.
// Mỗi file: 1 artboard + 1 animation "loop" duy nhất (180f = 3s), mount autoplay,
// KHÔNG truyền tên animation (xem README — tên ghi sai key).
// Kiến trúc v2 (giữ nguyên từ build.mjs/build-gacha.mjs):
// - CHỈ 1 Node "Root" ở (0,0), mọi shape tọa độ TUYỆT ĐỐI.
// - KeyedObject.objectId là LOCAL index -> keys() truyền target-1.
// - Thứ tự vẽ: thêm trước = vẽ TRÊN cùng (tia/sao trước, vệt quét giữa, hào quang sau cùng = ở dưới).
// - Opacity Shape/Node = key 18 (PropertyKey.opacity của thư viện = 46 là opacity gradient, không dùng).
// - Vòng lặp cắt cứng ở f=180: mọi key phải về đúng giá trị f=0 (không fade cuối vòng).
import { writeFileSync } from 'node:fs';
import { RiveFile, hex, rgba, PropertyKey } from '@stevysmith/rive-generator';

const OUT = '/home/hatch/workspace/bgvn-hisrepo/shared/rive/';
const INK = hex('#241A38');
const RED = hex('#FF5A60');
const YELLOW = hex('#FACD33');
const PALE = hex('#FFE9A8');
const GOLD = hex('#E9A820');
const TEAL = hex('#2EC5B6');
const LAVENDER = hex('#B9A6FF');
const VIOLET = hex('#7C5CFF');
const WHITE = hex('#FFFFFF');
const OPACITY = 18; // WorldTransformComponent.opacity (schema Rive)
const ROT = 15, SX = 16, SY = 17, X = 13, Y = 14;
const D = 180; // loop 3s @ 60fps

function keys(riv, anim, target, prop, frames, interp = 'cubic') {
  const ko = riv.addKeyedObject(anim, target - 1);
  const kp = riv.addKeyedProperty(ko, prop);
  for (const [f, v] of frames) riv.addKeyFrameDouble(kp, { frame: f, value: v, interpolation: interp });
}
function paint(riv, shape, color, stroke, strokeW) {
  const f = riv.addFill(shape);
  riv.addSolidColor(f, color);
  if (stroke !== undefined) {
    const s = riv.addStroke(shape, { thickness: strokeW ?? 3 });
    riv.addSolidColor(s, stroke);
  }
}
function ell(riv, parent, { name, x = 0, y = 0, w, h = w, color, stroke, strokeW }) {
  const s = riv.addShape(parent, { name, x, y });
  riv.addEllipse(s, { width: w, height: h });
  paint(riv, s, color, stroke, strokeW);
  return { id: s, x, y };
}
function poly(riv, parent, { name, cx = 0, cy = 0, points, color, stroke, strokeW }) {
  const s = riv.addShape(parent, { name, x: cx, y: cy });
  const p = riv.addPointsPath(s, { name: 'Path', closed: true });
  for (const [vx, vy] of points) riv.addVertex(p, { x: vx - cx, y: vy - cy });
  paint(riv, s, color, stroke, strokeW);
  return { id: s, x: cx, y: cy };
}
// Hình chữ nhật xoay quanh tâm (cx,cy): trả về 4 đỉnh (tính sẵn).
function rotRectPoints(cx, cy, w, h, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [[w / 2, h / 2], [-w / 2, h / 2], [-w / 2, -h / 2], [w / 2, -h / 2]]
    .map(([dx, dy]) => [cx + dx * c - dy * s, cy + dx * s + dy * c]);
}
// Hình thoi lấp lánh (tâm cx,cy, bán kính r).
function sparkle(riv, parent, cx, cy, r = 4, color = PALE) {
  return poly(riv, parent, { name: 'Spark', cx, cy, points: [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]], color });
}
// Tia sáng: tam giác dài từ tâm (cx,cy) theo góc deg.
function ray(riv, parent, cx, cy, deg, len = 22, base = 4, color = YELLOW) {
  const a = deg * Math.PI / 180;
  const dx = Math.cos(a), dy = Math.sin(a);
  const px = -dy, py = dx; // vuông góc
  const tip = [cx + dx * len, cy + dy * len];
  const b1 = [cx + px * base + dx * 6, cy + py * base + dy * 6];
  const b2 = [cx - px * base + dx * 6, cy - py * base + dy * 6];
  return poly(riv, parent, { name: 'Ray', cx, cy, points: [tip, b1, b2], color });
}
function save(name, riv) {
  const bytes = riv.export();
  writeFileSync(OUT + name + '.riv', bytes);
  console.log(name + '.riv', bytes.length, 'bytes');
}
function newFile(name) {
  const riv = new RiveFile();
  const ab = riv.addArtboard({ name, width: 160, height: 28 });
  const root = riv.addNode(ab, { name: 'Root', x: 0, y: 0 });
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  return { riv, ab, root, an };
}
// Nhấp nháy: tàng hình -> sáng (đỉnh f1) -> tàng hình, chu kỳ f0..f2 (linear).
function twinkle(riv, an, part, f0, f1, f2, peak = 1) {
  keys(riv, an, part.id, OPACITY, [[f0, 0], [f1, peak], [f2, 0]], 'linear');
  keys(riv, an, part.id, SX, [[f0, 0.5], [f1, 1.15], [f2, 0.5]]);
  keys(riv, an, part.id, SY, [[f0, 0.5], [f1, 1.15], [f2, 0.5]]);
}
// Hào quang nhịp thở: opacity lên xuống 2 nhịp/vòng, về đúng giá trị đầu ở f=180.
function breathe(riv, an, part, lo = 0.4, hi = 1) {
  keys(riv, an, part.id, OPACITY, [[0, lo], [45, hi], [90, lo], [135, hi], [D, lo]], 'linear');
  keys(riv, an, part.id, SX, [[0, 0.94], [45, 1.04], [90, 0.94], [135, 1.04], [D, 0.94]]);
  keys(riv, an, part.id, SY, [[0, 0.94], [45, 1.04], [90, 0.94], [135, 1.04], [D, 0.94]]);
}
// Vệt sáng quét ngang: band nghiêng đi từ x=-30 tới x=190 trong f0..f1, mờ 2 đầu.
function sweep(riv, an, part, f0, f1, maxOp = 0.3) {
  keys(riv, an, part.id, X, [[0, -30], [f0, -30], [f1, 190], [D, 190]]);
  keys(riv, an, part.id, OPACITY, [[0, 0], [f0, 0], [f0 + 12, maxOp], [f1 - 12, maxOp], [f1, 0], [D, 0]], 'linear');
}
// Hạt bay lên: y từ y0 lên y0-rise, opacity 0 -> 1 -> 0 trong 1 chu kỳ f0..f0+len (linear).
// Chu kỳ lặp đúng 60f nên 3 hạt lệch pha 0/60/120 khép kín vòng 180f.
function ember(riv, an, part, y0, rise, f0, len = 60, peak = 0.9) {
  keys(riv, an, part.id, Y, [[f0, y0], [f0 + len, y0 - rise], [D, y0 - rise]]);
  keys(riv, an, part.id, OPACITY, [[f0, 0], [f0 + 10, peak], [f0 + len - 10, peak], [f0 + len, 0], [D, 0]], 'linear');
}

// ---- 1. badge-own: CHỦ SẢNH (vàng) — tia vàng từ vương miện + vệt quét + sao vàng ----
{
  const { riv, root, an } = newFile('badge-own');
  // Sao vàng nhấp (vẽ trước = trên cùng).
  const s1 = sparkle(riv, root, 62, 7, 4, PALE);
  const s2 = sparkle(riv, root, 108, 21, 3.5, YELLOW);
  const s3 = sparkle(riv, root, 142, 8, 4, PALE);
  twinkle(riv, an, s1, 0, 25, 60);
  twinkle(riv, an, s2, 50, 80, 120);
  twinkle(riv, an, s3, 100, 130, 170);
  // 3 tia vàng tỏa ra từ vị trí vương miện (trái pill), nhấp lệch pha.
  const r1 = ray(riv, root, 14, 14, -55, 20, 3.5, YELLOW);
  const r2 = ray(riv, root, 14, 14, -10, 24, 3.5, PALE);
  const r3 = ray(riv, root, 14, 14, 40, 20, 3.5, YELLOW);
  keys(riv, an, r1.id, OPACITY, [[0, 0.25], [45, 0.65], [90, 0.25], [135, 0.65], [D, 0.25]], 'linear');
  keys(riv, an, r2.id, OPACITY, [[0, 0.65], [45, 0.25], [90, 0.65], [135, 0.25], [D, 0.65]], 'linear');
  keys(riv, an, r3.id, OPACITY, [[0, 0.25], [90, 0.65], [D, 0.25]], 'linear');
  // Vệt sáng trắng quét ngang (thay vệt ::after của CSS).
  const band = poly(riv, root, { name: 'Sweep', cx: 80, cy: 14, points: rotRectPoints(80, 14, 16, 46, 0.35), color: WHITE });
  sweep(riv, an, band, 20, 150, 0.32);
  // Hào quang vàng sau vương miện (vẽ sau cùng = ở dưới).
  const glow = ell(riv, root, { name: 'Glow', x: 16, y: 14, w: 46, h: 22, color: rgba(250, 205, 51, 90) });
  breathe(riv, an, glow, 0.45, 1);
  save('badge-own', riv);
}

// ---- 2. badge-adm: QUẢN SẢNH (đỏ/tím) — hào quang tím nhịp thở + hạt lửa đỏ/tím bay lên ----
{
  const { riv, root, an } = newFile('badge-adm');
  // Hạt lửa bay lên (3 hạt, chu kỳ 60f lệch pha).
  const e1 = ell(riv, root, { name: 'Emb1', x: 48, y: 21, w: 5, color: RED });
  const e2 = ell(riv, root, { name: 'Emb2', x: 86, y: 21, w: 5, color: LAVENDER });
  const e3 = ell(riv, root, { name: 'Emb3', x: 124, y: 21, w: 5, color: RED });
  ember(riv, an, e1, 21, 12, 0);
  ember(riv, an, e2, 21, 12, 60);
  ember(riv, an, e3, 21, 12, 120);
  // Sao tím nhấp.
  const s1 = sparkle(riv, root, 40, 8, 3.5, LAVENDER);
  const s2 = sparkle(riv, root, 128, 20, 4, PALE);
  twinkle(riv, an, s1, 10, 40, 80);
  twinkle(riv, an, s2, 90, 120, 160);
  // Vệt sáng quét.
  const band = poly(riv, root, { name: 'Sweep', cx: 80, cy: 14, points: rotRectPoints(80, 14, 16, 46, 0.35), color: WHITE });
  sweep(riv, an, band, 30, 160, 0.28);
  // Hào quang tím giữa pill (vẽ sau cùng = ở dưới).
  const glow = ell(riv, root, { name: 'Glow', x: 80, y: 14, w: 96, h: 24, color: rgba(185, 166, 255, 80) });
  breathe(riv, an, glow, 0.4, 1);
  save('badge-adm', riv);
}

// ---- 3. badge-mod: MOD SẢNH (ngọc) — vệt ngọc quét + tia chớp sáng + sao ngọc ----
{
  const { riv, root, an } = newFile('badge-mod');
  // Sao ngọc nhấp.
  const s1 = sparkle(riv, root, 56, 7, 4, WHITE);
  const s2 = sparkle(riv, root, 96, 21, 3.5, TEAL);
  const s3 = sparkle(riv, root, 136, 9, 4, WHITE);
  twinkle(riv, an, s1, 0, 30, 70);
  twinkle(riv, an, s2, 55, 85, 125);
  twinkle(riv, an, s3, 110, 140, 175);
  // Tia chớp sáng chéo gần trái (khiên): lóe 2 lần/vòng.
  const gleam = poly(riv, root, { name: 'Gleam', cx: 22, cy: 14, points: rotRectPoints(22, 14, 6, 24, 0.5), color: WHITE });
  keys(riv, an, gleam.id, OPACITY, [[0, 0], [20, 0], [30, 0.75], [45, 0], [100, 0], [110, 0.75], [125, 0], [D, 0]], 'linear');
  // Vệt sáng ngọc quét (sáng hơn các bậc khác một chút).
  const band = poly(riv, root, { name: 'Sweep', cx: 80, cy: 14, points: rotRectPoints(80, 14, 18, 46, 0.35), color: rgba(255, 255, 255, 230) });
  sweep(riv, an, band, 15, 145, 0.38);
  // Hào quang ngọc giữa pill (vẽ sau cùng = ở dưới).
  const glow = ell(riv, root, { name: 'Glow', x: 80, y: 14, w: 76, h: 20, color: rgba(46, 197, 182, 70) });
  breathe(riv, an, glow, 0.45, 1);
  save('badge-mod', riv);
}

// ---- 4. badge-sup: NHÀ TÀI TRỢ (hồng/vàng) — sao hồng-vàng bay lên + hào quang ấm ----
{
  const { riv, root, an } = newFile('badge-sup');
  // Sao hồng/vàng bay lên (3 hạt, chu kỳ 60f lệch pha).
  const s1 = sparkle(riv, root, 44, 20, 4, RED);
  const s2 = sparkle(riv, root, 88, 20, 4.5, YELLOW);
  const s3 = sparkle(riv, root, 130, 20, 4, RED);
  ember(riv, an, s1, 20, 11, 0, 60, 1);
  ember(riv, an, s2, 20, 11, 60, 60, 1);
  ember(riv, an, s3, 20, 11, 120, 60, 1);
  // Sao nhấp thêm (đứng yên, chỉ nhấp).
  const s4 = sparkle(riv, root, 66, 7, 3.5, PALE);
  const s5 = sparkle(riv, root, 112, 8, 3.5, PALE);
  twinkle(riv, an, s4, 20, 50, 90);
  twinkle(riv, an, s5, 100, 130, 170);
  // Vệt sáng quét.
  const band = poly(riv, root, { name: 'Sweep', cx: 80, cy: 14, points: rotRectPoints(80, 14, 16, 46, 0.35), color: WHITE });
  sweep(riv, an, band, 25, 155, 0.3);
  // Hào quang ấm bên phải pill (vẽ sau cùng = ở dưới).
  const glow = ell(riv, root, { name: 'Glow', x: 104, y: 14, w: 84, h: 22, color: rgba(255, 154, 61, 80) });
  breathe(riv, an, glow, 0.4, 1);
  save('badge-sup', riv);
}
console.log('done');
