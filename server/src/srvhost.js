// 🖥️ "Máy chủ giữ ván": chạy lõi chủ phòng của game ngay trong Durable Object Room, thay cho máy của người tạo phòng.
// Nhờ vậy chủ phòng để tab ở nền, máy yếu hay rớt mạng thì ván vẫn chạy.
// Người chơi vẫn dùng RoomClient như cũ (join/welcome/lobby/state/action/react…); người tạo phòng vào bằng chìa `ok` và được gắn vào ghế 'host'.
// Hiện có: UNÔ + 14 game khung chung (Bài Tấn, Chợ Lớn, Lô Tô, Tá Lả, Thật Hay Thách, Tứ Sắc, Sâm Lốc, Bầu Cua, Nối Từ, Tàu Xuyên Việt, Đảo Khai Hoang, Đảo Chính, Đội Cứu Hộ, Gánh Xiếc Thú) – luật khai báo ở <game>/js/def.js
// + 13 game lõi riêng <game>/js/host.js: Scribble, Cờ Tỷ Phú, Mèo Nổ, CÀ ĐÙNG!, Tam Quốc Sát, Ma Sói, Tiến Lên, Poker, Cát Tê, Ba Cào, Cá Ngựa, Camel, Xì Dách.
// GHI CHÚ (18/11/2026): 2 phần này gộp trong file này – lõi khung chung (shared/net/simplehost.js)
// và server/src/vtimers.js (hẹn giờ ảo) – nhưng 2 file đó ngoài phạm vi port này nên được NHÚNG NGAY TRONG FILE NÀY
// (makeSimpleHost + đoạn "hẹn giờ ảo" bên dưới), giữ nguyên logic, chỉ đổi tiền tố cũ → gumballz-.
// Muốn tách lại thành file riêng thì chỉ việc cắt 2 đoạn đó ra và import lại, không đổi logic.
// Ma Sói AI: lời thoại bot gọi masoiLine (server/src/ai.js) – chưa đặt ANTHROPIC_API_KEY thì tự tắt, bot dùng câu có sẵn. Không có thoại (RTC/SFU) và không có vé VIP.
import { makeHost as unoHost } from '../../uno/js/host.js';
import { MODES } from '../../uno/js/engine.js';
import { makeHost as typhuHost, BASE_OPTS as TYPHU_OPTS, setData as typhuData } from '../../typhu/js/host.js';
import typhuTiles from '../../typhu/tiles.json';
import typhuCards from '../../typhu/cards.json';
typhuData(typhuTiles, typhuCards); /* trên web main.js tự tải hai file này; máy chủ thì đóng gói sẵn */
import { makeHost as meonoHost, DEFAULT_OPTS as MEONO_OPTS } from '../../meono/js/host.js';
import { makeHost as bangHost } from '../../bang/js/host.js';
import { makeHost as tamquocHost, BASE_CFG as TAMQUOC_CFG } from '../../tamquoc/js/host.js';
import { makeHost as masoiHost, DEFAULT_OPTS as MASOI_OPTS, isWolfRole as MASOI_WOLF } from '../../masoi/js/host.js';
import { makeHost as scribbleHost } from '../../scribble/js/host.js';
import { cleanOpts as scribbleOpts, DEFAULT_OPTS as SCRIBBLE_OPTS } from '../../scribble/js/engine.js';
import { makeHost as tienlenHost } from '../../tienlen/js/host.js';
import { DEFAULT_OPTS as TIENLEN_OPTS } from '../../tienlen/js/engine.js';
import { makeHost as pokerHost } from '../../poker/js/host.js';
import { DEFAULT_OPTS as POKER_OPTS } from '../../poker/js/engine.js';
import { makeHost as catteHost } from '../../catte/js/host.js';
import { DEFAULT_OPTS as CATTE_OPTS } from '../../catte/js/engine.js';
import { makeHost as bacaoHost } from '../../bacao/js/host.js';
import { DEFAULT_OPTS as BACAO_OPTS } from '../../bacao/js/engine.js';
import { makeHost as canguaHost, BASE_OPTS as CANGUA_OPTS } from '../../cangua/js/host.js';
import { makeHost as camelHost } from '../../camel/js/host.js';
import { DEFAULT_OPTS as CAMEL_OPTS } from '../../camel/js/engine.js';
import { makeHost as xidachHost } from '../../xidach/js/host.js';
import { DEFAULT_OPTS as XIDACH_OPTS } from '../../xidach/js/engine.js';
import { masoiLine } from './ai.js';
import { checkPass, checkIdPass } from './vip.js';
import { DEF as D_baitan } from '../../baitan/js/def.js';
import { DEF as D_cholon } from '../../cholon/js/def.js';
import { DEF as D_loto } from '../../loto/js/def.js';
import { DEF as D_tala } from '../../tala/js/def.js';
import { DEF as D_thathaythach } from '../../thathaythach/js/def.js';
import { DEF as D_tusac } from '../../tusac/js/def.js';
import { DEF as D_sam } from '../../sam/js/def.js';
import { DEF as D_baucua } from '../../baucua/js/def.js';
import { DEF as D_noitu } from '../../noitu/js/def.js';
import { DEF as D_xuyenviet } from '../../xuyenviet/js/def.js';
import { DEF as D_khaihoang } from '../../khaihoang/js/def.js';
import { DEF as D_daochinh } from '../../daochinh/js/def.js';
import { DEF as D_cuuho } from '../../cuuho/js/def.js';
import { DEF as D_xiecthu } from '../../xiecthu/js/def.js';
import { DEF as D_dovui } from '../../dovui/js/def.js';
import { DEF as D_hoisanquai } from '../../hoisanquai/js/def.js';
import { DEF as D_lansau } from '../../lansau/js/def.js';
import { DEF as D_vuatiengviet } from '../../vuatiengviet/js/def.js';
import { setDict as noituDict, addWords as noituAdd, norm as noituNorm } from '../../noitu/js/engine.js';
import noituW1 from '../../noitu/words.txt';
import noituW2 from '../../noitu/words-wikt.txt';
import noituW4 from '../../noitu/words-uts.txt'; /* từ điển mở underthesea (GPL-3.0) */
import noituW3 from '../../noitu/words-gumballz.txt'; /* từ riêng GumballZ: tên kỹ năng Tam Quốc Sát */
import { isReact, hostLimiter, pickReact } from '../../shared/ui/react.js';
import { clean } from './filter.js';
import { FIND_GAMES } from './index.js'; /* danh sách game hợp lệ của web (dùng chung với tìm phòng) — goto chỉ nhận game trong này, không hardcode list mới */

/* ============ ⏰ Hẹn giờ "ảo" (nhúng từ server/src/vtimers.js) ============
   Cloudflare tính tiền Durable Object suốt lúc còn hẹn giờ setTimeout đang chờ (phòng không được ngủ). Lõi game có hẹn giờ dài
   (đồng hồ lượt 20–60 giây, máy đi thay người vắng…) nên phòng thức suốt ván dù người chơi chỉ đang nghĩ.
   Cách làm: thay setTimeout chung của máy chủ. Hẹn giờ ≥ LONG ms tạo ra trong lúc đang chạy cho một phòng (CUR) không dùng
   setTimeout thật mà ghi vào phòng đó + đặt "báo thức" (alarm) của Durable Object → phòng được ngủ, tới giờ báo thức gọi lại.
   Lỡ phòng bị Cloudflare cất khỏi bộ nhớ (mất hàm hẹn giờ) thì lúc dậy lõi game được dựng lại từ ảnh chụp và hẹn giờ dài
   tạo lại được "kéo" về đúng hạn cũ (danh sách vtl lưu trong storage, ghép theo độ dài hẹn giờ) để đồng hồ lượt không bị kéo dài. */
export const LONG = 4000;
export const realSetTimeout = globalThis.setTimeout.bind(globalThis), realClearTimeout = globalThis.clearTimeout.bind(globalThis);
let CUR = null, VID = 1;
const OWNER = new Map(); /* mã hẹn giờ ảo → phòng */
export const cur = () => CUR;
/* chạy fn "trong" phòng r: hẹn giờ tạo ra trong lúc này thuộc về r */
export function within(r, fn) { const p = CUR; CUR = r; try { return fn(); } finally { CUR = p; } }
const wrap = (r, fn, args) => typeof fn !== 'function' ? fn : () => within(r, () => fn(...args));
globalThis.setTimeout = function (fn, ms, ...args) {
  const r = CUR; ms = +ms || 0;
  if (!r || !r.vtOn || ms < LONG || typeof fn !== 'function') return realSetTimeout(wrap(r, fn, args), ms);
  const id = 'v' + (VID++); OWNER.set(id, r); r.vtAdd(id, Date.now() + ms, () => fn(...args), ms); return id;
};
globalThis.clearTimeout = function (id) {
  if (typeof id === 'string' && id[0] === 'v') { const r = OWNER.get(id); OWNER.delete(id); if (r) r.vtDel(id); return; }
  return realClearTimeout(id);
};
export const forget = id => OWNER.delete(id);

