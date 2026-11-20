// 📖 Hướng dẫn Vẽ Truyền Tin — modal luật chơi (giống các game khác).
export const GUIDE_HTML = `
<h2>🎨 Vẽ Truyền Tin</h2>
<p><b>Mục tiêu:</b> truyền 1 từ qua cả bàn bằng… vẽ và đoán. Mỗi người có 1 quyển sổ bắt đầu bằng 1 từ bí mật. Hết ván, lật hết các sổ ra xem cả chuỗi đã "tam sao thất bản" thành gì — đó mới là phần vui nhất!</p>
<h3>🔄 Cách chơi</h3>
<ul>
<li><b>Vẽ:</b> nhìn từ trong sổ, vẽ nó lên canvas (chuột hoặc chạm). Có 6 màu + 3 cỡ cọ, Undo và Xoá hết.</li>
<li><b>Đoán:</b> nhìn bức vẽ người trước để lại, gõ từ bạn nghĩ nó là gì.</li>
<li>Sổ chuyền sang trái sau mỗi lượt: vẽ → đoán → vẽ → đoán… Mỗi người cầm mỗi sổ đúng 1 lần rồi lật sổ.</li>
<li>Mỗi lượt có <b>120 giây</b> — hết giờ là nộp trắng (vẽ trống / đoán trống), từ trong sổ giữ nguyên.</li>
</ul>
<h3>🏆 Tính điểm</h3>
<ul>
<li>Đoán đúng (khớp từ gốc sau khi bỏ dấu, không phân biệt hoa thường): người đoán <b>+10</b>, người vẽ bức đó <b>+5</b>.</li>
<li>Đoán sai: từ trong sổ đổi thành từ bạn vừa đoán — người sau phải vẽ từ mới đó!</li>
<li>Nhiều điểm nhất thì thắng; hoà điểm thì so số lần đoán đúng; vẫn hoà thì hoà chung.</li>
</ul>
<h3>👤 Chơi đơn &amp; đấu máy</h3>
<ul>
<li><b>Chơi đơn:</b> bạn vẽ 5 lượt, máy đoán. Giữ được từ ≥3/5 lần thì thắng. Máy càng đoán giỏi (Khó ~65%) thì bạn càng dễ thắng — vì thắng khi máy đoán ĐÚNG!</li>
<li><b>Đấu máy:</b> mỗi bên 1 sổ, 10 lượt. Sổ của máy do máy tự chơi trong engine (vẽ = phác thảo máy, đoán theo xác suất) — máy không vẽ thật được.</li>
</ul>
<h3>👥 Nhiều người &amp; xin thua</h3>
<ul>
<li>Online 4–8 người bằng mã phòng; chơi chung máy thì chuyền tay nhau (màn hình che giữa các lượt).</li>
<li>Xin thua = bị loại khỏi chuỗi: các lượt sau của bạn tự nộp trắng, sổ vẫn xoay bình thường. Còn đúng 1 người thì người đó thắng ngay.</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>
`;
export default GUIDE_HTML;
