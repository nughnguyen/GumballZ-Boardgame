// 🖥️ Chủ phòng từ xa – phần dùng chung cho các game "máy chủ giữ ván" (server/src/srvhost.js chạy lõi <game>/js/host.js ngay trong Durable Object).
// Máy người tạo phòng chỉ là một khách đặc biệt ngồi ghế 'host': gửi lệnh phòng chờ ({ t: 'cmd', m, a }) và hành động như mọi người.
// Nhờ vậy chủ phòng để tab ở nền / khoá điện thoại / rớt mạng thì ván vẫn chạy; rời hẳn thì máy chủ trao quyền cho người kế ({ t: '__own' }).
import { RoomClient, session, makeCode } from './room.js?v=54';
import { announceRoom, myLevel } from './api.js?v=29';
const rkey = () => Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
/* Game có bật chế độ máy chủ giữ ván không: ?srv=1 / ?srv=0 ghi đè (nhớ trong localStorage 'gumballz-srv-<game>'), không thì theo mặc định của game.
   Mở phòng trên máy chủ thất bại thì lần tạo kế trong tab này quay về kiểu cũ ('gumballz-srv-off'). */
export function srvOn(game, def = false) {
  try { const q = new URLSearchParams(location.search).get('srv'); if (q !== null) localStorage.setItem('gumballz-srv-' + game, q === '0' ? '0' : '1');
    const v = localStorage.getItem('gumballz-srv-' + game); return (v === null ? def : v !== '0') && sessionStorage.getItem('gumballz-srv-off') !== '1'; } catch (e) { return false; }
}
/* phiên của khách khi được trao quyền chủ phòng: lưu chìa rồi tải lại để vào ghế chủ (dùng trong onOwn của RoomClient) */
export function takeOwnership(game, code, name, m, room) { if (!m || !m.ok) return; session.save(game, { role: 'srv', code, ok: String(m.ok), name }); try { room && room.destroy(); } catch (e) {} location.reload(); }

