// 🏆 Trang Bảng xếp hạng riêng (patch -150) + các top phụ (patch -152): vẽ bảng vào #rk-root bằng logic chung
// của leaderboard.js, vẽ 4 top phụ (chơi nhiều / tỉ lệ thắng / Cờ Tỷ Phú / Cờ Tướng) vào #rk-subs.
// Deep link: ?game=<slug> mở bảng của game đó (vd. từ Sảnh / trang game gọi openLeaderboard(game) cũ).
// Patch -156 (user dặn 2026-11-22): chọn 1 game cụ thể thì trang CHỈ HIỆN bảng game đó — ẩn luôn
// mục 4 top phụ; chọn "Tất cả game" thì hiện lại.
// Patch -158: #rk-subs đứng TRONG #rk-root, SAU .rk-layout (dưới cả 2 cột) — bục/sidebar không bị
// chèn vào .rk-box nữa; tab dính (.rk-stick) chỉ giữ trong phạm vi bảng chính rồi nhả khi cuộn qua.
import { mountLeaderboardPage, mountSubTops } from '../../shared/ui/leaderboard.js?v=39';
const q = new URLSearchParams(location.search);
const ctl = mountLeaderboardPage(document.getElementById('rk-root'), q.get('game') || 'all');
const subs = document.getElementById('rk-subs');
const root = document.getElementById('rk-root');
if (subs && root) root.appendChild(subs);
mountSubTops(subs, ctl);
/* ẩn/hiện 4 top phụ theo game đang chọn: game cụ thể → chỉ bảng game đó; "all" → bảng chính + top phụ */
const sel = document.querySelector('.rk-sel');
function toggleSubs() {
  if (subs) subs.style.display = sel && sel.value !== 'all' ? 'none' : '';
}
if (sel) sel.addEventListener('change', toggleSubs);
if (ctl && ctl.setBoard) { /* deep link / bấm top phụ đổi game thì đồng bộ lại trạng thái top phụ */
  const origSetBoard = ctl.setBoard;
  ctl.setBoard = (g, b) => { origSetBoard(g, b); toggleSubs(); };
}
toggleSubs();
