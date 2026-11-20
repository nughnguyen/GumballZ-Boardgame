// 🎨 Hướng dẫn Azul — dùng chung cho trang hướng dẫn (luat/) và trong game.
export const GUIDE_HTML = `
<h2>🎨 Azul — luật chơi</h2>
<p><b>Azul</b> là trò xếp gạch men Bồ Đào Nha: lấy gạch đủ màu ở các xưởng
gạch, xếp vào hàng mẫu rồi ốp lên tường nhà mình sao cho đẹp và nhiều
điểm nhất.</p>
<h3>🎯 Mục tiêu</h3>
<p>Cuối ván, ai nhiều điểm nhất thì thắng. Điểm đến từ việc ốp gạch lên
tường (càng kề nhau càng nhiều điểm) và thưởng cuối ván khi hoàn thành
hàng, cột hoặc đủ 1 màu.</p>
<h3>🧱 Bộ gạch</h3>
<p>100 gạch (20 gạch mỗi màu: <b>xanh dương, vàng, đỏ, đen, trắng</b>).
Xưởng gạch: <b>5 xưởng (2 người), 7 xưởng (3 người), 9 xưởng (4
người)</b>, mỗi xưởng 4 gạch; giữa bàn là khu trung tâm với dấu "1".</p>
<h3>🎴 Lượt chơi — lấy gạch</h3>
<ul>
<li><b>Lấy ở 1 xưởng:</b> lấy <b>tất cả gạch 1 màu</b> trong xưởng đó;
gạch còn lại của xưởng chuyển hết ra trung tâm.</li>
<li><b>Lấy ở trung tâm:</b> lấy <b>tất cả gạch 1 màu</b> đang ở trung
tâm. Ai lấy ở trung tâm đầu tiên trong vòng thì lấy luôn <b>dấu
"1"</b> — được đi đầu vòng sau nhưng phải đặt dấu đó lên hàng sàn
(tính như 1 ô sàn, trừ điểm).</li>
<li><b>Đặt gạch vào 1 hàng mẫu</b> (5 hàng chứa 1/2/3/4/5 gạch) hoặc
đặt thẳng xuống <b>hàng sàn</b>. Mỗi hàng mẫu chỉ chứa 1 màu; không
được đặt màu mà ô tường của hàng đó đã có; hàng đầy rồi thì không thêm
được nữa. Gạch thừa không vừa hàng thì xuống hàng sàn (tối đa 7 ô,
thừa nữa bỏ vào nắp hộp).</li>
</ul>
<h3>🧱 Ốp tường cuối vòng</h3>
<p>Hết gạch để lấy (xưởng + trung tâm đều trống) thì ốp tường:</p>
<ul>
<li>Mỗi <b>hàng mẫu đã đầy</b> thì chuyển 1 gạch lên ô tường cùng màu
của hàng đó và <b>tính điểm ngay</b>: gạch lẻ <b>1 điểm</b>; có gạch
kề ngang thì tính cả hàng ngang, có gạch kề dọc thì tính cả cột dọc,
có cả 2 thì cộng cả 2. Gạch còn lại trong hàng đầy bỏ vào nắp hộp.</li>
<li>Hàng mẫu chưa đầy thì <b>giữ nguyên sang vòng sau</b>.</li>
<li>Hàng sàn trừ điểm: <b>-1, -1, -2, -2, -2, -3, -3</b> (tối đa -14
một vòng); điểm không xuống dưới 0. Dấu "1" về lại trung tâm, người
giữ dấu đi đầu vòng sau.</li>
<li>Túi hết gạch thì đổ gạch trong nắp hộp vào túi rồi xào lại.</li>
</ul>
<h3>🏆 Kết thúc ván + điểm cuối ván</h3>
<p>Ván kết thúc sau vòng mà có người <b>hoàn thành 1 hàng ngang trên
tường</b> (đủ 5 ô 1 hàng). Điểm cuối ván:</p>
<ul>
<li><b>+2 điểm</b> mỗi hàng ngang đủ, <b>+7 điểm</b> mỗi cột dọc đủ,
<b>+10 điểm</b> mỗi màu đủ 5 gạch trên tường.</li>
<li>Hòa điểm thì ai <b>nhiều hàng ngang đủ hơn</b> thắng, rồi ai
<b>nhiều màu đủ hơn</b> thắng.</li>
</ul>
<h3>🏳️ Xin thua</h3>
<p>Xin thua kết thúc trận ngay: trừ điểm hàng sàn hiện tại, cộng điểm
cuối ván theo tường hiện tại, người có điểm cao nhất trong số người
không xin thua thắng.</p>
<h3>👥 Số người</h3>
<p>2–4 người. Đấu máy (Dễ/Khó), chuyền tay chung máy, hoặc online với
bạn qua mã phòng 5 ký tự. Bàn của mọi người đều công khai.</p>
`;
export default GUIDE_HTML;
