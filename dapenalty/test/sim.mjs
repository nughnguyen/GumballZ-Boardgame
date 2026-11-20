/* Đá Penalty — mô phỏng với bot: tỷ lệ thắng + tỷ lệ mở thành tựu.
   Gieo Math.random bằng mulberry32 để kết quả ổn định qua các lần chạy.

   LƯU Ý VỀ ĐỘ KHÓ (trò "oẳn tù tì" — matching pennies): sút/bắt là trò
   đoán ô 3×3, nên người chơi SÚT NGẪU NHIÊN ĐỀU là không thể bắt bài —
   không có chiến thuật sút nào thắng được thủ môn ngẫu nhiên, và ngược
   lại. Vì vậy bot-vs-bot (cả hai gần như ngẫu nhiên) luôn ~50/50, đó là
   ĐÚNG chứ không phải bot yếu. Độ khó thật nằm ở chỗ: thủ môn Hard
   BẮT BÀI người sút có thói quen (sút lặp 1 ô → bị bắt 94%), còn thủ
   môn Easy thì không; xạ thủ Hard TRÁNH ô thủ môn hay đổ, còn xạ thủ
   Easy thì không. Người thật luôn có thói quen (góc tủ, lặp ô), nên
   Hard khó hơn Easy rõ rệt khi đấu với người. Các test "kỹ năng"
   (mục 3) đo đúng hai cơ chế này bằng đối thủ CÓ THỂ ĐOÁN ĐƯỢC.

   Kết quả đo được (chạy 2026-11-20, sau khi sửa bot):
   - solo Hard sút vs Hard bắt: 12/20 (7.0 bàn/10); vs Easy bắt: 11/20 (6.9)
   - solo Easy sút vs Hard bắt: 16/20 (7.7) — sút ngẫu nhiên không bị
     bắt bài, đúng như lý thuyết; ngưỡng thắng solo 7 bàn là hợp lý
     (Hard ~55-60%, Easy ~80% — người chơi khá thắng được, người chơi
     dở thì không).
   - đấu Hard vs Hard: 15-15 (n=30); Hard vs Easy: 9-11 và 9-11 (n=20,
     cả hai chiều) — ~50/50 như kỳ vọng của trò đoán ô.
   - kỹ năng thủ môn (xạ thủ chỉ sút 'tl', n=30): Hard bắt chỉ lọt
     2.27 bàn/10 (thắng 0/30), Easy bắt lọt 7.93 bàn/10 (thắng 26/30).
   - kỹ năng xạ thủ (thủ môn chỉ đổ 'mc', n=30): Hard sút 7.17 bàn/10
     (thắng 20/30), Easy sút 6.63 bàn/10 (thắng 16/30).
   - trực tiếp botAction (200 lần): thủ môn Hard đổ đúng ô xạ thủ hay
     sút 188 lần, Easy 23 lần; xạ thủ Hard KHÔNG BAO GIỜ sút vào ô
     thủ môn hay đổ (0 lần), Easy 25 lần.
   - thành tựu đấu (gộp 80 ván): clean5(≤1 lọt lưới) 15%, comeback 41%,
     streak5 29% — đều trong khoảng 5-60%, không quá dễ cũng không
     quá khó.
   4 thành tựu (dp-solo-win, dp-clean5 = thắng mà chỉ lọt lưới ≤1 bàn,
   dp-comeback, dp-streak5 = chuỗi 5 bàn liên tiếp). */
import { createGame, applyAction, actors, mulberry32 } from '../js/engine.js?v=1';
import { botAction } from '../js/bot.js?v=1';

let pass = 0, fail = 0;
function check(name, ok, extra = '') {
  if (ok) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); }
}

/* đánh 1 ván đến cùng bằng botAction (mọi lượt) */
function drive(s, maxSteps = 400) {
  let steps = 0;
  while (s.phase === 'playing' && steps < maxSteps) {
    const acts = actors(s);
    if (!acts.length) return { ok: false, why: 'không còn lượt nào' };
    for (const pid of acts) {
      if (s.phase !== 'playing') break;
      if (!actors(s).includes(pid)) continue;
      const a = botAction(s, pid);
      if (!a) return { ok: false, why: 'bot không ra nước đi' };
      const r = applyAction(s, pid, a);
      if (!r.ok) return { ok: false, why: 'bot đi nước bị cấm: ' + r.reason };
      steps++;
    }
  }
  return { ok: s.phase === 'ended', why: s.phase };
}

