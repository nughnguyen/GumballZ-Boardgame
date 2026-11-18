// 📖 Hướng dẫn Ô Ăn Quan – nội dung hộp "Cách chơi" trong game, đồng thời là nguồn
// để tools/guide/make.mjs sinh trang huong-dan/index.html (chạy trên máy dev).
export const GUIDE_HTML = `<div class="guide"><h2>📖 Cách chơi Ô Ăn Quan</h2>
<p><b>Ô Ăn Quan</b> là trò chơi dân gian Việt Nam cho 2 người. Bàn cờ có <b>12 ô xếp thành vòng tròn</b>: 2 ô Quan (bán nguyệt ở 2 đầu trái – phải) và 10 ô Dân (5 ô mỗi bên). Đầu ván, mỗi ô Quan có <b>1 quân Quan</b>, mỗi ô Dân có <b>5 quân Dân</b>. Ai ăn được nhiều điểm hơn thì thắng.</p>
<h3>1. Cách đi — bấm ô để bốc, bấm ô kề để rải</h3>
<ul>
<li>Bấm vào <b>1 ô Dân bên phía mình</b> còn quân (&gt; 0): <b>bàn tay sẽ bốc toàn bộ quân trong ô lên</b> — ô trống tạm thời, trên tay hiện chùm đá đang cầm kèm số đếm. Hai ô kề bên trái và bên phải của ô đó sẽ sáng lên.</li>
<li>Bấm vào <b>ô kề bên trái</b> để rải sang trái, bấm <b>ô kề bên phải</b> để rải sang phải (theo đúng trái/phải nhìn thấy trên màn hình). Bàn tay đi từng bước, thả 1 viên vào mỗi ô — số đá trên tay giảm dần, dễ theo dõi từng bước.</li>
<li>Bấm lại vào <b>chính ô gốc</b> để đặt đá xuống và chọn ô khác. Bấm vào ô khác (không phải ô kề, không phải ô gốc) thì không có gì xảy ra — đá vẫn nằm trên tay. Bấm <b>Esc</b> để hủy bốc (đặt đá về ô gốc).</li>
<li>Game bốc toàn bộ quân ở ô đã chọn và thả từng viên một vào các ô liền kề tiếp theo theo hướng đã chọn — kể cả 2 ô Quan. Mỗi viên rơi cách nhau một nhịp để nhìn kịp đường đi.</li>
<li>Bàn tay đi theo cả các pha <b>rải tiếp</b> (bốc tiếp ở ô kế) và <b>ăn quân</b> (xúc đá ăn được đưa về túi điểm của bạn) — và cả lượt của máy cũng vậy, để bạn theo dõi được nước đi của máy.</li>
<li>Hàng trên là phía đối phương (Máy hoặc Người chơi 2), hàng dưới là phía bạn. Quân Quan to, đỏ, có sao vàng — khác hẳn quân Dân nhỏ màu đá.</li>
<li>Trên mỗi ô luôn có <b>huy hiệu số</b> ghi chính xác số quân hiện có trong ô (ô Quan có Quan thì huy hiệu đỏ, có 👑).</li>
</ul>
<h3>2. Sau khi thả hết viên cuối — 4 trường hợp</h3>
<ul>
<li><b>A. Rải tiếp:</b> ô kế tiếp là ô Dân có quân (&gt; 0) → bốc hết quân ở ô đó lên và rải tiếp theo hướng cũ.</li>
<li><b>B. Chững vì Quan:</b> ô kế tiếp là ô Quan đang có quân (còn Quan hoặc còn Dân) → <b>không được bốc ô Quan lên</b>, mất lượt.</li>
<li><b>C. Ăn quân &amp; ăn dây:</b> ô kế tiếp trống (0 quân) <b>và</b> ô liền sau ô trống đó có quân (Dân hay Quan đều được) → <b>ăn toàn bộ quân ở ô đó</b> vào túi điểm. Ăn dây: ngay sau ô vừa ăn, nếu ô kế tiếp lại trống và ô sau đó nữa lại có quân → ăn tiếp, cho đến khi gặp 2 ô trống liên tiếp hoặc gặp ô có quân chặn lại. Ăn được ô Quan thì ăn cả Quan lẫn Dân trong ô đó.</li>
<li><b>D. Mất lượt do 2 ô trống:</b> ô kế tiếp trống và ô sau đó cũng trống → hết lượt.</li>
</ul>
<h3>3. Luật "Cứu dân"</h3>
<p>Đầu lượt của bạn, nếu toàn bộ 5 ô Dân bên phía bạn đều trống (0 quân) mà ván chưa kết thúc, bạn <b>bắt buộc phải cứu dân</b>: trích 5 quân Dân từ túi điểm của mình để rải đều vào 5 ô bên phía mình (mỗi ô 1 quân), rồi mới đi tiếp.</p>
<ul>
<li>Trong túi không đủ 5 Dân thì <b>đổi 1 Quan = 10 Dân</b> trước (nếu có Quan trong túi).</li>
<li>Vẫn không đủ thì được <b>vay Dân trong túi đối phương</b> — số Dân vay sẽ trừ vào tổng điểm cuối trận của bạn.</li>
<li>Trường hợp biên: nếu vẫn không cứu được (không còn Dân, không còn Quan, đối phương cũng không đủ Dân để vay) thì <b>ván kết thúc ngay</b> và tính điểm tàn quân như mục 4. Quân còn trong 2 ô Quan lúc đó <b>không tính cho bên nào</b>.</li>
</ul>
<h3>4. Kết thúc &amp; tính điểm</h3>
<p>Ván kết thúc khi <b>cả 2 ô Quan đều trống</b> (cả Quan lẫn Dân trong 2 ô Quan đều đã bị ăn hết). Khi kết thúc, toàn bộ quân Dân còn sót lại trên 5 ô hàng của bên nào thì thuộc về bên đó ("tàn quân").</p>
<p><b>Tổng điểm = (số Quan ăn được × giá trị Quan) + tổng số Dân có được − số Dân đã vay</b> (điểm không âm). Giá trị Quan chọn ở màn hình bắt đầu — chơi online thì chủ phòng chọn trong phòng chờ: <b>5 hoặc 10</b> điểm mỗi Quan. Lưu ý: khi cứu dân thì 1 Quan luôn đổi được 10 Dân, bất kể giá trị Quan là 5 hay 10.</p>
<h3>5. Chế độ chơi &amp; Máy AI</h3>
<ul>
<li><b>Đấu với Máy:</b> bạn đi hàng dưới, máy đi hàng trên. Máy <b>Dễ</b> chọn nước ngẫu nhiên; máy <b>Khó</b> tính trước 2–3 nước, ưu tiên ăn nhiều quân nhất (đặc biệt là ăn Quan) và tránh để bạn ăn Quan ở lượt sau.</li>
<li><b>2 Người chơi:</b> 2 người ngồi chung 1 máy, thay phiên nhau đi.</li>
<li><b>🌐 Chơi online:</b> bấm <b>🌐 Online</b> ở màn hình chính rồi <b>Tạo phòng online</b> — gửi mã phòng 5 ký tự (hoặc link mời) cho bạn; bạn nhập mã rồi bấm <b>Vào</b>. Chủ phòng chọn giá trị Quan trong phòng chờ rồi bấm <b>Bắt đầu chơi</b>. Mỗi nước đi đều đồng bộ cho cả 2 bên: bàn tay rải đá y hệt nhau ở 2 máy. Nếu đối thủ mất kết nối thì máy sẽ đi thay sau vài giây; chủ phòng rời thì phòng giải tán.</li>
</ul>
<h3>6. Đổi ảnh bàn cờ / đá của riêng bạn</h3>
<p>Game mặc định dùng bàn gỗ và đá vẽ bằng CSS/SVG. Nếu bạn có ảnh sprite sheet riêng, thả file <b>oanquan/img/spritesheet.png</b> vào thư mục game (cùng chỗ với file zip đã giải nén) rồi tải lại trang — game tự dùng ảnh đó:</p>
<ul>
<li><b>Bố cục ảnh:</b> 2/3 trên của ảnh là ảnh bàn cờ gỗ nhìn từ trên xuống (làm nền bàn); 1/3 dưới là 2 viên đá đặt cạnh nhau trên nền trắng — nửa trái là <b>đá Dân</b>, nửa phải là <b>đá Quan</b>.</li>
<li>Game tự tách nền trắng của ảnh (chroma-key) để đá hiện đẹp trên bàn gỗ.</li>
<li>Muốn đơn giản hơn, thả riêng 2 ảnh: <b>oanquan/img/stone-dan.png</b> (1 viên đá Dân) và <b>oanquan/img/stone-quan.png</b> (1 viên đá Quan), mỗi ảnh 1 viên đá trên nền trắng — 2 ảnh này được ưu tiên hơn dải đá trong sheet.</li>
<li>Không có file ảnh thì game vẫn chơi bình thường bằng đồ họa CSS/SVG.</li>
</ul>
<h3>7. Mẹo chơi</h3>
<ul>
<li>Ăn được ô Quan là nước ngon nhất (1 Quan = 5 hoặc 10 điểm) — nhưng nhớ: sau khi ăn, ô Quan trống có thể thành "cầu" cho đối phương ăn dây qua.</li>
<li>Đừng để 5 ô bên mình trống cùng lúc nếu túi đang ít điểm — cứu dân sẽ tốn túi hoặc phải vay đối phương.</li>
<li>Ô Dân nào có nhiều quân thì rải đi được xa — vừa ăn, vừa "dọn" bàn để đối phương khó ăn dây.</li>
</ul></div>`;
