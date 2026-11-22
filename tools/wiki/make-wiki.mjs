// 📖 Wiki GumballZ — sinh luat/index.html từ dữ liệu THẬT trong repo (patch -146).
// Chạy: node tools/wiki/make-wiki.mjs   (từ thư mục gốc repo)
// Nguồn dữ liệu:
//   - Game (tên/mô tả/nhóm/số người/icon): thẻ .tile ở index.html (trang chủ)
//   - Thành tựu: shared/ui/stats.js (ACHS — 1341 cái, đếm thật lúc sinh)
//   - Danh hiệu: shared/titles.js (ALL_TITLES + GAME_TITLES)
//   - Vật phẩm: shared/js/avatar-rewards.js (FRAMES/NAME_COLORS/BANNERS/WIN_FX/TRACK/LOCKED_PARTS/VIP_TIERS)
//     + shared/ui/wallet.js (COSMETICS/CHEST_TABLE/ITEM_DEFS/giá xu)
//   - Huy hiệu: shared/ui/badges.js (MEDALS + medalHTML — render huy chương thật, không chữ, patch -145)
//   - Điểm danh: server/src/users.js LOGIN_REWARDS (file này import 'cloudflare:workers' nên KHÔNG
//     import được bằng Node — giá trị [20,30,40,50,60,80,100] ghi cứng ở dưới, test wiki146 kiểm tra
//     bằng cách grep file server để 2 bên không lệch)
//   - Mục "Luật mặc định": trích nguyên văn từ luat/index.html cũ (lần đầu), lưu bản sao ở
//     tools/wiki/luat-mac-dinh-snippet.html để chạy lại được sau khi luat/index.html đã là wiki.
// Trang sinh ra là HTML tĩnh hoàn chỉnh (dữ liệu nhúng sẵn, không fetch runtime ngoài mục luật
// mặc định vốn đã fetch luat-mac-dinh.js như trang cũ).
import fs from 'fs';
import { fileURLToPath } from 'url';

const ROOT = new URL('../../', import.meta.url).pathname;
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const LOGIN_REWARDS = [20, 30, 40, 50, 60, 80, 100]; /* chu kỳ điểm danh 7 ngày — khớp server/src/users.js:89 LOGIN_REWARDS */

/* Math.random gieo hạt cố định để huy chương (hạt bay) sinh ra giống nhau mỗi lần chạy */
let _seed = 146;
Math.random = () => { _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 4294967296; };

const stats = await import(new URL('../../shared/ui/stats.js', import.meta.url).href);
const titles = await import(new URL('../../shared/titles.js', import.meta.url).href);
const ar = await import(new URL('../../shared/js/avatar-rewards.js', import.meta.url).href);
const wallet = await import(new URL('../../shared/ui/wallet.js', import.meta.url).href);
const badges = await import(new URL('../../shared/ui/badges.js', import.meta.url).href);

const { GAME_NAMES, ACHS } = stats;
const { ALL_TITLES, GAME_TITLES, GAME_WINS } = titles;
const { FRAMES, NAME_COLORS, BANNERS, WIN_FX, UNLOCK, lockDesc, VIP_TIERS, TRACK, LOCKED_PARTS, FRAME_RING, itemLabel } = ar;
const { COSMETICS, CHEST_TABLE, CHEST_PRICE, DUP_REFUND, ITEM_DEFS, START_XU, WIN_XU, PLAY_XU } = wallet;
const { MEDALS, medalHTML } = badges;

