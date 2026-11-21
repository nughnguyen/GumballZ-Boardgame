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
- **BẮT BUỘC truyền `layout: new rive.Layout({ fit: rive.Fit.Cover,
  alignment: rive.Alignment.Center })` trong mỗi `new rive.Rive(...)`.**
  Runtime CHỈ đọc `params.layout`, KHÔNG đọc option `fit:` ở top-level
  (mặc định Layout mới = Fit.Contain). Vì vậy `fit: 'cover'` bao lâu nay
  bị bỏ qua, mount nào cũng render dạng Contain: artboard 400×200 co vừa
  khung thẻ 214×104 (tỉ lệ 2,058:1) để lại 2 viền trong suốt 3px 2 bên,
  màu header thẻ lộ ra thành 2 viền dọc có màu — chính là lỗi anh Hưng
  báo 2026-11-21 (đã đo: `fit: Cover` và `fit: Contain` cho kết quả Y
  HỆT NHAU; `layout: Cover` → mép alpha 255 từ x=0; `layout: Contain`
  → 3px trong suốt — đúng vết lỗi). Giữ `fit: fitCover` kèm theo cũng
  được (vô hại) nhưng `layout` mới là thứ có tác dụng. Áp dụng ở
  `shared/js/rive-tiles.js` (tile + hot) và `shared/js/rive-lobby.js`
  từ v6 (2026-11-21).

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

## Các file hiện có (v5 — khổ rộng 400×200, batch 1 làm lại + batch 2 + batch 3 + batch 4 + batch 5 + batch 6 + batch 7 + batch 8 + batch 9 + batch 10 + batch 11 + batch 12 — ĐỢT CUỐI, đủ 92/92)

