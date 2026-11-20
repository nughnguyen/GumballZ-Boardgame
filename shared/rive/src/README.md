# Animation Rive (.riv) riêng cho từng game

Thư mục này chứa **nguồn** để build các file `.riv` trong `shared/rive/`.
File `.riv` dùng trên trang chủ (tile game) — mỗi game 1 file, 1 animation
vòng lặp duy nhất tên `"loop"`.

## Build

```bash
cp shared/rive/src/build.mjs /tmp/rive-gen/build.mjs
cd /tmp/rive-gen && npm install @stevysmith/rive-generator   # lần đầu
node build.mjs   # ghi ra shared/rive/<game>.riv
```

(Copy sang /tmp vì ESM không dùng `NODE_PATH` và Node resolve symlink về
đường dẫn thật — chạy trực tiếp trong repo sẽ không tìm thấy package.)

Nguồn chính thức là **`build.mjs`**. Các file `*.rml` là bản đặc tả v1 chỉ
để tham khảo / kiểm tra bằng Rive CLI, KHÔNG dùng để build `.riv` nữa
(đã lỗi thời so với v2/v3/v4).

## Quy tắc thiết kế — CHỈ LẤY PHẦN CHƠI THẬT (anh Hưng đặt 2026-11-21)

Mỗi file `.riv` CHỈ lấy phần chơi thật của game đó — một lát cắt nhỏ cho
người xem biết lúc chơi game như thế nào. KHÔNG làm "cảnh mini" trang trí
(xúc xắc + nhà + tiền, ngựa phi nguyên con, 2 lạc đà đua trên cồn cát) —
hướng đó đã làm ở v3 và bị bỏ vì nhìn không ra cách chơi.

Ví dụ gốc của anh Hưng:
- typhu: 1 nhân vật nhảy từng ô trên bàn cờ tỷ phú, CHỈ HIỆN 1 GÓC VUÔNG
  của bàn (vài ô quanh góc, có nhà trên ô).
- caro: các ô X, O được đánh lần lượt, bên nào chạm 5 trước thì WIN và
  gạch đường win đó.
- cangua: 1 quân cờ cá ngựa nhảy từng ô trên bàn cờ cá ngựa.
- xidach: 2 lá bài được lật lại, thấy 1 con XÌ (Át) và 1 con TÂY (lá hình).

Áp dụng cho batch sau: tìm "lát cắt chơi" của game rồi vẽ đúng lát cắt đó
(quân di chuyển / đánh dấu / lật bài / bước tiến), không vẽ thêm đồ trang
trí ngoài cách chơi. Chuyển động phải RÕ ở cỡ thẻ (cao 104px), biên độ
lớn, không nhích nhẹ.

## Khổ RỘNG (v5) — animation lấp đầy header thẻ game (2026-11-21)

Header thẻ game = toàn bộ chiều rộng thẻ × 104px cao (`.tile` có
`padding-top:104px`, `.tile.art` cao 104px). Lưới trang chủ
`repeat(auto-fill,minmax(200px,1fr))` trong `main{max-width:1180px}` →
thẻ ≈218px rộng ở desktop (tỉ lệ ≈2,10:1), ≈173px ở màn 390px (1,66:1).
**Artboard chọn: 400×200 (2:1)** — giữa khoảng 1,5–2,1; mount dùng
`Fit.Cover` nên header luôn được lấp đầy ở mọi cỡ màn. Vùng an toàn
(Cover có thể cắt mép ở màn hẹp): nội dung chính trong 60% giữa chiều
rộng (x 80–320) và 80% giữa chiều cao (y 20–180); mép ngoài chỉ để nền /
bàn / đường đua kéo dài. Mỗi file tự vẽ nền full-bleed đục (che màu
header cũ), không còn đĩa trắng 104×104. Mount ở
`shared/js/rive-tiles.js`: canvas 800×400, `fit: Fit.Cover`,
prefers-reduced-motion thì không mount, IntersectionObserver tạm dừng
khi thẻ ra khỏi màn hình, SVG làm dự phòng. Thẻ đặc biệt: uno (`.art`
là neo 0×0 cho các lá `.uc`) và bang (`.art` phủ cả thẻ) cần override
`.has-riv` trong `shared/css/home.css` để canvas chiếm đúng header
104px và ẩn phần trang trí cũ.