/* đánh 1 ván với chiến thuật tuỳ ý cho từng vai (đo cơ chế kỹ năng) */
function driveScripted(s, shootFn, keepFn, maxSteps = 400) {
  let steps = 0;
  while (s.phase === 'playing' && steps < maxSteps) {
    const acts = actors(s);
    if (!acts.length) return { ok: false, why: 'không còn lượt nào' };
    for (const pid of acts) {
      if (s.phase !== 'playing') break;
      if (!actors(s).includes(pid)) continue;
      const isShooter = s.prog.shooter === pid;
      const a = isShooter ? shootFn(s, pid) : keepFn(s, pid);
      if (!a) return { ok: false, why: 'không ra nước đi' };
      const r = applyAction(s, pid, a);
      if (!r.ok) return { ok: false, why: 'nước đi bị cấm: ' + r.reason };
      steps++;
    }
  }
  return { ok: s.phase === 'ended', why: s.phase };
}
const fixedZone = z => (s, pid) => ({ type: 'pick', zone: z });
const botPick = (s, pid) => botAction(s, pid);

function soloGame(seed, shooterLevel, keeperLevel) {
  Math.random = mulberry32(seed);
  return createGame([
    { id: 'p1', name: 'P1', isBot: true, level: shooterLevel },
    { id: 'p2', name: 'Máy', isBot: true, level: keeperLevel },
  ], { seed, dpMode: 'solo' });
}
function matchGame(seed, l1, l2) {
  Math.random = mulberry32(seed);
  return createGame([
    { id: 'p1', name: 'P1', isBot: true, level: l1 },
    { id: 'p2', name: 'P2', isBot: true, level: l2 },
  ], { seed, dpMode: 'match' });
}

/* ---- 1. solo: thắng được nhưng không tự động (ngưỡng 7 bàn) ---- */
function soloRun(n, seed0, shooterLevel, keeperLevel) {
  let wins = 0, goals = 0, stuck = 0;
  for (let i = 0; i < n; i++) {
    const s = soloGame(seed0 + i, shooterLevel, keeperLevel);
    const r = drive(s);
    if (!r.ok) { stuck++; continue; }
    goals += s.final.summary.p1.goals;
    if (s.winner === 'p1') wins++;
  }
  console.log(`  solo ${shooterLevel} sút vs ${keeperLevel} bắt: thắng ${wins}/${n}, trung bình ${(goals / n).toFixed(1)} bàn/10 cú`);
  return { wins, goals, stuck };
}
const sHH = soloRun(20, 11, 'hard', 'hard');
const sHE = soloRun(20, 31, 'hard', 'easy');
const sEH = soloRun(20, 51, 'easy', 'hard');
check('sim: solo không bị kẹt', sHH.stuck + sHE.stuck + sEH.stuck === 0);
check('sim: solo Hard thắng được (≥30%) nhưng không tự động (≤90%)', sHH.wins >= 6 && sHH.wins <= 18, `Hard thắng ${sHH.wins}/20`);
check('sim: solo thắng được trước thủ môn Easy', sHE.wins >= 6 && sHE.wins <= 18, `Hard thắng ${sHE.wins}/20`);

