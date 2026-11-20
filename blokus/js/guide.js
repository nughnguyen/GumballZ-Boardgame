// 📖 Hướng dẫn Blokus — HTML chèn vào hộp thoại (giống Quoridor).
export const GUIDE_HTML = `
<h2>🟦 Cách chơi Blokus</h2>
<p><b>Blokus</b> là game xếp mảnh kinh điển: bàn 20×20 ô, 4 màu, mỗi màu 21 mảnh. Ai còn ít ô nhất khi hết ván thì thắng!</p>
<h3>🟦 Bàn cờ và mảnh</h3>
<p>Bàn 20×20 ô. Mỗi màu có đủ <b>21 mảnh</b> (1 mảnh 1 ô, 1 mảnh 2 ô, 2 mảnh 3 ô, 5 mảnh 4 ô, 12 mảnh 5 ô — tổng 89 ô). 4 người: mỗi người 1 màu ở 1 góc. 3 người: 3 màu, 1 góc trống. 2 người: mỗi người chơi <b>2 màu ở 2 góc đối diện</b>, 2 màu luân phiên nhau theo lượt.</p>
<h3>🎯 Mảnh đầu tiên phải phủ góc</h3>
<p>Mảnh đầu tiên của mỗi màu <b>phải phủ đúng góc xuất phát</b> của màu đó (ô góc có chấm màu). Từ mảnh thứ 2 trở đi, mảnh mới phải <b>chạm chéo góc</b> ít nhất 1 ô cùng màu đã đặt.</p>
<h3>⚠️ Không được chạm cạnh cùng màu</h3>
<p>Mảnh mới <b>không được chạm cạnh</b> (lên / xuống / trái / phải) bất kỳ ô cùng màu nào — chỉ được chạm chéo góc. Chạm cạnh ô <b>màu khác thì được</b> thoải mái. Mẹo hay: chèn mảnh vào khe giữa 2 màu khác để chặn đường họ!</p>
<h3>🔄 Xoay và lật mảnh</h3>
<p>Bấm chọn 1 mảnh ở khay bên dưới, rồi bấm <b>🔄 Xoay</b> (xoay 90°) hoặc <b>↔️ Lật</b> để đổi hướng. Rê chuột lên bàn để xem trước: ô <b>xanh lá</b> là đặt được, ô <b>đỏ</b> là phạm luật (kèm lý do). Bấm vào 1 ô trên bàn để đặt mảnh — ô bấm là góc trên-trái của mảnh.</p>
<h3>🏳️ Bỏ lượt và kết thúc</h3>
<p>Khi không còn chỗ đặt hợp lệ thì bấm <b>Bỏ lượt</b>. Khi mọi người đều bỏ lượt liên tiếp 1 vòng thì trận kết thúc. Điểm mỗi màu = số ô đã đặt − 89 + thưởng: <b>+15</b> nếu đặt hết 21 mảnh, <b>+5 nữa</b> (tổng +20) nếu mảnh cuối cùng là mảnh 1 ô. Điểm người chơi = tổng điểm các màu của mình — ai cao nhất thắng!</p>
<h3>💡 Mẹo</h3>
<p>Đặt mảnh to trước, mảnh nhỏ để sau — mảnh 1 ô để cuối cùng ăn +20. Giữ nhiều góc chéo mở để luôn có chỗ đi. Đừng để bị kẹt ở góc: mở rộng ra giữa bàn sớm, và chặn góc của đối thủ bằng cách đặt sát mép đường họ muốn đi.</p>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`;
