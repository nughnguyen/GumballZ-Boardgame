// Build 4 file .riv đợt 1 — THIẾT KẾ LẠI v4 (2026-11-21).
// QUY TẮC THIẾT KẾ (anh Hưng đặt 2026-11-21 ~01:47, thay thế hướng
// "cảnh mini" v3): MỖI FILE .riv CHỈ LẤY PHẦN CHƠI THẬT của game đó —
// một lát cắt nhỏ cho người xem biết lúc chơi game như thế nào.
//   typhu: 1 nhân vật NHẢY TỪNG Ô quanh 1 GÓC của bàn (chỉ hiện góc vuông
//     + vài ô mỗi phía, có nhà nhỏ trên 1-2 ô); nhảy hết vòng rồi lặp lại.
//   cangua: 1 QUÂN NGỰA nhảy từng ô dọc đường đi trên bàn cá ngựa (hiện 1
//     đoạn bàn có đường ô màu + quân ngựa nhảy tiến từng ô).
//   cotuong: quân di chuyển trên bàn — lưới cung có chéo X + 3 quân, 1 quân
//     Mã thực hiện 1 nước nhảy chữ L rõ ràng mỗi vòng rồi lặp lại.
//   camel: 2 lạc đà BƯỚC TIẾN từng bước dọc đường đua về phía cờ đích
//     (tiến lên theo lượt mới là phần chơi của game đua).
// Ví dụ gốc của anh Hưng cho các batch sau: caro = X/O đánh lần lượt, bên
// nào chạm 5 trước thì WIN và gạch đường win; xidach = 2 lá bài lật lại,
// thấy 1 con XÌ (Át) và 1 con TÂY (lá hình).
// Chạy (ESM không dùng NODE_PATH, Node resolve symlink về đường dẫn thật):
//   cp shared/rive/src/build.mjs /tmp/rive-gen/build.mjs
//   cd /tmp/rive-gen && npm install @stevysmith/rive-generator   (lần đầu)
//   node build.mjs
// Mỗi file: 1 artboard 200×200 + 1 animation "loop" duy nhất — mount code
// chỉ cần autoplay: true, KHÔNG chọn animation theo tên (xem README.md).
//
// KIẾN TRÚC ĐÃ KIỂM CHỨNG (v2 — giữ nguyên cho v4):
// 1) CHỈ 1 Node "Root" ở (0,0) làm con duy nhất của artboard; mọi shape nằm
//    trong Root, tọa độ TUYỆT ĐỐI.
// 2) KeyedObject.objectId là LOCAL index -> keys() truyền target-1.
// 3) Mỗi shape chỉ 1 path (mỗi chấm xúc xắc = 1 shape riêng).
// 4) Thứ tự vẽ: thêm trước = vẽ TRÊN cùng — add chi tiết mặt -> thân -> nền.
// 5) Opacity Shape/Node = key 18 (PropertyKey.opacity của thư viện = 46 là
//    opacity gradient, không dùng).
// 6) addSolidColor(fillHoặcStroke, sốMàu) — KHÔNG phải options { color }.
// 7) File không có animation sẽ không vẽ gì — mọi file đều có "loop".
import { writeFileSync } from 'node:fs';
import { RiveFile, hex, rgba, PropertyKey } from '@stevysmith/rive-generator';

const OUT = '/home/hatch/workspace/bgvn-hisrepo/shared/rive/';
const INK = hex('#241A38');
const RED = hex('#FF5A60');
const YELLOW = hex('#FACD33');
const TEAL = hex('#2EC5B6');
const LAVENDER = hex('#B9A6FF');
const VIOLET = hex('#7C5CFF');
const CREAM = hex('#FFF8EE');
const SAND = hex('#F5D9A0');
const SAND2 = hex('#EFC978');
const SHADOW = rgba(36, 26, 56, 51); // mực 20%
const OPACITY = 18; // WorldTransformComponent.opacity (schema Rive)
const ROT = 15, SX = 16, SY = 17, X = 13, Y = 14;

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
// Sao 5 cánh: trả về 10 đỉnh (ngoài r, trong r*0.45), đỉnh đầu hướng lên.
function starPoints(cx, cy, r) {
  const pts = [];
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + k * Math.PI / 5;
    const rr = k % 2 === 0 ? r : r * 0.45;
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  return pts;
}

