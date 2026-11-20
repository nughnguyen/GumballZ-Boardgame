/* Nonogram rules tests — luật: sinh câu đố, tô đúng/sai, mạng, gợi ý,
   thắng/thua, đua so %, hòa, serialize. */
import { createGame, applyAction, actors, viewFor, serialize, deserialize, cluesForLine, SIZES, LIVES, HINTS, RACE_TIME_MS, CELL, mulberry32 } from '../js/engine.js';

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }
const P = n => Array.from({ length: n }, (_, i) => ({ id: 'p' + (i + 1), name: 'P' + (i + 1) }));
const blackCells = s => { const out = []; for (let y = 0; y < s.size; y++) for (let x = 0; x < s.size; x++) if (s.solution[y][x] === 1) out.push({ x, y }); return out; };
const whiteCells = s => { const out = []; for (let y = 0; y < s.size; y++) for (let x = 0; x < s.size; x++) if (s.solution[y][x] === 0) out.push({ x, y }); return out; };

// --- tạo ván: kích thước + chế độ ---
{
  const s = createGame(P(1), { seed: 1, ngMode: 'solo', size: 5 });
  check('chơi đơn 5×5: size=5, totalBlack trong [22%,68%]', s.size === 5 && s.totalBlack >= 6 && s.totalBlack <= 17, `totalBlack=${s.totalBlack}`);
  check('chơi đơn: solo=true, race=false', s.solo === true && s.race === false);
  check('chơi đơn: 1 người chơi', s.players.length === 1);
  const m = createGame(P(2), { seed: 2, ngMode: 'race', size: 15 });
  check('đua 15×15: size=15, totalBlack trong [22%,68%]', m.size === 15 && m.totalBlack >= 50 && m.totalBlack <= 153, `totalBlack=${m.totalBlack}`);
  const d = createGame(P(1), { seed: 3, ngMode: 'solo' });
  check('không truyền size → mặc định 10', d.size === 10);
  let err = null;
  try { createGame(P(1), { seed: 4, ngMode: 'solo', size: 7 }); } catch (e) { err = e; }
  check('size 7 không hợp lệ → mặc định 10 (không ném lỗi)', err === null && createGame(P(1), { seed: 4, ngMode: 'solo', size: 7 }).size === 10);
  try { createGame(P(2), { seed: 5, ngMode: 'solo' }); } catch (e) { err = e; }
  check('chơi đơn 2 người → ném lỗi', !!err);
  try { createGame(P(1), { seed: 6, ngMode: 'race' }); } catch (e) { err = e; }
  check('đua 1 người → ném lỗi', !!err);
  try { createGame([], { seed: 7 }); } catch (e) { err = e; }
  check('0 người → ném lỗi', !!err);
}

// --- gợi ý đúng với đáp án ---
{
  for (const seed of [11, 22, 33]) {
    const s = createGame(P(1), { seed, ngMode: 'solo', size: 10 });
    let ok = true;
    for (let y = 0; y < 10; y++) if (JSON.stringify(s.rowClues[y]) !== JSON.stringify(cluesForLine(s.solution[y]))) ok = false;
    for (let x = 0; x < 10; x++) if (JSON.stringify(s.colClues[x]) !== JSON.stringify(cluesForLine(s.solution.map(r => r[x])))) ok = false;
    check(`gợi ý hàng/cột khớp đáp án (seed ${seed})`, ok);
  }
  check('cluesForLine: [1,1,0,1,1,1,0] → [2,3]', JSON.stringify(cluesForLine([1, 1, 0, 1, 1, 1, 0])) === '[2,3]');
  check('cluesForLine: toàn trắng → [0]', JSON.stringify(cluesForLine([0, 0, 0])) === '[0]');
  check('cluesForLine: toàn đen → [3]', JSON.stringify(cluesForLine([1, 1, 1])) === '[3]');
}

// --- cùng seed → cùng câu đố; khác seed → khác câu đố (rất có thể) ---
{
  const a = createGame(P(1), { seed: 42, ngMode: 'solo', size: 10 });
  const b = createGame(P(1), { seed: 42, ngMode: 'solo', size: 10 });
  check('cùng seed → cùng đáp án + gợi ý', JSON.stringify(a.solution) === JSON.stringify(b.solution) && JSON.stringify(a.rowClues) === JSON.stringify(b.rowClues));
  const c = createGame(P(1), { seed: 43, ngMode: 'solo', size: 10 });
  check('khác seed → đáp án khác nhau', JSON.stringify(a.solution) !== JSON.stringify(c.solution));
}