/* ============ 🧩 Lõi chủ phòng của các game nhỏ (nhúng từ shared/net/simplehost.js) ============
   Dùng chung trình duyệt + máy chủ: shared/net/simplenet.js dựng với đồ của trình duyệt,
   server/src/srvhost.js dựng ngay trong Durable Object ("máy chủ giữ ván"). Không đụng tới window / localStorage – mọi thứ đi qua env.
     env: { RoomHost, token, session, watch, store: { set(k, v), del(k) }, remote } */
export const HB_MS = 2500, AWAY_MS = 8000;
export function makeSimpleHost(cfg, env) {
  const { RoomHost, token, session, watch, store, remote = false } = env;
  const GAME = cfg.game, NS = 'gumballz-' + GAME, PREFIX = NS + '-', SNAP = 'gumballz-hostsnap-' + GAME;
  const MAX = cfg.max || 8, MIN = cfg.min || 2;
  const BOT_NAMES = cfg.botNames || ['Kẹo', 'Xôi', 'Gấu Bông', 'Đậu', 'Nấm', 'Sữa', 'Mochi', 'Pudding'];
  class Host {
    constructor(name, handlers, offline = false, restore = null) {
      this.h = watch(GAME, handlers, () => 'host'); this.offline = offline;
      this.players = [{ id: 'host', name, isBot: false, token: token(), conn: null, connected: true }];
      this.state = null; this.conns = new Map(); this.timers = {}; this.opts = { ...(cfg.defaults || {}) };
      this.hs = Math.random().toString(36).slice(2, 8);
      if (restore) {
        this.players = restore.players.map(p => ({ ...p, conn: null, connected: p.isBot || p.local || p.id === 'host' }));
        this.state = restore.state; this.code = restore.code; this.opts = { ...this.opts, ...(restore.opts || {}) };
        if (!this.state) this.pruneT = setTimeout(() => { if (!this.dead && !this.state) { const b = this.players.length; this.players = this.players.filter(p => p.id === 'host' || p.isBot || p.local || p.connected); if (this.players.length !== b) this.pushLobby(); } }, 12000);
      }
      if (offline) { this.code = 'OFFLINE'; setTimeout(() => { this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); } }, 0); return; }
      this.room = new RoomHost({ ns: NS, prefix: PREFIX, code: this.code, keepCode: !!restore, host: this, onConn: c => this.attach(c), onReady: code => { this.code = code; session.save(GAME, { role: 'host', code }); this.pushLobby(); }, onError: m => this.h.onError(m) });
      this.code = this.room.code;
      if (!remote) this.hb = setInterval(() => this.heartbeat(), HB_MS); /* máy chủ giữ ván: không cần nhịp tim, để phòng được ngủ */
      setTimeout(() => { this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); } }, 0);
    }
    snapData() { return { opts: this.opts, players: this.players.map(({ conn, ...p }) => p), state: this.state }; }
    saveSnap() { clearTimeout(this.snapT); this.snapT = setTimeout(() => { try { store.set(SNAP, JSON.stringify({ ts: Date.now(), code: this.code, offline: this.offline, ...this.snapData() })); } catch (e) {} }, 300); }
    attach(conn) { conn.on('data', m => this.onMsg(conn, m)); conn.on('close', () => this.onLeave(conn)); conn.on('error', () => this.onLeave(conn)); }
    onMsg(conn, msg) {
      if (!msg) return;
      if (msg.t === 'join') {
        let p = this.players.find(x => x.token === msg.token && !x.isBot && !x.local && x.id !== 'host');
        if (p) { const old = p.conn; p.conn = conn; p.connected = true; if (old && old !== conn) try { old.close(); } catch (e) {} } /* gán kết nối mới TRƯỚC khi đóng cái cũ, kẻo onLeave tưởng người này đã rời */
        else {
          if (this.players.length >= (cfg.maxSeats || MAX + 6)) { conn.send({ t: 'error', msg: 'Phòng đã đầy.' }); return; } // quá số người chơi thì thành người xem
          p = { id: 'p' + Math.random().toString(36).slice(2, 8), name: String(msg.name || 'Khách').slice(0, 16), isBot: false, token: msg.token, conn, connected: true };
          this.players.push(p);
        }
        this.conns.set(conn, p); conn.send({ t: 'welcome', id: p.id, code: this.code });
        this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); }
      } else if (msg.t === 'action') { const p = this.conns.get(conn); if (p && p.conn === conn && this.inGame(p.id)) this.act(p.id, msg.a); }
      else if (msg.t === 'sync') { const p = this.conns.get(conn); if (!p || p.conn !== conn) return; if (this.state) this.sendState(p); else conn.send({ t: 'lobby', info: this.lobbyInfo(), code: this.code, started: false }); }
    }
    onLeave(conn) {
      const p = this.conns.get(conn); if (!p) return; this.conns.delete(conn); if (p.conn !== conn) return;
      p.conn = null; p.connected = false;
      if (!this.inGame(p.id)) this.players = this.players.filter(x => x !== p);
      else if (!this.state) setTimeout(() => { if (!this.state && !p.connected && this.players.includes(p)) { this.players = this.players.filter(x => x !== p); this.pushLobby(); } }, 12000); /* phòng chờ: rớt quá 12 giây không quay lại thì trả ghế, kẻo phòng báo đầy vì toàn ghế ma */
      this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); }
    }
    inGame(id) { const s = this.state; return !s || !s.players || s.players.some(q => q.id === id); } // vào giữa ván: chỉ xem
    lobbyInfo() { return { players: this.players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, connected: p.connected, level: p.level, title: p.title || null })), opts: this.opts, min: MIN, max: MAX }; }
    pushLobby() { const info = this.lobbyInfo(); this.h.onLobby(info, this.code, !!this.state); this.saveSnap(); for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'lobby', info, code: this.code, started: !!this.state }); } catch (e) {} }
    setOpt(k, v) { if (this.state || (cfg.optOk && !cfg.optOk(k, v, this.opts))) return; this.opts = { ...this.opts, [k]: v }; this.pushLobby(); }
    usedNames() { return this.players.map(p => p.name.replace(' 🤖', '').trim().toLowerCase()); }
    addBot(extra = {}) { if (this.state || !cfg.bot || this.players.length >= MAX) return; const ini = this.players.map(p => (p.name || '?')[0].toLowerCase()); /* tên bot khác chữ cái đầu với người đang ngồi */ const free = BOT_NAMES.filter(n => !this.usedNames().includes(n.toLowerCase())); const nm = free.find(n => !ini.includes(n[0].toLowerCase())) || free[0] || 'Bot' + this.players.length; this.players.push({ id: 'bot' + Math.random().toString(36).slice(2, 7), name: nm + ' 🤖', isBot: true, token: null, conn: null, connected: true, ...extra }); this.pushLobby(); }
    addLocal(name) { // người chơi cùng máy (chuyền tay)
      if (this.state || !cfg.allowLocal || this.players.length >= MAX) return false;
      const nm = String(name || '').trim().slice(0, 16); if (!nm) return false;
      if (this.usedNames().includes(nm.toLowerCase())) { this.h.onError('Tên này có rồi, đặt tên khác nha.'); return false; }
      this.players.push({ id: 'l' + Math.random().toString(36).slice(2, 7), name: nm, isBot: false, local: true, token: null, conn: null, connected: true }); this.pushLobby(); return true;
    }
    removePlayer(id) { if (this.state) return; const p = this.players.find(x => x.id === id); if (!p || p.id === 'host') return; if (p.conn) try { p.conn.send({ t: 'kicked' }); p.conn.close(); } catch (e) {} this.players = this.players.filter(x => x !== p); this.pushLobby(); }
    seated() { return this.players.filter(p => p.connected || p.isBot || p.local).slice(0, MAX); }
    start(extra) {
      const ps = this.seated(); if (ps.length < MIN) { this.h.onError(cfg.minMsg || `Cần ít nhất ${MIN} người.`); return; }
      this.clearTimers();
      try { this.state = cfg.create(ps.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level })), { ...this.opts, ...(extra || {}) }); } catch (e) { this.h.onError(e.message || 'Không bắt đầu được ván.'); return; }
      this.pushLobby(); this.schedule(); this.broadcast();
    }
    restart() { this.clearTimers(); this.state = null; this.pushLobby(); for (const p of this.players) if (p.conn) this.sendRaw(p, null); this.h.onState(null); }
    controls(id) { const p = this.players.find(x => x.id === id); return !!p && (p.id === 'host' || !!p.local); } // máy chủ phòng được điều khiển ai
    act(pid, a) { const s = this.state; if (!s || !a) return; const r = cfg.apply(s, pid, a, { host: this }); if (!r || !r.ok) { this.tell(pid, (r && r.reason) || 'Không làm được.'); return; } this.schedule(); this.broadcast(); }
    actAs(id, a) { if (this.controls(id)) this.act(id, a); }
    tell(pid, m) { const p = this.players.find(x => x.id === pid); if (p && p.conn) try { p.conn.send({ t: 'error', msg: m }); } catch (e) {} else this.h.onError(m); }
    clearTimers() { for (const k of Object.keys(this.timers)) clearTimeout(this.timers[k]); this.timers = {}; }
    schedule() { // bot và người rớt mạng: máy đi thay
      this.clearTimers(); const s = this.state; if (!s || !cfg.actors) return;
      for (const pid of cfg.actors(s) || []) {
        const p = this.players.find(x => x.id === pid), away = p && !p.isBot && !p.local && !p.connected && (pid !== 'host' || remote); /* máy chủ giữ ván: người tạo phòng vắng cũng có máy đi thay */
        if (!p || !(p.isBot || (away && cfg.bot && cfg.autoAway !== false))) continue;
        const d = away ? AWAY_MS : (cfg.botDelay ? cfg.botDelay(s, pid) : 700 + Math.random() * 600);
        const seq = s.seq; /* bot có thể trả Promise (vd. động cơ cờ chạy trong worker) */
        this.timers[pid] = setTimeout(() => { if (this.dead || this.state !== s) return; let a = null; try { a = cfg.bot(s, pid, p); } catch (e) {} Promise.resolve(a).then(a => { if (a && !this.dead && this.state === s && s.seq === seq) this.act(pid, a); }).catch(() => {}); }, d);
      }
    }
    viewOf(p) { const v = cfg.view(this.state, p.id); if (!this.inGame(p.id)) v.spec = true; v.away = this.players.filter(q => !q.isBot && !q.local && !q.connected && (q.id !== 'host' || remote)).map(q => q.id); return p.id === 'host' ? JSON.parse(JSON.stringify(v)) : v; }
    broadcast() { if (!this.state) return; this.saveSnap(); for (const p of this.players) { if (p.id === 'host') this.h.onState(this.viewOf(p)); else if (p.conn) this.sendRaw(p, this.viewOf(p)); } }
    sendRaw(p, view) { p.bc = (p.bc || 0) + 1; try { p.conn.send({ t: 'state', view, hs: this.hs, bc: p.bc }); } catch (e) {} }
    sendState(p) { if (p.conn && this.state) this.sendRaw(p, this.viewOf(p)); }
    heartbeat() { if (this.dead) return; for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'ping', hs: this.hs, bc: p.bc || 0, started: !!this.state }); } catch (e) {} }
    ownerOn(on, name) { const hp = this.players.find(p => p.id === 'host'); if (hp) { hp.connected = !!on; if (name) hp.name = String(name).slice(0, 16); } if (this.state) { this.schedule(); this.broadcast(); } } /* máy chủ giữ ván: người tạo phòng vào / ra */
    destroy() { this.dead = true; clearInterval(this.hb); clearTimeout(this.pruneT); this.clearTimers(); clearTimeout(this.snapT); this.room && this.room.destroy(); }
    leave() { this.destroy(); store.del(SNAP); session.clear(GAME); }
  }

  return Host;
}

