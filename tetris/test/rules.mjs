/* Tetris rules tests — node only, no DOM. Seeded Math.random for stability. */
import { createGame, applyAction, actors, viewFor, serialize, deserialize, mulberry32, canPlace, ghostY, speedFor, SCORES, W, H, RACE_LINES, SOLO_LINES } from '../js/engine.js';
import { cellsOf } from '../js/pieces.js';
import { botAction } from '../js/bot.js';

Math.random = mulberry32(987654321);

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }
function eq(name, a, b) { check(name, a === b, `got ${a}, want ${b}`); }

const P = n => Array.from({ length: n }, (_, i) => ({ id: 'p' + (i + 1), name: 'P' + (i + 1) }));
function fillRows(prog, rows, except = []) {
  for (const r of rows) for (let x = 0; x < W; x++) if (!except.includes(x)) prog.grid[r][x] = 1;
}
function setCur(prog, type, rot, x, y) { prog.cur = { type, rot, x, y }; }

// --- validation ---
let threw = false;
try { createGame(P(2), { seed: 1, ttMode: 'solo' }); } catch (e) { threw = true; }
check('solo với 2 người thì lỗi', threw);
threw = false;
try { createGame(P(1), { seed: 1, ttMode: 'race' }); } catch (e) { threw = true; }
check('đua với 1 người thì lỗi', threw);
threw = false;
try { createGame(P(5), { seed: 1, ttMode: 'race' }); } catch (e) { threw = true; }
check('5 người thì lỗi', threw);

// --- 7-bag ---
{
  const s = createGame(P(1), { seed: 12345, ttMode: 'solo' });
  const seen = [];
  for (let i = 0; i < 7; i++) {
    seen.push(s.prog.p1.cur.type);
    applyAction(s, 'p1', { type: 'hard' });
    // dọn giếng giữa các lần thả để chỉ kiểm tra túi, không kiểm tra xếp chồng
    for (const row of s.prog.p1.grid) row.fill(0);
  }
  eq('túi 1 có đủ 7 khối', new Set(seen).size, 7);
  const seen2 = [];
  for (let i = 0; i < 7; i++) {
    seen2.push(s.prog.p1.cur.type);
    applyAction(s, 'p1', { type: 'hard' });
    for (const row of s.prog.p1.grid) row.fill(0);
  }
  eq('túi 2 có đủ 7 khối', new Set(seen2).size, 7);
  check('2 túi khác nhau (xáo thật)', seen.join('') !== seen2.join(''));
}

// --- speedFor ---
eq('speedFor lv1 = 800', speedFor(1), 800);
eq('speedFor lv2 = 720', speedFor(2), 720);
eq('speedFor lv10 = 310', speedFor(10), 310);
check('speedFor lv100 chạm sàn 50', speedFor(100) === 50);

// --- di chuyển + tường ---
{
  const s = createGame(P(1), { seed: 7, ttMode: 'solo' });
  const pr = s.prog.p1;
  setCur(pr, 'T', 0, 0, 0); // T có ô ở cột 0 của hộp → x=0 là sát tường thật
  applyAction(s, 'p1', { type: 'move', dx: -1 });
  eq('khối ở cột 0 không sang trái được', pr.cur.x, 0);
  applyAction(s, 'p1', { type: 'move', dx: 1 });
  eq('sang phải được', pr.cur.x, 1);
  setCur(pr, 'O', 0, 0, 0);
  const beforeCells = JSON.stringify(cellsOf('O', 0));
  applyAction(s, 'p1', { type: 'rotate', dir: 1 });
  eq('khối O xoay thì hình không đổi', JSON.stringify(cellsOf('O', pr.cur.rot)), beforeCells);
}

