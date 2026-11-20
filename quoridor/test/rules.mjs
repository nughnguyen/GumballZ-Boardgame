// Luật Quoridor: đi quân 4 hướng, tường chặn, nhảy thẳng/chảy chéo,
// đặt tường hợp lệ/không hợp lệ (chồng tường, chặn kín đường), hết
// tường, thắng tới đích, xin thua, viewFor.
// Chạy: node quoridor/test/rules.mjs
import {
  createGame, applyAction, viewFor, actors, legalMoves, legalWalls,
  legalActions, validateWall, distToGoal, blockedByWall, mulberry32,
  MIN_PLAYERS, MAX_PLAYERS, WALLS_2P, WALLS_MP, SIZE,
} from '../js/engine.js';

/* gieo hạt cho Math.random để mọi assert thống kê ổn định */
const _rng = mulberry32(20261120);
Math.random = () => _rng();

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));
/* ván mới rồi gán vị trí / tường theo ý muốn (state là dữ liệu thuần) */
function rigged(n = 2, pos = null, hWalls = [], vWalls = [], seed = 42) {
  const s = createGame(P(['A', 'B', 'C', 'D'].slice(0, n)), { seed });
  if (pos) pos.forEach((p, i) => { s.players[i].pos = p.slice(); });
  s.hWalls = hWalls.slice();
  s.vWalls = vWalls.slice();
  s.turnIdx = 0;
  return s;
}
const hasMove = (moves, r, c) => moves.some(m => m.type === 'move' && m.to[0] === r && m.to[1] === c);

/* ---------- 0. tạo ván ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 7 });
  t('2 người: p0 ở (8,4), p1 ở (0,4)', s.players[0].pos.join() === '8,4' && s.players[1].pos.join() === '0,4');
  t('2 người: mỗi người 10 tường', s.players.every(p => p.wallsLeft === WALLS_2P) && WALLS_2P === 10);
  t('2 người: đích p0 hàng 0, p1 hàng 8', s.players[0].goal.v === 0 && s.players[1].goal.v === 8);
  const s4 = createGame(P(['A', 'B', 'C', 'D']), { seed: 7 });
  t('4 người: p2 ở (4,0) đích cột 8, p3 ở (4,8) đích cột 0',
    s4.players[2].pos.join() === '4,0' && s4.players[2].goal.v === 8 && s4.players[3].pos.join() === '4,8' && s4.players[3].goal.v === 0);
  t('4 người: mỗi người 5 tường', s4.players.every(p => p.wallsLeft === WALLS_MP) && WALLS_MP === 5);
  const s3 = createGame(P(['A', 'B', 'C']), { seed: 7 });
  t('3 người: p2 ở (4,0) đích cột 8, 5 tường', s3.players[2].pos.join() === '4,0' && s3.players[2].wallsLeft === 5);
  let threw = false;
  try { createGame(P(['A']), { seed: 1 }); } catch (e) { threw = true; }
  t('1 người thì từ chối tạo ván', threw);
  threw = false;
  try { createGame(P(['A', 'B', 'C', 'D', 'E']), { seed: 1 }); } catch (e) { threw = true; }
  t('5 người thì từ chối tạo ván', threw);
  t('MIN/MAX người chơi là 2/4, bàn 9×9', MIN_PLAYERS === 2 && MAX_PLAYERS === 4 && SIZE === 9);
  t('lượt đầu là p1 (turnIdx 0), actors = [p1]', actors(s).join() === 'p1');
}

/* ---------- 1. đi quân 4 hướng ---------- */
{
  const s = rigged(2, [[4, 4], [0, 4]]);
  const m = legalMoves(s, 'p1');
  t('giữa bàn: 4 nước đi kề', m.length === 4 && hasMove(m, 3, 4) && hasMove(m, 5, 4) && hasMove(m, 4, 3) && hasMove(m, 4, 5));
  const s2 = rigged(2, [[0, 0], [8, 8]]);
  const m2 = legalMoves(s2, 'p1');
  t('góc bàn (0,0): chỉ 2 nước đi', m2.length === 2 && hasMove(m2, 1, 0) && hasMove(m2, 0, 1));
  const r = applyAction(s, 'p1', { type: 'move', to: [3, 4] });
  t('đi quân hợp lệ được áp, lượt chuyển sang p2', r.ok && s.players[0].pos.join() === '3,4' && s.turnIdx === 1);
  t('đi quân tăng turns của mình', s.players[0].turns === 1);
  const bad = applyAction(s, 'p1', { type: 'move', to: [3, 4] });
  t('chưa tới lượt thì từ chối đi', !bad.ok);
  const bad2 = applyAction(s, 'p2', { type: 'move', to: [2, 4] });
  t('đi 2 ô thì từ chối (không phải ô kề)', !bad2.ok);
  const bad3 = applyAction(s, 'p2', { type: 'move', to: [8, 8] });
  t('đi tới ô không kề thì từ chối', !bad3.ok);
}

