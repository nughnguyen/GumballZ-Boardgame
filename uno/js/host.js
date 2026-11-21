// Lõi chủ phòng UNO – KHÔNG phụ thuộc trình duyệt: mọi thứ gắn với môi trường (kết nối, lưu trữ, thống kê, tốc độ hiệu ứng) được truyền vào qua `env`.
// Trình duyệt dùng qua net.js (makeHost với RoomHost thật + localStorage); sau này máy chủ (Durable Object) dùng lại đúng lớp này để giữ ván thay cho máy chủ phòng.
import { createGame, applyAction, viewFor, current, MODES, newMatch, recordRound, MATCH_TARGETS, CARD_NAME } from './engine.js?v=27';
import { titleById, myTitleId } from '../../shared/titles.js?v=5'; /* 🎖️ danh hiệu trưng ra (patch -97) */
import { botAction, botCatch } from './bot.js?v=27';
export const NS = 'gumballz-uno', PREFIX = 'gumballz-uno-', GAME = 'uno';
export const SNAP = 'gumballz-hostsnap-' + GAME;
const BOT_NAMES = ['Mochi', 'Pudding', 'Kem', 'Su Su', 'Tôm', 'Bắp', 'Mít', 'Na', 'Xoài'];
export const MAX = 10;
export const PULL_CD = 1000; // giãn cách giữa 2 lần tự bốc phạt
export const TURN_TIME = 40, OWE_TIME = 20; // giây: người thật treo máy quá lâu thì máy đánh thay
// Câu chọc riêng của UNO (bảng thả emoji – shared/ui/react.js)
export const UNO_PHRASES = ['Khoá mõm nè!', 'Ăn +4 đi cưng', 'Cứu tui', 'UNO nè!', 'Chơi kỳ vậy 😤', 'Gà quá!'];
const BOT_POOLS = { attack: ['Ăn +4 đi cưng', 'Khoá mõm nè!'], hurt: ['Cứu tui', 'Chơi kỳ vậy 😤'], win: ['Gà quá!'], reply: ['Gà quá!'], uno: ['UNO nè!'] };