// --- tô đúng / tô sai / mạng / khóa ô ---
{
  const s = createGame(P(1), { seed: 101, ngMode: 'solo', size: 5 });
  const b = blackCells(s)[0], w = whiteCells(s)[0];
  let r = applyAction(s, 'p1', { type: 'fill', x: b.x, y: b.y });
  check('tô đúng ô đen → ok, filled=1', r.ok && s.prog.p1.filled === 1 && s.prog.p1.grid[b.y][b.x] === CELL.FILLED);
  r = applyAction(s, 'p1', { type: 'fill', x: b.x, y: b.y });
  check('tô lại ô đã tô → lỗi', !r.ok);
  r = applyAction(s, 'p1', { type: 'fill', x: w.x, y: w.y });
  check('tô sai ô trắng → ok, mistakes=1, ô bị khóa', r.ok && s.prog.p1.mistakes === 1 && s.prog.p1.grid[w.y][w.x] === CELL.LOCKED);
  r = applyAction(s, 'p1', { type: 'fill', x: w.x, y: w.y });
  check('tô lại ô bị khóa → lỗi', !r.ok);
  r = applyAction(s, 'p1', { type: 'clear', x: w.x, y: w.y });
  check('xóa ô bị khóa → lỗi', !r.ok);
  r = applyAction(s, 'p1', { type: 'mark', x: w.x, y: w.y });
  check('đánh dấu ô bị khóa → lỗi', !r.ok);
  r = applyAction(s, 'p1', { type: 'fill', x: -1, y: 0 });
  check('tô ngoài bảng → lỗi', !r.ok);
  r = applyAction(s, 'p1', { type: 'fill', x: 5, y: 5 });
  check('tô ngoài bảng (5,5) → lỗi', !r.ok);
  r = applyAction(s, 'p1', { type: 'nonsense' });
  check('hành động lạ → lỗi', !r.ok);
}

// --- đánh dấu X / xóa ---
{
  const s = createGame(P(1), { seed: 102, ngMode: 'solo', size: 5 });
  const w = whiteCells(s)[0], b = blackCells(s)[0];
  let r = applyAction(s, 'p1', { type: 'mark', x: w.x, y: w.y });
  check('đánh dấu ô trống → ok, ô = MARKED', r.ok && s.prog.p1.grid[w.y][w.x] === CELL.MARKED);
  r = applyAction(s, 'p1', { type: 'mark', x: w.x, y: w.y });
  check('đánh dấu lại ô đã đánh dấu → bỏ dấu', r.ok && s.prog.p1.grid[w.y][w.x] === CELL.EMPTY);
  r = applyAction(s, 'p1', { type: 'fill', x: b.x, y: b.y });
  check('tô đúng rồi xóa → filled về 0', r.ok && s.prog.p1.filled === 1);
  r = applyAction(s, 'p1', { type: 'clear', x: b.x, y: b.y });
  check('clear ô đã tô → ok, filled=0', r.ok && s.prog.p1.filled === 0 && s.prog.p1.grid[b.y][b.x] === CELL.EMPTY);
  r = applyAction(s, 'p1', { type: 'clear', x: b.x, y: b.y });
  check('clear ô trống → lỗi', !r.ok);
  r = applyAction(s, 'p1', { type: 'mark', x: b.x, y: b.y });
  check('đánh dấu ô trống (là ô đen) → ok (dấu chỉ là ghi chú)', r.ok && s.prog.p1.grid[b.y][b.x] === CELL.MARKED);
  r = applyAction(s, 'p1', { type: 'fill', x: b.x, y: b.y });
  check('tô vào ô đang đánh dấu → ok, dấu bị thay bằng tô', r.ok && s.prog.p1.grid[b.y][b.x] === CELL.FILLED && s.prog.p1.filled === 1);
}

// --- hết 3 mạng thì thua (chơi đơn) ---
{
  const s = createGame(P(1), { seed: 103, ngMode: 'solo', size: 5 });
  const ws = whiteCells(s).slice(0, 3);
  applyAction(s, 'p1', { type: 'fill', x: ws[0].x, y: ws[0].y });
  applyAction(s, 'p1', { type: 'fill', x: ws[1].x, y: ws[1].y });
  check('tô sai 2 lần → vẫn đang chơi', s.phase === 'playing' && s.prog.p1.mistakes === 2);
  applyAction(s, 'p1', { type: 'fill', x: ws[2].x, y: ws[2].y });
  check('tô sai lần 3 → thua, endReason dead', s.phase === 'ended' && s.endReason === 'dead' && s.winner === null && s.losers.includes('p1'));
  check('sau khi thua, actors() rỗng', actors(s).length === 0);
  const r = applyAction(s, 'p1', { type: 'fill', x: 0, y: 0 });
  check('ván đã kết thúc → mọi hành động đều lỗi', !r.ok);
}

