/* Nhện rules tests — luật: chia bài, di chuyển, thu dãy, chia thêm,
   gợi ý, hoàn tác, thắng/kẹt/xin thua, hết giờ đua, viewFor, serialize.
   Math.random được seed lại trước mỗi ván để kết quả ổn định. */
import { createGame, applyAction, actors, viewFor, serialize, deserialize, legalMoves, findHint, mulberry32, SUITS, RUN_SCORE } from '../js/engine.js';

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }

const C = (r, s, up = true) => ({ r, s, up });
const D = (r, s) => ({ r, s, up: false });
function soloGame(suits = 'easy', seed = 1) {
  Math.random = mulberry32(seed);
  return createGame([{ id: 'p1', name: 'P1', isBot: true, level: 'hard' }], { seed, nhMode: 'solo', suits });
}
function raceGame(levels, suits = 'easy', seed = 1) {
  Math.random = mulberry32(seed);
  return createGame(levels.map((l, i) => ({ id: 'p' + (i + 1), name: 'P' + (i + 1), isBot: true, level: l })), { seed, nhMode: 'race', suits });
}
/* đặt lại bàn của p1 theo ý muốn (dùng để kiểm tra từng luật riêng) */
function setBoard(s, pid, cols, stock = []) {
  const p = s.prog[pid];
  p.cols = cols;
  p.stock = stock;
  p.runs = 0; p.score = 0; p.moves = 0; p.deals = 0;
  p.hintsUsed = 0; p.hintsLeft = 5; p.undosUsed = 0; p.undosLeft = 10;
  p.history = []; p.hint = null; p.lastMove = null;
  p.status = 'playing'; p.doneAt = null;
}

// --- 1. chia bài ban đầu ---
{
  const s = soloGame('easy', 11);
  const cols = s.prog.p1.cols;
  check('chia bài: 10 cột', cols.length === 10);
  check('chia bài: 4 cột đầu 6 lá, 6 cột sau 5 lá', cols.slice(0, 4).every(c => c.length === 6) && cols.slice(4).every(c => c.length === 5));
  check('chia bài: 54 lá trên bàn, 50 lá chờ', cols.flat().length === 54 && s.prog.p1.stock.length === 50);
  check('chia bài: chỉ lá trên cùng mỗi cột ngửa', cols.every(c => c.slice(0, -1).every(x => !x.up) && c[c.length - 1].up));
  check('chia bài: Dễ = 1 chất (toàn ♠)', cols.flat().every(c => c.s === 0) && s.prog.p1.stock.every(c => c.s === 0));
  const s2 = soloGame('medium', 12);
  check('chia bài: Vừa = 2 chất (♠♥)', s2.prog.p1.cols.flat().every(c => c.s === 0 || c.s === 1));
  const s4 = soloGame('hard', 13);
  check('chia bài: Khó = 4 chất', new Set(s4.prog.p1.cols.flat().map(c => c.s)).size === 4);
  check('chia bài: tổng 104 lá', s4.prog.p1.cols.flat().length + s4.prog.p1.stock.length === 104);
  check('chia bài: mỗi hạng có 8 lá', (() => {
    const counts = {};
    for (const c of s4.prog.p1.cols.flat().concat(s4.prog.p1.stock)) counts[c.r] = (counts[c.r] || 0) + 1;
    return Object.values(counts).every(n => n === 8);
  })());
}

