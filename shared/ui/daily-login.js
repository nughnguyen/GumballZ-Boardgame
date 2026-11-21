// 🎁 Điểm danh hằng ngày — sự kiện nhận xu 1 lần/ngày (giờ VN), chu kỳ 7 ngày tăng dần.
// Nút 🎁 ở topbar (cạnh ví) có chấm đỏ khi hôm nay chưa nhận; tự mở popup 1 lần/ngày ở trang chủ
// (chỉ khi đã đăng nhập, chưa nhận hôm nay, chưa mở hôm nay).
// Người ĐÃ ĐĂNG NHẬP: máy chủ là chuẩn (POST /auth/claim-login) — xóa dữ liệu cũng không nhận lại
// được trong ngày, chuỗi + số dư giữ nguyên qua máy khác. Khách (chưa đăng nhập): chỉ lưu
// localStorage, xóa dữ liệu sẽ mất chuỗi (ghi rõ trong giao diện). Máy chủ cũ (chưa có action
// nhận thưởng) thì dùng tạm bản local và ghi rõ — chưa chống được cho tới khi deploy lại Worker.
import { auth, API } from '../net/api.js?v=29';

const REWARDS = [20, 30, 40, 50, 60, 80, 100];
const KEY = 'gumballz-login', POP = 'gumballz-login-pop';
const VN = 7 * 3600e3;
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const dayVN = (t = Date.now()) => new Date(t + VN).toISOString().slice(0, 10);
const num = v => Math.max(0, Math.floor(+v || 0));
function readLocal() { try { const r = JSON.parse(ls.get(KEY)); return r && typeof r === 'object' ? { last: typeof r.last === 'string' ? r.last : '', streak: num(r.streak), total: num(r.total) } : { last: '', streak: 0, total: 0 }; } catch (e) { return { last: '', streak: 0, total: 0 }; } }
function writeLocal(r) { ls.set(KEY, JSON.stringify({ last: r.last || '', streak: num(r.streak), total: num(r.total) })); }
/* chuỗi/ngày/xu NẾU nhận hôm nay (theo bản local): bỏ 1 ngày → chuỗi về 1 */
function nextOf(r) { const yest = dayVN(Date.now() - 864e5); const streak = r.last === yest ? r.streak + 1 : 1; const day = ((streak - 1) % 7) + 1; return { streak, day, xu: REWARDS[day - 1] }; }

const CSS = `
.loginbtn{position:relative;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;border:1.5px solid #ecdfd0;background:#FFFDF9;font-size:19px;cursor:pointer;flex:none}
.lg-dot{position:absolute;top:-2px;right:-2px;width:11px;height:11px;border-radius:50%;background:#ff4d6a;border:2px solid #FFFDF9;pointer-events:none}
.lg-dot[hidden]{display:none}
.lg-ov{position:fixed;inset:0;z-index:9997;background:#1a1426aa;display:grid;place-items:center;padding:14px}
.lg-box{width:min(420px,100%);max-height:calc(100dvh - 28px);overflow:auto;background:#fffaf3;color:#4A3E5C;border-radius:22px;padding:18px;box-shadow:0 20px 60px #0006;font:600 15px/1.45 Nunito,system-ui,sans-serif;position:relative}
.lg-x{position:absolute;top:10px;right:10px;width:38px;height:38px;border-radius:50%;border:0;background:#f0e6da;font-size:18px;cursor:pointer;color:#4A3E5C}
.lg-box h2{margin:0 36px 4px 0;font:800 22px/1.2 "Baloo 2",Nunito,sans-serif;color:#241A38}
.lg-riv{width:100%;height:200px;border:2px solid #241A38;border-radius:14px;overflow:hidden;background:#FACD33;margin:0 0 12px;box-shadow:2px 2px 0 rgba(36,26,56,.9)}
.lg-riv canvas{width:100%;height:100%;display:block}
.lg-riv[hidden]{display:none}
.lg-streak{margin:0 0 12px;color:#6b5f7a}
.lg-streak b{color:#241A38}
.lg-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin:0 0 12px}
.lg-cell{border:2px solid #241A38;border-radius:12px;padding:7px 1px;text-align:center;background:#FFFDF9;box-shadow:2px 2px 0 rgba(36,26,56,.9)}
.lg-cell b{display:block;font:800 12px/1.2 "Baloo 2",Nunito,sans-serif;color:#241A38}
.lg-cell span{display:block;font:800 12px/1.3 Nunito,sans-serif;color:#2f9e5b}
.lg-cell i{display:block;font-style:normal;font-size:14px;margin-top:1px}
.lg-cell.done{background:#E7F9E9}
.lg-cell.today{background:#FACD33}
.lg-cell.lock{opacity:.55}
.lg-claim{width:100%;border:2px solid #241A38;border-radius:999px;min-height:48px;font:800 16px "Baloo 2",Nunito,sans-serif;color:#fff;background:linear-gradient(90deg,#ff4d5e,#ff9a3d);cursor:pointer;box-shadow:3px 3px 0 #241A38}
.lg-claim:disabled{opacity:.6;cursor:default}
.lg-note{font-size:12.5px;color:#8a7f96;margin:12px 0 0}
`;
function css() { if (document.getElementById('lg-css')) return; const s = document.createElement('style'); s.id = 'lg-css'; s.textContent = CSS; document.head.append(s); }

