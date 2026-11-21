// Gọi máy chủ GumballZ (Cloudflare): tài khoản, sảnh chung. Đăng nhập là TUỲ CHỌN – khách vẫn chơi bình thường.
import { cfHttp, cfProbe } from './cfrelay.js?v=16';
import { XP_K } from '../titles.js'; /* XP cân theo game: poker/xidach/bacao ¼, catte ½ */

export const API = () => cfHttp();
export const WS = () => cfHttp().replace(/^http/, 'ws');
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };

export function guestId() {
  let g = ls.get('gumballz-guest');
  if (!g || !/^[a-z0-9]{12,24}$/.test(g)) { g = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/g, '').slice(0, 16); ls.set('gumballz-guest', g); }
  return g;
}
export const myName = () => ls.get('gumballz-name') || '';
/* cấp độ 1–10 của mình (cùng công thức với level() trong shared/ui/stats.js) – dùng để ghép trận theo trình */
export function myLevel() { try { const g = (JSON.parse(ls.get('gumballz-stats')) || {}).g || {}; let x = 0; for (const k in g) x += Math.round(((g[k].p || 0) * 10 + (g[k].w || 0) * 20) * (XP_K[k] || 1)); return Math.min(10, Math.floor(Math.sqrt(x / 50)) + 1); } catch (e) { return 1; } }

async function call(path, data, token) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch(API() + path, { method: data === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: data === undefined ? undefined : JSON.stringify(data), signal: ctl.signal });
    return await r.json();
  } catch (e) { try { cfProbe(); } catch (e2) {} return { ok: false, msg: 'Không kết nối được máy chủ – thử lại sau nha' }; } finally { clearTimeout(t); } /* máy chủ chính không tới được: dò địa chỉ dự phòng cho lần gọi sau */
}

// ---------- tài khoản ----------
const KEY = 'gumballz-auth';
const subs = new Set();
function load() { try { return JSON.parse(ls.get(KEY)) || null; } catch (e) { return null; } }
function save(d) { if (d) ls.set(KEY, JSON.stringify(d)); else ls.del(KEY); if (d && d.user && d.user.name) ls.set('gumballz-name', d.user.name); subs.forEach(f => { try { f(d && d.user); } catch (e) {} }); try { dispatchEvent(new CustomEvent('gumballz-auth')); } catch (e) {} }
const done = r => { if (r.ok && r.token) save({ token: r.token, user: r.user }); return r; };
let cfg = null;
export const auth = {
  user: () => load()?.user || null,
  token: () => load()?.token || null,
  onChange(f) { subs.add(f); return () => subs.delete(f); },
  config: async () => cfg || (cfg = await call('/auth/config')),
  register: (username, password, name, ts) => call('/auth/register', { username, password, name, ts }).then(done),
  login: (username, password) => call('/auth/login', { username, password }).then(done),
  google: credential => call('/auth/google', { credential }).then(done),
  async refresh() { const t = auth.token(); if (!t) return null; const r = await call('/auth/me', {}, t); if (r.ok) { save({ token: t, user: r.user }); return r.user; } if (r.msg && !/kết nối/.test(r.msg)) save(null); return null; },
  async logout() { const t = auth.token(); save(null); if (t) call('/auth/logout', {}, t); },
  async rename(name) { const r = await call('/auth/rename', { name }, auth.token()); if (r.ok) save({ token: auth.token(), user: r.user }); return r; },
  password: (oldPw, newPw) => call('/auth/password', { old: oldPw, new: newPw }, auth.token()),
};
// ---------- vé "chủ web" (server/src/vip.js) ----------
/* Vé ký HMAC (POST /vip/pass) chứng minh tài khoản quản trị đầu tiên (id 1) là chủ web, để tên hiện nổi bật trong phòng.
   room.js nạp 2 hàm này bằng dynamic import có dự phòng rỗng – thêm hàm là đủ, không cần sửa room.js. */
const VP_KEY = 'gumballz-vp';
export function vipCached() { return ls.get(VP_KEY) || null; }
export async function vipPass() {
  const u = auth.user();
  if (!u || !u.admin || !u.owner) return null; /* chỉ chủ web hiện tại mới xin được vé (patch -94: cờ owner của máy chủ) */
  try { const r = await call('/vip/pass', {}, auth.token()); if (r && r.ok && r.pass) { ls.set(VP_KEY, r.pass); return r.pass; } } catch (e) {}
  return null;
}
// ---------- hồ sơ thành viên ----------
/* Hồ sơ công khai của một tài khoản (GET /profile/<id> trả rank + created + số liệu đã xác minh;
   profile.js dùng để tính danh hiệu Top / Thành viên đời đầu cho tài khoản đang đăng nhập). */
export const memberProfile = id => call('/profile/' + encodeURIComponent(String(id)));
// ---------- bạn bè & nhắn tin 1-1 ----------
export const friends = {
  list: () => call('/friends/list', {}, auth.token()),
  add: d => call('/friends/add', d || {}, auth.token()),
  act: (id, act) => call('/friends/act', { id, act }, auth.token()),
  block: (id, on = true) => call('/friends/block', { id, on }, auth.token()),
  msgs: (withId, afterId = 0) => call('/friends/msgs', { withId, afterId }, auth.token()),
  send: (toId, text) => call('/friends/send', { toId, text }, auth.token()),
};
/* 🪪 vé tài khoản (server/src/vip.js): mọi tài khoản đã đăng nhập – gửi kèm khi vào phòng máy chủ để áp lệnh cấm / danh sách chặn */
const IP_KEY = 'gumballz-ip';
export function idCached() { const u = auth.user(); if (!u) return ''; const p = ls.get(IP_KEY) || ''; const m = /^(\d+)\.(\d{13})\./.exec(p); return m && +m[1] === u.id && +m[2] > Date.now() + 36e5 ? p : ''; }
let ipWait = null;
export function idPass() {
  const u = auth.user(), c = idCached(); if (!u) return Promise.resolve('');
  const m = /\.(\d{13})\./.exec(c); if (c && +m[1] > Date.now() + 864e5) return Promise.resolve(c);
  return ipWait || (ipWait = call('/vip/id', {}, auth.token()).then(r => { ipWait = null; if (r && r.ok && r.p) { ls.set(IP_KEY, r.p); return r.p; } return c; }, () => { ipWait = null; return c; }));
}
// ---------- bảng xếp hạng ----------
export const leaderboard = (game = 'all', by = '') => call('/leaderboard', { game, by }, auth.token());
// tab khác đăng nhập/đăng xuất → cập nhật
try { addEventListener('storage', e => { if (e.key === KEY) subs.forEach(f => f(auth.user())); }); } catch (e) {}

// ---------- phòng công khai ----------
export function announceRoom(d) { // d: { game, code, k, host, n, open }
  const body = JSON.stringify(d);
  if (!d.open && navigator.sendBeacon) { try { if (navigator.sendBeacon(API() + '/lobby/room', new Blob([body], { type: 'text/plain' }))) return; } catch (e) {} }
  fetch(API() + '/lobby/room', { method: 'POST', headers: { 'content-type': 'text/plain' }, body, keepalive: true }).catch(() => {});
}
