// 📨 Hộp "Mời bạn": mời bạn bè trong web lên đầu, rồi link + mã QR. Dùng chung cho mọi game (homebtn.js tự gắn nút cạnh mã phòng).
// QR vẽ bằng thư viện qrcode-generator (MIT, Kazuhiko Arase) – shared/vendor/qrcode.js
import { toast } from './dialog.js?v=8';
const CSS = `.iv-ov{position:fixed;inset:0;z-index:10040;background:rgba(74,62,92,.7);display:grid;place-items:center;padding:16px;backdrop-filter:blur(3px);animation:iv-f .16s ease-out}
.iv-box{width:min(380px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:#FFFDF9;color:#4A3E5C;border-radius:26px;padding:22px 20px 18px;box-shadow:0 24px 70px #0008;font:600 15px/1.45 Nunito,system-ui,sans-serif;text-align:center;position:relative;animation:iv-p .24s cubic-bezier(.2,1.2,.4,1)}
.iv-box h2{margin:0 30px 2px;font:400 22px/1.2 var(--font-display,"Bungee","Baloo 2",Nunito,sans-serif)}.iv-box p{margin:0;color:#8B7E9E}
.iv-x{position:absolute;top:10px;right:10px;width:44px;height:44px;border-radius:50%;border:0;background:#f0e6da;font-size:17px;cursor:pointer;color:#4A3E5C}
.iv-qr{width:min(230px,70vw);aspect-ratio:1;margin:14px auto 10px;padding:12px;background:#FFFDF9;border-radius:22px;box-shadow:0 10px 26px -14px rgba(74,62,92,.66),0 0 0 1.5px #f0e2d2;position:relative}
.iv-qr svg{width:100%;height:100%;display:block}.iv-qr img{position:absolute;left:50%;top:50%;width:19%;height:19%;transform:translate(-50%,-50%);background:#FFFDF9;border-radius:26%;padding:3%;box-sizing:content-box}
.iv-code{font:400 34px/1 var(--font-display,"Bungee","Baloo 2",ui-monospace,monospace);letter-spacing:6px;margin:6px 0 2px;color:#4A3E5C}
.iv-link{display:block;font:700 12.5px/1.3 ui-monospace,Menlo,monospace;color:#8B7E9E;word-break:break-all;margin:4px 6px 12px}
.iv-acts{display:flex;gap:10px}.iv-b{flex:1;min-height:48px;border-radius:999px;border:1.5px solid #e6d8c8;background:#FFFDF9;color:#4A3E5C;font:400 15.5px var(--font-display,"Bungee","Baloo 2",Nunito,sans-serif);cursor:pointer;transition:transform .1s}
.iv-b:active{transform:scale(.97)}.iv-b.main{border:0;color:#4A3E5C;background:linear-gradient(90deg,#FFB98A,#FFB9CF);box-shadow:0 8px 18px -8px rgba(255,185,138,.8)}
#gumballz-invite{display:inline-flex;align-items:center;justify-content:center;gap:8px;margin:10px auto 0;min-height:44px;padding:8px 20px;border-radius:999px;border:0;cursor:pointer;color:#4A3E5C;font:400 15.5px var(--font-display,"Bungee","Baloo 2",Nunito,system-ui,sans-serif);background:linear-gradient(90deg,#C9BDF3,#ABE0C6);box-shadow:0 8px 18px -8px rgba(171,224,198,.8)}
.iv-fe{color:#8B7E9E;font-size:13.5px;text-align:left}.iv-lg{margin-left:6px;min-height:34px;padding:0 12px;border:0;border-radius:999px;background:#241A38;color:#fff;font:800 13px Nunito,sans-serif;cursor:pointer}
.iv-box h3{margin:0 0 6px;font:800 16px "Baloo 2",Nunito,sans-serif;text-align:left}.iv-fp{font-size:13px;margin:-2px 0 8px!important;text-align:left}
.iv-fr{margin-top:12px;border-top:0;padding-top:0}.iv-fl{display:flex;flex-direction:column;gap:6px;max-height:220px;overflow:auto}
.iv-f{display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:14px;background:#FFFDF9;box-shadow:0 0 0 1.5px #f0e2d2}
.iv-f .dot{width:10px;height:10px;border-radius:50%;background:#c9bfd2;flex:none}.iv-f .dot.on{background:#2fbf71;box-shadow:0 0 0 3px #2fbf7133}
.iv-f span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:800}.iv-f small{color:#8B7E9E;font-weight:700}
.iv-f button{min-height:36px;padding:0 14px;border:0;border-radius:999px;background:linear-gradient(90deg,#FFB98A,#FFB9CF);color:#4A3E5C;font:800 14px Nunito,sans-serif;cursor:pointer}.iv-f button:disabled{background:#d8f2e2;color:#17683a}
.iv-lk{margin-top:14px;border-top:1.5px dashed #ead9c6;padding-top:12px}
.iv-qd{margin-top:10px}.iv-qd summary{cursor:pointer;font:800 14px Nunito,sans-serif;color:#6b5f7a;min-height:40px;display:flex;align-items:center;justify-content:center;gap:6px;list-style:none}.iv-qd summary::-webkit-details-marker{display:none}
@keyframes iv-f{from{opacity:0}}@keyframes iv-p{from{opacity:0;transform:translateY(10px) scale(.96)}}`;
const ROOT = new URL('../../', import.meta.url).href;
let lib = null;
const loadQr = () => lib || (lib = new Promise((res, rej) => { if (window.qrcode) return res(window.qrcode); const s = document.createElement('script'); s.src = ROOT + 'shared/vendor/qrcode.js?v=1'; s.onload = () => res(window.qrcode); s.onerror = rej; document.head.append(s); }));
export function inviteCss() { if (document.getElementById('iv-css')) return; const s = document.createElement('style'); s.id = 'iv-css'; s.textContent = CSS; document.head.append(s); }
export async function openInvite({ code, url, title = document.title.split(/[–|-]/)[0].trim().replace(/ online$/i, '') }) {
  inviteCss(); document.getElementById('iv-ov')?.remove();
  const ov = document.createElement('div'); ov.className = 'iv-ov'; ov.id = 'iv-ov';
  ov.innerHTML = `<div class="iv-box" role="dialog" aria-modal="true" aria-label="Mời bạn vào phòng"><button class="iv-x" aria-label="Đóng">✕</button><h2>📨 Mời bạn vào phòng</h2>
    <div class="iv-fr" hidden><h3>👥 Mời bạn bè trong web</h3><p class="iv-fp">Bạn bè nhận tin nhắn kèm nút <b>▶ Vào bàn</b>.</p><div class="iv-fl"></div></div>
    <div class="iv-lk"><h3>🔗 Gửi link / mã phòng</h3><div class="iv-code"></div><span class="iv-link"></span>
    <div class="iv-acts"><button class="iv-b" type="button" data-a="copy">📋 Sao chép link</button><button class="iv-b main" type="button" data-a="share" hidden>📤 Chia sẻ</button></div>
    <details class="iv-qd" open><summary>📷 Mã QR (quét bằng camera)</summary><div class="iv-qr" aria-label="Mã QR vào phòng"></div></details></div></div>`;
  ov.querySelector('.iv-code').textContent = code; ov.querySelector('.iv-link').textContent = url.replace(/^https?:\/\//, '');
  const share = ov.querySelector('[data-a="share"]'); if (navigator.share) share.hidden = false; else ov.querySelector('[data-a="copy"]').classList.add('main');
  const close = () => { ov.remove(); removeEventListener('keydown', key, true); }, key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  addEventListener('keydown', key, true);
  ov.addEventListener('click', async e => {
    if (e.target === ov || e.target.closest('.iv-x')) return close();
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'copy') { try { await navigator.clipboard.writeText(url); toast('Đã sao chép link mời 📋'); } catch (err) { toast('Không sao chép được – bấm giữ vào link để chép nha'); } }
    if (a === 'share') { try { await navigator.share({ title: `Vào chơi ${title} với mình nè!`, text: `Vào phòng ${code} chơi ${title} trên GumballZ nha 🎲`, url }); } catch (err) {} }
  });
  document.body.append(ov);
  friendsPart(ov, code, url); /* mời thẳng bạn bè trong web */
  try { const q = (await loadQr())(0, 'Q'); q.addData(url); q.make(); ov.querySelector('.iv-qr').innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }) + `<img src="${ROOT}favicon.svg?v=1" alt="">`; }
  catch (e) { ov.querySelector('.iv-qr').remove(); }
}

