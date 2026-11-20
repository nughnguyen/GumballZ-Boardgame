// Luật Love Letter: 8 hiệu ứng lá, vòng/trận, viewFor, serialize.
import {
  createGame, applyAction, viewFor, serialize, deserialize, actors,
  legalCards, CARD_INFO, DECK_SPEC, TOKEN_TARGET,
} from '../js/engine.js';

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = (n, names) => names.slice(0, n).map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));
/* ván 4 người với tay bài + bộ bài ép sẵn; lượt của p1 */
function rigged(hands, deck = ['guard-0', 'guard-1', 'guard-2', 'guard-3', 'guard-4'], turn = 'p1') {
  const s = createGame(P(4, ['A', 'B', 'C', 'D']), { seed: 42 });
  s.players.forEach((p, i) => { p.hand = hands[i] ? hands[i].slice() : []; p.discards = []; p.alive = true; p.protected = false; p.peeks = {}; });
  s.deck = deck.slice();
  s.turn = turn;
  s.setAside = 'princess-0';
  s.faceUp = [];
  return s;
}
const kindOf = id => id.slice(0, id.lastIndexOf('-'));

/* ---------- 1. tạo ván ---------- */
{
  let threw = false;
  try { createGame(P(1, ['A'])); } catch (e) { threw = true; }
  t('tạo ván 1 người thì throw', threw);
  threw = false;
  try { createGame(P(5, ['A', 'B', 'C', 'D', 'E'])); } catch (e) { threw = true; }
  t('tạo ván 5 người thì throw', threw);
  const counts = {};
  for (const [k, n] of DECK_SPEC) counts[k] = n;
  t('bộ bài đủ 16 lá đúng tỉ lệ', DECK_SPEC.reduce((a, [, n]) => a + n, 0) === 16 && counts.guard === 5 && counts.princess === 1 && counts.king === 1);
  const s2 = createGame(P(2, ['A', 'B']), { seed: 7 });
  t('2 người: úp 1 lá + lật 3 lá ngửa', !!s2.setAside && s2.faceUp.length === 3);
  const s4 = createGame(P(4, ['A', 'B', 'C', 'D']), { seed: 7 });
  t('4 người: úp 1 lá, không lá ngửa', !!s4.setAside && s4.faceUp.length === 0);
  t('người đi đầu cầm 2 lá, người khác 1 lá', s4.players.find(p => p.id === s4.turn).hand.length === 2 && s4.players.filter(p => p.id !== s4.turn).every(p => p.hand.length === 1));
  t('mục tiêu dấu: 2 người 7, 3 người 5, 4 người 4',
    createGame(P(2, ['A', 'B']), { seed: 1 }).target === 7
    && createGame(P(3, ['A', 'B', 'C']), { seed: 1 }).target === 5
    && createGame(P(4, ['A', 'B', 'C', 'D']), { seed: 1 }).target === 4);
  t('actors() chỉ có người tới lượt', JSON.stringify(actors(s4)) === JSON.stringify([s4.turn]));
}

/* ---------- 2. Vệ binh ---------- */
{
  const s = rigged([['guard-0', 'priest-0'], ['king-0'], ['baron-0'], ['handmaid-0']]);
  const r = applyAction(s, 'p1', { type: 'play', card: 'guard-0', target: 'p2', guess: 6 });
  t('Vệ binh đoán đúng (Quốc vương 6) thì loại', r.ok && !s.players[1].alive && s.players[1].discards.includes('king-0'));
  const s2 = rigged([['guard-0', 'priest-0'], ['king-0'], ['baron-0'], ['handmaid-0']]);
  const r2 = applyAction(s2, 'p1', { type: 'play', card: 'guard-0', target: 'p2', guess: 5 });
  t('Vệ binh đoán sai thì không loại', r2.ok && s2.players[1].alive);
  const s3 = rigged([['guard-0', 'priest-0'], ['king-0'], ['baron-0'], ['handmaid-0']]);
  t('Vệ binh không đoán được lá 1', !applyAction(s3, 'p1', { type: 'play', card: 'guard-0', target: 'p2', guess: 1 }).ok);
  const s4 = rigged([['guard-0', 'priest-0'], ['king-0'], ['baron-0'], ['handmaid-0']]);
  t('Vệ binh không được chọn chính mình', !applyAction(s4, 'p1', { type: 'play', card: 'guard-0', target: 'p1', guess: 6 }).ok);
}

