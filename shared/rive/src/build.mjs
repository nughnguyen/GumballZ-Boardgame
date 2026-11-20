// Build 4 file .riv đầu tiên cho trang chủ GumballZ Boardgame (v2).
// Chạy (ESM không dùng NODE_PATH, và Node resolve symlink về đường dẫn thật):
//   cp shared/rive/src/build.mjs /tmp/rive-gen/build.mjs
//   cd /tmp/rive-gen && npm install @stevysmith/rive-generator   (lần đầu)
//   node build.mjs
// Mỗi file: 1 artboard 200×200 + 1 animation "loop" duy nhất — mount code
// chỉ cần autoplay: true, KHÔNG chọn animation theo tên (xem README.md).
//
// KIẾN TRÚC ĐÃ KIỂM CHỨNG (v2 — sửa 2 lỗi của v1):
// 1) CHỈ 1 Node "Root" ở (0,0) làm con duy nhất của artboard; mọi shape nằm
//    trong Root, tọa độ TUYỆT ĐỐI. Lý do: parentId trong .riv phải là LOCAL
//    index trong artboard (Artboard=0, Backboard không tính — theo tài liệu
//    định dạng .riv chính thức), nhưng thư viện ghi theo khoảng cách (distance)
//    nên chỉ đúng trong nhóm top-level ĐẦU TIÊN. V1 có 2 nhóm top-level
//    (Node + Shadow/Board riêng) -> Shadow/Board vẽ sai/mất. Probe: 1 Node
//    chứa nhiều shape thì mọi parentId đều đúng.
// 2) KeyedObject.objectId cũng phải là LOCAL index -> keys() truyền
//    target-1 (global index trừ 1 cho Backboard). Đã chứng minh bằng probe P1:
//    objectId=2 (global của Node) làm SHAPE con bay khỏi canvas, còn
//    objectId=1 (local của Node) mới trượt đúng Node.
// 3) Mỗi shape chỉ 1 path (mỗi chấm xúc xắc = 1 shape riêng).
//
// Thứ tự vẽ (Rive): con ĐƯỢC THÊM TRƯỚC vẽ Ở TRÊN cùng — nên add theo
// thứ tự từ trước ra sau (chi tiết mặt -> thân -> nền). Đã kiểm chứng bằng
// ảnh chụp CLI + runtime.
//
// LƯU Ý: PropertyKey.opacity của thư viện = 46 (opacity của gradient),
// KHÔNG phải opacity của Shape/Node (WorldTransformComponent.opacity = 18
// theo schema Rive). Chỗ cần mờ/đổi mặt dùng hằng OPACITY = 18 bên dưới.
import { writeFileSync } from 'node:fs';
import { RiveFile, hex, rgba, PropertyKey } from '@stevysmith/rive-generator';

const OUT = '/home/hatch/workspace/bgvn-hisrepo/shared/rive/';
const INK = hex('#241A38');
const RED = hex('#FF5A60');
const YELLOW = hex('#FACD33');
const TEAL = hex('#2EC5B6');
const CREAM = hex('#FFF8EE');
const SHADOW = rgba(36, 26, 56, 51); // mực 20%
const OPACITY = 18; // WorldTransformComponent.opacity (schema Rive)
const ROT = 15, SX = 16, SY = 17, X = 13, Y = 14; // PropertyKey.x/y/...

// objectId = LOCAL index = global index - 1 (1 Backboard ở đầu file).
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

// Trả về {id, x, y} để nhóm chuyển động dùng lại tọa độ gốc.
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
// Hình chữ nhật xoay quanh tâm (cx,cy): trả về 4 đỉnh (tính sẵn).
function rotRectPoints(cx, cy, w, h, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [[w / 2, h / 2], [-w / 2, h / 2], [-w / 2, -h / 2], [w / 2, -h / 2]]
    .map(([dx, dy]) => [cx + dx * c - dy * s, cy + dx * s + dy * c]);
}

// Cả nhóm cùng chuyển động: x/y tuyệt đối = gốc + độ lệch theo keyframe.
// cxF/cyF là [[frame, giá trị tuyệt đối của tâm nhóm]].
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

