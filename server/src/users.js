// Tài khoản GumballZ: tên đăng nhập + mật khẩu (PBKDF2-SHA256) hoặc Google (ID token).
// Không bắt buộc – ai không đăng nhập vẫn chơi như khách.
import { DurableObject } from 'cloudflare:workers';
import { cleanName, clean } from './filter.js';
import { statOf, titlesOf, pickTitle, levelOf, gameXp, xpOfG, xpAdjOf } from '../../shared/titles.js'; /* danh hiệu: dùng chung công thức với web */
import { cleanAvatar, avatarUsable } from '../../shared/avatar-sync.js'; /* 🧸 nhân vật: chỉ nhận các trường đã biết */
import { isKnownPart, FRAMES, NAME_COLORS, BANNERS, VIP_WIDS } from '../../shared/js/avatar-rewards.js'; /* 🧸 linh kiện trúng rương: chỉ nhận id trong LOCKED_PARTS; 🎁 khung/màu/banner để cấp tay (patch -127) */
import { checkVip } from './vip-unlocks.js'; /* 🏆 chuỗi top BXH mở món VIP (patch -143) */

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
const OWNER_ID = 1; /* tài khoản đầu tiên = chủ web (khớp /vip/pass trong index.js) */

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

/* 💰 Chống reset ví — quy tắc nhận ví gửi lên: chỉ nhận khi at mới hơn BẮT BUỘC (>).
   Ví mới chưa có giao dịch nào có at = 0 → KHÔNG BAO GIỜ đè được ví đã lưu, kể cả ví đã lưu là 0 xu
   (xài hết xu → xóa dữ liệu → đăng nhập lại → client gửi blank 100@0 → máy chủ giữ nguyên số dư cũ).
   100 xu khởi đầu chỉ có ở client (blank() lúc mở ví lần đầu) — máy chủ không bao giờ tự cấp xu. */
export function walletAccepts(storedAt, incomingAt) {
  const n = v => Math.min(4e12, Math.max(0, Math.floor(+v || 0)));
  return n(incomingAt) > n(storedAt);
}

/* 🎁 Cấp vật phẩm thủ công (patch -127, chỉ Quản trị role 2 qua /admin/list):
   - Danh sách wid hợp lệ: khung/màu tên/banner lấy từ avatar-rewards.js (cùng nguồn với shop/rương),
     4 lưng bài ghi tay ở đây vì lưng bài chỉ có trong COSMETICS.backs của wallet.js — mà server KHÔNG
     import được wallet.js (nó import avatar-rewards.js?v=3, wrangler không resolve được) — thêm lưng bài
     mới thì thêm id vào cả 2 chỗ (GRANT_BACKS này + COSMETICS.backs trong wallet.js).
   - Món được cấp lưu vào P.granted (danh sách riêng, chỉ thêm không bớt — giống cách gộp linh kiện
     P.parts): KHÔNG sửa thẳng P.wal.own, vì ví client đồng bộ sau (at mới hơn) sẽ ghi đè cả P.wal
     và làm mất món cấp. mergeGranted() gộp P.granted vào P.wal.own ở mỗi lần profile()/claimLogin(),
     user nhận món sau lần đồng bộ/đăng nhập lại tiếp theo. */
export const GRANT_ITEMS = new Map(); // wid -> tên món hiển thị
for (const f of FRAMES) if (f && f.id) GRANT_ITEMS.set('frame:' + f.id, f.name || f.id);
for (const c of NAME_COLORS) if (c && c.id) GRANT_ITEMS.set('color:' + c.id, c.name || c.id);
for (const b of BANNERS) if (b && b.id) GRANT_ITEMS.set('banner:' + b.id, b.name || b.id);
const GRANT_BACKS = { hongphan: 'Lưng bài Hồng Phấn', lucdam: 'Lưng bài Lục Đậm', timbiec: 'Lưng bài Tím Biếc', vangchanh: 'Lưng bài Vàng Chanh' };
for (const [id, name] of Object.entries(GRANT_BACKS)) GRANT_ITEMS.set('back:' + id, name);
const GRANT_OWNER_ONLY = new Set(); // 🎁 món riêng Chủ web (lock 'admin') không cấp tay được (patch -131) — rào ở server, dropdown chỉ là lớp ngoài
for (const f of FRAMES) if (f && f.id && f.lock === 'admin') GRANT_OWNER_ONLY.add('frame:' + f.id);
for (const c of NAME_COLORS) if (c && c.id && c.lock === 'admin') GRANT_OWNER_ONLY.add('color:' + c.id);
export function mergeGranted(P) { // gộp P.granted vào P.wal.own; trả true nếu đã thêm món mới (cần lưu prof)
  if (!P || !Array.isArray(P.granted) || !P.granted.length) return false;
  if (!P.wal || typeof P.wal !== 'object') return false; // chưa có ví trên máy chủ: giữ trong P.granted, đợi ví đầu tiên lên rồi gộp
  const granted = [...new Set(P.granted.filter(x => typeof x === 'string' && GRANT_ITEMS.has(x)))].slice(0, 200);
  if (!granted.length) return false;
  const own = Array.isArray(P.wal.own) ? P.wal.own : [];
  const merged = [...new Set([...own, ...granted])].slice(0, 200);
  if (merged.length === own.length) return false;
  P.wal.own = merged;
  P.wal.at = Math.max(Date.now(), Math.floor(+P.wal.at || 0) + 1); // đóng dấu mới hơn để máy user nhận ví mới (adoptServer)
  return true;
}

/* ✏️ Sửa dữ liệu người dùng (patch -167): đặt lại TỔNG ván/thắng bằng cách phân bổ chênh lệch vào P.g
   (nguồn sự thật duy nhất của tổng ván/thắng/XP — statOf()/leaderboard()/adminFind() đều cộng từ P.g).
   - Tăng ván → cộng vào game chơi nhiều nhất (giữ "game chơi nhiều nhất" đúng).
   - Giảm ván → trừ từ game chơi nhiều nhất trước, không bao giờ để w > p ở từng game.
   - Tăng thắng → cộng vào game còn dư chỗ (p - w), chơi nhiều nhất trước; giảm thắng → trừ từ game
     thắng nhiều nhất trước. Game nào về 0 ván thì xoá khỏi P.g cho gọn.
   - Chưa chơi game nào mà vẫn tăng ván (vd. tài khoản mới): ghi vào 'typhu' (Cờ Tỷ Phú, game cờ đầu
     của web) và ghi rõ trong nhật ký — tránh bịa 1 game "ảo" không có thật trong danh sách 92 game. */
function applyTotalsEdit(P, p1, w1) {
  const g = (P.g && typeof P.g === 'object') ? P.g : (P.g = {});
  const totals = () => { let p = 0, w = 0; for (const v of Object.values(g)) { const gp = Math.max(0, Math.floor(+v.p || 0)); p += gp; w += Math.min(gp, Math.max(0, Math.floor(+v.w || 0))); } return { p, w }; };
  const byPlays = () => Object.keys(g).map(k => ({ k, p: Math.max(0, Math.floor(+g[k].p || 0)), w: Math.min(Math.max(0, Math.floor(+g[k].p || 0)), Math.max(0, Math.floor(+g[k].w || 0))) })).sort((a, b) => b.p - a.p || b.w - a.w);
  const setG = (k, p, w) => { if (p <= 0) delete g[k]; else g[k] = { p, w: Math.min(p, Math.max(0, w)), last: Math.max(0, Math.floor(+((g[k] || {}).last) || 0)) }; };
  let topGame = null;
  const dp = p1 - totals().p;
  if (dp > 0) {
    const gs = byPlays();
    topGame = gs.length ? gs[0].k : 'typhu';
    const cur = g[topGame] || { p: 0, w: 0 };
    setG(topGame, cur.p + dp, cur.w);
  } else if (dp < 0) {
    let rem = -dp;
    for (const { k, p, w } of byPlays()) { if (rem <= 0) break; const take = Math.min(p, rem); setG(k, p - take, Math.min(w, p - take)); rem -= take; }
  }
  let dw = w1 - totals().w;
  if (dw > 0) {
    let rem = dw;
    for (const { k, p, w } of byPlays()) { if (rem <= 0) break; const room = p - w; if (room <= 0) continue; const add = Math.min(room, rem); setG(k, p, w + add); rem -= add; }
  } else if (dw < 0) {
    let rem = -dw;
    for (const { k, p, w } of byPlays().sort((a, b) => b.w - a.w || b.p - a.p)) { if (rem <= 0) break; const take = Math.min(w, rem); setG(k, p, w - take); rem -= take; }
  }
  return { game: topGame, dp, dw };
}

/* 🎁 Điểm danh hằng ngày — bảng thưởng chu kỳ 7 ngày, tăng dần (giờ VN).
   Ngày trong chu kỳ = ((chuỗi - 1) % 7) + 1; nhận xong ngày 7 thì hôm sau quay lại ngày 1.
   Bỏ 1 ngày → chuỗi về 1. Máy chủ tự kiểm: 1 ngày chỉ nhận 1 lần. */
