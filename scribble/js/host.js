// Lõi chủ phòng Scribble it! – KHÔNG phụ thuộc trình duyệt: kết nối, lưu trữ, thống kê… được truyền vào qua `env`.
// Trình duyệt dùng qua net.js (RoomHost thật + localStorage); máy chủ (server/src/srvhost.js, Durable Object) dùng lại đúng lớp này để giữ ván thay cho máy chủ phòng.
import { createGame, applyAction, viewFor, tick, addDraw, addPlayer, setOnline, bookItems, shiftTime, cleanOpts, maxPlayers, MAX_CROWD, MAX_NORMAL, checkTease } from './engine.js?v=13';
// Engine chưa có dropPlayer: bản tương đương, chỉ dùng hình dạng state
// công khai (players/order/turn/guessed/gains/chat/mid) – gỡ khỏi hàng vẽ + bảng điểm, hoặc đánh dấu vắng lâu.
function dropPlayer(s, pid, now = Date.now()) {
  const p = s && s.players && s.players.find(x => x.id === pid); if (!p) return false;
  if (s.mode !== 'guess' || s.phase === 'end' || (pid === s.drawer && s.phase !== 'turnEnd')) { p.on = false; p.offAt = Math.min(p.offAt || now, now - 600000); return true; }
  const i = s.order.indexOf(pid); if (i >= 0) { s.order.splice(i, 1); if (i <= s.turn && s.turn > -1) s.turn--; }
  s.players = s.players.filter(x => x !== p); delete s.guessed[pid]; delete s.gains[pid];
  s.chat.push({ id: ++s.mid, kind: 'sys', text: `${p.name} đã rời phòng 👋` }); if (s.chat.length > 60) s.chat.splice(0, s.chat.length - 60);
  return true;
}
export const GAME = 'scribble', NS = 'gumballz-scribble', PREFIX = 'gumballz-scribble-', SNAP = 'gumballz-hostsnap-' + GAME;
export const HB_MS = 2500, STALL_MS = 8000;
// Câu chọc cố định (bảng thả emoji – shared/ui/react.js). Không cho gõ tự do qua kênh này nên không thể lộ đáp án Đoán hình.
export const PHRASES = ['Vẽ gì zậy trời', 'Picasso đây rồi', 'Đoán bừa đi!', 'Ủa alo?', 'Nét căng đét!', 'Hiểu chết liền'];
// chia mảng thành các gói ≤ max byte JSON để không vượt ngưỡng gói mạng
const DROP_MS = 60000; /* rớt mạng quá 1 phút giữa ván thì mất ghế */
export function chunk(items, max = 65000) {
  const out = []; let cur = [], size = 0;
  for (const it of items) { const l = JSON.stringify(it).length + 1; if (cur.length && size + l > max) { out.push(cur); cur = []; size = 0; } cur.push(it); size += l; }
  if (cur.length || !out.length) out.push(cur);
  return out;
}
const clone = o => JSON.parse(JSON.stringify(o));

