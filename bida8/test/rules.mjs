/* Bida 8-ball rules tests — luật: xếp bi, vật lý, phá bi, chia nhóm,
   đổi lượt, phạm lỗi, bi 8 thắng/thua, đặt bi, xin thua, hết giờ, hoà
   vì quá số cú, viewFor, serialize, actors, aimFor, guideInfo.
   Math.random được seed lại trước mỗi ván để kết quả ổn định. */
import { createGame, applyAction, actors, viewFor, serialize, deserialize, simulateShot, aimFor, guideInfo, placeError, mulberry32, BALL_R, POCKETS, RACE_TIME_MS } from '../js/engine.js';

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }

function matchGame(seed = 1) {
  Math.random = mulberry32(seed);
  return createGame([
    { id: 'p1', name: 'P1', isBot: false },
    { id: 'p2', name: 'P2', isBot: true, level: 'hard' },
  ], { seed, bdMode: 'match' });
}
function soloGame(seed = 1) {
  Math.random = mulberry32(seed);
  return createGame([{ id: 'p1', name: 'P1', isBot: false }], { seed, bdMode: 'solo' });
}
/* đặt lại bàn theo ý muốn: balls = [{id, x, y, potted}] */
function setTable(s, balls, opts = {}) {
  const p = s.prog;
  p.balls = balls.map(b => ({ id: b.id, x: b.x, y: b.y, vx: 0, vy: 0, potted: !!b.potted }));
  p.balls.sort((a, b) => a.id - b.id);
  if (opts.turn) p.turn = opts.turn;
  if (opts.groups) p.groups = { ...opts.groups };
  if (opts.openTable !== undefined) p.openTable = opts.openTable;
  if (opts.breakDone !== undefined) p.breakDone = opts.breakDone;
  if (opts.ballInHand !== undefined) p.ballInHand = opts.ballInHand;
  p.lastShot = null;
}
const B = (id, x, y, potted = false) => ({ id, x, y, potted });
const ballById = (s, id) => s.prog.balls.find(b => b.id === id);
function fullBalls(pottedIds = []) {
  /* đủ 16 bi: bi chưa liệt kê thì đặt ở vị trí xếp bi chuẩn */
  const s = matchGame(99);
  return s.prog.balls.map(b => ({ ...b, potted: pottedIds.includes(b.id) }));
}

// --- 1. xếp bi ban đầu ---
{
  const s = matchGame(11);
  const balls = s.prog.balls;
  check('xếp bi: 16 bi (bi cái + 15)', balls.length === 16 && balls[0].id === 0);
  check('xếp bi: bi cái ở điểm đầu (240,255)', balls[0].x === 240 && balls[0].y === 255);
  check('xếp bi: bi 1 ở đỉnh tam giác (660,255)', balls[1].x === 660 && balls[1].y === 255);
  check('xếp bi: bi 8 ở giữa tam giác', (() => {
    const eight = balls[8];
    return Math.abs(eight.x - (660 + 2 * 19.2)) < 1 && Math.abs(eight.y - 255) < 1;
  })());
  check('xếp bi: không bi nào chồng nhau', (() => {
    for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
      if (Math.hypot(balls[i].x - balls[j].x, balls[i].y - balls[j].y) < 2 * BALL_R - 0.01) return false;
    }
    return true;
  })());
  check('xếp bi: 7 trơn + 7 sọc + bi 8', balls.filter(b => b.id >= 1 && b.id <= 7).length === 7 && balls.filter(b => b.id >= 9).length === 7);
  check('xếp bi: lượt đầu là p1, bàn mở, chưa phá', s.prog.turn === 'p1' && s.prog.openTable && !s.prog.breakDone);
  check('xếp bi: 2 góc cuối tam giác 1 trơn 1 sọc', (() => {
    const last = balls.filter(b => Math.abs(b.x - (660 + 4 * 19.2)) < 1).map(b => b.id).sort((a, b) => a - b);
    return last.length === 5 && ((last[0] < 8 && last[4] >= 9) || (last[0] >= 9 && last[4] < 8));
  })());
}

