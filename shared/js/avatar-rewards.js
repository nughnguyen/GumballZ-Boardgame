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
const gw = (s, g) => (s.g && s.g[g] && +s.g[g].w) || 0;
export const UNLOCK = {
  p10: { desc: 'Chơi 10 ván', ok: s => s.p >= 10 }, p50: { desc: 'Chơi 50 ván', ok: s => s.p >= 50 }, p200: { desc: 'Chơi 200 ván', ok: s => s.p >= 200 },
  w10: { desc: 'Thắng 10 ván', ok: s => s.w >= 10 }, w50: { desc: 'Thắng 50 ván', ok: s => s.w >= 50 }, w200: { desc: 'Thắng 200 ván', ok: s => s.w >= 200 },
  s5: { desc: 'Thắng 5 ván liên tiếp', ok: s => s.best >= 5 }, s10: { desc: 'Thắng 10 ván liên tiếp', ok: s => s.best >= 10 },
  k10: { desc: 'Chơi 10 game khác nhau', ok: s => s.kinds >= 10 }, k20: { desc: 'Chơi 20 game khác nhau', ok: s => s.kinds >= 20 },
  d7: { desc: 'Chơi vào 7 ngày khác nhau', ok: s => s.days >= 7 }, d30: { desc: 'Chơi vào 30 ngày khác nhau', ok: s => s.days >= 30 },
  night: { desc: 'Chơi xong một ván lúc nửa đêm', ok: s => !!s.night },
  top10: { desc: 'Lọt top 10 bảng xếp hạng (cần đăng nhập)', ok: s => s.rank >= 1 && s.rank <= 10 },
  /* 🖼️ thêm 2026-11-22 (patch -147): lock mới cho 47 khung avatar */
  p1: { desc: 'Chơi 1 ván', ok: s => s.p >= 1 }, w1: { desc: 'Thắng 1 ván', ok: s => s.w >= 1 }, d3: { desc: 'Chơi vào 3 ngày khác nhau', ok: s => s.days >= 3 }, p20: { desc: 'Chơi 20 ván', ok: s => s.p >= 20 }, k3: { desc: 'Chơi 3 game khác nhau', ok: s => s.kinds >= 3 }, k5: { desc: 'Chơi 5 game khác nhau', ok: s => s.kinds >= 5 }, w25: { desc: 'Thắng 25 ván', ok: s => s.w >= 25 }, w30: { desc: 'Thắng 30 ván', ok: s => s.w >= 30 }, w60: { desc: 'Thắng 60 ván', ok: s => s.w >= 60 }, w80: { desc: 'Thắng 80 ván', ok: s => s.w >= 80 }, w100: { desc: 'Thắng 100 ván', ok: s => s.w >= 100 }, w300: { desc: 'Thắng 300 ván', ok: s => s.w >= 300 }, w400: { desc: 'Thắng 400 ván', ok: s => s.w >= 400 }, w500: { desc: 'Thắng 500 ván', ok: s => s.w >= 500 }, w700: { desc: 'Thắng 700 ván', ok: s => s.w >= 700 }, w800: { desc: 'Thắng 800 ván', ok: s => s.w >= 800 }, w1000: { desc: 'Thắng 1000 ván', ok: s => s.w >= 1000 }, w1500: { desc: 'Thắng 1500 ván', ok: s => s.w >= 1500 }, s8: { desc: 'Thắng 8 ván liên tiếp', ok: s => s.best >= 8 }, d14: { desc: 'Chơi vào 14 ngày khác nhau', ok: s => s.days >= 14 }, k25: { desc: 'Chơi 25 game khác nhau', ok: s => s.kinds >= 25 }, top5: { desc: 'Top 5 bảng xếp hạng', ok: s => s.rank >= 1 && s.rank <= 5 }, top3: { desc: 'Top 3 bảng xếp hạng', ok: s => s.rank >= 1 && s.rank <= 3 }, event: { desc: 'Chỉ mở trong dịp sự kiện (Quản trị cấp tay)', ok: () => false },
  w10chess: { desc: 'Thắng 10 ván cờ (Cờ Vua + Cờ Tướng)', ok: s => gw(s, 'covua') + gw(s, 'cotuong') >= 10 },
  w20card: { desc: 'Thắng 20 ván game bài', ok: s => ['bacao', 'baitan', 'catte', 'chan', 'daochinh', 'hanabi', 'hoisanquai', 'lieng', 'loveletter', 'maubinh', 'memory', 'poker', 'saboteur', 'sam', 'skull', 'solitaire', 'sushigo', 'tala', 'tienlen', 'totom', 'tusac', 'uno', 'xidach', 'xiecthu', 'xito'].reduce((a, g) => a + gw(s, g), 0) >= 20 },
  w30meono: { desc: 'Thắng 30 ván Mèo Nổ', ok: s => gw(s, 'meono') >= 30 }, w20masoi: { desc: 'Thắng 20 ván Ma Sói', ok: s => gw(s, 'masoi') >= 20 }, w10camel: { desc: 'Thắng 10 ván Đua Lạc Đà', ok: s => gw(s, 'camel') >= 10 }, w5typhu: { desc: 'Thắng 5 ván Cờ Tỷ Phú', ok: s => gw(s, 'typhu') >= 5 },
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
/* 🖼️ phân loại khung (patch -147): tier 0-2 = Cùi, 3-4 = VIP; cat + theme để lọc/sắp xếp trong Hồ sơ */
export const tierName = t => t >= 3 ? 'VIP' : t === 2 ? 'Hiếm' : 'Cùi';
export const CAT_LABEL = { event: '🎉 Sự kiện', theme: '🎨 Chủ đề', task: '🎯 Nhiệm vụ', shop: '🛍️ Cửa hàng', gacha: '🎲 Gacha', vip: '👑 VIP' };
export const THEMES = ['Cơ Bản', 'Thiên Nhiên', 'Đông Phương', 'Thần Thoại', 'Game', 'Biển', 'Lễ Hội', 'Vũ Trụ', 'Tương Lai'];

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
    g: (t.g && typeof t.g === 'object') ? t.g : {},
  };
}
export function statsFromLoad(s = {}, extra = {}) {
  let p = 0, w = 0, kinds = 0; const g = s.g || {};
  for (const k in g) { p += g[k].p || 0; w += g[k].w || 0; if (g[k].p) kinds++; }
  return statsFromTotals(
    { p, w, kinds, days: (s.days || []).length, best: s.best || 0, night: !!s.night, g: s.g || {} },
    { created: s.first || 0, ...extra },
  );
}
/* cờ admin/chủ sảnh/nhà tài trợ của tài khoản đang đăng nhập trên máy này (đọc 'gumballz-auth', giống profile.js cũ) */
export function readAuthFlags() {
  try { const u = JSON.parse(localStorage.getItem('gumballz-auth') || 'null'); const me = u && u.user; return { admin: !!(me && me.admin), owner: isOwner(me), supporter: !!(me && me.supporter), vip: !!(me && me.vip), dev: !!(me && me.dev), role: me ? (me.role != null ? +me.role : (me.admin ? 2 : 0)) : 0, id: me ? +me.id || 0 : 0, created: (me && +me.created) || 0 }; } catch (e) { return { admin: false, owner: false, supporter: false, vip: false, dev: false, role: 0, id: 0, created: 0 }; }
}

