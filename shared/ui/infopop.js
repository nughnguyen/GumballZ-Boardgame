// ℹ️ Bong bóng thông tin: rê chuột (desktop) → tooltip; chạm (mobile) → bảng trượt dưới;
// focus bàn phím → tooltip như rê chuột. Dùng cho thành tích + danh hiệu ở hồ sơ / hồ sơ công khai.
// attachInfo(el, getInfo, opts): getInfo() trả { icon, name, how, state?, action? } (action = { label, fn }).
// opts.onActivate: hàm chạy khi bấm chuột (desktop) — vd. chọn danh hiệu để trưng; trên cảm ứng thì
// cú chạm mở bảng thông tin thay vì chạy ngay, nút trong bảng mới gọi onActivate.
let cssOn = false, tipEl = null, sheetOv = null, curEl = null;
export function infoCss() {
  if (cssOn || document.getElementById('ip-css')) { cssOn = true; return; }
  cssOn = true; const l = document.createElement('link'); l.id = 'ip-css'; l.rel = 'stylesheet';
  try { l.href = new URL('./infopop.css?v=1', import.meta.url).href; } catch (e) { l.href = './infopop.css?v=1'; }
  document.head.append(l);
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isTouch = () => { try { return matchMedia('(pointer: coarse)').matches || (window.__ipTouch === true); } catch (e) { return !!window.__ipTouch; } };
if (typeof addEventListener !== 'undefined') addEventListener('pointerdown', e => { try { window.__ipTouch = e.pointerType === 'touch'; } catch (x) {} }, true);
function hideTip() { tipEl?.remove(); tipEl = null; curEl = null; }
function placeTip(el, d) {
  const r = el.getBoundingClientRect(), w = d.offsetWidth, h = d.offsetHeight;
  let x = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), innerWidth - w - 12);
  let y = r.top - h - 8; if (y < 12) y = Math.min(r.bottom + 8, innerHeight - h - 12);
  d.style.left = x + 'px'; d.style.top = Math.max(12, y) + 'px';
}
function showTip(el, info) {
  infoCss(); hideTip(); closeSheet();
  const d = document.createElement('div'); d.className = 'ip-tip'; d.setAttribute('role', 'tooltip');
  d.innerHTML = `<b>${esc(info.icon || '')} ${esc(info.name || '')}</b><small>${esc(info.how || '')}</small>${info.state ? `<span class="st">${esc(info.state)}</span>` : ''}`;
  document.body.append(d); tipEl = d; curEl = el;
  placeTip(el, d);
}
export function closeSheet() { sheetOv?.remove(); sheetOv = null; }
function showSheet(el, info, opts) {
  infoCss(); hideTip(); closeSheet();
  const ov = document.createElement('div'); ov.className = 'ip-ov'; sheetOv = ov;
  ov.innerHTML = `<div class="ip-sheet" role="dialog" aria-modal="true" aria-label="${esc(info.name || '')}"><span class="ip-ic" aria-hidden="true">${esc(info.icon || 'ℹ️')}</span><h4>${esc(info.name || '')}</h4><p>${esc(info.how || '')}</p>${info.state ? `<p class="st">${esc(info.state)}</p>` : ''}<div class="ip-act">${info.action ? `<button type="button" class="ip-go">${esc(info.action.label)}</button>` : ''}<button type="button" class="ip-x">Đóng</button></div></div>`;
  document.body.append(ov);
  const bye = () => closeSheet();
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('.ip-x')) return bye(); const go = e.target.closest('.ip-go'); if (go && info.action) { try { info.action.fn(); } catch (x) {} bye(); } });
  const key = e => { if (e.key === 'Escape') { bye(); removeEventListener('keydown', key, true); } };
  addEventListener('keydown', key, true);
  ov.querySelector('.ip-x').focus();
}
if (typeof addEventListener !== 'undefined') {
  /* cuộn trang/hộp: tooltip bám theo thẻ (chỉ ẩn khi thẻ đã cuộn khỏi màn hình) — không xoá bừa lúc cuộn mượt */
  addEventListener('scroll', () => { if (!tipEl || !curEl) return; const r = curEl.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) hideTip(); else placeTip(curEl, tipEl); }, true);
  addEventListener('resize', () => hideTip());
  addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); }, true);
}
export function attachInfo(el, getInfo, opts = {}) {
  if (!el || el.dataset.ipBound) return; el.dataset.ipBound = '1'; infoCss();
  const info = () => { try { return getInfo() || null; } catch (e) { return null; } };
  el.addEventListener('mouseenter', () => { if (isTouch()) return; const i = info(); if (i) showTip(el, i); });
  el.addEventListener('mouseleave', () => { if (curEl === el) hideTip(); });
  el.addEventListener('focus', () => { const i = info(); if (i) showTip(el, i); });
  el.addEventListener('blur', () => { if (curEl === el) hideTip(); });
  el.addEventListener('click', e => {
    const i = info(); if (!i) return;
    if (isTouch()) { e.preventDefault(); e.stopPropagation(); showSheet(el, i, opts); return; }
    if (opts.onActivate) return; /* desktop: bấm chuột chạy hành động gốc của phần tử (vd. chọn danh hiệu) */
    showSheet(el, i, opts); /* phần tử không có hành động riêng (thẻ thành tích): bấm cũng mở bảng */
  }, true);
}
