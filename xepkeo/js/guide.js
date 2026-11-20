// 📖 Hướng dẫn Xếp Kẹo — modal luật chơi (giống các game khác).
export const GUIDE_HTML = `
<h2>🍬 Xếp Kẹo</h2>
<p><b>Mục tiêu:</b> đổi chỗ 2 kẹo kề nhau để tạo thành hàng 3 kẹo cùng loại trở lên, rồi nổ tung lấy điểm. Mỗi loại kẹo có màu và hình riêng — đừng chỉ nhìn màu!</p>
<h3>🎮 Cách chơi</h3>
<ul>
<li><b>Đổi kẹo:</b> bấm 1 kẹo rồi bấm 1 kẹo kề bên (ngang hoặc dọc) để đổi chỗ. Chỉ nước đổi tạo thành hàng 3+ mới hợp lệ — đổi không tạo hàng thì kẹo đổi lại, không mất lượt.</li>
<li><b>Nổ kẹo:</b> hàng 3 kẹo = 60 điểm; hàng 4 kẹo thẳng hàng = 120 điểm + nổ cả hàng/dọc đó; hàng 5 kẹo thẳng hàng = 200 điểm + nổ toàn bộ kẹo cùng loại đó trên bảng.</li>
<li><b>Rơi + dây chuyền:</b> kẹo nổ xong, kẹo phía trên rơi xuống lấp chỗ trống, kẹo mới rơi từ trên xuống. Nếu kẹo rơi lại tạo thành hàng mới thì nổ tiếp — điểm nhân ×2, ×3... theo số lần nổ liên tiếp trong 1 nước.</li>
<li><b>Hết nước đi:</b> nếu bảng không còn nước đổi hợp lệ, bảng tự xáo lại (không tính điểm).</li>
</ul>
<h3>🏆 Thắng / thua</h3>
<ul>
<li><b>Chơi đơn:</b> 30 lượt — đạt 10000 điểm trước khi hết lượt thì thắng ngay; hết 30 lượt chưa đủ 10000 thì thua.</li>
<li><b>Đấu máy / online / chung máy:</b> đua — cùng 30 lượt, mỗi người 1 bảng riêng; hết lượt ai nhiều điểm nhất thì thắng, bằng điểm thì hoà. Xin thua thì bị loại, người còn lại chơi tiếp.</li>
<li><b>Chung máy 2 người:</b> mỗi người 1 bảng riêng trên cùng màn hình, bấm kẹo trên bảng của mình. Chỉ tiện trên máy tính.</li>
</ul>
<h3>🤖 Máy chơi thế nào</h3>
<ul>
<li><b>Máy Khó:</b> thử mọi nước đổi, tính cả dây chuyền, chọn nước nhiều điểm nhất; đi nhanh (200–400ms/nước).</li>
<li><b>Máy Dễ:</b> 20% đi bừa, còn lại chọn ngẫu nhiên trong 5 nước tốt nhất; đi chậm (500–800ms/nước).</li>
</ul>
<h3>🏳️ Xin thua</h3>
<ul>
<li>Xin thua là thua luôn ván đó (chơi đơn thua ngay; đua thì các người còn lại chơi tiếp).</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>
`;
export default GUIDE_HTML;
