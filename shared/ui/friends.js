// 🤝 Bạn bè & Nhắn tin 1-1 + Mời vào bàn (cần đăng nhập tài khoản GumballZ).
import { auth, friends } from '../net/api.js?v=27';
import { openLogin } from './account.js?v=49';
import { confirmBox } from './dialog.js?v=6';

const ROOT = new URL('../../', import.meta.url).href;
const GAMES = {
  bang: ['🤠', 'CÀ ĐÙNG!'], uno: ['🃏', 'UNÔ'], typhu: ['🏙️', 'Cờ Tỷ Phú'], tamquoc: ['⚔️', 'Tam Quốc Sát'],
  meono: ['💣', 'Mèo Nổ'], masoi: ['🐺', 'Ma Sói'], scribble: ['🎨', 'Scribble'], tienlen: ['🐷', 'Tiến Lên'],
  poker: ['♠️', 'Poker'], xidach: ['🂡', 'Xì Dách'], catte: ['🎴', 'Cát Tê'], bacao: ['🀄', 'Ba Cào'],
  cangua: ['🐴', 'Cờ Cá Ngựa'], camel: ['🐪', 'Đua Lạc Đà'], cotuong: ['♟️', 'Cờ tướng'], thathaythach: ['🎯', 'Thật hay Thách'],
  sam: ['🃏', 'Sâm Lốc'], daochinh: ['👑', 'Đảo Chính'], xiecthu: ['🎪', 'Gánh Xiếc Thú'], cuuho: ['🚁', 'Đội Cứu Hộ'],
  khaihoang: ['🏝️', 'Đảo Khai Hoang'], xuyenviet: ['🚂', 'Tàu Xuyên Việt'], noitu: ['🔗', 'Nối Từ'], baucua: ['🎲', 'Bầu Cua'],
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hhmm = t => new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const INV_RE = /\[invite:([a-z0-9]{2,16}):([A-Z0-9]{5})\]/g;

const CSS = `.bf-ov{position:fixed;inset:0;z-index:9999;background:#1a1426aa;display:grid;place-items:center;padding:12px}
.bf-mod{width:min(760px,100%);height:min(620px,calc(100dvh - 24px));background:#fffaf3;color:#2a2340;border-radius:24px;box-shadow:0 24px 60px #0006;display:flex;flex-direction:column;overflow:hidden;font:600 14.5px/1.4 Nunito,system-ui,sans-serif}
.bf-mod *{box-sizing:border-box}
.bf-hd{display:flex;align-items:center;gap:8px;padding:12px 14px;background:#fff;border-bottom:1.5px solid #ecdfd0;flex-wrap:wrap}
.bf-hd h2{margin:0;font:800 20px "Baloo 2",Nunito,sans-serif;flex:1;min-width:140px}
.bf-tag{border:1.5px solid #ecdfd0;background:#fff6eb;color:#6b5f7a;border-radius:999px;padding:4px 10px;font:800 12.5px Nunito,sans-serif;cursor:pointer}
.bf-x{width:36px;height:36px;border-radius:50%;border:0;background:#f0e6da;color:#2a2340;font-size:17px;cursor:pointer;font-weight:800}
.bf-body{flex:1;min-height:0;display:grid;grid-template-columns:280px 1fr}
.bf-side{border-right:1.5px solid #ecdfd0;display:flex;flex-direction:column;min-height:0;background:#fff}
.bf-add{display:flex;gap:6px;padding:10px;border-bottom:1.5px solid #ecdfd0}
.bf-add input{flex:1;min-width:0;border:1.5px solid #e2d4c4;border-radius:999px;padding:7px 12px;font:600 14px Nunito,sans-serif;background:#fff;color:#2a2340}
.bf-add button{flex:none;border:0;border-radius:999px;padding:0 12px;background:linear-gradient(90deg,#ff4d5e,#ff9a3d);color:#fff;font:800 13.5px Nunito,sans-serif;cursor:pointer}
.bf-list{flex:1;overflow:auto;padding:8px;display:flex;flex-direction:column;gap:6px}
.bf-sec{font:800 12px Nunito,sans-serif;color:#8a7f96;text-transform:uppercase;padding:4px 6px 0}
.bf-it{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:14px;border:1.5px solid #f0e4d6;background:#fffaf3;cursor:pointer;text-align:left;width:100%}
.bf-it:hover{border-color:#ffb27a}.bf-it.on{border-color:#ff7a45;background:#fff0e4}
.bf-av{width:34px;height:34px;border-radius:50%;flex:none;display:grid;place-items:center;color:#fff;font:800 15px "Baloo 2",Nunito,sans-serif}
.bf-it .t{flex:1;min-width:0}
.bf-it .t b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14.5px;color:#2a2340}
.bf-it .t small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#7b7391;font-size:12px}
.bf-bdg{background:#ff4d6a;color:#fff;border-radius:999px;padding:1px 7px;font:800 11.5px Nunito,sans-serif}
.bf-rbtns{display:flex;gap:4px;flex:none}
.bf-rbtns button{border:0;border-radius:10px;padding:5px 8px;font:800 12px Nunito,sans-serif;cursor:pointer}
.bf-rbtns .ok{background:#2fc76f;color:#fff}.bf-rbtns .no{background:#f0e6da;color:#2a2340}
.bf-rm{border:0;background:none;color:#a095ae;font-size:14px;cursor:pointer;padding:4px 6px;border-radius:8px}
.bf-rm:hover{background:#ffe5e8;color:#c0263b}
.bf-chat{display:flex;flex-direction:column;min-height:0;background:#fffaf3}
.bf-chd{display:flex;align-items:center;gap:8px;padding:9px 12px;background:#fff;border-bottom:1.5px solid #ecdfd0}
.bf-bk{display:none;border:0;background:#f0e6da;color:#2a2340;border-radius:999px;padding:5px 10px;font:800 13px Nunito,sans-serif;cursor:pointer}
.bf-msgs{flex:1;overflow:auto;padding:10px 12px;display:flex;flex-direction:column;gap:6px}
.bf-m{max-width:82%;align-self:flex-start;background:#fff;border-radius:14px 14px 14px 4px;padding:7px 11px;box-shadow:0 1px 3px #2a234018;overflow-wrap:anywhere}
.bf-m.me{align-self:flex-end;background:#ffe3d2;border-radius:14px 14px 4px 14px}
.bf-m time{display:block;font-size:11px;color:#8a7f96;margin-top:2px}
.bf-inv{display:inline-flex;align-items:center;gap:6px;margin-top:4px;padding:6px 12px;border-radius:12px;background:linear-gradient(90deg,#2fc76f,#20a8a0);color:#fff;text-decoration:none;font:800 13px Nunito,sans-serif}
.bf-inv:hover{filter:brightness(1.06)}
.bf-in{display:flex;gap:6px;padding:8px 10px;background:#fff;border-top:1.5px solid #ecdfd0;align-items:center}
.bf-in input{flex:1;min-width:0;border:1.5px solid #e2d4c4;border-radius:999px;padding:8px 13px;font:600 15px Nunito,sans-serif;background:#fff;color:#2a2340}
.bf-in button{flex:none;border:0;border-radius:999px;min-height:38px;padding:0 14px;font:800 14px Nunito,sans-serif;cursor:pointer}
.bf-in .send{background:#ff7a45;color:#fff}.bf-in .inv{background:#eafaf1;color:#147a44;border:1.5px solid #bce8cf}
.bf-empty{margin:auto;text-align:center;color:#8a7f96;padding:24px 16px}
.bf-login{padding:28px 20px;text-align:center;margin:auto;max-width:360px}
.bf-login button{margin-top:12px;border:0;border-radius:999px;padding:11px 22px;background:linear-gradient(90deg,#ff4d5e,#ff9a3d);color:#fff;font:800 16px "Baloo 2",Nunito,sans-serif;cursor:pointer}
.bf-pop-bg{position:fixed;inset:0;z-index:10001;background:transparent}
.bf-pop{position:fixed;z-index:10002;width:min(280px,calc(100vw - 24px));background:#fffaf3;color:#2a2340;border:2px solid #f0dfd0;border-radius:20px;box-shadow:0 14px 36px #0004;padding:12px 14px;font:600 14px/1.4 Nunito,system-ui,sans-serif;animation:bfPop .14s ease-out}
@keyframes bfPop{from{opacity:0;transform:scale(.94) translateY(4px)}to{opacity:1;transform:none}}
.bf-pop-hd{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.bf-pop-hd .t{flex:1;min-width:0}
.bf-pop-hd b{display:block;font-size:15.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bf-pop-hd small{display:block;color:#7b7391;font-size:12px}
.bf-pop-note{font-size:12.5px;color:#7b7391;margin:2px 0 10px}
.bf-pop-btns{display:flex;gap:6px;flex-wrap:wrap}
.bf-pop-btns button{flex:1;min-width:105px;border:0;border-radius:12px;padding:8px 12px;font:800 13.5px Nunito,sans-serif;cursor:pointer}
.bf-pop-btns .pri{background:linear-gradient(90deg,#ff4d5e,#ff9a3d);color:#fff}
.bf-pop-btns .dm{background:#eafaf1;color:#147a44;border:1.5px solid #bce8cf}
.bf-pop-btns .ok{background:#2fc76f;color:#fff}
.bf-pop-btns .sub{background:#f0e6da;color:#2a2340}
#plist li[data-id],#g-players .pl[data-id],#g-chat b[data-id],.item .by[data-id],.lb li[data-id],.final li[data-id],.pod[data-id],.gains li[data-id],.who li[data-id],#msgs .m b[data-id],.seat .avatar,.seat .av,[data-gumballz-pid]{cursor:pointer}
@media (max-width:640px){
  .bf-body{grid-template-columns:1fr}
  .bf-mod[data-chat="0"] .bf-chat{display:none}
  .bf-mod[data-chat="1"] .bf-side{display:none}
  .bf-mod[data-chat="1"] .bf-bk{display:inline-block}
}`;

function css() {
  if (document.getElementById('bf-css')) return;
  const s = document.createElement('style'); s.id = 'bf-css'; s.textContent = CSS; document.head.append(s);
}
function toast(t) {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:10002;background:#2a2340;color:#fff;padding:10px 18px;border-radius:999px;font:800 14.5px Nunito,sans-serif;box-shadow:0 8px 24px #0004;max-width:90vw;text-align:center';
  d.textContent = t; document.body.append(d); setTimeout(() => d.remove(), 2600);
}
const AV = ['#ff4d5e', '#ff8a3d', '#2fc76f', '#20a8a0', '#3d8bff', '#7a5cff', '#d94dff'];
const avCol = n => { let h = 0; for (const c of String(n || '?')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AV[h % AV.length]; };

let cachedCount = 0, pollT = 0, cachedList = null, cachedAt = 0;
export const unreadCount = () => cachedCount;
function setCount(n) {
  cachedCount = Math.max(0, +n || 0);
  try { dispatchEvent(new CustomEvent('gumballz-friends', { detail: { count: cachedCount } })); } catch (e) {}
}
export async function refreshUnread() {
  if (!auth.user()) { cachedList = null; cachedAt = 0; setCount(0); return 0; }
  const r = await friends.list();
  if (r && r.ok) { cachedList = r; cachedAt = Date.now(); setCount((r.unread || 0) + (r.incoming ? r.incoming.length : 0)); }
  return cachedCount;
}
export function mountFriendsPoll() {
  if (pollT) return;
  if (auth.user()) refreshUnread();
  auth.onChange(() => refreshUnread());
  pollT = setInterval(() => { if (auth.user() && !document.hidden) refreshUnread(); }, 45000);
}

function activeRoom() {
  const r = window.__gumballzRoom;
  if (!r || !r.alive || !r.alive()) return null;
  const game = r.game, code = typeof r.code === 'function' ? r.code() : r.code;
  if (!game || !GAMES[game] || !code || !/^[A-Z0-9]{5}$/.test(code)) return null;
  return { game, code };
}

function renderMsgText(raw) {
  let out = '', last = 0, m;
  INV_RE.lastIndex = 0;
  const s = String(raw || '');
  while ((m = INV_RE.exec(s))) {
    out += esc(s.slice(last, m.index));
    const g = m[1], code = m[2];
    if (GAMES[g] && /^[A-Z0-9]{5}$/.test(code)) {
      const [em, nm] = GAMES[g];
      out += `<br><a class="bf-inv" href="${ROOT}${g}/?room=${code}">${em} Mời vào bàn ${esc(nm)} (${code}) · ▶ Vào ngay</a>`;
    } else out += esc(m[0]);
    last = m.index + m[0].length;
  }
  out += esc(s.slice(last));
  return out;
}

export async function quickAddFriend(u) {
  if (!auth.user()) { toast('Đăng nhập để kết bạn nha!'); openLogin(); return null; }
  const r = await friends.add(u && u.id ? { toId: u.id } : { username: u && u.username });
  if (r && r.ok) {
    refreshUnread();
    const nm = (r.friend && r.friend.name) || (u && u.name) || 'bạn mới';
    if (r.already) toast(`Hai bạn và ${nm} đã là bạn bè rồi 🤝`);
    else if (r.accepted) toast(`Đã trở thành bạn bè với ${nm} 🎉`);
    else if (r.pending) toast(`Đã gửi lời mời cho ${nm} trước đó rồi`);
    else toast(`Đã gửi lời mời kết bạn cho ${nm} 🤝`);
  } else toast((r && r.msg) || 'Không gửi được lời mời');
  return r;
}

const cleanPeerName = s => String(s || '').replace(/\((?:bạn|hết giờ)\)/gi, '').replace(/[🤖👑📴🥀✓•·]/g, ' ').replace(/chủ phòng/gi, '').replace(/\s+/g, ' ').trim();
function resolvePeer(target = {}) {
  const peers = Array.isArray(window.__gumballzPeers) ? window.__gumballzPeers : [];
  const nm = cleanPeerName(target.name || '');
  const p = (target.pid && peers.find(x => x.pid === target.pid))
    || (target.uid && peers.find(x => x.uid && x.uid === +target.uid))
    || (nm && peers.find(x => cleanPeerName(x.name) === nm))
    || null;
  return {
    pid: (p && p.pid) || target.pid || '',
    uid: Number((p && p.uid) || target.uid) || 0,
    uname: (p && p.uname) || target.uname || '',
    name: cleanPeerName((p && p.name) || nm) || 'Người chơi',
    host: !!(p ? p.host : target.host),
    isBot: !!(p ? p.isBot : target.isBot),
  };
}

export function showPlayerCard(target, anchorEl = null) {
  css();
  const info = resolvePeer(target);
  const me = auth.user(), myPid = window.__gumballzRoom && window.__gumballzRoom.myId ? window.__gumballzRoom.myId() : '';
  if (info.isBot) return;
  if ((info.pid && myPid && info.pid === myPid) || (info.uid && me && info.uid === me.id)) return;
  document.getElementById('bf-pop-bg')?.remove();

  const bg = document.createElement('div'); bg.className = 'bf-pop-bg'; bg.id = 'bf-pop-bg';
  const pop = document.createElement('div'); pop.className = 'bf-pop'; pop.setAttribute('role', 'dialog');
  bg.append(pop); document.body.append(bg);

  const close = () => { removeEventListener('keydown', onKey); bg.remove(); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', onKey);
  bg.addEventListener('click', e => { if (e.target === bg) close(); });

  const place = () => {
    const r = anchorEl && anchorEl.getBoundingClientRect ? anchorEl.getBoundingClientRect() : null;
    const pw = pop.offsetWidth || 270, ph = pop.offsetHeight || 140;
    let left = r ? r.left + r.width / 2 - pw / 2 : (innerWidth - pw) / 2;
    let top = r ? r.bottom + 8 : (innerHeight - ph) / 2;
    if (r && top + ph > innerHeight - 12) top = r.top - ph - 8;
    left = Math.max(12, Math.min(left, innerWidth - pw - 12));
    top = Math.max(12, Math.min(top, innerHeight - ph - 12));
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
  };

  const draw = () => {
    const u = auth.user();
    const tag = info.uid ? `${info.uname ? '@' + esc(info.uname) + ' · ' : ''}#${info.uid}` : 'Chơi khách (chưa đăng nhập)';
    let note = '', btns = '';
    if (!info.uid) {
      note = 'Bạn này chưa đăng nhập tài khoản GumballZ nên chưa kết bạn hoặc nhắn tin riêng được.';
      btns = '<button type="button" class="sub" data-close>Đóng</button>';
    } else if (!u) {
      note = 'Đăng nhập tài khoản GumballZ để kết bạn và nhắn tin riêng nha!';
      btns = '<button type="button" class="pri" data-go="login">👤 Đăng nhập ngay</button>';
    } else {
      const d = cachedList || {};
      const isFr = (d.friends || []).some(f => f.id === info.uid);
      const isIn = (d.incoming || []).some(f => f.id === info.uid);
      const isOut = (d.outgoing || []).some(f => f.id === info.uid);
      if (isFr) {
        note = '🤝 Hai bạn đang là bạn bè.';
        btns = '<button type="button" class="dm" data-go="dm">💬 Nhắn tin riêng</button>';
      } else if (isIn) {
        note = '📩 Người này đã gửi lời mời kết bạn cho bạn.';
        btns = '<button type="button" class="ok" data-go="accept">✓ Đồng ý kết bạn</button>';
      } else if (isOut) {
        note = '⏳ Đã gửi lời mời kết bạn – đang chờ đồng ý.';
        btns = '<button type="button" class="sub" data-close>Đóng</button>';
      } else {
        note = 'Kết bạn để rủ chơi chung và nhắn tin riêng mọi lúc!';
        btns = '<button type="button" class="pri" data-go="add">＋ Kết bạn</button>';
      }
    }
    pop.innerHTML = `<div class="bf-pop-hd"><span class="bf-av" style="background:${avCol(info.name)}">${esc([...info.name][0] || '?').toUpperCase()}</span><div class="t"><b>${esc(info.name)}${info.host ? ' 👑' : ''}</b><small>${tag}</small></div></div><div class="bf-pop-note">${note}</div><div class="bf-pop-btns">${btns}</div>`;
    place();
    pop.querySelector('[data-close]')?.addEventListener('click', close);
    pop.querySelector('[data-go="login"]')?.addEventListener('click', () => { close(); openLogin(); });
    pop.querySelector('[data-go="dm"]')?.addEventListener('click', () => { close(); openFriends(info.uid); });
    pop.querySelector('[data-go="accept"]')?.addEventListener('click', async e => {
      e.currentTarget.disabled = true;
      const r = await friends.act(info.uid, 'accept');
      if (r && r.ok) { toast(`Đã trở thành bạn bè với ${info.name} 🎉`); await refreshUnread(); draw(); }
      else { toast((r && r.msg) || 'Có lỗi xảy ra'); e.currentTarget.disabled = false; }
    });
    pop.querySelector('[data-go="add"]')?.addEventListener('click', async e => {
      e.currentTarget.disabled = true;
      await quickAddFriend({ id: info.uid, username: info.uname, name: info.name });
      await refreshUnread();
      draw();
    });
  };
  draw();
  if (me && info.uid && (!cachedList || Date.now() - cachedAt > 12000)) refreshUnread().then(() => { if (document.body.contains(pop)) draw(); });
}

try { window.__gumballzPlayerCard = showPlayerCard; } catch (e) {}

export function mountPlayerClick() {
  css();
  try { window.__gumballzPlayerCard = showPlayerCard; } catch (e) {}
  if (window.__gumballzPlayerClickOn) return;
  window.__gumballzPlayerClickOn = true;
  document.addEventListener('click', e => {
    if (!e.target || e.target.closest('#bf-ov, #bf-pop-bg, #bc-box, button, a, input, select, textarea, .x, .kick, .dk-card, #hand, [data-no-card]')) return;
    const tag = e.target.closest('[data-gumballz-pid], #plist li[data-id], #g-players [data-id], #g-chat b[data-id], .item .by[data-id], .lb li[data-id], .final li[data-id], .pod[data-id], .gains li[data-id], .who li[data-id], #msgs .m b[data-id]');
    if (tag) {
      const pid = tag.dataset.gumballzPid || tag.dataset.id || '';
      const nmEl = tag.querySelector('.nm, b, span') || tag;
      showPlayerCard({ pid, name: nmEl.textContent }, tag);
      return;
    }
    const li = e.target.closest('#plist li');
    if (li) {
      const nmEl = li.querySelector('.nm, span, b') || li;
      const p = resolvePeer({ name: nmEl.textContent });
      if (p.pid || p.uid) showPlayerCard({ pid: p.pid, name: p.name }, li);
      return;
    }
    const seat = e.target.closest('.seat[data-pid], .pc[data-id]:not([data-fn])');
    if (seat && !seat.matches('.pickable, .pick, .targetable, .can-pick, .selectable') && !document.querySelector('.target-list, #pick-ban:not([hidden]):not(:empty)')) {
      if (e.target.closest('.av, .avatar, .ava, .av-sm, .nm, .name, .pname, .pl-name, .st-n, .st-n b, .plate > b, .seat > b')) {
        const pid = seat.dataset.pid || seat.dataset.id;
        const nm = seat.querySelector('.nm, .name, .pname, .pl-name, .st-n, .plate > b, b')?.textContent?.trim() || '';
        showPlayerCard({ pid, name: nm }, seat);
      }
    }
  });
  window.__gumballzPlayerCard = showPlayerCard;
}

let closeOpen = null; /* hộp Bạn bè đang mở (mở lại thì đóng hẳn hộp cũ) */
export function openFriends(initialUid = null) {
  css();
  if (closeOpen) closeOpen(); document.getElementById('bf-ov')?.remove();
  const ov = document.createElement('div'); ov.className = 'bf-ov'; ov.id = 'bf-ov';
  document.body.append(ov);

  let data = { friends: [], incoming: [], outgoing: [] };
  let activeId = initialUid ? +initialUid : null;
  let msgs = [], lastId = 0, pollChat = 0, pollList = 0, closed = false, gen = 0;

  const close = () => {
    closed = true; if (closeOpen === close) closeOpen = null;
    clearInterval(pollChat); clearInterval(pollList);
    removeEventListener('keydown', onKey); offAuth();
    ov.remove();
  };
  const onKey = e => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', onKey);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });

  async function loadList() {
    const r = await friends.list();
    if (!r || !r.ok) return;
    data = r; cachedList = r; cachedAt = Date.now();
    setCount((r.unread || 0) + (r.incoming ? r.incoming.length : 0));
    drawSide();
  }

  async function loadMsgs(reset = false) {
    if (!activeId) return;
    const id = activeId, r = await friends.msgs(id, reset ? 0 : lastId);
    if (!r || !r.ok || closed || id !== activeId) return; /* đã đổi người chat trong lúc chờ: bỏ phản hồi cũ */
    const fresh = reset || !!(r.msgs && r.msgs.length);
    if (reset) msgs = r.msgs || [];
    else if (r.msgs && r.msgs.length) {
      const seen = new Set(msgs.map(x => x.id));
      for (const m of r.msgs) if (!seen.has(m.id)) msgs.push(m);
    }
    if (msgs.length) lastId = msgs[msgs.length - 1].id;
    if (fresh) { drawChat(); refreshUnread(); } /* không có tin mới thì khỏi vẽ lại + khỏi gọi thêm /friends/list */
  }

  function drawSide() {
    const list = ov.querySelector('.bf-list'); if (!list) return;
    let html = '';
    const meId = auth.user()?.id;
    const myPid = window.__gumballzRoom && window.__gumballzRoom.myId ? window.__gumballzRoom.myId() : '';
    const roomPeers = (Array.isArray(window.__gumballzPeers) ? window.__gumballzPeers : []).filter(p => p && !p.isBot && p.pid !== myPid && (!meId || p.uid !== meId));
    if (roomPeers.length) {
      html += '<div class="bf-sec">🎲 Người cùng phòng</div>';
      html += roomPeers.map(p => {
        const isFr = p.uid && (data.friends || []).some(f => f.id === p.uid);
        const isIn = p.uid && (data.incoming || []).some(f => f.id === p.uid);
        const isOut = p.uid && (data.outgoing || []).some(f => f.id === p.uid);
        const sub = p.uid ? `${p.uname ? '@' + esc(p.uname) + ' · ' : ''}#${+p.uid}` : 'Chơi khách (chưa đăng nhập)';
        const act = isFr ? `<div class="bf-rbtns"><button type="button" class="ok" data-open="${+p.uid}">💬 Nhắn</button></div>`
          : isIn ? `<div class="bf-rbtns"><button type="button" class="ok" data-act="accept" data-id="${+p.uid}">Đồng ý</button></div>`
          : isOut ? '<small style="color:#8a7f96">Đã gửi</small>'
          : p.uid ? `<div class="bf-rbtns"><button type="button" class="ok" data-room-add="${+p.uid}" data-uname="${esc(p.uname || '')}" data-nm="${esc(p.name)}">＋ Kết bạn</button></div>`
          : '';
        return `<div class="bf-it" ${isFr ? `data-open="${+p.uid}"` : 'style="cursor:default"'}><span class="bf-av" style="background:${avCol(p.name)}">${esc([...p.name][0] || '?').toUpperCase()}</span><div class="t"><b>${esc(p.name)}${p.host ? ' 👑' : ''}</b><small>${sub}</small></div>${act}</div>`;
      }).join('');
    }
    if (data.incoming && data.incoming.length) {
      html += '<div class="bf-sec">Lời mời kết bạn</div>';
      html += data.incoming.map(p => `<div class="bf-it" style="cursor:default"><span class="bf-av" style="background:${avCol(p.name)}">${esc([...p.name][0] || '?').toUpperCase()}</span><div class="t"><b>${esc(p.name)}</b><small>${p.username ? '@' + esc(p.username) + ' · ' : ''}#${p.id}</small></div><div class="bf-rbtns"><button type="button" class="ok" data-act="accept" data-id="${p.id}">Đồng ý</button><button type="button" class="no" data-act="reject" data-id="${p.id}">✕</button></div></div>`).join('');
    }
    html += '<div class="bf-sec">Bạn bè</div>';
    if (data.friends && data.friends.length) {
      html += data.friends.map(f => {
        const prev = f.last ? (INV_RE.test(f.last.msg) ? '🎲 Lời mời vào bàn' : f.last.msg) : (f.username ? '@' + f.username : '#' + f.id);
        INV_RE.lastIndex = 0;
        return `<div class="bf-it ${activeId === f.id ? 'on' : ''}" data-open="${f.id}"><span class="bf-av" style="background:${avCol(f.name)}">${esc([...f.name][0] || '?').toUpperCase()}</span><div class="t"><b>${esc(f.name)}</b><small>${esc(prev)}</small></div>${f.unread ? `<span class="bf-bdg">${f.unread}</span>` : ''}<button type="button" class="bf-rm" data-act="remove" data-id="${f.id}" data-nm="${esc(f.name)}" title="Xoá bạn">✕</button></div>`;
      }).join('');
    } else {
      html += '<div class="bf-empty" style="padding:14px 8px">Chưa có bạn bè nào.<br>Nhập <b>@tênđăngnhập</b> hoặc <b>#ID</b> ở trên, hoặc bấm <b>＋ Kết bạn</b> ngay trong chat phòng!</div>';
    }
    if (data.outgoing && data.outgoing.length) {
      html += '<div class="bf-sec">Đã gửi lời mời</div>';
      html += data.outgoing.map(p => `<div class="bf-it" style="cursor:default;opacity:.75"><span class="bf-av" style="background:${avCol(p.name)}">${esc([...p.name][0] || '?').toUpperCase()}</span><div class="t"><b>${esc(p.name)}</b><small>Đang chờ đồng ý…</small></div><button type="button" class="bf-rm" data-act="reject" data-id="${p.id}" title="Huỷ lời mời">✕</button></div>`).join('');
    }
    list.innerHTML = html;
  }

  function drawChat() {
    const chatEl = ov.querySelector('.bf-chat'); if (!chatEl) return;
    const mod = ov.querySelector('.bf-mod');
    const fr = (data.friends || []).find(f => f.id === activeId);
    if (!fr) {
      mod.dataset.chat = '0';
      chatEl.innerHTML = '<div class="bf-empty">👈 Chọn một người bạn để nhắn tin hoặc mời vào bàn chơi chung nha!</div>';
      return;
    }
    mod.dataset.chat = '1';
    const meId = auth.user()?.id;
    const room = activeRoom();
    if (!chatEl.querySelector('.bf-chd') || +chatEl.dataset.fid !== fr.id) {
      chatEl.dataset.fid = fr.id;
      chatEl.innerHTML = `<div class="bf-chd"><button type="button" class="bf-bk">← Bạn bè</button><span class="bf-av" style="width:28px;height:28px;font-size:13px;background:${avCol(fr.name)}">${esc([...fr.name][0] || '?').toUpperCase()}</span><b style="flex:1">${esc(fr.name)}</b><small style="color:#8a7f96">${fr.username ? '@' + esc(fr.username) + ' · ' : ''}#${fr.id}</small></div>
        <div class="bf-msgs"></div>
        <form class="bf-in"><input type="text" maxlength="400" placeholder="Nhắn ${esc(fr.name)}…" autocomplete="off">${room ? '<button type="button" class="inv" title="Gửi link mời vào bàn hiện tại">🎲 Mời bàn</button>' : ''}<button type="submit" class="send">Gửi</button></form>`;
      chatEl.querySelector('.bf-bk').onclick = () => { activeId = null; mod.dataset.chat = '0'; drawSide(); drawChat(); };
      const inv = chatEl.querySelector('.bf-in .inv');
      if (inv) inv.onclick = () => sendMsg(`[invite:${room.game}:${room.code}] Mời bạn vào bàn chơi chung nè!`);
      chatEl.querySelector('.bf-in').onsubmit = e => {
        e.preventDefault();
        const inp = chatEl.querySelector('.bf-in input'), t = inp.value.trim();
        if (!t) return; inp.value = ''; sendMsg(t);
      };
    }
    const box = chatEl.querySelector('.bf-msgs');
    const near = box.scrollHeight - box.scrollTop - box.clientHeight < 90 || box.children.length === 0;
    box.innerHTML = msgs.length
      ? msgs.map(m => `<div class="bf-m ${m.fromId === meId ? 'me' : ''}">${renderMsgText(m.msg)}<time>${hhmm(m.ts)}</time></div>`).join('')
      : '<div class="bf-empty">Chưa có tin nhắn. Gửi lời chào đi nào 👋</div>';
    if (near) box.scrollTop = box.scrollHeight;
  }

  async function sendMsg(text) {
    if (!activeId) return;
    const id = activeId, r = await friends.send(id, text);
    if (closed) return;
    if (r && r.ok && r.msg) {
      if (id !== activeId) { loadList(); return; }
      if (!msgs.some(x => x.id === r.msg.id)) msgs.push(r.msg);
      lastId = r.msg.id;
      drawChat();
      loadList();
    } else toast((r && r.msg) || 'Không gửi được tin nhắn');
  }

  async function build() {
    const my = ++gen;
    clearInterval(pollChat); clearInterval(pollList);
    const u = auth.user();
    if (!u) {
      ov.innerHTML = `<div class="bf-mod" role="dialog" aria-modal="true"><div class="bf-hd"><h2>🤝 Bạn bè &amp; Tin nhắn</h2><button type="button" class="bf-x" aria-label="Đóng">✕</button></div><div class="bf-login"><p>Đăng nhập tài khoản GumballZ để kết bạn, nhắn tin riêng và mời bạn bè vào bàn nhanh hơn nha!</p><button type="button" id="bf-go-login">👤 Đăng nhập / Tạo tài khoản</button></div></div>`;
      ov.querySelector('.bf-x').onclick = close;
      ov.querySelector('#bf-go-login').onclick = () => openLogin();
      return;
    }
    const tag = `${u.username ? '@' + u.username + ' · ' : ''}#${u.id}`;
    ov.innerHTML = `<div class="bf-mod" role="dialog" aria-modal="true" data-chat="0">
      <div class="bf-hd"><h2>🤝 Bạn bè &amp; Tin nhắn</h2><button type="button" class="bf-tag" title="Bấm để sao chép mã kết bạn">${esc(tag)} 📋</button><button type="button" class="bf-x" aria-label="Đóng">✕</button></div>
      <div class="bf-body">
        <div class="bf-side">
          <form class="bf-add"><input type="text" maxlength="32" placeholder="@tên hoặc #ID…"><button type="submit">＋ Thêm</button></form>
          <div class="bf-list"><div class="bf-empty">Đang tải…</div></div>
        </div>
        <div class="bf-chat"></div>
      </div>
    </div>`;
    ov.querySelector('.bf-x').onclick = close;
    ov.querySelector('.bf-tag').onclick = () => {
      const cp = u.username ? '@' + u.username : '#' + u.id;
      navigator.clipboard?.writeText(cp).then(() => toast(`Đã chép ${cp} 📋`), () => toast(cp));
    };
    ov.querySelector('.bf-add').onsubmit = async e => {
      e.preventDefault();
      const inp = ov.querySelector('.bf-add input'), q = inp.value.trim(); if (!q) return;
      inp.value = '';
      await quickAddFriend({ username: q });
      loadList();
    };
    ov.querySelector('.bf-list').onclick = async e => {
      const addBtn = e.target.closest('[data-room-add]');
      if (addBtn) {
        e.stopPropagation();
        await quickAddFriend({ id: +addBtn.dataset.roomAdd, username: addBtn.dataset.uname, name: addBtn.dataset.nm });
        await loadList();
        return;
      }
      const actBtn = e.target.closest('[data-act]');
      if (actBtn) {
        e.stopPropagation();
        const id = +actBtn.dataset.id, act = actBtn.dataset.act;
        if (act === 'remove') {
          const ok = await confirmBox(`Xoá ${actBtn.dataset.nm || 'người này'} khỏi danh sách bạn bè?`, { title: '🤝 Xoá bạn', ok: 'Xoá bạn', danger: true });
          if (!ok) return;
        }
        const r = await friends.act(id, act);
        if (r && r.ok) {
          if (act === 'remove' && activeId === id) { activeId = null; drawChat(); }
          await loadList();
        } else toast((r && r.msg) || 'Có lỗi xảy ra');
        return;
      }
      const row = e.target.closest('[data-open]');
      if (row) {
        activeId = +row.dataset.open;
        msgs = []; lastId = 0;
        drawSide(); drawChat(); loadMsgs(true);
      }
    };
    await loadList();
    if (closed || my !== gen) return;
    if (activeId) { drawChat(); await loadMsgs(true); }
    else drawChat();
    if (closed || my !== gen) return; /* đã đóng hộp / đã dựng lại trong lúc chờ mạng: đừng để lại interval mồ côi */
    pollChat = setInterval(() => { if (activeId && !document.hidden) loadMsgs(false); }, 3500);
    pollList = setInterval(() => { if (!document.hidden) loadList(); }, 12000);
  }

  const offAuth = auth.onChange(() => build());
  closeOpen = close;
  build();
}
