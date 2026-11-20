// Luật Skull: chia đĩa, đặt, ra giá, lật, điểm, mất đĩa, bị loại,
// xin thua, che thông tin, serialize.
import {
  createGame, applyAction, viewFor, actors, legalMoves,
  isSkull, isRose, POINTS_TO_WIN, serialize, deserialize, mulberry32,
} from '../js/engine.js';

/* gieo hạt cho Math.random để kết quả ổn định — seed: 20261119 */
const _rng = mulberry32(20261119);
Math.random = () => _rng();

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));
const pl = (s, pid) => s.players.find(x => x.id === pid);

/* 1 vòng thắng cho pid: mọi người đặt hoa, pid thắng giá rồi lật toàn hoa */
function winRoundFor(s, pid) {
  let guard = 0;
  while (s.phase === 'playing' && s.stage === 'place' && guard++ < 20) {
    const cur = actors(s)[0];
    const p = pl(s, cur);
    const rose = p.hand.find(isRose);
    const r = applyAction(s, cur, { type: 'place', card: rose || p.hand[0] });
    if (!r.ok) { console.log('    đặt lỗi', r.reason); return false; }
  }
  guard = 0;
  while (s.phase === 'playing' && s.stage === 'bid' && guard++ < 20) {
    const cur = actors(s)[0];
    if (cur === pid) {
      const r = applyAction(s, cur, { type: 'bid', amount: s.bid.amount + 1 });
      if (!r.ok) { console.log('    ra giá lỗi', r.reason); return false; }
    } else {
      const r = applyAction(s, cur, { type: 'pass' });
      if (!r.ok) {
        const r2 = applyAction(s, cur, { type: 'bid', amount: 1 });
        if (!r2.ok) { console.log('    mở giá lỗi', r2.reason); return false; }
      }
    }
  }
  guard = 0;
  while (s.phase === 'playing' && s.stage === 'flip' && guard++ < 20) {
    const cur = actors(s)[0];
    const f = s.flip;
    const target = f.flipped.length === 0
      ? cur
      : s.players.find(x => x.id !== cur && x.placed.length).id;
    const r = applyAction(s, cur, { type: 'flip', target });
    if (!r.ok) { console.log('    lật lỗi', r.reason); return false; }
  }
  return true;
}
/* đặt 1 vòng theo danh sách [pid, card] rồi trả về state */
function placeAll(s, list) {
  for (const [pid, card] of list) {
    const r = applyAction(s, pid, { type: 'place', card });
    if (!r.ok) { console.log('    đặt lỗi', pid, card, r.reason); return false; }
  }
  return true;
}

