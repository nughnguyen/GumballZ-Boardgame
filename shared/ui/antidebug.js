/* Chống mở DevTools — MỨC RĂN ĐE, không phải khóa tuyệt đối (patch 20261119-107).
   SỰ THẬT: không có cách nào chặn tuyệt đối DevTools bằng code web — trình duyệt là
   của người dùng; ai quyết tâm vẫn mở được bằng menu trình duyệt (More tools →
   Developer tools), tắt JavaScript, hoặc dùng trình duyệt khác. Module này chỉ răn đe
   người dùng phổ thông: chặn các đường mở nhanh (phím tắt, chuột phải) + phát hiện
   DevTools đang mở thì che trang lại. KHÔNG dùng `debugger;` trong vòng lặp (đơ trang),
   KHÔNG redirect, KHÔNG xóa dữ liệu, KHÔNG khóa tài khoản. */
(function () {
  if (typeof window === 'undefined' || !window.document) return;
  if (window.__gumballzAntidebug) return; /* chạy 2 lần thì không gắn listener 2 lần */
  var THRESH = 160; /* chênh outer−inner > 160px mới tính là DevTools mở (không nhầm thanh cuộn/công cụ) */
  var overlay = null;

  /* (c) phát hiện DevTools đang mở: DevTools docked làm inner nhỏ hơn outer rõ rệt */
  function isOpen() {
    try {
      return (window.outerWidth - window.innerWidth > THRESH) ||
        (window.outerHeight - window.innerHeight > THRESH);
    } catch (e) { return false; }
  }
  function show() {
    if (overlay) return;
    try {
      overlay = document.createElement('div');
      overlay.id = 'gumballz-antidebug';
      overlay.setAttribute('role', 'alert');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#241A38;color:#FFF8EE;display:grid;place-items:center;text-align:center;padding:24px;font:700 18px/1.6 Nunito,sans-serif';
      overlay.textContent = 'Vui lòng đóng DevTools để tiếp tục chơi.';
      (document.documentElement || document.body).appendChild(overlay);
      if (document.body) document.body.style.visibility = 'hidden'; /* che phần còn lại (overlay là con của <html> nên vẫn hiện) */
    } catch (e) { overlay = null; }
  }
  function hide() {
    if (!overlay) return;
    try { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch (e) {}
    overlay = null;
    try { if (document.body) document.body.style.visibility = ''; } catch (e) {}
  }
  function tick() { if (isOpen()) show(); else hide(); }

  /* (a) chặn phím tắt mở DevTools — chỉ đúng 5 tổ hợp, không chặn phím game khác */
  function onKey(e) {
    var k = e.key || '';
    var blocked = k === 'F12' ||
      (e.ctrlKey && e.shiftKey && (k === 'I' || k === 'i' || k === 'J' || k === 'j' || k === 'C' || k === 'c')) ||
      (e.ctrlKey && (k === 'U' || k === 'u'));
    if (blocked) { e.preventDefault(); e.stopPropagation(); }
  }
  /* (b) chặn chuột phải — ngoại lệ ô nhập text để người dùng vẫn dùng menu chuột phải khi gõ */
  function onCtx(e) {
    var t = e.target || null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    e.preventDefault();
  }

  window.addEventListener('keydown', onKey, true);
  window.addEventListener('contextmenu', onCtx, true);
  window.addEventListener('resize', tick);
  setInterval(tick, 500);
  tick();

  /* (d) hook cho parent kiểm bằng Playwright (vô hại, người dùng thường không thấy) */
  window.__gumballzAntidebug = { check: isOpen, open: show, close: hide };
})();
