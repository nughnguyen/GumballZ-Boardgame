// 🎨 Diện mạo người chơi: khung avatar, màu tên, hiệu ứng thắng, lộ trình thưởng 45 mốc mở đồ.
// Lộ trình thưởng nhân vật (17–18/11/2026), đổi tên sang gumballz.
// Thuần logic, không đụng DOM – dùng chung cho trang đổi đồ (shared/avatar-sample.html),
// Hồ sơ (shared/ui/profile.js – xem GHI CHÚ NỐI DÂY ở cuối file) và máy chủ (kiểm nhân vật người khác gửi lên).
// Nhân vật lưu dạng cấu hình { kind, skin, hair, hairColor, hat, outfit, acc, horns, color } (OPTIONS ở shared/js/avatar-opts.js).
import { cleanChar, OPTIONS } from './avatar-opts.js';

/* ---------- điều kiện mở khoá (st = statsFromTotals(...) / statsFromLoad(...)) ----------
   st = { p: tổng ván đã chơi, w: tổng ván thắng, best: chuỗi thắng dài nhất, kinds: số game khác nhau đã chơi,
          days: số ngày khác nhau đã chơi, night: 1 nếu từng chơi xong ván lúc nửa đêm,
          rank: hạng trên bảng xếp hạng (0 = chưa biết), created: thời điểm tạo tài khoản (ms, 0 = chưa biết),
          admin: true nếu là tài khoản quản trị } */
/* ---------- vật phẩm VIP: mở bằng chuỗi ngày đứng top BXH (patch -143) ----------
   Thang 5 bậc, độ khó tăng dần ở CẢ 2 chiều (bậc sau đòi hạng cao hơn VÀ giữ lâu hơn bậc trước —
   user chọn thang này 2026-11-22 00:17, thay thang zic-zac cũ):
   vip1 Top 10 · 7 ngày, vip2 Top 5 · 10 ngày, vip3 Top 3 · 14 ngày, vip4 Top 2 · 21 ngày, vip5 Top 1 · 30 ngày.
   "Liên tục" = mỗi ngày đều nằm trong top đó, tính theo lần đồng bộ (xem server/src/vip-unlocks.js):
   ngày nào không đồng bộ thì không đếm được → chuỗi về 0. Món VIP chỉ mở bằng thang này,
   KHÔNG cấp tay được (máy chủ chặn ở nhánh grant). id món chỉ dùng chữ thường (không số) để
   khớp regex ví `^(frame|color|back|banner):[a-z]{2,14}$` ở server/src/users.js. */
export const VIP_TIERS = [
  { id: 'vip1', top: 10, days: 7, kind: 'frame', item: 'vipsao', name: 'Khung Ngôi Sao', icon: '⭐' },
  { id: 'vip2', top: 5, days: 10, kind: 'color', item: 'viphoang', name: 'Màu Hoàng Gia', icon: '💜' },
  { id: 'vip3', top: 3, days: 14, kind: 'frame', item: 'vipvuong', name: 'Khung Vương Giả', icon: '👑' },
  { id: 'vip4', top: 2, days: 21, kind: 'color', item: 'vipquang', name: 'Màu Cực Quang', icon: '🌌' },
  { id: 'vip5', top: 1, days: 30, kind: 'frame', item: 'viphuyen', name: 'Khung Huyền Thoại', icon: '🏆' },
];
export const VIP_WID = t => (t.kind === 'frame' ? 'frame:' : 'color:') + t.item;
export const VIP_WIDS = new Set(VIP_TIERS.map(VIP_WID));
/* P.vipTop (máy chủ lưu trong hồ sơ): { s: { vip1: { n, last }, ... }, got: ['vip1', ...] } — n = số ngày
   liên tục đã đếm, last = ngày VN cuối cùng đã đếm ('YYYY-MM-DD'), got = bậc đã nhận món. */
export const vipStreakOf = (vip, id) => { const s = vip && vip.s && vip.s[id]; return s && typeof s === 'object' ? Math.max(0, Math.floor(+s.n || 0)) : 0; };
export const vipGot = (vip, id) => !!(vip && Array.isArray(vip.got) && vip.got.includes(id));
/* tiến độ từng bậc cho Hồ sơ: { id, top, days, name, wid, icon, streak, left, got, inTop, todayCounts }
   left = còn bao nhiêu ngày nữa (đã tính cả hôm nay nếu hôm nay đang trong top mà chưa đồng bộ);
   todayCounts = hôm nay mà đồng bộ thì chuỗi +1. today = ngày VN 'YYYY-MM-DD' ('' = không biết hôm nay). */
