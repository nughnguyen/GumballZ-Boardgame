/* Topbar chung GumballZ Boardgame (.nav + .tabbar) — component riêng.
   Trước đây markup topbar chỉ có ở trang chủ (index.html dán cứng); giờ Sảnh chung
   và Cửa hàng dùng chung component này nên 3 trang tab chính hiện topbar như nhau.
   Mỗi trang chỉ còn <div id="topbar"></div> + thẻ script này, markup do file này dựng.
   Chạy đồng bộ lúc parse (script thường, đặt ngay chỗ topbar) để markup có mặt trước
   mọi script khác trong trang (vd. script trang chủ đọc #nav, #gq-top).
   Tiền tố đường dẫn tính theo độ sâu của trang: gốc ./, 1 cấp ../ (giống footer.js).
   Trang hiện tại tự nhận từ đường dẫn: '' → Trang chủ, 'sanh' → Sảnh chung,
   'shop' → Cửa hàng (tô active đúng mục nav + tab dưới). import() động phân giải
   theo URL của chính file này (shared/ui/topbar.js) nên './x.js' đã đúng ở mọi
   độ sâu — không cộng tiền tố P cho import. */
(function () {
  var parts = location.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (parts.length && parts[parts.length - 1].indexOf('.') !== -1) parts.pop(); // bỏ tên file nếu có
  var depth = parts.length;
  var P = depth === 0 ? './' : '../'.repeat(depth);
  var page = parts[0] === 'sanh' ? 'sanh' : parts[0] === 'shop' ? 'shop' : (parts.length === 0 ? 'home' : 'game'); /* patch -112: trang game (vd. /typhu/) là 'game', không phải 'home' — trước đây nhầm thành home nên href './'/'sanh/' trỏ sai */
  var isHome = page === 'home';

  var GEAR = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.900 2.900l-.1-.1a1.700 1.700 0 0 0-1.800-.300 1.700 1.700 0 0 0-1 1.500V21a2 2 0 1 1-4 0v-.100a1.700 1.700 0 0 0-1.100-1.500 1.700 1.700 0 0 0-1.800.300l-.100.100a2 2 0 1 1-2.900-2.900l.100-.100a1.700 1.700 0 0 0 .300-1.800 1.700 1.700 0 0 0-1.500-1H3a2 2 0 1 1 0-4h.100a1.700 1.700 0 0 0 1.500-1.100 1.700 1.700 0 0 0-.300-1.800l-.100-.100a2 2 0 1 1 2.900-2.900l.100.100a1.700 1.700 0 0 0 1.800.300H9a1.700 1.700 0 0 0 1-1.500V3a2 2 0 1 1 4 0v.100a1.700 1.700 0 0 0 1 1.500 1.700 1.700 0 0 0 1.800-.300l-.100-.100a2 2 0 1 1 2.900 2.900l.100.100a1.700 1.700 0 0 0-.300 1.800V9a1.700 1.700 0 0 0 1.500 1H21a2 2 0 1 1 0 4h-.100a1.700 1.700 0 0 0-1.500 1z"/></svg>';

  function navA(href, label, cur) { return '<a href="' + href + '"' + (cur ? ' class="active" aria-current="page"' : '') + '>' + label + '</a>'; }
  var homeHref = isHome ? './' : P;
  var sanhHref = isHome ? 'sanh/' : P + 'sanh/';
  var shopHref = isHome ? 'shop/' : P + 'shop/';

  var header =
    '<header class="nav' + (page === 'game' ? ' game' : '') + '" id="nav"><div class="nav-in">' + /* patch -112: class "game" để CSS xếp lại topbar trên trang game (cao ~72px, không ô tìm kiếm, menu giữa hơi lệch trái) */
    '<a class="brand" href="' + homeHref + '" aria-label="GumballZ Boardgame – trang chủ"><span class="wm"><span class="actual-text">&nbsp;GUMBALLZ&nbsp;</span><span aria-hidden="true" class="hover-text">&nbsp;GUMBALLZ&nbsp;</span><span aria-hidden="true" class="auto-text">&nbsp;GUMBALLZ&nbsp;</span><small>Boardgame</small></span></a>' + /* patch -124: logo chữ kiểu Uiverse quick-chicken-50 (2 lớp tràn khi hover + sweep RGB tự động), icon MARK đã bỏ */
    '<form class="nav-search" id="nav-search" role="search"><input id="gq-top" type="search" placeholder="🔎 Tìm game…" aria-label="Tìm game theo tên" autocomplete="off"></form>' +
    '<nav class="links" aria-label="Điều hướng">' +
    navA(homeHref, 'Trang chủ', page === 'home') +
    navA(sanhHref, 'Sảnh chung', page === 'sanh') +
    navA(shopHref, 'Cửa hàng', page === 'shop') +
    '<button type="button" data-rank>Xếp hạng</button>' +
    '<button type="button" id="btn-prof-nav">Hồ sơ</button>' +
    '<button type="button" data-donate>Ủng hộ</button>' +
    '<i class="nav-ind" aria-hidden="true"></i>' +
    '</nav>' +
    '<div class="acct"><a class="xupill" id="btn-xu" href="' + shopHref + '" aria-label="Ví xu — mở Cửa hàng"><b>100</b><span class="xu-t"> xu</span></a><button class="loginbtn" id="btn-login" type="button" aria-label="Điểm danh hằng ngày — nhận xu" title="Điểm danh hằng ngày">🎁<i class="lg-dot" id="lg-dot" hidden></i></button><button class="setbtn" id="btn-set" type="button" aria-label="Cài đặt" title="Cài đặt">' + GEAR + '</button><span id="acct"></span></div>' +
    '</div></header>';

  var tabHome = isHome
    ? '<button type="button" data-home aria-current="page">🏠<span>Trang chủ</span></button>'
    : '<a href="' + homeHref + '">🏠<span>Trang chủ</span></a>';
  var tabbar =
    '<nav class="tabbar" aria-label="Điều hướng chính">' +
    tabHome +
    '<a href="' + sanhHref + '"' + (page === 'sanh' ? ' aria-current="page"' : '') + '>🌐<span>Sảnh</span></a>' +
    '<button type="button" data-rank>🏆<span>Xếp hạng</span></button>' +
    '<button type="button" id="btn-prof-m">👤<span>Hồ sơ</span></button>' +
    '<i class="tab-ind" aria-hidden="true"></i></nav>';

  var ph = document.getElementById('topbar');
  if (ph) ph.outerHTML = header;
  else if (document.body) document.body.insertAdjacentHTML('afterbegin', header);
  // tab dưới chèn cuối body sau khi parse xong (như trang chủ trước đây đặt sau </main>)
  function addTab() {
    if (document.querySelector('.tabbar')) return;
    document.body.insertAdjacentHTML('beforeend', tabbar);
    wireTabbar();
    placeTabInitial();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addTab);
  else addTab();

  /* ---------- nối JS của topbar (chuyển nguyên từ script inline của trang chủ) ---------- */
  // tài khoản (nút Đăng nhập / tên + menu trong #acct)
  import('./antidebug.js?v=1').catch(function () {}); /* 🛡️ chống mở DevTools (mức răn đe, patch -107) */
  import('./account.js?v=52').then(function (m) { m.mountAccount(document.getElementById('acct')); }).catch(function () {});
  // hồ sơ: mở modal ở 2 nút còn lại (#btn-prof-nav, #btn-prof-m) — nút avatar tròn #btn-prof đã bỏ (patch -105), avatar chỉ còn ở nút tên tài khoản #acct
  import('./profile.js?v=55').then(function (m) {
    m.profileCss();
    var bn = document.getElementById('btn-prof-nav'); if (bn) bn.onclick = function () { m.openProfile(); };
    var bm = document.getElementById('btn-prof-m'); if (bm) bm.onclick = function () { m.openProfile(); };
  }).catch(function () {});
  // pill xu: hiện số dư, cập nhật khi ví đổi
  import('./wallet.js?v=7').then(function (w) {
    var x = document.getElementById('btn-xu');
    var dx = function () { if (x) x.querySelector('b').textContent = w.fmt(w.balance()); };
    dx();
    addEventListener('gumballz-wallet', dx);
  }).catch(function () {});
  // điểm danh hằng ngày: nút 🎁 (module tự chèn CSS + modal, tự mở 1 lần/ngày ở trang chủ)
  import('./daily-login.js?v=2').then(function (m) { m.mountDailyLogin(document.getElementById('btn-login')); }).catch(function () {});
  // cài đặt
  var setBtn = document.getElementById('btn-set');
  if (setBtn) setBtn.onclick = function () { import('./settings.js?v=47').then(function (m) { m.openSettings(); }).catch(function () {}); };
  // xếp hạng / Trang chủ: nối cho cả nút trên nav (có sẵn lúc parse) lẫn nút
  // ở tab dưới (chèn sau DOMContentLoaded — xem wireTabbar trong addTab).
  function openRank() { import('./leaderboard.js?v=35').then(function (m) { m.openLeaderboard(); }).catch(function () {}); }
  function goHomeTop() { scrollTo({ top: 0, behavior: 'smooth' }); }
  function wireRankBtn(b) { b.onclick = openRank; }
  function wireHomeBtn(b) { b.onclick = goHomeTop; }
  function wireTabbar() {
    var tab = document.querySelector('.tabbar'); if (!tab) return;
    tab.querySelectorAll('[data-rank]').forEach(wireRankBtn);
    tab.querySelectorAll('[data-home]').forEach(wireHomeBtn);
    var bm = tab.querySelector('#btn-prof-m');
    if (bm) bm.onclick = function () { import('./profile.js?v=55').then(function (m) { m.openProfile(); }).catch(function () {}); };
    // bấm tab nào thì vạch đỏ trượt tới tab đó (điều hướng thật do page-trans.js lo)
    tab.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('a,button') : null;
      if (t && tab.contains(t)) moveTab(tabItems().indexOf(t), true);
    });
  }
  document.querySelectorAll('[data-rank]').forEach(wireRankBtn);
  document.querySelectorAll('[data-home]').forEach(wireHomeBtn);
  // thanh trên đổ bóng khi cuộn
  var nav = document.getElementById('nav');
  var onScroll = function () { nav.classList.toggle('stuck', scrollY > 8); };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  // ô tìm kiếm ở trang con: Enter thì về trang chủ kèm ?q= (trang chủ tự điền + lọc);
  // ở trang chủ thì script lọc của trang chủ đã nối sẵn, component không chạm vào.
  if (!isHome) {
    var f = document.getElementById('nav-search');
    if (f) f.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = (document.getElementById('gq-top').value || '').trim();
      var dest = P + (q ? '?q=' + encodeURIComponent(q) : '');
      /* patch -112: tìm kiếm cũng là rời trang — đang trong ván thì hỏi trước */
      if (leaveMod && leaveConfirm && leaveMod.inMatch(document)) {
        leaveMod.askLeave(document, dest, 'Trang chủ', { confirmBox: leaveConfirm, navigate: function (u) { location.href = u; } });
        return;
      }
      location.href = dest;
    });
  }

  /* ---------- patch -112: topbar luôn hiện cả ở trang game + chặn thoát nhầm giữa ván ----------
     Link điều hướng trong topbar/tabbar (Trang chủ, Sảnh chung, Cửa hàng, pill xu): đang trong
     ván thì hỏi xác nhận rồi mới rời đúng thủ tục của game; không trong ván thì chuyển thẳng.
     Nút mở modal (Xếp hạng, Hồ sơ, Ủng hộ, Cài đặt) không rời trang nên không bị chặn. */
  var leaveMod = null, leaveConfirm = null;
  window.__gumballzTopbar = { inMatch: function () { return leaveMod ? leaveMod.inMatch(document) : false; } }; /* hook cho test */
  Promise.all([import('./topbar-leave.js?v=1'), import('./dialog.js?v=9')]).then(function (ms) {
    leaveMod = ms[0]; leaveConfirm = ms[1].confirmBox;
    window.__gumballzTopbar.leaveMatch = function () { return leaveMod.leaveMatch(document); };
  }).catch(function () {});
  /* capture: chạy trước mọi listener khác (moveNav/moveTab/page-trans) — preventDefault +
     stopPropagation nên vạch chỉ báo không chạy theo và trang không chuyển khi chưa xác nhận */
  document.addEventListener('click', function (e) {
    if (!leaveMod || !leaveConfirm) return; /* module chưa nạp xong: chuyển thẳng như cũ */
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || !a.closest('#nav, .tabbar')) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#') return;
    if (!leaveMod.inMatch(document)) return; /* không trong ván: chuyển thẳng, không hỏi */
    e.preventDefault();
    e.stopPropagation();
    leaveMod.askLeave(document, href, leaveMod.labelFor(a), { confirmBox: leaveConfirm, navigate: function (u) { location.href = u; } });
  }, true);

  /* ---------- thanh chỉ báo đỏ trượt (nav desktop + tab dưới mobile) ---------- */
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // --- nav desktop: .nav-ind trượt theo đúng vị trí + chiều rộng từng mục ---
  var links = document.querySelector('.links');
  var ind = links ? links.querySelector('.nav-ind') : null;
  var curNavEl = null;
  function navItems() { return links ? Array.prototype.slice.call(links.querySelectorAll('a,button')) : []; }
  function activeNavEl() { return links ? (links.querySelector('.active') || links.querySelector('[aria-current="page"]')) : null; }
  function moveNav(el, animate) {
    if (!ind || !el || !links || links.offsetParent === null) return;
    curNavEl = el;
    if (!animate || reduced) ind.style.transition = 'none'; else ind.style.transition = '';
    ind.style.width = el.offsetWidth + 'px';
    ind.style.transform = 'translateX(' + el.offsetLeft + 'px)';
    if (!animate || reduced) { void ind.offsetWidth; ind.style.transition = ''; }
  }
  function tabKeyFromPath(path) {
    var p = (path || '').replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    if (!p.length) return 'home';
    if (p[0] === 'sanh') return 'sanh';
    if (p[0] === 'shop') return 'shop';
    return null;
  }
  function navElForTab(key) {
    var map = { home: 0, sanh: 1, shop: 2 };
    var items = navItems();
    return (key in map) ? (items[map[key]] || null) : null;
  }
  var navFromDone = false;
  function placeNavInitial() {
    var active = activeNavEl(); if (!active) return;
    if (navFromDone) { moveNav(curNavEl || active, false); return; }
    navFromDone = true;
    var from = null;
    try { from = sessionStorage.getItem('gumballz-nav-from'); sessionStorage.removeItem('gumballz-nav-from'); } catch (e) {}
    if (!from) { try { from = tabKeyFromPath(new URL(document.referrer).pathname); } catch (e) {} }
    var fromEl = (from && from !== page) ? navElForTab(from) : null;
    if (fromEl && !reduced) {
      moveNav(fromEl, false);
      requestAnimationFrame(function () { requestAnimationFrame(function () { moveNav(active, true); }); });
    } else moveNav(active, false);
  }
  if (links) {
    /* patch -106: vạch đỏ CHỈ chạy khi bấm hoặc dùng bàn phím (focus) — di chuột qua tab không nhấn thì vạch đứng yên ở tab đang mở, không trượt theo rồi trượt về */
    links.addEventListener('focusin', function (e) {
      var t = e.target.closest ? e.target.closest('a,button') : null;
      if (t && links.contains(t)) moveNav(t, true);
    });
    links.addEventListener('focusout', function () { var a = activeNavEl(); if (a) moveNav(a, true); });
    links.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('a,button') : null;
      if (t && links.contains(t)) moveNav(t, true);
    });
  }
  // --- tab dưới mobile: .tab-ind trượt theo chỉ số tab (4 tab rộng bằng nhau) ---
  var tabInd = null;
  function tabItems() { var t = document.querySelector('.tabbar'); return t ? Array.prototype.slice.call(t.querySelectorAll('a,button')) : []; }
  function tabActiveIndex() {
    var items = tabItems();
    for (var i = 0; i < items.length; i++) if (items[i].getAttribute('aria-current') === 'page') return i;
    return -1; // Cửa hàng không có tab riêng dưới mobile → ẩn vạch
  }
  function moveTab(i, animate) {
    tabInd = tabInd || document.querySelector('.tab-ind');
    if (!tabInd) return;
    if (i < 0) { tabInd.style.opacity = '0'; return; }
    tabInd.style.opacity = '1';
    if (!animate || reduced) tabInd.style.transition = 'none'; else tabInd.style.transition = '';
    tabInd.style.transform = 'translateX(' + (i * 100) + '%)';
    if (!animate || reduced) { void tabInd.offsetWidth; tabInd.style.transition = ''; }
  }
  function placeTabInitial() { moveTab(tabActiveIndex(), false); }
  // modal Xếp hạng / Hồ sơ đóng thì trả cả 2 vạch về tab đang chọn của trang
  var mo = new MutationObserver(function (muts) {
    for (var k = 0; k < muts.length; k++) {
      var removed = muts[k].removedNodes;
      for (var j = 0; j < removed.length; j++) {
        var n = removed[j];
        if (n.nodeType === 1 && (n.id === 'rk-ov' || n.id === 'pf-ov') && !document.getElementById('rk-ov') && !document.getElementById('pf-ov')) {
          var a = activeNavEl(); if (a) moveNav(a, true);
          moveTab(tabActiveIndex(), true);
        }
      }
    }
  });
  if (document.body) mo.observe(document.body, { childList: true, subtree: true });
  // đặt vị trí lần đầu + đặt lại khi font/co giãn xong (Baloo 2 đổi chiều rộng mục nav)
  function placeAll() { placeNavInitial(); placeTabInitial(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', placeAll);
  else placeAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { var c = curNavEl || activeNavEl(); if (c) moveNav(c, false); });
  var rsT = null;
  addEventListener('resize', function () { clearTimeout(rsT); rsT = setTimeout(function () { var c = curNavEl || activeNavEl(); if (c) moveNav(c, false); }, 120); });
  addEventListener('pageshow', function () { var c = curNavEl || activeNavEl(); if (c) moveNav(c, false); placeTabInitial(); });
})();
