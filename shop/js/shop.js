// 🛍️ Cửa hàng — mua khung avatar, màu tên, banner hồ sơ, lưng bài và mở rương Gacha bằng xu ảo.
// Tiền ảo, không nạp, không rút, không tiền thật. Mọi giá và tỉ lệ rơi lấy từ shared/ui/wallet.js.
import { loadWallet, balance, fmt, spend, grantCosmetic, owns, widOf, COSMETICS, CHEST_TABLE, CHEST_PRICE, DUP_REFUND, openChest } from '../../shared/ui/wallet.js?v=7';
import { avatarHTML, avatar, setAvatarLook, profileCss } from '../../shared/ui/profile.js?v=57';
import { FRAMES, NAME_COLORS, BANNERS, partOpen, readParts, itemLabel } from '../../shared/js/avatar-rewards.js';
import { totals } from '../../shared/ui/stats.js?v=91'; /* 🧸 cấp hiện tại để biết linh kiện rương đã mở chưa (trùng thì hoàn xu) */
import { BACKS, backDataURI, setBack, getBack } from '../../shared/ui/deck/deck.js?v=5';
import { toast } from '../../shared/ui/dialog.js?v=10';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const frameName = id => (FRAMES.find(x => x.id === id) || {}).name || id;
const colorName = id => (NAME_COLORS.find(x => x.id === id) || {}).name || id;
const backName = id => (BACKS.find(x => x.id === id) || {}).name || id;
const bannerName = id => (BANNERS.find(x => x.id === id) || {}).name || id;
const describeRoll = r => {
  if (r.kind === 'xu') return `🪙 +${r.amount} xu`;
  if (r.kind === 'frame') return `🖼️ ${frameName(r.id)} (khung avatar)`;
  if (r.kind === 'color') return `✒️ ${colorName(r.id)} (màu tên)`;
  if (r.kind === 'back') return `🃏 Lưng bài ${backName(r.id)}`;
  if (r.kind === 'banner') return `🎏 ${bannerName(r.id)} (banner hồ sơ)`;
  if (r.kind === 'part') { const [k, v] = String(r.id || '').split(':'); return `🧸 ${itemLabel(k, v)} (linh kiện nhân vật)`; }
  return r.label || '';
};

