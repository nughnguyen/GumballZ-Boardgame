/* Xếp Kẹo rules tests — node only, no DOM. Seeded Math.random for stability. */
import { createGame, applyAction, actors, viewFor, serialize, deserialize, mulberry32, findMatches, isLegalSwap, legalSwaps, hasLegalMove, resolveBoard, reshuffleBoard, GRID_W, GRID_H, TYPES, MOVES, TARGET_SCORE } from '../js/engine.js';
import { botAction } from '../js/bot.js';

Math.random = mulberry32(987654321);

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }
function eq(name, a, b) { check(name, a === b, `got ${a}, want ${b}`); }

const P = n => Array.from({ length: n }, (_, i) => ({ id: 'p' + (i + 1), name: 'P' + (i + 1) }));
const swap = (s, pid, x1, y1, x2, y2) => applyAction(s, pid, { type: 'swap', x1, y1, x2, y2 });
/* Bảng an toàn: grid[y][x] = (x + 2y) % 5 — không có hàng 3 nào, không có
   2 ô kề nào giống nhau theo hàng/cột (mọi dãy kề đều khác nhau). */
function safeGrid() {
  const g = [];
  for (let y = 0; y < GRID_H; y++) {
    g.push([]);
    for (let x = 0; x < GRID_W; x++) g[y].push((x + 2 * y) % TYPES);
  }
  return g;
}
function setGrid(prog, g) { prog.grid = g.map(r => r.slice()); }
function gridFrom(rows) { return rows.map(r => r.split('').map(Number)); }
/* rand quay vòng 0,1,2,3,4 — kẹo mới rơi xuống không bao giờ tạo hàng 3
   (mỗi cột nhận các loại khác nhau liên tiếp, mỗi hàng mới cũng vậy). */
function cycleRand() { let i = 0; return () => ((i++) % TYPES) / TYPES; }

// --- validation ---
let threw = false;
try { createGame(P(2), { seed: 1, xcMode: 'solo' }); } catch (e) { threw = true; }
check('solo với 2 người thì lỗi', threw);
threw = false;
try { createGame(P(1), { seed: 1, xcMode: 'race' }); } catch (e) { threw = true; }
check('đua với 1 người thì lỗi', threw);
threw = false;
try { createGame(P(5), { seed: 1, xcMode: 'race' }); } catch (e) { threw = true; }
check('5 người thì lỗi', threw);

// --- spawn ---
{
  const s = createGame(P(1), { seed: 123, xcMode: 'solo' });
  const pr = s.prog.p1;
  eq('bảng 8×8', pr.grid.length, GRID_H);
  eq('mỗi hàng 8 ô', pr.grid[0].length, GRID_W);
  check('mọi ô đều là kẹo 0..4', pr.grid.flat().every(v => v >= 0 && v < TYPES));
  eq('bảng đầu không có hàng sẵn', findMatches(pr.grid).length, 0);
  check('bảng đầu có nước đi', hasLegalMove(pr.grid));
  eq('điểm bắt đầu 0', pr.score, 0);
  eq('lượt đã dùng 0', pr.movesUsed, 0);
  eq('phase playing', s.phase, 'playing');
}

// --- findMatches: hàng ngang / dọc / không có ---
{
  const g = safeGrid();
  eq('bảng an toàn: 0 nhóm', findMatches(g).length, 0);
  g[7][0] = 1; g[7][1] = 1; g[7][2] = 1; /* hàng ngang 3 ở cuối */
  const m = findMatches(g);
  eq('hàng ngang 3: 1 nhóm', m.length, 1);
  eq('nhóm ngang: 3 ô', m[0].cells.length, 3);
  eq('nhóm ngang: horizontal true', m[0].horizontal, true);
  const g2 = safeGrid();
  g2[0][0] = 2; g2[1][0] = 2; g2[2][0] = 2; /* hàng dọc 3 ở cột 0 */
  const m2 = findMatches(g2);
  eq('hàng dọc 3: 1 nhóm', m2.length, 1);
  eq('nhóm dọc: horizontal false', m2[0].horizontal, false);
  const g3 = safeGrid();
  g3[7] = [3, 3, 3, 3, 4, 0, 1, 2]; /* hàng ngang 4 = 1 nhóm (cột 4 đổi thành 4 để không thành 5) */
  eq('hàng ngang 4: vẫn 1 nhóm', findMatches(g3).length, 1);
  eq('nhóm 4 có 4 ô', findMatches(g3)[0].cells.length, 4);
}

