// Phòng chơi dùng chung cho mọi game: chủ phòng nghe trên 4 đường, người vào thử lần lượt.
//   1) Máy chủ GumballZ trên Cloudflare (server/ – đường chính)
//   2) Firebase Realtime Database (máy chủ Google – dự phòng)
//   3) PeerJS (nối thẳng máy với máy)
//   4) MQTT công cộng (dự phòng cuối)
// Tin nhắn là object JSON; game tự xử lý nội dung, lớp này chỉ lo kết nối, vào lại, báo trạng thái.
import { peerOptions, keepAlive } from './ice.js';
import { RelayHost, relayConnect } from './relay.js';
import { FbHost, fbConnect, fbEnabled } from './fbrelay.js';
import { CfHost, cfConnect, cfEnabled, cfClaim } from './cfrelay.js?v=16';
import { announceRoom, auth, myLevel, API } from './api.js?v=29';
import { unthrottleTimers } from './bgtimers.js?v=1'; /* ⏱️ hẹn giờ qua Web Worker để chủ phòng chuyển tab không làm bàn giật */
import { titleById, myTitleId } from '../titles.js?v=5'; /* 🎖️ danh hiệu trưng ra (patch -97): chỉ gửi id, icon/tên tra từ bảng */
/* 👑 vé chủ web (server/src/vip.js): vipCached/vipPass do shared/net/api.js cung cấp (worker client thêm, key 'gumballz-vp').
   🪪 vé tài khoản: idCached/idPass – gửi kèm khi vào phòng để máy chủ áp lệnh cấm / danh sách chặn.
   Nạp động + dự phòng rỗng để room.js vẫn chạy được nếu api.js chưa có các hàm đó. */
let vipCached = () => null, vipPass = async () => null, idCached = () => '', idPass = async () => '';
import('./api.js?v=29').then(m => { if (typeof m.vipCached === 'function') vipCached = m.vipCached; if (typeof m.vipPass === 'function') vipPass = m.vipPass; if (typeof m.idCached === 'function') idCached = m.idCached; if (typeof m.idPass === 'function') idPass = m.idPass; }).catch(() => {});

// 💬 Chat trong phòng (shared/ui/roomchat.js): chạy ngay ở lớp kết nối nên game nào cũng có, không phải sửa từng game.
//   người chơi → chủ phòng : {t:'__chat', text}
//   chủ phòng → mọi người  : {t:'__chat', id, from, text}   (tên do CHỦ PHÒNG gán theo tin 'join' của kết nối đó, không tin client)
// Ma Sói và Vẽ đoán đã có chat riêng gắn với luật (chat ban đêm, đoán chữ) nên không bật ở đây.
const NO_CHAT = ['masoi', 'scribble', 'giandiep'];
const gameOf = ns => String(ns || '').replace(/^gumballz-/, '');
const chatOn = ns => !NO_CHAT.includes(gameOf(ns));
const chatText = t => String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, 140);
function chatUi(api) { try { window.__gumballzChat = api; import('../ui/roomchat.js?v=40').then(m => m.mountRoomChat(api)).catch(() => {}); } catch (e) {} }
const chatBuf = []; /* tin gần đây – để hộp chat nạp xong muộn vẫn có đủ */
function chatEmit(m) { if (m.reset) chatBuf.length = 0; else { chatBuf.push(m); if (chatBuf.length > 40) chatBuf.shift(); } try { dispatchEvent(new CustomEvent('gumballz-chat', { detail: m })); } catch (e) {} }

function peersEmit(peers) {
  try { /* dữ liệu do chủ phòng (một người chơi khác) gửi: ép kiểu trước khi giao cho giao diện */
    window.__gumballzPeers = (Array.isArray(peers) ? peers : []).filter(x => x && typeof x === 'object').slice(0, 64).map(x => ({ ...x, pid: String(x.pid == null ? '' : x.pid).slice(0, 64), uid: Math.max(0, Math.floor(+x.uid || 0)), name: String(x.name == null ? '' : x.name).slice(0, 40), uname: String(x.uname == null ? '' : x.uname).slice(0, 40), host: !!x.host, isBot: !!x.isBot, vip: !!x.vip && !!window.__gumballzSrvRoom /* chỉ tin cờ chủ web do máy chủ phòng kiểm vé */ })); dispatchEvent(new CustomEvent('gumballz-peers', { detail: window.__gumballzPeers })); } catch (e) {}
}
function netUi(g) { try { import('../ui/netmeter.js?v=4').then(m => m.mountNetMeter(g)).catch(() => {}); } catch (e) {} }
function netEmit(d) { try { dispatchEvent(new CustomEvent('gumballz-net', { detail: d })); } catch (e) {} }
function friendsUi() { try { import('../ui/friends.js?v=35').then(m => m.mountPlayerClick && m.mountPlayerClick()).catch(() => {}); import('../ui/vip.js?v=1').then(m => m.mountVip()).catch(() => {}); } catch (e) {} }
function showNotice(text) {
  try {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:10002;background:#4A3E5C;color:#fff;padding:10px 18px;border-radius:999px;font:800 14.5px Nunito,sans-serif;box-shadow:0 8px 24px #0004;max-width:90vw;text-align:center';
    d.textContent = text; document.body.append(d); setTimeout(() => d.remove(), 3800);
  } catch (e) {}
}

