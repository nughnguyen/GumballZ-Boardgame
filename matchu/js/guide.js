// 📖 Hướng dẫn Mạt Chược – nội dung hộp "Cách chơi" trong game, đồng thời là nguồn
// để tools/guide/make.mjs sinh trang huong-dan/index.html (chạy trên máy dev).
export const GUIDE_HTML = `<div class="guide"><h2>📖 Cách chơi Mạt Chược</h2>
<p><b>Mạt Chược</b> (Mahjong Solitaire) là trò gỡ bài kinh điển: bàn có <b>144 quân</b> xếp chồng thành hình con Rùa, bạn gỡ từng cặp quân giống nhau cho tới khi bàn trống trơn. Quân nào cũng có 4 quân giống nhau — trừ Hoa và Mùa.</p>
<h3>1. Quân nào được gỡ?</h3>
<ul>
<li><b>Bấm 2 quân cùng mặt</b> để gỡ cặp — mỗi quân gỡ được phải là quân <b>TRỐNG</b>: không có quân nào đè lên trên nó, và <b>trái hoặc phải còn hở</b> (không bị quân cùng tầng chặn cả 2 bên).</li>
<li>Quân đang bị đè thì mờ đi, bấm vào sẽ báo "chưa trống". Quân trống thì sáng lên khi bạn rê chuột qua.</li>
<li><b>Bấm 1 quân trống</b> để chọn (tô vàng), bấm lại quân đó để bỏ chọn. Bấm 1 quân trống khác mặt thì đổi sang chọn quân mới.</li>
</ul>
<h3>2. Ghép cặp</h3>
<ul>
<li><b>Cùng mặt thì gỡ được:</b> Vòng 5 với Vòng 5, Tre 3 với Tre 3, Vạn 7 với Vạn 7, Gió Đông với Gió Đông, Rồng Đỏ với Rồng Đỏ…</li>
<li><b>Hoa ghép với Hoa bất kỳ:</b> Hoa Mai, Hoa Lan, Hoa Cúc, Hoa Trúc — 4 quân Hoa khác nhau nhưng vẫn là 1 cặp với nhau.</li>
<li><b>Mùa ghép với Mùa bất kỳ:</b> Xuân, Hạ, Thu, Đông — cũng ghép chéo với nhau như Hoa.</li>
<li>Rồng Trắng là quân trắng trơn (không có chữ) — đừng nhầm với ô trống.</li>
</ul>
<h3>3. Gợi ý 💡, Xào bài 🔀, Hoàn tác ↩️</h3>
<ul>
<li><b>💡 Gợi ý</b> chỉ ra 1 cặp gỡ được — ưu tiên cặp mở khóa nhiều quân nhất. Mỗi ván chỉ có <b>5 lượt gợi ý</b>.</li>
<li><b>🔀 Xào bài</b> xáo lại mặt của các quân còn trên bàn (bộ quân giữ nguyên) — chỉ dùng được khi <b>hết cặp gỡ được</b>. Mỗi ván chỉ có <b>3 lượt xào</b>, xào mãi không ra cặp thì tính là kẹt.</li>
<li><b>↩️ Hoàn tác</b> trả lại nước gỡ/xào vừa rồi — tối đa <b>5 lần/ván</b>, chỉ có ở chế độ chơi đơn.</li>
<li><b>Hết cặp gỡ được mà hết lượt xào thì kẹt</b> — chơi đơn thì ván kết thúc, đua thì bạn bị loại, còn lại đua tiếp.</li>
</ul>
<h3>4. Chế độ chơi</h3>
<ul>
<li><b>🀄 Chơi đơn:</b> một mình gỡ hết 144 quân, tính giờ (kỷ lục thời gian nhanh nhất lưu trên máy). Thắng thì +10 xu, chơi 1 ván +2 xu.</li>
<li><b>🤖 Đua với máy:</b> cùng 1 thế bài với máy — ai gỡ hết trước thì thắng. Máy Dễ gỡ bừa, Máy Khó gỡ cặp mở khóa nhiều quân nhất.</li>
<li><b>🌐 Đua online:</b> tạo phòng, gửi mã 5 ký tự cho 1–3 người bạn vào đua cùng 1 thế bài — thanh tiến độ hiện từng người đã gỡ được bao nhiêu quân, ai về đích trước thì thắng. Ai kẹt hết lượt xào thì bị loại, tất cả đều kẹt thì gỡ nhiều nhất thắng.</li>
</ul>
<h3>5. Mẹo chơi</h3>
<ul>
<li><b>Ưu tiên gỡ quân trên cao:</b> quân tầng trên đè nhiều quân dưới — gỡ nó ra thì cả đống quân dưới được trống.</li>
<li><b>Đừng gỡ cặp "vô hại":</b> cặp nào gỡ xong không mở thêm quân nào thì để dành — gỡ cặp mở khóa trước.</li>
<li><b>Giữ lại 1 quân mỗi loại:</b> mỗi mặt có 4 quân — nếu gỡ 2 quân rồi còn 2 quân bị kẹt dưới thì vẫn có đường ra.</li>
<li><b>Hoa và Mùa là "chìa khóa vạn năng":</b> Hoa nào cũng ghép với Hoa, Mùa nào cũng ghép với Mùa — dùng chúng để mở đường khi bí.</li>
<li><b>Nhìn 2 đầu bàn:</b> 2 quân nhô ra ở 2 đầu bàn luôn trống — gỡ chúng trước để mở biên.</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`;
