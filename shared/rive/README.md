# Rive pilot — trang chủ

Thử nghiệm: các card game trên trang chủ dùng hình minh hoạ animation bằng Rive
(`.riv`) thay cho icon SVG. Chỉ pilot ở trang chủ (4 ô game đầu kệ Cờ bàn +
card carousel game hot); các trang game chưa động tới.

## Runtime đã vendor

- `@rive-app/canvas` **2.51.0** (MIT) — cài bằng npm (`npm install @rive-app/canvas`),
  copy file build dùng được bằng thẻ `<script>` vào `shared/js/rive/`:
  - `rive.js` (UMD, biến toàn cục `rive`)
  - `rive.wasm` + `rive_fallback.wasm`
- Chạy offline/localhost hoàn toàn, không dùng CDN lúc chạy. Lưu ý: runtime mặc
  định tải wasm từ CDN (unpkg/jsdelivr), nên `shared/js/rive-cards.js` phải gọi
  `rive.RuntimeLoader.setWasmUrl('shared/js/rive/rive.wasm')` (và fallback) TRƯỚC
  khi tạo instance Rive đầu tiên — nếu không, ở máy không có mạng ngoài sẽ lỗi
  `LOAD_ERROR`.

## File `.riv` (3 file, tải thật từ CDN chính thức của Rive)

Đây là các file demo chính thức của Rive, dùng công khai trong tài liệu/ví dụ của
Rive (rive.app docs, rive-app/rive-docs) — tải trực tiếp từ `cdn.rive.app`, không
phải file trả phí, không phải file tự bịa. Không phải CC0: file vẫn thuộc về Rive,
chỉ dùng làm demo theo đúng mục đích Rive công bố.

| File | Nguồn | Nội dung (artboard) |
|---|---|---|
| `vehicles.riv` (58.792 B) | https://cdn.rive.app/animations/vehicles.riv | Xe chạy — animations: idle/curves/bounce, state machine: bumpy, 1920×1080 |
| `off-road-car.riv` (34.258 B) | https://cdn.rive.app/animations/off_road_car.riv | Xe địa hình nảy — animations: idle/bouncing/windshield_wipers/broken, 1000×1000 |
| `skills.riv` (79.256 B) | https://cdn.rive.app/animations/skills.riv | Nhân vật chọn cấp độ — dùng animation `Expert_idle` (nhân vật tóc hồng đứng giữa sân khấu; state machine `State Machine 1` hiển thị cả giao diện chọn nên nhỏ/tối ở cỡ card, không dùng), 1920×1080 |

Kiểm chứng ngày 2026-11-19: cả 3 file bắt đầu bằng magic bytes `RIVE`, load được
bằng runtime 2.51.0 (xem `/tmp/pwtest/rive-probe.mjs`).

## Tích hợp

- `shared/js/rive-cards.js` — khởi tạo Rive cho card pilot, SVG ở lại làm fallback,
  tạm dừng khi card khuất màn hình (IntersectionObserver), tôn trọng
  `prefers-reduced-motion`.
- CSS canvas: `.tile .art canvas.rive-cv` và `.hot-art canvas.rive-cv` trong
  `shared/css/home.css`.

## Chưa kiểm chứng

- Rive thật trên điện thoại (chỉ kiểm tra headless 390px).
- Hiệu năng khi cuộn nhanh qua nhiều card.
- Có hiện màn hình chờ (splash) của Rive hay không trên file demo — kiểm tra bằng
  mắt qua screenshot trong test Playwright.