// 👑 Tự chuyển chủ phòng: đổi ID người kế nhiệm ↔ 'host' trên toàn bộ snapshot game (trừ khoá cấu hình/văn bản)
const SKIP_SWAP = new Set(['opts', 'name', 'uname', 'text', 'msg', 'word', 'hint', 'code', 'pk', 'reason']);
const SNAP_KEYS = ['opts', 'mode', 'rules', 'ban', 'match', 'chips', 'minted', 'lastWinner', 'gameNo', 'before', 'settled', 'bank', 'tut', 'paused'];
function swapIds(val, myPid, exId, key = '') {
  if (key && SKIP_SWAP.has(key)) return val;
  if (val === 'host') return exId;
  if (val === myPid) return 'host';
  if (Array.isArray(val)) return val.map(v => swapIds(v, myPid, exId));
  if (val && typeof val === 'object') {
    const pidMap = !('id' in val || 'name' in val || 'token' in val || 'connected' in val)
      && (myPid in val || ('host' in val && typeof val.host !== 'boolean'))
      && Object.keys(val).every(k => k === 'host' || k === myPid || /^(p[a-z0-9]{1,12}|bot[a-z0-9]{2,10}|l[a-z0-9]{5})$/.test(k)); /* mã người chơi 'p…', bot 'bot…', người cùng máy 'l…' – thiếu 'bot' thì phòng có bot đổi chủ sẽ lệch bảng theo người (vé, bài trên tay) */
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      const nk = pidMap ? (k === 'host' ? exId : k === myPid ? 'host' : k) : k;
      out[nk] = swapIds(v, myPid, exId, k);
    }
    return out;
  }
  return val;
}
export function swapHostSnap(rawSnap, myPid, exId) {
  if (!rawSnap || !myPid || myPid === 'host') return null;
  const snap = swapIds(rawSnap, myPid, exId);
  snap.ts = Date.now(); snap.offline = false;
  if (Array.isArray(snap.players)) {
    if (!snap.state) snap.players = snap.players.filter(p => p && p.id !== exId);
    for (const p of snap.players) if (p) { p.connected = p.id === 'host' || !!p.isBot; if ('host' in p) p.host = p.id === 'host'; }
    const hi = snap.players.findIndex(p => p && p.id === 'host');
    if (hi > 0) snap.players.unshift(snap.players.splice(hi, 1)[0]);
  }
  return snap;
}
// 🔐 Bản sao trạng thái gửi người kế vị được mã hoá (AES-GCM). Khoá nằm ở chủ phòng + máy chủ; máy chủ chỉ trao khi người kế vị thật sự lên làm chủ phòng,
// nên lúc ván đang chạy không ai mở DevTools ra đọc được vai / bài của người khác từ bản sao này.
const canSeal = () => { try { return !!(crypto && crypto.subtle); } catch (e) { return false; } };
const b64 = u8 => { let o = ''; for (let i = 0; i < u8.length; i += 0x8000) o += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(o); };
const unb64 = t => Uint8Array.from(atob(t), ch => ch.charCodeAt(0));
async function snapKey(bk) { return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', new TextEncoder().encode('gumballz-bak|' + bk)), 'AES-GCM', false, ['encrypt', 'decrypt']); }
async function sealSnap(snap, bk) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await snapKey(bk), new TextEncoder().encode(JSON.stringify(snap))); return { enc: b64(new Uint8Array(ct)), iv: b64(iv) }; }
async function openSnap(enc, iv, bk) { const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await snapKey(bk), unb64(enc)); return JSON.parse(new TextDecoder().decode(pt)); }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function makeCode() { let s = ''; for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]; return s; }
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
const ss = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }, del(k) { try { sessionStorage.removeItem(k); } catch (e) {} } };
// mã định danh máy này (để vào lại đúng chỗ ngồi cũ)
export function token() {
  let t = ls.get('gumballz-token') || ls.get('bangvn-token');
  if (!t) t = Math.random().toString(36).slice(2) + Date.now().toString(36);
  ls.set('gumballz-token', t); return t;
}
// phiên chơi gần nhất của từng game – để tải lại trang là vào lại phòng
export const session = {
  save(game, data) { ls.set('gumballz-session-' + game, JSON.stringify({ ...data, ts: Date.now() })); },
  load(game, maxAge = 3 * 3600e3) { try { const d = JSON.parse(ls.get('gumballz-session-' + game)); return d && Date.now() - d.ts < maxAge ? d : null; } catch (e) { return null; } },
  clear(game) { ls.del('gumballz-session-' + game); },
};

