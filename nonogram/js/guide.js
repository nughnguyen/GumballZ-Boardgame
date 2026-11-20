// 📖 Hướng dẫn Nonogram — modal luật chơi (giống các game khác).
export const GUIDE_HTML = `
<h2>🧩 Nonogram</h2>
<p><b>Mục tiêu:</b> tô đen các ô để tạo thành hình ẩn, dựa vào dãy số gợi ý ở đầu mỗi hàng và mỗi cột.</p>
<h3>🎮 Cách chơi</h3>
<ul>
<li><b>Số gợi ý</b> là độ dài các đoạn ô đen liên tiếp trong hàng/cột đó, vd "3 1" nghĩa là 1 đoạn 3 ô đen rồi 1 đoạn 1 ô đen, các đoạn cách nhau ít nhất 1 ô trắng. Hàng/cột trống thì gợi ý là 0.</li>
<li><b>Bấm chuột trái</b> (hoặc chạm) vào ô để tô đen. Bấm lại ô đã tô để xóa.</li>
<li><b>Bấm chuột phải</b> vào ô để đánh dấu ✕ (ô chắc chắn trắng). Trên điện thoại: bấm nút "✏️ Tô / ✖️ Đánh dấu" để đổi chế độ chạm.</li>
<li><b>Gợi ý 💡:</b> tối đa 3 lần mỗi màn, tô đúng 1 ô đen chưa tô.</li>
<li><b>Mạng:</b> tô sai vào ô trắng thì mất 1 mạng, ô đó bị khóa (✕ đỏ) không tô lại được. Hết 3 mạng thì thua.</li>
</ul>
<h3>📏 Kích thước</h3>
<ul>
<li><b>Dễ:</b> bảng 5×5. <b>Vừa:</b> bảng 10×10. <b>Khó:</b> bảng 15×15.</li>
</ul>
<h3>🏆 Thắng / thua</h3>
<ul>
<li><b>Chơi đơn:</b> thắng khi tô đủ hết các ô đen trước khi hết 3 mạng.</li>
<li><b>Đấu máy / online / chung máy:</b> đua cùng 1 câu đố — ai tô đủ trước thì thắng; hết 180 giây chưa ai xong thì so % hoàn thành, bằng nhau thì hoà. Hết 3 mạng hoặc xin thua thì bị loại, người còn lại chơi tiếp.</li>
<li><b>Chung máy 2 người:</b> 2 bảng riêng trên cùng màn hình, thay phiên bấm. Chỉ tiện trên máy tính.</li>
</ul>
<h3>🤖 Máy chơi thế nào</h3>
<ul>
<li><b>Máy Khó:</b> suy luận như người chơi giỏi (ô đen trong mọi cách đặt thì chắc chắn đen), hết suy luận thì đoán ô có xác suất cao nhất; đi nhanh (250–450ms/nước).</li>
<li><b>Máy Dễ:</b> tô ngẫu nhiên, hay tô sai; đi chậm (800–1200ms/nước).</li>
</ul>
<h3>🏳️ Xin thua</h3>
<ul>
<li>Xin thua là thua luôn ván đó (chơi đơn thua ngay; đua thì các người còn lại chơi tiếp).</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>
`;
export default GUIDE_HTML;
