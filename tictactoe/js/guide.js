// 📖 Hướng dẫn TicTacToe – nội dung hộp "Cách chơi" trong game, đồng thời là nguồn
// để tools/guide/make.mjs sinh trang huong-dan/index.html (chạy trên máy dev).
export const GUIDE_HTML = `<div class="guide"><h2>📖 Cách chơi TicTacToe</h2>
<p><b>⚠️ TicTacToe KHÁC Caro!</b> TicTacToe chỉ có bàn <b>3×3 (9 ô)</b> và thắng khi xếp được <b>3 quân</b> liên tiếp — còn <b>Cờ Caro chơi trên bàn lớn 30×30 ô</b> (900 ô) và chỉ thắng khi xếp được <b>5 quân liên tiếp trở lên</b>. Hai game khác nhau hoàn toàn: TicTacToe là trò nhanh, gọn, đi đúng thì luôn hòa; Caro là trò tính đường dài trên bàn lớn.</p>
<h3>1. Luật thắng — 3 quân liên tiếp</h3>
<ul>
<li>Thắng khi có <b>3 quân liên tiếp</b> theo hàng ngang, dọc hoặc chéo — có đúng <b>8 đường thắng</b>: 3 hàng ngang, 3 cột dọc, 2 đường chéo.</li>
<li><b>X đi trước</b>, O đi sau, luân phiên đặt 1 quân vào 1 ô trống mỗi lượt.</li>
<li><b>Hòa</b> khi bàn đầy 9 ô mà không ai đủ 3 quân liên tiếp.</li>
<li>Nước đi không hợp lệ: đặt vào ô đã có quân, đặt ngoài bàn, hoặc đặt khi chưa tới lượt.</li>
</ul>
<h3>2. Chiến thuật cơ bản — chiếm giữa, chặn và bẫy</h3>
<ul>
<li><b>Ô giữa là mạnh nhất:</b> ô giữa (ô số 5) nằm trên tới 4 đường thắng — đi trước mà chiếm được ô giữa thì đã có lợi thế lớn.</li>
<li><b>Chặn là bắt buộc:</b> đối thủ có 2 quân liên tiếp mà ô thứ 3 còn trống thì phải chặn ngay, không chặn là thua ở nước sau.</li>
<li><b>Bẫy "2 đầu":</b> xếp quân sao cho tạo ra 2 đường thắng cùng lúc (ví dụ chiếm 2 góc đối diện) — đối thủ chỉ chặn được 1 đầu, đầu còn lại bạn thắng.</li>
<li><b>Đi đúng thì luôn hòa:</b> TicTacToe đi đúng thì không ai thắng được — muốn thắng phải chờ đối thủ đi sai, hoặc dụ đối thủ vào bẫy.</li>
</ul>
<h3>3. Chế độ chơi &amp; Máy AI</h3>
<ul>
<li><b>🌐 Chơi online:</b> bấm <b>🌐 Online</b> ở màn hình chính rồi <b>Tạo phòng online</b> — gửi mã phòng 5 ký tự (hoặc link mời) cho bạn; bạn nhập mã rồi bấm <b>Vào</b>. Chủ phòng bấm <b>Bắt đầu chơi</b> trong phòng chờ. Mỗi nước đi đều đồng bộ cho cả 2 bên. Nếu đối thủ mất kết nối thì máy sẽ đi thay sau vài giây; chủ phòng rời thì phòng giải tán.</li>
<li><b>Đấu với Máy:</b> bạn cầm X đi trước, máy cầm O. Máy <b>Khó</b> dùng minimax đầy đủ — <b>không bao giờ thua</b>: bạn đi sai là thua, đi đúng thì hòa; hòa được với Máy Khó đã là 1 thành tích! Máy <b>Dễ</b> đi ngẫu nhiên phần lớn thời gian, thỉnh thoảng (khoảng 30%) mới chọn nước tốt — rất dễ thắng.</li>
<li><b>2 Người chơi:</b> 2 người ngồi chung 1 máy, thay phiên nhau đặt quân.</li>
</ul>
<h3>4. Mẹo chơi</h3>
<ul>
<li>Đi trước: chiếm ô giữa, rồi chiếm 1 góc — đối thủ rất dễ sập bẫy "2 đầu".</li>
<li>Đi sau: nếu đối thủ chiếm ô giữa, bạn phải chiếm 1 góc ngay; đừng đánh ô cạnh (ô cạnh yếu nhất).</li>
<li>Luôn kiểm tra: đối thủ có 2 quân kề nhau không? Mình có 2 quân kề nhau không? — rồi mới quyết định chặn hay tấn công.</li>
<li>Ô vừa đánh có viền vàng nổi bật; 3 quân thắng được tô sáng cả dãy.</li>
</ul></div>`;