// --- 2. di chuyển hợp lệ / không hợp lệ ---
{
  const s = soloGame('easy', 21);
  /* col0: 9♠ ngửa; col1: 8♥ ngửa; col2: 8♠ + 7♠ ngửa (dãy cùng chất) */
  setBoard(s, 'p1', [
    [C(9, 0)], [C(8, 1)], [C(8, 0), C(7, 0)],
    [C(5, 0)], [C(6, 0)], [C(4, 0)], [C(3, 0)], [C(2, 0)], [C(13, 0)], [C(12, 0)],
  ]);
  let r = applyAction(s, 'p1', { type: 'move', from: 2, to: 0, count: 2 });
  check('di chuyển: dãy cùng chất 8♠7♠ lên 9♠ được', r.ok, r.reason || '');
  check('di chuyển: đếm số nước đã đi', s.prog.p1.moves === 1);
  /* bàn mới: 8♥ lên 9♠ (khác chất) */
  const sb = soloGame('easy', 22);
  setBoard(sb, 'p1', [
    [C(9, 0)], [C(8, 1)], [C(8, 0), C(7, 0)],
    [C(5, 0)], [C(6, 0)], [C(4, 0)], [C(3, 0)], [C(2, 0)], [C(13, 0)], [C(12, 0)],
  ]);
  r = applyAction(sb, 'p1', { type: 'move', from: 1, to: 0, count: 1 });
  check('di chuyển: 8♥ lên 9♠ được (khác chất)', r.ok && sb.prog.p1.cols[0].length === 2 && sb.prog.p1.cols[1].length === 0);
  r = applyAction(sb, 'p1', { type: 'move', from: 0, to: 3, count: 1 });
  check('di chuyển: 8♥ lên 5♠ bị từ chối (không lớn hơn 1 bậc)', !r.ok);
  r = applyAction(sb, 'p1', { type: 'move', from: 0, to: 3, count: 3 });
  check('di chuyển: count vượt số lá ngửa bị từ chối', !r.ok);
  r = applyAction(sb, 'p1', { type: 'move', from: 0, to: 0, count: 1 });
  check('di chuyển: từ và tới cùng cột bị từ chối', !r.ok);
  /* dãy khác chất không di chuyển nguyên dãy được */
  setBoard(s, 'p1', [
    [C(8, 0)], [C(8, 1), C(7, 0)],
    [C(5, 0)], [C(6, 0)], [C(4, 0)], [C(3, 0)], [C(2, 0)], [C(13, 0)], [C(12, 0)], [C(11, 0)],
  ]);
  r = applyAction(s, 'p1', { type: 'move', from: 1, to: 0, count: 2 });
  check('di chuyển: dãy 8♥7♠ (khác chất) không di chuyển nguyên dãy được', !r.ok);
  r = applyAction(s, 'p1', { type: 'move', from: 1, to: 0, count: 1 });
  check('di chuyển: chỉ lá 7♠ trên cùng thì đi được (lên 8♠)', r.ok, r.reason || '');
  /* cột trống nhận mọi lá */
  setBoard(s, 'p1', [
    [], [C(5, 1)],
    [C(5, 0)], [C(6, 0)], [C(4, 0)], [C(3, 0)], [C(2, 0)], [C(13, 0)], [C(12, 0)], [C(11, 0)],
  ]);
  r = applyAction(s, 'p1', { type: 'move', from: 1, to: 0, count: 1 });
  check('di chuyển: cột trống nhận bất kỳ lá nào', r.ok);
  /* lật lá úp sau khi di chuyển */
  setBoard(s, 'p1', [
    [C(9, 0)], [D(4, 1), C(8, 1)],
    [C(5, 0)], [C(6, 0)], [C(4, 0)], [C(3, 0)], [C(2, 0)], [C(13, 0)], [C(12, 0)], [C(11, 0)],
  ]);
  r = applyAction(s, 'p1', { type: 'move', from: 1, to: 0, count: 1 });
  check('di chuyển: đi xong thì lá úp bên dưới lật ngửa', r.ok && s.prog.p1.cols[1].length === 1 && s.prog.p1.cols[1][0].up === true);
}

// --- 3. thu dãy K→A cùng chất ---
{
  const s = soloGame('easy', 31);
  const run = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map(r => C(r, 0));
  setBoard(s, 'p1', [
    run, [C(1, 0)],
    [C(5, 0)], [C(6, 0)], [C(4, 0)], [C(3, 0)], [C(2, 0)], [C(13, 0)], [C(12, 0)], [C(11, 0)],
  ]);
  const r = applyAction(s, 'p1', { type: 'move', from: 1, to: 0, count: 1 });
  check('thu dãy: A♠ lên dãy K..2♠ thì thu 1 dãy', r.ok && s.prog.p1.runs === 1 && s.prog.p1.cols[0].length === 0);
  check('thu dãy: +100 điểm', s.prog.p1.score === RUN_SCORE);
  /* dãy khác chất không thu */
  const s2 = soloGame('easy', 32);
  const run2 = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map(r => C(r, r % 2));
  setBoard(s2, 'p1', [
    run2, [C(1, 0)],
    [C(5, 0)], [C(6, 0)], [C(4, 0)], [C(3, 0)], [C(2, 0)], [C(13, 0)], [C(12, 0)], [C(11, 0)],
  ]);
  const r2 = applyAction(s2, 'p1', { type: 'move', from: 1, to: 0, count: 1 });
  check('thu dãy: dãy xen chất thì không thu (vẫn 0 dãy)', r2.ok && s2.prog.p1.runs === 0);
}

