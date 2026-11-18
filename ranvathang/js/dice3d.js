// 🎲 Xúc xắc 3D bằng CSS thuần — KHÔNG dùng Three.js hay CDN ngoài.
// Khối lập phương 6 mặt, mỗi mặt 1–6 chấm, mặt đối diện cộng lại = 7
// (1↔6, 2↔5, 3↔4) như xúc xắc thật. Module thuần logic, không chạm DOM
// nên test được bằng node (xem test/dice3d.mjs).
//
// Cách đặt mặt (nhìn từ phía trước, trục Z hướng ra người xem):
//   mặt 1 ở trước, mặt 6 ở sau, mặt 3 ở phải, mặt 4 ở trái,
//   mặt 2 ở trên, mặt 5 ở dưới.
// FACE_ANGLES[n] = [rotateX, rotateY] cần xoay khối để mặt n ngửa ra trước:
//   đưa pháp tuyến của mặt đó về +Z (xem test: nhân ma trận Rx·Ry).
export const FACE_ANGLES = {
  1: [0, 0],
  2: [90, 0],
  3: [0, -90],
  4: [0, 90],
  5: [-90, 0],
  6: [0, 180],
};
/* pháp tuyến của từng mặt trong hệ tọa độ của khối (trước khi xoay) */
export const FACE_NORMALS = {
  1: [0, 0, 1],
  6: [0, 0, -1],
  3: [1, 0, 0],
  4: [-1, 0, 0],
  2: [0, 1, 0],
  5: [0, -1, 0],
};
export function faceAngles(n) {
  if (!Number.isInteger(n) || n < 1 || n > 6) throw new Error('Xúc xắc chỉ có mặt 1–6.');
  return [...FACE_ANGLES[n]];
}
/* vị trí chấm trên lưới 3×3 (đánh số 0–8 theo hàng: 0 1 2 / 3 4 5 / 6 7 8) */
export const PIP_MAP = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};
/* HTML 6 mặt của khối xúc xắc: mỗi mặt là lưới 3×3 chấm, mặt úp không
   hiện chấm (class .pip không có .on). Mặt 1 và 4 chấm đỏ như xúc xắc thật. */
export function diceCubeHTML() {
  return [1, 2, 3, 4, 5, 6].map(n =>
    `<div class="dice-face f${n}" data-v="${n}">` +
    [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i =>
      `<span class="pip${PIP_MAP[n].includes(i) ? ' on' : ''}"><i></i></span>`).join('') +
    `</div>`).join('');
}
/* Góc xoay tiếp theo để khối lăn tới mặt target: từ góc hiện tại quay thêm
   ít nhất `spins` vòng (720° với spins=2) rồi dừng đúng mặt target.
   Trả {x, y} tuyệt đối — đặt thẳng vào transform rotateX/rotateY. */
export function nextSpinAngles(cur, target, spins = 2) {
  const [bx, by] = faceAngles(target);
  const norm = a => ((a % 360) + 360) % 360;
  const extra = spins * 360;
  return {
    x: cur.x + extra + norm(bx - cur.x),
    y: cur.y + extra + norm(by - cur.y),
  };
}
