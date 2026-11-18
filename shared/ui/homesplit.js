// 🖥️ Màn hình đầu của mỗi game (anh dặn 17/11/2026: máy tính không phải cuộn). Thẻ .home-card vốn là một cột hẹp, dài
// → từ 900px trở lên chia đôi: trái là hình + tên game + câu giới thiệu, phải là ô tên / nút tạo phòng / các nút phụ.
// Điện thoại: hai khối dùng display:contents nên bố cục y như cũ. Thứ gì được script khác chèn thêm vào thẻ sau này cũng tự sang cột phải.
const card = document.querySelector('#screen-home .home-card, #screen-home .home-box');
if (card && !card.classList.contains('hc-split')) {
  const kids = [...card.children], first = kids.findIndex(el => el.matches('label, .fld, .btn-col, form, .join-row, button, .btn') || el.querySelector('input, button, select'));
  if (first > 0) {
    const L = document.createElement('div'), R = document.createElement('div'); L.className = 'hc-left'; R.className = 'hc-right';
    kids.forEach((el, i) => (i < first ? L : R).append(el));
    card.append(L, R); card.classList.add('hc-split');
    new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && n !== L && n !== R) R.append(n); }).observe(card, { childList: true });
    const st = document.createElement('style'); st.textContent = `
.hc-left,.hc-right{display:contents}
.hc-ic{display:none}
@media (min-width:900px){
  #screen-home .hc-split{width:min(880px,calc(100vw - 48px));max-width:none;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px 32px;align-items:center}
  .hc-split .hc-left{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;padding:8px 0}
  .hc-split .hc-right{display:block;min-width:0}
  .hc-split .hc-ic{display:block;width:150px;height:150px;object-fit:contain;margin:0 auto 6px;filter:drop-shadow(0 10px 18px rgba(74,62,92,.2))}
  .hc-split .hc-right>:first-child{margin-top:0}
  .hc-split.home-box.hc-split.home-box .logo{font-size:clamp(40px,5vw,60px);white-space:nowrap} /* CÀ ĐÙNG!: chữ to, giữ một dòng */
}`;
    document.head.append(st);
    /* cột trái mỗi game một cỡ (hình to / nhỏ khác nhau) → đưa về cùng một khuôn: hình cao ~170px, tên game ~48px, câu giới thiệu ≥ 15px */
    const logo = L.querySelector('h1, .logo');
    let art = logo ? [...L.children].filter(el => el !== logo && (el.compareDocumentPosition(logo) & Node.DOCUMENT_POSITION_FOLLOWING) && !el.contains(logo)) : [];
    const hadArt = art.length > 0; art = art.filter(el => el.offsetHeight > 30);
    if (!hadArt && logo) { /* game không có hình ở màn hình đầu (Cờ Tỷ Phú…): lấy icon trang chủ của game */
      const g = (location.pathname.match(/\/([a-z]+)\/?$/) || [])[1], im = document.createElement('img');
      if (g) { im.src = '../shared/img/icons/' + g + '.svg?v=2'; im.alt = ''; im.className = 'hc-ic'; im.onerror = () => im.remove(); L.insertBefore(im, L.firstChild); art = [im]; }
    }
    const visW = el => { let lo = Infinity, hi = -Infinity; for (const x of [el, ...el.querySelectorAll('*')]) { if (x !== el && x.children.length) continue; const b = x.getBoundingClientRect(); if (b.width && b.height) { lo = Math.min(lo, b.left); hi = Math.max(hi, b.right); } } return hi > lo ? hi - lo : el.offsetWidth; };
    const fit = () => {
      const all = [...art, logo, ...L.querySelectorAll('p')].filter(Boolean);
      if (innerWidth < 900) { all.forEach(el => { el.style.zoom = ''; }); return; }
      all.forEach(el => { el.style.zoom = 1; }); const cw = L.clientWidth; if (!cw) return;
      for (const el of art) { const h = el.getBoundingClientRect().height, w = visW(el); if (!h || !w) continue; el.style.zoom = Math.max(0.7, Math.min(2.2, 170 / h, (cw * 0.92) / w)).toFixed(3); }
      if (logo) { const fs = parseFloat(getComputedStyle(logo).fontSize) || 40; logo.style.zoom = Math.max(0.8, Math.min(1.6, 48 / fs)).toFixed(3); }
      for (const p of L.querySelectorAll('p')) { const fs = parseFloat(getComputedStyle(p).fontSize) || 15; if (fs < 15) p.style.zoom = (15 / fs).toFixed(3); }
    };
    let t = 0; const later = () => { clearTimeout(t); t = setTimeout(fit, 60); };
    try { new ResizeObserver(later).observe(R); } catch (e) {}
    addEventListener('resize', later); addEventListener('load', later); setTimeout(fit, 0); setTimeout(fit, 900);
  }
}
