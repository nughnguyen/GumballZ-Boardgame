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
// - LAZY-MOUNT (patch -136): KHÔNG tạo instance cho cả 92 tile lúc tải trang
//   (trước đây mount eager → 99 instance + 99 lần tải/giải mã .riv dồn 1 lúc,
//   main-thread chặn nhiều giây → Chrome hiện hộp thoại "không phản hồi").
//   Chỉ mount khi tile sắp vào màn hình (cách viewport ≤300px), tạm dừng khi
//   ra khỏi vùng đó, và HỦY instance + gỡ canvas khi tile cuộn xa (>1000px)
//   để số instance đang chạy luôn dưới giới hạn. Trước khi mount, tile hiện
//   icon SVG cũ như fallback. Runtime Rive dùng CHUNG 1 WebGL context cho
//   mọi instance nên giới hạn ở đây là số instance đang chạy, không phải số
//   context.
// - Tạm dừng animation khi thẻ ra khỏi màn hình (IntersectionObserver) để đỡ tốn pin/CPU.
(function () {
  var GAMES = ['typhu', 'cotuong', 'cangua', 'camel', 'uno', 'tienlen', 'catte', 'bacao', 'xidach', 'poker', 'solitaire', 'bang', 'scribble', 'meono', 'tamquoc', 'masoi', 'thathaythach', 'baitan', 'loto', 'covua', 'tala', 'cholon', 'tusac', 'bantau', 'oanquan', 'caro', 'tictactoe', 'memory', 'covay', 'cothu', 'ranvathang', 'sam', 'daochinh', 'xiecthu', 'cuuho', 'khaihoang', 'xuyenviet', 'noitu', 'baucua', 'giandiep', 'codam', 'lieng', 'maubinh', 'xito', 'colat', 'domino', 'connect4', 'matthu', 'avalon', 'spyfall', 'sudoku', 'wordle', 'domi', 's2048', 'matchu', 'loveletter', 'sushigo', 'lay6', 'saboteur', 'skull', 'hanabi', 'chan', 'totom', 'carcassonne', 'azul', 'splendor', 'conhay', 'backgammon', 'rummikub', 'quoridor', 'blokus', 'scrabble', 'mastermind', 'ailatrieuphu', 'haithat1gia', 'doanhdong', 'wavelength', 'resistance', 'vetruyentin', 'tetris', 'ransanmoi', 'xepkeo', 'banbong', 'nonogram', 'ghephinh', 'nhen', 'bida8', 'dapenalty', 'phitieu', 'keobuabao', 'dovui', 'hoisanquai'];
  /* Version riêng từng file .riv (mặc định 6; file nào làm lại thì bump riêng
     để trình duyệt không giữ cache cũ — -122: uno + xiecthu lên v=7). */
  var RIV_VER = { uno: 8, xiecthu: 7 };
  function rivSrc(g) { return 'shared/rive/' + g + '.riv?v=' + (RIV_VER[g] || 6); }
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

  /* ===== lazy-mount (patch -136) ===== */
  var MAX_LIVE = 16; /* số instance Rive đang chạy tối đa cùng lúc */
  var MOUNT_MARGIN = '300px'; /* mount khi tile cách viewport ≤300px */
  var DESTROY_MARGIN = '1000px'; /* hủy khi tile cách viewport >1000px */
  var live = {}; /* key -> { inst, cv, host, game } */
  var keySeq = 0;
  function rectDist(rect) { /* khoảng cách từ rect tới viewport (0 = đang thấy) */
    var vh = window.innerHeight || 0;
    if (rect.bottom < 0) return -rect.bottom;
    if (rect.top > vh) return rect.top - vh;
    return 0;
  }
  function destroyTarget(key) {
    var L = live[key];
    if (!L) return;
    delete live[key];
    try { if (L.inst && typeof L.inst.cleanup === 'function') L.inst.cleanup(); } catch (e) {}
    try { if (L.cv) L.cv.remove(); } catch (e) {}
    try { if (L.host) L.host.classList.remove('has-riv'); } catch (e) {}
  }
  function enforceCap() { /* mount mới mà đã đủ MAX_LIVE → hủy instance xa viewport nhất đang tạm dừng */
    var keys = Object.keys(live);
    if (keys.length < MAX_LIVE) return;
    var worst = null, worstD = -1;
    keys.forEach(function (k) {
      var L = live[k];
      var d = 0;
      try { d = rectDist(L.host.getBoundingClientRect()); } catch (e) { d = 0; }
      if (d > worstD) { worstD = d; worst = k; }
    });
    if (worst && worstD > 0) destroyTarget(worst);
  }
  function mountTarget(host, game, key) {
    if (live[key]) return live[key];
    var art = host.querySelector('.art') || host.querySelector('.hot-art');
    if (!art) return null;
    if (art.querySelector('canvas.riv-cv')) return null;
    enforceCap();
    var cv = document.createElement('canvas');
    cv.className = 'riv-cv';
    cv.width = 800; cv.height = 400;
    cv.setAttribute('aria-hidden', 'true');
    art.appendChild(cv);
    var inst;
    try {
      inst = new window.rive.Rive({
        src: rivSrc(game),
        canvas: cv,
        autoplay: true,
        fit: fitCover,
        layout: layoutCover,
        onLoad: function () { cv._rivLoaded = true; host.classList.add('has-riv'); },
        onLoadError: function () { try { cv.remove(); } catch (e) {} destroyTarget(key); }
      });
    } catch (e) { cv.remove(); return null; }
    cv._riv = inst;
    live[key] = { inst: inst, cv: cv, host: host, game: game };
    return live[key];
  }
  var hasIO = ('IntersectionObserver' in window);
  var mountIO = null, destroyIO = null;
  if (hasIO) {
    /* mount khi vào vùng cách viewport 300px; ra khỏi vùng đó thì pause */
    mountIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var rec = en.target._rivMount;
        if (!rec) return;
        if (en.isIntersecting) {
          var L = live[rec.key];
          if (!L) mountTarget(en.target, rec.game, rec.key);
          else { try { L.inst.play(); } catch (e) {} }
        } else {
          var L2 = live[rec.key];
          if (L2) { try { L2.inst.pause(); } catch (e) {} }
        }
      });
    }, { rootMargin: MOUNT_MARGIN });
    /* hủy khi ra xa viewport hơn 1000px (vùng mount 300px nằm trong vùng này nên không xung đột) */
    destroyIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) return;
        var rec = en.target._rivMount;
        if (!rec) return;
        if (live[rec.key]) destroyTarget(rec.key);
      });
    }, { rootMargin: DESTROY_MARGIN });
  }
  function observeHost(host, game) {
    host._rivMount = { key: 'k' + (++keySeq), game: game };
    if (hasIO) {
      mountIO.observe(host);
      destroyIO.observe(host);
    } else {
      /* trình duyệt rất cũ không có IntersectionObserver: mount eager như trước (fallback) */
      mountTarget(host, game, host._rivMount.key);
    }
  }

  GAMES.forEach(function (g) {
    var tile = document.querySelector('#games-grid .tile[data-game="' + g + '"]');
    if (!tile) return;
    var art = tile.querySelector('.art');
    if (!art) return;
    observeHost(tile, g);
  });

  /* ===== thẻ hot (carousel 🔥 Đang hot): lazy-mount như tile, vào .hot-art =====
     Thẻ hot render sau (live/fallback) và render lại mỗi lần có số liệu mới nên dùng
     MutationObserver trên #hot-row; mỗi lần render lại thì cleanup instance cũ của
     chính game đó trước khi mount mới (tránh rò instance).
     Khung .hot-art tỉ lệ 2:1 đúng artboard 400×200 nên Fit.Cover lấp kín, không viền. */
  var hotRow = document.querySelector('#hot-row');
  var hotByGame = {}; /* slug -> mount key đang gắn */
  function mountHot(card) {
    if (!card || !card.dataset || !card.dataset.game) return;
    var g = card.dataset.game;
    var art = card.querySelector('.hot-art');
    if (!art) return;
    var oldKey = hotByGame[g];
    if (oldKey && live[oldKey] && live[oldKey].host !== card) destroyTarget(oldKey);
    if (card._rivMount) return; /* đã đăng ký observer rồi (render lại cùng node) */
    observeHost(card, g);
    hotByGame[g] = card._rivMount.key;
  }
  function unmountHot(card) {
    if (!card || !card._rivMount) return;
    var g = card.dataset && card.dataset.game;
    if (g && hotByGame[g] === card._rivMount.key) delete hotByGame[g];
    destroyTarget(card._rivMount.key);
    try { if (mountIO) mountIO.unobserve(card); } catch (e) {}
    try { if (destroyIO) destroyIO.unobserve(card); } catch (e) {}
    delete card._rivMount;
  }
  if (hotRow && 'MutationObserver' in window) {
    hotRow.querySelectorAll('.hot-card[data-game]').forEach(mountHot);
    new MutationObserver(function (muts) {
      muts.forEach(function (mu) {
        mu.addedNodes.forEach(function (n) {
          if (n.nodeType === 1 && n.classList && n.classList.contains('hot-card')) mountHot(n);
        });
        mu.removedNodes.forEach(function (n) {
          if (n.nodeType === 1 && n.classList && n.classList.contains('hot-card')) unmountHot(n);
        });
      });
    }).observe(hotRow, { childList: true });
  }
})();
