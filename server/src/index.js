// Máy chủ phòng chơi GumballZ trên Cloudflare Workers + Durable Objects (gói miễn phí).
// Mỗi phòng = 1 Durable Object "Room" (theo ns + mã phòng). Chủ phòng và người chơi nối WebSocket vào,
// máy chủ chỉ chuyển tin (game vẫn do máy chủ phòng – trình duyệt chủ phòng – quyết định).
//
//   wss://<worker-cua-ban>/r/<ns>/<code>?role=host&k=<khoá chủ phòng>
//   wss://<worker-cua-ban>/r/<ns>/<code>?role=c&id=<mã người chơi>
//   Tin: người chơi → máy chủ: chuỗi JSON của game.     máy chủ → chủ phòng: {"f":id,"s":chuỗi} | {"f":id,"bye":1}
//        chủ phòng → máy chủ: {"to":id,"s":chuỗi} | {"to":id,"bye":1}   máy chủ → người chơi: chuỗi | {"x":"nf"} (không có phòng) | {"x":"gone"} (chủ phòng thoát)
//
//   POST /feedback  {t,msg,game,contact,page}   – góp ý / báo lỗi (lưu SQLite trong Durable Object "Inbox")
//   GET  /admin                                  – chuyển hướng sang https://gumballzgames.vercel.app/quantri/
import { cfUsage } from './cfstats.js';
import { makePass, checkPass, makeIdPass } from './vip.js';
import { masoiLine, tttCards, rulesAnswer, aiStatus, CAPS } from './ai.js';
import { clean } from './filter.js';
import { monthStartVN, verifyWebhook, parseDonContent, DONATE_GOAL_DEFAULT, DONATE_AUTO_QUOTA_DEFAULT, notifyDiscordClaim } from './donate.js'; /* ☕ ủng hộ qua quét mã QR (patch -102) */
import { TUT } from '../../shared/tutorials.js';
import { DurableObject } from 'cloudflare:workers';
export { Users } from './users.js';
import { eqTime } from './users.js';
export { Lobby } from './lobby.js';
import { Meter } from './meter.js';
import { SrvRoom, SRV_GAMES, within, forget, noituExtra } from './srvhost.js'; /* within/forget: hẹn giờ ảo (nhúng trong srvhost.js) để phòng máy chủ được ngủ giữa lượt; noituExtra: nạp kho từ Nối từ */

