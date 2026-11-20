// Lớp mạng UNO: host giữ state, client chỉ gửi action. Kết nối dùng chung ở shared/net/room.js
import { MODES, MATCH_TARGETS } from './engine.js?v=27';
import { makeHost, NS, PREFIX, GAME, SNAP, MAX, PULL_CD, TURN_TIME, OWE_TIME, UNO_PHRASES } from './host.js?v=3';
import { S } from './ufx.js?v=25';
import { RoomHost, RoomClient, token, session } from '../../shared/net/room.js?v=51';
import { RemoteBase } from '../../shared/net/remotehost.js?v=1';
import { isReact, hostLimiter, pickReact } from '../../shared/ui/react.js?v=6';
import { rulesFor } from '../../shared/rules.js?v=2';
import { specBanner } from '../../shared/ui/spectate.js?v=8';
import { watch } from '../../shared/ui/stats.js?v=75';
export { MAX, PULL_CD, TURN_TIME, OWE_TIME, UNO_PHRASES, session };
export function loadSnapshot() { try { const d = JSON.parse(localStorage.getItem(SNAP)); return d && Date.now() - d.ts < 3 * 3600e3 ? d : null; } catch (e) { return null; } }
// ⚙️ Luật mặc định khi tạo phòng mới: lấy từ luat-mac-dinh.js (gốc repo), sai/thiếu thì dùng luật gốc ở đây
const B2 = [true, false], RULE_OK = Object.fromEntries(Object.keys(MODES.classic.rules).map(k => [k, B2]));
const CFG = rulesFor('uno', { mode: 'house', match: false, matchTarget: 500, modes: Object.fromEntries(Object.entries(MODES).map(([m, x]) => [m, { ...x.rules }])) },
  { mode: Object.keys(MODES), match: B2, matchTarget: MATCH_TARGETS, modes: Object.fromEntries(Object.keys(MODES).map(m => [m, RULE_OK])) });
/* lõi chủ phòng nằm ở host.js (không phụ thuộc trình duyệt); ở đây chỉ nối nó với RoomHost + localStorage của trình duyệt */
export const Host = makeHost({ RoomHost, token, session, watch, speed: S, isReact, hostLimiter, pickReact, CFG,
  store: { set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } } });

// 🖥️ Chủ phòng từ xa: ván do MÁY CHỦ giữ (server/src/srvhost.js chạy đúng lõi host.js), máy mình chỉ gửi lệnh.
// Cùng tên hàm với Host nên main.js dùng y như cũ. Chủ phòng để tab ở nền / máy yếu / rớt mạng thì ván vẫn chạy.
/* Phòng online của UNÔ mặc định do MÁY CHỦ giữ ván (chủ phòng để tab ở nền / rớt mạng ván vẫn chạy). Tắt bằng ?srv=0 (nhớ trong localStorage), bật lại bằng ?srv=1.
   Mở phòng trên máy chủ thất bại thì lần tạo phòng kế trong tab này quay về kiểu cũ (máy chủ phòng là trình duyệt). */
export const srvMode = () => { try { const q = new URLSearchParams(location.search).get('srv'); if (q !== null) { if (q === '0') localStorage.setItem('gumballz-srv', '0'); else localStorage.removeItem('gumballz-srv'); } return localStorage.getItem('gumballz-srv') !== '0' && sessionStorage.getItem('gumballz-srv-off') !== '1'; } catch (e) { return false; } };
export class RemoteHost extends RemoteBase {
  constructor(name, handlers, code = null, ok = null) {
    super({ raw: handlers, local: (hh, r) => new Host(name, hh, true, r), game: GAME, ns: NS, prefix: PREFIX, h: watch(GAME, handlers, () => 'host'), name, code, ok,
      cmds: ['addBot', 'removePlayer', 'setMode', 'setBan', 'setRule', 'setMatch', 'resetMatch', 'start', 'restart'],
      onFresh: send => { /* phòng mới: áp luật chọn sẵn của web (luat-mac-dinh.js) lên máy chủ */
        const base = MODES[CFG.mode] ? MODES[CFG.mode].rules : {}, want = CFG.modes[CFG.mode] || {};
        if (CFG.mode !== 'house') send('setMode', CFG.mode);
        for (const k of Object.keys(want)) if (want[k] !== base[k]) send('setRule', k, want[k]);
        if (CFG.match) send('setMatch', true, CFG.matchTarget);
      } });
  }
  act(pid, a) { this.send({ t: 'action', a }); }
  react(pid, e) { this.send({ t: 'react', e }); }
}

export class Client {
  constructor(code, name, handlers) {
    this.h = watch(GAME, handlers, () => this.id); this.code = code.toUpperCase().trim(); this.name = name; this.id = null;
    this.room = new RoomClient({
      ns: NS, prefix: PREFIX, code: this.code, joinMsg: () => ({ name: this.name }),
      onStatus: (t, k) => { this.h.onNet && this.h.onNet(t, k, () => this.room.retryNow()); },
      onFail: m => { this.h.onError(m); session.clear(GAME); },
      onWelcome: id => { this.id = id; session.save(GAME, { role: 'client', code: this.code, name: this.name }); this.h.onJoined(id); },
      onOwn: m => { if (!m || !m.ok) return; session.save(GAME, { role: 'srv', code: this.code, ok: String(m.ok), name: this.name }); try { this.room.destroy(); } catch (e) {} location.reload(); }, /* được trao quyền chủ phòng: tải lại để vào ghế chủ */
      onLost: () => this.h.onDisconnect(),
      onMsg: msg => {
        if (msg.t === 'lobby') this.h.onLobby(msg.info, msg.code, msg.started);
        else if (msg.t === 'state') { specBanner(!!(msg.view && msg.view.spec)); this.h.onState(msg.view); }
        else if (msg.t === 'error') this.h.onError(msg.msg);
        else if (msg.t === 'react') this.h.onReact && this.h.onReact(msg);
        else if (msg.t === 'kicked') { this.h.onError('Bạn đã bị mời ra khỏi phòng.'); this.leave(); }
      },
    });
  }
  act(a) { this.room.send({ t: 'action', a }); }
  react(e) { this.room.send({ t: 'react', e }); }
  destroy() { specBanner(false); this.room.destroy(); }
  leave() { this.destroy(); session.clear(GAME); }
}
