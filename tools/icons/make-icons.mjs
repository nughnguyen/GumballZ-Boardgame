// 🎨 Vẽ icon minh hoạ cho ô game ở trang chủ (SVG tự vẽ bằng code, không dùng hình có bản quyền).
// Chạy: node tools/icons/make-icons.mjs  → shared/img/icons/<game>.svg (khung 400×180, nền trong suốt)
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
const OUT = fileURLToPath(new URL('../../shared/img/icons/', import.meta.url)) + '/'; mkdirSync(OUT, { recursive: true });
const INK = '#2a2340';
const S = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const F = `font-family="'Arial Rounded MT Bold','Arial Black',Arial,Helvetica,sans-serif" font-weight="900"`;
const svg = (body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 180" width="400" height="180">
<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="3" dy="3" stdDeviation="0" flood-color="#2a2340" flood-opacity=".16"/></filter>${defs}</defs>
<g filter="url(#sh)">${body}</g></svg>`;
// ---- chất bài (khung 100×100) ----
const SUIT = {
  h: { c: '#FEC5E6', d: 'M50 92C20 67 0 47 0 29 0 12 12 0 27 0c11 0 19 7 23 15 4-8 12-15 23-15 15 0 27 12 27 29 0 18-20 38-50 63z' },
  d: { c: '#FEC5E6', d: 'M50 0l38 50-38 50-38-50z' },
  s: { c: INK, d: 'M50 0C35 20 0 40 0 62c0 16 12 26 26 26 10 0 17-5 20-11-1 11-6 18-14 23h36c-8-5-13-12-14-23 3 6 10 11 20 11 14 0 26-10 26-26C100 40 65 20 50 0z' },
  c: { c: INK, d: 'M50 4a22 22 0 1 1 0 44 22 22 0 1 1 0-44zM24 36a22 22 0 1 1 0 44 22 22 0 1 1 0-44zM76 36a22 22 0 1 1 0 44 22 22 0 1 1 0-44zM46 56c0 20-6 34-14 44h36c-8-10-14-24-14-44z' },
};
const suit = (k, x, y, size) => `<path transform="translate(${x - size / 2} ${y - size / 2}) scale(${size / 100})" d="${SUIT[k].d}" fill="${SUIT[k].c}"/>`;
// lá bài 70×100, tâm (cx,cy), xoay rot
function card(cx, cy, rank, k, rot = 0, opt = {}) {
  const w = opt.w || 70, h = opt.h || 100, col = SUIT[k] ? SUIT[k].c : INK;
  const face = opt.back ? `<rect x="${-w / 2 + 7}" y="${-h / 2 + 7}" width="${w - 14}" height="${h - 14}" rx="7" fill="${opt.back}"/><path d="M${-w / 2 + 7} ${-h / 2 + 22}l${w - 14} ${h - 30}M${-w / 2 + 7} ${h / 2 - 22}l${w - 14} ${-(h - 30)}" stroke="#fff6" stroke-width="3"/>`
    : `<text x="${-w / 2 + 8}" y="${-h / 2 + 24}" ${F} font-size="${rank.length > 1 ? 19 : 22}" fill="${col}">${rank}</text>${suit(k, -w / 2 + 17, -h / 2 + 36, 15)}${suit(k, 4, 10, opt.big || 40)}`;
  return `<g transform="translate(${cx} ${cy}) rotate(${rot})"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="10" fill="${opt.bg || '#fff'}" ${S()}/>${face}</g>`;
}
const chip = (cx, cy, r, c) => `<g transform="translate(${cx} ${cy})"><circle r="${r}" fill="${c}" ${S()}/><circle r="${r * .68}" fill="none" stroke="#fff" stroke-width="${r * .16}" stroke-dasharray="${r * .5} ${r * .38}"/><circle r="${r * .42}" fill="#fff" ${S(3)}/></g>`;
const chipStack = (cx, by, n, c) => Array.from({ length: n }, (_, i) => `<g transform="translate(${cx} ${by - i * 9})"><ellipse rx="26" ry="10" fill="${c}" ${S(3)}/><path d="M-26 0v-6a26 10 0 0 0 52 0v6" fill="${c}" ${S(3)}/><ellipse cy="-6" rx="26" ry="10" fill="${c}" ${S(3)}/><path d="M-14 -6h-6M20 -6h-6M0 -14v-2" stroke="#fff" stroke-width="3"/></g>`).join('');
const die = (cx, cy, s, rot, pips = [1, 3, 5]) => {
  const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  const n = pips[0]; return `<g transform="translate(${cx} ${cy}) rotate(${rot})"><rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" rx="${s * .2}" fill="#fff" ${S()}/>${P[n].map(([x, y]) => `<circle cx="${x * s * .27}" cy="${y * s * .27}" r="${s * .09}" fill="${n === 1 ? '#FEC5E6' : INK}"/>`).join('')}</g>`;
};
const G = {};

