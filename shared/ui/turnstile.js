// 🛡️ Cloudflare Turnstile (miễn phí): chứng minh "người thật" trước khi đăng ký, gửi góp ý, gửi từ mới của Nối từ – chống bơm rác.
// Chưa cài khoá (Worker chưa có secret TURNSTILE_SECRET) thì humanToken() trả '' và máy chủ cũng bỏ qua bước kiểm → web chạy như cũ.
// Widget đặt kiểu "chỉ hiện khi cần" (appearance: interaction-only): đa số người không thấy gì; nghi ngờ thì hiện ô bấm nhỏ ở cuối màn hình.
import { cfHttp } from '../net/cfrelay.js?v=15';
let key, loading = null;
async function siteKey() {
  if (key !== undefined) return key;
  try { const r = await fetch(cfHttp() + '/auth/config'); const d = await r.json(); key = (d && d.ts) || null; } catch (e) { return null; } /* lỗi mạng: lần sau hỏi lại */
  return key;
}
function script() {
  if (window.turnstile) return Promise.resolve(true);
  return loading || (loading = new Promise(res => { const s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = () => res(true); s.onerror = () => { loading = null; res(false); }; document.head.append(s); }));
}
/* lấy 1 mã dùng-một-lần; quá 15 giây (người chưa bấm, mạng chặn…) thì trả '' – máy chủ sẽ từ chối nếu đã bật Turnstile */
export async function humanToken(action) { /* action: 'register' | 'feedback' | 'noitu' – máy chủ kiểm khớp */
  try {
    const k = await siteKey(); if (!k || !(await script()) || !window.turnstile) return '';
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483000';
    document.body.append(box);
    return await new Promise(res => {
      let id = null; const done = t => { clearTimeout(to); try { window.turnstile.remove(id); } catch (e) {} box.remove(); res(t || ''); };
      const to = setTimeout(() => done(''), 15000);
      id = window.turnstile.render(box, { sitekey: k, action, appearance: 'interaction-only', callback: t => done(t), 'error-callback': () => done(''), 'expired-callback': () => done('') });
    });
  } catch (e) { return ''; }
}
