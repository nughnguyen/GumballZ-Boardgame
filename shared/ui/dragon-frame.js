/* 🐉 Rồng CodePen (patch -158): port thuần Canvas 2D từ sketch "Dragon Animation"
   của grantjenkins (https://codepen.io/grantjenkins/pen/poeqNve) — KHÔNG dùng thư viện gốc, KHÔNG CDN.
   Giữ nguyên mọi thành phần của bản gốc: Dragon 28 đốt thân + mảng node radii, 2 cánh (màng + tay cánh
   + 4 gai a/b/c/d + gai nhọn), chân trước + chân sau (bản trước/bản sau), đầu chi tiết (sừng, mắt,
   miệng, mũi, đường vân, hốc), gai lưng, bụng đen, vảy, đuôi tam giác, 3 theme màu đỏ/xanh lá/đen.
   Scene (trời/đất/đồi/mây) ở cuối file — dùng cho banner "Rồng Bay" (banner-render.js).
   Rồng khung avatar (dragonSVG) giờ vẽ bằng canvas thay cho SVG cũ (-147): cùng chữ ký gọi,
   cùng chu kỳ 12s hiện ~3s, phase lệch cho khung nhiều rồng; reduced-motion = 1 khung tĩnh;
   chỉ vẽ khi trong màn hình (IntersectionObserver). -184: khung avatar dùng RỒNG ĐÔNG
   (EastDragon, thân uốn theo vòng làm khung, đuổi ngọc trai); cả 2 mode cũ đều bay viền
   tròn (edge), quỹ đạo số 8 qua mặt avatar đã bỏ; rồng tây (CpDragon) chỉ còn cho banner.
   Màu: themeForColors(c1, c2) suy các sắc đậm/nhạt từ 2 màu của từng khung để giữ bản sắc khung.
   Lưu ý so với bản gốc: miệng rồng (bezier) bản gốc gọi khi đang noStroke() nên không hiện —
   bản port vẽ miệng bằng nét đen như tác giả định vẽ; còn lại giữ nguyên cả các "quirk" số học
   (a -= 90 radian ở gai lưng, diff xoay chân) để hình ra giống hệt.
   VẬT LÝ BAY (bổ sung, không đổi hình dáng): quỹ đạo warp theo vận tốc đứng (lao xuống nhanh,
   vọ lên chậm, ease ở điểm cua), nghiêng bank theo độ cong + chúc/ngẩng theo vy (tối đa ~35°),
   cánh vỗ mạnh/nhanh khi bay lên và xoè lướt khi lao xuống, thân có sóng lan đầu→đuôi, nhịp nâng
   đồng bộ nhịp vỗ. Hàm thuần export flightProfile(u, mode) / waveOffset(i, t) để test node. */

const TAU = Math.PI * 2;
const css = (c, a = 1) => a >= 1 ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const sh = (hex, k) => { // k > 0 sáng hơn, k < 0 tối hơn
  const n = parseInt(String(hex).replace('#', ''), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v * (1 + k))));
  return [f(n >> 16), f((n >> 8) & 255), f(n & 255)];
};
const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
/* nhiễu giá trị 1D (mây) — xác định, không phụ thuộc Math.random */
function vnoise(x) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  const h = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  return h(i) * (1 - u) + h(i + 1) * u;
}
/* đạo hàm bezier bậc 3 tại t (dùng cho gai lưng) */
function bezTan(p0, p1, p2, p3, t) { const u = 1 - t; return 3 * u * u * (p1 - p0) + 6 * u * t * (p2 - p1) + 3 * t * t * (p3 - p2); }

/* 28 đốt thân (bản gốc: segments.length = 28, nodes.length = 28) */
export const DRAGON_NODES = [10, 14, 12, 18, 23, 28, 37, 42, 50, 50, 46, 42, 35, 28, 22, 18, 15, 14, 11, 9, 8, 7, 5, 3, 2, 1, 1, 1];
export const DRAGON_THEMES = {
  red: { spikes: [71, 14, 7], black: [56, 55, 46], body: [128, 14, 14], wingArm: [107, 8, 8], wingArmSpike: [76, 77, 76], wingUpper: [122, 32, 16], wingLower: [148, 46, 33], wingSpines: [71, 70, 71], legsBehind: [110, 13, 13] },
  green: { spikes: [18, 46, 4], black: [120, 110, 20], body: [33, 82, 16], wingArm: [39, 77, 10], wingArmSpike: [76, 77, 76], wingUpper: [44, 82, 15], wingLower: [49, 110, 25], wingSpines: [71, 70, 71], legsBehind: [30, 77, 14] },
  black: { spikes: [55, 56, 55], black: [99, 96, 67], body: [31, 29, 31], wingArm: [60, 71, 51], wingArmSpike: [76, 77, 76], wingUpper: [22, 23, 21], wingLower: [38, 46, 35], wingSpines: [64, 64, 64], legsBehind: [3, 3, 3] },
};
/* bảng màu đầy đủ suy từ 2 màu của khung: body = c1, các sắc khác đậm/nhạt theo c1/c2 */
export function themeForColors(c1, c2) {
  return {
    spikes: sh(c2, -0.35), black: sh(c2, -0.55), body: sh(c1, 0),
    wingArm: sh(c1, -0.25), wingArmSpike: [76, 77, 76],
    wingUpper: sh(c1, 0.15), wingLower: sh(c1, 0.35),
    wingSpines: sh(c2, 0), legsBehind: sh(c1, -0.2),
  };
}
/* wingSpines bản gốc có alpha 150/255 — vẽ bằng rgba riêng */
const spineCss = c => `rgba(${c[0]},${c[1]},${c[2]},0.59)`;

/* ================= VẬT LÝ BAY (hàm thuần, test được bằng node) =================
   Quy ước: vy là vận tốc đứng VẬT LÝ, dương = bay LÊN, âm = LAO XUỐNG (ngược chiều y màn
   hình, y màn hình tăng xuống dưới). vy chuẩn hoá về [-1, 1] (chia cho 76, biên độ y lớn
   nhất của quỹ đạo số 8). flap: 0.05 = xoè lướt, 1 = vỗ mạnh/nhanh.
   Warp quỹ đạo: u thời gian đều → u_warp, đạo hàm du_warp/du = tốc độ tức thời w:
   - số 8: u_w = u - 0.225·sin(2u) → w = 1 - 0.45·cos(2u) (0.55 lúc vọ lên, 1.45 lúc lao xuống)
   - tròn: u_w = u + 0.402·sin(u) → w = 1 + 0.402·cos(u) (0.60 lúc vọ lên, 1.40 lúc lao xuống)
   w > 0 luôn nên warp đơn điệu, không giật, ease tự nhiên ở điểm cua (w nhỏ khi đổi hướng).
   bank: nghiêng theo độ cong κ (dấu = dấu của x'·y'' - y'·x'', tức chiều cua) qua tanh để
   bão hoà mềm ở 35° (0.61 rad), cộng thêm pitch nhỏ -vy·0.12 (lao xuống chúc thêm, vọ lên
   ngẩng thêm); tổng bank kẹp trong [-0.61, 0.61]. flap = 0.5 + 0.45·vy. */
export function flightProfile(u, mode) {
  const m = mode === 'edge' ? 'edge' : 'orbit';
  const uW = m === 'edge' ? u + 0.402 * Math.sin(u) : u - 0.225 * Math.sin(2 * u);
  const w = m === 'edge' ? 1 + 0.402 * Math.cos(u) : 1 - 0.45 * Math.cos(2 * u);
  let x, y, xp, yp, xpp, ypp, angle;
  if (m === 'edge') {
    x = 68 * Math.cos(uW); y = 68 * Math.sin(uW);
    xp = -68 * Math.sin(uW); yp = 68 * Math.cos(uW);
    xpp = -68 * Math.cos(uW); ypp = -68 * Math.sin(uW);
    angle = uW + Math.PI / 2;
  } else {
    x = 68 * Math.sin(uW); y = -76 * Math.sin(uW) * Math.cos(uW);
    xp = 68 * Math.cos(uW); yp = -76 * Math.cos(2 * uW);
    xpp = -68 * Math.sin(uW); ypp = 152 * Math.sin(2 * uW);
    angle = Math.atan2(yp, xp);
  }
  const vy = Math.max(-1, Math.min(1, -(yp * w) / 76)); // lên +, xuống −
  const cross = xp * ypp - yp * xpp; // >0 cua một chiều, <0 cua chiều ngược
  const kappa = Math.abs(cross) / Math.pow(xp * xp + yp * yp, 1.5);
  const bankRoll = (cross >= 0 ? 1 : -1) * 0.61 * Math.tanh(kappa / 0.03);
  const bank = Math.max(-0.61, Math.min(0.61, bankRoll - vy * 0.12));
  const flap = Math.max(0.05, Math.min(1, 0.5 + 0.45 * vy));
  return { x, y, angle, bank, vy, flap };
}
/* Sóng thân: đốt i lệch pha i·lag so với đầu, biên độ tăng dần về đuôi (đầu 1.5px → đuôi 6px).
   t tính bằng giây; trả về độ lệch dọc (px) tại thời điểm t. Dùng cho CpDragon.update qua
   wingPhase/4 (pha cánh, 4 rad/s) để sóng đồng bộ nhịp vỗ. */
export function waveOffset(i, t) {
  const k = Math.max(0, Math.min(27, i | 0));
  const amp = 1.5 + (k / 27) * 4.5;
  return amp * Math.sin(t * 4 - k * 0.35);
}

/* ================= RỒNG (port class Dragon của CodePen) =================
   Không gian vẽ riêng của rồng: đầu ở (0,0) sau phép tịnh tiến của draw(), thân trải về +x
   (đuôi ở ~+280), cánh/chân thõng xuống +y. Bên ngoài đặt đầu lên quỹ đạo rồi xoay
   (tiếp tuyến + 180°) để thân kéo phía sau. */
export class CpDragon {
  constructor(theme) {
    this.x = 200; this.y = 200; this.w = 150; this.h = 100;
    this.vx = 0; this.vy = 0;
    this.segments = [];
    this.timer = 0; this.speed = 4; this.lift = 3;
    this.wingPhase = 0; this.vySmooth = 0; this.flap = 0.5; // pha vỗ tích luỹ (rad), vy làm mượt, mức vỗ hiện tại
    this.showLegs = true;
    this.wing = {
      x1: 0, y1: 0, x2: 0, y2: 0, x3: 0, y3: 0, x4: 0, y4: 0,
      spines: { a: { x1: 0, y1: 0, x2: 0, y2: 0 }, b: { x1: 0, y1: 0, x2: 0, y2: 0 }, c: { x1: 0, y1: 0, x2: 0, y2: 0 }, d: { x1: 0, y1: 0, x2: 0, y2: 0 } },
    };
    this.m = 0; this.m2 = 0; this.diff = 0; this.headBob = 0; // đầu chìm/nổi so với y=200 (bản gốc: seg0.y dao động 200..283)
    this.colors = theme || DRAGON_THEMES.red;
    for (let i = 0; i <= 27; i++) this.segments.push({ x: this.x + this.w * i / 27, y: this.y });
  }

