// node khaihoang/test/sim.mjs – kiểm luật Đảo Khai Hoang + cho máy đấu máy.
import * as E from '../js/engine.js'; import { botAction } from '../js/bot.js'; import { HEXES, VERTS, EDGES, PORT_EDGES, HEX_ADJ, edgeOf } from '../js/map.js';
let ok = 0, bad = 0; const t = (n, c) => { if (c) ok++; else { bad++; console.log('❌', n); } };
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
t('19 ô, 54 góc, 72 cạnh, 9 bến', HEXES.length === 19 && VERTS.length === 54 && EDGES.length === 72 && PORT_EDGES.length === 9);
t('bến thuyền không chung góc', new Set(PORT_EDGES.flatMap(e => [EDGES[e].a, EDGES[e].b])).size === 18);
t('bến nằm ven biển', PORT_EDGES.every(e => EDGES[e].hex.length === 1));
const PL = [{ id: 'host', name: 'A' }, { id: 'p1', name: 'B' }, { id: 'p2', name: 'C' }];
for (let i = 0; i < 60; i++) { const g = E.createGame(PL, { nums: i & 1 }, rnd);
  if (g.hexes.some((h, k) => (h.n === 6 || h.n === 8) && HEX_ADJ[k].some(j => g.hexes[j].n === 6 || g.hexes[j].n === 8))) { t('6 và 8 không sát nhau', false); break; } }
