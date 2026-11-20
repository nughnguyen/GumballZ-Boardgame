// 📖 Trích phần "Hướng dẫn" có sẵn trong từng game (chạy trên máy dev, KHÔNG phải một phần của web) rồi sinh ra:
//   1) shared/tutorials.js        – các bước "Bắt đầu nhanh" (ảnh + chữ) cho màn học chơi nhanh (shared/ui/tutorial.js)
//   2) <game>/huong-dan/index.html – trang luật chơi tĩnh, toàn chữ thật để Google đọc được
// Cần máy chủ tĩnh: python3 -m http.server 8811 (ở thư mục gốc repo). Chạy: node tools/guide/make.mjs [game…]
// Sửa guide.js của game nào thì chạy lại cho game đó, rồi python3 tools/bump.py.
import { createRequire } from 'module';
import fs from 'fs';
import { fileURLToPath } from 'url';
const { chromium } = createRequire(import.meta.url)('playwright');
const WEB = process.env.WEB || 'http://localhost:8811', ROOT = new URL('../../', import.meta.url).pathname;
const ALL = ['bang', 'uno', 'typhu', 'scribble', 'meono', 'tamquoc', 'masoi', 'camel', 'cangua', 'tienlen', 'catte', 'bacao', 'xidach', 'poker', 'solitaire', 'cotuong', 'thathaythach', 'bantau', 'baitan', 'loto', 'covua', 'tala', 'cholon', 'tusac', 'giandiep', 'codam', 'lieng', 'maubinh', 'xito', 'colat', 'domino', 'connect4', 'matthu', 'avalon', 'spyfall', 'sudoku', 'wordle', 'domi', 's2048', 'matchu', 'loveletter', 'sushigo', 'lay6', 'saboteur', 'skull', 'hanabi', 'chan', 'totom', 'carcassonne', 'azul', 'splendor', 'conhay', 'backgammon', 'rummikub', 'quoridor', 'blokus', 'scrabble', 'mastermind', 'ailatrieuphu', 'haithat1gia', 'doanhdong', 'wavelength'];
const only = process.argv.slice(2), games = only.length ? only : ALL;
// tên hiển thị + câu mô tả cho thẻ <meta> (lấy từ trang game)
const EXTRA = JSON.parse(fs.readFileSync(new URL('./extra.json', import.meta.url)));
// phiên bản ?v hiện tại của khung chung – lấy từ một trang có sẵn để trang sinh ra không bị lùi phiên bản
const ref = fs.readFileSync(ROOT + 'tienlen/index.html', 'utf8'), ver = (f, d) => (ref.match(new RegExp(f.replace('.', '\\.') + '\\?v=(\\d+)')) || [0, d])[1];
const V_SHELL = ver('shell.css', 2), V_FEEL = ver('feel.js', 4), V_GUIDE = ver('guidepage.css', 7);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const b = await chromium.launch();
const tutPath = ROOT + 'shared/tutorials.js';
let TUT = {}; try { TUT = JSON.parse(fs.readFileSync(tutPath, 'utf8').replace(/^[\s\S]*?export const TUT = /, '').replace(/;\s*$/, '')); } catch (e) {}

