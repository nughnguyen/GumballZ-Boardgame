// 📖 Hướng dẫn Sudoku – nội dung hộp "Cách chơi" trong game, đồng thời là nguồn
// để tools/guide/make.mjs sinh trang huong-dan/index.html (chạy trên máy dev).
export const GUIDE_HTML = `<div class="guide"><h2>📖 Cách chơi Sudoku</h2>
<p><b>Sudoku</b> là trò đố số kinh điển: lưới <b>9×9</b> chia thành 9 khối <b>3×3</b>. Điền các số <b>1–9</b> vào ô trống sao cho mỗi <b>hàng</b>, mỗi <b>cột</b> và mỗi <b>khối 3×3</b> đều chứa đủ các số 1–9, mỗi số đúng 1 lần. Số cho sẵn in đậm thì không đổi được.</p>
<h3>1. Điền số</h3>
<ul>
<li><b>Bấm 1 ô trống</b> rồi bấm <b>số 1–9</b> ở bàn phím dưới lưới (hoặc gõ phím số trên bàn phím máy tính). Số đúng thì hiện màu xanh, <b>số sai thì nhấp nháy đỏ và tính 1 lỗi</b>.</li>
<li><b>Sai 3 lần là thua ván</b> (chơi đơn thì ván kết thúc, đua thì bạn bị loại khỏi cuộc đua). Số lỗi hiện bằng ❌ trên đầu lưới.</li>
<li><b>Bấm lại ô đã điền</b> rồi bấm 🧽 Xoá (hoặc phím Backspace/Delete) để xoá số mình điền.</li>
<li><b>Phím mũi tên</b> di chuyển ô đang chọn; phím <b>N</b> bật/tắt chế độ ghi chú; phím <b>H</b> xin gợi ý.</li>
</ul>
<h3>2. Ghi chú (bút chì ✏️)</h3>
<ul>
<li>Bật <b>✏️ Ghi chú</b> rồi bấm số: số sẽ ghi nhỏ vào ô dưới dạng ghi chú thay vì điền chính thức. Bấm lại số đó để tắt ghi chú.</li>
<li>Ghi chú giúp bạn đánh dấu các số có thể vào ô đó rồi loại trừ dần. Điền đúng 1 số vào ô thì số đó tự biến mất khỏi ghi chú của các ô cùng hàng/cột/khối.</li>
<li>Ô đang chọn được tô sáng, các ô cùng hàng/cột/khối tô nhạt, các ô cùng số tô vàng — nhìn là biết số nào còn thiếu ở đâu.</li>
</ul>
<h3>3. Gợi ý 💡 và tạm dừng ⏸️</h3>
<ul>
<li><b>💡 Gợi ý</b> mở giúp 1 ô bất kỳ bằng đáp án đúng. Mỗi ván chỉ có <b>3 lượt gợi ý</b> — dùng tiết kiệm!</li>
<li><b>⏸️ Tạm dừng</b> chỉ có ở chế độ chơi đơn: tạm dừng thì lưới bị che lại và đồng hồ đứng yên. Đang đua thì không tạm dừng được vì mọi người vẫn đang giải.</li>
<li>Số ở bàn phím hiện <b>số lượt còn lại</b> của từng số (mỗi số xuất hiện đúng 9 lần trong lưới) — số nào hết thì nút mờ đi.</li>
</ul>
<h3>4. Độ khó</h3>
<ul>
<li><b>Dễ:</b> 44 số cho sẵn — làm quen, thư giãn.</li>
<li><b>Vừa:</b> 34 số cho sẵn — vừa sức mỗi ngày.</li>
<li><b>Khó:</b> 28 số cho sẵn — cần suy luận loại trừ.</li>
<li><b>Chuyên gia:</b> 24 số cho sẵn — chỉ dành cho cao thủ, mỗi câu đố đều có đúng 1 nghiệm duy nhất.</li>
</ul>
<h3>5. Chế độ chơi</h3>
<ul>
<li><b>🧩 Chơi đơn:</b> một mình giải 1 câu đố, tính giờ, sai 3 lần là thua. Thắng thì +10 xu, chơi 1 ván +2 xu.</li>
<li><b>🤖 Đua với máy:</b> cùng 1 câu đố với máy — ai giải xong trước thì thắng. Máy Dễ điền chậm, Máy Khó điền nhanh. Bạn bị loại nếu sai 3 lần.</li>
<li><b>🌐 Đua online:</b> tạo phòng, gửi mã 5 ký tự cho 1–3 người bạn vào đua cùng 1 câu đố — thanh tiến độ hiện từng người đã điền được bao nhiêu ô, ai về đích trước thì thắng. Người sai 3 lần bị loại, còn lại đua tiếp.</li>
</ul>
<h3>6. Chế độ Combat ⚔️ (đua 2–4 người)</h3>
<ul>
<li><b>Combat mặc định BẬT khi đua 2–4 người</b>, tắt khi chơi đơn; chủ phòng có thể tắt ở phòng chờ bằng công tắc ⚔️ Combat.</li>
<li>Điền đúng để <b>hoàn thành 1 hàng, 1 cột hoặc 1 khối 3×3</b> thì bạn <b>phủ sương 🌫️ lên 3 ô trống của người đang dẫn đầu</b> trong 9 giây (tối đa 9 ô sương cùng lúc).</li>
<li>Ô bị sương phủ hiện 🌫️ trên nền sọc xám — <b>không điền đúng được vào ô sương</b>; đoán sai vào ô sương vẫn tính 1 lỗi như bình thường.</li>
<li>Sương tự tan sau 9 giây; hoàn thành 1 dãy sẽ <b>thổi tan sương của chính mình</b>; gợi ý mở trúng ô sương thì sương ở ô đó cũng tan.</li>
<li>Thanh trạng thái hiện "🌫️ Sương: N ô · tan sau Xs"; hàng đua hiện ⚔️ số lần tấn công · 🌫️ số ô đang bị sương của từng người.</li>
</ul>
<h3>7. Mẹo chơi</h3>
<ul>
<li><b>Tìm số "chắc ăn":</b> số nào đã xuất hiện 8 lần thì ô còn lại của nó là đáp án — điền ngay không cần nghĩ.</li>
<li><b>Quét hàng/cột/khối:</b> chọn 1 số, nhìn 3 khối hàng ngang (hoặc dọc) — ô nào là giao điểm duy nhất còn trống thì điền số đó.</li>
<li><b>Ghi chú rồi loại trừ:</b> ô nào chỉ còn 1 ghi chú thì đó là đáp án; cặp ghi chú giống nhau ở 2 ô thì loại số đó khỏi các ô còn lại trong nhóm.</li>
<li><b>Đừng đoán mò:</b> sai 3 lần là thua — ô nào chưa chắc thì ghi chú trước, điền sau.</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`;