// --- isLegalSwap / legalSwaps ---
{
  const g = safeGrid();
  /* hàng cuối: [4,0,1,2,3,4,0,1] → đổi (2,7)<->(3,7) thành [4,0,2,1,...]: chưa đủ 3.
     Đặt lại hàng cuối thành [1,1,2,1,3,4,0,2]: đổi (2,7)<->(3,7) → [1,1,1,2,...] */
  g[7] = [1, 1, 2, 1, 3, 4, 0, 2];
  check('đổi tạo hàng 3 → hợp lệ', isLegalSwap(g, 2, 7, 3, 7));
  check('đổi không tạo hàng → không hợp lệ', !isLegalSwap(g, 0, 7, 1, 7));
  check('đổi 2 ô không kề → không hợp lệ', !isLegalSwap(g, 0, 7, 2, 7));
  check('đổi 2 ô giống nhau → không hợp lệ', !isLegalSwap(g, 0, 7, 1, 7)); /* 1 và 1 giống nhau */
  check('đổi ra ngoài bảng → không hợp lệ', !isLegalSwap(g, 0, 0, -1, 0));
  check('legalSwaps tìm được nước đi', legalSwaps(g).length >= 1);
  const dead = gridFrom([
    '01201201', '12012012', '20120120', '01201201',
    '12012012', '20120120', '01201201', '12012012',
  ]); /* (x+y)%3 — bảng chết: không hàng, không nước đi */
  eq('bảng chết: 0 nhóm', findMatches(dead).length, 0);
  eq('bảng chết: 0 nước đi hợp lệ', legalSwaps(dead).length, 0);
}

// --- đổi hợp lệ: nổ 3, +60đ, mất 1 lượt ---
{
  const s = createGame(P(1), { seed: 5, xcMode: 'solo' });
  const g = safeGrid();
  g[7] = [1, 1, 2, 1, 3, 4, 0, 2];
  setGrid(s.prog.p1, g);
  const r = swap(s, 'p1', 2, 7, 3, 7);
  eq('đổi tạo hàng: ok', r.ok, true);
  check('đổi tạo hàng: điểm tăng ít nhất 60', s.prog.p1.score >= 60, `score=${s.prog.p1.score}`);
  eq('đổi tạo hàng: mất 1 lượt', s.prog.p1.movesUsed, 1);
  eq('đổi tạo hàng: bảng không còn hàng sau khi nổ', findMatches(s.prog.p1.grid).length, 0);
  check('đổi tạo hàng: bảng vẫn có nước đi', hasLegalMove(s.prog.p1.grid));
}

// --- đổi không hợp lệ: không mất lượt, bảng không đổi ---
{
  const s = createGame(P(1), { seed: 5, xcMode: 'solo' });
  const g = safeGrid();
  g[7] = [1, 1, 2, 1, 3, 4, 0, 2];
  setGrid(s.prog.p1, g);
  const before = JSON.stringify(s.prog.p1.grid);
  const r = swap(s, 'p1', 0, 7, 1, 7);
  eq('đổi không tạo hàng: ok false', r.ok, false);
  eq('đổi không tạo hàng: không mất lượt', s.prog.p1.movesUsed, 0);
  eq('đổi không tạo hàng: điểm 0', s.prog.p1.score, 0);
  eq('đổi không tạo hàng: bảng không đổi', JSON.stringify(s.prog.p1.grid), before);
  eq('đổi 2 ô không kề: ok false', swap(s, 'p1', 0, 7, 2, 7).ok, false);
}

