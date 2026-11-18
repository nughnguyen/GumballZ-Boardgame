// Test hệ thống thành tựu (shared/ui/stats.js). Chạy: node shared/ui/test/achievements.mjs
import assert from 'assert/strict';

/* localStorage giả lập (stats.js lưu 'gumballz-stats' vào đây) – phải mock TRƯỚC khi import stats.js */
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
};
const S = await import('../stats.js');
/* document giả lập SAU khi import (stats.js chỉ nạp brag.js khi có document) để toast của dialog.js không vỡ trong Node */
const mockEl = () => ({ style: {}, setAttribute() {}, append() {}, remove() {}, querySelector: () => null, querySelectorAll: () => [] });
globalThis.document = { getElementById: () => null, querySelector: () => null, createElement: mockEl, head: { append() {} }, body: { append() {} }, activeElement: null };

const reset = () => store.clear();
const ids = a => (a || []).map(x => x.id);

let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

test('ACHS có 40+ thành tựu, id duy nhất, đủ trường icon/name/desc/ok', () => {
  assert.ok(S.ACHS.length >= 40, 'chỉ có ' + S.ACHS.length);
  const all = S.ACHS.map(a => a.id);
  assert.equal(new Set(all).size, all.length, 'trùng id');
  for (const a of S.ACHS) assert.ok(a.icon && a.name && a.desc && typeof a.ok === 'function', 'thiếu trường: ' + a.id);
});
test('mỗi game trong 31 game đều có 2 thành tựu riêng', () => {
  for (const g of Object.keys(S.GAME_NAMES)) {
    assert.ok(S.ACHS.some(a => a.id === 'w1_' + g || a.id === 'p1_' + g), g + ' thiếu mốc đầu');
    assert.ok(S.ACHS.some(a => a.id === 'w10_' + g || a.id === 'p10_' + g), g + ' thiếu mốc 10');
  }
});
test('record: thắng 1 ván Bắn Tàu mở w1_bantau + first + w1', () => {
  reset();
  const fresh = S.record('bantau', true);
  assert.ok(ids(fresh).includes('w1_bantau'));
  assert.ok(ids(fresh).includes('first'));
  assert.ok(ids(fresh).includes('w1'));
  assert.ok(S.load().ach.w1_bantau);
  assert.equal(S.totals().g.bantau.w, 1);
});
test('record: 10 ván thắng 1 game mở w10 + m10 (10 ván thắng cùng 1 game)', () => {
  reset();
  let fresh = [];
  for (let i = 0; i < 10; i++) fresh = S.record('uno', true);
  assert.ok(ids(fresh).includes('w10_uno'));
  assert.ok(ids(fresh).includes('m10'));
  assert.equal(S.totals().g.uno.w, 10);
  assert.equal(S.totals().top, 10);
});
test('record: game không tính thắng thua (Thật hay Thách) vẫn mở p1/p10 theo số ván chơi', () => {
  reset();
  S.record('thathaythach', null);
  assert.ok(S.load().ach.p1_thathaythach);
  for (let i = 0; i < 9; i++) S.record('thathaythach', null);
  assert.ok(S.load().ach.p10_thathaythach);
  assert.equal(S.load().g.thathaythach.w || 0, 0);
});
test('record: chơi 5 game khác nhau mở k5; đủ 31 game mở k24 + k25', () => {
  reset();
  const games = Object.keys(S.GAME_NAMES);
  games.slice(0, 5).forEach(g => S.record(g, false));
  assert.ok(S.load().ach.k5);
  games.slice(5).forEach(g => S.record(g, false));
  assert.ok(S.load().ach.k24);
  assert.ok(S.load().ach.k25);
  assert.equal(S.totals().kinds, 31);
});
test('recordEvent: chìm tàu — sink1, sink2 trong 1 ván, sink5, ván mới đếm lại', () => {
  reset();
  let f = S.recordEvent('bantau', 'sink', { gid: 'g1' });
  assert.ok(ids(f).includes('bt_sink1'));
  assert.ok(!ids(f).includes('bt_sink2'));
  f = S.recordEvent('bantau', 'sink', { gid: 'g1' });
  assert.ok(ids(f).includes('bt_sink2'));
  for (let i = 0; i < 3; i++) S.recordEvent('bantau', 'sink', { gid: 'g1' });
  assert.ok(S.load().ach.bt_sink5);
  assert.equal(S.totals().ev.bt.sinks, 5);
  assert.equal(S.totals().ev.bt.sinkMax, 5);
  f = S.recordEvent('bantau', 'sink', { gid: 'g2' }); /* ván mới: đếm trong ván reset */
  assert.ok(!ids(f).includes('bt_sink2'));
  assert.equal(S.totals().ev.bt.sinks, 6);
  assert.equal(S.totals().ev.bt.sinkMax, 5); /* kỷ lục giữ nguyên */
});
test('recordEvent: chuỗi trúng 3 mở streak3, 5 mở streak5', () => {
  reset();
  S.recordEvent('bantau', 'hit', { streak: 2 });
  assert.ok(!S.load().ach.bt_streak3);
  S.recordEvent('bantau', 'hit', { streak: 3 });
  assert.ok(S.load().ach.bt_streak3);
  S.recordEvent('bantau', 'hit', { streak: 5 });
  assert.ok(S.load().ach.bt_streak5);
  assert.equal(S.totals().ev.bt.hitStreak, 5);
});
test('recordEvent: dùng đủ 3 loại vật phẩm mở bt_items, tiến độ 1/3 rồi 2/3', () => {
  reset();
  S.recordEvent('bantau', 'item', { item: 'trap' });
  const a = S.ACHS.find(x => x.id === 'bt_items');
  assert.deepEqual(a.of(S.totals()), [1, 3]);
  S.recordEvent('bantau', 'item', { item: 'radar' });
  assert.deepEqual(a.of(S.totals()), [2, 3]);
  assert.ok(!S.load().ach.bt_items);
  S.recordEvent('bantau', 'item', { item: 'nuke' });
  assert.ok(S.load().ach.bt_items);
});
test('recordEvent: flawless / bẫy sập / radar bắt sóng / bom chìm tàu', () => {
  reset();
  S.recordEvent('bantau', 'flawless');
  S.recordEvent('bantau', 'traptrigger');
  S.recordEvent('bantau', 'radarhit');
  S.recordEvent('bantau', 'nukesink');
  const s = S.load();
  assert.ok(s.ach.bt_flawless && s.ach.bt_trap && s.ach.bt_radar && s.ach.bt_nukesink);
});
test('không mở trùng: gọi lại sự kiện đã mở không sinh fresh', () => {
  reset();
  S.recordEvent('bantau', 'sink', { gid: 'g1' });
  assert.ok(!ids(S.recordEvent('bantau', 'sink', { gid: 'g1' })).includes('bt_sink1'));
  S.record('bantau', true);
  assert.ok(!ids(S.record('bantau', true)).includes('w1_bantau'));
});
test('tiến độ of() cho thành tựu theo game: 3/10 ván thắng Bắn Tàu', () => {
  reset();
  for (let i = 0; i < 3; i++) S.record('bantau', true);
  const a = S.ACHS.find(x => x.id === 'w10_bantau');
  assert.deepEqual(a.of(S.totals()), [3, 10]);
  assert.ok(!S.load().ach.w10_bantau);
});
test('totals() lộ g (theo game) và ev (sự kiện) để ACHS dùng', () => {
  reset();
  S.record('uno', true);
  S.recordEvent('bantau', 'sink', { gid: 'g1' });
  const t = S.totals();
  assert.equal(t.g.uno.w, 1);
  assert.equal(t.ev.bt.sinks, 1);
});
test('recordEvent Ô Ăn Quan: ăn Quan mở oq_quan1; ăn dây 3 ô mở oq_chain3; cứu dân mở oq_rescue', () => {
  reset();
  S.recordEvent('oanquan', 'eat', { q: 1, d: 3, chain: 2 });
  assert.ok(S.load().ach.oq_quan1);
  assert.equal(S.totals().ev.oq.quan, 1);
  assert.ok(!S.load().ach.oq_chain3);
  S.recordEvent('oanquan', 'chain', { chain: 3 });
  assert.ok(S.load().ach.oq_chain3);
  assert.equal(S.totals().ev.oq.chainMax, 3);
  S.recordEvent('oanquan', 'rescue', {});
  assert.ok(S.load().ach.oq_rescue);
  assert.equal(S.totals().ev.oq.rescues, 1);
});
test('recordEvent Ô Ăn Quan (end): ăn cả 2 Quan mở oq_bothquan; thắng không mất Quan mở oq_flawless; thắng sau cứu dân mở oq_comeback', () => {
  reset();
  S.recordEvent('oanquan', 'end', { won: true, oppQuan: 0, rescues: 1, quanEaten: 2 });
  const s = S.load();
  assert.ok(s.ach.oq_bothquan && s.ach.oq_flawless && s.ach.oq_comeback);
  /* thắng nhưng đối phương đã ăn 1 Quan thì không flawless; thua thì không comeback */
  reset();
  S.recordEvent('oanquan', 'end', { won: true, oppQuan: 1, rescues: 0, quanEaten: 1 });
  assert.ok(!S.load().ach.oq_flawless);
  assert.ok(!S.load().ach.oq_comeback);
  assert.ok(!S.load().ach.oq_bothquan);
  reset();
  S.recordEvent('oanquan', 'end', { won: false, oppQuan: 0, rescues: 1, quanEaten: 2 });
  assert.ok(S.load().ach.oq_bothquan);
  assert.ok(!S.load().ach.oq_flawless);
  assert.ok(!S.load().ach.oq_comeback);
});
test('recordEvent Cờ Caro: thắng dưới 30 nước mở caro_win_fast; 30 nước trở lên hoặc thua thì không', () => {
  reset();
  S.recordEvent('caro', 'end', { won: true, moves: 20 });
  assert.ok(S.load().ach.caro_win_fast);
  assert.equal(S.totals().ev.cr.fast, 1);
  reset();
  S.recordEvent('caro', 'end', { won: true, moves: 30 });
  assert.ok(!S.load().ach.caro_win_fast);
  S.recordEvent('caro', 'end', { won: false, moves: 10 });
  assert.ok(!S.load().ach.caro_win_fast);
  assert.equal(S.load().ev.cr.fast, 0);
});
test('record: thắng 3 ván Caro liên tiếp mở caro_streak3; thua xen giữa thì reset; thắng game khác không tính', () => {
  reset();
  S.record('caro', true); S.record('caro', true);
  assert.ok(!S.load().ach.caro_streak3);
  S.record('caro', true);
  assert.ok(S.load().ach.caro_streak3);
  assert.equal(S.totals().g.caro.st, 3);
  reset();
  S.record('caro', true); S.record('caro', true); S.record('caro', false); S.record('caro', true);
  assert.ok(!S.load().ach.caro_streak3);
  assert.equal(S.totals().g.caro.st, 1);
  reset();
  S.record('uno', true); S.record('uno', true); S.record('uno', true);
  assert.ok(!S.load().ach.caro_streak3);
  assert.ok(S.load().ach.s3); /* thắng 3 ván liên tiếp (chung) vẫn mở s3 */
});
test('recordEvent TicTacToe: hòa máy Khó mở tictactoe_draw_hard; thắng / hòa máy Dễ / hòa người thì không', () => {
  reset();
  S.recordEvent('tictactoe', 'end', { won: false, moves: 9, draw: true, foeBot: true, foeLevel: 'hard' });
  assert.ok(S.load().ach.tictactoe_draw_hard);
  assert.equal(S.totals().ev.tt.drawHard, 1);
  reset();
  S.recordEvent('tictactoe', 'end', { won: true, moves: 5, draw: false, foeBot: true, foeLevel: 'hard' });
  assert.ok(!S.load().ach.tictactoe_draw_hard);
  S.recordEvent('tictactoe', 'end', { won: false, moves: 9, draw: true, foeBot: true, foeLevel: 'easy' });
  assert.ok(!S.load().ach.tictactoe_draw_hard);
  S.recordEvent('tictactoe', 'end', { won: false, moves: 9, draw: true, foeBot: false, foeLevel: null });
  assert.ok(!S.load().ach.tictactoe_draw_hard);
  assert.equal(S.load().ev.tt.drawHard, 0);
});
test('record: thắng 3 ván TicTacToe liên tiếp mở tictactoe_streak3; thua xen giữa thì reset', () => {
  reset();
  S.record('tictactoe', true); S.record('tictactoe', true);
  assert.ok(!S.load().ach.tictactoe_streak3);
  S.record('tictactoe', true);
  assert.ok(S.load().ach.tictactoe_streak3);
  assert.equal(S.totals().g.tictactoe.st, 3);
  reset();
  S.record('tictactoe', true); S.record('tictactoe', true); S.record('tictactoe', false); S.record('tictactoe', true);
  assert.ok(!S.load().ach.tictactoe_streak3);
  assert.equal(S.totals().g.tictactoe.st, 1);
});
test('recordEvent Memory: chơi đơn Vừa 0 trượt mở memory_perfect; dưới 60 giây mở memory_fast', () => {
  reset();
  S.recordEvent('memory', 'end', { won: true, misses: 0, seconds: 45, level: 'medium', solo: true });
  assert.ok(S.load().ach.memory_perfect);
  assert.ok(S.load().ach.memory_fast);
  assert.equal(S.totals().ev.mm.perfect, 1);
  assert.equal(S.totals().ev.mm.fast, 1);
  reset();
  S.recordEvent('memory', 'end', { won: true, misses: 1, seconds: 45, level: 'medium', solo: true });
  assert.ok(!S.load().ach.memory_perfect);
  assert.ok(S.load().ach.memory_fast);
  reset();
  S.recordEvent('memory', 'end', { won: true, misses: 0, seconds: 90, level: 'medium', solo: true });
  assert.ok(S.load().ach.memory_perfect);
  assert.ok(!S.load().ach.memory_fast);
  reset();
  S.recordEvent('memory', 'end', { won: true, misses: 0, seconds: 30, level: 'easy', solo: true });
  assert.ok(!S.load().ach.memory_perfect);
  assert.ok(!S.load().ach.memory_fast);
  S.recordEvent('memory', 'end', { won: true, misses: 0, seconds: 30, level: 'medium', solo: false });
  assert.ok(!S.load().ach.memory_perfect);
  assert.ok(!S.load().ach.memory_fast);
});
test('record: thắng 3 ván Memory liên tiếp mở memory_streak3', () => {
  reset();
  S.record('memory', true); S.record('memory', true); S.record('memory', true);
  assert.ok(S.load().ach.memory_streak3);
  assert.equal(S.totals().g.memory.st, 3);
});
test('recordEvent Cờ Vây: thắng bàn 19×19 mở covay_win19; thắng cách biệt 20 điểm mở covay_bigwin', () => {
  reset();
  S.recordEvent('covay', 'end', { won: true, size: 19, margin: 25 });
  assert.ok(S.load().ach.covay_win19);
  assert.ok(S.load().ach.covay_bigwin);
  assert.equal(S.totals().ev.cv.win19, 1);
  assert.equal(S.totals().ev.cv.bigwin, 1);
  reset();
  S.recordEvent('covay', 'end', { won: true, size: 9, margin: 5 });
  assert.ok(!S.load().ach.covay_win19);
  assert.ok(!S.load().ach.covay_bigwin);
  S.recordEvent('covay', 'end', { won: false, size: 19, margin: 30 });
  assert.ok(!S.load().ach.covay_win19);
  assert.ok(!S.load().ach.covay_bigwin);
  assert.equal(S.load().ev.cv.win19, 0);
  assert.equal(S.load().ev.cv.bigwin, 0);
});
test('record: thắng 3 ván Cờ Vây liên tiếp mở covay_streak3', () => {
  reset();
  S.record('covay', true); S.record('covay', true); S.record('covay', true);
  assert.ok(S.load().ach.covay_streak3);
  assert.equal(S.totals().g.covay.st, 3);
});
test('watch/observe Cờ Vây: gửi view kết thúc 2 lần chỉ đếm 1 ván', () => {
  reset();
  const h = S.watch('covay', { onState() {} }, () => 'p1');
  const playing = { phase: 'playing', winner: null, players: [{ id: 'p1' }, { id: 'p2' }], me: 'p1' };
  const ended = { phase: 'ended', winner: 'p1', players: [{ id: 'p1' }, { id: 'p2' }], me: 'p1' };
  h.onState(playing);
  h.onState(ended);
  h.onState(ended); /* gửi lại view kết thúc: không đếm trùng */
  assert.equal(S.totals().g.covay.p, 1);
  assert.equal(S.totals().g.covay.w, 1);
});
test('recordEvent Cờ Thú: Chuột ăn Voi mở cothu_rat_elephant; thắng bằng vào hang mở cothu_den_win', () => {
  reset();
  S.recordEvent('cothu', 'capture', { attacker: 'rat', victim: 'elephant' });
  assert.ok(S.load().ach.cothu_rat_elephant);
  assert.equal(S.totals().ev.ct.ratElephant, 1);
  S.recordEvent('cothu', 'end', { won: true, byDen: true });
  assert.ok(S.load().ach.cothu_den_win);
  assert.equal(S.totals().ev.ct.denWin, 1);
  reset();
  S.recordEvent('cothu', 'capture', { attacker: 'cat', victim: 'elephant' });
  assert.ok(!S.load().ach.cothu_rat_elephant);
  S.recordEvent('cothu', 'end', { won: true, byDen: false });
  assert.ok(!S.load().ach.cothu_den_win);
  S.recordEvent('cothu', 'end', { won: false, byDen: true });
  assert.ok(!S.load().ach.cothu_den_win);
});
test('record: thắng 3 ván Cờ Thú liên tiếp mở cothu_streak3', () => {
  reset();
  S.record('cothu', true); S.record('cothu', true); S.record('cothu', true);
  assert.ok(S.load().ach.cothu_streak3);
  assert.equal(S.totals().g.cothu.st, 3);
});
test('recordEvent Rắn và Thang: leo thang 28→84 mở rt_ladder28; trượt rắn 87→24 mở rt_snake87', () => {
  reset();
  S.recordEvent('ranvathang', 'climb', { from: 28 });
  assert.ok(S.load().ach.rt_ladder28);
  assert.equal(S.totals().ev.rt.ladder28, 1);
  S.recordEvent('ranvathang', 'slide', { from: 87 });
  assert.ok(S.load().ach.rt_snake87);
  assert.equal(S.totals().ev.rt.snake87, 1);
  reset();
  S.recordEvent('ranvathang', 'climb', { from: 7 });
  assert.ok(!S.load().ach.rt_ladder28);
  S.recordEvent('ranvathang', 'slide', { from: 16 });
  assert.ok(!S.load().ach.rt_snake87);
});
test('record: thắng 3 ván Rắn và Thang liên tiếp mở rt_streak3', () => {
  reset();
  S.record('ranvathang', true); S.record('ranvathang', true); S.record('ranvathang', true);
  assert.ok(S.load().ach.rt_streak3);
  assert.equal(S.totals().g.ranvathang.st, 3);
});
test('watch/observe Cờ Thú + Rắn và Thang: gửi view kết thúc 2 lần chỉ đếm 1 ván', () => {
  reset();
  const h = S.watch('cothu', { onState() {} }, () => 'p1');
  const playing = { phase: 'playing', winner: null, players: [{ id: 'p1' }, { id: 'p2' }], me: 'p1' };
  const ended = { phase: 'ended', winner: 'p1', players: [{ id: 'p1' }, { id: 'p2' }], me: 'p1' };
  h.onState(playing);
  h.onState(ended);
  h.onState(ended); /* gửi lại view kết thúc: không đếm trùng */
  assert.equal(S.totals().g.cothu.p, 1);
  assert.equal(S.totals().g.cothu.w, 1);
  reset();
  const h2 = S.watch('ranvathang', { onState() {} }, () => 'p1');
  h2.onState(playing);
  h2.onState(ended);
  h2.onState(ended);
  assert.equal(S.totals().g.ranvathang.p, 1);
  assert.equal(S.totals().g.ranvathang.w, 1);
});
test('watch/observe: gửi view kết thúc 2 lần chỉ đếm 1 ván; hòa chỉ tăng số ván, không tăng số thắng', () => {
  reset();
  const h = S.watch('tictactoe', { onState() {} }, () => 'p1');
  const playing = { phase: 'playing', winner: null, draw: false, players: [{ id: 'p1' }, { id: 'p2' }], me: 'p1' };
  const ended = { phase: 'ended', winner: 'p1', draw: false, players: [{ id: 'p1' }, { id: 'p2' }], me: 'p1' };
  h.onState(playing);
  h.onState(ended);
  h.onState(ended); /* gửi lại view kết thúc: không đếm trùng */
  assert.equal(S.totals().g.tictactoe.p, 1);
  assert.equal(S.totals().g.tictactoe.w, 1);
  reset();
  const h2 = S.watch('memory', { onState() {} }, () => 'p1');
  const draw = { phase: 'ended', winner: null, draw: true, players: [{ id: 'p1' }, { id: 'p2' }], me: 'p1' };
  h2.onState(playing);
  h2.onState(draw);
  h2.onState(draw); /* gửi lại view hòa: cũng không đếm trùng */
  assert.equal(S.totals().g.memory.p, 1);
  assert.equal(S.totals().g.memory.w || 0, 0);
});
test('recordEvent lạ / game khác: không làm gì, không vỡ', () => {
  reset();
  assert.deepEqual(S.recordEvent('bantau', 'nope'), []);
  assert.deepEqual(S.recordEvent('uno', 'sink', {}), []);
  assert.equal(S.load().ach.bt_sink1, undefined);
});

console.log(`\n${pass} test đạt. Tổng ${S.ACHS.length} thành tựu.`);
process.exit(0); /* toast hẹn giờ của dialog.js không liên quan tới logic test – thoát ngay cho nhanh */