export const LOGIN_REWARDS = [20, 30, 40, 50, 60, 80, 100];
export function loginDayResult(prev, today, yesterday) {
  const last = prev && typeof prev.last === 'string' ? prev.last : '';
  const streak = last === yesterday ? Math.max(1, Math.floor(+prev.streak || 0)) + 1 : 1;
  const day = ((streak - 1) % 7) + 1;
  return { streak, day, xu: LOGIN_REWARDS[day - 1] };
}
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
  let p = 0, w = 0, kinds = 0, top = 0, xp = 0; const wins = {};
  for (const k of Object.keys(g)) { const v = g[k] || {}, gp = Math.max(0, Math.floor(+v.p || 0)), gw = Math.min(gp, Math.max(0, Math.floor(+v.w || 0))); p += gp; w += gw; if (gp) kinds++; top = Math.max(top, gw); wins[k] = gw; xp += gameXp(k, gp, gw); }
  xp = Math.max(0, xp + xpAdjOf(P)); /* ✏️ XP do Quản trị sửa tay (patch -167): cộng phần chênh lệch */
  const vg = V.g || {}; let vloss = 0; for (const v of Object.values(vg)) vloss += Math.max(0, Math.floor(+v.l || 0));
  const days = new Set([...(Array.isArray(P.days) ? P.days : []), ...(Array.isArray(V.days) ? V.days : [])]).size;
  return { p, w, xp, kinds, top, days, best: Math.min(w, Math.max(0, Math.floor(+P.best || 0))), night: !!P.night, ls: Math.max(0, Math.floor(+V.ls || 0)), vloss,
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
  { id: 'c-allgames', ok: t => t.kinds >= 96 }, /* đủ 96 game trong GAME_NAMES (shared/ui/stats.js) */
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
    this.sql.exec(`CREATE TABLE IF NOT EXISTS blocks (a INTEGER, b INTEGER, ts INTEGER, PRIMARY KEY (a, b))`); // 🚫 a chặn b (20/11/2026)
    this.sql.exec(`CREATE INDEX IF NOT EXISTS dms_pair ON dms (fromId, toId, ts)`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS dms_to ON dms (toId, seen)`);
    try { this.sql.exec('ALTER TABLE users ADD COLUMN admin INTEGER DEFAULT 0'); } catch (e) {} // cột quản trị (bản 11/2026)
    try { this.sql.exec('ALTER TABLE users ADD COLUMN role INTEGER DEFAULT 0'); } catch (e) {} // 🎭 phân quyền (patch -93): 0 người chơi, 1 Mod, 2 Quản trị; admin = 1 tương đương role ≥ 1 (giữ song song để tương thích)
    try { this.sql.exec('ALTER TABLE users ADD COLUMN supporter INTEGER DEFAULT 0'); } catch (e) {} // 💎 người ủng hộ đặc biệt (patch -95): 0/1, độc lập với role – chỉ Quản trị cấp tay (vd. sau khi ủng hộ qua VietQR)
    try { this.sql.exec('ALTER TABLE users ADD COLUMN vip INTEGER DEFAULT 0'); } catch (e) {} // 💠 VIP (patch -142): 0/1, độc lập với role – chỉ Quản trị cấp tay, như supporter
    try { this.sql.exec('ALTER TABLE users ADD COLUMN dev INTEGER DEFAULT 0'); } catch (e) {} // 💻 DEV (patch -142): 0/1, độc lập với role – chỉ Quản trị cấp tay; mặc định 0 cho mọi người kể cả chủ web
    try { this.sql.exec('ALTER TABLE users ADD COLUMN supamt INTEGER DEFAULT 0'); } catch (e) {} // ☕ tổng tiền đã ủng hộ (patch -102): cộng dồn qua SePay/duyệt tay; supporter = 1 khi supamt ≥ 1 (bậc 1 = bất kỳ số tiền nào)
    this.sql.exec(`CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, actorId INTEGER, actorName TEXT, action TEXT, targetId INTEGER, targetName TEXT, detail TEXT)`); // 📜 nhật ký quản trị (patch -93)
    this.sql.exec(`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)`); // 👑 chủ web hiện tại (patch -94): k='owner', v=id tài khoản chủ web
    this.sql.exec(`INSERT OR IGNORE INTO meta (k, v) VALUES ('owner', '1')`); // mặc định: tài khoản đầu tiên = chủ web
    try { this.sql.exec("ALTER TABLE users ADD COLUMN mute TEXT DEFAULT '{\"c\":0,\"v\":0}'"); } catch (e) {} // 🔇 lệnh cấm theo tài khoản (20/11/2026): {c: cấm chat tới, v: cấm mở phiếu tới}
    try { this.sql.exec('ALTER TABLE users ADD COLUMN prof TEXT'); this.sql.exec('ALTER TABLE users ADD COLUMN profOp TEXT'); } catch (e) {} // hồ sơ đồng bộ theo tài khoản (số ván, thành tích, avatar)
    this.sql.exec(`CREATE TABLE IF NOT EXISTS vgames (k TEXT PRIMARY KEY, ts INTEGER)`); // 🛡️ chống gian lận: khoá các ván máy chủ đã ghi (chống ghi trùng khi phòng ngủ rồi thức dậy phát lại view cuối)
  }
  roleOf(u) { // 🎭 0 người chơi, 1 Mod, 2 Quản trị; tài khoản admin=1 cũ (chưa có role) → 2
    if (!u) return 0;
    if (u.role != null && u.role !== '') return Math.max(0, Math.min(2, +u.role || 0));
    return u.admin ? 2 : 0;
  }
  pub(u) { return u && { id: u.id, username: u.username || null, name: u.name, google: !!u.google, banned: !!u.banned, admin: this.roleOf(u) >= 1, role: this.roleOf(u), owner: this.isOwnerId(u.id) ? 1 : 0, supporter: u.supporter ? 1 : 0, vip: u.vip ? 1 : 0, dev: u.dev ? 1 : 0 }; } // 👑 owner: 1 khi là chủ web hiện tại (patch -94) · 💎 supporter: 1 khi là người ủng hộ đặc biệt (patch -95) · 💠 vip / 💻 dev: cờ huy hiệu do Quản trị cấp (patch -142)
  one(q, ...a) { const r = this.sql.exec(q, ...a).toArray(); return r[0] || null; }
  async addSup(uid, amt) { /* ☕ cộng tiền ủng hộ vào tài khoản (patch -102): SePay/duyệt tay gọi; amt âm = trừ (khi xoá khoản nhầm) */
    const u = this.one('SELECT id, name, supamt FROM users WHERE id = ? AND banned = 0', +uid); if (!u) return null;
    const total = Math.max(0, (u.supamt || 0) + Math.floor(+amt || 0));
    this.sql.exec('UPDATE users SET supamt = ?, supporter = ? WHERE id = ?', total, total >= 1 ? 1 : 0, u.id);
    if (this.lbCache) this.lbCache.clear();
    return { id: u.id, name: u.name, supamt: total, supporter: total >= 1 ? 1 : 0 };
  }
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
    this.admIdx = null; // tài khoản mới phải hiện ngay ở tab Tài khoản của panel quản trị
    const u = this.one('SELECT * FROM users WHERE username = ?', username);
    return { ok: true, token: await this.session(u.id), user: this.pub(u), new: true }; /* tài khoản mới tạo → web mở bước chọn nhân vật */
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
    let isNew = false;
    if (!u) {
      const nm = cleanName(p.given_name || p.name || 'Người chơi') || 'Người chơi';
      this.sql.exec('INSERT INTO users (name, google, email, created) VALUES (?,?,?,?)', nm.includes('*') ? 'Người chơi' : nm, p.sub, '', Date.now()); // không lưu email
      this.admIdx = null; // tài khoản mới phải hiện ngay ở tab Tài khoản của panel quản trị
      u = this.one('SELECT * FROM users WHERE google = ?', p.sub);
      isNew = true;
    }
    if (u.banned) return { ok: false, msg: 'Tài khoản đang bị khoá' };
    return { ok: true, token: await this.session(u.id), user: this.pub(u), new: isNew }; /* Google lần đầu → web mở bước chọn nhân vật */
  }
  async whoami(token) {
    if (!token || typeof token !== 'string' || token.length > 100) return null;
    const s = this.one('SELECT * FROM sessions WHERE tok = ?', await sha256(token));
    if (!s || s.exp < Date.now()) return null;
    return this.pub(this.one('SELECT * FROM users WHERE id = ?', s.uid));
  }
  /* ✨ diện mạo chat (2026-11-21): khung + màu tên của tài khoản, để Sảnh gắn vào tin nhắn */
  async avOf(uid) {
    const row = this.one('SELECT prof FROM users WHERE id = ?', +uid || 0);
    if (!row) return null;
    let P = null; try { P = JSON.parse(row.prof || 'null'); } catch (e) {}
    if (!P || typeof P !== 'object') return null;
    const av = cleanAvatar(P.av);
    if (!av) return null;
    return { f: av.f || '', n: av.n || '', nf: av.nf || '', ne: av.ne || '' }; /* ✍️ font + hiệu ứng chữ tên (patch -154) */
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
       không cộng dồn — trình duyệt tự cộng/trừ rồi gửi cả ví lên. Chỉ nhận các id đồ đã biết, số xu tối đa 10 triệu.
       walletAccepts: at mới hơn BẮT BUỘC — ví blank at = 0 không bao giờ đè ví đã lưu (kể cả ví 0 xu). */
    if (d.wal && typeof d.wal === 'object' && walletAccepts(P.wal && P.wal.at, d.wal.at)) {
      const w = d.wal, inv = {};
      if (w.inv && typeof w.inv === 'object') for (const k of ['bt-trap', 'bt-radar', 'bt-nuke', 'dbl-xu']) inv[k] = Math.min(999, num(w.inv[k]));
      const own = Array.isArray(w.own) ? [...new Set(w.own.filter(x => typeof x === 'string' && /^(frame|color|back|banner):[a-z]{2,14}$/.test(x)))].slice(0, 200) : [];
      const eq = {}; if (w.eq && typeof w.eq.back === 'string' && /^[a-z]{2,14}$/.test(w.eq.back)) eq.back = w.eq.back;
      P.wal = { xu: Math.min(10000000, num(w.xu)), inv, own, eq, dbl: Math.min(99, num(w.dbl)), chest: Math.min(100000, num(w.chest)), at: num(w.at, 4e12) };
      changed = true;
    }
    if (mergeGranted(P)) changed = true; /* 🎁 vật phẩm cấp tay (patch -127): gộp P.granted vào ví để user nhận được sau khi đồng bộ */
    { const ranks = await this.ranks(); const v = checkVip(P, ranks.get(me.id) || 0); if (v.changed) changed = true; } /* 🏆 chuỗi top BXH mở món VIP (patch -143): ranks() cache 30s nên không tốn thêm lần quét BXH */
    /* 🧸 Nhân vật: giữ đủ nhân vật 3D (kind/skin/hair/hat/outfit/màu/giới tính/khung/màu tên).
       Bản mới hơn thì thắng; cùng thời gian thì bản đủ (có nhân vật) thắng bản thiếu — để tài khoản cũ
       từng mất nhân vật tự lành khi máy chính đồng bộ lại. Bản thiếu {e:'ch'} không có nhân vật thì
       không bao giờ được đè lên bản đủ (bản cũ của web trước đây chỉ gửi e/c/t nên mới mất nhân vật). */
    { const nav = cleanAvatar(d.av), curT = num(P.av && P.av.t, 4e12);
      const navOk = avatarUsable(nav), curOk = avatarUsable(P.av);
      if (nav && (nav.t > curT || (nav.t === curT && navOk && !curOk)) && (navOk || !curOk)) { P.av = nav; changed = true; } }
    /* 🧸 Linh kiện trúng rương (mở sớm hơn cấp): chỉ GỘP (hợp nhất) chứ không thay thế — mở khoá chỉ thêm
       chứ không bớt, nên 2 máy mở rương khác nhau thì cả 2 món đều còn. Chỉ nhận id trong LOCKED_PARTS
       (id lạ / id không khoá theo cấp bị loại). Cấp mở linh kiện thì máy chủ tự suy ra từ XP, không cần gửi. */
    if (Array.isArray(d.parts)) {
      const cur = Array.isArray(P.parts) ? P.parts.filter(x => typeof x === 'string' && isKnownPart(x)) : [];
      const merged = [...new Set([...cur, ...d.parts.filter(x => typeof x === 'string' && isKnownPart(x))])].slice(0, 40);
      if (merged.length !== cur.length) { P.parts = merged; changed = true; }
    }
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
        if (!/^[a-z]{2,14}$/.test(g) || (!P.g[g] && Object.keys(P.g).length >= 100)) continue; /* tối đa 100 game trong hồ sơ — site đang hướng tới 92 game, mức 40 cũ đã không đủ từ lúc có 41 game */
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
      { let tw = 0; for (const v of Object.values(P.g)) tw += num(v && v.w);
        /* ✏️ admin sửa chuỗi tốt nhất (patch -167): số best do máy gửi chỉ nhận khi ván mới nhất của máy đó
           chơi SAU lần sửa (lastT > bestAt) — không thì đó là số cũ trên máy, nhận vào là mất lần sửa.
           Máy nhận số mới qua sync.js (bestAt mới hơn lần đồng bộ trước → lấy P.best, không lấy max). */
        const staleBest = num(P.bestAt, 4e12) > 0 && num(d.lastT, 4e12) <= num(P.bestAt, 4e12);
        P.best = Math.min(tw, staleBest ? num(P.best) : Math.max(num(P.best), num(d.best))); } /* chuỗi thắng không thể dài hơn tổng số ván thắng */
      if (num(d.lastT, 4e12) >= num(P.lastT, 4e12)) { P.streak = num(d.streak); P.lastT = num(d.lastT, 4e12); }
      if (d.night) P.night = 1;
      const f = num(d.first, 4e12); if (f && (!P.first || f < P.first)) P.first = f;
      this.sql.exec('UPDATE users SET profOp = ? WHERE id = ?', op, me.id);
      changed = true;
    }
    /* chốt mốc ván đã xác minh ở lần đồng bộ này (để lần sau trừ trùng); cập nhật cả khi gói này không có op mới
       vì client lấy tổng P.g trả về làm mốc mới cho lần gửi sau */
    { const snap = {}; for (const [g, v] of Object.entries((P.v && P.v.g) || {})) snap[g] = { p: Math.max(0, Math.floor(+v.p || 0)), w: Math.max(0, Math.floor(+v.w || 0)) }; P.syncV = snap; changed = true; }
    if (changed) this.sql.exec('UPDATE users SET prof = ? WHERE id = ?', JSON.stringify(P), me.id);
    return { ok: true, prof: P };
  }
  // 🎁 Điểm danh hằng ngày: nhận xu 1 lần/ngày (giờ VN), chuỗi tăng dần, chu kỳ 7 ngày (20/30/40/50/60/80/100).
  // Máy chủ là chuẩn: lưu P.dl = { last: 'YYYY-MM-DD', streak, total }. Khách không có tài khoản thì client
  // tự lưu localStorage (xóa dữ liệu sẽ mất chuỗi — ghi rõ trong giao diện).
  // d = { check?: true, wal?: snapshot ví client } — wal gửi kèm để gộp TRƯỚC khi cộng thưởng: lấy bản mới
  // hơn trong 2 bản (máy chủ / client) làm nền rồi mới cộng, để không mất xu kiếm được ở máy khác chưa kịp
  // đồng bộ, cũng không mất xu mua đồ ở máy này chưa kịp đồng bộ. Ví chưa từng có trên máy chủ (P.wal chưa
  // có) thì nhận luôn bản client gửi lên làm nền (tài khoản mới: 100 xu khởi đầu) — chỉ khi chưa có ví nào,
  // không bao giờ đè ví đã lưu. Đóng dấu ví mới = max(giờ, nền.at + 1) để client adoptServer() nhận được.
  async claimLogin(token, d = {}) {
    const me = await this.whoami(token); if (!me) return { ok: false, msg: 'Hết phiên đăng nhập' };
    const row = this.one('SELECT prof FROM users WHERE id = ?', me.id);
    let P = null; try { P = JSON.parse(row.prof || 'null'); } catch (e) {}
    P = P && typeof P === 'object' ? P : {}; P.g = P.g || {}; P.ach = P.ach || {}; P.days = P.days || [];
    const num = (v, max = 1e6) => Math.min(max, Math.max(0, Math.floor(+v || 0)));
    if (migrateProf(P)) { /* lần đầu: chốt mốc legacy — lưu cùng lúc với điểm danh bên dưới */ }
    const dl = P.dl && typeof P.dl === 'object' ? P.dl : { last: '', streak: 0, total: 0 };
    const today = vnDay(Date.now()), yest = vnDay(Date.now() - 864e5);
    const next = loginDayResult(dl, today, yest); /* chuỗi/ngày/xu NẾU nhận hôm nay */
    const state = () => ({ claimed: dl.last === today, day: dl.last === today ? ((num(dl.streak) - 1) % 7) + 1 : next.day, streak: num(dl.streak), total: num(dl.total), nextDay: next.day, nextXu: next.xu, last: dl.last || '', wal: P.wal || null });
    if (d.check) return { ok: true, ...state() };
    if (dl.last === today) return { ok: false, already: true, msg: 'Hôm nay đã nhận rồi nha', ...state() };
    /* gộp ví client gửi lên (cùng luật như profile, + nhận bản đầu tiên khi máy chủ chưa có ví) */
    if (d.wal && typeof d.wal === 'object') {
      const w = d.wal;
      if (!P.wal || walletAccepts(P.wal.at, w.at)) {
        const inv = {};
        if (w.inv && typeof w.inv === 'object') for (const k of ['bt-trap', 'bt-radar', 'bt-nuke', 'dbl-xu']) inv[k] = Math.min(999, num(w.inv[k]));
        const own = Array.isArray(w.own) ? [...new Set(w.own.filter(x => typeof x === 'string' && /^(frame|color|back|banner):[a-z]{2,14}$/.test(x)))].slice(0, 200) : [];
        const eq = {}; if (w.eq && typeof w.eq.back === 'string' && /^[a-z]{2,14}$/.test(w.eq.back)) eq.back = w.eq.back;
        P.wal = { xu: Math.min(10000000, num(w.xu)), inv, own, eq, dbl: Math.min(99, num(w.dbl)), chest: Math.min(100000, num(w.chest)), at: num(w.at, 4e12) };
      }
    }
    P.dl = { last: today, streak: next.streak, total: num(dl.total) + 1 };
    const base = P.wal && typeof P.wal === 'object' ? P.wal : { xu: 0, inv: {}, own: [], eq: {}, dbl: 0, chest: 0, at: 0 };
    P.wal = { ...base, xu: Math.min(10000000, num(base.xu) + next.xu), at: Math.max(Date.now(), num(base.at, 4e12) + 1) };
    mergeGranted(P); /* 🎁 vật phẩm cấp tay (patch -127): gộp P.granted vào ví điểm danh để user nhận món luôn */
    checkVip(P, (await this.ranks()).get(me.id) || 0); /* 🏆 chuỗi top BXH mở món VIP (patch -143) */
    this.sql.exec('UPDATE users SET prof = ? WHERE id = ?', JSON.stringify(P), me.id);
    return { ok: true, day: next.day, streak: next.streak, total: P.dl.total, xu: next.xu, wal: P.wal };
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
    this.sql.exec('UPDATE users SET admin = 1, role = 2 WHERE id = ?', u.id);
    this.admIdx = null;
    await this.auditLog({ id: u.id, name: u.name }, 'claim-admin', u.id, u.name, 'kích hoạt quyền Quản trị bằng ADMIN_KEY');
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
      const rows = this.sql.exec('SELECT id, username, name, google IS NOT NULL AS g, created, banned, admin, role, supporter, vip, dev, prof, mute FROM users').toArray(), list = [];
      for (const r of rows) {
        let P = null; try { P = JSON.parse(r.prof || 'null'); } catch (e) {}
        const st = statOf(P), lv = levelOf(st.p, st.w, st.xp); let last = 0; if (P && P.g) for (const v of Object.values(P.g)) last = Math.max(last, +(v && v.last) || 0);
        let mu = { c: 0, v: 0 }; try { const m = JSON.parse(r.mute || 'null'); if (m && typeof m === 'object') { mu.c = +m.c || 0; mu.v = +m.v || 0; } } catch (e) {}
        list.push({ id: r.id, username: r.username || null, name: r.name || '', g: !!r.g, created: r.created || 0, banned: !!r.banned, admin: (r.role != null ? +r.role : (r.admin ? 2 : 0)) >= 1, role: r.role != null ? Math.max(0, Math.min(2, +r.role || 0)) : (r.admin ? 2 : 0), supporter: !!r.supporter, vip: !!r.vip, dev: !!r.dev, lv: lv.lv, xp: lv.xp, p: st.p, w: st.w, best: st.best, xu: P && P.wal && typeof P.wal === 'object' ? Math.max(0, Math.floor(+P.wal.xu || 0)) : 0, last, mute: mu,
          av: P && P.av && typeof P.av.e === 'string' ? String(P.av.e).slice(0, 8) : '', _u: fold(r.username), _n: fold(r.name) });
      }
      this.admIdx = { at: Date.now(), list };
    }
    const all = this.admIdx.list, now = Date.now(), W = 7 * 864e5, f = String(opt.f || 'all'), sort = String(opt.sort || 'new');
    const raw = String(q || '').trim().slice(0, 60), toks = fold(raw).split(/\s+/).filter(Boolean);
    let res = all.filter(u => (f === 'admin' ? u.admin : f === 'banned' ? u.banned : f === 'google' ? u.g : f === 'active' ? now - u.last < W : f === 'new' ? now - u.created < W : true)
      && toks.every(t => (t[0] === '#' ? String(u.id) === t.slice(1) : t[0] === '@' ? u._u.includes(t.slice(1)) : u._u.includes(t) || u._n.includes(t) || String(u.id) === t)));
    const cmp = { new: (a, b) => b.id - a.id, old: (a, b) => a.id - b.id, name: (a, b) => a._n.localeCompare(b._n) || a.id - b.id, lv: (a, b) => b.xp - a.xp || b.id - a.id, last: (a, b) => b.last - a.last || b.id - a.id }[sort] || ((a, b) => b.id - a.id);
    res = res.slice().sort(cmp);
    const off = Math.max(0, Math.floor(+opt.off || 0)), lim = Math.max(1, Math.min(100, Math.floor(+opt.lim || 40)));
    const count = k => all.reduce((n, u) => n + (k(u) ? 1 : 0), 0);
    return { users: res.slice(off, off + lim).map(({ _u, _n, ...u }) => u), matched: res.length, total: all.length, ownerId: this.ownerId(), // 👑 chủ web hiện tại để trang Quản trị hiển thị (patch -94)
      counts: { admin: count(u => u.role === 2), mod: count(u => u.role === 1), banned: count(u => u.banned), google: count(u => u.g), active: count(u => now - u.last < W), new: count(u => now - u.created < W) } };
  }
  async adminSet(id, patch, adminUid = null) {
    const uid = +id;
    const target = this.one('SELECT * FROM users WHERE id = ?', uid);
    if (!target) return { ok: false, msg: 'Không thấy tài khoản này' };
    // 🎭 chỉ Quản trị (role 2) mới đổi quyền / đặt lại mật khẩu; Mod chỉ được cấm/mở khoá/mute
    let callerRole = 2; // gọi nội bộ không qua /admin/list (mặc định đủ quyền)
    let caller = null;
    if (adminUid != null) {
      caller = this.one('SELECT * FROM users WHERE id = ?', +adminUid);
      callerRole = this.roleOf(caller);
      if (callerRole < 1 || (caller && caller.banned)) return { ok: false, msg: 'Không có quyền quản trị' };
    }
    const wantsRole = 'role' in patch || 'admin' in patch;
    if (wantsRole && callerRole < 2) return { ok: false, msg: 'Chỉ Quản trị mới cấp/thu hồi quyền' };
    if ('password' in patch && callerRole < 2) return { ok: false, msg: 'Chỉ Quản trị mới đặt lại mật khẩu' };
    if ('supporter' in patch && callerRole < 2) return { ok: false, msg: 'Chỉ Quản trị mới cấp/thu hồi danh hiệu Ủng hộ' }; // 💎 danh hiệu Ủng hộ đặc biệt (patch -95): chỉ role 2
    if ('supporter' in patch && patch.supporter && target.banned) return { ok: false, msg: 'Tài khoản đang bị khoá' }; // 💎 không cấp danh hiệu cho tài khoản bị khoá (thu hồi thì vẫn được)
    if ('vip' in patch && callerRole < 2) return { ok: false, msg: 'Chỉ Quản trị mới cấp/thu hồi huy hiệu VIP' }; // 💠 huy hiệu VIP (patch -142): chỉ role 2
    if ('vip' in patch && patch.vip && target.banned) return { ok: false, msg: 'Tài khoản đang bị khoá' }; // 💠 không cấp VIP cho tài khoản bị khoá (thu hồi thì vẫn được)
    if ('dev' in patch && callerRole < 2) return { ok: false, msg: 'Chỉ Quản trị mới cấp/thu hồi huy hiệu DEV' }; // 💻 huy hiệu DEV (patch -142): chỉ role 2
    if ('dev' in patch && patch.dev && target.banned) return { ok: false, msg: 'Tài khoản đang bị khoá' }; // 💻 không cấp DEV cho tài khoản bị khoá (thu hồi thì vẫn được)
    // ✏️ sửa dữ liệu người dùng (patch -167): chỉ Quản trị (role 2); kiểm tra TOÀN BỘ giá trị trước khi sửa gì
    let editPatch = null, editCur = null;
    if ('edit' in patch) {
      if (callerRole < 2) return { ok: false, msg: 'Chỉ Quản trị mới sửa dữ liệu người dùng' };
      const e = patch.edit;
      if (!e || typeof e !== 'object' || Array.isArray(e)) return { ok: false, msg: 'Dữ liệu sửa không hợp lệ' };
      const keys = ['xu', 'xp', 'p', 'w', 'best'].filter(k => k in e);
      if (!keys.length) return { ok: false, msg: 'Chưa sửa gì' };
      const isInt = v => typeof v === 'number' && Number.isInteger(v) && v >= 0;
      for (const k of keys) if (!isInt(e[k])) return { ok: false, msg: 'Giá trị phải là số nguyên từ 0 trở lên' };
      if ('xu' in e && e.xu > 10000000) return { ok: false, msg: 'Xu tối đa 10.000.000' };
      if ('xp' in e && e.xp > 10000000) return { ok: false, msg: 'XP tối đa 10.000.000' };
      if ('p' in e && e.p > 1000000) return { ok: false, msg: 'Số trận tối đa 1.000.000' };
      if ('w' in e && e.w > 1000000) return { ok: false, msg: 'Số trận thắng tối đa 1.000.000' };
      if ('best' in e && e.best > 1000000) return { ok: false, msg: 'Chuỗi thắng tối đa 1.000.000' };
      let curP = null; try { curP = JSON.parse(target.prof || 'null'); } catch (err) {}
      curP = curP && typeof curP === 'object' ? curP : {};
      const st0 = statOf(curP);
      const p1 = 'p' in e ? e.p : st0.p, w1 = 'w' in e ? e.w : st0.w;
      if (w1 > p1) return { ok: false, msg: 'Số trận thắng không được lớn hơn số trận đã chơi' };
      const b1 = 'best' in e ? e.best : Math.min(st0.w, Math.max(0, Math.floor(+curP.best || 0)));
      if (b1 > w1) return { ok: false, msg: 'Chuỗi thắng tốt nhất không được dài hơn tổng số trận thắng' };
      editPatch = e;
      editCur = { xu: curP.wal && typeof curP.wal === 'object' ? Math.max(0, Math.floor(+curP.wal.xu || 0)) : 0, xp: st0.xp, p: st0.p, w: st0.w, best: Math.min(st0.w, Math.max(0, Math.floor(+curP.best || 0))) };
    }
    // 🎁 cấp vật phẩm thủ công (patch -127): chỉ Quản trị (role 2); không cấp cho tài khoản bị khoá; tự cấp cho mình thì được (ghi rõ trong audit); kiểm tra wid + trùng trước khi sửa gì
    let grantWid = null, grantName = null, grantP = null;
    if ('grant' in patch) {
      if (callerRole < 2) return { ok: false, msg: 'Chỉ Quản trị mới cấp vật phẩm' };
      if (target.banned) return { ok: false, msg: 'Tài khoản đang bị khoá' };
      grantWid = typeof patch.grant === 'string' ? patch.grant.trim() : '';
      if (!GRANT_ITEMS.has(grantWid)) return { ok: false, msg: 'Không có vật phẩm này' };
      if (GRANT_OWNER_ONLY.has(grantWid)) return { ok: false, msg: 'Không cấp được món riêng của Chủ web' };
      if (VIP_WIDS.has(grantWid)) return { ok: false, msg: 'Món VIP chỉ mở bằng thành tích BXH, không cấp tay được' }; /* 🏆 món VIP (patch -143): chỉ mở bằng chuỗi top, cấp tay sẽ phá thang độ khó — rào ở server, dropdown chỉ là lớp ngoài */
      grantP = null; try { grantP = JSON.parse(target.prof || 'null'); } catch (e) {}
      grantP = grantP && typeof grantP === 'object' ? grantP : {};
      const g0 = Array.isArray(grantP.granted) ? grantP.granted : [];
      const o0 = (grantP.wal && Array.isArray(grantP.wal.own)) ? grantP.wal.own : [];
      if (g0.includes(grantWid) || o0.includes(grantWid)) return { ok: false, msg: 'Người này đã có món này rồi' };
      grantName = GRANT_ITEMS.get(grantWid);
    }
    const oid = this.ownerId(); // 👑 chủ web hiện tại (patch -94): các lệnh cấm với chủ web luôn nhắm đúng người
    if (uid === oid && adminUid != null && +adminUid !== oid) {
      if (wantsRole) return { ok: false, msg: 'Chỉ chủ web mới đổi quyền của chủ web' };
      if ('banned' in patch && patch.banned) return { ok: false, msg: 'Không thể khoá tài khoản chủ web' };
    }
    if (adminUid && uid === +adminUid) {
      if ('banned' in patch && patch.banned) return { ok: false, msg: 'Không thể tự khoá tài khoản của chính mình' };
      const newRole = 'role' in patch ? Math.max(0, Math.min(2, +patch.role || 0)) : ('admin' in patch ? (patch.admin ? 2 : 0) : this.roleOf(target));
      if (newRole < this.roleOf(target)) return { ok: false, msg: 'Không thể tự hạ quyền của chính mình' };
    }
    const oldRole = this.roleOf(target);
    if (wantsRole) {
      const nr = 'role' in patch ? Math.max(0, Math.min(2, +patch.role || 0)) : (patch.admin ? 2 : 0);
      this.sql.exec('UPDATE users SET role = ?, admin = ? WHERE id = ?', nr, nr >= 1 ? 1 : 0, uid);
    }
    if ('banned' in patch) { this.sql.exec('UPDATE users SET banned = ? WHERE id = ?', patch.banned ? 1 : 0, uid); if (patch.banned) this.sql.exec('DELETE FROM sessions WHERE uid = ?', uid); }
    if (patch.password) { const salt = rand(16); this.sql.exec('UPDATE users SET pw = ?, salt = ? WHERE id = ? AND username IS NOT NULL', await hashPw(String(patch.password), salt), salt, uid); }
    if ('supporter' in patch) { this.sql.exec('UPDATE users SET supporter = ? WHERE id = ?', patch.supporter ? 1 : 0, uid); if (this.lbCache) this.lbCache.clear(); } // 💎 cấp/thu hồi danh hiệu Ủng hộ (patch -95) – xoá bảng xếp hạng đã nhớ để huy hiệu đổi ngay
    if ('vip' in patch) { this.sql.exec('UPDATE users SET vip = ? WHERE id = ?', patch.vip ? 1 : 0, uid); if (this.lbCache) this.lbCache.clear(); } // 💠 cấp/thu hồi huy hiệu VIP (patch -142)
    if ('dev' in patch) { this.sql.exec('UPDATE users SET dev = ? WHERE id = ?', patch.dev ? 1 : 0, uid); if (this.lbCache) this.lbCache.clear(); } // 💻 cấp/thu hồi huy hiệu DEV (patch -142)
    if (grantWid) { // 🎁 lưu món cấp vào P.granted (chỉ thêm không bớt); mergeGranted() gộp vào ví ở lần đồng bộ sau (patch -127)
      const granted = Array.isArray(grantP.granted) ? grantP.granted.filter(x => typeof x === 'string') : [];
      if (!granted.includes(grantWid)) granted.push(grantWid);
      grantP.granted = granted.slice(0, 200);
      this.sql.exec('UPDATE users SET prof = ? WHERE id = ?', JSON.stringify(grantP), uid);
    }
    let editDone = null; // ✏️ sửa dữ liệu (patch -167): đọc lại hồ sơ mới nhất rồi áp dụng (thứ tự: ván/thắng → XP → chuỗi → xu)
    if (editPatch) {
      let P = null; try { P = JSON.parse((this.one('SELECT prof FROM users WHERE id = ?', uid) || {}).prof || 'null'); } catch (err) {}
      P = P && typeof P === 'object' ? P : {}; P.g = P.g || {};
      const e = editPatch, st1 = statOf(P);
      let topGame = null;
      if ('p' in e || 'w' in e) { const r = applyTotalsEdit(P, 'p' in e ? e.p : st1.p, 'w' in e ? e.w : st1.w); topGame = r.game; }
      if ('xp' in e) { const adj = e.xp - xpOfG(P.g); if (adj === 0) delete P.xpAdj; else P.xpAdj = Math.max(-1e7, Math.min(1e7, adj)); } /* XP mục tiêu trừ XP tính từ số ván mới — số ván không bị đụng */
      if ('best' in e) { P.best = e.best; P.bestAt = Date.now(); } /* mốc sửa để lần đồng bộ sau của máy không đẩy số cũ lên lại (xem profile()) */
      if ('xu' in e) { /* 💰 ví xu: đóng dấu at mới hơn BẮT BUỘC (theo đúng mergeGranted) để lần đồng bộ sau của máy
        KHÔNG ghi đè lại giá trị cũ (walletAccepts chỉ nhận ví at mới hơn) và máy nhận ví mới qua adoptServer */
        const old = (P.wal && typeof P.wal === 'object') ? P.wal : {};
        P.wal = { xu: e.xu, inv: (old.inv && typeof old.inv === 'object') ? old.inv : {}, own: Array.isArray(old.own) ? old.own : [], eq: (old.eq && typeof old.eq === 'object') ? old.eq : { back: '' }, dbl: Math.max(0, Math.floor(+old.dbl || 0)), chest: Math.max(0, Math.floor(+old.chest || 0)), at: Math.max(Date.now(), Math.floor(+old.at || 0) + 1) };
      }
      this.sql.exec('UPDATE users SET prof = ? WHERE id = ?', JSON.stringify(P), uid);
      if (this.lbCache) this.lbCache.clear(); /* bảng xếp hạng nhớ 30s: xoá để XP/ván/thắng/chuỗi mới hiện ngay */
      const st2 = statOf(P);
      editDone = { xu: P.wal ? Math.max(0, Math.floor(+P.wal.xu || 0)) : 0, xp: st2.xp, p: st2.p, w: st2.w, best: Math.min(st2.w, Math.max(0, Math.floor(+P.best || 0))), lv: levelOf(st2.p, st2.w, st2.xp).lv, topGame };
    }
    if ('mute' in patch && patch.mute && typeof patch.mute === 'object') { /* 🔇 cấm chat (c) / cấm mở phiếu (v) theo tài khoản, theo giờ – 0 = gỡ */
      const now = Date.now(), cur = this.one('SELECT mute FROM users WHERE id = ?', uid); let m = { c: 0, v: 0 };
      try { m = JSON.parse((cur && cur.mute) || 'null') || m; } catch (e) {}
      for (const k of ['c', 'v']) { const h = +patch.mute[k]; if (Number.isFinite(h) && h !== 0) m[k] = now + h * 3600e3; else if (h === 0) m[k] = 0; }
      this.sql.exec('UPDATE users SET mute = ? WHERE id = ?', JSON.stringify(m), uid);
    }
    this.admIdx = null;
    // 📜 ghi nhật ký quản trị (không ghi mật khẩu mới)
    const actor = caller || { id: 0, name: 'ADMIN_KEY' };
    const tName = target.name || target.username || ('#' + uid);
    if (wantsRole) {
      const nr = 'role' in patch ? Math.max(0, Math.min(2, +patch.role || 0)) : (patch.admin ? 2 : 0);
      if (nr !== oldRole) await this.auditLog(actor, 'role', uid, tName, nr === 2 ? 'cấp quyền Quản trị' : nr === 1 ? 'cấp quyền Mod' : 'thu hồi quyền quản trị');
    }
    if ('banned' in patch) await this.auditLog(actor, patch.banned ? 'ban-account' : 'unban-account', uid, tName, patch.banned ? 'khoá tài khoản' : 'mở khoá tài khoản');
    if (patch.password) await this.auditLog(actor, 'reset-password', uid, tName, 'đặt lại mật khẩu');
    if ('supporter' in patch) await this.auditLog(actor, 'supporter', uid, tName, patch.supporter ? 'cấp danh hiệu Ủng hộ đặc biệt' : 'thu hồi danh hiệu Ủng hộ đặc biệt');
    if ('vip' in patch) await this.auditLog(actor, 'vip', uid, tName, patch.vip ? 'cấp huy hiệu VIP' : 'thu hồi huy hiệu VIP');
    if ('dev' in patch) await this.auditLog(actor, 'dev', uid, tName, patch.dev ? 'cấp huy hiệu DEV' : 'thu hồi huy hiệu DEV');
    if ('mute' in patch && patch.mute && typeof patch.mute === 'object') {
      const h = +patch.mute.c || 0;
      await this.auditLog(actor, h ? 'mute' : 'unmute', uid, tName, h ? `cấm chat ${h} giờ` : 'gỡ cấm chat');
    }
    if (grantWid) { // 🎁 ghi rõ tên món; tự cấp cho chính mình thì ghi rõ (patch -127)
      const self = adminUid != null && uid === +adminUid;
      await this.auditLog(actor, 'grant-item', uid, tName, 'cấp ' + grantName + (self ? ' (tự cấp cho chính mình)' : ''));
    }
    if (editDone) { // ✏️ ghi rõ giá trị cũ → mới từng trường đã sửa (không ghi mật khẩu — ở đây không có mật khẩu)
      const self = adminUid != null && uid === +adminUid;
      const parts = [];
      const fmt = n => (+n || 0).toLocaleString('vi-VN');
      if ('xu' in editPatch) parts.push(`xu ${fmt(editCur.xu)}→${fmt(editDone.xu)}`);
      if ('xp' in editPatch) parts.push(`XP ${fmt(editCur.xp)}→${fmt(editDone.xp)}`);
      if ('p' in editPatch) parts.push(`ván ${fmt(editCur.p)}→${fmt(editDone.p)}`);
      if ('w' in editPatch) parts.push(`thắng ${fmt(editCur.w)}→${fmt(editDone.w)}`);
      if ('best' in editPatch) parts.push(`chuỗi ${fmt(editCur.best)}→${fmt(editDone.best)}`);
      if (editDone.topGame) parts.push(`(ván thêm ghi vào ${editDone.topGame === 'typhu' && !editCur.p ? 'Cờ Tỷ Phú (chưa chơi game nào)' : editDone.topGame})`);
      await this.auditLog(actor, 'edit-user', uid, tName, 'sửa dữ liệu: ' + parts.join('; ') + (self ? ' (tự sửa)' : ''));
    }
    return { ok: true, ...(grantWid ? { granted: grantWid, name: grantName } : {}), ...(editDone ? { edited: editDone } : {}) };
  }
  /* 👑 Nhượng quyền chủ web (patch -94): chủ web hiện tại chuyển 👑 cho tài khoản khác.
     Người cũ giữ role 2 (vẫn là Quản trị, 🛠️); người mới được lên role 2 + thành chủ web.
     Chỉ dữ liệu định danh chủ web di chuyển – XP/ví/nhân vật/dữ liệu của 2 tài khoản KHÔNG gộp, KHÔNG đổi chỗ.
     Quyền gọi được kiểm ở /admin/list (chỉ chủ web hiện tại hoặc ADMIN_KEY); hàm này chỉ kiểm đích đến. */
  async transferOwner(caller, targetId) {
    const tid = Math.floor(+targetId || 0);
    const target = tid >= 1 ? this.one('SELECT * FROM users WHERE id = ?', tid) : null;
    if (!target) return { ok: false, msg: 'Không thấy tài khoản này' };
    if (target.banned) return { ok: false, msg: 'Tài khoản đang bị khoá' };
    const oid = this.ownerId();
    if (tid === oid) return { ok: false, msg: 'Tài khoản này đã là chủ web' };
    const tName = target.name || target.username || ('#' + tid);
    this.sql.exec('UPDATE users SET role = 2, admin = 1 WHERE id = ?', tid); // người mới tự lên Quản trị
    this.sql.exec(`INSERT INTO meta (k, v) VALUES ('owner', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v`, String(tid)); // 👑 dời sang tài khoản mới
    this._ownerId = tid; this.admIdx = null; if (this.lbCache) this.lbCache.clear(); // nhớ mới + xoá bảng xếp hạng đã nhớ (cờ 👑 đổi chủ)
    const actor = caller || { id: 0, name: 'ADMIN_KEY' };
    await this.auditLog(actor, 'transfer-owner', tid, tName, 'nhượng quyền chủ web cho ' + tName);
    return { ok: true, owner: tid };
  }
  // 📜 nhật ký quản trị (patch -93): ghi mọi hành động quản trị; xem ở tab Nhật ký (chỉ role 2)
  async auditLog(actor, action, targetId, targetName, detail) {
    try {
      this.sql.exec('INSERT INTO audit (ts, actorId, actorName, action, targetId, targetName, detail) VALUES (?,?,?,?,?,?,?)',
        Date.now(), actor ? +actor.id || 0 : 0, String((actor && actor.name) || 'ADMIN_KEY').slice(0, 60), String(action || '').slice(0, 30),
        targetId != null ? +targetId : null, targetName != null ? String(targetName).slice(0, 60) : null, detail != null ? String(detail).slice(0, 200) : null);
    } catch (e) {}
    return { ok: true };
  }
  async auditList(off = 0, lim = 50) {
    const o = Math.max(0, Math.floor(+off || 0)), l = Math.max(1, Math.min(100, Math.floor(+lim || 50)));
    const rows = this.sql.exec('SELECT * FROM audit ORDER BY id DESC LIMIT ? OFFSET ?', l, o).toArray();
    const total = this.one('SELECT COUNT(*) AS n FROM audit').n;
    return { rows, total, off: o };
  }
  async stats() { return { users: this.one('SELECT COUNT(*) AS n FROM users').n, sessions: this.one('SELECT COUNT(*) AS n FROM sessions WHERE exp > ?', Date.now()).n }; }

  // ---- bạn bè & nhắn tin 1-1 ----
  async friendsList(token) {
    const me = await this.whoami(token); if (!me || me.banned) return { ok: false, msg: 'Đăng nhập để dùng bạn bè' };
    const id = me.id;
    const acc = this.sql.exec(
      `SELECT u.id, u.name, u.username, u.role, u.admin, u.supporter, u.vip, u.dev, f.ts FROM friends f JOIN users u ON u.id = (CASE WHEN f.a = ? THEN f.b ELSE f.a END) WHERE (f.a = ? OR f.b = ?) AND f.status = 'acc' AND u.banned = 0`,
      id, id, id
    ).toArray();
    let totalUnread = 0;
    const friends = acc.map(u => {
      const unread = this.one('SELECT COUNT(*) AS n FROM dms WHERE fromId = ? AND toId = ? AND seen = 0', u.id, id).n;
      totalUnread += unread;
      const last = this.one('SELECT msg, ts, fromId FROM dms WHERE (fromId = ? AND toId = ?) OR (fromId = ? AND toId = ?) ORDER BY id DESC LIMIT 1', u.id, id, id, u.id);
      const rl = u.role != null ? Math.max(0, Math.min(2, +u.role || 0)) : (u.admin ? 2 : 0);
      return { id: u.id, name: u.name, username: u.username || null, unread, last: last ? { msg: last.msg, ts: last.ts, mine: last.fromId === id } : null, since: u.ts, role: rl, owner: this.isOwnerId(u.id) ? 1 : 0, supporter: u.supporter ? 1 : 0, vip: u.vip ? 1 : 0, dev: u.dev ? 1 : 0 }; // 🎖️ huy hiệu bạn bè (patch -95; VIP/DEV thêm ở -142)
    });
    /* 👑 cuộc trò chuyện có chủ web mà chưa kết bạn: vẫn hiện trong danh sách để đọc / trả lời */
    const frIds = new Set(friends.map(f => f.id)), ownerMe = this.isOwnerId(id), oid = this.ownerId(), ownerOn = this.isOwnerId(oid);
    if (ownerOn) {
      const rows = ownerMe
        ? this.sql.exec('SELECT DISTINCT CASE WHEN fromId = ? THEN toId ELSE fromId END AS o FROM dms WHERE fromId = ? OR toId = ?', id, id, id).toArray().map(r => r.o)
        : (this.one('SELECT id FROM dms WHERE (fromId = ? AND toId = ?) OR (fromId = ? AND toId = ?) LIMIT 1', id, oid, oid, id) ? [oid] : []);
      for (const o of rows) {
        if (frIds.has(o) || o === id) continue;
        const u = this.one('SELECT id, name, username, role, admin, supporter, vip, dev, banned FROM users WHERE id = ?', o); if (!u || u.banned) continue;
        const unread = this.one('SELECT COUNT(*) AS n FROM dms WHERE fromId = ? AND toId = ? AND seen = 0', u.id, id).n; totalUnread += unread;
        const last = this.one('SELECT msg, ts, fromId FROM dms WHERE (fromId = ? AND toId = ?) OR (fromId = ? AND toId = ?) ORDER BY id DESC LIMIT 1', u.id, id, id, u.id);
        const rl = u.role != null ? Math.max(0, Math.min(2, +u.role || 0)) : (u.admin ? 2 : 0);
        friends.push({ id: u.id, name: u.name, username: u.username || null, unread, last: last ? { msg: last.msg, ts: last.ts, mine: last.fromId === id } : null, since: 0, dm: 1, owner: u.id === oid ? 1 : 0, role: rl, supporter: u.supporter ? 1 : 0 });
      }
    }
    friends.sort((x, y) => ((y.last && y.last.ts) || y.since || 0) - ((x.last && x.last.ts) || x.since || 0));
    const incoming = this.sql.exec(
      `SELECT u.id, u.name, u.username, f.ts FROM friends f JOIN users u ON u.id = f.req WHERE (f.a = ? OR f.b = ?) AND f.status = 'pending' AND f.req != ? AND u.banned = 0 ORDER BY f.ts DESC`,
      id, id, id
    ).toArray().map(u => ({ id: u.id, name: u.name, username: u.username || null, ts: u.ts }));
    const outgoing = this.sql.exec(
      `SELECT u.id, u.name, u.username, f.ts FROM friends f JOIN users u ON u.id = (CASE WHEN f.a = ? THEN f.b ELSE f.a END) WHERE (f.a = ? OR f.b = ?) AND f.status = 'pending' AND f.req = ? AND u.banned = 0 ORDER BY f.ts DESC`,
      id, id, id, id
    ).toArray().map(u => ({ id: u.id, name: u.name, username: u.username || null, ts: u.ts }));
    const blocked = this.sql.exec(
      `SELECT u.id, u.name, u.username, b.ts FROM blocks b JOIN users u ON u.id = b.b WHERE b.a = ? ORDER BY b.ts DESC`,
      id
    ).toArray().map(u => ({ id: u.id, name: u.name, username: u.username || null, ts: u.ts }));
    return { ok: true, friends, incoming, outgoing, blocked, unread: totalUnread };
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
    if (await this.isBlocked(me.id, other.id) || await this.isBlocked(other.id, me.id)) return { ok: false, msg: 'Bạn đã chặn hoặc bị chặn bởi người này' }; /* 🚫 */
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
  /* 🚫 chặn người chơi (20/11/2026): a chặn b → không kết bạn / nhắn riêng được, máy chủ phòng quét người bị chủ phòng chặn ra khỏi phòng */
  async isBlocked(a, b) { const r = this.one('SELECT 1 AS x FROM blocks WHERE a = ? AND b = ?', +a, +b); return !!(r && r.x); }
  async friendBlock(token, id, on = true) {
    const me = await this.whoami(token); if (!me || me.banned) return { ok: false, msg: 'Hết phiên đăng nhập' };
    const oid = +id; if (!oid || oid === me.id) return { ok: false, msg: 'Người dùng không hợp lệ' };
    if (!this.one('SELECT id FROM users WHERE id = ?', oid)) return { ok: false, msg: 'Không tìm thấy người chơi này' };
    if (on) this.sql.exec('INSERT OR IGNORE INTO blocks (a, b, ts) VALUES (?,?,?)', me.id, oid, Date.now());
    else this.sql.exec('DELETE FROM blocks WHERE a = ? AND b = ?', me.id, oid);
    return { ok: true };
  }
  /* 🛡️ máy chủ phòng gọi sau khi kiểm vé tài khoản: lệnh cấm của quản trị + danh sách người uid này đã chặn */
  async modInfo(uid) {
    const r = this.one('SELECT mute FROM users WHERE id = ?', +uid);
    let m = { c: 0, v: 0 }; try { m = JSON.parse((r && r.mute) || 'null') || m; } catch (e) {}
    const blk = this.sql.exec('SELECT b FROM blocks WHERE a = ?', +uid).toArray().map(x => x.b);
    return { mc: +m.c || 0, mv: +m.v || 0, blk };
  }
  /* 💬 được nhắn riêng: đã là bạn bè, hoặc một bên là chủ web (chủ web nhắn được cho mọi tài khoản) */
  ownerId() { // 👑 chủ web hiện tại (patch -94): đọc từ meta, mặc định OWNER_ID; nhớ trong instance, xoá nhớ khi nhượng quyền
    if (this._ownerId != null) return this._ownerId;
    const r = this.one("SELECT v FROM meta WHERE k = 'owner'");
    const id = r && Number.isFinite(+r.v) && +r.v >= 1 ? Math.floor(+r.v) : OWNER_ID;
    this._ownerId = id; return id;
  }
  isOwnerId(id) { const oid = this.ownerId(); if (+id !== oid) return false; const u = this.one('SELECT role, admin FROM users WHERE id = ?', oid); return !!(u && this.roleOf(u) === 2); }
  dmOk(a0, b0) { if (this.isOwnerId(a0) || this.isOwnerId(b0)) return true; const a = Math.min(a0, b0), b = Math.max(a0, b0); const fr = this.one('SELECT status FROM friends WHERE a = ? AND b = ?', a, b); return !!(fr && fr.status === 'acc'); }
  async dmList(token, withId, afterId = 0) {
    const me = await this.whoami(token); if (!me || me.banned) return { ok: false, msg: 'Hết phiên đăng nhập' };
    const oid = +withId; if (!oid || oid === me.id) return { ok: false, msg: 'Người nhận không hợp lệ' };
    if (!this.dmOk(me.id, oid)) return { ok: false, msg: 'Hai bạn chưa kết bạn' };
    if (await this.isBlocked(me.id, oid) || await this.isBlocked(oid, me.id)) return { ok: false, msg: 'Bạn đã chặn hoặc bị chặn bởi người này' }; /* 🚫 */
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
    if (!this.dmOk(me.id, oid)) return { ok: false, msg: 'Cần kết bạn trước khi nhắn tin' };
    if (await this.isBlocked(me.id, oid) || await this.isBlocked(oid, me.id)) return { ok: false, msg: 'Bạn đã chặn hoặc bị chặn bởi người này' }; /* 🚫 */
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
    const rows = this.sql.exec('SELECT id, username, name, prof, created, admin, role, supporter, vip, dev FROM users WHERE banned = 0 AND prof IS NOT NULL').toArray();
    const ranks = game === 'all' && by === 'xp' ? null : await this.ranks(); /* thứ hạng chung (để tính danh hiệu Top 1/3/10) */
    const entries = [];
    for (const r of rows) {
      let pf; try { pf = JSON.parse(r.prof); } catch (e) { continue; }
      if (!pf || typeof pf !== 'object') continue;
      const g = pf.g && typeof pf.g === 'object' ? pf.g : {};
      let p = 0, w = 0, xp = 0;
      if (game === 'all') {
        for (const [k, v] of Object.entries(g)) if (v && typeof v === 'object') { const gp = Math.max(0, Math.min(99999, +v.p || 0)), gw = Math.min(gp, Math.max(0, Math.min(99999, +v.w || 0))); p += gp; w += gw; xp += gameXp(k, gp, gw); }
        xp = Math.max(0, xp + xpAdjOf(pf)); /* ✏️ XP do Quản trị sửa tay (patch -167) */
      } else {
        const gv = g[game];
        if (gv && typeof gv === 'object') { p = Math.max(0, Math.min(99999, +gv.p || 0)); w = Math.max(0, Math.min(99999, +gv.w || 0)); }
      }
      w = Math.min(w, p); if (game !== 'all') xp = gameXp(game, p, w);
      const best = Math.max(0, Math.min(999, +pf.best || 0));
      if (p <= 0 && w <= 0 && (by !== 'streak' || best <= 0)) continue;
      const lv = Math.min(10, Math.floor(Math.sqrt(xp / 50)) + 1);
      const rate = p > 0 ? Math.round((w / p) * 100) : 0;
      const av = cleanAvatar(pf.av); /* 🧸 nhân vật đầy đủ (chibi 3D / emoji) để bảng xếp hạng hiện đúng nhân vật */
      const safeName = clean(String(r.name || 'Người chơi')).text || 'Người chơi';
      entries.push({ id: r.id, username: r.username || null, name: safeName, p, w, xp, lv, best, rate, av, _pf: pf, _c: r.created, _a: r.admin ? 1 : 0, _r: r.role != null ? Math.max(0, Math.min(2, +r.role || 0)) : (r.admin ? 2 : 0), _s: r.supporter ? 1 : 0, _v: r.vip ? 1 : 0, _d: r.dev ? 1 : 0 });
    }
    entries.sort((a, b) => {
      if (by === 'streak') return b.best - a.best || b.w - a.w || b.xp - a.xp;
      if (by === 'wins') return b.w - a.w || b.rate - a.rate || b.p - a.p;
      return b.xp - a.xp || b.w - a.w || b.p - a.p;
    });
    entries.forEach((e, i) => { e.rank = i + 1; });
    if (!ranks) { this.rankMap = new Map(entries.map(e => [e.id, e.rank])); this.rankAt = Date.now(); this.rankTotal = entries.length; }
    for (const e of entries) { const t = pickTitle(titlesOf(statOf(e._pf, { created: e._c, rank: (ranks || this.rankMap).get(e.id) || 0 })), e._pf.title); e.title = t ? { id: t.id, icon: t.icon, name: t.name } : null; if (e._a && e.id === this.ownerId()) e.owner = true; else if (e._r === 2) e.admin = true; else if (e._r === 1) e.mod = true; if (e._s) e.supporter = true; if (e._v) e.vip = true; if (e._d) e.dev = true; delete e._a; delete e._r; delete e._s; delete e._v; delete e._d; delete e._pf; delete e._c; }
    if (!this.lbCache) this.lbCache = new Map(); if (this.lbCache.size > 80) this.lbCache.clear(); this.lbCache.set(ck, { at: Date.now(), entries });
    const me = meUser ? (entries.find(e => e.id === meUser.id) || null) : null;
    return { ok: true, game, by, total: entries.length, list: entries.slice(0, 50), me };
  }
  /* 🎖️ danh hiệu trưng ra trong phòng (patch -97): tính y hệt leaderboard/publicProfile — P.title chỉ hiện
     khi vẫn còn đạt (pickTitle), tài khoản bị khoá / không đăng nhập thì không có danh hiệu. */
  async titleOf(token) {
    const u = await this.whoami(token); if (!u || u.banned) return null;
    const row = this.one('SELECT prof, created FROM users WHERE id = ?', u.id); if (!row) return null;
    let P = null; try { P = JSON.parse(row.prof || 'null'); } catch (e) {}
    P = P && typeof P === 'object' ? P : {};
    const ranks = await this.ranks(), rank = ranks.get(u.id) || 0;
    const t = pickTitle(titlesOf(statOf(P, { created: row.created, rank })), P.title);
    return t ? { id: t.id, icon: t.icon, name: t.name } : null;
  }
  /* 🎖️ kiểm id danh hiệu khách tự khai (đổi giữa ván/phòng): chỉ trả về khi id đó nằm trong danh sách đã đạt */
  async verifyTitle(token, id) {
    const u = await this.whoami(token); if (!u || u.banned) return null;
    const row = this.one('SELECT prof, created FROM users WHERE id = ?', u.id); if (!row) return null;
    let P = null; try { P = JSON.parse(row.prof || 'null'); } catch (e) {}
    P = P && typeof P === 'object' ? P : {};
    const ranks = await this.ranks(), rank = ranks.get(u.id) || 0;
    const t = titlesOf(statOf(P, { created: row.created, rank })).find(x => x.id === String(id || ''));
    return t ? { id: t.id, icon: t.icon, name: t.name } : null;
  }
  /* thứ hạng chung theo điểm (id → hạng), làm mới cùng nhịp 30 giây với bảng xếp hạng */
  async ranks() { if (!this.rankMap || Date.now() - (this.rankAt || 0) > 30e3) await this.leaderboard({ game: 'all', by: 'xp' }); return this.rankMap || new Map(); }
  // 👤 Hồ sơ công khai của một thành viên (ai cũng xem được): chỉ gồm tên hiện, tên đăng nhập, hình đại diện, số liệu chơi, thành tích, danh hiệu.
  // KHÔNG có email, mật khẩu hay thứ gì riêng tư. Tài khoản bị khoá thì coi như không có.
  async publicProfile(key) {
    const k = String(key == null ? '' : key).trim().toLowerCase().slice(0, 24);
    const u = /^\d+$/.test(k) ? this.one('SELECT id, username, name, prof, created, banned, admin, role, supporter, vip, dev FROM users WHERE id = ?', +k) : USER.test(k) ? this.one('SELECT id, username, name, prof, created, banned, admin, role, supporter, vip, dev FROM users WHERE username = ?', k) : null;
    if (!u || u.banned) return { ok: false, msg: 'Không tìm thấy thành viên này' };
    let P = null; try { P = JSON.parse(u.prof || 'null'); } catch (e) {}
    P = P && typeof P === 'object' ? P : {};
    const ranks = await this.ranks(), rank = ranks.get(u.id) || 0, st = statOf(P, { created: u.created, rank }), lv = levelOf(st.p, st.w, st.xp), titles = titlesOf(st), t = pickTitle(titles, P.title);
    const games = Object.keys(st.plays).sort((a, b) => st.plays[b] - st.plays[a]).slice(0, 8).map(g => ({ g, p: st.plays[g], w: st.wins[g] || 0 }));
    const av = cleanAvatar(P.av); /* 🧸 nhân vật đầy đủ (chibi 3D / emoji) */
    /* 🎖️ huy hiệu (patch -98): trả cùng 4 cờ như bảng xếp hạng (owner/admin/mod/supporter) — huy hiệu đã công khai ở chat + bảng xếp hạng + bạn bè nên hồ sơ công khai không rò thêm gì; vẫn không trả email/mật khẩu hay thứ gì riêng tư. Tài khoản bị khoá đã bị chặn ở trên. */
    const _r = u.role != null ? Math.max(0, Math.min(2, +u.role || 0)) : (u.admin ? 2 : 0);
    const _own = !!u.admin && u.id === this.ownerId();
    return { ok: true, user: { id: u.id, username: u.username || null, name: clean(String(u.name || 'Người chơi')).text || 'Người chơi', created: u.created, av,
      lv: lv.lv, lvName: lv.name, xp: lv.xp, p: st.p, w: st.w, rate: st.p ? Math.round(st.w / st.p * 100) : 0, best: st.best, days: st.days, kinds: st.kinds, rank, total: this.rankTotal || 0,
      ...(_own ? { owner: true } : _r === 2 ? { admin: true } : _r === 1 ? { mod: true } : {}), ...(u.supporter ? { supporter: true } : {}), ...(u.vip ? { vip: true } : {}), ...(u.dev ? { dev: true } : {}),
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
