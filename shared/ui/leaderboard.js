// 🏆 Bảng xếp hạng toàn server GumballZ: lọc theo Tất cả game hoặc từng game, xếp theo Điểm XP / Ván thắng.
// Chuỗi thắng không còn tab riêng (patch -156, user dặn): chỉ hiện số phụ "🔥 chuỗi X" trong mỗi hàng.
// Bấm vào bất kỳ người chơi nào trên bảng để mở hồ sơ công khai của họ (trong hồ sơ có nút kết bạn / nhắn tin).
import { auth, leaderboard } from '../net/api.js?v=29';
import { GAME_NAMES } from './stats.js?v=91';
import { AVATARS, avatarHTML, safeAv, nameStyle, nameClass, ownerBadge, adminBadge, modBadge, supporterBadge, vipBadge, devBadge, newbieBadge, ownName } from './profile.js?v=58';
import { openLogin } from './account.js?v=53';
import { syncNow } from './sync.js?v=49';
import { ALL_TITLES, GAME_WINS } from '../titles.js?v=6';
import { attachInfo } from './infopop.js?v=1'; /* ℹ️ chạm (mobile) / rê chuột (desktop) vào danh hiệu để xem cách nhận */
import { ensureSkCSS, skRanks, skPodium } from './skeleton.js?v=1'; /* 💀 skeleton loading: bục top 3 + hàng xếp hạng tới khi máy chủ trả dữ liệu */
const titleHow = t => { if (!t) return ''; if (t.id && String(t.id).startsWith('g-')) { const g = String(t.id).slice(2); return `Thắng ${GAME_WINS} ván ${GAME_NAMES[g] || g}`; } const f = ALL_TITLES.find(x => x.id === t.id); return f ? f.desc : (t.desc || ''); };

