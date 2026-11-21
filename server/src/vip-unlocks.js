// 🏆 Mở khoá vật phẩm VIP theo chuỗi ngày đứng top BXH (patch -143).
// User yêu cầu 2026-11-22 ~00:00: "thêm nhiều cách mở khoá các vật phẩm vip hơn, ví dụ đứng trong
// top server trong vòng 1 tuần thì mới đc nhận vật phẩm, và độ khó nhận vật phẩm tăng lên ngày càng khó".
//
// Thang 5 bậc (xem VIP_TIERS trong shared/js/avatar-rewards.js — bảng này là chuẩn duy nhất, client
// và server dùng chung): vip1 Top 10 · 7 ngày, vip2 Top 5 · 10 ngày, vip3 Top 3 · 14 ngày,
// vip4 Top 2 · 21 ngày, vip5 Top 1 · 30 ngày. Bậc sau khó hơn bậc trước ở CẢ 2 chiều (hạng cao hơn
// VÀ giữ lâu hơn — user chọn thang này 2026-11-22 00:17; đổi số trong VIP_TIERS là đổi cả thang,
// không cần sửa file này).
//
// QUY TẮC "LIÊN TỤC" (quan trọng, phải hiện rõ trong Hồ sơ):
// - Chuỗi chỉ đếm những ngày user ĐỒNG BỘ (profile()/claimLogin()) khi đang nằm trong top của bậc đó.
//   Mỗi ngày chỉ đếm 1 lần (ghi last = ngày VN đã đếm). Đồng bộ nhiều lần trong ngày không cộng thêm.
// - Rớt khỏi top vào ngày đồng bộ → chuỗi của bậc đó về 0 ngay.
// - BỎ 1 NGÀY KHÔNG ĐỒNG BỘ → chuỗi về 0 (ngày đó không chứng minh được user còn trong top).
//   Đồng bộ chạy tự động mỗi khi mở web / chơi xong 1 ván / đăng nhập nên người chơi đều đặn mỗi ngày
//   không cần làm gì thêm; chỉ người nghỉ chơi 1 ngày mới mất chuỗi.
// - Đủ ngày → cấp món ngay trong lần đồng bộ đó: thêm wid vào P.granted (như cấp tay -127), mergeGranted()
//   gộp vào ví ở cùng lần đồng bộ; chỉ cấp 1 lần/bậc (ghi vào P.vipTop.got).
// - Dữ liệu lưu ở P.vipTop = { s: { vip1: { n, last }, ... }, got: ['vip1', ...] } — KHÔNG dùng P.vip
//   (tránh đụng cờ huy hiệu VIP của patch -142). P.vipTop theo hồ sơ về máy nhờ profile() trả toàn bộ P
//   + saveServerSnapshot() (shared/ui/stats.js) nên Hồ sơ đọc được qua loadServer()?.vipTop.
//
// File này KHÔNG đụng Durable Object / Cloudflare (logic thuần, rank truyền vào qua tham số) để test
// được bằng node. Tích hợp vào users.js xem mục "TÍCH HỢP" ở cuối file (parent làm sau khi -142 xong,
// vì -142 đang sửa users.js + quantri/index.html cùng lúc).
import { VIP_TIERS, VIP_WID } from '../../shared/js/avatar-rewards.js';

export const VN_MS = 7 * 3600e3; /* giờ VN */
export const vnDay = ts => new Date(ts + VN_MS).toISOString().slice(0, 10); /* 'YYYY-MM-DD' theo giờ VN */
export const dayBefore = d => { const dt = new Date(d + 'T12:00:00Z'); dt.setUTCDate(dt.getUTCDate() - 1); return dt.toISOString().slice(0, 10); };
const num = v => Math.max(0, Math.floor(+v || 0));

/* Chuẩn hoá P.vipTop về dạng { s: { vip1: { n, last }, ... }, got: [] } — chỉ đọc, không sửa P.
   Dữ liệu lạ / thiếu thì coi như chưa có chuỗi nào (không crash, không cấp nhầm). */
export function vipState(P) {
  const v = P && P.vipTop && typeof P.vipTop === 'object' ? P.vipTop : {};
  const s = v.s && typeof v.s === 'object' ? v.s : {};
  const out = {};
  for (const t of VIP_TIERS) {
    const e = s[t.id] && typeof s[t.id] === 'object' ? s[t.id] : {};
    out[t.id] = { n: num(e.n), last: typeof e.last === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.last) ? e.last : '' };
  }
  const got = Array.isArray(v.got) ? [...new Set(v.got.filter(x => VIP_TIERS.some(t => t.id === x)))] : [];
  return { s: out, got };
}

/* Cập nhật chuỗi top + cấp món VIP khi đủ điều kiện. Sửa P tại chỗ (P.vipTop, P.granted).
   rank = hạng BXH hiện tại của user (0 = không có hạng — chưa chơi ván nào / không nằm trong BXH).
   today = ngày VN 'YYYY-MM-DD' (mặc định hôm nay). Trả { changed, granted: [wid,...], tiers: [tierId,...] }.
   changed = true khi chuỗi hoặc got thay đổi (caller lưu prof). granted rỗng khi chưa đủ điều kiện
   hoặc đã nhận rồi — gọi lại bao nhiêu lần cũng không cấp trùng. */
