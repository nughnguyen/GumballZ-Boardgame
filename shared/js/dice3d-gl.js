// 🎲 Xúc xắc 3D dùng chung — model GLB thật (khối bo tròn, chấm dẹt in sát mặt,
// chấm số 1 đỏ, mặt đối nhau cộng = 7). Dùng Three.js + GLTFLoader đã vendor
// dưới shared/lib/ — chạy offline/localhost, không CDN.
//
// Cách dùng:
//   import { createDiceView } from '../../shared/js/dice3d-gl.js?v=4';
//   const view = await createDiceView(el, { count: 2, diePx: 76 }); // null nếu WebGL/GLB lỗi
//   const view = await createDiceView(el, { count: 3, model: 'animals' }); // Bầu Cua: mặt con vật
//   await view.rollTo([3, 5], { duration: 1200 }); // lăn rồi dừng đúng mặt
//   view.show([3, 5]);                             // đặt mặt ngay, không lăn
// Model 'dice' (mặc định): mặt chấm số 1–6, mặt đối nhau cộng = 7.
// Model 'animals' (Bầu Cua): mặt con vật, cùng thứ tự giá trị 1–6:
//   1 Nai, 2 Bầu, 3 Gà, 4 Cá, 5 Cua, 6 Tôm (khớp SYMS của baucua/js/engine.js).
//   rollTo() vẫn nhận số 1–6 như cũ — số hiện ra luôn bằng đúng số engine đã đổ.
// Lúc dừng, mặt hiện số hướng THẲNG về phía camera (người chơi) để đọc rõ,
// chấm đứng thẳng trên màn hình. rollTo() tự kêu tiếng xúc xắc lăn (Web Audio
// tổng hợp, qua nút âm lượng SFX chung ở ⚙️ Cài đặt); game có công tắc tiếng
// riêng thì truyền `muted: () => !sound` lúc tạo khung.
//
// Face mapping của model (right-handed): +Y=1, -Y=6, +Z=2, -Z=5, +X=3, -X=4.
// rollTo() CHỈ đổi cách hiện — số hiện ra luôn bằng đúng số engine đã đổ.
import * as THREE from '../lib/three.module.min.js?v=1';
import { GLTFLoader } from '../lib/GLTFLoader.js?v=1';
import '../audio/volume.js?v=1'; /* chỉ để chặn AudioNode.connect: tiếng xúc xắc nối ra loa sẽ đi qua nút âm lượng SFX chung (gumballz-vol-sfx) ở ⚙️ Cài đặt */

export const FACE_NORMAL = {
  1: [0, 1, 0], 6: [0, -1, 0],
  2: [0, 0, 1], 5: [0, 0, -1],
  3: [1, 0, 0], 4: [-1, 0, 0],
};
const UP = new THREE.Vector3(0, 1, 0);
const EASE_OUT_CUBIC = x => 1 - Math.pow(1 - x, 3);

// quaternion đưa mặt `value` lên trên (+Y), thêm yaw ngẫu nhiên quanh Y
// (giữ lại cho tương thích; khung hiển thị dùng faceTowardCameraQuaternion bên dưới)
export function faceUpQuaternion(value, rng = Math.random) {
  const n = FACE_NORMAL[value];
  if (!n) throw new Error('Xúc xắc chỉ có mặt 1–6.');
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...n), UP);
  const yaw = new THREE.Quaternion().setFromAxisAngle(UP, rng() * Math.PI * 2);
  return yaw.multiply(q);
}

// quaternion đưa mặt `value` hướng THẲNG về phía camera (người chơi) để đọc
// số rõ ràng, không nghiêng/khuất. `camDir`: vector từ xúc xắc tới camera
// (đã chuẩn hoá). Không yaw ngẫu nhiên — cùng một mặt luôn hiện giống nhau,
// chấm đứng thẳng trên màn hình.
const _fv = new THREE.Vector3();
const _fu = new THREE.Vector3();
const _fr = new THREE.Vector3();
const _fm = new THREE.Matrix4();
export function faceTowardCameraQuaternion(value, camDir) {
  const n = FACE_NORMAL[value];
  if (!n) throw new Error('Xúc xắc chỉ có mặt 1–6.');
  const f = _fv.copy(camDir).normalize();                    // mặt số nhìn về camera
  let u = _fu.copy(UP).addScaledVector(f, -UP.dot(f));       // "trên" của mặt = trên màn hình
  if (u.lengthSq() < 1e-6) u.set(0, 0, 1);                   // camera thẳng trên đầu (không xảy ra với góc hiện tại)
  u.normalize();
  const r = _fr.crossVectors(u, f).normalize();
  const base = new THREE.Quaternion().setFromRotationMatrix(_fm.makeBasis(r, u, f));
  const toFront = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...n), new THREE.Vector3(0, 0, 1));
  return base.multiply(toFront);
}