export function vipProgress(vip, rank, today = '') {
  const r = Math.max(0, Math.floor(+rank || 0));
  const t = typeof today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(today) ? today : '';
  return VIP_TIERS.map(x => {
    const streak = vipStreakOf(vip, x.id), got = vipGot(vip, x.id);
    const inTop = r >= 1 && r <= x.top;
    const last = vip && vip.s && vip.s[x.id] && typeof vip.s[x.id].last === 'string' ? vip.s[x.id].last : '';
    const todayCounts = !got && inTop && !!t && last !== t;
    return { ...x, wid: VIP_WID(x), streak, left: got ? 0 : Math.max(0, x.days - streak - (todayCounts ? 1 : 0)), got, inTop, todayCounts };
  });
}
export const UNLOCK = {
  p10: { desc: 'Chơi 10 ván', ok: s => s.p >= 10 }, p50: { desc: 'Chơi 50 ván', ok: s => s.p >= 50 }, p200: { desc: 'Chơi 200 ván', ok: s => s.p >= 200 },
  w10: { desc: 'Thắng 10 ván', ok: s => s.w >= 10 }, w50: { desc: 'Thắng 50 ván', ok: s => s.w >= 50 }, w200: { desc: 'Thắng 200 ván', ok: s => s.w >= 200 },
  s5: { desc: 'Thắng 5 ván liên tiếp', ok: s => s.best >= 5 }, s10: { desc: 'Thắng 10 ván liên tiếp', ok: s => s.best >= 10 },
  k10: { desc: 'Chơi 10 game khác nhau', ok: s => s.kinds >= 10 }, k20: { desc: 'Chơi 20 game khác nhau', ok: s => s.kinds >= 20 },
  d7: { desc: 'Chơi vào 7 ngày khác nhau', ok: s => s.days >= 7 }, d30: { desc: 'Chơi vào 30 ngày khác nhau', ok: s => s.days >= 30 },
  night: { desc: 'Chơi xong một ván lúc nửa đêm', ok: s => !!s.night },
  top10: { desc: 'Lọt top 10 bảng xếp hạng (cần đăng nhập)', ok: s => s.rank >= 1 && s.rank <= 10 },
  /* 🏆 vật phẩm VIP (patch -143): mở bằng chuỗi ngày đứng top BXH — máy chủ là chuẩn (P.vipTop),
     st.vip lấy từ hồ sơ máy chủ qua extra.vip (xem statsFromTotals); không có dữ liệu vip thì chưa mở. */
  vip1: { desc: 'Top 10 liên tục 7 ngày', ok: s => vipStreakOf(s.vip, 'vip1') >= 7 },
  vip2: { desc: 'Top 5 liên tục 10 ngày', ok: s => vipStreakOf(s.vip, 'vip2') >= 10 },
  vip3: { desc: 'Top 3 liên tục 14 ngày', ok: s => vipStreakOf(s.vip, 'vip3') >= 14 },
  vip4: { desc: 'Top 2 liên tục 21 ngày', ok: s => vipStreakOf(s.vip, 'vip4') >= 21 },
  vip5: { desc: 'Top 1 liên tục 30 ngày', ok: s => vipStreakOf(s.vip, 'vip5') >= 30 },
  og: { desc: 'Lập tài khoản trong năm 2026', ok: s => s.created > 0 && s.created < Date.UTC(2027, 0, 1) },
  admin: { desc: 'Chỉ dành cho chủ sảnh', ok: s => !!s.admin }, /* đồ hầu gái / Giáng sinh riêng chỉ tài khoản chủ web dùng */
};
/* 👑 chủ sảnh = tài khoản đang giữ quyền chủ sảnh (máy chủ báo cờ owner trong pub(), patch -94 – không ghi cứng id nữa). Quản trị viên khác vẫn có quyền quản trị nhưng KHÔNG mang huy hiệu Chủ sảnh */
export const OWNER_ID = 1; /* mặc định/fallback: tài khoản đầu tiên */
export const isOwner = u => !!(u && u.admin && u.owner);
export const isOpen = (lock, st) => { if (!lock || (st && st.admin)) return true; /* chủ sảnh mở hết */ const u = UNLOCK[lock]; try { return !!(u && st && u.ok(st)); } catch (e) { return false; } };
export const lockDesc = lock => (UNLOCK[lock] || {}).desc || 'Chơi thêm';

/* ---------- nối với hệ thành tựu sẵn có (shared/ui/stats.js) – CHỈ ĐỌC, không sửa stats.js ----------
   totals() của stats.js đã trả { p, w, kinds, days, best, night, ... } nên map thẳng sang st.
   - created: stats.js không lưu ngày tạo tài khoản; load() có s.first = thời điểm chơi ván đầu tiên
     → statsFromLoad() dùng s.first làm created (gần đúng). Khi nối dây Hồ sơ, truyền created thật
     của tài khoản (auth.user().created) qua extra.created.
   - rank: stats.js không có hạng bảng xếp hạng → mặc định 0 (khoá top10). Khi nối dây, truyền hạng thật qua extra.rank.
   - admin: đọc từ tài khoản đang đăng nhập (localStorage 'gumballz-auth'); khách (chưa đăng nhập) = false. */
export function statsFromTotals(t = {}, extra = {}) {
  return {
    p: +t.p || 0, w: +t.w || 0, best: +t.best || 0, kinds: +t.kinds || 0,
    days: +t.days || 0, night: !!t.night, rank: +extra.rank || 0,
    created: +extra.created || 0, admin: !!extra.admin,
    vip: extra.vip && typeof extra.vip === 'object' ? extra.vip : null, /* 🏆 tiến độ VIP (P.vipTop) để xét khoá vip1..vip5 */
  };
}
export function statsFromLoad(s = {}, extra = {}) {
  let p = 0, w = 0, kinds = 0; const g = s.g || {};
  for (const k in g) { p += g[k].p || 0; w += g[k].w || 0; if (g[k].p) kinds++; }
  return statsFromTotals(
    { p, w, kinds, days: (s.days || []).length, best: s.best || 0, night: !!s.night },
    { created: s.first || 0, ...extra },
  );
}
/* cờ admin/chủ sảnh/nhà tài trợ của tài khoản đang đăng nhập trên máy này (đọc 'gumballz-auth', giống profile.js cũ) */
export function readAuthFlags() {
  try { const u = JSON.parse(localStorage.getItem('gumballz-auth') || 'null'); const me = u && u.user; return { admin: !!(me && me.admin), owner: isOwner(me), supporter: !!(me && me.supporter), vip: !!(me && me.vip), dev: !!(me && me.dev), role: me ? (me.role != null ? +me.role : (me.admin ? 2 : 0)) : 0, id: me ? +me.id || 0 : 0, created: (me && +me.created) || 0 }; } catch (e) { return { admin: false, owner: false, supporter: false, vip: false, dev: false, role: 0, id: 0, created: 0 }; }
}

