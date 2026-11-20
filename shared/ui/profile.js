// 🏅 Hồ sơ người chơi: nhân vật chibi 3D, cấp độ, danh hiệu (shared/titles.js – chạm để chọn cái trưng ra),
// lộ trình thưởng / khung / màu tên / hiệu ứng thắng (shared/js/avatar-rewards.js), thống kê từng game, thành tích.
// Dữ liệu ở shared/ui/stats.js (lưu trên máy này). Thành tích mẫu gộp thành 1 thẻ mỗi mẫu, thành tựu riêng
// từng game hiện trong mục gập theo game, thành tựu chưa mở chỉ đếm số (ẩn tới khi mở).
// import { openProfile, avatarHTML } from '…/shared/ui/profile.js?v=45'
import { load, totals, level, ACHS, GAME_NAMES, serverTotals, verifiedTotals, serverAch } from './stats.js?v=85';
import { statOf, titlesOf, pickTitle, ALL_TITLES, GAME_WINS } from '../titles.js?v=3';
import { loadWallet, fmt, owns, widOf, shopURL } from './wallet.js?v=1'; /* 💰 Ví xu */
import { attachInfo } from './infopop.js?v=1'; /* ℹ️ chạm (mobile) / rê chuột (desktop) vào thành tích, danh hiệu để xem cách nhận */
import { cleanLook, charOpen, charLock, TRACK, xpOf, FRAMES, NAME_COLORS, WIN_FX, isOpen, FRAME_RING, lockDesc, statsFromTotals, readAuthFlags } from '../js/avatar-rewards.js';
import { OPTIONS, PRESETS, GROUPS, cleanChar, adminOnly, FUR } from '../js/avatar-opts.js';
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
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
  const base = av && typeof av === 'object' ? { c: Math.max(0, +av.c || 0), f: FRAMES.some(x => x.id && x.id === av.f) ? av.f : '', n: NAME_COLORS.some(x => x.id && x.id === av.n) ? av.n : '' } : { c: Math.abs(seed) % BG.length };
  if (av && av.ch && typeof av.ch === 'object' && av.ch.kind) return { ...base, ch: cleanChar(av.ch) };
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
  const inner = `<span class="pf-av${cls}" style="width:${in_}px;height:${in_}px;font-size:${Math.round(in_ * .56)}px;background:${ch ? (ring ? '#fffaf3' : 'transparent') : bg}${ring ? ';box-shadow:0 0 0 1.5px #fff' : ''}">${body}</span>`; /* nhân vật 3D: nền trong suốt */
  return ring ? `<span class="pf-fr" style="width:${size}px;height:${size}px;padding:${pad}px;background:${ring}">${inner}</span>` : inner;
}
/* huy hiệu chủ web – chỉ khi là tài khoản chủ web (id 1, xem shared/js/avatar-rewards.js isOwner) */
export const ownerBadge = on => on ? '<span class="pf-own" title="Người làm ra GumballZ Boardgame">👑 Chủ web</span>' : '';
/* màu tên đã mở (thuộc tính style) */
export const nameStyle = n => { const c = NAME_COLORS.find(x => x.id && x.id === n); return c ? c.css : ''; };
/* CSS diện mạo ở shared/css/avatar.css (nạp bằng <link>), gồm cả pill danh hiệu (.pf-tt/.pf-tts) */
export function profileCss() {
  if (document.getElementById('pf-css')) return;
  const l = document.createElement('link'); l.id = 'pf-css'; l.rel = 'stylesheet';
  try { l.href = new URL('../css/avatar.css', import.meta.url).href; } catch (e) { l.href = '../css/avatar.css'; }
  document.head.append(l);
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function setAv(patch) {
  const a = avatar(), base = a.ch ? { ...a.ch, e: 'ch' } : { e: a.e };
  const n = { ...base, c: +a.c || 0, f: a.f || '', n: a.n || '', ...patch, t: Date.now() };
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
function picker(a, st, tab, name, sub = 'pre') {
  const TABS = [['ch', '🧸 Nhân vật'], ['track', '🎁 Lộ trình thưởng'], ['frame', '🖼️ Khung'], ['name', '✍️ Màu tên'], ['fx', '🎉 Khi thắng']];
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
          const l = charLock(k, o[0]), lk = l && !isOpen(l, st); if (l === 'admin' && lk) return ''; /* đồ riêng của chủ web: người khác không thấy luôn */
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
  else if (tab === 'frame') body = `<div class="lk-grid">${FRAMES.map(x => { const shopLk = x.shop && !owns(widOf('frame', x.id)), chestLk = x.chest && !owns(widOf('frame', x.id)), lk = (x.lock && !isOpen(x.lock, st)) || shopLk || chestLk; const lkTx = x.shop ? `Mua ${x.shop} xu ở Cửa hàng` : x.chest ? 'Chỉ mở ra từ rương Gacha (100 xu/rương)' : lockDesc(x.lock); return `<button type="button" class="lk-card${lk ? ' lock' : ''}" ${lk ? `data-lock="${esc(lkTx)}"${x.shop ? ' data-shopgo="1"' : ''}` : `data-f="${x.id}"`} aria-pressed="${(a.f || '') === x.id}">${avatarHTML(54, { ...a, f: x.id })}<span>${lk ? '🔒 ' : ''}${esc(x.name)}</span>${lk ? `<small>${esc(lkTx)}</small>` : ''}</button>`; }).join('')}</div>`;
  else if (tab === 'name') body = `<div class="lk-grid">${NAME_COLORS.map(x => { const shopLk = x.shop && !owns(widOf('color', x.id)), chestLk = x.chest && !owns(widOf('color', x.id)), lk = (x.lock && !isOpen(x.lock, st)) || shopLk || chestLk; const lkTx = x.shop ? `Mua ${x.shop} xu ở Cửa hàng` : x.chest ? 'Chỉ mở ra từ rương Gacha (100 xu/rương)' : lockDesc(x.lock); return `<button type="button" class="lk-card${lk ? ' lock' : ''}" ${lk ? `data-lock="${esc(lkTx)}"${x.shop ? ' data-shopgo="1"' : ''}` : `data-n="${x.id}"`} aria-pressed="${(a.n || '') === x.id}"><span class="lk-nm" style="${x.css || ''}">${esc(name)}</span><span>${lk ? '🔒 ' : ''}${esc(x.name)}</span>${lk ? `<small>${esc(lkTx)}</small>` : ''}</button>`; }).join('')}</div>`;
  else if (tab === 'fx') { const cur = ls.get('gumballz-winfx') || 'giay'; body = `<p class="pf-note" style="margin:0 0 8px;text-align:left">Hiện trên màn hình của bạn mỗi khi thắng ván. Chạm để chọn và xem thử.</p><div class="lk-grid">${WIN_FX.map(x => { const lk = x.lock && !isOpen(x.lock, st); return `<button type="button" class="lk-card${lk ? ' lock' : ''}" ${lk ? `data-lock="${esc(lockDesc(x.lock))}"` : `data-fx="${x.id}"`} aria-pressed="${cur === x.id}"><span style="font-size:28px;line-height:1">${x.icon}</span><span>${lk ? '🔒 ' : ''}${esc(x.name)}</span>${lk ? `<small>${esc(lockDesc(x.lock))}</small>` : ''}</button>`; }).join('')}</div>`; }
  const hint = tab === 'frame' || tab === 'name' ? '<p class="pf-note" style="margin:8px 0 0;text-align:left">Khung và màu tên mở khoá theo thành tích, mua bằng xu ở Cửa hàng, hoặc mở ra từ rương Gacha. Đăng nhập thì người khác thấy ở hồ sơ, bảng xếp hạng và thẻ người chơi trong phòng.</p>' : '';
  return `<div class="lk-tabs" role="tablist">${TABS.map(([id, t]) => `<button type="button" role="tab" data-tab="${id}" aria-pressed="${tab === id || (id === 'ch' && tab === 'emoji')}">${t}</button>`).join('')}</div>${body}${hint}`;
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
  const go = d.querySelector('.go'); if (go) go.onclick = () => { clearTimeout(t); setAv({ ...a.ch, [r.k]: r.v, e: 'ch' }); bye(); import('./dialog.js?v=8').then(m => m.toast('✨ Đã mặc ' + nm, 2200)).catch(() => {}); };
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
  { id: 'g-first', icon: '🎮', name: 'Ê game này vui nè', desc: 'Chơi xong ván đầu tiên' },
  { id: 'g-w5', icon: '😆', name: 'Vui thiệt bây ơi', desc: 'Thắng 5 ván' },
  { id: 'g-w25', icon: '📈', name: 'Leo rank', desc: 'Thắng 25 ván' },
  { id: 'g-w50', icon: '🏆', name: 'Cao thủ thật sự', desc: 'Thắng 50 ván' },
  { id: 'g-w100', icon: '👑', name: 'Vô địch', desc: 'Thắng 100 ván' },
  { id: 'g-l10', icon: '💀', name: '💀', desc: 'Thua 10 ván (vẫn chơi tiếp)' },
  { id: 'g-s3', icon: '🔥', name: 'Chuỗi thắng', desc: 'Thắng 3 ván liên tiếp' },
  { id: 'g-p50', icon: '🕹️', name: 'Chơi hoài không chán', desc: 'Chơi 50 ván' },
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
  return `<div class="pf-achg">${keys.map(g => `<details open><summary>${esc(GAME_NAMES[g])} <small>${byGame[g].length}</small></summary><div class="pf-ach">${byGame[g].map(x => achCard(x, true, null, srvA ? srvA.has(x.id) : null)).join('')}</div></details>`).join('')}</div>`;
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
export function openProfile() {
  profileCss(); document.getElementById('pf-ov')?.remove();
  const ov = document.createElement('div'); ov.className = 'pf-ov'; ov.id = 'pf-ov';
  const onSync = () => { if (ov.isConnected) draw(); }, close = () => { ov.remove(); removeEventListener('keydown', key, true); removeEventListener('gumballz-stats-sync', onSync); removeEventListener('gumballz-wallet', onSync); }, key = e => { if (e.key === 'Escape' && !document.querySelector('.dg-ov')) { e.stopPropagation(); close(); } };
  let picking = false, tab = 'ch', sub = 'pre', srv = null, curSt = {} /* { rank, created } từ máy chủ – để tính danh hiệu Top / Thành viên đời đầu */;
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
    const games = Object.entries(srvT ? srvT.g : s.g).filter(([, v]) => v.p).sort((x, y) => y[1].p - x[1].p);
    const st = { ...statOf(s, srv || {}), admin: flags.owner /* khoá 'admin' = đồ riêng chủ web */ };
    const ust = statsFromTotals(t, { created: (srv && srv.created) || 0, rank: (srv && srv.rank) || 0, admin: flags.owner }); /* khoá og/top10 dùng ngày lập tài khoản + hạng BXH thật */
    const tts = titlesOf(st), look = { ...a, ...(cleanLook({ ...a, ch: a.ch }, st) || {}) }, cur = pickTitle(tts, ls.get('gumballz-title')), locked = ALL_TITLES.filter(x => !tts.some(y => y.id === x.id) && !(x.id.startsWith('top') && !hasAcc));
    curSt = ust;
    const keepY = ov.querySelector('.pf-box') ? ov.querySelector('.pf-box').scrollTop : 0; /* vẽ lại (chọn danh hiệu, đổi hình…) không nhảy về đầu, không chạy lại hiệu ứng mở – trước đây trông như chớp */
    if (ov.querySelector('.pf-box')) ov.classList.add('pf-shown');
    ov.innerHTML = `<div class="pf-box" role="dialog" aria-modal="true" aria-label="Hồ sơ của bạn"><button class="pf-x" aria-label="Đóng">✕</button>
      <div class="pf-head"><button type="button" data-a="pick" aria-label="Đổi hình đại diện">${avatarHTML(72, look)}</button><div style="min-width:0"><div class="pf-name" style="${nameStyle(look.n || (flags.owner ? 'owner' : ''))}">${esc(name)}</div>${flags.owner ? `<div>${ownerBadge(true)}</div>` : ''}<div class="pf-sub">Cấp ${lv.lv} · ${lv.name}</div>${cur ? `<div style="margin-top:4px"><span class="pf-tt" tabindex="0" data-iicon="${esc(cur.icon)}" data-iname="${esc(cur.name)}" data-ihow="${esc(cur.game ? `Thắng ${GAME_WINS} ván ${GAME_NAMES[cur.game] || cur.game}` : cur.desc)}" data-istate="✅ Đã đạt · đang trưng">${cur.icon} ${esc(cur.name)}</span></div>` : ''}</div></div>
      ${picking ? picker(a, ust, tab, name, sub) : ''}
      <div class="pf-lv"><b>${lv.to ? `${lv.xp - lv.from} / ${lv.to - lv.from} điểm tới cấp ${lv.lv + 1}` : 'Đã đạt cấp cao nhất 👑'}</b><div class="pf-bar"><i style="width:${pct}%"></i></div></div>
      <div class="pf-wal"><span>🪙 <b>${fmt(w.xu)}</b> xu</span><small>Thắng +10 xu · chơi +2 xu</small><button type="button" data-a="shop">🛍️ Cửa hàng</button></div>
      <div class="pf-nums"><div><b>${nt.p}</b><small>ván đã chơi</small></div><div><b>${nt.w}</b><small>ván thắng</small></div><div><b>${nt.p ? Math.round(nt.w / nt.p * 100) : 0}%</b><small>tỉ lệ thắng</small></div><div><b>${nt.best}</b><small>chuỗi thắng</small></div></div>
      <p class="pf-note" style="margin:6px 0 0;text-align:left">${srvT ? `✅ Số máy chủ đã công nhận${verT ? ` (trong đó ${verT.p} ván đã xác minh)` : ''} · trên máy này: ${t.p} ván, ${t.w} thắng.` : 'Số trên máy này – đăng nhập để đồng bộ lên máy chủ.'}</p>
      <button type="button" data-a="rank" style="width:100%;border:0;border-radius:14px;padding:10px 14px;margin-bottom:4px;font:800 14.5px 'Baloo 2',Nunito,sans-serif;color:#7a4300;background:linear-gradient(135deg,#fff6dc,#ffe09e);cursor:pointer;box-shadow:0 4px 12px -6px #b8780a88">🏆 Xem Bảng xếp hạng toàn server ▶</button>
      <h3>🎖️ Danh hiệu <small>${tts.length} đã đạt</small></h3>
      <div class="pf-tts">${tts.map(x => `<button type="button" class="pf-tt" data-tt="${x.id}" aria-pressed="${!!cur && cur.id === x.id}" data-iicon="${esc(x.icon)}" data-iname="${esc(x.name)}" data-ihow="${esc(x.game ? `Thắng ${GAME_WINS} ván ${GAME_NAMES[x.game] || x.game}` : x.desc)}" data-istate="✅ Đã đạt">${x.icon} ${esc(x.name)}</button>`).join('')}${locked.map(x => `<span class="pf-tt no" tabindex="0" role="button" data-iicon="${esc(x.icon)}" data-iname="${esc(x.name)}" data-ihow="${esc(x.desc)}" data-istate="🔒 Chưa đạt"><i>${x.icon}</i> ${esc(x.name)}</span>`).join('')}</div>
      <p class="pf-note" style="margin:8px 0 0;text-align:left">${tts.length ? 'Chạm vào danh hiệu để xem cách nhận (trên máy tính thì rê chuột vào); danh hiệu đã đạt thì bấm “Trưng danh hiệu này” trong bảng để trưng cạnh tên bạn.' : 'Chơi và thắng thêm để mở danh hiệu — chạm vào danh hiệu chưa đạt để xem cách nhận.'} Thắng ${GAME_WINS} ván ở một game còn có danh hiệu riêng của game đó.${hasAcc ? '' : ' Đăng nhập thì người khác mới thấy danh hiệu của bạn.'}</p>
      <h3>🏅 Thành tích <small>${achN} đã mở${srvT ? ` · ${verN} đã kiểm chứng` : ''}</small></h3>
      <div class="pf-ach">${TPL5.map(tp => { const gs = Object.keys(GAME_NAMES).filter(g => s.ach[`${tp.id}-${g}`]); return gs.length ? achCard({ ...tp, desc: `${tp.desc} ở một game · đạt ở ${gs.length} game: ${gs.slice(0, 4).map(g => GAME_NAMES[g]).join(', ')}${gs.length > 4 ? '…' : ''}` }, true, null, srvA ? gs.some(g => srvA.has(`${tp.id}-${g}`)) : null) : ''; }).join('')}${ACHS.filter(x => !isTpl(x) && !isSpecial(x) && s.ach[x.id]).map(x => achCard(x, true, null, srvA ? srvA.has(x.id) : null)).join('')}</div>
      <p class="pf-note" style="margin:8px 0 0;text-align:left">🔒 Còn ${achSecret(s)} thành tích bí mật – chơi tiếp rồi sẽ lộ ra 👀${srvT ? ' Thành tích “✅ đã kiểm chứng” là máy chủ đã thấy tận mắt (ván online do máy chủ giữ); “💻 chỉ ở máy này” là chưa đồng bộ lên máy chủ (đấu máy / chơi đơn sẽ lên sau khi đồng bộ).' : ''}</p>
      ${achGames(s, srvA)}
      <h3>🎮 Theo từng game</h3>
      ${games.length ? `<div class="pf-g">${games.map(([g, v]) => `<div>${esc(GAME_NAMES[g] || g)}</div><span>${v.p} ván</span><em>${v.w || 0} thắng</em>`).join('')}</div>` : '<div class="pf-empty">Chưa có ván nào. Chơi xong một ván là có số liệu ở đây liền nha 🎲</div>'}
      <p class="pf-note">Mỗi ván +10 điểm, thắng +20 điểm nữa. ${hasAcc ? 'Hồ sơ đã gắn với tài khoản – đăng nhập ở máy khác là thấy lại.' : 'Hồ sơ lưu trên máy này – đổi máy hoặc xoá dữ liệu trình duyệt là mất. Đăng nhập để giữ lại nha.'}</p></div>`;
    if (keepY) ov.querySelector('.pf-box').scrollTop = keepY;
    bindInfo(); /* ℹ️ gắn lại bong bóng thông tin sau mỗi lần vẽ lại */
  };
  ov.addEventListener('click', e => {
    if (e.target === ov || e.target.closest('.pf-x')) return close();
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.a === 'pick') { picking = !picking; return draw(); }
    if (b.dataset.tt) { selectTitle(b.dataset.tt); return; }
    if (b.dataset.a === 'rank') { close(); import('./leaderboard.js?v=31').then(m => m.openLeaderboard('all')); return; }
    if (b.dataset.a === 'shop') { close(); location.href = shopURL(); return; } /* 🛍️ Cửa hàng */
    if (b.dataset.shopgo) { close(); location.href = shopURL(); return; } /* khung/màu tên bán bằng xu: sang Cửa hàng mua */
    if (b.dataset.lock) { import('./dialog.js?v=8').then(m => m.toast('🔒 ' + b.dataset.lock + ' để mở khoá', 2600)).catch(() => {}); return; }
    if (b.dataset.tab) { tab = b.dataset.tab; return draw(); }
    if (b.dataset.sub) { sub = b.dataset.sub; return draw(); }
    if (b.dataset.a === 'rnd') { const ok = PRESETS.filter(p => charOpen(p, curSt)); const r = { ...ok[Math.floor(Math.random() * ok.length)] }; for (const k of CH_KEYS) { const list = OPTIONS[k].filter(o => !charLock(k, Array.isArray(o) ? o[0] : o)); if (Math.random() < .35) { const o = list[Math.floor(Math.random() * list.length)]; r[k] = Array.isArray(o) ? o[0] : o; } } setAv({ ...cleanChar(r), e: 'ch' }); return draw(); }
    if (b.dataset.a === 'emoji') { tab = 'emoji'; return draw(); }
    if (b.dataset.pre != null) { setAv({ ...cleanChar(PRESETS[+b.dataset.pre]), e: 'ch' }); return draw(); }
    if (b.dataset.k) { const a = avatar(); setAv({ ...(a.ch || cleanChar(PUB[0])), [b.dataset.k]: b.dataset.v, e: 'ch' }); return draw(); }
    if (b.dataset.f != null) { setAv({ f: b.dataset.f }); return draw(); }
    if (b.dataset.n != null) { setAv({ n: b.dataset.n }); return draw(); }
    if (b.dataset.fx) { ls.set('gumballz-winfx', b.dataset.fx); import('./winfx.js?v=1').then(m => m.playWin(b.dataset.fx, true)).catch(() => {}); return draw(); }
    if (b.dataset.e || b.dataset.c) { setAv({ e: b.dataset.e || avatar().e, ...(b.dataset.c != null ? { c: +b.dataset.c } : {}) }); draw(); }
  });
  addEventListener('keydown', key, true); addEventListener('gumballz-stats-sync', onSync); addEventListener('gumballz-wallet', onSync); draw(); document.body.append(ov);
  /* có tài khoản: hỏi máy chủ thứ hạng + ngày lập tài khoản để tính đủ danh hiệu (GET /profile/<id> trả rank + created) */
  try {
    const u = JSON.parse(ls.get('gumballz-auth') || 'null'); const id = u && u.user && u.user.id;
    if (id) import('../net/api.js?v=27').then(m => m.memberProfile(id).then(r => { if (r && r.ok && r.user && ov.isConnected) { srv = { rank: r.user.rank, created: r.user.created }; draw(); } }).catch(() => {})).catch(() => {});
  } catch (e) {}
}
