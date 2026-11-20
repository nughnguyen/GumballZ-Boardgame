// Tài khoản GumballZ: tên đăng nhập + mật khẩu (PBKDF2-SHA256) hoặc Google (ID token).
// Không bắt buộc – ai không đăng nhập vẫn chơi như khách.
import { DurableObject } from 'cloudflare:workers';
import { cleanName, clean } from './filter.js';
import { statOf, titlesOf, pickTitle, levelOf } from '../../shared/titles.js'; /* danh hiệu: dùng chung công thức với web */

const te = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const sha256 = async s => b64u(await crypto.subtle.digest('SHA-256', te.encode(s)));
const rand = n => b64u(crypto.getRandomValues(new Uint8Array(n)));
const ITER = 100000; // tối đa Cloudflare cho phép với PBKDF2
async function hashPw(pw, salt) {
  const key = await crypto.subtle.importKey('raw', te.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return b64u(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: te.encode(salt), iterations: ITER }, key, 256));
}
export const eqTime = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const USER = /^[a-z0-9_.]{3,20}$/;
const SESSION_DAYS = 60;

/* ================= 🛡️ ĐIỂM — NỚI LỎNG (18/11/2026, Nguyễn quyết: bỏ chống gian lận) =================
   Trước bản này (port 20261118-3): số liệu chỉ tăng khi SrvRoom ghi kết quả ván nó giữ (recordGame bên dưới),
   profile() KHÔNG nhận số do trình duyệt gửi. Từ bản này: profile() NHẬN LẠI số ván/thắng/thành tích/chuỗi/ngày
   do trình duyệt gửi (như trước bản chống gian lận) — game đấu máy/chơi đơn được tính vào XP/bảng xếp hạng.
   Giới hạn tốc độ như cũ: lần đồng bộ đầu nhận tối đa 5000 ván, về sau ~4 ván/phút (+20) — người chơi thật
   không bao giờ chạm mức này; farm bằng bot thì vẫn làm được (Nguyễn đã chấp nhận).
   - P.g / P.best / P.days / P.night: TỔNG GỘP = mốc cũ (legacy, đóng băng lúc chuyển đổi) + ván đã xác minh + ván local do client gửi.
     Giữ nguyên hình dạng để statOf()/leaderboard()/publicProfile()/adminFind() (shared/titles.js) chạy như cũ.
   - P.v: phần ĐÃ XÁC MINH: g {p,w,l,st,bs,lst,last} từng game, ach (thành tích máy chủ tự xét),
     days (ngày chơi đã xác minh), best/streak/ls (chuỗi thắng hiện tại/tốt nhất, chuỗi thua hiện tại),
     plays/wins (tổng ván đã xác minh), day/dmax (số ván trong ngày), marks (dấu mốc máy chủ thấy được).
   - P.legacy: mốc cũ chốt lúc chuyển đổi { at, p, w, ach, days, best } — KHÔNG xoá/reset điểm của ai.
   - P.syncV: ảnh chụp P.v.g ở lần đồng bộ trước — profile() trừ ván đã xác minh tăng thêm kể từ đó để không cộng
     trùng ván online (vừa recordGame vừa nằm trong số local client gửi lên).
   - Thành tích máy chủ tự xét (VERIFIED_ACHS + theo từng game): chỉ những cái suy ra được từ số liệu gộp
     (tổng ván/thắng, số game, ngày chơi, chuỗi thắng, thua, mốc ngày). */
