/* Chuyển tab chính mượt (dùng với shared/css/page-trans.css).
   Bấm link nội bộ sang tab khác (Trang chủ ↔ Sảnh chung ↔ Cửa hàng) thì trang
   hiện tại mờ dần + trượt nhẹ (~180ms) rồi mới chuyển trang; trang mới fade-in
   + trượt nhẹ nhờ CSS. Chỉ chặn click trái thường trên link cùng origin tới 1
   trong 3 trang tab chính KHÁC trang hiện tại — modal (Xếp hạng/Hồ sơ), link
   ngoài, link trong game, neo trong trang đều không chạm. Ghi tab cũ vào
   sessionStorage để thanh chỉ báo ở trang mới (topbar.js) trượt từ đó sang.
   Tôn trọng prefers-reduced-motion: chuyển thẳng, không fade. */
(function () {
  var TABS = { '/': 'home', '/index.html': 'home', '/sanh/': 'sanh', '/sanh/index.html': 'sanh', '/shop/': 'shop', '/shop/index.html': 'shop' };
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var navTimer = null;
  function tabOf(path) { return TABS[path] || null; }
  function curTab() { return tabOf(location.pathname); }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var url;
    try { url = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname) return; // cùng trang: neo / reload, không fade
    var to = tabOf(url.pathname);
    if (!to || to === curTab()) return;
    try { sessionStorage.setItem('gumballz-nav-from', curTab()); } catch (err) {}
    if (reduced) return; // chuyển thẳng, không fade
    e.preventDefault();
    document.body.style.animation = 'none'; // gỡ animation fade-in nếu còn đang chạy
    document.body.classList.add('page-leave');
    var href = url.href;
    clearTimeout(navTimer);
    navTimer = setTimeout(function () { location.href = href; }, 180);
  });
  // bfcache / quay lại: gỡ class mờ nếu còn sót
  addEventListener('pageshow', function () { document.body.classList.remove('page-leave'); document.body.style.animation = ''; });
})();
