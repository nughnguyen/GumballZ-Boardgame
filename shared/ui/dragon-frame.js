/* 🐉 Rồng bay khung avatar (patch -147) — module thuần, KHÔNG DOM, KHÔNG localStorage.
   Port từ bản thảo rồng -144 (~/workspace/user/files/50_khung_avatar_GumballZ-rong-moi.html,
   dòng 193-262): đầu + từng đốt thân là <g> có offset-path + offset-rotate:auto nên đầu tự xoay
   theo tiếp tuyến quỹ đạo (đã đo thật bằng Playwright ở -144: góc đầu đổi -151°..153° khi bay
   hết vòng số 8). Tọa độ path SVG giữ nguyên bản -144; đầu vẽ hướng +X.
   12 đốt: 1 đầu + 10 thân + 1 đuôi, mỗi đốt cách nhau 3% chu vi quỹ đạo (delay âm DRG_GAP*D).
   Cải tiến so với -144 (xem báo cáo -147):
   (1) vảy thân: highlight trắng 0.28 → 0.45, bóng đen 0.18 → 0.28, thêm đường viền vảy
       (cung stroke c2 opacity .6) + đường chữ V giữa vảy đậm hơn (0.35 → 0.55);
   (2) cánh: thêm xương cánh thứ 4 (M0,3 L-26,-20) + lớp màng sáng phủ trắng opacity .14
       (gradient nhẹ bằng fill opacity, không dùng id gradient để tránh trùng id khi nhiều
       rồng cùng trang);
   (3) đầu: thêm tia sáng 4 cánh ở mắt + chấm sáng trắng trên đồng tử, râu có đầu nhọn
       (thêm tam giác nhọn ở cuối mỗi râu, thay cho đầu tròn).
   Dùng: profile.js import { dragonSVG } và gọi dragonSVG(c1, c2, 3, 'orbit' | 'edge') khi
   frameAnim là 'dragon' / 'dragon-edge'; màu c1/c2 lấy từ trường dragon:[c1,c2] của FRAMES entry.
   CSS đi kèm ở shared/css/avatar.css (.pf-fr .dov, drg-show, drg-fly, drg-flap). */
