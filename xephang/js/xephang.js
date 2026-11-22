// 🏆 Trang Bảng xếp hạng riêng (patch -150) + các top phụ (patch -152): vẽ bảng vào #rk-root bằng logic chung
// của leaderboard.js, vẽ 4 top phụ (chơi nhiều / tỉ lệ thắng / Cờ Tỷ Phú / Cờ Tướng) vào #rk-subs.
// Deep link: ?game=<slug> mở bảng của game đó (vd. từ Sảnh / trang game gọi openLeaderboard(game) cũ).
// Patch -156 (user dặn 2026-11-22): chọn 1 game cụ thể thì trang CHỈ HIỆN bảng game đó — ẩn luôn
// mục 4 top phụ; chọn "Tất cả game" thì hiện lại.
import { mountLeaderboardPage, mountSubTops } from '../../shared/ui/leaderboard.js?v=38';
const q = new URLSearchParams(location.search);
const ctl = mountLeaderboardPage(document.getElementById('rk-root'), q.get('game') || 'all');
// Đưa các top phụ VÀO TRONG .rk-box: position:sticky của .rk-stick chỉ giữ trong phạm vi cha .rk-box —
// nếu #rk-subs đứng ngoài, hộp BXH hết ở cuối bảng chính và tab bị đẩy lên theo khi cuộn qua bảng.
// (buildBoard chỉ set root.innerHTML 1 lần, các lần fetch sau chỉ đổi .rk-list/.rk-foot nên nút này không bị xoá.)
const subs = document.getElementById('rk-subs');
const box = document.querySelector('#rk-root .rk-box');
if (subs && box) box.appendChild(subs);
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
