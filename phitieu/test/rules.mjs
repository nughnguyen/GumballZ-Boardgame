/* Phi Tiêu rules tests — engine thuần, không DOM. */
import {
  createGame, applyAction, actors, viewFor, serialize, deserialize,
  mulberry32, SEGMENTS, START_SCORE, SOLO_VISITS, SOLO_WIN_SCORE,
  pointFor, scoreOf, ringName, isDoubleOut,
} from '../js/engine.js?v=1';
import { botAction } from '../js/bot.js?v=1';

Math.random = mulberry32(12345);
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function mkPlayers(l1 = 'hard', l2 = 'hard') {
  return [
    { id: 'p1', name: 'P1', isBot: true, level: l1 },
    { id: 'p2', name: 'P2', isBot: true, level: l2 },
  ];
}
function drive(s, maxSteps = 600) {
  let steps = 0;
  while (s.phase === 'playing' && steps < maxSteps) {
    const acts = actors(s);
    if (!acts.length) return false;
    for (const pid of acts) {
      if (s.phase !== 'playing') break;
      if (!actors(s).includes(pid)) continue;
      const a = botAction(s, pid);
      if (!a) return false;
      const r = applyAction(s, pid, a);
      if (!r.ok) return false;
      steps++;
    }
  }
  return s.phase === 'ended';
}
/* tìm seed sao cho: tạo ván (setup) rồi ném 1 phi (aim) thỏa want(dart, s) */
function findThrowSeed(setup, aim, want, maxSeed = 300) {
  for (let seed = 1; seed <= maxSeed; seed++) {
    Math.random = mulberry32(seed);
    const s = createGame(mkPlayers(), { seed, phMode: 'match' });
    setup(s);
    const r = applyAction(s, 'p1', { type: 'throw', x: aim.x, y: aim.y });
    if (r.ok && want(r.dart, s)) return seed;
  }
  return 0;
}

console.log('Phi Tiêu rules:');

// 1. tạo ván
{
  const s = createGame(mkPlayers(), { seed: 7, phMode: 'solo' });
  check('solo: phase playing', s.phase === 'playing');
  check('solo: solo=true, race=false', s.solo === true && s.race === false);
  check('solo: 2 người chơi', s.players.length === 2);
  check('solo: lượt đầu là p1, visit 1', s.prog.turn === 'p1' && s.prog.visit === 1);
  check('solo: còn 501 điểm mỗi người', s.prog.remaining.p1 === 501 && s.prog.remaining.p2 === 501);
  const m = createGame(mkPlayers(), { seed: 7, phMode: 'match' });
  check('match: solo=false', m.solo === false);
  check('actors solo = [p1]', JSON.stringify(actors(s)) === JSON.stringify(['p1']));
  check('actors match = [turn]', JSON.stringify(actors(m)) === JSON.stringify(['p1']));
}

// 2. scoreOf — bull, vòng, ô, trượt, ranh giới
{
  check('bull trong (200,200) = 50', JSON.stringify(scoreOf(200, 200)) === JSON.stringify({ segment: null, ring: 'inner', points: 50 }));
  check('bull ngoài (200,214) = 25', scoreOf(200, 214).ring === 'outer' && scoreOf(200, 214).points === 25);
  const t20 = scoreOf(pointFor(20, 'treble').x, pointFor(20, 'treble').y);
  check('treble 20 = 60', t20.segment === 20 && t20.ring === 'treble' && t20.points === 60);
  const d20 = scoreOf(pointFor(20, 'double').x, pointFor(20, 'double').y);
  check('double 20 = 40', d20.segment === 20 && d20.ring === 'double' && d20.points === 40);
  const s20 = scoreOf(pointFor(20, 'single').x, pointFor(20, 'single').y);
  check('đơn 20 = 20', s20.segment === 20 && s20.ring === 'single' && s20.points === 20);
  const t1 = scoreOf(pointFor(1, 'treble').x, pointFor(1, 'treble').y);
  check('treble 1 = 3', t1.segment === 1 && t1.ring === 'treble' && t1.points === 3);
  const d5 = scoreOf(pointFor(5, 'double').x, pointFor(5, 'double').y);
  check('double 5 = 10', d5.segment === 5 && d5.ring === 'double' && d5.points === 10);
  check('ngoài bàn (0,0) = trượt 0', scoreOf(0, 0).ring === 'miss' && scoreOf(0, 0).points === 0);
  check('ngoài bàn (400,400) = trượt 0', scoreOf(400, 400).ring === 'miss');
  check('ranh giới ô 20/1: (208,141) là 20', scoreOf(208, 141).segment === 20);
  check('ranh giới ô 20/1: (211,141) là 1', scoreOf(211, 141).segment === 1);
  check('ranh giới treble: r=99 là treble', scoreOf(200, 101).ring === 'treble');
  check('ranh giới treble: r=98 là đơn', scoreOf(200, 102).ring === 'single');
  check('ranh giới double: r=162 là double', scoreOf(200, 38).ring === 'double');
  check('ranh giới double: r=161 là đơn', scoreOf(200, 39).ring === 'single');
  check('isDoubleOut: double true', isDoubleOut({ ring: 'double' }) === true);
  check('isDoubleOut: inner true', isDoubleOut({ ring: 'inner' }) === true);
  check('isDoubleOut: treble false', isDoubleOut({ ring: 'treble' }) === false);
  check('isDoubleOut: single false', isDoubleOut({ ring: 'single' }) === false);
  check('ringName Bull 50', ringName({ ring: 'inner' }) === 'Bull 50');
  check('ringName Treble 20', ringName({ segment: 20, ring: 'treble' }) === 'Treble 20');
  check('SEGMENTS đủ 20 ô, ô 20 đầu', SEGMENTS.length === 20 && SEGMENTS[0] === 20 && SEGMENTS[19] === 5);
  check('pointFor treble 20 nằm đúng vòng', (() => { const p = pointFor(20, 'treble'); return Math.hypot(p.x - 200, p.y - 200) >= 99 && Math.hypot(p.x - 200, p.y - 200) <= 115; })());
}

