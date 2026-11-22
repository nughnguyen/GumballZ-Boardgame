// ☕ Ủng hộ qua quét mã QR (patch -102) – logic máy chủ, chạy trong Durable Object "Lobby" (SQLite).
// File này KHÔNG import users.js (để test node trực tiếp được) – chỉ import tierOf từ shared/donor.js.
// Mọi hàm nhận `sql` = this.sql của Durable Object (có .exec(q, ...a) → { toArray(), one() }).
// Giao thức SePay (học từ bản gốc, viết lại): webhook POST JSON { content, transferAmount, transferType, id }.
//   Xác thực: header X-SePay-Signature = "sha256=" + HMAC-SHA256(SEPAY_HMAC, X-SePay-Timestamp + "." + rawBody),
//   hoặc fallback header Authorization: "Apikey <SEPAY_KEY>". Chưa đặt secret nào → từ chối hết.
//   Nội dung chuyển khoản: "SEVQR GZ U<id 6 số>X R<ref>Z" (vd. U000001X) – U<id>X gắn tiền cho tài khoản <id>, A<id>X thì giấu tên,
//   R<ref>Z là mã của lần mở hộp (hộp tự báo đã nhận), chỉ "SEVQR GZ" = ủng hộ ẩn danh.
// Provider-pluggable: verifyWebhook(provider, ...) – SePay implement đầy đủ; Casso/PayOS chỉ có interface
//   (cần định dạng webhook + cách ký của từng hãng mới implement được – xem cuối file).
import { tierOfWith } from '../../shared/donor.js';
export const DONATE_TIER_MINS_DEFAULT = [1, 50000, 100000, 200000, 500000]; /* mốc tối thiểu 5 bậc ủng hộ (patch -102) – Quản trị sửa được từ -163 */

export const DONATE_GOAL_DEFAULT = 300000;
export const DONATE_AUTO_QUOTA_DEFAULT = 100; /* lượt auto-verify / tháng, hết thì chuyển duyệt tay */
export const monthStartVN = () => { const d = new Date(Date.now() + 7 * 3600e3); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - 7 * 3600e3; }; /* đầu tháng theo giờ VN */

