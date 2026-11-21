// 📲 Hộp thoại "Thêm vào màn hình chính" — chơi như 1 game/app, không cần vào lại web. (patch -129)
//   Nạp bằng <script src="…/shared/ui/install.js?v=2"></script> (trang chủ + Sảnh). Không cần import.
//   - Chỉ hiện trên ĐIỆN THOẠI, sau 12 giây chơi; KHÔNG hiện trên máy tính, KHÔNG hiện khi đã mở từ màn hình chính.
//   - Android/Chrome: bắt beforeinstallprompt, nút "Thêm vào màn hình chính" gọi prompt() gốc của trình duyệt.
//   - iOS/Safari (không có beforeinstallprompt): hướng dẫn bằng tay (Chia sẻ → Thêm vào MH chính).
//   - Từ chối ("Để sau" / ✕ / "Đã hiểu") → im 7 ngày (localStorage); đã cài → không hiện nữa.
//   - Đăng ký service worker /sw.js sau khi trang load xong (bọc try/catch — SW lỗi thì web vẫn chạy).
(function () {
  'use strict';
  var LS_SNOOZE = 'gumballz-install-snooze'; // timestamp lần từ chối gần nhất
  var LS_DONE = 'gumballz-installed';        // đã cài app (hoặc đã bấm Thêm và được chấp nhận)
  var SNOOZE_MS = 7 * 864e5;                 // 7 ngày
  var SHOW_DELAY_MS = 12000;                 // hiện sau 12 giây
  var deferredPrompt = null, shown = false, loadAt = Date.now();

  var CSS = '.in-ov{position:fixed;inset:0;z-index:10070;display:flex;align-items:flex-end;justify-content:center;background:rgba(36,26,56,.55);animation:in-f .18s ease-out}\n'
    + '.in-box{width:min(440px,100%);box-sizing:border-box;background:var(--card);color:var(--ink);border:2px solid var(--ink);border-bottom:0;border-radius:24px 24px 0 0;box-shadow:0 -8px 30px var(--sh-soft);padding:18px 18px calc(18px + env(safe-area-inset-bottom));font:600 15px/1.5 Nunito,system-ui,sans-serif;animation:in-up .25s cubic-bezier(.2,1.2,.4,1);position:relative}\n'
    + '.in-x{position:absolute;top:12px;right:12px;width:36px;height:36px;border:2px solid var(--ink);border-radius:50%;background:var(--card);color:var(--ink);font:800 16px/1 Nunito,sans-serif;cursor:pointer}\n'
    + '.in-head{display:flex;gap:12px;align-items:center;margin-bottom:6px;padding-right:36px}\n'
    + '.in-ic{flex:none;width:56px;height:56px;border:2px solid var(--ink);border-radius:16px;box-shadow:var(--sh-sm);object-fit:cover;background:var(--y1)}\n'
    + '.in-box h2{margin:0;font:800 19px/1.25 "Baloo 2",Nunito,sans-serif;color:var(--ink)}\n'
    + '.in-sub{margin:0 0 12px;color:var(--muted);font-size:14.5px}\n'
    + '.in-steps{margin:0 0 12px;padding:12px 14px;border:2px solid var(--ink);border-radius:14px;background:var(--bg);font-size:14.5px}\n'
    + '.in-steps b{display:block;margin-bottom:4px}\n'
    + '.in-steps ol{margin:0;padding-left:20px}\n'
    + '.in-steps li{margin:2px 0}\n'
    + '.in-go{display:block;width:100%;min-height:50px;border:2px solid var(--ink);border-radius:999px;background:var(--y1);color:var(--ink);font:800 16px Nunito,sans-serif;cursor:pointer;box-shadow:var(--sh)}\n'
    + '.in-go:active{transform:translate(2px,2px);box-shadow:var(--sh-xs)}\n'
    + '.in-later{display:block;width:100%;margin-top:10px;min-height:44px;border:0;background:none;color:var(--muted);font:800 14.5px Nunito,sans-serif;cursor:pointer}\n'
    + '@keyframes in-f{from{opacity:0}}\n'
    + '@keyframes in-up{from{opacity:0;transform:translateY(24px)}}\n'
    + '@media (prefers-reduced-motion:reduce){.in-ov,.in-box{animation:none}}';

  function css() { if (document.getElementById('in-css')) return; var s = document.createElement('style'); s.id = 'in-css'; s.textContent = CSS; document.head.append(s); }
  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function isStandalone() {
    try { if (window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches) return true; } catch (e) {}
    return window.navigator.standalone === true; // iOS
  }
  function isIOS() {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) return true;
    return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1; // iPadOS báo như Mac
  }
  function isMobile() {
    var ua = navigator.userAgent || '';
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) return true;
    try { return window.matchMedia('(pointer: coarse)').matches && Math.min(window.innerWidth, window.innerHeight) <= 820; } catch (e) { return false; }
  }
  function snoozed() { var t = +ls(LS_SNOOZE) || 0; return t > 0 && Date.now() - t < SNOOZE_MS; }
  function snooze() { lsSet(LS_SNOOZE, String(Date.now())); }

  function show() {
    if (shown) return; shown = true; css();
    var ios = isIOS();
    var ov = document.createElement('div'); ov.className = 'in-ov'; ov.id = 'in-ov';
    var box = document.createElement('div'); box.className = 'in-box'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Thêm vào màn hình chính');
    var body = ios
      ? '<div class="in-steps"><b>Cài bằng tay (iPhone/iPad):</b><ol><li>Bấm nút <b>Chia sẻ 📤</b> ở thanh dưới Safari.</li><li>Cuộn xuống, chọn <b>“Thêm vào MH chính”</b>.</li><li>Bấm <b>Thêm</b> — icon GumballZ sẽ nằm ngoài màn hình chính, mở là chơi.</li></ol></div>'
        + '<button type="button" class="in-go" id="in-ok">Đã hiểu</button>'
      : '<button type="button" class="in-go" id="in-ok">➕ Thêm vào màn hình chính</button>';
    box.innerHTML = '<button type="button" class="in-x" id="in-x" aria-label="Đóng">✕</button>'
      + '<div class="in-head"><img class="in-ic" src="/shared/img/brand/icon-192.png" alt="" width="56" height="56"><h2>Thêm GumballZ vào màn hình chính</h2></div>'
      + '<p class="in-sub">Chơi như 1 game — mở là chơi, không cần vào lại web.</p>'
      + body
      + '<button type="button" class="in-later" id="in-no">Để sau</button>';
    ov.append(box); document.body.append(ov);
    var close = function (snoozeIt) { if (snoozeIt) snooze(); ov.remove(); };
    document.getElementById('in-x').onclick = function () { close(true); };
    document.getElementById('in-no').onclick = function () { close(true); };
    ov.addEventListener('click', function (e) { if (e.target === ov) close(true); });
    document.getElementById('in-ok').onclick = function () {
      if (ios) { close(true); return; } // iOS: chỉ hướng dẫn, không có prompt gốc
      var dp = deferredPrompt; deferredPrompt = null;
      if (!dp || !dp.prompt) { close(true); return; }
      try {
        var p = dp.prompt();
        var done = function (accepted) { if (accepted) lsSet(LS_DONE, '1'); else snooze(); close(false); };
        if (p && p.then) p.then(function () { return dp.userChoice; }).then(function (c) { done(c && c.outcome === 'accepted'); }).catch(function () { close(true); });
        else if (dp.userChoice && dp.userChoice.then) dp.userChoice.then(function (c) { done(c && c.outcome === 'accepted'); }).catch(function () { close(true); });
        else close(true);
      } catch (e) { close(true); }
    };
  }

  function maybeShow() {
    if (shown) return;
    if (Date.now() - loadAt < SHOW_DELAY_MS) return; // chưa đủ 12 giây chơi
    if (!isMobile()) return;                          // chỉ điện thoại
    if (isStandalone()) return;                       // đã mở từ màn hình chính
    if (ls(LS_DONE)) return;                          // đã cài
    if (snoozed()) return;                            // vừa từ chối trong 7 ngày
    if (!isIOS() && !deferredPrompt) return;          // Android cần sự kiện cài đặt của trình duyệt
    show();
  }

  function registerSW() {
    try {
      if (!('serviceWorker' in navigator)) return;
      if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    } catch (e) {}
  }

  function init() {
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredPrompt = e; maybeShow(); });
    window.addEventListener('appinstalled', function () { lsSet(LS_DONE, '1'); deferredPrompt = null; });
    if (document.readyState === 'complete') registerSW();
    else window.addEventListener('load', registerSW);
    setTimeout(maybeShow, SHOW_DELAY_MS + 50);
  }
  try { init(); } catch (e) {}

  // Hook cho test/debug (không ảnh hưởng web): ép hiện hộp thoại, kiểm tra điều kiện.
  window.__gumballzInstall = { show: show, maybeShow: maybeShow, isMobile: isMobile, isStandalone: isStandalone, isIOS: isIOS, setDeferred: function (e) { deferredPrompt = e; } };
})();
