/* 🐉 Rồng CodePen (patch -158): port thuần Canvas 2D từ sketch "Dragon Animation"
   của grantjenkins (https://codepen.io/grantjenkins/pen/poeqNve) — KHÔNG dùng thư viện gốc, KHÔNG CDN.
   Giữ nguyên mọi thành phần của bản gốc: Dragon 28 đốt thân + mảng node radii, 2 cánh (màng + tay cánh
   + 4 gai a/b/c/d + gai nhọn), chân trước + chân sau (bản trước/bản sau), đầu chi tiết (sừng, mắt,
   miệng, mũi, đường vân, hốc), gai lưng, bụng đen, vảy, đuôi tam giác, 3 theme màu đỏ/xanh lá/đen.
   Scene (trời/đất/đồi/mây) ở cuối file — dùng cho banner "Rồng Bay" (banner-render.js).
   Rồng khung avatar (dragonSVG) giờ vẽ bằng canvas thay cho SVG cũ (-147): cùng chữ ký gọi,
   cùng quỹ đạo orbit (số 8) / edge (tròn mép viền), cùng chu kỳ 12s hiện ~3s, phase lệch cho
   khung nhiều rồng; reduced-motion = 1 khung tĩnh; chỉ vẽ khi trong màn hình (IntersectionObserver).
   Màu: themeForColors(c1, c2) suy các sắc đậm/nhạt từ 2 màu của từng khung để giữ bản sắc khung.
   Lưu ý so với bản gốc: miệng rồng (bezier) bản gốc gọi khi đang noStroke() nên không hiện —
   bản port vẽ miệng bằng nét đen như tác giả định vẽ; còn lại giữ nguyên cả các "quirk" số học
   (a -= 90 radian ở gai lưng, diff xoay chân) để hình ra giống hệt. */

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
    this.showLegs = true;
    this.wing = {
      x1: 0, y1: 0, x2: 0, y2: 0, x3: 0, y3: 0, x4: 0, y4: 0,
      spines: { a: { x1: 0, y1: 0, x2: 0, y2: 0 }, b: { x1: 0, y1: 0, x2: 0, y2: 0 }, c: { x1: 0, y1: 0, x2: 0, y2: 0 }, d: { x1: 0, y1: 0, x2: 0, y2: 0 } },
    };
    this.m = 0; this.m2 = 0; this.diff = 0; this.headBob = 0; // đầu chìm/nổi so với y=200 (bản gốc: seg0.y dao động 200..283)
    this.colors = theme || DRAGON_THEMES.red;
    for (let i = 0; i <= 27; i++) this.segments.push({ x: this.x + this.w * i / 27, y: this.y });
  }

  update(dt) {
    this.diff = this.segments[0].y - this.segments[1].y;
    this.timer += dt * 1.08; // 0.018/khung × 60 khung/giây
    this.m = Math.sin(this.timer * this.speed) * this.lift;
    this.m2 = Math.cos(this.timer * this.speed) * this.lift;
    for (let i = 0; i < this.segments.length; i++) {
      const s = this.segments[i];
      if (i === 0) { s.y += this.m; s.x = this.x; }
      else { s.y += (this.segments[i - 1].y - s.y) * 0.20; s.x += (this.segments[i - 1].x - s.x) * 0.20; }
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
   thay cho <svg>; mount bằng initFrameDragons(root) sau khi vẽ HTML (như initBanners). */
export function dragonSVG(c1, c2, D = 3, mode = 'orbit', phase = 0) {
  return `<canvas class="dov" data-c1="${escA(c1)}" data-c2="${escA(c2)}" data-d="${+D || 3}" data-mode="${mode === 'edge' ? 'edge' : 'orbit'}" data-phase="${+phase || 0}" width="360" height="360" aria-hidden="true"></canvas>`;
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
  const pt = orbitPoint(prog * TAU, d.mode);
  const k = W / 560; // rồng dài ~280 đơn vị → ~nửa hộp 180
  g.save();
  g.translate(W / 2 + pt.x * (W / 180), H / 2 + pt.y * (H / 180));
  g.rotate(pt.angle + Math.PI); // đầu hướng theo tiếp tuyến, thân kéo phía sau
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
    if (op > 0) d.dragon.update(1 / 60);
    fdDraw(c, ((nowSec + d.phase * 12) / d.D) % 1, op);
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
    const dr = new CpDragon(th);
    for (let i = 0; i < 40; i++) dr.update(1 / 60); // thân uốn sẵn, khung tĩnh đầu tiên đã đẹp
    c._fd = { dragon: dr, mode: c.dataset.mode === 'edge' ? 'edge' : 'orbit', D: +c.dataset.d || 3, phase: +c.dataset.phase || 0 };
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
    this.dragon.update(dt || 1 / 60);
    const s = Math.max(W / 600, H / 600);
    const ox = W / 2 - 300 * s, oy = H / 2 - 280 * s;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.save();
    g.translate(ox, oy); g.scale(s, s);
    g.drawImage(this.sky, 0, 0, 600, 450);
    for (const h of this.hillsBack) g.drawImage(A.hillsBack, h.x, 305, 614, 205);
    for (const h of this.hillsFront) g.drawImage(A.hillsFront, h.x, 385, 602, 105);
    for (const gr of this.grounds) g.drawImage(this.ground, gr.x, 450, 602, 150);
    for (const c of this.cloudsBack) g.drawImage(c.img, c.x, c.y, 110 * c.scale, 110 * c.scale * 0.8);
    g.save(); g.translate(130, 200 + this.dragon.headBob); this.dragon.draw(g); g.restore();
    for (const c of this.cloudsFront) g.drawImage(c.img, c.x, c.y, 110 * c.scale, 110 * c.scale * 0.8);
    g.restore();
  };
  return sc;
}
