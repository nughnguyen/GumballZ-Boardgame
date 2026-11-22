// Build 2 file .riv cho rương Gacha ở Cửa hàng (v3 — kiểu Duolingo Sanduk, xem shared/rive/src/README.md).
// Chạy:
//   cp shared/rive/src/build-gacha.mjs /tmp/rive-gen/build-gacha.mjs
//   cd /tmp/rive-gen && node build-gacha.mjs
// - gacha-box.riv: rương gỗ đóng (viền vàng + ô cam + khóa sao vàng), nảy nhẹ + lắc khẽ (idle, loop 120f = 2s).
// - gacha-open.riv: mở 1 lần theo timeline Duolingo (oneshot 180f = 3s):
//   f0–17 phồng 104% lấy đà; f28–32 lắc mạnh sang trái ~−8°; f30–60 nắp bật mở (bay lên + xoay + mờ);
//   f47 ĐỈNH BUNG: 3 đá xanh + 6 xu vàng + tia lấp lánh; f62 về thẳng đứng; f82–92 tia mờ hẳn;
//   frame cuối: rương mở + đá nằm trên miệng + xu quanh. KHÔNG hào quang, KHÔNG tia dài.
// Mount: autoplay, KHÔNG truyền tên animation (tên ghi sai key — xem README).
import { writeFileSync } from 'node:fs';
import { RiveFile, hex, rgba, PropertyKey } from '@stevysmith/rive-generator';

const OUT = '/home/hatch/workspace/bgvn-hisrepo/shared/rive/';
const INK = hex('#241A38');
const YELLOW = hex('#FACD33');
const PALE = hex('#FFE9A8');
const GOLD = hex('#E9A820');
const SHADOW = rgba(36, 26, 56, 51);
const WOOD = hex('#A06B35');
const WOOD_DARK = hex('#8B5A2B');
const WOOD_BAND = hex('#6B4423');
const ORANGE = hex('#F97316');
const GEM = hex('#A5D8FF');
const GEM_DEEP = hex('#7DD3FC');
const GEM_LINE = hex('#38BDF8');
const PEACH = hex('#FF9E9E');
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
// Hình thoi lấp lánh (tâm cx,cy, bán kính r).
function sparkle(riv, parent, cx, cy, r = 7) {
  return poly(riv, parent, { name: 'Spark', cx, cy, points: [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]], color: PALE, stroke: GOLD, strokeW: 1.5 });
}
// Viên đá xanh hình thoi (hơi thon, kiểu Duolingo).
function gem(riv, parent, cx, cy, r, color) {
  return poly(riv, parent, { name: 'Gem', cx, cy, points: [[cx, cy - r], [cx + r * 0.72, cy], [cx, cy + r], [cx - r * 0.72, cy]], color, stroke: GEM_LINE, strokeW: 2 });
}
// Ngôi sao / bánh răng 8 cánh (ổ khóa rương).
function star(riv, parent, cx, cy, rO, rI, color, stroke, strokeW) {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 8;
    const r = i % 2 === 0 ? rO : rI;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return poly(riv, parent, { name: 'LockStar', cx, cy, points: pts, color, stroke, strokeW });
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
function scaleGroup(riv, anim, parts, scF) {
  for (const p of parts) {
    keys(riv, anim, p.id, SX, scF);
    keys(riv, anim, p.id, SY, scF);
  }
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
// Vẽ thân + nắp rương gỗ Duolingo (dùng chung 2 file). Trả về các nhóm part.
// QUY TẮC THỨ TỰ (đã kiểm chứng bằng order-test 2026-11-22: runtime vẽ shape
// tạo TRƯỚC lên trên — "vẽ sau = ở dưới", như build.mjs vẫn làm bg() sau cùng):
// tạo theo thứ tự từ trên xuống: khóa → nắp → miệng → thân → bóng.
function chest(riv, root) {
  const lockDot = ell(riv, root, { name: 'LockDot', x: 100, y: 104, w: 9, color: PEACH, stroke: INK, strokeW: 1.5 });
  const lockStar = star(riv, root, 100, 104, 13, 6, YELLOW, INK, 2.5);
  const lidSq = [
    [48, 71], [76, 71], [124, 71], [152, 71],
  ].map(([x, y]) => rect(riv, root, { name: 'LidSq', x, y, w: 9, h: 9, r: 2, color: ORANGE, stroke: INK, strokeW: 1.5 }));
  const lidBand = rect(riv, root, { name: 'LidBand', x: 100, y: 97, w: 128, h: 6, color: WOOD_BAND });
  const lid = rect(riv, root, { name: 'Lid', x: 100, y: 88, w: 128, h: 28, r: 7, color: WOOD_DARK, stroke: INK, strokeW: 3 });
  const lidTrim = rect(riv, root, { name: 'LidTrim', x: 100, y: 88, w: 136, h: 34, r: 8, color: YELLOW, stroke: INK, strokeW: 3 });
  const mouth = ell(riv, root, { name: 'Mouth', x: 100, y: 96, w: 104, h: 10, color: INK });
  const bodySq = [
    [38, 112], [38, 144], [162, 112], [162, 144],
    [48, 162], [76, 162], [124, 162], [152, 162],
  ].map(([x, y]) => rect(riv, root, { name: 'BodySq', x, y, w: 9, h: 9, r: 2, color: ORANGE, stroke: INK, strokeW: 1.5 }));
  const grain2 = rect(riv, root, { name: 'Grain2', x: 100, y: 140, w: 112, h: 3, color: WOOD_DARK });
  const grain1 = rect(riv, root, { name: 'Grain1', x: 100, y: 116, w: 112, h: 3, color: WOOD_DARK });
  const body = rect(riv, root, { name: 'Body', x: 100, y: 128, w: 120, h: 64, r: 8, color: WOOD, stroke: INK, strokeW: 3 });
  const bodyTrim = rect(riv, root, { name: 'BodyTrim', x: 100, y: 128, w: 128, h: 72, r: 10, color: YELLOW, stroke: INK, strokeW: 3 });
  const shadow = ell(riv, root, { name: 'Shadow', x: 100, y: 170, w: 92, h: 10, color: SHADOW });
  const bodyParts = [bodyTrim, body, grain1, grain2, ...bodySq, mouth];
  const lidParts = [lidTrim, lid, lidBand, ...lidSq, lockStar, lockDot];
  return { shadow, bodyParts, lidParts, mouth };
}

// ---- 1. gacha-box: rương đóng idle — nảy nhẹ + lắc khẽ + tia lấp lánh (120f = 2s, loop) ----
{
  const { riv, ab, root } = newFile('gacha-box');
  const { shadow, bodyParts, lidParts, mouth } = chest(riv, root);
  const sp = sparkle(riv, root, 152, 58, 8);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: 120, fps: 60, loop: 'loop' });
  const boxParts = [...bodyParts, ...lidParts];
  moveGroup(riv, an, boxParts, null, [[0, 100], [30, 96], [60, 100], [90, 96], [120, 100]]);
  rotGroup(riv, an, boxParts, [[0, 0], [40, 0], [46, -0.05], [52, 0.04], [58, 0], [120, 0]]);
  keys(riv, an, shadow.id, SX, [[0, 1], [30, 0.9], [60, 1], [90, 0.9], [120, 1]]);
  keys(riv, an, mouth.id, OPACITY, [[0, 0], [120, 0]], 'linear');
  keys(riv, an, sp.id, OPACITY, [[0, 0], [20, 0], [30, 1], [50, 0], [120, 0]], 'linear');
  keys(riv, an, sp.id, SX, [[0, 0.5], [30, 1.15], [50, 0.5], [120, 0.5]]);
  keys(riv, an, sp.id, SY, [[0, 0.5], [30, 1.15], [50, 0.5], [120, 0.5]]);
  save('gacha-box', riv);
}

