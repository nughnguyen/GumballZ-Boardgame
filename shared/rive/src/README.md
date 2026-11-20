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

## Các file hiện có (v5 — khổ rộng 400×200, batch 1 làm lại + batch 2 + batch 3 + batch 4 + batch 5 + batch 6 + batch 7)

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
| `tala.riv` | 20952 B | Bộ bài úp rút 1 lá (lật lên K♦) → phỏm 7-8-9♥ xếp thành bộ (vòng vàng + sao), lá Q♠ đánh ra; bộ bài úp + chồng bài bỏ (180f = 3s) |
| `cholon.riv` | 9621 B | Khu 5×3 lô đất: 3 cửa hàng đỏ cùng loại kề nhau tạo chuỗi (vòng vàng bao quanh), 3 xu vàng bay vào đống xu + sao vàng bật lên (180f = 3s) |
| `tusac.riv` | 9311 B | 4 lá Tướng 4 màu (đỏ/ngọc/vàng/đen, vương miện) lật lên lần lượt thành bộ, sao vàng bật lên (180f = 3s) |
| `bantau.riv` | 8809 B | Lưới 10×10 căn giữa: tâm ngắm đỏ di chuyển → bắn trúng tàu 3 ô (nổ sao vàng + khói, tàu hiện ra, dấu X đỏ) → bắn trượt (bọt nước + chấm trắng) (180f = 3s) |
| `oanquan.riv` | 6682 B | Bàn 12 ô + 2 ô quan: tay rải 5 sỏi từng ô, sỏi cuối rơi vào ô trống → ăn 2 sỏi ô kế bay vào ô quan, sao vàng bật lên (180f = 3s) |
| `caro.riv` | 8921 B | Bàn 5×5: X/O đánh lần lượt, X đủ 5 ở hàng giữa → vạch thắng đỏ gạch ngang 5 X + sao vàng bật lên (180f = 3s) |
| `tictactoe.riv` | 4939 B | Bàn 3×3 nền tối: X/O đánh lần lượt, X đủ 3 ở đường chéo chính → vạch thắng vàng gạch chéo + sao vàng bật lên (180f = 3s) |
| `memory.riv` | 26701 B | 12 lá úp 4×3: 2 lá ♥ lật lên trùng nhau → sao vàng, giữ ngửa; 2 lá ♠ vs ♦ lật lên lệch nhau → úp lại (180f = 3s) |
| `covay.riv` | 4736 B | 1 góc bàn 6×5: quân đen đặt lần lượt vây quân trắng ở giữa (4 đen xung quanh) → trắng mờ dần (bị ăn) + sao vàng bật lên, 1 quân trắng đứng yên góc dưới (180f = 3s) |
| `cothu.riv` | 8682 B | Bàn rừng 7×5 + sông ngọc + hang vàng + 2 bẫy X: Chuột đỏ nhảy tới ô Voi → Voi xanh mờ dần (bị ăn) + sao vàng, Hổ vàng nhảy qua sông, Mèo xanh + Chó đỏ đứng yên (180f = 3s) |
| `ranvathang.riv` | 9940 B | Xúc xắc 4 chấm lắc góc trái + rắn xanh cuộn bên trái; quân cờ nhảy từng ô theo đường chữ L (xuất phát đỏ → đích vàng), leo thang gỗ lên ô đích + sao vàng bật lên (180f = 3s) |
| `sam.riv` | 23855 B | Sảnh 3♥-4♥-5♥ trượt lên bàn + lật ngửa lần lượt, lá 2♠ (vương miện vàng) bay vào chặn + sao vàng; tay đối thủ 3 lá úp đỏ trên, tay mình 2 lá úp xanh dưới (180f = 3s) |
| `daochinh.riv` | 8517 B | Lá Công Tước (vương miện vàng) lật lên, lá bluff rung lắc, 3 xu vàng bay vào + sao vàng bật lên; tay đối thủ 2 lá úp đỏ trên (180f = 3s) |
| `xiecthu.riv` | 13184 B | Sân khấu (rèm đỏ + sàn gỗ): 3 lá lật lên lần lượt, sư tử (bờm vàng) → voi (tai tím + vòi) → khỉ (mặt nâu) bật lên trên từng lá + sao vàng bật lên (180f = 3s) |
| `cuuho.riv` | 4622 B | Bản đồ xanh 3 thành phố: 1 ô cháy (lửa đỏ-cam-vàng nhấp nháy), xe cứu hộ chạy vào, 3 giọt nước rơi xuống, lửa nhỏ dần + sao vàng bật lên (180f = 3s) |
| `khaihoang.riv` | 8653 B | Biển xanh + 4 ô lục giác (gỗ/lúa/gạch/quặng) + số chit: xúc xắc 6 chấm lắc, thuyền buồm nhấp nhô, nhà làng bật lên + đường mở ra + tài nguyên bật lên + sao vàng trên ô lúa (180f = 3s) |
| `xuyenviet.riv` | 8169 B | Bản đồ Việt Nam xanh lá trên biển xanh + 5 ga ngọc nối bằng chấm đỏ: tàu (đầu máy đỏ + toa vàng) chạy qua từng ga (mỗi ga 30f), vé đích bật lên + sao vàng ở ga cuối (180f = 3s) |
| `noitu.riv` | 8795 B | 2 khung từ trắng: "con gà" → "gà mái", ô vàng chung là âm tiết nối, mũi tên vàng nối 2 từ + sao vàng bật lên, 3 tim mạng góc phải (tim giữa đập) (180f = 3s) |
| `baucua.riv` | 11633 B | 3 xúc xắc lắc rồi dừng ở Bầu (xanh)/Cua (đỏ)/Cá (xanh); bàn cược 6 ô (Bầu/Cua/Cá/Gà/Nai/Tôm) + 3 xu vàng bay vào ô Bầu + sao vàng (180f = 3s) |
| `giandiep.riv` | 7774 B | 2 lá vai trò úp lật lần lượt: Dân (người xanh) + Gián điệp (mũ đỏ + mặt nạ mực), vòng ngắm đỏ chớp quanh lá gián điệp + sao vàng (180f = 3s) |
| `codam.riv` | 5684 B | Bàn 5×5: quân đỏ nhảy qua quân đen ăn 1 quân (đen mờ dần), đỏ Ở LẠI ô đáp tới 150f + sao vàng bật lên; 2 quân đứng yên (180f = 3s) |
| `lieng.riv` | 12853 B | 3 lá lật lần lượt thành Sáp (7♥, 7♠, 7♦) + 3 xu vàng bay vào pot vàng + sao vàng (180f = 3s) |
| `maubinh.riv` | 22620 B | 13 lá xếp 3 chi (Đầu 3 úp đỏ – Giữa 5 lật ngửa lần lượt – Cuối 5 úp xanh) + sao vàng bật lên (180f = 3s) |
| `xito.riv` | 19047 B | 2 lá tẩy lật ngửa (A♥ + K♠, hơi xòe) + Flop 3 lá → Turn → River lật dần, 2 chip trượt vào chồng chip pot + sao vàng (180f = 3s) |
| `colat.riv` | 13887 B | Bàn 6×6: quân đen mới đặt xuống (1,2) làm lật 2 quân trắng (2,2),(3,2) thành đen (neo đen ở (4,2)), sao vàng bật lên (180f = 3s) |
| `domino.riv` | 6953 B | Quân 6-3 đứng sẵn, quân 3-5 trượt từ phải vào khớp số 3, vòng vàng quanh chỗ khớp + sao vàng (180f = 3s) |
| `connect4.riv` | 11572 B | Đỏ/vàng thả xen kẽ (7 lượt), đỏ đủ 4 dọc cột 2 → vạch thắng đỏ dọc + sao vàng (180f = 3s) |
| `matthu.riv` | 17092 B | Lưới 5×5 lá từ: 2 lá lật lên đúng phe mình (ngọc) → sao vàng bật lên (180f = 3s) |
| `avalon.riv` | 7951 B | 3 lá vai trò lật lần lượt (Merlin vương miện vàng, Sát thủ bích đỏ, Dân tim xanh) + đĩa nhiệm vụ xanh (tick trắng) + sao vàng (180f = 3s) |
| `spyfall.riv` | 4942 B | Lá địa điểm lật lên thành bãi biển (mặt trời + sóng ngọc), lá gián điệp lật lên (mặt nạ mực + 2 mắt) rồi rung lắc, vòng ngắm đỏ chớp + sao vàng (180f = 3s) |
| `sudoku.riv` | 7356 B | Lưới 9×9: 12 số cho sẵn (ô vuông mực), số mới (chấm đỏ) điền đúng vào ô trống, hàng + cột sáng vàng + sao vàng (180f = 3s) |
| `wordle.riv` | 7061 B | Hàng trên: lượt đoán trước (xám/xanh/vàng/xám/xanh). Hàng dưới: lật từng ô (xanh/xanh/vàng/xám/xanh) → đúng từ, sao vàng bật lên (180f = 3s) |
| `gacha-box.riv` | 2268 B | Hộp quà vàng nơ đỏ nảy nhẹ + lắc khẽ + tia lấp lánh (idle Cửa hàng, 120f = 2s, loop) |
| `gacha-open.riv` | 9827 B | Mở hộp 1 lần: rung mạnh → nắp bay lên + mờ, 7 tia sáng + 5 xu vàng bung ra, hào quang (150f = 2,5s, oneshot; frame cuối giữ hộp mở + xu + tia mờ) |

