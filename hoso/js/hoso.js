// 👤 Trang Hồ sơ riêng (patch -150): vẽ hồ sơ vào #pf-root bằng logic chung của profile.js.
// Chưa đăng nhập vẫn xem được hồ sơ trên máy này (như modal cũ) — có ghi chú mời đăng nhập trong trang.
import { mountProfilePage } from '../../shared/ui/profile.js?v=61';
mountProfilePage(document.getElementById('pf-root'));