/* game nhỏ dùng khung chung (shared/net/simplenet.js): luật khai báo ở <game>/js/def.js */
const SIMPLE = { baitan: D_baitan, cholon: D_cholon, loto: D_loto, tala: D_tala, thathaythach: D_thathaythach, tusac: D_tusac, sam: D_sam, baucua: D_baucua, noitu: D_noitu, xuyenviet: D_xuyenviet, khaihoang: D_khaihoang, daochinh: D_daochinh, cuuho: D_cuuho, xiecthu: D_xiecthu, dovui: D_dovui, hoisanquai: D_hoisanquai, lansau: D_lansau, vuatiengviet: D_vuatiengviet };
let noituReady = false, noituExtraAt = 0;
const noituBase = () => { if (!noituReady) { noituDict((noituW1 + '\n' + noituW2 + '\n' + noituW3 + '\n' + noituW4).split('\n')); noituReady = true; } };
/* kho từ cộng đồng (từ được bỏ phiếu nhận, chờ duyệt tay) – nạp lại tối đa 10 phút/lần khi mở phòng Nối từ */
export async function noituExtra(env) { noituBase(); if (Date.now() - noituExtraAt < 600e3) return; noituExtraAt = Date.now(); try { noituAdd(await env.LOBBY.get(env.LOBBY.idFromName('main')).ntWords()); } catch (e) {} }
export const SRV_GAMES = ['uno', 'scribble', 'typhu', 'meono', 'bang', 'tamquoc', 'masoi', 'tienlen', 'xidach', 'camel', 'cangua', 'bacao', 'catte', 'poker', ...Object.keys(SIMPLE)];
/* lệnh phòng chờ mà người tạo phòng được gọi từ xa (đúng tên hàm của lớp Host) */
const CMDS = { uno: ['addBot', 'removePlayer', 'setMode', 'setBan', 'setRule', 'setMatch', 'resetMatch', 'start', 'restart'], scribble: ['setOpts', 'removePlayer', 'start', 'restart'], typhu: ['addBot', 'removePlayer', 'setOpt', 'start', 'restart'], meono: ['addBot', 'removePlayer', 'setOpt', 'start', 'restart'], bang: ['addBot', 'removePlayer', 'start', 'restart'], tamquoc: ['addBot', 'removePlayer', 'setOpts', 'start', 'restart'], masoi: ['addBot', 'removePlayer', 'setOpt', 'applyPreset', 'setRole', 'start', 'restart', 'pause', 'setReplay'] };
/* Mỗi game: cách dựng lõi (make), tin riêng của ghế chủ phòng (own), ảnh chụp ván để trao quyền (snap), tin lõi gửi về ghế chủ phòng ngoài lobby/state/error/react (extra). Thêm game: thêm 1 mục ở đây + SRV_GAMES + CMDS. */
/* kho lưu ảnh chụp ván kiểu đơn giản (một chuỗi JSON) */
const KV = store => ({ set: (k, v) => { store.put('snap', v).catch(() => {}); }, del: () => { store.delete('snap').catch(() => {}); } });
const simpleDef = (g, D) => ({
  make: (base, store) => { if (g === 'noitu') noituBase(); /* Nối từ cần kho từ để chấm */
    return makeSimpleHost(D, { ...base, remote: true, store: KV(store) }); },
  create: (Host, name, handlers, restore) => new Host(name, handlers, false, restore),
  own: (h, d) => { if (d.t === 'action') h.act('host', d.a); else if (d.t === 'actAs') h.actAs(String(d.id || ''), d.a); else if (d.t === 'sync') { if (h.state) h.broadcast(); else h.pushLobby(); } else return false; return true; },
  snap: h => h.snapData(), extra: () => ({}),
});
const DEFS = {
  camel: {
    make: (base, store) => camelHost({ ...base, speed: () => 1.15, remote: true, pickReact, CFG: { ...CAMEL_OPTS }, store: KV(store) }),
    create: (Host, name, handlers, restore) => new Host(name, handlers, false, restore),
    own: (h, d) => { if (d.t === 'action') h.act('host', d.a); else if (d.t === 'react') h.react('host', d.e); else return false; return true; },
    snap: h => h.snapData(), extra: () => ({}),
  },
  cangua: {
    make: (base, store) => canguaHost({ ...base, speed: () => 1.15, remote: true, pickReact, CFG: { ...CANGUA_OPTS }, store: KV(store) }),
    create: (Host, name, handlers, restore) => new Host({ name }, handlers, false, restore),
    own: (h, d) => { if (d.t === 'action') h.act('host', d.a); else if (d.t === 'react') h.react('host', d.e); else if (d.t === 'profile') h.setProfile({ name: String(d.name || 'Chủ phòng').slice(0, 16) }); else return false; return true; },
    snap: h => h.snapData(), extra: () => ({}),
  },
  bacao: {
    make: (base, store) => bacaoHost({ ...base, speed: () => 1.15, remote: true, pickReact, CFG: (({ caiId, ...o }) => o)(BACAO_OPTS), store: KV(store) }),
    create: (Host, name, handlers, restore) => new Host(name, handlers, false, restore),
    own: (h, d) => { if (d.t === 'action') h.act('host', d.a); else if (d.t === 'react') h.react('host', d.e); else return false; return true; },
    snap: h => h.snapData(), extra: () => ({}),
  },
  catte: {
    make: (base, store) => catteHost({ ...base, speed: () => 1.15, remote: true, pickReact, CFG: { ...CATTE_OPTS }, store: KV(store) }),
    create: (Host, name, handlers, restore) => new Host(name, handlers, false, restore),
    own: (h, d) => { if (d.t === 'action') h.act('host', d.a); else if (d.t === 'react') h.react('host', d.e); else return false; return true; },
    snap: h => h.snapData(), extra: () => ({}),
  },
  poker: {
    make: (base, store) => pokerHost({ ...base, speed: () => 1.15, remote: true, pickReact, CFG: { ...POKER_OPTS, modeBlindUp: { cash: 0, tourn: 10 } }, store: KV(store) }),
    create: (Host, name, handlers, restore) => new Host(name, handlers, false, restore),
    own: (h, d) => { if (d.t === 'action') h.act('host', d.a); else if (d.t === 'react') h.react('host', d.e); else return false; return true; },
    snap: h => h.snapData(), extra: () => ({}),
  },
  xidach: {
    make: (base, store) => xidachHost({ ...base, speed: () => 1.15, remote: true, pickReact, CFG: (({ caiId, ...o }) => o)(XIDACH_OPTS), store: KV(store) }),
    create: (Host, name, handlers, restore) => new Host(name, handlers, false, restore),
    own: (h, d) => { if (d.t === 'action') h.act('host', d.a); else if (d.t === 'react') h.react('host', d.e); else return false; return true; },
    snap: h => h.snapData(), extra: () => ({}),
  },
  tienlen: {
    make: (base, store) => tienlenHost({ ...base, remote: true, pickReact, CFG: { ...TIENLEN_OPTS, botLevel: 'normal' }, store: KV(store) }),
    create: (Host, name, handlers, restore) => new Host(name, handlers, false, restore),
    own: (h, d) => { if (d.t === 'action') h.act('host', d.a); else if (d.t === 'react') h.react('host', d.e); else if (d.t === 'beg') h.beg('host'); else return false; return true; },
    snap: h => h.snapData(),
    extra: toOwner => ({ onNote: msg => toOwner({ t: 'note', msg }) }),
  },
  uno: {
    make: (base, store) => unoHost({ ...base, speed: () => 1.3, remoteHost: true, pickReact, CFG: { mode: 'house', match: false, matchTarget: 500, modes: Object.fromEntries(Object.entries(MODES).map(([m, x]) => [m, { ...x.rules }])) }, store: { set: (k, v) => { store.put('snap', v).catch(() => {}); }, del: () => { store.delete('snap').catch(() => {}); } } }),
    create: (Host, name, handlers, restore) => new Host(name, handlers, false, restore),
    own: (h, d) => { if (d.t === 'action') h.act('host', d.a); else if (d.t === 'react') h.react('host', d.e); else return false; return true; },
    snap: h => ({ mode: h.mode, rules: h.rules, ban: h.ban, match: h.match, players: h.players.map(({ conn, ...p }) => p), state: h.state }),
    extra: () => ({}),
  },
  masoi: {
    /* 🤖 bot biết nói: gọi thẳng masoiLine (cùng trần tiền / giới hạn theo phòng như đường /ai/masoi của trình duyệt); quá 5 giây, tắt hay hết trần → null, bot dùng câu có sẵn */
    make: (base, store, room, code) => { let off = 0; const env = room && room.env;
      const aiLine = async (s, b, hint) => { if (!env || !env.ANTHROPIC_API_KEY || Date.now() < off) return null;
        try { const nameOf = id => { const p = s.players.find(x => x.id === id); return p ? p.name : ''; };
          const d = { code, bot: b.name, wolf: MASOI_WOLF(b.role), hint, day: s.day, alive: s.players.filter(p => p.alive).map(p => p.name), chat: s.chat.filter(c => c.ch === 'all').slice(-8).map(c => ({ n: c.by ? nameOf(c.by) : '', t: c.text })) };
          const r = await Promise.race([masoiLine(env, env.LOBBY.get(env.LOBBY.idFromName('main')), d, 'srv:' + code), new Promise(res => setTimeout(() => res(null), 5000))]);
          if (r && r.ok && r.text) return r.text; if (r && (r.off || r.limit === 'cap')) off = Date.now() + 30 * 60e3; else if (r && r.limit) off = Date.now() + 5 * 60e3; } catch (e) { off = Date.now() + 60e3; }
        return null; };
      return masoiHost({ ...base, remote: true, pickReact, aiLine, cfgOpts: () => JSON.parse(JSON.stringify(MASOI_OPTS)), store: KV(store) }); },
    create: (Host, name, handlers, restore) => new Host(name, handlers, false, restore),
    own: (h, d) => { if (d.t === 'action') h.act('host', d.a); else if (d.t === 'react') h.react('host', d.e); else return false; return true; },
    snap: h => h.snapData(), extra: () => ({}),
  },
  tamquoc: {
    make: (base, store) => tamquocHost({ ...base, speed: () => 1.15, remote: true, pickReact, CFG: { ...TAMQUOC_CFG }, store: KV(store) }),
    create: (Host, name, handlers, restore) => new Host(name, handlers, false, restore),
    own: (h, d) => { if (d.t === 'action') h.act('host', d.a); else if (d.t === 'react') h.react('host', d.e); else if (d.t === 'pref') h.setHints('host', !!d.hints); else return false; return true; },
    snap: h => h.snapData(), extra: () => ({}),
  },
  bang: {
    make: (base, store) => bangHost({ ...base, speed: () => 1.15, remote: true, pickReact, store: KV(store) }),
    create: (Host, name, handlers, restore) => new Host(name, handlers, false, restore),
    own: (h, d) => { if (d.t === 'action') h.act('host', d.a); else if (d.t === 'react') h.react('host', d.e); else return false; return true; },
    snap: h => h.snapData(), extra: () => ({}),
  },
  meono: {
    make: (base, store) => meonoHost({ ...base, speed: () => 1.15, remote: true, pickReact, CFG: { ...MEONO_OPTS }, store: KV(store) }),
    create: (Host, name, handlers, restore) => new Host(name, handlers, false, restore),
    own: (h, d) => { if (d.t === 'action') h.act('host', d.a); else if (d.t === 'react') h.react('host', d.e); else if (d.t === 'sync') { if (h.state) h.broadcast(); } else return false; return true; },
    snap: h => h.snapData(), extra: () => ({}),
  },
  typhu: {
    make: (base, store) => typhuHost({ ...base, speed: () => 1.15, remote: true, pickReact, CFG: { ...TYPHU_OPTS }, store: { set: (k, v) => { store.put('snap', v).catch(() => {}); }, del: () => { store.delete('snap').catch(() => {}); } } }),
    create: (Host, name, handlers, restore) => new Host({ name, avatar: null }, handlers, false, restore),
    own: (h, d) => { if (d.t === 'action') h.act('host', d.a); else if (d.t === 'react') h.react('host', d.e); else if (d.t === 'profile') h.setProfile({ name: d.name, avatar: d.avatar }); else return false; return true; },
    snap: h => h.snapData(),
    extra: () => ({}),
  },
  scribble: {
    make: (base, store) => scribbleHost({ ...base, remote: true, cfgOpts: () => scribbleOpts({ ...SCRIBBLE_OPTS }),
      store: { set: (k, big, small) => { let v; try { v = big(); } catch (e) { return; } if (v.length > 1500000) v = small(); /* ảnh chụp quá lớn (album nhiều hình): chỉ giữ phòng chờ */ store.put('snap', v).catch(() => { try { store.put('snap', small()).catch(() => {}); } catch (e) {} }); }, del: () => { store.delete('snap').catch(() => {}); } } }),
    create: (Host, name, handlers, restore) => new Host(name, handlers, restore, false),
    own: (h, d, c) => { if (d.t === 'action') h.actFrom('host', d.a); else if (d.t === 'draw') h.drawFrom('host', d.ops); else if (d.t === 'sync') h.sync(); else if (d.t === 'needbook') h.needBook(); else if (d.t === 'react') h.react('host', d.e); else if (d.t === 'tease') h.tease('host', d.text); else if (d.t === 'ping') c.send({ t: 'pong' }); else return false; return true; },
    snap: h => { const { ts, code, offline, ...x } = h.snapData(); return x; },
    extra: toOwner => ({ onTease: m => toOwner(m), onDraw: (ops, cv) => toOwner({ t: 'draw', ops, cv }), onCanvas: m => toOwner(m), onBook: m => toOwner(m) }),
  },
};
for (const [g, D] of Object.entries(SIMPLE)) DEFS[g] = simpleDef(g, D);
CMDS.poker = ['addBot', 'removePlayer', 'setOpt', 'start', 'restart', 'nextNow'];
CMDS.catte = ['addBot', 'removePlayer', 'setOpt', 'start', 'restart', 'nextHand'];
CMDS.bacao = ['addBot', 'removePlayer', 'setOpt', 'resetChips', 'fillBots', 'start', 'restart', 'next'];
CMDS.cangua = ['addBot', 'removePlayer', 'setOpt', 'start', 'restart'];
CMDS.camel = ['addBot', 'removePlayer', 'setOpt', 'start', 'restart'];
CMDS.xidach = ['addBot', 'removePlayer', 'setOpt', 'resetChips', 'start', 'restart', 'next'];
CMDS.tienlen = ['addBot', 'removePlayer', 'setOpt', 'setBotLevel', 'start', 'restart'];
for (const g of Object.keys(SIMPLE)) CMDS[g] = ['addBot', 'removePlayer', 'setOpt', 'start', 'restart', 'addLocal'];
const dec = s => { try { return JSON.parse(s); } catch (e) { return null; } };
const SEAT_GRACE = 20000, OWNER_GRACE = 45000;
/* đổi chỗ hai mã người chơi ở mọi nơi trong ảnh chụp ván (giá trị chuỗi + khoá của bảng tra), trừ tên hiển thị */
function swapIds(x, a, b, key) {
  if (typeof x === 'string') return key === 'name' ? x : x === a ? b : x === b ? a : x;
  if (Array.isArray(x)) return x.map(v => swapIds(v, a, b));
  if (x && typeof x === 'object') { const o = {}; for (const k of Object.keys(x)) o[k === a ? b : k === b ? a : k] = swapIds(x[k], a, b, k); return o; }
  return x;
}