Nguồn build hộp quà: `src/build-gacha.mjs` (riêng, không đụng `build.mjs`). Mount ở
`shop/js/shop.js`: idle autoplay lúc tải trang, khi bấm Mua thì `reset()` + `play()`
file open (oneshot, `onStop` hiện kết quả, `setTimeout` 2600ms dự phòng).

Bảng màu site: mực `#241A38`, đỏ `#FF5A60`, vàng `#FACD33`,
ngọc `#2EC5B6`, tím `#B9A6FF`, kem `#FFF8EE`.

## Kiểm chứng (đã làm — batch 7, 2026-11-21)

- Nạp TỪNG file một bằng runtime `@rive-app/canvas 2.51.0` qua Playwright
  (headless shell + server tĩnh cổng 8128): tất cả 8 file mới `loaded: true`,
  0 lỗi JS. Pixel đổi theo thời gian (mẫu 5000 điểm, 2 ảnh cách nhau
  0,8s): colat 142, domino 299, connect4 209, matthu 66, avalon 349,
  spyfall 279, sudoku 232, wordle 220 (đều trên ngưỡng 50 — Mật Thư thấp
  nhất vì chỉ 2 lá nhỏ lật trên nền tối, vẫn đạt).
- Trang chủ Playwright: **107/107 checks passed** (52 canvas mount + 52
  thẻ `.has-riv` + 52 game vẽ nội dung + pixel đổi theo thời gian +
  0 lỗi JS) và 390px: 52 canvas, 52 has-riv, không tràn ngang.
