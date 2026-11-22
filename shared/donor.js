// 🏅 Bậc ủng hộ GumballZ (patch -102) – dùng chung cho web và máy chủ.
// Chỉ là huy hiệu cảm ơn: KHÔNG đổi được xu / chip / lợi thế gì trong game.
// Máy chủ chỉ công khai SỐ BẬC (1–5) của người khác, không công khai số tiền; tổng tiền chỉ trả về cho chính chủ tài khoản.
// Tên bậc theo phong cách ngầu của patch -103 (kiếm hiệp / anime / sci-fi / vật lý / khoa học) – KHÔNG dùng tên bản gốc.
export const TIERS = [
  { t: 1, min: 1, icon: '⚔️', name: 'Kiếm Khách', note: 'Ly cà phê đầu tiên' },
  { t: 2, min: 50000, icon: '🌌', name: 'Tinh Hành Giả', note: 'Từ 50.000đ' },
  { t: 3, min: 100000, icon: '🔥', name: 'Viêm Đế', note: 'Từ 100.000đ' },
  { t: 4, min: 200000, icon: '⚡', name: 'Lôi Thần', note: 'Từ 200.000đ' },
  { t: 5, min: 500000, icon: '👑', name: 'Chúa Tể Sảnh', note: 'Từ 500.000đ' },
];
/* tổng tiền đã ủng hộ → số bậc (0 = chưa ủng hộ). Nhận cả cờ cũ true/false. */
export function tierOf(amt) {
  if (amt === true) return 1; const a = +amt || 0; let t = 0;
  for (const x of TIERS) if (a >= x.min) t = x.t;
  return t;
}
/* Patch -163: bậc theo mốc TUỲ CHỈNH (Quản trị sửa ở trang Quản trị, lưu ở máy chủ).
   mins = mảng 5 số nguyên tăng dần (mốc tối thiểu từng bậc, bậc 1 có thể là 1).
   mins không hợp lệ (không phải mảng 5 số) → dùng mốc mặc định. */
export function tierOfWith(amt, mins) {
  if (amt === true) return 1;
  const m = Array.isArray(mins) && mins.length === 5 && mins.every(x => Number.isInteger(x) && x >= 1) ? mins : TIERS.map(x => x.min);
  const a = +amt || 0; let t = 0;
  for (let i = 0; i < 5; i++) if (a >= m[i]) t = i + 1;
  return t;
}
/* Gộp mốc tuỳ chỉnh vào danh sách bậc để hiển thị (icon/tên/ghi chú giữ nguyên, chỉ đổi min).
   Trả null khi mins không hợp lệ để bên gọi fallback về TIERS tĩnh. */
export function mergeTierMins(mins) {
  if (!Array.isArray(mins) || mins.length !== 5 || !mins.every(x => Number.isInteger(x) && x >= 1)) return null;
  return TIERS.map((x, i) => ({ ...x, min: mins[i] }));
}
export const tierInfo = t => TIERS[Math.max(0, Math.min(TIERS.length, t === true ? 1 : +t || 0)) - 1] || null;