const SEAT_GRACE = 15000; /* người chơi rớt mạng bao lâu thì người xem mới được "Ngồi thay" */
// ======================= CHỦ PHÒNG =======================
export class RoomHost {
  // opts: { ns, prefix, code?, keepCode?, onConn(conn), onReady(code), onError(msg) }
  constructor(opts) {
    unthrottleTimers(); /* máy này làm chủ phòng: hẹn giờ đi qua Worker để chuyển tab / thu nhỏ cửa sổ không làm cả bàn giật */
    this.o = opts; this.code = opts.code || makeCode(); this.opened = !!opts.keepCode;
    this.host = opts.host || null;
    this.conns = new Set();
    this.hbTick = 0; this._peersSig = ''; this._heirsSig = ''; this.offAt = new Map(); this.bornAt = Date.now();
    const promoKey = 'gumballz-promoted-' + this.game;
    if (ss.get(promoKey)) { ss.del(promoKey); setTimeout(() => showNotice('👑 Chủ phòng cũ đã rời đi — bạn vừa trở thành chủ phòng mới!'), 450); }
    const inner = opts.onConn; // theo dõi mọi kết nối để gửi nhịp tim
    this.o = { ...opts, onConn: c => {
      this.conns.add(c);
      const del = () => {
        this.conns.delete(c);
        if (c._pid && !this.dead) { this.offAt.set(c._pid, Date.now()); setTimeout(() => { try { if (!this.dead && this.host && this.host.state && this.host.broadcast) this.host.broadcast(); } catch (e) {} }, SEAT_GRACE + 500); } /* hết thời gian chờ thì báo lại cho người xem biết ghế đã trống */
        if (!this.dead) { this.pushPeers(); this.syncBackup(); }
      };
      c.on('close', del); c.on('error', del); this.chatHook(c); inner(c);
    } };
    this.chatLog = []; this.chatN = 0; chatBuf.length = 0;
    import('../../server/src/filter.js').then(m => { this.chatClean = m.clean; }).catch(() => {}); /* dùng chung bộ lọc từ tục với chat Sảnh */
    if (chatOn(opts.ns)) chatUi({ game: gameOf(opts.ns), host: true, send: t => this.chatSay(null, t), history: () => chatBuf.slice(), alive: () => !this.dead });
    try { window.__gumballzRoom = { game: gameOf(opts.ns), code: () => this.code, alive: () => !this.dead, myId: () => 'host', kick: pid => this.kick(pid) }; } catch (e) {}
    this.banned = new Set(); /* token người bị chủ phòng mời ra – không cho vào lại phòng này */
    friendsUi();
    this._offAuth = auth.onChange(() => { if (!this.dead) this.pushPeers(); });
    /* 🎖️ đổi danh hiệu trong Hồ sơ giữa phòng: ghế chủ phòng cập nhật theo, báo lại cả phòng (không polling) */
    this._onTitle = () => { if (this.dead || !this.host || !Array.isArray(this.host.players)) return; const hp = this.host.players.find(p => p.id === 'host'); if (!hp) return; const t = titleById(myTitleId()); if ((hp.title && hp.title.id) === (t && t.id)) return; hp.title = t; try { this.host.pushLobby(); } catch (e) {} };
    try { addEventListener('gumballz-title', this._onTitle); } catch (e) {}
    this.open();
    this.stopKeep = keepAlive(() => this.peer);
    // phòng công khai (hiện ở Sảnh chung) – bật bằng nút "🌐 Công khai" (shared/ui/homebtn.js)
    this.pubK = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    try { window.__gumballzHost = this; dispatchEvent(new CustomEvent('gumballz-host', { detail: this })); } catch (e) {}
    this._unload = () => { if (this.pub) this.announce(false); };
    try { addEventListener('pagehide', this._unload); } catch (e) {}
    this._vis = () => { if (this.dead) return;
      /* nhắc chủ phòng (game còn chạy trên máy chủ phòng: Xì dách, Poker, Cờ tướng…): để tab ở nền ≥ 8 giây khi có người trong phòng thì cả bàn bị đứng (số đo 📶 Lag 18/11/2026) */
      try { const others = [...this.conns].some(c => c.open && c._chatName);
        if (document.hidden) this._hidAt = others ? Date.now() : 0;
        else if (this._hidAt && Date.now() - this._hidAt > 8000 && others && Date.now() - (this._nagAt || 0) > 600000) { this._nagAt = Date.now(); import('../ui/dialog.js?v=8').then(d => d.toast('👋 Bạn đang là chủ phòng – lúc nãy tab bị ẩn nên cả bàn phải chờ. Để trang này mở khi đang chơi nha!', 6000)).catch(() => {}); }
        if (!document.hidden) this._hidAt = 0; } catch (e) {}
      for (const c of this.conns) if (c.open && c._chatName) try { c.send({ t: '__away', on: !!document.hidden }); } catch (e) {} }; /* báo cho cả phòng khi chủ phòng để tab game ở nền */
    try { document.addEventListener('visibilitychange', this._vis); } catch (e) {}
    this.pushPeers();
    // nhịp tim: người chơi không nghe gì 8 giây thì tự vào lại + đồng bộ bản sao cho chủ phòng kế nhiệm
    this.hb = setInterval(() => {
      for (const c of this.conns) if (c.open && !String(c.peer || '').startsWith('cf:')) try { c.send({ t: '__hb' }); } catch (e) {}
      if (++this.hbTick % 2 === 0) this.syncBackup();
    }, 2500);
  }
  // mình rớt mạng lâu, người kế nhiệm đã thành chủ phòng → đừng ngồi một mình làm "chủ phòng ma": vào lại phòng như người chơi
  demote() {
    if (this.dead || this._demoted) return; this._demoted = true;
    const g = gameOf(this.o.ns);
    session.save(g, { role: 'client', code: this.code, name: ls.get('gumballz-name') || '' });
    ss.set('gumballz-demoted-' + g, '1');
    this.dead = true; if (this.pub) { this.pub = false; clearInterval(this.pubT); } /* không gửi __promote, không gỡ phòng công khai (giờ là của chủ mới) */
    try { this.destroy(); } catch (e) {}
    setTimeout(() => { try { location.reload(); } catch (e) {} }, 300);
  }
  openSeats() {
    const h = this.host;
    if (!h || !h.state || !Array.isArray(h.state.players) || !Array.isArray(h.players)) return [];
    const inSt = new Set(h.state.players.map(q => q.id));
    return h.players
      .filter(p => inSt.has(p.id) && p.id !== 'host' && p.id !== 'dealer' && (p.isBot || (!p.connected && !p.local && Date.now() - (this.offAt.get(p.id) || this.bornAt) >= SEAT_GRACE))) /* người thật chớp mạng vài giây thì chưa mất ghế */
      .map(p => ({ id: p.id, name: String(p.name || '').replace(' 🤖', '').trim() || 'Khách', isBot: !!p.isBot }));
  }
  takeSeat(c, targetId) {
    const h = this.host;
    if (this.dead || !h || !h.state || !targetId) return;
    const spec = (h.conns && h.conns.get(c)) || h.players.find(p => p.conn === c);
    if (!spec || spec.id === 'host') return;
    if (Array.isArray(h.state.players) && h.state.players.some(q => q.id === spec.id)) return;
    if (!this.openSeats().some(s => s.id === targetId)) {
      try { if (c.open) c.send({ t: 'error', msg: 'Ghế này vừa có người ngồi rồi.' }); } catch (e) {}
      return;
    }
    const target = h.players.find(p => p.id === targetId);
    if (!target) return;
    if (target.conn && target.conn !== c) {
      if (h.conns) h.conns.delete(target.conn);
      try { target.conn.close(); } catch (e) {}
    }
    const nm = String(spec.name || c._chatName || 'Khách').replace(' 🤖', '').trim().slice(0, 16) || 'Khách';
    target.isBot = false;
    target.conn = c;
    target.connected = true;
    if (spec.token) target.token = spec.token;
    target.bc = Math.max(target.bc || 0, spec.bc || 0);
    target.name = nm;
    const sp = h.state.players.find(q => q.id === targetId);
    if (sp) { sp.name = nm; if ('isBot' in sp) sp.isBot = false; }
    h.players = h.players.filter(p => p !== spec);
    if (h.conns) h.conns.set(c, target);
    if (Array.isArray(h.state.log)) {
      h.state.log.push(`🪑 ${nm} đã ngồi vào bàn.`);
      if (h.state.log.length > 200) h.state.log.shift();
      if ('logN' in h.state) h.state.logN = (h.state.logN || 0) + 1;
    }
    try { if (c.open) c.send({ t: 'welcome', id: target.id, code: this.code, tookSeat: true }); } catch (e) {}
    this.pushPeers();
    h.pushLobby && h.pushLobby();
    (h.scheduleBots && h.scheduleBots()) || (h.schedule && h.schedule());
    h.broadcast && h.broadcast();
  }
  // nghe tin chat, ngồi thế chỗ và WebRTC của từng kết nối; các tin '__*' không chuyển xuống game
  chatHook(c) {
    if (!c._wrappedSend) {
      c._wrappedSend = true;
      const rawSend = c.send.bind(c);
      c.send = d => {
        if (d && d.t === 'welcome' && d.id) {
          c._pid = d.id;
          queueMicrotask(() => { if (!this.dead) { this.pushPeers(); this.syncBackup(); } });
        }
        if (d && d.t === 'state' && d.view && d.view.spec) d = { ...d, view: { ...d.view, openSeats: this.openSeats() } };
        return rawSend(d);
      };
    }
    const on = c.on.bind(c);
    on('data', m => {
      if (!m) return;
      if (m.t === 'join') {
        if (this.banned && m.token && this.banned.has(String(m.token).slice(0, 48))) { try { c.send({ t: '__kicked' }); setTimeout(() => { try { c.close(); } catch (e) {} }, 300); } catch (e) {} c._banned = true; return; }
        const first = !c._chatName;
        c._chatName = String(m.name || 'Khách').slice(0, 20);
        c._uid = Number(m.uid) || 0;
        c._uname = String(m.uname || '').slice(0, 20);
        c._token = String(m.token || '').slice(0, 48);
        const atok = m.atok || m.token; /* 🎖️ huy hiệu chat phòng (patch -95): kiểm tra token ĐĂNG NHẬP người vào 1 lần để biết role + supporter (lỗi mạng thì thôi, không hiện huy hiệu). m.token là mã máy (vào lại ghế), không phải token đăng nhập nên whoami luôn null. */
        if (atok) {
          fetch(API() + '/auth/me', { headers: { Authorization: 'Bearer ' + String(atok) } }).then(r => r.json()).then(d => { if (d && d.ok && d.user) { c._role = d.user.role != null ? +d.user.role : (d.user.admin ? 2 : 0); c._sp = d.user.supporter ? 1 : 0; } }).catch(() => {});
        }
        if (first && this.chatLog.length) setTimeout(() => { try { if (c.open) c.send({ t: '__chat', hist: this.chatLog }); } catch (e) {} }, 600);
        this.pushPeers();
      }
      else if (m.t === '__chat') this.chatSay(c, m.text);
      else if (m.t === '__sit') this.takeSeat(c, m.seatId);
      else if (m.t === '__ping') { try { if (c.open) c.send({ t: '__pong', n: m.n, away: !!document.hidden }); } catch (e) {} } /* đo độ trễ (shared/ui/netmeter.js) */
      else if (m.t === '__id') { c._uid = Number(m.uid) || 0; c._uname = String(m.uname || '').slice(0, 20); this.pushPeers(); }
    });
    c.on = (ev, fn) => on(ev, ev === 'data' ? m => { if (c._banned || (m && typeof m.t === 'string' && m.t.startsWith('__'))) return; fn(m); } : fn);
  }
  chatSay(c, text) {
    if (this.dead || !chatOn(this.o.ns)) return;
    text = chatText(text); if (!text) return;
    if (this.chatClean) try { text = this.chatClean(text).text; } catch (e) {}
    if (c) { if (!c._chatName) return; const now = Date.now(); if (now - (c._chatAt || 0) < 700) return; c._chatAt = now; } /* chưa vào phòng thì không được nói; chống spam */
    const u = !c ? auth.user() : null;
    const m = { t: '__chat', id: ++this.chatN, from: c ? c._chatName : (localStorage.getItem('gumballz-name') || 'Chủ phòng'), host: !c, uid: c ? (c._uid || 0) : (u ? u.id : 0), uname: c ? (c._uname || '') : (u ? u.username : ''), rl: c ? (c._role || 0) : (u ? (u.role != null ? +u.role : (u.admin ? 2 : 0)) : 0), sp: c ? (c._sp ? 1 : 0) : (u && u.supporter ? 1 : 0), ti: c ? (((this.host && this.host.players.find(p => p.conn === c)) || {}).title || null) : titleById(myTitleId()), text }; /* 🎖️ huy hiệu chat phòng (patch -95): role + supporter của người gửi (chủ phòng đọc từ tài khoản mình, người khác do chủ phòng kiểm token lúc vào) · 🎖️ danh hiệu (patch -97): của người gửi lấy từ ghế trong phòng, của mình đọc lúc gửi */
    this.chatLog.push(m); if (this.chatLog.length > 40) this.chatLog.shift();
    for (const x of this.conns) if (x.open && x._chatName) try { x.send(m); } catch (e) {}
    chatEmit(m);
  }
  startRelays() {
    if (this.relayCode === this.code) return;
    this.relay && this.relay.destroy(); this.fb && this.fb.destroy(); this.cf && this.cf.destroy();
    this.relayCode = this.code;
    const pkKey = 'gumballz-pk-' + this.game + '-' + this.code, pk = ss.get(pkKey) || '';
    if (pk) ss.del(pkKey);
    this.cf = new CfHost(this.o.ns, this.code, c => this.o.onConn(c), { pk, onTaken: () => this.demote() });
    this.fb = new FbHost(this.o.ns, this.code, c => this.o.onConn(c));
    this.relay = new RelayHost(this.o.ns, this.code, c => this.o.onConn(c));
    this.o.onReady && this.o.onReady(this.code);
  }
  pushPeers() {
    if (this.dead) return;
    const hu = auth.user(), byPid = new Map();
    for (const c of this.conns) if (c.open && !c._banned && c._pid) byPid.set(c._pid, c);
    const list = [], seen = new Set();
    const h = this.host;
    if (h && Array.isArray(h.players)) {
      for (const p of h.players) {
        if (!p || !p.id) continue;
        const c = (p.conn && this.conns.has(p.conn) ? p.conn : null) || byPid.get(p.id);
        const isH = p.id === 'host';
        seen.add(p.id);
        list.push({
          pid: p.id, name: p.name || (isH ? 'Chủ phòng' : 'Khách'),
          uid: isH ? (hu ? hu.id : 0) : (c ? (c._uid || 0) : 0),
          uname: isH ? (hu ? hu.username : '') : (c ? (c._uname || '') : ''),
          host: isH, isBot: !!p.isBot,
        });
      }
    }
    if (!seen.has('host')) list.unshift({ pid: 'host', name: ls.get('gumballz-name') || 'Chủ phòng', uid: hu ? hu.id : 0, uname: hu ? hu.username : '', host: true, isBot: false });
    for (const c of this.conns) {
      if (!c.open || c._banned || !c._pid || seen.has(c._pid)) continue;
      seen.add(c._pid);
      list.push({ pid: c._pid, name: c._chatName || 'Khách', uid: c._uid || 0, uname: c._uname || '', host: false, isBot: false });
    }
    const sig = JSON.stringify(list);
    if (sig === this._peersSig) return;
    this._peersSig = sig;
    for (const x of this.conns) if (x.open) try { x.send({ t: '__peers', peers: list }); } catch (e) {}
    peersEmit(list);
  }
  /* chủ phòng mời một người ra khỏi phòng (cả giữa ván): cắt kết nối + chặn vào lại bằng token; ghế của họ để máy / người xem ngồi thay như người thoát */
  kick(pid) {
    if (!pid || pid === 'host') return false; let hit = false;
    for (const c of [...this.conns]) if (c._pid === pid) { hit = true; if (c._token) this.banned.add(c._token); c._banned = true; try { c.send({ t: '__kicked' }); } catch (e) {} setTimeout(() => { try { c.close(); } catch (e) {} }, 300); }
    const h = this.host; if (h && !h.state && typeof h.removePlayer === 'function') { const p = Array.isArray(h.players) && h.players.find(x => x && x.id === pid); if (p && p.token) this.banned.add(p.token); setTimeout(() => { try { h.removePlayer(pid); } catch (e) {} this.pushPeers(); }, 350); hit = true; }
    if (hit) this.pushPeers();
    return hit;
  }
  heirList() {
    const byPid = new Map();
    for (const c of this.conns) if (c.open && c._pid && c._pid !== 'host' && c._pid !== 'dealer') byPid.set(c._pid, c);
    if (!byPid.size) return [];
    const h = this.host, list = [], seen = new Set();
    const inGame = h && h.state && Array.isArray(h.state.players) ? new Set(h.state.players.map(q => q && q.id)) : null;
    if (h && Array.isArray(h.players)) {
      const seated = h.players.filter(p => p && !p.isBot && !p.local && byPid.has(p.id));
      seated.sort((a, b) => (inGame ? (inGame.has(b.id) ? 1 : 0) - (inGame.has(a.id) ? 1 : 0) : 0));
      for (const p of seated) {
        const c = byPid.get(p.id);
        seen.add(p.id);
        list.push({ conn: c, pid: p.id, tok: c._token || p.token || '', uid: c._uid || 0 });
      }
    }
    for (const [pid, c] of byPid) if (!seen.has(pid)) list.push({ conn: c, pid, tok: c._token || '', uid: c._uid || 0 });
    return list;
  }
  currentSnap() {
    const h = this.host; if (!h || !Array.isArray(h.players)) return null;
    const snap = {
      ts: Date.now(), code: this.code, offline: !!h.offline,
      players: h.players.map(({ conn, lastKey, ...p }) => p),
      state: h.state ?? null, pk: this.cf ? this.cf.k : '',
    };
    for (const k of SNAP_KEYS) if (h[k] !== undefined) snap[k] = h[k];
    try { return JSON.parse(JSON.stringify(snap)); } catch (e) { return null; }
  }
  syncBackup() {
    if (this.dead) return;
    const heirs = this.heirList();
    const pubHeirs = heirs.map(({ pid, tok, uid }) => ({ pid, tok: tok ? hashStr(tok) : '', uid })); /* chỉ gửi dấu băm: mã máy thật của người khác mà lộ ra là bị giành ghế */
    const pk = this.cf ? this.cf.k : '';
    const hSig = JSON.stringify(pubHeirs) + '|' + pk;
    if (hSig !== this._heirsSig) {
      this._heirsSig = hSig;
      for (const c of this.conns) if (c.open && c._pid) try { c.send({ t: '__heirs', heirs: pubHeirs }); } catch (e) {} /* khoá chủ phòng (pk) chỉ đi kèm __bak cho 2 người kế vị, không phát cho cả phòng */
    }
    if (!heirs.length) return;
    const snap = this.currentSnap(); if (!snap) return;
    let raw = ''; try { raw = JSON.stringify({ ...snap, ts: 0 }); } catch (e) { return; }
    if (raw.length > 180000) return;
    const hash = hashStr(raw + '|' + hSig);
    const todo = heirs.slice(0, 2).filter(h => h.conn._bakHash !== hash);
    if (!todo.length) return;
    for (const h of todo) h.conn._bakHash = hash;
    const bk = this.cf && this.cf.bk && cfEnabled() && canSeal() ? this.cf.bk : '';
    if (!bk) { for (const h of todo) try { h.conn.send({ t: '__bak', snap, heirs: pubHeirs, pk }); } catch (e) {} return; } /* không có máy chủ giữ khoá (đường dự phòng): gửi thẳng như cũ */
    sealSnap(snap, bk).then(e => { if (this.dead) return; for (const h of todo) try { if (h.conn.open) h.conn.send({ t: '__bak', enc: e.enc, iv: e.iv, heirs: pubHeirs, pk }); } catch (x) {} }).catch(() => { for (const h of todo) h.conn._bakHash = ''; });
  }
  async open() {
    this.startRelays();
    const opt = await peerOptions(); if (this.dead) return;
    if (typeof Peer === 'undefined') return; // không tải được PeerJS: vẫn chơi được qua Firebase/MQTT
    this.peer = new Peer(this.o.prefix + this.code, opt);
    this.peer.on('open', () => { this.opened = true; this.o.onReady && this.o.onReady(this.code); });
    this.peer.on('connection', c => this.o.onConn(c));
    this.peer.on('disconnected', () => { if (!this.dead) setTimeout(() => { try { if (this.peer.disconnected && !this.peer.destroyed) this.peer.reconnect(); } catch (e) {} }, 1000); });
    this.peer.on('error', e => {
      if (e.type === 'unavailable-id') { // trùng mã: phòng cũ vừa rớt thì chờ máy chủ nhả mã, phòng mới thì đổi mã
        try { this.peer.destroy(); } catch (x) {}
        if (this.opened && (this.keepTries = (this.keepTries || 0) + 1) <= 8) setTimeout(() => this.open(), 3000);
        else if (!this.opened) { this.code = makeCode(); this.open(); }
      } else if (!['network', 'server-error', 'socket-error', 'socket-closed', 'disconnected', 'peer-unavailable'].includes(e.type)) this.o.onError && this.o.onError('Lỗi mạng: ' + e.type);
    });
  }
  get game() { return String(this.o.ns || '').replace(/^gumballz-/, ''); }
  announce(open) { try { announceRoom({ game: this.game, code: this.code, k: this.pubK, host: localStorage.getItem('gumballz-name') || 'Ai đó', n: this.conns.size + 1, open, lv: myLevel() }); } catch (e) {} }
  setPublic(on) {
    this.pub = !!on; clearInterval(this.pubT);
    if (this.pub) { this.announce(true); this.pubT = setInterval(() => { if (!this.dead) this.announce(true); }, 60000); /* báo phòng công khai 1 phút/lần (máy chủ giữ 150 giây) */ }
    else this.announce(false);
  }
  destroy() {
    if (!this.dead) {
      const heirs = this.heirList();
      if (heirs.length) {
        const pubHeirs = heirs.map(({ pid, tok, uid }) => ({ pid, tok: tok ? hashStr(tok) : '', uid })), pk = this.cf ? this.cf.k : '';
        let snap = this.currentSnap();
        try { if (snap && JSON.stringify(snap).length > 420000) snap = null; } catch (e) { snap = null; }
        for (const h of heirs.slice(0, 2)) {
          try { h.conn.send({ t: '__promote', snap, heirs: pubHeirs, pk, intentional: true }); break; } catch (e) {}
        }
      }
    }
    if (this.pub) { this.pub = false; clearInterval(this.pubT); this.announce(false); }
    try { document.removeEventListener('visibilitychange', this._vis); } catch (e) {}
    try { removeEventListener('pagehide', this._unload); if (window.__gumballzHost === this) window.__gumballzHost = null; } catch (e) {}
    try { this._offAuth && this._offAuth(); } catch (e) {} try { removeEventListener('gumballz-title', this._onTitle); } catch (e) {} peersEmit([]);
    this.dead = true; clearInterval(this.hb); this.stopKeep && this.stopKeep(); this.relay && this.relay.destroy(); this.fb && this.fb.destroy(); this.cf && this.cf.destroy(); try { this.peer && this.peer.destroy(); } catch (e) {}
  }
}