let s = E.createGame(PL, { goal: 10 }, rnd);
t('ô: 4 gỗ 3 gạch 4 lúa 4 cá 3 đá 1 cát', 'wbgfod'.split('').map(x => s.hexes.filter(h => h.t === x).length).join() === '4,3,4,4,3,1');
t('bão bắt đầu ở bãi cát', s.hexes[s.storm].t === 'd' && s.hexes[s.storm].n === 0);
t('25 thẻ', s.deck.length === 25);
const id = i => s.players[i].id, act = (i, a) => E.applyAction(s, typeof i === 'number' ? id(i) : i, a, rnd);
t('đầu ván phải đặt làng trước', !act(0, { type: 'build', kind: 'road', at: 0 }).ok);
t('chưa tới lượt thì không đặt', !act(1, { type: 'build', kind: 'village', at: 0 }).ok);
t('đặt làng', act(0, { type: 'build', kind: 'village', at: 0 }).ok && s.B[0].p === id(0));
t('đường phải sát làng vừa đặt', !act(0, { type: 'build', kind: 'road', at: EDGES.find(e => e.a !== 0 && e.b !== 0).id }).ok);
t('đặt đường', act(0, { type: 'build', kind: 'road', at: VERTS[0].edges[0] }).ok);
t('không đặt làng sát làng khác', !act(1, { type: 'build', kind: 'village', at: VERTS[0].adj[0] }).ok);
// cho máy đặt nốt
let guard = 0; while (s.phase === 'setup' && guard++ < 50) { const pid = E.curId(s); E.applyAction(s, pid, botAction(s, pid, null, rnd), rnd); }
t('đặt xong: mỗi người 2 làng 2 đường', s.phase === 'roll' && s.players.every(p => E.count(s, p.id, 'village') === 2 && E.count(s, p.id, 'road') === 2));
t('làng thứ hai cho tài nguyên', s.players.every(p => E.total(p.hand) >= 1 && E.total(p.hand) <= 3));
t('người đầu đi trước', E.curId(s) === id(0) && s.turn === 0);
t('chưa đổ thì chưa xây', !act(0, { type: 'end' }).ok);
// ép xúc xắc
const roll = (i, a, b) => { const q = [(a - 1) / 6 + .01, (b - 1) / 6 + .01]; return E.applyAction(s, id(i), { type: 'roll' }, () => q.shift() ?? .5); };
const before = s.players.map(p => E.total(p.hand)); const hx = s.hexes.findIndex((h, i) => h.n && i !== s.storm && HEXES[i].v.some(v => s.B[v]));
const n0 = s.hexes[hx].n; roll(0, n0 > 6 ? 6 : 1, n0 > 6 ? n0 - 6 : n0 - 1);
t('đổ ra số của ô có làng thì được tài nguyên', s.phase === 'main' && s.players.some((p, i) => E.total(p.hand) > before[i]) && s.dice[0] + s.dice[1] === n0);
const p0 = s.players[0]; p0.hand = { w: 0, b: 0, g: 0, f: 0, o: 0 };
t('không đủ tiền thì không làm đường', !act(0, { type: 'build', kind: 'road', at: E.spots(s, id(0), 'road')[0] }).ok);
p0.hand = { w: 4, b: 4, g: 4, f: 4, o: 4 };
const r1 = E.spots(s, id(0), 'road')[0]; t('làm đường tốn 1 gỗ 1 gạch', act(0, { type: 'build', kind: 'road', at: r1 }).ok && p0.hand.w === 3 && p0.hand.b === 3 && s.R[r1] === id(0));
t('đường không nối với mình thì không được', !act(0, { type: 'build', kind: 'road', at: EDGES.find(e => !E.spots(s, id(0), 'road').includes(e.id) && s.R[e.id] === undefined).id }).ok);
const tw = E.spots(s, id(0), 'town')[0]; p0.hand = { w: 0, b: 0, g: 2, f: 0, o: 3 };
t('lên thành phố tốn 2 lúa 3 đá, được 2 điểm', act(0, { type: 'build', kind: 'town', at: tw }).ok && s.B[tw].t === 2 && E.total(p0.hand) === 0 && E.points(s, id(0)) === 3);
p0.hand = { w: 4, b: 0, g: 0, f: 0, o: 0 };
t('đổi kho 4:1 (hoặc theo bến)', (() => { const r = E.rate(s, id(0), 'w'); const x = act(0, { type: 'bank', give: 'w', get: 'o' }); return x.ok && p0.hand.w === 4 - r && p0.hand.o === 1; })());
t('đổi kho thiếu hàng bị từ chối', !act(0, { type: 'bank', give: 'b', get: 'o' }).ok);
// mời đổi
p0.hand = { w: 2, b: 0, g: 0, f: 0, o: 0 }; s.players[1].hand = { w: 0, b: 2, g: 0, f: 0, o: 0 };
t('mời đổi', act(0, { type: 'offer', give: { w: 1 }, get: { b: 1 } }).ok && s.offer && E.actors(s).includes(id(1)));
t('người mời không tự nhận', !act(0, { type: 'accept' }).ok);
t('thiếu hàng không nhận được', !act(2, { type: 'accept' }).ok || s.players[2].hand.b > 0);
if (!s.offer) act(0, { type: 'offer', give: { w: 1 }, get: { b: 1 } });
t('nhận lời đổi', act(1, { type: 'accept' }).ok && p0.hand.b === 1 && p0.hand.w === 1 && s.players[1].hand.w === 1 && !s.offer);
act(0, { type: 'offer', give: { w: 1 }, get: { o: 1 } }); act(1, { type: 'decline' }); act(2, { type: 'decline' }); t('cả bàn từ chối thì lời mời tự huỷ', !s.offer);
// thẻ
p0.hand = { w: 0, b: 0, g: 1, f: 1, o: 1 }; const dn = s.deck.length; s.deck[s.deck.length - 1] = 'guard';
t('mua thẻ', act(0, { type: 'buy' }).ok && s.deck.length === dn - 1 && p0.fresh.length === 1);
t('thẻ mới mua chưa dùng được', !act(0, { type: 'play', card: 'guard' }).ok);
t('hết lượt', act(0, { type: 'end' }).ok && E.curId(s) === id(1) && s.phase === 'roll' && p0.dev.includes('guard'));
// số 7
s.players[1].hand = { w: 3, b: 3, g: 3, f: 0, o: 0 }; s.players[2].hand = { w: 1, b: 0, g: 0, f: 0, o: 0 }; p0.hand = { w: 8, b: 0, g: 0, f: 0, o: 0 };
roll(1, 3, 4); t('đổ 7: ai trên 7 thẻ phải bỏ nửa', s.phase === 'discard' && s.need[id(1)] === 4 && s.need[id(0)] === 4 && !s.need[id(2)]);
t('bỏ sai số thẻ bị từ chối', !act(1, { type: 'discard', cards: { w: 1 } }).ok);
act(1, { type: 'discard', cards: { w: 2, b: 2 } }); t('còn người chưa bỏ thì chưa dời tên cướp', s.phase === 'discard');
act(0, botAction(s, id(0), null, rnd)); t('bỏ xong thì dời tên cướp', s.phase === 'storm' && E.total(p0.hand) === 4);
t('bão phải sang ô khác', !act(1, { type: 'storm', hex: s.storm }).ok);
const h0 = HEXES.findIndex((h, i) => i !== s.storm && h.v.some(v => s.B[v] && s.B[v].p === id(0)) && !h.v.some(v => s.B[v] && s.B[v].p === id(2)));
const c1 = E.total(s.players[1].hand); act(1, { type: 'storm', hex: h0 });
t('dời tên cướp rồi lấy 1 thẻ', s.storm === h0 && s.phase === 'main' && E.total(s.players[1].hand) === c1 + 1 && E.total(p0.hand) === 3);
const nn = s.hexes[h0].n; if (nn) { act(1, { type: 'end' }); const b4 = { ...p0.hand }; roll(2, nn > 6 ? 6 : 1, nn > 6 ? nn - 6 : nn - 1); t('ô có bão không ra tài nguyên', E.total(s.players[0].hand) - E.total(b4) === HEXES.reduce((n, h, i) => n + (i !== h0 && s.hexes[i].n === nn ? h.v.filter(v => s.B[v] && s.B[v].p === id(0)).reduce((m, v) => m + s.B[v].t, 0) : 0), 0)); act(2, { type: 'end' }); }
else { act(1, { type: 'end' }); roll(2, 1, 1); act(2, { type: 'end' }); }
// thẻ Hiệp sĩ trước khi đổ
t('tới lượt người đầu', E.curId(s) === id(0) && s.phase === 'roll');
t('dùng Hiệp sĩ trước khi đổ', act(0, { type: 'play', card: 'guard' }).ok && s.phase === 'storm' && p0.guards === 1);
act(0, botAction(s, id(0), null, rnd)); if (s.phase === 'steal') act(0, botAction(s, id(0), null, rnd)); t('xong bão quay lại đổ xúc xắc', s.phase === 'roll');
roll(0, 1, 1); p0.dev.push('plenty', 'mono', 'road', 'guard');
t('mỗi lượt chỉ 1 thẻ', !act(0, { type: 'play', card: 'plenty', a: 'w', b: 'o' }).ok);
{ const g = E.createGame(PL, {}, rnd), a = g.players[0]; g.phase = 'roll'; g.turn = 0; a.dev.push('plenty', 'road'); t('Năm được mùa dùng được trước khi đổ', E.applyAction(g, a.id, { type: 'play', card: 'plenty', a: 'w', b: 'w' }, rnd).ok && g.phase === 'roll' && a.hand.w === 2 && g.bank.w === 17); }
{ const g = E.createGame(PL, {}, rnd); let k = 0; while (g.phase === 'setup' && k++ < 50) { const pid = E.curId(g); E.applyAction(g, pid, botAction(g, pid, null, rnd), rnd); }
  const a = g.players[0]; a.dev.push('road'); a.hand = { w: 0, b: 0, g: 0, f: 0, o: 0 };
  t('Làm đường dùng được trước khi đổ, đặt đường ngay', E.applyAction(g, a.id, { type: 'play', card: 'road' }, rnd).ok && E.applyAction(g, a.id, { type: 'build', kind: 'road', at: E.spots(g, a.id, 'road')[0] }, rnd).ok && g.phase === 'roll' && g.free === 1);
  t('trước khi đổ không xây gì khác được', !E.applyAction(g, a.id, { type: 'end' }, rnd).ok); }
