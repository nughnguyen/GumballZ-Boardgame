# 🎲 GumballZ Boardgame – Board game Việt chơi online


## Nhật ký thay đổi

Xem [CHANGELOG.md](CHANGELOG.md) để theo dõi các cập nhật của dự án.

## Đưa lên Vercel

Web này là web tĩnh, không cần build, đưa lên Vercel được.

1. Push code lên repo của web trên GitHub.
2. Vào Vercel → Add New → Project → Import repo đó.
3. Framework Preset: **Other**. Build Command: để trống. Output Directory: để trống (`.`, thư mục gốc).
4. Deploy. Web sẽ có địa chỉ dạng `gumballz-boardgame.vercel.app`.

Lưu ý: Vercel chỉ host phần web tĩnh. Phòng chơi online vẫn cần 1 máy chủ WebSocket riêng:
- Cách chính: deploy thư mục `server/` lên Cloudflare Workers (miễn phí), rồi trỏ game về đó bằng `?cf=wss://<địa-chỉ-worker-của-bạn>` hoặc sửa `DEFAULT` trong `shared/net/cfrelay.js`.
- Không có server riêng: game tự rơi xuống đường P2P / MQTT dự phòng (`?p2p=1` hoặc `?relay=1`), chơi được nhưng kém ổn định hơn.
- Chơi với máy / cùng máy thì không cần server nào cả.


Chơi ngay: **https://gumballzgames.vercel.app/**

Web tĩnh (GitHub Pages) + PeerJS: một người tạo phòng, bạn bè nhập mã 5 ký tự là vào chơi. Không cần server, không cần cài đặt, có bot thêm/xoá tuỳ ý.