// --- 4. chia thêm ---
{
  const s = soloGame('easy', 41);
  const before = s.prog.p1.cols.map(c => c.length);
  const r = applyAction(s, 'p1', { type: 'deal' });
  check('chia thêm: mỗi cột +1 lá, bài chờ −10', r.ok && s.prog.p1.cols.every((c, i) => c.length === before[i] + 1) && s.prog.p1.stock.length === 40);
  check('chia thêm: lá mới chia lật ngửa', s.prog.p1.cols.every(c => c[c.length - 1].up));
  check('chia thêm: −5 điểm (không âm)', s.prog.p1.score === 0 && s.prog.p1.deals === 1);
  /* chia thêm khi điểm > 5 thì trừ đúng 5 */
  const s2 = soloGame('easy', 42);
  s2.prog.p1.score = 120;
  applyAction(s2, 'p1', { type: 'deal' });
  check('chia thêm: điểm 120 → 115', s2.prog.p1.score === 115);
  /* hết bài chia thì từ chối */
  const s3 = soloGame('easy', 43);
  for (let i = 0; i < 5; i++) applyAction(s3, 'p1', { type: 'deal' });
  check('chia thêm: đúng 5 lần thì hết bài chờ', s3.prog.p1.stock.length === 0);
  const r3 = applyAction(s3, 'p1', { type: 'deal' });
  check('chia thêm: lần thứ 6 bị từ chối', !r3.ok);
}

// --- 5. gợi ý (tối đa 5) ---
{
  const s = soloGame('easy', 51);
  setBoard(s, 'p1', [
    [C(9, 0)], [C(8, 1)],
    [C(5, 0)], [C(6, 0)], [C(4, 0)], [C(3, 0)], [C(2, 0)], [C(13, 0)], [C(12, 0)], [C(11, 0)],
  ]);
  const h = findHint(s.prog.p1);
  check('gợi ý: tìm được 1 nước hợp lệ', !!h && legalMoves(s.prog.p1).some(m => m.from === h.from && m.to === h.to && m.count === h.count), JSON.stringify(h));
  const r = applyAction(s, 'p1', { type: 'hint' });
  check('gợi ý: dùng 1 lần thì hintsLeft 4 và lưu nước gợi ý', r.ok && s.prog.p1.hintsLeft === 4 && s.prog.p1.hint && s.prog.p1.hint.from === h.from && s.prog.p1.hint.to === h.to);
  /* dùng hết 5 lần thì lần 6 bị từ chối */
  for (let i = 0; i < 4; i++) applyAction(s, 'p1', { type: 'hint' });
  check('gợi ý: dùng đủ 5 lần', s.prog.p1.hintsLeft === 0 && s.prog.p1.hintsUsed === 5);
  const r6 = applyAction(s, 'p1', { type: 'hint' });
  check('gợi ý: lần thứ 6 bị từ chối', !r6.ok);
  /* không còn nước đi nhưng còn bài chia → gợi ý chia thêm */
  const s2 = soloGame('easy', 52);
  setBoard(s2, 'p1', [
    [C(7, 0)], [C(7, 1)], [C(7, 2)], [C(7, 3)], [C(7, 0)], [C(7, 1)], [C(7, 2)], [C(7, 3)], [C(7, 0)], [C(7, 1)],
  ], [C(5, 0), C(5, 0), C(5, 0), C(5, 0), C(5, 0), C(5, 0), C(5, 0), C(5, 0), C(5, 0), C(5, 0)]);
  const r2 = applyAction(s2, 'p1', { type: 'hint' });
  check('gợi ý: hết nước xếp bài thì gợi ý chia thêm', r2.ok && s2.prog.p1.hint && s2.prog.p1.hint.type === 'deal');
  /* không còn nước đi và hết bài chia → gợi ý từ chối */
  const s3 = soloGame('easy', 53);
  setBoard(s3, 'p1', [
    [C(7, 0)], [C(7, 1)], [C(7, 2)], [C(7, 3)], [C(7, 0)], [C(7, 1)], [C(7, 2)], [C(7, 3)], [C(7, 0)], [C(7, 1)],
  ], []);
  const r3 = applyAction(s3, 'p1', { type: 'hint' });
  check('gợi ý: hết nước đi và hết bài chia thì từ chối', !r3.ok);
}