/* ---- 🛡️ Chống gian lận điểm: nhận diện ván kết thúc từ view của ghế chủ phòng (ghi vào Users.recordGame) ----
   Cùng luật với OVER trong shared/ui/stats.js (phase + người thắng từng game), nhưng trả về cho MỌI người chơi
   { id: true/false/null } (null = hoà / game không có thắng thua) để máy chủ tự tính, không tin client khai.
   Chỉ dùng cho game máy chủ giữ (SRV_GAMES); game chạy trên máy người chơi (covua, bantau, caro…) không qua đây. */
const SRV_END_PHASES = { poker: ['handover', 'over'], catte: ['handEnd'] }; /* còn lại: 'ended' | 'over' | 'end' */
const srvEnded = (game, v) => !!v && typeof v === 'object' && (SRV_END_PHASES[game] || ['ended', 'over', 'end']).includes(v.phase);
function srvResults(game, v) {
  const ps = Array.isArray(v.players) ? v.players : [];
  const ids = ps.map(p => p && p.id).filter(Boolean);
  if (!ids.length) return null;
  const won = {}; for (const id of ids) won[id] = false;
  const setWinners = list => { for (const id of ids) won[id] = false; for (const id of list || []) if (id in won) won[id] = true; };
  const setAll = x => { for (const id of ids) won[id] = x; };
  switch (game) {
    case 'bang': case 'tamquoc': { /* người thắng = cả phe (v.winner là tên phe, players có role) */
      const SIDES = { bang: { law: ['sheriff', 'deputy'], outlaw: ['outlaw'], renegade: ['renegade'] }, tamquoc: { lord: ['lord', 'loyal'], rebel: ['rebel'], spy: ['spy'] } };
      const roles = (SIDES[game] || {})[v.winner] || [];
      if (!roles.length) setAll(null); else setWinners(ps.filter(p => roles.includes(p.role)).map(p => p.id));
      break; }
    case 'typhu':
      if (v.winTeam != null) setWinners(ps.filter(p => p.team === v.winTeam).map(p => p.id));
      else if (v.winner) setWinners([v.winner]); else setAll(null);
      break;
    case 'baitan': /* chơi theo đội: cả đội cùng thắng; cá nhân: về nhất mới tính thắng */
      if (v.opts && v.opts.team) { if (v.winTeam == null) setAll(null); else setWinners(ps.filter(p => p.team === v.winTeam).map(p => p.id)); }
      else if (v.loser) { if (v.winner) setWinners([v.winner]); else setAll(null); }
      else setAll(null);
      break;
    case 'masoi':
      if (v.winner && Array.isArray(v.winner.ids)) setWinners(v.winner.ids); else setAll(null);
      break;
    case 'poker': /* mỗi hand kết thúc là 1 ván (như client đếm): ai được chia tiền thì thắng */
      if (v.result && v.result.won) setWinners(Object.keys(v.result.won).filter(id => v.result.won[id] > 0)); else setAll(null);
      break;
    case 'xidach': case 'bacao': /* thắng/thua theo tiền lời/lỗ từng người (delta = 0 thì hoà) */
      for (const p of ps) { const d = p.res && p.res.delta; won[p.id] = typeof d === 'number' ? (d > 0 ? true : d < 0 ? false : null) : null; }
      break;
    case 'catte':
      if (v.result && v.result.winner) setWinners([v.result.winner]); else setAll(null);
      break;
    case 'camel':
      if (v.result && Array.isArray(v.result.winners)) setWinners(v.result.winners); else setAll(null);
      break;
    case 'cuuho': setAll(!!(v.result && v.result.win)); break; /* chơi chung: cả đội cùng thắng / thua */
    case 'xuyenviet': case 'khaihoang': case 'loto':
      if (Array.isArray(v.winners)) setWinners(v.winners); else setAll(null);
      break;
    case 'thathaythach': setAll(null); break; /* game vui, không có thắng thua — vẫn tính ván đã chơi */
    case 'scribble': { const top = ps.slice().sort((a, b) => (b.score || 0) - (a.score || 0))[0]; if (top) setWinners([top.id]); else setAll(null); break; }
    default: /* uno, meono, tienlen, cangua, sam, baucua, noitu, daochinh, xiecthu, cholon, tusac, tala: winner = 1 người */
      if (v.winner) setWinners([v.winner]);
      else if (Array.isArray(v.winners)) setWinners(v.winners);
      else setAll(null);
  }
  return { played: ids, won };
}

