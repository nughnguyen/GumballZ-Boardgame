// 👑 Vé "chủ web" (anh dặn 18/11/2026: tên anh vào phòng phải nổi bật). Mã uid trong tin join do máy người chơi tự khai
// nên không tin được → tài khoản quản trị xin vé ký HMAC (POST /vip/pass), gửi kèm khi vào phòng; máy chủ phòng
// (SrvRoom) hoặc chủ phòng trên trình duyệt (GET /vip/check) kiểm vé rồi mới gắn cờ vip cho người đó.
const enc = new TextEncoder();
const keys = new Map();
async function key(env, ns = 'gumballz-vip:') {
  const raw = ns + (env.ADMIN_KEY || ''); let k = keys.get(raw);
  if (!k) { k = await crypto.subtle.importKey('raw', enc.encode(raw), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); keys.set(raw, k); }
  return k;
}
async function sig(env, s, ns) { const b = new Uint8Array(await crypto.subtle.sign('HMAC', await key(env, ns), enc.encode(s))); return [...b.slice(0, 16)].map(x => x.toString(16).padStart(2, '0')).join(''); }
export async function makePass(env, uid, ns) { const s = `${uid}.${Date.now() + 7 * 864e5}`; return `${s}.${await sig(env, s, ns)}`; }
export async function checkPass(env, p, uid, ns) {
  if (!env || !env.ADMIN_KEY) return false;
  const m = /^(\d{1,9})\.(\d{13})\.([0-9a-f]{32})$/.exec(String(p || ''));
  if (!m || +m[2] < Date.now() || (uid && +m[1] !== +uid)) return false;
  const want = await sig(env, `${m[1]}.${m[2]}`, ns); let d = 0;
  for (let i = 0; i < 32; i++) d |= want.charCodeAt(i) ^ m[3].charCodeAt(i);
  return d === 0;
}

/* 🪪 Vé "tài khoản" (20/11/2026): mọi tài khoản đã đăng nhập xin vé (POST /vip/id) gửi kèm khi vào phòng → máy chủ phòng biết chắc
   người đó là ai (uid trong tin join tự khai, không tin được) để áp lệnh cấm chat / cấm mở phiếu của quản trị và danh sách chặn. Khoá khác vé chủ web. */
export const ID_NS = 'gumballz-id:';
export const makeIdPass = (env, uid) => makePass(env, uid, ID_NS);
export const checkIdPass = (env, p, uid) => checkPass(env, p, uid, ID_NS);
