// Lõi chủ phòng bacao – dùng chung trình duyệt (net.js) và máy chủ (server/src/srvhost.js, "máy chủ giữ ván"). Không đụng tới window / localStorage: mọi thứ qua env.
import { createGame, applyAction, viewFor, waitingOn, nextRound, seatPlayers, getP, cleanOpts, DEFAULT_OPTS, OPT_CHOICES, MAX_PLAYERS, canBeg } from './engine.js?v=2';
import { titleById, myTitleId } from '../../shared/titles.js?v=7'; /* 🎖️ danh hiệu trưng ra (patch -97) */
import { botAction } from './bot.js?v=1';
export const NS = 'gumballz-bacao', PREFIX = 'gumballz-bacao-', GAME = 'bacao', SNAP = 'gumballz-hostsnap-' + GAME;
// Câu chọc riêng của Ba Cào (≤ 24 ký tự)
export const BC_PHRASES = ['Ba tây tới nè 👑', 'Bù rồi 😭', 'Nặn lẹ đi má!', 'Cái ơi đền đi 💸', '9 nút nè 😏', 'Tất tay luôn!', 'Toang rồi 😭', 'Hên thôi 😎'];
const BOT_POOLS = { attack: ['Nặn lẹ đi má!', 'Cái ơi đền đi 💸'], hurt: ['Bù rồi 😭', 'Toang rồi 😭'], win: ['Hên thôi 😎', '9 nút nè 😏', 'Ba tây tới nè 👑'], reply: ['Hên thôi 😎', 'Nặn lẹ đi má!', '9 nút nè 😏'] };
const BOT_NAMES = ['Kẹo', 'Xôi', 'Gấu Bông', 'Đậu', 'Nấm', 'Sữa', 'Mochi', 'Pudding'];
export const MAX = MAX_PLAYERS;
export const BET_TIME = 25;   // giây đặt cược
const AWAY_MS = 6000;         // người rớt mạng: máy làm thay sau 6 giây
const NEXT_MS = 15000;        // hết ván: tự sang ván mới (khi có khách online)
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
    this.opts = { ...DEFAULT_OPTS, ...CFG, caiId: CFG.caiMode === 'fixed' ? 'host' : null }; this.chips = {}; // chip giữ lại khi về sảnh rồi chơi tiếp
    if (!restore && CFG.caiMode === 'bot' && CFG.mode === 'cai') { this.addBot(true); this.opts.caiId = this.players[this.players.length - 1].id; }
    this.lim = hostLimiter(); this.botReactAt = 0;
    if (restore) {
      this.players = restore.players.map(p => ({ ...p, conn: null, connected: p.isBot || (!remote && p.id === 'host') }));
      this.state = restore.state; this.code = restore.code; this.opts = cleanOpts(restore.opts || this.opts); this.chips = restore.chips || {};
    }
    if (offline) { this.code = 'OFFLINE'; setTimeout(() => { this.pushLobby(); if (this.state) { this.graceUntil = Date.now() + 1200; this.schedule(); this.broadcast(); } }, 0); return; }
    this.room = new RoomHost({ ns: NS, prefix: PREFIX, code: this.code, keepCode: !!restore, host: this, onConn: c => this.attach(c), onReady: code => { this.code = code; session.save(GAME, { role: 'host', code }); this.pushLobby(); }, onError: m => this.h.onError(m) });
    this.code = this.room.code;
    if (!remote) this.hb = setInterval(() => this.heartbeat(), HB_MS); /* máy chủ giữ ván: không cần nhịp tim, để phòng được ngủ */
    setTimeout(() => { this.pushLobby(); if (this.state) { this.graceUntil = Date.now() + 4000; this.schedule(); this.broadcast(); } }, 0);
  }
  saveSnap() {
    clearTimeout(this.snapT);
    this.snapT = setTimeout(() => { if (!this.dead) try { store.set(SNAP, JSON.stringify({ ts: Date.now(), code: this.code, offline: this.offline, ...this.snapData() })); } catch (e) {} }, 300);
  }
  snapData() { return { opts: this.opts, chips: this.chips, players: this.players.map(({ conn, ...p }) => p), state: this.state }; }
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
  lobbyInfo() { return { players: this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, connected: p.connected, chips: this.chips[p.id], title: p.title || null })), opts: this.opts }; }
  pushLobby() {
    const info = this.lobbyInfo();
    this.h.onLobby(info, this.code, !!this.state); this.saveSnap();
    for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'lobby', info, code: this.code, started: !!this.state }); } catch (e) {}
  }
  setOpt(k, v) {
    if (this.state) return;
    if (k === 'caiId') { // chọn người làm cái cố định
      const p = this.players.find(x => x.id === v); if (!p) return;
      this.opts.caiId = v; this.opts.mode = 'cai'; if (!(p.isBot && this.opts.caiMode === 'bot')) this.opts.caiMode = 'fixed';
      this.pushLobby(); return;
    }
    if (!(k in OPT_CHOICES) || !OPT_CHOICES[k].includes(v)) return;
    this.opts[k] = v;
    if (k === 'startChips') this.chips = {}; // đổi vốn: ai cũng về vạch xuất phát
    if ((k === 'caiMode' && v === 'bot') || (k === 'mode' && v === 'cai' && this.opts.caiMode === 'bot')) { // bot làm cái: chưa có bot thì thêm một bot
      let b = this.players.find(p => p.isBot && p.id === this.opts.caiId) || this.players.find(p => p.isBot);
      if (!b && this.players.length < MAX) { this.addBot(true); b = this.players[this.players.length - 1]; }
      if (b) this.opts.caiId = b.id;
    }
    if (k === 'caiMode' && v === 'fixed' && !this.players.some(p => p.id === this.opts.caiId)) this.opts.caiId = 'host';
    this.pushLobby();
  }
  addBot(silent = false) {
    if (this.state || this.players.length >= MAX) return;
    const used = this.players.map(p => p.name.replace(' 🤖', '').trim().toLowerCase());
    const nm = BOT_NAMES.find(n => !used.includes(n.toLowerCase())) || 'Bot' + this.players.length;
    this.players.push({ id: 'bot' + Math.random().toString(36).slice(2, 7), name: nm + ' 🤖', isBot: true, token: null, conn: null, connected: true });
    if (!silent) this.pushLobby();
  }
  fillBots() { if (this.state) return; while (this.players.length < MAX) this.addBot(true); this.pushLobby(); }
  removePlayer(id) {
    if (this.state) return;
    const p = this.players.find(x => x.id === id); if (!p || p.id === 'host') return;
    if (p.conn) try { p.conn.send({ t: 'kicked' }); p.conn.close(); } catch (e) {}
    this.players = this.players.filter(x => x !== p);
    if (this.opts.caiId === id) { this.opts.caiId = null; if (this.opts.caiMode === 'bot') this.setOpt('caiMode', 'bot'); }
    this.pushLobby();
  }
  resetChips() { if (this.state) return; this.chips = {}; this.pushLobby(); }
  start() {
    const seated = this.players.slice(0, MAX);
    if (seated.length < 2) { this.h.onError('Cần ít nhất 2 người (thêm bot nhé).'); return; }
    if (this.opts.mode === 'cai' && this.opts.caiMode === 'bot' && !seated.some(p => p.isBot)) { this.h.onError('Chế độ bot làm cái cần ít nhất 1 bot.'); return; }
    this.clearTimers();
    this.state = createGame(seated.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, chips: this.chips[p.id] })), this.opts);
    this.graceUntil = Date.now() + 900;
    this.pushLobby(); this.schedule(); this.broadcast();
  }
  // về sảnh: giữ lại chip để chơi tiếp
  restart() {
    this.clearTimers();
    if (this.state) for (const p of this.state.players) this.chips[p.id] = p.chips + (p.betDone && this.state.phase !== 'end' && this.state.opts.mode === 'pot' ? p.bet : 0);
    this.state = null; this.clock = null; this.pushLobby();
    for (const p of this.players) if (p.conn) this.sendRaw(p, null);
    this.h.onState(null);
  }
  next() { const s = this.state; if (!s || s.phase !== 'end') return; const b = s.evN; seatPlayers(s, this.players.filter(p => p.connected && !this.inGame(p.id)).slice(0, Math.max(0, MAX - s.players.length)).map(p => ({ id: p.id, name: p.name, isBot: p.isBot, chips: this.chips[p.id] }))); nextRound(s); this.afterChange(b); this.pushLobby(); }
  act(pid, a) {
    const s = this.state; if (!s) return;
    if (a && a.type === 'next') { if (pid === 'host') this.next(); return; }
    const before = s.evN;
    const r = applyAction(s, pid, a);
    if (!r.ok) { this.tell(pid, r.reason); return; }
    this.afterChange(before);
  }
  tell(pid, m) { const p = this.players.find(x => x.id === pid); if (p && p.conn) try { p.conn.send({ t: 'error', msg: m }); } catch (e) {} else if (pid === 'host') this.h.onError(m); }
  afterChange(before) {
    const s = this.state;
    const evs = s.ev.filter(e => e.n > before);
    let wait = 0;
    for (const e of evs) wait = Math.max(wait, e.k === 'deal' ? 1300 + s.players.length * 120 : e.k === 'show' ? 2600 + s.players.length * 380 : e.k === 'round' ? 700 : 0);
    if (wait) this.graceUntil = Math.max(this.graceUntil, Date.now() + wait * speedK());
    this.schedule(); this.broadcast();
    this.botReacts(evs);
  }
  // ---- thả emoji / chọc nhau ----
  react(from, e) {
    if (this.dead || !isReact(e, BC_PHRASES) || !this.players.some(p => p.id === from) || !this.lim(from)) return false;
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
    this.botReactAt = now + 6000;
    const b = bots[Math.floor(Math.random() * bots.length)];
    setTimeout(() => { if (!this.dead && this.state) this.react(b.id, pickReact(mood, BOT_POOLS)); }, delay * speedK());
  }
  botReacts(evs) {
    const s = this.state;
    const isBot = id => (this.players.find(p => p.id === id) || {}).isBot;
    for (const e of evs) {
      if (e.k !== 'show') continue;
      const big = s.players.filter(p => isBot(p.id) && p.res && p.res.kind !== 'diem' && p.res.r !== 'lose');
      if (big.length && Math.random() < 0.6) { this.botSay(big[0].id, 'win', 2600); return; }
      const hurt = s.players.filter(p => isBot(p.id) && p.res && p.res.delta <= -3 * (s.opts.mode === 'pot' ? s.opts.ante : s.opts.minBet));
      if (hurt.length && Math.random() < 0.35) { this.botSay(hurt[0].id, 'hurt', 2800); return; }
      if (s.caiId && !isBot(s.caiId) && e.caiDelta < 0 && Math.random() < 0.3) { this.botSay(null, 'attack', 2800); return; }
    }
  }
  clearTimers() { for (const k of Object.keys(this.timers)) clearTimeout(this.timers[k]); this.timers = {}; }
  isAuto(pid) { const p = this.players.find(x => x.id === pid); return !p || p.isBot; }
  isAway(pid) { const p = this.players.find(x => x.id === pid); return p && !p.isBot && !p.connected && (remote || pid !== 'host'); } /* trên máy chủ thì ghế chủ phòng cũng có thể vắng */
  // hẹn giờ: bot, người rớt mạng, đồng hồ AFK, tự sang ván
  schedule() {
    this.clearTimers(); this.clock = null;
    const s = this.state; if (!s) return;
    const now = Date.now(), grace = Math.max(0, this.graceUntil - now);
    if (s.phase === 'end') {
      const guests = this.players.some(p => !p.isBot && (remote || p.id !== 'host') && p.connected);
      if (guests) {
        this.clock = { kind: 'next', end: now + grace + NEXT_MS, total: NEXT_MS };
        this.timers.next = setTimeout(() => this.next(), grace + NEXT_MS);
      }
      return;
    }
    const w = waitingOn(s);
    // nhà cái hết chip: tự xin mẹ để ván không bị kẹt
    const C = s.caiId && getP(s, s.caiId); if (s.phase === 'bet' && C && canBeg(s, C) && (this.isAuto(C.id) || this.isAway(C.id))) this.timers.cb = setTimeout(() => this.act(C.id, { type: 'beg' }), grace + 300);
    if (!w.length) return;
    let k = 0; const humans = [];
    for (const pid of w) {
      if (this.isAuto(pid) || this.isAway(pid)) {
        const d = this.isAway(pid) ? AWAY_MS : (s.phase === 'peek' ? 1400 + (k++) * 450 + Math.random() * 2200 : 500 + (k++) * 350 + Math.random() * 700) * speedK();
        this.timers['a' + pid] = setTimeout(() => this.auto(pid, false), grace + d);
      } else humans.push(pid);
    }
    if (humans.length) {
      const total = (s.phase === 'bet' ? BET_TIME : s.opts.peekTime) * 1000, key = s.phase + s.round;
      if (this.clockKey !== key) { this.clockEnd = now + grace + total; this.clockKey = key; }
      this.clock = { kind: s.phase, end: this.clockEnd, total, pids: humans };
      this.timers.afk = setTimeout(() => { for (const pid of humans) this.auto(pid, true); }, Math.max(0, this.clockEnd - now));
    }
  }
  // máy làm thay (bot hoặc người treo máy). Người treo máy: cược mức thấp nhất / tự lật bài
  auto(pid, afk) {
    const s = this.state; if (!s) return;
    const p = getP(s, pid); if (!p) return;
    if (s.phase === 'bet' && afk && !p.betDone) {
      if (canBeg(s, p)) applyAction(s, pid, { type: 'beg' });
      this.act(pid, { type: 'bet', amount: s.opts.minBet }); return;
    }
    const a = botAction(s, pid);
    if (a) { this.act(pid, a); if (a.type === 'beg' && this.state && this.state.phase === 'bet') this.auto(pid, afk); }
    else this.schedule();
  }
  broadcast() {
    if (!this.state) return;
    this.saveSnap();
    const clock = this.clockOut();
    for (const p of this.players) {
      if (p.id === 'host') this.h.onState(this.viewOf(p, clock));
      else if (p.conn) this.sendRaw(p, this.viewOf(p, clock));
    }
  }
  clockOut() { return this.clock ? { kind: this.clock.kind, pid: this.clock.pid, pids: this.clock.pids, ms: Math.max(0, this.clock.end - Date.now()), total: this.clock.total } : null; }
  viewOf(p, clock = this.clockOut()) {
    const view = viewFor(this.state, p.id); if (!this.inGame(p.id)) view.spec = true; view.clock = clock;
    view.away = this.players.filter(q => !q.isBot && !q.connected && (remote || q.id !== 'host')).map(q => q.id);
    view.humans = this.players.filter(q => !q.isBot).length;
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
