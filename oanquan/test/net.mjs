// Test đồng bộ online Ô Ăn Quan: 2 engine áp cùng 1 chuỗi action phải ra
// state serialize giống hệt nhau sau MỖI action (cứu dân, ăn dây, ăn Quan,
// kết thúc ván đều phải khớp — luật cứu dân nằm trọn trong applyMove nên
// không có lựa chọn nào ngoài action). Chạy: node oanquan/test/net.mjs
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { chooseMove } from '../js/bot.js';

const P1 = { id: 'host', name: 'Chủ phòng' }, P2 = { id: 'pXyz12', name: 'Khách' };
const canon = s => JSON.stringify(E.cloneState(s));
const freshPair = (opts) => {
  const a = E.createGame([P1, P2], opts), b = E.createGame([P1, P2], opts);
  a.gid = b.gid = 'net-test'; /* gid ngẫu nhiên khi tạo — ép bằng nhau để so sánh */
  return [a, b];
};
/* RNG có seed để chuỗi ván lặp lại được */
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };
const cover = { eat: false, chain2: false, eatQuan: false, rescue: false, convert: false, borrow: false, end: false };
const note = r => {
  if (!r || !r.ok) return;
  if ((r.eaten?.q || 0) + (r.eaten?.d || 0) > 0) cover.eat = true;
  if ((r.chain || 0) >= 2) cover.chain2 = true;
  if ((r.eaten?.q || 0) > 0) cover.eatQuan = true;
  if (r.rescue && !r.rescue.failed) { cover.rescue = true; if (r.rescue.converted > 0) cover.convert = true; if (r.rescue.borrowed > 0) cover.borrow = true; }
  if (r.ended) cover.end = true;
};

test('lockstep 30 ván ngẫu nhiên (seed cố định): state giống nhau sau mỗi action', () => {
  for (let g = 0; g < 30; g++) {
    const [a, b] = freshPair({ quanValue: g % 2 ? 5 : 10 });
    const r = rng(1000 + g);
    let moves = 0;
    while (a.phase === 'playing' && moves < 500) {
      const pid = a.turn;
      const legal = E.legalMoves(a, pid);
      assert.ok(legal.length > 0, `ván ${g}: hết nước hợp lệ mà chưa kết thúc`);
      const m = legal[Math.floor(r() * legal.length)];
      const act = { type: 'move', cell: m.cell, dir: m.dir };
      /* action đi qua JSON (như khi gửi qua mạng) rồi mới áp */
      assert.deepEqual(JSON.parse(JSON.stringify(act)), act, 'action JSON round-trip');
      const ra = E.applyAction(a, pid, JSON.parse(JSON.stringify(act)));
      const rb = E.applyAction(b, pid, JSON.parse(JSON.stringify(act)));
      assert.ok(ra.ok && rb.ok, `ván ${g} nước ${moves}: action bị từ chối`);
      assert.equal(canon(a), canon(b), `ván ${g} nước ${moves}: state 2 bên lệch nhau`);
      note(ra);
      moves++;
    }
    assert.equal(a.phase, 'ended', `ván ${g}: chưa kết thúc sau ${moves} nước`);
    assert.equal(canon(a), canon(b), `ván ${g}: state cuối lệch nhau`);
    assert.deepEqual(E.viewFor(a, 'host'), E.viewFor(b, 'host'), `ván ${g}: view chủ phòng lệch nhau`);
  }
});

/* Tìm 1 tình huống (state + nước đi) thỏa điều kiện, bằng cách chơi ngẫu nhiên
   có seed và thử mọi nước hợp lệ ở mỗi lượt trên bản sao. */