| File | Dung lượng | Nội dung (artboard 400×200, Fit.Cover) |
|---|---|---|
| `typhu.riv` | 32548 B | FULL BÀN: toàn bộ vòng 40 ô thật (11×11, Bắt đầu/Vào tù/Bãi đậu/Vào tù, vạch màu 8 nhóm thật, ô đặc biệt có dấu), nhân vật nhảy từng ô quanh hết vòng (480f = 8s), giữa bàn xúc xắc lắc + 2 xu + 1 nhà + sao vàng nhấp |
| `cotuong.riv` | 6097 B | Bàn cờ 9 cột + sông ngọc + 2 cung chéo X, Mã đỏ (vòng trong vàng) nhảy chữ L rồi nhảy về, Tướng đỏ bob nhẹ, Mã + Tướng đen đứng yên (180f = 3s) |
| `cangua.riv` | 55181 B | FULL BÀN: toàn bộ bàn 15×15 thật (đường đua 56 ô, 4 chuồng 6×6, dải về đích 5 ô mỗi phía, trung tâm 4 tam giác màu; ô an toàn ngọc, cổng tím, ô xuất quân màu ghế), quân ngựa đỏ nhảy từng ô quanh hết đường đua (448f = 7,5s), sao vàng đích giữa bàn nhấp |
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
| `domi.riv` | 8407 B | Lưới mìn 9×9, con trỏ trượt tới ô (4,4) lật lên thành số 3, mìn hiện + cờ đỏ cắm vào, lá cờ phất + sao vàng nhấp, con trỏ trượt ra ngoài bàn (180f = 3s) |
| `s2048.riv` | 8022 B | Lưới 4×4: 2 ô 2 trượt vào nhau thành ô 4 nảy lên + vòng hào quang, ô 8/16/32 đứng yên (180f = 3s) |
| `matchu.riv` | 10713 B | 6 lá mạt chược úp: 2 lá tre lật lên khớp nhau, vòng vàng ôm + mờ đi, 4 lá còn lại úp (180f = 3s) |
| `loveletter.riv` | 5372 B | Lá Công chúa (vương miện vàng, vòng vàng) + lá Vệ binh (bích) lật lên, mũi tên vàng từ Vệ binh chỉ sang Công chúa (180f = 3s) |
| `sushigo.riv` | 7260 B | 3 lá sushi (maki/nigiri/tamago) lật lên thành bộ, 3 xu điểm bay lên + sao vàng (180f = 3s) |
| `lay6.riv` | 6481 B | 4 hàng bài: lá thứ 6 trượt vào hàng 3 đã đầy 5 lá, cả hàng bay về phía người chơi + mờ đi, lá mới ở lại đầu hàng (180f = 3s) |
| `saboteur.riv` | 6749 B | 3 lá đường hầm: lá giữa lật lên nối thông đường, lá kẻ phá hoại (mặt nạ) lật lên + rung lắc, vòng ngắm đỏ chớp (180f = 3s) |
| `skull.riv` | 6588 B | 3 lá úp: lật lần lượt thành hoa, hoa, sọ; lá sọ rung lắc + vòng ngắm đỏ chớp + sao vàng (180f = 3s) |
| `hanabi.riv` | 10862 B | 5 lá úp 5 màu (đỏ/xanh/vàng/trắng/tím), lá đỏ giữa lật lên thành pháo hoa đỏ nổ bung (chùm tia + sao vàng) (180f = 3s) |
| `chan.riv` | 7952 B | 2 lá giống nhau lật lên thành chắn (đôi), vòng vàng ôm cặp chắn; lá thứ ba lật lên thành lá Tây vàng (ù) + sao vàng (180f = 3s) |
| `totom.riv` | 5873 B | 3 lá tổ tôm lật lần lượt thành phu (thanh đỏ/ngọc/lục), vòng vàng ôm cả 3 lá + sao vàng (180f = 3s) |
| `carcassonne.riv` | 2745 B | 2 ô đã đặt (thành phố + đường), ô thứ ba trượt vào từ phải; meeple đỏ bật lên trên ô mới + sao vàng (180f = 3s) |
| `azul.riv` | 4189 B | 5 viên gạch men 5 màu bật lần lượt vào hàng mẫu trên tường; viên thứ 6 bật lên rồi rơi xuống vạch sàn + sao vàng (180f = 3s) |
| `splendor.riv` | 3058 B | 3 viên đá quý (ruby/sapphire/emerald) trượt vào từ trái; thẻ phát triển lật lên (kim cương đỏ) + sao vàng (180f = 3s) |
| `conhay.riv` | 6217 B | Bàn cờ nhảy góc 5×5 lỗ: quân đỏ nhảy liên tiếp qua 2 bi xanh, đáp ô cuối rồi ở lại tới 150f (KHÔNG có ăn quân trong Cờ Nhảy — chỉ nhảy qua để di chuyển; nhảy tay, KHÔNG dùng hopFrames) + sao vàng (180f = 3s) |
| `backgammon.riv` | 10324 B | 2 xúc xắc lắc rồi dừng ở 6 và 3; quân trắng trượt 6 ô dọc hàng dưới, đánh trúng blot đỏ ở ô đích (blot bay lên + mờ) + sao vàng (180f = 3s) |
| `rummikub.riv` | 7424 B | Nhóm 3 lá 7 (đỏ/xanh/vàng) trượt vào giá gỗ, lá joker lật lên (ngôi sao vàng), vòng vàng ôm cả bộ + sao vàng (180f = 3s) |
| `quoridor.riv` | 5220 B | Góc bàn 5×5 + hàng đích ngọc: quân đỏ tiến 2 ô lên, ở lại ô đích tới 150f (nhảy tay); tường gỗ nâu dựng lên chắn đường; quân xanh đứng yên phía trên (180f = 3s) |
| `blokus.riv` | 8280 B | Góc bàn 6×6: mảnh đỏ L-3 ở góc, mảnh xanh 2×2, mảnh vàng I-3; mảnh ngọc L-3 trượt vào từ phải khớp vào khoảng trống + sao vàng (180f = 3s) |
| `scrabble.riv` | 9971 B | Góc bàn 5×5: ô chữ gỗ bật lần lượt thành GAME ngang rồi PLAY dọc, chung chữ A ở ô sao giữa bàn + sao vàng (180f = 3s) |
| `mastermind.riv` | 8264 B | Hàng mã bí mật úp (4 chốt xám) ở trên; hàng đoán 4 chốt màu (đỏ/xanh/vàng/trắng) trượt vào lần lượt; khung gợi ý bật 4 chốt nhỏ (2 đen + 2 trắng) + sao vàng (180f = 3s) |
| `ailatrieuphu.riv` | 4783 B | Thanh câu hỏi ở trên; 4 ô đáp án 2×2, ô B bật lớp vàng + tia sáng, 3 ô còn lại mờ xuống 0.35 + sao vàng (180f = 3s) |
| `haithat1gia.riv` | 6873 B | 3 lá câu lật lần lượt: 2 lá thật (tick xanh) + 1 lá giả (dấu X đỏ); lá giả rung lắc, vòng ngắm đỏ chớp quanh nó + sao vàng (180f = 3s) |
| `doanhdong.riv` | 7460 B | Lá hành động (vũ công giơ tay trên nền tròn ngọc) lật lên giữa trên; 2 avatar dưới gật đầu liên tục, tick vàng bật lên trên mỗi avatar + sao vàng (180f = 3s) |
| `wavelength.riv` | 7771 B | Thang quang phổ ngang: kim chỉ trượt từ trái tới vùng vàng giữa, 3 lá gợi ý lật lên lần lượt, sao vàng bật lên (180f = 3s) |
| `resistance.riv` | 8738 B | 5 lá vai trò úp; lá giữa lật lên thành gián điệp (mặt nạ), vòng ngắm đỏ chớp quanh nó; lá nhiệm vụ dưới có tick xanh bật lên (180f = 3s) |
| `vetruyentin.riv` | 6128 B | Mặt trời vẽ từng nét trên bảng trắng (tròn + 8 tia bật lần lượt), lá đáp án dưới lật lên thành mặt trời nhỏ + tick vàng bật ở góc lá (180f = 3s) |
| `tetris.riv` | 6607 B | Giếng 10 cột: khối T rơi từ trên xuống khớp vào hàng, 2 hàng đủ sáng lên rồi biến mất, sao vàng bật lên (180f = 3s) |
| `ransanmoi.riv` | 3652 B | Rắn xanh trườn sang phải ăn táo đỏ, dài thêm 1 đốt ở đuôi, táo mới bật lên chỗ khác, sao vàng bật lên (180f = 3s) |
| `xepkeo.riv` | 6262 B | Lưới 3×3: hàng giữa 3 kẹo đỏ bật lần lượt, sáng lên rồi biến mất, 3 kẹo mới rơi từ trên xuống lấp đầy, sao vàng bật lên (180f = 3s) |
| `banbong.riv` | 3291 B | Thanh đỡ trượt qua lại, bóng nảy lên phá 3 viên gạch giữa hàng dưới, bóng rơi về thanh đỡ, sao vàng bật lên (180f = 3s) |
| `nonogram.riv` | 6327 B | Lưới 10×10 + dải gợi ý xanh trên/trái: con trỏ khung mực chạy tới từng ô, 5 ô tô đen lần lượt thành hình, 1 ô đánh X đỏ sai + rung lắc, sao vàng bật lên (180f = 3s) |
| `ghephinh.riv` | 4037 B | 3 mảnh ghép trượt vào khớp thành hình mặt trời (trời xanh 2 hàng trên, đồi xanh hàng dưới, mặt trời + 4 tia bật lên ở ô giữa trên, mảnh góc xoay rồi khớp vào) + sao vàng (180f = 3s) |
| `nhen.riv` | 22338 B | 3 cột bài, cột giữa là dãy 13 lá bích K→A; dãy bay lên + mờ đi rồi hiện lại ở cuối vòng, sao vàng bật lên (180f = 3s) |
| `bida8.riv` | 3245 B | Gậy kéo về chọc bi cái trắng lăn tới chạm bi 8, bi 8 lăn chéo vào lỗ góc trên-phải + chìm xuống, sao vàng bật lên (180f = 3s) |
| `dapenalty.riv` | 3113 B | Bóng lăn vào góc trái trên khung thành, thủ môn bay người sang phải (sai hướng) + xoay, sao vàng bật lên (180f = 3s) |
| `phitieu.riv` | 3292 B | Bia 5 vòng đồng tâm, 3 phi tiêu bay lần lượt găm vào (20 trên, 20 trái, bull giữa), bia rung nhẹ mỗi lần trúng, sao vàng (180f = 3s) |
| `keobuabao.riv` | 4941 B | Tay kéo (2 ngón chéo) vs tay bao (xòe) trượt vào từ 2 bên, kéo cắt thắng ở 60f, tay bao nghiêng + mờ xuống 0.35, chấm điểm vàng đầu tiên sáng lên + sao vàng (180f = 3s) |
| `dovui.riv` | 8304 B | Thanh câu hỏi + 4 ô đáp án 2×2, ô C (dưới trái) bật lớp vàng + 4 tia sáng, 5 sao thang sáng dần vàng, sao vàng (180f = 3s) |
| `hoisanquai.riv` | 10272 B | 3 lá quái lật lên lần lượt (troll xanh, rồng đỏ, yêu tinh tím), rồng giữa bị chém (vết chém trắng + rung + mờ xuống 0.45), lá anh hùng (kiếm vàng) bật lên dưới + sao vàng (180f = 3s) |
| `gacha-box.riv` | 2268 B | Hộp quà vàng nơ đỏ nảy nhẹ + lắc khẽ + tia lấp lánh (idle Cửa hàng, 120f = 2s, loop) |
| `gacha-open.riv` | 9827 B | Mở hộp 1 lần: rung mạnh → nắp bay lên + mờ, 7 tia sáng + 5 xu vàng bung ra, hào quang (150f = 2,5s, oneshot; frame cuối giữ hộp mở + xu + tia mờ) |

