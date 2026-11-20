// 💀 Skeleton loading dùng chung – trả về HTML skeleton khớp khung nội dung thật.
// Dùng kèm shared/css/skeleton.css (ensureSkCSS nạp 1 lần). Mọi khối skeleton có class `sk`
// + aria-hidden="true"; nội dung thật luôn thay thế toàn bộ innerHTML nên không chồng nhau.
// import { ensureSkCSS, skRooms, skHot, skChat, skShop, skRanks, skPodium, skPlayers, skDrop } from '…/shared/ui/skeleton.js?v=1'
const SK_CSS = new URL('../css/skeleton.css?v=1', import.meta.url).href;
export function ensureSkCSS() {
  if (document.getElementById('sk-css')) return;
  const l = document.createElement('link'); l.id = 'sk-css'; l.rel = 'stylesheet'; l.href = SK_CSS;
  document.head.append(l);
}
const line = (w, h = 12) => `<i class="sk sk-line" style="width:${w};height:${h}px"></i>`;
const circ = s => `<i class="sk sk-circle" style="width:${s}px;height:${s}px"></i>`;
const lines = ws => `<span class="sk-lines">${ws.map(w => line(w)).join('')}</span>`;
/* Hàng phòng (trang chủ #rooms-list + sảnh .lb-rooms): khớp .room-card/.lb-room – tròn 40 + 2 dòng + pill */
export const skRooms = (n = 3) => Array.from({ length: n }, () => `<div class="sk-room" aria-hidden="true">${circ(40)}${lines(['72%', '48%'])}<i class="sk sk-pill" style="width:64px;height:30px"></i></div>`).join('');
/* Thẻ carousel hot (trang chủ #hot-row): dùng .hot-card thật – số + ảnh 104×104 + 2 dòng + nút Chơi */
export const skHot = (n = 3) => Array.from({ length: n }, () => `<div class="hot-card" aria-hidden="true"><i class="sk sk-block" style="width:34px;height:20px"></i><i class="sk sk-block" style="width:104px;height:104px;border-radius:14px;align-self:center"></i>${lines(['82%', '58%'])}<i class="sk sk-pill" style="width:100%;height:34px;margin-top:auto"></i></div>`).join('');
/* Dòng chat (sảnh .lb-msgs): dùng .lb-m/.lb-b thật – tròn 30 + bong bóng (tên + 2 dòng) */
export const skChat = (n = 3) => Array.from({ length: n }, () => `<div class="lb-m" aria-hidden="true">${circ(30)}<span class="lb-b sk-bubble">${line('38%', 11)}${line('88%')}${line('64%')}</span></div>`).join('');
/* Thẻ cửa hàng (shop .grid): dùng .card thật – ảnh 86px + tiêu đề + 2 dòng mô tả + giá + nút */
export const skShop = (n = 4) => Array.from({ length: n }, () => `<div class="card" aria-hidden="true"><i class="sk sk-block" style="height:86px;border-radius:12px"></i>${line('64%', 15)}${line('92%')}${line('78%')}<i class="sk sk-pill" style="width:88px;height:20px"></i><i class="sk sk-block" style="height:44px;border-radius:12px"></i></div>`).join('');
/* Hàng xếp hạng (modal .rk-list): dùng .rk-row thật – số hạng + tròn 40 + 2 dòng + giá trị */
export const skRanks = (n = 5) => Array.from({ length: n }, () => `<div class="rk-row" aria-hidden="true"><i class="sk sk-block" style="width:30px;height:18px"></i>${circ(40)}${lines(['56%', '38%'])}<i class="sk sk-block" style="width:64px;height:30px"></i></div>`).join('');
/* Bục top 3 (modal .rk-list): dùng .rk-podium/.rk-pd thật – 3 khối (giữa cao nhất) */
export const skPodium = () => `<div class="rk-podium" aria-hidden="true"><div class="rk-pd rk-p2">${circ(48)}${line('70%')}${line('46%', 11)}</div><div class="rk-pd rk-p1">${circ(48)}${line('70%')}${line('46%', 11)}</div><div class="rk-pd rk-p3">${circ(48)}${line('70%')}${line('46%', 11)}</div></div>`;
/* Người chơi trong phòng game (#plist li / #players div): khớp hàng người chơi – tròn 36 + tên */
export const skPlayers = (n = 3, tag = 'li') => Array.from({ length: n }, () => `<${tag} class="sk-player" aria-hidden="true">${circ(36)}${lines(['54%'])}</${tag}>`).join('');
/* Dòng bảng tỉ lệ (shop #drop-table): khớp li – % + dòng chữ */
export const skDrop = (n = 4) => Array.from({ length: n }, () => `<li class="sk-drop" aria-hidden="true"><i class="sk sk-pill" style="width:44px;height:18px"></i>${line('72%')}</li>`).join('');
