// 🌐 Kênh thế giới – nút 💬 nổi ở trang chủ + Sảnh chung.
// Bấm → mở hộp Sảnh ở tab Chat (kênh "Chung" ch='all' đã có sẵn trong sảnh).
// Chấm đỏ + bong bóng xem nhanh: worldchat giữ 1 WebSocket riêng tới /lobby chỉ để
// nghe tin kênh 'all'; khi hộp Sảnh đang mở thì đóng WebSocket này (hộp Sảnh tự có
// WebSocket của nó), đóng hộp thì mở lại. Không mở 2 WebSocket cùng lúc.
import { WS, auth, guestId, myName } from '../net/api.js?v=29';

const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const CSS = `
.wc-tab{position:fixed;left:0;z-index:25;width:44px;height:46px;border:0;border-radius:0 16px 16px 0;background:#FFFDF9;box-shadow:0 8px 20px -8px rgba(74,62,92,.53),0 2px 6px rgba(74,62,92,.13);font-size:20px;line-height:1;cursor:pointer;display:grid;place-items:center;padding:0 2px 0 0;touch-action:none;-webkit-tap-highlight-color:transparent}
.wc-tab[hidden],.wc-peek[hidden]{display:none}
.wc-tab b{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;border-radius:9px;background:#FFB98A;color:#4A3E5C;font:800 11px/18px Nunito,sans-serif;padding:0 4px;box-sizing:border-box}
.wc-tab b:empty{display:none}
.wc-peek{position:fixed;left:50px;z-index:25;max-width:min(260px,calc(100vw - 60px));background:#4A3E5C;color:#fff;border-radius:14px;padding:7px 11px;font:700 13px/1.3 Nunito,sans-serif;box-shadow:0 10px 24px -8px rgba(74,62,92,.66);pointer-events:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;animation:wc-in .2s ease-out}
.wc-peek i{font-style:normal;color:#FFE3A3;font-weight:800}
@keyframes wc-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
`;
const helloMsg = () => ({ t: 'hello', token: auth.token(), guest: guestId(), name: (auth.user()?.name) || myName() || 'Khách', chs: ['all'] });

/* 📣 Chủ phòng công khai mời cả kênh thế giới vào phòng mình.
   Mở 1 WebSocket ngắn tới /lobby, chào xong rồi gửi { t:'invite', game, code, k },
   đợi máy chủ trả {t:'ok'} hoặc {t:'err'} (tối đa 8 giây) rồi đóng. */
export function sendWorldInvite({ game, code, k }) {
  return new Promise(res => {
    let ws = null, done = false;
    const fin = v => { if (done) return; done = true; clearTimeout(t); try { ws && ws.close(1000, 'bye'); } catch (e) {} res(v); };
    const t = setTimeout(() => fin({ ok: false, msg: 'Máy chủ không trả lời, thử lại sau nha.' }), 8000);
    try { ws = new WebSocket(WS() + '/lobby'); } catch (e) { return fin({ ok: false, msg: 'Không nối được máy chủ.' }); }
    ws.onopen = () => { try { ws.send(JSON.stringify(helloMsg())); } catch (e) {} };
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'me') { try { ws.send(JSON.stringify({ t: 'invite', game, code, k })); } catch (e) {} }
      else if (m.t === 'ok') fin({ ok: true, msg: m.msg || 'Đã mời lên kênh thế giới 📣' });
      else if (m.t === 'err') fin({ ok: false, msg: m.msg || 'Không mời được.' });
    };
    ws.onclose = () => fin({ ok: false, msg: 'Mất kết nối máy chủ, thử lại sau nha.' });
    ws.onerror = () => {};
  });
}

let ui = null;
export function mountWorldChat() {
  if (ui) return ui;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const tab = document.createElement('button'); tab.className = 'wc-tab'; tab.type = 'button'; tab.setAttribute('aria-label', '🌐 Kênh thế giới'); tab.innerHTML = '💬<b></b>';
  const peek = document.createElement('div'); peek.className = 'wc-peek'; peek.hidden = true;
  document.body.append(tab, peek);
  const badge = tab.querySelector('b');
  const u = { tab, peek, unread: 0, peekT: 0 };
  const overlayOpen = () => !!document.getElementById('lb-ov');
  const place = y => { y = Math.max(70, Math.min(innerHeight - 120, y)); tab.style.top = y + 'px'; peek.style.top = (y + 6) + 'px'; };
  place(+ls.get('gumballz-worldchat-y') || Math.round(innerHeight * .42));
  addEventListener('resize', () => place(parseFloat(tab.style.top) || 200));
  // kéo "tai" lên xuống; bấm (không kéo) thì mở hộp Sảnh ở tab Chat
  let drag = null;
  tab.addEventListener('pointerdown', e => { drag = { y: e.clientY, top: parseFloat(tab.style.top), moved: false }; try { tab.setPointerCapture(e.pointerId); } catch (x) {} });
  tab.addEventListener('pointermove', e => { if (!drag) return; const d = e.clientY - drag.y; if (Math.abs(d) > 6) drag.moved = true; if (drag.moved) place(drag.top + d); });
  const up = () => {
    if (!drag) return; const moved = drag.moved; drag = null;
    if (moved) { ls.set('gumballz-worldchat-y', parseFloat(tab.style.top)); return; }
    u.unread = 0; badge.textContent = ''; peek.hidden = true;
    import('./lobby.js?v=60').then(m => m.openLobby(null, { tab: 'chat' })).catch(() => {});
  };
  tab.addEventListener('pointerup', up); tab.addEventListener('pointercancel', () => { drag = null; });
  // WebSocket nghe tin kênh 'all' để hiện chấm đỏ + bong bóng (chỉ khi hộp Sảnh đang đóng)
  let ws = null, wait = 1000, dead = false;
  const closeWs = () => { if (ws) { try { ws.close(); } catch (e) {} ws = null; } };
  function connect() {
    if (dead || overlayOpen() || (ws && (ws.readyState === 0 || ws.readyState === 1))) return;
    try { ws = new WebSocket(WS() + '/lobby'); } catch (e) { schedule(); return; }
    ws.onopen = () => { wait = 1000; try { ws.send(JSON.stringify(helloMsg())); } catch (e) {} };
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'reset' && m.ch === 'all') { u.unread = 0; badge.textContent = ''; peek.hidden = true; return; } // kênh thế giới reset 0:00: xóa chấm đỏ + bong bóng
      if (m.t !== 'msg' || !m.m || m.m.ch !== 'all' || overlayOpen()) return;
      u.unread++; badge.textContent = u.unread > 9 ? '9+' : u.unread;
      peek.textContent = ''; const i = document.createElement('i'); i.textContent = (m.m.name || 'Ai đó') + ': '; peek.append(i, m.m.text); peek.hidden = false;
      clearTimeout(u.peekT); u.peekT = setTimeout(() => { peek.hidden = true; }, 4500);
    };
    ws.onclose = () => { ws = null; if (!dead) schedule(); };
    ws.onerror = () => {};
  }
  function schedule() { if (dead) return; setTimeout(() => { if (!overlayOpen()) connect(); }, wait); wait = Math.min(wait * 2, 20000); }
  setInterval(() => { // hộp Sảnh mở thì đóng WebSocket chấm đỏ (hộp tự có WebSocket riêng); đóng hộp thì mở lại
    if (overlayOpen()) closeWs();
    else if (!ws || ws.readyState === 3) connect();
  }, 2000);
  connect();
  ui = u;
  return u;
}