/* ---------- game: thẻ .tile ở trang chủ ---------- */
const CAT_LABEL = { board: '🎲 Cờ bàn', card: '🃏 Game bài', party: '🎉 Tụ tập', other: '✨ Kiểu khác' };
const CAT_ORDER = ['board', 'card', 'party', 'other'];
const homeHtml = fs.readFileSync(ROOT + 'index.html', 'utf8');
const stripTags = s => String(s || '').replace(/<[^>]+>/g, '').trim();
const games = [];
const tileRe = /<a class="tile [^"]*" href="([^"]+)" data-game="([^"]+)" data-cat="([^"]+)" data-min="([^"]*)" data-max="([^"]*)">([\s\S]*?)<\/a>/g;
let tm;
while ((tm = tileRe.exec(homeHtml))) {
  const [, href, slug, cat, min, max, inner] = tm;
  const im = inner.match(/<img class="ic" src="([^"]+)"/);
  const h2 = inner.match(/<h2>([\s\S]*?)<\/h2>/);
  const p = inner.match(/<p>([\s\S]*?)<\/p>/);
  if (!h2 || !p) { console.error('⚠️ tile thiếu h2/p: ' + slug); continue; }
  games.push({ slug, cat, min, max, icon: im ? im[1].replace(/\?v=\d+$/, '') : '', name: stripTags(h2[1]), desc: stripTags(p[1]), href });
}
const gameBySlug = Object.fromEntries(games.map(g => [g.slug, g]));
const players = g => (g.min && g.max) ? (g.min === g.max ? g.min + ' người' : g.min + '–' + g.max + ' người') : '—';

/* ---------- thành tựu: chia theo game / chung ---------- */
const ACH_ALIAS = { bt: 'bantau', oq: 'oanquan', rt: 'ranvathang' }; /* id viết tắt trong stats.js */
const slugOfAch = id => {
  for (const slug of Object.keys(GAME_NAMES)) {
    if (id.startsWith(slug + '_') || id.startsWith(slug + '-') || id.endsWith('_' + slug) || id.endsWith('-' + slug)) return slug;
  }
  for (const [alias, slug] of Object.entries(ACH_ALIAS)) if (id.startsWith(alias + '_')) return slug;
  return '';
};
const achByGame = {}, achGeneral = [];
for (const a of ACHS) {
  const g = slugOfAch(a.id);
  if (g) (achByGame[g] ??= []).push(a); else achGeneral.push(a);
}

/* ---------- vật phẩm: cách nhận ---------- */
function howOf(x) {
  if (!x.id) return 'Mặc định';
  if (x.lock) {
    if (x.lock.startsWith('vip')) {
      const t = VIP_TIERS.find(v => v.id === x.lock);
      return t ? '🏆 Thang VIP: Top ' + t.top + ' liên tục ' + t.days + ' ngày' : lockDesc(x.lock);
    }
    if (x.lock === 'admin') return 'Riêng Chủ web';
    return lockDesc(x.lock);
  }
  if (x.shop) return 'Mua ở Cửa hàng: ' + x.shop + ' xu';
  if (x.chest) return 'Chỉ mở ra từ rương Gacha' + (x.anim ? ' (động, cực hiếm)' : '');
  return '—';
}
const frameRow = f => {
  const ring = FRAME_RING[f.id] || '';
  const sw = ring ? '<span class="fr-ring" style="background:' + esc(ring) + '"></span>' : '<span class="fr-ring none"></span>';
  return '<tr data-name="' + esc(norm(f.name + ' khung ' + howOf(f))) + '"><td>' + sw + esc(f.name) + (f.anim ? ' <span class="tag-anim">động</span>' : '') + '</td><td>' + esc(howOf(f)) + '</td></tr>';
};
const colorRow = c => {
  const css = (NAME_COLORS.find(x => x.id === c.id) || {}).css || '';
  const sw = css ? '<span class="nm-sw" style="' + esc(css) + '">Aa</span>' : '<span class="nm-sw">Aa</span>';
  return '<tr data-name="' + esc(norm(c.name + ' màu tên ' + howOf(c))) + '"><td>' + sw + esc(c.name) + (c.anim ? ' <span class="tag-anim">động</span>' : '') + '</td><td>' + esc(howOf(c)) + '</td></tr>';
};
const bannerRow = b => {
  const css = (BANNERS.find(x => x.id === b.id) || {}).css || '';
  const sw = css ? '<span class="bn-sw" style="background:' + esc(css) + '"></span>' : '<span class="bn-sw"></span>';
  return '<tr data-name="' + esc(norm(b.name + ' banner ' + howOf(b))) + '"><td>' + sw + esc(b.name) + (b.anim ? ' <span class="tag-anim">động</span>' : '') + '</td><td>' + esc(howOf(b)) + '</td></tr>';
};

/* ---------- mục Game ---------- */
const catCount = c => games.filter(g => g.cat === c).length;
const gameCard = g => {
  const iconHtml = g.icon.endsWith('.svg') || g.icon.endsWith('.png')
    ? '<img src="../' + esc(g.icon) + '" alt="" loading="lazy">'
    : '<span class="hub-emoji" aria-hidden="true">🎲</span>';
  return '<article class="hub-card wk-item" data-cat="' + esc(g.cat) + '" data-name="' + esc(norm(g.name + ' ' + g.desc + ' ' + CAT_LABEL[g.cat] + ' ' + players(g))) + '">' +
    '<a class="hub-ic" href="../' + esc(g.slug) + '/huong-dan/" aria-label="Hướng dẫn ' + esc(g.name) + '" tabindex="-1">' + iconHtml + '</a>' +
    '<div class="hub-tx"><h2><a href="../' + esc(g.slug) + '/huong-dan/">' + esc(g.name) + '</a></h2><p>' + esc(g.desc) + '</p>' +
    '<span class="hub-cat">' + esc(CAT_LABEL[g.cat]) + '</span> <span class="hub-pl">' + esc(players(g)) + '</span></div>' +
    '<div class="hub-go"><a class="hub-guide" href="../' + esc(g.slug) + '/huong-dan/">📖 Hướng dẫn</a><a class="hub-play" href="../' + esc(g.slug) + '/">▶ Chơi</a></div></article>';
};
const gamesSection = '<section class="wk-sec" id="wiki-games"><h2>🎲 Game <span class="cnt">' + games.length + ' game</span></h2>' +
  '<p class="sub">Bấm <b>Hướng dẫn</b> để xem luật đầy đủ của từng game, bấm <b>Chơi</b> để vào game ngay. Lọc theo nhóm hoặc gõ tên game vào ô tìm kiếm ở trên.</p>' +
  '<div class="hub-filters" role="group" aria-label="Lọc game theo nhóm">' +
  '<button type="button" data-wk-cat="all" aria-pressed="true">Tất cả · ' + games.length + '</button>' +
  CAT_ORDER.map(c => '<button type="button" data-wk-cat="' + c + '" aria-pressed="false">' + esc(CAT_LABEL[c]) + ' · ' + catCount(c) + '</button>').join('') +
  '</div><div class="hub-grid" id="hub-grid">' + games.map(gameCard).join('') + '</div></section>';

/* ---------- mục Vật phẩm ---------- */
const frames = FRAMES.filter(f => f.id), colors = NAME_COLORS.filter(c => c.id), banners = BANNERS.filter(b => b.id);
const backs = COSMETICS.backs.map(b => ({ ...b, how: b.shop ? 'Mua ở Cửa hàng: ' + b.shop + ' xu' : 'Chỉ mở ra từ rương Gacha' }));
const backRow = b => '<tr data-name="' + esc(norm(b.name + ' lưng bài ' + b.how)) + '"><td><span class="bk-sw">🂠</span>' + esc(b.name) + '</td><td>' + esc(b.how) + '</td></tr>';
const winfxRow = w => '<tr data-name="' + esc(norm(w.name + ' hiệu ứng thắng ' + (w.lock ? lockDesc(w.lock) : ''))) + '"><td>' + esc(w.icon) + ' ' + esc(w.name) + '</td><td>' + esc(w.lock ? lockDesc(w.lock) : (w.id === 'off' ? 'Luôn có sẵn' : 'Mặc định')) + '</td></tr>';
const trackRows = TRACK.map((r, i) => '<tr data-name="' + esc(norm('mốc thưởng ' + (i + 1) + ' ' + itemLabel(r.k, r.v) + ' ' + r.xp)) + '"><td>Mốc ' + (i + 1) + '</td><td>' + esc(itemLabel(r.k, r.v)) + '</td><td>' + r.xp + ' XP</td></tr>').join('');
const partRows = LOCKED_PARTS.map(p => '<tr data-name="' + esc(norm(itemLabel(p.k, p.v) + ' cấp ' + p.lv)) + '"><td>' + esc(itemLabel(p.k, p.v)) + '</td><td>Cấp ' + p.lv + '</td><td>Trúng rương Gacha thì mở sớm hơn cấp</td></tr>').join('');
const itemRows = ITEM_DEFS ? Object.entries(ITEM_DEFS).map(([id, d]) => '<tr data-name="' + esc(norm(d.name + ' ' + d.desc)) + '"><td>' + esc(d.icon) + ' ' + esc(d.name) + '</td><td>' + d.price + ' xu</td><td>' + esc(d.desc) + '</td></tr>').join('') : '';
const itemsSection = '<section class="wk-sec" id="vat-pham"><h2>🖼️ Vật phẩm <span class="cnt">' + (frames.length + colors.length + banners.length + backs.length) + ' món trang trí</span></h2>' +
  '<p class="sub">Khung avatar, màu tên, banner hồ sơ, lưng bài — mua bằng xu, mở rương, cày thành tích hoặc đứng top bảng xếp hạng. Quản trị viên có thể cấp tay hầu hết vật phẩm (trừ món riêng Chủ web và món VIP thang top).</p>' +
  '<h3>🖼️ Khung avatar · ' + frames.length + '</h3><table class="wk-tbl"><thead><tr><th>Khung</th><th>Cách nhận</th></tr></thead><tbody>' + frames.map(frameRow).join('') + '</tbody></table>' +
  '<h3>✍️ Màu tên · ' + colors.length + '</h3><table class="wk-tbl"><thead><tr><th>Màu tên</th><th>Cách nhận</th></tr></thead><tbody>' + colors.map(colorRow).join('') + '</tbody></table>' +
  '<h3>🎏 Banner hồ sơ · ' + banners.length + '</h3><table class="wk-tbl"><thead><tr><th>Banner</th><th>Cách nhận</th></tr></thead><tbody>' + banners.map(bannerRow).join('') + '</tbody></table>' +
  '<h3>🂠 Lưng bài · ' + backs.length + '</h3><table class="wk-tbl"><thead><tr><th>Lưng bài</th><th>Cách nhận</th></tr></thead><tbody>' + backs.map(backRow).join('') + '</tbody></table>' +
  '<h3>🎉 Hiệu ứng khi thắng · ' + WIN_FX.length + '</h3><table class="wk-tbl"><thead><tr><th>Hiệu ứng</th><th>Cách mở</th></tr></thead><tbody>' + WIN_FX.map(winfxRow).join('') + '</tbody></table>' +
  '<h3>🛍️ Vật phẩm hỗ trợ trong trận</h3><table class="wk-tbl"><thead><tr><th>Vật phẩm</th><th>Giá</th><th>Dùng để làm gì</th></tr></thead><tbody>' + itemRows + '</tbody></table>' +
  '<details class="wk-det"><summary>🧸 Lộ trình thưởng nhân vật · ' + TRACK.length + ' mốc (bấm để xem)</summary><p class="sub">Điểm kinh nghiệm = số ván × 10 + số ván thắng × 20. Mỗi mốc mở 1 món của nhân vật.</p><table class="wk-tbl"><thead><tr><th>Mốc</th><th>Món mở</th><th>Cần</th></tr></thead><tbody>' + trackRows + '</tbody></table></details>' +
  '<details class="wk-det"><summary>🔓 Linh kiện nhân vật mở theo cấp · ' + LOCKED_PARTS.length + ' món (bấm để xem)</summary><p class="sub">Lên cấp tự mở linh kiện (cấp = căn bậc 2 của XP/50 + 1, tối đa cấp 10). Trúng rương Gacha thì mở sớm hơn cấp.</p><table class="wk-tbl"><thead><tr><th>Linh kiện</th><th>Mở ở cấp</th><th>Ghi chú</th></tr></thead><tbody>' + partRows + '</tbody></table></details></section>';

/* ---------- mục Thành tựu ---------- */
const achRow = a => '<li class="wk-item ach" data-name="' + esc(norm(a.icon + ' ' + a.name + ' ' + a.desc)) + '"><span class="ach-ic">' + esc(a.icon) + '</span><span><b>' + esc(a.name) + '</b><small>' + esc(a.desc) + '</small></span></li>';
const achGeneralHtml = '<h3>🌟 Thành tựu chung · ' + achGeneral.length + '</h3><ul class="ach-list">' + achGeneral.map(achRow).join('') + '</ul>';
const achGameHtml = Object.keys(GAME_NAMES).map(g => {
  const list = achByGame[g] || [];
  const name = (gameBySlug[g] && gameBySlug[g].name) || GAME_NAMES[g];
  return '<details class="wk-det ach-g" data-gname="' + esc(norm(name)) + '"><summary>' + esc(name) + ' · ' + list.length + ' thành tựu</summary><ul class="ach-list">' + list.map(achRow).join('') + '</ul></details>';
}).join('');
const achSection = '<section class="wk-sec" id="thanh-tuu"><h2>🏆 Thành tựu <span class="cnt">' + ACHS.length + ' thành tựu</span></h2>' +
  '<p class="sub">Thành tựu mở tự động khi chơi — xem tiến độ của mình trong Hồ sơ. Bấm vào từng game để xem thành tựu riêng của game đó. Gõ tên thành tựu vào ô tìm kiếm để lọc nhanh.</p>' +
  achGeneralHtml + '<h3>🎮 Thành tựu theo game</h3>' + achGameHtml + '</section>';

/* ---------- mục Danh hiệu ---------- */
const titleRow = t => '<li class="wk-item" data-name="' + esc(norm(t.icon + ' ' + t.name + ' ' + t.desc)) + '"><span class="ach-ic">' + esc(t.icon) + '</span><span><b>' + esc(t.name) + '</b><small>' + esc(t.desc) + '</small></span></li>';
const gameTitleRow = g => {
  const t = GAME_TITLES[g];
  const name = (gameBySlug[g] && gameBySlug[g].name) || GAME_NAMES[g];
  return '<li class="wk-item" data-name="' + esc(norm(t[0] + ' ' + t[1] + ' ' + name + ' thắng ' + GAME_WINS + ' ván')) + '"><span class="ach-ic">' + esc(t[0]) + '</span><span><b>' + esc(t[1]) + '</b><small>Thắng ' + GAME_WINS + ' ván ' + esc(name) + '</small></span></li>';
};
const titlesSection = '<section class="wk-sec" id="danh-hieu"><h2>🎖️ Danh hiệu <span class="cnt">' + (ALL_TITLES.length + Object.keys(GAME_TITLES).length) + ' danh hiệu</span></h2>' +
  '<p class="sub">Danh hiệu hiện dưới tên người chơi trong phòng, bảng xếp hạng và Hồ sơ. Người chơi tự chọn 1 danh hiệu đã đạt để trưng. Danh hiệu càng oách thì điều kiện càng khó.</p>' +
  '<h3>🌟 Danh hiệu chung · ' + ALL_TITLES.length + '</h3><ul class="ach-list">' + ALL_TITLES.map(titleRow).join('') + '</ul>' +
  '<h3>🎮 Danh hiệu theo game · ' + Object.keys(GAME_TITLES).length + '</h3><p class="sub">Thắng ' + GAME_WINS + ' ván ở game đó là nhận danh hiệu riêng của game.</p><ul class="ach-list">' + Object.keys(GAME_TITLES).map(gameTitleRow).join('') + '</ul></section>';

/* ---------- mục Huy hiệu ---------- */
const BADGE_HOW = {
  owner: 'Tài khoản đang giữ quyền Chủ sảnh — chỉ có 1 người giữ cờ này.',
  adm: 'Quản trị viên (role 2) — do Chủ sảnh cấp quyền.',
  staff: 'Mod (role 1) — do Quản trị cấp quyền, giữ trật tự Sảnh.',
  sup: 'Được Quản trị cấp cờ Nhà Tài Trợ (đã ủng hộ web).',
  vip: 'Được Quản trị cấp cờ VIP.',
  dev: 'Được Quản trị cấp cờ DEV — lập trình viên của web.',
  newbie: 'Tự động khi mới chơi: cấp 1 (dưới 50 XP) và chưa có bậc nào khác.',
};
const BADGE_ORDER = ['owner', 'adm', 'staff', 'sup', 'vip', 'dev', 'newbie'];
const badgeCards = BADGE_ORDER.map(tier => {
  const m = MEDALS[tier];
  return '<div class="bdg-card wk-item" data-name="' + esc(norm('huy hiệu ' + m.label + ' ' + m.title + ' ' + BADGE_HOW[tier])) + '">' +
    '<div class="bdg-show">' + medalHTML(tier, 'mini') + '</div>' +
    '<div><b>' + esc(m.label) + '</b><small>' + esc(m.title) + '</small><small class="how">' + esc(BADGE_HOW[tier]) + '</small></div></div>';
}).join('');
const badgeSection = '<section class="wk-sec" id="huy-hieu"><h2>🏅 Huy hiệu <span class="cnt">7 bậc</span></h2>' +
  '<p class="sub">Huy hiệu là huân chương hiện cạnh tên người chơi — chỉ hiện huy chương, không kèm chữ (rê chuột vào huy chương để xem tên bậc). Một người có thể mang nhiều huy hiệu cùng lúc.</p>' +
  '<div class="bdg-grid">' + badgeCards + '</div></section>';

/* ---------- mục Gacha & Xu ---------- */
const chestRows = CHEST_TABLE.map(e => {
  let items = '';
  if (e.kind === 'xu') items = '🪙 +' + e.amount + ' xu';
  else if (e.kind === 'part') items = e.pool.map(id => { const [k, v] = id.split(':'); return esc(itemLabel(k, v)); }).join(', ');
  else {
    const src = e.kind === 'frame' ? FRAMES : e.kind === 'color' ? NAME_COLORS : e.kind === 'banner' ? BANNERS : COSMETICS.backs;
    items = e.pool.map(id => { const f = src.find(x => x.id === id); return esc(f ? f.name : id); }).join(', ');
  }
  return '<tr data-name="' + esc(norm(e.label + ' ' + items)) + '"><td><b>' + e.w + '%</b></td><td>' + esc(e.label) + (e.rare ? ' <span class="tag-anim">cực hiếm</span>' : '') + '</td><td>' + items + '</td></tr>';
}).join('');
const gachaSection = '<section class="wk-sec" id="gacha"><h2>🎁 Gacha &amp; Xu <span class="cnt">100 xu / rương</span></h2>' +
  '<p class="sub">Xu là tiền ảo trong web — không nạp, không rút, không tiền thật. Rương Gacha chỉ ra đồ trang trí, không pay-to-win.</p>' +
  '<h3>🪙 Kiếm xu bằng cách nào?</h3><ul class="wk-ul">' +
  '<li>Tài khoản mới bắt đầu với <b>' + START_XU + ' xu</b>.</li>' +
  '<li>Chơi 1 ván bất kỳ: <b>+' + PLAY_XU + ' xu</b> · Thắng 1 ván: thêm <b>+' + WIN_XU + ' xu</b> (tổng +12 xu/ván thắng).</li>' +
  '<li>Vật phẩm <b>Nhân đôi xu</b> (30 xu): ván thắng tiếp theo được +20 xu thay vì +10.</li>' +
  '<li>🎁 <b>Điểm danh hằng ngày</b> (đăng nhập rồi bấm nhận, 1 lần/ngày, chuỗi 7 ngày lặp lại): ngày 1: +' + LOGIN_REWARDS[0] + ' · ngày 2: +' + LOGIN_REWARDS[1] + ' · ngày 3: +' + LOGIN_REWARDS[2] + ' · ngày 4: +' + LOGIN_REWARDS[3] + ' · ngày 5: +' + LOGIN_REWARDS[4] + ' · ngày 6: +' + LOGIN_REWARDS[5] + ' · ngày 7: +' + LOGIN_REWARDS[6] + ' xu. Bỏ 1 ngày là chuỗi về lại ngày 1.</li>' +
  '<li>Mở rương trúng giải xu: +50 / +100 / +200 xu. Trúng đồ đã có: hoàn lại <b>' + DUP_REFUND + ' xu</b>.</li></ul>' +
  '<h3>🎁 Tỉ lệ rương Gacha · ' + CHEST_PRICE + ' xu/lần</h3>' +
  '<table class="wk-tbl"><thead><tr><th>Tỉ lệ</th><th>Nhóm đồ</th><th>Có thể trúng</th></tr></thead><tbody>' + chestRows + '</tbody></table>' +
  '<p class="sub">Kỳ vọng xu mỗi rương: giải tiền mặt trung bình 35,0 xu; đã có hết đồ thì hoàn trùng tối đa thêm 13,2 xu — tổng tối đa 48,2 xu, vẫn ít hơn giá 100 xu. Rương luôn là chỗ đốt xu, không lãi xu. <a href="../shop/">Mở Cửa hàng →</a></p>' +
  '<h3>🏆 Vật phẩm VIP — mở bằng chuỗi top bảng xếp hạng</h3><ul class="wk-ul">' +
  VIP_TIERS.map(t => '<li><b>' + esc(t.icon) + ' ' + esc(t.name) + '</b> — đứng Top ' + t.top + ' liên tục ' + t.days + ' ngày. Rớt khỏi top hoặc bỏ 1 ngày không đồng bộ là chuỗi về 0. Món VIP không mua, không mở rương, không cấp tay được.</li>').join('') + '</ul></section>';

/* ---------- mục Luật mặc định: trích nguyên văn từ trang luật cũ ---------- */
const SNIPPET_FILE = ROOT + 'tools/wiki/luat-mac-dinh-snippet.html';
let snippet = '';
const oldLuatPath = ROOT + 'luat/index.html';
const oldLuat = fs.existsSync(oldLuatPath) ? fs.readFileSync(oldLuatPath, 'utf8') : '';
const secStart = oldLuat.indexOf('<section class="hub-sec" id="luat-mac-dinh">');
const secEnd = secStart >= 0 ? oldLuat.indexOf('</section>', secStart) : -1;
const modStart = oldLuat.indexOf('<script type="module">\nconst $ = s =>');
const modEnd = modStart >= 0 ? oldLuat.indexOf('</script>', modStart) : -1;
if (secStart >= 0 && secEnd > secStart && modStart >= 0 && modEnd > modStart) {
  snippet = oldLuat.slice(secStart, secEnd + '</section>'.length) + '\n' + oldLuat.slice(modStart, modEnd + '</script>'.length);
  fs.writeFileSync(SNIPPET_FILE, snippet);
} else if (fs.existsSync(SNIPPET_FILE)) {
  snippet = fs.readFileSync(SNIPPET_FILE, 'utf8');
} else {
  throw new Error('Không tìm thấy mục Luật mặc định trong luat/index.html cũ và không có tools/wiki/luat-mac-dinh-snippet.html');
}
const defaultRulesSection = snippet.replace('<section class="hub-sec" id="luat-mac-dinh">', '<section class="wk-sec" id="luat-mac-dinh">');

/* ---------- CSS ---------- */
const CSS = [
':root{--ink:#241A38;--muted:#6B5E85;--bg:#FFF8EE;--card:#FFFDF9;--line:#E9DCC6;--red:#FF5A60;--yellow:#FACD33;--teal:#2EC5B6;--lav:#B9A6FF;--ok:#1f9d55;--bad:#d63c3c}',
'*{box-sizing:border-box}',
'html{scroll-behavior:smooth}',
'body{margin:0;min-height:100vh;background:var(--bg);color:var(--ink);font:600 16px/1.5 Nunito,system-ui,sans-serif;overflow-x:hidden}',
'.blob{position:fixed;width:44vmax;height:44vmax;border-radius:50%;filter:blur(80px);opacity:.3;z-index:0;pointer-events:none}',
'.b1{background:#FFB98A;left:-14vmax;top:-14vmax}.b2{background:#FFB9CF;right:-14vmax;top:-8vmax}.b3{background:#C9BDF3;left:-8vmax;bottom:-18vmax}.b4{background:#FFE3A3;right:-12vmax;bottom:-16vmax}',
'main{position:relative;z-index:1;max-width:1020px;margin:0 auto;padding:20px 16px 40px}',
'.back{display:inline-flex;align-items:center;min-height:44px;padding:6px 16px;border-radius:999px;background:#FFFDF9;border:2px solid var(--ink);box-shadow:4px 4px 0 rgba(36,26,56,.9);color:var(--ink);text-decoration:none;font-weight:800}',
'h1{font-family:"Bungee","Baloo 2",Nunito,sans-serif;font-size:clamp(36px,8vw,58px);line-height:1.05;margin:18px 0 6px;text-align:center}',
'h1 span{color:var(--red)}',
'.sub{text-align:center;color:var(--muted);margin:0 auto 18px;max-width:680px}',
'.wk-sec .sub{text-align:left;margin:0 0 14px;max-width:none}',
'.wk-search{display:block;width:min(560px,100%);margin:0 auto 12px;padding:12px 20px;border:2px solid var(--ink);border-radius:999px;background:#FFFDF9;color:var(--ink);font:700 16px Nunito,system-ui,sans-serif;box-shadow:4px 4px 0 rgba(36,26,56,.9);outline:none}',
'.wk-search:focus{box-shadow:4px 4px 0 rgba(36,26,56,.9),0 0 0 3px var(--yellow)}',
'nav.jump{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:0 0 22px;padding:10px 4px;background:rgba(255,248,238,.94);border-bottom:2px solid var(--ink)}',
'nav.jump a{display:inline-flex;align-items:center;min-height:40px;padding:6px 14px;border-radius:999px;background:#FFFDF9;border:2px solid var(--ink);color:var(--ink);text-decoration:none;font-weight:800;font-size:14px;box-shadow:2px 2px 0 rgba(36,26,56,.9)}',
'nav.jump a:hover{background:var(--yellow)}',
'.wk-count{text-align:center;color:var(--muted);font-weight:800;font-size:14px;margin:4px 0 16px}',
'.wk-sec{margin-top:38px;scroll-margin-top:70px}',
'.wk-sec>h2{font:400 clamp(24px,5vw,32px)/1.15 "Bungee","Baloo 2",Nunito,sans-serif;margin:0 0 6px}',
'.wk-sec>h2 .cnt{font:800 14px Nunito,sans-serif;color:#fff;background:var(--red);border:2px solid var(--ink);border-radius:999px;padding:2px 10px;vertical-align:middle;box-shadow:2px 2px 0 rgba(36,26,56,.9)}',
'.wk-sec>h3{font:800 19px/1.3 "Baloo 2",Nunito,sans-serif;margin:22px 0 8px}',
'.wk-sec>h3::before{content:"";display:inline-block;width:12px;height:12px;background:var(--teal);border:2px solid var(--ink);border-radius:3px;margin-right:8px}',
'.hub-filters{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:0 0 14px}',
'.hub-filters button{min-height:42px;padding:8px 16px;border-radius:999px;border:2px solid var(--ink);background:#FFFDF9;color:var(--ink);font:800 14px Nunito,sans-serif;cursor:pointer;box-shadow:2px 2px 0 rgba(36,26,56,.9)}',
'.hub-filters button[aria-pressed="true"]{background:var(--yellow)}',
'.hub-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}',
'.hub-card{display:flex;gap:12px;align-items:flex-start;background:#FFFDF9;border:2px solid var(--ink);border-radius:20px;padding:14px;box-shadow:4px 4px 0 rgba(36,26,56,.9)}',
'.hub-card:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 rgba(36,26,56,.9)}',
'.hub-ic{flex:none;display:block}',
'.hub-ic img{width:56px;height:56px;border:2px solid var(--ink);border-radius:14px;background:var(--yellow);padding:4px;display:block}',
'.hub-emoji{width:56px;height:56px;border:2px solid var(--ink);border-radius:14px;background:var(--yellow);display:grid;place-items:center;font-size:30px}',
'.hub-tx{min-width:0;flex:1}',
'.hub-tx h2{margin:0;font:800 18px/1.2 "Baloo 2",Nunito,sans-serif}',
'.hub-tx h2 a{color:var(--ink);text-decoration:none}',
'.hub-tx h2 a:hover{text-decoration:underline}',
'.hub-tx p{margin:4px 0 7px;font-size:14px;line-height:1.45;color:var(--muted)}',
'.hub-cat{display:inline-block;font-size:12px;font-weight:800;background:var(--yellow);border:2px solid var(--ink);border-radius:999px;padding:1px 9px}',
'.hub-pl{display:inline-block;font-size:12px;font-weight:800;background:var(--lav);border:2px solid var(--ink);border-radius:999px;padding:1px 9px}',
'.hub-go{margin-left:auto;display:flex;flex-direction:column;gap:6px;flex:none}',
'.hub-go a{min-height:44px;display:flex;align-items:center;justify-content:center;text-align:center;text-decoration:none;color:var(--ink);border:2px solid var(--ink);border-radius:999px;padding:6px 12px;white-space:nowrap}',
'.hub-play{font:400 13px "Bungee","Baloo 2",Nunito,sans-serif;background:#FFB98A;box-shadow:2px 2px 0 rgba(36,26,56,.9)}',
'.hub-guide{font:800 13px Nunito,sans-serif;background:#fff}',
'.wk-tbl{width:100%;border-collapse:separate;border-spacing:0;background:#FFFDF9;border:2px solid var(--ink);border-radius:16px;overflow:hidden;box-shadow:4px 4px 0 rgba(36,26,56,.9);margin:0 0 8px;font-size:14.5px}',
'.wk-tbl th,.wk-tbl td{text-align:left;padding:9px 12px;border-bottom:1.5px solid var(--line);vertical-align:middle}',
'.wk-tbl thead th{background:var(--yellow);font:800 14px "Baloo 2",Nunito,sans-serif;border-bottom:2px solid var(--ink)}',
'.wk-tbl tbody tr:last-child td{border-bottom:0}',
'.wk-tbl tbody tr:hover td{background:#FFF6DA}',
'.tag-anim{display:inline-block;font-size:11px;font-weight:800;background:var(--lav);border:1.5px solid var(--ink);border-radius:999px;padding:0 7px;vertical-align:middle}',
'.fr-ring{display:inline-block;width:26px;height:26px;border-radius:50%;border:2px solid var(--ink);vertical-align:-7px;margin-right:8px}',
'.fr-ring.none{background:#eee}',
'.nm-sw{display:inline-block;min-width:30px;text-align:center;font-weight:800;border:2px solid var(--ink);border-radius:8px;padding:1px 6px;margin-right:8px;background:#fff}',
'.bn-sw{display:inline-block;width:34px;height:16px;border:2px solid var(--ink);border-radius:6px;vertical-align:-3px;margin-right:8px}',
'.bk-sw{font-size:20px;margin-right:8px}',
'.ach-list{list-style:none;margin:0 0 8px;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:8px}',
'.ach-list li{display:flex;gap:10px;align-items:flex-start;background:#FFFDF9;border:2px solid var(--ink);border-radius:14px;padding:9px 12px;box-shadow:3px 3px 0 rgba(36,26,56,.9);font-size:14.5px}',
'.ach-ic{font-size:22px;line-height:1.2;flex:none}',
'.ach-list b{display:block;font:800 14.5px/1.3 "Baloo 2",Nunito,sans-serif}',
'.ach-list small{display:block;color:var(--muted);font-size:13px;line-height:1.4}',
'.wk-det{margin:0 0 10px;background:#FFFDF9;border:2px solid var(--ink);border-radius:16px;padding:10px 14px;box-shadow:4px 4px 0 rgba(36,26,56,.9)}',
'.wk-det summary{cursor:pointer;font:800 16px "Baloo 2",Nunito,sans-serif;min-height:28px}',
'.wk-det .ach-list{margin-top:10px}',
'.bdg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}',
'.bdg-card{display:flex;gap:14px;align-items:center;background:#FFFDF9;border:2px solid var(--ink);border-radius:18px;padding:14px;box-shadow:4px 4px 0 rgba(36,26,56,.9)}',
'.bdg-show{flex:none;width:64px;height:64px;display:grid;place-items:center}',
'.bdg-card b{display:block;font:800 16px "Baloo 2",Nunito,sans-serif}',
'.bdg-card small{display:block;color:var(--muted);font-size:13.5px;line-height:1.45;margin-top:2px}',
'.bdg-card small.how{color:var(--ink);font-weight:700}',
'.wk-ul{margin:0 0 10px;padding-left:22px;font-size:15px;line-height:1.7}',
'.wk-ul li{margin:4px 0}',
'code{background:#FFF3D6;border-radius:6px;padding:1px 6px;font-size:.92em;word-break:break-word}',
'.status{margin:0 auto 16px;max-width:760px;border-radius:18px;padding:12px 16px;font-weight:800;background:#e8f8ef;color:#145c34;border:2px solid var(--ink);box-shadow:4px 4px 0 rgba(36,26,56,.9)}',
'.status.err{background:#fde9e9;color:#8a1d1d}',
'.status small{display:block;font-weight:600;opacity:.85;word-break:break-word}',
'details.how{margin:0 auto 22px;max-width:760px;background:#FFFDF9;border:2px solid var(--ink);border-radius:18px;padding:10px 16px;box-shadow:4px 4px 0 rgba(36,26,56,.9)}',
'details.how summary{cursor:pointer;font-weight:800;min-height:28px}',
'details.how ol{margin:8px 0 4px;padding-left:22px}details.how li{margin:4px 0}',
'.game{background:var(--card);border:2px solid var(--ink);border-radius:24px;box-shadow:4px 4px 0 rgba(36,26,56,.9);margin:0 0 22px;overflow:hidden;scroll-margin-top:70px}',
'.game h2{margin:0;padding:14px 18px;font-family:"Bungee","Baloo 2",Nunito,sans-serif;font-size:22px;line-height:1.1;background:linear-gradient(90deg,#FFE3A3,#FFFDF9);border-bottom:1.5px solid var(--line);display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline}',
'.game h2 small{font:800 13px Nunito,sans-serif;color:var(--muted)}',
'.note{margin:0;padding:8px 18px;color:var(--muted);font-size:14px;border-bottom:1.5px solid var(--line)}',
'.grp{padding:10px 18px 4px;font-weight:800;color:var(--muted);background:#FFF8EE;border-bottom:1.5px solid var(--line);font-size:14px}',
'.row{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1.4fr);gap:6px 18px;padding:12px 18px;border-bottom:1.5px solid var(--line)}',
'.row:last-child{border-bottom:0}',
'.row .nm b{display:block}',
'.row .nm small{display:block;color:var(--muted);font-size:13px;line-height:1.4}',
'.row .nm code{font-size:11px;color:var(--muted);background:none;padding:0}',
'.vals{display:flex;flex-wrap:wrap;gap:6px;align-content:flex-start}',
'.ch{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:999px;background:#FFF3D6;color:var(--muted);font-size:13px;font-weight:800;border:1.5px solid transparent}',
'.ch.on{background:var(--ink);color:#fff}',
'.ch.on::before{content:"✓"}',
'.rng{font-size:13px;color:var(--muted)}',
'.bad{color:var(--bad);font-size:13px;font-weight:800;flex-basis:100%}',
'.cur{display:inline-flex;align-items:center;padding:4px 12px;border-radius:999px;background:var(--ink);color:#fff;font-size:14px;font-weight:800}',
'.loading{text-align:center;color:var(--muted)}',
'@media (max-width:640px){.row{grid-template-columns:1fr}.game h2{font-size:24px}}',
'@media (max-width:560px){.hub-grid{grid-template-columns:1fr}.hub-card{flex-wrap:wrap}.hub-go{flex-direction:row;width:100%}.hub-go a{flex:1}.bdg-grid{grid-template-columns:1fr}}',
'@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}',
].join('\n');

/* ---------- JS trang: tìm kiếm + lọc nhóm ---------- */
const PAGE_JS = `(function(){var q=document.getElementById('wk-q'),chips=Array.prototype.slice.call(document.querySelectorAll('[data-wk-cat]')),count=document.getElementById('wk-count'),cat='all';
function norm(s){return (s||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');}
function apply(){var t=norm(q.value.trim()),n=0;
var items=Array.prototype.slice.call(document.querySelectorAll('.wk-item'));
items.forEach(function(el){var ok=(t===''||norm(el.getAttribute('data-name')||el.textContent).indexOf(t)>-1);if(el.classList.contains('hub-card')&&cat!=='all')ok=ok&&(el.getAttribute('data-cat')===cat);el.style.display=ok?'':'none';if(ok)n++;});
Array.prototype.slice.call(document.querySelectorAll('details.wk-det')).forEach(function(d){var vis=Array.prototype.slice.call(d.querySelectorAll('.wk-item')).filter(function(x){return x.style.display!=='none';}).length;var hasItems=d.querySelectorAll('.wk-item').length>0;d.style.display=(t===''||vis>0)?'':'none';if(t!=='')d.open=vis>0;});
Array.prototype.slice.call(document.querySelectorAll('.wk-sec')).forEach(function(s){if(t===''){s.style.display='';return;}var vis=Array.prototype.slice.call(s.querySelectorAll('.wk-item')).filter(function(x){return x.style.display!=='none';}).length;s.style.display=vis>0?'':'none';});
count.textContent=t===''?'':n+' mục khớp với “'+q.value.trim()+'”';}
q.addEventListener('input',apply);
chips.forEach(function(b){b.addEventListener('click',function(){cat=b.getAttribute('data-wk-cat');chips.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});apply();});});
apply();})();`;

/* ---------- ráp trang ---------- */
const jumpNav = '<nav class="jump" aria-label="Nhảy tới mục"><a href="#wiki-games">🎲 Game</a><a href="#vat-pham">🖼️ Vật phẩm</a><a href="#thanh-tuu">🏆 Thành tựu</a><a href="#danh-hieu">🎖️ Danh hiệu</a><a href="#huy-hieu">🏅 Huy hiệu</a><a href="#gacha">🎁 Gacha &amp; Xu</a><a href="#luat-mac-dinh">⚙️ Luật mặc định</a></nav>';
const title = 'Wiki GumballZ · ' + games.length + ' game, luật chơi, vật phẩm, thành tựu | GumballZ Boardgame';
const desc = 'Wiki tổng hợp GumballZ Boardgame: luật chơi ' + games.length + ' game, ' + ACHS.length + ' thành tựu, ' + (ALL_TITLES.length + Object.keys(GAME_TITLES).length) + ' danh hiệu, 7 bậc huy hiệu, vật phẩm, tỉ lệ rương Gacha và cách nhận từng món.';
const html = '<!doctype html>\n<html lang="vi" data-ui-sfx="1">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + esc(title) + '</title>\n' +
'<link rel="canonical" href="https://gumballzgames.vercel.app/luat/">\n<meta name="description" content="' + esc(desc) + '">\n' +
'<meta property="og:type" content="website"><meta property="og:url" content="https://gumballzgames.vercel.app/luat/"><meta property="og:site_name" content="GumballZ Boardgame">\n' +
'<meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(desc) + '">\n' +
'<meta property="og:image" content="https://gumballzgames.vercel.app/shared/img/og.jpg?v=4"><meta property="og:locale" content="vi_VN">\n' +
'<meta name="theme-color" content="#FFF8EE">\n' +
'<link rel="icon" href="../favicon.svg?v=3" type="image/svg+xml"><link rel="apple-touch-icon" href="../shared/img/brand/apple-touch-icon.png?v=3"><link rel="manifest" href="../manifest.webmanifest?v=6"><meta name="apple-mobile-web-app-title" content="Wiki GumballZ"><meta name="mobile-web-app-capable" content="yes">\n' +
'<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
'<link href="https://fonts.googleapis.com/css2?family=Bungee&family=Baloo+2:wght@700;800&family=Nunito:wght@600;700;800&display=swap" rel="stylesheet">\n' +
'<style>\n' + CSS + '\n</style>\n' +
'<link rel="stylesheet" href="../shared/ui/shell.css?v=23">\n<link rel="stylesheet" href="../shared/css/footer.css?v=11">\n<link rel="stylesheet" href="../shared/css/badges.css?v=7">\n' +
'<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Wiki GumballZ', inLanguage: 'vi', url: 'https://gumballzgames.vercel.app/luat/', description: desc, publisher: { '@type': 'Organization', name: 'GumballZ Boardgame', url: 'https://gumballzgames.vercel.app/' } }) + '</script>\n</head>\n<body>\n' +
'<div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div><div class="blob b4"></div>\n<main>\n' +
'  <a class="back gumballz-chip" href="../" aria-label="Về trang chủ GumballZ Boardgame" title="Về trang chủ GumballZ Boardgame"><img src="../favicon.svg?v=3" alt="" width="26" height="26"><span>GumballZ</span></a>\n' +
'  <h1>📖 <span>Wiki</span> GumballZ</h1>\n' +
'  <p class="sub">Tất cả mọi thứ về GumballZ Boardgame ở một chỗ: ' + games.length + ' game + luật chơi, ' + ACHS.length + ' thành tựu, ' + (ALL_TITLES.length + Object.keys(GAME_TITLES).length) + ' danh hiệu, 7 bậc huy hiệu, vật phẩm, tỉ lệ rương Gacha và cách nhận từng món.</p>\n' +
'  <input class="wk-search" id="wk-q" type="search" placeholder="🔍 Tìm trong wiki… ví dụ: tỷ phú, khung rồng, chuỗi 10, top 1" aria-label="Tìm trong wiki">\n' +
'  <p class="wk-count" id="wk-count"></p>\n' +
  jumpNav + '\n' +
  gamesSection + '\n' +
  itemsSection + '\n' +
  achSection + '\n' +
  titlesSection + '\n' +
  badgeSection + '\n' +
  gachaSection + '\n' +
  defaultRulesSection + '\n' +
