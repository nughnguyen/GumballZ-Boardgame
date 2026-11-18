// node xuyenviet/test/sim.mjs – kiểm luật Tàu Xuyên Việt + cho máy đấu máy.
import * as E from '../js/engine.js'; import { botAction } from '../js/bot.js'; import { ROUTES, TICKETS, CITIES, shortest } from '../js/map.js';
let ok = 0, bad = 0; const t = (n, c) => { if (c) ok++; else { bad++; console.log('❌', n); } };
t('28 thành phố, 48 tuyến, 30 vé', Object.keys(CITIES).length === 28 && ROUTES.length === 48 && TICKETS.length === 30);
t('mọi tuyến nối 2 thành phố có thật', ROUTES.every(r => CITIES[r.a] && CITIES[r.b] && r.n >= 1 && r.n <= 6));
t('bản đồ liền một khối', Object.keys(CITIES).every(c => c === 'hanoi' || shortest('hanoi', c)));
t('vé Hà Nội – TP.HCM có điểm', TICKETS[0].pts > 15);
const P = [{ id: 'host', name: 'A' }, { id: 'p1', name: 'B' }];
let s = E.createGame(P, { trains: 30 }, () => 0.3); t('chia 4 thẻ (người đi sau thêm 1) + 3 vé chờ chọn', s.players.every((p, i) => p.hand.length === 4 + i && p.offer.length === 3) && s.up.length === 5 && s.phase === 'tickets');
const a0 = s.players[0], b0 = s.players[1];
t('giữ 1 vé đầu ván bị từ chối', !E.applyAction(s, a0.id, { type: 'keep', ids: [a0.offer[0]] }).ok);
t('chưa chọn vé xong thì chưa được bốc', !E.applyAction(s, a0.id, { type: 'deck' }).ok);
E.applyAction(s, a0.id, { type: 'keep', ids: a0.offer.slice(0, 2) }); E.applyAction(s, b0.id, { type: 'keep', ids: b0.offer.slice() }); t('chọn vé xong thì vào ván', s.phase === 'play' && a0.tickets.length === 2 && b0.tickets.length === 3);
const cur = s.players[s.turn], oth = s.players[1 - s.turn];
t('sai lượt', !E.applyAction(s, oth.id, { type: 'deck' }).ok);
const h0 = cur.hand.length; E.applyAction(s, cur.id, { type: 'deck' }); t('bốc 1 thẻ chưa hết lượt', E.curId(s) === cur.id && cur.hand.length === h0 + 1);
t('bốc dở thì không xây được', !E.applyAction(s, cur.id, { type: 'claim', route: 0, color: 'r' }).ok);
s.up = ['L', 'r', 'b', 'g', 'y']; t('đã bốc 1 thẻ thì không lấy đầu máy ngửa', !E.applyAction(s, cur.id, { type: 'up', i: 0 }).ok);
E.applyAction(s, cur.id, { type: 'up', i: 1 }); t('bốc đủ 2 thẻ thì sang lượt', E.curId(s) === oth.id && s.up.length === 5);
s.up = ['L', 'r', 'b', 'g', 'y']; E.applyAction(s, oth.id, { type: 'up', i: 0 }); t('đầu máy ngửa tính 2 thẻ', E.curId(s) === cur.id);
const r = ROUTES.find(x => x.a === 'hanoi' && x.b === 'haiphong'); cur.hand = ['w', 'L', 'r', 'r'];
t('cách trả: trắng + 1 đầu máy', JSON.stringify(E.payOptions(cur.hand, r)) === '[{"color":"w","locos":1}]');
t('trả sai màu bị từ chối', !E.applyAction(s, cur.id, { type: 'claim', route: r.id, color: 'r' }).ok);
t('xây tuyến', E.applyAction(s, cur.id, { type: 'claim', route: r.id, color: 'w' }).ok && s.owner[r.id] === cur.id && cur.pts === 2 && cur.trains === 28 && cur.hand.join('') === 'rr');
oth.hand = ['w', 'w']; t('tuyến có chủ rồi', !E.applyAction(s, oth.id, { type: 'claim', route: r.id, color: 'w' }).ok);
const gx = ROUTES.find(x => x.c === 'x' && x.n === 2); oth.hand = ['p', 'p', 'k']; t('tuyến xám nhận màu bất kỳ', E.payOptions(oth.hand, gx).some(o => o.color === 'p' && o.locos === 0));
E.applyAction(s, oth.id, { type: 'tickets' }); t('bốc vé giữa ván: giữ ít nhất 1', oth.offer.length === 3 && !E.applyAction(s, oth.id, { type: 'keep', ids: [] }).ok && E.applyAction(s, oth.id, { type: 'keep', ids: [oth.offer[0]] }).ok && E.curId(s) === cur.id);
const v = E.viewFor(s, cur.id); t('không lộ bài + vé người khác', v.hand.length === cur.hand.length && !v.players.some(p => p.hand || p.tickets) && v.players.find(p => p.id === oth.id).cards === oth.hand.length);
s.owner = {}; for (const [a, b] of [['hanoi', 'ninhbinh'], ['ninhbinh', 'thanhhoa'], ['thanhhoa', 'vinh']]) s.owner[ROUTES.find(x => x.a === a && x.b === b).id] = cur.id;
t('đường dài nhất = 5 toa', E.longest(s, cur.id) === 5); t('vé nối được', E.ticketDone(s, cur.id, TICKETS.findIndex(x => x.a === 'hanoi' && x.b === 'hue')) === false);
let seed = 11; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; let turns = 0, done = 0, tot = 0, pts = 0; const seat = [0, 0, 0, 0];
for (let g = 0; g < 60; g++) { s = E.createGame([0, 1, 2, 3].map(i => ({ id: 'b' + i, name: 'B' + i, isBot: true })), { level: 2 }, rnd); let n = 0;
  while (s.phase !== 'ended' && n++ < 4000) { const id = E.actors(s)[0], a = botAction(s, id, null, rnd); if (!a) { t('máy bí nước', false); break; } const r2 = E.applyAction(s, id, a, rnd); if (!r2.ok) { t('máy đi sai: ' + r2.reason + ' ' + JSON.stringify(a), false); break; } turns++; }
  t('ván máy kết thúc', s.phase === 'ended'); if (s.result) { for (const x of s.result) { done += x.tickets.filter(q => q.ok).length; tot += x.tickets.length; pts += x.total; } seat[s.players.findIndex(p => p.id === s.winner)]++; } }
console.log('60 ván 4 máy:', 'tb', Math.round(turns / 60), 'nước/ván · điểm tb', Math.round(pts / 240), '· vé xong', done + '/' + tot, '· thắng theo ghế', seat.join('/'));
console.log(bad ? `❌ ${bad} lỗi` : `✅ ${ok} kiểm tra đều đúng`); process.exit(bad ? 1 : 0);
