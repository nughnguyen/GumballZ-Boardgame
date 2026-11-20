// 📖 Hướng dẫn Lấy 6 — HTML chèn vào hộp thoại (giống Sushi Go).
export const GUIDE_HTML = `
<h2>🐂 Cách chơi Lấy 6 (6 Nimmt!)</h2>
<p><b>Lấy 6</b> là game bài "đầu bò": 2–10 người, mỗi người 10 lá, trên bàn có 4 dãy. Mỗi lượt mọi người <b>cùng chọn 1 lá</b> úp xuống rồi lật cùng lúc — lá nhỏ đặt trước, lá lớn đặt sau, và ai "ôm" phải dãy thì lấy cả dãy làm phạt!</p>
<h3>🃏 Bộ bài (104 lá) và đầu bò</h3>
<p>Bộ bài có 104 lá đánh số 1–104. Mỗi lá có số <b>đầu bò</b> (điểm phạt) in trên lá:</p>
<ul>
<li>🐂 <b>1 đầu bò:</b> hầu hết các lá.</li>
<li>🐂🐂 <b>2 đầu bò:</b> lá tận cùng là 5 (5, 15, 25, 35, 45, 65, 75, 85, 95).</li>
<li>🐂🐂🐂 <b>3 đầu bò:</b> lá tận cùng là 0 (10, 20, 30, …, 100).</li>
<li>🐂🐂🐂🐂🐂 <b>5 đầu bò:</b> lá đôi (11, 22, 33, 44, 66, 77, 88, 99).</li>
<li>🐂🐂🐂🐂🐂🐂🐂 <b>7 đầu bò:</b> riêng lá 55.</li>
</ul>
<h3>🎲 Mỗi lượt</h3>
<p>Mỗi người chọn <b>1 lá</b> trên tay rồi mọi người lật cùng lúc. Các lá được đặt <b>theo thứ tự tăng dần</b>: mỗi lá rơi vào dãy mà <b>lá cuối lớn nhất nhưng vẫn nhỏ hơn lá đó</b>.</p>
<ul>
<li>Ví dụ: các dãy kết thúc bằng 10, 25, 40, 60 — lá 30 rơi vào dãy kết thúc bằng 25, lá 55 rơi vào dãy kết thúc bằng 40.</li>
<li><b>Lá nhỏ hơn mọi lá cuối</b> (ví dụ lá 5 khi các dãy kết thúc bằng 10, 25, 40, 60): người đó <b>phải lấy nguyên 1 dãy</b> — được chọn dãy nào cũng được (thường lấy dãy ít đầu bò nhất), lá của mình mở dãy mới.</li>
<li><b>Lá là lá thứ 6 của 1 dãy:</b> người đó <b>lấy 5 lá đầu</b> của dãy làm phạt, lá của mình mở dãy mới (dãy chỉ chứa đúng 1 lá đó).</li>
</ul>
<h3>🏆 Ai thắng?</h3>
<p>Hết 10 lượt (mọi người đã đánh hết 10 lá), ai có <b>ít đầu bò nhất thì thắng trận</b>. Hòa đầu bò thì so <b>số lá đã lấy</b> (ít hơn thắng), vẫn hòa thì <b>ghế ngồi sớm hơn</b> thắng. Xin thua giữa trận thì trận kết thúc ngay, người còn lại ít đầu bò nhất thắng.</p>
<h3>💡 Mẹo</h3>
<p>Đánh lá nhỏ thì đặt trước (an toàn hơn), đánh lá lớn thì đặt sau (dễ bị "chen ngang" thành lá thứ 6). Lá có khe nhỏ với lá cuối của dãy thì an toàn nhất — ít khả năng có người chen lá vào giữa. Đừng tham đánh lá lớn khi dãy đã có 5 lá, trừ khi bạn muốn lấy dãy đó!</p>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`;
