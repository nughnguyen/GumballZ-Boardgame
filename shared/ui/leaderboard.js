// 🏆 Bảng xếp hạng toàn server GumballZ: lọc theo Tất cả game hoặc từng game, xếp theo Điểm XP / Ván thắng / Chuỗi thắng.
// Bấm vào bất kỳ người chơi nào trên bảng để mở hồ sơ công khai của họ (trong hồ sơ có nút kết bạn / nhắn tin).
import { auth, leaderboard } from '../net/api.js?v=29';
import { GAME_NAMES } from './stats.js?v=89';
import { AVATARS, avatarHTML, safeAv, nameStyle, nameClass, ownerBadge, adminBadge, modBadge, supporterBadge, ownName } from './profile.js?v=53';
import { openLogin } from './account.js?v=50';
import { syncNow } from './sync.js?v=49';
import { ALL_TITLES, GAME_WINS } from '../titles.js?v=5';
import { attachInfo } from './infopop.js?v=1'; /* ℹ️ chạm (mobile) / rê chuột (desktop) vào danh hiệu để xem cách nhận */
import { ensureSkCSS, skRanks, skPodium } from './skeleton.js?v=1'; /* 💀 skeleton loading: bục top 3 + hàng xếp hạng tới khi máy chủ trả dữ liệu */
const titleHow = t => { if (!t) return ''; if (t.id && String(t.id).startsWith('g-')) { const g = String(t.id).slice(2); return `Thắng ${GAME_WINS} ván ${GAME_NAMES[g] || g}`; } const f = ALL_TITLES.find(x => x.id === t.id); return f ? f.desc : (t.desc || ''); };