function findCase(seed, pred, maxGames = 60) {
  for (let g = 0; g < maxGames; g++) {
    const s = E.createGame([P1, P2], { quanValue: 10 });
    s.gid = 'net-test';
    const r = rng(seed * 1000 + g);
    let guard = 0;
    while (s.phase === 'playing' && guard++ < 300) {
      for (const m of E.legalMoves(s, s.turn)) {
        const c = E.cloneState(s), rr = E.applyMove(c, s.turn, m);
        if (rr.ok && pred(rr, c)) return { state: s, move: m };
      }
      const moves = E.legalMoves(s, s.turn);
      const ok = E.applyMove(s, s.turn, moves[Math.floor(r() * moves.length)]);
      if (!ok.ok) break;
    }
  }
  return null;
}
function lockstepCase(name, found, check) {
  test(name, () => {
    assert.ok(found, 'không tìm được tình huống mẫu');
    const a = E.cloneState(found.state), b = E.cloneState(found.state);
    const act = { type: 'move', cell: found.move.cell, dir: found.move.dir };
    const ra = E.applyAction(a, a.turn, JSON.parse(JSON.stringify(act)));
    const rb = E.applyAction(b, b.turn, JSON.parse(JSON.stringify(act)));
    assert.ok(ra.ok && rb.ok);
    assert.equal(canon(a), canon(b), 'state 2 bên lệch nhau');
    note(ra);
    if (check) check(ra, a);
  });
}
lockstepCase('ăn dây (chain ≥ 2): 2 bên khớp', findCase(7, rr => (rr.chain || 0) >= 2), (r) => assert.ok(r.chain >= 2));
lockstepCase('ăn Quan: 2 bên khớp', findCase(11, rr => (rr.eaten?.q || 0) > 0), (r) => assert.ok(r.eaten.q > 0));

/* Cứu dân — dựng state tay để ép đủ 4 trường hợp, lượt của p1 đi trước rồi p2 được cứu. */
function rescueSetup({ bagD, bagQ, foeBagD }) {
  const s = E.createGame([P1, P2], { quanValue: 10 });
  s.gid = 'net-test';
  for (const c of [1, 2, 3, 4, 5]) s.cells[c] = { q: 0, d: 0 }; /* 5 ô của p2 trống */
  s.players[1].bag = { q: bagQ, d: bagD };
  s.players[0].bag = { q: 0, d: foeBagD };
  return s;
}
function rescueCase(name, setup, check) {
  test(name, () => {
    const a = rescueSetup(setup), b = rescueSetup(setup);
    const act = { type: 'move', cell: 7, dir: 1 }; /* p1 rải, hết lượt → tới lượt p2, p2 phải cứu dân */
    const ra = E.applyAction(a, 'host', JSON.parse(JSON.stringify(act)));
    const rb = E.applyAction(b, 'host', JSON.parse(JSON.stringify(act)));
    assert.ok(ra.ok && rb.ok);
    assert.equal(canon(a), canon(b), 'state 2 bên lệch nhau sau cứu dân');
    note(ra);
    check(ra, a);
  });
}
rescueCase('cứu dân đủ điểm trong túi: 2 bên khớp', { bagD: 5, bagQ: 0, foeBagD: 0 }, (r, s) => {
  assert.ok(r.rescue && !r.rescue.failed);
  assert.equal(r.rescue.fromBag, 5); assert.equal(r.rescue.converted, 0); assert.equal(r.rescue.borrowed, 0);
  assert.deepEqual(s.players[1].bag, { q: 0, d: 0 });
  for (const c of [1, 2, 3, 4, 5]) assert.equal(s.cells[c].d, 1);
});
rescueCase('cứu dân đổi 1 Quan = 10 Dân: 2 bên khớp', { bagD: 2, bagQ: 1, foeBagD: 0 }, (r, s) => {
  assert.ok(r.rescue && !r.rescue.failed);
  assert.equal(r.rescue.fromBag, 2); assert.equal(r.rescue.converted, 1); assert.equal(r.rescue.borrowed, 0);
  assert.deepEqual(s.players[1].bag, { q: 0, d: 7 }); /* 2 + 10 − 5 = 7 */
  for (const c of [1, 2, 3, 4, 5]) assert.equal(s.cells[c].d, 1);
});
rescueCase('cứu dân vay đối phương: 2 bên khớp, nợ ghi đúng', { bagD: 0, bagQ: 0, foeBagD: 7 }, (r, s) => {
  assert.ok(r.rescue && !r.rescue.failed);
  assert.equal(r.rescue.fromBag, 0); assert.equal(r.rescue.converted, 0); assert.equal(r.rescue.borrowed, 5);
  assert.equal(s.players[1].debt, 5);
  assert.deepEqual(s.players[0].bag, { q: 0, d: 2 }); /* 7 − 5 */
  for (const c of [1, 2, 3, 4, 5]) assert.equal(s.cells[c].d, 1);
});
rescueCase('không cứu được dân → ván kết thúc ngay: 2 bên khớp', { bagD: 0, bagQ: 0, foeBagD: 3 }, (r, s) => {
  assert.ok(r.rescueFailed);
  assert.equal(s.phase, 'ended'); assert.equal(s.endReason, 'rescue');
  assert.ok(s.scores);
});