  /* vy: vận tốc đứng chuẩn hoá [-1, 1], dương = bay lên, âm = lao xuống (mặc định 0 = bay ngang).
     Cánh gắn với vy: bay lên → vỗ nhanh + mạnh (tần số/biên độ tăng), lao xuống → vỗ chậm + xoè
     lướt (biên độ nhỏ dần về ~0.75, cánh xoè ngang). Pha vỗ tích luỹ theo tốc độ hiệu dụng nên
     đổi tốc không làm giật pha. Thân: đốt đầu đẩy lên khi cánh vỗ xuống (ngược pha m, tỉ lệ theo
     mức vỗ), các đốt sau nối bằng lerp có pha sóng + sóng lan đầu→đuôi (đuôi trễ, biên độ lớn). */
  update(dt, vy = 0) {
    this.diff = this.segments[0].y - this.segments[1].y;
    const vyN = Math.max(-1, Math.min(1, +vy || 0));
    this.vySmooth += (vyN - this.vySmooth) * Math.min(1, dt * 6); // vy đổi dấu không giật cánh
    const v = this.vySmooth;
    const climb = (v + 1) / 2; // 0 = lao xuống, 1 = vọ lên
    const flap = Math.max(0.05, Math.min(1, 0.5 + 0.45 * v));
    this.flap = flap;
    const speedEff = 4 * (0.55 + 0.9 * climb); // 2.2 lúc lướt → 5.8 lúc vỗ mạnh
    const liftEff = 3 * (0.25 + 1.1 * climb); // 0.75 cánh xoè lướt → 4.05 vỗ mạnh
    this.speed = speedEff; this.lift = liftEff;
    this.timer += dt * 1.08; // 0.018/khung × 60 khung/giây
    this.wingPhase += dt * 1.08 * speedEff; // pha vỗ tích luỹ, ~2.4 rad/s lướt → ~6.3 rad/s vỗ mạnh
    this.m = Math.sin(this.wingPhase) * this.lift;
    this.m2 = Math.cos(this.wingPhase) * this.lift;
    for (let i = 0; i < this.segments.length; i++) {
      const s = this.segments[i];
      if (i === 0) { s.y += this.m * (1 - 1.4 * flap); s.x = this.x; } // vỗ xuống → thân đẩy lên (flap càng mạnh càng rõ)
      else {
        // lerp có pha sóng: 0.10..0.28 theo pha cánh trừ dần theo đốt, đuôi (i lớn) lerp nhỏ hơn = trễ quán tính
        const k = Math.max(0.10, Math.min(0.28, 0.20 + 0.05 * Math.sin(this.wingPhase - i * 0.35))) * (1 - 0.35 * (i / 27));
        s.y += (this.segments[i - 1].y - s.y) * k + waveOffset(i, this.wingPhase / 4) * dt * 5;
        s.x += (this.segments[i - 1].x - s.x) * k + waveOffset(i, this.wingPhase / 4 + Math.PI / 2) * dt * 2;
      }
    }
    this.headBob = this.segments[0].y - 200;
    const w = this.wing, s7 = this.segments[7];
    w.x1 = s7.x; w.y1 = s7.y + 10;
    w.x2 = s7.x + 20; w.y2 = s7.y + 10 + this.m * 15;
    w.x3 = s7.x - 20; w.y3 = s7.y + 10 + this.m * 30;
    w.x4 = s7.x - 27; w.y4 = s7.y + 10 + this.m * 35;
    w.spines.a.x1 = w.x1; w.spines.a.y1 = s7.y + 40 + this.m * 47 - this.m2 * 6;
    w.spines.a.x2 = s7.x + 90; w.spines.a.y2 = s7.y + 40 + this.m * 55 - this.m2 * 6;
    w.spines.b.x1 = w.x1 + 20; w.spines.b.y1 = s7.y + 40 + this.m * 42;
    w.spines.b.x2 = s7.x + 95; w.spines.b.y2 = s7.y + 40 + this.m * 45;
    w.spines.c.x1 = w.x1 + 25; w.spines.c.y1 = s7.y + 40 + this.m * 35;
    w.spines.c.x2 = s7.x + 100; w.spines.c.y2 = s7.y + 40 + this.m * 32;
    w.spines.d.x1 = w.x1 + 35; w.spines.d.y1 = s7.y + 40 + this.m * 17;
    w.spines.d.x2 = s7.x + 80; w.spines.d.y2 = s7.y + 30 + this.m * 15;
    this.x -= this.speed * 60 * dt;
  }

  drawFrontLeg(g, back) {
    const s = this.segments[8];
    g.save();
    g.translate(s.x, s.y); g.translate(-225, -340);
    if (back) { g.translate(-10, 0); g.fillStyle = css(this.colors.legsBehind); }
    else g.fillStyle = css(this.colors.body);
    g.translate(224 + 11, 355); g.rotate(this.diff * Math.PI / 180); g.translate(-224 - 11, -355);
    g.beginPath();
    g.moveTo(224, 355);
    g.bezierCurveTo(226, 355, 230, 357, 233, 363);
    g.bezierCurveTo(238, 368, 239, 374, 235, 380);
    g.bezierCurveTo(229, 388, 222, 393, 220, 398);
    g.bezierCurveTo(221, 402, 223, 404, 228, 408);
    g.bezierCurveTo(223, 409, 218, 410, 213, 404);
    g.bezierCurveTo(212, 398, 216, 389, 221, 376);
    g.bezierCurveTo(209, 364, 204, 355 + this.diff * 0.5, 202, 355 + this.diff * 0.5);
    g.closePath(); g.fill();
    g.restore();
  }

  drawBackLeg(g, back) {
    const s = this.segments[11];
    g.save();
    g.translate(s.x, s.y); g.translate(-278, -342);
    if (back) { g.translate(-10, 0); g.fillStyle = css(this.colors.legsBehind); }
    else g.fillStyle = css(this.colors.body);
    g.translate(286 + 17, 354); g.rotate(this.diff * Math.PI / 180); g.translate(-286 - 17, -354);
    g.beginPath();
    g.moveTo(286, 352);
    g.bezierCurveTo(289, 356, 291, 365, 290, 376);
    g.bezierCurveTo(296, 380, 300, 382, 307, 386);
    g.bezierCurveTo(308, 394, 308, 409, 308, 416);
    g.bezierCurveTo(309, 418, 312, 419, 316, 416);
    g.bezierCurveTo(315, 421, 310, 425, 302, 423);
    g.bezierCurveTo(300, 412, 300, 404, 299, 400);
    g.bezierCurveTo(294, 395, 286, 394, 276, 391);
    g.bezierCurveTo(268, 383, 261, 371, 252, 357);
    g.closePath(); g.fill();
    g.restore();
  }

  /* màng cánh + tay cánh + gai nhọn + 4 gai a/b/c/d — dùng chung cho 2 cánh, khác nhau ở
     mặt cánh hiện (trên/dưới) và đường nối cánh–thân ở cánh trái */
  _wingMembrane(g, upper) {
    const w = this.wing, S = this.segments, N = DRAGON_NODES;
    g.fillStyle = css(upper ? this.colors.wingUpper : this.colors.wingLower);
    g.beginPath();
    g.moveTo(w.x1, w.y1);
    g.bezierCurveTo(w.x2 - 10, w.y2, w.x2 - 10, w.y2, w.x3, w.y3);
    g.bezierCurveTo(w.x3 - 5, w.y3 - this.m2 * 3, w.spines.a.x1 - 5, w.spines.a.y1 + this.diff * 0.5 - this.m2 * 3, w.spines.a.x1, w.spines.a.y1 - this.m2 * 3);
    g.bezierCurveTo(w.spines.a.x1 + 10, w.spines.a.y1 - this.diff * 0.5, w.spines.a.x2 - 10, w.spines.a.y2 + this.diff * 0.5, w.spines.a.x2, w.spines.a.y2);
    g.lineTo(w.spines.a.x2, w.spines.a.y2);
    g.bezierCurveTo(w.spines.a.x2 - 10, w.spines.a.y2, w.spines.b.x2 - 15, w.spines.b.y2 - this.diff * 0.5, w.spines.b.x2, w.spines.b.y2);
    g.bezierCurveTo(w.spines.b.x2 - 10, w.spines.b.y2, w.spines.c.x2 - 15, w.spines.c.y2, w.spines.c.x2, w.spines.c.y2);
    g.bezierCurveTo(w.spines.c.x2 - 10, w.spines.c.y2, w.spines.d.x2 - 15, w.spines.d.y2, w.spines.d.x2, w.spines.d.y2);
    g.bezierCurveTo(w.spines.d.x2 - 10, w.spines.d.y2, w.x1 + 40 - 15, S[9].y + N[9] * 0.2, w.x1 + 40, S[9].y + N[9] * 0.2);
    g.closePath(); g.fill();
  }
  _wingArm(g) {
    const w = this.wing;
    g.strokeStyle = css(this.colors.wingArm); g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(w.x1, w.y1); g.lineTo(w.x2, w.y2);
    g.moveTo(w.x2, w.y2); g.lineTo(w.x3, w.y3);
    g.stroke();
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(w.x3, w.y3);
    g.bezierCurveTo(w.x3 - 3, w.y3 + ((w.y4 - w.y3) * 0.3), w.x4 - 2, w.y4 - ((w.y4 - w.y3) * 0.5), w.x4, w.y4);
    g.stroke();
    g.fillStyle = css(this.colors.wingArmSpike);
    g.beginPath();
    g.moveTo(w.x4 - 2, w.y4); g.lineTo(w.x4 + 2, w.y4); g.lineTo(w.x4, w.y4 + (w.y4 - w.y3));
    g.closePath(); g.fill();
    g.strokeStyle = spineCss(this.colors.wingSpines); g.lineWidth = 1;
    g.beginPath();
    g.moveTo(w.x3, w.y3);
    g.bezierCurveTo(w.x3 - 5, w.y3, w.spines.a.x1 - 5, w.spines.a.y1 + this.diff * 0.5 - this.m2 * 3, w.spines.a.x1, w.spines.a.y1 - this.m2 * 3);
    g.moveTo(w.spines.a.x1, w.spines.a.y1 - this.m2 * 3);
    g.bezierCurveTo(w.spines.a.x1 + 10, w.spines.a.y1 - this.diff, w.spines.a.x2 - 10, w.spines.a.y2 + this.diff * 0.5, w.spines.a.x2, w.spines.a.y2);
    g.moveTo(w.x3, w.y3); g.lineTo(w.spines.b.x1, w.spines.b.y1);
    g.moveTo(w.spines.b.x1, w.spines.b.y1); g.lineTo(w.spines.b.x2, w.spines.b.y2);
    g.moveTo(w.x3, w.y3); g.lineTo(w.spines.c.x1, w.spines.c.y1);
    g.moveTo(w.spines.c.x1, w.spines.c.y1); g.lineTo(w.spines.c.x2, w.spines.c.y2);
    g.moveTo(w.x2, w.y2); g.lineTo(w.spines.d.x2, w.spines.d.y2);
    g.stroke();
  }
  drawRightWing(g) {
    this._wingMembrane(g, this.wing.y2 < this.wing.y1);
    this._wingArm(g);
  }
  drawLeftWing(g) {
    const w = this.wing, S = this.segments, N = DRAGON_NODES;
    if (w.y2 >= w.y1) {
      g.strokeStyle = 'rgba(40,40,40,0.2)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(w.x1, w.y1); g.lineTo(w.x1 + 40, S[9].y + N[9] * 0.2); g.stroke();
      this._wingMembrane(g, true);
    } else this._wingMembrane(g, false);
    this._wingArm(g);
  }

