// Khai báo luật + máy cho lớp mạng dùng chung (shared/net/simplenet.js). Tách khỏi main.js để máy chủ (server/src/srvhost.js) dùng được – file này không đụng tới trình duyệt.
import * as E from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
export const DEF = {
  srv: true, /* phòng online do máy chủ giữ ván (server/src/srvhost.js) */
  game: 'cholon', min: 3, max: 5, minMsg: 'Chợ Lớn cần 3–5 người: mời bạn vào phòng hoặc thêm bot.',
  defaults: E.DEFAULT_OPTS, optOk: E.optOk, create: E.createGame, apply: E.applyAction, view: E.viewFor, actors: E.actors,
  bot: botAction, botDelay: s => (s.stage === 'keep' ? 900 : 1300) + Math.random() * 700,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Kẹo', 'Xôi', 'Đậu'],
};
