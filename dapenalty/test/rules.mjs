/* Đá Penalty rules tests — luật: tạo ván, chọn ô, giữ bí mật, vào/cản phá,
   luân phiên sút/bắt, kết thúc sớm, 5 vòng, luân lưu, chơi đơn, xin thua,
   viewFor, serialize, actors, summary.
   Math.random được seed lại trước mỗi ván để kết quả ổn định. */
import { createGame, applyAction, actors, viewFor, serialize, deserialize, mulberry32, ZONES, zoneName, isAdjacent, ROUNDS, SOLO_SHOTS, SOLO_WIN_GOALS, MAX_SUDDEN } from '../js/engine.js';

let pass = 0, fail = 0;
function check(name, cond, extra = '') { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }

function matchGame(seed = 1) {
  Math.random = mulberry32(seed);
  return createGame([
    { id: 'p1', name: 'P1', isBot: false },
    { id: 'p2', name: 'P2', isBot: true, level: 'hard' },
  ], { seed, dpMode: 'match' });
}
function soloGame(seed = 1) {
  Math.random = mulberry32(seed);
  return createGame([
    { id: 'p1', name: 'P1', isBot: false },
    { id: 'p2', name: 'Máy', isBot: true, level: 'hard' },
  ], { seed, dpMode: 'solo' });
}
/* 1 cú sút: người sút chọn sz, thủ môn chọn kz (theo cặp hiện tại) */
function kick(s, sz, kz) {
  const sh = s.prog.shooter, kp = s.prog.keeper;
  const r1 = applyAction(s, sh, { type: 'pick', zone: sz });
  if (!r1.ok) return r1;
  return applyAction(s, kp, { type: 'pick', zone: kz });
}
/* 1 cú sút có kết quả ép trước: goal=true → sút vào, false → bị cản phá */
function forcedKick(s, goal) {
  return goal ? kick(s, 'tl', 'tr') : kick(s, 'tl', 'tl');
}

// --- 1. tạo ván + hằng số ---
{
  check('hằng số: 9 vùng sút', ZONES.length === 9);
  check('hằng số: ROUNDS=5, SOLO_SHOTS=10, SOLO_WIN_GOALS=7', ROUNDS === 5 && SOLO_SHOTS === 10 && SOLO_WIN_GOALS === 7);
  check('zoneName: tên tiếng Việt', zoneName('tl') === 'Trên trái' && zoneName('br') === 'Dưới phải' && zoneName('mc') === 'Giữa');
  const s = matchGame(11);
  check('tạo ván đấu: p1 sút trước, p2 bắt', s.prog.shooter === 'p1' && s.prog.keeper === 'p2');
  check('tạo ván đấu: vòng 1, chưa sút cú nào', s.prog.round === 1 && s.prog.kick === 0 && !s.prog.sudden);
  check('tạo ván đấu: actors = cả 2 người chọn', JSON.stringify(actors(s)) === JSON.stringify(['p1', 'p2']));
  check('tạo ván đấu: tỉ số 0-0, chưa có lịch sử', s.prog.scores.p1 === 0 && s.prog.scores.p2 === 0 && s.prog.kicks.length === 0);
  const s2 = soloGame(12);
  check('tạo ván đơn: người chơi sút, máy bắt', s2.solo && s2.prog.shooter === 'p1' && s2.prog.keeper === 'p2');
  check('tạo ván đơn: actors = cả 2', JSON.stringify(actors(s2)) === JSON.stringify(['p1', 'p2']));
  check('tạo ván: gid duy nhất mỗi ván', matchGame(13).gid !== matchGame(13).gid);
}

