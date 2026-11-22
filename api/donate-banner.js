// 🖼️ Ảnh ủng hộ render ĐỘNG theo từng giao dịch (patch -160 v2) — Vercel Edge Function.
// Dùng @vercel/og (Satori): render PNG 1200×400 từ query params, font Be Vietnam Pro
// (có dấu tiếng Việt) load từ chính web. Cây element + font nằm ở donate-banner-tree.js
// (module thuần, test node render thật được bằng satori + resvg — cùng 2 thư viện mà
// ImageResponse dùng bên trong). Không dùng JSX (node --check vẫn pass).
//   /api/donate-banner?name=Minh%20Tr%C6%B0%E1%BB%9Dng&user=minhtruong&amt=50.000%C4%91&ref=123456&code=SEVQR%20GZ%20U000002X%20R123456Z
// Params đều bị cắt ngắn (chống lạm dụng); thiếu thì dùng mặc định. Ảnh là duy nhất theo
// từng claim (ref riêng) nên Discord không cache nhầm ảnh đơn khác. Nếu render lỗi/font
// lỗi thì @vercel/og dùng font mặc định — embed vẫn đủ thông tin ở các field.
import { ImageResponse } from '@vercel/og';
import { bannerTree, loadFonts, cutParam, OG_W, OG_H } from './donate-banner-tree.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const u = new URL(req.url);
  const q = {
    name: cutParam(u.searchParams.get('name'), 30),
    user: cutParam(u.searchParams.get('user'), 30),
    amt: cutParam(u.searchParams.get('amt'), 40),
    ref: cutParam(u.searchParams.get('ref'), 40),
    code: cutParam(u.searchParams.get('code'), 40),
  };
  let fonts = [];
  try { fonts = await loadFonts(); } catch (e) { fonts = []; } /* font lỗi → @vercel/og dùng font mặc định */
  return new ImageResponse(bannerTree(q), { width: OG_W, height: OG_H, fonts });
}