/* khung avatar – vòng màu vẽ ở FRAME_RING (kích thước tổng vẫn = size, xem shared/css/avatar.css) */
export const FRAMES = [
  { id: '', name: 'Không khung', tier: 0, cat: 'task', theme: 'Cơ Bản' },
  { id: 'go', name: 'Gỗ', lock: 'p10', tier: 0, cat: 'task', theme: 'Cơ Bản' },
  { id: 'la', name: 'Lá non', lock: 'd7', tier: 0, cat: 'task', theme: 'Thiên Nhiên' },
  { id: 'bac', name: 'Bạc', lock: 'w10', tier: 0, cat: 'task', theme: 'Cơ Bản' },
  { id: 'dem', name: 'Đêm sao', lock: 'night', tier: 1, cat: 'task', theme: 'Vũ Trụ' },
  { id: 'lua', name: 'Lửa', lock: 's5', tier: 1, cat: 'task', theme: 'Thiên Nhiên' },
  { id: 'cauvong', name: 'Cầu vồng', lock: 'k10', tier: 1, cat: 'task', theme: 'Thiên Nhiên' },
  { id: 'vang', name: 'Vàng', lock: 'w50', tier: 2, cat: 'task', theme: 'Thần Thoại' },
  { id: 'tim', name: 'Tím huyền bí', lock: 'top10', tier: 2, cat: 'task', theme: 'Thần Thoại' },
  { id: 'kimcuong', name: 'Kim cương', lock: 'w200', tier: 3, cat: 'task', theme: 'Thần Thoại' },
  { id: 'owner', name: 'Chủ web', lock: 'admin', tier: 4, cat: 'vip', theme: 'Thần Thoại' },
  /* 🛍️ khung bán bằng xu ở Cửa hàng (shop: giá xu) / chỉ mở ra từ rương (chest) — mở khoá bằng ví, xem shared/ui/wallet.js */
  { id: 'sanho', name: 'Khung San Hô', shop: 150, tier: 1, cat: 'shop', theme: 'Biển' },
  { id: 'rungxanh', name: 'Khung Rừng Xanh', shop: 200, tier: 1, cat: 'shop', theme: 'Thiên Nhiên' },
  { id: 'bacha', name: 'Khung Bạc Hà', shop: 150, tier: 1, cat: 'shop', theme: 'Thiên Nhiên' },
  { id: 'timmong', name: 'Khung Tím Mộng', shop: 250, tier: 2, cat: 'shop', theme: 'Thần Thoại' },
  { id: 'bongbong', name: 'Khung Bong Bóng', chest: true, tier: 2, cat: 'gacha', theme: 'Biển' },
  { id: 'saobang', name: 'Khung Sao Băng', chest: true, tier: 2, cat: 'gacha', theme: 'Vũ Trụ' },
  { id: 'keongot', name: 'Khung Mật Ngọt', chest: true, tier: 2, cat: 'gacha', theme: 'Thiên Nhiên' },
  { id: 'hoanggia', name: 'Khung Hoàng Gia', chest: true, tier: 2, cat: 'gacha', theme: 'Thần Thoại' },
  /* 🛍️ thêm 2026-11-21 (kiểu Nitro): khung thường bán bằng xu + khung động chỉ mở rương (cực hiếm) */
  { id: 'anhdao', name: 'Khung Anh Đào', shop: 200, tier: 1, cat: 'shop', theme: 'Thiên Nhiên' },
  { id: 'saoxanh', name: 'Khung Sao Xanh', shop: 200, tier: 1, cat: 'shop', theme: 'Vũ Trụ' },
  { id: 'bienxanh', name: 'Khung Biển Xanh', shop: 150, tier: 1, cat: 'shop', theme: 'Biển' },
  { id: 'hoanghon', name: 'Khung Hoàng Hôn', shop: 250, tier: 2, cat: 'shop', theme: 'Thiên Nhiên' },
  { id: 'mattrang', name: 'Khung Mặt Trăng', shop: 200, tier: 1, cat: 'shop', theme: 'Vũ Trụ' },
  { id: 'rungthong', name: 'Khung Rừng Thông', shop: 150, tier: 1, cat: 'shop', theme: 'Thiên Nhiên' },
  { id: 'camvang', name: 'Khung Cam Vàng', shop: 150, tier: 1, cat: 'shop', theme: 'Cơ Bản' },
  { id: 'timsen', name: 'Khung Tím Sen', shop: 200, tier: 1, cat: 'shop', theme: 'Thiên Nhiên' },
  { id: 'cauvongxoay', name: 'Khung Cầu Vồng Xoay', chest: true, anim: 'spin', tier: 3, cat: 'gacha', theme: 'Thiên Nhiên' },
  { id: 'luachay', name: 'Khung Lửa Cháy', chest: true, anim: 'glow', tier: 3, cat: 'gacha', theme: 'Thiên Nhiên' },
  { id: 'vangxoay', name: 'Khung Vàng Xoay', chest: true, anim: 'spin', tier: 3, cat: 'gacha', theme: 'Cơ Bản' },
  /* ✨ thêm 2026-11-21 (patch -123): 3 khung động chủ đề mới — chỉ mở ra từ rương (cực hiếm) */
  { id: 'vuongmien', name: 'Khung Vương Miện', chest: true, anim: 'spin', tier: 3, cat: 'gacha', theme: 'Thần Thoại' },
  { id: 'longphung', name: 'Khung Rồng Bay Phụng Múa', chest: true, anim: 'dragon', tier: 3, cat: 'gacha', theme: 'Đông Phương', dragon: [['#ff3b1a', '#7a0d0d']] },
  { id: 'vuatrichoi', name: 'Khung Vua Trò Chơi', chest: true, anim: 'spin', tier: 3, cat: 'gacha', theme: 'Game' },
  /* 🏆 thêm 2026-11-22 (patch -143): khung VIP — chỉ mở bằng chuỗi ngày đứng top BXH (lock vip1/vip3/vip5),
     KHÔNG bán bằng xu, KHÔNG mở ra từ rương, KHÔNG cấp tay được (máy chủ chặn ở nhánh grant). */
  { id: 'vipsao', name: 'Khung Ngôi Sao', lock: 'vip1', tier: 3, cat: 'vip', theme: 'Thần Thoại' },
  { id: 'vipvuong', name: 'Khung Vương Giả', lock: 'vip3', tier: 4, cat: 'vip', theme: 'Thần Thoại' },
  { id: 'viphuyen', name: 'Khung Huyền Thoại', lock: 'vip5', anim: 'spin', tier: 4, cat: 'vip', theme: 'Thần Thoại' },
  /* 🖼️ thêm 2026-11-22 (patch -147): 47 khung mới */
  { id: 'dacuoi', name: 'Đá cuội', lock: 'd3', tier: 0, cat: 'task', theme: 'Cơ Bản' },
  { id: 'dong', name: 'Đồng', lock: 'p1', tier: 0, cat: 'task', theme: 'Cơ Bản' },
  { id: 'kraft', name: 'Giấy kraft', lock: 'w1', tier: 0, cat: 'task', theme: 'Cơ Bản' },
  { id: 'maytrang', name: 'Mây trắng', lock: 'k3', tier: 0, cat: 'task', theme: 'Cơ Bản' },
  { id: 'phan', name: 'Hồng phấn', lock: 'p10', tier: 0, cat: 'task', theme: 'Cơ Bản' },
  { id: 'camdao', name: 'Cam đào', lock: 'p20', tier: 0, cat: 'task', theme: 'Cơ Bản' },
  { id: 'mongtim', name: 'Mộng Tím', lock: 'k5', tier: 0, cat: 'task', theme: 'Cơ Bản' },
  { id: 'xanhngoc', name: 'Xanh Ngọc', lock: 'p20', tier: 0, cat: 'task', theme: 'Cơ Bản' },
  { id: 'vangdong', name: 'Vàng đồng', lock: 'w25', tier: 1, cat: 'task', theme: 'Thần Thoại' },
  { id: 'luanho', name: 'Lửa Nhỏ', lock: 's5', tier: 1, cat: 'task', theme: 'Thiên Nhiên' },
  { id: 'anhdaonhe', name: 'Anh Đào Nhẹ', lock: 'd14', tier: 1, cat: 'task', theme: 'Thiên Nhiên' },
  { id: 'songxanh', name: 'Sóng Xanh', lock: 'w30', tier: 1, cat: 'task', theme: 'Biển' },
  { id: 'traitim', name: 'Trái Tim', lock: 'p50', tier: 1, cat: 'task', theme: 'Thiên Nhiên' },
  { id: 'banco', name: 'Bàn Cờ', lock: 'w10chess', tier: 1, cat: 'task', theme: 'Game' },
  { id: 'baitay', name: 'Bài Tây', lock: 'w20card', tier: 1, cat: 'task', theme: 'Game' },
  { id: 'banggia', name: 'Băng Giá', lock: 'w60', tier: 2, cat: 'task', theme: 'Thiên Nhiên' },
  { id: 'domdom', name: 'Đom Đóm', lock: 'night', tier: 2, cat: 'task', theme: 'Thiên Nhiên' },
  { id: 'meono', name: 'Mèo Nổ', lock: 'w30meono', tier: 2, cat: 'task', theme: 'Game' },
  { id: 'masoi', name: 'Ma Sói', lock: 'w20masoi', tier: 2, cat: 'task', theme: 'Game' },
  { id: 'lacda', name: 'Đua Lạc Đà', lock: 'w10camel', tier: 2, cat: 'task', theme: 'Game' },
  { id: 'typhu', name: 'Tỷ Phú', lock: 'w5typhu', tier: 2, cat: 'task', theme: 'Game' },
  { id: 'anhdaobay', name: 'Anh Đào Bay', lock: 'd30', tier: 2, cat: 'task', theme: 'Thiên Nhiên' },
  { id: 'haiduong', name: 'Hải Dương', lock: 'w80', tier: 2, cat: 'task', theme: 'Biển' },
  { id: 'thansam', name: 'Thần Sấm', lock: 's8', tier: 2, cat: 'task', theme: 'Thần Thoại' },
  { id: 'neoncyber', name: 'Neon Cyber', shop: 500, tier: 2, cat: 'shop', theme: 'Tương Lai' },
  { id: 'nhachoi', name: 'Nhạc Hội', lock: 'k25', tier: 2, cat: 'task', theme: 'Lễ Hội' },
  { id: 'thanhlongbay', name: 'Thanh Long Bay', lock: 'w300', anim: 'dragon-edge', tier: 3, cat: 'task', theme: 'Đông Phương', dragon: [['#2fbf71', '#1d8f55']] },
  { id: 'xichlongbay', name: 'Xích Long Bay', lock: 'w400', anim: 'dragon-edge', tier: 3, cat: 'task', theme: 'Đông Phương', dragon: [['#ff3b1a', '#7a0d0d']] },
  { id: 'banglongbay', name: 'Băng Long Bay', lock: 'w500', anim: 'dragon-edge', tier: 3, cat: 'task', theme: 'Đông Phương', dragon: [['#7fd8ff', '#2f7fd0']] },
  { id: 'phuonghoang', name: 'Phượng Hoàng', lock: 'top10', tier: 3, cat: 'task', theme: 'Đông Phương' },
  { id: 'thienthan', name: 'Thiên Thần', lock: 'top5', tier: 3, cat: 'task', theme: 'Thần Thoại' },
  { id: 'vutru', name: 'Vũ Trụ', lock: 'w700', tier: 3, cat: 'task', theme: 'Vũ Trụ' },
  { id: 'tetviet', name: 'Tết Việt', lock: 'event', tier: 3, cat: 'event', theme: 'Đông Phương' },
  { id: 'songlong', name: 'Song Long Tranh Châu', lock: 'w1000', anim: 'dragon', tier: 4, cat: 'task', theme: 'Đông Phương', dragon: [['#ffd23c', '#b8860b'], ['#ff5a3a', '#b30f0f']] },
  { id: 'tamlong', name: 'Tam Long Hội', lock: 'w1500', anim: 'dragon', tier: 4, cat: 'task', theme: 'Đông Phương', dragon: [['#ff4d4d', '#7a0d0d'], ['#ffd23c', '#b8860b'], ['#2ec5b6', '#0b4a3c']] },
  { id: 'longthienha', name: 'Long Thiên Hà', lock: 'vip5', anim: 'dragon', tier: 4, cat: 'task', theme: 'Vũ Trụ', dragon: [['#7a4dff', '#2a1a7a']] },
  { id: 'phuonglong', name: 'Phượng Long Hội', lock: 'top3', anim: 'dragon', tier: 4, cat: 'task', theme: 'Đông Phương', dragon: [['#ff7a1a', '#e11d1d']] },
  { id: 'chusanh', name: 'Chủ Sảnh Tối Thượng', lock: 'admin', anim: 'dragon', tier: 4, cat: 'task', theme: 'Thần Thoại', dragon: [['#ff4d4d', '#7a0d0d'], ['#ffd23c', '#b8860b'], ['#4dc3ff', '#1c5fa8']] },
  { id: 'thanhlong', name: 'Thanh Long', lock: 'w800', anim: 'dragon-edge', tier: 3, cat: 'task', theme: 'Đông Phương', dragon: [['#2fbf71', '#1d8f55']] },
  { id: 'xichlong', name: 'Xích Long', lock: 'w1000', anim: 'dragon-edge', tier: 3, cat: 'task', theme: 'Đông Phương', dragon: [['#ff3b1a', '#7a0d0d']] },
  { id: 'banglong', name: 'Băng Long', lock: 'event', anim: 'dragon-edge', tier: 3, cat: 'event', theme: 'Đông Phương', dragon: [['#7fd8ff', '#2f7fd0']] },
  { id: 'vuonhoa', name: 'Vườn Hoa', lock: 'd30', tier: 1, cat: 'task', theme: 'Thiên Nhiên' },
  { id: 'halloween', name: 'Halloween', lock: 'event', tier: 2, cat: 'event', theme: 'Lễ Hội' },
  { id: 'giangsinh', name: 'Giáng Sinh', lock: 'event', tier: 2, cat: 'event', theme: 'Lễ Hội' },
  { id: 'samset', name: 'Sấm Sét', lock: 'w100', tier: 3, cat: 'task', theme: 'Thần Thoại' },
  { id: 'ronglua', name: 'Rồng Lửa', lock: 'w300', anim: 'dragon-edge', tier: 3, cat: 'task', theme: 'Thần Thoại', dragon: [['#ff6a1a', '#7a0d0d']] },
  { id: 'thienha', name: 'Thiên Hà', lock: 'w500', tier: 4, cat: 'task', theme: 'Vũ Trụ' },
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
  /* 🖼️ -147: ring cho 47 khung mới */
  dacuoi: 'conic-gradient(#c9c5bd,#8e8a83,#d8d4cc,#77736c,#c9c5bd)', dong: 'conic-gradient(#f2b07a,#b36a2e,#f7c79c,#8a4a1c,#f2b07a)', kraft: 'linear-gradient(135deg,#d8b98a,#b89a6a)', maytrang: 'linear-gradient(135deg,#e6f1ff,#bcd8f5)', phan: 'linear-gradient(135deg,#ffb8d0,#ff8fbf)', camdao: 'conic-gradient(#ffc27a,#ff9a5a,#ffc27a,#ff8a4a,#ffc27a)', mongtim: 'conic-gradient(#c9b3ff,#9a7cf0,#c9b3ff,#8566e0,#c9b3ff)', xanhngoc: 'conic-gradient(#8fe8d8,#2bb8a0,#8fe8d8,#1c9a86,#8fe8d8)', vangdong: 'conic-gradient(#ffe9a0,#d9a21b,#ffe9a0,#b8860b,#ffe9a0)', luanho: 'conic-gradient(#ffe36b,#ff7a1a,#e11d1d,#ff7a1a,#ffe36b)', anhdaonhe: 'conic-gradient(#ffd0e4,#ff8fbf,#fff,#ff6fae,#ffd0e4)', songxanh: 'conic-gradient(#7ff0ff,#1c9fe0,#b6f6ff,#1170c0,#7ff0ff)', traitim: 'conic-gradient(#ff9ab8,#ff4d7a,#ff9ab8,#e0245e,#ff9ab8)', banco: 'repeating-conic-gradient(#222 0 15deg,#f4f4f4 15deg 30deg)', baitay: 'conic-gradient(#e0182d,#222,#e0182d,#222,#e0182d)', banggia: 'conic-gradient(#e6fbff,#7fd8ff,#fff,#4fb4f0,#e6fbff)', domdom: 'conic-gradient(#c8ff7a,#4a8a2a,#c8ff7a,#2a5a1a,#c8ff7a)', meono: 'conic-gradient(#ffd23c,#ff7a1a,#ffd23c,#222,#ffd23c)', masoi: 'conic-gradient(#e8e8ff,#6a6aa8,#e8e8ff,#2a2a58,#e8e8ff)', lacda: 'conic-gradient(#ffe1a0,#d9a050,#ffe1a0,#a8742c,#ffe1a0)', typhu: 'conic-gradient(#ffe27a,#2fbf71,#ffe27a,#1d8f55,#ffe27a)', anhdaobay: 'conic-gradient(#ffd0e4,#ff8fbf,#fff,#ff6fae,#ffd0e4)', haiduong: 'conic-gradient(#9ff3ff,#1c9fe0,#0b5fa8,#4fe0ff,#9ff3ff)', thansam: 'conic-gradient(#fff,#ffe600,#7a4dff,#ffe600,#fff)', neoncyber: 'conic-gradient(#00f0ff,#ff2bd6,#00f0ff,#7a2bff,#00f0ff)', nhachoi: 'conic-gradient(#ff4d9a,#9a4dff,#4dc3ff,#4dff88,#ffd23c,#ff4d9a)', thanhlongbay: 'conic-gradient(#ffe27a,#2fbf71,#ffe27a,#1d8f55,#ffe27a)', xichlongbay: 'conic-gradient(#ffd36b,#ff3b1a,#7a0d0d,#ff6a1a,#ffd36b)', banglongbay: 'conic-gradient(#e8fbff,#4fb4f0,#fff,#2f7fd0,#e8fbff)', phuonghoang: 'conic-gradient(#ffe27a,#ff7a1a,#e11d1d,#ff7a1a,#ffe27a)', thienthan: 'conic-gradient(#fffbe0,#ffd966,#fff,#f2b800,#fffbe0)', vutru: 'conic-gradient(#7a4dff,#4dc3ff,#2a1a7a,#ff4dc3,#7a4dff)', tetviet: 'conic-gradient(#ffd23c,#e11d1d,#ffd23c,#b30f0f,#ffd23c)', songlong: 'conic-gradient(#ffe27a,#ff5a3a,#ffe27a,#e0a020,#ffe27a)', tamlong: 'conic-gradient(#ff4d4d,#ffb84d,#f6ff4d,#4dff88,#4dc3ff,#9a4dff,#ff4de1,#ff4d4d)', longthienha: 'conic-gradient(#7a4dff,#ff4dc3,#4dc3ff,#2a1a7a,#7a4dff)', phuonglong: 'conic-gradient(#fff3a6,#ff7a1a,#e11d1d,#ffd23c,#fff3a6)', chusanh: 'conic-gradient(#ff4d4d,#ffb84d,#f6ff4d,#4dff88,#4dc3ff,#9a4dff,#ff4de1,#ff4d4d)', thanhlong: 'conic-gradient(#ffe27a,#2fbf71,#ffe27a,#1d8f55,#ffe27a)', xichlong: 'conic-gradient(#ffd36b,#ff3b1a,#7a0d0d,#ff6a1a,#ffd36b)', banglong: 'conic-gradient(#e8fbff,#4fb4f0,#fff,#2f7fd0,#e8fbff)', vuonhoa: 'conic-gradient(#7bd66a,#2e9a3c,#a8e68a,#1f7a34,#7bd66a)', halloween: 'conic-gradient(#ff9a1a,#6a1fa8,#ff9a1a,#2a0a45,#ff9a1a)', giangsinh: 'repeating-conic-gradient(#e0182d 0 12deg,#fff 12deg 24deg)', samset: 'conic-gradient(#fff,#ffe600,#6a4dff,#ffe600,#fff)', ronglua: 'conic-gradient(#ffd36b,#ff3b1a,#7a0d0d,#ff6a1a,#ffd36b)', thienha: 'conic-gradient(#7a4dff,#ff4dc3,#4dc3ff,#2a1a7a,#7a4dff)',
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