// ---------- tiếng xúc xắc lăn (Web Audio, tổng hợp — không file ngoài) ----------
// Tiếng lách cách va chạm (noise burst qua bandpass) rải suốt lúc lăn + một
// tiếng "cạch" trầm khi xúc xắc dừng. Nối ra ac.destination nên tự đi qua nút
// âm lượng SFX chung ở ⚙️ Cài đặt (shared/audio/volume.js); tắt tiếng của
// từng game thì game truyền `muted` lúc tạo khung (xem DiceView).
let _ac = null, _noiseBuf = null;
function diceAudio() {
  try {
    if (!_ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      _ac = new AC();
    }
    if (_ac.state === 'suspended') _ac.resume().catch(() => {});
    return _ac;
  } catch (e) { return null; }
}
if (typeof window !== 'undefined') {
  // Tạo/resume AudioContext trong cử chỉ người dùng (click/chạm/phím) để
  // không bị chặn autoplay: cú click "Đổ" xảy ra trước khi rollTo() chạy
  // (còn phải qua mạng), nên prime sẵn ở đây thì tới lúc lăn nhạc đã chạy.
  const prime = () => diceAudio();
  addEventListener('pointerdown', prime, { passive: true });
  addEventListener('keydown', prime);
}
// Kêu `n` tiếng lách cách trong `durationMs` rồi "cạch" một tiếng lúc dừng.
// Trả false khi chưa phát được (chưa có cử chỉ người dùng / không có audio).
export function playDiceRattle(durationMs = 1000, { dice = 1 } = {}) {
  const ac = diceAudio();
  if (!ac || ac.state !== 'running') return false;
  try {
    if (!_noiseBuf) {
      const len = Math.max(1, Math.floor(ac.sampleRate * 0.06));
      _noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
      const d = _noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const t0 = ac.currentTime + 0.01, dur = Math.max(0.2, durationMs / 1000);
    const n = Math.max(3, Math.min(9, Math.round(durationMs / 130)));
    for (let i = 0; i < n; i++) {
      const t = t0 + (i / n) * dur * 0.85 + Math.random() * 0.04;
      const src = ac.createBufferSource(); src.buffer = _noiseBuf;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.value = 1800 + Math.random() * 2600; bp.Q.value = 1.2;
      const g = ac.createGain();
      const vol = 0.2 * (0.7 + Math.random() * 0.5) * (1 + 0.18 * (dice - 1));
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      src.connect(bp); bp.connect(g); g.connect(ac.destination);
      src.start(t); src.stop(t + 0.07);
    }
    const te = t0 + dur; /* "cạch" khi dừng */
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = 140;
    const og = ac.createGain();
    og.gain.setValueAtTime(0.0001, te);
    og.gain.exponentialRampToValueAtTime(0.16, te + 0.008);
    og.gain.exponentialRampToValueAtTime(0.0001, te + 0.09);
    o.connect(og); og.connect(ac.destination); o.start(te); o.stop(te + 0.12);
    return true;
  } catch (e) { return false; }
}

let _glbPromises = {};
export function loadDiceGLB(model = 'dice') {
  const file = model === 'animals' ? 'dice-animals.glb' : 'dice.glb';
  if (!_glbPromises[file]) {
    const url = new URL(`../models/${file}?v=1`, import.meta.url).href;
    _glbPromises[file] = new GLTFLoader().loadAsync(url).catch(err => { delete _glbPromises[file]; throw err; });
  }
  return _glbPromises[file];
}

// một con xúc xắc trong khung: group đặt vị trí + spin quay/lăn
function makeDie(srcScene) {
  const root = new THREE.Group();          // vị trí ngang
  const spin = new THREE.Group();          // quay + nảy
  const model = srcScene.clone(true);      // clone GLB (thân + chấm mực + chấm đỏ)
  spin.add(model);
  root.add(spin);
  return { root, spin, model };
}

export class DiceView {
  // container: phần tử chứa canvas. count: số con tối đa. diePx: cỡ 1 con (px màn hình).
  // w/h: kích thước canvas (px); mặc định vừa đủ count con + chỗ lăn nảy.
  // muted: true | () => true — tắt tiếng lăn của khung này (công tắc tiếng riêng của game).
  // model: 'dice' (mặt chấm số, mặc định) | 'animals' (mặt con vật Bầu Cua).
  // spin: true = khung chừa chỗ cho lúc lăn (con xúc xắc xoay + nảy, góc chạm tới
  //   0.87 nửa đường chéo + nảy 0.18); false = chỉ vừa lúc đứng yên (mặt hướng
  //   camera, nửa rộng 0.5). Mặc định false — game nào lăn thì bật spin:true
  //   (và tăng diePx để con xúc xắc không bị nhỏ đi).
  constructor(container, { count = 1, diePx = 72, gapPx = 10, w = 0, h = 0, muted = false, model = 'dice', spin = false } = {}) {
    this.container = container;
    this.count = count;
    this.diePx = diePx;
    this.gapPx = gapPx;
    this._model = model;
    this._spin = !!spin;
    this._muted = typeof muted === 'function' ? muted : () => !!muted;
    this._w = w || count * diePx + (count - 1) * gapPx;
    this._h = h || Math.round(diePx * 1.5);
    this.dice = [];
    this._visible = count;
    this._rolling = null;
    this._raf = 0;
    this._dirty = true;
    this._disposed = false;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this._w, this._h, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    const cv = this.renderer.domElement;
    cv.className = 'gl-dice-canvas';
    cv.style.cssText = `display:block;position:static;width:${this._w}px;height:${this._h}px;max-width:100%;height:auto;`; /* height:auto: khung hẹp hơn canvas thì thu nhỏ theo đúng tỉ lệ, không bóp méo con xúc xắc */
    container.appendChild(cv);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, this._w / this._h, 0.1, 50);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xe8dcc8, 0.95));
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(2.5, 4, 2.5);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xfec5e6, 0.5);
    fill.position.set(-3, 1.5, -2);
    this.scene.add(fill);

    this._ro = (typeof ResizeObserver !== 'undefined')
      ? new ResizeObserver(() => this.render()) : null;
    if (this._ro) this._ro.observe(container);
  }

  // tải GLB (1 lần cho cả web, theo từng model) rồi nhân bản đủ `count` con; đặt mặt ban đầu
  async init(values) {
    const gltf = await loadDiceGLB(this._model);
    for (let i = 0; i < this.count; i++) {
      const d = makeDie(gltf.scene);
      d.spin.quaternion.copy(faceUpQuaternion(values && values[i] ? values[i] : 1));
      this.scene.add(d.root);
      this.dice.push(d);
    }
    this.setCount(values ? values.length : this.count);
    if (values) this.show(values);
    this._ready = true;
    this.render();
    return this;
  }

  // số con đang hiện (<= count): xếp lại vị trí + chỉnh camera cho vừa khung
  setCount(n) {
    this._visible = Math.max(1, Math.min(this.count, n || 1));
    const spread = 1.18;
    this.dice.forEach((d, i) => {
      d.root.visible = i < this._visible;
      d.root.position.x = (i - (this._visible - 1) / 2) * spread;
    });
    // khoảng cách camera: tính theo mặt TRƯỚC của con xúc xắc (gần camera hơn tâm
    // 0.5 lúc đứng yên, 0.87 lúc lăn) — đo ở tâm sẽ tính thiếu ~30% và con bị
    // cắt mép trái/phải. TAN_HALF = tan(16°) (fov dọc 32°), K = 1.07 (camera
    // chếch trên nên tia tới tâm dài hơn d). Sv/Sh: nửa cao/nửa rộng cần thấy,
    // tính từ tâm con (lăn: góc khối 0.87 + nảy 0.18 + biên 0.1).
    const TAN_HALF = 0.2867, K = 1.07;
    const aspect = this._w / this._h;
    const R = this._spin ? 0.866 : 0.5;             // điểm gần nhất của con xúc xắc
    const Sv = this._spin ? 1.15 : 0.6;             // nửa cao cần thấy
    const Sh = (this._visible - 1) * spread / 2 + (this._spin ? 0.97 : 0.6); // nửa rộng cần thấy
    const d = (Math.max(Sv, Sh / aspect) / TAN_HALF + R) / K;
    this.camera.position.set(0, d * 0.38, d); /* hơi chính diện hơn (trước 0.45) để mặt số hướng về người chơi đọc rõ */
    this.camera.lookAt(0, -0.02, 0);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  // hướng từ xúc xắc tới camera — mặt số lúc dừng sẽ nhìn theo hướng này
  _camDir() {
    return new THREE.Vector3().copy(this.camera.position).sub(new THREE.Vector3(0, -0.02, 0)).normalize();
  }
  // quaternion lúc dừng: mặt `value` hướng thẳng về camera, chấm đứng thẳng
  _restQuat(value) { return faceTowardCameraQuaternion(value, this._camDir()); }

  show(values) {
    this.setCount(values.length);
    values.forEach((v, i) => {
      if (!this.dice[i]) return;
      this.dice[i].spin.quaternion.copy(this._restQuat(v));
      this.dice[i].spin.position.y = 0;
    });
    this.render();
  }

  // lăn tới đúng các mặt `values` (số engine đã đổ). Trả Promise xong khi dừng hẳn.
  // Kêu tiếng lách cách suốt lúc lăn (trừ khi { sound: false } hoặc khung bị muted).
  rollTo(values, { duration = 1100, spins = 2, stagger = 90, sound = true } = {}) {
    if (this._rolling) { const old = this._rolling; this._rolling = null; old.resolve(); }
    this.setCount(values.length);
    if (sound && !this._muted()) playDiceRattle(duration, { dice: values.length });
    const t0 = performance.now();
    const jobs = values.map((v, i) => {
      const die = this.dice[i];
      if (!die) return null;
      return {
        die,
        q0: die.spin.quaternion.clone(),
        q1: this._restQuat(v),
        axis: new THREE.Vector3(Math.random() - 0.5, 0.25, Math.random() - 0.5).normalize(),
        start: t0 + i * stagger,
      };
    }).filter(Boolean);
    return new Promise(resolve => {
      this._rolling = { jobs, duration, spins, resolve };
      this._kick();
    });
  }

  _kick() {
    if (this._raf || this._disposed) return;
    const step = now => {
      this._raf = 0;
      if (this._disposed) return;
      const r = this._rolling;
      if (r) {
        let done = true;
        for (const j of r.jobs) {
          const t = Math.min(1, Math.max(0, (now - j.start) / r.duration));
          const e = EASE_OUT_CUBIC(t);
          const q = j.q0.clone().slerp(j.q1, e);
          const extra = new THREE.Quaternion().setFromAxisAngle(j.axis, (1 - e) * Math.PI * 2 * r.spins);
          j.die.spin.quaternion.copy(extra.multiply(q));
          j.die.spin.position.y = Math.sin(e * Math.PI) * 0.18;
          if (t < 1) done = false;
        }
        if (done) {
          r.jobs.forEach((j, i) => {
            j.die.spin.quaternion.copy(j.q1);
            j.die.spin.position.y = 0;
          });
          this._rolling = null;
          this.render();
          r.resolve();
          return;
        }
      }
      this.render();
      if (this._rolling && !this._disposed) this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }

  render() {
    if (this._disposed || !this.renderer) return;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this._disposed = true;
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._ro) this._ro.disconnect();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
      this.renderer = null;
    }
  }
}

// Tạo 1 khung xúc xắc trong `container` rồi tải model. Trả null nếu WebGL/GLB lỗi
// (game gọi hàm 2D cũ làm dự phòng). `values`: mặt ban đầu (mặc định toàn 1).
export async function createDiceView(container, { values = null, ...opts } = {}) {
  let view = null;
  try {
    view = new DiceView(container, opts);
    await view.init(values || new Array(opts.count || 1).fill(1));
  } catch (err) {
    console.warn('[dice3d-gl] không dùng được xúc xắc 3D, về 2D:', err);
    if (view) view.dispose();
    return null;
  }
  return view;
}