const BG = ['#ff7a8a,#ffb23d', '#7b61ff,#3d8bff', '#2fc76f,#8fe3a8', '#ff9a3d,#ffd166', '#ff5fa2,#b06bff', '#3dc7d6,#3d8bff'];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CSS = `
.rk-ov{position:fixed;inset:0;z-index:9998;background:var(--overlay);display:grid;place-items:center;padding:12px;backdrop-filter:blur(4px);animation:rk-f .16s ease-out;font:600 14.5px/1.4 Nunito,system-ui,sans-serif;color:var(--ink)}
@keyframes rk-f{from{opacity:0}}@keyframes rk-p{from{opacity:0;transform:translateY(10px) scale(.97)}}
.rk-box{width:min(580px,100%);max-height:calc(100dvh - 24px);display:flex;flex-direction:column;background:var(--card);border:2px solid var(--ink);border-radius:26px;box-shadow:var(--sh);overflow:hidden;animation:rk-p .22s cubic-bezier(.2,1.2,.4,1)}
.rk-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 18px 10px;background:var(--card);border-bottom:2px solid var(--ink);color:var(--ink)}
.rk-hd h2{margin:0;font:800 22px/1.1 "Baloo 2",Nunito,sans-serif;display:flex;align-items:center;gap:8px}
.rk-hd small{display:block;font:700 12.5px Nunito,sans-serif;opacity:.92}
.rk-x{width:44px;height:44px;border-radius:50%;border:2px solid var(--ink);background:var(--card);color:var(--ink);font:800 16px Nunito;cursor:pointer;flex:none;box-shadow:var(--sh-sm)}
.rk-tabs{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:12px 14px 6px;background:var(--card)}
.rk-tabs button{border:2px solid var(--ink);background:var(--card);color:var(--ink);border-radius:999px;padding:7px 8px;font:800 13px Nunito,sans-serif;cursor:pointer;transition:transform .1s;box-shadow:var(--sh-sm)}
.rk-tabs button[aria-pressed=true]{background:var(--ink);color:var(--card);border-color:var(--ink)}
.rk-sel-w{padding:4px 14px 10px;background:var(--card);flex:none}
.rk-sel{width:100%;appearance:none;font:800 14px Nunito,sans-serif;color:var(--ink);background:var(--input-bg) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23241A38' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 14px center/11px;border:2px solid var(--ink);border-radius:12px;padding:9px 36px 9px 14px;min-height:44px;cursor:pointer;box-shadow:var(--sh-sm)}
.rk-list{flex:1;min-height:220px;overflow-y:auto;padding:6px 14px 10px;display:flex;flex-direction:column;gap:0}
/* bục top 3: hạng 2 ngọc – hạng 1 vàng cao nhất – hạng 3 tím */
.rk-podium{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;align-items:end;padding:12px 0 6px}
.rk-pd{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;text-align:center;border:2px solid var(--ink);border-radius:16px;padding:14px 6px 12px;box-shadow:var(--sh-sm);cursor:pointer;min-height:118px;justify-content:flex-end}
.rk-pd.rk-p1{background:var(--y1);min-height:150px}
.rk-pd.rk-p2{background:var(--p2)}
.rk-pd.rk-p3{background:var(--p3)}
.rk-pno{font:800 13px Nunito,sans-serif;color:var(--ink)}
.rk-pd .rk-av{width:48px;height:48px;font-size:26px}
.rk-pnm{font:800 14px/1.2 Nunito,sans-serif;color:var(--ink);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rk-pval{font:800 13px Nunito,sans-serif;color:var(--ink)}
.rk-row{display:flex;align-items:center;gap:10px;padding:12px 6px;border:0;border-bottom:2px dashed var(--line);border-radius:0;background:none;cursor:pointer}
.rk-row:hover{background:var(--bg)}
.rk-row.me{background:#FFF3D6}
.rk-no{width:30px;text-align:center;font:800 16px "Baloo 2",Nunito,sans-serif;color:var(--muted);flex:none}
.rk-av{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-size:22px;flex:none;box-shadow:inset 0 -2px 0 #0002}
.rk-inf{flex:1;min-width:0}
.rk-nm{font:800 15px/1.2 Nunito,sans-serif;color:var(--ink);display:flex;align-items:center;gap:6px; flex-wrap:wrap}
.rk-nm small{font:700 12px Nunito,sans-serif;color:var(--muted)}
.rk-lv{display:inline-block;padding:1px 7px;border-radius:999px;background:var(--line);color:var(--muted);font:800 11px Nunito,sans-serif}
.rk-tt{display:inline-flex;align-items:center;gap:4px;padding:0 8px;border-radius:999px;background:var(--y2);color:var(--on-accent);font:800 11px/1.7 Nunito,sans-serif;box-shadow:inset 0 0 0 1px #f0c040;white-space:nowrap}
.rk-sub{font:700 12px Nunito,sans-serif;color:var(--muted);margin-top:2px}
.rk-val{text-align:right;flex:none}
.rk-val b{display:block;font:800 16px/1.1 "Baloo 2",Nunito,sans-serif;color:var(--ink)}
.rk-val small{font:700 11.5px Nunito,sans-serif;color:var(--muted)}
.rk-empty{padding:36px 16px;text-align:center;color:var(--muted);font-weight:700}
.rk-ft{padding:10px 14px;background:var(--bg);border-top:2px solid var(--ink);display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px;font-weight:800}
.rk-ft b{color:var(--ink)}
.rk-btn{border:2px solid var(--ink);border-radius:999px;padding:7px 14px;font:400 13px "Baloo 2",Nunito,sans-serif;background:var(--y1);color:var(--on-accent);cursor:pointer;flex:none;box-shadow:var(--sh-sm)}
/* ---------- trang riêng /xephang/ (patch -150): bảng hiện trực tiếp trên trang, không còn khung modal ----------
   .rk-page là phần tử chứa bảng trên trang: hộp rộng hơn, không giới hạn chiều cao, danh sách cuộn theo trang. */
.rk-page .rk-box{width:min(1180px,100%);max-height:none;overflow:visible;margin:0 auto;scroll-margin-top:70px}
.rk-page .rk-list{overflow:visible;flex:none}
.rk-page .rk-hd{display:none} /* trang riêng có H1 của trang, không cần tiêu đề trong hộp nữa */
/* ---------- thiết kế lại BXH (patch -152): podium + hàng rõ tầng + tab/lọc dính khi cuộn ----------
   Chỉ áp cho trang riêng (.rk-page); modal cũ giữ nguyên. Giữ token neobrutalism, tối tự theo token. */
/* tab + lọc dính dưới topbar (58px) khi cuộn — bọc chung 1 khối nên không cần tính chiều cao từng phần */
.rk-page .rk-stick{position:sticky;top:58px;z-index:5;background:var(--card);border-bottom:2px solid var(--line)}
/* podium nổi bật hơn: bục cao hơn, avatar to hơn, hạng 1 có vương miện */
.rk-page .rk-pd{min-height:150px;padding:18px 8px 14px}
.rk-page .rk-pd .rk-av{width:64px;height:64px;font-size:32px}
/* champion spotlight (patch -156): hạng 1 thành thẻ hero lớn nền mực tối, hạng 2–3 thành 2 thẻ nhỏ bên dưới */
.rk-hero{display:flex;align-items:center;gap:16px;background:#241A38;color:#FFF8EE;border:2px solid var(--ink);border-radius:20px;padding:18px 20px;margin:0 14px 10px;box-shadow:var(--sh-sm);cursor:pointer}
.rk-hero-crown{font-size:34px;line-height:1;filter:drop-shadow(0 2px 0 rgba(0,0,0,.35))}
.rk-hero-av{flex:0 0 auto}
.rk-hero-av .rk-av{width:96px;height:96px;font-size:50px;border:3px solid var(--y1);box-shadow:0 0 0 3px rgba(250,205,51,.35)}
.rk-hero-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.rk-hero-rank{font:400 13px/1 "Baloo 2",Nunito,sans-serif;font-weight:800;letter-spacing:.12em;color:var(--y1)}
.rk-hero-nm{font:400 24px/1.1 "Bungee","Baloo 2",Nunito,sans-serif;color:#FFF8EE;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rk-hero-stats{font-size:14px;color:rgba(255,248,238,.82)}
.rk-hero-val{text-align:right;flex:0 0 auto}
.rk-hero-val b{display:block;font:800 22px/1.1 "Baloo 2",Nunito,sans-serif;color:var(--y1)}
.rk-hero-val small{font-size:12px;color:rgba(255,248,238,.7)}
.rk-duo{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 14px 10px}
.rk-duo .rk-pd{min-height:118px;padding:12px 8px 10px}
.rk-duo .rk-pd .rk-av{width:48px;height:48px;font-size:26px}
@media(max-width:640px){.rk-hero{flex-wrap:wrap;gap:10px;padding:14px}.rk-hero-val{text-align:left;width:100%}.rk-hero-nm{font-size:20px}.rk-duo{gap:8px}}
.rk-page .rk-pnm{font-size:16px}
.rk-page .rk-pval{font-size:14px}
/* hàng xếp hạng rõ tầng hơn: số hạng + avatar + chỉ số to hơn, khoảng cách thoáng hơn */
.rk-page .rk-row{padding:14px 10px;gap:12px}
.rk-page .rk-no{width:36px;font-size:20px}
.rk-page .rk-av{width:44px;height:44px;font-size:24px}
.rk-page .rk-val b{font-size:18px}
`;

