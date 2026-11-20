// 🎲 Hướng dẫn Backgammon — dùng chung cho trang hướng dẫn (luat/) và trong game.
export const GUIDE_HTML = `
<h2>🎲 Backgammon — luật chơi</h2>
<p><b>Backgammon</b> là game cờ xúc xắc kinh điển: mỗi người có <b>15 quân</b>
trên bàn <b>24 điểm</b>, gieo xúc xắc để đưa quân về sân nhà của mình rồi
<b>ra quân hết trước</b> đối thủ thì thắng.</p>
<h3>🎯 Mục tiêu</h3>
<p>Đưa <b>hết 15 quân</b> của mình về <b>sân nhà</b> (6 điểm cuối theo hướng
đi của mình) rồi <b>ra quân</b> hết trước đối thủ. Đánh trúng quân lẻ của
địch để đưa nó lên vạch giữa, làm chậm đối thủ. Thắng khi địch chưa ra
quân nào là <b>Gammon (×2)</b>, còn quân trên vạch hoặc trong sân nhà của
bạn là <b>Backgammon (×3)</b>.</p>
<h3>🔴 Bàn cờ và thế cờ đầu</h3>
<p>Bàn có <b>24 điểm</b> xếp thành 2 hàng (trên 13–24, dưới 1–12), vạch giữa
chia bàn làm 2 nửa. Thế cờ đầu chuẩn (đối xứng): mỗi bên <b>2 quân ở điểm
24, 5 quân ở điểm 13, 3 quân ở điểm 8, 5 quân ở điểm 6</b> (đổi đầu cho
bên còn lại). Người đi trước được chọn ngẫu nhiên.</p>
<h3>🎲 Lượt chơi — gieo xúc xắc</h3>
<ul>
<li><b>Gieo 2 xúc xắc</b> — mỗi xúc xắc là 1 nước đi (1 quân đi đúng số điểm đó về phía sân nhà của mình). <b>Ra đôi thì được 4 nước</b> bằng số đó.</li>
<li><b>Điểm đến</b> phải trống, có quân mình, hoặc đúng <b>1 quân địch</b> (quân lẻ — blot).</li>
<li><b>PHẢI DÙNG TỐI ĐA xúc xắc:</b> nếu chỉ dùng được 1 trong 2 xúc xắc thì <b>bắt buộc dùng xúc xắc lớn hơn</b>.</li>
</ul>
<h3>💥 Đánh trúng và vạch giữa</h3>
<p>Hạ xuống điểm chỉ có <b>1 quân địch</b> thì quân đó bị đánh trúng và đưa
lên <b>vạch giữa (bar)</b>. Người có quân trên vạch <b>BẮT BUỘC phải vào
lại trước</b> (vào sân nhà của địch, theo số xúc xắc) — không được đi
quân khác khi vạch còn quân. Nếu mọi cửa vào đều bị chặn (2+ quân địch)
thì <b>mất lượt</b>.</p>
<h3>🏠 Ra quân</h3>
<p>Khi cả <b>15 quân đã về sân nhà</b> thì được ra quân: dùng xúc xắc
<b>đúng số điểm</b> để ra quân, hoặc xúc xắc <b>lớn hơn khi không còn
quân nào ở điểm cao hơn</b> trong sân nhà.</p>
<h3>📈 Xúc xắc gấp đôi (doubling cube)</h3>
<p>Cube bắt đầu <b>×1 ở giữa</b>. Trước khi gieo, người đang giữ cube (hoặc
bất kỳ ai khi cube ở giữa) có thể <b>đề nghị gấp đôi</b>: đối thủ
<b>chấp nhận</b> (cube ×2 về tay họ) hoặc <b>từ chối</b> (bạn thắng ngay
với giá trị cube hiện tại).</p>
<h3>🏆 Thắng — Gammon và Backgammon</h3>
<p><b>Thắng thường:</b> ra hết 15 quân trước. <b>Gammon (×2):</b> thắng khi
địch chưa ra quân nào. <b>Backgammon (×3):</b> thắng khi địch chưa ra quân
nào VÀ còn quân trên vạch hoặc trong sân nhà của bạn.</p>
<h3>💡 Mẹo chơi</h3>
<p><b>Làm điểm</b> (2+ quân trên 1 điểm) ở sân nhà địch để chặn đường vào
lại của địch. Tránh để <b>quân lẻ (blot)</b> ở gần quân địch — quân lẻ dễ
bị đánh trúng lên vạch. Khi đang hơn pip rõ rệt, hãy <b>đề nghị gấp
đôi</b> trước khi gieo.</p>
<h3>🏳️ Xin thua</h3>
<p>Xin thua kết thúc ván ngay, đối thủ thắng.</p>
<h3>👥 Chế độ chơi</h3>
<p><b>2 người</b>. Đấu máy (Dễ/Khó), chuyền tay chung máy, hoặc online với
bạn qua mã phòng 5 ký tự. Mọi thông tin đều công khai (không có bài ẩn).</p>
`;
export default GUIDE_HTML;
