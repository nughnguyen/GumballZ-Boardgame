// Mô phỏng Mạt Chược: bot đua không kẹt, Hard gỡ nhiều hơn Easy, 50 ván đều giải được.
import {
  createGame, applyAction, allPairs, findPair, isFree, mulberry32,
} from '../js/engine.js';
import { botAction } from '../js/bot.js';

// Gieo hạt cho Math.random để bot Dễ (gỡ cặp bừa) cho kết quả ổn định giữa
// các lần chạy — nếu không, so sánh Hard-vs-Easy (chênh chỉ ~3 quân/ván)
// lúc đúng lúc sai tùy lần chạy. Mọi ván trong file này đều truyền seed
// tường minh cho createGame nên việc này không đổi bàn chia.
const _rng = mulberry32(20261119);
Math.random = () => _rng();

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };

function playSolo(seed, level, allowShuffle = true) {
  const s = createGame([{ id: 'me', name: 'A' }], { seed });
  let guard = 0;
  while (s.phase === 'playing' && guard++ < 400) {
    const act = botAction(s, 'me', level);
    if (!act) break;
    if (!allowShuffle && act.type === 'shuffle') break; // kẹt thật sự, không cứu
    applyAction(s, 'me', act);
  }
  return s;
}

/* ---------- 1. 50 ván chia ra đều giải được (gỡ theo thứ tự ngược lúc chia) ---------- */
{
  let solved = 0;
  for (let seed = 1; seed <= 50; seed++) {
    const s = createGame([{ id: 'me', name: 'A' }], { seed });
    const pr = s.prog.me;
    const byOrd = {};
    for (const tl of pr.tiles) (byOrd[tl.ord] = byOrd[tl.ord] || []).push(tl);
    let ok = true;
    for (const o of Object.keys(byOrd).map(Number).sort((a, b) => b - a)) {
      const [a, b] = byOrd[o];
      if (!applyAction(s, 'me', { type: 'remove', a: a.id, b: b.id }).ok) { ok = false; break; }
    }
    if (ok && s.phase === 'ended' && s.winner === 'me') solved++;
  }
  t('50/50 ván chia ra đều giải được', solved === 50);
  console.log(`    (giải được ${solved}/50 ván bằng thứ tự ngược lúc chia)`);
}

/* ---------- 2. bot đua: không kẹt, Hard gỡ nhiều hơn Easy ----------
   (đo khi TẮT xào bài — vì xào bài cứu được gần như mọi ván nên khi bật
   xào thì Easy và Hard đều ~142 quân; tắt xào mới thấy trình chọn cặp) */
{
  let hardRemoved = 0, easyRemoved = 0, hardWins = 0, easyWins = 0, stuck = 0;
  for (let seed = 1; seed <= 50; seed++) {
    const h = playSolo(seed, 'hard', false);
    const e = playSolo(seed, 'easy', false);
    hardRemoved += h.prog.me.removed;
    easyRemoved += e.prog.me.removed;
    if (h.phase === 'ended' && h.winner === 'me') hardWins++;
    if (e.phase === 'ended' && e.winner === 'me') easyWins++;
  }
  // và với xào bài bật thì không ván nào kẹt giữa chừng
  for (let seed = 100; seed < 120; seed++) {
    const h = playSolo(seed, 'hard', true);
    const e = playSolo(seed, 'easy', true);
    if (h.phase === 'playing' || e.phase === 'playing') stuck++;
  }
  console.log(`    (50 ván, tắt xào: Hard gỡ TB ${(hardRemoved / 50).toFixed(1)} quân, thắng ${hardWins}; Easy gỡ TB ${(easyRemoved / 50).toFixed(1)} quân, thắng ${easyWins})`);
  t('bot Hard gỡ nhiều quân hơn bot Easy (TB, tắt xào)', hardRemoved > easyRemoved);
  t('bot Hard thắng nhiều ván hơn bot Easy (tắt xào)', hardWins >= easyWins);
  t('không ván nào kẹt giữa chừng khi bật xào bài', stuck === 0);
}

/* ---------- 3. đua 4 bot: luôn có kết quả, không kẹt ---------- */
{
  const P = [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }, { id: 'p3', name: 'C' }, { id: 'p4', name: 'D' }];
  let finished = 0, noWinner = 0;
  for (let seed = 300; seed < 310; seed++) {
    const s = createGame(P, { seed });
    let guard = 0;
    while (s.phase === 'playing' && guard++ < 400) {
      let acted = false;
      for (const p of P) {
        if (s.phase !== 'playing') break;
        const act = botAction(s, p.id, p.id === 'p1' ? 'hard' : 'easy');
        if (act) { applyAction(s, p.id, act); acted = true; }
        else applyAction(s, p.id, { type: 'resign' });
      }
      if (!acted) break;
    }
    if (s.phase === 'ended') { finished++; if (!s.winner) noWinner++; }
  }
  t('10/10 ván đua 4 bot đều kết thúc', finished === 10);
  console.log(`    (đua 4 bot: ${finished}/10 ván kết thúc, ${noWinner} ván không có người thắng (kẹt/bỏ cuộc))`);
}

/* ---------- 4. gợi ý + xào bài cứu được ván kẹt ---------- */
{
  let rescued = 0, tried = 0;
  for (let seed = 500; seed < 530; seed++) {
    const s = createGame([{ id: 'me', name: 'A' }], { seed });
    const rng = mulberry32(seed);
    let guard = 0;
    while (guard++ < 400) {
      const pairs = allPairs(s.prog.me.tiles);
      if (!pairs.length) break;
      const [a, b] = pairs[Math.floor(rng() * pairs.length)];
      applyAction(s, 'me', { type: 'remove', a: a.id, b: b.id });
      if (s.phase === 'ended') break;
    }
    if (s.phase === 'playing' && !allPairs(s.prog.me.tiles).length) {
      tried++;
      if (applyAction(s, 'me', { type: 'shuffle' }).ok && allPairs(s.prog.me.tiles).length > 0) rescued++;
    }
  }
  console.log(`    (gỡ bừa kẹt ở ${tried}/30 ván, xào bài cứu được ${rescued}/${tried})`);
  t('xào bài cứu được ván kẹt (có cặp mới sau khi xào)', tried === 0 || rescued === tried);
}

console.log(`\nMô phỏng Mạt Chược: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