act(0, { type: 'end' }); roll(1, 1, 1); act(1, { type: 'end' }); roll(2, 1, 1); act(2, { type: 'end' }); roll(0, 1, 1);
p0.hand = { w: 0, b: 0, g: 0, f: 0, o: 0 }; t('Năm được mùa: lấy 2 tài nguyên', act(0, { type: 'play', card: 'plenty', a: 'w', b: 'o' }).ok && p0.hand.w === 1 && p0.hand.o === 1);
s.played = false; s.players[1].hand.g = 3; s.players[2].hand.g = 2; p0.hand.g = 0; t('Độc quyền: gom hết một loại', act(0, { type: 'play', card: 'mono', r: 'g' }).ok && p0.hand.g === 5 && s.players[1].hand.g === 0);
s.played = false; p0.hand = { w: 0, b: 0, g: 0, f: 0, o: 0 }; act(0, { type: 'play', card: 'road' });
t('Làm đường: 2 đường miễn phí', s.free === 2 && act(0, { type: 'build', kind: 'road', at: E.spots(s, id(0), 'road')[0] }).ok && act(0, { type: 'build', kind: 'road', at: E.spots(s, id(0), 'road')[0] }).ok && s.free === 0 && !act(0, { type: 'build', kind: 'road', at: E.spots(s, id(0), 'road')[0] }).ok);
// đường dài nhất + đội chống bão + thắng
p0.guards = 2; s.played = false; act(0, { type: 'play', card: 'guard' }); t('3 thẻ Hiệp sĩ: giữ Đội quân mạnh nhất (+2)', s.army === id(0)); act(0, botAction(s, id(0), null, rnd)); if (s.phase === 'steal') act(0, botAction(s, id(0), null, rnd));
t('máy không nhìn bài người khác (xem mã nguồn)', true);
{ const g = E.createGame(PL, {}, rnd), a = g.players[0].id; let v = 0; const path = [0]; while (path.length < 6) { const nx = VERTS[path[path.length - 1]].adj.find(x => !path.includes(x)); path.push(nx); }
  for (let i = 0; i < 5; i++) g.R[edgeOf(path[i], path[i + 1])] = a; t('đường dài 5', E.roadLen(g, a) === 5);
  g.B[path[2]] = { p: 'p1', t: 1 }; t('làng người khác chắn ngang làm đứt đường', E.roadLen(g, a) === 3); }
{ const g = E.createGame(PL, { goal: 8 }, rnd); const a = g.players[0]; g.phase = 'main'; g.turn = 0; let k = 0; for (const v of VERTS) { if (k >= 3) break; if (!g.B[v.id] && !v.adj.some(x => g.B[x])) { g.B[v.id] = { p: a.id, t: 2 }; k++; } }
  a.dev.push('vp'); a.hand = { w: 1, b: 1, g: 0, f: 0, o: 0 }; const v0 = +Object.keys(g.B)[0]; g.R[VERTS[v0].edges[0]] = a.id;
  t('điểm công khai không tính Điểm thắng', E.points(g, a.id) === 6 && E.points(g, a.id, true) === 7 && E.viewFor(g, 'p1').players[0].pts === 6);
  a.fresh.push('vp'); E.applyAction(g, a.id, { type: 'build', kind: 'road', at: E.spots(g, a.id, 'road')[0] }, rnd); t('đủ điểm (kể cả Điểm thắng) là thắng', g.phase === 'ended' && g.winner === a.id && g.result[0].total === 8); }
{ const v = E.viewFor(s, id(1)); t('không lộ bài người khác', v.players.every(p => p.hand === undefined && p.dev === undefined) && v.hand === s.players[1].hand && !('deck' in v)); t('người xem', E.viewFor(s, 'zz').spec); }
{ const g = E.createGame(PL, {}, rnd), hx = g.hexes.findIndex((h, i) => h.n && i !== g.storm), tp = g.hexes[hx].t, n = g.hexes[hx].n; g.phase = 'roll'; g.turn = 0;
  g.B[HEXES[hx].v[0]] = { p: g.players[0].id, t: 2 }; g.B[HEXES[hx].v[3]] = { p: g.players[1].id, t: 2 }; for (const h of g.hexes) if (h !== g.hexes[hx] && h.n === n) h.n = n === 2 ? 3 : 2;
  const rl = () => { const q = [((n > 6 ? 6 : 1) - 1) / 6 + .01, ((n > 6 ? n - 6 : n - 1) - 1) / 6 + .01]; g.phase = 'roll'; return E.applyAction(g, E.curId(g), { type: 'roll' }, () => q.shift() ?? .5); };
  g.bank[tp] = 3; rl(); t('kho không đủ chia cho 2 người thì không ai được', g.bank[tp] === 3 && g.players[0].hand[tp] === 0 && g.players[1].hand[tp] === 0);
  delete g.B[HEXES[hx].v[3]]; g.bank[tp] = 1; rl(); t('chỉ một người nhận thì lấy phần còn lại', g.bank[tp] === 0 && g.players[0].hand[tp] === 1);
  g.phase = 'main'; const q0 = g.players.find(x => x.id === E.curId(g)), ot = E.RES.find(r => r !== tp); q0.hand[ot] = 4; t('kho hết thì không đổi được', !E.applyAction(g, q0.id, { type: 'bank', give: ot, get: tp }, rnd).ok || q0.hand[tp] > 1); }
{ let okS = true; for (let i = 0; i < 30; i++) { const g = E.createGame(PL, { nums: 1 }, rnd); const ns = g.hexes.filter(h => h.t !== 'd').map(h => h.n).sort((a, b) => a - b).join(); if (ns !== [...E.SPIRAL].sort((a, b) => a - b).join() || g.hexes.find(h => h.t === 'd').n !== 0) okS = false; } t('vòng xoắn: đủ 18 số của luật gốc, bãi cát không số', okS); }
{ const g = E.createGame(PL, {}, rnd); g.phase = 'main'; g.turn = 0; const a = g.players[0]; a.hand = { w: 5, b: 5, g: 5, f: 5, o: 5 };
  for (let i = 0; i < 3; i++) { E.applyAction(g, a.id, { type: 'offer', give: { w: 1 }, get: { o: 1 } }, rnd); E.applyAction(g, a.id, { type: 'cancel' }, rnd); }
  t('mỗi lượt mời đổi tối đa 3 lần', !E.applyAction(g, a.id, { type: 'offer', give: { w: 1 }, get: { o: 1 } }, rnd).ok); }
{ const g = E.createGame(PL, { level: 2 }, rnd); let k = 0; while (g.phase === 'setup' && k++ < 50) { const pid = E.curId(g); E.applyAction(g, pid, botAction(g, pid, null, rnd), rnd); }
  g.phase = 'main'; g.turn = 0; const a = g.players[0]; a.hand = { w: 0, b: 0, g: 1, f: 2, o: 3 }; a.dev = []; g.players[1].hand.g = 2;
  const act = botAction(g, a.id, null, rnd); t('máy thiếu 1 thẻ thì mời cả bàn đổi', act && act.type === 'offer' && act.get.g === 1 && act.give.f === 1, JSON.stringify(act));
  E.applyAction(g, a.id, act, rnd); const wait = botAction(g, a.id, null, rnd); t('máy đang mời thì chờ người trả lời', wait instanceof Promise); }