/* ---------- 3. Linh mục ---------- */
{
  const s = rigged([['priest-0', 'guard-0'], ['princess-0'], ['baron-0'], ['handmaid-0']]);
  const r = applyAction(s, 'p1', { type: 'play', card: 'priest-0', target: 'p2' });
  t('Linh mục xem được bài đối thủ (ghi vào peeks của mình)', r.ok && s.players[0].peeks.p2 === 'princess');
  const v1 = viewFor(s, 'p1');
  t('viewFor của mình thấy peek', v1.players[0].peeks.p2 === 'princess');
  const v2 = viewFor(s, 'p2');
  t('viewFor của người khác không thấy peek', !v2.players[0].peeks || !v2.players[0].peeks.p2);
  t('viewFor không lộ tay bài người khác', v2.players[0].hand.length === 0 && v2.players[2].hand.length === 0);
  t('viewFor không lộ lá úp', v1.setAside === null);
}

/* ---------- 4. Nam tước ---------- */
{
  const s = rigged([['baron-0', 'king-0'], ['guard-0'], ['priest-0'], ['handmaid-0']]);
  const r = applyAction(s, 'p1', { type: 'play', card: 'baron-0', target: 'p2' });
  t('Nam tước: bài mình cao hơn thì loại đối thủ', r.ok && !s.players[1].alive && s.players[0].alive);
  const s2 = rigged([['baron-0', 'guard-0'], ['king-0'], ['priest-0'], ['handmaid-0']]);
  applyAction(s2, 'p1', { type: 'play', card: 'baron-0', target: 'p2' });
  t('Nam tước: bài mình thấp hơn thì mình bị loại', !s2.players[0].alive && s2.players[1].alive);
  const s3 = rigged([['baron-0', 'guard-0'], ['guard-1'], ['priest-0'], ['handmaid-0']]);
  applyAction(s3, 'p1', { type: 'play', card: 'baron-0', target: 'p2' });
  t('Nam tước hòa thì không ai bị loại', s3.players[0].alive && s3.players[1].alive);
}

/* ---------- 5. Thị nữ ---------- */
{
  const s = rigged([['handmaid-0', 'guard-0'], ['guard-1', 'priest-0'], ['baron-0'], ['princess-0']]);
  applyAction(s, 'p1', { type: 'play', card: 'handmaid-0' });
  t('Thị nữ: được bảo vệ sau khi đánh', s.players[0].protected === true);
  const r = applyAction(s, 'p2', { type: 'play', card: 'guard-1', target: 'p1', guess: 1 });
  t('Vệ binh không nhắm được người được bảo vệ', !r.ok);
  /* tới lượt p1 lần nữa thì hết bảo vệ: cho p2, p3, p4 đi qua */
  applyAction(s, 'p2', { type: 'play', card: 'guard-1', target: 'p3', guess: 8 });
  applyAction(s, 'p3', { type: 'play', card: 'baron-0', target: 'p4' });
  /* p3 thua Nam tước trước Công chúa của p4; p4 đánh lá vừa bốc rồi lượt về p1 */
  const p4card = s.players[3].hand.find(c => kindOf(c) !== 'princess');
  applyAction(s, 'p4', { type: 'play', card: p4card, target: 'p2', guess: 2 });
  t('hết 1 vòng lượt thì Thị nữ hết tác dụng', s.players[0].protected === false);
}

/* ---------- 6. Hoàng tử ---------- */
{
  const s = rigged([['prince-0', 'guard-0'], ['princess-0'], ['baron-0'], ['handmaid-0']]);
  applyAction(s, 'p1', { type: 'play', card: 'prince-0', target: 'p2' });
  t('Hoàng tử bắt bỏ Công chúa thì đối thủ bị loại', !s.players[1].alive && s.players[1].discards.includes('princess-0'));
  const s2 = rigged([['prince-0', 'guard-0'], ['king-0'], ['baron-0'], ['handmaid-0']]);
  const before = s2.deck.length;
  applyAction(s2, 'p1', { type: 'play', card: 'prince-0', target: 'p2' });
  /* p2 bốc 1 lá do Hoàng tử + 1 lá nữa vì tới lượt mình */
  t('Hoàng tử: đối thủ bỏ bài rồi bốc lá mới', s2.players[1].alive && s2.players[1].hand.length === 2 && s2.players[1].discards.includes('king-0') && s2.players[1].hand.every(c => c !== 'king-0') && s2.deck.length === before - 2);
  const s3 = rigged([['prince-0', 'guard-0'], ['king-0'], ['baron-0'], ['handmaid-0']]);
  applyAction(s3, 'p1', { type: 'play', card: 'prince-0', target: 'p1' });
  t('Hoàng tử được chọn chính mình', s3.players[0].alive && s3.players[0].discards.includes('guard-0') && s3.players[0].hand.length === 1);
}

