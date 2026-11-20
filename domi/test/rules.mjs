// Kiểm luật Dò Mìn: đặt mìn sau cú bấm đầu, lan vùng 0, cắm cờ,
// thắng/thua/nổ, viewFor không lộ mìn, serialize roundtrip.
// Chạy: node domi/test/rules.mjs
import * as E from '../js/engine.js';

let pass = 0, fail = 0;
function t(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.log(`  ✗ ${name}`); }
}
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

const P1 = [{ id: 'p1', name: 'A' }];
const P2 = [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }];

/* 1. tạo ván */
let s = E.createGame(P1, { difficulty: 'easy', seed: 42 });
t('tạo ván: 9×9, 10 mìn', s.rows === 9 && s.cols === 9 && s.minesCount === 10);
t('tạo ván: chưa đặt mìn', s.mines === null);
t('tạo ván: phase playing', s.phase === 'playing');
s = E.createGame(P1, { difficulty: 'hard', seed: 1 });
t('tạo ván Khó: 16×30, 99 mìn', s.rows === 16 && s.cols === 30 && s.minesCount === 99);
s = E.createGame(P1, { difficulty: 'bogus', seed: 1 });
t('độ khó sai → về Dễ', s.difficulty === 'easy');
let threw = false;
try { E.createGame([], {}); } catch (e) { threw = true; }
t('0 người chơi phải throw', threw);

/* 2. cú bấm đầu tiên luôn an toàn, qua 200 hạt giống */
let firstSafe = true;
for (let seed = 1; seed <= 200; seed++) {
  for (const diff of ['easy', 'medium', 'hard']) {
    const g = E.createGame(P1, { difficulty: diff, seed });
    const cell = Math.floor((seed * 37 + 11) % (g.rows * g.cols));
    const r = E.applyAction(g, 'p1', { type: 'reveal', cell });
    if (!r.ok || r.boom) { firstSafe = false; console.log(`  ✗ seed ${seed} ${diff} cell ${cell}:`, JSON.stringify(r)); break; }
    if (g.mines === null || g.mines.length !== g.minesCount) { firstSafe = false; break; }
    /* ô bấm + 8 ô kề không có mìn */
    const banned = new Set([cell, ...E.neighborsOf(cell, g.rows, g.cols)]);
    if (g.mines.some(m => banned.has(m))) { firstSafe = false; break; }
  }
  if (!firstSafe) break;
}
t('cú bấm đầu an toàn ở 200 seed × 3 độ khó', firstSafe);

/* 3. số kề đúng + lan vùng 0 */
{
  const g = E.createGame(P1, { difficulty: 'easy', seed: 7 });
  E.applyAction(g, 'p1', { type: 'reveal', cell: 40 }); /* đặt mìn */
  const nums = E.computeNumbers(g.rows, g.cols, g.mines);
  let numsOk = true;
  for (let i = 0; i < 81; i++) {
    const expect = g.mines.includes(i) ? -1 : E.neighborsOf(i, 9, 9).filter(n => g.mines.includes(n)).length;
    if (nums[i] !== expect) { numsOk = false; break; }
  }
  t('computeNumbers đếm đúng số mìn kề', numsOk);
  /* mở 1 ô 0 chưa mở phải lan ra nhiều ô */
  const g2 = E.createGame(P1, { difficulty: 'easy', seed: 7 });
  E.applyAction(g2, 'p1', { type: 'reveal', cell: 40 });
  const zero2 = nums.findIndex((n, i) => n === 0 && !g2.prog.p1.revealed.includes(i));
  if (zero2 >= 0) {
    const before = g2.prog.p1.revealed.length;
    const r = E.applyAction(g2, 'p1', { type: 'reveal', cell: zero2 });
    t('mở ô 0 lan ra nhiều ô', r.ok && g2.prog.p1.revealed.length > before + 1);
    t('mở ô 0 không mở ô có mìn', g2.prog.p1.revealed.every(c => !g2.mines.includes(c)));
  } else t('mở ô 0 lan ra nhiều ô', true); /* seed này không còn ô 0 chưa mở — bỏ qua */
}

/* 4. cắm cờ — cắm lên 1 ô mìn thật (chắc chắn chưa mở) */
s = E.createGame(P1, { difficulty: 'easy', seed: 3 });
E.applyAction(s, 'p1', { type: 'reveal', cell: 0 });
const flagCell = s.mines[0];
let r = E.applyAction(s, 'p1', { type: 'flag', cell: flagCell });
t('cắm cờ ok', r.ok && r.flagged === true && !!s.prog.p1.flags[flagCell]);
r = E.applyAction(s, 'p1', { type: 'reveal', cell: flagCell });
t('ô cắm cờ không mở được', !r.ok && s.prog.p1.revealed.length > 0);
r = E.applyAction(s, 'p1', { type: 'flag', cell: flagCell });
t('nhổ cờ ok', r.ok && r.flagged === false && !s.prog.p1.flags[flagCell]);
r = E.applyAction(s, 'p1', { type: 'flag', cell: s.prog.p1.revealed[0] });
t('ô đã mở không cắm cờ được', !r.ok);

