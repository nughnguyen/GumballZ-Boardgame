/* 🌙 Chế độ tối GumballZ (patch -130) — script thường, nạp sớm.
   - Áp theme ngay khi chạy (đọc localStorage 'gumballz-theme', chưa chọn thì theo hệ thống).
   - window.__gumballzTheme = {current, apply, set, toggle}: nút topbar (#btn-theme) +
     ô chọn trong Cài đặt (#st-theme) dùng chung API này.
   - Khi user chưa chọn (không có 'gumballz-theme'), đổi theo hệ thống lúc đang mở web.
   - Đổi theme không tải lại trang: chỉ đổi <html data-theme>, CSS variables tự đổi theo. */
(function () {
  var KEY = 'gumballz-theme';
  var META_LIGHT = '#FFF8EE', META_DARK = '#17122B';
  function sysDark() { try { return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; } }
  function saved() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function current() { var s = saved(); return s === 'dark' ? 'dark' : s === 'light' ? 'light' : (sysDark() ? 'dark' : 'light'); }
  function apply(theme) {
    var t = theme || current();
    document.documentElement.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'dark' ? META_DARK : META_LIGHT);
    var b = document.getElementById('btn-theme');
    if (b) {
      b.textContent = t === 'dark' ? '☀️' : '🌙';
      b.setAttribute('aria-label', t === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối');
      b.setAttribute('title', t === 'dark' ? 'Chế độ sáng' : 'Chế độ tối');
    }
    var cb = document.getElementById('st-theme');
    if (cb) cb.checked = (t === 'dark');
    try { document.dispatchEvent(new CustomEvent('gumballz-theme', { detail: { theme: t } })); } catch (e) {}
    return t;
  }
  function set(theme) { try { localStorage.setItem(KEY, theme); } catch (e) {} return apply(theme); }
  function toggle() { return set(current() === 'dark' ? 'light' : 'dark'); }
  try {
    var mq = matchMedia('(prefers-color-scheme: dark)');
    var onSys = function () { if (!saved()) apply(); };
    if (mq.addEventListener) mq.addEventListener('change', onSys);
    else if (mq.addListener) mq.addListener(onSys);
  } catch (e) {}
  function wireBtn() {
    var b = document.getElementById('btn-theme');
    if (b && !b.__themeWired) { b.__themeWired = true; b.addEventListener('click', function () { toggle(); }); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireBtn);
  else wireBtn();
  window.__gumballzTheme = { current: current, apply: apply, set: set, toggle: toggle, KEY: KEY };
  apply();
})();