export async function hmacHex(key, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)))].map(b => b.toString(16).padStart(2, '0')).join('');
}
/* so sánh chuỗi hằng thời gian (chống dò từng ký tự) */
export function timingSafeEqual(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/* "SEVQR GZ U12X R123456Z" → { uid: 12, hide: false, ref: '123456' }; "SEVQR GZ A12X R123456Z" → hide: true; "SEVQR GZ R123456Z" → { uid: 0, hide: true, ref: '123456' }.
   Id trong nội dung là dạng 6 số (patch -108): "SEVQR GZ U000001X R123456Z" → uid 1; regex \d{1,8} chấp nhận cả số 0 ở đầu và dạng cũ U1X.
   Mã R<6 số>Z BẮT BUỘC phải đúng định dạng – thiếu/sai thì trả null (webhook bỏ qua, không cộng tiền, không xếp chờ; người chuyển có thể gửi yêu cầu duyệt tay). */
export function parseDonContent(text) {
  const t = String(text || '').toUpperCase();
  if (!/SEVQR\s+GZ\b/.test(t)) return null;
  const rf = t.match(/R\s*(\d{6})\s*Z/);
  if (!rf) return null; /* không có mã ref hợp lệ: không biết gắn vào lần mở hộp nào → bỏ qua */
  const m = t.match(/GZ\s*([UA])\s*(\d{1,8})\s*X/);
  return { uid: m ? +m[2] : 0, hide: !m || m[1] === 'A', ref: rf[1] };
}

/* Xác thực webhook theo từng hãng. Trả { ok: true, data } hoặc { ok: false, status, msg }. */
export async function verifyWebhook(provider, raw, headers, env) {
  const p = String(provider || 'sepay').toLowerCase();
  if (p === 'sepay') {
    if (String(raw || '').length > 20000) return { ok: false, status: 413, msg: 'too big' };
    if (env.SEPAY_HMAC) {
      const ts = headers.get('X-SePay-Timestamp') || '', sig = (headers.get('X-SePay-Signature') || '').replace(/^sha256=/, '');
      if (!ts || !sig || !timingSafeEqual(sig, await hmacHex(env.SEPAY_HMAC, ts + '.' + raw))) return { ok: false, status: 401, msg: 'bad sig' };
    } else if (env.SEPAY_KEY) {
      if (!timingSafeEqual((headers.get('Authorization') || '').trim(), 'Apikey ' + env.SEPAY_KEY)) return { ok: false, status: 401, msg: 'bad key' };
    } else return { ok: false, status: 503, msg: 'not set' };
    let d; try { d = JSON.parse(raw); } catch (e) { return { ok: false, status: 400, msg: 'bad json' }; }
    return { ok: true, data: d };
  }
  /* Casso / PayOS: CHƯA implement – mỗi hãng có định dạng payload + cách ký riêng.
     Casso: webhook POST JSON, ký bằng secureToken (header "secure-token" hoặc field secure_token – cần tài liệu Casso lúc tích hợp).
     PayOS: webhook POST JSON { code, desc, data: {...}, signature }, ký HMAC-SHA256(checksumKey, "key1=value1&key2=value2..." theo thứ tự alphabet của data).
     Khi có tài khoản + tài liệu của hãng, implement thêm 1 nhánh ở đây, phần còn lại (donAdd/addSup/quota/claim) dùng chung. */
  return { ok: false, status: 501, msg: 'provider ' + p + ' chưa hỗ trợ – cần định dạng webhook của hãng' };
}

/* ---------- bảng lưu trong Lobby DO ---------- */
export function donTables(sql) {
  sql.exec(`CREATE TABLE IF NOT EXISTS don (id TEXT PRIMARY KEY, at INTEGER, amt INTEGER, uid INTEGER, name TEXT, hide INTEGER DEFAULT 0, ref TEXT, msg TEXT, src TEXT DEFAULT 'auto', reply TEXT, rat INTEGER)`);
  sql.exec(`CREATE TABLE IF NOT EXISTS donmsg (ref TEXT PRIMARY KEY, msg TEXT, at INTEGER)`);
  sql.exec(`CREATE TABLE IF NOT EXISTS donclaim (id INTEGER PRIMARY KEY AUTOINCREMENT, uid INTEGER, name TEXT, amt INTEGER, ref TEXT, msg TEXT, hide INTEGER DEFAULT 0, at INTEGER, st TEXT DEFAULT 'pend', decided INTEGER, byName TEXT)`);
  sql.exec(`CREATE TABLE IF NOT EXISTS doncfg (k TEXT PRIMARY KEY, v TEXT)`); /* 🎯 cấu hình quỹ (patch -163): k='goal' (mục tiêu quỹ), k='mins' (JSON 5 mốc tối thiểu các bậc) – lưu trong Lobby DO nên bền qua restart/redeploy, không dùng env var */
  try { sql.exec(`ALTER TABLE don ADD COLUMN src TEXT DEFAULT 'auto'`); } catch (e) {}
  try { sql.exec(`ALTER TABLE don ADD COLUMN reply TEXT`); } catch (e) {}
  try { sql.exec(`ALTER TABLE don ADD COLUMN rat INTEGER`); } catch (e) {}
}

export function donHas(sql, id) { return sql.exec('SELECT 1 FROM don WHERE id = ?', String(id)).toArray().length > 0; }

/* d = { id, at, amt, uid, name, hide, ref, msg, src } – id của SePay nên gửi lại nhiều lần vẫn chỉ tính 1 */
export function donAdd(sql, d) {
  if (sql.exec('SELECT 1 FROM don WHERE id = ?', String(d.id)).toArray().length) return { dup: true };
  const pm = d.ref ? sql.exec('SELECT msg FROM donmsg WHERE ref = ?', String(d.ref)).toArray()[0] : null;
  sql.exec('INSERT INTO don (id, at, amt, uid, name, hide, ref, msg, src) VALUES (?,?,?,?,?,?,?,?,?)', String(d.id), +d.at || Date.now(), Math.max(0, Math.floor(+d.amt || 0)), +d.uid || 0, String(d.name || '').slice(0, 30), d.hide ? 1 : 0, d.ref ? String(d.ref).slice(0, 8) : null, d.msg ? String(d.msg).slice(0, 200) : pm ? pm.msg : null, String(d.src || 'auto').slice(0, 12));
  return { dup: false };
}

export function donInfo(sql, since = 0, uid = 0, after = 0, mins) {
  const got = sql.exec('SELECT COALESCE(SUM(amt),0) AS s, COUNT(*) AS n FROM don WHERE at >= ?', since).one();
  const wall = sql.exec('SELECT uid, MAX(name) AS name, MAX(at) AS at, SUM(amt) AS s FROM don WHERE hide = 0 AND uid > 0 GROUP BY uid ORDER BY s DESC, at DESC LIMIT 40').toArray().map(r => ({ name: r.name, at: r.at, t: tierOfWith(r.s, mins) })); /* xếp theo bậc ủng hộ, chỉ lộ số bậc – bậc tính theo mốc tuỳ chỉnh (patch -163), không có mốc thì dùng mốc mặc định */
  const anon = sql.exec('SELECT COUNT(*) AS n FROM don WHERE hide = 1 OR uid = 0').one().n;
  const mine = uid ? sql.exec('SELECT COALESCE(SUM(amt),0) AS s FROM don WHERE uid = ? AND at > ?', uid, after).one().s : 0;
  /* 💌 lời nhắn gần đây (người giấu tên / khách hiện "Ẩn danh") + lời cảm ơn của chủ web */
  const msgs = sql.exec("SELECT id, at, uid, name, hide, msg, reply, rat FROM don WHERE msg IS NOT NULL AND msg != '' ORDER BY at DESC LIMIT 20").toArray()
    .map(r => ({ id: r.id, at: r.at, name: r.hide || !r.uid ? '' : r.name, msg: r.msg, reply: r.reply || '', rat: r.rat || 0, me: !!(uid && r.uid === uid) }));
  return { got: got.s, n: got.n, wall, anon, mine, msgs };
}

export function donRef(sql, ref) { const r = sql.exec('SELECT amt FROM don WHERE ref = ? AND at > ?', String(ref), Date.now() - 2 * 3600e3).toArray(); return r.reduce((t, x) => t + x.amt, 0); }
export function donList(sql) { return sql.exec('SELECT id, at, amt, uid, name, hide, ref, msg, src, reply, rat FROM don ORDER BY at DESC LIMIT 300').toArray(); }
export function donAutoCount(sql, since) { return sql.exec("SELECT COUNT(*) AS n FROM don WHERE at >= ? AND src = 'auto'", since).one().n; }

/* 💌 người ủng hộ gửi lời nhắn theo mã R…Z của hộp: tiền về rồi thì gắn luôn, chưa về thì giữ chờ (2 ngày) */
export function donMsg(sql, ref, msg) {
  ref = String(ref); msg = String(msg || '').slice(0, 200); const now = Date.now();
  sql.exec('DELETE FROM donmsg WHERE at < ?', now - 2 * 864e5);
  sql.exec('INSERT INTO donmsg (ref, msg, at) VALUES (?,?,?) ON CONFLICT(ref) DO UPDATE SET msg = excluded.msg, at = excluded.at', ref, msg, now);
  const r = sql.exec('SELECT id FROM don WHERE ref = ? AND at > ? AND reply IS NULL', ref, now - 2 * 864e5).toArray();
  for (const x of r) sql.exec('UPDATE don SET msg = ? WHERE id = ?', msg || null, x.id);
  return { ok: true, paid: r.length > 0 };
}

export function donReply(sql, id, text) { const r = sql.exec('SELECT uid FROM don WHERE id = ?', String(id)).toArray()[0]; if (!r) return null; sql.exec('UPDATE don SET reply = ?, rat = ? WHERE id = ?', text ? String(text).slice(0, 300) : null, text ? Date.now() : null, String(id)); return r; }
export function donDel(sql, id) { const r = sql.exec('SELECT uid, amt FROM don WHERE id = ?', String(id)).toArray()[0]; sql.exec('DELETE FROM don WHERE id = ?', String(id)); return r || null; }

/* ---------- duyệt thủ công (fallback khi hết quota auto) ---------- */
export function donClaimAdd(sql, c) {
  /* cùng 1 tài khoản + 1 mã ref mà còn yêu cầu chờ thì cập nhật thay vì tạo trùng (chỉ khi có cả uid lẫn ref – khoản ẩn danh/không ref thì mỗi khoản 1 yêu cầu riêng) */
  const old = (+c.uid > 0 && c.ref) ? sql.exec("SELECT id FROM donclaim WHERE uid = ? AND ref = ? AND st = 'pend'", +c.uid, String(c.ref)).toArray()[0] : null;
  if (old) { sql.exec('UPDATE donclaim SET amt = ?, msg = ?, hide = ?, at = ? WHERE id = ?', Math.floor(+c.amt || 0), String(c.msg || '').slice(0, 200), c.hide ? 1 : 0, Date.now(), old.id); return { id: old.id, dup: true }; }
  const r = sql.exec('INSERT INTO donclaim (uid, name, amt, ref, msg, hide, at) VALUES (?,?,?,?,?,?,?)', +c.uid, String(c.name || '').slice(0, 30), Math.floor(+c.amt || 0), String(c.ref).slice(0, 8), String(c.msg || '').slice(0, 200), c.hide ? 1 : 0, Date.now());
  return { id: sql.exec('SELECT last_insert_rowid() AS id').one().id, dup: false }; /* lấy id vừa chèn theo cách của lobby.js (Miniflare không có lastInsertRowid) */
}
export function donClaims(sql) {
  return {
    pend: sql.exec("SELECT * FROM donclaim WHERE st = 'pend' ORDER BY at ASC LIMIT 100").toArray(),
    done: sql.exec("SELECT * FROM donclaim WHERE st != 'pend' ORDER BY decided DESC LIMIT 50").toArray(),
  };
}
export function donClaimDecide(sql, id, ok, byName) {
  const c = sql.exec('SELECT * FROM donclaim WHERE id = ?', +id).toArray()[0];
  if (!c || c.st !== 'pend') return null;
  sql.exec('UPDATE donclaim SET st = ?, decided = ?, byName = ? WHERE id = ?', ok ? 'ok' : 'no', Date.now(), String(byName || '').slice(0, 30), +id);
  return c;
}

/* ---------- xoá yêu cầu ủng hộ (patch -163) ----------
   Xoá CHỈ bản ghi yêu cầu trong donclaim — KHÔNG trừ tiền khỏi quỹ, KHÔNG gỡ hạng ủng hộ:
   tiền thật nằm ở bảng `don` riêng (ghi khi SePay báo về / khi duyệt), huy hiệu tính từ tổng
   tiền trong `don` nên cả hai đều giữ nguyên dù claim đã duyệt có bị xoá đi chăng nữa.
   Trả về dòng claim vừa xoá (để ghi audit), hoặc null khi không tìm thấy. */
export function donClaimDel(sql, id) {
  const c = sql.exec('SELECT * FROM donclaim WHERE id = ?', +id).toArray()[0];
  if (!c) return null;
  sql.exec('DELETE FROM donclaim WHERE id = ?', +id);
  return c;
}

/* ---------- cấu hình quỹ: mục tiêu + mốc 5 bậc (patch -163) ----------
   Lưu trong bảng doncfg của Lobby DO (bền qua restart/redeploy, giống cách lưu owner ở Users DO).
   Chưa lưu lần nào → mục tiêu = DONATE_GOAL_DEFAULT (300.000đ), mốc = mốc mặc định.
   Hạng đã đạt trước đó tính theo mốc MỚI từ lúc lưu (bậc tính lại từ tổng tiền mỗi lần đọc). */
export function validateDonCfg(goal, mins) {
  if (!Number.isInteger(goal) || goal <= 0) return 'Mục tiêu quỹ phải là số nguyên lớn hơn 0.';
  if (!Array.isArray(mins) || mins.length !== 5) return 'Cần đúng 5 mốc bậc.';
  for (let i = 0; i < 5; i++) {
    if (!Number.isInteger(mins[i]) || mins[i] < 1) return 'Mốc bậc ' + (i + 1) + ' phải là số nguyên từ 1 trở lên.';
    if (i > 0 && mins[i] <= mins[i - 1]) return '5 mốc phải tăng dần: mốc bậc ' + (i + 1) + ' phải lớn hơn mốc bậc ' + i + '.';
  }
  return null;
}
export function donCfgGet(sql) {
  const g = sql.exec("SELECT v FROM doncfg WHERE k = 'goal'").toArray()[0];
  const m = sql.exec("SELECT v FROM doncfg WHERE k = 'mins'").toArray()[0];
  let mins = DONATE_TIER_MINS_DEFAULT;
  if (m) { try { const p = JSON.parse(m.v); if (Array.isArray(p) && p.length === 5 && p.every(x => Number.isInteger(x) && x >= 1)) mins = p; } catch (e) {} }
  const goal = g && Number.isInteger(+g.v) && +g.v > 0 ? +g.v : DONATE_GOAL_DEFAULT;
  return { goal, mins: [...mins] };
}
export function donCfgSet(sql, goal, mins) {
  const err = validateDonCfg(goal, mins);
  if (err) return { ok: false, msg: err };
  sql.exec("INSERT INTO doncfg (k, v) VALUES ('goal', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", String(goal));
  sql.exec("INSERT INTO doncfg (k, v) VALUES ('mins', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", JSON.stringify(mins));
  return { ok: true, goal, mins: [...mins] };
}

/* ---------- thông báo Discord khi có yêu cầu ủng hộ MỚI chờ duyệt (patch -160) ----------
   Không dùng bot, không cần hosting thêm: Worker gọi thẳng Discord webhook bằng fetch POST.
   Webhook URL lấy từ env DONATE_DISCORD_WEBHOOK (đặt làm secret trên Cloudflare, KHÔNG ghi vào repo).
   Chỉ gửi cho claim MỚI (dup=false); claim trùng không gửi lại để tránh spam. Gửi fire-and-forget:
   lỗi/timeout không chặn response của claim, log lỗi KHÔNG kèm URL. */
export const DISCORD_QUANTRI_URL = 'https://gumballzgames.vercel.app/quantri/';
export const DISCORD_BANNER_URL = 'https://gumballzgames.vercel.app/shared/img/donate-banner.png';
export const DISCORD_THUMB_URL = 'https://gumballzgames.vercel.app/shared/img/og.jpg';
/* Ảnh banner TĨNH (shared/img/donate-banner.png, vẽ sẵn từ đúng mẫu neobrutalism):
   bản render ĐỘNG theo từng đơn (api/donate-banner.js) đã BỎ vì Vercel không chạy được —
   bản Edge bị từ chối lúc build ("unsupported modules: @vercel: module"), bản Node của
   @vercel/og crash lúc gọi (FUNCTION_INVOCATION_FAILED), bản satori + resvg trực tiếp
   cũng crash lúc gọi (resvg-js là native binding .node, Vercel Serverless Functions
   không chạy được). Thông tin từng đơn đã có đủ trong các field của embed nên ảnh
   tĩnh không làm mất thông tin nào. */
/* uid 6 số như badges.js (patch -108) + nội dung chuyển khoản đúng công thức client (shared/ui/donate.js):
   'SEVQR GZ U<uid6>X R<ref>Z' (giấu tên thì 'A' thay 'U'; ẩn danh uid=0 thì 'SEVQR GZ R<ref>Z'). */
export const donUid6 = id => String(id ?? '').padStart(6, '0');
export function donTransferCode(uid, ref, hide) {
  const r = String(ref || '').replace(/\D/g, '').slice(0, 6);
  if (!uid) return r ? 'SEVQR GZ R' + r + 'Z' : 'SEVQR GZ';
  return 'SEVQR GZ ' + (hide ? 'A' : 'U') + donUid6(uid) + 'X' + (r ? ' R' + r + 'Z' : '');
}
/* Embed v3 (patch -168, thiết kế lại theo đúng mẫu user gửi 19:06 ngày 22/11 + dặn 19:08 "ping tôi á"):
   author = tên người ủng hộ (icon = logo site — avatar nhân vật 3D trong web không có URL ảnh);
   title là LINK tới /quantri/ nên BỎ hẳn nút link "Mở trang Quản trị"; content tag TRỰC TIẾP
   admin bằng ID số <@id> (KHÔNG dùng @here); field Nội dung chuyển khoản vẫn MÃ THẬT
   'SEVQR GZ U<uid6>X R<ref>Z' (SePay khớp giao dịch + modal donate đều dùng đúng công thức này,
   chữ "GUMBALLZ NGUYENVANA 8F3K" trong mẫu chỉ là chữ mẫu). */
export function discordClaimPayload(c, adminId) {
  const amt = Math.max(0, Math.floor(+c.amt || 0)).toLocaleString('vi-VN') + 'đ';
  const name = String(c.name || 'Ẩn danh').slice(0, 30) || 'Ẩn danh';
  const ref = String(c.ref || '').replace(/\D/g, '').slice(0, 6);
  const at = new Date(+c.at || Date.now());
  /* Giờ VN, ngày trước giờ sau như trong mẫu ("22/11/2026 14:32"). */
  const vnDay = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(at);
  const vnHour = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }).format(at);
  const vn = vnDay + ' ' + vnHour;
  const uname = String(c.username || '').trim().slice(0, 30);
  const fields = [
    { name: 'Người gửi', value: name, inline: true },
    { name: 'Số tiền', value: amt, inline: true },
    { name: 'Thời gian', value: vn, inline: true },
    { name: 'ID người gửi', value: donUid6(+c.uid || 0), inline: true },
    { name: 'Username', value: uname ? '@' + uname : name, inline: true },
    { name: 'Nội dung chuyển khoản', value: '`' + donTransferCode(+c.uid || 0, ref, !!c.hide) + '`' },
  ];
  const msg = String(c.msg || '').trim();
  if (msg) fields.push({ name: 'Lời nhắn', value: msg.slice(0, 200) });
  const out = {
    embeds: [{
      author: { name, icon_url: DISCORD_THUMB_URL },
      title: 'Đơn ủng hộ đang chờ duyệt',
      url: DISCORD_QUANTRI_URL,
      description: 'Có người vừa chuyển khoản. Vào trang admin để duyệt đơn.',
      color: 0xfacd33,
      fields,
      thumbnail: { url: DISCORD_THUMB_URL },
      image: { url: DISCORD_BANNER_URL },
      footer: { text: 'GumballZ · Chờ duyệt' },
      timestamp: at.toISOString(),
    }],
  };
  /* Tag admin bằng ID SỐ Discord (<@id> mới ping được — tag bằng tên không có tác dụng,
     @here cũng KHÔNG dùng theo dặn của user: ping trực tiếp admin.
     ID lấy từ env DONATE_ADMIN_ID; chưa cấu hình thì gửi embed không tag. */
  const id = String(adminId || '').trim();
  if (/^\d{5,25}$/.test(id)) {
    out.content = '<@' + id + '> Có đơn ủng hộ đang chờ bạn duyệt.';
    out.allowed_mentions = { parse: [], users: [id] };
  }
  return out;
}
export async function notifyDiscordClaim(webhookUrl, c, fetchFn = fetch, timeoutMs = 5000, adminId = '') {
  if (!webhookUrl) return false; /* chưa cấu hình webhook: bỏ qua lặng lẽ */
  try {
    const r = await fetchFn(String(webhookUrl), {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(discordClaimPayload(c, adminId)),
      signal: AbortSignal.timeout(Math.max(100, +timeoutMs || 5000)),
    });
    if (!r || !r.ok) { console.error('[donate-discord] webhook trả mã lỗi'); return false; }
    return true;
  } catch (e) { console.error('[donate-discord] gửi thông báo thất bại'); return false; } /* KHÔNG log URL */
}