## Công cụ — cái nào chạy được

- **Rive CLI chính thức KHÔNG build được `.riv` khi chưa đăng nhập.**
  Cài được (v1.10.0, `/tmp/rive-cli/rive-home/bin/rive`, chạy qua wrapper
  `/tmp/rive-cli/rive.sh` vì cần Mesa/libglvnd — xem ghi chú môi trường
  bên dưới). `rive <dir> --verify` biên dịch RML tốt, `rive <dir>
  --screenshot` render PNG tốt, nhưng `--verify` báo *"not signed in, so
  no .riv file is saved. To publish one… run: rive login"* và `--publish`
  đòi tài khoản Rive. Không tạo tài khoản, không hỏi mật khẩu.
- **Thư viện `@stevysmith/rive-generator` (v0.1.1) LÀ công cụ đã build
  ra các file `.riv`.** API: `new RiveFile()`, `addArtboard`, `addNode`,
  `addShape`, `addEllipse`, `addRectangle`, `addPointsPath`/`addVertex`,
  `addFill`/`addStroke`/`addSolidColor`, `addLinearAnimation`,
  `addKeyedObject`/`addKeyedProperty`/`addKeyFrameDouble`, `export()`.

## Quy tắc mount (cho code hiển thị, không thuộc đợt file này)

- Mỗi file chỉ có **1 animation `"loop"`** nên mount dùng
  `autoplay: true` và **KHÔNG truyền tên animation**. Lý do: tên
  animation/artboard do thư viện ghi không đọc được bằng runtime
  (`animationNames` trả `[""]`, `animations: 'loop'` lỗi *"Animation
  with name loop not found"* — thư viện ghi tên bằng PropertyKey.name=4
  trong khi schema Rive đặt Animation.name ở key 55).
- Runtime của site: `@rive-app/canvas 2.51.0` (`shared/js/rive/rive.js`),
  phải gọi `rive.RuntimeLoader.setWasmUrl('shared/js/rive/rive.wasm')`
  TRƯỚC instance đầu tiên.

## Kiến trúc file .riv (v2) — bắt buộc

Sau nhiều probe kiểm chứng bằng runtime thật, cấu trúc đúng là:

1. **Chỉ 1 Node `Root` ở (0,0) làm con duy nhất của artboard.**
   Mọi shape nằm trong Root, tọa độ **tuyệt đối**. Không có nhóm
   top-level thứ hai (Shadow/Board riêng lẻ sẽ vẽ sai hoặc mất).
2. **Mỗi shape chỉ 1 path** (mỗi chấm xúc xắc = 1 shape riêng).
3. **Thứ tự vẽ: thêm trước = vẽ trên cùng.** Add theo thứ tự
   từ trước ra sau (chi tiết mặt → thân → nền/bóng). **Nền/đế phải add
   SAU chi tiết** — nền đục mà add trước sẽ che hết chi tiết bên trong
   (lỗi đã gặp ở v5: `card()` add nền lá trước nên chất/chấm bị che →
   lá lật hiện mặt kem trơn; `unoCard()` add nền trước nên oval/chấm
   bị che → lá UNO thành hình chữ nhật đặc; `coin()`/`chip()` tương tự;
   huy hiệu Ba Cào, lá BANG!/TRƯỢT! cũng vậy — đã sửa hết bằng cách
   add chi tiết trước, nền sau).
