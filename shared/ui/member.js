// 👤 Hồ sơ công khai của một thành viên — từ patch -162 KHÔNG mở modal nữa.
// Bấm "Xem hồ sơ" ở BXH / bạn bè / chat sẽ nhảy sang trang hồ sơ riêng /hoso/?id=<uid>.
// Giữ export openMember() để code cũ gọi vẫn đúng: chuyển trang (theo mẫu -150: openProfile/openLeaderboard).
// Trang hồ sơ người khác vẽ bằng mountMemberPage() trong shared/ui/profile.js (chỉ xem, không chỉnh sửa).
//   import('…/shared/ui/member.js?v=8').then(m => m.openMember(uid))      // uid = số id tài khoản hoặc tên đăng nhập
export function openMember(key) {
  if (key == null || key === '') return;
  const u = new URL('../../hoso/', import.meta.url);
  u.searchParams.set('id', String(key));
  location.href = u.href;
}
try { window.__gumballzMember = openMember; } catch (e) {}
