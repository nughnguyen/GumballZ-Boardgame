// Luật Hanabi: bộ bài, chia bài, gợi ý, bỏ, đánh, ngòi nổ, vòng cuối,
// thắng/thua theo đội, xin thua, che thông tin, serialize.
import {
  createGame, applyAction, viewFor, actors, legalMoves,
  suitOf, rankOf, scoreOf, serialize, deserialize, mulberry32,
  MIN_PLAYERS, MAX_PLAYERS, WIN_SCORE, MAX_SCORE, START_CLUES, START_FUSES, SUITS,
} from '../js/engine.js';

/* gieo hạt cho Math.random để kết quả ổn định — seed: 20261119 */
const _rng = mulberry32(20261119);
Math.random = () => _rng();

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));
const pl = (s, pid) => s.players.find(x => x.id === pid);
/* đặt tay bài cho 1 người (kèm marks trống) — dùng để dựng tình huống */
function setHand(s, pid, cards) {
  const p = pl(s, pid);
  p.hand = cards.slice();
  p.marks = cards.map(() => ({ rank: null, suit: null }));
}
/* đi 1 lượt bằng nước hợp lệ đầu tiên (gợi ý nếu còn token, không thì bỏ) */
function driveTurn(s) {
  const pid = actors(s)[0];
  const moves = legalMoves(s, pid);
  const mv = moves.find(m => m.type === 'clue') || moves.find(m => m.type === 'discard') || moves[0];
  if (!mv) return false;
  const r = applyAction(s, pid, mv);
  if (!r.ok) { console.log('    đi lỗi', pid, JSON.stringify(mv), r.reason); return false; }
  return true;
}

/* ---------- 1. tạo ván: số người, cỡ tay, bộ bài ---------- */
{
  const s2 = createGame(P(['A', 'B']), { seed: 1 });
  t('ván 2 người: mỗi người 5 lá, bài còn 40', s2.players.every(p => p.hand.length === 5) && s2.deck.length === 40);
  const s3 = createGame(P(['A', 'B', 'C']), { seed: 1 });
  t('ván 3 người: mỗi người 5 lá, bài còn 35', s3.players.every(p => p.hand.length === 5) && s3.deck.length === 35);
  const s4 = createGame(P(['A', 'B', 'C', 'D']), { seed: 1 });
  t('ván 4 người: mỗi người 4 lá, bài còn 34', s4.players.every(p => p.hand.length === 4) && s4.deck.length === 34);
  const s5 = createGame(P(['A', 'B', 'C', 'D', 'E']), { seed: 1 });
  t('ván 5 người: mỗi người 4 lá, bài còn 30', s5.players.every(p => p.hand.length === 4) && s5.deck.length === 30);
  let threw1 = false, threw6 = false;
  try { createGame(P(['A']), { seed: 1 }); } catch (e) { threw1 = true; }
  try { createGame(P(['A', 'B', 'C', 'D', 'E', 'F']), { seed: 1 }); } catch (e) { threw6 = true; }
  t('1 người thì tạo ván lỗi', threw1);
  t('6 người thì tạo ván lỗi', threw6);
  t('MIN/MAX người là 2/5', MIN_PLAYERS === 2 && MAX_PLAYERS === 5);
  t('bắt đầu 8 token gợi ý, 3 ngòi nổ, 5 chồng đều 0', s2.clues === START_CLUES && s2.fuses === START_FUSES && SUITS.every(su => s2.stacks[su] === 0));
  t('lượt đầu là p1', actors(s2)[0] === 'p1');
}
{
  /* bộ bài đủ 50 lá, đúng số lượng từng số/màu */
  const s = createGame(P(['A', 'B']), { seed: 2 });
  const all = [...s.deck, ...s.players.flatMap(p => p.hand)];
  t('tổng cộng đúng 50 lá', all.length === 50);
  let compOk = true;
  for (const su of SUITS) {
    const cards = all.filter(c => suitOf(c) === su);
    if (cards.length !== 10) compOk = false;
    for (const [r, n] of [[1, 3], [2, 2], [3, 2], [4, 2], [5, 1]]) {
      if (cards.filter(c => rankOf(c) === r).length !== n) compOk = false;
    }
  }
  t('mỗi màu 10 lá: 1×3, 2×2, 3×2, 4×2, 5×1', compOk);
  t('ngưỡng thắng là 20/25', WIN_SCORE === 20 && MAX_SCORE === 25);
}

