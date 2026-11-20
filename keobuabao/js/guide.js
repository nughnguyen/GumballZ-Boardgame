// 📖 Hướng dẫn Kéo Búa Bao — modal luật chơi (giống các game khác).
export const GUIDE_HTML = `
<h2>✌️ Kéo Búa Bao</h2>
<p><b>Mục tiêu:</b> oẳn tù tì 2 người — cả 2 cùng chọn Kéo, Búa hoặc Bao một cách bí mật, lật bài cùng lúc khi cả 2 đã chọn xong. Ai thắng 3 vòng trước thì thắng trận!</p>
<h3>🎮 Cách chơi</h3>
<ul>
<li><b>Kéo ✌️ thắng Bao ✋</b> (cắt bao). <b>Bao ✋ thắng Búa ✊</b> (gói búa). <b>Búa ✊ thắng Kéo ✌️</b> (đập kéo).</li>
<li><b>Chọn bí mật:</b> chạm vào 1 trong 3 nút Kéo / Búa / Bao — lựa chọn của bạn được giữ kín, đối thủ chỉ biết bạn đã chọn xong, không thấy bạn chọn gì.</li>
<li><b>Lật bài cùng lúc:</b> khi cả 2 đã chọn, 2 lựa chọn hiện ra cùng lúc và tính thắng vòng ngay.</li>
<li><b>Cùng lựa chọn → hoà vòng:</b> vòng đó không tính điểm, đá lại vòng mới.</li>
<li><b>Best-of-5:</b> ai thắng 3 vòng trước thì thắng trận. Không giới hạn giờ.</li>
</ul>
<h3>🧍 Chơi đơn (luyện tập)</h3>
<ul>
<li>Bạn đấu best-of-5 với máy: thắng 3 vòng trước máy thì thắng.</li>
<li>Máy Khó sẽ đọc thói quen của bạn (hay ra tay nào nhất) để bắt bài — đổi tay liên tục vào!</li>
</ul>
<h3>🤖 Máy chơi thế nào</h3>
<ul>
<li><b>Máy Khó:</b> chặn lựa chọn bạn hay ra nhất 65% số lần (75% nếu bạn ra trùng 2 vòng liên tiếp). Đi nhanh (400–600ms/lượt).</li>
<li><b>Máy Dễ:</b> chọn ngẫu nhiên, không đọc thói quen. Đi chậm (700–900ms/lượt).</li>
</ul>
<h3>👥 2 người cùng máy</h3>
<ul>
<li>Người 1 chọn trước, người 2 chọn sau — khi tới lượt người 2, màn hình che lại để người 1 không nhìn trộm, bấm "Tôi đã sẵn sàng" để chọn.</li>
</ul>
<h3>🏳️ Xin thua</h3>
<ul>
<li>Xin thua là thua luôn ván đó.</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>
`;
export default GUIDE_HTML;
