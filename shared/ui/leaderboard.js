// 🏆 Bảng xếp hạng toàn server GumballZ: lọc theo Tất cả game hoặc từng game, xếp theo Điểm XP / Ván thắng / Chuỗi thắng.
// Bấm vào bất kỳ người chơi nào trên bảng để mở hồ sơ công khai của họ (trong hồ sơ có nút kết bạn / nhắn tin).
import { auth, leaderboard } from '../net/api.js?v=27';
import { GAME_NAMES } from './stats.js?v=82';
import { AVATARS } from './profile.js?v=45';
import { openLogin } from './account.js?v=49';
import { syncNow } from './sync.js?v=44';
import { ALL_TITLES, GAME_WINS } from '../titles.js?v=3';
import { attachInfo } from './infopop.js?v=1'; /* ℹ️ chạm (mobile) / rê chuột (desktop) vào danh hiệu để xem cách nhận */
const titleHow = t => { if (!t) return ''; if (t.id && String(t.id).startsWith('g-')) { const g = String(t.id).slice(2); return `Thắng ${GAME_WINS} ván ${GAME_NAMES[g] || g}`; } const f = ALL_TITLES.find(x => x.id === t.id); return f ? f.desc : (t.desc || ''); };

const BG = ['#ff7a8a,#ffb23d', '#7b61ff,#3d8bff', '#2fc76f,#8fe3a8', '#ff9a3d,#ffd166', '#ff5fa2,#b06bff', '#3dc7d6,#3d8bff'];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CSS = `
.rk-ov{position:fixed;inset:0;z-index:9998;background:rgba(74,62,92,.7);display:grid;place-items:center;padding:12px;backdrop-filter:blur(4px);animation:rk-f .16s ease-out;font:600 14.5px/1.4 Nunito,system-ui,sans-serif;color:#4A3E5C}
@keyframes rk-f{from{opacity:0}}@keyframes rk-p{from{opacity:0;transform:translateY(10px) scale(.97)}}
.rk-box{width:min(580px,100%);max-height:calc(100dvh - 24px);display:flex;flex-direction:column;background:#FFFDF9;border-radius:26px;box-shadow:0 24px 70px #0008;overflow:hidden;animation:rk-p .22s cubic-bezier(.2,1.2,.4,1)}
.rk-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 18px 10px;background:linear-gradient(120deg,#FFB98A,#FFE3A3);color:#4A3E5C}
.rk-hd h2{margin:0;font:400 22px/1.1 var(--font-display,"Bungee","Baloo 2",Nunito,sans-serif);display:flex;align-items:center;gap:8px}
.rk-hd small{display:block;font:700 12.5px Nunito,sans-serif;opacity:.92}
.rk-x{width:44px;height:44px;border-radius:50%;border:0;background:#ffffff30;color:#4A3E5C;font:800 16px Nunito;cursor:pointer;flex:none}
.rk-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:10px 14px 6px;background:#FFF8EE;border-bottom:1px solid #f0e2d2}
.rk-tabs button{border:1.5px solid #ead9c5;background:#FFFDF9;color:#8B7E9E;border-radius:12px;padding:7px 8px;font:800 13px Nunito,sans-serif;cursor:pointer;transition:transform .1s}
.rk-tabs button[aria-pressed=true]{background:#4A3E5C;color:#fff;border-color:#4A3E5C}
.rk-chips-w{position:relative;display:flex;align-items:center;background:#FFFDF9;border-bottom:1px solid #f0e2d2;flex:none}
.rk-chips{display:flex;gap:6px;overflow-x:auto;padding:8px 14px;scrollbar-width:none;flex:1;scroll-behavior:smooth}
.rk-chips::-webkit-scrollbar{display:none}
.rk-chips button{flex:none;border:1.5px solid #e6d8c8;background:#FFFDF9;color:#8B7E9E;border-radius:999px;padding:5px 12px;font:800 12.5px Nunito,sans-serif;cursor:pointer}
.rk-chips button[aria-pressed=true]{background:#FFB98A;color:#4A3E5C;border-color:#FFB98A}
.rk-arr{position:relative;z-index:2;width:44px;height:44px;margin:0 4px;border-radius:50%;border:1.5px solid #e6d8c8;background:#FFFDF9;color:#4A3E5C;font:800 16px/1 Nunito,sans-serif;cursor:pointer;flex:none;display:grid;place-items:center;box-shadow:0 2px 6px #0001}
.rk-arr[hidden]{display:none}
.rk-list{flex:1;min-height:220px;overflow-y:auto;padding:10px 14px;display:flex;flex-direction:column;gap:7px}
.rk-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:16px;background:#FFFDF9;border:1.5px solid #f0e2d2;cursor:pointer;transition:transform .1s,border-color .12s}
.rk-row:hover{border-color:#FFB98A;transform:translateY(-1px)}
.rk-row.me{border-color:#C9BDF3;background:#f5f2ff}
.rk-row.top1{background:linear-gradient(135deg,#fffdf5,#fff3c4);border-color:#f5c443}
.rk-row.top2{background:linear-gradient(135deg,#ffffff,#f1f4f9);border-color:#c5d1e0}
.rk-row.top3{background:linear-gradient(135deg,#fffaf6,#fde8d7);border-color:#e5a97c}
.rk-no{width:30px;text-align:center;font:400 16px var(--font-display,"Bungee","Baloo 2",Nunito,sans-serif);color:#8B7E9E;flex:none}
.rk-no.medal{font-size:22px}
.rk-av{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-size:22px;flex:none;box-shadow:inset 0 -2px 0 #0002}
.rk-inf{flex:1;min-width:0}
.rk-nm{font:800 15px/1.2 Nunito,sans-serif;color:#4A3E5C;display:flex;align-items:center;gap:6px; flex-wrap:wrap}
.rk-nm small{font:700 12px Nunito,sans-serif;color:#8B7E9E}
.rk-lv{display:inline-block;padding:1px 7px;border-radius:999px;background:#efe6da;color:#8B7E9E;font:800 11px Nunito,sans-serif}
.rk-tt{display:inline-flex;align-items:center;gap:4px;padding:0 8px;border-radius:999px;background:linear-gradient(135deg,#fff6dc,#ffd97a);color:#7a4300;font:800 11px/1.7 Nunito,sans-serif;box-shadow:inset 0 0 0 1px #f0c040;white-space:nowrap}
.rk-sub{font:700 12px Nunito,sans-serif;color:#8B7E9E;margin-top:2px}
.rk-val{text-align:right;flex:none}
.rk-val b{display:block;font:400 16px/1.1 var(--font-display,"Bungee","Baloo 2",Nunito,sans-serif);color:#4A3E5C}
.rk-val small{font:700 11.5px Nunito,sans-serif;color:#8B7E9E}
.rk-empty{padding:36px 16px;text-align:center;color:#8B7E9E;font-weight:700}
.rk-ft{padding:10px 14px;background:#FFF8EE;border-top:1.5px solid #f0e2d2;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px;font-weight:800}
.rk-ft b{color:#4A3E5C}
.rk-btn{border:0;border-radius:999px;padding:7px 14px;font:400 13px var(--font-display,"Bungee","Baloo 2",Nunito,sans-serif);background:linear-gradient(120deg,#FFB98A,#FFB9CF);color:#4A3E5C;cursor:pointer;flex:none}
`;

