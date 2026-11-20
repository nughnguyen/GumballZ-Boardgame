// Build 12 file .riv — KHỔ RỘNG v5 (2026-11-21).
// QUY TẮC THIẾT KẾ (anh Hưng đặt 2026-11-21 ~01:47): MỖI FILE .riv CHỈ LẤY
// PHẦN CHƠI THẬT của game đó — một lát cắt nhỏ cho người xem biết lúc chơi
// game như thế nào. KHÔNG làm "cảnh mini" trang trí.
// KHỔ RỘNG (anh Hưng yêu cầu 2026-11-21 ~02:06): animation choán HẾT phần
// hình chữ nhật đầu thẻ game (full tile width × 104px). Artboard 400×200
// (tỉ lệ 2:1 — giữa khoảng tỉ lệ thật của header: ~1,5:1 điện thoại nhỏ
// đến ~2,1:1 desktop), mount dùng Fit.Cover nên header luôn lấp đầy, không
// còn ô vuông 104×104 + đĩa trắng. Vùng an toàn: nội dung chính nằm giữa
// 60% chiều rộng (x 80..320) và giữa 80% chiều cao (y 20..180) — 2 mép
// ngoài chỉ là nền/bàn/đường kéo dài (Cover cắt mép trên màn hẹp).
// Mỗi file: 1 artboard 400×200 + 1 animation "loop" duy nhất — mount chỉ
// cần autoplay: true, KHÔNG chọn animation theo tên (xem README.md).
// Chạy (ESM không dùng NODE_PATH, Node resolve symlink về đường dẫn thật):
//   cp shared/rive/src/build.mjs /tmp/rive-gen/build.mjs
//   cd /tmp/rive-gen && npm install @stevysmith/rive-generator   (lần đầu)
//   node build.mjs
//
// KIẾN TRÚC ĐÃ KIỂM CHỨNG (v2 — giữ nguyên cho v5):
// 1) CHỈ 1 Node "Root" ở (0,0) làm con duy nhất của artboard; mọi shape nằm
//    trong Root, tọa độ TUYỆT ĐỐI.
// 2) KeyedObject.objectId là LOCAL index -> keys() truyền target-1.
// 3) Mỗi shape chỉ 1 path (mỗi chấm = 1 shape riêng).
// 4) Thứ tự vẽ: thêm trước = vẽ TRÊN cùng — add chi tiết mặt -> thân -> nền.
//    (Nền full-bleed phải add CUỐI CÙNG.)
// 5) Opacity Shape/Node = key 18 (PropertyKey.opacity của thư viện = 46 là
//    opacity gradient, không dùng).
// 6) addSolidColor(fillHoặcStroke, sốMàu) — KHÔNG phải options { color }.
// 7) File không có animation sẽ không vẽ gì — mọi file đều có "loop".
// 8) Rect/Ellipse của thư viện vẽ CANH GIỮA tại (x,y) (x,y = tâm) — đã
//    kiểm chứng qua v4 (cột cờ camel, ô cờ typhu).
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
const WHITE = hex('#FFFFFF');
const FELT = hex('#1E7A5C'); // bàn nỉ xanh đậm (game bài)
const FELT_D = hex('#176348');
const NIGHT = hex('#3B3B73'); // trời đêm chạng vạng (Ma Sói)
const BLUE = hex('#2B6CB0'); // lưng bài xanh / chip xanh
const GOLD = hex('#E8A93D');
const COIN_D = hex('#C78A12');
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

// ---- Helper mới cho khổ rộng (v5) ----

// Nền full-bleed: PHẢI add CUỐI CÙNG trong mỗi cảnh (thêm sau = vẽ sau =
// ở dưới cùng). color = màu nền chính của cảnh.
function bg(riv, root, color) {
  return rect(riv, root, { name: 'BG', x: 200, y: 100, w: 400, h: 200, color });
}

// Chất bài (shape-only, thư viện không có text): trả về các part.
// suit: 'heart' | 'spade' | 'diamond' | 'club' | 'crown' (lá Tây).
// s = cỡ bao của chất. crown = vương miện (dùng cho K/Q/J).
function suitPip(riv, root, cx, cy, s, suit, color) {
  const parts = [];
  if (suit === 'heart') {
    parts.push(ell(riv, root, { name: 'H1', x: cx - s * 0.28, y: cy - s * 0.18, w: s * 0.55, color }));
    parts.push(ell(riv, root, { name: 'H2', x: cx + s * 0.28, y: cy - s * 0.18, w: s * 0.55, color }));
    parts.push(poly(riv, root, { name: 'H3', cx, cy: cy + s * 0.1, points: [[cx - s * 0.55, cy - s * 0.1], [cx + s * 0.55, cy - s * 0.1], [cx, cy + s * 0.55]], color }));
  } else if (suit === 'spade') {
    parts.push(ell(riv, root, { name: 'S1', x: cx - s * 0.28, y: cy + s * 0.1, w: s * 0.55, color }));
    parts.push(ell(riv, root, { name: 'S2', x: cx + s * 0.28, y: cy + s * 0.1, w: s * 0.55, color }));
    parts.push(poly(riv, root, { name: 'S3', cx, cy: cy - s * 0.05, points: [[cx - s * 0.55, cy + s * 0.05], [cx + s * 0.55, cy + s * 0.05], [cx, cy - s * 0.55]], color }));
    parts.push(rect(riv, root, { name: 'S4', x: cx, y: cy + s * 0.42, w: s * 0.22, h: s * 0.3, color }));
  } else if (suit === 'diamond') {
    parts.push(poly(riv, root, { name: 'D1', cx, cy, points: [[cx, cy - s * 0.55], [cx + s * 0.4, cy], [cx, cy + s * 0.55], [cx - s * 0.4, cy]], color }));
  } else if (suit === 'club') {
    parts.push(ell(riv, root, { name: 'C1', x: cx, y: cy - s * 0.3, w: s * 0.55, color }));
    parts.push(ell(riv, root, { name: 'C2', x: cx - s * 0.3, y: cy + s * 0.18, w: s * 0.55, color }));
    parts.push(ell(riv, root, { name: 'C3', x: cx + s * 0.3, y: cy + s * 0.18, w: s * 0.55, color }));
    parts.push(rect(riv, root, { name: 'C4', x: cx, y: cy + s * 0.42, w: s * 0.22, h: s * 0.3, color }));
  } else if (suit === 'crown') {
    parts.push(poly(riv, root, { name: 'K1', cx, cy, points: [[cx - s * 0.5, cy + s * 0.35], [cx - s * 0.5, cy - s * 0.2], [cx - s * 0.25, cy + s * 0.05], [cx, cy - s * 0.4], [cx + s * 0.25, cy + s * 0.05], [cx + s * 0.5, cy - s * 0.2], [cx + s * 0.5, cy + s * 0.35]], color }));
  }
  return parts;
}

// Lá bài tây: trả về {back:[...], face:[...]}.
// o = {back (màu lưng), suit, suitColor, pips (số chấm hạng nhỏ dưới chất
// lớn — 0 = không chấm; lá Át dùng suit lớn, lá Tây dùng suit 'crown')}.
// Mỗi part có origin riêng; lật bài = squash SX từng part quanh origin
// của nó (nền lá squash quanh tâm lá — đúng hiệu ứng lật).
function card(riv, root, cx, cy, w, h, o) {
  const back = [], face = [];
  // Thứ tự vẽ: thêm trước = vẽ TRÊN — chi tiết phải add TRƯỚC nền
  // (nền đục mà add trước sẽ che hết chất/chấm).
  back.push(ell(riv, root, { name: 'CDot', x: cx, y: cy, w: 12, color: o.back || RED }));
  back.push(rect(riv, root, { name: 'CIn', x: cx, y: cy, w: w - 12, h: h - 12, r: 4, color: CREAM }));
  back.push(rect(riv, root, { name: 'CBg', x: cx, y: cy, w, h, r: 6, color: o.back || RED, stroke: INK, strokeW: 2 }));
  const sc = o.suitColor || INK;
  face.push(...suitPip(riv, root, cx, cy, 22, o.suit, sc));
  face.push(ell(riv, root, { name: 'CC1', x: cx - w / 2 + 8, y: cy - h / 2 + 8, w: 6, color: sc }));
  face.push(ell(riv, root, { name: 'CC2', x: cx + w / 2 - 8, y: cy + h / 2 - 8, w: 6, color: sc }));
  if (o.pips) {
    const n = o.pips;
    for (let i = 0; i < n; i++) {
      const px = cx + (i - (n - 1) / 2) * 7;
      face.push(ell(riv, root, { name: 'CP' + i, x: px, y: cy + 17, w: 4, color: sc }));
    }
  }
  face.push(rect(riv, root, { name: 'CFg', x: cx, y: cy, w, h, r: 6, color: CREAM, stroke: INK, strokeW: 2 }));
  return { back, face, all: [...back, ...face] };
}

// Lá UNO: nền màu + oval trắng + chấm màu lớn ở giữa (số) + 2 góc trắng.
// Thứ tự vẽ: thêm trước = vẽ TRÊN — chấm/oval/góc add TRƯỚC nền.
function unoCard(riv, root, cx, cy, w, h, color) {
  const parts = [];
  parts.push(ell(riv, root, { name: 'UDot', x: cx, y: cy, w: w * 0.3, color }));
  parts.push(ell(riv, root, { name: 'UOval', x: cx, y: cy, w: w * 0.62, h: h * 0.52, color: CREAM }));
  parts.push(rect(riv, root, { name: 'UC1', x: cx - w / 2 + 7, y: cy - h / 2 + 7, w: 7, h: 7, r: 2, color: CREAM }));
  parts.push(rect(riv, root, { name: 'UC2', x: cx + w / 2 - 7, y: cy + h / 2 - 7, w: 7, h: 7, r: 2, color: CREAM }));
  parts.push(rect(riv, root, { name: 'UBg', x: cx, y: cy, w, h, r: 8, color, stroke: INK, strokeW: 2 }));
  return parts;
}

// Lật lá bài: mặt sau squash 1->0 (t0..t1), mặt trước squash 0->1 (t1..t2).
function flipCard(riv, anim, c, t0, t1, t2, D) {
  for (const p of c.back) keys(riv, anim, p.id, SX, [[t0, 1], [t1, 0], [D, 0]]);
  for (const p of c.face) keys(riv, anim, p.id, SX, [[t0, 0], [t1, 0], [t2, 1], [D, 1]]);
}

// Lá ngửa sẵn: lưng tàng hình từ đầu (chỉ hiện mặt trước) — dùng cho các
// lá đã đánh ra bàn (Tiến Lên, Cát Tê: bài đánh ra là bài ngửa).
function faceUp(riv, anim, c, D) {
  for (const p of c.back) keys(riv, anim, p.id, SX, [[0, 0], [D, 0]]);
}

// Mờ vào đầu vòng + mờ ra cuối vòng (che cú nhảy reset của vòng lặp).
// parts: mọi part cần mờ. D = tổng frame.
function fadeEnds(riv, anim, parts, D) {
  for (const p of parts) keys(riv, anim, p.id, OPACITY, [[0, 0], [6, 1], [D - 12, 1], [D, 0]], 'linear');
}

