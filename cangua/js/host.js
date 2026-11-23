// 🐴 Lõi chủ phòng Cờ cá ngựa – dùng chung trình duyệt (net.js) và máy chủ (server/src/srvhost.js, "máy chủ giữ ván"). Không đụng tới window / localStorage: mọi thứ qua env.
import { createGame, applyAction, viewFor, actorOf, P, shuffleOrder } from './engine.js?v=3';
import { titleById, myTitleId } from '../../shared/titles.js?v=7'; /* 🎖️ danh hiệu trưng ra (patch -97) */
import { botAction } from './bot.js?v=4';
export const NS = 'gumballz-cangua', PREFIX = 'gumballz-cangua-', GAME = 'cangua', SNAP = 'gumballz-hostsnap-' + GAME;
export const MAX = 4;
// Câu chọc (shared/ui/react.js, mỗi câu ≤ 24 ký tự)
export const CANGUA_PHRASES = ['Về chuồng đi cưng 🐴💨', 'Đá nè! 🦶', 'Xin cái đôi 🙏', 'Né ra coi!', 'Đừng đá tui 😭', 'Ngựa tui về đích!', 'Gà quá!', 'GG'];
const BOT_POOLS = { attack: ['Về chuồng đi cưng 🐴💨', 'Đá nè! 🦶'], hurt: ['Đừng đá tui 😭', 'Cứu tui'], win: ['Ngựa tui về đích!'], reply: ['Gà quá!', 'Né ra coi!', 'Xin cái đôi 🙏'] };
const BOT_NAMES = ['Xôi', 'Gấu Bông', 'Đậu', 'Nấm', 'Sữa', 'Kẹo'];
// thời gian hoạt ảnh ước lượng (để bot / đồng hồ chờ người xem kịp)
export function animTime(evs, S = () => 1) {
  let ms = 0;
  for (const e of evs) {
    if (e.t === 'roll') ms += 1500;
    else if (e.t === 'move') ms += Math.min(e.path.length, 14) * 210 + 300 + (e.auto ? 750 : 0); // + xem trước điểm đến khi máy tự đi
    else if (e.t === 'out') ms += 800 + (e.auto ? 750 : 0);
    else if (e.t === 'kick') ms += 1300;
    else if (e.t === 'finish') ms += 1500;
    else if (e.t === 'nomove' || e.t === 'triple') ms += 700;
    else if (e.t === 'win') ms += 600;
    else ms += 150;
  }
  return ms * S();
}
export const OPT_OK = { dice: [1, 2], moveMode: ['total', 'split'], exit2: ['d16', 'any6'], exit1: ['6', '16'], noJump: [true, false], homeRule: ['thru', 'vn', 'count'], dblHalf: [true, false], dblUp: [true, false], winRule: ['top4', 'home'], triple: [true, false], playOn: [true, false], turnTime: [0, 15, 30, 45], botLevel: ['easy', 'normal', 'hard'] };
export const BASE_OPTS = { dice: 2, moveMode: 'total', exit2: 'd16', exit1: '6', noJump: true, homeRule: 'thru', dblHalf: true, dblUp: true, winRule: 'top4', triple: false, playOn: false, turnTime: 30, botLevel: 'normal' };
// env: { RoomHost, token, session, watch, store: { set, del }, speed: () => hệ số tốc độ hoạt ảnh, isReact, hostLimiter, pickReact, CFG, remote }
export function makeHost(env) {
  const { RoomHost, token, session, watch, store, isReact, hostLimiter, pickReact, CFG, remote = false } = env;
  const S = () => (env.speed ? env.speed() : 1);
  const anim = evs => animTime(evs, S);
class Host {
  constructor(me, handlers, offline = false, restore = null) {
    this.h = watch(GAME, handlers, () => 'host'); this.offline = offline;
    this.players = [{ id: 'host', title: titleById(myTitleId()), name: me.name, isBot: false, token: token(), conn: null, connected: !remote }];
    this.state = null; this.conns = new Map(); this.timer = null; this.afk = null;
    this.lim = hostLimiter(); this.botReactAt = 0;
    this.opts = { ...CFG, turnTime: offline ? 0 : CFG.turnTime, rulesV: 3 };
    if (restore) {
      this.players = restore.players.map(p => ({ ...p, conn: null, connected: p.isBot || (!remote && p.id === 'host') }));
      this.state = restore.state; this.code = restore.code;
      // luật mặc định đổi (v3: 1 ngựa/lượt, đôi đi cả hoặc nửa, vào chuồng đếm thẳng, không nhảy qua đầu, thắng bậc 3-6): phòng lưu từ bản cũ thì về luật mặc định mới
      const ro = restore.opts || {}; this.opts = ro.rulesV === 3 ? { ...this.opts, ...ro } : { ...this.opts, turnTime: ro.turnTime ?? this.opts.turnTime, botLevel: ro.botLevel || this.opts.botLevel };
      // phòng lưu từ trước bản luật nhà mới: ván đang chơi giữ luật cũ (state.opts), ván sau dùng mặc định mới
      if (restore.opts && !('dblHalf' in restore.opts)) Object.assign(this.opts, { homeRule: CFG.homeRule, dblHalf: CFG.dblHalf });
      if (this.state) { this.ftPrev = this.state.firstId; this.ftNo = this.state.gameNo; } /* 🎯 khôi phục lượt đầu ván trước sau khi tải lại */
    }
    if (offline) { this.code = 'OFFLINE'; setTimeout(() => { this.pushLobby(); if (this.state) { this.schedule(1500); this.broadcast(); } }, 0); return; }
    this.room = new RoomHost({ ns: NS, prefix: PREFIX, code: this.code, keepCode: !!restore, host: this, onConn: c => this.attach(c), onReady: code => { this.code = code; session.save(GAME, { role: 'host', code }); this.pushLobby(); }, onError: m => this.h.onError(m) });
    this.code = this.room.code;
    setTimeout(() => { this.pushLobby(); if (this.state) { this.schedule(4000); this.broadcast(); } }, 0);
  }
  controlled() { return ['host']; }
  saveSnap() {
    clearTimeout(this.snapT);
    this.snapT = setTimeout(() => { if (!this.dead) try { store.set(SNAP, JSON.stringify({ ts: Date.now(), code: this.code, offline: this.offline, ...this.snapData() })); } catch (e) {} }, 300);
  }
  snapData() { return { opts: this.opts, players: this.players.map(({ conn, ...p }) => p), state: this.state }; }
  ownerOn(on, name) { const hp = this.players.find(p => p.id === 'host'); if (hp) { hp.connected = !!on; if (name && !this.state) hp.name = String(name).slice(0, 16); } if (this.state) { this.schedule(1000); this.broadcast(); } } /* máy chủ giữ ván: người tạo phòng vào / ra */
  attach(conn) { conn.on('data', msg => this.onMsg(conn, msg)); conn.on('close', () => this.onLeave(conn)); conn.on('error', () => this.onLeave(conn)); }
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
      this.pushLobby(); if (this.state) { this.schedule(1000); this.broadcast(); }
    } else if (msg.t === 'title') { const p = this.conns.get(conn); if (p && p.conn === conn) { p.title = titleById(msg.title); this.pushLobby(); } /* 🎖️ đổi danh hiệu giữa phòng (P2P): chỉ nhận id có trong bảng */
    } else if (msg.t === 'action') { const p = this.conns.get(conn); if (p) this.inGame(p.id) && this.act(p.id, msg.a); }
    else if (msg.t === 'react') { const p = this.conns.get(conn); if (p) this.react(p.id, msg.e); }
    else if (msg.t === 'profile' && !this.state) { const p = this.conns.get(conn); if (p) { p.name = String(msg.name || p.name).slice(0, 16); this.pushLobby(); } }
  }
  onLeave(conn) {
    const p = this.conns.get(conn); if (!p) return;
    this.conns.delete(conn);
    if (p.conn !== conn) return; /* kết nối cũ đóng sau khi đã nối lại */
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
  setProfile(me) { const p = this.players[0]; if (this.state) return; p.name = me.name; this.pushLobby(); }
  setOpt(k, v) { if (this.state || !(k in OPT_OK) || !OPT_OK[k].includes(v)) return; this.opts[k] = v; this.pushLobby(); }
  addBot() {
    if (this.state || this.players.length >= MAX) return;
    const used = this.players.map(p => p.name.replace(' 🤖', ''));
    const nm = BOT_NAMES.find(n => !used.includes(n)) || 'Máy ' + this.players.length;
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
    if (seated.length < 2) { this.h.onError('Cần ít nhất 2 người chơi (thêm bot nhé).'); return; }
    const order = shuffleOrder(seated, this.ftPrev); /* 🎯 xáo thứ tự lượt, ván sau không trùng người đi đầu ván trước */
    this.state = createGame(order.map(p => ({ id: p.id, name: p.name, isBot: p.isBot })), { ...this.opts, gameNo: (this.ftNo || 0) + 1 });
    this.ftPrev = this.state.firstId; this.ftNo = this.state.gameNo;
    this.pushLobby(); this.schedule(1800); this.broadcast();
  }
  restart() { clearTimeout(this.timer); clearTimeout(this.afk); if (this.state) { this.ftPrev = this.state.firstId || this.ftPrev; this.ftNo = this.state.gameNo || this.ftNo; } /* 🎯 giữ người đi đầu ván vừa xong để ván sau không trùng */ this.state = null; this.pushLobby(); for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'state', view: null }); } catch (e) {} this.h.onState(null); }
  act(pid, a, auto = false) {
    if (!this.state) return;
    if (!auto && !this.players.find(p => p.id === pid)) return;
    const before = this.state.evn;
    const r = applyAction(this.state, pid, a && a.force ? { ...a, force: undefined } : a); // client không được ép xúc xắc
    if (!r.ok) { if (auto) return; const p = this.players.find(x => x.id === pid); if (p && p.conn) p.conn.send({ t: 'error', msg: r.reason }); else this.h.onError(r.reason); return; }
    const evs = this.state.ev.filter(e => e.n > before), wait = anim(evs);
    this.schedule(wait); this.broadcast();
    try { this.botReacts(evs, wait); } catch (e) {}
  }
  react(from, e) {
    if (this.dead || !isReact(e, CANGUA_PHRASES) || !this.players.some(p => p.id === from) || !this.lim(from)) return false;
    const msg = { t: 'react', e, from };
    for (const p of this.players) if (p.conn) try { p.conn.send(msg); } catch (x) {}
    this.h.onReact && this.h.onReact(msg);
    const sender = this.players.find(p => p.id === from);
    if (sender && !sender.isBot && Math.random() < 0.3) this.botSay(null, pickReact('reply', BOT_POOLS), 900 + Math.random() * 900);
    return true;
  }
  botSay(pid, e, delay = 1000) {
    const now = Date.now(); if (now < this.botReactAt || !this.state) return;
    const bots = this.players.filter(p => p.isBot && (!pid || p.id === pid));
    if (!bots.length) return;
    this.botReactAt = now + 6000;
    const b = bots[Math.floor(Math.random() * bots.length)];
    setTimeout(() => { if (!this.dead && this.state) this.react(b.id, e); }, delay);
  }
  botReacts(evs, wait) {
    const isBot = id => !!(this.players.find(p => p.id === id) || {}).isBot, d = () => wait + 300 + Math.random() * 600;
    for (const e of evs) {
      if (e.t === 'win') { if (isBot(e.pid) && Math.random() < 0.7) this.botSay(e.pid, pickReact('win', BOT_POOLS), d()); return; }
      if (e.t === 'kick') {
        if (isBot(e.pid) && Math.random() < 0.45) return this.botSay(e.pid, pickReact('attack', BOT_POOLS), d());
        if (isBot(e.vic) && Math.random() < 0.45) return this.botSay(e.vic, pickReact('hurt', BOT_POOLS), d());
      }
      if (e.t === 'nomove' && !isBot(e.pid) && Math.random() < 0.12) return this.botSay(null, Math.random() < 0.5 ? '😂' : 'Gà quá!', d());
    }
  }
  deadline() { return this.afkAt ? Math.max(0, this.afkAt - Date.now()) : 0; }
  broadcast() {
    if (!this.state) return;
    this.saveSnap();
    const v = viewFor(this.state); v.controlled = this.controlled();
    v.away = this.players.filter(p => !p.isBot && (remote || p.id !== 'host') && !p.connected).map(p => p.id);
    this.h.onState(v, this.deadline());
    for (const p of this.players) if (p.conn) { const pv = viewFor(this.state); pv.controlled = [p.id]; if (!this.inGame(p.id)) pv.spec = true; pv.away = v.away; try { p.conn.send({ t: 'state', view: pv, tmo: this.deadline() }); } catch (e) {} }
  }
  schedule(wait = 0) {
    clearTimeout(this.timer); clearTimeout(this.afk); this.afkAt = 0;
    const s = this.state; if (!s || s.phase !== 'playing') return;
    const pid = actorOf(s), p = this.players.find(x => x.id === pid); if (!p) return;
    const away = !p.isBot && (remote || p.id !== 'host') && !p.connected; /* trên máy chủ thì ghế chủ phòng cũng có thể vắng */
    const go = () => { if (!this.state || actorOf(this.state) !== pid) return; const a = botAction(this.state, pid, p.isBot ? this.opts.botLevel : 'normal'); if (a) this.act(pid, a, true); };
    if (p.isBot) { this.timer = setTimeout(go, wait + (450 + Math.random() * 400) * S()); return; }
    if (away) { this.timer = setTimeout(go, wait + 3000); return; }
    const tt = +this.opts.turnTime || 0;
    if (tt > 0 && !this.offline) { const ms = wait + tt * 1000; this.afkAt = Date.now() + ms; this.afk = setTimeout(() => { this.h.onAfk && this.h.onAfk(pid); go(); }, ms); }
  }
  destroy() { this.dead = true; clearTimeout(this.timer); clearTimeout(this.afk); clearTimeout(this.snapT); this.room && this.room.destroy(); }
  leave() { this.destroy(); store.del(SNAP); session.clear(GAME); }
}
  return Host;
}