const VN = 7 * 3600e3; /* giờ VN để chốt "ngày chơi" — khớp giờ máy người chơi ở VN, không phải UTC của máy chủ */
const vnDay = ts => new Date(ts + VN).toISOString().slice(0, 10);
const vnHour = ts => new Date(ts + VN).getUTCHours();
const dayAfter = x => { const dt = new Date(x + 'T12:00:00Z'); dt.setUTCDate(dt.getUTCDate() + 1); return dt.toISOString().slice(0, 10); };
function migrateProf(P) {
  if (P.v && typeof P.v === 'object' && P.legacy && typeof P.legacy === 'object') return false;
  let lp = 0, lw = 0;
  for (const v of Object.values(P.g || {})) { const gp = Math.max(0, Math.floor(+((v || {}).p) || 0)); lp += gp; lw += Math.min(gp, Math.max(0, Math.floor(+((v || {}).w) || 0))); }
  P.v = { g: {}, ach: {}, days: [], best: 0, streak: 0, ls: 0, plays: 0, wins: 0, night: 0, first: 0, last: 0, day: null, dmax: { n: 0, k: 0, w: 0 }, marks: {} };
  P.legacy = { at: Date.now(), p: lp, w: lw, ach: Object.keys(P.ach || {}).length, days: Array.isArray(P.days) ? P.days.length : 0, best: Math.max(0, Math.floor(+P.best || 0)) };
  for (const id of checkVerified(P)) P.v.ach[id] = Date.now(); /* mốc cũ đủ điều kiện thành tích nào thì giữ lại cái đó */
  return true;
}
function vCtx(P) {
  const V = P.v || {}, g = P.g || {};
  let p = 0, w = 0, kinds = 0, top = 0; const wins = {};
  for (const k of Object.keys(g)) { const v = g[k] || {}, gp = Math.max(0, Math.floor(+v.p || 0)), gw = Math.min(gp, Math.max(0, Math.floor(+v.w || 0))); p += gp; w += gw; if (gp) kinds++; top = Math.max(top, gw); wins[k] = gw; }
  const vg = V.g || {}; let vloss = 0; for (const v of Object.values(vg)) vloss += Math.max(0, Math.floor(+v.l || 0));
  const days = new Set([...(Array.isArray(P.days) ? P.days : []), ...(Array.isArray(V.days) ? V.days : [])]).size;
  const xp = p * 10 + w * 20;
  return { p, w, kinds, top, days, best: Math.min(w, Math.max(0, Math.floor(+P.best || 0))), night: !!P.night, ls: Math.max(0, Math.floor(+V.ls || 0)), vloss,
    dmax: V.dmax || { n: 0, k: 0, w: 0 }, marks: V.marks || {}, vg, g, wins, lv: Math.min(10, Math.floor(Math.sqrt(xp / 50)) + 1) };
}
/* thành tích máy chủ tự xét được từ số liệu gộp (id + điều kiện y hệt ACHS trong shared/ui/stats.js) */
const VERIFIED_ACHS = [
  { id: 'first', ok: t => t.p >= 1 },
  { id: 'p10', ok: t => t.p >= 10 }, { id: 'p25', ok: t => t.p >= 25 }, { id: 'p50', ok: t => t.p >= 50 },
  { id: 'p100', ok: t => t.p >= 100 }, { id: 'p200', ok: t => t.p >= 200 }, { id: 'c-play500', ok: t => t.p >= 500 },
  { id: 'p1000', ok: t => t.p >= 1000 }, { id: 'c-play1000', ok: t => t.p >= 1000 },
  { id: 'w1', ok: t => t.w >= 1 }, { id: 'w10', ok: t => t.w >= 10 }, { id: 'w25', ok: t => t.w >= 25 },
  { id: 'w50', ok: t => t.w >= 50 }, { id: 'w100', ok: t => t.w >= 100 },
  { id: 'w200', ok: t => t.w >= 200 }, { id: 'w500', ok: t => t.w >= 500 },
  { id: 's3', ok: t => t.best >= 3 }, { id: 's5', ok: t => t.best >= 5 }, { id: 's7', ok: t => t.best >= 7 }, { id: 's10', ok: t => t.best >= 10 },
  { id: 's15', ok: t => t.best >= 15 }, { id: 's20', ok: t => t.best >= 20 },
  { id: 'k5', ok: t => t.kinds >= 5 }, { id: 'k10', ok: t => t.kinds >= 10 }, { id: 'k15', ok: t => t.kinds >= 15 },
  { id: 'k20', ok: t => t.kinds >= 20 }, { id: 'k24', ok: t => t.kinds >= 24 }, { id: 'k25', ok: t => t.kinds >= 25 },
  { id: 'k30', ok: t => t.kinds >= 30 }, { id: 'k35', ok: t => t.kinds >= 35 },
  { id: 'c-allgames', ok: t => t.kinds >= 80 }, /* đủ 80 game trong GAME_NAMES (shared/ui/stats.js) */
  { id: 'm10', ok: t => t.top >= 10 }, { id: 'c-w50', ok: t => t.top >= 50 }, { id: 'm25', ok: t => t.top >= 25 },
  { id: 'd3', ok: t => t.days >= 3 }, { id: 'd7', ok: t => t.days >= 7 }, { id: 'd14', ok: t => t.days >= 14 }, { id: 'd30', ok: t => t.days >= 30 },
  { id: 'd60', ok: t => t.days >= 60 }, { id: 'd100', ok: t => t.days >= 100 },
  { id: 'night', ok: t => t.night },
  { id: 'lv5', ok: t => t.lv >= 5 }, { id: 'lv10', ok: t => t.lv >= 10 },
  { id: 'c-lose5', ok: t => t.ls >= 5 }, { id: 'c-lose100', ok: t => t.vloss >= 100 }, { id: 'c-lose500', ok: t => t.vloss >= 500 },
  { id: 'c-day20', ok: t => t.dmax.n >= 20 }, { id: 'c-day50', ok: t => t.dmax.n >= 50 }, { id: 'c-day3g', ok: t => t.dmax.k >= 3 }, { id: 'c-win3g', ok: t => t.dmax.w >= 3 },
  { id: 'c-win10g', ok: t => Object.values(t.wins).filter(x => x >= 1).length >= 10 },
  { id: 'c-win25g', ok: t => Object.values(t.wins).filter(x => x >= 1).length >= 25 },
  { id: 'c-comeback', ok: t => !!t.marks['c-comeback'] }, { id: 'c-dawn', ok: t => !!t.marks['c-dawn'] },
  { id: 'c-back', ok: t => !!t.marks['c-back'] }, { id: 'c-weekend', ok: t => !!t.marks['c-weekend'] },
  { id: 'c-quick', ok: t => !!t.marks['c-quick'] }, { id: 'c-long', ok: t => !!t.marks['c-long'] },
  { id: 'c-crowd', ok: t => !!t.marks['c-crowd'] }, { id: 'c-firstloss', ok: t => !!t.marks['c-firstloss'] },
  { id: 'c-newyear', ok: t => !!t.marks['c-newyear'] },
];
/* thành tích mới đủ điều kiện (chưa có trong legacy P.ach lẫn P.v.ach): chung + theo từng game đã có số liệu */
function checkVerified(P) {
  const T = vCtx(P), out = [];
  const have = new Set([...Object.keys(P.ach || {}), ...Object.keys((P.v && P.v.ach) || {})]);
  for (const a of VERIFIED_ACHS) { if (!have.has(a.id)) { let ok = false; try { ok = !!a.ok(T); } catch (e) {} if (ok) out.push(a.id); } }
  const games = new Set([...Object.keys(P.g || {}), ...Object.keys((P.v && P.v.g) || {})]);
  for (const g of games) {
    const gg = (P.g || {})[g] || {}, vg = ((P.v && P.v.g) || {})[g] || {};
    const gp = Math.max(0, Math.floor(+gg.p || 0)), gw = Math.min(gp, Math.max(0, Math.floor(+gg.w || 0)));
    const cand = g === 'thathaythach'
      ? [['p1_' + g, gp >= 1], ['p10_' + g, gp >= 10], ['g-first-' + g, gp >= 1], ['g-p50-' + g, gp >= 50]] /* không có thắng thua nên không có mẫu thắng/thua */
      : [['w1_' + g, gw >= 1], ['w10_' + g, gw >= 10], ['g-first-' + g, gp >= 1], ['g-w5-' + g, gw >= 5], ['g-w25-' + g, gw >= 25],
         ['g-w50-' + g, gw >= 50], ['g-w100-' + g, gw >= 100], ['g-p50-' + g, gp >= 50],
         ['g-l10-' + g, (vg.l || 0) >= 10], ['g-s3-' + g, (vg.bs || 0) >= 3]];
    for (const [id, ok] of cand) if (ok && !have.has(id) && !out.includes(id)) out.push(id);
  }
  for (const [g, id] of [['catte', 'catte-win3'], ['baitan', 'baitan-win3'], ['tusac', 'tusac-win3'], ['sam', 'sam-win3']]) {
    const vg = ((P.v && P.v.g) || {})[g] || {};
    if ((vg.st || 0) >= 3 && !have.has(id) && !out.includes(id)) out.push(id);
  }
  { const vg = ((P.v && P.v.g) || {}).bacao || {}; if ((vg.lst || 0) >= 5 && !have.has('bacao-lose5') && !out.includes('bacao-lose5')) out.push('bacao-lose5'); }
  return out;
}

