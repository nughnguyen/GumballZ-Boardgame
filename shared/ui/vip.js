// 👑 Chủ web vào phòng (anh dặn 18/11/2026): tên nổi bật + thông báo cho cả phòng.
// Cờ vip trong danh sách người trong phòng (__peers) chỉ có ở phòng máy chủ giữ ván, sau khi máy chủ kiểm vé
// HMAC (server/src/vip.js, shared/net/api.js vipPass) – người khác tự khai uid của anh cũng không được.
const SEL = '[data-gumballz-pid], #plist li[data-id], #g-players [data-id], .seat[data-pid], .pc[data-id]:not([data-fn]), .lb li[data-id], .who li[data-id], .final li[data-id], .pod[data-id]';
const CSS = `.gumballz-vip{outline:2px solid #ffc83d!important;outline-offset:2px;border-radius:12px;animation:gumballz-vip 2.4s ease-in-out infinite}
@keyframes gumballz-vip{0%,100%{filter:drop-shadow(0 0 3px #ffd84acc)}50%{filter:drop-shadow(0 0 9px #ff7ab8cc) drop-shadow(0 0 3px #ffd84a)}}
.gumballz-vipbar{position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:10004;display:flex;align-items:center;gap:10px;width:max-content;max-width:min(380px,calc(100vw - 24px));padding:9px 16px 9px 12px;border-radius:20px;background:linear-gradient(120deg,#fff3c4,#ffd6ea 60%,#ffe9f4);color:#2a2340;box-shadow:0 14px 34px -12px #b3165c88,inset 0 0 0 2px #ffc83d;font:700 14px/1.3 Nunito,"Be Vietnam Pro",sans-serif;cursor:pointer;animation:gumballz-vipin .42s cubic-bezier(.2,1.5,.4,1) both}
.gumballz-vipbar .cr{font-size:26px;line-height:1;animation:gumballz-vipcr 1.6s ease-in-out infinite}
.gumballz-vipbar b{font:800 15.5px/1.2 "Baloo 2",Nunito,sans-serif;background:linear-gradient(90deg,#c76a00,#d61f73);-webkit-background-clip:text;background-clip:text;color:transparent}
.gumballz-vipbar small{display:block;color:#8a4a6a;font-weight:800;font-size:12px}
.gumballz-vipbar.out{animation:gumballz-vipout .3s ease-in both}
@keyframes gumballz-vipin{from{opacity:0;transform:translate(-50%,-24px) scale(.8)}}
@keyframes gumballz-vipout{to{opacity:0;transform:translate(-50%,-16px) scale(.92)}}
@keyframes gumballz-vipcr{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg) translateY(-2px)}}
@media (prefers-reduced-motion:reduce){.gumballz-vip,.gumballz-vipbar,.gumballz-vipbar .cr{animation:none}}`;
const LOBBY = '#plist li, .plist li, #players li, #lobby-players li, .gk-players li, .lobby-list li';
let names = new Set();
let on = false, vips = new Set(), seen = new Set(), room = '', mo = null, tmr = 0;
const myId = () => { try { return window.__gumballzRoom ? String(window.__gumballzRoom.myId() || '') : ''; } catch (e) { return ''; } };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function paint() {
  tmr = 0;
  for (const el of document.querySelectorAll('.gumballz-vip')) { if (el.matches(LOBBY) && !el.dataset.id && !el.dataset.pid && !el.dataset.gumballzPid) continue; const id = el.dataset.gumballzPid || el.dataset.pid || el.dataset.id; if (!vips.has(id)) el.classList.remove('gumballz-vip'); }
  if (!vips.size) return;
  for (const el of document.querySelectorAll(LOBBY)) { /* danh sách phòng chờ không gắn mã người chơi: so đúng tên */
    if (el.dataset.id || el.dataset.pid || el.dataset.gumballzPid) continue;
    const hit = [...el.querySelectorAll('span,b,strong,.nm,.name')].some(s => s.firstChild && s.firstChild.nodeType === 3 && names.has(s.firstChild.textContent.trim()));
    if (hit !== el.classList.contains('gumballz-vip')) el.classList.toggle('gumballz-vip', hit);
  }
  for (const el of document.querySelectorAll(SEL)) { const id = el.dataset.gumballzPid || el.dataset.pid || el.dataset.id; if (id && vips.has(id) && !el.classList.contains('gumballz-vip')) el.classList.add('gumballz-vip'); }
}
const later = () => { if (!tmr) tmr = setTimeout(paint, 250); };
function hello(name) {
  document.querySelector('.gumballz-vipbar')?.remove();
  const b = document.createElement('div'); b.className = 'gumballz-vipbar'; b.setAttribute('role', 'status');
  b.innerHTML = `<span class="cr">👑</span><span><b>Chủ web ${esc(name)}</b> vừa vào phòng ✨<small>Người làm ra GumballZ Boardgame – chào một câu đi!</small></span>`;
  const bye = () => { b.classList.add('out'); setTimeout(() => b.remove(), 320); };
  b.onclick = bye; document.body.appendChild(b); setTimeout(bye, 6000);
}
export function mountVip() {
  if (on) return; on = true;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  addEventListener('gumballz-peers', e => {
    const list = Array.isArray(e.detail) ? e.detail : [], code = (() => { try { return String(window.__gumballzRoom && window.__gumballzRoom.code() || ''); } catch (x) { return ''; } })();
    if (code !== room) { room = code; seen = new Set(); }
    const me = myId(); vips = new Set(); names = new Set();
    for (const p of list) if (p && p.vip && p.pid) {
      vips.add(p.pid); if (p.name) names.add(String(p.name).trim());
      if (!seen.has(p.pid)) { seen.add(p.pid); if (p.pid !== me) hello(p.name || 'GumballZ'); }
    }
    if (vips.size && !mo) { mo = new MutationObserver(later); mo.observe(document.body, { childList: true, subtree: true }); }
    later();
  });
}