// ---- 2. gacha-open: mở rương 1 lần kiểu Duolingo (180f = 3s, oneshot) ----
// f0–17 phồng 104% lấy đà; f28–32 lắc mạnh trái ~−8°; f30–60 nắp bật mở;
// f47 ĐỈNH BUNG (đá + xu + tia); f62 về thẳng đứng; f82–92 tia mờ hẳn;
// frame cuối: rương mở + 3 đá xanh trên miệng + 6 xu vàng quanh.
{
  const { riv, ab, root } = newFile('gacha-open');
  // Đá/xu/tia tạo TRƯỚC rương (tạo trước = vẽ trên — xem quy tắc ở chest()).
  // 3 đá xanh lớn xếp chồng trên miệng rương + 3 đá nhỏ lơ lửng quanh.
  const gems = [
    gem(riv, root, 86, 80, 12, GEM),
    gem(riv, root, 100, 70, 12, GEM),
    gem(riv, root, 114, 80, 12, GEM),
    gem(riv, root, 62, 62, 5.5, GEM_DEEP),
    gem(riv, root, 140, 56, 5.5, GEM_DEEP),
    gem(riv, root, 150, 96, 5.5, GEM_DEEP),
  ];
  // 6 xu vàng (ngoài vàng đậm + trong vàng nhạt).
  const coins = [];
  const coinTargets = [[56, 54, -1.1], [78, 36, 0.8], [100, 28, -0.6], [124, 38, 1.0], [146, 60, -0.9], [88, 58, 0.5]];
  for (const [tx, ty] of coinTargets) {
    const outer = ell(riv, root, { name: 'Coin', x: 100, y: 100, w: 20, color: YELLOW, stroke: INK, strokeW: 2.5 });
    const inner = ell(riv, root, { name: 'CoinIn', x: 100, y: 100, w: 12, color: PALE });
    coins.push({ outer, inner, tx, ty });
  }
  // 4 tia lấp lánh hình thoi quanh vụ bung.
  const sparks = [
    [sparkle(riv, root, 55, 50, 7), 30],
    [sparkle(riv, root, 150, 45, 8), 36],
    [sparkle(riv, root, 128, 95, 6), 42],
    [sparkle(riv, root, 70, 82, 6), 48],
  ];
  // Rương tạo SAU đá/xu/tia (tạo sau = vẽ dưới) nhưng TRƯỚC animation:
  // keyed object dùng id-1 nên animation phải đứng sau mọi shape.
  const { shadow, bodyParts, lidParts, mouth } = chest(riv, root);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: 180, fps: 60, loop: 'oneshot' });

  // Phồng lấy đà + lắc mạnh trái + về thẳng đứng (thân rương).
  const swell = [[0, 1], [10, 1.04], [17, 1.02], [31, 1.03], [47, 1], [180, 1]];
  const shakeX = [[0, 100], [28, 97.5], [31, 97.5], [38, 99], [47, 100], [180, 100]];
  const shakeY = [[0, 100], [10, 102], [17, 100], [180, 100]];
  const shakeR = [[0, 0], [10, 0], [17, 0], [28, -0.137], [31, -0.153], [38, -0.06], [47, 0.027], [62, 0], [180, 0]];
  moveGroup(riv, an, bodyParts, shakeX, shakeY);
  rotGroup(riv, an, bodyParts, shakeR);
  scaleGroup(riv, an, bodyParts, swell);
  // Nắp: lắc cùng thân rồi bật mở (bay lên + xoay −0,45 + mờ dần f42→60).
  const flyY = [[0, 88], [28, 88], [38, 60], [55, 10], [180, 10]];
  const flyR = [[0, 0], [28, -0.137], [31, -0.153], [38, -0.08], [47, -0.25], [55, -0.45], [180, -0.45]];
  const flyOp = [[0, 1], [42, 1], [60, 0], [180, 0]];
  for (const p of lidParts) {
    const dy = p.y - 88;
    keys(riv, an, p.id, Y, flyY.map(([f, v]) => [f, v + dy]));
    keys(riv, an, p.id, ROT, flyR);
    keys(riv, an, p.id, OPACITY, flyOp, 'linear');
  }
  scaleGroup(riv, an, lidParts, swell);
  // Bóng đổ phồng theo rương.
  keys(riv, an, shadow.id, SX, [[0, 1], [10, 1.06], [17, 1], [180, 1]]);
  // Miệng hộp tối hiện ra khi nắp bay (đã khuất sau nắp lúc đóng).
  keys(riv, an, mouth.id, OPACITY, [[0, 0], [35, 0], [55, 1], [180, 1]], 'linear');
  // Đá xanh hiện dần tới đỉnh bung f47, nằm yên trên miệng tới hết.
  for (const [i, g] of gems.entries()) {
    keys(riv, an, g.id, OPACITY, [[0, 0], [30, 0], [47, 1], [180, 1]], 'linear');
    keys(riv, an, g.id, Y, [[0, g.y + 8], [30, g.y + 8], [47, g.y], [180, g.y]]);
    keys(riv, an, g.id, SX, [[0, 0.6], [47, 1], [180, 1]]);
    keys(riv, an, g.id, SY, [[0, 0.6], [47, 1], [180, 1]]);
    if (i >= 3) keys(riv, an, g.id, ROT, [[0, 0], [47, 0.5], [180, 0.5]]);
  }
  // Xu vàng bung theo vòng cung: lên tới đỉnh rồi rơi/nảy nhẹ về vị trí đích.
  for (const c of coins) {
    const rot = coinTargets.find(([tx]) => tx === c.tx)[2];
    for (const p of [c.outer, c.inner]) {
      keys(riv, an, p.id, X, [[0, 100], [30, 100], [60, c.tx], [180, c.tx]]);
      keys(riv, an, p.id, Y, [[0, 100], [30, 100], [45, c.ty - 14], [70, c.ty + 4], [180, c.ty + 4]]);
      keys(riv, an, p.id, ROT, [[0, 0], [60, rot], [180, rot]]);
      keys(riv, an, p.id, OPACITY, [[0, 0], [30, 0], [40, 1], [180, 1]], 'linear');
    }
  }
  // Tia lấp lánh chớp quanh vụ bung rồi mờ hẳn trước f92.
  for (const [sp, f0] of sparks) {
    keys(riv, an, sp.id, OPACITY, [[0, 0], [f0, 0], [f0 + 10, 1], [f0 + 30, 0], [180, 0]], 'linear');
    keys(riv, an, sp.id, SX, [[0, 0.5], [f0 + 10, 1.2], [f0 + 30, 0.5], [180, 0.5]]);
    keys(riv, an, sp.id, SY, [[0, 0.5], [f0 + 10, 1.2], [f0 + 30, 0.5], [180, 0.5]]);
  }
  save('gacha-open', riv);
}
console.log('done');
