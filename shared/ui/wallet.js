// 💰 Ví xu GumballZ — tiền ảo duy nhất toàn web. KHÔNG tiền thật, không nạp, không rút.
// Thắng 1 ván +10 xu, chơi 1 ván +2 xu (ít để tránh lạm phát — quy tắc 19/11/2026).
// Số dư lưu trên máy này (localStorage 'gumballz-wallet'); ai đăng nhập thì sync.js đẩy lên tài khoản
// (máy chủ giữ bản mới nhất theo thời gian, xem server/src/users.js P.wal).
// Module này thuần logic + localStorage, KHÔNG import gì khác (để stats.js/sync.js/deck.js đều dùng được).
import { readParts, grantGachaPart } from '../js/avatar-rewards.js'; /* 🧸 linh kiện nhân vật trúng rương: mở sớm hơn cấp (xem shared/js/avatar-rewards.js) */
const KEY = 'gumballz-wallet';
export const START_XU = 100; /* số xu tài khoản mới nhận lúc mở ví lần đầu */
export const WIN_XU = 10, PLAY_XU = 2; /* thắng / chơi 1 ván */
export const CHEST_PRICE = 100; /* 1 lần mở rương */
export const DUP_REFUND = 20; /* mở rương trùng đồ đã có → hoàn lại từng này xu */
const num = v => Math.max(0, Math.floor(+v || 0));
const ls = {
  get(k) { try { return typeof localStorage === 'undefined' ? null : localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { if (typeof localStorage !== 'undefined') localStorage.setItem(k, v); } catch (e) {} },
};
const emit = () => { try { if (typeof dispatchEvent !== 'undefined') dispatchEvent(new CustomEvent('gumballz-wallet', { detail: { xu: loadWallet().xu } })); } catch (e) {} };
const blank = () => ({ xu: START_XU, inv: {}, own: [], eq: { back: '' }, dbl: 0, chest: 0, at: 0 });
export function loadWallet() {
  let w = null; try { w = JSON.parse(ls.get(KEY)); } catch (e) {}
  if (!w || typeof w !== 'object') { w = blank(); ls.set(KEY, JSON.stringify(w)); return w; } /* ví mới chưa có giao dịch nào: at = 0 — để ví trên tài khoản (nếu có) thắng khi đồng bộ, và ví trống không bao giờ đè ví thật trên máy chủ (trước đây at = giờ mở ví lần đầu nên máy mới đăng nhập là xoá sạch xu đã kiếm ở máy kia) */
  w.xu = num(w.xu); w.inv = w.inv && typeof w.inv === 'object' ? w.inv : {}; w.own = Array.isArray(w.own) ? w.own : [];
  w.eq = w.eq && typeof w.eq === 'object' ? w.eq : {}; w.dbl = num(w.dbl); w.chest = num(w.chest); w.at = num(w.at);
  for (const k of Object.keys(w.inv)) w.inv[k] = num(w.inv[k]);
  return w;
}
export function saveWallet(w) { w.at = Date.now(); ls.set(KEY, JSON.stringify(w)); emit(); return w; }
export const balance = () => loadWallet().xu;
export const fmt = n => num(n).toLocaleString('vi-VN');
/* cộng xu sau 1 ván (stats.js record() gọi): thắng +10 (có Nhân đôi xu thì +20, trừ 1 lượt), hoà/thua +2 */
export function earnGame(won) {
  const w = loadWallet(); let amt = PLAY_XU; /* chơi 1 ván: +2 xu; thắng: thêm +10 xu (thắng = +12) */
  if (won === true) { amt += w.dbl > 0 ? WIN_XU * 2 : WIN_XU; if (w.dbl > 0) w.dbl--; }
  w.xu += amt; saveWallet(w); return amt;
}
/* trừ xu (mua đồ / mở rương): đủ thì trừ và trả true, không đủ trả false (không trừ) */
export function spend(n) { const w = loadWallet(); if (w.xu < num(n)) return false; w.xu -= num(n); saveWallet(w); return true; }
export function addXu(n) { const w = loadWallet(); w.xu += num(n); saveWallet(w); return w.xu; }
/* vật phẩm hỗ trợ trong kho: id 'bt-trap' | 'bt-radar' | 'bt-nuke' | 'dbl-xu' */
export const stock = id => num(loadWallet().inv[id]);
export function grantItem(id, n = 1) { const w = loadWallet(); w.inv[id] = num(w.inv[id]) + num(n); saveWallet(w); return w.inv[id]; }
export function useItem(id) { const w = loadWallet(); if (num(w.inv[id]) <= 0) return false; w.inv[id]--; saveWallet(w); return true; }
/* đồ trang trí: wid = 'frame:<id>' | 'color:<id>' | 'back:<id>' */
export const owns = wid => loadWallet().own.includes(wid);
export function grantCosmetic(wid) { const w = loadWallet(); if (!w.own.includes(wid)) w.own.push(wid); saveWallet(w); return true; }
export function equipBack(id) { const w = loadWallet(); w.eq.back = String(id || ''); saveWallet(w); return true; }
export const equippedBack = () => loadWallet().eq.back || '';
/* ---------- danh mục shop ---------- */
export const ITEM_DEFS = {
  'bt-trap': { kind: 'item', icon: '🪤', name: 'Bẫy Bắn Tàu', price: 30, desc: 'Đặt 1 bẫy lên tàu của bạn trong Bắn Tàu (dùng trong trận, tối đa 2 bẫy/trận). Mua ở đây rồi vào trận bấm “Dùng kho” là có ngay, không tốn xu trong trận.' },
  'bt-radar': { kind: 'item', icon: '📡', name: 'Radar Bắn Tàu', price: 40, desc: 'Quét vùng 3×3 tìm tàu địch trong Bắn Tàu (dùng trong trận, tối đa 1 lần/trận). Mua ở đây rồi vào trận bấm “Dùng kho”.' },
  'bt-nuke': { kind: 'item', icon: '☢️', name: 'Bom hạt nhân Bắn Tàu', price: 50, desc: 'Nổ vùng 3×3 trong Bắn Tàu (dùng trong trận, tối đa 1 lần/trận). Mua ở đây rồi vào trận bấm “Dùng kho”.' },
  'dbl-xu': { kind: 'item', icon: '⭐', name: 'Nhân đôi xu', price: 30, desc: 'Ván thắng tiếp theo được nhân đôi phần thắng: +20 xu thay vì +10 (cộng thêm +2 xu chơi ván đó, tổng +22). Dùng tối đa 1 lần/ván, cộng dồn được nhiều lần.' },
};
/* đồ trang trí: shop = bán trực tiếp ở Cửa hàng; chest = chỉ mở ra từ rương */
export const COSMETICS = {
  frames: [
    { id: 'sanho', name: 'Khung San Hô', price: 150, shop: true },
    { id: 'rungxanh', name: 'Khung Rừng Xanh', price: 200, shop: true },
    { id: 'bacha', name: 'Khung Bạc Hà', price: 150, shop: true },
    { id: 'timmong', name: 'Khung Tím Mộng', price: 250, shop: true },
    { id: 'bongbong', name: 'Khung Bong Bóng', price: 0, chest: true },
    { id: 'saobang', name: 'Khung Sao Băng', price: 0, chest: true },
    { id: 'keongot', name: 'Khung Kẹo Ngọt', price: 0, chest: true },
    { id: 'hoanggia', name: 'Khung Hoàng Gia', price: 0, chest: true, rare: true },
    /* 🛍️ thêm 2026-11-21: khung thường bán bằng xu */
    { id: 'anhdao', name: 'Khung Anh Đào', price: 200, shop: true },
    { id: 'saoxanh', name: 'Khung Sao Xanh', price: 200, shop: true },
    { id: 'bienxanh', name: 'Khung Biển Xanh', price: 150, shop: true },
    { id: 'hoanghon', name: 'Khung Hoàng Hôn', price: 250, shop: true },
    { id: 'mattrang', name: 'Khung Mặt Trăng', price: 200, shop: true },
    { id: 'rungthong', name: 'Khung Rừng Thông', price: 150, shop: true },
    { id: 'camvang', name: 'Khung Cam Vàng', price: 150, shop: true },
    { id: 'timsen', name: 'Khung Tím Sen', price: 200, shop: true },
    /* ✨ khung động kiểu Nitro: chỉ mở ra từ rương (cực hiếm), anim: 'spin' = viền xoay, 'glow' = phát sáng */
    { id: 'cauvongxoay', name: 'Khung Cầu Vồng Xoay', price: 0, chest: true, rare: true, anim: 'spin' },
    { id: 'luachay', name: 'Khung Lửa Cháy', price: 0, chest: true, rare: true, anim: 'glow' },
    { id: 'vangxoay', name: 'Khung Vàng Xoay', price: 0, chest: true, rare: true, anim: 'spin' },
  ],
  colors: [
    { id: 'ngoc', name: 'Xanh Ngọc', price: 150, shop: true },
    { id: 'dodo', name: 'Đỏ Đô', price: 150, shop: true },
    { id: 'chanh', name: 'Vàng Chanh', price: 200, shop: true },
    { id: 'song', name: 'Sóng Biển', price: 0, chest: true },
    { id: 'daquang', name: 'Dạ Quang', price: 0, chest: true },
    /* 🛍️ thêm 2026-11-21: màu tên thường bán bằng xu */
    { id: 'hongsam', name: 'Hồng Sẫm', price: 150, shop: true },
    { id: 'camchay', name: 'Cam Cháy', price: 150, shop: true },
    { id: 'xanhreu', name: 'Xanh Rêu', price: 150, shop: true },
    { id: 'duong', name: 'Xanh Dương', price: 150, shop: true },
    { id: 'cham', name: 'Xanh Chàm', price: 150, shop: true },
    { id: 'nau', name: 'Nâu Đất', price: 150, shop: true },
    { id: 'xam', name: 'Xám Đá', price: 150, shop: true },
    { id: 'vomo', name: 'Vàng Mơ', price: 200, shop: true },
    { id: 'luc', name: 'Xanh Lục', price: 150, shop: true },
    { id: 'do', name: 'Đỏ Tươi', price: 150, shop: true },
    /* ✨ tên động kiểu Nitro: gradient chạy trên chữ — chỉ mở ra từ rương (cực hiếm), anim: 1 = chạy gradient */
    { id: 'cauvongchay', name: 'Cầu Vồng Chạy', price: 0, chest: true, rare: true, anim: 1 },
    { id: 'vanglaplanh', name: 'Vàng Lấp Lánh', price: 0, chest: true, rare: true, anim: 1 },
    { id: 'timxanhchay', name: 'Tím Xanh Chạy', price: 0, chest: true, rare: true, anim: 1 },
  ],
  backs: [
    { id: 'hongphan', name: 'Hồng Phấn', price: 200, shop: true },
    { id: 'lucdam', name: 'Lục Bảo Đậm', price: 200, shop: true },
    { id: 'timbiec', name: 'Tím Biếc', price: 0, chest: true },
    { id: 'vangchanh', name: 'Vàng Chanh', price: 0, chest: true },
  ],
  /* 🎏 banner hồ sơ: 3 loại thường bán bằng xu, 2 loại động chỉ mở rương (cực hiếm) */
  banners: [
    { id: 'bnhoanghon', name: 'Banner Hoàng Hôn', price: 200, shop: true },
    { id: 'bnbienxanh', name: 'Banner Biển Xanh', price: 200, shop: true },
    { id: 'bnsaodem', name: 'Banner Sao Đêm', price: 200, shop: true },
    { id: 'bncauvong', name: 'Banner Cầu Vồng Chạy', price: 0, chest: true, rare: true, anim: 1 },
    { id: 'bnvangchay', name: 'Banner Vàng Chảy', price: 0, chest: true, rare: true, anim: 1 },
  ],
};
export const cosmeticById = (kind, id) => (COSMETICS[kind] || []).find(x => x.id === id) || null;
export const widOf = (kind, id) => (kind === 'frame' ? 'frame:' : kind === 'color' ? 'color:' : kind === 'banner' ? 'banner:' : 'back:') + id;
/* ---------- rương gacha: 100 xu/lần, chủ yếu đồ trang trí — không pay-to-win ----------
   Bảng rớt mới (2026-11-21): BỎ vật phẩm hỗ trợ khỏi rương (chỉ mua trong trận Bắn Tàu);
   thêm hạng động kiểu Nitro (tên động / khung động / banner động) với tỉ lệ CỰC HIẾM:
   mỗi món động <1% (mỗi nhóm 1% chia đều cho các món trong nhóm), tổng hạng động 3%.
   Giải tiền XU giữ nguyên +50/+100/+200 (tổng 35%).
   Linh kiện nhân vật (2026-11-21): 9% — trúng món đang khoá theo cấp thì MỞ SỚM hơn cấp (món cấp
   giữa 6% + món cấp cao 3%); trúng món đã mở (đủ cấp hoặc đã trúng rương) → hoàn 20 xu như đồ trùng.
   Kỳ vọng xu mỗi rương: tiền mặt 0,14×50+0,12×100+0,08×200 = 35,0 xu; hoàn trùng tối đa
   (đã có hết đồ trang trí + linh kiện rương: 57% × 20 + 9% × 20) = 13,2 xu → EV xu tối đa 48,2 xu < giá 100 xu.
   Người mới (chưa trùng món nào): EV xu = 35,0 xu. Rương luôn là hố đốt xu, không lãi xu. */
export const CHEST_TABLE = [
  { w: 28, kind: 'frame', pool: ['bongbong', 'saobang', 'keongot'], label: 'Khung avatar trong rương' },
  { w: 14, kind: 'color', pool: ['song', 'daquang'], label: 'Màu tên trong rương' },
  { w: 8, kind: 'back', pool: ['timbiec', 'vangchanh'], label: 'Mặt sau lá bài trong rương' },
  { w: 4, kind: 'frame', pool: ['hoanggia'], label: 'Khung Hoàng Gia (hiếm)' },
  { w: 6, kind: 'part', pool: ['hat:cowboy', 'outfit:jersey', 'acc:backpack', 'outfit:aodai'], label: 'Linh kiện nhân vật (mở sớm hơn cấp)' },
  { w: 3, kind: 'part', pool: ['hat:crown', 'outfit:mecha', 'kind:frog', 'acc:foxtails', 'horns:devil'], label: 'Linh kiện nhân vật hiếm', rare: true },
  { w: 1, kind: 'color', pool: ['cauvongchay', 'vanglaplanh', 'timxanhchay'], label: 'Tên động kiểu Nitro (CỰC HIẾM)', rare: true },
  { w: 1, kind: 'frame', pool: ['cauvongxoay', 'luachay', 'vangxoay'], label: 'Khung động kiểu Nitro (CỰC HIẾM)', rare: true },
  { w: 1, kind: 'banner', pool: ['bncauvong', 'bnvangchay'], label: 'Banner động kiểu Nitro (CỰC HIẾM)', rare: true },
  { w: 14, kind: 'xu', amount: 50, label: '🪙 +50 xu' },
  { w: 12, kind: 'xu', amount: 100, label: '🪙 +100 xu' },
  { w: 8, kind: 'xu', amount: 200, label: '🪙 +200 xu' },
];
export function rollChest(rng = Math.random) {
  const total = CHEST_TABLE.reduce((n, e) => n + e.w, 0); let r = rng() * total;
  for (const e of CHEST_TABLE) { r -= e.w; if (r < 0) { if (e.kind === 'xu') return { kind: 'xu', amount: e.amount, label: e.label }; const id = e.pool[Math.floor(rng() * e.pool.length)]; if (e.kind === 'part') return { kind: 'part', id, label: e.label }; return { kind: e.kind, id, wid: widOf(e.kind, id), label: e.label }; } }
  return { kind: 'xu', amount: 50, label: 'Hoàn 50 xu' };
}
/* mở 1 rương: trừ 100 xu, quay, trao đồ (trùng đồ trang trí đã có → hoàn 20 xu). Trả kết quả để trang shop hiện.
   isOpenPart (không bắt buộc): shop truyền hàm kiểm tra "món đã mở chưa" theo cấp + rương — trúng món đã mở thì
   hoàn 20 xu; không truyền thì chỉ kiểm tra rương (trúng món đã trúng rương thì hoàn). */
export function openChest(rng = Math.random, isOpenPart) {
  const w = loadWallet(); if (w.xu < CHEST_PRICE) return { ok: false, reason: 'Không đủ xu (cần 100 xu).' };
  const roll = rollChest(rng); w.xu -= CHEST_PRICE; w.chest++;
  let dup = false;
  if (roll.kind === 'xu') w.xu += roll.amount;
  else if (roll.kind === 'item') w.inv[roll.id] = num(w.inv[roll.id]) + 1;
  else if (roll.kind === 'part') { const already = typeof isOpenPart === 'function' ? isOpenPart(roll.id) : readParts().includes(roll.id); if (already) { dup = true; w.xu += DUP_REFUND; } else grantGachaPart(roll.id); }
  else if (w.own.includes(roll.wid)) { dup = true; w.xu += DUP_REFUND; }
  else w.own.push(roll.wid);
  saveWallet(w);
  return { ok: true, ...roll, dup, xu: w.xu };
}
/* ---------- đồng bộ tài khoản ---------- */
export function snapshot() {
  const w = loadWallet();
  const inv = {}; for (const k of ['bt-trap', 'bt-radar', 'bt-nuke', 'dbl-xu']) if (num(w.inv[k]) > 0) inv[k] = num(w.inv[k]);
  return { xu: num(w.xu), inv, own: [...new Set(w.own.filter(x => typeof x === 'string' && /^(frame|color|back|banner):[a-z]{2,14}$/.test(x)))].slice(0, 200), eq: { back: String(w.eq.back || '').slice(0, 14) }, dbl: num(w.dbl), chest: num(w.chest), at: num(w.at) };
}
/* nhận ví từ máy chủ: chỉ nhận khi bản máy chủ mới hơn bản trên máy này (ai mới hơn thì thắng) */
export function adoptServer(wal) {
  if (!wal || typeof wal !== 'object') return false;
  const cur = loadWallet(); if (num(wal.at) <= num(cur.at)) return false;
  const w = blank(); w.xu = num(wal.xu, 1e7);
  w.inv = {}; if (wal.inv && typeof wal.inv === 'object') for (const k of ['bt-trap', 'bt-radar', 'bt-nuke', 'dbl-xu']) w.inv[k] = Math.min(999, num(wal.inv[k]));
  w.own = Array.isArray(wal.own) ? [...new Set(wal.own.filter(x => typeof x === 'string' && /^(frame|color|back|banner):[a-z]{2,14}$/.test(x)))].slice(0, 200) : [];
  w.eq = { back: typeof (wal.eq && wal.eq.back) === 'string' ? wal.eq.back.slice(0, 14) : '' };
  w.dbl = Math.min(99, num(wal.dbl)); w.chest = Math.min(1e5, num(wal.chest)); w.at = num(wal.at);
  ls.set(KEY, JSON.stringify(w)); emit(); return true;
}
/* link tới trang Cửa hàng, tính từ vị trí file này (dùng được từ mọi trang, kể cả trong game) */
export function shopURL() { try { return new URL('../../shop/', import.meta.url).href; } catch (e) { return 'shop/'; } }