- Ảnh chụp đã xác nhận bằng mắt (cả 8 file ở 400×200 — ảnh cuối vòng
  bằng `inst.scrub([''], 2.0)` chụp NGAY sau scrub, không chờ — và cả
  8 thẻ ở cỡ thẻ thật, cộng 1 pha ngẫu nhiên nữa): mỗi cảnh đọc ra game
  ngay và lấp đầy header. Không tìm thấy lỗi thật nào trong đợt verify
  (ảnh pha ngẫu nhiên chỉ bắt đúng lúc lá đang lật/quân đang rơi — xem
  thêm pha cuối vòng mới kết luận được; vạch thắng Connect 4 đã kiểm
  riêng bằng scrub 2.8s: vạch đỏ dọc nối 4 quân đỏ + sao vàng hiện rõ).
  File .riv cũ 44 file không đổi (md5 khớp sau khi build lại toàn bộ).
- Trang verify tạm `rive-verify-wide.html` tạo lại trong đợt này (đợt 6
  đã xóa) — đã xóa khỏi repo sau khi verify xong.

## Kiểm chứng (đã làm — batch 5, 2026-11-21)

- Nạp TỪNG file một bằng runtime `@rive-app/canvas 2.51.0` qua Playwright
  (headless shell + server tĩnh cổng 8128): tất cả 8 file mới `loaded: true`,
  0 lỗi JS. Pixel đổi theo thời gian (mẫu 5000 điểm, 2 ảnh cách nhau
  0,8s): covay 84, cothu 250, ranvathang 128, sam 1066, daochinh 254,
  xiecthu 291, cuuho 205, khaihoang 69 (đều trên ngưỡng 50 — Khai Hoang
  lúc đầu chỉ 47, đã sửa, xem dưới).
