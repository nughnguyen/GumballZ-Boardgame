// 📖 Hướng dẫn Wordle – nội dung hộp "Cách chơi" trong game, đồng thời là nguồn
// để tools/guide/make.mjs sinh trang huong-dan/index.html (chạy trên máy dev).
export const GUIDE_HTML = `<div class="guide"><h2>📖 Cách chơi Wordle</h2>
<p><b>Wordle</b> là trò đoán từ kinh điển: bạn có <b>6 lượt</b> để đoán 1 từ tiếng Việt <b>5 chữ cái</b> (không dấu). Sau mỗi lượt đoán, từng chữ sẽ đổi màu cho bạn biết mình đoán đúng tới đâu.</p>
<h3>1. Màu sắc nghĩa là gì?</h3>
<ul>
<li><b>🟩 Xanh lá:</b> chữ đó đúng và đúng chỗ.</li>
<li><b>🟨 Vàng:</b> chữ đó có trong từ nhưng đang sai chỗ.</li>
<li><b>⬜ Xám:</b> chữ đó không có trong từ.</li>
<li>Nếu 1 chữ xuất hiện 2 lần trong từ thì tối đa 2 ô được tô xanh/vàng — ô thứ 3 trở đi sẽ xám, đừng bị lừa!</li>
</ul>
<h3>2. Cách đoán</h3>
<ul>
<li>Gõ chữ trên <b>bàn phím màn hình</b> hoặc gõ phím trên bàn phím máy tính, bấm <b>Enter</b> để đoán, <b>Backspace</b> để xoá 1 chữ.</li>
<li>Từ đoán phải là <b>từ tiếng Việt có thật, 5 chữ cái</b> (không dấu) — đoán từ không có trong từ điển thì không tính lượt, cứ đoán lại.</li>
<li>Đoán đúng cả 5 ô xanh là thắng. Đoán sai <b>6 lần</b> là thua và đáp án sẽ hiện ra.</li>
</ul>
<h3>3. Chế độ chơi</h3>
<ul>
<li><b>🟩 Chơi đơn:</b> một mình đoán 1 từ ngẫu nhiên, thắng thì +10 xu, chơi 1 ván +2 xu. Chuỗi thắng (streak) được lưu lại.</li>
<li><b>🤖 Đua với máy:</b> cùng 1 từ với máy — ai đoán đúng với ít lượt hơn thì thắng (hoà thì ai xong trước thắng). Máy Dễ đoán gần như ngẫu nhiên, Máy Khó loại trừ rất giỏi.</li>
<li><b>🌐 Đua online:</b> tạo phòng, gửi mã 5 ký tự cho 1–3 người bạn vào đua cùng 1 từ — thanh tiến độ hiện từng người đã đoán mấy lượt, ai về đích trước thì thắng.</li>
</ul>
<h3>4. Mẹo chơi</h3>
<ul>
<li><b>Lượt đầu đoán từ nhiều nguyên âm:</b> ví dụ từ có A, E, I, O — biết ngay từ có những nguyên âm nào.</li>
<li><b>Đừng đoán lại chữ đã xám:</b> chữ xám là chắc chắn không có trong từ (trừ khi nó xuất hiện 2 lần và 1 lần đã xanh/vàng).</li>
<li><b>Dùng màu vàng để đổi chỗ:</b> chữ vàng thì thử đặt nó sang vị trí khác ở lượt sau.</li>
<li><b>Đua thì đoán nhanh nhưng đừng ẩu:</b> ít lượt hơn mới thắng, nhưng đoán ẩu 6 lần là thua luôn.</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`;