// Cả nhóm cùng dịch chuyển theo ĐỘ LỆCH (dxF/dyF là [[frame, offset]]).
// Khác moveGroup v2 (nhận tâm tuyệt đối, ngầm định tâm nhóm = 100,100).
function shift(riv, anim, parts, dxF, dyF) {
  for (const p of parts) {
    if (dxF) keys(riv, anim, p.id, X, dxF.map(([f, v]) => [f, p.x + v]));
    if (dyF) keys(riv, anim, p.id, Y, dyF.map(([f, v]) => [f, p.y + v]));
  }
}
function rangeFrames(start, end, step) { const a = []; for (let f = start; f <= end; f += step) a.push(f); return a; }
function sineFrames(frames, period, amp, phase = 0) {
  return frames.map(f => [f, Math.round(amp * Math.sin(2 * Math.PI * f / period + phase) * 100) / 100]);
}
// Nảy lên rồi về: 0 ở f=0, -amp ở nửa chu kỳ, 0 ở cuối chu kỳ (chỉ nhô lên).
function raisedCosFrames(frames, period, amp) {
  return frames.map(f => [f, Math.round(-amp * (1 - Math.cos(2 * Math.PI * f / period)) / 2 * 100) / 100]);
}
// Gộp frame trùng (giữ giá trị sau), sắp xếp theo frame.
function dedupe(frames) {
  const m = new Map();
  for (const [f, v] of frames) m.set(f, v);
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
}

// Quân nhảy TỪNG Ô dọc đường đi stops=[[x,y],...], hopF frame mỗi ô
// (nhảy + nghỉ), arcH = độ cao vòng cung. Cuối vòng: mờ dần -> dịch về ô
// đầu (lúc đang tàng hình) -> hiện dần. Trả về {dxF, dyF, shXF, shYF,
// shSXF, opF, squashF} — dxF/dyF là ĐỘ LỆCH so với stops[0] (dùng shift),
// bóng dùng tọa độ TUYỆT ĐỐI (shYF cộng thêm offY).
function hopFrames(stops, hopF, arcH, D, offY = 8) {
  const n = stops.length - 1; // số cú nhảy
  const hopEnd = n * hopF;
  const [x0, y0] = stops[0];
  const dxF = [], dyF = [], shXF = [], shYF = [], shSXF = [], squashF = [[0, 1]];
  for (let i = 0; i < n; i++) {
    const [xa, ya] = stops[i], [xb, yb] = stops[i + 1];
    const s = i * hopF, m = s + Math.round(hopF * 0.6), e = (i + 1) * hopF;
    dxF.push([s, xa - x0], [m, (xa + xb) / 2 - x0], [e, xb - x0]);
    dyF.push([s, ya - y0], [m, (ya + yb) / 2 - arcH - y0], [e, yb - y0]);
    shXF.push([s, xa], [m, (xa + xb) / 2], [e, xb]);
    shYF.push([s, ya + offY], [e, yb + offY]);
    shSXF.push([s, 1], [m, 0.7], [e, 1]);
    squashF.push([e - 2, 1], [e, 0.8], [e + 3, 1]);
  }
  // Dịch về ô đầu trong lúc tàng hình (fadeStart+6 -> +9), mờ dần 3f.
  const teleA = hopEnd + 6, teleB = hopEnd + 9;
  const [xL, yL] = stops[stops.length - 1];
  dxF.push([teleA, xL - x0], [teleB, 0], [D, 0]);
  dyF.push([teleA, yL - y0], [teleB, 0], [D, 0]);
  shXF.push([teleA, xL], [teleB, x0], [D, x0]);
  shYF.push([teleA, yL + offY], [teleB, y0 + offY], [D, y0 + offY]);
  shSXF.push([teleA, 1], [teleB, 1], [D, 1]);
  const opF = [[0, 1], [hopEnd, 1], [hopEnd + 3, 0], [D - 3, 0], [D, 1]];
  return { dxF: dedupe(dxF), dyF: dedupe(dyF), shXF: dedupe(shXF), shYF: dedupe(shYF), shSXF: dedupe(shSXF), opF, squashF: dedupe(squashF) };
}

