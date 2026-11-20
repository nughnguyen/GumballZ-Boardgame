// 📖 Hướng dẫn Spyfall – nội dung hộp "Cách chơi" trong game, đồng thời là nguồn
// để tools/guide/make.mjs sinh trang huong-dan/index.html (chạy trên máy dev).
export const GUIDE_HTML = `<div class="guide"><h2>📖 Cách chơi Spyfall</h2>
<p><b>Spyfall</b> là trò suy luận xã hội kiểu “tìm gián điệp”: bàn chơi có <b>3–8 người</b>, mỗi ván mọi người nhận cùng <b>1 thẻ địa điểm</b> (kèm vai trò ở đó) — chỉ có <b>1 gián điệp</b> không biết địa điểm là gì. Cả bàn hỏi đáp lẫn nhau để tìm ra gián điệp, còn gián điệp phải đoán được địa điểm mà không lộ mặt.</p>
<h3>1. Thẻ của bạn (bí mật, chỉ mình bạn biết)</h3>
<ul>
<li><b>Người thường:</b> bạn thấy <b>địa điểm + vai trò của mình</b> ở đó — ví dụ ở <b>🏖️ Bãi biển</b> bạn là <b>Nhân viên cứu hộ</b>. Bấm “👁 Xem thẻ của bạn” để xem lại, nhớ che trước khi đưa máy!</li>
<li><b>🕵️ Gián điệp:</b> bạn chỉ thấy “BẠN LÀ GIÁN ĐIỆP” — không biết địa điểm. Hãy hỏi đáp thật tự nhiên để không ai nghi, đồng thời nghe lén từ khóa trong câu trả lời của mọi người để đoán địa điểm.</li>
<li><b>Danh sách địa điểm:</b> có <b>24 địa điểm</b> quen thuộc (chợ Bến Thành, trường học, bệnh viện, sân bay, bãi biển, rạp chiếu phim…) — ai cũng thấy danh sách này, gián điệp dùng nó để đoán.</li>
</ul>
<h3>2. Vòng hỏi đáp (lần lượt)</h3>
<ul>
<li><b>Người hỏi</b> chọn 1 người để hỏi (bấm vào ghế hoặc chọn tên) rồi gõ câu hỏi — hoặc bấm 1 câu hỏi gợi ý có sẵn. Câu hỏi nên vừa đủ: quá chung chung thì không lộ gì, quá cụ thể thì gián điệp nghe là biết địa điểm!</li>
<li><b>Người được hỏi</b> trả lời, rồi thành người hỏi tiếp. Cứ thế hỏi vòng quanh bàn cho tới khi có người hô <b>“🗳️ Bỏ phiếu ngay”</b>. Mỗi ván hỏi tối đa <b>2 vòng quanh bàn</b> (2 × số người câu hỏi) rồi tự chuyển sang bỏ phiếu.</li>
<li><b>Đồng hồ hỏi đáp</b> (chủ phòng bật tắt/60/120 giây): hết giờ thì tự chuyển sang bỏ phiếu.</li>
<li><b>Gián điệp đoán sớm:</b> trong vòng hỏi, gián điệp có thể bấm <b>“🕵️ Đoán địa điểm ngay”</b> — đoán <b>đúng thì thắng ngay</b>, đoán <b>sai thì thua ngay</b>. Chỉ đoán khi đã chắc!</li>
</ul>
<h3>3. Bỏ phiếu tìm gián điệp</h3>
<ul>
<li>Mỗi người bỏ phiếu cho <b>1 người</b> mình nghi là gián điệp (không tự bầu mình). Ai nhiều phiếu nhất thì bị <b>buộc tội</b>.</li>
<li><b>Buộc tội đúng gián điệp:</b> gián điệp phải đoán địa điểm — đoán <b>đúng thì gián điệp thắng một mình</b>, đoán <b>sai thì cả đội còn lại thắng</b>.</li>
<li><b>Buộc tội nhầm người:</b> gián điệp thắng ngay.</li>
<li><b>Hòa phiếu:</b> không ai bị buộc tội, gián điệp thắng.</li>
</ul>
<h3>4. Tính điểm trận</h3>
<ul>
<li>Gián điệp thắng ván thì chỉ mình gián điệp được 1 điểm; đội còn lại thắng ván thì mỗi người trong đội được 1 điểm.</li>
<li>Chủ phòng chọn <b>thắng trước 1 / 2 / 3 ván</b> thì thắng trận. Hết ván thì chủ phòng bấm “Ván tiếp theo” — gián điệp và địa điểm đổi mới.</li>
<li><b>Xin thua:</b> phe của người xin thua thua ván này.</li>
</ul>
<h3>5. Mẹo chơi</h3>
<ul>
<li><b>Người thường:</b> hỏi những câu mà chỉ người ở đó mới trả lời được (“Bạn phải đội mũ bảo hộ không?”), nhưng đừng nói thẳng tên địa điểm — gián điệp đang nghe đấy!</li>
<li><b>Gián điệp:</b> trả lời mơ hồ như mọi người (“Tôi làm việc ở đây mỗi ngày”), hỏi lại những câu chung chung, và nhớ từng từ khóa người ta lỡ miệng.</li>
<li><b>Bỏ phiếu:</b> ai trả lời lúc nào cũng chung chung, né câu hỏi cụ thể thì rất đáng nghi.</li>
</ul>
<h3>6. Chế độ chơi</h3>
<ul>
<li><b>🌐 Online:</b> tạo phòng, gửi mã 5 ký tự cho bạn vào chơi cùng (3–8 người). Thẻ của mỗi người chỉ hiện trên máy của người đó.</li>
<li><b>🤖 Chơi với máy:</b> bạn + 2 máy (chủ phòng thêm máy trong phòng chờ nếu muốn đông hơn). Máy Dễ hỏi/trả lời/bỏ phiếu gần như ngẫu nhiên; Máy Khó hỏi câu gợi ý theo địa điểm, trả lời nhắc từ khóa, ghi điểm nghi ngờ để bỏ phiếu, gián điệp Khó đoán địa điểm từ từ khóa đã nghe.</li>
<li><b>👥 3–8 người chung máy:</b> thêm người trong phòng chờ rồi chuyền máy cho nhau. Mỗi người bấm “👁 Xem thẻ” để xem thẻ của mình rồi che lại — hỏi, trả lời và bỏ phiếu đều làm lần lượt, người khác quay đi!</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`;
