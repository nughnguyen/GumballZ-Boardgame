// ☕ Ủng hộ GumballZ: mã QR chuyển khoản (SePay tự báo về máy chủ), thanh "quỹ máy chủ tháng này", tường cảm ơn, duyệt tay khi hết lượt auto.
// Máy chủ: GET /donate/info, POST /donate/msg, POST /donate/claim, POST /sepay/hook (server/src/donate.js).
// Chuyển khoản ghi "SEVQR GZ U<id 6 số>X R<ref>Z" (vd. U000001X) → tài khoản <id> có huy hiệu 💎 Nhà Tài Trợ (bậc theo tổng tiền, shared/donor.js).
// Mã QR động VietQR: OCB 0388205003 (tài khoản công khai của chủ web, lấy từ mã QR cũ — đổi amount/addInfo là mã đổi theo, không cần secret).
// Ảnh QR cũ shared/img/donate-qr.png chỉ còn là dự phòng khi img.vietqr.io không tải được. DONATE_ACC/DONATE_BANK chỉ còn dùng cho SePay tự báo về (xác nhận tự động), không ảnh hưởng mã QR.
import { auth, API } from '../net/api.js?v=29';
import { TIERS, tierOf, tierInfo } from '../donor.js?v=1'; /* 🏅 bậc ủng hộ (patch -102) */
import { uid6 } from './badges.js?v=3'; /* 🆔 id tài khoản hiển thị 6 chữ số trong nội dung chuyển khoản (patch -108) */

const esc = s => String(s ?? '').replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const vnd = n => (Math.round(+n || 0)).toLocaleString('vi-VN') + 'đ';
const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
const AMOUNTS = [20000, 50000, 100000, 200000];

