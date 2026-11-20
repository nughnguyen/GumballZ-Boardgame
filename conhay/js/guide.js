// 🔴 Hướng dẫn Cờ Nhảy — dùng chung cho trang hướng dẫn (luat/) và trong game.
export const GUIDE_HTML = `
<h2>🔴 Cờ Nhảy — luật chơi</h2>
<p><b>Cờ Nhảy</b> (Chinese Checkers) là trò đua bi trên bàn hình sao 6 cánh
<b>121 lỗ</b>: mỗi người có <b>10 bi</b> trong tam giác nhà của mình, ai
đưa hết 10 bi sang tam giác đối diện (tam giác đích) trước thì thắng.</p>
<h3>🎯 Mục tiêu</h3>
<p>Đưa <b>hết 10 bi</b> của mình vào <b>tam giác đối diện</b> (tam giác
đích) trước tiên. Không có ăn quân — bi của bạn và bi đối thủ đều chỉ
là "bệ" để nhảy qua.</p>
<h3>🔴 Bàn cờ</h3>
<p>Bàn hình sao 6 cánh gồm <b>121 lỗ</b>: lục giác giữa (61 lỗ) + 6 tam
giác nhà, mỗi tam giác <b>10 lỗ</b>. Mỗi người chiếm 1 tam giác nhà,
tam giác đích là tam giác <b>đối diện</b> qua tâm bàn.</p>
<h3>🎲 Lượt chơi — 1 nước đi</h3>
<ul>
<li><b>Bước 1 lỗ:</b> dời 1 bi sang <b>1 lỗ kề trống</b> (6 hướng);</li>
<li><b>Nhảy qua bi:</b> nhảy qua <b>1 bi kề</b> (của ai cũng được) sang
<b>lỗ trống ngay sau nó</b> theo cùng hướng;</li>
<li><b>Nhảy liên tiếp:</b> sau 1 cú nhảy, nếu từ lỗ mới lại nhảy tiếp
được thì <b>được nhảy tiếp trong cùng lượt</b> — 1 lượt là 1 bước HOẶC
1 chuỗi nhảy (không được nhảy rồi lại bước, không được nhảy qua lỗ đã
đi qua trong cùng lượt).</li>
</ul>
<h3>💡 Mẹo chơi</h3>
<p><b>Nhảy liên tiếp</b> là cách đi xa nhất — hãy xếp bi của mình thành
"cầu" để bi sau nhảy qua. Đừng để bi tụt lại phía sau: bi nào càng xa
đích càng khó về. Cuối ván, xếp bi vào đích từ <b>đỉnh tam giác vào
trước</b> để khỏi chặn cửa — bi đứng ở hàng cửa (hàng sát ngoài) sẽ
chặn đường bi khác vào.</p>
<h3>🏳️ Xin thua</h3>
<p>Xin thua kết thúc trận ngay: người có tiến độ cao nhất trong số người
không xin thua thắng (hòa tiến độ thì ai còn ít bi ngoài đích hơn
thắng). Nếu mọi người đều không còn nước đi thì ván hòa theo tiến độ.</p>
<h3>👥 Số người</h3>
<p><b>2, 3, 4 hoặc 6 người</b>. 2 người ngồi đối diện nhau; 3 người ngồi
cách nhau 1 tam giác; 4 người thành 2 cặp đối diện; 6 người ngồi đủ 6
tam giác. Đấu máy (Dễ/Khó), chuyền tay chung máy, hoặc online với bạn
qua mã phòng 5 ký tự. Mọi thông tin đều công khai (không có bài ẩn).</p>
`;
export default GUIDE_HTML;