// --- 2. vật lý: xác định + dừng hẳn ---
{
  const s = matchGame(21);
  const r1 = simulateShot(s.prog.balls, 0, 1);
  const r2 = simulateShot(s.prog.balls, 0, 1);
  check('vật lý: cùng input → cùng output (xác định)', JSON.stringify(r1.balls) === JSON.stringify(r2.balls) && JSON.stringify(r1.potted) === JSON.stringify(r2.potted));
  check('vật lý: sau cú bắn mọi bi đều dừng', r1.balls.every(b => b.vx === 0 && b.vy === 0));
  check('vật lý: cú phá làm bi văng khỏi vị trí xếp', r1.balls.filter((b, i) => b.id !== 0 && (Math.abs(b.x - s.prog.balls[i].x) > 1 || Math.abs(b.y - s.prog.balls[i].y) > 1)).length >= 5);
  check('vật lý: bi không bao giờ ra ngoài bàn', r1.balls.filter(b => !b.potted).every(b => b.x >= 30 + BALL_R - 0.01 && b.x <= 930 - BALL_R + 0.01 && b.y >= 30 + BALL_R - 0.01 && b.y <= 480 - BALL_R + 0.01));
  check('vật lý: bi không chồng nhau sau khi dừng', (() => {
    const live = r1.balls.filter(b => !b.potted);
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      if (Math.hypot(live[i].x - live[j].x, live[i].y - live[j].y) < 2 * BALL_R - 0.5) return false;
    }
    return true;
  })());
}

// --- 3. cú phá ---
{
  const s = matchGame(31);
  const r = applyAction(s, 'p1', { type: 'shoot', angle: 0, power: 1 });
  check('phá: cú phá được chấp nhận', r.ok, r.reason || '');
  check('phá: breakDone = true, bàn vẫn mở (không chia nhóm)', s.prog.breakDone && s.prog.openTable);
  check('phá: ván vẫn đang chơi', s.phase === 'playing');
  check('phá: không tới lượt p2 nếu chưa vào lỗ (hoặc p1 bắn tiếp nếu vào)', s.prog.turn === 'p1' || s.prog.turn === 'p2');
}

// --- 4. chia nhóm + bắn tiếp / đổi lượt ---
{
  const s = matchGame(41);
  setTable(s, [B(0, 240, 255), B(1, 480, 255), B(9, 700, 100)], { breakDone: true, openTable: true });
  const aim = aimFor(s.prog.balls, 1, 2); /* bi 1 vào lỗ góc phải-trên (930,30) */
  check('chia nhóm: aimFor tìm được cú vào lỗ', !!aim, JSON.stringify(aim));
  const r = applyAction(s, 'p1', { type: 'shoot', angle: aim.angle, power: aim.power });
  check('chia nhóm: cú bắn được chấp nhận', r.ok, r.reason || '');
  check('chia nhóm: bi 1 đã vào lỗ', s.prog.balls[1].potted);
  check('chia nhóm: p1 nhận trơn, p2 nhận sọc, bàn đóng', s.prog.groups.p1 === 'solid' && s.prog.groups.p2 === 'stripe' && !s.prog.openTable);
  check('chia nhóm: vào bi thì được bắn tiếp', s.prog.turn === 'p1');
  /* trượt: bắn vào khoảng không → đổi lượt */
  setTable(s, [B(0, 480, 255), B(2, 700, 400), B(9, 700, 100)], { turn: 'p1', groups: { p1: 'solid', p2: 'stripe' }, openTable: false, breakDone: true });
  const r2 = applyAction(s, 'p1', { type: 'shoot', angle: Math.PI / 2, power: 0.2 }); /* bắn xuống, không chạm bi nào */
  check('đổi lượt: bắn trượt (không chạm bi) là phạm lỗi + đổi lượt', r2.ok && s.prog.turn === 'p2' && s.prog.fouls.p1 === 1);
  check('đổi lượt: phạm lỗi thì đối thủ được đặt bi', s.prog.ballInHand === 'p2');
}

// --- 5. phạm lỗi: scratch ---
{
  const s = matchGame(51);
  setTable(s, [B(0, 100, 100), B(1, 800, 400)], { breakDone: true, openTable: true });
  const r = applyAction(s, 'p1', { type: 'shoot', angle: Math.atan2(-70, -70), power: 0.5 });
  check('scratch: bi cái rơi lỗ góc được tính', r.ok && s.prog.balls[0].potted);
  check('scratch: tính 1 lỗi, đối thủ được đặt bi + đổi lượt', s.prog.fouls.p1 === 1 && s.prog.ballInHand === 'p2' && s.prog.turn === 'p2');
}