const BG = ['#ff7a8a,#ffb23d', '#7b61ff,#3d8bff', '#2fc76f,#8fe3a8', '#ff9a3d,#ffd166', '#ff5fa2,#b06bff', '#3dc7d6,#3d8bff'];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CSS = `
.rk-ov{position:fixed;inset:0;z-index:9998;background:#241A38;display:grid;place-items:center;padding:12px;backdrop-filter:blur(4px);animation:rk-f .16s ease-out;font:600 14.5px/1.4 Nunito,system-ui,sans-serif;color:#241A38}
@keyframes rk-f{from{opacity:0}}@keyframes rk-p{from{opacity:0;transform:translateY(10px) scale(.97)}}
.rk-box{width:min(580px,100%);max-height:calc(100dvh - 24px);display:flex;flex-direction:column;background:#FFFDF9;border:2px solid #241A38;border-radius:26px;box-shadow:4px 4px 0 #241A38;overflow:hidden;animation:rk-p .22s cubic-bezier(.2,1.2,.4,1)}
.rk-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 18px 10px;background:#FFFDF9;border-bottom:2px solid #241A38;color:#241A38}
.rk-hd h2{margin:0;font:800 22px/1.1 "Baloo 2",Nunito,sans-serif;display:flex;align-items:center;gap:8px}
.rk-hd small{display:block;font:700 12.5px Nunito,sans-serif;opacity:.92}
.rk-x{width:44px;height:44px;border-radius:50%;border:2px solid #241A38;background:#FFFDF9;color:#241A38;font:800 16px Nunito;cursor:pointer;flex:none;box-shadow:3px 3px 0 #241A38}
.rk-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px 14px 6px;background:#FFFDF9}
.rk-tabs button{border:2px solid #241A38;background:#FFFDF9;color:#241A38;border-radius:999px;padding:7px 8px;font:800 13px Nunito,sans-serif;cursor:pointer;transition:transform .1s;box-shadow:3px 3px 0 #241A38}
.rk-tabs button[aria-pressed=true]{background:#241A38;color:#FFFDF9;border-color:#241A38}
.rk-sel-w{padding:4px 14px 10px;background:#FFFDF9;flex:none}
.rk-sel{width:100%;appearance:none;font:800 14px Nunito,sans-serif;color:#241A38;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23241A38' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 14px center/11px;border:2px solid #241A38;border-radius:12px;padding:9px 36px 9px 14px;min-height:44px;cursor:pointer;box-shadow:3px 3px 0 #241A38}
.rk-list{flex:1;min-height:220px;overflow-y:auto;padding:6px 14px 10px;display:flex;flex-direction:column;gap:0}
/* bục top 3: hạng 2 ngọc – hạng 1 vàng cao nhất – hạng 3 tím */
.rk-podium{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;align-items:end;padding:12px 0 6px}
.rk-pd{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;text-align:center;border:2px solid #241A38;border-radius:16px;padding:14px 6px 12px;box-shadow:3px 3px 0 #241A38;cursor:pointer;min-height:118px;justify-content:flex-end}
.rk-pd.rk-p1{background:#FACD33;min-height:150px}
.rk-pd.rk-p2{background:#2EC5B6}
.rk-pd.rk-p3{background:#B9A6FF}
.rk-pno{font:800 13px Nunito,sans-serif;color:#241A38}
.rk-pd .rk-av{width:48px;height:48px;font-size:26px}
.rk-pnm{font:800 14px/1.2 Nunito,sans-serif;color:#241A38;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rk-pval{font:800 13px Nunito,sans-serif;color:#241A38}
.rk-row{display:flex;align-items:center;gap:10px;padding:12px 6px;border:0;border-bottom:2px dashed #E5DCC8;border-radius:0;background:none;cursor:pointer}
.rk-row:hover{background:#FFF8EE}
.rk-row.me{background:#FFF3D6}
.rk-no{width:30px;text-align:center;font:800 16px "Baloo 2",Nunito,sans-serif;color:#8B7E9E;flex:none}
.rk-av{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-size:22px;flex:none;box-shadow:inset 0 -2px 0 #0002}
.rk-inf{flex:1;min-width:0}
.rk-nm{font:800 15px/1.2 Nunito,sans-serif;color:#241A38;display:flex;align-items:center;gap:6px; flex-wrap:wrap}
.rk-nm small{font:700 12px Nunito,sans-serif;color:#8B7E9E}
.rk-lv{display:inline-block;padding:1px 7px;border-radius:999px;background:#efe6da;color:#8B7E9E;font:800 11px Nunito,sans-serif}
.rk-tt{display:inline-flex;align-items:center;gap:4px;padding:0 8px;border-radius:999px;background:#FFE9A8;color:#241A38;font:800 11px/1.7 Nunito,sans-serif;box-shadow:inset 0 0 0 1px #f0c040;white-space:nowrap}
.rk-sub{font:700 12px Nunito,sans-serif;color:#8B7E9E;margin-top:2px}
.rk-val{text-align:right;flex:none}
.rk-val b{display:block;font:800 16px/1.1 "Baloo 2",Nunito,sans-serif;color:#241A38}
.rk-val small{font:700 11.5px Nunito,sans-serif;color:#8B7E9E}
.rk-empty{padding:36px 16px;text-align:center;color:#8B7E9E;font-weight:700}
.rk-ft{padding:10px 14px;background:#FFF8EE;border-top:2px solid #241A38;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px;font-weight:800}
.rk-ft b{color:#241A38}
.rk-btn{border:2px solid #241A38;border-radius:999px;padding:7px 14px;font:400 13px "Baloo 2",Nunito,sans-serif;background:#FACD33;color:#241A38;cursor:pointer;flex:none;box-shadow:3px 3px 0 #241A38}
`;

function injectCss() {
  ensureSkCSS();
  import('./badges.js?v=1').then(m => m.ensureBadgesCSS()).catch(() => {}); /* 🎖️ huy hiệu 4 bậc (patch -95) */
  if (document.getElementById('rk-css')) return;
  const s = document.createElement('style'); s.id = 'rk-css'; s.textContent = CSS;
  document.head.append(s);
}