async function apiClaim(body) {
  const tok = auth.token();
  const res = await fetch(API() + '/auth/claim-login', { method: 'POST', headers: { 'content-type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify(body || {}) });
  if (res.status === 404) return { __oldServer: true };
  return res.json();
}
function localState(mode) {
  const r = readLocal(), today = dayVN(), claimed = r.last === today, nx = nextOf(r);
  return { last: r.last, streak: r.streak, total: r.total, claimed, day: claimed ? ((r.streak - 1) % 7) + 1 : nx.day, nextDay: nx.day, nextXu: nx.xu, mode };
}
/* trạng thái mới nhất: đã đăng nhập → hỏi máy chủ; khách / máy chủ cũ / mạng lỗi → dùng bản local */
async function fetchState() {
  if (auth.user()) {
    try {
      const r = await apiClaim({ check: true });
      if (r && r.__oldServer) return { ...localState('old-server'), mode: 'old-server' };
      if (r && r.ok) {
        const today = dayVN();
        if (r.claimed) writeLocal({ last: today, streak: r.streak, total: r.total });
        else if (typeof r.last === 'string' && r.last) writeLocal({ last: r.last, streak: r.streak, total: r.total });
        return { last: r.claimed ? today : (r.last || ''), streak: r.streak, total: r.total, claimed: r.claimed, day: r.day, nextDay: r.nextDay, nextXu: r.nextXu, mode: 'server' };
      }
    } catch (e) { /* mạng lỗi → dùng bản local, ghi rõ là chưa nối được máy chủ */ return localState('offline'); }
  }
  return localState('guest');
}
function refreshDot() {
  const dot = document.getElementById('lg-dot'); if (!dot) return;
  dot.hidden = readLocal().last === dayVN(); /* hôm nay chưa nhận → hiện chấm đỏ */
}
function cellCls(n, st) {
  if (st.claimed) return n <= st.day ? 'done' : 'lock';
  return n < st.nextDay ? 'done' : n === st.nextDay ? 'today' : 'lock';
}
function render(st) {
  const ov = document.getElementById('lg-ov'); if (!ov) return;
  const box = ov.querySelector('.lg-box'); if (!box) return;
  let cells = '';
  for (let n = 1; n <= 7; n++) {
    const c = cellCls(n, st), tag = c === 'done' ? '✓' : c === 'today' ? '👉' : '🔒';
    cells += `<div class="lg-cell ${c}"><b>Ngày ${n}</b><span>+${REWARDS[n - 1]} xu</span><i>${tag}</i></div>`;
  }
  const note = st.mode === 'guest'
    ? 'Chưa đăng nhập — chuỗi chỉ lưu trên máy này, xóa dữ liệu sẽ mất. Đăng nhập để giữ chuỗi qua máy khác.'
    : st.mode === 'old-server'
      ? 'Máy chủ chưa hỗ trợ điểm danh (đang chờ cập nhật) — chuỗi tạm lưu trên máy này, xóa dữ liệu sẽ mất. Sau khi máy chủ cập nhật, chuỗi sẽ đồng bộ theo tài khoản.'
      : st.mode === 'offline'
        ? 'Không nối được máy chủ lúc này — thử lại sau nha (chuỗi chưa nhận, không mất gì).'
        : 'Đã đăng nhập — chuỗi do máy chủ giữ, xóa dữ liệu hay đổi máy vẫn còn nguyên.';
  box.querySelector('.lg-body').innerHTML =
    `<p class="lg-streak">Chuỗi <b>${st.streak} ngày</b> 🔥 · Tổng <b>${st.total} ngày</b></p>` +
    `<div class="lg-grid">${cells}</div>` +
    `<button class="lg-claim" id="lg-claim" ${st.claimed ? 'disabled' : ''}>${st.claimed ? 'Đã nhận hôm nay ✓' : 'Nhận ' + st.nextXu + ' xu'}</button>` +
    `<p class="lg-note">${note}</p>`;
  const btn = box.querySelector('#lg-claim');
  if (btn && !st.claimed) btn.onclick = () => doClaim();
}
/* Banner Rive đầu modal: shared/rive/login.riv (hộp quà mở nắp, 6 xu vàng bung ra, 3 sao nhấp, lửa chuỗi ngày cháy to dần; loop 4s, không fade, mép full-bleed).
   Trang chủ: 'shared/...'; Sảnh/Shop (sâu 1 cấp): '../shared/...'. Topbar chỉ chạy ở 3 trang này.
   Overlay giữ cố định (ẩn/hiện thay vì xóa/tạo lại) để canvas + instance Rive sống qua các lần mở — đóng modal pause(), mở lại play().
   window.__loginAnim / __loginRivLoaded / __loginRivError: cờ kiểm thử (Playwright đọc), không ảnh hưởng giao diện. */
let ov = null, loginAnim = null;
const RIV_BASE = location.pathname.startsWith('/sanh/') || location.pathname.startsWith('/shop/') ? '../' : '';
async function ensureRive() {
  if (window.rive) return true;
  try {
    await new Promise((res, rej) => { const s = document.createElement('script'); s.src = RIV_BASE + 'shared/js/rive/rive.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  } catch (e) { return false; }
  return !!window.rive;
}
async function mountLoginRiv() {
  if (loginAnim) { try { loginAnim.play(); } catch (e) {} return; } /* mở lại → phát tiếp */
  const cv = document.querySelector('#login-riv'), wrap = document.querySelector('.lg-riv');
  if (!cv) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { if (wrap) wrap.hidden = true; return; } /* như rive-tiles.js: tôn trọng cài đặt giảm chuyển động */
  if (!(await ensureRive())) { if (wrap) wrap.hidden = true; return; } /* Sảnh chưa nạp runtime sẵn → tự nạp; nạp lỗi thì ẩn khung banner */
  try {
    window.rive.RuntimeLoader.setWasmUrl(RIV_BASE + 'shared/js/rive/rive.wasm');
    loginAnim = new window.rive.Rive({
      src: RIV_BASE + 'shared/rive/login.riv?v=1', canvas: cv, autoplay: true,
      layout: new window.rive.Layout({ fit: window.rive.Fit.Cover, alignment: window.rive.Alignment.Center }),
      onLoad: () => { try { window.__loginRivLoaded = true; } catch (e) {} },
      onLoadError: () => { if (wrap) wrap.hidden = true; try { window.__loginRivError = true; } catch (e) {} },
    });
    try { window.__loginAnim = loginAnim; } catch (e) {}
  } catch (e) { if (wrap) wrap.hidden = true; }
}
function openModal() {
  css();
  if (!ov) {
    ov = document.createElement('div'); ov.className = 'lg-ov'; ov.id = 'lg-ov';
    ov.innerHTML = `<div class="lg-box" role="dialog" aria-modal="true"><button class="lg-x" aria-label="Đóng">✕</button><div class="lg-riv"><canvas id="login-riv" width="800" height="400"></canvas></div><h2>🎁 Điểm danh hằng ngày</h2><div class="lg-body"><p class="lg-streak">Đang tải…</p></div></div>`;
    ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('.lg-x')) closeModal(); });
    document.body.append(ov);
  }
  ov.style.display = 'grid';
  fetchState().then(render);
  mountLoginRiv();
}
function closeModal() { if (ov) ov.style.display = 'none'; try { if (loginAnim) loginAnim.pause(); } catch (e) {} }
async function toast(msg) { try { const d = await import('./dialog.js?v=8'); d.toast(msg); } catch (e) {} }
/* nhận local (khách, hoặc máy chủ cũ chưa hỗ trợ): cộng xu + ghi chuỗi vào localStorage */
async function claimLocal() {
  const r = readLocal(), nx = nextOf(r), today = dayVN();
  try { const w = await import('./wallet.js?v=7'); w.addXu(nx.xu); } catch (e) {}
  writeLocal({ last: today, streak: nx.streak, total: r.total + 1 });
  toast('Nhận +' + nx.xu + ' xu! Chuỗi ' + nx.streak + ' ngày 🔥');
  refreshDot();
  render({ last: today, streak: nx.streak, total: r.total + 1, claimed: true, day: nx.day, nextDay: nx.day, nextXu: nx.xu, mode: auth.user() ? 'old-server' : 'guest' });
  try { const s = await import('./sync.js?v=49'); s.syncSoon(800); } catch (e) {}
}
async function doClaim() {
  const btn = document.getElementById('lg-claim'); if (!btn || btn.disabled) return;
  btn.disabled = true; btn.textContent = 'Đang nhận…';
  const today = dayVN();
  if (auth.user()) {
    try {
      const w = await import('./wallet.js?v=7');
      const r = await apiClaim({ wal: w.snapshot() });
      if (r && r.__oldServer) { await claimLocal(); return; } /* máy chủ cũ (404) → nhận local tạm */
      if (r && r.ok) {
        try { w.adoptServer(r.wal); } catch (e) {}
        writeLocal({ last: today, streak: r.streak, total: r.total });
        toast('Nhận +' + r.xu + ' xu! Chuỗi ' + r.streak + ' ngày 🔥');
        refreshDot();
        render({ last: today, streak: r.streak, total: r.total, claimed: true, day: r.day, nextDay: r.day, nextXu: r.xu, mode: 'server' });
        try { const s = await import('./sync.js?v=49'); s.syncSoon(800); } catch (e) {} /* đồng bộ để mở khóa thành tích dl-7 / dl-30 nếu đủ */
        return;
      }
      if (r && r.already) { /* đã nhận rồi (tab khác nhận trước / bấm 2 lần) */
        writeLocal({ last: today, streak: r.streak, total: r.total });
        refreshDot();
        render({ last: today, streak: r.streak, total: r.total, claimed: true, day: r.day, nextDay: r.day, nextXu: r.xu, mode: 'server' });
        return;
      }
      toast((r && r.msg) || 'Không nhận được, thử lại sau nha');
      btn.disabled = false; btn.textContent = 'Nhận lại';
      return;
    } catch (e) { /* mạng lỗi hẳn (không phải 404 máy chủ cũ): không nhận local để tránh nhận trùng khi mạng về */
      toast('Không nối được máy chủ, thử lại sau nha');
      btn.disabled = false; btn.textContent = 'Nhận lại';
      return;
    }
  }
  await claimLocal(); /* khách */
}
/* tự mở 1 lần/ngày ở trang chủ — chạy lại mỗi khi đăng nhập / hồ sơ đồng bộ về, vì lúc mount
   người dùng có thể chưa đăng nhập (đăng nhập sau thì hôm đó bảng không bao giờ tự mở nữa).
   Điều kiện giữ nguyên: trang chủ, đã đăng nhập, hôm nay chưa nhận, chưa mở hôm nay,
   không có hộp đăng nhập đang mở; delay 2s + kiểm tra lại trước khi mở. Hẹn 1 lần duy nhất
   (popTimer) để auth + stats-sync bắn cùng lúc không mở 2 lần. */
let popTimer = 0;
function maybePop() {
  if (popTimer) return; /* đã hẹn mở rồi */
  try {
    const home = location.pathname.replace(/\/+$/, '') === '';
    if (!home || !auth.user() || readLocal().last === dayVN() || ls.get(POP) === dayVN() || document.getElementById('ac-ov')) return;
    popTimer = setTimeout(() => {
      popTimer = 0;
      if (!auth.user() || document.getElementById('ac-ov') || (ov && ov.style.display !== 'none')) return; /* overlay giờ giữ cố định → kiểm tra hiển thị, không kiểm tra tồn tại */
      if (readLocal().last === dayVN() || ls.get(POP) === dayVN()) return; /* trong 2s chờ: nhận ở máy khác / tab khác mở trước thì thôi */
      ls.set(POP, dayVN());
      openModal();
    }, 2000);
  } catch (e) {}
}
export function mountDailyLogin(btn) {
  css();
  if (btn && !btn._lg) { btn._lg = 1; btn.addEventListener('click', () => openModal()); }
  refreshDot();
  addEventListener('gumballz-stats-sync', refreshDot); /* hồ sơ đồng bộ về (mang P.dl) → cập nhật chấm đỏ */
  addEventListener('gumballz-stats-sync', maybePop); /* hồ sơ về: chưa nhận thì mở, đã nhận ở máy khác thì không */
  auth.onChange(u => { if (u) maybePop(); }); /* đăng nhập (hoặc đổi tài khoản) sau khi trang đã tải → kiểm tra lại */
  maybePop(); /* kiểm tra lúc mount như trước */
}
