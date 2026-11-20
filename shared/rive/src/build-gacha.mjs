// Build 2 file .riv cho hộp quà Gacha ở Cửa hàng (v2 — xem shared/rive/src/README.md).
// Chạy:
//   cp shared/rive/src/build-gacha.mjs /tmp/rive-gen/build-gacha.mjs
//   cd /tmp/rive-gen && node build-gacha.mjs
// - gacha-box.riv: hộp đóng nảy nhẹ + lắc khẽ + tia lấp lánh (idle, loop 120f = 2s).
// - gacha-open.riv: hộp rung → nắp bật tung + tia sáng + 5 đồng xu vàng bung ra
//   (mở 1 lần, oneshot 150f = 2,5s; frame cuối giữ hộp đã mở + xu + tia sáng mờ).
// Mount: autoplay, KHÔNG truyền tên animation (tên ghi sai key — xem README).
import { writeFileSync } from 'node:fs';
import { RiveFile, hex, rgba, PropertyKey } from '@stevysmith/rive-generator';

const OUT = '/home/hatch/workspace/bgvn-hisrepo/shared/rive/';
const INK = hex('#241A38');
const RED = hex('#FF5A60');
const YELLOW = hex('#FACD33');
const PALE = hex('#FFE9A8');
const GOLD = hex('#E9A820');
const CREAM = hex('#FFF8EE');
const SHADOW = rgba(36, 26, 56, 51);
const OPACITY = 18; // WorldTransformComponent.opacity (schema Rive)
const ROT = 15, SX = 16, SY = 17, X = 13, Y = 14;

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
function rect(riv, parent, { name, x = 0, y = 0, w, h, r = 0, color, stroke, strokeW, px = 0, py = 0 }) {
  const s = riv.addShape(parent, { name, x, y });
  riv.addRectangle(s, { width: w, height: h, x: px, y: py, cornerRadius: r });
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
function moveGroup(riv, anim, parts, cxF, cyF) {
  for (const p of parts) {
    if (cxF) keys(riv, anim, p.id, X, cxF.map(([f, v]) => [f, p.x + v - 100]));
    if (cyF) keys(riv, anim, p.id, Y, cyF.map(([f, v]) => [f, p.y + v - 100]));
  }
}
function rotGroup(riv, anim, parts, rotF) {
  for (const p of parts) keys(riv, anim, p.id, ROT, rotF);
}
function save(name, riv) {
  const bytes = riv.export();
  writeFileSync(OUT + name + '.riv', bytes);
  console.log(name + '.riv', bytes.length, 'bytes');
}
function newFile(name) {
  const riv = new RiveFile();
  const ab = riv.addArtboard({ name, width: 200, height: 200 });
  const root = riv.addNode(ab, { name: 'Root', x: 0, y: 0 });
  return { riv, ab, root };
}
// Tia sáng: tam giác dài từ tâm (cx,cy) theo góc deg, dài len, nửa rộng base.
function ray(riv, parent, cx, cy, deg, len = 85, base = 5) {
  const a = deg * Math.PI / 180;
  const dx = Math.cos(a), dy = Math.sin(a);
  const px = -dy, py = dx; // vuông góc
  const tip = [cx + dx * len, cy + dy * len];
  const b1 = [cx + px * base + dx * 6, cy + py * base + dy * 6];
  const b2 = [cx - px * base + dx * 6, cy - py * base + dy * 6];
  return poly(riv, parent, { name: 'Ray', cx, cy, points: [tip, b1, b2], color: YELLOW });
}
// Hình thoi lấp lánh (tâm cx,cy, bán kính r).
function sparkle(riv, parent, cx, cy, r = 7) {
  return poly(riv, parent, { name: 'Spark', cx, cy, points: [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]], color: PALE, stroke: GOLD, strokeW: 1.5 });
}