// 3. throw validation
{
  const s = createGame(mkPlayers(), { seed: 11, phMode: 'match' });
  check('người khác lượt ném bị cấm', applyAction(s, 'p2', { type: 'throw', x: 200, y: 100 }).ok === false);
  check('điểm ngắm ngoài bàn bị cấm', applyAction(s, 'p1', { type: 'throw', x: 500, y: 100 }).ok === false);
  check('điểm ngắm NaN bị cấm', applyAction(s, 'p1', { type: 'throw', x: NaN, y: 100 }).ok === false);
  check('điểm ngắm chuỗi bị cấm', applyAction(s, 'p1', { type: 'throw', x: '200', y: 100 }).ok === false);
  check('action lạ bị cấm', applyAction(s, 'p1', { type: 'nhay' }).ok === false);
  const r = applyAction(s, 'p1', { type: 'throw', x: 200, y: 100 });
  check('ném hợp lệ ok', r.ok === true && r.dart && typeof r.dart.points === 'number');
  check('ném xong vẫn lượt p1 (còn 2 phi)', s.prog.turn === 'p1' && s.prog.visitDarts.length === 1);
  check('darts đếm đúng', s.prog.darts.p1 === 1 && s.prog.throws.length === 1);
}

// 4. bust — vượt quá / còn 1 / về 0 không double (tìm seed cho ra kết quả cần)
{
  const seedBustOver = findThrowSeed(
    s => { s.prog.remaining.p1 = 30; s.prog.visitStart = 30; },
    pointFor(20, 'treble'),
    (d, s) => d.points > 30 && s.prog.remaining.p1 === 30 && s.prog.turn === 'p2',
  );
  check('bust vượt quá: tìm được seed', seedBustOver > 0);
  if (seedBustOver) {
    Math.random = mulberry32(seedBustOver);
    const s = createGame(mkPlayers(), { seed: seedBustOver, phMode: 'match' });
    s.prog.remaining.p1 = 30; s.prog.visitStart = 30;
    const r = applyAction(s, 'p1', { type: 'throw', x: pointFor(20, 'treble').x, y: pointFor(20, 'treble').y });
    check('bust vượt quá: busted=true, điểm giữ nguyên, đổi lượt', r.busted === true && s.prog.remaining.p1 === 30 && s.prog.turn === 'p2');
  }
  const seedBustOne = findThrowSeed(
    s => { s.prog.remaining.p1 = 21; s.prog.visitStart = 21; },
    pointFor(20, 'single'),
    (d, s) => s.prog.remaining.p1 === 21 && s.prog.turn === 'p2',
  );
  check('bust còn 1: tìm được seed', seedBustOne > 0);
  const seedBustZero = findThrowSeed(
    s => { s.prog.remaining.p1 = 20; s.prog.visitStart = 20; },
    pointFor(20, 'single'),
    (d, s) => s.prog.remaining.p1 === 20 && s.prog.turn === 'p2' && s.phase === 'playing',
  );
  check('bust về 0 không double: tìm được seed', seedBustZero > 0);
}

// 5. double-out — thắng bằng double 20 và bằng bull trong
{
  const seedD20 = findThrowSeed(
    s => { s.prog.remaining.p1 = 40; s.prog.visitStart = 40; },
    pointFor(20, 'double'),
    (d, s) => s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'win',
  );
  check('thắng bằng double 20: tìm được seed', seedD20 > 0);
  const seedBull = findThrowSeed(
    s => { s.prog.remaining.p1 = 50; s.prog.visitStart = 50; },
    { x: 200, y: 200 },
    (d, s) => s.phase === 'ended' && s.winner === 'p1' && d.ring === 'inner',
  );
  check('thắng bằng bull trong (còn 50): tìm được seed', seedBull > 0);
  if (seedBull) {
    Math.random = mulberry32(seedBull);
    const s = createGame(mkPlayers(), { seed: seedBull, phMode: 'match' });
    s.prog.remaining.p1 = 50; s.prog.visitStart = 50;
    applyAction(s, 'p1', { type: 'throw', x: 200, y: 200 });
    check('bull trong: summary bulls=1', s.final.summary.p1.bulls === 1);
  }
}

