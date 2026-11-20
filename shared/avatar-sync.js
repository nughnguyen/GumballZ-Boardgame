// 🧸 Nhân vật đồng bộ theo tài khoản — dùng chung web (shared/ui/sync.js) + máy chủ (server/src/users.js).
// Nhân vật lưu phẳng trong localStorage 'gumballz-avatar':
//   chibi 3D: { kind, skin, hair, hairColor, hat, outfit, acc, horns, color, sex, e:'ch', c, f, n, t }
//   emoji cũ: { e:'🐱', c, f, n, t }
// Máy chủ chỉ giữ bản mới nhất theo thời gian (t), giống ví xu. Bản đầy đủ (có nhân vật) thắng
// bản thiếu (chỉ e/c/t) khi cùng thời gian — để tài khoản cũ từng mất nhân vật tự lành khi máy
// chính đồng bộ lại (không cần chọn lại nhân vật).
// Không bao giờ nhận bản thiếu {e:'ch'} không có nhân vật đè lên nhân vật ở máy — đó là vòng lặp
// khiến mỗi lần F5 lại ra một nhân vật khác (máy chủ trả bản thiếu → máy random mới → lần sau lại thế).
export const AVATAR_CH = ['kind', 'skin', 'hair', 'hairColor', 'hat', 'outfit', 'acc', 'horns', 'color'];
export function avatarHasChar(a) { return !!(a && typeof a === 'object' && (a.kind || (a.ch && typeof a.ch === 'object' && a.ch.kind))); }
/* bản dùng được: emoji, hoặc chibi có đủ nhân vật; bản {e:'ch'} không có nhân vật là bản hỏng, bỏ qua */
export function avatarUsable(a) { return !!(a && typeof a === 'object' && typeof a.e === 'string' && a.e && (a.e !== 'ch' || avatarHasChar(a))); }
/* chỉ nhận các trường đã biết, chuỗi ngắn; dạng lồng {ch:{...}} cũng gỡ phẳng ra */
export function cleanAvatar(a) {
  if (!a || typeof a !== 'object' || typeof a.e !== 'string' || !a.e || a.e.length > 16) return null;
  const src = (a.ch && typeof a.ch === 'object' && a.ch.kind) ? { ...a, ...a.ch } : a;
  const o = { e: a.e, c: Math.min(40, Math.max(0, Math.floor(+a.c || 0))), t: Math.min(4e12, Math.max(0, Math.floor(+a.t || 0))) };
  if (typeof a.f === 'string' && /^[a-z0-9]{2,14}$/.test(a.f)) o.f = a.f;
  if (typeof a.n === 'string' && /^[a-z0-9]{2,14}$/.test(a.n)) o.n = a.n;
  if (a.sex === 'nam' || a.sex === 'nu') o.sex = a.sex;
  for (const k of AVATAR_CH) if (typeof src[k] === 'string' && src[k].length > 0 && src[k].length <= 24) o[k] = src[k];
  return o;
}