// --- 2. chọn ô: kiểm tra hợp lệ ---
{
  const s = matchGame(21);
  check('chọn ô: vùng không hợp lệ thì từ chối', !applyAction(s, 'p1', { type: 'pick', zone: 'xx' }).ok);
  check('chọn ô: người không phải sút/bắt thì từ chối', !applyAction(s, 'p3', { type: 'pick', zone: 'tl' }).ok);
  let r = applyAction(s, 'p1', { type: 'pick', zone: 'tl' });
  check('chọn ô: người sút chọn được', r.ok);
  check('chọn ô: sau khi sút chọn, actors chỉ còn thủ môn', JSON.stringify(actors(s)) === JSON.stringify(['p2']));
  r = applyAction(s, 'p1', { type: 'pick', zone: 'tr' });
  check('chọn ô: chọn 2 lần thì từ chối', !r.ok, r.reason || '');
  check('chọn ô: kiểu action lạ thì từ chối', !applyAction(s, 'p2', { type: 'nhay' }).ok);
}

// --- 3. giữ bí mật: lựa chọn chỉ lộ khi cả 2 đã chọn ---
{
  const s = matchGame(31);
  applyAction(s, 'p1', { type: 'pick', zone: 'tl' });
  const v2 = viewFor(s, 'p2');
  check('bí mật: thủ môn chưa thấy vùng sút của đối thủ', v2.myPick === null && v2.oppPicked === true);
  const v1 = viewFor(s, 'p1');
  check('bí mật: người sút thấy lựa chọn của mình', v1.myPick === 'tl' && v1.oppPicked === false);
  check('bí mật: chưa lật bài thì không có lịch sử', v1.kicks.length === 0 && v1.lastKick === null);
  applyAction(s, 'p2', { type: 'pick', zone: 'tr' });
  const v1b = viewFor(s, 'p1');
  check('lật bài: cả 2 chọn xong thì lịch sử có 1 cú', v1b.kicks.length === 1 && v1b.lastKick !== null);
  check('lật bài: lịch sử ghi đủ 2 vùng + kết quả', v1b.lastKick.shootZone === 'tl' && v1b.lastKick.keepZone === 'tr' && v1b.lastKick.goal === true);
  const v2b = viewFor(s, 'p2');
  check('lật bài: cả 2 người thấy cùng 1 lịch sử', JSON.stringify(v2b.kicks) === JSON.stringify(v1b.kicks));
}

// --- 4. vào / cản phá ---
{
  const s = matchGame(41);
  let r = kick(s, 'tl', 'tr'); /* khác ô → vào */
  check('vào lưới: khác ô thì ghi bàn', r.ok && s.prog.scores.p1 === 1 && s.prog.saves.p2 === 0);
  check('vào lưới: streak của người sút = 1', s.prog.streak.p1 === 1 && s.prog.maxStreak.p1 === 1);
  r = kick(s, 'bl', 'bl'); /* cùng ô → cản phá (lượt này p2 sút, p1 bắt) */
  check('cản phá: cùng ô thì không ghi bàn', r.ok && s.prog.scores.p2 === 0 && s.prog.saves.p1 === 1);
  check('cản phá: streak của người sút về 0', s.prog.streak.p2 === 0);
}

