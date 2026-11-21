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
export const tierInfo = t => TIERS[Math.max(0, Math.min(TIERS.length, t === true ? 1 : +t || 0)) - 1] || null;
