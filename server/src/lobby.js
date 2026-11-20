// Sảnh chung GumballZ: danh sách phòng công khai + chat theo kênh (all / từng game) + báo cáo + cấm chat.
// 1 Durable Object duy nhất ("main"), WebSocket kiểu ngủ đông (hibernation) để đỡ tốn thời gian chạy.
import { DurableObject } from 'cloudflare:workers';
import { clean, cleanName } from './filter.js';
import { Meter, LIMITS, GB } from './meter.js';

const GAMES = ['bang', 'uno', 'typhu', 'tamquoc', 'meono', 'masoi', 'scribble', 'tienlen', 'poker', 'xidach', 'catte', 'bacao', 'cangua', 'camel', 'cotuong', 'thathaythach', 'bantau', 'baitan', 'loto', 'covua', 'tala', 'cholon', 'tusac', 'oanquan', 'caro', 'tictactoe', 'memory', 'covay', 'cothu', 'ranvathang', 'sam', 'baucua', 'noitu', 'xuyenviet', 'khaihoang', 'daochinh', 'cuuho', 'xiecthu', 'giandiep', 'codam', 'lieng', 'maubinh', 'xito', 'colat', 'domino', 'connect4', 'matthu', 'avalon', 'spyfall', 'sudoku', 'wordle', 'domi', 's2048', 'matchu', 'loveletter', 'sushigo', 'lay6', 'saboteur', 'skull', 'hanabi', 'chan', 'totom', 'carcassonne', 'azul', 'splendor', 'conhay', 'backgammon', 'rummikub', 'quoridor', 'blokus', 'scrabble', 'mastermind', 'ailatrieuphu', 'haithat1gia', 'doanhdong', 'wavelength', 'resistance', 'vetruyentin', 'tetris', 'ransanmoi', 'xepkeo'];
const DUO = new Set(['cotuong', 'covua', 'oanquan', 'caro', 'tictactoe', 'memory', 'covay', 'cothu', 'ranvathang', 'codam', 'colat', 'connect4']); /* game đúng 2 người */
const LV = v => Math.max(0, Math.min(10, Math.floor(+v || 0))); /* cấp độ 1–10 (0 = chưa rõ) */
const gap = (a, b) => (a && b ? Math.abs(a - b) : 3); /* chưa rõ trình thì coi như lệch vừa */
const CHANNELS = new Set(['all', ...GAMES]);
const ROOM_TTL = 150e3, HIST = 60, MSG_MAX = 300, SLOW = 1500, MAX_SOCKS = 2000;
const now = () => Date.now();