/* ---- 2. đấu: luôn kết thúc, không lệch ghế quá lớn ---- */
function matchRun(n, seed0, l1, l2, label) {
  let w1 = 0, w2 = 0, draws = 0, sudden = 0, maxKicks = 0, clean5 = 0, comeback = 0, streak3 = 0, stuck = 0;
  for (let i = 0; i < n; i++) {
    const s = matchGame(seed0 + i, l1, l2);
    const r = drive(s);
    if (!r.ok) { stuck++; continue; }
    const kicks = s.prog.kicks.length;
    maxKicks = Math.max(maxKicks, kicks);
    if (s.prog.sudden) sudden++;
    if (s.winner === 'p1') w1++;
    else if (s.winner === 'p2') w2++;
    else draws++;
    const w = s.winner;
    if (w) {
      const sum = s.final.summary[w];
      const conceded = s.final.summary[w === 'p1' ? 'p2' : 'p1'].goals;
      if (conceded <= 1) clean5++;
      if (sum.trailed) comeback++;
      if (sum.maxStreak >= 5) streak3++;
    }
  }
  console.log(`  đấu ${label}: p1 ${w1}, p2 ${w2}, hoà ${draws}, luân lưu ${sudden}/${n}, tối đa ${maxKicks} cú | clean5(≤1 lọt lưới) ${clean5}/${n}, comeback ${comeback}/${n}, streak5 ${streak3}/${n}`);
  return { w1, w2, draws, clean5, comeback, streak3, stuck };
}
const mHH = matchRun(30, 100, 'hard', 'hard', 'Hard vs Hard');
const mHE = matchRun(20, 431, 'hard', 'easy', 'Hard(p1) vs Easy(p2)');
const mEH = matchRun(20, 431, 'easy', 'hard', 'Easy(p1) vs Hard(p2) — cùng seed với trên');
const mEE = matchRun(10, 500, 'easy', 'easy', 'Easy vs Easy');
check('sim: không ván đấu nào bị kẹt', mHH.stuck + mHE.stuck + mEH.stuck + mEE.stuck === 0);
check('sim: đấu không lệch ghế quá lớn (trò đoán ô ~50/50 là đúng)', mHE.w1 >= 6 && mHE.w1 <= 14 && mEH.w2 >= 6 && mEH.w2 <= 14, `Hard thắng ${mHE.w1}/20 và ${mEH.w2}/20`);
const tot = 30 + 20 + 20 + 10;
const c5 = mHH.clean5 + mHE.clean5 + mEH.clean5 + mEE.clean5;
const cb = mHH.comeback + mHE.comeback + mEH.comeback + mEE.comeback;
const s3 = mHH.streak3 + mHE.streak3 + mEH.streak3 + mEE.streak3;
console.log(`  thành tựu đấu (gộp ${tot} ván): clean5 ${c5} (${Math.round(c5 / tot * 100)}%), comeback ${cb} (${Math.round(cb / tot * 100)}%), streak5 ${s3} (${Math.round(s3 / tot * 100)}%)`);
check('sim: dp-clean5 mở được nhưng không quá dễ', c5 > 0 && c5 / tot < 0.6, `clean5=${c5}/${tot}`);
check('sim: dp-comeback mở được nhưng không quá dễ', cb > 0 && cb / tot < 0.6, `comeback=${cb}/${tot}`);
check('sim: dp-streak5 mở được nhưng không quá dễ', s3 > 0 && s3 / tot < 0.6, `streak5=${s3}/${tot}`);

/* ---- 3. kỹ năng bot: đo bằng đối thủ CÓ THỂ ĐOÁN ĐƯỢC ---- */
/* 3a. thủ môn đọc thói quen: xạ thủ chỉ sút 'tl' */
function keeperSkill(n, seed0, keeperLevel) {
  let goals = 0, wins = 0, stuck = 0;
  for (let i = 0; i < n; i++) {
    const s = soloGame(seed0 + i, 'hard', keeperLevel);
    const r = driveScripted(s, fixedZone('tl'), botPick);
    if (!r.ok) { stuck++; continue; }
    goals += s.final.summary.p1.goals;
    if (s.winner === 'p1') wins++;
  }
  console.log(`  xạ thủ chỉ sút 'tl' vs thủ môn ${keeperLevel}: trung bình ${(goals / n).toFixed(2)} bàn/10 cú, thắng ${wins}/${n}`);
  return { goals, wins, stuck };
}
const kHard = keeperSkill(30, 1000, 'hard');
const kEasy = keeperSkill(30, 1000, 'easy');
check('sim: kỹ năng thủ môn không bị kẹt', kHard.stuck + kEasy.stuck === 0);
check('sim: thủ môn Hard bắt bài xạ thủ lặp ô (lọt lưới ít hơn Easy rõ rệt)', kHard.goals + 60 < kEasy.goals, `Hard lọt ${kHard.goals}, Easy lọt ${kEasy.goals} (30 ván)`);
check('sim: thủ môn Easy không bắt bài được xạ thủ lặp ô', kEasy.goals > 150, `Easy lọt ${kEasy.goals}/300 cú`);

