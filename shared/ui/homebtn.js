// Nút "🏠 Trang chủ" trong hộp thoại "Rời ván/bàn/làng?" của mọi game:
// bấm → chạy đúng thủ tục rời của game (bấm hộ nút Rời), rồi về trang chủ GumballZ.
// Dùng: <script type="module" src="../shared/ui/homebtn.js?v=71"></script>
const HOME = '../';
const isLeaveBtn = b => !b.dataset.home && (/^(m-leave|m-quit)$/.test(b.id) || /^\s*(🚪\s*)?Rời/.test(b.textContent || ''));

function inject(root) {
  const h2 = [...(root.matches && root.matches('h2') ? [root] : root.querySelectorAll('h2'))].find(h => /^\s*Rời[\s?]/.test(h.textContent || ''));
  if (!h2) return;
  const box = h2.parentElement;
  if (!box || box.querySelector('[data-home]')) return;
  const leave = [...box.querySelectorAll('button')].find(isLeaveBtn);
  if (!leave) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = leave.className.replace(/\b(red|danger|pri)\b/g, '').trim() || 'btn';
  b.dataset.home = '1';
  b.textContent = '🏠 Về trang chủ';
  b.style.cssText = 'margin-top:8px;width:100%';
  b.onclick = e => {
    e.preventDefault(); e.stopPropagation();
    try { leave.click(); } catch (err) {}
    setTimeout(() => { location.href = HOME; }, 250);
  };
  leave.parentElement.after(b);
}

// Nút rời ván trong game vốn là mũi tên "←" – trên điện thoại khó đoán là đường về trang chủ, nên đổi thành 🏠.
// Bấm vẫn mở hộp "Rời ván?" như cũ, trong đó có sẵn nút "🏠 Về trang chủ".
{ const lv = document.getElementById('btn-leave'); if (lv && lv.textContent.trim() === '←') { lv.textContent = '🏠'; lv.title = 'Rời ván · về trang chủ'; lv.setAttribute('aria-label', 'Rời ván, về trang chủ'); } }

const mo = new MutationObserver(muts => { for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) inject(n.closest ? (n.closest('[class*=modal],dialog,#modal') || n) : n); });
mo.observe(document.body, { childList: true, subtree: true });

// Chỗ đặt nút Sảnh + link chân trang: chân trang "fan-made" của game cũ;
// game mới (loveletter, matchu, s2048, domi, wordle, sudoku, spyfall, avalon)
// không có chân trang đó thì đặt vào cuối thẻ home-card của màn hình đầu.
function homeAnchor() {
  const ft = [...document.querySelectorAll('footer, p.note')].find(e => /fan-made/i.test(e.textContent));
  if (ft) return { el: ft, mode: 'footer' };
  const card = document.querySelector('#screen-home .home-card') || document.querySelector('#screen-home');
  return card ? { el: card, mode: 'home' } : null;
}

// 💌 Góp ý / ☕ Ủng hộ: thêm link vào chân trang của game (dùng shared/ui/feedback.js)
import('./feedback.js?v=37').then(() => {
  const a = homeAnchor();
  const box = document.createElement('p'); box.className = 'gumballz-fbline';
  box.style.cssText = 'text-align:center;font-size:13px;margin:6px 0 0;opacity:.9';
  box.innerHTML = '<a href="#" data-rank style="color:inherit">🏆 Bảng xếp hạng</a> · <a href="#" data-profile style="color:inherit">🏅 Hồ sơ</a> · <a href="#" data-friends style="color:inherit">🤝 Bạn bè</a> · <a href="#" data-feedback style="color:inherit">💌 Góp ý</a> · <a href="#" data-donate style="color:inherit">☕ Ủng hộ</a>';
  box.querySelector('[data-rank]').onclick = e => { e.preventDefault(); import('./leaderboard.js?v=37').then(m => m.openLeaderboard(GAME)); };
  box.querySelector('[data-profile]').onclick = e => { e.preventDefault(); import('./profile.js?v=56').then(m => m.openProfile()); };
  box.querySelector('[data-friends]').onclick = e => { e.preventDefault(); import('./friends.js?v=37').then(m => m.openFriends()); };
  if (!a) return;
  if (a.mode === 'footer') a.el.after(box);
  else a.el.append(box);
}).catch(() => {});