/* 👥 danh sách bạn bè (đang online lên đầu) + nút Mời gửi tin nhắn riêng có thẻ vào bàn [invite:game:code] (friends.js vẽ thành nút "Vào bàn") */
async function friendsPart(ov, code, url) {
  const box = ov.querySelector('.iv-fr'); if (!box) return;
  let api; try { api = await import('../net/api.js?v=28'); } catch (e) { return; }
  if (!api.auth.user()) { box.hidden = false; box.querySelector('.iv-fl').innerHTML = '<p class="iv-fe">Đăng nhập để mời thẳng bạn bè đang online trong web nha. <button type="button" class="iv-lg">Đăng nhập</button></p>'; box.querySelector('.iv-lg').onclick = () => import('./account.js?v=50').then(m => m.openLogin()).catch(() => {}); return; }
  const game = (window.__gumballzRoom && window.__gumballzRoom.game) || (new URL(url).pathname.split('/').filter(Boolean)[0] || '');
  const r = await api.friends.list().catch(() => null); if (!ov.isConnected) return;
  const L = (r && r.ok && r.friends || []).slice().sort((a, b) => (b.on ? 1 : 0) - (a.on ? 1 : 0));
  box.hidden = false; const fl = box.querySelector('.iv-fl'); const qd = ov.querySelector('.iv-qd'); if (qd && L.length) qd.open = false; /* có bạn bè thì mời bạn là chính, QR thu gọn */
  if (!L.length) { fl.innerHTML = '<p class="iv-fe">Chưa có bạn bè nào – bấm tên người chơi để kết bạn nha.</p>'; return; }
  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  fl.innerHTML = L.map(f => `<div class="iv-f"><i class="dot${f.on ? ' on' : ''}"></i><span>${esc(f.name)}</span><small>${f.on ? 'Đang online' : ''}</small><button type="button" data-u="${+f.id}">💌 Mời</button></div>`).join('');
  fl.addEventListener('click', async e => { const b = e.target.closest('button[data-u]'); if (!b || b.disabled) return; b.disabled = true; b.textContent = '…';
    const res = await api.friends.send(+b.dataset.u, `[invite:${game}:${code}] Vào bàn chơi chung với mình nha! ${url}`).catch(() => null);
    if (res && res.ok) { b.textContent = '✓ Đã mời'; } else { b.disabled = false; b.textContent = '💌 Mời'; toast((res && res.msg) || 'Chưa gửi được, thử lại nha'); } });
}
