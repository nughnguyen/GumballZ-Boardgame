// 🖼️ Hình mẫu Ghép Hình — 6 bức tự vẽ bằng Canvas 2D, không dùng ảnh ngoài.
// Mỗi hình là 1 hàm vẽ vào ctx trong hộp w×h (dùng tỉ lệ theo w/h nên
// vẽ được ở mọi kích thước). main.js vẽ mỗi hình 1 lần lên canvas
// offscreen rồi cắt thành từng mảnh bằng drawImage.
export const PIC_COUNT = 6;

function sky(ctx, w, h, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
function sun(ctx, x, y, r) {
  ctx.fillStyle = '#FFE45C';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#FFE45C'; ctx.lineWidth = r * 0.18; ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25);
    ctx.lineTo(x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6);
    ctx.stroke();
  }
}
function cloud(ctx, x, y, s) {
  ctx.fillStyle = '#FFFDF9';
  ctx.beginPath();
  ctx.ellipse(x, y, 0.55 * s, 0.32 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 0.4 * s, y + 0.08 * s, 0.35 * s, 0.24 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 0.4 * s, y + 0.08 * s, 0.38 * s, 0.26 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}
function hill(ctx, w, h, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.82);
  ctx.quadraticCurveTo(w * 0.5, h * 0.62, w, h * 0.82);
  ctx.lineTo(w, h); ctx.lineTo(0, h);
  ctx.fill();
}

