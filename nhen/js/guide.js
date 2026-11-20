// 📖 Hướng dẫn Nhện — modal luật chơi (giống các game khác).
export const GUIDE_HTML = `
<h2>🕷️ Nhện (Spider Solitaire)</h2>
<p><b>Mục tiêu:</b> xếp các lá thành dãy K→A cùng chất để thu lại. Thu đủ 8 dãy thì thắng!</p>
<h3>🎮 Cách chơi</h3>
<ul>
<li><b>Di chuyển:</b> bấm 1 lá (hoặc dãy lá) để chọn, bấm cột đích để đặt — hoặc kéo-thả lá bằng chuột/chạm.</li>
<li>Xếp lá (hoặc 1 dãy lá cùng chất liên tiếp giảm dần) lên lá lớn hơn 1 bậc bất kỳ chất nào (ví dụ 8♥ lên 9♠ được).</li>
<li>Chỉ dãy cùng chất mới được di chuyển nguyên dãy. Cột trống nhận bất kỳ lá/dãy nào.</li>
<li>Xếp đủ 1 dãy K→A cùng chất thì dãy tự thu lại (+100 điểm).</li>
<li><b>Chia thêm:</b> nút "🃏 Chia thêm" chia 1 lá vào mỗi cột (tối đa 5 lần, mỗi lần −5 điểm).</li>
<li><b>Gợi ý:</b> tối đa 5 lần/ván — chỉ 1 nước đi tốt. <b>Hoàn tác:</b> tối đa 10 lần/ván.</li>
</ul>
<h3>🎚️ Độ khó</h3>
<ul>
<li><b>Dễ:</b> 1 chất (♠) — dễ xếp dãy cùng chất nhất.</li>
<li><b>Vừa:</b> 2 chất (♠♥).</li>
<li><b>Khó:</b> 4 chất — khó nhất, cần xếp dãy cùng chất thật khéo.</li>
</ul>
<h3>🏆 Thắng / thua</h3>
<ul>
<li><b>Chơi đơn:</b> thắng khi thu đủ 8 dãy. Thắng cộng thưởng theo độ khó (Dễ +0, Vừa +100, Khó +200). Hết nước đi mà hết bài chia thì thua.</li>
<li><b>Đấu máy / online / chung máy:</b> đua — ai thu đủ 8 dãy trước thì thắng; hết 180 giây thì ai thu nhiều dãy hơn (rồi nhiều điểm hơn) thắng, bằng nhau thì hoà. Kẹt hoặc xin thua thì bị loại, người còn lại chơi tiếp.</li>
<li><b>Chung máy 2 người:</b> 2 người thay phiên nhau đi trên cùng 1 bàn phím — bấm lá của mình để đi.</li>
</ul>
<h3>🤖 Máy chơi thế nào</h3>
<ul>
<li><b>Máy Khó:</b> ưu tiên nước thu được dãy, rồi nước lật lá úp, rồi nước tạo cột trống, rồi nước xếp dãy cùng chất dài nhất; đi nhanh (300–500ms/nước).</li>
<li><b>Máy Dễ:</b> đi ngẫu nhiên 1 nước hợp lệ; đi chậm (800–1200ms/nước).</li>
</ul>
<h3>🏳️ Xin thua</h3>
<ul>
<li>Xin thua là thua luôn ván đó (chơi đơn thua ngay; đua thì các người còn lại chơi tiếp).</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>
`;
export default GUIDE_HTML;