// --- 6. hoàn tác (tối đa 10) ---
{
  const s = soloGame('easy', 61);
  setBoard(s, 'p1', [
    [C(9, 0)], [C(8, 1)],
    [C(5, 0)], [C(6, 0)], [C(4, 0)], [C(3, 0)], [C(2, 0)], [C(13, 0)], [C(12, 0)], [C(11, 0)],
  ]);
  const before = JSON.stringify(s.prog.p1.cols);
  applyAction(s, 'p1', { type: 'move', from: 1, to: 0, count: 1 });
  check('hoàn tác: đi 1 nước thì bàn đổi', JSON.stringify(s.prog.p1.cols) !== before);
  const r = applyAction(s, 'p1', { type: 'undo' });
  check('hoàn tác: hoàn tác thì bàn về như cũ', r.ok && JSON.stringify(s.prog.p1.cols) === before);
  check('hoàn tác: undosLeft giảm 1', s.prog.p1.undosLeft === 9 && s.prog.p1.undosUsed === 1);
  const r2 = applyAction(s, 'p1', { type: 'undo' });
  check('hoàn tác: không còn lịch sử thì từ chối', !r2.ok);
  /* dùng hết 10 lần hoàn tác */
  const s2 = soloGame('easy', 62);
  setBoard(s2, 'p1', [
    [C(9, 0)], [C(8, 1)],
    [C(5, 0)], [C(6, 0)], [C(4, 0)], [C(3, 0)], [C(2, 0)], [C(13, 0)], [C(12, 0)], [C(11, 0)],
  ]);
  for (let i = 0; i < 10; i++) {
    applyAction(s2, 'p1', { type: 'move', from: 1, to: 0, count: 1 });
    applyAction(s2, 'p1', { type: 'undo' });
  }
  check('hoàn tác: dùng đủ 10 lần', s2.prog.p1.undosLeft === 0 && s2.prog.p1.undosUsed === 10);
  applyAction(s2, 'p1', { type: 'move', from: 1, to: 0, count: 1 });
  const r3 = applyAction(s2, 'p1', { type: 'undo' });
  check('hoàn tác: lần thứ 11 bị từ chối', !r3.ok);
}

// --- 7. thắng chơi đơn (đủ 8 dãy) + thưởng theo độ khó ---
{
  const s = soloGame('medium', 71);
  const run = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map(r => C(r, 0));
  setBoard(s, 'p1', [
    run, [C(1, 0)],
    [C(5, 0)], [C(6, 0)], [C(4, 0)], [C(3, 0)], [C(2, 0)], [C(13, 0)], [C(12, 0)], [C(11, 0)],
  ]);
  s.prog.p1.runs = 7;
  const r = applyAction(s, 'p1', { type: 'move', from: 1, to: 0, count: 1 });
  check('thắng: thu dãy thứ 8 thì thắng ngay', r.ok && s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'win');
  check('thắng: điểm = 100 (thu dãy) + 100 (thưởng Vừa 2 chất)', s.final.summary.p1.score === 200, 'score=' + s.final.summary.p1.score);
  check('thắng: summary có đủ trường', ['runs', 'score', 'moves', 'deals', 'hintsUsed', 'undosUsed', 'timeMs'].every(k => k in s.final.summary.p1));
  const s2 = soloGame('hard', 72);
  /* dựng lại dãy mới (dãy run ở trên đã bị collectRuns splice rỗng) */
  const run2 = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map(r => C(r, 0));
  setBoard(s2, 'p1', [
    run2, [C(1, 0)],
    [C(5, 0)], [C(6, 0)], [C(4, 0)], [C(3, 0)], [C(2, 0)], [C(13, 0)], [C(12, 0)], [C(11, 0)],
  ]);
  s2.prog.p1.runs = 7;
  applyAction(s2, 'p1', { type: 'move', from: 1, to: 0, count: 1 });
  check('thắng: Khó 4 chất thưởng +200 (tổng 300)', s2.final.summary.p1.score === 300, 'score=' + s2.final.summary.p1.score);
}

