// 📖 Hướng dẫn Rắn và Thang – nội dung hộp "Cách chơi" trong game, đồng thời
// là nguồn để tools/guide/make.mjs sinh trang huong-dan/index.html (chạy trên máy dev).
export const GUIDE_HTML = `<div class="guide"><h2>📖 Cách chơi Rắn và Thang</h2>
<p><b>Rắn và Thang</b> là trò chơi đua về đích bằng xúc xắc, 2–4 người chơi cùng chạy trên 1 bàn cờ 100 ô. Ai về <b>đúng ô 100</b> trước thì thắng. Trên đường chạy có <b>thang</b> để leo tắt lên cao và có <b>rắn</b> cắn trượt tuột xuống thấp — thắng thua chủ yếu nhờ may mắn!</p>
<h3>1. Bàn cờ 100 ô — đánh số kiểu rắn bò</h3>
<ul>
<li>Bàn có 10 hàng × 10 cột = <b>100 ô</b>, đánh số từ <b>ô 1 ở góc dưới-trái</b> lên tới <b>ô 100 ở góc trên-trái</b>.</li>
<li>Số ô chạy kiểu rắn bò: hàng 1 (ô 1–10) đi <b>trái → phải</b>, hàng 2 (ô 11–20) đi <b>phải → trái</b>, cứ thế xen kẽ lên trên.</li>
<li>Ai cũng bắt đầu ở <b>ô xuất phát</b> (ngoài bàn), tung xúc xắc rồi đi tiến từng ô một theo đúng thứ tự số.</li>
</ul>
<h3>2. Tung xúc xắc và di chuyển</h3>
<ul>
<li>Tới lượt mình thì bấm <b>🎲 Tung xúc xắc</b>: xúc xắc ra số nào (1–6) thì quân cờ đi tiến bấy nhiêu ô.</li>
<li><b>Tung được 6 thì được tung tiếp</b> 1 lần nữa ngay — tung 6 liên tiếp thì cứ tung tiếp hoài!</li>
<li>Quân cờ của mỗi người có màu riêng: 🔴 Đỏ, 🔵 Xanh dương, 🟢 Xanh lá, 🟡 Vàng. Nhiều quân cùng 1 ô thì xếp lệch nhau 1 chút để vẫn nhìn thấy hết.</li>
</ul>
<h3>3. Thang — leo tắt lên cao 🪜</h3>
<ul>
<li>Đáp đúng <b>chân thang</b> thì leo ngay lên <b>đầu thang</b>. Bàn này có 10 cái thang: 2→38, 7→14, 8→31, 15→26, 21→42, 28→84, 36→44, 51→67, 71→91, 80→100.</li>
<li>Thang dài nhất là <b>28→84</b> (nhảy 56 ô 1 lần) và thang <b>80→100</b> đưa thẳng về đích!</li>
<li>Đáp xuống <b>đầu thang</b> thì không có gì xảy ra — chỉ chân thang mới leo được.</li>
</ul>
<h3>4. Rắn — trượt tuột xuống thấp 🐍</h3>
<ul>
<li>Đáp đúng <b>đầu rắn</b> thì trượt ngay xuống <b>đuôi rắn</b>. Bàn này có 10 con rắn: 16→6, 47→26, 49→11, 56→53, 62→19, 64→60, 87→24, 93→73, 95→75, 98→78.</li>
<li>Rắn dài nhất là <b>87→24</b> (tuột 63 ô 1 lần) — đang gần về đích mà dính rắn này thì đau lắm!</li>
<li>Đáp xuống <b>đuôi rắn</b> thì không có gì xảy ra. Trúng thang hay rắn xong thì dừng luôn, không leo/trượt tiếp nữa.</li>
</ul>
<h3>5. Về đích — phải đúng ô 100</h3>
<ul>
<li>Muốn thắng phải về <b>đúng ô 100</b>. Đang ở ô 97 mà tung 4 (97 + 4 = 101) thì <b>đứng yên tại chỗ</b>, không đi — chờ lượt sau tung đúng số.</li>
<li>Tung 6 mà thừa vẫn được tung tiếp (vì tung 6 luôn được tung lại).</li>
<li>Người đầu tiên về ô 100 thắng ngay, ván kết thúc. Có thể bấm <b>🏳️ Xin thua</b> để rời ván — người còn lại cuối cùng thắng.</li>
</ul>
<h3>6. Chế độ chơi &amp; Máy AI</h3>
<ul>
<li><b>🌐 Chơi online:</b> bấm <b>🌐 Online</b> ở màn hình chính rồi <b>Tạo phòng online</b> — gửi mã phòng 5 ký tự (hoặc link mời) cho bạn; bạn nhập mã rồi bấm <b>Vào</b>. Chơi online đúng 2 người. Số xúc xắc do người tới lượt tung ra, gửi kèm trong nước đi nên 2 bên luôn thấy cùng 1 kết quả. Nếu đối thủ mất kết nối thì máy sẽ tung thay sau vài giây; chủ phòng rời thì phòng giải tán.</li>
<li><b>Đấu với Máy:</b> bạn với 1 máy. Máy <b>Dễ</b> và máy <b>Khó</b> chơi giống hệt nhau — trò này hoàn toàn dựa vào may mắn, máy chỉ tung xúc xắc công bằng như bạn, không gian lận, không tính toán gì được. Hai nút Dễ/Khó chỉ để giao diện đồng bộ với các game khác thôi.</li>
<li><b>2–4 Người chơi:</b> 2–4 người ngồi chung 1 máy, thay phiên nhau tung xúc xắc. Chọn số người ở màn hình chính rồi nhập tên từng người.</li>
</ul>
<h3>7. Mẹo cho người mới</h3>
<ul>
<li>Trò này <b>không có chiến thuật</b> — thắng thua nhờ xúc xắc, nên cứ thoải mái mà chơi, hồi hộp nhất là lúc sắp về đích!</li>
<li>Nhớ các chân thang gần: ô <b>2, 7, 8, 15, 21, 28</b> đều có thang — đầu ván mà tung trúng là bay xa ngay.</li>
<li>Cẩn thận các đầu rắn cuối bàn: ô <b>87, 93, 95, 98</b> — gần về đích mà dính rắn là tuột về giữa bàn.</li>
<li>Đang ở ô 97–99 thì chỉ mong tung đúng 3–2–1: tung thừa là đứng yên, hồi hộp lắm đấy!</li>
</ul></div>`;