// --- 4b. ô kề: 50% cản phá (xổ số xác định theo seed) ---
{
  check('ô kề: tl kề tc, ml, không kề tr/mc/bl', isAdjacent('tl', 'tc') && isAdjacent('tl', 'ml') && !isAdjacent('tl', 'tr') && !isAdjacent('tl', 'mc') && !isAdjacent('tl', 'bl'));
  check('ô kề: mc kề 4 ô chung cạnh, không kề góc', isAdjacent('mc', 'tc') && isAdjacent('mc', 'ml') && isAdjacent('mc', 'mr') && isAdjacent('mc', 'bc') && !isAdjacent('mc', 'tl') && !isAdjacent('mc', 'br'));
  check('ô kề: br kề mr, bc, không kề bl', isAdjacent('br', 'mr') && isAdjacent('br', 'bc') && !isAdjacent('br', 'bl'));
  /* cùng ô luôn cản phá (100/100 ván, seed khác nhau) */
  let exactSaves = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const s = matchGame(seed);
    kick(s, 'tl', 'tl');
    if (!s.prog.kicks[0].goal) exactSaves++;
  }
  check('ô kề: cùng ô thì cản phá 100%', exactSaves === 100, 'saves=' + exactSaves);
  /* ô xa luôn vào (tl vs br, khoảng cách 4) */
  let farGoals = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const s = matchGame(seed);
    kick(s, 'tl', 'br');
    if (s.prog.kicks[0].goal) farGoals++;
  }
  check('ô kề: ô xa thì vào 100%', farGoals === 100, 'goals=' + farGoals);
  /* ô kề: tỉ lệ cản phá ~50% (seed 1..200, kỳ vọng ~100 ± 20) */
  let adjSaves = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const s = matchGame(seed);
    kick(s, 'tl', 'tc');
    if (!s.prog.kicks[0].goal) adjSaves++;
  }
  console.log(`  ô kề: cản phá ${adjSaves}/200 cú sút ô kề (kỳ vọng ~100)`);
  check('ô kề: tỉ lệ cản phá ô kề ~50%', adjSaves > 70 && adjSaves < 130, 'saves=' + adjSaves);
  /* xổ số xác định: cùng seed → cùng kết quả ô kề */
  const sa = matchGame(777); kick(sa, 'tl', 'tc');
  const sb = matchGame(777); kick(sb, 'tl', 'tc');
  check('ô kề: cùng seed thì cùng kết quả lật bài', JSON.stringify(sa.prog.kicks) === JSON.stringify(sb.prog.kicks));
}
{
  const s = matchGame(51);
  check('luân phiên: cú 1 p1 sút', s.prog.shooter === 'p1' && s.prog.keeper === 'p2');
  forcedKick(s, true);
  check('luân phiên: cú 2 đổi vai (p2 sút)', s.prog.shooter === 'p2' && s.prog.keeper === 'p1' && s.prog.round === 1);
  forcedKick(s, true);
  check('luân phiên: cú 3 p1 sút lại, sang vòng 2', s.prog.shooter === 'p1' && s.prog.round === 2);
  check('luân phiên: đã sút 2 cú', s.prog.kick === 2);
}

// --- 6. kết thúc sớm (3-0 sau 3 vòng) ---
{
  const s = matchGame(61);
  forcedKick(s, true);  /* p1 ghi 1-0 */
  forcedKick(s, false); /* p2 hỏng 1-0 */
  forcedKick(s, true);  /* p1 ghi 2-0 */
  forcedKick(s, false); /* p2 hỏng 2-0 */
  check('kết thúc sớm: 2-0 sau 2 vòng vẫn chơi', s.phase === 'playing');
  forcedKick(s, true);  /* p1 ghi 3-0, p2 còn 3 cú → vẫn chơi được */
  check('kết thúc sớm: 3-0 nhưng p2 còn 3 cú nên vẫn chơi', s.phase === 'playing');
  forcedKick(s, false); /* p2 hỏng cú thứ 3 → chỉ còn 2 cú, không gỡ được */
  check('kết thúc sớm: 3-0 thì p1 thắng ngay', s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'win');
  check('kết thúc sớm: summary có đủ trường', (() => {
    const sum = s.final.summary.p1;
    return sum && typeof sum.goals === 'number' && typeof sum.saves === 'number' && typeof sum.conceded === 'number' && typeof sum.shots === 'number' && typeof sum.maxStreak === 'number' && typeof sum.trailed === 'boolean' && typeof sum.timeMs === 'number';
  })());
  check('kết thúc sớm: ván kết thúc thì không chọn được nữa', !applyAction(s, 'p1', { type: 'pick', zone: 'tl' }).ok);
}

