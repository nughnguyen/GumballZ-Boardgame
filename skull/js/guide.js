// 📖 Hướng dẫn Skull — HTML chèn vào hộp thoại (giống Saboteur).
export const GUIDE_HTML = `
<h2>🌹 Cách chơi Skull</h2>
<p><b>Skull</b> là game bài bluff (đánh lừa) nổi tiếng: 3–6 người, mỗi người có <b>4 đĩa úp</b> — <b>3 hoa hồng</b> 🌹 và <b>1 đầu lâu</b> 💀 — chỉ mình bạn biết đĩa nào là đĩa nào. Đặt đĩa, ra giá, lật đĩa — ai được <b>2 điểm</b> trước thì thắng trận!</p>
<h3>🌹 Mỗi người có gì?</h3>
<ul>
<li><b>4 đĩa:</b> 3 hoa hồng 🌹 và 1 đầu lâu 💀. Đĩa úp xuống, chỉ chủ nó biết mình đặt đĩa nào.</li>
<li><b>1 thảm</b> để đặt đĩa úp lên, và <b>điểm</b> (cần 2 điểm để thắng trận).</li>
</ul>
<h3>🎲 Mỗi vòng có 3 giai đoạn</h3>
<p><b>1. Đặt đĩa:</b> lần lượt từng người đặt úp <b>đúng 1 đĩa</b> lên thảm của mình (bắt đầu từ người mở vòng, xoay ghế mỗi vòng). Đặt xong thì sang ra giá.</p>
<p><b>2. Ra giá:</b> người sau người đặt cuối cùng ra giá trước. Lần lượt mỗi người <b>ra giá cao hơn</b> (tối thiểu 1, tối đa bằng tổng số đĩa trên bàn) hoặc <b>bỏ giá</b>. Ai bỏ rồi thì không ra giá lại được. Tới khi chỉ còn 1 người chưa bỏ thì người đó <b>thắng giá</b> và phải lật đúng số đĩa đã ra giá. Nếu ra giá bằng đúng tổng số đĩa trên bàn thì thắng giá ngay, không ai trả cao hơn được. <i>Luật nhà: chưa có giá nào thì người đầu tiên phải ra giá ít nhất 1 (không được bỏ).</i></p>
<p><b>3. Lật đĩa:</b> người thắng giá lật từng đĩa một. <b>Lượt lật đầu tiên bắt buộc là đĩa trên cùng của chính mình</b>, sau đó lật đĩa trên cùng của thảm bất kỳ (chọn thảm nào cũng được, thứ tự nào cũng được) cho tới đủ số đĩa đã ra giá.</p>
<h3>🏆 Kết quả vòng</h3>
<ul>
<li><b>Toàn hoa hồng:</b> lật đủ số đĩa đã ra giá mà toàn hoa hồng thì người thắng giá <b>+1 điểm</b>.</li>
<li><b>Gặp đầu lâu:</b> lật trúng đầu lâu thì <b>không điểm</b> và <b>mất 1 đĩa</b>: mọi đĩa đã đặt trả về tay, rồi 1 đĩa trong tay bị chọn ngẫu nhiên (xào úp, người khác chọn) và bỏ đi vĩnh viễn.</li>
<li><b>Bị loại:</b> ai mất hết đĩa thì <b>bị loại</b> khỏi trận. Chỉ còn 1 người thì người đó thắng trận.</li>
<li><b>Thắng trận:</b> ai được <b>2 điểm</b> trước thì thắng trận.</li>
</ul>
<h3>💡 Mẹo</h3>
<p>Đặt đầu lâu sớm để dọa người khác ra giá thấp — nhưng nhớ: nếu bạn thắng giá mà đĩa mình đặt là đầu lâu thì lượt lật đầu tiên trúng ngay! Ra giá cao khi bạn chắc đĩa mình là hoa và các thảm khác ít khả năng có đầu lâu (người đã mất đầu lâu thì đĩa của họ an toàn tuyệt đối). Lật thảm của người còn nhiều đĩa trên tay trước — đĩa úp của họ ít khả năng là đầu lâu hơn. Xin thua giữa trận thì trận kết thúc ngay, người còn lại nhiều điểm nhất thắng.</p>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`;