/* ---------- 7. Quốc vương ---------- */
{
  const s = rigged([['king-0', 'guard-0'], ['princess-0'], ['baron-0'], ['handmaid-0']]);
  applyAction(s, 'p1', { type: 'play', card: 'king-0', target: 'p2' });
  t('Quốc vương đổi bài với đối thủ', s.players[0].hand[0] === 'princess-0' && s.players[1].hand[0] === 'guard-0');
}

/* ---------- 8. Nữ bá tước bắt buộc + Công chúa ---------- */
{
  const s = rigged([['countess-0', 'king-0'], ['guard-0'], ['baron-0'], ['handmaid-0']]);
  t('cầm Bá tước + Vua thì chỉ được đánh Bá tước', JSON.stringify(legalCards(s, 'p1')) === JSON.stringify(['countess-0']));
  t('đánh Vua khi đang cầm Bá tước thì bị từ chối', !applyAction(s, 'p1', { type: 'play', card: 'king-0', target: 'p2' }).ok);
  const r = applyAction(s, 'p1', { type: 'play', card: 'countess-0' });
  t('đánh Bá tước thì hợp lệ', r.ok);
  const s2 = rigged([['countess-0', 'prince-0'], ['guard-0'], ['baron-0'], ['handmaid-0']]);
  t('cầm Bá tước + Hoàng tử cũng bắt buộc đánh Bá tước', legalCards(s2, 'p1').length === 1 && legalCards(s2, 'p1')[0] === 'countess-0');
  const s3 = rigged([['countess-0', 'guard-0'], ['king-0'], ['baron-0'], ['handmaid-0']]);
  t('cầm Bá tước + Vệ binh thì đánh lá nào cũng được', legalCards(s3, 'p1').length === 2);
  const s4 = rigged([['princess-0', 'guard-0'], ['king-0'], ['baron-0'], ['handmaid-0']]);
  applyAction(s4, 'p1', { type: 'play', card: 'princess-0' });
  t('tự đánh Công chúa thì bị loại', !s4.players[0].alive);
}

/* ---------- 9. kết thúc vòng: hết bài so lá + hòa so tổng bỏ ---------- */
{
  /* p1 cầm Công chúa (8), p2 cầm Vua (6): hết bài -> p1 thắng vòng */
  const s = rigged([['guard-0', 'princess-0'], ['king-0'], ['baron-0'], ['handmaid-0']], []);
  /* bộ bài trống: lượt p1 đánh Vệ binh -> hết bài -> so lá */
  applyAction(s, 'p1', { type: 'play', card: 'guard-0', target: 'p3', guess: 2 });
  t('hết bài: người cầm lá cao nhất thắng vòng', s.players[0].tokens === 1 && s.round === 2);
  /* hòa lá: p1 và p2 cùng cầm Vua (6); p1 đã bỏ tổng 5, p2 đã bỏ tổng 1 -> p1 thắng */
  const s2 = rigged([['guard-0', 'king-0'], ['king-0'], ['baron-0'], ['handmaid-0']], []);
  s2.players[0].discards = ['prince-0']; /* tổng 5 */
  s2.players[1].discards = ['guard-1']; /* tổng 1 */
  applyAction(s2, 'p1', { type: 'play', card: 'guard-0', target: 'p3', guess: 2 });
  t('hòa lá thì so tổng lá đã bỏ', s2.players[0].tokens === 1 && s2.players[1].tokens === 0);
  /* hòa cả tổng bỏ: lá vừa đánh cũng tính vào tổng bỏ, nên p1 để trống,
     p2 bỏ 1 lá Vệ binh (tổng 1 = tổng 1 của lá Vệ binh p1 vừa đánh) */
  const s3 = rigged([['guard-0', 'king-0'], ['king-0'], ['baron-0'], ['handmaid-0']], []);
  s3.players[0].discards = [];
  s3.players[1].discards = ['guard-2'];
  applyAction(s3, 'p1', { type: 'play', card: 'guard-0', target: 'p3', guess: 2 });
  t('hòa cả tổng bỏ thì cùng nhận dấu', s3.players[0].tokens === 1 && s3.players[1].tokens === 1);
}

/* ---------- 10. kết thúc vòng: chỉ còn 1 người sống ---------- */
{
  const s = rigged([['guard-0', 'priest-0'], ['king-0'], ['baron-0'], ['handmaid-0']]);
  s.players[2].alive = false; s.players[3].alive = false;
  applyAction(s, 'p1', { type: 'play', card: 'guard-0', target: 'p2', guess: 6 });
  t('chỉ còn 1 người sống thì người đó thắng vòng', s.players[0].tokens === 1 && s.round === 2);
}

