// 🏰 Hướng dẫn Carcassonne — dùng chung cho trang hướng dẫn (luat/) và trong game.
export const GUIDE_HTML = `
<h2>🏰 Carcassonne — luật chơi</h2>
<p><b>Carcassonne</b> là trò xếp lá kinh điển: cả bàn cùng nhau xây một vùng quê
thời trung cổ bằng những lá địa hình — thành phố, đường, ruộng và tu viện —
rồi tranh nhau đặt người (meeple) lên các công trình để ghi điểm.</p>
<h3>🎯 Mục tiêu</h3>
<p>Cuối ván, ai nhiều điểm nhất thì thắng. Điểm đến từ việc hoàn thành thành
phố, đường, tu viện trong ván — và ruộng vào cuối ván.</p>
<h3>🧱 Bộ lá</h3>
<p>72 lá (kể cả lá khởi đầu): mỗi lá có 4 cạnh, mỗi cạnh là <b>thành phố</b>,
<b>đường</b> hoặc <b>ruộng</b>; một số lá có <b>tu viện</b> ở giữa, một số
thành phố có <b>khiên</b> (thêm điểm). Lá khởi đầu có 1 thành phố, 1 đường
thẳng và ruộng.</p>
<h3>🎴 Lượt chơi</h3>
<ul>
<li><b>1. Bốc và đặt 1 lá:</b> đặt lá kề ít nhất 1 lá đã có trên bàn, mọi cạnh
chạm nhau phải khớp nhau (thành phố gặp thành phố, đường gặp đường, ruộng
gặp ruộng). Góc chạm góc không tính. Lá nào không đặt được ở đâu thì bị
loại khỏi ván, bốc lá khác.</li>
<li><b>2. Đặt meeple (không bắt buộc):</b> được đặt tối đa 1 meeple lên 1 nét
của lá vừa đặt — đường, thành phố, ruộng hoặc tu viện — nhưng chỉ khi nét
đó chưa có meeple của ai. Mỗi người có 7 meeple.</li>
<li><b>3. Tính điểm nét hoàn thành:</b> nét nào hoàn thành nhờ lá vừa đặt thì
tính điểm ngay, meeple trên nét đó về kho.</li>
</ul>
<h3>🏆 Tính điểm trong ván</h3>
<ul>
<li><b>Đường:</b> hoàn thành khi 2 đầu đều kín (chạm thành phố, tu viện, ngã
ba hoặc khép thành vòng) — <b>1 điểm mỗi ô</b> đường đi qua.</li>
<li><b>Thành phố:</b> hoàn thành khi tường khép kín, không còn cạnh hở —
<b>2 điểm mỗi ô + 2 điểm mỗi khiên</b> trong thành phố.</li>
<li><b>Tu viện:</b> hoàn thành khi 8 ô xung quanh đều có lá — <b>9 điểm</b>.</li>
<li><b>Ruộng:</b> không tính điểm trong ván; meeple ruộng (nông dân) ở lại
tới cuối ván.</li>
<li>Ai có nhiều meeple nhất trong 1 nét thì được trọn điểm; hòa thì cùng
được trọn điểm. 2 nét riêng có thể nối lại thành 1 nét sau này — lúc đặt
meeple chỉ kiểm tra nét lúc đó, về sau nối lại vẫn hợp lệ.</li>
</ul>
<h3>🌾 Tính điểm cuối ván</h3>
<p>Hết chồng lá thì ván kết thúc, tính điểm các nét còn dở và ruộng:</p>
<ul>
<li>Đường dở: <b>1 điểm mỗi ô</b> (như đường hoàn thành).</li>
<li>Thành phố dở: <b>1 điểm mỗi ô + 1 điểm mỗi khiên</b> (một nửa).</li>
<li>Tu viện dở: <b>1 điểm mỗi lá</b> (lá tu viện + mỗi lá kề có mặt).</li>
<li>Ruộng: <b>3 điểm cho mỗi thành phố ĐÃ HOÀN THÀNH</b> mà ruộng đó chạm
tới (mỗi thành phố tính 1 lần cho 1 ruộng). Ai có nhiều nông dân nhất
trong ruộng thì được điểm, hòa thì cùng được trọn điểm.</li>
</ul>
<h3>🏳️ Xin thua</h3>
<p>Xin thua kết thúc trận ngay: tính điểm cuối ván như bình thường, người có
điểm cao nhất trong số người không xin thua thắng.</p>
<h3>👥 Số người</h3>
<p>2–5 người. Đấu máy (Dễ/Khó), chuyền tay chung máy, hoặc online với bạn
qua mã phòng 5 ký tự.</p>
`;
export default GUIDE_HTML;
