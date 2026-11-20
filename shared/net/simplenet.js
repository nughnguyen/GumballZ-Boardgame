// Lớp mạng dùng chung cho game nhỏ (Cờ tướng, Thật hay Thách…): chủ phòng giữ state, khách chỉ gửi action.
// Game chỉ cần khai báo luật; phần phòng, vào lại, người xem, bot, lưu phòng, đếm thành tích đều nằm ở đây.
//   const { Host, Client, loadSnapshot, session } = makeNet({
//     game: 'cotuong', min: 2, max: 2,                       // tên thư mục game, số người
//     defaults: {…}, optOk: (k, v, opts) => true/false,      // luật bàn + kiểm tra giá trị hợp lệ
//     create: (players, opts) => state, apply: (s, pid, a) => ({ ok, reason }), view: (s, pid) => view,
//     actors: s => [id…],                                     // ai đang phải hành động (để hẹn bot / người rớt mạng)
//     bot: (s, pid) => action | null, botDelay: (s, pid) => ms,
//     botNames: [...], allowLocal: true,                      // allowLocal: cho thêm "người chơi cùng máy" (chuyền tay)
//   });
// Người chơi cùng máy (local) và bot do máy chủ phòng điều khiển: hành động của họ gửi qua net.actAs(id, a).
import { RoomHost, RoomClient, token, session } from './room.js?v=51';
import { specBanner } from '../ui/spectate.js?v=8';
import { watch } from '../ui/stats.js?v=85';
export { session };
import { RemoteBase, srvOn, takeOwnership } from './remotehost.js?v=1';
const HB_MS = 2500, STALL_MS = 8000, AWAY_MS = 8000;

