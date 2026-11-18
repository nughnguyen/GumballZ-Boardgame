// 🖼️ Bộ nạp sprite sheet Ô Ăn Quan.
// Nguyễn chưa gửi ảnh nên game mặc định dùng đồ họa CSS/SVG. Nếu có ảnh, game tự dùng:
//   oanquan/img/spritesheet.png — bố cục (xem huong-dan/): 2/3 trên là ảnh bàn cờ gỗ
//   (nhìn từ trên xuống), 1/3 dưới là 2 viên đá đặt cạnh nhau trên nền trắng:
//   nửa trái = đá Dân, nửa phải = đá Quan.
// Ngoài ra có thể thả riêng: oanquan/img/stone-dan.png và oanquan/img/stone-quan.png
// (mỗi ảnh 1 viên đá trên nền trắng) — 2 file này ưu tiên hơn dải đá trong sheet.
// Tất cả ảnh nền trắng đều được tách nền bằng canvas chroma-key (trắng → trong suốt).
// Không có file / lỗi đọc → trả về null, game dùng CSS/SVG bình thường.
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('không tải được ' + src));
    img.src = src;
  });
}
/* tách nền trắng: pixel càng trắng càng trong suốt (mềm ở rìa để không còn viền trắng) */
function chromaKey(img, sx, sy, sw, sh) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, sw); c.height = Math.max(1, sh);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height), px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    const m = Math.min(px[i], px[i + 1], px[i + 2]);
    if (m > 225) px[i + 3] = Math.round(255 * Math.max(0, (240 - m) / 15));
  }
  ctx.putImageData(d, 0, 0);
  return c.toDataURL('image/png');
}
export async function loadSprites(base = 'img/') {
  /* Thử 2 ảnh đá rời TRƯỚC (đang có sẵn) để không 404; chỉ thử spritesheet
     khi thiếu đá — sheet chứa thêm ảnh bàn cờ, là dự phòng cho bàn. */
  const out = { board: null, stoneDan: null, stoneQuan: null, used: 'stones' };
  let any = false;
  for (const [key, file] of [['stoneDan', 'stone-dan.png'], ['stoneQuan', 'stone-quan.png']]) {
    try { const one = await loadImage(base + file); out[key] = chromaKey(one, 0, 0, one.naturalWidth, one.naturalHeight); any = true; } catch (e) {}
  }
  if (any) return out;
  try {
    const img = await loadImage(base + 'spritesheet.png');
    const w = img.naturalWidth, h = img.naturalHeight;
    if (w < 60 || h < 60) return null;
    const boardH = Math.round(h * 2 / 3);
    out.used = 'sheet';
    try { out.board = chromaKey(img, 0, 0, w, boardH); } catch (e) { out.board = null; }
    const stoneH = h - boardH, half = Math.round(w / 2);
    try { out.stoneDan = chromaKey(img, 0, boardH, half, stoneH); } catch (e) {}
    try { out.stoneQuan = chromaKey(img, half, boardH, w - half, stoneH); } catch (e) {}
    /* ảnh đá rời (nếu có) ưu tiên hơn dải đá trong sheet */
    for (const [key, file] of [['stoneDan', 'stone-dan.png'], ['stoneQuan', 'stone-quan.png']]) {
      try { const one = await loadImage(base + file); out[key] = chromaKey(one, 0, 0, one.naturalWidth, one.naturalHeight); out.used = 'sheet+stones'; } catch (e) {}
    }
    if (!out.board && !out.stoneDan && !out.stoneQuan) return null;
    return out;
  } catch (e) {
    /* không có spritesheet.png lẫn ảnh đá rời → CSS/SVG */
    return null;
  }
}
