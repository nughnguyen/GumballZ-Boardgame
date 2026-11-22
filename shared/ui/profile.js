// 🏅 Hồ sơ người chơi: nhân vật chibi 3D, cấp độ, danh hiệu (shared/titles.js – chạm để chọn cái trưng ra),
// lộ trình thưởng / khung / màu tên / hiệu ứng thắng (shared/js/avatar-rewards.js), thống kê từng game, thành tích.
// Dữ liệu ở shared/ui/stats.js (lưu trên máy này). Thành tích mẫu gộp thành 1 thẻ mỗi mẫu, thành tựu riêng
// từng game hiện trong mục gập theo game, thành tựu chưa mở chỉ đếm số (ẩn tới khi mở).
// import { openProfile, avatarHTML } from '…/shared/ui/profile.js?v=58'
import { load, totals, level, ACHS, GAME_NAMES, serverTotals, verifiedTotals, serverAch, loadServer } from './stats.js?v=91';
import { statOf, titlesOf, pickTitle, ALL_TITLES, GAME_WINS } from '../titles.js?v=6';
import { loadWallet, fmt, owns, widOf, shopURL } from './wallet.js?v=7'; /* 💰 Ví xu */
import { dragonSVG } from './dragon-frame.js?v=1'; /* 🐉 rồng bay khung avatar (patch -147) */
import { bannerHTML42, initBanners } from './banner-render.js?v=1'; /* 🎏 render banner hồ sơ 55 mẫu (patch -151) */
import { attachInfo } from './infopop.js?v=1'; /* ℹ️ chạm (mobile) / rê chuột (desktop) vào thành tích, danh hiệu để xem cách nhận */
import { cleanLook, charOpen, charLock, TRACK, xpOf, FRAMES, NAME_COLORS, NAME_FONTS, NAME_EFFECTS, BANNERS, WIN_FX, isOpen, FRAME_RING, lockDesc, statsFromTotals, readAuthFlags, nameTextStyle, nameTextClass, bannerCss, bannerAnim, frameAnim, hasGachaPart, presetMinLevel, VIP_TIERS, vipProgress, tierName, CAT_LABEL, THEMES } from '../js/avatar-rewards.js?v=2';
import { medalHTML, attachBadgeTilt } from './badges.js?v=7'; /* 🎖️ huân chương 7 bậc (patch -142) */
import { ensureNameFonts } from './name-fonts.js?v=1'; /* ✍️ nạp font chữ tên hiển thị (patch -154) */
try { ensureNameFonts(); } catch (e) {} /* chạy khi profile.js được import (Hồ sơ/BXH/thành viên) để font kịp tải */
import { OPTIONS, PRESETS, GROUPS, cleanChar, adminOnly, FUR } from '../js/avatar-opts.js';
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
/* link tới trang một game (dùng trong mục "Trận gần đây") – tính từ URL của module nên đúng ở mọi trang */
const gameURL = g => { try { return new URL('../../' + g + '/', import.meta.url).href; } catch (e) { return g + '/'; } };
const rankURL = () => { try { return new URL('../../xephang/', import.meta.url).href; } catch (e) { return 'xephang/'; } }; /* 🏆 URL trang BXH riêng (patch -150) */
export const AVATARS = ['🐱', '🐶', '🦊', '🐼', '🐯', '🐸', '🐵', '🐰', '🐻', '🐨', '🦁', '🐷', '🐙', '🦄', '🐲', '🤖', '👻', '🧙', '🥷', '🤠'];
const BG = ['#ff7a8a,#ffb23d', '#7b61ff,#3d8bff', '#2fc76f,#8fe3a8', '#ff9a3d,#ffd166', '#ff5fa2,#b06bff', '#3dc7d6,#3d8bff'];
/* Avatar: nhân vật chibi 3D – lưu ở 'gumballz-avatar' dạng phẳng { kind, skin, hair, …, color, e: 'ch', c, f, n, t }
   (Cờ Tỷ Phú đọc thẳng các trường nhân vật). Hình cũ là emoji ({ e: '🐱', c }) vẫn hiện được. */
const CH_KEYS = Object.keys(OPTIONS);
export const pickChar = a => Object.fromEntries(CH_KEYS.map(k => [k, a[k]]));
const PUB = PRESETS.filter(p => !adminOnly(p));
export function avatar() {
  let a = null; try { a = JSON.parse(ls.get('gumballz-avatar')); } catch (e) {}
  if (a && a.kind) return { ...a, e: 'ch', ch: cleanChar(a) };
  if (a && AVATARS.includes(a.e)) return a;
  const ch = cleanChar(PUB[Math.floor(Math.random() * PUB.length)]), n = { ...ch, e: 'ch', c: 1, f: (a && a.f) || '', n: (a && a.n) || '', t: 0 }; /* người mới: nhân vật ngẫu nhiên (t = 0 để không đè hình trên tài khoản) */
  ls.set('gumballz-avatar', JSON.stringify(n)); return { ...n, ch };
}
/* lưu nhân vật (Cờ Tỷ Phú cũng gọi) – giữ khung / màu tên / nền */
export function setAvatarChar(cfg) { setAv({ ...cleanChar(cfg), e: 'ch' }); }
/* 🛍️ Cửa hàng mặc đồ đã mua (chỉ khung/màu tên): giữ nguyên nhân vật, chỉ đổi khung hoặc màu tên */
export function setAvatarLook(patch) { setAv(patch); }
/* hình của NGƯỜI KHÁC (từ máy chủ): chỉ nhận nhân vật hợp lệ / emoji trong danh sách / khung, màu tên có trong bảng – không chèn chuỗi lạ vào trang */
export function safeAv(av, seed = 0) {
  const base = av && typeof av === 'object' ? { c: Math.max(0, +av.c || 0), f: FRAMES.some(x => x.id && x.id === av.f) ? av.f : '', n: NAME_COLORS.some(x => x.id && x.id === av.n) ? av.n : '', b: BANNERS.some(x => x.id && x.id === av.b) ? av.b : '', nf: NAME_FONTS.some(x => x.id && x.id === av.nf) ? av.nf : '', ne: NAME_EFFECTS.some(x => x.id && x.id === av.ne) ? av.ne : '' } : { c: Math.abs(seed) % BG.length }; /* ✍️ font + hiệu ứng chữ (patch -154): chỉ nhận id có trong bảng */
  if (av && av.ch && typeof av.ch === 'object' && av.ch.kind) return { ...base, ch: cleanChar(av.ch) };
  if (av && av.kind) return { ...base, ch: cleanChar(av) }; /* nhân vật phẳng từ máy chủ (đã đồng bộ theo tài khoản) */
  if (av && AVATARS.includes(av.e)) return { ...base, e: av.e };
  return { ...base, e: AVATARS[Math.abs(seed) % AVATARS.length] };
}
/* ảnh chân dung 3D: vẽ bằng three.js (nạp lúc cần), nhớ trong bộ nhớ + vài cái gần nhất trong localStorage để trang chủ khỏi phải nạp three.js */
const PC = new Map(), PKEY = 'gumballz-av-cache'; /* đổi tên khi cách vẽ nhân vật đổi để khỏi hiện ảnh cũ */ let PLS = null, A3 = null, hyT = 0;
const plsGet = k => { if (!PLS) { try { PLS = JSON.parse(ls.get(PKEY) || '[]'); } catch (e) { PLS = []; } } const x = PLS.find(y => y[0] === k); return x ? x[1] : ''; };
const plsPut = (k, u) => { plsGet(''); PLS = [[k, u], ...PLS.filter(y => y[0] !== k)].slice(0, 6); try { localStorage.setItem(PKEY, JSON.stringify(PLS)); } catch (e) { PLS = PLS.slice(0, 2); } };
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
function hydrateSoon() { if (!hyT) hyT = setTimeout(hydrate, 0); }
async function hydrate() {
  hyT = 0; let imgs = [...document.querySelectorAll('img[data-cb]:not([data-ok])')]; if (!imgs.length) return;
  let m; try { m = await (A3 = A3 || import('../js/avatar3d.js?v=2')); } catch (e) { A3 = null; return; }
  /* vẽ từng cái một rồi nhường trình duyệt (cuộn không giật), cái đang thấy trên màn hình vẽ trước */
  const H = innerHeight, vis = im => { const r = im.getBoundingClientRect(); return r.bottom > -40 && r.top < H + 40 && r.width > 0; };
  imgs.sort((x, y) => vis(y) - vis(x));
  let t0 = performance.now();
  for (const im of imgs) {
    if (!im.isConnected || im.dataset.ok) continue;
    const k = im.dataset.cb + '|' + im.dataset.sz; let u = PC.get(k);
    if (!u) { try { u = m.portrait(JSON.parse(im.dataset.cb), Math.min(256, +im.dataset.sz * 2), 'av'); } catch (e) { u = ''; } if (u) { PC.set(k, u); if (im.dataset.mine) plsPut(k, u); } }
    if (u) { for (const x of document.querySelectorAll('img[data-cb]:not([data-ok])')) if (x.dataset.cb + '|' + x.dataset.sz === k) { x.src = u; x.dataset.ok = '1'; } }
    if (performance.now() - t0 > 12) { await new Promise(r => setTimeout(r, 16)); t0 = performance.now(); }
  }
}
export function portraitURL(ch, size) { const k = JSON.stringify(cleanChar(ch)) + '|' + size; return PC.get(k) || plsGet(k) || ''; }
/* khung avatar: vòng màu bao ngoài (kích thước tổng vẫn = size) */
export function avatarHTML(size = 40, a = avatar()) {
  const bg = `linear-gradient(135deg,${BG[(+a.c || 0) % BG.length]})`, ch = a.ch || (a.kind ? cleanChar(a) : null);
  const ring = a.f && FRAME_RING[a.f], pad = ring ? Math.max(2, Math.round(size / 15)) : 0, in_ = size - pad * 2;
  let body = a.e || '🐱', cls = '';
  if (ch) {
    const js = JSON.stringify(ch), k = js + '|' + in_, u = PC.get(k) || plsGet(k), mine = a === undefined || a.t !== undefined;
    if (u) PC.set(k, u); else hydrateSoon();
    body = `<img alt="" data-cb="${esc(js)}" data-sz="${in_}"${u ? ' data-ok="1"' : ''}${mine ? ' data-mine="1"' : ''} src="${u || BLANK}">`; cls = ' pf-cb';
  }
  const inner = `<span class="pf-av${cls}" style="width:${in_}px;height:${in_}px;font-size:${Math.round(in_ * .56)}px;background:${ch ? (ring ? 'var(--card)' : 'transparent') : bg}${ring ? ';box-shadow:0 0 0 1.5px #fff' : ''}">${body}</span>`; /* nhân vật 3D: nền trong suốt */
  const fa = a.f && frameAnim(a.f); /* ✨ khung động: spin = viền conic xoay (::before), glow = phát sáng nhấp nháy, orbit = rồng/phụng bay vòng (::before/::after); khung động nào cũng thêm class fr-<id> để CSS vẽ trang trí riêng */
  const faCls = fa === 'spin' ? ' fr-anim' : fa === 'glow' ? ' fr-glow' : fa ? ` fr-${fa}` : '';
  const dr = (fa === 'dragon' || fa === 'dragon-edge') && a.f ? (FRAMES.find(x => x.id === a.f)?.dragon || []).map(([c1, c2], i, arr) => dragonSVG(c1, c2, 3, fa === 'dragon' ? 'orbit' : 'edge', arr.length > 1 ? i / arr.length : 0)).join('') : ''; /* 🐉 rồng SVG bay vòng số 8 qua avatar (dragon) hoặc tròn mép viền (dragon-edge) – nhiều rồng chia đều phase */
  return ring ? `<span class="pf-fr${a.f === 'owner' ? ' own' : ''}${faCls}${fa ? ` fr-${a.f}` : ''}" style="width:${size}px;height:${size}px;padding:${pad}px;${fa === 'spin' ? `--ring:${ring}` : `background:${ring}`}">${inner}${dr}</span>` : inner;
}
/* 🎖️ huy hiệu huân chương 7 bậc (patch -142) – markup + CSS ở shared/ui/badges.js + shared/css/badges.css; giữ tên export cũ để bảng xếp hạng dùng chung */
export const ownerBadge = (on, size = 'xs') => on ? medalHTML('owner', size) : '';
export const ownName = on => on ? ' pf-ownnm' : ''; /* lớp thêm cho tên chủ sảnh: lấp lánh */
export const adminBadge = (on, size = 'xs') => on ? medalHTML('adm', size) : ''; /* 🛠️ Quản sảnh = role 2, không phải chủ sảnh */
export const modBadge = (on, size = 'xs') => on ? medalHTML('staff', size) : ''; /* 🛡️ Hỗ trợ = role 1 (nhãn đổi từ "MOD SẢNH" theo bản phát thảo -142) */
export const supporterBadge = (on, size = 'xs') => on ? medalHTML('sup', size) : '';
export const vipBadge = (on, size = 'xs') => on ? medalHTML('vip', size) : ''; /* 💠 VIP: cờ máy chủ do Quản trị cấp (patch -142) */
export const devBadge = (on, size = 'xs') => on ? medalHTML('dev', size) : ''; /* 💻 DEV: cờ máy chủ do Quản trị cấp (patch -142) */
export const newbieBadge = (on, size = 'xs') => on ? medalHTML('newbie', size) : ''; /* 🌱 Người mới: tự động khi cấp 1 (patch -142) */
/* màu tên đã mở (thuộc tính style) — nhận object look {n, nf, ne} hoặc chuỗi id màu cũ (tương thích ngược) */
export const nameStyle = av => nameTextStyle(av);
/* tên động: thêm class nc-anim để gradient chạy (xem shared/css/avatar.css) */
export const nameClass = av => nameTextClass(av);
/* 🎏 dải banner trên đầu hộp Hồ sơ (trường b) – '' = không banner.
   Banner mới (có spec): hiệu ứng đầy đủ qua banner-render.js; banner cũ (5 banner, chỉ có css): nền CSS tĩnh như trước. */
