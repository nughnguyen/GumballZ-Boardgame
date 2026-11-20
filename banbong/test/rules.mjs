/* Bắn Bóng rules tests — luật: nảy tường/vợt/gạch, góc nảy theo vị trí
   chạm vợt, gạch 1 máu/2 máu, mất mạng, thắng/thua/hòa, hết 180s,
   xin thua, serialize, viewFor. */
import {
  createGame, applyAction, actors, viewFor, serialize, deserialize,
  mulberry32, speedFor, W, H, PADDLE_W, PADDLE_Y, BALL_R, BRICK_COLS,
  BRICK_ROWS, BRICK_W, BRICK_H, BRICK_X0, BRICK_Y0, LIVES, RACE_TICKS,
  TOTAL_BRICKS, brickRect,
} from '../js/engine.js';

Math.random = mulberry32(12345);

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }
const P = n => Array.from({ length: n }, (_, i) => ({ id: 'p' + (i + 1), name: 'P' + (i + 1) }));
const solo = seed => createGame(P(1), { seed, bbMode: 'solo' });
const race = seed => createGame(P(2), { seed, bbMode: 'race' });
function setBall(s, pid, x, y, vx, vy) { s.prog[pid].ball = { x, y, vx, vy }; }

// --- tạo ván: kiểm tra đầu vào ---
{
  let threw = 0;
  try { createGame([], { seed: 1 }); } catch (e) { threw++; }
  try { createGame(P(5), { seed: 1 }); } catch (e) { threw++; }
  try { createGame(P(2), { seed: 1, bbMode: 'solo' }); } catch (e) { threw++; }
  try { createGame(P(1), { seed: 1, bbMode: 'race' }); } catch (e) { threw++; }
  check('createGame kiểm tra số người (0 / 5 / solo 2 người / đua 1 người)', threw === 4, `threw=${threw}`);
}

// --- trạng thái ban đầu ---
{
  const s = solo(7);
  const pr = s.prog.p1;
  check('ban đầu có 60 gạch (10×6)', pr.bricks.flat().filter(h => h > 0).length === TOTAL_BRICKS);
  check('hàng 0 là gạch cứng (2 máu)', pr.bricks[0].every(h => h === 2));
  check('các hàng còn lại 1 máu', pr.bricks.slice(1).every(row => row.every(h => h === 1)));
  check('ban đầu 3 mạng, 0 điểm', pr.lives === LIVES && pr.score === 0);
  check('vợt ở giữa sân', pr.paddleX === (W - PADDLE_W) / 2);
  check('bóng đặt trên vợt, bay lên', pr.ball && pr.ball.y < PADDLE_Y && pr.ball.vy < 0);
  check('phase playing, mode solo', s.phase === 'playing' && s.mode === 'solo' && s.solo);
  check('actors = [p1]', JSON.stringify(actors(s)) === '["p1"]');
}

// --- tốc độ tăng theo gạch đã phá ---
{
  check('speedFor(0) = 6.0', speedFor(0) === 6.0);
  check('speedFor(20) = 7.2', speedFor(20) === 7.2);
  check('speedFor(60) bị chặn ở 9', speedFor(60) === 9);
  check('speedFor(100) vẫn 9', speedFor(100) === 9);
}

// --- bóng di chuyển + nảy tường ---
{
  const s = solo(8);
  const b0 = { ...s.prog.p1.ball };
  applyAction(s, 'p1', { type: 'tick' });
  const b1 = s.prog.p1.ball;
  check('tick làm bóng bay lên (y giảm)', b1.y < b0.y && b1.x !== b0.x);
  check('tick không đổi điểm/mạng', s.prog.p1.score === 0 && s.prog.p1.lives === 3);
}
{
  const s = solo(9);
  setBall(s, 'p1', BALL_R + 1, 300, -4, 0);
  applyAction(s, 'p1', { type: 'tick' });
  check('chạm tường trái: vx đổi chiều', s.prog.p1.ball.vx === 4 && s.prog.p1.ball.x === BALL_R);
  setBall(s, 'p1', W - BALL_R - 1, 300, 4, 0);
  applyAction(s, 'p1', { type: 'tick' });
  check('chạm tường phải: vx đổi chiều', s.prog.p1.ball.vx === -4 && s.prog.p1.ball.x === W - BALL_R);
  setBall(s, 'p1', 240, BALL_R + 1, 0, -4);
  applyAction(s, 'p1', { type: 'tick' });
  check('chạm tường trên: vy đổi chiều', s.prog.p1.ball.vy === 4 && s.prog.p1.ball.y === BALL_R);
}

