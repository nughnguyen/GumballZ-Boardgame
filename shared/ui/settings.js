// ⚙️ Cài đặt chung GumballZ (lưu trên máy này): tên mặc định, âm thanh, phòng công khai, số online, dữ liệu.
import { auth } from '../net/api.js?v=29';
import { confirmBox } from './dialog.js?v=10';
import { volumeRowsHTML, bindVolumeRows } from '../audio/volume.js?v=1';
const ROOT = new URL('../../', import.meta.url).href;
const GAMES = ['bang', 'uno', 'typhu', 'tamquoc', 'meono', 'masoi', 'scribble', 'tienlen', 'poker', 'xidach', 'catte', 'bacao', 'cangua', 'camel', 'solitaire', 'cotuong', 'thathaythach', 'baitan', 'loto', 'covua', 'tala', 'cholon', 'tusac', 'bantau', 'oanquan', 'caro', 'tictactoe', 'memory', 'covay', 'cothu', 'ranvathang', 'giandiep', 'codam', 'lieng', 'maubinh', 'xito', 'colat', 'domino'];
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

const CSS = `.st-ov{position:fixed;inset:0;z-index:9999;background:var(--overlay);display:grid;place-items:center;padding:14px}
.st-box{width:min(480px,100%);max-height:calc(100dvh - 28px);overflow:auto;background:var(--card);color:var(--ink2);border:3px solid var(--ink2);border-radius:20px;padding:18px;box-shadow:3px 3px 0 var(--sh-soft);font:600 15px/1.45 Nunito,system-ui,sans-serif;position:relative}
.st-box h2{margin:0 36px 10px 0;font:400 22px var(--font-display,"Bungee","Baloo 2",Nunito,sans-serif)}
.st-x{position:absolute;top:10px;right:10px;width:44px;height:44px;border-radius:12px;border:3px solid var(--on-accent);background:#FFE3A3;font-size:18px;cursor:pointer;color:var(--on-accent);box-shadow:3px 3px 0 var(--sh-soft-sm)}
.st-sec{background:var(--card);border-radius:16px;padding:10px 14px;margin:10px 0;border:3px solid var(--ink2);box-shadow:3px 3px 0 var(--sh-soft-sm)}
.st-sec h3{margin:2px 0 6px;font:800 15px Nunito,sans-serif;color:var(--ink2)}
.st-row{display:flex;align-items:center;gap:10px;min-height:44px;cursor:pointer}
.st-row span{flex:1}.st-row small{display:block;color:var(--muted);font-weight:600;font-size:12.5px}
.st-row input[type=checkbox]{appearance:none;-webkit-appearance:none;width:54px;height:30px;flex:none;margin:0;border:3px solid var(--ink2);border-radius:999px;background:var(--card);position:relative;cursor:pointer;transition:background .15s}
.st-row input[type=checkbox]::after{content:"";position:absolute;top:1px;left:2px;width:20px;height:20px;border-radius:50%;background:var(--ink2);transition:transform .15s}
.st-row input[type=checkbox]:checked{background:#FFB98A}
.st-row input[type=checkbox]:checked::after{transform:translateX(24px);background:var(--on-accent)}
.st-vol{display:flex;align-items:center;gap:10px;min-height:44px}
.st-vol span{flex:none;width:86px;font-weight:800}
.st-vol input[type=range]{flex:1;min-width:0;accent-color:#FFB98A}
.st-vol b{flex:none;width:44px;text-align:right;font-size:13.5px}
.st-box input[type=text]{width:100%;box-sizing:border-box;border:2.5px solid var(--ink2);border-radius:12px;padding:10px 12px;font:600 16px Nunito,sans-serif}
.st-box input[type=text]:focus{outline:none;box-shadow:0 0 0 3px #FFB9CF}
.st-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:6px 14px;border-radius:12px;border:3px solid var(--ink2);background:var(--card);color:var(--ink2);font:800 14px Nunito,sans-serif;cursor:pointer;text-decoration:none;box-shadow:3px 3px 0 var(--sh-soft-sm)}
.st-btn:hover{transform:translate(-1px,-1px)}
.st-btn:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--sh-soft-sm)}
.st-btn.red{background:#FFB9CF;color:var(--on-accent);border-color:var(--on-accent)}
.st-acts{display:flex;gap:8px;flex-wrap:wrap}`;