// --- thắng chơi đơn: tô đủ hết ô đen ---
{
  const s = createGame(P(1), { seed: 104, ngMode: 'solo', size: 5 });
  for (const c of blackCells(s)) applyAction(s, 'p1', { type: 'fill', x: c.x, y: c.y });
  check('tô đủ hết ô đen → thắng, endReason complete', s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'complete');
  check('summary: filled = totalBlack, mistakes = 0', s.final.summary.p1.filled === s.totalBlack && s.final.summary.p1.mistakes === 0);
  check('summary: percent = 1', s.final.summary.p1.percent === 1);
}

// --- gợi ý (hint): tối đa 3, tô đúng 1 ô đen ---
{
  const s = createGame(P(1), { seed: 105, ngMode: 'solo', size: 5 });
  const before = s.prog.p1.filled;
  let r = applyAction(s, 'p1', { type: 'hint' });
  check('hint 1 → ok, filled +1, hintsUsed=1', r.ok && s.prog.p1.filled === before + 1 && s.prog.p1.hintsUsed === 1);
  applyAction(s, 'p1', { type: 'hint' });
  applyAction(s, 'p1', { type: 'hint' });
  check('hint đủ 3 lần → hintsUsed=3', s.prog.p1.hintsUsed === 3);
  r = applyAction(s, 'p1', { type: 'hint' });
  check('hint lần 4 → lỗi (hết lượt)', !r.ok);
  /* hint tô đúng ô đen chưa tô (không bao giờ tô sai) */
  const s2 = createGame(P(1), { seed: 106, ngMode: 'solo', size: 5 });
  applyAction(s2, 'p1', { type: 'hint' });
  const filled = [];
  for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) if (s2.prog.p1.grid[y][x] === CELL.FILLED) filled.push({ x, y });
  check('hint chỉ tô vào ô đáp án đen', filled.length === 1 && s2.solution[filled[0].y][filled[0].x] === 1);
  check('hint không làm tăng mistakes', s2.prog.p1.mistakes === 0);
}

// --- xin thua ---
{
  const s = createGame(P(1), { seed: 107, ngMode: 'solo', size: 5 });
  const r = applyAction(s, 'p1', { type: 'resign' });
  check('xin thua chơi đơn → thua, endReason resign', r.ok && s.phase === 'ended' && s.endReason === 'resign' && s.losers.includes('p1'));
}

// --- đua: ai tô đủ trước thì thắng ---
{
  const s = createGame(P(2), { seed: 108, ngMode: 'race', size: 5 });
  for (const c of blackCells(s)) {
    if (s.phase !== 'playing') break;
    applyAction(s, 'p1', { type: 'fill', x: c.x, y: c.y });
  }
  check('đua: p1 tô đủ trước → thắng, endReason complete', s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'complete');
}