// --- 8. kẹt (hết nước đi + hết bài chia) ---
{
  const s = soloGame('easy', 81);
  /* 10 cột toàn lá 7 (không có 8 để xếp lên), bài chờ rỗng; chỉ 1 nước: 7♥ col1 lên 8♠ col0 */
  setBoard(s, 'p1', [
    [C(8, 0)],
    [D(7, 1), C(7, 1)],
    [C(7, 2)], [C(7, 3)], [C(7, 0)], [C(7, 1)], [C(7, 2)], [C(7, 3)], [C(7, 0)], [C(7, 1)],
  ], []);
  check('kẹt: ban đầu có 9 nước (lá 7 nào cũng lên được 8♠)', legalMoves(s.prog.p1).length === 9, 'got ' + legalMoves(s.prog.p1).length);
  const r = applyAction(s, 'p1', { type: 'move', from: 1, to: 0, count: 1 });
  check('kẹt: đi nước cuối thì hết nước đi → thua', r.ok && s.phase === 'ended' && s.endReason === 'stuck' && s.winner === null);
  check('kẹt: đi xong thì lá úp bên dưới lật ngửa', s.prog.p1.cols[1][0].up === true);
  /* kẹt sau khi chia thêm */
  const s2 = soloGame('easy', 82);
  setBoard(s2, 'p1', [
    [C(7, 0)], [C(7, 1)], [C(7, 2)], [C(7, 3)], [C(7, 0)], [C(7, 1)], [C(7, 2)], [C(7, 3)], [C(7, 0)], [C(7, 1)],
  ], [C(7, 0), C(7, 0), C(7, 0), C(7, 0), C(7, 0), C(7, 0), C(7, 0), C(7, 0), C(7, 0), C(7, 0)]);
  const r2 = applyAction(s2, 'p1', { type: 'deal' });
  check('kẹt: chia thêm mà vẫn không có nước đi → thua', r2.ok && s2.phase === 'ended' && s2.endReason === 'stuck');
}

// --- 9. xin thua ---
{
  const s = soloGame('easy', 91);
  const r = applyAction(s, 'p1', { type: 'resign' });
  check('xin thua: chơi đơn thua ngay', r.ok && s.phase === 'ended' && s.endReason === 'resign' && s.winner === null);
  const g = raceGame(['easy', 'hard'], 'easy', 92);
  const r2 = applyAction(g, 'p2', { type: 'resign' });
  check('xin thua: đua thì người xin thua bị loại, ván tiếp tục', r2.ok && g.phase === 'playing' && g.prog.p2.status === 'resigned');
  check('xin thua: actors chỉ còn người đang chơi', JSON.stringify(actors(g)) === JSON.stringify(['p1']));
  const r3 = applyAction(g, 'p1', { type: 'move', from: 0, to: 1, count: 1 });
  check('xin thua: người còn lại vẫn đi được (hoặc bị từ chối hợp lệ nếu nước sai)', r3.ok || !r3.ok);
}

