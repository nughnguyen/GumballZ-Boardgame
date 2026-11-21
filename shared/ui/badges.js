// 🎖️ Huy hiệu + danh hiệu 4 bậc (patch -95): Chủ web / Quản trị / Mod / Ủng hộ đặc biệt.
// CSS ở shared/css/badges.css (nạp 1 lần bằng ensureBadgesCSS, kiểu skeleton.js).
// import { ensureBadgesCSS, tierBadges } from '…/shared/ui/badges.js?v=1'
// tierBadges(u): u là {owner, role, supporter} (từ pub()/adminFind/friendsList/leaderboard)
//   hoặc {v, sp} (tin chat Sảnh: v 2=chủ web, 3=Quản trị, 4=Mod, 1=đã đăng nhập; sp 1=ủng hộ).
//   Trả về HTML các pill – có thể 2 pill cùng lúc (vd. Mod + Ủng hộ). Không tự viết lại markup pill ở từng nơi.
const BDG_CSS = new URL('../css/badges.css?v=1', import.meta.url).href;
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
  if (own) h += '<span class="bdg bdg-own" title="Người làm ra GumballZ Boardgame"><i>👑</i><span class="t">CHỦ WEB</span><b aria-hidden="true">✦</b></span>';
  else if (rl === 2) h += '<span class="bdg bdg-adm" title="Quản trị viên GumballZ"><i>🛠️</i><span class="t">QUẢN TRỊ</span></span>';
  else if (rl === 1) h += '<span class="bdg bdg-mod" title="Quản lý – giữ trật tự cho GumballZ Boardgame"><i>🛡️</i><span class="t">MOD</span></span>';
  if (sp) h += '<span class="bdg bdg-sup" title="Người ủng hộ đặc biệt của GumballZ"><i>💎</i><span class="t">ỦNG HỘ</span><b aria-hidden="true">✦</b></span>';
  return h;
}
