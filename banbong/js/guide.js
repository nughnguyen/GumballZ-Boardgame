// 📖 Hướng dẫn Bắn Bóng — modal luật chơi (giống các game khác).
export const GUIDE_HTML = `
<h2>🏀 Bắn Bóng</h2>
<p><b>Mục tiêu:</b> dùng vợt đỡ bóng, phá hết gạch trên sân. Phá gạch thường +10 điểm, gạch cứng (hàng trên cùng, 2 máu) +20 điểm. Đừng để bóng rơi qua đáy!</p>
<h3>🎮 Cách chơi</h3>
<ul>
<li><b>Di chuyển vợt:</b> phím mũi tên ◀ ▶ (hoặc A / D), hoặc kéo chuột / chạm kéo trên sân.</li>
<li>Bóng nảy lên từ vợt: chạm lệch trái thì bay sang trái, lệch phải thì bay sang phải — ngắm bóng về phía còn nhiều gạch!</li>
<li>Bóng càng phá nhiều gạch càng nhanh (từ 6 lên tới 9).</li>
<li><b>Tạm dừng:</b> P — chỉ dùng được ở chơi đơn.</li>
</ul>
<h3>🏆 Thắng / thua</h3>
<ul>
<li><b>Chơi đơn:</b> phá hết 60 gạch thì thắng ngay. Mất hết 3 mạng thì thua.</li>
<li><b>Đấu máy / online / chung máy:</b> đua — ai phá hết gạch trước thì thắng; sau 180 giây chưa ai phá hết thì ai nhiều điểm nhất thắng, bằng điểm thì hoà. Mất hết mạng hoặc xin thua thì bị loại, người còn lại chơi tiếp.</li>
<li><b>Chung máy 2 người:</b> người 1 dùng phím mũi tên; người 2 dùng A / D. Chỉ tiện trên máy tính.</li>
</ul>
<h3>🤖 Máy chơi thế nào</h3>
<ul>
<li><b>Máy Khó:</b> dự đoán chỗ bóng rơi, ngắm bóng về phía còn nhiều gạch; đi nhanh (150–300ms/nước).</li>
<li><b>Máy Dễ:</b> bám theo bóng với sai số ngẫu nhiên, không ngắm; đi chậm (400–700ms/nước).</li>
</ul>
<h3>🏳️ Xin thua</h3>
<ul>
<li>Xin thua là thua luôn ván đó (chơi đơn thua ngay; đua thì các người còn lại chơi tiếp).</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>
`;
export default GUIDE_HTML;
