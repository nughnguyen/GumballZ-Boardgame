// Lớp mạng Scribble it!: chủ phòng giữ state + đồng hồ, máy khách gửi hành động & nét vẽ.
// Nét vẽ đi riêng (tin 'draw' theo lô ~100ms, chủ phòng chuyển tiếp), người vào muộn nhận lại cả lịch sử ('canvas').
import { createGame, applyAction, viewFor, tick, addDraw, addPlayer, setOnline, dropPlayer, bookItems, shiftTime, cleanOpts, DEFAULT_OPTS, maxPlayers, MAX_CROWD, MAX_NORMAL, checkTease } from './engine.js?v=13';
import { RoomHost, RoomClient, token, session, makeCode } from '../../shared/net/room.js?v=54';
import { announceRoom, myLevel } from '../../shared/net/api.js?v=29';
import { watch } from '../../shared/ui/stats.js?v=98';
import { isReact, hostLimiter } from '../../shared/ui/react.js?v=6';
import { CATS } from './words.js?v=7';
import { GMODES, REVEAL_AUTO } from './engine.js?v=13';
import { rulesFor } from '../../shared/rules.js?v=2';
// ⚙️ Luật mặc định khi tạo phòng mới: lấy từ luat-mac-dinh.js (gốc repo); sai/thiếu → giữ luật gốc. cats: bật/tắt từng chủ đề
// solo: mặc định của "Hoạt hình một mình" (máy đã từng chọn thì nhớ lựa chọn riêng – localStorage 'scribble-solo')
const D = DEFAULT_OPTS, rng = (min, max, step = 1) => ({ min, max, step });
const CFG = rulesFor('scribble', {
  mode: D.mode, gmode: D.gmode, rounds: D.rounds, drawTime: D.drawTime, textTime: D.textTime, cSteps: D.cSteps, cTime: D.cTime,
  revealAuto: D.revealAuto, frames: D.frames, fps: D.fps, gSize: D.gSize,
  cats: Object.fromEntries(Object.keys(CATS).map(k => [k, D.cats.includes(k)])),
  solo: { frames: 5, fps: 4, drawTime: 80 },
}, {
  mode: ['guess', 'gartic'], gmode: Object.keys(GMODES), rounds: rng(1, 10), drawTime: rng(30, 180, 10), textTime: rng(20, 90, 5), cSteps: rng(2, 20), cTime: rng(10, 180, 5),
  revealAuto: REVEAL_AUTO, frames: v => v === 0 || (Number.isInteger(v) && v >= 4 && v <= 16), fps: rng(1, 12), gSize: rng(4, 8),
  cats: Object.fromEntries(Object.keys(CATS).map(k => [k, [true, false]])),
  solo: { frames: rng(3, 12), fps: rng(1, 12), drawTime: rng(30, 180, 10) },
});
const cfgOpts = () => { const { cats, solo, ...o } = CFG; return cleanOpts({ ...DEFAULT_OPTS, ...o, cats: Object.keys(cats).filter(k => cats[k]) }); };
export const SOLO_DEFAULT = { ...CFG.solo };
// Câu chọc cố định (bảng thả emoji – shared/ui/react.js). Không cho gõ tự do qua kênh này nên không thể lộ đáp án Đoán hình.
export const PHRASES = ['Vẽ gì zậy trời', 'Picasso đây rồi', 'Đoán bừa đi!', 'Ủa alo?', 'Nét căng đét!', 'Hiểu chết liền'];
const NS = 'gumballz-scribble', PREFIX = 'gumballz-scribble-', GAME = 'scribble';
const SNAP = 'gumballz-hostsnap-' + GAME;
const HB_MS = 2500, STALL_MS = 8000;
const DROP_MS = 60000; /* rớt mạng quá 1 phút giữa ván thì mất ghế */
export const MAX = MAX_CROWD; // chế độ Đông vui tới 30 người, các chế độ khác tối đa 12
export { maxPlayers };
export { session };
export function loadSnapshot() { try { const d = JSON.parse(localStorage.getItem(SNAP)); return d && Date.now() - d.ts < 3 * 3600e3 ? d : null; } catch (e) { return null; } }
// chia mảng thành các gói ≤ max byte JSON để không vượt ngưỡng gói mạng
export function chunk(items, max = 65000) {
  const out = []; let cur = [], size = 0;
  for (const it of items) { const l = JSON.stringify(it).length + 1; if (cur.length && size + l > max) { out.push(cur); cur = []; size = 0; } cur.push(it); size += l; }
  if (cur.length || !out.length) out.push(cur);
  return out;
}
const clone = o => JSON.parse(JSON.stringify(o));