const ORIGINS = [/^https:\/\/gumballzgames\.vercel\.app$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const okOrigin = o => !o || ORIGINS.some(r => r.test(o)); // không có Origin (app/test) thì cho qua – chỉ chặn web lạ nhúng
import { norm as ntNorm0 } from '../../noitu/js/engine.js';
const ntNorm = x => { const w = ntNorm0(String(x || '').slice(0, 40)); return w.split(' ').length === 2 ? w : ''; }; /* 🔗 Nối từ: chỉ nhận từ đúng 2 tiếng (để duyệt tay ở trang Quản trị) */
const FIND_GAMES = ['bang', 'uno', 'typhu', 'tamquoc', 'meono', 'masoi', 'scribble', 'tienlen', 'poker', 'xidach', 'catte', 'bacao', 'cangua', 'camel', 'cotuong', 'thathaythach', 'bantau', 'baitan', 'loto', 'covua', 'tala', 'cholon', 'tusac', 'oanquan', 'caro', 'tictactoe', 'memory', 'covay', 'cothu', 'ranvathang', 'sam', 'baucua', 'noitu', 'xuyenviet', 'khaihoang', 'daochinh', 'cuuho', 'xiecthu', 'giandiep', 'codam', 'lieng', 'maubinh', 'xito', 'colat', 'domino', 'connect4', 'matthu', 'avalon', 'spyfall', 'sudoku', 'wordle', 'domi', 's2048', 'matchu', 'loveletter', 'sushigo', 'lay6', 'saboteur', 'skull', 'hanabi', 'chan', 'totom', 'carcassonne', 'azul', 'splendor', 'conhay', 'backgammon', 'rummikub', 'quoridor', 'blokus', 'scrabble', 'mastermind', 'ailatrieuphu', 'haithat1gia', 'doanhdong', 'wavelength', 'resistance', 'vetruyentin', 'tetris', 'ransanmoi', 'xepkeo', 'banbong', 'nonogram', 'ghephinh', 'nhen', 'bida8', 'dapenalty', 'phitieu', 'keobuabao', 'dovui', 'hoisanquai'];
const NS = /^gumballz-[a-z0-9]{2,12}$/, CODE = /^[A-Z0-9]{5}$/, ID = /^[a-z0-9]{4,24}$/;
const MAX_MSG = 512000, MAX_CLIENTS = 36, RATE = 80, RATE_HOST = 240; // tin/giây mỗi kết nối (chủ phòng thoáng hơn cho phòng đông)

const cors = origin => ({ 'Access-Control-Allow-Origin': okOrigin(origin) && origin ? origin : 'https://gumballzgames.vercel.app', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type, authorization', 'Vary': 'Origin' });
const json = (d, s = 200, h = {}) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', ...h } });
/* 🛡️ Turnstile (máy chủ kiểm mã "người thật" do trình duyệt gửi kèm – xem shared/ui/turnstile.js khi được port).
   Chưa đặt secret TURNSTILE_SECRET trên Worker thì bỏ qua, để web chạy như cũ. Đã đặt thì kiểm chặt theo hướng dẫn
   Cloudflare: success + action đúng chỗ + hostname trong danh sách; lỗi mạng / quá 10 giây / mã thiếu hay dài quá thì từ chối.
   ⚠️ CHỈ bật (đặt TURNSTILE_SECRET) SAU KHI phía client đã port xong turnstile.js (account.js / feedback.js / noitu gửi kèm
   mã ts) – nếu không, đăng ký / góp ý / gửi từ mới sẽ bị chặn vì không có mã để kiểm. Site key (công khai) KHÔNG nằm
   trong code: chủ web tự tạo widget Turnstile của mình và đặt vào secret TURNSTILE_SITEKEY (xem /auth/config). */
const TS_HOSTS = ['gumballzgames.vercel.app']; /* thêm 'localhost', '127.0.0.1' nếu muốn thử Turnstile khi chạy local */
async function human(env, token, ip, action) {
  if (!env.TURNSTILE_SECRET) return true; if (!token || typeof token !== 'string' || token.length > 2048) return false;
  try { const f = new FormData(); f.append('secret', env.TURNSTILE_SECRET); f.append('response', token); if (ip) f.append('remoteip', ip);
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: f, signal: AbortSignal.timeout(10000) }); const d = await r.json();
    return !!d.success && d.action === action && TS_HOSTS.includes(d.hostname);
  } catch (e) { return false; }
}
const NOT_HUMAN = { ok: false, msg: 'Chưa xác nhận được bạn là người thật – tải lại trang rồi thử lại nha.' };
/* 🔗 Nối từ: giới hạn 30 lượt báo từ/giờ cho mỗi IP. Tạm đếm trong bộ nhớ – giống bộ đếm trần AI trong server/src/ai.js, mất khi Worker khởi động lại. */
const ntRateHits = new Map();
function ntRateOk(ip) { const now = Date.now(), a = (ntRateHits.get(ip) || []).filter(t => now - t < 3600e3); if (a.length >= 30) return false; if (ntRateHits.size > 5000) ntRateHits.clear(); a.push(now); ntRateHits.set(ip, a); return true; }

/* ---------- ☕ ủng hộ qua SePay (patch -102) ---------- */
let donCache = null;
const donMsgRate = new Map(); /* 💌 mỗi IP tối đa 8 lời nhắn / 10 phút */
async function sepayHook(req, env) {
  const raw = await req.text();
  const v = await verifyWebhook('sepay', raw, req.headers, env);
  if (!v.ok) return new Response(v.msg, { status: v.status });
  const d = v.data, OK = () => new Response('{"success": true}', { status: 200, headers: { 'content-type': 'application/json' } });
  const text = String(d.content || '').toUpperCase(), amt = Math.floor(+d.transferAmount || 0);
  if (d.transferType !== 'in' || amt <= 0 || d.id == null) return OK(); /* không phải tiền vào: bỏ qua */
  const parsed = parseDonContent(text);
  if (!parsed) return OK(); /* không có chữ SEVQR GZ: không phải tiền ủng hộ */
  const L = env.LOBBY.get(env.LOBBY.idFromName('main')), id = 's' + String(d.id).slice(0, 30);
  if (await L.donHas(id)) return OK(); /* SePay gửi lại: đã ghi rồi */
  const U = env.USERS.get(env.USERS.idFromName('main'));
  const quota = Math.max(0, +env.DONATE_AUTO_QUOTA || DONATE_AUTO_QUOTA_DEFAULT);
  const used = await L.donAutoCount(monthStartVN());
  if (used >= quota) { /* hết lượt auto: xếp vào hàng chờ duyệt tay, không mất tiền */
    await L.donClaimAdd({ uid: parsed.uid, name: '', amt, ref: parsed.ref || '', msg: '', hide: parsed.hide });
    donCache = null; return OK();
  }
  let u = null;
  if (parsed.uid) u = await U.addSup(parsed.uid, amt);
  await L.donAdd({ id, at: Date.now(), amt, uid: u ? u.id : 0, name: u ? u.name : '', hide: parsed.hide, ref: parsed.ref, src: 'auto' });
  donCache = null; return OK();
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), origin = req.headers.get('Origin');
    const p = url.pathname.split('/').filter(Boolean);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(origin) });
    if (p[0] === 'r' && p.length === 3) {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('Cần WebSocket', { status: 426 });
      if (!okOrigin(origin)) return new Response('Origin không hợp lệ', { status: 403 });
      const [, ns, code] = p;
      if (!NS.test(ns) || !CODE.test(code)) return new Response('Mã phòng không hợp lệ', { status: 400 });
      const stub = env.ROOM.get(env.ROOM.idFromName(`${ns}/${code}`));
      return stub.fetch(req);
    }
    const ip = req.headers.get('CF-Connecting-IP') || '';
    const body = async () => { try { const v = JSON.parse(await req.text()); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } };
    const bearer = () => (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    // ---- tài khoản ----
    if (p[0] === 'auth') {
      if (!okOrigin(origin)) return json({ ok: false }, 403);
      const U = env.USERS.get(env.USERS.idFromName('main')), H = cors(origin);
      if (p[1] === 'config') return json({ ok: true, google: env.GOOGLE_CLIENT_ID || null, ts: env.TURNSTILE_SECRET ? (env.TURNSTILE_SITEKEY || null) : null }, 200, H);
      if (req.method !== 'POST') return json({ ok: false }, 405, H);
      const d = await body(); let r;
      if (p[1] === 'register') r = (await human(env, d.ts, ip, 'register')) ? await U.register(d, ip) : NOT_HUMAN;
      else if (p[1] === 'login') r = await U.login(d, ip);
      else if (p[1] === 'google') r = await U.google(d, ip, env.GOOGLE_CLIENT_ID);
      else if (p[1] === 'me') { const u = await U.whoami(bearer()); r = u ? { ok: true, user: u } : { ok: false, msg: 'Hết phiên đăng nhập' }; }
      else if (p[1] === 'logout') r = await U.logout(bearer());
      else if (p[1] === 'rename') r = await U.rename(bearer(), d.name);
      else if (p[1] === 'profile') r = await U.profile(bearer(), d);
      else if (p[1] === 'claim-login') r = await U.claimLogin(bearer(), d); /* 🎁 điểm danh hằng ngày */
      else if (p[1] === 'password') r = await U.changePassword(bearer(), d.old, d.new);
      else if (p[1] === 'claim-admin') r = await U.claimAdmin(bearer(), d.key, env.ADMIN_KEY, ip);
      else return json({ ok: false }, 404, H);
      return json(r, 200, H);
    }
    // ---- bạn bè & nhắn tin ----
    if (p[0] === 'friends') {
      if (!okOrigin(origin)) return json({ ok: false }, 403);
      const H = cors(origin);
      if (req.method !== 'POST') return json({ ok: false }, 405, H);
      const U = env.USERS.get(env.USERS.idFromName('main')), d = await body(), tok = bearer();
      let r;
      if (p[1] === 'list') r = await U.friendsList(tok);
      else if (p[1] === 'add') r = await U.friendAdd(tok, d);
      else if (p[1] === 'act') r = await U.friendAct(tok, d.id, d.act);
      else if (p[1] === 'msgs') r = await U.dmList(tok, d.withId, d.afterId);
      else if (p[1] === 'send') r = await U.dmSend(tok, d.toId, d.text);
      else if (p[1] === 'block') r = await U.friendBlock(tok, d.id, d.on !== false);
      else return json({ ok: false }, 404, H);
      return json(r, 200, H);
    }
    // ---- sảnh chung ----
    if (p[0] === 'presence') { // đếm người đang mở web
      if (req.headers.get('Upgrade') !== 'websocket') return json({ ok: true, n: await env.LOBBY.get(env.LOBBY.idFromName('main')).online() }, 200, cors(origin));
      if (!okOrigin(origin)) return new Response('Origin không hợp lệ', { status: 403 });
      return env.LOBBY.get(env.LOBBY.idFromName('main')).fetch(req);
    }
    if (p[0] === 'profile') { /* hồ sơ công khai của thành viên: /profile/<id hoặc tên đăng nhập> */
      if (!okOrigin(origin)) return json({ ok: false }, 403);
      const key = p[1] || (req.method === 'POST' ? (await body()).id : url.searchParams.get('id'));
      return json(await env.USERS.get(env.USERS.idFromName('main')).publicProfile(key), 200, cors(origin));
    }
    if (p[0] === 'leaderboard') {
      if (!okOrigin(origin)) return json({ ok: false }, 403);
      const U = env.USERS.get(env.USERS.idFromName('main'));
      const d = req.method === 'POST' ? await body() : { game: url.searchParams.get('game') || 'all', by: url.searchParams.get('by') || '' };
      return json(await U.leaderboard(d, bearer()), 200, cors(origin));
    }
    if (p[0] === 'lobby') {
      const L = env.LOBBY.get(env.LOBBY.idFromName('main'));
      if (p.length === 1) {
        if (req.headers.get('Upgrade') !== 'websocket') return new Response('Cần WebSocket', { status: 426 });
        if (!okOrigin(origin)) return new Response('Origin không hợp lệ', { status: 403 });
        return L.fetch(req);
      }
      if (!okOrigin(origin)) return json({ ok: false }, 403);
      if (p[1] === 'room' && req.method === 'POST') return json(await L.putRoom(await body(), ip), 200, cors(origin));
      if (p[1] === 'rooms') { /* danh sách phòng công khai cho trang chủ – giữ 10 giây ở cache để đỡ gọi Durable Object */
        const cache = caches.default, key = new Request('https://api.gumballzgames.vercel.app/lobby-rooms-cache');
        let r = await cache.match(key);
        if (!r) { r = json({ ok: true, list: await L.rooms() }, 200, { 'Cache-Control': 'public, max-age=10' }); await cache.put(key, r.clone()); }
        return new Response(r.body, { status: 200, headers: { ...Object.fromEntries(r.headers), ...cors(origin) } });
      }
      if (p[1] === 'find' && CODE.test(p[2] || '')) { /* nhập mã phòng ở trang chủ → mã thuộc game nào */
        const ids = {}; for (const g of FIND_GAMES) ids[g] = env.ROOM.idFromName(`gumballz-${g}/${p[2]}`).toString();
        return json(await L.findRoom(p[2], ids), 200, cors(origin));
      }
      return json({ ok: false }, 404, cors(origin));
    }
    if (p[0] === 'vip') { /* 👑 vé chủ web – server/src/vip.js */
      if (!okOrigin(origin)) return json({ ok: false }, 403); const H = cors(origin);
      if (p[1] === 'id' && req.method === 'POST') { const tok = bearer(); const me = tok && env.ADMIN_KEY ? await env.USERS.get(env.USERS.idFromName('main')).whoami(tok) : null; if (!me || me.banned) return json({ ok: false }, 200, H); return json({ ok: true, p: await makeIdPass(env, me.id) }, 200, H); } /* 🪪 vé tài khoản */
      if (p[1] === 'check') { const u = new URL(req.url); return json({ ok: await checkPass(env, u.searchParams.get('p'), +u.searchParams.get('uid') || 0) }, 200, H); }
      if (p[1] === 'pass' && req.method === 'POST') { const tok = bearer(); const U = env.USERS.get(env.USERS.idFromName('main')); const me = tok ? await U.whoami(tok) : null; if (!me || (me.role != null ? +me.role : (me.admin ? 2 : 0)) !== 2 || !(await U.isOwnerId(me.id)) /* 👑 chủ web hiện tại (patch -94) */ || me.banned || !env.ADMIN_KEY) return json({ ok: false }, 200, H); return json({ ok: true, pass: await makePass(env, me.id) }, 200, H); }
      return json({ ok: false }, 404, H);
    }
    if (p[0] === 'noitu') { /* 🔗 Nối từ: kho từ cộng đồng (từ cả bàn bỏ phiếu nhận, đã duyệt là có thật) */
      const L = env.LOBBY.get(env.LOBBY.idFromName('main')), H = cors(origin);
      if (p[1] === 'words' && req.method === 'GET') { /* trình duyệt nạp thêm vào từ điển – giữ 10 phút ở cache */
        const cache = caches.default, key = new Request('https://cache.gumballz/noitu-words'); let r = await cache.match(key);
        if (!r) { r = json({ ok: true, words: await L.ntWords() }, 200, { 'Cache-Control': 'public, max-age=600' }); await cache.put(key, r.clone()); }
        return new Response(r.body, { status: 200, headers: { ...Object.fromEntries(r.headers), ...H } });
      }
      if (p[1] === 'voted' && req.method === 'POST') { /* người vừa được cả bàn nhận từ báo lên; từ mới nằm chờ, chủ web duyệt tay ở trang Quản trị (KHÔNG kiểm bằng AI) */
        if (!okOrigin(origin)) return json({ ok: false }, 403);
        if (!ntRateOk(ip)) return json({ ok: false, limit: 'rate' }, 429, H);
        const d = await body(); if (!(await human(env, d.ts, ip, 'noitu'))) return json(NOT_HUMAN, 403, H);
        const w = ntNorm(d && d.w), yes = Math.max(0, Math.min(20, d.yes | 0)), no = Math.max(0, Math.min(20, d.no | 0));
        if (!w || clean(w).text !== w || yes < no || yes < 1 || !w.split(' ').every(x => /^[a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]{1,7}$/.test(x))) return json({ ok: false }, 400, H); /* mỗi tiếng phải giống tiếng Việt (chặn gõ bừa "nmfdsngfduyvgf", "hello" vẫn lọt nhưng để chủ web duyệt) */
        const r = await L.ntAdd(w, yes, no);
        return json({ ok: true, st: r.st }, 200, H);
      }
      return json({ ok: false }, 404, H);
    }
    if (p[0] === 'status') { // trạng thái hạn mức công khai (cache 60 giây)
      const cache = caches.default, key = new Request('https://gumballzgames.vercel.app/status-cache');
      let r = await cache.match(key);
      if (!r) {
        const s = await env.LOBBY.get(env.LOBBY.idFromName('main')).status(env.PLAN);
        r = json({ ok: true, level: s.level, pct: s.pct, resetAt: s.resetAt, plan: s.plan }, 200, { 'Cache-Control': 'public, max-age=60' });
        await cache.put(key, r.clone());
      }
      return new Response(r.body, { status: 200, headers: { ...Object.fromEntries(r.headers), ...cors(origin) } });
    }
    if (p[0] === 'feedback' && req.method === 'POST') {
      if (!okOrigin(origin)) return json({ ok: false }, 403);
      const inbox = env.INBOX.get(env.INBOX.idFromName('main')), txt = await req.text(); let tsTok = ''; try { tsTok = JSON.parse(txt).ts; } catch (e) {}
      if (!(await human(env, tsTok, req.headers.get('CF-Connecting-IP') || '', 'feedback'))) return json(NOT_HUMAN, 400, cors(origin));
      const r = await inbox.add(txt, req.headers.get('CF-Connecting-IP') || '', req.headers.get('User-Agent') || '');
      return json(r, r.ok ? 200 : 400, cors(origin));
    }
    if (p[0] === 'ai') { /* tính năng dùng API Claude – tự tắt khi chưa đặt secret ANTHROPIC_API_KEY */
      if (!okOrigin(origin)) return json({ ok: false }, 403);
      const L = env.LOBBY.get(env.LOBBY.idFromName('main')), H = cors(origin);
      if (p[1] === 'status') { const sp = await aiStatus(L); return json({ ok: true, on: !!env.ANTHROPIC_API_KEY, spent: sp, caps: CAPS }, 200, H); }
      if (p[1] === 'masoi' && req.method === 'POST') return json(await masoiLine(env, L, await body(), ip), 200, H);
      if (p[1] === 'ttt' && req.method === 'POST') return json(await tttCards(env, L, await body(), ip), 200, H); /* Thật hay Thách: câu theo chủ đề */
      if (p[1] === 'rules' && req.method === 'POST') return json(await rulesAnswer(env, L, await body(), ip, TUT), 200, H); /* hỏi luật trong game */
      return json({ ok: false }, 404, H);
    }
    if (p[0] === 'err' && req.method === 'POST') { // lỗi JavaScript phía người chơi (shared/ui/errlog.js)
      if (!okOrigin(origin) || !origin) return json({ ok: false }, 403);
      const inbox = env.INBOX.get(env.INBOX.idFromName('main'));
      return json(await inbox.err(await req.text(), req.headers.get('CF-Connecting-IP') || '', req.headers.get('User-Agent') || ''), 200, cors(origin));
    }
    // ---------- ☕ ủng hộ qua quét mã QR (patch -102) ----------
    if (p[0] === 'sepay' && p[1] === 'hook' && req.method === 'POST') return sepayHook(req, env); /* SePay báo có chuyển khoản (máy chủ gọi máy chủ, không cần CORS) */
    if (p[0] === 'donate') {
      const H = cors(origin); if (!okOrigin(origin)) return json({ ok: false }, 403, H);
      const L = env.LOBBY.get(env.LOBBY.idFromName('main')), U = env.USERS.get(env.USERS.idFromName('main'));
      const quota = Math.max(0, +env.DONATE_AUTO_QUOTA || DONATE_AUTO_QUOTA_DEFAULT);
      if (p[1] === 'info') { /* GET: quỹ tháng + tường cảm ơn + chỗ chuyển khoản; ?ref=6 số → hộp đang mở hỏi đã nhận chưa */
        const uid = Math.max(0, +url.searchParams.get('u') || 0), after = +url.searchParams.get('after') || 0;
        const ref = (url.searchParams.get('ref') || '').replace(/\D/g, '').slice(0, 6);
        if (ref.length === 6) { try { const paid = await L.donRef(ref); return json({ ok: true, paid, ...(paid ? await L.donInfo(monthStartVN()) : {}) }, 200, H); } catch (e) { return json({ ok: false }, 200, H); } }
        if (!uid && donCache && Date.now() - donCache.at < 30000) return json(donCache.v, 200, H);
        let r; try { r = await L.donInfo(monthStartVN(), uid, after); } catch (e) { return json({ ok: false, on: false, msg: 'Máy chủ bận – thử lại sau nha' }, 200, H); }
        const used = await L.donAutoCount(monthStartVN());
        const v = { ok: true, on: !!(env.DONATE_ACC && env.DONATE_BANK), acc: env.DONATE_ACC || '', bank: env.DONATE_BANK || '', goal: +env.DONATE_GOAL || DONATE_GOAL_DEFAULT, auto: used < quota, quotaLeft: Math.max(0, quota - used), ...r };
        if (!uid) { delete v.mine; donCache = { at: Date.now(), v }; }
        return json(v, 200, H);
      }
      if (p[1] === 'msg' && req.method === 'POST') { /* 💌 lời nhắn, gắn theo mã R…Z của hộp ủng hộ */
        const now = Date.now(), k = ip || 'x', hits = (donMsgRate.get(k) || []).filter(t => now - t < 600e3);
        if (hits.length >= 8) return json({ ok: false, msg: 'Gửi chậm lại chút nha' }, 200, H); hits.push(now); donMsgRate.set(k, hits); if (donMsgRate.size > 5000) donMsgRate.clear();
        const d = await body(), ref = String(d.ref || '').replace(/\D/g, ''), msg = clean(String(d.msg || '').replace(/\s+/g, ' ').trim().slice(0, 200)).text;
        if (ref.length !== 6) return json({ ok: false, msg: 'Mã không hợp lệ' }, 200, H);
        try { const r = await L.donMsg(ref, msg); donCache = null; return json({ ok: true, paid: r.paid, msg }, 200, H); } catch (e) { return json({ ok: false, msg: 'Máy chủ bận – thử lại sau nha' }, 200, H); }
      }
      if (p[1] === 'reply' && req.method === 'POST') { /* 💌 chủ web / Quản trị trả lời lời nhắn */
        const me = bearer() ? await U.whoami(bearer()) : null;
        if (!me || me.banned) return json({ ok: false, msg: 'Hết phiên đăng nhập' }, 200, H);
        const role = me.role != null ? +me.role : (me.admin ? 2 : 0);
        if (role < 2) return json({ ok: false, msg: 'Chỉ Quản trị mới trả lời' }, 200, H);
        const d = await body(), text = clean(String(d.text || '').trim().slice(0, 300)).text;
        const r = await L.donReply(String(d.id || ''), text);
        if (!r) return json({ ok: false, msg: 'Không tìm thấy khoản ủng hộ' }, 200, H);
        await U.auditLog({ id: me.id, name: me.name }, 'donate', r.uid, null, 'trả lời lời nhắn ủng hộ');
        donCache = null; return json({ ok: true }, 200, H);
      }
      if (p[1] === 'claim' && req.method === 'POST') { /* 🙋 gửi yêu cầu duyệt tay sau khi chuyển khoản */
        const me = bearer() ? await U.whoami(bearer()) : null;
        if (!me || me.banned) return json({ ok: false, msg: 'Đăng nhập trước nha' }, 200, H);
        const d = await body(), amt = Math.floor(+d.amount || 0), ref = String(d.ref || '').replace(/\D/g, '').slice(0, 6);
        if (!(amt >= 1000 && amt <= 50000000)) return json({ ok: false, msg: 'Số tiền từ 1.000đ đến 50.000.000đ' }, 200, H);
        if (ref.length !== 6) return json({ ok: false, msg: 'Mã ref phải có 6 số (trong nội dung chuyển khoản)' }, 200, H);
        const msg = clean(String(d.msg || '').replace(/\s+/g, ' ').trim().slice(0, 200)).text;
        const r = await L.donClaimAdd({ uid: me.id, name: me.name, amt, ref, msg, hide: !!d.hide });
        if (!r.dup && env.DONATE_DISCORD_WEBHOOK) { /* patch -160: chỉ claim MỚI chờ duyệt mới báo Discord, fire-and-forget, không chặn response */
          const p = notifyDiscordClaim(env.DONATE_DISCORD_WEBHOOK, { uid: me.id, username: me.username || '', name: me.name, amt, ref, msg, hide: !!d.hide, at: Date.now() }, fetch, 5000, env.DONATE_ADMIN_ID || '');
          if (ctx && ctx.waitUntil) ctx.waitUntil(p); else p.catch(() => {});
        }
        return json({ ok: true, claimId: r.id, dup: r.dup }, 200, H);
      }
      if (p[1] === 'admin' && req.method === 'GET') { /* 🧾 trang Quản trị: yêu cầu chờ + khoản đã nhận + quota */
        const me = bearer() ? await U.whoami(bearer()) : null;
        if (!me || me.banned) return json({ ok: false, msg: 'Hết phiên đăng nhập' }, 200, H);
        const role = me.role != null ? +me.role : (me.admin ? 2 : 0);
        if (role < 2) return json({ ok: false, msg: 'Chỉ Quản trị mới xem' }, 200, H);
        const used = await L.donAutoCount(monthStartVN());
        const info = await L.donInfo(monthStartVN());
        return json({ ok: true, month: info.got, goal: +env.DONATE_GOAL || DONATE_GOAL_DEFAULT, auto: used < quota, quotaLeft: Math.max(0, quota - used), quota, on: !!(env.DONATE_ACC && env.DONATE_BANK), hook: !!(env.SEPAY_KEY || env.SEPAY_HMAC), ...(await L.donClaims()), list: await L.donList() }, 200, H);
      }
      if (p[1] === 'claim-decide' && req.method === 'POST') { /* ✅/❌ Quản trị duyệt yêu cầu ủng hộ */
        const me = bearer() ? await U.whoami(bearer()) : null;
        if (!me || me.banned) return json({ ok: false, msg: 'Hết phiên đăng nhập' }, 200, H);
        const role = me.role != null ? +me.role : (me.admin ? 2 : 0);
        if (role < 2) return json({ ok: false, msg: 'Chỉ Quản trị mới duyệt' }, 200, H);
        const d = await body(), c = await L.donClaimDecide(+d.id || 0, d.approve === true, me.name);
        if (!c) return json({ ok: false, msg: 'Không tìm thấy yêu cầu chờ duyệt' }, 200, H);
        if (d.approve === true) {
          const u = await U.addSup(c.uid, c.amt);
          await L.donAdd({ id: 'c' + c.id, at: Date.now(), amt: c.amt, uid: u ? u.id : 0, name: u ? u.name : c.name, hide: !!c.hide, ref: c.ref, msg: c.msg, src: 'claim' });
          await U.auditLog({ id: me.id, name: me.name }, 'donate', c.uid, c.name, 'duyệt ủng hộ ' + c.amt.toLocaleString('vi-VN') + 'đ (ref ' + c.ref + ')');
        } else {
          await U.auditLog({ id: me.id, name: me.name }, 'donate', c.uid, c.name, 'từ chối yêu cầu ủng hộ ' + c.amt.toLocaleString('vi-VN') + 'đ (ref ' + c.ref + ')');
        }
        donCache = null; return json({ ok: true }, 200, H);
      }
      return json({ ok: false }, 404, H);
    }
    if (p[0] === 'admin') {
      if (p[1] === 'list' && req.method === 'POST') {
        const { key, del, op, ...d } = await req.json().catch(() => ({}));
        const want = String(env.ADMIN_KEY || '').trim();
        const H = cors(origin);
        // vào bằng mật khẩu ADMIN_KEY, hoặc bằng tài khoản đã được cấp quyền quản trị
        const adminUser = bearer() ? await env.USERS.get(env.USERS.idFromName('main')).whoami(bearer()) : null;
        const byToken = !!(adminUser && adminUser.admin && !adminUser.banned);
        if (!byToken) {
          if (!want) return json({ ok: false, msg: 'Máy chủ chưa có ADMIN_KEY – vào Cloudflare → gumballz-rooms → Settings → Variables and Secrets (KHÔNG phải mục Build) để thêm' }, 503, H);
          const UG = env.USERS.get(env.USERS.idFromName('main'));
          if (!(await UG.adminGuard(ip, null))) return json({ ok: false, msg: 'Sai nhiều lần quá – khoá 1 giờ' }, 429, H);
          if (!eqTime(String(key || '').trim(), want)) { await UG.adminGuard(ip, false); return json({ ok: false, msg: 'Sai mật khẩu' }, 401, H); }
        }
        const role = adminUser ? (adminUser.role != null ? +adminUser.role : (adminUser.admin ? 2 : 0)) : 2; /* 🎭 vào bằng ADMIN_KEY = toàn quyền (role 2) */
        const by = adminUser ? { id: adminUser.id, name: adminUser.name } : { id: 0, name: 'ADMIN_KEY' }; /* 📜 ai làm gì – ghi vào nhật ký */
        if (op) { // báo cáo, cấm chat, tài khoản
          const L = env.LOBBY.get(env.LOBBY.idFromName('main')), U = env.USERS.get(env.USERS.idFromName('main'));
          if (op === 'audit') { if (role < 2) return json({ ok: false, msg: 'Chỉ Quản trị mới xem nhật ký' }, 403, H); return json({ ok: true, ...(await U.auditList(d.off, d.lim)) }, 200, H); }
          if (op === 'users') return json({ ok: true, users: await U.adminFind(d.q) }, 200, H);
          if (op === 'user') return json(await U.adminSet(d.id, d.patch || {}, adminUser ? adminUser.id : null), 200, H);
          if (op === 'transfer-owner') { // 👑 nhượng quyền chủ web (patch -94): chỉ chủ web hiện tại (bằng token) hoặc ADMIN_KEY (không token)
            const viaKey = !adminUser;
            if (!viaKey && !(await U.isOwnerId(adminUser.id))) return json({ ok: false, msg: 'Chỉ chủ web mới nhượng quyền' }, 403, H);
            return json(await U.transferOwner(adminUser ? { id: adminUser.id, name: adminUser.name } : null, +d.id), 200, H);
          }
          if (op === 'stats') return json({ ok: true, ...(await L.admin('stats')), ...(await U.stats()) }, 200, H);
          if (op === 'usage') return json({ ok: true, ...(await L.status(env.PLAN, true)) }, 200, H);
          if (op === 'cf') { if (role < 2) return json({ ok: false, msg: 'Chỉ Quản trị mới xem số Cloudflare' }, 403, H); return json(await cfUsage(env), 200, H); } /* số thật từ Cloudflare */
          if (op === 'nt') { if (role < 2) return json({ ok: false, msg: 'Chỉ Quản trị mới duyệt kho từ' }, 403, H); const L2 = env.LOBBY.get(env.LOBBY.idFromName('main')), w = ntNorm(d.w); if (w && d.set) await L2.ntSet(w, d.set === 'ok' ? 'ok' : 'bad', 'duyệt tay'); if (w && d.del) await L2.ntDel(w); return json({ ok: true, chk: null, list: await L2.ntList() }, 200, H); } /* 🔗 kho từ Nối từ (duyệt tay; KHÔNG kiểm bằng AI – chưa đặt key) */
          d.by = by; /* 📜 cấm/ẩn/bỏ qua báo cáo đều ghi nhật ký ở Lobby DO */
          return json({ ok: true, ...(await L.admin(op, d)) }, 200, H);
        }
        if (del || (d.errs && d.errDel)) { if (role < 2) return json({ ok: false, msg: 'Chỉ Quản trị mới xoá góp ý / lỗi' }, 403, H); } /* Mod chỉ được xem góp ý + lỗi, không xoá */
        const inbox = env.INBOX.get(env.INBOX.idFromName('main'));
        if (d.errs) { if (d.errDel) await inbox.errRemove(d.errDel); return json({ ok: true, errs: await inbox.errs() }, 200, H); }
        if (del) await inbox.remove(del);
        return json({ ok: true, items: await inbox.list() }, 200, H);
      }
      return Response.redirect('https://gumballzgames.vercel.app/quantri/', 302);
    }
    if (url.pathname === '/' || p[0] === 'health') return json({ ok: true, name: 'GumballZ rooms' }, 200, cors(origin));
    return new Response('Không có gì ở đây', { status: 404 });
  },
};