// --- 6. phạm lỗi: chạm nhầm bi đối thủ trước ---
{
  const s = matchGame(61);
  setTable(s, [B(0, 480, 255), B(9, 520, 255), B(1, 700, 400)], { breakDone: true, openTable: false, groups: { p1: 'solid', p2: 'stripe' } });
  const r = applyAction(s, 'p1', { type: 'shoot', angle: 0, power: 0.3 });
  check('chạm nhầm: chạm bi sọc (của p2) trước là phạm lỗi', r.ok && s.prog.fouls.p1 === 1 && s.prog.ballInHand === 'p2');
}

// --- 7. phạm lỗi: chạm bi nhưng không chạm băng / không vào lỗ ---
{
  const s = matchGame(71);
  setTable(s, [B(0, 480, 255), B(1, 520, 255)], { breakDone: true, openTable: false, groups: { p1: 'solid', p2: 'stripe' } });
  const r = applyAction(s, 'p1', { type: 'shoot', angle: 0, power: 0.15 });
  check('không băng: chạm nhẹ, không vào lỗ, không chạm băng → phạm lỗi', r.ok && s.prog.fouls.p1 === 1 && s.prog.ballInHand === 'p2');
}

// --- 8. bi 8: thắng khi hết nhóm ---
{
  const s = matchGame(81);
  const balls = fullBalls([1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15]);
  balls[0].x = 240; balls[0].y = 255;
  balls[8].x = 480; balls[8].y = 255; balls[8].potted = false;
  setTable(s, balls, { breakDone: true, openTable: false, groups: { p1: 'solid', p2: 'stripe' } });
  const aim = aimFor(s.prog.balls, 8, 2);
  check('bi 8 thắng: aimFor tìm được cú vào lỗ', !!aim);
  const r = applyAction(s, 'p1', { type: 'shoot', angle: aim.angle, power: aim.power });
  check('bi 8 thắng: vào bi 8 khi hết nhóm thì thắng', r.ok && s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'win');
  check('bi 8 thắng: summary có đủ trường', (() => {
    const sum = s.final.summary.p1;
    return sum && typeof sum.pots === 'number' && typeof sum.fouls === 'number' && typeof sum.ballsLeft === 'number' && typeof sum.timeMs === 'number' && typeof sum.shots === 'number';
  })());
}

// --- 9. bi 8: vào sớm thì thua ---
{
  const s = matchGame(91);
  const balls = fullBalls([2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15]);
  balls[0].x = 240; balls[0].y = 255;
  balls[1].x = 700; balls[1].y = 400; balls[1].potted = false; /* còn 1 bi trơn */
  balls[8].x = 480; balls[8].y = 255; balls[8].potted = false;
  setTable(s, balls, { breakDone: true, openTable: false, groups: { p1: 'solid', p2: 'stripe' } });
  const aim = aimFor(s.prog.balls, 8, 2);
  const r = applyAction(s, 'p1', { type: 'shoot', angle: aim.angle, power: aim.power });
  check('bi 8 sớm: vào bi 8 khi còn bi trơn thì thua', r.ok && s.phase === 'ended' && s.winner === 'p2' && s.endReason === 'foul8');
}

// --- 10. bi 8 vào lỗ ở cú phá → đặt lại ---
{
  const s = matchGame(101);
  setTable(s, [B(0, 240, 240), B(8, 120, 120), B(1, 800, 400)], { breakDone: false, openTable: true });
  const aim = aimFor(s.prog.balls, 8, 0); /* lỗ góc trái-trên (30,30) */
  check('bi 8 phá: aimFor tìm được cú vào lỗ', !!aim);
  const r = applyAction(s, 'p1', { type: 'shoot', angle: aim.angle, power: aim.power });
  check('bi 8 phá: bi 8 được đặt lại, không tính thua', r.ok && !ballById(s, 8).potted && s.phase === 'playing' && s.endReason === null);
  check('bi 8 phá: bi 8 đặt lại ở trong bàn', ballById(s, 8).x > 30 && ballById(s, 8).x < 930 && ballById(s, 8).y > 30 && ballById(s, 8).y < 480);
}