// 🃏 Tiến Lên: tứ quý 2 xoè quạt
G.tienlen = svg(['s', 'c', 'd', 'h'].map((k, i) => card(200 + (i - 1.5) * 34, 98 + Math.abs(i - 1.5) * 8, '2', k, (i - 1.5) * 13)).join(''));
// 🂡 Xì dách: A + K = 21
G.xidach = svg(card(170, 92, 'A', 'h', -10) + card(225, 92, 'K', 's', 9) + `<g transform="translate(292 52) rotate(12)"><circle r="30" fill="#FEE686" ${S()}/><text y="11" text-anchor="middle" ${F} font-size="30" fill="${INK}">21</text></g>`);
// Ba cào: J Q K
G.bacao = svg(card(150, 100, 'J', 'c', -14) + card(200, 86, 'Q', 'h', 0) + card(250, 100, 'K', 'd', 14) + `<g transform="translate(310 46) rotate(-10)"><rect x="-38" y="-17" width="76" height="34" rx="17" fill="#FEE686" ${S()}/><text y="9" text-anchor="middle" ${F} font-size="22" fill="${INK}">3 tây</text></g>`);
// Cát tê: lá ngửa + lá úp
G.catte = svg(card(150, 98, 'A', 'c', -12) + card(200, 86, '', 'x', 0, { back: '#FFD273' }) + card(250, 98, 'K', 'h', 12));
// Poker: AA + chồng chip
G.poker = svg(card(160, 92, 'A', 's', -12) + card(212, 88, 'A', 'h', 8) + chipStack(290, 140, 4, '#FEC5E6') + chipStack(330, 146, 2, '#BFAEE3'));
// Solitaire: K Q J 10 bậc thang
G.solitaire = svg(['K s', 'Q h', 'J c', '10 d'].map((x, i) => { const [r, k] = x.split(' '); return card(150 + i * 34, 62 + i * 18, r, k, 0, { w: 64, h: 92, big: 34 }); }).join(''));
// 🐱 Mèo Nổ: mèo ôm bom
G.meono = svg(`
<g transform="translate(160 100)">
 <path d="M-58 60c-6-40 4-70 20-86l-8-36 30 20c10-3 22-3 32 0l30-20-8 36c16 16 26 46 20 86z" fill="#FFD273" ${S()}/>
 <path d="M-46 -38l-4-20 16 12zM46 -38l4-20-16 12z" fill="#FEC5E6"/>
 <path d="M-30 -2c-2 4-2 8 0 10M30 -2c2 4 2 8 0 10" stroke="${INK}" stroke-width="0"/>
 <ellipse cx="-20" cy="2" rx="7" ry="9" fill="${INK}"/><ellipse cx="20" cy="2" rx="7" ry="9" fill="${INK}"/><circle cx="-18" cy="-1" r="2.5" fill="#fff"/><circle cx="22" cy="-1" r="2.5" fill="#fff"/>
 <path d="M-6 16l6 5 6-5" fill="#FEC5E6" ${S(3)}/><path d="M0 21v4M0 25c-4 5-10 5-12 1M0 25c4 5 10 5 12 1" fill="none" ${S(3)}/>
 <path d="M-40 12h-22M-40 20l-20 6M40 12h22M40 20l20 6" ${S(3)}/>
 <ellipse cx="-34" cy="14" rx="8" ry="5" fill="#FEC5E6" opacity=".7"/><ellipse cx="34" cy="14" rx="8" ry="5" fill="#FEC5E6" opacity=".7"/>
 <ellipse cy="46" rx="26" ry="16" fill="#FFD273"/>
</g>
<g transform="translate(250 112)">
 <circle r="36" fill="#BFAEE3" ${S()}/><circle cx="-12" cy="-12" r="9" fill="#fff" opacity=".35"/>
 <rect x="-10" y="-46" width="20" height="14" rx="3" fill="#BFAEE3" ${S()}/>
 <path d="M0 -46c4-14 18-18 24-30" fill="none" stroke="#FFD273" stroke-width="3" stroke-linecap="round"/>
 <g transform="translate(26 -80)"><path d="M0 -14l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" fill="#FEE686" stroke="#FFD273" stroke-width="3" stroke-linejoin="round"/></g>
</g>
<path d="M210 112c-10 18-34 22-52 18" fill="none" ${S(0)}/>
<ellipse cx="222" cy="134" rx="15" ry="11" fill="#FFD273" ${S()}/><path d="M216 128v8M224 128v8" ${S(2.5)}/>`);
// 🎨 Vẽ đoán chữ: bảng màu + bút chì + bóng chat "?"
G.scribble = svg(`
<g transform="translate(160 100) rotate(-8)"><path d="M-70 4c0-38 32-62 74-62 40 0 70 22 70 50 0 22-20 26-36 22-14-3-22 6-16 18 6 14-6 30-30 30-36 0-62-24-62-58z" fill="#FEE686" ${S()}/>
<circle cx="-36" cy="-14" r="11" fill="#FEC5E6" ${S(3)}/><circle cx="-6" cy="-34" r="11" fill="#FEE686" ${S(3)}/><circle cx="30" cy="-30" r="11" fill="#FFD273" ${S(3)}/><circle cx="-38" cy="22" r="11" fill="#BFAEE3" ${S(3)}/><circle cx="-6" cy="34" r="11" fill="#BFAEE3" ${S(3)}/></g>
<g transform="translate(232 104) rotate(38)"><rect x="-12" y="-62" width="24" height="96" fill="#FEE686" ${S()}/><rect x="-12" y="-62" width="24" height="14" fill="#FEC5E6" ${S()}/><path d="M-12 34l12 28 12-28z" fill="#FFD273" ${S()}/><path d="M-4 52l4 10 4-10z" fill="${INK}"/></g>
<g transform="translate(305 62)"><path d="M-40 -30h80a12 12 0 0 1 12 12v36a12 12 0 0 1-12 12h-46l-18 18 2-18h-18a12 12 0 0 1-12-12v-36a12 12 0 0 1 12-12z" fill="#fff" ${S()}/><text y="13" text-anchor="middle" ${F} font-size="36" fill="#BFAEE3">?!</text></g>`);
// 🏙️ Cờ Tỷ Phú: phố Sài Gòn + xúc xắc + túi tiền
G.typhu = svg(`
<path d="M90 150h230" ${S(0)}/>
<g><rect x="104" y="96" width="46" height="56" rx="4" fill="#FFD273" ${S()}/><path d="M98 98l29-26 29 26z" fill="#FEC5E6" ${S()}/><rect x="120" y="122" width="14" height="30" fill="#2a2340" ${S(3)}/></g>
<g><path d="M168 152v-96l20-30 20 30v96z" fill="#DEB5D7" ${S()}/><path d="M188 26v-18" ${S()}/>${[0, 1, 2, 3, 4, 5].map(i => `<path d="M176 ${66 + i * 14}h24" stroke="#BFAEE3" stroke-width="3"/>`).join('')}</g>
<g><rect x="216" y="80" width="40" height="72" rx="4" fill="#FEE686" ${S()}/>${[0, 1, 2].map(r => [0, 1].map(c => `<rect x="${224 + c * 14}" y="${90 + r * 18}" width="9" height="11" rx="2" fill="#BFAEE3"/>`).join('')).join('')}</g>
${die(292, 86, 44, 14, [5])}
<g transform="translate(300 134)"><path d="M-26 18c-8-22 4-34 14-40l-6-12h36l-6 12c10 6 22 18 14 40z" fill="#FEE686" ${S()}/><path d="M-8 -34l8 6 8-6" ${S()} fill="none"/><text y="12" text-anchor="middle" ${F} font-size="24" fill="${INK}">₫</text></g>`);
// 🏮 Ma Sói: sói hú + nhà làng + đèn lồng
G.masoi = svg(`
<g><rect x="96" y="112" width="58" height="44" fill="#2a2340" ${S()}/><path d="M86 116l39-32 39 32z" fill="#FFD273" ${S()}/><rect x="116" y="128" width="16" height="16" fill="#FEE686" ${S(3)}/></g>
<g transform="translate(212 104)"><path d="M-52 -6l8-58 26 26h36l26-26 8 58-20 36-34 18-34-18z" fill="#BFAEE3" ${S()}/>
<path d="M-40 -50l4 26 14-12zM40 -50l-4 26-14-12z" fill="#DEB5D7"/>
<path d="M-26 -2c8-6 18-6 26 4 8-10 18-10 26-4l-8 30-18 14-18-14z" fill="#DEB5D7"/>
<path d="M-34 -16l18 8M34 -16l-18 8" ${S(3)}/>
<path d="M-30 -8c4-6 12-6 16 0-4 6-12 6-16 0zM30 -8c-4-6-12-6-16 0 4 6 12 6 16 0z" fill="#FEE686" ${S(2.5)}/><circle cx="-22" cy="-8" r="2.5" fill="${INK}"/><circle cx="22" cy="-8" r="2.5" fill="${INK}"/>
<ellipse cy="16" rx="9" ry="6" fill="${INK}"/><path d="M0 22v8M-10 32c4 4 16 4 20 0" fill="none" ${S(3)}/><path d="M-6 33l2 6 3-5M6 33l-2 6-3-5" fill="#fff" ${S(2)}/></g>
<g transform="translate(296 70)"><path d="M0 -40v12" ${S()}/><ellipse rx="22" ry="28" fill="#FEC5E6" ${S()}/><path d="M-22 0h44M-14 -24c-6 16-6 32 0 48M14 -24c6 16 6 32 0 48" stroke="#FEE686" stroke-width="3" fill="none"/><rect x="-10" y="26" width="20" height="8" fill="#FEE686" ${S(3)}/><path d="M0 34v14" stroke="#FEE686" stroke-width="3"/></g>`);
// 魏蜀吳 Tam Quốc: ba lá cờ trận
const flag = (x, c, t, d) => `<g transform="translate(${x} 0)"><path d="M0 162V24" ${S(3)}/><circle cy="20" r="6" fill="#FEE686" ${S(3)}/><path d="M3 30h62c-8 14-8 28 0 42 -8 14-8 28 0 42H3z" fill="${c}" ${S()}/><path d="M3 30h62c-8 14-8 28 0 42" fill="none" stroke="#fff3" stroke-width="3" transform="translate(0 6)"/><text x="30" y="${82 + d}" text-anchor="middle" font-family="'Noto Serif CJK SC','Songti SC','SimSun',serif" font-weight="900" font-size="38" fill="#fff">${t}</text></g>`;
G.tamquoc = svg(flag(110, '#BFAEE3', '魏', 0) + flag(178, '#FEC5E6', '蜀', -6) + flag(246, '#FFD273', '吳', 0));
// 🐪 Lạc đà: kim tự tháp + lạc đà chồng nhau + xúc xắc
const camel = (x, y, c, s = 1, flip = 1) => `<g transform="translate(${x} ${y}) scale(${s * flip} ${s})"><path d="M-40 10c0-14 6-24 16-26 4-16 14-20 20-8 6-10 16-8 20 6l14-8c4-12 10-20 18-20 6 0 8 6 6 10l-8 4-4 20c0 10-6 18-14 18v24h-10v-20h-30v20h-10v-22c-6-2-8-6-8-8z" fill="${c}" ${S()}/><circle cx="44" cy="-40" r="2.5" fill="${INK}"/></g>`;
G.camel = svg(`<path d="M80 160l90-120 90 120z" fill="#FFD273" ${S()}/><path d="M170 40l-26 120M170 40l26 120" stroke="#FFD273" stroke-width="3"/>` + camel(250, 128, '#FEC5E6') + camel(256, 92, '#BFAEE3', .85) + camel(126, 136, '#FEE686', .8, -1) + die(330, 132, 34, -12, [2]));
// 🐴 Cá ngựa: quân ngựa + xúc xắc + cờ đích
const horse = (x, y, c, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-30 50h60l-6-14H-24z" fill="${c}" ${S()}/><path d="M-22 36c-6-22 4-34 10-44-12-2-22 6-28 0-4-6 8-26 22-36l2-12 10 8c22 2 34 22 32 52-2 14-6 24-10 32z" fill="${c}" ${S()}/><circle cx="-6" cy="-24" r="3.5" fill="${INK}"/><path d="M6 -44c10 6 18 16 20 30" fill="none" stroke="#fff6" stroke-width="3" stroke-linecap="round"/></g>`;
G.cangua = svg(horse(150, 96, '#FEC5E6', 1) + horse(236, 104, '#BFAEE3', .78) + die(306, 120, 40, 16, [6]) +
  `<g transform="translate(320 26)"><path d="M0 0v62" ${S()}/><path d="M2 2h40v26H2z" fill="#fff" ${S(3)}/><path d="M2 2h10v9H2zM22 2h10v9H22zM12 11h10v9H12zM32 11h10v8H32zM2 20h10v8H2zM22 20h10v8H22z" fill="${INK}"/></g>`);
// ♟️ Cờ tướng: ba quân cờ gỗ (帥 đỏ, 馬 đen, 炮 đỏ)
const xq = (x, y, r, ch, col, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})"><ellipse cy="${r * .16}" rx="${r}" ry="${r}" fill="#FFD273" ${S()}/><circle r="${r}" fill="#FEE686" ${S()}/><circle r="${r * .78}" fill="none" stroke="${col}" stroke-width="3"/><text y="${r * .36}" text-anchor="middle" font-family="'Noto Serif CJK SC','Songti SC','Noto Serif SC',SimSun,serif" font-weight="900" font-size="${r * 1.05}" fill="${col}">${ch}</text></g>`;
G.cotuong = svg(xq(140, 104, 44, '馬', '#2a2340', -8) + xq(262, 108, 44, '炮', '#FEC5E6', 8) + xq(200, 82, 56, '帥', '#FEC5E6', 0));
// 🎭 Thật hay Thách: hai lá bài "THẬT" và "THÁCH" + chai xoay
const tc = (x, y, rot, bg, t, em) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-52" y="-66" width="104" height="132" rx="16" fill="${bg}" ${S()}/><rect x="-42" y="-56" width="84" height="112" rx="10" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3"/><text y="-8" text-anchor="middle" font-size="44">${em}</text><text y="38" text-anchor="middle" ${F} font-size="23" fill="#fff">${t}</text></g>`;
G.thathaythach = svg(tc(150, 96, -11, '#BFAEE3', 'THẬT', '🤫') + tc(252, 96, 10, '#FEC5E6', 'THÁCH', '🔥') + `<g transform="translate(201 92)"><circle r="23" fill="#FEE686" ${S()}/><text y="10" text-anchor="middle" ${F} font-size="28" fill="${INK}">?</text></g>`);
// 🃏 Bài Tấn: lá tấn 7♠ bị lá chủ Q♥ đè lên + ngôi sao "chủ"
G.baitan = svg(card(165, 98, '7', 's', -12) + card(228, 88, 'Q', 'h', 10) + `<g transform="translate(300 52) rotate(12)"><circle r="28" fill="#FEE686" ${S()}/><text y="12" text-anchor="middle" font-size="34" fill="${INK}">★</text></g>`);
// 🚢 Bắn Tàu: tàu chiến đỏ trên sóng xanh + tâm ngắm vàng + vụ nổ
G.bantau = svg(`<path d="M18 138q40-24 80 0t80 0 80 0 80 0 44-8v18q-40 20-84 8t-80 0-80 0-80 0-40-6z" fill="#BFAEE3" ${S(3)}/><path d="M52 118h252l-30 26H84z" fill="#FEC5E6" ${S(3)}/><path d="M80 94h180l36 24H56z" fill="#FEE686" ${S(3)}/><path d="M118 72h84v22H118z" fill="#FFD273" ${S(3)}/><path d="M140 52h48v20h-48z" fill="#FEE686" ${S(3)}/><path d="M162 32v20m-18 0h36" ${S(3)}/><g transform="translate(300 42)"><circle r="26" fill="#FFD273" ${S(3)}/><circle r="26" fill="none" stroke="#fff" stroke-width="3"/><path d="M0-26v52M-26 0h52" stroke="${INK}" stroke-width="3"/><circle r="7" fill="#FEC5E6" ${S(3)}/></g><g transform="translate(96 46)"><path d="M0-14l4 10 10 2-8 7 2 11-8-6-8 6 2-11-8-7 10-2z" fill="#FFD273" ${S(3)}/><circle r="3" fill="#FFD273"/></g>`);
// 🪀 Ô Ăn Quan: bàn gỗ với 2 Quan đỏ to ở 2 đầu + 10 Dân nhỏ 2 hàng
const oqStone = (x, y, r, col) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" ${S(3)}/><circle cx="${x - r * .3}" cy="${y - r * .35}" r="${r * .28}" fill="#fff" opacity=".45"/>`;
const oqQuan = (x, y) => `<g transform="translate(${x} ${y})"><circle r="21" fill="#FEC5E6" ${S(3)}/><circle r="21" fill="none" stroke="#FFD273" stroke-width="3"/><circle cx="-6" cy="-7" r="5" fill="#fff" opacity=".4"/><text y="8" text-anchor="middle" font-size="20" fill="#FFD273">★</text></g>`;
G.oanquan = svg(`<rect x="18" y="28" width="364" height="124" rx="22" fill="#FFD273" ${S(3)}/><rect x="28" y="38" width="344" height="104" rx="16" fill="none" stroke="#FFD273" stroke-width="3"/>${oqQuan(56, 90)}${oqQuan(344, 90)}${[112, 152, 192, 232, 272].map(x => oqStone(x, 60, 10, '#FFD273')).join('')}${[112, 152, 192, 232, 272].map(x => oqStone(x, 120, 10, '#FFD273')).join('')}`);
// ✖️ Cờ Caro: bàn mini 5×5 + dãy 5 quân X thắng chéo + 3 quân O chặn + huy hiệu "5 QUÂN THẮNG"
G.caro = svg(`
<!-- bàn cờ caro mini 5x5 -->
<rect x="30" y="14" width="212" height="152" rx="12" fill="#FEE686" stroke="#2a2340" stroke-width="3"/>
<g stroke="#FFD273" stroke-width="3">
<line x1="62" y1="14" x2="62" y2="166"/><line x1="104" y1="14" x2="104" y2="166"/><line x1="146" y1="14" x2="146" y2="166"/><line x1="188" y1="14" x2="188" y2="166"/>
<line x1="30" y1="52" x2="242" y2="52"/><line x1="30" y1="90" x2="242" y2="90"/><line x1="30" y1="128" x2="242" y2="128"/>
</g>
<!-- dãy 5 quân X thắng chéo -->
<g stroke="#FEC5E6" stroke-width="3" stroke-linecap="round">
<line x1="44" y1="22" x2="60" y2="38"/><line x1="60" y1="22" x2="44" y2="38"/>
<line x1="86" y1="60" x2="102" y2="76"/><line x1="102" y1="60" x2="86" y2="76"/>
<line x1="128" y1="98" x2="144" y2="114"/><line x1="144" y1="98" x2="128" y2="114"/>
<line x1="170" y1="136" x2="186" y2="152"/><line x1="186" y1="136" x2="170" y2="152"/>
<line x1="212" y1="22" x2="228" y2="38"/><line x1="228" y1="22" x2="212" y2="38"/>
</g>
<!-- quân O chặn -->
<g fill="none" stroke="#BFAEE3" stroke-width="3">
<circle cx="125" cy="33" r="10"/><circle cx="209" cy="71" r="10"/><circle cx="83" cy="147" r="10"/>
</g>
<!-- huy hiệu 5 quân thắng -->
<g transform="translate(306 90)">
<circle r="52" fill="#FFD273" stroke="#2a2340" stroke-width="3"/>
<circle r="52" fill="none" stroke="#fff" stroke-width="3"/>
<text y="14" text-anchor="middle" font-family="Baloo 2, sans-serif" font-size="44" font-weight="800" fill="#FEC5E6">5</text>
<text y="38" text-anchor="middle" font-family="Baloo 2, sans-serif" font-size="15" font-weight="800" fill="#2a2340">QUÂN THẮNG</text>
</g>
`);
// 🏮 Chợ Lớn: ba căn tiệm mái đỏ liền nhau
const nha = (x, w, h, mai, e) => `<g transform="translate(${x} 150)"><rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" rx="6" fill="#FEE686" ${S()}/><path d="M${-w / 2 - 8} ${-h} h${w + 16} l-10 -24 h${-(w - 4)} z" fill="${mai}" ${S()}/><rect x="${-w / 4}" y="-34" width="${w / 2}" height="34" rx="4" fill="#FFD273" ${S()}/><text y="${-h + 36}" text-anchor="middle" font-size="30">${e}</text></g>`;
G.cholon = svg(nha(118, 86, 92, '#FEC5E6', '🍵') + nha(282, 86, 92, '#FFD273', '🥟') + nha(200, 96, 116, '#FFD273', '🏮'));
// 🀄 Tá lả: một phỏm 3 lá liên tiếp
// 🀄 Tứ sắc: bốn thẻ bài dài bốn màu
const tsCard = (x, y, col, ink, ch, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-26" y="-58" width="52" height="116" rx="11" fill="${col}" ${S()}/><text y="16" text-anchor="middle" font-size="42" font-weight="700" fill="${ink}">${ch}</text></g>`;
G.tusac = svg(tsCard(112, 108, '#FEC5E6', '#fff', '將', -16) + tsCard(172, 96, '#FFD273', '#2a2340', '車', -5) + tsCard(232, 96, '#FFD273', '#fff', '馬', 6) + tsCard(292, 108, '#FEE686', '#2a2340', '卒', 17));
G.tala = svg(card(138, 104, '5', 'h', -14) + card(200, 92, '6', 'h', 0) + card(262, 104, '7', 'h', 14));
// ♟️ Cờ vua: mảnh bàn cờ nghiêng + con tốt tự vẽ
G.covua = svg(`<g transform="translate(200 104) rotate(-8)"><rect x="-92" y="-62" width="184" height="124" rx="12" fill="#FEE686" ${S()}/>${[0, 1, 2].flatMap(r => [0, 1, 2, 3].filter(c => (r + c) % 2).map(c => `<rect x="${-92 + c * 46}" y="${-62 + r * 41.3}" width="46" height="41.3" fill="#FFD273"/>`)).join('')}<rect x="-92" y="-62" width="184" height="124" rx="12" fill="none" ${S()}/></g><g transform="translate(200 96)"><path d="M-34 62h68l-8-18h-52z" fill="#fff" ${S()}/><path d="M-18 44c4-22 8-34 6-52h24c-2 18 2 30 6 52z" fill="#fff" ${S()}/><circle cy="-26" r="22" fill="#fff" ${S()}/><path d="M-22 -6h44" ${S()}/></g>`);
// 🎪 Lô tô: ba trái banh số
const lb = (x, y, r, n, col) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="${col}" ${S()}/><circle cx="${-r * .32}" cy="${-r * .36}" r="${r * .2}" fill="#fff" opacity=".8"/><text y="${r * .36}" text-anchor="middle" ${F} font-size="${r * .95}" fill="${INK}">${n}</text></g>`;
G.loto = svg(lb(128, 104, 46, '7', '#FEE686') + lb(272, 104, 46, '90', '#FEE686') + lb(200, 86, 60, '45', '#FEC5E6'));
for (const [k, v] of Object.entries(G)) writeFileSync(OUT + k + '.svg', v);
console.log('Đã vẽ', Object.keys(G).length, 'icon →', OUT);
