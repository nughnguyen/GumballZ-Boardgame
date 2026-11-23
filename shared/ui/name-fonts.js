// ✍️ Nạp font chữ tên hiển thị (patch -154): chèn 1 <link> Google Fonts (css2, display=swap)
// chứa mọi font trong NAME_FONTS có trường gf (font đã nạp sẵn ở web như Baloo 2 / Bungee thì
// không có gf nên không nạp lại). Google tự phục vụ subset vietnamese theo unicode-range của
// trình duyệt. Gọi 1 lần là đủ (kiểm tra theo id); an toàn khi import ở Node (không có document).
import { NAME_FONTS } from '../js/avatar-rewards.js?v=4';
export function nameFontsURL() {
  const fams = NAME_FONTS.filter(f => f.gf).map(f => 'family=' + f.gf).join('&');
  return fams ? 'https://fonts.googleapis.com/css2?' + fams + '&display=swap' : '';
}
export function ensureNameFonts() {
  try {
    if (typeof document === 'undefined' || document.getElementById('gz-namefonts')) return false;
    const href = nameFontsURL();
    if (!href) return false;
    const l = document.createElement('link');
    l.id = 'gz-namefonts'; l.rel = 'stylesheet'; l.href = href;
    document.head.appendChild(l);
    return true;
  } catch (e) { return false; }
}
