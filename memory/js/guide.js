// 📖 Hướng dẫn Memory – nội dung hộp "Cách chơi" trong game, đồng thời là nguồn
// để tools/guide/make.mjs sinh trang huong-dan/index.html (chạy trên máy dev).
export const GUIDE_HTML = `<div class="guide"><h2>📖 Cách chơi Memory</h2>
<p><b>Memory (Lật thẻ nhớ)</b> là trò lật thẻ tìm cặp giống nhau: cả bàn là những lá bài úp mặt xuống, mỗi lá giấu 1 hình — mỗi hình có đúng <b>2 lá giống nhau</b>. Việc của bạn là <b>nhớ vị trí</b> từng hình đã thấy, lật đúng 2 lá giống nhau để ăn cặp.</p>
<h3>1. Luật chơi — lật 2 lá, trúng cặp thì đi tiếp</h3>
<ul>
<li>Mỗi lượt bạn <b>lật 2 lá</b> (bấm vào 2 lá úp bất kỳ).</li>
<li><b>2 lá giống nhau → trúng cặp:</b> 2 lá giữ ngửa luôn, bạn được <b>1 cặp</b> và được <b>lật tiếp</b> (không đổi lượt).</li>
<li><b>2 lá khác nhau → lật trượt:</b> 2 lá úp lại sau 1 nhịp, rồi <b>đổi lượt</b> sang đối thủ.</li>
<li><b>Hết bàn</b> (tìm đủ mọi cặp) thì kết thúc: chơi 2 người thì <b>ai nhiều cặp hơn thắng</b>, bằng nhau thì <b>hòa</b>.</li>
<li><b>Chơi đơn:</b> 1 mình lật hết bàn — thắng khi tìm đủ mọi cặp. Điểm tính bằng <b>thời gian + số lượt lật</b>: lật càng ít lần trượt càng tốt, xếp hạng ⭐ 1–3 sao.</li>
<li>Lá đã trúng cặp thì không lật lại được; lá đang ngửa cũng không lật lại.</li>
</ul>
<h3>2. Mức khó — càng nhiều lá càng khó nhớ</h3>
<ul>
<li><b>😊 Dễ — 12 lá (6 cặp), lưới 4×3:</b> bàn nhỏ, dễ nhớ, hợp làm quen.</li>
<li><b>🙂 Vừa — 16 lá (8 cặp), lưới 4×4:</b> mức cân bằng, chơi vui nhất.</li>
<li><b>😤 Khó — 24 lá (12 cặp), lưới 6×4:</b> bàn lớn, trí nhớ phải thật tốt.</li>
<li>Mặt thẻ là các hình trái cây 🍎🍌🍇🍓🍊🍉🍒🥝🍍🥭🍑🍐 — mỗi hình đúng 2 lá.</li>
</ul>
<h3>3. Chế độ chơi &amp; Máy AI</h3>
<ul>
<li><b>🧍 Chơi đơn:</b> 1 mình lật hết bàn, tính giờ + số lượt lật, xếp hạng sao. Không lật trượt lần nào ở mức Vừa là thành tích "Trí nhớ hoàn hảo".</li>
<li><b>🌐 Chơi online:</b> bấm <b>🌐 Online</b> ở màn hình chính rồi <b>Tạo phòng online</b> — gửi mã phòng 5 ký tự (hoặc link mời) cho bạn; bạn nhập mã rồi bấm <b>Vào</b>. Chủ phòng chọn mức khó trong phòng chờ rồi bấm <b>Bắt đầu chơi</b>. Bộ bài do chủ phòng xáo 1 lần rồi đồng bộ cho cả 2 bên nên 2 bên luôn thấy cùng 1 bộ bài. Nếu đối thủ mất kết nối thì máy sẽ đi thay sau vài giây; chủ phòng rời thì phòng giải tán.</li>
<li><b>Đấu với Máy:</b> máy cũng "nhớ" các lá đã lật như bạn. Máy <b>Dễ</b> chỉ nhớ vài lá vừa thấy, lại hay đánh bừa; máy <b>Khó</b> nhớ hoàn hảo mọi lá đã thấy — hở ra cặp nào là nó ăn ngay.</li>
<li><b>2 Người chơi:</b> 2 người ngồi chung 1 máy, thay phiên nhau lật — nhớ vị trí là lợi thế lớn nhất.</li>
</ul>
<h3>4. Mẹo nhớ bài</h3>
<ul>
<li><b>Lật lá chưa biết để khám phá:</b> đầu ván cứ lật các lá chưa từng thấy — mỗi lần lật là 1 thông tin mới.</li>
<li><b>Nhớ theo vị trí:</b> đừng chỉ nhớ hình, hãy nhớ "🍓 ở góc trên bên phải" — vị trí mới là chìa khóa.</li>
<li><b>Thấy cặp là ăn ngay:</b> khi đã biết 2 lá giống nhau ở đâu, lật chúng liên tiếp để ăn cặp rồi đi tiếp.</li>
<li><b>Đừng lật bừa khi đã biết nhiều:</b> càng về cuối bàn càng ít lá úp — lật lá đã biết mặt thì phí lượt (và cho đối thủ thêm thông tin).</li>
<li><b>Chơi đơn:</b> muốn 3 sao thì đừng lật trượt — mỗi lần trượt là mất sao, nhưng cứ bình tĩnh nhớ kỹ rồi hẵng lật lá thứ 2.</li>
</ul></div>`;
