// 📖 Hướng dẫn Bida 8-ball — modal luật chơi (giống các game khác).
export const GUIDE_HTML = `
<h2>🎱 Bida 8-ball</h2>
<p><b>Mục tiêu:</b> đánh hết bi thuộc nhóm của mình (trơn 1–7 hoặc sọc 9–15), rồi đánh bi số 8 vào lỗ cuối cùng thì thắng!</p>
<h3>🎮 Cách chơi</h3>
<ul>
<li><b>Ngắm:</b> kéo chuột (hoặc ngón tay) từ bi cái ra xa để ngắm hướng + lực — đường kẻ trắng hiện hướng bi cái bay, bóng mờ hiện vị trí va chạm, mũi tên hiện hướng bi mục tiêu bay sau va chạm. Thả tay để bắn.</li>
<li><b>Lực:</b> kéo càng xa thì bắn càng mạnh. Thanh lực ở dưới bàn hiện lực hiện tại.</li>
<li><b>Cú phá:</b> cú bắn đầu tiên phá tam giác bi. Bàn vẫn mở sau cú phá — chưa chia nhóm.</li>
<li><b>Chia nhóm:</b> bi đầu tiên vào lỗ sau cú phá sẽ quyết định nhóm của bạn (trơn hoặc sọc). Từ đó chỉ được đánh bi thuộc nhóm mình.</li>
<li><b>Vào lỗ đúng nhóm thì được bắn tiếp;</b> không vào lỗ thì đổi lượt.</li>
<li><b>Đặt bi cái:</b> khi đối thủ phạm lỗi, bạn được đặt bi cái ở bất kỳ chỗ trống nào trên bàn — bấm vào chỗ muốn đặt.</li>
</ul>
<h3>⚠️ Phạm lỗi</h3>
<ul>
<li>Bi cái rơi lỗ (scratch).</li>
<li>Bi cái không chạm bi nào.</li>
<li>Chạm bi của đối thủ (hoặc bi 8) trước.</li>
<li>Sau khi chạm bi mà không có bi nào chạm băng hay rơi lỗ.</li>
<li>Phạm lỗi → đối thủ được đặt bi cái tự do.</li>
</ul>
<h3>🎱 Bi số 8</h3>
<ul>
<li>Chỉ được đánh bi 8 khi đã hết bi thuộc nhóm của mình.</li>
<li>Vào bi 8 đúng luật thì thắng; vào bi 8 sớm (chưa hết nhóm) hoặc kèm phạm lỗi thì thua ngay.</li>
<li>Bi 8 vào lỗ ở cú phá thì được đặt lại ở điểm chân, không tính thắng/thua.</li>
</ul>
<h3>🏆 Thắng / thua</h3>
<ul>
<li><b>Chơi đơn (luyện tập):</b> vào hết 15 bi rồi đánh bi 8 cuối cùng thì thắng — chơi đơn không chia nhóm; vào bi 8 sớm thì thua. Không giới hạn giờ.</li>
<li><b>Đấu máy / online / chung máy:</b> ai vào bi 8 đúng luật trước thì thắng; hết 10 phút thì ai vào nhiều bi hơn thắng, bằng nhau thì hoà.</li>
</ul>
<h3>🤖 Máy chơi thế nào</h3>
<ul>
<li><b>Máy Khó:</b> tính mọi cặp (bi, lỗ), mô phỏng thử để chọn cú chắc vào lỗ nhất, sai số ngắm rất nhỏ; đi nhanh (400–600ms/cú).</li>
<li><b>Máy Dễ:</b> chọn ngẫu nhiên 1 cú trong các cú tốt nhất, sai số ngắm lớn; đi chậm (700–900ms/cú).</li>
</ul>
<h3>🏳️ Xin thua</h3>
<ul>
<li>Xin thua là thua luôn ván đó.</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>
`;
export default GUIDE_HTML;