/* ---------- 1. tạo ván ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 1 });
  t('ván 3 người tạo được, giai đoạn đặt, lượt đầu là p1', s.stage === 'place' && actors(s)[0] === 'p1');
  t('mỗi người có 3 hoa + 1 đầu lâu', s.players.every(p => p.hand.filter(isRose).length === 3 && p.hand.filter(isSkull).length === 1));
  t('mọi người 0 điểm, còn sống', s.players.every(p => p.points === 0 && p.alive));
  t('cần 2 điểm để thắng trận', POINTS_TO_WIN === 2);
  let threw2 = false, threw7 = false;
  try { createGame(P(['A', 'B']), { seed: 1 }); } catch (e) { threw2 = true; }
  try { createGame(P(['A', 'B', 'C', 'D', 'E', 'F', 'G']), { seed: 1 }); } catch (e) { threw7 = true; }
  t('2 người thì tạo ván lỗi', threw2);
  t('7 người thì tạo ván lỗi', threw7);
  const s6 = createGame(P(['A', 'B', 'C', 'D', 'E', 'F']), { seed: 1 });
  t('ván 6 người tạo được', s6.players.length === 6);
}

/* ---------- 2. giai đoạn đặt ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 2 });
  t('chưa tới lượt thì đặt bị từ chối', !applyAction(s, 'p2', { type: 'place', card: 'rose-1' }).ok);
  t('đặt đĩa không có trên tay bị từ chối', !applyAction(s, 'p1', { type: 'place', card: 'rose-9' }).ok);
  const r1 = applyAction(s, 'p1', { type: 'place', card: 'rose-1' });
  t('p1 đặt hoa được', r1.ok && pl(s, 'p1').placed[0] === 'rose-1' && pl(s, 'p1').hand.length === 3);
  t('sau p1 đặt thì tới lượt p2', actors(s)[0] === 'p2');
  applyAction(s, 'p2', { type: 'place', card: 'skull-1' });
  applyAction(s, 'p3', { type: 'place', card: 'rose-2' });
  t('mọi người đặt xong thì sang giai đoạn ra giá', s.stage === 'bid');
  t('người sau người đặt cuối (p1) ra giá trước', actors(s)[0] === 'p1');
  t('tổng đĩa trên bàn là 3', s.players.reduce((t, p) => t + p.placed.length, 0) === 3);
}

/* ---------- 3. giai đoạn ra giá ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 3 });
  placeAll(s, [['p1', 'rose-1'], ['p2', 'rose-1'], ['p3', 'rose-1']]);
  t('chưa có giá thì không được bỏ giá', !applyAction(s, 'p1', { type: 'pass' }).ok);
  t('ra giá 0 bị từ chối', !applyAction(s, 'p1', { type: 'bid', amount: 0 }).ok);
  t('ra giá quá số đĩa trên bàn bị từ chối', !applyAction(s, 'p1', { type: 'bid', amount: 4 }).ok);
  t('p1 ra giá 1 được', applyAction(s, 'p1', { type: 'bid', amount: 1 }).ok);
  t('ra giá không cao hơn giá trước bị từ chối', !applyAction(s, 'p2', { type: 'bid', amount: 1 }).ok);
  t('p2 bỏ giá được, tới lượt p3', applyAction(s, 'p2', { type: 'pass' }).ok && actors(s)[0] === 'p3');
  t('p3 bỏ giá thì p1 thắng giá 1, sang giai đoạn lật', applyAction(s, 'p3', { type: 'pass' }).ok && s.stage === 'flip' && s.flip.bidder === 'p1' && s.flip.target === 1);
}
{
  /* ra giá tối đa thì thắng giá ngay */
  const s = createGame(P(['A', 'B', 'C']), { seed: 4 });
  placeAll(s, [['p1', 'rose-1'], ['p2', 'rose-1'], ['p3', 'rose-1']]);
  t('ra giá bằng tổng đĩa trên bàn thì thắng giá ngay', applyAction(s, 'p1', { type: 'bid', amount: 3 }).ok && s.stage === 'flip' && s.flip.bidder === 'p1' && s.flip.target === 3);
}

/* ---------- 4. giai đoạn lật: toàn hoa thì +1 điểm ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 5 });
  placeAll(s, [['p1', 'rose-1'], ['p2', 'rose-1'], ['p3', 'rose-1']]);
  applyAction(s, 'p1', { type: 'bid', amount: 1 });
  applyAction(s, 'p2', { type: 'pass' });
  applyAction(s, 'p3', { type: 'pass' });
  t('lượt lật đầu tiên phải là đĩa của chính mình', !applyAction(s, 'p1', { type: 'flip', target: 'p2' }).ok);
  t('người không thắng giá thì không được lật', !applyAction(s, 'p2', { type: 'flip', target: 'p2' }).ok);
  const r = applyAction(s, 'p1', { type: 'flip', target: 'p1' });
  t('lật đĩa mình (hoa) được, đủ số đĩa thì +1 điểm', r.ok && pl(s, 'p1').points === 1);
  t('sau vòng thắng thì sang vòng 2, giai đoạn đặt', s.round === 2 && s.stage === 'place');
  t('đĩa đã đặt trả về tay (p1 đủ 4 đĩa)', pl(s, 'p1').hand.length === 4);
  t('vòng 2 xoay ghế: người mở vòng là p2', actors(s)[0] === 'p2');
}

/* ---------- 5. gặp đầu lâu thì mất 1 đĩa (ngẫu nhiên có hạt) ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 6 });
  placeAll(s, [['p1', 'skull-1'], ['p2', 'rose-1'], ['p3', 'rose-1']]);
  applyAction(s, 'p1', { type: 'bid', amount: 1 });
  applyAction(s, 'p2', { type: 'pass' });
  applyAction(s, 'p3', { type: 'pass' });
  const r = applyAction(s, 'p1', { type: 'flip', target: 'p1' });
  t('lật trúng đầu lâu thì 0 điểm, mất 1 đĩa, còn 3 đĩa', r.ok && pl(s, 'p1').points === 0 && pl(s, 'p1').lost.length === 1 && pl(s, 'p1').hand.length === 3);
  t('sau vòng thua thì sang vòng 2', s.round === 2 && s.stage === 'place');
  /* cùng seed + cùng nước đi thì mất đúng đĩa đó */
  const a = createGame(P(['A', 'B', 'C']), { seed: 6 });
  placeAll(a, [['p1', 'skull-1'], ['p2', 'rose-1'], ['p3', 'rose-1']]);
  applyAction(a, 'p1', { type: 'bid', amount: 1 });
  applyAction(a, 'p2', { type: 'pass' });
  applyAction(a, 'p3', { type: 'pass' });
  applyAction(a, 'p1', { type: 'flip', target: 'p1' });
  t('cùng seed thì mất đúng 1 đĩa như nhau', pl(a, 'p1').lost[0] === pl(s, 'p1').lost[0]);
}