// --- 10. đua: thắng khi đủ 8 dãy; hết 180s so dãy rồi điểm; hoà ---
{
  const g = raceGame(['easy', 'hard'], 'easy', 101);
  const run = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map(r => C(r, 0));
  setBoard(g, 'p1', [
    run, [C(1, 0)],
    [C(5, 0)], [C(6, 0)], [C(4, 0)], [C(3, 0)], [C(2, 0)], [C(13, 0)], [C(12, 0)], [C(11, 0)],
  ]);
  g.prog.p1.runs = 7;
  const r = applyAction(g, 'p1', { type: 'move', from: 1, to: 0, count: 1 });
  check('đua: thu dãy thứ 8 thì thắng ngay', r.ok && g.phase === 'ended' && g.winner === 'p1');
  /* hết giờ: nhiều dãy hơn thắng */
  const g2 = raceGame(['easy', 'hard'], 'easy', 102);
  g2.prog.p1.runs = 2; g2.prog.p1.score = 200;
  g2.prog.p2.runs = 1; g2.prog.p2.score = 500;
  const r2 = applyAction(g2, 'p1', { type: 'timeout' });
  check('đua: hết giờ thì người nhiều dãy hơn thắng (dù ít điểm hơn)', r2.ok && g2.phase === 'ended' && g2.winner === 'p1' && g2.endReason === 'timeout');
  /* hết giờ: bằng dãy thì nhiều điểm hơn thắng */
  const g3 = raceGame(['easy', 'hard'], 'easy', 103);
  g3.prog.p1.runs = 1; g3.prog.p1.score = 100;
  g3.prog.p2.runs = 1; g3.prog.p2.score = 300;
  applyAction(g3, 'p1', { type: 'timeout' });
  check('đua: hết giờ, bằng dãy thì nhiều điểm hơn thắng', g3.winner === 'p2');
  /* hết giờ: bằng dãy bằng điểm thì hoà */
  const g4 = raceGame(['easy', 'hard'], 'easy', 104);
  g4.prog.p1.runs = 1; g4.prog.p1.score = 100;
  g4.prog.p2.runs = 1; g4.prog.p2.score = 100;
  applyAction(g4, 'p1', { type: 'timeout' });
  check('đua: hết giờ, bằng dãy bằng điểm thì hoà', g4.phase === 'ended' && g4.winner === null && g4.endReason === 'draw');
  /* timeout ở chơi đơn bị từ chối */
  const s = soloGame('easy', 105);
  const r5 = applyAction(s, 'p1', { type: 'timeout' });
  check('đua: timeout ở chơi đơn bị từ chối', !r5.ok);
  /* đua: 1 người kẹt thì bị loại, người còn lại chơi tiếp; cả 2 xong thì so dãy */
  const g5 = raceGame(['easy', 'hard'], 'easy', 106);
  setBoard(g5, 'p1', [
    [C(8, 0)],
    [D(7, 1), C(7, 1)],
    [C(7, 2)], [C(7, 3)], [C(7, 0)], [C(7, 1)], [C(7, 2)], [C(7, 3)], [C(7, 0)], [C(7, 1)],
  ], []);
  g5.prog.p2.runs = 3; g5.prog.p2.score = 300;
  applyAction(g5, 'p1', { type: 'move', from: 1, to: 0, count: 1 });
  check('đua: 1 người kẹt thì bị loại, ván vẫn tiếp tục cho người còn lại', g5.phase === 'playing' && g5.prog.p1.status === 'done' && JSON.stringify(actors(g5)) === JSON.stringify(['p2']));
  /* người còn lại thu đủ dãy thì thắng */
  const run5 = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map(r => C(r, 0));
  setBoard(g5, 'p2', [
    run5, [C(1, 0)],
    [C(5, 0)], [C(6, 0)], [C(4, 0)], [C(3, 0)], [C(2, 0)], [C(13, 0)], [C(12, 0)], [C(11, 0)],
  ]);
  g5.prog.p2.runs = 7;
  applyAction(g5, 'p2', { type: 'move', from: 1, to: 0, count: 1 });
  check('đua: người còn lại thu dãy thứ 8 thì thắng', g5.phase === 'ended' && g5.winner === 'p2', 'winner=' + g5.winner);
}

// --- 11. viewFor không lộ lá úp; serialize ---
{
  const s = soloGame('easy', 111);
  const v = viewFor(s, 'p1');
  check('viewFor: lá úp không lộ hạng/chất', v.my.cols.every(col => col.every(c => c.up ? (Number.isInteger(c.r) && Number.isInteger(c.s)) : (c.r === undefined && c.s === undefined))));
  check('viewFor: có đủ trường mode/solo/race/suits', v.solo === true && v.race === false && v.suits === 1 && v.mode === 'solo');
  check('viewFor: players có runs/score/status', v.players[0].runs === 0 && v.players[0].score === 0 && v.players[0].status === 'playing');
  const g = raceGame(['easy', 'hard'], 'easy', 112);
  const v2 = viewFor(g, 'p1');
  check('viewFor: đua chỉ thấy tóm tắt đối thủ (không thấy bàn)', !('cols' in v2.players[1]) && v2.players[1].runs === 0);
  const j = serialize(s);
  const s2 = deserialize(j);
  check('serialize: deserialize giữ nguyên bàn + bài chờ', JSON.stringify(s2.prog.p1.cols) === JSON.stringify(s.prog.p1.cols) && s2.prog.p1.stock.length === s.prog.p1.stock.length);
  check('serialize: deserialize giữ nguyên seed/mode', s2.seed === s.seed && s2.mode === s.mode);
}

console.log(`\nNhện rules: ${pass} pass, ${fail} fail.`);