// --- xoay + wall kick (I dọc sát tường phải) ---
{
  const s = createGame(P(1), { seed: 7, ttMode: 'solo' });
  const pr = s.prog.p1;
  setCur(pr, 'I', 1, 7, 0); // dọc, cột 9
  const r = applyAction(s, 'p1', { type: 'rotate', dir: 1 });
  check('xoay I sát tường phải thành công nhờ kick', r.ok && pr.cur.rot === 2 && pr.cur.x === 6, `rot=${pr.cur.rot} x=${pr.cur.x}`);
  // xoay khi bị kẹt hoàn toàn thì giữ nguyên
  fillRows(pr, [0, 1, 2, 3], [8]);
  setCur(pr, 'T', 0, 7, 0);
  const before = pr.cur.rot;
  applyAction(s, 'p1', { type: 'rotate', dir: 1 });
  eq('xoay không vừa thì giữ nguyên trạng thái', pr.cur.rot, before);
}

// --- ghost ---
{
  const s = createGame(P(1), { seed: 7, ttMode: 'solo' });
  const pr = s.prog.p1;
  setCur(pr, 'I', 0, 0, 0);
  eq('ghost của I ngang trên giếng trống = 18', ghostY(pr), 18);
  fillRows(pr, [19], []);
  eq('ghost khi đáy có 1 hàng = 17', ghostY(pr), 17);
}

// --- xoá 1 hàng ---
{
  const s = createGame(P(1), { seed: 7, ttMode: 'solo' });
  const pr = s.prog.p1;
  fillRows(pr, [19], [0, 1, 2, 3]);
  setCur(pr, 'I', 0, 0, 0);
  applyAction(s, 'p1', { type: 'hard' });
  eq('xoá 1 hàng: lines=1', pr.lines, 1);
  eq('xoá 1 hàng: +100đ', pr.score, 100 + 2 * 18); // 100 điểm + 36 hard drop (18 ô × 2)
  eq('xoá 1 hàng: level vẫn 1', pr.level, 1);
  check('hàng đã xoá biến mất', pr.grid[19].every(c => !c));
}

// --- xoá 2 hàng ---
{
  const s = createGame(P(1), { seed: 7, ttMode: 'solo' });
  const pr = s.prog.p1;
  fillRows(pr, [18, 19], [9]);
  setCur(pr, 'I', 1, 7, 0);
  applyAction(s, 'p1', { type: 'hard' });
  eq('xoá 2 hàng: lines=2', pr.lines, 2);
  check('xoá 2 hàng: +300đ (cộng hard drop)', pr.score >= 300, `score=${pr.score}`);
}

// --- xoá 3 hàng ---
{
  const s = createGame(P(1), { seed: 7, ttMode: 'solo' });
  const pr = s.prog.p1;
  fillRows(pr, [17, 18, 19], [9]);
  setCur(pr, 'I', 1, 7, 0);
  applyAction(s, 'p1', { type: 'hard' });
  eq('xoá 3 hàng: lines=3', pr.lines, 3);
  check('xoá 3 hàng: +500đ (cộng hard drop)', pr.score >= 500, `score=${pr.score}`);
}

// --- Tetris (4 hàng) ---
{
  const s = createGame(P(1), { seed: 7, ttMode: 'solo' });
  const pr = s.prog.p1;
  fillRows(pr, [16, 17, 18, 19], [9]);
  setCur(pr, 'I', 1, 7, 0);
  applyAction(s, 'p1', { type: 'hard' });
  eq('Tetris: lines=4', pr.lines, 4);
  eq('Tetris: tetrisCount=1', pr.tetrisCount, 1);
  check('Tetris: +800đ (cộng hard drop)', pr.score >= 800, `score=${pr.score}`);
}

// --- combo ---
{
  const s = createGame(P(1), { seed: 7, ttMode: 'solo' });
  const pr = s.prog.p1;
  fillRows(pr, [19], [0, 1, 2, 3]);
  setCur(pr, 'I', 0, 0, 0);
  applyAction(s, 'p1', { type: 'hard' });
  eq('combo sau lần xoá đầu = 1', pr.combo, 1);
  eq('lần xoá đầu không có thưởng combo', pr.score, 100 + 36);
  fillRows(pr, [19], [0, 1, 2, 3]);
  setCur(pr, 'I', 0, 0, 0);
  applyAction(s, 'p1', { type: 'hard' });
  eq('combo sau lần xoá thứ 2 liên tiếp = 2', pr.combo, 2);
  eq('lần xoá thứ 2 có +50 thưởng combo', pr.score, 100 + 36 + 100 + 50 + 36);
  // khoá 1 khối không xoá → combo về 0
  applyAction(s, 'p1', { type: 'hard' });
  eq('khoá không xoá thì combo về 0', pr.combo, 0);
}