Nguồn build hộp quà: `src/build-gacha.mjs` (riêng, không đụng `build.mjs`). Mount ở
`shop/js/shop.js`: idle autoplay lúc tải trang, khi bấm Mua thì `reset()` + `play()`
file open (oneshot, `onStop` hiện kết quả, `setTimeout` 2600ms dự phòng).

Bảng màu site: mực `#241A38`, đỏ `#FF5A60`, vàng `#FACD33`,
ngọc `#2EC5B6`, tím `#B9A6FF`, kem `#FFF8EE`.

## Kiểm chứng (đã làm — v6: full-bleed + bỏ fade + sửa mount Fit.Cover, 2026-11-21)

- **Nguyên nhân gốc của 2 viền dọc có màu (đo 2026-11-21): KHÔNG phải do
  nền .riv.** Nền cũ đã đúng 400×200, đo ở 800×400 mép kín hết
  (alpha 255). Vết lỗi ở mount: runtime Rive KHÔNG đọc option `fit:`
  top-level, chỉ đọc `params.layout` (mặc định = Fit.Contain) → artboard
  co vừa khung thẻ 214×104 để lại 2 viền trong suốt 3px 2 bên. Chứng minh
  bằng probe page (canvas bắt đầu `display:none` rồi hiện lúc load —
  y hệt mount thẻ thật): `fit: Cover` và `fit: Contain` cho kết quả Y
  HỆT NHAU (3px trong suốt); `layout: Cover` → mép alpha 255 từ x=0.
- **Đổi trong `build.mjs`:** (1) `bg()` tràn ra ngoài artboard 2 đơn vị
  mỗi phía (404×204, tâm 200,100) — phòng thủ thêm để mép luôn kín tuyệt
  đối ở tỉ lệ lẻ; (2) `fadeEnds()` thành no-op (giữ chữ ký, 88 chỗ gọi
  không đổi) — trạng thái cuối vòng giữ nguyên rồi cắt cứng bắt đầu lại;
  (3) `hopFrames().opF` thành luôn = 1 và bỏ khối dịch về ô đầu lúc tàng
  hình — quân nhảy GIỮ NGUYÊN ở ô cuối tới hết vòng rồi cắt cứng về ô
  đầu (áp dụng cho typhu, cangua, covua, ranvathang); (4) camel: `opF`
  luôn = 1, `yDX`/`vDX` giữ +40/+30 tới frame 239 rồi nhảy về 0 ở 240
  (trước đây lạc đà mờ dần 225–237 rồi trượt ngược về vạch xuất phát
  lúc tàng hình — đúng kiểu "biến mất mờ rồi xuất hiện lại" anh Hưng
  bảo bỏ). Các key opacity RIÊNG của part (hiệu ứng gameplay: lá bị
  chặt mờ đi, tia chớp, tay chỉ...) KHÔNG đụng tới.
- **Đổi trong mount (`shared/js/rive-tiles.js`, `shared/js/rive-lobby.js`):**
  thêm `layout: new window.rive.Layout({ fit: window.rive.Fit.Cover,
  alignment: window.rive.Alignment.Center })` vào cả 3 chỗ `new
  window.rive.Rive(...)` (tile, hot, lobby); `fit: fitCover` giữ nguyên
  kèm theo (vô hại).
- **Build lại toàn bộ 92 file:** 2 lần build liên tiếp cho ra md5 Y HỆT
  nhau (lần này KHÔNG drift — domi/vetruyentin/nonogram ổn định), không
  file nào phải khôi phục từ git. Lần build 2 (sửa hopFrames + camel)
  chỉ đổi đúng 5 file: typhu, cangua, covua, ranvathang, camel. Nền
  tràn + bỏ fade làm file NHỎ ĐI ở các scene có fadeEnds (vd domi
  8407→5901 B, vetruyentin 6128→4919 B, nonogram 6327→5688 B);
  typhu/cangua giữ nguyên kích thước (32548 B / 55181 B — 2 scene này
  không dùng fadeEnds, chỉ đổi giá trị nền).
