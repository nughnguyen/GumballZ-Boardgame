// Unit test luật Bắn Tàu. Chạy: node bantau/test/rules.mjs
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';

let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };
const P = () => [{ id: 'p0', name: 'A' }, { id: 'p1', name: 'B' }];
/* đội hình cố định: tàu nằm ngang hàng A (0-4), B (10-13), C (20-22), D (30-32), E (40-41) */
const FLEET_A = { carrier: [0, 1, 2, 3, 4], battleship: [10, 11, 12, 13], cruiser: [20, 21, 22], submarine: [30, 31, 32], destroyer: [40, 41] };
const FLEET_B = { carrier: [90, 91, 92, 93, 94], battleship: [80, 81, 82, 83], cruiser: [70, 71, 72], submarine: [60, 61, 62], destroyer: [50, 51] };
function started() {
  const s = E.createGame(P());
  assert.equal(E.applyAction(s, 'p0', { type: 'ready', ships: FLEET_A }).ok, true);
  assert.equal(E.applyAction(s, 'p1', { type: 'ready', ships: FLEET_B }).ok, true);
  assert.equal(s.phase, 'battle');
  return s;
}
test('đặt tàu: thiếu tàu / đè nhau / chéo / tràn bảng đều bị từ chối', () => {
  const bad1 = { ...FLEET_A }; delete bad1.destroyer;
  assert.equal(E.validateFleet(bad1).ok, false);
  const bad2 = { ...FLEET_A, destroyer: [0, 41] }; /* đè ô 0 của carrier */
  assert.equal(E.validateFleet(bad2).ok, false);
  const bad3 = { ...FLEET_A, destroyer: [40, 51] }; /* chéo */
  assert.equal(E.validateFleet(bad3).ok, false);
  const bad4 = { ...FLEET_A, carrier: [6, 7, 8, 9, 10] }; /* tràn hàng */
  assert.equal(E.validateFleet(bad4).ok, false);
  const bad5 = { ...FLEET_A, carrier: [90, 91, 92, 93, 104] }; /* tràn ô */
  assert.equal(E.validateFleet(bad5).ok, false);
  assert.equal(E.validateFleet(FLEET_A).ok, true);
  assert.equal(E.validateFleet(FLEET_B).ok, true);
});
test('xếp ngẫu nhiên luôn hợp lệ (1000 lần)', () => {
  for (let i = 0; i < 1000; i++) assert.equal(E.validateFleet(E.randomFleet()).ok, true);
});
test('bắn trượt / trúng / bắn lại ô cũ / bắn khi chưa tới lượt', () => {
  const s = started();
  assert.equal(E.applyAction(s, 'p1', { type: 'fire', cell: 90 }).ok, false); /* chưa tới lượt p1 */
  let r = E.applyAction(s, 'p0', { type: 'fire', cell: 5 }); assert.equal(r.ok, true); assert.equal(s.players[0].shots[5], 'miss');
  assert.equal(s.turn, 'p1'); /* đổi lượt */
  r = E.applyAction(s, 'p1', { type: 'fire', cell: 0 }); assert.equal(r.ok, true); assert.equal(s.players[1].shots[0], 'hit');
  assert.equal(s.turn, 'p1'); /* bắn trúng được bắn tiếp */
  assert.equal(s.players[1].coins, E.COINS_START + E.COIN_HIT);
  r = E.applyAction(s, 'p0', { type: 'fire', cell: 5 }); assert.equal(r.ok, false); /* bắn lại ô đã bắn */
});
test('đánh chìm 1 tàu: đủ ô thì chìm, +100 xu, ghi tên tàu', () => {
  const s = started();
  for (const c of [50, 51]) { E.applyAction(s, 'p0', { type: 'fire', cell: c }); E.applyAction(s, 'p1', { type: 'fire', cell: 5 + c }); }
  assert.deepEqual(s.players[0].sunk, ['destroyer']);
  assert.equal(s.players[0].coins, E.COINS_START + 2 * E.COIN_HIT + E.COIN_SINK);
  assert.ok(s.log.some(l => l.text.includes('Tàu khu trục')));
});
test('thắng khi chìm hết 5 tàu (17 ô)', () => {
  const s = started();
  const cells = [90, 91, 92, 93, 94, 80, 81, 82, 83, 70, 71, 72, 60, 61, 62, 50, 51];
  let i = 0;
  for (const c of cells) {
    E.applyAction(s, 'p0', { type: 'fire', cell: c });
    if (s.phase === 'ended') break;
    E.applyAction(s, 'p1', { type: 'fire', cell: 5 + (i++) }); /* p1 bắn trượt lung tung */
  }
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'p0');
  assert.equal(E.applyAction(s, 'p0', { type: 'fire', cell: 55 }).ok, false); /* ván xong không bắn được nữa */
});
test('mua vật phẩm: đủ xu mới mua được, đúng giới hạn, trừ tiền đúng giá', () => {
  const s = started();
  const me = s.players[0];
  assert.equal(E.applyAction(s, 'p0', { type: 'buy', item: 'nuke' }).ok, true);
  assert.equal(me.coins, E.COINS_START - 300);
  assert.equal(E.applyAction(s, 'p0', { type: 'buy', item: 'nuke' }).ok, false); /* tối đa 1 */
  me.coins = 1000;
  assert.equal(E.applyAction(s, 'p0', { type: 'buy', item: 'trap' }).ok, true);
  assert.equal(E.applyAction(s, 'p0', { type: 'buy', item: 'trap' }).ok, true);
  assert.equal(me.coins, 1000 - 300);
  assert.equal(E.applyAction(s, 'p0', { type: 'buy', item: 'trap' }).ok, false); /* tối đa 2 */
  me.coins = 100;
  assert.equal(E.applyAction(s, 'p0', { type: 'buy', item: 'radar' }).ok, false); /* không đủ xu */
});
test('bẫy: đặt lên ô có tàu, bắn đúng ô bẫy thì vô hiệu + lộ vị trí tàu địch cùng tọa độ', () => {
  const s = started();
  const p0 = s.players[0], p1 = s.players[1];
  assert.equal(E.applyAction(s, 'p0', { type: 'buy', item: 'trap' }).ok, true);
  assert.equal(E.applyAction(s, 'p0', { type: 'place-trap', cell: 5 }).ok, false); /* ô 5 không có tàu mình */
  assert.equal(E.applyAction(s, 'p0', { type: 'place-trap', cell: 0 }).ok, true);
  /* đặt bẫy xong đã đổi lượt sang p1 */
  assert.equal(E.applyAction(s, 'p1', { type: 'fire', cell: 0 }).ok, true); /* p1 bắn đúng ô bẫy */
  assert.equal(s.turn, 'p0'); /* bị bẫy vô hiệu thì đổi lượt */
  assert.equal(p0.hits.includes(0), false); /* tàu mình không mất ô đó */
  assert.equal(p1.shots[0], 'void');
  assert.equal(p0.reveals[0], 'water'); /* p0 biết: ô 0 bên p1 là nước trống (fleet p1 ở hàng F-J) */
  assert.equal(p0.traps[0].used, true);
  /* ô bị bẫy vô hiệu thì bắn lại được (bẫy chỉ chặn 1 lần), lần sau trúng thật */
  E.applyAction(s, 'p0', { type: 'fire', cell: 6 });
  const r2 = E.applyAction(s, 'p1', { type: 'fire', cell: 0 });
  assert.equal(r2.ok, true); assert.equal(p1.shots[0], 'hit');
  assert.equal(p0.hits.includes(0), true);
  /* bẫy lộ "có tàu": dùng fleet chồng ô – p1 có tàu ở ô 40 */
  const s2 = E.createGame(P());
  const FB2 = { carrier: [90, 91, 92, 93, 94], battleship: [80, 81, 82, 83], cruiser: [70, 71, 72], submarine: [60, 61, 62], destroyer: [40, 41] };
  E.applyAction(s2, 'p0', { type: 'ready', ships: FLEET_A });
  E.applyAction(s2, 'p1', { type: 'ready', ships: FB2 });
  E.applyAction(s2, 'p0', { type: 'buy', item: 'trap' });
  assert.equal(E.applyAction(s2, 'p0', { type: 'place-trap', cell: 40 }).ok, true);
  /* đặt bẫy xong đã đổi lượt sang p1 */
  E.applyAction(s2, 'p1', { type: 'fire', cell: 40 }); /* p1 bắn đúng ô bẫy */
  assert.equal(s2.players[0].reveals[40], 'ship'); /* p0 biết: ô 40 bên p1 có tàu */
  assert.equal(s2.players[1].shots[40], 'void');
});
test('radar: lộ đúng các ô có thuyền trong vùng 3×3, chỉ người dùng thấy; dùng 1 lần và hết lượt', () => {
  const s = started();
  E.applyAction(s, 'p0', { type: 'buy', item: 'radar' });
  let r = E.applyAction(s, 'p0', { type: 'radar', cell: 91 }); /* 3×3 quanh 91: trúng carrier [90,91,92] + battleship [80,81,82] của p1 */
  assert.equal(r.ok, true); assert.equal(r.hasShip, true);
  assert.deepEqual(r.shipCells, [80, 81, 82, 90, 91, 92]);
  assert.deepEqual(s.players[0].scans[0].shipCells, [80, 81, 82, 90, 91, 92]);
  assert.equal(s.turn, 'p1'); /* radar tốn lượt */
  /* chỉ người dùng radar thấy ô đã lộ – đối thủ không thấy gì */
  const v0 = E.viewFor(s, 'p0');
  assert.deepEqual(v0.you.scans[0].shipCells, [80, 81, 82, 90, 91, 92]);
  const v1 = E.viewFor(s, 'p1');
  assert.deepEqual(v1.you.scans, []);
  assert.equal(JSON.stringify(v1).includes('shipCells'), false); /* view của p1 không có shipCells */
  E.applyAction(s, 'p1', { type: 'fire', cell: 5 });
  r = E.applyAction(s, 'p0', { type: 'radar', cell: 91 }); assert.equal(r.ok, false); /* chỉ 1 lần */
  /* radar vùng trống: không lộ ô nào */
  const s2 = started();
  E.applyAction(s2, 'p0', { type: 'buy', item: 'radar' });
  r = E.applyAction(s2, 'p0', { type: 'radar', cell: 44 }); /* quanh 44 không có tàu p1 */
  assert.equal(r.hasShip, false);
  assert.deepEqual(r.shipCells, []);
  assert.equal(s2.players[0].scans.length, 1);
});
test('viewFor: tàu chìm lộ đúng ô từng tàu, tàu chưa chìm không lộ', () => {
  const s = started();
  E.applyAction(s, 'p0', { type: 'fire', cell: 50 });
  E.applyAction(s, 'p0', { type: 'fire', cell: 51 }); /* chìm khu trục của p1 */
  const v = E.viewFor(s, 'p0');
  assert.deepEqual(v.foe.sunkShips, [{ id: 'destroyer', cells: [50, 51] }]);
  assert.equal(JSON.stringify(v.foe.sunkShips).includes('90'), false); /* carrier chưa chìm không lộ */
  assert.equal(v.foe.sunkByMe.includes('destroyer'), true);
  /* phía p1: không thấy gì về fleet của p0 (chưa chìm tàu nào của p0) */
  const v1 = E.viewFor(s, 'p1');
  assert.deepEqual(v1.foe.sunkShips, []);
  assert.equal(JSON.stringify(v1).includes('[0,1,2,3,4]'), false); /* carrier của p0 không lộ */
  assert.equal('fleet' in v1.foe, false);
});
test('bot: dùng ô radar đã lộ để bắn tiếp', () => {
  const s = started();
  const bot = s.players[1];
  bot.scans.push({ cells: [80, 81, 82, 90, 91, 92], hasShip: true, shipCells: [90, 91], n: 1 });
  s.turn = 'p1'; /* tới lượt bot */
  const a = botAction(s, 'p1');
  assert.equal(a.type, 'fire');
  assert.ok([90, 91].includes(a.cell), 'bot bắn ô radar đã lộ, được ' + a.cell);
  /* ô radar đã bắn rồi thì không bắn lại, chuyển sang ô lộ còn lại */
  bot.shots[90] = 'hit';
  const a2 = botAction(s, 'p1');
  assert.equal(a2.type, 'fire');
  assert.equal(a2.cell, 91);
});
test('bom hạt nhân: nổ 3×3, trúng/trượt từng ô, có thể chìm tàu', () => {
  const s = started();
  E.applyAction(s, 'p0', { type: 'buy', item: 'nuke' });
  const r = E.applyAction(s, 'p0', { type: 'nuke', cell: 51 }); /* 3×3 quanh 51: trúng 50, 51 (khu trục) + 60, 61, 62 (tàu ngầm) */
  assert.equal(r.ok, true); assert.equal(r.hits, 5);
  assert.deepEqual(s.players[0].sunk, ['destroyer', 'submarine']); /* khu trục 2 ô + tàu ngầm 3 ô cùng chìm */
  assert.equal(s.players[0].coins, E.COINS_START - 300 + 5 * E.COIN_HIT + 2 * E.COIN_SINK);
  assert.equal(s.turn, 'p1'); /* bom dùng xong là hết lượt, dù có ô trúng */
  assert.equal(E.applyAction(s, 'p1', { type: 'buy', item: 'nuke' }).ok, true);
  const r2 = E.applyAction(s, 'p1', { type: 'nuke', cell: 51 });
  assert.equal(r2.ok, true); /* dùng lần 2 bị chặn ở lần sau */
  assert.equal(E.applyAction(s, 'p1', { type: 'nuke', cell: 51 }).ok, false);
});
test('bắn trúng được bắn tiếp, chìm tàu cũng được bắn tiếp, turnNo không tăng', () => {
  const s = started();
  assert.equal(s.turnNo, 1);
  let r = E.applyAction(s, 'p0', { type: 'fire', cell: 50 }); /* trúng khu trục của p1 */
  assert.equal(r.ok, true); assert.equal(r.res, 'hit');
  assert.equal(s.turn, 'p0'); assert.equal(s.turnNo, 1); /* vẫn lượt p0, cùng lượt */
  r = E.applyAction(s, 'p0', { type: 'fire', cell: 51 }); /* chìm khu trục */
  assert.equal(r.ok, true); assert.equal(r.res, 'sink');
  assert.equal(s.turn, 'p0'); assert.equal(s.turnNo, 1);
  r = E.applyAction(s, 'p0', { type: 'fire', cell: 5 }); /* trượt */
  assert.equal(r.ok, true); assert.equal(r.res, 'miss');
  assert.equal(s.turn, 'p1'); assert.equal(s.turnNo, 2); /* trượt mới đổi lượt, turnNo +1 */
});
test('chuỗi: trúng, trúng, trượt → lượt chỉ đổi sau phát trượt', () => {
  const s = started();
  E.applyAction(s, 'p0', { type: 'fire', cell: 90 }); /* trúng carrier */
  assert.equal(s.turn, 'p0');
  E.applyAction(s, 'p0', { type: 'fire', cell: 91 }); /* trúng tiếp */
  assert.equal(s.turn, 'p0'); assert.equal(s.turnNo, 1);
  E.applyAction(s, 'p0', { type: 'fire', cell: 5 }); /* trượt */
  assert.equal(s.turn, 'p1'); assert.equal(s.turnNo, 2);
  /* tới lượt p1: p1 trúng thì cũng được bắn tiếp */
  E.applyAction(s, 'p1', { type: 'fire', cell: 0 });
  assert.equal(s.turn, 'p1'); assert.equal(s.turnNo, 2);
});
test('vật phẩm hỗ trợ dùng xong là hết lượt, dù trước đó có bắn trúng', () => {
  const s = started();
  /* bom có ô trúng vẫn đổi lượt */
  E.applyAction(s, 'p0', { type: 'buy', item: 'nuke' });
  const r = E.applyAction(s, 'p0', { type: 'nuke', cell: 51 });
  assert.equal(r.ok, true); assert.equal(r.hits, 5);
  assert.equal(s.turn, 'p1'); /* dùng bom xong là hết lượt, dù trúng 5 ô */
  /* đặt bẫy tốn lượt */
  E.applyAction(s, 'p1', { type: 'buy', item: 'trap' });
  assert.equal(E.applyAction(s, 'p1', { type: 'place-trap', cell: 90 }).ok, true);
  assert.equal(s.turn, 'p0'); /* đặt bẫy xong đổi lượt */
  /* mua vật phẩm không tốn lượt: mua xong vẫn bắn được */
  E.applyAction(s, 'p0', { type: 'buy', item: 'radar' });
  assert.equal(s.turn, 'p0');
  const r2 = E.applyAction(s, 'p0', { type: 'fire', cell: 90 }); /* ô 90 chưa bắn (ô 50 đã trúng từ vụ nổ bom trước đó) */
  assert.equal(r2.ok, true); /* mua xong vẫn bắn được trong lượt đó */
});
test('chuỗi: bắn trúng → đặt bẫy → lượt đổi, không được bắn tiếp', () => {
  const s = started();
  E.applyAction(s, 'p0', { type: 'buy', item: 'trap' });
  let r = E.applyAction(s, 'p0', { type: 'fire', cell: 50 }); /* trúng */
  assert.equal(r.ok, true); assert.equal(r.res, 'hit');
  assert.equal(s.turn, 'p0'); /* trúng được bắn tiếp */
  r = E.applyAction(s, 'p0', { type: 'place-trap', cell: 0 }); /* đặt bẫy lên tàu mình */
  assert.equal(r.ok, true);
  assert.equal(s.turn, 'p1'); /* đặt bẫy xong hết lượt */
  assert.equal(E.applyAction(s, 'p0', { type: 'fire', cell: 51 }).ok, false); /* không được bắn tiếp */
});
test('bot: setup xếp tàu hợp lệ, bắn hợp lệ, không bắn lại ô cũ', () => {
  const s = E.createGame(P());
  let a = botAction(s, 'p0'); assert.equal(a.type, 'ready');
  assert.equal(E.applyAction(s, 'p0', a).ok, true);
  a = botAction(s, 'p1'); assert.equal(a.type, 'ready');
  assert.equal(E.applyAction(s, 'p1', a).ok, true);
  assert.equal(s.phase, 'battle');
  for (let i = 0; i < 300 && s.phase === 'battle'; i++) {
    const pid = s.turn;
    a = botAction(s, pid);
    assert.ok(a, 'bot không đi ' + pid);
    const r = E.applyAction(s, pid, a);
    assert.equal(r.ok, true, JSON.stringify({ a, pid, turn: s.turn }));
  }
  assert.equal(s.phase, 'ended');
});
test('viewFor: không lộ fleet địch, chỉ thấy tàu chìm', () => {
  const s = started();
  E.applyAction(s, 'p0', { type: 'fire', cell: 50 });
  const v = E.viewFor(s, 'p0');
  assert.ok(v.you.fleet.carrier);
  assert.equal(JSON.stringify(v.you.fleet).includes('90'), false); /* fleet mình không có ô 90 */
  assert.equal('fleet' in v.foe, false); /* fleet địch không có trong view */
  assert.equal(v.you.shots[50], 'hit'); /* phát bắn của mình ghi trên lưới mục tiêu */
  assert.equal(v.foe.shots[0], undefined); /* địch chưa bắn gì */
  const v1 = E.viewFor(s, 'p1');
  assert.equal(v1.you.fleet.carrier[0], 90);
  assert.equal(v1.spec, undefined);
  const spec = E.viewFor(s, 'xxx');
  assert.equal(spec.you, null);
});
console.log(`\n${pass} test đạt.`);
