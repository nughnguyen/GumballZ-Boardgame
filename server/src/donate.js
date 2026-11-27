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

export const DONATE_BANK_DEFAULT = { code: 'OCB', acc: '0388205003', name: 'GumballZ' }; /* 🏦 ngân hàng nhận mặc định (patch -196): đúng giá trị đang cứng trong shared/ui/donate.js — chưa đổi gì cho tới khi Quản trị lưu ngân hàng khác */
/* Mã ngân hàng VietQR 2–10 chữ cái (OCB/MB/VCB…), số tài khoản 6–20 chữ số, tên 1–50 ký tự. */
export function validateDonBank(b) {
  if (!b || typeof b !== 'object') return 'Ngân hàng nhận chưa hợp lệ.';
  const code = String(b.code || '').trim().toUpperCase();
  if (!/^[A-Z]{2,10}$/.test(code)) return 'Mã ngân hàng VietQR phải 2–10 chữ cái (vd OCB, MB, VCB).';
  const acc = String(b.acc || '').trim();
  if (!/^\d{6,20}$/.test(acc)) return 'Số tài khoản phải 6–20 chữ số.';
  const name = String(b.name || '').trim();
  if (name.length < 1 || name.length > 50) return 'Tên tài khoản phải 1–50 ký tự.';
  return null;
}
export const normDonBank = b => ({ code: String(b.code).trim().toUpperCase(), acc: String(b.acc).trim(), name: String(b.name).trim() });

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

/* 📱 Đọc nội dung thông báo biến động số dư của app ngân hàng (patch -196, webhook iPhone):
   chạy parseDonContent để lấy {uid, hide, ref} + tách số tiền.
   Số tiền tách theo thứ tự: (1) "+500,000 VND" (dấu + trước số), (2) "VND 500000",
   (3) "500,000 VND" (không dấu +). Số Việt Nam dùng . hoặc , làm dấu phân cách nghìn
   nên bỏ hết . và , rồi mới đổi sang số nguyên.
   ⚠️ Mẫu câu thông báo thật của MB Bank CHƯA được kiểm chứng — chỉ cover các dạng
   thường gặp; nếu MB Bank viết khác (vd "So du: ..." không kèm VND, số tiền viết
   "500000" không dấu phân cách) thì phải chỉnh regex theo một thông báo thật.
   ⚠️ KHÔNG dùng "đ\b" sau đơn vị tiền: "đ" không phải ký tự \w nên "+50.000đ" ở
   cuối chuỗi (hoặc trước khoảng trắng) không bao giờ khớp — dùng lookahead
   Unicode (?![\p{L}\p{N}]) thay thế (cùng cách parse.ts của web bán tool). */
export function parseBankNotif(text) {
  const parsed = parseDonContent(text);
  if (!parsed) return null;
  const t = String(text || '');
  const m = t.match(/\+\s*([\d.,]+)\s*(?:VND|VNĐ|đ)(?![\p{L}\p{N}])/iu) || t.match(/(?:VND|VNĐ)\s*([\d.,]+)/i) || t.match(/([\d.,]+)\s*(?:VND|VNĐ|đ)(?![\p{L}\p{N}])/iu);
  if (!m) return null;
  const amt = Math.floor(Number(String(m[1]).replace(/[.,]/g, '')) || 0);
  if (!(amt >= 1000 && amt <= 50000000)) return null;
  return { uid: parsed.uid, hide: parsed.hide, ref: parsed.ref, amt };
}

/* SHA-256 hex (Node + Workers đều có crypto.subtle) — dùng làm id chống trùng cho
   webhook iPhone: cùng một nội dung thông báo gửi lại thì chỉ tính 1 lần. */
export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text || '')));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* Yêu cầu chờ duyệt có cùng mã ref + uid (webhook iPhone tự duyệt khớp đơn đã tạo
   trước — tránh cộng tiền 2 lần: 1 lần tự động + 1 lần duyệt tay sau đó). */