// --- 7. đủ 5 vòng, ai nhiều bàn hơn thì thắng ---
{
  const s = matchGame(71);
  forcedKick(s, true);  /* p1 1-0 */
  forcedKick(s, true);  /* p2 1-1 */
  forcedKick(s, true);  /* p1 2-1 */
  forcedKick(s, true);  /* p2 2-2 */
  forcedKick(s, true);  /* p1 3-2 */
  forcedKick(s, false); /* p2 hỏng 3-2 */
  forcedKick(s, false); /* p1 hỏng 3-2 */
  forcedKick(s, false); /* p2 hỏng 3-2 */
  check('5 vòng: 3-2 sau 4 vòng vẫn chơi', s.phase === 'playing' && s.prog.kick === 8);
  forcedKick(s, false); /* p1 hỏng, vẫn 3-2 */
  check('5 vòng: p1 hỏng cú cuối vẫn 3-2', s.phase === 'playing' && s.prog.kick === 9);
  forcedKick(s, false); /* p2 hỏng cú cuối */
  check('5 vòng: hết 10 cú, p1 thắng 3-2', s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'win' && s.prog.kick === 10);
  check('5 vòng: summary ghi đúng bàn thắng', s.final.summary.p1.goals === 3 && s.final.summary.p2.goals === 2);
  check('5 vòng: conceded = bàn đối thủ ghi', s.final.summary.p1.conceded === 2 && s.final.summary.p2.conceded === 3);
}

// --- 8. hoà 5-5 → luân lưu, dẫn trước sau 1 vòng thì thắng ---
{
  const s = matchGame(81);
  for (let i = 0; i < 10; i++) forcedKick(s, i < 4); /* p1 ghi 2 (cú 0,2), p2 ghi 2 (cú 1,3) */
  check('luân lưu: hoà 2-2 sau 5 vòng → vào luân lưu', s.phase === 'playing' && s.prog.sudden === true && s.prog.suddenRound === 1, 'scores=' + s.prog.scores.p1 + '-' + s.prog.scores.p2 + ' sudden=' + s.prog.sudden);
  forcedKick(s, true);  /* p1 ghi 3-2 */
  check('luân lưu: giữa vòng chưa kết thúc', s.phase === 'playing');
  forcedKick(s, false); /* p2 hỏng, vẫn 3-2 sau 1 vòng luân lưu */
  check('luân lưu: dẫn trước sau 1 vòng thì thắng', s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'win');
}

// --- 9. luân lưu quá MAX_SUDDEN vòng vẫn hoà thì hoà ---
{
  const s = matchGame(91);
  for (let i = 0; i < 10; i++) forcedKick(s, i < 4); /* hoà 2-2 */
  check('luân lưu hoà: vào luân lưu', s.prog.sudden === true);
  for (let i = 0; i < 2 * MAX_SUDDEN; i++) forcedKick(s, false); /* mọi cú đều bị cản phá */
  check('luân lưu hoà: quá 10 vòng vẫn hoà thì hoà', s.phase === 'ended' && s.winner === null && s.endReason === 'draw', 'kick=' + s.prog.kick + ' phase=' + s.phase);
}

// --- 10. chơi đơn: 10 cú, >= 7 bàn thì thắng ---
{
  const s = soloGame(101);
  for (let i = 0; i < 7; i++) forcedKick(s, true);
  check('chơi đơn: 7 bàn sau 7 cú vẫn chơi', s.phase === 'playing' && s.prog.kick === 7);
  for (let i = 0; i < 3; i++) forcedKick(s, false);
  check('chơi đơn: 7/10 bàn thì thắng', s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'win');
  check('chơi đơn: summary có conceded = 0', s.final.summary.p1.conceded === 0 && s.final.summary.p1.goals === 7 && s.final.summary.p1.shots === 10);
  const s2 = soloGame(102);
  for (let i = 0; i < 6; i++) forcedKick(s2, true);
  for (let i = 0; i < 4; i++) forcedKick(s2, false);
  check('chơi đơn: 6/10 bàn thì thua', s2.phase === 'ended' && s2.winner === null && s2.endReason === 'win');
  check('chơi đơn: maxStreak ghi đúng chuỗi dài nhất', s2.final.summary.p1.maxStreak === 6, 'maxStreak=' + s2.final.summary.p1.maxStreak);
}