// ======================= NGƯỜI VÀO PHÒNG =======================
// báo cho trang biết kết quả vào phòng (shared/net/joinlink.js nghe để xử lý link mời): welcome | fail | reject
function emit(type, code, msg) { try { dispatchEvent(new CustomEvent('gumballz-room', { detail: { type, code, msg } })); } catch (e) {} }
export class RoomClient {
  kicked() {
    if (this._kicked) return; this._kicked = true;
    const g = gameOf(this.o.ns), code = this.code;
    try { session.clear(g); } catch (e) {} try { ss.del('gumballz-bak-' + g + '-' + code); ss.del('gumballz-lost-' + g + '-' + code); } catch (e) {}
    try { this.destroy(); } catch (e) {}
    showNotice('🚪 Chủ phòng đã mời bạn ra khỏi phòng ' + (code || '') + '.');
    setTimeout(() => { try { location.href = location.pathname; } catch (e) {} }, 2600);
  }
  // opts: { ns, prefix, code, joinMsg(): object, onMsg(msg), onWelcome(id), onStatus(text, kind), onFail(text), onLost() }
  constructor(opts) {
    this.o = opts; this.code = opts.code.toUpperCase().trim(); this.id = null; this.tries = 0; this.wasIn = false;
    this.bakKey = 'gumballz-bak-' + gameOf(opts.ns) + '-' + this.code;
    this.lostKey = 'gumballz-lost-' + gameOf(opts.ns) + '-' + this.code;
    try {
      const b = JSON.parse(ss.get(this.bakKey));
      if (b && Date.now() - (b.ts || 0) < 10 * 60e3) { this.bak = b; this.heirs = b.heirs || []; this.pk = b.pk || ''; this.myPid = b.myPid || ''; }
    } catch (e) {}
    { const dk = 'gumballz-demoted-' + gameOf(opts.ns); if (ss.get(dk)) { ss.del(dk); setTimeout(() => showNotice('📶 Mạng của bạn chập chờn nên quyền chủ phòng đã chuyển cho người khác. Bạn vẫn ở trong phòng – nếu đang giữa ván thì bấm 🪑 Ngồi thay để về lại ghế nha.'), 600); } }
    peersEmit([]);
    try { window.__gumballzOpenSeats = []; window.__gumballzSit = null; } catch (e) {}
    friendsUi();
    this._offAuth = auth.onChange(u => { if (!this.dead && this.id) { this.send({ t: '__id', uid: u ? u.id : 0, uname: u ? u.username : '', vp: vipCached(), ip: idCached() }); if (u) idPass().then(p => { if (p && !this.dead && this.id) this.send({ t: '__id', uid: u.id, uname: u.username || '', vp: vipCached(), ip: p }); }); } });
    /* 🎖️ đổi danh hiệu trong Hồ sơ giữa phòng/ván: báo lại cho chủ phòng / máy chủ giữ ván (cả 2 đường, bên nào không cần thì bỏ) */
    this._onTitle = () => { if (this.dead || !this.id) return; const t = myTitleId(); this.send({ t: 'title', title: t }); this.send({ t: '__title', title: t }); };
    try { addEventListener('gumballz-title', this._onTitle); } catch (e) {}
    this.modes = opts.cfExtra ? ['cf'] /* phòng máy chủ giữ ván: chỉ đi đường Cloudflare */ : /[?&]relay=1/.test(location.search) ? ['mqtt'] : /[?&]p2p=1/.test(location.search) ? ['p2p'] : [...(cfEnabled() ? ['cf'] : []), ...(fbEnabled() ? ['fb'] : []), 'p2p', 'mqtt'];
    this.mi = 0;
    if (this.modes.includes('p2p')) this.initPeer();
    this.connect();
  }
  saveBak() { if (this.bak) ss.set(this.bakKey, JSON.stringify(this.bak)); }
  checkAutoPromote() {
    const bak = this.bak;
    if (!bak || !(bak.snap || bak.enc) || this._promoting || this._claiming || this.dead) return false;
    /* chỉ tiếp quản khi CHẮC là chủ phòng đã mất: máy chủ báo phòng không còn chủ, hoặc mình nối được máy chủ mà chủ phòng không đáp.
       Còn nếu chính mình rớt mạng (không nối nổi máy chủ) thì không được giành quyền của một chủ phòng đang khoẻ. */
    if (this.modes.includes('cf') && !this._hostGone) { ss.del(this.lostKey); return false; }
    const heirs = (this.heirs && this.heirs.length ? this.heirs : bak.heirs) || [];
    const tok = token(), pid = this.myPid || bak.myPid || this.id;
    const rank = heirs.findIndex(x => (pid && x.pid === pid) || (tok && x.tok === hashStr(tok)));
    if (rank < 0) return false;
    let lostAt = +ss.get(this.lostKey);
    if (!lostAt || Date.now() - lostAt > 120000) { lostAt = Date.now(); ss.set(this.lostKey, String(lostAt)); } /* mốc cũ từ lần rớt trước (quá 2 phút) thì tính lại từ đầu */
    const need = rank === 0 ? 12000 : rank === 1 ? 20000 : 28000; /* chờ đủ lâu để chủ phòng kịp tải lại trang / nối lại mạng (trước là 4,5 giây – chớp mạng một cái là bị giành quyền, cả bàn bị giật lùi) */
    if (Date.now() - lostAt >= need) {
      this.promoteFromBak(pid);
      return true;
    }
    return 'wait'; /* đủ điều kiện kế vị, đang chờ cho đủ thời gian */
  }
  async promoteFromBak(pid) {
    const bak = this.bak, pk = this.pk || bak.pk || (bak.snap && bak.snap.pk) || '';
    if (bak.snap) { this.becomeHost({ snap: bak.snap, pk, myPid: pid }, 150); return; }
    this._claiming = true; clearTimeout(this.joinTimer); clearTimeout(this._retryT);
    try { this.conn && this.conn.close(); } catch (e) {} this.conn = null;
    this.status('👑 Đang tiếp quản quyền chủ phòng…', 'wait');
    let snap = null, r = null;
    try { r = await cfClaim(this.o.ns, this.code, pk); if (r && r.bk) snap = await openSnap(bak.enc, bak.iv, r.bk); } catch (e) { snap = null; }
    this._claiming = false;
    if (this.dead) return;
    if (snap) { this.becomeHost({ snap, pk: '', myPid: pid, claimed: true }, 150); if (this._promoting) return; }
    /* không lấy được khoá: người khác đã tiếp quản (bỏ bản sao cũ) hoặc lỗi mạng → quay lại vào phòng như thường */
    if (r && r.no) { this.bak = null; ss.del(this.bakKey); }
    ss.del(this.lostKey); this._hostGone = false; this.mi = 0;
    this._retryT = setTimeout(() => { if (!this.dead) this.connect(); }, 1200);
  }
  becomeHost(raw, delayMs = 400) {
    if (this._promoting || this.dead) return;
    const myPid = raw.myPid || this.id || this.myPid;
    const exId = 'pex' + Math.random().toString(36).slice(2, 6);
    const snap = swapHostSnap(raw.snap, myPid, exId);
    if (!snap) return;
    this._promoting = true;
    const g = gameOf(this.o.ns), pk = raw.claimed ? '' : (raw.pk || snap.pk || ''); /* claimed: đã giữ ghế chủ phòng trên máy chủ bằng chìa mới (cfClaim), không cần pk nữa */
    delete snap.pk;
    ls.set('gumballz-hostsnap-' + g, JSON.stringify(snap));
    session.save(g, { role: 'host', code: this.code });
    if (pk) ss.set('gumballz-pk-' + g + '-' + this.code, pk);
    ss.set('gumballz-promoted-' + g, '1');
    ss.del(this.bakKey); ss.del(this.lostKey);
    this.status('👑 Đang tiếp quản quyền chủ phòng…', 'wait');
    this.destroy();
    setTimeout(() => { try { location.reload(); } catch (e) {} }, delayMs);
  }
  status(t, kind = 'wait') { this.o.onStatus && this.o.onStatus(t, kind); }
  initPeer() {
    this.peerOpen = new Promise(async res => {
      const opt = await peerOptions(); if (this.dead) return;
      setTimeout(() => res(false), 6000);
      if (typeof Peer === 'undefined') { res(false); return; }
      try { this.peer = new Peer(undefined, opt); } catch (e) { res(false); return; }
      this.stopKeep = keepAlive(() => this.peer);
      this.peer.on('open', () => res(true));
      this.peer.on('error', e => { if (e.type === 'peer-unavailable' && this.mode() === 'p2p' && !this.id) this.next(); else res(false); });
    });
  }
  mode() { return this.modes[this.mi]; }
  next(fastCf = false) {
    if (this.dead || this.id || this._claiming) return;
    clearTimeout(this.joinTimer);
    const ap = this.checkAutoPromote();
    if (ap === true) return;
    if (ap === 'wait' && this.modes.includes('cf')) { /* đang chờ tới lượt tiếp quản: cứ hỏi lại máy chủ chính, đừng đốt hết lượt thử qua các đường dự phòng rồi bỏ cuộc */
      this.mi = this.modes.indexOf('cf'); this.status('Đang chờ chủ phòng hoặc chuyển quyền chủ phòng…');
      clearTimeout(this._retryT); this._retryT = setTimeout(() => this.connect(), 1800);
      return;
    }
    if (fastCf && this.mode() === 'cf' && this.bak && (this.bak.snap || this.bak.enc) && (this._cfFast = (this._cfFast || 0) + 1) <= 3) {
      this.status('Đang chờ chủ phòng hoặc chuyển quyền chủ phòng…');
      clearTimeout(this._retryT); this._retryT = setTimeout(() => this.connect(), 1800);
      return;
    }
    if (this.mi < this.modes.length - 1) { this.mi++; this.connect(); return; }
    // hết đường: thử lại vòng mới. Đang chơi mà rớt thì kiên nhẫn hơn (chủ phòng có thể đang tải lại trang)
    const max = this.wasIn ? 12 : 2;
    if (++this.tries <= max) { this.status(this.wasIn ? `Mất kết nối – đang vào lại (${this.tries}/${max})…` : `Chưa thấy phòng, thử lại (${this.tries}/${max})…`); this.mi = 0; clearTimeout(this._retryT); this._retryT = setTimeout(() => this.connect(), this.wasIn ? 3000 : 2000); return; }
    const msg = this.wasIn ? 'Không vào lại được phòng. Có thể chủ phòng đã thoát.' : `Không tìm thấy phòng ${this.code}. Kiểm tra lại mã – chủ phòng phải đang mở tab game.`;
    this.status(msg, 'fail'); this.o.onFail && this.o.onFail(msg); emit('fail', this.code, msg);
  }
  retryNow() { if (this.dead || this.id) return; this.tries = 0; this.mi = 0; this.connect(); }
  async connect() {
    if (this.dead || this.id || this._claiming) return;
    clearTimeout(this._retryT);
    const mode = this.mode();
    try { this.conn && this.conn.close(); } catch (e) {}
    this.conn = null;
    let conn;
    if (!this.wasIn) this.status(this.tries ? `Đang thử lại (${this.tries})…` : 'Đang kết nối…');
    if (mode === 'p2p') {
      const ok = await this.peerOpen; if (this.dead || this.id) return;
      if (!ok || !this.peer || this.peer.disconnected) { this.next(); return; }
      conn = this.peer.connect(this.o.prefix + this.code, { reliable: true });
    } else if (mode === 'cf') conn = cfConnect(this.o.ns, this.code, this.o.cfExtra || '');
    else if (mode === 'fb') conn = fbConnect(this.o.ns, this.code);
    else conn = relayConnect(this.o.ns, this.code);
    this.conn = conn;
    clearTimeout(this.joinTimer);
    this.joinTimer = setTimeout(() => { if (!this.id && conn === this.conn) { if (mode === 'cf') this._hostGone = !!conn.wasOpen; /* nối được máy chủ mà chủ phòng không đáp */ this.next(); } }, mode === 'p2p' ? 7000 : mode === 'cf' ? 8000 : 12000);
    conn.on('open', () => { if (conn === this.conn) { const u = auth.user(), vp = vipCached(), ip = idCached(); conn.send({ t: 'join', token: token(), atok: auth.token() || '', uid: u ? u.id : 0, uname: u ? u.username : '', ...(vp ? { vp } : {}), ...(ip ? { ip } : {}), ...this.o.joinMsg(), title: myTitleId() }); /* 🎖️ token máy (vào lại ghế cũ) khác với atok = token đăng nhập (máy chủ tra danh hiệu + vai trò) — trước đây chỉ gửi token máy nên whoami luôn null, danh hiệu + huy hiệu phòng srv/P2P không hiện */ if (u) Promise.all([u.admin && u.owner ? vipPass() : vp, idPass()]).then(([p, q]) => { if ((p !== vp || q !== ip) && conn === this.conn && !this.dead) conn.send({ t: '__id', uid: u.id, uname: u.username || '', vp: p || '', ip: q || '' }); }); } }); /* 👑 vé chủ web – shared/ui/vip.js · 🪪 vé tài khoản */
    conn.on('data', msg => {
      if (conn !== this.conn || !msg) return;
      this.lastSeen = Date.now();
      if (msg.t === '__hb') return;
      if (msg.t === '__pong') { this._pingWait = 0; netEmit({ rtt: Date.now() - (+msg.n || Date.now()), away: !!msg.away }); return; }
      if (msg.t === '__away') { netEmit({ away: !!msg.on }); return; }
      if (msg.t === '__peers') { peersEmit(msg.peers); return; }
      if (msg.t === '__kicked') { this.kicked(); return; } /* chủ phòng mời mình ra khỏi phòng */
      if (msg.t === '__own') { if (this.o.onOwn) try { this.o.onOwn(msg); } catch (e) {} return; } /* phòng máy chủ giữ ván: người tạo phòng rời đi, mình được trao quyền chủ phòng */
      if (msg.t === '__heirs') {
        this.heirs = msg.heirs || []; this.pk = msg.pk || this.pk || '';
        if (this.bak) { this.bak.heirs = this.heirs; this.bak.pk = this.pk || this.bak.pk; this.saveBak(); }
        return;
      }
      if (msg.t === '__bak') {
        this.bak = { snap: msg.snap, enc: msg.enc, iv: msg.iv, heirs: msg.heirs || [], pk: msg.pk || '', myPid: this.id || this.myPid, ts: Date.now() };
        this.heirs = this.bak.heirs; this.pk = this.bak.pk; this.saveBak();
        return;
      }
      if (msg.t === '__promote') {
        const snap = msg.snap || (this.bak && this.bak.snap);
        const myPid = this.id || this.myPid || (this.bak && this.bak.myPid);
        if (snap && myPid) this.becomeHost({ snap, pk: msg.pk || this.pk || (this.bak && this.bak.pk) || snap.pk || '', myPid }, 450);
        return;
      }
      if (msg.t === '__chat') { if (msg.hist) { chatEmit({ reset: true }); for (const h of msg.hist) chatEmit({ ...h, old: true }); } else chatEmit(msg); return; }
      if (msg.t === 'welcome') {
        this.myPid = msg.id; this._cfFast = 0; this._hostGone = false; ss.del(this.lostKey);
        try { window.__gumballzSrvRoom = !!msg.srv; } catch (e) {} /* phòng do máy chủ giữ ván: cờ chủ web chỉ tin khi có máy chủ kiểm vé */
        if (this.bak && this.bak.myPid !== msg.id) { this.bak.myPid = msg.id; this.saveBak(); }
        if (!msg.tookSeat) {
          try { window.__gumballzRoom = { reId: () => { const u = auth.user(); if (u && !this.dead && this.id) idPass().then(p => this.send({ t: '__id', uid: u.id, uname: u.username || '', vp: vipCached(), ip: p || '' })); }, game: gameOf(this.o.ns), code: () => this.code, alive: () => !this.dead && !!this.id, myId: () => this.id || this.myPid, kick: pid => { try { this.conn && this.conn.send({ t: '__kick', pid }); } catch (e) {} return true; } }; } catch (e) {} /* kick: chỉ có tác dụng khi mình là người tạo phòng ở phòng máy chủ giữ ván (máy chủ tự kiểm) */
          if (chatOn(this.o.ns)) chatUi({ game: gameOf(this.o.ns), host: false, send: t => this.send({ t: '__chat', text: chatText(t) }), history: () => chatBuf.slice(), alive: () => !this.dead && !!this.id });
        }
        clearTimeout(this.joinTimer); this.id = msg.id; this.tries = 0; this.wasIn = true;
        this.startPing();
        if (!msg.tookSeat) this.watch(conn, lost);
        this.status(msg.tookSeat ? 'Đã vào ghế!' : 'Đã vào phòng', 'ok');
        this.o.onWelcome && this.o.onWelcome(msg.id, msg);
        if (!msg.tookSeat) emit('welcome', this.code);
        return;
      }
      if (msg.t === 'state') {
        try {
          window.__gumballzOpenSeats = (msg.view && Array.isArray(msg.view.openSeats)) ? msg.view.openSeats : [];
          window.__gumballzSit = seatId => this.send({ t: '__sit', seatId });
          dispatchEvent(new CustomEvent('gumballz-seats'));
        } catch (e) {}
      }
      this.o.onMsg(msg);
      if (msg.t === 'error' && !this.id && !this.wasIn && !this.dead) emit('reject', this.code, msg.msg); // chủ phòng từ chối (đủ người, ván đang chơi…)
    });
    const lost = () => {
      if (conn !== this.conn || this.dead || conn._gone) return;
      if (!this.id) { if (conn._nx) return; conn._nx = true; /* close + error cùng bắn: chỉ tính 1 lần */ if (mode === 'cf') this._hostGone = !!conn.notFound; /* máy chủ báo phòng không còn chủ = bằng chứng chắc chắn */ if (conn.notFound || mode !== 'p2p') this.next(!!conn.notFound || mode === 'cf'); return; }
      conn._gone = true; this.id = null; this.tries = 0; this.mi = 0; this._cfFast = 0;
      if (!ss.get(this.lostKey)) ss.set(this.lostKey, String(Date.now()));
      this.status('Mất kết nối – đang vào lại…'); this.o.onLost && this.o.onLost();
      clearTimeout(this._retryT); this._retryT = setTimeout(() => { if (!this.dead) this.connect(); }, 1500);
    };
    conn.on('close', lost); conn.on('error', lost);
  }
  // chủ phòng có gửi nhịp tim (bản mới): im lặng quá 8 giây thì coi như mất kết nối và vào lại
  watch(conn, lost) {
    clearInterval(this.wd); this.lastSeen = Date.now(); let gotHb = false;
    const onHb = m => { if (m && m.t === '__hb') gotHb = true; }; conn.on('data', onHb);
    this.wd = setInterval(() => {
      if (this.dead || conn !== this.conn) { clearInterval(this.wd); return; }
      if (gotHb && Date.now() - this.lastSeen > 8000) { clearInterval(this.wd); try { conn.close(); } catch (e) {} lost(); }
    }, 1000);
  }
  // đo độ trễ tới chủ phòng: 45 giây/lần (lần đầu sau 4 giây). Chủ phòng bản cũ không đáp thì coi như không đo được, không báo gì.
  startPing() {
    netUi(gameOf(this.o.ns)); netEmit({ reset: true }); clearInterval(this.pingT); clearTimeout(this.pingT0); this._pingWait = 0; this._ponged = false;
    const go = () => {
      if (this.dead || !this.conn || !this.conn.open || document.hidden) return;
      if (this._pingWait >= 1 && this._everPong) netEmit({ lost: this._pingWait });
      this._pingWait++; try { this.conn.send({ t: '__ping', n: Date.now() }); } catch (e) {}
    };
    const onPong = e => { if (e.detail && 'rtt' in e.detail) this._everPong = true; };
    if (!this._pongL) { this._pongL = onPong; addEventListener('gumballz-net', onPong); }
    this.pingT0 = setTimeout(go, 4000); this.pingT = setInterval(go, 45000); /* 45 giây/lần: mỗi lần đo đánh thức phòng trên máy chủ (tốn thời gian chạy) */
  }
  send(msg) { if (this.conn && this.conn.open) this.conn.send(msg); }
  destroy() {
    this.dead = true; clearInterval(this.wd); clearInterval(this.pingT); clearTimeout(this.pingT0); try { removeEventListener('gumballz-net', this._pongL); } catch (e) {} netEmit({ reset: true }); clearTimeout(this.joinTimer); clearTimeout(this._retryT); this.stopKeep && this.stopKeep();
    try { this._offAuth && this._offAuth(); } catch (e) {} try { removeEventListener('gumballz-title', this._onTitle); } catch (e) {} peersEmit([]);
    try { window.__gumballzOpenSeats = []; window.__gumballzSit = null; dispatchEvent(new CustomEvent('gumballz-seats')); } catch (e) {}
    try { this.conn && this.conn.close(); } catch (e) {} try { this.peer && this.peer.destroy(); } catch (e) {}
  }
}
