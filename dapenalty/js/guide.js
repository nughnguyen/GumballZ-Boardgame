// 📖 Hướng dẫn Đá Penalty — modal luật chơi (giống các game khác).
export const GUIDE_HTML = `
<h2>⚽ Đá Penalty</h2>
<p><b>Mục tiêu:</b> sút luân lưu — người sút chọn 1 ô trong khung thành, thủ môn chọn 1 ô để đổ người. Cùng ô thì bị cản phá chắc chắn, ô kề thì 50% bị cản phá, ô xa thì vào lưới!</p>
<h3>🎮 Cách chơi</h3>
<ul>
<li><b>Khung thành chia 3×3 ô:</b> trên/giữa/dưới × trái/giữa/phải. Chạm vào 1 ô để chọn — lựa chọn của bạn được giữ bí mật, chỉ lật ra khi cả 2 bên đã chọn xong.</li>
<li><b>Người sút:</b> chọn ô muốn sút vào. <b>Thủ môn:</b> chọn ô muốn đổ người tới.</li>
<li><b>Cùng ô → 🧤 CẢN PHÁ chắc chắn!</b> <b>Ô kề</b> (chung cạnh) → thủ môn với tay cản phá được 50%. <b>Ô xa → ⚽ VÀO!</b> Bóng bay tới ô sút, thủ môn đổ người tới ô bắt.</li>
<li><b>Đấu 2 người:</b> luân phiên sút/bắt, 5 vòng mỗi người (10 cú sút). Ai ghi nhiều bàn hơn thì thắng.</li>
<li><b>Kết thúc sớm:</b> nếu đối thủ không còn đủ cú sút để gỡ hoà thì ván kết thúc ngay, không cần đá hết 5 vòng.</li>
<li><b>Hoà 5-5 → loạt luân lưu:</b> mỗi vòng 1 cú/người, ai dẫn trước sau 1 vòng thì thắng. Quá 10 vòng luân lưu vẫn hoà thì hoà.</li>
</ul>
<h3>🧍 Chơi đơn (luyện tập)</h3>
<ul>
<li>Bạn sút 10 cú liên tiếp trước thủ môn máy.</li>
<li>Ghi <b>≥ 7 bàn / 10 cú</b> thì thắng. Ít hơn thì thua — tập lại nhé!</li>
<li>Thủ môn máy Khó sẽ đọc thói quen sút của bạn (hay sút góc nào) để bắt bài — đổi góc liên tục vào!</li>
</ul>
<h3>🤖 Máy chơi thế nào</h3>
<ul>
<li><b>Máy Khó:</b> thủ môn bắt bài vùng bạn hay sút nhất; người sút chọn góc và tránh vùng thủ môn hay đổ. Đi nhanh (400–600ms/lượt).</li>
<li><b>Máy Dễ:</b> chọn ngẫu nhiên, không đọc thói quen. Đi chậm (700–900ms/lượt).</li>
</ul>
<h3>👥 2 người cùng máy</h3>
<ul>
<li>Người sút chọn trước, người bắt chọn sau — khi tới lượt thủ môn, màn hình che lại để người sút không nhìn trộm, bấm "Tôi đã sẵn sàng" để chọn.</li>
</ul>
<h3>🏳️ Xin thua</h3>
<ul>
<li>Xin thua là thua luôn ván đó.</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>
`;
export default GUIDE_HTML;
