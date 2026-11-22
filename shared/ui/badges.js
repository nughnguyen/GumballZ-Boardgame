// 🎖️ Huy hiệu huân chương 6 bậc (patch -142, thay pill -95; patch -145: chỉ hiện huy chương, không chữ): Chủ sảnh / Quản sảnh / Hỗ trợ / Nhà Tài Trợ / VIP / DEV.
// Medal theo bản phát thảo "Huy hiệu Huyền Thoại" của user — mỗi bậc 1 hình dáng riêng, nền tối có cực quang.
// CSS ở shared/css/badges.css?v=8 (nạp 1 lần bằng ensureBadgesCSS, kiểu skeleton.js).
// import { ensureBadgesCSS, tierBadges, medalHTML, attachBadgeTilt } from '…/shared/ui/badges.js?v=8'
// tierBadges(u, size): u là {owner, role, supporter, vip, dev, xp, lv} (từ pub()/adminFind/friendsList/leaderboard)
//   hoặc {v, sp} (tin chat Sảnh: v 2=chủ sảnh, 3=Quản sảnh, 4=Mod sảnh, 1=đã đăng nhập; sp 1=nhà tài trợ).
//   size: 'xs' (20px, inline – mặc định) | 'mini' (40px – Hồ sơ/modal thành viên).
//   Trả về HTML các medal + nhãn – có thể nhiều medal cùng lúc (vd. Quản sảnh + Nhà Tài Trợ). Không tự viết lại markup ở từng nơi.
//   Ánh xạ bậc (-142): owner→CHỦ SẢNH; role 2→QUẢN SẢNH (medal lục giác tím của bản phát thảo);
//   role 1→HỖ TRỢ (medal khiên ngọc lục bảo, NHÃN ĐỔI từ "MOD SẢNH" cũ theo bản phát thảo);
//   supporter→NHÀ TÀI TRỢ; vip/dev = cờ máy chủ do Quản trị cấp.
// uid6(id) (patch -108): id tài khoản HIỂN THỊ dạng 6 chữ số theo thứ tự tạo acc (acc đầu tiên = 000001,
// quá 6 số giữ nguyên, không cắt); id NỘI BỘ (số nguyên trong DB/API/token/data-uid) KHÔNG đổi – chỉ đổi lúc hiển thị.
export const uid6 = id => { const s = String(id ?? ''); return s ? s.padStart(6, '0') : ''; };
const BDG_CSS = new URL('../css/badges.css?v=8', import.meta.url).href;
export function ensureBadgesCSS() {
  /* patch -141: Rive đã gỡ khỏi huy hiệu (user quyết 23:30) — KHÔNG gọi ensureBadgeRive() nữa.
     Huy hiệu giờ chỉ còn animation CSS (badges.css). Xem ensureBadgeRive() bên dưới. */
  if (document.getElementById('bdg-css')) return;
  const l = document.createElement('link'); l.id = 'bdg-css'; l.rel = 'stylesheet'; l.href = BDG_CSS;
  document.head.append(l);
}

/* patch -141: toàn bộ phần Rive bên dưới ĐÃ NGỪNG DÙNG (user quyết gỡ Rive khỏi huy hiệu 23:30).
   ensureBadgeRive() giờ là no-op nên không hàm nào trong phần này được gọi nữa; giữ lại code để
   tham khảo/phục hồi nếu sau này cần, file .riv vẫn nằm trong repo. */