/* ---------- 6. lật nhiều đĩa toàn hoa; thảm hết đĩa thì không lật được ---------- */
{
  const s = createGame(P(['A', 'B', 'C', 'D']), { seed: 7 });
  placeAll(s, [['p1', 'rose-1'], ['p2', 'rose-1'], ['p3', 'rose-1'], ['p4', 'rose-1']]);
  applyAction(s, 'p1', { type: 'bid', amount: 3 });
  applyAction(s, 'p2', { type: 'pass' });
  applyAction(s, 'p3', { type: 'pass' });
  applyAction(s, 'p4', { type: 'pass' });
  applyAction(s, 'p1', { type: 'flip', target: 'p1' });
  t('lật 1/3 đĩa hoa thì vòng chưa kết thúc', s.stage === 'flip' && s.flip.flipped.length === 1);
  applyAction(s, 'p1', { type: 'flip', target: 'p2' });
  t('lật thảm đã hết đĩa bị từ chối', !applyAction(s, 'p1', { type: 'flip', target: 'p1' }).ok && s.stage === 'flip');
  const r = applyAction(s, 'p1', { type: 'flip', target: 'p3' });
  t('lật đủ 3 đĩa hoa thì +1 điểm', r.ok && pl(s, 'p1').points === 1);
}

/* ---------- 7. 2 điểm thì thắng trận ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 8 });
  t('vòng 1 thắng cho p1', winRoundFor(s, 'p1') && pl(s, 'p1').points === 1);
  t('vòng 2 thắng cho p1 nữa thì đủ 2 điểm, trận kết thúc', winRoundFor(s, 'p1') && s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'match');
  t('người thua nằm trong losers', s.losers.includes('p2') && s.losers.includes('p3'));
  t('trận đã kết thúc thì không đi tiếp được', !applyAction(s, 'p1', { type: 'place', card: 'rose-1' }).ok);
}

/* ---------- 8. bị loại khi mất hết đĩa; chỉ còn 1 người thì thắng ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 9 });
  /* p3 chỉ còn đúng 1 đĩa là đầu lâu */
  pl(s, 'p3').hand = ['skull-1'];
  placeAll(s, [['p1', 'rose-1'], ['p2', 'rose-1'], ['p3', 'skull-1']]);
  applyAction(s, 'p1', { type: 'bid', amount: 1 });
  applyAction(s, 'p2', { type: 'pass' });
  applyAction(s, 'p3', { type: 'bid', amount: 2 });
  applyAction(s, 'p1', { type: 'pass' });
  t('p3 thắng giá 2', s.stage === 'flip' && s.flip.bidder === 'p3');
  applyAction(s, 'p3', { type: 'flip', target: 'p3' });
  t('p3 lật trúng đầu lâu cuối cùng thì bị loại', !pl(s, 'p3').alive && pl(s, 'p3').hand.length === 0);
  t('trận vẫn tiếp tục với 2 người', s.phase === 'playing');
  /* vòng 2: p2 cũng chỉ còn đầu lâu, tới lượt p2 mở vòng */
  pl(s, 'p2').hand = ['skull-1'];
  /* vòng 2 mở ở p2 (xoay ghế sau p1) */
  const first2 = actors(s)[0];
  t('vòng 2 bắt đầu ở p2', first2 === 'p2');
  applyAction(s, 'p2', { type: 'place', card: 'skull-1' });
  applyAction(s, 'p1', { type: 'place', card: 'rose-1' });
  applyAction(s, 'p2', { type: 'bid', amount: 1 });
  applyAction(s, 'p1', { type: 'pass' });
  applyAction(s, 'p2', { type: 'flip', target: 'p2' });
  t('p2 mất đĩa cuối thì bị loại, chỉ còn p1 nên p1 thắng trận', s.phase === 'ended' && s.winner === 'p1' && !pl(s, 'p2').alive);
}

