// 🗺️ Bản đồ Tàu Xuyên Việt: 28 thành phố + các tuyến đường sắt giả tưởng nối giữa chúng. Toạ độ vẽ (theo vị trí thật) nằm ở geo.js do tools/xuyenviet/make-map.py sinh;
// hai số sau tên thành phố dưới đây chỉ là giá trị dự phòng, bị geo.js ghi đè ngay bên dưới.
import { XY } from './geo.js?v=1';
// Tuyến: [thành phố A, thành phố B, số toa (độ dài), màu]. Màu 'x' = tuyến xám, dùng bộ thẻ cùng một màu bất kỳ.
export const CITIES = {
  laocai: ['Lào Cai', 30, 12], hagiang: ['Hà Giang', 46, 6], dienbien: ['Điện Biên', 11, 24], sonla: ['Sơn La', 25, 31], langson: ['Lạng Sơn', 64, 17],
  hanoi: ['Hà Nội', 48, 30], halong: ['Hạ Long', 71, 29], haiphong: ['Hải Phòng', 62, 37], ninhbinh: ['Ninh Bình', 49, 43], thanhhoa: ['Thanh Hoá', 45, 53],
  vinh: ['Vinh', 43, 67], donghoi: ['Đồng Hới', 52, 83], hue: ['Huế', 61, 96], danang: ['Đà Nẵng', 70, 104], quangngai: ['Quảng Ngãi', 78, 116],
  kontum: ['Kon Tum', 62, 121], pleiku: ['Pleiku', 61, 134], quynhon: ['Quy Nhơn', 82, 132], bmt: ['Buôn Ma Thuột', 61, 150], nhatrang: ['Nha Trang', 84, 154],
  dalat: ['Đà Lạt', 69, 165], phanthiet: ['Phan Thiết', 74, 180], hcm: ['TP.HCM', 50, 181], vungtau: ['Vũng Tàu', 60, 193], tayninh: ['Tây Ninh', 35, 171],
  cantho: ['Cần Thơ', 36, 194], rachgia: ['Rạch Giá', 20, 191], camau: ['Cà Mau', 26, 208],
};
for (const k of Object.keys(CITIES)) if (XY[k]) { CITIES[k][1] = XY[k][0]; CITIES[k][2] = XY[k][1]; }
export const COLORS = ['r', 'b', 'g', 'y', 'o', 'p', 'k', 'w']; /* đỏ, xanh dương, xanh lá, vàng, cam, tím, đen, trắng */
export const COLOR_NAME = { r: 'đỏ', b: 'xanh dương', g: 'xanh lá', y: 'vàng', o: 'cam', p: 'tím', k: 'đen', w: 'trắng', L: 'đầu máy', x: 'xám' };
export const ROUTES = [
  ['laocai', 'hagiang', 2, 'x'], ['laocai', 'dienbien', 3, 'g'], ['laocai', 'hanoi', 4, 'r'], ['laocai', 'sonla', 2, 'x'], ['dienbien', 'sonla', 2, 'y'], ['sonla', 'hanoi', 3, 'b'],
  ['hagiang', 'langson', 3, 'o'], ['hagiang', 'hanoi', 4, 'k'], ['langson', 'hanoi', 2, 'p'], ['langson', 'halong', 2, 'x'], ['hanoi', 'haiphong', 2, 'w'], ['hanoi', 'halong', 3, 'g'],
  ['halong', 'haiphong', 1, 'x'], ['hanoi', 'ninhbinh', 2, 'y'], ['haiphong', 'ninhbinh', 2, 'x'], ['sonla', 'thanhhoa', 4, 'p'], ['ninhbinh', 'thanhhoa', 1, 'x'], ['thanhhoa', 'vinh', 2, 'r'],
  ['vinh', 'donghoi', 3, 'b'], ['donghoi', 'hue', 2, 'o'], ['hue', 'danang', 1, 'x'], ['vinh', 'hue', 5, 'k'], ['danang', 'quangngai', 2, 'w'], ['danang', 'kontum', 3, 'g'],
  ['quangngai', 'kontum', 2, 'x'], ['quangngai', 'quynhon', 2, 'y'], ['kontum', 'pleiku', 1, 'x'], ['pleiku', 'quynhon', 2, 'p'], ['pleiku', 'bmt', 2, 'r'], ['quynhon', 'nhatrang', 3, 'b'],
  ['bmt', 'nhatrang', 2, 'o'], ['bmt', 'dalat', 2, 'x'], ['nhatrang', 'dalat', 2, 'w'], ['nhatrang', 'phanthiet', 3, 'k'], ['dalat', 'phanthiet', 2, 'g'], ['dalat', 'hcm', 4, 'y'],
  ['bmt', 'tayninh', 5, 'x'], ['phanthiet', 'hcm', 3, 'r'], ['phanthiet', 'vungtau', 2, 'x'], ['hcm', 'vungtau', 2, 'b'], ['hcm', 'tayninh', 2, 'o'], ['hcm', 'cantho', 3, 'w'],
  ['tayninh', 'rachgia', 4, 'k'], ['cantho', 'rachgia', 2, 'g'], ['cantho', 'camau', 2, 'y'], ['rachgia', 'camau', 2, 'x'], ['vungtau', 'cantho', 3, 'p'], ['thanhhoa', 'donghoi', 6, 'x'],
].map(([a, b, n, c], i) => ({ id: i, a, b, n, c }));
export const ROUTE_PTS = [0, 1, 2, 4, 7, 10, 15];
/* vé đích: nối được hai thành phố thì cộng điểm, không thì trừ. Điểm = quãng đường ngắn nhất (tính sẵn bên dưới). */
const PAIRS = [['hanoi', 'hcm'], ['laocai', 'camau'], ['hagiang', 'danang'], ['dienbien', 'hue'], ['langson', 'nhatrang'], ['halong', 'quynhon'], ['haiphong', 'dalat'], ['hanoi', 'danang'], ['sonla', 'vinh'], ['vinh', 'pleiku'],
  ['hue', 'hcm'], ['danang', 'cantho'], ['quangngai', 'vungtau'], ['kontum', 'tayninh'], ['bmt', 'rachgia'], ['nhatrang', 'camau'], ['hue', 'bmt'], ['donghoi', 'phanthiet'], ['hanoi', 'hue'], ['thanhhoa', 'kontum'],
  ['laocai', 'halong'], ['dienbien', 'haiphong'], ['hagiang', 'ninhbinh'], ['dalat', 'cantho'], ['quynhon', 'hcm'], ['phanthiet', 'rachgia'], ['hcm', 'camau'], ['danang', 'dalat'], ['ninhbinh', 'quangngai'], ['langson', 'vinh']];
export function shortest(a, b, ok = () => true, cost = r => r.n) { /* Dijkstra đơn giản trên ROUTES; trả { d, path: [id tuyến] } hoặc null */
  const dist = { [a]: 0 }, prev = {}, done = new Set();
  for (;;) { let u = null; for (const k of Object.keys(dist)) if (!done.has(k) && (u === null || dist[k] < dist[u])) u = k; if (u === null) return null; if (u === b) break; done.add(u);
    for (const r of ROUTES) { if (r.a !== u && r.b !== u) continue; if (!ok(r)) continue; const v = r.a === u ? r.b : r.a, d = dist[u] + cost(r); if (dist[v] === undefined || d < dist[v]) { dist[v] = d; prev[v] = [u, r.id]; } } }
  const path = []; for (let v = b; v !== a; v = prev[v][0]) path.push(prev[v][1]); return { d: dist[b], path };
}
export const TICKETS = PAIRS.map(([a, b], i) => ({ id: i, a, b, pts: shortest(a, b).d }));
