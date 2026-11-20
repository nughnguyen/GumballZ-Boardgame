// 📖 Luật The Resistance — trang hướng dẫn (gắn vào #modal-box).
export const GUIDE_HTML = `
<h2>🛡️ The Resistance</h2>
<p><b>Mục tiêu:</b> Game suy luận xã hội — phe <b>Kháng chiến</b> (đa số) phải để 3 nhiệm vụ thành công, phe <b>Gián điệp</b> (thiểu số, biết nhau) phải làm 3 nhiệm vụ thất bại. Không ai biết ai là ai — trừ gián điệp biết nhau!</p>
<h3>🎲 Cách chơi</h3>
<ul>
  <li><b>Vai trò:</b> Đầu ván, mỗi người nhận 1 vai trò bí mật. 5 người → 2 gián điệp; 6 người → 2; 7–9 người → 3; 10 người → 4. <b>Kháng chiến</b> chỉ thấy vai trò của mình. <b>Gián điệp</b> thấy hết đồng đội gián điệp của mình.</li>
  <li><b>Đề cử đội:</b> <b>Thủ lĩnh</b> (xoay vòng) chọn đội cho nhiệm vụ — bấm vào thẻ người chơi để chọn, rồi bấm <b>"📋 Đề cử đội"</b>. Cỡ đội mỗi nhiệm vụ: 5 người [2,3,2,3,3]; 6 người [2,3,4,3,4]; 7 người [2,3,3,4,4]; 8–10 người [3,4,4,5,5].</li>
  <li><b>Bỏ phiếu (công khai):</b> Cả bàn bấm <b>"✅ Đồng ý"</b> hoặc <b>"❌ Từ chối"</b> đội được đề cử — ai cũng thấy ai bỏ phiếu gì. Đa số Đồng ý thì nhiệm vụ diễn ra; Từ chối thì quyền Thủ lĩnh chuyển sang người tiếp theo. <b>5 lần từ chối liên tiếp thì Gián điệp thắng ngay!</b></li>
  <li><b>Làm nhiệm vụ (bí mật):</b> Mỗi người trong đội bí mật chọn <b>"✅ Thành công"</b> hoặc <b>"💥 Thất bại"</b>. <b>Kháng chiến bắt buộc chọn Thành công.</b> Chỉ gián điệp mới được chọn Thất bại. Kết quả chỉ công bố <b>SỐ</b> Thất bại — không bao giờ lộ ai đã chọn gì. Nhiệm vụ thành công khi số Thất bại ít hơn số cần thiết (thường là 1; <b>nhiệm vụ 4 trong ván 7+ người cần 2 Thất bại</b> mới thất bại).</li>
  <li><b>Thắng ván:</b> Phe nào thắng <b>3 nhiệm vụ</b> trước thì thắng ván. Xem kết quả lật bài xong thì bấm <b>"Tiếp theo ▶"</b> để sang nhiệm vụ sau.</li>
</ul>
<h3>🧍 Chơi đơn</h3>
<p>Bạn <b>luôn là Kháng chiến</b>, chơi cùng 4 máy (5 người, 2 gián điệp trong số máy). Bạn bỏ phiếu và làm nhiệm vụ như bình thường; thắng khi phe Kháng chiến thắng 3 nhiệm vụ. <b>Dễ:</b> máy bỏ phiếu/làm nhiệm vụ ngẫu nhiên hơn. <b>Khó:</b> máy suy luận từ lịch sử nhiệm vụ.</p>
<h3>🤖 Chơi với máy</h3>
<p>Bạn + máy đủ 5–10 người, vai trò chia ngẫu nhiên — bạn có thể là <b>Gián điệp</b>! Khi làm gián điệp, bạn thấy đồng đội gián điệp của mình và được chọn Thất bại trong nhiệm vụ.</p>
<h3>👥 Chơi cùng máy (chuyền tay)</h3>
<p>Mỗi người chơi chuyền máy cho nhau. Trước lượt của ai, màn hình che lại — người đó bấm để xem vai trò của mình (chỉ mình thấy), rồi bỏ phiếu / đề cử / làm nhiệm vụ. Đừng để người khác nhìn trộm!</p>
<h3>🏳️ Xin thua</h3>
<p>Xin thua = đầu hàng cả phe: bạn thua, toàn bộ phe của bạn cũng thua, phe còn lại thắng ngay.</p>
<h3>💡 Mẹo suy luận</h3>
<ul>
  <li>Gián điệp thường bỏ phiếu Đồng ý cho đội có gián điệp — để ý ai ủng hộ đội thất bại.</li>
  <li>Nhiệm vụ thất bại mà đội chỉ có 2 người thì 1 trong 2 chắc chắn là gián điệp.</li>
  <li>Thủ lĩnh nên đề cử đội có người từng ở nhiệm vụ thành công.</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>
`;
export default GUIDE_HTML;