function avFor(r) {
  if (r.av && (r.av.kind || (r.av.ch && r.av.ch.kind))) return avatarHTML(40, safeAv(r.av, 0)); /* nhân vật 3D đã đồng bộ theo tài khoản */
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
    <div class="rk-hd"><div><h2>Bảng xếp hạng</h2><small>Top cao thủ GumballZ · bấm vào người chơi để kết bạn</small></div><button class="rk-x" aria-label="Đóng">✕</button></div>
    <div class="rk-tabs" role="tablist">
      <button type="button" data-by="xp" aria-pressed="${by === 'xp'}">⭐ Cấp &amp; XP</button>
      <button type="button" data-by="wins" aria-pressed="${by === 'wins'}">🏆 Ván thắng</button>
      <button type="button" data-by="streak" aria-pressed="${by === 'streak'}">🔥 Chuỗi thắng</button>
    </div>
    <div class="rk-sel-w"><select class="rk-sel" aria-label="Chọn game">
      <option value="all">Tất cả game</option>
      ${Object.entries(GAME_NAMES).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}
    </select></div>
    <div class="rk-list">${skPodium()}${skRanks(5)}</div>
    <div class="rk-ft"></div>
  </div>`;
  document.body.append(ov);

  const $ = s => ov.querySelector(s);
  const selEl = $('.rk-sel');
  selEl.addEventListener('change', () => {
    game = selEl.value;
    if (game !== 'all' && by === 'xp') by = 'wins';
    fetchBoard();
  });
  const close = () => { ov.remove(); removeEventListener('keydown', onKey, true); };
  const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  addEventListener('keydown', onKey, true);

  const draw = () => {
    ov.querySelectorAll('.rk-tabs button').forEach(b => b.setAttribute('aria-pressed', b.dataset.by === by));
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
      /* bục top 3 (thứ tự hiển thị: hạng 2 – hạng 1 – hạng 3), các hạng 4+ là danh sách thường */
      const pdVal = r => by === 'streak' ? `${r.best} ván` : by === 'wins' ? `${r.w} thắng` : `${r.xp} XP`;
      const pd = r => { const isMe = u && r.id === u.id; return `<div class="rk-pd rk-p${r.rank}${isMe ? ' me' : ''}" data-uid="${r.id}" data-uname="${esc(r.username || '')}" data-name="${esc(r.name)}"><span class="rk-pno">#${r.rank}</span>${avFor(r)}<b class="rk-pnm${nameClass(r.av && r.av.n)}" style="${nameStyle(r.av && r.av.n)}">${esc(r.name)}</b><span class="rk-pval">${pdVal(r)}</span></div>`; };
      const top3 = list.slice(0, 3), rest = list.slice(3);
      const podium = top3.length ? `<div class="rk-podium">${[top3[1], top3[0], top3[2]].filter(Boolean).map(pd).join('')}</div>` : '';
      listEl.innerHTML = podium + rest.map(r => {
        const isMe = u && r.id === u.id;
        const mainVal = by === 'streak' ? `🔥 ${r.best} ván` : by === 'wins' ? `🏆 ${r.w} thắng` : `⭐ ${r.xp} XP`;
        const subVal = by === 'streak' ? `${r.w} thắng · ${r.p} ván` : by === 'wins' ? `Tỉ lệ ${r.rate}% · ${r.p} ván` : `${r.w} thắng · ${r.p} ván (${r.rate}%)`;
        return `<div class="rk-row${isMe ? ' me' : ''}" data-uid="${r.id}" data-uname="${esc(r.username || '')}" data-name="${esc(r.name)}">
          <span class="rk-no">#${r.rank}</span>
          ${avFor(r)}
          <div class="rk-inf">
            <div class="rk-nm"><span class="${nameClass(r.av && r.av.n)}${ownName(r.owner)}" style="${nameStyle(r.av && r.av.n)}">${esc(r.name)}</span>${ownerBadge(r.owner)}${!r.owner && r.admin ? adminBadge(true) : ''}${modBadge(r.mod)}${supporterBadge(r.supporter)}${r.username ? `<small>@${esc(r.username)}</small>` : ''}<span class="rk-lv">Cấp ${r.lv}</span>${isMe ? '<span class="rk-lv" style="background:#B9A6FF;color:#241A38">Bạn</span>' : ''}${r.title ? `<span class="rk-tt" tabindex="0" role="button" data-iicon="${esc(r.title.icon)}" data-iname="${esc(r.title.name)}" data-ihow="${esc(titleHow(r.title))}" data-istate="✅ Đã đạt">${esc(r.title.icon)} ${esc(r.title.name)}</span>` : ''}</div>
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
    if (e.target.closest('[data-login]')) { openLogin(); return; }
    if (e.target.closest('[data-retry]')) { fetchBoard(); return; }
    const row = e.target.closest('.rk-row,.rk-pd');
    if (row) { /* bấm một dòng / một khối bục: mở hồ sơ công khai của người đó (trong hồ sơ có nút kết bạn / nhắn tin) */
      const uid = +row.dataset.uid || 0;
      if (uid) import('./member.js?v=2').then(m => m.openMember(uid));
    }
  });

  if (auth.user()) syncNow().then(fetchBoard).catch(fetchBoard);
  else fetchBoard();
  const offAuth = auth.onChange(() => { if (!document.body.contains(ov)) { offAuth(); return; } if (auth.user()) syncNow().then(fetchBoard).catch(fetchBoard); else fetchBoard(); });
}
