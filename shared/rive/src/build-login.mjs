// Build file .riv cho sự kiện Điểm danh hằng ngày (login streak, patch -91).
// Chạy:
//   cp shared/rive/src/build-login.mjs /tmp/rive-gen/build-login.mjs
//   cd /tmp/rive-gen && node build-login.mjs
// - login.riv: hộp quà ở giữa mở nắp (nắp bay lên, KHÔNG mờ), 6 xu vàng + 3 sao
//   bung ra, ngọn lửa phía trên cháy to dần (tượng trưng chuỗi ngày).
//   Loop 240f = 4s, KHÔNG fade cuối vòng (quy tắc v6): trạng thái cuối giữ
//   nguyên (hộp mở + xu + lửa to) rồi cắt cứng về đầu vòng.
//   Artboard 400×200 (banner đầu modal điểm danh), nền full-bleed 404×204.
// Mount: autoplay, KHÔNG truyền tên animation (xem README); BẮT BUỘC truyền
// layout: new rive.Layout({ fit: rive.Fit.Cover }) — runtime KHÔNG đọc fit:
// top-level (lỗi v6).
// CHỈ build file này — TUYỆT ĐỐI KHÔNG chạy build.mjs (build lại 92 file game).
import { writeFileSync } from 'node:fs';
import { RiveFile, hex, rgba, PropertyKey } from '@stevysmith/rive-generator';

const OUT = '/home/hatch/workspace/bgvn-hisrepo/shared/rive/';
const INK = hex('#241A38');
const RED = hex('#FF5A60');
const YELLOW = hex('#FACD33');
const PALE = hex('#FFE9A8');
const GOLD = hex('#E9A820');
const TEAL = hex('#2EC5B6');
const TEAL_LT = hex('#4ED2C2');
const FLAME = hex('#FF8A3D');
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
  const ab = riv.addArtboard({ name, width: 400, height: 200 });
  const root = riv.addNode(ab, { name: 'Root', x: 0, y: 0 });
  return { riv, ab, root };
}
// Nền full-bleed: add CUỐI CÙNG (thêm sau = vẽ dưới cùng), tràn 404×204 (v6).
function bg(riv, root, color) {
  return rect(riv, root, { name: 'BG', x: 200, y: 100, w: 404, h: 204, color });
}
// Hình thoi lấp lánh (tâm cx,cy, bán kính r).
function sparkle(riv, parent, cx, cy, r = 7) {
  return poly(riv, parent, { name: 'Spark', cx, cy, points: [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]], color: PALE, stroke: GOLD, strokeW: 1.5 });
}

