// 📖 Hướng dẫn Hanabi — HTML chèn vào hộp thoại (giống Skull).
export const GUIDE_HTML = `
<h2>🎆 Cách chơi Hanabi</h2>
<p><b>Hanabi</b> là game bài hợp tác nổi tiếng: 2–5 người cùng nhau bắn pháo hoa — <b>cả đội cùng thắng hoặc cùng thua</b>, không ai đấu ai. Cả đội thắng khi bắn được <b>≥ 20/25 điểm</b>, thua khi dưới 20 hoặc hết 3 ngòi nổ.</p>
<h3>🎆 Bộ bài và bàn chơi</h3>
<ul>
<li><b>50 lá:</b> 5 màu (🔴 Đỏ, 🟡 Vàng, 🟢 Xanh lá, 🔵 Xanh dương, ⚪ Trắng) × số 1–5. Mỗi màu có: số 1 ×3, số 2 ×2, số 3 ×2, số 4 ×2, số 5 ×1 (lá 5 chỉ có 1 bản duy nhất!).</li>
<li><b>2–3 người</b> thì mỗi người 5 lá, <b>4–5 người</b> thì mỗi người 4 lá.</li>
<li><b>5 chồng pháo hoa</b> (1 chồng mỗi màu), bắt đầu từ trống, xếp theo thứ tự 1 → 2 → 3 → 4 → 5.</li>
<li><b>8 token gợi ý</b> 💡 và <b>3 ngòi nổ</b> 🧨.</li>
</ul>
<h3>🙈 Điểm đặc biệt: bạn không thấy bài của chính mình!</h3>
<p>Bạn thấy bài của <b>mọi người khác</b> (ngửa hết), nhưng bài của bạn thì <b>úp xuống</b> — bạn chỉ biết những gì đồng đội đã gợi ý cho bạn (số / màu của từng lá hiện ngay trên lá bài). Đừng bao giờ tự xem bài mình: đó chính là luật chơi!</p>
<h3>🎲 Mỗi lượt làm đúng 1 trong 3 việc</h3>
<p><b>1. Gợi ý</b> (tốn 1 token 💡): chọn 1 người khác và gợi ý <b>1 số</b> hoặc <b>1 màu</b> — TẤT CẢ lá của người đó có số/màu đó đều được đánh dấu. Gợi ý phải chỉ ra ít nhất 1 lá, và hết token thì không gợi ý được nữa. Bấm vào 1 lá trên tay người khác để gợi ý số hoặc màu của lá đó.</p>
<p><b>2. Bỏ 1 lá</b> (hồi 1 token 💡, tối đa 8): bỏ lá đó vào đống bỏ, rồi rút 1 lá mới. Đang đủ 8 token thì không được bỏ nữa. Lá 5 chỉ có 1 bản — bỏ nhầm là mất vĩnh viễn!</p>
<p><b>3. Đánh 1 lá:</b> lá đó phải là <b>số tiếp theo</b> của chồng màu đó (VD: chồng Đỏ đang có 2 thì đánh Đỏ 3). Đánh đúng thì lá lên chồng, <b>đánh lá 5 thì hồi 1 token</b>. Đánh sai thì lá vào đống bỏ và cả đội <b>mất 1 ngòi nổ</b> 🧨 — hết 3 ngòi là thua ngay.</p>
<p>Đánh/bỏ xong thì <b>rút 1 lá</b> (nếu còn bài trong chồng rút).</p>
<h3>🏁 Kết thúc ván</h3>
<ul>
<li><b>Hết bài:</b> khi chồng rút hết, mỗi người còn đúng <b>1 lượt nữa</b> (kể cả người vừa rút lá cuối), rồi tính điểm.</li>
<li><b>Đủ 25 điểm:</b> bắn xong cả 5 chồng thì kết thúc ngay — pháo hoa hoàn hảo! 🎉</li>
<li><b>Hết 3 ngòi nổ:</b> thua ngay.</li>
<li><b>Điểm = tổng 5 chồng</b> (tối đa 25). <b>≥ 20 điểm: cả đội thắng!</b> Dưới 20: cả đội thua.</li>
</ul>
<h3>📊 Thang điểm (chuẩn Hanabi)</h3>
<p>0–5: Thảm họa · 6–10: Còn vụng về · 11–15: Khá đấy · 16–19: Gần tới rồi · 20–21: Thắng! · 22–23: Xuất sắc · 24: Gần hoàn hảo · 25: Huyền thoại!</p>
<h3>💡 Mẹo</h3>
<p>Gợi ý lá <b>đánh được ngay</b> cho đồng đội (lá đó là số tiếp theo của chồng màu nó). Giữ lá 5 bằng cách gợi ý số 5 cho người có nó. Bỏ lá chưa được gợi ý gì (lá cũ nhất) trước — lá đã được gợi ý thường là lá quan trọng. Đừng đánh lá khi chưa chắc: 1 lần đánh sai mất 1 ngòi, mà cả đội chỉ có 3 ngòi. Chơi chuyền tay: bài của người tới lượt luôn úp — ai cũng thấy bài người khác, chỉ mình không thấy bài mình.</p>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`;
