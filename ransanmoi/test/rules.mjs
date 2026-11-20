/* Rắn Săn Mồi rules tests — node only, no DOM. Seeded Math.random for stability. */
import { createGame, applyAction, actors, viewFor, serialize, deserialize, mulberry32, speedFor, GRID_W, GRID_H, SOLO_WIN_LEN, RACE_WIN_LEN, FOOD_SCORE, START_LEN } from '../js/engine.js';
import { botAction } from '../js/bot.js';

Math.random = mulberry32(987654321);

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }
function eq(name, a, b) { check(name, a === b, `got ${a}, want ${b}`); }

const P = n => Array.from({ length: n }, (_, i) => ({ id: 'p' + (i + 1), name: 'P' + (i + 1) }));
function setSnake(prog, cells, dir) {
  prog.snake = cells.map(([x, y]) => ({ x, y }));
  prog.dir = dir;
  prog.queue = [];
}
function setFood(prog, x, y) { prog.food = { x, y }; }
const tick = (s, pid) => applyAction(s, pid, { type: 'tick' });
const move = (s, pid, dir) => applyAction(s, pid, { type: 'move', dir });

// --- validation ---
let threw = false;
try { createGame(P(2), { seed: 1, rsMode: 'solo' }); } catch (e) { threw = true; }
check('solo với 2 người thì lỗi', threw);
threw = false;
try { createGame(P(1), { seed: 1, rsMode: 'race' }); } catch (e) { threw = true; }
check('đua với 1 người thì lỗi', threw);
threw = false;
try { createGame(P(5), { seed: 1, rsMode: 'race' }); } catch (e) { threw = true; }
check('5 người thì lỗi', threw);

// --- spawn ---
{
  const s = createGame(P(1), { seed: 123, rsMode: 'solo' });
  const pr = s.prog.p1;
  eq('rắn bắt đầu dài 4', pr.snake.length, START_LEN);
  eq('đầu rắn ở (10,10)', pr.snake[0].x + ',' + pr.snake[0].y, '10,10');
  eq('hướng ban đầu sang phải', pr.dir, 'right');
  check('mồi không nằm trên thân rắn', !pr.snake.some(c => c.x === pr.food.x && c.y === pr.food.y));
  check('mồi trong bảng', pr.food.x >= 0 && pr.food.x < GRID_W && pr.food.y >= 0 && pr.food.y < GRID_H);
  eq('điểm bắt đầu 0', pr.score, 0);
  eq('số mồi bắt đầu 0', pr.foods, 0);
  eq('phase playing', s.phase, 'playing');
}

// --- di chuyển cơ bản ---
{
  const s = createGame(P(1), { seed: 5, rsMode: 'solo' });
  tick(s, 'p1');
  eq('tick 1: đầu sang (11,10)', s.prog.p1.snake[0].x + ',' + s.prog.p1.snake[0].y, '11,10');
  eq('tick 1: vẫn dài 4 (đuôi nhích đi)', s.prog.p1.snake.length, 4);
  eq('tick 1: đuôi cũ rời đi', s.prog.p1.snake[3].x + ',' + s.prog.p1.snake[3].y, '8,10');
  move(s, 'p1', 'up');
  tick(s, 'p1');
  eq('đổi hướng lên: đầu lên (11,9)', s.prog.p1.snake[0].x + ',' + s.prog.p1.snake[0].y, '11,9');
}

// --- không quay đầu 180° ---
{
  const s = createGame(P(1), { seed: 5, rsMode: 'solo' });
  move(s, 'p1', 'left'); /* đang đi phải, quay trái = 180° */
  eq('quay đầu 180° bị loại khỏi hàng đợi', s.prog.p1.queue.length, 0);
  tick(s, 'p1');
  eq('quay đầu 180° bị bỏ qua, rắn vẫn đi phải', s.prog.p1.snake[0].x, 11);
}

// --- hàng đợi hướng: tối đa 3, không trùng liên tiếp, áp dụng 1/tick ---
{
  const s = createGame(P(1), { seed: 5, rsMode: 'solo' });
  move(s, 'p1', 'up');
  move(s, 'p1', 'up');
  eq('hướng trùng liên tiếp không xếp 2 lần', s.prog.p1.queue.length, 1);
  move(s, 'p1', 'left');
  move(s, 'p1', 'down');
  move(s, 'p1', 'right'); /* hàng đợi đã đầy 3 */
  eq('hàng đợi tối đa 3 hướng', s.prog.p1.queue.length, 3);
  eq('hàng đợi giữ đúng thứ tự', s.prog.p1.queue.join(','), 'up,left,down');
  tick(s, 'p1');
  eq('tick 1 áp dụng hướng đầu hàng đợi (up)', s.prog.p1.dir, 'up');
  eq('tick 1: đầu lên (10,9)', s.prog.p1.snake[0].x + ',' + s.prog.p1.snake[0].y, '10,9');
  tick(s, 'p1');
  eq('tick 2 áp dụng hướng tiếp theo (left)', s.prog.p1.dir, 'left');
  eq('tick 2: đầu sang trái (9,9)', s.prog.p1.snake[0].x + ',' + s.prog.p1.snake[0].y, '9,9');
}