- Trang chủ Playwright: **75/75 checks passed** (36 canvas mount + 36
  thẻ `.has-riv` + 36 game vẽ nội dung + pixel đổi theo thời gian +
  0 lỗi JS) và 390px: 36 canvas, 36 has-riv, không tràn ngang.
- Ảnh chụp đã xác nhận bằng mắt (cả 8 file ở 400×200 — ảnh cuối vòng
  bằng `inst.scrub([''], 2.0)` chụp NGAY sau scrub, không chờ — và cả
  8 thẻ ở cỡ thẻ thật): mỗi cảnh đọc ra game ngay và lấp đầy header.
  4 lỗi thật đã tìm + sửa trong đợt verify: (1) Khai Hoang: pixel
  47 < 50 — chuyển động đầu vòng quá muộn/nhỏ (nhà bật 50–70, xúc
  xắc lắc ±0.2) — sửa bằng cách dời nhịp sớm (nhà 30–50, đường
  50–70, tài nguyên 70–90, sao 100–120), xúc xắc lắc ±0.3 + thêm
  thuyền buồm nhấp nhô liên tục → pixel 47 → 69; (2) Rắn và Thang:
  thang gỗ bị ô kem che mất (tạo thang SAU ô → ô nằm trên) — sửa
  bằng cách tạo thang TRƯỚC ô; (3) Sâm Lốc: lá 2♠ hiện lưng xanh
  (lá đánh ra phải NGỬA nhưng không lật/faceUp) — sửa bằng
  `faceUp()`; vương miện trên lá 2♠ cũng bị mặt lá che mất (tạo
  crown SAU lá) — sửa bằng cách tạo crown TRƯỚC lá; (4) Gánh Xiếc
  Thú: khỉ bật lên ở frame 120, chỉ hiện 1/4 vòng — sửa bằng cách
  dời nhịp sớm (lật 10/40/70, thú bật 30/60/90, sao 110–130) → khỉ
  hiện nửa vòng. File .riv cũ 28 file không đổi (md5 khớp sau khi
  build lại toàn bộ, 2 lần).
- BÀI HỌC verify (bổ sung): (e) **Scrub xong chụp NGAY, không chờ** —
  sau `inst.scrub([''], t)` animation vẫn chạy tiếp; chờ 300ms sau
  scrub tới 2.9s thì vòng quay lại frame ~12 (ảnh "cuối vòng" thực
  ra là đầu vòng: lá úp, lửa to, chỉ 1 quân). Chụp liền sau lệnh
  scrub, hoặc scrub tới 2.0s làm mốc cuối vòng.

## Kiểm chứng (đã làm — batch 6, 2026-11-21)