/* ---------- 2. gợi ý ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 3 });
  setHand(s, 'p2', ['r1-1', 'y2-1', 'r2-1', 'b5-1', 'w3-1']);
  const r1 = applyAction(s, 'p1', { type: 'clue', target: 'p2', kind: 'rank', value: 1 });
  t('gợi ý số 1 cho p2 được, tốn 1 token (còn 7)', r1.ok && s.clues === 7);
  t('gợi ý đánh dấu đúng lá có số 1 (r1-1)', pl(s, 'p2').marks[0].rank === 1);
  t('lá không khớp không bị đánh dấu', pl(s, 'p2').marks[1].rank === null && pl(s, 'p2').marks[2].rank === null);
  t('sau p1 gợi ý thì tới lượt p2', actors(s)[0] === 'p2');
  /* p2 gợi ý màu cho p3 */
  const p3ranks = [...new Set(pl(s, 'p3').hand.map(rankOf))];
  const r2 = applyAction(s, 'p2', { type: 'clue', target: 'p3', kind: 'suit', value: suitOf(pl(s, 'p3').hand[0]) });
  t('gợi ý màu cho p3 được', r2.ok && s.clues === 6);
  t('gợi ý màu đánh dấu đúng lá cùng màu', pl(s, 'p3').marks[0].suit === suitOf(pl(s, 'p3').hand[0]));
  t('gợi ý cho chính mình bị từ chối', !applyAction(s, 'p3', { type: 'clue', target: 'p3', kind: 'rank', value: 1 }).ok);
  t('gợi ý số không có trên tay người đó bị từ chối', !applyAction(s, 'p3', { type: 'clue', target: 'p1', kind: 'rank', value: 9 }).ok);
  t('chưa tới lượt thì gợi ý bị từ chối', !applyAction(s, 'p1', { type: 'clue', target: 'p2', kind: 'rank', value: 1 }).ok);
  s.clues = 0;
  t('hết token thì gợi ý bị từ chối', !applyAction(s, 'p3', { type: 'clue', target: 'p1', kind: 'rank', value: 1 }).ok);
}

/* ---------- 3. bỏ lá ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 4 });
  setHand(s, 'p1', ['r1-1', 'y2-1', 'g3-1', 'b4-1', 'w5-1']);
  s.clues = 7;
  const deckBefore = s.deck.length;
  const r = applyAction(s, 'p1', { type: 'discard', index: 0 });
  t('bỏ lá được, hồi 1 token (7→8), lá vào đống bỏ', r.ok && s.clues === 8 && s.discardPile.length === 1 && s.discardPile[0] === 'r1-1');
  t('bỏ xong rút 1 lá: tay vẫn 5 lá, bài giảm 1', pl(s, 'p1').hand.length === 5 && s.deck.length === deckBefore - 1);
  t('lá mới rút chưa có gợi ý nào', pl(s, 'p1').marks[4].rank === null && pl(s, 'p1').marks[4].suit === null);
  t('đang đủ 8 token thì bỏ lá bị từ chối', !applyAction(s, 'p2', { type: 'discard', index: 0 }).ok);
  t('bỏ lá ngoài tay bị từ chối', !applyAction(s, 'p2', { type: 'discard', index: 99 }).ok);
}

/* ---------- 4. đánh đúng ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 5 });
  setHand(s, 'p1', ['r1-1', 'y2-1', 'g3-1', 'b4-1', 'w5-1']);
  const r = applyAction(s, 'p1', { type: 'play', index: 0 });
  t('đánh Đỏ 1 khi chồng Đỏ 0 thì lên chồng, điểm 1', r.ok && s.stacks.r === 1 && scoreOf(s) === 1);
  t('đánh xong rút 1 lá: tay vẫn 5 lá', pl(s, 'p1').hand.length === 5);
  /* đánh lá 5 hồi token */
  s.stacks.r = 4; s.clues = 7;
  setHand(s, 'p2', ['r5-1', 'y1-1', 'g1-1', 'b1-1', 'w1-1']);
  const r2 = applyAction(s, 'p2', { type: 'play', index: 0 });
  t('đánh lá 5 hoàn thành chồng thì hồi 1 token (7→8)', r2.ok && s.stacks.r === 5 && s.clues === 8);
  t('đánh lá ngoài tay bị từ chối', !applyAction(s, 'p1', { type: 'play', index: 99 }).ok);
}

