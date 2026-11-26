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
import { auth, API } from '../net/api.js?v=29';
import { load, ACHS, totals, mergeAch, saveServerSnapshot } from './stats.js?v=99';
import { snapshot, adoptServer, resetWallet } from './wallet.js?v=7'; /* 💰 Ví xu: đẩy số dư + đồ đã mua lên tài khoản cùng hồ sơ */
import { cleanAvatar, avatarUsable } from '../avatar-sync.js?v=1'; /* 🧸 Nhân vật: gửi đủ nhân vật 3D lên tài khoản, chỉ nhận bản đủ từ máy chủ */
import { readParts, writeParts } from '../js/avatar-rewards.js?v=4'; /* 🧸 Linh kiện trúng rương (mở sớm hơn cấp): gửi danh sách lên tài khoản, nhận về thì gộp */
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
const META = 'gumballz-stats-sync', STATS = 'gumballz-stats', AV = 'gumballz-avatar', LOGIN = 'gumballz-login';
const meta = () => { try { return JSON.parse(ls.get(META)) || null; } catch (e) { return null; } };
const num = v => Math.max(0, Math.floor(+v || 0));
const lastT = s => Math.max(0, ...Object.values(s.g).map(g => +g.last || 0));
let busy = false, again = false, timer = 0;
const waiters = new Set(); /* người chờ lần chạy đang dở (nút Đồng bộ bấm đúng lúc đồng bộ nền đang chạy) */
export function syncSoon(ms = 3000) { clearTimeout(timer); timer = setTimeout(syncNow, ms); }
export async function syncNow() {
  const u = auth.user(), tok = auth.token(); if (!u || !tok) return false;
  if (busy) { again = true; return new Promise(res => waiters.add(res)); } /* chờ lần chạy đang dở xong rồi lấy đúng kết quả của nó, thay vì báo lỗi sai */
  busy = true;
  let ok; try { ok = await runSync(u, tok); } catch (e) { ok = false; } finally { busy = false; for (const w of waiters) w(ok); waiters.clear(); if (again) { again = false; syncSoon(1500); } }
  return ok;
}
/* phần chạy đồng bộ thật — được syncNow bọc ngoài để xử lý bận/chờ */
async function runSync(u, tok) {
  try {
    let m = meta(); const s = load();
    const other = m && m.uid !== u.id; /* máy này từng đồng bộ cho tài khoản khác: không cộng số của người đó vào tài khoản này */
    if (other) m = { uid: u.id, base: null, replace: true };
    if (other) { /* đổi acc: dữ liệu local của acc cũ (ví/danh hiệu/linh kiện) không được rò sang acc mới — reset về trắng TRƯỚC khi dựng body (ví blank at = 0 máy chủ sẽ từ chối, giữ ví acc mới; lần kéo về này nhận đúng đồ acc mới) */
      try { resetWallet(); } catch (e) {}
      try { ls.del('gumballz-title'); ls.del('gumballz-title-t'); } catch (e) {}
      try { writeParts([]); } catch (e) {}
    }
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
    const body = { op: m.pend.op, add: m.pend.add, ach: m.replace ? {} : s.ach, days: m.replace ? [] : s.days, streak: m.replace ? 0 : num(s.streak), best: m.replace ? 0 : num(s.best), night: m.replace ? 0 : (s.night ? 1 : 0), first: m.replace ? 0 : num(s.first), lastT: m.replace ? 0 : lastT(s), av: !m.replace ? cleanAvatar(av) : null, title: ls.get(TT) || '', titleT: num(ls.get(TTT)), wal: snapshot(), parts: readParts() }; /* nhân vật: gửi đủ nhân vật 3D (kind/skin/hair/hat/outfit/màu/giới tính/khung/màu tên) · danh hiệu tự chọn (kèm thời gian chọn để máy khác mới hơn thì thắng) · ví xu: máy chủ giữ bản mới nhất theo thời gian · linh kiện trúng rương: máy chủ gộp (hợp nhất 2 danh sách, chỉ nhận id đã biết) */
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 10000);
    let r; try { r = await (await fetch(API() + '/auth/profile', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify(body), signal: ctl.signal })).json(); } finally { clearTimeout(to); }
    if (!r || !r.ok || !r.prof) return false; /* lỗi mạng / hết phiên: giữ gói đang gửi dở, lần sau gửi lại */
    { const cur = meta(); if (!cur || !cur.pend || cur.pend.op !== m.pend.op) return true; } /* tab khác (hoặc bản module khác) đã gộp gói này rồi: gộp lần nữa là cộng trùng – dữ liệu đã đồng bộ qua tab kia */
    saveServerSnapshot(r.prof); /* tổng máy chủ (mốc cũ + đã xác minh + ván local đã nhận) để hiện riêng với số trên máy này */
    try { if (r.prof.dl && typeof r.prof.dl === 'object') { const dl = r.prof.dl; ls.set(LOGIN, JSON.stringify({ last: typeof dl.last === 'string' ? dl.last : '', streak: num(dl.streak), total: num(dl.total) })); } } catch (e) {} /* 🎁 điểm danh: máy chủ là chuẩn — hồ sơ trả về mang chuỗi điểm danh, ghi đè bản local */
    try { adoptServer(r.prof.wal); } catch (e) {} /* 💰 ví xu: máy chủ trả bản mới nhất — máy này nhận nếu mới hơn bản trên máy */
    try { if (Array.isArray(r.prof.parts)) { const merged = [...new Set([...readParts(), ...r.prof.parts.filter(x => typeof x === 'string')])]; writeParts(merged); } } catch (e) {} /* 🧸 linh kiện trúng rương: máy chủ gộp danh sách 2 máy (mở khoá chỉ thêm chứ không bớt) — máy khác mở rương thì máy này cũng thấy */
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
    out.xpAdj = Math.floor(+P.xpAdj || 0); /* ✏️ XP do Quản trị sửa tay (patch -167): máy chủ là chuẩn — kéo về để totals() hiện đúng */
    out.streak = !m.replace && lastT(now) > num(P.lastT) ? num(now.streak) : num(P.streak);
    /* ✏️ admin sửa chuỗi tốt nhất (patch -167): nếu máy chủ sửa best SAU lần đồng bộ trước (bestAt > at)
       thì nhận số mới, KHÔNG lấy max với số cũ trên máy — không thì số cũ trên máy đẩy ngược lên lại. */
    const adoptBest = P.bestAt && num(P.bestAt) > num(m.at);
    if (!m.replace) { for (const k in now.ach) if (!out.ach[k]) out.ach[k] = now.ach[k]; if (!adoptBest) out.best = Math.max(out.best, num(now.best)); }
    if (m.replace) { const t = totals(out); for (const a of ACHS) if (!out.ach[a.id] && a.ok(t)) out.ach[a.id] = Date.now(); } /* chế độ replace (đổi tài khoản / lần đồng bộ đầu sau bản nới lỏng): chỉ ghi mở, KHÔNG trả xu — tránh trả bù thành tựu đã mở trước patch */
    else mergeAch(out); /* 💰 tổng mới có thể đủ điều kiện thành tích — id vừa mở được thưởng xu 1 lần (mergeAch), id đã mở thì không trả lại */
    ls.set(STATS, JSON.stringify(out));
    const base = {}; for (const g in P.g || {}) base[g] = { p: num(P.g[g].p), w: num(P.g[g].w) };
    ls.set(META, JSON.stringify({ uid: u.id, base, at: Date.now() }));
    if (avatarUsable(P.av) && (m.replace || num(P.av.t) > num(av && av.t))) { ls.set(AV, JSON.stringify(cleanAvatar(P.av))); try { dispatchEvent(new CustomEvent('gumballz-avatar', { detail: { fromSync: true } })); } catch (e) {} } /* nhân vật ở máy khác mới hơn thì nhận — bản thiếu {e:'ch'} không có nhân vật thì bỏ qua, không đè nhân vật ở máy này (đó là vòng lặp khiến F5 lại ra nhân vật khác) */
    if (typeof P.title === 'string' && num(P.titleT) > num(ls.get(TTT))) { ls.set(TT, P.title); ls.set(TTT, String(num(P.titleT))); } /* danh hiệu chọn ở máy khác mới hơn */
    try { dispatchEvent(new CustomEvent('gumballz-stats-sync')); } catch (e) {}
    return true;
  } catch (e) { /* thử lại ở lần sau */ return false; }
}
// tự chạy: lúc tải trang (nếu có ván chưa gửi hoặc đã hơn 10 phút), khi đăng nhập, và sau mỗi ván
export function autoSync() {
  const u = auth.user(); if (!u) return;
  const m = meta(), s = load();
  const dirty = !m || m.uid !== u.id || m.pend || Object.keys(s.g).some(g => num(s.g[g].p) !== num(((m.base || {})[g] || {}).p));
  if (dirty || Date.now() - (m.at || 0) > 600e3) syncSoon(1200);
}
auth.onChange(user => { if (user) syncSoon(500); /* đăng nhập/đổi acc: lần syncNow này sẽ reset dữ liệu acc cũ trước khi gửi (nhánh other trong runSync), rồi kéo dữ liệu acc mới về */ else { try { resetWallet(); } catch (e) {} } /* đăng xuất: ví local về trắng để không hiện tiền acc cũ cho khách; syncNow không chạy khi chưa đăng nhập nên không đẩy gì lên máy chủ */ });
addEventListener('gumballz-stats', () => syncSoon(3000));
addEventListener('gumballz-wallet', () => syncSoon(1500)); /* 💰 ví đổi (thắng/thua/mua đồ/mở rương/điểm danh) → đẩy lên máy chủ ngay, thay vì đợi lần sync stats sau (tới 10 phút) — đóng cửa sổ "tiêu hết xu → xóa dữ liệu trước khi sync → lấy lại số dư cũ". An toàn vòng lặp: adoptServer chỉ phát event khi nó NHẬN ví mới hơn; lần sync sau thấy at bằng nhau thì không nhận nữa, không phát event. */
addEventListener('gumballz-avatar', e => { if (!e.detail || !e.detail.fromSync) syncSoon(2500); });
addEventListener('gumballz-parts', () => syncSoon(1500)); /* 🧸 trúng linh kiện rương → đẩy danh sách đã mở lên tài khoản ngay để qua máy khác vẫn còn */
addEventListener('gumballz-title', () => syncSoon(800)); /* đổi danh hiệu trưng ra → đẩy lên tài khoản */
autoSync();