// --- đua: hết 180s so % (timeout) ---
{
  const s = createGame(P(2), { seed: 109, ngMode: 'race', size: 5 });
  const blacks = blackCells(s);
  for (let i = 0; i < 5; i++) applyAction(s, 'p1', { type: 'fill', x: blacks[i].x, y: blacks[i].y });
  for (let i = 0; i < 3; i++) applyAction(s, 'p2', { type: 'fill', x: blacks[i].x, y: blacks[i].y });
  const r = applyAction(s, 'p1', { type: 'timeout' });
  check('timeout → ok, ván kết thúc', r.ok && s.phase === 'ended');
  check('timeout: p1 % cao hơn → p1 thắng, endReason percent', s.winner === 'p1' && s.endReason === 'percent');
  /* hòa % + hòa lỗi → draw */
  const s2 = createGame(P(2), { seed: 110, ngMode: 'race', size: 5 });
  const b2 = blackCells(s2);
  for (let i = 0; i < 4; i++) {
    applyAction(s2, 'p1', { type: 'fill', x: b2[i].x, y: b2[i].y });
    applyAction(s2, 'p2', { type: 'fill', x: b2[i].x, y: b2[i].y });
  }
  applyAction(s2, 'p1', { type: 'timeout' });
  check('timeout: % bằng nhau + lỗi bằng nhau → draw', s2.phase === 'ended' && s2.winner === null && s2.endReason === 'draw');
  /* % bằng nhau nhưng p2 ít lỗi hơn → p2 thắng */
  const s3 = createGame(P(2), { seed: 111, ngMode: 'race', size: 5 });
  const b3 = blackCells(s3), w3 = whiteCells(s3);
  for (let i = 0; i < 4; i++) applyAction(s3, 'p1', { type: 'fill', x: b3[i].x, y: b3[i].y });
  for (let i = 0; i < 4; i++) applyAction(s3, 'p2', { type: 'fill', x: b3[i].x, y: b3[i].y });
  applyAction(s3, 'p1', { type: 'fill', x: w3[0].x, y: w3[0].y }); /* p1 tô sai 1 lần */
  applyAction(s3, 'p1', { type: 'timeout' });
  check('timeout: % bằng nhau, p2 ít lỗi hơn → p2 thắng', s3.winner === 'p2' && s3.endReason === 'percent');
  /* timeout ở chơi đơn → lỗi */
  const s4 = createGame(P(1), { seed: 112, ngMode: 'solo', size: 5 });
  check('timeout ở chơi đơn → lỗi', !applyAction(s4, 'p1', { type: 'timeout' }).ok);
}

// --- đua: 1 người chết, người còn lại chơi tiếp; tất cả xong thì so % ---
{
  const s = createGame(P(2), { seed: 113, ngMode: 'race', size: 5 });
  const ws = whiteCells(s).slice(0, 3);
  const bs = blackCells(s);
  for (const w of ws) applyAction(s, 'p1', { type: 'fill', x: w.x, y: w.y });
  check('đua: p1 hết mạng → ván vẫn tiếp tục cho p2', s.phase === 'playing' && s.prog.p1.status === 'dead');
  check('đua: p1 chết thì actors() chỉ còn p2', JSON.stringify(actors(s)) === '["p2"]');
  applyAction(s, 'p2', { type: 'resign' });
  check('đua: p2 xin thua → tất cả xong, so %: p2 0% vs p1 0% + p1 ít lỗi hơn? p1 3 lỗi, p2 0 lỗi → p2 thắng', s.phase === 'ended' && s.winner === 'p2' && s.endReason === 'percent', `winner=${s.winner} reason=${s.endReason}`);
}

// --- viewFor không lộ đáp án ---
{
  const s = createGame(P(2), { seed: 114, ngMode: 'race', size: 5 });
  applyAction(s, 'p1', { type: 'fill', x: blackCells(s)[0].x, y: blackCells(s)[0].y });
  const v1 = viewFor(s, 'p1');
  check('view không có trường solution', !('solution' in v1) && !JSON.stringify(v1).includes('"solution"'));
  check('view p1 thấy bảng của mình (grid + gợi ý)', !!v1.my && v1.my.grid.length === 5 && v1.my.rowClues.length === 5 && v1.my.colClues.length === 5);
  check('view p1.me = p1', v1.me === 'p1');
  check('view p1 không thấy grid của p2', v1.players.every(p => !('grid' in p)));
  check('view p1 thấy % và lỗi của p2 qua tóm tắt', typeof v1.players.find(p => p.id === 'p2').percent === 'number');
  check('view solo/race đúng', v1.race === true && v1.solo === false);
}

// --- serialize / deserialize ---
{
  const s = createGame(P(1), { seed: 115, ngMode: 'solo', size: 5 });
  applyAction(s, 'p1', { type: 'fill', x: blackCells(s)[0].x, y: blackCells(s)[0].y });
  const s2 = deserialize(serialize(s));
  check('deserialize giữ nguyên đáp án + bảng + filled', JSON.stringify(s2.solution) === JSON.stringify(s.solution) && s2.prog.p1.filled === 1);
  let err = null;
  try { deserialize('{"x":1}'); } catch (e) { err = e; }
  check('deserialize JSON hỏng → ném lỗi', !!err);
}

// --- hằng số ---
check('SIZES = {easy:5, medium:10, hard:15}', SIZES.easy === 5 && SIZES.medium === 10 && SIZES.hard === 15);
check('LIVES=3, HINTS=3, RACE_TIME_MS=180000', LIVES === 3 && HINTS === 3 && RACE_TIME_MS === 180000);

console.log(`\nNonogram rules: ${pass} pass, ${fail} fail.`);
