// 📖 Hướng dẫn Ai Là Triệu Phú — HTML chèn vào hộp thoại (giống Blokus).
// Thang tiền thưởng theo format quen thuộc của chương trình "Ai là triệu
// phú" bản Việt phát trên VTV3 (15 câu, mốc an toàn câu 5 và câu 10).
export const GUIDE_HTML = `
<h2>💰 Cách chơi Ai Là Triệu Phú</h2>
<p><b>Ai Là Triệu Phú</b> là game trắc nghiệm kiến thức: trả lời đúng 15 câu hỏi liên tiếp để giành <b>150.000.000 đồng</b>! Mỗi câu có 30 giây suy nghĩ, 4 phương án A – B – C – D, chỉ 1 đáp án đúng.</p>
<h3>💰 Thang tiền thưởng</h3>
<p>Câu 1: 100.000 · Câu 2: 200.000 · Câu 3: 300.000 · Câu 4: 500.000 · <b>Câu 5: 1.000.000 (mốc an toàn)</b> · Câu 6: 2.000.000 · Câu 7: 3.000.000 · Câu 8: 6.000.000 · Câu 9: 10.000.000 · <b>Câu 10: 14.000.000 (mốc an toàn)</b> · Câu 11: 22.000.000 · Câu 12: 30.000.000 · Câu 13: 40.000.000 · Câu 14: 60.000.000 · <b>Câu 15: 150.000.000</b>.</p>
<h3>🎯 Luật chơi</h3>
<p>Trả lời đúng thì lên 1 bậc tiền thưởng. <b>Trả lời sai hoặc hết 30 giây</b> thì dừng lại và chỉ giữ được tiền ở <b>mốc an toàn</b> gần nhất đã vượt qua (câu 5 hoặc câu 10) — chưa qua mốc nào thì ra về tay trắng. Trả lời đúng cả 15 câu thì thắng 150 triệu!</p>
<p>Sau mỗi câu trả lời đúng, bạn có thể bấm <b>🛑 Dừng lại lấy tiền</b> để mang số tiền hiện tại về, thay vì mạo hiểm câu tiếp theo.</p>
<h3>🆘 4 quyền trợ giúp (mỗi quyền 1 lần trong 1 lượt chơi)</h3>
<p><b>50:50</b> — loại bỏ 2 phương án sai, chỉ còn 2 phương án. <b>📞 Gọi điện cho người thân</b> — người thân gợi ý 1 phương án (đúng khoảng 70%). <b>📊 Hỏi ý kiến khán giả</b> — khán giả bình chọn, phương án đúng thường được nhiều phiếu nhất. <b>🔄 Đổi câu hỏi</b> — đổi sang 1 câu khác cùng độ khó.</p>
<h3>🏁 Các chế độ chơi</h3>
<p><b>Chơi đơn:</b> 1 mình chinh phục 15 câu. <b>Đấu máy:</b> đua cùng máy (Máy Dễ trả lời đúng khoảng 55%, Máy Khó khoảng 85%) trên cùng 15 câu hỏi. <b>Online / chuyền tay 2 người:</b> cùng 1 bộ 15 câu, ai được nhiều tiền hơn thì thắng; hòa tiền thì ai trả lời nhanh hơn (tổng thời gian) thắng.</p>
<p><i>Nguồn: format chương trình "Ai là triệu phú" (bản quyền Who Wants to Be a Millionaire), thang tiền thưởng bản Việt trên VTV3. Ngân hàng câu hỏi do GumballZ Boardgame biên soạn.</i></p>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`;
