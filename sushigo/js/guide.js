// 📖 Hướng dẫn Sushi Go — HTML chèn vào hộp thoại (giống Love Letter).
export const GUIDE_HTML = `
<h2>🍣 Cách chơi Sushi Go</h2>
<p><b>Sushi Go</b> là game bài xếp sushi: 2–5 người, chơi 3 vòng. Mỗi vòng mọi người cùng chọn 1 lá đặt xuống rồi chuyền cả tay bài cho người kế bên — phải nhớ mình đã cho đi những gì!</p>
<h3>🃏 Bộ bài (108 lá)</h3>
<p>Tempura ×14 · Sashimi ×14 · Há cảo ×14 · Maki ×1 ×6 · Maki ×2 ×12 · Maki ×3 ×8 · Nigiri Cá hồi ×10 · Nigiri Mực ×5 · Nigiri Trứng ×5 · Pudding ×10 · Wasabi ×6 · Đũa ×4.</p>
<h3>🎲 Mỗi vòng</h3>
<p>Mỗi người được chia 10 lá (2 người), 9 lá (3 người), 8 lá (4 người) hoặc 7 lá (5 người). Mỗi lượt, <b>mọi người cùng chọn 1 lá</b> đặt ngửa xuống trước mặt, rồi <b>chuyền tay</b>: vòng 1 chuyền sang trái, vòng 2 chuyền sang phải, vòng 3 chuyền sang trái. Hết tay thì hết vòng, tính điểm rồi chia tay mới.</p>
<h3>🏆 Tính điểm cuối mỗi vòng</h3>
<ul>
<li>🍤 <b>Tempura:</b> mỗi cặp = 5 điểm (lẻ 1 lá = 0).</li>
<li>🐟 <b>Sashimi:</b> mỗi bộ 3 = 10 điểm.</li>
<li>🥟 <b>Há cảo:</b> 1 lá = 1, 2 lá = 3, 3 lá = 6, 4 lá = 10, 5 lá trở lên = 15 điểm.</li>
<li>🍣 <b>Maki:</b> đếm biểu tượng — nhiều nhất = 6 điểm, nhì = 3 điểm. Hòa nhất thì chia đều 6 điểm (làm tròn xuống), không có nhì. Hòa nhì thì chia đều 3 điểm.</li>
<li>🍣 <b>Nigiri:</b> Cá hồi = 3, Mực = 3, Trứng = 1 điểm.</li>
<li>🌶️ <b>Wasabi:</b> lá Nigiri <b>kế tiếp</b> đặt lên Wasabi được nhân 3 điểm. Wasabi không có Nigiri theo sau = 0 điểm.</li>
<li>🥢 <b>Đũa:</b> khi đã đặt Đũa xuống từ lượt trước, ở một lượt sau bạn được đặt <b>2 lá cùng lúc</b> rồi trả Đũa về tay (tay này sẽ chuyền đi).</li>
</ul>
<h3>🍮 Pudding — tính cuối trận</h3>
<p>Sau 3 vòng, ai có nhiều Pudding nhất được <b>+6 điểm</b>, ai ít nhất bị <b>−6 điểm</b>. Hòa thì chia đều (làm tròn xuống). Nếu mọi người hòa Pudding thì không ai được/mất điểm. Tổng điểm cao nhất sau 3 vòng + Pudding thì thắng trận!</p>
<h3>💡 Mẹo</h3>
<p>Đừng chỉ nhìn tay mình — hãy nhớ tay bài mình vừa chuyền đi sẽ quay lại sau vài lượt. Giữ Pudding cho vòng cuối, tranh Maki khi thấy đối thủ đang gom, và đừng để Wasabi nằm chơ vơ không có Nigiri.</p>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`;