// env: { RoomHost, token, session, watch, store: { set(key, makeJson, makeSmallJson), del(key) }, isReact, hostLimiter, cfgOpts: () => luật mặc định, remote: lõi chạy trên máy chủ (ghế 'host' cũng là người ở xa) }
export function makeHost(env) {
  const { RoomHost, token, session, watch, store, isReact, hostLimiter, cfgOpts, remote = false } = env;
class Host {
  constructor(name, handlers, restore = null, offline = false) {
    this.h = watch(GAME, handlers, () => 'host'); this.isHost = true; this.offline = !!(offline || (restore && restore.offline));
    this.players = [{ id: 'host', name, token: token(), conn: null, connected: !remote }];
    this.opts = cfgOpts(); this.usedWords = (restore && restore.usedWords) || null; this.state = null; this.conns = new Map(); this.lastGuess = {}; this.lim = hostLimiter();
    if (restore) {
      this.players = restore.players.map(p => ({ ...p, conn: null, connected: !remote && p.id === 'host' }));
      this.opts = cleanOpts(restore.opts || {}); this.state = restore.state || null; if (this.state && this.state.host) this.state.host = 'host'; /* sau khi chuyển chủ phòng, id chủ cũ đã bị đổi – người điều khiển phần chiếu phải là chủ hiện tại */ this.code = restore.code; this.bookSent = null;
      if (this.state) {
        const now = Date.now();
        shiftTime(this.state, Math.max(0, now - (restore.ts || now))); // thời gian chủ phòng vắng không tính
        setOnline(this.state, 'host', !remote, now);
        for (const p of this.state.players) if (p.id !== 'host') setOnline(this.state, p.id, false, now);
      } else {
        this.pruneT = setTimeout(() => { if (!this.state && !this.dead) { this.players = this.players.filter(p => p.connected || p.id === 'host'); this.pushLobby(); } }, 12000);
      }
    }
    if (this.offline) { this.room = null; this.code = 'SOLO'; session.save(GAME, { role: 'host', code: 'SOLO' }); } // Một mình: không cần mạng
    else {
      this.room = new RoomHost({ ns: NS, prefix: PREFIX, code: this.code, keepCode: !!restore, host: this, onConn: c => this.attach(c), onReady: code => { this.code = code; session.save(GAME, { role: 'host', code }); this.pushLobby(); }, onError: m => this.h.onError(m) });
      this.code = this.room.code;
      if (!remote) this.hb = setInterval(() => this.heartbeat(), HB_MS); /* máy chủ giữ ván: không cần nhịp tim (đường truyền tự ping), để phòng được ngủ */
    }
    setTimeout(() => { this.pushLobby(); if (this.state) this.broadcast(true); }, 0);
    if (!remote) this.tk = setInterval(() => this.tick(), 250); else this.ensureTick();
  }
  ensureTick() { /* máy chủ: chỉ chạy nhịp khi đang có ván, xong ván / phòng chờ thì tắt cho máy chủ ngủ */
    const on = !this.dead && this.state && this.state.phase !== 'end';
    if (on && !this.tk) this.tk = setInterval(() => { this.tick(); this.ensureTick(); }, 250); else if (!on && this.tk) { clearInterval(this.tk); this.tk = 0; }
  }
  heartbeat() {
    if (this.dead) return;
    for (const p of this.players) if (p.id !== 'host' && p.conn) this.send(p, { t: 'ping' });
  }
  saveSnap(delay = 600) {
    clearTimeout(this.snapT);
    this.snapT = setTimeout(() => {
      const data = this.snapData();
      store.set(SNAP, () => JSON.stringify(data), () => JSON.stringify({ ...data, state: null })); /* quá lớn thì lưu bản không có ván */
    }, delay);
  }
  snapData() { return { ts: Date.now(), code: this.code, offline: this.offline, opts: this.opts, usedWords: this.usedWords || null, players: this.players.map(({ conn, lastKey, ...p }) => p), state: this.state }; }
  /* lõi chạy trên máy chủ: người tạo phòng (ghế 'host') nối vào / rớt ra */
  ownerOn(on, name) { const p = this.players.find(x => x.id === 'host'); if (!p) return; p.connected = !!on; if (on && name && !this.state) p.name = String(name).slice(0, 16); if (this.state) setOnline(this.state, 'host', !!on); p.lastKey = null; }
  attach(conn) {
    conn.on('data', msg => { try { this.onMsg(conn, msg); } catch (e) { console.error(e); } });
    conn.on('close', () => this.onLeave(conn));
    conn.on('error', () => this.onLeave(conn));
  }
  send(p, msg) { if (p && p.conn) try { p.conn.send(msg); } catch (e) {} }
  onMsg(conn, msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'join') {
      let p = this.players.find(x => x.token === msg.token && x.id !== 'host');
      const s = this.state;
      if (!p && this.banned && this.banned.has(msg.token)) { conn.send({ t: 'error', msg: 'Chủ phòng đã mời bạn ra khỏi phòng này.' }); return; }
      if (p) { if (p.conn && p.conn !== conn) try { p.conn.close(); } catch (e) {} p.conn = conn; p.connected = true; p.name = String(msg.name || p.name).slice(0, 16); }
      else {
        if (s && s.mode === 'gartic' && s.phase !== 'end') { conn.send({ t: 'error', msg: 'Ván Tam sao thất bản đang chạy – đợi ván sau nhé!' }); return; }
        const mx = maxPlayers(this.opts);
        if (this.players.length >= mx) { /* đủ chỗ mà có người đã rớt mạng: nhường ghế người vắng lâu nhất */
          const off = this.players.filter(x => x.id !== 'host' && !x.connected).sort((a, b) => (a.offAt || 0) - (b.offAt || 0))[0];
          if (off) this.drop(off, false);
        }
        if (this.players.length >= mx) { conn.send({ t: 'error', msg: `Phòng đã đủ ${mx} người${mx < MAX_CROWD ? ' (chủ phòng chọn Tam sao thất bản › Đông vui để chơi tới 30 người)' : ''}.` }); return; }
        p = { id: 'p' + Math.random().toString(36).slice(2, 8), name: String(msg.name || 'Khách').slice(0, 16), token: msg.token, conn, connected: true };
        this.players.push(p);
      }
      this.conns.set(conn, p); p.lastKey = null;
      conn.send({ t: 'welcome', id: p.id, code: this.code });
      if (s) { if (s.mode === 'guess') addPlayer(s, p); setOnline(s, p.id, true); }
      this.pushLobby();
      // gửi album trước để màn chiếu lại có ngay nội dung; lịch sử nét gửi sau state (cần turnKey)
      if (s && s.mode === 'gartic' && (s.phase === 'reveal' || s.phase === 'end')) this.sendBook(p);
      this.broadcast();
      if (s && s.mode === 'guess') this.sendCanvas(p);
      return;
    }
    const p = this.conns.get(conn); if (!p) return;
    if (msg.t === 'action') this.actFrom(p.id, msg.a);
    else if (msg.t === 'draw') this.drawFrom(p.id, msg.ops);
    else if (msg.t === 'sync') this.sendCanvas(p);
    else if (msg.t === 'needbook') this.sendBook(p);
    else if (msg.t === 'react') this.react(p.id, msg.e);
    else if (msg.t === 'tease') this.tease(p.id, msg.text);
    else if (msg.t === 'ping') this.send(p, { t: 'pong' });
  }
  onLeave(conn) {
    const p = this.conns.get(conn); if (!p) return;
    this.conns.delete(conn);
    // đường cũ đóng muộn sau khi người đó đã vào lại bằng đường mới -> bỏ qua
    if (p.conn && p.conn !== conn) return;
    p.conn = null; p.connected = false; p.offAt = Date.now();
    if (!this.state) this.players = this.players.filter(x => x !== p);
    else setOnline(this.state, p.id, false);
    this.pushLobby(); this.broadcast();
  }
  lobbyInfo() { return { players: this.players.map(p => ({ id: p.id, name: p.name, connected: p.connected })), opts: this.opts }; }
  pushLobby() {
    const info = this.lobbyInfo();
    this.h.onLobby(clone(info), this.code, !!this.state); this.saveSnap();
    for (const p of this.players) this.send(p, { t: 'lobby', info, code: this.code, started: !!this.state });
  }
  setOpts(patch) { if (this.state) return; this.opts = cleanOpts({ ...this.opts, ...patch }); this.pushLobby(); }
  /* chủ phòng mời ra (được cả giữa ván) – người bị mời không vào lại được phòng này bằng mã cũ */
  removePlayer(id) {
    const p = this.players.find(x => x.id === id); if (!p || p.id === 'host') return;
    (this.banned = this.banned || new Set()).add(p.token); this.drop(p, true);
  }
  drop(p, kick) {
    if (kick) { this.send(p, { t: 'kicked' }); try { p.conn && p.conn.close(); } catch (e) {} }
    if (p.conn) this.conns.delete(p.conn); p.conn = null; p.connected = false;
    this.players = this.players.filter(x => x !== p);
    if (this.state) { dropPlayer(this.state, p.id); (this.gone = this.gone || new Set()).add(p.id); } /* đang vẽ thì chưa gỡ được – prune gỡ sau khi qua lượt */
    this.pushLobby(); if (this.state) this.changed();
  }
  /* giữa ván: ai rớt mạng quá DROP_MS mà chưa vào lại thì dọn khỏi phòng cho đỡ chiếm chỗ */
  prune(now) {
    if (now - (this.lastPrune || 0) < 2000) return; this.lastPrune = now;
    const s = this.state;
    if (this.gone && s) for (const id of this.gone) { if (s.drawer === id && s.phase !== 'turnEnd') continue; this.gone.delete(id); if (s.players.some(x => x.id === id) && dropPlayer(s, id, now)) this.changed(); }
    for (const p of this.players.slice()) if (p.id !== 'host' && !p.connected) { if (!p.offAt) p.offAt = now; else if (now - p.offAt > DROP_MS) this.drop(p, false); }
  }
  start() {
    const ps = this.players.filter(p => p.connected), o = this.opts;
    const solo = o.mode === 'gartic' && o.gmode === 'solo';
    if (ps.length < (solo ? 1 : 2)) { this.h.onError('Cần ít nhất 2 người online – gửi mã phòng cho hội bạn nhé! (hoặc chọn Tam sao thất bản › Một mình)'); return; }
    if (ps.length > maxPlayers(o)) { this.h.onError(`Chế độ này tối đa ${MAX_NORMAL} người – chọn Tam sao thất bản › Đông vui để chơi tới ${MAX_CROWD} người.`); return; }
    this.players = ps;
    if (this.state && Array.isArray(this.state.used) && this.state.used.length) this.usedWords = this.state.used.slice(-800); /* nhớ từ đã vẽ qua các ván trong phòng */
    this.state = createGame(ps.map(p => ({ id: p.id, name: p.name })), { ...this.opts, host: 'host', used: this.usedWords || [] }, Date.now());
    this.bookSent = null; this.players.forEach(p => p.lastKey = null);
    this.pushLobby(); this.broadcast(true);
  }
  restart() {
    this.state = null; this.players = this.players.filter(p => p.connected);
    for (const p of this.players) { p.lastKey = null; this.send(p, { t: 'state', view: null }); }
    this.h.onState(null); this.pushLobby();
  }
  // thả emoji / câu chọc: chủ phòng gán from theo kết nối, lọc câu lạ + chống spam rồi phát cho cả phòng
  react(from, e) {
    if (this.dead || !isReact(e, PHRASES) || !this.players.some(p => p.id === from) || !this.lim(from)) return false;
    const msg = { t: 'react', e, from };
    for (const p of this.players) if (p.id !== 'host') this.send(p, msg);
    this.h.onReact && this.h.onReact(msg); return true;
  }
  // câu chọc gõ tự do: chủ phòng làm sạch + lọc lộ đáp án (engine.checkTease) + chống spam chung với emoji
  tease(from, raw) {
    if (this.dead || typeof raw !== 'string' || raw.length > 400 || !this.players.some(p => p.id === from)) return false;
    const r = checkTease(this.state, from, raw), p = this.players.find(x => x.id === from);
    if (r.guess) { this.actFrom(from, { type: 'guess', text: r.text }); return false; } // gõ trúng/gần trúng đáp án: tính là lượt đoán
    if (!r.ok) { if (!r.silent) { if (from === 'host') this.h.onError(r.reason); else this.send(p, { t: 'error', msg: r.reason }); } return false; }
    if (!this.lim(from)) return false;
    const msg = { t: 'tease', text: r.text, from };
    for (const q of this.players) if (q.id !== 'host') this.send(q, msg);
    this.h.onTease && this.h.onTease(msg); return true;
  }
  act(a) { this.actFrom('host', a); }
  actFrom(pid, a) {
    if (!this.state || !a) return;
    if (a.type === 'guess') { // chống spam: tối đa 6 tin / 2 giây (tin qua Firebase có thể tới dồn cục)
      const now = Date.now(), arr = (this.lastGuess[pid] || []).filter(t => now - t < 2000);
      if (arr.length >= 6) return; arr.push(now); this.lastGuess[pid] = arr;
    }
    const r = applyAction(this.state, pid, a, Date.now());
    if (!r.ok) { if (pid === 'host') this.h.onError(r.reason); else this.send(this.players.find(x => x.id === pid), { t: 'error', msg: r.reason }); return; }
    if (a.type === 'autoReveal' && pid === 'host') this.opts = cleanOpts({ ...this.opts, revealAuto: a.sec }); // ván sau giữ lựa chọn này
    this.changed();
  }
  changed() {
    if (remote) this.ensureTick();
    const s = this.state;
    if (s && s.mode === 'gartic' && (s.phase === 'reveal' || s.phase === 'end') && this.bookSent !== s.gid) {
      this.bookSent = s.gid; for (const p of this.players) this.sendBook(p);
    }
    this.broadcast();
  }
  tick() { if (!this.state) return; const now = Date.now(); this.prune(now); if (this.state && tick(this.state, now)) this.changed(); }
  draw(ops) { this.drawFrom('host', ops); }
  drawFrom(pid, ops) {
    if (!this.state) return;
    const clean = addDraw(this.state, pid, ops); if (!clean) return;
    const msg = { t: 'draw', ops: clean, cv: this.state.cv };
    for (const p of this.players) if (p.id !== pid) { if (p.id === 'host') this.h.onDraw(clean, this.state.cv); else this.send(p, msg); }
    this.saveSnap(1500);
  }
  sendCanvas(p) {
    const s = this.state; if (!p || !s || s.mode !== 'guess') return;
    const parts = chunk(s.canvas);
    parts.forEach((ops, i) => { const m = { t: 'canvas', ops, cv: s.cv, tk: s.turnKey, first: i === 0, last: i === parts.length - 1 }; if (p.id === 'host') this.h.onCanvas(clone(m)); else this.send(p, m); });
  }
  sync() { this.sendCanvas(this.players.find(p => p.id === 'host')); }
  sendBook(p) {
    const s = this.state; if (!p || !s || s.mode !== 'gartic' || (s.phase !== 'reveal' && s.phase !== 'end')) return; /* album chỉ phát khi đã tới phần chiếu lại, kẻo xin giữa ván là thấy hết câu gốc */
    const items = bookItems(s);
    for (const part of chunk(items)) { const m = { t: 'book', gid: s.gid, items: part }; if (p.id === 'host') this.h.onBook(clone(m)); else this.send(p, m); }
  }
  needBook() { this.sendBook(this.players.find(p => p.id === 'host')); }
  broadcast(force = false) {
    const s = this.state; if (!s) return;
    this.saveSnap();
    const now = Date.now();
    for (const p of this.players) {
      if (p.id !== 'host' && !p.conn) continue; if (p.id === 'host' && remote && !p.connected) continue;
      const view = viewFor(s, p.id, now);
      const { left, ...rest } = view; const key = JSON.stringify(rest);
      if (!force && key === p.lastKey) continue;
      p.lastKey = key;
      if (p.id === 'host') this.h.onState(clone(view)); else this.send(p, { t: 'state', view });
    }
  }
  destroy() { this.dead = true; clearInterval(this.tk); clearInterval(this.hb); clearTimeout(this.pruneT); clearTimeout(this.snapT); this.room && this.room.destroy(); }
  leave() { this.destroy(); store.del(SNAP); session.clear(GAME); }
}
  return Host;
}
