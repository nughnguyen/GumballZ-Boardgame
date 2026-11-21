// 📅 Thử thách hôm nay (18/11/2026).
// Mỗi ngày (giờ VN) có đúng 4 việc (n/4):
//   1. Cờ thế Cờ tướng (cotuong/js/today.js – giữ chuỗi ngày 🔥, đã có sẵn trong repo),
//   2. Giải đố Cờ vua (localStorage 'covua-daily' – do covua/js/main.js ghi khi giải xong),
//   3. + 4. Thắng N ván ở 2 game chọn theo ngày từ POOL (đánh với máy cũng tính).
// (Các hàng giải thế theo cấp độ Dễ/Trung bình/Khó từng hiện ở thẻ này đã bỏ;
// lối vào cấp độ qua ?pz=de|tb|kho trong cotuong/covua vẫn hoạt động, chỉ không hiện ở trang chủ.)
// Tiến độ thắng ván lưu ở localStorage 'gumballz-quest' = { day: 'YYYY-MM-DD', w: { <game>: số ván đã thắng } }.
// KHÔNG có thưởng xu / vật phẩm – hoàn thành là xong; chuỗi ngày
// Cờ thế / Giải đố Cờ vua là phần thưởng hiển thị duy nhất (🔥 n ngày).
// Module này tự chứa toàn bộ logic + render (renderDaily / mountDaily); KHÔNG tự nối dây
// vào trang chủ – xem cuối file để biết cách nối (cần sửa index.html + shared/ui/stats.js,
// do điều phối viên giữ).
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const KEY = 'gumballz-quest'; /* khóa đã đổi sang tiền tố gumballz- */
const COVUA_KEY = 'covua-daily'; /* khóa chung với covua/js/main.js (nối dây Giải đố hằng ngày); giữ nguyên */
export const dayVN = (t = Date.now()) => new Date(t + 7 * 3600e3).toISOString().slice(0, 10);
/* [mã game, số ván phải thắng, tên hiện, emoji khi không có icon svg] – CHỈ game đã có trong repo.
   POOL có 18 game (thêm sam / daochinh / noitu ngày 18/11/2026). */
export const POOL = [
  ['uno', 1, 'UNÔ', '🃏'], ['tienlen', 1, 'Tiến Lên'], ['caro', 1, 'Cờ caro'], ['cothu', 1, 'Cờ thú'], ['oanquan', 1, 'Ô ăn quan'],
  ['bantau', 1, 'Bắn tàu'], ['tala', 1, 'Tá lả'], ['xidach', 3, 'Xì dách'], ['catte', 1, 'Cát tê'],
  ['meono', 1, 'Mèo Nổ'], ['baitan', 1, 'Bài Tấn'], ['solitaire', 1, 'Xếp bài'], ['cangua', 1, 'Cờ cá ngựa'],
  ['tusac', 1, 'Tứ sắc'], ['bacao', 3, 'Ba Cào'],
  ['sam', 1, 'Sâm lốc'],
  ['daochinh', 1, 'Đảo Chính'],
  ['noitu', 1, 'Nối từ'],
];
const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
/* Chọn 2 game khác nhau của ngày `day` (chuỗi 'YYYY-MM-DD', giờ VN): a = hash('q'+day) % n,
   b = hash('w'+day) % (n-1), nếu b >= a thì b++ → b luôn khác a. Cùng ngày → cùng cặp;
   đổi ngày → cặp khác (xác suất 2 ngày liên tiếp trùng cặp ≈ 1/(n·(n-1)) = 1/210). */
export function picks(day) { const a = hash('q' + day) % POOL.length; let b = hash('w' + day) % (POOL.length - 1); if (b >= a) b++; return [POOL[a], POOL[b]]; }
function prog() { let d = null; try { d = JSON.parse(ls.get(KEY)); } catch (e) {} return d && d.day === dayVN() ? d : { day: dayVN(), w: {} }; }
export function questProgress() { return prog(); }
/* Ghi 1 ván thắng của `game` – chỉ đếm khi game đó nằm trong 2 việc của hôm nay.
   Được gọi từ shared/ui/stats.js record() khi won === true (xem hướng dẫn nối dây cuối file).
   Thắng thừa vẫn đếm (d.w tăng tiếp) nhưng quests() kẹp hiển thị ở mức n. */
export function questWin(game) {
  const d = prog(); if (!picks(d.day).some(p => p[0] === game)) return false;
  d.w[game] = (d.w[game] || 0) + 1; ls.set(KEY, JSON.stringify(d));
  try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('gumballz-quest', { detail: { game, day: d.day, count: d.w[game] } })); } catch (e) {}
  return true;
}
/* Danh sách đúng 4 việc hôm nay; cotuongToday = { no, n, day } từ cotuong/js/today.js, ctDone = đã giải cờ thế hôm nay.
   Mỗi việc: { k, icon, emo, title, sub, href, done }. href tương đối từ thư mục gốc của site. */
