// 🎖️ Huy hiệu + danh hiệu 4 bậc (patch -95): Chủ sảnh / Quản sảnh / Mod sảnh / Nhà Tài Trợ.
// CSS ở shared/css/badges.css (nạp 1 lần bằng ensureBadgesCSS, kiểu skeleton.js).
// import { ensureBadgesCSS, tierBadges } from '…/shared/ui/badges.js?v=3'
// tierBadges(u): u là {owner, role, supporter} (từ pub()/adminFind/friendsList/leaderboard)
//   hoặc {v, sp} (tin chat Sảnh: v 2=chủ sảnh, 3=Quản sảnh, 4=Mod sảnh, 1=đã đăng nhập; sp 1=nhà tài trợ).
//   Trả về HTML các pill – có thể 2 pill cùng lúc (vd. Mod + Ủng hộ). Không tự viết lại markup pill ở từng nơi.
// uid6(id) (patch -108): id tài khoản HIỂN THỊ dạng 6 chữ số theo thứ tự tạo acc (acc đầu tiên = 000001,
// quá 6 số giữ nguyên, không cắt); id NỘI BỘ (số nguyên trong DB/API/token/data-uid) KHÔNG đổi – chỉ đổi lúc hiển thị.
export const uid6 = id => { const s = String(id ?? ''); return s ? s.padStart(6, '0') : ''; };
const BDG_CSS = new URL('../css/badges.css?v=2', import.meta.url).href;
export function ensureBadgesCSS() {
  if (document.getElementById('bdg-css')) return;
  const l = document.createElement('link'); l.id = 'bdg-css'; l.rel = 'stylesheet'; l.href = BDG_CSS;
  document.head.append(l);
}
export function tierBadges(u = {}) {
  const own = !!(u.owner || u.v === 2);
  const rl = u.v != null ? (u.v === 2 ? 2 : u.v === 3 ? 2 : u.v === 4 ? 1 : 0) : (u.role != null ? +u.role : (u.admin ? 2 : 0));
  const sp = !!(u.sp || u.supporter);
  let h = '';
  if (own) h += '<span class="bdg bdg-own" title="Người làm ra GumballZ Boardgame"><i>👑</i><span class="t">CHỦ SẢNH</span><b aria-hidden="true">✦</b></span>';
  else if (rl === 2) h += '<span class="bdg bdg-adm" title="Quản lý Sảnh GumballZ"><i>🛠️</i><span class="t">QUẢN SẢNH</span></span>';
  else if (rl === 1) h += '<span class="bdg bdg-mod" title="Mod – giữ trật tự Sảnh"><i>🛡️</i><span class="t">MOD SẢNH</span></span>';
  if (sp) h += '<span class="bdg bdg-sup" title="Nhà Tài Trợ của GumballZ"><i>💎</i><span class="t">NHÀ TÀI TRỢ</span><b aria-hidden="true">✦</b></span>';
  return h;
}
