// 🎲 Vẽ quân Domino bằng HTML/CSS (không cần ảnh): mỗi quân là 1 ô chữ nhật
// 2 nửa, mỗi nửa hiện nút theo mẫu xúc xắc 3×3. Quân đôi trong dây vẽ dọc.
import { tileOf } from './engine.js';

/* vị trí nút trong nửa quân (theo %): góc/trên/giữa/dưới × trái/giữa/phải */
const PIP_POS = {
  tl: [25, 25], tc: [50, 25], tr: [75, 25],
  ml: [25, 50], c: [50, 50], mr: [75, 50],
  bl: [25, 75], bc: [50, 75], br: [75, 75],
};
const PIP_MAP = {
  0: [], 1: ['c'], 2: ['tl', 'br'], 3: ['tl', 'c', 'br'],
  4: ['tl', 'tr', 'bl', 'br'], 5: ['tl', 'tr', 'c', 'bl', 'br'],
  6: ['tl', 'ml', 'bl', 'tr', 'mr', 'br'],
};
const halfHTML = n => `<span class="dm-half">${PIP_MAP[n].map(k => {
  const [x, y] = PIP_POS[k];
  return `<i class="dm-pip" style="left:${x}%;top:${y}%"></i>`;
}).join('')}</span>`;

/* Quân Domino mặt ngửa. opts: { dbl } — dbl: vẽ dọc (quân đôi trong dây) */
export function tileHTML(id, opts = {}) {
  const t = tileOf(id);
  if (!t) return `<span class="dm-tile dm-back" aria-hidden="true"></span>`;
  const cls = ['dm-tile'];
  if (t.double) cls.push('dm-dbl');
  if (opts.dbl) cls.push('dm-vert');
  if (opts.cls) cls.push(opts.cls);
  return `<span class="${cls.join(' ')}" data-tile="${id}" role="img" aria-label="Quân Domino ${t.a} chấm – ${t.b} chấm">${halfHTML(t.a)}<span class="dm-div"></span>${halfHTML(t.b)}</span>`;
}
/* Quân úp (tay đối thủ / chồng rút): lưng ngà có chấm trang trí */
export function tileBackHTML(opts = {}) {
  const cls = ['dm-tile', 'dm-back'];
  if (opts.cls) cls.push(opts.cls);
  return `<span class="${cls.join(' ')}" aria-hidden="true"><i class="dm-backdot"></i></span>`;
}
export const tileName = id => { const t = tileOf(id); return t ? `${t.a}–${t.b}` : '?'; };