// ---- 1. typhu: xúc xắc đỏ nảy + xoay, đổi mặt 5 <-> 2 (120f = 2s) ----
{
  const { riv, ab, root } = newFile('typhu');
  const dieY = [[0, 100], [30, 52], [60, 100], [90, 76], [120, 100]];
  const rot = [[0, 0], [30, 0.6], [60, 0], [90, 0.3], [120, 0]];
  const squash = [[0, 1], [56, 1], [60, 0.82], [66, 1], [120, 1]];
  const face5 = [[0, 1], [28, 1], [30, 0], [88, 0], [90, 1], [120, 1]];
  const face2 = [[0, 0], [28, 0], [30, 1], [88, 1], [90, 0], [120, 0]];
  // Chấm: vị trí = xoay offset quanh tâm xúc xắc + tâm xúc xắc (tính bằng trig).
  const pip = (lx, ly) => {
    const s = ell(riv, root, { name: 'Pip', x: 100 + lx, y: 100 + ly, w: 14, color: CREAM });
    return { ...s, lx, ly };
  };
  const pips5 = [[-19, -19], [19, -19], [0, 0], [-19, 19], [19, 19]].map(([lx, ly]) => pip(lx, ly));
  const pips2 = [[-19, -19], [19, 19]].map(([lx, ly]) => pip(lx, ly));
  const body = rect(riv, root, { name: 'Body', x: 100, y: 100, w: 72, h: 72, r: 14, color: RED, stroke: INK, strokeW: 4 });
  const shadow = ell(riv, root, { name: 'Shadow', x: 100, y: 150, w: 56, h: 12, color: SHADOW });
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: 120, fps: 60, loop: 'loop' });
  keys(riv, an, body.id, Y, dieY);
  keys(riv, an, body.id, ROT, rot);
  keys(riv, an, body.id, SY, squash);
  for (const p of pips5) {
    keys(riv, an, p.id, X, rot.map(([f, a]) => [f, 100 + p.lx * Math.cos(a) - p.ly * Math.sin(a)]));
    keys(riv, an, p.id, Y, dieY.map(([f, dy], i) => [f, dy + p.lx * Math.sin(rot[i][1]) + p.ly * Math.cos(rot[i][1])]));
    keys(riv, an, p.id, SY, squash);
    keys(riv, an, p.id, OPACITY, face5, 'linear');
  }
  for (const p of pips2) {
    keys(riv, an, p.id, X, rot.map(([f, a]) => [f, 100 + p.lx * Math.cos(a) - p.ly * Math.sin(a)]));
    keys(riv, an, p.id, Y, dieY.map(([f, dy], i) => [f, dy + p.lx * Math.sin(rot[i][1]) + p.ly * Math.cos(rot[i][1])]));
    keys(riv, an, p.id, SY, squash);
    keys(riv, an, p.id, OPACITY, face2, 'linear');
  }
  keys(riv, an, shadow.id, SX, [[0, 1], [30, 0.6], [60, 1], [90, 0.8], [120, 1]]);
  save('typhu', riv);
}

// ---- 2. cotuong: quân Tướng đỏ trượt qua lại + nhún (180f = 3s) ----
{
  const { riv, ab, root } = newFile('cotuong');
  const dot = ell(riv, root, { name: 'Dot', x: 100, y: 100, w: 14, color: RED });
  const inner = ell(riv, root, { name: 'Inner', x: 100, y: 100, w: 52, color: CREAM, stroke: INK, strokeW: 2 });
  const outer = ell(riv, root, { name: 'Outer', x: 100, y: 100, w: 68, color: RED, stroke: INK, strokeW: 4 });
  const board = rect(riv, root, { name: 'Board', x: 100, y: 152, w: 160, h: 6, r: 3, color: TEAL });
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: 180, fps: 60, loop: 'loop' });
  moveGroup(riv, an, [dot, inner, outer],
    [[0, 100], [45, 145], [90, 100], [135, 55], [180, 100]],
    [[0, 100], [45, 94], [90, 100], [135, 94], [180, 100]]);
  save('cotuong', riv);
}

