// 🌐 Sảnh chung: phòng công khai + chat (lọc chửi thề ở máy chủ) + báo cáo.
// mountLobby(el, { game }) – game = null: sảnh tổng (mọi game, kênh chat "Chung" + kênh game đang lọc)
// openLobby(game) – mở dạng hộp nổi (dùng trong trang game)
import { WS, auth, guestId, myName, myLevel } from '../net/api.js?v=27';
export const LV_NAMES = ['Tân binh', 'Tập sự', 'Dân chơi', 'Tay chơi', 'Cao thủ', 'Đại cao thủ', 'Bậc thầy', 'Tông sư', 'Huyền thoại', 'Truyền kỳ']; /* trùng LEVELS trong stats.js */
import { openLogin } from './account.js?v=49';
import { promptBox, chooseBox } from './dialog.js?v=8';

const ROOT = new URL('../../', import.meta.url).href;
export const GAME_INFO = {
  bang: ['🤠', 'CÀ ĐÙNG! (Bang!)'], uno: ['🃏', 'UNÔ (UNO)'], typhu: ['🏙️', 'Cờ Tỷ Phú (Monopoly) Sài Gòn 3D'], tamquoc: ['⚔️', 'Tam Quốc Sát'], meono: ['💣', 'Mèo Nổ (Exploding Kittens)'], masoi: ['🐺', 'Ma Sói (Werewolf)'],
  scribble: ['🎨', 'Scribble'], tienlen: ['🐷', 'Tiến Lên'], poker: ['♠️', 'Poker'], xidach: ['🂡', 'Xì Dách'], catte: ['🎴', 'Cát Tê'], bacao: ['🀄', 'Ba Cào'],
  cangua: ['🐴', 'Cờ Cá Ngựa'], camel: ['🐪', 'Đua Lạc Đà'], cotuong: ['♟️', 'Cờ tướng'], thathaythach: ['🎯', 'Thật hay Thách'], baitan: ['🃏', 'Bài Tấn'], loto: ['🎪', 'Lô tô'], covua: ['♟️', 'Cờ vua'], tala: ['🀄', 'Tá lả'], cholon: ['🏮', 'Chợ Lớn (Chinatown)'], tusac: ['🀄', 'Tứ sắc'], bantau: ['🚢', 'Bắn tàu (Battleship)'], oanquan: ['🪨', 'Ô Ăn Quan'], caro: ['✖️', 'Cờ Caro'], tictactoe: ['❌', 'TicTacToe'], memory: ['🃏', 'Memory'], covay: ['⚫', 'Cờ Vây'], cothu: ['🦁', 'Cờ Thú'], ranvathang: ['🐍', 'Rắn và Thang'],
  sam: ['🃏', 'Sâm Lốc'], daochinh: ['👑', 'Đảo Chính (Coup)'], xiecthu: ['🎪', 'Gánh Xiếc Thú'], cuuho: ['🚁', 'Đội Cứu Hộ'], khaihoang: ['🏝️', 'Đảo Khai Hoang (Catan)'], xuyenviet: ['🚂', 'Tàu Xuyên Việt (Ticket to Ride)'], noitu: ['🔗', 'Nối Từ'], baucua: ['🎲', 'Bầu Cua'],
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hhmm = t => new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'vừa mở' : m < 60 ? m + ' phút' : Math.round(m / 60) + ' giờ'; };

