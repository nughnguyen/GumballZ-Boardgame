// 🎬 Animation Rive riêng từng game trên thẻ trang chủ — KHỔ RỘNG
// (đợt 1 làm lại: typhu/cotuong/cangua/camel + đợt 2: uno/tienlen/catte/
// bacao/xidach/poker/solitaire/bang + đợt 3: scribble/meono/tamquoc/
// masoi/thathaythach/baitan/loto/covua + đợt 4: tala/cholon/tusac/bantau/
// oanquan/caro/tictactoe/memory + đợt 5: covay/cothu/ranvathang/sam/
// daochinh/xiecthu/cuuho/khaihoang + đợt 6: xuyenviet/noitu/baucua/
// giandiep/codam/lieng/maubinh/xito + đợt 7: colat/domino/connect4/
// matthu/avalon/spyfall/sudoku/wordle — 52 game, 40 game còn lại làm sau).
// Gắn canvas vào đúng khối .art của thẻ — canvas lấp đầy toàn bộ đầu thẻ
// (full tile width × 104px), artboard 400×200 + Fit.Cover.
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
  var GAMES = ['typhu', 'cotuong', 'cangua', 'camel', 'uno', 'tienlen', 'catte', 'bacao', 'xidach', 'poker', 'solitaire', 'bang', 'scribble', 'meono', 'tamquoc', 'masoi', 'thathaythach', 'baitan', 'loto', 'covua', 'tala', 'cholon', 'tusac', 'bantau', 'oanquan', 'caro', 'tictactoe', 'memory', 'covay', 'cothu', 'ranvathang', 'sam', 'daochinh', 'xiecthu', 'cuuho', 'khaihoang', 'xuyenviet', 'noitu', 'baucua', 'giandiep', 'codam', 'lieng', 'maubinh', 'xito', 'colat', 'domino', 'connect4', 'matthu', 'avalon', 'spyfall', 'sudoku', 'wordle'];
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.rive || !window.rive.RuntimeLoader || typeof window.rive.Rive !== 'function') return;
  try { window.rive.RuntimeLoader.setWasmUrl('shared/js/rive/rive.wasm'); } catch (e) { return; }
  var fitCover = (window.rive.Fit && window.rive.Fit.Cover) || 'cover';
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
    cv.width = 800; cv.height = 400;
    cv.setAttribute('aria-hidden', 'true');
    art.appendChild(cv);
    var inst;
    try {
      inst = new window.rive.Rive({
        src: 'shared/rive/' + g + '.riv?v=2', /* ?v=2: bản khổ rộng v5 thay bản vuông v4 — tránh trình duyệt giữ cache file cũ */
        canvas: cv,
        autoplay: true,
        fit: fitCover,
        onLoad: function () { cv._rivLoaded = true; tile.classList.add('has-riv'); },
        onLoadError: function () { cv.remove(); }
      });
    } catch (e) { cv.remove(); return; }
    cv._riv = inst;
    if (io) io.observe(cv);
  });
})();