4. **parentId và KeyedObject.objectId phải là LOCAL index trong
   artboard** (Artboard=0, Backboard không tính — theo tài liệu định
   dạng `.riv` chính thức). Thư viện ghi parentId theo khoảng cách
   (chỉ đúng trong nhóm top-level đầu tiên) và `addKeyedObject` ghi
   nguyên số truyền vào — nên `keys()` trong `build.mjs` truyền
   `target - 1`. Đã chứng minh bằng probe P1: objectId=2 (global của
   Node) làm shape con bay khỏi canvas, objectId=1 (local) mới trượt
   đúng Node.
5. **Opacity của Shape/Node là key 18** (WorldTransformComponent.opacity
   theo schema Rive), KHÔNG phải `PropertyKey.opacity` của thư viện (=46,
   đó là opacity của gradient). Dùng hằng `OPACITY = 18`.
6. `addSolidColor` nhận **(fillHoặcStroke, sốMàu)** — KHÔNG phải
   options object `{ color }` (truyền object sẽ ghi màu `0x0` = trong suốt).
   Màu dùng `hex('#...')` / `rgba(r, g, b, a)`.
7. File **không có animation sẽ không vẽ gì** (runtime chỉ vẽ khi có
   animation đang chạy) — mọi file đều phải có animation `"loop"`.

## Các file hiện có (v5 — khổ rộng 400×200, batch 1 làm lại + batch 2 + batch 3)