// --- ăn mồi ---
{
  const s = createGame(P(1), { seed: 5, rsMode: 'solo' });
  setFood(s.prog.p1, 11, 10);
  tick(s, 'p1');
  eq('ăn mồi: dài +1', s.prog.p1.snake.length, 5);
  eq('ăn mồi: +10 điểm', s.prog.p1.score, FOOD_SCORE);
  eq('ăn mồi: số mồi = 1', s.prog.p1.foods, 1);
  eq('ăn mồi: maxLength = 5', s.prog.p1.maxLength, 5);
  check('ăn mồi: mồi mới không nằm trên thân', !s.prog.p1.snake.some(c => c.x === s.prog.p1.food.x && c.y === s.prog.p1.food.y));
  tick(s, 'p1'); /* không ăn: đuôi nhích đi, vẫn dài 5 */
  eq('sau khi ăn: không ăn thì vẫn dài 5', s.prog.p1.snake.length, 5);
}

// --- tốc độ tăng theo số mồi ---
eq('speedFor(0) = 180ms', speedFor(0), 180);
eq('speedFor(4) = 180ms', speedFor(4), 180);
eq('speedFor(5) = 170ms', speedFor(5), 170);
eq('speedFor(10) = 160ms', speedFor(10), 160);
eq('speedFor(45) = 90ms (tối thiểu)', speedFor(45), 90);
eq('speedFor(100) = 90ms (không xuống dưới 90)', speedFor(100), 90);

// --- chết vì đâm tường ---
{
  const s = createGame(P(1), { seed: 5, rsMode: 'solo' });
  setSnake(s.prog.p1, [[19, 10], [18, 10], [17, 10], [16, 10]], 'right');
  tick(s, 'p1');
  eq('đâm tường: trạng thái dead', s.prog.p1.status, 'dead');
  eq('đâm tường: chơi đơn kết thúc', s.phase, 'ended');
  eq('đâm tường: không có người thắng', s.winner, null);
  eq('đâm tường: endReason dead', s.endReason, 'dead');
}

// --- chết vì tự cắn mình ---
{
  const s = createGame(P(1), { seed: 5, rsMode: 'solo' });
  /* đầu (5,5), thân (6,5),(6,6),(5,6),(5,7) — đi phải thì cắn (6,5) */
  setSnake(s.prog.p1, [[5, 5], [6, 5], [6, 6], [5, 6], [5, 7]], 'right');
  tick(s, 'p1');
  eq('tự cắn: trạng thái dead', s.prog.p1.status, 'dead');
  eq('tự cắn: chơi đơn kết thúc', s.phase, 'ended');
  eq('tự cắn: endReason dead', s.endReason, 'dead');
}

// --- được phép đi vào ô đuôi cũ (đuôi sẽ nhích đi) ---
{
  const s = createGame(P(1), { seed: 5, rsMode: 'solo' });
  /* đầu (5,5), thân (5,6),(6,6),(6,5) — đuôi là (6,5); đi phải vào đúng ô đuôi */
  setSnake(s.prog.p1, [[5, 5], [5, 6], [6, 6], [6, 5]], 'right');
  tick(s, 'p1');
  eq('đi vào ô đuôi cũ: không chết', s.prog.p1.status, 'playing');
  eq('đi vào ô đuôi cũ: đầu ở (6,5)', s.prog.p1.snake[0].x + ',' + s.prog.p1.snake[0].y, '6,5');
  eq('đi vào ô đuôi cũ: vẫn dài 4', s.prog.p1.snake.length, 4);
}

// --- ăn mồi thì đuôi không nhích: ô đuôi thành chướng ngại ---
{
  const s = createGame(P(1), { seed: 5, rsMode: 'solo' });
  /* đầu (5,5), thân (5,6),(6,6),(6,5); mồi ở (6,5) = ô đuôi */
  setSnake(s.prog.p1, [[5, 5], [5, 6], [6, 6], [6, 5]], 'right');
  setFood(s.prog.p1, 6, 5);
  tick(s, 'p1');
  eq('ăn mồi trên ô đuôi: chết vì tự cắn (đuôi không nhích)', s.prog.p1.status, 'dead');
}