// Quân cờ tướng: 3 vòng đồng tâm (chấm + vòng trong + vòng ngoài).
// Trả về [dot, inner, outer] theo thứ tự vẽ (trên cùng trước).
function disc(riv, root, x, y, outer, inner, dotC) {
  const dot = ell(riv, root, { name: 'Dot', x, y, w: 9, color: dotC });
  const inn = ell(riv, root, { name: 'In', x, y, w: 24, color: inner });
  const out = ell(riv, root, { name: 'Out', x, y, w: 32, color: outer, stroke: INK, strokeW: 2 });
  return [dot, inn, out];
}

// Chân bước theo lượt: steps = [[s,e],...] (mỗi bước 1 sải), amp = biên độ
// xoay, phase = pha (0 hoặc π để 2 cặp chân xen kẽ). Trả về [[f, rot]].
function strideKeys(steps, amp, phase = 0) {
  const out = [];
  for (const [s, e] of steps) {
    for (let t = s; t <= e; t += 7) {
      out.push([t, Math.round(amp * Math.sin(2 * Math.PI * (t - s) / (e - s) + phase) * 100) / 100]);
    }
    out.push([e, Math.round(amp * Math.sin(2 * Math.PI + phase) * 100) / 100]);
  }
  return dedupe(out);
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

// Cờ đích caro 2×2 + cột. o = {x, yTop (đỉnh cột), poleH, cell}. Trả về
// {pole, cells} — cells xoay quanh điểm gắn (x, yTop+8) để phất.
function makeFlag(riv, root, anim, o) {
  const ax = o.x, ay = o.yTop + o.cell; // điểm gắn cờ
  const pole = rect(riv, root, { name: 'FlagPole', x: ax, y: o.yTop + o.poleH / 2, w: 4, h: o.poleH, color: INK });
  const c = o.cell;
  const defs = [[4, -8, INK], [12, -8, CREAM], [4, 0, CREAM], [12, 0, INK]];
  const cells = defs.map(([px, py, color], i) =>
    rect(riv, root, { name: 'Flag' + i, x: ax, y: ay, w: c, h: c, px, py, color, stroke: INK, strokeW: 1 }));
  if (anim) {
    const D = o.duration || 144;
    const wave = [[0, 0], [Math.round(D / 4), 0.12], [Math.round(D / 2), 0], [Math.round(3 * D / 4), -0.12], [D, 0]];
    for (const cell of cells) keys(riv, anim, cell.id, ROT, wave);
  }
  return { pole, cells };
}

// Lạc đà (v3): thân + 2 bướu + cổ + đầu + tai + đuôi + 4 chân.
// o = {cx, cy, s, color, tag}. Trả về {all, legs:{FL,FR,BL,BR}}.
function makeCamel(riv, root, o) {
  const { cx, cy, s, color, tag } = o;
  const eye = ell(riv, root, { name: tag + 'Eye', x: cx + 56 * s, y: cy - 42 * s, w: Math.max(4, 6 * s), color: INK });
  const ear = poly(riv, root, { name: tag + 'Ear', cx: cx + 46 * s, cy: cy - 52 * s, points: [[cx + 42 * s, cy - 46 * s], [cx + 50 * s, cy - 48 * s], [cx + 46 * s, cy - 58 * s]], color });
  const head = ell(riv, root, { name: tag + 'Head', x: cx + 52 * s, y: cy - 38 * s, w: 22 * s, h: 16 * s, color, stroke: INK, strokeW: 2 });
  const neck = poly(riv, root, { name: tag + 'Neck', cx: cx + 38 * s, cy: cy - 20 * s, points: rotRectPoints(cx + 38 * s, cy - 20 * s, 12 * s, 36 * s, -0.5), color, stroke: INK, strokeW: 2 });
  const hump1 = ell(riv, root, { name: tag + 'Hump1', x: cx - 18 * s, y: cy - 28 * s, w: 30 * s, color });
  const hump2 = ell(riv, root, { name: tag + 'Hump2', x: cx + 18 * s, y: cy - 28 * s, w: 30 * s, color });
  const tail = rect(riv, root, { name: tag + 'Tail', x: cx - 42 * s, y: cy - 8 * s, w: 4 * s, h: 18 * s, color: INK });
  const legFL = rect(riv, root, { name: tag + 'LegFL', x: cx - 28 * s, y: cy + 8 * s, w: 8 * s, h: 44 * s, py: 22 * s, color: INK });
  const legFR = rect(riv, root, { name: tag + 'LegFR', x: cx + 28 * s, y: cy + 8 * s, w: 8 * s, h: 44 * s, py: 22 * s, color: INK });
  const legBL = rect(riv, root, { name: tag + 'LegBL', x: cx - 14 * s, y: cy + 8 * s, w: 8 * s, h: 44 * s, py: 22 * s, color: INK });
  const legBR = rect(riv, root, { name: tag + 'LegBR', x: cx + 14 * s, y: cy + 8 * s, w: 8 * s, h: 44 * s, py: 22 * s, color: INK });
  const body = ell(riv, root, { name: tag + 'Body', x: cx, y: cy, w: 90 * s, h: 44 * s, color, stroke: INK, strokeW: 3 });
  const all = [eye, ear, head, neck, hump1, hump2, tail, legFL, legFR, legBL, legBR, body];
  return { all, legs: { FL: legFL, FR: legFR, BL: legBL, BR: legBR } };
}

// ---- 1. typhu: NHÂN VẬT nhảy từng ô quanh 1 GÓC bàn (168f = 2,8s).
// Chỉ hiện góc vuông: hàng ngang 4 ô + cột dọc 3 ô, ô góc vàng; 2 nhà nhỏ
// trên 2 ô; nhân vật (mũ đỏ + đầu kem + thân ngọc) nhảy hết vòng rồi mờ
// dần về ô đầu, lặp lại. ----
{
  const { riv, ab, root } = newFile('typhu');
  const stops = [[28, 168], [63, 168], [98, 168], [133, 168], [133, 133], [133, 98], [133, 63]];
  const [cx0, cy0] = stops[0];
  // Nhân vật (vẽ trước = trên cùng): mũ, đầu, thân.
  const cap = poly(riv, root, { name: 'Cap', cx: cx0, cy: cy0 - 32, points: [[cx0, cy0 - 36], [cx0 - 7, cy0 - 29], [cx0 + 7, cy0 - 29]], color: RED, stroke: INK, strokeW: 1 });
  const head = ell(riv, root, { name: 'Head', x: cx0, y: cy0 - 24, w: 15, color: CREAM, stroke: INK, strokeW: 2 });
  const body = rect(riv, root, { name: 'Body', x: cx0, y: cy0 - 9, w: 18, h: 18, r: 7, color: TEAL, stroke: INK, strokeW: 2 });
  const shadow = ell(riv, root, { name: 'Shadow', x: cx0, y: cy0 + 8, w: 24, h: 7, color: SHADOW });
  // 2 nhà nhỏ trên 2 ô (mép trái ô, nhân vật đứng giữa ô nên không che hết).
  const h1Roof = poly(riv, root, { name: 'H1Roof', cx: 53, cy: 144, points: [[53, 140], [45, 148], [61, 148]], color: RED });
  const h1 = rect(riv, root, { name: 'H1', x: 53, y: 152, w: 14, h: 9, color: TEAL, stroke: INK, strokeW: 2 });
  const h2Roof = poly(riv, root, { name: 'H2Roof', cx: 88, cy: 144, points: [[88, 140], [80, 148], [96, 148]], color: TEAL });
  const h2 = rect(riv, root, { name: 'H2', x: 88, y: 152, w: 14, h: 9, color: YELLOW, stroke: INK, strokeW: 2 });
  // 7 ô: ô góc (133,168) vàng, còn lại kem; vạch màu trên 2 ô có nhà.
  const strip1 = rect(riv, root, { name: 'Strip1', x: 63, y: 155, w: 34, h: 8, color: TEAL });
  const strip2 = rect(riv, root, { name: 'Strip2', x: 98, y: 155, w: 34, h: 8, color: RED });
  const tiles = stops.map(([x, y], i) =>
    rect(riv, root, { name: 'Tile' + i, x, y, w: 34, h: 34, color: i === 3 ? YELLOW : CREAM, stroke: INK, strokeW: 2 }));
  // Đế bàn (2 tấm cát dưới các ô).
  const plateB = rect(riv, root, { name: 'PlateB', x: 80, y: 168, w: 160, h: 42, r: 8, color: SAND });
  const plateR = rect(riv, root, { name: 'PlateR', x: 133, y: 105, w: 42, h: 118, r: 8, color: SAND });
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: 168, fps: 60, loop: 'loop' });
  const hop = hopFrames(stops, 24, 20, 168);
  const me = [cap, head, body];
  shift(riv, an, me, hop.dxF, hop.dyF);
  for (const p of me) {
    keys(riv, an, p.id, SY, hop.squashF);
    keys(riv, an, p.id, OPACITY, hop.opF, 'linear');
  }
  keys(riv, an, shadow.id, X, hop.shXF);
  keys(riv, an, shadow.id, Y, hop.shYF);
  keys(riv, an, shadow.id, SX, hop.shSXF);
  keys(riv, an, shadow.id, OPACITY, hop.opF, 'linear');
  save('typhu', riv);
}

