// 🎖️ Huy hiệu + danh hiệu 4 bậc (patch -95): Chủ sảnh / Quản sảnh / Mod sảnh / Nhà Tài Trợ.
// CSS ở shared/css/badges.css (nạp 1 lần bằng ensureBadgesCSS, kiểu skeleton.js).
// import { ensureBadgesCSS, tierBadges } from '…/shared/ui/badges.js?v=4'
// tierBadges(u): u là {owner, role, supporter} (từ pub()/adminFind/friendsList/leaderboard)
//   hoặc {v, sp} (tin chat Sảnh: v 2=chủ sảnh, 3=Quản sảnh, 4=Mod sảnh, 1=đã đăng nhập; sp 1=nhà tài trợ).
//   Trả về HTML các pill – có thể 2 pill cùng lúc (vd. Mod + Ủng hộ). Không tự viết lại markup pill ở từng nơi.
// uid6(id) (patch -108): id tài khoản HIỂN THỊ dạng 6 chữ số theo thứ tự tạo acc (acc đầu tiên = 000001,
// quá 6 số giữ nguyên, không cắt); id NỘI BỘ (số nguyên trong DB/API/token/data-uid) KHÔNG đổi – chỉ đổi lúc hiển thị.
export const uid6 = id => { const s = String(id ?? ''); return s ? s.padStart(6, '0') : ''; };
const BDG_CSS = new URL('../css/badges.css?v=4', import.meta.url).href;
export function ensureBadgesCSS() {
  ensureBadgeRive(); /* 🎬 huy hiệu Rive (patch -109) — mọi nơi hiện huy hiệu đều gọi hàm này */
  if (document.getElementById('bdg-css')) return;
  const l = document.createElement('link'); l.id = 'bdg-css'; l.rel = 'stylesheet'; l.href = BDG_CSS;
  document.head.append(l);
}

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
  for (const t of ['own', 'adm', 'mod', 'sup']) if (pill.classList.contains('bdg-' + t)) return t;
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
let badgeRiveStarted = false;
export function ensureBadgeRive() {
  if (badgeRiveStarted) return;
  badgeRiveStarted = true;
  if (!shouldMountBadgeRive()) return; /* giảm chuyển động / không có DOM: giữ pill CSS */
  if (typeof MutationObserver === 'undefined') return;
  if (!document.body) { /* module nạp trước khi có body: đợi parse xong rồi thử lại */
    badgeRiveStarted = false;
    document.addEventListener('DOMContentLoaded', () => ensureBadgeRive(), { once: true });
    return;
  }
  queueBadgePills(document.body);
  const mo = new MutationObserver(muts => {
    for (const mu of muts) {
      mu.addedNodes.forEach(n => queueBadgePills(n));
      mu.removedNodes.forEach(n => cleanupBadgePills(n));
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
}
export function tierBadges(u = {}) {
  const own = !!(u.owner || u.v === 2);
  const rl = u.v != null ? (u.v === 2 ? 2 : u.v === 3 ? 2 : u.v === 4 ? 1 : 0) : (u.role != null ? +u.role : (u.admin ? 2 : 0));
  const sp = !!(u.sp || u.supporter);
  let h = '';
  if (own) h += '<span class="bdg bdg-own" title="Người làm ra GumballZ Boardgame"><i>👑</i><span class="t">CHỦ SẢNH</span><b aria-hidden="true">✦</b></span>';
  else if (rl === 2) h += '<span class="bdg bdg-adm" title="Quản lý Sảnh GumballZ"><i>🛠️</i><span class="t">QUẢN SẢNH</span></span>';
  else if (rl === 1) h += '<span class="bdg bdg-mod" title="Mod – giữ trật tự Sảnh"><i>🛡️</i><span class="t">MOD SẢNH</span></span>';
  if (sp) h += '<span class="bdg bdg-sup" title="Nhà Tài Trợ của GumballZ"><i>💎</i><span class="t">NHÀ TÀI TRỢ</span><b aria-hidden="true">✦</b></span>';
  return h;
}
