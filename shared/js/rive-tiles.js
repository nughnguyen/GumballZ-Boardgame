// 🎬 Animation Rive riêng từng game trên thẻ trang chủ — KHỔ RỘNG
// (đợt 1 làm lại: typhu/cotuong/cangua/camel + đợt 2: uno/tienlen/catte/
// bacao/xidach/poker/solitaire/bang + đợt 3: scribble/meono/tamquoc/
// masoi/thathaythach/baitan/loto/covua + đợt 4: tala/cholon/tusac/bantau/
// oanquan/caro/tictactoe/memory + đợt 5: covay/cothu/ranvathang/sam/
// daochinh/xiecthu/cuuho/khaihoang + đợt 6: xuyenviet/noitu/baucua/
// giandiep/codam/lieng/maubinh/xito + đợt 7: colat/domino/connect4/
// matthu/avalon/spyfall/sudoku/wordle + đợt 8: domi/s2048/matchu/
// loveletter/sushigo/lay6/saboteur/skull + đợt 9: hanabi/chan/totom/
// carcassonne/azul/splendor/conhay/backgammon + đợt 10: rummikub/quoridor/
// blokus/scrabble/mastermind/ailatrieuphu/haithat1gia/doanhdong/wavelength/resistance/vetruyentin/tetris/ransanmoi/xepkeo/banbong/nonogram — 84 game,
// 16 game còn lại làm sau).
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
  var GAMES = ['typhu', 'cotuong', 'cangua', 'camel', 'uno', 'tienlen', 'catte', 'bacao', 'xidach', 'poker', 'solitaire', 'bang', 'scribble', 'meono', 'tamquoc', 'masoi', 'thathaythach', 'baitan', 'loto', 'covua', 'tala', 'cholon', 'tusac', 'bantau', 'oanquan', 'caro', 'tictactoe', 'memory', 'covay', 'cothu', 'ranvathang', 'sam', 'daochinh', 'xiecthu', 'cuuho', 'khaihoang', 'xuyenviet', 'noitu', 'baucua', 'giandiep', 'codam', 'lieng', 'maubinh', 'xito', 'colat', 'domino', 'connect4', 'matthu', 'avalon', 'spyfall', 'sudoku', 'wordle', 'domi', 's2048', 'matchu', 'loveletter', 'sushigo', 'lay6', 'saboteur', 'skull', 'hanabi', 'chan', 'totom', 'carcassonne', 'azul', 'splendor', 'conhay', 'backgammon', 'rummikub', 'quoridor', 'blokus', 'scrabble', 'mastermind', 'ailatrieuphu', 'haithat1gia', 'doanhdong', 'wavelength', 'resistance', 'vetruyentin', 'tetris', 'ransanmoi', 'xepkeo', 'banbong', 'nonogram', 'ghephinh', 'nhen', 'bida8', 'dapenalty', 'phitieu', 'keobuabao', 'dovui', 'hoisanquai'];
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.rive || !window.rive.RuntimeLoader || typeof window.rive.Rive !== 'function') return;
  try { window.rive.RuntimeLoader.setWasmUrl('shared/js/rive/rive.wasm'); } catch (e) { return; }
  var fitCover = (window.rive.Fit && window.rive.Fit.Cover) || 'cover';
  /* v6: runtime Rive KHÔNG đọc option `fit:` ở top-level của constructor —
     Rive chỉ đọc `params.layout` (mặc định Layout mới = Fit.Contain). Vì
     vậy `fit: 'cover'` bao lâu nay bị bỏ qua, mount nào cũng render dạng
     Contain → artboard 400×200 co vừa khung 214×104 (tỉ lệ 2,058:1) để lại
     2 viền trong suốt 3px 2 bên (màu header lộ ra). Phải truyền Layout với
     Fit.Cover thì artboard mới lấp kín khung (đã đo: layout Cover → mép
     alpha 255 từ x=0; layout Contain → 3px trong suốt — đúng vết lỗi). */
  var layoutCover = null;
  try {
    if (window.rive.Layout && window.rive.Fit && window.rive.Fit.Cover) {
      layoutCover = new window.rive.Layout({ fit: window.rive.Fit.Cover, alignment: (window.rive.Alignment && window.rive.Alignment.Center) || 'center' });
    }
  } catch (e) { layoutCover = null; }
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
        src: 'shared/rive/' + g + '.riv?v=5', /* ?v=5 (-116): tile uno/bang/xiecthu mới — tránh trình duyệt giữ cache file cũ */
        canvas: cv,
        autoplay: true,
        fit: fitCover,
        layout: layoutCover,
        onLoad: function () { cv._rivLoaded = true; tile.classList.add('has-riv'); },
        onLoadError: function () { cv.remove(); }
      });
    } catch (e) { cv.remove(); return; }
    cv._riv = inst;
    if (io) io.observe(cv);
  });

  /* ===== thẻ hot (carousel 🔥 Đang hot): mount .riv của từng game vào .hot-art =====
     Thẻ hot render sau (live/fallback) và render lại mỗi lần có số liệu mới nên dùng
     MutationObserver trên #hot-row; mỗi lần render lại thì cleanup instance cũ của
     chính game đó trước khi mount mới (tránh rò WebGL context).
     Khung .hot-art tỉ lệ 2:1 đúng artboard 400×200 nên Fit.Cover lấp kín, không viền. */
  var hotRow = document.querySelector('#hot-row');
  var hotInst = {}; /* slug -> Rive instance đang gắn */
  function mountHot(card) {
    if (!card || !card.dataset || !card.dataset.game) return;
    var g = card.dataset.game;
    var art = card.querySelector('.hot-art');
    if (!art || art.querySelector('canvas.riv-cv')) return;
    if (hotInst[g]) { try { hotInst[g].cleanup(); } catch (e) {} delete hotInst[g]; }
    var cv = document.createElement('canvas');
    cv.className = 'riv-cv';
    cv.width = 800; cv.height = 400;
    cv.setAttribute('aria-hidden', 'true');
    art.appendChild(cv);
    var inst;
    try {
      inst = new window.rive.Rive({
        src: 'shared/rive/' + g + '.riv?v=5', /* ?v=5 (-116): tile uno/bang/xiecthu mới — tránh trình duyệt giữ cache file cũ */
        canvas: cv,
        autoplay: true,
        fit: fitCover,
        layout: layoutCover,
        onLoad: function () { cv._rivLoaded = true; card.classList.add('has-riv'); },
        onLoadError: function () { try { if (inst) inst.cleanup(); } catch (e) {} cv.remove(); }
      });
    } catch (e) { cv.remove(); return; }
    cv._riv = inst;
    hotInst[g] = inst;
    if (io) io.observe(cv);
  }
  if (hotRow && 'MutationObserver' in window) {
    hotRow.querySelectorAll('.hot-card[data-game]').forEach(mountHot);
    new MutationObserver(function (muts) {
      muts.forEach(function (mu) {
        mu.addedNodes.forEach(function (n) {
          if (n.nodeType === 1 && n.classList && n.classList.contains('hot-card')) mountHot(n);
        });
      });
    }).observe(hotRow, { childList: true });
  }
})();
