// 🏆 Trang Bảng xếp hạng riêng (patch -150): vẽ bảng vào #rk-root bằng logic chung của leaderboard.js.
// Deep link: ?game=<slug> mở bảng của game đó (vd. từ Sảnh / trang game gọi openLeaderboard(game) cũ).
import { mountLeaderboardPage } from '../../shared/ui/leaderboard.js?v=38';
const q = new URLSearchParams(location.search);
mountLeaderboardPage(document.getElementById('rk-root'), q.get('game') || 'all');
