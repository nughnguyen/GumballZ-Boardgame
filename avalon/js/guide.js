// 📖 Hướng dẫn Avalon – nội dung hộp "Cách chơi" trong game, đồng thời là nguồn
// để tools/guide/make.mjs sinh trang huong-dan/index.html (chạy trên máy dev).
export const GUIDE_HTML = `<div class="guide"><h2>📖 Cách chơi Avalon</h2>
<p><b>Avalon</b> là trò suy luận phe phái: bàn chơi có <b>5–10 người</b>, chia thành <b>🛡️ phe Thiện</b> (các hiệp sĩ của vua Arthur) và <b>😈 phe Ác</b> (tay chân của Mordred). Không ai biết vai của người khác — trừ vài vai đặc biệt. Cả bàn cùng làm <b>5 nhiệm vụ</b>: phe Thiện thắng khi làm thành công <b>3 nhiệm vụ</b>, phe Ác thắng khi phá hỏng <b>3 nhiệm vụ</b> (hoặc khi 5 lần đề xuất đội liên tiếp bị bác).</p>
<h3>1. Vai trò (chia ngẫu nhiên, mỗi người chỉ biết vai của mình)</h3>
<ul>
<li><b>🧙 Merlin (Thiện):</b> thấy hết phe Ác — <b>trừ Mordred</b>. Merlin biết ai xấu, nhưng lộ mình là bị ám sát!</li>
<li><b>🛡️ Percival (Thiện):</b> thấy <b>Merlin và Morgana</b> — nhưng không biết ai là ai. Nhiệm vụ của Percival là bảo vệ Merlin.</li>
<li><b>⚔️ Hiệp sĩ trung thành (Thiện):</b> không biết gì thêm — chỉ tin vào lá phiếu và trực giác.</li>
<li><b>🗡️ Sát thủ (Ác):</b> nếu phe Thiện thắng 3 nhiệm vụ, Sát thủ được <b>đoán ai là Merlin</b> — đúng thì phe Ác lật kèo thắng!</li>
<li><b>🔮 Morgana (Ác):</b> hiện ra như Merlin trước mắt Percival.</li>
<li><b>😈 Mordred (Ác, từ 7 người):</b> ẩn mình khỏi tầm nhìn của Merlin.</li>
<li><b>👤 Oberon (Ác, 9 người):</b> không biết ai, và không ai biết mình.</li>
<li><b>🐺 Tay sai Mordred (Ác, 10 người):</b> biết các phe Ác khác — trừ Oberon.</li>
</ul>
<p><b>Chia vai theo số người (tỉ lệ chuẩn, phe Thiện luôn đa số):</b> 5 người (3 Thiện/2 Ác): Merlin, Percival, Hiệp sĩ — Sát thủ, Morgana · 6 người (4/2): + Hiệp sĩ · 7 người (4/3): + Mordred · 8 người (5/3): + Hiệp sĩ · 9 người (6/3): + Oberon (thay Mordred — phe Ác mất liên lạc) · 10 người (6/4): + Mordred và Tay sai Mordred. Vai đặc biệt thay thế Hiệp sĩ/Tay sai cùng phe, không cộng thêm người — vì vậy không bao giờ có chuyện phe Ác đông hơn phe Thiện.</p>
<h3>2. Một nhiệm vụ (lặp 5 lần)</h3>
<ul>
<li><b>👑 Thủ lĩnh chọn đội:</b> thủ lĩnh (đổi mỗi nhiệm vụ) bấm chọn đúng số người của nhiệm vụ rồi bấm “Đề xuất đội”.</li>
<li><b>🗳️ Cả bàn bỏ phiếu Thuận/Chống:</b> quá bán Thuận thì đội được duyệt; hòa hoặc ít hơn thì đội bị bác — thủ lĩnh đổi sang người kế tiếp. <b>5 lần bác liên tiếp thì phe Ác thắng ngay.</b></li>
<li><b>⚔️ Đội làm nhiệm vụ:</b> từng thành viên trong đội bí mật chọn <b>Thành công</b> hoặc <b>Thất bại</b> — phe Thiện <b>bắt buộc</b> Thành công, phe Ác được chọn Thất bại để phá. Chỉ công bố <b>số lần thất bại</b>, không nói ai đã phá.</li>
<li><b>Thắng nhiệm vụ:</b> nhiệm vụ thành công khi số lần thất bại <b>dưới ngưỡng</b> (thường là 1; riêng <b>nhiệm vụ 4 ở 7+ người cần 2 lần thất bại mới hỏng</b>).</li>
</ul>
<h3>3. Số người mỗi nhiệm vụ</h3>
<ul>
<li>5 người: 2, 3, 2, 3, 3 · 6 người: 2, 3, 4, 3, 4 · 7 người: 2, 3, 3, 4*, 4</li>
<li>8 người: 3, 4, 4, 5*, 5 · 9 người: 3, 4, 4, 5*, 5 · 10 người: 3, 4, 4, 5*, 5</li>
<li>(* nhiệm vụ 4 ở 7+ người: cần 2 lần thất bại mới hỏng)</li>
</ul>
<h3>4. Kết thúc ván</h3>
<ul>
<li><b>Phe Ác phá hỏng 3 nhiệm vụ</b> → phe Ác thắng ngay.</li>
<li><b>Phe Thiện thắng 3 nhiệm vụ</b> → Sát thủ đoán Merlin: <b>đúng thì phe Ác lật kèo thắng</b>, sai thì phe Thiện thắng.</li>
<li><b>5 lần đề xuất bị bác liên tiếp</b> → phe Ác thắng.</li>
<li><b>Xin thua:</b> phe của người xin thua thua luôn.</li>
</ul>
<h3>5. Mẹo chơi</h3>
<ul>
<li><b>Merlin:</b> đừng lộ mình quá sớm — hãy bác đội có Ác bằng lý do khác (“đội này lạ lắm”), đừng lúc nào cũng đúng 100%.</li>
<li><b>Percival:</b> bạn thấy 2 người “giống Merlin” — một là Merlin thật, một là Morgana. Hãy để ý ai hay bác đội xấu.</li>
<li><b>Phe Ác:</b> đừng phá nhiệm vụ đầu quá lộ — phá 1 mình ở nhiệm vụ cần 2 lần thất bại là vừa vô ích vừa lộ mặt.</li>
<li><b>Thủ lĩnh:</b> chọn đội toàn người mình tin — nhiệm vụ 4 ở 7+ người là ải khó nhất vì cần tới 2 kẻ phá.</li>
</ul>
<h3>6. Chế độ chơi</h3>
<ul>
<li><b>🌐 Online:</b> tạo phòng, gửi mã 5 ký tự cho bạn vào chơi cùng (5–10 người). Vai trò của mỗi người chỉ hiện trên máy của người đó.</li>
<li><b>🤖 Chơi với máy:</b> bạn + 4 máy (hoặc chọn 5–10 người, máy điền cho đủ). Máy Dễ chơi ngẫu nhiên có thiên vị, Máy Khó biết né Ác, phá đúng lúc và đoán Merlin theo dấu vết bỏ phiếu.</li>
<li><b>👥 5–10 người chung máy:</b> thêm người trong phòng chờ rồi chuyền máy cho nhau. Mỗi người bấm “👁 Xem vai trò” để xem vai của mình rồi che lại trước khi đưa máy — bỏ phiếu và chọn Thành công/Thất bại đều làm lần lượt, người khác quay đi!</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`;