// ---- 2. cangua: QUÂN NGỰA nhảy từng ô dọc đường cá ngựa (168f = 2,8s).
// 1 đoạn bàn: hàng ngang 5 ô + cột dọc 2 ô; ô xuất phát đỏ, ô an toàn
// ngọc, ô đích vàng có sao đỏ; quân ngựa (đế + thân + đầu + mõm + tai +
// bờm + mắt) nhảy tiến từng ô rồi mờ dần về ô đầu, lặp lại. ----
{
  const { riv, ab, root } = newFile('cangua');
  const stops = [[25, 150], [60, 150], [95, 150], [130, 150], [165, 150], [165, 115], [165, 80]];
  const [cx0, cy0] = stops[0];
  // Quân ngựa nhìn sang phải (vẽ trước = trên cùng).
  const eye = ell(riv, root, { name: 'Eye', x: cx0 + 9, y: cy0 - 19, w: 2.5, color: INK });
  const muzzle = ell(riv, root, { name: 'Muzzle', x: cx0 + 14, y: cy0 - 14, w: 8, h: 6, color: CREAM, stroke: INK, strokeW: 1 });
  const ear = poly(riv, root, { name: 'Ear', cx: cx0 + 2, cy: cy0 - 26, points: [[cx0 + 2, cy0 - 30], [cx0 - 2, cy0 - 23], [cx0 + 6, cy0 - 23]], color: TEAL, stroke: INK, strokeW: 1 });
  const head = ell(riv, root, { name: 'Head', x: cx0 + 7, y: cy0 - 17, w: 15, h: 12, color: TEAL, stroke: INK, strokeW: 2 });
  const mane = poly(riv, root, { name: 'Mane', cx: cx0 - 1, cy: cy0 - 21, points: [[cx0 - 2, cy0 - 26], [cx0 + 3, cy0 - 18], [cx0 - 4, cy0 - 16]], color: INK });
  const body = rect(riv, root, { name: 'Body', x: cx0, y: cy0 - 4, w: 18, h: 20, r: 6, color: TEAL, stroke: INK, strokeW: 2 });
  const base = ell(riv, root, { name: 'Base', x: cx0, y: cy0 + 8, w: 28, h: 9, color: TEAL, stroke: INK, strokeW: 2 });
  const shadow = ell(riv, root, { name: 'Shadow', x: cx0, y: cy0 + 10, w: 26, h: 7, color: SHADOW });
  // Sao đỏ trên ô đích (165,80).
  const star = poly(riv, root, { name: 'Star', cx: 165, cy: 80, points: starPoints(165, 80, 9), color: RED });
  // 7 ô: xuất phát đỏ, an toàn ngọc, đích vàng, còn lại kem.
  const tileColors = [RED, CREAM, TEAL, CREAM, CREAM, CREAM, YELLOW];
  const tiles = stops.map(([x, y], i) =>
    rect(riv, root, { name: 'Tile' + i, x, y, w: 34, h: 34, color: tileColors[i], stroke: INK, strokeW: 2 }));
  const plateB = rect(riv, root, { name: 'PlateB', x: 95, y: 150, w: 180, h: 42, r: 8, color: SAND });
  const plateR = rect(riv, root, { name: 'PlateR', x: 165, y: 115, w: 42, h: 118, r: 8, color: SAND });
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: 168, fps: 60, loop: 'loop' });
  const hop = hopFrames(stops, 24, 18, 168, 10);
  const horse = [eye, muzzle, ear, head, mane, body, base];
  shift(riv, an, horse, hop.dxF, hop.dyF);
  for (const p of horse) {
    keys(riv, an, p.id, SY, hop.squashF);
    keys(riv, an, p.id, OPACITY, hop.opF, 'linear');
  }
  keys(riv, an, shadow.id, X, hop.shXF);
  keys(riv, an, shadow.id, Y, hop.shYF);
  keys(riv, an, shadow.id, SX, hop.shSXF);
  keys(riv, an, shadow.id, OPACITY, hop.opF, 'linear');
  save('cangua', riv);
}