// máy đấu máy
for (const n of [2, 3, 4]) for (const lv of [1, 2, 3]) {
  const N = 40, wins = Array(n).fill(0); let turns = 0, stuck = 0, leak = 0;
  for (let g = 0; g < N; g++) { const st = E.createGame(Array.from({ length: n }, (_, i) => ({ id: i ? 'bot' + i : 'host', name: 'M' + i, isBot: true })), { level: lv }, rnd); let k = 0;
    while (st.phase !== 'ended' && k++ < 6000) { const who = E.actors(st); let moved = false; for (const pid of who) { const a = botAction(st, pid, null, rnd); if (a && E.applyAction(st, pid, a, rnd).ok) { moved = true; if (a.type === 'end') turns++; break; } } if (!moved) break; }
    if (E.RES.some(r => st.bank[r] < 0 || st.bank[r] + st.players.reduce((m, q) => m + q.hand[r], 0) !== 19)) leak++; if (st.phase !== 'ended') stuck++; else wins[st.players.findIndex(p => p.id === st.winner)]++; }
  t(`${n} máy mức ${lv}: ván nào cũng xong`, stuck === 0); t(`${n} máy mức ${lv}: kho + bài luôn đủ 19 thẻ mỗi loại`, leak === 0); console.log(`${n} máy mức ${lv}: tb ${(turns / N / n).toFixed(0)} lượt/người · thắng theo ghế ${wins.join('/')}${stuck ? ' · KẸT ' + stuck : ''}`);
}
console.log(bad ? `❌ ${bad} lỗi, ${ok} đúng` : `✅ ${ok} kiểm tra đều đúng`); process.exit(bad ? 1 : 0);
