// 👑 Vé "chủ web" (anh dặn 18/11/2026: tên anh vào phòng phải nổi bật). Mã uid trong tin join do máy người chơi tự khai
// nên không tin được → tài khoản quản trị xin vé ký HMAC (POST /vip/pass), gửi kèm khi vào phòng; máy chủ phòng
// (SrvRoom) hoặc chủ phòng trên trình duyệt (GET /vip/check) kiểm vé rồi mới gắn cờ vip cho người đó.
const enc = new TextEncoder();
const keys = new Map();
async function key(env) {
  const raw = 'gumballz-vip:' + (env.ADMIN_KEY || ''); let k = keys.get(raw);
  if (!k) { k = await crypto.subtle.importKey('raw', enc.encode(raw), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); keys.set(raw, k); }
  return k;
}
async function sig(env, s) { const b = new Uint8Array(await crypto.subtle.sign('HMAC', await key(env), enc.encode(s))); return [...b.slice(0, 16)].map(x => x.toString(16).padStart(2, '0')).join(''); }
export async function makePass(env, uid) { const s = `${uid}.${Date.now() + 7 * 864e5}`; return `${s}.${await sig(env, s)}`; }
export async function checkPass(env, p, uid) {
  if (!env || !env.ADMIN_KEY) return false;
  const m = /^(\d{1,9})\.(\d{13})\.([0-9a-f]{32})$/.exec(String(p || ''));
  if (!m || +m[2] < Date.now() || (uid && +m[1] !== +uid)) return false;
  const want = await sig(env, `${m[1]}.${m[2]}`); let d = 0;
  for (let i = 0; i < 32; i++) d |= want.charCodeAt(i) ^ m[3].charCodeAt(i);
  return d === 0;
}