function injectCss() {
  ensureSkCSS();
  import('./badges.js?v=7').then(m => m.ensureBadgesCSS()).catch(() => {}); /* 🎖️ huân chương 7 bậc (patch -142) */
  if (document.getElementById('rk-css')) return;
  const s = document.createElement('style'); s.id = 'rk-css'; s.textContent = CSS;
  document.head.append(s);
}

function avFor(r, px = 40) {
  if (r.av && (r.av.kind || (r.av.ch && r.av.ch.kind))) return avatarHTML(px, safeAv(r.av, 0)); /* nhân vật 3D đã đồng bộ theo tài khoản */
  if (r.av && AVATARS.includes(r.av.e)) {
    const c = BG[(+r.av.c || 0) % BG.length];
    return `<span class="rk-av" style="width:${px}px;height:${px}px;font-size:${Math.round(px * 0.52)}px;background:linear-gradient(135deg,${c})">${r.av.e}</span>`;
  }
  let h = 0; const s = String(r.name || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const e = AVATARS[Math.abs(h) % AVATARS.length];
  const c = BG[Math.abs(h >> 4) % BG.length];
  return `<span class="rk-av" style="width:${px}px;height:${px}px;font-size:${Math.round(px * 0.52)}px;background:linear-gradient(135deg,${c})">${e}</span>`;
}

/* ---------- cache gọi /leaderboard 30s (patch -152): khớp cache máy chủ, bảng chính + top phụ cùng cần
   all/xp thì chỉ gọi mạng 1 lần (kể cả khi 2 bên gọi cùng lúc — cache cả promise đang bay) ---------- */
const lbCache = new Map();
function lbFetch(game, by) {
  const k = game + '|' + by, hit = lbCache.get(k);
  if (hit && Date.now() - hit.at < 30e3) return hit.p;
  const p = leaderboard(game, by);
  p.catch(() => { if (lbCache.get(k) && lbCache.get(k).p === p) lbCache.delete(k); }); /* gọi lỗi thì không cache để lần sau gọi lại */
  lbCache.set(k, { at: Date.now(), p });
  return p;
}

/* ---------- bảng xếp hạng (patch -150): vẽ vào một phần tử cho trước ----------
   buildBoard(root, {page, initialGame}): modal cũ (page=false, root = overlay .rk-ov) và trang riêng
   /xephang/ (page=true, root = phần tử trên trang) dùng chung logic lấy dữ liệu + vẽ. */
function buildBoard(root, { page = false, initialGame = 'all' } = {}) {
  let game = initialGame && (initialGame === 'all' || GAME_NAMES[initialGame]) ? initialGame : 'all';
  let by = game === 'all' ? 'xp' : 'wins';
  let loading = true, data = null;

  root.innerHTML = `<div class="rk-box"${page ? '' : ' role="dialog" aria-modal="true"'} aria-label="Bảng xếp hạng">
    <div class="rk-hd"><div><h2>Bảng xếp hạng</h2><small>Top cao thủ GumballZ · bấm vào người chơi để kết bạn</small></div>${page ? '' : '<button class="rk-x" aria-label="Đóng">✕</button>'}</div>
    <div class="rk-stick"><div class="rk-tabs" role="tablist">
      <button type="button" data-by="xp" aria-pressed="${by === 'xp'}">⭐ Cấp &amp; XP</button>
      <button type="button" data-by="wins" aria-pressed="${by === 'wins'}">🏆 Ván thắng</button>
    </div>
    <div class="rk-sel-w"><select class="rk-sel" aria-label="Chọn game">
      <option value="all">Tất cả game</option>
      ${Object.entries(GAME_NAMES).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}
    </select></div></div>
    <div class="rk-list">${skPodium()}${skRanks(5)}</div>
    <div class="rk-ft"></div>
  </div>`;

  const $ = s => root.querySelector(s);
  const selEl = $('.rk-sel');
  selEl.addEventListener('change', () => {
    game = selEl.value;
    if (game !== 'all' && by === 'xp') by = 'wins';
    fetchBoard();
  });
  const close = () => { if (page) return; root.remove(); removeEventListener('keydown', onKey, true); };
  const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  if (!page) addEventListener('keydown', onKey, true);

  const draw = () => {
    root.querySelectorAll('.rk-tabs button').forEach(b => b.setAttribute('aria-pressed', b.dataset.by === by));
    const sel = $('.rk-sel'); if (sel) sel.value = game;
    const listEl = $('.rk-list'), ftEl = $('.rk-ft');
    const u = auth.user();
    if (loading) {
      listEl.innerHTML = skPodium() + skRanks(5);
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
      /* spotlight quán quân (patch -156): hạng 1 thành thẻ hero lớn riêng phía trên, hạng 2–3 thành 2 thẻ nhỏ, các hạng 4+ là danh sách thường */
      const pdVal = r => by === 'wins' ? `${r.w} thắng` : `${r.xp} XP`;
      const pd = r => { const isMe = u && r.id === u.id; return `<div class="rk-pd rk-p${r.rank}${isMe ? ' me' : ''}" data-uid="${r.id}" data-uname="${esc(r.username || '')}" data-name="${esc(r.name)}"><span class="rk-pno">#${r.rank}</span>${avFor(r)}<b class="rk-pnm${nameClass(r.av)}" style="${nameStyle(r.av)}">${esc(r.name)}</b><span class="rk-pval">${pdVal(r)}</span></div>`; };
      const heroStats = r => `⭐ ${r.xp} XP · 🏆 ${r.w} thắng · 🎯 ${r.rate}% · 🔥 chuỗi ${r.best}`;
      const r1 = list[0], r2 = list[1], r3 = list[2], rest = list.slice(3);
      const hero = r1 ? `<div class="rk-hero" data-uid="${r1.id}" data-uname="${esc(r1.username || '')}" data-name="${esc(r1.name)}"><span class="rk-hero-crown" aria-hidden="true">👑</span><div class="rk-hero-av">${avFor(r1, 96)}</div><div class="rk-hero-info"><span class="rk-hero-rank">🏆 QUÁN QUÂN</span><b class="rk-hero-nm${nameClass(r1.av)}" style="${nameStyle(r1.av)}">${esc(r1.name)}</b><span class="rk-hero-stats">${heroStats(r1)}</span></div><div class="rk-hero-val"><b>${pdVal(r1)}</b><small>${by === 'wins' ? 'Ván thắng' : 'Điểm XP'}</small></div></div>` : '';
      const duo = (r2 || r3) ? `<div class="rk-duo">${[r2, r3].filter(Boolean).map(pd).join('')}</div>` : '';
      listEl.innerHTML = hero + duo + rest.map(r => {
        const isMe = u && r.id === u.id;
        const mainVal = by === 'wins' ? `🏆 ${r.w} thắng` : `⭐ ${r.xp} XP`;
        const subVal = by === 'wins' ? `Tỉ lệ ${r.rate}% · ${r.p} ván` : `${r.w} thắng · ${r.p} ván (${r.rate}%)`;
        return `<div class="rk-row${isMe ? ' me' : ''}" data-uid="${r.id}" data-uname="${esc(r.username || '')}" data-name="${esc(r.name)}">
          <span class="rk-no">#${r.rank}</span>
          ${avFor(r)}
          <div class="rk-inf">
            <div class="rk-nm"><span class="${nameClass(r.av)}${ownName(r.owner)}" style="${nameStyle(r.av)}">${esc(r.name)}</span>${ownerBadge(r.owner)}${!r.owner && r.admin ? adminBadge(true) : ''}${modBadge(r.mod)}${supporterBadge(r.supporter)}${vipBadge(r.vip)}${devBadge(r.dev)}${newbieBadge(r.lv === 1 && !r.owner && !r.admin && !r.mod)}${r.username ? `<small>@${esc(r.username)}</small>` : ''}<span class="rk-lv">Cấp ${r.lv}</span>${isMe ? '<span class="rk-lv" style="background:var(--p3);color:var(--on-accent)">Bạn</span>' : ''}${r.title ? `<span class="rk-tt" tabindex="0" role="button" data-iicon="${esc(r.title.icon)}" data-iname="${esc(r.title.name)}" data-ihow="${esc(titleHow(r.title))}" data-istate="✅ Đã đạt">${esc(r.title.icon)} ${esc(r.title.name)}</span>` : ''}</div>
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
    root.querySelectorAll('[data-iname]').forEach(el => attachInfo(el, () => ({ icon: el.dataset.iicon || '🏅', name: el.dataset.iname, how: el.dataset.ihow, state: el.dataset.istate || '' }))); /* ℹ️ gắn lại bong bóng thông tin sau mỗi lần vẽ lại */
  };

  let reqId = 0;
  const fetchBoard = async () => {
    const id = ++reqId;
    loading = true; draw();
    const res = await lbFetch(game, by);
    if (id !== reqId) return;
    loading = false; data = res; draw();
  };

  root.addEventListener('click', e => {
    if (!page && (e.target === root || e.target.closest('.rk-x'))) return close();
    const byBtn = e.target.closest('[data-by]');
    if (byBtn) { by = byBtn.dataset.by; fetchBoard(); return; }
    if (e.target.closest('[data-login]')) { openLogin(); return; }
    if (e.target.closest('[data-retry]')) { fetchBoard(); return; }
    const row = e.target.closest('.rk-row,.rk-pd,.rk-hero');
    if (row) { /* bấm một dòng / một khối bục: mở hồ sơ công khai của người đó (trong hồ sơ có nút kết bạn / nhắn tin) */
      const uid = +row.dataset.uid || 0;
      if (uid) import('./member.js?v=6').then(m => m.openMember(uid));
    }
  });

  if (auth.user()) syncNow().then(fetchBoard).catch(fetchBoard);
  else fetchBoard();
  const offAuth = auth.onChange(() => { if (!document.body.contains(root)) { offAuth(); return; } if (auth.user()) syncNow().then(fetchBoard).catch(fetchBoard); else fetchBoard(); });

  /* ---------- điều khiển bảng từ bên ngoài (patch -152): các top phụ gọi setBoard để mở bảng chính ----------
     Ghi lại trên root để mountLeaderboardPage trả về cho trang. */
  root._rkCtl = { setBoard(g, b) { if (g) game = g; if (b) by = b; if (by === 'streak') by = 'wins'; /* tab Chuỗi thắng đã bỏ (patch -156) */ if (game !== 'all' && by === 'xp') by = 'wins'; const sel = $('.rk-sel'); if (sel) sel.value = game; fetchBoard(); const box = root.querySelector('.rk-box'); if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' }); } };
}

/* patch -150: BXH giờ là trang riêng /xephang/ — không mở modal nữa. Giữ export để code cũ
   (topbar/footer/lobby/homebtn) gọi tới vẫn đúng: chuyển trang, giữ ?game= khi mở theo game. */
export function openLeaderboard(initialGame = 'all') {
  const u = new URL('../../xephang/', import.meta.url);
  if (initialGame && initialGame !== 'all' && GAME_NAMES[initialGame]) u.searchParams.set('game', initialGame);
  location.href = u.href;
}

/* Vẽ bảng xếp hạng vào một phần tử trên trang /xephang/ (không phải modal).
   Trả về bộ điều khiển { setBoard(game, by) } để các top phụ mở bảng chính (patch -152). */
export function mountLeaderboardPage(rootEl, initialGame = 'all') {
  if (!rootEl) return null;
  injectCss();
  rootEl.classList.add('rk-page');
  buildBoard(rootEl, { page: true, initialGame });
  return rootEl._rkCtl || null;
}

/* ---------- các top phụ dưới bảng chính (patch -152): CHỈ dùng trường có sẵn trong payload /leaderboard ----------
   Mỗi entry có: id, username, name, p (ván), w (thắng), xp, lv, best (chuỗi thắng tốt nhất), rate (tỉ lệ thắng %),
   av, title, owner/admin/mod/supporter/vip/dev, rank. KHÔNG có:
   - created (máy chủ xoá trước khi trả) → KHÔNG làm Top người mới;
   - xu (ví không nằm trong payload) → KHÔNG làm Top giàu xu;
   - lịch sử hạng → KHÔNG làm Top tăng hạng.
   4 top làm được: chơi nhiều nhất (p), tỉ lệ thắng (rate, chỉ tính người chơi ≥10 ván để 1 ván 100%
   không chiếm top), Cờ Tỷ Phú (game=typhu, by=wins), Cờ Tướng (game=cotuong, by=wins). */
export function subTopLists(allList, typhuList, cotuongList) {
  const all = Array.isArray(allList) ? allList : [];
  const byP = [...all].sort((a, b) => (b.p || 0) - (a.p || 0) || (b.w || 0) - (a.w || 0)).slice(0, 5);
  const byRate = [...all].filter(r => (r.p || 0) >= 10).sort((a, b) => (b.rate || 0) - (a.rate || 0) || (b.w || 0) - (a.w || 0)).slice(0, 5);
  return {
    plays: byP,
    rate: byRate,
    typhu: (Array.isArray(typhuList) ? typhuList : []).slice(0, 5),
    cotuong: (Array.isArray(cotuongList) ? cotuongList : []).slice(0, 5),
  };
}

/* Vẽ 4 top phụ (top 5 mỗi mục) dưới bảng chính — chỉ dùng ở trang riêng /xephang/, không vào modal.
   boardCtl = giá trị mountLeaderboardPage trả về (có setBoard) để nút "Xem tất cả" mở bảng chính. */
export async function mountSubTops(rootEl, boardCtl) {
  if (!rootEl) return;
  injectCss();
  const SUBS = [
    { key: 'plays', icon: '🎲', name: 'Top chơi nhiều nhất', sub: 'Tính theo số ván đã chơi', val: r => [`${r.p || 0} ván`, `${r.w || 0} thắng`], go: ['all', 'xp'], goLabel: 'Xem bảng XP →' },
    { key: 'rate', icon: '🎯', name: 'Top tỉ lệ thắng', sub: 'Chỉ tính người chơi ≥ 10 ván', val: r => [`${r.rate || 0}%`, `${r.w || 0}/${r.p || 0} thắng`], go: ['all', 'wins'], goLabel: 'Xem bảng thắng →' },
    { key: 'typhu', icon: '🏙️', name: 'Top Cờ Tỷ Phú', sub: 'Game hot nhất sảnh', val: r => [`${r.w || 0} thắng`, `Tỉ lệ ${r.rate || 0}% · ${r.p || 0} ván`], go: ['typhu', 'wins'], goLabel: 'Xem BXH Cờ Tỷ Phú →' },
    { key: 'cotuong', icon: '♟️', name: 'Top Cờ Tướng', sub: 'Cờ truyền thống', val: r => [`${r.w || 0} thắng`, `Tỉ lệ ${r.rate || 0}% · ${r.p || 0} ván`], go: ['cotuong', 'wins'], goLabel: 'Xem BXH Cờ Tướng →' },
  ];
  const cardShell = s => `<div class="rk-sub" data-sub="${s.key}"><div class="rk-sub-hd"><span aria-hidden="true">${s.icon}</span><b>${s.name}</b><small>${s.sub}</small></div><div class="rk-sub-body"><div class="rk-sub-empty">Đang tải…</div></div><button type="button" class="rk-sub-more" data-go="${s.key}">${s.goLabel}</button></div>`;
  rootEl.innerHTML = `<section class="rk-subs" aria-label="Các top khác"><h2 class="rk-subs-h">🏅 Các top khác</h2><p class="rk-subs-sub">Top 5 mỗi mục — bấm vào người chơi để xem hồ sơ, bấm “Xem tất cả” để mở bảng chính.</p><div class="rk-subs-grid">${SUBS.map(cardShell).join('')}</div></section>`;
  const drawList = (key, list) => {
    const card = rootEl.querySelector(`.rk-sub[data-sub="${key}"] .rk-sub-body`);
    if (!card) return;
    const def = SUBS.find(s => s.key === key);
    if (!list || !list.length) { card.innerHTML = `<div class="rk-sub-empty">Chưa có ai ở mục này — vào chơi 1 ván là lên top ngay! 🎲</div>`; return; }
    card.innerHTML = list.map((r, i) => { const [v, sv] = def.val(r); return `<button type="button" class="rk-sub-row" data-uid="${r.id}"><span class="rk-sub-no">#${i + 1}</span>${avFor(r)}<span class="rk-sub-nm">${esc(r.name)}</span><span class="rk-sub-val">${esc(v)}<small>${esc(sv)}</small></span></button>`; }).join('');
  };
  rootEl.addEventListener('click', e => {
    const more = e.target.closest('[data-go]');
    if (more) { const def = SUBS.find(s => s.key === more.dataset.go); if (def && boardCtl && boardCtl.setBoard) boardCtl.setBoard(def.go[0], def.go[1]); return; }
    const row = e.target.closest('.rk-sub-row');
    if (row && +row.dataset.uid) import('./member.js?v=6').then(m => m.openMember(+row.dataset.uid));
  });
  try {
    const [allRes, tyRes, coRes] = await Promise.all([lbFetch('all', 'xp'), lbFetch('typhu', 'wins'), lbFetch('cotuong', 'wins')]);
    const tops = subTopLists(allRes && allRes.ok ? allRes.list : [], tyRes && tyRes.ok ? tyRes.list : [], coRes && coRes.ok ? coRes.list : []);
    for (const s of SUBS) drawList(s.key, tops[s.key]);
  } catch (err) {
    rootEl.querySelectorAll('.rk-sub-body').forEach(b => { b.innerHTML = `<div class="rk-sub-empty">Không tải được top phụ – thử lại sau nha.</div>`; });
  }
}
