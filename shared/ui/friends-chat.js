// 🤝 Hộp chat bạn bè neo góc phải dưới kiểu Messenger – KHÔNG sửa shared/ui/friends.js:
// module này chỉ "đắp thêm" lên hộp Bạn bè đã có:
//   • từ 641px trở lên: hộp nằm góc phải dưới, không che trang, bấm tiêu đề / nút – để thu gọn;
//   • mọi cỡ màn hình: luôn một cột (danh sách ↔ khung chat, nút ← quay lại);
//   • bấm hình đại diện / tên bạn bè (data-prof) → mở hồ sơ thành viên (shared/ui/member.js).
// Dùng: import('…/shared/ui/friends-chat.js?v=1') một lần (vd. trong mountAccount) là tự bật; cũng có thể gọi mountFriendsDock() tay.
// Chỉ cần nạp module này là hiệu lực – không cần sửa friends.js hay account.js ngoài một dòng import.
const CSS = `.bf-min{display:none;border:0;background:#f0e6da;color:#4A3E5C;width:34px;height:34px;border-radius:50%;font:800 16px Nunito,sans-serif;cursor:pointer;flex:none}
[data-prof]{cursor:pointer}
/* một cột ở mọi cỡ màn hình: danh sách ↔ khung chat (nút ← quay lại) */
#bf-ov .bf-body{grid-template-columns:1fr}
#bf-ov .bf-mod[data-chat="0"] .bf-chat{display:none}
#bf-ov .bf-mod[data-chat="1"] .bf-side{display:none}
#bf-ov .bf-mod[data-chat="1"] .bf-bk{display:inline-block}
/* máy tính: hộp chat neo góc phải dưới kiểu Messenger, không che trang, thu gọn được */
@media (min-width:641px){
  #bf-ov{inset:auto 18px 0 auto;background:none;padding:0;display:block;pointer-events:none}
  #bf-ov .bf-mod{pointer-events:auto;width:360px;height:min(520px,calc(100dvh - 80px));border-radius:18px 18px 0 0;box-shadow:0 8px 40px #0006,0 0 0 1.5px #ecdfd0}
  #bf-ov .bf-hd{padding:8px 12px;cursor:pointer;flex-wrap:nowrap}
  #bf-ov .bf-hd h2{font-size:17px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #bf-ov .bf-mod[data-chat="1"] .bf-tag{display:none}
  #bf-ov .bf-min{display:block}
  #bf-ov .bf-mod.min{height:auto}
  #bf-ov .bf-mod.min .bf-body,#bf-ov .bf-mod.min .bf-tag{display:none}
}`;
function injectCss() {
  if (document.getElementById('gumballz-fc-css')) return;
  const s = document.createElement('style'); s.id = 'gumballz-fc-css'; s.textContent = CSS; document.head.append(s);
}
/* gắn nút thu gọn + data-prof cho hộp Bạn bè đang mở (friends.js vẽ lại danh sách/chat mỗi lần poll nên phải gắn lại) */
function enhance() {
  const ov = document.getElementById('bf-ov'); if (!ov) return;
  for (const hd of ov.querySelectorAll('.bf-hd')) {
    if (hd.querySelector('.bf-min')) continue;
    const x = hd.querySelector('.bf-x');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'bf-min'; b.setAttribute('aria-label', 'Thu gọn'); b.textContent = '–';
    if (x) hd.insertBefore(b, x); else hd.append(b);
  }
  for (const av of ov.querySelectorAll('.bf-it[data-open] .bf-av')) {
    const it = av.closest('.bf-it'); if (it && !av.dataset.prof) av.dataset.prof = it.dataset.open;
  }
  for (const chat of ov.querySelectorAll('.bf-chat[data-fid]')) {
    const fid = chat.dataset.fid; if (!fid) continue;
    for (const el of chat.querySelectorAll('.bf-chd .bf-av, .bf-chd > b')) if (!el.dataset.prof) el.dataset.prof = fid;
  }
}
export function mountFriendsDock() {
  if (typeof document === 'undefined') return;
  injectCss(); enhance();
  if (window.__gumballzFriendsDockOn) return;
  window.__gumballzFriendsDockOn = true;
  /* bấm hình / tên bạn bè → mở hồ sơ (capture để chặn luôn handler mở chat của friends.js) */
  document.addEventListener('click', e => {
    const t = e.target; if (!t || !t.closest) return;
    const pr = t.closest('[data-prof]');
    if (!pr || !pr.closest('#bf-ov')) return;
    e.stopPropagation(); e.preventDefault();
    import('./member.js?v=5').then(m => m.openMember(+pr.dataset.prof)).catch(() => {});
  }, true);
  /* bấm tiêu đề hộp (trừ nút đóng ✕ và nút sao chép mã) → thu gọn / mở lại */
  document.addEventListener('click', e => {
    const t = e.target; if (!t || !t.closest) return;
    const hd = t.closest('#bf-ov .bf-hd'); if (!hd) return;
    if (t.closest('.bf-x, .bf-tag')) return;
    hd.closest('.bf-mod')?.classList.toggle('min');
  });
  try {
    const mo = new MutationObserver(() => enhance());
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
}
mountFriendsDock();
