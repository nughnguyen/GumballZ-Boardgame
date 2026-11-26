// 🧩 Phần nhẹ của avatar-rewards.js (tách ra patch -195 để tối ưu tải trang game).
// Chỉ chứa logic mở linh kiện theo cấp + nhãn món — KHÔNG chứa khung avatar,
// màu tên, hiệu ứng thắng hay lộ trình thưởng. stats.js / wallet.js import từ
// đây để không kéo cả avatar-rewards.js (73 KB) vào mọi trang game.
// Thuần logic, không đụng DOM, dùng chung cho trình duyệt và máy chủ (server
// src/users.js kiểm nhân vật người khác gửi lên qua avatar-rewards.js, file
// này được re-export từ đó nên không đổi gì ở máy chủ). localStorage /
// dispatchEvent đều có guard typeof — an toàn khi chạy trên Node.
import { OPTIONS } from './avatar-opts.js?v=12';

/* XP từ stats: s.xp có sẵn thì dùng, không thì tính từ ván chơi/ván thắng. */
export const xpOf = s => (s ? (s.xp != null ? +s.xp || 0 : (+s.p || 0) * 10 + (+s.w || 0) * 20) : 0);

/* ---------- mở khoá linh kiện theo CẤP (2026-11-21, Nguyễn dặn: lên cấp tự mở linh kiện) ----------
   Cấp từ XP: lv = floor(sqrt(xp/50)) + 1 (cùng công thức level() ở stats.js) → cấp 2: 50 XP, 3: 200, 4: 450,
   5: 800, 6: 1250, 7: 1800, 8: 2450, 9: 3200, 10: 4050. Mỗi cấp mở 1–2 món, rải đều tóc → nón/đồ → phụ kiện/sừng.
   Món cơ bản (kiểu Người, tóc ngắn, áo thun, không nón/phụ kiện/sừng, toàn bộ màu tóc/màu chủ đạo/màu da) KHÔNG khoá.
   Linh kiện trúng từ rương Gacha mở SỚM hơn cấp (xem gachaParts bên dưới) — tới cấp thì vẫn tự mở đúng món. */
export const xpLevel = xp => Math.min(10, Math.floor(Math.sqrt(Math.max(0, +xp || 0) / 50)) + 1);
export const LOCKED_PARTS = [
  { k: 'hair', v: 'spiky', lv: 2 }, { k: 'hair', v: 'ponytail', lv: 2 },
  { k: 'hat', v: 'cap', lv: 3 }, { k: 'acc', v: 'scarf', lv: 3 },
  { k: 'outfit', v: 'jersey', lv: 4 }, { k: 'hair', v: 'wavy', lv: 4 },
  { k: 'hat', v: 'cowboy', lv: 5 }, { k: 'acc', v: 'backpack', lv: 5 },
  { k: 'outfit', v: 'aodai', lv: 6 }, { k: 'kind', v: 'fox', lv: 6 },
  { k: 'hat', v: 'crown', lv: 7 }, { k: 'acc', v: 'moneybag', lv: 7 },
  { k: 'outfit', v: 'mecha', lv: 8 }, { k: 'hair', v: 'quiff', lv: 8 },
  { k: 'kind', v: 'frog', lv: 9 }, { k: 'horns', v: 'bull', lv: 9 },
  { k: 'acc', v: 'foxtails', lv: 10 }, { k: 'horns', v: 'devil', lv: 10 },
];
export const partId = (k, v) => k + ':' + v;
export const PART_IDS = new Set(LOCKED_PARTS.map(p => partId(p.k, p.v)));
export const isKnownPart = id => PART_IDS.has(id);
export const levelLockOf = (k, v) => { const p = LOCKED_PARTS.find(x => x.k === k && x.v === v); return p ? p.lv : 0; };

/* linh kiện trúng từ rương Gacha (mở sớm hơn cấp): lưu ở 'gumballz-parts', đồng bộ lên tài khoản (P.parts).
   Chỉ id trong LOCKED_PARTS mới được lưu — id lạ bị loại ở đây và ở máy chủ. */
const PARTS_KEY = 'gumballz-parts';
export function readParts() { try { if (typeof localStorage === 'undefined') return []; const a = JSON.parse(localStorage.getItem(PARTS_KEY)); return Array.isArray(a) ? [...new Set(a.filter(x => typeof x === 'string' && isKnownPart(x)))] : []; } catch (e) { return []; } }
export function writeParts(list) { try { if (typeof localStorage === 'undefined') return; localStorage.setItem(PARTS_KEY, JSON.stringify([...new Set((list || []).filter(x => typeof x === 'string' && isKnownPart(x)))])); } catch (e) {} }
export function hasGachaPart(k, v) { return readParts().includes(partId(k, v)); }
export function grantGachaPart(id) { if (!isKnownPart(id)) return false; const cur = readParts(); if (cur.includes(id)) return false; writeParts([...cur, id]); try { if (typeof dispatchEvent !== 'undefined') dispatchEvent(new CustomEvent('gumballz-parts')); } catch (e) {} return true; }
/* món đã mở chưa: không khoá theo cấp → mở; đủ cấp → mở; trúng rương → mở sớm */
export function partOpen(id, xp, parts) { const p = LOCKED_PARTS.find(x => partId(x.k, x.v) === id); if (!p) return true; if (xpLevel(xp) >= p.lv) return true; const set = parts || readParts(); return set.includes(id); }

/* ---------- tiện ích cho giao diện ---------- */
const KIND_LABEL = { kind: '🐾 Nhân vật', hair: '💇 Tóc', hat: '🎩 Nón', outfit: '👕 Trang phục', acc: '🎒 Phụ kiện' };
export const itemLabel = (k, v) => {
  const list = OPTIONS[k] || []; const hit = list.find(o => Array.isArray(o) ? o[0] === v : o === v);
  return (KIND_LABEL[k] || k) + ' · ' + (Array.isArray(hit) ? hit[1] : (hit || v));
};
