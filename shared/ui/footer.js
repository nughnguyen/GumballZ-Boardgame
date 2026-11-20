/* Footer chung GumballZ Boardgame (.gmf) — component riêng (patch 20261119-24).
   Trước đây markup footer được dán cứng vào 64 trang; giờ mỗi trang chỉ còn
   <footer class="gmf"></footer> + thẻ script này, markup do file này dựng.
   Chạy đồng bộ lúc parse (script thường, đặt ngay sau thẻ footer) để markup
   có mặt trước mọi script khác trong trang (vd. script trang chủ đọc #foot-online).
   Tiền tố đường dẫn tính theo độ sâu của trang: gốc ./, 1 cấp ../, 2 cấp ../../. */
(function () {
  var GAME_COUNT = 75;

  var parts = location.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (parts.length && parts[parts.length - 1].indexOf('.') !== -1) parts.pop(); // bỏ tên file nếu có
  var depth = parts.length;
  var P = depth === 0 ? './' : '../'.repeat(depth);
  var isHome = depth === 0;

  function build() {
    var foot = document.querySelector('footer.gmf');
    if (!foot) {
      foot = document.createElement('footer');
      foot.className = 'gmf';
      document.body.appendChild(foot);
    }
    foot.innerHTML =
      '<div class="gmf-band"><div class="gmf-band-in"><div><h2>SẴN SÀNG CHƠI CHƯA?</h2><p>' + GAME_COUNT + ' game · chơi online cùng bạn bè, miễn phí, không cần cài đặt.</p></div><a class="gmf-cta" href="' + P + '#games">▶ Chơi ngay</a></div></div>' +
      '<div class="gmf-in">' +
      '<div class="gmf-brand"><a class="gmf-logo" href="' + P + '" aria-label="Về trang chủ GumballZ Boardgame"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="56" height="56" aria-hidden="true"><rect x="4" y="4" width="56" height="56" rx="16" fill="#FFD98E" stroke="#4A3E5C" stroke-width="3"/><circle cx="32" cy="35" r="16" fill="#FFB9CF" stroke="#4A3E5C" stroke-width="3"/><path d="M22 24 Q25 21 29 20.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/><circle cx="25.5" cy="31" r="2.6" fill="#4A3E5C"/><circle cx="38.5" cy="31" r="2.6" fill="#4A3E5C"/><path d="M25 38 Q32 44.5 39 38" fill="none" stroke="#4A3E5C" stroke-width="3" stroke-linecap="round"/><path d="M14 18 Q18 12 25 11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/><circle cx="48" cy="15" r="4.5" fill="#C9BDF3" stroke="#4A3E5C" stroke-width="2.5"/><circle cx="49" cy="49" r="3.5" fill="#ABE0C6" stroke="#4A3E5C" stroke-width="2.5"/></svg><span class="gmf-name">GUMBALLZ<em>BOARDGAME</em></span></a>' +
      '<p>Board game &amp; game bài tiếng Việt — chơi online cùng bạn bè, miễn phí, không cần cài đặt.</p>' +
      '<div class="gmf-chips"><a href="#" data-feedback="">💌 Góp ý / báo lỗi</a><a href="#" data-donate>☕ Ủng hộ chủ web</a></div>' +
      '<div class="gmf-social"><a class="facebook" href="https://www.facebook.com/hungnq188.2k5/" target="_blank" rel="noopener" aria-label="Facebook GumballZ"><span></span><span></span><span></span><span></span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-facebook" viewBox="0 0 16 16" aria-hidden="true"><path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951"></path></svg></a><a class="zalo" href="https://zalo.me/0388205003" target="_blank" rel="noopener" aria-label="Zalo 0388205003"><span></span><span></span><span></span><span></span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16L4 19h16"/></svg></a></div></div>' +
      '<nav aria-label="Khám phá"><h3>Khám phá</h3><a href="' + P + '">Trang chủ</a><a href="' + P + 'sanh/">Sảnh chung</a><a href="#" data-foot-rank>🏆 Xếp hạng</a><a href="' + P + 'luat/">Luật chơi</a></nav>' +
      '<nav aria-label="Trợ giúp"><h3>Trợ giúp</h3><a href="' + P + 'gioi-thieu/">Giới thiệu</a><a href="' + P + 'credits/">Credits</a><a href="' + P + 'terms/">Điều khoản</a><a href="' + P + 'privacy/">Bảo mật</a></nav>' +
      '</div>' +
      '<div class="gmf-bot"><span>© 2026 GumballZ Boardgame</span>' + (isHome ? '<span id="foot-online">Đang online: —</span>' : '') + '<span class="gmf-note">Dự án fan-made phi thương mại · Game bài chỉ chơi bằng chip ảo, không cá cược tiền thật · Không liên kết với dV Giochi, Mattel, VNG/ZingPlay, Yoka Games hay Exploding Kittens.</span></div>';
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);

  // 🏆 Xếp hạng trong footer: trước đây mỗi trang có 1 script inline riêng gắn
  // trực tiếp vào link [data-foot-rank]; giờ gom về 1 chỗ, delegation ở cấp
  // document nhưng chỉ bắt click trong footer (.gmf) để không chạm link khác.
  // Trang chủ trước đây dùng data-rank và không có handler (bấm không làm gì)
  // nên giờ cũng dùng chung data-foot-rank — sửa luôn link chết đó.
  // import() động phân giải theo URL của chính file này (shared/ui/footer.js)
  // nên './leaderboard.js' đã đúng ở mọi độ sâu — không cộng tiền tố P.
  document.addEventListener('click', function (e) {
    var r = e.target && e.target.closest ? e.target.closest('.gmf [data-foot-rank]') : null;
    if (!r) return;
    e.preventDefault();
    import('./leaderboard.js?v=31').then(function (m) { m.openLeaderboard(); }).catch(function () { location.href = P; });
  });
})();
