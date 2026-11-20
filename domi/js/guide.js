// 📖 Hướng dẫn Dò Mìn – nội dung hộp "Cách chơi" trong game, đồng thời là nguồn
// để tools/guide/make.mjs sinh trang huong-dan/index.html (chạy trên máy dev).
export const GUIDE_HTML = `<div class="guide"><h2>📖 Cách chơi Dò Mìn</h2>
<p><b>Dò Mìn</b> là trò kinh điển: bãi mìn giấu <b>10–99 quả mìn</b> dưới các ô. <b>Bấm 1 ô để mở</b> — số hiện ra cho biết có bao nhiêu quả mìn ở <b>8 ô xung quanh</b> ô đó. Mở trúng mìn là <b>nổ</b>! Mở hết tất cả ô an toàn là <b>thắng</b>.</p>
<h3>1. Mở ô và số</h3>
<ul>
<li><b>Bấm chuột trái</b> (hoặc chạm) vào 1 ô để mở. Số <b>1–8</b> hiện ra = số mìn kề ô đó.</li>
<li><b>Số 0 (ô trống)</b> thì tự lan ra cả vùng trống xung quanh + viền số — mở 1 ô có thể mở được cả chục ô.</li>
<li><b>Cú bấm đầu tiên luôn an toàn</b> — mìn chỉ được đặt sau cú bấm đó, nên cứ bấm thoải mái.</li>
<li><b>Bấm trúng mìn 💥 là thua ván</b> (chơi đơn thì ván kết thúc, đua thì bạn bị loại khỏi cuộc đua).</li>
</ul>
<h3>2. Cắm cờ 🚩</h3>
<ul>
<li><b>Bấm chuột phải</b> vào 1 ô để cắm / nhổ cờ. Trên điện thoại: bật nút <b>🚩 Cắm cờ</b> rồi chạm vào ô, hoặc <b>nhấn giữ</b> ô khoảng nửa giây.</li>
<li>Cờ chỉ để đánh dấu mìn bạn nghi ngờ — <b>ô đang cắm cờ thì không mở được</b>, phải nhổ cờ trước.</li>
<li>Số <b>💣 còn lại</b> trên đầu bãi = tổng số mìn trừ số cờ đã cắm — cắm đủ số cờ thì số đó về 0.</li>
</ul>
<h3>3. Độ khó</h3>
<ul>
<li><b>Dễ:</b> bãi 9×9, 10 quả mìn — làm quen, thư giãn.</li>
<li><b>Vừa:</b> bãi 16×16, 40 quả mìn — vừa sức mỗi ngày.</li>
<li><b>Khó:</b> bãi 16×30, 99 quả mìn — chỉ dành cho cao thủ, cần suy luận chắc tay.</li>
</ul>
<h3>4. Chế độ chơi</h3>
<ul>
<li><b>💣 Chơi đơn:</b> một mình dò 1 bãi mìn, tính giờ — kỷ lục tốt nhất của từng độ khó lưu trên máy bạn. Thắng thì +10 xu, chơi 1 ván +2 xu.</li>
<li><b>🤖 Đua với máy:</b> cùng 1 bãi mìn với máy — ai mở hết ô an toàn trước thì thắng. Máy Dễ mở bừa nhiều, Máy Khó suy luận theo số. Bạn nổ mìn thì bị loại.</li>
<li><b>🌐 Đua online:</b> tạo phòng, gửi mã 5 ký tự cho 1–3 người bạn vào đua cùng 1 bãi mìn — thanh tiến độ hiện từng người đã mở được bao nhiêu ô, ai mở hết trước thì thắng (hòa thì ai xong trước thắng). Người nổ mìn bị loại, còn lại đua tiếp.</li>
</ul>
<h3>5. Mẹo chơi</h3>
<ul>
<li><b>Số 1 ở góc:</b> ô số 1 chỉ có 3 ô kề — dễ suy ra mìn ở đâu nhất, mở từ góc ra.</li>
<li><b>1-2-1:</b> dãy số 1-2-1 dọc biên thì 2 ô kề số 2 ở 2 đầu là mìn — cắm cờ luôn không cần nghĩ.</li>
<li><b>Số bằng số ô chưa mở:</b> ô số 3 mà chỉ còn đúng 3 ô kề chưa mở thì cả 3 đều là mìn — cắm cờ hết.</li>
<li><b>Số trừ cờ bằng 0:</b> ô số 2 đã có 2 cờ kề thì các ô kề còn lại đều an toàn — mở hết.</li>
<li><b>Đừng đoán mò khi chưa cần:</b> bãi nào cũng có đường suy luận chắc ăn — đoán mò chỉ khi hết nước chắc.</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`;