// --- 11. xin thua ---
{
  const s = matchGame(111);
  const r = applyAction(s, 'p1', { type: 'resign' });
  check('xin thua: đấu thì đối thủ thắng', r.ok && s.phase === 'ended' && s.winner === 'p2' && s.endReason === 'resign');
  const s2 = soloGame(112);
  applyAction(s2, 'p1', { type: 'resign' });
  check('xin thua: chơi đơn thì thua', s2.phase === 'ended' && s2.winner === null && s2.endReason === 'resign');
}

// --- 12. streak + bị dẫn trước (comeback) ---
{
  const s = matchGame(121);
  forcedKick(s, false); /* p1 hỏng 0-0 */
  forcedKick(s, true);  /* p2 ghi 0-1 → p1 bị dẫn */
  check('comeback: p1 bị dẫn sau cú 2', s.prog.trailed.p1 === true && s.prog.trailed.p2 === false);
  forcedKick(s, true);  /* p1 ghi 1-1 */
  forcedKick(s, false); /* p2 hỏng 1-1 */
  forcedKick(s, true);  /* p1 ghi 2-1 */
  forcedKick(s, false); /* p2 hỏng 2-1 */
  forcedKick(s, true);  /* p1 ghi 3-1 */
  forcedKick(s, false); /* p2 hỏng → p1 thắng sớm 3-1 */
  check('comeback: p1 lội ngược dòng thắng 3-1', s.phase === 'ended' && s.winner === 'p1');
  check('comeback: summary.trailed của p1 = true', s.final.summary.p1.trailed === true);
  const s2 = matchGame(122);
  forcedKick(s2, true); forcedKick(s2, false); forcedKick(s2, true); forcedKick(s2, false); forcedKick(s2, true);
  check('streak: 3 bàn liên tiếp thì maxStreak = 3', s2.prog.maxStreak.p1 === 3 && s2.prog.streak.p1 === 3);
  forcedKick(s2, true); /* p2 ghi */
  check('streak: streak của p1 không đổi khi tới lượt p2', s2.prog.streak.p1 === 3);
  forcedKick(s2, false); /* p1 hỏng → streak về 0, maxStreak giữ 3 */
  check('streak: hỏng thì streak về 0 nhưng maxStreak giữ nguyên', s2.prog.streak.p1 === 0 && s2.prog.maxStreak.p1 === 3);
}

// --- 13. viewFor / serialize / actors ---
{
  const s = matchGame(131);
  applyAction(s, 'p1', { type: 'pick', zone: 'tl' });
  const v1 = viewFor(s, 'p1'), v2 = viewFor(s, 'p2');
  check('viewFor: me đúng từng người', v1.me === 'p1' && v2.me === 'p2');
  check('viewFor: có round/sudden/shooter/keeper/scores', v1.round === 1 && v1.sudden === false && v1.shooter === 'p1' && v1.keeper === 'p2' && typeof v1.scores === 'object');
  check('actors: chỉ còn người chưa chọn', JSON.stringify(actors(s)) === JSON.stringify(['p2']));
  const d = deserialize(serialize(s));
  check('serialize: round-trip giữ nguyên lượt chọn + lượt sút', JSON.stringify(d.prog.picks) === JSON.stringify(s.prog.picks) && d.prog.shooter === s.prog.shooter);
  applyAction(s, 'p2', { type: 'pick', zone: 'tr' });
  const d2 = deserialize(serialize(s));
  applyAction(s, s.prog.shooter, { type: 'pick', zone: 'bl' });
  applyAction(d2, d2.prog.shooter, { type: 'pick', zone: 'bl' });
  check('serialize: cùng action trên 2 bản sao → cùng kết quả', JSON.stringify(s.prog.kicks) === JSON.stringify(d2.prog.kicks) && JSON.stringify(s.prog.scores) === JSON.stringify(d2.prog.scores));
  applyAction(s, s.prog.keeper, { type: 'pick', zone: 'bc' }); /* hoàn tất cú 2 */
  check('actors: ván kết thúc thì rỗng (sau khi xin thua)', (() => {
    applyAction(s, s.prog.shooter, { type: 'resign' });
    return actors(s).length === 0;
  })());
}

console.log(`\nĐá Penalty rules: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
