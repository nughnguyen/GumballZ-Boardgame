// 🖼️ Ảnh ủng hộ render ĐỘNG theo từng giao dịch (patch -160 v2) — Vercel Serverless Function (Node runtime).
// Dùng satori + @resvg/resvg-js TRỰC TIẾP, không qua @vercel/og:
//  - bản Edge của @vercel/og bị Vercel từ chối lúc build ("Edge Function referencing
//    unsupported modules: @vercel: module" — deploy 5aee6c2 failed);
//  - bản Node của @vercel/og build được nhưng crash lúc gọi (FUNCTION_INVOCATION_FAILED —
//    dynamic require "fs" bên trong nó; deploy 227a9002).
// satori + resvg là đúng 2 thư viện ImageResponse dùng bên trong, và đã render thật được
// dưới Node thuần (test mục 11 trong discord160-test). Cây element + font nằm ở
// donate-banner-tree.js (module thuần). Không dùng JSX (node --check vẫn pass).
//   /api/donate-banner?name=Minh%20Tr%C6%B0%E1%BB%9Dng&user=minhtruong&amt=50.000%C4%91&ref=123456&code=SEVQR%20GZ%20U000002X%20R123456Z
// Params đều bị cắt ngắn (chống lạm dụng); thiếu thì dùng mặc định. Ảnh là duy nhất theo
// từng claim (ref riêng) nên Discord không cache nhầm ảnh đơn khác. Nếu render lỗi/font
// lỗi thì trả 500 để Discord dùng field text (embed vẫn đủ thông tin).
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { bannerTree, loadFonts, cutParam, OG_W, OG_H } from './donate-banner-tree.js';

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
  try { fonts = await loadFonts(); } catch (e) { fonts = []; } /* font lỗi → satori dùng font mặc định */
  const svg = await satori(bannerTree(q), { width: OG_W, height: OG_H, fonts });
  const png = new Resvg(svg).render().asPng();
  return new Response(png, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } });
}