let cssOn = false;
function css() {
  if (cssOn) return; cssOn = true;
  const s = document.createElement('style'); s.textContent = `
.dn-ov{position:fixed;inset:0;z-index:10050;background:#241a38aa;display:grid;place-items:center;padding:12px;animation:dnIn .18s ease-out}
@keyframes dnIn{from{opacity:0}}
.dn{width:min(460px,100%);max-height:calc(100dvh - 24px);overflow:auto;background:#FFF8EE;color:#241A38;border:2px solid #241A38;border-radius:24px;box-shadow:6px 6px 0 #241A38;font:700 14.5px/1.45 Nunito,"Be Vietnam Pro",system-ui,sans-serif;overscroll-behavior:contain}
.dn-hd{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:10px;padding:16px 18px 12px;background:#FACD33;color:#241A38;border-bottom:2px solid #241A38;border-radius:22px 22px 0 0}
.dn-hd b{flex:1;font:400 21px/1.1 "Baloo 2",Nunito,sans-serif}
.dn-x{width:40px;height:40px;border:2px solid #241A38;border-radius:50%;background:#fff;color:#241A38;font:800 18px Nunito,sans-serif;cursor:pointer}
.dn-bd{padding:14px 18px 18px;display:grid;gap:12px}
.dn-p{margin:0;color:#5b5170}
.dn-fund{background:#fff;border:2px solid #241A38;border-radius:16px;padding:10px 12px;box-shadow:3px 3px 0 #241A38}
.dn-fund .t{display:flex;justify-content:space-between;gap:8px;font-size:13.5px}.dn-fund .t b{font:400 15px "Baloo 2",Nunito,sans-serif}
.dn-bar{height:12px;border-radius:99px;background:#f3e7da;overflow:hidden;margin-top:6px;border:1.5px solid #241A38}.dn-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#2EC5B6,#FACD33,#FF5A60);min-width:6px;transition:width .5s}
.dn-amt{display:flex;gap:6px}
.dn-amt button{flex:1 1 0;min-width:0;padding:0 4px;min-height:44px;border:2px solid #241A38;border-radius:14px;background:#fff;color:#241A38;font:800 14.5px Nunito,sans-serif;cursor:pointer}
.dn-own{display:flex;align-items:center;gap:8px;background:#fff;border:2px solid #241A38;border-radius:14px;padding:4px 12px}.dn-own input{flex:1;min-width:0;border:0;outline:0;background:none;font:800 18px Nunito,sans-serif;color:#241A38;padding:8px 0}.dn-own span{font:800 16px Nunito,sans-serif;color:#8a7f96}.dn-own small{display:block;font-size:12px;color:#8a7f96;margin-top:-4px}
.dn-amt button.on{border-color:#241A38;background:#FACD33;box-shadow:2px 2px 0 #241A38}
.dn-qr{display:grid;place-items:center;background:#fff;border:2px solid #241A38;border-radius:18px;padding:10px;box-shadow:3px 3px 0 #241A38}
.dn-qr img{width:min(240px,70vw);aspect-ratio:1;object-fit:contain;display:block}
.dn-row{display:flex;align-items:center;gap:8px;background:#fff;border:2px solid #241A38;border-radius:14px;padding:8px 10px;min-width:0}
.dn-row span{flex:1;min-width:0}.dn-row small{display:block;color:#8a7f96;font-size:12px}.dn-row code{font:800 15px ui-monospace,Menlo,monospace;word-break:break-all}
.dn-row button{flex:none;min-height:36px;padding:0 12px;border:2px solid #241A38;border-radius:99px;background:#241A38;color:#fff;font:800 13px Nunito,sans-serif;cursor:pointer}
.dn-chk{display:flex;align-items:center;gap:8px;cursor:pointer}.dn-chk input{width:20px;height:20px;accent-color:#FF5A60}
.dn-note{font-size:13px;color:#5b5170;background:#fff4d6;border:2px solid #241A38;border-radius:12px;padding:8px 10px}
.dn-note button{border:0;background:none;color:#e0432f;font:800 13px Nunito,sans-serif;text-decoration:underline;cursor:pointer;padding:0}
.dn-done{display:grid;place-items:center;gap:4px;text-align:center;padding:26px 8px;min-height:220px}.dn-done .big{font-size:58px;line-height:1;animation:dnPop .5s cubic-bezier(.3,1.6,.5,1)}.dn-done b{font:400 24px 'Baloo 2',Nunito,sans-serif;color:#14743a}.dn-done span{color:#5b5170}
@keyframes dnPop{from{transform:scale(.3)}}
.dn-ok{text-align:center;background:#e9fbef;color:#14743a;border:2px solid #241A38;border-radius:14px;padding:10px;font:800 15px Nunito,sans-serif}
.dn-wall h4{margin:2px 0 6px;font:400 16px "Baloo 2",Nunito,sans-serif}
.dn-wall div{display:flex;flex-wrap:wrap;gap:6px}.dn-wall span{background:#fff;border:2px solid #241A38;border-radius:99px;padding:3px 10px;font-size:13px}
.dn-tiers{background:#fff;border:2px solid #241A38;border-radius:16px;padding:10px 12px;box-shadow:3px 3px 0 #241A38}
.dn-tiers h4,.dn-msgs h4,.dn-say h4{margin:0 0 6px;font:400 16px "Baloo 2",Nunito,sans-serif}
.dn-tl{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.dn-tl div{display:grid;justify-items:center;gap:1px;text-align:center;padding:6px 2px;border-radius:12px;background:#faf3ea;font-size:11px;line-height:1.25;color:#8a7f96}
.dn-tl div i{font-style:normal;font-size:22px;filter:grayscale(1);opacity:.55}.dn-tl div b{font:800 11.5px Nunito,sans-serif;color:#5b5170}
.dn-tl div.got{background:#e6f9f5;color:#0a6b5e}.dn-tl div.got i{filter:none;opacity:1}.dn-tl div.got b{color:#0a6b5e}
.dn-tl div.now{box-shadow:inset 0 0 0 2px #FF5A60}
.dn-next{margin:8px 0 0;font-size:13px;color:#5b5170}
.dn-say textarea{width:100%;box-sizing:border-box;min-height:64px;resize:vertical;border:2px solid #241A38;border-radius:14px;padding:8px 10px;font:700 14.5px/1.4 Nunito,sans-serif;color:#241A38;background:#fff}
.dn-say textarea:focus{outline:2px solid #FF5A60;outline-offset:0;border-color:#FF5A60}
.dn-say .r{display:flex;align-items:center;gap:8px;margin-top:6px}.dn-say .r small{flex:1;color:#8a7f96;font-size:12px}
.dn-say button{min-height:40px;padding:0 16px;border:2px solid #241A38;border-radius:99px;background:#241A38;color:#fff;font:800 14px Nunito,sans-serif;cursor:pointer}
.dn-msgs ul{margin:0;padding:0;display:grid;gap:8px;list-style:none}
.dn-msgs li{background:#fff;border:2px solid #241A38;border-radius:14px;padding:8px 10px;font-size:13.5px}
.dn-msgs li .w{display:flex;gap:6px;align-items:baseline}.dn-msgs li .w b{font:800 13.5px Nunito,sans-serif}.dn-msgs li .w small{margin-left:auto;color:#a39aae;font-size:11.5px}
.dn-msgs li p{margin:2px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}
.dn-msgs li .rp{margin-top:6px;padding:6px 10px;border-radius:12px;background:#fff6d6;border-left:3px solid #FACD33}.dn-msgs li .rp b{font:800 12.5px Nunito,sans-serif;color:#7a4300}
.dn-msgs li.me{border-color:#FF5A60}
.dn-claim{background:#fff;border:2px dashed #8a7f96;border-radius:16px;padding:10px 12px}
.dn-claim summary{cursor:pointer;font:400 16px "Baloo 2",Nunito,sans-serif}
.dn-claim label{display:block;font-size:13px;color:#8a7f96;margin:8px 0 2px}
.dn-claim input,.dn-claim textarea{width:100%;box-sizing:border-box;border:2px solid #241A38;border-radius:12px;padding:8px 10px;font:700 14.5px/1.4 Nunito,sans-serif;color:#241A38;background:#fff}
.dn-claim textarea{min-height:56px;resize:vertical}
.dn-claim button{margin-top:8px;min-height:42px;padding:0 18px;border:2px solid #241A38;border-radius:99px;background:#FACD33;color:#241A38;font:800 14px Nunito,sans-serif;cursor:pointer;box-shadow:2px 2px 0 #241A38}
@media (prefers-reduced-motion:reduce){.dn-ov{animation:none}.dn-bar i{transition:none}}`;
  document.head.append(s);
}