// 🌐 Sảnh chung & ⚡ Tìm trận nhanh trong từng game ở màn hình đầu
const GAME = location.pathname.replace(/\/+$/, '').split('/').pop();
let wantPublic = false;
try {
  if (/[?&]public=1/.test(location.search)) sessionStorage.setItem('gumballz-pub-next', '1');
  if (/[?&]autohost=1/.test(location.search)) {
    sessionStorage.setItem('gumballz-pub-next', '1');
    ['gumballz-session-' + GAME, 'gumballz-hostsnap-' + GAME, GAME + 'vn-host', GAME + '-host'].forEach(k => localStorage.removeItem(k));
    const u = new URL(location.href); u.searchParams.delete('autohost');
    history.replaceState(null, '', u.pathname + (u.search || '') + (u.hash || ''));
    setTimeout(() => {
      let nm = (localStorage.getItem('gumballz-name') || '').trim();
      if (!nm) { nm = 'Kỳ thủ'; try { localStorage.setItem('gumballz-name', nm); } catch (e) {} }
      document.querySelectorAll('#inp-name, #name').forEach(inp => { if (!inp.value.trim()) inp.value = nm; });
      /* main.js của game có thể chưa gắn sự kiện lúc này (bấm hụt) → bấm lại cho tới khi rời màn hình đầu */
      let tries = 0; const go = () => { const b = document.getElementById('btn-create'); if (!b || b.offsetParent === null || b.disabled || localStorage.getItem('gumballz-session-' + GAME) || ++tries > 8) return; b.click(); setTimeout(go, 1500); };
      go();
    }, 80);
  }
  wantPublic = sessionStorage.getItem('gumballz-pub-next') === '1' || localStorage.getItem('gumballz-pub-default') === '1';
} catch (e) {}
(() => {
  const a = homeAnchor();
  if (!a) return;
  const row = document.createElement('div');
  row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;margin:10px 0 4px';
  const mm = document.createElement('button'); mm.type = 'button'; mm.className = 'gumballz-mmbtn';
  mm.innerHTML = '⚡ Tìm trận nhanh';
  mm.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;width:100%;min-height:48px;border:3px solid var(--on-accent);border-radius:999px;cursor:pointer;font:400 15px var(--font-display,"Bungee","Baloo 2",Nunito,system-ui,sans-serif);color:var(--on-accent);background:#FFB98A;box-shadow:3px 3px 0 var(--sh-soft-sm);padding:0 12px';
  mm.onclick = () => import('./lobby.js?v=61').then(m => m.openMatchmaking(GAME));
  const b = document.createElement('button'); b.type = 'button'; b.className = 'gumballz-lobbybtn';
  b.innerHTML = '🌐 Phòng & chat';
  b.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;width:100%;min-height:48px;border:3px solid var(--on-accent);border-radius:999px;cursor:pointer;font:400 15px var(--font-display,"Bungee","Baloo 2",Nunito,system-ui,sans-serif);color:var(--on-accent);background:#FFB9CF;box-shadow:3px 3px 0 var(--sh-soft-sm);padding:0 12px';
  b.onclick = () => import('./lobby.js?v=61').then(m => m.openLobby(GAME));
  row.append(mm, b);
  if (a.mode === 'footer') a.el.before(row);
  else a.el.append(row);
  const on = document.createElement('p'); on.innerHTML = '&nbsp;'; on.style.cssText = 'visibility:hidden;text-align:center;margin:4px 0 8px;font:700 13px Nunito,system-ui,sans-serif;opacity:.85';
  row.after(on);
  import('../net/presence.js?v=26').then(m => { let hide = false; try { hide = localStorage.getItem('gumballz-hide-online') === '1'; } catch (e) {} if (!hide) m.mountOnline(on); }).catch(() => {});
})();

