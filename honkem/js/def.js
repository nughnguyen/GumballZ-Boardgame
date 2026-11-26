// Khai báo luật + máy cho lớp mạng dùng chung (shared/net/simplenet.js) + máy chủ (server/src/srvhost.js) – không đụng tới trình duyệt.
import * as E from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
export const DEF = {
  srv: true, /* phòng online do máy chủ giữ ván */
  game: 'honkem', min: 1, max: 16, maxSeats: 22, minMsg: 'Cần ít nhất 1 người.',
  defaults: E.DEFAULT_OPTS, optOk: E.optOk, create: E.createGame, apply: E.applyAction, view: E.viewFor, actors: E.actors,
  bot: botAction, botDelay: s => 1500 + Math.random() * (s.opts.t || 12) * 450,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Kẹo', 'Xôi', 'Nấm', 'Đậu', 'Gấu Bông', 'Sữa', 'Táo'],
};
