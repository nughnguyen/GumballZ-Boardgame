// 🔄 Bảng chọn game cho "Đổi game trong phòng" (patch goto).
//   import { openGotoPicker, showGotoNotice, mountGotoButtons, syncGotoButtons } from './goto-picker.js?v=2'
// gamekit.js là nơi duy nhất gọi các hàm này (không sửa từng game).
// ĐIỂM NỐI LÕI (do worker khác làm, chưa có lúc viết file này):
//   • host: ui.net.raw.gotoGame(gameId) — gọi khi chủ phòng chốt game mới.
//   • client: handler onGoto(game, code) trong gamekit.js → showGotoNotice().
//   Nếu gotoGame chưa có, bấm chọn chỉ toast báo (không crash, không chuyển nhầm).
import { GAME_CATALOG, gameById, classify, needFor, extraFor } from './game-catalog.js?v=3';
import { confirmBox } from './dialog.js?v=10';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);

const CSS = `.gg-float{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:9040;min-height:44px;padding:10px 14px;border-radius:999px;border:2px solid var(--ink,#222);background:var(--card,#fff);color:var(--ink,var(--ink2,#222));font:800 14px/1.2 Nunito,system-ui,sans-serif;box-shadow:0 8px 20px -8px #0009;cursor:pointer}
.gg-float:active{transform:scale(.96)}
@media (max-width:1150px){.gg-float{bottom:calc(80px + env(safe-area-inset-bottom))}} /* nút nổi không đè tabbar (tabbar ~73px, như .start-bar ở gamekit.css) */
#modal-box.gg-modal{width:min(480px,100%);max-height:calc(100dvh - 32px);overflow:auto}
.gg-title{margin:0 0 4px;font:400 21px/1.25 var(--font-display,"Bungee","Baloo 2",Nunito,sans-serif)}
.gg-sub{color:var(--muted,#666);font-size:14px;margin:0 0 10px}
.gg-search{width:100%;box-sizing:border-box;border:1.5px solid var(--line,#ddd);border-radius:12px;padding:10px 12px;font:600 15px Nunito,sans-serif;background:var(--card,#fff);color:var(--ink2,#222);outline:none;margin-bottom:8px}
.gg-search:focus{border-color:#C9BDF3;box-shadow:0 0 0 3px rgba(201,189,243,.45)}
.gg-group{font:800 13px Nunito,sans-serif;color:var(--muted,#666);margin:12px 2px 4px}
.gg-row{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;box-sizing:border-box;text-align:left;padding:11px 12px;border:0;border-bottom:1px solid var(--line,#eee);background:transparent;color:var(--ink2,#222);font:700 15px Nunito,sans-serif;cursor:pointer}
.gg-row:hover{background:#f6f1ff}
.gg-row[disabled]{opacity:.55;cursor:default}
.gg-row .gg-range{flex:none;font:800 12.5px Nunito,sans-serif;color:var(--muted,#666)}
.gg-row .gg-note{display:block;font:600 12.5px Nunito,sans-serif;color:#b3541e}
.gg-empty{color:var(--muted,#666);padding:14px 4px;text-align:center;font-size:14px}
.gg-notice{text-align:center;padding:8px 4px}
.gg-notice h2{margin:0 0 8px;font:400 21px/1.25 var(--font-display,"Bungee","Baloo 2",Nunito,sans-serif)}
.gg-notice p{margin:0 0 4px;color:var(--muted,#666)}
.gg-spin{font-size:34px;display:block;margin-bottom:8px;animation:gg-sp 1.2s linear infinite}
@keyframes gg-sp{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.gg-spin{animation:none}}`;
function css() { if (document.getElementById('gg-css')) return; const s = document.createElement('style'); s.id = 'gg-css'; s.textContent = CSS; document.head.append(s); }