| File | Dung lượng | Nội dung (artboard 400×200, Fit.Cover) |
|---|---|---|
| `typhu.riv` | 8264 B | Nhân vật (mũ đỏ) nhảy từng ô quanh 1 góc bàn chữ L (9 ô ngang + 3 ô dọc, ô 34px, xuất phát đỏ, góc vàng, 2 nhà nhỏ), nhảy hết vòng rồi mờ về ô đầu (240f = 4s) |
| `cotuong.riv` | 6097 B | Bàn cờ 9 cột + sông ngọc + 2 cung chéo X, Mã đỏ (vòng trong vàng) nhảy chữ L rồi nhảy về, Tướng đỏ bob nhẹ, Mã + Tướng đen đứng yên (180f = 3s) |
| `cangua.riv` | 13639 B | Quân ngựa nhảy từng ô dọc đường ô chữ L (10 ô ngang + 2 ô dọc, ô 34px, xuất phát đỏ, 2 ô an toàn ngọc, đích vàng có sao đỏ), nhảy hết vòng rồi mờ về ô đầu (240f = 4s) |
| `camel.riv` | 17516 B | 2 lạc đà (vàng sau, tím trước) xếp 1 hàng trên đường đua dài + cờ caro đích, xen kẽ bước 4 bước, chân sải 1 nhịp mỗi bước, rồi mờ về vạch xuất phát (240f = 4s) |
| `uno.riv` | 8513 B | 4 lá UNO (đỏ → vàng → ngọc → lá Đen 4 màu) từ tay bay lần lượt lên chồng bài, đáp XÒE QUẠT để cả 4 màu đều thấy; dưới chồng có 2 lá tĩnh (180f = 3s) |
| `tienlen.riv` | 24255 B | Đôi 8 trượt lên bàn → đôi Q (vương miện) chặt → sảnh 3-4-5-6-7 chặt tiếp; bộ bị chặt trượt xuống + mờ (bài đánh ra là bài NGỬA — lưng tàng hình từ đầu) (180f = 3s) |
| `catte.riv` | 15432 B | 4 lá từ 4 ghế (4 chấm màu quanh bàn) trượt vào giữa, K♠ thắng (vòng hào quang vàng nhấp), cả 4 lá quét về phía người thắng + mờ (bài NGỬA) (180f = 3s) |
| `bacao.riv` | 12745 B | 3 lá lật lần lượt: 7♥, 9♠, 3♦ = 9 nút; huy hiệu vàng 9 chấm bật lên + 3 xu vàng trượt vào (180f = 3s) |
| `xidach.riv` | 7896 B | 2 lá người chơi lật: Át ♠ (XÌ) + K♥ (TÂY) — đúng ví dụ của anh Hưng; sao vàng bật lên + 3 xu; lá nhà cái úp trên (180f = 3s) |
| `poker.riv` | 17015 B | Flop 3 lá lật lần lượt → turn → river; 2 lá tẩy ngửa sẵn ở dưới; 3 chip trượt vào pot sau river (180f = 3s) |
| `solitaire.riv` | 14461 B | 3 cột bài, A♠ và 2♥ bay lên 2 ô foundation, sao vàng bật lên (180f = 3s) |
| `bang.riv` | 3873 B | Lá BANG! đỏ bay vào cao bồi → lá TRƯỢT! xanh bật lên chắn + chớp trắng → lá BANG! bật lại + rơi, cao bồi gật mũ; mặt trời + xương rồng + cồn cát (180f = 3s) |
| `scribble.riv` | 4953 B | Bảng trắng: mèo vẽ từng nét (đầu → tai → mắt/mũi → râu → thân → đuôi/chân), 3 vạch gợi ý + avatar người đoán + dấu tick vàng bật lên (180f = 3s) |
| `meono.riv` | 10562 B | Chồng bài úp: 1 lá bay ra, lật lên thành Mèo Nổ (bom đen + ngòi + tia lửa vàng), sao vàng + 4 tia bung ra sau lá bài, lá bài rung (180f = 3s) |
| `tamquoc.riv` | 4983 B | 2 võ tướng đối mặt (đỏ vs xanh, 3 tim máu mỗi bên), lá Sát đỏ bay sang tướng xanh, loé sáng + tướng xanh rung + rụng 1 tim (180f = 3s) |
| `masoi.riv` | 9031 B | Trời đêm + trăng + sao nhấp nháy; sói đen trên đồi (mắt vàng sáng, gật đầu, vẫy đuôi, rình tiến về phía dân), lá dân làng bị khung ngắm đỏ chớp + run sợ (180f = 3s) |
| `thathaythach.riv` | 4514 B | 2 lá lựa chọn (THẬT = con mắt, THÁCH = tia sét): ngón tay chọn THÁCH, lá THÁCH nhấc lên + vòng vàng loé; lá giữa lật lên thành tia sét vàng + sao bật (180f = 3s) |
| `baitan.riv` | 26957 B | Tấn 7♥, đỡ 9♥ chồng lên; tấn K♠, đỡ Át ♠ chồng lên; tay trên 3 lá úp xanh + tay dưới 3 lá úp đỏ; lá chủ (tim đỏ) + dấu chủ nhấp nháy (180f = 3s) |
| `loto.riv` | 6472 B | Vé 3 hàng × 9 cột: số đã ra chấm đỏ (2 dấu cuối hiện dần), hàng giữa đủ 5 số (ô vàng), bóng số rơi vào khay + nảy đều, sao vàng KINH! bật lên + nhấp nháy (180f = 3s) |
| `covua.riv` | 11706 B | 1 góc bàn cờ 5×4 ô; Mã trắng nhảy chữ L đi + về (2 ô ngang + 1 ô lên); Vua đen nhún nhẹ; Tốt trắng đứng yên (180f = 3s) |
| `gacha-box.riv` | 2268 B | Hộp quà vàng nơ đỏ nảy nhẹ + lắc khẽ + tia lấp lánh (idle Cửa hàng, 120f = 2s, loop) |
| `gacha-open.riv` | 9827 B | Mở hộp 1 lần: rung mạnh → nắp bay lên + mờ, 7 tia sáng + 5 xu vàng bung ra, hào quang (150f = 2,5s, oneshot; frame cuối giữ hộp mở + xu + tia mờ) |

Nguồn build hộp quà: `src/build-gacha.mjs` (riêng, không đụng `build.mjs`). Mount ở
`shop/js/shop.js`: idle autoplay lúc tải trang, khi bấm Mua thì `reset()` + `play()`
file open (oneshot, `onStop` hiện kết quả, `setTimeout` 2600ms dự phòng).

