// 📖 Hướng dẫn Mậu Binh – nội dung hộp "Cách chơi" trong game, đồng thời là nguồn
// để tools/guide/make.mjs sinh trang huong-dan/index.html (chạy trên máy dev).
export const GUIDE_HTML = `<div class="guide"><h2>📖 Cách chơi Mậu Binh</h2>
<p><b>Mậu Binh</b> (còn gọi là Binh Xập Xám) là trò bài 13 lá của Việt Nam: mỗi người được chia <b>13 lá</b>, xếp thành 3 chi — <b>Đầu 3 lá, Giữa 5 lá, Cuối 5 lá</b>. Xếp xong thì so từng chi với từng đối thủ: thắng 1 chi được +1 điểm, thua −1, hòa 0. Ai nhiều điểm nhất thì thắng ván!</p>
<h3>1. Xếp bài — 3 chi phải mạnh dần</h3>
<ul>
<li><b>Đầu (3 lá):</b> chỉ có Sám cô, Đôi hoặc Mậu thầu. <b>Giữa và Cuối (5 lá):</b> đủ bộ như Poker — Thùng phá sảnh, Tứ quý, Cù lũ, Thùng, Sảnh, Sám cô, Hai đôi, Đôi, Mậu thầu.</li>
<li><b>Quy tắc vàng:</b> Đầu phải yếu hơn hoặc bằng Giữa, Giữa yếu hơn hoặc bằng Cuối. Xếp ngược lại là <b>“binh lủng”</b> — thua cả 3 chi trước mọi người, dù bài có đẹp tới đâu!</li>
<li><b>Mẹo xếp:</b> bài mạnh nhất để xuống Cuối, bài vừa để Giữa, bài yếu nhất lên Đầu. Ví dụ: có Tứ quý thì để Cuối, có Sám cô thì để Giữa, đôi nhỏ thì lên Đầu.</li>
<li><b>Đồng hạng thì so lá to nhất</b> (Át to nhất), rồi so <b>chất</b>: ♠ Bích &gt; ♥ Cơ &gt; ♦ Rô &gt; ♣ Chuồn.</li>
</ul>
<h3>2. Bài đặc biệt — thắng luôn không cần xếp</h3>
<ul>
<li><b>🐉 Sảnh rồng:</b> 13 lá đủ 13 số khác nhau (Át tới K). Hiếm nhất, oai nhất!</li>
<li><b>6 đôi:</b> 6 đôi + 1 lá lẻ. <b>5 đôi 1 sám:</b> 1 bộ ba + 5 đôi.</li>
<li><b>3 thùng:</b> chia được thành 3 chi đều là thùng (cùng chất). <b>3 sảnh:</b> chia được thành 3 chi đều là sảnh (liên tiếp).</li>
<li>Có bài đặc biệt thì game tự nhận biết — bấm <b>“Nhận bài đặc biệt”</b> là thắng luôn cả 3 chi trước mỗi đối thủ (trừ khi đối thủ cũng có bài đặc biệt thì hòa nhau).</li>
</ul>
<h3>3. Tính điểm và tiền cược</h3>
<ul>
<li>Mỗi chi thắng được <b>+1 điểm</b>, thua <b>−1 điểm</b>, hòa 0 — tính trước từng đối thủ rồi cộng lại. Ví dụ 4 người: thắng 2 chi trước người A, thua 1 chi trước người B, hòa người C thì tổng điểm là (2−1) + (−1) + 0 = 0.</li>
<li>Mỗi chi trị giá <b>5 xu</b> (chủ phòng chọn chơi vui 0 xu / 5 xu / 10 xu mỗi chi). Thắng 6 chi thì được 30 xu, thua 6 chi thì mất 30 xu — tiền cộng/trừ thẳng vào <b>ví xu chung</b> của bạn (cùng ví với các game khác); thắng 1 ván còn được +10 xu, chơi 1 ván +2 xu như mọi game.</li>
<li>Thua nhiều hơn số xu đang có thì chỉ trừ tới hết ví (không âm). Chơi vui (0 xu) thì điểm chỉ để tính thắng thua, ví không đụng tới.</li>
</ul>
<h3>4. Mẹo chơi</h3>
<ul>
<li>Đừng tham xếp bài đẹp ở Đầu — Đầu mà mạnh hơn Giữa là lủng ngay, mất trắng 3 chi. An toàn nhất: Đầu chỉ để bài rác hoặc đôi nhỏ.</li>
<li>Có 2 đôi thì tách 1 đôi lên Đầu, 1 đôi xuống Giữa — còn hơn dồn cả 2 đôi xuống Cuối rồi Giữa chẳng còn gì.</li>
<li>Có Sám cô thì để Giữa, đừng để Đầu (Sám ở Đầu thì Giữa phải có Sám to hơn hoặc Thùng/Sảnh mới không lủng).</li>
<li>Bài đặc biệt mà không nhận thì phí lắm — thấy banner vàng hiện lên thì bấm nhận ngay!</li>
</ul>
<h3>5. Chế độ chơi</h3>
<ul>
<li><b>🌐 Online:</b> tạo phòng, gửi mã 5 ký tự cho bạn vào chơi cùng (2–4 người). Chủ phòng chọn mức cược mỗi chi (chơi vui / 5 / 10 xu), số người tối đa và đồng hồ xếp bài (tắt/30/60 giây — hết giờ thì game tự xếp giúp bạn).</li>
<li><b>🤖 Chơi với máy:</b> chọn số người (2–4), Máy Dễ xếp tham lam theo số (thỉnh thoảng binh lủng), Máy Khó duyệt mọi cách xếp để chọn cách thắng nhiều chi nhất.</li>
<li><b>👥 Chuyền tay nhiều người chung 1 máy:</b> mỗi người xếp bài 1 lần rồi che lại đưa máy cho người tiếp theo — bài của ai chỉ người đó thấy.</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`;
