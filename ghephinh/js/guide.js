// 📖 Hướng dẫn Ghép Hình — modal luật chơi (giống các game khác).
export const GUIDE_HTML = `
<h2>🧩 Ghép Hình</h2>
<p><b>Mục tiêu:</b> đổi chỗ các mảnh để ghép lại thành 1 bức tranh hoàn chỉnh.</p>
<h3>🎮 Cách chơi</h3>
<ul>
<li><b>Bấm 1 mảnh</b> để chọn (mảnh sáng lên), <b>bấm mảnh khác</b> để đổi chỗ 2 mảnh. Hoặc <b>kéo-thả</b> 1 mảnh lên mảnh khác (chuột/chạm đều được).</li>
<li><b>Mỗi mảnh về đúng vị trí</b> được +10 điểm (1 nước đổi đúng cả 2 mảnh thì +20). Đổi mà không mảnh nào đúng thì 0 điểm — không trừ điểm, không mất mạng.</li>
<li><b>Xem mẫu 👀:</b> tối đa 3 lần mỗi màn, hiện ảnh gốc 5 giây để nhớ hình.</li>
<li><b>Mảnh không xoay</b> — chỉ cần đổi vị trí.</li>
</ul>
<h3>📏 Kích thước</h3>
<ul>
<li><b>Dễ:</b> bảng 3×3 (9 mảnh). <b>Vừa:</b> bảng 4×4 (16 mảnh). <b>Khó:</b> bảng 5×5 (25 mảnh).</li>
<li>Mỗi ván là 1 trong 6 hình tự vẽ: mặt trời, con cá, ngôi nhà, bông hoa, con mèo, quả táo.</li>
</ul>
<h3>🏆 Thắng / thua</h3>
<ul>
<li><b>Chơi đơn:</b> thắng khi ghép đủ cả bức tranh (càng nhanh càng tốt).</li>
<li><b>Đấu máy / online / chung máy:</b> đua cùng 1 bức tranh — ai ghép xong trước thì thắng; hết 180 giây chưa ai xong thì ai đặt đúng nhiều mảnh hơn thắng, bằng nhau thì hoà. Xin thua thì bị loại, người còn lại chơi tiếp.</li>
<li><b>Chung máy 2 người:</b> 2 bảng riêng trên cùng màn hình, thay phiên bấm. Chỉ tiện trên máy tính.</li>
</ul>
<h3>🤖 Máy chơi thế nào</h3>
<ul>
<li><b>Máy Khó:</b> mỗi nước đặt đúng ít nhất 1 mảnh (nhìn hình mẫu); đi nhanh (300–500ms/nước).</li>
<li><b>Máy Dễ:</b> đổi ngẫu nhiên 2 mảnh sai vị trí; đi chậm (900–1300ms/nước).</li>
</ul>
<h3>🏳️ Xin thua</h3>
<ul>
<li>Xin thua là thua luôn ván đó (chơi đơn thua ngay; đua thì các người còn lại chơi tiếp).</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>
`;
export default GUIDE_HTML;
