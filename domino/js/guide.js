// 📖 Hướng dẫn Domino – nội dung hộp "Cách chơi" trong game, đồng thời là nguồn
// để tools/guide/make.mjs sinh trang huong-dan/index.html (chạy trên máy dev).
export const GUIDE_HTML = `<div class="guide"><h2>📖 Cách chơi Domino</h2>
<p><b>Domino</b> (cờ Domino, bộ Double-6) là trò xếp quân 2–4 người: mỗi người cầm <b>7 quân</b>, lần lượt <b>nối quân vào 2 đầu dây</b> sao cho số nút trùng nhau. Ai <b>hết quân trên tay trước thì thắng ván</b> — hết quân mà không ai đi được nữa thì ván bị khóa, người ít nút nhất thắng!</p>
<h3>1. Bộ quân và chia bài</h3>
<ul>
<li>Bộ Domino có <b>28 quân</b>: mọi cặp số từ 0–0 tới 6–6 (mỗi quân 2 nửa, mỗi nửa 0–6 nút). Quân 2 nửa giống nhau gọi là <b>quân đôi</b> (0–0, 1–1, …, 6–6).</li>
<li>Mỗi người được chia <b>7 quân</b>. Quân còn lại úp thành <b>chồng rút</b>: 2 người thì còn 14 quân, 3 người còn 7 quân, 4 người thì hết sạch chồng rút (28 quân chia vừa đủ).</li>
<li><b>Mở màn:</b> ván đầu, người có <b>đôi lớn nhất</b> trong cả bàn (6–6 to nhất) đi trước bằng đúng quân đó; nếu không ai có đôi thì người có quân nhiều nút nhất đi trước bằng quân đó. Các ván sau, <b>người thắng ván trước</b> mở màn bằng đôi lớn nhất trong tay mình (không có đôi thì quân nhiều nút nhất).</li>
</ul>
<h3>2. Cách nối quân</h3>
<ul>
<li>Dây quân có <b>2 đầu</b>: đầu trái và đầu phải. Muốn đặt 1 quân, 1 trong 2 nửa của quân đó phải <b>trùng số nút với đầu dây</b> muốn nối vào.</li>
<li>Quân đôi đặt <b>ngang</b> (xoay dọc) cho dễ nhìn, nhưng luật vẫn như quân thường.</li>
<li>Bấm 1 quân trên tay để chọn (quân hợp lệ sáng lên), rồi bấm vào <b>đầu dây trái hoặc phải</b> để đặt. Quân chỉ khớp 1 đầu thì chỉ bấm được đầu đó. Bấm lại quân đang chọn để hủy.</li>
<li>Quân mở màn đặt ở giữa, 2 đầu dây là 2 nửa của chính quân đó.</li>
</ul>
<h3>3. Rút quân và bỏ lượt</h3>
<ul>
<li>Không có quân nào hợp lệ thì bấm <b>🎲 Rút 1 quân</b> — rút cho tới khi có quân hợp lệ thì đặt, hoặc chồng rút hết.</li>
<li>Chồng rút hết mà vẫn không có quân hợp lệ thì <b>tự động bỏ lượt</b> — tới lượt người tiếp theo.</li>
<li><b>Ván khóa:</b> cả bàn lần lượt bỏ lượt (không ai đi được nữa) thì ván kết thúc ngay — người <b>ít nút nhất</b> trên tay thắng ván; hòa nút thì ván hòa, không ai được điểm.</li>
</ul>
<h3>4. Tính điểm và thắng trận</h3>
<ul>
<li><b>Thắng ván khi hết quân (Domino!):</b> được <b>tổng số nút còn lại</b> trên tay mọi đối thủ.</li>
<li><b>Thắng ván khóa:</b> được tổng nút của đối thủ <b>trừ đi</b> nút trên tay mình.</li>
<li><b>Ván hòa nút:</b> không ai được điểm.</li>
<li>Chủ phòng chọn <b>điểm mục tiêu</b>: Ván đơn (hết 1 ván là hết trận), 50 / 100 / 150 điểm — ai đủ điểm trước thì <b>thắng trận</b>. Điểm tích lũy qua các ván, người thắng ván trước mở màn ván sau.</li>
</ul>
<h3>5. Mẹo chơi</h3>
<ul>
<li><b>Xả quân to trước:</b> quân nhiều nút mà kẹt lại cuối ván thì mất nhiều điểm — ưu tiên xả 6–6, 6–5, 5–5 sớm.</li>
<li><b>Để ý đầu dây:</b> đầu dây nào ít quân chưa ra thì đối thủ càng khó theo — đặt quân để đầu dây thành số "hiếm" sẽ ép đối thủ phải rút quân.</li>
<li><b>Đếm quân đã ra:</b> nhớ những quân nào đã ra hết rồi — đầu dây là số đó thì đối thủ không thể nối được nữa.</li>
<li><b>Giữ quân đôi muộn:</b> đôi khó nối hơn quân thường (chỉ có 1 số), nhưng đôi cũng là quân nhiều nút — cân nhắc giữa xả sớm và giữ để khóa ván.</li>
</ul>
<h3>6. Chế độ chơi</h3>
<ul>
<li><b>🌐 Online:</b> tạo phòng, gửi mã 5 ký tự cho bạn vào chơi cùng. Chủ phòng chọn điểm mục tiêu (ván đơn / 50 / 100 / 150 điểm), số người tối đa (2–4) và đồng hồ đi (30/60 giây — hết giờ game tự đặt 1 quân hợp lệ giúp bạn, không có quân hợp thì tự rút).</li>
<li><b>🤖 Chơi với máy:</b> chọn số người 2–4 rồi đấu máy. Máy Dễ đánh ngẫu nhiên có chọn lọc (thích xả quân to), Máy Khó tính đầu dây + đếm quân chưa ra để ép đối thủ phải rút.</li>
<li><b>👥 Chuyền tay:</b> 2–4 người chung 1 máy — đầu ván mỗi người xem quân 1 lần rồi che lại, tới lượt ai thì bấm "👁 Xem quân" để xem lại quân của mình.</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`;