// Xu vàng (vòng trong đậm hơn) + chồng 2 xu.
// Thứ tự vẽ: thêm trước = vẽ TRÊN — chấm trong add TRƯỚC vòng ngoài.
function coin(riv, root, cx, cy, r) {
  const c2 = ell(riv, root, { name: 'Coin2', x: cx, y: cy, w: r, color: GOLD });
  const c1 = ell(riv, root, { name: 'Coin1', x: cx, y: cy, w: r * 2, color: YELLOW, stroke: COIN_D, strokeW: 2 });
  return [c2, c1];
}
// Chip poker: đĩa màu + viền trắng + chấm giữa (chấm add trước = trên cùng).
function chip(riv, root, cx, cy, r, color) {
  const c3 = ell(riv, root, { name: 'Chip3', x: cx, y: cy, w: r * 0.45, color });
  const c2 = ell(riv, root, { name: 'Chip2', x: cx, y: cy, w: r, color: WHITE });
  const c1 = ell(riv, root, { name: 'Chip1', x: cx, y: cy, w: r * 2, color, stroke: WHITE, strokeW: 2 });
  return [c3, c2, c1];
}

function save(name, riv) {
  const bytes = riv.export();
  writeFileSync(OUT + name + '.riv', bytes);
  console.log(name + '.riv', bytes.length, 'bytes');
}
function newFile(name) {
  const riv = new RiveFile();
  const ab = riv.addArtboard({ name, width: 400, height: 200 });
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
  const head = ell(riv, root, { name: tag + 'Head', x: cx + 52 * s, y: cy - 38 * s, w: 26 * s, h: 18 * s, color, stroke: INK, strokeW: 2 });
  const neck = poly(riv, root, { name: tag + 'Neck', cx: cx + 38 * s, cy: cy - 20 * s, points: rotRectPoints(cx + 38 * s, cy - 20 * s, 14 * s, 36 * s, -0.5), color, stroke: INK, strokeW: 2 });
  const hump1 = ell(riv, root, { name: tag + 'Hump1', x: cx - 18 * s, y: cy - 28 * s, w: 30 * s, color });
  const hump2 = ell(riv, root, { name: tag + 'Hump2', x: cx + 18 * s, y: cy - 28 * s, w: 30 * s, color });
  const tail = rect(riv, root, { name: tag + 'Tail', x: cx - 42 * s, y: cy - 8 * s, w: 4 * s, h: 18 * s, color: INK });
  const legFL = rect(riv, root, { name: tag + 'LegFL', x: cx - 28 * s, y: cy + 4 * s, w: 8 * s, h: 34 * s, py: 17 * s, color: INK });
  const legFR = rect(riv, root, { name: tag + 'LegFR', x: cx + 28 * s, y: cy + 4 * s, w: 8 * s, h: 34 * s, py: 17 * s, color: INK });
  const legBL = rect(riv, root, { name: tag + 'LegBL', x: cx - 14 * s, y: cy + 4 * s, w: 8 * s, h: 34 * s, py: 17 * s, color: INK });
  const legBR = rect(riv, root, { name: tag + 'LegBR', x: cx + 14 * s, y: cy + 4 * s, w: 8 * s, h: 34 * s, py: 17 * s, color: INK });
  const body = ell(riv, root, { name: tag + 'Body', x: cx, y: cy, w: 90 * s, h: 44 * s, color, stroke: INK, strokeW: 3 });
  const all = [eye, ear, head, neck, hump1, hump2, tail, legFL, legFR, legBL, legBR, body];
  return { all, legs: { FL: legFL, FR: legFR, BL: legBL, BR: legBR } };
}

// ---- 1. typhu RỘNG: NHÂN VẬT nhảy từng ô quanh 1 GÓC bàn (240f = 4s).
// Góc bàn kéo dài full chiều rộng: hàng ngang 9 ô + cột dọc 3 ô, ô xuất
// phát đỏ, ô góc vàng, 2 nhà nhỏ trên 2 ô; nhân vật (mũ đỏ + đầu kem +
// thân ngọc) nhảy hết 12 ô rồi mờ dần về ô đầu, lặp lại. ----
{
  const { riv, ab, root } = newFile('typhu');
  const stops = [[20, 140], [54, 140], [88, 140], [122, 140], [156, 140], [190, 140], [224, 140], [258, 140], [292, 140], [292, 106], [292, 72], [292, 38]];
  const [cx0, cy0] = stops[0];
  // Nhân vật (vẽ trước = trên cùng): mũ, đầu, thân.
  const cap = poly(riv, root, { name: 'Cap', cx: cx0, cy: cy0 - 32, points: [[cx0, cy0 - 36], [cx0 - 7, cy0 - 29], [cx0 + 7, cy0 - 29]], color: RED, stroke: INK, strokeW: 1 });
  const head = ell(riv, root, { name: 'Head', x: cx0, y: cy0 - 24, w: 15, color: CREAM, stroke: INK, strokeW: 2 });
  const body = rect(riv, root, { name: 'Body', x: cx0, y: cy0 - 9, w: 18, h: 18, r: 7, color: TEAL, stroke: INK, strokeW: 2 });
  const shadow = ell(riv, root, { name: 'Shadow', x: cx0, y: cy0 + 8, w: 24, h: 7, color: SHADOW });
  // 2 nhà nhỏ ở mép trái 2 ô (nhân vật đứng giữa ô nên không che hết).
  const h1Roof = poly(riv, root, { name: 'H1Roof', cx: 76, cy: 130, points: [[76, 126], [68, 134], [84, 134]], color: RED });
  const h1 = rect(riv, root, { name: 'H1', x: 76, y: 138, w: 14, h: 9, color: TEAL, stroke: INK, strokeW: 2 });
  const h2Roof = poly(riv, root, { name: 'H2Roof', cx: 178, cy: 130, points: [[178, 126], [170, 134], [186, 134]], color: TEAL });
  const h2 = rect(riv, root, { name: 'H2', x: 178, y: 138, w: 14, h: 9, color: YELLOW, stroke: INK, strokeW: 2 });
  // 12 ô (34px): xuất phát đỏ, góc vàng, còn lại kem; vạch màu trên 2 ô có nhà.
  const strip1 = rect(riv, root, { name: 'Strip1', x: 88, y: 130, w: 34, h: 7, color: TEAL });
  const strip2 = rect(riv, root, { name: 'Strip2', x: 190, y: 130, w: 34, h: 7, color: RED });
  const tileColors = [RED, CREAM, CREAM, CREAM, CREAM, CREAM, CREAM, CREAM, YELLOW, CREAM, CREAM, CREAM];
  const tiles = stops.map(([x, y], i) =>
    rect(riv, root, { name: 'Tile' + i, x, y, w: 34, h: 34, color: tileColors[i], stroke: INK, strokeW: 2 }));
  // Đế bàn cát dưới đường ô (vẽ sau ô = ở dưới).
  const plateB = rect(riv, root, { name: 'PlateB', x: 156, y: 140, w: 310, h: 44, r: 8, color: SAND });
  const plateR = rect(riv, root, { name: 'PlateR', x: 292, y: 72, w: 44, h: 124, r: 8, color: SAND });
  bg(riv, root, CREAM);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: 240, fps: 60, loop: 'loop' });
  const hop = hopFrames(stops, 20, 16, 240);
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

// ---- 2. cotuong RỘNG: MÃ NHẢY CHỮ L trên bàn cờ tướng (180f = 3s).
// Bàn dài full chiều rộng: lưới 9 cột × 5 hàng + sông ngọc ngang giữa +
// cung 2 bên có chéo X; 4 quân: Mã đỏ (vòng trong VÀNG — quân di chuyển)
// nhảy chữ L (120,90) -> (160,90) -> (200,60) rồi nhảy về, Tướng đỏ
// nhún nhẹ, Mã đen + Tướng đen đứng yên. ----
{
  const { riv, ab, root } = newFile('cotuong');
  // Mã đỏ (quân di chuyển) + Tướng đỏ + Mã đen + Tướng đen.
  const ma = disc(riv, root, 120, 90, RED, YELLOW, RED);
  const gen = disc(riv, root, 160, 30, RED, CREAM, RED);
  const blkMa = disc(riv, root, 280, 90, INK, CREAM, INK);
  const blkGen = disc(riv, root, 200, 150, INK, CREAM, INK);
  const shadow = ell(riv, root, { name: 'Shadow', x: 120, y: 105, w: 30, h: 7, color: SHADOW });
  // Cung trên + cung dưới: 2 đường chéo X mỗi cung.
  const d1 = poly(riv, root, { name: 'Diag1', cx: 200, cy: 60, points: rotRectPoints(200, 60, 100, 3, 0.6435), color: INK });
  const d2 = poly(riv, root, { name: 'Diag2', cx: 200, cy: 60, points: rotRectPoints(200, 60, 100, 3, -0.6435), color: INK });
  const d3 = poly(riv, root, { name: 'Diag3', cx: 200, cy: 145, points: rotRectPoints(200, 145, 100, 3, 0.6435), color: INK });
  const d4 = poly(riv, root, { name: 'Diag4', cx: 200, cy: 145, points: rotRectPoints(200, 145, 100, 3, -0.6435), color: INK });
  // Lưới: 9 đường dọc (xuyên sông) + 4 đường ngang (2 trên, 2 dưới sông).
  const vlines = [40, 80, 120, 160, 200, 240, 280, 320, 360].map((x, i) =>
    rect(riv, root, { name: 'VL' + i, x, y: 100, w: 3, h: 140, color: INK }));
  const hlines = [[60], [90], [120], [150]].map(([y], i) =>
    rect(riv, root, { name: 'HL' + i, x: 200, y, w: 320, h: 3, color: INK }));
  // Sông + gợn sóng (vẽ sau lưới = đè lên đường dọc, như sông thật).
  const rip1 = ell(riv, root, { name: 'Rip1', x: 100, y: 105, w: 16, h: 5, color: CREAM });
  const rip2 = ell(riv, root, { name: 'Rip2', x: 200, y: 105, w: 16, h: 5, color: CREAM });
  const rip3 = ell(riv, root, { name: 'Rip3', x: 300, y: 105, w: 16, h: 5, color: CREAM });
  const river = rect(riv, root, { name: 'River', x: 200, y: 105, w: 320, h: 22, color: TEAL });
  const board = rect(riv, root, { name: 'Board', x: 200, y: 100, w: 320, h: 140, color: CREAM, stroke: INK, strokeW: 3 });
  bg(riv, root, SAND);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: 180, fps: 60, loop: 'loop' });
  // Mã: nhảy ngang (0-30), nghỉ (30-40), nhảy chéo lên (40-70), nghỉ
  // ở đích + nhún nhẹ (70-100), nhảy chéo về (100-130), nghỉ (130-140),
  // nhảy ngang về (140-170), nghỉ (170-180).
  const maX = [[0, 0], [15, 20], [30, 40], [40, 40], [55, 60], [70, 80], [80, 80], [100, 80], [115, 60], [130, 40], [140, 40], [155, 20], [170, 0], [180, 0]];
  const maY = [[0, 0], [15, -12], [30, 0], [40, 0], [55, -21], [70, -30], [80, -32], [90, -30], [100, -30], [115, -21], [130, 0], [140, 0], [155, -12], [170, 0], [180, 0]];
  shift(riv, an, ma, maX, maY);
  const squash = [[0, 1], [28, 1], [30, 0.8], [33, 1], [68, 1], [70, 0.8], [73, 1], [128, 1], [130, 0.8], [133, 1], [168, 1], [170, 0.8], [173, 1], [180, 1]];
  for (const p of ma) keys(riv, an, p.id, SY, squash);
  // Bóng chạy theo Mã (X) và ở đúng ô đang đứng (Y), nhỏ lại khi nhảy.
  keys(riv, an, shadow.id, X, maX.map(([f, v]) => [f, 120 + v]));
  keys(riv, an, shadow.id, Y, [[0, 105], [30, 105], [40, 105], [70, 75], [80, 75], [100, 75], [130, 105], [140, 105], [170, 105], [180, 105]]);
  keys(riv, an, shadow.id, SX, [[0, 1], [15, 0.7], [30, 1], [55, 0.7], [70, 1], [115, 0.7], [130, 1], [155, 0.7], [170, 1]]);
  // Tướng đỏ nhún nhẹ tại chỗ.
  for (const p of gen) keys(riv, an, p.id, Y, [[0, 30], [45, 31], [90, 30], [135, 31], [180, 30]]);
  save('cotuong', riv);
}