/* ---------- 2. tường chặn đường đi ---------- */
{
  /* tường ngang ở (3,4): chắn giữa hàng 3 và 4, phủ cột 4..5 */
  const s = rigged(2, [[4, 4], [0, 4]], ['3,4']);
  const m = legalMoves(s, 'p1');
  t('tường ngang chắn đi lên', !hasMove(m, 3, 4) && hasMove(m, 5, 4) && hasMove(m, 4, 3) && hasMove(m, 4, 5));
  t('blockedByWall: lên bị chặn, xuống không', blockedByWall(new Set(['3,4']), new Set(), 4, 4, 3, 4) && !blockedByWall(new Set(['3,4']), new Set(), 4, 4, 5, 4));
  /* tường ngang ở (3,3) cũng chắn cột 4 (phủ cột 3..4) */
  const s2 = rigged(2, [[4, 4], [0, 4]], ['3,3']);
  t('tường ngang lệch 1 cột vẫn chắn (phủ 2 cột)', !hasMove(legalMoves(s2, 'p1'), 3, 4));
  /* tường dọc ở (4,4): chắn giữa cột 4 và 5, phủ hàng 4..5 */
  const s3 = rigged(2, [[4, 4], [0, 4]], [], ['4,4']);
  const m3 = legalMoves(s3, 'p1');
  t('tường dọc chắn đi phải', !hasMove(m3, 4, 5) && hasMove(m3, 4, 3));
  t('tường dọc không chắn đi lên/xuống', hasMove(m3, 3, 4) && hasMove(m3, 5, 4));
}

/* ---------- 3. nhảy thẳng qua quân kề ---------- */
{
  const s = rigged(2, [[4, 4], [3, 4]]);
  const m = legalMoves(s, 'p1');
  t('quân kề phía trên: nhảy thẳng tới (2,4)', hasMove(m, 2, 4));
  t('nhảy thẳng thì không cho đi chéo', !hasMove(m, 3, 3) && !hasMove(m, 3, 5));
  t('vẫn đi được 3 hướng còn lại', hasMove(m, 5, 4) && hasMove(m, 4, 3) && hasMove(m, 4, 5));
  /* ô sau bị tường chặn → nhảy chéo */
  const s2 = rigged(2, [[4, 4], [3, 4]], ['2,4']);
  const m2 = legalMoves(s2, 'p1');
  t('ô sau bị tường chặn: nhảy chéo (3,3) và (3,5)', hasMove(m2, 3, 3) && hasMove(m2, 3, 5));
  t('ô sau bị tường chặn: không nhảy thẳng (2,4)', !hasMove(m2, 2, 4));
  /* ô sau ra khỏi bàn → nhảy chéo */
  const s3 = rigged(2, [[1, 4], [0, 4]]);
  const m3 = legalMoves(s3, 'p1');
  t('quân kề ở mép bàn: nhảy chéo (0,3) và (0,5)', hasMove(m3, 0, 3) && hasMove(m3, 0, 5));
  /* ô chéo bị tường chặn → không nhảy được hướng đó */
  const s4 = rigged(2, [[4, 4], [3, 4]], ['2,4'], ['3,3']);
  const m4 = legalMoves(s4, 'p1');
  t('nhảy chéo trái bị tường dọc chặn: chỉ còn (3,5)', !hasMove(m4, 3, 3) && hasMove(m4, 3, 5));
}