// env: { RoomHost, token, session, watch, store: { set, del }, speed: () => hệ số tốc độ, isReact, hostLimiter, pickReact, CFG (luật mặc định đã gộp) }
export function makeHost(env) {
  const { RoomHost, token, session, watch, store, speed: S, isReact, hostLimiter, pickReact, CFG, remoteHost = false } = env; /* remoteHost: lõi chạy trên máy chủ, ghế 'host' cũng là một người ở xa (rớt mạng thì máy đánh thay như mọi người) */
  const modeRules = m => ({ ...CFG.modes[m] });
class Host {
  constructor(name, handlers, offline = false, restore = null) {
    this.h = watch(GAME, handlers, () => 'host'); this.offline = offline;
    this.players = [{ id: 'host', title: titleById(myTitleId()), name, isBot: false, token: token(), conn: null, connected: true }];
    this.state = null; this.conns = new Map(); this.botTimer = null; this.catchTimer = null;
    this.mode = CFG.mode; this.rules = modeRules(CFG.mode); this.ban = []; /* loại lá bị bỏ khỏi bộ bài */
    this.match = newMatch(CFG.match, CFG.matchTarget); // "Tính điểm tới 500": điểm từng người qua nhiều ván
    this.lim = hostLimiter(); this.botReactAt = 0;
    if (restore) {
      this.players = restore.players.map(p => ({ ...p, conn: null, connected: p.isBot || p.id === 'host' }));
      this.state = restore.state; this.code = restore.code; this.mode = restore.mode || this.mode; this.rules = restore.rules || this.rules; this.ban = Array.isArray(restore.ban) ? restore.ban : [];
      if (restore.match) this.match = restore.match;
    }
    if (offline) { this.code = 'OFFLINE'; setTimeout(() => { this.pushLobby(); if (this.state) { this.scheduleBots(); this.broadcast(); } }, 0); return; }
    this.room = new RoomHost({ ns: NS, prefix: PREFIX, code: this.code, keepCode: !!restore, host: this, onConn: c => this.attach(c), onReady: code => { this.code = code; session.save(GAME, { role: 'host', code }); this.pushLobby(); }, onError: m => this.h.onError(m) });
    this.code = this.room.code;
    setTimeout(() => { this.pushLobby(); if (this.state) { this.graceUntil = Date.now() + 4000; this.scheduleBots(); this.broadcast(); } }, 0);
  }
  saveSnap() {
    clearTimeout(this.snapT);
    this.snapT = setTimeout(() => { try { store.set(SNAP, JSON.stringify({ ts: Date.now(), code: this.code, offline: this.offline, ...this.snapData() })); } catch (e) {} }, 300);
  }
  snapData() { return { mode: this.mode, rules: this.rules, ban: this.ban, match: this.match, players: this.players.map(({ conn, ...p }) => p), state: this.state }; }
  attach(conn) {
    conn.on('data', msg => this.onMsg(conn, msg));
    conn.on('close', () => this.onLeave(conn));
    conn.on('error', () => this.onLeave(conn));
  }
  onMsg(conn, msg) {
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
      this.pushLobby(); this.broadcast(); this.scheduleBots();
    } else if (msg.t === 'title') { const p = this.conns.get(conn); if (p && p.conn === conn) { p.title = titleById(msg.title); this.pushLobby(); } /* 🎖️ đổi danh hiệu giữa phòng (P2P): chỉ nhận id có trong bảng */
    } else if (msg.t === 'action') {
      const p = this.conns.get(conn); if (p && this.inGame(p.id)) this.act(p.id, msg.a);
    } else if (msg.t === 'react') {
      const p = this.conns.get(conn); if (p) this.react(p.id, msg.e);
    }
  }
  onLeave(conn) {
    const p = this.conns.get(conn); if (!p) return;
    this.conns.delete(conn);
    if (p.conn !== conn) return; /* kết nối cũ đóng sau khi đã nối lại */
    p.conn = null; p.connected = false;
    if (!this.inGame(p.id)) this.players = this.players.filter(x => x !== p);
    this.pushLobby(); this.scheduleBots(); if (this.state) this.broadcast();
  }
  inGame(id) { return !this.state || this.state.players.some(q => q.id === id); } // người vào giữa ván: chỉ xem, ván sau mới chơi
  lobbyInfo() { return { players: this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, connected: p.connected, wait: !this.inGame(p.id), title: p.title || null })), mode: this.mode, rules: this.rules, ban: this.ban, match: this.match }; }
  pushLobby() {
    const info = this.lobbyInfo();
    this.h.onLobby(info, this.code, !!this.state); this.saveSnap();
    for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'lobby', info, code: this.code, started: !!this.state }); } catch (e) {}
  }
  setMode(mode) { if (this.state || !MODES[mode]) return; this.mode = mode; this.rules = modeRules(mode); this.pushLobby(); }
  setBan(type, on) { if (this.state || type === 'n' || !(type in CARD_NAME)) return; this.ban = this.ban.filter(t => t !== type); if (on) this.ban.push(type); this.pushLobby(); }
  setRule(k, v) { if (this.state || !(k in MODES.classic.rules)) return; this.rules[k] = !!v; this.pushLobby(); }
  // Tính điểm nhiều ván: đổi tuỳ chọn thì xoá bảng điểm cũ
  setMatch(on, target = this.match.target) { if (this.state) return; if (!MATCH_TARGETS.includes(+target)) target = CFG.matchTarget; this.match = newMatch(on, target); this.pushLobby(); }
  resetMatch() { if (this.state) return; this.match = newMatch(this.match.on, this.match.target); this.pushLobby(); }
  addBot() {
    if (this.state || this.players.length >= MAX) return;
    const used = this.players.map(p => p.name.replace(' 🤖', ''));
    const nm = BOT_NAMES.find(n => !used.includes(n)) || 'Bot' + this.players.length;
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
    if (this.match.champion) this.match = newMatch(this.match.on, this.match.target); // đã có vô địch: giải mới
    this.state = createGame(seated.map(p => ({ id: p.id, name: p.name, isBot: p.isBot })), this.mode, { ...this.rules, ban: this.ban });
    if (this.match.on) this.state.log[this.state.log.length - 1] = `Ván ${this.match.round + 1} (tính điểm tới ${this.match.target}). ` + this.state.log[this.state.log.length - 1];
    this.graceUntil = Date.now() + 3200 * S();
    this.pushLobby(); this.scheduleBots(); this.broadcast();
  }
  restart() { clearTimeout(this.botTimer); clearTimeout(this.catchTimer); this.state = null; this.pushLobby(); for (const p of this.players) if (p.conn) p.conn.send({ t: 'state', view: null }); this.h.onState(null); }
  act(pid, a) {
    if (!this.state) return;
    if (a && a.type === 'pull' && !(this.state.rules && this.state.rules.fastDraw)) { /* mỗi lần bốc cách nhau 1 giây – cho nó thấm 😈 */
      this.lastPull = this.lastPull || {}; const now = Date.now();
      if (now - (this.lastPull[pid] || 0) < PULL_CD - 60) return;
      this.lastPull[pid] = now;
    }
    const fxBefore = this.state.fxN || 0;
    const r = applyAction(this.state, pid, a);
    if (this.state.phase === 'ended' && recordRound(this.match, this.state)) this.pushLobby();
    if (r.ok) this.botReacts(fxBefore);
    if (!r.ok) { const p = this.players.find(x => x.id === pid); if (p && p.conn) p.conn.send({ t: 'error', msg: r.reason }); else if (pid === 'host') this.h.onError(r.reason); }
    /* action bị từ chối, hoặc chỉ là hô UNO, không đổi người đang được chờ: giữ nguyên đồng hồ – nếu không thì bấm UNO liên tục là câu giờ vô hạn và bot không bao giờ được đánh */
    if (!(this.timerLive && (!r.ok || (a && a.type === 'uno')))) this.scheduleBots();
    this.broadcast();
  }
  broadcast() {
    if (!this.state) return;
    this.saveSnap();
    for (const p of this.players) {
      const view = viewFor(this.state, p.id);
      if (this.deadline) view.timer = { pid: this.deadline.pid, ms: Math.max(0, this.deadline.end - Date.now()) };
      if (this.match.on) view.match = this.match;
      if (!this.inGame(p.id)) view.spec = true;
      if (p.id === 'host') this.h.onState(JSON.parse(JSON.stringify(view)));
      else if (p.conn) try { p.conn.send({ t: 'state', view }); } catch (e) {}
    }
  }
  tick(fn, ms) { this.timerLive = true; return setTimeout(() => { this.timerLive = false; fn(); }, ms); } /* timerLive: đang có hẹn giờ cho lượt hiện tại */
  scheduleBots() {
    clearTimeout(this.botTimer); this.timerLive = false; this.deadline = null;
    const s = this.state; if (!s || s.phase !== 'playing') return;
    // bot có thể bắt lỗi quên hô UNO – mỗi lần ai đó quên chỉ "tung xúc xắc" MỘT lần: ~50% có bot để ý, và chậm 2–4 giây để người chơi kịp bấm UNO
    const ck = s.unoWatch ? s.unoWatch + '|' + s.turnCount : null;
    if (ck && this.catchKey !== ck && !this.catchTimer) {
      this.catchKey = ck;
      const bots = this.players.filter(p => p.isBot && p.id !== s.unoWatch && !s.players.find(q => q.id === p.id).out);
      if (bots.length && Math.random() < 0.5) {
        const b = bots[Math.floor(Math.random() * bots.length)];
        this.catchTimer = setTimeout(() => { this.catchTimer = null; const a = this.state && botCatch(this.state, b.id); if (a) this.act(b.id, a); }, (2000 + Math.random() * 2000) * S());
      }
    }
    const pid = s.owe ? s.owe.player : s.pending ? s.pending.player : current(s).id;
    const p = this.players.find(x => x.id === pid); if (!p) return;
    if (this.autoOwe && !(s.owe && s.owe.player === this.autoOwe)) this.autoOwe = null;
    const auto = p.isBot || (!p.connected && (pid !== 'host' || remoteHost)) || this.autoOwe === pid;
    if (!auto) { // đồng hồ chống treo máy: hết giờ thì máy đánh thay (bốc phạt thì máy bốc hết phần còn lại)
      const ms = (s.owe ? OWE_TIME : TURN_TIME) * 1000;
      this.deadline = { pid, end: Date.now() + ms };
      this.botTimer = this.tick(() => {
        const st = this.state; if (!st || st.phase !== 'playing') return;
        if (st.owe && st.owe.player === pid) { this.autoOwe = pid; this.act(pid, { type: 'pull' }); return; }
        let a = botAction(st, pid);
        if (a && a.type === 'uno') { applyAction(st, pid, a); a = botAction(st, pid); if (a && a.type === 'uno') a = null; } /* hết giờ: hô UNO hộ rồi đánh luôn, không được chờ thêm một vòng 40 giây */
        if (a) this.act(pid, a); else this.scheduleBots();
      }, ms);
      return;
    }
    if (s.owe) { this.botTimer = this.tick(() => this.act(pid, { type: 'pull' }), Math.max(PULL_CD + 80, (this.graceUntil || 0) - Date.now())); return; }
    const human = this.players.some(x => !x.isBot);
    const base = s.unoWatch && human ? 2600 : 1000; // chừa thời gian cho người thật bắt lỗi
    this.botTimer = this.tick(() => {
      clearTimeout(this.catchTimer); this.catchTimer = null;
      const a = botAction(this.state, pid);
      if (a) this.act(pid, a);
    }, p.isBot ? Math.max(Math.round((base + Math.random() * 500) * S()), (this.graceUntil || 0) - Date.now()) : 20000);
  }
  // ---- thả emoji / chọc nhau: chủ phòng lọc rồi phát lại cho cả bàn ----
  react(from, e) {
    if (this.dead || !isReact(e, UNO_PHRASES) || !this.players.some(p => p.id === from) || !this.lim(from)) return false;
    const msg = { t: 'react', e, from };
    for (const p of this.players) if (p.conn) try { p.conn.send(msg); } catch (x) {}
    this.h.onReact && this.h.onReact(msg);
    // người thật chọc thì thỉnh thoảng có bot chọc lại
    const sender = this.players.find(p => p.id === from);
    if (sender && !sender.isBot && Math.random() < 0.3) this.botSay(null, 'reply', 900 + Math.random() * 900);
    return true;
  }
  // bot thả reaction (pid null: chọn ngẫu nhiên 1 bot); có giãn cách để không ồn
  botSay(pid, mood, delay = 1000) {
    const now = Date.now(); if (now < this.botReactAt) return;
    const bots = this.players.filter(p => p.isBot && (!pid || p.id === pid));
    if (!bots.length) return;
    this.botReactAt = now + 5000;
    const b = bots[Math.floor(Math.random() * bots.length)];
    setTimeout(() => { if (!this.dead && this.state) this.react(b.id, pickReact(mood, BOT_POOLS)); }, delay);
  }
  botReacts(fxBefore) {
    const s = this.state; if (!s) return;
    const isBot = id => (this.players.find(p => p.id === id) || {}).isBot;
    if (s.phase === 'ended') { if (isBot(s.winner) && Math.random() < 0.6) this.botSay(s.winner, 'win', 1600); return; }
    for (const e of (s.fx || []).filter(x => x.id > fxBefore)) {
      if (e.k === 'skip' && Math.random() < 0.6) continue; // lá thường thì ít chọc hơn
      if (isBot(e.to) && Math.random() < 0.35) this.botSay(e.to, 'hurt', 1300 + Math.random() * 700);
      else if (isBot(e.from) && Math.random() < 0.25) this.botSay(e.from, 'attack', 900 + Math.random() * 600);
    }
  }
  destroy() { this.dead = true; clearTimeout(this.botTimer); clearTimeout(this.catchTimer); clearTimeout(this.snapT); this.room && this.room.destroy(); }
  leave() { this.destroy(); store.del(SNAP); session.clear(GAME); }
}
  return Host;
}
