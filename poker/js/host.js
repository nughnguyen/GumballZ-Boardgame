// Lõi chủ phòng poker – dùng chung trình duyệt (net.js) và máy chủ (server/src/srvhost.js, "máy chủ giữ ván"). Không đụng tới window / localStorage: mọi thứ qua env.
import { createGame, applyAction, viewFor, nextHand, seatPlayers, DEFAULT_OPTS, OPT_CHOICES, MAX_PLAYERS } from './engine.js?v=2';
import { botAction } from './bot.js?v=1';
export const NS = 'gumballz-poker', PREFIX = 'gumballz-poker-', GAME = 'poker', SNAP = 'gumballz-hostsnap-' + GAME;
// Câu chọc kiểu Poker (≤ 24 ký tự)
export const POKER_PHRASES = ['Tất tay đi!', 'Bluff đó 🤥', 'Theo không?', 'Bài rác nè', 'Ăn may thôi', 'Xin mẹ chip 🥺'];
const BOT_POOLS = { attack: ['Tất tay đi!', 'Theo không?'], hurt: ['Ăn may thôi', 'Xin mẹ chip 🥺', 'Bài rác nè'], win: ['Bluff đó 🤥', 'Theo không?'], reply: ['Bluff đó 🤥', 'Bài rác nè'] };
const BOT_NAMES = ['Kẹo', 'Xôi', 'Gấu Bông', 'Đậu', 'Nấm', 'Sữa', 'Mochi', 'Pudding', 'Táo'];
export const MAX = MAX_PLAYERS;
const AWAY_MS = 6000;      // người rớt mạng: máy đánh thay sau 6 giây
export const HB_MS = 2500, STALL_MS = 8000;
// env: { RoomHost, token, session, watch, store: { set, del }, speed: () => hệ số tốc độ, isReact, hostLimiter, pickReact, CFG, remote }
export function makeHost(env) {
  const { RoomHost, token, session, watch, store, isReact, hostLimiter, pickReact, CFG, remote = false } = env;
  const speedK = () => (env.speed ? env.speed() : 1);
class Host {
  constructor(name, handlers, offline = false, restore = null) {
    this.h = watch(GAME, handlers, () => 'host'); this.offline = offline;
    this.players = [{ id: 'host', name, isBot: false, token: token(), conn: null, connected: !remote }];
    this.state = null; this.conns = new Map(); this.timers = {}; this.clock = null; this.graceUntil = 0;
    this.hs = Math.random().toString(36).slice(2, 8);
    { const { modeBlindUp, ...o } = CFG; this.opts = o; }
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
      if (p) { if (p.conn && p.conn !== conn) try { p.conn.close(); } catch (e) {} p.conn = conn; p.connected = true; p.name = String(msg.name || p.name).slice(0, 16); }
      else {
        if (this.players.length >= MAX + 8) { conn.send({ t: 'error', msg: 'Bàn đã đầy.' }); return; } /* cho phép thêm tối đa 8 người xem */
        p = { id: 'p' + Math.random().toString(36).slice(2, 8), name: String(msg.name || 'Khách').slice(0, 16), isBot: false, token: msg.token, conn, connected: true };
        this.players.push(p);
      }
      this.conns.set(conn, p);
      conn.send({ t: 'welcome', id: p.id, code: this.code });
      this.pushLobby();
      if (this.state) { this.schedule(); this.broadcast(); }
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
  lobbyInfo() { return { players: this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, connected: p.connected })), opts: this.opts }; }
  pushLobby() {
    const info = this.lobbyInfo();
    this.h.onLobby(info, this.code, !!this.state); this.saveSnap();
    for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'lobby', info, code: this.code, started: !!this.state }); } catch (e) {}
  }
  setOpt(k, v) {
    if (this.state || !(k in this.opts)) return;
    const val = typeof DEFAULT_OPTS[k] === 'number' ? +v : v;
    if (!OPT_CHOICES[k].includes(val)) return;
    this.opts[k] = val;
    if (k === 'mode') this.opts.blindUp = CFG.modeBlindUp[val]; // giải đấu: mặc định mù tăng mỗi 10 ván (đổi trong luat-mac-dinh.js)
    this.pushLobby();
  }
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
    const seated = this.players.slice(0, MAX);
    if (seated.length < 2) { this.h.onError('Cần ít nhất 2 người chơi (thêm bot nhé).'); return; }
    this.clearTimers();
    this.state = createGame(seated.map(p => ({ id: p.id, name: p.name, isBot: p.isBot })), this.opts);
    this.graceUntil = Date.now() + 1800 * speedK();
    this.pushLobby(); this.schedule(); this.broadcast();
  }
  restart() { this.clearTimers(); this.state = null; this.clock = null; this.pushLobby(); for (const p of this.players) if (p.conn) this.sendRaw(p, null); this.h.onState(null); }
  act(pid, a) {
    const s = this.state; if (!s) return;
    const before = s.evN;
    const r = applyAction(s, pid, a);
    if (!r.ok) { this.tell(pid, r.reason); return; }
    this.afterChange(before);
  }
  tell(pid, m) { const p = this.players.find(x => x.id === pid); if (p && p.conn) try { p.conn.send({ t: 'error', msg: m }); } catch (e) {} else if (pid === 'host') this.h.onError(m); }
  // chủ phòng bấm "Ván tiếp" (không chờ hết giờ xem kết quả)
  nextNow() { const s = this.state; if (!s || s.phase !== 'handover') return; this.clearTimers(); const b = s.evN; seatPlayers(s, this.players.filter(p => p.connected && !this.inGame(p.id)).slice(0, Math.max(0, MAX - s.players.length))); if (nextHand(s)) this.afterChange(b, true); else { this.schedule(); this.broadcast(); } }
  afterChange(before, fresh = false) {
    const s = this.state;
    const evs = s.ev.filter(e => e.n > before);
    // chừa thời gian cho hoạt ảnh (chia bài, gom chip, lật bài)
    let wait = 0;
    for (const e of evs) {
      if (e.k === 'deal') wait = Math.max(wait, e.street === 'preflop' ? 1300 : 700);
      if (e.k === 'collect') wait = Math.max(wait, 600);
      if (e.k === 'runout') wait = Math.max(wait, 900 + (5 - e.from) * 0);
    }
    if (wait) this.graceUntil = Math.max(this.graceUntil, Date.now() + wait * speedK());
    if (fresh) this.graceUntil = Math.max(this.graceUntil, Date.now() + 1300 * speedK());
    this.schedule(); this.broadcast();
    this.botReacts(evs);
  }
  // ---- thả emoji / chọc nhau ----
  react(from, e) {
    if (this.dead || !isReact(e, POKER_PHRASES) || !this.players.some(p => p.id === from) || !this.lim(from)) return false;
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
      if (e.k === 'act' && e.t === 'allin' && isBot(e.pid) && Math.random() < 0.35) this.botSay(e.pid, 'attack', 600);
      if (e.k === 'win' && s.result) {
        const big = Object.entries(s.result.net).sort((a, b) => b[1] - a[1]);
        const top = big[0], bottom = big[big.length - 1];
        if (top && isBot(top[0]) && top[1] >= s.bb * 15 && Math.random() < 0.5) this.botSay(top[0], 'win', 2600);
        else if (bottom && isBot(bottom[0]) && bottom[1] <= -s.bb * 20 && Math.random() < 0.45) this.botSay(bottom[0], 'hurt', 2600);
      }
    }
  }
  clearTimers() { for (const k of Object.keys(this.timers)) clearTimeout(this.timers[k]); this.timers = {}; }
  isAuto(pid) { const p = this.players.find(x => x.id === pid); return !p || p.isBot; }
  isAway(pid) { const p = this.players.find(x => x.id === pid); return p && !p.isBot && !p.connected && (remote || pid !== 'host'); } /* trên máy chủ thì ghế chủ phòng cũng có thể vắng */
  // thời gian xem kết quả trước ván kế (giây × tốc độ)
  handoverMs() {
    const s = this.state, r = s.result || {};
    let ms = r.kind === 'showdown' ? 5200 : 2600;
    const run = s.ev.find(e => e.k === 'runout' && e.n > (this.lastRunN || 0));
    if (run) { this.lastRunN = run.n; ms += (5 - run.from) * 900; }
    // người thật vừa cháy túi: cho thêm thời gian bấm "Xin mẹ"
    if (s.opts.mode === 'cash' && s.players.some(p => p.busted && !this.isAuto(p.id))) ms += 3000;
    return ms * speedK();
  }
  schedule() {
    this.clearTimers(); this.clock = null;
    const s = this.state; if (!s) return;
    const now = Date.now(), grace = Math.max(0, this.graceUntil - now);
    if (s.phase === 'handover') {
      const seq = s.seq, d = this.handoverMs();
      this.clock = { kind: 'next', end: now + grace + d, total: d };
      this.timers.next = setTimeout(() => { if (this.state && this.state.seq === seq && this.state.phase === 'handover') this.nextNow(); }, grace + d);
      return;
    }
    if (s.phase !== 'playing') return;
    const p = s.players[s.turn]; if (!p) return;
    const pid = p.id, auto = this.isAuto(pid), away = this.isAway(pid);
    if (auto || away) {
      const d = auto ? (650 + Math.random() * 900) * speedK() : AWAY_MS;
      this.timers.bot = setTimeout(() => { const a = this.state && this.state.phase === 'playing' && botAction(this.state, pid); if (a) this.act(pid, a); }, grace + d);
      if (away) this.clock = { kind: 'turn', pid, end: now + grace + d, total: d };
      return;
    }
    if (this.offline) return; // chơi với bot: không giục người thật
    // người thật: đồng hồ AFK – hết giờ thì tự Xem (nếu được) hoặc Bỏ bài
    const total = (s.opts.turnTime || 30) * 1000;
    this.clock = { kind: 'turn', pid, end: now + grace + total, total };
    const seq = s.seq;
    this.timers.afk = setTimeout(() => {
      const st = this.state; if (!st || st.seq !== seq || st.phase !== 'playing') return;
      const L = viewFor(st, pid).legal; if (!L) return;
      this.act(pid, { type: L.canCheck ? 'check' : 'fold' });
      this.tell(pid, L.canCheck ? '⏰ Hết giờ – tự Xem giùm bạn.' : '⏰ Hết giờ – tự Bỏ bài giùm bạn.');
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
  clockNow() { return this.clock ? { kind: this.clock.kind, pid: this.clock.pid, ms: Math.max(0, this.clock.end - Date.now()), total: this.clock.total } : null; }
  viewOf(p, clock) {
    if (clock === undefined) clock = this.clockNow();
    const view = viewFor(this.state, p.id); if (!this.inGame(p.id)) view.spec = true; view.clock = clock;
    view.away = this.players.filter(q => !q.isBot && !q.connected && (remote || q.id !== 'host')).map(q => q.id);
    return p.id === 'host' ? JSON.parse(JSON.stringify(view)) : view;
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
