/* Footer chung GumballZ Boardgame (.gmf) — component riêng (patch 20261119-24).
   Trước đây markup footer được dán cứng vào 64 trang; giờ mỗi trang chỉ còn
   <footer class="gmf"></footer> + thẻ script này, markup do file này dựng.
   Chạy đồng bộ lúc parse (script thường, đặt ngay sau thẻ footer) để markup
   có mặt trước mọi script khác trong trang (vd. script trang chủ đọc #foot-online).
   Tiền tố đường dẫn tính theo độ sâu của trang: gốc ./, 1 cấp ../, 2 cấp ../../. */
(function () {
  var GAME_COUNT = 76;

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
      '<div class="gmf-social"><a class="facebook" href="https://www.facebook.com/hungnq188.2k5/" target="_blank" rel="noopener" aria-label="Facebook GumballZ"><span></span><span></span><span></span><span></span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-facebook" viewBox="0 0 16 16" aria-hidden="true"><path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951"></path></svg></a><a class="zalo" href="https://zalo.me/0388205003" target="_blank" rel="noopener" aria-label="Zalo 0388205003"><span></span><span></span><span></span><span></span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16L4 19h16"/></svg></a><a class="discord" href="https://dsc.gg/gumballz" target="_blank" rel="noopener" aria-label="Discord GumballZ"><span></span><span></span><span></span><span></span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-discord" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/></svg></a><a class="telegram" href="https://t.me/+EkTeXM7l96hiNjI1" target="_blank" rel="noopener" aria-label="Telegram GumballZ"><span></span><span></span><span></span><span></span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-telegram" viewBox="0 0 16 16" aria-hidden="true"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.287 5.906q-1.168.486-4.666 2.01-.567.225-.595.442c-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294q.39.01.868-.32 3.269-2.206 3.374-2.23c.05-.012.12-.026.166.016s.042.12.037.141c-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8 8 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629q.14.092.27.187c.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.4 1.4 0 0 0-.013-.315.34.34 0 0 0-.114-.217.53.53 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09"/></svg></a></div></div>' +
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