// ---- 1. gacha-box: hộp đóng idle — nảy nhẹ + lắc khẽ + tia lấp lánh (120f = 2s, loop) ----
{
  const { riv, ab, root } = newFile('gacha-box');
  const sp = sparkle(riv, root, 152, 58, 8);
  const bowL = ell(riv, root, { name: 'BowL', x: 86, y: 84, w: 18, h: 12, color: RED, stroke: INK, strokeW: 2.5 });
  const bowR = ell(riv, root, { name: 'BowR', x: 114, y: 84, w: 18, h: 12, color: RED, stroke: INK, strokeW: 2.5 });
  const knot = ell(riv, root, { name: 'Knot', x: 100, y: 86, w: 11, color: RED, stroke: INK, strokeW: 2.5 });
  const ribbon = rect(riv, root, { name: 'Ribbon', x: 100, y: 118, w: 12, h: 84, color: RED });
  const lid = rect(riv, root, { name: 'Lid', x: 100, y: 88, w: 92, h: 22, r: 6, color: YELLOW, stroke: INK, strokeW: 3 });
  const base = rect(riv, root, { name: 'Base', x: 100, y: 125, w: 80, h: 70, r: 8, color: YELLOW, stroke: INK, strokeW: 3 });
  const shadow = ell(riv, root, { name: 'Shadow', x: 100, y: 168, w: 70, h: 10, color: SHADOW });
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: 120, fps: 60, loop: 'loop' });
  const boxParts = [bowL, bowR, knot, ribbon, lid, base];
  moveGroup(riv, an, boxParts, null, [[0, 100], [30, 95], [60, 100], [90, 95], [120, 100]]);
  rotGroup(riv, an, boxParts, [[0, 0], [40, 0], [46, -0.07], [52, 0.06], [58, 0], [120, 0]]);
  keys(riv, an, shadow.id, SX, [[0, 1], [30, 0.88], [60, 1], [90, 0.88], [120, 1]]);
  keys(riv, an, sp.id, OPACITY, [[0, 0], [20, 0], [30, 1], [50, 0], [120, 0]], 'linear');
  keys(riv, an, sp.id, SX, [[0, 0.5], [30, 1.15], [50, 0.5], [120, 0.5]]);
  keys(riv, an, sp.id, SY, [[0, 0.5], [30, 1.15], [50, 0.5], [120, 0.5]]);
  save('gacha-box', riv);
}