export class RemoteBase {
  // o: { game, ns, prefix, h (handlers đã bọc watch), name, joinMsg: () => tin vào phòng, code, ok, cmds: [tên lệnh phòng chờ], onFresh(send): áp luật mặc định cho phòng mới, onMsg(msg): tin riêng của game (trả true nếu đã xử lý) }
  constructor(o) {
    this.o = o; this.h = o.h; this.isHost = true; this.remote = true; this.name = o.name; this.game = o.game; this.fresh = !o.code; this.restoring = !!o.code; this.everIn = false; this.n = 1; this.pub = false; this.dead = false;
    this.pubK = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    this.code = (o.code || makeCode()).toUpperCase(); this.ok = o.ok || rkey();
    const send = (m, ...a) => this.room.send({ t: 'cmd', m, a });
    this.room = new RoomClient({
      ns: o.ns, prefix: o.prefix, code: this.code, cfExtra: `srv=${o.game}&ok=${this.ok}`, joinMsg: o.joinMsg || (() => ({ name: this.name })),
      onStatus: (t, k) => { this.h.onNet && this.h.onNet(t, k, () => this.room.retryNow()); },
      onFail: () => {
        if (this.restoring && !this.everIn) { session.save(o.game, { role: 'client', code: this.code, name: this.name }); location.reload(); return; } /* vắng lâu quá, quyền chủ phòng đã trao cho người khác: vào lại như khách */
        try { sessionStorage.setItem('gumballz-srv-off', '1'); } catch (e) {} this.h.onError('Chưa mở được phòng trên máy chủ – bấm tạo phòng lần nữa nha.'); session.clear(o.game); this.h.onFail && this.h.onFail(); },
      onWelcome: () => {
        session.save(o.game, { role: 'srv', code: this.code, ok: this.ok, name: this.name }); this.everIn = true;
        try { window.__gumballzHost = this._p || this; dispatchEvent(new CustomEvent('gumballz-host', { detail: this._p || this })); } catch (e) {} /* để shared/ui/homebtn.js gắn công tắc 🌐 Công khai phòng */
        if (this.fresh) { this.fresh = false; try { o.onFresh && o.onFresh(send); } catch (e) {} }
        if (this._resume) { const r = this._resume; this._resume = null; this.goLocal(r, null); }
      },
      onLost: () => this.h.onDisconnect && this.h.onDisconnect(),
      onMsg: msg => {
        if (!msg) return;
        if (msg.t === 'local') { const f = this._localWait; this._localWait = null; f && f(msg); return; }
        if (msg.t === 'guest') { if (this.local) { this.backToServer(true); import('../ui/dialog.js?v=10').then(d => d.toast(`👋 ${String(msg.name || 'Có người').slice(0, 20)} vừa vào phòng – ván chuyển lên máy chủ để bạn ấy xem cùng, ván sau chơi chung nha`, 6000)).catch(() => {}); } return; } /* có người vào: đẩy nguyên ván đang chơi lên máy chủ */
        if ((this.local || this._resume) && (msg.t === 'lobby' || msg.t === 'state')) { if (msg.t === 'lobby') this.n = (Array.isArray(msg.info) ? msg.info : (msg.info && msg.info.players) || []).filter(p => !p.isBot).length || 1; return; } /* đang chơi với máy trên máy mình: phòng trên máy chủ chỉ giữ chỗ */
        if (o.onMsg && o.onMsg(msg)) return;
        if (msg.t === 'lobby') { this.n = (Array.isArray(msg.info) ? msg.info : (msg.info && msg.info.players) || []).filter(p => !p.isBot).length || 1; this.h.onLobby(msg.info, msg.code, msg.started); }
        else if (msg.t === 'state') this.h.onState(msg.view, msg.tmo);
        else if (msg.t === 'error') this.h.onError(msg.msg);
        else if (msg.t === 'react') this.h.onReact && this.h.onReact(msg);
      },
    });
    for (const m of o.cmds || []) this[m] = (...a) => send(m, ...a);
    /* 🤖 Chơi một mình với máy: bấm Bắt đầu mà phòng không có ai khác thì ván chạy trên máy mình (máy chủ được ngủ, không tốn tiền);
       phòng trên máy chủ vẫn giữ mã để bạn bè vào chờ. Về phòng chờ thì gửi lại xu/luật cho máy chủ (__unlocal). */
    this.MK = 'gumballz-srvlocal-' + o.game; this.SK = o.snapKey || 'gumballz-hostsnap-' + o.game;
    if (o.local && o.code) try { if (localStorage.getItem(this.MK) === this.code) { const d = JSON.parse(localStorage.getItem(this.SK)); if (d && d.state && d.offline && Date.now() - d.ts < 3 * 3600e3) this._resume = d; else localStorage.removeItem(this.MK); } } catch (e) {}
    if (o.local) { const remoteStart = this.start; this.start = (...a) => this.tryLocal(a, remoteStart); }
    const KEEP = new Set(['code', 'remote', 'isHost', 'leave', 'destroy', 'setPublic', 'announce', 'send', 'pub', 'game', 'name', 'room', 'o', 'h', 'offline', 'local', 'n', 'me', 'pubK', 'ok', 'dead']);
    return this._p = new Proxy(this, { get(t, k, r) { const L = t.local; if (L && typeof k === 'string' && !KEEP.has(k) && k in L) { const v = L[k]; return typeof v === 'function' ? v.bind(L) : v; } return Reflect.get(t, k, r); } });
  }
  tryLocal(args, remoteStart) {
    if (this.local || this.n > 1) return remoteStart(...args); /* có người thật khác trong phòng: máy chủ giữ ván như thường */
    let done = false; const fall = () => { if (!done) { done = true; remoteStart(...args); } };
    this._localWait = m => { if (done) return; done = true; if (m && m.ok && m.snap) this.goLocal({ ...m.snap, state: null }, args); else remoteStart(...args); };
    this.room.send({ t: '__local' }); setTimeout(fall, 2500);
  }
  goLocal(restore, args) {
    const o = this.o, raw = o.raw || this.h;
    const hh = { ...raw,
      onLobby: (info, code, started, ...r) => raw.onLobby(info, this.code, started, ...r),
      onState: (v, ...r) => { if (v === null && this.local) { this.backToServer(); return; } raw.onState(v, ...r); },
      onError: m => raw.onError && raw.onError(m) };
    try { this.local = o.local(hh, { ...restore, code: 'OFFLINE', ts: Date.now() }); } catch (e) { console.error('local', e); this.local = null; if (args) this.room.send({ t: 'cmd', m: 'start', a: args }); return; }
    try { localStorage.setItem(this.MK, this.code); } catch (e) {}
    if (args) this.local.start(...args);
  }
  backToServer(keep = false) { /* keep: đẩy cả ván đang chơi lên máy chủ (có người vào xem); không thì về phòng chờ */
    const L = this.local; if (!L) return; this.local = null;
    let snap = null; try { snap = L.snapData ? L.snapData() : null; } catch (e) {}
    try { L.destroy(); } catch (e) {} try { localStorage.removeItem(this.MK); localStorage.removeItem(this.SK); } catch (e) {}
    if (snap) { const { ts, code, offline, state, ...x } = snap; this.room.send({ t: '__unlocal', snap: keep && state ? { ...x, state } : x, keep: !!(keep && state) }); }
    else this.room.send({ t: '__unlocal' });
    if (!keep || !snap) (this.o.raw || this.h).onState(null);
  }
  send(msg) { this.room.send(msg); }
  announce(open) { try { announceRoom({ game: this.game, code: this.code, k: this.pubK, host: this.name || 'Ai đó', n: this.n, open, lv: myLevel() }); } catch (e) {} }
  setPublic(on) { this.pub = !!on; clearInterval(this.pubT); if (this.pub) { this.announce(true); this.pubT = setInterval(() => { if (!this.dead) this.announce(true); }, 60000); } else this.announce(false); }
  destroy() { if (this.local) { try { this.local.destroy(); } catch (e) {} this.local = null; } this.dead = true; clearInterval(this.pubT); if (this.pub) { this.pub = false; this.announce(false); } try { if (window.__gumballzHost === this || window.__gumballzHost === this._p) window.__gumballzHost = null; } catch (e) {} this.room.destroy(); }
  leave() { try { localStorage.removeItem(this.MK); } catch (e) {} this.room.send({ t: 'close' }); setTimeout(() => this.destroy(), 150); session.clear(this.game); } /* người tạo phòng rời đi: máy chủ trao quyền cho người kế (không còn ai thì đóng phòng) */
}
