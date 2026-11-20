// 🛍️ Cửa hàng — mua vật phẩm hỗ trợ, khung avatar, màu tên, lưng bài và mở rương Gacha bằng xu ảo.
// Tiền ảo, không nạp, không rút, không tiền thật. Mọi giá và tỉ lệ rơi lấy từ shared/ui/wallet.js.
import { loadWallet, balance, fmt, spend, grantItem, grantCosmetic, owns, widOf, stock, ITEM_DEFS, COSMETICS, CHEST_TABLE, CHEST_PRICE, DUP_REFUND, openChest } from '../../shared/ui/wallet.js?v=2';
import { avatarHTML, avatar, setAvatarLook, profileCss } from '../../shared/ui/profile.js?v=47';
import { FRAMES, NAME_COLORS } from '../../shared/js/avatar-rewards.js';
import { BACKS, backDataURI, setBack, getBack } from '../../shared/ui/deck/deck.js?v=5';
import { toast } from '../../shared/ui/dialog.js?v=8';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const frameName = id => (FRAMES.find(x => x.id === id) || {}).name || id;
const colorName = id => (NAME_COLORS.find(x => x.id === id) || {}).name || id;
const backName = id => (BACKS.find(x => x.id === id) || {}).name || id;
const describeRoll = r => {
  if (r.kind === 'xu') return `🪙 Hoàn ${r.amount} xu`;
  if (r.kind === 'item') { const d = ITEM_DEFS[r.id] || {}; return `${d.icon || '🎒'} ${d.name || r.id} (vật phẩm hỗ trợ)`; }
  if (r.kind === 'frame') return `🖼️ ${frameName(r.id)} (khung avatar)`;
  if (r.kind === 'color') return `✒️ ${colorName(r.id)} (màu tên)`;
  if (r.kind === 'back') return `🃏 Lưng bài ${backName(r.id)}`;
  return r.label || '';
};