// ---- 3. cotuong: MÃ NHẢY CHỮ L trên bàn cờ tướng (180f = 3s).
// Lưới cung 3×3 có đường chéo X + sông bên dưới; 3 quân: Mã đỏ (vòng
// trong VÀNG để nổi bật — quân di chuyển), Tướng đỏ, quân đen. Mã nhảy
// chữ L: (66,124) -> (100,124) -> (134,90), nghỉ, nhảy ngược về,
// lặp lại. ----
{
  const { riv, ab, root } = newFile('cotuong');
  // Mã đỏ (quân di chuyển) + Tướng đỏ + quân đen.
  const ma = disc(riv, root, 66, 124, RED, YELLOW, RED);
  const gen = disc(riv, root, 100, 56, RED, CREAM, RED);
  const blk = disc(riv, root, 134, 124, INK, CREAM, INK);
  const shadow = ell(riv, root, { name: 'Shadow', x: 66, y: 139, w: 30, h: 7, color: SHADOW });
  // 2 đường chéo X của cung + lưới cung + bàn.
  const d1 = poly(riv, root, { name: 'Diag1', cx: 100, cy: 90, points: rotRectPoints(100, 90, 144, 3, Math.PI / 4), color: INK });
  const d2 = poly(riv, root, { name: 'Diag2', cx: 100, cy: 90, points: rotRectPoints(100, 90, 144, 3, -Math.PI / 4), color: INK });
  const lh1 = rect(riv, root, { name: 'LH1', x: 100, y: 73, w: 102, h: 3, color: INK });
  const lh2 = rect(riv, root, { name: 'LH2', x: 100, y: 107, w: 102, h: 3, color: INK });
  const lv1 = rect(riv, root, { name: 'LV1', x: 83, y: 90, w: 3, h: 102, color: INK });
  const lv2 = rect(riv, root, { name: 'LV2', x: 117, y: 90, w: 3, h: 102, color: INK });
  const board = rect(riv, root, { name: 'Board', x: 100, y: 90, w: 102, h: 102, color: CREAM, stroke: INK, strokeW: 3 });
  // Sông + gợn sóng.
  const rip1 = ell(riv, root, { name: 'Rip1', x: 60, y: 157, w: 16, h: 5, color: CREAM });
  const rip2 = ell(riv, root, { name: 'Rip2', x: 100, y: 157, w: 16, h: 5, color: CREAM });
  const rip3 = ell(riv, root, { name: 'Rip3', x: 140, y: 157, w: 16, h: 5, color: CREAM });
  const river = rect(riv, root, { name: 'River', x: 100, y: 157, w: 170, h: 14, r: 7, color: TEAL });
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: 180, fps: 60, loop: 'loop' });
  // Mã: nhảy ngang (0-30), nghỉ (30-40), nhảy chéo lên (40-70), nghỉ
  // ở đích + nhún nhẹ (70-100), nhảy chéo về (100-130), nghỉ (130-140),
  // nhảy ngang về (140-170), nghỉ (170-180).
  const maX = [[0, 0], [15, 17], [30, 34], [40, 34], [55, 51], [70, 68], [80, 68], [100, 68], [115, 51], [130, 34], [140, 34], [155, 17], [170, 0], [180, 0]];
  const maY = [[0, 0], [15, -12], [30, 0], [40, 0], [55, -32], [70, -34], [80, -36], [90, -34], [100, -34], [115, -32], [130, 0], [140, 0], [155, -12], [170, 0], [180, 0]];
  shift(riv, an, ma, maX, maY);
  const squash = [[0, 1], [28, 1], [30, 0.8], [33, 1], [68, 1], [70, 0.8], [73, 1], [128, 1], [130, 0.8], [133, 1], [168, 1], [170, 0.8], [173, 1], [180, 1]];
  for (const p of ma) keys(riv, an, p.id, SY, squash);
  // Bóng chạy theo Mã (X) và ở đúng ô đang đứng (Y), nhỏ lại khi nhảy.
  keys(riv, an, shadow.id, X, maX.map(([f, v]) => [f, 66 + v]));
  keys(riv, an, shadow.id, Y, [[0, 139], [30, 139], [40, 139], [70, 105], [80, 105], [100, 105], [130, 139], [140, 139], [170, 139], [180, 139]]);
  keys(riv, an, shadow.id, SX, [[0, 1], [15, 0.7], [30, 1], [55, 0.7], [70, 1], [115, 0.7], [130, 1], [155, 0.7], [170, 1]]);
  // Tướng đỏ nhún nhẹ tại chỗ.
  for (const p of gen) keys(riv, an, p.id, Y, [[0, 56], [45, 57], [90, 56], [135, 57], [180, 56]]);
  save('cotuong', riv);
}