- Nạp TỪNG file một bằng runtime `@rive-app/canvas 2.51.0` qua Playwright
  (headless shell + server tĩnh cổng 8128): tất cả 8 file mới `loaded: true`,
  0 lỗi JS. Pixel đổi theo thời gian (mẫu 5000 điểm, 2 ảnh cách nhau
  0,8s): cả 8 file đều đổi, nonBg 4678–5000 (trên ngưỡng 50).
- Trang chủ Playwright: **91/91 checks passed** (44 canvas mount + 44
  thẻ `.has-riv` + 44 game vẽ nội dung + pixel đổi theo thời gian +
  0 lỗi JS) và 390px: 44 canvas, 44 has-riv, không tràn ngang.
- Ảnh chụp đã xác nhận bằng mắt (cả 8 file ở 400×200 — ảnh cuối vòng
  bằng `inst.scrub([''], 2.0)` chụp NGAY sau scrub, không chờ — và cả
  8 thẻ ở cỡ thẻ thật): mỗi cảnh đọc ra game ngay và lấp đầy header.
  1 lỗi thật đã tìm + sửa trong đợt verify: Cờ Đam — quân đỏ nhảy xong
  mờ hẳn từ frame 43 (theo `hop.opF`) nên 74% vòng lặp bàn chỉ còn
  2 quân đứng yên; sửa lần 1 (giữ opacity tới 150f) vẫn trượt về ô
  xuất phát — nguyên nhân: `hopFrames` tự chèn key teleport về ô đầu
  ở hopEnd+6..+9 (`[teleB, 0]`, `[D, 0]`), thêm key `[D, 60]` sau key
  `[D, 0]` sẵn có không ăn; sửa lần 2 bằng cách viết key nhảy TAY
  (không dùng `hopFrames`), quân đỏ ở lại ô đáp tới 150f rồi mờ qua
  mối nối vòng lặp — đã đo bằng pixel: ở +1.0s/+1.5s/+2.0s/+2.5s quân
  đỏ đều ở ô đáp (200,70), quân đen bị ăn đã biến mất. File .riv cũ
  36 file không đổi (md5 khớp sau khi build lại toàn bộ, 3 lần).
- BÀI HỌC verify (bổ sung): (f) **`hopFrames` tự chèn key teleport về
  ô đầu** — dxF/dyF/shXF/shYF/shSXF của nó luôn có `[teleA, giá-trị-
  đích], [teleB, 0], [D, 0]` (dịch về ô đầu trong lúc tàng hình, opF
  mờ đi nên các cảnh cũ không lộ). Muốn quân/vật Ở LẠI điểm đích thì
  ĐỪNG dùng `hopFrames` — viết key tay với `[D, giá-trị-đích]`;
  opacity mờ dần trước mối nối (`[150,1],[155,0],[D,0]`) để vòng lặp
  nối liền không lộ. Key chốt cuối `[D, v]` GIỮ ĐƯỢC giá trị (đã kiểm
  chứng bằng file test tối thiểu: hộp đỏ X `[[0,100],[40,200],[180,
  200]]` ở yên x=200 tới +2.5s). (g) **Trang verify tạm
  `rive-verify-wide.html` ở gốc repo** (canvas #cv +
  `__fit/__load/__snap/__stop/__seek`) bị xóa sau mỗi đợt — đợt sau
  phải tạo lại (không commit). (h) **Đo vị trí bằng screenshot + PIL,
  không đọc canvas 2D trực tiếp sau scrub** — animation vẫn chạy sau
  scrub nên canvas đọc được có thể là frame cũ/mới lẫn lộn; screenshot
  ép render khung mới nên chính xác.

## Kiểm chứng (đã làm — batch 4, 2026-11-21)

