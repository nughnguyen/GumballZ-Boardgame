/* Ghép Hình rules tests — luật thuần qua engine trực tiếp.
   Math.random được seed lại trước mỗi ván để kết quả ổn định. */
import { createGame, applyAction, actors, viewFor, serialize, deserialize, cloneState, correctOf, mulberry32, SIZES, RACE_TIME_MS, PEEKS, PIC_COUNT } from '../js/engine.js';
import { botAction } from '../js/bot.js';

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }

function soloGame(seed, size = 4) {
  Math.random = mulberry32(seed);
  return createGame([{ id: 'p1', name: 'P1' }], { seed, ghMode: 'solo', size });
}
function raceGame(levels, seed, size = 4) {
  Math.random = mulberry32(seed);
  return createGame(levels.map((l, i) => ({ id: 'p' + (i + 1), name: 'P' + (i + 1), isBot: true, level: l })), { seed, ghMode: 'race', size });
}
/* Đặt bảng theo ý muốn để kiểm tra luật đổi chỗ (test trực tiếp state). */
function setTiles(s, pid, tiles) {
  s.prog[pid].tiles = tiles.slice();
  s.prog[pid].correct = correctOf(tiles);
}

/* --- tạo ván: kiểm tra tham số --- */
{
  let threw = false;
  try { createGame([], { seed: 1 }); } catch (e) { threw = true; }
  check('0 người chơi thì lỗi', threw);
  threw = false;
  try { createGame([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }], { seed: 1 }); } catch (e) { threw = true; }
  check('5 người chơi thì lỗi', threw);
  threw = false;
  try { createGame([{ id: 'a' }, { id: 'b' }], { seed: 1, ghMode: 'solo' }); } catch (e) { threw = true; }
  check('chơi đơn 2 người thì lỗi', threw);
  threw = false;
  try { createGame([{ id: 'a' }], { seed: 1, ghMode: 'race' }); } catch (e) { threw = true; }
  check('đua 1 người thì lỗi', threw);
  check('SIZES = {easy:3, medium:4, hard:5}', SIZES.easy === 3 && SIZES.medium === 4 && SIZES.hard === 5);
  check('RACE_TIME_MS = 180000', RACE_TIME_MS === 180000);
  check('PEEKS = 3', PEEKS === 3);
  const s3 = soloGame(7, 3), s4 = soloGame(7, 4), s5 = soloGame(7, 5), sBad = soloGame(7, 9);
  check('kích thước 3/4/5 được giữ', s3.size === 3 && s4.size === 4 && s5.size === 5);
  check('kích thước sai thì về mặc định 4', sBad.size === 4);
  check('picId trong 0..5', s4.picId >= 0 && s4.picId < PIC_COUNT);
}

/* --- xáo trộn có seed --- */
{
  const a = soloGame(42, 4), b = soloGame(42, 4), c = soloGame(43, 4);
  check('cùng seed → cùng hình + cùng xáo trộn', a.picId === b.picId && JSON.stringify(a.prog.p1.tiles) === JSON.stringify(b.prog.p1.tiles));
  check('khác seed → xáo trộn khác', JSON.stringify(a.prog.p1.tiles) !== JSON.stringify(c.prog.p1.tiles));
  const sorted = a.prog.p1.tiles.slice().sort((x, y) => x - y);
  check('xáo trộn là hoán vị đủ 0..15', sorted.every((v, i) => v === i));
  check('ván mới chưa ghép xong', a.prog.p1.correct < a.total && a.prog.p1.correct >= 0);
  check('các người chơi đua bắt đầu cùng 1 xáo trộn', (() => {
    const r = raceGame(['hard', 'easy'], 99, 4);
    return JSON.stringify(r.prog.p1.tiles) === JSON.stringify(r.prog.p2.tiles);
  })());
}

