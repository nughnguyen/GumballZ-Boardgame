// 📖 Hướng dẫn Connect 4 – nội dung hộp "Cách chơi" trong game, đồng thời là nguồn
// để tools/guide/make.mjs sinh trang huong-dan/index.html (chạy trên máy dev).
export const GUIDE_HTML = `<div class="guide"><h2>📖 Cách chơi Connect 4</h2>
<p><b>Connect 4</b> (Bốn quân liên tiếp) là trò cờ 2 người trên bàn <b>7 cột × 6 hàng</b>: <b>Đỏ đi trước</b>. Thả quân vào cột — quân rơi xuống ô trống thấp nhất. Ai xếp được <b>4 quân cùng màu liên tiếp</b> theo hàng ngang, hàng dọc hoặc đường chéo thì thắng!</p>
<h3>1. Bàn cờ và cách thả quân</h3>
<ul>
<li>Bàn 7 cột × 6 hàng (42 ô), ban đầu trống trơn. <b>Đỏ đi trước</b>, rồi 2 bên thả xen kẽ.</li>
<li>Mỗi lượt bạn chọn <b>1 cột</b> rồi thả <b>1 quân</b> — quân rơi thẳng xuống ô trống thấp nhất của cột đó, không đặt được vào ô giữa chừng.</li>
<li>Bấm 1 lần vào cột để xem trước quân sẽ rơi xuống đâu — bấm lần nữa vào đúng cột đó để thả quân. Bấm cột khác để đổi ý.</li>
<li>Cột nào đầy 6 quân thì <b>không thả thêm được</b> vào cột đó nữa.</li>
</ul>
<h3>2. Thắng – hòa</h3>
<ul>
<li><b>Thắng:</b> 4 quân cùng màu liên tiếp theo hàng ngang, hàng dọc hoặc đường chéo — quân vừa thả tạo thành 4 là thắng ngay, không cần chờ hết bàn.</li>
<li><b>Hòa:</b> bàn đầy 42 quân mà không ai được 4 thì hòa.</li>
<li><b>Hòa thêm:</b> cả 2 cùng bấm <b>🤝 Xin hòa</b> và đối thủ đồng ý. Đánh bế tắc thì bấm <b>🏳️ Xin thua</b> để nhận thua ngay.</li>
</ul>
<h3>3. Mẹo chơi</h3>
<ul>
<li><b>Cột giữa (cột 4) là cột quý nhất:</b> quân ở cột giữa tham gia được nhiều đường 4 nhất — ngang, dọc, cả 2 chéo. Chiếm cột giữa trước.</li>
<li><b>Luôn để ý nước thắng của đối thủ:</b> đối thủ có 3 quân liên tiếp với 1 đầu thoáng là sắp thắng — thả quân chặn ngay vào cột đó, đừng mải xếp quân của mình.</li>
<li><b>Tạo 2 mối đe dọa cùng lúc:</b> xếp sao cho 1 nước của bạn đe dọa thắng ở 2 cột khác nhau — đối thủ chỉ chặn được 1 cột, cột còn lại bạn thắng.</li>
<li><b>Đừng thả quân bừa xuống cột đối thủ đang chờ:</b> quân bạn thả có thể trở thành bệ đỡ cho đối thủ xếp 4 chéo lên trên nó.</li>
</ul>
<h3>4. Chế độ chơi</h3>
<ul>
<li><b>🌐 Online:</b> tạo phòng, gửi mã 5 ký tự cho bạn vào chơi cùng. Chủ phòng chọn chơi quân Đỏ, Vàng hay ngẫu nhiên, và có thể bật đồng hồ đi (30/60 giây — hết giờ thì game tự thả 1 quân hợp lệ giúp bạn).</li>
<li><b>🤖 Chơi với máy:</b> Máy Dễ đánh ngẫu nhiên có chọn lọc (biết thắng ngay và chặn nước thắng), Máy Khó dùng tìm kiếm minimax sâu 6 với phát hiện mối đe dọa — đánh chắc tay, không dễ thắng đâu.</li>
<li><b>👥 2 người chung máy:</b> nhập tên người chơi 2 rồi chuyền máy cho nhau, mỗi người một lượt.</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`;
