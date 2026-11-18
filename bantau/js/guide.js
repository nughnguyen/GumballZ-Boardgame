// 📖 Hướng dẫn Bắn Tàu – nội dung hộp "Cách chơi" trong game, đồng thời là nguồn
// để tools/guide/make.mjs sinh trang huong-dan/index.html (chạy trên máy dev).
export const GUIDE_HTML = `<div class="guide"><h2>📖 Cách chơi Bắn Tàu</h2>
<p><b>Bắn Tàu</b> là trò hải chiến 2 người: mỗi người giấu một hạm đội trên biển của mình, rồi bắn sang biển địch. <b>Bắn trúng 1 ô thì được bắn tiếp, bắn trượt thì đổi lượt.</b> Ai đánh chìm hết 5 tàu (17 ô) của địch trước thì thắng.</p>
<h3>1. Xếp tàu</h3>
<ul>
<li>Mỗi người có <b>5 tàu, 17 ô</b>: Tàu sân bay 5 ô, Thiết giáp hạm 4 ô, Tuần dương hạm 3 ô, Tàu ngầm 3 ô, Tàu khu trục 2 ô.</li>
<li><b>Kéo 1 tàu từ khay vào biển của mình</b> (giữ chuột hoặc ngón tay rồi kéo thả), hoặc bấm chọn 1 tàu ở khay rồi bấm 1 ô trên lưới để đặt. Khi kéo hoặc di chuột qua lưới, game hiện trước vị trí tàu sẽ nằm (xanh là đặt được, đỏ là không đặt được). Bấm phím <b>R</b>, nút <b>🔄 Xoay</b> hoặc bấm đúp vào tàu trong khay để đổi ngang/dọc – kể cả lúc đang kéo.</li>
<li>Tàu chỉ đặt <b>ngang hoặc dọc</b> (không chéo), không đè lên tàu khác, không tràn khỏi bàn 10×10.</li>
<li>Lười xếp tay thì bấm <b>🎲 Ngẫu nhiên</b>, xếp sai thì bấm <b>🧹 Xóa</b> để xếp lại. Xếp đủ 5 tàu rồi bấm <b>⚓ Sẵn sàng</b> – khi cả 2 người đều sẵn sàng thì trận đấu bắt đầu.</li>
</ul>
<h3>2. Bắn</h3>
<ul>
<li>Bấm 1 ô trên lưới mục tiêu (lưới bên phải) để bắn. <b>Bắn trúng 1 ô thì được bắn tiếp; bắn trượt thì đổi lượt</b> sang địch. Tọa độ ghi theo hàng A–J, cột 1–10 (ví dụ C4, H9).</li>
<li><b>💦 Trượt</b> (dấu O trắng): ô đó là nước trống, lượt đổi sang địch. <b>🎯 Trúng</b> (dấu X đỏ): ô đó có tàu địch, bạn được bắn tiếp. Bắn đủ các ô của 1 tàu thì tàu đó <b>chìm</b> – game báo rõ tên tàu, ví dụ “Bạn đã đánh chìm Tàu khu trục 2 ô”; chìm tàu cũng tính là trúng nên được bắn tiếp.</li>
<li>Không thấy tàu địch trên lưới mục tiêu – chỉ thấy dấu bắn của mình. Tàu địch nào đã chìm thì hiện nguyên hình trên lưới mục tiêu, dạng cháy đen bốc khói sau vụ nổ lớn phủ cả con tàu.</li>
<li>Khi có tàu chìm hoặc ai đó dùng Bẫy/Radar/Bom, game hiện thông báo nổi cho cả 2 bên thấy và ghi vào 📜 Nhật ký trận đấu.</li>
<li>Thắng khi đánh chìm <b>hết 5 tàu (17 ô)</b> của địch trước.</li>
</ul>
<h3>3. Xu và vật phẩm</h3>
<p>Mỗi người bắt đầu với <b>500 xu</b>. Bắn trúng được <b>+50 xu</b>, đánh chìm 1 tàu được thêm <b>+100 xu</b>. Dùng xu mua vật phẩm ở cửa hàng bên dưới lưới mục tiêu:</p>
<ul>
<li><b>🪤 Bẫy – 150 xu, tối đa 2 lần/trận:</b> đặt lên 1 ô có tàu của mình. Khi địch bắn đúng ô bẫy, phát bắn bị vô hiệu (tàu mình không mất ô đó) và bẫy lộ vị trí tàu địch tại <b>cùng tọa độ</b> trên lưới mục tiêu của mình (có tàu thì đánh dấu, không thì đánh dấu ô đó là nước trống). Bẫy dùng 1 lần rồi mất – ô đó bắn lại được. Đặt bẫy xong là hết lượt, dù trước đó có bắn trúng.</li>
<li><b>📡 Radar – 200 xu, tối đa 1 lần/trận:</b> chọn 1 ô tâm trên lưới địch, quét vùng 3×3 quanh đó. Radar lộ đúng các ô có thuyền trong vùng (đánh dấu trên lưới mục tiêu – bắn vào các ô đó là trúng). Dùng radar là hết lượt, dù trước đó có bắn trúng.</li>
<li><b>☢️ Bom hạt nhân – 300 xu, tối đa 1 lần/trận:</b> chọn 1 ô tâm, nổ toàn bộ vùng 3×3 (9 ô đều tính như 9 phát bắn: trúng/trượt, có thể chìm tàu). Dùng bom là hết lượt, dù trúng hay trượt.</li>
<li>⚠️ Dùng vật phẩm hỗ trợ (Bẫy/Radar/Bom) là hết lượt, dù trước đó có bắn trúng. Chỉ có <b>mua</b> vật phẩm là không tốn lượt — mua xong vẫn bắn được trong lượt đó.</li>
<li>Không mua được quá giới hạn, không dùng được khi hết lượt (trừ bẫy thì đặt trong lượt của mình).</li>
</ul>
<h3>4. Mẹo chơi</h3>
<ul>
<li>Bắn theo ô chẵn lẻ (như bàn cờ) để tìm tàu nhanh, vì tàu nhỏ nhất cũng dài 2 ô.</li>
<li>Trúng 1 ô thì bắn các ô kề nó; trúng 2 ô thẳng hàng thì bắn nối dài theo hướng đó tới khi tàu chìm.</li>
<li>Để dành xu mua Radar khi bắn mãi không trúng, mua Bom khi nghi ngờ có cụm tàu, gài Bẫy khi mình đã bị bắn trúng nhiều.</li>
</ul>
<h3>5. Chế độ chơi</h3>
<ul>
<li><b>🌐 Online:</b> tạo phòng, gửi mã 5 ký tự cho bạn vào chơi cùng.</li>
<li><b>🤖 Chơi với máy:</b> máy tự xếp tàu và bắn theo kiểu săn + bám, thỉnh thoảng còn dùng vật phẩm.</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`;