// --- 11. đặt bi cái (ball in hand) ---
{
  const s = matchGame(111);
  setTable(s, [B(0, -100, -100, true), B(1, 480, 255)], { breakDone: true, openTable: true, ballInHand: 'p1' });
  let r = applyAction(s, 'p1', { type: 'place', x: 480, y: 255 });
  check('đặt bi: không đặt chồng lên bi khác', !r.ok, r.reason || '');
  r = applyAction(s, 'p1', { type: 'place', x: 30, y: 30 });
  check('đặt bi: không đặt trong lỗ', !r.ok);
  r = applyAction(s, 'p1', { type: 'place', x: 10, y: 10 });
  check('đặt bi: không đặt ngoài bàn', !r.ok);
  r = applyAction(s, 'p1', { type: 'place', x: 240, y: 255 });
  check('đặt bi: đặt ở chỗ trống được', r.ok && !s.prog.balls[0].potted && s.prog.balls[0].x === 240 && s.prog.ballInHand === null);
  r = applyAction(s, 'p1', { type: 'place', x: 300, y: 300 });
  check('đặt bi: không có ball-in-hand thì không được đặt', !r.ok);
  check('đặt bi: chưa đặt bi thì không được bắn', (() => {
    setTable(s, [B(0, -100, -100, true), B(1, 480, 255)], { breakDone: true, openTable: true, ballInHand: 'p1' });
    const r2 = applyAction(s, 'p1', { type: 'shoot', angle: 0, power: 0.5 });
    return !r2.ok;
  })());
  check('placeError: kiểm tra vị trí hợp lệ', placeError(s.prog.balls, 240, 255) === null && typeof placeError(s.prog.balls, 30, 30) === 'string');
}

// --- 12. xin thua ---
{
  const s = matchGame(121);
  const r = applyAction(s, 'p1', { type: 'resign' });
  check('xin thua: đấu thì đối thủ thắng', r.ok && s.phase === 'ended' && s.winner === 'p2' && s.endReason === 'resign');
  const s2 = soloGame(122);
  applyAction(s2, 'p1', { type: 'resign' });
  check('xin thua: chơi đơn thì thua', s2.phase === 'ended' && s2.winner === null && s2.endReason === 'resign');
  check('xin thua: ván kết thúc thì không bắn được nữa', !applyAction(s, 'p2', { type: 'shoot', angle: 0, power: 0.5 }).ok);
}

// --- 13. hết giờ đấu ---
{
  const s = matchGame(131);
  let r = applyAction(s, 'p1', { type: 'timeout' });
  check('hết giờ: chưa hết 600s thì từ chối', !r.ok);
  s.startedAt = Date.now() - RACE_TIME_MS - 1000;
  s.prog.pots.p1 = 3; s.prog.pots.p2 = 1;
  r = applyAction(s, 'p1', { type: 'timeout' });
  check('hết giờ: nhiều bi hơn thì thắng', r.ok && s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'timeout');
  const s2 = matchGame(132);
  s2.startedAt = Date.now() - RACE_TIME_MS - 1000;
  s2.prog.pots.p1 = 2; s2.prog.pots.p2 = 2; s2.prog.fouls.p1 = 1; s2.prog.fouls.p2 = 0;
  applyAction(s2, 'p1', { type: 'timeout' });
  check('hết giờ: bằng bi thì ít lỗi hơn thắng', s2.winner === 'p2' && s2.endReason === 'timeout');
  const s3 = matchGame(133);
  s3.startedAt = Date.now() - RACE_TIME_MS - 1000;
  applyAction(s3, 'p1', { type: 'timeout' });
  check('hết giờ: bằng bi bằng lỗi thì hoà', s3.winner === null && s3.endReason === 'draw');
  const s4 = soloGame(134);
  check('hết giờ: chơi đơn không có giới hạn giờ', !applyAction(s4, 'p1', { type: 'timeout' }).ok);
}

// --- 14. quá số cú → hoà ---
{
  const s = matchGame(141);
  setTable(s, [B(0, 480, 255), B(1, 520, 255)], { breakDone: true, openTable: true });
  s.prog.shots.p1 = 149;
  applyAction(s, 'p1', { type: 'shoot', angle: 0, power: 0.15 });
  check('quá số cú: đủ 150 cú thì hoà', s.phase === 'ended' && s.endReason === 'draw' && s.winner === null);
}