const draw = () => {
  const w = loadWallet(), xu = w.xu, look = avatar();
  $('#sw-xu').textContent = fmt(xu);
  $('#chest-count').textContent = w.chest ? `Bạn đã mở ${w.chest} rương.` : '';
  /* 🖼️ khung avatar */
  $('#grid-frames').innerHTML = COSMETICS.frames.map(c => {
    const owned = owns(widOf('frame', c.id)), worn = (look.f || '') === c.id;
    const btn = worn ? `<button type="button" class="btn-worn" disabled>✓ Đang mặc</button>`
      : owned ? `<button type="button" class="btn-wear" data-wear-frame="${c.id}">Mặc khung này</button>`
      : c.shop ? `<button type="button" class="btn-buy" data-buy-frame="${c.id}" ${xu < c.price ? 'disabled' : ''}>Mua · ${fmt(c.price)} xu</button>`
      : `<button type="button" class="btn-chestonly" disabled>🎁 Chỉ mở ra từ rương</button>`;
    return `<div class="card"><div class="prev">${avatarHTML(64, { ...look, f: c.id })}</div><h3>${esc(c.name)}${c.anim ? ' ✨' : c.rare ? ' 👑' : ''}</h3><p>${c.shop ? 'Mua bằng xu ở Cửa hàng.' : 'Chỉ mở ra từ rương Gacha — không bán trực tiếp.'}</p>
      <span class="price">${c.shop ? `🪙 ${fmt(c.price)} xu` : '🎁 Rương Gacha'}</span>${owned && !worn ? '<span class="own">✓ Đã sở hữu</span>' : ''}
      <div class="btns">${btn}</div></div>`;
  }).join('');
  /* ✒️ màu tên */
  $('#grid-colors').innerHTML = COSMETICS.colors.map(c => {
    const nc = NAME_COLORS.find(x => x.id === c.id) || {}, owned = owns(widOf('color', c.id)), worn = (look.n || '') === c.id;
    const btn = worn ? `<button type="button" class="btn-worn" disabled>✓ Đang dùng</button>`
      : owned ? `<button type="button" class="btn-wear" data-wear-color="${c.id}">Dùng màu này</button>`
      : c.shop ? `<button type="button" class="btn-buy" data-buy-color="${c.id}" ${xu < c.price ? 'disabled' : ''}>Mua · ${fmt(c.price)} xu</button>`
      : `<button type="button" class="btn-chestonly" disabled>🎁 Chỉ mở ra từ rương</button>`;
    return `<div class="card"><div class="prev"><span class="${nc.anim ? 'nc-anim' : ''}" style="font:800 19px Nunito,sans-serif;${nc.css || ''}">Tên của bạn</span></div><h3>${esc(c.name)}${c.anim ? ' ✨' : c.rare ? ' 👑' : ''}</h3><p>${c.shop ? 'Mua bằng xu ở Cửa hàng.' : 'Chỉ mở ra từ rương Gacha — không bán trực tiếp.'}</p>
      <span class="price">${c.shop ? `🪙 ${fmt(c.price)} xu` : '🎁 Rương Gacha'}</span>${owned && !worn ? '<span class="own">✓ Đã sở hữu</span>' : ''}
      <div class="btns">${btn}</div></div>`;
  }).join('');
  /* 🎏 banner hồ sơ */
  $('#grid-banners').innerHTML = COSMETICS.banners.map(c => {
    const bn = BANNERS.find(x => x.id === c.id) || {}, owned = owns(widOf('banner', c.id)), worn = (look.b || '') === c.id;
    const btn = worn ? `<button type="button" class="btn-worn" disabled>✓ Đang dùng</button>`
      : owned ? `<button type="button" class="btn-wear" data-wear-banner="${c.id}">Dùng banner này</button>`
      : c.shop ? `<button type="button" class="btn-buy" data-buy-banner="${c.id}" ${xu < c.price ? 'disabled' : ''}>Mua · ${fmt(c.price)} xu</button>`
      : `<button type="button" class="btn-chestonly" disabled>🎁 Chỉ mở ra từ rương</button>`;
    return `<div class="card"><div class="prev"><span class="lk-bn${bn.anim ? ' bn-anim' : ''}" style="background:${bn.css || 'transparent'}"></span></div><h3>${esc(c.name)}${c.anim ? ' ✨' : c.rare ? ' 👑' : ''}</h3><p>${c.shop ? 'Mua bằng xu ở Cửa hàng, đeo trên đầu Hồ sơ.' : 'Chỉ mở ra từ rương Gacha — không bán trực tiếp.'}</p>
      <span class="price">${c.shop ? `🪙 ${fmt(c.price)} xu` : '🎁 Rương Gacha'}</span>${owned && !worn ? '<span class="own">✓ Đã sở hữu</span>' : ''}
      <div class="btns">${btn}</div></div>`;
  }).join('');
  /* 🃏 lưng bài */
  $('#grid-backs').innerHTML = BACKS.map(b => {
    const c = COSMETICS.backs.find(x => x.id === b.id), owned = !c || owns(widOf('back', b.id)), worn = getBack() === b.id;
    const btn = worn ? `<button type="button" class="btn-worn" disabled>✓ Đang dùng</button>`
      : owned ? `<button type="button" class="btn-wear" data-wear-back="${b.id}">Dùng lưng này</button>`
      : c.shop ? `<button type="button" class="btn-buy" data-buy-back="${b.id}" ${balance() < c.price ? 'disabled' : ''}>Mua · ${fmt(c.price)} xu</button>`
      : `<button type="button" class="btn-chestonly" disabled>🎁 Chỉ mở ra từ rương</button>`;
    return `<div class="card"><div class="prev"><img src="${backDataURI(b.id)}" alt="Lưng bài ${esc(b.name)}" width="52"></div><h3>${esc(b.name)}</h3><p>${c ? (c.shop ? 'Mua bằng xu ở Cửa hàng.' : 'Chỉ mở ra từ rương Gacha — không bán trực tiếp.') : 'Lưng bài mặc định, có sẵn.'}</p>
      <span class="price">${c && c.shop ? `🪙 ${fmt(c.price)} xu` : c ? '🎁 Rương Gacha' : 'Miễn phí'}</span>${owned && !worn ? '<span class="own">✓ Đã sở hữu</span>' : ''}
      <div class="btns">${btn}</div></div>`;
  }).join('');
  /* 📋 bảng tỉ lệ rơi */
  const total = CHEST_TABLE.reduce((n, e) => n + e.w, 0);
  $('#drop-table').innerHTML = CHEST_TABLE.map(e => { const isNitro = e.rare && /Nitro/.test(e.label); const label = isNitro ? e.label.replace(/ \(CỰC HIẾM\)/, '') : e.label; return `<li${e.rare ? ' class="rare"' : ''}><b>${e.w / total * 100}%</b> — ${esc(label)}${isNitro ? ' <span class="rare-tag">🌟 CỰC HIẾM</span>' : ''}</li>`; }).join('');
  $('#btn-chest').disabled = chestBusy || xu < CHEST_PRICE;
};

