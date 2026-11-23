// Build 92 file .riv — KHỔ RỘNG v5 (2026-11-21) + batch 2/3/4/5/6/7/8/9/10/11/12
// + typhu/cangua làm lại FULL BÀN (2026-11-21).
// v6 (2026-11-21): (1) nền mọi scene tràn ra ngoài artboard 2 đơn vị mỗi
// phía (bg() 404×204) để mép artboard luôn kín tuyệt đối; (2) BỎ fadeEnds
// (hàm thành no-op) — trạng thái cuối vòng giữ nguyên rồi bắt đầu lại ngay.
// NGUYÊN NHÂN GỐC của viền dọc 2 bên (đo 2026-11-21): KHÔNG phải do nền
// .riv — nền cũ đã đúng 400×200, đo ở 800×400 mép kín hết (alpha 255).
// Vết lỗi ở mount: runtime Rive KHÔNG đọc option `fit:` top-level, Rive
// chỉ đọc `params.layout` (mặc định = Fit.Contain) → artboard co vừa khung
// 214×104 để lại 2 viền trong suốt 3px. Sửa ở rive-tiles.js + rive-lobby.js
// (truyền Layout Fit.Cover); phần này chỉ là nền tràn phòng thủ thêm.
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
const SUNSET = hex('#E8722C'); // hoàng hôn sa mạc cam (Cà Đùng — nền cát nhạt cũ nhìn như tile lỗi)
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
// (nhảy + nghỉ), arcH = độ cao vòng cung. Trả về {dxF, dyF, shXF, shYF,
// shSXF, opF, squashF} — dxF/dyF là ĐỘ LỆCH so với stops[0] (dùng shift),
// bóng dùng tọa độ TUYỆT ĐỐI (shYF cộng thêm offY).
// v6 (2026-11-21): KHÔNG còn mờ cuối vòng — quân GIỮ NGUYÊN ở ô cuối tới
// hết vòng (opF luôn = 1, không dịch về ô đầu nữa), vòng lặp cắt cứng về
// ô đầu. Trước đây: mờ dần -> dịch về ô đầu lúc tàng hình -> hiện dần.
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
  // v6: giữ nguyên ở ô cuối tới hết vòng (không dịch về ô đầu nữa) —
  // vòng lặp cắt cứng về ô đầu ở frame 0.
  const [xL, yL] = stops[stops.length - 1];
  dxF.push([D, xL - x0]);
  dyF.push([D, yL - y0]);
  shXF.push([D, xL]);
  shYF.push([D, yL + offY]);
  shSXF.push([D, 1]);
  const opF = [[0, 1], [D, 1]];
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
// v6 (2026-11-21): tràn ra ngoài artboard 2 đơn vị mỗi phía (-2..402 ×
// -2..202) để mép artboard luôn kín tuyệt đối — runtime render ở tỉ lệ lẻ
// (khung thẻ 214×104) có thể để lại viền trong suốt nếu nền vừa đúng
// 400×200. Phần tràn ra ngoài artboard không bao giờ hiện (nằm ngoài vùng
// artboard mà layout hiển thị).
function bg(riv, root, color) {
  return rect(riv, root, { name: 'BG', x: 200, y: 100, w: 404, h: 204, color });
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

// Chữ số 7 đoạn (mỗi đoạn = 1 rect nhỏ) — vẽ số đọc được ở cỡ nhỏ
// (runtime Rive không có text). d = 0..9, (cx,cy) = tâm chữ số.
// W×H = 18×30, đoạn dày 3.5 — đủ đọc ở cỡ thẻ (tỉ lệ hiển thị ~0.53).
const SEV_SEG = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
function digit7(riv, root, cx, cy, d, color, tag) {
  const parts = [];
  const W = 18, H = 30, T = 3.5;
  const seg = {
    a: [cx, cy - H / 2 + T / 2, W, T],
    d: [cx, cy + H / 2 - T / 2, W, T],
    g: [cx, cy, W, T],
    f: [cx - W / 2 + T / 2, cy - H / 4, T, H / 2],
    b: [cx + W / 2 - T / 2, cy - H / 4, T, H / 2],
    e: [cx - W / 2 + T / 2, cy + H / 4, T, H / 2],
    c: [cx + W / 2 - T / 2, cy + H / 4, T, H / 2],
  };
  for (const s of SEV_SEG[d]) {
    const [x, y, w, h] = seg[s];
    parts.push(rect(riv, root, { name: tag + s.toUpperCase(), x, y, w, h, color }));
  }
  return parts;
}

// Lá UNO: nền màu + oval kem + số 7 đoạn ở GÓC TRÊN-TRÁI (kiểu số góc
// của lá bài thật — phần này không bị lá kề bên phải che; oval giữa lá
// cũ bị che mất phần phải thành hình chữ "C", anh Hưng báo vẫn lỗi).
// Góc lá xoay theo quạt nên vị trí oval được tính SẴN ở góc xoay cuối
// (offset góc quay theo tilt): lúc quạt đã đủ thì oval nằm đúng góc lá;
// lúc bay lên thì lệch vài px, không nhìn ra (lá đang chuyển động nhanh).
// Thứ tự vẽ: thêm trước = vẽ TRÊN — số/oval add TRƯỚC nền.
// (v6.3: BỎ 2 ô góc trắng — ô góc xoay quanh tâm riêng nên lệch khỏi góc
//  lá thật, thò ra ngoài viền. Bản này khác: vị trí góc được tính sẵn
//  theo tilt cuối nên oval nằm đúng góc khi quạt dừng.)
function unoCard(riv, root, cx, cy, w, h, color, num, tilt, tag) {
  const parts = [];
  // Góc trên-trái (oval 40×52, tâm cách tâm lá (-24,-36) — mép lá 92×128
  // nên oval cách mép trái/trên 2px), quay offset theo tilt cuối.
  const dx = -24, dy = -36, c = Math.cos(tilt), s = Math.sin(tilt);
  const ox = cx + dx * c - dy * s, oy = cy + dx * s + dy * c;
  parts.push(...digit7(riv, root, ox, oy, num, INK, tag));
  parts.push(ell(riv, root, { name: 'UOval', x: ox, y: oy, w: 40, h: 52, color: CREAM, stroke: INK, strokeW: 1.5 }));
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
// v6 (anh Hưng yêu cầu 2026-11-21): BỎ fade mờ cuối vòng — trạng thái cuối
// giữ nguyên rồi vòng lặp bắt đầu lại ngay (cắt cứng). Hàm giữ nguyên chữ
// ký để 88 chỗ gọi không phải sửa; các part giữ key opacity riêng của nó.
function fadeEnds(riv, anim, parts, D) {
  // no-op: không ghi key opacity nào nữa.
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

// ---- 1. typhu FULL BÀN: NHÂN VẬT nhảy từng ô quanh TOÀN BỘ vòng 40 ô (480f = 8s).
// Bàn thật trong typhu/tiles.json: 40 ô (11×11, góc = Bắt đầu/Vào tù/Bãi đậu/
// Vào tù), đi ngược chiều kim đồng hồ từ ô Bắt đầu (góc dưới-phải). Ô thành
// phố có vạch màu nhóm thật (nâu/trời/hồng/cam/đỏ/vàng/lục/xanh đậm); ô đặc
// biệt: Khí vận (tím), Cơ hội (cam), Thuế (cát), Ga (xanh), Điện/Nước
// (ngọc), Vào tù (vạch), Bãi đậu (vàng), Vào tù (đỏ). Giữa bàn: xúc xắc
// lắc + 2 xu + 1 nhà + sao vàng nhấp. Nhân vật nhảy hết 40 ô rồi mờ về ô đầu.
{
  const { riv, ab, root } = newFile('typhu');
  const OX = 122.5, OY = 25, C = 155 / 11; // bàn vuông 155×155 (đủ chỗ cho nhân vật nhảy trên hàng trên mà không chạm mép)
  const cellC = (col, row) => [OX + (col + 0.5) * C, OY + (row + 0.5) * C];
  const stops = [];
  for (let j = 0; j < 10; j++) stops.push(cellC(10 - j, 10)); // hàng dưới: Bắt đầu -> trái
  for (let j = 0; j < 10; j++) stops.push(cellC(0, 9 - j));   // cột trái: dưới -> trên
  for (let j = 0; j < 10; j++) stops.push(cellC(1 + j, 0));   // hàng trên: trái -> phải
  for (let j = 0; j < 10; j++) stops.push(cellC(10, 1 + j));  // cột phải: trên -> dưới
  const TYPES = ['start', 'city', 'chest', 'city', 'tax', 'station', 'city', 'chance', 'city', 'city', 'jail', 'city', 'utility', 'city', 'city', 'station', 'city', 'chest', 'city', 'city', 'parking', 'city', 'chance', 'city', 'city', 'station', 'city', 'city', 'utility', 'city', 'gotojail', 'city', 'city', 'chest', 'city', 'station', 'chance', 'city', 'tax', 'city'];
  const GROUPC = { brown: hex('#9b6a3c'), sky: hex('#5cc8f5'), pink: hex('#e8579a'), orange: hex('#ff9a2e'), red: hex('#e53935'), yellow: hex('#f5c518'), green: hex('#1fa463'), navy: hex('#2f4fc9') };
  const GROUP = { 1: 'brown', 3: 'brown', 6: 'sky', 8: 'sky', 9: 'sky', 11: 'pink', 13: 'pink', 14: 'pink', 16: 'orange', 18: 'orange', 19: 'orange', 21: 'red', 23: 'red', 24: 'red', 26: 'yellow', 27: 'yellow', 29: 'yellow', 31: 'green', 32: 'green', 34: 'green', 37: 'navy', 39: 'navy' };
  const [cx0, cy0] = stops[0];
  // Nhân vật (vẽ trước = trên cùng): mũ, đầu, thân.
  const cap = poly(riv, root, { name: 'Cap', cx: cx0, cy: cy0 - 23, points: [[cx0, cy0 - 26], [cx0 - 6, cy0 - 20], [cx0 + 6, cy0 - 20]], color: RED, stroke: INK, strokeW: 1 });
  const head = ell(riv, root, { name: 'Head', x: cx0, y: cy0 - 17, w: 12, color: CREAM, stroke: INK, strokeW: 2 });
  const body = rect(riv, root, { name: 'Body', x: cx0, y: cy0 - 6, w: 15, h: 15, r: 5, color: TEAL, stroke: INK, strokeW: 2 });
  const shadow = ell(riv, root, { name: 'Shadow', x: cx0, y: cy0 + 8, w: 20, h: 6, color: SHADOW });
  // Giữa bàn: xúc xắc lắc + 2 xu + 1 nhà + sao vàng nhấp.
  // (chấm xúc xắc add TRƯỚC ô vuông — thêm trước = vẽ trên, ô add sau sẽ che mất chấm.)
  const dicePips = [[-7, -7], [7, -7], [0, 0], [-7, 7], [7, 7]].map(([dx, dy], i) =>
    ell(riv, root, { name: 'DP' + i, x: 182 + dx, y: 90 + dy, w: 4, color: INK }));
  const diceSq = rect(riv, root, { name: 'Dice', x: 182, y: 90, w: 26, h: 26, r: 5, color: WHITE, stroke: INK, strokeW: 2 });
  const coinA = coin(riv, root, 224, 86, 7);
  const coinB = coin(riv, root, 232, 95, 7);
  const hsRoof = poly(riv, root, { name: 'HsRoof', cx: 222, cy: 122, points: [[222, 116], [212, 126], [232, 126]], color: RED });
  const hs = rect(riv, root, { name: 'Hs', x: 222, y: 131, w: 14, h: 10, color: TEAL, stroke: INK, strokeW: 2 });
  const star = poly(riv, root, { name: 'Star', cx: 172, cy: 128, points: starPoints(172, 128, 8), color: GOLD, stroke: COIN_D, strokeW: 1 });
  // Vạch màu nhóm trên ô thành phố (mép trong của ô, hướng vào giữa bàn).
  const stripOf = (i, cx, cy) => {
    if (i < 10) return { x: cx, y: cy - C / 2 + 2, w: C - 2, h: 4 };
    if (i < 20) return { x: cx + C / 2 - 2, y: cy, w: 4, h: C - 2 };
    if (i < 30) return { x: cx, y: cy + C / 2 - 2, w: C - 2, h: 4 };
    return { x: cx - C / 2 + 2, y: cy, w: 4, h: C - 2 };
  };
  const strips = stops.map(([x, y], i) => {
    if (TYPES[i] !== 'city') return null;
    const s = stripOf(i, x, y);
    return rect(riv, root, { name: 'Strip' + i, x: s.x, y: s.y, w: s.w, h: s.h, color: GROUPC[GROUP[i]] });
  }).filter(Boolean);
  // Chi tiết ô đặc biệt (vẽ trước ô = trên cùng): sao/vạch/dấu.
  const decos = [];
  stops.forEach(([x, y], i) => {
    const t = TYPES[i];
    if (t === 'start') decos.push(poly(riv, root, { name: 'DStart', cx: x, cy: y, points: starPoints(x, y, 5), color: GOLD }));
    else if (t === 'jail') { for (const dx of [-4, 0, 4]) decos.push(rect(riv, root, { name: 'DJail' + dx, x: x + dx, y, w: 2, h: C - 4, color: INK })); }
    else if (t === 'parking') decos.push(poly(riv, root, { name: 'DPark', cx: x, cy: y, points: starPoints(x, y, 4), color: GOLD }));
    else if (t === 'gotojail') decos.push(ell(riv, root, { name: 'DGo', x, y, w: 7, color: CREAM }));
    else if (t === 'chest') decos.push(poly(riv, root, { name: 'DChest' + i, cx: x, cy: y, points: [[x, y - 4], [x + 3, y], [x, y + 4], [x - 3, y]], color: WHITE }));
    else if (t === 'chance') decos.push(poly(riv, root, { name: 'DChance' + i, cx: x, cy: y, points: [[x, y - 4], [x + 3, y], [x, y + 4], [x - 3, y]], color: INK }));
    else if (t === 'tax') decos.push(ell(riv, root, { name: 'DTax' + i, x, y, w: 5, color: GOLD }));
    else if (t === 'station') decos.push(rect(riv, root, { name: 'DSt' + i, x, y, w: 6, h: 6, color: WHITE }));
    else if (t === 'utility') decos.push(ell(riv, root, { name: 'DUt' + i, x, y, w: 6, color: WHITE }));
  });
  // 40 ô: màu nền theo loại.
  const baseOf = t => (t === 'start' || t === 'gotojail') ? RED : t === 'parking' ? YELLOW : t === 'chest' ? LAVENDER : t === 'chance' ? hex('#ff9a2e') : t === 'tax' ? SAND : t === 'station' ? BLUE : t === 'utility' ? TEAL : CREAM;
  const tiles = stops.map(([x, y], i) =>
    rect(riv, root, { name: 'Tile' + i, x, y, w: C, h: C, color: baseOf(TYPES[i]), stroke: INK, strokeW: 1 }));
  // Đế bàn cát (vẽ sau ô = ở dưới) + nền kem full-bleed.
  const plate = rect(riv, root, { name: 'Plate', x: 200, y: 102.5, w: 155, h: 155, r: 8, color: SAND });
  bg(riv, root, CREAM);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: 480, fps: 60, loop: 'loop' });
  const hop = hopFrames(stops, 12, 14, 480);
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
  // Xúc xắc lắc nhẹ liên tục; sao vàng nhấp.
  const wob = sineFrames(rangeFrames(0, 480, 15), 60, 0.12);
  for (const p of [diceSq, ...dicePips]) keys(riv, an, p.id, ROT, wob);
  const pulse = sineFrames(rangeFrames(0, 480, 12), 120, 0.25).map(([f, v]) => [f, 1 + v]);
  keys(riv, an, star.id, SX, pulse);
  keys(riv, an, star.id, SY, pulse);
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

// ---- 3. cangua FULL BÀN: QUÂN NGỰA nhảy từng ô dọc đường 56 ô (448f = 7,5s).
// Bàn thật trong cangua/js/scene3d.js: lưới 15×15, đường đua 56 ô
// (trackCell: SIDE0 14 ô × 4 phía xoay), 4 chuồng 6×6 ở 4 góc, dải về
// đích 5 ô mỗi phía, trung tâm 4 tam giác màu. Ô an toàn thật (SAFE:
// 0,7,14,21,28,35,42,49) màu ngọc; ô xuất quân 4 phía màu ghế; cổng
// dịch chuyển (PORTAL: 3,17,31,45) màu tím. Quân ngựa đỏ (ghế 0) nhảy
// hết 56 ô rồi mờ về ô đầu; sao vàng đích ở giữa bàn nhấp.
{
  const { riv, ab, root } = newFile('cangua');
  const OX = 120, OY = 24, U = 160 / 15; // bàn vuông 160×160
  const cc = (c, r) => [OX + (c + 0.5) * U, OY + (r + 0.5) * U];
  const SIDE0 = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [9, 5], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7]];
  const rot = ([c, r], k) => { for (let i = 0; i < k; i++) [c, r] = [14 - r, c]; return [c, r]; };
  const trackCell = i => rot(SIDE0[i % 14], Math.floor(i / 14) % 4);
  const stepCell = (seat, n) => rot([7, n], seat);
  const yardC = seat => rot([11.5, 2.5], seat);
  const slotCell = (seat, h) => rot([10.7 + (h % 2) * 1.5, 1.7 + Math.floor(h / 2) * 1.5], seat);
  const SEATC = [hex('#e53935'), hex('#1e88e5'), hex('#2fb350'), hex('#f4b400')];
  const SAFE = new Set([0, 7, 14, 21, 28, 35, 42, 49]);
  const PORTAL = new Set([3, 17, 31, 45]);
  const STARTS = { 0: 0, 14: 1, 28: 2, 42: 3 };
  const stops = [];
  for (let i = 0; i < 56; i++) stops.push(cc(...trackCell(i)));
  const [cx0, cy0] = stops[0];
  // Quân ngựa đỏ nhìn sang phải (vẽ trước = trên cùng).
  const ear = poly(riv, root, { name: 'Ear', cx: cx0 + 1, cy: cy0 - 20, points: [[cx0 + 1, cy0 - 24], [cx0 - 2, cy0 - 17], [cx0 + 5, cy0 - 17]], color: RED, stroke: INK, strokeW: 1 });
  const mane = poly(riv, root, { name: 'Mane', cx: cx0 - 1, cy: cy0 - 17, points: [[cx0 - 1, cy0 - 22], [cx0 + 3, cy0 - 13], [cx0 - 4, cy0 - 12]], color: INK });
  const muzzle = ell(riv, root, { name: 'Muzzle', x: cx0 + 12, y: cy0 - 11, w: 7, h: 5, color: CREAM, stroke: INK, strokeW: 1 });
  const head = ell(riv, root, { name: 'Head', x: cx0 + 6, y: cy0 - 14, w: 14, h: 11, color: RED, stroke: INK, strokeW: 2 });
  const body = rect(riv, root, { name: 'Body', x: cx0, y: cy0 - 3, w: 17, h: 18, r: 6, color: RED, stroke: INK, strokeW: 2 });
  const base = ell(riv, root, { name: 'Base', x: cx0, y: cy0 + 8, w: 26, h: 8, color: RED, stroke: INK, strokeW: 2 });
  const shadow = ell(riv, root, { name: 'Shadow', x: cx0, y: cy0 + 10, w: 24, h: 6, color: SHADOW });
  // Sao vàng đích ở giữa bàn (nhấp).
  const star = poly(riv, root, { name: 'Star', cx: 200, cy: 100, points: starPoints(200, 100, 7), color: GOLD, stroke: COIN_D, strokeW: 1 });
  // Trung tâm: 4 tam giác màu (đỏ trên, xanh phải, lục dưới, vàng trái).
  const tris = [
    { pts: [[200, 100], [216, 84], [184, 84]], color: SEATC[0] },
    { pts: [[200, 100], [216, 116], [216, 84]], color: SEATC[1] },
    { pts: [[200, 100], [184, 116], [216, 116]], color: SEATC[2] },
    { pts: [[200, 100], [184, 84], [184, 116]], color: SEATC[3] },
  ].map((t, i) => poly(riv, root, { name: 'Tri' + i, cx: 200, cy: 100, points: t.pts, color: t.color }));
  // Chuồng: 4 ô vuông 6×6 màu ghế + 4 chấm ngựa chờ (chấm add trước = trên).
  const yards = [];
  for (let k = 0; k < 4; k++) {
    const [yc, yr] = yardC(k);
    for (let h = 0; h < 4; h++) {
      const [sc, sr] = slotCell(k, h);
      const [sx, sy] = cc(sc, sr);
      yards.push(ell(riv, root, { name: 'Slot' + k + h, x: sx, y: sy, w: 8, color: CREAM }));
    }
    const [yx, yy] = cc(yc, yr);
    yards.push(rect(riv, root, { name: 'Yard' + k, x: yx, y: yy, w: 6 * U, h: 6 * U, r: 4, color: SEATC[k], stroke: INK, strokeW: 2 }));
  }
  // Dải về đích 5 ô mỗi phía (màu ghế).
  const homes = [];
  for (let k = 0; k < 4; k++) for (let n = 1; n <= 5; n++) {
    const [hc, hr] = stepCell(k, n);
    const [hx, hy] = cc(hc, hr);
    homes.push(rect(riv, root, { name: 'Home' + k + n, x: hx, y: hy, w: U * 0.92, h: U * 0.92, color: SEATC[k], stroke: INK, strokeW: 1 }));
  }
  // 56 ô đường đua: xuất quân màu ghế, an toàn ngọc, cổng tím, còn lại kem.
  const tiles = stops.map(([x, y], i) => {
    const color = STARTS[i] !== undefined ? SEATC[STARTS[i]] : SAFE.has(i) ? TEAL : PORTAL.has(i) ? LAVENDER : CREAM;
    return rect(riv, root, { name: 'Tile' + i, x, y, w: U * 0.92, h: U * 0.92, color, stroke: INK, strokeW: 1 });
  });
  // Đế bàn kem (vẽ sau ô = ở dưới) + nền cát full-bleed.
  const plate = rect(riv, root, { name: 'Plate', x: 200, y: 104, w: 160, h: 160, r: 8, color: CREAM, stroke: INK, strokeW: 3 });
  bg(riv, root, SAND);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: 448, fps: 60, loop: 'loop' });
  const hop = hopFrames(stops, 8, 10, 448, 10);
  const horse = [ear, mane, muzzle, head, body, base];
  shift(riv, an, horse, hop.dxF, hop.dyF);
  for (const p of horse) {
    keys(riv, an, p.id, SY, hop.squashF);
    keys(riv, an, p.id, OPACITY, hop.opF, 'linear');
  }
  keys(riv, an, shadow.id, X, hop.shXF);
  keys(riv, an, shadow.id, Y, hop.shYF);
  keys(riv, an, shadow.id, SX, hop.shSXF);
  keys(riv, an, shadow.id, OPACITY, hop.opF, 'linear');
  // Sao vàng đích nhấp.
  const pulse = sineFrames(rangeFrames(0, 448, 12), 120, 0.3).map(([f, v]) => [f, 1 + v]);
  keys(riv, an, star.id, SX, pulse);
  keys(riv, an, star.id, SY, pulse);
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
  // v6: lạc đà GIỮ NGUYÊN ở đích tới hết vòng rồi cắt cứng về vạch xuất
  // phát (không mờ dần rồi hiện lại nữa).
  const opF = [[0, 1], [240, 1]];
  // Vàng bước ở [0,30],[60,90],[120,150],[180,210]; tím bước ở
  // [30,60],[90,120],[150,180],[210,240] — xen kẽ theo lượt; mỗi bước +10.
  const ySteps = [[0, 30], [60, 90], [120, 150], [180, 210]];
  const vSteps = [[30, 60], [90, 120], [150, 180], [210, 240]];
  const yDX = [[0, 0], [30, 10], [60, 10], [90, 20], [120, 20], [150, 30], [180, 30], [210, 40], [228, 40], [239, 40], [240, 0]];
  const yDY = [[0, 0], [15, -3], [30, 0], [75, -3], [90, 0], [135, -3], [150, 0], [195, -3], [210, 0], [240, 0]];
  const vDX = [[0, 0], [30, 0], [60, 10], [90, 10], [120, 20], [150, 20], [180, 30], [210, 30], [228, 30], [239, 30], [240, 0]];
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