async function info(uid = 0, after = 0) {
  try { const r = await fetch(API() + '/donate/info' + (uid ? `?u=${uid}&after=${after}` : '')); return await r.json(); } catch (e) { return { ok: false }; }
}
const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? Math.max(1, m) + ' phút trước' : m < 1440 ? Math.round(m / 60) + ' giờ trước' : Math.round(m / 1440) + ' ngày trước'; };
/* 🏅 thang 5 bậc; đã đăng nhập thì tô các bậc đã đạt + còn bao nhiêu nữa lên bậc kế */
function ladder(amt, logged) {
  const t = tierOf(amt), nx = TIERS.find(x => x.t === t + 1);
  return `<div class="dn-tiers"><h4>🏅 Bậc ủng hộ</h4><div class="dn-tl">${TIERS.map(x => `<div class="${x.t <= t ? 'got' : ''}${x.t === t ? ' now' : ''}" title="${esc(x.name)} – ${esc(x.note)}"><i>${x.icon}</i><b>${esc(x.name)}</b><span>${x.min > 1 ? vnd(x.min) : 'Bất kỳ'}</span></div>`).join('')}</div>
    <p class="dn-next">${!logged ? 'Đăng nhập trước khi chuyển thì bậc mới tự cộng dồn vào tài khoản.' : t ? `Bạn đang ở bậc <b>${esc(tierInfo(t).icon + ' ' + tierInfo(t).name)}</b> (tổng ${vnd(amt)})${nx ? ` – thêm <b>${vnd(nx.min - amt)}</b> để lên ${esc(nx.icon + ' ' + nx.name)}.` : ' – bậc cao nhất rồi, cảm ơn bạn nhiều lắm 👑'}` : 'Bậc cộng dồn theo tổng tiền đã ủng hộ. Huy hiệu hiện cạnh tên ở hồ sơ, bảng xếp hạng, thẻ người chơi.'} Chỉ là lời cảm ơn – không đổi được gì trong game.</p></div>`;
}
const msgList = M => M && M.length ? `<div class="dn-msgs"><h4>💌 Lời nhắn gửi chủ web</h4><ul>${M.slice(0, 12).map(m => `<li class="${m.me ? 'me' : ''}"><div class="w"><b>${esc(m.name || 'Ẩn danh')}</b><small>${ago(m.at)}</small></div><p>${esc(m.msg)}</p>${m.reply ? `<div class="rp"><b>👑 Chủ web trả lời:</b><p>${esc(m.reply)}</p></div>` : ''}</li>`).join('')}</ul></div>` : '';
const copy = async (txt, btn) => { try { await navigator.clipboard.writeText(txt); btn.textContent = '✓ Đã chép'; } catch (e) { btn.textContent = 'Chép tay nha'; } setTimeout(() => { btn.textContent = 'Chép'; }, 1800); };

