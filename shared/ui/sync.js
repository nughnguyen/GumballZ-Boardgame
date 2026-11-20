// ☁️ Đồng bộ hồ sơ (số ván, thành tích, hình đại diện) theo TÀI KHOẢN: đăng nhập ở máy khác là thấy lại.
// BẢN NỚI LỎNG (18/11/2026, Nguyễn quyết: bỏ chống gian lận, chấp nhận đánh local) — máy chủ NHẬN LẠI số
// ván/thắng/thành tích/chuỗi/ngày do trình duyệt gửi (như trước bản chống gian lận), kèm giới hạn tốc độ của
// máy chủ (lần đầu tối đa 5000 ván, về sau ~4 ván/phút). Ván online do máy chủ giữ vẫn được máy chủ ghi riêng
// và tự trừ trùng nên không cộng 2 lần.
// Máy chủ giữ tổng; mỗi máy chỉ gửi PHẦN CHƠI THÊM kể từ lần đồng bộ trước (không cộng trùng, gửi lại vẫn an toàn nhờ mã `op`).
// Lần đồng bộ đầu sau bản này (META cũ thời chống gian lận không có base): chỉ lấy mốc máy chủ làm nền, KHÔNG gửi
// lại toàn bộ số local — số đó đã nằm trong "mốc cũ" của máy chủ rồi; ván local kể từ đó sẽ lên ở lần sau.
// Khách (không đăng nhập) không gửi gì – hồ sơ vẫn nằm trên máy như cũ.
// Hồ sơ máy chủ tải về được lưu vào 'gumballz-stats-server' để trang hồ sơ hiện "đã kiểm chứng" riêng với "chỉ trên máy này" (chưa đồng bộ).
import { auth, API } from '../net/api.js?v=27';
import { load, ACHS, totals, saveServerSnapshot } from './stats.js?v=79';
import { snapshot, adoptServer } from './wallet.js?v=1'; /* 💰 Ví xu: đẩy số dư + đồ đã mua lên tài khoản cùng hồ sơ */
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const META = 'gumballz-stats-sync', STATS = 'gumballz-stats', AV = 'gumballz-avatar';
const meta = () => { try { return JSON.parse(ls.get(META)) || null; } catch (e) { return null; } };
const num = v => Math.max(0, Math.floor(+v || 0));
const lastT = s => Math.max(0, ...Object.values(s.g).map(g => +g.last || 0));
let busy = false, again = false, timer = 0;
export function syncSoon(ms = 3000) { clearTimeout(timer); timer = setTimeout(syncNow, ms); }
export async function syncNow() {
  const u = auth.user(), tok = auth.token(); if (!u || !tok) return;
  if (busy) { again = true; return; } busy = true;
  try {
    let m = meta(); const s = load();
    const other = m && m.uid !== u.id; /* máy này từng đồng bộ cho tài khoản khác: không cộng số của người đó vào tài khoản này */
    if (other) m = { uid: u.id, base: null, replace: true };
    /* META thời chống gian lận chỉ có {uid, at}, không có base: lần đầu sau bản nới lỏng thì lấy mốc máy chủ làm nền
       (replace) thay vì gửi lại toàn bộ số local — số đó đã nằm trong "mốc cũ" của máy chủ, gửi lại là cộng trùng */
    else if (m && m.base == null && !m.replace) m = { uid: u.id, base: null, replace: true };
    if (!m) m = { uid: u.id, base: {} };
    // phần chơi thêm kể từ lần đồng bộ trước (đang có lần gửi dở thì gửi lại đúng gói đó)
    if (!m.pend) {
      const add = {};
      if (!m.replace) for (const g in s.g) { const b = (m.base && m.base[g]) || {}, p = num(s.g[g].p) - num(b.p), w = num(s.g[g].w) - num(b.w); if (p > 0 || w > 0) add[g] = { p: Math.max(0, p), w: Math.max(0, w), last: num(s.g[g].last) }; }
      m.pend = { op: Math.random().toString(36).slice(2) + Date.now().toString(36), add };
    }
    ls.set(META, JSON.stringify(m));
    let av = null; try { av = JSON.parse(ls.get(AV)); } catch (e) {}
    const TT = 'gumballz-title', TTT = 'gumballz-title-t';
    const body = { op: m.pend.op, add: m.pend.add, ach: m.replace ? {} : s.ach, days: m.replace ? [] : s.days, streak: m.replace ? 0 : num(s.streak), best: m.replace ? 0 : num(s.best), night: m.replace ? 0 : (s.night ? 1 : 0), first: m.replace ? 0 : num(s.first), lastT: m.replace ? 0 : lastT(s), av: !m.replace && av && av.e ? { e: av.e, c: num(av.c), t: num(av.t) } : null, title: ls.get(TT) || '', titleT: num(ls.get(TTT)), wal: snapshot() }; /* danh hiệu tự chọn (kèm thời gian chọn để máy khác mới hơn thì thắng) · ví xu: máy chủ giữ bản mới nhất theo thời gian */
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 10000);
    let r; try { r = await (await fetch(API() + '/auth/profile', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify(body), signal: ctl.signal })).json(); } finally { clearTimeout(to); }
    if (!r || !r.ok || !r.prof) return; /* lỗi mạng / hết phiên: giữ gói đang gửi dở, lần sau gửi lại */
    { const cur = meta(); if (!cur || !cur.pend || cur.pend.op !== m.pend.op) return; } /* tab khác (hoặc bản module khác) đã gộp gói này rồi: gộp lần nữa là cộng trùng */
    saveServerSnapshot(r.prof); /* tổng máy chủ (mốc cũ + đã xác minh + ván local đã nhận) để hiện riêng với số trên máy này */
    try { adoptServer(r.prof.wal); } catch (e) {} /* 💰 ví xu: máy chủ trả bản mới nhất — máy này nhận nếu mới hơn bản trên máy */
    // gộp về máy: tổng của máy chủ + những ván vừa chơi trong lúc đang gửi
    const P = r.prof, now = load(), out = { ...now, g: {} };
    const games = new Set([...Object.keys(P.g || {}), ...Object.keys(now.g)]);
    for (const g of games) {
      const sv = (P.g || {})[g] || {}, lc = now.g[g] || {}, b = (!m.replace && m.base && m.base[g]) || {}, ad = m.pend.add[g] || {};
      const extraP = m.replace ? 0 : Math.max(0, num(lc.p) - num(b.p) - num(ad.p)), extraW = m.replace ? 0 : Math.max(0, num(lc.w) - num(b.w) - num(ad.w));
      const p = num(sv.p) + extraP, w = Math.min(p, num(sv.w) + extraW);
      if (p > 0) out.g[g] = { p, w, last: Math.max(num(sv.last), m.replace ? 0 : num(lc.last)) };
    }
    out.ach = { ...(P.ach || {}) }; out.days = (P.days || []).slice(-400); out.best = num(P.best); out.night = P.night ? 1 : 0; if (P.first) out.first = num(P.first);
    out.streak = !m.replace && lastT(now) > num(P.lastT) ? num(now.streak) : num(P.streak);
    if (!m.replace) { for (const k in now.ach) if (!out.ach[k]) out.ach[k] = now.ach[k]; out.best = Math.max(out.best, num(now.best)); }
    const t = totals(out); for (const a of ACHS) if (!out.ach[a.id] && a.ok(t)) out.ach[a.id] = Date.now(); /* tổng mới có thể đủ điều kiện thành tích */
    ls.set(STATS, JSON.stringify(out));
    const base = {}; for (const g in P.g || {}) base[g] = { p: num(P.g[g].p), w: num(P.g[g].w) };
    ls.set(META, JSON.stringify({ uid: u.id, base, at: Date.now() }));
    if (P.av && P.av.e && (m.replace || num(P.av.t) > num(av && av.t))) { ls.set(AV, JSON.stringify(P.av)); try { dispatchEvent(new CustomEvent('gumballz-avatar', { detail: { fromSync: true } })); } catch (e) {} }
    if (typeof P.title === 'string' && num(P.titleT) > num(ls.get(TTT))) { ls.set(TT, P.title); ls.set(TTT, String(num(P.titleT))); } /* danh hiệu chọn ở máy khác mới hơn */
    try { dispatchEvent(new CustomEvent('gumballz-stats-sync')); } catch (e) {}
  } catch (e) { /* thử lại ở lần sau */ } finally { busy = false; if (again) { again = false; syncSoon(1500); } }
}
// tự chạy: lúc tải trang (nếu có ván chưa gửi hoặc đã hơn 10 phút), khi đăng nhập, và sau mỗi ván
export function autoSync() {
  const u = auth.user(); if (!u) return;
  const m = meta(), s = load();
  const dirty = !m || m.uid !== u.id || m.pend || Object.keys(s.g).some(g => num(s.g[g].p) !== num(((m.base || {})[g] || {}).p));
  if (dirty || Date.now() - (m.at || 0) > 600e3) syncSoon(1200);
}
auth.onChange(user => { if (user) syncSoon(500); });
addEventListener('gumballz-stats', () => syncSoon(3000));
addEventListener('gumballz-avatar', e => { if (!e.detail || !e.detail.fromSync) syncSoon(2500); });
addEventListener('gumballz-title', () => syncSoon(800)); /* đổi danh hiệu trưng ra → đẩy lên tài khoản */
autoSync();