- **Kiểm chứng từng file một** (Playwright headless shell + server 8128,
  trang probe `rive-v6-verify.html`, 92/92 `loaded: true`, 0 lỗi JS):
  pixel đổi (mẫu dày: mỗi byte thứ 16, 80.000 điểm, 2 ảnh cách nhau
  0,8s — số này gấp ~16 lần mẫu 5000 điểm của các batch trước nên KHÔNG
  so trực tiếp với số batch cũ): typhu 1021, camel 5196, cangua 1345,
  cotuong 2222, uno 12697, tienlen 16729, catte 11717, bacao 6698, xidach
  3966, poker 6879, solitaire 8806, bang 2423, scribble 2793, meono
  3681, tamquoc 5942, masoi 1817, thathaythach 5113, baitan 10633, loto
  1085, covua 1159, tala 8813, cholon 4199, tusac 8960, bantau 1082,
  oanquan 1259, caro 3060, tictactoe 2213, memory 2789, covay 1156,
  cothu 2791, ranvathang 1569, sam 6499, daochinh 3565, xiecthu 4368,
  cuuho 2708, khaihoang 1290, xuyenviet 2330, noitu 5070, baucua 4461,
  giandiep 3820, codam 2002, lieng 4875, maubinh 4846, xito 6372, colat
  1608, domino 4631, connect4 1903, matthu 910, avalon 3580, spyfall
  1675, sudoku 3551, wordle 3273, domi 718, s2048 2171, matchu 4567,
  loveletter 2559, sushigo 3652, lay6 2283, saboteur 1164, skull 4712,
  hanabi 784, chan 4114, totom 1077, carcassonne 595, azul 2173,
  splendor 1571, conhay 1199, backgammon 1546, rummikub 5360, quoridor
  1275, blokus 3024, scrabble 2549, mastermind 2488, ailatrieuphu 6643,
  haithat1gia 3723, doanhdong 364, wavelength 3793, resistance 1777,
  vetruyentin 1748, tetris 6207, ransanmoi 3056, xepkeo 3085, banbong
  3125, nonogram 903, ghephinh 4035, nhen 8432, bida8 731, dapenalty
  1014, phitieu 1711, keobuabao 3871, dovui 3216, hoisanquai 10391.
  Mép artboard: **cả 92 file alpha 255 ở mọi điểm mép đo** (trước/sau/
  trên/dưới). Tỉ lệ sáng cuối vòng / giữa vòng (endRatio, đo bằng scrub
  tới cuối vòng −0,05s so với giữa vòng): **cả 92 file trong [0,87;
  1,12]** — trạng thái cuối đầy đủ độ sáng, không còn fade (với fade cũ
  tỉ lệ này sẽ ~0,25). 6 file chuyển động yếu nhất đã xem ảnh cuối +
  giữa vòng bằng mắt, đều chuyển động thật và scene nguyên vẹn:
  doanhdong 364 (chỉ có 1 ngôi sao vàng bật lên cuối vòng — scene vốn
  tĩnh), carcassonne 595, domi 718, bida8 731, hanabi 784, nonogram 903.
  Sửa hopFrames + camel làm covua tăng 603→1159 (mã không còn biến mất
  0,23s cuối vòng) và camel giảm 9224→5196 (số cũ gồm cả phần mờ dần —
  nay chỉ còn chuyển động đua thật).
- **Kiểm chứng trang chủ thật (mount đã sửa):** 93 tile (92 game + 1
  chờ), 92/92 canvas `.has-riv`; đo mép ở đúng kích thước thẻ 214×104:
  typhu/camel/cangua/cotuong/uno/wordle/hoisanquai/dovui đều **alpha 255
  ở x=0,1,2 cả 2 bên** (trước sửa: alpha 0 ở x=0,1,2). Hot 7/7 mount.
  Banner sảnh typhu + cangua (rive-lobby.js đã sửa): 800×400, mép
  alpha 255, `.has-riv`. Đã xem ảnh trang chủ bằng mắt: animation lấp
  kín header thẻ tới tận mép, không còn viền dọc màu. Chỉ còn 4 lỗi
  `ERR_TUNNEL_CONNECTION_FAILED` (sandbox chặn fetch tới Worker live —
  nhiễu đã biết, không phải lỗi JS của trang).
- **Trang probe tạm đã xóa sau khi xong:** `rive-edge-probe.html`,
  `rive-fit-probe.html`, `rive-v6-verify.html` (script kiểm chứng còn
  ở `/tmp/pwtest/v6-verify-pw.mjs`, `/tmp/pwtest/v6-home-pw.mjs`).
- **Còn tồn tại (ghi chú cho đợt sau, KHÔNG sửa trong v6):** nhiều scene
  vẫn có key opacity RIÊNG kết thúc `[D, 0]` (vd các dòng fade `[D-12,
  1], [D, 0]` viết tay trong timeline của part) — đó là hiệu ứng của
  từng scene (lá bài/đốm sáng xuất hiện rồi tắt), không phải fade toàn
  cảnh; endRatio toàn cục đã chứng minh scene không còn mờ dần ở cuối
  vòng. Nếu anh Hưng vẫn thấy một tile cụ thể "biến mất" ở cuối vòng
  thì mới sửa riêng scene đó.

## Kiểm chứng (đã làm — batch 12 — ĐỢT CUỐI, 2026-11-21)

