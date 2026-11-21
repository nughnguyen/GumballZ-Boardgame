// 🎉 Hiệu ứng khi thắng ván: pháo giấy / mưa sao / tim bay / mưa xu / pháo hoa – chọn ở Hồ sơ → 🎉 Khi thắng (localStorage 'gumballz-winfx').
// Đổi tên thương hiệu cũ → gumballz; đọc statOf từ shared/titles.js
// (repo này chưa có) nên dùng statsFromTotals(totals()) từ shared/js/avatar-rewards.js thay thế.
// stats.js tự dispatch sự kiện 'gumballz-stats' (won = true) sau mỗi ván thắng; file này tự nghe rồi vẽ ~2,6 giây
// lên một canvas phủ màn hình, không chặn bấm. Hiệu ứng có khoá (WIN_FX trong avatar-rewards.js) chỉ chạy khi
// máy này đã mở; chưa mở thì dùng pháo giấy. KHÔNG cần sửa stats.js để nối dây: chỉ cần file này được nạp
// (xem GHI CHÚ NỐI DÂY ở cuối file).
import { WIN_FX, isOpen, statsFromTotals, readAuthFlags } from '../js/avatar-rewards.js?v=2';
import { load, totals } from './stats.js';
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } } };
const COLORS = ['#ff4d6a', '#ff7a45', '#ffb23d', '#2fc76f', '#3d8bff', '#8a5cff', '#ff5fa2'];
const ICON = { sao: ['⭐', '✨', '🌟'], tim: ['💖', '💗', '💕'], xu: ['🪙'] };
let running = null;

export function playWin(id, preview = false) {
  if (!id || id === 'off') return;
  const fx = WIN_FX.find(x => x.id === id) || WIN_FX[0];
  if (!preview && fx.lock) { const fl = readAuthFlags(); if (!isOpen(fx.lock, statsFromTotals(totals(load()), { admin: fl.admin }))) return playWin('giay'); }
  if (running) running.stop();
  const reduce = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas'), dpr = Math.min(2, devicePixelRatio || 1);
  cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147482000';
  const W = innerWidth, H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; document.body.append(cv);
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const R = Math.random, T0 = performance.now(), DUR = reduce ? 1400 : 2600, parts = [];
  const n = Math.round(Math.min(90, Math.max(40, W / 9)) * (reduce ? .3 : 1));
  if (fx.id === 'giay') for (let i = 0; i < n; i++) parts.push({ x: R() * W, y: -20 - R() * H * .5, vx: (R() - .5) * 2, vy: 2 + R() * 3, r: R() * 6, vr: (R() - .5) * .3, w: 6 + R() * 6, h: 4 + R() * 6, c: COLORS[i % COLORS.length] });
  else if (fx.id === 'phao') {
    for (let k = 0; k < 4; k++) { const cx = W * (.2 + .6 * R()), cy = H * (.18 + .3 * R()), c = COLORS[(k * 2) % COLORS.length], d = k * 380; for (let i = 0; i < 34; i++) { const a = i / 34 * Math.PI * 2, sp = 2.2 + R() * 2.2; parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, c, d, fw: true }); } }
  } else { const ic = ICON[fx.id] || ICON.sao; for (let i = 0; i < Math.round(n * .6); i++) parts.push({ x: R() * W, y: fx.id === 'tim' ? H + 20 + R() * H * .4 : -30 - R() * H * .5, vx: (R() - .5) * 1.2, vy: (fx.id === 'tim' ? -1 : 1) * (2 + R() * 2.5), s: 18 + R() * 16, ch: ic[i % ic.length], wob: R() * 6 }); }
  let raf = 0, dead = false;
  const stop = () => { if (dead) return; dead = true; cancelAnimationFrame(raf); cv.remove(); if (running && running.stop === stop) running = null; };
  const frame = now => {
    const t = now - T0; if (t > DUR) return stop();
    ctx.clearRect(0, 0, W, H); const fade = t > DUR - 500 ? (DUR - t) / 500 : 1; ctx.globalAlpha = fade;
    for (const p of parts) {
      if (p.fw) { const tt = t - p.d; if (tt < 0) continue; p.x += p.vx; p.y += p.vy; p.vx *= .97; p.vy = p.vy * .97 + .05; ctx.globalAlpha = fade * Math.max(0, 1 - tt / 1500); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, 7); ctx.fill(); ctx.globalAlpha = fade; continue; }
      p.x += p.vx + (p.wob ? Math.sin((t / 300) + p.wob) * .6 : 0); p.y += p.vy;
      if (p.ch) { ctx.font = `${p.s}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; ctx.fillText(p.ch, p.x, p.y); continue; }
      p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); ctx.restore();
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame); running = { stop };
}
try {
  addEventListener('gumballz-stats', e => { const d = e.detail || {}; if (d.won === true) setTimeout(() => playWin(ls.get('gumballz-winfx') || 'giay'), 350); });
  window.__gumballzWinFx = playWin; /* để test / gọi tay */
} catch (e) {}

/* ---------- GHI CHÚ NỐI DÂY (điều phối viên giữ – file này KHÔNG tự sửa các file dưới đây) ----------
   Để hiệu ứng thắng tự chạy sau mỗi ván thắng trên toàn site, chỉ cần NẠP file này một lần ở nơi chung,
   KHÔNG cần sửa stats.js (stats.js đã dispatch 'gumballz-stats' { won: true } trong record()):
   - Cách 1 (khuyến nghị): thêm vào cuối shared/ui/stats.js (1 dòng, do điều phối viên làm):
       try { if (typeof document !== 'undefined') import('./winfx.js?v=1').catch(() => {}); } catch (e) {}
     rồi mọi trang đã nạp stats.js đều có hiệu ứng.
   - Cách 2 (không đụng stats.js): thêm <script type="module" src="…/shared/ui/winfx.js?v=1"></script>
     vào index.html + từng trang game (nhiều chỗ, dễ sót).
   - Chọn hiệu ứng ở Hồ sơ: profile.js (khi nối dây theo ghi chú trong avatar-rewards.js) lưu lựa chọn
     vào localStorage 'gumballz-winfx' (id trong WIN_FX: 'giay' | 'sao' | 'tim' | 'xu' | 'phao' | 'off').
     Xem trước trong Hồ sơ gọi playWin(id, true) – preview bỏ qua khoá. */
