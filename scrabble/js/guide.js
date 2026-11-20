// 📖 Hướng dẫn Scrabble — HTML chèn vào hộp thoại (giống Blokus).
export const GUIDE_HTML = `
<h2>🔤 Cách chơi Scrabble</h2>
<p><b>Scrabble</b> là game xếp chữ kinh điển: bàn 15×15, mỗi người 7 chữ trên khay, xếp từ nối nhau như ô chữ — ai nhiều điểm nhất thì thắng!</p>
<h3>🔤 Bàn cờ và túi chữ</h3>
<p>Bàn <b>15×15 ô</b>. Túi có <b>100 chữ</b>: A 9, B 2, C 2, D 4, E 12, F 2, G 3, H 2, I 9, J 1, K 1, L 4, M 2, N 6, O 8, P 2, Q 1, R 6, S 4, T 6, U 4, V 2, W 2, X 1, Y 2, Z 1 và 2 ô trống (★, đại diện bất kỳ chữ nào, 0 điểm). Điểm mỗi chữ: 1 điểm A E I O U L N S T R; 2 điểm D G; 3 điểm B C M P; 4 điểm F H V W Y; 5 điểm K; 8 điểm J X; 10 điểm Q Z.</p>
<h3>⭐ Ô thưởng</h3>
<p>Ô <b>đỏ (×3 từ)</b>: cả từ nhân 3. Ô <b>hồng (×2 từ)</b>: cả từ nhân 2 (gồm ô trung tâm ★). Ô <b>xanh đậm (×3 chữ)</b>: chữ đó nhân 3. Ô <b>xanh nhạt (×2 chữ)</b>: chữ đó nhân 2. Ô thưởng chỉ có tác dụng <b>lần đầu</b> có chữ đặt lên đó — chữ đặt sau không được nhân nữa.</p>
<h3>🎯 Nước đầu tiên</h3>
<p>Từ đầu tiên của ván <b>phải phủ ô trung tâm ★</b> (ô hồng ở giữa bàn). Từ thứ 2 trở đi phải <b>nối với chữ đã có</b>: dùng chung ít nhất 1 chữ có sẵn, hoặc chạm (lên / xuống / trái / phải) ít nhất 1 chữ có sẵn.</p>
<h3>✅ Từ hợp lệ và từ phụ</h3>
<p>Từ đặt phải có trong <b>từ điển tiếng Việt không dấu</b> của game (từ 5 chữ lấy từ danh sách Wordle của web, cộng thêm từ 2–4 và 6 chữ thông dụng). Mọi <b>từ phụ</b> (từ vuông góc tạo ra khi đặt chữ kề chữ có sẵn) cũng phải hợp lệ — nếu không, cả nước đi bị từ chối. Đặt 1 chữ kề 2 chữ có sẵn cùng lúc có thể tạo 2 từ phụ, cả 2 đều phải hợp lệ và đều được tính điểm!</p>
<h3>🎉 Bingo +50</h3>
<p>Dùng hết <b>7 chữ trên khay</b> trong 1 nước đi thì được thưởng thêm <b>+50 điểm</b>. Ô trống (★) dùng làm chữ nào cũng được, nhưng luôn tính 0 điểm — bấm vào ô trống trên khay rồi chọn chữ muốn dùng.</p>
<h3>🔀 Đổi chữ và bỏ lượt</h3>
<p>Không đặt được từ thì bấm <b>🔀 Đổi chữ</b> (chọn 1–7 chữ trên khay, rút chữ mới — cần túi còn ít nhất 7 chữ) hoặc <b>🏳️ Bỏ lượt</b>. Bỏ lượt / đổi chữ liên tiếp đủ 2 vòng thì trận kết thúc.</p>
<h3>🏁 Kết thúc và tính điểm</h3>
<p>Hết túi chữ + 1 người đặt hết chữ trên khay thì trận kết thúc: mỗi người <b>trừ điểm các chữ còn lại trên khay</b>, người hết khay được <b>cộng tổng điểm trừ đó</b>. Ai nhiều điểm nhất thắng (hòa thì ít chữ trên khay hơn thắng).</p>
<h3>💡 Mẹo</h3>
<p>Giữ lại 1 nguyên âm (A E I O U) để luôn nối được từ. Chữ hiếm (Q Z J X) đặt lên ô ×3 chữ thì ăn đậm. Đặt từ song song sát từ có sẵn để ăn điểm từ phụ miễn phí. Đừng phí ô trống cho chữ 1 điểm — để dành làm bingo hoặc chữ hiếm.</p>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`;