// ======================= PHÒNG CHƠI =======================
export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env); this.rate = new Map();
    this.vt = new Map(); this.vtOn = true; this.vtMin = 0; this.cln = undefined; /* hẹn giờ ảo (srvhost.js) + giờ dọn phòng vắng */
    // đo thời gian thức + request để ước tính hạn mức (gửi về Sảnh mỗi phút)
    this.m = new Meter((ms, req) => env.LOBBY.get(env.LOBBY.idFromName('main')).usage(ms, req + 1));
    // "ping" → "pong" do Cloudflare tự trả lời, KHÔNG đánh thức Durable Object (không tốn thời gian chạy)
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  // báo Sảnh số người đang ở phòng này (để trang Quản trị cập nhật "đang chơi" tức thì)
  async liveSync(except) {
    const all = this.ctx.getWebSockets().map(w => [w, w.deserializeAttachment() || {}]);
    const n = all.filter(([w, a]) => w !== except && w.readyState <= 1 && a.role).length;
    if (n === this.lastN) return; this.lastN = n;
    const g = this.g || (all.find(([, a]) => a.g) || [0, {}])[1].g || ''; // game của phòng (để trang chủ biết game nào đang hot)
    try { await this.env.LOBBY.get(this.env.LOBBY.idFromName('main')).live(this.ctx.id.toString(), n, g); } catch (e) {}
  }
  host() { return this.ctx.getWebSockets('host')[0] || null; }
  client(id) { return this.ctx.getWebSockets('c:' + id)[0] || null; }
  async fetch(req) {
    await this.m.tick('req');
    const url = new URL(req.url), role = url.searchParams.get('role');
    const g = this.g = (decodeURIComponent(url.pathname.split('/')[2] || '').replace(/^gumballz-/, '').match(/^[a-z0-9]{2,12}$/) || [''])[0];
    const pair = new WebSocketPair(), [cli, srv] = Object.values(pair);
    if (role === 'host') {
      const k = (url.searchParams.get('k') || '').slice(0, 40), pk = (url.searchParams.get('pk') || '').slice(0, 40), bk = (url.searchParams.get('bk') || '').slice(0, 64);
      if (await this.srvMeta()) { this.ctx.acceptWebSocket(srv, ['reject']); srv.send(JSON.stringify({ x: 'taken' })); srv.close(4001, 'taken'); return new Response(null, { status: 101, webSocket: cli }); } /* mã này đang là phòng máy chủ giữ ván */
      const old = this.host();
      if (old) {
        const a = old.deserializeAttachment() || {};
        if (a.k !== k && !(pk && a.k === pk)) { this.ctx.acceptWebSocket(srv, ['reject']); srv.send(JSON.stringify({ x: 'taken' })); srv.close(4001, 'taken'); return new Response(null, { status: 101, webSocket: cli }); }
        try { old.close(4000, 'replaced'); } catch (e) {}
        /* socket chủ phòng bị thay: chủ phòng (mới) không còn giữ kết nối của ai → cắt hết khách để họ tự vào lại, kẻo treo im */
        for (const w of this.ctx.getWebSockets()) if (w !== old && w !== srv && (w.deserializeAttachment() || {}).role === 'c') { try { w.send('{"x":"gone"}'); w.close(1000, 'host replaced'); } catch (e) {} }
      }
      this.ctx.acceptWebSocket(srv, ['host']); srv.serializeAttachment({ role: 'host', k, g });
      /* khoá giải mã bản sao trạng thái: chỉ trao cho người lên làm chủ phòng bằng đúng chìa (pk) của chủ cũ */
      let st = null; try { st = await this.ctx.storage.get('h'); } catch (e) {}
      if (pk) try { srv.send(JSON.stringify(st && st.k === pk && st.bk ? { x: 'bk', bk: st.bk } : { x: 'nobk' })); } catch (e) {}
      if (bk && (!st || st.k !== k || st.bk !== bk)) try { await this.ctx.storage.put('h', { k, bk }); } catch (e) {}
      await this.liveSync(old);
      return new Response(null, { status: 101, webSocket: cli });
    }
    const id = url.searchParams.get('id') || '';
    this.ctx.acceptWebSocket(srv, [ID.test(id) ? 'c:' + id : 'reject']); /* id sai (quá dài…) thì không dùng làm nhãn, kẻo ném lỗi */
    if (!ID.test(id)) { srv.send('{"x":"nf"}'); srv.close(4002, 'bad id'); return new Response(null, { status: 101, webSocket: cli }); }
    /* ---- phòng "máy chủ giữ ván" (thí điểm): không có socket chủ phòng, lõi game chạy ngay trong Durable Object này ---- */
    const want = url.searchParams.get('srv') || '', ok = (url.searchParams.get('ok') || '').slice(0, 40);
    let meta = this.host() ? null : await this.srvMeta();
    if (!meta && !this.host() && ok.length >= 16 && want === g && SRV_GAMES.includes(g)) { meta = { game: g, ok, code: decodeURIComponent(url.pathname.split('/')[3] || '').slice(0, 8) }; this.meta = meta; await this.ctx.storage.put('srv', meta); try { await this.ctx.storage.deleteAlarm(); } catch (e) {} }
    else if (want && (this.host() || (meta && meta.ok !== ok))) { srv.send('{"x":"taken"}'); srv.close(4001, 'taken'); return new Response(null, { status: 101, webSocket: cli }); } /* mã này đã có phòng khác: người tạo phải chọn mã khác */
    if (meta) {
      if (this.ctx.getWebSockets().length > MAX_CLIENTS + 1) { srv.send('{"x":"full"}'); srv.close(4003, 'full'); return new Response(null, { status: 101, webSocket: cli }); }
      this.ctx.getWebSockets('c:' + id).filter(w => w !== srv).forEach(w => { try { w.close(4000, 'replaced'); } catch (e) {} });
      let ipk = ''; try { const ip = req.headers.get('CF-Connecting-IP') || ''; if (ip) ipk = (await sha(ip + '|gumballz')).slice(0, 16); } catch (e) {} /* IP đã băm (cùng muối với Sảnh) – chủ phòng chặn ai thì chặn cả IP đó trong phòng */
      srv.serializeAttachment({ role: 'c', id, g, own: !!ok && ok === meta.ok, ...(ipk ? { ipk } : {}) }); await this.ensureSrv(); await this.liveSync();
      return new Response(null, { status: 101, webSocket: cli });
    }
    if (!this.host()) { srv.send('{"x":"nf"}'); srv.close(4004, 'no room'); return new Response(null, { status: 101, webSocket: cli }); }
    if (this.ctx.getWebSockets().length > MAX_CLIENTS + 1) { srv.send('{"x":"full"}'); srv.close(4003, 'full'); return new Response(null, { status: 101, webSocket: cli }); }
    const dup = this.ctx.getWebSockets('c:' + id).filter(w => w !== srv); dup.forEach(w => { try { w.close(4000, 'replaced'); } catch (e) {} });
    srv.serializeAttachment({ role: 'c', id, g }); await this.liveSync();
    return new Response(null, { status: 101, webSocket: cli });
  }
  /* ---- hẹn giờ ảo: lõi game hẹn giờ dài thì phòng đặt báo thức rồi ngủ ---- */
  vtAdd(id, due, fn, ms) {
    if (this.vtOld && Date.now() < this.vtClampUntil) { /* vừa dựng lại sau khi bị cất khỏi bộ nhớ: hẹn giờ cùng độ dài (±6 giây, lệch do 4 giây chờ lúc dựng lại) lấy lại hạn cũ */
      let best = -1; this.vtOld.forEach((o, i) => { if (!o.used && Math.abs(o.ms - ms) <= 6000 && (best < 0 || Math.abs(o.ms - ms) < Math.abs(this.vtOld[best].ms - ms))) best = i; });
      if (best >= 0) { const o = this.vtOld[best]; o.used = id; due = Math.max(Date.now() + 300, o.due); }
    }
    this.vt.set(id, { due, fn, ms }); this.vtArm(); if (this.env.DEV_SLEEP) console.log('vt add', id, ms, due - Date.now());
  }
  vtDel(id) { if (this.vtSleep) return; /* giả lập bị cất khỏi bộ nhớ: giữ nguyên báo thức + danh sách đã lưu */
    if (this.vtOld) for (const o of this.vtOld) if (o.used === id) o.used = 0; /* hẹn giờ vừa ghép bị huỷ ngay (lúc dựng lại) → trả hạn cũ về */
    if (this.vt.delete(id)) this.vtArm(); }
  vtArm(force) {
    let m = 0; for (const t of this.vt.values()) if (!m || t.due < m) m = t.due;
    const sig = [...this.vt.values()].map(t => t.due).sort().join();
    if (sig !== this.vtSig || force) { this.vtSig = sig; this.vtMin = m; const st = this.ctx.storage; (m ? st.put('vtl', [...this.vt.values()].map(t => ({ due: t.due, ms: t.ms }))) : st.delete('vtl')).catch(() => {}); }
    const next = [m, this.cln || 0].filter(Boolean).sort((a, b) => a - b)[0];
    if (next !== this.alarmAt) { this.alarmAt = next; (next ? this.ctx.storage.setAlarm(next) : this.ctx.storage.deleteAlarm()).catch(() => {}); }
  }
  cleanAt(t) { this.cln = t; this.ctx.storage.put('cln', t).catch(() => {}); this.vtArm(); }
  vtClear() { for (const id of this.vt.keys()) forget(id); this.vt.clear(); this.vtArm(); }
  async srvMeta() { if (this.meta === undefined) { try { this.meta = (await this.ctx.storage.get('srv')) || null; } catch (e) { this.meta = null; } } return this.meta; }
  async ensureSrv() { /* dựng (lại) lõi game từ ảnh chụp đã lưu – sau khi Durable Object ngủ dậy hoặc máy chủ cập nhật */
    if (this.srv) return this.srv; const meta = await this.srvMeta(); if (!meta) return null;
    let snap = this.srvSnap || null; this.srvSnap = null; if (!snap) try { snap = await this.ctx.storage.get('snap'); } catch (e) {}
    if (meta.game === 'noitu') await noituExtra(this.env); /* Nối từ: nạp kho từ (gốc + cộng đồng) để máy chủ chấm */
    if (!this.srv) { let vtl = null; if (!this.vt.size) try { vtl = await this.ctx.storage.get('vtl'); } catch (e) {}
      if (vtl && vtl.length) { this.vtOld = vtl.map(o => ({ ...o, used: 0 })); this.vtClampUntil = Date.now() + 1500; } /* bị cất khỏi bộ nhớ lúc đang có hẹn giờ dài */
      if (!this.srv) within(this, () => { this.srv = new SrvRoom(this, meta, meta.code, snap); try { this.srv.revive(); } catch (e) { console.error('revive', e && e.stack || e); } }); }
    return this.srv;
  }
  srvReset(snap) { this.srv = null; this.srvSnap = snap || null; } /* trao quyền chủ phòng: lần có tin kế tiếp sẽ dựng lại lõi từ ảnh chụp mới */
  srvEnd() { this.srv = null; this.meta = null; for (const id of this.vt.keys()) forget(id); this.vt.clear(); this.vtMin = 0; this.cln = undefined; this.alarmAt = 0; this.ctx.storage.deleteAll().catch(() => {}); }
  limited(ws, max = RATE) { // chống spam: quá giới hạn tin/giây thì cắt (khách) hoặc bỏ qua (chủ phòng)
    const now = Date.now(), r = this.rate.get(ws) || { t: now, n: 0 };
    if (now - r.t > 1000) { r.t = now; r.n = 0; }
    r.n++; this.rate.set(ws, r); return r.n > max;
  }
  async webSocketMessage(ws, msg) {
    const a = ws.deserializeAttachment() || {}, isHost = a.role === 'host';
    if (typeof msg !== 'string' || msg.length > MAX_MSG + 200 || this.limited(ws, isHost ? RATE_HOST : RATE)) {
      if (!isHost) try { ws.close(4008, 'too much'); } catch (e) {}
      return;
    }
    if (isHost) {
      let m; try { m = JSON.parse(msg); } catch (e) { return; }
      if (!m) return;
      /* gói gộp: chủ phòng gửi tin cho nhiều người trong 1 khung → chỉ tính 1 tin vào hạn mức thay vì mỗi người 1 tin */
      for (const x of Array.isArray(m.b) ? m.b.slice(0, 64) : [m]) {
        if (!x || typeof x.to !== 'string') continue;
        const c = this.client(x.to); if (!c) { if (!x.bye) ws.send(JSON.stringify({ f: x.to, bye: 1 })); continue; }
        if (x.bye) { try { c.send('{"x":"gone"}'); c.close(1000, 'bye'); } catch (e) {} continue; }
        if (typeof x.s === 'string') try { c.send(x.s); } catch (e) {}
      }
    } else if (a.role === 'c' && !this.host() && await this.srvMeta()) {
      if (this.env.DEV_SLEEP && msg === '{"t":"__devsleep"}') { if (this.env.DEV_SLEEP) console.log('vt devsleep', [...this.vt.values()].map(t => t.due - Date.now())); this.vtSleep = true; if (this.srv) try { this.srv.host.destroy(); } catch (e) {} this.srv = null; for (const id of this.vt.keys()) forget(id); this.vt.clear(); this.vtSleep = false; this.vtSig = undefined; this.alarmAt = undefined; return; } /* chỉ máy thử (server/.dev.vars có DEV_SLEEP): giả lập phòng ngủ – mất hết bộ nhớ */
      const sr = await this.ensureSrv(); within(this, () => sr.deliver(ws, a, msg));
    } else if (a.role === 'c') {
      const h = this.host(); if (!h) { try { ws.send('{"x":"gone"}'); ws.close(1000, 'gone'); } catch (e) {} return; }
      try { h.send(JSON.stringify({ f: a.id, s: msg })); } catch (e) {}
    }
    await this.m.tick('msg');
  }
  async webSocketClose(ws, code) { this.gone(ws); try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch (e) {} await this.bye(ws); }
  async webSocketError(ws) { this.gone(ws); await this.bye(ws); }
  async bye(ws) { // phòng vắng hẳn → gửi nốt số đo (cộng ~10 giây chờ ngủ)
    if ((ws.deserializeAttachment() || {}).role) await this.liveSync(ws);
    if (this.ctx.getWebSockets().some(w => w !== ws && w.readyState === 1)) return this.m.tick('msg');
    await this.m.out();
  }
  async alarm() {
    if (await this.srvMeta()) {
      if (this.env.DEV_SLEEP) { let l = null; try { l = await this.ctx.storage.get('vtl'); } catch (e) {} console.log('vt alarm', this.vt.size, !!this.srv, JSON.stringify((l || []).map(o => o.due - Date.now())), this.cln); }
      this.alarmAt = 0; const now = Date.now(), open = this.ctx.getWebSockets().some(w => w.readyState === 1);
      /* 1) hẹn giờ ảo tới hạn (đồng hồ lượt, máy đi thay…) */
      const due = [...this.vt].filter(([, t]) => t.due <= now + 30).sort((a, b) => a[1].due - b[1].due);
      for (const [id, t] of due) { this.vt.delete(id); forget(id); within(this, () => { try { t.fn(); } catch (e) { console.error('vt', e && e.stack || e); } }); }
      /* bị cất khỏi bộ nhớ (mất hàm hẹn giờ) mà vẫn còn người: dựng lại lõi game – đồng hồ lượt được kéo về hạn cũ trong ensureSrv/vtAdd */
      if (!due.length && !this.srv && open) await this.ensureSrv();
      /* 2) phòng máy chủ giữ ván: 20 phút không còn ai thì dọn */
      if (this.cln === undefined) try { this.cln = (await this.ctx.storage.get('cln')) || 0; } catch (e) { this.cln = 0; }
      if (this.cln && this.cln <= now + 30) { if (open) this.cln = 0; else { if (this.srv) try { this.srv.host.destroy(); } catch (e) {} this.srvEnd(); return; } }
      this.vtArm(true); return;
    }
    if (!this.host()) try { await this.ctx.storage.deleteAll(); } catch (e) {}
  }
  gone(ws) {
    this.rate.delete(ws);
    const a = ws.deserializeAttachment() || {};
    if (a.role === 'host') { // chủ phòng thoát: báo mọi người (nếu chưa có chủ phòng mới thay)
      if (this.ctx.getWebSockets('host').some(w => w !== ws && w.readyState === 1)) return;
      try { this.ctx.storage.setAlarm(Date.now() + 20 * 60e3); } catch (e) {} /* phòng không còn chủ: 20 phút sau dọn khoá đã lưu */
      for (const w of this.ctx.getWebSockets()) if (w !== ws) { try { w.send('{"x":"gone"}'); w.close(1000, 'host left'); } catch (e) {} }
    } else if (a.role === 'c' && this.meta) {
      if (this.srv) within(this, () => this.srv.closed(a.id, ws));
      if (!this.ctx.getWebSockets().some(w => w !== ws && w.readyState === 1)) {
        this.cleanAt(Date.now() + 20 * 60e3);
        /* phòng vắng hẳn: tắt lõi game (hẹn giờ của máy/đồng hồ lượt giữ Durable Object thức = tốn tiền) để phòng ngủ ngay.
           Đợi 2 giây cho ảnh chụp ván (lưu sau 300ms) kịp ghi; ai quay lại thì ensureSrv() dựng lại từ ảnh chụp. */
        clearTimeout(this.napT); this.napT = setTimeout(() => {
          if (!this.srv || this.ctx.getWebSockets().some(w => w.readyState === 1)) return;
          try { this.srv.host.destroy(); } catch (e) {} this.srv = null; if (this.env.DEV_SLEEP) console.log("srv nap");
        }, 2000);
      }
    } else if (a.role === 'c') {
      const h = this.host(); if (h) try { h.send(JSON.stringify({ f: a.id, bye: 1 })); } catch (e) {}
    }
  }
}

