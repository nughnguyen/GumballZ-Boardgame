// 🎬 Animation Rive trong sảnh chính của game — dùng chung file .riv với thẻ trang chủ.
// Trang game đặt <div class="riv-lobby-wrap"><canvas class="riv-lobby" data-riv="<slug>" width="800" height="400" aria-hidden="true"></canvas></div>
// trong #screen-home (ngay dưới dòng tagline); module này mount file .riv của chính game đó.
// - Runtime nạp bằng <script src="../shared/js/rive/rive.js"> trước module này;
//   phải gọi setWasmUrl TRƯỚC khi tạo instance đầu tiên.
// - KHÔNG truyền tên animation (tên ghi sai key trong file .riv — truyền tên sẽ không chạy),
//   chỉ dùng autoplay: true.
// - prefers-reduced-motion: gỡ khung, giữ trang như cũ. File .riv lỗi: gỡ khung, giữ trang như cũ.
// - Tạm dừng animation khi khung ra khỏi màn hình (IntersectionObserver) để đỡ tốn pin/CPU
//   (vào ván thì #screen-home ẩn đi → observer tự pause).
(function () {
  var cv = document.querySelector('canvas.riv-lobby[data-riv]');
  if (!cv) return;
  var wrap = cv.closest('.riv-lobby-wrap') || cv;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { wrap.remove(); return; }
  if (!window.rive || !window.rive.RuntimeLoader || typeof window.rive.Rive !== 'function') { wrap.remove(); return; }
  var CSS = '.riv-lobby-wrap{width:100%;aspect-ratio:2/1;max-height:220px;border:2px solid #241A38;border-radius:16px;overflow:hidden;box-shadow:4px 4px 0 #241A38;background:#FFF8EE;margin:0 0 12px}.riv-lobby{display:block;width:100%;height:100%}';
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  try { window.rive.RuntimeLoader.setWasmUrl('../shared/js/rive/rive.wasm'); } catch (e) { wrap.remove(); return; }
  var fitCover = (window.rive.Fit && window.rive.Fit.Cover) || 'cover';
  var inst;
  try {
    inst = new window.rive.Rive({
      src: '../shared/rive/' + cv.getAttribute('data-riv') + '.riv?v=3', /* ?v=3: bản full-board — tránh trình duyệt giữ cache file cũ */
      canvas: cv,
      autoplay: true,
      fit: fitCover,
      onLoad: function () { cv._rivLoaded = true; wrap.classList.add('has-riv'); },
      onLoadError: function () { wrap.remove(); }
    });
  } catch (e) { wrap.remove(); return; }
  cv._riv = inst;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!cv._rivLoaded) return;
        try { if (en.isIntersecting) inst.play(); else inst.pause(); } catch (e) {}
      });
    }, { rootMargin: '80px' }).observe(cv);
  }
})();
