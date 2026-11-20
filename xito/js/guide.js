// 📖 Xì Tố — nội dung hướng dẫn (cũng là nguồn cho tools/guide/make.mjs).
export const GUIDE_HTML = `
<section class="gd">
  <h3>🎯 Mục tiêu</h3>
  <p>Xì Tố là Texas Hold'em — trò poker nổi tiếng nhất thế giới. Mỗi người được <b>2 lá tẩy</b> (chỉ mình mình biết), rồi <b>5 lá chung</b> được lật dần ra giữa bàn: <b>Flop (3 lá), Turn (1 lá), River (1 lá)</b>. Ghép 2 lá tẩy + 5 lá chung thành <b>tay bài 5 lá mạnh nhất</b> — ai mạnh nhất hốt gà, hoặc dọa cho mọi người Bỏ hết thì thắng luôn không cần lật bài!</p>

  <h3>🃏 Trình tự một ván</h3>
  <ul>
    <li><b>Góp mù:</b> 2 người ngồi sau nhà cái (dealer) góp mù trước — mù nhỏ <b>5 xu</b>, mù lớn <b>10 xu</b> (chủ phòng chọn "chơi vui 0 xu" thì bỏ qua bước này).</li>
    <li><b>Pre-flop:</b> chia 2 lá tẩy mỗi người, rồi cược vòng đầu — người sau mù lớn đi trước.</li>
    <li><b>Flop:</b> lật 3 lá chung, cược vòng 2.</li>
    <li><b>Turn:</b> lật lá chung thứ 4, cược vòng 3.</li>
    <li><b>River:</b> lật lá chung thứ 5, cược vòng cuối rồi <b>lật bài</b> (showdown).</li>
  </ul>

  <h3>⚔️ Các hành động khi cược</h3>
  <ul>
    <li><b>Xem</b> — không cược thêm (chỉ khi chưa có ai Tố).</li>
    <li><b>Theo</b> — bỏ bằng mức cược hiện tại để ở lại ván.</li>
    <li><b>Tố</b> — nâng mức cược lên (tối thiểu +10 xu so với mức hiện tại).</li>
    <li><b>Tất tay</b> — cược hết số chip còn lại của mình.</li>
    <li><b>Bỏ</b> — úp bài, mất số xu đã cược, chờ ván sau.</li>
  </ul>

  <h3>💰 Gà &amp; chia gà</h3>
  <ul>
    <li>Mỗi người bắt đầu ván với <b>200 chip</b>. Mù và cược trừ vào ví xu của bạn (chế độ chơi vui 0 xu thì chỉ tính điểm).</li>
    <li>Người thắng hốt toàn bộ gà. <b>Hòa bài thì chia đều gà</b>, xu lẻ cho người ngồi sau nhà cái trước.</li>
    <li>Ai <b>Tất tay với ít xu hơn</b> chỉ được chia phần gà tới mức mình đã góp (side pot) — phần dư trả lại cho những người còn cược.</li>
    <li>Không đủ xu góp mù lớn thì vẫn chơi nhưng chỉ được thắng tới mức mình đã góp.</li>
    <li>Thắng ván được <b>+10 xu</b>, chơi 1 ván được <b>+2 xu</b> vào ví chung của trang.</li>
  </ul>

  <h3>🏆 Xếp hạng tay bài (mạnh → yếu)</h3>
  <ul>
    <li><b>Thùng phá sảnh</b> — 5 lá liên tiếp cùng chất (mạnh nhất).</li>
    <li><b>Tứ quý</b> — 4 lá cùng số.</li>
    <li><b>Cù lũ</b> — 3 lá cùng số + 1 đôi.</li>
    <li><b>Thùng</b> — 5 lá cùng chất.</li>
    <li><b>Sảnh</b> — 5 lá liên tiếp (A-2-3-4-5 là sảnh nhỏ nhất, 10-J-Q-K-A là lớn nhất).</li>
    <li><b>Sám cô</b> — 3 lá cùng số.</li>
    <li><b>Hai đôi</b> — 2 đôi khác số.</li>
    <li><b>Một đôi</b> — 1 đôi.</li>
    <li><b>Mậu thầu</b> — không có gì, so lá cao nhất.</li>
  </ul>

  <h3>💡 Mẹo chơi</h3>
  <ul>
    <li>Đôi cao (AA, KK, QQ) và bài đồng chất liên tiếp (như J♠ Q♠) là bài tẩy mạnh — đừng ngại Tố.</li>
    <li>Bài yếu mà người ta Tố to thì Bỏ sớm cho đỡ tốn xu — chờ ván khác.</li>
    <li>Đôi khi <b>bluff</b> (Tố mạnh dù bài yếu) cũng thắng — nhưng đừng lạm dụng, bot Khó đọc bài lắm đấy!</li>
    <li>Chế độ chơi cùng máy (pass-and-play): mỗi người chỉ được xem bài tẩy của mình khi tới lượt — nhớ che màn hình nhé!</li>
  </ul>

  <h3>🎮 Chế độ chơi</h3>
  <ul>
    <li><b>Online:</b> tạo phòng, gửi mã 5 ký tự / link / QR cho bạn bè (2–9 người).</li>
    <li><b>Chơi với bot:</b> Dễ (ham gọi, ít Bỏ) hoặc Khó (tính pot odds, biết bluff).</li>
    <li><b>Chơi cùng máy:</b> 2–9 người chung một máy, bài tẩy chỉ hiện khi tới lượt mình.</li>
  </ul>
</section>
`;