export class Lobby extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env); this.sql = ctx.storage.sql;
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    this.sql.exec(`CREATE TABLE IF NOT EXISTS rooms (key TEXT PRIMARY KEY, game TEXT, code TEXT, host TEXT, n INTEGER, k TEXT, upd INTEGER, created INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS chat (id INTEGER PRIMARY KEY AUTOINCREMENT, ch TEXT, ts INTEGER, who TEXT, ipk TEXT, name TEXT, v INTEGER, text TEXT, hidden INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS bans (who TEXT PRIMARY KEY, until INTEGER, reason TEXT, by TEXT, ts INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, msg INTEGER, target TEXT, tname TEXT, text TEXT, reason TEXT, reporter TEXT, rname TEXT, done INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS usage10 (b INTEGER PRIMARY KEY, ms INTEGER, req INTEGER)`); // ước tính hạn mức theo khối 10 phút
    this.sql.exec(`CREATE TABLE IF NOT EXISTS live (id TEXT PRIMARY KEY, upd INTEGER, n INTEGER)`); // phòng đang có người
    this.sql.exec(`CREATE TABLE IF NOT EXISTS rg (id TEXT PRIMARY KEY, g TEXT, upd INTEGER, n INTEGER DEFAULT 0)`);
    try { this.sql.exec('ALTER TABLE rg ADD COLUMN n INTEGER DEFAULT 0'); } catch (e) {} // id Durable Object phòng → game (để trang Quản trị biết game nào tốn thời gian chạy)
    this.sql.exec(`CREATE TABLE IF NOT EXISTS stat (k TEXT PRIMARY KEY, v INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS nt (w TEXT PRIMARY KEY, st TEXT, n INTEGER, yes INTEGER, no INTEGER, ts INTEGER, why TEXT)`); /* Nối từ: từ người chơi bỏ phiếu nhận. st: pend (chờ kiểm) · ok (có thật, vào kho) · bad (không có) */
    try { this.sql.exec("ALTER TABLE live ADD COLUMN g TEXT DEFAULT ''"); } catch (e) {} // game của phòng
    try { this.sql.exec('ALTER TABLE rooms ADD COLUMN lv INTEGER DEFAULT 0'); } catch (e) {} // cấp độ chủ phòng (ghép trận theo trình)
    try { this.sql.exec("ALTER TABLE chat ADD COLUMN kind TEXT DEFAULT ''"); } catch (e) {} // loại tin: 'invite' = lời mời phòng lên kênh thế giới
    try { this.sql.exec("ALTER TABLE chat ADD COLUMN game TEXT DEFAULT ''"); } catch (e) {} // game của lời mời
    try { this.sql.exec("ALTER TABLE chat ADD COLUMN code TEXT DEFAULT ''"); } catch (e) {} // mã phòng của lời mời
    this.inviteLast = new Map(); // phòng (game/code) → lúc mời gần nhất (chống spam mời, 60 giây/lần)
    if (!this.sql.exec("SELECT v FROM stat WHERE k = 'live-v'").toArray().length) { this.sql.exec('DELETE FROM live'); this.sql.exec("INSERT INTO stat (k, v) VALUES ('live-v', 2)"); } // bỏ số cũ (kiểu đếm trước)
    if (!this.sql.exec("SELECT v FROM stat WHERE k = 'meter-v'").toArray().length) { this.sql.exec('UPDATE usage10 SET ms = ms / 10'); this.sql.exec("INSERT INTO stat (k, v) VALUES ('meter-v', 2)"); } // bản đo cũ đếm dư ~10 lần → chia lại số cũ cho khớp số thật trên Cloudflare
    this.last = new Map(); // ai → lúc gửi tin gần nhất (chống spam)
    this.rl = new Map(); this.roomHits = new Map(); // nhịp tin theo từng kết nối · lượt báo phòng theo IP
    try { this.sql.exec("ALTER TABLE reports ADD COLUMN rip TEXT DEFAULT ''"); } catch (e) {} // dấu IP người báo cáo (đếm "3 người khác nhau" theo IP, không theo mã khách tự đặt)
    this.m = new Meter((ms, req) => this.addUsage(ms, req));
  }
  // ---------- tiền API Claude (đếm bền theo ngày UTC, đơn vị µUSD – server/src/ai.js tự dùng khi có 3 hàm này) ----------
  aiKey(bucket) { return `ai:${new Date().toISOString().slice(0, 10)}:${bucket}`; }
  aiSpent(bucket) { const r = this.sql.exec('SELECT v FROM stat WHERE k = ?', this.aiKey(bucket)).toArray(); return r.length ? r[0].v : 0; }
  aiAdd(bucket, micro) { this.sql.exec('INSERT INTO stat (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = MAX(0, v + excluded.v)', this.aiKey(bucket), Math.round(micro)); }
  /* được gọi không? còn tiền trong trần ngày + chưa quá nhịp theo từng khoá (mỗi giờ). Được thì giữ chỗ trước `reserve` µUSD. */
  async aiGate(bucket, capMicro, reserve, limits = []) {
    if (this.aiSpent(bucket) + reserve > capMicro) return { ok: false, why: 'cap' };
    const now = Date.now(); this.aiRl = this.aiRl || new Map(); if (this.aiRl.size > 5000) this.aiRl.clear();
    for (const [k, max] of limits) { const a = (this.aiRl.get(k) || []).filter(t => now - t < 3600e3); if (a.length >= max) return { ok: false, why: 'rate' }; this.aiRl.set(k, a); }
    for (const [k] of limits) this.aiRl.get(k).push(now);
    this.aiAdd(bucket, reserve); return { ok: true };
  }
  async aiSettle(bucket, deltaMicro) { if (deltaMicro) this.aiAdd(bucket, deltaMicro); }
  async aiStatus() { return { bot: this.aiSpent('bot') / 1e6, misc: this.aiSpent('misc') / 1e6, dict: this.aiSpent('dict') / 1e6, dictweb: this.aiSpent('dictweb') / 1e6 }; }
  // ---------- hạn mức (ước tính) ----------
  async live(room, n, g = '') { // phòng báo số người khi có người vào/ra
    await this.m.tick('req');
    const rgM = this.rgMax ||= new Map(), was = rgM.get(room);
    if (g && (was === undefined || n > was)) { /* nhớ game + số người cao nhất của phòng (chỉ ghi khi tăng) */
      this.rgMax.set(room, +n || 0); if (this.rgMax.size > 5000) this.rgMax.clear();
      if (g) this.sql.exec('INSERT INTO rg (id, g, upd, n) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET n = MAX(n, excluded.n)', String(room), String(g).slice(0, 12), now(), +n || 0);
      if (Math.random() < .02) this.sql.exec('DELETE FROM rg WHERE upd < ?', now() - 4 * 864e5); }
    if (n > 0) this.sql.exec('INSERT OR REPLACE INTO live (id, upd, n, g) VALUES (?,?,?,?)', String(room), now(), +n, String(g || '').slice(0, 12)); else this.sql.exec('DELETE FROM live WHERE id = ?', String(room));
    this.bumpOnline();
  }
  async roomGames(ids) { const out = {}; for (const id of (ids || []).slice(0, 400)) { const r = this.sql.exec('SELECT g, n FROM rg WHERE id = ?', String(id)).toArray(); if (r.length) out[id] = { g: r[0].g, n: r[0].n || 0 }; } return out; }
  liveNow() {
    const rows = this.sql.exec('SELECT g, COUNT(*) AS rooms, COALESCE(SUM(n),0) AS players FROM live WHERE upd > ? GROUP BY g', now() - 4 * 3600e3).toArray();
    const games = {}; let rooms = 0, players = 0;
    for (const r of rows) { rooms += r.rooms; players += r.players; if (r.g) games[r.g] = r.players; }
    return { rooms, players, games };
  }
  addUsage(ms, req, room, n) {
    const b = Math.floor(now() / 600e3);
    this.sql.exec('INSERT INTO usage10 (b, ms, req) VALUES (?,?,?) ON CONFLICT(b) DO UPDATE SET ms = ms + excluded.ms, req = req + excluded.req', b, Math.round(ms), Math.round(req));
    if (b % 36 === 0) { this.sql.exec('DELETE FROM usage10 WHERE b < ?', b - 6 * 24 * 40); this.sql.exec('DELETE FROM live WHERE upd < ?', now() - 8 * 3600e3); }
  }
  async usage(ms, req, room, n) { await this.m.tick('req'); this.addUsage(ms, req, room, n); }
  status(plan, full = false) {
    const P = LIMITS[plan === 'paid' ? 'paid' : 'free'], t = now(), d = new Date(t);
    const start = P.per === 'day' ? Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) : Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    const resetAt = P.per === 'day' ? start + 864e5 : Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    const sum = (a, b) => this.sql.exec('SELECT COALESCE(SUM(ms),0) AS ms, COALESCE(SUM(req),0) AS req FROM usage10 WHERE b >= ? AND b < ?', Math.floor(a / 600e3), Math.ceil(b / 600e3)).one();
    // tính cả phần đang đo dở của chính Sảnh
    const u = sum(start, t + 600e3), gbs = u.ms / 1000 * GB, req = u.req;
    const pct = Math.round(Math.max(gbs / P.gbs, req / P.req) * 1000) / 10;
    const level = plan === 'paid' ? 'ok' : pct >= 100 ? 'full' : pct >= 85 ? 'warn' : 'ok'; /* gói trả phí: quá hạn mức chỉ tính thêm tiền, không bị chặn → không báo người chơi */
    const out = { plan: plan === 'paid' ? 'paid' : 'free', pct, level, resetAt };
    if (!full) return out;
    const r = sum(t - 30 * 60e3, t + 600e3), rate = r.ms / 1000 * GB * 2; // GB-s mỗi giờ (theo 30 phút gần nhất)
    const left = P.gbs - gbs, eta = rate > 0 && left > 0 && t + left / rate * 3600e3 < resetAt ? t + left / rate * 3600e3 : null;
    const live = this.liveNow();
    const days = [];
    for (let i = 6; i >= 0; i--) { const a = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - i), x = sum(a, a + 864e5); days.push({ day: a, gbs: Math.round(x.ms / 1000 * GB), req: x.req }); }
    // 24 giờ gần nhất theo từng giờ (để xem khung giờ nào đông)
    const h0 = Math.floor(t / 3600e3) - 23, byH = new Map(this.sql.exec('SELECT b / 6 AS h, SUM(ms) AS ms, SUM(req) AS req FROM usage10 WHERE b >= ? GROUP BY b / 6', h0 * 6).toArray().map(x => [Number(x.h), x]));
    const hours = []; for (let h = h0; h < h0 + 24; h++) { const x = byH.get(h); hours.push({ h: h * 3600e3, gbs: Math.round((x ? x.ms : 0) / 1000 * GB), req: x ? x.req : 0 }); }
    const peak = this.sql.exec('SELECT v FROM stat WHERE k = ?', 'peak:' + new Date(t).toISOString().slice(0, 10) /* đỉnh của HÔM NAY (trước đây lấy nhầm ngày đầu kỳ nên gói tháng luôn ra 0) */).toArray()[0]?.v || 0;
    return { ...out, per: P.per, gbs: Math.round(gbs), req, limGbs: P.gbs, limReq: P.req, rate: Math.round(rate), eta, roomHoursLeft: Math.max(0, Math.round(left / GB / 3600 * 10) / 10),
      roomsLive: live.rooms, playersLive: live.players, online: this.online(), peak, days, hours };
  }
  // ---------- phòng công khai ----------
  rooms() {
    this.sql.exec('DELETE FROM rooms WHERE upd < ?', now() - ROOM_TTL);
    return this.sql.exec('SELECT game, code, host, n, created, lv FROM rooms ORDER BY created DESC LIMIT 200').toArray();
  }
  /* nhập mã phòng ở trang chủ: tìm xem mã thuộc game nào (ids = { game: id Durable Object của phòng }) */
  findRoom(code, ids) {
    const pub = this.sql.exec('SELECT game FROM rooms WHERE code = ? AND upd > ?', String(code), now() - ROOM_TTL).toArray()[0];
    if (pub) return { ok: true, game: pub.game };
    for (const g in ids) { const r = this.sql.exec('SELECT n FROM live WHERE id = ? AND upd > ?', String(ids[g]), now() - 4 * 3600e3).toArray()[0]; if (r && r.n > 0) return { ok: true, game: g }; }
    return { ok: false };
  }
  async putRoom(d, ip = '') {
    if (d && d.open) { /* chống bơm phòng giả: mỗi IP tối đa 40 lượt báo mở phòng / phút (phòng thật báo 1 lượt/phút); báo đóng phòng thì luôn nhận */
      const t = now(), h = (this.roomHits.get(ip) || []).filter(x => t - x < 60e3);
      if (h.length >= 40) return { ok: false, msg: 'slow' };
      h.push(t); this.roomHits.set(ip, h);
      if (this.roomHits.size > 5000) this.roomHits.clear();
    }
    const game = String(d.game || ''), code = String(d.code || ''), k = String(d.k || '').slice(0, 40);
    if (!GAMES.includes(game) || !/^[A-Z0-9]{5}$/.test(code) || k.length < 10) return { ok: false };
    const key = game + '/' + code;
    const old = this.sql.exec('SELECT k FROM rooms WHERE key = ?', key).toArray()[0];
    if (old && old.k !== k) return { ok: false, msg: 'taken' };
    if (!d.open) { if (old) { this.sql.exec('DELETE FROM rooms WHERE key = ?', key); this.pushRooms(); } return { ok: true }; }
    if (!old && this.sql.exec('SELECT COUNT(*) AS n FROM rooms WHERE upd >= ?', now() - ROOM_TTL).one().n >= 300) return { ok: false, msg: 'full' };
    const host = cleanName(d.host) || 'Ai đó', n = Math.max(1, Math.min(30, +d.n || 1)), lv = LV(d.lv);
    const changed = !old || true;
    if (old) this.sql.exec('UPDATE rooms SET host = ?, n = ?, upd = ?, lv = ? WHERE key = ?', host, n, now(), lv, key);
    else this.sql.exec('INSERT INTO rooms (key, game, code, host, n, k, upd, created, lv) VALUES (?,?,?,?,?,?,?,?,?)', key, game, code, host, n, k, now(), now(), lv);
    if (changed) this.pushRooms(!old);
    this.matchWaiters({ game, code, host, n, lv });
    return { ok: true };
  }
  pushRooms(force = true) {
    const list = this.rooms(), sig = JSON.stringify(list.map(r => [r.game, r.code, r.host, r.n, r.lv]));
    if (!force && sig === this.sig) return; this.sig = sig;
    const m = JSON.stringify({ t: 'rooms', list });
    for (const ws of this.ctx.getWebSockets()) try { ws.send(m); } catch (e) {}
  }
  // ---------- tìm trận nhanh (matchmaking) ----------
  mmStat() {
    const t = now(), byGame = {}; let n = 0;
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment() || {};
      if (!a.mm || t - a.mm.ts > 120000) continue;
      n++; byGame[a.mm.game] = (byGame[a.mm.game] || 0) + 1;
    }
    return { n, byGame };
  }
  pushMm() {
    const st = this.mmStat(), m = JSON.stringify({ t: 'mm_stat', ...st });
    for (const ws of this.ctx.getWebSockets()) { const a = ws.deserializeAttachment() || {}; if (!a.p) try { ws.send(m); } catch (e) {} }
  }
  matchWaiters(room) {
    const t = now(); let hit = false;
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment() || {};
      if (!a.mm || t - a.mm.ts > 120000) continue;
      if (a.mm.game === room.game || a.mm.game === 'all') {
        ws.serializeAttachment({ ...a, mm: null }); hit = true;
        try { ws.send(JSON.stringify({ t: 'mm_found', game: room.game, code: room.code, host: room.host, n: room.n })); } catch (e) {}
      }
    }
    if (hit) this.pushMm();
  }
  tryPairMm() {
    const t = now(), waiters = [];
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment() || {};
      if (a.mm && t - a.mm.ts <= 120000) waiters.push({ ws, a });
    }
    if (waiters.length < 2) return;
    waiters.sort((x, y) => x.a.mm.ts - y.a.mm.ts);
    const used = new Set();
    for (let i = 0; i < waiters.length; i++) {
      const first = waiters[i]; if (used.has(first.ws)) continue;
      const grp = [first];
      let targetGame = first.a.mm.game !== 'all' ? first.a.mm.game : null;
      for (let j = i + 1; j < waiters.length; j++) {
        const w = waiters[j]; if (used.has(w.ws)) continue;
        const g = w.a.mm.game;
        if (!targetGame) { grp.push(w); if (g !== 'all') targetGame = g; }
        else if (g === targetGame || g === 'all') grp.push(w);
      }
      if (grp.length < 2) continue;
      if (DUO.has(targetGame) && grp.length > 2) { /* game 2 người: chỉ ghép với người gần trình nhất, số còn lại chờ lượt sau */
        const rest = grp.slice(1).sort((x, y) => gap(x.a.mm.lv, first.a.mm.lv) - gap(y.a.mm.lv, first.a.mm.lv) || x.a.mm.ts - y.a.mm.ts);
        grp.length = 1; grp.push(rest[0]);
      }
      if (!targetGame) targetGame = ['uno', 'tienlen', 'meono', 'scribble', 'masoi'][Math.floor(t / 10000) % 5];
      grp.forEach(w => used.add(w.ws));
      const hosting = grp.find(w => w.a.mm.hostAt && t - w.a.mm.hostAt < 8000);
      const hostW = hosting || grp[0];
      if (!hosting) {
        const ha = { ...hostW.a, mm: null };
        hostW.ws.serializeAttachment(ha);
        try { hostW.ws.send(JSON.stringify({ t: 'mm_host', game: targetGame })); } catch (e) {}
      }
      for (const w of grp) {
        if (w === hostW) continue;
        const wa = { ...w.a, mm: { ...w.a.mm, game: targetGame, hostAt: t } };
        w.ws.serializeAttachment(wa);
        try { w.ws.send(JSON.stringify({ t: 'mm_pairing', game: targetGame, host: hostW.a.name || 'Kỳ thủ' })); } catch (e) {}
      }
    }
    this.pushMm();
  }
  // ---------- kết nối ----------
  // ---------- số người đang online (mọi trang GumballZ mở 1 WebSocket "presence") ----------
  online() { return this.ctx.getWebSockets('p').length; } // chỉ đếm kết nối presence (trang nào cũng có đúng 1)
  bumpOnline() { // gom thay đổi, tối đa 1 lần / 15 giây để đỡ tốn (mỗi lần hẹn giờ = 1 lượt ghi + 1 lượt gọi tính vào hạn mức)
    if (this.pending) return; this.pending = true;
    const due = Math.max(0, (this.lastPush || 0) + 15000 - now()); /* mỗi lần hẹn giờ = 1 lượt gọi tính vào hạn mức */
    this.ctx.storage.setAlarm(now() + due + 50);
  }
  async alarm() {
    this.pending = false; this.lastPush = now(); await this.m.tick('req');
    const n0 = this.online(), pk = 'peak:' + new Date().toISOString().slice(0, 10);
    if (this.peakK !== pk || n0 > this.peakV) { /* chỉ ghi khi lập đỉnh mới: gói Free giới hạn 100.000 dòng ghi/ngày, trước đây chỗ này ghi mỗi 4 giây */
      this.sql.exec('INSERT INTO stat (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = MAX(v, excluded.v)', pk, n0);
      this.peakK = pk; this.peakV = Math.max(n0, this.sql.exec('SELECT v FROM stat WHERE k = ?', pk).one().v);
    }
    const lv = this.liveNow(), m = JSON.stringify({ t: 'online', n: n0, rooms: lv.rooms, players: lv.players, games: lv.games });
    for (const ws of this.ctx.getWebSockets()) try { ws.send(m); } catch (e) {}
  }
  async fetch(req) {
    await this.m.tick('req');
    if (this.ctx.getWebSockets().length >= MAX_SOCKS) return new Response('Sảnh đông quá', { status: 503 });
    if (new URL(req.url).pathname.endsWith('/presence')) {
      const pair = new WebSocketPair(), [cli, srv] = Object.values(pair);
      this.ctx.acceptWebSocket(srv, ['p']); srv.serializeAttachment({ p: 1 });
      const lv = this.liveNow(); srv.send(JSON.stringify({ t: 'online', n: this.online(), rooms: lv.rooms, players: lv.players, games: lv.games })); this.bumpOnline();
      return new Response(null, { status: 101, webSocket: cli });
    }
    const ip = req.headers.get('CF-Connecting-IP') || '';
    const ipk = (await sha(ip + '|gumballz')).slice(0, 16);
    const pair = new WebSocketPair(), [cli, srv] = Object.values(pair);
    this.ctx.acceptWebSocket(srv); srv.serializeAttachment({ ipk, who: null, name: 'Khách', v: 0, chs: ['all'] }); this.bumpOnline();
    return new Response(null, { status: 101, webSocket: cli });
  }
  hist(ch) { return this.sql.exec('SELECT id, ch, ts, who, name, v, text, kind, game, code FROM chat WHERE ch = ? AND hidden = 0 ORDER BY id DESC LIMIT ?', ch, HIST).toArray().reverse().map(pubMsg); }
  banned(who, ipk) {
    const r = this.sql.exec('SELECT who, until, reason FROM bans WHERE (who = ? OR who = ?) AND until > ?', who || '-', 'ip:' + ipk, now()).toArray();
    return r[0] || null;
  }
  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 2000) return;
    { /* giới hạn nhịp theo kết nối: quá 25 tin / 5 giây thì bỏ qua, quá 120 thì cắt (mỗi tin tìm trận / hello đều bắt Sảnh làm việc cho mọi người) */
      const t = now(), r = this.rl.get(ws) || { t, n: 0 };
      if (t - r.t > 5000) { r.t = t; r.n = 0; }
      r.n++; this.rl.set(ws, r);
      if (r.n > 120) { try { ws.close(4008, 'too much'); } catch (e) {} return; }
      if (r.n > 25) return;
    }
    await this.m.tick('msg');
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    const a = ws.deserializeAttachment() || {};
    const send = o => { try { ws.send(JSON.stringify(o)); } catch (e) {} };
    if (m.t === 'hello') {
      let who = null, name = cleanName(m.name) || 'Khách', v = 0, admin = 0;
      if (m.token) { const u = await this.env.USERS.get(this.env.USERS.idFromName('main')).whoami(String(m.token)); if (u && !u.banned) { who = 'u:' + u.id; name = u.name; v = 1; admin = u.admin ? 1 : 0; } }
      if (!who) { const g = String(m.guest || '').replace(/[^a-z0-9]/g, '').slice(0, 24); who = a.g0 || (g.length >= 8 ? 'g:' + g : 'g:' + a.ipk); } /* một kết nối chỉ có MỘT mã khách: không đổi mã liên tục để lách chống spam / lệnh cấm */
      if (name.includes('*')) name = 'Khách';
      const chs = (Array.isArray(m.chs) ? m.chs : ['all']).filter(c => CHANNELS.has(c)).slice(0, 3);
      if (!chs.length) chs.push('all');
      ws.serializeAttachment({ ...a, who, name, v, chs, admin, g0: a.g0 || (who.startsWith('g:') ? who : undefined) });
      send({ t: 'me', name, v, admin: !!admin, who: who.startsWith('u:') ? who : who.slice(0, 9) });
      send({ t: 'online', n: this.online() });
      send({ t: 'rooms', list: this.rooms() });
      send({ t: 'mm_stat', ...this.mmStat() });
      for (const ch of chs) send({ t: 'hist', ch, msgs: this.hist(ch) });
      const b = this.banned(who, a.ipk); if (b) send({ t: 'banned', until: b.until, reason: b.reason });
      return;
    }
    if (a.p) return; // kết nối đếm online: không nhận lệnh
    if (!a.who) return;
    if (m.t === 'chat') {
      const ch = String(m.ch || 'all'); if (!a.chs.includes(ch)) return;
      const b = this.banned(a.who, a.ipk); if (b) { send({ t: 'err', msg: `Bạn đang bị cấm chat đến ${new Date(b.until).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}` }); return; }
      const t0 = Math.max(this.last.get(a.who) || 0, a.v ? 0 : (this.last.get('ip:' + a.ipk) || 0)); /* khách: tính nhịp theo cả IP */ if (now() - t0 < SLOW) { send({ t: 'err', msg: 'Từ từ thôi nè 😅' }); return; }
      let text = String(m.text || '').slice(0, MSG_MAX); const c = clean(text); text = c.text;
      if (!text.trim()) return;
      this.last.set(a.who, now()); if (!a.v) this.last.set('ip:' + a.ipk, now()); if (this.last.size > 20000) this.last.clear();
      this.sql.exec('INSERT INTO chat (ch, ts, who, ipk, name, v, text) VALUES (?,?,?,?,?,?,?)', ch, now(), a.who, a.ipk, a.name, a.v, text);
      const id = this.sql.exec('SELECT last_insert_rowid() AS id').one().id;
      if (id % 200 === 0) this.sql.exec('DELETE FROM chat WHERE id IN (SELECT id FROM chat c WHERE (SELECT COUNT(*) FROM chat c2 WHERE c2.ch = c.ch AND c2.id > c.id) > 500)');
      const msg = JSON.stringify({ t: 'msg', m: pubMsg({ id, ch, ts: now(), who: a.who, name: a.name, v: a.v, text }) });
      for (const w of this.ctx.getWebSockets()) { const x = w.deserializeAttachment() || {}; if (x.chs && x.chs.includes(ch)) try { w.send(msg); } catch (e) {} }
      return;
    }
    if (m.t === 'invite') { // 📣 chủ phòng công khai mời cả kênh thế giới vào phòng mình
      const game = String(m.game || ''), code = String(m.code || '').toUpperCase(), k = String(m.k || '').slice(0, 40);
      if (!GAMES.includes(game) || !/^[A-Z0-9]{5}$/.test(code)) { send({ t: 'err', msg: 'Phòng không đúng — bật Công khai phòng rồi mời nhé.' }); return; }
      const b = this.banned(a.who, a.ipk); if (b) { send({ t: 'err', msg: `Bạn đang bị cấm chat đến ${new Date(b.until).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}` }); return; }
      const row = this.sql.exec('SELECT k FROM rooms WHERE key = ? AND upd > ?', game + '/' + code, now() - ROOM_TTL).toArray()[0];
      if (!row || row.k !== k) { send({ t: 'err', msg: 'Phòng chưa công khai hoặc mã không đúng — bật Công khai phòng rồi mời nhé.' }); return; }
      const t0 = Math.max(this.last.get(a.who) || 0, a.v ? 0 : (this.last.get('ip:' + a.ipk) || 0)); /* khách: tính nhịp theo cả IP */ if (now() - t0 < SLOW) { send({ t: 'err', msg: 'Từ từ thôi nè 😅' }); return; }
      const rk = game + '/' + code;
      if (now() - (this.inviteLast.get(rk) || 0) < 60000) { send({ t: 'err', msg: 'Mới mời rồi, đợi 60 giây rồi mời lại nhé.' }); return; }
      this.last.set(a.who, now()); if (!a.v) this.last.set('ip:' + a.ipk, now()); if (this.last.size > 20000) this.last.clear();
      this.inviteLast.set(rk, now()); if (this.inviteLast.size > 5000) this.inviteLast.clear();
      const text = `Mời chơi ${game} — phòng ${code} đang chờ người!`;
      this.sql.exec('INSERT INTO chat (ch, ts, who, ipk, name, v, text, kind, game, code) VALUES (?,?,?,?,?,?,?,?,?,?)', 'all', now(), a.who, a.ipk, a.name, a.v, text, 'invite', game, code);
      const id = this.sql.exec('SELECT last_insert_rowid() AS id').one().id;
      const msg = JSON.stringify({ t: 'msg', m: pubMsg({ id, ch: 'all', ts: now(), who: a.who, name: a.name, v: a.v, text, kind: 'invite', game, code }) });
      for (const w of this.ctx.getWebSockets()) { const x = w.deserializeAttachment() || {}; if (x.chs && x.chs.includes('all')) try { w.send(msg); } catch (e) {} }
      send({ t: 'ok', msg: 'Đã mời lên kênh thế giới 📣' });
      return;
    }
    if (m.t === 'report') {
      const row = this.sql.exec('SELECT * FROM chat WHERE id = ?', +m.id || 0).toArray()[0]; if (!row) return;
      if (row.who === a.who) return;
      const dup = this.sql.exec('SELECT id FROM reports WHERE msg = ? AND (reporter = ? OR rip = ?)', row.id, a.who, a.ipk).toArray()[0]; if (dup) { send({ t: 'ok', msg: 'Bạn đã báo cáo tin này rồi' }); return; }
      const recent = this.sql.exec('SELECT COUNT(*) AS n FROM reports WHERE (reporter = ? OR rip = ?) AND ts > ?', a.who, a.ipk, now() - 3600e3).one().n; if (recent >= 15) return;
      this.sql.exec('INSERT INTO reports (ts, msg, target, tname, text, reason, reporter, rname, rip) VALUES (?,?,?,?,?,?,?,?,?)', now(), row.id, row.who, row.name, row.text, String(m.reason || '').slice(0, 200), a.who, a.name, a.ipk);
      // 3 người khác nhau báo cáo cùng 1 tin → tự ẩn tin
      const n = this.sql.exec("SELECT COUNT(DISTINCT CASE WHEN rip = '' OR rip IS NULL THEN reporter ELSE rip END) AS n FROM reports WHERE msg = ?", row.id).one().n;
      if (n >= 3) this.hide(row.id);
      send({ t: 'ok', msg: 'Đã gửi báo cáo – cảm ơn bạn 💖' });
      return;
    }
    if (m.t === 'mod' && a.admin) { // công cụ quản trị ngay trong chat
      const row = this.sql.exec('SELECT * FROM chat WHERE id = ?', +m.id || 0).toArray()[0]; if (!row) return;
      if (m.op === 'hide') this.hide(row.id);
      else if (m.op === 'ban') { await this.admin('ban', { who: row.who, hours: Math.max(1, Math.min(87600, +m.hours || 24)), reason: String(m.reason || '').slice(0, 200) }); this.hide(row.id); }
      send({ t: 'ok', msg: m.op === 'ban' ? '⛔ Đã cấm chat ' + row.name : '🙈 Đã ẩn tin' });
      return;
    }
    if (m.t === 'join') { // đổi kênh (vd. vào sảnh của game khác)
      const chs = (Array.isArray(m.chs) ? m.chs : []).filter(c => CHANNELS.has(c)).slice(0, 3); if (!chs.length) return;
      ws.serializeAttachment({ ...a, chs }); for (const ch of chs) send({ t: 'hist', ch, msgs: this.hist(ch) });
      return;
    }
    if (m.t === 'mm_join') {
      const g = GAMES.includes(m.game) ? m.game : 'all';
      const lv = LV(m.lv); /* ghép theo trình: ưu tiên bàn có chủ phòng gần cấp độ mình nhất, rồi mới tới bàn đông */
      const open = this.rooms().filter(r => g === 'all' || r.game === g).sort((x, y) => gap(x.lv, lv) - gap(y.lv, lv) || y.n - x.n || y.created - x.created);
      if (open.length) {
        ws.serializeAttachment({ ...a, mm: null });
        const r = open[0];
        send({ t: 'mm_found', game: r.game, code: r.code, host: r.host, n: r.n });
        this.pushMm();
        return;
      }
      ws.serializeAttachment({ ...a, mm: { game: g, ts: now(), hostAt: 0, lv } });
      send({ t: 'mm_queued', game: g });
      this.pushMm();
      this.tryPairMm();
      return;
    }
    if (m.t === 'mm_cancel') {
      if (a.mm) { ws.serializeAttachment({ ...a, mm: null }); this.pushMm(); }
      return;
    }
  }
  async webSocketClose(ws, code) { this.rl.delete(ws); const a = ws.deserializeAttachment() || {}; try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch (e) {} if (a.mm) this.pushMm(); this.bumpOnline(); }
  async webSocketError() { this.bumpOnline(); }
  hide(id) {
    this.sql.exec('UPDATE chat SET hidden = 1 WHERE id = ?', id);
    const m = JSON.stringify({ t: 'del', id });
    for (const w of this.ctx.getWebSockets()) try { w.send(m); } catch (e) {}
  }
  // ---------- quản trị ----------
  // ---------- Nối từ: kho từ cộng đồng ----------
  /* ghi một từ vừa được cả bàn nhận; trả về trạng thái hiện tại (new = lần đầu thấy → cần kiểm) */
  async ntAdd(w, yes, no) { const r = this.sql.exec('SELECT st FROM nt WHERE w = ?', w).toArray();
    if (r.length) { this.sql.exec('UPDATE nt SET n = n + 1, yes = yes + ?, no = no + ? WHERE w = ?', yes, no, w); return { st: r[0].st, isNew: false }; }
    if (this.sql.exec("SELECT COUNT(*) AS c FROM nt WHERE st = 'pend'").one().c > 500) return { st: 'full', isNew: false }; /* chống ai đó bơm rác */
    this.sql.exec("INSERT INTO nt (w, st, n, yes, no, ts, why) VALUES (?, 'pend', 1, ?, ?, ?, '')", w, yes, no, Date.now()); return { st: 'pend', isNew: true }; }
  async ntSet(w, st, why = '') { this.sql.exec('UPDATE nt SET st = ?, why = ? WHERE w = ?', st, String(why).slice(0, 200), w); }
  async ntWords() { return this.sql.exec("SELECT w FROM nt WHERE st = 'ok'").toArray().map(r => r.w); }
  async ntList() { return this.sql.exec('SELECT w, st, n, yes, no, ts, why FROM nt ORDER BY ts DESC LIMIT 300').toArray(); }
  async ntDel(w) { this.sql.exec('DELETE FROM nt WHERE w = ?', w); }
  async admin(op, d = {}) {
    if (op === 'reports') return { reports: this.sql.exec('SELECT * FROM reports WHERE done = 0 ORDER BY id DESC LIMIT 200').toArray(), bans: this.sql.exec('SELECT * FROM bans WHERE until > ? ORDER BY ts DESC', now()).toArray() };
    if (op === 'hide') { this.hide(+d.msg); this.sql.exec('UPDATE reports SET done = 1 WHERE msg = ?', +d.msg); return { ok: true }; }
    if (op === 'dismiss') { this.sql.exec('UPDATE reports SET done = 1 WHERE id = ?', +d.id); return { ok: true }; }
    if (op === 'ban') {
      const hours = Math.max(1, Math.min(24 * 3650, +d.hours || 24)), who = String(d.who || '');
      if (!/^(u|g|ip):/.test(who)) return { ok: false };
      this.sql.exec('INSERT OR REPLACE INTO bans (who, until, reason, by, ts) VALUES (?,?,?,?,?)', who, now() + hours * 3600e3, String(d.reason || '').slice(0, 200), 'admin', now());
      // cấm luôn IP của người đó (khách đổi mã khách vẫn bị chặn)
      const ipk = this.sql.exec('SELECT ipk FROM chat WHERE who = ? ORDER BY id DESC LIMIT 1', who).toArray()[0]?.ipk;
      // IP nhà mạng VN hay dùng chung cho nhiều người (4G, NAT) → chỉ chặn IP tối đa 6 giờ để khỏi vạ lây
      if (ipk && d.ip !== false) this.sql.exec('INSERT OR REPLACE INTO bans (who, until, reason, by, ts) VALUES (?,?,?,?,?)', 'ip:' + ipk, now() + Math.min(hours, 6) * 3600e3, String(d.reason || '').slice(0, 200), 'admin', now());
      this.sql.exec('UPDATE chat SET hidden = 1 WHERE who = ? AND ts > ?', who, now() - 3600e3);
      this.sql.exec('UPDATE reports SET done = 1 WHERE target = ?', who);
      for (const w of this.ctx.getWebSockets()) try { w.send(JSON.stringify({ t: 'reload' })); } catch (e) {}
      return { ok: true };
    }
    if (op === 'unban') { this.sql.exec('DELETE FROM bans WHERE who = ?', String(d.who || '')); return { ok: true }; }
    if (op === 'stats') return { online: this.ctx.getWebSockets().length, rooms: this.rooms().length };
    return { ok: false };
  }
}
const pubMsg = r => { const o = { id: r.id, ch: r.ch, ts: r.ts, who: r.who.startsWith('u:') ? r.who : r.who.slice(0, 9), name: r.name, v: r.v, text: r.text }; if (r.kind) o.kind = r.kind; if (r.game) o.game = r.game; if (r.code) o.code = r.code; return o; };
async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