// ======================= HỘP THƯ GÓP Ý =======================
export class Inbox extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env); this.sql = ctx.storage.sql; this.ipHits = new Map();
    this.sql.exec(`CREATE TABLE IF NOT EXISTS err (h TEXT PRIMARY KEY, ts INTEGER, first INTEGER, n INTEGER, game TEXT, msg TEXT, at TEXT, page TEXT, ua TEXT)`); // lỗi JS phía người chơi, gộp theo (game, câu lỗi, vị trí)
    this.sql.exec(`CREATE TABLE IF NOT EXISTS fb (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, t TEXT, game TEXT, msg TEXT, contact TEXT, page TEXT, ua TEXT)`);
  }
  async add(body, ip, ua) {
    let d; try { d = JSON.parse(body); } catch (e) { return { ok: false, msg: 'Dữ liệu lỗi' }; }
    const s = (v, n) => (typeof v === 'string' ? v : '').trim().slice(0, n);
    const t = ['bug', 'idea', 'other'].includes(d.t) ? d.t : 'other', msg = s(d.msg, 2000);
    if (msg.length < 3) return { ok: false, msg: 'Nội dung ngắn quá' };
    const now = Date.now(), hits = (this.ipHits.get(ip) || []).filter(x => now - x < 3600e3);
    if (hits.filter(x => now - x < 30e3).length >= 1 || hits.length >= 20) return { ok: false, msg: 'Gửi chậm lại chút nha' };
    hits.push(now); this.ipHits.set(ip, hits);
    const n = this.sql.exec('SELECT COUNT(*) AS n FROM fb').one().n;
    if (n >= 5000) this.sql.exec('DELETE FROM fb WHERE id IN (SELECT id FROM fb ORDER BY id LIMIT 100)');
    this.sql.exec('INSERT INTO fb (ts,t,game,msg,contact,page,ua) VALUES (?,?,?,?,?,?,?)', now, t, s(d.game, 20), msg, s(d.contact, 100), s(d.page, 200), s(ua, 300));
    return { ok: true };
  }
  async err(body, ip, ua) {
    let d; try { d = JSON.parse(body); } catch (e) { return { ok: false }; }
    const s = (v, n) => (typeof v === 'string' ? v : '').trim().slice(0, n);
    const msg = s(d.msg, 300), at = s(d.at, 160), game = s(d.game, 20).replace(/[^a-z0-9-]/g, '');
    if (msg.length < 3) return { ok: false };
    const now = Date.now(), k = 'e:' + ip, hits = (this.ipHits.get(k) || []).filter(x => now - x < 3600e3);
    if (hits.length >= 10) return { ok: false }; /* mỗi địa chỉ tối đa 10 lỗi/giờ */
    hits.push(now); this.ipHits.set(k, hits);
    const h = (game + '|' + msg + '|' + at).slice(0, 400);
    this.sql.exec('INSERT INTO err (h,ts,first,n,game,msg,at,page,ua) VALUES (?,?,?,1,?,?,?,?,?) ON CONFLICT(h) DO UPDATE SET n = n + 1, ts = excluded.ts, page = excluded.page, ua = excluded.ua', h, now, now, game, msg, at, s(d.page, 120), s(ua, 300));
    if (this.sql.exec('SELECT COUNT(*) AS n FROM err').one().n > 300) this.sql.exec('DELETE FROM err WHERE h IN (SELECT h FROM err ORDER BY ts LIMIT 50)');
    return { ok: true };
  }
  async errs() { return this.sql.exec('SELECT * FROM err ORDER BY ts DESC LIMIT 200').toArray(); }
  async errRemove(h) { if (h === '*') this.sql.exec('DELETE FROM err'); else this.sql.exec('DELETE FROM err WHERE h = ?', String(h)); }
  async list() { return this.sql.exec('SELECT * FROM fb ORDER BY id DESC LIMIT 500').toArray(); }
  async remove(id) { this.sql.exec('DELETE FROM fb WHERE id = ?', +id || 0); }
}

