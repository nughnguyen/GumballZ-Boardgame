// 📖 Luật Wavelength — trang hướng dẫn (gắn vào #modal-box).
export const GUIDE_HTML = `
<h2>🌈 Wavelength</h2>
<p><b>Mục tiêu:</b> Đoán xem vị trí bí mật nằm ở đâu trên thang đo! Một người làm <b>Nhà ngoại cảm</b> — thấy vị trí bí mật rồi đưa 1 gợi ý ngắn. Những người còn lại đặt mốc lên thang đo ở chỗ họ nghĩ vị trí đó nằm. Đặt càng sát thì càng nhiều điểm!</p>
<h3>🎲 Cách chơi</h3>
<ul>
  <li><b>Nhà ngoại cảm:</b> Bấm <b>"🎯 Xem vị trí bí mật"</b> để thấy vị trí (chỉ mình bạn thấy), rồi gõ 1 gợi ý ngắn vào ô và bấm <b>"💡 Gửi gợi ý"</b>. Gợi ý hay là gợi ý chỉ đúng tới vị trí đó — ví dụ vị trí gần đầu "Nóng" thì gợi ý "Nước sôi", gần giữa thì "Nước ấm tắm".</li>
  <li><b>Người đoán:</b> Bấm vào <b>thang đo</b> để đặt mốc ở vị trí bạn nghĩ là đúng (bấm lại để dời mốc), rồi bấm <b>"📍 Chốt mốc"</b>. Mốc của người khác bị che cho tới khi lật bài — không ai xem trộm được!</li>
  <li><b>Chấm điểm:</b> Mốc cách đích ≤ 5 → <b>4 điểm</b>; ≤ 12 → <b>3 điểm</b>; ≤ 20 → <b>2 điểm</b>; xa hơn → 0 điểm. Nhà ngoại cảm được thưởng khi cả bàn đoán sát: mốc tốt nhất 4 điểm thì Nhà ngoại cảm +2, 3 điểm thì +1.</li>
  <li><b>Lật bài:</b> Khi mọi người đoán đã chốt mốc thì tự lật bài. Nhà ngoại cảm có thể bấm <b>"Tiếp theo ▶"</b> để lật bài sớm (khi đã có ít nhất 1 mốc). Xem kết quả xong thì bấm Tiếp theo để sang lượt sau.</li>
  <li><b>Ván đấu:</b> mỗi người làm Nhà ngoại cảm đúng 2 lần (2 người → 4 lượt, 4 người → 8 lượt). Ai đạt <b>10 điểm</b> trước thì thắng ngay; hết lượt thì ai nhiều điểm nhất thắng; hòa điểm thì so số lần đạt 4 điểm, rồi mới hòa.</li>
</ul>
<h3>🧍 Chơi đơn</h3>
<p>Game đưa sẵn 1 gợi ý (ví dụ thang "Ngọt ↔ Chua", gợi ý "Chanh tươi") — bạn bấm vào thang đo để đặt mốc rồi bấm <b>"📍 Chốt mốc"</b>. 10 lượt / ván, đúng từ <b>25/40 điểm</b> mới thắng.</p>
<h3>🤖 Chơi với máy</h3>
<ul>
  <li>Khi <b>bạn làm Nhà ngoại cảm</b>, máy sẽ đặt mốc theo gợi ý của bạn — gợi ý càng rõ thì máy càng đoán sát!</li>
  <li>Khi <b>máy làm Nhà ngoại cảm</b>, máy chọn gợi ý trong ngân hàng gần vị trí bí mật nhất; bạn đặt mốc theo gợi ý đó.</li>
  <li><b>Dễ:</b> máy đặt mốc lệch nhiều. <b>Khó:</b> máy đặt mốc sát hơn.</li>
</ul>
<h3>🏳️ Xin thua</h3>
<p>2 người: ván kết thúc ngay, người còn lại thắng. 3+ người: ván tiếp tục không có bạn (lượt làm Nhà ngoại cảm của bạn bị bỏ qua); chỉ còn 1 người chưa thua thì người đó thắng ngay.</p>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>
`;
export default GUIDE_HTML;