// ---- 5. uno: XÒE QUẠT 5 LÁ TO (180f = 3s).
// 5 lá UNO 92×128 bay lần lượt từ dưới khung lên, đáp XÒE QUẠT như tay bài
// thật (nghiêng dần -0.30 -> +0.30, chồng lên nhau), cụm lá chiếm ~84% bề
// rộng khung. Lá Đen 4 màu ở phải cùng. Nền ĐỎ (màu thương hiệu UNO).
// (v6.3: lá cũ 48×66 chụm giữa khung chỉ ~1/4 bề rộng — anh Hưng báo vẫn
//  lỗi; phóng to gần gấp đôi + xòe quạt rõ, bỏ 2 lá tĩnh dưới chồng bài.)
// (patch -133: số góc — oval kem + số 7 đoạn ở góc trên-trái mỗi lá;
//  oval giữa lá cũ bị lá kề che mất phần phải thành hình chữ "C".)
{
  const { riv, ab, root } = newFile('uno');
  const D = 180;
  const CW = 92, CH = 128; // cỡ lá mới (cũ 48×66)
  const Y0 = 280; // vị trí xuất phát: dưới khung (ngoài artboard)
  // Thứ tự tạo = thứ tự vẽ (thêm trước = vẽ TRÊN): lá phải tạo trước để
  // nằm trên lá trái kề nó — quạt xòe trái -> phải.
  // Lá Đen 4 màu (wild) — 4 ô màu add TRƯỚC nền đen. Tạo ở vị trí xuất
  // phát (305, Y0), bay lên vị trí quạt (305, 108) như các lá khác.
  const wildParts = [];
  wildParts.push(rect(riv, root, { name: 'WQ1', x: 305 - 11, y: Y0 - 11, w: 22, h: 22, color: RED }));
  wildParts.push(rect(riv, root, { name: 'WQ2', x: 305 + 11, y: Y0 - 11, w: 22, h: 22, color: YELLOW }));
  wildParts.push(rect(riv, root, { name: 'WQ3', x: 305 - 11, y: Y0 + 11, w: 22, h: 22, color: TEAL }));
  wildParts.push(rect(riv, root, { name: 'WQ4', x: 305 + 11, y: Y0 + 11, w: 22, h: 22, color: BLUE }));
  wildParts.push(rect(riv, root, { name: 'WBg', x: 305, y: Y0, w: CW, h: CH, r: 12, color: INK, stroke: INK, strokeW: 2 }));
  const c5 = wildParts;
  // Số góc mỗi lá (đỏ 7, vàng 3, ngọc 9, xanh 2) — lá Đen giữ 4 ô màu ở giữa.
  const c4 = unoCard(riv, root, 253, Y0, CW, CH, BLUE, 2, 0.15, 'U4');
  const c3 = unoCard(riv, root, 200, Y0, CW, CH, TEAL, 9, 0, 'U3');
  const c2 = unoCard(riv, root, 147, Y0, CW, CH, YELLOW, 3, -0.15, 'U2');
  const c1 = unoCard(riv, root, 95, Y0, CW, CH, RED, 7, -0.30, 'U1');
  // Nền ĐỎ (màu thương hiệu UNO) — nỉ xanh FELT cũ làm UNO lẫn với mọi game
  // bài Việt khác, anh Hưng báo "màu bị lỗi". Lá đỏ vẫn đọc rõ nhờ viền mực
  // + oval kem của unoCard.
  bg(riv, root, RED);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Mỗi lá bay lên trong 25f (cách nhau 20f): từ dưới khung lên vị trí quạt,
  // xoay dần tới góc quạt. Quạt đủ 5 lá từ 105f tới hết vòng.
  const flyFan = (parts, ty, t0, tilt) => {
    const mid = t0 + 12, end = t0 + 25;
    shift(riv, an, parts, [[t0, 0], [mid, 0], [end, 0]], [[t0, 0], [mid, -105], [end, ty - Y0]]);
    for (const p of parts) keys(riv, an, p.id, ROT, [[t0, 0], [end, tilt], [D, tilt]]);
  };
  flyFan(c1, 108, 0, -0.30);
  flyFan(c2, 97, 20, -0.15);
  flyFan(c3, 92, 40, 0);
  flyFan(c4, 97, 60, 0.15);
  flyFan(c5, 108, 80, 0.30);
  fadeEnds(riv, an, [...c1, ...c2, ...c3, ...c4, ...c5], D);
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
  // Nền hoàng hôn cam — cát nhạt SAND cũ nhìn bạc màu như tile lỗi (cùng lỗi
  // như UNO). Xương rồng xanh + cao bồi ngọc + lá BANG! đỏ vẫn nổi trên nền cam.
  bg(riv, root, SUNSET);
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
  // Mã nhảy chữ L đi + về (4 cú nhảy × 40f); v6: mã giữ nguyên ở ô cuối
  // tới hết vòng rồi cắt cứng về ô đầu (không mờ dần nữa).
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
// ---- 21. tala: BỐC – HẠ PHỎM (180f = 3s).
// Bốc 1 lá từ chồng bài xuống tay, hạ phỏm 7-8-9♥ (vòng vàng + sao).
{
  const { riv, ab, root } = newFile('tala');
  const D = 180;
  // Chồng bài (2 lá úp) góc phải trên.
  const deck2 = card(riv, root, 352, 42, 40, 54, { back: BLUE, suit: 'spade', suitColor: INK, pips: 3 });
  const deck1 = card(riv, root, 348, 46, 40, 54, { back: BLUE, suit: 'spade', suitColor: INK, pips: 3 });
  // Bài rác góc trái trên (1 lá ngửa).
  const trash = card(riv, root, 62, 58, 40, 54, { back: RED, suit: 'diamond', suitColor: RED, pips: 3 });
  // Tay bài: 7♥, 8♥ + Q♠; lá bốc 9♥ bay từ chồng bài xuống.
  const c7 = card(riv, root, 130, 152, 44, 60, { back: RED, suit: 'heart', suitColor: RED, pips: 3 });
  const c8 = card(riv, root, 182, 152, 44, 60, { back: RED, suit: 'heart', suitColor: RED, pips: 3 });
  const cQ = card(riv, root, 282, 152, 44, 60, { back: RED, suit: 'crown', suitColor: INK });
  const c9 = card(riv, root, 350, 44, 44, 60, { back: BLUE, suit: 'heart', suitColor: RED, pips: 3 });
  // Vòng vàng quanh phỏm (donut: ruột nỉ add trước = trên cùng) + sao.
  const ringIn = ell(riv, root, { name: 'RingIn', x: 181, y: 140, w: 138, h: 72, color: FELT });
  const ring = ell(riv, root, { name: 'Ring', x: 181, y: 140, w: 152, h: 86, color: GOLD, stroke: INK, strokeW: 2 });
  const star = poly(riv, root, { name: 'Star', cx: 181, cy: 82, points: starPoints(181, 82, 15), color: GOLD, stroke: INK, strokeW: 2 });
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Bài trên tay + bài rác là bài NGỬA; lá bốc lật lên khi đáp (30-48).
  faceUp(riv, an, c7, D); faceUp(riv, an, c8, D); faceUp(riv, an, cQ, D); faceUp(riv, an, trash, D);
  flipCard(riv, an, c9, 30, 40, 48, D);
  // Lá bốc bay từ chồng bài xuống tay (0-45).
  shift(riv, an, c9.all, [[0, 0], [45, -118], [D, -118]], [[0, 0], [45, 108], [D, 108]]);
  // Phỏm 7-8-9 chụm lại + nhấc lên (50-80).
  shift(riv, an, c7.all, [[0, 0], [50, 0], [80, 10], [D, 10]], [[0, 0], [50, 0], [80, -12], [D, -12]]);
  shift(riv, an, c8.all, null, [[0, 0], [50, 0], [80, -12], [D, -12]]);
  shift(riv, an, c9.all, [[0, 0], [45, -118], [80, -128], [D, -128]], [[0, 0], [45, 108], [80, 96], [D, 96]]);
  // Vòng vàng bật lên (80-105) + sao bật (105-125).
  for (const p of [ringIn, ring]) {
    keys(riv, an, p.id, SX, [[0, 0], [80, 0], [92, 1.15], [105, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [80, 0], [92, 1.15], [105, 1], [D, 1]]);
  }
  keys(riv, an, star.id, SX, [[0, 0], [105, 0], [116, 1.2], [125, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [105, 0], [116, 1.2], [125, 1], [D, 1]]);
  fadeEnds(riv, an, [...deck1.all, ...deck2.all, ...trash.all, ...c7.all, ...c8.all, ...c9.all, ...cQ.all, ringIn, ring, star], D);
  save('tala', riv);
}

// ---- 22. cholon: GOM TIỆM LIỀN NHAU – THU TIỀN (180f = 3s).
// 1 khu đất 5×3 lô; 3 tiệm cùng loại dựng liền nhau ở hàng giữa thành
// chuỗi (vòng vàng) rồi xu chảy về đống tiền.
{
  const { riv, ab, root } = newFile('cholon');
  const D = 180;
  // Thứ tự vẽ: thêm trước = vẽ TRÊN — tiệm + vòng vàng phải ở TRÊN các
  // lô (tiệm nằm trong lô, vòng bao quanh chuỗi); lô ở trên khung khu đất.
  // (Đợt trước tạo lô trước nên lô kem che mất tiệm + vòng.)
  // 3 xu bay từ chuỗi về đống tiền.
  const flyCoins = [coin(riv, root, 200, 100, 7), coin(riv, root, 200, 100, 7), coin(riv, root, 200, 100, 7)];
  const fly = flyCoins.flat();
  // 3 tiệm đỏ hàng giữa (mái vàng) — dựng lần lượt.
  const shops = [];
  for (let i = 0; i < 3; i++) {
    const cx = 152 + i * 48, cy = 100;
    const roof = poly(riv, root, { name: 'Roof' + i, cx, cy: cy - 8, points: [[cx - 20, cy - 8], [cx + 20, cy - 8], [cx, cy - 22]], color: GOLD, stroke: INK, strokeW: 1 });
    const body = rect(riv, root, { name: 'Shop' + i, x: cx, y: cy + 6, w: 36, h: 28, r: 3, color: RED, stroke: INK, strokeW: 2 });
    shops.push([roof, body]);
  }
  // Vòng vàng quanh chuỗi (donut: ruột kem add trước = trên cùng).
  const ringIn = ell(riv, root, { name: 'RingIn', x: 200, y: 100, w: 158, h: 58, color: CREAM });
  const ring = ell(riv, root, { name: 'Ring', x: 200, y: 100, w: 170, h: 70, color: GOLD, stroke: INK, strokeW: 2 });
  // 15 lô đất (44×44, cách 4px), vài lô màu khác cho có chiều sâu.
  const lots = [];
  const lotCol = (c, r) => (r === 0 && c === 4) || (r === 2 && c === 0) ? TEAL : (r === 0 && c === 0) || (r === 2 && c === 4) ? LAVENDER : CREAM;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++)
    lots.push(rect(riv, root, { name: 'Lot' + r + c, x: 104 + c * 48, y: 52 + r * 48, w: 44, h: 44, r: 4, color: lotCol(c, r), stroke: INK, strokeW: 2 }));
  // Khung khu đất + nền cát.
  const frame = rect(riv, root, { name: 'Frame', x: 200, y: 100, w: 260, h: 164, r: 10, color: CREAM, stroke: INK, strokeW: 3 });
  // Đống tiền góc phải dưới + sao.
  const pile = [coin(riv, root, 330, 168, 7), coin(riv, root, 346, 168, 7), coin(riv, root, 338, 156, 7)].flat();
  const star = poly(riv, root, { name: 'Star', cx: 338, cy: 118, points: starPoints(338, 118, 14), color: GOLD, stroke: INK, strokeW: 2 });
  bg(riv, root, SAND);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Tiệm dựng lần lượt NGAY TỪ ĐẦU (0 / 15 / 30) — chuyển động đầu vòng
  // phải thấy rõ (đợt trước để 20/40/60 nên mẫu pixel 800ms gần như đứng yên).
  shops.forEach(([roof, body], i) => {
    const t = i * 15;
    for (const p of [roof, body]) {
      keys(riv, an, p.id, SX, [[0, 0], [t, 0], [t + 10, 1.15], [t + 16, 1], [D, 1]]);
      keys(riv, an, p.id, SY, [[0, 0], [t, 0], [t + 10, 1.15], [t + 16, 1], [D, 1]]);
    }
  });
  // Vòng vàng bật (45-65).
  for (const p of [ringIn, ring]) {
    keys(riv, an, p.id, SX, [[0, 0], [45, 0], [57, 1.1], [65, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [45, 0], [57, 1.1], [65, 1], [D, 1]]);
  }
  // 3 xu bay về đống tiền (65-105, lệch nhau 10f) — bay theo CẶP (mỗi xu 2 part).
  flyCoins.forEach((parts, i) => {
    const t0 = 65 + i * 10;
    shift(riv, an, parts, [[0, 0], [t0, 0], [t0 + 20, [130, 146, 138][i]], [D, [130, 146, 138][i]]], [[0, 0], [t0, 0], [t0 + 20, [68, 68, 56][i]], [D, [68, 68, 56][i]]]);
  });
  // Sao bật trên đống tiền (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [122, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [122, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [...lots, ...shops.flat(), ringIn, ring, ...pile, ...fly, star, frame], D);
  save('cholon', riv);
}

// ---- 23. tusac: KHẠP 4 LÁ TƯỚNG 4 MÀU (180f = 3s).
// 4 lá Tướng (vương miện) 4 màu lật lên lần lượt rồi nhấc lên cùng nhau,
// sao vàng bật lên.
{
  const { riv, ab, root } = newFile('tusac');
  const D = 180;
  const cols = [RED, TEAL, GOLD, INK];
  const cards = cols.map((sc, i) => card(riv, root, 110 + i * 60, 100, 44, 60, { back: BLUE, suit: 'crown', suitColor: sc }));
  const star = poly(riv, root, { name: 'Star', cx: 200, cy: 42, points: starPoints(200, 42, 15), color: GOLD, stroke: INK, strokeW: 2 });
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Lật lần lượt (mỗi lá 30f).
  cards.forEach((c, i) => flipCard(riv, an, c, i * 30, i * 30 + 15, i * 30 + 30, D));
  // Cả 4 lá nhấc lên (120-140) + sao bật (130-150).
  for (const c of cards) shift(riv, an, c.all, null, [[0, 0], [120, 0], [140, -10], [D, -10]]);
  keys(riv, an, star.id, SX, [[0, 0], [130, 0], [142, 1.2], [150, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [130, 0], [142, 1.2], [150, 1], [D, 1]]);
  fadeEnds(riv, an, [...cards.flatMap(c => c.all), star], D);
  save('tusac', riv);
}

// ---- 24. bantau: BẮN TÀU — TRÚNG NỔ, TRƯỢT BỌT NƯỚC (180f = 3s).
// Lưới 10×10; tâm ngắm bay tới ô có tàu -> nổ + lộ tàu; rồi bay tới ô
// trống -> bọt nước + chấm trắng.
{
  const { riv, ab, root } = newFile('bantau');
  const D = 180;
  const X0 = 125, Y0 = 25, CELL = 15; // lưới 150×150, căn giữa (125..275)
  // Thứ tự vẽ: thêm trước = vẽ TRÊN — tâm ngắm + vụ nổ + dấu X phải ở
  // trên tàu; tàu ở trên bọt nước/lưới; lưới ở trên tấm nền.
  // Tâm ngắm (chữ thập đỏ, đủ to để thấy rõ khi di chuyển).
  const chH = rect(riv, root, { name: 'ChH', x: 285, y: 60, w: 34, h: 4, color: RED });
  const chV = rect(riv, root, { name: 'ChV', x: 285, y: 60, w: 4, h: 34, color: RED });
  // Vụ nổ ở ô trúng (192,92): sao cam + 3 cụm khói.
  const boom = poly(riv, root, { name: 'Boom', cx: 192, cy: 92, points: starPoints(192, 92, 15), color: GOLD, stroke: RED, strokeW: 2 });
  const sm1 = ell(riv, root, { name: 'Sm1', x: 182, y: 84, w: 10, color: CREAM });
  const sm2 = ell(riv, root, { name: 'Sm2', x: 202, y: 82, w: 12, color: CREAM });
  const sm3 = ell(riv, root, { name: 'Sm3', x: 192, y: 78, w: 9, color: CREAM });
  // Dấu X đỏ ở ô trúng.
  const hx1 = poly(riv, root, { name: 'HX1', cx: 192, cy: 92, points: rotRectPoints(192, 92, 18, 4, Math.PI / 4), color: RED });
  const hx2 = poly(riv, root, { name: 'HX2', cx: 192, cy: 92, points: rotRectPoints(192, 92, 18, 4, -Math.PI / 4), color: RED });
  // Tàu 3 ô ngang (hàng 4, cột 3-5) — ẩn cho tới khi bị bắn trúng.
  const cab = rect(riv, root, { name: 'Cab', x: 192, y: 88, w: 14, h: 8, r: 2, color: CREAM, stroke: INK, strokeW: 1 });
  const hull = rect(riv, root, { name: 'Hull', x: 192, y: 92, w: 45, h: 13, r: 4, color: INK });
  // Bọt nước ở ô trượt (267,137): 3 giọt trắng + chấm trắng.
  const dr1 = ell(riv, root, { name: 'Dr1', x: 260, y: 130, w: 8, color: WHITE });
  const dr2 = ell(riv, root, { name: 'Dr2', x: 274, y: 128, w: 9, color: WHITE });
  const dr3 = ell(riv, root, { name: 'Dr3', x: 267, y: 124, w: 7, color: WHITE });
  const miss = ell(riv, root, { name: 'Miss', x: 267, y: 137, w: 11, color: WHITE, stroke: INK, strokeW: 2 });
  // Lưới 10×10: tấm nền nhạt + 22 vạch kẻ.
  const lines = [];
  for (let i = 0; i <= 10; i++) {
    lines.push(rect(riv, root, { name: 'VL' + i, x: X0 + i * CELL, y: 100, w: 2, h: 150, color: WHITE }));
    lines.push(rect(riv, root, { name: 'HL' + i, x: 200, y: Y0 + i * CELL, w: 150, h: 2, color: WHITE }));
  }
  const panel = rect(riv, root, { name: 'Panel', x: 200, y: 100, w: 150, h: 150, color: hex('#8FB8DC'), stroke: INK, strokeW: 2 });
  bg(riv, root, BLUE);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Tàu ẩn (opacity 0) cho tới khi bị bắn trúng (40-55), mờ dần cuối vòng
  // (168-180) để che cú nhảy reset — KHÔNG cho vào fadeEnds (fadeEnds ghi
  // đè key opacity riêng, xem ghi chú ở cuối block).
  for (const p of [cab, hull]) keys(riv, an, p.id, OPACITY, [[0, 0], [40, 0], [55, 1], [D - 12, 1], [D, 0]], 'linear');
  // Tâm ngắm: ô tàu (0-40) -> đứng yên -> ô trống (70-110).
  shift(riv, an, [chH, chV], [[0, 0], [40, -93], [70, -93], [110, -18], [D, -18]], [[0, 0], [40, 32], [70, 32], [110, 77], [D, 77]]);
  // Vụ nổ bật lên (40-55) rồi mờ dần (55-90).
  for (const p of [boom, sm1, sm2, sm3]) {
    keys(riv, an, p.id, SX, [[0, 0], [40, 0], [50, 1.2], [55, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [40, 0], [50, 1.2], [55, 1], [D, 1]]);
    keys(riv, an, p.id, OPACITY, [[0, 0], [40, 0], [45, 1], [70, 1], [90, 0], [D, 0]], 'linear');
  }
  // Dấu X đỏ ở ô trúng (70-85).
  for (const p of [hx1, hx2]) {
    keys(riv, an, p.id, SX, [[0, 0], [70, 0], [80, 1.15], [85, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [70, 0], [80, 1.15], [85, 1], [D, 1]]);
  }
  // Bọt nước bật lên (110-125) rồi mờ (125-155); chấm trắng hiện (140-150).
  for (const p of [dr1, dr2, dr3]) {
    keys(riv, an, p.id, SX, [[0, 0], [110, 0], [120, 1.15], [125, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [110, 0], [120, 1.15], [125, 1], [D, 1]]);
    keys(riv, an, p.id, OPACITY, [[0, 0], [110, 0], [115, 1], [135, 1], [155, 0], [D, 0]], 'linear');
  }
  keys(riv, an, miss.id, SX, [[0, 0], [140, 0], [148, 1.15], [150, 1], [D, 1]]);
  keys(riv, an, miss.id, SY, [[0, 0], [140, 0], [148, 1.15], [150, 1], [D, 1]]);
  // fadeEnds: CHỈ cho các part KHÔNG có key opacity riêng. Các part vụ nổ
  // (boom/sm), bọt nước (dr) và tàu (cab/hull) đã có key opacity riêng
  // (mờ vào/ra theo nhịp của chúng, về 0 ở cuối vòng) — cho chúng vào
  // fadeEnds sẽ ghi đè key opacity riêng (key sau thắng) khiến vụ nổ/bọt
  // nước không bao giờ tắt và tàu không mờ cuối vòng.
  fadeEnds(riv, an, [hx1, hx2, miss, chH, chV, ...lines, panel], D);
  save('bantau', riv);
}

// ---- 25. oanquan: RẢI SỎI – ĂN QUAN (180f = 3s).
// Bốc 5 sỏi ở 1 ô, rải từng viên sang các ô kế tiếp; viên cuối rơi vào
// ô trống -> ăn 2 sỏi ở ô kế, sỏi bay về ô Quan (ô Quan chớp + sao).
{
  const { riv, ab, root } = newFile('oanquan');
  const D = 180;
  const CX = [90, 135, 180, 225, 270]; // 5 ô dân mỗi hàng
  // Sỏi PHẢI tạo TRƯỚC các ô (thêm trước = vẽ TRÊN; tạo sau ô thì sỏi
  // bị ô kem che mất — lỗi đã gặp ở Lô Tô đợt 3).
  // Sỏi tĩnh vài ô cho có chiều sâu (ô đích bottom-4 để TRỐNG).
  const statics = [];
  const putStones = (x, y, n, dx) => {
    for (let i = 0; i < n; i++)
      statics.push(ell(riv, root, { name: 'St' + x + y + i, x: x + dx[i][0], y: y + dx[i][1], w: 10, color: INK }));
  };
  putStones(90, 65, 2, [[-6, -3], [6, 3]]);
  putStones(225, 65, 2, [[-6, 3], [6, -3]]);
  putStones(135, 135, 2, [[-6, -3], [6, 3]]);
  putStones(180, 135, 2, [[-6, 3], [6, -3]]); // 2 sỏi ở ô kế viên cuối -> bị ăn
  // 5 sỏi rải: từ ô top-2 (135,65) sang top-3, top-4, top-5, bottom-5, bottom-4.
  const sowTargets = [[180, 65], [225, 65], [270, 65], [270, 135], [225, 135]];
  const sow = [];
  const offs = [[-8, -4], [8, -4], [-8, 4], [8, 4], [0, 0]];
  for (let i = 0; i < 5; i++)
    sow.push(ell(riv, root, { name: 'Sow' + i, x: 135 + offs[i][0], y: 65 + offs[i][1], w: 10, color: INK }));
  // Sỏi Quan đỏ trong ô Quan (tạo trước vòng Quan).
  const qStone = ell(riv, root, { name: 'QStone', x: 362, y: 100, w: 16, color: RED, stroke: INK, strokeW: 2 });
  const qStoneL = ell(riv, root, { name: 'QStoneL', x: 38, y: 100, w: 16, color: RED, stroke: INK, strokeW: 2 });
  // Bàn gỗ + 10 ô dân + 2 ô Quan lớn 2 đầu.
  const cells = [];
  for (const y of [65, 135]) for (const x of CX)
    cells.push(ell(riv, root, { name: 'Cell' + x + y, x, y, w: 36, color: CREAM, stroke: INK, strokeW: 2 }));
  const qL = ell(riv, root, { name: 'QL', x: 38, y: 100, w: 48, color: GOLD, stroke: INK, strokeW: 2 });
  const qR = ell(riv, root, { name: 'QR', x: 362, y: 100, w: 48, color: GOLD, stroke: INK, strokeW: 2 });
  // Bàn tay (chấm ngọc) bốc sỏi.
  const hand = ell(riv, root, { name: 'Hand', x: 135, y: 40, w: 22, color: TEAL, stroke: INK, strokeW: 2 });
  // Sao vàng trên ô Quan phải.
  const star = poly(riv, root, { name: 'Star', cx: 362, cy: 52, points: starPoints(362, 52, 14), color: GOLD, stroke: INK, strokeW: 2 });
  const board = rect(riv, root, { name: 'Board', x: 200, y: 100, w: 370, h: 120, r: 18, color: SAND2, stroke: INK, strokeW: 3 });
  bg(riv, root, SAND);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Tay bốc lên (0-10) rồi mờ đi (10-25); mờ vào đầu vòng (0-6) để che cú
  // nhảy reset — KHÔNG cho tay vào fadeEnds (fadeEnds ghi đè key opacity
  // riêng khiến tay hiện suốt vòng).
  shift(riv, an, [hand], null, [[0, 0], [10, -6], [D, -6]]);
  keys(riv, an, hand.id, OPACITY, [[0, 0], [6, 1], [10, 1], [25, 0], [D, 0]], 'linear');
  // Rải từng viên NGAY TỪ ĐẦU (mỗi viên 22f, lệch nhau 15f) — chuyển động
  // đầu vòng phải thấy rõ (đợt trước viên đầu nhảy từ frame 20 nên mẫu
  // pixel 800ms gần như đứng yên).
  sow.forEach((s, i) => {
    const t0 = i * 15, t1 = t0 + 22;
    const [tx, ty] = sowTargets[i];
    const dx = tx - s.x, dy = ty - s.y;
    shift(riv, an, [s], [[0, 0], [t0, 0], [t0 + 11, dx / 2], [t1, dx], [D, dx]], [[0, 0], [t0, 0], [t0 + 11, dy / 2 - 14], [t1, dy], [D, dy]]);
  });
  // Viên cuối đáp xong (82): ăn 2 sỏi ở ô kế (bottom-3) bay về ô Quan (85-115).
  const eaten = statics.slice(6, 8); // 2 sỏi ở (180,135)
  for (const s of eaten)
    shift(riv, an, [s], [[0, 0], [85, 0], [115, 362 - s.x], [D, 362 - s.x]], [[0, 0], [85, 0], [115, 100 - s.y], [D, 100 - s.y]]);
  // Ô Quan phải chớp (85-115) + sao bật (90-110).
  keys(riv, an, qR.id, SX, [[0, 1], [85, 1], [97, 1.12], [107, 1], [115, 1.12], [D, 1]]);
  keys(riv, an, qR.id, SY, [[0, 1], [85, 1], [97, 1.12], [107, 1], [115, 1.12], [D, 1]]);
  keys(riv, an, star.id, SX, [[0, 0], [90, 0], [101, 1.2], [110, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [90, 0], [101, 1.2], [110, 1], [D, 1]]);
  fadeEnds(riv, an, [...cells, qL, qR, qStone, qStoneL, ...statics, ...sow, star, board], D);
  save('oanquan', riv);
}

// ---- 26. caro: X/O ĐÁNH LẦN LƯỢT – 5 THẮNG, GẠCH ĐƯỜNG WIN (180f = 3s).
// Đúng ví dụ của anh Hưng: X đỏ và O ngọc đánh xen kẽ trên lưới 5×5,
// X đủ 5 ở hàng giữa -> vạch đỏ gạch ngang + sao vàng.
{
  const { riv, ab, root } = newFile('caro');
  const D = 180;
  const OX = 120, OY = 20, CELL = 32;
  const cc = (c, r) => [OX + 16 + c * CELL, OY + 16 + r * CELL];
  // Lưới 5×5: 6 vạch dọc + 6 vạch ngang.
  const lines = [];
  for (let i = 0; i <= 5; i++) {
    lines.push(rect(riv, root, { name: 'VL' + i, x: OX + i * CELL, y: 100, w: 2, h: 160, color: INK }));
    lines.push(rect(riv, root, { name: 'HL' + i, x: 200, y: OY + i * CELL, w: 160, h: 2, color: INK }));
  }
  // X = 2 vạch chéo; O = donut (ruột kem add trước = trên cùng).
  const mkX = (cx, cy) => [
    poly(riv, root, { name: 'X1', cx, cy, points: rotRectPoints(cx, cy, 26, 6, Math.PI / 4), color: RED }),
    poly(riv, root, { name: 'X2', cx, cy, points: rotRectPoints(cx, cy, 26, 6, -Math.PI / 4), color: RED }),
  ];
  const mkO = (cx, cy) => {
    const inner = ell(riv, root, { name: 'OIn', x: cx, y: cy, w: 15, color: CREAM });
    const outer = ell(riv, root, { name: 'OOut', x: cx, y: cy, w: 26, color: TEAL });
    return [inner, outer];
  };
  const seq = [
    ['X', 0, 2, 0], ['O', 0, 0, 20], ['X', 1, 2, 40], ['O', 2, 0, 60],
    ['X', 2, 2, 80], ['O', 4, 1, 100], ['X', 3, 2, 120], ['O', 1, 3, 140], ['X', 4, 2, 155],
  ];
  const marks = [];
  for (const [k, c, r, t] of seq) {
    const [cx, cy] = cc(c, r);
    marks.push({ parts: k === 'X' ? mkX(cx, cy) : mkO(cx, cy), t });
  }
  // Vạch thắng ngang hàng giữa (y=100 = tâm hàng r=2) + sao.
  const win = rect(riv, root, { name: 'Win', x: 200, y: 100, w: 150, h: 6, r: 3, color: RED });
  const star = poly(riv, root, { name: 'Star', cx: 300, cy: 100, points: starPoints(300, 100, 13), color: GOLD, stroke: INK, strokeW: 2 });
  bg(riv, root, CREAM);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Từng dấu bật lên (scale 0 -> 1.15 -> 1 trong 14f).
  for (const m of marks) {
    for (const p of m.parts) {
      keys(riv, an, p.id, SX, [[0, 0], [m.t, 0], [m.t + 8, 1.15], [m.t + 14, 1], [D, 1]]);
      keys(riv, an, p.id, SY, [[0, 0], [m.t, 0], [m.t + 8, 1.15], [m.t + 14, 1], [D, 1]]);
    }
  }
  // Vạch thắng kéo dài (165-178) + sao bật (168-180).
  keys(riv, an, win.id, SX, [[0, 0], [165, 0], [178, 1], [D, 1]]);
  keys(riv, an, star.id, SX, [[0, 0], [168, 0], [176, 1.2], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [168, 0], [176, 1.2], [D, 1]]);
  fadeEnds(riv, an, [...lines, ...marks.flatMap(m => m.parts), win, star], D);
  save('caro', riv);
}

// ---- 27. tictactoe: X/O 3×3 – 3 THẮNG CHÉO, GẠCH ĐƯỜNG WIN (180f = 3s).
// Bảng đen phấn: X vàng và O trắng đánh xen kẽ, X đủ 3 đường chéo chính
// -> vạch vàng gạch chéo + sao.
{
  const { riv, ab, root } = newFile('tictactoe');
  const D = 180;
  const OX = 128, OY = 28, CELL = 48;
  const cc = (c, r) => [OX + 24 + c * CELL, OY + 24 + r * CELL];
  // Lưới 3×3 (vạch phấn kem).
  const lines = [
    rect(riv, root, { name: 'VL0', x: 176, y: 100, w: 3, h: 144, color: CREAM }),
    rect(riv, root, { name: 'VL1', x: 224, y: 100, w: 3, h: 144, color: CREAM }),
    rect(riv, root, { name: 'HL0', x: 200, y: 76, w: 144, h: 3, color: CREAM }),
    rect(riv, root, { name: 'HL1', x: 200, y: 124, w: 144, h: 3, color: CREAM }),
  ];
  const mkX = (cx, cy) => [
    poly(riv, root, { name: 'X1', cx, cy, points: rotRectPoints(cx, cy, 34, 8, Math.PI / 4), color: YELLOW }),
    poly(riv, root, { name: 'X2', cx, cy, points: rotRectPoints(cx, cy, 34, 8, -Math.PI / 4), color: YELLOW }),
  ];
  const mkO = (cx, cy) => {
    const inner = ell(riv, root, { name: 'OIn', x: cx, y: cy, w: 20, color: INK });
    const outer = ell(riv, root, { name: 'OOut', x: cx, y: cy, w: 34, color: WHITE });
    return [inner, outer];
  };
  const seq = [
    ['X', 0, 0, 0], ['O', 1, 0, 25], ['X', 1, 1, 50], ['O', 0, 1, 75], ['X', 2, 2, 100],
  ];
  const marks = [];
  for (const [k, c, r, t] of seq) {
    const [cx, cy] = cc(c, r);
    marks.push({ parts: k === 'X' ? mkX(cx, cy) : mkO(cx, cy), t });
  }
  // Vạch thắng chéo chính + sao.
  const win = poly(riv, root, { name: 'Win', cx: 200, cy: 100, points: rotRectPoints(200, 100, 170, 7, Math.PI / 4), color: YELLOW });
  const star = poly(riv, root, { name: 'Star', cx: 315, cy: 45, points: starPoints(315, 45, 13), color: GOLD, stroke: INK, strokeW: 2 });
  bg(riv, root, INK);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  for (const m of marks) {
    for (const p of m.parts) {
      keys(riv, an, p.id, SX, [[0, 0], [m.t, 0], [m.t + 8, 1.15], [m.t + 14, 1], [D, 1]]);
      keys(riv, an, p.id, SY, [[0, 0], [m.t, 0], [m.t + 8, 1.15], [m.t + 14, 1], [D, 1]]);
    }
  }
  // Vạch thắng nở đều từ tâm (115-140) + sao bật (140-160).
  keys(riv, an, win.id, SX, [[0, 0], [115, 0], [130, 1.1], [140, 1], [D, 1]]);
  keys(riv, an, win.id, SY, [[0, 0], [115, 0], [130, 1.1], [140, 1], [D, 1]]);
  keys(riv, an, star.id, SX, [[0, 0], [140, 0], [152, 1.2], [160, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [140, 0], [152, 1.2], [160, 1], [D, 1]]);
  fadeEnds(riv, an, [...lines, ...marks.flatMap(m => m.parts), win, star], D);
  save('tictactoe', riv);
}

// ---- 28. memory: LẬT 2 LÁ – TRÙNG GIỮ NGỬA, LỆCH ÚP LẠI (180f = 3s).
// 12 lá úp 4×3; 2 lá ♥ lật lên trùng nhau -> sao vàng, giữ ngửa; 2 lá
// khác (♠ vs ♦) lật lên lệch nhau -> úp lại.
{
  const { riv, ab, root } = newFile('memory');
  const D = 180;
  const CX = [95, 155, 215, 275], CY = [45, 100, 155];
  // Mặt lá khác nhau theo vị trí: cặp lệch (155,100)=♠ đen, (275,155)=♦ đỏ;
  // các lá còn lại ♥ đỏ. (Lưng úp giống nhau nên chỉ mặt mới lộ sự khác nhau.)
  const suitAt = (i) => i === 5 ? { suit: 'spade', suitColor: INK } : i === 11 ? { suit: 'diamond', suitColor: RED } : { suit: 'heart', suitColor: RED };
  const cards = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const i = r * 4 + c;
    cards.push(card(riv, root, CX[c], CY[r], 44, 60, { back: TEAL, ...suitAt(i), pips: 3 }));
  }
  // Cặp trùng: 2 lá ♥ ở (95,45) và (215,45); cặp lệch: ♠ (155,100) vs ♦ (275,155).
  const a1 = cards[0], a2 = cards[2];
  const b1 = cards[5], b2 = cards[11];
  const star = poly(riv, root, { name: 'Star', cx: 200, cy: 22, points: starPoints(200, 22, 14), color: GOLD, stroke: INK, strokeW: 2 });
  bg(riv, root, LAVENDER);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Cặp trùng lật lên (0-30, 30-60) rồi giữ ngửa; sao bật (60-80).
  flipCard(riv, an, a1, 0, 15, 30, D);
  flipCard(riv, an, a2, 30, 45, 60, D);
  keys(riv, an, star.id, SX, [[0, 0], [60, 0], [72, 1.2], [80, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [60, 0], [72, 1.2], [80, 1], [D, 1]]);
  // Cặp lệch lật lên lần lượt (b1: 90-120, b2: 120-150) rồi úp lại
  // (150-165). VIẾT 1 BỘ KEY DUY NHẤT cho mỗi part — KHÔNG dùng flipCard
  // rồi ghi đè thêm key SX nữa: 2 KeyedProperty cho cùng (part, SX) làm
  // runtime vẽ sai (2 lá này ở cuối vòng hiện thành lá xanh trơn, mất cả
  // mặt lẫn lưng). Chỉ giữ các key đổi giá trị (bỏ key thừa trùng giá trị
  // kề trước — khung mờ cuối vòng vẽ sai tâm lá nếu để thừa).
  for (const p of b1.back) keys(riv, an, p.id, SX, [[90, 1], [105, 0], [165, 1], [D, 1]]);
  for (const p of b1.face) keys(riv, an, p.id, SX, [[105, 0], [120, 1], [165, 0], [D, 0]]);
  for (const p of b2.back) keys(riv, an, p.id, SX, [[120, 1], [135, 0], [165, 1], [D, 1]]);
  for (const p of b2.face) keys(riv, an, p.id, SX, [[135, 0], [150, 1], [165, 0], [D, 0]]);
  fadeEnds(riv, an, [...cards.flatMap(c => c.all), star], D);
  save('memory', riv);
}

// ---- 29. covay: ĐẶT QUÂN LUÂN PHIÊN – NHÓM TRẮNG BỊ VÂY THÌ BỊ ĂN (180f = 3s).
// 1 góc bàn 19×19 (lưới 6×5 giao điểm): Đen đặt trước, Trắng đặt sau;
// quân Trắng ở (200,66) bị 4 quân Đen vây 4 phía -> mờ dần (bị ăn) + sao vàng.
{
  const { riv, ab, root } = newFile('covay');
  const D = 180;
  const GX = [92, 128, 164, 200, 236, 272], GY = [34, 66, 98, 130, 162];
  // Quân (vẽ trước = trên cùng): 4 Đen vây + 1 Trắng bị ăn + 1 Trắng đứng yên.
  const stone = (x, y, color) => ell(riv, root, { name: 'St' + x + y, x, y, w: 26, color, stroke: INK, strokeW: 2 });
  const b1 = stone(164, 66, INK), w1 = stone(200, 66, WHITE), b2 = stone(236, 66, INK);
  const b3 = stone(200, 34, INK), b4 = stone(200, 98, INK), w2 = stone(128, 130, WHITE);
  const star = poly(riv, root, { name: 'Star', cx: 200, cy: 66, points: starPoints(200, 66, 14), color: GOLD, stroke: INK, strokeW: 2 });
  // Lưới 6 cột × 5 hàng (vẽ sau quân = ở dưới).
  const vlines = GX.map((x, i) => rect(riv, root, { name: 'VL' + i, x, y: 98, w: 2, h: 128, color: INK }));
  const hlines = GY.map((y, i) => rect(riv, root, { name: 'HL' + i, x: 182, y, w: 180, h: 2, color: INK }));
  const board = rect(riv, root, { name: 'Board', x: 182, y: 98, w: 220, h: 160, color: SAND, stroke: INK, strokeW: 3 });
  bg(riv, root, SAND2);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Quân bật lên lần lượt (mỗi quân cách nhau 25f).
  const pop = (p, t) => {
    keys(riv, an, p.id, SX, [[0, 0], [t, 0], [t + 8, 1.15], [t + 14, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [t, 0], [t + 8, 1.15], [t + 14, 1], [D, 1]]);
  };
  pop(b1, 0); pop(w1, 25); pop(b2, 50); pop(b3, 75); pop(b4, 100); pop(w2, 115);
  // Quân Trắng bị vây đủ 4 phía (100) -> mờ dần (120-150). KHÔNG cho w1 vào
  // fadeEnds (nó có key opacity riêng).
  keys(riv, an, w1.id, OPACITY, [[0, 1], [120, 1], [150, 0], [D, 0]], 'linear');
  // Sao vàng bật lên đúng chỗ quân bị ăn (150-170).
  keys(riv, an, star.id, SX, [[0, 0], [150, 0], [161, 1.2], [170, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [150, 0], [161, 1.2], [170, 1], [D, 1]]);
  fadeEnds(riv, an, [b1, b2, b3, b4, w2, star, ...vlines, ...hlines, board], D);
  save('covay', riv);
}

// ---- 30. cothu: CHUỘT ĂN VOI + HỔ NHẢY QUA SÔNG (180f = 3s).
// Bàn rừng 7×9 (hiện 7 cột × 5 hàng): Chuột đỏ (hạng 1) nhảy sang ô Voi
// xanh (hạng 8) -> Voi mờ dần (bị ăn) + sao vàng; Hổ vàng nhảy qua sông.
{
  const { riv, ab, root } = newFile('cothu');
  const D = 180;
  const GX = [102, 130, 158, 186, 214, 242, 270, 298], GY = [30, 58, 86, 114, 142, 170];
  // Quân (vẽ trước = trên cùng): Chuột đỏ, Voi xanh, Hổ vàng, Mèo xanh, Chó đỏ.
  const rat = disc(riv, root, 130, 142, RED, CREAM, RED);
  const ele = disc(riv, root, 186, 142, BLUE, CREAM, BLUE);
  const tiger = disc(riv, root, 242, 30, GOLD, CREAM, INK);
  const cat = disc(riv, root, 270, 30, BLUE, CREAM, BLUE);
  const dog = disc(riv, root, 102, 86, RED, CREAM, RED);
  // Sao vàng trên ô Voi bị ăn.
  const star = poly(riv, root, { name: 'Star', cx: 186, cy: 142, points: starPoints(186, 142, 13), color: GOLD, stroke: INK, strokeW: 2 });
  // Hang vàng góc trái trên + 2 bẫy (dấu X đỏ).
  const den = poly(riv, root, { name: 'Den', cx: 102, cy: 30, points: starPoints(102, 30, 10), color: GOLD, stroke: INK, strokeW: 2 });
  const trap = (cx, cy) => [
    poly(riv, root, { name: 'T1', cx, cy, points: rotRectPoints(cx, cy, 14, 3, Math.PI / 4), color: RED }),
    poly(riv, root, { name: 'T2', cx, cy, points: rotRectPoints(cx, cy, 14, 3, -Math.PI / 4), color: RED }),
  ];
  const tr1 = trap(130, 58), tr2 = trap(270, 142);
  // Lưới 7×5 (vẽ sau quân = ở dưới).
  const vlines = GX.map((x, i) => rect(riv, root, { name: 'VL' + i, x, y: 100, w: 2, h: 140, color: INK }));
  const hlines = GY.map((y, i) => rect(riv, root, { name: 'HL' + i, x: 200, y, w: 196, h: 2, color: INK }));
  // Sông ngọc giữa bàn (vẽ sau lưới = đè lên đường dọc, như sông thật).
  const rip1 = ell(riv, root, { name: 'Rip1', x: 176, y: 100, w: 14, h: 4, color: CREAM });
  const rip2 = ell(riv, root, { name: 'Rip2', x: 196, y: 114, w: 14, h: 4, color: CREAM });
  const river = rect(riv, root, { name: 'River', x: 186, y: 100, w: 56, h: 84, color: TEAL });
  const board = rect(riv, root, { name: 'Board', x: 200, y: 100, w: 216, h: 160, color: SAND2, stroke: INK, strokeW: 3 });
  bg(riv, root, SAND);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Chuột nhảy sang ô Voi (0-50) + nhún khi đáp.
  shift(riv, an, rat, [[0, 0], [20, 0], [35, 28], [50, 56], [D, 56]], [[0, 0], [20, 0], [35, -14], [50, 0], [D, 0]]);
  for (const p of rat) keys(riv, an, p.id, SY, [[0, 1], [48, 1], [50, 0.8], [53, 1], [D, 1]]);
  // Voi to hơn (scale 1.2) + mờ vào cùng cảnh, bị ăn thì mờ dần (70-100).
  // KHÔNG cho Voi vào fadeEnds (nó có key opacity riêng).
  for (const p of ele) {
    keys(riv, an, p.id, SX, [[0, 1.2], [D, 1.2]]);
    keys(riv, an, p.id, SY, [[0, 1.2], [D, 1.2]]);
    keys(riv, an, p.id, OPACITY, [[0, 0], [6, 1], [70, 1], [100, 0], [D, 0]], 'linear');
  }
  // Hổ nhảy qua sông (40-70): từ (242,30) xuống (242,142), vòng cung lên cao.
  shift(riv, an, tiger, [[0, 0], [D, 0]], [[0, 0], [40, 0], [55, -50], [70, 112], [D, 112]]);
  for (const p of tiger) keys(riv, an, p.id, SY, [[0, 1], [68, 1], [70, 0.8], [73, 1], [D, 1]]);
  // Sao vàng bật lên đúng ô Voi bị ăn (100-120).
  keys(riv, an, star.id, SX, [[0, 0], [100, 0], [111, 1.2], [120, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [100, 0], [111, 1.2], [120, 1], [D, 1]]);
  fadeEnds(riv, an, [...rat, ...tiger, ...cat, ...dog, star, den, ...tr1, ...tr2, ...vlines, ...hlines, rip1, rip2, river, board], D);
  save('cothu', riv);
}

// ---- 31. ranvathang: XÚC XẮC LĂN – QUÂN NHẢY TỪNG Ô – LEO THANG (180f = 3s).
// Xúc xắc lắc, quân nhảy 3 ô rồi leo thang lên hàng trên, tới ô đích vàng;
// rắn xanh cuộn bên trái (phần chơi thật: leo thang / trượt rắn).
{
  const { riv, ab, root } = newFile('ranvathang');
  const D = 180;
  // Quân (vẽ trước = trên cùng): mũ đỏ + đầu kem + thân ngọc (như typhu).
  const stops = [[110, 150], [150, 150], [190, 150], [230, 150], [230, 110], [230, 70], [270, 70], [310, 70]];
  const [cx0, cy0] = stops[0];
  const cap = poly(riv, root, { name: 'Cap', cx: cx0, cy: cy0 - 32, points: [[cx0, cy0 - 36], [cx0 - 7, cy0 - 29], [cx0 + 7, cy0 - 29]], color: RED, stroke: INK, strokeW: 1 });
  const head = ell(riv, root, { name: 'Head', x: cx0, y: cy0 - 24, w: 15, color: CREAM, stroke: INK, strokeW: 2 });
  const body = rect(riv, root, { name: 'Body', x: cx0, y: cy0 - 9, w: 18, h: 18, r: 7, color: TEAL, stroke: INK, strokeW: 2 });
  const shadow = ell(riv, root, { name: 'Shadow', x: cx0, y: cy0 + 8, w: 24, h: 7, color: SHADOW });
  // Xúc xắc lắc (4 chấm) góc trái trên.
  const pips = [[-9, -9], [9, -9], [-9, 9], [9, 9]].map(([dx, dy], i) =>
    ell(riv, root, { name: 'Pip' + i, x: 55 + dx, y: 45 + dy, w: 6, color: INK }));
  const die = rect(riv, root, { name: 'Die', x: 55, y: 45, w: 34, h: 34, r: 6, color: WHITE, stroke: INK, strokeW: 2 });
  // Sao vàng trên ô đích.
  const star = poly(riv, root, { name: 'Star', cx: 310, cy: 70, points: starPoints(310, 70, 13), color: GOLD, stroke: INK, strokeW: 2 });
  // Thang gỗ từ (230,150) lên (230,70) — tạo TRƯỚC các ô (thêm trước
  // = vẽ TRÊN; tạo sau ô thì thang bị ô kem che mất).
  const rails = [rect(riv, root, { name: 'RailL', x: 220, y: 110, w: 4, h: 84, color: SAND2, stroke: INK, strokeW: 1 }),
    rect(riv, root, { name: 'RailR', x: 240, y: 110, w: 4, h: 84, color: SAND2, stroke: INK, strokeW: 1 })];
  const rungs = [90, 110, 130].map((y, i) =>
    rect(riv, root, { name: 'Rung' + i, x: 230, y, w: 24, h: 4, color: SAND2, stroke: INK, strokeW: 1 }));
  // 8 ô đường đi (ô xuất phát đỏ, ô đích vàng, còn lại kem).
  const tileColors = [RED, CREAM, CREAM, CREAM, CREAM, YELLOW, CREAM, CREAM];
  const tiles = stops.map(([x, y], i) =>
    rect(riv, root, { name: 'Tile' + i, x, y, w: 36, h: 36, color: tileColors[i], stroke: INK, strokeW: 2 }));
  // Rắn xanh cuộn bên trái: 5 đốt + đầu + mắt.
  const segs = [[70, 170], [58, 150], [76, 132], [60, 112], [78, 92]].map(([x, y], i) =>
    ell(riv, root, { name: 'Seg' + i, x, y, w: 14, color: FELT }));
  const sEye = ell(riv, root, { name: 'SEye', x: 80, y: 90, w: 3, color: WHITE });
  const sHead = ell(riv, root, { name: 'SHead', x: 78, y: 92, w: 18, color: FELT, stroke: INK, strokeW: 1 });
  const plate = rect(riv, root, { name: 'Plate', x: 205, y: 110, w: 250, h: 120, r: 10, color: SAND, stroke: INK, strokeW: 3 });
  bg(riv, root, CREAM);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Quân nhảy từng ô (7 cú, mỗi cú 18f) rồi mờ về ô đầu.
  const hop = hopFrames(stops, 18, 14, D);
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
  // Xúc xắc lắc qua lại.
  for (const p of [...pips, die]) keys(riv, an, p.id, ROT, [[0, 0], [20, 0.15], [40, -0.15], [60, 0], [D, 0]]);
  // Rắn lắc đầu nhẹ.
  keys(riv, an, sHead.id, ROT, [[0, 0], [45, 0.1], [90, 0], [135, -0.1], [D, 0]]);
  keys(riv, an, sEye.id, ROT, [[0, 0], [45, 0.1], [90, 0], [135, -0.1], [D, 0]]);
  // Sao vàng bật khi quân tới đích (130-150).
  keys(riv, an, star.id, SX, [[0, 0], [130, 0], [141, 1.2], [150, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [130, 0], [141, 1.2], [150, 1], [D, 1]]);
  fadeEnds(riv, an, [...pips, die, star, ...tiles, ...rails, ...rungs, ...segs, sEye, sHead, plate], D);
  save('ranvathang', riv);
}

// ---- 32. sam: ĐÁNH SẢNH 3 LÁ – LÁ 2 (HEO) CHẶT (180f = 3s).
// Tay dưới đánh sảnh 3-4-5♥ ra bàn (lật ngửa từng lá), tay trên chặt lại
// bằng lá 2♠ (vương miện) + sao vàng.
{
  const { riv, ab, root } = newFile('sam');
  const D = 180;
  // Sảnh 3-4-5♥ (tạo trước = trên cùng; vị trí đích ở giữa bàn).
  const c3 = card(riv, root, 150, 100, 44, 60, { back: RED, suit: 'heart', suitColor: RED, pips: 3 });
  const c4 = card(riv, root, 185, 100, 44, 60, { back: RED, suit: 'heart', suitColor: RED, pips: 4 });
  const c5 = card(riv, root, 220, 100, 44, 60, { back: RED, suit: 'heart', suitColor: RED, pips: 5 });
  // Vương miện vàng trên lá 2♠ — tạo TRƯỚC lá bài (thêm trước = vẽ TRÊN;
  // tạo sau thì mặt lá kem che mất crown).
  const crown = poly(riv, root, { name: 'Crown', cx: 255, cy: 80, points: [[245, 86], [245, 76], [250, 81], [255, 72], [260, 81], [265, 76], [265, 86]], color: GOLD, stroke: INK, strokeW: 1 });
  // Lá 2♠ chặn — lá đánh ra là bài NGỬA nên lưng tàng hình từ đầu (không lật).
  const c2 = card(riv, root, 255, 100, 44, 60, { back: BLUE, suit: 'spade', suitColor: INK });
  // Sao vàng khi bị chặt.
  const star = poly(riv, root, { name: 'Star', cx: 305, cy: 60, points: starPoints(305, 60, 13), color: GOLD, stroke: INK, strokeW: 2 });
  // Tay đối thủ (3 lá úp trên) + 2 lá úp còn lại của tay mình (3 lá sảnh
  // lúc đầu nằm đúng chỗ tay dưới — chúng CHÍNH là bài trên tay).
  const opp = [150, 185, 220].map((x, i) => card(riv, root, x, 32, 40, 56, { back: RED }));
  const mine = [95, 235].map((x, i) => card(riv, root, x, 170, 40, 56, { back: BLUE }));
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Sảnh trượt từ tay dưới lên bàn + lật ngửa (mỗi lá lệch nhau 12f).
  const straights = [[c3, 120, 170], [c4, 160, 170], [c5, 200, 170]];
  straights.forEach(([c, sx, sy], i) => {
    const t0 = i * 12;
    const dx = c === c3 ? 30 : c === c4 ? 25 : 20, dy = -70;
    shift(riv, an, c.all, [[0, -dx], [t0, -dx], [t0 + 20, 0], [D, 0]], [[0, -dy], [t0, -dy], [t0 + 20, 0], [D, 0]]);
    flipCard(riv, an, c, t0, t0 + 15, t0 + 30, D);
  });
  // Lá 2♠ bay vào từ phải (60-75), hơi nghiêng khi đáp. Lá đánh ra là bài
  // NGỬA nên lưng tàng hình từ đầu (faceUp) — không thì nó hiện lưng xanh.
  faceUp(riv, an, c2, D);
  shift(riv, an, c2.all, [[0, 120], [60, 120], [75, 0], [D, 0]], [[0, 0], [D, 0]]);
  for (const p of c2.all) keys(riv, an, p.id, ROT, [[0, 0], [75, -0.15], [D, -0.15]]);
  // Vương miện + sao bật khi bị chặt (85-110).
  keys(riv, an, crown.id, SX, [[0, 0], [85, 0], [96, 1.2], [105, 1], [D, 1]]);
  keys(riv, an, crown.id, SY, [[0, 0], [85, 0], [96, 1.2], [105, 1], [D, 1]]);
  keys(riv, an, star.id, SX, [[0, 0], [90, 0], [101, 1.2], [110, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [90, 0], [101, 1.2], [110, 1], [D, 1]]);
  fadeEnds(riv, an, [...c3.all, ...c4.all, ...c5.all, ...c2.all, crown, star, ...opp.flatMap(c => c.all), ...mine.flatMap(c => c.all)], D);
  save('sam', riv);
}

// ---- 33. daochinh: LẬT LÁ CÔNG TƯỚC – XU BAY VÀO (180f = 3s).
// 2 lá vai trò úp: 1 lá lật lên thành Công tước (vương miện vàng) + 3 xu
// vàng bay vào đống xu; lá còn lại run sợ (bịp) + sao vàng.
{
  const { riv, ab, root } = newFile('daochinh');
  const D = 180;
  // Lá Công tước (vương miện) + lá bịp (úp).
  const duke = card(riv, root, 165, 100, 50, 70, { back: RED, suit: 'crown', suitColor: GOLD });
  const bluff = card(riv, root, 235, 100, 50, 70, { back: BLUE, suit: 'spade', suitColor: INK });
  // 3 xu vàng bay vào đống xu góc phải dưới.
  const coins = [[300, 150], [322, 156], [311, 134]].map(([x, y], i) => coin(riv, root, x, y, 9));
  // Sao vàng trên lá Công tước.
  const star = poly(riv, root, { name: 'Star', cx: 300, cy: 70, points: starPoints(300, 70, 13), color: GOLD, stroke: INK, strokeW: 2 });
  // Tay đối thủ (2 lá úp trên).
  const opp = [150, 200].map((x, i) => card(riv, root, x, 32, 40, 56, { back: RED }));
  bg(riv, root, FELT_D);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Lá Công tước lật lên (20-50).
  flipCard(riv, an, duke, 20, 35, 50, D);
  // Lá bịp run sợ (60-90): lắc qua lại.
  for (const p of bluff.all) keys(riv, an, p.id, ROT, [[0, 0], [60, 0.08], [70, -0.08], [80, 0.08], [90, 0], [D, 0]]);
  // 3 xu bay vào từ trái (mỗi xu lệch nhau 10f).
  coins.forEach((c, i) => {
    const t0 = 60 + i * 10;
    shift(riv, an, c, [[0, -160], [t0, -160], [t0 + 25, 0], [D, 0]], [[0, 0], [D, 0]]);
  });
  // Sao vàng bật lên (100-120).
  keys(riv, an, star.id, SX, [[0, 0], [100, 0], [111, 1.2], [120, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [100, 0], [111, 1.2], [120, 1], [D, 1]]);
  fadeEnds(riv, an, [...duke.all, ...bluff.all, ...coins.flat(), star, ...opp.flatMap(c => c.all)], D);
  save('daochinh', riv);
}

// ---- 34. xiecthu: 3 CON THÚ LẬT LÊN SÂN KHẤU (180f = 3s).
// Rèm đỏ trên + sàn gỗ dưới, sân khấu kem FULL-BLEED: 3 lá thú lật lên lần
// lượt (sư tử -> voi -> khỉ) + sao vàng. Lá 104×140, dạt rộng 90/200/310.
// (v6.1: bỏ rèm 2 bên + sân khấu 370×140 cũ — cảnh bị lồng khung, chưa full.)
// (v6.2: phóng to lá 46×62 -> 76×104 + thú ×1.65 — lá cũ quá nhỏ, hai bên
//  còn khoảng trống kem lớn, anh Hưng báo "chưa full khung".)
// (v6.3: lá 76×104 -> 104×140 + thú to theo + SỬA THỨ TỰ VẼ của thú —
//  thêm trước = vẽ TRÊN, mà mặt sư tử tạo SAU bờm nên bị bờm che (chỉ thấy
//  vòng vàng, không rõ mặt), mõm khỉ tạo SAU mặt nên bị mặt che; giờ chi
//  tiết mặt (mắt/mũi/mõm) tạo TRƯỚC mặt, mặt tạo TRƯỚC bờm/tai.)
{
  const { riv, ab, root } = newFile('xiecthu');
  const D = 180;
  // Thú PHẢI tạo TRƯỚC các lá bài (thêm trước = vẽ TRÊN; tạo sau lá thì
  // mặt lá kem che mất thú — lỗi tương tự Lô Tô đợt 3). TRONG mỗi con thú
  // cũng vậy: chi tiết mặt tạo TRƯỚC mặt, mặt tạo TRƯỚC bờm/tai.
  // Sư tử (mắt + mũi mực, mặt vàng, tai vàng, bờm vàng) trên lá 1.
  const lionEye1 = ell(riv, root, { name: 'LionEye1', x: 77, y: 105, w: 6, color: INK });
  const lionEye2 = ell(riv, root, { name: 'LionEye2', x: 103, y: 105, w: 6, color: INK });
  const lionNose = ell(riv, root, { name: 'LionNose', x: 90, y: 118, w: 9, h: 7, color: INK });
  const lionFace = ell(riv, root, { name: 'LionFace', x: 90, y: 110, w: 58, color: YELLOW, stroke: INK, strokeW: 2 });
  const lionEar1 = ell(riv, root, { name: 'LionE1', x: 60, y: 73, w: 18, color: GOLD, stroke: INK, strokeW: 1 });
  const lionEar2 = ell(riv, root, { name: 'LionE2', x: 120, y: 73, w: 18, color: GOLD, stroke: INK, strokeW: 1 });
  const lionMane = ell(riv, root, { name: 'LionMane', x: 90, y: 110, w: 88, color: GOLD, stroke: INK, strokeW: 2 });
  // Voi (mắt mực, vòi xám trước đầu, đầu xám, tai tím sau đầu) trên lá 2.
  const elEye1 = ell(riv, root, { name: 'ElEye1', x: 185, y: 100, w: 5, color: INK });
  const elEye2 = ell(riv, root, { name: 'ElEye2', x: 215, y: 100, w: 5, color: INK });
  const elTrunk = rect(riv, root, { name: 'ElTrunk', x: 200, y: 133, w: 18, h: 45, r: 6, color: hex('#8A9BA8'), stroke: INK, strokeW: 1 });
  const elHead = ell(riv, root, { name: 'ElHead', x: 200, y: 105, w: 62, color: hex('#8A9BA8'), stroke: INK, strokeW: 2 });
  const elEar1 = ell(riv, root, { name: 'ElE1', x: 165, y: 102, w: 31, color: LAVENDER, stroke: INK, strokeW: 1 });
  const elEar2 = ell(riv, root, { name: 'ElE2', x: 235, y: 102, w: 31, color: LAVENDER, stroke: INK, strokeW: 1 });
  // Khỉ (mắt mực, mõm kem trước mặt, mặt nâu, tai nâu sau mặt) trên lá 3.
  const moEye1 = ell(riv, root, { name: 'MoEye1', x: 297, y: 103, w: 6, color: INK });
  const moEye2 = ell(riv, root, { name: 'MoEye2', x: 323, y: 103, w: 6, color: INK });
  const moMuzzle = ell(riv, root, { name: 'MoMuzzle', x: 310, y: 122, w: 31, h: 22, color: CREAM, stroke: INK, strokeW: 1 });
  const moFace = ell(riv, root, { name: 'MoFace', x: 310, y: 108, w: 58, color: hex('#A8763E'), stroke: INK, strokeW: 2 });
  const moEar1 = ell(riv, root, { name: 'MoE1', x: 283, y: 95, w: 22, color: hex('#A8763E'), stroke: INK, strokeW: 1 });
  const moEar2 = ell(riv, root, { name: 'MoE2', x: 337, y: 95, w: 22, color: hex('#A8763E'), stroke: INK, strokeW: 1 });
  // 3 lá thú (lật lên lần lượt) — 104×140, dạt rộng (90/200/310) cho đầy khung.
  const l1 = card(riv, root, 90, 110, 104, 140, { back: RED, suit: 'heart', suitColor: RED, pips: 2 });
  const l2 = card(riv, root, 200, 110, 104, 140, { back: RED, suit: 'heart', suitColor: RED, pips: 2 });
  const l3 = card(riv, root, 310, 110, 104, 140, { back: RED, suit: 'heart', suitColor: RED, pips: 2 });
  // Sao vàng trên sân khấu (nhô lên trên lá giữa — lá to hơn nên sao dời lên).
  const star = poly(riv, root, { name: 'Star', cx: 200, cy: 30, points: starPoints(200, 30, 15), color: GOLD, stroke: INK, strokeW: 2 });
  // Rèm đỏ trên + sàn gỗ dưới, sân khấu kem FULL-BLEED (404×204).
  // BỎ 2 rèm bên (DrapeL/DrapeR): rèm bên + sân khấu 370×140 cũ làm cảnh như
  // bức tranh lồng khung, thụt vào so với mép thẻ — anh Hưng báo "chưa full
  // khung". Sân khấu tràn kín artboard, chỉ giữ rèm trên + sàn dưới làm dải.
  const curtain = rect(riv, root, { name: 'Curtain', x: 200, y: 12, w: 400, h: 26, color: RED });
  const floor = rect(riv, root, { name: 'Floor', x: 200, y: 172, w: 400, h: 56, color: SAND2, stroke: INK, strokeW: 2 });
  const stage = rect(riv, root, { name: 'Stage', x: 200, y: 100, w: 404, h: 204, color: CREAM, stroke: INK, strokeW: 3 });
  bg(riv, root, LAVENDER);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // 3 lá lật lên lần lượt (10-40, 40-70, 70-100); thú bật lên ngay sau mỗi lá
  // — nhịp sớm để con khỉ (lá cuối) hiện hơn nửa vòng, không chỉ 1/4 vòng.
  flipCard(riv, an, l1, 10, 25, 40, D);
  flipCard(riv, an, l2, 40, 55, 70, D);
  flipCard(riv, an, l3, 70, 85, 100, D);
  const popAnimal = (parts, t) => {
    for (const p of parts) {
      keys(riv, an, p.id, SX, [[0, 0], [t, 0], [t + 8, 1.15], [t + 14, 1], [D, 1]]);
      keys(riv, an, p.id, SY, [[0, 0], [t, 0], [t + 8, 1.15], [t + 14, 1], [D, 1]]);
    }
  };
  popAnimal([lionEye1, lionEye2, lionNose, lionFace, lionEar1, lionEar2, lionMane], 30);
  popAnimal([elEye1, elEye2, elTrunk, elHead, elEar1, elEar2], 60);
  popAnimal([moEye1, moEye2, moMuzzle, moFace, moEar1, moEar2], 90);
  // Sao vàng bật lên khi đủ 3 thú (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [...l1.all, ...l2.all, ...l3.all, lionEye1, lionEye2, lionNose, lionFace, lionEar1, lionEar2, lionMane, elEye1, elEye2, elTrunk, elHead, elEar1, elEar2, moEye1, moEye2, moMuzzle, moFace, moEar1, moEar2, star, curtain, floor, stage], D);
  save('xiecthu', riv);
}

// ---- 35. cuuho: XE CỨU HỘ CHẠY TỚI – PHUN NƯỚC DẬP LỬA (180f = 3s).
// Bản đồ xanh 3 thành phố: 1 ô cháy (lửa đỏ-cam-vàng), xe cứu hộ chạy vào,
// 3 giọt nước rơi xuống, lửa nhỏ dần + sao vàng (cứu được).
{
  const { riv, ab, root } = newFile('cuuho');
  const D = 180;
  // Xe cứu hộ (thân trắng + ca-bin đỏ + 2 bánh) — chạy từ trái vào.
  const wheel1 = ell(riv, root, { name: 'W1', x: 48, y: 152, w: 10, color: INK });
  const wheel2 = ell(riv, root, { name: 'W2', x: 84, y: 152, w: 10, color: INK });
  const cab = rect(riv, root, { name: 'Cab', x: 84, y: 138, w: 18, h: 18, r: 3, color: RED, stroke: INK, strokeW: 2 });
  const truckBody = rect(riv, root, { name: 'Truck', x: 60, y: 140, w: 44, h: 22, r: 4, color: WHITE, stroke: INK, strokeW: 2 });
  const truck = [wheel1, wheel2, cab, truckBody];
  // Lửa 3 lớp trên ô cháy (230,110): đỏ ngoài, cam giữa, vàng trong.
  const flIn = poly(riv, root, { name: 'FlIn', cx: 230, cy: 110, points: [[230, 96], [238, 108], [236, 118], [224, 118], [222, 108]], color: YELLOW });
  const flMid = poly(riv, root, { name: 'FlMid', cx: 230, cy: 110, points: [[230, 88], [242, 106], [239, 122], [221, 122], [218, 106]], color: GOLD });
  const flOut = poly(riv, root, { name: 'FlOut', cx: 230, cy: 110, points: [[230, 82], [246, 106], [242, 126], [218, 126], [214, 106]], color: RED, stroke: INK, strokeW: 1 });
  const flame = [flIn, flMid, flOut];
  // 3 giọt nước rơi từ xe xuống lửa.
  const drops = [[215, 95], [228, 90], [241, 95]].map(([x, y], i) =>
    ell(riv, root, { name: 'Drop' + i, x, y, w: 8, color: BLUE }));
  // Sao vàng khi lửa tắt.
  const star = poly(riv, root, { name: 'Star', cx: 230, cy: 72, points: starPoints(230, 72, 13), color: GOLD, stroke: INK, strokeW: 2 });
  // 2 thành phố an toàn (chấm ngọc) + đường nối.
  const city1 = ell(riv, root, { name: 'City1', x: 140, y: 80, w: 16, color: TEAL, stroke: INK, strokeW: 2 });
  const city2 = ell(riv, root, { name: 'City2', x: 300, y: 70, w: 16, color: TEAL, stroke: INK, strokeW: 2 });
  const road1 = rect(riv, root, { name: 'Road1', x: 185, y: 95, w: 90, h: 4, color: SAND2 });
  const road2 = rect(riv, root, { name: 'Road2', x: 265, y: 90, w: 70, h: 4, color: SAND2 });
  const map = rect(riv, root, { name: 'Map', x: 200, y: 100, w: 320, h: 140, r: 12, color: FELT, stroke: INK, strokeW: 3 });
  bg(riv, root, SAND);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Xe chạy vào (40-80).
  shift(riv, an, truck, [[0, 0], [40, 0], [80, 130], [D, 130]], [[0, 0], [D, 0]]);
  // Lửa cháy phập phồng (0-120) rồi nhỏ dần khi bị phun nước (120-150).
  for (const p of flame) {
    keys(riv, an, p.id, SY, [[0, 1], [30, 1.1], [60, 1], [90, 1.1], [120, 1], [150, 0.2], [D, 0.2]]);
    keys(riv, an, p.id, SX, [[0, 1], [120, 1], [150, 0.4], [D, 0.4]]);
  }
  // 3 giọt nước rơi xuống lửa (mỗi giọt lệch nhau 10f) — có key opacity
  // riêng nên KHÔNG cho vào fadeEnds.
  drops.forEach((d, i) => {
    const t0 = 90 + i * 10;
    shift(riv, an, [d], [[0, 0], [D, 0]], [[0, 0], [t0, 0], [t0 + 15, 25], [D, 25]]);
    keys(riv, an, d.id, OPACITY, [[0, 0], [t0, 0], [t0 + 5, 1], [t0 + 15, 1], [t0 + 25, 0], [D, 0]], 'linear');
  });
  // Sao vàng bật khi lửa tắt (150-170).
  keys(riv, an, star.id, SX, [[0, 0], [150, 0], [161, 1.2], [170, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [150, 0], [161, 1.2], [170, 1], [D, 1]]);
  fadeEnds(riv, an, [...truck, ...flame, star, city1, city2, road1, road2, map], D);
  save('cuuho', riv);
}

// ---- 36. khaihoang: ĐỔ XÚC XẮC – DỰNG LÀNG – LẤY TÀI NGUYÊN (180f = 3s).
// Đảo 4 ô lục giác (gỗ/lúa/gạch/quặng): xúc xắc lắc, nhà làng bật lên,
// đường mở ra, tài nguyên bật lên + sao vàng.
{
  const { riv, ab, root } = newFile('khaihoang');
  const D = 180;
  const hexPts = (cx, cy, r) => {
    const pts = [];
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
  };
  // 4 ô lục giác (tạo trước = trên cùng): gỗ, lúa, gạch, quặng.
  const hexW = poly(riv, root, { name: 'HexW', cx: 140, cy: 90, points: hexPts(140, 90, 38), color: FELT, stroke: INK, strokeW: 2 });
  const hexG = poly(riv, root, { name: 'HexG', cx: 215, cy: 75, points: hexPts(215, 75, 38), color: YELLOW, stroke: INK, strokeW: 2 });
  const hexB = poly(riv, root, { name: 'HexB', cx: 265, cy: 125, points: hexPts(265, 125, 38), color: RED, stroke: INK, strokeW: 2 });
  const hexO = poly(riv, root, { name: 'HexO', cx: 150, cy: 145, points: hexPts(150, 145, 38), color: LAVENDER, stroke: INK, strokeW: 2 });
  // Thẻ số trên mỗi ô (tròn kem + chấm).
  const chits = [[140, 90], [215, 75], [265, 125], [150, 145]].map(([x, y], i) => {
    const dot = ell(riv, root, { name: 'ChitDot' + i, x, y, w: 5, color: INK });
    const c = ell(riv, root, { name: 'Chit' + i, x, y, w: 16, color: CREAM, stroke: INK, strokeW: 1 });
    return [dot, c];
  }).flat();
  // Xúc xắc lắc (6 chấm) góc phải trên.
  const pips = [[-9, -9], [9, -9], [0, 0], [-9, 9], [9, 9], [-9, 0]].map(([dx, dy], i) =>
    ell(riv, root, { name: 'Pip' + i, x: 335 + dx, y: 45 + dy, w: 6, color: INK }));
  const die = rect(riv, root, { name: 'Die', x: 335, y: 45, w: 34, h: 34, r: 6, color: WHITE, stroke: INK, strokeW: 2 });
  // Nhà làng trên ô gỗ (mái đỏ + thân kem).
  const hRoof = poly(riv, root, { name: 'HRoof', cx: 140, cy: 122, points: [[140, 112], [128, 124], [152, 124]], color: RED, stroke: INK, strokeW: 1 });
  const hBody = rect(riv, root, { name: 'HBody', x: 140, y: 130, w: 16, h: 12, color: CREAM, stroke: INK, strokeW: 2 });
  // Đường mở từ nhà sang ô lúa (2 đoạn).
  const road1 = poly(riv, root, { name: 'Road1', cx: 172, cy: 108, points: rotRectPoints(172, 108, 26, 6, -0.4), color: SAND2, stroke: INK, strokeW: 1 });
  const road2 = poly(riv, root, { name: 'Road2', cx: 196, cy: 96, points: rotRectPoints(196, 96, 26, 6, -0.4), color: SAND2, stroke: INK, strokeW: 1 });
  // Tài nguyên bật lên: 2 khúc gỗ (ô gỗ) + 3 hạt lúa (ô lúa).
  const wood1 = rect(riv, root, { name: 'Wood1', x: 118, y: 68, w: 12, h: 6, r: 3, color: FELT_D, stroke: INK, strokeW: 1 });
  const wood2 = rect(riv, root, { name: 'Wood2', x: 132, y: 62, w: 12, h: 6, r: 3, color: FELT_D, stroke: INK, strokeW: 1 });
  const wheat = [[208, 58], [222, 58], [215, 68]].map(([x, y], i) =>
    ell(riv, root, { name: 'Wheat' + i, x, y, w: 7, color: GOLD, stroke: INK, strokeW: 1 }));
  // Thuyền buồm nhấp nhô trên biển (chuyển động liên tục cả vòng).
  const boatSail = poly(riv, root, { name: 'BoatSail', cx: 60, cy: 164, points: [[60, 150], [50, 170], [70, 170]], color: WHITE, stroke: INK, strokeW: 1 });
  const boatHull = rect(riv, root, { name: 'BoatHull', x: 60, y: 174, w: 28, h: 8, r: 3, color: SAND2, stroke: INK, strokeW: 2 });
  // Sao vàng trên ô lúa.
  const star = poly(riv, root, { name: 'Star', cx: 215, cy: 38, points: starPoints(215, 38, 13), color: GOLD, stroke: INK, strokeW: 2 });
  // Biển (nền full-bleed xanh).
  bg(riv, root, BLUE);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Xúc xắc lắc mạnh qua lại (0-60).
  for (const p of [...pips, die]) keys(riv, an, p.id, ROT, [[0, 0], [15, 0.3], [30, -0.3], [45, 0.3], [60, 0], [D, 0]]);
  // Thuyền nhấp nhô liên tục (Y ±3) + nghiêng nhẹ.
  for (const p of [boatSail, boatHull]) {
    keys(riv, an, p.id, Y, [[0, p.y], [45, p.y + 3], [90, p.y], [135, p.y - 3], [D, p.y]]);
    keys(riv, an, p.id, ROT, [[0, 0], [45, 0.05], [90, 0], [135, -0.05], [D, 0]]);
  }
  // Nhà làng bật lên SỚM (30-50) — chuyển động đầu vòng phải thấy rõ.
  for (const p of [hRoof, hBody]) {
    keys(riv, an, p.id, SX, [[0, 0], [30, 0], [41, 1.3], [50, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [30, 0], [41, 1.3], [50, 1], [D, 1]]);
  }
  // Đường mở ra (50-70): nở từ tâm theo X.
  for (const p of [road1, road2]) {
    keys(riv, an, p.id, SX, [[0, 0], [50, 0], [70, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [50, 0], [70, 1], [D, 1]]);
  }
  // Tài nguyên bật lên (70-90).
  for (const p of [wood1, wood2, ...wheat]) {
    keys(riv, an, p.id, SX, [[0, 0], [70, 0], [81, 1.2], [90, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [70, 0], [81, 1.2], [90, 1], [D, 1]]);
  }
  // Sao vàng bật lên (100-120).
  keys(riv, an, star.id, SX, [[0, 0], [100, 0], [111, 1.2], [120, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [100, 0], [111, 1.2], [120, 1], [D, 1]]);
  fadeEnds(riv, an, [hexW, hexG, hexB, hexO, ...chits, ...pips, die, hRoof, hBody, road1, road2, wood1, wood2, ...wheat, star, boatSail, boatHull], D);
  save('khaihoang', riv);
}

// ---- 37. xuyenviet: TÀU CHẠY DỌC BẢN ĐỒ VIỆT NAM (180f = 3s).
// Tàu chạy qua 5 ga trên bản đồ (Bắc -> Nam), vé đích bật lên + sao vàng ở ga cuối.
{
  const { riv, ab, root } = newFile('xuyenviet');
  const D = 180;
  const stations = [[195, 35], [210, 70], [190, 105], [212, 140], [196, 172]];
  // Sao vàng ở ga cuối (góc phải trên).
  const star = poly(riv, root, { name: 'Star', cx: 240, cy: 40, points: starPoints(240, 40, 13), color: GOLD, stroke: INK, strokeW: 2 });
  // Vé đích (bật lên sớm ở góc trái trên biển).
  const tkDot1 = ell(riv, root, { name: 'TkDot1', x: 80, y: 38, w: 8, color: TEAL });
  const tkDot2 = ell(riv, root, { name: 'TkDot2', x: 96, y: 38, w: 8, color: RED });
  const tkLine = rect(riv, root, { name: 'TkLine', x: 88, y: 56, w: 24, h: 4, color: INK });
  const ticket = rect(riv, root, { name: 'Ticket', x: 88, y: 48, w: 36, h: 46, r: 5, color: CREAM, stroke: INK, strokeW: 2 });
  // Tàu: đầu máy + 1 toa (vị trí gốc ở ga đầu).
  const tWheel1 = ell(riv, root, { name: 'TW1', x: 186, y: 42, w: 8, color: INK });
  const tWheel2 = ell(riv, root, { name: 'TW2', x: 200, y: 42, w: 8, color: INK });
  const tChim = rect(riv, root, { name: 'TChim', x: 196, y: 28, w: 6, h: 8, color: INK });
  const tLoco = rect(riv, root, { name: 'TLoco', x: 193, y: 34, w: 26, h: 14, r: 4, color: RED, stroke: INK, strokeW: 2 });
  const cWheel1 = ell(riv, root, { name: 'CW1', x: 162, y: 42, w: 8, color: INK });
  const cWheel2 = ell(riv, root, { name: 'CW2', x: 174, y: 42, w: 8, color: INK });
  const tCar = rect(riv, root, { name: 'TCar', x: 168, y: 34, w: 20, h: 12, r: 3, color: YELLOW, stroke: INK, strokeW: 2 });
  const train = [tWheel1, tWheel2, tChim, tLoco, cWheel1, cWheel2, tCar];
  // Ga: chấm ngọc trên tuyến (tạo sau chấm tuyến = trên cùng).
  const cities = stations.map(([x, y], i) => ell(riv, root, { name: 'City' + i, x, y, w: 13, color: TEAL, stroke: INK, strokeW: 2 }));
  // Chấm đỏ nối các ga (tuyến đường sắt).
  const dots = [];
  for (let s = 0; s < stations.length - 1; s++) {
    const [x1, y1] = stations[s], [x2, y2] = stations[s + 1];
    for (let k = 1; k <= 3; k++) {
      const t = k / 4;
      dots.push(ell(riv, root, { name: 'Dot' + s + '_' + k, x: Math.round(x1 + (x2 - x1) * t), y: Math.round(y1 + (y2 - y1) * t), w: 6, color: RED }));
    }
  }
  // Đất liền (dải chữ S) + biển là nền.
  const land = poly(riv, root, { name: 'Land', cx: 200, cy: 100, points: [[170, 15], [230, 15], [240, 55], [215, 95], [240, 135], [225, 185], [175, 185], [160, 140], [180, 100], [160, 55]], color: hex('#7FB069'), stroke: INK, strokeW: 2 });
  bg(riv, root, BLUE);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Tàu chạy qua từng ga (mỗi ga 30f): shift theo ĐỘ LỆCH so với ga đầu.
  const [tx0, ty0] = stations[0];
  const trainX = stations.map(([x], i) => [i * 30, x - tx0]);
  const trainY = stations.map(([, y], i) => [i * 30, y - ty0]);
  trainX.push([D, stations[4][0] - tx0]);
  trainY.push([D, stations[4][1] - ty0]);
  shift(riv, an, train, trainX, trainY);
  // Vé đích bật lên sớm (15-35).
  for (const p of [tkDot1, tkDot2, tkLine, ticket]) {
    keys(riv, an, p.id, SX, [[0, 0], [15, 0], [26, 1.2], [35, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [15, 0], [26, 1.2], [35, 1], [D, 1]]);
  }
  // Ga hiện dần khi tàu tới (mỗi ga lệch 30f).
  cities.forEach((c, i) => {
    const t = i * 30;
    keys(riv, an, c.id, SX, [[0, 0], [t, 0], [t + 8, 1.2], [t + 14, 1], [D, 1]]);
    keys(riv, an, c.id, SY, [[0, 0], [t, 0], [t + 8, 1.2], [t + 14, 1], [D, 1]]);
  });
  // Sao vàng bật khi tàu tới ga cuối (130-150).
  keys(riv, an, star.id, SX, [[0, 0], [130, 0], [141, 1.2], [150, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [130, 0], [141, 1.2], [150, 1], [D, 1]]);
  fadeEnds(riv, an, [star, tkDot1, tkDot2, tkLine, ticket, ...train, ...cities, ...dots, land], D);
  save('xuyenviet', riv);
}

// ---- 38. noitu: NỐI TỪ — ÂM TIẾT CUỐI NỐI ÂM TIẾT ĐẦU (180f = 3s).
// "con gà" -> "gà mái": ô vàng chung là âm tiết nối; mũi tên nối 2 từ + sao vàng + 3 mạng.
{
  const { riv, ab, root } = newFile('noitu');
  const D = 180;
  // Sao vàng trên mũi tên nối.
  const star = poly(riv, root, { name: 'Star', cx: 200, cy: 48, points: starPoints(200, 48, 13), color: GOLD, stroke: INK, strokeW: 2 });
  // Mũi tên nối 2 từ (nở theo X).
  const arrHead = poly(riv, root, { name: 'ArrHead', cx: 212, cy: 90, points: [[212, 82], [212, 98], [224, 90]], color: GOLD, stroke: INK, strokeW: 1 });
  const arrShaft = rect(riv, root, { name: 'ArrShaft', x: 200, y: 90, w: 24, h: 6, color: GOLD, stroke: INK, strokeW: 1 });
  // 3 mạng (tim) góc phải dưới — tim giữa đập.
  const hearts = [296, 322, 348].map((x, i) => suitPip(riv, root, x, 168, 14, 'heart', RED));
  // Ô âm tiết: từ 1 "con gà" (ô 2 vàng = âm tiết nối), từ 2 "gà mái" (ô 1 vàng).
  const t1Dot = ell(riv, root, { name: 'T1Dot', x: 115, y: 90, w: 8, color: RED });
  const t1 = rect(riv, root, { name: 'T1', x: 115, y: 90, w: 36, h: 36, r: 6, color: CREAM, stroke: INK, strokeW: 2 });
  const t2Dot = ell(riv, root, { name: 'T2Dot', x: 155, y: 90, w: 8, color: INK });
  const t2 = rect(riv, root, { name: 'T2', x: 155, y: 90, w: 36, h: 36, r: 6, color: GOLD, stroke: INK, strokeW: 2 });
  const t3Dot = ell(riv, root, { name: 'T3Dot', x: 245, y: 90, w: 8, color: INK });
  const t3 = rect(riv, root, { name: 'T3', x: 245, y: 90, w: 36, h: 36, r: 6, color: GOLD, stroke: INK, strokeW: 2 });
  const t4Dot = ell(riv, root, { name: 'T4Dot', x: 285, y: 90, w: 8, color: TEAL });
  const t4 = rect(riv, root, { name: 'T4', x: 285, y: 90, w: 36, h: 36, r: 6, color: CREAM, stroke: INK, strokeW: 2 });
  // Khung 2 từ.
  const w1 = rect(riv, root, { name: 'W1', x: 135, y: 90, w: 110, h: 54, r: 8, color: WHITE, stroke: INK, strokeW: 2 });
  const w2 = rect(riv, root, { name: 'W2', x: 265, y: 90, w: 110, h: 54, r: 8, color: WHITE, stroke: INK, strokeW: 2 });
  bg(riv, root, SAND);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Các ô hiện lần lượt (0-70), khung từ hiện cùng ô đầu mỗi từ.
  const pop = (parts, t) => { for (const p of parts) { keys(riv, an, p.id, SX, [[0, 0], [t, 0], [t + 8, 1.15], [t + 14, 1], [D, 1]]); keys(riv, an, p.id, SY, [[0, 0], [t, 0], [t + 8, 1.15], [t + 14, 1], [D, 1]]); } };
  pop([t1Dot, t1, w1], 0);
  pop([t2Dot, t2], 15);
  pop([t3Dot, t3, w2], 40);
  pop([t4Dot, t4], 55);
  // Mũi tên nở ra (70-85).
  for (const p of [arrHead, arrShaft]) {
    keys(riv, an, p.id, SX, [[0, 0], [70, 0], [85, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [70, 0], [85, 1], [D, 1]]);
  }
  // Sao vàng bật (95-115).
  keys(riv, an, star.id, SX, [[0, 0], [95, 0], [106, 1.2], [115, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [95, 0], [106, 1.2], [115, 1], [D, 1]]);
  // Tim giữa đập liên tục.
  const beat = sineFrames(rangeFrames(0, D, 6), 60, 0.15);
  for (const p of hearts[1]) {
    keys(riv, an, p.id, SX, dedupe([[0, 1], ...beat.map(([f, v]) => [f, 1 + v])]));
    keys(riv, an, p.id, SY, dedupe([[0, 1], ...beat.map(([f, v]) => [f, 1 + v])]));
  }
  fadeEnds(riv, an, [star, arrHead, arrShaft, ...hearts.flat(), t1Dot, t1, t2Dot, t2, t3Dot, t3, t4Dot, t4, w1, w2], D);
  save('noitu', riv);
}

// ---- 39. baucua: 3 XÚC XẮC THÚ LĂN – XU BAY VÀO Ô BẦU (180f = 3s).
// 3 xúc xắc lắc rồi dừng ở Bầu/Cua/Cá; 3 xu bay vào ô Bầu + sao vàng.
{
  const { riv, ab, root } = newFile('baucua');
  const D = 180;
  const GREEN = hex('#3E9B4F');
  // Sao vàng trên xúc xắc.
  const star = poly(riv, root, { name: 'Star', cx: 200, cy: 32, points: starPoints(200, 32, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // 3 xu bay vào ô Bầu.
  const coins = [[95, 158], [105, 164], [88, 166]].map(([x, y], i) => coin(riv, root, x, y, 8));
  // Xúc xắc 1: Bầu (quả bầu xanh: 2 bầu tròn + cuống) — chi tiết TRƯỚC mặt xúc xắc.
  const gourdTop = ell(riv, root, { name: 'GourdTop', x: 120, y: 68, w: 14, color: GREEN, stroke: INK, strokeW: 1 });
  const gourdBot = ell(riv, root, { name: 'GourdBot', x: 120, y: 80, w: 20, color: GREEN, stroke: INK, strokeW: 1 });
  const gourdStem = rect(riv, root, { name: 'GourdStem', x: 120, y: 58, w: 4, h: 6, color: INK });
  const d1 = rect(riv, root, { name: 'D1', x: 120, y: 75, w: 44, h: 44, r: 8, color: CREAM, stroke: INK, strokeW: 2 });
  // Xúc xắc 2: Cua (thân đỏ + 2 càng + 2 mắt).
  const crabClaw1 = ell(riv, root, { name: 'Claw1', x: 188, y: 70, w: 9, color: RED, stroke: INK, strokeW: 1 });
  const crabClaw2 = ell(riv, root, { name: 'Claw2', x: 212, y: 70, w: 9, color: RED, stroke: INK, strokeW: 1 });
  const crabEye1 = ell(riv, root, { name: 'CEye1', x: 194, y: 68, w: 4, color: INK });
  const crabEye2 = ell(riv, root, { name: 'CEye2', x: 206, y: 68, w: 4, color: INK });
  const crabBody = ell(riv, root, { name: 'CrabBody', x: 200, y: 78, w: 26, h: 16, color: RED, stroke: INK, strokeW: 2 });
  const d2 = rect(riv, root, { name: 'D2', x: 200, y: 75, w: 44, h: 44, r: 8, color: CREAM, stroke: INK, strokeW: 2 });
  // Xúc xắc 3: Cá (thân xanh + đuôi + mắt).
  const fishTail = poly(riv, root, { name: 'FishTail', cx: 296, cy: 75, points: [[290, 68], [290, 82], [300, 75]], color: BLUE, stroke: INK, strokeW: 1 });
  const fishEye = ell(riv, root, { name: 'FishEye', x: 272, y: 72, w: 4, color: INK });
  const fishBody = ell(riv, root, { name: 'FishBody', x: 280, y: 75, w: 26, h: 14, color: BLUE, stroke: INK, strokeW: 2 });
  const d3 = rect(riv, root, { name: 'D3', x: 280, y: 75, w: 44, h: 44, r: 8, color: CREAM, stroke: INK, strokeW: 2 });
  const dice = [[gourdTop, gourdBot, gourdStem, d1], [crabClaw1, crabClaw2, crabEye1, crabEye2, crabBody, d2], [fishTail, fishEye, fishBody, d3]];
  // Bàn cược 6 ô (Bầu/Cua/Cá/Gà/Nai/Tôm) — hình con tạo TRƯỚC ô (trên cùng).
  const bGourd1 = ell(riv, root, { name: 'BG1', x: 95, y: 152, w: 10, color: GREEN, stroke: INK, strokeW: 1 });
  const bGourd2 = ell(riv, root, { name: 'BG2', x: 95, y: 162, w: 13, color: GREEN, stroke: INK, strokeW: 1 });
  const bCrabBody = ell(riv, root, { name: 'BCrab', x: 135, y: 160, w: 16, h: 10, color: RED, stroke: INK, strokeW: 1 });
  const bCrabClaw1 = ell(riv, root, { name: 'BClaw1', x: 128, y: 152, w: 5, color: RED });
  const bCrabClaw2 = ell(riv, root, { name: 'BClaw2', x: 142, y: 152, w: 5, color: RED });
  const bFishBody = ell(riv, root, { name: 'BFish', x: 175, y: 158, w: 16, h: 9, color: BLUE, stroke: INK, strokeW: 1 });
  const bFishTail = poly(riv, root, { name: 'BFishTail', cx: 184, cy: 158, points: [[182, 154], [182, 162], [187, 158]], color: BLUE, stroke: INK, strokeW: 1 });
  const bRoosterBody = ell(riv, root, { name: 'BRooster', x: 215, y: 160, w: 15, h: 10, color: YELLOW, stroke: INK, strokeW: 1 });
  const bRoosterComb = poly(riv, root, { name: 'BComb', cx: 215, cy: 150, points: [[212, 152], [215, 146], [218, 152]], color: RED, stroke: INK, strokeW: 1 });
  const bDeerBody = ell(riv, root, { name: 'BDeer', x: 255, y: 160, w: 16, h: 10, color: SAND2, stroke: INK, strokeW: 1 });
  const bDeerAnt = poly(riv, root, { name: 'BAnt', cx: 255, cy: 150, points: [[250, 152], [253, 146], [256, 152]], color: INK });
  const bShrimp1 = ell(riv, root, { name: 'BShrimp1', x: 292, y: 156, w: 9, color: hex('#FF8C42'), stroke: INK, strokeW: 1 });
  const bShrimp2 = ell(riv, root, { name: 'BShrimp2', x: 298, y: 161, w: 9, color: hex('#FF8C42'), stroke: INK, strokeW: 1 });
  const betGlyphs = [bGourd1, bGourd2, bCrabBody, bCrabClaw1, bCrabClaw2, bFishBody, bFishTail, bRoosterBody, bRoosterComb, bDeerBody, bDeerAnt, bShrimp1, bShrimp2];
  const betSquares = [95, 135, 175, 215, 255, 295].map((x, i) =>
    rect(riv, root, { name: 'Bet' + i, x, y: 158, w: 34, h: 34, r: 4, color: CREAM, stroke: INK, strokeW: 2 }));
  const betBoard = rect(riv, root, { name: 'BetBoard', x: 195, y: 158, w: 240, h: 44, r: 6, color: SAND, stroke: INK, strokeW: 2 });
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // 3 xúc xắc lắc qua lại + nảy nhẹ (0-60), dừng ở 70.
  for (const die of dice) {
    for (const p of die) {
      keys(riv, an, p.id, ROT, [[0, 0], [15, 0.35], [30, -0.35], [45, 0.3], [60, 0], [D, 0]]);
    }
    shift(riv, an, die, [[0, 0], [D, 0]], [[0, 0], [20, -6], [40, -6], [60, 0], [D, 0]]);
  }
  // 3 xu bay từ dưới lên ô Bầu (mỗi xu lệch nhau 12f).
  coins.forEach((c, i) => {
    const t0 = 75 + i * 12;
    shift(riv, an, c, [[0, 0], [D, 0]], [[0, 50], [t0, 50], [t0 + 20, 0], [D, 0]]);
  });
  // Sao vàng bật (120-140).
  keys(riv, an, star.id, SX, [[0, 0], [120, 0], [131, 1.2], [140, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [120, 0], [131, 1.2], [140, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...coins.flat(), ...dice.flat(), ...betGlyphs, ...betSquares, betBoard], D);
  save('baucua', riv);
}

// ---- 40. giandiep: LẬT LÁ VAI TRÒ – TÌM GIÁN ĐIỆP (180f = 3s).
// 2 lá vai trò úp: lá 1 lật thành Dân (người xanh), lá 2 lật thành Gián điệp
// (mặt nạ mực + mũ đỏ), vòng ngắm đỏ chớp quanh lá gián điệp + sao vàng.
{
  const { riv, ab, root } = newFile('giandiep');
  const D = 180;
  // Sao vàng.
  const star = poly(riv, root, { name: 'Star', cx: 200, cy: 42, points: starPoints(200, 42, 13), color: GOLD, stroke: INK, strokeW: 2 });
  // Vòng ngắm đỏ quanh lá gián điệp (viền đỏ, ruột trong suốt).
  const ring = ell(riv, root, { name: 'Ring', x: 250, y: 105, w: 66, h: 86, color: rgba(255, 90, 96, 0), stroke: RED, strokeW: 3 });
  // Dân: đầu + vai xanh — hiện sau khi lá 1 lật.
  const civHead = ell(riv, root, { name: 'CivHead', x: 150, y: 88, w: 18, color: TEAL, stroke: INK, strokeW: 2 });
  const civBody = poly(riv, root, { name: 'CivBody', cx: 150, cy: 118, points: [[138, 122], [162, 122], [168, 132], [132, 132]], color: TEAL, stroke: INK, strokeW: 2 });
  // Gián điệp: mũ đỏ + mặt nạ mực + 2 mắt trắng — hiện sau khi lá 2 lật.
  const spyHat = poly(riv, root, { name: 'SpyHat', cx: 250, cy: 82, points: [[234, 88], [266, 88], [260, 74], [240, 74]], color: RED, stroke: INK, strokeW: 2 });
  const spyEye1 = ell(riv, root, { name: 'SpyEye1', x: 243, y: 102, w: 6, color: WHITE });
  const spyEye2 = ell(riv, root, { name: 'SpyEye2', x: 257, y: 102, w: 6, color: WHITE });
  const spyMask = rect(riv, root, { name: 'SpyMask', x: 250, y: 102, w: 32, h: 14, r: 6, color: INK });
  // 2 lá vai trò úp.
  const c1 = card(riv, root, 150, 105, 50, 70, { back: RED, suit: 'heart', suitColor: TEAL });
  const c2 = card(riv, root, 250, 105, 50, 70, { back: BLUE, suit: 'spade', suitColor: INK });
  // 2 người chơi khác (avatar tròn) dưới cùng.
  const av1 = ell(riv, root, { name: 'Av1', x: 140, y: 172, w: 16, color: CREAM, stroke: INK, strokeW: 2 });
  const av2 = ell(riv, root, { name: 'Av2', x: 260, y: 172, w: 16, color: CREAM, stroke: INK, strokeW: 2 });
  bg(riv, root, NIGHT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Lá 1 lật (15-45), dân hiện (45-60).
  flipCard(riv, an, c1, 15, 30, 45, D);
  const popParts = (parts, t) => { for (const p of parts) { keys(riv, an, p.id, SX, [[0, 0], [t, 0], [t + 8, 1.15], [t + 14, 1], [D, 1]]); keys(riv, an, p.id, SY, [[0, 0], [t, 0], [t + 8, 1.15], [t + 14, 1], [D, 1]]); } };
  popParts([civHead, civBody], 45);
  // Lá 2 lật (60-90), gián điệp hiện (90-105).
  flipCard(riv, an, c2, 60, 75, 90, D);
  popParts([spyHat, spyEye1, spyEye2, spyMask], 90);
  // Vòng ngắm chớp (105-155): nở 1 -> 1.08 rồi về.
  keys(riv, an, ring.id, SX, [[0, 0], [105, 0], [115, 1], [125, 1.08], [135, 1], [145, 1.08], [155, 1], [D, 1]]);
  keys(riv, an, ring.id, SY, [[0, 0], [105, 0], [115, 1], [125, 1.08], [135, 1], [145, 1.08], [155, 1], [D, 1]]);
  // Sao vàng bật (120-140).
  keys(riv, an, star.id, SX, [[0, 0], [120, 0], [131, 1.2], [140, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [120, 0], [131, 1.2], [140, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ring, civHead, civBody, spyHat, spyEye1, spyEye2, spyMask, ...c1.all, ...c2.all, av1, av2], D);
  save('giandiep', riv);
}

// ---- 41. codam: NHẢY ĂN QUÂN (180f = 3s).
// Bàn 8×8 (hiện 5×5 ô): quân đỏ nhảy qua quân đen ăn 1 quân, sao vàng.
{
  const { riv, ab, root } = newFile('codam');
  const D = 180;
  // Sao vàng ở góc phải trên.
  const star = poly(riv, root, { name: 'Star', cx: 300, cy: 40, points: starPoints(300, 40, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Quân đỏ nhảy (đĩa 3 lớp) — bóng đi theo trên mặt bàn.
  const [rDot, rIn, rOut] = disc(riv, root, 140, 130, RED, hex('#FF9A94'), INK);
  const red = [rDot, rIn, rOut];
  const shadow = ell(riv, root, { name: 'Shadow', x: 140, y: 138, w: 24, h: 7, color: SHADOW });
  // Quân đen bị ăn (mờ dần khi đỏ nhảy qua).
  const [bDot, bIn, bOut] = disc(riv, root, 170, 100, INK, hex('#5A4A6A'), CREAM);
  const black = [bDot, bIn, bOut];
  // 2 quân đứng yên (1 đỏ, 1 đen) — chỉ đặt trên ô TỐI.
  const [r2Dot, r2In, r2Out] = disc(riv, root, 230, 160, RED, hex('#FF9A94'), INK);
  const [b2Dot, b2In, b2Out] = disc(riv, root, 170, 40, INK, hex('#5A4A6A'), CREAM);
  // Ô tối của bàn (tạo trước quân = dưới quân; ô sáng là nền bàn kem).
  const darkCells = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    if ((r + c) % 2 === 1) darkCells.push(rect(riv, root, { name: 'Cell' + r + '_' + c, x: 140 + c * 30, y: 40 + r * 30, w: 30, h: 30, color: hex('#7A5C33') }));
  }
  const board = rect(riv, root, { name: 'Board', x: 200, y: 100, w: 150, h: 150, color: CREAM, stroke: INK, strokeW: 3 });
  bg(riv, root, SAND);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Đỏ nhảy từ (140,130) qua đen (170,100) tới (200,70) rồi Ở LẠI ô đáp tới 150f.
  // KHÔNG dùng hopFrames: nó tự chèn key "dịch về ô đầu" ở hopEnd+6..+9 (để tàng
  // hình về đầu vòng) — quân đỏ sẽ trượt về ô xuất phát ngay sau khi đáp.
  const jumpX = [[0, 0], [24, 30], [40, 60], [D, 60]];
  const jumpY = [[0, 0], [24, -56], [40, -60], [D, -60]];
  const jumpSq = [[0, 1], [38, 1], [40, 0.8], [43, 1], [D, 1]];
  const shX = [[0, 140], [40, 200], [D, 200]];
  const shY = [[0, 138], [40, 78], [D, 78]];
  const shSX = [[0, 1], [24, 0.7], [40, 1], [D, 1]];
  // Quân đỏ Ở LẠI ô đáp tới 150f (kết quả nước ăn nhìn thấy rõ), mờ dần 150-155,
  // tàng hình qua mối nối vòng lặp rồi hiện lại ở ô xuất phát (frame 0).
  const stayOp = [[0, 1], [150, 1], [155, 0], [D, 0]];
  shift(riv, an, red, jumpX, jumpY);
  for (const p of red) {
    keys(riv, an, p.id, SY, jumpSq);
    keys(riv, an, p.id, OPACITY, stayOp, 'linear');
  }
  keys(riv, an, shadow.id, X, shX);
  keys(riv, an, shadow.id, Y, shY);
  keys(riv, an, shadow.id, SX, shSX);
  keys(riv, an, shadow.id, OPACITY, stayOp, 'linear');
  // Đen mờ dần khi đỏ nhảy qua (30-45).
  for (const p of black) keys(riv, an, p.id, OPACITY, [[0, 1], [30, 1], [45, 0], [D, 0]], 'linear');
  // Sao vàng bật khi ăn xong (60-80).
  keys(riv, an, star.id, SX, [[0, 0], [60, 0], [71, 1.2], [80, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [60, 0], [71, 1.2], [80, 1], [D, 1]]);
  fadeEnds(riv, an, [star, r2Dot, r2In, r2Out, b2Dot, b2In, b2Out, ...darkCells, board], D);
  save('codam', riv);
}

// ---- 42. lieng: SÁP 3 CON 7 – HỐT GÀ (180f = 3s).
// 3 lá lật lần lượt thành Sáp (7♥, 7♠, 7♦); 3 xu bay vào pot + sao vàng.
{
  const { riv, ab, root } = newFile('lieng');
  const D = 180;
  // Sao vàng.
  const star = poly(riv, root, { name: 'Star', cx: 200, cy: 38, points: starPoints(200, 38, 13), color: GOLD, stroke: INK, strokeW: 2 });
  // 3 xu bay vào pot.
  const coins = [[182, 158], [200, 162], [218, 158]].map(([x, y], i) => coin(riv, root, x, y, 9));
  // 3 lá Sáp (lật lần lượt).
  const c1 = card(riv, root, 140, 95, 44, 60, { back: RED, suit: 'heart', suitColor: RED, pips: 7 });
  const c2 = card(riv, root, 200, 95, 44, 60, { back: RED, suit: 'spade', suitColor: INK, pips: 7 });
  const c3 = card(riv, root, 260, 95, 44, 60, { back: RED, suit: 'diamond', suitColor: RED, pips: 7 });
  // Pot (vòng vàng) dưới bàn.
  const pot = ell(riv, root, { name: 'Pot', x: 200, y: 160, w: 100, h: 28, color: GOLD, stroke: COIN_D, strokeW: 2 });
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  flipCard(riv, an, c1, 10, 25, 40, D);
  flipCard(riv, an, c2, 35, 50, 65, D);
  flipCard(riv, an, c3, 60, 75, 90, D);
  // 3 xu bay từ dưới lên pot (mỗi xu lệch nhau 12f).
  coins.forEach((c, i) => {
    const t0 = 95 + i * 12;
    shift(riv, an, c, [[0, 0], [D, 0]], [[0, 50], [t0, 50], [t0 + 20, 0], [D, 0]]);
  });
  // Sao vàng bật (130-150).
  keys(riv, an, star.id, SX, [[0, 0], [130, 0], [141, 1.2], [150, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [130, 0], [141, 1.2], [150, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...coins.flat(), ...c1.all, ...c2.all, ...c3.all, pot], D);
  save('lieng', riv);
}

// ---- 43. maubinh: XẾP 3 CHI – LẬT CHI GIỮA (180f = 3s).
// 13 lá xếp 3 chi (Đầu 3 – Giữa 5 – Cuối 5); chi giữa lật ngửa lần lượt + sao vàng.
{
  const { riv, ab, root } = newFile('maubinh');
  const D = 180;
  // Sao vàng góc phải (cạnh chi cuối).
  const star = poly(riv, root, { name: 'Star', cx: 318, cy: 135, points: starPoints(318, 135, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Chi giữa (5 lá) lật ngửa lần lượt.
  const mid = [
    card(riv, root, 120, 100, 36, 50, { back: RED, suit: 'heart', suitColor: RED, pips: 2 }),
    card(riv, root, 160, 100, 36, 50, { back: RED, suit: 'spade', suitColor: INK, pips: 3 }),
    card(riv, root, 200, 100, 36, 50, { back: RED, suit: 'diamond', suitColor: RED, pips: 4 }),
    card(riv, root, 240, 100, 36, 50, { back: RED, suit: 'club', suitColor: INK, pips: 2 }),
    card(riv, root, 280, 100, 36, 50, { back: RED, suit: 'heart', suitColor: RED, pips: 5 }),
  ];
  // Chi đầu (3 lá úp) + chi cuối (5 lá úp).
  const top = [160, 200, 240].map(x => card(riv, root, x, 45, 36, 50, { back: RED }));
  const bot = [120, 160, 200, 240, 280].map(x => card(riv, root, x, 155, 36, 50, { back: BLUE }));
  bg(riv, root, FELT_D);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  mid.forEach((c, i) => flipCard(riv, an, c, 10 + i * 15, 22 + i * 15, 34 + i * 15, D));
  // Sao vàng bật khi lật xong chi giữa (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...mid.flatMap(c => c.all), ...top.flatMap(c => c.all), ...bot.flatMap(c => c.all)], D);
  save('maubinh', riv);
}

// ---- 44. xito: 2 LÁ TẨY + 5 LÁ CHUNG LẬT DẦN (180f = 3s).
// 2 lá tẩy lật ngửa, Flop 3 lá -> Turn -> River, chip trượt vào pot + sao vàng.
{
  const { riv, ab, root } = newFile('xito');
  const D = 180;
  // Sao vàng trên bàn.
  const star = poly(riv, root, { name: 'Star', cx: 200, cy: 32, points: starPoints(200, 32, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Chip: chồng 3 chip ở pot + 2 chip trượt vào.
  const pile = [chip(riv, root, 308, 152, 10, RED), chip(riv, root, 308, 144, 10, BLUE), chip(riv, root, 308, 136, 10, YELLOW)];
  const slide1 = chip(riv, root, 292, 152, 10, TEAL);
  const slide2 = chip(riv, root, 292, 142, 10, LAVENDER);
  // 2 lá tẩy (hơi xòe khi lật xong).
  const h1 = card(riv, root, 172, 152, 40, 56, { back: RED, suit: 'heart', suitColor: RED });
  const h2 = card(riv, root, 214, 152, 40, 56, { back: RED, suit: 'crown', suitColor: GOLD });
  // 5 lá chung: Flop 3 -> Turn -> River.
  const f1 = card(riv, root, 120, 72, 36, 50, { back: RED, suit: 'spade', suitColor: INK });
  const f2 = card(riv, root, 160, 72, 36, 50, { back: RED, suit: 'crown', suitColor: GOLD });
  const f3 = card(riv, root, 200, 72, 36, 50, { back: RED, suit: 'diamond', suitColor: RED });
  const turn = card(riv, root, 240, 72, 36, 50, { back: RED, suit: 'crown', suitColor: GOLD });
  const river = card(riv, root, 280, 72, 36, 50, { back: RED, suit: 'heart', suitColor: RED, pips: 5 });
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Lá tẩy lật ngửa (10-42), hơi xòe khi lật xong.
  flipCard(riv, an, h1, 10, 22, 34, D);
  flipCard(riv, an, h2, 18, 30, 42, D);
  for (const p of h1.all) keys(riv, an, p.id, ROT, [[0, 0], [34, 0], [42, -0.1], [D, -0.1]]);
  for (const p of h2.all) keys(riv, an, p.id, ROT, [[0, 0], [42, 0], [50, 0.1], [D, 0.1]]);
  // Flop 3 lá (45-83), Turn (85-105), River (108-128).
  flipCard(riv, an, f1, 45, 57, 69, D);
  flipCard(riv, an, f2, 52, 64, 76, D);
  flipCard(riv, an, f3, 59, 71, 83, D);
  flipCard(riv, an, turn, 85, 95, 105, D);
  flipCard(riv, an, river, 108, 118, 128, D);
  // 2 chip trượt vào pot (125-157).
  shift(riv, an, slide1, [[0, -200], [125, -200], [150, 0], [D, 0]], [[0, 0], [D, 0]]);
  shift(riv, an, slide2, [[0, -200], [132, -200], [157, 0], [D, 0]], [[0, 0], [D, 0]]);
  // Sao vàng bật (140-160).
  keys(riv, an, star.id, SX, [[0, 0], [140, 0], [151, 1.2], [160, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [140, 0], [151, 1.2], [160, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...pile.flat(), ...slide1, ...slide2, ...h1.all, ...h2.all, ...f1.all, ...f2.all, ...f3.all, ...turn.all, ...river.all], D);
  save('xito', riv);
}

// ---- 45. colat: ĐẶT QUÂN – LẬT HÀNG (180f = 3s).
// Bàn 6×6: quân đen mới đặt xuống (1,2) làm lật 2 quân trắng (2,2),(3,2)
// thành đen (neo đen ở (4,2)), sao vàng bật lên.
{
  const { riv, ab, root } = newFile('colat');
  const D = 180;
  const OX = 122, OY = 22, CELL = 26;
  const cc = (c, r) => [OX + CELL / 2 + c * CELL, OY + CELL / 2 + r * CELL];
  const star = poly(riv, root, { name: 'Star', cx: 306, cy: 40, points: starPoints(306, 40, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Quân mới đặt (đen) ở (1,2) — bật lên 20-34.
  const [nDot, nIn, nOut] = disc(riv, root, ...cc(1, 2), INK, hex('#5A4A6A'), CREAM);
  const newDisc = [nDot, nIn, nOut];
  // 2 quân trắng bị lật + 2 quân đen hiện ra ở cùng ô.
  const flipCells = [[2, 2, 50, 65], [3, 2, 65, 80]];
  const flipW = [], flipB = [];
  for (const [c, r] of flipCells) {
    const [x, y] = cc(c, r);
    const [wDot, wIn, wOut] = disc(riv, root, x, y, WHITE, hex('#E8E0D0'), INK);
    const [bDot, bIn, bOut] = disc(riv, root, x, y, INK, hex('#5A4A6A'), CREAM);
    flipW.push([wDot, wIn, wOut]); flipB.push([bDot, bIn, bOut]);
  }
  // Quân neo đen (4,2) + quân tĩnh khác.
  const statics = [];
  const staticPos = [[4, 2, 'B'], [2, 3, 'W'], [3, 3, 'B'], [4, 3, 'W'], [2, 4, 'B'], [3, 4, 'W'], [5, 2, 'W'], [1, 4, 'B']];
  for (const [c, r, k] of staticPos) {
    const [x, y] = cc(c, r);
    statics.push(k === 'B' ? disc(riv, root, x, y, INK, hex('#5A4A6A'), CREAM) : disc(riv, root, x, y, WHITE, hex('#E8E0D0'), INK));
  }
  // Ô bàn xen kẽ (tạo sau quân = dưới quân) + khung bàn.
  const cells = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
    cells.push(rect(riv, root, { name: 'Cell' + r + '_' + c, x: OX + c * CELL + CELL / 2, y: OY + r * CELL + CELL / 2, w: CELL, h: CELL, color: (r + c) % 2 ? FELT : hex('#2A9D6E') }));
  }
  const board = rect(riv, root, { name: 'Board', x: 200, y: 100, w: 164, h: 164, color: hex('#0F5C3F'), stroke: INK, strokeW: 3 });
  bg(riv, root, SAND);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Quân mới bật lên (20-34).
  for (const p of newDisc) {
    keys(riv, an, p.id, SX, [[0, 0], [20, 0], [28, 1.15], [34, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [20, 0], [28, 1.15], [34, 1], [D, 1]]);
  }
  // Lật từng quân (trắng mờ -> đen hiện), mờ vào cùng cảnh 0-6.
  flipCells.forEach(([, , t0, t1], i) => {
    for (const p of flipW[i]) keys(riv, an, p.id, OPACITY, [[0, 0], [6, 1], [t0, 1], [t1, 0], [D, 0]], 'linear');
    for (const p of flipB[i]) keys(riv, an, p.id, OPACITY, [[0, 0], [t0, 0], [t1, 1], [168, 1], [D, 0]], 'linear');
  });
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...newDisc, ...statics.flat(), ...cells, board], D);
  save('colat', riv);
}

// ---- 46. domino: GHÉP QUÂN TRÙNG SỐ (180f = 3s).
// Quân 6-3 đứng sẵn, quân 3-5 trượt vào khớp số 3, vòng vàng + sao bật lên.
{
  const { riv, ab, root } = newFile('domino');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 306, cy: 42, points: starPoints(306, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Chấm domino theo số (nửa 36×36, chấm w7).
  const pipPos = {
    1: [[0, 0]], 2: [[-9, -9], [9, 9]], 3: [[-9, -9], [0, 0], [9, 9]],
    4: [[-9, -9], [9, -9], [-9, 9], [9, 9]], 5: [[-9, -9], [9, -9], [0, 0], [-9, 9], [9, 9]],
    6: [[-9, -10], [9, -10], [-9, 0], [9, 0], [-9, 10], [9, 10]],
  };
  const mkTile = (cx, cy, left, right) => {
    const parts = [];
    for (const [dx, dy] of pipPos[left]) parts.push(ell(riv, root, { name: 'Pip', x: cx - 18 + dx, y: cy + dy, w: 7, color: INK }));
    for (const [dx, dy] of pipPos[right]) parts.push(ell(riv, root, { name: 'Pip', x: cx + 18 + dx, y: cy + dy, w: 7, color: INK }));
    parts.push(rect(riv, root, { name: 'Div', x: cx, y: cy, w: 2, h: 32, color: INK }));
    parts.push(rect(riv, root, { name: 'Tile', x: cx, y: cy, w: 72, h: 36, r: 6, color: CREAM, stroke: INK, strokeW: 2 }));
    return parts;
  };
  const tileA = mkTile(148, 100, 6, 3);
  const tileB = mkTile(224, 100, 3, 5);
  // Vòng vàng quanh chỗ khớp số 3 (giữa 2 quân, x=186).
  const ring = ell(riv, root, { name: 'Ring', x: 186, y: 100, w: 40, h: 40, color: rgba(255, 90, 96, 0), stroke: GOLD, strokeW: 3 });
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Quân A bật lên đầu vòng (0-14).
  for (const p of tileA) {
    keys(riv, an, p.id, SX, [[0, 0], [8, 1.1], [14, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [8, 1.1], [14, 1], [D, 1]]);
  }
  // Quân B trượt từ phải vào (20-60), nảy nhẹ khi khớp.
  shift(riv, an, tileB, [[0, 160], [20, 160], [58, 0], [64, 5], [70, 0], [D, 0]], [[0, 0], [D, 0]]);
  // Vòng vàng bật khi khớp (70-90), sao vàng (100-120).
  keys(riv, an, ring.id, SX, [[0, 0], [70, 0], [80, 1.15], [90, 1], [D, 1]]);
  keys(riv, an, ring.id, SY, [[0, 0], [70, 0], [80, 1.15], [90, 1], [D, 1]]);
  keys(riv, an, star.id, SX, [[0, 0], [100, 0], [111, 1.2], [120, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [100, 0], [111, 1.2], [120, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ring, ...tileA, ...tileB], D);
  save('domino', riv);
}

// ---- 47. connect4: THẢ QUÂN – 4 ĐỎ DỌC THẮNG (180f = 3s).
// Đỏ/vàng thả xen kẽ, đỏ đủ 4 dọc cột 2 -> vạch thắng + sao vàng.
{
  const { riv, ab, root } = newFile('connect4');
  const D = 180;
  const OX = 123, OY = 34, CELL = 22;
  const cc = (c, r) => [OX + CELL / 2 + c * CELL, OY + CELL / 2 + r * CELL];
  const star = poly(riv, root, { name: 'Star', cx: 300, cy: 42, points: starPoints(300, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // 7 lượt thả: đỏ cột 2 x4, vàng xen kẽ cột 0/1/3.
  const drops = [
    ['R', 2, 5, 20], ['Y', 0, 5, 38], ['R', 2, 4, 56], ['Y', 1, 5, 74],
    ['R', 2, 3, 92], ['Y', 3, 5, 110], ['R', 2, 2, 128],
  ];
  const discs = [];
  for (const [k, c, r, t] of drops) {
    const [x, y] = cc(c, r);
    const outer = ell(riv, root, { name: 'DOut', x, y: -20, w: 18, color: k === 'R' ? RED : YELLOW, stroke: INK, strokeW: 1 });
    const inner = ell(riv, root, { name: 'DIn', x, y: -20, w: 8, color: k === 'R' ? hex('#FF9A94') : hex('#FFE9A8') });
    discs.push({ parts: [inner, outer], y, t });
  }
  // Vạch thắng dọc cột 2 (tâm x=178, y 89..155).
  const win = rect(riv, root, { name: 'Win', x: 178, y: 122, w: 6, h: 76, r: 3, color: RED });
  // Lỗ trên bàn (7×6, tạo sau quân = dưới quân) + khung bàn vàng.
  const holes = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
    const [x, y] = cc(c, r);
    holes.push(ell(riv, root, { name: 'Hole', x, y, w: 18, color: hex('#2B4C7E') }));
  }
  const board = rect(riv, root, { name: 'Board', x: 200, y: 100, w: 160, h: 138, color: YELLOW, stroke: INK, strokeW: 3 });
  bg(riv, root, hex('#9CC8E8'));
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  for (const d of discs) {
    for (const p of d.parts) {
      keys(riv, an, p.id, Y, [[0, -20], [d.t - 6, d.y - 14], [d.t, d.y + 5], [d.t + 4, d.y], [D, d.y]]);
      keys(riv, an, p.id, SY, [[0, 1], [d.t, 1], [d.t + 1, 0.75], [d.t + 5, 1], [D, 1]]);
    }
  }
  // Vạch thắng kéo dài (140-155) + sao bật (150-168).
  keys(riv, an, win.id, SY, [[0, 0], [140, 0], [155, 1], [D, 1]]);
  keys(riv, an, star.id, SX, [[0, 0], [150, 0], [160, 1.2], [168, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [150, 0], [160, 1.2], [168, 1], [D, 1]]);
  fadeEnds(riv, an, [star, win, ...discs.flatMap(d => d.parts), ...holes, board], D);
  save('connect4', riv);
}

// ---- 48. matthu: GỢI Ý – ĐOÁN ĐÚNG 2 LÁ (180f = 3s).
// Lưới 5×5 lá từ: 2 lá lật lên đúng phe mình (ngọc) -> sao vàng.
{
  const { riv, ab, root } = newFile('matthu');
  const D = 180;
  const OX = 124, OY = 39, CW = 28, CH = 22, GAP = 3;
  const cc = (c, r) => [OX + (CW + GAP) / 2 + c * (CW + GAP), OY + (CH + GAP) / 2 + r * (CH + GAP)];
  const star = poly(riv, root, { name: 'Star', cx: 310, cy: 46, points: starPoints(310, 46, 12), color: GOLD, stroke: INK, strokeW: 2 });
  const mkWord = (cx, cy) => {
    const dot = ell(riv, root, { name: 'WDot', x: cx, y: cy, w: 5, color: INK });
    const bgr = rect(riv, root, { name: 'WBg', x: cx, y: cy, w: CW, h: CH, r: 3, color: CREAM });
    const dot2 = ell(riv, root, { name: 'WDot2', x: cx, y: cy, w: 6, color: WHITE });
    const bgr2 = rect(riv, root, { name: 'WBg2', x: cx, y: cy, w: CW, h: CH, r: 3, color: TEAL });
    return { back: [dot, bgr], face: [dot2, bgr2], all: [dot, bgr, dot2, bgr2] };
  };
  const targets = [[1, 1, 20], [3, 2, 45]];
  const cards = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const [x, y] = cc(c, r);
    cards.push({ c, r, card: mkWord(x, y) });
  }
  bg(riv, root, NIGHT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  for (const [tc, tr, t0] of targets) {
    const cd = cards.find(k => k.c === tc && k.r === tr);
    flipCard(riv, an, cd.card, t0, t0 + 10, t0 + 20, D);
  }
  // Sao vàng bật (100-120).
  keys(riv, an, star.id, SX, [[0, 0], [100, 0], [111, 1.2], [120, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [100, 0], [111, 1.2], [120, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...cards.flatMap(k => k.card.all)], D);
  save('matthu', riv);
}

// ---- 49. avalon: LẬT VAI TRÒ – NHIỆM VỤ THÀNH CÔNG (180f = 3s).
// 3 lá vai trò lật lần lượt (Merlin vương miện, Sát thủ bích đỏ, Dân tim
// xanh) + đĩa nhiệm vụ xanh bật lên + sao vàng.
{
  const { riv, ab, root } = newFile('avalon');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 40, points: starPoints(316, 40, 12), color: GOLD, stroke: INK, strokeW: 2 });
  const merlin = card(riv, root, 130, 92, 44, 62, { back: VIOLET, suit: 'crown', suitColor: GOLD });
  const assassin = card(riv, root, 200, 92, 44, 62, { back: RED, suit: 'spade', suitColor: RED });
  const citizen = card(riv, root, 270, 92, 44, 62, { back: BLUE, suit: 'heart', suitColor: BLUE });
  // Đĩa nhiệm vụ: vòng vàng + tâm xanh + dấu tick trắng.
  const tick1 = poly(riv, root, { name: 'T1', cx: 200, cy: 164, points: rotRectPoints(196, 162, 12, 5, Math.PI / 4), color: WHITE });
  const tick2 = poly(riv, root, { name: 'T2', cx: 200, cy: 164, points: rotRectPoints(204, 160, 18, 5, -Math.PI / 4), color: WHITE });
  const discIn = ell(riv, root, { name: 'DIn', x: 200, y: 164, w: 22, color: hex('#3E9B4F') });
  const discOut = ell(riv, root, { name: 'DOut', x: 200, y: 164, w: 30, color: GOLD, stroke: INK, strokeW: 2 });
  bg(riv, root, NIGHT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  flipCard(riv, an, merlin, 15, 27, 39, D);
  flipCard(riv, an, assassin, 40, 52, 64, D);
  flipCard(riv, an, citizen, 65, 77, 89, D);
  // Đĩa nhiệm vụ bật (95-115) + sao vàng (110-130).
  for (const p of [tick1, tick2, discIn, discOut]) {
    keys(riv, an, p.id, SX, [[0, 0], [95, 0], [106, 1.15], [115, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [95, 0], [106, 1.15], [115, 1], [D, 1]]);
  }
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, tick1, tick2, discIn, discOut, ...merlin.all, ...assassin.all, ...citizen.all], D);
  save('avalon', riv);
}

// ---- 50. spyfall: LẬT ĐỊA ĐIỂM – GIÁN ĐIỆP RUNG LẮC (180f = 3s).
// Lá địa điểm lật lên thành bãi biển (mặt trời + sóng), lá gián điệp lật
// lên (mặt nạ) rồi rung lắc, vòng ngắm đỏ chớp + sao vàng.
{
  const { riv, ab, root } = newFile('spyfall');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 312, cy: 42, points: starPoints(312, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Lá địa điểm: mặt sau xanh, mặt trước bãi biển (mặt trời + sóng ngọc).
  const locSun = ell(riv, root, { name: 'Sun', x: 140, y: 82, w: 16, color: YELLOW });
  const locSea = rect(riv, root, { name: 'Sea', x: 150, y: 122, w: 50, h: 20, color: TEAL });
  const locBackDot = ell(riv, root, { name: 'LDot', x: 150, y: 100, w: 12, color: WHITE });
  const locBackIn = rect(riv, root, { name: 'LIn', x: 150, y: 100, w: 44, h: 64, r: 4, color: CREAM });
  const locBackBg = rect(riv, root, { name: 'LBg', x: 150, y: 100, w: 54, h: 74, r: 6, color: BLUE, stroke: INK, strokeW: 2 });
  const locFaceBg = rect(riv, root, { name: 'LFg', x: 150, y: 100, w: 54, h: 74, r: 6, color: CREAM, stroke: INK, strokeW: 2 });
  const loc = { back: [locBackDot, locBackIn, locBackBg], face: [locSun, locSea, locFaceBg], all: [locBackDot, locBackIn, locBackBg, locSun, locSea, locFaceBg] };
  // Lá gián điệp: mặt sau đỏ, mặt trước mặt nạ mực + 2 mắt trắng.
  const spyEye1 = ell(riv, root, { name: 'SE1', x: 242, y: 96, w: 7, color: WHITE });
  const spyEye2 = ell(riv, root, { name: 'SE2', x: 262, y: 96, w: 7, color: WHITE });
  const spyMask = rect(riv, root, { name: 'SMask', x: 252, y: 96, w: 42, h: 13, r: 6, color: INK });
  const spyBackDot = ell(riv, root, { name: 'SDot', x: 252, y: 100, w: 12, color: WHITE });
  const spyBackIn = rect(riv, root, { name: 'SIn', x: 252, y: 100, w: 44, h: 64, r: 4, color: CREAM });
  const spyBackBg = rect(riv, root, { name: 'SBg', x: 252, y: 100, w: 54, h: 74, r: 6, color: RED, stroke: INK, strokeW: 2 });
  const spyFaceBg = rect(riv, root, { name: 'SFg', x: 252, y: 100, w: 54, h: 74, r: 6, color: CREAM, stroke: INK, strokeW: 2 });
  const spy = { back: [spyBackDot, spyBackIn, spyBackBg], face: [spyEye1, spyEye2, spyMask, spyFaceBg], all: [spyBackDot, spyBackIn, spyBackBg, spyEye1, spyEye2, spyMask, spyFaceBg] };
  // Vòng ngắm đỏ quanh lá gián điệp (nền trong suốt + viền đỏ).
  const ring = ell(riv, root, { name: 'Ring', x: 252, y: 100, w: 70, h: 90, color: rgba(255, 90, 96, 0), stroke: RED, strokeW: 3 });
  bg(riv, root, VIOLET);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  flipCard(riv, an, loc, 15, 27, 39, D);
  flipCard(riv, an, spy, 50, 62, 74, D);
  // Gián điệp rung lắc sau khi lật (80-108).
  for (const p of spy.all) keys(riv, an, p.id, ROT, [[0, 0], [80, 0], [84, 0.08], [88, -0.08], [92, 0.08], [96, -0.08], [100, 0.08], [104, -0.08], [108, 0], [D, 0]]);
  // Vòng ngắm chớp (80-160) + sao vàng (120-140).
  keys(riv, an, ring.id, OPACITY, [[0, 0], [80, 0], [90, 1], [100, 0], [110, 1], [120, 0], [130, 1], [140, 0], [150, 1], [160, 0], [D, 0]], 'linear');
  keys(riv, an, star.id, SX, [[0, 0], [120, 0], [131, 1.2], [140, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [120, 0], [131, 1.2], [140, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...loc.all, ...spy.all], D);
  save('spyfall', riv);
}

// ---- 51. sudoku: ĐIỀN ĐÚNG 1 SỐ (180f = 3s).
// Lưới 9×9: 12 số cho sẵn (ô vuông mực), số mới (chấm đỏ) điền đúng vào
// ô trống, hàng + cột sáng lên + sao vàng.
{
  const { riv, ab, root } = newFile('sudoku');
  const D = 180;
  const OX = 128, OY = 28, CELL = 16;
  const cc = (c, r) => [OX + CELL / 2 + c * CELL, OY + CELL / 2 + r * CELL];
  const star = poly(riv, root, { name: 'Star', cx: 308, cy: 44, points: starPoints(308, 44, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Số mới điền: chấm đỏ (vòng trong trắng).
  const nIn = ell(riv, root, { name: 'NIn', x: 216, y: 100, w: 6, color: WHITE });
  const nOut = ell(riv, root, { name: 'NOut', x: 216, y: 100, w: 14, color: RED });
  const newNum = [nIn, nOut];
  // Số cho sẵn: ô vuông mực nhỏ.
  const givens = [];
  for (const [c, r] of [[0, 0], [2, 1], [4, 0], [7, 2], [1, 3], [3, 5], [6, 4], [8, 1], [2, 7], [5, 8], [7, 6], [0, 8]]) {
    const [x, y] = cc(c, r);
    givens.push(rect(riv, root, { name: 'Giv', x, y, w: 6, h: 6, color: INK }));
  }
  // Vạch lưới 9×9 (vạch khối 3×3 đậm hơn).
  const lines = [];
  for (let i = 0; i <= 9; i++) {
    const w = i % 3 === 0 ? 3 : 1;
    lines.push(rect(riv, root, { name: 'VL' + i, x: OX + i * CELL, y: 100, w, h: 144, color: INK }));
    lines.push(rect(riv, root, { name: 'HL' + i, x: 200, y: OY + i * CELL, w: 144, h: w, color: INK }));
  }
  // Hàng + cột của ô mới sáng vàng.
  const hlRow = rect(riv, root, { name: 'HLRow', x: 200, y: 100, w: 144, h: 16, color: hex('#FDE9A8') });
  const hlCol = rect(riv, root, { name: 'HLCol', x: 216, y: 100, w: 16, h: 144, color: hex('#FDE9A8') });
  const board = rect(riv, root, { name: 'Board', x: 200, y: 100, w: 150, h: 150, color: CREAM, stroke: INK, strokeW: 2 });
  bg(riv, root, hex('#DCE9F5'));
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Số mới bật lên (20-38).
  for (const p of newNum) {
    keys(riv, an, p.id, SX, [[0, 0], [20, 0], [29, 1.2], [38, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [20, 0], [29, 1.2], [38, 1], [D, 1]]);
  }
  // Hàng + cột sáng lên (20-30, giữ tới 168) + sao vàng (100-120).
  for (const p of [hlRow, hlCol]) keys(riv, an, p.id, OPACITY, [[0, 0], [20, 0], [30, 0.9], [168, 0.9], [D, 0]], 'linear');
  keys(riv, an, star.id, SX, [[0, 0], [100, 0], [111, 1.2], [120, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [100, 0], [111, 1.2], [120, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...newNum, ...givens, ...lines, board], D);
  save('sudoku', riv);
}

// ---- 52. wordle: ĐOÁN TỪ – LẬT TỪNG Ô XANH/VÀNG/XÁM (180f = 3s).
// Hàng trên: lượt đoán trước (xám/xanh/vàng). Hàng dưới: lượt này lật
// từng ô (xanh/xanh/vàng/xám/xanh) -> đúng từ, sao vàng bật lên.
{
  const { riv, ab, root } = newFile('wordle');
  const D = 180;
  const GREEN = hex('#4CAF50'), GREY = hex('#8A8A8A');
  const star = poly(riv, root, { name: 'Star', cx: 312, cy: 44, points: starPoints(312, 44, 12), color: GOLD, stroke: INK, strokeW: 2 });
  const mkCell = (cx, cy, color) => {
    const dot = ell(riv, root, { name: 'CDot', x: cx, y: cy, w: 6, color: WHITE });
    const bgr = rect(riv, root, { name: 'CBg', x: cx, y: cy, w: 30, h: 30, r: 4, color, stroke: INK, strokeW: 2 });
    return [dot, bgr];
  };
  const mkEmpty = (cx, cy) => {
    const dot = ell(riv, root, { name: 'EDot', x: cx, y: cy, w: 6, color: INK });
    const bgr = rect(riv, root, { name: 'EBg', x: cx, y: cy, w: 30, h: 30, r: 4, color: CREAM, stroke: INK, strokeW: 2 });
    return [dot, bgr];
  };
  // Hàng trên (tĩnh): xám, xanh, vàng, xám, xanh.
  const prevColors = [GREY, GREEN, YELLOW, GREY, GREEN];
  const prevRow = prevColors.map((col, i) => mkCell(132 + i * 34, 58, col));
  // Hàng dưới: lật lần lượt xanh/xanh/vàng/xám/xanh.
  const actColors = [GREEN, GREEN, YELLOW, GREY, GREEN];
  const actRow = [];
  for (let i = 0; i < 5; i++) {
    const cx = 132 + i * 34, cy = 108;
    actRow.push({ back: mkEmpty(cx, cy), face: mkCell(cx, cy, actColors[i]) });
  }
  bg(riv, root, hex('#F0EBDD'));
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  actRow.forEach((cell, i) => {
    const t0 = 15 + i * 15;
    flipCard(riv, an, cell, t0, t0 + 10, t0 + 20, D);
  });
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...prevRow.flat(), ...actRow.flatMap(c => [...c.back, ...c.face])], D);
  save('wordle', riv);
}

// ---- 53. domi: LẬT Ô SỐ 3 + CẮM CỜ VÀO Ô MÌN (180f = 3s).
// Lưới mìn 9×9: con trỏ di chuyển tới ô (4,4) rồi lật lên thành số 3
// (3 chấm đỏ); ô mìn (6,2) hiện mìn rồi cờ đỏ cắm lên + phất nhẹ.
{
  const { riv, ab, root } = newFile('domi');
  const D = 180;
  const OX = 128, OY = 28, CELL = 16;
  const star = poly(riv, root, { name: 'Star', cx: 312, cy: 42, points: starPoints(312, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Con trỏ (tam giác mực) xuất phát ở (140,50).
  const cur = poly(riv, root, { name: 'Cursor', cx: 147, cy: 57, points: [[140, 50], [154, 52], [144, 64]], color: INK });
  // Ô số 3 ở (4,4) = (200,100): ô xanh đậm + 3 chấm đỏ (bật 30-44).
  const nDot1 = ell(riv, root, { name: 'N1', x: 192, y: 100, w: 5, color: RED });
  const nDot2 = ell(riv, root, { name: 'N2', x: 200, y: 100, w: 5, color: RED });
  const nDot3 = ell(riv, root, { name: 'N3', x: 208, y: 100, w: 5, color: RED });
  const numSq = rect(riv, root, { name: 'NumSq', x: 200, y: 100, w: 14, h: 14, color: hex('#2E7D32') });
  // Ô mìn (6,2) = (232,68): mìn mực (tròn + 2 thanh chéo) hiện 55-65.
  const mSp1 = rect(riv, root, { name: 'MSp1', x: 232, y: 68, w: 18, h: 3, color: INK });
  const mSp2 = rect(riv, root, { name: 'MSp2', x: 232, y: 68, w: 3, h: 18, color: INK });
  const mine = ell(riv, root, { name: 'Mine', x: 232, y: 68, w: 13, color: INK });
  // Cờ đỏ cắm vào ô mìn: cột + tam giác, bật 65-80, phất nhẹ sau đó.
  const flagTri = poly(riv, root, { name: 'FTri', cx: 238, cy: 56, points: [[232, 48], [232, 60], [244, 54]], color: RED, stroke: INK, strokeW: 1 });
  const flagPole = rect(riv, root, { name: 'FPole', x: 232, y: 60, w: 3, h: 18, color: INK });
  // 3 ô đã mở sẵn (xanh nhạt + chấm mực): (2,1), (5,4), (7,7).
  const openCells = [];
  for (const [c, r, n] of [[2, 1, 1], [5, 4, 2], [7, 7, 1]]) {
    const x = OX + 8 + c * CELL, y = OY + 8 + r * CELL;
    for (let i = 0; i < n; i++) openCells.push(ell(riv, root, { name: 'OD', x: x - 3 + i * 6, y, w: 4, color: INK }));
    openCells.push(rect(riv, root, { name: 'OSq', x, y, w: 14, h: 14, color: hex('#A8D8A0') }));
  }
  // Lưới 9×9 (8 đường dọc + 8 đường ngang, mỏng, mực).
  const grid = [];
  for (let i = 1; i < 9; i++) {
    grid.push(rect(riv, root, { name: 'GV' + i, x: OX + i * CELL, y: 100, w: 2, h: 144, color: INK }));
    grid.push(rect(riv, root, { name: 'GH' + i, x: 200, y: OY + i * CELL, w: 144, h: 2, color: INK }));
  }
  const board = rect(riv, root, { name: 'Board', x: 200, y: 100, w: 146, h: 146, color: CREAM, stroke: INK, strokeW: 3 });
  bg(riv, root, hex('#1E7A5C'));
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Con trỏ trượt tới ô (4,4) trong 0-40f rồi trượt ra ngoài bàn (40-65f),
  // sau đó nhúc nhích nhẹ tại chỗ (65-180f) để cảnh luôn có chuyển động.
  shift(riv, an, [cur], [[0, 0], [40, 53], [65, 153]], [[0, 0], [40, 43], [65, 113], [80, 109], [95, 113], [110, 109], [125, 113], [140, 109], [155, 113], [170, 109], [D, 113]]);
  // Ô số 3 bật (28-44).
  for (const p of [nDot1, nDot2, nDot3, numSq]) {
    keys(riv, an, p.id, SX, [[0, 0], [28, 0], [36, 1.2], [44, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [28, 0], [36, 1.2], [44, 1], [D, 1]]);
  }
  // Mìn hiện (55-65), cờ bật (65-80) + phất nhẹ (80-180).
  for (const p of [mSp1, mSp2, mine]) {
    keys(riv, an, p.id, SX, [[0, 0], [55, 0], [60, 1.15], [65, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [55, 0], [60, 1.15], [65, 1], [D, 1]]);
  }
  for (const p of [flagTri, flagPole]) {
    keys(riv, an, p.id, SX, [[0, 0], [65, 0], [73, 1.15], [80, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [65, 0], [73, 1.15], [80, 1], [D, 1]]);
  }
  keys(riv, an, flagTri.id, ROT, sineFrames(rangeFrames(80, D, 6), 20, 0.2));
  // Sao vàng bật (110-130) rồi nhấp nhẹ liên tục (130-180) để cảnh luôn đổi pixel.
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [140, 1.12], [150, 1], [160, 1.12], [170, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [140, 1.12], [150, 1], [160, 1.12], [170, 1], [D, 1]]);
  fadeEnds(riv, an, [star, cur, nDot1, nDot2, nDot3, numSq, mSp1, mSp2, mine, flagTri, flagPole, ...openCells, ...grid, board], D);
  save('domi', riv);
}

// ---- 54. s2048: HAI Ô 2 TRƯỢT VÀO NHAU THÀNH Ô 4 (180f = 3s).
// Lưới 4×4: 2 ô 2 (kem, 1 chấm) trượt vào nhau ở hàng 3, hợp thành ô 4
// (vàng, 2 chấm) nảy lên + vòng hào quang; ô 8/16/32 đứng yên.
{
  const { riv, ab, root } = newFile('s2048');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 312, cy: 42, points: starPoints(312, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Ô 4 hợp thành ở (183,117): 2 chấm + nền vàng, bật 40-58.
  const mDot1 = ell(riv, root, { name: 'M1', x: 180, y: 117, w: 5, color: INK });
  const mDot2 = ell(riv, root, { name: 'M2', x: 186, y: 117, w: 5, color: INK });
  const merged = rect(riv, root, { name: 'Merged', x: 183, y: 117, w: 30, h: 30, r: 4, color: hex('#EDE0C8'), stroke: INK, strokeW: 2 });
  // Vòng hào quang quanh ô 4 (viền vàng, trong suốt).
  const glow = rect(riv, root, { name: 'Glow', x: 183, y: 117, w: 38, h: 38, r: 6, color: rgba(232, 169, 61, 0), stroke: GOLD, strokeW: 3 });
  // Ô 2 bên phải (217,117): 1 chấm, mờ đi khi hợp nhất (40-50).
  const bDot = ell(riv, root, { name: 'B1', x: 217, y: 117, w: 5, color: INK });
  const tileB = rect(riv, root, { name: 'TileB', x: 217, y: 117, w: 30, h: 30, r: 4, color: hex('#EEE4DA'), stroke: INK, strokeW: 2 });
  // Ô 2 bên trái (149,117): 1 chấm, trượt sang phải 0-40f rồi mờ (40-50).
  const aDot = ell(riv, root, { name: 'A1', x: 149, y: 117, w: 5, color: INK });
  const tileA = rect(riv, root, { name: 'TileA', x: 149, y: 117, w: 30, h: 30, r: 4, color: hex('#EEE4DA'), stroke: INK, strokeW: 2 });
  // Ô tĩnh: 8 (183,49) 3 chấm, 16 (217,83) 4 chấm, 32 (251,117) 5 chấm.
  const statics = [];
  const mkTile = (cx, cy, color, n) => {
    const parts = [];
    for (let i = 0; i < n; i++) parts.push(ell(riv, root, { name: 'SD', x: cx + (i - (n - 1) / 2) * 6, y: cy, w: 4, color: INK }));
    parts.push(rect(riv, root, { name: 'ST', x: cx, y: cy, w: 30, h: 30, r: 4, color, stroke: INK, strokeW: 2 }));
    return parts;
  };
  statics.push(...mkTile(183, 49, hex('#F2B179'), 3));
  statics.push(...mkTile(217, 83, hex('#F59563'), 4));
  statics.push(...mkTile(251, 117, hex('#F67C5F'), 5));
  // 16 ô lưới (30×30, kem đậm) — tạo TRƯỚC bàn (nằm trên bàn).
  const cells = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++)
    cells.push(rect(riv, root, { name: 'Cell' + r + c, x: 149 + c * 34, y: 49 + r * 34, w: 30, h: 30, r: 4, color: hex('#CDC1B4') }));
  const board = rect(riv, root, { name: 'Board', x: 200, y: 100, w: 140, h: 140, r: 8, color: hex('#BBADA0'), stroke: INK, strokeW: 3 });
  bg(riv, root, SAND);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Ô 2 trái trượt sang phải (0-40f).
  shift(riv, an, [aDot, tileA], [[0, 0], [40, 34]], null);
  // Hai ô 2 mờ đi khi hợp nhất (40-50); ô 4 bật lên (40-58).
  for (const p of [aDot, tileA, bDot, tileB]) keys(riv, an, p.id, OPACITY, [[0, 0], [6, 1], [40, 1], [50, 0], [D, 0]], 'linear');
  for (const p of [mDot1, mDot2, merged]) {
    keys(riv, an, p.id, SX, [[0, 0], [40, 0], [50, 1.25], [58, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [40, 0], [50, 1.25], [58, 1], [D, 1]]);
    keys(riv, an, p.id, OPACITY, [[0, 0], [40, 0], [50, 1], [D - 12, 1], [D, 0]], 'linear');
  }
  keys(riv, an, glow.id, OPACITY, [[0, 0], [45, 0], [55, 1], [75, 1], [85, 0], [D, 0]], 'linear');
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...statics, ...cells, board], D);
  save('s2048', riv);
}

// ---- 55. matchu: HAI LÁ GIỐNG NHAU LẬT LÊN KHỚP NHAU RỒI BIẾN MẤT (180f = 3s).
// 6 lá úp (lưng xanh lá): 2 lá giữa lật lên thành lá trúc giống nhau
// (3 thanh tre + chấm đỏ), sáng vòng vàng rồi biến mất; 4 lá còn lại úp.
{
  const { riv, ab, root } = newFile('matchu');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 312, cy: 42, points: starPoints(312, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Lá trúc: mặt trước = 3 thanh tre xanh + chấm đỏ, nền kem.
  const mkBamboo = (cx, cy) => {
    const back = [];
    back.push(ell(riv, root, { name: 'BDot', x: cx, y: cy, w: 12, color: WHITE }));
    back.push(rect(riv, root, { name: 'BIn', x: cx, y: cy, w: 34, h: 46, r: 4, color: CREAM }));
    back.push(rect(riv, root, { name: 'BBg', x: cx, y: cy, w: 44, h: 56, r: 6, color: hex('#2E7D32'), stroke: INK, strokeW: 2 }));
    const face = [];
    for (const dx of [-10, 0, 10]) face.push(rect(riv, root, { name: 'Bar', x: cx + dx, y: cy, w: 5, h: 24, color: hex('#2E7D32') }));
    face.push(ell(riv, root, { name: 'BD', x: cx, y: cy + 18, w: 6, color: RED }));
    face.push(rect(riv, root, { name: 'FFg', x: cx, y: cy, w: 44, h: 56, r: 6, color: CREAM, stroke: INK, strokeW: 2 }));
    return { back, face, all: [...back, ...face] };
  };
  const m1 = mkBamboo(200, 72);
  const m2 = mkBamboo(200, 132);
  // Vòng vàng quanh 2 lá khớp (viền vàng, trong suốt).
  const ring1 = rect(riv, root, { name: 'Ring1', x: 200, y: 72, w: 52, h: 64, r: 8, color: rgba(250, 205, 51, 0), stroke: GOLD, strokeW: 3 });
  const ring2 = rect(riv, root, { name: 'Ring2', x: 200, y: 132, w: 52, h: 64, r: 8, color: rgba(250, 205, 51, 0), stroke: GOLD, strokeW: 3 });
  // 4 lá úp còn lại (tĩnh).
  const rest = [mkBamboo(140, 72), mkBamboo(260, 72), mkBamboo(140, 132), mkBamboo(260, 132)];
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  flipCard(riv, an, m1, 15, 27, 39, D);
  flipCard(riv, an, m2, 40, 52, 64, D);
  // Vòng vàng sáng (90-100) rồi mờ cùng lá (100-120).
  for (const p of [ring1, ring2]) keys(riv, an, p.id, OPACITY, [[0, 0], [90, 0], [100, 1], [120, 1], [130, 0], [D, 0]], 'linear');
  // 2 lá khớp biến mất (100-120) — key opacity RIÊNG, không dùng fadeEnds.
  for (const p of [...m1.all, ...m2.all]) keys(riv, an, p.id, OPACITY, [[0, 0], [6, 1], [100, 1], [120, 0], [D, 0]], 'linear');
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...rest.flatMap(c => c.all)], D);
  save('matchu', riv);
}

// ---- 56. loveletter: CÔNG CHÚA LẬT LÊN, VỆ BINH ĐOÁN ĐÚNG (180f = 3s).
// Lá Công chúa (vương miện vàng) lật lên, lá Vệ binh (bích) lật lên,
// mũi tên vàng từ Vệ binh chỉ sang Công chúa + vòng vàng quanh Công chúa.
{
  const { riv, ab, root } = newFile('loveletter');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  const princess = card(riv, root, 150, 100, 48, 66, { back: RED, suit: 'crown', suitColor: GOLD });
  const guard = card(riv, root, 252, 100, 48, 66, { back: BLUE, suit: 'spade', suitColor: INK });
  // Mũi tên vàng từ Vệ binh sang Công chúa (trượt vào 80-95).
  const arrHead = poly(riv, root, { name: 'AH', cx: 168, cy: 100, points: [[160, 100], [176, 92], [176, 108]], color: GOLD, stroke: INK, strokeW: 1 });
  const arrLine = rect(riv, root, { name: 'AL', x: 195, y: 100, w: 46, h: 5, color: GOLD, stroke: INK, strokeW: 1 });
  // Vòng vàng quanh Công chúa (viền vàng, trong suốt), bật 95-115.
  const ring = ell(riv, root, { name: 'Ring', x: 150, y: 100, w: 64, h: 82, color: rgba(250, 205, 51, 0), stroke: GOLD, strokeW: 3 });
  bg(riv, root, hex('#8A2F3D'));
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  flipCard(riv, an, princess, 15, 27, 39, D);
  flipCard(riv, an, guard, 50, 62, 74, D);
  // Mũi tên trượt vào (80-95) — key opacity RIÊNG, không dùng fadeEnds.
  shift(riv, an, [arrHead, arrLine], [[80, 30], [95, 0]], null);
  for (const p of [arrHead, arrLine]) keys(riv, an, p.id, OPACITY, [[0, 0], [80, 0], [90, 1], [D - 12, 1], [D, 0]], 'linear');
  for (const p of [ring]) {
    keys(riv, an, p.id, SX, [[0, 0], [95, 0], [106, 1.15], [115, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [95, 0], [106, 1.15], [115, 1], [D, 1]]);
  }
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ring, ...princess.all, ...guard.all], D);
  save('loveletter', riv);
}

// ---- 57. sushigo: BA LÁ SUSHI LẬT LÊN THÀNH BỘ, ĐIỂM BAY LÊN (180f = 3s).
// 3 lá lật lần lượt: maki (cuộn mực + nhân hồng), nigiri (cá hồi cam +
// cơm trắng), tamago (trứng vàng + rong xanh); 3 xu điểm bay lên + sao.
{
  const { riv, ab, root } = newFile('sushigo');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  const mkSushi = (cx, cy, faceParts) => {
    const back = [];
    back.push(ell(riv, root, { name: 'BDot', x: cx, y: cy, w: 12, color: WHITE }));
    back.push(rect(riv, root, { name: 'BIn', x: cx, y: cy, w: 38, h: 56, r: 4, color: CREAM }));
    back.push(rect(riv, root, { name: 'BBg', x: cx, y: cy, w: 48, h: 66, r: 6, color: TEAL, stroke: INK, strokeW: 2 }));
    const face = [...faceParts];
    face.push(rect(riv, root, { name: 'FFg', x: cx, y: cy, w: 48, h: 66, r: 6, color: CREAM, stroke: INK, strokeW: 2 }));
    return { back, face, all: [...back, ...face] };
  };
  // Maki: cuộn mực + nhân hồng.
  const makiIn = ell(riv, root, { name: 'MIn', x: 130, y: 100, w: 10, color: hex('#FF8FB1') });
  const makiOut = ell(riv, root, { name: 'MOut', x: 130, y: 100, w: 24, color: INK });
  const maki = mkSushi(130, 100, [makiIn, makiOut]);
  // Nigiri: cá hồi cam + cơm trắng.
  const nigRice = rect(riv, root, { name: 'NRice', x: 200, y: 110, w: 32, h: 9, r: 3, color: WHITE, stroke: INK, strokeW: 1 });
  const nigFish = rect(riv, root, { name: 'NFish', x: 200, y: 98, w: 32, h: 12, r: 4, color: hex('#FF8C42'), stroke: INK, strokeW: 1 });
  const nigiri = mkSushi(200, 100, [nigRice, nigFish]);
  // Tamago: trứng vàng + rong xanh.
  const tamSea = rect(riv, root, { name: 'TSea', x: 270, y: 112, w: 32, h: 4, color: hex('#2E7D32') });
  const tamEgg = rect(riv, root, { name: 'TEgg', x: 270, y: 100, w: 32, h: 14, r: 4, color: YELLOW, stroke: INK, strokeW: 1 });
  const tamago = mkSushi(270, 100, [tamSea, tamEgg]);
  // 3 xu điểm bay lên trên mỗi lá (bật 90-105, bay lên 105-140).
  const pts = [130, 200, 270].map((x) => coin(riv, root, x, 52, 7));
  bg(riv, root, hex('#1F6F5C'));
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  flipCard(riv, an, maki, 15, 27, 39, D);
  flipCard(riv, an, nigiri, 45, 57, 69, D);
  flipCard(riv, an, tamago, 75, 87, 99, D);
  for (const c of pts) {
    for (const p of c) {
      keys(riv, an, p.id, SX, [[0, 0], [90, 0], [100, 1.15], [105, 1], [D, 1]]);
      keys(riv, an, p.id, SY, [[0, 0], [90, 0], [100, 1.15], [105, 1], [D, 1]]);
    }
    shift(riv, an, c, null, [[90, 0], [140, -8], [D, -8]]);
  }
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...pts.flat(), ...maki.all, ...nigiri.all, ...tamago.all], D);
  save('sushigo', riv);
}

// ---- 58. lay6: LÁ THỨ 6 TỚI HÀNG ĐẦY 5 LÁ — NỔ HÀNG (180f = 3s).
// 4 hàng bài: hàng 3 đã đầy 5 lá; lá thứ 6 (đỏ) trượt vào từ phải,
// 5 lá hàng 3 bay về phía người chơi + mờ đi, lá mới ở lại đầu hàng.
{
  const { riv, ab, root } = newFile('lay6');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  const mkMini = (cx, cy, color) => {
    const dot = ell(riv, root, { name: 'MDot', x: cx, y: cy, w: 7, color: WHITE });
    const bgc = rect(riv, root, { name: 'MBg', x: cx, y: cy, w: 26, h: 34, r: 4, color, stroke: INK, strokeW: 2 });
    return [dot, bgc];
  };
  // Hàng 1 (y=52, đỏ, 2 lá), hàng 2 (y=88, ngọc, 3 lá), hàng 4 (y=160, xanh, 3 lá).
  const row1 = [mkMini(112, 52, RED), mkMini(142, 52, RED)];
  const row2 = [mkMini(112, 88, TEAL), mkMini(142, 88, TEAL), mkMini(172, 88, TEAL)];
  const row4 = [mkMini(112, 160, BLUE), mkMini(142, 160, BLUE), mkMini(172, 160, BLUE)];
  // Hàng 3 (y=124, vàng, 5 lá đầy) — sẽ bị lấy.
  const row3 = [112, 142, 172, 202, 232].map((x) => mkMini(x, 124, YELLOW));
  // Lá thứ 6 (đỏ) xuất phát ở x=370, trượt vào vị trí thứ 6 (x=262).
  const newCard = mkMini(370, 124, RED);
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Lá thứ 6 trượt vào (0-50f).
  shift(riv, an, newCard, [[0, 0], [50, -108]], null);
  // 5 lá hàng 3 bay về phía người chơi (55-80) + mờ (60-80).
  for (const c of row3) {
    shift(riv, an, c, [[55, 0], [80, -50]], [[55, 0], [80, 40]]);
    for (const p of c) keys(riv, an, p.id, OPACITY, [[0, 0], [6, 1], [60, 1], [80, 0], [D, 0]], 'linear');
  }
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...newCard, ...row1.flat(), ...row2.flat(), ...row4.flat()], D);
  save('lay6', riv);
}

// ---- 59. saboteur: LẬT LÁ ĐƯỜNG NỐI THÔNG + KẺ PHÁ HOẠI RUNG LẮC (180f = 3s).
// 3 lá đường hầm: 2 lá 2 bên đã ngửa (đường nâu + rãnh kem), lá giữa lật
// lên nối thông đường; lá kẻ phá hoại (mặt nạ) bật lên + rung lắc.
{
  const { riv, ab, root } = newFile('saboteur');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  const mkPath = (cx, cy, faceUpNow) => {
    const back = [];
    back.push(ell(riv, root, { name: 'BDot', x: cx, y: cy, w: 12, color: WHITE }));
    back.push(rect(riv, root, { name: 'BIn', x: cx, y: cy, w: 38, h: 56, r: 4, color: CREAM }));
    back.push(rect(riv, root, { name: 'BBg', x: cx, y: cy, w: 48, h: 66, r: 6, color: hex('#6B4A2F'), stroke: INK, strokeW: 2 }));
    const face = [];
    face.push(rect(riv, root, { name: 'Tunnel', x: cx, y: cy, w: 48, h: 14, color: CREAM }));
    face.push(rect(riv, root, { name: 'FFg', x: cx, y: cy, w: 48, h: 66, r: 6, color: hex('#C89B6A'), stroke: INK, strokeW: 2 }));
    return { back, face, all: [...back, ...face], faceUpNow };
  };
  const p1 = mkPath(130, 92);
  const p2 = mkPath(200, 92);
  const p3 = mkPath(270, 92);
  // Lá kẻ phá hoại (200,160): mặt nạ mực + 2 mắt trắng trên nền kem.
  const spEye1 = ell(riv, root, { name: 'SE1', x: 192, y: 156, w: 6, color: WHITE });
  const spEye2 = ell(riv, root, { name: 'SE2', x: 208, y: 156, w: 6, color: WHITE });
  const spMask = rect(riv, root, { name: 'SMask', x: 200, y: 156, w: 34, h: 11, r: 5, color: INK });
  const spBackDot = ell(riv, root, { name: 'SDot', x: 200, y: 160, w: 10, color: WHITE });
  const spBackIn = rect(riv, root, { name: 'SIn', x: 200, y: 160, w: 32, h: 44, r: 4, color: CREAM });
  const spBackBg = rect(riv, root, { name: 'SBg', x: 200, y: 160, w: 40, h: 52, r: 6, color: RED, stroke: INK, strokeW: 2 });
  const spFaceBg = rect(riv, root, { name: 'SFg', x: 200, y: 160, w: 40, h: 52, r: 6, color: CREAM, stroke: INK, strokeW: 2 });
  const sab = { back: [spBackDot, spBackIn, spBackBg], face: [spEye1, spEye2, spMask, spFaceBg], all: [spBackDot, spBackIn, spBackBg, spEye1, spEye2, spMask, spFaceBg] };
  // Vòng ngắm đỏ quanh lá phá hoại (chớp 80-120).
  const ring = ell(riv, root, { name: 'Ring', x: 200, y: 160, w: 56, h: 68, color: rgba(255, 90, 96, 0), stroke: RED, strokeW: 3 });
  bg(riv, root, hex('#7A5230'));
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  faceUp(riv, an, p1, D);
  faceUp(riv, an, p3, D);
  flipCard(riv, an, p2, 15, 27, 39, D);
  flipCard(riv, an, sab, 55, 65, 75, D);
  // Kẻ phá hoại rung lắc sau khi lật (80-108).
  for (const p of sab.all) keys(riv, an, p.id, ROT, [[0, 0], [80, 0], [84, 0.08], [88, -0.08], [92, 0.08], [96, -0.08], [100, 0.08], [104, -0.08], [108, 0], [D, 0]]);
  keys(riv, an, ring.id, OPACITY, [[0, 0], [80, 0], [90, 1], [100, 0], [110, 1], [120, 0], [D, 0]], 'linear');
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...p1.all, ...p2.all, ...p3.all, ...sab.all], D);
  save('saboteur', riv);
}

// ---- 60. skull: HAI HOA + MỘT SỌ LẬT LÊN (180f = 3s).
// 3 lá úp (lưng tím): lật lần lượt thành hoa hồng, hoa hồng, sọ trắng;
// lá sọ rung lắc + vòng ngắm đỏ chớp + sao vàng.
{
  const { riv, ab, root } = newFile('skull');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  const mkSkullCard = (cx, cy, kind) => {
    const back = [];
    back.push(ell(riv, root, { name: 'BDot', x: cx, y: cy, w: 12, color: WHITE }));
    back.push(rect(riv, root, { name: 'BIn', x: cx, y: cy, w: 38, h: 56, r: 4, color: CREAM }));
    back.push(rect(riv, root, { name: 'BBg', x: cx, y: cy, w: 48, h: 66, r: 6, color: VIOLET, stroke: INK, strokeW: 2 }));
    const face = [];
    if (kind === 'flower') {
      face.push(ell(riv, root, { name: 'FC', x: cx, y: cy, w: 9, color: YELLOW }));
      face.push(ell(riv, root, { name: 'FP', x: cx, y: cy, w: 26, color: hex('#FF8FB1') }));
    } else {
      face.push(ell(riv, root, { name: 'KE1', x: cx - 6, y: cy - 4, w: 5, color: INK }));
      face.push(ell(riv, root, { name: 'KE2', x: cx + 6, y: cy - 4, w: 5, color: INK }));
      face.push(rect(riv, root, { name: 'KJaw', x: cx, y: cy + 10, w: 10, h: 6, r: 2, color: INK }));
      face.push(ell(riv, root, { name: 'KHead', x: cx, y: cy, w: 24, color: WHITE }));
    }
    face.push(rect(riv, root, { name: 'FFg', x: cx, y: cy, w: 48, h: 66, r: 6, color: kind === 'flower' ? CREAM : INK, stroke: INK, strokeW: 2 }));
    return { back, face, all: [...back, ...face] };
  };
  const f1 = mkSkullCard(130, 100, 'flower');
  const f2 = mkSkullCard(200, 100, 'flower');
  const sk = mkSkullCard(270, 100, 'skull');
  // Vòng ngắm đỏ quanh lá sọ (chớp 85-125).
  const ring = ell(riv, root, { name: 'Ring', x: 270, y: 100, w: 64, h: 82, color: rgba(255, 90, 96, 0), stroke: RED, strokeW: 3 });
  bg(riv, root, NIGHT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  flipCard(riv, an, f1, 15, 27, 39, D);
  flipCard(riv, an, f2, 45, 57, 69, D);
  flipCard(riv, an, sk, 75, 87, 99, D);
  // Lá sọ rung lắc sau khi lật (85-105).
  for (const p of sk.all) keys(riv, an, p.id, ROT, [[0, 0], [85, 0], [88, 0.08], [91, -0.08], [94, 0.08], [97, -0.08], [100, 0.08], [103, -0.08], [105, 0], [D, 0]]);
  keys(riv, an, ring.id, OPACITY, [[0, 0], [85, 0], [95, 1], [105, 0], [115, 1], [125, 0], [D, 0]], 'linear');
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...f1.all, ...f2.all, ...sk.all], D);
  save('skull', riv);
}

// ---- 61. hanabi: LÁ ĐỎ LẬT LÊN — PHÁO HOA NỔ (180f = 3s).
// 5 lá úp 5 màu (đỏ/xanh/vàng/trắng/tím): lá đỏ giữa lật lên thành pháo
// hoa đỏ, chùm tia nổ bung phía trên + sao vàng.
{
  const { riv, ab, root } = newFile('hanabi');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Chùm tia pháo hoa quanh (200,48): 6 chấm nhỏ.
  const rays = [];
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3;
    rays.push(ell(riv, root, { name: 'Ray' + k, x: 200 + 24 * Math.cos(a), y: 48 + 24 * Math.sin(a), w: 5, color: k % 2 ? YELLOW : RED }));
  }
  const burst = poly(riv, root, { name: 'Burst', cx: 200, cy: 48, points: starPoints(200, 48, 13), color: RED, stroke: INK, strokeW: 2 });
  const backs = [RED, BLUE, YELLOW, WHITE, VIOLET];
  const cards = [130, 165, 200, 235, 270].map((x, i) =>
    card(riv, root, x, 115, 48, 66, { back: backs[i], suit: 'heart', suitColor: RED }));
  bg(riv, root, NIGHT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  flipCard(riv, an, cards[2], 20, 32, 44, D);
  // Pháo hoa nổ (45-60), tia bung (50-70).
  keys(riv, an, burst.id, SX, [[0, 0], [45, 0], [55, 1.25], [60, 1], [D, 1]]);
  keys(riv, an, burst.id, SY, [[0, 0], [45, 0], [55, 1.25], [60, 1], [D, 1]]);
  for (const p of rays) {
    keys(riv, an, p.id, SX, [[0, 0], [50, 0], [60, 1.2], [70, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [50, 0], [60, 1.2], [70, 1], [D, 1]]);
  }
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, burst, ...rays, ...cards.flatMap(c => c.all)], D);
  save('hanabi', riv);
}

// ---- 62. chan: HAI LÁ GIỐNG NHAU THÀNH CHẮN — LÁ THỨ BA Ù (180f = 3s).
// 2 lá lật lên giống nhau (chắn), vòng vàng ôm cặp chắn; lá thứ ba lật
// lên thành lá Tây vàng (ù) + sao vàng.
{
  const { riv, ab, root } = newFile('chan');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  const c1 = card(riv, root, 140, 100, 48, 66, { back: RED, suit: 'club', suitColor: RED, pips: 2 });
  const c2 = card(riv, root, 200, 100, 48, 66, { back: RED, suit: 'club', suitColor: RED, pips: 2 });
  const c3 = card(riv, root, 260, 100, 48, 66, { back: BLUE, suit: 'crown', suitColor: GOLD });
  // Vòng vàng quanh cặp chắn (viền vàng, trong suốt), bật 75-95.
  const ring = ell(riv, root, { name: 'Ring', x: 170, y: 100, w: 116, h: 84, color: rgba(250, 205, 51, 0), stroke: GOLD, strokeW: 3 });
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  flipCard(riv, an, c1, 15, 27, 39, D);
  flipCard(riv, an, c2, 45, 57, 69, D);
  flipCard(riv, an, c3, 80, 92, 104, D);
  keys(riv, an, ring.id, SX, [[0, 0], [75, 0], [86, 1.15], [95, 1], [D, 1]]);
  keys(riv, an, ring.id, SY, [[0, 0], [75, 0], [86, 1.15], [95, 1], [D, 1]]);
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ring, ...c1.all, ...c2.all, ...c3.all], D);
  save('chan', riv);
}

// ---- 63. totom: BA LÁ LẬT LÊN THÀNH PHU (180f = 3s).
// 3 lá tổ tôm lật lần lượt thành phu (thanh đỏ/ngọc/lục), vòng vàng ôm
// cả 3 lá + sao vàng.
{
  const { riv, ab, root } = newFile('totom');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  const mkTT = (cx, cy, barColor) => {
    const back = [];
    back.push(ell(riv, root, { name: 'BDot', x: cx, y: cy, w: 10, color: WHITE }));
    back.push(rect(riv, root, { name: 'BIn', x: cx, y: cy, w: 30, h: 52, r: 4, color: CREAM }));
    back.push(rect(riv, root, { name: 'BBg', x: cx, y: cy, w: 40, h: 64, r: 6, color: hex('#6B4A2F'), stroke: INK, strokeW: 2 }));
    const face = [];
    face.push(rect(riv, root, { name: 'Bar', x: cx, y: cy - 8, w: 24, h: 8, color: barColor }));
    face.push(rect(riv, root, { name: 'Bar2', x: cx, y: cy + 8, w: 24, h: 8, color: barColor }));
    face.push(ell(riv, root, { name: 'FD', x: cx, y: cy + 20, w: 6, color: barColor }));
    face.push(rect(riv, root, { name: 'FFg', x: cx, y: cy, w: 40, h: 64, r: 6, color: CREAM, stroke: INK, strokeW: 2 }));
    return { back, face, all: [...back, ...face] };
  };
  const t1 = mkTT(140, 100, RED);
  const t2 = mkTT(200, 100, TEAL);
  const t3 = mkTT(260, 100, hex('#2E7D32'));
  // Vòng vàng quanh cả 3 lá, bật 105-125.
  const ring = ell(riv, root, { name: 'Ring', x: 200, y: 100, w: 180, h: 82, color: rgba(250, 205, 51, 0), stroke: GOLD, strokeW: 3 });
  bg(riv, root, FELT_D);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  flipCard(riv, an, t1, 15, 27, 39, D);
  flipCard(riv, an, t2, 45, 57, 69, D);
  flipCard(riv, an, t3, 75, 87, 99, D);
  keys(riv, an, ring.id, SX, [[0, 0], [105, 0], [116, 1.15], [125, 1], [D, 1]]);
  keys(riv, an, ring.id, SY, [[0, 0], [105, 0], [116, 1.15], [125, 1], [D, 1]]);
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ring, ...t1.all, ...t2.all, ...t3.all], D);
  save('totom', riv);
}

// ---- 64. carcassonne: ĐẶT Ô ĐẤT + MEEPLE ĐỎ LÊN THÀNH PHỐ (180f = 3s).
// 2 ô đã đặt sẵn (thành phố xám + đường nâu), ô thứ ba trượt vào từ
// phải; meeple đỏ bật lên trên ô mới + sao vàng.
{
  const { riv, ab, root } = newFile('carcassonne');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Meeple đỏ (đầu tròn + thân thang), bật 60-80.
  const mHead = ell(riv, root, { name: 'MHead', x: 250, y: 88, w: 11, color: RED, stroke: INK, strokeW: 2 });
  const mBody = poly(riv, root, { name: 'MBody', cx: 250, cy: 100, points: [[242, 108], [258, 108], [254, 94], [246, 94]], color: RED, stroke: INK, strokeW: 2 });
  // Ô mới (250,100): thành phố xám nửa trái + ruộng xanh.
  const cCity = rect(riv, root, { name: 'CCity', x: 239, y: 100, w: 22, h: 44, color: hex('#B0BEC5') });
  const cWall = rect(riv, root, { name: 'CWall', x: 250, y: 100, w: 3, h: 44, color: INK });
  const cBase = rect(riv, root, { name: 'CBase', x: 250, y: 100, w: 44, h: 44, color: hex('#7CB342'), stroke: INK, strokeW: 2 });
  // Ô đã đặt (150,100): thành phố xám nửa trên.
  const aCity = rect(riv, root, { name: 'ACity', x: 150, y: 89, w: 44, h: 22, color: hex('#B0BEC5') });
  const aBase = rect(riv, root, { name: 'ABase', x: 150, y: 100, w: 44, h: 44, color: hex('#7CB342'), stroke: INK, strokeW: 2 });
  // Ô đã đặt (200,100): đường nâu ngang.
  const bRoad = rect(riv, root, { name: 'BRoad', x: 200, y: 100, w: 44, h: 10, color: hex('#8D6E63') });
  const bBase = rect(riv, root, { name: 'BBase', x: 200, y: 100, w: 44, h: 44, color: hex('#7CB342'), stroke: INK, strokeW: 2 });
  bg(riv, root, hex('#558B2F'));
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Ô mới trượt vào từ phải (0-45f).
  shift(riv, an, [cCity, cWall, cBase], [[0, 120], [45, 0]], null);
  // Meeple bật lên (60-80).
  for (const p of [mHead, mBody]) {
    keys(riv, an, p.id, SX, [[0, 0], [60, 0], [70, 1.25], [80, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [60, 0], [70, 1.25], [80, 1], [D, 1]]);
  }
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, mHead, mBody, cCity, cWall, cBase, aCity, aBase, bRoad, bBase], D);
  save('carcassonne', riv);
}

// ---- 65. azul: XẾP 5 GẠCH VÀO HÀNG MẪU — GẠCH THỪA RƠI XUỐNG SÀN (180f = 3s).
// 5 viên gạch men 5 màu bật lần lượt vào hàng mẫu trên tường; viên thứ 6
// bật lên rồi rơi xuống vạch sàn + sao vàng.
{
  const { riv, ab, root } = newFile('azul');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // 5 viên hàng mẫu (y=70), bật lần lượt 10/25/40/55/70.
  const colors = [RED, BLUE, YELLOW, hex('#F5F5F5'), TEAL];
  const tiles = [170, 196, 222, 248, 274].map((x, i) =>
    rect(riv, root, { name: 'T' + i, x, y: 70, w: 22, h: 22, r: 3, color: colors[i], stroke: INK, strokeW: 2 }));
  // Viên thừa (đỏ) bật ở cuối hàng rồi rơi xuống sàn (90-115).
  const extra = rect(riv, root, { name: 'Extra', x: 300, y: 70, w: 22, h: 22, r: 3, color: RED, stroke: INK, strokeW: 2 });
  // Vạch sàn (y=155).
  const floor = rect(riv, root, { name: 'Floor', x: 200, y: 155, w: 180, h: 4, color: INK });
  // Xưởng tròn bên trái với 4 viên gạch.
  const fTiles = [[112, 92, RED], [128, 92, BLUE], [112, 108, YELLOW], [128, 108, TEAL]].map(([x, y, c], i) =>
    rect(riv, root, { name: 'FT' + i, x, y, w: 14, h: 14, r: 3, color: c, stroke: INK, strokeW: 1 }));
  const factory = ell(riv, root, { name: 'Factory', x: 120, y: 100, w: 62, color: LAVENDER, stroke: INK, strokeW: 2 });
  // Tường (bảng) sau hàng mẫu.
  const panel = rect(riv, root, { name: 'Panel', x: 235, y: 95, w: 170, h: 110, r: 6, color: SAND2, stroke: INK, strokeW: 2 });
  bg(riv, root, hex('#5B8DB8'));
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  tiles.forEach((t, i) => {
    const t0 = 10 + i * 15;
    keys(riv, an, t.id, SX, [[0, 0], [t0, 0], [t0 + 8, 1.2], [t0 + 14, 1], [D, 1]]);
    keys(riv, an, t.id, SY, [[0, 0], [t0, 0], [t0 + 8, 1.2], [t0 + 14, 1], [D, 1]]);
  });
  // Viên thừa bật (80-88) rồi rơi xuống sàn (90-115).
  keys(riv, an, extra.id, SX, [[0, 0], [80, 0], [88, 1], [D, 1]]);
  keys(riv, an, extra.id, SY, [[0, 0], [80, 0], [88, 1], [D, 1]]);
  shift(riv, an, [extra], null, [[80, 0], [115, 74]]);
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, extra, ...tiles, floor, ...fTiles, factory, panel], D);
  save('azul', riv);
}

// ---- 66. splendor: LẤY 3 ĐÁ QUÝ — MUA THẺ PHÁT TRIỂN (180f = 3s).
// 3 viên đá quý (ruby đỏ / sapphire xanh / emerald lục) trượt vào từ
// trái; thẻ phát triển lật lên (kim cương đỏ) + sao vàng.
{
  const { riv, ab, root } = newFile('splendor');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Ruby: kim cương đỏ; sapphire: oval xanh; emerald: kim cương lục.
  const ruby = suitPip(riv, root, 150, 60, 26, 'diamond', RED);
  const sapp = ell(riv, root, { name: 'Sapp', x: 200, y: 60, w: 26, h: 20, color: BLUE, stroke: INK, strokeW: 2 });
  const emer = suitPip(riv, root, 250, 60, 26, 'diamond', hex('#2E7D32'));
  const gems = [...ruby, sapp, ...emer];
  // Thẻ phát triển (200,140): kim cương đỏ.
  const dev = card(riv, root, 200, 140, 48, 66, { back: VIOLET, suit: 'diamond', suitColor: RED, pips: 1 });
  bg(riv, root, hex('#4A2B6B'));
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Đá quý trượt vào lần lượt (10/30/50).
  shift(riv, an, ruby, [[0, -80], [25, 0]], null);
  shift(riv, an, [sapp], [[20, -80], [45, 0]], null);
  shift(riv, an, emer, [[40, -80], [65, 0]], null);
  flipCard(riv, an, dev, 70, 82, 94, D);
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...gems, ...dev.all], D);
  save('splendor', riv);
}

// ---- 67. conhay: NHẢY LIÊN TIẾP QUA 2 BI (180f = 3s).
// Bàn cờ nhảy góc 5×5 lỗ: quân đỏ nhảy qua bi xanh (150,130) đáp
// (170,110), nhảy tiếp qua bi xanh (190,90) đáp (210,70) + sao vàng.
// KHÔNG có ăn quân trong Cờ Nhảy — chỉ nhảy qua để di chuyển.
{
  const { riv, ab, root } = newFile('conhay');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Quân nhỏ hơn disc() chuẩn (ngoài 26 thay vì 32): các ô kề chéo cách
  // nhau 28.3, đĩa 32 sẽ chồng lên nhau — đĩa 26 thì vừa khít, không chồng.
  const mkDisc = (cx, cy, outer, inner) => {
    const dot = ell(riv, root, { name: 'Dot', x: cx, y: cy, w: 7, color: INK });
    const inn = ell(riv, root, { name: 'In', x: cx, y: cy, w: 18, color: inner });
    const out = ell(riv, root, { name: 'Out', x: cx, y: cy, w: 26, color: outer, stroke: INK, strokeW: 2 });
    return [dot, inn, out];
  };
  // Quân đỏ nhảy (disc đỏ).
  const red = mkDisc(130, 150, RED, hex('#FF8A80'));
  // 3 bi xanh đứng yên (2 bi trên đường nhảy + 1 bi góc).
  const b1 = mkDisc(150, 130, BLUE, hex('#90CAF9'));
  const b2 = mkDisc(190, 90, BLUE, hex('#90CAF9'));
  const b3 = mkDisc(210, 150, BLUE, hex('#90CAF9'));
  // 1 quân đỏ đứng yên góc dưới.
  const r2 = mkDisc(170, 150, RED, hex('#FF8A80'));
  // Lỗ trống trên bàn 5×5 (bỏ các vị trí có quân).
  const occupied = new Set(['130,150', '150,130', '170,110', '190,90', '210,70', '210,150', '170,150']);
  const holes = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const x = 130 + c * 20, y = 150 - r * 20;
    if (occupied.has(x + ',' + y)) continue;
    holes.push(ell(riv, root, { name: 'H' + r + c, x, y, w: 7, color: INK }));
  }
  const board = rect(riv, root, { name: 'Board', x: 170, y: 110, w: 120, h: 120, color: SAND2, stroke: INK, strokeW: 3 });
  bg(riv, root, hex('#A0714F'));
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Nhảy tay (KHÔNG dùng hopFrames — nó tự chèn key teleport về ô đầu):
  // (130,150) -> (170,110) -> (210,70), vòng cung cao 18, ở lại ô đáp
  // tới 150f rồi mờ qua mối nối vòng lặp.
  for (const p of red) {
    keys(riv, an, p.id, X, [[0, 130], [15, 150], [30, 170], [45, 190], [60, 210], [150, 210], [D, 210]]);
    keys(riv, an, p.id, Y, [[0, 150], [15, 112], [30, 110], [45, 72], [60, 70], [150, 70], [D, 70]]);
    keys(riv, an, p.id, OPACITY, [[0, 0], [6, 1], [150, 1], [D, 0]], 'linear');
  }
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...b1, ...b2, ...b3, ...r2, ...holes, board], D);
  save('conhay', riv);
}

// ---- 68. backgammon: GIEO XÚC XẮC — QUÂN TRẮNG ĐI 6 Ô, ĐÁNH TRÚNG BLOT (180f = 3s).
// 2 xúc xắc lắc rồi dừng ở 6 và 3; quân trắng trượt 6 ô dọc hàng dưới,
// đánh trúng blot đỏ ở ô đích (blot bay lên + mờ) + sao vàng.
{
  const { riv, ab, root } = newFile('backgammon');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Xúc xắc 6 (185,100) và 3 (212,100): ô trắng 20×20 + chấm mực.
  const mkDie = (cx, cy, pips) => {
    const dots = pips.map(([dx, dy]) => ell(riv, root, { name: 'DP', x: cx + dx, y: cy + dy, w: 4, color: INK }));
    const sq = rect(riv, root, { name: 'DSq', x: cx, y: cy, w: 20, h: 20, r: 3, color: WHITE, stroke: INK, strokeW: 2 });
    return [...dots, sq];
  };
  const die6 = mkDie(185, 100, [[-5, -5], [5, -5], [-5, 0], [5, 0], [-5, 5], [5, 5]]);
  const die3 = mkDie(212, 100, [[-5, -5], [0, 0], [5, 5]]);
  // Quân trắng di chuyển (102,150) -> (300,150); blot đỏ ở đích.
  const white = disc(riv, root, 102, 150, WHITE, hex('#EEEEEE'), INK);
  const blot = disc(riv, root, 300, 150, RED, hex('#FF8A80'), INK);
  // 2 quân tĩnh trên: đỏ (102,50), trắng (244,50); 1 quân đỏ tĩnh (158,50)
  // — để ở 158 (mũi 151) thay vì 300 để sao vàng (316,42) không đè lên quân.
  const sRed1 = disc(riv, root, 102, 50, RED, hex('#FF8A80'), INK);
  const sWhite = disc(riv, root, 244, 50, WHITE, hex('#EEEEEE'), INK);
  const sRed2 = disc(riv, root, 158, 50, RED, hex('#FF8A80'), INK);
  // 12 mũi tên (point): 6 trên (chỉ xuống), 6 dưới (chỉ lên), xen kẽ kem/nâu.
  const pts = [];
  for (const [i, x] of [95, 123, 151, 237, 265, 293].map((x, k) => [k, x])) {
    const c = i % 2 ? hex('#8B5A2B') : CREAM;
    pts.push(poly(riv, root, { name: 'PT' + i, cx: x + 7, cy: 52, points: [[x, 30], [x + 14, 30], [x + 7, 78]], color: c }));
    pts.push(poly(riv, root, { name: 'PB' + i, cx: x + 7, cy: 148, points: [[x, 170], [x + 14, 170], [x + 7, 122]], color: c }));
  }
  const bar = rect(riv, root, { name: 'Bar', x: 200, y: 100, w: 10, h: 140, color: INK });
  const board = rect(riv, root, { name: 'Board', x: 200, y: 100, w: 240, h: 140, color: hex('#C89B6A'), stroke: INK, strokeW: 3 });
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Xúc xắc lắc (0-40f) rồi dừng.
  for (const parts of [die6, die3]) {
    shift(riv, an, parts, [[0, 0], [5, 3], [10, -3], [15, 3], [20, -3], [25, 3], [30, -3], [35, 3], [40, 0]], [[0, 0], [6, -2], [12, 2], [18, -2], [24, 2], [30, -2], [36, 2], [40, 0]]);
  }
  // Quân trắng trượt 6 ô (45-90f), vòng cung nhẹ.
  shift(riv, an, white, [[45, 0], [90, 198]], [[45, 0], [67, -10], [90, 0]]);
  // Blot đỏ bị đánh trúng: bay lên + mờ (90-110) — key opacity RIÊNG.
  shift(riv, an, blot, null, [[90, 0], [110, -45]]);
  for (const p of blot) keys(riv, an, p.id, OPACITY, [[0, 0], [6, 1], [90, 1], [110, 0], [D, 0]], 'linear');
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...die6, ...die3, ...white, ...sRed1, ...sWhite, ...sRed2, ...pts, bar, board], D);
  save('backgammon', riv);
}

// ---- 69. rummikub: BỘ 3 LÁ 7 + JOKER LẬT LÊN (180f = 3s).
// Nhóm cùng số 3 lá 7 (đỏ/xanh/vàng) trượt vào giá, lá joker lật lên
// (ngôi sao vàng), vòng vàng ôm cả bộ + sao vàng.
{
  const { riv, ab, root } = newFile('rummikub');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Lá số 7: mặt kem + số 7 (vạch ngang + chéo) màu lá + chấm nhỏ.
  const mkTile = (cx, cy, numColor) => {
    const back = [];
    back.push(ell(riv, root, { name: 'BDot', x: cx, y: cy, w: 10, color: WHITE }));
    back.push(rect(riv, root, { name: 'BIn', x: cx, y: cy, w: 34, h: 56, r: 4, color: CREAM }));
    back.push(rect(riv, root, { name: 'BBg', x: cx, y: cy, w: 44, h: 66, r: 6, color: hex('#8B5A2B'), stroke: INK, strokeW: 2 }));
    const face = [];
    face.push(rect(riv, root, { name: 'NBar', x: cx, y: cy - 11, w: 20, h: 5, color: numColor }));
    face.push(poly(riv, root, { name: 'NDiag', cx, cy: cy + 2, points: [[cx + 10, cy - 8], [cx + 5, cy - 8], [cx - 4, cy + 13], [cx - 9, cy + 13]], color: numColor }));
    face.push(ell(riv, root, { name: 'ND', x: cx, y: cy + 20, w: 6, color: numColor }));
    face.push(rect(riv, root, { name: 'FFg', x: cx, y: cy, w: 44, h: 66, r: 6, color: CREAM, stroke: INK, strokeW: 2 }));
    return { back, face, all: [...back, ...face] };
  };
  const t1 = mkTile(140, 95, RED);
  const t2 = mkTile(195, 95, BLUE);
  const t3 = mkTile(250, 95, hex('#E6A700'));
  // Joker: mặt sau tím, mặt trước ngôi sao vàng.
  const jokBack = [];
  jokBack.push(ell(riv, root, { name: 'JDot', x: 305, y: 95, w: 10, color: WHITE }));
  jokBack.push(rect(riv, root, { name: 'JIn', x: 305, y: 95, w: 34, h: 56, r: 4, color: CREAM }));
  jokBack.push(rect(riv, root, { name: 'JBg', x: 305, y: 95, w: 44, h: 66, r: 6, color: VIOLET, stroke: INK, strokeW: 2 }));
  const jokFace = [];
  jokFace.push(poly(riv, root, { name: 'JStar', cx: 305, cy: 95, points: starPoints(305, 95, 13), color: GOLD, stroke: INK, strokeW: 2 }));
  jokFace.push(rect(riv, root, { name: 'JFFg', x: 305, y: 95, w: 44, h: 66, r: 6, color: CREAM, stroke: INK, strokeW: 2 }));
  const jok = { back: jokBack, face: jokFace, all: [...jokBack, ...jokFace] };
  // Giá gỗ dưới 4 lá.
  const rack = rect(riv, root, { name: 'Rack', x: 222, y: 138, w: 220, h: 12, r: 4, color: hex('#8B5A2B'), stroke: INK, strokeW: 2 });
  // Vòng vàng quanh bộ 3 lá 7, bật 95-115.
  const ring = ell(riv, root, { name: 'Ring', x: 195, y: 95, w: 160, h: 84, color: rgba(250, 205, 51, 0), stroke: GOLD, strokeW: 3 });
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // 3 lá trượt vào lần lượt (10/25/40), joker lật (55-80).
  // 3 lá 7 ngửa sẵn (lưng tàng hình từ đầu).
  faceUp(riv, an, t1, D);
  faceUp(riv, an, t2, D);
  faceUp(riv, an, t3, D);
  shift(riv, an, t1.all, [[0, -100], [25, 0]], null);
  shift(riv, an, t2.all, [[15, -100], [40, 0]], null);
  shift(riv, an, t3.all, [[30, -100], [55, 0]], null);
  flipCard(riv, an, jok, 60, 72, 84, D);
  keys(riv, an, ring.id, SX, [[0, 0], [95, 0], [106, 1.15], [115, 1], [D, 1]]);
  keys(riv, an, ring.id, SY, [[0, 0], [95, 0], [106, 1.15], [115, 1], [D, 1]]);
  // Sao vàng bật (120-140).
  keys(riv, an, star.id, SX, [[0, 0], [120, 0], [131, 1.2], [140, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [120, 0], [131, 1.2], [140, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ring, rack, ...t1.all, ...t2.all, ...t3.all, ...jok.all], D);
  save('rummikub', riv);
}

// ---- 70. quoridor: QUÂN ĐỎ TIẾN 2 Ô — TƯỜNG GỖ DỰNG LÊN CHẶN (180f = 3s).
// Góc bàn 5×5 ô (28px): hàng đích ngọc ở trên; quân đỏ tiến 2 ô lên
// (nhảy tay, ở lại ô đích tới 150f); tường gỗ nâu dựng lên chắn đường
// đối thủ; quân xanh đứng yên phía trên.
{
  const { riv, ab, root } = newFile('quoridor');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Quân nhỏ (ngoài 26): ô 28px, đĩa chuẩn 32 sẽ chồng vạch lưới.
  const mkPawn = (cx, cy, outer, inner) => {
    const dot = ell(riv, root, { name: 'Dot', x: cx, y: cy, w: 7, color: INK });
    const inn = ell(riv, root, { name: 'In', x: cx, y: cy, w: 18, color: inner });
    const out = ell(riv, root, { name: 'Out', x: cx, y: cy, w: 26, color: outer, stroke: INK, strokeW: 2 });
    return [dot, inn, out];
  };
  const red = mkPawn(144, 156, RED, hex('#FF8A80'));
  const blue = mkPawn(256, 44, BLUE, hex('#90CAF9'));
  // Tường gỗ ngang chắn giữa hàng y=128 và y=100 (x 130-186), dựng 70-90.
  const wall = rect(riv, root, { name: 'Wall', x: 158, y: 114, w: 56, h: 8, r: 3, color: hex('#8B5A2B'), stroke: INK, strokeW: 2 });
  // Hàng đích ngọc (hàng trên cùng) + lưới 5×5.
  const goal = rect(riv, root, { name: 'Goal', x: 200, y: 44, w: 140, h: 28, color: TEAL });
  const vlines = [130, 158, 186, 214, 242, 270].map((x, i) =>
    rect(riv, root, { name: 'VL' + i, x, y: 100, w: 2, h: 140, color: INK }));
  const hlines = [30, 58, 86, 114, 142, 170].map((y, i) =>
    rect(riv, root, { name: 'HL' + i, x: 200, y, w: 140, h: 2, color: INK }));
  const board = rect(riv, root, { name: 'Board', x: 200, y: 100, w: 140, h: 140, color: CREAM, stroke: INK, strokeW: 3 });
  bg(riv, root, hex('#7A9E7E'));
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Quân đỏ nhảy tay: (144,156) -> (144,128) -> (144,100), vòng cung 10,
  // ở lại ô đích tới 150f rồi mờ qua mối nối.
  for (const p of red) {
    keys(riv, an, p.id, X, [[0, 144], [60, 144], [150, 144], [D, 144]]);
    keys(riv, an, p.id, Y, [[0, 156], [15, 134], [30, 128], [45, 106], [60, 100], [150, 100], [D, 100]]);
    keys(riv, an, p.id, SY, [[0, 1], [28, 1], [30, 0.85], [33, 1], [58, 1], [60, 0.85], [63, 1], [D, 1]]);
    keys(riv, an, p.id, OPACITY, [[0, 0], [6, 1], [150, 1], [D, 0]], 'linear');
  }
  // Tường dựng lên (70-90).
  keys(riv, an, wall.id, SY, [[0, 0], [70, 0], [80, 1.2], [90, 1], [D, 1]]);
  keys(riv, an, wall.id, SX, [[0, 0], [70, 0], [80, 1.2], [90, 1], [D, 1]]);
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, wall, ...blue, goal, ...vlines, ...hlines, board], D);
  save('quoridor', riv);
}

// ---- 71. blokus: BA MẢNH ĐẶT GÓC — MẢNH THỨ TƯ TRƯỢT VÀO KHỚP (180f = 3s).
// Góc bàn 6×6 ô (20px): mảnh đỏ L-3 ở góc, mảnh xanh 2×2, mảnh vàng
// I-3; mảnh ngọc L-3 trượt vào từ phải khớp vào khoảng trống + sao vàng.
{
  const { riv, ab, root } = newFile('blokus');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // 1 ô vuông của mảnh (20×20, viền mực).
  const cell = (cx, cy, color) =>
    rect(riv, root, { name: 'C' + cx + '_' + cy, x: cx, y: cy, w: 20, h: 20, color, stroke: INK, strokeW: 2 });
  // Mảnh đỏ L-3 (góc): (150,50),(170,50),(150,70).
  const red = [cell(150, 50, RED), cell(170, 50, RED), cell(150, 70, RED)];
  // Mảnh xanh 2×2: (210,50),(230,50),(210,70),(230,70).
  const blue = [cell(210, 50, BLUE), cell(230, 50, BLUE), cell(210, 70, BLUE), cell(230, 70, BLUE)];
  // Mảnh vàng I-3: (150,110),(170,110),(190,110).
  const yellow = [cell(150, 110, YELLOW), cell(170, 110, YELLOW), cell(190, 110, YELLOW)];
  // Mảnh ngọc L-3 trượt vào: (230,110),(250,110),(230,130).
  const teal = [cell(230, 110, TEAL), cell(250, 110, TEAL), cell(230, 130, TEAL)];
  // Lưới 6×6 (ô 20px, x 140-260, y 40-160).
  const grid = [];
  for (let i = 0; i <= 6; i++) {
    grid.push(rect(riv, root, { name: 'GV' + i, x: 140 + i * 20, y: 100, w: 2, h: 120, color: hex('#C9C2B0') }));
    grid.push(rect(riv, root, { name: 'GH' + i, x: 200, y: 40 + i * 20, w: 120, h: 2, color: hex('#C9C2B0') }));
  }
  const board = rect(riv, root, { name: 'Board', x: 200, y: 100, w: 120, h: 120, color: CREAM, stroke: INK, strokeW: 3 });
  bg(riv, root, hex('#5B8DB8'));
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // 3 mảnh bật lần lượt (10/30/50), mảnh ngọc trượt vào (65-95).
  const pop = (parts, t0) => {
    for (const p of parts) {
      keys(riv, an, p.id, SX, [[0, 0], [t0, 0], [t0 + 8, 1.2], [t0 + 14, 1], [D, 1]]);
      keys(riv, an, p.id, SY, [[0, 0], [t0, 0], [t0 + 8, 1.2], [t0 + 14, 1], [D, 1]]);
    }
  };
  pop(red, 10);
  pop(blue, 30);
  pop(yellow, 50);
  shift(riv, an, teal, [[60, 120], [95, 0]], null);
  pop(teal, 60);
  // Sao vàng bật (120-140).
  keys(riv, an, star.id, SX, [[0, 0], [120, 0], [131, 1.2], [140, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [120, 0], [131, 1.2], [140, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...red, ...blue, ...yellow, ...teal, ...grid, board], D);
  save('blokus', riv);
}

// ---- 72. scrabble: "GAME" NGANG — "PLAY" DỌC CẮT CHỮ A (180f = 3s).
// Góc bàn 5×5 ô (24px): các ô chữ gỗ bật lần lượt thành GAME ngang
// (y=89) rồi PLAY dọc (x=182) chung chữ A ở giữa + sao vàng.
{
  const { riv, ab, root } = newFile('scrabble');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Ô chữ gỗ: nền gỗ + chấm màu ở giữa (đại diện chữ) + chấm điểm góc.
  const tile = (cx, cy, dotColor) => {
    const d = ell(riv, root, { name: 'TD', x: cx, y: cy, w: 9, color: dotColor });
    const n = ell(riv, root, { name: 'TN', x: cx + 8, y: cy + 8, w: 4, color: dotColor });
    const b = rect(riv, root, { name: 'TB', x: cx, y: cy, w: 22, h: 22, r: 3, color: SAND2, stroke: INK, strokeW: 2 });
    return [d, n, b];
  };
  // GAME ngang (y=89): G(134) A(158) M(182) E(206); PLAY dọc (x=182):
  // P(41) L(65) A(89, chung) Y(113).
  const g = tile(134, 89, RED);
  const a = tile(158, 89, GOLD);
  const m = tile(182, 89, TEAL);
  const e = tile(206, 89, BLUE);
  const p = tile(182, 41, VIOLET);
  const l = tile(182, 65, hex('#2E7D32'));
  const y = tile(182, 113, hex('#E65100'));
  // Ô sao giữa bàn (182,89) — dưới chữ A.
  const center = rect(riv, root, { name: 'Center', x: 182, y: 89, w: 24, h: 24, color: hex('#F8BBD0') });
  // Lưới 5×5 (ô 24px, x 122-242, y 29-149).
  const grid = [];
  for (let i = 0; i <= 5; i++) {
    grid.push(rect(riv, root, { name: 'GV' + i, x: 122 + i * 24, y: 89, w: 2, h: 120, color: hex('#C9C2B0') }));
    grid.push(rect(riv, root, { name: 'GH' + i, x: 182, y: 29 + i * 24, w: 120, h: 2, color: hex('#C9C2B0') }));
  }
  const board = rect(riv, root, { name: 'Board', x: 182, y: 89, w: 120, h: 120, color: CREAM, stroke: INK, strokeW: 3 });
  bg(riv, root, hex('#7A9E7E'));
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Ô chữ bật lần lượt: GAME 10/22/34/46, PLAY 58/70/82 (A đã có ở 34).
  const pop = (parts, t0) => {
    for (const p of parts) {
      keys(riv, an, p.id, SX, [[0, 0], [t0, 0], [t0 + 8, 1.2], [t0 + 14, 1], [D, 1]]);
      keys(riv, an, p.id, SY, [[0, 0], [t0, 0], [t0 + 8, 1.2], [t0 + 14, 1], [D, 1]]);
    }
  };
  pop(g, 10);
  pop(a, 22);
  pop(m, 34);
  pop(e, 46);
  pop(p, 58);
  pop(l, 70);
  pop(y, 82);
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...g, ...a, ...m, ...e, ...p, ...l, ...y, center, ...grid, board], D);
  save('scrabble', riv);
}

// ---- 73. mastermind: ĐOÁN 4 CHỐT — GỢI Ý 2 ĐEN + 2 TRẮNG (180f = 3s).
// Hàng mã bí mật úp (4 chốt xám) ở trên; hàng đoán 4 chốt màu trượt vào
// lần lượt; khung gợi ý bật lên 4 chốt nhỏ (2 đen + 2 trắng) + sao vàng.
{
  const { riv, ab, root } = newFile('mastermind');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Chốt lớn (r 14): chấm giữa + vòng trong + vòng ngoài.
  const peg = (cx, cy, outer, inner) => {
    const dot = ell(riv, root, { name: 'Dot', x: cx, y: cy, w: 7, color: INK });
    const inn = ell(riv, root, { name: 'In', x: cx, y: cy, w: 18, color: inner });
    const out = ell(riv, root, { name: 'Out', x: cx, y: cy, w: 28, color: outer, stroke: INK, strokeW: 2 });
    return [dot, inn, out];
  };
  // Mã bí mật úp (xám) ở trên, y=45.
  const code = [140, 185, 230, 275].map((x) => peg(x, 45, hex('#9E9E9E'), hex('#BDBDBD')));
  // Hàng đoán (y=100): đỏ/xanh/vàng/trắng.
  const g1 = peg(140, 100, RED, hex('#FF8A80'));
  const g2 = peg(185, 100, BLUE, hex('#90CAF9'));
  const g3 = peg(230, 100, YELLOW, hex('#FFE082'));
  const g4 = peg(275, 100, WHITE, hex('#EEEEEE'));
  // Khung gợi ý (200,158): 4 chốt nhỏ 2 đen + 2 trắng.
  const fb = [
    ell(riv, root, { name: 'FB1', x: 185, y: 148, w: 14, color: INK, stroke: WHITE, strokeW: 2 }),
    ell(riv, root, { name: 'FB2', x: 215, y: 148, w: 14, color: INK, stroke: WHITE, strokeW: 2 }),
    ell(riv, root, { name: 'FB3', x: 185, y: 168, w: 14, color: WHITE, stroke: INK, strokeW: 2 }),
    ell(riv, root, { name: 'FB4', x: 215, y: 168, w: 14, color: WHITE, stroke: INK, strokeW: 2 }),
  ];
  const panel = rect(riv, root, { name: 'Panel', x: 200, y: 158, w: 70, h: 44, r: 6, color: SAND2, stroke: INK, strokeW: 2 });
  bg(riv, root, hex('#2D3A6E'));
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Hàng đoán trượt vào lần lượt (10/25/40/55).
  const guesses = [g1, g2, g3, g4];
  guesses.forEach((parts, i) => {
    const t0 = 10 + i * 15;
    shift(riv, an, parts, [[0, -80], [t0 + 15, 0]], null);
    for (const p of parts) {
      keys(riv, an, p.id, SX, [[0, 0], [t0, 0], [t0 + 8, 1.2], [t0 + 14, 1], [D, 1]]);
      keys(riv, an, p.id, SY, [[0, 0], [t0, 0], [t0 + 8, 1.2], [t0 + 14, 1], [D, 1]]);
    }
  });
  // Gợi ý bật lần lượt (80/88/96/104).
  fb.forEach((p, i) => {
    const t0 = 80 + i * 8;
    keys(riv, an, p.id, SX, [[0, 0], [t0, 0], [t0 + 6, 1.25], [t0 + 10, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [t0, 0], [t0 + 6, 1.25], [t0 + 10, 1], [D, 1]]);
  });
  // Sao vàng bật (120-140).
  keys(riv, an, star.id, SX, [[0, 0], [120, 0], [131, 1.2], [140, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [120, 0], [131, 1.2], [140, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...code.flat(), ...g1, ...g2, ...g3, ...g4, ...fb, panel], D);
  save('mastermind', riv);
}

// ---- 74. ailatrieuphu: Ô B SÁNG VÀNG — 3 Ô CÒN LẠI MỜ ĐI (180f = 3s).
// Thanh câu hỏi ở trên; 4 ô đáp án 2×2 (chấm màu phân biệt A đỏ/B vàng/
// C xanh/D ngọc); ô B bật lớp vàng + tia sáng, 3 ô còn lại mờ xuống
// 0.35 + sao vàng. (Các ô có key opacity RIÊNG — không đưa vào fadeEnds.)
{
  const { riv, ab, root } = newFile('ailatrieuphu');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Thanh câu hỏi (200,32): nền mực + 3 chấm vàng.
  const q3 = ell(riv, root, { name: 'Q3', x: 220, y: 32, w: 7, color: GOLD });
  const q2 = ell(riv, root, { name: 'Q2', x: 200, y: 32, w: 7, color: GOLD });
  const q1 = ell(riv, root, { name: 'Q1', x: 180, y: 32, w: 7, color: GOLD });
  const qbar = rect(riv, root, { name: 'QBar', x: 200, y: 32, w: 230, h: 26, r: 8, color: INK, stroke: GOLD, strokeW: 2 });
  // Ô đáp án: nền kem + chấm màu góc trái. A(140,80) B(260,80) C(140,140) D(260,140).
  const mkAns = (cx, cy, dotColor) => {
    const d = ell(riv, root, { name: 'AD', x: cx - 38, y: cy, w: 12, color: dotColor });
    const b = rect(riv, root, { name: 'AB', x: cx, y: cy, w: 100, h: 40, r: 8, color: CREAM, stroke: INK, strokeW: 2 });
    return [d, b];
  };
  const aA = mkAns(140, 80, RED);
  // Lớp vàng phủ lên ô B (bật 60-80) — add TRƯỚC nền ô B để phủ lên nó.
  const goldB = rect(riv, root, { name: 'GoldB', x: 260, y: 80, w: 100, h: 40, r: 8, color: YELLOW, stroke: INK, strokeW: 2 });
  const aB = mkAns(260, 80, GOLD);
  const aC = mkAns(140, 140, BLUE);
  const aD = mkAns(260, 140, TEAL);
  // Tia sáng quanh ô B: 6 chấm vàng.
  const rays = [];
  for (let k = 0; k < 6; k++) {
    const ang = k * Math.PI / 3;
    rays.push(ell(riv, root, { name: 'Ray' + k, x: 260 + 58 * Math.cos(ang), y: 80 + 30 * Math.sin(ang), w: 6, color: GOLD }));
  }
  bg(riv, root, hex('#1B2A6B'));
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Ô đáp án mờ vào đầu vòng; A/C/D mờ xuống 0.35 từ 60-80; B giữ nguyên.
  const dimTo = (parts, v) => {
    for (const p of parts) keys(riv, an, p.id, OPACITY, [[0, 0], [6, 1], [60, 1], [80, v], [D - 12, v], [D, 0]], 'linear');
  };
  dimTo(aA, 0.35);
  dimTo(aC, 0.35);
  dimTo(aD, 0.35);
  for (const p of aB) keys(riv, an, p.id, OPACITY, [[0, 0], [6, 1], [D - 12, 1], [D, 0]], 'linear');
  // Lớp vàng phủ B: mờ vào 60-75.
  keys(riv, an, goldB.id, OPACITY, [[0, 0], [60, 0], [75, 1], [D - 12, 1], [D, 0]], 'linear');
  // Tia sáng bật (75-95).
  for (const p of rays) {
    keys(riv, an, p.id, SX, [[0, 0], [75, 0], [85, 1.25], [95, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [75, 0], [85, 1.25], [95, 1], [D, 1]]);
  }
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...rays, q1, q2, q3, qbar], D);
  save('ailatrieuphu', riv);
}

// ---- 75. haithat1gia: HAI CÂU THẬT XANH — CÂU GIẢ ĐỎ RUNG LẮC (180f = 3s).
// 3 lá câu lật lần lượt: 2 lá thật (tick xanh) + 1 lá giả (dấu X đỏ);
// lá giả rung lắc, vòng ngắm đỏ chớp quanh nó + sao vàng.
{
  const { riv, ab, root } = newFile('haithat1gia');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Lá câu: lưng tím; mặt kem + vạch màu + tick (thật) hoặc X (giả).
  const mkCard = (cx, cy, isTrue) => {
    const back = [];
    back.push(ell(riv, root, { name: 'BDot', x: cx, y: cy, w: 10, color: WHITE }));
    back.push(rect(riv, root, { name: 'BIn', x: cx, y: cy, w: 34, h: 56, r: 4, color: CREAM }));
    back.push(rect(riv, root, { name: 'BBg', x: cx, y: cy, w: 44, h: 66, r: 6, color: VIOLET, stroke: INK, strokeW: 2 }));
    const face = [];
    const barColor = isTrue ? hex('#2E7D32') : RED;
    face.push(rect(riv, root, { name: 'Bar', x: cx, y: cy - 14, w: 26, h: 6, color: barColor }));
    if (isTrue) {
      // Tick ✓ bằng 2 vạch: tay ngắn xuống-phải + tay dài lên-phải.
      face.push(poly(riv, root, { name: 'Tick1', cx, cy: cy + 8, points: rotRectPoints(cx - 7, cy + 11, 11, 5, 0.785), color: hex('#2E7D32') }));
      face.push(poly(riv, root, { name: 'Tick2', cx, cy: cy + 8, points: rotRectPoints(cx + 4.5, cy + 7.5, 21, 5, -0.785), color: hex('#2E7D32') }));
    } else {
      face.push(poly(riv, root, { name: 'X1', cx, cy: cy + 8, points: rotRectPoints(cx, cy + 8, 22, 5, 0.785), color: RED }));
      face.push(poly(riv, root, { name: 'X2', cx, cy: cy + 8, points: rotRectPoints(cx, cy + 8, 22, 5, -0.785), color: RED }));
    }
    face.push(rect(riv, root, { name: 'FFg', x: cx, y: cy, w: 44, h: 66, r: 6, color: CREAM, stroke: INK, strokeW: 2 }));
    return { back, face, all: [...back, ...face] };
  };
  const c1 = mkCard(140, 100, true);
  const c2 = mkCard(200, 100, true);
  const c3 = mkCard(260, 100, false);
  // Vòng ngắm đỏ quanh lá giả (260,100), chớp 100-150 — key opacity RIÊNG.
  const ring = ell(riv, root, { name: 'Ring', x: 260, y: 100, w: 70, h: 90, color: rgba(255, 90, 96, 0), stroke: RED, strokeW: 3 });
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  flipCard(riv, an, c1, 15, 27, 39, D);
  flipCard(riv, an, c2, 45, 57, 69, D);
  flipCard(riv, an, c3, 75, 87, 99, D);
  // Lá giả rung lắc (100-140).
  for (const p of c3.all) {
    keys(riv, an, p.id, ROT, [[0, 0], [100, 0], [108, 0.08], [116, -0.08], [124, 0.08], [132, -0.08], [140, 0], [D, 0]]);
  }
  // Vòng ngắm chớp 3 lần (100-140) rồi đứng yên tới cuối vòng.
  keys(riv, an, ring.id, OPACITY, [[0, 0], [100, 0], [108, 1], [116, 0], [124, 1], [132, 0], [140, 1], [D - 12, 1], [D, 0]], 'linear');
  // Sao vàng bật (120-140).
  keys(riv, an, star.id, SX, [[0, 0], [120, 0], [131, 1.2], [140, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [120, 0], [131, 1.2], [140, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...c1.all, ...c2.all, ...c3.all], D);
  save('haithat1gia', riv);
}

// ---- 76. doanhdong: LÁ MÚA LẬT LÊN — 2 NGƯỜI ĐOÁN ĐÚNG GẬT ĐẦU (180f = 3s).
// Lá hành động (múa) lật lên giữa trên; 2 avatar dưới gật đầu liên tục
// (đoán đúng), tick vàng bật lên trên mỗi avatar + sao vàng.
{
  const { riv, ab, root } = newFile('doanhdong');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Lá hành động: lưng đỏ; mặt kem + vũ công (đầu + thân + 2 tay giơ +
  // 2 chân) trên nền tròn ngọc.
  const back = [];
  back.push(ell(riv, root, { name: 'BDot', x: 200, y: 75, w: 12, color: WHITE }));
  back.push(rect(riv, root, { name: 'BIn', x: 200, y: 75, w: 44, h: 66, r: 6, color: CREAM }));
  back.push(rect(riv, root, { name: 'BBg', x: 200, y: 75, w: 56, h: 76, r: 8, color: RED, stroke: INK, strokeW: 2 }));
  const face = [];
  face.push(poly(riv, root, { name: 'ArmL', cx: 186, cy: 66, points: rotRectPoints(186, 66, 5, 22, 0.7), color: INK }));
  face.push(poly(riv, root, { name: 'ArmR', cx: 214, cy: 66, points: rotRectPoints(214, 66, 5, 22, -0.7), color: INK }));
  face.push(poly(riv, root, { name: 'LegL', cx: 194, cy: 96, points: rotRectPoints(194, 96, 5, 20, 0.4), color: INK }));
  face.push(poly(riv, root, { name: 'LegR', cx: 206, cy: 96, points: rotRectPoints(206, 96, 5, 20, -0.4), color: INK }));
  face.push(rect(riv, root, { name: 'Body', x: 200, y: 82, w: 10, h: 20, r: 4, color: INK }));
  face.push(ell(riv, root, { name: 'Head', x: 200, y: 64, w: 13, color: CREAM, stroke: INK, strokeW: 2 }));
  face.push(ell(riv, root, { name: 'Spot', x: 200, y: 80, w: 44, color: TEAL }));
  face.push(rect(riv, root, { name: 'FFg', x: 200, y: 75, w: 56, h: 76, r: 8, color: CREAM, stroke: INK, strokeW: 2 }));
  const act = { back, face, all: [...back, ...face] };
  // Avatar: mặt tròn + 2 mắt + miệng cười; A(150,150) xanh, B(250,150) vàng.
  const mkAvatar = (cx, cy, color) => {
    const e1 = ell(riv, root, { name: 'E1', x: cx - 6, y: cy - 3, w: 4, color: INK });
    const e2 = ell(riv, root, { name: 'E2', x: cx + 6, y: cy - 3, w: 4, color: INK });
    const sm = ell(riv, root, { name: 'Sm', x: cx, y: cy + 7, w: 10, h: 5, color: INK });
    const f = ell(riv, root, { name: 'Face', x: cx, y: cy, w: 34, color, stroke: INK, strokeW: 2 });
    return [e1, e2, sm, f];
  };
  const avA = mkAvatar(150, 150, TEAL);
  const avB = mkAvatar(250, 150, YELLOW);
  // Tick vàng trên mỗi avatar, bật 70-90 (2 vạch: tay ngắn + tay dài).
  const tickA = [
    poly(riv, root, { name: 'TickA1', cx: 150, cy: 118, points: rotRectPoints(143, 121, 11, 5, 0.785), color: GOLD, stroke: INK, strokeW: 1 }),
    poly(riv, root, { name: 'TickA2', cx: 150, cy: 118, points: rotRectPoints(154.5, 117.5, 21, 5, -0.785), color: GOLD, stroke: INK, strokeW: 1 }),
  ];
  const tickB = [
    poly(riv, root, { name: 'TickB1', cx: 250, cy: 118, points: rotRectPoints(243, 121, 11, 5, 0.785), color: GOLD, stroke: INK, strokeW: 1 }),
    poly(riv, root, { name: 'TickB2', cx: 250, cy: 118, points: rotRectPoints(254.5, 117.5, 21, 5, -0.785), color: GOLD, stroke: INK, strokeW: 1 }),
  ];
  bg(riv, root, hex('#3B2D5C'));
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  flipCard(riv, an, act, 15, 27, 39, D);
  // 2 avatar gật đầu (Y bob ±3) từ 50-140.
  for (const av of [avA, avB]) {
    for (const p of av) {
      keys(riv, an, p.id, Y, [[0, p.y], [50, p.y], [60, p.y + 3], [70, p.y], [80, p.y + 3], [90, p.y], [100, p.y + 3], [110, p.y], [120, p.y + 3], [130, p.y], [140, p.y], [D, p.y]]);
    }
  }
  // Tick vàng bật (70-90).
  for (const t of [...tickA, ...tickB]) {
    keys(riv, an, t.id, SX, [[0, 0], [70, 0], [80, 1.25], [90, 1], [D, 1]]);
    keys(riv, an, t.id, SY, [[0, 0], [70, 0], [80, 1.25], [90, 1], [D, 1]]);
  }
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...tickA, ...tickB, ...act.all, ...avA, ...avB], D);
  save('doanhdong', riv);
}

// ---- 77. wavelength: KIM TRƯỢT TỚI VÙNG VÀNG — 3 LÁ GỢI Ý LẬT LÊN (180f = 3s).
// Thang quang phổ ngang: kim chỉ trượt từ trái tới vùng vàng giữa, 3 lá
// gợi ý lật lên lần lượt, sao vàng bật lên.
{
  const { riv, ab, root } = newFile('wavelength');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Kim chỉ + chốt đỏ (trượt theo X).
  const needle = rect(riv, root, { name: 'Needle', x: 110, y: 62, w: 5, h: 40, color: INK });
  const pivot = ell(riv, root, { name: 'Pivot', x: 110, y: 42, w: 11, color: RED, stroke: INK, strokeW: 2 });
  // Vùng vàng giữa thang (add trước đoạn màu để nằm trên).
  rect(riv, root, { name: 'Zone', x: 200, y: 62, w: 48, h: 24, color: GOLD, stroke: INK, strokeW: 2 });
  // 4 đoạn màu quang phổ (2 bên vùng vàng).
  const segCols = [RED, hex('#FF9F43'), TEAL, hex('#2B6CB0')];
  const segX = [128, 176, 224, 272];
  for (let i = 0; i < 4; i++) rect(riv, root, { name: 'Seg' + i, x: segX[i], y: 62, w: 48, h: 16, color: segCols[i] });
  // Khung mực dưới thang (add sau = nằm dưới các đoạn màu, lộ viền 4px).
  rect(riv, root, { name: 'BarFrame', x: 200, y: 62, w: 248, h: 26, color: INK });
  // 3 lá gợi ý.
  const c1 = card(riv, root, 140, 140, 44, 60, { suit: 'diamond', suitColor: RED });
  const c2 = card(riv, root, 200, 140, 44, 60, { suit: 'heart', suitColor: RED });
  const c3 = card(riv, root, 260, 140, 44, 60, { suit: 'club', suitColor: INK });
  bg(riv, root, NIGHT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Kim trượt tới vùng vàng (0-60) rồi rung nhẹ quanh đích.
  keys(riv, an, needle.id, X, [[0, 110], [60, 200], [75, 196], [90, 204], [105, 198], [120, 200], [D, 200]]);
  keys(riv, an, pivot.id, X, [[0, 110], [60, 200], [75, 196], [90, 204], [105, 198], [120, 200], [D, 200]]);
  flipCard(riv, an, c1, 20, 30, 40, D);
  flipCard(riv, an, c2, 45, 55, 65, D);
  flipCard(riv, an, c3, 70, 80, 90, D);
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, needle, pivot, ...c1.all, ...c2.all, ...c3.all], D);
  save('wavelength', riv);
}

// ---- 78. resistance: LÁ GIÁN ĐIỆP LẬT LÊN — VÒNG NGẮM CHỚP + NHIỆM VỤ TICK XANH (180f = 3s).
// 5 lá vai trò úp; lá giữa lật lên thành gián điệp (mặt nạ), vòng ngắm đỏ
// chớp quanh nó; lá nhiệm vụ dưới có tick xanh bật lên.
{
  const { riv, ab, root } = newFile('resistance');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  const mkRole = (cx, cy, isSpy) => {
    const back = [];
    back.push(ell(riv, root, { name: 'BDot', x: cx, y: cy, w: 9, color: WHITE }));
    back.push(rect(riv, root, { name: 'BIn', x: cx, y: cy, w: 30, h: 46, r: 4, color: CREAM }));
    back.push(rect(riv, root, { name: 'BBg', x: cx, y: cy, w: 40, h: 56, r: 6, color: VIOLET, stroke: INK, strokeW: 2 }));
    const face = [];
    if (isSpy) {
      face.push(ell(riv, root, { name: 'EyeL', x: cx - 7, y: cy - 2, w: 5, color: WHITE }));
      face.push(ell(riv, root, { name: 'EyeR', x: cx + 7, y: cy - 2, w: 5, color: WHITE }));
      face.push(ell(riv, root, { name: 'Mask', x: cx, y: cy, w: 30, h: 16, color: INK }));
    } else {
      face.push(rect(riv, root, { name: 'Body', x: cx, y: cy + 8, w: 12, h: 14, r: 3, color: TEAL }));
      face.push(ell(riv, root, { name: 'Head', x: cx, y: cy - 6, w: 12, color: CREAM, stroke: INK, strokeW: 2 }));
    }
    face.push(rect(riv, root, { name: 'FFg', x: cx, y: cy, w: 40, h: 56, r: 6, color: CREAM, stroke: INK, strokeW: 2 }));
    return { back, face, all: [...back, ...face] };
  };
  const r1 = mkRole(110, 88, false);
  const r2 = mkRole(155, 88, false);
  const spy = mkRole(200, 88, true);
  const r4 = mkRole(245, 88, false);
  const r5 = mkRole(290, 88, false);
  // Vòng ngắm đỏ quanh lá gián điệp, chớp 90-140 — key opacity RIÊNG.
  const ring = ell(riv, root, { name: 'Ring', x: 200, y: 88, w: 64, h: 80, color: rgba(255, 90, 96, 0), stroke: RED, strokeW: 3 });
  // Lá nhiệm vụ: tick xanh (2 vạch) add TRƯỚC nền kem — thư viện vẽ
  // thêm trước = vẽ trên cùng, nền đục mà add trước sẽ che mất tick.
  const mT1 = poly(riv, root, { name: 'MT1', cx: 200, cy: 162, points: rotRectPoints(193, 165, 11, 5, 0.785), color: hex('#2E7D32') });
  const mT2 = poly(riv, root, { name: 'MT2', cx: 200, cy: 162, points: rotRectPoints(204.5, 161.5, 21, 5, -0.785), color: hex('#2E7D32') });
  const mBg = rect(riv, root, { name: 'MBg', x: 200, y: 162, w: 56, h: 30, r: 6, color: CREAM, stroke: INK, strokeW: 2 });
  bg(riv, root, NIGHT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  flipCard(riv, an, spy, 30, 42, 54, D);
  // Lá gián điệp rung lắc (90-130).
  for (const p of spy.all) {
    keys(riv, an, p.id, ROT, [[0, 0], [90, 0], [98, 0.08], [106, -0.08], [114, 0.08], [122, -0.08], [130, 0], [D, 0]]);
  }
  // Vòng ngắm chớp 3 lần (90-130) rồi đứng yên tới cuối vòng.
  keys(riv, an, ring.id, OPACITY, [[0, 0], [90, 0], [98, 1], [106, 0], [114, 1], [122, 0], [130, 1], [D - 12, 1], [D, 0]], 'linear');
  // Lá nhiệm vụ + tick bật (100-120).
  for (const p of [mBg, mT1, mT2]) {
    keys(riv, an, p.id, SX, [[0, 0], [100, 0], [110, 1.25], [120, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [100, 0], [110, 1.25], [120, 1], [D, 1]]);
  }
  // Sao vàng bật (120-140).
  keys(riv, an, star.id, SX, [[0, 0], [120, 0], [131, 1.2], [140, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [120, 0], [131, 1.2], [140, 1], [D, 1]]);
  fadeEnds(riv, an, [star, mBg, mT1, mT2, ...r1.all, ...r2.all, ...spy.all, ...r4.all, ...r5.all], D);
  save('resistance', riv);
}

// ---- 79. vetruyentin: MẶT TRỜI VẼ TỪNG NÉT — LÁ ĐÁP ÁN LẬT LÊN + TICK VÀNG (180f = 3s).
// Mặt trời vẽ từng nét trên bảng trắng (tròn + 8 tia bật lần lượt), lá đáp
// án dưới lật lên thành mặt trời nhỏ + tick vàng bật ở góc lá.
{
  const { riv, ab, root } = newFile('vetruyentin');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Mặt trời trên bảng: tròn vàng + 8 tia (mỗi tia bật cách nhau 8f).
  const sun = ell(riv, root, { name: 'Sun', x: 150, y: 82, w: 36, color: YELLOW, stroke: INK, strokeW: 2 });
  const rays = [];
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    const rx = 150 + 32 * Math.cos(a), ry = 82 + 32 * Math.sin(a);
    rays.push(poly(riv, root, { name: 'Ray' + k, cx: rx, cy: ry, points: rotRectPoints(rx, ry, 5, 18, a + Math.PI / 2), color: YELLOW, stroke: INK, strokeW: 1 }));
  }
  // Lá đáp án: lưng đỏ; mặt kem + mặt trời nhỏ.
  const back = [];
  back.push(ell(riv, root, { name: 'BDot', x: 200, y: 168, w: 10, color: WHITE }));
  back.push(rect(riv, root, { name: 'BIn', x: 200, y: 168, w: 34, h: 46, r: 4, color: CREAM }));
  back.push(rect(riv, root, { name: 'BBg', x: 200, y: 168, w: 44, h: 56, r: 6, color: RED, stroke: INK, strokeW: 2 }));
  const face = [];
  face.push(ell(riv, root, { name: 'MiniSun', x: 200, y: 168, w: 16, color: YELLOW, stroke: INK, strokeW: 2 }));
  face.push(rect(riv, root, { name: 'FFg', x: 200, y: 168, w: 44, h: 56, r: 6, color: CREAM, stroke: INK, strokeW: 2 }));
  const wcard = { back, face, all: [...back, ...face] };
  // Tick vàng ở góc phải lá đáp án (2 vạch).
  const tk1 = poly(riv, root, { name: 'Tk1', cx: 228, cy: 142, points: rotRectPoints(221, 145, 11, 5, 0.785), color: GOLD, stroke: INK, strokeW: 1 });
  const tk2 = poly(riv, root, { name: 'Tk2', cx: 228, cy: 142, points: rotRectPoints(232.5, 141.5, 21, 5, -0.785), color: GOLD, stroke: INK, strokeW: 1 });
  // Bảng trắng (add sau mặt trời = nằm dưới mặt trời, trên nền).
  rect(riv, root, { name: 'Board', x: 200, y: 82, w: 230, h: 104, r: 6, color: CREAM, stroke: INK, strokeW: 3 });
  bg(riv, root, hex('#3B2D5C'));
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Mặt trời bật (10-22), 8 tia bật lần lượt (20-90).
  keys(riv, an, sun.id, SX, [[0, 0], [10, 0], [16, 1.2], [22, 1], [D, 1]]);
  keys(riv, an, sun.id, SY, [[0, 0], [10, 0], [16, 1.2], [22, 1], [D, 1]]);
  rays.forEach((r, k) => {
    const t = 20 + k * 8;
    keys(riv, an, r.id, SX, [[0, 0], [t, 0], [t + 5, 1.25], [t + 9, 1], [D, 1]]);
    keys(riv, an, r.id, SY, [[0, 0], [t, 0], [t + 5, 1.25], [t + 9, 1], [D, 1]]);
  });
  flipCard(riv, an, wcard, 50, 60, 70, D);
  // Tick vàng bật (75-90).
  for (const t of [tk1, tk2]) {
    keys(riv, an, t.id, SX, [[0, 0], [75, 0], [83, 1.25], [90, 1], [D, 1]]);
    keys(riv, an, t.id, SY, [[0, 0], [75, 0], [83, 1.25], [90, 1], [D, 1]]);
  }
  // Sao vàng bật (95-115).
  keys(riv, an, star.id, SX, [[0, 0], [95, 0], [106, 1.2], [115, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [95, 0], [106, 1.2], [115, 1], [D, 1]]);
  fadeEnds(riv, an, [star, sun, ...rays, tk1, tk2, ...wcard.all], D);
  save('vetruyentin', riv);
}

// ---- 80. tetris: KHỐI T RƠI XUỐNG — 2 HÀNG SÁNG LÊN + BIẾN MẤT (180f = 3s).
// Giếng 10 cột: khối T rơi từ trên xuống khớp vào hàng, hàng đủ sáng lên
// rồi biến mất, sao vàng bật lên.
{
  const { riv, ab, root } = newFile('tetris');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // 2 hàng sắp đủ: hàng đáy y=156 đủ 10 ô; hàng y=140 thiếu đúng 3 ô giữa.
  const rowCols = [TEAL, YELLOW, RED, hex('#2B6CB0'), LAVENDER, hex('#FF9F43'), VIOLET, TEAL, YELLOW, RED];
  const bottomRow = [];
  for (let i = 0; i < 10; i++) bottomRow.push(rect(riv, root, { name: 'B' + i, x: 128 + i * 16, y: 156, w: 15, h: 15, color: rowCols[i], stroke: INK, strokeW: 1 }));
  const midRow = [];
  const midIdx = [0, 1, 2, 6, 7, 8, 9];
  for (const i of midIdx) midRow.push(rect(riv, root, { name: 'M' + i, x: 128 + i * 16, y: 140, w: 15, h: 15, color: rowCols[(i + 3) % 10], stroke: INK, strokeW: 1 }));
  // 3 ô tĩnh hàng trên (y=124) cho có chiều sâu.
  rect(riv, root, { name: 'S1', x: 128, y: 124, w: 15, h: 15, color: YELLOW, stroke: INK, strokeW: 1 });
  rect(riv, root, { name: 'S2', x: 144, y: 124, w: 15, h: 15, color: TEAL, stroke: INK, strokeW: 1 });
  rect(riv, root, { name: 'S3', x: 272, y: 124, w: 15, h: 15, color: RED, stroke: INK, strokeW: 1 });
  // Khối T tím: thanh ngang 3 ô + chân giữa; rơi từ y=20 xuống y=108/124.
  const tCells = [
    rect(riv, root, { name: 'T1', x: 184, y: 20, w: 15, h: 15, color: VIOLET, stroke: INK, strokeW: 1 }),
    rect(riv, root, { name: 'T2', x: 200, y: 20, w: 15, h: 15, color: VIOLET, stroke: INK, strokeW: 1 }),
    rect(riv, root, { name: 'T3', x: 216, y: 20, w: 15, h: 15, color: VIOLET, stroke: INK, strokeW: 1 }),
    rect(riv, root, { name: 'T4', x: 200, y: 36, w: 15, h: 15, color: VIOLET, stroke: INK, strokeW: 1 }),
  ];
  // Giếng (add sau các ô = nằm dưới các ô, trên nền).
  rect(riv, root, { name: 'Well', x: 200, y: 116, w: 168, h: 104, color: hex('#2A2545'), stroke: INK, strokeW: 2 });
  bg(riv, root, hex('#1E1B2E'));
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Khối T rơi (0-55): thanh ngang 20 -> 108, chân 36 -> 124.
  for (let i = 0; i < 3; i++) keys(riv, an, tCells[i].id, Y, [[0, 20], [55, 108], [D, 108]]);
  keys(riv, an, tCells[3].id, Y, [[0, 36], [55, 124], [D, 124]]);
  // 2 hàng đủ: sáng chớp khi khối đáp (55-70) rồi mờ dần (80-100) — key
  // opacity RIÊNG (không cho vào fadeEnds).
  for (const p of [...bottomRow, ...midRow]) {
    keys(riv, an, p.id, OPACITY, [[0, 0], [6, 1], [55, 1], [63, 0.3], [70, 1], [80, 1], [100, 0], [D, 0]], 'linear');
  }
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...tCells], D);
  save('tetris', riv);
}

// ---- 81. ransanmoi: RẮN ĂN TÁO DÀI THÊM 1 ĐỐT — TÁO MỚI BẬT LÊN (180f = 3s).
// Rắn xanh trườn sang phải ăn táo đỏ, dài thêm 1 đốt ở đuôi, táo mới bật
// lên chỗ khác, sao vàng bật lên.
{
  const { riv, ab, root } = newFile('ransanmoi');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Táo 1 ở (200,100): bị ăn ở 70-86; táo 2 bật lên ở (262,72).
  const ap1 = ell(riv, root, { name: 'Ap1', x: 200, y: 100, w: 18, color: RED, stroke: INK, strokeW: 2 });
  const ap1s = rect(riv, root, { name: 'Ap1S', x: 200, y: 88, w: 3, h: 8, color: INK });
  const ap2 = ell(riv, root, { name: 'Ap2', x: 262, y: 72, w: 18, color: RED, stroke: INK, strokeW: 2 });
  const ap2s = rect(riv, root, { name: 'Ap2S', x: 262, y: 60, w: 3, h: 8, color: INK });
  // Rắn: đầu (120,100) + mắt, 4 đốt thân, mỗi đốt trượt theo sau 10f.
  const head = ell(riv, root, { name: 'Head', x: 120, y: 100, w: 22, color: hex('#2E7D32'), stroke: INK, strokeW: 2 });
  const eye = ell(riv, root, { name: 'Eye', x: 126, y: 96, w: 5, color: WHITE });
  const segs = [];
  for (let i = 0; i < 4; i++) segs.push(ell(riv, root, { name: 'Seg' + i, x: 102 - i * 18, y: 100, w: 18, color: hex('#43A047'), stroke: INK, strokeW: 2 }));
  // Đốt mới mọc ở đuôi (110,100) sau khi ăn táo.
  const newSeg = ell(riv, root, { name: 'NewSeg', x: 110, y: 100, w: 18, color: hex('#43A047'), stroke: INK, strokeW: 2 });
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Đầu trườn 120 -> 200 (0-70), mắt đi cùng.
  keys(riv, an, head.id, X, [[0, 120], [70, 200], [D, 200]]);
  keys(riv, an, eye.id, X, [[0, 126], [70, 206], [D, 206]]);
  // Thân trượt theo sau, mỗi đốt trễ 10f, tới đích = đầu - (i+1)*18.
  segs.forEach((s, i) => {
    const x0 = 102 - i * 18, x1 = 200 - (i + 1) * 18, d = (i + 1) * 10;
    keys(riv, an, s.id, X, [[0, x0], [d, x0], [70 + d, x1], [D, x1]]);
  });
  // Táo 1 bị ăn: phồng lên rồi biến mất (70-86).
  for (const p of [ap1, ap1s]) {
    keys(riv, an, p.id, SX, [[0, 1], [70, 1], [78, 1.3], [86, 0], [D, 0]]);
    keys(riv, an, p.id, SY, [[0, 1], [70, 1], [78, 1.3], [86, 0], [D, 0]]);
  }
  // Táo 2 bật lên (86-104).
  for (const p of [ap2, ap2s]) {
    keys(riv, an, p.id, SX, [[0, 0], [86, 0], [96, 1.3], [104, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [86, 0], [96, 1.3], [104, 1], [D, 1]]);
  }
  // Đốt mới mọc ở đuôi (100-120).
  keys(riv, an, newSeg.id, SX, [[0, 0], [100, 0], [112, 1.2], [120, 1], [D, 1]]);
  keys(riv, an, newSeg.id, SY, [[0, 0], [100, 0], [112, 1.2], [120, 1], [D, 1]]);
  // Sao vàng bật (125-145).
  keys(riv, an, star.id, SX, [[0, 0], [125, 0], [136, 1.2], [145, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [125, 0], [136, 1.2], [145, 1], [D, 1]]);
  fadeEnds(riv, an, [star, head, eye, ...segs, newSeg, ap1, ap1s, ap2, ap2s], D);
  save('ransanmoi', riv);
}

// ---- 82. xepkeo: 3 KẸO ĐỎ THÀNH HÀNG — HÀNG BIẾN MẤT, KẸO MỚI RƠI XUỐNG (180f = 3s).
// Lưới 3×3: hàng giữa 3 kẹo đỏ bật lần lượt, sáng lên rồi biến mất, 3 kẹo
// mới rơi từ trên xuống lấp đầy, sao vàng bật lên.
{
  const { riv, ab, root } = newFile('xepkeo');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Kẹo = tròn màu + chấm sáng trắng (chấm add trước = trên cùng).
  const mkCandy = (cx, cy, color) => {
    const hl = ell(riv, root, { name: 'HL', x: cx - 8, y: cy - 8, w: 10, color: WHITE });
    const c = ell(riv, root, { name: 'C', x: cx, y: cy, w: 36, color, stroke: INK, strokeW: 2 });
    return [hl, c];
  };
  // 6 kẹo tĩnh (trên + dưới).
  const statics = [
    ...mkCandy(150, 60, TEAL), ...mkCandy(200, 60, YELLOW), ...mkCandy(250, 60, hex('#2B6CB0')),
    ...mkCandy(150, 160, YELLOW), ...mkCandy(200, 160, TEAL), ...mkCandy(250, 160, LAVENDER),
  ];
  // Hàng giữa 3 kẹo đỏ (bật lần lượt, sáng lên, biến mất).
  const row = [...mkCandy(150, 110, RED), ...mkCandy(200, 110, RED), ...mkCandy(250, 110, RED)];
  // 3 kẹo mới rơi từ trên xuống lấp đầy hàng giữa.
  const news = [
    ...mkCandy(150, 10, YELLOW), ...mkCandy(200, 10, TEAL), ...mkCandy(250, 10, hex('#2B6CB0')),
  ];
  bg(riv, root, VIOLET);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Hàng đỏ bật lần lượt (10-58) — scale từng cặp (chấm + tròn).
  const rowPairs = [[row[0], row[1]], [row[2], row[3]], [row[4], row[5]]];
  rowPairs.forEach(([hl, c], i) => {
    const t = 10 + i * 15;
    for (const p of [hl, c]) {
      keys(riv, an, p.id, SX, [[0, 0], [t, 0], [t + 8, 1.2], [t + 14, 1], [58, 1], [68, 1.18], [78, 1], [D, 1]]);
      keys(riv, an, p.id, SY, [[0, 0], [t, 0], [t + 8, 1.2], [t + 14, 1], [58, 1], [68, 1.18], [78, 1], [D, 1]]);
    }
  });
  // Hàng đỏ mờ dần (78-95) — key opacity RIÊNG (không cho vào fadeEnds).
  for (const p of row) keys(riv, an, p.id, OPACITY, [[0, 1], [78, 1], [95, 0], [D, 0]], 'linear');
  // Kẹo mới rơi từ trên xuống (95-135, lệch nhau 10f mỗi cột) — tàng hình
  // tới lúc rơi (key opacity RIÊNG, không cho vào fadeEnds).
  const newsPairs = [[news[0], news[1]], [news[2], news[3]], [news[4], news[5]]];
  newsPairs.forEach(([hl, c], i) => {
    const t0 = 95 + i * 10;
    for (const p of [hl, c]) {
      keys(riv, an, p.id, Y, [[0, p.y], [t0, 10], [t0 + 16, 118], [t0 + 22, 110], [D, 110]]);
      keys(riv, an, p.id, OPACITY, [[0, 0], [t0, 0], [t0 + 4, 1], [D, 1]], 'linear');
    }
  });
  // Sao vàng bật (140-160).
  keys(riv, an, star.id, SX, [[0, 0], [140, 0], [151, 1.2], [160, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [140, 0], [151, 1.2], [160, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...statics], D);
  save('xepkeo', riv);
}

// ---- 83. banbong: BÓNG NẢY PHÁ 3 GẠCH — THANH ĐỠ TRƯỢT THEO (180f = 3s).
// Thanh đỡ trượt qua lại, bóng nảy lên phá 3 viên gạch giữa hàng dưới,
// bóng rơi về thanh đỡ, sao vàng bật lên.
{
  const { riv, ab, root } = newFile('banbong');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // 2 hàng gạch 5 viên (y=48, y=72); 3 viên giữa hàng dưới bị phá.
  const brickCols1 = [RED, YELLOW, TEAL, hex('#2B6CB0'), LAVENDER];
  const brickCols2 = [hex('#FF9F43'), VIOLET, YELLOW, RED, TEAL];
  const topRow = [];
  for (let i = 0; i < 5; i++) topRow.push(rect(riv, root, { name: 'T' + i, x: 120 + i * 40, y: 48, w: 36, h: 18, r: 3, color: brickCols1[i], stroke: INK, strokeW: 2 }));
  const botRow = [];
  for (let i = 0; i < 5; i++) botRow.push(rect(riv, root, { name: 'B' + i, x: 120 + i * 40, y: 72, w: 36, h: 18, r: 3, color: brickCols2[i], stroke: INK, strokeW: 2 }));
  // Bóng trắng + thanh đỡ vàng.
  const ball = ell(riv, root, { name: 'Ball', x: 200, y: 158, w: 16, color: WHITE, stroke: INK, strokeW: 2 });
  const paddle = rect(riv, root, { name: 'Paddle', x: 200, y: 172, w: 64, h: 10, r: 5, color: YELLOW, stroke: INK, strokeW: 2 });
  bg(riv, root, NIGHT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Bóng bay lên phá gạch (0-50) rồi rơi về thanh đỡ (50-110).
  keys(riv, an, ball.id, Y, [[0, 158], [50, 80], [110, 158], [D, 158]]);
  // Thanh đỡ trượt theo bóng.
  keys(riv, an, paddle.id, X, [[0, 200], [25, 170], [50, 200], [75, 230], [110, 200], [D, 200]]);
  // 3 gạch giữa hàng dưới: chớp khi bị phá (55-70) rồi biến mất (70-85) —
  // key opacity RIÊNG (không cho vào fadeEnds).
  for (const i of [1, 2, 3]) {
    keys(riv, an, botRow[i].id, OPACITY, [[0, 0], [6, 1], [55, 1], [63, 0.3], [70, 1], [85, 0], [D, 0]], 'linear');
  }
  // Sao vàng bật (120-140).
  keys(riv, an, star.id, SX, [[0, 0], [120, 0], [131, 1.2], [140, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [120, 0], [131, 1.2], [140, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ball, paddle, ...topRow, botRow[0], botRow[4]], D);
  save('banbong', riv);
}

// ---- 84. nonogram: 5 Ô TÔ ĐEN LẦN LƯỢT — 1 Ô ĐÁNH X ĐỎ SAI (180f = 3s).
// Lưới 10×10 + dải gợi ý xanh trên/trái: 5 ô tô đen lần lượt thành hình,
// 1 ô đánh X đỏ sai + rung lắc, sao vàng bật lên.
{
  const { riv, ab, root } = newFile('nonogram');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // 5 ô tô đen thành hình chữ L ngược (bật lần lượt 10-70).
  const fillCells = [
    [167.5, 67.5], [182.5, 67.5], [197.5, 67.5], [197.5, 82.5], [197.5, 97.5],
  ].map(([x, y], i) => rect(riv, root, { name: 'F' + i, x, y, w: 14, h: 14, color: INK }));
  // Dấu X đỏ sai ở (242.5,127.5) — 2 vạch xoay.
  const x1 = poly(riv, root, { name: 'X1', cx: 242.5, cy: 127.5, points: rotRectPoints(242.5, 127.5, 20, 5, 0.785), color: RED });
  const x2 = poly(riv, root, { name: 'X2', cx: 242.5, cy: 127.5, points: rotRectPoints(242.5, 127.5, 20, 5, -0.785), color: RED });
  // Con trỏ khung mực: chạy tới từng ô 5f trước khi ô đó tô đen (thêm
  // chuyển động rõ trong mọi cửa sổ lấy mẫu 800ms).
  const cursor = rect(riv, root, { name: 'Cursor', x: 167.5, y: 67.5, w: 18, h: 18, color: rgba(36, 26, 56, 0), stroke: INK, strokeW: 2 });
  // Dải gợi ý xanh: 3 ô trên cột + 3 ô bên trái hàng.
  const clues = [];
  for (const x of [167.5, 182.5, 197.5]) clues.push(rect(riv, root, { name: 'CT' + x, x, y: 20, w: 10, h: 10, r: 2, color: hex('#2B6CB0') }));
  for (const y of [67.5, 82.5, 97.5]) clues.push(rect(riv, root, { name: 'CL' + y, x: 122.5, y, w: 10, h: 10, r: 2, color: hex('#2B6CB0') }));
  // Lưới kẻ (9 dọc + 9 ngang, add sau các ô = nằm trên các ô, dưới nền lưới).
  const lines = [];
  for (let i = 1; i < 10; i++) {
    lines.push(rect(riv, root, { name: 'LV' + i, x: 130 + i * 15, y: 105, w: 1, h: 150, color: SHADOW }));
    lines.push(rect(riv, root, { name: 'LH' + i, x: 200, y: 30 + i * 15, w: 150, h: 1, color: SHADOW }));
  }
  // Nền lưới trắng (add sau lưới kẻ = nằm dưới lưới kẻ, trên nền full-bleed).
  rect(riv, root, { name: 'Grid', x: 200, y: 105, w: 150, h: 150, color: WHITE, stroke: INK, strokeW: 2 });
  bg(riv, root, CREAM);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // 5 ô tô đen bật lần lượt (10-70).
  fillCells.forEach((c, i) => {
    const t = 10 + i * 12;
    keys(riv, an, c.id, SX, [[0, 0], [t, 0], [t + 6, 1.15], [t + 10, 1], [D, 1]]);
    keys(riv, an, c.id, SY, [[0, 0], [t, 0], [t + 6, 1.15], [t + 10, 1], [D, 1]]);
  });
  // Con trỏ chạy tới từng ô trước khi ô đó tô đen (5-65).
  keys(riv, an, cursor.id, X, [[0, 167.5], [5, 167.5], [17, 182.5], [29, 197.5], [41, 197.5], [53, 197.5], [65, 197.5], [D, 197.5]]);
  keys(riv, an, cursor.id, Y, [[0, 67.5], [5, 67.5], [17, 67.5], [29, 67.5], [41, 82.5], [53, 97.5], [65, 97.5], [D, 97.5]]);
  // Dấu X đỏ bật (85-95) rồi rung lắc (95-130).
  for (const p of [x1, x2]) {
    keys(riv, an, p.id, SX, [[0, 0], [85, 0], [91, 1.25], [95, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [85, 0], [91, 1.25], [95, 1], [D, 1]]);
    keys(riv, an, p.id, ROT, [[0, 0], [95, 0], [100, 0.07], [105, -0.07], [110, 0.07], [115, -0.07], [120, 0], [D, 0]]);
  }
  // Sao vàng bật (130-150).
  keys(riv, an, star.id, SX, [[0, 0], [130, 0], [141, 1.2], [150, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [130, 0], [141, 1.2], [150, 1], [D, 1]]);
  fadeEnds(riv, an, [star, cursor, ...fillCells, x1, x2], D);
  save('nonogram', riv);
}

// ---- 85. ghephinh: 3 MẢNH TRƯỢT VÀO KHỚP THÀNH HÌNH MẶT TRỜI (180f = 3s).
// Lưới 3×3: hàng trên trời xanh + mặt trời vàng ở ô giữa, hàng dưới đồi
// xanh; 3 mảnh trượt vào từ 3 hướng, mảnh góc dưới phải xoay rồi khớp.
{
  const { riv, ab, root } = newFile('ghephinh');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Mặt trời trên ô giữa hàng trên (ô này đứng yên): 4 tia + vòng tròn.
  const rays = [
    rect(riv, root, { name: 'RayT', x: 200, y: 52, w: 3, h: 8, color: YELLOW }),
    rect(riv, root, { name: 'RayB', x: 200, y: 88, w: 3, h: 8, color: YELLOW }),
    rect(riv, root, { name: 'RayL', x: 182, y: 70, w: 8, h: 3, color: YELLOW }),
    rect(riv, root, { name: 'RayR', x: 218, y: 70, w: 8, h: 3, color: YELLOW }),
  ];
  const sun = ell(riv, root, { name: 'Sun', x: 200, y: 70, w: 22, color: YELLOW, stroke: INK, strokeW: 2 });
  // 9 mảnh 40×40: trên trời xanh, dưới đồi xanh.
  const SKY = hex('#A8D8EA'), HILL = hex('#58A05C');
  const grid = [
    [160, 70, SKY], [200, 70, SKY], [240, 70, SKY],
    [160, 110, SKY], [200, 110, SKY], [240, 110, SKY],
    [160, 150, HILL], [200, 150, HILL], [240, 150, HILL],
  ].map(([x, y, c], i) => rect(riv, root, { name: 'P' + i, x, y, w: 40, h: 40, color: c, stroke: INK, strokeW: 2 }));
  bg(riv, root, CREAM);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Mảnh (0,0) trượt từ trái (10-30), (2,0) trượt từ phải (20-40).
  keys(riv, an, grid[0].id, X, [[0, 100], [10, 100], [30, 160], [D, 160]]);
  keys(riv, an, grid[2].id, X, [[0, 300], [20, 300], [40, 240], [D, 240]]);
  // Mảnh góc dưới phải xoay + trượt từ dưới phải vào (60-90).
  keys(riv, an, grid[8].id, X, [[0, 280], [60, 280], [90, 240], [D, 240]]);
  keys(riv, an, grid[8].id, Y, [[0, 180], [60, 180], [90, 150], [D, 150]]);
  keys(riv, an, grid[8].id, ROT, [[0, 0.6], [60, 0.6], [90, 0], [D, 0]]);
  // Mặt trời bật lên (45-65).
  for (const p of [...rays, sun]) {
    keys(riv, an, p.id, SX, [[0, 0], [45, 0], [56, 1.15], [65, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [45, 0], [56, 1.15], [65, 1], [D, 1]]);
  }
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...rays, sun, grid[0], grid[2], grid[8]], D);
  save('ghephinh', riv);
}

// ---- 86. nhen: DÃY 13 LÁ K→A BAY LÊN KHỎI CỘT THÀNH BỘ (180f = 3s).
// 3 cột bài: cột giữa là 1 dãy 13 lá cùng chất bích (K→A) xếp chồng,
// dãy bay lên + mờ đi (đã thu đủ 1 bộ); 2 cột bên đứng yên.
{
  const { riv, ab, root } = newFile('nhen');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Dãy 13 lá cột giữa: mỗi lá là 1 dải 48×16, chất bích mực.
  const run = [];
  for (let i = 0; i < 13; i++) {
    const y = 25 + i * 11;
    run.push(...suitPip(riv, root, 200, y, 9, 'spade', INK));
    run.push(rect(riv, root, { name: 'R' + i, x: 200, y, w: 48, h: 16, color: CREAM, stroke: INK, strokeW: 1 }));
  }
  // 2 cột bên: vài lá úp/ngửa đứng yên.
  const side = [];
  const sideCols = [
    [130, [60, 71, 82, 93], ['heart', 'diamond', 'club', 'spade']],
    [270, [70, 81, 92], ['diamond', 'heart', 'club']],
  ];
  for (const [cx, ys, suits] of sideCols) {
    ys.forEach((y, i) => {
      side.push(...suitPip(riv, root, cx, y, 9, suits[i], suits[i] === 'heart' || suits[i] === 'diamond' ? RED : INK));
      side.push(rect(riv, root, { name: 'S' + cx + i, x: cx, y, w: 48, h: 16, color: CREAM, stroke: INK, strokeW: 1 }));
    });
  }
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Dãy bay lên (30-70) + mờ đi, reset trong lúc tàng hình (95-105),
  // hiện lại trước cuối vòng — key opacity RIÊNG, KHÔNG cho vào fadeEnds.
  // (Nhịp cũ 90-130 rơi sau cửa sổ lấy mẫu 0,4-1,2s nên pixel đổi = 0.)
  for (const p of run) {
    keys(riv, an, p.id, Y, [[0, p.y], [30, p.y], [70, p.y - 70], [95, p.y - 70], [105, p.y], [D, p.y]]);
    keys(riv, an, p.id, OPACITY, [[0, 1], [30, 1], [70, 0], [95, 0], [115, 1], [D, 1]], 'linear');
  }
  // Sao vàng bật (100-120).
  keys(riv, an, star.id, SX, [[0, 0], [100, 0], [111, 1.2], [120, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [100, 0], [111, 1.2], [120, 1], [D, 1]]);
  fadeEnds(riv, an, [star], D);
  save('nhen', riv);
}

// ---- 87. bida8: BI CÁI LĂN TỚI ĐÁNH BI 8 RƠI VÀO LỖ GÓC (180f = 3s).
// Bàn nỉ xanh + 6 lỗ đen: gậy kéo về rồi chọc, bi cái trắng lăn tới chạm
// bi 8 đen, bi 8 lăn chéo vào lỗ góc trên phải rồi chìm xuống, sao vàng.
{
  const { riv, ab, root } = newFile('bida8');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Gậy (sau bi cái, kéo về 0-15 rồi chọc 15-25).
  const stick = rect(riv, root, { name: 'Stick', x: 102, y: 100, w: 56, h: 5, r: 2, color: SAND2, stroke: INK, strokeW: 1 });
  // Bi cái trắng + bi 8 đen (chấm trắng giữa).
  const cueDot = ell(riv, root, { name: 'CueDot', x: 140, y: 100, w: 3, color: INK });
  const cue = ell(riv, root, { name: 'Cue', x: 140, y: 100, w: 16, color: WHITE, stroke: INK, strokeW: 2 });
  const eDot = ell(riv, root, { name: 'EDot', x: 250, y: 100, w: 7, color: WHITE });
  const eight = ell(riv, root, { name: 'Eight', x: 250, y: 100, w: 18, color: INK, stroke: WHITE, strokeW: 1 });
  // 3 bi màu tĩnh làm nền.
  const b1 = ell(riv, root, { name: 'B1', x: 170, y: 75, w: 14, color: RED, stroke: INK, strokeW: 1 });
  const b2 = ell(riv, root, { name: 'B2', x: 230, y: 125, w: 14, color: YELLOW, stroke: INK, strokeW: 1 });
  const b3 = ell(riv, root, { name: 'B3', x: 272, y: 75, w: 14, color: hex('#2B6CB0'), stroke: INK, strokeW: 1 });
  // 6 lỗ đen (add trước bàn nỉ = nằm trên mép bàn).
  const pockets = [[105, 55], [200, 55], [295, 55], [105, 145], [200, 145], [295, 145]]
    .map(([x, y], i) => ell(riv, root, { name: 'Pocket' + i, x, y, w: 14, color: INK }));
  // Bàn nỉ + ray gỗ (ray add sau bàn = nằm dưới, lộ viền quanh).
  rect(riv, root, { name: 'Felt', x: 200, y: 100, w: 200, h: 100, r: 8, color: FELT, stroke: INK, strokeW: 2 });
  rect(riv, root, { name: 'Rail', x: 200, y: 100, w: 220, h: 120, r: 10, color: hex('#8B5A2B'), stroke: INK, strokeW: 2 });
  bg(riv, root, CREAM);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Gậy kéo về rồi chọc (nhịp dời sớm để cửa sổ lấy mẫu 0,4-1,2s bắt
  // được cả cú lăn của bi cái + bi 8 — nhịp cũ chỉ đo được 59).
  keys(riv, an, stick.id, X, [[0, 102], [12, 88], [20, 102], [D, 102]]);
  // Bi cái lăn tới chạm bi 8 (20-55), nhích thêm chút sau va chạm.
  for (const p of [cue, cueDot]) {
    keys(riv, an, p.id, X, [[0, 140], [20, 140], [55, 233], [62, 238], [D, 238]]);
  }
  // Bi 8 lăn chéo vào lỗ góc (55-95) rồi chìm xuống (95-108).
  for (const p of [eight, eDot]) {
    keys(riv, an, p.id, X, [[0, 250], [55, 250], [95, 288], [108, 293], [D, 293]]);
    keys(riv, an, p.id, Y, [[0, 100], [55, 100], [95, 62], [108, 57], [D, 57]]);
    keys(riv, an, p.id, SX, [[0, 1], [95, 1], [108, 0.3], [D, 0.3]]);
    keys(riv, an, p.id, SY, [[0, 1], [95, 1], [108, 0.3], [D, 0.3]]);
  }
  // Sao vàng bật (108-128).
  keys(riv, an, star.id, SX, [[0, 0], [108, 0], [119, 1.2], [128, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [108, 0], [119, 1.2], [128, 1], [D, 1]]);
  fadeEnds(riv, an, [star, stick, cue, cueDot, eight, eDot], D);
  save('bida8', riv);
}

// ---- 88. dapenalty: BÓNG LĂN VÀO GÓC LƯỚI, THỦ MÔN BAY SAI HƯỚNG (180f = 3s).
// Khung thành 3×3 + lưới: bóng từ chấm phạt đền lăn vào góc trên trái,
// thủ môn bay người sang phải (sai hướng), sao vàng bật lên.
{
  const { riv, ab, root } = newFile('dapenalty');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Thủ môn (đầu + thân xanh lá): bay sang phải + nghiêng (10-50).
  const kHead = ell(riv, root, { name: 'KHead', x: 200, y: 92, w: 18, color: CREAM, stroke: INK, strokeW: 2 });
  const kBody = rect(riv, root, { name: 'KBody', x: 200, y: 118, w: 26, h: 30, r: 8, color: hex('#58A05C'), stroke: INK, strokeW: 2 });
  // Bóng trắng + chấm đen.
  const bDot = poly(riv, root, { name: 'BDot', cx: 200, cy: 172, points: [[200, 167], [205, 171], [203, 177], [197, 177], [195, 171]], color: INK });
  const ball = ell(riv, root, { name: 'Ball', x: 200, y: 172, w: 18, color: WHITE, stroke: INK, strokeW: 2 });
  // Lưới (add trước khung = nằm dưới khung, lộ qua ô lưới).
  const net = [];
  for (const x of [165, 200, 235]) net.push(rect(riv, root, { name: 'NV' + x, x, y: 97, w: 1, h: 105, color: hex('#9DB8C4') }));
  for (const y of [80, 115]) net.push(rect(riv, root, { name: 'NH' + y, x: 200, y, w: 140, h: 1, color: hex('#9DB8C4') }));
  // Khung thành trắng: 2 cột + xà ngang.
  rect(riv, root, { name: 'PostL', x: 130, y: 97, w: 6, h: 110, color: WHITE, stroke: INK, strokeW: 2 });
  rect(riv, root, { name: 'PostR', x: 270, y: 97, w: 6, h: 110, color: WHITE, stroke: INK, strokeW: 2 });
  rect(riv, root, { name: 'Bar', x: 200, y: 45, w: 146, h: 6, color: WHITE, stroke: INK, strokeW: 2 });
  bg(riv, root, hex('#3E9B4F'));
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Bóng lăn vào góc trên trái (0-40).
  for (const p of [ball, bDot]) {
    keys(riv, an, p.id, X, [[0, 200], [40, 142], [D, 142]]);
    keys(riv, an, p.id, Y, [[0, 172], [40, 58], [D, 58]]);
    keys(riv, an, p.id, SX, [[0, 1], [40, 0.9], [D, 0.9]]);
    keys(riv, an, p.id, SY, [[0, 1], [40, 0.9], [D, 0.9]]);
  }
  // Thủ môn bay sang phải + nghiêng (10-50).
  for (const p of [kHead, kBody]) {
    keys(riv, an, p.id, X, [[0, p.x], [10, p.x], [50, p.x + 55], [D, p.x + 55]]);
    keys(riv, an, p.id, Y, [[0, p.y], [10, p.y], [50, p.y + 12], [D, p.y + 12]]);
    keys(riv, an, p.id, ROT, [[0, 0], [10, 0], [50, 0.5], [D, 0.5]]);
  }
  // Sao vàng bật (60-80).
  keys(riv, an, star.id, SX, [[0, 0], [60, 0], [71, 1.2], [80, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [60, 0], [71, 1.2], [80, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ball, bDot, kHead, kBody], D);
  save('dapenalty', riv);
}

// ---- 89. phitieu: 3 PHI TIÊU BAY LẦN LƯỢT GĂM VÀO BIA (180f = 3s).
// Bia phi tiêu 5 vòng đồng tâm: phi tiêu 1 găm 20 trên, phi tiêu 2 găm
// 20 trái, phi tiêu 3 găm bull giữa; bia rung nhẹ mỗi lần trúng, sao vàng.
{
  const { riv, ab, root } = newFile('phitieu');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // 3 phi tiêu (1 poly mỗi cái, mũi hướng trái): bay vào rồi găm.
  const dartPts = (cx, cy) => [[cx - 19, cy], [cx - 9, cy - 3], [cx + 11, cy - 3], [cx + 19, cy - 9], [cx + 19, cy + 9], [cx + 11, cy + 3], [cx - 9, cy + 3]];
  const d1 = poly(riv, root, { name: 'D1', cx: 254, cy: 70, points: dartPts(254, 70), color: RED, stroke: INK, strokeW: 1 });
  const d2 = poly(riv, root, { name: 'D2', cx: 187, cy: 78, points: dartPts(187, 78), color: TEAL, stroke: INK, strokeW: 1 });
  const d3 = poly(riv, root, { name: 'D3', cx: 219, cy: 100, points: dartPts(219, 100), color: YELLOW, stroke: INK, strokeW: 1 });
  // Bia: thêm từ trong ra ngoài (thêm trước = vẽ trên) — tâm đỏ, vòng
  // xanh, kem, đỏ, kem, vành đen ngoài cùng.
  const bull = ell(riv, root, { name: 'Bull', x: 200, y: 100, w: 16, color: RED });
  const ringG = ell(riv, root, { name: 'RingG', x: 200, y: 100, w: 36, color: hex('#2E7D32') });
  const ringC1 = ell(riv, root, { name: 'RingC1', x: 200, y: 100, w: 56, color: CREAM });
  const ringR = ell(riv, root, { name: 'RingR', x: 200, y: 100, w: 80, color: RED });
  const ringC2 = ell(riv, root, { name: 'RingC2', x: 200, y: 100, w: 104, color: CREAM });
  const ringB = ell(riv, root, { name: 'RingB', x: 200, y: 100, w: 130, color: INK, stroke: INK, strokeW: 2 });
  bg(riv, root, NIGHT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Phi tiêu 1 bay vào (0-30), góc -0.12.
  keys(riv, an, d1.id, X, [[0, 400], [30, 254], [D, 254]]);
  keys(riv, an, d1.id, Y, [[0, 40], [30, 70], [D, 70]]);
  keys(riv, an, d1.id, ROT, [[0, -0.12], [D, -0.12]]);
  // Phi tiêu 2 bay vào (35-65), góc 0.1.
  keys(riv, an, d2.id, X, [[0, 400], [35, 400], [65, 187], [D, 187]]);
  keys(riv, an, d2.id, Y, [[0, 140], [35, 140], [65, 78], [D, 78]]);
  keys(riv, an, d2.id, ROT, [[0, 0.1], [D, 0.1]]);
  // Phi tiêu 3 bay vào bull (70-100), ngang.
  keys(riv, an, d3.id, X, [[0, 400], [70, 400], [100, 219], [D, 219]]);
  keys(riv, an, d3.id, Y, [[0, 80], [70, 80], [100, 100], [D, 100]]);
  keys(riv, an, d3.id, ROT, [[0, 0], [D, 0]]);
  // Bia rung nhẹ mỗi lần trúng (30 / 65 / 100).
  for (const p of [bull, ringG, ringC1, ringR, ringC2, ringB]) {
    keys(riv, an, p.id, ROT, [[0, 0], [30, 0.02], [36, -0.02], [42, 0], [65, 0.02], [71, -0.02], [77, 0], [100, 0.02], [106, -0.02], [112, 0], [D, 0]]);
  }
  // Sao vàng bật (110-130).
  keys(riv, an, star.id, SX, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [110, 0], [121, 1.2], [130, 1], [D, 1]]);
  fadeEnds(riv, an, [star, d1, d2, d3], D);
  save('phitieu', riv);
}

// ---- 90. keobuabao: KÉO THẮNG BAO — TAY BAO MỜ ĐI (180f = 3s).
// 2 tay trượt vào từ 2 bên: tay kéo (2 ngón chéo) bên trái, tay bao
// (bàn tay xòe) bên phải; kéo cắt thắng ở 60f, tay bao nghiêng + mờ đi,
// chấm điểm vàng đầu tiên sáng lên, sao vàng bật lên.
{
  const { riv, ab, root } = newFile('keobuabao');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Tay kéo: 2 ngón chéo + lòng bàn tay + ngón cái.
  const f1 = poly(riv, root, { name: 'F1', cx: 138, cy: 82, points: rotRectPoints(138, 82, 8, 26, -0.5), color: CREAM, stroke: INK, strokeW: 2 });
  const f2 = poly(riv, root, { name: 'F2', cx: 162, cy: 82, points: rotRectPoints(162, 82, 8, 26, 0.5), color: CREAM, stroke: INK, strokeW: 2 });
  const thumbS = ell(riv, root, { name: 'ThumbS', x: 168, y: 112, w: 10, color: CREAM, stroke: INK, strokeW: 2 });
  const palmS = ell(riv, root, { name: 'PalmS', x: 150, y: 105, w: 38, color: CREAM, stroke: INK, strokeW: 2 });
  // Tay bao: bàn tay xòe + 4 đầu ngón trên mép.
  const bumps = [[232, 84], [242, 80], [258, 80], [268, 84]]
    .map(([x, y], i) => ell(riv, root, { name: 'Bump' + i, x, y, w: 10, color: CREAM, stroke: INK, strokeW: 2 }));
  const palmP = rect(riv, root, { name: 'PalmP', x: 250, y: 105, w: 42, h: 46, r: 8, color: CREAM, stroke: INK, strokeW: 2 });
  // 3 chấm điểm trên tay kéo: chấm vàng add TRƯỚC chấm xám (thêm trước
  // = vẽ TRÊN) để chấm vàng hiện lên trên chấm xám ở 90f.
  const goldDot = ell(riv, root, { name: 'GoldDot', x: 130, y: 45, w: 12, color: GOLD, stroke: INK, strokeW: 2 });
  const dots = [130, 150, 170].map((x) => ell(riv, root, { name: 'Dot' + x, x, y: 45, w: 12, color: hex('#C9C4D6'), stroke: INK, strokeW: 2 }));
  bg(riv, root, FELT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // 2 tay trượt vào (0-25) rồi nhún nhẹ (30-55).
  const scis = [f1, f2, thumbS, palmS];
  const paper = [...bumps, palmP];
  for (const p of scis) {
    keys(riv, an, p.id, X, [[0, p.x - 90], [25, p.x], [D, p.x]]);
    keys(riv, an, p.id, Y, [[0, p.y], [30, p.y], [40, p.y - 4], [50, p.y], [60, p.y], [75, p.y - 10], [90, p.y], [D, p.y]]);
  }
  for (const p of paper) {
    keys(riv, an, p.id, X, [[0, p.x + 90], [25, p.x], [D, p.x]]);
    keys(riv, an, p.id, Y, [[0, p.y], [30, p.y], [40, p.y - 4], [50, p.y], [60, p.y], [100, p.y + 15], [D, p.y + 15]]);
    keys(riv, an, p.id, ROT, [[0, 0], [60, 0], [100, 0.35], [D, 0.35]]);
    // Mờ đi sau khi thua (60-100) + mờ vào/ra ở 2 đầu vòng — key
    // opacity RIÊNG, KHÔNG cho vào fadeEnds.
    keys(riv, an, p.id, OPACITY, [[0, 0], [6, 1], [60, 1], [100, 0.35], [168, 0.35], [180, 0]], 'linear');
  }
  // Chấm điểm vàng đầu tiên sáng lên (90-100).
  keys(riv, an, goldDot.id, SX, [[0, 0], [90, 0], [96, 1.2], [100, 1], [D, 1]]);
  keys(riv, an, goldDot.id, SY, [[0, 0], [90, 0], [96, 1.2], [100, 1], [D, 1]]);
  // Sao vàng bật (100-120).
  keys(riv, an, star.id, SX, [[0, 0], [100, 0], [111, 1.2], [120, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [100, 0], [111, 1.2], [120, 1], [D, 1]]);
  fadeEnds(riv, an, [star, goldDot, ...scis], D);
  save('keobuabao', riv);
}

// ---- 91. dovui: Ô ĐÚNG BẬT VÀNG — THANG SAO SÁNG DẦN (180f = 3s).
// Thanh câu hỏi trên + 4 ô đáp án 2×2: ô C (dưới trái) bật lớp vàng +
// tia sáng; 5 sao thang trên cùng sáng dần từ trái sang phải; sao vàng.
{
  const { riv, ab, root } = newFile('dovui');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // 5 sao thang: sao VÀNG add TRƯỚC sao xám (thêm trước = vẽ TRÊN) để
  // sao vàng hiện lên trên sao xám khi bật dần 20-70.
  const goldStars = [130, 165, 200, 235, 270].map((x) =>
    poly(riv, root, { name: 'LS' + x, cx: x, cy: 32, points: starPoints(x, 32, 7), color: GOLD, stroke: INK, strokeW: 1 }));
  const grayStars = [130, 165, 200, 235, 270].map((x) =>
    poly(riv, root, { name: 'GS' + x, cx: x, cy: 32, points: starPoints(x, 32, 7), color: hex('#C9C4D6'), stroke: INK, strokeW: 1 }));
  // Ô đúng (C, dưới trái): lớp vàng + chấm màu add TRƯỚC các ô đáp án
  // để lớp vàng phủ lên trên ô C và chấm màu hiện trên các ô.
  const goldLay = rect(riv, root, { name: 'GoldLay', x: 150, y: 150, w: 80, h: 34, r: 6, color: GOLD, stroke: INK, strokeW: 2 });
  const cellDots = [[126, 105, RED], [226, 105, TEAL], [126, 150, GOLD], [226, 150, LAVENDER]].map(([x, y, c], i) =>
    ell(riv, root, { name: 'CD' + i, x, y, w: 10, color: c }));
  // 4 ô đáp án 2×2.
  const cells = [[150, 105], [250, 105], [150, 150], [250, 150]].map(([x, y], i) =>
    rect(riv, root, { name: 'Cell' + i, x, y, w: 80, h: 34, r: 6, color: CREAM, stroke: INK, strokeW: 2 }));
  // Thanh câu hỏi: nền kem + 3 vạch chữ xám (vạch add trước = trên).
  const qLines = [[170, 58], [200, 58], [230, 58]].map(([x, y], i) =>
    rect(riv, root, { name: 'QL' + i, x, y, w: 44, h: 4, color: hex('#9DB8C4') }));
  rect(riv, root, { name: 'QBar', x: 200, y: 62, w: 240, h: 22, r: 8, color: CREAM, stroke: INK, strokeW: 2 });
  // 4 tia sáng quanh ô đúng.
  const rays = [
    rect(riv, root, { name: 'RayT', x: 150, y: 122, w: 3, h: 10, color: GOLD }),
    rect(riv, root, { name: 'RayB', x: 150, y: 178, w: 3, h: 10, color: GOLD }),
    rect(riv, root, { name: 'RayL', x: 102, y: 150, w: 10, h: 3, color: GOLD }),
    rect(riv, root, { name: 'RayR', x: 198, y: 150, w: 10, h: 3, color: GOLD }),
  ];
  bg(riv, root, NIGHT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // 5 sao thang sáng dần (20-70).
  goldStars.forEach((s, i) => {
    const t = 20 + i * 10;
    keys(riv, an, s.id, SX, [[0, 0], [t, 0], [t + 6, 1.2], [t + 10, 1], [D, 1]]);
    keys(riv, an, s.id, SY, [[0, 0], [t, 0], [t + 6, 1.2], [t + 10, 1], [D, 1]]);
  });
  // 4 ô đáp án bật lần lượt (0-30).
  cells.forEach((c, i) => {
    const t = i * 6;
    keys(riv, an, c.id, SX, [[0, 0], [t, 0], [t + 8, 1.1], [t + 12, 1], [D, 1]]);
    keys(riv, an, c.id, SY, [[0, 0], [t, 0], [t + 8, 1.1], [t + 12, 1], [D, 1]]);
  });
  // Lớp vàng ô đúng bật lên (70-85) — key opacity RIÊNG, KHÔNG fadeEnds.
  keys(riv, an, goldLay.id, OPACITY, [[0, 0], [70, 0], [85, 1], [168, 1], [180, 0]], 'linear');
  // 4 tia sáng bật (85-100).
  for (const p of rays) {
    keys(riv, an, p.id, SX, [[0, 0], [85, 0], [92, 1.2], [100, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [85, 0], [92, 1.2], [100, 1], [D, 1]]);
  }
  // Sao vàng bật (100-120).
  keys(riv, an, star.id, SX, [[0, 0], [100, 0], [111, 1.2], [120, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [100, 0], [111, 1.2], [120, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...goldStars, ...rays, ...cells, ...cellDots], D);
  save('dovui', riv);
}

// ---- 92. hoisanquai: QUÁI BỊ CHÉM — ANH HÙNG BẬT LÊN (180f = 3s).
// 3 lá quái lật lên lần lượt (troll xanh, rồng đỏ, yêu tinh tím); lá
// rồng giữa bị chém (vết chém trắng + rung + mờ xuống), lá anh hùng
// (kiếm vàng) bật lên dưới, sao vàng bật lên.
{
  const { riv, ab, root } = newFile('hoisanquai');
  const D = 180;
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Vết chém trắng chéo qua lá rồng — add TRƯỚC các lá quái (thêm trước
  // = vẽ TRÊN) để vết chém hiện lên trên lá rồng; key opacity RIÊNG,
  // KHÔNG cho vào fadeEnds.
  const slash = poly(riv, root, { name: 'Slash', cx: 200, cy: 85, points: rotRectPoints(200, 85, 64, 6, -0.6), color: WHITE, stroke: INK, strokeW: 1 });
  // Lá quái: lưng tím + mặt quái riêng (đặc điểm add trước nền mặt).
  const mkMonster = (cx, cy, bgColor, kind) => {
    const back = [];
    back.push(ell(riv, root, { name: 'BDot', x: cx, y: cy, w: 9, color: WHITE }));
    back.push(rect(riv, root, { name: 'BIn', x: cx, y: cy, w: 42, h: 60, r: 4, color: CREAM }));
    back.push(rect(riv, root, { name: 'BBg', x: cx, y: cy, w: 54, h: 72, r: 6, color: VIOLET, stroke: INK, strokeW: 2 }));
    const face = [];
    if (kind === 'dragon') {
      face.push(poly(riv, root, { name: 'HornL', cx: cx - 12, cy: cy - 22, points: [[cx - 16, cy - 14], [cx - 8, cy - 14], [cx - 12, cy - 26]], color: GOLD }));
      face.push(poly(riv, root, { name: 'HornR', cx: cx + 12, cy: cy - 22, points: [[cx + 8, cy - 14], [cx + 16, cy - 14], [cx + 12, cy - 26]], color: GOLD }));
      face.push(ell(riv, root, { name: 'EyeL', x: cx - 8, y: cy - 6, w: 6, color: WHITE }));
      face.push(ell(riv, root, { name: 'EyeR', x: cx + 8, y: cy - 6, w: 6, color: WHITE }));
      face.push(poly(riv, root, { name: 'FangL', cx: cx - 6, cy: cy + 12, points: [[cx - 9, cy + 8], [cx - 3, cy + 8], [cx - 6, cy + 16]], color: WHITE }));
      face.push(poly(riv, root, { name: 'FangR', cx: cx + 6, cy: cy + 12, points: [[cx + 3, cy + 8], [cx + 9, cy + 8], [cx + 6, cy + 16]], color: WHITE }));
    } else if (kind === 'troll') {
      face.push(ell(riv, root, { name: 'Nose', x: cx, y: cy + 2, w: 12, color: hex('#2E7D32'), stroke: INK, strokeW: 1 }));
      face.push(ell(riv, root, { name: 'EyeL', x: cx - 9, y: cy - 10, w: 6, color: WHITE }));
      face.push(ell(riv, root, { name: 'EyeR', x: cx + 9, y: cy - 10, w: 6, color: WHITE }));
      face.push(rect(riv, root, { name: 'Mouth', x: cx, y: cy + 14, w: 18, h: 3, color: INK }));
    } else {
      face.push(poly(riv, root, { name: 'HornL', cx: cx - 12, cy: cy - 20, points: [[cx - 16, cy - 12], [cx - 8, cy - 12], [cx - 12, -0 + cy - 24]], color: INK }));
      face.push(poly(riv, root, { name: 'HornR', cx: cx + 12, cy: cy - 20, points: [[cx + 8, cy - 12], [cx + 16, cy - 12], [cx + 12, cy - 24]], color: INK }));
      face.push(ell(riv, root, { name: 'EyeL', x: cx - 8, y: cy - 4, w: 6, color: YELLOW }));
      face.push(ell(riv, root, { name: 'EyeR', x: cx + 8, y: cy - 4, w: 6, color: YELLOW }));
      face.push(rect(riv, root, { name: 'Grin', x: cx, y: cy + 12, w: 20, h: 6, r: 3, color: WHITE, stroke: INK, strokeW: 1 }));
    }
    face.push(rect(riv, root, { name: 'FFg', x: cx, y: cy, w: 54, h: 72, r: 6, color: bgColor, stroke: INK, strokeW: 2 }));
    return { back, face, all: [...back, ...face] };
  };
  const troll = mkMonster(120, 85, hex('#58A05C'), 'troll');
  const dragon = mkMonster(200, 85, RED, 'dragon');
  const imp = mkMonster(280, 85, VIOLET, 'imp');
  // Lá anh hùng: kiếm vàng (lưỡi + chắn + chuôi) add trước nền vàng.
  const blade = poly(riv, root, { name: 'Blade', cx: 200, cy: 152, points: rotRectPoints(200, 152, 8, 34, 0.5), color: WHITE, stroke: INK, strokeW: 1 });
  const guard = rect(riv, root, { name: 'Guard', x: 200, y: 172, w: 18, h: 5, r: 2, color: GOLD, stroke: INK, strokeW: 1 });
  const hilt = rect(riv, root, { name: 'Hilt', x: 200, y: 180, w: 6, h: 10, color: INK });
  const heroBg = rect(riv, root, { name: 'HeroBg', x: 200, y: 162, w: 42, h: 52, r: 6, color: GOLD, stroke: INK, strokeW: 2 });
  const hero = [blade, guard, hilt, heroBg];
  bg(riv, root, NIGHT);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // 3 lá quái lật lên lần lượt (10-30 / 25-45 / 40-60).
  flipCard(riv, an, troll, 10, 18, 30, D);
  flipCard(riv, an, dragon, 25, 33, 45, D);
  flipCard(riv, an, imp, 40, 48, 60, D);
  // Vết chém hiện (65-75), lá rồng rung (70-95) + mờ xuống (85-110).
  keys(riv, an, slash.id, OPACITY, [[0, 0], [65, 0], [75, 1], [168, 1], [180, 0]], 'linear');
  for (const p of dragon.all) {
    keys(riv, an, p.id, ROT, [[0, 0], [70, 0], [76, 0.08], [82, -0.08], [88, 0.08], [94, -0.08], [100, 0], [D, 0]]);
    keys(riv, an, p.id, OPACITY, [[0, 0], [6, 1], [85, 1], [110, 0.45], [168, 0.45], [180, 0]], 'linear');
  }
  // Lá anh hùng bật lên (100-125).
  for (const p of hero) {
    keys(riv, an, p.id, SX, [[0, 0], [100, 0], [112, 1.2], [125, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [100, 0], [112, 1.2], [125, 1], [D, 1]]);
  }
  // Sao vàng bật (125-145).
  keys(riv, an, star.id, SX, [[0, 0], [125, 0], [136, 1.2], [145, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [125, 0], [136, 1.2], [145, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...troll.all, ...imp.all, ...hero], D);
  save('hoisanquai', riv);
}

// ---- 93. vuatiengviet: XÁO CHỮ — XẾP THÀNH "BÁNH" + VƯƠNG MIỆN (180f = 3s).
// Hàng trên: 4 ô xáo trộn Á N H B; các ô nhảy xuống hàng đáp án lần lượt
// thành B Á N H; vương miện vàng bật lên + nhấp nháy, sao vàng bật lên.
// Chữ vẽ bằng nét thẳng (runtime Rive không có text), Á có dấu sắc.
{
  const { riv, ab, root } = newFile('vuatiengviet');
  const D = 180;
  const BG_COL = hex('#FFF3CF'); // nền lớp học kem vàng nhạt
  // Chữ cái vẽ bằng nét mực (cao 20, nét 3.5) — trả về các part.
  const letterParts = (cx, cy, ch) => {
    const parts = [];
    if (ch === 'A') {
      parts.push(poly(riv, root, { name: 'LL', cx: cx - 5, cy, points: rotRectPoints(cx - 5, cy, 4, 21, 0.32), color: INK }));
      parts.push(poly(riv, root, { name: 'LR', cx: cx + 5, cy, points: rotRectPoints(cx + 5, cy, 4, 21, -0.32), color: INK }));
      parts.push(rect(riv, root, { name: 'LB', x: cx, y: cy + 4, w: 11, h: 3.5, color: INK }));
      parts.push(poly(riv, root, { name: 'LA', cx: cx + 4, cy: cy - 12.5, points: rotRectPoints(cx + 4, cy - 12.5, 3, 5, -0.55), color: INK }));
    } else if (ch === 'N') {
      parts.push(rect(riv, root, { name: 'NL', x: cx - 6.5, y: cy, w: 3.5, h: 20, color: INK }));
      parts.push(rect(riv, root, { name: 'NR', x: cx + 6.5, y: cy, w: 3.5, h: 20, color: INK }));
      parts.push(poly(riv, root, { name: 'ND', cx, cy, points: rotRectPoints(cx, cy, 3.5, 23, -0.62), color: INK }));
    } else if (ch === 'H') {
      parts.push(rect(riv, root, { name: 'HL', x: cx - 6.5, y: cy, w: 3.5, h: 20, color: INK }));
      parts.push(rect(riv, root, { name: 'HR', x: cx + 6.5, y: cy, w: 3.5, h: 20, color: INK }));
      parts.push(rect(riv, root, { name: 'HB', x: cx, y: cy, w: 13, h: 3.5, color: INK }));
    } else { // 'B': thân + 2 khoang viền (nền trắng, viền mực)
      parts.push(rect(riv, root, { name: 'BS', x: cx - 6.5, y: cy, w: 3.5, h: 20, color: INK }));
      parts.push(rect(riv, root, { name: 'BT', x: cx + 1, y: cy - 5, w: 11, h: 9, r: 3, color: WHITE, stroke: INK, strokeW: 1.5 }));
      parts.push(rect(riv, root, { name: 'BB', x: cx + 1, y: cy + 5, w: 11, h: 9, r: 3, color: WHITE, stroke: INK, strokeW: 1.5 }));
    }
    return parts;
  };
  // Ô chữ: chữ add TRƯỚC nền ô (thêm trước = vẽ TRÊN).
  const mkTile = (cx, cy, ch) => {
    const parts = letterParts(cx, cy, ch);
    parts.push(rect(riv, root, { name: 'TBg', x: cx, y: cy, w: 32, h: 32, r: 5, color: WHITE, stroke: INK, strokeW: 2 }));
    return parts;
  };
  const star = poly(riv, root, { name: 'Star', cx: 316, cy: 42, points: starPoints(316, 42, 12), color: GOLD, stroke: INK, strokeW: 2 });
  // Vương miện vàng giữa trên + đế.
  const crown = suitPip(riv, root, 200, 27, 26, 'crown', GOLD);
  crown.push(rect(riv, root, { name: 'CrBase', x: 200, y: 37, w: 22, h: 4, r: 2, color: GOLD, stroke: INK, strokeW: 1.5 }));
  // Hàng xáo trộn (y=62): Á N H B.
  const tA = mkTile(122, 62, 'A');
  const tN = mkTile(158, 62, 'N');
  const tH = mkTile(194, 62, 'H');
  const tB = mkTile(230, 62, 'B');
  // 4 ô đáp án trống (y=132) — add SAU các ô chữ để ô đáp án nằm DƯỚI
  // ô chữ khi ô nhảy xuống đè lên.
  const slots = [122, 158, 194, 230].map((x) =>
    rect(riv, root, { name: 'Slot', x, y: 132, w: 34, h: 34, r: 5, color: BG_COL, stroke: INK, strokeW: 1.5 }));
  bg(riv, root, BG_COL);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: D, fps: 60, loop: 'loop' });
  // Ô xáo trộn bật lần lượt (0-26).
  const pop = (parts, t0) => {
    for (const p of parts) {
      keys(riv, an, p.id, SX, [[0, 0], [t0, 0], [t0 + 8, 1.2], [t0 + 14, 1], [D, 1]]);
      keys(riv, an, p.id, SY, [[0, 0], [t0, 0], [t0 + 8, 1.2], [t0 + 14, 1], [D, 1]]);
    }
  };
  pop(tA, 0);
  pop(tN, 6);
  pop(tH, 12);
  pop(tB, 18);
  // Nhảy xuống hàng đáp án thành B Á N H (mỗi ô 25f, vòng cung -22).
  const hop = (parts, t0, t1, dx, dy) => {
    for (const p of parts) {
      const x0 = p.x, y0 = p.y, x1 = x0 + dx, y1 = y0 + dy, tm = Math.round((t0 + t1) / 2);
      keys(riv, an, p.id, X, [[t0, x0], [tm, (x0 + x1) / 2], [t1, x1]]);
      keys(riv, an, p.id, Y, [[t0, y0], [tm, (y0 + y1) / 2 - 22], [t1, y1]]);
    }
  };
  hop(tB, 35, 60, -108, 70);
  hop(tA, 60, 85, 36, 70);
  hop(tN, 85, 110, 36, 70);
  hop(tH, 110, 135, 36, 70);
  // Vương miện bật (140-155) + nhấp nháy (158-170).
  for (const p of crown) {
    keys(riv, an, p.id, SX, [[0, 0], [140, 0], [148, 1.2], [155, 1], [D, 1]]);
    keys(riv, an, p.id, SY, [[0, 0], [140, 0], [148, 1.2], [155, 1], [D, 1]]);
    keys(riv, an, p.id, OPACITY, [[0, 0], [140, 0], [148, 1], [158, 1], [164, 0.35], [170, 1], [D, 1]], 'linear');
  }
  // Sao vàng bật (150-165).
  keys(riv, an, star.id, SX, [[0, 0], [150, 0], [158, 1.2], [165, 1], [D, 1]]);
  keys(riv, an, star.id, SY, [[0, 0], [150, 0], [158, 1.2], [165, 1], [D, 1]]);
  fadeEnds(riv, an, [star, ...crown, ...tA, ...tN, ...tH, ...tB, ...slots], D);
  save('vuatiengviet', riv);
}

console.log('done');