/* ---------- 4. đặt tường: hợp lệ / không hợp lệ ---------- */
{
  const s = rigged(2, [[8, 4], [0, 4]]);
  t('đặt tường ngang (0,0) hợp lệ', validateWall(s, 'p1', { orient: 'h', r: 0, c: 0 }).ok);
  t('đặt tường dọc (7,7) hợp lệ', validateWall(s, 'p1', { orient: 'v', r: 7, c: 7 }).ok);
  t('tường ra khỏi bàn (r=8) không hợp lệ', !validateWall(s, 'p1', { orient: 'h', r: 8, c: 0 }).ok);
  t('tường ra khỏi bàn (c=8) không hợp lệ', !validateWall(s, 'p1', { orient: 'v', r: 0, c: 8 }).ok);
  const r = applyAction(s, 'p1', { type: 'wall', orient: 'h', r: 0, c: 0 });
  t('đặt tường được áp, trừ 1 tường, lượt chuyển', r.ok && s.hWalls.includes('0,0') && s.players[0].wallsLeft === 9 && s.turnIdx === 1);
  t('đặt trùng vị trí thì từ chối', !validateWall(s, 'p2', { orient: 'h', r: 0, c: 0 }).ok);
  t('đặt tường dọc cắt ngang tường ngang cùng điểm thì từ chối', !validateWall(s, 'p2', { orient: 'v', r: 0, c: 0 }).ok);
  t('đặt tường ngang kề bên (0,1) vẫn được (nối dài)', validateWall(s, 'p2', { orient: 'h', r: 0, c: 1 }).ok);
  t('đặt tường dọc kề điểm giao (1,0) vẫn được (chạm đầu, không cắt)', validateWall(s, 'p2', { orient: 'v', r: 1, c: 0 }).ok);
  const s2 = rigged(2, [[8, 4], [0, 4]]);
  s2.players[0].wallsLeft = 0;
  t('hết tường thì không đặt được nữa', !validateWall(s2, 'p1', { orient: 'h', r: 4, c: 4 }).ok);
  t('hết tường thì legalWalls rỗng nhưng vẫn còn nước đi', legalWalls(s2, 'p1').length === 0 && legalMoves(s2, 'p1').length > 0);
  const s3 = rigged(2, [[8, 4], [0, 4]]);
  t('đầu ván: 128 vị trí tường đều hợp lệ (8×8×2)', legalWalls(s3, 'p1').length === 128);
  t('legalActions = nước đi + tường', legalActions(s3, 'p1').length === legalMoves(s3, 'p1').length + 128);
}

/* ---------- 5. tường chặn kín đường (BFS bắt được) ---------- */
{
  /* p1 ở (8,4) đích hàng 0; dựng tường ngang gần như kín hàng 4,
     chỉ chừa cột 8: p1 vẫn còn đường qua cột 8 */
  const s = rigged(2, [[8, 4], [0, 4]], ['4,0', '4,2', '4,4', '4,6']);
  t('chưa chặn kín: p1 còn đường (dist hữu hạn)', Number.isFinite(distToGoal(new Set(s.hWalls), new Set(), [8, 4], { type: 'row', v: 0 })));
  t('đặt tường bịt nốt cột 8 thì bị từ chối (chặn kín p1)', !validateWall(s, 'p2', { orient: 'h', r: 4, c: 7 }).ok);
  t('nhưng đặt tường dọc ở đó vẫn được', validateWall(s, 'p2', { orient: 'v', r: 4, c: 7 }).ok);
  /* chặn kín thật: p1 ở góc (8,0), tường bao 2 phía thoát duy nhất */
  const s2 = rigged(2, [[8, 0], [0, 4]], ['7,0'], ['7,0']);
  t('p1 ở góc bị bao 2 mặt: dist = Infinity', distToGoal(new Set(s2.hWalls), new Set(s2.vWalls), [8, 0], { type: 'row', v: 0 }) === Infinity);
  const s3 = rigged(2, [[8, 0], [0, 4]], ['7,0']);
  t('chỉ 1 tường dọc (7,0) thì từ chối vì chặn kín p1', !validateWall(s3, 'p2', { orient: 'v', r: 7, c: 0 }).ok);
}

