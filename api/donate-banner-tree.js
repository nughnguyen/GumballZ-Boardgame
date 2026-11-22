// 🌳 Cây element + font cho ảnh ủng hộ động (patch -160 v2) — module THUẦN, không import
// @vercel/og, để test node render thật được bằng satori + resvg (cùng 2 thư viện mà
// ImageResponse dùng bên trong). api/donate-banner.js import từ đây.
export const OG_W = 1200, OG_H = 400;
const INK = '#241A38', RED = '#FF5A60', YELLOW = '#FACD33', CREAM = '#FFF8EE', WHITE = '#FFFFFF';

export const FONT_BASE = () => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.OG_FONT_BASE) return String(process.env.OG_FONT_BASE).replace(/\/$/, '');
  } catch (e) {}
  return 'https://gumballzgames.vercel.app';
};
let fontsCache = null;
export async function loadFonts() {
  if (fontsCache) return fontsCache;
  const base = FONT_BASE();
  const [regular, bold] = await Promise.all([
    fetch(base + '/shared/fonts/BeVietnamPro-Regular.ttf').then(async (r) => { if (!r.ok) throw new Error('regular font ' + r.status); return r.arrayBuffer(); }),
    fetch(base + '/shared/fonts/BeVietnamPro-Bold.ttf').then(async (r) => { if (!r.ok) throw new Error('bold font ' + r.status); return r.arrayBuffer(); }),
  ]);
  fontsCache = [
    { name: 'Be Vietnam Pro', data: regular, weight: 400, style: 'normal' },
    { name: 'Be Vietnam Pro', data: bold, weight: 700, style: 'normal' },
  ];
  return fontsCache;
}

export const cutParam = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const el = (type, props, ...children) => {
  const flat = children.flat(2).filter((c) => c !== null && c !== undefined && c !== false);
  return { type, props: { ...(props || {}), children: flat.length <= 1 ? flat[0] : flat } };
};

export function bannerTree(q) {
  const name = cutParam(q.name, 30) || 'Ẩn danh';
  const user = cutParam(q.user, 30);
  const amt = cutParam(q.amt, 40);
  const ref = cutParam(q.ref, 40);
  const code = cutParam(q.code, 40);
  const nameSize = name.length > 24 ? 40 : name.length > 16 ? 50 : 60;
  const squares = [];
  for (let i = 0; i < 25; i++) squares.push(el('div', { style: { width: 48, height: 48, backgroundColor: i % 2 === 0 ? RED : YELLOW } }));
  return el('div', { style: { width: OG_W, height: OG_H, backgroundColor: CREAM, fontFamily: 'Be Vietnam Pro', display: 'flex', flexDirection: 'column', border: '6px solid ' + INK, boxSizing: 'border-box' } },
    el('div', { style: { display: 'flex', flexDirection: 'row', height: 48, borderBottom: '4px solid ' + INK } }, ...squares),
    el('div', { style: { display: 'flex', flexDirection: 'row', flex: 1, padding: '18px 36px', gap: 30, alignItems: 'center' } },
      /* tách cà phê vẽ bằng div */
      el('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 190 } },
        el('div', { style: { display: 'flex', flexDirection: 'row', gap: 26, marginBottom: 4 } },
          el('div', { style: { width: 6, height: 34, backgroundColor: INK, borderRadius: 3, transform: 'rotate(-14deg)' } }),
          el('div', { style: { width: 6, height: 34, backgroundColor: INK, borderRadius: 3, transform: 'rotate(14deg)' } }),
        ),
        el('div', { style: { width: 170, height: 118, backgroundColor: WHITE, border: '6px solid ' + INK, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' } },
          el('div', { style: { position: 'absolute', top: -14, left: 0, width: 170, height: 36, backgroundColor: YELLOW, border: '5px solid ' + INK, borderRadius: '50%' } }),
          el('div', { style: { position: 'absolute', top: 34, right: -26, width: 46, height: 64, border: '6px solid ' + INK, borderRadius: '50%' } }),
          el('div', { style: { fontSize: 52, fontWeight: 700, color: INK } }, 'GZ'),
        ),
        el('div', { style: { width: 200, height: 14, backgroundColor: WHITE, border: '5px solid ' + INK, borderRadius: 7, marginTop: 12 } }),
      ),
      /* chữ */
      el('div', { style: { display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, gap: 5 } },
        el('div', { style: { display: 'flex', flexDirection: 'row', fontSize: 44, fontWeight: 700 } },
          el('div', { style: { color: RED } }, 'ỦNG HỘ '),
          el('div', { style: { color: INK } }, 'GUMBALLZ'),
        ),
        el('div', { style: { fontSize: nameSize, fontWeight: 700, color: INK, lineHeight: 1.05 } }, name),
        el('div', { style: { display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 12 } },
          amt ? el('div', { style: { fontSize: 52, fontWeight: 700, color: RED } }, amt) : null,
          user ? el('div', { style: { fontSize: 28, fontWeight: 400, color: INK } }, '@' + user) : null,
        ),
        code ? el('div', { style: { alignSelf: 'flex-start', backgroundColor: YELLOW, border: '3px solid ' + INK, borderRadius: 10, padding: '6px 14px', fontSize: 27, fontWeight: 700, color: INK } }, code) : null,
        el('div', { style: { fontSize: 25, fontWeight: 400, color: INK, opacity: 0.75 } }, 'Cảm ơn bạn đã ủng hộ GumballZ Boardgame'),
      ),
    ),
  );
}