/* khung avatar – vòng màu vẽ ở FRAME_RING (kích thước tổng vẫn = size, xem shared/css/avatar.css) */
export const FRAMES = [
  { id: '', name: 'Không khung' },
  { id: 'go', name: 'Gỗ', lock: 'p10' },
  { id: 'la', name: 'Lá non', lock: 'd7' },
  { id: 'bac', name: 'Bạc', lock: 'w10' },
  { id: 'dem', name: 'Đêm sao', lock: 'night' },
  { id: 'lua', name: 'Lửa', lock: 's5' },
  { id: 'cauvong', name: 'Cầu vồng', lock: 'k10' },
  { id: 'vang', name: 'Vàng', lock: 'w50' },
  { id: 'tim', name: 'Tím huyền bí', lock: 'top10' },
  { id: 'kimcuong', name: 'Kim cương', lock: 'w200' },
  { id: 'owner', name: 'Chủ web', lock: 'admin' },
  /* 🛍️ khung bán bằng xu ở Cửa hàng (shop: giá xu) / chỉ mở ra từ rương (chest) — mở khoá bằng ví, xem shared/ui/wallet.js */
  { id: 'sanho', name: 'Khung San Hô', shop: 150 },
  { id: 'rungxanh', name: 'Khung Rừng Xanh', shop: 200 },
  { id: 'bacha', name: 'Khung Bạc Hà', shop: 150 },
  { id: 'timmong', name: 'Khung Tím Mộng', shop: 250 },
  { id: 'bongbong', name: 'Khung Bong Bóng', chest: true },
  { id: 'saobang', name: 'Khung Sao Băng', chest: true },
  { id: 'keongot', name: 'Khung Mật Ngọt', chest: true },
  { id: 'hoanggia', name: 'Khung Hoàng Gia', chest: true },
  /* 🛍️ thêm 2026-11-21 (kiểu Nitro): khung thường bán bằng xu + khung động chỉ mở rương (cực hiếm) */
  { id: 'anhdao', name: 'Khung Anh Đào', shop: 200 },
  { id: 'saoxanh', name: 'Khung Sao Xanh', shop: 200 },
  { id: 'bienxanh', name: 'Khung Biển Xanh', shop: 150 },
  { id: 'hoanghon', name: 'Khung Hoàng Hôn', shop: 250 },
  { id: 'mattrang', name: 'Khung Mặt Trăng', shop: 200 },
  { id: 'rungthong', name: 'Khung Rừng Thông', shop: 150 },
  { id: 'camvang', name: 'Khung Cam Vàng', shop: 150 },
  { id: 'timsen', name: 'Khung Tím Sen', shop: 200 },
  { id: 'cauvongxoay', name: 'Khung Cầu Vồng Xoay', chest: true, anim: 'spin' },
  { id: 'luachay', name: 'Khung Lửa Cháy', chest: true, anim: 'glow' },
  { id: 'vangxoay', name: 'Khung Vàng Xoay', chest: true, anim: 'spin' },
  /* ✨ thêm 2026-11-21 (patch -123): 3 khung động chủ đề mới — chỉ mở ra từ rương (cực hiếm) */
  { id: 'vuongmien', name: 'Khung Vương Miện', chest: true, anim: 'spin' },
  { id: 'longphung', name: 'Khung Rồng Bay Phụng Múa', chest: true, anim: 'orbit' },
  { id: 'vuatrichoi', name: 'Khung Vua Trò Chơi', chest: true, anim: 'spin' },
  /* 🏆 thêm 2026-11-22 (patch -143): khung VIP — chỉ mở bằng chuỗi ngày đứng top BXH (lock vip1/vip3/vip5),
     KHÔNG bán bằng xu, KHÔNG mở ra từ rương, KHÔNG cấp tay được (máy chủ chặn ở nhánh grant). */
  { id: 'vipsao', name: 'Khung Ngôi Sao', lock: 'vip1' },
  { id: 'vipvuong', name: 'Khung Vương Giả', lock: 'vip3' },
  { id: 'viphuyen', name: 'Khung Huyền Thoại', lock: 'vip5', anim: 'spin' },
];
/* gradient của từng vòng khung (dùng làm background của .pf-fr trong shared/css/avatar.css) */
export const FRAME_RING = {
  go: 'linear-gradient(135deg,#c08850,#6e4423)', la: 'conic-gradient(#7fe0a4,#2a9d5c,#bdf2cf,#2a9d5c,#7fe0a4)', bac: 'linear-gradient(135deg,#ffffff,#9aa0b2 45%,#e8ebf2 60%,#7d8396)',
  dem: 'radial-gradient(circle at 30% 25%,#fff 0 1.5px,transparent 2px),radial-gradient(circle at 75% 70%,#fff 0 1.2px,transparent 1.8px),linear-gradient(135deg,#4b3aa0,#1b1440)',
  lua: 'conic-gradient(#ff3d3d,#ff9a1f,#ffd23d,#ff6a1f,#ff3d3d)', cauvong: 'conic-gradient(#ff4d6a,#ffb23d,#ffe066,#2fc76f,#3d8bff,#8a5cff,#ff4d6a)',
  vang: 'conic-gradient(#fff2b3,#e0a612,#ffd84a,#b8780a,#fff2b3)', tim: 'conic-gradient(#b06bff,#ff5fa2,#6a35e0,#ff5fa2,#b06bff)', owner: 'conic-gradient(#ff3d5a,#ffd84a,#ff7a45,#fff2b3,#ff3d5a)', kimcuong: 'conic-gradient(#e8fbff,#7fd8ff,#ffffff,#b9a8ff,#e8fbff,#7fd8ff,#ffffff)',
  sanho: 'linear-gradient(135deg,#ff8a7a,#ff5fa2,#ffb23d)', rungxanh: 'linear-gradient(135deg,#2a9d5c,#0b4a3c,#7fe0a4)', bacha: 'linear-gradient(135deg,#a8e6cf,#5ec8a8,#d0f0e4)', timmong: 'conic-gradient(#b06bff,#ff5fa2,#6a35e0,#c9bdf3,#b06bff)',
  bongbong: 'radial-gradient(circle at 30% 30%,#fff 0 2px,transparent 3px),radial-gradient(circle at 70% 60%,#fff 0 1.5px,transparent 2.5px),linear-gradient(135deg,#7fd8ff,#3d8bff,#b9a8ff)', saobang: 'linear-gradient(135deg,#1b1440,#4b3aa0,#ff9a3d)', keongot: 'conic-gradient(#ff9ecf,#ffb23d,#ffe066,#ff9ecf)', hoanggia: 'conic-gradient(#fff2b3,#e0a612,#ffd84a,#b8780a,#fff2b3,#e0a612,#ffd84a)',
  anhdao: 'linear-gradient(135deg,#ffb7c5,#ff5fa2,#ffd6ea)', saoxanh: 'radial-gradient(circle at 30% 25%,#fff 0 1.5px,transparent 2px),radial-gradient(circle at 70% 65%,#fff 0 1.2px,transparent 1.8px),linear-gradient(135deg,#0b3d66,#2ec5b6,#7fd8ff)', bienxanh: 'linear-gradient(135deg,#1f5fd6,#2ec5b6,#7fd8ff)', hoanghon: 'linear-gradient(135deg,#ff9a3d,#ff4d6a,#b06bff)', mattrang: 'radial-gradient(circle at 68% 28%,#fff 0 6px,transparent 7px),linear-gradient(135deg,#e8ebf2,#9aa0b2,#ffffff)', rungthong: 'linear-gradient(135deg,#14532d,#2a9d5c,#a7f3d0)', camvang: 'linear-gradient(135deg,#ff9a3d,#ffd84a,#ff6a1f)', timsen: 'conic-gradient(#e9d5ff,#b06bff,#ff5fa2,#e9d5ff)',
  cauvongxoay: 'conic-gradient(#ff4d6a,#ffb23d,#ffe066,#2fc76f,#3d8bff,#8a5cff,#ff4d6a)', luachay: 'conic-gradient(#ff3d3d,#ff9a1f,#ffd23d,#ff6a1f,#ff3d3d)', vangxoay: 'conic-gradient(#fff2b3,#e0a612,#ffd84a,#b8780a,#fff2b3)',
  /* ✨ -123: vàng kim + đỏ hoàng gia (vương miện), đỏ + vàng + teal (rồng/phụng), vàng + đỏ hoàng gia (vua trò chơi) */
  vuongmien: 'conic-gradient(#fff2b3,#e0a612,#ffd84a,#b8780a,#d4202f,#ffd84a,#fff2b3)', longphung: 'conic-gradient(#ff3d3d,#ffb23d,#ffd84a,#2ec5b6,#ff5fa2,#ff3d3d)', vuatrichoi: 'conic-gradient(#ffd84a,#d4202f,#b8780a,#ff9a3d,#ffd84a,#d4202f,#ffd84a)',
  /* 🏆 -143: vàng sao (ngôi sao top 10), tím + vàng hoàng gia (vương giả top 10 · 14 ngày), đa sắc huyền thoại (top 1 · 30 ngày) */
  vipsao: 'radial-gradient(circle at 30% 25%,#fff 0 1.5px,transparent 2px),radial-gradient(circle at 70% 65%,#fff 0 1.2px,transparent 1.8px),conic-gradient(#fff2b3,#e0a612,#ffd84a,#b8780a,#fff2b3)',
  vipvuong: 'conic-gradient(#b06bff,#ffd84a,#6a35e0,#e0a612,#b06bff,#ffd84a,#6a35e0)',
  viphuyen: 'conic-gradient(#ffd84a,#ff3d5a,#b06bff,#3d8bff,#2ec5b6,#ffd84a,#fff2b3,#ffd84a)',
};
/* màu tên – đủ đậm để đọc được trên nền kem */
export const NAME_COLORS = [
  { id: '', name: 'Mặc định' },
  { id: 'cam', name: 'Cam', lock: 'p10', css: 'color:#d2491c' },
  { id: 'xanh', name: 'Xanh biển', lock: 'd7', css: 'color:#1f5fd6' },
  { id: 'la', name: 'Xanh lá', lock: 'k10', css: 'color:#16834a' },
  { id: 'tim', name: 'Tím', lock: 'w10', css: 'color:#6a35e0' },
  { id: 'hong', name: 'Hồng', lock: 'p50', css: 'color:#c8246b' },
  { id: 'vang', name: 'Vàng kim', lock: 'w50', css: 'background:linear-gradient(90deg,#b8780a,#e09a12,#b8780a);-webkit-background-clip:text;background-clip:text;color:transparent' },
  { id: 'lua', name: 'Lửa', lock: 's10', css: 'background:linear-gradient(90deg,#d4202f,#e8650f);-webkit-background-clip:text;background-clip:text;color:transparent' },
  { id: 'owner', name: 'Chủ web', lock: 'admin', css: 'background:linear-gradient(90deg,#d4202f,#e8650f,#b8780a,#d4202f);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none' },
  { id: 'cauvong', name: 'Cầu vồng', lock: 'k20', css: 'background:linear-gradient(90deg,#d4202f,#d97706,#16834a,#1f5fd6,#7c3aed);-webkit-background-clip:text;background-clip:text;color:transparent' },
  /* 🛍️ màu tên bán bằng xu / chỉ mở ra từ rương */
  { id: 'ngoc', name: 'Xanh Ngọc', shop: 150, css: 'color:#0e7490' },
  { id: 'dodo', name: 'Đỏ Đô', shop: 150, css: 'color:#8a1d1d' },
  { id: 'chanh', name: 'Vàng Chanh', shop: 200, css: 'color:#a16207' },
  { id: 'song', name: 'Sóng Biển', chest: true, css: 'background:linear-gradient(90deg,#0e7490,#2563eb);-webkit-background-clip:text;background-clip:text;color:transparent' },
  { id: 'daquang', name: 'Dạ Quang', chest: true, css: 'background:linear-gradient(90deg,#15803d,#65a30d,#ca8a04);-webkit-background-clip:text;background-clip:text;color:transparent' },
  /* 🛍️ thêm 2026-11-21: màu tên thường bán bằng xu */
  { id: 'hongsam', name: 'Hồng Sẫm', shop: 150, css: 'color:#b3124f' },
  { id: 'camchay', name: 'Cam Cháy', shop: 150, css: 'color:#c2410c' },
  { id: 'xanhreu', name: 'Xanh Rêu', shop: 150, css: 'color:#3f6212' },
  { id: 'duong', name: 'Xanh Dương', shop: 150, css: 'color:#1d4ed8' },
  { id: 'cham', name: 'Xanh Chàm', shop: 150, css: 'color:#3730a3' },
  { id: 'nau', name: 'Nâu Đất', shop: 150, css: 'color:#7c2d12' },
  { id: 'xam', name: 'Xám Đá', shop: 150, css: 'color:#475569' },
  { id: 'vomo', name: 'Vàng Mơ', shop: 200, css: 'color:#b45309' },
  { id: 'luc', name: 'Xanh Lục', shop: 150, css: 'color:#15803d' },
  { id: 'do', name: 'Đỏ Tươi', shop: 150, css: 'color:#dc2626' },
  /* ✨ tên động kiểu Nitro: gradient chạy trên chữ — chỉ mở ra từ rương (cực hiếm), anim: 1 = chạy gradient */
  { id: 'cauvongchay', name: 'Cầu Vồng Chạy', chest: true, anim: 1, css: 'background:linear-gradient(90deg,#d4202f,#d97706,#16834a,#1f5fd6,#7c3aed,#d4202f);-webkit-background-clip:text;background-clip:text;color:transparent;background-size:200% auto' },
  { id: 'vanglaplanh', name: 'Vàng Lấp Lánh', chest: true, anim: 1, css: 'background:linear-gradient(90deg,#b8780a,#ffd84a,#fff2b3,#e0a612,#b8780a);-webkit-background-clip:text;background-clip:text;color:transparent;background-size:200% auto' },
  { id: 'timxanhchay', name: 'Tím Xanh Chạy', chest: true, anim: 1, css: 'background:linear-gradient(90deg,#6a35e0,#3d8bff,#2ec5b6,#b06bff,#6a35e0);-webkit-background-clip:text;background-clip:text;color:transparent;background-size:200% auto' },
  /* 🏆 thêm 2026-11-22 (patch -143): màu tên VIP — chỉ mở bằng chuỗi ngày đứng top BXH (lock vip2/vip4),
     KHÔNG bán bằng xu, KHÔNG mở ra từ rương, KHÔNG cấp tay được (máy chủ chặn ở nhánh grant). */
  { id: 'viphoang', name: 'Màu Hoàng Gia', lock: 'vip2', css: 'background:linear-gradient(90deg,#6a35e0,#b06bff,#ffd84a);-webkit-background-clip:text;background-clip:text;color:transparent' },
  { id: 'vipquang', name: 'Màu Cực Quang', lock: 'vip4', anim: 1, css: 'background:linear-gradient(90deg,#2ec5b6,#3d8bff,#b06bff,#ff5fa2,#2ec5b6);-webkit-background-clip:text;background-clip:text;color:transparent;background-size:200% auto' },
];