export function donClaimPendByRef(sql, ref, uid) {
  const r = sql.exec("SELECT * FROM donclaim WHERE ref = ? AND uid = ? AND st = 'pend' ORDER BY at ASC LIMIT 1", String(ref || '').slice(0, 8), +uid || 0).toArray()[0];
  return r || null;
}
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
  try { sql.exec(`ALTER TABLE donclaim ADD COLUMN dmid TEXT`); } catch (e) {} /* patch -172: id tin nhắn Discord đã gửi cho yêu cầu — để sửa lại tin đó khi duyệt/từ chối; dòng cũ chưa có cột thì ALTER chạy 1 lần rồi các lần sau bắt lỗi bỏ qua, giống pattern cột mới của bảng don */
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
export function donAutoCount(sql, since) { return sql.exec("SELECT COUNT(*) AS n FROM don WHERE at >= ? AND src IN ('auto','iphone')", since).one().n; } /* patch -196: webhook iPhone ăn chung quota auto với SePay */

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
/* Lưu Discord message id của tin đã gửi cho yêu cầu (patch -172): route /donate/claim gọi
   sau khi notifyDiscordClaim trả về messageId — để route /donate/claim-decide sửa lại đúng
   tin đó khi duyệt/từ chối. Chỉ ghi khi dòng còn chờ duyệt (st='pend'); dmid rỗng → false. */
export function donClaimSetDmid(sql, claimId, dmid) {
  const mid = String(dmid || '').trim().slice(0, 32);
  if (!mid) return false;
  sql.exec("UPDATE donclaim SET dmid = ? WHERE id = ? AND st = 'pend'", mid, +claimId || 0);
  return true;
}

/* ---------- xoá yêu cầu ủng hộ (patch -163, đổi ngữ nghĩa ở -176) ----------
   Xoá bản ghi yêu cầu trong donclaim. Nếu yêu cầu ĐÃ DUYỆT (st='ok') thì xoá luôn
   dòng tiền tương ứng trong bảng `don` (id = 'c' + claimId, ghi khi duyệt) — quỹ
   (SUM của don) giảm đúng số tiền đó, bậc ủng hộ tính từ SUM cũng hạ theo.
   Chờ duyệt/từ chối thì chưa cộng tiền nên quỹ không đổi. Dòng don đã bị xoá trước
   đó (vd xoá riêng ở danh sách quỹ qua donDel) thì chỉ xoá claim, subtracted = 0.
   Trả về { claim, subtracted }, hoặc null khi không tìm thấy. */
export function donClaimDel(sql, id) {
  const c = sql.exec('SELECT * FROM donclaim WHERE id = ?', +id).toArray()[0];
  if (!c) return null;
  let subtracted = 0;
  if (c.st === 'ok') {
    const d = sql.exec('SELECT amt FROM don WHERE id = ?', 'c' + c.id).toArray()[0];
    if (d) { sql.exec('DELETE FROM don WHERE id = ?', 'c' + c.id); subtracted = Math.max(0, Math.floor(+d.amt || 0)); }
  }
  sql.exec('DELETE FROM donclaim WHERE id = ?', +id);
  return { claim: c, subtracted };
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
  let bank = DONATE_BANK_DEFAULT; /* 🏦 ngân hàng nhận (patch -196): chưa lưu lần nào → OCB mặc định */
  const bk = sql.exec("SELECT v FROM doncfg WHERE k = 'bank'").toArray()[0];
  if (bk) { try { const p = JSON.parse(bk.v); if (p && validateDonBank(p) === null) bank = normDonBank(p); } catch (e) {} }
  return { goal, mins: [...mins], bank };
}
export function donCfgSet(sql, goal, mins, bank) {
  const err = validateDonCfg(goal, mins);
  if (err) return { ok: false, msg: err };
  let nb = null;
  if (bank !== undefined && bank !== null) { /* bank không gửi → giữ ngân hàng cũ (tương thích route cũ) */
    const e2 = validateDonBank(bank);
    if (e2) return { ok: false, msg: e2 };
    nb = normDonBank(bank);
  }
  sql.exec("INSERT INTO doncfg (k, v) VALUES ('goal', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", String(goal));
  sql.exec("INSERT INTO doncfg (k, v) VALUES ('mins', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", JSON.stringify(mins));
  if (nb) sql.exec("INSERT INTO doncfg (k, v) VALUES ('bank', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", JSON.stringify(nb));
  const cur = donCfgGet(sql);
  return { ok: true, goal: cur.goal, mins: [...cur.mins], bank: cur.bank };
}