  drawHead(g) {
    const s0 = this.segments[0];
    g.save();
    g.translate(s0.x, s0.y); g.rotate(-this.m * 8 * Math.PI / 180); g.translate(-65, -125); g.scale(0.6, 0.6);
    g.fillStyle = css(this.colors.body);
    g.beginPath();
    g.moveTo(135, 200);
    g.bezierCurveTo(141, 197, 149, 194, 156, 190);
    g.bezierCurveTo(153, 196, 153, 204, 156, 208);
    g.bezierCurveTo(150, 214, 148, 218, 150, 226);
    g.bezierCurveTo(144, 227, 141, 235, 144, 243);
    g.bezierCurveTo(142, 244, 136, 246, 135, 252);
    g.lineTo(130, 245);
    g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(72, 235); g.lineTo(73, 232);
    g.bezierCurveTo(76, 228, 80, 224, 84, 222);
    g.bezierCurveTo(90, 220, 94, 218, 98, 215);
    g.bezierCurveTo(105, 209, 114, 203, 122, 200);
    g.bezierCurveTo(130, 199, 136, 200, 138, 203);
    g.bezierCurveTo(138, 206, 140, 209, 140, 211);
    g.bezierCurveTo(137, 214, 136, 216, 138, 219);
    g.bezierCurveTo(137, 221, 137, 223, 138, 225);
    g.bezierCurveTo(136, 226, 134, 228, 136, 232);
    g.bezierCurveTo(137, 234, 136, 236, 134, 237);
    g.lineTo(136, 240);
    g.bezierCurveTo(132, 244, 125, 245, 113, 243);
    g.bezierCurveTo(106, 240, 98, 241, 88, 243);
    g.bezierCurveTo(80, 244, 74, 238, 72, 235);
    g.closePath(); g.fill();
    /* sừng */
    g.fillStyle = css(this.colors.black);
    g.beginPath();
    g.moveTo(138, 204);
    g.bezierCurveTo(157, 196, 176, 182, 184, 174);
    g.bezierCurveTo(172, 194, 155, 205, 138, 211);
    g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(137, 221);
    g.bezierCurveTo(145, 221, 154, 218, 159, 215);
    g.bezierCurveTo(153, 222, 145, 225, 138, 226);
    g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(135, 232);
    g.bezierCurveTo(138, 234, 142, 234, 149, 236);
    g.lineTo(145, 238); g.lineTo(140, 238); g.lineTo(134, 237);
    g.closePath(); g.fill();
    /* miệng — bản gốc gọi bezier() lúc đang noStroke() nên không hiện; port vẽ nét đen như ý đồ gốc */
    g.strokeStyle = css(this.colors.black); g.lineWidth = 1.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(73, 236); g.bezierCurveTo(85, 236, 97, 229, 106, 228); g.stroke();
    /* mắt */
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(104, 217); g.lineTo(107, 214); g.lineTo(118, 209);
    g.bezierCurveTo(116, 214, 111, 217, 104, 217);
    g.closePath(); g.fill();
    g.fillStyle = css(this.colors.black);
    g.beginPath(); g.ellipse(111, 214, 1.5, 1.5, 0, 0, TAU); g.fill();
    /* mũi */
    g.beginPath();
    g.moveTo(77, 232);
    g.bezierCurveTo(78, 230, 79, 228, 81, 228);
    g.bezierCurveTo(81, 230, 79, 232, 76, 232);
    g.closePath(); g.fill();
    /* đường vân trên đầu */
    g.strokeStyle = css(this.colors.black); g.lineWidth = 1;
    g.beginPath();
    g.moveTo(86, 223); g.lineTo(89, 226);
    g.moveTo(92, 220); g.lineTo(94, 222);
    g.moveTo(98, 217); g.lineTo(100, 220);
    g.stroke();
    /* hốc */
    g.strokeStyle = css(this.colors.black, 50 / 255);
    g.beginPath();
    g.moveTo(123, 205); g.bezierCurveTo(128, 204, 134, 203, 138, 203);
    g.moveTo(128, 214); g.bezierCurveTo(132, 213, 136, 213, 139, 213);
    g.moveTo(130, 219); g.bezierCurveTo(132, 218, 136, 220, 138, 220);
    g.moveTo(130, 225); g.bezierCurveTo(132, 226, 134, 226, 137, 226);
    g.moveTo(126, 228); g.bezierCurveTo(129, 229, 132, 230, 134, 232);
    g.moveTo(124, 232); g.bezierCurveTo(128, 234, 130, 235, 134, 236);
    g.stroke();
    g.restore();
  }

  draw(g) {
    const S = this.segments, N = DRAGON_NODES;
    g.save();
    g.translate(-S[0].x, -S[0].y); // đầu về gốc (0,0), thân trải về +x
    g.save(); g.translate(-20, 10); this.drawRightWing(g); g.restore();
    if (this.showLegs) { this.drawBackLeg(g, true); this.drawFrontLeg(g, true); }
    /* gai lưng */
    g.fillStyle = css(this.colors.spikes);
    for (let i = 2; i < S.length - 5; i++) {
      const s = S[i];
      const tx = bezTan(s.x, s.x, S[i + 1].x, S[i + 1].x, 0.5);
      const ty = bezTan(s.y, s.y, S[i + 1].y, S[i + 1].y, 0.5);
      let a = Math.atan2(ty, tx); a -= 90; // giữ nguyên bản gốc (radian)
      g.beginPath();
      g.moveTo(S[i - 1].x, S[i - 1].y + N[i] * 0.1);
      g.lineTo(s.x, s.y + N[i] * 0.1);
      g.lineTo(s.x - 8 + Math.cos(a) * 12, s.y - N[i] * 0.4);
      g.closePath(); g.fill();
    }
    /* bụng dưới (đen) */
    g.fillStyle = css(this.colors.black);
    g.beginPath();
    g.moveTo(S[0].x, S[0].y);
    for (let i = 1; i < S.length; i += 3) g.bezierCurveTo(S[i].x, S[i].y, S[i + 1].x, S[i + 1].y, S[i + 2].x, S[i + 2].y);
    for (let i = S.length - 1; i >= 1; i -= 3) g.bezierCurveTo(S[i].x, S[i].y + N[i], S[i - 1].x, S[i - 1].y + N[i - 1], S[i - 2].x, S[i - 2].y + N[i - 2]);
    g.lineTo(S[0].x, S[0].y + N[1]);
    g.closePath(); g.fill();
    /* vảy bụng */
    g.strokeStyle = 'rgba(40,40,40,0.59)'; g.lineWidth = 0.5;
    for (let i = 1; i < S.length - 10; i++) {
      const s = S[i];
      g.beginPath(); g.moveTo(s.x, s.y);
      g.bezierCurveTo(s.x - 10, s.y + N[i] * 0.3, s.x - 10, s.y + N[i] * 0.7, s.x, s.y + N[i] * 0.95);
      g.stroke();
    }
    /* thân trên */
    g.fillStyle = css(this.colors.body);
    g.beginPath();
    g.moveTo(S[0].x, S[0].y);
    for (let i = 1; i < S.length; i += 3) g.bezierCurveTo(S[i].x, S[i].y, S[i + 1].x, S[i + 1].y, S[i + 2].x, S[i + 2].y);
    for (let i = S.length - 1; i >= 1; i -= 3) g.bezierCurveTo(S[i].x, S[i].y + N[i] * 0.6, S[i - 1].x, S[i - 1].y + N[i - 1] * 0.6, S[i - 2].x, S[i - 2].y + N[i - 2] * 0.6);
    g.closePath(); g.fill();
    if (this.showLegs) { this.drawFrontLeg(g); this.drawBackLeg(g); }
    this.drawLeftWing(g);
    /* đuôi tam giác */
    g.fillStyle = css(this.colors.body);
    g.beginPath();
    g.moveTo(S[S.length - 2].x - this.diff * 0.1, S[S.length - 2].y - 5);
    g.lineTo(S[S.length - 1].x, S[S.length - 1].y);
    g.lineTo(S[S.length - 2].x + this.diff * 0.1, S[S.length - 2].y + 5);
    g.bezierCurveTo(S[S.length - 2].x + this.diff * 0.1 + 3, S[S.length - 2].y + 2, S[S.length - 2].x - this.diff * 0.1 + 3, S[S.length - 2].y - 2, S[S.length - 2].x - this.diff * 0.1, S[S.length - 2].y - 5);
    g.closePath(); g.fill();
    this.drawHead(g);
    g.restore();
  }

  fly(g, dt) { this.draw(g); this.update(dt); }
}