export class Host {
  constructor(name, handlers, restore = null, offline = false) {
    this.h = watch(GAME, handlers, () => 'host'); this.isHost = true; this.offline = !!(offline || (restore && restore.offline));
    this.players = [{ id: 'host', name, token: token(), conn: null, connected: true }];
    this.opts = cfgOpts(); this.state = null; this.conns = new Map(); this.lastGuess = {}; this.lim = hostLimiter();
    if (restore) {
      this.players = restore.players.map(p => ({ ...p, conn: null, connected: p.id === 'host' }));
      this.opts = cleanOpts(restore.opts || {}); this.state = restore.state || null; if (this.state && this.state.host) this.state.host = 'host'; /* sau khi chuyển chủ phòng, id chủ cũ đã bị đổi – người điều khiển phần chiếu phải là chủ hiện tại */ this.code = restore.code; this.bookSent = null;
      if (this.state) {
        const now = Date.now();
        shiftTime(this.state, Math.max(0, now - (restore.ts || now))); // thời gian chủ phòng vắng không tính
        setOnline(this.state, 'host', true, now);
        for (const p of this.state.players) if (p.id !== 'host') setOnline(this.state, p.id, false, now);
      } else {
        this.pruneT = setTimeout(() => { if (!this.state && !this.dead) { this.players = this.players.filter(p => p.connected || p.id === 'host'); this.pushLobby(); } }, 12000);
      }
    }
    if (this.offline) { this.room = null; this.code = 'SOLO'; session.save(GAME, { role: 'host', code: 'SOLO' }); } // Một mình: không cần mạng
    else {
      this.room = new RoomHost({ ns: NS, prefix: PREFIX, code: this.code, keepCode: !!restore, host: this, onConn: c => this.attach(c), onReady: code => { this.code = code; session.save(GAME, { role: 'host', code }); this.pushLobby(); }, onError: m => this.h.onError(m) });
      this.code = this.room.code;
      this.hb = setInterval(() => this.heartbeat(), HB_MS);
    }
    setTimeout(() => { this.pushLobby(); if (this.state) this.broadcast(true); }, 0);
    this.tk = setInterval(() => this.tick(), 250);
  }
  heartbeat() {
    if (this.dead) return;
    for (const p of this.players) if (p.id !== 'host' && p.conn) this.send(p, { t: 'ping' });
  }
  saveSnap(delay = 600) {
    clearTimeout(this.snapT);
    this.snapT = setTimeout(() => {
      const data = { ts: Date.now(), code: this.code, offline: this.offline, opts: this.opts, players: this.players.map(({ conn, lastKey, ...p }) => p), state: this.state };
      try { localStorage.setItem(SNAP, JSON.stringify(data)); }
      catch (e) { try { localStorage.setItem(SNAP, JSON.stringify({ ...data, state: null })); } catch (x) {} }
    }, delay);
  }
  snapData() { return { ts: Date.now(), code: this.code, offline: this.offline, opts: this.opts, usedWords: this.usedWords || null, players: this.players.map(({ conn, lastKey, ...p }) => p), state: this.state }; } /* ảnh chụp ván (đẩy ván chơi-với-máy lên máy chủ) */
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
    /* xoay hoạ sĩ đầu (chế độ Đoán hình): ván sau là người sau hoạ sĩ đầu ván
       trước trong hàng ghế; ván đầu thì xáo ngẫu nhiên */
    let firstDrawer = null;
    if (o.mode === 'guess' && this.lastFirstDrawer) {
      const ids = ps.map(p => p.id), i = ids.indexOf(this.lastFirstDrawer);
      if (i >= 0) firstDrawer = ids[(i + 1) % ids.length];
    }
    this.state = createGame(ps.map(p => ({ id: p.id, name: p.name })), { ...this.opts, host: 'host', used: this.usedWords || [], firstDrawer }, Date.now());
    if (this.state.mode === 'guess') this.lastFirstDrawer = this.state.firstDrawer || null;
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
  sync() { this.sendCanvas(this.players[0]); }
  sendBook(p) {
    const s = this.state; if (!p || !s || s.mode !== 'gartic' || (s.phase !== 'reveal' && s.phase !== 'end')) return; /* album chỉ phát khi đã tới phần chiếu lại, kẻo xin giữa ván là thấy hết câu gốc */
    const items = bookItems(s);
    for (const part of chunk(items)) { const m = { t: 'book', gid: s.gid, items: part }; if (p.id === 'host') this.h.onBook(clone(m)); else this.send(p, m); }
  }
  needBook() { this.sendBook(this.players[0]); }
  broadcast(force = false) {
    const s = this.state; if (!s) return;
    this.saveSnap();
    const now = Date.now();
    for (const p of this.players) {
      if (p.id !== 'host' && !p.conn) continue;
      const view = viewFor(s, p.id, now);
      const { left, ...rest } = view; const key = JSON.stringify(rest);
      if (!force && key === p.lastKey) continue;
      p.lastKey = key;
      if (p.id === 'host') this.h.onState(clone(view)); else this.send(p, { t: 'state', view });
    }
  }
  destroy() { this.dead = true; clearInterval(this.tk); clearInterval(this.hb); clearTimeout(this.pruneT); clearTimeout(this.snapT); this.room && this.room.destroy(); }
  leave() { this.destroy(); try { localStorage.removeItem(SNAP); } catch (e) {} session.clear(GAME); }
}