/* 🎏 banner hồ sơ kiểu Nitro: dải màu trên đầu hộp Hồ sơ (trường b trong nhân vật).
   shop = bán bằng xu; chest = chỉ mở ra từ rương (cực hiếm); anim: 1 = gradient chạy. */
export const BANNERS = [
  { id: '', name: 'Không banner' },
  { id: 'bnhoanghon', name: 'Hoàng Hôn', shop: 200, css: 'linear-gradient(90deg,#ff9a3d,#ff4d6a,#b06bff)' },
  { id: 'bnbienxanh', name: 'Biển Xanh', shop: 200, css: 'linear-gradient(90deg,#1f5fd6,#2ec5b6,#7fd8ff)' },
  { id: 'bnsaodem', name: 'Sao Đêm', shop: 200, css: 'radial-gradient(circle at 30% 25%,#fff 0 1.5px,transparent 2px),linear-gradient(135deg,#4b3aa0,#1b1440,#2ec5b6)' },
  { id: 'bncauvong', name: 'Cầu Vồng Chạy', chest: true, anim: 1, css: 'linear-gradient(90deg,#ff4d6a,#ffb23d,#ffe066,#2fc76f,#3d8bff,#8a5cff,#ff4d6a)' },
  { id: 'bnvangchay', name: 'Vàng Chảy', chest: true, anim: 1, css: 'linear-gradient(90deg,#b8780a,#ffd84a,#fff2b3,#e0a612,#b8780a)' },
];
/* tiện ích: css + có động không của màu tên / banner / khung theo id (dùng ở hồ sơ, xếp hạng, chat, cửa hàng) */
export const nameCss = n => { const c = NAME_COLORS.find(x => x.id && x.id === n); return c ? c.css || '' : ''; };
export const nameAnim = n => { const c = NAME_COLORS.find(x => x.id && x.id === n); return !!(c && c.anim); };
export const bannerCss = b => { const x = BANNERS.find(x => x.id && x.id === b); return x ? x.css || '' : ''; };
export const bannerAnim = b => { const x = BANNERS.find(x => x.id && x.id === b); return !!(x && x.anim); };
export const frameAnim = f => { const x = FRAMES.find(x => x.id && x.id === f); return x ? x.anim || '' : ''; };
/* hiệu ứng khi thắng ván (chỉ hiện trên máy mình) – hình ở shared/ui/winfx.js */
export const WIN_FX = [
  { id: 'giay', name: 'Pháo giấy', icon: '🎉' },
  { id: 'sao', name: 'Mưa sao', icon: '⭐', lock: 'w10' },
  { id: 'tim', name: 'Tim bay', icon: '💖', lock: 'd7' },
  { id: 'xu', name: 'Mưa xu', icon: '🪙', lock: 's5' },
  { id: 'phao', name: 'Pháo hoa', icon: '🎆', lock: 'w50' },
  { id: 'off', name: 'Tắt hiệu ứng', icon: '🚫' },
];