- Nạp TỪNG file một bằng runtime `@rive-app/canvas 2.51.0` qua Playwright
  (headless shell + server tĩnh cổng 8128): tất cả 8 file mới `loaded: true`,
  0 lỗi JS. Pixel đổi theo thời gian (mẫu 5000 điểm, 2 ảnh cách nhau
  0,8s): tala 659, cholon 478, tusac 402, bantau 79, oanquan 92, caro 80,
  tictactoe 84, memory 251 (đều trên ngưỡng 50).
- Trang chủ Playwright: **59/59 checks passed** (28 canvas mount + 28
  thẻ `.has-riv` + 28 game vẽ nội dung + pixel đổi theo thời gian +
  0 lỗi JS) và 390px: 28 canvas, 28 has-riv, không tràn ngang.
- Ảnh chụp đã xác nhận bằng mắt (cả 8 file ở 400×200 — ảnh cuối vòng
  bằng `inst.scrub([''], 2.9)` — và cả 8 thẻ ở cỡ thẻ thật): mỗi cảnh
  đọc ra game ngay và lấp đầy header. 5 lỗi thật đã tìm + sửa trong
  đợt verify: (1) Chợ Lớn: cửa hàng + vòng bị lô đất che mất (tạo
  cửa hàng SAU lô → lô nằm trên) + chuyển động đầu vòng quá muộn —
  sửa bằng cách tạo xu bay → cửa hàng → vòng TRƯỚC lô, dời nhịp
  sớm (cửa hàng bật 0/15/30, vòng 45–65, xu 65–105, sao 110–130) →
  pixel 1 → 478; (2) Ô Ăn Quan: sỏi + sỏi quan bị ô che mất (tạo
  sỏi SAU ô) + rải quá muộn — sửa bằng cách tạo sỏi TRƯỚC ô/vòng
  quan, rải từ frame 0, sỏi to lên w=10 → pixel 6 → 92; (3) Bắn Tàu:
  lưới lệch trái (X0=95, nửa phải trống) — dời X0 95→125 (lưới
  125–275 căn giữa) + toàn bộ tâm ngắm/tàu/nổ/trượt theo; (4) Cờ
  Caro: vạch thắng đặt nhầm y=84 (nằm TRÊN hàng X thắng, không gạch
  qua) — sửa y=100 (tâm hàng r=2) + sao theo; (5) Memory: 2 lá
  lệch (♠/♦) sau khi úp lại hiện thành lá xanh trơn ở khung mờ cuối
  vòng — nguyên nhân là `flipCard()` rồi ghi đè thêm key SX (2
  KeyedProperty cho cùng part) — sửa bằng cách viết 1 bộ key SX duy
  nhất cho mỗi part (bỏ key thừa trùng giá trị kề trước). File .riv
  cũ 20 file không đổi (md5 khớp sau khi build lại toàn bộ).
- BÀI HỌC verify (bổ sung): (a) **KHÔNG bao giờ ghi 2 KeyedProperty
  cho cùng (part, property)** — ghi đè key sau `flipCard()`/`keys()`
  làm runtime vẽ sai; muốn đổi nhịp thì viết lại 1 bộ key duy nhất
  từ đầu. (b) **fadeEnds CHỈ cho part KHÔNG có key opacity riêng** —
  fadeEnds ghi đè key opacity riêng (key sau thắng) khiến vụ nổ/bọt
  nước/tay bốc không bao giờ tắt (Bắn Tàu, Ô Ăn Quan); part có key
  opacity riêng phải tự mờ vào/ra ở đầu/cuối vòng trong bộ key của
  nó. (c) **Seek bằng `inst.scrub([''], t)`** — tên animation do thư
  viện ghi sai key nên `animationNames` = `[""]`; `inst.time = t`
  không có tác dụng (không có property `time`), `pause()` không giữ
  được — scrub tua + vẽ 1 frame ngay, chụp liền sau đó. (d) Ảnh cuối
  vòng bằng scrub đáng tin hơn ảnh chờ theo đồng hồ (shell chậm,
  frame thực tế không đoán được từ thời gian chờ).

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