/* mở hộp ủng hộ */
export async function openDonate() {
  css(); if (document.querySelector('.dn-ov')) return;
  const ov = document.createElement('div'); ov.className = 'dn-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Ủng hộ GumballZ');
  ov.innerHTML = `<div class="dn"><div class="dn-hd"><b>☕ Ủng hộ GumballZ</b><button type="button" class="dn-x" aria-label="Đóng">✕</button></div><div class="dn-bd"><p class="dn-p">Đang tải…</p></div></div>`;
  document.body.append(ov);
  let poll = 0; const close = () => { clearTimeout(poll); ov.remove(); removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); }; addEventListener('keydown', onKey);
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('.dn-x')) close(); });
  const I = await info(auth.user() ? auth.user().id : 0); const bd = ov.querySelector('.dn-bd');
  if (!I.ok) Object.assign(I, { got: 0, goal: 300000, wall: [], anon: 0, msgs: [], mine: 0, auto: true }); /* máy chủ không trả lời: vẫn cho quét mã QR cũ */
  const u = auth.user(), opened = Date.now(); let amt = 0, show = ls.get('gumballz-don-hide') !== '1'; /* patch -108: mặc định là số tiền TÙY CHỈNH (chưa nhập → amt 0, nút "Khác" được chọn) */
  const ref = String(100000 + Math.floor(Math.random() * 900000)); /* mã riêng của lần mở hộp này → máy chủ báo "đã nhận" ngay khi SePay gửi về */
  const code = () => 'SEVQR ' + (u ? `GZ ${show ? 'U' : 'A'}${uid6(u.id)}X` : 'GZ') + ` R${ref}Z`; /* SEVQR: tài khoản ngân hàng nối SePay chỉ báo giao dịch có chữ này – id hiển thị 6 số (patch -108) */
  const pct = Math.min(100, Math.round(I.got / Math.max(1, I.goal) * 100));
  const ROOT = new URL('../../', import.meta.url).href;
  const qr = () => `https://img.vietqr.io/image/OCB-0388205003-compact2.png?amount=${amt || ''}&addInfo=${encodeURIComponent(code())}&accountName=GumballZ`; /* mã QR động VietQR (patch -108): OCB 0388205003 của chủ web — đổi amount/addInfo là mã đổi theo, không cần DONATE_ACC; đã kiểm bằng giải mã QR thật */
  bd.innerHTML = `
    <p class="dn-p">GumballZ miễn phí, không quảng cáo. Tiền máy chủ mỗi tháng khoảng <b>${vnd(I.goal)}</b> – ai thấy vui thì góp một ly cà phê giúp mình giữ web chạy lâu nha 💛</p>
    <p class="dn-p" style="font-size:12.5px">Ủng hộ là tự nguyện, chỉ nhận huy hiệu cảm ơn – <b>không</b> đổi được chip hay lợi thế gì trong game.</p>
    <div class="dn-fund"><div class="t"><span>Quỹ máy chủ tháng này</span><b>${vnd(I.got)} / ${vnd(I.goal)}</b></div><div class="dn-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div></div>
    ${I.on ? '' : '<div class="dn-note">Mã QR đã có sẵn nội dung chuyển khoản — quét mã rồi kiểm tra lại số tiền trong app ngân hàng trước khi xác nhận nha.</div>'}
    ${I.auto === false ? '<div class="dn-note">⚠️ Lượt xác nhận tự động tháng này đã hết – chuyển khoản xong nhớ gửi yêu cầu duyệt tay ở cuối hộp (chủ web duyệt là có huy hiệu ngay).</div>' : ''}
    <div class="dn-amt">${AMOUNTS.map(a => `<button type="button" data-amt="${a}" class="${a === amt ? 'on' : ''}">${a / 1000}k</button>`).join('')}<button type="button" data-amt="own" class="${amt === 0 ? 'on' : ''}" aria-label="Tự nhập số tiền">Khác</button></div>
    <div data-ownbox><label class="dn-own"><input type="text" inputmode="numeric" autocomplete="off" placeholder="Nhập số tiền, vd 30.000" aria-label="Số tiền muốn ủng hộ (đồng)" data-own><span>đ</span></label><small style="display:block;color:#8a7f96;font-size:12px;margin:4px 2px 0">Tối thiểu 1.000đ – mã QR tự đổi theo số bạn nhập.</small></div>
    <div class="dn-qr"><img alt="Mã QR chuyển khoản ủng hộ GumballZ" src="${qr()}" onerror="this.onerror=null;this.src='${ROOT}shared/img/donate-qr.png?v=3'"></div>
    <div class="dn-row"><span><small>Nội dung chuyển khoản (giữ nguyên)</small><code data-code>${esc(code())}</code></span><button type="button" data-cp="code">Chép</button></div>
    ${u ? `<label class="dn-chk"><input type="checkbox" data-show ${show ? 'checked' : ''}> Hiện tên <b>${esc(u.name)}</b> trên Tường cảm ơn</label>
    <div class="dn-note">Quét mã bằng app ngân hàng / MoMo / ZaloPay. Chuyển xong vài giây là hộp này báo đã nhận và tài khoản có huy hiệu <b>💎 Nhà Tài Trợ</b> – cứ để hộp mở nha.</div>`
    : `<div class="dn-note">Quét mã bằng app ngân hàng / MoMo / ZaloPay. Muốn nhận huy hiệu <b>💎 Nhà Tài Trợ</b> và có tên trên Tường cảm ơn thì <button type="button" data-login>đăng nhập</button> trước rồi mở lại hộp này.</div>`}
    <div class="dn-say"><h4>💌 Gửi lời nhắn cho chủ web <small style="font:700 12px Nunito,sans-serif;color:#8a7f96">(không bắt buộc)</small></h4><textarea maxlength="200" data-msg placeholder="Vd: Game Ma Sói vui quá, làm thêm vai mới nha!" aria-label="Lời nhắn gửi chủ web"></textarea><div class="r"><small data-msgst>Lời nhắn hiện trên Tường cảm ơn khi khoản ủng hộ về (giấu tên thì hiện "Ẩn danh").</small><button type="button" data-sendmsg>Gửi</button></div></div>
    <div data-ok hidden class="dn-ok"></div>
    ${ladder(I.mine || 0, !!u)}
    ${I.wall.length || I.anon ? `<div class="dn-wall"><h4>💛 Cảm ơn mọi người đã ủng hộ</h4><div>${I.wall.map(w => `<span>${esc((tierInfo(w.t || 1) || TIERS[0]).icon)} ${esc(w.name)}</span>`).join('')}${I.anon ? `<span>+ ${I.anon} lượt ẩn danh</span>` : ''}</div></div>` : ''}
    ${msgList(I.msgs)}
    <details class="dn-claim"${I.auto === false ? ' open' : ''}><summary>🙋 Đã chuyển khoản rồi? Gửi yêu cầu duyệt tay</summary>
      <p class="dn-p" style="margin-top:6px">Dùng khi lượt xác nhận tự động hết, hoặc chuyển khoản mà hộp chưa báo đã nhận. Chủ web duyệt xong là tiền + huy hiệu về tài khoản.</p>
      <label>Số tiền đã chuyển (đồng)</label><input type="text" inputmode="numeric" data-claim-amt placeholder="Vd 50.000">
      <label>Mã ref trong nội dung chuyển khoản (6 số sau chữ R)</label><input type="text" inputmode="numeric" maxlength="6" data-claim-ref placeholder="Vd 123456" value="${ref}">
      <label>Lời nhắn (không bắt buộc)</label><textarea maxlength="200" data-claim-msg placeholder="Vd: Ủng hộ tháng này nha!"></textarea>
      <div><button type="button" data-claim-send>Gửi yêu cầu duyệt</button> <small data-claim-st style="color:#8a7f96"></small></div>
    </details>`;
  const img = bd.querySelector('.dn-qr img'), codeEl = bd.querySelector('[data-code]'), redraw = () => { img.src = qr(); codeEl.textContent = code(); };
  /* ✍️ số tiền tự chọn: gõ tới đâu định dạng 30.000 tới đó, mã QR đổi sau 0,4 giây (khỏi tải ảnh liên tục) */
  const ownAmt = v => { const n = Math.floor(+String(v).replace(/\D/g, '') || 0); return n >= 1000 ? Math.min(n, 50000000) : 0; };
  const ownInp = bd.querySelector('[data-own]'); let ownT = 0;
  if (ownInp) ownInp.oninput = () => { const d = ownInp.value.replace(/\D/g, '').slice(0, 8); ownInp.value = d ? (+d).toLocaleString('vi-VN') : ''; amt = ownAmt(d); clearTimeout(ownT); ownT = setTimeout(redraw, 400); };
  /* 💌 lời nhắn: gửi kèm mã R…Z của hộp – tiền về trước hay sau đều gắn được */
  let msgSent = false;
  const sendMsg = async b => {
    const ta = bd.querySelector('[data-msg]'), st = bd.querySelector('[data-msgst]'), msg = ta.value.trim();
    if (!msg) { ta.focus(); return; } b.disabled = true; b.textContent = 'Đang gửi…';
    const r = await fetch(API() + '/donate/msg', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ref, msg }) }).then(x => x.json()).catch(() => null);
    b.disabled = false; b.textContent = 'Sửa lời nhắn';
    st.textContent = !r || !r.ok ? ((r && r.msg) || 'Chưa gửi được – thử lại nha') : r.paid ? '✅ Đã gửi – lời nhắn hiện trên Tường cảm ơn rồi đó 💛' : '✅ Đã lưu – chuyển khoản xong là lời nhắn tự hiện kèm khoản ủng hộ.';
    msgSent = !!(r && r.ok);
  };
  /* 🙋 yêu cầu duyệt tay */
  const sendClaim = async b => {
    const st = bd.querySelector('[data-claim-st]');
    if (!u) { st.textContent = 'Đăng nhập trước rồi gửi yêu cầu nha.'; return; }
    const amount = ownAmt(bd.querySelector('[data-claim-amt]').value), cref = bd.querySelector('[data-claim-ref]').value.replace(/\D/g, ''), cmsg = bd.querySelector('[data-claim-msg]').value.trim();
    if (!(amount >= 1000)) { st.textContent = 'Nhập số tiền từ 1.000đ trở lên.'; return; }
    if (cref.length !== 6) { st.textContent = 'Mã ref phải có 6 số.'; return; }
    b.disabled = true; b.textContent = 'Đang gửi…';
    const r = await fetch(API() + '/donate/claim', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + auth.token() }, body: JSON.stringify({ amount, ref: cref, msg: cmsg, hide: !show }) }).then(x => x.json()).catch(() => null);
    b.disabled = false; b.textContent = 'Gửi yêu cầu duyệt';
    st.textContent = !r || !r.ok ? ((r && r.msg) || 'Chưa gửi được – thử lại nha') : '✅ Đã gửi – chủ web duyệt xong là huy hiệu về tài khoản.';
  };
  const chk = bd.querySelector('[data-show]'); if (chk) chk.onchange = () => { show = chk.checked; ls.set('gumballz-don-hide', show ? '0' : '1'); redraw(); };
  bd.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.amt != null) {
      bd.querySelectorAll('[data-amt]').forEach(x => x.classList.toggle('on', x === b));
      const box = bd.querySelector('[data-ownbox]'), own = b.dataset.amt === 'own'; box.hidden = !own;
      if (own) { const inp = bd.querySelector('[data-own]'); amt = ownAmt(inp.value); inp.focus(); } else amt = +b.dataset.amt;
      redraw();
    }
    else if (b.dataset.cp) copy(code(), b);
    else if (b.hasAttribute('data-sendmsg')) sendMsg(b);
    else if (b.hasAttribute('data-claim-send')) sendClaim(b);
    else if (b.hasAttribute('data-login')) { close(); import('./account.js?v=51').then(m => m.openLogin()); }
  });
  /* ⚡ quét xong là báo liền: hỏi máy chủ 3 giây/lần (sau 5 phút thì 8 giây/lần) xem khoản có mã R…Z của hộp này về chưa */
  let tries = 0;
  const check = async () => {
    if (!document.body.contains(ov) || Date.now() - opened > 30 * 60e3) return;
    if (!document.hidden) { const r = await fetch(API() + '/donate/info?ref=' + ref).then(x => x.json()).catch(() => null); if (r && r.ok && r.paid) { paid(r); return; } }
    poll = setTimeout(check, ++tries > 100 ? 8000 : 3000);
  };
  const paid = async r => {
    const box = bd.querySelector('.dn-qr'); box.innerHTML = `<div class="dn-done"><div class="big">🎉</div><b>Đã nhận ${vnd(r.paid)}!</b><span>Cảm ơn bạn nhiều lắm 💛${u ? '<br>Huy hiệu 💎 Nhà Tài Trợ đã gắn vào tài khoản.' : ''}</span></div>`;
    bd.querySelectorAll('.dn-amt,[data-ownbox],.dn-row,.dn-note,.dn-chk').forEach(x => { x.style.display = 'none'; });
    const say = bd.querySelector('.dn-say'); if (say && !msgSent) { say.querySelector('h4').innerHTML = '💌 Nhắn gì cho chủ web hông?'; say.querySelector('[data-msgst]').textContent = 'Lời nhắn hiện trên Tường cảm ơn, chủ web có thể trả lời bạn ở đó.'; }
    if (r.got != null) { const pc = Math.min(100, Math.round(r.got / Math.max(1, I.goal) * 100)); bd.querySelector('.dn-fund b').textContent = `${vnd(r.got)} / ${vnd(I.goal)}`; bd.querySelector('.dn-bar i').style.width = pc + '%'; }
    box.scrollIntoView({ block: 'center', behavior: 'smooth' }); burst(box);
    try { navigator.vibrate && navigator.vibrate([30, 40, 60]); } catch (e) {}
    ls.set('gumballz-don-at', String(Date.now())); if (u) { try { await auth.refresh(); const I2 = await info(u.id); const tl = bd.querySelector('.dn-tiers'); if (I2.ok && tl) tl.outerHTML = ladder(I2.mine || 0, true); } catch (e) {} }
  };
  poll = setTimeout(check, 4000);
}
/* pháo giấy nhỏ quanh ô cảm ơn (không có giảm chuyển động) */
function burst(el) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = el.getBoundingClientRect(), E = ['🎉', '💛', '☕', '✨', '🧡'];
  for (let i = 0; i < 18; i++) {
    const s = document.createElement('span'); s.textContent = E[i % E.length];
    s.style.cssText = `position:fixed;left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;font-size:${18 + Math.random() * 14}px;z-index:10060;pointer-events:none;transition:transform .9s cubic-bezier(.2,.8,.3,1),opacity .9s`;
    document.body.append(s); const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 110;
    requestAnimationFrame(() => { s.style.transform = `translate(${Math.cos(a) * d}px,${Math.sin(a) * d - 40}px) rotate(${Math.random() * 360}deg)`; s.style.opacity = '0'; });
    setTimeout(() => s.remove(), 1000);
  }
}
try { window.__gumballzDonate = openDonate; } catch (e) {}
