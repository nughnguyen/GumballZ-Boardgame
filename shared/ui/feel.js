// ✨ Cảm giác bấm chung: rung nhẹ trên điện thoại + tiếng "tách" nhỏ ở giao diện chung (trang chủ, trang phụ, hộp thoại, cài đặt, sảnh).
// Trong ván chơi mỗi game có âm thanh riêng nên ở đó chỉ rung, không kêu thêm.
// Tắt trong ⚙️ Cài đặt: gumballz-ui-sfx = '0' (tiếng), gumballz-haptic = '0' (rung); "Tắt hết nhạc nền" không ảnh hưởng tiếng nút.
import './inapp.js?v=5'; /* nhắc mở bằng Safari/Chrome khi đang ở trình duyệt nhúng của Zalo, Facebook… */
import './errlog.js?v=22'; /* ghi lỗi JS về máy chủ cho chủ web */
import '../audio/volume.js?v=1'; /* âm lượng chung nhạc nền / hiệu ứng (gumballz-vol-*) – chặn AudioNode.connect một lần cho mọi game */
/* 🌐 tiếng Anh: ?lang=en / ?lang=vi đổi ngôn ngữ (nhớ trong gumballz-lang); chọn English thì nạp bộ dịch (shared/i18n.js) */
{ try { const q = new URLSearchParams(location.search).get('lang'); if (q === 'en' || q === 'vi') localStorage.setItem('gumballz-lang', q); if (localStorage.getItem('gumballz-lang') === 'en') import('../i18n.js?v=1').then(m => m.startI18n()).catch(() => {}); } catch (e) {} }
/* 🧈 Cuộn mượt: đang cuộn trang (hoặc khung cuộn cao ≥ ½ màn hình) thì gắn html.gumballz-scroll
   → shell.css tạm dừng mọi hoạt ảnh CSS (sao lấp lánh, mây, chấm xanh…) để máy khỏi vẽ lại các lớp mờ / bóng đổ phía trên chúng mỗi khung hình; ngừng cuộn 0,2 giây thì chạy lại. */
{ let sT = 0; const de = document.documentElement;
  addEventListener('scroll', e => { const t = e.target; if (t !== document && !(t && t.clientHeight > innerHeight * 0.5)) return; if (!sT) de.classList.add('gumballz-scroll'); clearTimeout(sT); sT = setTimeout(() => { sT = 0; de.classList.remove('gumballz-scroll'); }, 200); }, { capture: true, passive: true }); }
/* 📈 Thống kê lượt xem của Cloudflare Web Analytics (không cookie, không theo dõi cá nhân) – chỉ chạy trên tên miền thật */
if (location.hostname === 'gumballzgames.vercel.app' && !navigator.webdriver && !document.querySelector('script[data-cf-beacon]')) {
  const b = document.createElement('script'); b.defer = true; b.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  b.setAttribute('data-cf-beacon', '{"token": "853e19cc344441d28703e0fe5bb866f0"}'); document.head.append(b);
}
/* màn 🎓 Học chơi nhanh – chỉ nạp ở trang game (có nút Hướng dẫn) */
if (document.querySelector('#btn-guide-home, #btn-guide')) import('./tutorial.js?v=36').catch(() => {});
// Giao diện chung (hộp thoại, thông báo nổi, hồ sơ, tin mới…) viết bằng Nunito + Baloo 2. Game nào không tự nạp 2 phông này thì nạp giúp,
// kẻo chữ Việt rơi về phông máy và mỗi chữ một kiểu.
{ const have = f => [...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some(l => l.href.includes('family=' + f)), need = [];
  if (!have('Nunito')) need.push('family=Nunito:wght@600;700;800'); if (!have('Baloo+2')) need.push('family=Baloo+2:wght@700;800');
  if (need.length) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?' + need.join('&') + '&display=swap'; document.head.append(l); } }
const on = k => { try { return localStorage.getItem(k) !== '0'; } catch (e) { return true; } };
const SHARED = '.dg-box,.st-box,.ac-box,.ac-menu,.gumballz-news,.lb,.lb-ov,#gumballz-fb,.gumballz-chip,[data-ui-sfx]';
let ac = null, last = 0;
function tick(hi) {
  const now = performance.now(); if (now - last < 45) return; last = now;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(hi ? 880 : 620, t); o.frequency.exponentialRampToValueAtTime(hi ? 1320 : 360, t + .055);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.055, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + .075);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + .09);
  } catch (e) {}
}
addEventListener('pointerdown', e => {
  const t = e.target.closest && e.target.closest('button,a[href],[role="button"],select,input[type="checkbox"],input[type="radio"],label.st-row');
  if (!t || t.disabled || t.getAttribute('aria-disabled') === 'true') return;
  if (on('gumballz-haptic') && e.pointerType === 'touch' && navigator.vibrate) { try { navigator.vibrate(8); } catch (err) {} }
  if (on('gumballz-ui-sfx') && (document.documentElement.dataset.uiSfx === '1' || t.closest(SHARED))) tick(t.matches('.btn-main,.dg-b.ok,.ac-go,.play') || !!t.closest('.tile'));
}, { capture: true, passive: true });
export const uiTick = tick;
