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
để tham khảo / kiểm tra bằng Rive CLI, KHÔNG dùng để build `.riv` nữa.

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
| `typhu.riv` | 3403 B | Xúc xắc đỏ nảy + xoay, đổi mặt 5 ↔ 2, bóng đổ co giãn (120f = 2s) |
| `cotuong.riv` | 932 B | Quân Tướng đỏ trượt qua lại + nhún trên vạch bàn ngọc (180f = 3s) |
| `cangua.riv` | 1689 B | Ngựa ngọc phi từng bước, tai + mắt + mõm (144f = 2,4s) |
| `camel.riv` | 2108 B | Lạc đà vàng bước đi, 4 chân đung đưa xen kẽ, thân nhún (180f = 3s) |

Bảng màu site: mực `#241A38`, đỏ `#FF5A60`, vàng `#FACD33`,
ngọc `#2EC5B6`, tím `#B9A6FF`, kem `#FFF8EE`.

## Kiểm chứng (đã làm)

- Nạp cả 4 file bằng runtime `@rive-app/canvas 2.51.0` qua Playwright
  (headless shell + server tĩnh cổng 8128): tất cả `loaded: true`,
  0 lỗi JS, số pixel vẽ thay đổi theo thời gian (animation chạy).
- Ảnh chụp canvas đã xác nhận bằng mắt: xúc xắc đủ 5 chấm ở mặt 5 và
  2 chấm ở mặt 2 (đổi mặt bằng opacity hoạt động), bóng đổ hiện;
  quân Tướng có chấm đỏ giữa + vạch bàn ngọc; ngựa có tai/mõm/mắt;
  lạc đà đủ 2 bướu, đầu, cổ, 4 chân, đuôi.

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
