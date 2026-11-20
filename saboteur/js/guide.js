// 📖 Hướng dẫn Saboteur — HTML chèn vào hộp thoại (giống Lấy 6).
export const GUIDE_HTML = `
<h2>😈 Cách chơi Saboteur</h2>
<p><b>Saboteur</b> là game bài vai trò bí mật: 3–10 người, mỗi người được chia 1 vai trò <b>bí mật</b> — <b>thợ đào vàng</b> ⛏️ hoặc <b>kẻ phá hoại</b> 😈. Thợ đào cùng nhau mở đường từ lá Bắt đầu tới kho vàng; kẻ phá hoại trà trộn trong nhóm, âm thầm chặn đường, phá dụng cụ. Chơi 3 vòng, ai nhiều vàng nhất thì thắng trận!</p>
<h3>🎭 Vai trò</h3>
<ul>
<li>3–4 người: <b>1 kẻ phá hoại</b>; 5–9 người: <b>2 kẻ phá hoại</b>; 10 người: <b>3 kẻ phá hoại</b>. Còn lại đều là thợ đào.</li>
<li>Vai trò được chia lại mỗi vòng. Kẻ phá hoại cũng <b>không biết đồng bọn</b> là ai — phải đoán qua cách chơi!</li>
</ul>
<h3>🃏 Bộ bài</h3>
<ul>
<li><b>44 lá đường:</b> thẳng, cong, ngã ba, ngã tư và lá cụt (đường đi vào rồi hết).</li>
<li><b>27 lá hành động:</b> Bản đồ (xem 1 lá đích, chỉ mình biết), Đá rơi (phá 1 lá đường trên bàn), phá Cuốc / Đèn / Xe đẩy, sửa Cuốc / Đèn / Xe đẩy (cả loại sửa 2 dụng cụ cùng lúc).</li>
<li><b>28 lá vàng:</b> 1, 2 hoặc 3 cốm (16 lá 1 cốm, 8 lá 2 cốm, 4 lá 3 cốm).</li>
<li><b>Số lá trên tay:</b> 3–5 người: 6 lá; 6–7 người: 5 lá; 8–10 người: 4 lá.</li>
</ul>
<h3>🎲 Mỗi lượt</h3>
<p>Tới lượt bạn, làm <b>đúng 1 việc</b> rồi rút 1 lá (tới khi bộ bài hết):</p>
<ul>
<li><b>Đặt 1 lá đường</b> lên bàn: lá phải <b>nối với đường đã có</b> (ít nhất 1 cửa mở khớp với lá kề bên) và <b>không mâu thuẫn</b> với các lá kề (cửa mở phải gặp cửa mở, cửa đóng gặp cửa đóng). Có thể <b>xoay lá 180°</b> trước khi đặt. Ai đang hỏng dụng cụ (Cuốc, Đèn hoặc Xe đẩy) thì <b>không đặt được lá đường</b>.</li>
<li><b>Dùng 1 lá hành động:</b> Bản đồ (chọn 1 lá đích để xem), phá dụng cụ của 1 người, sửa dụng cụ cho 1 người (kể cả chính mình), hoặc Đá rơi (phá 1 lá đường trên bàn, trừ lá Bắt đầu và lá đích).</li>
<li><b>Bỏ 1 lá</b> úp xuống nếu không muốn (hoặc không thể) dùng lá nào.</li>
</ul>
<h3>🏆 Hết vòng — ai thắng?</h3>
<ul>
<li><b>Đào tới vàng:</b> đường nối tới lá đích vàng thì <b>thợ đào thắng vòng</b>, chia vàng: người đặt lá cuối chọn vàng trước, rồi các thợ đào khác lần lượt chọn theo chiều kim đồng hồ, mỗi người 1 lá vàng 1 lượt, tới khi hết số vàng của vòng (số thợ đào + 1 lá).</li>
<li><b>Đào tới than:</b> lá đích lật lên là than thì chỉ lộ ra thôi, vòng vẫn tiếp tục.</li>
<li><b>Hết bài:</b> bộ bài cạn và mọi người hết lá trên tay mà chưa tới vàng thì <b>kẻ phá hoại thắng vòng</b>, chia vàng tương tự (số kẻ phá hoại + 1 lá).</li>
<li><b>Hết 3 vòng:</b> ai nhiều cốm vàng nhất thì <b>thắng trận</b> (hòa thì so số lá vàng, rồi ghế ngồi sớm hơn).</li>
</ul>
<h3>💡 Mẹo</h3>
<p>Thợ đào: mở đường thẳng về đích chưa lộ gần nhất, dùng Bản đồ khi còn 2–3 đích chưa biết. Kẻ phá hoại: đặt lá cụt chặn ngay trước đích, phá Cuốc của người đang xây đường, dùng Đá rơi phá lá then chốt — nhưng đừng lộ quá sớm! Xin thua giữa trận thì trận kết thúc ngay, người còn lại nhiều vàng nhất thắng.</p>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`;