// --- 15. chơi đơn: vào hết 15 bi thì thắng ---
{
  const s = soloGame(151);
  const balls = fullBalls([1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14]);
  balls[0].x = 240; balls[0].y = 255;
  balls[15].x = 480; balls[15].y = 255; balls[15].potted = false;
  balls[8].x = 700; balls[8].y = 400; balls[8].potted = false;
  setTable(s, balls, { breakDone: true, openTable: false, groups: { p1: 'stripe' } });
  /* chỉ còn bi 15 (sọc) + bi 8: vào bi 15 trước đã, rồi mới đánh bi 8 */
  const aim15 = aimFor(s.prog.balls, 15, 2);
  check('chơi đơn: aimFor bi 15 được', !!aim15);
  applyAction(s, 'p1', { type: 'shoot', angle: aim15.angle, power: aim15.power });
  check('chơi đơn: vào bi 15 xong vẫn chơi (còn bi 8)', s.phase === 'playing' && s.prog.balls[15].potted);
  const aim8 = (() => { for (let pk = 0; pk < 6; pk++) { const a = aimFor(s.prog.balls, 8, pk); if (a) return a; } return null; })();
  check('chơi đơn: aimFor bi 8 được', !!aim8);
  applyAction(s, 'p1', { type: 'shoot', angle: aim8.angle, power: aim8.power });
  check('chơi đơn: vào hết 15 bi thì thắng', s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'win');
}

// --- 16. viewFor / serialize / actors ---
{
  const s = matchGame(161);
  applyAction(s, 'p1', { type: 'shoot', angle: 0, power: 1 });
  const v1 = viewFor(s, 'p1'), v2 = viewFor(s, 'p2');
  check('viewFor: cả 2 người thấy cùng 1 bàn', JSON.stringify(v1.balls) === JSON.stringify(v2.balls));
  check('viewFor: me đúng từng người', v1.me === 'p1' && v2.me === 'p2');
  check('viewFor: có lastShot sau cú bắn', !!v1.lastShot && v1.lastShot.angle === 0);
  check('viewFor: có turn/groups/openTable', v1.turn === s.prog.turn && typeof v1.openTable === 'boolean' && !!v1.groups);
  check('actors: lượt của ai thì trả về người đó', JSON.stringify(actors(s)) === JSON.stringify([s.prog.turn]));
  const d = deserialize(serialize(s));
  check('serialize: round-trip giữ nguyên bàn + lượt + nhóm', JSON.stringify(d.prog.balls) === JSON.stringify(s.prog.balls) && d.prog.turn === s.prog.turn && JSON.stringify(d.prog.groups) === JSON.stringify(s.prog.groups));
  const s2 = deserialize(serialize(s));
  applyAction(s, s.prog.turn, { type: 'shoot', angle: 0.5, power: 0.5 });
  applyAction(s2, s2.prog.turn, { type: 'shoot', angle: 0.5, power: 0.5 });
  check('serialize: cùng action trên 2 bản sao → cùng kết quả', JSON.stringify(s.prog.balls) === JSON.stringify(s2.prog.balls));
  applyAction(s, s.prog.turn, { type: 'resign' });
  check('actors: ván kết thúc thì rỗng', actors(s).length === 0);
  check('applyAction: sai lượt thì từ chối', (() => {
    const s3 = matchGame(162);
    return !applyAction(s3, 'p2', { type: 'shoot', angle: 0, power: 0.5 }).ok;
  })());
}

// --- 17. aimFor / guideInfo ---
{
  const s = matchGame(171);
  setTable(s, [B(0, 240, 255), B(1, 480, 255)], { breakDone: true });
  const a = aimFor(s.prog.balls, 1, 2);
  check('aimFor: ngắm bi 1 vào lỗ góc phải-trên được', !!a && typeof a.angle === 'number' && a.power > 0 && a.power <= 1);
  check('aimFor: bi ở giữa bàn, lỗ khuất sau bi khác thì không ngắm được', (() => {
    setTable(s, [B(0, 240, 255), B(1, 480, 255), B(2, 700, 140)], { breakDone: true });
    return aimFor(s.prog.balls, 1, 2) === null; /* bi 2 chắn đường bi 1 tới lỗ */
  })());
  const g = guideInfo(s.prog.balls, 0);
  check('guideInfo: ngắm thẳng vào bi 1 thì hitId = 1', g && g.hitId === 1);
  const g2 = guideInfo(s.prog.balls, Math.PI / 2);
  check('guideInfo: ngắm xuống khoảng trống thì không chạm bi', g2 && g2.hitId === null);
  check('guideInfo: có ghost + hướng bi mục tiêu', g && g.ghost && g.targetDir && typeof g.pocketIdx === 'number');
}

console.log(`\nBida rules: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