export function quests(cotuongToday, ctDone) {
  const day = dayVN(), d = prog(); let cv = {}; try { cv = JSON.parse(ls.get(COVUA_KEY)) || {}; } catch (e) {}
  const L = [];
  if (cotuongToday) L.push({ k: 'cotuong', icon: 'cotuong', title: `Cờ thế #${cotuongToday.no}`, sub: `Cờ tướng · chiếu bí trong ${cotuongToday.n} nước`, href: 'cotuong/?pz=daily', done: !!ctDone });
  L.push({ k: 'covua', icon: 'covua', title: 'Giải đố Cờ vua', sub: 'Mỗi ngày một thế cờ mới', href: 'covua/?pz=daily', done: cv.last === day });
  for (const [g, n, name, emo] of picks(day)) { const have = Math.min(n, d.w[g] || 0); L.push({ k: g, icon: emo ? '' : g, emo, title: `Thắng ${n} ván ${name}`, sub: n > 1 ? `${have}/${n} ván · đánh với máy cũng tính` : 'Đánh với máy cũng tính', href: g + '/', done: have >= n }); }
  return L;
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* Nạp shared/css/daily.css nếu trang chưa có (đường dẫn tính từ module này, đúng với mọi trang). */
export function ensureDailyCss() {
  try {
    if (typeof document === 'undefined') return;
    if (document.querySelector('link[data-daily-css]')) return;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.setAttribute('data-daily-css', '');
    l.href = new URL('../css/daily.css', import.meta.url).href; document.head.appendChild(l);
  } catch (e) {}
}
/* Vẽ thẻ Thử thách hôm nay vào phần tử `el` (thẻ <div class="daily" id="daily"> ở trang chủ).
   streak = chuỗi ngày giải Cờ thế liên tiếp (lấy từ cotuong state().streak). */
export function renderDaily(el, cotuongToday, ctDone, streak = 0) {
  if (!el) return false;
  ensureDailyCss();
  const L = quests(cotuongToday, ctDone), n = L.filter(q => q.done).length;
  el.classList.toggle('alldone', n === L.length);
  el.innerHTML = `<div class="dq-hd"><i>📅</i><b>Thử thách hôm nay</b><small>${n}/${L.length} xong${streak ? ` · 🔥 ${streak} ngày` : ''}</small></div>`
    + `<div class="dq-list">` + L.map(q => `<a class="dq${q.done ? ' done' : ''}" href="${esc(q.href)}">${q.icon ? `<img src="shared/img/icons/${esc(q.icon)}.svg" alt="" width="34" height="34" loading="lazy">` : `<span class="dq-emo">${esc(q.emo || '🎲')}</span>`}<span class="dq-t"><b>${esc(q.title)}</b><small>${esc(q.sub)}</small></span><em>${q.done ? '✅' : 'Chơi ▶'}</em></a>`).join('') + `</div>`;
  el.hidden = false;
  return true;
}
/* Tự chạy đủ: lấy Cờ thế hôm nay từ cotuong/js/today.js rồi vẽ vào `el`; tự vẽ lại khi
   tiến độ 'gumballz-quest' đổi ở tab khác (storage) hoặc cùng tab (sự kiện gumballz-quest).
   Chỉ dùng ở trang chủ (href/icon tương đối từ gốc site). Trả về hàm hủy listener. */
export async function mountDaily(el) {
  if (!el) return () => {};
  let cur = null;
  const draw = async () => {
    try {
      const C = await import('../../cotuong/js/today.js?v=1');
      const t = C.today(), d = C.state(); cur = { t, d };
      renderDaily(el, t, !!d.done[t.day], d.streak || 0);
    } catch (e) { /* cotuong chưa sẵn sàng: để thẻ ẩn, không vỡ trang */ }
  };
  const onStorage = e => { if (e.key === KEY) draw(); };
  const onQuest = () => draw();
  try { window.addEventListener('storage', onStorage); window.addEventListener('gumballz-quest', onQuest); } catch (e) {}
  await draw();
  return () => { try { window.removeEventListener('storage', onStorage); window.removeEventListener('gumballz-quest', onQuest); } catch (e) {} };
}

/* ============ HƯỚNG DẪN NỐI DÂY (do điều phối viên làm, KHÔNG tự sửa các file này) ============
   1. index.html (trang chủ) – thay thẻ <a class="daily" id="daily" href="cotuong/?daily=1">…
      (dòng ~353) bằng: <div class="daily" id="daily" hidden><div class="dq-hd">… (xem mẫu ở trên) HOẶC giữ thẻ rỗng <div class="daily" id="daily" hidden></div> rồi gọi mountDaily
      trong 1 thẻ <script type="module">: import { mountDaily } from './shared/js/daily.js?v=3';
      mountDaily(document.getElementById('daily'));
      Đồng thời: thêm <link rel="stylesheet" href="shared/css/daily.css?v=3"> vào <head>
      (nếu không muốn dựa vào ensureDailyCss tự chèn), và XÓA đoạn script cũ ở dòng ~592
      import('./cotuong/js/today.js?v=1').then(…) vẽ 1 việc Cờ thế (kẻo vẽ đè), và xóa/bỏ
      CSS .daily cũ ở dòng ~197-199 (đã chuyển sang shared/css/daily.css).
   2. shared/ui/stats.js – đầu file thêm: import { questWin } from '../js/daily.js?v=3';
      trong record(), nhánh if (won === true) { … } (dòng ~136) thêm dòng đầu:
      try { questWin(game); } catch (e) {}  → mọi ván thắng (online / vs máy / chung máy)
      đều được tính vào 2 việc thắng-ván của ngày.
   3. covua/js/main.js + covua/index.html – Giải đố Cờ vua hằng ngày CHƯA có
      (chỉ có 30 cờ thế tĩnh, không có nút "Giải đố hôm nay"): cần thêm phần daily – thêm nút <button id="btn-daily">🗓️ Giải đố hôm nay</button>
      vào covua/index.html (sau #btn-puzzle, dòng ~39), thêm dayVN/dailyPz/daily/streakNow/
      drawDaily + startPuzzle(pz, isDaily) + dòng auto-start ?daily=1 vào covua/js/main.js
      (thêm đúng 1 dòng ?daily=1), và ghi
      'covua-daily' khi giải xong (module này đọc đúng khóa đó để tích ✅). Chưa nối dây
      thì việc "Giải đố Cờ vua" vẫn hiện nhưng không bao giờ tích xong.
   ============================================================================================= */
