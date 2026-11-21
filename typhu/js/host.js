// Lõi chủ phòng Cờ Tỷ Phú – KHÔNG phụ thuộc trình duyệt: kết nối, lưu trữ, thống kê, tốc độ hoạt ảnh… truyền vào qua `env`.
// Trình duyệt dùng qua net.js (RoomHost thật + localStorage); máy chủ (server/src/srvhost.js, Durable Object) dùng lại đúng lớp này để giữ ván.
import { createGame, applyAction, viewFor, actorOf, P } from './engine.js?v=66';
import { titleById, myTitleId } from '../../shared/titles.js?v=5'; /* 🎖️ danh hiệu trưng ra (patch -97) */
export { setData } from './engine.js?v=66'; /* máy chủ nạp tiles.json + cards.json qua đây để cùng một bản engine với lõi */
import { botAction } from './bot.js?v=66';
import { OPTIONS, PRESETS, adminOnly } from '../../shared/js/avatar-opts.js?v=12';
export const NS = 'gumballz-typhu', PREFIX = 'gumballz-typhu-', GAME = 'typhu', SNAP = 'gumballz-hostsnap-' + GAME;
export const MAX = 8; /* tối đa 8 người (4 đội 2 người khi chơi theo đội) */
// Câu chọc kiểu tỷ phú Sài Gòn (bảng thả emoji – shared/ui/react.js, mỗi câu ≤ 24 ký tự)
export const TYPHU_PHRASES = ['Trả tiền thuê đi!', 'Đất này của tui!', 'Vô tù chơi', 'Mua lại nè 💥', 'Đại gia là đây 😎', 'Nghèo rồi 😭', 'Cứu tui', 'Gà quá!'];
const BOT_POOLS = { attack: ['Trả tiền thuê đi!', 'Đất này của tui!', 'Mua lại nè 💥'], hurt: ['Nghèo rồi 😭', 'Cứu tui'], win: ['Đại gia là đây 😎'], reply: ['Gà quá!', 'Vô tù chơi'] };
export const COLORS = ['#ff5a5f', '#3d8bff', '#2fc76f', '#ffb020', '#a259ff', '#ff7ac8', '#14c4c4', '#8d6e63'];
const BOT_NAMES = ['Xôi', 'Gấu Bông', 'Đậu', 'Nấm', 'Sữa', 'Kẹo', 'Bé Na', 'Chú Tư'];
/* luật gốc khi không có luat-mac-dinh.js (máy chủ dùng bảng này; web trộn thêm cấu hình của trang) */
export const BASE_OPTS = { startMoney: 1500, maxRounds: 0, monopolyWin: true, auction: true, buyback: true, freeBuild: true, travel: true, travelFee: 100, turnTime: 60, teams: false };
// chỉ nhận cấu hình nhân vật hợp lệ (không tin dữ liệu từ máy khác)
export function cleanAvatar(a) {
  const base = { ...PRESETS[0] }, out = {}, hex = /^#[0-9a-f]{6}$/i;
  for (const k of [...Object.keys(OPTIONS), 'horns']) {
    const list = OPTIONS[k] || [['none']], vals = list.map(o => Array.isArray(o) ? o[0] : o), colorField = !Array.isArray(list[0]);
    const v = a && a[k];
    out[k] = (colorField ? hex.test(v || '') : vals.includes(v)) ? v : (base[k] ?? vals[0]);
  }
  return out;
}
// thời gian hoạt ảnh ước lượng cho các sự kiện (để bot chờ người xem kịp)
export function animTime(evs, k = 1) {
  let ms = 0;
  for (const e of evs) {
    if (e.t === 'roll') ms += 1350;
    else if (e.t === 'move') ms += e.kind === 'walk' && e.steps <= 12 ? e.steps * 235 + 350 : e.kind === 'back' ? 3 * 235 + 300 : 1100;
    else if (e.t === 'card') ms += 3000;
    else if (e.t === 'build') ms += e.h === 5 ? 1600 : 450;
    else if (['buy', 'sold', 'pay', 'buyback', 'traded', 'bankrupt', 'debt', 'auction'].includes(e.t)) ms += 700;
    else if (e.t === 'win') ms += 400;
    else ms += 120;
  }
  return ms * k;
}
const PUB = PRESETS.filter(p => !adminOnly(p)); /* mẫu ai cũng dùng được (bot không mặc đồ hầu gái) */
const randomPreset = () => ({ ...PUB[Math.floor(Math.random() * PUB.length)] });