// ---- 3. cangua RỘNG: QUÂN NGỰA nhảy từng ô dọc đường cá ngựa (240f = 4s).
// Đường ô kéo dài full chiều rộng: hàng ngang 10 ô + cột dọc 2 ô; ô xuất
// phát đỏ, 2 ô an toàn ngọc, ô đích vàng có sao đỏ; quân ngựa (đế + thân
// + đầu + mõm + tai + bờm + mắt) nhảy tiến từng ô rồi mờ dần về ô đầu. ----
{
  const { riv, ab, root } = newFile('cangua');
  const stops = [[20, 140], [54, 140], [88, 140], [122, 140], [156, 140], [190, 140], [224, 140], [258, 140], [292, 140], [326, 140], [326, 106], [326, 72]];
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
  // Sao đỏ trên ô đích (326,72).
  const star = poly(riv, root, { name: 'Star', cx: 326, cy: 72, points: starPoints(326, 72, 9), color: RED });
  // 12 ô (34px): xuất phát đỏ, an toàn ngọc, đích vàng, còn lại kem.
  const tileColors = [RED, CREAM, CREAM, TEAL, CREAM, CREAM, TEAL, CREAM, CREAM, CREAM, CREAM, YELLOW];
  const tiles = stops.map(([x, y], i) =>
    rect(riv, root, { name: 'Tile' + i, x, y, w: 34, h: 34, color: tileColors[i], stroke: INK, strokeW: 2 }));
  const plateB = rect(riv, root, { name: 'PlateB', x: 173, y: 140, w: 330, h: 44, r: 8, color: SAND });
  const plateR = rect(riv, root, { name: 'PlateR', x: 326, y: 89, w: 44, h: 112, r: 8, color: SAND });
  bg(riv, root, CREAM);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: 240, fps: 60, loop: 'loop' });
  const hop = hopFrames(stops, 20, 16, 240, 10);
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

// ---- 4. camel RỘNG: 2 LẠC ĐÀ BƯỚC TIẾN theo lượt về phía cờ đích (240f = 4s).
// Đường đua đơn full chiều rộng + vạch xuất phát caro bên trái + cờ caro
// ở cuối bên phải; lạc đà vàng (sau) và lạc đà tím (trước) xếp thành 1
// hàng, xen kẽ nhau bước 4 bước (mỗi bước tiến 10), mỗi bước chân sải 1
// nhịp, rồi mờ dần về vạch xuất phát. ----
{
  const { riv, ab, root } = newFile('camel');
  // Thêm trước = vẽ trên cùng: lạc đà vàng (sau) -> lạc đà tím (trước)
  // -> bóng -> cọc xuất phát + cờ -> đường đua -> cồn cát -> nền.
  const yellow = makeCamel(riv, root, { cx: 55, cy: 132, s: 0.85, color: YELLOW, tag: 'Y' });
  const violet = makeCamel(riv, root, { cx: 165, cy: 132, s: 0.85, color: VIOLET, tag: 'V' });
  const shY = ell(riv, root, { name: 'ShY', x: 55, y: 168, w: 50, h: 7, color: SHADOW });
  const shV = ell(riv, root, { name: 'ShV', x: 165, y: 168, w: 50, h: 7, color: SHADOW });
  // Cọc xuất phát caro (bên trái) + cờ đích caro (bên phải).
  const sp1 = rect(riv, root, { name: 'SP1', x: 30, y: 112, w: 10, h: 10, color: INK });
  const sp2 = rect(riv, root, { name: 'SP2', x: 30, y: 132, w: 10, h: 10, color: CREAM, stroke: INK, strokeW: 1 });
  const sp3 = rect(riv, root, { name: 'SP3', x: 30, y: 152, w: 10, h: 10, color: INK });
  const flag = makeFlag(riv, root, null, { x: 378, yTop: 64, poleH: 106, cell: 8 });
  const track = rect(riv, root, { name: 'Track', x: 200, y: 132, w: 370, h: 76, r: 8, color: CREAM, stroke: INK, strokeW: 3 });
  const duneL = ell(riv, root, { name: 'DuneL', x: 25, y: 182, w: 60, h: 14, color: SAND2 });
  const duneR = ell(riv, root, { name: 'DuneR', x: 375, y: 182, w: 60, h: 14, color: SAND2 });
  bg(riv, root, SAND);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: 240, fps: 60, loop: 'loop' });
  // Cờ phất (animation được gắn sau khi tạo — makeFlag(null) bỏ qua keys).
  const wave = [[0, 0], [60, 0.12], [120, 0], [180, -0.12], [240, 0]];
  for (const cell of flag.cells) keys(riv, an, cell.id, ROT, wave);
  const opF = [[0, 1], [222, 1], [225, 0], [237, 0], [240, 1]];
  // Vàng bước ở [0,30],[60,90],[120,150],[180,210]; tím bước ở
  // [30,60],[90,120],[150,180],[210,240] — xen kẽ theo lượt; mỗi bước +10.
  const ySteps = [[0, 30], [60, 90], [120, 150], [180, 210]];
  const vSteps = [[30, 60], [90, 120], [150, 180], [210, 240]];
  const yDX = [[0, 0], [30, 10], [60, 10], [90, 20], [120, 20], [150, 30], [180, 30], [210, 40], [228, 40], [234, 0], [240, 0]];
  const yDY = [[0, 0], [15, -3], [30, 0], [75, -3], [90, 0], [135, -3], [150, 0], [195, -3], [210, 0], [240, 0]];
  const vDX = [[0, 0], [30, 0], [60, 10], [90, 10], [120, 20], [150, 20], [180, 30], [210, 30], [228, 30], [234, 0], [240, 0]];
  const vDY = [[0, 0], [45, -3], [60, 0], [105, -3], [120, 0], [165, -3], [180, 0], [225, -3], [240, 0]];
  shift(riv, an, yellow.all, yDX, yDY);
  shift(riv, an, violet.all, vDX, vDY);
  keys(riv, an, shY.id, X, yDX.map(([f, v]) => [f, 55 + v]));
  keys(riv, an, shV.id, X, vDX.map(([f, v]) => [f, 165 + v]));
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

// ---- 5. uno: ĐÁNH BÀI XUỐNG CHỒNG BÀI (180f = 3s).
// 4 lá UNO từ tay (dưới) bay lần lượt lên chồng bài giữa bàn, mỗi lá một
// màu (đỏ -> vàng -> xanh lá -> lá Đen 4 màu); lá cuối cùng nằm trên cùng.
// Tay: 4 lá; chồng: 2 lá tĩnh bên dưới. ----
{
  const { riv, ab, root } = newFile('uno');
  const D = 180;
  // Lá Đen 4 màu (wild) — tạo TRƯỚC để nằm trên cùng của chồng bài.
  // Thứ tự vẽ: thêm trước = vẽ TRÊN — 4 ô màu add TRƯỚC nền đen.
  const wildParts = [];
  wildParts.push(rect(riv, root, { name: 'WQ1', x: 273, y: 158, w: 12, h: 12, color: RED }));
  wildParts.push(rect(riv, root, { name: 'WQ2', x: 287, y: 158, w: 12, h: 12, color: YELLOW }));
  wildParts.push(rect(riv, root, { name: 'WQ3', x: 273, y: 172, w: 12, h: 12, color: TEAL }));
  wildParts.push(rect(riv, root, { name: 'WQ4', x: 287, y: 172, w: 12, h: 12, color: BLUE }));
  wildParts.push(rect(riv, root, { name: 'WBg', x: 280, y: 165, w: 48, h: 66, r: 8, color: INK, stroke: INK, strokeW: 2 }));
  const c4 = { back: [], face: wildParts, all: wildParts };
  const c3 = unoCard(riv, root, 225, 160, 48, 66, TEAL);
  const c2 = unoCard(riv, root, 170, 160, 48, 66, YELLOW);
  const c1 = unoCard(riv, root, 115, 168, 48, 66, RED);
  // 2 lá tĩnh dưới đáy chồng bài.
  const p1 = unoCard(riv, root, 198, 82, 48, 66, BLUE);
  const p2 = unoCard(riv, root, 204, 78, 48, 66, RED);
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Mỗi lá bay lên chồng bài trong 30f: lệch x/y + xoay nhẹ khi đáp.
  // 4 lá đáp XÒE QUẠT (không chồng 1 điểm) để cả 4 màu đều nhìn thấy.
  const fly = (parts, x0, y0, tx, ty, t0, tilt) => {
    shift(riv, an, parts, [[t0, 0], [t0 + 15, (tx - x0) / 2], [t0 + 30, tx - x0]], [[t0, 0], [t0 + 15, -105], [t0 + 30, ty - y0]]);
    for (const p of parts) keys(riv, an, p.id, ROT, [[t0, 0], [t0 + 30, tilt], [D, tilt]]);
  };
  fly(c1, 115, 168, 168, 84, 0, 0.12);
  fly(c2, 170, 160, 192, 78, 40, -0.08);
  fly(c3, 225, 160, 216, 84, 80, 0.1);
  fly(c4.all, 280, 165, 200, 72, 120, -0.05);
  fadeEnds(riv, an, [...c1, ...c2, ...c3, ...c4.all, ...p1, ...p2], D);
  save('uno', riv);
}

// ---- 6. tienlen: ĐÁNH BỘ LÊN BÀN, BỘ SAU CHẶT BỘ TRƯỚC (180f = 3s).
// Đôi 8 trượt từ dưới lên bàn -> đôi Q trượt lên chặt (đôi 8 trượt xuống
// + mờ) -> sảnh 3-4-5-6-7 trượt lên chặt (đôi Q trượt xuống + mờ). ----
{
  const { riv, ab, root } = newFile('tienlen');
  const D = 180;
  // Sảnh 5 lá (tạo trước = nằm trên cùng khi chồng lên nhau).
  const s3 = card(riv, root, 260, 190, 44, 60, { back: BLUE, suit: 'diamond', suitColor: RED, pips: 3 });
  const s2 = card(riv, root, 230, 190, 44, 60, { back: BLUE, suit: 'spade', suitColor: INK, pips: 3 });
  const s1 = card(riv, root, 200, 190, 44, 60, { back: BLUE, suit: 'heart', suitColor: RED, pips: 3 });
  const s0 = card(riv, root, 170, 190, 44, 60, { back: BLUE, suit: 'club', suitColor: INK, pips: 3 });
  const s_ = card(riv, root, 140, 190, 44, 60, { back: BLUE, suit: 'diamond', suitColor: RED, pips: 3 });
  // Đôi Q (lá Tây = vương miện).
  const q2 = card(riv, root, 224, 190, 44, 60, { back: RED, suit: 'crown', suitColor: INK });
  const q1 = card(riv, root, 180, 190, 44, 60, { back: RED, suit: 'crown', suitColor: RED });
  // Đôi 8.
  const e2 = card(riv, root, 224, 190, 44, 60, { back: RED, suit: 'spade', suitColor: INK, pips: 3 });
  const e1 = card(riv, root, 180, 190, 44, 60, { back: RED, suit: 'heart', suitColor: RED, pips: 3 });
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Bài đánh ra bàn là bài NGỬA — lưng tàng hình từ đầu.
  for (const c of [e1, e2, q1, q2, s_, s0, s1, s2, s3]) faceUp(riv, an, c, D);
  // Trượt lên bàn (y 190 -> 90) trong 40f; bị chặt thì trượt xuống + mờ.
  // Mỗi part chỉ key Y và OPACITY đúng 1 lần — gộp toàn bộ timeline vào
  // 1 list keyframe (key 2 lần cùng property sẽ xung đột).
  const slide = (parts, yKeys, opKeys) => {
    shift(riv, an, parts, null, yKeys);
    for (const p of parts) keys(riv, an, p.id, OPACITY, opKeys, 'linear');
  };
  slide(e1.all, [[0, 0], [40, -100], [55, -100], [95, 0], [D, 0]], [[0, 0], [6, 1], [55, 1], [95, 0], [D, 0]]);
  slide(e2.all, [[0, 0], [40, -100], [55, -100], [95, 0], [D, 0]], [[0, 0], [6, 1], [55, 1], [95, 0], [D, 0]]);
  slide(q1.all, [[55, 0], [95, -100], [110, -100], [150, 0], [D, 0]], [[0, 0], [6, 1], [110, 1], [150, 0], [D, 0]]);
  slide(q2.all, [[55, 0], [95, -100], [110, -100], [150, 0], [D, 0]], [[0, 0], [6, 1], [110, 1], [150, 0], [D, 0]]);
  for (const s of [s_, s0, s1, s2, s3])
    slide(s.all, [[110, 0], [150, -100], [D, -100]], [[0, 0], [6, 1], [D - 12, 1], [D, 0]]);
  save('tienlen', riv);
}

