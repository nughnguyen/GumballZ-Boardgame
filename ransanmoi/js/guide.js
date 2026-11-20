// 📖 Hướng dẫn Rắn Săn Mồi — modal luật chơi (giống các game khác).
export const GUIDE_HTML = `
<h2>🐍 Rắn Săn Mồi</h2>
<p><b>Mục tiêu:</b> điều khiển rắn ăn mồi để dài ra. Ăn 1 mồi +10 điểm, dài thêm 1 ô. Đừng đâm tường hay tự cắn mình!</p>
<h3>🎮 Cách chơi</h3>
<ul>
<li><b>Di chuyển:</b> phím mũi tên hoặc WASD (hoặc 4 nút ▲ ▼ ◀ ▶ trên màn hình cảm ứng).</li>
<li>Rắn tự bò về phía trước — bạn chỉ đổi hướng. Không được quay đầu 180° ngay lập tức.</li>
<li><b>Tạm dừng:</b> P — chỉ dùng được ở chơi đơn.</li>
<li>Rắn ăn càng nhiều càng bò nhanh: tốc độ tăng mỗi 5 mồi (từ 180ms/ô xuống tối thiểu 90ms/ô).</li>
</ul>
<h3>🏆 Thắng / thua</h3>
<ul>
<li><b>Chơi đơn:</b> thắng ngay khi rắn dài 20 (ăn 16 mồi). Đâm tường hoặc tự cắn mình trước đó thì thua.</li>
<li><b>Đấu máy / online / chung máy:</b> đua — ai dài 15 trước thì thắng; nhiều người cùng đạt 15 thì so điểm, bằng điểm thì hoà. Chết hoặc xin thua thì bị loại, người còn lại chơi tiếp. Tất cả đều xong mà chưa ai đạt 15 thì so độ dài, rồi so điểm.</li>
<li><b>Chung máy 2 người:</b> người 1 dùng phím mũi tên; người 2 dùng WASD. Chỉ tiện trên máy tính.</li>
</ul>
<h3>🤖 Máy chơi thế nào</h3>
<ul>
<li><b>Máy Khó:</b> tìm đường ngắn nhất tới mồi, đuổi theo đuôi khi bị kẹt; đi nhanh (200–350ms/nước).</li>
<li><b>Máy Dễ:</b> 30% đi ngẫu nhiên, còn lại đi như máy Khó; đi chậm (600–900ms/nước).</li>
</ul>
<h3>🏳️ Xin thua</h3>
<ul>
<li>Xin thua là thua luôn ván đó (chơi đơn thua ngay; đua thì các người còn lại chơi tiếp).</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>
`;
export default GUIDE_HTML;