export function openSettings() {
  if (!document.getElementById('st-css')) { const s = document.createElement('style'); s.id = 'st-css'; s.textContent = CSS; document.head.append(s); }
  document.getElementById('st-ov')?.remove();
  const musicOn = GAMES.some(g => ls.get('gumballz-music-' + g) !== '0');
  /* patch -130: chế độ tối — trạng thái ban đầu = theme đang áp (đã theo hệ thống nếu chưa chọn). */
  const themeDark = (window.__gumballzTheme ? window.__gumballzTheme.current() : document.documentElement.getAttribute('data-theme')) === 'dark';
  const ov = document.createElement('div'); ov.className = 'st-ov'; ov.id = 'st-ov';
  const u = auth.user();
  ov.innerHTML = `<div class="st-box" role="dialog" aria-modal="true"><button class="st-x" aria-label="Đóng">✕</button><h2>⚙️ Cài đặt</h2>
    <div class="st-sec"><h3>🌐 Ngôn ngữ / Language</h3><div class="st-acts">
      <button class="st-btn" id="st-lang-vi" type="button">🇻🇳 Tiếng Việt</button>
      <button class="st-btn" id="st-lang-en" type="button">🇬🇧 English</button></div>
      <p style="margin:6px 0 0;font-size:12.5px;color:var(--muted)">Đổi ngôn ngữ sẽ tải lại trang. Câu chưa có bản dịch thì vẫn hiện tiếng Việt.</p></div>
    <div class="st-sec"><h3>🌙 Giao diện</h3>
      <label class="st-row"><input type="checkbox" id="st-theme" ${themeDark ? 'checked' : ''}><span>Chế độ tối<small>Nền tối dịu mắt, chơi ban đêm đỡ mỏi mắt (đồng bộ với nút 🌙/☀️ ở topbar)</small></span></label></div>
    <div class="st-sec"><h3>👤 Tên của bạn</h3><input type="text" id="st-name" maxlength="20" placeholder="Tên hiện khi vào phòng" value="">
      <p style="margin:6px 0 0;font-size:12.5px;color:var(--muted)">${u ? 'Đang đăng nhập: ' + esc(u.name) + (u.admin ? ' · 🛠️ quản trị viên' : '') : 'Tự điền sẵn ở mọi game. Đăng nhập để giữ tên trên mọi máy.'}</p></div>
    <div class="st-sec"><h3>🔊 Âm thanh &amp; cảm giác</h3>
      <label class="st-row"><input type="checkbox" id="st-music" ${musicOn ? 'checked' : ''}><span>Nhạc nền ở mọi game<small>Tắt/bật một lần cho tất cả game (vẫn chỉnh riêng trong từng game được)</small></span></label>
      <label class="st-row"><input type="checkbox" id="st-mute" ${ls.get('gumballz-mute-all') === '1' ? 'checked' : ''}><span>Tắt hết nhạc nền<small>Dùng khi đang ở chỗ cần yên lặng</small></span></label>
      <label class="st-row"><input type="checkbox" id="st-uisfx" ${ls.get('gumballz-ui-sfx') === '0' ? '' : 'checked'}><span>Tiếng bấm nút<small>Tiếng "tách" nhỏ ở trang chủ, hộp thoại, cài đặt</small></span></label>
      <label class="st-row"><input type="checkbox" id="st-haptic" ${ls.get('gumballz-haptic') === '0' ? '' : 'checked'}><span>Rung nhẹ khi bấm<small>Chỉ trên điện thoại có hỗ trợ rung</small></span></label>
      ${volumeRowsHTML()}</div>
    <div class="st-sec"><h3>🌐 Chơi online</h3>
      <label class="st-row"><input type="checkbox" id="st-pub" ${ls.get('gumballz-pub-default') === '1' ? 'checked' : ''}><span>Tạo phòng là tự công khai<small>Phòng mới tự hiện ở Sảnh chung (vẫn tắt được trong phòng)</small></span></label>
      <label class="st-row"><input type="checkbox" id="st-online" ${ls.get('gumballz-hide-online') === '1' ? '' : 'checked'}><span>Hiện số người đang online</span></label></div>
    <div class="st-sec"><h3>🧰 Khác</h3><div class="st-acts">
      <button class="st-btn" id="st-prof" type="button">🏅 Hồ sơ &amp; thành tích</button><a class="st-btn" href="${ROOT}luat/">⚙️ Luật mặc định</a><a class="st-btn" href="${ROOT}credits/">📜 Credits</a><a class="st-btn" href="${ROOT}privacy/">🔒 Riêng tư</a>
      ${u && u.admin ? `<a class="st-btn" href="${ROOT}quantri/">🛠️ Quản trị</a>` : ''}
      <button class="st-btn red" id="st-clear" type="button">🗑️ Xoá dữ liệu trên máy này</button></div></div>
  </div>`;
  document.body.append(ov);
  const $ = s => ov.querySelector(s);
  const curLang = ls.get('gumballz-lang') === 'en' ? 'en' : 'vi';
  const langBtn = $('#st-lang-' + curLang); if (langBtn) { langBtn.style.background = '#FFB98A'; langBtn.style.color = 'var(--on-accent)'; } /* patch -130: chữ trên nền đào phải là chữ tối ở cả 2 theme */
  const setLang = l => { if (l === curLang) return; ls.set('gumballz-lang', l); location.reload(); };
  $('#st-lang-vi').onclick = () => setLang('vi');
  $('#st-lang-en').onclick = () => setLang('en');
  $('#st-name').value = ls.get('gumballz-name') || '';
  /* patch -130: bật/tắt chế độ tối — qua theme.js nếu có, chưa có thì nạp động rồi đặt. */
  $('#st-theme').onchange = e => {
    const t = e.target.checked ? 'dark' : 'light';
    if (window.__gumballzTheme) window.__gumballzTheme.set(t);
    else import('./theme.js?v=1').then(() => window.__gumballzTheme.set(t)).catch(function () {});
  };
  $('#st-name').onchange = e => { const v = e.target.value.trim().slice(0, 20); ls.set('gumballz-name', v); if (auth.user() && v.length >= 2) auth.rename(v); };
  $('#st-music').onchange = e => GAMES.forEach(g => ls.set('gumballz-music-' + g, e.target.checked ? '1' : '0'));
  $('#st-mute').onchange = e => ls.set('gumballz-mute-all', e.target.checked ? '1' : '0');
  $('#st-uisfx').onchange = e => ls.set('gumballz-ui-sfx', e.target.checked ? '1' : '0');
  $('#st-haptic').onchange = e => ls.set('gumballz-haptic', e.target.checked ? '1' : '0');
  bindVolumeRows(ov); /* hai thanh trượt âm lượng nhạc nền / hiệu ứng (shared/audio/volume.js) */
  $('#st-pub').onchange = e => ls.set('gumballz-pub-default', e.target.checked ? '1' : '0');
  $('#st-online').onchange = e => { ls.set('gumballz-hide-online', e.target.checked ? '0' : '1'); document.querySelectorAll('#online').forEach(el => { el.style.display = e.target.checked ? '' : 'none'; }); };
  $('#st-prof').onclick = () => { ov.remove(); import('./profile.js?v=64').then(m => m.openProfile()); };
  $('#st-clear').onclick = async () => {
    if (!(await confirmBox('Tên, giao diện, luật đã chọn và ván đang chơi dở trên máy này sẽ bị xoá. Tài khoản vẫn còn trên máy chủ, bạn chỉ bị đăng xuất.', { title: '🗑️ Xoá dữ liệu trên máy này?', ok: 'Xoá hết', danger: true }))) return;
    try { Object.keys(localStorage).filter(k => /^(gumballz|bangvn|meono|uno|typhu|sol|tq|masoi|scribble|camel|cangua|poker|tienlen|xidach|catte|bacao|cotuong|tht|tan-|loto|covua|tala|cholon|tusac|bantau|oanquan|caro|tictactoe|memory|covay|cothu|ranvathang)/i.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) {}
    location.reload();
  };
  const close = () => { ov.remove(); removeEventListener('keydown', k); };
  const k = e => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', k);
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('.st-x')) close(); });
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