// --- resolveBoard: hàng 4 nổ cả hàng (+120 + 4 ô thêm ×10 = 160, không dây chuyền) ---
{
  const g = safeGrid();
  g[7] = [2, 2, 2, 2, 3, 4, 0, 1]; /* hàng ngang 4 ở cuối, loại 2 */
  const res = resolveBoard(g, cycleRand());
  eq('hàng 4: điểm 160', res.points, 160, `got ${res.points}`);
  eq('hàng 4: 1 nhóm', res.groups, 1);
  eq('hàng 4: không dây chuyền', res.maxMult, 1);
  eq('hàng 4: bảng không còn hàng', findMatches(g).length, 0);
}

// --- resolveBoard: hàng 5 nổ toàn bộ cùng loại ---
{
  const g = safeGrid();
  g[7] = [1, 1, 1, 1, 1, 4, 0, 1]; /* hàng ngang 5 ở cuối, loại 1 */
  const type1Before = g.flat().filter(v => v === 1).length;
  const res = resolveBoard(g, cycleRand());
  eq('hàng 5: điểm = 200 + (số ô loại 1 còn lại × 10)', res.points, 200 + (type1Before - 5) * 10, `got ${res.points}, type1=${type1Before}`);
  eq('hàng 5: 1 nhóm', res.groups, 1);
  /* kẹo mới rơi xuống sau khi nổ có thể lại là loại 1, nên không kiểm
     "không còn loại 1" — điểm đã chứng minh nổ toàn bộ cùng loại. */
  eq('hàng 5: bảng không còn hàng', findMatches(g).length, 0);
}

// --- resolveBoard: dây chuyền ×2 (60 + 60×2 = 180, 2 nhóm) ---
{
  /* Cột 0 có 1,1,1 ở hàng 5-7 (nhóm duy nhất lúc đầu). Sau khi nổ,
     3 kẹo mới loại 0 rơi vào hàng 0-2 cột 0 → lại thành hàng dọc 3.
     rand: 3 lần đầu trả 0, sau đó quay vòng 1,2,3,4. */
  const g = gridFrom([
    '31234123', '42341234', '23412341', '24123412',
    '31234123', '12341234', '13412341', '14123412',
  ]);
  eq('dây chuyền: lúc đầu đúng 1 nhóm', findMatches(g).length, 1);
  let calls = 0;
  const rand = () => { calls++; if (calls <= 3) return 0; return [0.3, 0.5, 0.7, 0.9][(calls - 4) % 4]; };
  const res = resolveBoard(g, rand);
  eq('dây chuyền: điểm 180', res.points, 180, `got ${res.points}`);
  eq('dây chuyền: 2 nhóm', res.groups, 2);
  eq('dây chuyền: maxMult 2', res.maxMult, 2);
  eq('dây chuyền: bảng không còn hàng', findMatches(g).length, 0);
}

// --- xáo lại bảng chết ---
{
  const s = createGame(P(1), { seed: 5, xcMode: 'solo' });
  const dead = gridFrom([
    '01201201', '12012012', '20120120', '01201201',
    '12012012', '20120120', '01201201', '12012012',
  ]);
  setGrid(s.prog.p1, dead);
  reshuffleBoard(s, s.prog.p1);
  eq('xáo bảng chết: không còn hàng', findMatches(s.prog.p1.grid).length, 0);
  check('xáo bảng chết: có nước đi', hasLegalMove(s.prog.p1.grid));
  eq('xáo bảng: không tính điểm', s.prog.p1.score, 0);
}

// --- thắng chơi đơn: đủ 5000 điểm ---
{
  const s = createGame(P(1), { seed: 5, xcMode: 'solo' });
  const g = safeGrid();
  g[7] = [1, 1, 2, 1, 3, 4, 0, 2];
  setGrid(s.prog.p1, g);
  s.prog.p1.score = TARGET_SCORE - 60;
  swap(s, 'p1', 2, 7, 3, 7);
  eq('đủ 5000: chơi đơn thắng ngay', s.phase, 'ended');
  eq('đủ 5000: người thắng là p1', s.winner, 'p1');
  eq('đủ 5000: endReason score', s.endReason, 'score');
  check('đủ 5000: summary ghi điểm ≥ 5000', s.final.summary.p1.score >= TARGET_SCORE);
  eq('đủ 5000: summary ghi lượt đã dùng', s.final.summary.p1.movesUsed, 1);
}