/* --- đổi chỗ: tính điểm --- */
{
  /* chu trình 2: mảnh 0,1 đổi chỗ cho nhau → đổi 1 nước đúng cả 2 (+20) */
  const s = soloGame(11, 4);
  setTiles(s, 'p1', [1, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  const r = applyAction(s, 'p1', { type: 'swap', a: 0, b: 1 });
  check('đổi đúng cả 2 mảnh được +20', r.ok && s.prog.p1.score === 20 && s.prog.p1.correct === 16, `score=${s.prog.p1.score} correct=${s.prog.p1.correct}`);
  check('đổi đúng cả 2 mảnh thì thắng luôn (đủ 16)', s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'complete');
}
{
  /* đổi 1 mảnh về đúng, mảnh kia vẫn sai → +10 */
  const s = soloGame(12, 4);
  setTiles(s, 'p1', [1, 2, 0, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  const r = applyAction(s, 'p1', { type: 'swap', a: 0, b: 2 });
  check('đổi đúng 1 mảnh được +10', r.ok && s.prog.p1.score === 10 && s.prog.p1.correct === 14, `score=${s.prog.p1.score} correct=${s.prog.p1.correct}`);
  check('chưa đủ mảnh thì ván vẫn đang chơi', s.phase === 'playing');
}
{
  /* đổi 2 mảnh ở 2 chu trình khác nhau thì không mảnh nào đúng → 0 điểm */
  const s = soloGame(13, 4);
  setTiles(s, 'p1', [1, 0, 3, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  const r = applyAction(s, 'p1', { type: 'swap', a: 0, b: 2 });
  check('đổi không mảnh nào đúng thì 0 điểm', r.ok && s.prog.p1.score === 0 && s.prog.p1.correct === 12, `score=${s.prog.p1.score} correct=${s.prog.p1.correct}`);
  check('số lượt đổi vẫn tăng', s.prog.p1.swaps === 1);
}
{
  /* đổi sai luật */
  const s = soloGame(14, 4);
  check('đổi 2 vị trí giống nhau thì lỗi', !applyAction(s, 'p1', { type: 'swap', a: 3, b: 3 }).ok);
  check('đổi vị trí âm thì lỗi', !applyAction(s, 'p1', { type: 'swap', a: -1, b: 2 }).ok);
  check('đổi vị trí vượt bảng thì lỗi', !applyAction(s, 'p1', { type: 'swap', a: 0, b: 16 }).ok);
  check('hành động lạ thì lỗi', !applyAction(s, 'p1', { type: 'xoay', a: 0, b: 1 }).ok);
  check('người không có trong ván thì lỗi', !applyAction(s, 'p9', { type: 'swap', a: 0, b: 1 }).ok);
}

/* --- thắng chơi đơn: ghép đủ bằng đổi chỗ --- */
{
  const s = soloGame(15, 3);
  setTiles(s, 'p1', [1, 0, 2, 3, 4, 5, 6, 7, 8]);
  const r = applyAction(s, 'p1', { type: 'swap', a: 0, b: 1 });
  check('ghép đủ thì thắng', r.ok && s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'complete');
  check('thắng thì winnerIds có mình', s.winnerIds.includes('p1') && s.losers.length === 0);
  check('hết ván thì không đổi được nữa', !applyAction(s, 'p1', { type: 'swap', a: 0, b: 1 }).ok);
  check('summary có đủ trường', (() => {
    const q = s.final.summary.p1;
    return q.correct === 9 && q.swaps === 1 && q.peeks === 0 && q.score === 20 && typeof q.timeMs === 'number';
  })());
}

/* --- xem mẫu: tối đa 3 lần --- */
{
  const s = soloGame(16, 4);
  check('xem mẫu lần 1 ok', applyAction(s, 'p1', { type: 'peek' }).ok && s.prog.p1.peeksUsed === 1);
  applyAction(s, 'p1', { type: 'peek' });
  applyAction(s, 'p1', { type: 'peek' });
  check('xem mẫu đủ 3 lần', s.prog.p1.peeksUsed === 3);
  check('xem mẫu lần 4 thì lỗi', !applyAction(s, 'p1', { type: 'peek' }).ok && s.prog.p1.peeksUsed === 3);
}

/* --- xin thua --- */
{
  const s = soloGame(17, 4);
  const r = applyAction(s, 'p1', { type: 'resign' });
  check('chơi đơn xin thua thì thua ngay', r.ok && s.phase === 'ended' && s.winner === null && s.endReason === 'resign' && s.losers.includes('p1'));
}
{
  const s = raceGame(['hard', 'easy'], 18, 4);
  applyAction(s, 'p2', { type: 'resign' });
  check('đua: người xin thua bị loại, ván vẫn chơi', s.phase === 'playing' && s.prog.p2.status === 'resigned');
  check('actors chỉ còn người đang chơi', JSON.stringify(actors(s)) === JSON.stringify(['p1']));
  /* người còn lại ghép đủ thì thắng */
  const tiles = Array.from({ length: 16 }, (_, i) => i);
  tiles[0] = 1; tiles[1] = 0;
  setTiles(s, 'p1', tiles);
  applyAction(s, 'p1', { type: 'swap', a: 0, b: 1 });
  check('đua: người còn lại ghép đủ thì thắng', s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'complete');
}

/* --- đua hết 180s: so số mảnh đúng --- */
{
  const s = raceGame(['hard', 'easy'], 19, 4);
  setTiles(s, 'p1', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 14]); /* đúng 14 */
  setTiles(s, 'p2', [1, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]); /* đúng 14 */
  const r = applyAction(s, 'p1', { type: 'timeout' });
  check('hết giờ: bằng mảnh đúng thì hoà', r.ok && s.phase === 'ended' && s.winner === null && s.endReason === 'draw');
}
{
  const s = raceGame(['hard', 'easy'], 20, 4);
  setTiles(s, 'p1', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]); /* đúng 16 — đã xong */
  setTiles(s, 'p2', [1, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]); /* đúng 14 */
  const r = applyAction(s, 'p1', { type: 'timeout' });
  check('hết giờ: ai đúng nhiều mảnh hơn thì thắng', r.ok && s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'percent');
  check('timeout ở chơi đơn thì lỗi', (() => {
    const solo = soloGame(21, 4);
    return !applyAction(solo, 'p1', { type: 'timeout' }).ok;
  })());
  check('timeout khi ván đã hết thì lỗi', !applyAction(s, 'p1', { type: 'timeout' }).ok);
}

/* --- serialize / viewFor --- */
{
  const s = raceGame(['hard', 'easy'], 22, 4);
  applyAction(s, 'p1', { type: 'swap', a: 0, b: 1 });
  const back = deserialize(serialize(s));
  check('serialize/deserialize giữ nguyên state', JSON.stringify(back) === JSON.stringify(s));
  check('cloneState là bản sao độc lập', (() => {
    const c = cloneState(s);
    c.prog.p1.tiles[0] = 99;
    return s.prog.p1.tiles[0] !== 99;
  })());
  const v = viewFor(s, 'p1');
  check('viewFor: mình thấy bảng của mình', Array.isArray(v.my.tiles) && v.my.tiles.length === 16);
  check('viewFor: mình thấy picId + size', v.my.picId === s.picId && v.my.size === 4 && v.size === 4);
  check('viewFor: đối thủ chỉ có số mảnh đúng + điểm, không có tiles', (() => {
    const opp = v.players.find(p => p.id === 'p2');
    return opp && !('tiles' in opp) && typeof opp.correct === 'number' && typeof opp.score === 'number';
  })());
  check('viewFor: end view có mode/solo/race', v.mode === 'race' && v.solo === false && v.race === true);
  check('actors lúc đầu có đủ 2 người', JSON.stringify(actors(s)) === JSON.stringify(['p1', 'p2']));
}

console.log(`\nGhép Hình rules: ${pass} pass, ${fail} fail.`);