test('applyAction từ chối action sai', () => {
  const [a] = freshPair();
  assert.equal(E.applyAction(a, 'host', { type: 'bogus' }).ok, false);
  assert.equal(E.applyAction(a, 'host', { type: 'move', cell: 7, dir: 0 }).ok, false);
  assert.equal(E.applyAction(a, 'host', { type: 'move', cell: 0, dir: 1 }).ok, false); /* ô Quan, không phải ô dân mình */
  assert.equal(E.applyAction(a, 'host', { type: 'move', cell: 1, dir: 1 }).ok, false); /* ô của đối phương */
  assert.equal(E.applyAction(a, 'pXyz12', { type: 'move', cell: 1, dir: 1 }).ok, false); /* chưa tới lượt khách */
  assert.equal(E.applyAction(a, 'host', null).ok, false);
  assert.equal(E.applyAction(a, 'host', { type: 'move', cell: 7, dir: 1 }).ok, true);
});

test('bot chọn nước nào thì applyAction cũng nhận (cả 2 mức)', () => {
  const [a] = freshPair();
  for (const lvl of ['easy', 'hard']) {
    const m = chooseMove(a, 'host', lvl);
    assert.ok(m && typeof m.cell === 'number' && (m.dir === 1 || m.dir === -1), 'bot ' + lvl + ' trả nước lạ');
    const c = E.cloneState(a);
    assert.ok(E.applyAction(c, 'host', { type: 'move', cell: m.cell, dir: m.dir }).ok, 'bot ' + lvl + ' ra nước không hợp lệ');
  }
});

test('viewFor 2 bên: cùng bàn/cùng điểm, khác me/mySide, có trace, JSON được', () => {
  const [a, b] = freshPair();
  E.applyAction(a, 'host', { type: 'move', cell: 7, dir: 1 });
  E.applyAction(b, 'host', { type: 'move', cell: 7, dir: 1 });
  const vh = E.viewFor(a, 'host'), vg = E.viewFor(b, 'pXyz12');
  assert.deepEqual(vh.cells, vg.cells);
  assert.deepEqual(vh.players, vg.players);
  assert.equal(vh.me, 'host'); assert.equal(vg.me, 'pXyz12');
  assert.deepEqual(vh.mySide, [7, 8, 9, 10, 11]); assert.deepEqual(vg.mySide, [1, 2, 3, 4, 5]);
  assert.ok(Array.isArray(vh.trace) && vh.trace.length > 0, 'view thiếu trace nước vừa đi');
  assert.equal(vh.trace[0].t, 'pickup'); assert.equal(vh.trace[0].cell, 7);
  assert.deepEqual(JSON.parse(JSON.stringify(vh)), vh, 'view JSON round-trip');
  assert.equal(vh.seq, 1);
});

test('bao phủ: ăn thường, ăn dây, ăn Quan, cứu dân (đủ/đổi/vay), kết thúc ván', () => {
  for (const [k, v] of Object.entries(cover)) assert.ok(v, 'chưa gặp trường hợp: ' + k);
});

console.log(`\n${pass} test đạt. Bao phủ: ${Object.entries(cover).map(([k, v]) => k + '=' + (v ? '✓' : '✗')).join(' ')}`);
