// Lõi chủ phòng camel – dùng chung trình duyệt (net.js) và máy chủ (server/src/srvhost.js, "máy chủ giữ ván"). Không đụng tới window / localStorage: mọi thứ qua env.
import { createGame, applyAction, viewFor, DEFAULT_OPTS, MAX_PLAYERS, MIN_PLAYERS, CAMEL } from './engine.js?v=1';
import { titleById, myTitleId } from '../../shared/titles.js?v=7'; /* 🎖️ danh hiệu trưng ra (patch -97) */
import { botAction } from './bot.js?v=1';
export const NS = 'gumballz-camel', PREFIX = 'gumballz-camel-', GAME = 'camel', SNAP = 'gumballz-hostsnap-' + GAME;
// Câu chọc kiểu đua lạc đà (≤ 24 ký tự)
export const CAMEL_PHRASES = ['Chạy đi con ơi!', 'Cõng ké hoài vậy', 'Về bét đi 😤', 'Ăn chắc rồi!', 'Ảo ảnh nè hehe', 'Lạc đà gì kỳ vậy'];
const BOT_POOLS = { attack: ['Ảo ảnh nè hehe', 'Chạy đi con ơi!'], hurt: ['Lạc đà gì kỳ vậy', 'Cõng ké hoài vậy'], win: ['Ăn chắc rồi!'], reply: ['Về bét đi 😤', 'Cõng ké hoài vậy'] };
const BOT_NAMES = ['Kẹo', 'Xôi', 'Gấu Bông', 'Đậu', 'Nấm', 'Sữa', 'Mochi', 'Pudding'];
export const MAX = MAX_PLAYERS, MIN = MIN_PLAYERS;
export const TURN_TIME = 45;      // giây: người thật treo máy quá lâu thì máy đi thay
const AWAY_MS = 6000;             // người rớt mạng: máy đi thay sau 6 giây
export const HB_MS = 2500, STALL_MS = 8000;
// env: { RoomHost, token, session, watch, store: { set, del }, speed: () => hệ số tốc độ, isReact, hostLimiter, pickReact, CFG, remote }
export function makeHost(env) {
  const { RoomHost, token, session, watch, store, isReact, hostLimiter, pickReact, CFG, remote = false } = env;
  const speedK = () => (env.speed ? env.speed() : 1);
class Host {
  constructor(name, handlers, offline = false, restore = null) {
    this.h = watch(GAME, handlers, () => 'host'); this.offline = offline;
    this.players = [{ id: 'host', title: titleById(myTitleId()), name, isBot: false, token: token(), conn: null, connected: !remote }];
    this.state = null; this.conns = new Map(); this.timers = {}; this.clock = null; this.graceUntil = 0;
    this.hs = Math.random().toString(36).slice(2, 8);
    this.opts = { ...CFG };
    this.lim = hostLimiter(); this.botReactAt = 0;
    if (restore) {
      this.players = restore.players.map(p => ({ ...p, conn: null, connected: p.isBot || (!remote && p.id === 'host') }));
      this.state = restore.state; this.code = restore.code; this.opts = restore.opts || this.opts;
    }
    if (offline) { this.code = 'OFFLINE'; setTimeout(() => { this.pushLobby(); if (this.state) { this.graceUntil = Date.now() + 1500; this.schedule(); this.broadcast(); } }, 0); return; }
    this.room = new RoomHost({ ns: NS, prefix: PREFIX, code: this.code, keepCode: !!restore, host: this, onConn: c => this.attach(c), onReady: code => { this.code = code; session.save(GAME, { role: 'host', code }); this.pushLobby(); }, onError: m => this.h.onError(m) });
    this.code = this.room.code;
    if (!remote) this.hb = setInterval(() => this.heartbeat(), HB_MS); /* máy chủ giữ ván: không cần nhịp tim, để phòng được ngủ */
    setTimeout(() => { this.pushLobby(); if (this.state) { this.graceUntil = Date.now() + 4000; this.schedule(); this.broadcast(); } }, 0);
  }
  saveSnap() {
    clearTimeout(this.snapT);
    this.snapT = setTimeout(() => { if (!this.dead) try { store.set(SNAP, JSON.stringify({ ts: Date.now(), code: this.code, offline: this.offline, ...this.snapData() })); } catch (e) {} }, 300);
  }
  snapData() { return { opts: this.opts, players: this.players.map(({ conn, ...p }) => p), state: this.state }; }
  ownerOn(on, name) { const hp = this.players.find(p => p.id === 'host'); if (hp) { hp.connected = !!on; if (name) hp.name = String(name).slice(0, 16); } if (this.state) { this.schedule(); this.broadcast(); } } /* máy chủ giữ ván: người tạo phòng vào / ra */
  attach(conn) {
    conn.on('data', msg => this.onMsg(conn, msg));
    conn.on('close', () => this.onLeave(conn));
    conn.on('error', () => this.onLeave(conn));
  }
  onMsg(conn, msg) {
    if (!msg) return;
    if (msg.t === 'join') {
      let p = this.players.find(x => x.token === msg.token && !x.isBot && x.id !== 'host');
      if (p) { if (p.conn && p.conn !== conn) try { p.conn.close(); } catch (e) {} p.conn = conn; p.connected = true; p.title = titleById(msg.title); if (!this.state) p.name = String(msg.name || p.name).slice(0, 16); }
      else {
        if (this.players.length >= MAX + 8) { conn.send({ t: 'error', msg: 'Phòng đã đầy.' }); return; } /* cho phép thêm tối đa 8 người xem */
        p = { id: 'p' + Math.random().toString(36).slice(2, 8), name: String(msg.name || 'Khách').slice(0, 16), isBot: false, token: msg.token, conn, connected: true, title: titleById(msg.title) };
        this.players.push(p);
      }
      this.conns.set(conn, p);
      conn.send({ t: 'welcome', id: p.id, code: this.code });
      this.pushLobby();
      if (this.state) { this.schedule(); this.broadcast(); }
    } else if (msg.t === 'title') { const p = this.conns.get(conn); if (p && p.conn === conn) { p.title = titleById(msg.title); this.pushLobby(); } /* 🎖️ đổi danh hiệu giữa phòng (P2P): chỉ nhận id có trong bảng */
    } else if (msg.t === 'action') {
      const p = this.conns.get(conn); if (p && p.conn === conn) this.inGame(p.id) && this.act(p.id, msg.a);
    } else if (msg.t === 'react') {
      const p = this.conns.get(conn); if (p && p.conn === conn) this.react(p.id, msg.e);
    } else if (msg.t === 'sync') {
      const p = this.conns.get(conn); if (!p || p.conn !== conn) return;
      if (this.state) this.sendState(p); else conn.send({ t: 'lobby', info: this.lobbyInfo(), code: this.code, started: false });
    }
  }
  onLeave(conn) {
    const p = this.conns.get(conn); if (!p) return;
    this.conns.delete(conn);
    if (p.conn !== conn) return;
    p.conn = null; p.connected = false;
    if (!this.inGame(p.id)) this.players = this.players.filter(x => x !== p);
    this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); }
  }
  inGame(id) { const s = this.state; return !s || !s.players || s.players.some(q => q.id === id); } // vào giữa ván: chỉ xem, ván sau mới chơi
  lobbyInfo() { return { players: this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, connected: p.connected, title: p.title || null })), opts: this.opts }; }
  pushLobby() {
    const info = this.lobbyInfo();
    this.h.onLobby(info, this.code, !!this.state); this.saveSnap();
    for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'lobby', info, code: this.code, started: !!this.state }); } catch (e) {}
  }
  setOpt(k, v) { if (this.state || !(k in DEFAULT_OPTS)) return; this.opts[k] = !!v; this.pushLobby(); }
  addBot() {
    if (this.state || this.players.length >= MAX) return;
    const used = this.players.map(p => p.name.replace(' 🤖', '').trim().toLowerCase());
    const nm = BOT_NAMES.find(n => !used.includes(n.toLowerCase())) || 'Bot' + this.players.length;
    this.players.push({ id: 'bot' + Math.random().toString(36).slice(2, 7), name: nm + ' 🤖', isBot: true, token: null, conn: null, connected: true });
    this.pushLobby();
  }
  removePlayer(id) {
    if (this.state) return;
    const p = this.players.find(x => x.id === id); if (!p || p.id === 'host') return;
    if (p.conn) try { p.conn.send({ t: 'kicked' }); p.conn.close(); } catch (e) {}
    this.players = this.players.filter(x => x !== p); this.pushLobby();
  }
  start() {
    { const n = this.players.length; this.players = this.players.filter(p => p.id === 'host' || p.isBot || p.local || p.connected); if (this.players.length !== n) this.pushLobby(); } /* người đã thoát / rớt mạng không được chia bài: ghế ma làm cả bàn phải chờ từng lượt */
    const seated = this.players.slice(0, MAX);
    if (seated.length < MIN) { this.h.onError('Cần ít nhất 2 người chơi (thêm bot nhé).'); return; }
    this.clearTimers();
    this.state = createGame(seated.map(p => ({ id: p.id, name: p.name, isBot: p.isBot })), this.opts);
    this.graceUntil = Date.now() + 2200 * speedK();
    this.pushLobby(); this.schedule(); this.broadcast();
  }
  restart() { this.clearTimers(); this.state = null; this.clock = null; this.pushLobby(); for (const p of this.players) if (p.conn) this.sendRaw(p, null); this.h.onState(null); }
  act(pid, a) {
    const s = this.state; if (!s) return;
    const before = s.fxN;
    const r = applyAction(s, pid, a);
    if (!r.ok) { this.tell(pid, r.reason); return; }
    this.afterChange(before);
  }
  tell(pid, m) { const p = this.players.find(x => x.id === pid); if (p && p.conn) try { p.conn.send({ t: 'error', msg: m }); } catch (e) {} else if (pid === 'host') this.h.onError(m); }
  afterChange(before) {
    const s = this.state;
    const evs = s.fx.filter(e => e.id > before);
    // chừa thời gian cho hoạt ảnh: lắc xúc xắc + lạc đà nhảy từng ô; hết chặng thì cho đọc bảng tổng kết
    let wait = 0;
    for (const e of evs) {
      if (e.k === 'roll') wait = Math.max(wait, 1100 + Math.abs(e.mv.to - e.mv.from) * 260 + (e.mv.tile ? 400 : 0));
      if (e.k === 'leg') wait += 4200;
    }
    if (wait) this.graceUntil = Math.max(this.graceUntil, Date.now() + wait * speedK());
    this.schedule(); this.broadcast();
    this.botReacts(evs);
  }
  // ---- thả emoji / chọc nhau ----
  react(from, e) {
    if (this.dead || !isReact(e, CAMEL_PHRASES) || !this.players.some(p => p.id === from) || !this.lim(from)) return false;
    const msg = { t: 'react', e, from };
    for (const p of this.players) if (p.conn) try { p.conn.send(msg); } catch (x) {}
    this.h.onReact && this.h.onReact(msg);
    const sender = this.players.find(p => p.id === from);
    if (sender && !sender.isBot && Math.random() < 0.3) this.botSay(null, 'reply', 900 + Math.random() * 900);
    return true;
  }
  botSay(pid, mood, delay = 1000) {
    const now = Date.now(); if (now < this.botReactAt) return;
    const bots = this.players.filter(p => p.isBot && (!pid || p.id === pid));
    if (!bots.length) return;
    this.botReactAt = now + 7000;
    const b = bots[Math.floor(Math.random() * bots.length)];
    setTimeout(() => { if (!this.dead && this.state) this.react(b.id, pickReact(mood, BOT_POOLS)); }, delay * speedK());
  }
  botReacts(evs) {
    const isBot = id => (this.players.find(p => p.id === id) || {}).isBot;
    const s = this.state;
    for (const e of evs) {
      if (e.k === 'roll' && e.mv.tile && e.mv.tile.side < 0 && isBot(e.mv.tile.owner) && Math.random() < 0.4) this.botSay(e.mv.tile.owner, 'attack', 1600);
      if (e.k === 'leg') {
        const rows = [...e.sum.rows].sort((a, b) => b.net - a.net);
        const top = rows[0], bot = rows[rows.length - 1];
        if (top && isBot(top.pid) && top.net >= 5 && Math.random() < 0.5) this.botSay(top.pid, 'win', 2400);
        else if (bot && isBot(bot.pid) && bot.net <= -2 && Math.random() < 0.5) this.botSay(bot.pid, 'hurt', 2400);
      }
      if (e.k === 'end' && s.result && isBot(s.result.winners[0]) && Math.random() < 0.6) this.botSay(s.result.winners[0], 'win', 3000);
    }
  }
  clearTimers() { for (const k of Object.keys(this.timers)) clearTimeout(this.timers[k]); this.timers = {}; }
  isAuto(pid) { const p = this.players.find(x => x.id === pid); return !p || p.isBot; }
  isAway(pid) { const p = this.players.find(x => x.id === pid); return p && !p.isBot && !p.connected && (remote || pid !== 'host'); } /* trên máy chủ thì ghế chủ phòng cũng có thể vắng */
  schedule() {
    this.clearTimers(); this.clock = null;
    const s = this.state; if (!s || s.phase !== 'playing') return;
    const now = Date.now(), grace = Math.max(0, this.graceUntil - now);
    const p = s.players[s.turn]; if (!p) return;
    const pid = p.id, auto = this.isAuto(pid), away = this.isAway(pid);
    if (auto || away) {
      const d = auto ? (900 + Math.random() * 900) * speedK() : AWAY_MS;
      const seq = s.seq;
      this.timers.bot = setTimeout(() => { const st = this.state; if (!st || st.seq !== seq) return; const a = st.phase === 'playing' && botAction(st, pid); if (a) this.act(pid, a); }, grace + d);
      if (away) this.clock = { pid, end: now + grace + d, total: d };
      return;
    }
    if (this.offline) return; // chơi với bot: không giục người thật
    const total = TURN_TIME * 1000, seq = s.seq;
    this.clock = { pid, end: now + grace + total, total };
    this.timers.afk = setTimeout(() => {
      const st = this.state; if (!st || st.seq !== seq || st.phase !== 'playing') return;
      this.tell(pid, '⏰ Hết giờ – máy đi giùm bạn 1 nước.');
      const a = botAction(st, pid); if (a) this.act(pid, a);
    }, grace + total);
  }
  broadcast() {
    if (!this.state) return;
    this.saveSnap();
    const clock = this.clockNow();
    for (const p of this.players) {
      if (p.id === 'host') this.h.onState(this.viewOf(p, clock));
      else if (p.conn) this.sendRaw(p, this.viewOf(p, clock));
    }
  }
  clockNow() { return this.clock ? { pid: this.clock.pid, ms: Math.max(0, this.clock.end - Date.now()), total: this.clock.total } : null; }
  viewOf(p, clock) {
    if (clock === undefined) clock = this.clockNow();
    const view = viewFor(this.state, p.id); if (!this.inGame(p.id)) view.spec = true; view.clock = clock;
    view.away = this.players.filter(q => !q.isBot && !q.connected && (remote || q.id !== 'host')).map(q => q.id);
    view.offline = this.offline;
    return view;
  }
  sendRaw(p, view) { p.bc = (p.bc || 0) + 1; try { p.conn.send({ t: 'state', view, hs: this.hs, bc: p.bc }); } catch (e) {} }
  sendState(p) { if (p.conn && this.state) this.sendRaw(p, this.viewOf(p)); }
  heartbeat() {
    if (this.dead) return;
    for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'ping', hs: this.hs, bc: p.bc || 0, started: !!this.state }); } catch (e) {}
    this.fbPresence();
  }
  fbPresence() {
    const fb = this.room && this.room.fb; if (this.presOn || !fb || !fb.F || !fb.room) return;
    this.presOn = true; const F = fb.F;
    const fix = () => { if (!this.dead) { F.update(fb.room, { alive: Date.now() }).catch(() => {}); F.onDisconnect(fb.room).remove(); } };
    this.presOffs = [
      F.onValue(F.ref(F.db, '.info/connected'), s => { if (s.val()) fix(); }),
      F.onValue(F.child(fb.room, 'alive'), s => { if (!s.exists()) fix(); }),
    ];
  }
  destroy() { this.dead = true; clearInterval(this.hb); (this.presOffs || []).forEach(f => { try { f(); } catch (e) {} }); this.clearTimers(); clearTimeout(this.snapT); this.room && this.room.destroy(); }
  leave() { this.destroy(); store.del(SNAP); session.clear(GAME); }
}
  return Host;
}