- Nạp TỪNG file một bằng runtime `@rive-app/canvas 2.51.0` qua Playwright
  (headless shell + server tĩnh cổng 8128): tất cả 8 file mới `loaded: true`,
  0 lỗi JS. Pixel đổi theo thời gian (mẫu 5000 điểm, 2 ảnh cách nhau
  0,8s, số đo CUỐI sau khi sửa lỗi): ghephinh 532, nhen 450, bida8 72,
  dapenalty 216, phitieu 173, keobuabao 273, dovui 319, hoisanquai 562
  (đều trên ngưỡng 50).
- Trang chủ Playwright: **187/187 checks passed** (92 canvas mount + 92
  thẻ `.has-riv` + 92 game vẽ nội dung + pixel đổi theo thời gian +
  0 lỗi JS) và 390px: 92 canvas, 92 has-riv, không tràn ngang.
  **Đủ 92/92 game có animation — đây là đợt cuối, không còn game nào
  chưa có .riv.**
- Ảnh chụp đã xác nhận bằng mắt (cả 8 file ở 400×200 — ảnh cuối vòng
  bằng `inst.scrub([''], 2.0)` chụp NGAY sau scrub, không chờ — và cả
  8 thẻ ở cỡ thẻ thật, cộng 1 pha ngẫu nhiên nữa): mỗi cảnh đọc ra game
  ngay và lấp đầy header. Ảnh thẻ ở pha ngẫu nhiên có thể bắt đúng lúc
  đầu vòng (thẻ Hội Săn Quái chỉ thấy 1 lá lật + 2 lá úp, thẻ Đố Vui
  chưa thấy ô vàng) — ảnh cuối vòng cho thấy đủ 3 lá quái + vết chém
  trắng + lá anh hùng và đủ ô vàng + 5 sao vàng thang.