/* món đồ hiếm của nhân vật: { mục: { giá trị: khoá } } – chưa mở thì không dùng được (máy chủ đổi về 'none') */
export const CHAR_LOCKS = { hat: { halo: 's5', maidband: 'admin', antlers: 'admin' }, outfit: { maid: 'admin' }, acc: { medal: 'w10', wings: 'w50', gift: 'admin', sack: 'admin' } };
/* mẫu dựng sẵn có món đã khoá thì ẩn / không cho chọn — trúng rương mở sớm thì mẫu cũng mở sớm */
export const charOpen = (cfg, st, parts) => !!cfg && Object.keys(cfg).every(k => { const l = charLock(k, cfg[k]); if (!l || isOpen(l, st)) return true; const set = parts || readParts(); return set.includes(partId(k, cfg[k])); });
/* 🎁 Lộ trình thưởng kiểu Muse Dash: điểm kinh nghiệm = ván × 10 + thắng × 20 (cùng công thức cấp độ ở stats.js level());
   mỗi mốc mở 1 món của nhân vật. Mốc đầu gần (~2 ván), càng về sau càng xa. Đồ có từ trước ngày 17/11/2026 vẫn mở sẵn. */
export const TRACK = [
  ['hat', 'beanie'], ['outfit', 'hoodie'], ['acc', 'boba'], ['hair', 'bob'], ['hat', 'catband'], ['outfit', 'sweater'], ['acc', 'roundglasses'], ['kind', 'rabbit'],
  ['outfit', 'pajama'], ['hat', 'flower'], ['acc', 'bowtie'], ['hair', 'twintails'], ['outfit', 'school'], ['acc', 'lantern'], ['hat', 'beret'], ['outfit', 'overalls'],
  ['kind', 'bear'], ['acc', 'mask'], ['outfit', 'raincoat'], ['hat', 'party'], ['hair', 'curly'], ['outfit', 'aoba'], ['acc', 'balloon'], ['outfit', 'doctor'],
  ['hat', 'gradcap'], ['acc', 'book'], ['outfit', 'karate'], ['hat', 'santa'], ['outfit', 'santa'], ['acc', 'eyepatch'], ['outfit', 'firefighter'], ['hat', 'firehat'],
  ['acc', 'guitar'], ['outfit', 'ninja'], ['hat', 'pirate'], ['outfit', 'pirate'], ['acc', 'sword'], ['outfit', 'cape'], ['hat', 'wizard'], ['outfit', 'robe'],
  ['acc', 'flag'], ['outfit', 'astronaut'], ['hat', 'astro'], ['outfit', 'knight'], ['outfit', 'dino'],
].map(([k, v], i) => ({ k, v, xp: Math.round(30 * (i + 1) + 2.2 * i * i) }));
export const xpOf = s => (s ? (s.xp != null ? +s.xp || 0 : (+s.p || 0) * 10 + (+s.w || 0) * 20) : 0);
TRACK.forEach((r, i) => { UNLOCK['r' + i] = { desc: `Mốc thưởng ${i + 1} (${r.xp} điểm kinh nghiệm)`, ok: s => xpOf(s) >= r.xp }; });

