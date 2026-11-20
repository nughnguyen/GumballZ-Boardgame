// 📖 Hướng dẫn Chắn — HTML chèn vào hộp thoại (giống Hanabi).
export const GUIDE_HTML = `
<h2>🀄 Cách chơi Chắn</h2>
<p><b>Chắn</b> là game bài dân gian Việt Nam (họ tổ tôm): 2–4 người, bộ <b>100 lá</b>, ai xếp được bài thành chắn và cạ trước thì <b>ù</b> và thắng ván.</p>
<h3>🀄 Bộ bài 100 lá</h3>
<ul>
<li><b>25 loại × 4 lá:</b> 1 loại <b>Chi Chi</b> (không thuộc chất nào) + 3 chất <b>Vạn / Văn / Sách</b> × số <b>Nhị–Cửu (2–9)</b>.</li>
<li><b>20 lá đỏ:</b> Chi Chi, Cửu Vạn, Cửu Sách, Bát Vạn, Bát Sách. Còn lại 80 lá đen.</li>
<li>Mỗi người <b>19 lá</b>, người cái (đi trước) <b>20 lá</b>, còn lại úp thành <b>nọc</b> để bốc dần.</li>
</ul>
<h3>🃏 Chắn, cạ, ba đầu, què</h3>
<ul>
<li><b>Chắn:</b> 2 lá giống hệt nhau (VD: 2 lá Tứ Vạn, 2 lá Chi Chi).</li>
<li><b>Cạ:</b> 2 lá cùng số, khác chất (VD: Tứ Vạn + Tứ Sách). Chi Chi không ghép cạ.</li>
<li><b>Ba đầu:</b> 3 lá cùng số, khác chất (VD: Tam Vạn + Tam Văn + Tam Sách).</li>
<li><b>Què:</b> lá lẻ không ghép được với lá nào trên tay — thường là lá nên đánh đi.</li>
</ul>
<h3>🎲 Một lượt chơi</h3>
<p>Đến lượt bạn, bạn làm <b>1 trong 2 việc</b>:</p>
<ul>
<li><b>Bốc 1 lá từ nọc</b> (lật ngửa cho mọi người thấy): nếu lá đó ù được thì <b>ù ngay</b>; nếu nó tạo thành chắn/cạ với bài trên tay thì bạn có thể <b>ăn</b> (hạ cặp xuống chiếu) hoặc <b>bỏ qua</b> (để lá ở cửa cho người sau ăn).</li>
<li><b>Ăn lá ở cửa</b> (lá người trước vừa bỏ ra): nếu nó tạo thành chắn/cạ với bài trên tay thì bạn ăn nó, hạ cặp xuống chiếu.</li>
</ul>
<p>Sau khi ăn thì bạn phải <b>đánh ra 1 lá</b>. Lá đánh ra nằm ở cửa của bạn — người sau có thể ăn nó.</p>
<h3>🖐️ Chíu</h3>
<p>Đang giữ <b>3 lá giống hệt nhau</b> (khàn) mà có lá thứ 4 xuất hiện — ai bốc hay đánh ra cũng được — thì bạn được <b>chíu ngay cả khi chưa tới lượt</b>. Chíu hạ 4 lá thành <b>2 chắn</b>, rồi bạn đánh ra 1 lá và lượt tiếp tục từ bạn. Chíu được ưu tiên hơn ăn thường.</p>
<h3>🏆 Ù — thắng ván</h3>
<p>Bạn <b>ù</b> khi 20 lá (tay + bài đã ăn + lá vừa bốc/ăn) xếp hết thành <b>10 cặp chắn/cạ</b> và có ít nhất <b>6 chắn</b>. Các kiểu ù đặc biệt (cước):</p>
<ul>
<li><b>Thiên ù:</b> người cái ù ngay với 20 lá vừa chia.</li>
<li><b>Bạch thủ:</b> chờ ù với 5 chắn + 4 cạ + 1 què, lá ù ghép thành chắn (đủ đúng 6 chắn).</li>
<li><b>Ù rộng:</b> chờ ù với 6 chắn + 3 cạ + 1 què, lá ù ghép thành chắn hoặc cạ đều được.</li>
<li><b>Thập thành:</b> cả 10 cặp đều là chắn.</li>
<li><b>Tám đỏ:</b> bài ù có ít nhất 8 lá đỏ. <b>Bạch định:</b> bài ù không có lá đỏ nào.</li>
<li><b>Tôm:</b> bài ù có chắn Thất Văn + chắn Tam Sách + chắn Tam Vạn. <b>Lèo:</b> bài ù có chắn Chi Chi + chắn Cửu Vạn + chắn Bát Sách.</li>
<li><b>Chì:</b> ù bằng lá mình tự bốc ở cửa của mình. <b>Chíu ù:</b> ù bằng 1 nước chíu.</li>
</ul>
<h3>🤝 Hòa</h3>
<p>Hết nọc mà chưa ai ù thì ván hòa — không ai thắng.</p>
<h3>💡 Mẹo</h3>
<p>Xếp riêng chắn, cạ, ba đầu và què trên tay để dễ nhìn (game đã xếp sẵn theo loại). Giữ chắn, đừng phá chắn để ăn cạ. Lá què (không ghép được với lá nào) là lá nên đánh đi trước. Lá đỏ giữ lại có thể thành cước tám đỏ, nhưng đừng giữ què đỏ quá lâu. Khi có 3 lá giống nhau, nhớ canh chíu — chíu cho ngay 2 chắn. Chơi chuyền tay: bài chỉ hiện cho người tới lượt — đi xong nhớ che lại trước khi đưa máy.</p>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`;