// env: { RoomHost, token, session, watch, store: { set(key, json), del(key) }, speed: () => hệ số tốc độ hoạt ảnh, isReact, hostLimiter, pickReact, CFG (luật mặc định), remote: lõi chạy trên máy chủ }
export function makeHost(env) {
  const { RoomHost, token, session, watch, store, speed: S, isReact, hostLimiter, pickReact, CFG, remote = false } = env;
class Host {
  // me: { name, avatar }
  constructor(me, handlers, offline = false, restore = null) {
    this.h = watch(GAME, handlers, () => 'host'); this.offline = offline;
    this.players = [{ id: 'host', title: titleById(myTitleId()), name: me.name, avatar: cleanAvatar(me.avatar), isBot: false, local: false, token: token(), conn: null, connected: !remote }];
    this.state = null; this.conns = new Map(); this.timer = null; this.afk = null;
    this.lim = hostLimiter(); this.botReactAt = 0;
    // freeBuild: true = không cần đủ bộ (mặc định) · false = phải đủ bộ màu · 'zing' = ZingPlay thật (chỉ xây ở ô vừa dừng)
    this.opts = { ...CFG, turnTime: offline ? 0 : CFG.turnTime };
    if (restore) {
      this.players = restore.players.map(p => ({ ...p, conn: null, connected: p.isBot || p.local || (!remote && p.id === 'host') }));
      this.state = restore.state; this.code = restore.code; this.opts = { ...this.opts, ...(restore.opts || {}) };
    }
    if (offline) { this.code = 'OFFLINE'; setTimeout(() => { this.pushLobby(); if (this.state) { this.schedule(1500); this.broadcast(); } }, 0); return; }
    this.room = new RoomHost({ ns: NS, prefix: PREFIX, code: this.code, keepCode: !!restore, host: this, onConn: c => this.attach(c), onReady: code => { this.code = code; session.save(GAME, { role: 'host', code }); this.pushLobby(); }, onError: m => this.h.onError(m) });
    this.code = this.room.code;
    setTimeout(() => { this.pushLobby(); if (this.state) { this.schedule(4000); this.broadcast(); } }, 0);
  }
  // id người trên máy này điều khiển (chủ phòng + người chơi cùng máy)
  controlled() { return this.players.filter(p => p.id === 'host' || p.local).map(p => p.id); }
  saveSnap() {
    clearTimeout(this.snapT);
    this.snapT = setTimeout(() => { store.set(SNAP, JSON.stringify({ ts: Date.now(), code: this.code, offline: this.offline, ...this.snapData() })); }, 300);
  }
  snapData() { return { opts: this.opts, players: this.players.map(({ conn, ...p }) => p), state: this.state }; }
  /* lõi chạy trên máy chủ: người tạo phòng (ghế 'host') nối vào / rớt ra */
  ownerOn(on, name, avatar) { const p = this.players.find(x => x.id === 'host'); if (!p) return; p.connected = !!on; if (on && !this.state) { if (name) p.name = String(name).slice(0, 16); if (avatar) p.avatar = cleanAvatar(avatar); } if (this.state) this.schedule(on ? 1000 : 0); }
  attach(conn) { conn.on('data', msg => this.onMsg(conn, msg)); conn.on('close', () => this.onLeave(conn)); conn.on('error', () => this.onLeave(conn)); }
  onMsg(conn, msg) {
    if (!msg) return;
    if (msg.t === 'join') {
      let p = this.players.find(x => x.token === msg.token && !x.isBot && !x.local && x.id !== 'host');
      if (p) { if (p.conn && p.conn !== conn) try { p.conn.close(); } catch (e) {} p.conn = conn; p.connected = true; p.title = titleById(msg.title); if (!this.state) { p.name = String(msg.name || p.name).slice(0, 16); p.avatar = cleanAvatar(msg.avatar); } }
      else {
        if (this.players.length >= MAX + 8) { conn.send({ t: 'error', msg: 'Phòng đã đầy.' }); return; } /* cho phép thêm tối đa 8 người xem */
        p = { id: 'p' + Math.random().toString(36).slice(2, 8), name: String(msg.name || 'Khách').slice(0, 16), avatar: cleanAvatar(msg.avatar), isBot: false, local: false, token: msg.token, conn, connected: true, title: titleById(msg.title) };
        this.players.push(p);
      }
      this.conns.set(conn, p);
      conn.send({ t: 'welcome', id: p.id, code: this.code });
      this.pushLobby(); if (this.state) { this.schedule(1000); this.broadcast(); }
    } else if (msg.t === 'title') { const p = this.conns.get(conn); if (p && p.conn === conn) { p.title = titleById(msg.title); this.pushLobby(); } /* 🎖️ đổi danh hiệu giữa phòng (P2P): chỉ nhận id có trong bảng */
    } else if (msg.t === 'action') {
      const p = this.conns.get(conn); if (p) this.inGame(p.id) && this.act(p.id, msg.a);
    } else if (msg.t === 'react') {
      const p = this.conns.get(conn); if (p) this.react(p.id, msg.e); // from do chủ phòng gán theo kết nối
    } else if (msg.t === 'profile' && !this.state) {
      const p = this.conns.get(conn); if (p) { p.name = String(msg.name || p.name).slice(0, 16); p.avatar = cleanAvatar(msg.avatar); this.pushLobby(); }
    }
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
  lobbyInfo() { return { players: this.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, isBot: p.isBot, local: p.local, connected: p.connected, title: p.title || null })), opts: this.opts }; }
  pushLobby() {
    const info = this.lobbyInfo();
    this.h.onLobby(info, this.code, !!this.state); this.saveSnap();
    for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'lobby', info, code: this.code, started: !!this.state }); } catch (e) {}
  }
  setProfile(me) { const p = this.players.find(x => x.id === 'host'); if (this.state || !p || !me) return; p.name = String(me.name || p.name).slice(0, 16); p.avatar = cleanAvatar(me.avatar); this.pushLobby(); }
  setOpt(k, v) { if (this.state || !(k in this.opts)) return; if (k === 'freeBuild' && ![true, false, 'zing'].includes(v)) return; this.opts[k] = v; this.pushLobby(); }
  addBot() {
    if (this.state || this.players.length >= MAX) return;
    const used = this.players.map(p => p.name.replace(' 🤖', ''));
    const nm = BOT_NAMES.find(n => !used.includes(n)) || 'Máy ' + this.players.length;
    const usedAv = this.players.map(p => JSON.stringify(p.avatar)), free = PUB.map(cleanAvatar).filter(a => !usedAv.includes(JSON.stringify(a)));
    this.players.push({ id: 'bot' + Math.random().toString(36).slice(2, 7), name: nm + ' 🤖', avatar: free.length ? free[Math.floor(Math.random() * free.length)] : randomPreset(), isBot: true, local: false, token: null, conn: null, connected: true });
    this.pushLobby();
  }
  addLocal(name, avatar) {
    if (this.state || this.players.length >= MAX) return;
    this.players.push({ id: 'l' + Math.random().toString(36).slice(2, 7), name: String(name || 'Người chơi ' + (this.players.length + 1)).slice(0, 16), avatar: cleanAvatar(avatar || randomPreset()), isBot: false, local: true, token: null, conn: null, connected: true });
    this.pushLobby();
  }
  removePlayer(id) {
    if (this.state) return;
    const p = this.players.find(x => x.id === id); if (!p || p.id === 'host') return;
    if (p.conn) try { p.conn.send({ t: 'kicked' }); p.conn.close(); } catch (e) {}
    this.players = this.players.filter(x => x !== p); this.pushLobby();
  }
  start() {
    { const n = this.players.length; this.players = this.players.filter(p => (p.id === 'host' && !remote) || p.isBot || p.local || p.connected || p.id === 'host'); if (this.players.length !== n) this.pushLobby(); } /* người đã thoát / rớt mạng không được chia bài: ghế ma làm cả bàn phải chờ từng lượt */
    const seated = this.players.slice(0, MAX);
    if (seated.length < 2) { this.h.onError('Cần ít nhất 2 người chơi (thêm máy nhé).'); return; }
    const used = new Set(), cols = seated.map(p => { let c = p.avatar && p.avatar.color; if (!COLORS.includes(c) || used.has(c)) c = COLORS.find(x => !used.has(x)); used.add(c); return c; });
    // thứ tự lượt ngẫu nhiên
    const order = seated.map((p, i) => ({ p, c: cols[i], r: Math.random() })).sort((a, b) => a.r - b.r);
    this.state = createGame(order.map(({ p, c }) => ({ id: p.id, name: p.name, isBot: p.isBot, avatar: p.avatar, color: c })), this.opts);
    this.lastEv = 0;
    this.pushLobby(); this.schedule(1800); this.broadcast();
  }
  restart() { clearTimeout(this.timer); clearTimeout(this.afk); this.state = null; this.pushLobby(); for (const p of this.players) if (p.conn) p.conn.send({ t: 'state', view: null }); this.h.onState(null); }
  act(pid, a, auto = false) {
    if (!this.state) return;
    if (!auto && pid !== 'host' && !this.players.find(p => p.id === pid)) return;
    const before = this.state.evn;
    const r = applyAction(this.state, pid, a);
    if (!r.ok) { if (auto) return; const p = this.players.find(x => x.id === pid); if (p && p.conn) p.conn.send({ t: 'error', msg: r.reason }); else this.h.onError(r.reason); return; }
    const evs = this.state.ev.filter(e => e.n > before);
    this.schedule(animTime(evs, S())); this.broadcast();
    try { this.botReacts(evs, animTime(evs, S())); } catch (e) {}
  }
  // ---- thả emoji / chọc nhau: chủ phòng lọc (hợp lệ + chống spam) rồi phát lại cho cả bàn ----
  react(from, e) {
    if (this.dead || !isReact(e, TYPHU_PHRASES) || !this.players.some(p => p.id === from) || !this.lim(from)) return false;
    const msg = { t: 'react', e, from };
    for (const p of this.players) if (p.conn) try { p.conn.send(msg); } catch (x) {}
    this.h.onReact && this.h.onReact(msg);
    const sender = this.players.find(p => p.id === from);
    if (sender && !sender.isBot && Math.random() < 0.3) this.botSay(null, pickReact('reply', BOT_POOLS), 900 + Math.random() * 900);
    return true;
  }
  // bot chọc (pid null: 1 bot ngẫu nhiên); tối đa 1 lần / 6 giây cho cả bàn để không ồn
  botSay(pid, e, delay = 1000) {
    const now = Date.now(); if (now < this.botReactAt || !this.state) return;
    const bots = this.players.filter(p => p.isBot && (!pid || p.id === pid) && !(P(this.state, p.id) || {}).out);
    if (!bots.length) return;
    this.botReactAt = now + 6000;
    const b = bots[Math.floor(Math.random() * bots.length)];
    setTimeout(() => { if (!this.dead && this.state) this.react(b.id, e); }, delay);
  }
  botReacts(evs, wait) {
    const isBot = id => !!id && !!(this.players.find(p => p.id === id) || {}).isBot, d = () => wait + 400 + Math.random() * 600;
    for (const e of evs) {
      if (e.t === 'win') { if (isBot(e.pid) && Math.random() < 0.7) this.botSay(e.pid, pickReact('win', BOT_POOLS), d()); return; }
      if (e.t === 'pay' && e.why === 'rent' && e.amt >= 150) {
        if (isBot(e.to) && Math.random() < 0.4) return this.botSay(e.to, Math.random() < 0.6 ? 'Trả tiền thuê đi!' : pickReact('attack', BOT_POOLS), d());
        if (isBot(e.from) && e.amt >= 300 && Math.random() < 0.4) return this.botSay(e.from, pickReact('hurt', BOT_POOLS), d());
      }
      if (e.t === 'buyback') {
        if (isBot(e.pid) && Math.random() < 0.5) return this.botSay(e.pid, Math.random() < 0.5 ? 'Mua lại nè 💥' : 'Đất này của tui!', d());
        if (isBot(e.from) && Math.random() < 0.5) return this.botSay(e.from, pickReact('hurt', BOT_POOLS), d());
      }
      if (e.t === 'jail' && !isBot(e.pid) && Math.random() < 0.35) return this.botSay(null, Math.random() < 0.6 ? 'Vô tù chơi' : '😂', d());
      if (e.t === 'bankrupt' && Math.random() < 0.5) return this.botSay(null, Math.random() < 0.5 ? '💀' : '🙏', d());
      if (e.t === 'build' && e.h === 5 && isBot(e.pid) && Math.random() < 0.4) return this.botSay(e.pid, Math.random() < 0.5 ? '🔥' : 'Đại gia là đây 😎', d());
    }
  }
  // người cần quyết định + hạn chót
  deadline() { return this.afkAt ? Math.max(0, this.afkAt - Date.now()) : 0; }

  broadcast() {
    if (!this.state) return;
    this.saveSnap();
    const v = viewFor(this.state, 'host'); v.controlled = this.controlled();
    v.away = this.players.filter(p => !p.isBot && !p.local && (remote || p.id !== 'host') && !p.connected).map(p => p.id);
    this.h.onState(JSON.parse(JSON.stringify(v)), this.deadline());
    for (const p of this.players) if (p.conn) { const pv = viewFor(this.state, p.id); pv.controlled = [p.id]; if (!this.inGame(p.id)) pv.spec = true; pv.away = v.away; try { p.conn.send({ t: 'state', view: pv, tmo: this.deadline() }); } catch (e) {} }
  }
  schedule(wait = 0) {
    clearTimeout(this.timer); clearTimeout(this.afk); this.afkAt = 0;
    const s = this.state; if (!s || s.phase !== 'playing') return;
    const pid = actorOf(s), p = this.players.find(x => x.id === pid); if (!p) return;
    const away = !p.isBot && !p.local && (remote || p.id !== 'host') && !p.connected; /* trên máy chủ thì ghế chủ phòng cũng có thể vắng → máy đi thay */
    const go = () => {
      if (!this.state || actorOf(this.state) !== pid) return;
      const n0 = this.state.evn, st0 = this.state.stage, a = botAction(this.state, pid); if (a) this.act(pid, a, true);
      /* máy không đi được (không có nước / nước bị luật từ chối) → thử nước an toàn, không thì hẹn lại – trước đây máy đứng im luôn (góp ý 17/11/2026) */
      if (this.state && this.state.phase === 'playing' && actorOf(this.state) === pid && this.state.evn === n0 && this.state.stage === st0) {
        for (const b of [{ type: 'pass' }, { type: 'decline' }, { type: 'end' }, { type: 'roll' }]) { this.act(pid, b, true); if (!this.state || this.state.evn !== n0 || actorOf(this.state) !== pid) return; }
        clearTimeout(this.timer); this.timer = setTimeout(go, 2500);
      }
    };
    if (p.isBot) { this.timer = setTimeout(go, wait + (550 + Math.random() * 450) * S()); return; }
    if (away) { this.timer = setTimeout(go, wait + 3500); return; }
    const tt = +this.opts.turnTime || 0;
    /* đấu giá mà người thật không bấm (hay gặp trên điện thoại: tưởng máy đứng im) → 20 giây tự bỏ qua */
    if (!tt && s.stage === 'auction') { const ms = wait + 20000; this.afkAt = Date.now() + ms; this.afk = setTimeout(() => { if (this.state && this.state.stage === 'auction' && actorOf(this.state) === pid) this.act(pid, { type: 'pass' }, true); }, ms); return; }
    if (tt > 0) { const ms = wait + tt * 1000; this.afkAt = Date.now() + ms; this.afk = setTimeout(() => { this.h.onAfk && this.h.onAfk(pid); go(); }, ms); }
  }
  destroy() { this.dead = true; clearTimeout(this.timer); clearTimeout(this.afk); clearTimeout(this.snapT); this.room && this.room.destroy(); }
  leave() { this.destroy(); store.del(SNAP); session.clear(GAME); }
}
  return Host;
}
