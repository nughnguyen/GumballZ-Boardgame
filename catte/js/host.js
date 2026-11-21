// Lõi chủ phòng catte – dùng chung trình duyệt (net.js) và máy chủ (server/src/srvhost.js, "máy chủ giữ ván"). Không đụng tới window / localStorage: mọi thứ qua env.
import { createGame, applyAction, viewFor, waitingOn, nextHand, getPlayer, DEFAULT_OPTS, OPT_CHOICES, MAX_PLAYERS, CUT } from './engine.js?v=2';
import { titleById, myTitleId } from '../../shared/titles.js?v=6'; /* 🎖️ danh hiệu trưng ra (patch -97) */
import { botAction } from './bot.js?v=2';
export const NS = 'gumballz-catte', PREFIX = 'gumballz-catte-', GAME = 'catte', SNAP = 'gumballz-hostsnap-' + GAME;
// Câu chọc cho bảng thả emoji (≤ 24 ký tự)
export const CT_PHRASES = ['Đè nè cưng!', 'Úp cho lành 🙈', 'Chết chưa con!', 'Tới rồi nha 😎', 'Run chưa? 😏', 'Giữ Át nãy giờ', 'Cứu tui'];
const BOT_POOLS = { attack: ['Đè nè cưng!', 'Run chưa? 😏'], hurt: ['Cứu tui', 'Úp cho lành 🙈'], win: ['Tới rồi nha 😎', 'Giữ Át nãy giờ'], reply: ['Run chưa? 😏', 'Chết chưa con!'], dead: ['Chết chưa con!'] };
const BOT_NAMES = ['Kẹo', 'Xôi', 'Gấu Bông', 'Đậu', 'Nấm', 'Sữa'];
export const MAX = MAX_PLAYERS;
const AWAY_MS = 6000;     // người rớt mạng: bot đánh thay sau 6 giây
export const NEXT_MS = 9000; // hết ván: tự chia ván mới sau 9 giây
export const HB_MS = 2500, STALL_MS = 8000;
// thời gian hoạt ảnh của các sự kiện (ms) – chủ phòng chờ xong mới cho lượt kế
export function eventWait(evs, nAlive = 3) {
  let w = 0;
  for (const e of evs) {
    if (e.k === 'trick') w = Math.max(w, e.no >= CUT ? 1700 : 1300);
    if (e.k === 'dead') w = Math.max(w, 2600);
    if (e.k === 'showdown') w = Math.max(w, 2600);
    if (e.k === 'reveal') w = Math.max(w, 3200);
    if (e.k === 'final') w = Math.max(w, 2200 + nAlive * 900);
    if (e.k === 'win') w = Math.max(w, e.how === 'white' ? 3400 : 2400);
    if (e.k === 'deal') w = Math.max(w, 1500);
  }
  if (evs.some(e => e.k === 'reveal') && evs.some(e => e.k === 'final')) w = 3200 + 2200 + nAlive * 900;
  return w;
}
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
    this.opts = { ...CFG }; this.bank = {};
    this.lim = hostLimiter(); this.botReactAt = 0;
    if (restore) {
      this.players = restore.players.map(p => ({ ...p, conn: null, connected: p.isBot || (!remote && p.id === 'host') }));
      this.state = restore.state; this.code = restore.code; this.opts = restore.opts || this.opts; this.bank = restore.bank || {};
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
  snapData() { return { opts: this.opts, bank: this.bank, players: this.players.map(({ conn, ...p }) => p), state: this.state }; }
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
      if (p) { if (p.conn && p.conn !== conn) try { p.conn.close(); } catch (e) {} p.conn = conn; p.connected = true; p.name = String(msg.name || p.name).slice(0, 16); p.title = titleById(msg.title); }
      else {
        if (this.players.length >= MAX + 8) { conn.send({ t: 'error', msg: 'Bàn đã đầy.' }); return; } /* cho phép thêm tối đa 8 người xem */
        // đang chơi vẫn cho vào: ngồi ghế chờ, ván sau được chia bài
        p = { id: 'p' + Math.random().toString(36).slice(2, 8), name: String(msg.name || 'Khách').slice(0, 16), isBot: false, token: msg.token, conn, connected: true, title: titleById(msg.title) };
        this.players.push(p);
      }
      this.conns.set(conn, p);
      conn.send({ t: 'welcome', id: p.id, code: this.code });
      this.pushLobby();
      if (this.state) { this.schedule(); this.broadcast(); }
    } else if (msg.t === 'title') { const p = this.conns.get(conn); if (p && p.conn === conn) { p.title = titleById(msg.title); this.pushLobby(); } /* 🎖️ đổi danh hiệu giữa phòng (P2P): chỉ nhận id có trong bảng */
    } else if (msg.t === 'action') {
      const p = this.conns.get(conn); if (p && p.conn === conn) this.act(p.id, msg.a);
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
    // chưa vào ván (sảnh hoặc ghế chờ) thì đứng dậy luôn
    if (!this.state || !getPlayer(this.state, p.id)) this.players = this.players.filter(x => x !== p);
    this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); }
  }
  lobbyInfo() { return { players: this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, connected: p.connected, chips: this.state ? (getPlayer(this.state, p.id) || {}).chips : this.bank[p.id], title: p.title || null })), opts: this.opts }; }
  pushLobby() {
    const info = this.lobbyInfo();
    this.h.onLobby(info, this.code, !!this.state); this.saveSnap();
    for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'lobby', info, code: this.code, started: !!this.state }); } catch (e) {}
  }
  setOpt(k, v) {
    if (this.state || !(k in this.opts)) return;
    if (typeof DEFAULT_OPTS[k] === 'boolean') this.opts[k] = !!v;
    else if (k === 'showdown') this.opts[k] = v === 'ngua' ? 'ngua' : 'chung';
    else if (OPT_CHOICES[k] && OPT_CHOICES[k].includes(+v)) this.opts[k] = +v;
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
    this.players = this.players.filter(x => x !== p); delete this.bank[id]; this.pushLobby();
  }
  roster() { return this.players.slice(0, MAX).map(p => ({ id: p.id, name: p.name, isBot: p.isBot, chips: this.bank[p.id] })); }
  start() {
    const r = this.roster();
    if (r.length < 2) { this.h.onError('Cần ít nhất 2 người (thêm bot nhé).'); return; }
    this.clearTimers();
    this.state = createGame(r, this.opts);
    this.graceUntil = Date.now() + 1800 * speedK();
    this.pushLobby(); this.schedule(); this.broadcast();
  }
  // về sảnh: giữ chip từng người cho trận sau
  restart() {
    const s = this.state;
    // ván đang dở thì trả lại tiền cược (lấy số chip lúc đầu ván)
    if (s) for (const p of s.players) this.bank[p.id] = s.phase !== 'handEnd' && s.handStart && s.handStart[p.id] != null ? s.handStart[p.id] : p.chips;
    this.clearTimers(); this.state = null; this.clock = null; this.pushLobby(); for (const p of this.players) if (p.conn) this.sendRaw(p, null); this.h.onState(null);
  }
  nextHand() {
    const s = this.state; if (!s || s.phase !== 'handEnd') return;
    const before = s.evN;
    // người rớt mạng mà chưa vào lại thì vẫn giữ ghế (bot đánh thay); người ghế chờ được vào bàn
    if (!nextHand(s, this.roster())) { this.h.onError('Thiếu người để chia ván mới.'); return; }
    this.afterChange(before);
    this.pushLobby();
  }
  act(pid, a) {
    const s = this.state; if (!s) return;
    if (a && a.type === 'next') { if (pid === 'host') this.nextHand(); return; }
    const before = s.evN;
    const r = applyAction(s, pid, a);
    if (!r.ok) { const p = this.players.find(x => x.id === pid); if (p && p.conn) p.conn.send({ t: 'error', msg: r.reason }); else if (pid === 'host') this.h.onError(r.reason); return; }
    this.afterChange(before);
  }
  afterChange(before) {
    const s = this.state;
    const evs = s.ev.filter(e => e.n > before);
    const nAlive = s.players.filter(p => p.inHand && !p.out).length;
    const wait = eventWait(evs, nAlive);
    if (wait) this.graceUntil = Math.max(this.graceUntil, Date.now() + wait * speedK());
    this.schedule(); this.broadcast();
    this.botReacts(evs);
  }
  // ---- thả emoji / chọc nhau ----
  react(from, e) {
    if (this.dead || !isReact(e, CT_PHRASES) || !this.players.some(p => p.id === from) || !this.lim(from)) return false;
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
    setTimeout(() => { if (!this.dead && this.state) this.react(b.id, pickReact(mood === 'dead' ? 'attack' : mood, BOT_POOLS)); }, delay * speedK());
  }
  botReacts(evs) {
    const isBot = id => (this.players.find(p => p.id === id) || {}).isBot;
    for (const e of evs) {
      if (e.k === 'win') { if (isBot(e.by) && Math.random() < 0.6) this.botSay(e.by, 'win', 2600); return; }
      if (e.k === 'dead') { const b = e.ids.find(isBot); if (b && Math.random() < 0.5) this.botSay(b, 'hurt', 2000); else if (Math.random() < 0.4) this.botSay(null, 'attack', 2200); }
      else if (e.k === 'play' && e.beat && isBot(e.by) && e.card && e.card.r === 14 && Math.random() < 0.3) this.botSay(e.by, 'attack', 600);
    }
  }
  clearTimers() { for (const k of Object.keys(this.timers)) clearTimeout(this.timers[k]); this.timers = {}; }
  isAuto(pid) { const p = this.players.find(x => x.id === pid); return !p || p.isBot; }
  isAway(pid) { const p = this.players.find(x => x.id === pid); return p && !p.isBot && !p.connected && (remote || pid !== 'host'); } /* trên máy chủ thì ghế chủ phòng cũng có thể vắng */
  schedule() {
    this.clearTimers(); this.clock = null;
    const s = this.state; if (!s) return;
    const now = Date.now(), grace = Math.max(0, this.graceUntil - now);
    if (s.phase === 'handEnd') {
      const d = NEXT_MS * Math.max(1, speedK());
      this.clock = { kind: 'next', end: now + grace + d, total: d };
      this.timers.next = setTimeout(() => this.nextHand(), grace + d);
      return;
    }
    const pids = waitingOn(s); if (!pids.length) return;
    let humanClock = false;
    const seq = s.seq;
    for (const pid of pids) {
      const auto = this.isAuto(pid), away = this.isAway(pid);
      if (auto || away) {
        const d = auto ? (650 + Math.random() * 750) * speedK() * (s.phase === 'chung' ? 1.4 : 1) : AWAY_MS;
        this.timers['bot' + pid] = setTimeout(() => { const st = this.state; if (!st || !waitingOn(st).includes(pid)) return; const a = botAction(st, pid); if (a) this.act(pid, a); }, grace + d);
        if (away && !humanClock) this.clock = { kind: 'turn', pids, end: now + grace + d, total: d };
        continue;
      }
      // người thật: đồng hồ AFK – hết giờ máy đánh giùm
      const total = (s.opts.turnTime || 25) * 1000;
      if (!humanClock) { this.clock = { kind: s.phase === 'chung' ? 'chung' : 'turn', pids, end: now + grace + total, total }; humanClock = true; }
      this.timers['afk' + pid] = setTimeout(() => {
        const st = this.state; if (!st || !waitingOn(st).includes(pid)) return;
        const a = botAction(st, pid);
        if (a) { this.act(pid, a); const p = this.players.find(x => x.id === pid); const m = '⏰ Hết giờ – máy đánh giùm bạn!'; if (p && p.conn) p.conn.send({ t: 'error', msg: m }); else if (pid === 'host') this.h.onError(m); }
      }, grace + total);
    }
    void seq;
  }
  broadcast() {
    if (!this.state) return;
    this.saveSnap();
    for (const p of this.players) {
      if (p.id === 'host') this.h.onState(this.viewOf(p));
      else if (p.conn) this.sendRaw(p, this.viewOf(p));
    }
  }
  viewOf(p) {
    const now = Date.now();
    const clock = this.clock ? { kind: this.clock.kind, pids: this.clock.pids, ms: Math.max(0, this.clock.end - now), total: this.clock.total } : null;
    const view = viewFor(this.state, p.id); if (!getPlayer(this.state, p.id)) view.spec = true; view.clock = clock;
    view.away = this.players.filter(q => !q.isBot && !q.connected && (remote || q.id !== 'host')).map(q => q.id);
    view.waitingSeats = this.players.filter(q => !getPlayer(this.state, q.id)).map(q => ({ id: q.id, name: q.name }));
    view.graceMs = Math.max(0, this.graceUntil - now);
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