const draw = () => {
  const w = loadWallet(), xu = w.xu, look = avatar();
  $('#sw-xu').textContent = fmt(xu);
  $('#chest-count').textContent = w.chest ? `Bạn đã mở ${w.chest} rương.` : '';
  /* 🎒 vật phẩm hỗ trợ */
  $('#grid-items').innerHTML = Object.entries(ITEM_DEFS).map(([id, d]) => {
    const n = stock(id);
    return `<div class="card"><div class="prev" style="font-size:52px">${d.icon}</div><h3>${esc(d.name)}</h3><p>${esc(d.desc)}</p>
      <span class="price">🪙 ${fmt(d.price)} xu</span>${n ? `<span class="own">📦 Trong kho: ${n}</span>` : ''}
      <div class="btns"><button type="button" class="btn-buy" data-buy-item="${id}" ${xu < d.price ? 'disabled' : ''}>Mua · ${fmt(d.price)} xu</button></div></div>`;
  }).join('');
  /* 🖼️ khung avatar */
  $('#grid-frames').innerHTML = COSMETICS.frames.map(c => {
    const owned = owns(widOf('frame', c.id)), worn = (look.f || '') === c.id;
    const btn = worn ? `<button type="button" class="btn-worn" disabled>✓ Đang mặc</button>`
      : owned ? `<button type="button" class="btn-wear" data-wear-frame="${c.id}">Mặc khung này</button>`
      : c.shop ? `<button type="button" class="btn-buy" data-buy-frame="${c.id}" ${xu < c.price ? 'disabled' : ''}>Mua · ${fmt(c.price)} xu</button>`
      : `<button type="button" class="btn-chestonly" disabled>🎁 Chỉ mở ra từ rương</button>`;
    return `<div class="card"><div class="prev">${avatarHTML(64, { ...look, f: c.id })}</div><h3>${esc(c.name)}${c.rare ? ' 👑' : ''}</h3><p>${c.shop ? 'Mua bằng xu ở Cửa hàng.' : 'Chỉ mở ra từ rương Gacha — không bán trực tiếp.'}</p>
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
    return `<div class="card"><div class="prev"><span style="font:800 19px Nunito,sans-serif;${nc.css || ''}">Tên của bạn</span></div><h3>${esc(c.name)}</h3><p>${c.shop ? 'Mua bằng xu ở Cửa hàng.' : 'Chỉ mở ra từ rương Gacha — không bán trực tiếp.'}</p>
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
  $('#drop-table').innerHTML = CHEST_TABLE.map(e => `<li><b>${e.w / total * 100}%</b> — ${esc(e.label)}</li>`).join('');
  $('#btn-chest').disabled = xu < CHEST_PRICE;
};

/* ---------- mua / mặc ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('button[data-buy-item],button[data-buy-frame],button[data-buy-color],button[data-buy-back],button[data-wear-frame],button[data-wear-color],button[data-wear-back]');
  if (!b || b.disabled) return;
  if (b.dataset.buyItem) { const d = ITEM_DEFS[b.dataset.buyItem]; if (!d) return; if (!spend(d.price)) { toast('😿 Không đủ xu — chơi thắng vài ván là có ngay!'); return; } grantItem(b.dataset.buyItem); toast(`✅ Đã mua ${d.icon} ${d.name} — có ${stock(b.dataset.buyItem)} cái trong kho ví`); draw(); return; }
  const buyCos = (kind, id, price, name, wear) => {
    if (!spend(price)) { toast('😿 Không đủ xu — chơi thắng vài ván là có ngay!'); return; }
    grantCosmetic(widOf(kind, id)); wear(); toast(`✅ Đã mua ${name} — đã mặc/dùng luôn!`); draw();
  };
  if (b.dataset.buyFrame) { const c = COSMETICS.frames.find(x => x.id === b.dataset.buyFrame); if (c) buyCos('frame', c.id, c.price, c.name, () => setAvatarLook({ f: c.id })); return; }
  if (b.dataset.buyColor) { const c = COSMETICS.colors.find(x => x.id === b.dataset.buyColor); if (c) buyCos('color', c.id, c.price, c.name, () => setAvatarLook({ n: c.id })); return; }
  if (b.dataset.buyBack) { const c = COSMETICS.backs.find(x => x.id === b.dataset.buyBack); if (c) buyCos('back', c.id, c.price, 'Lưng bài ' + c.name, () => setBack(c.id)); return; }
  if (b.dataset.wearFrame) { setAvatarLook({ f: b.dataset.wearFrame }); toast(`✅ Đã mặc ${frameName(b.dataset.wearFrame)}`); draw(); return; }
  if (b.dataset.wearColor) { setAvatarLook({ n: b.dataset.wearColor }); toast(`✅ Đã đổi màu tên: ${colorName(b.dataset.wearColor)}`); draw(); return; }
  if (b.dataset.wearBack) { setBack(b.dataset.wearBack); toast(`✅ Đã dùng lưng bài ${backName(b.dataset.wearBack)}`); draw(); return; }
});

/* ---------- 🎁 mở rương ---------- */
$('#btn-chest').addEventListener('click', () => {
  const btn = $('#btn-chest'), box = $('#chest-box'), res = $('#chest-result');
  if (btn.disabled) return;
  if (balance() < CHEST_PRICE) { toast('😿 Không đủ xu — cần 100 xu để mở 1 rương.'); return; }
  btn.disabled = true; res.textContent = ''; res.className = 'chest-result';
  box.classList.remove('shake', 'open'); void box.offsetWidth; box.classList.add('shake');
  setTimeout(() => {
    const r = openChest();
    box.classList.remove('shake'); box.classList.add('open');
    btn.disabled = false;
    if (!r.ok) { res.textContent = '😿 ' + (r.reason || 'Không mở được rương.'); res.className = 'chest-result bad'; return; }
    res.textContent = `🎉 ${describeRoll(r)}${r.dup ? ' (trùng đồ đã có — hoàn 20 xu)' : ''}!`;
    res.className = 'chest-result good';
    draw();
  }, 750);
});

profileCss();
draw();
addEventListener('gumballz-wallet', draw);

/* ---------- lọc danh mục (pill lọc trên đầu trang) ---------- */
document.querySelectorAll('.shop-filter button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.shop-filter button').forEach(x => x.setAttribute('aria-pressed', x === b));
  const f = b.dataset.f;
  ['items', 'chest', 'frames', 'colors', 'backs'].forEach(k => {
    const s = document.getElementById('sec-' + k);
    if (s) s.style.display = (f === 'all' || f === k) ? '' : 'none';
  });
}));