for (const g of games) {
  const p = await (await b.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  await p.goto(`${WEB}/${g}/`); await p.waitForTimeout(1500);
  const meta = await p.evaluate(() => ({ title: document.title, desc: document.querySelector('meta[name=description]')?.content || '' }));
  const name = meta.title.split(/ [–|] /)[0].replace(/ online$/i, '').trim();
  await p.evaluate(() => (document.querySelector('#btn-guide-home') || document.querySelector('#btn-guide')).click()); await p.waitForTimeout(700); /* bấm bằng JS: có game mở sẵn một hộp khác che nút */
  const data = await p.evaluate(async () => {
    const vis = e => { const r = e.getBoundingClientRect(); return r.width > 200 && r.height > 200; };
    const box = () => [...document.querySelectorAll('#modal-box, .modal-box, .guide-box')].filter(vis)[0];
    const TABS = '[data-tab], [data-gt], [data-g], .tabs button, .g-tabs button';
    const KEEP = new Set(['H2', 'H3', 'H4', 'P', 'UL', 'OL', 'LI', 'B', 'I', 'EM', 'STRONG', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'FIGURE', 'FIGCAPTION', 'IMG', 'BR', 'SECTION', 'SMALL']);
    const clean = root => {
      const c = root.cloneNode(true);
      c.querySelectorAll('svg, button, input, select, script, style, canvas, .tabs, .g-tabs, .g-toc, .close-x, .m-btns, .btns, .mbtns, [hidden]').forEach(e => e.remove());
      c.querySelectorAll('img').forEach(e => { if (!e.classList.contains('gp-img')) e.remove(); });
      const walk = el => {
        for (const ch of [...el.children]) walk(ch);
        if (el === c) return;
        if (!KEEP.has(el.tagName)) { const block = /^(DIV|DETAILS|SUMMARY|ARTICLE|HEADER|FOOTER|DL|DT|DD)$/.test(el.tagName); const f = document.createDocumentFragment(); if (block) f.append(' '); while (el.firstChild) f.append(el.firstChild); if (block) f.append(document.createElement('br')); el.replaceWith(f); return; }
        const keep = el.tagName === 'IMG' ? ['src', 'width', 'height', 'alt'] : el.tagName === 'SECTION' && el.classList.contains('gp-quick') ? ['class'] : el.tagName === 'OL' && el.classList.contains('gp-steps') ? ['class'] : ['colspan', 'rowspan'];
        for (const a of [...el.attributes]) if (!keep.includes(a.name)) el.removeAttribute(a.name);
        if (el.tagName === 'IMG') el.setAttribute('loading', 'lazy');
      };
      walk(c);
      return c.innerHTML.replace(/(\s*<br>\s*){2,}/g, '<br>').replace(/^\s*(<br>\s*)+|(\s*<br>)+\s*$/g, '').replace(/[ \t]+\n/g, '\n').trim();
    };
    const steps = () => [...box().querySelectorAll('.gp-steps > li')].map(li => { const im = li.querySelector('img.gp-img'); const t = li.querySelector('.gp-txt'); return { img: im ? im.getAttribute('src') : null, w: im ? +im.getAttribute('width') : 0, h: im ? +im.getAttribute('height') : 0, alt: im ? im.alt : '', html: t ? t.innerHTML.trim() : '' }; });
    const n = box().querySelectorAll(TABS).length, out = { quick: steps(), tabs: [] };
    if (!n) { out.tabs.push({ t: '', html: clean(box()) }); return out; }
    for (let i = 0; i < n; i++) {
      const t = box().querySelectorAll(TABS)[i], label = t.textContent.trim();
      if (/Có gì mới/.test(label)) continue;
      t.click(); await new Promise(r => setTimeout(r, 250));
      out.tabs.push({ t: label, html: clean(box()) });
    }
    return out;
  });
  await p.context().close();

  // ---- 1) dữ liệu màn học chơi nhanh ----
  const x = EXTRA[g] || {};
  const steps = (x.steps || data.quick).map(s => ({ ...s, img: s.img || null }));
  TUT[g] = { name, ...(x.cta !== undefined ? { cta: x.cta } : {}), steps };

  // ---- 2) trang luật chơi tĩnh ----
  let body = data.tabs.map(tb => (tb.t ? `<h2>${esc(tb.t)}</h2>\n` : '') + tb.html).join('\n\n');
  body = body.replace(/<h2>📖[^<]*<\/h2>/g, '').replace(/src="img\//g, 'src="../img/');
  const url = `https://gumballzgames.vercel.app/${g}/huong-dan/`, title = `Cách chơi ${name} – luật và hướng dẫn | GumballZ`;
  const desc = (x.desc || `Luật ${name} đầy đủ bằng tiếng Việt, có hình minh hoạ từng bước. ` + meta.desc).slice(0, 300);
  const others = ALL.filter(o => o !== g).map(o => `<a href="../../${o}/huong-dan/">${esc((TUT[o] && TUT[o].name) || o)}</a>`).join(' · ');
const FOOT = `<footer class=\"gmf\">\n<style>\n.gmf{margin:40px 0 0;background:#FFF8EE;color:#4A3E5C;font:600 15px/1.6 Nunito,system-ui,sans-serif}\n.gmf a{color:#4A3E5C}\n.gmf-band{background:#FFE3A3;border-top:3px solid #4A3E5C;border-bottom:3px solid #4A3E5C}\n.gmf-band-in{max-width:1020px;margin:0 auto;padding:26px 18px;display:flex;align-items:center;gap:24px;justify-content:space-between}\n.gmf-band h2{margin:0;font:400 30px/1.15 \"Bungee\",\"Baloo 2\",Nunito,sans-serif;letter-spacing:.5px}\n.gmf-band p{margin:6px 0 0;font-size:15px;font-weight:800}\n.gmf-cta{flex:none;display:inline-flex;align-items:center;justify-content:center;min-height:56px;padding:12px 30px;border-radius:999px;background:#FFB98A;color:#4A3E5C;text-decoration:none;font:400 17px/1.2 \"Bungee\",\"Baloo 2\",Nunito,sans-serif;border:3px solid #4A3E5C;box-shadow:4px 4px 0 rgba(74,62,92,.18);transition:background .15s ease,transform .15s ease,box-shadow .15s ease}\n.gmf-cta:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 rgba(74,62,92,.18)}\n.gmf-cta:active{transform:translate(2px,2px);box-shadow:1px 1px 0 rgba(74,62,92,.18)}\n.gmf-in{max-width:1020px;margin:0 auto;padding:36px 18px 10px;display:grid;grid-template-columns:1.6fr 1fr 1fr;gap:16px 36px}\n.gmf-logo{display:flex;align-items:center;gap:10px;text-decoration:none;transition:transform .15s ease}\n.gmf-logo:hover{transform:translateY(-2px)}\n.gmf-logo svg{width:56px;height:56px;flex:none;transition:transform .15s ease}\n.gmf-logo:hover svg{transform:rotate(8deg)}\n.gmf-name{font:400 22px/1.15 \"Bungee\",\"Baloo 2\",Nunito,sans-serif;letter-spacing:.5px;color:#4A3E5C}\n.gmf-name em{display:block;font-style:normal;font-size:11px;letter-spacing:5px;color:#4A3E5C;background:#FFB98A;border-radius:999px;padding:2px 10px;margin-top:4px;width:max-content}\n.gmf-brand p{margin:14px 0 16px;font-size:14px;font-weight:700;color:#8B7E9E;max-width:340px}\n.gmf-chips{display:flex;flex-wrap:wrap;gap:8px}\n.gmf-chips a{display:inline-flex;align-items:center;min-height:44px;padding:8px 16px;border-radius:999px;background:#FFFDF9;border:2px solid #4A3E5C;box-shadow:2px 2px 0 rgba(74,62,92,.14);text-decoration:none;font-size:14px;font-weight:800;transition:background .15s ease,transform .15s ease,box-shadow .15s ease}\n.gmf-chips a:hover{background:#ABE0C6;transform:translate(-1px,-1px);box-shadow:3px 3px 0 rgba(74,62,92,.14)}\n.gmf-chips a:active{transform:translate(1px,1px);box-shadow:1px 1px 0 rgba(74,62,92,.14)}\n.gmf h3{margin:4px 0 8px;font:400 14px/1.3 \"Bungee\",\"Baloo 2\",Nunito,sans-serif;color:#4A3E5C;letter-spacing:.5px;display:inline-block;background:#FFB9CF;border-radius:999px;padding:4px 12px}\n.gmf nav a{display:flex;align-items:center;min-height:44px;padding:0 12px;border-radius:999px;text-decoration:none;font-weight:700;transition:background .15s ease,transform .15s ease}\n.gmf nav a:hover{background:#AFD8F3;transform:translateY(-1px);text-decoration:none}\n.gmf-bot{max-width:1020px;margin:14px auto 0;padding:12px 18px 20px;border-top:1px solid rgba(74,62,92,.14);display:flex;flex-wrap:wrap;gap:2px 20px;justify-content:space-between;font-size:13.5px;font-weight:700;color:#8B7E9E}\n.gmf-note{flex-basis:100%;font-size:12.5px;font-weight:600;color:#8B7E9E}\n@media(max-width:760px){.gmf-band-in{flex-direction:column;align-items:flex-start;gap:16px}.gmf-cta{width:100%}.gmf-in{grid-template-columns:1fr 1fr}.gmf-brand{grid-column:1/-1}}\n@media(max-width:430px){.gmf-band h2{font-size:24px}.gmf-in{grid-template-columns:1fr}}\n</style>\n<div class=\"gmf-band\"><div class=\"gmf-band-in\"><div><h2>SẴN SÀNG CHƠI CHƯA?</h2><p>51 game · chơi online cùng bạn bè, miễn phí, không cần cài đặt.</p></div><a class=\"gmf-cta\" href=\"../../#games\">▶ Chơi ngay</a></div></div>\n<div class=\"gmf-in\">\n<div class=\"gmf-brand\"><a class=\"gmf-logo\" href=\"../../\" aria-label=\"Về trang chủ GumballZ Boardgame\"><svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" width=\"56\" height=\"56\" aria-hidden=\"true\"><rect x=\"4\" y=\"4\" width=\"56\" height=\"56\" rx=\"16\" fill=\"#FFD98E\" stroke=\"#4A3E5C\" stroke-width=\"3\"/><circle cx=\"32\" cy=\"35\" r=\"16\" fill=\"#FFB9CF\" stroke=\"#4A3E5C\" stroke-width=\"3\"/><path d=\"M22 24 Q25 21 29 20.5\" fill=\"none\" stroke=\"#fff\" stroke-width=\"3\" stroke-linecap=\"round\" opacity=\".85\"/><circle cx=\"25.5\" cy=\"31\" r=\"2.6\" fill=\"#4A3E5C\"/><circle cx=\"38.5\" cy=\"31\" r=\"2.6\" fill=\"#4A3E5C\"/><path d=\"M25 38 Q32 44.5 39 38\" fill=\"none\" stroke=\"#4A3E5C\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M14 18 Q18 12 25 11\" fill=\"none\" stroke=\"#fff\" stroke-width=\"3\" stroke-linecap=\"round\" opacity=\".85\"/><circle cx=\"48\" cy=\"15\" r=\"4.5\" fill=\"#C9BDF3\" stroke=\"#4A3E5C\" stroke-width=\"2.5\"/><circle cx=\"49\" cy=\"49\" r=\"3.5\" fill=\"#ABE0C6\" stroke=\"#4A3E5C\" stroke-width=\"2.5\"/></svg><span class=\"gmf-name\">GUMBALLZ<em>BOARDGAME</em></span></a>\n<p>Board game &amp; game bài tiếng Việt — chơi online cùng bạn bè, miễn phí, không cần cài đặt.</p>\n<div class=\"gmf-chips\"><a href=\"#\" data-feedback=\"\">💌 Góp ý / báo lỗi</a><a href=\"#\" data-donate>☕ Ủng hộ chủ web</a><a href=\"https://www.facebook.com/hungnq188.2k5/\" target=\"_blank\" rel=\"noopener\">Facebook</a><a href=\"https://zalo.me/0388205003\" target=\"_blank\" rel=\"noopener\">Zalo: 0388205003</a></div></div>\n<nav aria-label=\"Khám phá\"><h3>Khám phá</h3><a href=\"../../\">Trang chủ</a><a href=\"../../sanh/\">Sảnh chung</a><a href=\"#\" data-foot-rank>🏆 Xếp hạng</a><a href=\"../../luat/\">Luật chơi</a></nav>\n<nav aria-label=\"Trợ giúp\"><h3>Trợ giúp</h3><a href=\"../../gioi-thieu/\">Giới thiệu</a><a href=\"../../credits/\">Credits</a><a href=\"../../terms/\">Điều khoản</a><a href=\"../../privacy/\">Bảo mật</a></nav>\n</div>\n<div class=\"gmf-bot\"><span>© 2026 GumballZ Boardgame</span><span class=\"gmf-note\">Dự án fan-made phi thương mại · Game bài chỉ chơi bằng chip ảo, không cá cược tiền thật · Không liên kết với dV Giochi, Mattel, VNG/ZingPlay, Yoka Games hay Exploding Kittens.</span></div>\n<script type=\"module\" src=\"../../shared/ui/feedback.js?v=34\"></script>\n<script type=\"module\">document.querySelectorAll('[data-foot-rank]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();import('../../shared/ui/leaderboard.js?v=31').then(m=>m.openLeaderboard()).catch(()=>{location.href='../../';});}));</script>\n</footer>`;
  const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:url" content="${url}"><meta property="og:site_name" content="GumballZ Boardgame">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="https://gumballzgames.vercel.app/shared/img/og/${g}.jpg"><meta property="og:locale" content="vi_VN">
<meta name="theme-color" content="#1B1425">
<link rel="icon" href="../../favicon.svg?v=1" type="image/svg+xml"><link rel="apple-touch-icon" href="../../shared/img/brand/apple-touch-icon.png?v=1">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bungee&family=Baloo+2:wght@700;800&family=Nunito:wght@600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../shared/ui/shell.css?v=${V_SHELL}">
<link rel="stylesheet" href="../../shared/ui/guidepage.css?v=${V_GUIDE}">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: `Cách chơi ${name}`, inLanguage: 'vi', description: desc, mainEntityOfPage: url, image: `https://gumballzgames.vercel.app/shared/img/og/${g}.jpg`, publisher: { '@type': 'Organization', name: 'GumballZ Boardgame', url: 'https://gumballzgames.vercel.app/' } })}</script>
</head>
<body>
<header class="gp-top"><a class="gumballz-chip" href="../../" aria-label="Về trang chủ GumballZ"><img src="../../favicon.svg?v=1" alt="" width="26" height="26"><b>GumballZ</b></a><a class="gp-play" href="../">▶ Chơi ${esc(name)}</a></header>
<main class="gp-main">
<nav class="gp-crumb"><a href="../../">Trang chủ</a> › <a href="../">${esc(name)}</a> › Cách chơi</nav>
<h1>Cách chơi ${esc(name)}</h1>
<p class="gp-lead">${esc(meta.desc)}</p>
<p><a class="gp-cta" href="../">▶ Chơi ${esc(name)} ngay – miễn phí, không cần cài đặt</a></p>
<article class="gp-body">
${body}
</article>
<p><a class="gp-cta" href="../">▶ Vào chơi ${esc(name)}</a></p>
<nav class="gp-more"><h2>Luật các game khác</h2><p>${others}</p></nav>
</main>
${FOOT}
<script type="module" async src="../../shared/ui/feel.js?v=${V_FEEL}"></script>
</body>
</html>
`;
  fs.mkdirSync(`${ROOT}${g}/huong-dan`, { recursive: true });
  fs.writeFileSync(`${ROOT}${g}/huong-dan/index.html`, html);
  console.log(`✅ ${g.padEnd(13)} ${name} · ${steps.length} bước nhanh · ${data.tabs.length} mục · ${Math.round(body.replace(/<[^>]+>/g, '').length / 100) / 10}k chữ`);
}
await b.close();
fs.writeFileSync(tutPath, `// Tự sinh bởi tools/guide/make.mjs – ĐỪNG sửa tay. Các bước "Bắt đầu nhanh" của từng game cho màn học chơi (shared/ui/tutorial.js).\nexport const TUT = ${JSON.stringify(TUT, null, 1)};\n`);
