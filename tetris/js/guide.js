// 📖 Hướng dẫn Tetris — modal luật chơi (giống các game khác).
export const GUIDE_HTML = `
<h2>🧱 Tetris</h2>
<p><b>Mục tiêu:</b> xếp các khối rơi thành hàng ngang đầy đủ để xoá hàng, ghi điểm. Hàng càng xoá nhiều cùng lúc càng nhiều điểm — xoá 4 hàng 1 lúc (Tetris) là ngon nhất!</p>
<h3>🎮 Cách chơi</h3>
<ul>
<li><b>Di chuyển:</b> ← → (hoặc nút ◀ ▶ trên màn hình cảm ứng).</li>
<li><b>Xoay:</b> ↑ hoặc X (xoay phải), Z (xoay trái); nút ⟳ trên cảm ứng.</li>
<li><b>Rơi nhanh:</b> ↓ là rơi mềm (+1 điểm/ô); Space (hoặc nút ⤓) là thả nhanh xuống đáy (+2 điểm/ô).</li>
<li><b>Giữ khối:</b> C (hoặc nút Giữ) — cất khối đang rơi vào ô giữ, lấy khối đã giữ ra; mỗi khối chỉ giữ được 1 lần.</li>
<li><b>Tạm dừng:</b> P — chỉ dùng được ở chơi đơn.</li>
<li>Khối chạm đáy thì khoá ngay ở nhịp rơi tiếp theo (không có lock delay).</li>
</ul>
<h3>🏆 Tính điểm &amp; cấp độ</h3>
<ul>
<li>Xoá 1 hàng 100đ, 2 hàng 300đ, 3 hàng 500đ, Tetris (4 hàng) 800đ — tất cả × level hiện tại.</li>
<li>Xoá liên tiếp nhiều lần không ngắt: từ lần thứ 2 trở đi thưởng thêm +50 × level mỗi lần.</li>
<li>Cứ 10 hàng thì lên 1 level, khối rơi nhanh dần (level 1: 800ms/hàng, nhanh dần, tối thiểu 50ms/hàng).</li>
<li>Bóng ma (ghost) hiện chỗ khối sẽ rơi xuống để bạn căn.</li>
</ul>
<h3>👤 Chơi đơn &amp; đấu máy</h3>
<ul>
<li><b>Chơi đơn:</b> xếp tới khi chạm nóc. Xoá đủ 100 hàng (lên level 10) thì thắng ngay!</li>
<li><b>Đấu máy / online / chung máy:</b> đua 40 hàng — mỗi người 1 giếng riêng, ai xoá đủ 40 hàng trước thì thắng. Không có hàng rác gửi sang đối thủ. Nếu tất cả cùng chạm nóc trước 40 hàng thì so điểm, bằng điểm thì hoà.</li>
<li><b>Chung máy 2 người:</b> người 1 dùng ← → ↓ ↑ + Enter (thả nhanh) + Shift phải (giữ); người 2 dùng A D S W + Space (thả nhanh) + Q (giữ). Chỉ tiện trên máy tính.</li>
</ul>
<h3>🏳️ Xin thua</h3>
<ul>
<li>Xin thua là thua luôn ván đó (chơi đơn thua ngay; đua thì các người còn lại chơi tiếp).</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>
`;
export default GUIDE_HTML;