/* ---------- 9. xin thua kết thúc trận ngay ---------- */
{
  const s = createGame(P(['A', 'B', 'C', 'D']), { seed: 10 });
  winRoundFor(s, 'p1');
  t('p1 đang có 1 điểm', pl(s, 'p1').points === 1);
  const r = applyAction(s, 'p2', { type: 'resign' });
  t('p2 xin thua thì trận kết thúc ngay, người nhiều điểm nhất (p1) thắng', r.ok && s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'resign');
}
{
  /* hòa điểm thì ghế sớm hơn thắng */
  const s = createGame(P(['A', 'B', 'C']), { seed: 11 });
  const r = applyAction(s, 'p3', { type: 'resign' });
  t('hòa 0 điểm thì ghế sớm nhất (p1) thắng khi p3 xin thua', r.ok && s.winner === 'p1');
}

/* ---------- 10. legalMoves ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 12 });
  const m1 = legalMoves(s, 'p1');
  t('giai đoạn đặt: người tới lượt có 4 nước (4 đĩa)', m1.length === 4 && m1.every(m => m.type === 'place'));
  t('giai đoạn đặt: người chưa tới lượt không có nước nào', legalMoves(s, 'p2').length === 0);
  placeAll(s, [['p1', 'rose-1'], ['p2', 'rose-1'], ['p3', 'rose-1']]);
  const m2 = legalMoves(s, 'p1');
  t('giai đoạn ra giá (chưa có giá): chỉ có 3 nước ra giá 1–3, không có bỏ giá', m2.length === 3 && m2.every(m => m.type === 'bid'));
  applyAction(s, 'p1', { type: 'bid', amount: 1 });
  const m3 = legalMoves(s, 'p2');
  t('đã có giá 1: p2 có ra giá 2, 3 + bỏ giá', m3.length === 3 && m3.some(m => m.type === 'pass') && m3.some(m => m.type === 'bid' && m.amount === 3));
  applyAction(s, 'p2', { type: 'pass' });
  applyAction(s, 'p3', { type: 'pass' });
  const m4 = legalMoves(s, 'p1');
  t('giai đoạn lật: lượt đầu chỉ có lật đĩa mình', m4.length === 1 && m4[0].type === 'flip' && m4[0].target === 'p1');
  applyAction(s, 'p1', { type: 'flip', target: 'p1' });
}

/* ---------- 11. viewFor che thông tin ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 13 });
  placeAll(s, [['p1', 'rose-1'], ['p2', 'skull-1'], ['p3', 'rose-2']]);
  const v1 = viewFor(s, 'p1');
  const p2v = v1.players.find(p => p.id === 'p2');
  t('người khác không thấy tay bài của nhau (đã đặt 1 đĩa nên còn 3)', p2v.hand.length === 0 && p2v.handCount === 3);
  t('đĩa đã đặt của người khác chỉ thấy mặt úp', p2v.placed.length === 1 && p2v.placed[0] === 'back');
  t('mình thấy đĩa mình đã đặt là đĩa nào', v1.players.find(p => p.id === 'p1').placed[0] === 'rose-1');
  t('mình thấy tay bài của mình', v1.players.find(p => p.id === 'p1').hand.length === 3);
  t('view không có trường you', !('you' in v1));
  /* đĩa đã lật là công khai: ra giá 2, lật 1 đĩa hoa thì vòng chưa xong */
  applyAction(s, 'p1', { type: 'bid', amount: 2 });
  applyAction(s, 'p2', { type: 'pass' });
  applyAction(s, 'p3', { type: 'pass' });
  applyAction(s, 'p1', { type: 'flip', target: 'p1' });
  const v2 = viewFor(s, 'p2');
  t('đĩa đã lật thì mọi người đều thấy (hoa của p1)', v2.flip && v2.flip.flipped.length === 1 && v2.flip.flipped[0].card === 'rose-1' && v2.flip.flipped[0].pid === 'p1');
}

/* ---------- 12. serialize ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 14 });
  placeAll(s, [['p1', 'rose-1'], ['p2', 'rose-1'], ['p3', 'rose-1']]);
  const back = deserialize(serialize(s));
  t('serialize rồi deserialize thì giống hệt', JSON.stringify(back) === JSON.stringify(s));
  let bad1 = false, bad2 = false;
  try { deserialize('rác'); } catch (e) { bad1 = true; }
  try { deserialize('{}'); } catch (e) { bad2 = true; }
  t('deserialize chuỗi rác thì throw', bad1);
  t('deserialize state thiếu trường thì throw', bad2);
}

console.log(`\nLuật Skull: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
