// 👤 Hồ sơ công khai của một thành viên: hình đại diện, cấp độ, danh hiệu, số liệu chơi, thành tích, game chơi nhiều.
// Mở từ thẻ người chơi (bấm tên/avatar trong phòng), bảng xếp hạng, hộp bạn bè, trang quản trị:
//   import('…/shared/ui/member.js?v=3').then(m => m.openMember(uid))      // uid = số id tài khoản hoặc tên đăng nhập
// Dữ liệu lấy từ GET /profile/<id> (máy chủ tự tính danh hiệu bằng shared/titles.js). Khách chưa đăng nhập không có hồ sơ công khai.
import { auth, friends, API } from '../net/api.js?v=29';
import { profileCss, avatarHTML, safeAv, nameStyle, nameClass, bannerHTML, AVATARS } from './profile.js?v=53';
import { ACHS, GAME_NAMES } from './stats.js?v=89';
import { GAME_WINS } from '../titles.js?v=4';
import { attachInfo } from './infopop.js?v=1'; /* ℹ️ chạm (mobile) / rê chuột (desktop) vào danh hiệu, thành tích để xem cách nhận */
import { ensureBadgesCSS, tierBadges } from './badges.js?v=1'; /* 🎖️ huy hiệu 4 bậc (patch -95) — hồ sơ công khai (patch -98) */
/* hồ sơ công khai (GET /profile/<id hoặc tên đăng nhập>) – gọi thẳng qua API() để không phải đợi shared/net/api.js thêm hàm memberProfile */
const memberProfile = async key => {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 10000);
  try { const r = await fetch(API() + '/profile/' + encodeURIComponent(String(key)), { signal: ctl.signal }); return await r.json(); }
  catch (e) { return { ok: false, msg: 'Không kết nối được máy chủ – thử lại sau nha' }; } finally { clearTimeout(t); }
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CSS = `.mb-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:5px}
.mb-rank{display:flex;align-items:center;gap:8px;margin:0 0 4px;padding:9px 12px;border-radius:14px;background:linear-gradient(135deg,#fff6dc,#ffe09e);color:#7a4300;font:800 14px Nunito,sans-serif}
.mb-tts{display:flex;flex-wrap:wrap;gap:6px}.mb-tts .pf-tt{font-size:13px;padding:4px 11px}
.mb-achs{display:flex;flex-wrap:wrap;gap:6px}.mb-achs span{display:inline-flex;align-items:center;gap:5px;background:#FFFDF9;border:1.5px solid #f0e2d2;border-radius:999px;padding:3px 10px;font:800 12.5px Nunito,sans-serif}
.mb-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.mb-acts button{flex:1;min-width:130px;min-height:46px;border:0;border-radius:999px;font:800 15px "Baloo 2",Nunito,sans-serif;cursor:pointer;background:#f0e6da;color:#4A3E5C}
.mb-acts .pri{background:linear-gradient(120deg,#ff4d6a,#ff8a3d);color:#fff}.mb-acts .dm{background:#eafaf1;color:#147a44;box-shadow:inset 0 0 0 1.5px #bce8cf}.mb-acts button:disabled{opacity:.6;cursor:default}
.mb-load{padding:40px 10px;text-align:center;color:#6b5f7a;font-weight:800}
.pf-ov.pf-shown,.pf-ov.pf-shown .pf-box{animation:none}`;
function css() { profileCss(); ensureBadgesCSS(); if (document.getElementById('mb-css')) return; const s = document.createElement('style'); s.id = 'mb-css'; s.textContent = CSS; document.head.append(s); }
export const titlePill = t => (t ? `<span class="pf-tt" tabindex="0" role="button" data-iicon="${esc(t.icon)}" data-iname="${esc(t.name)}" data-ihow="${esc(titleDesc(t))}" data-istate="✅ Đã đạt">${esc(t.icon)} ${esc(t.name)}</span>` : '');
const titleDesc = t => (t.game ? `Thắng ${GAME_WINS} ván ${GAME_NAMES[t.game] || t.game}` : t.desc || '');