// ---- 4. camel: 2 LẠC ĐÀ BƯỚC TIẾN theo lượt về phía cờ đích (180f = 3s).
// 1 đường đua đơn + cờ caro ở cuối; lạc đà vàng (sau) và lạc đà tím
// (trước) xếp thành 1 hàng, xen kẽ nhau bước 3 bước (mỗi bước tiến 10),
// mỗi bước chân sải 1 nhịp, rồi mờ dần về vạch xuất phát. ----
{
  const { riv, ab, root } = newFile('camel');
  // Thêm trước = vẽ trên cùng: lạc đà vàng (sau) -> lạc đà tím (trước)
  // -> bóng -> cờ -> đường đua.
  const yellow = makeCamel(riv, root, { cx: 42, cy: 114, s: 0.7, color: YELLOW, tag: 'Y' });
  const violet = makeCamel(riv, root, { cx: 112, cy: 114, s: 0.7, color: VIOLET, tag: 'V' });
  const shY = ell(riv, root, { name: 'ShY', x: 42, y: 148, w: 50, h: 7, color: SHADOW });
  const shV = ell(riv, root, { name: 'ShV', x: 112, y: 148, w: 50, h: 7, color: SHADOW });
  const flag = makeFlag(riv, root, null, { x: 182, yTop: 74, poleH: 76, cell: 8 });
  const track = rect(riv, root, { name: 'Track', x: 100, y: 112, w: 180, h: 76, r: 8, color: CREAM, stroke: INK, strokeW: 3 });
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: 180, fps: 60, loop: 'loop' });
  // Cờ phất (animation được gắn sau khi tạo — makeFlag(null) bỏ qua keys).
  const wave = [[0, 0], [45, 0.12], [90, 0], [135, -0.12], [180, 0]];
  for (const cell of flag.cells) keys(riv, an, cell.id, ROT, wave);
  const opF = [[0, 1], [168, 1], [171, 0], [177, 0], [180, 1]];
  // Vàng bước ở [0,28],[56,84],[112,140]; tím bước ở [28,56],[84,112],
  // [140,168] — xen kẽ theo lượt; mỗi bước tiến 10.
  const ySteps = [[0, 28], [56, 84], [112, 140]];
  const vSteps = [[28, 56], [84, 112], [140, 168]];
  const yDX = [[0, 0], [28, 10], [56, 10], [84, 20], [112, 20], [140, 30], [168, 30], [174, 30], [177, 0], [180, 0]];
  const yDY = [[0, 0], [14, -3], [28, 0], [70, -3], [84, 0], [126, -3], [140, 0], [168, 0]];
  const vDX = [[0, 0], [28, 0], [56, 10], [84, 10], [112, 20], [140, 20], [168, 30], [174, 30], [177, 0], [180, 0]];
  const vDY = [[0, 0], [42, -3], [56, 0], [98, -3], [112, 0], [154, -3], [168, 0]];
  shift(riv, an, yellow.all, yDX, yDY);
  shift(riv, an, violet.all, vDX, vDY);
  keys(riv, an, shY.id, X, yDX.map(([f, v]) => [f, 42 + v]));
  keys(riv, an, shV.id, X, vDX.map(([f, v]) => [f, 112 + v]));
  keys(riv, an, shY.id, OPACITY, opF, 'linear');
  keys(riv, an, shV.id, OPACITY, opF, 'linear');
  for (const p of [...yellow.all, ...violet.all]) keys(riv, an, p.id, OPACITY, opF, 'linear');
  // Chân sải 1 nhịp mỗi bước, 2 cặp xen kẽ; vàng và tím ngược pha nhau.
  const yA = strideKeys(ySteps, 0.3, 0), yB = strideKeys(ySteps, 0.3, Math.PI);
  const vA = strideKeys(vSteps, 0.3, Math.PI), vB = strideKeys(vSteps, 0.3, 0);
  keys(riv, an, yellow.legs.FL.id, ROT, yA);
  keys(riv, an, yellow.legs.BR.id, ROT, yA);
  keys(riv, an, yellow.legs.FR.id, ROT, yB);
  keys(riv, an, yellow.legs.BL.id, ROT, yB);
  keys(riv, an, violet.legs.FL.id, ROT, vA);
  keys(riv, an, violet.legs.BR.id, ROT, vA);
  keys(riv, an, violet.legs.FR.id, ROT, vB);
  keys(riv, an, violet.legs.BL.id, ROT, vB);
  save('camel', riv);
}
console.log('done');