export function checkVip(P, rank, today = vnDay(Date.now())) {
  if (!P || typeof P !== 'object') return { changed: false, granted: [], tiers: [] };
  const r = num(rank);
  const t = typeof today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(today) ? today : vnDay(Date.now());
  const yest = dayBefore(t);
  const cur = vipState(P);
  const granted = [], tiers = [];
  let changed = false;
  const s = {};
  for (const tier of VIP_TIERS) {
    const e = cur.s[tier.id];
    const inTop = r >= 1 && r <= tier.top;
    let n = e.n, last = e.last;
    if (last !== t) { /* hôm nay chưa đếm: cộng chuỗi nếu đang trong top + hôm qua cũng đã đếm, không thì về 0/1 */
      if (inTop) n = (last === yest) ? n + 1 : 1;
      else n = 0;
      last = t;
    }
    s[tier.id] = { n, last };
    if (n !== e.n || last !== e.last) changed = true;
    if (inTop && n >= tier.days && !cur.got.includes(tier.id)) { /* đủ ngày + đang trong top + chưa nhận → cấp */
      const wid = VIP_WID(tier);
      const list = Array.isArray(P.granted) ? P.granted.filter(x => typeof x === 'string') : [];
      if (!list.includes(wid)) { list.push(wid); P.granted = list.slice(0, 200); }
      tiers.push(tier.id);
      granted.push(wid);
      changed = true;
    }
  }
  const got = [...new Set([...cur.got, ...tiers])];
  if (changed) P.vipTop = { s, got };
  return { changed, granted, tiers };
}

/* ================= TÍCH HỢP VÀO users.js (parent làm sau khi -142 xong) =================
   1. Import ở đầu users.js (gộp vào dòng import avatar-rewards.js sẵn có, dòng 5):
        import { isKnownPart, FRAMES, NAME_COLORS, BANNERS, VIP_WIDS } from '../../shared/js/avatar-rewards.js';
        import { checkVip } from './vip-unlocks.js';
      (VIP_WIDS đã export từ avatar-rewards.js; vip-unlocks.js cũng import VIP_TIERS từ đó.)
   2. Trong profile() (users.js ~dòng 311), ngay SAU dòng `if (mergeGranted(P)) changed = true;`:
        { const ranks = await this.ranks(); const v = checkVip(P, ranks.get(me.id) || 0); if (v.changed) changed = true; }
      (ranks() có cache 30 giây nên gọi trong profile() không tốn thêm lần quét BXH; rank 0 = chưa có hạng.)
   3. (Khuyến nghị, cùng chỗ) Trong claimLogin() (~dòng 398), ngay SAU dòng `mergeGranted(P);`:
        checkVip(P, (await this.ranks()).get(me.id) || 0);
      (để user chỉ điểm danh mà không đồng bộ đầy đủ vẫn giữ được chuỗi; last===today nên không đếm trùng.)
   4. CHẶN CẤP TAY món VIP (kẻo Quản trị cấp tay phá thang độ khó): trong nhánh grant của adminSet
      (users.js ~dòng 540, ngay SAU dòng kiểm tra GRANT_OWNER_ONLY):
        if (VIP_WIDS.has(grantWid)) return { ok: false, msg: 'Món VIP chỉ mở bằng thành tích BXH, không cấp tay được' };
      (GRANT_ITEMS vẫn chứa món VIP — cần vậy để mergeGranted() gộp P.granted vào ví; chỉ chặn đường cấp tay.)
   5. (Tuỳ chọn, giao diện) quantri/index.html — lọc món VIP khỏi dropdown cấp tay: trong grantAchOpts,
      đổi điều kiện lọc thành `x.lock && x.lock !== 'admin' && !String(x.lock).startsWith('vip')`.
      (Không bắt buộc: đã có rào server ở bước 4, dropdown hiện món VIP mà bấm cấp thì máy chủ trả lỗi.)
   6. KHÔNG cần sửa gì thêm: P.vipTop theo hồ sơ về máy tự động (profile() trả toàn bộ P),
      Hồ sơ đọc qua loadServer()?.vipTop (shared/ui/profile.js, patch -143 đã nối dây).
   ================= NÂNG CẤP TƯƠNG LAI (không bắt buộc — chỉ khi user muốn chuỗi chính xác tuyệt đối) =================
   Lazy check hiện tại yêu cầu user đồng bộ mỗi ngày (bỏ 1 ngày là mất chuỗi). Muốn chuỗi đúng cả khi
   user không mở web (vẫn tính ngày họ giữ top mà không cần đăng nhập), chụp snapshot BXH mỗi ngày:
   - Trong server/src/lobby.js alarm() (~dòng 234), ngay sau `if (this.resetWorldIfNewDay()) this.broadcastWorldReset();`
     (điểm này chạy đúng 1 lần/ngày, trong ~15 giây sau 0:00 giờ VN, khi có người online):
        if (resetMoiNgay) { const ranks = await this.env.USERS.get(...).leaderboard({ game: 'all', by: 'xp' });
          lưu snapshot { day, top10: [id...], top5, top3, top1 } vào stat của Lobby DO hoặc gọi Users DO
          để lưu vào meta (vd. this.sql.exec INSERT INTO stat ... 'vip-snap:<day>' = JSON). }
     (Cần xem lobby.js lấy stub Users DO bằng cách nào — hiện lobby.js chưa gọi Users DO, phải thêm đường gọi.)
   - checkVip đổi sang đọc snapshot: chuỗi = số ngày liên tiếp (tính ngược từ hôm qua) mà id user nằm trong
     snapshot top của bậc đó; đủ ngày thì cấp như cũ. Khi đó không cần last/n theo lần đồng bộ nữa.
   - Lưu ý: snapshot chỉ có khi có người online lúc 0:00 (alarm chỉ chạy khi có socket); ngày không có ai
     online thì không có snapshot → coi như ngày đó không đếm được (chuỗi đứt) trừ khi backfill bằng rank
     hiện tại. Vì vậy lazy check vẫn là mặc định đúng cho tới khi user yêu cầu nâng cấp này. */
