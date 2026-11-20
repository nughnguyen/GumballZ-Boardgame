// 📖 Hướng dẫn Cờ Lật – nội dung hộp "Cách chơi" trong game, đồng thời là nguồn
// để tools/guide/make.mjs sinh trang huong-dan/index.html (chạy trên máy dev).
export const GUIDE_HTML = `<div class="guide"><h2>📖 Cách chơi Cờ Lật</h2>
<p><b>Cờ Lật</b> (Reversi / Othello) là trò cờ 2 người trên bàn 8×8: <b>Đen đi trước</b>. Đặt quân sao cho kẹp được quân địch giữa 2 quân mình — toàn bộ quân bị kẹp sẽ <b>lật sang màu của bạn</b>. Hết ván, ai nhiều quân hơn thì thắng!</p>
<h3>1. Bàn cờ và thế cờ ban đầu</h3>
<ul>
<li>Bàn 8×8. Giữa bàn có sẵn <b>4 quân</b>: 2 Đen và 2 Trắng đặt chéo nhau (d5 Trắng, e5 Đen, d4 Đen, e4 Trắng).</li>
<li><b>Đen đi trước</b>, rồi 2 bên đi xen kẽ. Mỗi lượt bạn đặt <b>1 quân</b> vào 1 ô trống.</li>
<li>Quân là đĩa tròn 2 mặt: mặt đen / mặt trắng — quân bị lật sẽ đổi màu ngay trên bàn.</li>
</ul>
<h3>2. Cách đi và lật quân</h3>
<ul>
<li>Nước đi hợp lệ phải kẹp được <b>ít nhất 1 quân địch</b> theo 1 trong 8 hướng (ngang, dọc, chéo): giữa quân mới đặt và 1 quân mình có sẵn phải có 1 dãy quân địch liên tiếp, không có ô trống chen giữa.</li>
<li>Tất cả quân địch bị kẹp đều <b>lật sang màu của bạn</b> — 1 nước có thể lật nhiều hướng cùng lúc.</li>
<li>Bấm vào ô có <b>chấm xanh</b> để xem trước sẽ lật được những quân nào — bấm lần nữa vào đúng ô đó để đặt quân. Bấm ô khác để đổi ý.</li>
<li>Không lật được quân nào thì <b>không được đặt</b> vào ô đó.</li>
</ul>
<h3>3. Bỏ lượt và kết thúc ván</h3>
<ul>
<li><b>Hết nước đi thì tự động bỏ lượt</b> — đối thủ đi tiếp. Nếu <b>cả 2 đều hết nước</b> (hoặc bàn đầy 64 quân) thì ván kết thúc và đếm quân.</li>
<li><b>Thắng:</b> nhiều quân hơn khi ván kết thúc. <b>Hòa</b> khi 2 bên bằng quân nhau.</li>
<li><b>Hòa thêm:</b> cả 2 cùng bấm <b>🤝 Xin hòa</b> và đối thủ đồng ý. Đánh bế tắc thì bấm <b>🏳️ Xin thua</b> để nhận thua ngay.</li>
</ul>
<h3>4. Mẹo chơi</h3>
<ul>
<li><b>Góc bàn là ô quý nhất:</b> quân ở góc không bao giờ bị lật! Giành góc trước, và tránh đặt vào các ô kề góc khi góc còn trống — đối thủ sẽ chiếm góc ngay sau đó.</li>
<li><b>Đừng tham ăn quân sớm:</b> giữa ván, ít quân thường tốt hơn nhiều quân — vì quân ít thì đối thủ có ít ô để kẹp bạn. Cứ giữ nước đi, để cuối ván mới bung.</li>
<li><b>Cơ động quan trọng:</b> giữ cho mình luôn có nhiều nước đi, ép đối thủ hết nước phải bỏ lượt.</li>
<li>Đếm quân chỉ quyết định ở cuối ván — 1 nước lật 8 quân giữa ván chưa chắc đã hay bằng 1 nước chiếm góc.</li>
</ul>
<h3>5. Chế độ chơi</h3>
<ul>
<li><b>🌐 Online:</b> tạo phòng, gửi mã 5 ký tự cho bạn vào chơi cùng. Chủ phòng chọn chơi quân Đen, Trắng hay ngẫu nhiên, và có thể bật đồng hồ đi (30/60 giây — hết giờ thì game tự đi 1 nước hợp lệ giúp bạn).</li>
<li><b>🤖 Chơi với máy:</b> Máy Dễ đánh ngẫu nhiên có chọn lọc (thích góc), Máy Khó dùng tìm kiếm sâu 5 với trọng số vị trí và độ cơ động — đánh chắc tay, không dễ thắng đâu.</li>
<li><b>👥 2 người chung máy:</b> nhập tên người chơi 2 rồi chuyền máy cho nhau, mỗi người một lượt.</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`;
