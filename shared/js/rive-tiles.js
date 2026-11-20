// 🎬 Animation Rive riêng từng game trên thẻ trang chủ (đợt 1: typhu/cotuong/cangua/camel).
// Gắn canvas vào đúng khối .art của thẻ (chỗ icon SVG cũ) — 88 game còn lại giữ nguyên icon.
// Chạy SAU khi module chính của trang chủ đã chuyển thẻ vào từng .shelf (thẻ module này đặt
// sau module đó trong index.html nên thứ tự chạy được đảm bảo; dù thẻ chưa chuyển thì canvas
// vẫn nằm trong thẻ nên đi theo thẻ vào kệ).
// - Runtime Rive nạp bằng thẻ <script src="shared/js/rive/rive.js"> trước module này;
//   phải gọi setWasmUrl TRƯỚC khi tạo instance đầu tiên.
// - KHÔNG truyền tên animation (tên ghi sai key trong file .riv — truyền tên sẽ không chạy),
//   chỉ dùng autoplay: true.
// - prefers-reduced-motion: không mount, giữ icon SVG cũ. File .riv lỗi: giữ icon SVG cũ.
// - Tạm dừng animation khi thẻ ra khỏi màn hình (IntersectionObserver) để đỡ tốn pin/CPU.
(function () {
  var GAMES = ['typhu', 'cotuong', 'cangua', 'camel'];
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.rive || !window.rive.RuntimeLoader || typeof window.rive.Rive !== 'function') return;
  try { window.rive.RuntimeLoader.setWasmUrl('shared/js/rive/rive.wasm'); } catch (e) { return; }
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var r = en.target._riv;
        if (!r || !en.target._rivLoaded) return;
        try { if (en.isIntersecting) r.play(); else r.pause(); } catch (e) {}
      });
    }, { rootMargin: '80px' });
  }
  GAMES.forEach(function (g) {
    var tile = document.querySelector('#games-grid .tile[data-game="' + g + '"]');
    if (!tile) return;
    var art = tile.querySelector('.art');
    if (!art) return;
    var cv = document.createElement('canvas');
    cv.className = 'riv-cv';
    cv.width = 200; cv.height = 200;
    cv.setAttribute('aria-hidden', 'true');
    art.appendChild(cv);
    var inst;
    try {
      inst = new window.rive.Rive({
        src: 'shared/rive/' + g + '.riv',
        canvas: cv,
        autoplay: true,
        onLoad: function () { cv._rivLoaded = true; tile.classList.add('has-riv'); },
        onLoadError: function () { cv.remove(); }
      });
    } catch (e) { cv.remove(); return; }
    cv._riv = inst;
    if (io) io.observe(cv);
  });
})();