// --- nảy vợt: góc theo vị trí chạm ---
{
  const s = solo(10);
  const px = s.prog.p1.paddleX, cx = px + PADDLE_W / 2;
  setBall(s, 'p1', cx, PADDLE_Y - BALL_R - 1, 0, 4.5);
  applyAction(s, 'p1', { type: 'tick' });
  const b = s.prog.p1.ball;
  check('chạm giữa vợt: nảy thẳng lên (vx ≈ 0, vy < 0)', Math.abs(b.vx) < 0.01 && b.vy < 0, `vx=${b.vx} vy=${b.vy}`);
  setBall(s, 'p1', px + 2, PADDLE_Y - BALL_R - 1, 0, 4.5);
  applyAction(s, 'p1', { type: 'tick' });
  check('chạm mép trái vợt: bay sang trái', s.prog.p1.ball.vx < -2 && s.prog.p1.ball.vy < 0, `vx=${s.prog.p1.ball.vx}`);
  setBall(s, 'p1', px + PADDLE_W - 2, PADDLE_Y - BALL_R - 1, 0, 4.5);
  applyAction(s, 'p1', { type: 'tick' });
  check('chạm mép phải vợt: bay sang phải', s.prog.p1.ball.vx > 2 && s.prog.p1.ball.vy < 0, `vx=${s.prog.p1.ball.vx}`);
  /* bóng đã rơi qua vợt thì không nảy nữa */
  setBall(s, 'p1', cx, PADDLE_Y + 20, 0, 4.5);
  applyAction(s, 'p1', { type: 'tick' });
  check('bóng dưới mép vợt thì không nảy (vẫn rơi)', s.prog.p1.ball.vy > 0);
}

// --- phá gạch thường (+10) và gạch cứng (2 máu, +20) ---
{
  const s = solo(11);
  const rc = brickRect(0, 5);
  setBall(s, 'p1', rc.x + BRICK_W / 2, rc.y + BRICK_H + BALL_R + 2, 0, -4.5);
  const r = applyAction(s, 'p1', { type: 'tick' });
  check('đánh gạch thường: gạch nổ', s.prog.p1.bricks[5][0] === 0);
  check('đánh gạch thường: +10 điểm', s.prog.p1.score === 10, `score=${s.prog.p1.score}`);
  check('đánh gạch thường: bóng nảy lại (vy đổi chiều)', s.prog.p1.ball.vy > 0);
  check('đánh gạch thường: đếm gạch đã phá', s.prog.p1.bricksCleared === 1);
  check('tick đánh gạch trả ok', r.ok === true);
}
{
  const s = solo(12);
  const rc = brickRect(0, 0);
  setBall(s, 'p1', rc.x + BRICK_W / 2, rc.y + BRICK_H + BALL_R + 2, 0, -4.5);
  applyAction(s, 'p1', { type: 'tick' });
  check('gạch cứng: đánh 1 lần còn 1 máu, chưa có điểm', s.prog.p1.bricks[0][0] === 1 && s.prog.p1.score === 0);
  setBall(s, 'p1', rc.x + BRICK_W / 2, rc.y + BRICK_H + BALL_R + 2, 0, -4.5);
  applyAction(s, 'p1', { type: 'tick' });
  check('gạch cứng: đánh lần 2 nổ, +20 điểm', s.prog.p1.bricks[0][0] === 0 && s.prog.p1.score === 20, `score=${s.prog.p1.score}`);
}

