// 🎖️ Pill danh hiệu (.pf-tt) + vẽ vào danh sách người chơi (phòng chờ #plist / trong ván #players).
// Dùng chung cho gamekit (77 game) và chat phòng. Icon/tên LUÔN tra từ ALL_TITLES qua titleById,
// không tin text người khác gửi. Không import gì ngoài titles.js (thuần logic) để node test được.
import { titleById } from '../titles.js?v=6';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* 1 pill danh hiệu (đúng 1 cái / người). t có thể là id chuỗi hoặc object { id, icon, name } –
   lúc nào cũng tra lại bằng titleById để icon/tên lấy từ bảng của máy mình. */
export const titlePillHtml = t => {
  const r = typeof t === 'string' ? titleById(t) : (t && t.id ? titleById(t.id) : null);
  return r ? `<span class="pf-tt" data-tt="${esc(r.id)}">${esc(r.icon)} ${esc(r.name)}</span>` : '';
};
/* CSS của .pf-tt (y hệt shared/css/avatar.css:19 – trang game không nạp avatar.css nên tự chèn 1 lần). */
export function ensureTitleCSS() {
  try {
    if (typeof document === 'undefined' || document.getElementById('tt-css')) return;
    const s = document.createElement('style'); s.id = 'tt-css';
    s.textContent = '.pf-tt{display:inline-flex;align-items:center;gap:5px;padding:2px 10px;border-radius:999px;background:#FACD33;color:#241A38;font:800 12.5px/1.5 Nunito,sans-serif;box-shadow:inset 0 0 0 2px #241A38;white-space:nowrap}';
    document.head.appendChild(s);
  } catch (e) {}
}
/* Vẽ / cập nhật / gỡ pill danh hiệu trên từng hàng của 1 danh sách người chơi.
   container: #plist hoặc #players. players: [{ id, title }] – title là id chuỗi hoặc object.
   Khớp hàng với người chơi: ưu tiên data-id của hàng, không có thì theo thứ tự (chỉ khi số hàng
   bằng số người – các game đều vẽ players.map 1 hàng / 1 người theo đúng thứ tự nên khớp).
   Gọi lại sau mỗi lần game vẽ lại danh sách: pill cũ sai danh hiệu thì thay, người mất danh hiệu thì gỡ,
   vẽ trùng thì thôi (không nhân đôi). */
export function paintTitles(container, players) {
  if (!container || !Array.isArray(players) || !players.length) return;
  ensureTitleCSS();
  const rows = [...(container.children || [])];
  const byId = new Map(players.map(p => [p && p.id, p]));
  rows.forEach((row, i) => {
    let p = null;
    const rid = row.dataset ? row.dataset.id : null;
    if (rid) p = byId.get(rid) || null;
    else if (rows.length === players.length) p = players[i] || null;
    let old = null;
    try { old = row.querySelector('.pf-tt[data-tt]'); } catch (e) {}
    const html = p ? titlePillHtml(p.title) : '';
    if (!html) { if (old) old.remove(); return; }
    if (old) {
      if (old.dataset && old.dataset.tt !== String((typeof p.title === 'string' ? p.title : p.title && p.title.id) || '')) old.outerHTML = html;
      return;
    }
    const nm = row.querySelector('.nm') || row.querySelector('b') || row.querySelector('span') || row;
    try { nm.insertAdjacentHTML('beforeend', ' ' + html); } catch (e) {}
  });
}
