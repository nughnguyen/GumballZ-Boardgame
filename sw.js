// 🔌 Service worker GumballZ Boardgame — cache app shell để mở từ màn hình chính nhanh + dùng được khi mạng chập chờn.
//   Đăng ký từ shared/ui/install.js (sau khi trang load xong, bọc try/catch — SW lỗi thì web vẫn chạy bình thường).
//   Version cache: bump SW_VER khi web đổi lớn để trình duyệt cài SW mới + cache mới (cache cũ tự xoá ở activate).
//   KHÔNG cache API/Worker (đăng nhập, phòng, donate, chat luôn gọi live) và không cache cross-origin.
const SW_VER = 'gumballz-v1';
const CORE = [
  '/',
 '/index.html',
 '/manifest.webmanifest',
 '/favicon.svg',
 '/shared/img/brand/icon-192.png',
 '/shared/img/brand/icon-512.png',
 '/shared/img/brand/icon-maskable-512.png',
 '/shared/img/brand/apple-touch-icon.png',
];
// File tĩnh được cache (đã có ?v= theo version nên URL đổi khi file đổi).
const STATIC_RE = /\.(?:js|css|png|jpg|jpeg|webp|svg|ico|woff2?|ttf|mp3|wav|ogg|glb|riv)$/i;
// Không bao giờ chặn/cache: Worker/phòng/API (luôn gọi live).
const LIVE_RE = /(workers\.dev|gumballz-rooms|\/auth\/|\/rooms|\/donate\/|api\.|socket|peerjs)/i;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SW_VER).then(c => c.addAll(CORE)).then(() => self.skipWaiting()).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== SW_VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return; // POST/PUT… không cache
  if (url.origin !== self.location.origin) return; // cross-origin (Worker/API/CDN) → để trình duyệt tự gọi
  if (LIVE_RE.test(url.pathname + url.search)) return; // API/phòng → luôn live
  if (req.mode === 'navigate') {
    // Trang: network-first (luôn lấy bản mới khi có mạng), rớt mạng thì trả trang chủ đã cache.
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }
  if (STATIC_RE.test(url.pathname)) {
    // File tĩnh: cache-first + cập nhật nền (lần sau dùng bản mới).
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res && res.ok) caches.open(SW_VER).then(c => c.put(req, res.clone())); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
  // Còn lại (HTML khác, …): để trình duyệt tự gọi mạng, không cache.
});