/* ================= QUỸ ĐẠO BAY + MOUNT (rồng khung avatar) ================= */
/* Đường bay gốc -144 (giữ chuỗi để tương thích): số 8 qua mặt avatar / tròn quanh mép viền */
export const DRG8 = 'M 0 0 C 35 -38 68 -38 68 0 C 68 38 35 38 0 0 C -35 -38 -68 -38 -68 0 C -68 38 -35 38 0 0 Z';
export const DRGC = 'M 68 0 A 68 68 0 1 1 -68 0 A 68 68 0 1 1 68 0 Z';
export const DRG_SEG = 28; // 28 đốt thân (bản SVG cũ: 12)
/* điểm + góc tiếp tuyến trên quỹ đạo (không gian -90..90, tâm (0,0)); u = 0..2π */
export function orbitPoint(u, mode) {
  if (mode === 'edge') return { x: 68 * Math.cos(u), y: 68 * Math.sin(u), angle: u + Math.PI / 2 };
  const x = 68 * Math.sin(u), y = -76 * Math.sin(u) * Math.cos(u);
  return { x, y, angle: Math.atan2(-76 * Math.cos(2 * u), 68 * Math.cos(u)) };
}
const escA = s => String(s ?? '').replace(/["&<>]/g, c => ({ '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
/* Giữ nguyên chữ ký gọi của -147: dragonSVG(c1, c2, D, mode, phase) — giờ trả <canvas>
   thay cho <svg>; mount bằng initFrameDragons(root) sau khi vẽ HTML (như initBanners).
   -184: thêm 2 param tùy chọn cuối (frameId, elemIndex) — đưa ID khung vào data-fid để
   initFrameDragons suy nguyên tố rồng đông (khung nhiều rồng: mỗi canvas 1 con, data-ei
   chọn con trong mảng elementForFrame trả về); không truyền thì suy từ màu như cũ.
   Cả 2 mode cũ đều bay viền tròn (edge): quỹ đạo số 8 qua mặt avatar đã bỏ hẳn. */
export function dragonSVG(c1, c2, D = 3, mode = 'orbit', phase = 0, frameId = '', elemIndex = 0) {
  return `<canvas class="dov" data-c1="${escA(c1)}" data-c2="${escA(c2)}" data-d="${+D || 3}" data-mode="edge" data-phase="${+phase || 0}" data-fid="${escA(frameId)}" data-ei="${+elemIndex || 0}" width="360" height="360" aria-hidden="true"></canvas>`;
}
const FD = new Set();
let fdTick = false, fdIO = null, fdRM = false;
function fdReduced() { try { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
function fdDraw(c, prog, op) {
  const d = c._fd; if (!d) return;
  const W = c.clientWidth || 0, H = c.clientHeight || 0;
  if (!W || !H) return;
  const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
  const bw = Math.round(W * dpr), bh = Math.round(H * dpr);
  if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }
  const g = c.getContext('2d'); if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  if (op <= 0) { c.style.opacity = '0'; return; }
  c.style.opacity = String(op);
  /* -184: rồng đông CHỈ bay viền tròn (edge); phase lệch → lệch vị trí trên vòng */
  const u = (prog + (d.phase || 0)) * TAU;
  const pt = flightProfile(u, 'edge'); // quỹ đạo warp + bank theo độ cong/vy
  const { k, R } = eastRingScale(W); // thân phủ 300° vòng khung
  d.dragon.setArc(R / k); // uốn thân theo vòng (đơn vị local)
  /* ngọc trai ở giữa khoảng trống 60° trước đầu rồng (đầu đuổi ngọc) */
  const pa = Math.atan2(pt.y, pt.x) + Math.PI / 6;
  drawPearl(g, W / 2 + R * Math.cos(pa), H / 2 + R * Math.sin(pa), 9 * (W / 180));
  g.save();
  g.translate(W / 2 + pt.x * (W / 180), H / 2 + pt.y * (H / 180));
  g.rotate(pt.angle + Math.PI + pt.bank); // đầu hướng theo tiếp tuyến, thân kéo phía sau, nghiêng thêm bank
  g.scale(k, k);
  d.dragon.draw(g);
  g.restore();
}
function fdLoop(ms) {
  const nowSec = ms / 1000;
  FD.forEach(c => {
    if (!c.isConnected) { FD.delete(c); return; }
    if (!c._fdv || fdRM) return;
    const d = c._fd;
    const cyc = (nowSec + d.phase * 12) % 12; // chu kỳ 12s: hiện ~3s đầu, ẩn 9s còn lại
    let op = 0;
    if (cyc >= 0.24 && cyc <= 2.76) op = Math.min(1, (cyc - 0.24) / 0.24, (2.76 - cyc) / 0.24);
    const prog = ((nowSec + d.phase * 12) / d.D) % 1;
    const prof = flightProfile((prog + d.phase) * TAU, 'edge'); // cùng góc u với fdDraw, chỉ bay viền tròn
    if (op > 0) d.dragon.update(1 / 60, prof.vy); // sóng thân theo vận tốc đứng trên quỹ đạo warp
    fdDraw(c, prog, op);
  });
  requestAnimationFrame(fdLoop);
}
export function initFrameDragons(root) {
  if (!root || typeof document === 'undefined') return;
  fdRM = fdReduced();
  if (!fdIO && typeof IntersectionObserver !== 'undefined') {
    fdIO = new IntersectionObserver(es => es.forEach(e => { e.target._fdv = e.isIntersecting; }), { rootMargin: '100px' });
  }
  root.querySelectorAll('canvas.dov').forEach(c => {
    if (FD.has(c)) return;
    FD.add(c);
    const th = themeForColors(c.dataset.c1 || '#ff3b1a', c.dataset.c2 || '#7a0d0d');
    /* -184: rồng đông — nguyên tố theo ID khung (khung nhiều rồng: mỗi canvas 1 con,
       data-ei chọn con trong mảng elementForFrame trả về); không có ID thì suy từ màu */
    const els = elementForFrame(c.dataset.fid || '', c.dataset.c1, c.dataset.c2);
    const el = Array.isArray(els) ? els[(+c.dataset.ei || 0) % els.length] : els;
    const dr = new EastDragon(th, el);
    for (let i = 0; i < 40; i++) dr.update(1 / 60); // thân uốn sẵn, khung tĩnh đầu tiên đã đẹp
    c._fd = { dragon: dr, D: +c.dataset.d || 3, phase: +c.dataset.phase || 0 };
    if (fdIO) fdIO.observe(c); else c._fdv = true;
    if (fdRM) fdDraw(c, 0.25, 1); // reduced-motion: 1 khung tĩnh, hiện rõ
  });
  if (!fdTick && !fdRM && typeof requestAnimationFrame === 'function') { fdTick = true; requestAnimationFrame(fdLoop); }
}

/* ================= SCENE CODEPEN (banner "Rồng Bay") =================
   Port class Scene: 3 bầu trời gradient, 3 mặt đất, đồi trước/sau parallax, mây noise
   trước/sau, click đổi theme (đỏ→xanh lá→đen, đổi cả trời + đất + rồng), gợi ý "click".
   Ảnh nền pre-render 1 lần (cache module, RNG seed cố định) thay cho trang LOADING 8 ảnh
   của bản gốc — banner web không cần màn hình chờ. */
const CP = { assets: null };
function cpAssets() {
  if (CP.assets) return CP.assets;
  const R = mulberry32(158);
  const rnd = (a, b) => a + R() * (b - a);
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const rgb = (r, g, b, a = 1) => a >= 1 ? `rgb(${r | 0},${g | 0},${b | 0})` : `rgba(${r | 0},${g | 0},${b | 0},${a})`;
  const skyImage = (c1, c2) => {
    const c = mk(600, 450), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 450);
    gr.addColorStop(0, rgb(...c1)); gr.addColorStop(1, rgb(...c2));
    g.fillStyle = gr; g.fillRect(0, 0, 600, 450);
    return c;
  };
  const groundImage = (c1, c2) => {
    const c = mk(600, 150), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 150);
    gr.addColorStop(0, rgb(...c1)); gr.addColorStop(1, rgb(...c2));
    g.fillStyle = gr; g.fillRect(0, 0, 600, 150);
    for (let i = 0; i < 200; i++) {
      g.fillStyle = rgb(rnd(50, 60), rnd(15, 30), rnd(10, 20), rnd(50, 150) / 255);
      const r = rnd(2, 5);
      g.beginPath(); g.ellipse(rnd(0, 600), rnd(20, 150), r, r * 0.5, 0, 0, TAU); g.fill();
    }
    return c;
  };
  const hillFrontPath = g => {
    g.beginPath();
    g.moveTo(0, 600); g.lineTo(0, 560);
    g.bezierCurveTo(12, 546, 27, 531, 43, 528);
    g.bezierCurveTo(64, 528, 77, 542, 84, 552);
    g.bezierCurveTo(95, 540, 119, 502, 135, 500);
    g.bezierCurveTo(162, 504, 175, 529, 184, 546);
    g.bezierCurveTo(198, 537, 212, 526, 229, 526);
    g.bezierCurveTo(242, 526, 253, 538, 260, 548);
    g.bezierCurveTo(278, 530, 290, 515, 302, 512);
    g.bezierCurveTo(324, 513, 345, 532, 357, 550);
    g.bezierCurveTo(363, 541, 379, 527, 396, 525);
    g.bezierCurveTo(410, 525, 420, 540, 437, 552);
    g.bezierCurveTo(450, 526, 461, 502, 474, 498);
    g.bezierCurveTo(494, 496, 512, 521, 526, 540);
    g.bezierCurveTo(538, 531, 550, 523, 562, 524);
    g.bezierCurveTo(576, 525, 591, 549, 600, 560);
    g.lineTo(600, 600);
    g.closePath();
  };
  const hillBackPath = g => {
    g.beginPath();
    g.moveTo(0, 470);
    g.bezierCurveTo(27, 475, 43, 490, 57, 501);
    g.bezierCurveTo(89, 482, 102, 462, 126, 440);
    g.bezierCurveTo(150, 423, 180, 400, 200, 398);
    g.bezierCurveTo(228, 402, 245, 420, 262, 438);
    g.bezierCurveTo(280, 433, 286, 422, 298, 419);
    g.bezierCurveTo(322, 423, 333, 441, 352, 474);
    g.bezierCurveTo(366, 481, 384, 492, 402, 505);
    g.bezierCurveTo(436, 485, 457, 454, 477, 445);
    g.bezierCurveTo(508, 448, 524, 476, 554, 496);
    g.bezierCurveTo(570, 490, 588, 470, 600, 470);
    g.lineTo(600, 600); g.lineTo(0, 600);
    g.closePath();
  };
  const hillImage = (pathFn, y0, h, c1, c2, speck, speckN) => {
    const shape = mk(600, h), sg = shape.getContext('2d');
    sg.save(); sg.translate(0, -y0); pathFn(sg); sg.restore();
    sg.fillStyle = '#fff'; sg.fill();
    const col = mk(600, h), cg = col.getContext('2d');
    const gr = cg.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, rgb(...c1)); gr.addColorStop(1, rgb(...c2));
    cg.fillStyle = gr; cg.fillRect(0, 0, 600, h);
    for (let i = 0; i < speckN; i++) {
      cg.fillStyle = rgb(rnd(speck[0][0], speck[0][1]), rnd(speck[1][0], speck[1][1]), rnd(speck[2][0], speck[2][1]), rnd(50, 150) / 255);
      const r = rnd(2, 4);
      cg.beginPath(); cg.ellipse(rnd(0, 600), rnd(0, h), r, r * 0.5, 0, 0, TAU); cg.fill();
    }
    cg.globalCompositeOperation = 'destination-in';
    cg.drawImage(shape, 0, 0);
    return col;
  };
  const cloudSprite = () => {
    const c = mk(110, 110), g = c.getContext('2d');
    const w = rnd(80, 100), h = rnd(80, 100);
    const count = 50 + (w + h - 50) * (250 / 110);
    let tx = Math.floor(rnd(10, 1000)), ty = Math.floor(rnd(10, 1000));
    g.fillStyle = 'rgba(247,247,242,0.098)';
    for (let i = 0; i < count; i++) {
      const x = (100 - w) + vnoise(tx) * 2 * w;
      const y = (100 - h) + vnoise(ty) * 2 * h;
      tx += 1.01; ty += 1.01;
      const r = rnd(5, 15);
      g.beginPath(); g.ellipse(x - 50, y - 50, r / 2, r / 2, 0, 0, TAU); g.fill();
    }
    return c;
  };
  const clouds = [];
  for (let i = 0; i < 15; i++) clouds.push(cloudSprite());
  CP.assets = {
    skies: {
      tan: skyImage([180, 98, 42], [182, 121, 93]),
      blue: skyImage([5, 107, 130], [93, 136, 148]),
      red: skyImage([102, 54, 52], [161, 85, 82]),
    },
    grounds: {
      tan: groundImage([117, 63, 38], [92, 47, 26]),
      green: groundImage([62, 79, 43], [79, 102, 54]),
      dark: groundImage([49, 51, 46], [71, 74, 66]),
    },
    hillsFront: hillImage(hillFrontPath, 495, 105, [46, 29, 25], [81, 53, 47], [[110, 130], [70, 90], [50, 70]], 500),
    hillsBack: hillImage(hillBackPath, 395, 205, [80, 58, 45], [138, 104, 90], [[50, 60], [30, 40], [20, 40]], 1000),
    clouds,
  };
  return CP.assets;
}

