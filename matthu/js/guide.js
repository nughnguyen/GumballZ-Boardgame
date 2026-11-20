// 📖 Hướng dẫn Mật Thư – nội dung hộp "Cách chơi" trong game, đồng thời là nguồn
// để tools/guide/make.mjs sinh trang huong-dan/index.html (chạy trên máy dev).
export const GUIDE_HTML = `<div class="guide"><h2>📖 Cách chơi Mật Thư</h2>
<p><b>Mật Thư</b> là trò đoán từ đồng đội kiểu Codenames: trên bàn có <b>25 lá từ</b> tiếng Việt. Đội <b>🔴 Đỏ có 9 điệp viên</b>, đội <b>🔵 Xanh có 8 điệp viên</b>, còn lại là <b>7 dân thường</b> và <b>1 sát thủ 💀</b>. <b>Đỏ đi trước.</b> Mỗi đội có <b>1 mật vụ</b> (chỉ mật vụ mới biết bản đồ mật — lá nào của phe nào) và <b>1+ điệp viên</b> (người đoán lá).</p>
<h3>1. Một lượt chơi</h3>
<ul>
<li><b>Mật vụ ra gợi ý:</b> nói <b>1 từ duy nhất</b> + <b>1 con số</b> (1–9, hoặc 0 = đoán thoải mái). Ví dụ: gợi ý “BIỂN — 2” nghĩa là có 2 lá phe mình liên quan tới biển. Gợi ý <b>không được trùng</b> 1 từ đang còn úp trên bàn.</li>
<li><b>Điệp viên đoán:</b> bấm vào các lá để đoán, tối đa <b>số + 1 lá</b> (số 0 thì đoán tới khi sai). Đoán <b>trúng lá phe mình</b>: lật lá, được đoán tiếp. Đoán trúng <b>dân thường</b> hoặc <b>lá của địch</b>: lá lật lên, hết lượt. Đoán trúng <b>sát thủ</b>: <b>thua ngay</b>, đội kia thắng!</li>
<li><b>Bỏ lượt:</b> mật vụ có thể bỏ qua lượt gợi ý, điệp viên có thể dừng đoán sớm — tới lượt đội kia.</li>
<li><b>Thắng:</b> đội nào lộ hết điệp viên của mình trước thì thắng. Đoán nhầm mà lật trúng lá địch cuối cùng thì đội đó thắng ngay!</li>
</ul>
<h3>2. Bản đồ mật</h3>
<ul>
<li>Chỉ <b>mật vụ</b> mới thấy bản đồ mật (chấm màu ở góc mỗi lá: 🔴 Đỏ, 🔵 Xanh, ⚪ dân thường, 💀 sát thủ). Bấm <b>👁 Bản đồ mật</b> để hiện/tắt — chơi chuyền tay thì <b>nhớ tắt trước khi đưa máy cho điệp viên</b>!</li>
<li>Điệp viên chỉ thấy lá nào đã lật. Mật vụ <b>không được nói ra từ trên bàn</b>, chỉ gợi ý bằng từ liên quan.</li>
<li>Chơi 2 người thì mỗi người vừa là mật vụ vừa là điệp viên của đội mình — đua xem đội nào lộ hết điệp viên trước.</li>
</ul>
<h3>3. Mẹo chơi</h3>
<ul>
<li><b>Mật vụ:</b> chọn gợi ý bao được nhiều lá phe mình mà né lá địch và sát thủ. Gợi ý số lớn thì điệp viên đoán được nhiều, nhưng càng dễ "dính" lá xấu — gợi ý 2–3 lá là an toàn nhất.</li>
<li><b>Điệp viên:</b> đoán lá chắc chắn nhất trước. Hết lá liên quan thì <b>dừng đoán</b> — đoán bừa dễ chạm sát thủ hoặc tặng lá cho địch.</li>
<li><b>Nhớ đếm:</b> Đỏ 9 lá, Xanh 8 lá — đội nào còn ít lá hơn thì đang dẫn trước. Đừng quên sát thủ còn ẩn ở đâu!</li>
</ul>
<h3>4. Chế độ chơi</h3>
<ul>
<li><b>🌐 Online:</b> tạo phòng, gửi mã 5 ký tự cho bạn vào chơi cùng (2–8 người). Ghế 1 = mật vụ Đỏ, ghế 2 = mật vụ Xanh, các ghế sau là điệp viên xen kẽ 2 đội. Chủ phòng bật đồng hồ đi (60/120 giây — hết giờ thì lượt tự chuyển).</li>
<li><b>🤖 Chơi với máy:</b> bạn đấu với máy 1–1, mỗi bên vừa làm mật vụ vừa làm điệp viên. Máy Dễ thỉnh thoảng đoán bừa, Máy Khó gợi ý chắc tay và không bao giờ liều khi hết lá liên quan.</li>
<li><b>👥 2–8 người chung máy:</b> thêm người trong phòng chờ rồi chuyền máy cho nhau. Mật vụ bấm 👁 để xem bản đồ mật, ra gợi ý xong thì tắt đi rồi đưa máy cho điệp viên đoán.</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`;