Bảng màu site: mực `#241A38`, đỏ `#FF5A60`, vàng `#FACD33`,
ngọc `#2EC5B6`, tím `#B9A6FF`, kem `#FFF8EE`.

## Kiểm chứng (đã làm — batch 3, 2026-11-21)

- Nạp TỪNG file một bằng runtime `@rive-app/canvas 2.51.0` qua Playwright
  (headless shell + server tĩnh cổng 8128): tất cả 8 file mới `loaded: true`,
  0 lỗi JS. Pixel đổi theo thời gian (mẫu 5000 điểm, 2 ảnh cách nhau
  0,8s): scribble 28–61, meono 371–388, tamquoc 338–355, masoi 169,
  thathaythach 303–318, baitan 417–449, loto 24–38, covua 70–77.
- Trang chủ Playwright: **43/43 checks passed** (20 canvas mount + 20
  thẻ `.has-riv` + 20 game vẽ nội dung + pixel đổi theo thời gian +
  0 lỗi JS) và 390px: 20 canvas, 20 has-riv, không tràn ngang.
- Ảnh chụp đã xác nhận bằng mắt (cả 8 file ở 400×200 và cả 8 thẻ ở
  cỡ thẻ thật): mỗi cảnh đọc ra game ngay và lấp đầy header. 3 lỗi thật
  đã tìm + sửa trong đợt verify: (1) Ma Sói + Lô tô gần như không đổi
  pixel (masoi 4, loto 4) vì chuyển động quá nhẹ / chết cảnh giữa vòng —
  sửa bằng cách tăng biên độ (sói gật ±5, mắt to + sáng mạnh, khung
  ngắm chớp 1.2, đuôi vẫy, sói rình tiến + lá dân run; bóng lô tô nảy
  đều ±7, sao KINH! nhấp nháy 1.25) → masoi 169, loto 38; (2) Lô tô:
  chấm đỏ bị ô kem che mất (tạo dấu SAU ô → dấu nằm dưới ô) + gạch
  vàng đặt nhầm y=118 (đè lên hàng 2) — sửa bằng cách tạo dấu TRƯỚC
  ô + bỏ gạch vàng, tô vàng cả hàng trúng; (3) Ảnh tile chụp ở pha
  ngẫu nhiên có thể bắt đúng lúc lá bài đang lật (chỉ thấy 1 vạch
  mỏng) — phải xem thêm ảnh -a/-b ở 2 pha khác nhau mới kết luận được
  (đã xem: meono lật thành bom, baitan đủ cặp khi đứng yên).
  File .riv cũ 12 file không đổi (md5 khớp sau khi build lại toàn bộ).
- BÀI HỌC verify (bổ sung): chụp ảnh kiểm tra ở NHIỀU pha khác nhau
  của vòng lặp — ảnh chụp ở 1 pha có thể bắt đúng lúc lá bài đang lật
  (chỉ thấy 1 vạch mỏng) hoặc lúc cảnh đang tĩnh, dễ kết luận sai.

## Kiểm chứng (đã làm — v5 wide + batch 2, 2026-11-21)

- Nạp TỪNG file một bằng runtime `@rive-app/canvas 2.51.0` qua Playwright
  (headless shell + server tĩnh cổng 8128): tất cả 12 file `loaded: true`,
  0 lỗi JS. Pixel đổi theo thời gian (mẫu 5000 điểm, 2 ảnh cách nhau
  0,8s): typhu 87, cotuong 121, cangua 117, camel 423, uno 626, tienlen
  222, catte 598, bacao 256, xidach 237, poker 452, solitaire 286,
  bang 437.
- Trang chủ Playwright: **27/27 checks passed** (12 canvas mount + 12
  thẻ `.has-riv` + 12 game vẽ nội dung + pixel đổi theo thời gian +
  0 lỗi JS) và 390px: 12 canvas, 12 has-riv, không tràn ngang.