/** Số người trong phòng hiện tại (tính cả bot) + có bot không. */
export function roomInfo(ui) {
  const ps = (ui.lobby && ui.lobby.players) || (ui.net && ui.net.raw && ui.net.raw.players) || [];
  const list = Array.isArray(ps) ? ps : [];
  return { n: list.length, bots: list.filter(p => p && p.isBot).length, players: list };
}

function rowHtml(g, n, cur) {
  const range = g.min === g.max ? `${g.min} người` : `${g.min}–${g.max} người`;
  let note = '';
  if (g.id === cur) note = '<span class="gg-note">Đang chơi</span>';
  else if (n < g.min) note = `<span class="gg-note">Cần thêm ${needFor(g, n)} người nữa</span>`;
  else if (n > g.max) note = `<span class="gg-note">Thừa ${extraFor(g, n)} người — người thừa thành người xem</span>`;
  else if (!g.hasBot) note = '<span class="gg-note">Game này không có bot</span>';
  return `<button type="button" class="gg-row" data-g="${esc(g.id)}" ${g.id === cur ? 'disabled' : ''}><span>${esc(g.name)}${note}</span><span class="gg-range">${range}</span></button>`;
}

function listHtml(n, q, cur) {
  const byName = (a, b) => a.name.localeCompare(b.name, 'vi');
  const { fit, need, extra } = classify(n);
  const match = g => !q || g.name.toLowerCase().includes(q) || g.id.includes(q);
  const f = fit.filter(match).sort(byName);
  const nd = need.filter(match).sort((a, b) => needFor(a, n) - needFor(b, n) || byName(a, b));
  const ex = extra.filter(match).sort((a, b) => extraFor(a, n) - extraFor(b, n) || byName(a, b));
  if (!f.length && !nd.length && !ex.length) return '<div class="gg-empty">Không tìm thấy game nào khớp.</div>';
  let h = '';
  if (f.length) h += `<div class="gg-group">✅ Chơi được với ${n} người (${f.length})</div>` + f.map(g => rowHtml(g, n, cur)).join('');
  if (nd.length) h += `<div class="gg-group">➕ Cần thêm người (${nd.length})</div>` + nd.map(g => rowHtml(g, n, cur)).join('');
  if (ex.length) h += `<div class="gg-group">👀 Cần bớt người (${ex.length})</div>` + ex.map(g => rowHtml(g, n, cur)).join('');
  return h;
}

function doGoto(ui, g) {
  ui.closeModal();
  const raw = ui.net && ui.net.raw;
  if (raw && typeof raw.gotoGame === 'function') raw.gotoGame(g.id);
  else ui.toast('Chưa đổi được: lõi đổi game (gotoGame) chưa có trên bản này.');
}

async function pick(ui, g, inGame, hasBots) {
  const botNote = hasBots && !g.hasBot ? 'Bot sẽ không đi cùng sang game mới.' : '';
  if (inGame) {
    const ok = await confirmBox(`Đổi sang ${g.name} sẽ bỏ ván hiện tại.${botNote ? '\n' + botNote : ''}`, { title: 'Đổi game?', ok: 'Đổi game', danger: true });
    if (ok) doGoto(ui, g);
    return;
  }
  if (botNote) {
    const ok = await confirmBox(`${botNote}\nĐổi sang ${g.name}?`, { title: 'Đổi game?', ok: 'Đổi game' });
    if (ok) doGoto(ui, g);
    return;
  }
  doGoto(ui, g);
}

