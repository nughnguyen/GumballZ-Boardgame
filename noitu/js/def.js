// Khai báo luật + máy cho lớp mạng dùng chung (shared/net/simplenet.js). Tách khỏi main.js để máy chủ (server/src/srvhost.js) dùng được – file này không đụng tới trình duyệt.
import * as E from './engine.js?v=16';
import { botAction } from './bot.js?v=16';
export const DEF = {
  srv: true, /* phòng online do máy chủ giữ ván (server/src/srvhost.js) */
  game: 'noitu', min: 2, max: 8, minMsg: 'Cần ít nhất 2 người: mời bạn vào phòng hoặc thêm máy.',
  defaults: E.DEFAULT_OPTS, optOk: E.optOk, create: E.createGame, apply: E.applyAction, view: E.viewFor, actors: E.actors,
  bot: botAction, botDelay: s => 1400 + Math.random() * Math.min(5000, s.opts.time * 220), botNames: ['Mochi', 'Bơ', 'Pudding', 'Kẹo', 'Xôi', 'Đậu', 'Nấm'],
};
