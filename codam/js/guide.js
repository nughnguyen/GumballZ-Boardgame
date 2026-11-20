// 📖 Hướng dẫn Cờ Đam – nội dung hộp "Cách chơi" trong game, đồng thời là nguồn
// để tools/guide/make.mjs sinh trang huong-dan/index.html (chạy trên máy dev).
export const GUIDE_HTML = `<div class="guide"><h2>📖 Cách chơi Cờ Đam</h2>
<p><b>Cờ Đam</b> là trò cờ 2 người trên bàn 8×8: mỗi bên 12 quân, <b>Đỏ đi trước</b>. Quân đi chéo 1 ô, nhảy qua quân địch để ăn — ăn là bắt buộc, ăn được nhiều lần thì phải ăn tiếp. Lên tới hàng cuối thì phong Vua, đi chéo mọi hướng. Ăn hết quân địch hoặc chặn cho địch hết nước đi là thắng!</p>
<h3>1. Bàn cờ và quân</h3>
<ul>
<li>Bàn 8×8, chỉ đi trên <b>ô tối</b> (ô sáng không bao giờ có quân). Mỗi bên <b>12 quân</b>: Đỏ xếp 3 hàng dưới, Đen xếp 3 hàng trên.</li>
<li><b>Đỏ đi trước</b>, đi chéo 1 ô về phía trước (lên trên). Đen đi chéo 1 ô xuống dưới.</li>
<li>Quân thường là đĩa tròn; quân <b>Vua</b> có thêm 👑 và đi chéo 1 ô <b>mọi hướng</b> (tiến lẫn lùi).</li>
</ul>
<h3>2. Cách đi và ăn quân</h3>
<ul>
<li>Bấm vào 1 quân của mình để xem các ô đi được: <b>chấm xanh</b> là ô đi thường, <b>viền đỏ</b> là ô ăn được quân địch.</li>
<li><b>Ăn quân:</b> nhảy qua 1 quân địch kề chéo sang ô trống ngay phía sau nó — quân bị nhảy qua biến mất khỏi bàn.</li>
<li><b>Ăn là BẮT BUỘC:</b> nếu có nước ăn nào thì bạn chỉ được ăn, không được đi thường. Game tô đỏ các quân đang bắt buộc ăn.</li>
<li><b>Nhảy nhiều lần:</b> ăn xong mà cùng quân đó còn ăn tiếp được thì <b>phải ăn tiếp</b> trong cùng 1 lượt — lượt chỉ đổi khi không còn nước ăn nào cho quân đó.</li>
</ul>
<h3>3. Phong Vua</h3>
<ul>
<li>Quân thường lên tới <b>hàng cuối phía địch</b> (Đỏ lên hàng trên cùng, Đen xuống hàng dưới cùng) thì <b>phong Vua</b> ngay 👑.</li>
<li>Vua đi và ăn chéo 1 ô mọi hướng — mạnh hơn quân thường nhiều.</li>
<li>Lưu ý: <b>phong Vua thì dừng lượt</b> — dù vừa phong Vua bằng 1 nước ăn thì cũng không được nhảy tiếp trong lượt đó.</li>
</ul>
<h3>4. Thắng thua và hòa</h3>
<ul>
<li><b>Thắng</b> khi ăn hết quân địch, hoặc chặn cho địch <b>hết nước đi</b>.</li>
<li><b>Hòa:</b> cả 2 cùng bấm <b>🤝 Xin hòa</b> và đối thủ đồng ý; hoặc <b>40 nước không ăn quân nào</b>; hoặc <b>lặp lại vị trí 3 lần</b>.</li>
<li>Đánh bế tắc thì bấm <b>🏳️ Xin thua</b> để nhận thua ngay.</li>
</ul>
<h3>5. Mẹo chơi</h3>
<ul>
<li>Đừng dâng quân: quân vừa bước tới mà địch ăn được ngay thì coi như mất không — game cảnh báo bằng viền đỏ ở ô địch có thể ăn.</li>
<li>Giữ quân ở hàng cuối nhà mình: địch muốn phong Vua phải vượt qua, mà quân giữ nhà còn chặn đường.</li>
<li>Đổi quân có lợi: ăn 1 quân địch bằng 1 quân mình là hòa, nhưng ăn được Vua địch hoặc ăn 2 quân trong 1 chuỗi nhảy là lời to.</li>
<li>Vua rất mạnh ở cuối ván: 1 Vua đấu 3 quân thường vẫn có cửa thắng nếu đi khéo.</li>
</ul>
<h3>6. Chế độ chơi</h3>
<ul>
<li><b>🌐 Online:</b> tạo phòng, gửi mã 5 ký tự cho bạn vào chơi cùng. Chủ phòng chọn chơi quân Đỏ, Đen hay ngẫu nhiên, và có thể bật đồng hồ đi (30/60 giây — hết giờ thì game tự đi 1 nước hợp lệ giúp bạn).</li>
<li><b>🤖 Chơi với máy:</b> Máy Dễ đánh ngẫu nhiên có chọn lọc, Máy Khó dùng minimax sâu 5 — đánh chắc tay, không bao giờ thua người chơi thường.</li>
<li><b>👥 2 người chung máy:</b> nhập tên người chơi 2 rồi chuyền máy cho nhau, mỗi người một lượt.</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`;