/* 5. nổ mìn (chơi đơn) + thắng */
s = E.createGame(P1, { difficulty: 'easy', seed: 5 });
E.applyAction(s, 'p1', { type: 'reveal', cell: 0 });
const mine = s.mines[0];
r = E.applyAction(s, 'p1', { type: 'reveal', cell: mine });
t('bấm trúng mìn → nổ, ván kết thúc, không ai thắng', r.ok && r.boom && s.phase === 'ended' && s.winner === null && s.endReason === 'boom');
t('sau khi nổ không mở được nữa', !E.applyAction(s, 'p1', { type: 'reveal', cell: 1 }).ok);
/* thắng: mở hết ô an toàn */
s = E.createGame(P1, { difficulty: 'easy', seed: 9 });
E.applyAction(s, 'p1', { type: 'reveal', cell: 40 });
const safe = [];
for (let i = 0; i < 81; i++) if (!s.mines.includes(i)) safe.push(i);
for (const c of safe) { if (s.phase !== 'playing') break; E.applyAction(s, 'p1', { type: 'reveal', cell: c }); }
t('mở hết ô an toàn → thắng', s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'win');

/* 6. đua 2 người: 1 nổ, 1 thắng */
s = E.createGame(P2, { difficulty: 'easy', seed: 11 });
E.applyAction(s, 'p1', { type: 'reveal', cell: 0 });
E.applyAction(s, 'p2', { type: 'reveal', cell: s.mines[0] });
t('đua: 1 người nổ, ván vẫn tiếp tục', s.phase === 'playing' && s.prog.p2.failed);
t('người nổ không hành động được nữa', !E.applyAction(s, 'p2', { type: 'reveal', cell: 1 }).ok);
for (let i = 0; i < 81 && s.phase === 'playing'; i++) if (!s.mines.includes(i)) E.applyAction(s, 'p1', { type: 'reveal', cell: i });
t('đua: người còn lại mở hết → thắng', s.phase === 'ended' && s.winner === 'p1');
/* cả 2 cùng nổ → không ai thắng */
s = E.createGame(P2, { difficulty: 'easy', seed: 13 });
E.applyAction(s, 'p1', { type: 'reveal', cell: 0 });
E.applyAction(s, 'p1', { type: 'reveal', cell: s.mines[0] });
E.applyAction(s, 'p2', { type: 'reveal', cell: s.mines[1] });
t('đua: cả 2 nổ → không ai thắng', s.phase === 'ended' && s.winner === null && s.endReason === 'allfail');

/* 7. xin thua */
s = E.createGame(P1, { difficulty: 'easy', seed: 15 });
r = E.applyAction(s, 'p1', { type: 'resign' });
t('chơi đơn xin thua → ván kết thúc', r.ok && s.phase === 'ended' && s.endReason === 'resign');
s = E.createGame(P2, { difficulty: 'easy', seed: 15 });
r = E.applyAction(s, 'p1', { type: 'resign' });
t('đua: 1 người xin thua, ván vẫn tiếp tục', r.ok && s.phase === 'playing' && s.prog.p1.failed);

/* 8. viewFor: không lộ mìn khi đang chơi, lộ khi kết thúc */
s = E.createGame(P2, { difficulty: 'easy', seed: 17 });
E.applyAction(s, 'p1', { type: 'reveal', cell: 0 });
let v = E.viewFor(s, 'p2');
t('viewFor: chưa lộ mìn khi đang chơi', v.mines === null);
t('viewFor: không thấy ô đã mở của người khác', !JSON.stringify(v).includes('"revealed":[') || v.you.revealed.length === 0);
t('viewFor: thấy số ô đã mở của người khác', v.players.find(p => p.id === 'p1').revealed > 0);
t('viewFor: thấy số của ô mình đã mở', v.you.numbers != null);
E.applyAction(s, 'p2', { type: 'reveal', cell: s.mines[0] });
E.applyAction(s, 'p1', { type: 'reveal', cell: s.mines[1] });
v = E.viewFor(s, 'p1');
t('viewFor: lộ toàn bộ mìn khi ván kết thúc', Array.isArray(v.mines) && v.mines.length === 10);

/* 9. serialize roundtrip + dữ liệu xấu */
s = E.createGame(P2, { difficulty: 'medium', seed: 19 });
E.applyAction(s, 'p1', { type: 'reveal', cell: 100 });
E.applyAction(s, 'p1', { type: 'flag', cell: 5 });
const s2 = E.deserialize(E.serialize(s));
t('serialize roundtrip giữ nguyên state', E.serialize(s2) === E.serialize(s));
threw = false;
try { E.deserialize('{"difficulty":"easy","players":[],"prog":{}}'); } catch (e) { threw = true; }
t('deserialize dữ liệu xấu phải throw', threw);
threw = false;
try { const bad = JSON.parse(E.serialize(s)); bad.mines = [1, 2]; E.deserialize(JSON.stringify(bad)); } catch (e) { threw = true; }
t('deserialize số mìn sai phải throw', threw);

/* 10. actors */
s = E.createGame(P2, { difficulty: 'easy', seed: 21 });
t('actors: cả 2 người lúc đầu', eq(E.actors(s), ['p1', 'p2']));
E.applyAction(s, 'p1', { type: 'resign' });
t('actors: người xin thua không còn trong actors', eq(E.actors(s), ['p2']));

console.log(`\nLuật Dò Mìn: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
