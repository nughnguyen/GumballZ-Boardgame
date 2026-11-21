// 🧭 Chặn thoát nhầm khi đang trong ván (patch -112): topbar luôn hiện cả ở trang game;
// bấm link rời trang giữa ván thì hỏi xác nhận rồi mới rời đúng thủ tục của game đó.
// Hàm thuần, nhận document làm tham số để test được trong node (không import gì khác).
const LEAVE_BTNS = ['#btn-leave', '#g-leave', '#t-leave', '#p-leave']; /* nút rời của game: gamekit (#btn-leave) + scribble (g/t/p-leave) */
const isVisible = el => !!el && el.offsetParent !== null;

/* Đang trong ván = màn hình ván (#screen-game) đang mở. Màn hình home/lobby → không trong ván → chuyển thẳng, không hỏi. */
export function inMatch(doc) {
  const g = doc.getElementById('screen-game');
  return !!(g && g.classList && g.classList.contains('active'));
}

/* Tên đích đến hiển thị trong hộp xác nhận (lấy từ chính link vừa bấm). */
export function labelFor(a) {
  if (!a) return 'trang khác';
  if (a.id === 'btn-xu') return 'Cửa hàng';
  if (a.classList && a.classList.contains('brand')) return 'Trang chủ';
  const sp = a.querySelector ? a.querySelector('span') : null;
  const t = ((sp && sp.textContent) || a.textContent || '').trim();
  return t || 'trang khác';
}

/* Nút rời của game đang hiện (nút nào cũng được — game nào dùng nút đó). */
export function leaveBtn(doc) {
  for (const s of LEAVE_BTNS) {
    const b = doc.querySelector(s);
    if (isVisible(b)) return b;
  }
  return null;
}

/* Chạy thủ tục rời của game: bấm nút rời → hộp "Rời ván?" của chính game mở ra
   (gamekit: dialog.js confirmBox; game net riêng: #modal). Nút rời trong hộp đó được
   bấm hộ ở autoConfirmLeave(). Không có nút rời thì thử host trực tiếp; cuối cùng
   trả false (chuyển trang luôn — unload tự ngắt kết nối, như đóng tab). */
export function leaveMatch(doc) {
  const b = leaveBtn(doc);
  if (b) { try { b.click(); } catch (e) {} return true; }
  try {
    const w = (doc && doc.defaultView) || (typeof window !== 'undefined' ? window : null);
    const h = w && w.__gumballzHost;
    if (h && typeof h.leave === 'function') { h.leave(); return true; }
  } catch (e) {}
  return false;
}

/* Tự bấm nút "Rời ván" trong hộp rời của game (đã hỏi ở topbar rồi nên đây là cùng
   1 quyết định, không phải hộp thứ 2 hỏi lại). Trả Promise xong khi đã bấm hoặc hết
   lượt chờ (~2s: có game rời ngay khi bấm nút, không mở hộp). */
export function autoConfirmLeave(doc, { interval = 100, maxTries = 20 } = {}) {
  return new Promise(res => {
    let n = 0;
    const t = setInterval(() => {
      n++;
      let b = doc.querySelector('.dg-ov .dg-b[data-v="1"]'); /* hộp confirmBox của gamekit */
      if (!b) {
        const box = doc.querySelector('#modal-box');
        if (box) {
          b = box.querySelector('#m-leave, #m-quit');
          if (!b) {
            const btns = box.querySelectorAll('button');
            for (let i = 0; i < btns.length; i++) {
              if (/^\s*(🚪\s*)?Rời/.test(btns[i].textContent || '')) { b = btns[i]; break; }
            }
          }
        }
      }
      if (b) { clearInterval(t); try { b.click(); } catch (e) {} res(true); return; }
      if (n >= maxTries) { clearInterval(t); res(false); }
    }, interval);
  });
}

/* Hỏi xác nhận rồi rời ván + chuyển trang. deps: { confirmBox, navigate, delay=500 }.
   navigate là hàm chuyển trang (topbar.js truyền location.href); delay để thủ tục rời
   của game kịp chạy trước khi unload (homebtn.js cũng chờ 250ms). */
export async function askLeave(doc, dest, label, { confirmBox, navigate, delay = 500 } = {}) {
  const ok = await confirmBox('Bạn đang chơi dở ván này. Rời ván để về ' + label + '?', { title: 'Rời ván?', ok: 'Rời ván', cancel: 'Ở lại chơi tiếp', danger: true });
  if (!ok) return false;
  leaveMatch(doc);
  autoConfirmLeave(doc);
  setTimeout(() => navigate(dest), delay);
  return true;
}
