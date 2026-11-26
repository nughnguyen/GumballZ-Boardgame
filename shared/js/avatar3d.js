// Nhân vật chibi 3D low-poly dựng bằng code – dùng chung cho mọi game (quân cờ, avatar).
import * as THREE from '../lib/three.module.min.js?v=1';

import { OPTIONS, PRESETS, furOf } from './avatar-opts.js?v=12';
export { OPTIONS, PRESETS };
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.6, ...o });
const shadeHex = (c, f) => '#' + new THREE.Color(c).multiplyScalar(f).getHexString();
function add(g, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; }

export function buildAvatar(cfg) {
  cfg = { horns: 'none', ...PRESETS[0], ...cfg };
  const g = new THREE.Group(), isHuman = cfg.kind === 'human';
  cfg.skin = furOf(cfg); /* thú dùng màu lông riêng (FUR) */
  const HOLD = ['boba', 'phone', 'book', 'gift', 'moneybag', 'lantern', 'flag', 'sword', 'balloon'].includes(cfg.acc); /* món cầm tay: giơ tay phải lên trước ngực cho thấy món đồ (kiểu cầm đồ của Roblox) */
  const skin = M(cfg.kind === 'panda' ? '#ffffff' : cfg.skin), main = M(cfg.color), dark = M('#2b2b33'), white = M('#ffffff');
  // ----- thân + áo -----
  const shirtCol = { tee: cfg.color, aodai: cfg.color, vest: '#2f3545', jersey: cfg.color, apron: '#ffffff', army: '#4f6b3a', maid: '#22222b', hoodie: cfg.color, school: '#f4f6fb', pajama: '#bcd9ff', raincoat: '#ffd23d', ninja: '#2a2a35', cape: cfg.color, santa: '#d9302f', sweater: cfg.color, overalls: '#f4f6fb', doctor: '#ffffff', firefighter: '#c8562a', astronaut: '#eef1f6', karate: '#ffffff', aoba: cfg.color, pirate: '#f4ead6', knight: '#a9b0bd', robe: '#4a3a8c', dino: '#4cbf6b' }[cfg.outfit] || cfg.color;
  const shirt = M(shirtCol);
  add(g, new THREE.CylinderGeometry(0.2, 0.26, 0.42, 12), shirt, 0, 0.42, 0);
  // chân
  const pants = M({ army: '#3f5530', aodai: '#ffffff', school: '#27407a', ninja: '#2a2a35', santa: '#d9302f', pajama: '#bcd9ff', raincoat: '#3a4a6b', overalls: '#3d6fd6', doctor: '#3a4a6b', firefighter: '#c8562a', astronaut: '#eef1f6', karate: '#ffffff', aoba: '#22222b', pirate: '#3a2a1e', knight: '#8a909c', robe: '#4a3a8c', dino: '#4cbf6b' }[cfg.outfit] || '#3a4a6b');
  add(g, new THREE.CylinderGeometry(0.075, 0.07, 0.26, 8), pants, -0.1, 0.13, 0); add(g, new THREE.CylinderGeometry(0.075, 0.07, 0.26, 8), pants, 0.1, 0.13, 0);
  add(g, new THREE.BoxGeometry(0.13, 0.06, 0.18), dark, -0.1, 0.03, 0.03); add(g, new THREE.BoxGeometry(0.13, 0.06, 0.18), dark, 0.1, 0.03, 0.03);
  // tay
  /* tay: buông sát người, vai tròn nối liền thân, bàn tay tròn hơi đưa ra trước (17/11/2026 – bản cũ chĩa chéo ra như que) */
  for (const sx of [-1, 1]) {
    add(g, new THREE.SphereGeometry(0.075, 10, 8), shirt, sx * 0.205, 0.585, 0);
    if (HOLD && sx === 1) { add(g, new THREE.CapsuleGeometry(0.062, 0.13, 4, 10), shirt, 0.24, 0.56, 0.12, 1.5, 0, 0.05); add(g, new THREE.SphereGeometry(0.066, 12, 10), skin, 0.24, 0.56, 0.24); continue; } /* tay phải co lên, bàn tay trước ngực */
    add(g, new THREE.CapsuleGeometry(0.062, 0.17, 4, 10), shirt, sx * 0.255, 0.45, 0.02, -0.12, 0, sx * 0.16);
    add(g, new THREE.SphereGeometry(0.066, 12, 10), skin, sx * 0.275, 0.315, 0.05);
  }
  if (cfg.outfit === 'aodai') add(g, new THREE.CylinderGeometry(0.24, 0.3, 0.32, 12, 1, true), shirt, 0, 0.18, 0);
  if (cfg.outfit === 'vest') { add(g, new THREE.BoxGeometry(0.1, 0.3, 0.02), white, 0, 0.46, 0.235); add(g, new THREE.BoxGeometry(0.04, 0.22, 0.02), main, 0, 0.45, 0.25); }
  if (cfg.outfit === 'jersey') { add(g, new THREE.BoxGeometry(0.14, 0.12, 0.02), white, 0, 0.45, 0.245); }
  if (cfg.outfit === 'apron') add(g, new THREE.BoxGeometry(0.3, 0.32, 0.02), white, 0, 0.38, 0.25);
  if (cfg.outfit === 'maid') { // váy đen xoè + tạp dề trắng viền bèo + nơ cổ
    add(g, new THREE.CylinderGeometry(0.24, 0.36, 0.26, 16, 1, true), M('#22222b', { side: THREE.DoubleSide }), 0, 0.2, 0);
    add(g, new THREE.TorusGeometry(0.35, 0.025, 6, 24), white, 0, 0.075, 0, Math.PI / 2, 0, 0);
    add(g, new THREE.BoxGeometry(0.26, 0.36, 0.02), white, 0, 0.3, 0.275, -0.18, 0, 0);
    add(g, new THREE.BoxGeometry(0.2, 0.1, 0.02), white, 0, 0.53, 0.235);
    add(g, new THREE.ConeGeometry(0.05, 0.09, 4), main, -0.045, 0.62, 0.22, 0, 0, Math.PI / 2); add(g, new THREE.ConeGeometry(0.05, 0.09, 4), main, 0.045, 0.62, 0.22, 0, 0, -Math.PI / 2);
    add(g, new THREE.SphereGeometry(0.08, 8, 6), white, -0.22, 0.58, 0).scale.set(1, 0.75, 1); add(g, new THREE.SphereGeometry(0.08, 8, 6), white, 0.22, 0.58, 0).scale.set(1, 0.75, 1);
  }
  if (cfg.outfit === 'hoodie' || cfg.outfit === 'raincoat') { /* mũ trùm sau gáy + túi trước + dây */
    add(g, new THREE.TorusGeometry(0.17, 0.065, 8, 18), shirt, 0, 0.66, -0.07, Math.PI / 2.4, 0, 0);
    if (cfg.outfit === 'hoodie') { add(g, new THREE.BoxGeometry(0.22, 0.1, 0.02), M(shadeHex(shirtCol, 0.8)), 0, 0.33, 0.25); for (const sx of [-1, 1]) add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.12, 4), white, sx * 0.05, 0.55, 0.235); }
    else add(g, new THREE.CylinderGeometry(0.24, 0.32, 0.3, 12, 1, true), M('#ffd23d', { side: THREE.DoubleSide }), 0, 0.18, 0);
  }
  if (cfg.outfit === 'school') { /* áo trắng + khăn quàng đỏ */ add(g, new THREE.ConeGeometry(0.08, 0.16, 3), M('#e53935'), 0, 0.53, 0.23, Math.PI, 0, 0); add(g, new THREE.TorusGeometry(0.15, 0.025, 6, 16), M('#e53935'), 0, 0.63, 0, Math.PI / 2, 0, 0); }
  if (cfg.outfit === 'pajama') for (let k = 0; k < 3; k++) add(g, new THREE.SphereGeometry(0.018, 6, 4), white, 0, 0.55 - k * 0.1, 0.235);
  if (cfg.outfit === 'ninja') add(g, new THREE.BoxGeometry(0.44, 0.05, 0.44), M('#d32f2f'), 0, 0.3, 0);
  if (cfg.outfit === 'cape') { add(g, new THREE.BoxGeometry(0.46, 0.58, 0.02), M('#d32f2f', { side: THREE.DoubleSide }), 0, 0.36, -0.25, 0.16, 0, 0); for (const sx of [-1, 1]) add(g, new THREE.SphereGeometry(0.085, 12, 8), M('#d32f2f'), sx * 0.2, 0.6, -0.04).scale.set(1, 0.6, 1.1); /* vạt choàng vắt qua vai cho nhìn thẳng vẫn thấy */ add(g, new THREE.OctahedronGeometry(0.07), M('#ffd54a', { metalness: 0.5 }), 0, 0.47, 0.25).scale.set(1, 0.8, 0.3); }
  if (cfg.outfit === 'santa') { add(g, new THREE.TorusGeometry(0.255, 0.035, 6, 20), white, 0, 0.22, 0, Math.PI / 2, 0, 0); add(g, new THREE.BoxGeometry(0.44, 0.05, 0.44), dark, 0, 0.32, 0); for (let k = 0; k < 2; k++) add(g, new THREE.SphereGeometry(0.02, 6, 4), white, 0, 0.5 - k * 0.1, 0.235); }
  if (cfg.outfit === 'sweater') { add(g, new THREE.TorusGeometry(0.245, 0.03, 6, 20), M(shadeHex(shirtCol, 0.8)), 0, 0.23, 0, Math.PI / 2, 0, 0); add(g, new THREE.TorusGeometry(0.16, 0.035, 6, 16), M(shadeHex(shirtCol, 0.8)), 0, 0.63, 0, Math.PI / 2, 0, 0); for (let k = 0; k < 3; k++) add(g, new THREE.BoxGeometry(0.03, 0.03, 0.01), white, -0.06 + k * 0.06, 0.45, 0.25, 0, 0, Math.PI / 4); }
  if (cfg.outfit === 'overalls') { const den = M('#3d6fd6'); add(g, new THREE.BoxGeometry(0.26, 0.2, 0.02), den, 0, 0.38, 0.235); for (const sx of [-1, 1]) { add(g, new THREE.BoxGeometry(0.04, 0.24, 0.02), den, sx * 0.1, 0.52, 0.225, -0.1, 0, 0); add(g, new THREE.SphereGeometry(0.018, 6, 4), M('#ffd54a', { metalness: 0.7 }), sx * 0.1, 0.46, 0.25); } add(g, new THREE.CylinderGeometry(0.262, 0.262, 0.16, 12, 1, true), den, 0, 0.3, 0); }
  if (cfg.outfit === 'doctor') { add(g, new THREE.CylinderGeometry(0.25, 0.32, 0.3, 12, 1, true), M('#ffffff', { side: THREE.DoubleSide }), 0, 0.17, 0); add(g, new THREE.BoxGeometry(0.06, 0.28, 0.02), M('#7fb3ff'), 0, 0.47, 0.235); add(g, new THREE.TorusGeometry(0.08, 0.012, 6, 16, Math.PI), dark, 0, 0.54, 0.24, Math.PI, 0, 0); add(g, new THREE.SphereGeometry(0.025, 8, 6), M('#c9ccd4', { metalness: 0.8 }), 0.08, 0.47, 0.25); }
  if (cfg.outfit === 'firefighter') { const ref = M('#ffe066', { emissive: '#6b5a00', emissiveIntensity: 0.3 }); for (const y of [0.33, 0.52]) add(g, new THREE.TorusGeometry(0.235, 0.022, 6, 20), ref, 0, y, 0, Math.PI / 2, 0, 0); for (const sx of [-1, 1]) add(g, new THREE.TorusGeometry(0.065, 0.015, 6, 12), ref, sx * 0.265, 0.39, 0.02, Math.PI / 2, 0, 0); }
  if (cfg.outfit === 'astronaut') { add(g, new THREE.BoxGeometry(0.2, 0.13, 0.03), M('#9aa3b5'), 0, 0.45, 0.24); for (let k = 0; k < 3; k++) add(g, new THREE.SphereGeometry(0.016, 6, 4), M(['#ff5a5f', '#2fc76f', '#3d8bff'][k]), -0.05 + k * 0.05, 0.45, 0.26); add(g, new THREE.BoxGeometry(0.32, 0.36, 0.14), M('#dfe4ec'), 0, 0.45, -0.25); add(g, new THREE.TorusGeometry(0.17, 0.03, 8, 20), M('#c9ccd4'), 0, 0.64, 0, Math.PI / 2, 0, 0); }
  if (cfg.outfit === 'karate') { add(g, new THREE.BoxGeometry(0.44, 0.05, 0.44), dark, 0, 0.32, 0); add(g, new THREE.BoxGeometry(0.05, 0.14, 0.02), dark, 0.07, 0.25, 0.24, 0, 0, 0.2); add(g, new THREE.BoxGeometry(0.03, 0.26, 0.015), M('#e8e8ee'), -0.03, 0.5, 0.235, 0, 0, -0.35); }
  if (cfg.outfit === 'aoba') { for (let k = 0; k < 4; k++) add(g, new THREE.SphereGeometry(0.016, 6, 4), white, 0.05, 0.56 - k * 0.08, 0.24); for (const sx of [-1, 1]) add(g, new THREE.BoxGeometry(0.08, 0.06, 0.02), M(shadeHex(shirtCol, 0.85)), sx * 0.12, 0.3, 0.235); }
  if (cfg.outfit === 'pirate') { add(g, new THREE.BoxGeometry(0.44, 0.06, 0.44), M('#d32f2f'), 0, 0.3, 0); add(g, new THREE.CylinderGeometry(0.21, 0.27, 0.36, 12, 1, true), M('#3a2a1e', { side: THREE.DoubleSide }), 0, 0.44, -0.02).scale.set(1, 1, 0.92); add(g, new THREE.BoxGeometry(0.06, 0.05, 0.02), M('#ffd54a', { metalness: 0.7 }), 0, 0.3, 0.235); }
  if (cfg.outfit === 'knight') { const st = M('#bfc6d2', { metalness: 0.75, roughness: 0.3 }); add(g, new THREE.CylinderGeometry(0.215, 0.27, 0.42, 14), st, 0, 0.42, 0); for (const sx of [-1, 1]) add(g, new THREE.SphereGeometry(0.09, 10, 8), st, sx * 0.22, 0.6, 0).scale.set(1, 0.75, 1); add(g, new THREE.BoxGeometry(0.03, 0.2, 0.01), M('#d32f2f'), 0, 0.45, 0.27); add(g, new THREE.BoxGeometry(0.13, 0.03, 0.01), M('#d32f2f'), 0, 0.49, 0.27); }
  if (cfg.outfit === 'robe') { add(g, new THREE.CylinderGeometry(0.22, 0.36, 0.56, 14, 1, true), M('#4a3a8c', { side: THREE.DoubleSide }), 0, 0.3, 0); for (let k = 0; k < 4; k++) add(g, new THREE.OctahedronGeometry(0.022), M('#ffd54a', { emissive: '#7a5a00', emissiveIntensity: 0.5 }), Math.cos(k * 1.7) * 0.18, 0.2 + k * 0.1, 0.25); add(g, new THREE.TorusGeometry(0.17, 0.05, 8, 18), M('#3a2d70'), 0, 0.65, -0.05, Math.PI / 2.4, 0, 0); }
  if (cfg.outfit === 'dino') { const dg = M('#4cbf6b'), dy = M('#ffe08a'); add(g, new THREE.BoxGeometry(0.22, 0.3, 0.02), dy, 0, 0.4, 0.235); for (let k = 0; k < 5; k++) add(g, new THREE.ConeGeometry(0.05, 0.1, 4), M('#2e9c4e'), 0, 0.65 - k * 0.09, -0.23 - k * 0.012, -0.5, 0, 0); add(g, new THREE.ConeGeometry(0.09, 0.32, 10), dg, 0, 0.18, -0.32, -1.2, 0, 0); }
  if (cfg.outfit === 'mecha') { const pl = M('#eef1f6', { metalness: 0.5, roughness: 0.3 }), glow = M(cfg.color, { emissive: cfg.color, emissiveIntensity: 0.8 }); add(g, new THREE.CylinderGeometry(0.215, 0.26, 0.42, 14), pl, 0, 0.42, 0); for (const sx of [-1, 1]) add(g, new THREE.SphereGeometry(0.095, 12, 10), pl, sx * 0.23, 0.6, 0).scale.set(1, 0.8, 1); add(g, new THREE.BoxGeometry(0.02, 0.24, 0.01), glow, 0, 0.44, 0.255); add(g, new THREE.TorusGeometry(0.06, 0.012, 6, 16), glow, 0, 0.5, 0.25); add(g, new THREE.BoxGeometry(0.44, 0.03, 0.44), glow, 0, 0.24, 0); }
  if (cfg.outfit === 'army') { add(g, new THREE.BoxGeometry(0.42, 0.04, 0.42), M('#6b4f2a'), 0, 0.3, 0); }
  // ----- đầu -----
  const head = new THREE.Group(); head.position.y = 0.88; g.add(head);
  const skull = add(head, new THREE.SphereGeometry(0.27, 24, 18), skin, 0, 0, 0); if (cfg.kind === 'frog') skull.scale.set(1.12, 0.9, 1);
  // mắt + miệng
  const eye = new THREE.SphereGeometry(0.045, 14, 10); /* mắt to, hơi dài kiểu anime (17/11/2026) */
  if (cfg.kind !== 'frog') for (const sx of [-1, 1]) add(head, eye, dark, sx * 0.095, 0.015, 0.235).scale.set(1, 1.3, 0.55);
  if (cfg.kind !== 'frog') for (const sx of [-1, 1]) { add(head, new THREE.SphereGeometry(0.017, 8, 6), white, sx * 0.095 + 0.014, 0.045, 0.262); add(head, new THREE.SphereGeometry(0.008, 6, 4), white, sx * 0.095 - 0.012, -0.01, 0.262); }
  if (cfg.kind !== 'frog') add(head, new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), M('#7a2b2b'), 0, -0.08, 0.245, Math.PI, 0, 0);
  add(head, new THREE.SphereGeometry(0.04, 8, 6), M('#ff9a9a', { transparent: true, opacity: 0.6 }), -0.17, -0.05, 0.19); add(head, new THREE.SphereGeometry(0.04, 8, 6), M('#ff9a9a', { transparent: true, opacity: 0.6 }), 0.17, -0.05, 0.19);
  // thú: tai, mõm
  if (cfg.kind === 'cat' || cfg.kind === 'fox') { const e = M(cfg.skin); add(head, new THREE.ConeGeometry(0.09, 0.18, 4), e, -0.16, 0.24, 0, 0, 0, 0.3); add(head, new THREE.ConeGeometry(0.09, 0.18, 4), e, 0.16, 0.24, 0, 0, 0, -0.3); if (cfg.kind === 'fox') add(head, new THREE.ConeGeometry(0.08, 0.16, 6), white, 0, -0.06, 0.25, Math.PI / 2, 0, 0); }
  if (cfg.kind === 'dog') { const e = M(shadeHex(cfg.skin, 0.7)); add(head, new THREE.SphereGeometry(0.1, 8, 6), e, -0.24, 0.05, 0).scale.set(0.5, 1.4, 0.8); add(head, new THREE.SphereGeometry(0.1, 8, 6), e, 0.24, 0.05, 0).scale.set(0.5, 1.4, 0.8); add(head, new THREE.SphereGeometry(0.04, 8, 6), dark, 0, -0.03, 0.27); }
  if (cfg.kind === 'panda') { add(head, new THREE.SphereGeometry(0.08, 8, 6), dark, -0.19, 0.22, 0); add(head, new THREE.SphereGeometry(0.08, 8, 6), dark, 0.19, 0.22, 0); add(head, new THREE.SphereGeometry(0.065, 8, 6), dark, -0.09, 0.02, 0.22).scale.set(1, 1.3, 0.6); add(head, new THREE.SphereGeometry(0.065, 8, 6), dark, 0.09, 0.02, 0.22).scale.set(1, 1.3, 0.6); }
  if (cfg.kind === 'frog') { /* ếch dễ thương (anh chê xấu 18/11/2026): đầu bầu ngang, hai mắt to lồi phía trên trán (vẫn nhìn thẳng thấy), tròng đen to + 2 đốm sáng, miệng cười rộng, lỗ mũi chấm */
    const lid = M(shadeHex(cfg.skin, 0.9)); /* bỏ cằm sáng màu – anh chê nhìn kì 18/11/2026 */
    for (const sx of [-1, 1]) {
      add(head, new THREE.SphereGeometry(0.105, 18, 14), lid, sx * 0.135, 0.14, 0.1); /* gò mắt */
      add(head, new THREE.SphereGeometry(0.085, 18, 14), white, sx * 0.135, 0.15, 0.155);
      add(head, new THREE.SphereGeometry(0.05, 14, 12), dark, sx * 0.13, 0.145, 0.215).scale.set(1, 1.15, 0.6);
      add(head, new THREE.SphereGeometry(0.018, 8, 6), white, sx * 0.13 + 0.018, 0.17, 0.24); add(head, new THREE.SphereGeometry(0.009, 6, 4), white, sx * 0.13 - 0.016, 0.125, 0.24);
      add(head, new THREE.SphereGeometry(0.009, 6, 4), M(shadeHex(cfg.skin, 0.55)), sx * 0.035, 0.0, 0.262); /* lỗ mũi */
    }
    const mo = add(head, new THREE.TorusGeometry(0.1, 0.014, 8, 24, Math.PI), M(shadeHex(cfg.skin, 0.4)), 0, -0.035, 0.25, Math.PI, 0, 0); mo.scale.set(1, 0.6, 1); /* miệng cười rộng */
  }
  if (cfg.kind === 'rabbit') { const e = M(cfg.skin), pk = M('#ffb3c6'); for (const sx of [-1, 1]) { add(head, new THREE.CapsuleGeometry(0.06, 0.26, 4, 8), e, sx * 0.1, 0.38, -0.02, 0, 0, sx * -0.15); add(head, new THREE.CapsuleGeometry(0.03, 0.2, 4, 6), pk, sx * 0.1, 0.38, 0.03, 0, 0, sx * -0.15); } add(head, new THREE.SphereGeometry(0.03, 8, 6), pk, 0, -0.03, 0.27); }
  if (cfg.kind === 'bear') { const e = M(shadeHex(cfg.skin, 0.8)); add(head, new THREE.SphereGeometry(0.085, 10, 8), e, -0.2, 0.22, 0); add(head, new THREE.SphereGeometry(0.085, 10, 8), e, 0.2, 0.22, 0); add(head, new THREE.SphereGeometry(0.09, 10, 8), M(shadeHex(cfg.skin, 1.25)), 0, -0.06, 0.21).scale.set(1.2, 0.85, 0.8); add(head, new THREE.SphereGeometry(0.035, 8, 6), dark, 0, -0.03, 0.29); }
  // tóc (chỉ người)
  const hc = M(cfg.hairColor);
  const COVER = ['helmet', 'cap', 'beanie', 'firehat', 'chef', 'cowboy', 'pirate', 'gradcap', 'santa', 'wizard', 'nonla', 'astro', 'beret'].includes(cfg.hat); /* nón trùm đỉnh đầu: tóc chỉ còn mái + phần hai bên / sau gáy, không đâm xuyên nón */
  const hairTop = COVER && ['spiky', 'quiff', 'curly', 'bun', 'odango'].includes(cfg.hair) ? 'short' : cfg.hair;
  if (isHuman && cfg.hair !== 'bald' && cfg.hat !== 'pith') { /* mũ cối trùm kín tóc */
    /* tóc làm lại 18/11/2026 (anh chê nhìn buồn cười): đỉnh + vòng sau gáy ôm sát đầu, mái trơn uốn cong (bỏ mép răng cưa), kiểu dài có khối tóc phía sau + lọn hai bên má */
    const hd = M(cfg.hairColor, { side: THREE.DoubleSide, roughness: 0.55 }), P2 = Math.PI / 2;
    const shell = (r, ph0, phL, th0, thL, x = 0, y = 0, z = 0) => add(head, new THREE.SphereGeometry(r, 36, 18, ph0, phL, th0, thL), hd, x, y, z);
    const ball = (r, x, y, z, sx = 1, sy = 1, sz = 1, mat = hc) => { const m = add(head, new THREE.SphereGeometry(r, 18, 14), mat, x, y, z); m.scale.set(sx, sy, sz); return m; };
    const along = (geo, dir, dist, mat = hc) => { const d = new THREE.Vector3(...dir).normalize(), m = new THREE.Mesh(geo, mat); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); m.position.copy(d.multiplyScalar(dist)); head.add(m); return m; };
    const len = { short: 0.56, spiky: 0.52, quiff: 0.54, curly: 0.5, bun: 0.56, odango: 0.56, ponytail: 0.56, twintails: 0.58, long: 0.66, wavy: 0.66, bob: 0.7 }[cfg.hair] || 0.56;
    const gap = cfg.hair === 'bob' ? 0.82 : 0.95; /* chừa mặt phía trước */
    shell(0.29, 0, Math.PI * 2, 0, Math.PI * 0.42, 0, 0.005, -0.005); /* đỉnh đầu */
    shell(cfg.hair === 'bob' ? 0.305 : 0.288, P2 + gap, Math.PI * 2 - gap * 2, Math.PI * 0.3, Math.PI * (len - 0.3), 0, 0.005, -0.005); /* hai bên + sau gáy */
    if (hairTop !== 'curly' && hairTop !== 'quiff' && !['helmet', 'cap', 'beanie', 'firehat'].includes(cfg.hat)) { /* mái lọn tròn; nón ôm sát đầu thì giấu mái kẻo lồi xuyên nón */
      for (const [x, y, z, rz, sc] of [[-0.15, 0.115, 0.205, 0.5, 0.9], [-0.05, 0.12, 0.235, 0.2, 1.05], [0.06, 0.125, 0.232, -0.12, 1], [0.16, 0.11, 0.2, -0.45, 0.85]]) ball(0.07 * sc, x, y, z, 1.15, 1.45, 0.5).rotation.z = rz; /* 4 lọn mái tròn rủ xuống trán, kiểu chibi */ }
    if (hairTop === 'spiky') for (const d of [[0, 1, -0.4], [-0.62, 0.78, -0.2], [0.62, 0.78, -0.2], [-0.32, 0.86, 0.38], [0.32, 0.86, 0.38], [0, 0.6, -0.8]]) along(new THREE.ConeGeometry(0.115, 0.22, 14), d, 0.33);
    if (hairTop === 'quiff') { const q = ball(0.17, 0.03, 0.17, 0.12, 1.12, 0.62, 0.85); q.rotation.set(-0.75, 0, -0.12); /* tóc vuốt: một khối phồng nối từ trán ngược lên đỉnh */ }
    if (hairTop === 'curly') { for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, th = 0.22 + (k % 2) * 0.12; if (Math.sin(a) > 0.6 && th > 0.3) continue; along(new THREE.SphereGeometry(0.085, 14, 12), [Math.cos(a) * Math.sin(th * Math.PI), Math.cos(th * Math.PI), Math.sin(a) * Math.sin(th * Math.PI)], 0.29); } for (const x of [-0.12, 0, 0.12]) ball(0.075, x, 0.16, 0.22); }
    if (cfg.hair === 'long' || cfg.hair === 'wavy') { ball(0.27, 0, -0.17, -0.09, 1.08, 1.25, 0.78, hd); /* khối tóc sau lưng */
      for (const sx of [-1, 1]) { if (cfg.hair === 'long') add(head, new THREE.CapsuleGeometry(0.06, 0.24, 6, 12), hc, sx * 0.25, -0.17, 0.06, 0.08, 0, sx * 0.08); else for (let j = 0; j < 3; j++) ball(0.072, sx * (0.26 + (j % 2) * 0.03), -0.08 - j * 0.1, 0.05 - j * 0.02, 1, 1.1, 0.9); } }
    if (hairTop === 'bun') { ball(0.12, 0, 0.24, -0.16); add(head, new THREE.TorusGeometry(0.075, 0.016, 8, 18), M('#e85d75'), 0, 0.18, -0.13, 0.9, 0, 0); }
    if (hairTop === 'odango') for (const sx of [-1, 1]) { ball(0.1, sx * 0.19, 0.25, -0.04); add(head, new THREE.TorusGeometry(0.07, 0.014, 6, 14), M('#e85d75'), sx * 0.17, 0.2, -0.03, 1.3, 0, sx * 0.5); }
    if (cfg.hair === 'twintails') for (const sx of [-1, 1]) { add(head, new THREE.CapsuleGeometry(0.075, 0.2, 6, 12), hc, sx * 0.33, -0.08, -0.07, 0, 0, sx * 0.28); add(head, new THREE.TorusGeometry(0.05, 0.016, 8, 14), M('#e85d75'), sx * 0.29, 0.06, -0.07, Math.PI / 2, 0, sx * 0.28); }
    if (cfg.hair === 'ponytail') { add(head, new THREE.TorusGeometry(0.05, 0.017, 8, 14), M('#e85d75'), 0.05, 0.14, -0.26, 0.3, 0, 0); add(head, new THREE.CapsuleGeometry(0.068, 0.3, 6, 12), hc, 0.2, -0.1, -0.23, 0.3, 0, 0.5); } /* đuôi ngựa buộc sau gáy, rủ xuống lệch phải */
  }
  // nón
  const hatY = 0.2, hat0 = head.children.length;
  if (cfg.hat === 'nonla') { add(head, new THREE.ConeGeometry(0.5, 0.28, 24), M('#f3dc9b', { flatShading: true }), 0, hatY + 0.12, 0); }
  if (cfg.hat === 'helmet') { add(head, new THREE.SphereGeometry(0.3, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), main, 0, 0.02, 0); add(head, new THREE.BoxGeometry(0.3, 0.03, 0.12), dark, 0, 0.05, 0.3); }
  if (cfg.hat === 'cap') { add(head, new THREE.SphereGeometry(0.29, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), main, 0, 0.03, 0); add(head, new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16, 1, false, -Math.PI / 2, Math.PI), main, 0, 0.13, 0.22); }
  if (cfg.hat === 'cowboy') { add(head, new THREE.CylinderGeometry(0.48, 0.48, 0.03, 24), M('#8d5a3b'), 0, hatY, 0); add(head, new THREE.CylinderGeometry(0.2, 0.24, 0.24, 16), M('#8d5a3b'), 0, hatY + 0.12, 0); add(head, new THREE.CylinderGeometry(0.245, 0.245, 0.05, 16), dark, 0, hatY + 0.03, 0); }
  if (cfg.hat === 'crown') { add(head, new THREE.CylinderGeometry(0.17, 0.17, 0.12, 8, 1, true), M('#ffd54a', { metalness: 0.7, roughness: 0.25, side: THREE.DoubleSide }), 0, 0.31, 0); for (let k = 0; k < 8; k++) add(head, new THREE.ConeGeometry(0.03, 0.08, 4), M('#ffd54a', { metalness: 0.7, roughness: 0.25 }), Math.cos(k * Math.PI / 4) * 0.17, 0.41, Math.sin(k * Math.PI / 4) * 0.17); add(head, new THREE.SphereGeometry(0.03, 8, 6), M('#e53935'), 0, 0.31, 0.17); }
  if (cfg.hat === 'chef') { add(head, new THREE.CylinderGeometry(0.2, 0.2, 0.14, 16), white, 0, 0.27, 0); add(head, new THREE.SphereGeometry(0.22, 14, 10), white, 0, 0.4, 0).scale.set(1, 0.75, 1); }
  if (cfg.hat === 'maidband') { add(head, new THREE.TorusGeometry(0.27, 0.025, 6, 24, Math.PI), M('#22222b'), 0, 0.08, 0.02, -0.5, 0, 0); for (let k = 0; k < 5; k++) add(head, new THREE.SphereGeometry(0.05, 8, 6), white, -0.18 + k * 0.09, 0.27 - Math.abs(k - 2) * 0.03, 0.08).scale.set(1, 0.8, 0.5); }
  if (cfg.hat === 'pith') { /* mũ cối bộ đội (anh gửi ảnh 17/11/2026): tiện tròn bằng LatheGeometry – chóp cao bo tròn, sườn xuôi liền vành, vành dài trước/sau; núm thông hơi trên đỉnh, quân hiệu sao vàng nền đỏ, quai da đen có khoá */
    const gm = M('#56783a', { roughness: 0.42, side: THREE.DoubleSide }), pg = new THREE.Group(); pg.position.set(0, 0.12, -0.01); head.add(pg);
    const prof = [[0, 0.43], [0.07, 0.427], [0.14, 0.41], [0.2, 0.38], [0.25, 0.33], [0.285, 0.26], [0.302, 0.18], [0.31, 0.11], [0.322, 0.06], [0.35, 0.02], [0.39, -0.01], [0.425, -0.03], [0.42, -0.04], [0.38, -0.02], [0.33, 0.015], [0.3, 0.06]].map(([r, y]) => new THREE.Vector2(r, y));
    const shell = add(pg, new THREE.LatheGeometry(prof, 44), gm, 0, 0, 0); shell.scale.set(1, 1, 1.13);
    add(pg, new THREE.CylinderGeometry(0.028, 0.036, 0.025, 14), gm, 0, 0.44, 0); add(pg, new THREE.SphereGeometry(0.03, 12, 8), gm, 0, 0.455, 0).scale.set(1, 0.6, 1);
    const bz = 0.302 * 1.13 + 0.004, by = 0.175;
    add(pg, new THREE.CylinderGeometry(0.05, 0.05, 0.012, 22), M('#c62828', { metalness: 0.35, roughness: 0.35 }), 0, by, bz, Math.PI / 2 - 0.12, 0, 0);
    const sh = new THREE.Shape(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.015 : 0.036, a = Math.PI / 2 + k * Math.PI / 5; sh[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    add(pg, new THREE.ShapeGeometry(sh), M('#ffd23d', { emissive: '#7a5a00', emissiveIntensity: 0.4, side: THREE.DoubleSide }), 0, by + 0.001, bz + 0.008, -0.12, 0, 0);
    add(pg, new THREE.BoxGeometry(0.4, 0.02, 0.01), M('#1d1d22'), 0, 0.0, 0.405, -0.55, 0, 0);
    for (const sx of [-1, 1]) add(pg, new THREE.BoxGeometry(0.02, 0.028, 0.014), M('#c9ccd4', { metalness: 0.8, roughness: 0.3 }), sx * 0.11, 0.0, 0.41, -0.55, 0, 0);
  }
  if (cfg.hat === 'beret') { add(head, new THREE.SphereGeometry(0.3, 18, 10), M('#c62828'), 0.04, 0.2, -0.02, 0, 0, -0.2).scale.set(1, 0.32, 1); add(head, new THREE.CylinderGeometry(0.012, 0.012, 0.05, 6), dark, 0.06, 0.3, -0.02); }
  if (cfg.hat === 'gradcap') { add(head, new THREE.CylinderGeometry(0.22, 0.22, 0.12, 16), dark, 0, 0.24, 0); add(head, new THREE.BoxGeometry(0.5, 0.025, 0.5), dark, 0, 0.31, 0, 0, Math.PI / 4, 0); add(head, new THREE.CylinderGeometry(0.008, 0.008, 0.2, 4), M('#ffd54a'), 0.2, 0.22, 0.05, 0, 0, 0.1); add(head, new THREE.SphereGeometry(0.025, 6, 4), M('#ffd54a'), 0.21, 0.12, 0.05); }
  if (cfg.hat === 'firehat') { const fr = M('#d32f2f', { roughness: 0.35 }); add(head, new THREE.SphereGeometry(0.3, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), fr, 0, 0.04, 0).scale.set(1, 1.05, 1.05); add(head, new THREE.CylinderGeometry(0.33, 0.4, 0.04, 24, 1, true), M('#d32f2f', { side: THREE.DoubleSide }), 0, 0.04, -0.03).scale.set(1, 1, 1.15); add(head, new THREE.BoxGeometry(0.14, 0.12, 0.02), M('#ffd54a', { metalness: 0.7 }), 0, 0.2, 0.3, -0.35, 0, 0); }
  if (cfg.hat === 'astro') { add(head, new THREE.SphereGeometry(0.38, 24, 18), M('#bfe3ff', { transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.2 }), 0, 0.02, 0); add(head, new THREE.TorusGeometry(0.3, 0.04, 8, 24), M('#dfe4ec'), 0, -0.24, 0, Math.PI / 2, 0, 0); }
  if (cfg.hat === 'pirate') { const pk = M('#22222b'); add(head, new THREE.CylinderGeometry(0.2, 0.25, 0.18, 16), pk, 0, 0.3, 0); add(head, new THREE.BoxGeometry(0.66, 0.1, 0.22), pk, 0, 0.24, 0).scale.set(1, 1, 1); add(head, new THREE.SphereGeometry(0.035, 8, 6), white, 0, 0.32, 0.12); }
  if (cfg.hat === 'antlers') { /* bờm sừng tuần lộc + chuông */ const am = M('#8d5a3b', { flatShading: true }); add(head, new THREE.TorusGeometry(0.28, 0.015, 6, 24, Math.PI), M('#d9302f'), 0, 0.05, 0.02);
    for (const sx of [-1, 1]) { add(head, new THREE.CylinderGeometry(0.018, 0.026, 0.2, 6), am, sx * 0.16, 0.34, 0, 0, 0, sx * -0.35); add(head, new THREE.CylinderGeometry(0.012, 0.018, 0.1, 6), am, sx * 0.24, 0.39, 0, 0, 0, sx * -1.1); add(head, new THREE.CylinderGeometry(0.012, 0.018, 0.09, 6), am, sx * 0.17, 0.47, 0, 0, 0, sx * 0.3); }
    add(head, new THREE.SphereGeometry(0.035, 10, 8), M('#ffd54a', { metalness: 0.8, roughness: 0.25 }), 0.2, 0.2, 0.17); }
  if (cfg.hat === 'catphones') { const pm = M('#ffb3d1'); add(head, new THREE.TorusGeometry(0.29, 0.025, 8, 28, Math.PI), M('#ffffff'), 0, 0.03, 0); for (const sx of [-1, 1]) { add(head, new THREE.CylinderGeometry(0.085, 0.085, 0.06, 18), pm, sx * 0.29, 0.0, 0, 0, 0, Math.PI / 2); add(head, new THREE.ConeGeometry(0.07, 0.13, 4), pm, sx * 0.17, 0.3, 0, 0, 0, sx * -0.4); add(head, new THREE.ConeGeometry(0.04, 0.08, 4), M('#ffffff'), sx * 0.17, 0.29, 0.03, 0, 0, sx * -0.4); } }
  if (cfg.hat === 'beanie') { add(head, new THREE.SphereGeometry(0.295, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), main, 0, 0.03, 0); add(head, new THREE.TorusGeometry(0.255, 0.04, 8, 24), M(shadeHex(cfg.color, 0.8)), 0, 0.12, 0, Math.PI / 2, 0, 0); add(head, new THREE.SphereGeometry(0.07, 10, 8), white, 0, 0.34, 0); }
  if (cfg.hat === 'party') { add(head, new THREE.ConeGeometry(0.11, 0.3, 16), main, 0.06, 0.38, 0.02, 0, 0, -0.25); add(head, new THREE.SphereGeometry(0.04, 8, 6), M('#ffd54a'), 0.1, 0.53, 0.02); }
  if (cfg.hat === 'wizard') { const wm = M('#5b3fbf'); add(head, new THREE.CylinderGeometry(0.42, 0.42, 0.02, 24), wm, 0, hatY, 0); add(head, new THREE.ConeGeometry(0.2, 0.46, 16), wm, 0, hatY + 0.23, -0.02, -0.12, 0, 0); add(head, new THREE.OctahedronGeometry(0.04), M('#ffd54a', { emissive: '#7a5a00' }), 0, hatY + 0.12, 0.17); }
  if (cfg.hat === 'santa') { add(head, new THREE.ConeGeometry(0.24, 0.36, 16), M('#d9302f'), 0.04, 0.33, -0.03, -0.25, 0, -0.35); add(head, new THREE.TorusGeometry(0.235, 0.05, 8, 20), white, 0, 0.17, 0, Math.PI / 2, 0, 0); add(head, new THREE.SphereGeometry(0.06, 8, 6), white, 0.17, 0.45, -0.1); }
  if (cfg.hat === 'catband') { const hb = M(cfg.hairColor === '#ffffff' ? '#22222b' : cfg.hairColor); add(head, new THREE.TorusGeometry(0.28, 0.018, 6, 24, Math.PI), M('#22222b'), 0, 0.03, 0, 0, 0, 0); for (const sx of [-1, 1]) { add(head, new THREE.ConeGeometry(0.08, 0.15, 4), hb, sx * 0.17, 0.28, 0, 0, 0, sx * -0.35); add(head, new THREE.ConeGeometry(0.045, 0.09, 4), M('#ffb3c6'), sx * 0.17, 0.27, 0.035, 0, 0, sx * -0.35); } }
  if (cfg.hat === 'flower') { const pm = M('#ff7ac8'); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; add(head, new THREE.SphereGeometry(0.035, 8, 6), pm, 0.2 + Math.cos(a) * 0.04, 0.17 + Math.sin(a) * 0.04, 0.16); } add(head, new THREE.SphereGeometry(0.03, 8, 6), M('#ffd54a'), 0.2, 0.17, 0.18); }
  if (cfg.hat === 'halo') add(head, new THREE.TorusGeometry(0.18, 0.025, 8, 28), M('#ffe066', { emissive: '#c99a00', emissiveIntensity: 0.8, metalness: 0.4 }), 0, 0.42, 0, Math.PI / 2, 0, 0);
  { /* nón trùm: nới 7% cho khỏi lẹm tóc; ếch: nhấc nón lên khỏi hai mắt; thú có tai: nhấc nhẹ */
    const k = COVER ? 1.07 : 1, lift = cfg.kind === 'frog' ? (COVER ? 0.12 : -0.05) : (!isHuman && COVER ? 0.03 : 0) + (['helmet', 'cap', 'beanie', 'firehat'].includes(cfg.hat) ? 0.045 : 0); /* nón ôm đầu: nhấc lên cho khỏi che mắt */
    if (k !== 1 || lift) for (const m of head.children.slice(hat0)) { m.position.multiplyScalar(k); m.scale.multiplyScalar(k); m.position.y += lift; }
  }
  // sừng
  if (cfg.horns === 'bull') { const hm = M('#efe6d2'); for (const sx of [-1, 1]) { add(head, new THREE.CylinderGeometry(0.03, 0.06, 0.18, 8), hm, sx * 0.24, 0.18, 0, 0, 0, sx * -1.0); add(head, new THREE.ConeGeometry(0.03, 0.14, 8), hm, sx * 0.34, 0.3, 0, 0, 0, sx * -0.25); } }
  if (cfg.horns === 'deer') { const hm = M('#8d5a3b', { flatShading: true });
    // cành sừng: mỗi đoạn mọc ra từ điểm cuối đoạn trước nên không bị rời
    const seg = (x, y, ang, len, r) => { add(head, new THREE.CylinderGeometry(r * 0.7, r, len, 6), hm, x + Math.sin(ang) * len / 2, y + Math.cos(ang) * len / 2, -0.02, 0, 0, -ang); return [x + Math.sin(ang) * len, y + Math.cos(ang) * len]; };
    for (const sx of [-1, 1]) {
      let [x, y] = seg(sx * 0.13, 0.22, sx * 0.45, 0.22, 0.03);
      seg(x, y, sx * 1.25, 0.14, 0.02);
      [x, y] = seg(x, y, sx * 0.15, 0.16, 0.022);
      seg(x, y, sx * 0.95, 0.11, 0.016); seg(x, y, sx * -0.2, 0.12, 0.016);
    } }
  if (cfg.horns === 'devil') { const hm = M('#d32f2f', { roughness: 0.4 }); for (const sx of [-1, 1]) add(head, new THREE.ConeGeometry(0.05, 0.16, 10), hm, sx * 0.15, 0.27, 0.05, -0.2, 0, sx * -0.35); }
  // phụ kiện
  if (cfg.acc === 'glasses') { for (const sx of [-1, 1]) add(head, new THREE.SphereGeometry(0.06, 14, 10), M('#1d1d26', { roughness: 0.15, metalness: 0.3 }), sx * 0.095, 0.02, 0.255).scale.set(1.15, 0.8, 0.3); add(head, new THREE.BoxGeometry(0.06, 0.012, 0.01), dark, 0, 0.04, 0.272); }
  if (cfg.acc === 'scarf') { add(g, new THREE.TorusGeometry(0.19, 0.05, 8, 16), M('#d32f2f'), 0, 0.64, 0, Math.PI / 2, 0, 0); add(g, new THREE.BoxGeometry(0.08, 0.16, 0.03), M('#d32f2f'), 0.08, 0.55, 0.2, 0, 0, 0.2); }
  if (cfg.acc === 'backpack') { const bp = M(shadeHex(cfg.color, 0.7)); add(g, new THREE.BoxGeometry(0.3, 0.32, 0.14), bp, 0, 0.45, -0.25); for (const sx of [-1, 1]) add(g, new THREE.BoxGeometry(0.045, 0.3, 0.02), bp, sx * 0.12, 0.47, 0.215, -0.12, 0, 0); add(g, new THREE.BoxGeometry(0.1, 0.06, 0.03), M(shadeHex(cfg.color, 0.55)), -0.12, 0.42, 0.235); } /* quai đeo phía trước cho nhìn thẳng vẫn biết là ba lô */
  if (cfg.acc === 'moneybag') { add(g, new THREE.SphereGeometry(0.1, 12, 10), M('#9b6b3e'), 0.27, 0.51, 0.3); add(g, new THREE.CylinderGeometry(0.03, 0.05, 0.06, 8), M('#ffd54a'), 0.27, 0.62, 0.3); add(g, new THREE.CylinderGeometry(0.035, 0.035, 0.01, 12), M('#ffd54a', { metalness: 0.7 }), 0.27, 0.51, 0.4, Math.PI / 2, 0, 0); }
  if (cfg.acc === 'roundglasses') { for (const sx of [-1, 1]) add(head, new THREE.TorusGeometry(0.05, 0.01, 6, 16), dark, sx * 0.09, 0.025, 0.27); add(head, new THREE.BoxGeometry(0.06, 0.01, 0.01), dark, 0, 0.035, 0.28); }
  if (cfg.acc === 'mask') { add(head, new THREE.BoxGeometry(0.24, 0.12, 0.05), M('#e8f4ff'), 0, -0.08, 0.235); for (const sx of [-1, 1]) add(head, new THREE.BoxGeometry(0.1, 0.01, 0.01), M('#e8f4ff'), sx * 0.18, -0.06, 0.2, 0, sx * 0.9, 0); }
  if (cfg.acc === 'bowtie') { add(g, new THREE.ConeGeometry(0.05, 0.09, 4), main, -0.045, 0.62, 0.22, 0, 0, Math.PI / 2); add(g, new THREE.ConeGeometry(0.05, 0.09, 4), main, 0.045, 0.62, 0.22, 0, 0, -Math.PI / 2); add(g, new THREE.SphereGeometry(0.022, 6, 4), main, 0, 0.62, 0.23); }
  if (cfg.acc === 'boba') { add(g, new THREE.CylinderGeometry(0.06, 0.05, 0.15, 14), M('#e8c9a0', { transparent: true, opacity: 0.92 }), 0.25, 0.59, 0.29); for (let k = 0; k < 5; k++) add(g, new THREE.SphereGeometry(0.014, 6, 4), dark, 0.225 + (k % 3) * 0.022, 0.545, 0.3 + (k % 2) * 0.02); add(g, new THREE.CylinderGeometry(0.01, 0.01, 0.13, 6), M('#ff7ac8'), 0.26, 0.71, 0.29, 0, 0, -0.2); add(g, new THREE.CylinderGeometry(0.062, 0.062, 0.015, 14), white, 0.25, 0.575, 0.29); }
  if (cfg.acc === 'balloon') { add(g, new THREE.CylinderGeometry(0.004, 0.004, 0.6, 4), white, 0.29, 0.77, 0.25, 0, 0, -0.12); add(g, new THREE.SphereGeometry(0.13, 14, 10), M('#ff5a5f', { roughness: 0.3 }), 0.33, 1.13, 0.25).scale.set(1, 1.15, 1); }
  if (cfg.acc === 'guitar') { const gw = M('#b5651d'); const gtr = new THREE.Group(); gtr.position.set(0.05, 0.42, 0.27); gtr.rotation.set(0, 0, 0.7); g.add(gtr); add(gtr, new THREE.SphereGeometry(0.11, 12, 10), gw, 0, -0.05, 0).scale.set(1, 1, 0.35); add(gtr, new THREE.SphereGeometry(0.085, 12, 10), gw, 0, 0.08, 0).scale.set(1, 1, 0.35); add(gtr, new THREE.BoxGeometry(0.035, 0.3, 0.025), M('#4a2c14'), 0, 0.28, 0); add(gtr, new THREE.CylinderGeometry(0.03, 0.03, 0.01, 12), dark, 0, 0.02, 0.04, Math.PI / 2, 0, 0); }
  if (cfg.acc === 'medal') { add(g, new THREE.ConeGeometry(0.05, 0.12, 3), M('#e53935'), 0, 0.56, 0.235, Math.PI, 0, 0); add(g, new THREE.CylinderGeometry(0.05, 0.05, 0.015, 16), M('#ffd54a', { metalness: 0.7, roughness: 0.25 }), 0, 0.47, 0.25, Math.PI / 2, 0, 0); }
  if (cfg.acc === 'wings') { const wm = M('#ffffff', { roughness: 0.4 }); for (const sx of [-1, 1]) add(g, new THREE.SphereGeometry(0.28, 12, 10), wm, sx * 0.3, 0.6, -0.24, 0, sx * 0.35, sx * -0.6).scale.set(0.5, 1, 0.12); }
  if (cfg.acc === 'eyepatch') { add(head, new THREE.SphereGeometry(0.05, 10, 8), dark, 0.09, 0.025, 0.25).scale.set(1, 1, 0.5); add(head, new THREE.TorusGeometry(0.275, 0.008, 4, 30), dark, 0, 0.06, 0, 0, 0, -0.35); }
  if (cfg.acc === 'lantern') { /* lồng đèn ông sao trung thu */ const sh = new THREE.Shape(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.05 : 0.12, a = Math.PI / 2 + k * Math.PI / 5; sh[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } add(g, new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false }), M('#ff3d3d', { emissive: '#b31414', emissiveIntensity: 0.6 }), 0.36, 0.66, 0.24); add(g, new THREE.CylinderGeometry(0.006, 0.006, 0.36, 4), M('#8d5a3b'), 0.3, 0.6, 0.26, 0, 0, 0.5); }
  if (cfg.acc === 'flag') { add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.6, 6), M('#c9ccd4'), 0.26, 0.72, 0.26); add(g, new THREE.BoxGeometry(0.26, 0.17, 0.01), M('#da251d'), 0.4, 0.93, 0.26); const sh = new THREE.Shape(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.02 : 0.05, a = Math.PI / 2 + k * Math.PI / 5; sh[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } add(g, new THREE.ShapeGeometry(sh), M('#ffde00', { side: THREE.DoubleSide }), 0.4, 0.93, 0.267); }
  if (cfg.acc === 'sword') { add(g, new THREE.BoxGeometry(0.035, 0.46, 0.012), M('#dfe4ec', { metalness: 0.9, roughness: 0.2 }), 0.29, 0.73, 0.26, 0, 0, -0.18); add(g, new THREE.BoxGeometry(0.13, 0.028, 0.035), M('#ffd54a', { metalness: 0.7 }), 0.255, 0.5, 0.26, 0, 0, -0.18); }
  if (cfg.acc === 'gift') { add(g, new THREE.BoxGeometry(0.17, 0.15, 0.15), M('#2fa35a'), 0.24, 0.56, 0.31, 0, 0.3, 0); add(g, new THREE.BoxGeometry(0.03, 0.155, 0.155), M('#d9302f'), 0.24, 0.56, 0.31, 0, 0.3, 0); add(g, new THREE.TorusGeometry(0.03, 0.012, 6, 10), M('#d9302f'), 0.24, 0.66, 0.31, 0, 0.3, 0); }
  if (cfg.acc === 'sack') { /* túi quà Noel vác trên vai */ add(g, new THREE.SphereGeometry(0.17, 16, 12), M('#c0392b', { roughness: 0.8 }), 0.27, 0.72, -0.17).scale.set(1, 1.05, 0.95); add(g, new THREE.CylinderGeometry(0.035, 0.06, 0.07, 10), M('#c0392b', { roughness: 0.8 }), 0.15, 0.66, -0.06, 0, 0, 0.9); add(g, new THREE.TorusGeometry(0.045, 0.012, 6, 14), M('#ffd54a', { metalness: 0.6 }), 0.17, 0.67, -0.07, Math.PI / 2, 0, 0.9); for (let k = 0; k < 3; k++) add(g, new THREE.SphereGeometry(0.02, 6, 4), M('#ffd54a'), 0.22 + k * 0.05, 0.86 - k * 0.04, -0.06); }
  if (cfg.acc === 'phone') { add(g, new THREE.BoxGeometry(0.09, 0.16, 0.015), M('#22222b'), 0.24, 0.64, 0.3, -0.15, -0.3, 0); add(g, new THREE.BoxGeometry(0.075, 0.13, 0.002), M('#ff7ac8', { emissive: '#ff7ac8', emissiveIntensity: 0.6 }), 0.242, 0.64, 0.31, -0.15, -0.3, 0); }
  if (cfg.acc === 'visor') add(head, new THREE.SphereGeometry(0.29, 24, 10, Math.PI * 0.18, Math.PI * 0.64, Math.PI * 0.4, Math.PI * 0.16), M(cfg.color, { transparent: true, opacity: 0.55, emissive: cfg.color, emissiveIntensity: 0.5, side: THREE.DoubleSide }), 0, 0, 0.012);
  if (cfg.acc === 'foxtails') { const tm = M(cfg.skin === '#ffffff' ? '#f4f1ec' : cfg.skin), tip = M('#ffffff'); for (let k = 0; k < 9; k++) { const a = (k - 4) * 0.32, t = new THREE.Group(); t.position.set(0, 0.32, -0.22); t.rotation.set(-0.3, 0, a * 0.8); g.add(t); add(t, new THREE.SphereGeometry(0.085, 12, 10), tm, 0, 0.26, -0.05).scale.set(1, 2.6, 1); add(t, new THREE.SphereGeometry(0.06, 10, 8), tip, 0, 0.47, -0.06).scale.set(1, 1.5, 1); } }
  if (cfg.acc === 'book') { add(g, new THREE.BoxGeometry(0.17, 0.21, 0.045), M('#3d8bff'), 0.22, 0.59, 0.31, 0, -0.35, 0.1); add(g, new THREE.BoxGeometry(0.15, 0.19, 0.04), white, 0.215, 0.5, 0.315, 0, -0.35, 0.1); }
  g.userData.head = head;
  return g;
}

