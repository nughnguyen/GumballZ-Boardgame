// 🏝️ Đảo Khai Hoang – hình học bàn chơi (thuần logic): 19 ô lục giác (bán kính 2), 54 góc (chỗ dựng làng), 72 cạnh (chỗ làm đường), 9 bến thuyền.
// Ô lục giác đỉnh nhọn hướng lên, cạnh dài S. Toạ độ để vẽ SVG nằm trong khoảng ±52.
export const S = 10;
const R3 = Math.sqrt(3), key = (x, y) => Math.round(x * 10) + ',' + Math.round(y * 10);
export const HEXES = [], VERTS = [], EDGES = [];
const vid = {}, eid = {};
for (let r = -2; r <= 2; r++) for (let q = -2; q <= 2; q++) {
  if (Math.abs(q + r) > 2) continue;
  const x = S * R3 * (q + r / 2), y = S * 1.5 * r, h = { id: HEXES.length, q, r, x, y, v: [], e: [] };
  for (let k = 0; k < 6; k++) { const a = (60 * k - 90) * Math.PI / 180, vx = x + S * Math.cos(a), vy = y + S * Math.sin(a), kk = key(vx, vy);
    if (vid[kk] === undefined) { vid[kk] = VERTS.length; VERTS.push({ id: VERTS.length, x: +vx.toFixed(2), y: +vy.toFixed(2), hex: [], adj: [], edges: [] }); }
    h.v.push(vid[kk]); VERTS[vid[kk]].hex.push(h.id); }
  for (let k = 0; k < 6; k++) { const a = h.v[k], b = h.v[(k + 1) % 6], kk = Math.min(a, b) + '-' + Math.max(a, b);
    if (eid[kk] === undefined) { eid[kk] = EDGES.length; EDGES.push({ id: EDGES.length, a, b, hex: [] }); VERTS[a].adj.push(b); VERTS[b].adj.push(a); VERTS[a].edges.push(eid[kk]); VERTS[b].edges.push(eid[kk]); }
    h.e.push(eid[kk]); EDGES[eid[kk]].hex.push(h.id); }
  HEXES.push(h);
}
export const edgeOf = (a, b) => eid[Math.min(a, b) + '-' + Math.max(a, b)];
/* 9 bến thuyền: lấy các cạnh ven biển (chỉ thuộc 1 ô), xếp vòng quanh đảo, chọn cách đều */
const coast = EDGES.filter(e => e.hex.length === 1).map(e => ({ e: e.id, ang: Math.atan2((VERTS[e.a].y + VERTS[e.b].y) / 2, (VERTS[e.a].x + VERTS[e.b].x) / 2) })).sort((a, b) => a.ang - b.ang);
export const PORT_EDGES = [0, 3, 7, 10, 13, 17, 20, 23, 27].map(i => coast[i].e);
/* hai ô kề nhau (chung cạnh) – để không xếp số 6 và 8 sát nhau */
export const HEX_ADJ = HEXES.map(h => [...new Set(h.e.flatMap(e => EDGES[e].hex))].filter(i => i !== h.id));
export const PIP = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
/* vòng xoắn đặt số theo luật gốc: bắt đầu ở 1 trong 6 góc ngoài, đi ngược chiều kim đồng hồ vòng ngoài → vòng giữa → ô giữa */
const ringOf = h => Math.max(Math.abs(h.q), Math.abs(h.r), Math.abs(h.q + h.r));
export function spiral(corner) {
  const ang = h => Math.atan2(h.y, h.x), a0 = -Math.PI / 2 + corner * Math.PI / 3 - Math.PI / 6, rel = a => ((a0 - a) % (2 * Math.PI) + 2 * Math.PI + 1e-6) % (2 * Math.PI);
  const out = [];
  for (const k of [2, 1, 0]) out.push(...HEXES.filter(h => ringOf(h) === k).sort((a, b) => rel(ang(a)) - rel(ang(b))).map(h => h.id));
  return out;
}
