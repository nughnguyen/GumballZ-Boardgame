// Test Sudoku Combat (⚔️ kín dãy phủ sương mù). Chạy: node sudoku/test/combat.mjs
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';

const P = (id, name) => ({ id, name });
const P2 = [P('p1', 'Một'), P('p2', 'Hai')];
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

/* ván 2 người cố định, Combat mặc định BẬT */
function raceGame(seed = 12345, opts = {}) {
  return E.createGame(P2, { difficulty: 'medium', seed, ...opts });
}
/* dãy (hàng/cột/khối) còn ít ô trống nhất cho p1 — điền xong là kín dãy */
function easiestUnit(s, pid) {
  const pr = s.prog[pid];
  let best = null, bestN = 99;
  for (const u of E.UNITS) {
    const empty = u.filter(i => !s.givens[i] && !pr.grid[i]).length;
    if (empty > 0 && empty < bestN) { bestN = empty; best = u; }
  }
  return { unit: best, empty: bestN };
}
function fillUnit(s, pid, unit) {
  const pr = s.prog[pid];
  let res = null;
  for (const i of unit) {
    if (s.givens[i] || pr.grid[i]) continue;
    res = E.applyPlace(s, pid, i, s.solution[i]);
    assert.ok(res.ok, `điền ô ${i} phải ok (got ${res.reason || ''})`);
  }
  return res;
}

test('mặc định: đua 2 người Combat BẬT, chơi đơn TẮT, opt combat:false TẮT', () => {
  assert.equal(raceGame().combat, true);
  assert.equal(E.createGame([P('p1', 'Một')], { difficulty: 'medium', seed: 7 }).combat, false);
  assert.equal(raceGame(7, { combat: false }).combat, false);
  assert.equal(E.viewFor(raceGame(), 'p1').combat, true);
});

test('kín 1 dãy → phủ 3 ô sương lên đối thủ, atk/hit ghi nhận, view thấy fog', () => {
  const s = raceGame();
  const { unit } = easiestUnit(s, 'p1');
  const res = fillUnit(s, 'p1', unit);
  assert.ok(res.combat, 'nước kín dãy phải trả về combat');
  assert.ok(res.combat.done >= 1, 'kín ít nhất 1 dãy');
  assert.equal(res.combat.n, E.FOG_N, 'phủ đúng 3 ô sương');
  assert.equal(res.combat.foe, 'p2');
  assert.equal(s.prog.p1.atk, E.FOG_N);
  assert.deepEqual(s.prog.p1.hit.foe, 'p2');
  const v2 = E.viewFor(s, 'p2');
  assert.equal(v2.you.fog.length, E.FOG_N, 'đối thủ thấy 3 ô sương');
  assert.ok(v2.you.fog.every(([i, ms]) => i >= 0 && i < 81 && ms > 0 && ms <= E.FOG_MS), 'mỗi ô sương có ms còn lại trong (0, 9000]');
  const v1 = E.viewFor(s, 'p1');
  assert.equal(v1.players.find(p => p.id === 'p1').atk, E.FOG_N);
  assert.equal(v1.players.find(p => p.id === 'p2').fogN, E.FOG_N);
  assert.ok(!v2.you.fog.some(([i]) => s.givens[i] || s.prog.p2.grid[i]), 'sương chỉ phủ ô trống');
});

test('ô bị sương: điền ĐÚNG bị chặn, đoán SAI vẫn tính lỗi (như upstream)', () => {
  const s = raceGame();
  fillUnit(s, 'p1', easiestUnit(s, 'p1').unit);
  const fogCell = E.viewFor(s, 'p2').you.fog[0][0];
  const right = E.applyPlace(s, 'p2', fogCell, s.solution[fogCell]);
  assert.equal(right.ok, false, 'điền đúng vào ô sương phải bị chặn');
  assert.match(right.reason, /sương mù/);
  assert.equal(s.prog.p2.grid[fogCell], 0, 'ô sương vẫn trống');
  const wrong = (s.solution[fogCell] % 9) + 1;
  const before = s.prog.p2.mistakes;
  const r2 = E.applyPlace(s, 'p2', fogCell, wrong);
  assert.equal(r2.ok, true, 'đoán sai vào ô sương vẫn được xử lý');
  assert.equal(r2.correct, false);
  assert.equal(s.prog.p2.mistakes, before + 1, 'đoán sai vào ô sương vẫn +1 lỗi');
});