/* máy quay tự lùi cho vừa cả nhân vật + đồ (18/11/2026: nón cao, bong bóng, cờ… từng bị cắt). Khung tròn 'av': từ ngực trở lên, chừa chỗ món cầm tay */
function fitCam(obj, cam, av) {
  obj.updateMatrixWorld(true); const box = new THREE.Box3(), t = new THREE.Box3(), y0 = av ? 0.36 : -0.02;
  obj.traverse(m => { if (!m.isMesh) return; if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); t.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); if (t.max.y < y0) return; t.min.y = Math.max(t.min.y, y0); box.union(t); });
  const top = Math.max(box.max.y + 0.03, av ? 1.2 : 1.24), wx = Math.max(Math.abs(box.min.x), Math.abs(box.max.x), 0.36) + 0.04;
  const h = Math.max(top - y0, wx * 2) * (av ? 1.04 : 1.06), cy = y0 + (top - y0) / 2, dist = h / 2 / Math.tan(15 * Math.PI / 180) + 0.3;
  cam.position.set(dist * 0.11, cy + dist * 0.09, dist); cam.lookAt(0, cy, 0);
}
// Vẽ ảnh chân dung nhỏ của nhân vật ra dataURL (dùng làm avatar trong giao diện HTML)
let _r = null;
export function portrait(cfg, size = 128, mode = '') { /* mode 'av' = khung avatar tròn: lùi máy quay, chừa chỗ cho nón */
  if (!_r) { _r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); _r.outputColorSpace = THREE.SRGBColorSpace; }
  _r.setSize(size, size, false);
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6)); const d = new THREE.DirectionalLight(0xffffff, 1.4); d.position.set(1, 2, 3); sc.add(d);
  const a = buildAvatar(cfg); sc.add(a);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20); fitCam(a, cam, mode === 'av');
  _r.render(sc, cam);
  return _r.domElement.toDataURL('image/png');
}
