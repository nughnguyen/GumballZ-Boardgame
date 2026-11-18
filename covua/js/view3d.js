// 🧊 Bàn cờ vua 3D (three.js) – quân cờ tự dựng bằng hình tròn xoay, không dùng mô hình hay hình ảnh của phần mềm nào khác.
// main.js vẫn giữ toàn bộ luật + trạng thái; file này chỉ vẽ và báo lại "người chơi vừa chạm ô nào".
import * as THREE from '../../shared/lib/three.module.min.js';
import { OrbitControls } from '../../shared/lib/OrbitControls.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
const lathe = pts => new THREE.LatheGeometry(pts.map(p => V2(p[0], p[1])), 40);
/* mặt cắt (bán kính, độ cao) của từng quân – ô cờ rộng 1 đơn vị */
const BASE = [[0, 0], [.34, 0], [.36, .04], [.34, .09], [.27, .12], [.25, .16]];
const PROFILE = {
  p: [...BASE, [.15, .26], [.11, .42], [.19, .47], [.19, .5], [.11, .53], [.17, .6], [.19, .68], [.17, .76], [.1, .83], [0, .85]],
  r: [...BASE, [.23, .26], [.21, .6], [.27, .64], [.27, .84], [.21, .84], [.21, .77], [0, .77]],
  b: [...BASE, [.16, .3], [.11, .62], [.2, .68], [.2, .72], [.12, .76], [.17, .88], [.16, 1.0], [.09, 1.12], [.04, 1.17], [.07, 1.21], [.05, 1.26], [0, 1.28]],
  q: [...BASE, [.18, .32], [.12, .8], [.22, .88], [.22, .93], [.14, .97], [.2, 1.14], [.26, 1.26], [.2, 1.25], [.12, 1.2], [.06, 1.27], [.08, 1.33], [.05, 1.38], [0, 1.39]],
  k: [...BASE, [.19, .32], [.13, .86], [.23, .94], [.23, .99], [.15, 1.03], [.2, 1.2], [.25, 1.3], [.12, 1.33], [0, 1.34]],
  n: [...BASE, [.2, .24], [.24, .3], [.24, .34], [0, .34]],
};
/* đầu mã: một hình phẳng được đùn dày lên */
function knightHead() {
  const s = new THREE.Shape();
  s.moveTo(-.2, 0); s.lineTo(.2, 0); s.quadraticCurveTo(.26, .3, .1, .5); s.quadraticCurveTo(.22, .62, .14, .82);
  s.lineTo(.08, .9); s.lineTo(.03, .82); s.quadraticCurveTo(-.12, .84, -.22, .68); s.lineTo(-.36, .5); s.quadraticCurveTo(-.4, .42, -.32, .38);
  s.lineTo(-.16, .44); s.quadraticCurveTo(-.06, .4, -.1, .28); s.quadraticCurveTo(-.2, .14, -.2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: .24, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2, curveSegments: 10 });
  g.translate(0, .3, -.12); g.rotateY(Math.PI / 2); /* mặt mã nhìn về phía trước (−z) */
  return g;
}

