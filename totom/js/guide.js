// 🀄 Hướng dẫn Tổ Tôm — dùng chung cho trang hướng dẫn (luat/) và trong game.
export const GUIDE_HTML = `
<h2>🀄 Tổ Tôm — luật chơi</h2>
<p><b>Tổ Tôm</b> là trò bài lá cổ truyền Việt Nam, "cha đẻ" của Chắn. Bộ bài 120 lá:
3 chất <b>Vạn – Văn – Sách</b> × số <b>Nhất đến Cửu</b> (27 loại) cộng 3 quân
<b>yêu</b>: Chi Chi, Thang Thang, Ông Cụ. Mỗi loại có 4 bản giống hệt.</p>
<h3>🎯 Mục tiêu</h3>
<p>Xếp bài trên tay + phu đã ăn thành <b>21 lá chia hết thành các phu</b> và có
ít nhất <b>1 lưng</b> (phu đặc biệt) thì <b>ù</b>. Hết nọc mà chưa ai ù thì hòa.</p>
<h3>🀄 Phu là gì?</h3>
<ul>
<li><b>Phu dọc:</b> 3 lá trở lên cùng chất, số liên tiếp (vd: Tam–Tứ–Ngũ Vạn).</li>
<li><b>Phu bí:</b> 3 lá cùng số, 3 chất khác nhau (vd: Tam Vạn + Tam Văn + Tam Sách).</li>
<li><b>Trùng tam:</b> 3 lá giống hệt nhau. <b>Thiên khai:</b> 4 lá giống hệt nhau.</li>
<li><b>Phu yêu:</b> 3 lá trở lên đều là lá yêu (Nhất Vạn, Nhất Văn, Nhất Sách,
Chi Chi, Thang Thang, Ông Cụ).</li>
<li><b>Phu đặc biệt (3 lá):</b> tôm (Thất Văn + Tam Sách + Tam Vạn), lèo
(Chi Chi + Bát Sách + Cửu Vạn), Cửu Văn + Nhất Sách + Nhất Vạn,
Bát Văn + Nhị Sách + Nhị Vạn, Thang Thang + Cửu Sách + Cửu Vạn,
Thang Thang + Cửu Sách + Ông Cụ.</li>
</ul>
<h3>⭐ Lưng — phu đặc biệt</h3>
<p>Muốn ù, bài phải có ít nhất 1 <b>lưng</b>: trùng tam, thiên khai, phu
1–2–3 Văn, hoặc 1 trong 6 phu đặc biệt trên.</p>
<h3>🔴 Lá đỏ</h3>
<p>7 loại lá đỏ: Chi Chi, Thang Thang, Ông Cụ, Bát Vạn, Cửu Vạn, Bát Sách,
Cửu Sách (28 lá). Ù với ≥ 10 lá đỏ là <b>thập điều</b>, 0 lá đỏ là
<b>bạch định</b>, chỉ có đúng 1 lá đỏ là Ông Cụ là <b>kính cụ</b>.</p>
<h3>🎴 Lượt chơi</h3>
<ul>
<li>Nhà cái đánh 1 lá mở đầu. Tới lượt bạn: <b>ăn</b> lá ở cửa (ghép với 2 lá
trên tay thành phu) hoặc <b>bốc</b> 1 lá từ nọc.</li>
<li>Bốc được lá ghép phu với 2 lá trên tay thì <b>ăn lá vừa bốc</b>, không thì
<b>bỏ qua</b> (lá đó thành lá ở cửa).</li>
<li>Sau khi ăn phải <b>đánh 1 lá</b>. Hết nọc mà chưa ai ù thì hòa.</li>
<li><b>Chíu:</b> tay có 3 lá giống hệt, lá thứ 4 xuất hiện (người khác đánh
hoặc bạn bốc được) thì được chíu — úp 4 lá thành phu, rồi đánh 1 lá, lượt
tiếp tục từ bạn. Chíu được ưu tiên hơn ăn.</li>
<li><b>Xin thua:</b> kết thúc trận ngay; người còn lại có nhiều phu nhất thắng.</li>
</ul>
<h3>🏆 Cước khi ù</h3>
<p>Thiên ù, Tôm, Lèo, Thập điều, Bạch định, Kính cụ, Chi nảy (ù bằng Chi Chi),
Khàn (có trùng tam/thiên khai hoặc đã chíu), Ù suông.</p>
<h3>👥 Số người</h3>
<p>4–5 người (5 người là chuẩn). Mỗi người 20 lá, nhà cái 21 lá. Nọc 19 lá
(5 người) hoặc 39 lá (4 người).</p>
`;
export default GUIDE_HTML;