// --- mất bóng / hết mạng ---
{
  const s = solo(13);
  setBall(s, 'p1', 240, H + 5, 0, 4.5);
  applyAction(s, 'p1', { type: 'tick' });
  check('bóng rơi qua đáy: mất 1 mạng', s.prog.p1.lives === 2 && s.prog.p1.ballsLost === 1);
  check('bóng rơi: bóng mới đặt lại trên vợt', s.prog.p1.ball.y < PADDLE_Y && s.prog.p1.ball.vy < 0);
  check('bóng rơi: ván vẫn chơi tiếp', s.phase === 'playing');
  s.prog.p1.lives = 1;
  setBall(s, 'p1', 240, H + 5, 0, 4.5);
  applyAction(s, 'p1', { type: 'tick' });
  check('hết 3 mạng: thua, winner null', s.phase === 'ended' && s.winner === null && s.endReason === 'dead');
  check('hết 3 mạng: losers có p1', JSON.stringify(s.losers) === '["p1"]');
  check('sau khi kết thúc: actors rỗng', actors(s).length === 0);
  check('sau khi kết thúc: hành động bị từ chối', applyAction(s, 'p1', { type: 'tick' }).ok === false);
}

// --- thắng chơi đơn: phá hết gạch ---
{
  const s = solo(14);
  for (let r = 0; r < BRICK_ROWS; r++) for (let c = 0; c < BRICK_COLS; c++) s.prog.p1.bricks[r][c] = 0;
  s.prog.p1.bricks[5][0] = 1;
  const rc = brickRect(0, 5);
  setBall(s, 'p1', rc.x + BRICK_W / 2, rc.y + BRICK_H + BALL_R + 2, 0, -4.5);
  applyAction(s, 'p1', { type: 'tick' });
  check('phá hết gạch: thắng chơi đơn', s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'clear');
  check('phá hết gạch: winnerIds = [p1]', JSON.stringify(s.winnerIds) === '["p1"]');
}

// --- di chuyển vợt: move / setX + chặn biên ---
{
  const s = solo(15);
  applyAction(s, 'p1', { type: 'move', dx: 100 });
  check('move dx lớn bị chặn ở +24', s.prog.p1.paddleX === (W - PADDLE_W) / 2 + 24);
  applyAction(s, 'p1', { type: 'move', dx: -1000 });
  check('move dx âm lớn bị chặn ở -24', s.prog.p1.paddleX === (W - PADDLE_W) / 2);
  applyAction(s, 'p1', { type: 'setX', x: 1000 });
  check('setX quá phải bị chặn ở biên phải', s.prog.p1.paddleX === W - PADDLE_W);
  applyAction(s, 'p1', { type: 'setX', x: -50 });
  check('setX quá trái bị chặn ở biên trái', s.prog.p1.paddleX === 0);
  applyAction(s, 'p1', { type: 'setX', x: 240 });
  check('setX đặt vợt theo tâm x', s.prog.p1.paddleX === 240 - PADDLE_W / 2);
  check('move dx NaN bị từ chối', applyAction(s, 'p1', { type: 'move', dx: NaN }).ok === false);
  check('hành động lạ bị từ chối', applyAction(s, 'p1', { type: 'bogus' }).ok === false);
  check('hành động rỗng bị từ chối', applyAction(s, 'p1', null).ok === false);
}

// --- xin thua ---
{
  const s = solo(16);
  const r = applyAction(s, 'p1', { type: 'resign' });
  check('xin thua chơi đơn: kết thúc, endReason resign', r.ok === true && s.phase === 'ended' && s.endReason === 'resign' && s.winner === null);
}
{
  const s = race(17);
  applyAction(s, 'p1', { type: 'resign' });
  check('xin thua đua: người đó bị loại, ván vẫn chơi', s.phase === 'playing' && s.prog.p1.status === 'resigned');
  check('xin thua đua: người còn lại vẫn trong actors', JSON.stringify(actors(s)) === '["p2"]');
  applyAction(s, 'p2', { type: 'resign' });
  check('cả 2 xin thua: hoà (0-0)', s.phase === 'ended' && s.endReason === 'draw' && s.winner === null);
}