export class Users extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env); this.sql = ctx.storage.sql; this.dmRate = new Map();
    this.sql.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, name TEXT, pw TEXT, salt TEXT, google TEXT UNIQUE, email TEXT, created INTEGER, banned INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS sessions (tok TEXT PRIMARY KEY, uid INTEGER, exp INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS loginfail (ip TEXT, t INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS friends (a INTEGER, b INTEGER, status TEXT, req INTEGER, ts INTEGER, PRIMARY KEY (a, b))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS dms (id INTEGER PRIMARY KEY AUTOINCREMENT, fromId INTEGER, toId INTEGER, msg TEXT, ts INTEGER, seen INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS dms_pair ON dms (fromId, toId, ts)`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS dms_to ON dms (toId, seen)`);
    try { this.sql.exec('ALTER TABLE users ADD COLUMN admin INTEGER DEFAULT 0'); } catch (e) {} // cột quản trị (bản 11/2026)
    try { this.sql.exec('ALTER TABLE users ADD COLUMN prof TEXT'); this.sql.exec('ALTER TABLE users ADD COLUMN profOp TEXT'); } catch (e) {} // hồ sơ đồng bộ theo tài khoản (số ván, thành tích, avatar)
    this.sql.exec(`CREATE TABLE IF NOT EXISTS vgames (k TEXT PRIMARY KEY, ts INTEGER)`); // 🛡️ chống gian lận: khoá các ván máy chủ đã ghi (chống ghi trùng khi phòng ngủ rồi thức dậy phát lại view cuối)
  }
  pub(u) { return u && { id: u.id, username: u.username || null, name: u.name, google: !!u.google, banned: !!u.banned, admin: !!u.admin }; }
  one(q, ...a) { const r = this.sql.exec(q, ...a).toArray(); return r[0] || null; }
  async session(uid) {
    const tok = rand(32), now = Date.now();
    this.sql.exec('DELETE FROM sessions WHERE exp < ?', now);
    this.sql.exec('INSERT INTO sessions (tok, uid, exp) VALUES (?,?,?)', await sha256(tok), uid, now + SESSION_DAYS * 864e5);
    return tok;
  }
  async limited(ip) { // chống dò mật khẩu bền vững qua SQLite: 10 lần sai / 15 phút / IP (đã băm)
    const t = Date.now(), h = await sha256('login:' + (ip || ''));
    this.sql.exec('DELETE FROM loginfail WHERE t < ?', t - 900e3);
    return this.one('SELECT COUNT(*) AS n FROM loginfail WHERE ip = ?', h).n >= 10;
  }
  async fail(ip) {
    const h = await sha256('login:' + (ip || ''));
    this.sql.exec('INSERT INTO loginfail (ip, t) VALUES (?,?)', h, Date.now());
  }

  async register({ username, password, name }, ip) {
    if (await this.limited(ip)) return { ok: false, msg: 'Thử lại sau ít phút nha' };
    username = String(username || '').trim().toLowerCase();
    if (!USER.test(username)) return { ok: false, msg: 'Tên đăng nhập 3–20 ký tự: chữ thường không dấu, số, dấu chấm, gạch dưới' };
    if (typeof password !== 'string' || password.length < 6 || password.length > 100) return { ok: false, msg: 'Mật khẩu từ 6 ký tự trở lên' };
    if (clean(username).hit) return { ok: false, msg: 'Tên đăng nhập có từ không phù hợp' };
    const nm = cleanName(name) || username;
    if (nm.includes('*')) return { ok: false, msg: 'Tên hiển thị có từ không phù hợp' };
    if (this.one('SELECT id FROM users WHERE username = ?', username)) return { ok: false, msg: 'Tên đăng nhập đã có người dùng' };
    await this.fail(ip); // tính cả đăng ký để chống tạo hàng loạt
    const salt = rand(16), pw = await hashPw(password, salt);
    this.sql.exec('INSERT INTO users (username, name, pw, salt, created) VALUES (?,?,?,?,?)', username, nm, pw, salt, Date.now());
    const u = this.one('SELECT * FROM users WHERE username = ?', username);
    return { ok: true, token: await this.session(u.id), user: this.pub(u) };
  }
  async login({ username, password }, ip) {
    if (await this.limited(ip)) return { ok: false, msg: 'Sai nhiều lần quá – đợi 15 phút rồi thử lại nha' };
    const u = this.one('SELECT * FROM users WHERE username = ?', String(username || '').trim().toLowerCase());
    if (!u || !u.pw || !eqTime(await hashPw(String(password || ''), u.salt), u.pw)) { await this.fail(ip); return { ok: false, msg: 'Sai tên đăng nhập hoặc mật khẩu' }; }
    if (u.banned) return { ok: false, msg: 'Tài khoản đang bị khoá' };
    return { ok: true, token: await this.session(u.id), user: this.pub(u) };
  }
  async google({ credential }, ip, clientId) {
    if (!clientId) return { ok: false, msg: 'Chưa bật đăng nhập Google' };
    if (await this.limited(ip)) return { ok: false, msg: 'Thử lại sau ít phút nha' };
    const p = await verifyGoogle(credential, clientId).catch(() => null);
    if (!p) { await this.fail(ip); return { ok: false, msg: 'Không xác minh được tài khoản Google' }; }
    let u = this.one('SELECT * FROM users WHERE google = ?', p.sub);
    if (!u) {
      const nm = cleanName(p.given_name || p.name || 'Người chơi') || 'Người chơi';
      this.sql.exec('INSERT INTO users (name, google, email, created) VALUES (?,?,?,?)', nm.includes('*') ? 'Người chơi' : nm, p.sub, '', Date.now()); // không lưu email
      u = this.one('SELECT * FROM users WHERE google = ?', p.sub);
    }
    if (u.banned) return { ok: false, msg: 'Tài khoản đang bị khoá' };
    return { ok: true, token: await this.session(u.id), user: this.pub(u) };
  }
  async whoami(token) {
    if (!token || typeof token !== 'string' || token.length > 100) return null;
    const s = this.one('SELECT * FROM sessions WHERE tok = ?', await sha256(token));
    if (!s || s.exp < Date.now()) return null;
    return this.pub(this.one('SELECT * FROM users WHERE id = ?', s.uid));
  }
  async logout(token) { if (token) this.sql.exec('DELETE FROM sessions WHERE tok = ?', await sha256(String(token))); return { ok: true }; }
  async rename(token, name) {
    const u = await this.whoami(token); if (!u) return { ok: false, msg: 'Hết phiên đăng nhập' };
    const nm = cleanName(name); if (!nm || nm.length < 2) return { ok: false, msg: 'Tên 2–20 ký tự' };
    if (nm.includes('*')) return { ok: false, msg: 'Tên có từ không phù hợp' };
    this.sql.exec('UPDATE users SET name = ? WHERE id = ?', nm, u.id);
    return { ok: true, user: this.pub(this.one('SELECT * FROM users WHERE id = ?', u.id)) };
  }
  // ☁️ Hồ sơ theo tài khoản — BẢN NỚI LỎNG (18/11/2026, Nguyễn quyết: bỏ chống gian lận, chấp nhận đánh local):
  // máy chủ NHẬN LẠI số ván/thắng/thành tích/chuỗi/ngày do trình duyệt gửi (như trước bản chống gian lận),
  // kèm giới hạn theo thời gian thật như cũ (lần đầu tối đa 5000 ván, về sau ~4 ván/phút +20).
  // Ván máy chủ giữ (recordGame) vẫn ghi riêng vào P.v; để không cộng trùng ván đó 2 lần (vừa recordGame vừa
  // client gửi lên trong số local), profile() trừ đi số ván đã xác minh tăng thêm kể từ lần đồng bộ trước (P.syncV).
  // Tổng hiện = mốc cũ (P.legacy) + ván đã xác minh + ván local do client gửi. Client vẫn được gửi danh hiệu tự
  // chọn (title — lúc hiện mới xét có đạt không) và hình đại diện (av). Trả về toàn bộ hồ sơ (gồm P.v + P.legacy).
  async profile(token, d) {
    d = d && typeof d === 'object' ? d : {};
    const me = await this.whoami(token); if (!me) return { ok: false, msg: 'Hết phiên đăng nhập' };
    const row = this.one('SELECT prof, profOp FROM users WHERE id = ?', me.id);
    let P = null; try { P = JSON.parse(row.prof || 'null'); } catch (e) {}
    P = P && typeof P === 'object' ? P : {}; P.g = P.g || {}; P.ach = P.ach || {}; P.days = P.days || [];
    const num = (v, max = 1e6) => Math.min(max, Math.max(0, Math.floor(+v || 0)));
    let changed = false;
    if (migrateProf(P)) changed = true; /* lần đầu sau bản chống gian lận: chốt mốc legacy + xét lại thành tích từ tổng gộp */
    if (typeof d.title === 'string' && /^[a-z0-9-]{0,24}$/.test(d.title) && num(d.titleT, 4e12) >= num(P.titleT, 4e12)) { P.title = d.title; P.titleT = num(d.titleT, 4e12); changed = true; } /* danh hiệu tự chọn; có còn đạt hay không thì lúc hiện mới xét */
    /* 💰 Ví xu (tiền ảo, không tiền thật): máy chủ chỉ giữ bản mới nhất theo thời gian (ai mới hơn thì thắng),
       không cộng dồn — trình duyệt tự cộng/trừ rồi gửi cả ví lên. Chỉ nhận các id đồ đã biết, số xu tối đa 10 triệu. */
    if (d.wal && typeof d.wal === 'object' && num(d.wal.at, 4e12) > num(P.wal && P.wal.at, 4e12)) {
      const w = d.wal, inv = {};
      if (w.inv && typeof w.inv === 'object') for (const k of ['bt-trap', 'bt-radar', 'bt-nuke', 'dbl-xu']) inv[k] = Math.min(999, num(w.inv[k]));
      const own = Array.isArray(w.own) ? [...new Set(w.own.filter(x => typeof x === 'string' && /^(frame|color|back):[a-z]{2,14}$/.test(x)))].slice(0, 200) : [];
      const eq = {}; if (w.eq && typeof w.eq.back === 'string' && /^[a-z]{2,14}$/.test(w.eq.back)) eq.back = w.eq.back;
      P.wal = { xu: Math.min(10000000, num(w.xu)), inv, own, eq, dbl: Math.min(99, num(w.dbl)), chest: Math.min(100000, num(w.chest)), at: num(w.at, 4e12) };
      changed = true;
    }
    if (d.av && typeof d.av.e === 'string' && d.av.e.length <= 16 && num(d.av.t, 4e12) > num(P.av && P.av.t, 4e12)) { P.av = { e: d.av.e, c: num(d.av.c, 40), t: num(d.av.t, 4e12) }; changed = true; }
    const op = d && typeof d.op === 'string' ? d.op.slice(0, 40) : '';
    if (op && op !== row.profOp && !(Array.isArray(P.ops) && P.ops.includes(op)) && JSON.stringify(d).length < 40000) {
      const add = d.add && typeof d.add === 'object' ? d.add : {};
      /* số ván là do máy người chơi tự khai → giới hạn theo thời gian thật: lần đồng bộ đầu nhận hồ sơ cũ trên máy (tối đa 5000 ván),
         về sau mỗi lần chỉ nhận ~4 ván/phút kể từ lần trước (+20) – người chơi thật không bao giờ chạm mức này. */
      let budget = P.syncAt ? Math.min(5000, 20 + Math.floor((Date.now() - P.syncAt) / 15000)) : 5000;
      P.syncAt = Date.now(); P.ops = [...(Array.isArray(P.ops) ? P.ops : []), op].slice(-6);
      const syncV = (P.syncV && typeof P.syncV === 'object' ? P.syncV : {}) || {}; /* mốc ván đã xác minh ở lần đồng bộ trước (để trừ trùng) */
      const V = P.v || {};
      for (const g of Object.keys(add).slice(0, 100)) {
        if (!/^[a-z]{2,14}$/.test(g) || (!P.g[g] && Object.keys(P.g).length >= 100)) continue; /* tối đa 100 game trong hồ sơ — site đang hướng tới 90 game, mức 40 cũ đã không đủ từ lúc có 41 game */
        const a = add[g] || {}, cur = P.g[g] || { p: 0, w: 0, last: 0 };
        /* trừ ván máy chủ đã ghi kể từ lần đồng bộ trước: ván online do máy chủ giữ đã có trong P.g qua recordGame,
           mà máy người chơi cũng ghi lại trong số local nên sẽ nằm trong add — trừ đi để không cộng 2 lần */
        const vg = (V.g || {})[g] || {}, sv = syncV[g] || {};
        const vd = Math.max(0, Math.floor(+vg.p || 0) - Math.floor(+sv.p || 0)), wd = Math.max(0, Math.floor(+vg.w || 0) - Math.floor(+sv.w || 0));
        let ap = Math.max(0, num(a.p, 5000) - vd), aw = Math.max(0, num(a.w, 5000) - wd);
        ap = Math.min(ap, Math.max(0, budget)); aw = Math.min(aw, ap); budget -= ap;
        const p = num(cur.p + ap), w = Math.min(p, num(cur.w + aw));
        P.g[g] = { p, w, last: Math.max(num(cur.last, 4e12), num(a.last, 4e12)) };
      }
      if (d.ach && typeof d.ach === 'object') for (const k of Object.keys(d.ach).slice(0, 80)) { if (!/^[a-z0-9_-]{1,30}$/i.test(k)) continue; const t = num(d.ach[k], 4e12) || Date.now(); P.ach[k] = P.ach[k] ? Math.min(P.ach[k], t) : t; }
      if (Array.isArray(d.days)) P.days = [...new Set([...P.days, ...d.days.filter(x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)).slice(-400)])].sort().slice(-400);
      { let tw = 0; for (const v of Object.values(P.g)) tw += num(v && v.w); P.best = Math.min(tw, Math.max(num(P.best), num(d.best))); } /* chuỗi thắng không thể dài hơn tổng số ván thắng */
      if (num(d.lastT, 4e12) >= num(P.lastT, 4e12)) { P.streak = num(d.streak); P.lastT = num(d.lastT, 4e12); }
      if (d.night) P.night = 1;
      const f = num(d.first, 4e12); if (f && (!P.first || f < P.first)) P.first = f;
      if (d.av && typeof d.av.e === 'string' && d.av.e.length <= 16 && num(d.av.t, 4e12) > num(P.av && P.av.t, 4e12)) P.av = { e: d.av.e, c: num(d.av.c, 40), t: num(d.av.t, 4e12) };
      this.sql.exec('UPDATE users SET profOp = ? WHERE id = ?', op, me.id);
      changed = true;
    }
    /* chốt mốc ván đã xác minh ở lần đồng bộ này (để lần sau trừ trùng); cập nhật cả khi gói này không có op mới
       vì client lấy tổng P.g trả về làm mốc mới cho lần gửi sau */
    { const snap = {}; for (const [g, v] of Object.entries((P.v && P.v.g) || {})) snap[g] = { p: Math.max(0, Math.floor(+v.p || 0)), w: Math.max(0, Math.floor(+v.w || 0)) }; P.syncV = snap; changed = true; }
    if (changed) this.sql.exec('UPDATE users SET prof = ? WHERE id = ?', JSON.stringify(P), me.id);
    return { ok: true, prof: P };
  }
  // 🛡️ Ghi kết quả ván do MÁY CHỦ giữ (chỉ SrvRoom gọi qua RPC giữa các Durable Object — không có đường HTTP nào gọi thẳng).
  // d = { game, room, key, durMs, n, players: [{ uid, won }] }; won: true/false/null (null = hoà / game không có thắng thua).
  // Chống ghi trùng: cùng key chỉ ghi 1 lần (bảng vgames). Dưới 2 người thật (uid khác nhau) thì KHÔNG ghi ở đây —
  // ván đấu máy hay 1 người + bot được tính qua đồng bộ client (profile() nhận số do trình duyệt gửi, có giới hạn tốc độ).
  async recordGame(d = {}) {
    const game = String(d.game || '');
    if (!/^[a-z]{2,14}$/.test(game)) return { ok: false, msg: 'game?' };
    const room = String(d.room || '').slice(0, 8), key = String(d.key || '').slice(0, 200);
    if (!key || !room) return { ok: false, msg: 'key?' };
    const players = (Array.isArray(d.players) ? d.players : []).filter(p => p && Number.isInteger(p.uid) && p.uid > 0 && p.uid < 1e9).slice(0, 12);
    if (new Set(players.map(p => p.uid)).size < 2) return { ok: false, msg: 'can 2 nguoi that' };
    const durMs = Math.max(0, Math.min(24 * 3600e3, Math.floor(+d.durMs || 0)));
    const n = Math.max(0, Math.min(36, Math.floor(+d.n || 0)));
    const now = Date.now();
    if (this.one('SELECT k FROM vgames WHERE k = ?', key)) return { ok: true, dup: true };
    this.sql.exec('DELETE FROM vgames WHERE ts < ?', now - 7 * 864e5);
    this.sql.exec('INSERT INTO vgames (k, ts) VALUES (?,?)', key, now);
    const day = vnDay(now), hr = vnHour(now);
    const seen = new Set();
    for (const pl of players) {
      if (seen.has(pl.uid)) continue; seen.add(pl.uid);
      const row = this.one('SELECT prof, banned FROM users WHERE id = ?', pl.uid);
      if (!row || row.banned) continue;
      let P = null; try { P = JSON.parse(row.prof || 'null'); } catch (e) {}
      P = P && typeof P === 'object' ? P : {}; P.g = P.g || {}; P.ach = P.ach || {}; P.days = P.days || [];
      migrateProf(P);
      const V = P.v, won = pl.won === true ? true : pl.won === false ? false : null;
      const g = (P.g[game] = P.g[game] || { p: 0, w: 0, last: 0 });
      const vg = (V.g[game] = V.g[game] || { p: 0, w: 0, l: 0, st: 0, bs: 0, lst: 0, last: 0 });
      const vPlaysBefore = V.plays || 0, lsBefore = V.ls || 0;
      g.p++; vg.p++; g.last = now; vg.last = now; V.plays = vPlaysBefore + 1;
      if (won === true) { g.w++; vg.w++; V.wins = (V.wins || 0) + 1; V.streak = (V.streak || 0) + 1; V.best = Math.max(V.best || 0, V.streak); V.ls = 0; vg.st = (vg.st || 0) + 1; vg.bs = Math.max(vg.bs || 0, vg.st); vg.lst = 0; }
      else if (won === false) { V.streak = 0; V.ls = lsBefore + 1; vg.st = 0; vg.lst = (vg.lst || 0) + 1; vg.l = (vg.l || 0) + 1; }
      P.best = Math.max(Math.floor(+P.best || 0), V.best || 0);
      if (!V.days.includes(day)) { V.days.push(day); if (V.days.length > 400) V.days = V.days.slice(-400); V.days.sort(); }
      if (!P.days.includes(day)) { P.days = [...new Set([...P.days, ...V.days])].sort().slice(-400); }
      if (!V.day || V.day.d !== day) V.day = { d: day, n: 0, k: [], w: [] };
      V.day.n++; if (!V.day.k.includes(game)) V.day.k.push(game); if (won === true && !V.day.w.includes(game)) V.day.w.push(game);
      V.dmax.n = Math.max(V.dmax.n || 0, V.day.n); V.dmax.k = Math.max(V.dmax.k || 0, V.day.k.length); V.dmax.w = Math.max(V.dmax.w || 0, V.day.w.length);
      if (hr < 5) { V.night = 1; P.night = 1; }
      /* dấu mốc chỉ máy chủ thấy được (giờ VN, thời lượng ván, số người trong ván, chuỗi thua trước ván) */
      if (won === true && hr < 5) V.marks['c-dawn'] = 1;
      if (won === true && durMs >= 1000 && durMs < 120000) V.marks['c-quick'] = 1;
      if (durMs > 3600000) V.marks['c-long'] = 1;
      if (n >= 8) V.marks['c-crowd'] = 1;
      if (vPlaysBefore === 0 && (P.legacy.p || 0) === 0 && won === false) V.marks['c-firstloss'] = 1;
      if (won === true && lsBefore >= 5) V.marks['c-comeback'] = 1;
      if (V.last && now - V.last >= 30 * 864e5) V.marks['c-back'] = 1;
      { const vdt = new Date(now + VN); if (vdt.getUTCMonth() === 0 && vdt.getUTCDate() === 1 && vdt.getUTCHours() === 0) V.marks['c-newyear'] = 1; }
      if ((V.days || []).some(x => { const dt = new Date(x + 'T12:00:00Z'); return dt.getUTCDay() === 6 && V.days.includes(dayAfter(x)); })) V.marks['c-weekend'] = 1;
      if (!V.first) V.first = now; if (!P.first || now < P.first) P.first = now; V.last = now;
      for (const id of checkVerified(P)) V.ach[id] = now; /* máy chủ tự xét thành tích từ số liệu gộp */
      this.sql.exec('UPDATE users SET prof = ? WHERE id = ?', JSON.stringify(P), pl.uid);
    }
    this.lbCache = null; this.rankMap = null; this.admIdx = null; /* bảng xếp hạng / quản trị đọc lại số mới */
    return { ok: true, recorded: [...seen] };
  }
  async changePassword(token, oldPw, newPw) {
    const me = await this.whoami(token); if (!me) return { ok: false, msg: 'Hết phiên đăng nhập' };
    const u = this.one('SELECT * FROM users WHERE id = ?', me.id);
    if (typeof newPw !== 'string' || newPw.length < 6) return { ok: false, msg: 'Mật khẩu mới từ 6 ký tự' };
    if (u.pw && !eqTime(await hashPw(String(oldPw || ''), u.salt), u.pw)) return { ok: false, msg: 'Mật khẩu cũ chưa đúng' };
    if (!u.username) return { ok: false, msg: 'Tài khoản Google không cần mật khẩu' };
    const salt = rand(16); this.sql.exec('UPDATE users SET pw = ?, salt = ? WHERE id = ?', await hashPw(newPw, salt), salt, u.id);
    return { ok: true };
  }
  // ---- quản trị ----
  async claimAdmin(token, key, want, ip = '') { // tài khoản đang đăng nhập + đúng ADMIN_KEY → thành quản trị viên
    const u = await this.whoami(token); if (!u) return { ok: false, msg: 'Đăng nhập trước đã nha' };
    want = String(want || '').trim();
    if (!(await this.adminGuard(ip, null))) return { ok: false, msg: 'Sai nhiều lần quá – khoá 1 giờ' };
    if (!want || !eqTime(String(key || '').trim(), want)) { await this.adminGuard(ip, false); return { ok: false, msg: 'Sai mật khẩu quản trị' }; }
    this.sql.exec('UPDATE users SET admin = 1 WHERE id = ?', u.id);
    return { ok: true, user: this.pub(this.one('SELECT * FROM users WHERE id = ?', u.id)) };
  }
  // chống dò mật khẩu quản trị: tối đa 5 lần sai / giờ / IP và 30 lần sai / giờ toàn máy chủ (lưu bền, IP đã băm)
  async adminGuard(ip, ok) {
    this.sql.exec('CREATE TABLE IF NOT EXISTS adminfail (ip TEXT, t INTEGER)');
    const t = Date.now(), h = await sha256('gumballz:' + ip);
    this.sql.exec('DELETE FROM adminfail WHERE t < ?', t - 3600e3);
    const mine = this.one('SELECT COUNT(*) AS n FROM adminfail WHERE ip = ?', h).n, all = this.one('SELECT COUNT(*) AS n FROM adminfail').n;
    if (mine >= 5 || all >= 30) return false; // đang bị khoá
    if (ok === false) this.sql.exec('INSERT INTO adminfail (ip, t) VALUES (?,?)', h, t);
    return true;
  }
  async isAdmin(token) { const u = await this.whoami(token); return !!(u && u.admin && !u.banned); }
  // 🔎 Quản trị: tìm tài khoản. Gõ không dấu / chữ thường vẫn ra ("dat" khớp "Đạt"), nhiều từ thì phải khớp hết; "#12" = đúng id 12, "@abc" = chỉ tìm tên đăng nhập.
  // opt = { f: all|admin|banned|google|active|new, sort: new|old|name|lv|last, off, lim }. Chỉ mục gọn giữ 20 giây để gõ tới đâu lọc tới đó mà không quét bảng liên tục.
  async adminFind(q, opt = {}) {
    const fold = x => String(x == null ? '' : x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
    if (!this.admIdx || Date.now() - this.admIdx.at > 20e3 || opt.fresh) {
      const rows = this.sql.exec('SELECT id, username, name, google IS NOT NULL AS g, created, banned, admin, prof FROM users').toArray(), list = [];
      for (const r of rows) {
        let P = null; try { P = JSON.parse(r.prof || 'null'); } catch (e) {}
        const st = statOf(P), lv = levelOf(st.p, st.w); let last = 0; if (P && P.g) for (const v of Object.values(P.g)) last = Math.max(last, +(v && v.last) || 0);
        list.push({ id: r.id, username: r.username || null, name: r.name || '', g: !!r.g, created: r.created || 0, banned: !!r.banned, admin: !!r.admin, lv: lv.lv, p: st.p, w: st.w, last,
          av: P && P.av && typeof P.av.e === 'string' ? String(P.av.e).slice(0, 8) : '', _u: fold(r.username), _n: fold(r.name) });
      }
      this.admIdx = { at: Date.now(), list };
    }
    const all = this.admIdx.list, now = Date.now(), W = 7 * 864e5, f = String(opt.f || 'all'), sort = String(opt.sort || 'new');
    const raw = String(q || '').trim().slice(0, 60), toks = fold(raw).split(/\s+/).filter(Boolean);
    let res = all.filter(u => (f === 'admin' ? u.admin : f === 'banned' ? u.banned : f === 'google' ? u.g : f === 'active' ? now - u.last < W : f === 'new' ? now - u.created < W : true)
      && toks.every(t => (t[0] === '#' ? String(u.id) === t.slice(1) : t[0] === '@' ? u._u.includes(t.slice(1)) : u._u.includes(t) || u._n.includes(t) || String(u.id) === t)));
    const cmp = { new: (a, b) => b.id - a.id, old: (a, b) => a.id - b.id, name: (a, b) => a._n.localeCompare(b._n) || a.id - b.id, lv: (a, b) => (b.p * 10 + b.w * 20) - (a.p * 10 + a.w * 20) || b.id - a.id, last: (a, b) => b.last - a.last || b.id - a.id }[sort] || ((a, b) => b.id - a.id);
    res = res.slice().sort(cmp);
    const off = Math.max(0, Math.floor(+opt.off || 0)), lim = Math.max(1, Math.min(100, Math.floor(+opt.lim || 40)));
    const count = k => all.reduce((n, u) => n + (k(u) ? 1 : 0), 0);
    return { users: res.slice(off, off + lim).map(({ _u, _n, ...u }) => u), matched: res.length, total: all.length,
      counts: { admin: count(u => u.admin), banned: count(u => u.banned), google: count(u => u.g), active: count(u => now - u.last < W), new: count(u => now - u.created < W) } };
  }
  async adminSet(id, patch, adminUid = null) {
    const uid = +id;
    if (adminUid && uid === +adminUid) {
      if ('banned' in patch && patch.banned) return { ok: false, msg: 'Không thể tự khoá tài khoản của chính mình' };
      if ('admin' in patch && !patch.admin) return { ok: false, msg: 'Không thể tự gỡ quyền quản trị của chính mình' };
    }
    if ('admin' in patch) this.sql.exec('UPDATE users SET admin = ? WHERE id = ?', patch.admin ? 1 : 0, uid);
    if ('banned' in patch) { this.sql.exec('UPDATE users SET banned = ? WHERE id = ?', patch.banned ? 1 : 0, uid); if (patch.banned) this.sql.exec('DELETE FROM sessions WHERE uid = ?', uid); }
    if (patch.password) { const salt = rand(16); this.sql.exec('UPDATE users SET pw = ?, salt = ? WHERE id = ? AND username IS NOT NULL', await hashPw(String(patch.password), salt), salt, uid); }
    this.admIdx = null; return { ok: true };
  }
  async stats() { return { users: this.one('SELECT COUNT(*) AS n FROM users').n, sessions: this.one('SELECT COUNT(*) AS n FROM sessions WHERE exp > ?', Date.now()).n }; }

  // ---- bạn bè & nhắn tin 1-1 ----
  async friendsList(token) {
    const me = await this.whoami(token); if (!me || me.banned) return { ok: false, msg: 'Đăng nhập để dùng bạn bè' };
    const id = me.id;
    const acc = this.sql.exec(
      `SELECT u.id, u.name, u.username, f.ts FROM friends f JOIN users u ON u.id = (CASE WHEN f.a = ? THEN f.b ELSE f.a END) WHERE (f.a = ? OR f.b = ?) AND f.status = 'acc' AND u.banned = 0`,
      id, id, id
    ).toArray();
    let totalUnread = 0;
    const friends = acc.map(u => {
      const unread = this.one('SELECT COUNT(*) AS n FROM dms WHERE fromId = ? AND toId = ? AND seen = 0', u.id, id).n;
      totalUnread += unread;
      const last = this.one('SELECT msg, ts, fromId FROM dms WHERE (fromId = ? AND toId = ?) OR (fromId = ? AND toId = ?) ORDER BY id DESC LIMIT 1', u.id, id, id, u.id);
      return { id: u.id, name: u.name, username: u.username || null, unread, last: last ? { msg: last.msg, ts: last.ts, mine: last.fromId === id } : null, since: u.ts };
    }).sort((x, y) => ((y.last && y.last.ts) || y.since || 0) - ((x.last && x.last.ts) || x.since || 0));
    const incoming = this.sql.exec(
      `SELECT u.id, u.name, u.username, f.ts FROM friends f JOIN users u ON u.id = f.req WHERE (f.a = ? OR f.b = ?) AND f.status = 'pending' AND f.req != ? AND u.banned = 0 ORDER BY f.ts DESC`,
      id, id, id
    ).toArray().map(u => ({ id: u.id, name: u.name, username: u.username || null, ts: u.ts }));
    const outgoing = this.sql.exec(
      `SELECT u.id, u.name, u.username, f.ts FROM friends f JOIN users u ON u.id = (CASE WHEN f.a = ? THEN f.b ELSE f.a END) WHERE (f.a = ? OR f.b = ?) AND f.status = 'pending' AND f.req = ? AND u.banned = 0 ORDER BY f.ts DESC`,
      id, id, id, id
    ).toArray().map(u => ({ id: u.id, name: u.name, username: u.username || null, ts: u.ts }));
    return { ok: true, friends, incoming, outgoing, unread: totalUnread };
  }
  async friendAdd(token, d = {}) {
    const me = await this.whoami(token); if (!me || me.banned) return { ok: false, msg: 'Đăng nhập để kết bạn' };
    let other = null;
    if (d && d.toId) other = this.one('SELECT id, name, username, banned FROM users WHERE id = ?', +d.toId);
    else {
      const q = String((d && (d.username ?? d.q)) || '').trim().replace(/^@/, '');
      if (!q) return { ok: false, msg: 'Nhập tên đăng nhập hoặc mã #ID' };
      if (/^#?\d+$/.test(q)) {
        const nid = +q.replace(/^#/, '');
        other = this.one('SELECT id, name, username, banned FROM users WHERE id = ? OR username = ?', nid, q.toLowerCase());
      } else {
        other = this.one('SELECT id, name, username, banned FROM users WHERE username = ?', q.toLowerCase());
      }
    }
    if (!other || other.banned) return { ok: false, msg: 'Không tìm thấy người chơi này' };
    if (other.id === me.id) return { ok: false, msg: 'Không thể kết bạn với chính mình' };
    const a = Math.min(me.id, other.id), b = Math.max(me.id, other.id);
    const cur = this.one('SELECT status, req FROM friends WHERE a = ? AND b = ?', a, b);
    const pub = { id: other.id, name: other.name, username: other.username || null };
    if (cur) {
      if (cur.status === 'acc') return { ok: true, already: true, friend: pub, msg: 'Hai bạn đã là bạn bè rồi' };
      if (cur.req !== me.id) {
        this.sql.exec('UPDATE friends SET status = ?, ts = ? WHERE a = ? AND b = ?', 'acc', Date.now(), a, b);
        return { ok: true, accepted: true, friend: pub };
      }
      return { ok: true, pending: true, friend: pub, msg: 'Đã gửi lời mời kết bạn rồi' };
    }
    if (this.one('SELECT COUNT(*) AS n FROM friends WHERE a = ? OR b = ?', me.id, me.id).n >= 100) return { ok: false, msg: 'Danh sách bạn bè đã đầy (tối đa 100)' };
    this.sql.exec('INSERT INTO friends (a, b, status, req, ts) VALUES (?,?,?,?,?)', a, b, 'pending', me.id, Date.now());
    return { ok: true, sent: true, friend: pub };
  }
  async friendAct(token, id, act) {
    const me = await this.whoami(token); if (!me || me.banned) return { ok: false, msg: 'Hết phiên đăng nhập' };
    const oid = +id; if (!oid || oid === me.id) return { ok: false, msg: 'Người dùng không hợp lệ' };
    const a = Math.min(me.id, oid), b = Math.max(me.id, oid);
    if (act === 'accept') {
      const r = this.one('SELECT status, req FROM friends WHERE a = ? AND b = ?', a, b);
      if (!r || r.status !== 'pending' || r.req !== oid) return { ok: false, msg: 'Không còn lời mời này' };
      this.sql.exec('UPDATE friends SET status = ?, ts = ? WHERE a = ? AND b = ?', 'acc', Date.now(), a, b);
      return { ok: true };
    }
    if (act === 'reject') {
      this.sql.exec('DELETE FROM friends WHERE a = ? AND b = ? AND status = ?', a, b, 'pending');
      return { ok: true };
    }
    if (act === 'remove') {
      this.sql.exec('DELETE FROM friends WHERE a = ? AND b = ?', a, b);
      return { ok: true };
    }
    return { ok: false, msg: 'Thao tác không hợp lệ' };
  }
  async dmList(token, withId, afterId = 0) {
    const me = await this.whoami(token); if (!me || me.banned) return { ok: false, msg: 'Hết phiên đăng nhập' };
    const oid = +withId; if (!oid || oid === me.id) return { ok: false, msg: 'Người nhận không hợp lệ' };
    const a = Math.min(me.id, oid), b = Math.max(me.id, oid);
    const fr = this.one('SELECT status FROM friends WHERE a = ? AND b = ?', a, b);
    if (!fr || fr.status !== 'acc') return { ok: false, msg: 'Hai bạn chưa kết bạn' };
    const after = Math.max(0, Math.floor(+afterId || 0));
    const msgs = after > 0
      ? this.sql.exec('SELECT id, fromId, toId, msg, ts FROM dms WHERE ((fromId = ? AND toId = ?) OR (fromId = ? AND toId = ?)) AND id > ? ORDER BY id ASC LIMIT 50', me.id, oid, oid, me.id, after).toArray()
      : this.sql.exec('SELECT * FROM (SELECT id, fromId, toId, msg, ts FROM dms WHERE (fromId = ? AND toId = ?) OR (fromId = ? AND toId = ?) ORDER BY id DESC LIMIT 80) ORDER BY id ASC', me.id, oid, oid, me.id).toArray();
    this.sql.exec('UPDATE dms SET seen = 1 WHERE fromId = ? AND toId = ? AND seen = 0', oid, me.id);
    const other = this.one('SELECT id, name, username FROM users WHERE id = ?', oid);
    return { ok: true, msgs, other: other ? { id: other.id, name: other.name, username: other.username || null } : null };
  }
  async dmSend(token, toId, text) {
    const me = await this.whoami(token); if (!me || me.banned) return { ok: false, msg: 'Hết phiên đăng nhập' };
    const oid = +toId; if (!oid || oid === me.id) return { ok: false, msg: 'Người nhận không hợp lệ' };
    const a = Math.min(me.id, oid), b = Math.max(me.id, oid);
    const fr = this.one('SELECT status FROM friends WHERE a = ? AND b = ?', a, b);
    if (!fr || fr.status !== 'acc') return { ok: false, msg: 'Cần kết bạn trước khi nhắn tin' };
    const other = this.one('SELECT id, banned FROM users WHERE id = ?', oid);
    if (!other || other.banned) return { ok: false, msg: 'Tài khoản này không khả dụng' };
    const now = Date.now(), last = this.dmRate.get(me.id) || 0;
    if (now - last < 350) return { ok: false, msg: 'Nhắn chậm lại chút nha' };
    this.dmRate.set(me.id, now);
    const raw = String(text || '').trim().slice(0, 400);
    const msg = clean(raw).text;
    if (!msg) return { ok: false, msg: 'Tin nhắn trống' };
    this.sql.exec('INSERT INTO dms (fromId, toId, msg, ts, seen) VALUES (?,?,?,?,0)', me.id, oid, msg, now);
    const row = this.one('SELECT id, fromId, toId, msg, ts FROM dms WHERE fromId = ? AND toId = ? ORDER BY id DESC LIMIT 1', me.id, oid);
    this.sql.exec('DELETE FROM dms WHERE ((fromId = ? AND toId = ?) OR (fromId = ? AND toId = ?)) AND id NOT IN (SELECT id FROM dms WHERE (fromId = ? AND toId = ?) OR (fromId = ? AND toId = ?) ORDER BY id DESC LIMIT 250)', me.id, oid, oid, me.id, me.id, oid, oid, me.id);
    return { ok: true, msg: row };
  }
  async leaderboard(d = {}, token = '') {
    const game = String(d?.game || 'all').slice(0, 24);
    const by = ['xp', 'wins', 'streak'].includes(d?.by) ? d.by : (game === 'all' ? 'xp' : 'wins');
    const meUser = token ? await this.whoami(token) : null;
    const ck = game + '|' + by, hit = this.lbCache && this.lbCache.get(ck); /* giữ 30 giây: khỏi quét + đọc JSON cả bảng users ở mỗi lượt xem */
    if (hit && Date.now() - hit.at < 30e3) return { ok: true, game, by, total: hit.entries.length, list: hit.entries.slice(0, 50), me: meUser ? (hit.entries.find(e => e.id === meUser.id) || null) : null };
    const rows = this.sql.exec('SELECT id, username, name, prof, created FROM users WHERE banned = 0 AND prof IS NOT NULL').toArray();
    const ranks = game === 'all' && by === 'xp' ? null : await this.ranks(); /* thứ hạng chung (để tính danh hiệu Top 1/3/10) */
    const entries = [];
    for (const r of rows) {
      let pf; try { pf = JSON.parse(r.prof); } catch (e) { continue; }
      if (!pf || typeof pf !== 'object') continue;
      const g = pf.g && typeof pf.g === 'object' ? pf.g : {};
      let p = 0, w = 0;
      if (game === 'all') {
        for (const v of Object.values(g)) if (v && typeof v === 'object') { p += Math.max(0, Math.min(99999, +v.p || 0)); w += Math.max(0, Math.min(99999, +v.w || 0)); }
      } else {
        const gv = g[game];
        if (gv && typeof gv === 'object') { p = Math.max(0, Math.min(99999, +gv.p || 0)); w = Math.max(0, Math.min(99999, +gv.w || 0)); }
      }
      w = Math.min(w, p);
      const best = Math.max(0, Math.min(999, +pf.best || 0));
      if (p <= 0 && w <= 0 && (by !== 'streak' || best <= 0)) continue;
      const xp = p * 10 + w * 20;
      const lv = Math.min(10, Math.floor(Math.sqrt(xp / 50)) + 1);
      const rate = p > 0 ? Math.round((w / p) * 100) : 0;
      const av = pf.av && typeof pf.av === 'object' ? { e: String(pf.av.e || '🐱').slice(0, 8), c: +pf.av.c || 0 } : null;
      const safeName = clean(String(r.name || 'Người chơi')).text || 'Người chơi';
      entries.push({ id: r.id, username: r.username || null, name: safeName, p, w, xp, lv, best, rate, av, _pf: pf, _c: r.created });
    }
    entries.sort((a, b) => {
      if (by === 'streak') return b.best - a.best || b.w - a.w || b.xp - a.xp;
      if (by === 'wins') return b.w - a.w || b.rate - a.rate || b.p - a.p;
      return b.xp - a.xp || b.w - a.w || b.p - a.p;
    });
    entries.forEach((e, i) => { e.rank = i + 1; });
    if (!ranks) { this.rankMap = new Map(entries.map(e => [e.id, e.rank])); this.rankAt = Date.now(); this.rankTotal = entries.length; }
    for (const e of entries) { const t = pickTitle(titlesOf(statOf(e._pf, { created: e._c, rank: (ranks || this.rankMap).get(e.id) || 0 })), e._pf.title); e.title = t ? { id: t.id, icon: t.icon, name: t.name } : null; delete e._pf; delete e._c; }
    if (!this.lbCache) this.lbCache = new Map(); if (this.lbCache.size > 80) this.lbCache.clear(); this.lbCache.set(ck, { at: Date.now(), entries });
    const me = meUser ? (entries.find(e => e.id === meUser.id) || null) : null;
    return { ok: true, game, by, total: entries.length, list: entries.slice(0, 50), me };
  }
  /* thứ hạng chung theo điểm (id → hạng), làm mới cùng nhịp 30 giây với bảng xếp hạng */
  async ranks() { if (!this.rankMap || Date.now() - (this.rankAt || 0) > 30e3) await this.leaderboard({ game: 'all', by: 'xp' }); return this.rankMap || new Map(); }
  // 👤 Hồ sơ công khai của một thành viên (ai cũng xem được): chỉ gồm tên hiện, tên đăng nhập, hình đại diện, số liệu chơi, thành tích, danh hiệu.
  // KHÔNG có email, mật khẩu hay thứ gì riêng tư. Tài khoản bị khoá thì coi như không có.
  async publicProfile(key) {
    const k = String(key == null ? '' : key).trim().toLowerCase().slice(0, 24);
    const u = /^\d+$/.test(k) ? this.one('SELECT id, username, name, prof, created, banned FROM users WHERE id = ?', +k) : USER.test(k) ? this.one('SELECT id, username, name, prof, created, banned FROM users WHERE username = ?', k) : null;
    if (!u || u.banned) return { ok: false, msg: 'Không tìm thấy thành viên này' };
    let P = null; try { P = JSON.parse(u.prof || 'null'); } catch (e) {}
    P = P && typeof P === 'object' ? P : {};
    const ranks = await this.ranks(), rank = ranks.get(u.id) || 0, st = statOf(P, { created: u.created, rank }), lv = levelOf(st.p, st.w), titles = titlesOf(st), t = pickTitle(titles, P.title);
    const games = Object.keys(st.plays).sort((a, b) => st.plays[b] - st.plays[a]).slice(0, 8).map(g => ({ g, p: st.plays[g], w: st.wins[g] || 0 }));
    const av = P.av && typeof P.av === 'object' ? { e: String(P.av.e || '🐱').slice(0, 8), c: +P.av.c || 0 } : null;
    /* không trả cờ quản trị: ai là quản trị viên không phải thứ cần cho cả làng biết (đỡ bị dò mật khẩu) */
    return { ok: true, user: { id: u.id, username: u.username || null, name: clean(String(u.name || 'Người chơi')).text || 'Người chơi', created: u.created, av,
      lv: lv.lv, lvName: lv.name, xp: lv.xp, p: st.p, w: st.w, rate: st.p ? Math.round(st.w / st.p * 100) : 0, best: st.best, days: st.days, kinds: st.kinds, rank, total: this.rankTotal || 0,
      games, ach: [...new Set([...Object.keys(P.ach && typeof P.ach === 'object' ? P.ach : {}), ...Object.keys(P.v && P.v.ach && typeof P.v.ach === 'object' ? P.v.ach : {})])].filter(x => /^[a-z0-9_-]{1,30}$/i.test(x)).slice(0, 120), titles, title: t } }; /* thành tích hiện = mốc cũ + máy chủ tự xét */
  }
}

// ---- xác minh Google ID token (RS256, khoá công khai của Google, cache 1 giờ) ----
let JWKS = null, JWKS_AT = 0;
async function verifyGoogle(jwt, clientId) {
  const [h, p, sig] = String(jwt || '').split('.'); if (!sig) return null;
  const head = JSON.parse(new TextDecoder().decode(unb64u(h))), body = JSON.parse(new TextDecoder().decode(unb64u(p)));
  if (head.alg !== 'RS256') return null;
  if (!JWKS || Date.now() - JWKS_AT > 3600e3) { JWKS = (await (await fetch('https://www.googleapis.com/oauth2/v3/certs')).json()).keys; JWKS_AT = Date.now(); }
  let jwk = JWKS.find(k => k.kid === head.kid);
  if (!jwk && Date.now() - JWKS_AT > 60e3) { JWKS = (await (await fetch('https://www.googleapis.com/oauth2/v3/certs')).json()).keys; JWKS_AT = Date.now(); jwk = JWKS.find(k => k.kid === head.kid); } /* Google vừa đổi khoá: tải lại (tối đa 1 lần/phút) thay vì báo lỗi cả tiếng */
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, unb64u(sig), te.encode(h + '.' + p));
  if (!ok) return null;
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(body.iss)) return null;
  if (body.aud !== clientId || body.exp * 1000 < Date.now()) return null;
  return body;
}
