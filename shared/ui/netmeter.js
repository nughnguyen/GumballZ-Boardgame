// 📶 Đo độ trễ trong phòng – để biết "lag" là do mạng của mình hay do máy/mạng của chủ phòng.
// shared/net/room.js (RoomClient) cứ 20 giây gửi {t:'__ping'} cho chủ phòng, chủ phòng đáp {t:'__pong'} → phát sự kiện window 'gumballz-net':
//   { rtt }        thời gian đi–về tới CHỦ PHÒNG (ms)     { lost: n }   n lần liền không thấy chủ phòng đáp
//   { away: bool } chủ phòng đang để tab game ở nền (trình duyệt bóp tốc độ tab ẩn → bot, đồng hồ, chia bài chậm lại)
// window.__gumballzSrvRtt = độ trễ từ máy này tới máy chủ Cloudflare (cfrelay.js đo) – cao thì là mạng của chính mình.
// Chỉ hiện dải nhắc khi CÓ vấn đề; bình thường không hiện gì. Mỗi máy báo về chủ web tối đa 1 lần/ngày/loại (POST /err, xem ở Quản trị → Lỗi web).
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const CSS = `.bnm{position:fixed;left:50%;top:max(8px,env(safe-area-inset-top));transform:translateX(-50%);z-index:9050;max-width:min(520px,calc(100vw - 24px));background:#4A3E5C;color:#fff;border-radius:999px;padding:7px 14px;font:700 13px/1.35 Nunito,system-ui,sans-serif;box-shadow:0 10px 26px -10px #000a;text-align:center;pointer-events:none;animation:bnm-in .25s ease-out}
.bnm[hidden]{display:none}.bnm.warn{background:#8a4b00}.bnm.bad{background:#a01f3a}
@keyframes bnm-in{from{opacity:0;transform:translate(-50%,-8px)}to{opacity:1;transform:translateX(-50%)}}
@media (prefers-reduced-motion:reduce){.bnm{animation:none}}`;
let el = null, slow = 0, away = false, lost = 0, last = 0, game = '';
function pill() { if (!el) { const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); el = document.createElement('div'); el.className = 'bnm'; el.hidden = true; el.setAttribute('role', 'status'); document.body.appendChild(el); } return el; }
function report(kind) { /* gộp theo loại để chủ web đếm được: không gửi tên, mã phòng hay nội dung chơi */
  const day = new Date().toISOString().slice(0, 10), k = 'gumballz-lag-' + kind; if (ls.get(k) === day) return; ls.set(k, day);
  import('../net/cfrelay.js?v=16').then(m => fetch(m.cfHttp() + '/err', { method: 'POST', keepalive: true, headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ game, msg: '📶 Lag: ' + kind, at: 'netmeter', page: location.pathname }) })).catch(() => {});
}
function draw() {
  const p = pill(), srv = +window.__gumballzSrvRtt || 0, sec = (last / 1000).toFixed(1).replace('.', ',');
  let t = '', cls = '';
  if (lost >= 2) { t = '📶 Chủ phòng không phản hồi – có thể họ rớt mạng. Chờ chút, phòng sẽ tự nối lại hoặc đổi chủ phòng…'; cls = 'bad'; report('chủ phòng không phản hồi'); }
  else if (slow >= 2 && srv >= 500) { t = `📶 Mạng của bạn đang chậm (trễ ~${sec} giây) – thử đổi Wi-Fi/4G nha`; cls = 'warn'; report('mạng người chơi chậm'); }
  else if (slow >= 2) { t = `📶 Máy/mạng của chủ phòng đang chậm (trễ ~${sec} giây) – nước đi sẽ tới trễ một chút`; cls = 'warn'; report('chủ phòng chậm'); }
  else if (away) { t = '⏳ Chủ phòng đang rời màn hình game – ván có thể chậm cho tới khi họ quay lại'; report('chủ phòng để tab ở nền'); }
  p.className = 'bnm ' + cls; p.textContent = t; p.hidden = !t;
}
export function mountNetMeter(g) {
  game = g || game; if (mountNetMeter.on) return; mountNetMeter.on = true;
  addEventListener('gumballz-net', e => {
    const d = e.detail || {};
    if (d.reset) { slow = 0; lost = 0; away = false; last = 0; }
    if ('away' in d) away = !!d.away;
    if ('lost' in d) lost = d.lost;
    if ('rtt' in d) { lost = 0; last = d.rtt; slow = d.rtt >= 800 ? slow + 1 : d.rtt < 500 ? 0 : Math.min(slow, 1); }
    draw();
  });
}