/* Scene CodePen cho banner: canvas tự vẽ toàn cảnh; bấm vào canvas đổi theme.
   Vẽ cover-fit không gian 600×600 vào canvas, tâm dọc ở y≈280 (rồng + đồi + đất đều thấy). */
export function createCpScene(canvas) {
  const A = cpAssets();
  const R = mulberry32(20261122);
  const rnd = (a, b) => a + R() * (b - a);
  const sc = {
    canvas, theme: 0, showClick: true, last: 0,
    dragon: new CpDragon(DRAGON_THEMES.red),
    sky: A.skies.tan, ground: A.grounds.tan,
    grounds: [{ x: 0 }, { x: -600 }],
    hillsFront: [{ x: 0 }, { x: -599 }],
    hillsBack: [{ x: 0 }, { x: -599 }],
    cloudsFront: [], cloudsBack: [],
  };
  for (let i = 0; i < 15; i++) {
    const img = A.clouds[i]; // bản gốc dùng chung 1 ảnh mây cho cả mây trước + mây sau
    sc.cloudsFront.push({ x: rnd(0, 600), y: rnd(-30, 270), scale: rnd(0.5, 2), img, speed: rnd(3, 4) });
    sc.cloudsBack.push({ x: rnd(0, 600), y: rnd(-30, 270), scale: rnd(0.5, 2), img, speed: rnd(3, 4) });
  }
  for (let i = 0; i < 40; i++) sc.dragon.update(1 / 60); // thân uốn sẵn
  sc.setTheme = function () {
    this.theme = (this.theme + 1) % 3;
    if (this.theme === 0) { this.sky = A.skies.tan; this.ground = A.grounds.tan; this.dragon.colors = DRAGON_THEMES.red; }
    else if (this.theme === 1) { this.sky = A.skies.blue; this.ground = A.grounds.green; this.dragon.colors = DRAGON_THEMES.green; }
    else { this.sky = A.skies.red; this.ground = A.grounds.dark; this.dragon.colors = DRAGON_THEMES.black; }
    this.showClick = false;
  };
  sc.draw = function (nowSec) {
    const cv = this.canvas;
    const W = cv.clientWidth || 600, H = cv.clientHeight || 450;
    const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
    const bw = Math.round(W * dpr), bh = Math.round(H * dpr);
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
    const g = cv.getContext('2d'); if (!g) return;
    const dt = this.last ? Math.min(0.05, nowSec - this.last) : 0;
    this.last = nowSec;
    const px = v => v * 60 * dt; // px/khung (60fps) → px/giây
    for (const h of this.hillsBack) { h.x += px(4 * 1.1); if (h.x >= 600) h.x = -600; }
    for (const h of this.hillsFront) { h.x += px(4 * 1.2); if (h.x >= 600) h.x = -600; }
    for (const gr of this.grounds) { gr.x += px(4 * 1.5); if (gr.x >= 600) gr.x = -600; }
    const runClouds = arr => {
      for (const c of arr) {
        c.x += px(c.speed);
        if (c.x > 600) { c.x = -200; c.y = rnd(-30, 270); c.speed = rnd(3, 4); c.scale = rnd(0.5, 2); }
      }
    };
    runClouds(this.cloudsBack); runClouds(this.cloudsFront);
    /* Rồng bay ngang qua trời (không đứng yên): x 60..540 theo sin chậm (~25s/vòng),
       y lên/xuống theo sin khác tần số; vy vật lý (+ = lên) truyền vào update để cánh vỗ theo. */
    const fx = 300 + 240 * Math.sin(nowSec * 0.25);
    const fy = 190 + 45 * Math.sin(nowSec * 0.37 + 1.3);
    const fvx = 60 * Math.cos(nowSec * 0.25);
    const fvyScr = 45 * 0.37 * Math.cos(nowSec * 0.37 + 1.3); // y màn hình, + = đang hạ xuống
    const fvy = Math.max(-1, Math.min(1, -fvyScr / 16.65)); // chuẩn hoá, + = bay lên
    this.dragon.update(dt || 1 / 60, fvy);
    const s = Math.max(W / 600, H / 600);
    const ox = W / 2 - 300 * s, oy = H / 2 - 280 * s;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.save();
    g.translate(ox, oy); g.scale(s, s);
    g.drawImage(this.sky, 0, 0, 600, 450);
    /* mặt trời + hào quang nhẹ */
    const sun = g.createRadialGradient(470, 78, 4, 470, 78, 110);
    sun.addColorStop(0, 'rgba(255,246,200,0.95)'); sun.addColorStop(0.25, 'rgba(255,232,150,0.55)'); sun.addColorStop(1, 'rgba(255,232,150,0)');
    g.fillStyle = sun; g.beginPath(); g.arc(470, 78, 110, 0, TAU); g.fill();
    g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(470, 78, 26, 0, TAU); g.fill();
    for (const h of this.hillsBack) g.drawImage(A.hillsBack, h.x, 305, 614, 205);
    for (const h of this.hillsFront) g.drawImage(A.hillsFront, h.x, 385, 602, 105);
    for (const gr of this.grounds) g.drawImage(this.ground, gr.x, 450, 602, 150);
    /* sương mờ ở chân đồi */
    const fog = g.createLinearGradient(0, 380, 0, 470);
    fog.addColorStop(0, 'rgba(255,255,255,0)'); fog.addColorStop(1, 'rgba(255,255,255,0.20)');
    g.fillStyle = fog; g.fillRect(0, 380, 600, 90);
    /* mây sau: nhỏ + mờ (xa), mây trước: to + rõ (gần) — chiều sâu */
    g.globalAlpha = 0.55;
    for (const c of this.cloudsBack) g.drawImage(c.img, c.x, c.y, 110 * c.scale * 0.7, 110 * c.scale * 0.7 * 0.8);
    g.globalAlpha = 1;
    g.save();
    g.translate(fx, fy + this.dragon.headBob);
    if (fvx >= 0) g.scale(-1, 1); // bay sang phải: lật ngang (mặc định rồng quay đầu sang trái)
    g.rotate(-Math.atan2(fvyScr, Math.abs(fvx) + 25)); // chúc xuống khi hạ, ngẩng lên khi vọ (+25 làm mềm lúc đổi chiều)
    this.dragon.draw(g);
    g.restore();
    g.globalAlpha = 0.95;
    for (const c of this.cloudsFront) g.drawImage(c.img, c.x, c.y, 110 * c.scale * 1.15, 110 * c.scale * 1.15 * 0.8);
    g.globalAlpha = 1;
    g.restore();
  };
  return sc;
}

/* ================= RỒNG ĐÔNG (khung avatar — worker 1) =================
   Rồng đông thuần Canvas 2D, CHỈ THÊM — không đụng CpDragon / fdDraw / initFrameDragons /
   createCpScene (rồng tây giữ nguyên cho banner "Rồng Bay"; worker 2 đấu nối sau).
   Không gian local GIỐNG CpDragon.draw: đầu ở (0,0), thân trải về +x, đuôi ở ~+EAST_BODY_LEN.
   Worker 2 đặt đầu lên quỹ đạo tròn + xoay theo tiếp tuyến như rồng tây.
   Thân ~64 đốt, bán kính 36 gần đầu → 8 ở chóp đuôi (đủ dày để đọc được ở khung 54px:
   canvas lưới chọn khung ~97px, tỉ lệ vẽ ~0.17 → thân giữa ~26 đơn vị ≈ 4.5px).
   Không dùng Math.random trong code vẽ — hạt hiệu ứng gieo bằng mulberry32(seed cố định
   theo nguyên tố) nên mọi khung đều xác định, test được bằng node. */
export const EAST_BODY_LEN = 550;
export const EAST_SEGMENTS = 64;
/* 8 nguyên tố — khác nhau ở HÌNH DÁNG (sừng/bờm/vảy/đuôi/mào) + HIỆU ỨNG (hạt bay quanh thân),
   không chỉ khác màu. */
