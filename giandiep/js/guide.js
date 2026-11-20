// 📖 Hướng dẫn Ai là Gián Điệp – nội dung hộp "Cách chơi" trong game, đồng thời là nguồn
// để tools/guide/make.mjs sinh trang huong-dan/index.html (chạy trên máy dev).
export const GUIDE_HTML = `<div class="guide"><h2>📖 Cách chơi Ai là Gián Điệp</h2>
<p><b>Ai là Gián Điệp</b> là trò đoán từ cho 4–12 người: mỗi vòng mọi người nhận 1 từ bí mật — đa số (dân thường) cùng nhận 1 từ, còn 1–2 người (gián điệp) nhận 1 từ khác nhưng rất giống. Nhiệm vụ của bạn: mô tả từ của mình sao cho phe mình nhận ra, nhưng đừng để lộ cho gián điệp biết — rồi bỏ phiếu tìm ra gián điệp!</p>
<h3>1. Nhận từ bí mật</h3>
<ul>
<li>Mỗi người được chia 1 từ bí mật, chỉ mình bạn thấy (đừng để người bên cạnh nhìn trộm!).</li>
<li>Đa số nhận cùng 1 từ — ví dụ <b>Cà phê</b>. Gián điệp nhận 1 từ tương tự — ví dụ <b>Trà sữa</b>.</li>
<li>Chơi chuyền tay trên 1 máy: mỗi người lần lượt bấm <b>Xem từ của tôi</b>, xem xong bấm <b>Đã xem, che lại</b> rồi đưa máy cho người tiếp theo.</li>
</ul>
<h3>2. Mô tả bằng 1 câu</h3>
<ul>
<li>Lần lượt từng người mô tả từ của mình bằng <b>đúng 1 câu</b> — tới lượt ai thì người đó gõ câu mô tả rồi bấm <b>Gửi mô tả</b>.</li>
<li><b>Không được nói ra từ của mình</b> (game chặn luôn nếu câu mô tả chứa từ đó).</li>
<li>Mẹo: mô tả đủ rõ để dân thường nhận ra bạn cùng phe, nhưng đừng rõ quá kẻo gián điệp đoán được từ của dân.</li>
<li>Chủ phòng có thể bật <b>đồng hồ mô tả</b> (30/45/60 giây): hết giờ mà chưa gửi thì game tự gửi 1 câu mô tả chung chung giúp bạn.</li>
</ul>
<h3>3. Bỏ phiếu tìm gián điệp</h3>
<ul>
<li>Sau vòng mô tả, mọi người cùng bỏ phiếu: bấm vào người bạn nghi là gián điệp nhất.</li>
<li>Người bị nhiều phiếu nhất sẽ bị loại và <b>lộ từ của mình</b> cho cả bàn xem — nếu đó là gián điệp thì dân mừng, nếu đó là dân thường thì gián điệp mừng thầm!</li>
<li>Hòa phiếu thì không ai bị loại, chơi vòng mới với cặp từ mới.</li>
</ul>
<h3>4. Thắng thua</h3>
<ul>
<li><b>Dân thường thắng</b> khi loại hết gián điệp.</li>
<li><b>Gián điệp thắng</b> khi số gián điệp bằng hoặc nhiều hơn số dân còn lại.</li>
<li>Hết 1 vòng mà chưa phân thắng bại thì chơi vòng mới: cặp từ mới, vai trò chia lại từ đầu.</li>
<li>Khi ván kết thúc, game lật hết vai trò và từ của mọi người cho cả bàn xem.</li>
</ul>
<h3>5. Mẹo chơi</h3>
<ul>
<li>Làm dân thường: nghe kĩ mô tả của người khác — ai mô tả lệch hẳn so với đa số thì đáng nghi.</li>
<li>Làm gián điệp: mô tả chung chung, bám theo ý người khác, đừng cố tỏ ra hiểu quá rõ.</li>
<li>Đừng mô tả quá chi tiết: gián điệp nghe xong là đoán được từ của dân ngay.</li>
</ul>
<h3>6. Chế độ chơi</h3>
<ul>
<li><b>🌐 Online:</b> tạo phòng, gửi mã 5 ký tự cho bạn vào chơi cùng (4–12 người).</li>
<li><b>🤖 Chơi với máy:</b> máy tự mô tả và bỏ phiếu theo cảm nhận về từ của nó.</li>
<li><b>👥 Chuyền tay:</b> nhiều người chơi chung 1 máy — mỗi người xem từ rồi đưa máy cho người tiếp theo.</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`;
