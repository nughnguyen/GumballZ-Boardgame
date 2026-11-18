// 👀 Chế độ xem: vào phòng lúc đang chơi thì được xem ván, ván sau tự được chia bài (hoặc nhảy vào ghế trống/bot ngay).
// Host: đánh dấu view.spec = true cho người chưa có trong ván. Client: specBanner(view && view.spec).
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CSS = `#gumballz-spec{position:fixed;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:9000;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px 8px;
background:#4A3E5Ce6;color:#fff;padding:7px 14px;border-radius:24px;font:800 13px/1.3 Nunito,system-ui,sans-serif;box-shadow:0 6px 20px #0004;pointer-events:none;max-width:calc(100vw - 24px);text-align:center}
#gumballz-spec b{color:#ffd166}
#gumballz-spec .bgs-sit{pointer-events:auto;border:0;border-radius:999px;padding:4px 10px;background:#ffd166;color:#4A3E5C;font:900 12px/1.2 Nunito,system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 6px #0003}
#gumballz-spec .bgs-sit:hover{filter:brightness(1.06)}
body.gumballz-spec .hand,body.gumballz-spec [data-spec-hide]{pointer-events:none}`;
let el = null, baseText = '', listening = false;
function draw() {
  if (!el) return;
  const seats = Array.isArray(window.__gumballzOpenSeats) ? window.__gumballzOpenSeats : [];
  const btns = seats.length && typeof window.__gumballzSit === 'function'
    ? seats.slice(0, 4).map(s => `<button type="button" class="bgs-sit" data-sit="${esc(s.id)}">🪑 Ngồi thay ${esc(s.name)}${s.isBot ? ' 🤖' : ''}</button>`).join('')
    : '';
  el.innerHTML = baseText + btns;
  el.querySelectorAll('.bgs-sit').forEach(b => { b.onclick = () => { if (window.__gumballzSit) { b.disabled = true; window.__gumballzSit(b.dataset.sit); } }; });
}
export function specBanner(on, text) {
  if (!on) { if (el) { el.remove(); el = null; } baseText = ''; document.body.classList.remove('gumballz-spec'); return; }
  if (!document.getElementById('gumballz-spec-css')) { const s = document.createElement('style'); s.id = 'gumballz-spec-css'; s.textContent = CSS; document.head.append(s); }
  if (!el) { el = document.createElement('div'); el.id = 'gumballz-spec'; el.setAttribute('role', 'status'); document.body.append(el); }
  if (!listening) { listening = true; try { addEventListener('gumballz-seats', () => { if (el) draw(); }); } catch (e) {} }
  baseText = text || '👀 <span>Đang xem · <b>ván sau</b> được vào chơi</span>';
  draw();
  document.body.classList.add('gumballz-spec');
}