function injectCss() {
  if (document.getElementById('rk-css')) return;
  const s = document.createElement('style'); s.id = 'rk-css'; s.textContent = CSS;
  document.head.append(s);
}

function avFor(r) {
  if (r.av && AVATARS.includes(r.av.e)) {
    const c = BG[(+r.av.c || 0) % BG.length];
    return `<span class="rk-av" style="background:linear-gradient(135deg,${c})">${r.av.e}</span>`;
  }
  let h = 0; const s = String(r.name || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const e = AVATARS[Math.abs(h) % AVATARS.length];
  const c = BG[Math.abs(h >> 4) % BG.length];
  return `<span class="rk-av" style="background:linear-gradient(135deg,${c})">${e}</span>`;
}

export function openLeaderboard(initialGame = 'all') {
  injectCss();
  document.getElementById('rk-ov')?.remove();
  let game = initialGame && (initialGame === 'all' || GAME_NAMES[initialGame]) ? initialGame : 'all';
  let by = game === 'all' ? 'xp' : 'wins';
  let loading = true, data = null;

  const ov = document.createElement('div'); ov.className = 'rk-ov'; ov.id = 'rk-ov';
  ov.innerHTML = `<div class="rk-box" role="dialog" aria-modal="true" aria-label="Bảng xếp hạng">
    <div class="rk-hd"><div><h2>🏆 Bảng xếp hạng</h2><small>Top cao thủ GumballZ · bấm vào người chơi để kết bạn</small></div><button class="rk-x" aria-label="Đóng">✕</button></div>
    <div class="rk-tabs" role="tablist">
      <button type="button" data-by="xp" aria-pressed="${by === 'xp'}">⭐ Cấp &amp; XP</button>
      <button type="button" data-by="wins" aria-pressed="${by === 'wins'}">🏆 Ván thắng</button>
      <button type="button" data-by="streak" aria-pressed="${by === 'streak'}">🔥 Chuỗi thắng</button>
    </div>
    <div class="rk-chips-w">
      <button type="button" class="rk-arr" data-sc="-1" aria-label="Cuộn trái" hidden>‹</button>
      <div class="rk-chips">
        <button type="button" data-g="all" aria-pressed="${game === 'all'}">🌟 Tất cả game</button>
        ${Object.entries(GAME_NAMES).map(([k, n]) => `<button type="button" data-g="${k}" aria-pressed="${game === k}">${esc(n)}</button>`).join('')}
      </div>
      <button type="button" class="rk-arr" data-sc="1" aria-label="Cuộn phải" hidden>›</button>
    </div>
    <div class="rk-list"><div class="rk-empty">⏳ Đang tải bảng xếp hạng…</div></div>
    <div class="rk-ft"></div>
  </div>`;
  document.body.append(ov);

  const $ = s => ov.querySelector(s);
  const chipsEl = $('.rk-chips'), arrL = $('[data-sc="-1"]'), arrR = $('[data-sc="1"]');
  const syncArr = () => {
    if (!chipsEl) return;
    const max = chipsEl.scrollWidth - chipsEl.clientWidth;
    arrL.hidden = chipsEl.scrollLeft <= 4;
    arrR.hidden = max <= 4 || chipsEl.scrollLeft >= max - 4;
  };
  chipsEl.addEventListener('scroll', syncArr, { passive: true });
  chipsEl.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); chipsEl.scrollLeft += e.deltaY; } }, { passive: false });
  arrL.onclick = () => { chipsEl.scrollLeft -= 180; };
  arrR.onclick = () => { chipsEl.scrollLeft += 180; };
  setTimeout(syncArr, 40);
  const close = () => { ov.remove(); removeEventListener('keydown', onKey, true); };
  const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  addEventListener('keydown', onKey, true);

  const draw = () => {
    ov.querySelectorAll('.rk-tabs button').forEach(b => b.setAttribute('aria-pressed', b.dataset.by === by));
    ov.querySelectorAll('.rk-chips button').forEach(b => b.setAttribute('aria-pressed', b.dataset.g === game));
    const listEl = $('.rk-list'), ftEl = $('.rk-ft');
    const u = auth.user();
    if (loading) {
      listEl.innerHTML = '<div class="rk-empty">⏳ Đang tải bảng xếp hạng…</div>';
      ftEl.innerHTML = '<span>Đang đồng bộ dữ liệu…</span>';
      return;
    }
    if (!data || !data.ok) {
      listEl.innerHTML = `<div class="rk-empty">${esc(data?.msg || 'Không tải được bảng xếp hạng – thử lại sau nha.')}</div>`;
      ftEl.innerHTML = `<button type="button" class="rk-btn" data-retry>🔄 Thử lại</button>`;
      return;
    }
    const list = data.list || [];
    if (!list.length) {
      listEl.innerHTML = `<div class="rk-empty">Chưa có ai trên bảng ${game === 'all' ? 'này' : esc(GAME_NAMES[game] || game)} 🥲<br>Chơi thắng 1 ván và đăng nhập để mở hàng top 1 nha!</div>`;
    } else {
      listEl.innerHTML = list.map(r => {
        const isMe = u && r.id === u.id;
        const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : '#' + r.rank;
        const topCls = r.rank <= 3 ? ' top' + r.rank : '';
        const mainVal = by === 'streak' ? `🔥 ${r.best} ván` : by === 'wins' ? `🏆 ${r.w} thắng` : `⭐ ${r.xp} XP`;
        const subVal = by === 'streak' ? `${r.w} thắng · ${r.p} ván` : by === 'wins' ? `Tỉ lệ ${r.rate}% · ${r.p} ván` : `${r.w} thắng · ${r.p} ván (${r.rate}%)`;
        return `<div class="rk-row${topCls}${isMe ? ' me' : ''}" data-uid="${r.id}" data-uname="${esc(r.username || '')}" data-name="${esc(r.name)}">
          <span class="rk-no${r.rank <= 3 ? ' medal' : ''}">${medal}</span>
          ${avFor(r)}
          <div class="rk-inf">
            <div class="rk-nm"><span>${esc(r.name)}</span>${r.username ? `<small>@${esc(r.username)}</small>` : ''}<span class="rk-lv">Cấp ${r.lv}</span>${isMe ? '<span class="rk-lv" style="background:#C9BDF3;color:#4A3E5C">Bạn</span>' : ''}${r.title ? `<span class="rk-tt" tabindex="0" role="button" data-iicon="${esc(r.title.icon)}" data-iname="${esc(r.title.name)}" data-ihow="${esc(titleHow(r.title))}" data-istate="✅ Đã đạt">${esc(r.title.icon)} ${esc(r.title.name)}</span>` : ''}</div>
            <div class="rk-sub">${subVal}</div>
          </div>
          <div class="rk-val"><b>${mainVal}</b><small>${by === 'xp' ? `🔥 chuỗi ${r.best}` : `⭐ ${r.xp} XP`}</small></div>
        </div>`;
      }).join('');
    }
    if (!u) {
      ftEl.innerHTML = `<span>Đăng nhập để lưu điểm &amp; ghi tên lên bảng xếp hạng!</span><button type="button" class="rk-btn" data-login>🔑 Đăng nhập</button>`;
    } else if (data.me) {
      const m = data.me;
      ftEl.innerHTML = `<span>Hạng của bạn: <b>#${m.rank}</b>/${data.total} · 🏆 ${m.w} thắng · ⭐ ${m.xp} XP</span><span style="color:#2e8b57">✓ Đã đồng bộ</span>`;
    } else {
      ftEl.innerHTML = `<span>Bạn chưa có trận nào ở mục này – vào chơi 1 ván là lên bảng ngay! 🎲</span>`;
    }
    ov.querySelectorAll('[data-iname]').forEach(el => attachInfo(el, () => ({ icon: el.dataset.iicon || '🏅', name: el.dataset.iname, how: el.dataset.ihow, state: el.dataset.istate || '' }))); /* ℹ️ gắn lại bong bóng thông tin sau mỗi lần vẽ lại */
  };

  let reqId = 0;
  const fetchBoard = async () => {
    const id = ++reqId;
    loading = true; draw();
    const res = await leaderboard(game, by);
    if (id !== reqId) return;
    loading = false; data = res; draw();
  };

  ov.addEventListener('click', e => {
    if (e.target === ov || e.target.closest('.rk-x')) return close();
    const byBtn = e.target.closest('[data-by]');
    if (byBtn) { by = byBtn.dataset.by; fetchBoard(); return; }
    const gBtn = e.target.closest('[data-g]');
    if (gBtn) {
      game = gBtn.dataset.g;
      if (game !== 'all' && by === 'xp') by = 'wins';
      fetchBoard(); return;
    }
    if (e.target.closest('[data-login]')) { openLogin(); return; }
    if (e.target.closest('[data-retry]')) { fetchBoard(); return; }
    const row = e.target.closest('.rk-row');
    if (row) { /* bấm một dòng: mở hồ sơ công khai của người đó (trong hồ sơ có nút kết bạn / nhắn tin) */
      const uid = +row.dataset.uid || 0;
      if (uid) import('./member.js?v=1').then(m => m.openMember(uid));
    }
  });

  if (auth.user()) syncNow().then(fetchBoard).catch(fetchBoard);
  else fetchBoard();
  const offAuth = auth.onChange(() => { if (!document.body.contains(ov)) { offAuth(); return; } if (auth.user()) syncNow().then(fetchBoard).catch(fetchBoard); else fetchBoard(); });
}