// --- thắng chơi đơn: dài 20 ---
{
  const s = createGame(P(1), { seed: 5, rsMode: 'solo' });
  const cells = [];
  for (let x = 18; x >= 0; x--) cells.push([x, 10]); /* dài 19, đầu (18,10) */
  setSnake(s.prog.p1, cells, 'right');
  s.prog.p1.score = 180; s.prog.p1.foods = 18; s.prog.p1.maxLength = 19;
  setFood(s.prog.p1, 19, 10);
  tick(s, 'p1');
  eq('dài 20: chơi đơn thắng ngay', s.phase, 'ended');
  eq('dài 20: người thắng là p1', s.winner, 'p1');
  eq('dài 20: endReason length', s.endReason, 'length');
  eq('dài 20: summary ghi đúng độ dài', s.final.summary.p1.length, 20);
  eq('dài 20: summary ghi đúng điểm', s.final.summary.p1.score, 190);
}

// --- thắng đua: dài 15 ---
{
  const s = createGame(P(2), { seed: 5, rsMode: 'race' });
  const cells = [];
  for (let x = 13; x >= 0; x--) cells.push([x, 10]); /* dài 14, đầu (13,10) */
  setSnake(s.prog.p1, cells, 'right');
  s.prog.p1.score = 130; s.prog.p1.foods = 13; s.prog.p1.maxLength = 14;
  setFood(s.prog.p1, 14, 10);
  tick(s, 'p1');
  eq('dài 15: đua thắng ngay', s.phase, 'ended');
  eq('dài 15: người thắng là p1', s.winner, 'p1');
  eq('dài 15: endReason length', s.endReason, 'length');
  eq('dài 15: p2 là người thua', s.losers.includes('p2'), true);
}

// --- đua: 1 người chết, người còn lại chơi tiếp ---
{
  const s = createGame(P(2), { seed: 5, rsMode: 'race' });
  setSnake(s.prog.p1, [[19, 10], [18, 10], [17, 10], [16, 10]], 'right');
  tick(s, 'p1');
  eq('đua: p1 chết, ván chưa kết thúc', s.phase, 'playing');
  eq('đua: p1 không còn là actor', actors(s).includes('p1'), false);
  eq('đua: p2 vẫn là actor', actors(s).includes('p2'), true);
  /* p2 chết luôn: so độ dài — p2 dài 4, p1 dài 4, điểm 0-0 → hoà */
  setSnake(s.prog.p2, [[19, 5], [18, 5], [17, 5], [16, 5]], 'right');
  tick(s, 'p2');
  eq('đua: cả 2 chết, cùng dài cùng điểm → hoà', s.phase, 'ended');
  eq('đua: hoà thì winner null', s.winner, null);
  eq('đua: endReason draw', s.endReason, 'draw');
}

// --- đua: cả 2 chết, người dài hơn thắng ---
{
  const s = createGame(P(2), { seed: 5, rsMode: 'race' });
  setSnake(s.prog.p1, [[19, 10], [18, 10], [17, 10], [16, 10], [15, 10]], 'right'); /* dài 5 */
  s.prog.p1.score = 10;
  setSnake(s.prog.p2, [[19, 5], [18, 5], [17, 5], [16, 5]], 'right'); /* dài 4 */
  tick(s, 'p1');
  tick(s, 'p2');
  eq('đua: người dài hơn thắng khi cả 2 chết', s.winner, 'p1');
  eq('đua: endReason score', s.endReason, 'score');
}

// --- đua: cùng dài, người nhiều điểm hơn thắng ---
{
  const s = createGame(P(2), { seed: 5, rsMode: 'race' });
  setSnake(s.prog.p1, [[19, 10], [18, 10], [17, 10], [16, 10]], 'right');
  s.prog.p1.score = 20; /* cùng dài 4 nhưng nhiều điểm hơn */
  setSnake(s.prog.p2, [[19, 5], [18, 5], [17, 5], [16, 5]], 'right');
  s.prog.p2.score = 0;
  tick(s, 'p1');
  tick(s, 'p2');
  eq('đua: cùng dài, người nhiều điểm thắng', s.winner, 'p1');
}

