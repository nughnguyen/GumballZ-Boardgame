// 🏅 Popup "Mở khoá thành tích" (anh dặn 17/11/2026): thẻ nổi giữa trên màn hình, có icon nảy + tên + điều kiện,
// tự ẩn sau ~4,5 giây hoặc chạm để tắt; nhiều cái thì hiện lần lượt. Không chặn bấm bàn chơi phía sau.
const Q = []; let busy = false;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function css() {
  if (document.getElementById('ap-css')) return;
  const st = document.createElement('style'); st.id = 'ap-css';
  st.textContent = `.ap-box{position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top,0px));z-index:2147482500;transform:translate(-50%,-140%);width:min(360px,calc(100vw - 24px));display:flex;gap:12px;align-items:center;padding:12px 16px 12px 12px;border-radius:20px;background:linear-gradient(135deg,#4A3E5C,#4b3aa0);color:#fff;box-shadow:0 18px 50px -12px #000a,0 0 0 2px #ffd84a inset;font:700 14px/1.35 Nunito,"Be Vietnam Pro",sans-serif;cursor:pointer;transition:transform .42s cubic-bezier(.2,1.4,.4,1),opacity .3s}
.ap-box.in{transform:translate(-50%,0)}.ap-box.out{transform:translate(-50%,-140%);opacity:0}
.ap-ic{flex:none;width:54px;height:54px;border-radius:16px;display:grid;place-items:center;font-size:32px;background:radial-gradient(circle at 35% 30%,#fff6c8,#ffb23d);box-shadow:0 0 0 3px #fff3,0 0 22px #ffd84a99;animation:ap-pop .6s .15s cubic-bezier(.2,1.6,.4,1) both}
.ap-t{min-width:0}.ap-t small{display:block;font:800 11.5px Nunito,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#ffd84a}
.ap-t b{display:block;font:800 17px/1.2 "Baloo 2",Nunito,sans-serif;overflow-wrap:anywhere}.ap-t span{display:block;color:#e4dcff;font-size:12.5px;margin-top:1px}
@keyframes ap-pop{0%{transform:scale(.2) rotate(-25deg)}100%{transform:none}}
@media (prefers-reduced-motion:reduce){.ap-box,.ap-ic{transition:opacity .2s;animation:none}}`;
  document.head.append(st);
}
function next() {
  if (busy || !Q.length) return; busy = true; css();
  const a = Q.shift(), d = document.createElement('div'); d.className = 'ap-box'; d.setAttribute('role', 'status');
  d.innerHTML = `<div class="ap-ic">${esc(a.icon || '🏅')}</div><div class="ap-t"><small>🔓 Mở khoá thành tích</small><b>${esc(a.name)}</b>${a.desc ? `<span>${esc(a.desc)}</span>` : ''}</div>`;
  document.body.append(d);
  try { navigator.vibrate && navigator.vibrate([30, 40, 60]); } catch (e) {}
  requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('in')));
  let t = 0; const bye = () => { clearTimeout(t); d.classList.add('out'); setTimeout(() => { d.remove(); busy = false; next(); }, 350); };
  d.onclick = bye; t = setTimeout(bye, 4500);
}
export function achPopup(list) { for (const a of list || []) if (a && a.name) Q.push(a); try { next(); } catch (e) {} }