// --- soft drop / hard drop điểm ---
{
  const s = createGame(P(1), { seed: 7, ttMode: 'solo' });
  const pr = s.prog.p1;
  setCur(pr, 'I', 0, 0, 0);
  applyAction(s, 'p1', { type: 'soft' });
  eq('soft drop xuống 1 hàng', pr.cur.y, 1);
  eq('soft drop +1đ', pr.score, 1);
  const s2 = createGame(P(1), { seed: 7, ttMode: 'solo' });
  const pr2 = s2.prog.p1;
  setCur(pr2, 'I', 0, 0, 0);
  applyAction(s2, 'p1', { type: 'hard' });
  eq('hard drop 18 ô = +36đ', pr2.score, 36);
}

// --- hold ---
{
  const s = createGame(P(1), { seed: 7, ttMode: 'solo' });
  const pr = s.prog.p1;
  const first = pr.cur.type;
  const r1 = applyAction(s, 'p1', { type: 'hold' });
  check('giữ khối lần 1 ok', r1.ok && pr.hold === first && pr.canHold === false);
  const r2 = applyAction(s, 'p1', { type: 'hold' });
  check('giữ lần 2 cùng khối thì lỗi', !r2.ok);
  applyAction(s, 'p1', { type: 'hard' }); // khoá khối → được giữ lại
  check('sau khi khoá thì được giữ lại', pr.canHold === true);
}

// --- level ---
{
  const s = createGame(P(1), { seed: 7, ttMode: 'solo' });
  const pr = s.prog.p1;
  pr.lines = 9; pr.level = 1;
  fillRows(pr, [19], [0, 1, 2, 3]);
  setCur(pr, 'I', 0, 0, 0);
  applyAction(s, 'p1', { type: 'hard' });
  eq('đủ 10 hàng thì lên level 2', pr.level, 2);
  eq('lines=10', pr.lines, 10);
}

// --- top-out (chạm nóc) ---
{
  const s = createGame(P(1), { seed: 7, ttMode: 'solo' });
  const pr = s.prog.p1;
  // chặn đúng ô sinh khối (hàng 0–1, cột 3–6) — KHÔNG lấp đầy hàng
  // (lấp đầy thì lần khoá sau xoá luôn hàng đó, sinh khối lại vừa)
  fillRows(pr, [0, 1], [0, 1, 2, 7, 8, 9]);
  applyAction(s, 'p1', { type: 'hard' }); // khoá khối hiện tại → sinh khối mới bị chặn
  eq('chạm nóc: phase ended', s.phase, 'ended');
  eq('chạm nóc: không có người thắng', s.winner, null);
  check('chạm nóc: losers có mình', s.losers.includes('p1'));
  eq('chạm nóc: endReason topout', s.endReason, 'topout');
  eq('actors sau khi kết thúc = []', actors(s).length, 0);
}

// --- thắng chơi đơn (100 hàng) ---
{
  const s = createGame(P(1), { seed: 7, ttMode: 'solo' });
  const pr = s.prog.p1;
  pr.lines = 99; pr.level = 10;
  fillRows(pr, [19], [0, 1, 2, 3]);
  setCur(pr, 'I', 0, 0, 0);
  applyAction(s, 'p1', { type: 'hard' });
  eq('đủ 100 hàng: phase ended', s.phase, 'ended');
  eq('đủ 100 hàng: winner = p1', s.winner, 'p1');
  eq('đủ 100 hàng: endReason lines', s.endReason, 'lines');
  check('summary có đủ trường', s.final.summary.p1.lines === 100 && s.final.summary.p1.score > 0 && typeof s.final.summary.p1.timeMs === 'number');
}