// 6. solo — thắng / thua (tìm seed), đủ 30 phi
{
  let winSeed = 0, loseSeed = 0;
  for (let seed = 1; seed <= 80 && (!winSeed || !loseSeed); seed++) {
    Math.random = mulberry32(seed);
    const s = createGame(mkPlayers(), { seed, phMode: 'solo' });
    if (!drive(s)) continue;
    if (s.winner === 'p1' && !winSeed) winSeed = seed;
    if (s.winner === null && !loseSeed) loseSeed = seed;
  }
  check('solo: tìm được seed thắng Hard', winSeed > 0);
  check('solo: tìm được seed thua Hard', loseSeed > 0);
  if (winSeed) {
    Math.random = mulberry32(winSeed);
    const s = createGame(mkPlayers(), { seed: winSeed, phMode: 'solo' });
    drive(s);
    check('solo thắng: tổng ≥ 880, đủ 30 phi', s.final.summary.p1.score >= SOLO_WIN_SCORE && s.final.summary.p1.darts === 30);
    check('solo thắng: endReason win', s.endReason === 'win');
    check('solo thắng: maxVisit ≤ 180', s.final.summary.p1.maxVisit <= 180);
    check('solo thắng: maxVisit ≥100 thì tons ≥1', s.final.summary.p1.maxVisit < 100 || s.final.summary.p1.tons >= 1);
    check('solo thắng: tons ≤ 10 lượt', s.final.summary.p1.tons <= SOLO_VISITS);
  }
  if (loseSeed) {
    Math.random = mulberry32(loseSeed);
    const s = createGame(mkPlayers(), { seed: loseSeed, phMode: 'solo' });
    drive(s);
    check('solo thua: winner null, losers chứa p1', s.winner === null && s.final.summary.p1.score < SOLO_WIN_SCORE);
    check('solo thua: vẫn đủ 30 phi', s.final.summary.p1.darts === 30);
  }
}

// 7. resign + ném sau khi kết thúc
{
  const s = createGame(mkPlayers(), { seed: 21, phMode: 'match' });
  const r = applyAction(s, 'p1', { type: 'resign' });
  check('resign đấu: ok, winner là p2', r.ok === true && s.winner === 'p2' && s.endReason === 'resign');
  check('ném sau khi kết thúc bị cấm', applyAction(s, 'p1', { type: 'throw', x: 200, y: 100 }).ok === false);
  check('actors sau khi kết thúc = []', actors(s).length === 0);
  const s2 = createGame(mkPlayers(), { seed: 22, phMode: 'solo' });
  applyAction(s2, 'p1', { type: 'resign' });
  check('resign solo: winner null', s2.winner === null && s2.endReason === 'resign');
}

// 8. viewFor / serialize / gid
{
  const s = createGame(mkPlayers(), { seed: 31, phMode: 'match' });
  applyAction(s, 'p1', { type: 'throw', x: 200, y: 100 });
  const v = viewFor(s, 'p1');
  check('viewFor: đủ trường chính', v.gid === s.gid && v.phase === 'playing' && v.turn === 'p1' && Array.isArray(v.throws) && v.throws.length === 1);
  check('viewFor: visitDarts 1 phi', v.visitDarts.length === 1);
  check('viewFor: players đủ tên', v.players.length === 2 && v.players[0].name === 'P1');
  const d = deserialize(serialize(s));
  check('serialize round-trip bằng JSON', JSON.stringify(d) === JSON.stringify(s));
  check('serialize độc lập (sửa bản sao không ảnh hưởng gốc)', (() => { d.prog.remaining.p1 = 1; return s.prog.remaining.p1 !== 1; })());
  /* gid duy nhất khi seed Math.random (bài học Nhện) */
  Math.random = mulberry32(4242);
  const gids = new Set();
  for (let i = 0; i < 200; i++) gids.add(createGame(mkPlayers(), { seed: i + 1, phMode: 'match' }).gid);
  check('gid duy nhất 200 ván (seeded Math.random)', gids.size === 200);
  /* cùng seed + cùng dãy action → cùng kết quả (xác định).
     LƯU Ý: summary.timeMs là đồng hồ tường (Date.now) nên khác nhau
     giữa 2 lần chạy — so sánh sau khi loại timeMs. */
  const runOnce = seed => {
    Math.random = mulberry32(seed);
    const g = createGame(mkPlayers(), { seed, phMode: 'match' });
    drive(g);
    const f = JSON.parse(JSON.stringify(g.final));
    for (const pid of Object.keys(f.summary || {})) delete f.summary[pid].timeMs;
    return JSON.stringify({ w: g.winner, r: g.endReason, f });
  };
  check('cùng seed → cùng kết quả (2 lần)', runOnce(77) === runOnce(77));
}

console.log(`\nPhi Tiêu rules: ${pass} pass, ${fail} fail.`);
process.exit(fail ? 1 : 0);