// 🖥️ Chủ phòng từ xa: ván do MÁY CHỦ giữ (server/src/srvhost.js chạy đúng lõi host.js), máy mình chỉ gửi lệnh – chủ phòng để tab ở nền / khoá máy / rớt mạng thì ván vẫn chạy.
// Thử bằng ?srv=1 (nhớ trong localStorage 'gumballz-srv-scribble'), tắt bằng ?srv=0. Mở phòng trên máy chủ thất bại thì lần tạo kế trong tab này quay về kiểu cũ.
const SRV_DEFAULT = true; /* true = phòng online mặc định do máy chủ giữ ván */
export const srvMode = () => { try { const q = new URLSearchParams(location.search).get('srv'); if (q !== null) localStorage.setItem('gumballz-srv-scribble', q === '0' ? '0' : '1'); const v = localStorage.getItem('gumballz-srv-scribble'); return (v === null ? SRV_DEFAULT : v !== '0') && sessionStorage.getItem('gumballz-srv-off') !== '1'; } catch (e) { return false; } };
const rkey = () => Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
export class RemoteHost {
  constructor(name, handlers, code = null, ok = null) {
    this.h = watch(GAME, handlers, () => 'host'); this.isHost = true; this.remote = true; this.name = name; this.fresh = !code; this.restoring = !!code; this.everIn = false; this.game = GAME; this.n = 1; this.pub = false; this.dead = false;
    this.pubK = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    this.code = (code || makeCode()).toUpperCase(); this.ok = ok || rkey();
    this.room = new RoomClient({
      ns: NS, prefix: PREFIX, code: this.code, cfExtra: `srv=${GAME}&ok=${this.ok}`, joinMsg: () => ({ name: this.name }),
      onStatus: (t, k) => { this.h.onNet && this.h.onNet(t, k, () => this.room.retryNow()); },
      onFail: m => {
        if (this.restoring && !this.everIn) { session.save(GAME, { role: 'client', code: this.code, name: this.name }); location.reload(); return; } /* vắng lâu quá, quyền chủ phòng đã trao cho người khác: vào lại như khách */
        try { sessionStorage.setItem('gumballz-srv-off', '1'); } catch (e) {} this.h.onError('Chưa mở được phòng trên máy chủ – bấm tạo phòng lần nữa nha.'); session.clear(GAME); this.h.onFail && this.h.onFail(); },
      onWelcome: () => {
        session.save(GAME, { role: 'srv', code: this.code, ok: this.ok, name: this.name }); this.everIn = true;
        try { window.__gumballzHost = this; dispatchEvent(new CustomEvent('gumballz-host', { detail: this })); } catch (e) {} /* để shared/ui/homebtn.js gắn công tắc 🌐 Công khai phòng */
        if (this.fresh) { this.fresh = false; this.room.send({ t: 'cmd', m: 'setOpts', a: [cfgOpts()] }); } /* phòng mới: áp luật chọn sẵn của web (luat-mac-dinh.js) lên máy chủ */
      },
      onLost: () => this.h.onDisconnect && this.h.onDisconnect(),
      onMsg: msg => {
        if (!msg) return;
        if (msg.t === 'lobby') { this.n = ((msg.info && msg.info.players) || []).length || 1; this.h.onLobby(msg.info, msg.code, msg.started); }
        else if (msg.t === 'state') this.h.onState(msg.view);
        else if (msg.t === 'draw') this.h.onDraw(msg.ops, msg.cv);
        else if (msg.t === 'canvas') this.h.onCanvas(msg);
        else if (msg.t === 'book') this.h.onBook(msg);
        else if (msg.t === 'react') this.h.onReact && this.h.onReact(msg);
        else if (msg.t === 'tease') this.h.onTease && this.h.onTease(msg);
        else if (msg.t === 'error') this.h.onError(msg.msg);
      },
    });
    for (const m of ['setOpts', 'removePlayer', 'start', 'restart']) this[m] = (...a) => this.room.send({ t: 'cmd', m, a });
  }
  act(a) { this.room.send({ t: 'action', a }); }
  draw(ops) { this.room.send({ t: 'draw', ops }); }
  sync() { this.room.send({ t: 'sync' }); }
  needBook() { this.room.send({ t: 'needbook' }); }
  react(pid, e) { this.room.send({ t: 'react', e }); }
  tease(pid, text) { this.room.send({ t: 'tease', text }); }
  announce(open) { try { announceRoom({ game: GAME, code: this.code, k: this.pubK, host: this.name || 'Ai đó', n: this.n, open, lv: myLevel() }); } catch (e) {} }
  setPublic(on) { this.pub = !!on; clearInterval(this.pubT); if (this.pub) { this.announce(true); this.pubT = setInterval(() => { if (!this.dead) this.announce(true); }, 60000); } else this.announce(false); }
  destroy() { this.dead = true; clearInterval(this.pubT); if (this.pub) { this.pub = false; this.announce(false); } try { if (window.__gumballzHost === this) window.__gumballzHost = null; } catch (e) {} this.room.destroy(); }
  leave() { this.room.send({ t: 'close' }); setTimeout(() => this.destroy(), 150); session.clear(GAME); } /* người tạo phòng rời đi: máy chủ trao quyền cho người kế (không còn ai thì đóng phòng) */
}

