// 💎 Hướng dẫn Splendor — dùng chung cho trang hướng dẫn (luat/) và trong game.
export const GUIDE_HTML = `
<h2>💎 Splendor — luật chơi</h2>
<p><b>Splendor</b> là trò thu thập đá quý kinh điển: bạn là một thương nhân
thời Phục Hưng, mua đá quý, xây dựng đế chế trang sức và thu hút các quý
tộc đến thăm — ai nhiều điểm nhất khi ván kết thúc thì thắng.</p>
<h3>🎯 Mục tiêu</h3>
<p>Đạt <b>15 điểm</b> trước tiên (điểm đến từ thẻ đã mua + quý tộc). Khi
một người đạt 15+ điểm cuối lượt thì hết vòng hiện tại rồi tính điểm:
ai nhiều điểm nhất thắng; hòa điểm thì ai mua <b>ít thẻ hơn</b> thắng.</p>
<h3>💎 Bộ đá quý + thẻ</h3>
<p><b>Đá quý 5 màu</b> (trắng kim cương 💎, xanh sapphire 💙, lá ngọc lục
bảo 💚, đỏ hồng ngọc ❤️, đen onyx 🖤) + <b>vàng ⭐</b> (hoang dã, thay
cho bất kỳ màu nào). Số đá mỗi màu: <b>4 đá (2 người), 5 đá (3 người),
7 đá (4 người)</b>; vàng luôn <b>5 đá</b>. <b>90 thẻ</b> 3 cấp (40 cấp
1, 30 cấp 2, 20 cấp 3), mỗi cấp <b>4 thẻ lật ngửa</b> trên bàn; mua/giữ
thẻ nào thì lấp lại từ chồng cùng cấp (hết chồng thì ô trống luôn).
<b>Quý tộc: số người + 1 thẻ</b> (3–5 thẻ), mỗi quý tộc <b>+3
điểm</b>.</p>
<h3>🎴 Lượt chơi — làm ĐÚNG 1 việc</h3>
<ul>
<li><b>Lấy 3 đá khác màu nhau</b> (nếu không đủ 3 màu còn đá thì lấy ít
hơn);</li>
<li><b>Lấy 2 đá cùng màu</b> — chỉ khi còn <b>ít nhất 4 đá</b> màu đó;</li>
<li><b>Giữ 1 thẻ</b> (từ bàn hoặc úp từ đầu chồng) <b>+ lấy 1 vàng</b>
nếu còn vàng — mỗi người giữ tối đa <b>3 thẻ</b>;</li>
<li><b>Mua 1 thẻ</b> (từ bàn hoặc thẻ đã giữ) — trả đúng giá ghi trên
thẻ.</li>
</ul>
<h3>💰 Mua thẻ — giảm giá + vàng</h3>
<p>Thẻ đã mua cho <b>giảm giá vĩnh viễn theo màu</b> của thẻ: ví dụ bạn
đã có 2 thẻ xanh thì mọi thẻ cần đá xanh đều rẻ đi 2 đá xanh. <b>Vàng
thay cho bất kỳ màu nào</b> còn thiếu. Thẻ mua được đặt ngửa trước mặt
bạn; điểm của thẻ cộng vào tổng điểm của bạn.</p>
<h3>👑 Quý tộc đến thăm</h3>
<p>Cuối lượt, nếu <b>màu thẻ đã mua</b> của bạn đủ yêu cầu của 1 quý
tộc (chỉ tính thẻ, không tính đá đang cầm) thì quý tộc đó tự đến thăm:
<b>+3 điểm</b>, tối đa <b>1 quý tộc/lượt</b>, không được từ chối. Nếu
đủ điều kiện nhiều quý tộc thì <b>bạn được chọn</b> quý tộc nào đến.</p>
<h3>⚠️ Giới hạn 10 đá</h3>
<p>Cuối lượt, bạn không được giữ quá <b>10 đá</b> (kể cả vàng) — thừa
bao nhiêu thì trả lại ngân hàng bấy nhiêu trước khi hết lượt.</p>
<h3>🏳️ Xin thua</h3>
<p>Xin thua kết thúc trận ngay: người có điểm cao nhất trong số người
không xin thua thắng (hòa điểm thì ít thẻ hơn thắng).</p>
<h3>👥 Số người</h3>
<p>2–4 người. Đấu máy (Dễ/Khó), chuyền tay chung máy, hoặc online với
bạn qua mã phòng 5 ký tự. Mọi thông tin đều công khai (đá đang cầm,
thẻ đã mua/giữ, quý tộc) — chỉ giấu thứ tự chồng bài.</p>
`;
export default GUIDE_HTML;