/* ---------- mở khoá linh kiện theo CẤP (2026-11-21, Nguyễn dặn: lên cấp tự mở linh kiện) ----------
   Cấp từ XP: lv = floor(sqrt(xp/50)) + 1 (cùng công thức level() ở stats.js) → cấp 2: 50 XP, 3: 200, 4: 450,
   5: 800, 6: 1250, 7: 1800, 8: 2450, 9: 3200, 10: 4050. Mỗi cấp mở 1–2 món, rải đều tóc → nón/đồ → phụ kiện/sừng.
   Món cơ bản (kiểu Người, tóc ngắn, áo thun, không nón/phụ kiện/sừng, toàn bộ màu tóc/màu chủ đạo/màu da) KHÔNG khoá.
   Linh kiện trúng từ rương Gacha mở SỚM hơn cấp (xem gachaParts bên dưới) — tới cấp thì vẫn tự mở đúng món. */
export const xpLevel = xp => Math.min(10, Math.floor(Math.sqrt(Math.max(0, +xp || 0) / 50)) + 1);
export const LOCKED_PARTS = [
  { k: 'hair', v: 'spiky', lv: 2 }, { k: 'hair', v: 'ponytail', lv: 2 },
  { k: 'hat', v: 'cap', lv: 3 }, { k: 'acc', v: 'scarf', lv: 3 },
  { k: 'outfit', v: 'jersey', lv: 4 }, { k: 'hair', v: 'wavy', lv: 4 },
  { k: 'hat', v: 'cowboy', lv: 5 }, { k: 'acc', v: 'backpack', lv: 5 },
  { k: 'outfit', v: 'aodai', lv: 6 }, { k: 'kind', v: 'fox', lv: 6 },
  { k: 'hat', v: 'crown', lv: 7 }, { k: 'acc', v: 'moneybag', lv: 7 },
  { k: 'outfit', v: 'mecha', lv: 8 }, { k: 'hair', v: 'quiff', lv: 8 },
  { k: 'kind', v: 'frog', lv: 9 }, { k: 'horns', v: 'bull', lv: 9 },
  { k: 'acc', v: 'foxtails', lv: 10 }, { k: 'horns', v: 'devil', lv: 10 },
];
export const partId = (k, v) => k + ':' + v;
export const PART_IDS = new Set(LOCKED_PARTS.map(p => partId(p.k, p.v)));
export const isKnownPart = id => PART_IDS.has(id);
export const levelLockOf = (k, v) => { const p = LOCKED_PARTS.find(x => x.k === k && x.v === v); return p ? p.lv : 0; };
for (let lv = 2; lv <= 10; lv++) UNLOCK['lv' + lv] = { desc: 'Đạt cấp ' + lv, ok: s => xpLevel(xpOf(s)) >= lv };
/* linh kiện trúng từ rương Gacha (mở sớm hơn cấp): lưu ở 'gumballz-parts', đồng bộ lên tài khoản (P.parts).
   Chỉ id trong LOCKED_PARTS mới được lưu — id lạ bị loại ở đây và ở máy chủ. */
