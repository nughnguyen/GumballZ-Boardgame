// 📖 Hướng dẫn Liêng – nội dung hộp "Cách chơi" trong game, đồng thời là nguồn
// để tools/guide/make.mjs sinh trang huong-dan/index.html (chạy trên máy dev).
export const GUIDE_HTML = `<div class="guide"><h2>📖 Cách chơi Liêng</h2>
<p><b>Liêng</b> là trò bài 3 lá của Việt Nam: mỗi người được chia <b>3 lá</b>, góp gà rồi cược 1 vòng <b>Tố / Theo / Bỏ</b>. Hết vòng cược thì lật bài — bài to nhất hốt hết gà! Sáp to nhất, rồi tới Liêng, Ảnh, rồi mới tính điểm.</p>
<h3>1. Thứ tự bài (to → nhỏ)</h3>
<ul>
<li><b>🃏 Sáp:</b> 3 lá cùng số (vd. 3 con 7). Sáp Át (3 con Át) là to nhất trong tất cả các bài.</li>
<li><b>🌉 Liêng:</b> 3 lá liên tiếp (vd. 5-6-7, J-Q-K, Q-K-Át). <b>Q-K-Át</b> là Liêng to nhất, <b>Át-2-3</b> là Liêng nhỏ nhất.</li>
<li><b>🎭 Ảnh:</b> 3 lá đều là lá tây (J, Q, K) nhưng không liên tiếp (vd. J-J-Q, K-K-Q). J-Q-K đã là Liêng nên không tính là Ảnh.</li>
<li><b>🔢 Điểm:</b> cộng điểm 3 lá rồi lấy chữ số hàng đơn vị — Át = 1, 2–9 đúng số, 10/J/Q/K = 10. 9 nút là to nhất, 0 nút gọi là <b>Bù</b>.</li>
<li><b>Bằng bậc thì so lá to nhất</b> (Át to nhất), rồi so <b>chất</b>: ♠ Bích &gt; ♥ Cơ &gt; ♦ Rô &gt; ♣ Chuồn.</li>
</ul>
<h3>2. Góp gà và vòng cược</h3>
<ul>
<li>Đầu ván, mỗi người <b>góp gà</b> 5 xu (hoặc 10 xu, hoặc chơi vui không cược — do chủ phòng chọn). Người không đủ xu vẫn chơi được nhưng <b>không được chia gà</b>.</li>
<li>Chia 3 lá xong thì cược 1 vòng, bắt đầu từ người sau nhà cái: <b>Tố</b> (nâng gà thêm 5 hoặc 10 xu), <b>Theo</b> (bỏ thêm cho bằng gà), <b>Bỏ</b> (úp bài, mất số xu đã góp).</li>
<li>Mỗi vòng chỉ được <b>Tố tối đa 3 lần</b>. Hết 3 lần thì chỉ còn Theo hoặc Bỏ.</li>
<li>Vòng cược kết thúc khi mọi người còn lại đều đã hành động và góp bằng nhau — hoặc khi chỉ còn 1 người chưa Bỏ.</li>
</ul>
<h3>3. Lật bài và chia gà</h3>
<ul>
<li><b>Lật bài:</b> bài to nhất hốt hết gà. Hòa bài thì <b>chia đều gà</b>.</li>
<li><b>Hốt gà không cần lật:</b> nếu mọi người khác đều Bỏ thì người còn lại hốt gà mà không cần lật bài.</li>
<li>Người không góp gà (không đủ xu) mà bài to nhất thì <b>không được chia gà</b> — gà về người đã góp có bài to nhất.</li>
<li>Tiền thắng cược cộng vào <b>ví xu chung</b> của bạn (cùng ví với các game khác); thắng 1 ván còn được +10 xu, chơi 1 ván +2 xu như mọi game.</li>
</ul>
<h3>4. Mẹo chơi</h3>
<ul>
<li>Bài 8–9 nút hoặc có Sáp/Liêng/Ảnh thì mạnh dạn <b>Tố</b> để gà to lên; bài 0–4 nút mà bị Tố thì nên <b>Bỏ</b> sớm cho đỡ mất xu.</li>
<li>Thỉnh thoảng <b>bluff</b> (Tố khi bài yếu) cũng được — nhưng đừng bluff hoài, người ta bắt bài thì mất gà oan.</li>
<li>Để ý gà: Tố 10 xu khi gà đã to thì người khác phải suy nghĩ kỹ mới dám Theo.</li>
</ul>
<h3>5. Chế độ chơi</h3>
<ul>
<li><b>🌐 Online:</b> tạo phòng, gửi mã 5 ký tự cho bạn vào chơi cùng (2–6 người). Chủ phòng chọn mức góp gà (chơi vui / 5 / 10 xu), số người tối đa và đồng hồ đi (tắt/30/60 giây — hết giờ mà chưa hành động: không cần thêm xu thì tự Theo, còn không thì tự Bỏ).</li>
<li><b>🤖 Chơi với máy:</b> chọn số người (2–6), Máy Dễ đánh lỏng tay, Máy Khó đánh theo sức mạnh bài và tỉ lệ gà.</li>
<li><b>👥 Chuyền tay nhiều người chung 1 máy:</b> mỗi người xem bài 1 lần rồi che lại đưa máy cho người tiếp theo — bài của ai chỉ người đó thấy.</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`;