// --- thua chơi đơn: hết 30 lượt chưa đủ 5000 ---
{
  const s = createGame(P(1), { seed: 5, xcMode: 'solo' });
  const g = safeGrid();
  g[7] = [1, 1, 2, 1, 3, 4, 0, 2];
  setGrid(s.prog.p1, g);
  s.prog.p1.movesUsed = MOVES - 1;
  s.prog.p1.score = 100;
  swap(s, 'p1', 2, 7, 3, 7);
  eq('hết 30 lượt: chơi đơn thua', s.phase, 'ended');
  eq('hết 30 lượt: không có người thắng', s.winner, null);
  eq('hết 30 lượt: endReason moves', s.endReason, 'moves');
  eq('hết 30 lượt: p1 là người thua', s.losers.includes('p1'), true);
}

// --- đua: hết lượt thì xong, ai nhiều điểm hơn thắng ---
{
  const s = createGame(P(2), { seed: 5, xcMode: 'race' });
  const g = safeGrid();
  g[7] = [1, 1, 2, 1, 3, 4, 0, 2];
  setGrid(s.prog.p1, g);
  setGrid(s.prog.p2, g);
  s.prog.p1.movesUsed = MOVES - 1; s.prog.p1.score = 200;
  s.prog.p2.movesUsed = MOVES - 1; s.prog.p2.score = 50;
  swap(s, 'p1', 2, 7, 3, 7);
  eq('đua: p1 hết lượt, ván chưa kết thúc', s.phase, 'playing');
  eq('đua: p1 không còn là actor', actors(s).includes('p1'), false);
  eq('đua: p2 vẫn là actor', actors(s).includes('p2'), true);
  swap(s, 'p2', 2, 7, 3, 7);
  eq('đua: cả 2 hết lượt → kết thúc', s.phase, 'ended');
  eq('đua: người nhiều điểm thắng', s.winner, 'p1');
  eq('đua: endReason score', s.endReason, 'score');
}

// --- đua: bằng điểm khi hết lượt → hoà ---
{
  const s = createGame(P(2), { seed: 5, xcMode: 'race' });
  const g = safeGrid();
  g[7] = [1, 1, 2, 1, 3, 4, 0, 2];
  setGrid(s.prog.p1, g);
  setGrid(s.prog.p2, g);
  s.prog.p1.movesUsed = MOVES - 1; s.prog.p1.score = 100;
  s.prog.p2.movesUsed = MOVES - 1; s.prog.p2.score = 100;
  swap(s, 'p1', 2, 7, 3, 7);
  swap(s, 'p2', 2, 7, 3, 7);
  eq('đua bằng điểm: hoà', s.phase, 'ended');
  eq('đua bằng điểm: winner null', s.winner, null);
  eq('đua bằng điểm: endReason draw', s.endReason, 'draw');
}

// --- đua: 1 người xin thua, người còn lại chơi tiếp ---
{
  const s = createGame(P(2), { seed: 5, xcMode: 'race' });
  applyAction(s, 'p1', { type: 'resign' });
  eq('xin thua đua: p1 bị loại, ván chưa kết thúc', s.phase, 'playing');
  eq('xin thua đua: p2 vẫn chơi', actors(s).includes('p2'), true);
  applyAction(s, 'p2', { type: 'resign' });
  eq('xin thua đua: cả 2 xin thua → hoà', s.endReason, 'draw');
}

// --- xin thua chơi đơn ---
{
  const s = createGame(P(1), { seed: 5, xcMode: 'solo' });
  const r = applyAction(s, 'p1', { type: 'resign' });
  eq('xin thua solo: ok', r.ok, true);
  eq('xin thua solo: kết thúc', s.phase, 'ended');
  eq('xin thua solo: không có người thắng', s.winner, null);
  eq('xin thua solo: endReason resign', s.endReason, 'resign');
  eq('xin thua solo: trạng thái resigned', s.prog.p1.status, 'resigned');
}