export function make3d(box, { onSquare }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const cv = renderer.domElement; cv.className = 'cv3d'; cv.setAttribute('aria-label', 'Bàn cờ 3D'); box.appendChild(cv);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#141a2a');
  /* nền: vòm trời vẽ bằng canvas (tối ở trên, ấm dần về chân trời) + vài đốm đèn mờ phía xa – tự vẽ, không dùng ảnh ngoài */
  const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 20), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, map: tex(16, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b1020'); gr.addColorStop(.42, '#1c2745'); gr.addColorStop(.5, '#4a3d5c'); gr.addColorStop(.56, '#b9785a'); gr.addColorStop(.62, '#3a2a2a'); gr.addColorStop(1, '#120e12'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) }));
  scene.add(sky);
  const glow = tex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,236,200,.9)'); gr.addColorStop(.35, 'rgba(255,200,140,.35)'); gr.addColorStop(1, 'rgba(255,200,140,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  for (let i = 0; i < 26; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, opacity: .25 + (i * 37 % 10) / 22, depthWrite: false, fog: false, color: ['#ffd9a8', '#ffc0cb', '#bcd4ff', '#fff2c4'][i % 4] })); const an = i / 26 * Math.PI * 2 + (i % 3) * .2, r = 34 + (i * 53 % 14); sp.position.set(Math.cos(an) * r, 2.5 + (i * 29 % 13), Math.sin(an) * r); sp.scale.setScalar(2.4 + (i * 17 % 5)); scene.add(sp); }
  const cam = new THREE.PerspectiveCamera(36, 1, .1, 100);
  const ctl = new OrbitControls(cam, cv); ctl.enablePan = false; ctl.enableDamping = true; ctl.dampingFactor = .12; ctl.minDistance = 9; ctl.maxDistance = 24; ctl.minPolarAngle = .15; ctl.maxPolarAngle = 1.36; ctl.target.set(0, .2, 0);
  scene.add(new THREE.HemisphereLight('#dfe9ff', '#3a3348', 1.15));
  const sun = new THREE.DirectionalLight('#fff4e0', 2.2); sun.position.set(-5, 11, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 }); sun.shadow.bias = -.0006; scene.add(sun);
  const rim = new THREE.DirectionalLight('#8fb4ff', 1.3); rim.position.set(6, 5, -8); scene.add(rim);

  // ---- bàn ----
  const std = (color, rough = .5, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  /* mặt bàn gỗ tròn dưới bàn cờ (vân gỗ vẽ bằng canvas) + sàn tối phía dưới */
  const wood = tex(512, 512, (g, w) => { g.fillStyle = '#5a3b26'; g.fillRect(0, 0, w, w); for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(${30 + i % 40},${18 + i % 20},${10},${.10 + (i % 7) / 60})`; g.lineWidth = 1 + (i % 4); g.beginPath(); const y = (i * 61) % w; g.moveTo(0, y); g.bezierCurveTo(w * .3, y + 14 * Math.sin(i), w * .6, y - 12 * Math.cos(i * 1.7), w, y + 6); g.stroke(); } const v = g.createRadialGradient(w / 2, w / 2, w * .2, w / 2, w / 2, w * .5); v.addColorStop(0, 'rgba(255,220,170,.16)'); v.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = v; g.fillRect(0, 0, w, w); });
  const table = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, .5, 64), [std('#3a2618', .5, .05), new THREE.MeshStandardMaterial({ map: wood, roughness: .42, metalness: .05 }), std('#2a1b12', .6)]); table.position.y = -.67; table.receiveShadow = true; scene.add(table);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 48), std('#0f1016', .9, 0)); floor.rotation.x = -Math.PI / 2; floor.position.y = -6; scene.add(floor);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(9.3, .4, 9.3), std('#3b2a22', .45, .1)); frame.position.y = -.21; frame.receiveShadow = true; frame.castShadow = true; scene.add(frame);
  const lt = std('#ecdfc2', .35, .05), dk = std('#7d5a3c', .35, .05), sqG = new THREE.BoxGeometry(1, .06, 1);
  for (let i = 0; i < 64; i++) { const m = new THREE.Mesh(sqG, ((i >> 3) + (i & 7)) % 2 ? dk : lt); m.position.set((i & 7) - 3.5, -.03, (i >> 3) - 3.5); m.receiveShadow = true; scene.add(m); }
  /* lớp tô màu trên mặt ô (chọn, nước vừa đi, gợi ý, chiếu) + chấm báo ô đi được */
  const tintG = new THREE.PlaneGeometry(.98, .98), tints = [], dots = [], rings = [];
  const flat = (color, op) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false });
  const TINT = { last: flat('#f6d32d', .45), sel: flat('#3584e4', .6), hint: flat('#33d17a', .6), chk: flat('#e01b24', .7) }, dotM = flat('#101522', .42);
  const dotG = new THREE.CircleGeometry(.15, 24), ringG = new THREE.RingGeometry(.36, .46, 32);
  for (let i = 0; i < 64; i++) {
    const x = (i & 7) - 3.5, z = (i >> 3) - 3.5, mk = (g, y) => { const m = new THREE.Mesh(g, TINT.last); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.visible = false; scene.add(m); return m; };
    tints.push(mk(tintG, .004)); dots.push(mk(dotG, .008)); rings.push(mk(ringG, .008)); dots[i].material = rings[i].material = dotM;
  }
  // ---- quân ----
  const GEO = Object.fromEntries(Object.entries(PROFILE).map(([k, p]) => [k, lathe(p)])), HEAD = knightHead();
  const crossV = new THREE.BoxGeometry(.07, .3, .07), crossH = new THREE.BoxGeometry(.22, .07, .07), crown = new THREE.SphereGeometry(.07, 16, 12);
  const MAT = { w: std('#f3ede2', .28, .05), b: std('#3b3b48', .32, .2) };
  const pieces = new THREE.Group(); scene.add(pieces);
  function piece(ch) {
    const k = ch.toLowerCase(), W = ch !== k, g = new THREE.Group(), mat = MAT[W ? 'w' : 'b'];
    const add = (geo, y = 0) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    add(GEO[k]);
    if (k === 'n') { const h = add(HEAD); h.rotation.y = W ? -.6 : Math.PI - .6; } /* xoay nghiêng một chút để nhìn rõ dáng đầu ngựa */
    if (k === 'k') { add(crossV, 1.47); add(crossH, 1.5); }
    if (k === 'q') add(crown, 1.42);
    return g;
  }
  let cur = { board: [], flip: null }, anim = null, raf = 0, dirty = true, dead = false;
  const pos = i => new THREE.Vector3((i & 7) - 3.5, 0, (i >> 3) - 3.5);
  function setCam(flip) { const z = flip ? -12.2 : 12.2; cam.position.set(0, 10.8, z); ctl.target.set(0, .2, 0); ctl.update(); }
  function update(st) {
    const moved = cur.board.length === 64 && st.board.some((p, i) => p !== cur.board[i]);
    if (cur.flip !== st.flip) setCam(st.flip);
    if (moved || cur.board.length !== 64) {
      pieces.clear(); const lm = st.last;
      st.board.forEach((p, i) => { if (!p) return; const g = piece(p); g.position.copy(pos(i)); g.userData.sq = i; pieces.add(g);
        if (moved && st.animate && lm && lm.to === i) { const a = pos(lm.from), b = pos(i); g.position.copy(a); anim = { g, a, b, t0: performance.now(), ms: 260 }; } });
    }
    for (let i = 0; i < 64; i++) {
      const t = i === st.chk ? 'chk' : i === st.sel ? 'sel' : st.hint && (st.hint.from === i || st.hint.to === i) ? 'hint' : st.last && (st.last.from === i || st.last.to === i) ? 'last' : null;
      tints[i].visible = !!t; if (t) tints[i].material = TINT[t];
      const tg = st.targets.includes(i); dots[i].visible = tg && !st.board[i]; rings[i].visible = tg && !!st.board[i];
    }
    cur = { board: st.board.slice(), flip: st.flip }; dirty = true; loop();
  }
  function loop() {
    if (raf || dead) return;
    raf = requestAnimationFrame(function tick(now) {
      raf = 0; if (dead) return;
      if (anim) { const k = Math.min(1, (now - anim.t0) / anim.ms), e = 1 - Math.pow(1 - k, 3); anim.g.position.lerpVectors(anim.a, anim.b, e); anim.g.position.y = Math.sin(k * Math.PI) * .35; if (k >= 1) anim = null; dirty = true; }
      if (ctl.update()) dirty = true;
      if (dirty) { renderer.render(scene, cam); dirty = false; }
      if (anim || moving) raf = requestAnimationFrame(tick); /* chỉ vẽ lại khi có gì thay đổi → đỡ nóng máy, đỡ tốn pin */
    });
  }
  let moving = false, calm = 0; ctl.addEventListener('start', () => { moving = true; loop(); }); ctl.addEventListener('end', () => { clearTimeout(calm); calm = setTimeout(() => { moving = false; }, 900); }); ctl.addEventListener('change', () => { dirty = true; loop(); });
  // chạm ô: phân biệt với kéo xoay bàn
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); let down = null;
  cv.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  cv.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 7) { down = null; return; } down = null;
    const r = cv.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam);
    const hit = ray.intersectObjects(pieces.children, true)[0]; let sq = -1;
    if (hit) { let o = hit.object; while (o && o.userData.sq == null) o = o.parent; if (o) sq = o.userData.sq; }
    if (sq < 0) { const p = new THREE.Vector3(); if (ray.ray.intersectPlane(plane, p)) { const c = Math.round(p.x + 3.5), rr = Math.round(p.z + 3.5); if (c >= 0 && c < 8 && rr >= 0 && rr < 8) sq = rr * 8 + c; } }
    if (sq >= 0) onSquare(sq);
  });
  const fit = () => { const w = box.clientWidth, h = box.clientHeight || w; if (!w) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = 36; cam.updateProjectionMatrix(); dirty = true; loop(); };
  const ro = new ResizeObserver(fit); ro.observe(box); fit();
  return { update, destroy() { dead = true; cancelAnimationFrame(raf); ro.disconnect(); ctl.dispose(); renderer.dispose(); cv.remove(); } };
}