export function openMember(key) {
  css(); document.getElementById('mb-ov')?.remove();
  const ov = document.createElement('div'); ov.className = 'pf-ov'; ov.id = 'mb-ov';
  const close = () => { ov.remove(); removeEventListener('keydown', onKey, true); }, onKey = e => { if (e.key === 'Escape' && !document.querySelector('.dg-ov')) { e.stopPropagation(); close(); } };
  let U = null, rel = null /* fr | in | out | none | null (chưa biết) */, busy = false;
  const frame = inner => `<div class="pf-box" role="dialog" aria-modal="true" aria-label="Hồ sơ thành viên"><button class="pf-x" aria-label="Đóng">✕</button>${inner}</div>`;
  const draw = () => {
    if (!U) return;
    const me = auth.user(), mine = !!me && me.id === U.id, got = ACHS.filter(a => U.ach.includes(a.id));
    /* vẽ lại (đổi quan hệ bạn bè…) không nhảy về đầu, không chạy lại hiệu ứng mở */
    const keepY = ov.querySelector('.pf-box') ? ov.querySelector('.pf-box').scrollTop : 0;
    if (ov.querySelector('.pf-box')) ov.classList.add('pf-shown');
    let acts = '';
    if (mine) acts = '<button type="button" class="pri" data-a="edit">✏️ Sửa hồ sơ của tôi</button>';
    else if (!me) acts = '<button type="button" class="pri" data-a="login">👤 Đăng nhập để kết bạn</button>';
    else if (rel === 'fr') acts = '<button type="button" class="dm" data-a="dm">💬 Nhắn tin riêng</button>';
    else if (rel === 'in') acts = '<button type="button" class="pri" data-a="accept">✓ Đồng ý kết bạn</button>';
    else if (rel === 'out') acts = '<button type="button" disabled>⏳ Đã gửi lời mời kết bạn</button>';
    else if (rel === 'none') acts = '<button type="button" class="pri" data-a="add">＋ Kết bạn</button>';
    ov.innerHTML = frame(`
      ${bannerHTML(U.av && safeAv(U.av, U.id).b)}
      <div class="pf-head">${avatarHTML(72, safeAv(U.av, U.id))}<div style="min-width:0"><div class="pf-name${nameClass(U.av && U.av.n)}" style="${nameStyle(U.av && U.av.n)}">${esc(U.name)}</div>
        <div class="pf-sub">${U.username ? '@' + esc(U.username) + ' · ' : ''}#${U.id}</div>
        <div class="mb-tags"><span class="pf-tt lv">⭐ Cấp ${U.lv} · ${esc(U.lvName)}</span>${titlePill(U.title && { ...U.title, desc: titleDesc(U.title) })}${tierBadges({ owner: !!U.owner, role: U.owner || U.admin ? 2 : U.mod ? 1 : 0, supporter: !!U.supporter })}</div></div></div>
      <div class="pf-nums"><div><b>${U.p}</b><small>ván đã chơi</small></div><div><b>${U.w}</b><small>ván thắng</small></div><div><b>${U.rate}%</b><small>tỉ lệ thắng</small></div><div><b>${U.best}</b><small>chuỗi thắng</small></div></div>
      ${U.rank ? `<div class="mb-rank">🏆 Hạng ${U.rank}${U.total ? ' / ' + U.total : ''} trên bảng xếp hạng toàn máy chủ</div>` : ''}
      <h3>🎖️ Danh hiệu <small>${U.titles.length} đã đạt</small></h3>
      ${U.titles.length ? `<div class="mb-tts">${U.titles.map(t => titlePill({ ...t, desc: titleDesc(t) })).join('')}</div>` : '<div class="pf-empty">Chưa có danh hiệu nào – chơi thêm vài ván là có liền 🎲</div>'}
      <h3>🏅 Thành tích <small>${got.length} / ${ACHS.length}</small></h3>
      ${got.length ? `<div class="mb-achs">${got.map(a => `<span tabindex="0" role="button" data-iicon="${esc(a.icon)}" data-iname="${esc(a.name)}" data-ihow="${esc(a.desc)}" data-istate="✅ Đã mở">${a.icon} ${esc(a.name)}</span>`).join('')}</div>` : '<div class="pf-empty">Chưa mở được thành tích nào.</div>'}
      <h3>🎮 Chơi nhiều nhất <small>${U.kinds} game</small></h3>
      ${U.games.length ? `<div class="pf-g">${U.games.map(g => `<div>${esc(GAME_NAMES[g.g] || g.g)}</div><span>${g.p} ván</span><em>${g.w} thắng</em>`).join('')}</div>` : '<div class="pf-empty">Chưa chơi ván nào khi đã đăng nhập.</div>'}
      <p class="pf-note">Thành viên từ ${new Date(U.created).toLocaleDateString('vi-VN')}${U.days ? ` · đã chơi ${U.days} ngày` : ''}</p>
      ${acts ? `<div class="mb-acts">${acts}</div>` : ''}`);
    if (keepY) ov.querySelector('.pf-box').scrollTop = keepY;
    ov.querySelectorAll('[data-iname]').forEach(el => attachInfo(el, () => ({ icon: el.dataset.iicon || 'ℹ️', name: el.dataset.iname, how: el.dataset.ihow, state: el.dataset.istate || '' }))); /* ℹ️ gắn lại bong bóng thông tin sau mỗi lần vẽ lại */
  };
  const loadRel = async () => {
    const me = auth.user(); if (!me || !U || me.id === U.id) return;
    const d = await friends.list(); if (!d || !d.ok || !ov.isConnected) return;
    rel = (d.friends || []).some(f => f.id === U.id) ? 'fr' : (d.incoming || []).some(f => f.id === U.id) ? 'in' : (d.outgoing || []).some(f => f.id === U.id) ? 'out' : 'none'; draw();
  };
  ov.addEventListener('click', async e => {
    if (e.target === ov || e.target.closest('.pf-x')) return close();
    const b = e.target.closest('button[data-a]'); if (!b || busy || !U) return; const a = b.dataset.a;
    if (a === 'edit') { close(); import('./profile.js?v=53').then(m => m.openProfile()); }
    else if (a === 'login') { close(); import('./account.js?v=50').then(m => m.openLogin()); }
    else if (a === 'dm') { close(); import('./friends.js?v=35').then(m => m.openFriends(U.id)); }
    else if (a === 'add' || a === 'accept') {
      busy = true; b.disabled = true;
      try { const m = await import('./friends.js?v=35'); if (a === 'add') await m.quickAddFriend({ id: U.id, username: U.username, name: U.name }); else await friends.act(U.id, 'accept'); await m.refreshUnread(); } catch (err) {}
      busy = false; await loadRel(); if (ov.isConnected && rel == null) draw();
    }
  });
  addEventListener('keydown', onKey, true);
  ov.innerHTML = frame('<div class="mb-load">Đang mở hồ sơ…</div>'); document.body.append(ov);
  memberProfile(key).then(r => {
    if (!ov.isConnected) return;
    if (!r || !r.ok || !r.user) { ov.innerHTML = frame(`<div class="mb-load">😿 ${esc((r && r.msg) || 'Không mở được hồ sơ này')}</div>`); return; }
    U = r.user; U.ach = Array.isArray(U.ach) ? U.ach : []; U.titles = Array.isArray(U.titles) ? U.titles : []; U.games = Array.isArray(U.games) ? U.games : [];
    draw(); loadRel();
  });
}
try { window.__gumballzMember = openMember; } catch (e) {}
