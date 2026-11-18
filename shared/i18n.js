// 🌐 Tiếng Anh cho cả web mà không phải sửa từng game: khi chọn English, dịch chữ ngay trên trang (nút, bảng, thông báo…) theo bảng dịch
// shared/i18n/en/<nhóm>.json (common = phần dùng chung, home = trang chủ, còn lại là tên thư mục game). Bảng dịch lấy từ
// tools/i18n/extract.mjs (gom mọi câu tiếng Việt trong code, ${…} thành {0}, {1}…). Câu nào chưa dịch thì giữ tiếng Việt.
// Chỗ không được dịch: ô nhập, tin chat của người chơi, tên người – đánh dấu translate="no".
const KEY = 'gumballz-lang', I18N_V = 7; /* sửa bảng dịch shared/i18n/en/*.json thì tăng số này */
export const lang = () => { try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'vi'; } catch (e) { return 'vi'; } };
export function setLang(l) { try { localStorage.setItem(KEY, l === 'en' ? 'en' : 'vi'); } catch (e) {} location.reload(); }
const T = new Map(), PAT = [], CHUNK = new Map(); /* câu nguyên văn · câu có chỗ trống {0} · mảnh chữ giữa các chỗ trống */
const esc = s => s.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
function load(dict) {
  for (const [vi, en] of Object.entries(dict)) {
    if (!en) continue;
    if (!/\{\d+\}/.test(vi)) { T.set(vi, en); continue; }
    const parts = vi.split(/\{(\d+)\}/), order = []; let re = '^';
    parts.forEach((p, i) => { if (i % 2) { order.push(+p); re += '(.*?)'; } else re += esc(p); });
    PAT.push({ re: new RegExp(re + '$', 's'), order, en, head: parts[0].trim().split(' ')[0] || '' });
    parts.filter((p, i) => !(i % 2)).forEach(p => { p = p.trim(); if (p.length > 2 && !CHUNK.has(p)) CHUNK.set(p, null); });
  }
  PAT.sort((a, b) => b.re.source.length - a.re.source.length); /* mẫu dài (cụ thể hơn) thử trước */
}
const cache = new Map();
/* dịch một câu đã gọt khoảng trắng; null = không biết */
function one(core, depth) {
  let out = T.get(core); if (out != null) return out;
  for (const p of PAT) { const g = core.match(p.re); if (!g) continue; return p.en.replace(/\{(\d+)\}/g, (_, k) => { const v = g[p.order.indexOf(+k) + 1]; if (v == null) return ''; const t = depth < 3 && /[^\d\s.,:%+\-–()/#]/.test(v) ? one(v.trim(), depth + 1) : null; return t == null ? v : v.replace(v.trim(), t); }); }
  if (depth > 3) return null;
  /* ghép từ nhiều mảnh: "game · đông vui", "6 đang chơi", "🎖️ Tay chơi" */
  for (const sep of [' · ', ' – ', ' | ']) if (core.includes(sep)) { let hit = false; const r = core.split(sep).map(x => { const t = one(x.trim(), depth + 1); if (t != null) hit = true; return t ?? x; }).join(sep); if (hit) return r; }
  let m = core.match(/^([\d.,+%×x]+|[^\p{L}\p{N}\s]+)\s+(.+)$/u); if (m) { const t = one(m[2], depth + 1); if (t != null) return m[1] + ' ' + t; }
  m = core.match(/^(.+?)\s+([\d.,+%×x]+|[^\p{L}\p{N}\s]+)$/u); if (m) { const t = one(m[1], depth + 1); if (t != null) return t + ' ' + m[2]; }
  return null;
}
export function tr(s) {
  if (!s || T.size === 0) return s;
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/), core = m[2].replace(/\s+/g, ' '); if (!core) return s;
  if (cache.has(core)) { const c = cache.get(core); return c == null ? s : m[1] + c + m[3]; }
  const out = one(core, 0);
  if (cache.size > 5000) cache.clear(); cache.set(core, out);
  return out == null ? s : m[1] + out + m[3];
}
const SKIP = 'script,style,textarea,input,code,pre,[translate="no"],[contenteditable="true"]';
const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
const done = new WeakMap(); /* nút chữ → bản dịch đã gán (khỏi dịch lại chính nó) */
function textNode(n) { const p = n.parentElement; if (!p || p.closest(SKIP)) return; const v = n.nodeValue; if (done.get(n) === v) return; const t = tr(v); done.set(n, t); if (t !== v) n.nodeValue = t; }
function attrs(el) { if (el.closest(SKIP) && !el.matches('input,textarea')) return; for (const a of ATTRS) { const v = el.getAttribute(a); if (!v) continue; const t = tr(v); if (t !== v) el.setAttribute(a, t); } }
function walk(root) {
  if (root.nodeType === 3) return textNode(root);
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  if (root.nodeType === 1) { if (root.matches(SKIP) && !root.matches('input,textarea')) return; attrs(root); }
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode: n => (n.nodeType === 1 && n.matches(SKIP) && !n.matches('input,textarea') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? textNode(n) : attrs(n);
}
export async function startI18n() {
  if (lang() !== 'en' || window.__gumballzI18n) return; window.__gumballzI18n = true;
  document.documentElement.lang = 'en'; document.documentElement.classList.add('lang-en');
  const base = new URL('./i18n/en/', import.meta.url).href, seg = location.pathname.split('/').filter(Boolean), page = seg.length && !/\.html$/.test(seg[seg.length - 1]) ? seg[seg.length - 1 - (seg[seg.length - 1] === 'huong-dan' ? 1 : 0)] : 'home';
  const pages = location.hostname.endsWith('github.io') ? seg.slice(1) : seg; const key = pages.length ? pages[0] : 'home';
  const get = k => fetch(base + k + '.json?v=' + (window.__gumballzI18nV || I18N_V)).then(r => (r.ok ? r.json() : {})).catch(() => ({}));
  const [c, g] = await Promise.all([get('common'), key === 'common' ? {} : get(key)]); void page;
  load(c); load(g);
  window.__gumballzTr = tr;
  walk(document.body); document.title = tr(document.title);
  new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') textNode(m.target); else if (m.type === 'attributes') attrs(m.target); else m.addedNodes.forEach(walk); } })
    .observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  /* giọng đọc (quản trò Ma Sói, Lô tô…) đọc bằng tiếng Anh */
  try { const sp = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = u => { try { const t = tr(u.text); if (t !== u.text) { u.text = t; u.lang = 'en-US'; u.voice = null; } } catch (e) {} return sp(u); }; } catch (e) {}
  /* hộp thoại kiểu cũ còn sót */
  for (const f of ['alert', 'confirm']) { const o = window[f]; if (o) window[f] = m => o.call(window, tr(String(m))); }
}
