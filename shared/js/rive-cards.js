/* Rive pilot cho trang chủ: canvas animation thay icon SVG ở 4 ô game đầu kệ Cờ bàn
   + các card trong carousel game hot (#hot-row).
   - Chỉ chạy khi trình duyệt không bật giảm chuyển động.
   - SVG luôn ở lại làm fallback: chỉ ẩn khi .riv load xong; lỗi thì hiện lại SVG.
   - Tạm dừng khi card khuất màn hình (IntersectionObserver), chạy lại khi hiện ra.
   - Runtime Rive vendor sẵn ở shared/js/rive/ (xem shared/rive/README.md).
   - Chỉ các card pilot có Rive — không khởi tạo 56 instance cùng lúc.
*/
(function () {
  'use strict';
  var RIVS = [
    { src: 'shared/rive/vehicles.riv', stateMachine: 'bumpy' },
    { src: 'shared/rive/off-road-car.riv', animations: 'bouncing' },
    { src: 'shared/rive/skills.riv', animations: 'Expert_idle' },
  ];
  var WASM = 'shared/js/rive/rive.wasm';
  var WASM_FALLBACK = 'shared/js/rive/rive_fallback.wasm';
  var next = 0;
  var live = new Set(); // {r, canvas}
  var io = null;

  function pick() { var c = RIVS[next % RIVS.length]; next++; return c; }

  function setupIO() {
    if (io || !('IntersectionObserver' in window)) return;
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var rec = e.target.__riveRec;
        if (!rec || !rec.r) return;
        try { if (e.isIntersecting) rec.r.play(); else rec.r.pause(); } catch (err) { /* ignore */ }
      });
    }, { rootMargin: '80px' });
  }

  function unmount(rec, img) {
    try { if (rec.r) rec.r.cleanup(); } catch (e) { /* ignore */ }
    live.delete(rec);
    if (rec.canvas && rec.canvas.parentElement) rec.canvas.parentElement.removeChild(rec.canvas);
    if (img) img.style.display = '';
  }

  // dọn các instance mà canvas đã bị gỡ khỏi DOM (vd: carousel render lại)
  function sweep() {
    live.forEach(function (rec) {
      if (!rec.canvas.isConnected) {
        try { if (rec.r) rec.r.cleanup(); } catch (e) { /* ignore */ }
        live.delete(rec);
      }
    });
  }

  function mount(img, cfg) {
    if (!img || img.__riveDone) return;
    img.__riveDone = true;
    var art = img.parentElement;
    if (!art) return;
    var cv = document.createElement('canvas');
    cv.className = 'rive-cv';
    cv.setAttribute('aria-hidden', 'true');
    art.appendChild(cv);
    var rec = { r: null, canvas: cv };
    cv.__riveRec = rec;
    live.add(rec);
    var params = {
      src: cfg.src,
      canvas: cv,
      autoplay: true,
      layout: new rive.Layout({ fit: rive.Fit.Contain, alignment: rive.Alignment.Center }),
      onLoad: function () {
        img.style.display = 'none';
        try { rec.r.resizeToCanvas(); } catch (e) { /* ignore */ }
        if (io) io.observe(cv);
      },
      onLoadError: function () { unmount(rec, img); },
    };
    if (cfg.stateMachine) params.stateMachine = cfg.stateMachine;
    if (cfg.animations) params.animations = cfg.animations;
    try { rec.r = new rive.Rive(params); }
    catch (e) { unmount(rec, img); }
  }

  function initTiles() {
    var tiles = document.querySelectorAll('#shelf-board .shelf-row .tile');
    var n = 0;
    tiles.forEach(function (t) {
      if (n >= 4) return;
      var img = t.querySelector('.art .ic');
      if (!img) return;
      n++;
      mount(img, pick());
    });
  }

  function initHot() {
    document.querySelectorAll('#hot-row .hot-card').forEach(function (card) {
      var img = card.querySelector('.hot-art img');
      if (img) mount(img, pick());
    });
  }

  function init() {
    if (typeof rive === 'undefined') return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try {
      rive.RuntimeLoader.setWasmUrl(WASM);
      rive.RuntimeLoader.setWasmFallbackUrl(WASM_FALLBACK);
    } catch (e) { /* ignore */ }
    setupIO();
    initTiles();
    initHot();
    window.__riveLive = live; // cho test kiểm tra: Set<{r, canvas}>
    var row = document.getElementById('hot-row');
    if (row && 'MutationObserver' in window) {
      new MutationObserver(function () { sweep(); initHot(); }).observe(row, { childList: true });
    }
    window.addEventListener('resize', function () {
      live.forEach(function (rec) { try { if (rec.r) rec.r.resizeToCanvas(); } catch (e) { /* ignore */ } });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