/* ---------- thông báo Discord khi có yêu cầu ủng hộ MỚI chờ duyệt (patch -160) ----------
   Không dùng bot, không cần hosting thêm: Worker gọi thẳng Discord webhook bằng fetch POST.
   Webhook URL lấy từ env DONATE_DISCORD_WEBHOOK (đặt làm secret trên Cloudflare, KHÔNG ghi vào repo).
   Chỉ gửi cho claim MỚI (dup=false); claim trùng không gửi lại để tránh spam. Gửi fire-and-forget:
   lỗi/timeout không chặn response của claim, log lỗi KHÔNG kèm URL. */
export const DISCORD_QUANTRI_URL = 'https://gumballzgames.vercel.app/quantri/';
export const DISCORD_BANNER_URL = 'https://gumballzgames.vercel.app/shared/img/donate-banner.png';
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
/* Tin nhắn v4 (patch -171, Components V2 — theo 3 clip Aeno user gửi 23/11):
   - clip 1 (code block làm tiêu đề): Text Display render markdown đầy đủ nên tiêu đề
     + bảng thông tin dùng code block ```...``` trực tiếp, KHÔNG cần workaround ký tự vô
     hình U+3164 như khi nhét code block vào title embed cổ điển.
   - clip 2 (Components V2): Container (accent vàng) + Text Display + Separator
     + Media Gallery (thumbnail nhỏ og.jpg từng nằm trong Section đã BỎ ở -175). Tài liệu chính thức Discord (Execute Webhook + Component Reference):
     webhook không thuộc app vẫn gửi được component KHÔNG tương tác khi URL có
     ?with_components=true và body có flags 32768 (IS_COMPONENTS_V2); lúc đó body CHỈ
     được chứa components — gửi kèm content/embeds sẽ bị 400 BAD REQUEST. Nút bấm
     (Action Row/Button) KHÔNG dùng được qua webhook này nên link Quản trị để dạng
     markdown link trong Text Display (v3 đã bỏ nút, title là link; V2 không có title).
   - clip 3 (divider/header): Separator thật ngăn các phần thay vì field rỗng.
   Ping admin: mention <@id> đặt trong Text Display — theo tài liệu chính thức, mention
   trong Text Display vẫn ping theo allowed_mentions (mảng mentions của message được
   tái tạo từ nội dung components). Giới hạn V2: tối đa 40 component, 10 top-level,
   4000 ký tự trên mọi Text Display — tin này dùng ~10 component, dưới 1000 ký tự. */
export const DISCORD_COMPONENTS_V2 = 32768; /* IS_COMPONENTS_V2 = 1 << 15 */
const TD = content => ({ type: 10, content });
const SEP = (spacing = 1) => ({ type: 14, divider: true, spacing });
/* Giờ VN, ngày trước giờ sau như trong mẫu ("22/11/2026 14:32"). */
const vnFmt = at => {
  const d = new Date(+at || Date.now());
  const day = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  const hour = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }).format(d);
  return day + ' ' + hour;
};
/* Phần dữ liệu dùng chung cho tin tạo đơn (v4) và tin cập nhật khi duyệt/từ chối (-172):
   tên/username đã vệ sinh (bỏ xuống dòng + backtick để không phá vỡ code block),
   bảng thông tin căn cột trong code block (font monospace giữ khoảng trắng). */
