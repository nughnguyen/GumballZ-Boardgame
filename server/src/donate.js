// ☕ Ủng hộ qua quét mã QR (patch -102) – logic máy chủ, chạy trong Durable Object "Lobby" (SQLite).
// File này KHÔNG import users.js (để test node trực tiếp được) – chỉ import tierOf từ shared/donor.js.
// Mọi hàm nhận `sql` = this.sql của Durable Object (có .exec(q, ...a) → { toArray(), one() }).
// Giao thức SePay (học từ bản gốc, viết lại): webhook POST JSON { content, transferAmount, transferType, id }.
//   Xác thực: header X-SePay-Signature = "sha256=" + HMAC-SHA256(SEPAY_HMAC, X-SePay-Timestamp + "." + rawBody),
//   hoặc fallback header Authorization: "Apikey <SEPAY_KEY>". Chưa đặt secret nào → từ chối hết.
//   Nội dung chuyển khoản: "SEVQR GZ U<id>X R<ref>Z" – U<id>X gắn tiền cho tài khoản <id>, A<id>X thì giấu tên,
//   R<ref>Z là mã của lần mở hộp (hộp tự báo đã nhận), chỉ "SEVQR GZ" = ủng hộ ẩn danh.
// Provider-pluggable: verifyWebhook(provider, ...) – SePay implement đầy đủ; Casso/PayOS chỉ có interface
//   (cần định dạng webhook + cách ký của từng hãng mới implement được – xem cuối file).
import { tierOf } from '../../shared/donor.js';

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

export function donInfo(sql, since = 0, uid = 0, after = 0) {
  const got = sql.exec('SELECT COALESCE(SUM(amt),0) AS s, COUNT(*) AS n FROM don WHERE at >= ?', since).one();
  const wall = sql.exec('SELECT uid, MAX(name) AS name, MAX(at) AS at, SUM(amt) AS s FROM don WHERE hide = 0 AND uid > 0 GROUP BY uid ORDER BY s DESC, at DESC LIMIT 40').toArray().map(r => ({ name: r.name, at: r.at, t: tierOf(r.s) })); /* xếp theo bậc ủng hộ, chỉ lộ số bậc */
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