export function makeNet(cfg) {
  const GAME = cfg.game, NS = 'gumballz-' + GAME, PREFIX = NS + '-', SNAP = 'gumballz-hostsnap-' + GAME;
  const playerData = (data, name, local = false, incoming = false) => { try { const d = incoming ? cfg.cleanPlayerData && cfg.cleanPlayerData(data) : cfg.getPlayerData && cfg.getPlayerData(name, local); return d && typeof d === 'object' ? d : null; } catch (e) { return null; } };
  const MAX = cfg.max || 8, MIN = cfg.min || 2;
  const BOT_NAMES = cfg.botNames || ['Kẹo', 'Xôi', 'Gấu Bông', 'Đậu', 'Nấm', 'Sữa', 'Mochi', 'Pudding'];
  const loadSnapshot = () => { try { const d = JSON.parse(localStorage.getItem(SNAP)); return d && Date.now() - d.ts < 3 * 3600e3 ? d : null; } catch (e) { return null; } };

  class Host {
    constructor(name, handlers, offline = false, restore = null) {
      this.h = watch(GAME, handlers, () => 'host'); this.offline = offline;
      this.players = [{ id: 'host', name, isBot: false, token: token(), conn: null, connected: true, data: playerData(null, name) }];
      this.state = null; this.conns = new Map(); this.timers = {}; this.opts = { ...(cfg.defaults || {}) };
      this.hs = Math.random().toString(36).slice(2, 8);
      if (restore) {
        this.players = restore.players.map(p => ({ ...p, conn: null, connected: p.isBot || p.local || p.id === 'host' }));
        this.state = restore.state; this.code = restore.code; this.opts = { ...this.opts, ...(restore.opts || {}) };
        if (!this.state) this.pruneT = setTimeout(() => { if (!this.dead && !this.state) { const b = this.players.length; this.players = this.players.filter(p => p.id === 'host' || p.isBot || p.local || p.connected); if (this.players.length !== b) this.pushLobby(); } }, 12000);
      }
      if (offline) { this.code = 'OFFLINE'; setTimeout(() => { this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); } }, 0); return; }
      this.room = new RoomHost({ ns: NS, prefix: PREFIX, code: this.code, keepCode: !!restore, host: this, onConn: c => this.attach(c), onReady: code => { this.code = code; session.save(GAME, { role: 'host', code }); this.pushLobby(); }, onError: m => this.h.onError(m) });
      this.code = this.room.code;
      this.hb = setInterval(() => this.heartbeat(), HB_MS);
      setTimeout(() => { this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); } }, 0);
    }
    saveSnap() { clearTimeout(this.snapT); this.snapT = setTimeout(() => { try { localStorage.setItem(SNAP, JSON.stringify({ ts: Date.now(), code: this.code, offline: this.offline, ...this.snapData() })); } catch (e) {} }, 300); }
    snapData() { return { opts: this.opts, players: this.players.map(({ conn, ...p }) => p), state: this.state }; } /* ảnh chụp ván (đẩy ván chơi-với-máy lên máy chủ) */
    attach(conn) { conn.on('data', m => this.onMsg(conn, m)); conn.on('close', () => this.onLeave(conn)); conn.on('error', () => this.onLeave(conn)); }
    onMsg(conn, msg) {
      if (!msg) return;
      if (msg.t === 'join') {
        let p = this.players.find(x => x.token === msg.token && !x.isBot && !x.local && x.id !== 'host');
        if (p) { const old = p.conn; p.conn = conn; p.connected = true; if (old && old !== conn) try { old.close(); } catch (e) {} } /* gán kết nối mới TRƯỚC khi đóng cái cũ, kẻo onLeave tưởng người này đã rời */
        else {
          if (this.players.length >= (cfg.maxSeats || MAX + 6)) { conn.send({ t: 'error', msg: 'Phòng đã đầy.' }); return; } // quá số người chơi thì thành người xem
          p = { id: 'p' + Math.random().toString(36).slice(2, 8), name: String(msg.name || 'Khách').slice(0, 16), isBot: false, token: msg.token, conn, connected: true, data: playerData(msg.data, msg.name, false, true) };
          this.players.push(p);
        }
        this.conns.set(conn, p); conn.send({ t: 'welcome', id: p.id, code: this.code });
        this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); }
      } else if (msg.t === 'action') { const p = this.conns.get(conn); if (p && p.conn === conn && this.inGame(p.id)) this.act(p.id, msg.a); }
      else if (msg.t === 'sync') { const p = this.conns.get(conn); if (!p || p.conn !== conn) return; if (this.state) this.sendState(p); else conn.send({ t: 'lobby', info: this.lobbyInfo(), code: this.code, started: false }); }
    }
    onLeave(conn) {
      const p = this.conns.get(conn); if (!p) return; this.conns.delete(conn); if (p.conn !== conn) return;
      p.conn = null; p.connected = false;
      if (!this.inGame(p.id)) this.players = this.players.filter(x => x !== p);
      else if (!this.state) setTimeout(() => { if (!this.state && !p.connected && this.players.includes(p)) { this.players = this.players.filter(x => x !== p); this.pushLobby(); } }, 12000); /* phòng chờ: rớt quá 12 giây không quay lại thì trả ghế, kẻo phòng báo đầy vì toàn ghế ma */
      this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); }
    }
    inGame(id) { const s = this.state; return !s || !s.players || s.players.some(q => q.id === id); } // vào giữa ván: chỉ xem
    lobbyInfo() { return { players: this.players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, connected: p.connected, level: p.level })), opts: this.opts, min: MIN, max: MAX }; }
    pushLobby() { const info = this.lobbyInfo(); this.h.onLobby(info, this.code, !!this.state); this.saveSnap(); for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'lobby', info, code: this.code, started: !!this.state }); } catch (e) {} }
    setOpt(k, v) { if (this.state || (cfg.optOk && !cfg.optOk(k, v, this.opts))) return; this.opts = { ...this.opts, [k]: v }; this.pushLobby(); }
    usedNames() { return this.players.map(p => p.name.replace(' 🤖', '').trim().toLowerCase()); }
    addBot(extra = {}) { if (this.state || !cfg.bot || this.players.length >= MAX) return; const ini = this.players.map(p => (p.name || '?')[0].toLowerCase()); /* tên bot khác chữ cái đầu với người đang ngồi */ const free = BOT_NAMES.filter(n => !this.usedNames().includes(n.toLowerCase())); const nm = free.find(n => !ini.includes(n[0].toLowerCase())) || free[0] || 'Bot' + this.players.length; this.players.push({ id: 'bot' + Math.random().toString(36).slice(2, 7), name: nm + ' 🤖', isBot: true, token: null, conn: null, connected: true, ...extra }); this.pushLobby(); }
    addLocal(name) { // người chơi cùng máy (chuyền tay)
      if (this.state || !cfg.allowLocal || this.players.length >= MAX) return false;
      const nm = String(name || '').trim().slice(0, 16); if (!nm) return false;
      if (this.usedNames().includes(nm.toLowerCase())) { this.h.onError('Tên này có rồi, đặt tên khác nha.'); return false; }
      this.players.push({ id: 'l' + Math.random().toString(36).slice(2, 7), name: nm, isBot: false, local: true, token: null, conn: null, connected: true, data: playerData(null, nm, true) }); this.pushLobby(); return true;
    }
    removePlayer(id) { if (this.state) return; const p = this.players.find(x => x.id === id); if (!p || p.id === 'host') return; if (p.conn) try { p.conn.send({ t: 'kicked' }); p.conn.close(); } catch (e) {} this.players = this.players.filter(x => x !== p); this.pushLobby(); }
    seated() { return this.players.filter(p => p.connected || p.isBot || p.local).slice(0, MAX); }
    start(extra) {
      const ps = this.seated(); if (ps.length < MIN) { this.h.onError(cfg.minMsg || `Cần ít nhất ${MIN} người.`); return; }
      this.clearTimers();
      try { this.state = cfg.create(ps.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level, data: p.data || null })), { ...this.opts, ...(extra || {}) }); } catch (e) { this.h.onError(e.message || 'Không bắt đầu được ván.'); return; }
      this.pushLobby(); this.schedule(); this.broadcast();
    }
    restart() { this.clearTimers(); this.state = null; this.pushLobby(); for (const p of this.players) if (p.conn) this.sendRaw(p, null); this.h.onState(null); }
    controls(id) { const p = this.players.find(x => x.id === id); return !!p && (p.id === 'host' || !!p.local); } // máy chủ phòng được điều khiển ai
    act(pid, a) { const s = this.state; if (!s || !a) return; const r = cfg.apply(s, pid, a, { host: this }); if (!r || !r.ok) { this.tell(pid, (r && r.reason) || 'Không làm được.'); return; } this.schedule(); this.broadcast(); }
    actAs(id, a) { if (this.controls(id)) this.act(id, a); }
    tell(pid, m) { const p = this.players.find(x => x.id === pid); if (p && p.conn) try { p.conn.send({ t: 'error', msg: m }); } catch (e) {} else this.h.onError(m); }
    clearTimers() { for (const k of Object.keys(this.timers)) clearTimeout(this.timers[k]); this.timers = {}; }
    schedule() { // bot và người rớt mạng: máy đi thay
      this.clearTimers(); const s = this.state; if (!s || !cfg.actors) return;
      for (const pid of cfg.actors(s) || []) {
        /* bot do ENGINE tự thêm vào s.players (vd. chơi đơn The Resistance:
           engine thêm 4 máy vào ván, lobby chỉ có 1 người) không có trong
           this.players (danh sách phòng chờ) — tìm trong s.players nữa,
           không thì bot không bao giờ được hẹn và ván kẹt ở lượt máy đầu
           tiên (đã kẹt 82s ở lượt bỏ phiếu ván đơn The Resistance) */
        const p = this.players.find(x => x.id === pid) || (s.players || []).find(x => x.id === pid), away = p && !p.isBot && !p.local && !p.connected && pid !== 'host';
        if (!p || !(p.isBot || (away && cfg.bot && cfg.autoAway !== false))) continue;
        const d = away ? AWAY_MS : (cfg.botDelay ? cfg.botDelay(s, pid) : 700 + Math.random() * 600);
        const seq = s.seq; /* bot có thể trả Promise (vd. động cơ cờ chạy trong worker) */
        this.timers[pid] = setTimeout(() => { if (this.dead || this.state !== s) return; let a = null; try { a = cfg.bot(s, pid, p); } catch (e) {} Promise.resolve(a).then(a => { if (a && !this.dead && this.state === s && s.seq === seq) this.act(pid, a); }).catch(() => {}); }, d);
      }
    }
    viewOf(p) { const v = cfg.view(this.state, p.id); if (!this.inGame(p.id)) v.spec = true; v.away = this.players.filter(q => !q.isBot && !q.local && !q.connected && q.id !== 'host').map(q => q.id); return p.id === 'host' ? JSON.parse(JSON.stringify(v)) : v; }
    broadcast() { if (!this.state) return; this.saveSnap(); for (const p of this.players) { if (p.id === 'host') this.h.onState(this.viewOf(p)); else if (p.conn) this.sendRaw(p, this.viewOf(p)); } }
    sendRaw(p, view) { p.bc = (p.bc || 0) + 1; try { p.conn.send({ t: 'state', view, hs: this.hs, bc: p.bc }); } catch (e) {} }
    sendState(p) { if (p.conn && this.state) this.sendRaw(p, this.viewOf(p)); }
    heartbeat() { if (this.dead) return; for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'ping', hs: this.hs, bc: p.bc || 0, started: !!this.state }); } catch (e) {} }
    destroy() { this.dead = true; clearInterval(this.hb); clearTimeout(this.pruneT); this.clearTimers(); clearTimeout(this.snapT); this.room && this.room.destroy(); }
    leave() { this.destroy(); try { localStorage.removeItem(SNAP); } catch (e) {} session.clear(GAME); }
  }

  // 🖥️ Phòng online do MÁY CHỦ giữ ván (cfg.srv): máy người tạo phòng chỉ là khách ngồi ghế 'host', lệnh phòng chờ gửi lên máy chủ.
  // Tắt bằng ?srv=0 (nhớ trong localStorage gumballz-srv-<game>). Chơi với máy (offline) vẫn chạy trên máy mình.
  class Remote extends RemoteBase {
    constructor(name, handlers, ses = null) {
      const h = watch(GAME, handlers, () => 'host');
      super({ raw: handlers, local: (hh, r) => new Host(name, hh, true, r), game: GAME, ns: NS, prefix: PREFIX, h, name, code: ses && ses.code, ok: ses && ses.ok, cmds: ['addBot', 'removePlayer', 'setOpt', 'start', 'restart', 'addLocal'],
        onMsg: msg => { if (msg.t === 'lobby' && msg.info) { this.opts = msg.info.opts || this.opts; this.players = msg.info.players || []; } return false; } });
      this.opts = { ...(cfg.defaults || {}) }; this.players = [];
    }
    act(id, a) { this.send({ t: 'action', a }); }
    actAs(id, a) { if (id === 'host') this.act(id, a); else this.send({ t: 'actAs', id, a }); }
    controls(id) { return id === 'host' || this.players.some(p => p.id === id && p.local); }
  }
  const srvMode = () => !!cfg.srv && srvOn(GAME, true);

  class Client {
    constructor(code, name, handlers) {
      this.h = watch(GAME, handlers, () => this.id); this.code = code.toUpperCase().trim(); this.name = name; this.id = null;
      this.hs = null; this.bc = 0; this.joined = false; this.lastRx = Date.now();
      this.makeRoom(); this.wd = setInterval(() => { if (!this.dead && this.joined && !window.__gumballzSrvRoom && Date.now() - this.lastRx > STALL_MS) this.reconnect(); }, 2000);
    }
    makeRoom() {
      const tag = this.tag = {};
      this.room = new RoomClient({
        ns: NS, prefix: PREFIX, code: this.code, joinMsg: () => ({ name: this.name, data: playerData(null, this.name) }),
        onStatus: (t, k) => { if (tag === this.tag && this.h.onNet) this.h.onNet(t, k, () => this.room.retryNow()); },
        onFail: m => { if (tag !== this.tag) return; this.h.onError(m); session.clear(GAME); },
        onWelcome: id => { if (tag !== this.tag) return; this.id = id; this.joined = true; this.lastRx = Date.now(); session.save(GAME, { role: 'client', code: this.code, name: this.name }); this.h.onJoined(id); },
        onLost: () => { if (tag !== this.tag) return; this.joined = false; this.h.onDisconnect && this.h.onDisconnect(); },
        onOwn: m => takeOwnership(GAME, this.code, this.name, m, this.room), /* máy chủ trao quyền chủ phòng cho mình */
        onMsg: msg => { if (tag === this.tag) this.onMsg(msg); },
      });
    }
    onMsg(msg) {
      this.lastRx = Date.now();
      if (msg.t === 'state') { specBanner(!!(msg.view && msg.view.spec)); if (msg.hs && msg.hs === this.hs && msg.bc <= this.bc) return; if (msg.hs) { this.hs = msg.hs; this.bc = msg.bc; } this.h.onState(msg.view); }
      else if (msg.t === 'ping') { if (msg.started && (msg.hs !== this.hs || msg.bc > this.bc)) this.room.send({ t: 'sync' }); }
      else if (msg.t === 'lobby') this.h.onLobby(msg.info, msg.code, msg.started);
      else if (msg.t === 'error') this.h.onError(msg.msg);
      else if (msg.t === 'kicked') { this.h.onError('Bạn đã bị mời ra khỏi phòng.'); this.leave(); this.h.onKicked && this.h.onKicked(); }
    }
    reconnect() { if (this.dead) return; this.joined = false; this.lastRx = Date.now(); const old = this.room; this.makeRoom(); try { old.destroy(); } catch (e) {} this.h.onNet && this.h.onNet('Đang nối lại phòng…', 'wait'); }
    act(a) { this.room.send({ t: 'action', a }); }
    actAs(id, a) { if (id === this.id) this.act(a); }
    controls(id) { return id === this.id; }
    destroy() { this.dead = true; clearInterval(this.wd); specBanner(false); this.room.destroy(); }
    leave() { this.destroy(); session.clear(GAME); }
  }
  return { Host, Client, Remote, srvMode, loadSnapshot, session, MIN, MAX, GAME };
}