const ADMIN_HTML = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Quản trị GumballZ</title><meta name="robots" content="noindex">
<style>body{margin:0;font:15px/1.5 system-ui,sans-serif;background:#fff7ee;color:#2a2340}main{max-width:820px;margin:0 auto;padding:16px}h1{font-size:22px;margin:4px 0 10px}
input,button,select{font:inherit;padding:9px 12px;border-radius:10px;border:1.5px solid #e2d4c4}button{background:#2a2340;color:#fff;border:0;cursor:pointer}button.sm{padding:4px 10px;font-size:13px}button.red{background:#e0384a}button.gray{background:#8a7f96}
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}.tabs button{background:#fff;color:#2a2340;border:1.5px solid #e2d4c4}.tabs button.on{background:#2a2340;color:#fff}
.it{background:#fff;border-radius:14px;padding:12px 14px;margin:10px 0;box-shadow:0 2px 8px #0001}.meta{font-size:12.5px;color:#7a6f88;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.tag{padding:2px 8px;border-radius:999px;background:#eee;font-weight:700}.bug{background:#ffd9dc}.idea{background:#dff5e6}.msg{white-space:pre-wrap;margin:6px 0}.acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.r{margin-left:auto}
#stats{font-size:13px;color:#7a6f88}</style></head>
<body><main><h1>🛠️ Quản trị GumballZ</h1>
<form id="f"><input id="k" type="password" placeholder="Mật khẩu quản trị" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false"> <label style="font-size:13px"><input type="checkbox" onchange="k.type=this.checked?'text':'password'"> hiện</label> <button>Vào</button></form>
<p id="st"></p><div id="stats"></div>
<div class="tabs" id="tabs" hidden><button data-t="fb" class="on">💌 Góp ý</button><button data-t="rp">🚩 Báo cáo chat</button><button data-t="bn">⛔ Đang cấm</button><button data-t="us">👤 Tài khoản</button></div>
<div id="l"></div></main>
<script>
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const T={bug:'🐞 Lỗi',idea:'💡 Góp ý',other:'💬 Khác'};let tab='fb',D={};
const dt=t=>new Date(t).toLocaleString('vi-VN');
async function api(body){const r=await fetch('/admin/list',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:$('#k').value,...body})});return r.json()}
async function load(extra){
  const d=await api(extra||{}); if(!d.ok&&d.ok!==undefined&&!d.items&&!d.reports){$('#st').textContent=d.msg||'Lỗi';return}
  try{sessionStorage.k=$('#k').value}catch(e){} $('#st').textContent='';$('#tabs').hidden=false;
  if(tab==='fb'){D=d;$('#l').innerHTML=(d.items||[]).map(i=>'<div class="it"><div class="meta"><span class="tag '+i.t+'">'+T[i.t]+'</span><b>'+esc(i.game||'chung')+'</b><span>'+dt(i.ts)+'</span>'+(i.contact?'<span>📮 '+esc(i.contact)+'</span>':'')+'<button class="sm red r" data-del="'+i.id+'">Xoá</button></div><div class="msg">'+esc(i.msg)+'</div><div class="meta">'+esc(i.page)+' · '+esc(i.ua)+'</div></div>').join('')||'<p>Chưa có góp ý.</p>'}
  if(tab==='rp'){$('#l').innerHTML=(d.reports||[]).map(r=>'<div class="it"><div class="meta"><b>'+esc(r.tname)+'</b><span>'+esc(r.target)+'</span><span>'+dt(r.ts)+'</span><span class="r">báo bởi '+esc(r.rname)+'</span></div><div class="msg">“'+esc(r.text)+'”'+(r.reason?'\\n<i>Lý do: '+esc(r.reason)+'</i>':'')+'</div><div class="acts"><button class="sm" data-op="hide" data-msg="'+r.msg+'">Ẩn tin</button><button class="sm red" data-ban="'+esc(r.target)+'" data-h="24">Cấm chat 24h</button><button class="sm red" data-ban="'+esc(r.target)+'" data-h="168">Cấm 7 ngày</button><button class="sm red" data-ban="'+esc(r.target)+'" data-h="87600">Cấm vĩnh viễn</button><button class="sm gray" data-op="dismiss" data-id="'+r.id+'">Bỏ qua</button></div></div>').join('')||'<p>Không có báo cáo nào 🎉</p>'}
  if(tab==='bn'){$('#l').innerHTML=(d.bans||[]).map(b=>'<div class="it"><div class="meta"><b>'+esc(b.who)+'</b><span>đến '+dt(b.until)+'</span><span>'+esc(b.reason)+'</span><button class="sm r" data-unban="'+esc(b.who)+'">Gỡ cấm</button></div></div>').join('')||'<p>Không ai bị cấm.</p>'}
  if(tab==='us'){$('#l').innerHTML='<form id="uf"><input id="uq" placeholder="Tìm tên đăng nhập / tên / id"> <button>Tìm</button></form>'+((d.users||[]).map(u=>'<div class="it"><div class="meta"><b>'+esc(u.name)+'</b><span>@'+esc(u.username||'(Google)')+'</span><span>id '+u.id+'</span><span>'+dt(u.created)+'</span>'+(u.banned?'<span class="tag bug">bị khoá</span>':'')+'<span class="r"></span><button class="sm '+(u.banned?'':'red')+'" data-ub="'+u.id+'" data-v="'+(u.banned?0:1)+'">'+(u.banned?'Mở khoá':'Khoá tài khoản')+'</button>'+(u.username?'<button class="sm gray" data-pw="'+u.id+'">Đặt lại mật khẩu</button>':'')+'</div></div>').join(''));
    $('#uf').onsubmit=e=>{e.preventDefault();load({op:'users',q:$('#uq').value})}}
}
async function stats(){const s=await api({op:'stats'});if(s.ok)$('#stats').textContent='👥 Đang ở sảnh: '+s.online+' · 🚪 Phòng công khai: '+s.rooms+' · 🧑 Tài khoản: '+s.users}
function go(t){tab=t;document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));load(t==='fb'?{}:t==='us'?{op:'users',q:''}:{op:'reports'})}
$('#f').onsubmit=e=>{e.preventDefault();go(tab);stats()};
$('#tabs').onclick=e=>{const b=e.target.closest('button');if(b)go(b.dataset.t)};
$('#l').onclick=async e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.del&&confirm('Xoá góp ý này?'))return load({del:b.dataset.del});
  if(b.dataset.op){await api({op:b.dataset.op,msg:b.dataset.msg,id:b.dataset.id});return go(tab)}
  if(b.dataset.ban){const reason=prompt('Lý do cấm (tuỳ chọn):')??'';await api({op:'ban',who:b.dataset.ban,hours:+b.dataset.h,reason});return go(tab)}
  if(b.dataset.unban){await api({op:'unban',who:b.dataset.unban});return go(tab)}
  if(b.dataset.ub){if(!confirm('Chắc chưa?'))return;await api({op:'user',id:b.dataset.ub,patch:{banned:b.dataset.v==='1'}});return load({op:'users',q:$('#uq').value})}
  if(b.dataset.pw){const pw=prompt('Mật khẩu mới cho tài khoản này (≥ 6 ký tự):');if(pw&&pw.length>=6){await api({op:'user',id:b.dataset.pw,patch:{password:pw}});alert('Đã đặt lại – nhắn người đó mật khẩu mới.')}}
};
try{if(sessionStorage.k){$('#k').value=sessionStorage.k;go('fb');stats()}}catch(e){}
</script></body></html>`;
