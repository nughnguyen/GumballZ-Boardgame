// Khai báo luật + máy cho lớp mạng dùng chung (shared/net/simplenet.js). Tách khỏi main.js để máy chủ (server/src/srvhost.js) dùng được – file này không đụng tới trình duyệt.
import * as E from './engine.js?v=4';
export const DEF = {
  srv: true, /* phòng online do máy chủ giữ ván (server/src/srvhost.js) */
  game: 'loto', min: 2, max: 16, maxSeats: 24, minMsg: 'Cần ít nhất 2 người: mời bạn vào phòng hoặc thêm bot.',
  defaults: E.DEFAULT_OPTS, optOk: E.optOk, create: E.createGame, apply: E.applyAction, view: E.viewFor, actors: E.actors,
  bot: E.botAction, botDelay: () => 1200 + Math.random() * 1600,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Kẹo', 'Xôi', 'Đậu', 'Nấm', 'Sữa', 'Gấu Bông', 'Chanh', 'Vừng', 'Ổi', 'Quýt', 'Hạt Dẻ', 'Trà Sữa'],
};