// ---- 7. catte: 4 NGƯỜI ĐÁNH 1 LÁ RA GIỮA, LÁ LỚN NHẤT ĂN VÒNG (180f = 3s).
// 4 ghế (dưới/trái/trên/phải) đánh lần lượt 1 lá vào giữa bàn; lá K♠
// (trên) lớn nhất — vòng vàng loé quanh nó, cả 4 lá quét về phía người
// thắng rồi mờ. ----
{
  const { riv, ab, root } = newFile('catte');
  const D = 180;
  // 4 lá (tạo theo thứ tự ngược: lá thắng tạo trước = nằm trên cùng).
  const top = card(riv, root, 200, 50, 44, 60, { back: BLUE, suit: 'crown', suitColor: INK });
  const right = card(riv, root, 325, 100, 44, 60, { back: RED, suit: 'club', suitColor: INK, pips: 3 });
  const left = card(riv, root, 75, 100, 44, 60, { back: BLUE, suit: 'crown', suitColor: RED });
  const bottom = card(riv, root, 200, 150, 44, 60, { back: RED, suit: 'heart', suitColor: RED, pips: 3 });
  // Vòng vàng quanh lá thắng (vẽ sau lá thắng = ở dưới lá).
  const halo = ell(riv, root, { name: 'Halo', x: 196, y: 86, w: 62, h: 76, color: GOLD });
  // 4 ghế (đĩa màu).
  const seatB = ell(riv, root, { name: 'SeatB', x: 200, y: 178, w: 26, color: TEAL, stroke: INK, strokeW: 2 });
  const seatL = ell(riv, root, { name: 'SeatL', x: 42, y: 100, w: 26, color: RED, stroke: INK, strokeW: 2 });
  const seatT = ell(riv, root, { name: 'SeatT', x: 200, y: 22, w: 26, color: YELLOW, stroke: INK, strokeW: 2 });
  const seatR = ell(riv, root, { name: 'SeatR', x: 358, y: 100, w: 26, color: LAVENDER, stroke: INK, strokeW: 2 });
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Bài đánh ra bàn là bài NGỬA — lưng tàng hình từ đầu.
  for (const c of [bottom, left, top, right]) faceUp(riv, an, c, D);
  // Mỗi lá trượt từ ghế vào giữa bàn trong 25f (đáp lệch nhau để cả 4 lá
  // đều thấy), nghỉ, rồi quét về ghế người thắng (trên) + mờ (145-175f).
  // Mỗi part chỉ key X/Y/OPACITY đúng 1 lần — gộp toàn bộ timeline vào
  // 1 list keyframe (key 2 lần cùng property sẽ xung đột).
  const play = (parts, xK, yK) => {
    shift(riv, an, parts, xK, yK);
    for (const p of parts) keys(riv, an, p.id, OPACITY, [[0, 0], [6, 1], [145, 1], [175, 0], [D, 0]], 'linear');
  };
  play(bottom.all, [[0, 0], [25, -18], [145, -18], [175, 0], [D, 0]], [[0, 0], [25, -40], [145, -40], [175, -128], [D, -128]]);
  play(left.all, [[30, 0], [55, 143], [145, 143], [175, 125], [D, 125]], [[30, 0], [55, -10], [145, -10], [175, -78], [D, -78]]);
  play(top.all, [[60, 0], [85, -4], [145, -4], [175, 0], [D, 0]], [[60, 0], [85, 36], [145, 36], [175, -28], [D, -28]]);
  play(right.all, [[90, 0], [115, -105], [145, -105], [175, -125], [D, -125]], [[90, 0], [115, 12], [145, 12], [175, -78], [D, -78]]);
  // Vòng vàng loé quanh lá thắng (115-145).
  keys(riv, an, halo.id, SX, [[0, 0], [115, 0], [125, 1.15], [135, 1], [145, 1.15], [155, 0], [D, 0]]);
  keys(riv, an, halo.id, SY, [[0, 0], [115, 0], [125, 1.15], [135, 1], [145, 1.15], [155, 0], [D, 0]]);
  keys(riv, an, halo.id, OPACITY, [[0, 0], [115, 0], [120, 1], [150, 1], [155, 0], [D, 0]], 'linear');
  fadeEnds(riv, an, [seatB, seatL, seatT, seatR], D);
  save('catte', riv);
}

