// Khai báo luật + máy cho lớp mạng dùng chung (shared/net/simplenet.js) + máy chủ (server/src/srvhost.js) – không đụng tới trình duyệt.
import * as E from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
export const DEF = {
  srv: true, /* phòng online do máy chủ giữ ván (server/src/srvhost.js) */
  game: 'nganha', min: 2, max: 6, maxSeats: 22, minMsg: 'Cần ít nhất 2 người: mời bạn vào phòng hoặc thêm máy.',
  defaults: E.DEFAULT_OPTS, optOk: E.optOk, create: E.createGame, apply: E.applyAction, view: E.viewFor, actors: E.actors,
  bot: botAction, botDelay: s => (s.pend ? 600 + Math.random() * 800 : 1000 + Math.random() * 800), botNames: ['Mochi', 'Bơ', 'Pudding', 'Kẹo', 'Xôi', 'Nấm', 'Đậu', 'Gấu Bông', 'Sữa', 'Táo'],
};
