// 📖 Luật Đoán Hành Động — trang hướng dẫn (gắn vào #modal-box).
export const GUIDE_HTML = `
<h2>🎭 Đoán Hành Động</h2>
<p><b>Mục tiêu:</b> Một người làm diễn viên — nhận 1 từ bí mật rồi diễn bằng cơ thể (không nói, không ra tiếng). Người còn lại đoán từ đó bằng cách gõ vào ô đoán. Ai đoán đúng trước thì được điểm!</p>
<h3>🎲 Cách chơi</h3>
<ul>
  <li><b>Diễn viên:</b> Bấm <b>"Bắt đầu diễn"</b> để bắt đầu 60 giây. Từ bí mật chỉ mình bạn thấy (màn hình người khác không hiện). Diễn bằng tay chân, nét mặt — không được nói, không được viết chữ, không được chỉ vào đồ vật có tên đó.</li>
  <li><b>Người đoán:</b> Gõ từ bạn đoán vào ô rồi bấm <b>Đoán</b>. Mỗi người chỉ được đoán <b>1 lần</b> cho mỗi từ, nên nghĩ kỹ trước khi gõ! Lượt đoán của bạn chỉ diễn viên thấy — diễn viên bấm ✓ để chấm.</li>
  <li><b>Chấm điểm:</b> Lượt đoán đúng <b>đầu tiên</b> được <b>+10 điểm</b>, diễn viên được <b>+5 điểm</b> vì diễn hay. Đoán sai không mất điểm nhưng mất lượt đoán của từ đó.</li>
  <li><b>Hết 60 giây:</b> Không ai đoán ra thì từ lộ ra, 0 điểm cho mọi người.</li>
  <li><b>Bỏ qua:</b> Diễn viên được bỏ qua tối đa <b>2 từ / ván</b> (bốc từ mới, 0 điểm).</li>
  <li><b>Ván đấu:</b> 3 vòng — mỗi vòng mọi người diễn 1 lần. Hết 3 vòng, ai nhiều điểm nhất thắng; hòa điểm thì so số lần đoán đúng, rồi tới ghế ngồi.</li>
</ul>
<h3>🧍 Chơi đơn</h3>
<p>Bạn xem mô tả hành động (ví dụ: "Giả vờ đang bơi, tay quạt nước") rồi chọn từ khớp nhất trong 4 phương án. 10 từ / ván, đoán đúng từ <b>8/10</b> mới thắng.</p>
<h3>🤖 Chơi với máy</h3>
<ul>
  <li>Khi <b>bạn diễn</b>, máy sẽ gõ lượt đoán vào nhật ký sau vài giây — bạn bấm ✓ để chấm lượt nào đúng.</li>
  <li>Khi <b>máy diễn</b>, bạn gõ từ đoán như bình thường; máy tự chấm cho bạn.</li>
  <li><b>Dễ:</b> máy đoán đúng khoảng 35% số từ. <b>Khó:</b> khoảng 65%.</li>
</ul>
<h3>🏳️ Xin thua</h3>
<p>2 người: ván kết thúc ngay, người còn lại thắng. 3+ người: ván tiếp tục không có bạn (lượt diễn của bạn bị bỏ qua); chỉ còn 1 người chưa thua thì người đó thắng ngay.</p>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>
`;
export default GUIDE_HTML;