// --- đua: phá hết gạch thắng ngay ---
{
  const s = race(18);
  for (let r = 0; r < BRICK_ROWS; r++) for (let c = 0; c < BRICK_COLS; c++) s.prog.p1.bricks[r][c] = 0;
  s.prog.p1.bricks[5][0] = 1;
  const rc = brickRect(0, 5);
  setBall(s, 'p1', rc.x + BRICK_W / 2, rc.y + BRICK_H + BALL_R + 2, 0, -4.5);
  applyAction(s, 'p1', { type: 'tick' });
  check('đua: phá hết gạch thắng ngay', s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'clear');
}

// --- đua: hết 180 giây so điểm ---
{
  const s = race(19);
  s.prog.p1.tickCount = RACE_TICKS - 1;
  s.prog.p2.tickCount = RACE_TICKS - 1;
  s.prog.p1.score = 100; s.prog.p2.score = 50;
  setBall(s, 'p1', 240, 300, 0, -4);
  applyAction(s, 'p1', { type: 'tick' });
  check('hết 180s: nhiều điểm thắng, endReason timeout', s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'timeout', `winner=${s.winner} reason=${s.endReason}`);
}
{
  const s = race(20);
  s.prog.p1.tickCount = RACE_TICKS - 1;
  s.prog.p2.tickCount = RACE_TICKS - 1;
  s.prog.p1.score = 80; s.prog.p2.score = 80;
  setBall(s, 'p1', 240, 300, 0, -4);
  applyAction(s, 'p1', { type: 'tick' });
  check('hết 180s bằng điểm: hoà', s.phase === 'ended' && s.winner === null && s.endReason === 'draw');
}

// --- đua: tất cả chết thì so điểm ---
{
  const s = race(21);
  s.prog.p1.score = 120; s.prog.p2.score = 40;
  s.prog.p1.lives = 1; s.prog.p2.lives = 1;
  setBall(s, 'p1', 240, H + 5, 0, 4.5);
  applyAction(s, 'p1', { type: 'tick' });
  check('p1 chết trước: ván vẫn chơi (p2 còn)', s.phase === 'playing');
  setBall(s, 'p2', 240, H + 5, 0, 4.5);
  applyAction(s, 'p2', { type: 'tick' });
  check('cả 2 chết: nhiều điểm thắng', s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'score');
}

// --- serialize / deserialize ---
{
  const s = solo(22);
  applyAction(s, 'p1', { type: 'move', dx: 10 });
  applyAction(s, 'p1', { type: 'tick' });
  const json = serialize(s);
  const s2 = deserialize(json);
  check('serialize → deserialize giữ nguyên state', JSON.stringify(s2) === JSON.stringify(s));
  check('deserialize chuỗi sai thì ném lỗi', (() => { try { deserialize('{bad'); return false; } catch (e) { return true; } })());
}

// --- viewFor: chỉ thấy sân của mình ---
{
  const s = race(23);
  const v1 = viewFor(s, 'p1');
  const v2 = viewFor(s, 'p2');
  check('view p1 có bóng + gạch của mình', !!v1.my && !!v1.my.ball && Array.isArray(v1.my.bricks) && v1.my.bricks.length === BRICK_ROWS);
  check('view p1.me = p1, view p2.me = p2', v1.me === 'p1' && v2.me === 'p2');
  check('view không lộ sân đối thủ (players chỉ có tóm tắt)', v1.players.every(p => !('ball' in p) && !('bricks' in p) && !('paddleX' in p)));
  check('view p1 thấy điểm/gạch/mạng p2 qua tóm tắt', v1.players.find(p => p.id === 'p2').bricksLeft === TOTAL_BRICKS && v1.players.find(p => p.id === 'p2').lives === 3);
  check('viewFor khi kết thúc có final.summary', (() => {
    const g = solo(24);
    applyAction(g, 'p1', { type: 'resign' });
    const v = viewFor(g, 'p1');
    return !!v.final && v.final.summary.p1 && typeof v.final.summary.p1.score === 'number' && typeof v.final.summary.p1.timeMs === 'number';
  })());
}

// --- mulberry32 ổn định ---
{
  const a = mulberry32(99), b = mulberry32(99);
  let same = true;
  for (let i = 0; i < 20; i++) if (a() !== b()) same = false;
  check('mulberry32 cùng seed cho cùng dãy số', same);
}

console.log(`\nBắn Bóng rules: ${pass} pass, ${fail} fail.`);