class Conn { /* giả lập "conn" như shared/net/cfrelay.js: on('data'|'close'|'error'), send(obj), close() */
  constructor(id, ws) { this.id = id; this.ws = ws; this.peer = 'cf:' + id; this.open = true; this._h = {}; }
  on(e, f) { (this._h[e] = this._h[e] || []).push(f); return this; }
  emit(e, x) { for (const f of this._h[e] || []) { try { f(x); } catch (err) { console.error('srvhost', err && err.stack || err); } } }
  send(msg) { if (!this.open) return; if (msg && msg.t === 'welcome' && msg.id) { this.pid = msg.id; if (this.onPid) queueMicrotask(this.onPid); if (this.quiet) return; } /* quiet: đang dựng lại sau khi phòng thức dậy – người này đã vào từ trước, khỏi chào lại */
    if (msg && msg.t === 'welcome' && !msg.srv) msg = { ...msg, srv: true }; /* báo khách: phòng do máy chủ giữ (khách tắt bộ canh "im lặng quá 8 giây thì nối lại") */
    if (msg && msg.t === 'state' && msg.view && msg.view.spec && this.seats) msg = { ...msg, view: { ...msg.view, openSeats: this.seats() } }; /* người xem: kèm danh sách ghế ngồi thay được */
    try { this.ws.send(JSON.stringify(msg)); } catch (e) {} }
  close() { if (!this.open) return; this.open = false; try { this.ws.send('{"x":"gone"}'); this.ws.close(1000, 'bye'); } catch (e) {} this.emit('close'); }
}

