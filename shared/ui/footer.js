/* Footer chung GumballZ Boardgame (.gmf) — component riêng (patch 20261119-24).
   Trước đây markup footer được dán cứng vào 64 trang; giờ mỗi trang chỉ còn
   <footer class="gmf"></footer> + thẻ script này, markup do file này dựng.
   Chạy đồng bộ lúc parse (script thường, đặt ngay sau thẻ footer) để markup
   có mặt trước mọi script khác trong trang (vd. script trang chủ đọc #foot-online).
   Tiền tố đường dẫn tính theo độ sâu của trang: gốc ./, 1 cấp ../, 2 cấp ../../. */
(function () {
  var GAME_COUNT = 97;

  var parts = location.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (parts.length && parts[parts.length - 1].indexOf('.') !== -1) parts.pop(); // bỏ tên file nếu có
  var depth = parts.length;
  var P = depth === 0 ? './' : '../'.repeat(depth);
  var isHome = depth === 0;

  // 4 nút mạng xã hội kiểu Uiverse imtausef/fuzzy-dragon-2 (patch -114).
  // Mỗi nút = ô vuông 55×55 với 5 lớp <span> xếp chồng (hiệu ứng 3D nhiều
  // lớp) + tooltip hồ sơ bật lên phía trên khi hover. SVG logo TÁI DÙNG từ
  // Simple Icons của bản cũ (chỉ đổi khung + thêm tooltip, không vẽ lại).
  // Avatar trong tooltip = ẢNH THẬT lấy từ chính link đó (kiểm 2026-11-21):
  // FB = ảnh đại diện facebook.com/hungnq188.2k5 (og:image; link có chữ ký,
  // hết hạn ~01/2027 — hỏng thì tự rớt về chữ viết tắt); Zalo KHÔNG lấy được
  // (zalo.me bắt đăng nhập) nên dùng tạm ảnh FB (cùng 1 người); Discord =
  // avatar của tài khoản nughnguyen (người tạo invite dsc.gg/gumballz, lấy
  // từ Discord Invite API công khai); Telegram = ảnh nhóm GumballZ (og:image
  // của t.me/+EkTeXM7l96hiNjI1). Ảnh hỏng (404/hết hạn) → onerror gỡ <img>,
  // còn lại chữ viết tắt (NQ = Nguyễn Quốc Hưng; GZ = GumballZ) như cũ.
  var AV_FB = 'https://scontent-dfw6-2.xx.fbcdn.net/v/t1.30497-1/453178253_471506465671661_2781666950760530985_n.png?stp=dst-jpg_tt6&cstp=mx2048x2048&ctp=s720x720&_nc_cat=1&ccb=1-7&_nc_sid=d00ff1&_nc_ohc=gDYdoPGEgaYQ7kNvwEOpS-Z&_nc_oc=AdqyG-dJW2RlslDTUXLV82d_T0FthAdzLf_bbqP3yhOrGTmODhOgXc-sDJBcYWeeQuFzyaFrWW2E9c1Hb-vNLT3D&_nc_zt=24&_nc_ht=scontent-dfw6-2.xx&_nc_ss=7e20f&oh=00_AQQY0aRH0D8FOsRS3B-qAkmWVrNTarmAqH-9LtD5o-TZPQ&oe=6B28E93A';
  var AV_ZALO = AV_FB; // Zalo không công khai ảnh — dùng tạm ảnh FB.
  var AV_DISCORD = 'https://cdn.discordapp.com/avatars/561443914062757908/495df059b3150c8b05642dc24efa817b.png?size=128';
  var AV_TELEGRAM = 'https://cdn5.telesco.pe/file/oNqvJbKSkvsdD4oS4NxTY4ElJDRgMEZZMtODOFvT6GmecyIj0RvGH_UPjbsT8-SMKcpxk5iAJ-SSg85XxnnEWD-B6RIX-NALw1N3ZMQxDP1YfM3pBMyl-_bl4nmyFWqBvpk3viycKBpf5fRcB30U20mSLPssd54hlrNwcxcuWRWO2jVIddvaZh5Wj1KZm4ZTDoqVoTIc15y60E99dq-YhKy2fHDkwKMegl1jgBklK1LnBot-8yclIW3r44n0KfRHHMWO9NIynE7U0CpDNE5bKZIfQh39tSAdPpS45fmtQnhwFd-Uxgsyb2pDdvwxT3tNfVPqnh9hgDZ0LDiYcVGNLQ.jpg';
  var SVG_FB = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg>';
  var SVG_ZALO = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9436 0 1.0746.8697 1.9453 1.945 1.9453z"/></svg>';
  var SVG_DISCORD = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>';
  var SVG_TELEGRAM = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>';
  function soc(cls, href, label, aria, initials, name, handle, svg, avatar) {
    return '<div class="gmf-tip ' + cls + '">' +
      '<div class="gmf-tip-card"><div class="gmf-tip-prof"><div class="gmf-tip-user"><div class="gmf-tip-img"><img src="' + avatar + '" alt="" onerror="this.remove()"><span>' + initials + '</span></div>' +
      '<div class="gmf-tip-det"><div class="gmf-tip-name">' + name + '</div><div class="gmf-tip-handle">' + handle + '</div></div></div></div></div>' +
      '<div class="gmf-tip-btn"><a href="' + href + '" class="gmf-tip-icon" target="_blank" rel="noopener" aria-label="' + aria + '">' +
      '<div class="gmf-tip-layer"><span></span><span></span><span></span><span></span><span class="gmf-tip-fab">' + svg + '</span></div>' +
      '<div class="gmf-tip-label">' + label + '</div></a></div></div>';
  }

  function build() {
    var foot = document.querySelector('footer.gmf');
    if (!foot) {
      foot = document.createElement('footer');
      foot.className = 'gmf';
      document.body.appendChild(foot);
    }
    // Full-bleed: footer phải là con trực tiếp của <body> thì mới trải hết
    // chiều ngang màn hình. Một số trang đặt <footer> trong <main> (max-width,
    // căn giữa) nên dải CTA vàng + nền mực bị bó hẹp, hai bên còn lề kem.
    // Dời ra ngoài ngay lúc parse — thẻ </main> phía sau vẫn đóng main bình thường.
    if (foot.parentNode !== document.body) document.body.appendChild(foot);
    foot.innerHTML =
      '<div class="gmf-band"><div class="gmf-band-in"><div><h2>SẴN SÀNG CHƠI CHƯA?</h2><p>' + GAME_COUNT + ' game · chơi online cùng bạn bè, miễn phí, không cần cài đặt.</p></div><a class="gmf-cta" href="' + P + '#games">▶ Chơi ngay</a></div></div>' +
      '<div class="gmf-in">' +
      '<div class="gmf-brand"><a class="gmf-logo" href="' + P + '" aria-label="Về trang chủ GumballZ Boardgame"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="56" height="56" aria-hidden="true"><rect x="4" y="4" width="56" height="56" rx="16" fill="#FACD33" stroke="#241A38" stroke-width="3"/><circle cx="32" cy="35" r="16" fill="#FF5A60" stroke="#241A38" stroke-width="3"/><path d="M22 24 Q25 21 29 20.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/><circle cx="25.5" cy="31" r="2.6" fill="#241A38"/><circle cx="38.5" cy="31" r="2.6" fill="#241A38"/><path d="M25 38 Q32 44.5 39 38" fill="none" stroke="#241A38" stroke-width="3" stroke-linecap="round"/><path d="M14 18 Q18 12 25 11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/><circle cx="48" cy="15" r="4.5" fill="#B9A6FF" stroke="#241A38" stroke-width="2.5"/><circle cx="49" cy="49" r="3.5" fill="#2EC5B6" stroke="#241A38" stroke-width="2.5"/></svg><span class="gmf-name">GUMBALLZ<em>BOARDGAME</em></span></a>' +
      '<p>Board game &amp; game bài tiếng Việt — chơi online cùng bạn bè, miễn phí, không cần cài đặt.</p>' +
      '<div class="gmf-chips"><a href="#" data-feedback="">💌 Góp ý / báo lỗi</a><a href="#" data-donate class="donate">☕ Ủng hộ chủ web</a></div>' +
      '<div class="gmf-social">' + soc('facebook', 'https://www.facebook.com/hungnq188.2k5/', 'Facebook', 'Facebook GumballZ', 'NQ', 'Nguyễn Quốc Hưng', '@hungnq188.2k5', SVG_FB, AV_FB) + soc('zalo', 'https://zalo.me/0388205003', 'Zalo', 'Zalo 0388205003', 'GZ', 'GumballZ', '0388205003', SVG_ZALO, AV_ZALO) + soc('discord', 'https://dsc.gg/gumballz', 'Discord', 'Discord GumballZ', 'GZ', 'GumballZ', 'dsc.gg/gumballz', SVG_DISCORD, AV_DISCORD) + soc('telegram', 'https://t.me/+EkTeXM7l96hiNjI1', 'Telegram', 'Telegram GumballZ', 'GZ', 'GumballZ', 't.me/+EkTeXM7l96hiNjI1', SVG_TELEGRAM, AV_TELEGRAM) + '</div></div>' +
      '<nav aria-label="Khám phá"><h3>Khám phá</h3><a href="' + P + '">Trang chủ</a><a href="' + P + 'sanh/">Sảnh chung</a><a href="' + P + 'xephang/">🏆 Xếp hạng</a><a href="' + P + 'luat/">📖 Wiki</a></nav>' +
      '<nav aria-label="Trợ giúp"><h3>Trợ giúp</h3><a href="' + P + 'gioi-thieu/">Giới thiệu</a><a href="' + P + 'credits/">Credits</a><a href="' + P + 'terms/">Điều khoản</a><a href="' + P + 'privacy/">Bảo mật</a></nav>' +
      '</div>' +
      '<div class="gmf-bot"><span>© 2026 GumballZ Boardgame</span>' + (isHome ? '<span id="foot-online">Đang online: —</span>' : '') + '</div>';
    mountTopButton();
  }

  // Nút về đầu trang (.gmf-top): tạo 1 lần, gắn vào <body> (không nằm trong
  // footer để không bị ảnh hưởng bởi layout footer). Vòng tiến độ: r=24 nên
  // chu vi C = 2π×24 ≈ 150.8; dashoffset = C×(1 − p), với p = scrollY /
  // (scrollHeight − clientHeight) — ở 50% trang offset = C/2 nên vòng chạy
  // đúng 1/2 nút. Nút chỉ hiện sau khi cuộn > 400px; trang không cuộn được
  // (max = 0) thì p = 0 và nút luôn ẩn, không lỗi.
  var topBtn = null, topProg = null, TOP_C = 2 * Math.PI * 24;
  function mountTopButton() {
    if (document.getElementById('gmf-top')) return;
    topBtn = document.createElement('button');
    topBtn.type = 'button';
    topBtn.id = 'gmf-top';
    topBtn.className = 'gmf-top';
    topBtn.setAttribute('aria-label', 'Về đầu trang');
    topBtn.setAttribute('aria-hidden', 'true');
    topBtn.innerHTML = '<svg class="gmf-top-ring" viewBox="0 0 56 56" aria-hidden="true"><circle class="gmf-top-track" cx="28" cy="28" r="24"/><circle class="gmf-top-prog" cx="28" cy="28" r="24"/></svg><span class="gmf-top-arrow" aria-hidden="true">↑</span>';
    document.body.appendChild(topBtn);
    topProg = topBtn.querySelector('.gmf-top-prog');
    topProg.style.strokeDasharray = TOP_C;
    topProg.style.strokeDashoffset = TOP_C;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ticking = false;
    function update() {
      ticking = false;
      var de = document.scrollingElement || document.documentElement;
      var max = de.scrollHeight - de.clientHeight;
      var y = window.scrollY || window.pageYOffset || 0;
      var p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      topProg.style.strokeDashoffset = TOP_C * (1 - p);
      var show = y > 400;
      topBtn.classList.toggle('on', show);
      topBtn.setAttribute('aria-hidden', show ? 'false' : 'true');
    }
    function onScroll() { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    topBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
    update();
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);

  // patch -150: link Xếp hạng trong footer giờ là link thường tới trang riêng /xephang/ —
  // không còn mở modal nên bỏ delegation mở leaderboard.js.
})();
