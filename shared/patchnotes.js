// Patch notes GumballZ – mới nhất ở trên. game: 'all' | 'bang' | 'uno' | 'typhu' | 'scribble' | 'meono' | 'tamquoc' | 'masoi'
// Thêm bản mới: chèn object lên ĐẦU mảng, id tăng dần theo thời gian (YYYYMMDD-n).
export const GAMES = {
  all: '🎲 GumballZ', bang: '🤠 CÀ ĐÙNG!', uno: '🃏 UNÔ', typhu: '🏙️ Cờ Tỷ Phú', scribble: '🎨 Scribble it!', meono: '💣 Mèo Nổ', tamquoc: '⚔️ Tam Quốc Sát', masoi: '🐺 Ma Sói', xidach: '🃏 Xì dách', poker: '♠️ Poker', tienlen: '🐷 Tiến Lên', catte: '🂡 Cát tê', cangua: '🐴 Cờ cá ngựa', camel: '🐪 Đua Lạc Đà', solitaire: '🃏 Xếp bài', bacao: '👑 Ba Cào', cotuong: '♟️ Cờ tướng', thathaythach: '🎯 Thật hay Thách', baitan: '🃏 Bài Tấn', loto: '🎪 Lô tô', covua: '♟️ Cờ vua', tala: '🀄 Tá lả', cholon: '🏮 Chợ Lớn', tusac: '🀄 Tứ sắc', bantau: '🚢 Bắn Tàu', oanquan: '🪨 Ô Ăn Quan', caro: '✖️ Cờ Caro', tictactoe: '❌ TicTacToe', memory: '🃏 Memory', covay: '⚫ Cờ Vây', cothu: '🦁 Cờ Thú', ranvathang: '🐍 Rắn và Thang', sam: '🃏 Sâm Lốc', daochinh: '👑 Đảo Chính', xiecthu: '🎪 Gánh Xiếc Thú', cuuho: '🚁 Đội Cứu Hộ', khaihoang: '🏝️ Đảo Khai Hoang', xuyenviet: '🚂 Tàu Xuyên Việt', noitu: '🔗 Nối Từ', baucua: '🎲 Bầu Cua',
};
export const NOTES = [
  { id: '20261118-27', date: '18/11/2026', game: 'all', title: '🎨 Thiết kế lại footer: dải “Chơi ngay” + khối thương hiệu và 2 nhóm link', items: [
    '📄 Footer thiết kế lại hẳn bố cục (không chỉ đổi màu): 3 vùng xếp chồng — (1) dải kêu gọi hành động trên cùng nền vàng bơ #FFE3A3, viền mực trên/dưới, tiêu đề lớn “SẴN SÀNG CHƠI CHƯA?”, dòng phụ “39 game · chơi online cùng bạn bè, miễn phí, không cần cài đặt.” và nút “▶ Chơi ngay” lớn 56px; (2) khối thương hiệu bên trái (logo 56px, tên GUMBALLZ BOARDGAME, dòng giới thiệu) kèm 4 hành động cộng đồng dạng chip tròn (💌 Góp ý / báo lỗi, ☕ Ủng hộ chủ web, Facebook, Zalo) bên cạnh 2 nhóm link gọn là “Khám phá” (Trang chủ, Sảnh chung, Xếp hạng, Luật chơi) và “Trợ giúp” (Giới thiệu, Credits, Điều khoản, Bảo mật) — cột “Cộng đồng” cũ bỏ, link của nó chuyển thành chip; (3) thanh dưới gọn (© 2026 GumballZ Boardgame, số người đang online ở trang chủ, ghi chú fan-made). Mọi link giữ nguyên đích đến; nút/link tối thiểu 44px.',
    '📄 Áp dụng cho toàn bộ 47 trang có footer (trang chủ, Credits, Giới thiệu, Luật chơi, Bảo mật, Điều khoản, Công bằng, Sảnh chung và 39 trang hướng dẫn) + mẫu sinh trang hướng dẫn tools/guide/make.mjs (mẫu khớp từng byte với footer trang hướng dẫn đã sinh, nên sinh lại không làm mất bố cục mới). Mỗi trang vẫn đúng 1 footer (không tái diễn lỗi nhân 3).',
    '🔧 Kiểm tra: headless trang chủ + Credits + Luật chơi + 1 trang hướng dẫn ở 390px và 1280px (8 lượt): mỗi trang đúng 1 footer, 0 lỗi JS, không tràn ngang, đủ 12 link, nút “Chơi ngay” 56px, các link/chip tối thiểu 44px, tab dưới màn hình điện thoại không che dòng © ở cuối footer; bấm thử nút “Chơi ngay”, “Sảnh chung”, “Giới thiệu” đều đi đúng trang, không lỗi JS. Chưa kiểm được: bấm mở hộp Góp ý / Ủng hộ / Xếp hạng trực tiếp (mới kiểm bằng code tĩnh — dây nối đúng, hộp tạo được; trình duyệt kiểm tra hỏng giữa chừng), điện thoại thật, phòng online 2 người thật, đăng nhập Google/One Tap thật. Lối chơi, luật, thành tích, danh hiệu và đồ hoạ trong game giữ nguyên.',
    '⚠️ Lưu ý nhỏ: chip cố định “🎉 24 game mới” ở góc dưới-phải có thể che góc trên-phải của nút “▶ Chơi ngay” (rộng toàn màn hình) ở 390px khi cuộn tới đúng đoạn footer — bấm giữa nút vẫn được, tắt chip là hết.',
    '🧭 Thanh điều hướng gọn lại: bỏ 2 nút “Có gì mới” và “Góp ý” khỏi thanh trên (thanh trên giờ chỉ còn logo, ô tìm kiếm và 3 link Sảnh chung / Xếp hạng / Ủng hộ cùng khu vực tài khoản: nút tin tức 📝, nút hồ sơ, nút cài đặt). “Góp ý” vẫn tới được qua chip “💌 Góp ý / báo lỗi” ở footer; “Có gì mới” vẫn tới được qua nút tin tức 📝 ở khu vực tài khoản (mở cùng hộp tin tức). Ô tìm kiếm nhờ bớt 2 nút nên rộng hơn: tối đa 560px (đo được 422px ở 1280px, chữ gợi ý “🔎 Tìm game…” hiện đủ; ở 390px đo được 132px vẫn hiện đủ).',
    '🔎 Bỏ ô tìm kiếm thứ hai ở mục “Danh sách game” — trang chủ giờ chỉ còn đúng 1 ô tìm kiếm (trên thanh điều hướng, #gq-top). Lọc game giờ đọc trực tiếp từ #gq-top; gõ “uno” vào ô trên thanh điều hướng vẫn lọc đúng chỉ còn 1 thẻ UNÔ, xoá chữ thì hiện lại đủ 39 game; hộp tìm kiếm ở thanh điều hướng khi bấm Enter vẫn cuộn tới danh sách game. CSS ô tìm kiếm cũ (.gsearch) đã dọn.',
    '🎨 Hover ở footer thống nhất một kiểu: mọi link nav, chip cộng đồng và nút “Chơi ngay” đều chuyển trạng thái mượt (transition .15s) kèm nhấc nhẹ 1–2px; link nav có thêm đệm ngang nên nền hover thành viên thuốc gọn ôm chữ (nền trời #AFD8F3), chip nền mint #ABE0C6 + bóng đổ nhẹ, nút “Chơi ngay” nhấc lên + bóng đậm hơn, logo footer cũng nhấc nhẹ khi rê chuột. Đã rê chuột thật qua từng phần tử ở 1280px và 390px để kiểm tra: nền pill gọn, không che chữ, không vỡ bố cục.',
    '🔧 Kiểm tra thêm (đợt này): trang chủ ở 390px và 1280px — 0 lỗi JS, 0 tràn ngang; thanh trên còn đúng 3 link (Sảnh chung, Xếp hạng, Ủng hộ) + logo + ô tìm kiếm + khu vực tài khoản; bấm nút hồ sơ mở được hộp hồ sơ ở cả 2 cỡ; gõ “uno” lọc đúng 1 game, xoá chữ hiện lại 39/39; rê chuột thật qua nút “Chơi ngay”, chip Góp ý, link Sảnh chung và logo footer — hover hiện đúng (nền pill #AFD8F3 / mint #ABE0C6, nhấc 1–2px) ở cả 2 cỡ; dòng © cuối footer không bị tab dưới che ở 390px (cách 22px). 6 khối script inline của trang chủ đều qua node --check; mẫu footer khớp từng byte với footer trang hướng dẫn đã sinh; cả 47 footer có cùng một khối style footer giống hệt nhau. Chưa kiểm được: bấm mở hộp Góp ý / Ủng hộ / Xếp hạng trực tiếp (mới kiểm bằng code tĩnh), điện thoại thật, phòng online 2 người thật, đăng nhập Google/One Tap thật.'
  ] },
  { id: '20261118-26', date: '18/11/2026', game: 'all', title: '🐛 Sửa loạt lỗi giao diện: footer nhân 3, hộp game mới chặn trang, ô tìm kiếm bị bóp, xúc xắc 3D hiện chưa đủ', items: [
    '📄 Footer bị nhân 3 trên 45 trang: khối footer bị dán 3 lần (chỉ bản đầu có thẻ mở <footer class="gmf">, 2 bản sau là div trần + thẻ đóng thừa) nên 2 bản sau hiện không có CSS (link xanh gạch chân, chữ dồn cục). Giờ mỗi trang chỉ còn đúng 1 footer + 1 khối style footer; template sinh trang hướng dẫn vốn đã đúng nên không đổi.',
    '🎉 Hộp “24 GAME MỚI RA LÒ!” không còn tự mở thành hộp thoại chặn toàn trang lúc mới vào (nó từng che mọi cú bấm, kể cả nút hồ sơ). Giờ chỉ hiện một chip nhỏ “🎉 24 game mới” ở góc dưới-phải (trên điện thoại nằm trên tab dưới); bấm chip mới mở hộp danh sách 4 game mới, bấm ✕ thì không hiện lại nữa (nhớ bằng localStorage).',
    '🔎 Ô tìm kiếm trên thanh điều hướng bị bóp còn ~148px ở màn desktop (132px ở 390px) vì co theo nội dung. Giờ ô tìm kiếm rộng tối thiểu 220px ở desktop (đo được 340px ở 1280px, 220px ở 1500px), chữ gợi ý “🔎 Tìm game…” hiện đủ; các nút điều hướng thu hẹp khoảng cách để cân lại thanh.',
    '📱 Tab dưới màn hình điện thoại (cao 74px) từng che mất chân footer khi cuộn tới cuối trang. Giờ nội dung chính có đệm dưới 96px ở màn ≤1150px nên dòng © và ghi chú ở cuối footer luôn đọc được.',
    '🔥 Mục “Đang hot” ở cuối trang chủ: 4 thẻ rộng không đều, 2 hàng lệch cột (thẻ Mèo Nổ kéo rộng gần bằng 2 thẻ trên, thẻ UNÔ hẹp), cột hot ngắn hơn hẳn thẻ Thử thách bên cạnh để lại khoảng trống lớn. Giờ 4 thẻ thành lưới 2 cột đều nhau, cao bằng nhau, thẳng cột; cột hot giãn cao bằng thẻ Thử thách nên hết khoảng trống thừa. Trên điện thoại vẫn cuộn ngang nhưng 4 thẻ rộng đều 250px.',
    '🖼️ Đồng bộ favicon: chỉ trang chủ lên ?v=3, còn 87 trang vẫn link favicon.svg?v=1 và apple-touch-icon.png?v=1 nên trình duyệt có thể giữ icon cũ trong bộ nhớ đệm (file favicon.ico trong mã nguồn đã là logo GumballZ mới, md5 ee25f210 — icon đỏ cũ chỉ còn trong bộ nhớ đệm Windows/trình duyệt). Giờ mọi trang HTML đều dùng favicon.svg?v=3 và apple-touch-icon.png?v=3.',
    '🎲 Bầu Cua: 3 xúc xắc 3D giờ hiện đúng con vật thay vì chấm số — mẫu mới shared/models/dice-animals.glb (vẽ mới từ đầu, 6 mặt Nai/Bầu/Gà/Cá/Cua/Tôm đúng thứ tự, mặt kết quả hướng về người chơi, có xúc xắc 2D hình con vật dự phòng khi WebGL lỗi); tên con vật dưới xúc xắc vẫn giữ làm chú thích. Bàn cược đổi thành luôn 3 ô trên + 3 ô dưới ở mọi chiều rộng (trước đây desktop là 1 hàng 6 ô): hàng trên Nai/Bầu/Gà, hàng dưới Cá/Cua/Tôm, chip cược, huy hiệu ×1 và viền sáng ô trúng giữ nguyên.',
    '🎲 Xúc xắc 3D hiện chưa đủ (Bầu Cua + Rắn và Thang): nguyên nhân ở khung nhìn chung shared/js/dice3d-gl.js — khoảng cách camera tính theo tâm con xúc xắc nên mặt trước (gần camera hơn tâm) bị tính thiếu ~30%, con xúc xắc chạm/cắt mép trái-phải lúc đứng yên và cắt mép trên lúc lăn. Giờ camera tính theo mặt trước của con (0.5 lúc đứng yên, 0.87 nửa đường chéo + nảy 0.18 lúc lăn) kèm biên; Bầu Cua tăng cỡ xúc xắc lên 88px, khung lăn giữa bàn Rắn và Thang lên 160px để con xúc xắc vẫn to như trước mà hiện trọn vẹn cả lúc lăn; canvas xúc xắc thêm height:auto để khung hẹp không bóp méo con (bảng xúc xắc Rắn và Thang ở 390px từng bị bóp 72×72 thành 60×72). Âm thanh lắc + mặt kết quả hướng về người chơi giữ nguyên.',
    '🔍 Kiểm tra toàn diện 39 game + 9 trang thông tin + 39 trang hướng dẫn (390px và 1280px) rồi sửa các lỗi còn lại: Ô Ăn Quan vẽ thêm 2 ảnh đá thật (stone-dan.png, stone-quan.png, nền trắng để tách nền) và đổi thứ tự nạp ảnh (thử đá rời trước, spritesheet làm dự phòng) nên hết 3 request 404 mỗi lần vào game; Xếp bài (Solitaire) không còn tự mở hộp tuỳ chọn ván lúc mới vào (ván bắt đầu ngay với luật mặc định, đổi luật ở nút tên game); link nguồn tranh Tam Quốc Sát đổi chữ từ “img/CREDITS.md” thành “Danh sách nguồn tranh”; thêm footer chuẩn cho Sảnh chung và Công bằng (trang 404 và Quản trị giữ nguyên không footer vì là trang lỗi/trang quản trị tối giản); nút “Tìm trận nhanh”, “Bảng xếp hạng” và các chip lọc game ở sảnh lên tối thiểu 44px để bấm dễ trên điện thoại; 2 nút “📖 Hướng dẫn” / “▶ Chơi” trên mỗi thẻ game ở trang Luật chơi cũng lên tối thiểu 44px.',
    '⚠️ Lưu ý: mở web bằng cách chạy game.bat (localhost:8000) — mở trực tiếp file zip bằng file:// sẽ hỏng 6 import module JS do trình duyệt chặn (CORS), web không chạy được. Các chi tiết trang trí (mây, cồn cát, vệt màu nền) ở vài game có tràn ra ngoài mép màn hình nhưng không gây tràn ngang hay che nội dung nên giữ nguyên.',
    '🔧 Kiểm tra: node --check đạt cho mọi file JS đã đổi; headless trang chủ + 39/39 game + 9 trang thông tin + 39 trang hướng dẫn ở 390px và 1280px: 0 lỗi JS, 0 tràn ngang, footer đúng 1 (trừ trang 404 và Quản trị vốn không có footer), không hộp thoại tự mở; chơi thử 1 ván Bầu Cua thật ở 390px và 1280px (3 xúc xắc hiện đủ con vật đúng kết quả, bàn 3+3, 0 lỗi JS) và 1 lượt tung Rắn và Thang ở cả 2 cỡ màn (xúc xắc bảng + xúc xắc lăn giữa bàn đều hiện trọn vẹn). Chưa kiểm được: phòng online 2 người thật, điện thoại thật (cảm ứng, font thật), đăng nhập Google/One Tap thật. Lối chơi, luật, thành tích, danh hiệu và đồ hoạ trong game giữ nguyên.'
  ] },
  { id: '20261118-25', date: '18/11/2026', game: 'all', title: '🎨 Đổi bảng màu pastel dịu mắt + footer sáng + bỏ nút Tìm trận ở thanh điều hướng', items: [
    '🎨 Bảng màu pastel dịu mắt thay cho bảng màu rực trước đó: nền kem #FFF8EE, thẻ #FFFDF9, mực tím nhạt #4A3E5C, đào #FFB98A, vàng bơ #FFE3A3, hồng #FFB9CF, mint #ABE0C6, lavender #C9BDF3, xanh trời #AFD8F3; bóng mềm tối đa 3px. Thanh trên + tab dưới màn hình điện thoại đổi sang nền sáng, chữ mực vẫn đọc rõ. Bố cục giữ nguyên như lần thiết kế lại trước (vùng chơi ngay lên đầu, 4 kệ theo nhóm, sảnh đồng bộ).',
    '📄 Footer sáng lại toàn bộ 45 trang + trang Luật chơi: nền kem #FFFDF9, chữ mực #4A3E5C, tiêu đề trên chip hồng nhạt, nút “Chơi ngay” nền đào #FFB98A; cột Khám phá / Trợ giúp / Cộng đồng và các link giữ nguyên.',
    '🧭 Bỏ nút “⚡ Tìm trận” khỏi thanh điều hướng trên và tab dưới màn hình điện thoại (thanh trên còn Sảnh chung / Xếp hạng / Có gì mới / Góp ý / Ủng hộ; tab dưới còn Trang chủ / Sảnh / Xếp hạng / Hồ sơ). Ô “⚡ Tìm trận nhanh” ở vùng chơi ngay vẫn còn, nút tìm trận trong sảnh game và ghép trận vẫn chạy như trước.',
    '🖼️ Logo + favicon vẽ lại theo màu pastel (ô vàng bơ, mặt kẹo hồng nhạt): favicon.ico (16/32/48), favicon.svg, icon PNG thương hiệu, ảnh bìa trang chủ og.jpg (?v=7). Link favicon.ico thêm ?v=3 để trình duyệt tải lại icon mới thay vì giữ icon tab cũ trong bộ nhớ đệm.',
    '🔧 Kiểm tra: node --check đạt cho mọi file JS đã đổi; headless trang chủ + 39/39 game ở 390px và 1280px: 0 lỗi JS, không tràn ngang; footer sáng kiểm trên trang chủ + Credits + Luật chơi + hướng dẫn Cờ Tỷ Phú; tạo phòng UNO mở được sảnh, không còn request /voice hay /turn. Chưa kiểm được: phòng online 2 người thật, điện thoại thật, font Bungee thật (mạng chặn Google Fonts khi kiểm). Lối chơi, luật, thành tích, danh hiệu, xúc xắc 3D và nhân vật 3D trong game giữ nguyên.'
  ] },
  { id: '20261118-24', date: '18/11/2026', game: 'all', title: '🎨 Thiết kế lại toàn bộ giao diện lần 2 — bố cục + bảng màu mới', items: [
    '🎨 Bảng màu mới “Arcade Pop”: nền kem #FFF6E3, mực #1B1425, đỏ son #FF4D2E, vàng điện #FFE45C, hồng #FF5CA8, xanh ngọc #00B8A9, tím #7C5CFF; bóng cứng 4px; font tiêu đề Bungee + Nunito cho nội dung. Logo vẽ lại theo màu mới (ô vàng #FFC800, bong bóng hồng), icon PNG thương hiệu + ảnh bìa trang chủ og.jpg vẽ lại (“39 game” + “GumballZ Games”, og:image ?v=6).',
    '🏠 Trang chủ đổi hẳn bố cục: thanh trên nền mực có ô tìm kiếm ngay trong thanh + thanh tab cố định dưới màn hình điện thoại (Trang chủ / Sảnh / Tìm trận / Xếp hạng / Hồ sơ); vùng “chơi ngay” lên đầu (nhập mã phòng + Tạo phòng + Tìm trận nhanh), tiếp theo là thẻ game nổi bật, dải phòng đang mở, rồi 4 kệ theo nhóm (Cờ bàn 16 / Game bài 14 / Tụ tập 7 / Kiểu khác 2) thay cho một lưới phẳng duy nhất; thử thách ngày + game hot dời xuống cuối trang.',
    '🚪 Sảnh + màn hình chính 39 game đồng bộ: thẻ mã phòng vàng to (chữ Bungee, nút sao chép), hàng người chơi 56px, nút bắt đầu dính đáy màn hình kèm số người chơi, nút chính 56px, ô nhập 52px, nút bấm màn hình chính/phòng chờ tối thiểu 44px trên điện thoại (kể cả CÀ ĐÙNG!). Footer nền mực mới trên 45 trang; trang Luật chơi (luat/) làm hub đủ 39 game.',
    '🔧 Kiểm tra: node --check đạt cho mọi file JS đã đổi; headless trang chủ + 39/39 game ở 390px và 1280px: 0 lỗi JS, không tràn ngang, nút chính ≥44px trên điện thoại; luồng tạo phòng UNO mở được sảnh, không còn request /voice hay /turn; tìm kiếm/lọc game kiểm lại sau khi sửa lỗi thứ tự CSS làm ô tìm kiếm không ẩn tile. Chưa kiểm được: phòng online 2 người thật trên mạng thật, điện thoại thật (cảm ứng, font thật), đăng nhập Google/One Tap thật. Lối chơi, luật, thành tích, danh hiệu, xúc xắc 3D và nhân vật 3D trong game giữ nguyên.'
  ] },
  { id: '20261118-23', date: '18/11/2026', game: 'all', title: '🧹 Viết lại lịch sử git — code không còn dấu vết repo nào', items: [
    '🧹 Viết lại toàn bộ lịch sử git thành 1 commit duy nhất: không còn commit, tác giả hay tin nhắn nào từ trước; code đã quét sạch mọi link/tên repo cũ, tên repo GumballZ trên GitHub, mã commit cũ và các ghi chú port trong code. Lịch sử cũ đã sao lưu riêng, không đẩy lên GitHub.',
    '🔧 Kiểm tra: tìm toàn bộ code không còn chuỗi nào trỏ tới repo cũ hay repo GumballZ; trang chủ headless 0 lỗi JS. Lưu ý: trang GitHub của repo vẫn hiện tên chủ repo (không giấu được khi còn host trên GitHub của Hưng); địa chỉ máy chủ phòng riêng và các thư viện bên thứ ba (Fairy-Stockfish, lichess, qrcode-generator, MQTT.js) vẫn giữ nguyên vì web cần chúng để chạy.'
  ] },
  { id: '20261118-22', date: '18/11/2026', game: 'all', title: '🧹 Gọn footer — bỏ dòng ghi nguồn ở chân trang', items: [
    '🧹 Chân trang 45 trang giờ chỉ còn “© 2026 GumballZ Boardgame” (trang chủ vẫn giữ số người đang online); trang Credits và Giới thiệu bỏ đoạn mã nguồn gốc; link công cụ kiểm tra công bằng ở trang Công bằng trỏ về repo GumballZ; README gọn lại.',
    '🔧 Kiểm tra: tìm toàn web không còn dòng ghi nguồn ở chân trang hay trang thông tin; trang chủ headless 0 lỗi JS, số người online vẫn hiện. Lưu ý: lịch sử patch notes cũ vẫn nhắc tới nguồn gốc trong các mục đã ghi trước đây.'
  ] },
  { id: '20261118-21', date: '18/11/2026', game: 'all', title: '🎨 Thiết kế lại toàn bộ giao diện + bỏ voice chat', items: [
    '🎨 Thiết kế lại toàn bộ giao diện ngoài (không động giao diện trong game): hệ token neobrutalism mới trong shared/ui/neo.css (bảng màu FFD273/FEE686/FEC5E6/DEB5D7/BFAEE3, chữ mực #2a2340, bóng cứng tối đa 3px, bo góc + thang chữ thống nhất); font chuẩn toàn site Baloo 2 (tiêu đề/nút) + Nunito (nội dung), bỏ Be Vietnam Pro ở 13 CSS game; giữ font chữ Hán của quân Cờ Tướng/Tam Quốc và font trang trí chỉ dùng trong game (CÀ ĐÙNG!, Scribble).',
    '🖼️ Logo + icon mới: mark GumballZ vẽ mới (ô vàng #FFD273, bong bóng kẹo hồng #FEC5E6 mặt cười, viền mực 3px) — đổi favicon, icon PNG thương hiệu, SVG brand ở nav + footer 45 trang; 37 icon game restyle (viền 3px, màu về palette, giữ motif) + vẽ thêm 2 icon còn thiếu (CÀ ĐÙNG!, UNÔ) để đủ 39/39.',
    '🏠 Trang chủ mới: CSS tách sang shared/css/home.css, hero gọn, mục hot/phòng đang mở/bộ lọc/tìm kiếm giữ nguyên tính năng (đủ 39 tile, lọc đúng 16/14/7/2, tìm không dấu); footer mới thống nhất 45 trang (Chơi/Thông tin/Hỗ trợ, Facebook + Zalo của Hưng) — bỏ luật từng game ra khỏi footer; trang Luật chơi (luat/) xây lại thành hub đủ 39 game, mỗi game link tới trang hướng dẫn + nút Chơi, có tìm kiếm + lọc theo nhóm.',
    '📱 Mobile 390px: kiểm đủ 39 game + trang phụ — không tràn ngang, nút chính màn home/sảnh ≥40px (sửa nút nhỏ ở 4 game + rule chung home/sảnh trong gamekit.css/tutorial.js/shell.css; trong ván giữ nguyên 38px để khỏi lệch bố cục); Giới thiệu sửa “19 game” thành “39 game”; sửa lỗi hồi quy footer mới làm mất số người đang online ở chân trang chủ.',
    '🔇 Bỏ voice chat khỏi web hoàn toàn (Nguyễn quyết 18/11/2026): xoá shared/ui/voice.js, shared/net/voice-sfu.js, server/src/voice.js + route /voice/* và /turn (kể cả TURN của Cloudflare Realtime); gỡ nút/panel voice, chữ voice khỏi phòng/lobby/cài đặt/Privacy + 25 key dịch EN. Giữ nguyên mai mối PeerJS (shared/net/ice.js không có chữ voice nào), thanh trượt SFX/nhạc, Ma Sói AI và giọng đọc máy TTS tại chỗ (Quản trò đọc ở Ma Sói, Tiếng rao số ở Lô tô — không phải voice chat, không mic/không mạng).',
    '🖼️ Banner trang chủ vẽ lại: shared/img/og.jpg thành “39 game” + thương hiệu “GumballZ Games” (1200×630, cùng phong cách 39 banner game), og:image đổi ?v=4 thành ?v=5; template tools/og/make-og.mjs sửa luôn để lần sinh sau không quay lại “15 game”.',
    '🔧 Kiểm tra: node --check đạt cho mọi file JS đã đổi; wrangler deploy --dry-run đạt; headless trang chủ 1280px + 390px và 39/39 game ở 390px: 0 lỗi JS, không tràn ngang, không còn UI voice; server local trả 404 cho /voice/status, /turn, POST /voice/session; không còn request /voice hay /turn trong luồng tạo phòng UNO; banner og 39/39 đúng 1200×630. Chưa kiểm được: phòng online 2 người thật trên mạng thật, điện thoại thật (cảm ứng, font thật), dice GLB 3D trên máy có GPU, Google login/One Tap thật.'
  ] },
  { id: '20261118-20', date: '18/11/2026', game: 'all', title: '🎲 Sửa lỗi xúc xắc 3D lệch lên góc trên, che thanh sự kiện (Cờ Tỷ Phú + Cờ Cá Ngựa)', items: [
    '🐛 Lỗi: ở Cờ Tỷ Phú (và Cờ Cá Ngựa), xúc xắc 3D (model GLB) không nằm giữa bàn mà dạt lên góc trên-trái khung bàn, che mất thanh tóm tắt sự kiện (thanh trắng có chữ + nút +2 và ✕). Nguyên nhân: rule CSS `.view3d canvas{position:absolute;inset:0}` (viết cho canvas bàn 3D) bắt luôn cả canvas xúc xắc nằm trong #dice-ov — canvas bị kéo khỏi luồng, dính góc trên-trái khung bàn, còn khung chứa thì co về 0×0. Khối CSS 2D dự phòng không bị (nó là div, không phải canvas) nên kiểm headless tắt WebGL trước đây vẫn thấy xúc xắc ở giữa.',
    '🔧 Sửa: đổi rule thành `.view3d>canvas` ở typhu/css/typhu.css và cangua/css/cangua.css (chỉ canvas bàn 3D — con trực tiếp của khung — mới được phủ kín khung); đồng thời khung xúc xắc chung shared/js/dice3d-gl.js tự đặt canvas ở vị trí tĩnh (position:static) để không rule canvas chung nào bắt được nữa. 3 game xúc xắc còn lại (Rắn và Thang, Đảo Khai Hoang, Bầu Cua) không có rule canvas chung nên không lỗi — kiểm lại vẫn đúng vị trí.',
    '🎲 Sau sửa, lúc xúc xắc dừng nó nằm ở giữa thật của vùng bàn nhìn thấy (giữa khung bàn 3D), dưới thanh sự kiện nên chữ sự kiện đọc được đầy đủ; tổng điểm hiện dưới xúc xắc như cũ; số hiện vẫn bằng đúng số engine đã đổ.',
    '🔧 Kiểm tra: node --check đạt cho khung + 2 game; chơi ván thật headless (WebGL SwiftShader): Cờ Tỷ Phú đổ 5+2=7 đúng mặt, xúc xắc ở giữa bàn + thanh tóm tắt đọc được, 0 lỗi JS; Cờ Cá Ngựa đổ 3+6=9, xúc xắc ở giữa bàn, 0 lỗi JS; 390px dọc không tràn ngang, xúc xắc vẫn ở giữa bàn. Chưa kiểm được: trình duyệt/điện thoại thật, chơi online 2 người thật.'
  ] },
  { id: '20261118-19', date: '18/11/2026', game: 'all', title: '🖼️ Banner chia sẻ riêng cho từng game (39 banner “GumballZ Games”)', items: [
    '🖼️ Mỗi game trong 39 game giờ có banner Open Graph riêng (1200×630) khi chia sẻ link: phong cách neobrutalism, bảng màu GumballZ (vàng/hồng/tím), chữ mực #2a2340; mỗi banner gồm tên game + hình minh hoạ riêng của game đó + chữ thương hiệu “GumballZ Games” (không dùng “GumballZ Boardgame” trên banner). Banner trang chủ giữ nguyên.',
    '🎨 Vẽ bằng code (Python PIL, script tools/make-og-banners.py — chạy lại được bất cứ lúc nào): nền xoay 5 màu theo game, thẻ trắng viền mực + bóng cứng, khung hình trái chứa art gốc của game (cắt đúng vùng art, bỏ dải tên + logo cũ), cột phải ghi nhóm game + tên game + mô tả ngắn (lấy từ og:description của trang), góc phải dưới là nhãn thương hiệu kèm hình xúc xắc vẽ tay. Không dùng ảnh ngoài.',
    '🔧 31 banner mẫu cũ (có logo cũ + mặt cười cam) và 8 banner tự vẽ trước đây (ghi “GumballZ Boardgame”) đều vẽ lại thống nhất. Sửa 3 chỗ cắt art bị lỗi: Gánh Xiếc Thú/Tàu Xuyên Việt bị cắt lẹm chữ tên (dò vị trí chữ trắng để cắt trên dải tên), Rắn và Thang lẫn mẩu chữ + xúc xắc (đo khung bàn rồi cắt lại), Memory cắt mất cột bài thứ 3 (nới rộng khung cắt).',
    '🔧 Kiểm tra: đủ 39 file shared/img/og/<game>.jpg, đúng 1200×630; mỗi trang game có đủ og:title/og:description/og:image trỏ đúng file; không còn tên miền cũ trong metadata chia sẻ; trang chủ + vài trang game headless 0 lỗi JS, 390px không tràn. Chưa kiểm được: xem trước link thật trên Facebook/Zalo (cần link live sau khi push).'
  ] },
  { id: '20261118-18', date: '18/11/2026', game: 'all', title: '🎲 Xúc xắc 3D: lăn giữa bàn, có tiếng lách cách, mặt số hướng về người chơi', items: [
    '🎲 Vị trí: xúc xắc lăn ở GIỮA bàn chơi ở cả 5 game — Cờ Tỷ Phú/Cờ Cá Ngựa lăn giữa bàn cờ 3D (overlay giữa khung), Bầu Cua giữ trong chén (chén vốn đã ở giữa bàn cược), Rắn và Thang lăn giữa bàn (overlay giữa bàn, giữ hiệu ứng lăn ngang rồi dừng ở giữa), Đảo Khai Hoang thêm overlay lăn to giữa bản đồ (trước đây chỉ lăn nhỏ ở góc trái trên — góc bàn giờ chỉ còn bảng tổng nhỏ đặt mặt tĩnh). Overlay không chặn click, mờ sau ~1.7s.',
    '🔊 Tiếng xúc xắc: lăn thì kêu lách cách va chạm (Web Audio tổng hợp, không file ngoài) + \"cạch\" một tiếng khi dừng, kêu một lần cho mọi lượt (kể cả lượt đối thủ/máy). Tôn trọng thanh âm lượng Hiệu ứng ở ⚙️ Cài đặt (nút SFX chung) và công tắc tiếng riêng từng game (Cờ Tỷ Phú/Cờ Cá Ngựa: thanh SFX trong game; Bầu Cua/Đảo Khai Hoang: nút tiếng của game; Rắn và Thang: nút 🔊/🔇) — tắt tiếng thì không kêu. AudioContext resume sau cú click/chạm để không bị chặn autoplay. Tiếng lắc cũ ở Bầu Cua/Khai Hoang/Rắn và Thang đã bỏ để khỏi kêu trùng.',
    '🎲 Mặt số hướng về người chơi: lúc xúc xắc dừng, mặt hiện số hướng THẲNG về phía camera (chấm đứng thẳng trên màn hình, không nghiêng/khuất, không xoay ngẫu nhiên) — vẫn giữ hiệu ứng tung/lăn rồi mới dừng đúng mặt; số hiện vẫn bằng đúng số engine đã đổ, luật không đổi. Camera hơi chính diện hơn. Khối CSS 2D dự phòng giữ nguyên (mặt vốn đã hướng ra trước).',
    '🔧 Kiểm tra: node --check đạt cho khung + cả 5 game; toán quaternion kiểm bằng Node (mặt 1–6 đều hướng đúng về camera); trình duyệt headless: lăn đúng mặt ở cả 5 game, 0 lỗi JS, 390px không tràn, overlay Đảo Khai Hoang nằm giữa bản đồ. Chưa kiểm được: nghe tiếng thật bằng tai, chơi online 2 người thật, chạm tay thật trên điện thoại.'
  ] },
  { id: '20261118-17', date: '18/11/2026', game: 'all', title: '🔓 Bỏ chống gian lận — đánh local/bot được tính điểm + thêm danh hiệu & thành tựu khó hơn', items: [
    '🔓 Bỏ fix chống gian lận (Nguyễn quyết 18/11/2026): máy chủ nhận lại số ván/thắng/thành tích/chuỗi/ngày do trình duyệt gửi — game đấu máy/chơi đơn được tính vào XP và bảng xếp hạng như trước, bảng xếp hạng về tổng gộp (mốc cũ + ván đã xác minh + ván local). Giới hạn tốc độ vẫn giữ như cũ (lần đầu tối đa 5000 ván, về sau ~4 ván/phút) nên sửa số ồ ạt vẫn bị chặn; farm bằng bot thì vẫn làm được — Nguyễn đã chấp nhận đánh đổi này.',
    '🔧 Chống cộng trùng: ván online do máy chủ giữ vẫn được máy chủ ghi riêng; khi client đồng bộ, máy chủ trừ đi số ván đã xác minh tăng thêm kể từ lần đồng bộ trước nên ván đó chỉ tính 1 lần. Lần đồng bộ đầu sau bản này chỉ lấy mốc máy chủ làm nền (không gửi lại toàn bộ số local — số đó đã nằm trong "mốc cũ"), ván local kể từ đó lên ở lần sau. Hồ sơ cũ giữ nguyên, không mất điểm ai.',
    '🏆 Danh hiệu Cờ Thú đổi sang bản gốc ("🐘 Chúa sơn lâm"). Thêm 5 danh hiệu mới: 💠 Vô địch thiên hạ (thắng 500 ván), 🌋 Cỗ máy chiến thắng (thắng 20 ván liên tiếp), 🏰 Ông chủ bàn cờ (chơi 1000 ván), 🗓️ Gắn bó trăm ngày (chơi vào 100 ngày khác nhau), 🧭 Bậc thầy khám phá (chơi đủ 39 game).',
    '🏅 Thêm 129 thành tựu + nâng độ khó: 14 thành tựu chung bậc khó (chơi 1000 ván, thắng 200/500 ván, chuỗi 15/20, chơi 30/35 game, chơi 60/100 ngày, thắng 25 ván một game, 50 ván trong 1 ngày, thắng ở 25 game, thua 500 ván) + 3 mẫu mới theo từng game (thắng 50 ván, thắng 100 ván, chơi 50 ván — tổng thành tựu 468 → 597). Chỉ thêm id mới, không đổi ngưỡng cũ nên thành tựu đã mở của ai cũng giữ nguyên.',
    '🔧 Kiểm tra: node --check đạt cho server + client; mô phỏng đồng bộ (local mới, local cũ, ván máy chủ + local trùng, gửi lại cùng mã) đều đúng; trình duyệt headless: trang chủ 0 lỗi JS, 390px không tràn. Chưa kiểm được: đồng bộ thật bằng tài khoản thật trên Worker thật, chơi online 2 người thật.'
  ] },
  { id: '20261118-16', date: '18/11/2026', game: 'all', title: '🎲 Xúc xắc 3D thật (model GLB) cho 5 game', items: [
    '🎲 Xúc xắc 3D bằng model thật (shared/models/dice.glb, 226 KB): khối bo tròn, chấm dẹt in sát mặt, chấm số 1 màu đỏ, 20 chấm còn lại màu mực, mặt đối nhau cộng bằng 7 — thay cho xúc xắc 2D/CSS cũ ở 5 game: Cờ Tỷ Phú (2 con), Cờ Cá Ngựa (1–2 con), Bầu Cua (3 con), Đảo Khai Hoang (2 con), Rắn và Thang (1 con).',
    '🎲 Chỉ đổi cách HIỆN xúc xắc: số hiện ra luôn bằng đúng số engine đã đổ (lăn tung rồi dừng đúng mặt đó), luật chơi/cơ chế còn lại giữ nguyên. Bầu Cua vẫn ghi tên con vật dưới xúc xắc (nai=1, bầu=2, gà=3, cá=4, cua=5, tôm=6). Rắn và Thang giữ hiệu ứng lăn ngang giữa bàn; khối CSS cũ giữ làm dự phòng.',
    '🔧 Chạy offline/localhost: GLTFLoader (three r160) nhúng sẵn trong web, không dùng CDN; khung dùng chung shared/js/dice3d-gl.js (tải model 1 lần, nhân bản theo số con, lăn đồng thời). Hỏng WebGL/GLB thì mỗi game tự về xúc xắc 2D cũ, không crash.',
    '🔧 Kiểm tra: node --check đạt cho khung + cả 5 game; số hiện đúng engine (kiểm bằng Node: mặt quay đúng 6 giá trị, lăn tới đúng số thì đúng số chấm trên mặt); 390px không tràn (cỡ xúc xắc vừa khung). Chưa kiểm được: WebGL thật trong trình duyệt thật, chơi online 2 người thật, chạm tay thật trên điện thoại.'
  ] },
  { id: '20261118-15', date: '18/11/2026', game: 'all', title: '🎙️ Kênh thoại qua máy chủ (SFU) cho mọi game (đã gỡ — xem 20261118-21)', items: [
    '🎙️ Kênh thoại qua máy chủ (SFU, Cloudflare Realtime): vào kênh thoại thì thử nối SFU trước — tiếng đi qua máy chủ nên nhẹ máy, tự nối lại khi rớt mạng (rớt hẳn thì nối ngay, chập chờn quá 5 giây thì nối lại, tối đa 5 lần/120 giây), quá 8 người/phòng (Ma Sói 16) thì người vào sau được báo "phòng đã đủ người"; rời tab quá 5 phút thì tự rời kênh; hết trần phút thoại thì rời kênh + báo rõ lý do.',
    '🔁 Mesh cũ giữ làm dự phòng: chưa đặt khoá SFU trên máy chủ (hoặc SFU lỗi) thì kênh thoại chạy mesh như trước, không crash, không kẹt. Nút "Bấm để nghe mọi người" hiện khi trình duyệt chặn âm thanh.',
    '🔧 Cần chủ web đặt 2 secret trên Worker gumballz-rooms thì SFU mới chạy thật (SFU_APP_ID + SFU_APP_TOKEN, xem báo cáo; thêm TURN_KEY_ID + TURN_KEY_API_TOKEN nếu muốn vượt NAT khó — không có thì SFU vẫn chạy qua STUN). Chưa đặt thì /voice/session trả "đang tắt" và web dùng mesh như cũ.',
    '🔧 Kiểm tra: node --check đạt; Worker local trả /voice/session "đang tắt" đúng thiết kế; thử headless 2 tab (mic giả): cả 2 vào kênh đều về mesh trong ~0,1 giây, roster thoại đồng bộ 2 chiều, kết nối mesh tạo được cả 2 chiều, 0 lỗi JS; chặn người thứ 9 (đủ 8 người) + lọc thông tin SFU rác đều đúng. Chưa kiểm được: mic thật, 2 người thật cùng nói/nghe, toàn bộ nhánh SFU với secret thật, TURN thật, tab ẩn 5 phút thật, điện thoại thật.'
  ] },
  { id: '20261118-14', date: '18/11/2026', game: 'all', title: '🔊 Âm lượng riêng cho nhạc nền và hiệu ứng', items: [
    '🔊 Hộp Cài đặt có 2 thanh trượt riêng — nhạc nền và hiệu ứng — nhớ trên máy này, áp dụng chung cho mọi game.',
    '🔧 Kiểm tra: mở hộp Cài đặt thấy cả 2 thanh trượt ở 100%, trình duyệt headless 0 lỗi JS.'
  ] },
  { id: '20261118-13', date: '18/11/2026', game: 'all', title: '🔍 Phân loại game rõ ràng + tìm game + màn hình đầu 2 cột', items: [
    '🔍 Phân loại game rõ ràng: mỗi game trong 39 game thuộc đúng 1 nhóm — 🎲 Cờ bàn (16 game), 🃏 Game bài (14 game), 🎉 Tụ tập (7 game), ✨ Kiểu khác (2 game: Nối Từ là game chữ, Bầu Cua là game xúc xắc). Trang chủ có 4 mục + 4 nút lọc theo đúng nhóm, bấm nút nào thì chỉ hiện game nhóm đó.',
    '🔎 Ô tìm game ở trang chủ: gõ không dấu vẫn tìm được (gõ "co" ra 7 game Cờ, gõ "bau" chỉ ra Bầu Cua, gõ chữ không có thì báo trống). Số game ở trang chủ tự đếm, không ghi cứng.',
    '🖥️ Màn hình đầu của cả 39 game xếp 2 cột gọn hơn trên máy tính (nút Home + hướng dẫn cùng khuôn, cột trái cùng chiều rộng). Tên game kèm tên gốc trong ngoặc: Ma Sói (Werewolf), Cờ Tỷ Phú (Monopoly) Sài Gòn 3D, UNÔ (UNO), Mèo Nổ (Exploding Kittens), Chợ Lớn (Chinatown), Bắn tàu (Battleship), Tàu Xuyên Việt (Ticket to Ride), Đảo Khai Hoang (Catan), Đảo Chính (Coup), CÀ ĐÙNG! (Bang!).',
    '📱 Trang chủ hết tràn ngang ở điện thoại 360px (chữ tiêu đề co lại, thẻ phòng co đúng khung).',
    '🔧 Kiểm tra: đếm đủ 39 ô game; mỗi nút lọc hiện đúng số lượng + đúng danh sách; 390px 2 cột không tràn, 1024px 4 cột không tràn, 0 lỗi JS.'
  ] },
  { id: '20261118-12', date: '18/11/2026', game: 'all', title: '👑 Chủ web nổi bật trong phòng + trang Quản trị có tab Lag', items: [
    '👑 Chủ web: vé HMAC hạn 7 ngày (chỉ tài khoản quản trị đầu tiên xin được — người khác tự khai mã cũng không được); vào phòng do máy chủ giữ thì tên nổi bật + banner "Chủ web … vừa vào phòng", chat trong phòng có huy hiệu "👑 Chủ web · ".',
    '🛠️ Trang Quản trị: thêm tab 📶 Lag (gộp số đo độ trễ theo loại × game), hiện "Ai thức nhiều nhất hôm nay" từ số thật Cloudflare, danh sách game do máy chủ giữ đủ 28 game.',
    '🔧 Kiểm tra: thử HMAC bằng Node (đúng mã → được, sai mã/vé sửa 1 ký tự/không có khoá → không được, hạn đúng 7 ngày); thử trên Worker local: /vip/check vé sai → từ chối, /vip/pass không token → từ chối. Chưa kiểm được: xin vé thật bằng tài khoản admin trên máy chủ thật.'
  ] },
  { id: '20261118-11', date: '18/11/2026', game: 'all', title: '🐛 Sửa lỗi: Cờ Tỷ Phú chống kẹt, iPhone văng nhạc, Scribble, Ba Cào…', items: [
    '🐛 Cờ Tỷ Phú: chống kẹt ván khi mua ô (lỗi hay gặp trên iPhone 17/11) + đấu giá tự bỏ qua sau thời gian chờ; chủ phòng chuyển tab không làm bàn giật (hẹn giờ đi qua Web Worker); mời người ra khỏi phòng được ở mọi game; mở link phòng thì hỏi tên nếu chưa có tên.',
    '🔊 Sửa UNÔ/nhạc nền văng lỗi khi iPhone ngắt âm thanh; sửa Mèo Nổ bấm đánh bộ khi lá đã mất; sửa Scribble trùng tên lớp .lb làm sảnh hẹp + lộ hình ván trước + lỗi null + tự rời phòng khi rớt mạng quá 1 phút; sửa Ba Cào lộ bài người xem ở màn lật cuối ván.',
    '🔧 Kiểm tra: luật Cờ Tỷ Phú 52/52, mô phỏng 200 ván 0 kẹt; Scribble mô phỏng 200 ván 0 lỗi; trình duyệt headless: UNÔ/Mèo Nổ/Scribble/Ba Cào/Ma Sói 0 lỗi JS, 390px không tràn. Chưa kiểm được: đá người ra / rớt mạng / chuyển tab trên trình duyệt thật, ngắt âm thanh trên iPhone thật.'
  ] },
  { id: '20261118-10', date: '18/11/2026', game: 'all', title: '🛡️ Chống spam Turnstile + bot Ma Sói biết nói + hỏi luật bằng AI', items: [
    '🛡️ Chống spam bằng Turnstile (Cloudflare): khi tạo tài khoản, gửi góp ý, gửi từ mới Nối Từ thì trình duyệt tự chứng minh "người thật" rồi mới gửi. Chưa đặt khoá trên máy chủ thì tính năng này tự tắt, web chạy như cũ — không chặn ai.',
    '🤖 Ma Sói bot biết nói + hỏi luật bằng AI: bot Ma Sói nói câu hợp tình huống (đêm/ngày, phe sói/dân); trong "Học chơi nhanh" có nút "❓ Hỏi luật (AI trả lời)" và game Thật hay Thách có nút hỏi AI gợi ý. Tất cả đều tự tắt khi chưa có khoá Claude; có khoá thì trần chi tiêu là 3 USD/ngày cho bot Ma Sói, 0,2 USD/ngày cho hỏi luật (đếm bền trên máy chủ, không mất khi Worker khởi động lại).',
    '🔒 Chính sách riêng tư đã ghi rõ: bot Ma Sói chỉ gửi cho AI đoạn chat công khai gần đây + tên hiển thị + số ngày (không gửi tài khoản, IP, tin riêng); máy chủ không lưu lại.',
    '🔧 Kiểm tra: không có khoá thì /ai/* trả "đang tắt", đăng ký/góp ý/gửi từ mới vẫn chạy; có khoá giả thì đăng ký/góp ý/gửi từ mới không có mã sẽ bị chặn kèm thông báo tiếng Việt. Chưa kiểm được: gọi Claude thật, widget Turnstile thật (cần đặt khoá trên Worker rồi thử trên trình duyệt thật).'
  ] },
  { id: '20261118-9', date: '18/11/2026', game: 'all', title: '🃏 Lá bài trượt mượt (GSAP Flip) cho 8 game bài', items: [
    '🃏 Lá bài trượt mượt (GSAP Flip) cho 8 game bài: UNÔ, Tiến Lên, Sâm Lốc, Tá Lả, Tứ Sắc, Bài Tấn, Cát Tê, Mèo Nổ — lá bài trượt/xếp lại mượt khi chia bài, đánh bài, rút bài. Thư viện GSAP 3.13.0 nhúng sẵn trong web (chạy offline/localhost, không cần mạng ngoài), tôn trọng chế độ giảm chuyển động của máy.',
    '🔧 Kiểm tra: 8/8 game vào ván vs máy đều 0 lỗi JS, hiệu ứng xếp bài chạy, 390px không tràn. Chưa kiểm được: độ mượt trên trình duyệt thật / điện thoại thật, kéo-thả bằng tay thật. Credit GreenSock ghi ở trang Credits.'
  ] },
  { id: '20261118-8', date: '18/11/2026', game: 'all', title: '👤 Hồ sơ thành viên + danh hiệu + chat bạn bè kiểu Messenger', items: [
    '👤 Hồ sơ thành viên: bấm tên người chơi thì mở hồ sơ công khai (tên, cấp, XP, ván/thắng, thành tích, danh hiệu — không lộ email hay quyền quản trị). Hồ sơ của mình có 5 tab: nhân vật, lộ trình thưởng, khung, màu tên, hiệu ứng thắng; số liệu hiện cả số máy chủ đã kiểm chứng (nhãn "✅ đã kiểm chứng") và số chỉ có trên máy này.',
    '🏆 Danh hiệu giống bản gốc: tính từ hồ sơ (số ván, thắng, chuỗi thắng, ngày chơi, Top 1/3/10 bảng xếp hạng) + danh hiệu riêng cho từng game (kể cả 5 game tự làm và 6 game mới); danh hiệu hiện dưới tên trong hồ sơ và cạnh tên trên bảng xếp hạng. Danh hiệu Cờ Thú đổi sang bản gốc ("🐘 Chúa sơn lâm") ngày 18/11/2026 (xem note 20261118-17).',
    '💬 Chat bạn bè kiểu Messenger: hộp chat nổi ở góc màn hình (màn hình rộng), bấm ảnh/tên bạn thì mở hồ sơ của bạn đó.',
    '🔧 Kiểm tra: node --check đạt; trình duyệt headless: hồ sơ mở được (12 nhóm thẻ thành tựu, 45 mốc thưởng, 11 khung, 10 màu tên, 6 hiệu ứng thắng), bảng xếp hạng hiện danh hiệu + bấm vào thì mở hồ sơ, 0 lỗi JS, 390px sạch. Chưa kiểm được: mở hồ sơ người thật qua mạng thật (cần deploy route /profile), chat 2 người thật.'
  ] },
  { id: '20261118-7', date: '18/11/2026', game: 'all', title: '🏅 Thành tựu theo từng game + popup mở khoá + thành tựu bí mật', items: [
    '🏅 Thành tựu theo từng game: tổng 123 → 468 thành tựu (thêm 253 theo mẫu game + 82 của 8 game mới, trừ 6 cái trùng điều kiện đã gộp lại). Mỗi game có thành tựu riêng (thắng đầu, thắng 10 ván, thắng 3 ván liên tiếp, kỷ lục riêng...); mở khoá thì hiện popup chúc mừng rồi tự ẩn sau ~4,5 giây.',
    '🔒 Thành tựu bí mật giống bản gốc: chưa mở thì không hiện gì cả (không có ô "???" che tên) — chỉ có 1 dòng đếm "Còn N thành tích bí mật – chơi tiếp rồi sẽ lộ ra 👀"; mở khoá thì hiện đủ tên + mô tả + popup. Thành tựu "sắp có" (chưa có đường nhận biết) thì ẩn hẳn, không đếm vào số bí mật.',
    '🔧 Kiểm tra: 468 id duy nhất, 0 trùng; kiểm logic 44/44 đạt; trình duyệt headless: hồ sơ hiện đủ nhóm thành tựu, popup mở khoá hiện rồi ẩn đúng ~4,5 giây, 0 lỗi JS.'
  ] },
  { id: '20261118-6', date: '18/11/2026', game: 'all', title: '📅 Thử thách hôm nay — 4 việc mỗi ngày', items: [
    '📅 Thử thách hôm nay: 4 việc mỗi ngày (giờ Việt Nam): giải 1 Cờ thế, giải 1 đố Cờ vua, thắng N ván ở 2 game chọn theo ngày (đánh với máy cũng tính). Cặp game đổi mỗi ngày theo hàm băm của ngày (18 game trong POOL, kể cả Sâm Lốc / Đảo Chính / Nối Từ mới thêm); Cờ vua có 120 đố (40 chiếu hết 1 nước + 80 chiếu hết 2 nước), nút "🗓️ Giải đố hôm nay" + mở bằng ?daily=1.',
    '🔥 Làm xong thì hiện dấu hoàn thành + chuỗi ngày liên tiếp; không có phần thưởng vật phẩm (bản gốc cũng vậy). Tiến độ lưu trên máy (gumballz-quest).',
    '🔧 Kiểm tra: logic 29/29 đạt (7 ngày liên tiếp, cặp game đổi mỗi ngày, cùng ngày thì cùng cặp); trình duyệt headless hiện đủ 4 dòng, 0 lỗi JS.'
  ] },
  { id: '20261118-5', date: '18/11/2026', game: 'all', title: '🎭 Lộ trình thưởng nhân vật — 45 mốc mở đồ', items: [
    '🎭 Lộ trình thưởng nhân vật: 45 mốc mở đồ theo XP (XP = số ván×10 + số thắng×20, mốc từ 30 tới 5609 XP): 11 khung avatar, 10 màu tên, 6 hiệu ứng thắng, cùng tóc/mũ/đồ/phụ kiện mới (8 kiểu nhân vật, 12 tóc, 17 màu tóc, 23 mũ, 26 bộ đồ, 23 phụ kiện, 31 mẫu sẵn). Nhân vật chibi 3D vẽ lại tóc, mắt to, ếch, đồ cầm tay, mũ cối, 9 đuôi cáo, túi quà Noel.',
    '🔧 Kiểm tra: logic 60 ván/25 thắng = 1100 XP → mở 17 mốc, mốc tiếp theo ở 1176 XP; trình duyệt headless: 43 chân dung vẽ được, 0 lỗi JS, 390px sạch. Đồ chỉ dành cho chủ web vẫn chỉ chủ web dùng được.'
  ] },
  { id: '20261118-4', date: '18/11/2026', game: 'all', title: '🌐 Tiếng Anh cho cả web (?lang=en)', items: [
    '🌐 Tiếng Anh: thêm ?lang=en — 48 file dịch (11.263 mục), trang chủ + giao diện chung + 35 game dịch đầy đủ, 4 game tự làm (Cờ Vây, TicTacToe, Memory, Rắn và Thang) dịch tối thiểu. Chưa dịch thì vẫn hiện tiếng Việt. Hộp Cài đặt có nút chọn Tiếng Việt / English (nhớ bằng gumballz-lang).',
    '🔧 Sửa lỗi dịch sai tên game ("Flag Vây", "Fire Tàu"...) bằng cách cấm dịch tên game ở logo; sửa tagline Bắn Tàu và vài câu nửa Anh nửa Việt.',
    '🔧 Kiểm tra: 48 file JSON đọc được, node --check đạt; trình duyệt headless với ?lang=en: trang chủ + UNÔ/Bắn Tàu/Cờ Vây/Memory đều hiện tiếng Anh, 0 lỗi JS, 390px sạch. Chưa kiểm được: bấm đổi ngôn ngữ trên trình duyệt thật, 34 trang game còn lại mới kiểm gián tiếp.'
  ] },
  { id: '20261118-3', date: '18/11/2026', game: 'all', title: '🛡️ Bịt lỗ gian lận điểm — máy chủ chỉ tính ván nó giữ', items: [
    '🛡️ Bịt lỗ gian lận điểm: máy chủ CHỈ TÍNH những ván nó trực tiếp giữ (phòng máy chủ, từ 2 người thật trở lên) — không tin số trình duyệt gửi lên nữa. Gửi số liệu thổi phồng lên /auth/profile giờ bị bỏ qua hoàn toàn.',
    '📦 Hồ sơ cũ giữ nguyên: lần đầu đồng bộ sau bản này, số điểm/thành tích/ngày chơi hiện có được chốt làm "mốc cũ" và vẫn hiển thị + tính XP/level/bảng xếp hạng như trước; từ sau bản này chỉ cộng thêm ván do máy chủ chứng kiến. Thành tích, chuỗi thắng, danh hiệu đều suy ra từ số máy chủ đã kiểm chứng; thành tích chỉ suy ra được từ máy người chơi vẫn mở ở hồ sơ trên máy đó, ghi nhãn "chỉ ở máy này".',
    '⚠️ Đánh đổi (cần Nguyễn quyết): game đánh với máy / chơi đơn chạy trên máy người chơi nên KHÔNG cộng điểm lên bảng xếp hạng máy chủ nữa (vẫn hiện ở hồ sơ trên máy người chơi). Các phương án khác (ghi điểm máy lên máy chủ, cột điểm riêng, máy chủ giữ cả ván đấu máy) đã liệt kê trong báo cáo, chưa đổi gì thêm.',
    '🔧 Kiểm tra: mô phỏng gian lận (gửi +5000 ván/game, chuỗi 999, thành tích giả) — máy chủ bỏ qua hết, tổng điểm giữ nguyên; chơi 1 ván Sâm thật trên máy chủ thì điểm cộng đúng cho cả 2 người; hồ sơ cũ còn nguyên sau chuyển đổi; chống cộng trùng khi phòng ngủ/thức dậy phát lại ván đã xong. Chưa kiểm được: 2 người thật chơi trên trình duyệt thật; 27/28 game còn lại mới kiểm bằng unit test (nên chơi thử 1 ván UNÔ + 1 ván Cờ Tỷ Phú sau khi deploy để chắc chắn).'
  ] },
  { id: '20261118-2', date: '18/11/2026', game: 'all', title: '🖥️ Phòng chạy trên máy chủ — 28 game do máy chủ giữ ván', items: [
    '🖥️ Phòng chạy trên máy chủ: 28 game giờ chơi qua khung máy chủ chung — 14 game khung chung + UNÔ + 13 game có host riêng. Ván do máy chủ giữ: chủ phòng tắt tab thì ván "ngủ" rồi "thức" lại khi có người vào, không mất ván; hẹn giờ ảo tiết kiệm tiền (phòng trống 20 phút thì ngủ); ping giữ phòng 45 giây thay vì 20 giây.',
    '👤 Chơi một mình thì ván chạy trên máy người chơi (nhẹ máy chủ), có khách vào thì ván tự đẩy lên máy chủ. Vào lại phòng đang chơi thì tự về đúng ván (resume).',
    '🔧 Kiểm tra: node --check đạt; gói Worker biên dịch được (wrangler dev --local); thử WebSocket trực tiếp: 13/13 game host.js đều tạo phòng, thêm bot, bắt đầu, nhận state cả 2 phía; các game khung chung (Bài Tấn, Sâm Lốc, Nối Từ, Đội Cứu Hộ...) cũng vậy; thử 2 tab thật: chơi một mình rồi khách vào thì ván đẩy lên máy chủ đúng thiết kế; UNÔ và Cờ Tỷ Phú tạo phòng từ giao diện web đều ra phòng máy chủ, resume sau tải lại đúng ván, 390px không tràn, 0 lỗi JS. Chưa kiểm được: chơi online 2 người thật tới hết ván trên trình duyệt thật.'
  ] },
  { id: '20261118-1', date: '18/11/2026', game: 'all', title: '🆕 8 game mới — web giờ có 39 game', items: [
    '🆕 8 game mới — web giờ có 39 game (31 cũ + 8 mới): Sâm Lốc (2–5 người, 10 lá, báo Sâm, ăn trắng), Đảo Chính (Coup, bịp vai 2–6 người), Gánh Xiếc Thú (Fliptoons, 2–5 người), Đội Cứu Hộ (Pandemic hợp tác 2–4 người, bản đồ Việt Nam), Đảo Khai Hoang (Catan, 2–4 người), Tàu Xuyên Việt (Ticket to Ride, 28 thành phố, 2–5 người), Nối Từ (nối từ tiếng Việt ~40.000 từ + kho từ cộng đồng), Bầu Cua (tới 8 người, đặt xu ảo, lắc 3 xúc xắc).',
    '🎨 Giao diện ngoài của 8 game vẽ lại theo phong cách neobrutalism GumballZ (khác hẳn giao diện gốc); luật chơi, cơ chế và art trong game giữ nguyên. Đã đổi thương hiệu sang GumballZ và thay các link cũ; attribution bên thứ ba giữ nguyên.',
    '🌐 Đăng ký đủ: FIND_GAMES + lobby GAMES = 38 game (39 trừ Solitaire chơi đơn), khung máy chủ SIMPLE = 14 game, tổng SRV_GAMES = 28 game. Nối Từ có thêm route máy chủ cho kho từ (GET /noitu/words, cache 600 giây) + từ cộng đồng chỉ vào kho khi cả bàn đồng ý; bỏ phiếu từ mới qua POST /noitu/voted (chống spam bằng Turnstile, xem note 20261118-10).',
    '🏅 Thêm 82 thành tựu cho 8 game (40 mẫu theo game + 42 riêng; 13 cái ghi "sắp có" vì chưa có đường nhận biết) — tổng thành tựu xem note 20261118-7. Thử thách hôm nay thêm 3 game mới vào POOL (xem note 20261118-6).',
    '🔧 Kiểm tra: mô phỏng luật/mạng 8/8 game đạt (Sâm 1600 ván, Bầu Cua 600 ván, Đảo Khai Hoang 81, Tàu Xuyên Việt 83, Nối Từ 70, Đảo Chính 36); trình duyệt headless: 8/8 trang chủ 0 lỗi JS, 0 tràn ở 390px, vào ván vs máy 0 lỗi; phòng máy chủ thật qua WebSocket (Sâm, Nối Từ, Đội Cứu Hộ): tạo phòng, thêm bot, bắt đầu, nhận state cả 2 phía. Chưa kiểm được: chơi online 2 người thật trên trình duyệt thật, chơi trên điện thoại thật.'
  ] },
  { id: '20261117-7', date: '17/11/2026', game: 'all', title: '⚡ Đăng nhập nhanh bằng Google (One Tap) — bấm 1 cái là vào', items: [
    '⚡ Đăng nhập nhanh bằng Google (One Tap): vừa vào trang chủ hoặc Sảnh chung mà chưa đăng nhập thì Google hiện khung nhỏ ở góc phải màn hình — bấm 1 cái là vào tài khoản, không cần mở hộp đăng nhập rồi bấm nút Google nữa. Khung này dùng đúng client ID Google của GumballZ (đã xuất bản Production nên tài khoản Google nào cũng dùng được); nếu trình duyệt chưa có phiên Google, hoặc người dùng đã tắt nhắc nhiều lần thì Google tự không hiện khung và nút Google trong hộp đăng nhập vẫn là đường vào như trước.',
    '🔧 Gọn code đăng nhập Google: nút Google trong hộp đăng nhập và One Tap giờ dùng chung 1 hàm khởi tạo (tải script Google 1 lần, lấy client ID từ máy chủ 1 lần) và 1 hàm xử lý credential — đăng nhập được thì đóng hộp (nếu đang mở) + chào tên, lỗi thì ghi vào hộp nếu hộp đang mở, còn không thì toast. Trước đây callback của nút chạm thẳng vào biến hộp nên không dùng chung cho One Tap được.',
    '📄 Trang Chính sách riêng tư: sửa 1 dòng lỗi thời — \"GitHub Pages (nơi đặt web)\" thành \"Vercel (nơi đặt web)\" cho đúng chỗ đặt web hiện tại.',
    '🔧 Kiểm tra: cú pháp account.js đạt (node --check); kiểm tra trình duyệt headless với script Google + /auth/config giả lập (máy kiểm tra không ra mạng ngoài nên script Google thật và Worker thật không tải được): vào trang chủ khi chưa đăng nhập thì prompt() của One Tap được gọi đúng 1 lần, initialize() nhận đúng client ID mới 667756452930-…-kb2h5et + callback; mở hộp đăng nhập thì nút Google vẫn hiện và renderButton() chạy; 1280px và 390px đều 0 lỗi JS của web (chỉ có lỗi tải font/Worker do máy kiểm tra chặn mạng ngoài). Chưa kiểm được trên trình duyệt thật có phiên Google: khung One Tap có hiện hay không là do Google quyết định theo phiên đăng nhập của người dùng — cần Nguyễn thử bằng chuột thật trên web live sau khi push.'
  ] },
  { id: '20261117-6', date: '17/11/2026', game: 'ranvathang', title: '🎲 Xúc xắc 3D lăn giữa bàn cờ + nhân vật 3D nhảy từng ô', items: [
    '🎲 Xúc xắc 3D: khối lập phương bằng CSS thuần (transform-style: preserve-3d, 6 mặt 1–6 chấm, mặt 1 và 4 chấm đỏ, mặt đối diện cộng bằng 7 như xúc xắc thật). Khi tung, xúc xắc xuất hiện ở chính giữa bàn cờ, lăn theo đường cong + xoay nhiều vòng rồi dừng đúng mặt đã tung — giá trị tung vẫn do người tới lượt sinh một lần rồi đồng bộ qua action nên 2 bên online luôn ra cùng 1 số, animation chỉ hiển thị lại; giữ mặt ~1,8 giây rồi mờ dần, thu nhỏ, biến mất để không che bàn cờ; overlay luôn pointer-events: none nên không chặn bấm. Nút Tung xúc xắc giữ nguyên; xúc xắc nhỏ ở bảng điều khiển cũng quay ngẫu nhiên trong lúc lắc (650ms) rồi dừng đúng số.',
    '🧍 Nhân vật 3D: 4 quân meeple (đỏ, xanh dương, xanh lá, vàng) có chiều sâu bằng CSS thuần — gradient sáng–tối theo chiều đứng, điểm sáng highlight, bóng đổ hình elip dưới chân, hơi nghiêng phối cảnh cho cảm giác đứng trên bàn cờ.',
    '🐇 Nhảy từng ô: khi di chuyển, quân cờ nhảy từng ô đúng nhịp 150ms/ô — mỗi bước vọt lên cao ~13px rồi đáp xuống, bóng đổ thu nhỏ lúc ở đỉnh và to ra lúc đáp; leo thang / trượt rắn dùng vòng cung nhảy lớn hơn (~16px). Lượt đi của máy và của đối thủ online dùng chung đường animation này.',
    '🐛 Sửa 2 lỗi tìm thấy khi kiểm tra: (1) nước tung đầu tiên của ván mới không hiện xúc xắc 3D — nhánh chống "hiện lại nước cũ khi tải lại trang" nhận nhầm nước đầu tiên thành nước cũ nên nuốt mất overlay; (2) nước đi đầu tiên của ván mới quân cờ dịch chuyển tức thì thay vì nhảy từng ô — cùng nguyên nhân ở cờ "lần đầu". Cả hai đã sửa bằng cờ firstRender — chỉ lần render đầu tiên có state (tải lại giữa ván) mới bỏ qua animation.',
    '🔧 Kiểm tra: rules 18 đạt, net 7 đạt, dice3d 6 đạt (ánh xạ mặt→góc xoay chứng minh bằng ma trận xoay: mọi mặt sau khi xoay đều hướng ra trước, mặt đối diện cộng bằng 7, khối quay đủ vòng rồi dừng đúng mặt), sim bot-vs-bot 2 người (50 ván) + 4 người (20 ván) 0 kẹt; kiểm tra trình duyệt thật: vào ván vs máy Khó, bạn tung 2 → overlay lăn giữa bàn + panel đều đúng mặt 2, quân cờ nhảy từng ô và đáp đúng ô 38 (leo thang 2→38), máy tung 4 → overlay lăn lại đúng mặt 4, overlay tự mờ/ẩn, 390px không tràn ngang, 0 lỗi JS.'
  ] },
  { id: '20261117-5', date: '17/11/2026', game: 'all', title: '🔧 Sửa topbar trong suốt + nút 🏠 về đúng trang chủ web ở 7 game mới', items: [
    '🫥 Sửa lỗi topbar trong suốt: thanh topbar dùng chung của gamekit (shared/ui/gamekit.css) là sticky nhưng không có nền, nên khi cuộn trang thì hàng ghế ngồi / bàn cờ chui lên dưới và hiện xuyên qua, chữ chồng lên nhau khó đọc (ảnh chụp ở Cờ Thú). Giờ topbar có nền đặc đúng màu nền trang (#fff7ef) + bóng mờ nhẹ như Bắn Tàu — sửa 1 chỗ, hết cho cả 31 game.',
    '🏠 Sửa nút home về trang chủ ở 7 game mới (Cờ Thú, Rắn và Thang, Cờ Vây, Cờ Caro, TicTacToe, Memory, Ô Ăn Quan): nút 🏠 ghi "Rời ván · về trang chủ" nhưng bấm "Rời ván" chỉ về màn hình đầu CỦA GAME, không ra trang chủ web. Giờ bấm "Rời ván" thì rời phòng xong về thẳng trang chủ web (../) sau 250ms để kịp gửi tin rời phòng; nút "🏠 Về trang chủ" trong hộp thoại vẫn đi cùng đường. Nút "← Thoát" ở sảnh chờ vẫn về màn hình đầu của game như cũ.',
    '🏆 Nút "🏠 Về trang chủ" trong hộp kết thúc ván của 6 game mới (Cờ Thú, Rắn và Thang, Cờ Vây, Cờ Caro, TicTacToe, Memory) cũng về thẳng trang chủ web thay vì chỉ về màn hình đầu của game; nút "Về màn hình chính" của Memory (chơi đơn) giữ nguyên.',
    '🔧 Kiểm tra: rules 7 game đều đạt (Cờ Thú 17, Rắn và Thang 18, Cờ Vây 21, Cờ Caro 17, TicTacToe 19, Memory 10, Ô Ăn Quan 25), thành tựu 31 test đạt (tổng 123); kiểm tra trình duyệt thật: Cờ Thú cuộn xuống thì ghế ngồi bị topbar che kín (không còn thấy xuyên qua), bấm 🏠 → Rời ván thì rời khỏi trang game về trang chủ, TicTacToe đánh thắng máy rồi bấm "Về trang chủ" ở hộp kết thúc thì cũng về trang chủ, 390px topbar vẫn đặc và không tràn ngang, 0 lỗi JS.'
  ] },
  { id: '20261117-4', date: '17/11/2026', game: 'bantau', title: '💣 Sửa lỗi hiệu ứng nổ của Bom hạt nhân — ô nào cũng sáng đủ 800ms', items: [
    '💣 Sửa lỗi hiệu ứng nổ của Bom hạt nhân ở Bắn Tàu: trước đây mỗi ô nổ chỉ sáng ~120ms rồi bị lần vẽ lại lưới sau xóa mất (chỉ ô cuối giữ đủ 800ms); giờ hiệu ứng nổ được ghi vào Map và gắn class lúc vẽ lưới nên ô nào cũng giữ đủ 800ms (ô trượt 600ms), hết giờ thì tắt hẳn.',
    '📖 Trang hướng dẫn Bắn Tàu đã cập nhật cách xếp tàu mới: kéo tàu từ khay vào biển (giữ chuột/ngón tay kéo thả), xem trước vị trí (xanh đặt được, đỏ không đặt được), phím R / nút Xoay / bấm đúp để đổi ngang-dọc — thay cho đoạn chỉ nói bấm chọn rồi bấm ô như trước.',
    '🔧 Kiểm tra: rules Bắn Tàu 17 đạt, Cờ Tỷ Phú 52 đạt; kiểm tra trình duyệt thật: mua bom, ném bom vào lưới địch, nhiều ô nổ cùng lúc vẫn sáng qua các lần vẽ lại lưới, hết 800ms/600ms thì tắt hẳn, 0 lỗi JS.'
  ] },
  { id: '20261117-3', date: '17/11/2026', game: 'ranvathang', title: '🐍 Game mới: Rắn và Thang online — tung xúc xắc, leo thang, trượt rắn', items: [
    '🆕 Game mới Rắn và Thang (ranvathang/): trò đua về đích bằng xúc xắc trên bàn 100 ô — tung xúc xắc đi tiến, trúng chân thang thì leo lên đầu thang, trúng đầu rắn thì trượt xuống đuôi rắn, phải về đúng ô 100 mới thắng, tung quá thì đứng yên, tung được 6 thì được tung tiếp.',
    '🎲 Bàn 10×10 đánh số kiểu rắn bò (hàng 1 trái → phải, hàng 2 phải → trái…), 10 thang (2→38, 7→14, 8→31, 15→26, 21→42, 28→84, 36→44, 51→67, 71→91, 80→100) và 10 rắn (16→6, 47→26, 49→11, 56→53, 62→19, 64→60, 87→24, 93→73, 95→75, 98→78); vẽ tay bằng SVG: rắn uốn lượn đủ màu, thang có bậc, quân cờ meeple 4 màu, xúc xắc CSS có hiệu ứng tung.',
    '🌐 Chơi online 2 người: tạo phòng / vào phòng bằng mã 5 ký tự như các game khác (simplenet + gamekit), số xúc xắc do người tới lượt tung ra và gửi kèm trong action nên 2 bên luôn ra cùng 1 trạng thái; đối thủ mất kết nối thì máy tung thay sau ~8 giây, chủ phòng rời thì phòng giải tán, có nút đấu lại.',
    '🤖 Đấu với máy: bạn với 1 máy — máy Dễ và máy Khó chơi giống hệt nhau vì trò này hoàn toàn dựa vào may mắn, máy chỉ tung xúc xắc công bằng như người chơi, không gian lận. Thêm chế độ 2–4 người chơi trên cùng 1 máy (chọn số người ở màn hình chính, nhập tên từng người).',
    '🎨 Giao diện đồng bộ với các game khác: màn hình chính có chip GumballZ về trang chủ, sảnh chờ có mã phòng + nút rời, topbar có nút 🏠 / âm thanh / hướng dẫn / ván mới; bàn 100 ô 4 màu pastel, rắn SVG uốn lượn, thang có bậc, quân meeple 4 màu nhảy từng ô rồi bay theo thang/rắn, hiệu ứng leo thang/trượt rắn, nhật ký ván đấu, xin thua, chơi lại. Mobile 390px không tràn trang.',
    '🔊 Âm thanh Web Audio: tiếng lắc xúc xắc, tiếng bước từng ô, tiếng leo thang, tiếng trượt rắn, nhạc thắng khi hết ván.',
    '🏅 Thêm 5 thành tích cho Rắn và Thang (thắng đầu tiên, thắng 10 ván, thắng 3 ván liên tiếp, leo thang 28→84, trượt rắn 87→24) — tổng cộng giờ có 123 thành tích trên 31 game.',
    '🔧 Kiểm tra: rules 18 đạt, net 7 đạt, sim bot-vs-bot 2 người (50 ván) + 4 người (20 ván) 0 kẹt, thành tựu 31 test đạt (tổng 123); kiểm tra trình duyệt thật: vào ván vs máy, bấm Tung xúc xắc, quân cờ nhảy từng ô tới đúng ô, máy trả lời, không tràn ngang ở 1280px và 390px, 0 lỗi JS.'
  ] },
  { id: '20261117-2', date: '17/11/2026', game: 'cothu', title: '🦁 Game mới: Cờ Thú online — 8 con vật, sông, bẫy, hang', items: [
    '🆕 Game mới Cờ Thú (cothu/): bàn rừng 7×9 ô, Đỏ đi trước, mỗi bên 8 con vật hạng 1–8 (Chuột 1 · Mèo 2 · Chó 3 · Sói 4 · Báo 5 · Hổ 6 · Sư tử 7 · Voi 8). Đi 1 ô ngang/dọc, con mạnh ăn con yếu, cùng hạng ăn được nhau.',
    '🐀 Chuột ăn được Voi (hạng 1 ăn hạng 8), ngược lại Voi KHÔNG ăn được Chuột. Chỉ Chuột được vào sông; Hổ và Sư tử nhảy qua sông ngang/dọc trong 1 nước nếu mọi ô sông trên đường đều trống (Chuột trong sông chặn được); Chuột trong sông chỉ ăn được Chuột khác trong sông, không ăn quân trên bờ.',
    '🕳️ Bẫy: quân đứng trong bẫy của địch có hạng hiệu dụng 0 — quân địch nào cũng ăn được (kể cả Chuột); bẫy của mình không làm yếu quân mình. 🚩 Hang: không được vào hang của mình; vào hang địch thì thắng ngay; ăn hết 8 quân địch cũng thắng, hết nước đi thì thua.',
    '🌐 Chơi online với bạn: tạo phòng / vào phòng bằng mã 5 ký tự như các game khác (simplenet + gamekit), đồng bộ theo action {type, from?, to?} — đi quân / xin thua đều nằm trong action nên 2 bên luôn ra cùng 1 trạng thái; đối thủ mất kết nối thì máy đi thay sau ~8 giây, chủ phòng rời thì phòng giải tán, có nút đấu lại.',
    '🤖 Đấu với máy: bot heuristic 1 nước — ăn quân to > vào hang địch > tiến về hang > cứu quân bị đe dọa > tránh vào bẫy địch khi có địch kề > thủ hang mình; tránh lặp lại vị trí cũ để ván luôn kết thúc. Máy Dễ đánh bừa 30% số nước; Máy Khó luôn lấy nước điểm cao nhất. Thêm chế độ 2 người chơi trên cùng 1 máy.',
    '🎨 Giao diện đồng bộ với các game khác: màn hình chính có chip GumballZ về trang chủ, sảnh chờ có mã phòng + nút rời, topbar có nút 🏠 / âm thanh / hướng dẫn / ván mới; bàn rừng xanh với sông xanh có sóng, bẫy vàng, hang vàng có cờ; quân là đĩa tròn màu phe với mặt thú + huy hiệu hạng, quân đang chọn sáng lên, chấm xanh chỉ nước đi được, viền đỏ chỉ ô ăn được quân địch, khay quân đã ăn của mỗi bên. Mobile 390px không tràn trang.',
    '🔊 Âm thanh Web Audio: tiếng "tách" khi chọn quân, "cốc" khi đi quân, "cốc cốc" khi ăn quân, nhạc thắng khi hết ván.',
    '🏅 Thêm 5 thành tích cho Cờ Thú (thắng đầu tiên, thắng 10 ván, thắng 3 ván liên tiếp, Chuột ăn Voi, thắng bằng vào hang) — tổng cộng giờ có 118 thành tích trên 30 game.',
    '🔧 Kiểm tra: rules 17 đạt, net 7 đạt, sim bot-vs-bot (20 ván) 0 kẹt, thành tựu 31 test đạt (tổng 123); kiểm tra trình duyệt thật: vào ván vs máy, bấm Chuột rồi bấm ô đích để đi, máy trả lời, không tràn ngang ở 1280px và 390px, 0 lỗi JS.'
  ] },
  { id: '20261117-1', date: '17/11/2026', game: 'covay', title: '⚫ Game mới: Cờ Vây online — bàn 9×9, 13×13, 19×19, tính điểm kiểu Trung Quốc', items: [
    '🆕 Game mới Cờ Vây (covay/): bàn gỗ 9×9 / 13×13 / 19×19, Đen đi trước, đặt quân vào giao điểm. Nhóm quân hết khí thì bị ăn (gỡ khỏi bàn, tính tù binh); cấm tự sát và cấm phạm luật ko (không đánh lại ngay để bàn về vị trí 1 nước trước); bỏ lượt 2 lần liên tiếp thì vào tính điểm.',
    '🧮 Tính điểm kiểu Trung Quốc: đá còn trên bàn + đất bao được + komi 7,5 cho Trắng (không bao giờ hòa). Trong lúc tính điểm, bấm vào 1 nhóm quân để đánh dấu chết/sống (quân chết bị gỡ ra, tính là tù binh của đối thủ để hiển thị), xem trước điểm trực tiếp rồi bấm Chốt điểm; bấm Đánh tiếp để quay lại đánh nếu chưa ưng.',
    '🌐 Chơi online với bạn: tạo phòng / vào phòng bằng mã 5 ký tự như các game khác (simplenet + gamekit), đồng bộ theo action {type, x?, y?} — đánh / bỏ lượt / xin thua / đánh dấu chết / chốt điểm / đánh tiếp đều nằm trong action nên 2 bên luôn ra cùng 1 trạng thái; đối thủ mất kết nối thì máy đi thay sau ~8 giây, chủ phòng rời thì phòng giải tán, đấu lại giữ nguyên kích thước bàn. Chủ phòng chọn kích thước bàn trong phòng chờ. Phòng online chạy trên máy chủ phòng riêng của GumballZ (Worker gumballz-rooms).',
    '🤖 Đấu với máy: bot heuristic 1 nước — ăn quân > cứu nhóm đang bị chiếu > chiếu ngược đối thủ > giữ điểm sao / đường 3–4 ở khai cuộc; tránh tự đưa vào atari và tránh lấp mắt mình; bỏ lượt khi bàn đã ổn định để ván luôn kết thúc. Máy Dễ đánh bừa 30% số nước; Máy Khó luôn lấy nước điểm cao nhất. Thêm chế độ 2 người chơi trên cùng 1 máy.',
    '🎨 Giao diện đồng bộ với các game khác: màn hình chính có chip GumballZ về trang chủ, sảnh chờ có mã phòng + nút rời, topbar có nút 🏠 / âm thanh / hướng dẫn / ván mới; bàn gỗ với điểm sao (hoshi), nhãn tọa độ (cột A–T bỏ chữ I), quân vừa đánh có chấm đỏ, di chuột qua giao điểm trống thấy quân mờ xem trước; giữ và trượt để xem bàn, nhấn nhanh để đặt quân, nút zoom ＋/－, Vừa màn hình và về vị trí quân mới đánh. Mobile 390px không tràn trang.',
    '🔊 Âm thanh Web Audio: tiếng "cốc" khi đặt quân, "cốc cốc" khi ăn quân, tiếng "tách" khi bỏ lượt, nhạc thắng khi hết ván.',
    '🏅 Thêm 5 thành tích cho Cờ Vây (thắng đầu tiên, thắng 10 ván, thắng 3 ván liên tiếp, thắng bàn 19×19, thắng cách biệt 20 điểm) — tổng cộng giờ có 113 thành tích trên 29 game. Cột Luật chơi ở footer cũng có thêm link hướng dẫn Cờ Vây.',
    '🔧 Kiểm tra: rules 21 đạt, net 7 đạt, sim bot-vs-bot 9×9 (20 ván) và 19×19 (2 ván) 0 kẹt, thành tựu 26 test đạt (tổng 113); kiểm tra trình duyệt thật: vào ván vs máy 19×19, đặt quân bằng tap, máy trả lời, bỏ lượt ghi log, không tràn ngang ở 1280px và 390px, 0 lỗi JS.'
  ] },
  { id: '20261116-25', date: '16/11/2026', game: 'all', title: '🌐 Máy chủ phòng riêng đã lên sóng — GumballZ dùng server của mình', items: [
    '🌐 Máy chủ phòng riêng (server/) đã deploy lên tài khoản Cloudflare của GumballZ: Worker gumballz-rooms tại https://gumballz-rooms.hungnq-august.workers.dev, gói Free, kèm 4 Durable Objects (ROOM, INBOX, USERS, LOBBY) — phòng online giờ chạy trên server của mình thay vì máy chủ phòng của chủ cũ.',
    '🔗 Trang web đã trỏ sang máy chủ mới: shared/net/cfrelay.js đổi DEFAULT thành wss://gumballz-rooms.hungnq-august.workers.dev (kiểm tra /health trả về ok). Phòng tạo/vào bằng mã, chat trong phòng, bảng xếp hạng vẫn như trước.',
    '🖥️ Tài khoản còn có Worker gumballz-boardgame (nối GitHub, tự deploy lại mỗi lần push) phục vụ bản web tĩnh tại https://gumballz-boardgame.hungnq-august.workers.dev — bản này theo nhánh main trên GitHub, chưa gồm các thay đổi local chưa push.'
  ] },
  { id: '20261116-24', date: '16/11/2026', game: 'all', title: '🖼️ Ảnh bìa mới cho link chia sẻ — GUMBALLZ BOARDGAME', items: [
    '🖼️ Ảnh bìa khi gửi link web lên Facebook/Zalo/Messenger giờ là ảnh mới vẽ riêng cho GumballZ: nền vàng #FFD273 phong cách neobrutalism, chữ GUMBALLZ BOARDGAME to, kèm xúc xắc, lá bài, quân mã cờ vua, meeple, xu vàng và góc bàn Cờ Tỷ Phú — thay cho ảnh cũ còn logo và địa chỉ cũ.',
    '🔗 Thẻ chia sẻ (Open Graph) đã đúng tên web: og:site_name và og:title đều là “GumballZ Boardgame”, kèm og:description, ảnh og:image 1200×630 và twitter:card lớn để preview hiện đầy đủ trên Facebook, Zalo, Messenger và X.',
    '🔄 Đổi ?v=3 thành ?v=4 ở đường dẫn ảnh bìa để các mạng xã hội tải ảnh mới thay vì dùng ảnh cũ trong bộ nhớ đệm. Lưu ý: Facebook/Zalo vẫn có thể giữ ảnh cũ một thời gian — sau khi đẩy lên web, dùng Facebook Sharing Debugger (developers.facebook.com/tools/debug) nhập link để làm mới preview.'
  ] },
  { id: '20261116-23', date: '16/11/2026', game: 'all', title: '📱 Sửa tràn header ở màn 390px — nút Đăng nhập thành nút icon', items: [
    '📱 Trang chủ ở điện thoại màn 390px bị tràn ngang 27px (rộng 417px): cụm tài khoản (.acct) rộng tới 230px — avatar 42px + nút ⚙️ 42px + nút 👤 Đăng nhập ~130px — cộng logo 163px thì vượt màn hình. Đã đo lại bằng trình duyệt headless với đúng cụm tài khoản như khi chạy thật.',
    '🔧 Từ 480px trở xuống, nút tài khoản chỉ còn icon 👤 (ẩn chữ “Đăng nhập” / tên người dùng, giữ nguyên avatar + nút ⚙️): cụm tài khoản còn 140px, trang chủ vừa đúng 390px, không tràn. Màn 768px và 1280px không đổi. Tên người dùng vẫn xem được trong hồ sơ.',
    '✅ Popup “Có gì mới” (.ng-back) không gây tràn — nó là lớp fixed, đo cho thấy riêng cụm tài khoản đã giải thích đủ 417px.'
  ] },
  { id: '20261116-22', date: '16/11/2026', game: 'memory', title: '🃏 Game mới: Memory — Lật thẻ tìm cặp giống nhau', items: [
    '🆕 Game mới Memory (memory/): cả bàn là những lá bài úp mặt, mỗi hình có đúng 2 lá giống nhau. Mỗi lượt lật 2 lá: trúng cặp thì 2 lá giữ ngửa và được lật tiếp, lật trượt thì úp lại sau 1 nhịp rồi đổi lượt. Hết bàn thì ai nhiều cặp hơn thắng, bằng nhau thì hòa.',
    '😊 3 mức khó: Dễ 12 lá (6 cặp, 4×3) · Vừa 16 lá (8 cặp, 4×4) · Khó 24 lá (12 cặp, 6×4). Mặt thẻ là cặp emoji trái cây giống nhau.',
    '🧍 Chơi đơn: 1 mình lật hết bàn, tính giờ + số lượt lật, xếp hạng ⭐ 1–3 sao. Đấu với Máy (máy cũng nhớ các lá đã lật như bạn — Khó nhớ hoàn hảo, Dễ chỉ nhớ vài lá), 2 người chung máy, hoặc 🌐 chơi online tạo phòng / vào phòng bằng mã 5 ký tự.',
    '🌐 Chơi online: bộ bài do chủ phòng xáo 1 lần bằng seed rồi đồng bộ cho cả 2 bên qua state nên 2 bên luôn thấy cùng 1 bộ bài; mỗi nước lật là 1 action {flip: index} đồng bộ cả 2 bên. Đối thủ mất kết nối thì máy đi thay, chủ phòng rời thì phòng giải tán, có nút đấu lại. Phòng online vẫn chạy qua room server hiện tại cho tới khi deploy Worker riêng.',
    '🎨 Giao diện đồng bộ với các game khác: màn hình chính có chip GumballZ về trang chủ, sảnh chờ có mã phòng + nút rời, topbar có nút 🏠 / âm thanh / hướng dẫn; hiệu ứng lật thẻ xoay 3D, cặp trúng sáng lên, đồng hồ bấm giờ, số lượt lật / cặp đã tìm / lần trượt, log trận.',
    '🏅 Thêm 5 thành tích cho Memory (thắng đầu tiên, thắng 10 ván, thắng 3 ván liên tiếp, thắng chơi đơn mức Vừa không trượt lần nào, xong bàn 16 lá dưới 60 giây) — tổng cộng giờ có 108 thành tích trên 28 game. Cột Luật chơi ở footer cũng có thêm link hướng dẫn Memory.',
    '🔧 Kiểm tra kỹ lỗi đếm trùng khi đăng ký (bài học từ vòng Cờ Caro): chế độ mạng của Memory do stats.watch() tự ghi số ván/thắng nên main.js KHÔNG gọi record() tay ở chế độ mạng; chỉ chơi đơn (không qua mạng) main.js mới tự record() + recordEvent cho huy hiệu hoàn hảo / xong nhanh. Đã kiểm bằng test node: gửi view kết thúc 2 lần chỉ đếm 1 ván.'
  ] },
  { id: '20261116-21', date: '16/11/2026', game: 'tictactoe', title: '❌⭕ Game mới: TicTacToe online — bàn 3×3, thắng 3 quân', items: [
    '🆕 Game mới TicTacToe (tictactoe/): bàn 9 ô, X đi trước, thắng khi xếp 3 quân liên tiếp — có đúng 8 đường thắng (3 ngang, 3 dọc, 2 chéo); hòa khi bàn đầy 9 ô.',
    '⚠️ KHÁC HẲN Cờ Caro: Caro bàn 30×30 thắng 5 quân — còn TicTacToe bàn 3×3 thắng 3 quân; hướng dẫn trong game ghi rõ điểm khác này.',
    '🌐 Chơi online với bạn: tạo phòng / vào phòng bằng mã 5 ký tự như Bắn Tàu và Cờ Caro, đồng bộ từng nước đi {x, y}; đối thủ mất kết nối thì máy đi thay, chủ phòng rời thì phòng giải tán. Phòng online vẫn chạy qua room server hiện tại cho tới khi deploy Worker riêng.',
    '🤖 Máy AI minimax đầy đủ: Máy Khó không bao giờ thua (thắng khi bạn đi sai, hòa khi bạn đi đúng); Máy Dễ đi ngẫu nhiên, thỉnh thoảng mới chọn nước tốt. Thêm chế độ 2 người chơi trên cùng 1 máy.',
    '🎨 Giao diện đồng bộ với các game khác: màn hình chính có chip GumballZ về trang chủ, sảnh chờ online, topbar có nút 🏠, ghế người chơi, log trận; bàn 3×3 ô lớn dễ bấm, ô vừa đánh viền vàng, 3 quân thắng tô sáng.',
    '🏅 Thêm 4 thành tích cho TicTacToe (thắng đầu tiên, thắng 10 ván, thắng 3 ván liên tiếp, hòa với Máy Khó) — tổng cộng giờ có 108 thành tích trên 28 game. Cột Luật chơi ở footer cũng có thêm link hướng dẫn TicTacToe.',
    '🔧 Kiểm tra kỹ lỗi đếm trùng khi đăng ký (bài học từ vòng Cờ Caro): mọi chế độ của TicTacToe đều chạy qua simplenet Host nên số ván/thắng chỉ do stats.watch() tự ghi — main.js KHÔNG gọi record() tay, chỉ ghi recordEvent cho huy hiệu hòa máy Khó. Đã kiểm bằng test node: gửi view kết thúc 2 lần chỉ đếm 1 ván.'
  ] },
  { id: '20261116-20', date: '16/11/2026', game: 'caro', title: '🆕 Game mới: Cờ Caro online — bàn 30×30, thắng 5 quân liên tiếp', items: [
    '🆕 Game mới Cờ Caro (caro/): bàn lớn 30×30 ô (900 ô), 2 người X (đi trước) / O luân phiên đặt quân. Thắng khi có 5 quân liên tiếp trở lên ngang / dọc / chéo — 6 quân cũng thắng, 4 quân chưa thắng, 5 quân thắng ngay cả khi 2 đầu bị chặn. Hòa khi bàn đầy.',
    '⚠️ Không phải TicTacToe: khác hẳn cờ 3×3 thắng 3 quân — Caro là bàn lớn, có chiến thuật chặn / phản công trên cả bàn. Hướng dẫn trong game ghi rõ điểm khác này.',
    '🖐️ Giữ và trượt để xem bàn: bàn 30×30 không vừa màn hình nên có khung xem — giữ chuột / ngón tay và kéo để trượt góc nhìn; nhấn nhanh (< 8px) thì đặt quân, kéo xa hơn thì chỉ trượt, không đặt nhầm. Nút zoom ＋/－, lăn chuột để zoom, nút Vừa màn hình và nút về vị trí quân mới đánh. Mobile 390px mặc định hiện ~14 ô ngang, không tràn trang.',
    '🌐 Chơi online với bạn: tạo phòng / vào phòng bằng mã 5 ký tự như các game khác (simplenet + gamekit), đồng bộ theo action {x, y}; đối thủ mất kết nối thì máy đi thay, chủ phòng rời thì phòng giải tán, có nút đấu lại. Phòng online hiện trong Sảnh chung như các game khác. Phòng online vẫn chạy qua room server hiện tại cho tới khi deploy Worker riêng.',
    '🤖 Đấu với máy: bot heuristic cho bàn lớn (chỉ xét ô trong bán kính ≤ 2 quanh quân đã có, chấm điểm đường 5/4/3) — Máy Khó luôn chặn nước thắng và luôn đánh nước thắng của mình; Máy Dễ đánh ngẫu nhiên trong các nước tạm được. Thêm chế độ 2 người chơi trên cùng 1 máy.',
    '🎨 Giao diện đồng bộ với các game khác: màn hình chính có chip GumballZ về trang chủ, sảnh chờ có mã phòng + nút rời, topbar có nút 🏠 / âm thanh / hướng dẫn / ván mới; ô vừa đánh nổi bật, dãy 5 quân thắng tô sáng, ghế 2 người chơi + nhật ký trận đấu.',
    '🏅 Thêm 4 thành tích cho Cờ Caro (thắng đầu tiên, thắng 10 ván, thắng 3 ván liên tiếp, thắng dưới 30 nước) — tổng cộng giờ có 99 thành tích trên 26 game. Cột Luật chơi ở footer cũng có thêm link hướng dẫn Cờ Caro.',
    '🔧 Sửa 1 lỗi đếm trùng do đăng ký: trước đây màn chơi Caro tự gọi record() khi ván kết thúc, mà simplenet đã bọc sẵn watch() tự ghi số ván/thắng — thêm game vào danh sách watch mà không gỡ record() tay thì mỗi ván sẽ bị đếm 2 lần. Giờ số ván/thắng Caro chỉ do watch() ghi (như Ô Ăn Quan).'
  ] },
  { id: '20261116-19', date: '16/11/2026', game: 'oanquan', title: '🌐 Ô Ăn Quan chơi online + đồng bộ giao diện', items: [
    '🌐 Chơi online với bạn: bấm 🌐 Online ở màn hình chính rồi Tạo phòng online — gửi mã phòng 5 ký tự (hoặc link mời) cho bạn; bạn nhập mã rồi bấm Vào. Chủ phòng chọn giá trị Quan trong phòng chờ rồi bấm Bắt đầu chơi. Có thể thêm Máy vào phòng khi chưa đủ người.',
    '🤝 Mỗi nước đi là 1 action {ô, hướng} gửi qua phòng: cả 2 bên cùng chạy 1 animation bàn tay rải đá y hệt nhau. Luật cứu dân đã nằm trọn trong engine với thứ tự cố định (túi Dân → đổi 1 Quan = 10 Dân → vay đối phương) nên 2 bên luôn tính ra cùng 1 túi điểm, cùng 1 lượt đi — đã kiểm chứng bằng test đồng bộ (2 engine chạy cùng chuỗi nước, state giống hệt sau mỗi nước).',
    '🔄 Đối thủ mất kết nối thì máy đi thay sau vài giây (bảng hiện rõ "mất kết nối"); chủ phòng rời thì phòng giải tán và hiện hộp cho tạo phòng mới hoặc về màn hình chính. Hết ván: chủ phòng bấm Chơi ván mới để đấu lại, khách chờ chủ phòng bắt đầu.',
    '🎨 Đồng bộ giao diện với các game khác: màn hình chính dùng đúng khung home-card chung (có chip GumballZ về trang chủ như Bắn Tàu), sảnh chờ online giống sảnh các game khác (mã phòng, danh sách người chơi, thêm máy, tùy chọn Quan, nút Thoát), topbar màn chơi dính trên cùng như các game, ghế người chơi và khung nhật ký cùng nhịp viền/bóng với Bắn Tàu. Bàn cờ gỗ, đá, quân cờ và luật chơi giữ nguyên.',
    '🏠 Nút về trang chủ giờ có ở cả 3 màn: chip GumballZ ở màn hình chính, nút Thoát ở sảnh chờ, nút 🏠 trong topbar màn chơi (mở hộp "Rời ván?" có nút Về trang chủ).',
    '🔎 Ô Ăn Quan đã có trong danh sách game của máy chủ phòng (Sảnh chung + Tìm trận theo mã), nên phòng online hiện được trong Sảnh chung như các game khác. Phòng online vẫn chạy qua room server hiện tại cho tới khi deploy Worker riêng.'
  ] },
  { id: '20261116-18', date: '16/11/2026', game: 'bantau', title: '☢️ Sửa hiệu ứng bom chỉ nổ đúng lưới địch', items: [
    'Sửa lỗi hiệu ứng bom (và phát bắn thường): dấu 💥 chờ nổ trước đây hiện trên CẢ 2 lưới cùng 1 tọa độ — ném bom vào địch thì biển của mình cũng nổ theo. Giờ mỗi lưới có danh sách ô đang nổ riêng, nên bom chỉ nổ trên lưới bị ném (mình ném → lưới mục tiêu; địch ném → biển của mình).',
    'Giữ nguyên nhịp hiệu ứng: trúng hiện 💥 rồi ~0,45 giây mới hiện X; bom rơi từ trên trời ~0,68 giây rồi 9 ô nổ lần lượt, mỗi ô cách nhau 0,12 giây.'
  ] },
  { id: '20261116-17', date: '16/11/2026', game: 'oanquan', title: '✋ Ô Ăn Quan: bàn tay bốc đá + rải theo ô kề', items: [
    'Sửa lỗi hướng rải bị ngược: trước đây nút "Trái/Phải" gán theo chiều kim đồng hồ nên ở hàng dưới (hàng của bạn) nhấn Trái lại đi sang Phải. Giờ bỏ hẳn 2 nút mũi tên, thay bằng cơ chế bấm ô kề: bấm 1 ô Dân bên mình để bàn tay bốc đá lên, rồi bấm ô kề bên trái hoặc bên phải (đúng trái/phải nhìn thấy trên màn hình) để rải theo hướng đó.',
    '✋ Thêm bàn tay bốc đá vẽ tay: bấm ô nào là tay bốc toàn bộ đá trong ô lên (ô trống tạm thời, trên tay hiện chùm đá + số đếm). Tay đi từng bước theo đúng đường rải, thả 1 viên vào mỗi ô, số đá trên tay giảm dần; gặp rải tiếp thì tay bốc tiếp, ăn được quân thì tay xúc đá đưa về túi điểm của bạn. Lượt của máy cũng có tay đi theo để bạn theo dõi được.',
    'Bấm lại vào chính ô gốc để đặt đá xuống và chọn ô khác; bấm vào ô khác (không phải ô kề, không phải ô gốc) thì đá vẫn nằm trên tay; bấm Esc để hủy bốc. Hai ô kề sáng lên khi đang bốc đá để biết rải được sang đâu.',
    '🏠 Thêm nút 🏠 rời ván trong màn chơi Ô Ăn Quan (như các game khác): bấm để mở hộp "Rời ván?" — có nút Rời ván, Ở lại và nút Về trang chủ.'
  ] },
  { id: '20261116-16', date: '16/11/2026', game: 'all', title: '🧭 Header trang chủ không còn gãy chữ', items: [
    '6 mục điều hướng (Tìm trận, Sảnh chung, Xếp hạng, Có gì mới, Góp ý, Ủng hộ) giờ luôn nằm gọn trên 1 dòng, không còn bị ngắt thành 2 dòng kiểu "Tìm / trận".',
    'Nới rộng khung header cho vừa 6 mục, giữ nguyên phong cách Neo-Brutalism (nền vàng, viền mực 3px) và giữ nguyên nhãn, thứ tự các mục.',
    'Trên màn hình hẹp (từ 1150px trở xuống), thanh điều hướng chuyển thành hàng lối tắt cuộn ngang dưới header — vẫn đủ cả 6 mục, không tràn, không gãy chữ.'
  ] },
  { id: '20261116-15', date: '16/11/2026', game: 'oanquan', title: '🪀 Game mới: Ô Ăn Quan!', items: [
    '🪀 Trò chơi dân gian Việt Nam: bàn gỗ 12 ô (2 ô Quan + 10 ô Dân), mỗi ô Quan 1 quân Quan, mỗi ô Dân 5 quân Dân. Rải quân, ăn dây, cứu dân, ăn Quan — ai nhiều điểm hơn thì thắng.',
    '👉 Bấm 1 ô Dân bên mình rồi chọn hướng rải: ◀ sang Trái (ngược chiều kim đồng hồ) hoặc sang Phải ▶ (theo chiều kim đồng hồ). Mỗi viên đá rơi cách nhau một nhịp để nhìn kịp đường đi, có tiếng sỏi "cạch" và tiếng leng keng khi ăn quân.',
    '😋 Đủ 4 trường hợp sau khi thả viên cuối: rải tiếp (ô Dân có quân), chững vì Quan (mất lượt), ăn quân & ăn dây (ô trống rồi ô sau có quân), 2 ô trống liên tiếp (mất lượt). Ăn được ô Quan thì ăn cả Quan lẫn Dân trong ô đó.',
    '🛟 Luật Cứu dân: đầu lượt mà 5 ô bên mình đều trống thì phải trích 5 Dân trong túi rải đều; thiếu thì đổi 1 Quan = 10 Dân, vẫn thiếu thì vay Dân của đối phương (trừ vào điểm cuối trận). Không cứu được thì ván kết thúc ngay.',
    '🤖 Đấu với Máy 2 mức (Dễ: ngẫu nhiên; Khó: tính trước 2–3 nước, ưu tiên ăn Quan) hoặc 2 người chơi chung 1 máy. Giá trị Quan chọn 5 hoặc 10 điểm lúc bắt đầu.',
    '🏅 Thêm 6 thành tích riêng cho Ô Ăn Quan (ăn Quan đầu tiên, ăn dây 3 ô, cứu dân thành công, thắng mà không mất Quan nào, ăn cả 2 Quan trong 1 ván, thắng sau khi cứu dân) — tổng cộng giờ có 95 thành tích trên 25 game. Cột Luật chơi ở footer cũng có thêm link hướng dẫn Ô Ăn Quan.',
    '🖼️ Bàn gỗ và đá vẽ bằng CSS/SVG. Muốn dùng ảnh của riêng bạn thì thả file oanquan/img/spritesheet.png vào thư mục game (xem hướng dẫn trong trang luật) — game tự tách nền trắng và dùng ảnh đó làm bàn + đá.'
  ] },
  { id: '20261116-14', date: '16/11/2026', game: 'all', title: '🏅 Thêm 70 thành tựu mới cho mọi game!', items: [
    '🏅 Tổng cộng giờ có 86 thành tích: mỗi game trong 24 game đều có huy hiệu riêng (thắng đầu tiên + 10 ván thắng), thêm bộ thành tích toàn web (chơi đủ 24 game, thắng 100 ván, chuỗi thắng 10, chơi 30 ngày khác nhau, đạt cấp 10…) và bộ sâu cho Bắn Tàu.',
    '🚢 Thành tích riêng của Bắn Tàu: đánh chìm tàu đầu tiên, chìm 2 tàu / cả 5 tàu trong 1 ván, chuỗi 3 và 5 phát trúng liên tiếp, dùng đủ 3 loại vật phẩm (Bẫy, Radar, Bom), thắng mà không mất tàu nào, bẫy sập, radar bắt sóng, bom hạt nhân chìm tàu.',
    '🎉 Mở khóa thành tích nào là toast chúc mừng hiện lên ngay, và xem tất cả trong mục Thành tích ở Hồ sơ (huy hiệu đã mở có màu, chưa mở xám kèm tiến độ như 3/10).',
    '📱 Thành tích chỉ là huy hiệu trang trí, không đổi xu hay đổi luật. Ai đăng nhập thì thành tích theo tài khoản sang máy khác.'
  ] },
  { id: '20261116-13', date: '16/11/2026', game: 'bantau', title: '💥 Hiệu ứng nổ, chìm tàu, Radar và Bom mới', items: [
    '🎯 Bắn trúng 1 ô: vụ nổ nhỏ hiện ngay tại ô đó trước, rồi mới hiện dấu X đỏ (~0,45 giây sau).',
    '💥 Đánh chìm 1 tàu: vụ nổ LỚN phủ cả con tàu (từng ô nổ lệch nhau, rung mạnh), rồi hiện nguyên hình tàu địch đó trên lưới mục tiêu – đúng vị trí, đúng loại tàu – dạng cháy đen, gãy nghiêng, bốc khói. Bên bị chìm cũng thấy tàu mình nổ tung trên biển của họ.',
    '📡 Radar đổi luật: quét vùng 3×3 giờ lộ đúng các ô có thuyền trong vùng (đánh dấu trên lưới mục tiêu để bắn tiếp), kèm hiệu ứng vòng quét xoay. Trước đây radar chỉ báo có/không có tàu. Bot cũng bắn theo các ô radar đã lộ.',
    '☢️ Bom hạt nhân: quả bom rơi từ trên trời xuống đúng ô mục tiêu (có tiếng rít), rồi 9 ô trong vùng 3×3 nổ tung lần lượt, kiểu nổ vàng cam khác hẳn nổ thường và nổ chìm tàu.',
    '🔔 Thông báo nổi (toast): khi có tàu chìm hoặc ai đó dùng Bẫy/Radar/Bom, cả 2 bên đều thấy toast hiện lên, đồng thời vẫn ghi vào 📜 Nhật ký trận đấu như cũ.'
  ] },
  { id: '20261116-12', date: '16/11/2026', game: 'all', title: '🦶 Footer trang chủ gọn hơn', items: [
    'Cột Luật chơi giờ chia 2 cột link nên footer ngắn còn khoảng một nửa: vẫn đủ 15 link luật, không cắt link nào, chỉ xếp gọn lại.',
    'Thu hẹp khoảng cách trong footer cho gọn, giữ nguyên phong cách Neo-Brutalism (nền kem, viền ink 3px, thanh vàng dưới cùng với © 2026 GUMBALLZ BOARDGAME và số người online).',
    'Trên điện thoại, cột Luật chơi trải hết chiều rộng với 2 cột link chữ nhỏ gọn, footer không còn dài thòng và không tràn ngang.'
  ] },
  { id: '20261116-11', date: '16/11/2026', game: 'bantau', title: '🎯 Bắn trúng được bắn tiếp!', items: [
    'Luật mới: bắn trúng 1 ô thì được bắn tiếp; bắn trượt (hoặc bị bẫy vô hiệu) thì đổi lượt. Chìm tàu cũng tính là trúng nên được bắn tiếp.',
    'Vật phẩm hỗ trợ dùng xong là hết lượt, dù trước đó có bắn trúng: đặt Bẫy xong đổi lượt, Radar và Bom hạt nhân cũng vậy. Chỉ có mua vật phẩm là không tốn lượt — mua xong vẫn bắn được trong lượt đó.',
    'Bot cũng bắn tiếp sau mỗi phát trúng, và dừng đúng lúc khi đặt bẫy xong. Hướng dẫn trong game, trang luật và mục học nhanh đã cập nhật theo luật mới.'
  ] },
  { id: '20261116-10', date: '16/11/2026', game: 'bantau', title: '🚢 Kéo thả tàu + lưới vuông đều + tàu vẽ mới', items: [
    'Kéo tàu từ khay vào biển bằng chuột hoặc ngón tay, có bóng tàu theo tay và xem trước vị trí (xanh là đặt được, đỏ là không). Bấm R hoặc bấm đúp vào tàu trong khay để xoay, kể cả lúc đang kéo.',
    'Sửa lỗi lưới: 2 biển giờ vuông đều nhau, mọi ô cùng kích thước — không còn hàng bị kéo giãn hay ô méo.',
    'Tàu trên biển vẽ thành 1 hình liền mạch như ảnh mẫu: Tàu sân bay, Thiết giáp hạm, Tuần dương hạm, Tàu ngầm, Tàu khu trục — mỗi loại 1 kiểu, xoay được ngang/dọc.',
    'Chữ tab lọc trang chủ và tên game trên các ô mới: font Baloo 2 rõ hơn, nút đang chọn nền vàng nổi bật, tên game không còn tràn hay ngắt xấu.'
  ] },
  { id: '20261116-9', date: '16/11/2026', game: 'bantau', title: '🚢 Bắn Tàu thay Battle Fleet', items: [
    'Gỡ game Battle Fleet khỏi web; chỉ còn game Bắn Tàu chuẩn 10×10 làm theo mô tả, dựa trên code gốc.',
    'Bắn Tàu: 5 tàu (17 ô) trên lưới 10×10, bắn luân phiên, Bẫy / Radar / Bom hạt nhân bằng xu trong trận. Đấu với máy hoặc mời bạn vào phòng.',
    'Thông tin và giao diện game vẫn là của GumballZ: tên, credit, VietQR và phong cách Neo-Brutalism giữ nguyên.'
  ] },
  { id: '20261116-8', date: '16/11/2026', game: 'all', title: '🔄 Đồng bộ code mới + game Bắn Tàu mới', items: [
    '🔄 Đồng bộ code mới nhất (16/11/2026): 6 game mới Tứ sắc, Chợ Lớn, Tá lả, Cờ vua 3D, Lô tô, Bài Tấn; Cờ Tỷ Phú tối đa 8 người + chơi theo đội 2 người.',
    '🚢 Game mới: Bắn Tàu! Xếp 5 tàu (17 ô) trên lưới 10×10, bắn luân phiên, dùng Bẫy, Radar và Bom hạt nhân bằng xu trong trận. Đấu với máy hoặc mời bạn vào phòng.',
    '⚡ Lần đầu có trên GumballZ: Tìm trận nhanh, Bảng xếp hạng toàn server, Kết bạn & nhắn riêng, Thoại trong phòng, tự chuyển chủ phòng, đo độ trễ (📶 Lag).',
    '🛠️ Sửa lỗi theo bản gốc: UNÔ No Mercy hết kẹt ván, Ma Sói không lộ bí mật cho người xem, hết ghế ma, Cờ Tỷ Phú chuộc đất đủ hàng là thắng ngay, Tiến Lên chọn sảnh 1–2 chạm, UNÔ chọn tốc độ bốc bài.',
    '🎲 Giữ nguyên bản GumballZ: giao diện Neo-Brutalism, 50 thẻ Cờ Tỷ Phú (26 Cơ hội + 24 Khí vận), tên/lớp/biến GumballZ, mã VietQR của Nguyễn Quốc Hưng (GumballZ).',
    '🔗 Mã nguồn bản này do GumballZ tự quản lý.'
  ] },
  { id: '20261116-7', date: '16/11/2026', game: 'tusac', title: 'Game mới: Tứ sắc (luật Nam)', items: [
    '🀄 112 lá bốn màu, 2–4 người: ăn đôi, ăn lẻ, khui khạp, quằn – hết lá rác là tới.',
    '🟩 Bài trên tay tự xếp theo bộ và đếm số lá rác còn lại cho bạn; lá có ghi tên Việt dưới chữ Hán.',
    '✋ Chủ phòng chọn cho khui ngoài lượt hay chỉ ăn đúng lượt. Mỗi lệnh = 1 xu ảo.',
  ] },
  { id: '20261116-6', date: '16/11/2026', game: 'cholon', title: 'Game mới: Chợ Lớn – mặc cả mở tiệm!', items: [
    '🏮 3–5 người, 6 năm buôn bán: nhận đất, nhận biển hiệu, rồi tự do đổi chác với nhau.',
    '🤝 Hộp Mặc cả: đổi đất, biển hiệu, tiền với bất kỳ ai; trả giá lại được.',
    '⭐ Gom tiệm cùng loại liền nhau cho trọn bộ để thu đậm. Hết năm cuối ai giàu nhất thắng.',
  ] },
  { id: '20261116-5', date: '16/11/2026', game: 'tala', title: 'Game mới: Tá lả (Phỏm)!', items: [
    '🀄 Tá lả 2–4 người: bốc nọc hoặc ăn lá người trước vừa đánh, gom phỏm, canh ù.',
    '🟩 Bài trên tay tự xếp sẵn theo phỏm; lượt cuối máy tự hạ phỏm và gửi bài giúp bạn.',
    '🤖 Chơi online với bạn bè hoặc với bot; xu trong ván chỉ để tính vui.',
  ] },
  { id: '20261116-4', date: '16/11/2026', game: 'typhu', title: '🤝 Cờ Tỷ Phú chơi theo đội', items: [
    '🤝 Luật bàn mới "Theo đội": 4, 6 hoặc 8 người, mỗi đội 2 người ngồi đối diện nhau (🟠 🔵 🟢 🟣). Bàn giờ ngồi được tối đa 8 người.',
    '🏠 Dừng ở đất của đồng đội không mất tiền thuê; các đội khác phá sản hết (hoặc một người trong đội thắng độc quyền) là cả đội thắng.',
    '⏱️ Có giới hạn vòng thì so tổng tài sản của cả đội.',
  ] },
  { id: '20261116-3', date: '16/11/2026', game: 'covua', title: 'Game mới: Cờ vua!', items: [
    '♟️ Cờ vua đủ luật: nhập thành, bắt tốt qua đường, phong cấp, hoà do lặp thế / 50 nước / hết nước đi.',
    '🤖 Đấu với máy 3 mức, hai người chung máy, hoặc mở phòng online.',
    '💡 Gợi ý nước đi và 📊 thanh đánh giá: tự bật/tắt; khi hai người đấu nhau thì chủ phòng quyết định có cho phép không.',
    '🧩 30 bài cờ thế chiếu bí trong 1–2 nước, và nút ◀ ▶ để xem lại ván.',
    '🧊 Bấm 🧊 để chuyển sang bàn cờ 3D: kéo để xoay, phóng to thu nhỏ tuỳ thích.',
  ] },
  { id: '20261115-14', date: '15/11/2026', game: 'all', title: '🛠️ Sửa lỗi nhỏ', items: [
    '🛠️ Xì Dách, Ba Cào, Cát tê, Poker, CÀ ĐÙNG!: hết lỗi khi bấm nút trong hộp kết quả sau lúc đã rời phòng.',
  ] },
  { id: '20261115-13', date: '15/11/2026', game: 'all', title: '🧹 Soát lại toàn bộ code: vá lỗi & chơi công bằng hơn', items: [
    '🃏 UNÔ No Mercy: sửa lỗi cả ván đứng hình khi ai đó "Bốc thử" đúng lúc đủ 25 lá và bị loại.',
    '🐺 Ma Sói: người vào xem giữa ván không còn thấy được phiếu của Sói, vai và các kênh chat kín.',
    '🤠 CÀ ĐÙNG!: Sid Ketchum phải bỏ đúng 2 lá khác nhau mới hồi máu; Panic!/Cat Balou lấy lá trên tay luôn là ngẫu nhiên.',
    '🏙️ Cờ Tỷ Phú: chuộc đất xong đủ trọn 1 hàng là thắng ngay, không phải chờ lượt sau.',
    '🎨 Scribble it!: sau khi chuyển chủ phòng, chủ mới điều khiển được phần chiếu lại album.',
    '🏅 Hồ sơ: sửa trường hợp số ván bị cộng trùng khi đồng bộ tài khoản; ngày chơi tính theo giờ Việt Nam.',
    '♟️ Cờ tướng & Thật hay Thách: người rớt mạng ở phòng chờ quá 12 giây sẽ tự trả ghế, phòng không còn báo đầy vì "ghế ma".',
    '🔒 Kín kẽ hơn: vá vài chỗ có thể bị lợi dụng để giành ghế hoặc soi bài của người khác.',
    '👑 Chuyển chủ phòng chắc tay hơn: chỉ đổi chủ khi chủ phòng mất thật (người kế vị tự rớt mạng không còn "giành ghế" làm cả bàn giật lùi); chủ phòng đổi wifi ↔ 4G thì mọi người tự vào lại thay vì đứng im.',
    '🪑 Người chơi chớp mạng vài giây không còn bị người xem "Ngồi thay" mất ghế (phải rớt quá 15 giây).',
    '👻 Hết "ghế ma": ai đã thoát khỏi phòng thì ván mới không chia bài cho họ nữa (CÀ ĐÙNG!, Tam Quốc Sát, Ma Sói, Cờ Tỷ Phú, Cá ngựa, Đua Lạc Đà, UNÔ, Tiến Lên, Mèo Nổ).',
    '⏱️ UNÔ: bấm UNO liên tục không còn làm đồng hồ lượt chạy lại từ đầu.',
    '🏆 Bảng xếp hạng & chat Sảnh: thêm chống gian lận số ván và chống spam.',
  ] },
  { id: '20261115-12', date: '15/11/2026', game: 'all', title: '🚪 Vào phòng ngay từ trang chủ + ghép trận theo trình', items: [
    '🚪 Trang chủ có mục "Phòng đang mở": thấy ngay các phòng công khai, bấm Vào ▶ là chơi.',
    '🔢 Có mã phòng? Nhập thẳng ở trang chủ, web tự biết phòng đó của game nào.',
    '🏷️ Ô game có thêm nhãn ✨ GAME MỚI và 🔥 HOT (game đang đông người chơi nhất).',
    '🎖️ Tìm trận nhanh giờ ưu tiên ghép với người/bàn gần cấp độ của bạn; phòng công khai hiện cấp độ chủ phòng.',
    '🛠️ Sửa lỗi Tìm trận nhanh đôi khi ghép xong mà không tự mở bàn.',
    '📮 Cần liên hệ chủ web? Có link Facebook ở chân trang chủ và trang Giới thiệu & liên hệ.',
  ] },
  { id: '20261115-11', date: '15/11/2026', game: 'all', title: '🗂️ Trang chủ chia game theo nhóm', items: [
    '🗂️ Game ở trang chủ giờ xếp theo 3 nhóm có tiêu đề: 🎉 Tiệc tùng, 🎲 Bàn cờ, 🃏 Game bài – dễ tìm hơn. Bộ lọc theo loại và số người vẫn dùng như cũ.',
  ] },
  { id: '20261115-3', date: '15/11/2026', game: 'all', title: '✨ Trang chủ gọn hẳn + footer kiểu Hub + phong cách trang game', items: [
    '✨ Trang chủ bố cục gọn hoàn toàn: hero chỉ còn 1 dải ngang, tất cả game gộp thành 1 lưới dày (màn hình lớn 5 cột), tile nhỏ gọn, game nổi bật gắn badge ngay trên ô game.',
    '🔥 Game hot lên trên cùng: hàng game đang chơi nhiều nhất hiện ngay dưới hero (có số người chơi thật khi máy chủ gửi về, không thì hiện 4 game nổi bật mặc định). Thẻ game vẫn giữ nguyên ảnh, tên, mô tả và số người chơi.',
    '🦶 Chân trang mới kiểu GumballZ Hub: viền trên dày 3px, nền kem, tên thương hiệu lớn, 4 cột link Chơi – Luật chơi – Cộng đồng – Thông tin, thanh dưới vàng ghi © 2026 GUMBALLZ BOARDGAME và số người đang online.',
    '🎮 Trang game đổi phong cách cả màn chơi: nút bấm, chip công cụ, thanh trên, thanh hành động và khung nhật ký đều theo phong cách GumballZ (nền trắng/vàng/hồng, viền mực 3px, shadow nhẹ). Bàn chơi, lá bài, quân cờ và luật game giữ nguyên.',
  ] },
  { id: '20261115-2', date: '15/11/2026', game: 'all', title: '🎨 Bố cục mới: trang chủ theo nhóm, sảnh chờ và cài đặt', items: [
    '🎨 Trang chủ bố cục mới: hero gọn lại, banner nổi bật Cờ Tỷ Phú, game chia 3 nhóm Cờ bàn – Bài – Tụ tập, thanh lọc theo nhóm vẫn dùng được như cũ.',
    '🏠 Màn hình chờ và phòng chờ trong game, chat phòng, hộp thoại, Có gì mới, hồ sơ và Cài đặt đều theo phong cách GumballZ (viền mực, màu pastel, shadow nhẹ).',
    '⚙️ Cài đặt đổi nút gạt dạng khối viền mực, chữ và nút rõ hơn – mọi cài đặt cũ vẫn giữ nguyên.',
    '🎲 Màn chơi giữ nguyên 100%: bàn cờ, lá bài, xúc xắc và luật chơi không đổi.',
  ] },
  { id: '20261115-1', date: '15/11/2026', game: 'all', title: '🔄 Đồng bộ code mới nhất từ bản gốc', items: [
    '🔄 Đồng bộ code mới (15/11/2026): chat trong phòng cho mọi game, bot Tiến Lên Huyền thoại, UNÔ bỏ bớt được loại lá, Sảnh chung gọn trong 1 màn hình, máy chủ nhẹ gánh hơn, trang Quản trị đọc số thật từ Cloudflare.',
    '🎲 Giữ nguyên bản GumballZ: giao diện Neo-Brutalism, 50 thẻ Cờ Tỷ Phú (26 Cơ hội + 24 Khí vận), tên/lớp/biến GumballZ, mã VietQR của Nguyễn Quốc Hưng (GumballZ).',
    '🔗 Mã nguồn bản này do GumballZ tự quản lý.',
  ] },
  { id: '20261114-2', date: '14/11/2026', game: 'all', title: '🌐 Sảnh chung gọn gàng', items: [
    '🌐 Sửa Sảnh chung bị dài vô tận: danh sách phòng và khung chat giờ vừa đúng một màn hình, tự cuộn bên trong, ô nhắn tin luôn ở dưới cùng.',
  ] },
  { id: '20261114-1', date: '14/11/2026', game: 'all', title: '⚡ Máy chủ nhẹ gánh hơn', items: [
    '⚡ Chủ phòng giờ gom tin gửi cho cả bàn thành một gói – máy chủ đỡ tốn lượt, phòng đông vẫn mượt, web chịu được nhiều người chơi hơn mỗi ngày.',
  ] },
  { id: '20261113-5', date: '13/11/2026', game: 'all', title: '💬 Chat trong phòng', items: [
    '💬 Phòng online nào giờ cũng có chat: bấm cái "tai" 💬 ở mép trái màn hình để nhắn cả phòng (kéo nó lên xuống được nếu vướng).',
    '📱 Trên điện thoại hộp chat nằm gọn phía trên, không che bài trên tay nên vừa chat vừa đánh được.',
    '🔴 Đang đóng hộp chat mà có tin mới thì hiện chấm đỏ + dòng xem nhanh. Từ tục được lọc như chat ở Sảnh.',
    'ℹ️ Ma Sói và Vẽ đoán vẫn dùng chat riêng của game như cũ.',
  ] },
  { id: '20261113-4', date: '13/11/2026', game: 'uno', title: '🚫 Tự chọn bỏ lá trong UNÔ', items: [
    '🚫 Chủ phòng giờ bỏ được loại lá mình không thích (ví dụ +4, No U, Đổi tay…): ở phòng chờ, mục "Bỏ bớt lá", bấm vào lá nào là ván đó không có lá ấy.',
  ] },
  { id: '20261113-3', date: '13/11/2026', game: 'all', title: '💌 Sửa theo góp ý của mọi người', items: [
    '🐺 Ma Sói: 🎓 Ván tập giờ giữ đúng lựa chọn "Lộ vai khi chết" của bạn (trước đây tự bật lên dù đang tắt).',
    '⚔️ Tam Quốc Sát: thong thả hơn – 30 giây để đáp trả (trước 20), 5 giây cho Vô giải (trước 3), bot ra bài chậm lại một nhịp. Muốn chậm nữa thì chọn ⏱ Chậm trong cài đặt.',
  ] },
  { id: '20261113-2', date: '13/11/2026', game: 'tienlen', title: '👑 Bot Tiến Lên khôn hơn', items: [
    '😈 Bot Cao thủ giờ biết "đánh thử trong đầu" vài chục ván trước khi ra bài – khó ăn hơn hẳn.',
    '👑 Thêm cấp Huyền thoại: nghĩ kỹ nhất, thắng nhất nhiều gấp rưỡi bot thường. Bấm vào nhãn độ khó cạnh tên bot để đổi.',
    '🙈 Bot vẫn chơi sạch: không nhìn bài ai, chỉ dựa vào bài mình, lá đã đánh và số lá mỗi người còn.',
  ] },
  { id: '20261113-1', date: '13/11/2026', game: 'all', title: '✅ Máy chủ vẫn khoẻ re', items: [
    '✅ Sửa thông báo "máy chủ hết lượt miễn phí" hiện nhầm mấy hôm nay – thật ra máy chủ chính vẫn chạy bình thường, cứ rủ bạn vào chơi thoải mái nha!',
  ] },
  { id: '20261113-g2', date: '13/11/2026', game: 'all', title: '🎲 Đổi tên thành GumballZ Boardgame', items: [
    '🎲 Web đổi tên thành GumballZ Boardgame, chạy tại gumballzgames.vercel.app. Tên, class, biến và khoá lưu trong toàn bộ code đổi từ tên cũ sang GumballZ.',
    '🔗 Mã nguồn bản này do GumballZ tự quản lý. Chủ web: Nguyễn Quốc Hưng (GumballZ).',
    '☕ Nút Ủng hộ giờ hiện mã VietQR của chủ web mới.',
  ] },
  { id: '20261113-g1', date: '13/11/2026', game: 'all', title: '🎨 Giao diện Neo-Brutalism + thêm 18 thẻ Cờ Tỷ Phú', items: [
    '🎨 Trang chủ, thanh trên, sảnh chờ và hộp thoại đổi sang phong cách Neo-Brutalism: viền mực dày, màu phẳng vàng – hồng – tím nhạt, bóng đổ nhẹ. Giao diện trong game (bàn cờ, lá bài, quân cờ) giữ nguyên.',
    '🃏 Cờ Tỷ Phú thêm 18 thẻ mới: 10 thẻ Cơ hội và 8 thẻ Khí vận (tới Lê Lợi / Bùi Viện / Bến xe Miền Tây / Nguyễn Huệ, tiến – lùi 1–2 ô, nhận – trả 50–120K, bao cả bàn, mừng cưới, sửa nhà nhỏ).',
  ] },
  { id: '20261112-7', date: '12/11/2026', game: 'all', title: '⚡ Mượt hơn trên máy tính & điện thoại', items: [
    '⚡ Trang chủ không còn bị nhảy chữ, nhảy ô lúc mới mở (số người online, ô Thử thách hôm nay, ô game nổi bật đã giữ chỗ sẵn).',
    '🎓 Màn Học chơi nhanh hiện ra là có ngay hình, không còn giật khung.',
    '🎲 Cờ Tỷ Phú, Cờ cá ngựa, Đua Lạc Đà: bấm Bắt đầu là có phản hồi ngay ("Đang dọn bàn…") thay vì đứng hình.',
  ] },
  { id: '20261112-6', date: '12/11/2026', game: 'typhu', title: '😱 Emoji cảm xúc trên bàn cờ', items: [
    '😱 Quân cờ giờ biết biểu cảm: 😰 vào nhà người ta mà thiếu tiền, 😭 trả tiền thuê đau ví (chủ nhà thì 🤑), 😍 mua đất, 😎 đổ đôi, 😈 mua lại, 🤩 xây landmark, 😱 đi tù, 😵 phá sản… cả bàn đều thấy.',
  ] },
  { id: '20261112-5', date: '12/11/2026', game: 'cotuong', title: '🔉 Tiếng quân cờ êm hơn', items: [
    '🔉 Tiếng đặt quân, ăn quân và chiếu tướng giờ trầm và êm hơn, không còn chói tai (cả 7 kiểu bàn).',
  ] },
  { id: '20261112-4', date: '12/11/2026', game: 'cotuong', title: '💡 Gợi ý cho Cờ thế', items: [
    '💡 Bí quá thì bấm "Gợi ý": lần 1 sáng quân nên đi, lần 2 sáng luôn ô cần tới.',
    '🔤 Sửa dòng lượt đi bị cắt chữ trên điện thoại màn nhỏ.',
  ] },
  { id: '20261112-3', date: '12/11/2026', game: 'all', title: '📸 Khoe kết quả + 📅 Cờ thế hôm nay', items: [
    '📸 Thắng ván hay có thành tích mới sẽ hiện nút "Khoe": web vẽ sẵn một tấm ảnh đẹp có tên, cấp độ và link để gửi Zalo, Facebook rủ hội bạn vào chơi.',
    '📅 Cờ tướng có "Cờ thế hôm nay": mỗi ngày một bài chiếu bí mới, giải liên tục để giữ chuỗi ngày 🔥. Trang chủ cũng có ô Thử thách hôm nay.',
  ] },
  { id: '20261112-2', date: '12/11/2026', game: 'all', title: 'Hồ sơ đi theo tài khoản', items: [
    '☁️ Đã đăng nhập thì số ván, cấp độ, thành tích và hình đại diện được lưu theo tài khoản – đổi điện thoại hay mở máy khác, đăng nhập là thấy lại.',
    '🧳 Những ván bạn chơi lúc chưa đăng nhập trên máy này sẽ được cộng vào tài khoản ở lần đăng nhập đầu.',
    '👤 Chơi không đăng nhập vẫn như cũ: hồ sơ nằm trên máy bạn.',
  ] },
  { id: '20261112-1', date: '12/11/2026', game: 'all', title: 'Màn "Học chơi nhanh" + trang luật cho mọi game', items: [
    '🎓 Lần đầu vào một game sẽ có màn học chơi nhanh: vài bước có hình, chưa tới 1 phút, vuốt để chuyển bước. Mở lại bằng nút "🎓 Học chơi nhanh" cạnh nút Hướng dẫn.',
    '📖 Mỗi game có thêm trang luật chơi riêng (đuôi /huong-dan/) để đọc hoặc gửi cho bạn mới.',
    'ℹ️ Thêm trang Giới thiệu & liên hệ ở chân trang chủ.',
  ] },
  { id: '20261111-14', date: '11/11/2026', game: 'thathaythach', title: 'Thật hay Thách: chỉnh lại giao diện', items: [
    '🎨 Hình đầu trang không còn đè lên tên game; chữ cái trong vòng tròn người chơi nằm đúng giữa.',
    '👥 Vòng sáng quanh người tới lượt không bị cắt mất phần trên; các ô "Độ lầy" đều nhau.',
  ] },
  { id: '20261111-13', date: '11/11/2026', game: 'tienlen', title: 'Tiến Lên: gợi ý xoay ngang', items: [
    '📱 Vào bàn bằng điện thoại cầm dọc sẽ có lời nhắc nhỏ: xoay ngang máy thì bàn rộng, 13 lá xếp thoáng hơn.',
    '🤖 Máy Android có thêm nút "Xoay ngang" (toàn màn hình). iPhone thì bật xoay màn hình rồi nghiêng máy.',
  ] },
  { id: '20261111-12', date: '11/11/2026', game: 'catte', title: 'Cát tê: tự xếp bài theo ý mình', items: [
    '✋ Giữ một lá rồi kéo sang trái/phải để xếp bài theo ý bạn (giống bên Tiến Lên).',
    '🔃 Bấm nút "Tự xếp · bấm để xếp lại" để trả về thứ tự tự động; sang ván mới bài tự xếp lại.',
  ] },
  { id: '20261111-11', date: '11/11/2026', game: 'masoi', title: 'Ma Sói: gợi ý bộ vai + kiểu chơi "Quản trò"', items: [
    '💡 Phòng chờ gợi ý sẵn 3 bộ vai theo số người: 🌱 Dễ chơi, ⚖️ Cân bằng, 🎭 Hỗn loạn – bấm là xong.',
    '🎩 Kiểu chơi "Quản trò" (theo góp ý của các bạn), bật một chạm hoặc chọn từng luật:',
    '🏹 Thợ Săn ghim mù: mỗi đêm ghim trước một người, chỉ kéo theo khi chết ngay trong đêm đó.',
    '⏱️ Đêm kín giờ + 🤫 chết kín: lượt nào cũng chạy đủ giờ, sáng ra chỉ báo ai chết chứ không lộ nguyên nhân.',
    '🐺 Sói hoà phiếu thì không ai bị cắn · 🌫️ Phù Thủy dùng bình cứu rồi thì không còn biết ai bị cắn · 🎲 hết giờ máy chọn giúp.',
    'Kiểu "Vui vẻ" như cũ vẫn là mặc định.',
  ] },
  { id: '20261111-10', date: '11/11/2026', game: 'thathaythach', title: 'Game mới: Thật hay Thách!', items: [
    '🎯 Truth or Dare tiếng Việt theo góp ý của các bạn: tới lượt thì chọn 💬 Thật hoặc 🔥 Thách, làm xong bấm Xong.',
    '📚 14 chủ đề (Bạn bè, Hội thân, Kỷ niệm, Hài hước, Học đường, Công sở, Tình cảm, Gia đình, Tâm sự, Mạng xã hội, Game thủ, Tài lẻ, Ăn uống, Du lịch & Ước mơ) với gần 270 câu, 3 độ lầy 🌱😄🔥.',
    '✍️ Chủ phòng thêm được câu tự viết của nhóm; có đổi câu, bỏ qua, tổng kết danh hiệu cuối buổi.',
    '📱 Chơi online theo mã phòng hoặc chuyền tay một máy.',
  ] },
  { id: '20261111-9', date: '11/11/2026', game: 'cotuong', title: 'Game mới: Cờ tướng!', items: [
    '♟️ Đấu với bạn qua mã phòng, 2 người chung một máy, hoặc đấu máy.',
    '🤖 Máy có 4 mức: Dễ, Vừa, Khó và 👑 Đại sư (động cơ Fairy-Stockfish, tải thêm khi bạn chọn).',
    '🧩 Cờ thế: 13 bài chiếu bí trong 1–3 nước để luyện tay.',
    '🎨 7 giao diện bàn cờ (Gỗ sáng, Gỗ mun, Ngọc bích, Giấy dó, Cờ đá, Hoa đào, Đêm trăng) và 3 kiểu mặt quân: chữ Hán (7 kiểu chữ: Tống, Khải, Bút lông…), chữ Việt, hình vẽ.',
    '🔊 Tiếng quân cờ theo chất liệu của từng giao diện: gỗ "cạch", ngọc "keng", đá "tách", giấy "bộp"…',
    '✨ Gợi ý nước đi hợp lệ, biên bản ván cờ, xin đi lại, cầu hoà.',
  ] },
  { id: '20261111-8', date: '11/11/2026', game: 'all', title: 'Chơi công bằng', items: [
    '⚖️ Trang mới "Chơi công bằng" (cuối trang chủ): bài xáo ngẫu nhiên thế nào, bot biết những gì, kèm số liệu hàng nghìn ván thử.',
    '🤖 Đã soát lại toàn bộ bot của 13 game: bot không nhìn bài người khác, không nhắm riêng vào người thật.',
    '🎴 UNÔ: bot bớt "soi" hơn – quên hô UNO thì chỉ khoảng một nửa số lần bị bot bắt, và bạn có thêm vài giây để kịp bấm.',
  ] },
  { id: '20261111-7', date: '11/11/2026', game: 'all', title: 'Hồ sơ, cấp độ và thành tích', items: [
    '🏅 Mỗi người chơi có hồ sơ riêng: số ván đã chơi, số ván thắng, tỉ lệ thắng, chuỗi thắng dài nhất – tính cho cả 15 game.',
    '⭐ Chơi là lên cấp: từ Tân binh tới Truyền kỳ (mỗi ván +10 điểm, thắng +20 điểm nữa).',
    '🎖️ 16 thành tích để săn: Cao thủ, Cú đêm, Không thể cản, Sưu tầm gia… Mở khoá là có thông báo ngay trong ván.',
    '🦊 Chọn hình đại diện và màu nền cho mình. Mở hồ sơ bằng hình tròn cạnh nút ⚙️ ở trang chủ, hoặc dòng "Hồ sơ & thành tích" trong từng game.',
    '💾 Hồ sơ lưu trên máy bạn đang dùng (chưa đồng bộ giữa các máy).',
  ] },
  { id: '20261111-6', date: '11/11/2026', game: 'all', title: 'Mời bạn bằng mã QR + chuyển trang mượt', items: [
    '📨 Trong phòng chờ có nút "Mời bạn (mã QR)": bạn bè ngồi cạnh chỉ cần giơ camera quét là vào phòng. Trên điện thoại có luôn nút Chia sẻ qua Zalo, Messenger…',
    '✨ Chuyển giữa các trang mượt hơn, tải lâu thì có màn hình chờ với bé xúc xắc nhún nhảy.',
    '🙂 Nút "GumballZ" về trang chủ giờ giống nhau ở mọi game.',
    '📳 Bấm nút có rung nhẹ (điện thoại) và tiếng "tách" nhỏ ở trang chủ – tắt được trong ⚙️ Cài đặt.',
  ] },
  { id: '20261111-5', date: '11/11/2026', game: 'all', title: 'GumballZ khoác áo mới', items: [
    '🙂 Logo mới: bé xúc xắc biết cười – có luôn trên tab trình duyệt và khi "Thêm vào màn hình chính" (mở lên như một app thật).',
    '🏠 Trang chủ làm lại: game nổi bật ở đầu trang, mục 🔥 Đang hot theo số người đang chơi thật, lọc theo loại game (Tiệc tùng / Bàn cờ / Game bài).',
    '🟢 Mỗi ô game hiện số người đang chơi game đó ngay lúc này.',
    '💬 Các hộp hỏi – đáp (đổi tên, đổi mật khẩu, báo cáo…) dùng giao diện riêng của GumballZ thay cho hộp xám của trình duyệt.',
  ] },
  { id: '20261111-4', date: '11/11/2026', game: 'all', title: 'Icon game mới toanh', items: [
    '🎨 Vẽ lại hình minh hoạ cho 13 game ở trang chủ: mèo ôm bom, sói làng, cờ trận Ngụy–Thục–Ngô, phố Sài Gòn…',
    '🖼️ Ảnh xem trước khi share link từng game cũng đổi theo hình mới.',
  ] },
  { id: '20261111-3', date: '11/11/2026', game: 'all', title: 'Báo khi máy chủ quá đông', items: [
    '🎮 Cạnh số người online giờ có thêm số người đang chơi và số phòng, cập nhật tức thì.',
    '⚠️ Ngày nào GumballZ đông quá làm máy chủ chính sắp/đã hết lượt miễn phí, web sẽ hiện thông báo – lúc đó vào phòng có thể chậm hơn, máy chủ mở lại lúc 7h sáng.',
  ] },
  { id: '20261111-2', date: '11/11/2026', game: 'all', title: 'Vào xem phòng đang chơi', items: [
    '👀 Phòng đang chơi giờ vẫn vào được: bạn xem ván đang diễn ra, ván sau tự được vào chơi (12 game online).',
    '🃏 Xì dách, Ba Cào, Poker (chơi vui): người đang xem được ngồi vào bàn ngay ván kế, chủ phòng không cần về sảnh.',
    '🗺️ Bỏ dòng chữ nhỏ trên bàn cờ Tỷ Phú và Cá Ngựa cho bàn gọn hơn.',
  ] },
  { id: '20261111-1', date: '11/11/2026', game: 'all', title: 'Nút Cài đặt + công cụ quản trị', items: [
    '⚙️ Nút Cài đặt ngay góc trên trang chủ: đổi tên, tắt/bật nhạc mọi game, tự công khai phòng, ẩn số online, xoá dữ liệu trên máy.',
    '🛡️ Quản trị viên có trang Quản trị riêng (báo cáo chat, góp ý, cấm/bỏ cấm, tài khoản) và nút xử lý nhanh ngay trong chat Sảnh.',
  ] },
  { id: '20261110-15', date: '10/11/2026', game: 'all', title: 'Số người online + tên game thẳng hàng', items: [
    '🟢 Trang chủ, Sảnh chung và màn hình đầu mỗi game hiện số người đang online trên GumballZ.',
    '📐 Tên game trên trang chủ giờ thẳng hàng, cùng cỡ chữ; mô tả gọn tối đa 3 dòng.',
  ] },
  { id: '20261110-14', date: '10/11/2026', game: 'all', title: 'Sảnh chung, tài khoản, chat', items: [
    '🌐 Sảnh chung: xem phòng công khai của mọi game, bấm là vào chơi cùng người lạ. Mỗi game cũng có nút "Phòng công khai & chat" ở màn hình đầu.',
    '🔓 Chủ phòng bật "🌐 Công khai phòng" ngay dưới mã phòng để phòng hiện ở Sảnh. Không bật thì chỉ ai có mã/link mới vào được như cũ.',
    '💬 Chat ở Sảnh: kênh Chung + kênh riêng từng game. Từ bậy tự bị che, bấm 🚩 để báo cáo, tin bị nhiều người báo tự ẩn.',
    '👤 Tài khoản (không bắt buộc): tạo bằng tên đăng nhập + mật khẩu, giữ tên và có dấu ✓ khi chat. Khách vẫn chơi ngay như cũ.',
  ] },
  { id: '20261110-13', date: '10/11/2026', game: 'meono', title: 'Lá "ĐÉO!" đổi tên thành "HUỶ KÈO!"', items: [
    '🙅 Lá chặn đổi tên thành HUỶ KÈO! cho thân thiện hơn – công dụng y như cũ (huỷ 1 hành động, chồng được). Con dấu, nút bấm, hướng dẫn, danh hiệu cuối ván đổi theo.',
  ] },
  { id: '20261110-12', date: '10/11/2026', game: 'all', title: 'Đổi tên + ảnh xem trước khi share', items: [
    '🤠 BANG! đổi tên thành CÀ ĐÙNG!, 🃏 UNO đổi thành UNÔ (luật và nội dung giữ nguyên).',
    '🔤 CÀ ĐÙNG!: logo, lưng bài và mặt bàn đổi sang phông có đủ dấu tiếng Việt (chữ Đ không còn bị lệch phông). Chơi với bot không cần nhập tên nữa.',
    '🖼️ Share link game hay link mời vào phòng lên Facebook/Zalo giờ hiện ảnh xem trước riêng của từng game.',
  ] },
  { id: '20261110-11', date: '10/11/2026', game: 'all', title: 'Trang Credits', items: [
    '📜 Trang Credits mới: nguồn mọi tranh, bộ bài, phông chữ, thư viện và lời cảm ơn. Có nút ở trang chủ.',
    '📱 Trang chủ gọn hơn trên điện thoại: 4 nút Có gì mới / Góp ý / Ủng hộ / Credits xếp 2×2.',
  ] },
  { id: '20261110-10', date: '10/11/2026', game: 'all', title: 'Máy chủ phòng chơi mới', items: [
    '⚡ Phòng online chạy qua máy chủ riêng của GumballZ trên Cloudflare: vào phòng nhanh hơn, chịu được nhiều người hơn. Firebase/PeerJS vẫn giữ làm dự phòng.',
  ] },
  { id: '20261110-09', date: '10/11/2026', game: 'all', title: 'Góp ý & Ủng hộ', items: [
    '💌 Nút Góp ý / Báo lỗi ở trang chủ và chân trang mỗi game – gửi thẳng cho chủ web.',
    '☕ Nút Ủng hộ: mời chủ web ly cà phê qua mã QR (tự nguyện, không đổi được gì trong game).',
  ] },
  { id: '20261110-08', date: '10/11/2026', game: 'all', title: 'Nút về trang chủ + sửa lặt vặt', items: [
    '🏠 Hộp "Rời ván?" ở mọi game có thêm nút Về trang chủ GumballZ (Bang!: trong ⚙️).',
    '🎴 Tam Quốc Sát: màn bốc thẻ thân phận – chữ trên thẻ tre không còn bị vỡ dấu/cắt chữ, nền che kín, chữ "Bạn là …" dễ đọc.',
    '🖌️ Tam Quốc Sát: Hoàng Nguyệt Anh có chân dung nét mực mới (thay con dấu).',
    '🤖 Tên bot có chữ cái đầu khác nhau (Kẹo, Xôi, Gấu Bông, Đậu, Nấm, Sữa…) để avatar không trùng.',
  ] },
  { id: '20261110-07', date: '10/11/2026', game: 'all', title: 'Đổi tên bot', items: [
    '🤖 Bot ở mọi game giờ có tên cute: Kẹo, Xôi, Gấu Bông, Đậu, Nấm, Sữa, Mochi, Pudding… (chữ cái đầu khác nhau cho dễ nhìn) – ví dụ trong hướng dẫn cũng đổi theo.',
  ] },
  { id: '20261110-06', date: '10/11/2026', game: 'solitaire', title: 'Theme mới: ✂️ Cắt dán', items: [
    '✂️ Bộ bài collage giấy cắt GumballZ tự vẽ: mỗi lá là một bức cắt dán sticker, tem, băng keo khác nhau; J Q K là cáo, thỏ, gấu hoàng gia (chất đen tông tối).',
    '🟫 Bàn thảm nâu + lưng bài giấy kraft tem GumballZ. Chọn ở nút tên game → Giao diện.',
  ] },
  { id: '20261110-05', date: '10/11/2026', game: 'all', title: 'Bản đồ 3D: chuột trái kéo, chuột phải xoay', items: [
    '🖱️ Cờ Tỷ Phú, Cờ cá ngựa, Đua Lạc Đà: giữ chuột trái kéo để di bản đồ, giữ chuột phải để xoay, lăn chuột để phóng to. Điện thoại vẫn như cũ.',
  ] },
  { id: '20261110-04', date: '10/11/2026', game: 'solitaire', title: 'Bộ bài mèo hồng pastel', items: [
    '🐱 Theme Mèo con giờ có bộ mặt bài riêng GumballZ tự vẽ: chất bài là mèo, Át mỗi chất một bé mèo, J/Q/K là 12 bé mèo đội mũ/vương miện khác nhau.',
  ] },
  { id: '20261110-03', date: '10/11/2026', game: 'solitaire', title: 'Bỏ thông báo khi chuột phải không có lá', items: [
    '🔇 Chuột phải mà không có lá nào lên đích được thì chỉ kêu một tiếng, không hiện thanh thông báo nữa.',
  ] },
  { id: '20261110-02', date: '10/11/2026', game: 'solitaire', title: 'Theme mới, chế độ tối, chuột phải kiểu Windows', items: [
    '🎀 Thêm theme: 🐱 Mèo con (GumballZ tự vẽ), 🐧 Cánh cụt (bộ Penguins của KDE), 👑 Tim hồng (Jolly Royal + Royal Hearts của KDE). Bấm 🎨 để chọn.',
    '🌙 Chế độ tối: tự theo máy, hoặc chọn Sáng/Tối trong ☰ Thêm.',
    '🖱️ Chuột phải / nút ⤴️ Lên đích giờ đưa mọi lá lên được đích (như Solitaire Windows), hoàn tác 1 lần là về.',
  ] },
  { id: '20261110-01', date: '10/11/2026', game: 'solitaire', title: 'Theme Ai Cập, chuột phải, báo giải được', items: [
    '🏺 Theme Ai Cập: bộ bài "Ancient Egyptians" và nền "Desert Sands" gốc của KDE KPatience (tác giả Sean Wilson, giấy phép LGPL/GPL – xem themes/ancientegypt).',
    '🖱️ Chuột trái kéo bài, chuột phải đưa hết lá an toàn lên ô A (như Solitaire Windows). Điện thoại: nút ⤴️ Lên đích hoặc chạm 2 ngón.',
    '🧠 Góc trái dưới tự báo ván còn giải được không (✅ / ❌ / 🤔) sau mỗi nước đi – tắt được trong ☰ Thêm.',
  ] },
  { id: '20261109-06', date: '09/11/2026', game: 'bacao', title: 'Game mới: Ba Cào!', items: [
    '👑 Ba Cào 2–8 người: 3 lá tính nút, ba tây (J/Q/K) và sáp (3 lá cùng số) là bài to. Có nhà cái hoặc chơi gà góp chung.',
    '🤏 Nặn bài: kéo lá úp để hé dần cho hồi hộp, hoặc Lật nhanh. Lật bài chung có trống dồn.',
    '🪙 Chip ảo, hết thì xin mẹ. Có bot, chơi online, hướng dẫn có hình.',
  ] },
  { id: '20261109-05', date: '09/11/2026', game: 'camel', title: 'Sửa lỗi không rời ván được', items: [
    '🔧 Nút "Rời ván" (và các nút trong hộp thoại như "Đua ván mới") bấm được lại bình thường.',
  ] },
  { id: '20261109-04', date: '09/11/2026', game: 'typhu', title: 'Đổi luật mặc định', items: [
    '🏗️ Xây nhà kiểu ZingPlay thật (chỉ xây ở ô vừa dừng).',
    '🔨 Tắt đấu giá: không mua thì ô đó vẫn để trống.',
  ] },
  { id: '20261109-03', date: '09/11/2026', game: 'all', title: 'Đổi luật mặc định', items: [
    '🐴 Cờ cá ngựa: đổ đôi / 1+6 lần thứ 3 liên tiếp thì mất lượt.',
    '♠️ Poker: tăng mù sau mỗi 5 ván.',
    '🃏 Xì dách: nhà cái đủ 16 điểm mới được xét bài; người chơi và nhà cái cùng quắc thì hoà.',
  ] },
  { id: '20261109-02', date: '09/11/2026', game: 'tienlen', title: 'Thêm kiểu tới trắng', items: [
    '⚡ Tới trắng thêm kiểu "cả bài không có lá người" (không có J, Q, K nào). Đủ bộ: sảnh rồng, tứ quý heo, 5 đôi thông, 6 đôi (tứ quý tính 2 đôi), đồng màu 13 lá, không lá người, tứ quý 3 ván đầu.',
  ] },
  { id: '20261109-01', date: '09/11/2026', game: 'typhu', title: 'Thắng khi trọn 1 hàng, vé máy bay, bản đồ tự điều khiển', items: [
    '🏆 Luật thắng mới: sở hữu trọn 1 hàng (mọi ô mua được trên 1 cạnh bàn, không thế chấp) là thắng luôn.',
    '🎫 Du lịch từ Bãi đậu xe phải mua vé máy bay 100K (chỉnh được: miễn phí/50K/100K/200K). Không đủ tiền thì chỉ nghỉ.',
    '🗺️ Chế độ bản đồ không còn tự xoay theo lượt: chuột trái kéo để di bản đồ, chuột phải kéo để xoay (điện thoại: 1 ngón di, 2 ngón xoay/thu phóng).',
  ] },
  { id: '20261105-07', date: '05/11/2026', game: 'tienlen', title: 'Tự xếp bài trên tay', items: [
    '✋ Kéo lá sang trái/phải để tự xếp bài (đang chọn nhiều lá thì kéo cả nhóm). Chạm nhẹ vẫn là chọn lá. Nút 🔃 xếp lại tự động. Tải lại trang vẫn giữ cách xếp.',
  ] },
  { id: '20261105-06', date: '05/11/2026', game: 'cangua', title: 'Chốt luật mặc định', items: [
    '📏 Luật mặc định: mỗi lượt đi 1 ngựa; đổ đôi được đi cả hoặc nửa (3+3 đi 3 hay 6), không đôi thì đi đủ tổng; vào chuồng đếm thẳng từ ngoài, không cần dừng ở cửa; không nhảy qua đầu ngựa; chỉ còn 1 nước thì bắt buộc đi; thắng khi 4 ngựa chiếm bậc 3-4-5-6.',
    '🔄 Phòng/ván lưu từ bản cũ tự chuyển về luật mặc định mới ở ván sau.',
  ] },
  { id: '20261105-05', date: '05/11/2026', game: 'all', title: 'Chọn đối thủ ngay trên bàn', items: [
    '🎯 Mèo Nổ, UNO, BANG!, Tam Quốc Sát, Ma Sói: tới lúc chọn người thì ghế chọn được sáng lên có 🎯, chạm thẳng vào ghế là xong – ghế không chọn được mờ đi kèm lý do (hết bài, ngoài tầm…). Có nút ✕ Huỷ, phím Esc.',
  ] },
  { id: '20261105-04', date: '05/11/2026', game: 'meono', title: 'Sửa con dấu ĐÉO! mất dấu', items: [
    '🔧 Con dấu ĐÉO! giữa bàn hiện đủ dấu tiếng Việt (HUỶ!, CỨU LẠI!), vân mực nhẹ hơn cho dễ đọc.',
  ] },
  { id: '20261105-03', date: '05/11/2026', game: 'all', title: 'Nhạc tự bật, hướng dẫn có hình, bộ bài Tây mới', items: [
    '🎵 Nhạc nền tự bật khi chạm vào game (tắt thì máy nhớ). Mỗi game 2–3 bài hợp chất: sảnh, đang chơi, lúc gay cấn – chuyển mượt, đổi tab không mất nhạc. Thêm tiếng tích tắc hết giờ, thắng/thua.',
    '🖼️ Hướng dẫn mọi game có "⚡ Bắt đầu nhanh" và hình minh hoạ cho từng luật (ảnh chụp thật + lá bài/bàn cờ vẽ sẵn).',
    '🃏 Bộ bài Tây vẽ lại đẹp kiểu cổ điển: J/Q/K hai đầu có khung, Át bích hoa văn, 3 kiểu lưng bài – dùng cho Tiến Lên, Cát tê, Xì dách, Poker, Xếp bài.',
  ] },
  { id: '20261105-02', date: '05/11/2026', game: 'solitaire', title: 'Game mới: Xếp bài (Solitaire)!', items: [
    '🃏 Xếp bài Klondike như Windows ngày xưa: rút 1 hoặc 3, điểm Tiêu chuẩn / Vegas (điểm ảo) / không tính.',
    '↶ Hoàn tác không giới hạn, 💡 gợi ý, chạm đúp lên đích, tự xếp nốt – thắng thì bài nảy tưng bừng.',
    '🧠 "Ván này giải được không?" – máy tự giải thử. Có thống kê, số ván để chơi lại đúng ván.',
  ] },
  { id: '20261105-01', date: '05/11/2026', game: 'all', title: 'Bấm link là vào phòng, gợi ý chỉ khi chơi với bot', items: [
    '🔗 Mở link phòng bạn gửi là vào thẳng sảnh (chưa có tên thì hỏi tên 1 lần). Phòng hết hạn thì báo và quay về trang đầu.',
    '🙈 Có từ 2 người thật trong phòng thì tắt gợi ý / xác suất (Mèo Nổ % bom, Lạc Đà % vé, Poker 💡, Tiến Lên 💡 Gợi ý, Tam Quốc Sát thầy đồ, BANG! 🐣, Cờ tỷ phú tính lời lỗ giao dịch). Chơi với bot vẫn dùng được.',
  ] },
  { id: '20261104-18', date: '04/11/2026', game: 'tienlen', title: 'Tên sảnh mới', items: [
    '🃏 Sảnh ghi rõ số lá (vd. "Sảnh 5 lá 6→10"). Sảnh 3-4-5-6 là "3 năm 6 tháng có là chi 💔", sảnh 6-7-8-9 là "Sống bằng tình cảm 🥹".',
  ] },
  { id: '20261104-17', date: '04/11/2026', game: 'tienlen', title: 'Bàn mới, cấm về heo, tự bỏ lượt', items: [
    '🎨 Bàn nỉ viền gỗ, đèn lồng, ghế đối thủ có quạt bài – 3 màu bàn: Nỉ xanh, Đỏ Tết, Gỗ tối (nút 🎨).',
    '🃏 Lá bài bay ra từ chỗ người đánh vào giữa bàn, chặt thì bay từ ghế người chặt.',
    '🐷 Luật mới (mặc định): cấm về bằng heo, tứ quý, đôi thông. Chỉ còn bài cấm là kẹt, chịu bét.',
    '😶 Không có bài đè được thì tự bỏ lượt. Nút Bỏ lượt dời sang trái, xa nút Đánh.',
  ] },
  { id: '20261104-16', date: '04/11/2026', game: 'typhu', title: 'Sửa máy bay, tự bán trả nợ, báo ô đích', items: [
    '✈️ Hết lỗi vàng cả bàn khi du lịch: chạm 1 ô trên bàn để chọn (chỉ ô đó sáng), chạm lại hoặc bấm "Bay tới…" để bay.',
    '⚡ Thiếu tiền trả nợ: nút "Tự bán nhà/thế chấp cho đủ" – bán ít nhất có thể, đủ là dừng, có tóm tắt đã bán gì.',
    '📍 Đổ xúc xắc xong hiện ngay tên ô sẽ tới và đánh dấu ô đích trên bàn.',
  ] },
  { id: '20261104-15', date: '04/11/2026', game: 'cangua', title: 'Luật vào chuồng mới, đôi đi cả/nửa, hiện điểm đến', items: [
    '🏁 Vào chuồng đếm thẳng: cách cửa 2 ô, đổ 3 vào bậc 1, đổ 8 lên luôn bậc 6. Đã vào chuồng thì phải đổ đôi mới lên thêm 1 bậc.',
    '✂️ Đổ đôi được chọn đi cả hoặc nửa (3-3 đi 3 hay 6 đều được).',
    '🎯 Đổ xong hiện ngay điểm đến của từng nước trên bàn (đỏ là đá được ngựa bạn) – chạm điểm đến là đi.',
  ] },
  { id: '20261104-14', date: '04/11/2026', game: 'all', title: 'Ẩn tỉ lệ gợi ý mặc định', items: [
    '🙈 Mèo Nổ (% bom) và Đua Lạc Đà (% về nhất trên vé) giờ mặc định ẩn tỉ lệ cho đỡ "spoil". Muốn xem thì bật lại: Mèo Nổ bấm nút 🎲, Đua Lạc Đà vào ⚙️ Cài đặt.',
  ] },
  { id: '20261104-13', date: '04/11/2026', game: 'cangua', title: 'Đổ đôi lên chuồng', items: [
    '🎲🎲 Đổ đôi thì 1 ngựa ở cửa đích hoặc trên đích được lên thêm 1 bậc, bất kể số – vẫn được đổ tiếp. Tắt được trong sảnh.',
  ] },
  { id: '20261104-12', date: '04/11/2026', game: 'camel', title: 'Game mới: Đua Lạc Đà 3D!', items: [
    '🐪 Lạc đà 3D chồng lên nhau, con dưới đi là cõng cả chồng. Mỗi lượt: lấy vé chặng, đặt thảm ốc đảo/ảo ảnh, lắc kim tự tháp, hoặc cược kín con về nhất/bét.',
    '🤪 Lạc đà xỉn đen/trắng chạy ngược phá đám (tắt được). Vé hiện % về nhất chặng cho dễ chơi.',
    '🪙 Chơi bằng xu ảo, ai giàu nhất thắng. Có bot, chơi online, thả emoji.',
  ] },
  { id: '20261104-11', date: '04/11/2026', game: 'typhu', title: 'Đất thế chấp thành đất trống', items: [
    '🏦 Đất đang thế chấp giờ coi như ô trống: ai dừng ở đó cũng mua được với giá gốc, chủ cũ mất đất. Muốn giữ thì nhớ chuộc sớm!',
    '↩️ Bỏ luật cũ "mua lại đất thế chấp giá gấp đôi".',
  ] },
  { id: '20261104-10', date: '04/11/2026', game: 'cangua', title: 'Game mới: Cờ cá ngựa 3D!', items: [
    '🐴 Cờ cá ngựa 3D 2–4 người: 2 xúc xắc, đổ đôi hoặc 1+6 mới xuất chuồng và được đổ tiếp.',
    '💥 Đứng đúng ô ngựa bạn là đá bay về chuồng. Không nhảy qua đầu, lên đích bậc 3-4-5-6 là thắng.',
    '⚙️ Nhiều luật nhà chỉnh trong sảnh (1 hay 2 xúc xắc, dồn tổng hay tách, kiểu lên đích…), bot 3 mức.',
  ] },
  { id: '20261104-09', date: '04/11/2026', game: 'catte', title: 'Thuật ngữ chuẩn: tùng', items: [
    '📚 Dùng đúng thuật ngữ "tùng": ăn vòng = ăn tùng, chưa có tùng nào là sắp chết ☠️. Hướng dẫn có thêm mục Thuật ngữ (tùng, tranh tùng, úp/thiệp, chưng, xổ, tới, vàng tùng).',
  ] },
  { id: '20261104-08', date: '04/11/2026', game: 'catte', title: 'Game mới: Cát tê!', items: [
    '🂡 Cát tê 2–6 người: 6 lá, 6 vòng – đè cùng chất lớn hơn hoặc úp bỏ. Hết vòng 4 chưa ăn vòng nào là chết ☠️.',
    '🔥 Vòng 5 chưng bài, vòng 6 lật – ai ăn vòng cuối là tới, hốt nồi. Tới trắng: tứ quý, 6 lá đồng chất, 6 lá dưới 6.',
    '🧧 Chip ảo, hết thì xin mẹ. Luật thưởng & kiểu vòng 5 chỉnh trong sảnh.',
  ] },
  { id: '20261104-07', date: '04/11/2026', game: 'tienlen', title: 'Game mới: Tiến Lên miền Nam!', items: [
    '🐷 Tiến Lên miền Nam 2–4 người: lẻ, đôi, sám, sảnh, đôi thông, tứ quý – chặt heo, chặt chồng, tới trắng, thối heo, cóng.',
    '💡 Chạm 1 lá là gợi ý bộ đánh được, có nút Gợi ý và nút 🔪 Chặt! sáng lên khi chặt được.',
    '🤖 Bot 3 cấp: Gà mờ / Vừa / Cao thủ. Chip ảo, hết thì xin mẹ.',
  ] },
  { id: '20261104-06', date: '04/11/2026', game: 'poker', title: 'Game mới: Poker!', items: [
    '♠️ Texas Hold\'em không giới hạn 2–9 người: mù, tố đúng luật, tất tay, pot phụ, chia pot khi hoà.',
    '💡 Gợi ý cho người mới: hiện tên bài đang có và tô 5 lá tạo bài. Lật bài đọc tên tiếng Việt (Cù lũ, Thùng, Sảnh…).',
    '🤖 Bot biết đoán bài và thỉnh thoảng bịp. Chế độ Chơi vui (xin mẹ thêm chip) hoặc Giải đấu (hết chip là loại).',
  ] },
  { id: '20261104-05', date: '04/11/2026', game: 'xidach', title: 'Game mới: Xì dách!', items: [
    '🃏 Xì dách kiểu Việt 2–8 người: đặt chip, rút/dằn, xì bàn, xì dách, ngũ linh, quắc – nhà cái tự chọn xét bài từng người.',
    '👑 Cái xoay vòng, cố định, bot làm cái hoặc ai xì dách thì làm cái. Hệ số, điểm dằn, lá A chỉnh được trong sảnh.',
    '🥺 Hết chip thì "Xin mẹ thêm chip". Chỉ chơi vui bằng chip ảo.',
  ] },
  { id: '20261104-04', date: '04/11/2026', game: 'bang', title: 'Né một chạm, xem lại lượt, mẹo người mới, thả emoji', items: [
    '🛡️ Bị bắn mà có Missed! (hoặc BANG! khi bị Indians/Duel): hiện sẵn nút xanh "Dùng Missed!" – bấm một phát là né, hoặc "Chịu đòn".',
    '⏪ Nút "Lượt vừa rồi": tóm tắt ai bắn ai, né hay trúng, ai Panic! ai… kèm bảng "Ai tấn công ai" cả ván để đoán vai.',
    '🎨 Mỗi người một màu, nhật ký và dòng tin giữa bàn tô tên theo màu cho dễ theo dõi.',
    '🐣 Chế độ Người mới: mẹo theo vai và tình huống ngay trên bàn, hỏi lại nếu Phó định bắn sếp. Tắt được ở phòng chờ hoặc ⚙️.',
    '😂 Thả emoji, chọc nhau ("Né đi cưng!", "Uống Beer đi"…), bot cũng biết chọc lại.',
    '🤖 Bot khôn hơn: nhớ ai đã bắn ai, Phó không bắn sếp, tỉ lệ thắng các phe cân hơn.',
  ] },
  { id: '20261104-03', date: '04/11/2026', game: 'tamquoc', title: 'Lá nhỏ hiện đủ hình', items: [
    '🖼️ Lá bài nhỏ trong bảng xem người chơi (trang bị & phán định) giờ hiện đủ hình, không còn bị tên dài che mất.',
  ] },
  { id: '20261104-02', date: '04/11/2026', game: 'all', title: 'Nút chính là vào phòng online', items: [
    '🌐 Màn hình đầu của UNO, Cờ tỷ phú, Mèo Nổ, Tam Quốc Sát, Ma Sói: "Tạo phòng online" và ô nhập mã phòng lên đầu, "Chơi với bot" xuống dưới.',
  ] },
  { id: '20261104-01', date: '04/11/2026', game: 'typhu', title: 'Giữ để đổ xúc xắc, lăn giữa màn hình, hết giật pháo hoa', items: [
    '🎲 Nút đổ xúc xắc to ở giữa màn hình: giữ để lấy đà (vòng lực chạy), thả ra là đổ – kiểu ZingPlay. Bấm nhanh cũng được.',
    '🎯 Xúc xắc lăn ngay giữa màn hình, hiện tổng điểm, đổ đôi có chữ ĐÔI!',
    '🎆 Pháo hoa / hoa giấy không còn làm tụt FPS (dùng lại đèn, ít mảnh hơn trên điện thoại).',
  ] },
  { id: '20261103-17', date: '03/11/2026', game: 'typhu', title: 'Bãi đậu xe = Du lịch, chữ ô góc gọn gàng', items: [
    '✈️ Dừng ở Bãi đậu xe được chọn 1 ô bất kỳ (trừ Vào tù) để bay tới ngay – bấm ô sáng trên bàn hoặc nút 🗺️ Chọn ô. Bay ngược qua Bắt đầu vẫn nhận 200K. Tắt được trong sảnh.',
    '🚔 Sửa chữ ô Nhà tù, Vào tù, Bắt đầu bị cắt/tràn ra ngoài.',
  ] },
  { id: '20261103-16', date: '03/11/2026', game: 'typhu', title: 'Mua lại đất đang thế chấp', items: [
    '💥 Dừng ở đường của người khác đang thế chấp vẫn được mua lại (giá gấp đôi). Ngân hàng trừ khoản chuộc, chủ cũ nhận phần còn lại, mình nhận đất sạch nợ.',
  ] },
  { id: '20261103-15', date: '03/11/2026', game: 'uno', title: 'Lá Up phạt theo độ dài chuỗi', items: [
    '⬆️ Gãy chuỗi Up giờ phải rút đúng số lá số đã được đánh từ lúc lá Up ra (ít nhất 1) – chuỗi càng dài càng đau.',
  ] },
  { id: '20261103-14', date: '03/11/2026', game: 'uno', title: 'Bão Tố đúng màu & nhạc không tắt', items: [
    '🌀 Hình xoáy trên lá Bão Tố giờ cùng màu lá bài.',
    '🎵 Chuyển tab/ra màn hình chính rồi quay lại, nhạc nền tự bật lại.',
  ] },
  { id: '20261103-13', date: '03/11/2026', game: 'uno', title: 'Chuỗi cộng dồn & bốc thử', items: [
    '➕ Chuỗi cộng dồn giữ nguyên mũi tên "ai dồn cho ai" trên màn hình tới khi có người chịu phạt.',
    '🎲 Bị dồn mà không có lá chồng: bốc thử 1 lá – trúng lá cộng, Khiên hoặc No U là đánh chồng tiếp ngay (+? không tính).',
  ] },
  { id: '20261103-12', date: '03/11/2026', game: 'typhu', title: 'Chỉ dẫn, ZingPlay thật, giao dịch thông minh', items: [
    '🧭 Lần đầu vào ván có chỉ dẫn từng bước (xem lại trong ⚙️).',
    '🏗️ Luật mới "ZingPlay thật": đứng lên đất mình là hỏi luôn "Xây mấy nhà?".',
    '🤝 Giao dịch hiện tổng giá trị mỗi bên và cảnh báo kèo giúp đối thủ gom bộ hay sắp thắng.',
    '📣 Thẻ tóm tắt lượt vừa rồi của người khác, bấm để xem chi tiết.',
    '😂 Thả emoji, chọc nhau ("Trả tiền thuê đi!", "Vô tù chơi"…), bot cũng biết chọc lại.',
    '📱 Xoay ngang điện thoại gọn hơn; sửa lỗi chọn kiểu xây nhà trong sảnh không ăn.',
  ] },
  { id: '20261103-11', date: '03/11/2026', game: 'scribble', title: 'Thả emoji, gõ câu chọc tự do', items: [
    '😂 Thả emoji / chọc nhau ngay trong ván: câu dựng sẵn hoặc gõ tự do (≤ 40 ký tự), câu nào lộ đáp án thì tự chặn.',
  ] },
  { id: '20261103-10', date: '03/11/2026', game: 'meono', title: 'Thả emoji, chọc nhau', items: [
    '😂 Thả emoji và chọc nhau kiểu mèo ngay trong ván ("Bốc đi bé!", "ĐÉO nhé!", "Bom đâu rồi?"…), bot thỉnh thoảng cũng chọc lại.',
  ] },
  { id: '20261103-9', date: '03/11/2026', game: 'masoi', title: 'Thả emoji, chọc nhau', items: [
    '😂 Thả emoji / chọc nhau ("Sói là mày!", "Oan quá trời"…) lúc trời sáng – ban đêm nút ẩn cho khỏi lộ ai đang thức, hồn ma thì chỉ hồn ma thấy.',
  ] },
  { id: '20261103-8', date: '03/11/2026', game: 'uno', title: 'Thấy rõ ai chơi ai, thả emoji, tính điểm', items: [
    '🎯 Móc túi, tặng quà, nhắm +4, No U dội ngược… có mũi tên bay từ người làm tới người bị, kèm dòng chữ ngắn.',
    '😂 Nút thả emoji và câu chọc ("Ăn +4 đi cưng", "Cứu tui"…), cả bàn đều thấy; bot cũng biết chọc lại.',
    '🏆 Tuỳ chọn "Tính điểm tới 200/300/500": chơi nhiều ván, bảng điểm sau mỗi ván, ai cán mốc trước là vô địch.',
    '💡 Lần đầu gặp lá mở rộng hiện gợi ý "Lá này làm gì?"; bấm giữ lá bất kỳ để xem mô tả.',
    '📱 Điện thoại: chữ trên lá to hơn, bài to hơn trên máy màn cao, giữa bàn hiện dòng "vừa xảy ra".',
  ] },
  { id: '20261103-7', date: '03/11/2026', game: 'masoi', title: 'Xem lại cả ván, ván tập & vai mới', items: [
    '🎞️ Xem lại cả ván: hết ván lộ hết vai, xem từng đêm/ngày ai cắn ai, ai soi ai, ai bầu ai; chủ phòng chiếu cho cả hội cùng xem.',
    '🎓 Ván tập cho người mới: chơi với 5 bot, máy giải thích từng bước bằng bong bóng; đồng hồ dừng lúc đọc.',
    '⏩ Chủ phòng có nút Bầu sớm; bot tự bấm Sẵn sàng sau vài giây, ván với bot nhanh hơn hẳn.',
    '3 vai vui mới: 🃏 Kẻ Trộm (đêm 1 tráo vai với 1 trong 2 lá thừa), 🕯️ Bà Đồng (gọi hồn người chết hỏi phe), 👓 Ông Già Lẩm Cẩm (tưởng mình là Tiên Tri, soi toàn bốc đại).',
    '💾 Lưu bộ vai + luật của hội (vd. "Bộ hội GET A JOB"), lần sau chạm 1 cái là chọn lại.',
    'Sửa: biểu tượng chỉ điểm hiện được trên máy cũ; tên ở sảnh không còn bị cắt mất 👑.',
  ] },
  { id: '20261103-6', date: '03/11/2026', game: 'meono', title: 'Lá nào cũng có mèo 🐱', items: [
    'Vẽ lại cả 15 lá: mỗi lá là 1 chú mèo làm đúng việc của lá (ôm bom, cắt dây, chỉ tay đổ vỏ, đeo kính đen né gắt, bói cầu, vẫy đũa…).',
    'ĐÉO! đóng dấu mộc to giữa bàn kèm tiếng "cộp" và mèo rít; ĐÉO! chồng ĐÉO! thì dấu chồng lên nhau (đỏ = bị huỷ, xanh = được cứu lại).',
    'Bốc trúng Mèo Nổ: mèo trên lá mang màu của người bốc – còn Gỡ Bom thì hú hồn, hết Gỡ Bom thì khóc.',
    'Cuối ván có huy hiệu vui (👑 Vua ĐÉO, 💣 Nam châm hút bom, 🎒 Chuyên gia gánh vỏ…) và bảng số liệu từng người.',
    'Chủ phòng bật được bộ bài 🌀 Hỗn loạn: gấp đôi Đổ Vỏ và Móc Đáy, nhiều ĐÉO! và Xào Bài hơn, thêm 1 Gỡ Bom.',
  ] },
  { id: '20261103-5', date: '03/11/2026', game: 'scribble', title: 'Chiếu album tự động & tải cả album', items: [
    '⏯️ Album tự lật sau 3/5/8 giây (hoặc tắt); chủ phòng Tạm dừng / Chạy tiếp, cả phòng thấy cùng lúc.',
    '⬇️ "Tải cả album": gộp mọi chuỗi thành 1 GIF có tên người + câu/đoán, hoặc quay video MP4/WebM, có thanh tiến trình.',
    '🎉 Đông vui chia nhóm (~6 người/nhóm), chiếu lần lượt "Nhóm 2/5", chủ phòng bỏ qua nhóm được.',
    '🎞️ Hoạt hình / Phông nền chọn được 4–16 khung, Một mình 3–12 khung, chỉnh tốc độ phim mặc định trong sảnh.',
    '🛠️ Nút bấm hết rung khi rê chuột, bấm "Xong" không còn hụt.',
  ] },
  { id: '20261103-4', date: '03/11/2026', game: 'all', title: 'Rà soát toàn bộ 7 game', items: [
    'UNO: sửa lỗi ô "Lá mở rộng" không bật được – giờ Luật rừng có sẵn No U, Khiên, +?, Tặng quà, Móc túi, Đổi tay, Bão tố, Up…',
    'UNO: đồng hồ chống treo máy (40 giây mỗi lượt, 20 giây khi bốc phạt), gợi ý đúng khi người khác đang chọn mục tiêu.',
    'BANG!: gọn hơn trên điện thoại nhỏ và khi xoay ngang, thông báo không che bài lúc cần né.',
    'Cờ Tỷ Phú: sửa lỗi bán nhà có thể làm đứng ván; nút "🏠 Xây nhà" và "Xây tại đây" dễ thấy; nhà của người khác không còn chặn thế chấp/giao dịch đất của mình.',
    'Ma Sói: chơi được khi xoay ngang, mặt sau lá vai ghi "VAI BÍ MẬT", thông báo không chồng nhau.',
    'Tam Quốc Sát: chữ trên lá bài trên điện thoại to hơn, tên gọn dễ đọc, màn ngang chơi được.',
    'Mèo Nổ: thiết kế lại mặt lá (mỗi loại 1 màu + chữ tắt góc trái), bấm giữ xem chi tiết, thêm tên gốc tiếng Anh.',
    'Scribble it!: thêm 12 kiểu chơi kiểu Gartic Phone – Tốc chiến, Nhìn trộm, Bánh mì kẹp, Vẽ mù, Vẽ tiếp, Phá băng, Hoạt hình, Phông nền, Một mình, Chấm điểm, Đông vui, Tuỳ chỉnh.',
    'Trang chủ: chữ không còn đè lên hình.',
  ] },
  { id: '20261103-3', date: '03/11/2026', game: 'tamquoc', title: 'Tranh đúng người, đúng lá', items: [
    'Trương Phi: tranh Kuniyoshi cảnh cầu Trường Bản; Ngụy Diên: tranh kinh kịch cuối Thanh – đồ lại nét mực trắng đen cho đồng bộ.',
    'Lá Đào là quả đào (Mẫn Trinh, 1788); lá Hỏa Sát là trận Xích Bích. Nguồn: The Met, Cleveland Museum of Art (CC0).',
  ] },
  { id: '20261103-2', date: '03/11/2026', game: 'tamquoc', title: 'Bản cổ trang + mở rộng Quân Tranh', items: [
    'Thêm lá Rượu 🍶 (Sát kế tiếp +1 sát thương, tự cứu khi hấp hối).',
    'Bản mở rộng Quân Tranh (bật trong sảnh): Hỏa Sát, Lôi Sát, Hỏa công, Thiết tác liên hoàn, Binh lương, Đằng giáp, Bạch ngân sư tử, Chu tước vũ phiến, Cổ đĩnh đao, ngựa Hoa lưu + 13 võ tướng mới.',
    'Giao diện cổ trang: nền thuỷ mặc, bàn sơn mài, cuộn lụa, ấn son; 60 tranh cổ phạm vi công cộng; binh khí vẽ đúng hình dạng (Thanh Long Đao lưỡi bản to gắn thẳng đầu cán).',
  ] },
  { id: '20261103-1', date: '03/11/2026', game: 'all', title: 'Kết nối ổn định hơn', items: [
    'Rớt mạng thoáng qua là tự vào lại trong ~1 giây; im lặng 8 giây thì tự nối lại; chủ phòng chập mạng thì phòng tự mở lại.',
  ] },
  { id: '20261102-9', date: '02/11/2026', game: 'masoi', title: 'Ra mắt Ma Sói 🐺', items: [
    '12 vai (Sói, Sói Trùm, Sói con, Tiên tri, Bảo vệ, Phù thuỷ, Thợ săn, Cupid, Già làng, Kẻ ngốc, Thằng Chán Đời, Dân làng), máy làm quản trò.',
    'Chat riêng cho Sói, kênh hồn ma cho người chết, giữ tay để xem vai, rung khi tới lượt.',
  ] },
  { id: '20261102-8', date: '02/11/2026', game: 'tamquoc', title: 'Ra mắt Tam Quốc Sát ⚔️', items: [
    '25 võ tướng 4 nước, vai trò ẩn Chúa công/Trung thần/Phản tặc/Nội gián, đủ cẩm nang và trang bị, bot, chơi online.',
  ] },
  { id: '20261102-7', date: '02/11/2026', game: 'meono', title: 'Ra mắt Mèo Nổ 💣', items: [
    'Bốc bài né bom, Gỡ Bom rồi nhét lại cho đứa khác, lá chặn ĐÉO! có 3 giây để hô.',
    'Giao diện quán mèo, nổ kiểu truyện tranh, mèo linh vật, tiếng mèo; sửa lỗi máy khách bị tụt lại khi rớt mạng.',
  ] },
  { id: '20261102-6', date: '02/11/2026', game: 'scribble', title: 'Ra mắt Scribble it! 🎨', items: [
    'Đoán hình (kiểu skribbl) và Tam sao thất bản (kiểu Gartic Phone); kho 552 từ tiếng Việt + chủ đề Tướng Liên Minh (173 tướng).',
    'Giao diện sổ vẽ nguệch ngoạc, tiếng bút chì, nhạc marimba.',
  ] },
  { id: '20261102-5', date: '02/11/2026', game: 'typhu', title: 'Cờ Tỷ Phú 40 ô 3D 🏙️', items: [
    'Bàn 3D 40 ô đường Sài Gòn (gần nhà hội bạn + trung tâm Q1), landmark thành phố, camera bám quân.',
    'Quân cờ là nhân vật tự tạo (có cả sừng 😈 và đồ hầu gái), xúc xắc 3D, thẻ Cơ hội/Khí vận do anh Minto đặt tên.',
    'Luật cổ điển + ZingPlay: đấu giá, giao dịch, thế chấp, mua lại đất, Landmark; thắng bằng 3 nhóm màu hoặc 4 bến xe. Xây nhà không cần đủ bộ màu (mặc định).',
  ] },
  { id: '20261102-4', date: '02/11/2026', game: 'uno', title: 'UNO Luật rừng bá đạo', items: [
    'Lá mới: No U, Khiên, +?, Tặng quà, Móc túi, Đổi tay; +2 và +4 chồng lẫn nhau thoải mái.',
    'Bị phạt thì tự bốc từng lá, mỗi lá cách 1 giây 😈; Cấm lượt đổi tên thành Khoá mõm; 3 chủ đề màu.',
  ] },
  { id: '20261102-3', date: '02/11/2026', game: 'all', title: 'Vào phòng dễ hơn', items: [
    'Kết nối chính qua Firebase (mạng nào cũng qua), dự phòng P2P và MQTT; tải lại trang là tự vào lại ván.',
  ] },
  { id: '20261102-2', date: '02/11/2026', game: 'bang', title: 'BANG! chống treo máy', items: [
    'Đồng hồ lượt, tự chịu đòn khi không có lá né, nhạc đổi theo diễn biến, tên lá giữ tiếng Anh gốc, Beer dùng được khi còn 2 người.',
  ] },
  { id: '20261102-1', date: '02/11/2026', game: 'all', title: 'GumballZ ra đời', items: [
    'Trang chọn game; BANG! chuyển vào /bang/; thêm UNO (Cổ điển, Luật rừng, No Mercy).',
  ] },
  { id: '20261031-1', date: '31/10/2026', game: 'bang', title: 'Ra mắt BANG! Việt hoá 🤠', items: [
    'Chơi BANG! online với bạn bè, tranh minh hoạ phạm vi công cộng, hướng dẫn theo luật chính thức.',
  ] },
];
export const latestId = game => (NOTES.find(n => !game || n.game === game || n.game === 'all') || {}).id || '';