// 🌐 Công khai phòng: hiện công tắc cạnh mã phòng (chỉ chủ phòng online)
function pubToggle() {
  const host = window.__gumballzHost; if (!host || host.dead) return;
  const codeEl = document.querySelector('#room-code, #lobby-code'); if (!codeEl) return;
  const code = (codeEl.textContent || '').trim(); if (!/^[A-Z0-9]{5}$/.test(code) || code !== host.code) return;
  const anchor = document.getElementById('code-box') || codeEl;
  if (!anchor.offsetParent) return; // đang ẩn
  let w = document.getElementById('gumballz-pub');
  const key = 'gumballz-pub-' + host.game + '-' + code;
  let saved = null; try { saved = sessionStorage.getItem(key); } catch (e) {}
  if (!w) {
    w = document.createElement('label'); w.id = 'gumballz-pub';
    w.style.cssText = 'display:flex;align-items:center;gap:10px;margin:10px auto;max-width:420px;padding:10px 14px;border-radius:16px;background:#FFE3A3;border:2px solid var(--on-accent);color:var(--on-accent);font:700 14px/1.35 Nunito,system-ui,sans-serif;cursor:pointer;text-align:left';
    w.innerHTML = '<input type="checkbox" style="width:22px;height:22px;flex:none;accent-color:var(--ink2)"><span><b>🌐 Công khai phòng</b><br><small style="font-weight:600;opacity:.85">Hiện ở Sảnh chung để người lạ vào chơi cùng. Tắt = chỉ ai có mã/link mới vào được.</small></span>';
    anchor.after(w);
    w.querySelector('input').onchange = e => { const on = e.target.checked; try { sessionStorage.setItem(key, on ? '1' : '0'); sessionStorage.removeItem('gumballz-pub-next'); } catch (x) {} host.setPublic(on); };
  }
  const cb = w.querySelector('input');
  if (w.dataset.code !== code || w.dataset.host !== host.pubK) { // phòng mới / chủ phòng mới (tải lại trang)
    w.dataset.code = code; w.dataset.host = host.pubK;
    const on = saved === '1' || (saved === null && wantPublic);
    cb.checked = on; if (on !== !!host.pub) host.setPublic(on);
    if (wantPublic) { wantPublic = false; try { sessionStorage.removeItem('gumballz-pub-next'); sessionStorage.setItem(key, on ? '1' : '0'); } catch (e) {} }
  }
}
// 📨 Nút "Mời bạn (QR)" ngay dưới mã phòng – ai trong phòng cũng thấy (chủ phòng lẫn khách)
function inviteBtn() {
  const codeEl = document.querySelector('#room-code, #lobby-code'); let b = document.getElementById('gumballz-invite');
  const code = codeEl ? (codeEl.textContent || '').trim() : '';
  const anchor = codeEl && (document.getElementById('code-box') || codeEl);
  if (!anchor || !anchor.offsetParent || !/^[A-Z0-9]{5}$/.test(code)) { if (b) b.remove(); return; }
  if (b && b.previousElementSibling === anchor) return;
  if (b) b.remove();
  b = document.createElement('button'); b.id = 'gumballz-invite'; b.type = 'button'; b.textContent = '📨 Mời bạn (mã QR)';
  b.style.cssText = 'display:flex';
  import('./invite.js?v=10').then(m => { m.inviteCss(); b.onclick = () => { const c = (document.querySelector('#room-code, #lobby-code').textContent || '').trim(); m.openInvite({ code: c, url: location.origin + location.pathname + '?room=' + encodeURIComponent(c) }); }; });
  anchor.after(b);
}
// 📣 Nút "Mời lên kênh thế giới" ngay dưới nút mời QR – chỉ chủ phòng, chỉ khi phòng đang công khai.
// Bấm → gửi 1 lời mời vào kênh chat Chung của sảnh (kèm mã phòng để người khác bấm vào chơi).
function worldInviteBtn() {
  const host = window.__gumballzHost;
  const codeEl = document.querySelector('#room-code, #lobby-code');
  const code = codeEl ? (codeEl.textContent || '').trim() : '';
  const anchor = codeEl && (document.getElementById('code-box') || codeEl);
  const qr = document.getElementById('gumballz-invite');
  const after = qr || anchor; // đặt sau nút QR (không chen giữa mã phòng và nút QR – inviteBtn() kiểm tra vị trí nút QR)
  let b = document.getElementById('gumballz-world-invite');
  const show = host && !host.dead && host.pub && /^[A-Z0-9]{5}$/.test(code) && code === host.code;
  if (!show || !anchor || !anchor.offsetParent) { if (b) b.remove(); return; }
  if (!b || b.previousElementSibling !== after) {
    if (b) b.remove();
    b = document.createElement('button'); b.id = 'gumballz-world-invite'; b.type = 'button';
    b.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;gap:8px;margin:10px auto 0;min-height:44px;padding:8px 20px;border-radius:999px;border:0;cursor:pointer;color:var(--on-accent);font:400 15.5px var(--font-display,"Bungee","Baloo 2",Nunito,system-ui,sans-serif);background:linear-gradient(90deg,#FFB98A,#FFB9CF);box-shadow:0 8px 18px -8px rgba(255,185,138,.8)';
    b.textContent = '📣 Mời lên kênh thế giới';
    b.onclick = async () => {
      if (b.disabled || b.dataset.busy === '1') return;
      const h = window.__gumballzHost; if (!h || h.dead || !h.pub) return;
      const c = (document.querySelector('#room-code, #lobby-code').textContent || '').trim();
      b.dataset.busy = '1'; b.disabled = true; b.textContent = '📣 Đang mời…';
      const r = await import('./worldchat.js?v=3').then(m => m.sendWorldInvite({ game: h.game, code: c, k: h.pubK })).catch(() => null);
      b.dataset.busy = '';
      if (r && r.ok) {
        try { localStorage.setItem('gumballz-invite-' + h.game + '-' + c, String(Date.now())); } catch (e) {}
        import('./dialog.js?v=10').then(m => m.toast('Đã mời lên kênh thế giới 📣')).catch(() => {});
      } else {
        import('./dialog.js?v=10').then(m => m.toast((r && r.msg) || 'Không mời được, thử lại sau nha.')).catch(() => {});
        b.disabled = false; b.textContent = '📣 Mời lên kênh thế giới';
      }
    };
    after.after(b);
  }
  // đếm ngược 60 giây sau mỗi lần mời (lưu theo từng phòng)
  if (b.dataset.busy === '1') return;
  let cd = 0;
  try { cd = Math.max(0, 60 - Math.floor((Date.now() - (+localStorage.getItem('gumballz-invite-' + host.game + '-' + code) || 0)) / 1000)); } catch (e) {}
  if (cd > 0) { b.disabled = true; b.textContent = `📣 Đã mời · gửi lại sau ${cd}s`; }
  else if (b.disabled || b.textContent.startsWith('📣 Đã mời')) { b.disabled = false; b.textContent = '📣 Mời lên kênh thế giới'; }
}
setInterval(() => { pubToggle(); inviteBtn(); worldInviteBtn(); }, 1000);