| Game | Đường dẫn | Ghi chú |
|---|---|---|
| **BANG!** | [`/bang/`](https://gumballzgames.vercel.app/bang/) | Bản cơ bản 80 lá, 16 nhân vật, 4 vai trò. 4–7 người. 5 chủ đề, nhạc nền, hiệu ứng, âm thanh riêng từng lá. |
| **Cờ Tỷ Phú** | [`/typhu/`](https://gumballzgames.vercel.app/typhu/) | Luật kiểu ZingPlay, 32 ô đường phố TP.HCM: mua đất, 3 nhà + Landmark, mua lại, Côn Đảo, Lễ hội, sân bay, thẻ Cơ hội, thắng bằng độc quyền hoặc làm cả bàn phá sản. 2–8 người, có luật chơi theo đội. |
| **UNO** | [`/uno/`](https://gumballzgames.vercel.app/uno/) | 3 chế độ: Cổ điển (108 lá), Luật rừng (cộng dồn, Cấm chồng Cấm, không chặn ngang), No Mercy (168 lá, +6/+10, Quay màu, 7–0, ≥25 lá bị loại). 2–10 người. |
| **Tiến Lên Miền Nam** | [`/tienlen/`](https://gumballzgames.vercel.app/tienlen/) | Đếm lá, chặt heo, tới trắng, thối hàng. 2–4 người + bot. |
| **Tam Quốc Sát** | [`/tamquoc/`](https://gumballzgames.vercel.app/tamquoc/) | Bản chuẩn + mở rộng, 2–8 người + bot. |
| **Mèo Nổ** | [`/meono/`](https://gumballzgames.vercel.app/meono/) | Đầy đủ lá mở rộng + chế độ hỗn loạn, **HUỶ KÈO!**. 2–8 người. |
| **Ma Sói** | [`/masoi/`](https://gumballzgames.vercel.app/masoi/) | Nhiều vai trò, chat ngày/sói/ma, bỏ phiếu công khai hoặc bí mật. |
| **Cờ Cá Ngựa** | [`/cangua/`](https://gumballzgames.vercel.app/cangua/) | Bàn 3D truyền thống, 1 hoặc 2 xúc xắc, 2–4 người. |
| **Cờ Tướng** | [`/cotuong/`](https://gumballzgames.vercel.app/cotuong/) | Đấu người hoặc AI nhiều cấp (gồm Đại sư Fairy-Stockfish), 2 người. |
| **Poker Texas Hold'em** | [`/poker/`](https://gumballzgames.vercel.app/poker/) | Bàn tiền mặt hoặc giải đấu, all-in, side pot. |
| **Xì Dách** | [`/xidach/`](https://gumballzgames.vercel.app/xidach/) | Xì dách Việt Nam, cái cố định / xoay vòng / bot làm cái. |
| **Bài Cào 3 Lá** | [`/bacao/`](https://gumballzgames.vercel.app/bacao/) | Nhất ăn tất hoặc nhà cái, nặn bài trực tiếp. |
| **Cát Tê** | [`/catte/`](https://gumballzgames.vercel.app/catte/) | Sắt tê 6 lá, gục tùng / thắng trắng / chưng. |
| **Đua Lạc Đà** | [`/camel/`](https://gumballzgames.vercel.app/camel/) | Bàn 3D xếp chồng lạc đà, đặt cược chặng và chung cuộc. |
| **Vẽ & Đoán** | [`/scribble/`](https://gumballzgames.vercel.app/scribble/) | Đoán hình & Tam sao thất bản, tối đa 30 người chế độ Đông vui. |
| **Thật hay Thách** | [`/thathaythach/`](https://gumballzgames.vercel.app/thathaythach/) | Trò chơi tiệc tùng hỏi/thử thách lành mạnh cho hội bạn. |
| **Xếp Bài (Solitaire)** | [`/solitaire/`](https://gumballzgames.vercel.app/solitaire/) | Klondike 1/3 lá, tính điểm Vegas, gợi ý & bộ giải. |
| **Bắn Tàu** | [`/bantau/`](https://gumballzgames.vercel.app/bantau/) | Bắn tàu 10×10: 5 tàu (17 ô), bắn luân phiên, Bẫy / Radar / Bom hạt nhân bằng xu trong trận. 2 người + bot. |
| **Ô Ăn Quan** | [`/oanquan/`](https://gumballzgames.vercel.app/oanquan/) | Trò dân gian Việt Nam: rải quân quanh bàn 12 ô, ăn dây, cứu dân, ăn Quan (5/10 điểm). Đấu máy 2 mức, 2 người chung máy hoặc chơi online với bạn qua mã phòng. |
| **Cờ Caro** | [`/caro/`](https://gumballzgames.vercel.app/caro/) | Bàn lớn 30×30 (900 ô): xếp 5 quân X/O liên tiếp là thắng — không phải cờ 3×3. Giữ và trượt để xem bàn, zoom, đấu máy 2 mức, 2 người chung máy hoặc chơi online với bạn qua mã phòng. |
| **TicTacToe** | [`/tictactoe/`](https://gumballzgames.vercel.app/tictactoe/) | Bàn 3×3 (9 ô): xếp 3 quân X/O liên tiếp là thắng — KHÁC hẳn Cờ Caro bàn 30×30 thắng 5 quân. Đấu máy minimax (Khó không bao giờ thua), 2 người chung máy hoặc chơi online với bạn qua mã phòng. |
| **Memory** | [`/memory/`](https://gumballzgames.vercel.app/memory/) | Lật thẻ tìm cặp giống nhau: trúng cặp được lật tiếp, trượt thì úp lại rồi đổi lượt. 3 mức khó 12/16/24 lá, chơi đơn tính giờ + số lượt lật, đấu máy nhớ bài, 2 người chung máy hoặc chơi online với bạn qua mã phòng. |
| **Cờ Vây** | [`/covay/`](https://gumballzgames.vercel.app/covay/) | Bàn gỗ 9×9 / 13×13 / 19×19: đặt quân vào giao điểm, bao hết khí thì ăn quân, cấm tự sát và cấm ko, tính điểm kiểu Trung Quốc (đá + đất + komi 7,5 cho Trắng). Đấu máy heuristic 2 mức, 2 người chung máy hoặc chơi online với bạn qua mã phòng. |
| **Cờ Thú** | [`/cothu/`](https://gumballzgames.vercel.app/cothu/) | Bàn rừng 7×9 ô: 8 con vật hạng 1–8, Chuột ăn được Voi, chỉ Chuột vào sông, Hổ/Sư tử nhảy qua sông, bẫy làm địch yếu, vào hang địch thắng ngay. Đấu máy heuristic 2 mức, 2 người chung máy hoặc chơi online với bạn qua mã phòng. |
| **Rắn và Thang** | [`/ranvathang/`](https://gumballzgames.vercel.app/ranvathang/) | Bàn 100 ô đánh số kiểu rắn bò: tung xúc xắc đi tiến, leo 10 thang, trượt 10 rắn, về đúng ô 100 mới thắng, tung 6 được tung tiếp. Chơi online 2 người, đấu máy (chỉ tung xúc xắc công bằng) hoặc 2–4 người chung máy. |
| **Bài Tấn** | [`/baitan/`](https://gumballzgames.vercel.app/baitan/) | Tú lơ khơ tấn – đỡ bằng lá chủ, chéo cánh 2 đấu 2. 2–6 người + bot. |
| **Lô tô** | [`/loto/`](https://gumballzgames.vercel.app/loto/) | Lô tô hội chợ: vé 9 hàng, quản trò rao số, hô KINH! Tới 16 người + bot. |
| **Cờ vua** | [`/covua/`](https://gumballzgames.vercel.app/covua/) | Đủ luật + máy 3 mức, cờ thế, gợi ý, bàn 3D. 1–2 người. |
| **Tá lả** | [`/tala/`](https://gumballzgames.vercel.app/tala/) | Phỏm miền Bắc: ăn bài, hạ phỏm, gửi bài, ù. 2–4 người + bot. |
| **Chợ Lớn** | [`/cholon/`](https://gumballzgames.vercel.app/cholon/) | Game mặc cả mở tiệm: đổi đất, biển hiệu, trả giá. 3–5 người. |
| **Tứ sắc** | [`/tusac/`](https://gumballzgames.vercel.app/tusac/) | 112 lá bốn màu, luật Nam: ăn đôi/lẻ, khui khạp-quằn. 2–4 người + bot. |

## Cấu trúc
```
index.html        trang chọn game
bang/             BANG! (js/engine.js, bot.js, net.js, main.js, …)
uno/
  js/engine.js    luật UNO thuần logic (3 chế độ + tuỳ chỉnh luật)
  js/bot.js       bot
  js/net.js       PeerJS host/client (mã phòng tiền tố gumballz-uno-)
  js/main.js      giao diện, hoạt ảnh
  js/ufx.js       âm thanh tổng hợp WebAudio, hiệu ứng, nhạc nền
  js/guide.js     hướng dẫn
  test/sim.mjs    mô phỏng bot vs bot: node uno/test/sim.mjs 300
sanh/             Sảnh chung tìm phòng & chat
shared/           UI dùng chung (account, friends, roomchat, lobby, stats…) & lớp mạng
server/           Cloudflare Worker gumballz-rooms + Durable Objects (Room, Inbox, Users, Lobby)
tools/            Script QA, sinh hướng dẫn, icon, ảnh OG, tăng ?v
```

## Chạy thử ở máy
```
python3 -m http.server 8000   # mở http://localhost:8000
```

Dự án fan-made phi thương mại. Không liên kết với dV Giochi (BANG!) hay Mattel (UNO). Tranh minh hoạ BANG! là tranh thuộc phạm vi công cộng từ Wikimedia Commons.