/* ---------- 5. đánh sai: mất ngòi, hết 3 ngòi thì thua ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 6 });
  setHand(s, 'p1', ['r2-1', 'y1-1', 'g1-1', 'b1-1', 'w1-1']);
  const r = applyAction(s, 'p1', { type: 'play', index: 0 });
  t('đánh Đỏ 2 khi chồng Đỏ 0 là sai: mất 1 ngòi (còn 2), lá vào đống bỏ', r.ok && s.fuses === 2 && s.discardPile[0] === 'r2-1' && s.stacks.r === 0);
  t('đánh sai không cộng điểm', scoreOf(s) === 0);
  /* 2 lần sai nữa thì hết ngòi → thua */
  setHand(s, 'p2', ['r3-1', 'y1-1', 'g1-1', 'b1-1', 'w1-1']);
  applyAction(s, 'p2', { type: 'play', index: 0 });
  t('sai lần 2 còn 1 ngòi, trận chưa kết thúc', s.fuses === 1 && s.phase === 'playing');
  setHand(s, 'p1', ['r4-1', 'y1-1', 'g1-1', 'b1-1', 'w1-1']);
  applyAction(s, 'p1', { type: 'play', index: 0 });
  t('sai lần 3 hết ngòi → trận kết thúc, cả đội thua', s.phase === 'ended' && s.fuses === 0 && !s.teamWin && s.endCause === 'fuses');
  t('thua thì losers là cả đội, winners rỗng', s.losers.length === 2 && s.winners.length === 0);
  t('trận đã kết thúc thì không đi tiếp được', !applyAction(s, 'p1', { type: 'play', index: 0 }).ok);
}

/* ---------- 6. vòng cuối: hết bài thì mỗi người còn 1 lượt ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 7 });
  s.deck = ['r1-1']; /* chỉ còn 1 lá */
  s.clues = 7;
  const r = applyAction(s, 'p1', { type: 'discard', index: 0 });
  t('rút lá cuối thì mở vòng cuối', r.ok && s.finalRound && s.deck.length === 0);
  const seq = [];
  let guard = 0;
  while (s.phase === 'playing' && guard++ < 10) {
    seq.push(actors(s)[0]);
    if (!driveTurn(s)) break;
  }
  t('vòng cuối: p2, p3, p1 mỗi người đúng 1 lượt nữa rồi kết thúc', s.phase === 'ended' && JSON.stringify(seq) === JSON.stringify(['p2', 'p3', 'p1']));
  t('kết thúc vì hết bài (endCause deck)', s.endCause === 'deck');
}

/* ---------- 7. đủ 25 điểm thì kết thúc ngay, cả đội thắng ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 8 });
  s.stacks = { r: 5, y: 5, g: 5, b: 5, w: 4 };
  setHand(s, 'p1', ['w5-1', 'y1-1', 'g1-1', 'b1-1', 'r1-1']);
  const r = applyAction(s, 'p1', { type: 'play', index: 0 });
  t('đánh lá cuối đủ 25 điểm thì kết thúc ngay', r.ok && s.phase === 'ended' && scoreOf(s) === 25);
  t('25 điểm: cả đội thắng, winners là cả đội', s.teamWin && s.winners.length === 2 && s.winner === 'p1' && s.endCause === 'perfect');
}

/* ---------- 8. ngưỡng thắng 20 điểm ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 9 });
  s.stacks = { r: 4, y: 4, g: 4, b: 4, w: 4 }; /* 20 điểm */
  s.deck = [];
  s.finalRound = true; s.finalTurnsLeft = 1;
  driveTurn(s);
  t('20 điểm khi hết bài: cả đội thắng', s.phase === 'ended' && s.teamWin && s.winners.length === 3);
  const s2 = createGame(P(['A', 'B', 'C']), { seed: 9 });
  s2.stacks = { r: 4, y: 4, g: 4, b: 4, w: 3 }; /* 19 điểm */
  s2.deck = [];
  s2.finalRound = true; s2.finalTurnsLeft = 1;
  driveTurn(s2);
  t('19 điểm khi hết bài: cả đội thua, losers là cả đội', s2.phase === 'ended' && !s2.teamWin && s2.losers.length === 3 && s2.winners.length === 0);
}

/* ---------- 9. xin thua kết thúc trận ngay, cả đội thua ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 10 });
  s.stacks = { r: 3, y: 3, g: 3, b: 3, w: 3 }; /* đang 15 điểm */
  const r = applyAction(s, 'p2', { type: 'resign' });
  t('p2 xin thua thì trận kết thúc ngay, lý do resign', r.ok && s.phase === 'ended' && s.endReason === 'resign');
  t('xin thua thì cả đội thua dù đang 15 điểm', !s.teamWin && s.losers.length === 3);
}

