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
trí ngoài cách chơi. Chuyển động phải RÕ ở 104×104 (nhảy từng ô, bước
tiến, lật bài), biên độ lớn, không nhích nhẹ.

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
   từ trước ra sau (chi tiết mặt → thân → nền/bóng).
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

## Các file hiện có (đợt 1)

| File | Dung lượng | Nội dung (artboard 200×200) |
|---|---|---|
| `typhu.riv` | 5548 B | v4: nhân vật (mũ đỏ) nhảy từng ô quanh 1 góc bàn, ô góc vàng + 2 nhà nhỏ, nhảy hết vòng rồi mờ về ô đầu (168f = 2,8s) |
| `cotuong.riv` | 4569 B | v4: cung 3×3 có chéo X + sông, Mã đỏ (vòng trong vàng) nhảy chữ L rồi nhảy về, Tướng đỏ + quân đen đứng yên (180f = 3s) |
| `cangua.riv` | 8850 B | v4: quân ngựa nhảy từng ô dọc đường ô màu (xuất phát đỏ, an toàn ngọc, đích vàng có sao đỏ), nhảy hết vòng rồi mờ về ô đầu (168f = 2,8s) |
| `camel.riv` | 14723 B | v4: 2 lạc đà (vàng sau, tím trước) xếp 1 hàng, xen kẽ bước 3 bước về phía cờ caro, chân sải 1 nhịp mỗi bước, rồi mờ về vạch xuất phát (180f = 3s) |
| `gacha-box.riv` | 2268 B | Hộp quà vàng nơ đỏ nảy nhẹ + lắc khẽ + tia lấp lánh (idle Cửa hàng, 120f = 2s, loop) |
| `gacha-open.riv` | 9827 B | Mở hộp 1 lần: rung mạnh → nắp bay lên + mờ, 7 tia sáng + 5 xu vàng bung ra, hào quang (150f = 2,5s, oneshot; frame cuối giữ hộp mở + xu + tia mờ) |

Nguồn build hộp quà: `src/build-gacha.mjs` (riêng, không đụng `build.mjs`). Mount ở
`shop/js/shop.js`: idle autoplay lúc tải trang, khi bấm Mua thì `reset()` + `play()`
file open (oneshot, `onStop` hiện kết quả, `setTimeout` 2600ms dự phòng).

Bảng màu site: mực `#241A38`, đỏ `#FF5A60`, vàng `#FACD33`,
ngọc `#2EC5B6`, tím `#B9A6FF`, kem `#FFF8EE`.

## Kiểm chứng (đã làm — v4, 2026-11-21)

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
- BÀI HỌC verify: nạp 4 file WebGL CÙNG LÚC làm headless shell kẹt CPU
  (SwiftShader) tới mức CDP treo — verify treo >60s. Phải nạp từng file,
  chụp xong thì `cleanup()` rồi mới nạp file sau. Đọc pixel canvas
  WebGL: KHÔNG dùng `getContext('2d')` trên chính canvas đó (trả `null`
  vì đã có context WebGL) — vẽ sang canvas 2D mới bằng `drawImage`
  trong `requestAnimationFrame` rồi đọc `getImageData`.

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