export class SrvRoom {
  // room: Durable Object Room · meta: { game, ok } · snap: ảnh chụp ván đã lưu (hoặc null)
  constructor(room, meta, code, snap) {
    this.room = room; this.meta = meta; this.code = code; this.conns = new Map(); this.owner = null; this.chatLog = []; this.chatN = 0; this.peersSig = ''; this.offAt = new Map(); this.bornAt = Date.now(); this.ownerGone = Date.now();
    this._rec = { gno: null, key: null, sawEnd: false, start: 0, needBump: false }; /* 🛡️ chống gian lận: theo dõi ván hiện tại để ghi kết quả 1 lần duy nhất */
    const srv = this, store = room.ctx.storage;
    this.banned = new Set(); store.get('ban').then(v => { if (Array.isArray(v)) for (const t of v) this.banned.add(t); }).catch(() => {}); /* token người bị chủ phòng mời ra */
    const toOwner = m => { if (srv.owner) srv.owner.send(m); };
    const def = this.def = DEFS[meta.game] || DEFS.uno;
    const Host = def.make({
      RoomHost: class { constructor(o) { this.code = o.code || srv.code; srv.onConn = o.onConn; queueMicrotask(() => o.onReady && o.onReady(this.code)); } destroy() {} },
      token: () => 'srv', session: { save() {}, clear() {} }, watch: (g, h) => h, isReact, hostLimiter,
    }, store, room, code);
    let restore = null; if (snap) { const d = typeof snap === 'string' ? dec(snap) : snap; if (d && d.players && Date.now() - (d.ts || 0) < 6 * 3600e3) restore = { ...d, code, offline: false }; }
    this.host = def.create(Host, restore ? (restore.players.find(p => p.id === 'host') || {}).name || 'Chủ phòng' : 'Chủ phòng', {
      onLobby: (info, c, started, opts) => toOwner(opts === undefined ? { t: 'lobby', info, code: c, started } : { t: 'lobby', info, players: info, code: c, started, opts }),
      onState: (view, tmo) => { if (meta.game === 'noitu') srv.ntSeen(view); srv.recordEnd(view); toOwner(tmo === undefined ? { t: 'state', view } : { t: 'state', view, tmo }); },
      onError: msg => toOwner({ t: 'error', msg }),
      onReact: msg => toOwner(msg), ...def.extra(toOwner),
    }, restore);
    this.host.code = code;
    const hp = this.host.players.find(p => p.id === 'host'); if (hp) hp.connected = false; if (this.host.ownerOn) this.host.ownerOn(false); /* chưa có ai ngồi ghế chủ phòng cho tới khi người tạo phòng nối vào */
  }
  // tin từ một người trong phòng (a = attachment của socket: { id, own })
  deliver(ws, a, raw) {
    const d = dec(raw); if (!d || typeof d.t !== 'string') return;
    if (this.checkOwner()) return;
    let c = this.conns.get(a.id);
    if (!c) {
      if (d.t !== 'join') { try { ws.send('{"x":"gone"}'); ws.close(1000, 'rejoin'); } catch (e) {} return; } /* máy chủ vừa thức dậy / khởi động lại, chưa biết người này: cắt để họ tự vào lại bằng token */
      c = new Conn(a.id, ws); c.own = !!a.own; c.ipk = a.ipk || ''; c.onPid = () => this.pushPeers(); c.seats = () => this.openSeats(); this.conns.set(a.id, c);
      if (!c.own) this.onConn(c);
    }
    if (d.t === 'join' && !c.own && (this.banned.has(String(d.token || '').slice(0, 48)) || (c.ipk && this.banned.has('ip:' + c.ipk)))) { c.open = false; this.conns.delete(a.id); try { ws.send(JSON.stringify({ t: '__kicked' })); ws.close(4003, 'kicked'); } catch (e) {} return; }
    if (d.t === 'join') { c.tok = String(d.token || '').slice(0, 48); c.atok = String(d.atok || '').slice(0, 48); /* atok = token đăng nhập (tra danh hiệu + vai trò); tok = mã máy (vào lại ghế, cấm) */ c.t0 = Date.now(); this.remember(ws, a, { join: d, t0: c.t0 }); c.name = String(d.name || 'Khách').slice(0, 20); c.uid = Number(d.uid) || 0; c.uname = String(d.uname || '').slice(0, 20); this.vipCheck(c, d.vp); this.idCheck(c, d.ip); this.resolveRole(c); this.resolveTitle(c); if (this.chatLog.length) c.send({ t: '__chat', hist: this.chatLog }); }
    if (d.t.startsWith('__')) { /* tin tầng phòng: máy chủ tự xử lý, không đưa xuống lõi game */
      if (d.t === '__ping') c.send({ t: '__pong', n: d.n, away: false });
      else if (d.t === '__chat') this.chat(c, d.text);
      else if (d.t === '__emo') this.emo(c, d.e);
      else if (d.t === '__sit') this.takeSeat(c, d.seatId);
      else if (d.t === '__kick' && c.own) this.kick(String(d.pid || ''));
      else if (d.t === '__local' && c.own) this.goLocal(c);
      else if (d.t === '__unlocal' && c.own) this.unLocal(c, d.snap, !!d.keep);
      else if (d.t === '__id') { c.uid = Number(d.uid) || 0; c.uname = String(d.uname || '').slice(0, 20); this.vipCheck(c, d.vp); this.idCheck(c, d.ip); this.pushPeers(); }
      else if (d.t === '__title') this.resolveTitleClaim(c, d.title); /* 🎖️ đổi danh hiệu giữa ván/phòng (phòng srv) */
      return;
    }
    if (d.t === 'title') { this.resolveTitleClaim(c, d.title); return; } /* 🎖️ tin 'title' thường: chặn trước khi xuống lõi game — phòng srv chỉ tin danh hiệu đã kiểm, không tin id khách tự khai */
    if (d.t === 'join' && !c.own && this.localMode && this.owner) this.owner.send({ t: 'guest', name: c.name }); /* chủ phòng đang chơi với máy trên máy mình: báo có người vào */
    if (d.t === 'cmd' && d.m === 'goto') { /* 🔀 đổi game trong phòng: chỉ ghế chủ phòng được gửi; khách gửi thì báo lỗi, không phát */
      if (!c.own) { c.send({ t: 'error', msg: 'Chỉ chủ phòng mới đổi được game.' }); return; }
      this.goto(c, d.a); return;
    }
    if (!c.own) { c.emit('data', d); return; }
    // ---- người tạo phòng: ngồi ghế 'host' của lõi game ----
    const h = this.host, hp = h.players.find(p => p.id === 'host');
    if (d.t === 'join') {
      if (this.owner && this.owner !== c) { const old = this.owner; this.owner = null; this.conns.delete(old.id); old.open = false; try { old.ws.send('{"x":"gone"}'); old.ws.close(4000, 'replaced'); } catch (e) {} }
      this.owner = c; this.ownerGone = 0; this.pushPeers(); if (hp) { hp.name = String(d.name || hp.name || 'Chủ phòng').slice(0, 16); hp.connected = true; } if (h.ownerOn) h.ownerOn(true, d.name, d.avatar);
      c.send({ t: 'welcome', id: 'host', code: this.code, srv: true });
      h.pushLobby(); if (h.state) h.broadcast(true);
    } else if (this.def.own(h, d, c)) { /* tin của ghế chủ phòng đã vào lõi game */ }
    else if (d.t === 'cmd' && (CMDS[this.meta.game] || []).includes(d.m)) { try { h[d.m](...(Array.isArray(d.a) ? d.a.slice(0, 4) : [])); } catch (e) { c.send({ t: 'error', msg: 'Lệnh không hợp lệ.' }); } }
    else if (d.t === 'close') { if (!this.transfer(c)) this.shut(); } /* người tạo phòng bấm rời: trao quyền cho người kế, không còn ai thì đóng phòng */
  }
  // ---- 🔀 đổi game trong phòng: chủ phòng gửi {t:'cmd', m:'goto', a:[{game}]} → cả phòng nhận {t:'__goto', game, code} rồi tự chuyển trang (cùng mã phòng).
  // Game đích chỉ cần có trong danh sách game của web (FIND_GAMES): có srv thì phòng mới chạy trên máy chủ, không có srv thì trang đích tự mở phòng P2P như thường — máy chủ không chặn.
  // Cho đổi cả khi đang giữa ván (chủ phòng quyết; ván cũ bỏ dở, không ghi kết quả). Phòng cũ: phát xong mới đóng — đợi 1500ms cho tin tới hết rồi shut() mới cắt socket + xoá kho.
  goto(c, a) {
    if (this.gotoSent) return;
    const g = String((Array.isArray(a) && a[0] && a[0].game) || '').trim().toLowerCase();
    if (!g || !FIND_GAMES.includes(g)) { c.send({ t: 'error', msg: 'Game này chưa có, chọn game khác nhé.' }); return; }
    if (g === this.meta.game) { c.send({ t: 'error', msg: 'Đang ở game này rồi.' }); return; }
    this.gotoSent = true;
    const m = { t: '__goto', game: g, code: this.code };
    for (const x of this.conns.values()) if (x.open) x.send(m);
    setTimeout(() => { try { this.shut(); } catch (e) {} }, 1500); /* < LONG (4000ms) nên là hẹn giờ thật, không qua hẹn giờ ảo */
  }
  // ---- 🤖 chơi một mình với máy: ván chạy trên máy người tạo phòng (máy chủ được ngủ), phòng ở đây chỉ giữ mã + phòng chờ ----
  goLocal(c) {
    const h = this.host, others = [...this.conns.values()].some(x => x !== c && x.open !== false);
    if (h.state || others || this.meta.game === 'scribble') { c.send({ t: 'local', ok: false }); return; }
    let snap = null; try { snap = this.def.snap(h); } catch (e) {}
    if (!snap || !Array.isArray(snap.players)) { c.send({ t: 'local', ok: false }); return; }
    this.localMode = true; c.send({ t: 'local', ok: true, snap: { ...snap, state: null } });
  }
  unLocal(c, snap, keep = false) { /* về phòng chờ: nhận lại xu / luật / bot từ máy người tạo phòng, giữ những người đã vào chờ */
    this.localMode = false;
    if (!snap || typeof snap !== 'object' || !Array.isArray(snap.players) || JSON.stringify(snap).length > 400000) { this.host.pushLobby(); return; }
    let cur = null; try { cur = this.def.snap(this.host); } catch (e) {} if (!cur) { this.host.pushLobby(); return; }
    const hp = cur.players.find(p => p.id === 'host'), bots = snap.players.filter(p => p && typeof p.id === 'string' && (p.isBot || /^l/.test(p.id))).slice(0, 12);
    const guests = cur.players.filter(p => !p.isBot && p.id !== 'host');
    const next = { ...snap, state: keep && snap.state && typeof snap.state === 'object' ? snap.state : null, players: [hp, ...bots, ...guests].filter(Boolean), ts: Date.now(), code: this.code }; /* keep: nhận nguyên ván đang chơi (khách vừa vào thành người xem) */
    try { this.host.destroy(); } catch (e) {}
    this.room.ctx.storage.put('snap', JSON.stringify(next)).catch(() => {});
    this.room.srvReset(next); this.room.ensureSrv().catch(e => console.error('unlocal', e && e.stack || e));
  }
  // ---- 💤 phòng ngủ / thức: Cloudflare cho Durable Object "ngủ" khi không có việc (không tốn tiền chạy). Lúc ngủ mất hết bộ nhớ,
  // nên mỗi socket tự mang theo tin "join"; thức dậy thì revive() dựng lại người trong phòng, không ai phải nối lại.
  remember(ws, a, extra) {
    try { const cur = a || ws.deserializeAttachment() || {}; const next = { ...cur, ...extra }; if (next.join) { const j = next.join; next.join = { t: 'join', name: j.name, token: j.token, uid: j.uid, uname: j.uname, avatar: j.avatar, spec: j.spec, vp: j.vp, ip: j.ip }; }
      if (JSON.stringify(next).length < 1800) ws.serializeAttachment(next); } catch (e) {}
  }
  revive() {
    let n = 0;
    for (const ws of this.room.ctx.getWebSockets()) {
      let a; try { a = ws.deserializeAttachment(); } catch (e) {} if (!a || a.role !== 'c' || !a.join || this.conns.has(a.id) || ws.readyState !== 1) continue;
      const c = new Conn(a.id, ws); c.own = !!a.own; c.ipk = a.ipk || ''; c.onPid = () => this.pushPeers(); c.seats = () => this.openSeats(); c.quiet = true; this.conns.set(a.id, c);
      const j = a.join; c.name = String(j.name || 'Khách').slice(0, 20); c.uid = Number(j.uid) || 0; c.uname = String(j.uname || '').slice(0, 20); c.tok = String(j.token || '').slice(0, 48); c.atok = String(j.atok || '').slice(0, 48); c.t0 = a.t0 || Date.now(); this.vipCheck(c, j.vp); this.idCheck(c, j.ip); this.resolveRole(c); this.resolveTitle(c);
      if (c.own) { const h = this.host, hp = h.players.find(p => p.id === 'host'); this.owner = c; this.ownerGone = 0; if (hp) { hp.connected = true; } if (h.ownerOn) h.ownerOn(true, j.name, j.avatar); }
      else { this.onConn(c); c.emit('data', j); }
      c.quiet = false; n++;
    }
    if (n) { this.pushPeers(); try { const h = this.host; if (h.pushLobby) h.pushLobby(); if (h.state && h.broadcast) h.broadcast(true); } catch (e) {} }
    return n;
  }
  // ---- 🪑 ngồi thay ghế bot / ghế người đã thoát giữa ván (cùng luật với RoomHost.takeSeat ở shared/net/room.js) ----
  openSeats() {
    const h = this.host; if (!h.state || !Array.isArray(h.state.players)) return [];
    const inSt = new Set(h.state.players.map(q => q.id));
    return h.players.filter(p => inSt.has(p.id) && p.id !== 'host' && (p.isBot || (!p.connected && Date.now() - (this.offAt.get(p.id) || this.bornAt) >= SEAT_GRACE))).map(p => ({ id: p.id, name: String(p.name || '').replace(' 🤖', '').trim() || 'Khách', isBot: !!p.isBot }));
  }
  takeSeat(c, targetId) {
    const h = this.host; if (c.own || !h.state || !targetId) return;
    const spec = h.players.find(p => p.conn === c); if (!spec || spec.id === 'host' || h.state.players.some(q => q.id === spec.id)) return;
    if (!this.openSeats().some(s => s.id === targetId)) { c.send({ t: 'error', msg: 'Ghế này vừa có người ngồi rồi.' }); return; }
    const target = h.players.find(p => p.id === targetId); if (!target) return;
    if (target.conn && target.conn !== c) { try { target.conn.close(); } catch (e) {} }
    const nm = String(spec.name || c.name || 'Khách').replace(' 🤖', '').trim().slice(0, 16) || 'Khách';
    Object.assign(target, { isBot: false, conn: c, connected: true, name: nm, title: spec.title || null, bc: Math.max(target.bc || 0, spec.bc || 0) }); if (spec.token) target.token = spec.token;
    const sp = h.state.players.find(q => q.id === targetId); if (sp) { sp.name = nm; if ('isBot' in sp) sp.isBot = false; }
    h.players = h.players.filter(p => p !== spec);
    if (Array.isArray(h.state.log)) { h.state.log.push(`🪑 ${nm} đã ngồi vào bàn.`); if (h.state.log.length > 200) h.state.log.shift(); if ('logN' in h.state) h.state.logN = (h.state.logN || 0) + 1; }
    c.send({ t: 'welcome', id: target.id, code: this.code, tookSeat: true });
    this.pushPeers(); h.pushLobby(); if (h.scheduleBots) h.scheduleBots(); h.broadcast();
  }
  // ---- 👑 trao quyền chủ phòng: đổi mã người kế thành 'host' trong ảnh chụp ván, cấp chìa mới, rồi dựng lại lõi từ ảnh chụp ----
  checkOwner() { return !this.owner && this.ownerGone && Date.now() - this.ownerGone >= OWNER_GRACE ? this.transfer(null) : false; } /* người tạo phòng mất hút quá 45 giây */
  transfer(leaving) {
    const h = this.host, heir = [...this.conns.values()].find(x => x.open && x !== leaving && !x.own && x.pid && h.players.some(p => p.id === x.pid && !p.isBot)); if (!heir) return false;
    const snap = swapIds({ ts: Date.now(), code: this.code, offline: false, ...this.def.snap(h) }, 'host', heir.pid);
    const b = new Uint8Array(15); crypto.getRandomValues(b); const ok = [...b].map(x => x.toString(36).padStart(2, '0')).join('').slice(0, 24);
    try { h.destroy(); } catch (e) {}
    this.meta.ok = ok; const st = this.room.ctx.storage; st.put('srv', this.meta).catch(() => {}); st.put('snap', JSON.stringify(snap)).catch(() => {});
    heir.send({ t: '__own', ok });
    for (const c of [...this.conns.values()]) { c.open = false; if (c !== heir) try { c.ws.send('{"x":"gone"}'); c.ws.close(1000, 'rejoin'); } catch (e) {} } /* mọi người tự vào lại bằng token; người kế tải lại trang để ngồi ghế chủ */
    setTimeout(() => { try { heir.ws.close(1000, 'rejoin'); } catch (e) {} }, 800);
    this.conns.clear(); this.owner = null; this.room.srvReset(snap);
    return true;
  }
  /* người tạo phòng mời một người ra (cả giữa ván): cắt kết nối, chặn token; ghế để máy / người xem ngồi thay như người thoát */
  kick(pid, why) {
    if (!pid || pid === 'host') return; const h = this.host;
    for (const x of [...this.conns.values()]) if (!x.own && x.pid === pid) {
      if (x.tok) this.banned.add(x.tok);
      x.send({ t: '__kicked', ...(why ? { why } : {}) }); x.open = false; this.conns.delete(x.id);
      try { x.ws.close(4003, 'kicked'); } catch (e) {} x.emit('close');
    }
    const p = Array.isArray(h.players) && h.players.find(q => q && q.id === pid); if (p && p.token) this.banned.add(p.token);
    this.room.ctx.storage.put('ban', [...this.banned].slice(-200)).catch(() => {});
    if (!h.state && typeof h.removePlayer === 'function') try { h.removePlayer(pid); } catch (e) {}
    this.pushPeers();
  }
  // ---- 🛡️ Ghi kết quả ván do máy chủ giữ (chống gian lận điểm) ----
  // Chạy mỗi lần lõi game phát view mới cho ghế chủ phòng. Ván chỉ ghi 1 lần: chặn trong bộ nhớ (R.key) +
  // khoá bền trong Room storage ('lastRec') + bảng vgames bên Users (chống phát lại sau khi phòng ngủ/thức dậy).
  // Bộ đếm ván (gno, lưu bền) phân biệt 2 ván liên tiếp cùng người chơi + cùng người thắng trong 1 phòng.
  // Dưới 2 người thật đã đăng nhập thì KHÔNG ghi (ván đấu máy / 1 người + bot chỉ tính ở hồ sơ máy).
  recordEnd(view) {
    try {
      const game = this.meta.game;
      if (!SRV_GAMES.includes(game)) return;
      const R = this._rec || (this._rec = { gno: null, key: null, sawEnd: false, start: 0, needBump: false });
      if (!view || typeof view !== 'object') { R.sawEnd = true; R.key = null; return; } /* ván bị huỷ / chơi lại: ván sau là ván mới */
      if (!srvEnded(game, view)) {
        if (R.sawEnd || R.gno === null) { R.sawEnd = false; R.key = null; R.start = Date.now(); R.needBump = true; } /* ván mới bắt đầu (hoặc phòng vừa thức dậy giữa ván) */
        return;
      }
      if (R.key) return; /* đã ghi (hoặc đã bỏ qua) ván này rồi */
      R.sawEnd = true;
      const res = srvResults(game, view); if (!res) return;
      const uidOf = new Map(); /* ghế trong ván → id tài khoản (bot / chơi cùng máy / khách không đăng nhập không có uid nên không được ghi) */
      for (const c of this.conns.values()) if (c.open && c.pid && c.uid > 0) uidOf.set(c.pid, c.uid);
      const players = [];
      for (const pid of res.played) { const uid = uidOf.get(pid); if (uid) players.push({ uid, won: res.won[pid] == null ? null : !!res.won[pid] }); }
      if (new Set(players.map(p => p.uid)).size < 2) { R.key = 'skip'; return; }
      R.key = 'pending'; /* chặn phát lại trong lúc đang tải bộ đếm ván */
      const durMs = R.start ? Date.now() - R.start : 0;
      const p = (async () => {
        try {
          if (R.needBump) { /* ván mới: tăng bộ đếm rồi mới tính khoá (lưu bền để phòng ngủ giữa ván cũng không trùng) */
            R.needBump = false;
            try { R.gno = (await this.room.ctx.storage.get('gno')) || 0; } catch (e) { R.gno = 0; }
            R.gno++; try { await this.room.ctx.storage.put('gno', R.gno); } catch (e) {}
          } else if (R.gno === null) { try { R.gno = (await this.room.ctx.storage.get('gno')) || 0; } catch (e) { R.gno = 0; } }
          const gid = typeof view.gid === 'string' ? view.gid.slice(0, 12) : '';
          const key = [this.code, game, R.gno, gid, players.map(x => x.uid + (x.won === true ? 'W' : x.won === false ? 'L' : 'D')).sort().join(',')].join('|');
          const last = await this.room.ctx.storage.get('lastRec').catch(() => null);
          if (last === key) { R.key = key; return; } /* phòng ngủ rồi thức dậy, ván này đã ghi */
          const env = this.room.env, U = env.USERS.get(env.USERS.idFromName('main'));
          const r = await U.recordGame({ game, room: this.code, key, durMs, n: res.played.length, players });
          if (r && (r.ok || r.dup)) { R.key = key; try { await this.room.ctx.storage.put('lastRec', key); } catch (e) {} }
          else { R.key = null; console.error('recordGame failed', game, this.code, r && r.msg); } /* thử lại ở lần phát lại sau */
        } catch (e) { R.key = null; console.error('recordGame', e && e.stack || e); }
      })();
      try { this.room.ctx.waitUntil(p); } catch (e) {}
      p.catch(() => {});
    } catch (e) { console.error('recordEnd', e && e.stack || e); }
  }
  /* 🔗 Nối từ: từ vừa được cả bàn bỏ phiếu nhận → máy chủ phòng tự ghi vào kho từ chờ duyệt (duyệt tay ở trang Quản trị).
     KHÔNG kiểm bằng AI (chưa đặt key). */
  ntSeen(v) {
    const L = v && v.last; if (!L || L.t !== 'ok' || !L.voted) return;
    const k = (v.gid || 0) + ':' + L.word; if (this.ntK === k) return; this.ntK = k;
    const yes = Math.max(0, Math.min(20, L.voted.yes | 0)), no = Math.max(0, Math.min(20, L.voted.no | 0));
    let w = ''; try { w = noituNorm(String(L.word || '').slice(0, 40)); } catch (e) {}
    if (w.split(' ').length !== 2 || yes < 1 || yes < no) return;
    try { if (clean(w).text !== w) return; } catch (e) { return; }
    if (!w.split(' ').every(x => /^[a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]{1,7}$/.test(x))) return;
    try { const env = this.room.env; env.LOBBY.get(env.LOBBY.idFromName('main')).ntAdd(w, yes, no).catch(() => {}); } catch (e) {}
  }
  /* 🪪 vé tài khoản (server/src/vip.js) → c.vid = uid đã kiểm + c.mod = lệnh cấm của quản trị & danh sách người họ chặn (Users.modInfo) */
  idCheck(c, p) {
    c.vid = 0; c.mod = null; const uid = Number(c.uid) || 0; if (!p || !uid) return;
    checkIdPass(this.room.env, p, uid).then(async ok => {
      if (!ok || c.uid !== uid) return; c.vid = uid;
      try { const env = this.room.env; c.mod = await env.USERS.get(env.USERS.idFromName('main')).modInfo(uid); } catch (e) {}
      this.blkSweep();
    }, () => {});
  }
  /* 🚫 người chủ phòng đã chặn thì không ở trong phòng của chủ phòng – chặn luôn IP máy đó như bị mời ra */
  blkSweep() {
    const o = [...this.conns.values()].find(x => x.open && x.own), blk = o && o.mod && o.mod.blk; if (!blk || !blk.length) return;
    for (const x of [...this.conns.values()]) if (!x.own && x.vid && blk.includes(x.vid)) {
      if (x.ipk) { this.banned.add('ip:' + x.ipk); this.room.ctx.storage.put('ban', [...this.banned].slice(-200)).catch(() => {}); } /* chặn cả IP trong phòng này – acc khác / khách cùng mạng cũng không vào lại được */
      if (x.pid) { this.kick(x.pid, 'blk'); continue; }
      if (x.tok) this.banned.add(x.tok); x.send({ t: '__kicked', why: 'blk' }); x.open = false; this.conns.delete(x.id); try { x.ws.close(4003, 'kicked'); } catch (e) {} x.emit('close');
    }
  }
  /* 👑 kiểm vé chủ web (server/src/vip.js) rồi báo lại danh sách người trong phòng */
  vipCheck(c, vp) {
    if (!vp) { if (c.vip) { c.vip = false; this.pushPeers(); } return; }
    checkPass(this.room.env, vp, c.uid).then(ok => { if (!!c.vip !== ok) { c.vip = ok; this.pushPeers(); } }, () => {});
  }
  /* 🎖️ huy hiệu chat phòng (patch -95): lấy role + supporter từ token lúc vào phòng (1 lần duy nhất, không gọi mỗi tin) */
  resolveRole(c) {
    if (!c.atok) { c.role = 0; c.sp = 0; return; }
    this.room.env.USERS.get(this.room.env.USERS.idFromName('main')).whoami(c.atok).then(u => {
      c.role = u ? (u.role != null ? +u.role : (u.admin ? 2 : 0)) : 0; c.sp = u && u.supporter ? 1 : 0;
    }, () => { c.role = 0; c.sp = 0; });
  }
  /* 🎖️ danh hiệu trưng ra (patch -97): lấy P.title đã kiểm lúc vào phòng (ghế chủ phòng cũng tính, qua c.own) */
  resolveTitle(c) {
    if (!c.atok) { c.title = null; return; }
    this.room.env.USERS.get(this.room.env.USERS.idFromName('main')).titleOf(c.atok).then(t => this.setSeatTitle(c, t), () => {});
  }
  /* 🎖️ đổi danh hiệu giữa ván/phòng: chỉ nhận id nằm trong danh sách đã đạt của chính tài khoản đó */
  resolveTitleClaim(c, id) {
    if (!c.atok) return;
    this.room.env.USERS.get(this.room.env.USERS.idFromName('main')).verifyTitle(c.atok, id).then(t => this.setSeatTitle(c, t), () => {});
  }
  /* gán danh hiệu vào ghế của người đó trong lõi game rồi báo lại phòng chờ (đổi rồi thì thôi, khỏi spam) */
  setSeatTitle(c, t) {
    const h = this.host; if (!h || !Array.isArray(h.players)) return;
    const p = h.players.find(q => q.conn === c) || h.players.find(q => c.pid && q.id === c.pid) || (c.own ? h.players.find(q => q.id === 'host') : null);
    if (!p) return;
    t = t || null; c.title = t;
    if ((p.title && p.title.id) === (t && t.id)) return;
    p.title = t;
    try { h.pushLobby(); } catch (e) {}
  }
  /* danh sách người trong phòng (để bấm tên kết bạn / nhắn riêng) */
  pushPeers() {
    const list = [...this.conns.values()].filter(x => x.open && x.name && (x.own || x.pid)).map(x => ({ pid: x.own ? 'host' : x.pid, name: x.name, uid: x.uid || 0, uname: x.uname || '', host: !!x.own, isBot: false, ...(x.vip ? { vip: true } : {}) }));
    const sig = JSON.stringify(list); if (sig === this.peersSig) return; this.peersSig = sig;
    for (const x of this.conns.values()) if (x.open) x.send({ t: '__peers', peers: list });
  }
  /* 😂 thả emoji / câu chọc (game chưa có react.js riêng – shared/net/room.js gắn sẵn) */
  emo(c, e) {
    if (!c.name || !isReact(e)) return; const from = c.own ? 'host' : c.pid; if (!from) return;
    const now = Date.now(); if (now - (c.emoAt || 0) < 1200) return; c.emoAt = now;
    const m = { t: '__emo', e, from }; for (const x of this.conns.values()) if (x.open && x.name) x.send(m);
  }
  chat(c, text) {
    if (!c.name) return; const now = Date.now(); if (now - (c.chatAt || 0) < 700) return; c.chatAt = now;
    if (c.mod && c.mod.mc > now) return c.send({ t: '__chat', id: 'mute.' + now, from: 'GumballZ', sys: 1, text: `🔇 Bạn đang bị tạm cấm chat đến ${new Date(c.mod.mc).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}` });
    text = String(text == null ? '' : text).replace(/\s+/g, ' ').trim().slice(0, 140); if (!text) return;
    try { text = clean(text).text; } catch (e) {}
    const m = { t: '__chat', id: ++this.chatN, from: c.name, host: !!c.own, uid: c.uid || 0, uname: c.uname || '', rl: c.role || 0, sp: c.sp ? 1 : 0, ti: c.title || null, text, ...(c.vip ? { vip: true } : {}) };
    this.chatLog.push(m); if (this.chatLog.length > 40) this.chatLog.shift();
    for (const x of this.conns.values()) if (x.open && x.name) x.send(m);
  }
  // socket của một người đóng
  closed(id, ws) {
    const c = this.conns.get(id); if (!c || c.ws !== ws) return; /* socket cũ đóng sau khi đã nối lại */
    this.conns.delete(id); c.open = false; this.pushPeers();
    if (!c.own && c.pid) this.offAt.set(c.pid, Date.now());
    if (c === this.owner) { this.owner = null; this.ownerGone = Date.now(); realSetTimeout(() => this.checkOwner(), OWNER_GRACE + 500); /* hẹn giờ thật: không để lỡ việc trao quyền nếu phòng bị cất khỏi bộ nhớ */ const hp = this.host.players.find(p => p.id === 'host'); if (hp) hp.connected = false; if (this.host.ownerOn) this.host.ownerOn(false); this.host.pushLobby(); if (this.host.state) { if (this.host.scheduleBots) this.host.scheduleBots(); else this.host.broadcast(); } }
    else c.emit('close');
  }
  humans() { return this.conns.size; }
  shut() {
    for (const c of [...this.conns.values()]) { c.open = false; try { c.ws.send('{"x":"gone"}'); c.ws.close(1000, 'closed'); } catch (e) {} }
    this.conns.clear(); this.owner = null; try { this.host.destroy(); } catch (e) {}
    this.room.srvEnd();
  }
}