'</main>\n<footer class="gmf"></footer>\n<script src="../shared/ui/footer.js?v=21"></script>\n<script type="module" src="../shared/ui/feedback.js?v=37"></script>\n<script type="module">import "../shared/ui/badges.js?v=7";</script>\n' + /* patch -148: nạp badges.js để tooltip khi nhấn huy chương hoạt động trên trang wiki */
'<script>\n' + PAGE_JS + '\n</script>\n' +
'<script type="module" async src="../shared/ui/feel.js?v=54"></script>\n</body>\n</html>\n';

fs.writeFileSync(ROOT + 'luat/index.html', html);
console.log('✅ Wiki đã sinh: luat/index.html (' + Math.round(html.length / 1024) + ' KB)');
console.log('   game: ' + games.length + ' (board ' + catCount('board') + ' / card ' + catCount('card') + ' / party ' + catCount('party') + ' / other ' + catCount('other') + ')');
console.log('   thành tựu: ' + ACHS.length + ' (chung ' + achGeneral.length + ' / theo game ' + (ACHS.length - achGeneral.length) + ')');
console.log('   danh hiệu: chung ' + ALL_TITLES.length + ' + theo game ' + Object.keys(GAME_TITLES).length + ' = ' + (ALL_TITLES.length + Object.keys(GAME_TITLES).length));
console.log('   vật phẩm: khung ' + frames.length + ' / màu tên ' + colors.length + ' / banner ' + banners.length + ' / lưng bài ' + backs.length + ' / hiệu ứng thắng ' + WIN_FX.length + ' / mốc thưởng ' + TRACK.length + ' / linh kiện cấp ' + LOCKED_PARTS.length);
console.log('   huy hiệu: ' + Object.keys(MEDALS).length + ' bậc · gacha: tổng tỉ lệ ' + CHEST_TABLE.reduce((n, e) => n + e.w, 0) + '% · giá rương ' + CHEST_PRICE + ' xu');