// --- hành động không hợp lệ ---
{
  const s = createGame(P(1), { seed: 5, xcMode: 'solo' });
  eq('toạ độ ngoài bảng → ok false', swap(s, 'p1', 0, 0, -1, 0).ok, false);
  eq('loại hành động không hợp lệ → ok false', applyAction(s, 'p1', { type: 'jump' }).ok, false);
  eq('đổi cho người không tồn tại → ok false', applyAction(s, 'px', { type: 'swap', x1: 0, y1: 0, x2: 1, y2: 0 }).ok, false);
  applyAction(s, 'p1', { type: 'resign' });
  eq('hành động sau khi ván kết thúc → ok false', swap(s, 'p1', 0, 0, 1, 0).ok, false);
}

// --- serialize / deserialize ---
{
  const s = createGame(P(2), { seed: 42, xcMode: 'race' });
  const g = safeGrid();
  g[7] = [1, 1, 2, 1, 3, 4, 0, 2];
  setGrid(s.prog.p1, g);
  swap(s, 'p1', 2, 7, 3, 7);
  const s2 = deserialize(serialize(s));
  eq('deserialize: bảng p1 giống hệt', JSON.stringify(s2.prog.p1.grid), JSON.stringify(s.prog.p1.grid));
  eq('deserialize: điểm p1 giống hệt', s2.prog.p1.score, s.prog.p1.score);
  eq('deserialize: lượt p1 giống hệt', s2.prog.p1.movesUsed, s.prog.p1.movesUsed);
  eq('deserialize: phase giống hệt', s2.phase, s.phase);
  setGrid(s2.prog.p2, g);
  setGrid(s.prog.p2, g); /* cả 2 ván đều dùng cùng 1 bảng cho p2 */
  swap(s, 'p2', 2, 7, 3, 7);
  swap(s2, 'p2', 2, 7, 3, 7);
  eq('deserialize xong chơi tiếp vẫn đồng bộ (điểm)', s.prog.p2.score, s2.prog.p2.score);
  eq('deserialize xong chơi tiếp vẫn đồng bộ (bảng)', JSON.stringify(s.prog.p2.grid), JSON.stringify(s2.prog.p2.grid));
}

// --- viewFor: mỗi người chỉ thấy bảng của mình ---
{
  const s = createGame(P(2), { seed: 31, xcMode: 'race' });
  const v1 = viewFor(s, 'p1');
  const v2 = viewFor(s, 'p2');
  eq('view p1.me = p1', v1.me, 'p1');
  eq('view p2.me = p2', v2.me, 'p2');
  check('view p1 có bảng của mình (8×8)', Array.isArray(v1.my.grid) && v1.my.grid.length === 8 && v1.my.grid[0].length === 8);
  check('view không lộ bảng đối thủ (players chỉ có tóm tắt)', v1.players.every(p => !p.grid));
  check('view p1 thấy điểm p2 qua tóm tắt', typeof v1.players.find(p => p.id === 'p2').score === 'number');
  check('view p1 thấy lượt còn lại của p2', v1.players.find(p => p.id === 'p2').movesLeft === MOVES);
  /* sửa bảng trong view không làm hỏng state thật (view là bản sao) */
  v1.my.grid[0][0] = 99;
  check('view.my.grid là bản sao, không phải tham chiếu', s.prog.p1.grid[0][0] !== 99);
}

// --- bot chơi 30 lượt không lỗi, bảng luôn có nước đi ---
{
  Math.random = mulberry32(2024);
  const s = createGame([{ id: 'p1', name: 'P1', isBot: true, level: 'hard' }], { seed: 2024, xcMode: 'solo' });
  let bad = 0, moves = 0;
  while (s.phase === 'playing' && moves < 40) {
    const a = botAction(s, 'p1');
    if (!a) break;
    const r = applyAction(s, 'p1', a);
    if (!r.ok) bad++;
    moves++;
    if (s.prog.p1.status === 'playing' && !hasLegalMove(s.prog.p1.grid)) bad++;
  }
  eq('bot chơi 30 lượt: 0 nước sai luật, bảng luôn có nước đi', bad, 0);
  check('bot chơi hết 30 lượt thì ván kết thúc', s.phase === 'ended' || moves === 30, `phase=${s.phase} moves=${moves}`);
}

console.log(`\nXếp Kẹo rules: ${pass} pass, ${fail} fail.`);