function donClaimParts(c) {
  const amt = Math.max(0, Math.floor(+c.amt || 0)).toLocaleString('vi-VN') + 'đ';
  const name = (String(c.name || 'Ẩn danh').replace(/[\r\n`]+/g, ' ').trim().slice(0, 30)) || 'Ẩn danh';
  const ref = String(c.ref || '').replace(/\D/g, '').slice(0, 6);
  const vn = vnFmt(+c.at || Date.now());
  const uname = String(c.username || '').replace(/[\r\n`]+/g, ' ').trim().slice(0, 30);
  const code = donTransferCode(+c.uid || 0, ref, !!c.hide);
  const pad = s => (s + '            ').slice(0, 12);
  const info = [
    ['Người gửi', name],
    ['Số tiền', amt],
    ['Thời gian', vn],
    ['ID người gửi', donUid6(+c.uid || 0)],
    ['Username', uname ? '@' + uname : name],
  ].map(([k, v]) => pad(k) + ': ' + v).join('\n');
  const msg = String(c.msg || '').trim().replace(/\r/g, '');
  return { amt, name, ref, vn, uname, code, info, msg };
}
export function discordClaimPayload(c, adminId) {
  const { name, vn, info, code, msg } = donClaimParts(c);
  const inner = [
    /* Tên donor in đậm (dòng Text Display thường — thumbnail nhỏ og.jpg đã BỎ ở -175, chỉ giữ ảnh lớn banner). */
    TD('**' + name + '**'),
    /* Tiêu đề v3 → code block (clip 1). */
    TD('```\nĐơn ủng hộ đang chờ duyệt\n```'),
    TD('Có người vừa chuyển khoản. Vào trang admin để duyệt đơn.\n[Mở trang Quản trị](' + DISCORD_QUANTRI_URL + ')'),
    SEP(1),
    TD('```\n' + info + '\n```'),
    TD('**Nội dung chuyển khoản**\n```\n' + code + '\n```'),
  ];
  if (msg) inner.push(TD('**Lời nhắn**\n' + msg.slice(0, 200).split('\n').map(l => '> ' + l).join('\n')));
  inner.push(SEP(1));
  inner.push({ type: 12, items: [{ media: { url: DISCORD_BANNER_URL }, description: 'GumballZ Boardgame' }] });
  inner.push(TD('-# GumballZ · Chờ duyệt · ' + vn));
  const out = {
    flags: DISCORD_COMPONENTS_V2,
    components: [{ type: 17, accent_color: 0xfacd33, components: inner }],
  };
  /* Tag admin bằng ID SỐ Discord (<@id> mới ping được — tag bằng tên không có tác dụng,
     @here cũng KHÔNG dùng theo dặn của user: ping trực tiếp admin.
     ID lấy từ env DONATE_ADMIN_ID; chưa cấu hình thì gửi tin không tag. Dòng tag đặt NGOÀI
     Container (như content của tin thường) để mention hiện rõ + ping theo allowed_mentions. */
  const id = String(adminId || '').trim();
  if (/^\d{5,25}$/.test(id)) {
    out.components.unshift(TD('<@' + id + '> Có đơn ủng hộ đang chờ bạn duyệt.'));
    out.allowed_mentions = { parse: [], users: [id] };
  }
  return out;
}
/* Tin nhắn CẬP NHẬT khi Quản trị duyệt/từ chối đơn (patch -172): dựng lại tin V2 từ cùng
   dòng claim, dùng lại cấu trúc Container của v4 nhưng đổi trạng thái — tiêu đề code block
   "✅ Đơn ủng hộ đã được duyệt" / "❌ Đơn ủng hộ đã bị từ chối", accent xanh lá 0x2ECC71
   khi duyệt / đỏ 0xED4245 khi từ chối, thêm dòng người duyệt + giờ quyết định (giờ VN).
   BỎ dòng tag ping (đã ping từ lúc tạo đơn) và BỎ link "Mở trang Quản trị" (quyết định xong
   rồi). Giữ nguyên bảng thông tin + mã chuyển khoản SEVQR + Lời nhắn + banner tĩnh. */
export function discordDecidePayload(c, ok, byName, decidedAt = Date.now()) {
  const { name, info, code, msg } = donClaimParts(c);
  const who = (String(byName || '').replace(/[\r\n`]+/g, ' ').trim().slice(0, 30)) || 'Quản trị';
  const vnD = vnFmt(decidedAt);
  const inner = [
    TD('**' + name + '**'),
    TD('```\n' + (ok ? '✅ Đơn ủng hộ đã được duyệt' : '❌ Đơn ủng hộ đã bị từ chối') + '\n```'),
    TD((ok ? 'Đã duyệt bởi **' + who + '** · ' : 'Đã từ chối bởi **' + who + '** · ') + vnD),
    SEP(1),
    TD('```\n' + info + '\n```'),
    TD('**Nội dung chuyển khoản**\n```\n' + code + '\n```'),
  ];
  if (msg) inner.push(TD('**Lời nhắn**\n' + msg.slice(0, 200).split('\n').map(l => '> ' + l).join('\n')));
  inner.push(SEP(1));
  inner.push({ type: 12, items: [{ media: { url: DISCORD_BANNER_URL }, description: 'GumballZ Boardgame' }] });
  inner.push(TD('-# GumballZ · ' + (ok ? 'Đã duyệt' : 'Đã từ chối') + ' · ' + vnD));
  return {
    flags: DISCORD_COMPONENTS_V2,
    components: [{ type: 17, accent_color: ok ? 0x2ecc71 : 0xed4245, components: inner }],
  };
}
export async function notifyDiscordClaim(webhookUrl, c, fetchFn = fetch, timeoutMs = 5000, adminId = '') {
  if (!webhookUrl) return { ok: false }; /* chưa cấu hình webhook: bỏ qua lặng lẽ */
  /* V2 qua webhook không thuộc app (patch -171): Discord chỉ tôn trọng field `components`
     khi URL có ?with_components=true (mặc định false thì components bị bỏ qua lặng lẽ).
     Thêm wait=true (patch -172) để Discord trả về JSON tin nhắn đã tạo thay vì 204 rỗng —
     trong đó có `id` (message id) cần để sửa lại tin khi duyệt/từ chối. Trả về
     { ok: true, messageId } khi gửi thành công, { ok: false } khi thất bại. */
  const hookUrl = String(webhookUrl);
  let sendUrl = hookUrl;
  if (!/[?&]with_components=/.test(hookUrl)) sendUrl += (sendUrl.includes('?') ? '&' : '?') + 'with_components=true';
  if (!/[?&]wait=/.test(hookUrl)) sendUrl += '&wait=true';
  try {
    const r = await fetchFn(sendUrl, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(discordClaimPayload(c, adminId)),
      signal: AbortSignal.timeout(Math.max(100, +timeoutMs || 5000)),
    });
    if (!r || !r.ok) { console.error('[donate-discord] webhook trả mã lỗi'); return { ok: false }; }
    /* Discord trả JSON tin nhắn khi wait=true; không đọc được / không có id thì vẫn tính
       là gửi ok nhưng không có messageId (route không lưu dmid, tin sẽ không được sửa sau). */
    let messageId = '';
    try { const j = await r.json(); if (j && j.id) messageId = String(j.id); } catch (e) {}
    return { ok: true, messageId };
  } catch (e) { console.error('[donate-discord] gửi thông báo thất bại'); return { ok: false }; } /* KHÔNG log URL */
}
/* Ghép URL sửa tin webhook (patch -172): PATCH /webhooks/<id>/<token>/messages/<messageId>.
   Webhook URL thật dạng https://discord.com/api/webhooks/<id>/<token> → tách id/token rồi ghép
   lại theo đúng đường REST; URL khác dạng đó (vd. mock local trong test) thì nối thẳng
   /messages/<id> vào sau URL gốc (bỏ query). */
export function discordEditUrl(webhookUrl, messageId) {
  const u = String(webhookUrl || '').split('?')[0].replace(/\/+$/, '');
  const m = u.match(/\/api\/webhooks\/(\d+)\/([\w-]+)$/);
  const base = m ? 'https://discord.com/api/webhooks/' + m[1] + '/' + m[2] : u;
  return base + '/messages/' + encodeURIComponent(String(messageId)) + '?with_components=true';
}
/* Sửa lại tin Discord của đơn đã quyết định (patch -172): PATCH tin đã gửi với payload V2
   mới (flags 32768 + components). Timeout 5s, không throw, không log URL, lỗi → false lặng
   lẽ (đơn vẫn duyệt/từ chối bình thường — chỉ mất cập nhật tin). */
export async function editDiscordClaim(webhookUrl, messageId, payload, fetchFn = fetch, timeoutMs = 5000) {
  const mid = String(messageId || '').trim();
  if (!webhookUrl || !/^\d{5,25}$/.test(mid) || !payload) return false;
  try {
    const r = await fetchFn(discordEditUrl(webhookUrl, mid), {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(Math.max(100, +timeoutMs || 5000)),
    });
    if (!r || !r.ok) { console.error('[donate-discord] sửa tin webhook trả mã lỗi'); return false; }
    return true;
  } catch (e) { console.error('[donate-discord] sửa tin webhook thất bại'); return false; } /* KHÔNG log URL */
}