/* ---------- mua / mặc ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('button[data-buy-frame],button[data-buy-color],button[data-buy-back],button[data-buy-banner],button[data-wear-frame],button[data-wear-color],button[data-wear-back],button[data-wear-banner]');
  if (!b || b.disabled) return;
  const buyCos = (kind, id, price, name, wear) => {
    if (!spend(price)) { toast('😿 Không đủ xu — chơi thắng vài ván là có ngay!'); return; }
    grantCosmetic(widOf(kind, id)); wear(); toast(`✅ Đã mua ${name} — đã mặc/dùng luôn!`); draw();
  };
  if (b.dataset.buyFrame) { const c = COSMETICS.frames.find(x => x.id === b.dataset.buyFrame); if (c) buyCos('frame', c.id, c.price, c.name, () => setAvatarLook({ f: c.id })); return; }
  if (b.dataset.buyColor) { const c = COSMETICS.colors.find(x => x.id === b.dataset.buyColor); if (c) buyCos('color', c.id, c.price, c.name, () => setAvatarLook({ n: c.id })); return; }
  if (b.dataset.buyBack) { const c = COSMETICS.backs.find(x => x.id === b.dataset.buyBack); if (c) buyCos('back', c.id, c.price, 'Lưng bài ' + c.name, () => setBack(c.id)); return; }
  if (b.dataset.buyBanner) { const c = COSMETICS.banners.find(x => x.id === b.dataset.buyBanner); if (c) buyCos('banner', c.id, c.price, 'Banner ' + c.name, () => setAvatarLook({ b: c.id })); return; }
  if (b.dataset.wearFrame) { setAvatarLook({ f: b.dataset.wearFrame }); toast(`✅ Đã mặc ${frameName(b.dataset.wearFrame)}`); draw(); return; }
  if (b.dataset.wearColor) { setAvatarLook({ n: b.dataset.wearColor }); toast(`✅ Đã đổi màu tên: ${colorName(b.dataset.wearColor)}`); draw(); return; }
  if (b.dataset.wearBack) { setBack(b.dataset.wearBack); toast(`✅ Đã dùng lưng bài ${backName(b.dataset.wearBack)}`); draw(); return; }
  if (b.dataset.wearBanner) { setAvatarLook({ b: b.dataset.wearBanner }); toast(`✅ Đã dùng banner ${bannerName(b.dataset.wearBanner)}`); draw(); return; }
});

/* ---------- 🎁 animation Rive hộp quà (gacha-box idle + gacha-open khi mua) ---------- */
/* Runtime Rive nạp bằng <script src="../shared/js/rive/rive.js"> trong index.html;
   phải gọi setWasmUrl TRƯỚC instance đầu tiên. prefers-reduced-motion: bỏ qua
   animation, giữ emoji 🎁 + hiệu ứng CSS cũ. Lỗi tải .riv/wasm: giữ emoji. */
const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let rivIdle = null, rivOpen = null, rivReady = false, openTimer = null, restTimer = null, chestBusy = false;
function mountChestRive() {
  if (reducedMotion || !window.rive || !window.rive.RuntimeLoader || typeof window.rive.Rive !== 'function') return;
  const idleCv = $('#chest-cv-idle');
  if (!idleCv) return;
  try { window.rive.RuntimeLoader.setWasmUrl('../shared/js/rive/rive.wasm'); } catch (e) { return; }
  try {
    rivIdle = new window.rive.Rive({
      src: '../shared/rive/gacha-box.riv', canvas: idleCv, autoplay: true,
      onLoad: () => { rivReady = true; $('#chest-box').hidden = true; idleCv.hidden = false; },
      onLoadError: () => { /* giữ emoji 🎁 */ }
    });
  } catch (e) { rivReady = false; }
}
/* Chạy animation mở hộp 1 lần rồi gọi done(). onStop bắn khi oneshot chạy xong;
   setTimeout 2600ms là dự phòng nếu onStop không bắn. done() chỉ chạy 1 lần. */