const PARTS_KEY = 'gumballz-parts';
export function readParts() { try { if (typeof localStorage === 'undefined') return []; const a = JSON.parse(localStorage.getItem(PARTS_KEY)); return Array.isArray(a) ? [...new Set(a.filter(x => typeof x === 'string' && isKnownPart(x)))] : []; } catch (e) { return []; } }
export function writeParts(list) { try { if (typeof localStorage === 'undefined') return; localStorage.setItem(PARTS_KEY, JSON.stringify([...new Set((list || []).filter(x => typeof x === 'string' && isKnownPart(x)))])); } catch (e) {} }
export function hasGachaPart(k, v) { return readParts().includes(partId(k, v)); }
export function grantGachaPart(id) { if (!isKnownPart(id)) return false; const cur = readParts(); if (cur.includes(id)) return false; writeParts([...cur, id]); try { if (typeof dispatchEvent !== 'undefined') dispatchEvent(new CustomEvent('gumballz-parts')); } catch (e) {} return true; }
/* món đã mở chưa: không khoá theo cấp → mở; đủ cấp → mở; trúng rương → mở sớm */
export function partOpen(id, xp, parts) { const p = LOCKED_PARTS.find(x => partId(x.k, x.v) === id); if (!p) return true; if (xpLevel(xp) >= p.lv) return true; const set = parts || readParts(); return set.includes(id); }
/* cấp thấp nhất để dùng được 1 mẫu dựng sẵn (mẫu có món khoá theo cấp / mốc thưởng thì cần cấp tương ứng) */
export function presetMinLevel(cfg) {
  let need = 1;
  if (!cfg) return need;
  for (const k of Object.keys(cfg)) {
    const l = charLock(k, cfg[k]);
    if (!l) continue;
    if (l.startsWith('lv')) need = Math.max(need, +l.slice(2) || 1);
    else if (l.startsWith('r')) { const r = TRACK[+l.slice(1)]; if (r) need = Math.max(need, xpLevel(r.xp)); }
  }
  return need;
}
export const charLock = (k, v) => (CHAR_LOCKS[k] && CHAR_LOCKS[k][v]) || (() => { const lv = levelLockOf(k, v); if (lv) return 'lv' + lv; const i = TRACK.findIndex(r => r.k === k && r.v === v); return i < 0 ? '' : 'r' + i; })();

/* ---------- tiện ích cho giao diện ---------- */
const KIND_LABEL = { kind: '🐾 Nhân vật', hair: '💇 Tóc', hat: '🎩 Nón', outfit: '👕 Trang phục', acc: '🎒 Phụ kiện' };
export const itemLabel = (k, v) => {
  const list = OPTIONS[k] || []; const hit = list.find(o => Array.isArray(o) ? o[0] === v : o === v);
  return (KIND_LABEL[k] || k) + ' · ' + (Array.isArray(hit) ? hit[1] : (hit || v));
};
/* tiến độ lộ trình: { xp, opened: số mốc đã mở, next: mốc tiếp theo (null nếu mở hết), items: [{i,k,v,xp,open,label}] } */
export function trackProgress(st) {
  const xp = xpOf(st); let opened = 0;
  const items = TRACK.map((r, i) => { const open = xp >= r.xp; if (open) opened++; return { i, k: r.k, v: r.v, xp: r.xp, open, label: itemLabel(r.k, r.v) }; });
  return { xp, opened, total: TRACK.length, next: items.find(x => !x.open) || null, items };
}