const CSS = `.lb{--ink:#4A3E5C;--mut:#8B7E9E;--line:#ecdfd0;color:var(--ink);font:600 15px/1.45 Nunito,system-ui,sans-serif;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);grid-template-rows:minmax(0,1fr);gap:16px;min-height:0}
.lb *{box-sizing:border-box}
.lb-col{background:#FFFDF9;border-radius:22px;box-shadow:0 14px 30px -18px rgba(74,62,92,.4);display:flex;flex-direction:column;min-height:0;overflow:hidden}
.lb-h{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1.5px solid var(--line);flex-wrap:wrap}
.lb-h h3{margin:0;font:400 19px var(--font-display,"Bungee","Baloo 2",Nunito,sans-serif);flex:1;min-width:120px}
.lb-dot{width:9px;height:9px;border-radius:50%;background:#bbb;display:inline-block;margin-right:4px}.lb-dot.on{background:#2fc76f;box-shadow:0 0 0 3px #2fc76f33}
.lb-chips-w{position:relative;display:flex;align-items:center;border-bottom:1.5px solid var(--line)}
.lb-chips-w .lb-chips{flex:1;border-bottom:0;scroll-behavior:smooth}
.lb-arr{width:28px;height:28px;margin:0 4px;border-radius:50%;border:1.5px solid var(--line);background:#FFFDF9;color:var(--ink);font:800 16px/1 Nunito,sans-serif;cursor:pointer;flex:none;display:grid;place-items:center;box-shadow:0 2px 6px #0001}
.lb-arr[hidden]{display:none}
.lb-chips{display:flex;gap:6px;overflow-x:auto;padding:8px 12px;border-bottom:1.5px solid var(--line);scrollbar-width:none}.lb-chips::-webkit-scrollbar{display:none}
.lb-chips button{flex:none;border:1.5px solid var(--line);background:#FFFDF9;border-radius:999px;padding:5px 12px;min-height:44px;font:800 13px Nunito,sans-serif;cursor:pointer;color:var(--ink)}
.lb-chips button[aria-pressed=true]{background:var(--ink);color:#fff;border-color:var(--ink)}
.lb-rooms{overflow:auto;padding:10px 12px;display:grid;gap:8px;align-content:start;min-height:160px}
.lb-room{display:flex;align-items:center;gap:10px;background:#fffaf3;border:1.5px solid var(--line);border-radius:16px;padding:10px 12px;text-decoration:none;color:inherit}
.lb-room:hover{border-color:#ffb27a;background:#fff4ea}
.lb-room .e{font-size:28px;width:40px;text-align:center;flex:none}.lb-room .t{flex:1;min-width:0}.lb-room b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lb-room small{color:var(--mut)}.lb-room .go{flex:none;background:linear-gradient(90deg,#FFB98A,#FFB9CF);color:#4A3E5C;border-radius:999px;padding:8px 14px;font:400 14px var(--font-display,"Bungee","Baloo 2",Nunito,sans-serif)}
.lb-empty{color:var(--mut);text-align:center;padding:18px 8px}
.lb-empty a,.lb-new{color:#2f5fd0}
.lb-chat{display:flex;flex-direction:column;min-height:0;flex:1}
.lb-msgs{flex:1;overflow:auto;padding:10px 12px;display:flex;flex-direction:column;gap:6px;min-height:200px}
.lb-m{display:flex;gap:8px;align-items:flex-start;position:relative}
.lb-m:not(.me) .lb-av,.lb-m:not(.me) .lb-n{cursor:pointer}
.lb-m:not(.me) .lb-n:hover{text-decoration:underline}
.lb-av{width:30px;height:30px;border-radius:50%;flex:none;display:grid;place-items:center;color:#fff;font:800 14px Nunito}
.lb-b{background:#f6efe6;border-radius:4px 14px 14px 14px;padding:6px 10px;max-width:calc(100% - 70px);word-wrap:break-word;overflow-wrap:anywhere}
.lb-m.me{flex-direction:row-reverse}.lb-m.me .lb-b{background:#ffe9d6;border-radius:14px 4px 14px 14px}
.lb-n{font-weight:800;font-size:13px}.lb-n .v{color:#2f9e5b}.lb-n time{font-weight:600;color:var(--mut);font-size:11.5px;margin-left:6px}
.lb-rp{border:0;background:none;cursor:pointer;opacity:.35;font-size:15px;padding:4px;align-self:center;min-width:32px;min-height:32px}.lb-rp:hover,.lb-rp:focus-visible{opacity:1}
.lb-in{display:flex;gap:8px;padding:10px 12px;border-top:1.5px solid var(--line);align-items:flex-end;flex-wrap:wrap}
.lb-in input{flex:1;min-width:0;border:1.5px solid var(--line);border-radius:999px;padding:10px 14px;font:600 16px Nunito,sans-serif;color:var(--ink);background:#fff}
.lb-in button{border:0;border-radius:999px;min-height:44px;padding:0 16px;font:400 15px var(--font-display,"Bungee","Baloo 2",Nunito,sans-serif);background:var(--ink);color:#fff;cursor:pointer}
.lb-who{width:100%;font-size:12.5px;color:var(--mut);display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.lb-who input{flex:0 1 150px;padding:5px 10px;font-size:14px;border-radius:10px}
.lb-who a{color:#2f5fd0;cursor:pointer}
.lb-fr{margin-left:auto;border:1.5px solid #ecdfd0;background:#fff6eb;color:#4A3E5C;border-radius:999px;padding:4px 10px;font:800 12.5px Nunito,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:4px}
.lb-fr b{background:#FFB98A;color:#4A3E5C;border-radius:999px;padding:0 5px;font-size:11px;line-height:1.4}.lb-fr b:empty{display:none}
.lb-actbar{display:flex;gap:8px;padding:8px 12px;border-bottom:1.5px solid var(--line);background:#fffdf9;align-items:center;flex-wrap:wrap}
.lb-mm-btn{flex:1;min-width:150px;min-height:44px;border:0;border-radius:999px;padding:8px 14px;font:400 14px var(--font-display,"Bungee","Baloo 2",Nunito,sans-serif);color:#fff;background:linear-gradient(90deg,#FFB98A,#FFB9CF);box-shadow:0 6px 14px -6px #FFB98Aaa;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.lb-mm-btn.on{background:linear-gradient(90deg,#2fc76f,#1ca356);box-shadow:0 6px 14px -6px #2fc76faa}
.lb-mm-btn small{font:700 11.5px Nunito,sans-serif;background:#ffffff30;padding:1px 7px;border-radius:999px}
.lb-rk-btn{min-height:44px;border:1.5px solid #f0d8b8;border-radius:999px;padding:7px 12px;font:800 13.5px "Baloo 2",Nunito,sans-serif;color:#7a4300;background:linear-gradient(135deg,#fff8e6,#ffe6b3);cursor:pointer;display:inline-flex;align-items:center;gap:5px}
.lb-mm-bar{margin:8px 12px 0;padding:10px 12px;border-radius:16px;background:linear-gradient(135deg,#fff6eb,#ffe9d2);border:1.5px solid #ffc996;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:13.5px;font-weight:800}
.lb-mm-bar .acts{display:flex;gap:6px;flex-wrap:wrap}
.lb-mm-bar button{border:0;border-radius:999px;padding:5px 11px;font:800 12.5px Nunito,sans-serif;cursor:pointer}
.lb-mm-bar .go-host{background:#4A3E5C;color:#fff}
.lb-mm-bar .go-cancel{background:#FFFDF9;color:#7a6f8c;border:1px solid #e0d2c2}
.lb-rule{font-size:12px;color:var(--mut);padding:0 12px 8px}
.lb-err{font-size:13px;color:#c0263b;padding:0 12px;min-height:0}
.lb-tabs{display:none}
@media (max-width:760px){
 .lb{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr);gap:10px}
 .lb-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;background:#f0e6da;border-radius:999px;padding:4px}
 .lb-tabs button{border:0;border-radius:999px;min-height:42px;font:800 15px Nunito,sans-serif;background:none;color:var(--ink);cursor:pointer}
 .lb-tabs button[aria-pressed=true]{background:#FFFDF9;box-shadow:0 2px 6px #0001}
 .lb[data-tab=rooms] .lb-col.c{display:none}.lb[data-tab=chat] .lb-col.r{display:none}
 .lb-msgs{min-height:120px}
 .lb-col.c .lb-h{display:none} /* điện thoại: đã có tab "💬 Chat" ở trên nên bỏ tiêu đề cột cho rộng chỗ */
 .lb-rule{font-size:12px;margin:2px 12px}
}
.lb-ov{position:fixed;inset:0;z-index:9990;background:rgba(74,62,92,.66);display:grid;place-items:center;padding:10px}
.lb-mod{width:min(980px,100%);height:min(720px,calc(100dvh - 20px));background:#FFF8EE;border-radius:24px;padding:12px;display:flex;flex-direction:column;gap:10px;box-shadow:0 20px 60px #0006}
.lb-mod > header{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.lb-mod > header h2{margin:0;flex:1;font:400 22px var(--font-display,"Bungee","Baloo 2",Nunito,sans-serif);color:#4A3E5C}
.lb-mod > header button.x{width:40px;height:40px;border-radius:50%;border:0;background:#f0e6da;font-size:18px;cursor:pointer}
.lb-mod .lb{flex:1;min-height:0}.lb-mod .lb-col{min-height:0}
/* Scribble có sẵn lớp .lb (bảng điểm) của riêng nó → gỡ khung/độ rộng lạ khỏi sảnh */
.lb[data-tab]{width:auto;max-width:none;background:none;border:0;border-radius:0;padding:0;margin:0}`;
function css() { if (document.getElementById('lb-css')) return; const s = document.createElement('style'); s.id = 'lb-css'; s.textContent = CSS; document.head.append(s); }
const COLORS = ['#ff4d5e', '#ff9a3d', '#2fc76f', '#3d8bff', '#7b61ff', '#20b2aa', '#e05297', '#c58a1a'];
const colorOf = s => COLORS[[...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORS.length];

export function mountLobby(el, { game = null, autoMatch = /[?&]match=1/.test(location.search) } = {}) {
  css();
  let filter = game || 'all', ch = game || 'all', rooms = [], me = null, ws = null, wait = 1000, dead = false, msgs = { [ch]: [] };
  let mmState = null, mmStat = { n: 0, byGame: {} }, mmLowT = 0;
  const chans = () => game ? [game, 'all'] : ['all', ...(filter !== 'all' ? [filter] : [])];
  el.innerHTML = `<div class="lb" data-tab="rooms">
    <div class="lb-tabs" role="tablist"><button data-tab="rooms" aria-pressed="true">🚪 Phòng <span class="n">0</span></button><button data-tab="chat" aria-pressed="false">💬 Chat</button></div>
    <section class="lb-col r"><div class="lb-h"><h3>🚪 Phòng đang chờ</h3><span class="lb-st"><i class="lb-dot"></i><small>đang nối…</small></span></div>
      <div class="lb-actbar">
        <button type="button" class="lb-mm-btn">⚡ Tìm trận nhanh <small class="lb-mm-cnt" hidden></small></button>
        <button type="button" class="lb-rk-btn">🏆 Bảng xếp hạng</button>
      </div>
      <div class="lb-mm-slot"></div>
      ${game ? '' : `<div class="lb-chips-w"><button type="button" class="lb-arr" data-sc="-1" aria-label="Cuộn trái" hidden>‹</button><div class="lb-chips lb-gf"><button data-g="all" aria-pressed="true">Tất cả</button>${Object.entries(GAME_INFO).map(([k, [e, n]]) => `<button data-g="${k}" aria-pressed="false">${e} ${n}</button>`).join('')}</div><button type="button" class="lb-arr" data-sc="1" aria-label="Cuộn phải" hidden>›</button></div>`}
      <div class="lb-rooms"></div></section>
    <section class="lb-col c"><div class="lb-h"><h3>💬 Chat</h3></div>
      <div class="lb-chips lb-cf"></div>
      <div class="lb-chat"><div class="lb-msgs" aria-live="polite"></div>
      <p class="lb-rule">💛 Nói chuyện lịch sự nha – từ bậy tự bị che. Bấm vào tên/avatar để kết bạn, 🚩 để báo cáo.</p><p class="lb-err"></p>
      <form class="lb-in"><div class="lb-who"></div><input maxlength="300" placeholder="Nhắn gì đó…" enterkeyhint="send" aria-label="Tin nhắn"><button type="submit">Gửi</button></form></div></section></div>`;
  const $ = s => el.querySelector(s), root = $('.lb');
  $('.lb-tabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; root.dataset.tab = b.dataset.tab; el.querySelectorAll('.lb-tabs button').forEach(x => x.setAttribute('aria-pressed', x === b)); if (b.dataset.tab === 'chat') scrollEnd(); };
  if (!game) {
    const gf = $('.lb-gf'), gL = $('.lb-chips-w [data-sc="-1"]'), gR = $('.lb-chips-w [data-sc="1"]');
    const syncG = () => { const m = gf.scrollWidth - gf.clientWidth; gL.hidden = gf.scrollLeft <= 4; gR.hidden = m <= 4 || gf.scrollLeft >= m - 4; };
    gf.addEventListener('scroll', syncG, { passive: true });
    gf.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); gf.scrollLeft += e.deltaY; } }, { passive: false });
    gL.onclick = () => { gf.scrollLeft -= 180; }; gR.onclick = () => { gf.scrollLeft += 180; }; setTimeout(syncG, 40);
    gf.onclick = e => { const b = e.target.closest('button'); if (!b) return; filter = b.dataset.g; el.querySelectorAll('.lb-gf button').forEach(x => x.setAttribute('aria-pressed', x === b)); drawRooms(); drawChans(); drawMm(); if (mmState) startMm(filter); if (filter !== 'all') { ch = filter; join(); } else { ch = 'all'; drawMsgs(); } };
  }

  const hostNow = g => {
    const target = g && g !== 'all' ? g : (game || (filter !== 'all' ? filter : 'uno'));
    location.href = `${ROOT}${target}/?public=1&autohost=1`;
  };
  const drawMm = () => {
    const btn = $('.lb-mm-btn'), slot = $('.lb-mm-slot');
    const gKey = game || filter;
    const gLabel = gKey === 'all' ? 'Bất kỳ game nào' : (GAME_INFO[gKey]?.[1] || gKey);
    const waitingN = gKey === 'all' ? (mmStat.n || 0) : ((mmStat.byGame?.[gKey] || 0) + (mmStat.byGame?.all || 0));
    if (mmState) {
      btn.classList.add('on');
      btn.innerHTML = `⏳ Đang tìm trận (${esc(gLabel)})…`;
      const txt = mmState.pairing
        ? `🎉 Đã ghép với <b>${esc(mmState.host || 'Kỳ thủ')}</b>! Đang mở bàn ${esc(GAME_INFO[mmState.game]?.[1] || mmState.game)}…`
        : mmState.low
          ? `😕 <b>Hiện có quá ít người đang tìm trận ${esc(gLabel)}</b> (${waitingN <= 1 ? 'chỉ mới có mình bạn' : `mới có ${waitingN} người`}). Bạn có thể đợi thêm chút, mở bàn công khai chờ sẵn hoặc vào chơi với bot nha!`
          : `🔍 Đang tìm đối thủ cho <b>${esc(gLabel)}</b>${waitingN > 1 ? ` · có ${waitingN} người đang tìm!` : '… ưu tiên người cùng trình (nếu ít người quá em sẽ báo sau vài giây)'}`;
      const botTarget = gKey !== 'all' ? gKey : 'uno';
      slot.innerHTML = `<div class="lb-mm-bar"><span>${txt}</span><div class="acts"><button type="button" class="go-host">🚀 Mở bàn chờ sẵn</button>${mmState.low ? `<a class="go-host" href="${ROOT}${botTarget}/" style="text-decoration:none;padding:5px 11px;border-radius:999px;font:800 12.5px Nunito,sans-serif;background:#FFFDF9;color:#4A3E5C;border:1px solid #e0d2c2">🤖 Chơi với bot</a>` : ''}<button type="button" class="go-cancel">Huỷ</button></div></div>`;
      slot.querySelector('.go-host').onclick = () => { stopMm(); hostNow(mmState?.game || gKey); };
      slot.querySelector('.go-cancel').onclick = () => stopMm();
    } else {
      btn.classList.remove('on');
      btn.innerHTML = `⚡ Tìm trận nhanh${gKey !== 'all' ? ' · ' + esc(gLabel) : ''} <small class="lb-mm-cnt"${waitingN > 0 ? '' : ' hidden'}>${waitingN} đang chờ</small>`;
      slot.innerHTML = '';
    }
  };
  const startMm = (g = game || filter) => {
    const lv = myLevel(), gap = r => (r.lv ? Math.abs(r.lv - lv) : 3); /* ưu tiên bàn gần trình mình */
    const list = rooms.filter(r => g === 'all' || r.game === g).sort((a, b) => gap(a) - gap(b) || b.n - a.n || b.created - a.created);
    if (list.length) { location.href = `${ROOT}${list[0].game}/?room=${list[0].code}`; return; }
    clearTimeout(mmLowT);
    mmState = { game: g, ts: Date.now(), low: false };
    mmLowT = setTimeout(() => { if (mmState && !mmState.pairing) { mmState.low = true; drawMm(); } }, 6500);
    drawMm();
    if (ws && ws.readyState === 1) send({ t: 'mm_join', game: g, lv: myLevel() });
  };
  const stopMm = () => {
    clearTimeout(mmLowT);
    mmState = null; drawMm();
    if (ws && ws.readyState === 1) send({ t: 'mm_cancel' });
  };
  $('.lb-mm-btn').onclick = () => { if (mmState) stopMm(); else startMm(game || filter); };
  $('.lb-rk-btn').onclick = () => import('./leaderboard.js?v=31').then(m => m.openLeaderboard(game || filter));

  const drawRooms = () => {
    const list = rooms.filter(r => filter === 'all' || r.game === filter);
    el.querySelector('.lb-tabs .n').textContent = list.length;
    $('.lb-rooms').innerHTML = list.length ? list.map(r => { const [e, n] = GAME_INFO[r.game] || ['🎲', r.game]; return `<a class="lb-room" href="${ROOT}${r.game}/?room=${r.code}"><span class="e">${e}</span><span class="t"><b>${esc(n)} · phòng của ${esc(r.host)}</b><small>👥 ${r.n} người${r.lv ? ' · 🎖️ ' + LV_NAMES[r.lv - 1] : ''} · mở ${ago(r.created)} · mã ${r.code}</small></span><span class="go">Vào ▶</span></a>`; }).join('')
      : `<div class="lb-empty">Chưa có phòng công khai nào${filter !== 'all' ? ' cho ' + esc(GAME_INFO[filter]?.[1] || '') : ''} 🥲<br>Bấm <b>⚡ Tìm trận nhanh</b> ở trên hoặc tạo phòng công khai để người khác vào chơi cùng nha!${filter !== 'all' || game ? `<br><a href="${ROOT}${game || filter}/?public=1&autohost=1">✨ Mở nhanh phòng công khai ${esc(GAME_INFO[game || filter]?.[1] || '')}</a>` : ''}</div>`;
  };
  const drawChans = () => { const cs = chans(); $('.lb-cf').innerHTML = cs.map(c => `<button data-c="${c}" aria-pressed="${c === ch}">${c === 'all' ? '🌐 Chung' : (GAME_INFO[c]?.[0] + ' ' + GAME_INFO[c]?.[1])}</button>`).join(''); $('.lb-cf').hidden = cs.length < 2; };
  $('.lb-cf').onclick = e => { const b = e.target.closest('button'); if (!b) return; ch = b.dataset.c; drawChans(); drawMsgs(); };
  const msgHTML = m => { const mine = !!me && m.who === me.who; return `<div class="lb-m${mine ? ' me' : ''}" data-id="${m.id}" data-who="${esc(m.who || '')}" data-name="${esc(m.name || '')}"><span class="lb-av" style="background:${colorOf(m.name)}" title="${mine ? '' : 'Bấm để kết bạn / nhắn tin'}">${esc([...m.name][0] || '?').toUpperCase()}</span><div class="lb-b"><div class="lb-n">${esc(m.name)}${m.v ? ' <span class="v" title="Đã đăng nhập">✓</span>' : ''}<time>${hhmm(m.ts)}</time></div>${esc(m.text)}</div>${mine ? '' : (me && me.admin ? '<button class="lb-rp lb-adm" title="Quản trị: ẩn tin / cấm chat" aria-label="Quản trị">🛡️</button>' : '') + '<button class="lb-rp" title="Báo cáo tin này" aria-label="Báo cáo">🚩</button>'}</div>`; };
  const scrollEnd = () => { const b = $('.lb-msgs'); b.scrollTop = b.scrollHeight; };
  const drawMsgs = () => { const l = msgs[ch] || []; $('.lb-msgs').innerHTML = l.length ? l.map(msgHTML).join('') : '<div class="lb-empty">Chưa ai nói gì… mở lời trước đi nè 👋</div>'; scrollEnd(); };
  let frN = 0;
  const syncFr = () => { const b = $('.lb-fr b'); if (b) b.textContent = frN ? (frN > 9 ? '9+' : frN) : ''; };
  const drawWho = () => {
    const u = auth.user();
    $('.lb-who').innerHTML = (u ? `<span>Chat với tên <b>${esc(u.name)}</b> <span style="color:#2f9e5b">✓</span></span>` : `<span>Tên: <input class="lb-nm" maxlength="20" value="${esc(myName() || 'Khách')}" aria-label="Tên của bạn"> · <a class="lb-login">Đăng nhập</a> để có dấu ✓</span>`) + `<button type="button" class="lb-fr">🤝 Bạn bè<b>${frN ? (frN > 9 ? '9+' : frN) : ''}</b></button>`;
    const nm = $('.lb-nm'); if (nm) nm.onchange = () => { try { localStorage.setItem('gumballz-name', nm.value.trim().slice(0, 20)); } catch (e) {} hello(); };
    const lg = $('.lb-login'); if (lg) lg.onclick = () => openLogin();
    const fb = $('.lb-fr'); if (fb) fb.onclick = () => import('./friends.js?v=32').then(m => m.openFriends());
  };
  $('.lb-msgs').onclick = async e => {
    const whoHit = e.target.closest('.lb-av, .lb-n');
    if (whoHit) {
      const row = whoHit.closest('.lb-m');
      if (row && !row.classList.contains('me')) {
        const who = row.dataset.who || '', name = row.dataset.name || '';
        const uid = who.startsWith('u:') ? +who.slice(2) : 0;
        import('./friends.js?v=32').then(m => m.showPlayerCard({ uid, name }, whoHit));
        return;
      }
    }
    const b = e.target.closest('.lb-rp'); if (!b) return;
    const id = +b.closest('.lb-m').dataset.id;
    if (b.classList.contains("lb-adm")) {
      const c = await chooseBox('🛡️ Xử lý tin nhắn này', [{ id: '1', label: '🙈 Ẩn tin' }, { id: '2', label: '⛔ Cấm chat 24 giờ' }, { id: '3', label: '⛔ Cấm chat 7 ngày' }, { id: '4', label: '🚫 Cấm chat vĩnh viễn', danger: true }]); if (!c) return;
      const hours = { 2: 24, 3: 168, 4: 87600 }[c];
      if (c === '1') send({ t: 'mod', op: 'hide', id }); else if (hours) send({ t: 'mod', op: 'ban', id, hours, reason: 'Quản trị viên xử lý trong chat' });
      return;
    }
    const reason = await promptBox('Tin này có vấn đề gì? Quản trị viên sẽ xem lại.', { title: '🚩 Báo cáo tin nhắn', placeholder: 'chửi bậy, quấy rối, spam, lừa đảo…', maxlength: 120, ok: 'Gửi báo cáo' }); if (reason === null) return;
    send({ t: 'report', id, reason });
  };
  $('.lb-in').onsubmit = e => {
    e.preventDefault(); const inp = $('.lb-in > input'), t = inp.value.trim(); if (!t) return;
    if (!ws || ws.readyState !== 1) { err('Đang nối lại máy chủ, đợi xíu nha…'); return; }
    send({ t: 'chat', ch, text: t }); inp.value = ''; inp.focus();
  };
  const err = t => { $('.lb-err').textContent = t || ''; clearTimeout(err.t); if (t) err.t = setTimeout(() => { $('.lb-err').textContent = ''; }, 4000); };
  const send = o => { try { ws.send(JSON.stringify(o)); } catch (e) {} };
  const hello = () => {
    send({ t: 'hello', token: auth.token(), guest: guestId(), name: (auth.user()?.name) || myName() || 'Khách', chs: chans() });
    if (mmState) send({ t: 'mm_join', game: mmState.game, lv: myLevel() });
  };
  const join = () => { msgs[ch] = msgs[ch] || []; drawMsgs(); send({ t: 'join', chs: chans() }); };
  const status = on => { $('.lb-st').innerHTML = `<i class="lb-dot${on ? ' on' : ''}"></i><small>${on ? 'trực tiếp' : 'đang nối lại…'}</small>`; };
  let ka = null;
  function connect() {
    if (dead) return;
    try { ws = new WebSocket(WS() + '/lobby'); } catch (e) { setTimeout(connect, wait); return; }
    ws.onopen = () => { wait = 1000; status(true); hello(); clearInterval(ka); ka = setInterval(() => { if (ws.readyState === 1) ws.send('ping'); }, 25000); };
    ws.onmessage = ev => {
      if (ev.data === 'pong') return; let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'me') { me = m; drawMsgs(); }
      else if (m.t === 'rooms') { rooms = m.list || []; drawRooms(); }
      else if (m.t === 'mm_stat') { mmStat = { n: m.n || 0, byGame: m.byGame || {} }; if (mmState && mmStat.n >= 2) mmState.low = false; drawMm(); }
      else if (m.t === 'mm_pairing') { clearTimeout(mmLowT); if (mmState) { mmState.pairing = true; mmState.low = false; mmState.game = m.game || mmState.game; mmState.host = m.host; drawMm(); } }
      else if (m.t === 'mm_host') { clearTimeout(mmLowT); mmState = null; hostNow(m.game); }
      else if (m.t === 'mm_found') { clearTimeout(mmLowT); mmState = null; location.href = `${ROOT}${m.game}/?room=${m.code}`; }
      else if (m.t === 'hist') { msgs[m.ch] = m.msgs; if (m.ch === ch) drawMsgs(); }
      else if (m.t === 'msg') { const l = msgs[m.m.ch] = msgs[m.m.ch] || []; l.push(m.m); if (l.length > 120) l.shift(); if (m.m.ch === ch) { const box = $('.lb-msgs'); const near = box.scrollHeight - box.scrollTop - box.clientHeight < 120; if (l.length === 1) drawMsgs(); else { box.insertAdjacentHTML('beforeend', msgHTML(m.m)); if (near) scrollEnd(); } } }
      else if (m.t === 'del') { for (const k in msgs) msgs[k] = msgs[k].filter(x => x.id !== m.id); el.querySelector(`.lb-m[data-id="${m.id}"]`)?.remove(); }
      else if (m.t === 'err') err(m.msg);
      else if (m.t === 'ok') err(m.msg);
      else if (m.t === 'banned') err('⛔ Bạn đang bị cấm chat' + (m.reason ? ': ' + m.reason : ''));
      else if (m.t === 'reload') join();
    };
    ws.onclose = () => { clearInterval(ka); status(false); if (!dead) { setTimeout(connect, wait); wait = Math.min(wait * 2, 20000); } };
    ws.onerror = () => {};
  }
  const offFr = e => { frN = (e.detail && e.detail.count) || 0; syncFr(); };
  addEventListener('gumballz-friends', offFr);
  import('./friends.js?v=32').then(m => { frN = m.unreadCount(); syncFr(); m.mountFriendsPoll(); }).catch(() => {});
  const off = auth.onChange(() => { drawWho(); hello(); });
  drawRooms(); drawChans(); drawWho(); drawMsgs(); drawMm(); connect();
  if (autoMatch) setTimeout(() => startMm(game || filter), 60);
  return { startMm, stopMm, destroy() { dead = true; clearTimeout(mmLowT); off(); removeEventListener('gumballz-friends', offFr); clearInterval(ka); try { ws.close(); } catch (e) {} } };
}