- 5 lỗi thật đã sửa trong lúc verify: (1) Nhện: pixel 0 < 50 — chuyển
  động chính (dãy bay lên 90–130f) rơi SAU cửa sổ lấy mẫu 0,4–1,2s —
  dời nhịp bay lên về sớm (30–70f), dãy reset trong lúc tàng hình
  (95–105f), hiện lại trước cuối vòng (115f), sao 100–120f → 0 → 450;
  (2) Bida 8: pixel 59, sát ngưỡng — dời toàn bộ nhịp sớm (gậy chọc
  12–20f, bi cái 20–55f, bi 8 lăn 55–95f, chìm 95–108f, sao 108–128f)
  → 59 → 72; (3) Kéo Búa Bao: chấm điểm vàng KHÔNG hiện — chấm vàng
  add SAU chấm xám cùng vị trí nên bị chấm xám che (lấy mẫu pixel:
  chấm 130 = xám #C9C4D6) — sửa bằng cách add chấm vàng TRƯỚC chấm
  xám → chấm 130 = vàng #E8A93D; (4) Đố Vui: sao thang vàng + lớp vàng
  ô đúng + chấm màu các ô đều KHÔNG hiện — cùng nguyên nhân (sao vàng
  add sau sao xám, lớp vàng + chấm màu add sau các ô; lấy mẫu pixel:
  sao xám, ô C kem, chấm kem) — sửa bằng cách đảo thứ tự tạo
  (sao vàng trước sao xám; lớp vàng + chấm màu trước các ô) → sao/ô/
  chấm đều hiện đúng màu, pixel 94 → 319; (5) Hội Săn Quái: vết chém
  add SAU lá rồng nên bị nền lá che — lúc đầu chỉ thấy mờ mờ vì rồng
  mờ xuống 0.45 ở cuối vòng — sửa bằng cách tạo vết chém TRƯỚC 3 lá
  quái → vết chém trắng rõ trên lá rồng.
  Bài học ghi lại từ đợt này: quy tắc "thêm trước = vẽ TRÊN" vẫn đúng
  — lúc verify đã suýt kết luận ngược (tưởng chấm bi cái / ngũ giác
  trên bóng là bằng chứng "thêm sau = vẽ trên"), nhưng đọc lại code
  thấy cueDot/eDot/bDot đều được tạo TRƯỚC bi/bóng của chúng (chi tiết
  add trước nền, đúng quy tắc). Lỗi ở (3)(4)(5) là do chính tay viết
  scene add phần "hiện lên trên" SAU phần nó cần phủ — cứ phần nào phải
  hiện trên thì add TRƯỚC, không có ngoại lệ.
- File .riv cũ 84 game không đổi (diff md5 sạch sau khi khôi phục
  domi.riv — domi.riv lại đổi vô cớ sau build dù scene không đổi, đã
  khôi phục từ git 2 lần trong đợt này; vetruyentin/nonogram lần này
  KHÔNG đổi).
- Trang verify tạm `rive-verify-wide.html` tạo lại trong đợt này (đợt 11
  đã xóa) — đã xóa khỏi repo sau khi verify xong.

## Kiểm chứng (đã làm — làm lại typhu + cangua FULL BÀN, 2026-11-21)

- Làm lại 2 scene trong shared/rive/src/build.mjs theo yêu cầu mới của anh Hưng ("full bàn luôn"): typhu vẽ TOÀN BỘ vòng 40 ô thật trong typhu/tiles.json (11×11, đi ngược chiều kim đồng hồ từ Bắt đầu góc dưới-phải; vạch màu 8 nhóm thật; ô đặc biệt: Khí vận tím, Cơ hội cam, Thuế cát, Ga xanh, Điện/Nước ngọc, Vào tù vạch, Bãi đậu vàng, Vào tù đỏ) — bàn vuông 155×155 (không 160 để mũ nhân vật trên hàng trên không chạm mép); cangua vẽ TOÀN BỘ bàn 15×15 thật trong cangua/js/scene3d.js (đường đua 56 ô theo trackCell/SIDE0, 4 chuồng 6×6, dải về đích 5 ô mỗi phía, trung tâm 4 tam giác màu; ô an toàn thật SAFE, cổng dịch chuyển PORTAL, ô xuất quân màu ghế) — bàn vuông 160×160. Nhân vật nhảy từng ô quanh hết vòng (typhu 40 ô × 12f = 480f = 8s; cangua 56 ô × 8f = 448f = 7,5s); quân ngựa đỏ (ghế 0) thay ngựa ngọc cũ. Kích thước: typhu 8264 → 32548 B, cangua 13639 → 55181 B (cangua to vì 56 ô × 6 part ngựa × key nhảy dày).
- Nạp TỪNG file một bằng runtime @rive-app/canvas 2.51.0 qua Playwright (headless shell + server tĩnh cổng 8128): cả 2 file loaded: true, 0 lỗi JS. Pixel đổi theo thời gian (mẫu 5000 điểm, 2 ảnh cách nhau 0,8s, đo 2 lần mỗi file): typhu 68/67 (lần 2 sau sửa: 79/67), cangua 103/91 (lần 2: 92/100) — đều trên ngưỡng 50 (typhu thấp nhất vì nhân vật nhỏ trên bàn lớn, đã đo 2 lần ổn định).
- Ảnh chụp đã xác nhận bằng mắt (cả 2 file ở 400×200 — ảnh cuối vòng bằng inst.scrub([''], t) chụp NGAY sau scrub, và ảnh giữa vòng): typhu đọc ra bàn Cờ Tỷ Phú ngay (vòng 40 ô đủ màu nhóm + ô đặc biệt, xúc xắc + xu + nhà + sao giữa bàn, nhân vật nhảy trên vòng); cangua đọc ra bàn Cờ Cá Ngựa ngay (4 chuồng màu 4 góc + đường đua chữ thập + 4 tam giác giữa, ngựa đỏ nhảy trên đường). 1 lỗi thật đã sửa trong lúc verify: xúc xắc typhu hiện ô vuông trắng trơn, không thấy chấm — chấm add SAU ô vuông nên bị ô che (thêm sau = vẽ dưới) — sửa bằng cách tạo chấm TRƯỚC ô vuông → xúc xắc hiện đủ 5 chấm. Ảnh cuối vòng typhu lần 2 không thấy nhân vật: ảnh chụp rơi đúng cửa sổ tàng hình 6 frame lúc teleport về ô đầu (471–477f) — không phải lỗi (ảnh giữa vòng + ảnh cuối vòng lần 1 đều thấy nhân vật trên vòng, pixel đổi đo 2 lần đều trên ngưỡng).
- Trang chủ spot-check: 2 thẻ typhu + cangua mount đủ (canvas + .has-riv + loaded: true), 0 lỗi JS trong 2 lần chạy lại (lần chạy đầu có 1 SyntaxError: Unexpected end of input không lặp lại trong 3 lần chạy sau — file .riv là dữ liệu nhị phân, không gây lỗi cú pháp JS; đây là nhiễu sandbox/server tĩnh, không liên quan file mới).
- File .riv cũ 95 file không đổi (diff md5 sạch sau khi khôi phục domi.riv — domi.riv lại đổi vô cớ sau build dù scene không đổi, đã khôi phục từ git 2 lần trong đợt này; vetruyentin/nonogram lần này KHÔNG đổi).
- Trang verify tạm rive-verify-wide.html tạo lại trong đợt này — đã xóa khỏi repo sau khi verify xong.

## Kiểm chứng (đã làm — batch 11, 2026-11-21)

- Nạp TỪNG file một bằng runtime `@rive-app/canvas 2.51.0` qua Playwright
  (headless shell + server tĩnh cổng 8128): tất cả 8 file mới `loaded: true`,
  0 lỗi JS. Pixel đổi theo thời gian (mẫu 5000 điểm, 2 ảnh cách nhau
  0,8s): wavelength 387, resistance 94, vetruyentin 128, tetris 128,
  ransanmoi 148, xepkeo 218, banbong 271, nonogram 62 (đều trên ngưỡng 50
  — Nonogram thấp nhất vì chuyển động chính là 5 ô nhỏ tô đen + con trỏ
  trên lưới lớn; đã đo 2 lần (56 rồi 62, ổn định) sau khi thêm con trỏ).
- Trang chủ Playwright: **171/171 checks passed** (84 canvas mount + 84
  thẻ `.has-riv` + 84 game vẽ nội dung + pixel đổi theo thời gian +
  0 lỗi JS) và 390px: 84 canvas, 84 has-riv, không tràn ngang.
- Ảnh chụp đã xác nhận bằng mắt (cả 8 file ở 400×200 — ảnh cuối vòng
  bằng `inst.scrub([''], 2.0)` chụp NGAY sau scrub, không chờ — và cả
  8 thẻ ở cỡ thẻ thật, cộng 1 pha ngẫu nhiên nữa): mỗi cảnh đọc ra game
  ngay và lấp đầy header. 2 điểm đã kiểm và kết luận KHÔNG phải lỗi:
  ảnh thẻ Resistance bắt đúng pha đầu vòng (5 lá đang úp, chưa lật gián
  điệp) và ảnh thẻ Vẽ Truyền Tin bắt đúng lúc mặt trời mới vẽ xong vòng
  tròn + lá đáp án đang lật — ảnh cuối vòng cho thấy đủ mặt nạ gián điệp
  + vòng ngắm + tick xanh và đủ mặt trời 8 tia + lá đáp án + tick vàng.
- 3 lỗi thật đã sửa trong lúc verify: (1) Vẽ Truyền Tin: pixel 35 < 50
  — chuyển động chính (lật lá đáp án 90–110f) rơi SAU cửa sổ lấy mẫu
  0,4–1,2s, trong cửa sổ chỉ có 8 tia nhỏ bật — sửa bằng cách dời nhịp
  lật lá về sớm (50–70f), tick 75–90, sao 95–115, tia to hơn (5×18,
  bán kính 32) → pixel 35 → 128; (2) Nonogram: pixel 56, sát ngưỡng —
  thêm con trỏ khung mực chạy tới từng ô 5f trước khi ô đó tô đen →
  56 → 62 (đo 2 lần, ổn định); (3) Resistance: tick xanh trên lá nhiệm
  vụ KHÔNG hiện — tick add SAU nền kem đục của lá nên nền (thêm trước =
  vẽ trên cùng) che mất tick — đã sửa bằng cách add tick TRƯỚC nền,
  ảnh kiểm lại ở scrub 2.5s thấy ✓ xanh rõ + vòng ngắm đỏ + sao vàng.
  Suýt mắc lỗi (đã chặn trước khi build): kẹo mới rơi xuống của Xếp Kẹo
  mà để fadeEnds sẽ hiện sẵn ở mép trên (y=10) suốt 0–95f — đã cho key
  opacity riêng (tàng hình tới lúc rơi), không cho vào fadeEnds.
- File .riv cũ 76 game không đổi (git status sạch ngoài 2 file sửa +
  8 file mới — domi.riv lại đổi vô cớ sau build dù scene không đổi, đã
  khôi phục từ git lần nữa; LƯU Ý MỚI: vetruyentin/nonogram đổi hash
  giữa 2 lần build của cùng 1 nguồn (kích thước không đổi 6128/6327 B)
  — generator không hoàn toàn xác định với cả 2 file này, không chỉ
  domi.riv; sau mỗi lần build lại, diff md5 và khôi phục file cũ nào
  đổi vô cớ, đừng commit).
- Restart 20 (~04:47) xen vào giữa lúc verify: dọn sạch /tmp/pwtest +
  /tmp/rive-gen (script verify + homepage + rive-generator mất), server
  8128 SỐNG SÓT lần này (200) nên không cần khởi động lại. Script viết
  lại từ đầu (verify theo mẫu b10; homepage khôi phục script gốc
  rive-wide-home-pw.mjs 4587 B từ session jsonl của coordinator
  wide-format agent-9b1fb39b rồi sửa thành 84 game), Playwright cài lại
  1.65.1, TOÀN BỘ kiểm chứng chạy lại từ đầu — số liệu trên là số đo
  mới sau restart (wavelength 395 → 387 giữa 2 lần đo = nhiễu pha lấy
  mẫu, các file khác giữ nguyên).
- Trang verify tạm `rive-verify-wide.html` tạo lại trong đợt này (đợt 10
  đã xóa) — đã xóa khỏi repo sau khi verify xong.

## Kiểm chứng (đã làm — batch 10, 2026-11-21)

- Nạp TỪNG file một bằng runtime `@rive-app/canvas 2.51.0` qua Playwright
  (headless shell + server tĩnh cổng 8128): tất cả 8 file mới `loaded: true`,
  0 lỗi JS. Pixel đổi theo thời gian (mẫu 5000 điểm, 2 ảnh cách nhau
  0,8s): rummikub 688, quoridor 83, blokus 352, scrabble 161, mastermind
  184, ailatrieuphu 1088, haithat1gia 276 → 285 sau sửa, doanhdong 323 →
  320 sau sửa (đều trên ngưỡng 50 — Quoridor thấp nhất vì chuyển động
  chính là 1 quân tiến 2 ô + 1 tường dựng trên bàn lớn).
- Trang chủ Playwright: **155/155 checks passed** (76 canvas mount + 76
  thẻ `.has-riv` + 76 game vẽ nội dung + pixel đổi theo thời gian +
  0 lỗi JS) và 390px: 76 canvas, 76 has-riv, không tràn ngang. (Lần
  chạy đầu 154/155: codam — file batch 6, byte không đổi — 2 mẫu bắt
  đúng lúc quân đỏ đứng yên trên ô đáp (~1,8s tĩnh trong vòng 3s);
  chạy lại 155/155. Đây là nhiễu pha lấy mẫu, không phải lỗi file.)
- Ảnh chụp đã xác nhận bằng mắt (cả 8 file ở 400×200 — ảnh cuối vòng
  bằng `inst.scrub([''], 2.0)` chụp NGAY sau scrub, không chờ — và cả
  8 thẻ ở cỡ thẻ thật, cộng 1 pha ngẫu nhiên nữa): mỗi cảnh đọc ra game
  ngay và lấp đầy header. Ảnh thẻ Rummikub/Blokus bắt đúng pha đầu
  vòng (lá đang trượt vào / mảnh ngọc chưa tới) — không phải lỗi, ảnh
  cuối vòng cho thấy đủ bộ 3 lá 7 + joker và mảnh ngọc đã khớp vào.
- 1 lỗi thật đã sửa trong lúc verify: dấu tick ✓ trên lá thật (2 Thật
  1 Giả) và trên 2 avatar (Đoán Hành Động) vẽ bằng 1 poly 3 điểm kín
  nên hiện thành tam giác đặc (mũi tên) chứ không phải dấu tick — đã
  vẽ lại bằng 2 vạch xoay (tay ngắn 11px góc 0.785 + tay dài 21px góc
  -0.785), ảnh kiểm lại thấy ✓ rõ; kích thước file đổi (haithat1gia
  6314 → 6873 B, doanhdong 6628 → 7460 B), pixel đổi vẫn trên ngưỡng
  (285 / 320), trang chủ chạy lại 155/155.
- File .riv cũ 68 game không đổi (md5 khớp sau khi build lại toàn bộ —
  domi.riv lại đổi vô cớ như batch 9 (8394 B thay vì 8407 B dù scene
  không đổi), đã khôi phục từ git lần nữa; generator không hoàn toàn
  xác định với file này — bài học: sau mỗi lần build lại, diff md5 và
  khôi phục file cũ nào đổi vô cớ, đừng commit).
- Trang verify tạm `rive-verify-wide.html` tạo lại trong đợt này (đợt 9
  đã xóa) — đã xóa khỏi repo sau khi verify xong.

## Kiểm chứng (đã làm — batch 9, 2026-11-21)

- Nạp TỪNG file một bằng runtime `@rive-app/canvas 2.51.0` qua Playwright
  (headless shell + server tĩnh cổng 8128): tất cả 8 file mới `loaded: true`,
  0 lỗi JS. Pixel đổi theo thời gian (mẫu 5000 điểm, 2 ảnh cách nhau
  0,8s): hanabi 138, chan 290, totom 293, carcassonne 288, azul 114,
  splendor 240, conhay 125, backgammon 181 (đều trên ngưỡng 50 — Azul
  thấp nhất vì chuyển động chính là 5 viên gạch bật lần lượt trên nền
  lớn; conhay 77 sau khi sửa đĩa nhỏ lại, vẫn trên ngưỡng).
- Trang chủ Playwright: **139/139 checks passed** (68 canvas mount + 68
  thẻ `.has-riv` + 68 game vẽ nội dung + pixel đổi theo thời gian +
  0 lỗi JS) và 390px: 68 canvas, 68 has-riv, không tràn ngang.
- Ảnh chụp đã xác nhận bằng mắt (cả 8 file ở 400×200 — ảnh cuối vòng
  bằng `inst.scrub([''], 2.0)` chụp NGAY sau scrub, không chờ — và cả
  8 thẻ ở cỡ thẻ thật, cộng 1 pha ngẫu nhiên nữa): mỗi cảnh đọc ra game
  ngay và lấp đầy header. Ảnh thẻ Tổ Tôm bắt đúng pha đầu vòng (3 lá
  đang úp, đang mờ vào) — không phải lỗi, ảnh cuối vòng cho thấy đủ phu
  + vòng vàng.
- 2 lỗi thật đã sửa trong lúc verify: (1) Cờ Nhảy — đĩa `disc()` chuẩn
  (rộng 32) chồng lên nhau vì các ô kề chéo chỉ cách 28.3 (quân đỏ đáp
  đè lên bi xanh vừa nhảy qua) — đã vẽ đĩa nhỏ riêng trong scene (ngoài
  26, trong 18, chấm 7) thì vừa khít, không chồng; (2) Backgammon — sao
  vàng (316,42) đè lên quân đỏ tĩnh ở (300,50) — đã dời quân đỏ sang
  (158,50) (mũi 151), sao giờ đứng riêng ở góc bàn.
- File .riv cũ 60 game không đổi (md5 63/63 khớp sau khi build lại toàn
  bộ — 63 dòng baseline gồm 3 file ngoài game). LƯU Ý: `domi.riv` build
  lại ra 8394 B thay vì 8407 B đã commit dù scene trong build.mjs KHÔNG
  đổi so với HEAD (đã diff kiểm chứng) — generator không hoàn toàn xác
  định với file này; đã khôi phục `domi.riv` từ git, bản commit 8407 B
  (đã verify pixel 56 ở batch 8) vẫn là bản chuẩn.
- Trang verify tạm `rive-verify-wide.html` tạo lại trong đợt này (đợt 8
  đã xóa) — đã xóa khỏi repo sau khi verify xong.

## Kiểm chứng (đã làm — batch 8, 2026-11-21)

- Nạp TỪNG file một bằng runtime `@rive-app/canvas 2.51.0` qua Playwright
  (headless shell + server tĩnh cổng 8128): tất cả 8 file mới `loaded: true`,
  0 lỗi JS. Pixel đổi theo thời gian (mẫu 5000 điểm, 2 ảnh cách nhau
  0,8s): domi 56, s2048 181, matchu 248, loveletter 296, sushigo 314,
  lay6 552, saboteur 316, skull 304 (đều trên ngưỡng 50 — Dò Mìn thấp
  nhất vì chuyển động chính là con trỏ + 1 ô lật + cờ phất trên nền lớn;
  đã đo 2 lần (57 rồi 56, ổn định) sau khi dời nhịp con trỏ/lá cờ về
  sau + tăng biên độ phất cờ 0.12→0.2 + sao vàng nhấp liên tục).
- Trang chủ Playwright: **123/123 checks passed** (60 canvas mount + 60
  thẻ `.has-riv` + 60 game vẽ nội dung + pixel đổi theo thời gian +
  0 lỗi JS) và 390px: 60 canvas, 60 has-riv, không tràn ngang.
- Ảnh chụp đã xác nhận bằng mắt (cả 8 file ở 400×200 — ảnh cuối vòng
  bằng `inst.scrub([''], 2.0)` chụp NGAY sau scrub, không chờ — và cả
  8 thẻ ở cỡ thẻ thật, cộng 1 pha ngẫu nhiên nữa): mỗi cảnh đọc ra game
  ngay và lấp đầy header. 2 điểm đã kiểm và kết luận KHÔNG phải lỗi:
  ảnh cuối vòng của Mạt Chược chỉ còn 2 vòng vàng rỗng (2 lá khớp đã mờ
  đi đúng luật) và Lấy 6 chỉ còn lá mới ở đầu hàng (hàng cũ đã lấy đúng
  luật) — ảnh pha ngẫu nhiên cho thấy đủ 2 lá tre ngửa khớp nhau và
  5 lá vàng đang bay đi. 1 lỗi thật đã sửa trong lúc verify: mũi tên
  Love Letter ban đầu chỉ SANG PHẢI (ngược hướng đoán) — đã lật đầu
  mũi tên sang trái, chỉ từ Vệ binh sang Công chúa.
- File .riv cũ 52 file không đổi (md5 khớp sau khi build lại toàn bộ;
  chỉ domi.riv đổi 1 lần nữa khi dời nhịp + tăng biên độ, các file khác
  vẫn khớp md5 — build xác định).
- Trang verify tạm `rive-verify-wide.html` tạo lại trong đợt này (đợt 7
  đã xóa) — đã xóa khỏi repo sau khi verify xong.

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