// --- xin thua ---
{
  const s = createGame(P(1), { seed: 5, rsMode: 'solo' });
  const r = applyAction(s, 'p1', { type: 'resign' });
  eq('xin thua solo: ok', r.ok, true);
  eq('xin thua solo: kết thúc', s.phase, 'ended');
  eq('xin thua solo: không có người thắng', s.winner, null);
  eq('xin thua solo: endReason resign', s.endReason, 'resign');
  eq('xin thua solo: trạng thái resigned', s.prog.p1.status, 'resigned');
}
{
  const s = createGame(P(2), { seed: 5, rsMode: 'race' });
  applyAction(s, 'p1', { type: 'resign' });
  eq('xin thua đua: p1 bị loại, ván chưa kết thúc', s.phase, 'playing');
  eq('xin thua đua: p2 vẫn chơi', actors(s).includes('p2'), true);
  applyAction(s, 'p2', { type: 'resign' });
  eq('xin thua đua: cả 2 xin thua → hoà (cùng dài, cùng điểm)', s.endReason, 'draw');
}

// --- hành động không hợp lệ ---
{
  const s = createGame(P(1), { seed: 5, rsMode: 'solo' });
  eq('hướng không hợp lệ → ok false', applyAction(s, 'p1', { type: 'move', dir: 'diagonal' }).ok, false);
  eq('loại hành động không hợp lệ → ok false', applyAction(s, 'p1', { type: 'jump' }).ok, false);
  eq('tick cho người không tồn tại → ok false', applyAction(s, 'px', { type: 'tick' }).ok, false);
  applyAction(s, 'p1', { type: 'resign' });
  eq('hành động sau khi ván kết thúc → ok false', applyAction(s, 'p1', { type: 'tick' }).ok, false);
}

// --- serialize / deserialize ---
{
  const s = createGame(P(2), { seed: 42, rsMode: 'race' });
  move(s, 'p1', 'up'); tick(s, 'p1'); tick(s, 'p1');
  setFood(s.prog.p2, 11, 10); tick(s, 'p2');
  const s2 = deserialize(serialize(s));
  eq('deserialize: rắn p1 giống hệt', JSON.stringify(s2.prog.p1.snake), JSON.stringify(s.prog.p1.snake));
  eq('deserialize: điểm p2 giống hệt', s2.prog.p2.score, s.prog.p2.score);
  eq('deserialize: mồi p1 giống hệt', JSON.stringify(s2.prog.p1.food), JSON.stringify(s.prog.p1.food));
  eq('deserialize: phase giống hệt', s2.phase, s.phase);
  tick(s, 'p1'); tick(s2, 'p1');
  eq('deserialize xong chơi tiếp vẫn đồng bộ', serialize(s) === serialize(s2) || JSON.stringify(s.prog.p1.snake) === JSON.stringify(s2.prog.p1.snake), true);
}

// --- viewFor: mỗi người chỉ thấy bảng của mình ---
{
  const s = createGame(P(2), { seed: 31, rsMode: 'race' });
  tick(s, 'p1');
  const v1 = viewFor(s, 'p1');
  const v2 = viewFor(s, 'p2');
  eq('view p1.me = p1', v1.me, 'p1');
  eq('view p2.me = p2', v2.me, 'p2');
  check('view p1 có rắn của mình', Array.isArray(v1.my.snake) && v1.my.snake.length === 4);
  check('view p1 có mồi của mình', !!v1.my.food);
  check('view không lộ rắn đối thủ (players chỉ có tóm tắt)', v1.players.every(p => !p.snake && !p.food));
  check('view p1 thấy độ dài p2 qua tóm tắt', v1.players.find(p => p.id === 'p2').length === 4);
  check('view p1 thấy điểm p2 qua tóm tắt', typeof v1.players.find(p => p.id === 'p2').score === 'number');
}

// --- mồi không bao giờ xuất hiện trên thân (bot chơi 200 tick) ---
{
  Math.random = mulberry32(2024);
  const s = createGame([{ id: 'p1', name: 'P1', isBot: true, level: 'hard' }], { seed: 2024, rsMode: 'solo' });
  let badFood = 0, ticks = 0;
  while (s.phase === 'playing' && ticks < 500) {
    ticks++;
    const a = botAction(s, 'p1');
    if (a) applyAction(s, 'p1', a);
    tick(s, 'p1');
    const pr = s.prog.p1;
    if (pr.food && pr.snake.some(c => c.x === pr.food.x && c.y === pr.food.y)) badFood++;
  }
  eq('mồi không bao giờ nằm trên thân (200+ tick bot)', badFood, 0);
  check('bot chơi được nhiều tick không lỗi', ticks > 50, `ticks=${ticks}`);
}

console.log(`\nRắn Săn Mồi rules: ${pass} pass, ${fail} fail.`);