// ---- login: hộp quà điểm danh — mở nắp + xu bung + lửa cháy to (240f = 4s, loop) ----
// f0–30: hộp đóng nảy nhẹ, lửa nhỏ cháy; f25–33: hộp rung; f30–60: nắp bay lên
// (+ nghiêng nhẹ) rồi lơ lửng, xu bung ra; f60–240: lửa to dần + nhấp nháy,
// xu/sao ở nguyên vị trí cuối, trạng thái cuối giữ nguyên tới hết vòng.
{
  const { riv, ab, root } = newFile('login');
  // Ngọn lửa (vẽ TRƯỚC = trên cùng — lưỡi lửa nằm trước nắp đang bay lên).
  // Gốc ở đáy lửa (200,58), ngọn vươn lên trên; scale quanh gốc để lửa cháy to dần.
  const flameOut = poly(riv, root, { name: 'FlameOut', cx: 200, cy: 58, points: [[200, 22], [209, 38], [212, 50], [208, 58], [192, 58], [188, 50], [191, 38]], color: FLAME });
  const flameIn = poly(riv, root, { name: 'FlameIn', cx: 200, cy: 60, points: [[200, 38], [206, 48], [208, 55], [206, 60], [194, 60], [192, 55], [194, 48]], color: YELLOW });
  // Xu (mỗi đồng = ngoài vàng đậm + trong vàng nhạt) — vẽ TRƯỚC = trên cùng.
  const coins = [];
  const coinTargets = [[88, 78, 0.7], [130, 52, -0.5], [270, 52, 0.9], [312, 78, -0.8], [105, 150, 0.6], [295, 150, -0.6]];
  for (const [tx, ty] of coinTargets) {
    const outer = ell(riv, root, { name: 'Coin', x: 200, y: 108, w: 20, color: YELLOW, stroke: INK, strokeW: 2.5 });
    const inner = ell(riv, root, { name: 'CoinIn', x: 200, y: 108, w: 12, color: PALE });
    coins.push({ outer, inner, tx, ty });
  }
  const sp1 = sparkle(riv, root, 70, 48, 7);
  const sp2 = sparkle(riv, root, 330, 48, 8);
  const sp3 = sparkle(riv, root, 330, 140, 6);
  // Nắp + nơ (bay lên cùng nhau). Nơ ở giữa nắp (tâm hộp x=200) — đừng lấy
  // tọa độ gacha (tâm x=100, khổ 200×200).
  const bowL = ell(riv, root, { name: 'BowL', x: 186, y: 88, w: 18, h: 12, color: RED, stroke: INK, strokeW: 2.5 });
  const bowR = ell(riv, root, { name: 'BowR', x: 214, y: 88, w: 18, h: 12, color: RED, stroke: INK, strokeW: 2.5 });
  const knot = ell(riv, root, { name: 'Knot', x: 200, y: 90, w: 11, color: RED, stroke: INK, strokeW: 2.5 });
  const lidRibbon = rect(riv, root, { name: 'LidRibbon', x: 200, y: 104, w: 12, h: 26, color: RED });
  const lid = rect(riv, root, { name: 'Lid', x: 200, y: 104, w: 126, h: 26, r: 6, color: YELLOW, stroke: INK, strokeW: 3 });
  // Miệng hộp tối (hiện ra khi nắp bay — nằm DƯỚI nắp vì add sau nắp).
  const mouth = ell(riv, root, { name: 'Mouth', x: 200, y: 108, w: 64, h: 14, color: INK });
  const baseRibbon = rect(riv, root, { name: 'BaseRibbon', x: 200, y: 142, w: 14, h: 58, color: RED });
  const base = rect(riv, root, { name: 'Base', x: 200, y: 142, w: 112, h: 58, r: 8, color: YELLOW, stroke: INK, strokeW: 3 });
  const shadow = ell(riv, root, { name: 'Shadow', x: 200, y: 176, w: 80, h: 12, color: SHADOW });
  const halo = ell(riv, root, { name: 'Halo', x: 200, y: 110, w: 300, h: 170, color: TEAL_LT });
  bg(riv, root, TEAL);
  const an = riv.addLinearAnimation(ab, { name: 'loop', duration: 240, fps: 60, loop: 'loop' });

  // Lửa cháy to dần + nhấp nháy (opacity luôn = 1, không fade).
  const flameOutS = [[0, 0.45], [15, 0.52], [30, 0.48], [45, 0.65], [60, 0.8], [75, 0.74], [90, 0.88], [105, 0.82], [120, 1.02], [135, 0.95], [150, 1.08], [165, 1.02], [180, 1.13], [195, 1.08], [210, 1.15], [225, 1.11], [240, 1.15]];
  const flameInS = [[0, 0.4], [15, 0.48], [30, 0.42], [45, 0.6], [60, 0.75], [75, 0.68], [90, 0.82], [105, 0.76], [120, 0.96], [135, 0.9], [150, 1.04], [165, 0.97], [180, 1.1], [195, 1.05], [210, 1.12], [225, 1.08], [240, 1.1]];
  for (const [p, frames] of [[flameOut, flameOutS], [flameIn, flameInS]]) {
    keys(riv, an, p.id, SX, frames);
    keys(riv, an, p.id, SY, frames);
  }
  // Xu bung ra từ miệng hộp (f30–70, vòng cung), rồi đứng yên tới hết vòng.
  for (const c of coins) {
    const rot = coinTargets.find(([tx]) => tx === c.tx)[2];
    const mx = (200 + c.tx) / 2, my = c.ty - 25;
    for (const p of [c.outer, c.inner]) {
      keys(riv, an, p.id, X, [[0, 200], [30, 200], [50, mx], [70, c.tx], [240, c.tx]]);
      keys(riv, an, p.id, Y, [[0, 108], [30, 108], [50, my], [70, c.ty], [80, c.ty + 5], [240, c.ty + 5]]);
      keys(riv, an, p.id, ROT, [[0, 0], [70, rot], [240, rot]]);
      keys(riv, an, p.id, OPACITY, [[0, 0], [30, 0], [38, 1], [240, 1]], 'linear');
    }
  }
  // Sao lấp lánh nhấp theo đợt.
  for (const [sp, f0] of [[sp1, 25], [sp2, 95], [sp3, 165]]) {
    keys(riv, an, sp.id, OPACITY, [[0, 0], [f0, 0], [f0 + 10, 1], [f0 + 30, 0], [240, 0]], 'linear');
    keys(riv, an, sp.id, SX, [[0, 0.5], [f0 + 10, 1.2], [f0 + 30, 0.5], [240, 0.5]]);
    keys(riv, an, sp.id, SY, [[0, 0.5], [f0 + 10, 1.2], [f0 + 30, 0.5], [240, 0.5]]);
  }
  // Hộp đóng nảy nhẹ f0–30, rung mạnh f25–33 rồi nắp bay lên f30–60, lơ lửng tới hết vòng.
  const lidParts = [bowL, bowR, knot, lidRibbon, lid];
  moveGroup(riv, an, lidParts, null, [[0, 100], [15, 97], [30, 100], [45, 76], [60, 58], [120, 56], [180, 60], [240, 58]]);
  rotGroup(riv, an, lidParts, [[0, 0], [30, 0], [45, -0.07], [60, -0.12], [120, -0.1], [180, -0.14], [240, -0.12]]);
  const baseParts = [baseRibbon, base];
  moveGroup(riv, an, baseParts, null, [[0, 100], [30, 100], [60, 98], [120, 100], [180, 98], [240, 100]]);
  rotGroup(riv, an, baseParts, [[0, 0], [25, 0], [27, -0.05], [29, 0.05], [31, -0.03], [33, 0], [240, 0]]);
  // Miệng hộp tối hiện ra khi nắp bay, giữ nguyên tới hết vòng.
  keys(riv, an, mouth.id, OPACITY, [[0, 0], [35, 0], [50, 1], [240, 1]], 'linear');
  // Bóng hộp nảy theo nhịp hộp.
  keys(riv, an, shadow.id, SX, [[0, 1], [30, 1], [60, 0.92], [120, 1], [180, 0.92], [240, 1]]);
  save('login', riv);
}
console.log('done');