/* 3b. xạ thủ khai thác thủ môn đoán được: thủ môn chỉ đổ 'mc' */
function shooterSkill(n, seed0, shooterLevel) {
  let goals = 0, wins = 0, stuck = 0;
  for (let i = 0; i < n; i++) {
    const s = soloGame(seed0 + i, shooterLevel, 'hard');
    const r = driveScripted(s, botPick, fixedZone('mc'));
    if (!r.ok) { stuck++; continue; }
    goals += s.final.summary.p1.goals;
    if (s.winner === 'p1') wins++;
  }
  console.log(`  thủ môn chỉ đổ 'mc' vs xạ thủ ${shooterLevel}: trung bình ${(goals / n).toFixed(2)} bàn/10 cú, thắng ${wins}/${n}`);
  return { goals, wins, stuck };
}
const shHard = shooterSkill(30, 2000, 'hard');
const shEasy = shooterSkill(30, 2000, 'easy');
check('sim: kỹ năng xạ thủ không bị kẹt', shHard.stuck + shEasy.stuck === 0);
check('sim: xạ thủ Hard ghi nhiều bàn hơn xạ thủ Easy trước thủ môn đoán được', shHard.goals >= shEasy.goals, `Hard ${shHard.goals}, Easy ${shEasy.goals} (30 ván)`);

/* 3c. trực tiếp botAction: thủ môn Hard đổ đúng ô xạ thủ hay sút */
function keeperReadTest() {
  const s = soloGame(3000, 'hard', 'hard');
  for (let i = 0; i < 5; i++) {
    const r1 = applyAction(s, 'p1', { type: 'pick', zone: 'tl' });
    const r2 = applyAction(s, 'p2', { type: 'pick', zone: 'br' });
    if (!r1.ok || !r2.ok || s.phase !== 'playing') return null;
  }
  let hardTl = 0, easyTl = 0;
  const N = 200;
  for (let i = 0; i < N; i++) {
    Math.random = mulberry32(5000 + i);
    const a = botAction(s, 'p2');
    if (a && a.zone === 'tl') hardTl++;
  }
  s.players[1].level = 'easy';
  for (let i = 0; i < N; i++) {
    Math.random = mulberry32(6000 + i);
    const a = botAction(s, 'p2');
    if (a && a.zone === 'tl') easyTl++;
  }
  console.log(`  thủ môn đọc lịch sử toàn 'tl' (200 lần): Hard đổ 'tl' ${hardTl} lần, Easy đổ 'tl' ${easyTl} lần`);
  return { hardTl, easyTl };
}
const kr = keeperReadTest();
check('sim: thủ môn Hard đọc thói quen (đổ đúng ô ≥80%)', kr && kr.hardTl >= 160, kr ? `Hard đổ 'tl' ${kr.hardTl}/200` : 'không dựng được trạng thái');
check('sim: thủ môn Easy gần như ngẫu nhiên (đổ đúng ô ≤25%)', kr && kr.easyTl <= 50, kr ? `Easy đổ 'tl' ${kr.easyTl}/200` : 'không dựng được trạng thái');

/* 3d. trực tiếp botAction: xạ thủ Hard tránh ô thủ môn hay đổ */
function shooterAvoidTest() {
  const s = soloGame(4000, 'hard', 'hard');
  for (let i = 0; i < 5; i++) {
    const r1 = applyAction(s, 'p1', { type: 'pick', zone: 'tl' });
    const r2 = applyAction(s, 'p2', { type: 'pick', zone: 'mc' });
    if (!r1.ok || !r2.ok || s.phase !== 'playing') return null;
  }
  let hardMc = 0, easyMc = 0;
  const N = 200;
  for (let i = 0; i < N; i++) {
    Math.random = mulberry32(7000 + i);
    const a = botAction(s, 'p1');
    if (a && a.zone === 'mc') hardMc++;
  }
  s.players[0].level = 'easy';
  for (let i = 0; i < N; i++) {
    Math.random = mulberry32(8000 + i);
    const a = botAction(s, 'p1');
    if (a && a.zone === 'mc') easyMc++;
  }
  console.log(`  xạ thủ tránh ô 'mc' (200 lần): Hard sút 'mc' ${hardMc} lần, Easy sút 'mc' ${easyMc} lần`);
  return { hardMc, easyMc };
}
const sa = shooterAvoidTest();
check('sim: xạ thủ Hard không bao giờ sút vào ô thủ môn hay đổ', sa && sa.hardMc === 0, sa ? `Hard sút 'mc' ${sa.hardMc}/200` : 'không dựng được trạng thái');
check('sim: xạ thủ Easy sút đều các ô (sút vào ô đó ~1/9)', sa && sa.easyMc >= 10 && sa.easyMc <= 40, sa ? `Easy sút 'mc' ${sa.easyMc}/200` : 'không dựng được trạng thái');

console.log(`\nĐá Penalty sim: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