export const EAST_ELEMENTS = {
  lua: { label: 'Lửa', horn: 'antler', mane: 'flame', scale: 'ember', tail: 'flame', crest: 'flame', fx: 'ember', fxColor: [255, 150, 40], glow: [255, 80, 20] },
  bang: { label: 'Băng', horn: 'crystal', mane: 'frost', scale: 'ice', tail: 'crystal', crest: 'crystal', fx: 'frost', fxColor: [190, 235, 255], glow: [120, 200, 255] },
  set: { label: 'Sét', horn: 'bolt', mane: 'spark', scale: 'bolt', tail: 'spark', crest: 'bolt', fx: 'spark', fxColor: [255, 240, 120], glow: [255, 220, 60] },
  nuoc: { label: 'Nước', horn: 'fin', mane: 'flow', scale: 'wave', tail: 'fin', crest: 'fin', fx: 'drop', fxColor: [120, 210, 255], glow: [60, 160, 255] },
  gio: { label: 'Gió', horn: 'feather', mane: 'feather', scale: 'wind', tail: 'feather', crest: 'feather', fx: 'feather', fxColor: [225, 242, 255], glow: [180, 220, 255] },
  thienha: { label: 'Thiên Hà', horn: 'star', mane: 'stardust', scale: 'star', tail: 'comet', crest: 'star', fx: 'star', fxColor: [255, 220, 150], glow: [150, 110, 255] },
  phuong: { label: 'Phượng Long', horn: 'phoenix', mane: 'phoenix', scale: 'phoenix', tail: 'phoenix', crest: 'plume', fx: 'plume', fxColor: [255, 170, 80], glow: [255, 90, 60] },
  moc: { label: 'Mộc', horn: 'branch', mane: 'leaf', scale: 'leaf', tail: 'leaf', crest: 'leaf', fx: 'leaf', fxColor: [150, 230, 120], glow: [80, 180, 90] },
};
/* khung rồng → nguyên tố (theo ID khung trong shared/js/avatar-rewards.js; dragon: [c1, c2]).
   Khung nhiều rồng trả về MẢNG (mỗi con 1 nguyên tố, thứ tự theo thứ tự cặp màu dragon). */
const EAST_FRAME_ELEMENTS = {
  ronglua: 'lua', banglong: 'bang', banglongbay: 'bang',
  thanhlong: 'moc', thanhlongbay: 'moc', longthienha: 'thienha',
  phuonglong: 'phuong', longphung: 'phuong', xichlong: 'lua', xichlongbay: 'lua',
  songlong: ['lua', 'bang'], tamlong: ['lua', 'bang', 'set'], chusanh: ['lua', 'thienha', 'nuoc'],
};
/* Suy nguyên tố cho 1 khung: ưu tiên ID, không có trong bảng thì suy từ màu c1
   (đỏ/cam→lua, xanh dương nhạt→bang, xanh lá→moc, tím→thienha, vàng→lua, xanh dương đậm→nuoc).
   themeName chỉ làm gợi ý cuối khi màu c1 không phân loại được. KHÔNG bịa thêm khung mới. */
export function elementForFrame(id, c1, c2, themeName) {
  const key = String(id || '').trim().toLowerCase();
  if (key && Object.prototype.hasOwnProperty.call(EAST_FRAME_ELEMENTS, key)) {
    const v = EAST_FRAME_ELEMENTS[key];
    return Array.isArray(v) ? [...v] : v;
  }
  const m = /^#?([0-9a-f]{6})$/i.exec(String(c1 || '').trim());
  if (m) {
    const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (b >= 150 && b > r + 40 && g > 110) return 'bang'; // xanh dương nhạt
    if (g > r + 30 && g > b + 20) return 'moc'; // xanh lá
    if (r > 100 && b > 150 && g < 150 && b > r) return 'thienha'; // tím
    if (r > 180 && g > 150 && b < 120) return 'lua'; // vàng/vàng kim
    if (r > 150 && g < 170) return 'lua'; // đỏ/cam
    if (b > r + 30) return 'nuoc'; // xanh dương đậm
  }
  const th = String(themeName || '');
  if (/Vũ Trụ/.test(th)) return 'thienha';
  if (/Biển/.test(th)) return 'nuoc';
  return 'lua';
}
/* Viên ngọc trai sáng — đầu rồng đuổi ngọc ở khoảng trống đầu–đuôi (worker 2 đặt vị trí). */
export function drawPearl(g, x, y, r) {
  const rr = Math.max(1, +r || 8);
  const halo = g.createRadialGradient(x, y, rr * 0.2, x, y, rr * 1.8);
  halo.addColorStop(0, 'rgba(220,200,255,0.45)'); halo.addColorStop(1, 'rgba(220,200,255,0)');
  g.fillStyle = halo; g.beginPath(); g.arc(x, y, rr * 1.8, 0, TAU); g.fill();
  const pearl = g.createRadialGradient(x - rr * 0.35, y - rr * 0.4, rr * 0.1, x, y, rr);
  pearl.addColorStop(0, '#ffffff'); pearl.addColorStop(0.55, '#f4ecff');
  pearl.addColorStop(0.85, '#cbb8f5'); pearl.addColorStop(1, '#a78fe0');
  g.fillStyle = pearl; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = Math.max(1, rr * 0.08);
  g.beginPath(); g.arc(x, y, rr * 0.92, 0, TAU); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.95)';
  g.beginPath(); g.ellipse(x - rr * 0.32, y - rr * 0.38, rr * 0.22, rr * 0.13, -0.6, 0, TAU); g.fill();
}

const EAST_R = u => 8 + 28 * Math.pow(1 - u, 0.6); // bán kính đốt: 36 ở đầu → 8 ở chóp đuôi
/* Uốn 1 điểm local (x dọc thân, y lệch ngang) theo vòng tròn bán kính R (tâm vòng ở
   (0, −R), đầu rồng ở gốc — góc uốn = x/R, y+ = hướng ra ngoài vòng). R không hữu hạn/
   dương → trả điểm gốc (thân thẳng). Hàm thuần, test được bằng node. */
export function eastBendPoint(x, y, R) {
  const r = +R;
  if (!(r > 0) || !Number.isFinite(r)) return { x: +x || 0, y: +y || 0 };
  const a = x / r, s = Math.sin(a), co = Math.cos(a);
  return { x: (r + y) * s, y: -r + (r + y) * co };
}
/* Tỉ lệ vẽ rồng đông làm khung (hàm thuần, test được bằng node):
   vòng khung trên màn hình có bán kính R = 68 × (W/180) (68 = bán kính quỹ đạo edge,
   canvas .dov rộng W); chu vi C = 2πR. Thân dài EAST_BODY_LEN, uốn theo vòng, cần phủ
   300° = 5/6 chu vi → k = (5/6 × C) / EAST_BODY_LEN; 60° còn lại là khoảng trống
   đầu–đuôi (ngọc trai ở giữa). k tỉ lệ tuyến tính theo W. */
export function eastRingScale(W) {
  const w = Math.max(1, +W || 0);
  const R = 68 * w / 180;
  const C = 2 * Math.PI * R;
  const k = (5 / 6 * C) / EAST_BODY_LEN;
  return { k, R, coverDeg: 300, gapDeg: 60 };
}
const eastHash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