/* ---------- 11. kết thúc trận: đủ dấu Yêu ---------- */
{
  const s = rigged([['guard-0', 'priest-0'], ['king-0'], ['baron-0'], ['handmaid-0']]);
  s.players[0].tokens = 3; /* 4 người cần 4 dấu */
  s.players[2].alive = false; s.players[3].alive = false;
  applyAction(s, 'p1', { type: 'play', card: 'guard-0', target: 'p2', guess: 6 });
  t('đủ 4 dấu thì thắng trận, phase ended', s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'match');
  t('người thua vào losers', JSON.stringify(s.losers.sort()) === JSON.stringify(['p2', 'p3', 'p4']));
  t('actors() rỗng khi trận xong', actors(s).length === 0);
  const v = viewFor(s, 'p2');
  t('ván xong thì lộ tay bài mọi người', v.players.every(p => p.handCount >= 0) && v.players[0].hand.length > 0);
  t('đánh bài khi ván xong thì bị từ chối', !applyAction(s, 'p1', { type: 'play', card: 'guard-0' }).ok);
}

/* ---------- 12. xin thua ---------- */
{
  const s = rigged([['guard-0', 'priest-0'], ['king-0'], ['baron-0'], ['handmaid-0']]);
  s.players[0].tokens = 2; s.players[1].tokens = 1;
  const r = applyAction(s, 'p3', { type: 'resign' });
  t('xin thua thì trận kết thúc ngay, endReason resign', r.ok && s.phase === 'ended' && s.endReason === 'resign');
  t('xin thua: người còn lại nhiều dấu nhất thắng trận', s.winner === 'p1');
  t('xin thua: mọi người trừ người thắng đều vào losers', JSON.stringify(s.losers.sort()) === JSON.stringify(['p2', 'p3', 'p4']));
  t('xin thua: đánh bài khi trận xong thì bị từ chối', !applyAction(s, 'p1', { type: 'play', card: 'guard-0' }).ok);
  const s2 = rigged([['guard-0', 'priest-0'], ['king-0'], ['baron-0'], ['handmaid-0']]);
  applyAction(s2, 'p2', { type: 'resign' });
  t('xin thua khi chưa ai có dấu: người đầu tiên trong số còn lại thắng', s2.phase === 'ended' && s2.winner === 'p1' && s2.endReason === 'resign');
}

/* ---------- 13. không còn ai để chọn: lá đánh ra không có hiệu ứng ---------- */
{
  /* mọi đối thủ đều được Thị nữ bảo vệ -> Vệ binh đánh ra không hiệu ứng */
  const s = rigged([['guard-0', 'priest-0'], ['king-0'], ['baron-0'], ['handmaid-0']]);
  s.players[1].protected = true; s.players[2].protected = true; s.players[3].protected = true;
  const r = applyAction(s, 'p1', { type: 'play', card: 'guard-0' });
  t('mọi đối thủ được bảo vệ: Vệ binh đánh ra không hiệu ứng vẫn hợp lệ', r.ok && s.players[0].discards.includes('guard-0'));
  const s2 = rigged([['baron-0', 'guard-0'], ['king-0'], ['baron-1'], ['handmaid-0']]);
  s2.players[1].protected = true; s2.players[2].protected = true; s2.players[3].protected = true;
  t('mọi đối thủ được bảo vệ: Nam tước đánh ra không hiệu ứng vẫn hợp lệ', applyAction(s2, 'p1', { type: 'play', card: 'baron-0' }).ok);
  /* nhưng còn người chọn được mà không chọn thì bị từ chối */
  const s3 = rigged([['guard-0', 'priest-0'], ['king-0'], ['baron-0'], ['handmaid-0']]);
  s3.players[1].protected = true; /* p3, p4 vẫn chọn được */
  t('còn người chọn được mà không chọn thì bị từ chối', !applyAction(s3, 'p1', { type: 'play', card: 'guard-0' }).ok);
  /* Hoàng tử không chọn ai thì mặc định chọn chính mình */
  const s4 = rigged([['prince-0', 'guard-0'], ['king-0'], ['baron-0'], ['handmaid-0']]);
  const r4 = applyAction(s4, 'p1', { type: 'play', card: 'prince-0' });
  t('Hoàng tử không chọn ai thì mặc định chọn chính mình', r4.ok && s4.players[0].discards.includes('guard-0'));
}

/* ---------- 14. serialize ---------- */
{
  const s = createGame(P(3, ['A', 'B', 'C']), { seed: 99 });
  const back = deserialize(serialize(s));
  t('serialize roundtrip giữ nguyên state', JSON.stringify(back) === JSON.stringify(s));
  let threw = false;
  try { deserialize('{"players":[]}'); } catch (e) { threw = true; }
  t('deserialize dữ liệu hỏng thì throw', threw);
  threw = false;
  try { deserialize('không phải json'); } catch (e) { threw = true; }
  t('deserialize chuỗi không phải JSON thì throw', threw);
}

console.log(`\nLuật Love Letter: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