// ---- 3. cangua: ngựa phi từng bước (144f = 2.4s) ----
{
  const { riv, ab, root } = newFile('cangua');
  const eye = ell(riv, root, { name: 'Eye', x: 112, y: 92, w: 8, color: INK });
  const muzzle = ell(riv, root, { name: 'Muzzle', x: 130, y: 106, w: 18, color: CREAM, stroke: INK, strokeW: 2 });
  const earL = poly(riv, root, { name: 'EarL', cx: 88, cy: 79, points: [[84, 84], [92, 82], [88, 70]], color: TEAL });
  const earR = poly(riv, root, { name: 'EarR', cx: 104, cy: 76, points: [[100, 80], [108, 80], [104, 68]], color: TEAL });
  const body = ell(riv, root, { name: 'Body', x: 100, y: 100, w: 56, h: 40, color: TEAL });
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: 144, fps: 60, loop: 'loop' });
  const parts = [eye, muzzle, earL, earR, body];
  moveGroup(riv, an, parts,
    [[0, 60], [36, 100], [72, 140], [108, 100], [144, 60]],
    [[0, 100], [36, 68], [72, 100], [108, 68], [144, 100]]);
  rotGroup(riv, an, parts, [[0, 0], [36, 0.06], [72, 0], [108, -0.06], [144, 0]]);
  save('cangua', riv);
}

// ---- 4. camel: lạc đà bước đi, chân đung đưa (180f = 3s) ----
{
  const { riv, ab, root } = newFile('camel');
  const eye = ell(riv, root, { name: 'Eye', x: 156, y: 58, w: 6, color: INK });
  const ear = poly(riv, root, { name: 'Ear', cx: 146, cy: 48, points: [[142, 54], [150, 52], [146, 42]], color: YELLOW });
  const head = ell(riv, root, { name: 'Head', x: 152, y: 62, w: 22, h: 16, color: YELLOW });
  const neck = poly(riv, root, { name: 'Neck', cx: 138, cy: 80, points: rotRectPoints(138, 80, 12, 36, -0.5), color: YELLOW });
  const hump1 = ell(riv, root, { name: 'Hump1', x: 82, y: 72, w: 30, color: YELLOW });
  const hump2 = ell(riv, root, { name: 'Hump2', x: 118, y: 72, w: 30, color: YELLOW });
  const tail = rect(riv, root, { name: 'Tail', x: 58, y: 92, w: 4, h: 18, color: INK });
  const legFL = rect(riv, root, { name: 'LegFL', x: 72, y: 108, w: 8, h: 26, py: 13, color: INK });
  const legFR = rect(riv, root, { name: 'LegFR', x: 128, y: 108, w: 8, h: 26, py: 13, color: INK });
  const legBL = rect(riv, root, { name: 'LegBL', x: 86, y: 108, w: 8, h: 26, py: 13, color: INK });
  const legBR = rect(riv, root, { name: 'LegBR', x: 114, y: 108, w: 8, h: 26, py: 13, color: INK });
  const body = ell(riv, root, { name: 'Body', x: 100, y: 100, w: 90, h: 44, color: YELLOW });
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: 180, fps: 60, loop: 'loop' });
  const upper = [eye, ear, head, neck, hump1, hump2, tail, body];
  for (const p of upper) {
    keys(riv, an, p.id, Y, [[0, p.y], [45, p.y - 4], [90, p.y], [135, p.y - 4], [180, p.y]]);
  }
  const swingA = [[0, 0], [45, 0.28], [90, 0], [135, -0.28], [180, 0]];
  const swingB = [[0, 0], [45, -0.28], [90, 0], [135, 0.28], [180, 0]];
  keys(riv, an, legFL.id, ROT, swingA);
  keys(riv, an, legBR.id, ROT, swingA);
  keys(riv, an, legBL.id, ROT, swingB);
  keys(riv, an, legFR.id, ROT, swingB);
  save('camel', riv);
}
console.log('done');
