// 📖 Hướng dẫn Rummikub — HTML chèn vào hộp thoại (giống Lấy 6).
export const GUIDE_HTML = `
<h2>🀄 Cách chơi Rummikub</h2>
<p><b>Rummikub</b> là game xếp bài kinh điển: 2–4 người, mỗi người 14 lá, trên bàn ban đầu chưa có bộ nào. Mỗi lượt bạn <b>đánh bộ</b> ra bàn hoặc <b>rút 1 lá</b> — ai hết bài trên tay trước thì thắng!</p>
<h3>🀄 Bộ bài (106 lá)</h3>
<p>2 bộ 1–13 × 4 màu (🔴 đỏ, 🔵 xanh dương, 🟠 cam, ⚫ đen) + 2 lá <b>joker</b> 🃏. Joker thay bất kỳ lá nào (tính điểm bằng lá nó đại diện; khi tính điểm bài còn lại thì joker = 30 điểm).</p>
<h3>🧩 Bộ hợp lệ</h3>
<ul>
<li><b>Dãy:</b> cùng màu, số liên tiếp, từ 3 lá trở lên (VD: đỏ 5-6-7, xanh 11-12-13).</li>
<li><b>Nhóm:</b> cùng số, 3–4 màu khác nhau (VD: 5 đỏ + 5 xanh + 5 cam).</li>
<li>Joker lấp chỗ thiếu trong dãy (5, joker, 7) hoặc thay màu còn thiếu trong nhóm.</li>
</ul>
<h3>🚪 Mở bài lần đầu: phải ≥ 30 điểm</h3>
<p>Lượt đầu tiên bạn đánh bộ, tổng giá trị các bộ mới ra từ tay phải <b>từ 30 điểm trở lên</b> (joker tính theo lá nó đại diện). Chưa đủ 30 thì chưa được đánh — rút 1 lá và chờ lượt sau.</p>
<h3>🔀 Thao tác trên bàn (sau khi đã mở bài)</h3>
<p>Khi đã mở bài, bạn được <b>thao tác trên bàn</b>: thêm lá vào bộ có sẵn, tách 1 dãy dài thành 2 dãy, chuyển lá giữa các bộ — miễn là <b>cuối lượt mọi bộ trên bàn đều hợp lệ</b>. Lá trên bàn không được lấy về tay.</p>
<ul>
<li>Ví dụ: bàn có dãy đỏ 3-4-5-6-7-8, tay có đỏ 2 và đỏ 9 → tách thành dãy 2-3-4 và dãy 5-6-7-8-9.</li>
<li>Ví dụ: bàn có dãy đỏ 4-5-6-7 và nhóm 7 xanh-cam-đen, tay có đỏ 3 → chuyển 7 đỏ sang nhóm (thành nhóm 4 màu) rồi nối 3 đỏ vào dãy.</li>
</ul>
<h3>⚠️ Xếp bàn sai thì sao?</h3>
<p>Nếu bạn bấm "Xong lượt" mà bàn chưa hợp lệ (có bộ thiếu lá, có lá bị lấy về tay…), bạn phải <b>thu lại các lá đã đánh và rút 3 lá phạt</b>, hết lượt. Vì vậy hãy kiểm tra kỹ trước khi xong lượt — nút "Đặt lại bàn" sẽ trả bàn về như cũ.</p>
<h3>🎲 Mỗi lượt</h3>
<p>Hoặc <b>đánh bộ</b> (đánh ít nhất 1 lá từ tay ra bàn), hoặc <b>rút 1 lá</b> từ chồng rồi hết lượt. Không được vừa rút vừa đánh trong cùng lượt. Chồng bài hết mà có người phải rút thì trận kết thúc, người ít điểm bài trên tay nhất thắng.</p>
<h3>🏆 Ai thắng?</h3>
<p>Người đầu tiên <b>hết bài trên tay</b> thắng trận và được <b>tổng giá trị bài còn lại của các đối thủ</b> (joker = 30); mỗi người thua bị trừ bằng tổng bài còn lại của mình. Xin thua giữa trận thì trận kết thúc ngay, người còn lại ít điểm bài nhất thắng.</p>
<h3>💡 Mẹo</h3>
<p>Mở bài càng sớm càng tốt (bộ 10-11-12 là 33 điểm, vừa đủ mở bài). Giữ joker cho lúc cần kíp — nó lấp được mọi chỗ thiếu. Đánh lá to trước: vừa giảm điểm bài trên tay (quan trọng nếu trận hết chồng), vừa mau hết bài. Nhớ dãy dài có thể tách ra để "cứu" lá lẻ trên tay!</p>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`;