export const bannerHTML = b => {
  const x = BANNERS.find(y => y.id && y.id === b);
  if (x && x.spec) return `<div class="pf-banner b42-head">${bannerHTML42(x)}</div>`;
  const css = bannerCss(b); return css ? `<div class="pf-banner${bannerAnim(b) ? ' bn-anim' : ''}" style="background:${css}"></div>` : '';
};
/* CSS diện mạo ở shared/css/avatar.css (nạp bằng <link>), gồm cả pill danh hiệu (.pf-tt/.pf-tts) */
export function profileCss() {
  import('./badges.js?v=7').then(m => m.ensureBadgesCSS()).catch(() => {}); /* 🎖️ huy hiệu 4 bậc (patch -95) */
  if (document.getElementById('pf-css')) return;
  const l = document.createElement('link'); l.id = 'pf-css'; l.rel = 'stylesheet';
  try { l.href = new URL('../css/avatar.css?v=7', import.meta.url).href; } catch (e) { l.href = '../css/avatar.css?v=7'; }
  document.head.append(l);
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function setAv(patch) {
  const a = avatar(), base = a.ch ? { ...a.ch, ...(a.sex ? { sex: a.sex } : {}), e: 'ch' } : { e: a.e, ...(a.sex ? { sex: a.sex } : {}) }; /* giữ giới tính đã chọn khi đổi đồ / đổi mẫu */
  const n = { ...base, c: +a.c || 0, f: a.f || '', n: a.n || '', b: a.b || '', nf: a.nf || '', ne: a.ne || '', ...patch, t: Date.now() };
  if (['kind', 'hair', 'hat', 'outfit', 'acc', 'skin', 'hairColor', 'color', 'horns', 'e'].some(k => k in patch)) try { localStorage.setItem('gumballz-dress-n', String(+(localStorage.getItem('gumballz-dress-n') || 0) + 1)); } catch (e) {} /* đếm lần đổi đồ – thành tích Mystique */
  if (AVATARS.includes(n.e)) for (const k of CH_KEYS) delete n[k]; /* đổi sang emoji thì bỏ nhân vật */
  delete n.ch; ls.set('gumballz-avatar', JSON.stringify(n));
  try { dispatchEvent(new CustomEvent('gumballz-avatar')); } catch (x) {}
}
const KIND = { kind: '🐾', hair: '💇', hat: '🎩', outfit: '👕', acc: '🎒' };
const LBL = { kind: 'Kiểu nhân vật', skin: 'Màu da / lông', hair: 'Kiểu tóc', hairColor: 'Màu tóc', hat: 'Nón', outfit: 'Trang phục', acc: 'Phụ kiện', horns: 'Sừng 😈', color: 'Màu chủ đạo' };
/* bảng đổi diện mạo: nhân vật / khung / màu tên / hiệu ứng thắng */
const SUBS = [['pre', '✨ Mẫu'], ['body', '🧑 Dáng'], ['hair', '💇 Tóc'], ['hat', '🎩 Nón'], ['outfit', '👕 Đồ'], ['acc', '🎒 Phụ kiện']];
const SUB_KEYS = { body: ['kind', 'skin', 'horns', 'color'], hair: ['hair', 'hairColor'], hat: ['hat'], outfit: ['outfit'], acc: ['acc'] };
function picker(a, st, tab, name, sub = 'pre', ff = { cat: 'all', theme: 'all', owned: false, sort: 'cui-vip' }, bf = { cat: 'all', theme: 'all', owned: false, sort: 'cui-vip' }) {
  const TABS = [['ch', '🧸 Nhân vật'], ['track', '🎁 Lộ trình thưởng'], ['frame', '🖼️ Khung'], ['name', '✍️ Kiểu chữ'], ['banner', '🎏 Banner'], ['fx', '🎉 Khi thắng']];
  let body = '';
  const bgRow = `<div class="lk-row">${BG.map((c, i) => `<button type="button" class="lk-sw" data-c="${i}" aria-pressed="${i === (+a.c || 0) % BG.length}" style="background:linear-gradient(135deg,${c})" aria-label="Nền ${i + 1}"></button>`).join('')}</div>`;
  if (tab === 'ch') {
    const cur = a.ch || {}, pres = PRESETS.map((p, i) => [p, i]).filter(([p]) => charOpen(p, st));
    const subBar = `<div class="lk-subs" role="tablist">${SUBS.map(([id, t]) => `<button type="button" role="tab" data-sub="${id}" aria-pressed="${sub === id}">${t}</button>`).join('')}</div>`;
    body = subBar + (sub === 'pre' ? `<div class="lk-grid lk-pre">${pres.map(([p, i]) => `<button type="button" class="lk-card" data-pre="${i}">${avatarHTML(54, { ch: cleanChar(p), c: a.c })}<span>${esc(p.name)}</span></button>`).join('')}</div>` : '') + `
      ${Object.entries(OPTIONS).filter(([k]) => (SUB_KEYS[sub] || []).includes(k)).map(([k, list]) => {
        if (k === 'skin' && cur.kind && cur.kind !== 'human' && FUR[cur.kind]) list = FUR[cur.kind]; /* thú: bảng màu lông riêng */
        if (k === 'hair' && cur.kind && cur.kind !== 'human') return `<div class="lk-sec"><b>${LBL[k]}</b><p class="pf-note" style="margin:0;text-align:left">Chỉ nhân vật kiểu Người mới có tóc – chọn ở mục 🧑 Dáng.</p></div>`;
        const btn = o => {
          if (!Array.isArray(o)) return `<button type="button" class="lk-sw" data-k="${k}" data-v="${o}" aria-pressed="${String(cur[k]).toLowerCase() === o.toLowerCase()}" style="background:${o}" aria-label="${o}"></button>`;
          const l = charLock(k, o[0]), lk = l && !isOpen(l, st) && !hasGachaPart(k, o[0]); if (l === 'admin' && lk) return ''; /* đồ riêng của chủ sảnh: người khác không thấy luôn */
          return `<button type="button" class="lk-chip${lk ? ' lock' : ''}" ${lk ? `data-lock="${esc(lockDesc(l))}"` : `data-k="${k}" data-v="${o[0]}"`} aria-pressed="${cur[k] === o[0]}">${lk ? '🔒 ' : ''}${esc(o[1])}</button>`; };
        const byV = Object.fromEntries(list.map(o => [Array.isArray(o) ? o[0] : o, o]));
        const rows = GROUPS[k] ? GROUPS[k].map(([lbl, vs]) => { const h = vs.map(v => byV[v] ? btn(byV[v]) : '').join(''); return h ? `<div class="lk-sub">${lbl}</div><div class="lk-row">${h}</div>` : ''; }).join('') : `<div class="lk-row">${list.map(btn).join('')}</div>`;
        return `<div class="lk-sec"><b>${LBL[k] || k}</b>${rows}</div>`; }).join('')}
      <button type="button" class="lk-rnd" data-a="rnd">🎲 Nhân vật ngẫu nhiên</button>
      ${AVATARS.includes(a.e) ? '' : '<p class="pf-note" style="margin:8px 0 0;text-align:left">Muốn dùng lại hình emoji cũ? <button type="button" class="lk-link" data-a="emoji">Chọn emoji</button></p>'}`;
  } else if (tab === 'emoji') body = `<div class="pf-pick">${AVATARS.map(e => `<button type="button" data-e="${e}" aria-pressed="${e === a.e}">${e}</button>`).join('')}</div><div class="lk-sec"><b>Màu nền</b>${bgRow}</div>`;
  else if (tab === 'track') {
    const xp = xpOf(st), ni = TRACK.findIndex(r => xp < r.xp), nx = ni < 0 ? null : TRACK[ni], prev = ni <= 0 ? 0 : TRACK[ni - 1].xp, got = ni < 0 ? TRACK.length : ni;
    const nm = r => { const o = (OPTIONS[r.k] || []).find(x => Array.isArray(x) && x[0] === r.v); return o ? o[1] : r.v; };
    const preview = nx && a.ch ? avatarHTML(84, { ch: { ...a.ch, [nx.k]: nx.v }, c: a.c }) : '';
    body = `<div class="lk-next">${preview}<div style="min-width:0;flex:1"><b>${nx ? `Mốc ${ni + 1}: ${esc(KIND[nx.k] || '')} ${esc(nm(nx))}` : 'Đã nhận hết phần thưởng 🎉'}</b>
        <small>${nx ? `${xp} / ${nx.xp} điểm · còn khoảng ${Math.max(1, Math.ceil((nx.xp - xp) / 15))} ván` : `${xp} điểm kinh nghiệm`}</small>
        ${nx ? `<div class="pf-bar"><i style="width:${Math.round((xp - prev) / (nx.xp - prev) * 100)}%"></i></div>` : ''}</div></div>
      <p class="pf-note" style="margin:6px 0 8px;text-align:left">Mỗi ván +10 điểm, thắng +20 điểm. Đã nhận ${got} / ${TRACK.length} món.</p>
      <div class="lk-track">${TRACK.map((r, i) => { const ok = xp >= r.xp || st.admin; return `<div class="lk-tr${ok ? ' ok' : ''}${i === ni ? ' nx' : ''}"><span class="n">${i + 1}</span><span class="t">${esc(KIND[r.k] || '')} ${esc(nm(r))}</span><small>${ok ? '✓ Đã nhận' : r.xp + ' điểm'}</small></div>`; }).join('')}</div>`;
  }
  else if (tab === 'frame') {
    /* 🔍 lọc khung (patch -147): mặc định hiện HẾT, sắp Cùi → VIP, toggle đã-sở-hữu TẮT (user dặn 2026-11-22 ~09:51) */
    let list = FRAMES.slice();
    if (ff.owned) list = list.filter(x => !((x.lock && !isOpen(x.lock, st) && !owns(widOf('frame', x.id))) || (x.shop && !owns(widOf('frame', x.id))) || (x.chest && !owns(widOf('frame', x.id)))));
    if (ff.cat !== 'all') list = list.filter(x => x.cat === ff.cat);
    if (ff.theme !== 'all') list = list.filter(x => x.theme === ff.theme);
    list = list.map((x, i) => [x, i]).sort((p, q) => { const d = (p[0].tier || 0) - (q[0].tier || 0); return ff.sort === 'vip-cui' ? -d || p[1] - q[1] : d || p[1] - q[1]; }).map(([x]) => x); /* sắp theo bậc, cùng bậc giữ thứ tự FRAMES gốc */
    body = `<div class="lk-filter"><div class="lk-frow">${['all', ...Object.keys(CAT_LABEL)].map(k => `<button type="button" class="lk-fbtn" data-fcat="${k}" aria-pressed="${ff.cat === k}">${k === 'all' ? 'Tất cả' : CAT_LABEL[k]}</button>`).join('')}</div>
      <div class="lk-frow"><select class="lk-fsel" data-fsel="theme" aria-label="Chủ đề"><option value="all">Tất cả chủ đề</option>${THEMES.map(t => `<option value="${esc(t)}"${ff.theme === t ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select><select class="lk-fsel" data-fsel="sort" aria-label="Sắp xếp"><option value="cui-vip"${ff.sort === 'cui-vip' ? ' selected' : ''}>Cùi → VIP</option><option value="vip-cui"${ff.sort === 'vip-cui' ? ' selected' : ''}>VIP → Cùi</option></select><button type="button" class="lk-fbtn" data-fowned="1" aria-pressed="${ff.owned}">✅ Chỉ khung đã sở hữu</button></div>
      <div class="lk-count">Hiển thị ${list.length} / ${FRAMES.length} khung</div></div>
      <div class="lk-grid">${list.map(x => { const shopLk = x.shop && !owns(widOf('frame', x.id)), chestLk = x.chest && !owns(widOf('frame', x.id)), lk = (x.lock && !isOpen(x.lock, st) && !owns(widOf('frame', x.id))) || shopLk || chestLk; const lkTx = x.shop ? `Mua ${x.shop} xu ở Cửa hàng` : x.chest ? 'Chỉ mở ra từ rương Gacha (100 xu/rương)' : lockDesc(x.lock); const tierCls = (x.tier || 0) >= 3 ? 'vip' : (x.tier || 0) === 2 ? 'hiem' : 'cui'; return `<button type="button" class="lk-card${lk ? ' lock' : ''}" ${lk ? `data-lock="${esc(lkTx)}"${x.shop ? ' data-shopgo="1"' : ''}` : `data-f="${x.id}"`} aria-pressed="${(a.f || '') === x.id}">${avatarHTML(54, { ...a, f: x.id })}<span>${lk ? '🔒 ' : ''}${esc(x.name)}</span><small class="lk-meta"><b class="lk-tier ${tierCls}">${tierName(x.tier || 0)}</b> ${CAT_LABEL[x.cat] || ''}${x.theme ? ' · ' + esc(x.theme) : ''}</small>${lk ? `<small>${esc(lkTx)}</small>` : '<small>✅ Đã sở hữu</small>'}</button>`; }).join('')}</div>`;
  }
  else if (tab === 'name') {
    /* ✍️ kiểu chữ (patch -154): xem trước tổ hợp đang chọn + 3 hàng chọn — Font / Màu / Hiệu ứng, trộn tự do */
    const prev = `<div class="lk-nameprev"><b>Xem trước:</b><span class="lk-nm${nameTextClass(a)}" style="${nameTextStyle(a)}">${esc(name)}</span></div>`;
    const fontGrid = `<div class="lk-sec"><b>Font chữ</b><div class="lk-grid">${NAME_FONTS.map(x => { const lk = x.lock && !isOpen(x.lock, st); const lkTx = lockDesc(x.lock); return `<button type="button" class="lk-card${lk ? ' lock' : ''}" ${lk ? `data-lock="${esc(lkTx)}"` : `data-nf="${x.id}"`} aria-pressed="${(a.nf || '') === x.id}"><span class="lk-nm${nameTextClass({ ...a, nf: x.id })}" style="${nameTextStyle({ ...a, nf: x.id })}">GumballZ</span><span>${lk ? '🔒 ' : ''}${esc(x.name)}</span>${lk ? `<small>${esc(lkTx)}</small>` : ''}</button>`; }).join('')}</div></div>`;
    const colorGrid = `<div class="lk-sec"><b>Màu chữ</b><div class="lk-grid">${NAME_COLORS.map(x => { const shopLk = x.shop && !owns(widOf('color', x.id)), chestLk = x.chest && !owns(widOf('color', x.id)), lk = (x.lock && !isOpen(x.lock, st) && !owns(widOf('color', x.id))) || shopLk || chestLk; const lkTx = x.shop ? `Mua ${x.shop} xu ở Cửa hàng` : x.chest ? 'Chỉ mở ra từ rương Gacha (100 xu/rương)' : lockDesc(x.lock); return `<button type="button" class="lk-card${lk ? ' lock' : ''}" ${lk ? `data-lock="${esc(lkTx)}"${x.shop ? ' data-shopgo="1"' : ''}` : `data-n="${x.id}"`} aria-pressed="${(a.n || '') === x.id}"><span class="lk-nm${nameTextClass({ ...a, n: x.id })}" style="${nameTextStyle({ ...a, n: x.id })}">${esc(name)}</span><span>${lk ? '🔒 ' : ''}${esc(x.name)}</span>${lk ? `<small>${esc(lkTx)}</small>` : ''}</button>`; }).join('')}</div></div>`;
    const effGrid = `<div class="lk-sec"><b>Hiệu ứng chữ</b><div class="lk-grid">${NAME_EFFECTS.map(x => { const lk = x.lock && !isOpen(x.lock, st); const lkTx = lockDesc(x.lock); return `<button type="button" class="lk-card${lk ? ' lock' : ''}" ${lk ? `data-lock="${esc(lkTx)}"` : `data-ne="${x.id}"`} aria-pressed="${(a.ne || '') === x.id}"><span class="lk-nm${nameTextClass({ ...a, ne: x.id })}" style="${nameTextStyle({ ...a, ne: x.id })}">GumballZ</span><span>${lk ? '🔒 ' : ''}${esc(x.name)}</span>${lk ? `<small>${esc(lkTx)}</small>` : ''}</button>`; }).join('')}</div></div>`;
    body = prev + fontGrid + colorGrid + effGrid;
  }
  else if (tab === 'banner') {
    /* 🔍 lọc banner (patch -151): giống hệt tab Khung -147 — mặc định hiện HẾT banner, sắp Cùi → VIP, toggle đã-sở-hữu TẮT */
    let list = BANNERS.slice();
    const isOwnedB = x => !x.id || !((x.lock && !isOpen(x.lock, st) && !owns(widOf('banner', x.id))) || (x.shop && !owns(widOf('banner', x.id))) || (x.chest && !owns(widOf('banner', x.id))));
    if (bf.owned) list = list.filter(isOwnedB);
    if (bf.cat !== 'all') list = list.filter(x => x.cat === bf.cat);
    if (bf.theme !== 'all') list = list.filter(x => x.theme === bf.theme);
    list = list.map((x, i) => [x, i]).sort((p, q) => { const d = (p[0].tier || 0) - (q[0].tier || 0); return bf.sort === 'vip-cui' ? -d || p[1] - q[1] : d || p[1] - q[1]; }).map(([x]) => x); /* sắp theo bậc, cùng bậc giữ thứ tự BANNERS gốc */
    body = `<div class="lk-filter"><div class="lk-frow">${['all', ...Object.keys(CAT_LABEL)].map(k => `<button type="button" class="lk-fbtn" data-bcat="${k}" aria-pressed="${bf.cat === k}">${k === 'all' ? 'Tất cả' : CAT_LABEL[k]}</button>`).join('')}</div>
      <div class="lk-frow"><select class="lk-fsel" data-bsel="theme" aria-label="Chủ đề"><option value="all">Tất cả chủ đề</option>${THEMES.map(t => `<option value="${esc(t)}"${bf.theme === t ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select><select class="lk-fsel" data-bsel="sort" aria-label="Sắp xếp"><option value="cui-vip"${bf.sort === 'cui-vip' ? ' selected' : ''}>Cùi → VIP</option><option value="vip-cui"${bf.sort === 'vip-cui' ? ' selected' : ''}>VIP → Cùi</option></select><button type="button" class="lk-fbtn" data-bowned="1" aria-pressed="${bf.owned}">✅ Chỉ banner đã sở hữu</button></div>
      <div class="lk-count">Hiển thị ${list.length} / ${BANNERS.length} banner</div></div>
      <div class="lk-grid lk-bn-grid">${list.map(x => { const shopLk = x.shop && !owns(widOf('banner', x.id)), chestLk = x.chest && !owns(widOf('banner', x.id)), lk = (x.lock && !isOpen(x.lock, st) && !owns(widOf('banner', x.id))) || shopLk || chestLk; const lkTx = x.shop ? `Mua ${x.shop} xu ở Cửa hàng` : x.chest ? 'Chỉ mở ra từ rương Gacha (100 xu/rương)' : lockDesc(x.lock); const tierCls = (x.tier || 0) >= 3 ? 'vip' : (x.tier || 0) === 2 ? 'hiem' : 'cui'; const art = x.spec ? bannerHTML42(x) : `<span class="lk-bn${x.anim ? ' bn-anim' : ''}" style="background:${x.css || 'transparent'}"></span>`; return `<button type="button" class="lk-card lk-bcard${lk ? ' lock' : ''}" ${lk ? `data-lock="${esc(lkTx)}"${x.shop ? ' data-shopgo="1"' : ''}` : `data-b="${x.id}"`} aria-pressed="${(a.b || '') === x.id}">${art}<span>${lk ? '🔒 ' : ''}${esc(x.name)}</span><small class="lk-meta"><b class="lk-tier ${tierCls}">${tierName(x.tier || 0)}</b> ${CAT_LABEL[x.cat] || ''}${x.theme ? ' · ' + esc(x.theme) : ''}</small>${lk ? `<small>${esc(lkTx)}</small>` : '<small>✅ Đã sở hữu</small>'}</button>`; }).join('')}</div>`;
  }
  else if (tab === 'fx') { const cur = ls.get('gumballz-winfx') || 'giay'; body = `<p class="pf-note" style="margin:0 0 8px;text-align:left">Hiện trên màn hình của bạn mỗi khi thắng ván. Chạm để chọn và xem thử.</p><div class="lk-grid">${WIN_FX.map(x => { const lk = x.lock && !isOpen(x.lock, st); return `<button type="button" class="lk-card${lk ? ' lock' : ''}" ${lk ? `data-lock="${esc(lockDesc(x.lock))}"` : `data-fx="${x.id}"`} aria-pressed="${cur === x.id}"><span style="font-size:28px;line-height:1">${x.icon}</span><span>${lk ? '🔒 ' : ''}${esc(x.name)}</span>${lk ? `<small>${esc(lockDesc(x.lock))}</small>` : ''}</button>`; }).join('')}</div>`; }
  const hint = tab === 'frame' || tab === 'name' || tab === 'banner' ? '<p class="pf-note" style="margin:8px 0 0;text-align:left">Khung, kiểu chữ và banner mở khoá theo thành tích, mua bằng xu ở Cửa hàng, hoặc mở ra từ rương Gacha. Vật phẩm VIP (Khung Ngôi Sao, Màu Hoàng Gia…) chỉ mở bằng chuỗi ngày đứng top BXH — xem tiến độ ở mục 👑 Vật phẩm VIP trong Hồ sơ. Đăng nhập thì người khác thấy ở hồ sơ, bảng xếp hạng và thẻ người chơi trong phòng. Món có ✨ là hạng động kiểu Nitro, chỉ mở ra từ rương với tỉ lệ cực hiếm.</p>' : '';
  return `<div class="lk-stick"><div class="lk-tabs" role="tablist">${TABS.map(([id, t]) => `<button type="button" role="tab" data-tab="${id}" aria-pressed="${tab === id || (id === 'ch' && tab === 'emoji')}">${t}</button>`).join('')}</div></div>${body}${hint}`;
}

/* 🎁 popup khi chạm mốc thưởng (stats.js gọi sau mỗi ván) – list = [{ k, v, i }] */
export function showReward(list) {
  if (!list || !list.length) return; profileCss(); document.getElementById('lk-rw')?.remove();
  const a = avatar(), r = list[list.length - 1], o = (OPTIONS[r.k] || []).find(x => Array.isArray(x) && x[0] === r.v), nm = o ? o[1] : r.v;
  const d = document.createElement('div'); d.id = 'lk-rw'; d.className = 'lk-rw'; d.setAttribute('role', 'status');
  d.innerHTML = `${a.ch ? avatarHTML(64, { ch: { ...a.ch, [r.k]: r.v }, c: a.c }) : ''}<div style="min-width:0"><b>🎁 Mở khoá${list.length > 1 ? ` ${list.length} món` : ''}: ${esc(nm)}</b><small>Mốc thưởng ${r.i + 1} / ${TRACK.length}</small>
    <div class="lk-rwb">${a.ch ? '<button type="button" class="go">Mặc thử</button>' : ''}<button type="button" class="x">Để sau</button></div></div>`;
  document.body.append(d); const bye = () => { d.classList.add('out'); setTimeout(() => d.remove(), 260); }, t = setTimeout(bye, 12000);
  d.querySelector('.x').onclick = () => { clearTimeout(t); bye(); };
  const go = d.querySelector('.go'); if (go) go.onclick = () => { clearTimeout(t); setAv({ ...a.ch, [r.k]: r.v, e: 'ch' }); bye(); import('./dialog.js?v=10').then(m => m.toast('✨ Đã mặc ' + nm, 2200)).catch(() => {}); };
}

/* 🧸 Tạo nhân vật lúc mới tạo tài khoản: chọn giới tính + màu nhân vật (màu da, màu chủ đạo).
   Giới tính chọn mẫu gốc (Nam → 'Doanh nhân', Nữ → 'Nữ doanh nhân'); màu thì tự chọn.
   Lưu bằng setAv (đặt t = giờ hiện tại → đồng bộ lên tài khoản ngay, theo sang mọi máy). */
const SETUP_BASE = { nam: 'Doanh nhân', nu: 'Nữ doanh nhân' };
export function openCharSetup() {
  profileCss(); document.getElementById('cs-ov')?.remove();
  const cur = avatar();
  let sex = cur.sex === 'nu' ? 'nu' : 'nam';
  let base = PRESETS.find(p => p.name === SETUP_BASE[sex]) || PRESETS[0];
  let skin = base.skin, color = base.color, picked = false;
  const lvNow = level(totals()).lv; /* cấp hiện tại (tài khoản mới: cấp 1) — mẫu có món khoá theo cấp thì hiện 🔒 */
  const ov = document.createElement('div'); ov.className = 'pf-ov'; ov.id = 'cs-ov';
  const key = e => { if (e.key === 'Escape') close(); };
  const close = () => { ov.remove(); removeEventListener('keydown', key, true); };
  const draw = () => {
    const char = { ...pickChar(base), skin, color };
    ov.innerHTML = `<div class="pf-box" role="dialog" aria-modal="true" aria-label="Tạo nhân vật"><button class="pf-x" aria-label="Đóng">✕</button>
      <h2 style="margin:0 36px 4px 0;font:800 22px/1.2 'Baloo 2',Nunito,sans-serif">🧸 Tạo nhân vật của bạn</h2>
      <p style="margin:0;color:var(--muted)">Chọn mẫu nhân vật, giới tính và màu — xong là nhân vật này theo tài khoản của bạn sang mọi máy.</p>
      <div style="display:grid;place-items:center;padding:12px 0 4px">${avatarHTML(96, { ch: char, c: 0 })}</div>
      <div class="lk-sec"><b>Mẫu nhân vật</b><div class="lk-grid lk-pre">${PUB.map(p => { const pi = PRESETS.indexOf(p), need = presetMinLevel(p), locked = need > lvNow; return `<button type="button" class="lk-card${locked ? ' lock' : ''}" ${locked ? `data-prelock="${need}"` : `data-pre="${pi}"`} aria-pressed="${base === p}">${avatarHTML(54, { ch: cleanChar(p), c: 0 })}<span>${locked ? '🔒 ' : ''}${esc(p.name)}</span>${locked ? `<small>🔒 Cấp ${need} mới mở</small>` : ''}</button>`; }).join('')}</div></div>
      <div class="lk-sec"><b>Giới tính</b><div class="lk-row">
        <button type="button" data-sex="nam" aria-pressed="${sex === 'nam'}" style="flex:1;min-height:48px;border:2px solid var(--ink);border-radius:12px;background:${sex === 'nam' ? 'var(--y1)' : 'var(--card)'};font:800 16px 'Baloo 2',Nunito,sans-serif;color:${sex === 'nam' ? 'var(--on-accent)' : 'var(--ink)'};cursor:pointer;box-shadow:var(--sh-sm)">🧑 Nam</button>
        <button type="button" data-sex="nu" aria-pressed="${sex === 'nu'}" style="flex:1;min-height:48px;border:2px solid var(--ink);border-radius:12px;background:${sex === 'nu' ? 'var(--y1)' : 'var(--card)'};font:800 16px 'Baloo 2',Nunito,sans-serif;color:${sex === 'nu' ? 'var(--on-accent)' : 'var(--ink)'};cursor:pointer;box-shadow:var(--sh-sm)">👩 Nữ</button>
      </div></div>
      <div class="lk-sec"><b>Màu da</b><div class="lk-row">${OPTIONS.skin.map(s => `<button type="button" class="lk-sw" data-skin="${s}" aria-pressed="${s === skin}" style="background:${s}" aria-label="Màu da"></button>`).join('')}</div></div>
      <div class="lk-sec"><b>Màu chủ đạo</b><div class="lk-row">${OPTIONS.color.map(s => `<button type="button" class="lk-sw" data-color="${s}" aria-pressed="${s === color}" style="background:${s}" aria-label="Màu chủ đạo"></button>`).join('')}</div></div>
      <div class="pf-acts" style="margin-top:16px"><button type="button" class="pf-act-y" data-a="save" style="flex:1">Xong, lưu nhân vật ✨</button><button type="button" class="pf-act-w" data-a="skip">Để sau</button></div>
      <p class="pf-note" style="margin:8px 0 0;text-align:left">Đổi ý sau thì vào Hồ sơ → “Đổi tên và avatar” để chọn lại mẫu, tóc, nón, đồ…</p></div>`;
  };
  ov.addEventListener('click', e => {
    if (e.target === ov || e.target.closest('.pf-x')) return close();
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.sex) { sex = b.dataset.sex; if (!picked) { base = PRESETS.find(p => p.name === SETUP_BASE[sex]) || PRESETS[0]; skin = base.skin; color = base.color; } return draw(); }
    if (b.dataset.pre != null) { base = PRESETS[+b.dataset.pre]; skin = base.skin; color = base.color; picked = true; return draw(); }
    if (b.dataset.prelock) { import('./dialog.js?v=10').then(m => m.toast('🔒 Mẫu này có linh kiện cấp ' + b.dataset.prelock + ' mới mở — chơi thêm để mở khoá', 2800)).catch(() => {}); return; }
    if (b.dataset.skin) { skin = b.dataset.skin; return draw(); }
    if (b.dataset.color) { color = b.dataset.color; return draw(); }
    if (b.dataset.a === 'save') { setAv({ ...pickChar(base), skin, color, sex, e: 'ch' }); close(); import('./dialog.js?v=10').then(m => m.toast('Đã lưu nhân vật ✨', 2200)).catch(() => {}); return; }
    if (b.dataset.a === 'skip') return close();
  });
  addEventListener('keydown', key, true);
  draw(); document.body.append(ov);
}

/* nhãn phân biệt thành tích: ver=true → máy chủ công nhận, ver=false → chỉ có trên máy này, ver=null → chưa có số máy chủ nên không ghi nhãn */
/* thẻ thành tích: data-i* để ℹ️ chạm (mobile) / rê chuột + focus (desktop) hiện cách nhận (xem bindInfo) */
const achCard = (x, ok, of, ver = null) => {
  const prog = of ? ` (${Math.min(of[0], of[1])}/${of[1]})` : '';
  const verTx = ok && ver === true ? ' · ✅ đã kiểm chứng' : ok && ver === false ? ' · 💻 chỉ ở máy này' : '';
  const how = x.desc + prog + (x.soon ? ' · sắp có' : '') + (ok ? verTx : ' — chưa mở, chơi tiếp để mở');
  const state = ok ? '✅ Đã mở' : (x.soon ? '🔒 Sắp có' : '🔒 Chưa mở');
  return `<div class="pf-a ${ok ? 'yes' : 'no'}${x.soon ? ' soon' : ''}" tabindex="0" role="button" data-iicon="${esc(x.icon)}" data-iname="${esc(x.name)}" data-ihow="${esc(how)}" data-istate="${esc(state)}"><i>${x.icon}</i><span><b>${esc(x.name)}</b><small>${esc(x.desc)}${of ? ` (${Math.min(of[0], of[1])}/${of[1]})` : ''}${x.soon ? ' · sắp có' : ''}${ok && ver === true ? ' · ✅ đã kiểm chứng' : ok && ver === false ? ' · 💻 chỉ ở máy này' : ''}</small></span></div>`;
};
/* 5 mẫu thành tích theo game (stats.js TPL, id `<mẫu>-<game>`): gộp thành 1 thẻ mỗi mẫu ở mục chung, ghi đạt ở mấy game */
const TPL5 = [
  { id: 'g-first', icon: '🎮', name: 'Khởi Đầu Huyền Thoại', desc: 'Chơi xong ván đầu tiên' },
  { id: 'g-w5', icon: '😆', name: 'Ngũ Liên Thắng', desc: 'Thắng 5 ván' },
  { id: 'g-w25', icon: '📈', name: 'Thăng Cấp Thần Tốc', desc: 'Thắng 25 ván' },
  { id: 'g-w50', icon: '🏆', name: 'Cao Thủ Sảnh', desc: 'Thắng 50 ván' },
  { id: 'g-w100', icon: '👑', name: 'Vô Địch', desc: 'Thắng 100 ván' },
  { id: 'g-l10', icon: '💀', name: 'Thập Tử Nhất Sinh', desc: 'Thua 10 ván (vẫn chơi tiếp)' },
  { id: 'g-s3', icon: '🔥', name: 'Tam Liên Thắng', desc: 'Thắng 3 ván liên tiếp' },
  { id: 'g-p50', icon: '🕹️', name: 'Chơi Hoài Không Chán', desc: 'Chơi 50 ván' },
];
const isTpl = x => TPL5.some(t => x.id.startsWith(t.id + '-'));

/* ACHS gộp cả thành tựu riêng từng game (SPECIAL): id có gạch ngang, trừ mẫu g-* và chung c-* */
const isSpecial = x => !isTpl(x) && !x.id.startsWith('c-') && x.id.includes('-');
/* tiền tố id SPECIAL → game (khớp bảng SPECIAL ở shared/ui/achs.js; đã kiểm 126/126 id) */
const SP_GAME = [['thathaythach', 'thathaythach'], ['tamquoc', 'tamquoc'], ['khaihoang', 'khaihoang'], ['xuyenviet', 'xuyenviet'], ['daochinh', 'daochinh'], ['solitaire', 'solitaire'], ['bantau', 'bantau'], ['oanquan', 'oanquan'], ['tienlen', 'tienlen'], ['xidach', 'xidach'], ['cotuong', 'cotuong'], ['meono', 'meono'], ['bacao', 'bacao'], ['catte', 'catte'], ['typhu', 'typhu'], ['cuuho', 'cuuho'], ['xiecthu', 'xiecthu'], ['baucua', 'baucua'], ['noitu', 'noitu'], ['covua', 'covua'], ['cothu', 'cothu'], ['baitan', 'baitan'], ['tusac', 'tusac'], ['masoi', 'masoi'], ['ms', 'masoi'], ['bang', 'bang'], ['uno', 'uno'], ['meo', 'meono'], ['tqs', 'tamquoc'], ['tl', 'tienlen'], ['xd', 'xidach'], ['ct', 'cotuong'], ['tht', 'thathaythach'], ['btau', 'bantau'], ['bt', 'baitan'], ['loto', 'loto'], ['cv', 'covua'], ['tala', 'tala'], ['ts', 'tusac'], ['oaq', 'oanquan'], ['caro', 'caro'], ['sam', 'sam'], ['bc', 'baucua'], ['nt', 'noitu'], ['xv', 'xuyenviet'], ['kh', 'khaihoang'], ['dc', 'daochinh'], ['ch', 'cuuho'], ['xt', 'xiecthu'], ['giandiep', 'giandiep'], ['gd', 'giandiep'], ['codam', 'codam'], ['cd', 'codam'], ['lieng', 'lieng'], ['lg', 'lieng'], ['maubinh', 'maubinh'], ['mb', 'maubinh'], ['xito', 'xito'], ['colat', 'colat'], ['domino', 'domino']];
const spGame = id => { for (const [p, g] of SP_GAME) if (id.startsWith(p + '-')) return g; return null; };
/* 🏅 thành tích riêng từng game: chỉ hiện cái đã mở, gộp theo game (game đã chơi mở sẵn, game chưa chơi gập lại) */
function achGames(s, srvA = null) {
  const byGame = {};
  for (const x of ACHS) { if (!isSpecial(x) || !s.ach[x.id]) continue; const g = spGame(x.id); if (!g) continue; (byGame[g] = byGame[g] || []).push(x); }
  const keys = Object.keys(byGame).sort((a, b) => ((s.g[b] || {}).p || 0) - ((s.g[a] || {}).p || 0));
  return `<div class="pf-achg">${keys.map(g => `<details><summary>${esc(GAME_NAMES[g])} <small>${byGame[g].length}</small></summary><div class="pf-ach">${byGame[g].map(x => achCard(x, true, null, srvA ? srvA.has(x.id) : null)).join('')}</div></details>`).join('')}</div>`;
}
/* thành tựu ẩn tới khi mở được – chỉ đếm số còn bí mật (mẫu tính 1 cái mỗi mẫu, thành tựu 'sắp có' không tính) */
function achSecret(s) {
  let n = 0; const tplDone = new Set();
  for (const x of ACHS) {
    const m = /^g-(first|w5|w25|w50|w100|l10|s3|p50)-/.exec(x.id);
    if (m) { if (s.ach[x.id]) tplDone.add(m[1]); continue; }
    if (!s.ach[x.id] && !x.soon) n++;
  }
  return n + (TPL5.length - tplDone.size);
}
/* 🕒 Trận gần đây (patch -100): 3 game MỚI CHƠI NHẤT — xếp theo last (lần chơi gần nhất) giảm dần, chỉ tính game đã chơi (p>0); game p=0 (dù last>0) và last=0 đều không tính */
export function recentGames(gObj, n = 3) {
  return Object.entries(gObj || {}).filter(([, v]) => v && v.p).sort((x, y) => (y[1].last || 0) - (x[1].last || 0)).slice(0, n);
}
/* ---------- hồ sơ (patch -150): vẽ vào một phần tử cho trước ----------
   renderProfileInto(ov, isPage): trang riêng /hoso/ (isPage=true) và modal cũ dùng chung logic
   render — kể cả tab Khung -147 (bộ lọc/sắp xếp/toggle + rồng) tái dùng nguyên vẹn. */
function renderProfileInto(ov, isPage) {
  const onSync = () => { if (ov.isConnected) draw(); }, close = () => { if (isPage) return; ov.remove(); removeEventListener('keydown', key, true); removeEventListener('gumballz-stats-sync', onSync); removeEventListener('gumballz-wallet', onSync); }, key = e => { if (e.key === 'Escape' && !document.querySelector('.dg-ov')) { e.stopPropagation(); close(); } };
  let picking = false, tab = 'ch', sub = 'pre', srv = null, curSt = {} /* { rank, created } từ máy chủ – để tính danh hiệu Top / Thành viên đời đầu */;
  /* 🔍 lọc tab Khung (patch -147): mặc định hiện HẾT khung, sắp Cùi → VIP, toggle đã-sở-hữu TẮT (user dặn 2026-11-22 ~09:51) */
  let fCat = 'all', fTheme = 'all', fOwned = false, fSort = 'cui-vip';
  /* 🔍 lọc tab Banner (patch -151): giống tab Khung, trạng thái ĐỘC LẬP với lọc khung */
  let bCat = 'all', bTheme = 'all', bOwned = false, bSort = 'cui-vip';
  const selectTitle = id => { ls.set('gumballz-title', id); ls.set('gumballz-title-t', String(Date.now())); try { dispatchEvent(new CustomEvent('gumballz-title')); } catch (x) {} draw(); };
  /* ℹ️ gắn bong bóng thông tin (chạm mobile / rê chuột + focus desktop) cho mọi thành tích + danh hiệu trong hộp này */
  const bindInfo = () => {
    ov.querySelectorAll('[data-iname]').forEach(el => {
      attachInfo(el, () => ({ icon: el.dataset.iicon || 'ℹ️', name: el.dataset.iname, how: el.dataset.ihow, state: el.dataset.istate || '', action: el.dataset.tt ? { label: 'Trưng danh hiệu này', fn: () => selectTitle(el.dataset.tt) } : null }), el.dataset.tt ? { onActivate: () => selectTitle(el.dataset.tt) } : {});
    });
  };
  const draw = () => {
    const s = load(), t = totals(s), lv = level(t), name = (ls.get('gumballz-name') || '').trim() || 'Người chơi', a = avatar();
    const w = loadWallet(); /* 💰 ví xu */
    const srvT = serverTotals(), verT = verifiedTotals(), srvA = srvT ? new Set(serverAch()) : null; /* số máy chủ (đã xác minh + mốc cũ) – chỉ có khi đã đăng nhập + đồng bộ */
    const nt = srvT || t; /* số hiện ở hồ sơ: ưu tiên số máy chủ, chưa có thì số trên máy này */
    const verN = srvA ? [...srvA].filter(id => s.ach[id]).length : 0; /* thành tích đã mở mà máy chủ cũng công nhận */
    const flags = readAuthFlags(); /* { admin, owner, id, created } của tài khoản đang đăng nhập trên máy này */
    let hasAcc = false; try { hasAcc = !!JSON.parse(ls.get('gumballz-auth') || 'null'); } catch (e) {}
    const achN = Object.keys(s.ach || {}).length, pct = lv.to ? Math.round((lv.xp - lv.from) / (lv.to - lv.from) * 100) : 100;
    const games = recentGames(srvT ? srvT.g : s.g); /* 🕒 3 game mới chơi nhất (patch -100) — trước đây xếp theo số ván chơi nhiều nhất */
    const st = { ...statOf(s, srv || {}), admin: flags.owner /* khoá 'admin' = đồ riêng chủ sảnh */ };
    /* 🏆 tiến độ vật phẩm VIP (patch -143): P.vipTop theo hồ sơ máy chủ về (loadServer lưu toàn bộ P ở lần đồng bộ), hạng từ srv.rank */
    const vnToday = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); /* ngày VN 'YYYY-MM-DD' */
    const vipTop = loadServer()?.vipTop || null;
    const vipRows = vipProgress(vipTop, (srv && srv.rank) || 0, vnToday());
    const ust = statsFromTotals(t, { created: (srv && srv.created) || 0, rank: (srv && srv.rank) || 0, admin: flags.owner, vip: vipTop }); /* khoá og/top10 dùng ngày lập tài khoản + hạng BXH thật; khoá vip1..vip5 dùng chuỗi P.vipTop */
    /* 🎉 toast 1 lần khi vừa mở khoá món VIP mới (so với danh sách đã thấy trên máy này) */
    try {
      const got = Array.isArray(vipTop && vipTop.got) ? vipTop.got : [];
      const seen = JSON.parse(ls.get('gumballz-vip-seen') || '[]');
      const fresh = got.filter(id => !seen.includes(id));
      if (fresh.length) {
        ls.set('gumballz-vip-seen', JSON.stringify([...new Set([...seen, ...fresh])]));
        const names = fresh.map(id => (VIP_TIERS.find(x => x.id === id) || {}).name || id).join(', ');
        import('./dialog.js?v=10').then(m => m.toast('🎉 Mở khoá vật phẩm VIP: ' + names + ' — vào tab Khung/Kiểu chữ để mặc thử!', 4200)).catch(() => {});
      }
    } catch (e) {}
    const tts = titlesOf(st), look = { ...a, ...(cleanLook({ ...a, ch: a.ch }, st, undefined, loadWallet().own) || {}) }, cur = pickTitle(tts, ls.get('gumballz-title')), locked = ALL_TITLES.filter(x => !tts.some(y => y.id === x.id) && !(x.id.startsWith('top') && !hasAcc));
    curSt = ust;
    const rate = nt.p ? Math.round(nt.w / nt.p * 100) : 0; /* 🎯 tỉ lệ thắng (patch -152, dashboard chỉ số) */
    const keepY = ov.querySelector('.pf-box') ? ov.querySelector('.pf-box').scrollTop : 0; /* vẽ lại (chọn danh hiệu, đổi hình…) không nhảy về đầu, không chạy lại hiệu ứng mở – trước đây trông như chớp */
    if (ov.querySelector('.pf-box')) ov.classList.add('pf-shown');
    ov.innerHTML = `<div class="pf-box"${isPage ? '' : ' role="dialog" aria-modal="true"'} aria-label="Hồ sơ của bạn">${isPage ? '' : '<button class="pf-x" aria-label="Đóng">✕</button>'}
      <div class="pf-sheet"><aside class="pf-rail"><div class="pf-idcard">${bannerHTML(look.b)}<div class="pf-idbody"><button type="button" data-a="pick" aria-label="Đổi hình đại diện">${avatarHTML(160, look)}</button><div class="pf-name${nameClass({ ...look, n: look.n || (flags.owner ? 'owner' : '') })}${flags.owner ? ' pf-ownnm' : ''}" style="${nameStyle({ ...look, n: look.n || (flags.owner ? 'owner' : '') })}">${esc(name)}</div>${flags.owner || flags.role === 2 || flags.role === 1 || flags.supporter || flags.vip || flags.dev || (lv.lv === 1 && !flags.owner && flags.role === 0) ? `<div class="bdg-row">${ownerBadge(flags.owner, 'mini')}${!flags.owner && flags.role === 2 ? adminBadge(true, 'mini') : ''}${!flags.owner && flags.role === 1 ? modBadge(true, 'mini') : ''}${supporterBadge(flags.supporter, 'mini')}${vipBadge(flags.vip, 'mini')}${devBadge(flags.dev, 'mini')}${newbieBadge(lv.lv === 1 && !flags.owner && flags.role === 0, 'mini')}</div>` : ''}<div class="pf-sub">${hasAcc ? `Cấp ${lv.lv} · ${lv.name}${a.sex === 'nu' ? ' · 👩 Nữ' : a.sex === 'nam' ? ' · 🧑 Nam' : ''}` : 'Khách chưa đăng nhập'}</div>${cur ? `<div style="margin-top:4px"><span class="pf-tt" tabindex="0" data-iicon="${esc(cur.icon)}" data-iname="${esc(cur.name)}" data-ihow="${esc(cur.game ? `Thắng ${GAME_WINS} ván ${GAME_NAMES[cur.game] || cur.game}` : cur.desc)}" data-istate="✅ Đã đạt · đang trưng">${cur.icon} ${esc(cur.name)}</span></div>` : ''}
      <div class="pf-lv"><b>${lv.to ? `${lv.xp - lv.from} / ${lv.to - lv.from} điểm tới cấp ${lv.lv + 1}` : 'Đã đạt cấp cao nhất 👑'}</b><div class="pf-bar"><i style="width:${pct}%"></i></div></div></div></div>
      <div class="pf-dash"><div><b>${nt.p}</b><small>🎲 Trận đã chơi</small></div><div><b>${nt.w}</b><small>🏆 Trận thắng</small></div><div><b>${rate}%</b><small>🎯 Tỉ lệ thắng</small></div><div><b>${nt.best || 0}</b><small>🔥 Chuỗi tốt nhất</small></div><div class="xu"><b>${fmt(w.xu)}</b><small>🪙 Xu hiện có</small></div></div>
      <div class="pf-acts"><button type="button" class="pf-act-y" data-a="pick">Đổi tên và avatar</button><button type="button" class="pf-act-w" data-a="shop">Đến cửa hàng</button></div>
      </aside>
      <div class="pf-main">
      ${picking ? picker(a, ust, tab, name, sub, { cat: fCat, theme: fTheme, owned: fOwned, sort: fSort }, { cat: bCat, theme: bTheme, owned: bOwned, sort: bSort }) : ''}
      <p class="pf-note" style="margin:6px 0 0;text-align:left">${srvT ? `✅ Số máy chủ đã công nhận${verT ? ` (trong đó ${verT.p} ván đã xác minh)` : ''} · trên máy này: ${t.p} ván, ${t.w} thắng.` : 'Số trên máy này – đăng nhập để đồng bộ lên máy chủ.'}</p>
      <button type="button" data-a="rank" style="width:100%;border:2px solid var(--ink);border-radius:12px;padding:10px 14px;margin-bottom:4px;font:800 14.5px 'Baloo 2',Nunito,sans-serif;color:var(--on-accent);background:var(--y1);cursor:pointer;box-shadow:var(--sh-sm)">🏆 Xem Bảng xếp hạng toàn server ▶</button>
      <div class="pf-vip"><h3>👑 Vật phẩm VIP <small>mở bằng top BXH</small></h3>
      <p class="pf-note" style="margin:6px 0 8px;text-align:left">${hasAcc ? `Hạng hiện tại: ${(srv && srv.rank) ? '#' + srv.rank : 'chưa có — chơi 1 ván để lên BXH'}. Giữ hạng top liên tục mỗi ngày để mở khoá — rớt khỏi top hoặc bỏ 1 ngày không đồng bộ là chuỗi về 0. Đồng bộ chạy tự động mỗi khi mở web / chơi xong 1 ván.` : 'Đăng nhập để mở khoá vật phẩm VIP theo top BXH — càng giữ top lâu, món càng hiếm.'}</p>
      <div>${vipRows.map(r => {
        const pct = Math.min(100, Math.round(r.streak / r.days * 100));
        const status = r.got ? '✅ Đã nhận — vào tab Khung/Kiểu chữ để mặc thử' : r.streak >= r.days ? '✅ Đủ điều kiện — nhận sau lần đồng bộ tới' : `Chuỗi ${r.streak}/${r.days} ngày · còn ${r.left} ngày nữa${r.todayCounts ? ' · đang trong top hôm nay, đồng bộ để +1 ngày' : ''}${!r.inTop && (srv && srv.rank) ? ` · hạng hiện tại #${srv.rank} (cần Top ${r.top})` : ''}`;
        return `<div style="display:flex;gap:10px;align-items:center;padding:10px 12px;margin-bottom:8px;border:2px solid ${r.got ? '#e0a612' : 'var(--ink)'};border-radius:14px;background:var(--card);box-shadow:var(--sh-sm)"><span style="font-size:26px;line-height:1">${r.icon}</span><div style="flex:1;min-width:0"><b>${esc(r.name)}</b> <small>Top ${r.top} liên tục ${r.days} ngày</small><div class="pf-bar"><i style="width:${r.got ? 100 : pct}%"></i></div><small>${esc(status)}</small></div></div>`;
      }).join('')}</div></div>
      <h3>🎖️ Danh hiệu <small>${tts.length} đã đạt</small></h3>
      <div class="pf-tts">${tts.map(x => `<button type="button" class="pf-tt" data-tt="${x.id}" aria-pressed="${!!cur && cur.id === x.id}" data-iicon="${esc(x.icon)}" data-iname="${esc(x.name)}" data-ihow="${esc(x.game ? `Thắng ${GAME_WINS} ván ${GAME_NAMES[x.game] || x.game}` : x.desc)}" data-istate="✅ Đã đạt">${x.icon} ${esc(x.name)}</button>`).join('')}</div>
      ${locked.length ? `<details style="margin:8px 0 0"><summary style="cursor:pointer;font-weight:800;color:var(--muted);padding:4px 0">🔒 ${locked.length} danh hiệu chưa đạt — chạm để xem</summary><div class="pf-tts" style="margin-top:6px">${locked.map(x => `<span class="pf-tt no" tabindex="0" role="button" data-iicon="${esc(x.icon)}" data-iname="${esc(x.name)}" data-ihow="${esc(x.desc)}" data-istate="🔒 Chưa đạt"><i>${x.icon}</i> ${esc(x.name)}</span>`).join('')}</div></details>` : ''}
      <p class="pf-note" style="margin:8px 0 0;text-align:left">${tts.length ? 'Chạm vào danh hiệu để xem cách nhận (trên máy tính thì rê chuột vào); danh hiệu đã đạt thì bấm “Trưng danh hiệu này” trong bảng để trưng cạnh tên bạn.' : 'Chơi và thắng thêm để mở danh hiệu — chạm vào danh hiệu chưa đạt để xem cách nhận.'} Thắng ${GAME_WINS} ván ở một game còn có danh hiệu riêng của game đó.${hasAcc ? '' : ' Đăng nhập thì người khác mới thấy danh hiệu của bạn.'}</p>
      <h3>🏅 Thành tích <small>${achN} đã mở${srvT ? ` · ${verN} đã kiểm chứng` : ''}</small></h3>
      <div class="pf-ach">${TPL5.map(tp => { const gs = Object.keys(GAME_NAMES).filter(g => s.ach[`${tp.id}-${g}`]); return gs.length ? achCard({ ...tp, desc: `${tp.desc} ở một game · đạt ở ${gs.length} game: ${gs.slice(0, 4).map(g => GAME_NAMES[g]).join(', ')}${gs.length > 4 ? '…' : ''}` }, true, null, srvA ? gs.some(g => srvA.has(`${tp.id}-${g}`)) : null) : ''; }).join('')}${ACHS.filter(x => !isTpl(x) && !isSpecial(x) && s.ach[x.id]).map(x => achCard(x, true, null, srvA ? srvA.has(x.id) : null)).join('')}</div>
      <p class="pf-note" style="margin:8px 0 0;text-align:left">🔒 Còn ${achSecret(s)} thành tích bí mật – chơi tiếp rồi sẽ lộ ra 👀${srvT ? ' Thành tích “✅ đã kiểm chứng” là máy chủ đã thấy tận mắt (ván online do máy chủ giữ); “💻 chỉ ở máy này” là chưa đồng bộ lên máy chủ (đấu máy / chơi đơn sẽ lên sau khi đồng bộ).' : ''}</p>
      ${achGames(s, srvA)}
      <h3>🕒 Trận gần đây <small>mới chơi nhất</small></h3>
      ${games.length ? `<div class="pf-recent">${games.slice(0, 3).map(([g, v]) => `<div class="pf-rc"><span class="pf-rc-n">${esc(GAME_NAMES[g] || g)}</span><small>${v.p} ván · ${v.w || 0} thắng</small><a class="pf-rc-go" href="${gameURL(g)}">Chơi</a></div>`).join('')}</div>` : '<div class="pf-empty">Chưa có ván nào. Chơi xong một ván là có số liệu ở đây liền nha 🎲</div>'}
      <p class="pf-note">Mỗi ván +10 điểm, thắng +20 điểm nữa. ${hasAcc ? 'Hồ sơ đã gắn với tài khoản – đăng nhập ở máy khác là thấy lại.' : 'Hồ sơ lưu trên máy này – đổi máy hoặc xoá dữ liệu trình duyệt là mất. Đăng nhập để giữ lại nha.'}</p></div></div></div>`;
    if (keepY) ov.querySelector('.pf-box').scrollTop = keepY;
    bindInfo(); /* ℹ️ gắn lại bong bóng thông tin sau mỗi lần vẽ lại */
    attachBadgeTilt(ov.querySelector('.bdg-row')); /* 🎖️ nghiêng 3D + vệt sáng theo con trỏ ở khu vực huy hiệu (patch -142) */
    try { initBanners(ov); } catch (e) {} /* 🎏 đăng ký canvas rồng + tắt animation banner ngoài màn hình (patch -151) */
  };
  ov.addEventListener('click', e => {
    if (e.target === ov || e.target.closest('.pf-x')) return close();
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.a === 'pick') { picking = !picking; return draw(); }
    if (b.dataset.tt) { selectTitle(b.dataset.tt); return; }
    if (b.dataset.a === 'rank') { location.href = rankURL(); return; } /* 🏆 sang trang BXH riêng /xephang/ (patch -150) */
    if (b.dataset.a === 'shop') { close(); location.href = shopURL(); return; } /* 🛍️ Cửa hàng */
    if (b.dataset.shopgo) { close(); location.href = shopURL(); return; } /* khung/màu tên bán bằng xu: sang Cửa hàng mua */
    if (b.dataset.lock) { import('./dialog.js?v=10').then(m => m.toast('🔒 ' + b.dataset.lock + ' để mở khoá', 2600)).catch(() => {}); return; }
    if (b.dataset.tab) { tab = b.dataset.tab; return draw(); }
    if (b.dataset.fcat != null) { fCat = b.dataset.fcat; return draw(); } /* 🔍 lọc khung theo nhóm (patch -147) */
    if (b.dataset.fowned != null) { fOwned = !fOwned; return draw(); } /* 🔍 chỉ hiện khung đã sở hữu (patch -147) */
    if (b.dataset.bcat != null) { bCat = b.dataset.bcat; return draw(); } /* 🔍 lọc banner theo nhóm (patch -151) */
    if (b.dataset.bowned != null) { bOwned = !bOwned; return draw(); } /* 🔍 chỉ hiện banner đã sở hữu (patch -151) */
    if (b.dataset.sub) { sub = b.dataset.sub; return draw(); }
    if (b.dataset.a === 'rnd') { const ok = PRESETS.filter(p => charOpen(p, curSt)); const r = { ...ok[Math.floor(Math.random() * ok.length)] }; for (const k of CH_KEYS) { const list = OPTIONS[k].filter(o => !charLock(k, Array.isArray(o) ? o[0] : o)); if (Math.random() < .35) { const o = list[Math.floor(Math.random() * list.length)]; r[k] = Array.isArray(o) ? o[0] : o; } } setAv({ ...cleanChar(r), e: 'ch' }); return draw(); }
    if (b.dataset.a === 'emoji') { tab = 'emoji'; return draw(); }
    if (b.dataset.pre != null) { setAv({ ...cleanChar(PRESETS[+b.dataset.pre]), e: 'ch' }); return draw(); }
    if (b.dataset.k) { const a = avatar(); setAv({ ...(a.ch || cleanChar(PUB[0])), [b.dataset.k]: b.dataset.v, e: 'ch' }); return draw(); }
    if (b.dataset.f != null) { setAv({ f: b.dataset.f }); return draw(); }
    if (b.dataset.n != null) { setAv({ n: b.dataset.n }); return draw(); }
    if (b.dataset.nf != null) { setAv({ nf: b.dataset.nf }); return draw(); } /* ✍️ chọn font chữ tên (patch -154) */
    if (b.dataset.ne != null) { setAv({ ne: b.dataset.ne }); return draw(); } /* ✨ chọn hiệu ứng chữ tên (patch -154) */
    if (b.dataset.b != null) { setAv({ b: b.dataset.b }); return draw(); }
    if (b.dataset.fx) { ls.set('gumballz-winfx', b.dataset.fx); import('./winfx.js?v=1').then(m => m.playWin(b.dataset.fx, true)).catch(() => {}); return draw(); }
    if (b.dataset.e || b.dataset.c) { setAv({ e: b.dataset.e || avatar().e, ...(b.dataset.c != null ? { c: +b.dataset.c } : {}) }); draw(); }
  });
  ov.addEventListener('change', e => { const s = e.target.closest('select[data-fsel],select[data-bsel]'); if (!s) return; if (s.dataset.fsel === 'theme') fTheme = s.value; else if (s.dataset.fsel === 'sort') fSort = s.value; else if (s.dataset.bsel === 'theme') bTheme = s.value; else if (s.dataset.bsel === 'sort') bSort = s.value; draw(); }); /* 🔍 lọc khung theo chủ đề / sắp xếp bậc (patch -147) + lọc banner (patch -151) */
  if (!isPage) addEventListener('keydown', key, true); addEventListener('gumballz-stats-sync', onSync); addEventListener('gumballz-wallet', onSync); draw(); if (!isPage) document.body.append(ov);
  /* có tài khoản: hỏi máy chủ thứ hạng + ngày lập tài khoản để tính đủ danh hiệu (GET /profile/<id> trả rank + created) */
  try {
    const u = JSON.parse(ls.get('gumballz-auth') || 'null'); const id = u && u.user && u.user.id;
    if (id) import('../net/api.js?v=29').then(m => m.memberProfile(id).then(r => { if (r && r.ok && r.user && ov.isConnected) { srv = { rank: r.user.rank, created: r.user.created }; draw(); } }).catch(() => {})).catch(() => {});
  } catch (e) {}
}

/* patch -150: Hồ sơ giờ là trang riêng /hoso/ — không mở modal nữa. Giữ export để code cũ
   (topbar/account/settings/member/homebtn) gọi tới vẫn đúng: chuyển trang. */
export function openProfile() {
  location.href = new URL('../../hoso/', import.meta.url).href;
}

/* Vẽ hồ sơ vào một phần tử trên trang /hoso/ (không phải modal) — tái dùng nguyên vẹn logic render
   (kể cả tab Khung -147: bộ lọc/sắp xếp/toggle + rồng dragon-frame.js). */
export function mountProfilePage(rootEl) {
  if (!rootEl) return;
  profileCss();
  rootEl.classList.add('pf-page');
  renderProfileInto(rootEl, true);
}