let closeLobby = null; /* sảnh đang mở: mở lại thì huỷ hẳn cái cũ (WebSocket, hàng tìm trận) */
export function openLobby(game = null, opts = {}) {
  css(); if (closeLobby) closeLobby(); document.getElementById('lb-ov')?.remove();
  const ov = document.createElement('div'); ov.className = 'lb-ov'; ov.id = 'lb-ov';
  ov.innerHTML = `<div class="lb-mod" role="dialog" aria-modal="true"><header><h2>🌐 Sảnh ${game ? esc(GAME_INFO[game]?.[1] || '') : 'chung'}</h2><a href="${ROOT}sanh/${game ? '?game=' + game : ''}" style="font:800 14px Nunito;color:#2f5fd0">Mở trang Sảnh ↗</a><button class="x" aria-label="Đóng">✕</button></header><div class="lb-host"></div></div>`;
  document.body.append(ov);
  const L = mountLobby(ov.querySelector('.lb-host'), { game, autoMatch: !!opts.autoMatch });
  ov.querySelector('.lb-host').style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column';
  ov.querySelector('.lb-host .lb').style.flex = '1';
  const close = () => { if (closeLobby === close) closeLobby = null; L.destroy(); ov.remove(); removeEventListener('keydown', k); };
  closeLobby = close;
  const k = e => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', k);
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('.x')) close(); });
}

export function openMatchmaking(game = null) {
  openLobby(game, { autoMatch: true });
}
