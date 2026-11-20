// 📖 Hướng dẫn Love Letter — dùng chung cho trang hướng dẫn + hộp trong game.
export const GUIDE_HTML = `
<h2>💌 Love Letter — Cách chơi</h2>
<p><b>Love Letter</b> là game bài suy luận 2–4 người: mỗi người cầm 1 lá bài bí mật, lần lượt bốc thêm 1 lá rồi đánh 1 lá để loại đối thủ hoặc bảo vệ mình. Ai thắng vòng nhận 1 dấu Yêu 💌 — đủ số dấu thì thắng cả trận.</p>
<h3>🎯 Mục tiêu</h3>
<ul>
<li>Loại hết đối thủ trong vòng, hoặc khi bộ bài hết thì cầm lá cao nhất.</li>
<li>Số dấu Yêu cần để thắng trận: <b>2 người: 7 dấu · 3 người: 5 dấu · 4 người: 4 dấu</b>.</li>
</ul>
<h3>🃏 Bộ bài (16 lá)</h3>
<ul>
<li><b>🛡️ Vệ binh (1) ×5</b> — chọn 1 người + đoán 1 lá (2–8): đoán đúng thì người đó bị loại.</li>
<li><b>⛪ Linh mục (2) ×2</b> — xem bí mật bài trên tay 1 người khác.</li>
<li><b>⚖️ Nam tước (3) ×2</b> — so bài với 1 người: ai thấp hơn bị loại (hòa thì không sao).</li>
<li><b>🌸 Thị nữ (4) ×2</b> — bạn được bảo vệ khỏi mọi hiệu ứng cho tới lượt sau.</li>
<li><b>🤴 Hoàng tử (5) ×2</b> — chọn 1 người (kể cả mình): bỏ bài trên tay rồi bốc lá mới.</li>
<li><b>👑 Quốc vương (6) ×1</b> — đổi bài trên tay với 1 người khác.</li>
<li><b>🎀 Nữ bá tước (7) ×1</b> — nếu đang cầm chung với Quốc vương / Hoàng tử thì <b>bắt buộc</b> đánh lá này.</li>
<li><b>👸 Công chúa (8) ×1</b> — nếu phải bỏ lá này vì bất cứ lý do gì thì bạn bị loại ngay.</li>
</ul>
<h3>🔄 Diễn biến 1 vòng</h3>
<ul>
<li>Xào bài, úp 1 lá ra ngoài (không ai được xem). Chơi 2 người thì lật thêm 3 lá ngửa cho mọi người thấy.</li>
<li>Chia mỗi người 1 lá. Tới lượt: <b>bốc 1 lá</b> (cầm 2 lá) rồi <b>đánh 1 lá</b> và giải hiệu ứng của nó.</li>
<li>Vòng kết thúc khi bộ bài hết hoặc chỉ còn 1 người sống. Hết bài thì so lá đang cầm — cao nhất thắng vòng; hòa thì so tổng các lá đã bỏ; vẫn hòa thì cùng nhận dấu Yêu.</li>
<li>Người thắng vòng được 1 dấu Yêu 💌 và bắt đầu vòng sau.</li>
</ul>
<h3>💡 Mẹo</h3>
<ul>
<li>Nhớ các lá đã bỏ: còn ít lá cao trong bộ bài thì Vệ binh nên đoán lá thấp.</li>
<li>Cầm Công chúa thì đừng để bị Hoàng tử / Vệ binh nhắm tới — Thị nữ là bạn tốt nhất.</li>
<li>Nam tước chỉ nên so khi bài mình cao (6–8) hoặc đã biết bài đối thủ thấp.</li>
<li>Hoàng tử nhắm vào người bạn nghi cầm Công chúa; cầm lá thấp thì Hoàng tử chính mình để đổi bài.</li>
</ul>
<h3>🕹️ Chế độ chơi</h3>
<ul>
<li><b>Chơi đơn:</b> bạn đấu với máy (Máy Dễ đánh bừa, Máy Khó tính xác suất theo lá đã bỏ).</li>
<li><b>Online:</b> tạo phòng, gửi mã 5 ký tự cho bạn bè (2–4 người).</li>
<li><b>Chuyền tay:</b> 2–4 người chơi trên cùng 1 máy — tới lượt ai thì người đó bấm xem bài, đánh xong nhớ che lại.</li>
</ul>
<div class="btns"><button class="btn big pri" id="m-close">Đã hiểu — chơi thôi!</button></div>
`;