function playOpenAnim(done) {
  if (!rivReady || !window.rive) { done(); return; }
  const openCv = $('#chest-cv-open'), idleCv = $('#chest-cv-idle');
  let called = false;
  const once = () => { if (called) return; called = true; clearTimeout(openTimer); done(); };
  try {
    if (rivIdle) rivIdle.pause();
    idleCv.hidden = true; openCv.hidden = false;
    if (!rivOpen) {
      rivOpen = new window.rive.Rive({
        src: '../shared/rive/gacha-open.riv', canvas: openCv, autoplay: true,
        onStop: once, onLoadError: once
      });
    } else { rivOpen.reset(); rivOpen.play(); }
    openTimer = setTimeout(once, 2600);
  } catch (e) { once(); }
}
/* Sau khi hiện kết quả 1 lúc, quay lại hộp đóng idle. */
function restChest() {
  clearTimeout(restTimer);
  restTimer = setTimeout(() => {
    if (!rivReady) return;
    $('#chest-cv-open').hidden = true;
    const idleCv = $('#chest-cv-idle');
    idleCv.hidden = false;
    try { if (rivIdle) rivIdle.play(); } catch (e) {}
  }, 2600);
}
/* Mưa giấy confetti CSS khi trúng thưởng (16 mảnh, rơi + xoay, tự dọn sau 1,4s). */
function burstConfetti() {
  const box = $('#chest-confetti');
  if (!box) return;
  box.innerHTML = '';
  const colors = ['#FF5A60', '#FACD33', '#2EC5B6', '#B9A6FF', '#FF8A00'];
  for (let i = 0; i < 16; i++) {
    const s = document.createElement('i');
    s.style.setProperty('--dx', (Math.random() * 160 - 80).toFixed(0) + 'px');
    s.style.setProperty('--r', (Math.random() * 540 - 270).toFixed(0) + 'deg');
    s.style.background = colors[i % colors.length];
    s.style.left = '50%'; s.style.top = '38%';
    s.style.animationDelay = (Math.random() * 0.15).toFixed(2) + 's';
    box.appendChild(s);
  }
  setTimeout(() => { box.innerHTML = ''; }, 1400);
}

/* ---------- 🎁 mở rương ---------- */
$('#btn-chest').addEventListener('click', () => {
  const btn = $('#btn-chest'), box = $('#chest-box'), res = $('#chest-result');
  if (btn.disabled) return;
  if (balance() < CHEST_PRICE) { toast('😿 Không đủ xu — cần 100 xu để mở 1 rương.'); return; }
  btn.disabled = true; res.textContent = ''; res.className = 'chest-result';
  clearTimeout(restTimer);
  chestBusy = true; /* khoá nút cho tới lúc hiện kết quả — draw() cũng tôn trọng cờ này */
  /* Quay + trừ xu + trao đồ NGAY (qua openChest — đường cấp phát hiện có) để chống
     bấm đúp; chỉ phần HIỆN kết quả là chờ animation mở hộp xong.
     Truyền hàm kiểm tra linh kiện đã mở chưa (theo cấp + rương) để trúng món đã mở thì hoàn xu. */
  const r = openChest(undefined, id => { try { const t = totals(); return partOpen(id, t.xp, readParts()); } catch (e) { return false; } });
  draw(); /* cập nhật số dư + số rương đã mở ngay */
  if (!r.ok) { res.textContent = '😿 ' + (r.reason || 'Không mở được rương.'); res.className = 'chest-result bad'; chestBusy = false; btn.disabled = false; return; }
  const reveal = () => {
    res.textContent = `🎉 ${describeRoll(r)}${r.dup ? ` (trùng đồ đã có — hoàn ${DUP_REFUND} xu)` : r.kind === 'part' ? ' — đã mở, vào Hồ sơ để mặc' : ''}!`;
    res.className = 'chest-result good pop';
    burstConfetti();
    chestBusy = false;
    btn.disabled = balance() < CHEST_PRICE;
    restChest();
  };
  if (rivReady) {
    box.classList.remove('shake', 'open');
    playOpenAnim(reveal);
  } else {
    box.classList.remove('shake', 'open'); void box.offsetWidth; box.classList.add('shake');
    setTimeout(() => { box.classList.remove('shake'); box.classList.add('open'); reveal(); }, 750);
  }
});

profileCss();
draw();
mountChestRive();
addEventListener('gumballz-wallet', draw);

/* ---------- lọc danh mục (pill lọc trên đầu trang) ---------- */
document.querySelectorAll('.shop-filter button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.shop-filter button').forEach(x => x.setAttribute('aria-pressed', x === b));
  const f = b.dataset.f;
  ['chest', 'frames', 'colors', 'banners', 'backs'].forEach(k => {
    const s = document.getElementById('sec-' + k);
    if (s) s.style.display = (f === 'all' || f === k) ? '' : 'none';
  });
}));