export const DRG8 = 'M 0 0 C 35 -38 68 -38 68 0 C 68 38 35 38 0 0 C -35 -38 -68 -38 -68 0 C -68 38 -35 38 0 0 Z';
export const DRGC = 'M 68 0 A 68 68 0 1 1 -68 0 A 68 68 0 1 1 68 0 Z';
export const DRG_SEG = 12, DRG_GAP = .03; // 12 đốt: 1 đầu + 10 thân + 1 đuôi, mỗi đốt cách nhau 3% chu vi quỹ đạo
const r2 = (x, n = 2) => x.toFixed(n);
export function dragonHead(c1, c2) {
  return `<g class="drg-head">`
  + `<path class="drg-mane" d="M-8,-6 C-16,-12 -26,-12 -32,-5 C-26,-5 -21,-1 -19,3 C-25,3 -29,7 -31,12 C-23,9 -14,7 -9,2 Z" fill="${c2}"/>`
  + `<path class="drg-mane" d="M-6,-1 C-14,-5 -21,-2 -26,2 C-20,4 -13,6 -7,4 Z" fill="${c1}"/>`
  + `<path class="drg-horn" d="M-2,-13 C-6,-19 -12,-24 -20,-27 C-24,-28 -27,-28 -28,-27 C-24,-24 -20,-21 -17,-18 C-19,-20 -23,-21 -27,-20 C-22,-16 -16,-13 -10,-11 C-7,-10 -4,-11 -2,-13 Z" fill="#ffe9a8" stroke="${c2}" stroke-width="1.4"/>`
  + `<path class="drg-horn" d="M4,-15 C3,-22 0,-27 -5,-30 C-2,-24 -1,-19 0,-15 Z" fill="#ffe9a8" stroke="${c2}" stroke-width="1.4"/>`
  + `<path d="M-12,-7 C-14,-13 -6,-17 2,-16 C12,-15 20,-11 24,-5 C26,-2 25,2 22,4 C16,9 6,11 -2,10 C-10,9 -14,0 -12,-7 Z" fill="${c1}" stroke="${c2}" stroke-width="1.2"/>`
  + `<path d="M-8,4 C0,8 12,8 20,3 C16,8 6,11 -2,10 C-6,9 -8,7 -8,4 Z" fill="#000" opacity=".18"/>`
  + `<path d="M10,-2 L26,-1 L24,3 L9,3 Z" fill="#7a1a1a"/>`
  + `<path class="drg-teeth" d="M12,-1 L14,2 L16,-1 Z M18,-1 L20,2 L22,-1 Z M13,3 L15,1 L17,3 Z" fill="#fff"/>`
  + `<path d="M14,1.5 Q19,4 23,2 L22,3.5 Q18,5 14,3 Z" fill="#ff5a6a"/>`
  + `<path class="drg-eye" d="M2,-10 C5,-14 12,-14 16,-10 C12,-5 6,-5 2,-10 Z" fill="#fff"/>`
  + `<circle class="drg-eye" cx="9" cy="-9.5" r="2.8" fill="#ffb800"/><circle cx="9" cy="-9.5" r="1.4" fill="#1a1a1a"/>`
  + `<circle cx="10" cy="-10.5" r="0.9" fill="#fff"/>`
  + `<path d="M16,-16 L17,-13.5 L19.5,-12.5 L17,-11.5 L16,-9 L15,-11.5 L12.5,-12.5 L15,-13.5 Z" fill="#fff" opacity=".9"/>`
  + `<path d="M1,-13 L17,-14 L15,-10 L3,-9 Z" fill="${c2}"/>`
  + `<ellipse cx="22" cy="-4" rx="1.4" ry="1" fill="#1a1a1a"/>`
  + `<path class="drg-whisker" d="M20,0 C29,2 36,8 38,15" fill="none" stroke="${c2}" stroke-width="2.2" stroke-linecap="round"/>`
  + `<path class="drg-whisker" d="M20,-2 C27,-7 34,-9 41,-9" fill="none" stroke="${c2}" stroke-width="2" stroke-linecap="round"/>`
  + `<path d="M38,15 L43,17.5 L38,19.5 Z" fill="${c2}"/>`
  + `<path d="M41,-9 L46,-10.5 L41,-5.5 Z" fill="${c2}"/>`
  + `<path d="M0,9 C-2,14 -6,16 -10,15 C-6,12 -4,10 -2,8 Z" fill="${c2}"/></g>`;
}
export function dragonSeg(c1, c2, spike) {
  return `<g class="drg-seg">`
  + (spike ? `<path d="M-3,-8 L2,-18 L7,-7 Z" fill="${c2}"/>` : '')
  + `<path d="M-15,0 C-12,-9 -4,-11 3,-10 C10,-9 15,-4 15,0 C15,4 10,9 3,10 C-4,11 -12,9 -15,0 Z" fill="${c1}" stroke="${c2}" stroke-width="1"/>`
  + `<path d="M-12,2 C-8,7 8,7 13,1 C10,7 4,10 -2,10 C-8,10 -12,6 -12,2 Z" fill="#000" opacity=".28"/>`
  + `<ellipse cx="-1" cy="-5" rx="9" ry="3" fill="#fff" opacity=".45"/>`
  + `<path d="M-13,-3 C-8,-8 -2,-9 4,-8 C10,-7 13,-4 14,-1" fill="none" stroke="${c2}" stroke-width="1.2" opacity=".6"/>`
  + `<path d="M-6,-2 Q0,2 6,-2" fill="none" stroke="${c2}" stroke-width="1.2" opacity=".55"/></g>`;
}
export function dragonTail(c1, c2) {
  return `<g class="drg-tail">`
  + `<path d="M4,0 C-6,-7 -16,-9 -26,-5 C-20,-1 -14,1 -8,2 C-14,4 -20,7 -24,12 C-16,10 -6,6 4,3 Z" fill="${c1}" stroke="${c2}" stroke-width="1"/>`
  + `<path d="M-24,-5 L-33,-13 L-28,-1 Z" fill="${c2}"/><path d="M-22,8 L-30,15 L-24,4 Z" fill="${c2}"/></g>`;
}
export function dragonWing(c1, c2, far) {
  const inner = `<path d="M1,3 C-6,-10 -18,-26 -38,-30 C-32,-19 -26,-12 -20,-7 C-25,-9 -30,-9 -36,-6 C-28,1 -12,6 1,7 Z" fill="${far ? c2 : c1}" stroke="${c2}" stroke-width="1"/>`
  + `<path d="M1,3 C-6,-10 -18,-26 -38,-30 C-32,-19 -26,-12 -20,-7 C-25,-9 -30,-9 -36,-6 C-28,1 -12,6 1,7 Z" fill="#fff" opacity=".14"/>`
  + `<path d="M0,3 L-20,-7 M0,3 L-28,-12 M0,3 L-26,-20 M0,3 L-36,-26" fill="none" stroke="${c2}" stroke-width="1" opacity=".55"/>`;
  return far ? `<g transform="translate(-4,-3) scale(.68)"><g class="drw far">${inner}</g></g>` : `<g class="drw">${inner}</g>`;
}
/* mode 'orbit': bay số 8 qua mặt avatar (DRG8); mode 'edge': bay tròn quanh mép viền (DRGC).
   D = thời gian bay 1 vòng (giây, mặc định 3); phase = pha bắt đầu (0 = đầu ở tâm, dùng cho
   khung nhiều rồng: rồng thứ 2 phase 1/3, thứ 3 phase 2/3 để rồng cách đều nhau trên quỹ đạo). */
export function dragonSVG(c1, c2, D = 3, mode = 'orbit', phase = 0) {
  const path = mode === 'edge' ? DRGC : DRG8;
  let s = '';
  const base = -phase * D;
  for (let i = DRG_SEG - 1; i >= 1; i--) s += `<g class="drs" style="offset-path:path('${path}');offset-rotate:auto;animation:drg-fly ${D}s linear infinite;animation-delay:${r2(base - i * DRG_GAP * D)}s">${i === DRG_SEG - 1 ? dragonTail(c1, c2) : dragonSeg(c1, c2, i % 2 === 0)}</g>`;
  return `<svg class="dov" viewBox="-90 -90 180 180">${s}<g class="drh" style="offset-path:path('${path}');offset-rotate:auto;animation:drg-fly ${D}s linear infinite;animation-delay:${r2(base)}s"><g transform="translate(-8,-12)">${dragonWing(c1, c2, true)}${dragonWing(c1, c2, false)}</g>${dragonHead(c1, c2)}</g></svg>`;
}
