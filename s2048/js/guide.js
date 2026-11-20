// 📖 Hướng dẫn 2048 – nội dung hộp "Cách chơi" trong game, đồng thời là nguồn
// để tools/guide/make.mjs sinh trang huong-dan/index.html (chạy trên máy dev).
export const GUIDE_HTML = `<div class="guide"><h2>📖 Cách chơi 2048</h2>
<p><b>2048</b> là trò đố số kinh điển trên lưới <b>4×4</b>: trượt cả lưới theo 1 hướng, 2 ô có số giống nhau kề nhau thì <b>gộp thành 1 ô gấp đôi</b> (2+2=4, 4+4=8…). Đạt ô <b>2048</b> là thắng!</p>
<h3>1. Trượt và gộp ô</h3>
<ul>
<li><b>Phím mũi tên</b> hoặc <b>WASD</b> trên bàn phím máy tính; trên điện thoại thì <b>vuốt</b> trên lưới hoặc bấm <b>4 nút mũi tên</b> dưới lưới.</li>
<li>Mỗi nước trượt, các ô dồn về phía đó; 2 ô bằng nhau kề nhau thì gộp thành 1 ô gấp đôi — <b>mỗi ô chỉ gộp 1 lần trong 1 nước</b> (ví dụ 2-2-2-2 trượt trái thành 4-4, không phải 8).</li>
<li>Sau mỗi nước đi thành công thì <b>mọc thêm 1 ô mới</b> (90% là số 2, 10% là số 4) ở 1 ô trống ngẫu nhiên. Nước nào không làm gì thay đổi thì không tính và không mọc ô mới.</li>
<li><b>Điểm</b> = tổng các ô gộp được — gộp ô càng lớn thì điểm càng nhiều.</li>
</ul>
<h3>2. Thắng và thua</h3>
<ul>
<li><b>Đạt ô 2048 là thắng ván</b> (chơi đơn thì ván kết thúc, đua thì bạn thắng cuộc đua ngay).</li>
<li><b>Kẹt là thua:</b> lưới đầy 16 ô mà không còn cặp ô bằng nhau nào kề nhau để gộp nữa. Chơi đơn thì ván kết thúc, đua thì bạn bị loại, còn lại đua tiếp.</li>
<li><b>↩️ Hoàn tác</b> chỉ có ở chế độ chơi đơn: quay lại 1 nước trước đó, tối đa <b>5 lần / ván</b>. Đang đua thì không hoàn tác được.</li>
</ul>
<h3>3. Chế độ chơi</h3>
<ul>
<li><b>🔢 Chơi đơn:</b> một mình trượt tới ô 2048, tính giờ, lưu điểm cao nhất trên máy. Thắng thì +10 xu, chơi 1 ván +2 xu.</li>
<li><b>🤖 Đua với máy:</b> cùng 1 dãy ô mới mọc với máy — ai đạt 2048 trước thì thắng. Máy Dễ trượt bừa, Máy Khó trượt theo tính toán (giữ nhiều ô trống, gộp ô lớn, dồn ô lớn về 1 góc).</li>
<li><b>🌐 Đua online:</b> tạo phòng, gửi mã 5 ký tự cho 1–3 người bạn vào đua — thanh tiến độ hiện từng người được bao nhiêu điểm + ô lớn nhất, ai đạt 2048 trước thì thắng. Ai kẹt thì bị loại; nếu tất cả đều kẹt thì người điểm cao nhất thắng.</li>
</ul>
<h3>4. Mẹo chơi</h3>
<ul>
<li><b>Dồn ô lớn về 1 góc:</b> giữ ô lớn nhất ở 1 góc cố định và đừng bao giờ trượt ngược hướng làm nó rời khỏi góc.</li>
<li><b>Đừng để ô lớn kẹt giữa:</b> hàng/cột chứa ô lớn nhất nên xếp giảm dần ra ngoài — ô lớn ở giữa rất khó gộp tiếp.</li>
<li><b>Giữ nhiều ô trống:</b> càng nhiều ô trống thì càng có chỗ xoay xở; khi chỉ còn 1–2 ô trống thì ưu tiên nước nào mở thêm ô trống.</li>
<li><b>Đừng trượt bừa:</b> mỗi nước đều mọc thêm 1 ô mới — trượt không tính toán là tự làm đầy lưới của mình.</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`;
