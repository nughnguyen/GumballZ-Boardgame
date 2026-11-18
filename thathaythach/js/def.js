// Khai báo luật + máy cho lớp mạng dùng chung (shared/net/simplenet.js). Tách khỏi main.js để máy chủ (server/src/srvhost.js) dùng được – file này không đụng tới trình duyệt.
import * as E from './engine.js?v=2';
export const DEF = {
  srv: true, /* phòng online do máy chủ giữ ván (server/src/srvhost.js) */
  game: 'thathaythach', min: 2, max: 12, maxSeats: 16, allowLocal: true, minMsg: 'Cần ít nhất 2 người: mời bạn vào phòng hoặc thêm người chơi cùng máy.',
  defaults: E.DEFAULT_OPTS, optOk: E.optOk, create: E.createGame, apply: E.applyAction, view: E.viewFor, actors: E.actors, bot: E.awayAction,
};