// ---- 8. bacao: 3 LÁ LẬT LÊN, 9 NÚT + XU CHẠY VÀO (180f = 3s).
// 3 lá úp lật lần lượt: 7♥, 9♠, 3♦ = 19 -> 9 nút; huy hiệu vàng (9 chấm
// mực 3×3) bật lên + 3 xu vàng trượt vào. ----
{
  const { riv, ab, root } = newFile('bacao');
  const D = 180;
  const c3 = card(riv, root, 260, 100, 44, 60, { back: RED, suit: 'diamond', suitColor: RED, pips: 3 });
  const c2 = card(riv, root, 200, 100, 44, 60, { back: RED, suit: 'spade', suitColor: INK, pips: 3 });
  const c1 = card(riv, root, 140, 100, 44, 60, { back: RED, suit: 'heart', suitColor: RED, pips: 3 });
  // Huy hiệu 9 nút: 9 chấm mực 3×3 add TRƯỚC nền vàng (thêm trước = trên).
  const badgeParts = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
    badgeParts.push(ell(riv, root, { name: 'BD' + r + c, x: 180 + c * 20, y: 37 + r * 8, w: 5, color: INK }));
  badgeParts.push(rect(riv, root, { name: 'Badge', x: 200, y: 45, w: 84, h: 28, r: 14, color: GOLD, stroke: INK, strokeW: 2 }));
  // 3 xu trượt từ phải vào.
  const coins = [coin(riv, root, 380, 155, 11), coin(riv, root, 380, 155, 11), coin(riv, root, 380, 155, 11)];
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  flipCard(riv, an, c1, 20, 35, 50, D);
  flipCard(riv, an, c2, 60, 75, 90, D);
  flipCard(riv, an, c3, 100, 115, 130, D);
  for (const p of badgeParts) {
    keys(riv, an, p.id, SX, [[0, 0], [135, 0], [148, 1.15], [155, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [135, 0], [148, 1.15], [155, 1], [D, 1]]);
  }
  const coinTargets = [[318, 152], [340, 160], [362, 152]];
  coins.forEach((parts, i) => {
    const [tx, ty] = coinTargets[i];
    shift(riv, an, parts, [[140, 0], [165, tx - 380]], [[140, 0], [165, ty - 155]]);
    for (const p of parts) keys(riv, an, p.id, OPACITY, [[0, 0], [140, 0], [145, 1], [D, 1]], 'linear');
  });
  fadeEnds(riv, an, [...c1.all, ...c2.all, ...c3.all, ...badgeParts], D);
  save('bacao', riv);
}

// ---- 9. xidach: 2 LÁ LẬT LÊN — XÌ + TÂY (180f = 3s).
// Đúng ví dụ của anh Hưng: 2 lá úp lật lần lượt — Át bích (XÌ) + lá K cơ
// (TÂY, vương miện); sao vàng bật lên + 3 xu trượt vào (Xì dách thắng).
// Nhà cái có 1 lá úp trên đầu, giữ nguyên không lật. ----
{
  const { riv, ab, root } = newFile('xidach');
  const D = 180;
  const c2 = card(riv, root, 235, 105, 44, 60, { back: BLUE, suit: 'crown', suitColor: RED });
  const c1 = card(riv, root, 170, 105, 44, 60, { back: BLUE, suit: 'spade', suitColor: INK });
  const dealer = card(riv, root, 200, 42, 44, 60, { back: RED, suit: 'heart', suitColor: RED, pips: 3 });
  // Sao vàng bật lên dưới 2 lá + 3 xu trượt vào.
  const star = poly(riv, root, { name: 'Star', cx: 200, cy: 162, points: starPoints(200, 162, 15), color: GOLD, stroke: INK, strokeW: 2 });
  const coins = [coin(riv, root, 380, 158, 11), coin(riv, root, 380, 158, 11), coin(riv, root, 380, 158, 11)];
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  flipCard(riv, an, c1, 20, 35, 50, D);
  flipCard(riv, an, c2, 60, 75, 90, D);
  keys(riv, an, star.id, SX, [[0, 0], [100, 0], [112, 1.2], [120, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [100, 0], [112, 1.2], [120, 1], [D, 1]]);
  const coinTargets = [[300, 155], [322, 163], [344, 155]];
  coins.forEach((parts, i) => {
    const [tx, ty] = coinTargets[i];
    shift(riv, an, parts, [[110, 0], [140, tx - 380]], [[110, 0], [140, ty - 158]]);
    for (const p of parts) keys(riv, an, p.id, OPACITY, [[0, 0], [110, 0], [115, 1], [D, 1]], 'linear');
  });
  fadeEnds(riv, an, [...c1.all, ...c2.all, ...dealer.all, star], D);
  save('xidach', riv);
}

// ---- 10. poker: FLOP -> TURN -> RIVER, CHIP VÀO POT (180f = 3s).
// 5 lá chung lật lần lượt (flop 3 lá, turn, river); 2 lá tẩy của người
// chơi ở dưới (ngửa sẵn); 3 chip trượt từ dưới vào pot sau river. ----
{
  const { riv, ab, root } = newFile('poker');
  const D = 180;
  // 5 lá chung (tạo ngược: river trước = nằm trên cùng).
  const river = card(riv, root, 280, 85, 44, 60, { back: BLUE, suit: 'spade', suitColor: INK });
  const turn = card(riv, root, 235, 85, 44, 60, { back: BLUE, suit: 'crown', suitColor: RED });
  const flop3 = card(riv, root, 190, 85, 44, 60, { back: BLUE, suit: 'diamond', suitColor: RED, pips: 3 });
  const flop2 = card(riv, root, 145, 85, 44, 60, { back: BLUE, suit: 'crown', suitColor: INK });
  const flop1 = card(riv, root, 100, 85, 44, 60, { back: BLUE, suit: 'heart', suitColor: RED, pips: 3 });
  // 2 lá tẩy (ngửa sẵn: lưng squash 0 từ đầu).
  const hole2 = card(riv, root, 222, 162, 44, 60, { back: RED, suit: 'heart', suitColor: RED, pips: 3 });
  const hole1 = card(riv, root, 178, 162, 44, 60, { back: RED, suit: 'spade', suitColor: INK, pips: 3 });
  // 3 chip vào pot (y 130).
  const chips = [chip(riv, root, 175, 190, 12, RED), chip(riv, root, 200, 190, 12, BLUE), chip(riv, root, 225, 190, 12, GOLD)];
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  flipCard(riv, an, flop1, 10, 25, 40, D);
  flipCard(riv, an, flop2, 25, 40, 55, D);
  flipCard(riv, an, flop3, 40, 55, 70, D);
  flipCard(riv, an, turn, 80, 95, 110, D);
  flipCard(riv, an, river, 120, 135, 150, D);
  // Lá tẩy: lưng tàng hình từ đầu (chỉ hiện mặt trước).
  for (const p of [...hole1.back, ...hole2.back]) keys(riv, an, p.id, SX, [[0, 0], [D, 0]]);
  chips.forEach((parts, i) => {
    shift(riv, an, parts, null, [[150, 0], [172, -60], [D, -60]]);
    for (const p of parts) keys(riv, an, p.id, OPACITY, [[0, 0], [150, 0], [155, 1], [D, 1]], 'linear');
  });
  fadeEnds(riv, an, [...flop1.all, ...flop2.all, ...flop3.all, ...turn.all, ...river.all, ...hole1.all, ...hole2.all], D);
  save('poker', riv);
}

// ---- 11. solitaire: XẾP BÀI LÊN FOUNDATION (180f = 3s).
// 3 cột tableau (mỗi cột 1 lá úp + 1 lá ngửa); lá Át bích từ cột 1 bay
// lên ô foundation 1 + sao bật; lá 2 cơ từ cột 2 bay lên foundation 2
// + sao bật. ----
{
  const { riv, ab, root } = newFile('solitaire');
  const D = 180;
  // Lá bay (tạo trước = nằm trên cùng).
  const flyB = card(riv, root, 170, 100, 44, 60, { back: RED, suit: 'heart', suitColor: RED, pips: 2 });
  const flyA = card(riv, root, 90, 100, 44, 60, { back: RED, suit: 'spade', suitColor: INK });
  // 3 cột: lá úp dưới (y 70) + lá ngửa trên (y 100) — lá bay chính là lá
  // ngửa của cột 1/2 nên cột 1/2 chỉ còn lá úp sau khi bay.
  const under1 = card(riv, root, 90, 70, 44, 60, { back: BLUE, suit: 'heart', suitColor: RED, pips: 3 });
  const under2 = card(riv, root, 170, 70, 44, 60, { back: BLUE, suit: 'spade', suitColor: INK, pips: 3 });
  const top3 = card(riv, root, 250, 100, 44, 60, { back: RED, suit: 'crown', suitColor: RED });
  const under3 = card(riv, root, 250, 70, 44, 60, { back: BLUE, suit: 'diamond', suitColor: RED, pips: 3 });
  // 2 ô foundation (ô trống màu nỉ đậm) + 2 sao.
  const slot1 = rect(riv, root, { name: 'Slot1', x: 335, y: 48, w: 44, h: 60, r: 6, color: FELT_D, stroke: INK, strokeW: 2 });
  const slot2 = rect(riv, root, { name: 'Slot2', x: 335, y: 118, w: 44, h: 60, r: 6, color: FELT_D, stroke: INK, strokeW: 2 });
  const star1 = poly(riv, root, { name: 'Star1', cx: 335, cy: 48, points: starPoints(335, 48, 12), color: GOLD, stroke: INK, strokeW: 2 });
  const star2 = poly(riv, root, { name: 'Star2', cx: 335, cy: 118, points: starPoints(335, 118, 12), color: GOLD, stroke: INK, strokeW: 2 });
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Lá ngửa sẵn: lưng tàng hình từ đầu.
  for (const p of [...flyA.back, ...flyB.back, ...top3.back]) keys(riv, an, p.id, SX, [[0, 0], [D, 0]]);
  // Bay lên foundation trong 40f (hơi vòng lên trên).
  const flyTo = (parts, x0, y0, tx, ty, t0) => {
    shift(riv, an, parts, [[t0, 0], [t0 + 20, (tx - x0) / 2], [t0 + 40, tx - x0]], [[t0, 0], [t0 + 20, (ty - y0) / 2 - 18], [t0 + 40, ty - y0]]);
  };
  flyTo(flyA.all, 90, 100, 335, 48, 20);
  flyTo(flyB.all, 170, 100, 335, 118, 80);
  keys(riv, an, star1.id, SX, [[0, 0], [60, 0], [70, 1.2], [78, 1], [D, 1]]);
  keys(riv, an, star1.id, SY, [[0, 0], [60, 0], [70, 1.2], [78, 1], [D, 1]]);
  keys(riv, an, star2.id, SX, [[0, 0], [120, 0], [130, 1.2], [138, 1], [D, 1]]);
  keys(riv, an, star2.id, SY, [[0, 0], [120, 0], [130, 1.2], [138, 1], [D, 1]]);
  fadeEnds(riv, an, [...flyA.all, ...flyB.all, ...under1.all, ...under2.all, ...top3.all, ...under3.all, slot1, slot2, star1, star2], D);
  save('solitaire', riv);
}

// ---- 12. bang: BẮN! — TRƯỢT! (180f = 3s).
// Lá "BANG!" đỏ bay từ trái sang phải về phía cao bồi; lá "TRƯỢT!" xanh
// bật lên chắn trước mặt + loé sáng; lá BANG! bật ngược + rơi xuống;
// cao bồi nghiêng mũ chào. ----
{
  const { riv, ab, root } = newFile('bang');
  const D = 180;
  // Cao bồi (phải): thân + đầu + mũ + sao cảnh sát.
  const hatDome = rect(riv, root, { name: 'HatDome', x: 310, y: 78, w: 30, h: 16, r: 6, color: INK });
  const hatBrim = rect(riv, root, { name: 'HatBrim', x: 310, y: 88, w: 60, h: 8, r: 4, color: INK });
  const head = ell(riv, root, { name: 'Head', x: 310, y: 102, w: 30, color: CREAM, stroke: INK, strokeW: 2 });
  const starBadge = poly(riv, root, { name: 'StarBadge', cx: 310, cy: 140, points: starPoints(310, 140, 8), color: GOLD, stroke: INK, strokeW: 1 });
  const body = rect(riv, root, { name: 'Body', x: 310, y: 140, w: 40, h: 44, r: 8, color: TEAL, stroke: INK, strokeW: 2 });
  // Lá BANG! (đỏ + sao trắng) — bắt đầu ngoài màn trái.
  // Thứ tự vẽ: thêm trước = vẽ TRÊN — sao trắng add TRƯỚC nền đỏ.
  const bangParts = [
    poly(riv, root, { name: 'BStar', cx: -30, cy: 110, points: starPoints(-30, 110, 13), color: WHITE }),
    rect(riv, root, { name: 'BBg', x: -30, y: 110, w: 44, h: 60, r: 8, color: RED, stroke: INK, strokeW: 2 }),
  ];
  // Lá TRƯỢT! (xanh + khiên trắng) — bật lên chắn trước cao bồi.
  const missParts = [
    poly(riv, root, { name: 'MShield', cx: 262, cy: 110, points: [[250, 96], [274, 96], [274, 112], [262, 124], [250, 112]], color: WHITE, stroke: INK, strokeW: 2 }),
    rect(riv, root, { name: 'MBg', x: 262, y: 110, w: 44, h: 60, r: 8, color: BLUE, stroke: INK, strokeW: 2 }),
  ];
  // Loé sáng khi chặn.
  const flash = ell(riv, root, { name: 'Flash', x: 262, y: 110, w: 70, h: 70, color: WHITE });
  // Mặt trời + xương rồng + cồn cát (trang trí mép, không che hành động).
  const sun = ell(riv, root, { name: 'Sun', x: 55, y: 38, w: 36, color: YELLOW, stroke: INK, strokeW: 2 });
  const cactus = rect(riv, root, { name: 'Cactus', x: 30, y: 158, w: 10, h: 42, r: 4, color: FELT, stroke: INK, strokeW: 2 });
  const cactusArm = rect(riv, root, { name: 'CactusArm', x: 42, y: 148, w: 14, h: 8, r: 4, color: FELT, stroke: INK, strokeW: 2 });
  const dune = ell(riv, root, { name: 'Dune', x: 200, y: 188, w: 140, h: 12, color: SAND2 });
  bg(riv, root, SAND);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // BANG! bay sang phải (0-50), bị chặn đứng (50-65), bật ngược + rơi (65-110), mờ (110-140).
  shift(riv, an, bangParts,
    [[0, 0], [50, 280], [65, 280], [110, 210], [D, 210]],
    [[0, 0], [50, 0], [65, 0], [110, 25], [D, 25]]);
  for (const p of bangParts) keys(riv, an, p.id, OPACITY, [[0, 0], [5, 1], [110, 1], [140, 0], [D, 0]], 'linear');
  // TRƯỢT! bật lên (50-70) rồi mờ cuối vòng.
  for (const p of missParts) {
    keys(riv, an, p.id, SX, [[0, 0], [50, 0], [62, 1.1], [70, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [50, 0], [62, 1.1], [70, 1], [D, 1]]);
    keys(riv, an, p.id, OPACITY, [[0, 0], [50, 0], [55, 1], [150, 1], [170, 0], [D, 0]], 'linear');
  }
  // Loé sáng lúc chặn (50-70).
  keys(riv, an, flash.id, SX, [[0, 0], [50, 0], [58, 1.4], [70, 0], [D, 0]]);
  keys(riv, an, flash.id, SY, [[0, 0], [50, 0], [58, 1.4], [70, 0], [D, 0]]);
  keys(riv, an, flash.id, OPACITY, [[0, 0], [50, 0], [55, 1], [70, 0], [D, 0]], 'linear');
  // Cao bồi nghiêng mũ chào (70-100).
  for (const p of [hatDome, hatBrim]) keys(riv, an, p.id, ROT, [[0, 0], [70, 0], [85, -0.18], [100, 0], [D, 0]]);
  fadeEnds(riv, an, [head, body, starBadge, sun, cactus, cactusArm, dune], D);
  save('bang', riv);
}
// ---- 13. scribble: VẼ MÈO, ĐOÁN TRÚNG (180f = 3s).
// Bảng trắng: con mèo được vẽ từng nét (đầu -> tai -> mắt/mũi -> râu ->
// thân -> đuôi/chân); bên phải: 3 vạch gợi ý + avatar người đoán + dấu
// tick vàng bật lên khi đoán trúng.
{
  const { riv, ab, root } = newFile('scribble');
  const D = 180;
  // Dấu tick trong vòng vàng (thêm trước = trên cùng).
  const tick1 = poly(riv, root, { name: 'Tick1', cx: 306, cy: 142, points: rotRectPoints(306, 142, 5, 16, 0.7), color: FELT });
  const tick2 = poly(riv, root, { name: 'Tick2', cx: 318, cy: 138, points: rotRectPoints(318, 138, 5, 26, -0.7), color: FELT });
  const tickRing = ell(riv, root, { name: 'TickRing', x: 312, y: 140, w: 40, color: GOLD, stroke: INK, strokeW: 2 });
  // Avatar người đoán.
  const avIn = ell(riv, root, { name: 'AvIn', x: 312, y: 96, w: 14, color: CREAM });
  const av = ell(riv, root, { name: 'Av', x: 312, y: 100, w: 26, color: TEAL, stroke: INK, strokeW: 2 });
  // 3 vạch gợi ý (từ "mèo" 3 chữ).
  const dashes = [296, 316, 336].map((x, i) =>
    rect(riv, root, { name: 'Dash' + i, x, y: 52, w: 14, h: 4, color: INK }));
  // Con mèo (nét mực trên bảng trắng): đầu, tai, mắt, mũi, râu, thân, đuôi, chân.
  const eyeL = ell(riv, root, { name: 'EyeL', x: 132, y: 86, w: 4, color: INK });
  const eyeR = ell(riv, root, { name: 'EyeR', x: 148, y: 86, w: 4, color: INK });
  const nose = poly(riv, root, { name: 'Nose', cx: 140, cy: 96, points: [[136, 93], [144, 93], [140, 98]], color: RED });
  const earL = poly(riv, root, { name: 'EarL', cx: 124, cy: 62, points: [[118, 70], [124, 56], [131, 68]], color: WHITE, stroke: INK, strokeW: 2 });
  const earR = poly(riv, root, { name: 'EarR', cx: 156, cy: 62, points: [[149, 68], [156, 56], [162, 70]], color: WHITE, stroke: INK, strokeW: 2 });
  const head = ell(riv, root, { name: 'Head', x: 140, y: 86, w: 44, color: WHITE, stroke: INK, strokeW: 3 });
  const whL1 = poly(riv, root, { name: 'WhL1', cx: 112, cy: 92, points: rotRectPoints(112, 92, 16, 2, 0.15), color: INK });
  const whL2 = poly(riv, root, { name: 'WhL2', cx: 112, cy: 100, points: rotRectPoints(112, 100, 16, 2, -0.1), color: INK });
  const whR1 = poly(riv, root, { name: 'WhR1', cx: 168, cy: 92, points: rotRectPoints(168, 92, 16, 2, -0.15), color: INK });
  const whR2 = poly(riv, root, { name: 'WhR2', cx: 168, cy: 100, points: rotRectPoints(168, 100, 16, 2, 0.1), color: INK });
  const legL = ell(riv, root, { name: 'LegL', x: 122, y: 152, w: 10, h: 8, color: WHITE, stroke: INK, strokeW: 2 });
  const legR = ell(riv, root, { name: 'LegR', x: 158, y: 152, w: 10, h: 8, color: WHITE, stroke: INK, strokeW: 2 });
  const tail = poly(riv, root, { name: 'Tail', cx: 172, cy: 122, points: rotRectPoints(172, 122, 6, 32, -0.6), color: WHITE, stroke: INK, strokeW: 2 });
  const body = ell(riv, root, { name: 'Body', x: 140, y: 136, w: 58, h: 32, color: WHITE, stroke: INK, strokeW: 3 });
  // Bảng trắng + nền.
  const board = rect(riv, root, { name: 'Board', x: 140, y: 100, w: 200, h: 130, r: 8, color: WHITE, stroke: INK, strokeW: 3 });
  bg(riv, root, CREAM);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Nét vẽ hiện dần theo thứ tự, mờ ra cuối vòng (che cú nhảy reset).
  const appear = (parts, f0) => {
    for (const p of parts) keys(riv, an, p.id, OPACITY, [[0, 0], [f0, 0], [f0 + 8, 1], [D - 12, 1], [D, 0]], 'linear');
  };
  appear([head], 5);
  appear([earL, earR], 25);
  appear([eyeL, eyeR, nose], 45);
  appear([whL1, whL2, whR1, whR2], 60);
  appear([body], 75);
  appear([tail, legL, legR], 95);
  // Tick bật lên khi đoán trúng (110-130), mờ cuối vòng.
  for (const p of [tickRing, tick1, tick2]) {
    keys(riv, an, p.id, SX, [[0, 0], [110, 0], [122, 1.15], [130, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [110, 0], [122, 1.15], [130, 1], [D, 1]]);
    keys(riv, an, p.id, OPACITY, [[0, 0], [110, 0], [115, 1], [D - 12, 1], [D, 0]], 'linear');
  }
  fadeEnds(riv, an, [av, avIn, ...dashes, board], D);
  save('scribble', riv);
}

// ---- 14. meono: BỐC TRÚNG MÈO NỔ (180f = 3s).
// Chồng bài úp: 1 lá bay ra, lật lên thành Mèo Nổ (bom đen + ngòi nổ),
// sao vàng bung ra sau lá bài, lá bài rung lên.
{
  const { riv, ab, root } = newFile('meono');
  const D = 180;
  // Lá Mèo Nổ (tự dựng: mặt = bom + ngòi + tia lửa; lưng đỏ).
  const spark = poly(riv, root, { name: 'Spark', cx: 250, cy: 62, points: starPoints(250, 62, 8), color: GOLD });
  const fuse = poly(riv, root, { name: 'Fuse', cx: 250, cy: 72, points: rotRectPoints(250, 72, 4, 16, 0.5), color: INK });
  const bomb = ell(riv, root, { name: 'Bomb', x: 250, y: 95, w: 30, color: INK });
  const faceBg = rect(riv, root, { name: 'FaceBg', x: 250, y: 95, w: 48, h: 66, r: 8, color: CREAM, stroke: INK, strokeW: 2 });
  const backDot = ell(riv, root, { name: 'BackDot', x: 250, y: 95, w: 12, color: CREAM });
  const backBg = rect(riv, root, { name: 'BackBg', x: 250, y: 95, w: 48, h: 66, r: 8, color: RED, stroke: INK, strokeW: 2 });
  const drawn = { back: [backDot, backBg], face: [spark, fuse, bomb, faceBg], all: [spark, fuse, bomb, faceBg, backDot, backBg] };
  // Vụ nổ sau lá bài: sao vàng + 4 tia.
  const star = poly(riv, root, { name: 'Star', cx: 250, cy: 95, points: starPoints(250, 95, 34), color: GOLD, stroke: INK, strokeW: 2 });
  const rays = [0.5, 1.5, 2.6, 3.6].map((a, i) =>
    poly(riv, root, { name: 'Ray' + i, cx: 250 + Math.cos(a) * 52, cy: 95 + Math.sin(a) * 52, points: rotRectPoints(250 + Math.cos(a) * 52, 95 + Math.sin(a) * 52, 22, 5, a), color: GOLD }));
  // Chồng bài úp (3 lá lệch nhau).
  const d3 = card(riv, root, 128, 94, 48, 66, { back: RED, suit: 'heart', suitColor: RED, pips: 3 });
  const d2 = card(riv, root, 124, 98, 48, 66, { back: RED, suit: 'heart', suitColor: RED, pips: 3 });
  const d1 = card(riv, root, 120, 102, 48, 66, { back: RED, suit: 'heart', suitColor: RED, pips: 3 });
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Lá bay từ chồng lên vị trí (250,95), vòng lên trên; rung khi nổ
  // (100-130) — gộp chung vào cùng list key X/Y (mỗi property key 1 lần).
  shift(riv, an, drawn.all,
    [[0, -130], [20, -65], [40, 0], [100, 0], [108, 4], [116, -4], [124, 4], [130, 0], [D, 0]],
    [[0, 5], [20, -45], [40, 0], [100, 0], [108, -3], [116, 2], [124, -2], [130, 0], [D, 0]]);
  flipCard(riv, an, drawn, 45, 60, 75, D);
  // Sao + tia bung ra sau khi lật (100-115), mờ cuối vòng.
  for (const p of [star, ...rays]) {
    keys(riv, an, p.id, SX, [[0, 0], [100, 0], [112, 1.25], [120, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [100, 0], [112, 1.25], [120, 1], [D, 1]]);
    keys(riv, an, p.id, OPACITY, [[0, 0], [100, 0], [105, 1], [D - 12, 1], [D, 0]], 'linear');
  }
  fadeEnds(riv, an, [...d1.all, ...d2.all, ...d3.all], D);
  save('meono', riv);
}

// ---- 15. tamquoc: SÁT! (180f = 3s).
// 2 võ tướng đối mặt (đỏ vs xanh), lá Sát đỏ bay từ tướng đỏ sang tướng
// xanh, loé sáng + tướng xanh rung + rụng 1 tim máu.
{
  const { riv, ab, root } = newFile('tamquoc');
  const D = 180;
  // Loé sáng khi trúng (trên cùng).
  const flash = ell(riv, root, { name: 'Flash', x: 290, y: 95, w: 70, h: 70, color: WHITE });
  // Lá Sát (nền đỏ + nhát chém trắng).
  const slash = poly(riv, root, { name: 'Slash', cx: 150, cy: 95, points: rotRectPoints(150, 95, 8, 52, 0.6), color: WHITE });
  const satBg = rect(riv, root, { name: 'SatBg', x: 150, y: 95, w: 44, h: 60, r: 8, color: RED, stroke: INK, strokeW: 2 });
  const sat = [slash, satBg];
  // Tim máu dưới mỗi tướng (3 tim mỗi bên).
  const heartsA = [90, 110, 130].map((x, i) => suitPip(riv, root, x, 142, 10, 'heart', RED)).flat();
  const heartsB = [270, 290, 310].map((x, i) => suitPip(riv, root, x, 142, 10, 'heart', RED)).flat();
  // 2 võ tướng (đĩa như quân cờ tướng).
  const genA = disc(riv, root, 110, 95, RED, CREAM, RED);
  const genB = disc(riv, root, 290, 95, BLUE, CREAM, BLUE);
  // Bàn nỉ + nền.
  const table = rect(riv, root, { name: 'Table', x: 200, y: 110, w: 360, h: 120, r: 16, color: FELT });
  bg(riv, root, SAND);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Sát bay từ A sang B (0-35), đứng ở B, mờ cuối vòng.
  shift(riv, an, sat, [[0, 0], [35, 100], [D, 100]], [[0, 0], [35, 0], [D, 0]]);
  for (const p of sat) keys(riv, an, p.id, OPACITY, [[0, 0], [5, 1], [D - 12, 1], [D, 0]], 'linear');
  // Loé sáng (35-55).
  keys(riv, an, flash.id, OPACITY, [[0, 0], [35, 0], [42, 1], [55, 0], [D, 0]], 'linear');
  // Tướng B rung (50-80) + rụng 1 tim (tim thứ 3 của B = parts 6-8).
  const wob = [[0, 0], [50, 0], [56, 4], [62, -4], [68, 4], [74, -4], [80, 0], [D, 0]];
  for (const p of genB) keys(riv, an, p.id, X, wob.map(([f, v]) => [f, 290 + v]));
  for (const p of heartsB.slice(6)) keys(riv, an, p.id, OPACITY, [[0, 1], [55, 1], [70, 0], [D, 0]], 'linear');
  fadeEnds(riv, an, [...genA, ...genB, ...heartsA, ...heartsB.slice(0, 6), table], D);
  save('tamquoc', riv);
}

// ---- 16. masoi: ĐÊM SÓI (180f = 3s).
// Trời đêm + trăng + sao nhấp nháy; sói đen đứng trên đồi, mắt vàng
// sáng, nhìn về lá dân làng bên phải đang bị khung ngắm đỏ chớp.
{
  const { riv, ab, root } = newFile('masoi');
  const D = 180;
  // Khung ngắm quanh lá dân (4 góc đỏ).
  const brackets = [];
  const bx = 300, by = 120;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    brackets.push(rect(riv, root, { name: 'BrH' + sx + sy, x: bx + sx * 26, y: by + sy * 36, w: 14, h: 4, color: RED }));
    brackets.push(rect(riv, root, { name: 'BrV' + sx + sy, x: bx + sx * 26, y: by + sy * 36, w: 4, h: 14, color: RED }));
  }
  // Dân làng (lá bài có mặt người).
  const vHead = ell(riv, root, { name: 'VHead', x: 300, y: 108, w: 18, color: SAND, stroke: INK, strokeW: 2 });
  const vBody = rect(riv, root, { name: 'VBody', x: 300, y: 136, w: 24, h: 20, r: 6, color: TEAL, stroke: INK, strokeW: 2 });
  const vCard = rect(riv, root, { name: 'VCard', x: 300, y: 120, w: 44, h: 60, r: 8, color: CREAM, stroke: INK, strokeW: 2 });
  // Mắt sói (vàng, sáng — to hơn để thấy rõ).
  const eye1 = ell(riv, root, { name: 'Eye1', x: 166, y: 112, w: 7, color: YELLOW });
  const eye2 = ell(riv, root, { name: 'Eye2', x: 176, y: 112, w: 7, color: YELLOW });
  // Sói (bóng đen trên đồi): tai, mõm, đầu, đuôi, chân, thân.
  const ear1 = poly(riv, root, { name: 'Ear1', cx: 152, cy: 96, points: [[146, 104], [152, 90], [158, 103]], color: INK });
  const ear2 = poly(riv, root, { name: 'Ear2', cx: 168, cy: 94, points: [[162, 103], [168, 89], [174, 102]], color: INK });
  const snout = ell(riv, root, { name: 'Snout', x: 182, y: 120, w: 14, h: 9, color: INK });
  const wHead = ell(riv, root, { name: 'WHead', x: 166, y: 112, w: 28, h: 22, color: INK });
  const tail = poly(riv, root, { name: 'Tail', cx: 78, cy: 128, points: rotRectPoints(78, 128, 6, 30, 0.7), color: INK });
  const leg1 = rect(riv, root, { name: 'Leg1', x: 100, y: 156, w: 8, h: 18, color: INK });
  const leg2 = rect(riv, root, { name: 'Leg2', x: 140, y: 156, w: 8, h: 18, color: INK });
  const wBody = ell(riv, root, { name: 'WBody', x: 120, y: 138, w: 88, h: 38, color: INK });
  // Trăng + vết lõm + sao.
  const crater1 = ell(riv, root, { name: 'Cr1', x: 322, y: 38, w: 8, color: SAND });
  const crater2 = ell(riv, root, { name: 'Cr2', x: 340, y: 54, w: 6, color: SAND });
  const moon = ell(riv, root, { name: 'Moon', x: 330, y: 46, w: 44, color: CREAM, stroke: INK, strokeW: 2 });
  const stars = [[60, 30], [110, 52], [200, 26], [260, 44], [370, 90]].map(([x, y], i) =>
    ell(riv, root, { name: 'Star' + i, x, y, w: 5, color: CREAM }));
  // Đồi + nền đêm.
  const hill = ell(riv, root, { name: 'Hill', x: 200, y: 196, w: 420, h: 60, color: INK });
  bg(riv, root, NIGHT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Mắt sói sáng theo nhịp (0.4 -> 1 — biên độ lớn để thấy rõ).
  for (const p of [eye1, eye2])
    keys(riv, an, p.id, OPACITY, [[0, 0.4], [30, 1], [60, 0.4], [90, 1], [120, 0.4], [150, 1], [D, 0.4]], 'linear');
  // Đầu sói gật rõ (±5) + đuôi vẫy (xoay ±0.15).
  for (const p of [wHead, ear1, ear2, snout, eye1, eye2])
    keys(riv, an, p.id, Y, [[0, p.y], [45, p.y + 5], [90, p.y], [135, p.y + 5], [D, p.y]]);
  keys(riv, an, tail.id, ROT, [[0, 0], [30, 0.15], [60, -0.1], [90, 0.15], [120, -0.1], [150, 0.15], [D, 0]]);
  // Sói rình mồi: cả con sói tiến về phía dân làng rồi lùi lại (chậm,
  // 1 vòng lặp) — mỗi part key X theo gốc riêng.
  const wolfAll = [wBody, tail, leg1, leg2, wHead, ear1, ear2, snout, eye1, eye2];
  for (const p of wolfAll)
    keys(riv, an, p.id, X, [[0, p.x], [90, p.x + 8], [D, p.x]]);
  // Lá dân run sợ (rung X nhanh ±2).
  const tremble = [[0, 0], [10, 2], [20, -2], [30, 2], [40, -2], [50, 2], [60, -2], [70, 2], [80, -2], [90, 2], [100, -2], [110, 2], [120, -2], [130, 2], [140, -2], [150, 2], [160, -2], [170, 2], [D, 0]];
  for (const p of [vHead, vBody, vCard])
    keys(riv, an, p.id, X, tremble.map(([f, v]) => [f, p.x + v]));
  // Khung ngắm chớp mạnh (scale 1 -> 1.2).
  for (const p of brackets) {
    keys(riv, an, p.id, SX, [[0, 1], [30, 1.2], [60, 1], [90, 1.2], [120, 1], [150, 1.2], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 1], [30, 1.2], [60, 1], [90, 1.2], [120, 1], [150, 1.2], [D, 1]]);
  }
  // Sao nhấp nháy lệch pha (chẵn/lẻ ngược nhau).
  stars.forEach((s, i) => {
    const tw = i % 2 === 0
      ? [[0, 0.4], [45, 1], [90, 0.4], [135, 1], [D, 0.4]]
      : [[0, 1], [45, 0.4], [90, 1], [135, 0.4], [D, 1]];
    keys(riv, an, s.id, OPACITY, tw, 'linear');
  });
  fadeEnds(riv, an, [vHead, vBody, vCard, wBody, tail, leg1, leg2, moon, crater1, crater2, hill, ...brackets, ...stars], D);
  save('masoi', riv);
}

// ---- 17. thathaythach: THẬT HAY THÁCH (180f = 3s).
// 2 lá lựa chọn (THẬT = con mắt, THÁCH = tia sét): ngón tay chọn THÁCH,
// lá THÁCH nhấc lên + vòng vàng loé; lá ở giữa lật lên thành tia sét vàng
// + sao bật.
{
  const { riv, ab, root } = newFile('thathaythach');
  const D = 180;
  // Sao vàng bật lên sau khi lật (trên cùng).
  const star = poly(riv, root, { name: 'Star', cx: 200, cy: 48, points: starPoints(200, 48, 13), color: GOLD, stroke: INK, strokeW: 2 });
  // Lá ở giữa (lật lên thành tia sét vàng).
  const boltF = poly(riv, root, { name: 'BoltF', cx: 200, cy: 95, points: [[206, 72], [192, 98], [200, 98], [194, 118], [208, 92], [200, 92]], color: GOLD });
  const midFaceBg = rect(riv, root, { name: 'MidFaceBg', x: 200, y: 95, w: 48, h: 66, r: 8, color: CREAM, stroke: INK, strokeW: 2 });
  const midBackDot = ell(riv, root, { name: 'MidBackDot', x: 200, y: 95, w: 12, color: CREAM });
  const midBackBg = rect(riv, root, { name: 'MidBackBg', x: 200, y: 95, w: 48, h: 66, r: 8, color: RED, stroke: INK, strokeW: 2 });
  const mid = { back: [midBackDot, midBackBg], face: [boltF, midFaceBg], all: [boltF, midFaceBg, midBackDot, midBackBg] };
  // Lá THÁCH (tia sét) + vòng vàng.
  const boltD = poly(riv, root, { name: 'BoltD', cx: 280, cy: 150, points: [[286, 127], [272, 153], [280, 153], [274, 173], [288, 147], [280, 147]], color: GOLD });
  const dareFace = rect(riv, root, { name: 'DareFace', x: 280, y: 150, w: 48, h: 66, r: 8, color: CREAM, stroke: INK, strokeW: 2 });
  const dareBackDot = ell(riv, root, { name: 'DareBackDot', x: 280, y: 150, w: 12, color: CREAM });
  const dareBackBg = rect(riv, root, { name: 'DareBackBg', x: 280, y: 150, w: 48, h: 66, r: 8, color: RED, stroke: INK, strokeW: 2 });
  const dare = { back: [dareBackDot, dareBackBg], face: [boltD, dareFace], all: [boltD, dareFace, dareBackDot, dareBackBg] };
  const ring = ell(riv, root, { name: 'Ring', x: 280, y: 150, w: 62, h: 80, color: GOLD });
  // Lá THẬT (con mắt).
  const pupil = ell(riv, root, { name: 'Pupil', x: 120, y: 150, w: 9, color: INK });
  const eyeW = ell(riv, root, { name: 'EyeW', x: 120, y: 150, w: 30, h: 18, color: WHITE, stroke: INK, strokeW: 2 });
  const truthFace = rect(riv, root, { name: 'TruthFace', x: 120, y: 150, w: 48, h: 66, r: 8, color: CREAM, stroke: INK, strokeW: 2 });
  const truthBackDot = ell(riv, root, { name: 'TruthBackDot', x: 120, y: 150, w: 12, color: CREAM });
  const truthBackBg = rect(riv, root, { name: 'TruthBackBg', x: 120, y: 150, w: 48, h: 66, r: 8, color: BLUE, stroke: INK, strokeW: 2 });
  const truth = { back: [truthBackDot, truthBackBg], face: [pupil, eyeW, truthFace], all: [pupil, eyeW, truthFace, truthBackDot, truthBackBg] };
  // Ngón tay chọn (chấm tròn).
  const finger = ell(riv, root, { name: 'Finger', x: 200, y: 182, w: 20, color: TEAL, stroke: INK, strokeW: 2 });
  // Bàn nỉ + nền.
  const table = rect(riv, root, { name: 'Table', x: 200, y: 115, w: 360, h: 130, r: 16, color: FELT });
  bg(riv, root, CREAM);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // 2 lá lựa chọn ngửa sẵn.
  faceUp(riv, an, truth, D);
  faceUp(riv, an, dare, D);
  // Ngón tay trượt sang lá THÁCH (0-30).
  shift(riv, an, [finger], [[0, 0], [30, 80], [D, 80]], [[0, 0], [30, -14], [D, -14]]);
  // Lá THÁCH nhấc lên (30-50) + vòng vàng loé (30-60).
  shift(riv, an, dare.all, null, [[0, 0], [30, 0], [50, -12], [D, -12]]);
  keys(riv, an, ring.id, SX, [[0, 0], [30, 0], [42, 1.1], [50, 1], [60, 0], [D, 0]]);
  keys(riv, an, ring.id, SY, [[0, 0], [30, 0], [42, 1.1], [50, 1], [60, 0], [D, 0]]);
  // Lá giữa lật lên (55-100) + sao bật (105-124).
  flipCard(riv, an, mid, 55, 75, 95, D);
  keys(riv, an, star.id, SX, [[0, 0], [105, 0], [116, 1.2], [124, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [105, 0], [116, 1.2], [124, 1], [D, 1]]);
  fadeEnds(riv, an, [...truth.all, ...dare.all, ...mid.all, star, ring, finger, table], D);
  save('thathaythach', riv);
}

// ---- 18. baitan: TẤN – ĐỠ (180f = 3s).
// Tấn 7♥, đỡ 9♥ chồng lên; tấn K♠, đỡ Át ♠ chồng lên; lá chủ (tim đỏ)
// nằm cuối bàn, dấu chủ nhấp nháy.
{
  const { riv, ab, root } = newFile('baitan');
  const D = 180;
  // Lá chủ + dấu chủ (tim đỏ) ở góc phải dưới.
  const trumpPip = suitPip(riv, root, 350, 118, 14, 'heart', RED);
  const trump = card(riv, root, 350, 158, 44, 60, { back: RED, suit: 'heart', suitColor: RED, pips: 3 });
  // 2 lá đỡ (tạo trước = nằm trên lá tấn khi chồng).
  const def2 = card(riv, root, 274, 89, 44, 60, { back: BLUE, suit: 'spade', suitColor: INK });
  const def1 = card(riv, root, 154, 89, 44, 60, { back: BLUE, suit: 'heart', suitColor: RED, pips: 3 });
  // 2 lá tấn.
  const att2 = card(riv, root, 260, 95, 44, 60, { back: RED, suit: 'crown', suitColor: INK });
  const att1 = card(riv, root, 140, 95, 44, 60, { back: RED, suit: 'heart', suitColor: RED, pips: 3 });
  // Tay trên (3 lá úp xanh) + tay dưới (3 lá úp đỏ).
  const topH = [140, 200, 260].map((x, i) => card(riv, root, x, 28, 40, 54, { back: BLUE, suit: 'spade', suitColor: INK, pips: 3 }));
  const botH = [140, 200, 260].map((x, i) => card(riv, root, x, 172, 40, 54, { back: RED, suit: 'heart', suitColor: RED, pips: 3 }));
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Bài trên bàn là bài NGỬA.
  for (const c of [att1, att2, def1, def2]) faceUp(riv, an, c, D);
  // Tấn 1 trượt lên từ tay dưới (0-30); đỡ 1 trượt từ tay trên (30-60);
  // tấn 2 (60-90); đỡ 2 (90-120).
  shift(riv, an, att1.all, [[0, 0], [30, 0], [D, 0]], [[0, 77], [30, 0], [D, 0]]);
  shift(riv, an, def1.all, [[30, 46], [60, 0], [D, 0]], [[30, -61], [60, 0], [D, 0]]);
  shift(riv, an, att2.all, [[60, 0], [90, 0], [D, 0]], [[60, 77], [90, 0], [D, 0]]);
  shift(riv, an, def2.all, [[90, -74], [120, 0], [D, 0]], [[90, -61], [120, 0], [D, 0]]);
  // Dấu chủ nhấp nháy (120-180).
  for (const p of trumpPip) {
    keys(riv, an, p.id, SX, [[0, 1], [120, 1], [135, 1.25], [150, 1], [165, 1.25], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 1], [120, 1], [135, 1.25], [150, 1], [165, 1.25], [D, 1]]);
  }
  fadeEnds(riv, an, [...att1.all, ...att2.all, ...def1.all, ...def2.all, ...trump.all, ...trumpPip, ...topH.flatMap(c => c.all), ...botH.flatMap(c => c.all)], D);
  save('baitan', riv);
}

// ---- 19. loto: VÉ LÔ TÔ + KINH! (180f = 3s).
// Vé 3 hàng × 9 cột: số đã ra được chấm đỏ; bóng số rơi vào khay; hàng
// giữa đủ 5 số (ô vàng) -> sao vàng KINH! bật lên + nhấp nháy.
{
  const { riv, ab, root } = newFile('loto');
  const D = 180;
  // Sao KINH! (trên cùng).
  const star = poly(riv, root, { name: 'Star', cx: 320, cy: 130, points: starPoints(320, 130, 16), color: GOLD, stroke: INK, strokeW: 2 });
  // Bóng số rơi vào khay.
  const ballHi = ell(riv, root, { name: 'BallHi', x: 314, y: 52, w: 8, color: WHITE });
  const ball = ell(riv, root, { name: 'Ball', x: 320, y: 60, w: 28, color: RED, stroke: INK, strokeW: 2 });
  const tray = rect(riv, root, { name: 'Tray', x: 320, y: 84, w: 44, h: 10, r: 5, color: INK });
  // Vé: 3 hàng × 9 cột, ô 18×18, cách 2px. Hàng giữa (hàng trúng) ô VÀNG.
  const gridX0 = 61, gridY0 = 71, cell = 18, gap = 2;
  const rows = [
    [1, 0, 1, 0, 1, 1, 0, 1, 0],
    [0, 1, 0, 1, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 0, 1, 0, 1, 0],
  ];
  // Dấu đã ra (chấm đỏ trong ô) — PHẢI tạo TRƯỚC các ô (thêm trước = vẽ
  // TRÊN; tạo sau ô thì chấm bị ô kem che mất).
  const markAt = (r, c) => {
    const cx = gridX0 + c * (cell + gap) + cell / 2;
    const cy = gridY0 + r * (cell + gap) + cell / 2;
    return ell(riv, root, { name: 'Mark' + r + c, x: cx, y: cy, w: 10, color: RED });
  };
  const earlyMarks = [markAt(0, 0), markAt(0, 4), markAt(0, 7), markAt(1, 1), markAt(1, 4), markAt(1, 6), markAt(2, 0), markAt(2, 5)];
  const lateMarks = [markAt(1, 3), markAt(1, 8)];
  const cells = [];
  rows.forEach((row, r) => {
    row.forEach((has, c) => {
      if (!has) return;
      const cx = gridX0 + c * (cell + gap) + cell / 2;
      const cy = gridY0 + r * (cell + gap) + cell / 2;
      cells.push(rect(riv, root, { name: 'Cell' + r + c, x: cx, y: cy, w: cell, h: cell, color: r === 1 ? GOLD : CREAM, stroke: INK, strokeW: 1 }));
    });
  });
  // Khung vé + nền.
  const ticket = rect(riv, root, { name: 'Ticket', x: 150, y: 100, w: 198, h: 78, r: 8, color: WHITE, stroke: INK, strokeW: 3 });
  bg(riv, root, CREAM);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Bóng rơi (0-30) + nảy nhẹ, rồi nảy đều suốt vòng (không chết cảnh).
  shift(riv, an, [ball, ballHi], [[0, 0], [30, 0], [D, 0]], [[0, -90], [18, 0], [24, -8], [30, 0], [45, -7], [60, 0], [75, -7], [90, 0], [105, -7], [120, 0], [135, -7], [150, 0], [165, -7], [D, 0]]);
  // 2 dấu cuối hiện dần (40 và 60).
  keys(riv, an, lateMarks[0].id, OPACITY, [[0, 0], [40, 0], [48, 1], [D, 1]], 'linear');
  keys(riv, an, lateMarks[1].id, OPACITY, [[0, 0], [60, 0], [68, 1], [D, 1]], 'linear');
  // Sao KINH! bật lên (80-100) rồi nhấp nháy mạnh (100-180).
  keys(riv, an, star.id, SX, [[0, 0], [80, 0], [92, 1.2], [100, 1], [120, 1.25], [140, 1], [160, 1.25], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [80, 0], [92, 1.2], [100, 1], [120, 1.25], [140, 1], [160, 1.25], [D, 1]]);
  fadeEnds(riv, an, [...cells, ...earlyMarks, ticket, tray, ball, ballHi, star], D);
  save('loto', riv);
}

// ---- 20. covua: MÃ NHẢY CHỮ L (180f = 3s).
// 1 góc bàn cờ 5×4 ô; quân Mã trắng nhảy chữ L (2 ô ngang + 1 ô lên,
// rồi nhảy về); Vua đen đứng ở góc kia nhún nhẹ; 1 Tốt trắng đứng yên.
{
  const { riv, ab, root } = newFile('covua');
  const D = 180;
  const stops = [[75, 145], [105, 145], [135, 115], [105, 145], [75, 145]];
  const [kx0, ky0] = stops[0];
  // Quân Mã trắng (đầu ngựa + bờm + đế).
  const kEye = ell(riv, root, { name: 'KEye', x: kx0 + 9, y: ky0 - 19, w: 2.5, color: INK });
  const kMuzzle = ell(riv, root, { name: 'KMuzzle', x: kx0 + 14, y: ky0 - 14, w: 8, h: 6, color: CREAM, stroke: INK, strokeW: 1 });
  const kEar = poly(riv, root, { name: 'KEar', cx: kx0 + 2, cy: ky0 - 26, points: [[kx0 + 2, ky0 - 30], [kx0 - 2, ky0 - 23], [kx0 + 6, ky0 - 23]], color: CREAM, stroke: INK, strokeW: 1 });
  const kHead = ell(riv, root, { name: 'KHead', x: kx0 + 7, y: ky0 - 17, w: 15, h: 12, color: CREAM, stroke: INK, strokeW: 2 });
  const kMane = poly(riv, root, { name: 'KMane', cx: kx0 - 1, cy: ky0 - 21, points: [[kx0 - 2, ky0 - 26], [kx0 + 3, ky0 - 18], [kx0 - 4, ky0 - 16]], color: INK });
  const kBody = rect(riv, root, { name: 'KBody', x: kx0, y: ky0 - 4, w: 18, h: 20, r: 6, color: CREAM, stroke: INK, strokeW: 2 });
  const kBase = ell(riv, root, { name: 'KBase', x: kx0, y: ky0 + 8, w: 28, h: 9, color: CREAM, stroke: INK, strokeW: 2 });
  const kShadow = ell(riv, root, { name: 'KShadow', x: kx0, y: ky0 + 10, w: 26, h: 7, color: SHADOW });
  // Vua đen (đế + thân + đầu + vương miện + thánh giá).
  const crV = rect(riv, root, { name: 'CrV', x: 195, y: 38, w: 4, h: 12, color: GOLD });
  const crH = rect(riv, root, { name: 'CrH', x: 195, y: 41, w: 10, h: 4, color: GOLD });
  const crown = rect(riv, root, { name: 'Crown', x: 195, y: 48, w: 16, h: 8, r: 2, color: GOLD, stroke: INK, strokeW: 1 });
  const kgHead = ell(riv, root, { name: 'KgHead', x: 195, y: 58, w: 15, color: INK });
  const kgBody = rect(riv, root, { name: 'KgBody', x: 195, y: 74, w: 18, h: 22, r: 6, color: INK });
  const kgBase = ell(riv, root, { name: 'KgBase', x: 195, y: 86, w: 28, h: 9, color: INK });
  // Tốt trắng đứng yên.
  const pHead = ell(riv, root, { name: 'PHead', x: 165, y: 118, w: 12, color: CREAM, stroke: INK, strokeW: 2 });
  const pBody = rect(riv, root, { name: 'PBody', x: 165, y: 130, w: 14, h: 16, r: 5, color: CREAM, stroke: INK, strokeW: 2 });
  const pBase = ell(riv, root, { name: 'PBase', x: 165, y: 140, w: 22, h: 7, color: CREAM, stroke: INK, strokeW: 2 });
  // Bàn cờ 5×4 ô 30px.
  const sq = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
    const dark = (r + c) % 2 === 1;
    sq.push(rect(riv, root, { name: 'Sq' + r + c, x: 75 + c * 30, y: 55 + r * 30, w: 30, h: 30, color: dark ? INK : CREAM }));
  }
  bg(riv, root, SAND);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Mã nhảy chữ L đi + về (4 cú nhảy × 40f), mờ dần về ô đầu.
  const hop = hopFrames(stops, 40, 14, D, 10);
  const knight = [kEye, kMuzzle, kEar, kHead, kMane, kBody, kBase];
  shift(riv, an, knight, hop.dxF, hop.dyF);
  for (const p of knight) {
    keys(riv, an, p.id, SY, hop.squashF);
    keys(riv, an, p.id, OPACITY, hop.opF, 'linear');
  }
  keys(riv, an, kShadow.id, X, hop.shXF);
  keys(riv, an, kShadow.id, Y, hop.shYF);
  keys(riv, an, kShadow.id, SX, hop.shSXF);
  keys(riv, an, kShadow.id, OPACITY, hop.opF, 'linear');
  // Vua đen nhún nhẹ tại chỗ (mỗi part key Y theo gốc riêng).
  const king = [crV, crH, crown, kgHead, kgBody, kgBase];
  for (const p of king)
    keys(riv, an, p.id, Y, [[0, p.y], [45, p.y + 2], [90, p.y], [135, p.y + 2], [D, p.y]]);
  fadeEnds(riv, an, [...king, pHead, pBody, pBase, ...sq], D);
  save('covua', riv);
}
console.log('done');
