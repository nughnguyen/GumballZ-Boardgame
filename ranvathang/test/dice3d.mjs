// Test xúc xắc 3D (dice3d.js). Chạy: node ranvathang/test/dice3d.mjs
// Kiểm ánh xạ mặt → góc xoay ĐÚNG bằng ma trận xoay (không chỉ ghi nhớ số):
// áp Rx·Ry lên pháp tuyến của mặt phải ra +Z (hướng ra người xem).
// Kiểm lăn thêm đủ vòng, chấm trên mỗi mặt đúng số, HTML đủ 6 mặt.
import assert from 'assert/strict';
import { FACE_ANGLES, FACE_NORMALS, faceAngles, PIP_MAP, diceCubeHTML, nextSpinAngles } from '../js/dice3d.js';

let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

/* Rx(θ): y' = y·cosθ − z·sinθ, z' = y·sinθ + z·cosθ
   Ry(θ): x' = x·cosθ + z·sinθ, z' = −x·sinθ + z·cosθ
   CSS `rotateX(a) rotateY(b)` = Rx(a)·Ry(b): áp Ry trước, rồi Rx. */
const rad = d => d * Math.PI / 180;
const rotX = (v, a) => { const c = Math.cos(rad(a)), s = Math.sin(rad(a)); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; };
const rotY = (v, a) => { const c = Math.cos(rad(a)), s = Math.sin(rad(a)); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; };
const round3 = v => v.map(x => Math.round(x * 1000) / 1000 + 0); /* +0 để -0 thành 0 */

test('ánh xạ mặt → góc xoay đúng giá trị kỳ vọng', () => {
  assert.deepEqual(faceAngles(1), [0, 0]);
  assert.deepEqual(faceAngles(2), [90, 0]);
  assert.deepEqual(faceAngles(3), [0, -90]);
  assert.deepEqual(faceAngles(4), [0, 90]);
  assert.deepEqual(faceAngles(5), [-90, 0]);
  assert.deepEqual(faceAngles(6), [0, 180]);
  assert.throws(() => faceAngles(0), /1–6/);
  assert.throws(() => faceAngles(7), /1–6/);
});

test('xoay khối theo góc đó thì đúng mặt đó ngửa ra trước (+Z)', () => {
  for (let n = 1; n <= 6; n++) {
    const [x, y] = faceAngles(n);
    const out = round3(rotX(rotY(FACE_NORMALS[n], y), x));
    assert.deepEqual(out, [0, 0, 1], `mặt ${n} sau khi xoay phải hướng ra trước, được [${out}]`);
  }
});

test('mặt đối diện cộng lại = 7 như xúc xắc thật', () => {
  const opp = { 1: 6, 6: 1, 2: 5, 5: 2, 3: 4, 4: 3 };
  for (let n = 1; n <= 6; n++) {
    assert.equal(n + opp[n], 7);
    /* mặt đối diện có pháp tuyến ngược nhau */
    assert.deepEqual(FACE_NORMALS[opp[n]], FACE_NORMALS[n].map(v => -v + 0));
  }
});

test('lăn tới mặt đích: dừng đúng mặt, quay thêm ít nhất đủ vòng', () => {
  for (const cur of [{ x: 0, y: 0 }, { x: 90, y: -90 }, { x: 720, y: 1080 }, { x: -90, y: 180 }]) {
    for (let target = 1; target <= 6; target++) {
      const next = nextSpinAngles(cur, target, 2);
      const [bx, by] = FACE_ANGLES[target];
      const norm = a => ((a % 360) + 360) % 360;
      assert.equal(norm(next.x), norm(bx), `từ ${JSON.stringify(cur)} tới mặt ${target}: góc X dừng đúng`);
      assert.equal(norm(next.y), norm(by), `từ ${JSON.stringify(cur)} tới mặt ${target}: góc Y dừng đúng`);
      assert.ok(next.x - cur.x >= 720, 'quay X thêm ít nhất 2 vòng');
      assert.ok(next.y - cur.y >= 720, 'quay Y thêm ít nhất 2 vòng');
      /* mặt đích sau khi lăn phải ngửa ra trước */
      const out = round3(rotX(rotY(FACE_NORMALS[target], next.y), next.x));
      assert.deepEqual(out, [0, 0, 1], `lăn tới mặt ${target} phải ngửa ra trước`);
    }
  }
});

test('số chấm trên mỗi mặt đúng giá trị mặt đó', () => {
  for (let n = 1; n <= 6; n++) {
    assert.equal(PIP_MAP[n].length, n, `mặt ${n} có ${n} chấm`);
    assert.equal(new Set(PIP_MAP[n]).size, n, `mặt ${n} không trùng vị trí chấm`);
    assert.ok(PIP_MAP[n].every(i => i >= 0 && i <= 8), `mặt ${n} chấm trong lưới 3×3`);
  }
});

test('diceCubeHTML sinh đủ 6 mặt, mỗi mặt đúng số chấm hiện', () => {
  const html = diceCubeHTML();
  for (let n = 1; n <= 6; n++) {
    assert.ok(html.includes(`class="dice-face f${n}" data-v="${n}"`), `có mặt ${n}`);
  }
  assert.equal((html.match(/dice-face/g) || []).length, 6, 'đúng 6 mặt');
  /* đếm chấm hiện (class "pip on") trong từng mặt */
  for (let n = 1; n <= 6; n++) {
    const face = html.split(`data-v="${n}"`)[1].split('dice-face')[0];
    assert.equal((face.match(/pip on/g) || []).length, n, `mặt ${n} hiện ${n} chấm`);
    assert.equal((face.match(/<span class="pip/g) || []).length, 9, `mặt ${n} đủ 9 ô chấm`);
  }
});

console.log(`\n${pass} test đạt.`);