// ---- 2. gacha-open: mở hộp 1 lần (150f = 2,5s, oneshot) ----
// f0–15 rung mạnh; f15 nắp bay lên + mờ dần; f15–45 tia sáng bung; f15–60 xu bung;
// f20–40 miệng hộp tối hiện ra; frame cuối: hộp mở + xu + tia mờ + hào quang.
{
  const { riv, ab, root } = newFile('gacha-open');
  // Xu (mỗi đồng = 2 shape: ngoài vàng đậm + trong vàng nhạt) — vẽ TRƯỚC = trên cùng.
  const coins = [];
  const coinTargets = [[52, 58, -1.2], [78, 38, 0.8], [104, 30, -0.6], [132, 42, 1.1], [150, 66, -0.9]];
  for (const [tx, ty] of coinTargets) {
    const outer = ell(riv, root, { name: 'Coin', x: 100, y: 105, w: 20, color: YELLOW, stroke: INK, strokeW: 2.5 });
    const inner = ell(riv, root, { name: 'CoinIn', x: 100, y: 105, w: 12, color: PALE });
    coins.push({ outer, inner, tx, ty });
  }
  const sp1 = sparkle(riv, root, 55, 50, 7);
  const sp2 = sparkle(riv, root, 150, 45, 8);
  const sp3 = sparkle(riv, root, 128, 95, 6);
  const mouth = ell(riv, root, { name: 'Mouth', x: 100, y: 94, w: 64, h: 14, color: INK });
  const bowL = ell(riv, root, { name: 'BowL', x: 86, y: 84, w: 18, h: 12, color: RED, stroke: INK, strokeW: 2.5 });
  const bowR = ell(riv, root, { name: 'BowR', x: 114, y: 84, w: 18, h: 12, color: RED, stroke: INK, strokeW: 2.5 });
  const knot = ell(riv, root, { name: 'Knot', x: 100, y: 86, w: 11, color: RED, stroke: INK, strokeW: 2.5 });
  const lidRibbon = rect(riv, root, { name: 'LidRibbon', x: 100, y: 88, w: 12, h: 22, color: RED });
  const lid = rect(riv, root, { name: 'Lid', x: 100, y: 88, w: 92, h: 22, r: 6, color: YELLOW, stroke: INK, strokeW: 3 });
  const baseRibbon = rect(riv, root, { name: 'BaseRibbon', x: 100, y: 125, w: 12, h: 70, color: RED });
  const base = rect(riv, root, { name: 'Base', x: 100, y: 125, w: 80, h: 70, r: 8, color: YELLOW, stroke: INK, strokeW: 3 });
  const rays = [-160, -130, -110, -90, -70, -50, -20].map(d => ray(riv, root, 100, 105, d, 88, 5));
  const glow = ell(riv, root, { name: 'Glow', x: 100, y: 105, w: 150, h: 130, color: PALE });
  const shadow = ell(riv, root, { name: 'Shadow', x: 100, y: 168, w: 70, h: 10, color: SHADOW });
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: 150, fps: 60, loop: 'oneshot' });

  // Rung mạnh lúc đầu (cả hộp đóng).
  const closedParts = [bowL, bowR, knot, lidRibbon, lid, baseRibbon, base];
  rotGroup(riv, an, closedParts, [[0, 0], [4, -0.1], [8, 0.1], [12, -0.08], [15, 0]]);
  // Nắp + nơ bay thẳng lên rồi mờ (f15→48). Không xoay — xoay quanh tâm riêng sẽ tách nơ khỏi nắp.
  const flyY = [[0, 88], [15, 88], [35, 8], [48, 8]];
  const flyOp = [[0, 1], [28, 1], [48, 0], [150, 0]];
  for (const p of [bowL, bowR, knot, lidRibbon, lid]) {
    const dy = p.y - 88;
    keys(riv, an, p.id, Y, flyY.map(([f, v]) => [f, v + dy]));
    keys(riv, an, p.id, OPACITY, flyOp, 'linear');
  }
  // Dải ruy-băng trên thân hộp mờ đi khi mở.
  keys(riv, an, baseRibbon.id, OPACITY, [[0, 1], [15, 1], [30, 0], [150, 0]], 'linear');
  // Miệng hộp tối hiện ra khi nắp bay.
  keys(riv, an, mouth.id, OPACITY, [[0, 0], [20, 0], [40, 1], [150, 1]], 'linear');
  // Tia sáng bung từ tâm hộp rồi mờ dần, giữ lại mờ mờ ở frame cuối.
  for (const r of rays) {
    keys(riv, an, r.id, SX, [[0, 0], [15, 0], [45, 1], [150, 1]]);
    keys(riv, an, r.id, SY, [[0, 0], [15, 0], [45, 1], [150, 1]]);
    keys(riv, an, r.id, OPACITY, [[0, 0], [20, 0], [45, 0.85], [90, 0.6], [150, 0.45]], 'linear');
  }
  // Hào quang sau hộp.
  keys(riv, an, glow.id, OPACITY, [[0, 0], [15, 0], [40, 0.55], [150, 0.55]], 'linear');
  keys(riv, an, glow.id, SX, [[0, 0.7], [40, 1], [150, 1]]);
  keys(riv, an, glow.id, SY, [[0, 0.7], [40, 1], [150, 1]]);
  // Xu bung ra từ trong hộp tới vị trí đích, xoay, rồi đứng yên.
  for (const c of coins) {
    const rot = coinTargets.find(([tx]) => tx === c.tx)[2];
    for (const p of [c.outer, c.inner]) {
      keys(riv, an, p.id, X, [[0, 100], [15, 100], [45, c.tx], [70, c.tx], [150, c.tx]]);
      keys(riv, an, p.id, Y, [[0, 105], [15, 100], [45, c.ty], [70, c.ty + 4], [150, c.ty + 4]]);
      keys(riv, an, p.id, ROT, [[0, 0], [45, rot], [150, rot]]);
      keys(riv, an, p.id, OPACITY, [[0, 0], [15, 0], [25, 1], [150, 1]], 'linear');
    }
  }
  // Tia lấp lánh chớp quanh vụ nổ.
  for (const [sp, f0] of [[sp1, 25], [sp2, 32], [sp3, 40]]) {
    keys(riv, an, sp.id, OPACITY, [[0, 0], [f0, 0], [f0 + 10, 1], [f0 + 30, 0], [150, 0]], 'linear');
    keys(riv, an, sp.id, SX, [[0, 0.5], [f0 + 10, 1.2], [f0 + 30, 0.5], [150, 0.5]]);
    keys(riv, an, sp.id, SY, [[0, 0.5], [f0 + 10, 1.2], [f0 + 30, 0.5], [150, 0.5]]);
  }
  save('gacha-open', riv);
}
console.log('done');