const DRAW = [
  /* 0 — Mặt trời và mây */
  (ctx, w, h) => {
    sky(ctx, w, h, '#AFD8F3', '#D8F0FF');
    sun(ctx, w * 0.78, h * 0.22, w * 0.13);
    cloud(ctx, w * 0.26, h * 0.24, w * 0.22);
    cloud(ctx, w * 0.55, h * 0.42, w * 0.16);
    hill(ctx, w, h, '#7CCB7F');
    ctx.fillStyle = '#FF5CA8';
    ctx.beginPath(); ctx.arc(w * 0.2, h * 0.86, w * 0.035, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFE45C';
    ctx.beginPath(); ctx.arc(w * 0.34, h * 0.9, w * 0.03, 0, Math.PI * 2); ctx.fill();
  },
  /* 1 — Con cá */
  (ctx, w, h) => {
    sky(ctx, w, h, '#3FA7D6', '#B8E6F5');
    ctx.fillStyle = '#2B7FA8';
    ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, h * 0.88);
    ctx.quadraticCurveTo(w * 0.25, h * 0.78, w * 0.5, h * 0.88);
    ctx.quadraticCurveTo(w * 0.75, h * 0.98, w, h * 0.88);
    ctx.lineTo(w, h); ctx.fill();
    /* rong biển */
    ctx.strokeStyle = '#2E9E5B'; ctx.lineWidth = w * 0.03; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(w * 0.12, h); ctx.quadraticCurveTo(w * 0.08, h * 0.82, w * 0.14, h * 0.68); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 0.88, h); ctx.quadraticCurveTo(w * 0.92, h * 0.8, w * 0.86, h * 0.66); ctx.stroke();
    /* cá */
    ctx.fillStyle = '#FF9F43';
    ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.48, w * 0.26, h * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w * 0.72, h * 0.48); ctx.lineTo(w * 0.88, h * 0.34); ctx.lineTo(w * 0.88, h * 0.62); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFFDF9';
    ctx.beginPath(); ctx.arc(w * 0.36, h * 0.43, w * 0.045, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2B2440';
    ctx.beginPath(); ctx.arc(w * 0.36, h * 0.43, w * 0.022, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#E07B28'; ctx.lineWidth = w * 0.015;
    ctx.beginPath(); ctx.arc(w * 0.52, h * 0.48, w * 0.07, -1.2, 1.2); ctx.stroke();
    /* bọt khí */
    ctx.fillStyle = 'rgba(255,253,249,0.85)';
    [[0.24, 0.26], [0.3, 0.16], [0.66, 0.22]].forEach(([fx, fy]) => {
      ctx.beginPath(); ctx.arc(w * fx, h * fy, w * 0.03, 0, Math.PI * 2); ctx.fill();
    });
  },
  /* 2 — Ngôi nhà */
  (ctx, w, h) => {
    sky(ctx, w, h, '#AFD8F3', '#E8F6FF');
    sun(ctx, w * 0.84, h * 0.16, w * 0.1);
    cloud(ctx, w * 0.22, h * 0.2, w * 0.18);
    hill(ctx, w, h, '#7CCB7F');
    /* cây */
    ctx.fillStyle = '#8B5E34'; ctx.fillRect(w * 0.78, h * 0.6, w * 0.05, h * 0.2);
    ctx.fillStyle = '#2E9E5B';
    ctx.beginPath(); ctx.arc(w * 0.805, h * 0.55, w * 0.12, 0, Math.PI * 2); ctx.fill();
    /* nhà */
    ctx.fillStyle = '#FFB98A';
    ctx.fillRect(w * 0.2, h * 0.48, w * 0.42, h * 0.34);
    ctx.fillStyle = '#FF5C5C';
    ctx.beginPath(); ctx.moveTo(w * 0.16, h * 0.48); ctx.lineTo(w * 0.41, h * 0.28); ctx.lineTo(w * 0.66, h * 0.48); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8B5E34'; ctx.fillRect(w * 0.37, h * 0.64, w * 0.09, h * 0.18);
    ctx.fillStyle = '#AFD8F3';
    ctx.fillRect(w * 0.25, h * 0.55, w * 0.09, h * 0.09);
    ctx.fillRect(w * 0.49, h * 0.55, w * 0.09, h * 0.09);
    ctx.strokeStyle = '#FFFDF9'; ctx.lineWidth = w * 0.012;
    ctx.strokeRect(w * 0.25, h * 0.55, w * 0.09, h * 0.09);
    ctx.strokeRect(w * 0.49, h * 0.55, w * 0.09, h * 0.09);
  },
  /* 3 — Bông hoa */
  (ctx, w, h) => {
    sky(ctx, w, h, '#C9E8FF', '#FFF3D6');
    sun(ctx, w * 0.82, h * 0.18, w * 0.09);
    hill(ctx, w, h, '#7CCB7F');
    /* thân + lá */
    ctx.strokeStyle = '#2E9E5B'; ctx.lineWidth = w * 0.03; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.88); ctx.lineTo(w * 0.5, h * 0.5); ctx.stroke();
    ctx.fillStyle = '#2E9E5B';
    ctx.beginPath(); ctx.ellipse(w * 0.4, h * 0.68, w * 0.09, w * 0.045, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w * 0.6, h * 0.74, w * 0.09, w * 0.045, 0.5, 0, Math.PI * 2); ctx.fill();
    /* cánh hoa */
    ctx.fillStyle = '#FF5CA8';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(w * 0.5 + Math.cos(a) * w * 0.13, h * 0.38 + Math.sin(a) * w * 0.13, w * 0.085, w * 0.085, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#FFE45C';
    ctx.beginPath(); ctx.arc(w * 0.5, h * 0.38, w * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FF9F43';
    ctx.beginPath(); ctx.arc(w * 0.47, h * 0.36, w * 0.015, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w * 0.53, h * 0.4, w * 0.015, 0, Math.PI * 2); ctx.fill();
  },
  /* 4 — Con mèo */
  (ctx, w, h) => {
    sky(ctx, w, h, '#FFE3A3', '#FFF8EE');
    /* tai */
    ctx.fillStyle = '#FF9F43';
    ctx.beginPath(); ctx.moveTo(w * 0.24, h * 0.4); ctx.lineTo(w * 0.3, h * 0.18); ctx.lineTo(w * 0.42, h * 0.34); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w * 0.58, h * 0.34); ctx.lineTo(w * 0.7, h * 0.18); ctx.lineTo(w * 0.76, h * 0.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFB9CF';
    ctx.beginPath(); ctx.moveTo(w * 0.29, h * 0.36); ctx.lineTo(w * 0.32, h * 0.24); ctx.lineTo(w * 0.38, h * 0.33); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w * 0.62, h * 0.33); ctx.lineTo(w * 0.68, h * 0.24); ctx.lineTo(w * 0.71, h * 0.36); ctx.closePath(); ctx.fill();
    /* mặt */
    ctx.fillStyle = '#FFB366';
    ctx.beginPath(); ctx.arc(w * 0.5, h * 0.55, w * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#E07B28'; ctx.lineWidth = w * 0.015;
    ctx.beginPath(); ctx.moveTo(w * 0.44, h * 0.3); ctx.lineTo(w * 0.44, h * 0.36); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.28); ctx.lineTo(w * 0.5, h * 0.34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 0.56, h * 0.3); ctx.lineTo(w * 0.56, h * 0.36); ctx.stroke();
    /* mắt */
    ctx.fillStyle = '#2B2440';
    ctx.beginPath(); ctx.ellipse(w * 0.38, h * 0.5, w * 0.035, w * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w * 0.62, h * 0.5, w * 0.035, w * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    /* mũi + miệng */
    ctx.fillStyle = '#FF5C5C';
    ctx.beginPath(); ctx.moveTo(w * 0.46, h * 0.62); ctx.lineTo(w * 0.54, h * 0.62); ctx.lineTo(w * 0.5, h * 0.67); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8B5E34'; ctx.lineWidth = w * 0.012;
    ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.67); ctx.quadraticCurveTo(w * 0.44, h * 0.73, w * 0.4, h * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.67); ctx.quadraticCurveTo(w * 0.56, h * 0.73, w * 0.6, h * 0.7); ctx.stroke();
    /* râu */
    ctx.strokeStyle = '#FFFDF9'; ctx.lineWidth = w * 0.01; ctx.lineCap = 'round';
    [[0.2, 0.58, 0.34, 0.62], [0.2, 0.66, 0.34, 0.64], [0.8, 0.58, 0.66, 0.62], [0.8, 0.66, 0.66, 0.64]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath(); ctx.moveTo(w * x1, h * y1); ctx.lineTo(w * x2, h * y2); ctx.stroke();
    });
  },
  /* 5 — Quả táo */
  (ctx, w, h) => {
    sky(ctx, w, h, '#D8F0FF', '#FFF3D6');
    hill(ctx, w, h, '#7CCB7F');
    /* cành + lá */
    ctx.strokeStyle = '#8B5E34'; ctx.lineWidth = w * 0.03; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.3); ctx.quadraticCurveTo(w * 0.52, h * 0.2, w * 0.56, h * 0.16); ctx.stroke();
    ctx.fillStyle = '#2E9E5B';
    ctx.beginPath(); ctx.ellipse(w * 0.66, h * 0.22, w * 0.11, w * 0.05, -0.5, 0, Math.PI * 2); ctx.fill();
    /* thân táo */
    ctx.fillStyle = '#E23B3B';
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.32);
    ctx.bezierCurveTo(w * 0.3, h * 0.22, w * 0.2, h * 0.5, w * 0.28, h * 0.68);
    ctx.bezierCurveTo(w * 0.34, h * 0.84, w * 0.66, h * 0.84, w * 0.72, h * 0.68);
    ctx.bezierCurveTo(w * 0.8, h * 0.5, w * 0.7, h * 0.22, w * 0.5, h * 0.32);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,253,249,0.75)';
    ctx.beginPath(); ctx.ellipse(w * 0.36, h * 0.48, w * 0.05, w * 0.09, -0.4, 0, Math.PI * 2); ctx.fill();
  },
];

export const PICTURES = [
  { id: 0, name: 'Mặt trời và mây', emoji: '☀️', draw: DRAW[0] },
  { id: 1, name: 'Con cá', emoji: '🐟', draw: DRAW[1] },
  { id: 2, name: 'Ngôi nhà', emoji: '🏠', draw: DRAW[2] },
  { id: 3, name: 'Bông hoa', emoji: '🌸', draw: DRAW[3] },
  { id: 4, name: 'Con mèo', emoji: '🐱', draw: DRAW[4] },
  { id: 5, name: 'Quả táo', emoji: '🍎', draw: DRAW[5] },
];

/* Vẽ hình picId vào ctx trong hộp w×h. */
export function drawPicture(ctx, picId, w, h) {
  const pic = PICTURES[picId % PICTURES.length];
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  pic.draw(ctx, w, h);
  ctx.restore();
  return pic;
}
export default PICTURES;
