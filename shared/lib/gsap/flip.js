// 🃏 Lá bài trượt mượt khi tay bài đổi chỗ (xếp lại, đánh bớt lá, bốc thêm) – GSAP Flip.
// GSAP + Flip (Standard License của GreenSock, miễn phí kể cả thương mại) nạp lười từ shared/lib/gsap/ lần đầu cần;
// chưa nạp xong thì vẽ như cũ, không chờ. Người bật "giảm chuyển động" thì bỏ qua.
let G = null, busy = null;
const reduce = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const base = new URL('./', import.meta.url).href;
const js = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.append(s); });
export function loadFlip() {
  if (!G) G = (window.gsap ? Promise.resolve() : js(base + 'gsap.min.js')).then(() => window.Flip ? null : js(base + 'Flip.min.js')).then(() => { window.gsap.registerPlugin(window.Flip); return true; }).catch(() => false);
  return G;
}
const ready = () => !!(window.gsap && window.Flip && window.Flip.getState);
/* flipRender(root, '.pc', 'data-c', () => { root.innerHTML = … }) – gắn data-flip-id theo khoá của lá để Flip nhận ra lá cũ / mới */
export function flipRender(root, sel, key, render, opt = {}) {
  if (!root || reduce() || !ready()) { render(); if (!reduce()) loadFlip(); return; }
  const mark = els => els.forEach(el => { const k = el.getAttribute(key); if (k != null) el.dataset.flipId = k; });
  const old = [...root.querySelectorAll(sel)]; mark(old);
  const state = window.Flip.getState(old); /* lấy vị trí đang trượt dở rồi mới huỷ hiệu ứng cũ – vẽ lại liên tục vẫn mượt */
  if (busy) { busy.kill(); busy = null; }
  render();
  const now = [...root.querySelectorAll(sel)]; mark(now);
  if (!old.length || !now.length) return;
  busy = window.Flip.from(state, { targets: now, duration: opt.dur || 0.28, ease: 'back.out(1.4)', stagger: 0, prune: true, simple: true,
    onEnter: els => window.gsap.fromTo(els, { y: 26, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.24, ease: 'back.out(1.6)', clearProps: 'transform,opacity' }),
    onComplete: () => { busy = null; } });
}