/* ---------- 6. khoảng cách BFS ---------- */
{
  const s = rigged(2, [[8, 4], [0, 4]]);
  t('đầu ván: p1 cách đích 8 bước', distToGoal(new Set(), new Set(), [8, 4], { type: 'row', v: 0 }) === 8);
  t('p1 ở giữa (4,4) cách đích hàng 0 đúng 4 bước', distToGoal(new Set(), new Set(), [4, 4], { type: 'row', v: 0 }) === 4);
  t('p2 (4,0) cách đích cột 8 đúng 8 bước', distToGoal(new Set(), new Set(), [4, 0], { type: 'col', v: 8 }) === 8);
  const s2 = rigged(2, [[4, 4], [0, 4]], ['3,4']);
  t('tường chắn trước mặt: phải đi vòng, dist = 5', distToGoal(new Set(s2.hWalls), new Set(), [4, 4], { type: 'row', v: 0 }) === 5);
}

/* ---------- 7. thắng khi tới đích ---------- */
{
  const s = rigged(2, [[1, 4], [0, 0]]);
  const r = applyAction(s, 'p1', { type: 'move', to: [0, 4] });
  t('đi tới hàng đích thì thắng ngay', r.ok && s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'match' && s.endCause === 'match');
  t('summary người thắng: dist 0', s.final.summary.p1.dist === 0);
  t('điểm cuối trận: người thắng +10, người thua −dist', s.final.scores.find(x => x.id === 'p1').score === 10 && s.final.scores.find(x => x.id === 'p2').score === -8);
  t('summary người thua: dist 8', s.final.summary.p2.dist === 8);
  t('final.scores xếp người thắng trước', s.final.scores[0].id === 'p1');
  const r2 = applyAction(s, 'p2', { type: 'move', to: [7, 4] });
  t('trận đã xong thì từ chối mọi nước đi', !r2.ok);
  const v = viewFor(s, 'p1');
  t('viewFor cuối trận có winner + final', v.winner === 'p1' && !!v.final && v.phase === 'ended');
  /* thắng ở cột đích (4 người) */
  const s4 = rigged(4, [[8, 4], [0, 4], [4, 7], [0, 0]]);
  s4.turnIdx = 2;
  const r4 = applyAction(s4, 'p3', { type: 'move', to: [4, 8] });
  t('p3 tới cột 8 thì thắng', r4.ok && s4.winner === 'p3');
}

/* ---------- 8. xin thua ---------- */
{
  const s = rigged(2, [[5, 4], [2, 4]]);
  const r = applyAction(s, 'p1', { type: 'resign' });
  t('xin thua kết thúc trận, lý do resign', r.ok && s.phase === 'ended' && s.endReason === 'resign' && s.endCause === 'resign');
  t('xin thua: người còn lại (p2) thắng', s.winner === 'p2');
  /* hòa dist: người ít lượt hơn thắng */
  const s2 = rigged(3, [[8, 4], [4, 0], [4, 4]]);
  s2.players[1].turns = 5; s2.players[2].turns = 3;
  const r2 = applyAction(s2, 'p1', { type: 'resign' });
  t('xin thua: p2 và p3 cùng dist 4, p3 ít lượt hơn nên thắng', r2.ok && s2.winner === 'p3');
  /* 4 người: p2 và p4 cùng dist 1, hòa thì theo thứ tự ghế → p2 thắng */
  const s4 = rigged(4, [[0, 0], [7, 4], [4, 6], [4, 1]]);
  const r4 = applyAction(s4, 'p1', { type: 'resign' });
  t('xin thua 4 người: p2 thắng (dist 1, hòa p4 thì theo thứ tự ghế)', r4.ok && s4.winner === 'p2');
}

/* ---------- 9. viewFor giấu seed, không có trường you ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 99 });
  const v = viewFor(s, 'p1');
  t('viewFor có me = p1', v.me === 'p1');
  t('viewFor không lộ seed/_seed/_rng', !('seed' in v) && !('_seed' in v) && !('_rng' in v) && !JSON.stringify(v).includes('"seed"'));
  t('viewFor không có trường you', !('you' in v));
  t('viewFor có vị trí + tường + wallsLeft của mọi người', v.players.length === 2 && v.players[0].pos.join() === '8,4' && v.players[0].wallsLeft === 10 && Array.isArray(v.hWalls));
  t('viewFor của p1 thấy lượt là p1', v.turn === 'p1' && v.turnIdx === 0);
  const v2 = viewFor(s, 'p2');
  t('viewFor của p2 cũng thấy cùng bàn', v2.hWalls.length === 0 && v2.players[1].pos.join() === '0,4');
}

console.log(`\nLuật Quoridor: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