- Ảnh chụp đã xác nhận bằng mắt (cả 12 file ở 400×200 và cả 12 thẻ ở
  cỡ thẻ thật): mỗi cảnh đọc ra game ngay và lấp đầy header. 3 lỗi thật
  đã tìm + sửa trong đợt verify: (1) bài Tiến Lên / Cát Tê hiện mặt
  SAU (lưng đỏ/xanh) vì `card()` vẽ lưng trên cùng — sửa bằng
  `faceUp()` (lưng tàng hình từ đầu); (2) lá lật (Ba Cào, Xì Dách,
  Poker) hiện mặt kem TRƠN vì nền lá add trước che chất/chấm — sửa
  thứ tự vẽ trong `card()`/`unoCard()`/`coin()`/`chip()` (chi tiết
  trước, nền sau); (3) lạc đà s=0.85 chồng nhau thành 1 khối — tách
  2 con ra (x=55/165, đầu to hơn, chân ngắn lại trong đường đua);
  UNO đáp chồng 1 điểm nên chỉ thấy 1 lá — sửa thành đáp xòe quạt.
- BÀI HỌC verify: nạp 4 file WebGL CÙNG LÚC làm headless shell kẹt CPU
  (SwiftShader) tới mức CDP treo — verify treo >60s. Phải nạp từng file,
  chụp xong thì `cleanup()` rồi mới nạp file sau. Đọc pixel canvas
  WebGL: KHÔNG dùng `getContext('2d')` trên chính canvas đó (trả `null`
  vì đã có context WebGL) — vẽ sang canvas 2D mới bằng `drawImage`
  trong `requestAnimationFrame` rồi đọc `getImageData`.

## Kiểm chứng (lịch sử — v4, 2026-11-21; file v4 đã bị v5 thay thế)

- Nạp TỪNG file một bằng runtime `@rive-app/canvas 2.51.0` qua Playwright
  (headless shell + server tĩnh cổng 8128): tất cả `loaded: true`,
  0 lỗi JS. Pixel đổi theo thời gian (mẫu 10000 điểm, 2 ảnh cách nhau
  0,8s): typhu 317, cotuong 553, cangua 454, camel 1297.
- Ảnh chụp canvas đã xác nhận bằng mắt: typhu = nhân vật mũ đỏ nhảy
  quanh góc bàn, 2 nhà nhỏ + ô góc vàng; cotuong = cung có chéo X +
  sông, Mã vòng trong vàng nhảy chữ L; cangua = quân ngựa nhảy dọc
  đường ô màu, ô đích vàng có sao đỏ; camel = 2 lạc đà xếp hàng bước
  về phía cờ caro (v3 xếp 2 làn chồng nhau nên chỉ thấy 1 con — đã sửa
  thành 1 hàng dọc đường đua đơn).

## Môi trường (ghi chú)

- Rive CLI cần Mesa/libglvnd: các file `.deb` (libegl-mesa0, mesa-libgallium,
  libegl1, libgles2) giải nén vào `/tmp/rive-cli/libs-root`, chạy qua
  `/tmp/rive-cli/rive.sh` (đặt `LD_LIBRARY_PATH` +
  `__EGL_VENDOR_LIBRARY_DIRS`). libEGL của Chromium không dùng được
  (thiếu `eglGetProcAddress`). `apt-get update` treo — tải `.deb` trực
  tiếp từ archive.ubuntu.com mới được.
- `/tmp` bị xóa khi runtime restart: `/tmp/rive-gen` (node_modules +
  `@stevysmith/rive-generator`), `/tmp/rive-cli`, `/tmp/pwtest`
  (playwright-core 1.65.1 + script test) đều phải cài lại sau restart.
- Exec trong VM không ghi file bằng `open(path,'w')`/echo (EPERM);
  `muse.write`/`muse.edit`, `sed -i`, `cp`, `curl -o` và
  `node writeFileSync` ghi được bình thường.
