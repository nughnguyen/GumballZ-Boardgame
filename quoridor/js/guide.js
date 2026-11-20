// 📖 Hướng dẫn Quoridor — HTML chèn vào hộp thoại (giống Rummikub).
export const GUIDE_HTML = `
<h2>🧱 Cách chơi Quoridor</h2>
<p><b>Quoridor</b> là game chiến thuật kinh điển: 2–4 người, bàn 9×9 ô, mỗi người 1 quân + tường. Ai đưa quân tới <b>hàng đích đối diện</b> trước thì thắng!</p>
<h3>🧱 Bàn cờ và quân</h3>
<p>Bàn 9×9 ô. 2 người: bạn bắt đầu ở hàng cuối (hàng 9), đối thủ ở hàng đầu (hàng 1), mỗi người <b>10 tường</b>. 3–4 người: mỗi người <b>5 tường</b>, bắt đầu ở 4 phía khác nhau và phải sang phía đối diện.</p>
<h3>🚶 Mỗi lượt: đi quân hoặc đặt tường</h3>
<ul>
<li><b>Đi quân:</b> bấm vào quân của bạn rồi bấm 1 ô kề (lên / xuống / trái / phải) có viền vàng. Không được đi xuyên tường.</li>
<li><b>Đặt tường:</b> bấm nút 🧱 Tường ngang hoặc 🧱 Tường dọc, rồi bấm vào 1 khe giữa 4 ô để đặt tường dài 2 ô. Tường chặn đường đi của mọi người, kể cả bạn — đặt xong không dời được!</li>
</ul>
<h3>🤼 Nhảy qua quân đối thủ</h3>
<p>Khi quân bạn kề quân đối thủ, bạn được <b>nhảy thẳng qua</b> 1 ô (nếu ô sau trống). Nếu ô sau bị tường chặn hoặc ra khỏi bàn, bạn được <b>nhảy chéo</b> sang 1 trong 2 ô bên của quân đối thủ.</p>
<h3>⚠️ Tường không được chặn kín đường</h3>
<p>Không được đặt tường chặn kín hoàn toàn đường đi của bất kỳ người chơi nào tới đích — luôn phải còn ít nhất 1 đường đi cho mọi người. Game sẽ báo nếu tường bạn đặt phạm luật.</p>
<h3>🏆 Ai thắng?</h3>
<p>Người đầu tiên đưa quân tới <b>hàng đích đối diện</b> thắng trận. Xin thua giữa trận thì trận kết thúc ngay, người còn lại gần đích nhất thắng.</p>
<h3>💡 Mẹo</h3>
<p>Đi thẳng tới đích là nhanh nhất (9 bước) — nhưng đối thủ sẽ chặn bạn bằng tường! Đặt tường ngay trước mặt đối thủ để bắt họ đi vòng, nhưng nhớ giữ tường cho lúc cần: hết tường thì chỉ còn nước đi thẳng. Khi đối thủ chỉ còn cách đích 1–2 bước, 1 bức tường đúng chỗ đáng giá hơn 1 bước đi.</p>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`;
