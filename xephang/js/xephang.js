// 🏆 Trang Bảng xếp hạng riêng (patch -150) + các top phụ (patch -152): vẽ bảng vào #rk-root bằng logic chung
// của leaderboard.js, vẽ 4 top phụ (chơi nhiều / tỉ lệ thắng / Cờ Tỷ Phú / Cờ Tướng) vào #rk-subs.
// Deep link: ?game=<slug> mở bảng của game đó (vd. từ Sảnh / trang game gọi openLeaderboard(game) cũ).
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