/* ---------- 10. legalMoves ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 11 });
  const m1 = legalMoves(s, 'p1');
  const clues1 = m1.filter(m => m.type === 'clue').length;
  const plays1 = m1.filter(m => m.type === 'play').length;
  const discs1 = m1.filter(m => m.type === 'discard').length;
  t('đang đủ 8 token: có nước gợi ý + 5 nước đánh, không có nước bỏ', clues1 > 0 && plays1 === 5 && discs1 === 0);
  t('người chưa tới lượt không có nước nào', legalMoves(s, 'p2').length === 0);
  /* gợi ý 1 lần (còn 7 token) thì có nước bỏ (3 người → 5 lá) */
  const mv = m1.find(m => m.type === 'clue');
  applyAction(s, 'p1', mv);
  const m2 = legalMoves(s, 'p2');
  t('còn 7 token thì có nước bỏ (5 lá)', m2.filter(m => m.type === 'discard').length === 5);
  /* hết token thì không còn nước gợi ý */
  s.clues = 0;
  const m3 = legalMoves(s, 'p2');
  t('hết token thì không còn nước gợi ý', m3.filter(m => m.type === 'clue').length === 0 && m3.filter(m => m.type === 'discard').length === 5);
}

/* ---------- 11. viewFor che thông tin ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 12 });
  setHand(s, 'p1', ['r1-1', 'y2-1', 'g3-1', 'b4-1', 'w5-1']);
  setHand(s, 'p2', ['r2-1', 'y1-1', 'g1-1', 'b1-1', 'w1-1']);
  const v1 = viewFor(s, 'p1');
  const me = v1.players.find(p => p.id === 'p1');
  const p2v = v1.players.find(p => p.id === 'p2');
  t('bài của mình chỉ thấy mặt úp (id null, back true)', me.hand.every(c => c.back && c.id === null) && me.hand.length === 5);
  t('bài người khác thấy hết lá', p2v.hand.length === 5 && p2v.hand[0].id === 'r2-1' && !p2v.hand[0].back);
  t('view không có trường you', !('you' in v1));
  t('view có stacks, clues, fuses, deckCount', v1.stacks.r === 0 && v1.clues === 8 && v1.fuses === 3 && v1.deckCount === 35);
  /* p1 gợi ý trước (tới lượt p1), rồi p2 gợi ý số 1 cho p1 */
  applyAction(s, 'p1', { type: 'clue', target: 'p2', kind: 'rank', value: 1 });
  applyAction(s, 'p2', { type: 'clue', target: 'p1', kind: 'rank', value: 1 });
  const v2 = viewFor(s, 'p1');
  const me2 = v2.players.find(p => p.id === 'p1');
  t('sau khi được gợi ý số 1, mình thấy lá đó đã biết số 1', me2.hand[0].rank === 1);
  t('lá khác của mình vẫn chưa biết gì', me2.hand[1].rank === null && me2.hand[1].suit === null);
  /* trận kết thúc thì lộ hết bài */
  applyAction(s, 'p3', { type: 'resign' });
  const v3 = viewFor(s, 'p1');
  t('trận kết thúc thì bài mình lộ hết', v3.players.find(p => p.id === 'p1').hand.every(c => !c.back && c.id !== null));
}

/* ---------- 12. serialize ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 13 });
  driveTurn(s); driveTurn(s);
  const back = deserialize(serialize(s));
  t('serialize rồi deserialize thì giống hệt', JSON.stringify(back) === JSON.stringify(s));
  let bad1 = false, bad2 = false;
  try { deserialize('rác'); } catch (e) { bad1 = true; }
  try { deserialize('{}'); } catch (e) { bad2 = true; }
  t('deserialize chuỗi rác thì throw', bad1);
  t('deserialize state thiếu trường thì throw', bad2);
}

/* ---------- 13. thứ tự lượt + marks sau khi rút ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 14 });
  t('lượt đi p1 → p2 → p3 → p1', actors(s)[0] === 'p1' && (driveTurn(s), actors(s)[0] === 'p2') && (driveTurn(s), actors(s)[0] === 'p3') && (driveTurn(s), actors(s)[0] === 'p1'));
  /* marks của lá còn lại giữ nguyên sau khi đánh 1 lá khác */
  const s2 = createGame(P(['A', 'B']), { seed: 15 });
  setHand(s2, 'p1', ['r1-1', 'y2-1', 'g3-1', 'b4-1', 'w5-1']);
  pl(s2, 'p1').marks[1] = { rank: 2, suit: null };
  pl(s2, 'p1').marks[3] = { rank: null, suit: 'b' };
  applyAction(s2, 'p1', { type: 'play', index: 0 }); /* đánh r1-1 */
  t('sau khi đánh lá 0, marks của lá cũ số 2 dồn về đúng vị trí', pl(s2, 'p1').marks[0].rank === 2);
  t('marks màu xanh dương của lá cũ còn nguyên', pl(s2, 'p1').marks[2].suit === 'b');
}

console.log(`\nLuật Hanabi: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