export class EastDragon {
  constructor(theme, element = 'lua') {
    this.colors = theme || DRAGON_THEMES.red;
    this.element = EAST_ELEMENTS[element] ? element : 'lua';
    this.cfg = EAST_ELEMENTS[this.element];
    this.t = 0; this.vySmooth = 0; this.arcR = Infinity; // arcR: bán kính uốn thân theo vòng (local); Infinity = thân thẳng
    this.segments = [];
    const R = mulberry32(eastHash(this.element)); // hạt hiệu ứng: seed cố định theo nguyên tố
    this._fx = [];
    for (let i = 0; i < 14; i++) this._fx.push({ u: 0.05 + 0.9 * R(), off: (R() * 2 - 1) * 1.15, sz: 2.5 + R() * 3.5, ph: R() * TAU, sp: 0.6 + R() * 1.4 });
    this._layout();
  }
  /* Uốn thân theo vòng tròn bán kính R (đơn vị local) để làm khung: R = Infinity
     (mặc định) = thân thẳng như cũ. Chỉ layout lại khi R đổi. */
  setArc(R) {
    const r = (+R > 0 && Number.isFinite(+R)) ? +R : Infinity;
    if (r !== this.arcR) { this.arcR = r; this._layout(); }
  }
  /* đốt thân: x đều dọc +x, y = cong S mềm + sóng lan đầu→đuôi (tái dùng waveOffset, đuôi mạnh hơn đầu) */
  _layout() {
    const n = EAST_SEGMENTS, dx = EAST_BODY_LEN / (n - 1), t = this.t;
    const bob = Math.sin(t * 2.2) * 3 - this.vySmooth * 6; // đầu nhấp nhô nhẹ, chúc xuống khi lao
    const s0 = 8 * Math.sin(1.2); // để đốt 0 về đúng y ≈ bob
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), x = i * dx;
      const sCurve = 16 * Math.sin(x / 130) + 8 * Math.sin(x / 55 + 1.2) - s0;
      const wob = waveOffset(Math.round(u * 27), t) * (0.25 + 0.75 * u);
      let px = x, py = bob * (1 - 0.85 * u) + sCurve * (0.35 + 0.65 * u) + wob;
      if (Number.isFinite(this.arcR)) { const b = eastBendPoint(px, py, this.arcR); px = b.x; py = b.y; } // uốn thân theo vòng khung
      this.segments[i] = { x: px, y: py, r: EAST_R(u) };
    }
  }
  /* dt tính bằng giây; vy chuẩn hoá [-1, 1] (+ = bay lên, − = lao xuống), mặc định 0. */
  update(dt, vy = 0) {
    const d = Math.max(0, Math.min(0.1, +dt || 0));
    this.t += d;
    const vyN = Math.max(-1, Math.min(1, +vy || 0));
    this.vySmooth += (vyN - this.vySmooth) * Math.min(1, d * 6);
    this._layout();
  }
  /* sao 4 cánh (hiệu ứng sét / thiên hà) */
  _star4(g, x, y, r) {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 4, rr = i % 2 === 0 ? r : r * 0.28;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.fill();
  }
  /* 1 túm bờm/lông đuôi: hình thon dài dọc +x, xoay ang; kind: flame | feather | leaf | ribbon */
  _tuft(g, x, y, ang, len, w, kind, fill) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.fillStyle = fill;
    g.beginPath();
    if (kind === 'leaf') {
      g.moveTo(0, 0);
      g.quadraticCurveTo(len * 0.5, -w, len, 0);
      g.quadraticCurveTo(len * 0.5, w, 0, 0);
    } else if (kind === 'feather') {
      g.moveTo(0, -w * 0.45);
      g.bezierCurveTo(len * 0.5, -w * 0.9, len * 0.9, -w * 0.5, len, 0);
      g.bezierCurveTo(len * 0.9, w * 0.5, len * 0.5, w * 0.9, 0, w * 0.45);
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(2, 0); g.lineTo(len * 0.96, 0); g.stroke();
      g.restore(); return;
    } else if (kind === 'ribbon') {
      g.moveTo(0, 0);
      g.bezierCurveTo(len * 0.35, -w, len * 0.7, w * 0.6, len, 0);
      g.bezierCurveTo(len * 0.7, w * 0.9, len * 0.35, -w * 0.5, 0, 0);
    } else { // flame: giọt lửa nhọn đầu
      g.moveTo(0, -w * 0.5);
      g.bezierCurveTo(len * 0.45, -w, len * 0.8, -w * 0.4, len, 0);
      g.bezierCurveTo(len * 0.8, w * 0.4, len * 0.45, w, 0, w * 0.5);
    }
    g.closePath(); g.fill();
    g.restore();
  }
  /* vảy tại 1 đốt — mỗi nguyên tố 1 kiểu */
  _drawScale(g, s, i) {
    const E = this.cfg, x = s.x, y = s.y - s.r * 0.1, r = s.r;
    const dark = css(this.colors.black, 0.4);
    if (E.scale === 'ember') {
      g.fillStyle = css(E.fxColor, 0.75);
      g.beginPath(); g.arc(x, y, Math.max(1.5, r * 0.26), 0, TAU); g.fill();
    } else if (E.scale === 'ice') {
      g.strokeStyle = css(E.fxColor, 0.9); g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x, y - r * 0.5); g.lineTo(x + r * 0.3, y); g.lineTo(x, y + r * 0.35); g.lineTo(x - r * 0.3, y);
      g.closePath(); g.stroke();
    } else if (E.scale === 'bolt') {
      g.strokeStyle = css(E.glow, 0.95); g.lineWidth = 2; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x - r * 0.3, y - r * 0.3); g.lineTo(x, y); g.lineTo(x - r * 0.2, y + r * 0.2); g.lineTo(x + r * 0.25, y + r * 0.35);
      g.stroke();
    } else if (E.scale === 'star') {
      g.fillStyle = css(E.fxColor, 0.9);
      this._star4(g, x, y, Math.max(2, r * 0.3));
    } else if (E.scale === 'phoenix') {
      g.strokeStyle = css(E.fxColor, 0.8); g.lineWidth = 2;
      g.beginPath(); g.moveTo(x - r * 0.45, y - r * 0.2);
      g.quadraticCurveTo(x, y + r * 0.35, x + r * 0.45, y + r * 0.15); g.stroke();
    } else if (E.scale === 'leaf') {
      g.fillStyle = css(E.glow, 0.7);
      g.beginPath(); g.ellipse(x, y, Math.max(2, r * 0.32), Math.max(1.5, r * 0.18), 0.7, 0, TAU); g.fill();
    } else if (E.scale === 'wind') {
      g.strokeStyle = dark; g.lineWidth = 1.5;
      g.beginPath(); g.arc(x, y, r * 0.5, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      g.beginPath(); g.arc(x + r * 0.15, y + r * 0.25, r * 0.35, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    } else { // wave: cung sóng
      g.strokeStyle = dark; g.lineWidth = 1.5;
      g.beginPath(); g.arc(x, y, r * 0.5, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    }
  }
  /* mào sống lưng tại 1 đốt — mỗi nguyên tố 1 kiểu, KHÔNG cánh dơi */
  _drawCrest(g, s) {
    const E = this.cfg, x = s.x, y0 = s.y - s.r * 0.95, h = 6 + s.r * 0.35;
    if (E.crest === 'crystal') {
      g.fillStyle = css(E.fxColor, 0.95);
      g.beginPath();
      g.moveTo(x, y0 - h); g.lineTo(x + 4, y0); g.lineTo(x, y0 + 2); g.lineTo(x - 4, y0);
      g.closePath(); g.fill();
    } else if (E.crest === 'bolt') {
      g.fillStyle = css(E.glow, 0.95);
      g.beginPath();
      g.moveTo(x - 3, y0); g.lineTo(x + 2, y0 - h); g.lineTo(x, y0 - h * 0.45); g.lineTo(x + 4, y0 - h * 0.9); g.lineTo(x - 1, y0);
      g.closePath(); g.fill();
    } else if (E.crest === 'fin') {
      g.fillStyle = css(this.colors.spikes, 0.9);
      g.beginPath(); g.ellipse(x, y0 - h * 0.4, 4.5, h * 0.55, -0.25, 0, TAU); g.fill();
    } else if (E.crest === 'feather') {
      g.fillStyle = css(this.colors.wingUpper, 0.95);
      g.beginPath(); g.ellipse(x, y0 - h * 0.5, 3, h * 0.6, -0.5, 0, TAU); g.fill();
    } else if (E.crest === 'star') {
      g.fillStyle = css(E.fxColor, 0.95);
      this._star4(g, x, y0 - h * 0.45, Math.max(3, h * 0.45));
    } else if (E.crest === 'plume') {
      g.fillStyle = css(E.fxColor, 0.9);
      g.beginPath();
      g.moveTo(x - 3, y0); g.quadraticCurveTo(x + 2, y0 - h * 1.2, x + 7, y0 - h * 1.3); g.quadraticCurveTo(x + 4, y0 - h * 0.4, x + 3, y0);
      g.closePath(); g.fill();
    } else if (E.crest === 'leaf') {
      g.fillStyle = css(E.glow, 0.9);
      g.beginPath(); g.ellipse(x, y0 - h * 0.45, 3.5, h * 0.55, -0.4, 0, TAU); g.fill();
    } else { // flame: giọt lửa
      g.fillStyle = css(E.glow, 0.95);
      g.beginPath();
      g.moveTo(x - 4, y0); g.quadraticCurveTo(x - 3, y0 - h, x + 1, y0 - h * 1.15); g.quadraticCurveTo(x + 4, y0 - h * 0.5, x + 4, y0);
      g.closePath(); g.fill();
    }
  }
  /* chân nhỏ thu gọn: cẳng ngắn + 3 móng, thõng dưới bụng (không thõng to như rồng tây) */
  _drawLeg(g, s, fwd) {
    const x = s.x + (fwd ? 5 : -5), y0 = s.y + s.r * 0.55, y1 = s.y + s.r + 11;
    g.strokeStyle = css(this.colors.body); g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y0); g.lineTo(x + (fwd ? 3 : -3), y1); g.stroke();
    g.strokeStyle = css(this.colors.black); g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x + (fwd ? 3 : -3), y1);
    g.lineTo(x + (fwd ? 1 : -1), y1 + 6);
    g.moveTo(x + (fwd ? 3 : -3), y1);
    g.lineTo(x + (fwd ? 5 : -5), y1 + 6);
    g.moveTo(x + (fwd ? 3 : -3), y1);
    g.lineTo(x + (fwd ? 9 : -9), y1 + 5);
    g.stroke();
  }
  /* chùm lông đuôi ở chóp đuôi — mỗi nguyên tố 1 kiểu, xoè về +x */
  _drawTailTuft(g, tip) {
    const E = this.cfg, x = tip.x - 4, y = tip.y;
    if (E.tail === 'crystal') {
      g.fillStyle = css(E.fxColor, 0.95);
      for (let k = 0; k < 4; k++) {
        const a = (-0.5 + k * 0.33), len = 26 - Math.abs(k - 1.5) * 5;
        g.save(); g.translate(x, y); g.rotate(a);
        g.beginPath(); g.moveTo(0, -4); g.lineTo(len, 0); g.lineTo(0, 4); g.closePath(); g.fill();
        g.restore();
      }
    } else if (E.tail === 'spark') {
      g.strokeStyle = css(E.glow, 0.95); g.lineWidth = 2.5; g.lineCap = 'round';
      for (let k = 0; k < 4; k++) {
        const a = -0.45 + k * 0.3, len = 30 - Math.abs(k - 1.5) * 6;
        g.save(); g.translate(x, y); g.rotate(a);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.4, -4); g.lineTo(len * 0.7, 3); g.lineTo(len, -2); g.stroke();
        g.restore();
      }
    } else if (E.tail === 'comet') {
      g.strokeStyle = css(E.fxColor, 0.85); g.lineWidth = 3; g.lineCap = 'round';
      for (let k = 0; k < 4; k++) {
        const a = -0.4 + k * 0.27, len = 34 - Math.abs(k - 1.5) * 6;
        g.save(); g.translate(x, y); g.rotate(a);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(len, 0); g.stroke();
        g.restore();
      }
      g.fillStyle = css(E.fxColor, 0.95);
      this._star4(g, x + 26, y - 8, 5);
      this._star4(g, x + 34, y + 6, 3.5);
    } else {
      const kind = E.tail === 'fin' ? 'ribbon' : E.tail === 'feather' || E.tail === 'phoenix' ? 'feather' : E.tail === 'leaf' ? 'leaf' : 'flame';
      const fill = E.tail === 'flame' || E.tail === 'phoenix' ? css(E.glow, 0.95) : E.tail === 'leaf' ? css(E.glow, 0.9) : css(E.fxColor, 0.9);
      const len = E.tail === 'phoenix' ? 48 : 34;
      for (let k = 0; k < 5; k++) this._tuft(g, x, y, -0.55 + k * 0.28, len - Math.abs(k - 2) * 6, 7 - Math.abs(k - 2), kind, fill);
    }
  }
  /* sừng trên đỉnh đầu — mỗi nguyên tố 1 kiểu (sừng hươu / pha lê / tia sét / vây / lông vũ / sao / phượng / cành cây) */
  _drawHorns(g) {
    const E = this.cfg;
    const hornStroke = css(this.colors.spikes); // sừng tương phản với thân
    if (E.horn === 'crystal') {
      g.fillStyle = css(E.fxColor, 0.95); g.strokeStyle = css(this.colors.black, 0.5); g.lineWidth = 1;
      g.beginPath(); g.moveTo(2, -18); g.lineTo(10, -38); g.lineTo(16, -20); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-12, -16); g.lineTo(-8, -34); g.lineTo(-2, -18); g.closePath(); g.fill(); g.stroke();
    } else if (E.horn === 'bolt') {
      g.strokeStyle = css(E.glow, 0.95); g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(-4, -18); g.lineTo(4, -30); g.lineTo(-2, -36); g.lineTo(10, -50); g.stroke();
      g.beginPath(); g.moveTo(-14, -16); g.lineTo(-10, -28); g.lineTo(-14, -32); g.lineTo(-6, -42); g.stroke();
    } else if (E.horn === 'fin') {
      g.fillStyle = css(E.fxColor, 0.9);
      for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(-12 + k * 10, -26 - k * 2, 4, 11, -0.3 + k * 0.25, 0, TAU); g.fill(); }
    } else if (E.horn === 'feather') {
      g.strokeStyle = css(E.fxColor, 0.95); g.lineWidth = 3; g.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        g.beginPath(); g.moveTo(-10 + k * 8, -18); g.quadraticCurveTo(-2 + k * 9, -34, 8 + k * 9, -44 - k * 2); g.stroke();
      }
    } else if (E.horn === 'star') {
      g.strokeStyle = hornStroke; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-6, -18); g.quadraticCurveTo(2, -32, 12, -42); g.stroke();
      g.fillStyle = css(E.fxColor, 0.95); this._star4(g, 14, -44, 7);
      g.beginPath(); g.moveTo(-14, -16); g.quadraticCurveTo(-10, -28, -4, -36); g.stroke();
    } else if (E.horn === 'phoenix') {
      g.strokeStyle = css(E.fxColor, 0.95); g.lineWidth = 3.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-6, -18); g.quadraticCurveTo(6, -36, 24, -46); g.stroke();
      g.beginPath(); g.moveTo(-14, -16); g.quadraticCurveTo(-4, -32, 10, -42); g.stroke();
      g.fillStyle = css(E.glow, 0.9);
      g.beginPath(); g.ellipse(24, -46, 3, 6, 0.6, 0, TAU); g.fill();
    } else if (E.horn === 'branch') {
      g.strokeStyle = hornStroke; g.lineWidth = 3.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-6, -18); g.lineTo(2, -32); g.lineTo(12, -44); g.stroke();
      g.beginPath(); g.moveTo(2, -32); g.lineTo(-6, -42); g.stroke();
      g.beginPath(); g.moveTo(-14, -16); g.lineTo(-10, -30); g.lineTo(-18, -40); g.stroke();
      g.fillStyle = css(E.glow, 0.95);
      g.beginPath(); g.ellipse(12, -44, 3.5, 6, 0.6, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(-6, -42, 3.5, 6, -0.6, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(-18, -40, 3.5, 6, -0.6, 0, TAU); g.fill();
    } else { // antler: sừng hươu 2 nhánh — nhánh chính cong về sau + 2 chạc
      g.strokeStyle = hornStroke; g.lineWidth = 4.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-6, -18); g.bezierCurveTo(2, -32, 10, -42, 22, -48); g.stroke();
      g.beginPath(); g.moveTo(4, -32); g.lineTo(12, -46); g.stroke();
      g.beginPath(); g.moveTo(11, -40); g.lineTo(22, -50); g.stroke();
      g.beginPath(); g.moveTo(-14, -16); g.bezierCurveTo(-10, -30, -4, -38, 4, -44); g.stroke();
      g.beginPath(); g.moveTo(-9, -29); g.lineTo(-4, -42); g.stroke();
    }
  }
  /* đầu rồng đông: sọ to + mõm dài hướng −x, mắt to, miệng hơi mở thấy răng nanh, râu dài bay ngược */
  _drawHead(g) {
    const s0 = this.segments[0];
    const E = this.cfg, C = this.colors;
    g.save();
    g.translate(s0.x, s0.y);
    g.rotate(-this.vySmooth * 0.12); // chúc/ngẩng nhẹ theo vy
    /* bờm sau đầu (vẽ trước, nằm dưới sọ) — theo nguyên tố */
    const maneKind = E.mane === 'flame' || E.mane === 'spark' ? 'flame' : E.mane === 'leaf' ? 'leaf' : E.mane === 'flow' || E.mane === 'frost' ? 'ribbon' : 'feather';
    const maneFill = E.mane === 'flame' || E.mane === 'spark' || E.mane === 'phoenix' ? css(E.glow, 0.95) : css(E.fxColor, 0.9);
    this._tuft(g, -2, -14, -0.5, 44, 10, maneKind, maneFill);
    this._tuft(g, 0, -6, -0.15, 48, 9, maneKind, maneFill);
    this._tuft(g, 2, 2, 0.15, 44, 9, maneKind, maneFill);
    this._tuft(g, -4, 12, 0.45, 30, 8, maneKind, maneFill); // râu cằm
    /* sọ + mõm */
    g.fillStyle = css(C.body);
    g.beginPath(); g.ellipse(-8, -2, 27, 22, 0, 0, TAU); g.fill();
    g.beginPath();
    g.moveTo(-24, -9);
    g.bezierCurveTo(-36, -10, -46, -6, -48, 0);
    g.bezierCurveTo(-46, 6, -36, 10, -24, 9);
    g.closePath(); g.fill();
    /* hàm dưới + miệng hơi mở */
    g.fillStyle = css(C.wingArm);
    g.beginPath();
    g.moveTo(-44, 5); g.quadraticCurveTo(-20, 15, -4, 9); g.lineTo(-4, 4); g.quadraticCurveTo(-22, 9, -44, 5);
    g.closePath(); g.fill();
    g.strokeStyle = css(C.black); g.lineWidth = 1.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-44, 4); g.quadraticCurveTo(-24, 8, -8, 7); g.stroke();
    g.fillStyle = '#ffffff'; // 2 răng nanh nhỏ
    g.beginPath(); g.moveTo(-38, 6); g.lineTo(-34, 6); g.lineTo(-36, 11); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-28, 7); g.lineTo(-24, 7); g.lineTo(-26, 12); g.closePath(); g.fill();
    /* mũi */
    g.fillStyle = css(C.black);
    g.beginPath(); g.ellipse(-42, -2, 1.8, 2.6, 0.3, 0, TAU); g.fill();
    /* mắt to có thần + chân mày */
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(-15, -10, 6.5, 7.5, 0, 0, TAU); g.fill();
    g.fillStyle = css(C.black);
    g.beginPath(); g.ellipse(-16, -10, 2.6, 4.2, 0, 0, TAU); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(-17.5, -12, 1.3, 0, TAU); g.fill();
    g.strokeStyle = css(C.black); g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); g.arc(-15, -11, 9, Math.PI * 1.05, Math.PI * 1.9); g.stroke();
    /* vảy má */
    g.strokeStyle = css(C.black, 0.35); g.lineWidth = 1;
    g.beginPath(); g.arc(2, 4, 6, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.beginPath(); g.arc(10, 0, 5, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    this._drawHorns(g);
    /* râu dài bay ngược về phía thân (+x) */
    g.strokeStyle = css(E.fxColor, 0.85); g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-44, 2); g.bezierCurveTo(-20, 18, 10, 20, 46, 8); g.stroke();
    g.beginPath(); g.moveTo(-42, -3); g.bezierCurveTo(-16, -14, 14, -16, 42, -22); g.stroke();
    g.restore();
  }
  /* hạt hiệu ứng quanh thân — mỗi nguyên tố 1 hình hạt */
  _drawFx(g) {
    const E = this.cfg, S = this.segments, n = S.length;
    for (const p of this._fx) {
      const s = S[Math.max(0, Math.min(n - 1, Math.round(p.u * (n - 1))))];
      const px = s.x + Math.sin(this.t * p.sp + p.ph) * 4;
      const py = s.y + p.off * s.r + Math.cos(this.t * p.sp * 0.8 + p.ph) * 3;
      const a = 0.45 + 0.35 * Math.sin(this.t * 2 + p.ph);
      if (a <= 0.05) continue;
      if (E.fx === 'ember') {
        g.fillStyle = css(E.glow, a * 0.3);
        g.beginPath(); g.arc(px, py, p.sz * 2, 0, TAU); g.fill();
        g.fillStyle = css(E.fxColor, a);
        g.beginPath(); g.arc(px, py, p.sz, 0, TAU); g.fill();
      } else if (E.fx === 'frost') {
        g.strokeStyle = css(E.fxColor, a); g.lineWidth = 1.5; g.lineCap = 'round';
        g.beginPath();
        g.moveTo(px - p.sz, py); g.lineTo(px + p.sz, py);
        g.moveTo(px - p.sz * 0.7, py - p.sz * 0.7); g.lineTo(px + p.sz * 0.7, py + p.sz * 0.7);
        g.moveTo(px - p.sz * 0.7, py + p.sz * 0.7); g.lineTo(px + p.sz * 0.7, py - p.sz * 0.7);
        g.stroke();
      } else if (E.fx === 'spark' || E.fx === 'star') {
        g.fillStyle = css(E.fxColor, a);
        this._star4(g, px, py, p.sz * 1.4);
      } else if (E.fx === 'drop') {
        g.fillStyle = css(E.fxColor, a);
        g.beginPath(); g.arc(px, py, p.sz * 0.8, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(px, py - p.sz * 1.8); g.lineTo(px + p.sz * 0.6, py); g.lineTo(px - p.sz * 0.6, py); g.closePath(); g.fill();
      } else if (E.fx === 'feather' || E.fx === 'plume') {
        g.fillStyle = css(E.fxColor, a);
        g.beginPath(); g.ellipse(px, py, p.sz * 1.3, p.sz * 0.55, p.ph, 0, TAU); g.fill();
      } else { // leaf
        g.fillStyle = css(E.glow, a);
        g.beginPath(); g.ellipse(px, py, p.sz, p.sz * 0.55, p.ph, 0, TAU); g.fill();
      }
    }
  }
  /* Vẽ rồng vào context: đầu ở (0,0), thân trải về +x — cùng không gian local với CpDragon.draw. */
  draw(g) {
    const S = this.segments, C = this.colors, n = S.length;
    g.save();
    this._drawTailTuft(g, S[n - 1]);
    /* thân trên (dải cong theo các đốt) */
    g.fillStyle = css(C.body);
    g.beginPath();
    g.moveTo(S[0].x, S[0].y - S[0].r * 0.92);
    for (let i = 1; i < n; i++) g.lineTo(S[i].x, S[i].y - S[i].r * 0.92);
    for (let i = n - 1; i >= 0; i--) g.lineTo(S[i].x, S[i].y + S[i].r * 0.95);
    g.closePath(); g.fill();
    /* bụng nhạt hơn lưng */
    g.fillStyle = css(C.wingLower);
    g.beginPath();
    g.moveTo(S[0].x, S[0].y + S[0].r * 0.25);
    for (let i = 1; i < n; i++) g.lineTo(S[i].x, S[i].y + S[i].r * 0.25);
    for (let i = n - 1; i >= 0; i--) g.lineTo(S[i].x, S[i].y + S[i].r * 0.95);
    g.closePath(); g.fill();
    /* vảy dọc thân */
    for (let i = 3; i < n - 1; i += 3) this._drawScale(g, S[i], i);
    /* mào sống lưng */
    for (let i = 4; i < n - 2; i += 4) this._drawCrest(g, S[i]);
    /* 4 chân nhỏ thu gọn dọc thân */
    for (const u of [0.16, 0.30, 0.55, 0.70]) {
      const s = S[Math.round(u * (n - 1))];
      this._drawLeg(g, s, u < 0.5);
    }
    this._drawFx(g);
    this._drawHead(g);
    g.restore();
  }
}