export class Client {
  constructor(code, name, handlers) {
    this.h = watch(GAME, handlers, () => this.id); this.isHost = false; this.code = code.toUpperCase().trim(); this.name = name; this.id = null;
    this.joined = false; this.lastRx = Date.now();
    this.makeRoom();
    this.wd = setInterval(() => this.watch(), 2000);
  }
  makeRoom() {
    const tag = this.tag = {};
    this.room = new RoomClient({
      ns: NS, prefix: PREFIX, code: this.code, joinMsg: () => ({ name: this.name }),
      onStatus: (t, k) => { if (tag !== this.tag) return; this.h.onNet && this.h.onNet(t, k, () => this.room.retryNow()); },
      onFail: m => { if (tag !== this.tag) return; this.h.onError(m); session.clear(GAME); this.h.onFail && this.h.onFail(); },
      onWelcome: id => { if (tag !== this.tag) return; this.id = id; this.joined = true; this.lastRx = Date.now(); session.save(GAME, { role: 'client', code: this.code, name: this.name }); this.h.onJoined(id); },
      onOwn: m => { if (tag !== this.tag || !m || !m.ok) return; session.save(GAME, { role: 'srv', code: this.code, ok: String(m.ok), name: this.name }); try { this.room.destroy(); } catch (e) {} location.reload(); }, /* được trao quyền chủ phòng (phòng do máy chủ giữ): tải lại để vào ghế chủ */
      onLost: () => { if (tag !== this.tag) return; this.joined = false; this.h.onDisconnect && this.h.onDisconnect(); },
      onMsg: msg => {
        if (tag !== this.tag || !msg) return;
        this.lastRx = Date.now();
        if (msg.t === 'ping') { this.room.send({ t: 'pong' }); return; }
        if (msg.t === 'pong') return;
        if (msg.t === 'lobby') this.h.onLobby(msg.info, msg.code, msg.started);
        else if (msg.t === 'state') this.h.onState(msg.view);
        else if (msg.t === 'draw') this.h.onDraw(msg.ops, msg.cv);
        else if (msg.t === 'canvas') this.h.onCanvas(msg);
        else if (msg.t === 'book') this.h.onBook(msg);
        else if (msg.t === 'react') this.h.onReact && this.h.onReact(msg);
        else if (msg.t === 'tease') this.h.onTease && this.h.onTease(msg);
        else if (msg.t === 'error') this.h.onError(msg.msg);
        else if (msg.t === 'kicked') { this.h.onError('Bạn đã bị chủ phòng mời ra khỏi phòng.'); this.leave(); if (this.h.onKicked) this.h.onKicked(); else this.h.onFail && this.h.onFail(); }
      },
    });
  }
  watch() { if (!this.dead && this.joined && !window.__gumballzSrvRoom && Date.now() - this.lastRx > STALL_MS) this.reconnect(); } /* phòng máy chủ: không có nhịp tim, đường truyền tự ping */
  reconnect() {
    if (this.dead) return;
    this.joined = false; this.lastRx = Date.now();
    const old = this.room; this.makeRoom(); try { old.destroy(); } catch (e) {}
    this.h.onNet && this.h.onNet('Đang nối lại phòng…', 'wait', () => this.room.retryNow());
  }
  act(a) { this.room.send({ t: 'action', a }); }
  draw(ops) { this.room.send({ t: 'draw', ops }); }
  sync() { this.room.send({ t: 'sync' }); }
  needBook() { this.room.send({ t: 'needbook' }); }
  react(e) { this.room.send({ t: 'react', e }); }
  tease(text) { this.room.send({ t: 'tease', text }); }
  destroy() { this.dead = true; clearInterval(this.wd); this.room.destroy(); }
  leave() { this.destroy(); session.clear(GAME); }
}
