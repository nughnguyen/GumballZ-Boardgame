// 💬 Chat trong phòng chơi – dùng chung cho mọi game (trừ Ma Sói, Vẽ đoán đã có chat riêng).
// shared/net/room.js tự nạp file này khi có phòng online và đưa vào `api`:
//   { game, host, send(text), history(), alive() }  – tin mới tới qua sự kiện window 'gumballz-chat' ({id, from, text, host, old} hoặc {reset:true}).
// Giao diện: một "tai" 💬 dính mép trái màn hình (kéo lên xuống được), bấm mở hộp chat; có tin mới khi đang đóng thì hiện chấm đỏ + bong bóng xem nhanh.
import { auth } from '../net/api.js?v=29';
import { ensureBadgesCSS, tierBadges } from './badges.js?v=6'; /* 🎖️ huy hiệu 4 bậc (patch -95) */
import { titlePillHtml, ensureTitleCSS } from './titlepill.js?v=2'; /* 🎖️ pill danh hiệu cạnh tên (patch -97) */
const blockedIds = () => { try { return JSON.parse(localStorage.getItem('gumballz-blocked') || '[]') || []; } catch (e) { return []; } };
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const CSS = `
.brc-tab{position:fixed;left:0;z-index:25;width:44px;height:46px;border:0;border-radius:0 16px 16px 0;background:var(--card);box-shadow:0 8px 20px -8px var(--sh-soft),0 2px 6px var(--sh-soft-sm);font-size:20px;line-height:1;cursor:pointer;display:grid;place-items:center;padding:0 2px 0 0;touch-action:none;-webkit-tap-highlight-color:transparent}
.brc-tab[hidden],.brc-box[hidden],.brc-peek[hidden]{display:none}
/* điện thoại / máy tính bảng: "tai" mép trái đè lên bàn chơi → nút tròn góc trái dưới, đối xứng với nút 😂 góc phải */
@media (max-width:899px){.brc-tab{top:auto!important;left:calc(12px + env(safe-area-inset-left,0px));bottom:calc(var(--gumballz-dock,12px) + env(safe-area-inset-bottom,0px));width:44px;height:44px;border-radius:50%;padding:0;touch-action:manipulation}.brc-peek{top:auto!important;left:calc(64px + env(safe-area-inset-left,0px));bottom:calc(var(--gumballz-dock,12px) + 6px + env(safe-area-inset-bottom,0px));max-width:min(240px,calc(100vw - 136px))}}
.brc-tab b{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;border-radius:9px;background:#FFB98A;color:var(--on-accent);font:800 11px/18px Nunito,sans-serif;padding:0 4px;box-sizing:border-box}
.brc-tab b:empty{display:none}
.brc-peek{position:fixed;left:50px;z-index:25;max-width:min(260px,calc(100vw - 60px));background:var(--ink);color:var(--on-ink);border-radius:14px;padding:7px 11px;font:700 13px/1.3 Nunito,sans-serif;box-shadow:0 10px 24px -8px var(--overlay);pointer-events:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;animation:brc-in .2s ease-out}
.brc-peek i{font-style:normal;color:#FFE3A3;font-weight:800}
.brc-box{position:fixed;left:8px;bottom:8px;z-index:95;width:min(340px,calc(100vw - 16px));height:min(420px,62vh);background:var(--bg);color:var(--ink2);border-radius:20px;box-shadow:0 18px 40px -12px var(--overlay),0 2px 8px var(--sh-soft-sm);display:flex;flex-direction:column;overflow:hidden;font:700 14px/1.35 Nunito,sans-serif;animation:brc-in .18s ease-out}
.brc-head{display:flex;align-items:center;gap:8px;padding:9px 8px 9px 14px;background:linear-gradient(90deg,#FFB98A,#FFB9CF,#FFE3A3);color:var(--on-accent);font:400 15px/1 var(--font-display,"Bungee","Baloo 2",Nunito,sans-serif)}
.brc-head span{flex:1}
.brc-head button{width:32px;height:32px;border:0;border-radius:50%;background:#ffffff33;color:var(--on-accent);font-size:16px;cursor:pointer}
.brc-head .brc-fr{width:auto;border-radius:999px;padding:0 11px;font:800 13px/1 Nunito,sans-serif;position:relative;white-space:nowrap}
.brc-turn{border:0;min-height:40px;background:#FFD84D;color:var(--on-accent);font:800 14px Nunito,sans-serif;cursor:pointer;animation:brc-tp 1s ease-in-out infinite alternate}@keyframes brc-tp{to{opacity:.7}}
.brc-list{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:6px;overscroll-behavior:contain}
.brc-empty{margin:auto;text-align:center;color:var(--muted);font-weight:700}
.brc-m{max-width:86%;align-self:flex-start;background:var(--card);border-radius:14px 14px 14px 4px;padding:6px 10px;box-shadow:0 1px 3px rgba(74,62,92,.09);overflow-wrap:anywhere}
.brc-m.me{align-self:flex-end;background:#ffe3d2;border-radius:14px 14px 4px 14px}
.brc-m.vip{background:linear-gradient(135deg,#fff6d6,#ffe3f0);box-shadow:inset 0 0 0 1.5px #FFE3A3,0 2px 10px -3px #ff7ab899}
.brc-m.vip small span{background:linear-gradient(90deg,#d97a00,#e0408a);-webkit-background-clip:text;background-clip:text;color:transparent}
.brc-m small{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-weight:800;font-size:11.5px;color:#c2581f}
.brc-add{border:0;background:#ffe9d6;color:#c2581f;border-radius:999px;padding:1px 6px;font:800 10.5px/1.35 Nunito,sans-serif;cursor:pointer}.brc-add:hover{filter:brightness(.95)}
.brc-form{display:flex;gap:6px;padding:8px;background:var(--card);border-top:1px solid #f0e4d8}
.brc-form input{flex:1;min-width:0;border:2px solid #eadfd2;border-radius:999px;padding:8px 13px;font:700 16px/1.2 Nunito,sans-serif;color:var(--ink2);background:#fffdfb;outline:none}
.brc-form input:focus{border-color:#FFB98A}
.brc-form button{flex:none;width:44px;height:44px;border:0;border-radius:50%;background:#FFB98A;color:var(--ink2);font-size:18px;cursor:pointer}
/* điện thoại: hộp chat gọn, nằm phía TRÊN màn hình – không che bài trên tay, và bàn phím bật lên cũng không che mất tin nhắn */
@media (max-width:640px){.brc-box{left:8px;right:8px;top:8px;bottom:auto;width:auto;height:min(250px,34vh);border-radius:18px}.brc-head{padding:5px 6px 5px 12px;font-size:14px}.brc-head button{width:28px;height:28px;font-size:14px}.brc-list{padding:7px 8px;gap:4px}.brc-m{padding:4px 9px;font-size:13.5px}.brc-form{padding:6px}.brc-form input{padding:6px 12px}.brc-form button{width:44px;height:44px}}
/* điện thoại xoay ngang: cột hẹp bên trái, cao hết màn hình */
@media (max-height:480px) and (orientation:landscape){.brc-box{left:8px;right:auto;top:8px;bottom:8px;width:min(300px,46vw);height:auto}}
@keyframes brc-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.brc-box,.brc-peek{animation:none}}
`;
let ui = null;
/* 📍 điện thoại: nút 💬 ở góc trái dưới – tự nhích lên nếu đè nút / lá bài / ô nhập của game (dò bằng elementsFromPoint, 1,5 giây/lần) */
const PHONE = matchMedia('(max-width:899px)'), MINE = '.brc-tab,.brc-peek,.bgr-btn,.bgr-panel,#gumballz-spec,.gumballz-chip';
const HIT = 'button,a[href],input,textarea,select,label,[role=button],[data-id],[data-i],[data-c],[data-pid],[data-bgvn-pid],[data-gumballz-pid],[tabindex]';
function blocked(x, y, w, h) { /* số điểm bị đè (0 = trống) */
  const big = innerWidth * innerHeight * .2; let n = 0;
  const pts = []; for (let cy = y + 22; cy < y + h; cy += 52) pts.push([x + 22, cy], [x + 22, cy - 17], [x + 22, cy + 17], [x + 5, cy], [x + 39, cy]); /* nút tròn 44px: tâm + 4 điểm trong vòng */
  for (const [px, py] of pts) {
    for (const el of document.elementsFromPoint(px, py)) {
      if (el.closest(MINE)) continue; const t = el.closest(HIT) || (/^(IMG|svg|CANVAS|VIDEO)$/.test(el.tagName) || [...el.childNodes].some(c => c.nodeType === 3 && c.nodeValue.trim()) ? el : null); if (!t || t === document.body || t === document.documentElement) continue; /* nút / lá bài / ô nhập, hoặc chữ / hình nhỏ của game */
      const r = t.getBoundingClientRect(); if (r.width * r.height < big) { n++; break; }
    }
  }
  return n;
}
let dockOn = false, dockV = -1;
function dock() {
  if (dockOn) return; dockOn = true;
  setInterval(() => {
    if (!PHONE.matches || document.hidden) return;
    const tabs = [...document.querySelectorAll('.brc-tab')].filter(t => !t.hidden && getComputedStyle(t).display !== 'none'); if (!tabs.length) return;
    const n = tabs.length, H = innerHeight, t0 = tabs[0], sb = parseFloat(getComputedStyle(t0).bottom) - (dockV < 0 ? 12 : dockV) || 0; /* phần vùng an toàn đáy */
    let pick = 12, best = 99;
    for (let d = 12; d <= H - 130 - 52 * (n - 1); d += 8) { const bot = H - d - sb, k = blocked(12, bot - 52 * (n - 1) - 44, 44, 52 * (n - 1) + 44); if (k < best) { best = k; pick = d; if (!k) break; } }
    if (pick !== dockV) { dockV = pick; document.documentElement.style.setProperty('--gumballz-dock', pick + 'px'); }
  }, 1500);
}
function build() {
  dock(); ensureBadgesCSS(); ensureTitleCSS(); /* 🎖️ huy hiệu 4 bậc (patch -95) · 🎖️ pill danh hiệu (patch -97) */
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const tab = document.createElement('button'); tab.className = 'brc-tab'; tab.type = 'button'; tab.setAttribute('aria-label', 'Chat trong phòng'); tab.innerHTML = '💬<b></b>';
  const peek = document.createElement('div'); peek.className = 'brc-peek'; peek.hidden = true;
  const box = document.createElement('div'); box.className = 'brc-box'; box.hidden = true;
  box.innerHTML = '<div class="brc-head"><span>💬 Chat phòng</span><button type="button" class="brc-fr brc-iv" title="Mời bạn bè vào phòng · đổi game cả bàn">📨 Mời</button><button type="button" aria-label="Đóng">✕</button></div><div class="brc-list" aria-live="polite"></div><form class="brc-form"><input type="text" maxlength="140" placeholder="Nhắn cả phòng…" autocomplete="off" enterkeyhint="send"><button type="submit" aria-label="Gửi">➤</button></form>';
  document.body.append(tab, peek, box);
  const list = box.querySelector('.brc-list'), inp = box.querySelector('input'), badge = tab.querySelector('b');
  const u = { api: null, tab, box, list, seen: new Set(), unread: 0, peekT: 0 };
  const place = y => { y = Math.max(70, Math.min(innerHeight - 120, y)); tab.style.top = y + 'px'; peek.style.top = (y + 6) + 'px'; };
  place(+ls.get('gumballz-chat-y') || Math.round(innerHeight * .42));
  addEventListener('resize', () => place(parseFloat(tab.style.top) || 200));
  const empty = () => { if (!list.children.length) list.innerHTML = '<div class="brc-empty">Chưa ai nói gì.<br>Chào cả phòng một câu đi nè 👋</div>'; };
  u.clear = () => { u.seen.clear(); list.innerHTML = ''; u.unread = 0; badge.textContent = ''; empty(); };
  u.open = on => {
    box.hidden = !on; peek.hidden = true;
    if (on) { u.unread = 0; badge.textContent = ''; list.scrollTop = list.scrollHeight; if (matchMedia('(pointer:fine)').matches) inp.focus(); }
  };
  u.add = m => {
    if (m.reset) { u.clear(); return; }
    if (!m.text || (m.id && u.seen.has(m.id))) return; if (m.id) u.seen.add(m.id);
    if (m.uid && blockedIds().includes(+m.uid)) return; /* 🚫 người mình đã chặn (friends.js lưu 'gumballz-blocked') */
    list.querySelector('.brc-empty')?.remove();
    const mine = u.api && (u.api.host ? !!m.host : !m.host && m.from === (ls.get('gumballz-name') || ''));
    const vip = !!m.vip && !!window.__gumballzSrvRoom; /* 👑 chủ web – cờ do máy chủ phòng kiểm vé (shared/ui/vip.js) */
    const el = document.createElement('div'); el.className = 'brc-m' + (mine ? ' me' : '') + (vip && !mine ? ' vip' : '');
    if (!mine) {
      const s = document.createElement('small');
      const nm = document.createElement('span'); nm.textContent = m.from; s.appendChild(nm); /* tên người gửi – không gắn 👑 ở đây: huy hiệu Chủ web chỉ hiện khi máy chủ phòng kiểm vé (m.vip), chủ phòng không tự gắn */
      const pills = tierBadges({ owner: !!m.vip, role: m.rl != null ? +m.rl : 0, supporter: !!m.sp }); /* 🎖️ huy hiệu 4 bậc (patch -95): owner chỉ từ m.vip đã kiểm, role/supporter do chủ phòng tra lúc vào */
      if (pills) { const p = document.createElement('span'); p.innerHTML = ' ' + pills; s.appendChild(p); }
      const tp = titlePillHtml(m.ti); if (tp) { const p = document.createElement('span'); p.innerHTML = ' ' + tp; s.appendChild(p); } /* 🎖️ danh hiệu trưng ra (patch -97): icon/tên tra lại từ bảng, id lạ → không hiện */
      const meU = auth.user();
      if (m.uid && (!meU || +m.uid !== meU.id)) {
        const ab = document.createElement('button'); ab.type = 'button'; ab.className = 'brc-add'; ab.textContent = '＋ Kết bạn';
        ab.onclick = () => import('./friends.js?v=37').then(x => x.quickAddFriend({ id: +m.uid, username: m.uname, name: m.from }));
        s.appendChild(ab);
      }
      el.appendChild(s);
    }
    el.appendChild(document.createTextNode(m.text)); list.appendChild(el);
    while (list.children.length > 80) list.firstChild.remove();
    const near = list.scrollHeight - list.scrollTop - list.clientHeight < 90; if (near || mine) list.scrollTop = list.scrollHeight;
    if (box.hidden && !m.old && !mine) {
      u.unread++; badge.textContent = u.unread > 9 ? '9+' : u.unread;
      peek.textContent = ''; const i = document.createElement('i'); i.textContent = m.from + ': '; peek.append(i, m.text); peek.hidden = false;
      clearTimeout(u.peekT); u.peekT = setTimeout(() => { peek.hidden = true; }, 4500);
    }
  };
  // kéo "tai" lên xuống; bấm (không kéo) thì mở/đóng
  let drag = null;
  tab.addEventListener('pointerdown', e => { drag = { y: e.clientY, top: parseFloat(tab.style.top), moved: false }; try { tab.setPointerCapture(e.pointerId); } catch (x) {} });
  tab.addEventListener('pointermove', e => { if (!drag) return; const d = e.clientY - drag.y; if (Math.abs(d) > 6) drag.moved = true; if (drag.moved) place(drag.top + d); });
  const up = () => { if (!drag) return; const moved = drag.moved; drag = null; if (moved) ls.set('gumballz-chat-y', parseFloat(tab.style.top)); else u.open(box.hidden); };
  tab.addEventListener('pointerup', up); tab.addEventListener('pointercancel', () => { drag = null; });
  box.querySelector('.brc-iv').onclick = () => { const R = window.__gumballzRoom, c = R && R.code && R.code(); if (!c) return; import('./invite.js?v=10').then(m => m.openInvite({ code: c, url: location.origin + location.pathname + '?room=' + encodeURIComponent(c) })); }; /* mời bạn / đổi game ngay trong ván */
  /* 🎲 Tới lượt mình (game phát sự kiện 'gumballz-myturn'): chat đang mở mà không gõ dở thì tự thu lại cho khỏi che nút; đang gõ thì hiện dải nhắc bấm để về bàn */
  addEventListener('gumballz-myturn', () => {
    try { navigator.vibrate && navigator.vibrate([60, 40, 60]); } catch (e) {}
    if (box.hidden) return;
    if (document.activeElement !== inp || !inp.value.trim()) { u.open(false); inp.blur(); return; }
    let t = box.querySelector('.brc-turn'); if (!t) { t = document.createElement('button'); t.type = 'button'; t.className = 'brc-turn'; t.textContent = '🎲 Tới lượt bạn! Chạm để về bàn'; t.onclick = () => { u.open(false); inp.blur(); t.remove(); }; box.querySelector('.brc-head').after(t); }
    clearTimeout(u.turnT); u.turnT = setTimeout(() => t.remove(), 15000);
  });
  box.querySelector('.brc-head button[aria-label="Đóng"]').onclick = () => u.open(false);
  box.querySelector('form').onsubmit = e => { e.preventDefault(); const t = inp.value.trim(); if (!t || !u.api) return; u.api.send(t); inp.value = ''; };
  for (const ev of ['keydown', 'keyup', 'keypress']) box.addEventListener(ev, e => { e.stopPropagation(); if (ev === 'keydown' && e.key === 'Escape') u.open(false); }); /* gõ chat không kích phím tắt của game */
  addEventListener('gumballz-chat', e => u.add(e.detail || {}));
  setInterval(() => { const on = !!(u.api && u.api.alive()); if (tab.hidden === on) { tab.hidden = !on; if (!on) { u.open(false); peek.hidden = true; } } }, 1500); /* rời phòng thì ẩn */
  empty();
  return u;
}
export function mountRoomChat(api) {
  if (!ui) ui = build();
  const fresh = ui.api && (ui.api.host || api.host) && ui.api !== api; /* phòng mới do mình mở → xoá chat cũ */
  ui.api = api; ui.tab.hidden = false;
  if (fresh) ui.clear();
  for (const m of api.history()) ui.add({ ...m, old: true });
}