test('sương hết hạn (9s) thì điền lại được; kín dãy thổi tan sương của mình', () => {
  const s = raceGame();
  fillUnit(s, 'p1', easiestUnit(s, 'p1').unit);
  const fogCell = E.viewFor(s, 'p2').you.fog[0][0];
  /* giả lập hết hạn: dời hạn sương về quá khứ */
  for (const k of Object.keys(s.prog.p2.fog)) s.prog.p2.fog[k] = Date.now() - 1;
  assert.equal(E.fogged(s.prog.p2, fogCell), false);
  const r = E.applyPlace(s, 'p2', fogCell, s.solution[fogCell]);
  assert.equal(r.ok, true, 'hết hạn sương thì điền được');
  assert.equal(E.viewFor(s, 'p2').you.fog.length, 0, 'view không còn ô sương nào');
  /* phủ sương cho p1 rồi cho p1 kín dãy khác → sương của p1 tan */
  const s2 = raceGame(777);
  fillUnit(s2, 'p2', easiestUnit(s2, 'p2').unit); /* p2 kín dãy → phủ sương p1 */
  assert.ok(E.viewFor(s2, 'p1').you.fog.length > 0, 'p1 đang bị sương');
  const before = E.viewFor(s2, 'p1').you.fog.length;
  const u2 = easiestUnit(s2, 'p1');
  const res = fillUnit(s2, 'p1', u2.unit);
  assert.ok(res.combat && res.combat.done >= 1, 'p1 kín dãy');
  assert.equal(E.viewFor(s2, 'p1').you.fog.length, 0, 'sương của p1 tan hết sau khi kín dãy');
  assert.ok(before > 0 && res.combat.clear === before, 'số ô tan = số ô đang bị sương');
});

test('sương không vượt FOG_MAX=9 ô; bot tránh ô sương', () => {
  const s = raceGame();
  /* nhồi sẵn 8 ô sương cho p2 (quá khứ còn hạn), p1 kín dãy → chỉ phủ thêm 1 */
  const pr2 = s.prog.p2;
  const free = [];
  for (let i = 0; i < 81 && free.length < 8; i++) if (!s.givens[i]) free.push(i);
  for (const i of free) pr2.fog[i] = Date.now() + E.FOG_MS;
  const res = fillUnit(s, 'p1', easiestUnit(s, 'p1').unit);
  assert.ok(res.combat, 'kín dãy phải kích combat');
  assert.ok(res.combat.n <= 1, `chỉ phủ thêm tối đa 1 ô (đã có 8), got ${res.combat.n}`);
  assert.ok(E.viewFor(s, 'p2').you.fog.length <= E.FOG_MAX, 'tổng sương ≤ 9');
  /* bot p2 không bao giờ chọn ô sương */
  for (let k = 0; k < 20; k++) {
    const a = botAction(s, 'p2');
    if (!a) break; /* hết ô trống hợp lệ thì thôi */
    assert.ok(!E.fogged(s.prog.p2, a.cell), `bot không được chọn ô sương (cell ${a.cell})`);
    assert.equal(a.value, s.solution[a.cell], 'bot vẫn điền đúng đáp án');
  }
});

test('gợi ý mở trúng ô sương thì sương tan; tắt Combat thì không có sương', () => {
  const s = raceGame();
  fillUnit(s, 'p1', easiestUnit(s, 'p1').unit);
  const fogCells = E.viewFor(s, 'p2').you.fog.map(f => f[0]);
  /* ép hint chọn trúng 1 ô sương: dọn hết ô trống khác bằng cách điền đúng */
  const pr2 = s.prog.p2;
  for (let i = 0; i < 81; i++) {
    if (!s.givens[i] && !pr2.grid[i] && !fogCells.includes(i)) pr2.grid[i] = s.solution[i];
  }
  const r = E.applyHint(s, 'p2');
  assert.ok(r.ok, 'hint phải ok');
  assert.ok(fogCells.includes(r.cell), 'hint mở trúng ô sương');
  assert.equal(s.prog.p2.fog[r.cell], undefined, 'sương ở ô được gợi ý đã tan');
  /* Combat tắt: kín dãy không phủ sương */
  const s2 = raceGame(42, { combat: false });
  const res = fillUnit(s2, 'p1', easiestUnit(s2, 'p1').unit);
  assert.equal(res.combat, null, 'Combat tắt thì không trả combat');
  assert.equal(E.viewFor(s2, 'p2').you.fog.length, 0, 'Combat tắt thì đối thủ không bị sương');
});

console.log(`\nSudoku combat: ${pass} kiểm tra passed.`);