/** Mở bảng chọn game (chỉ chủ phòng). N = số người trong phòng, tính cả bot. */
export function openGotoPicker(ui) {
  if (!ui || !ui.isHost) { ui && ui.toast && ui.toast('Chỉ chủ phòng mới đổi được game.'); return; }
  css();
  const { n, bots } = roomInfo(ui);
  const inGame = !!ui.view;
  const cur = ui.game || '';
  const code = ui.code || '';
  let q = '';
  ui.openModal(`<h2 class="gg-title">🔄 Đổi game</h2>
<p class="gg-sub">Phòng ${esc(code)} · ${n} người${bots ? ` (${bots} bot)` : ''}${inGame ? ' · đang giữa ván' : ' · đang ở phòng chờ'}</p>
<input class="gg-search" type="search" placeholder="Tìm game…" aria-label="Tìm game">
<div class="gg-list">${listHtml(n, '', cur)}</div>
<div style="display:flex;justify-content:flex-end;margin-top:12px"><button type="button" class="gg-close" style="border:1.5px solid var(--line,#ddd);background:var(--card,#fff);color:var(--ink2,#222);border-radius:999px;padding:9px 18px;font:800 14px Nunito,sans-serif;cursor:pointer">Đóng</button></div>`, 'gg-modal');
  const box = $('#modal-box');
  const list = box.querySelector('.gg-list');
  box.querySelector('.gg-search').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); list.innerHTML = listHtml(n, q, cur); });
  box.querySelector('.gg-close').onclick = () => ui.closeModal();
  list.addEventListener('click', e => {
    const b = e.target.closest('[data-g]');
    if (!b || b.disabled) return;
    const g = gameById(b.dataset.g);
    if (g) pick(ui, g, inGame, bots > 0);
  });
}

/** Tạo 2 nút đổi game (phòng chờ + nổi trong ván). Chỉ gọi 1 lần trong gamekit.js. */
export function mountGotoButtons(ui) {
  css();
  if (!$('#btn-goto') && $('#btn-leave-lobby')) {
    const b = document.createElement('button');
    b.id = 'btn-goto'; b.className = 'chip'; b.type = 'button'; b.textContent = '🔄 Đổi game'; b.style.display = 'none';
    b.onclick = () => openGotoPicker(ui);
    $('#btn-leave-lobby').insertAdjacentElement('afterend', b);
  } else if (!$('#btn-goto') && $('#screen-lobby')) {
    const b = document.createElement('button');
    b.id = 'btn-goto'; b.className = 'chip'; b.type = 'button'; b.textContent = '🔄 Đổi game'; b.style.display = 'none';
    b.onclick = () => openGotoPicker(ui);
    $('#screen-lobby').appendChild(b);
  }
  if (!$('#btn-goto-float')) {
    const f = document.createElement('button');
    f.id = 'btn-goto-float'; f.className = 'gg-float'; f.type = 'button'; f.textContent = '🔄 Đổi game';
    f.title = 'Chủ phòng đổi sang game khác — cả phòng chuyển theo';
    f.style.display = 'none'; f.onclick = () => openGotoPicker(ui);
    document.body.appendChild(f);
  }
  syncGotoButtons(ui);
}

/** Hiện/ẩn 2 nút theo vai trò + màn hình đang mở. An toàn khi gọi trước mount. */
export function syncGotoButtons(ui) {
  const lobbyBtn = $('#btn-goto'), floatBtn = $('#btn-goto-float');
  if (!lobbyBtn && !floatBtn) return;
  const host = !!(ui && ui.isHost && !ui.gone && ui.net);
  const inLobby = !!document.querySelector('#screen-lobby.active');
  const inGame = !!document.querySelector('#screen-game.active');
  if (lobbyBtn) lobbyBtn.style.display = host && inLobby ? '' : 'none';
  if (floatBtn) floatBtn.style.display = host && inGame ? '' : 'none';
}

/** Phía khách: chủ phòng vừa đổi game — toast + modal khoá, chờ lõi chuyển phòng. */
export function showGotoNotice(ui, game, code) {
  css();
  const g = gameById(game);
  const name = g ? g.name : (game || 'game khác');
  ui.toast(`🔄 Chủ phòng đang đổi sang ${name}…`);
  ui.openModal(`<div class="gg-notice"><span class="gg-spin">🔄</span><h2>Đang đổi game</h2><p>Chủ phòng đang đổi sang game <b>${esc(name)}</b>…</p><p>Đang chuyển phòng — cùng mã phòng, không cần vào lại.</p></div>`, 'lock');
}
