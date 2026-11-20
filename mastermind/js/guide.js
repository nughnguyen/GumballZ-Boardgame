// 📖 Hướng dẫn Mastermind — HTML chèn vào hộp thoại (giống Blokus).
export const GUIDE_HTML = `
<h2>🔴 Cách chơi Mastermind</h2>
<p><b>Mastermind</b> là game suy luận kinh điển: mỗi người giấu 1 mã bí mật 4 chốt (6 màu), rồi luân phiên đoán mã của nhau — ai đoán ra trước thì thắng!</p>
<h3>🔴 Đặt mã bí mật</h3>
<p>Đầu ván, mỗi người tự đặt 1 mã bí mật gồm <b>4 chốt</b>, mỗi chốt 1 trong <b>6 màu</b> (Đỏ, Xanh dương, Vàng, Xanh lá, Cam, Tím) — <b>màu được lặp lại</b> thoải mái (VD: Đỏ · Đỏ · Vàng · Tím). Mã của bạn chỉ mình bạn thấy; đối thủ không bao giờ thấy mã của bạn cho tới khi hết ván.</p>
<h3>🎯 Đoán mã của đối thủ</h3>
<p>Tới lượt mình, bạn xếp 4 chốt màu rồi bấm <b>✅ Đoán</b>. Sau mỗi lượt đoán bạn nhận phản hồi:</p>
<p>⚫ <b>Chốt đen</b> = có 1 chốt đúng màu <b>và đúng vị trí</b>.<br>⚪ <b>Chốt trắng</b> = có 1 chốt đúng màu nhưng <b>sai vị trí</b>.<br>Ví dụ mã bí mật là Đỏ · Vàng · Xanh lá · Tím mà bạn đoán Đỏ · Xanh lá · Vàng · Cam thì được 1 đen (Đỏ đúng chỗ) + 2 trắng (Xanh lá, Vàng đúng màu sai chỗ). Chốt Cam không khớp màu nào nên không tính.</p>
<h3>⚠️ Không tính trùng lặp quá số lần xuất hiện</h3>
<p>Mỗi chốt trong mã bí mật chỉ được tính <b>tối đa 1 lần</b>. Ví dụ mã có 1 chốt Đỏ mà bạn đoán 2 chốt Đỏ thì tối đa chỉ 1 trong 2 được tính (đen hoặc trắng), chốt còn lại không tính. Thứ tự các chốt phản hồi (đen trước, trắng sau) không tiết lộ vị trí — bạn phải tự suy ra!</p>
<h3>🏆 Thắng và thua</h3>
<p>Đoán đúng cả 4 vị trí (4 chốt đen) thì <b>thắng ngay</b>. Mỗi người tối đa <b>10 lượt đoán</b>; nếu cả 2 hết 10 lượt mà chưa ai đoán ra thì so lượt đoán tốt nhất (nhiều chốt đen hơn, rồi nhiều chốt trắng hơn) — vẫn hòa thì hòa. <b>Xin thua</b> thì trận kết thúc ngay, đối thủ thắng.</p>
<h3>💡 Mẹo</h3>
<p>Nước đầu nên đoán 2 màu mỗi màu 2 lần (VD: Đỏ · Đỏ · Vàng · Vàng) để loại được nhiều mã nhất. Luôn gạch bỏ các mã không còn khớp với phản hồi đã có — máy Khó chơi đúng cách này (chiến lược Knuth) nên đoán ra chỉ trong khoảng 5 lượt. Đừng đoán lại mã đã loại!</p>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`;

// Nguồn luật: Mastermind cổ điển (Invicta / Hasbro, 1970) — 4 chốt,
// 6 màu, tối đa 10 lượt đoán, phản hồi đen/trắng theo luật chuẩn;
// đấu song song 2 bàn (mỗi người vừa ra mã vừa đoán) là biến thể 2 người
// của bản gốc 1 người đoán mã máy ra.
export const GUIDE_SOURCE = 'Mastermind cổ điển (Invicta / Hasbro, 1970) — biến thể 2 người đấu song song.';