// --- đua: ai đủ 40 hàng trước thì thắng ---
{
  const s = createGame(P(2), { seed: 7, ttMode: 'race' });
  const pr = s.prog.p1;
  pr.lines = 39; pr.level = 4;
  fillRows(pr, [19], [0, 1, 2, 3]);
  setCur(pr, 'I', 0, 0, 0);
  applyAction(s, 'p1', { type: 'hard' });
  eq('đua: p1 đủ 40 hàng thì thắng', s.winner, 'p1');
  eq('đua: endReason lines', s.endReason, 'lines');
}

// --- đua: tất cả chạm nóc → so điểm ---
{
  const s = createGame(P(2), { seed: 7, ttMode: 'race' });
  s.prog.p1.score = 600; s.prog.p2.score = 500;
  for (const pid of ['p1', 'p2']) {
    fillRows(s.prog[pid], [0, 1], [0, 1, 2, 7, 8, 9]);
    applyAction(s, pid, { type: 'hard' });
  }
  eq('đua chạm nóc hết: điểm cao thắng', s.winner, 'p1');
  eq('đua chạm nóc hết: endReason score', s.endReason, 'score');
}
{
  const s = createGame(P(2), { seed: 7, ttMode: 'race' });
  s.prog.p1.score = 500; s.prog.p2.score = 500;
  for (const pid of ['p1', 'p2']) {
    fillRows(s.prog[pid], [0, 1], [0, 1, 2, 7, 8, 9]);
    applyAction(s, pid, { type: 'hard' });
  }
  eq('đua chạm nóc hết, bằng điểm → hoà', s.winner, null);
  eq('hoà: endReason draw', s.endReason, 'draw');
}

// --- xin thua ---
{
  const s = createGame(P(1), { seed: 7, ttMode: 'solo' });
  applyAction(s, 'p1', { type: 'resign' });
  eq('xin thua chơi đơn: thua ngay', s.phase, 'ended');
  eq('xin thua: winner null', s.winner, null);
  eq('xin thua: endReason resign', s.endReason, 'resign');
}
{
  const s = createGame(P(2), { seed: 7, ttMode: 'race' });
  applyAction(s, 'p1', { type: 'resign' });
  eq('xin thua đua: ván tiếp tục', s.phase, 'playing');
  eq('xin thua đua: người xin thua bị loại', s.prog.p1.status, 'resigned');
  check('xin thua đua: người còn lại vẫn trong actors', actors(s).includes('p2'));
}

// --- hành động sai ---
{
  const s = createGame(P(1), { seed: 7, ttMode: 'solo' });
  const r = applyAction(s, 'p1', { type: 'bay' });
  check('hành động lạ thì lỗi', !r.ok);
  const r2 = applyAction(s, 'p99', { type: 'move', dx: 1 });
  check('người không tồn tại thì lỗi', !r2.ok);
  applyAction(s, 'p1', { type: 'resign' });
  const r3 = applyAction(s, 'p1', { type: 'move', dx: 1 });
  check('ván kết thúc rồi thì không đi được', !r3.ok);
}

// --- viewFor: đối thủ không thấy giếng của nhau ---
{
  const s = createGame(P(2), { seed: 7, ttMode: 'race' });
  const v = viewFor(s, 'p1');
  check('view có giếng của mình', Array.isArray(v.my.grid) && v.my.grid.length === H);
  eq('view có 3 khối tiếp theo', v.my.next.length, 3);
  check('view đối thủ không có grid', !('grid' in v.players[1]) && !('my' in v.players[1]));
  check('view đối thủ chỉ có điểm/hàng/level/trạng thái', v.players[1].score === 0 && v.players[1].lines === 0 && v.players[1].lvl === 1 && v.players[1].status === 'playing');
  check('view có mode race', v.race === true && v.solo === false);
}

// --- serialize ---
{
  const s = createGame(P(1), { seed: 42, ttMode: 'solo' });
  applyAction(s, 'p1', { type: 'move', dx: 1 });
  applyAction(s, 'p1', { type: 'hard' });
  const s2 = deserialize(serialize(s));
  eq('serialize/deserialize giữ nguyên state', serialize(s2), serialize(s));
  let bad = false;
  try { deserialize('{"x":1}'); } catch (e) { bad = true; }
  check('deserialize state lỗi thì throw', bad);
}