/* ---------- lọc "diện mạo" theo những gì đã mở khoá (Hồ sơ gọi trước khi vẽ; máy chủ không gọi) ---------- */
export function cleanLook(av, st, parts, ownWids) {
  if (!av || typeof av !== 'object') return null;
  const fr = FRAMES.find(x => x.id === av.f && x.id), nc = NAME_COLORS.find(x => x.id === av.n && x.id), bn = BANNERS.find(x => x.id === av.b && x.id);
  const own = Array.isArray(ownWids) ? ownWids : []; /* 🎁 món được cấp tay (patch -131): giữ dù chưa đủ thành tích — file này server cũng import nên chỉ nhận qua tham số, không đọc localStorage */
  const out = { e: typeof av.e === 'string' ? av.e.slice(0, 12) : '', c: Math.max(0, Math.min(40, Math.floor(+av.c || 0))), f: fr && (isOpen(fr.lock, st) || own.includes('frame:' + fr.id)) ? fr.id : '', n: nc && (isOpen(nc.lock, st) || own.includes('color:' + nc.id)) ? nc.id : '', b: bn ? bn.id : '' };
  if (av.ch && typeof av.ch === 'object') { const ch = cleanChar(av.ch), base = cleanChar({}); const set = parts || readParts(); for (const k of Object.keys(ch)) { const l = charLock(k, ch[k]); if (l && !isOpen(l, st) && !set.includes(partId(k, ch[k]))) ch[k] = k === 'hat' || k === 'acc' || k === 'horns' ? 'none' : base[k]; } out.ch = ch; }
  return out;
}

/* ---------- GHI CHÚ NỐI DÂY (điều phối viên giữ – file này KHÔNG tự sửa các file dưới đây) ----------
   1. shared/ui/profile.js (hiện vẫn là bản emoji cũ): để Hồ sơ có tab 🧸 Nhân vật / 🎁 Lộ trình thưởng /
      🖼️ Khung / ✍️ Màu tên / 🎉 Khi thắng như shared/ui/profile.js, cần thay avatar()/avatarHTML()/
      profileCss()/openProfile() bằng bản dùng file này + avatar-opts.js + avatar3d.js. Cụ thể:
      - avatar(): đọc localStorage 'gumballz-avatar' (đã là key của repo này); nếu có trường kind → { ...a, e:'ch', ch: cleanChar(a) };
        người mới: nhân vật ngẫu nhiên trong PRESETS.filter(p => !adminOnly(p)).
      - avatarHTML(size, a): nếu a.ch → <img data-cb="JSON nhân vật" data-sz> vẽ bằng portrait(ch, size, 'av')
        (hydrate lười, cache localStorage 'gumballz-av-cache'); khung: bọc <span class="pf-fr"
        style="background:${FRAME_RING[a.f]}">, nhân vật nằm gọn trong vòng tròn (xem shared/css/avatar.css).
      - openProfile(): thêm 5 tab như trên; tab lộ trình dùng trackProgress(statsFromTotals(totals()));
        tab khung/màu tên dùng FRAMES/NAME_COLORS + isOpen(lock, st); tab hiệu ứng dùng WIN_FX,
        chọn xong lưu localStorage 'gumballz-winfx'; đổi đồ lưu vào 'gumballz-avatar' + dispatch 'gumballz-avatar'.
      - nameStyle(n): trả NAME_COLORS.find(x => x.id === n)?.css || ''; ownerBadge(true) = '👑 Chủ web'
        (chỉ khi isOwner(auth.user())); profileCss(): thay bằng <link> tới shared/css/avatar.css (file mới này).
   2. shared/ui/stats.js: KHÔNG cần sửa – chỉ cần import { load, totals } từ đó khi gọi statsFromTotals(totals()).
      Muốn hiệu ứng thắng tự chạy khi thắng ván: stats.js đã dispatch sự kiện 'gumballz-stats' { won: true }
      sau mỗi ván (record()); shared/ui/winfx.js (file mới) tự nghe sự kiện này, KHÔNG cần sửa stats.js.
      Muốn khoá 'og' (tài khoản lập năm 2026) chính xác: truyền extra.created = auth.user().created (nếu có)
      vào statsFromTotals(); mặc định dùng s.first (ván đầu tiên) nên tài khoản lập 2026 nhưng chơi ván đầu
      năm 2027 sẽ không mở – chấp nhận được cho tới khi nối dây.
      Muốn khoá 'top10' (lọt top 10 BXH): truyền extra.rank = hạng thật trên bảng xếp hạng vào statsFromTotals();
      mặc định rank = 0 (khoá).
   3. shared/ui/account.js: KHÔNG cần sửa – mountAccount() đã gọi profileCss() + openProfile() từ profile.js;
      sau khi profile.js được nối dây (mục 1) thì nút tài khoản tự hiện khung/màu tên mới. Chỉ cần chắc
      profileCss() mới nạp shared/css/avatar.css (xem mục 1).
   4. server/*: KHÔNG cần sửa ở đợt này – khi nào máy chủ phòng muốn kiểm nhân vật người khác gửi lên thì
      dùng cleanLook(av, st) + charLock() trong file này (st lấy từ statOf của máy chủ). */