// 🎬 Huy hiệu Rive (patch -109): lớp hiệu ứng Rive đè lên pill CSS — chữ tên bậc +
// icon emoji GIỮ LÀ HTML (sắc nét, đổi được), .riv chỉ vẽ vệt sáng/tia lấp lánh/
// hào quang trên nền trong suốt (nền pill vẫn do badges.css quyết định).
// HIỆU NĂNG: runtime là @rive-app/canvas 2.51.0 (renderer Canvas2D, KHÔNG phải
// WebGL) nên KHÔNG bị giới hạn ~16 WebGL context; chi phí còn lại là CPU ->
// tạm dừng bằng IntersectionObserver khi pill ra khỏi màn hình (mẫu rive-tiles.js)
// + canvas nhỏ (~260×44 backing store). Runtime chỉ nạp ở 4 trang (trang chủ /
// shop / typhu / cangua) nên nạp lười bằng script động khi cần.
// prefers-reduced-motion -> không mount (giữ pill CSS). Runtime lỗi -> giữ pill CSS.
export const BADGE_RIV = {
  own: new URL('../rive/badge-own.riv?v=1', import.meta.url).href,
  adm: new URL('../rive/badge-adm.riv?v=1', import.meta.url).href,
  mod: new URL('../rive/badge-mod.riv?v=1', import.meta.url).href,
  sup: new URL('../rive/badge-sup.riv?v=1', import.meta.url).href,
};
const BADGE_RIVE_JS = new URL('../js/rive/rive.js', import.meta.url).href;
const BADGE_RIVE_WASM = new URL('../js/rive/rive.wasm', import.meta.url).href;
export function badgeTierOf(pill) {
  if (!pill || !pill.classList || typeof pill.classList.contains !== 'function') return '';
  for (const t of ['own', 'adm', 'staff', 'sup', 'vip', 'dev']) if (pill.classList.contains('bdg-' + t)) return t;
  return '';
}
export function shouldMountBadgeRive() {
  try {
    if (typeof window === 'undefined' || !window.matchMedia || typeof document === 'undefined') return false;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { return false; }
}
let badgeRiveLoadP = null;
function loadBadgeRive() {
  if (badgeRiveLoadP) return badgeRiveLoadP;
  badgeRiveLoadP = new Promise(resolve => {
    try {
      if (typeof window === 'undefined' || typeof document === 'undefined') return resolve(null);
      if (window.rive && typeof window.rive.Rive === 'function') {
        try { if (window.rive.RuntimeLoader) window.rive.RuntimeLoader.setWasmUrl(BADGE_RIVE_WASM); } catch (e) {}
        return resolve(window.rive);
      }
      const s = document.createElement('script');
      s.src = BADGE_RIVE_JS; s.async = true;
      s.onload = () => {
        try { if (window.rive && window.rive.RuntimeLoader) window.rive.RuntimeLoader.setWasmUrl(BADGE_RIVE_WASM); } catch (e) {}
        resolve(window.rive && typeof window.rive.Rive === 'function' ? window.rive : null);
      };
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    } catch (e) { resolve(null); }
  });
  return badgeRiveLoadP;
}
const badgePending = new Set();
let badgeIO = null;
function badgeIOInit() {
  if (badgeIO || typeof window === 'undefined' || !('IntersectionObserver' in window)) return badgeIO;
  badgeIO = new IntersectionObserver(entries => {
    for (const en of entries) {
      const cv = en.target, r = cv._riv;
      if (!cv.isConnected) { try { if (r) r.cleanup(); } catch (e) {} try { badgeIO.unobserve(cv); } catch (e) {} continue; }
      if (!r || !cv._rivLoaded) continue;
      if (!cv._rivSized) { sizeBadgeCanvas(cv); cv._rivSized = true; }
      try { if (en.isIntersecting) r.play(); else r.pause(); } catch (e) {}
    }
  }, { rootMargin: '80px' });
  return badgeIO;
}
function sizeBadgeCanvas(cv) {
  const pill = cv.parentElement;
  const w = pill && pill.clientWidth ? pill.clientWidth : 130;
  const h = pill && pill.clientHeight ? pill.clientHeight : 22;
  cv.width = Math.max(2, Math.round(w * 2));
  cv.height = Math.max(2, Math.round(h * 2));
}
function hasBadgeCanvas(pill) {
  if (!pill || !pill.children) return false;
  for (const c of pill.children) if (c.classList && c.classList.contains && c.classList.contains('bdg-riv')) return true;
  return false;
}
function badgeCanvasOf(pill) {
  if (!pill || !pill.children) return null;
  for (const c of pill.children) if (c.classList && c.classList.contains && c.classList.contains('bdg-riv')) return c;
  return null;
}
export function mountBadgeRive(pill, rive) {
  const tier = badgeTierOf(pill);
  if (!tier || !rive || typeof rive.Rive !== 'function' || hasBadgeCanvas(pill)) return false;
  const cv = document.createElement('canvas');
  cv.className = 'bdg-riv'; cv.setAttribute('aria-hidden', 'true');
  pill.insertBefore(cv, pill.firstChild);
  sizeBadgeCanvas(cv); /* đo sau khi gắn vào pill (cần parentElement) */
  let inst;
  try {
    let layout = null;
    try { if (rive.Layout && rive.Fit && rive.Fit.Contain) layout = new rive.Layout({ fit: rive.Fit.Contain, alignment: (rive.Alignment && rive.Alignment.Center) || 'center' }); } catch (e) {}
    inst = new rive.Rive({
      src: BADGE_RIV[tier], canvas: cv, autoplay: true, layout,
      onLoad: () => { cv._rivLoaded = true; pill.classList.add('has-riv'); },
      onLoadError: () => { try { if (inst) inst.cleanup(); } catch (e) {} cv.remove(); },
    });
  } catch (e) { cv.remove(); return false; }
  cv._riv = inst;
  const io = badgeIOInit();
  if (io) io.observe(cv);
  return true;
}
function flushBadgePending() {
  if (!badgePending.size) return;
  loadBadgeRive().then(rive => {
    if (!rive) { badgePending.clear(); return; } /* runtime lỗi: giữ pill CSS */
    for (const p of [...badgePending]) {
      badgePending.delete(p);
      if (p.isConnected) mountBadgeRive(p, rive);
    }
  });
}
function collectBadgePills(root, out) {
  if (!root || root.nodeType !== 1) return;
  if (root.classList && root.classList.contains && root.classList.contains('bdg')) out.push(root);
  if (root.querySelectorAll) root.querySelectorAll('.bdg').forEach(p => out.push(p));
}
function queueBadgePills(root) {
  const pills = [];
  collectBadgePills(root, pills);
  for (const p of pills) if (!hasBadgeCanvas(p)) badgePending.add(p);
  flushBadgePending();
}
function cleanupBadgePills(root) {
  const pills = [];
  collectBadgePills(root, pills);
  for (const p of pills) {
    const cv = badgeCanvasOf(p);
    if (cv && cv._riv) { try { cv._riv.cleanup(); } catch (e) {} }
  }
}
export function ensureBadgeRive() {
  /* patch -141: Rive đã gỡ khỏi huy hiệu (user quyết 23:30) — hàm này giờ là no-op, giữ lại để các
     nơi import không vỡ. Trước đây nó cài MutationObserver toàn trang + nạp runtime Rive (~694KB +
     wasm ~2,3MB) mỗi khi pill .bdg xuất hiện → treo trang ở MỌI nơi hiện huy hiệu, không chỉ Quản trị
     (xem -139/-140). Huy hiệu giờ chỉ còn animation CSS (badges.css: shimmer/sweep/bounce/glow/
     twinkle — chính là thứ user vẫn thấy). Các hàm Rive bên dưới (loadBadgeRive, mountBadgeRive...)
     không còn được gọi nữa, giữ lại để tham khảo; file .riv vẫn nằm trong repo. */
  return;
}
/* ===== Huân chương 6 bậc (patch -142) — dữ liệu lấy từ bản phát thảo của user ===== */
const HEX = 'polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)';
const SHD = 'polygon(50% 0,94% 12%,94% 52%,50% 100%,6% 52%,6% 12%)';
const DIA = 'polygon(50% 0,100% 50%,50% 100%,0 50%)';
const OCT = 'polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)';
const STAR12 = 'polygon(50.0% 0.0%,61.1% 8.5%,75.0% 6.7%,80.4% 19.6%,93.3% 25.0%,91.5% 38.9%,100.0% 50.0%,91.5% 61.1%,93.3% 75.0%,80.4% 80.4%,75.0% 93.3%,61.1% 91.5%,50.0% 100.0%,38.9% 91.5%,25.0% 93.3%,19.6% 80.4%,6.7% 75.0%,8.5% 61.1%,0.0% 50.0%,8.5% 38.9%,6.7% 25.0%,19.6% 19.6%,25.0% 6.7%,38.9% 8.5%)';
const STAR20 = 'polygon(50.0% 0.0%,57.2% 4.6%,65.5% 2.4%,70.9% 9.0%,79.4% 9.5%,82.5% 17.5%,90.5% 20.6%,91.0% 29.1%,97.6% 34.5%,95.4% 42.8%,100.0% 50.0%,95.4% 57.2%,97.6% 65.5%,91.0% 70.9%,90.5% 79.4%,82.5% 82.5%,79.4% 90.5%,70.9% 91.0%,65.5% 97.6%,57.2% 95.4%,50.0% 100.0%,42.8% 95.4%,34.5% 97.6%,29.1% 91.0%,20.6% 90.5%,17.5% 82.5%,9.5% 79.4%,9.0% 70.9%,2.4% 65.5%,4.6% 57.2%,0.0% 50.0%,4.6% 42.8%,2.4% 34.5%,9.0% 29.1%,9.5% 20.6%,17.5% 17.5%,20.6% 9.5%,29.1% 9.0%,34.5% 2.4%,42.8% 4.6%)';
const MEDAL_ICONS = {
  crown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 7l5 4.5L12 3l4.5 8.5 5-4.5-2 12.5h-15L2.5 7z"/></svg>',
  wrench: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 6.5a5.5 5.5 0 0 1-7.4 5.1L6.7 19.5a2.1 2.1 0 0 1-3-3l7.9-7.9A5.5 5.5 0 0 1 17.5 2l-3.2 3.2 1.1 3.3 3.3 1.1L22 6.5z"/></svg>',
  coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="#ffd45c"/><circle cx="12" cy="12" r="7.5" fill="none" stroke="#c76a00" stroke-width="1.8"/><path d="M12 6.5v11M9.3 9.6h4.2a1.6 1.6 0 0 1 0 3.2h-3a1.6 1.6 0 0 0 0 3.2h4.4" fill="none" stroke="#c76a00" stroke-width="1.6" stroke-linecap="round"/></svg>',
  gem: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12l4 6-10 12L2 9l4-6z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5l8-3zm-1 13l6-6-1.4-1.4L11 12.2 8.9 10 7.5 11.4 11 15z"/></svg>',
  code: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6 3 12l5 6M16 6l5 6-5 6M13.5 4l-3 16"/></svg>',
};
/* clip: hình dáng · ring: vòng cực quang (conic) · core: nền tối · ic: màu icon · g: màu phát sáng
   label: tên bậc (KHÔNG render — chỉ hiện huy chương, patch -145; giữ để tra cứu/wiki, title dùng `title`) · cls: class .bdg-* · orb/rays/pt/ping: lớp hiệu ứng
   how: cách nhận huy hiệu — hiện trong tooltip khi nhấn vào huy chương (patch -148) */
export const MEDALS = {
  owner: { cls: 'bdg-own', label: 'CHỦ SẢNH', title: 'Người làm ra GumballZ Boardgame', how: 'Chỉ chủ web mới có', clip: STAR12, ring: '#fff2b0,#ffb700,#8a4b00,#ffe27a,#fff2b0,#ffb700,#8a4b00,#ffe27a,#fff2b0', core: 'radial-gradient(circle at 50% 30%,#4f3207,#140a01 78%)', ic: '#ffd35a', g: 'rgba(255,196,60,.85)', icon: 'crown', orb: 1, pt: 16, rays: 1 },
  adm: { cls: 'bdg-adm', label: 'QUẢN SẢNH', title: 'Quản lý Sảnh GumballZ', how: 'Chủ sảnh cấp quyền Quản trị', clip: HEX, ring: '#ff5c9a,#8a5cff,#27d3ff,#8a5cff,#ff5c9a', core: 'radial-gradient(circle at 50% 30%,#40197f,#100628 78%)', ic: '#ffd1f0', g: 'rgba(190,100,255,.85)', icon: 'wrench', orb: 1, pt: 0, rays: 1 },
  staff: { cls: 'bdg-staff', label: 'HỖ TRỢ', title: 'Hỗ trợ – giữ trật tự Sảnh', how: 'Chủ sảnh cấp quyền Mod', clip: SHD, ring: '#7dffcf,#14c98a,#066e55,#14c98a,#7dffcf', core: 'radial-gradient(circle at 50% 30%,#0a6a52,#021c16 78%)', ic: '#c9ffe9', g: 'rgba(40,230,160,.8)', icon: 'shield', orb: 0, pt: 0, ping: 1, is: '.4em' },
  sup: { cls: 'bdg-sup', label: 'NHÀ TÀI TRỢ', title: 'Nhà Tài Trợ của GumballZ', how: 'Ủng hộ web qua Donate', clip: STAR20, ring: '#fff0a0,#ff8a1f,#ff2d2d,#ff8a1f,#fff0a0', core: 'radial-gradient(circle at 50% 30%,#72200a,#1c0600 78%)', ic: '#ffd45c', g: 'rgba(255,110,40,.85)', icon: 'coin', orb: 0, pt: 22, rays: 1 },
  vip: { cls: 'bdg-vip', label: 'VIP', title: 'Thành viên VIP của GumballZ', how: 'Quản trị cấp', clip: DIA, ring: '#5ff3ff,#5b8cff,#c15bff,#ff6bb5,#ffe66b,#5ff3ff', core: 'radial-gradient(circle at 50% 30%,#14487c,#050f22 78%)', ic: '#c6f7ff', g: 'rgba(90,200,255,.85)', icon: 'gem', orb: 1, pt: 12, rays: 1, is: '.3em' },
  dev: { cls: 'bdg-dev', label: 'DEV', title: 'Lập trình viên GumballZ Boardgame', how: 'Quản trị cấp', clip: OCT, ring: '#7dffef,#14e0c8,#0a7a6e,#2fd6a0,#7dffef', core: 'radial-gradient(circle at 50% 30%,#063a33,#01120f 78%)', ic: '#7dffef', g: 'rgba(45,230,200,.85)', icon: 'code', orb: 1, pt: 8, rays: 1, caret: 1 },
};
/* 1 medal + nhãn. size: 'xs' (20px inline) | 'mini' (40px Hồ sơ/modal). Hạt bay dùng Math.random
   (chỉ để nhìn – test seed Math.random trước khi gọi). */
export function medalHTML(tier, size = 'xs') {
  const t = MEDALS[tier];
  if (!t) return '';
  const sz = size === 'mini' ? 'mini' : 'xs';
  let pts = '';
  for (let n = 0; n < (t.pt || 0); n++) pts += `<i class="pt" style="--x:${(15 + Math.random() * 70).toFixed(1)};--d:${(2 + Math.random() * 2).toFixed(2)}s;--l:${(Math.random() * 3).toFixed(2)}s;--dx:${((Math.random() - .5) * .4).toFixed(2)}em"></i>`;
  return `<span class="bdg ${t.cls} sz-${sz}" data-tier="${tier}" title="${t.title}"><span class="m t-${tier} ${sz}" style="--clip:${t.clip};--ring:${t.ring};--core:${t.core};--ic:${t.ic};--g:${t.g};${t.is ? '--is:' + t.is : ''}" aria-hidden="true">${t.rays ? '<i class="rays"></i>' : ''}<i class="halo"></i>${t.ping ? '<i class="ping"></i><i class="ping"></i>' : ''}<div class="shape"><div class="spin"></div></div><div class="core">${MEDAL_ICONS[t.icon]}${t.caret ? '<i class="caret"></i>' : ''}</div>${t.orb ? '<i class="orb"></i>' : ''}${pts}</span></span>`; /* 🏅 chỉ hiện huy chương, KHÔNG chữ (patch -145, user 00:26: "chỉ hiện cái huy chương thôi khỏi chữ cũng được") — tên bậc vẫn ở title (rê chuột hiện) + trường label bên dưới để tra cứu/wiki; data-tier để tooltip khi nhấn (patch -148) đọc bậc trực tiếp */
}
export function tierBadges(u = {}, size = 'xs') {
  u = u || {};
  const own = !!(u.owner || u.v === 2);
  const rl = u.v != null ? (u.v === 2 ? 2 : u.v === 3 ? 2 : u.v === 4 ? 1 : 0) : (u.role != null ? +u.role : (u.admin ? 2 : 0));
  const sp = !!(u.sp || u.supporter);
  const vip = !!u.vip, dev = !!u.dev;
  let h = '';
  if (own) h += medalHTML('owner', size);
  else if (rl === 2) h += medalHTML('adm', size);
  else if (rl === 1) h += medalHTML('staff', size);
  if (sp) h += medalHTML('sup', size);
  if (vip) h += medalHTML('vip', size);
  if (dev) h += medalHTML('dev', size);
  return h;
}
/* Nghiêng 3D + vệt sáng chạy theo con trỏ (bản phát thảo .card) — chỉ gắn ở khu vực huy hiệu
   Hồ sơ / modal thành viên, KHÔNG gắn lên từng medal inline. Gọi 1 lần sau khi render xong. */
export function attachBadgeTilt(el) {
  if (!el || typeof window === 'undefined' || !el.addEventListener || el.__bdgTilt) return;
  el.__bdgTilt = true;
  el.classList.add('bdg-tilt');
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect(); if (!r.width) return;
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
    el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    el.style.transform = `perspective(700px) rotateX(${((.5 - y) * 8).toFixed(1)}deg) rotateY(${((x - .5) * 10).toFixed(1)}deg)`;
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
}

/* ===== Tooltip khi NHẤN vào huy chương (patch -148, user 2026-11-22 ~09:56) =====
   Huy hiệu chỉ hiện huy chương không chữ (-145) nên người xem không biết đó là huy hiệu gì —
   nhấn vào medal thì hiện tooltip: tên bậc + mô tả + cách nhận. Một tooltip dùng chung cho cả
   trang (delegate ở document, không gắn listener từng medal — medal render động ở chat/BXH/bạn bè/
   Hồ sơ/Quản trị). Nhấn lại cùng medal thì đóng; nhấn chỗ khác / nhấn ✕ / Esc / cuộn trang thì đóng.
   Cài 1 lần duy nhất khi module được import (guard typeof document để generator wiki chạy Node không vỡ). */
export function badgeInfo(tier) {
  const t = MEDALS[tier];
  return t ? { tier, label: t.label, title: t.title, how: t.how || '' } : null;
}
let bdgTipEl = null, bdgTipTier = '', bdgTipShownAt = 0;
function bdgTipNode() {
  if (bdgTipEl) return bdgTipEl;
  const el = document.createElement('div');
  el.id = 'bdg-tip'; el.className = 'bdg-tip'; el.hidden = true;
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-live', 'polite');
  el.innerHTML = '<button type="button" class="bdg-tip-x" data-bdg-tip-close aria-label="Đóng">✕</button><div class="bdg-tip-t"></div><div class="bdg-tip-d"></div><div class="bdg-tip-h"></div>';
  document.body.appendChild(el);
  bdgTipEl = el;
  return el;
}
export function hideBadgeTip() {
  bdgTipTier = '';
  if (bdgTipEl) bdgTipEl.hidden = true;
}
export function showBadgeTip(tier, anchorEl) {
  const info = badgeInfo(tier);
  if (!info || typeof document === 'undefined' || !anchorEl || !anchorEl.getBoundingClientRect) return false;
  const el = bdgTipNode();
  el.querySelector('.bdg-tip-t').textContent = info.label;
  el.querySelector('.bdg-tip-d').textContent = info.title;
  el.querySelector('.bdg-tip-h').textContent = info.how ? 'Cách nhận: ' + info.how : '';
  el.hidden = false;
  el.style.visibility = 'hidden';
  const r = anchorEl.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
  let left = Math.round(r.left + r.width / 2 - w / 2);
  left = Math.max(8, Math.min(left, vw - w - 8));
  let top = Math.round(r.bottom + 8);
  if (top + h > vh - 8) top = Math.max(8, Math.round(r.top - h - 8));
  el.style.left = left + 'px';
  el.style.top = top + 'px';
  el.style.visibility = '';
  bdgTipTier = tier;
  bdgTipShownAt = Date.now(); /* mốc giờ hiện tooltip — cuộn ngay sau khi nhấn (trình duyệt cuộn medal vào tầm nhìn) không được đóng tooltip */
  return true;
}
function bdgTipClick(e) {
  const t = e.target && e.target.closest ? e.target.closest('.bdg') : null;
  if (t) {
    const tier = (t.dataset && t.dataset.tier) || badgeTierOf(t);
    if (tier && MEDALS[tier]) {
      if (bdgTipTier === tier && bdgTipEl && !bdgTipEl.hidden) { hideBadgeTip(); return; }
      showBadgeTip(tier, t);
      return;
    }
  }
  if (bdgTipEl && !bdgTipEl.hidden) {
    if (e.target && e.target.closest && e.target.closest('#bdg-tip')) return; /* nhấn trong tooltip (kể cả nút ✕ — nút tự đóng qua handler riêng bên dưới) */
    hideBadgeTip();
  }
}
if (typeof document !== 'undefined' && document.addEventListener && !document.__bdgTipInstalled) {
  document.__bdgTipInstalled = true;
  document.addEventListener('click', bdgTipClick);
  document.addEventListener('click', e => {
    if (e.target && e.target.closest && e.target.closest('[data-bdg-tip-close]')) hideBadgeTip();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideBadgeTip(); });
  window.addEventListener('scroll', () => { if (Date.now() - bdgTipShownAt > 300) hideBadgeTip(); }, true);
  window.addEventListener('resize', () => hideBadgeTip());
}