// --- actors ---
{
  const s = createGame(P(2), { seed: 7, ttMode: 'race' });
  eq('actors lúc đầu = cả 2 người', actors(s).join(','), 'p1,p2');
}

// --- hằng số & hành động rơi ---
eq('W=10', W, 10);
eq('H=20', H, 20);
eq('RACE_LINES=40', RACE_LINES, 40);
eq('SOLO_LINES=100', SOLO_LINES, 100);
eq('SCORES Tetris=800', SCORES[4], 800);
eq('SCORES single=100', SCORES[1], 100);
{
  // tick rơi 1 hàng; tick ở đáy thì khoá
  const s = createGame(P(1), { seed: 7, ttMode: 'solo' });
  const pr = s.prog.p1;
  setCur(pr, 'O', 0, 4, 0);
  applyAction(s, 'p1', { type: 'tick' });
  eq('tick rơi 1 hàng', pr.cur.y, 1);
  setCur(pr, 'O', 0, 4, 18);
  const before = pr.piecesPlaced;
  applyAction(s, 'p1', { type: 'tick' });
  eq('tick ở đáy thì khoá khối', pr.piecesPlaced, before + 1);
  check('sau khi khoá thì có khối mới', !!pr.cur);
  // soft drop ở đáy thì khoá luôn
  setCur(pr, 'O', 0, 0, 18);
  const b2 = pr.piecesPlaced;
  applyAction(s, 'p1', { type: 'soft' });
  eq('soft drop ở đáy thì khoá', pr.piecesPlaced, b2 + 1);
  // xoay ngược chiều
  setCur(pr, 'T', 1, 4, 0);
  applyAction(s, 'p1', { type: 'rotate', dir: -1 });
  eq('xoay ngược chiều về rot 0', pr.cur.rot, 0);
  // tường phải: O ở x=7 (ô ở cột 8,9) không sang phải được
  setCur(pr, 'O', 0, 7, 0);
  applyAction(s, 'p1', { type: 'move', dx: 1 });
  eq('khối sát tường phải không sang phải được', pr.cur.x, 7);
}
{
  // hold đổi khối rồi đổi lại được sau khi khoá
  const s = createGame(P(1), { seed: 7, ttMode: 'solo' });
  const pr = s.prog.p1;
  const first = pr.cur.type;
  applyAction(s, 'p1', { type: 'hold' });
  const second = pr.cur.type;
  applyAction(s, 'p1', { type: 'hard' });
  const third = pr.cur.type; // khối đang rơi sau khi khoá khối thứ 2
  applyAction(s, 'p1', { type: 'hold' });
  eq('giữ lần 2 sau khi khoá thì lấy lại khối đầu', pr.cur.type, first);
  check('khối thứ 3 nằm trong ô giữ', pr.hold === third);
  // hàng đợi luôn đủ 7
  eq('next luôn có 7 khối chờ', pr.next.length, 7);
  // maxCombo ghi lại combo cao nhất
  const s2 = createGame(P(1), { seed: 7, ttMode: 'solo' });
  const pr2 = s2.prog.p1;
  for (let k = 0; k < 3; k++) {
    fillRows(pr2, [19], [0, 1, 2, 3]);
    setCur(pr2, 'I', 0, 0, 0);
    applyAction(s2, 'p1', { type: 'hard' });
  }
  eq('combo 3 lần liên tiếp → maxCombo=3', pr2.maxCombo, 3);
  eq('3 lần xoá đơn liên tiếp: 100+150+200 (+hard drop)', pr2.score, (100 + 36) + (100 + 50 + 36) + (100 + 100 + 36));
}
{
  // viewFor chơi đơn
  const s = createGame(P(1), { seed: 7, ttMode: 'solo' });
  const v = viewFor(s, 'p1');
  check('view solo: solo=true', v.solo === true && v.race === false);
  check('view solo: không có đối thủ', v.players.length === 1);
}

console.log(`\nTetris rules: ${pass} pass, ${fail} fail.`);
