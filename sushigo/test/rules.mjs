// Luật Sushi Go: chia bài, chuyền tay, tính điểm từng loại, Pudding, kết thúc, xin thua, viewFor.
import {
  createGame, applyAction, viewFor, serialize, deserialize, actors,
  legalCards, scorePlayed, scoreRound, hasChopsticksPlayed, openWasabi,
  CARD_INFO, DECK_SPEC, HAND_SIZE, MAKI_ICONS, NIGIRI_POINTS, DUMPLING_POINTS,
} from '../js/engine.js';

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = (n, names) => names.slice(0, n).map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));
const kindOf = id => id.slice(0, id.lastIndexOf('-'));
/* ván rigged: tay bài + đống đã đặt ép sẵn, lượt chọn đang mở */
function rigged(n, hands, played = [], round = 1, turnNum = 1) {
  const s = createGame(P(n, ['A', 'B', 'C', 'D', 'E']), { seed: 42 });
  s.players.forEach((p, i) => {
    p.hand = hands[i] ? hands[i].slice() : [];
    p.played = (played[i] || []).map(e => typeof e === 'string' ? { id: e, kind: kindOf(e) } : { ...e });
    p.roundScores = []; p.total = 0; p.puddings = 0;
  });
  s.round = round; s.turnNum = turnNum; s.picks = {};
  s.direction = round % 2 === 1 ? 1 : -1;
  return s;
}
/* mọi người cùng chọn 1 lá (lá đầu tay của mỗi người, trừ khi chỉ định) */
function playAll(s, picks) {
  for (let i = 0; i < s.players.length; i++) {
    const p = s.players[i];
    const pk = picks ? picks[i] : { card: p.hand[0] };
    const r = applyAction(s, p.id, { type: 'play', ...pk });
    if (!r.ok) return r;
  }
  return { ok: true };
}

/* ---------- 1. tạo ván ---------- */
{
  let threw = false;
  try { createGame(P(1, ['A'])); } catch (e) { threw = true; }
  t('tạo ván 1 người thì throw', threw);
  threw = false;
  try { createGame(P(6, ['A', 'B', 'C', 'D', 'E', 'F'])); } catch (e) { threw = true; }
  t('tạo ván 6 người thì throw', threw);
  t('bộ bài đủ 108 lá đúng tỉ lệ', DECK_SPEC.reduce((a, [, n]) => a + n, 0) === 108
    && DECK_SPEC.find(([k]) => k === 'tempura')[1] === 14
    && DECK_SPEC.find(([k]) => k === 'pudding')[1] === 10
    && DECK_SPEC.find(([k]) => k === 'chopsticks')[1] === 4);
  t('số lá mỗi tay: 2 người 10, 3 người 9, 4 người 8, 5 người 7',
    createGame(P(2, ['A', 'B']), { seed: 1 }).handSize === 10
    && createGame(P(3, ['A', 'B', 'C']), { seed: 1 }).handSize === 9
    && createGame(P(4, ['A', 'B', 'C', 'D']), { seed: 1 }).handSize === 8
    && createGame(P(5, ['A', 'B', 'C', 'D', 'E']), { seed: 1 }).handSize === 7);
  const s4 = createGame(P(4, ['A', 'B', 'C', 'D']), { seed: 7 });
  t('4 người: mỗi người 8 lá, còn 76 lá chưa chia', s4.players.every(p => p.hand.length === 8) && s4.deck.length === 108 - 32);
  t('vòng 1 chuyền sang trái (direction = 1)', s4.direction === 1 && s4.round === 1 && s4.turnNum === 1);
  t('actors() lúc đầu là tất cả mọi người', JSON.stringify(actors(s4).sort()) === JSON.stringify(['p1', 'p2', 'p3', 'p4']));
  /* 2 ván cùng seed thì chia bài giống hệt nhau */
  const a = createGame(P(3, ['A', 'B', 'C']), { seed: 99 });
  const b = createGame(P(3, ['A', 'B', 'C']), { seed: 99 });
  t('cùng seed thì chia bài giống hệt', JSON.stringify(a.players.map(p => p.hand)) === JSON.stringify(b.players.map(p => p.hand)));
  const c = createGame(P(3, ['A', 'B', 'C']), { seed: 100 });
  t('khác seed thì chia bài khác nhau', JSON.stringify(a.players.map(p => p.hand)) !== JSON.stringify(c.players.map(p => p.hand)));
}

/* ---------- 2. chuyền tay đúng hướng ---------- */
{
  /* vòng 1 (trái): tay của p1 sang p2, p2 sang p3, p4 sang p1 */
  const s = rigged(4, [
    ['tempura-0', 'sashimi-0'], ['tempura-1', 'sashimi-1'],
    ['tempura-2', 'sashimi-2'], ['tempura-3', 'sashimi-3'],
  ]);
  playAll(s);
  t('vòng 1 chuyền trái: p2 nhận tay còn lại của p1', s.players[1].hand.includes('sashimi-0') && !s.players[1].hand.includes('tempura-0'));
  t('vòng 1 chuyền trái: p1 nhận tay còn lại của p4', s.players[0].hand.includes('sashimi-3'));
  t('sau 1 lượt thì sang lượt 2', s.turnNum === 2);
  t('lá đã chọn vào đống đã đặt, không còn trên tay', s.players[0].played.some(e => e.id === 'tempura-0') && !s.players[0].hand.includes('tempura-0'));
  /* vòng 2 (phải): tay của p1 sang p4 */
  const s2 = rigged(4, [
    ['tempura-0', 'sashimi-0'], ['tempura-1', 'sashimi-1'],
    ['tempura-2', 'sashimi-2'], ['tempura-3', 'sashimi-3'],
  ], [], 2, 1);
  playAll(s2);
  t('vòng 2 chuyền phải: p4 nhận tay còn lại của p1', s2.players[3].hand.includes('sashimi-0'));
  t('vòng 2 chuyền phải: p2 nhận tay còn lại của p3', s2.players[1].hand.includes('sashimi-2'));
  /* vòng 3 lại chuyền trái */
  const s3 = rigged(4, [
    ['tempura-0', 'sashimi-0'], ['tempura-1', 'sashimi-1'],
    ['tempura-2', 'sashimi-2'], ['tempura-3', 'sashimi-3'],
  ], [], 3, 1);
  playAll(s3);
  t('vòng 3 chuyền trái như vòng 1', s3.players[1].hand.includes('sashimi-0') && s3.direction === 1);
}

/* ---------- 3. chọn lá: luật chọn ---------- */
{
  const s = rigged(3, [['tempura-0', 'sashimi-0'], ['tempura-1'], ['tempura-2']]);
  t('chưa chọn thì tay bài là legalCards', legalCards(s, 'p1').length === 2);
  const r = applyAction(s, 'p1', { type: 'play', card: 'tempura-0' });
  t('chọn 1 lá hợp lệ', r.ok && s.picks.p1.card === 'tempura-0');
  t('đã chọn thì không còn trong actors()', !actors(s).includes('p1') && actors(s).includes('p2'));
  t('chọn lần nữa trong cùng lượt thì bị từ chối', !applyAction(s, 'p1', { type: 'play', card: 'sashimi-0' }).ok);
  t('chọn lá không có trên tay thì bị từ chối', !applyAction(s, 'p2', { type: 'play', card: 'tempura-0' }).ok);
  t('hành động lạ thì bị từ chối', !applyAction(s, 'p2', { type: 'nhay' }).ok);
}

/* ---------- 4. tính điểm: Tempura / Sashimi / Há cảo ---------- */
{
  const played = kinds => kinds.map((k, i) => ({ id: `${k}-${i}`, kind: k }));
  t('Tempura: 1 lá = 0, cặp = 5, 3 lá = 5, 4 lá = 10',
    scorePlayed(played(['tempura'])).points === 0
    && scorePlayed(played(['tempura', 'tempura'])).points === 5
    && scorePlayed(played(['tempura', 'tempura', 'tempura'])).points === 5
    && scorePlayed(played(['tempura', 'tempura', 'tempura', 'tempura'])).points === 10);
  t('Sashimi: 2 lá = 0, bộ 3 = 10, 6 lá = 20',
    scorePlayed(played(['sashimi', 'sashimi'])).points === 0
    && scorePlayed(played(['sashimi', 'sashimi', 'sashimi'])).points === 10
    && scorePlayed(played(['sashimi', 'sashimi', 'sashimi', 'sashimi', 'sashimi', 'sashimi'])).points === 20);
  t('Há cảo: 0/1/2/3/4/5/6 lá = 0/1/3/6/10/15/15',
    [0, 1, 2, 3, 4, 5, 6].every(n => scorePlayed(played(Array(n).fill('dumpling'))).points === DUMPLING_POINTS[Math.min(n, 5)]));
  t('Nigiri: Cá hồi 3, Mực 3, Trứng 1',
    scorePlayed(played(['salmon'])).points === 3
    && scorePlayed(played(['squid'])).points === 3
    && scorePlayed(played(['egg'])).points === 1);
  t('Wasabi trơ trọi = 0, Đũa = 0, Pudding không tính điểm vòng',
    scorePlayed(played(['wasabi'])).points === 0
    && scorePlayed(played(['chopsticks'])).points === 0
    && scorePlayed(played(['pudding', 'pudding'])).points === 0
    && scorePlayed(played(['pudding', 'pudding'])).pudding === 2);
}

/* ---------- 5. Maki: nhất / nhì / hòa ---------- */
{
  const mk = (icons) => {
    /* dựng played có đúng số biểu tượng Maki: dùng maki3/maki2/maki1 */
    const out = [];
    let left = icons, i = 0;
    while (left >= 3) { out.push({ id: `maki3-${i++}`, kind: 'maki3' }); left -= 3; }
    if (left === 2) out.push({ id: 'maki2-0', kind: 'maki2' });
    if (left === 1) out.push({ id: 'maki1-0', kind: 'maki1' });
    return out;
  };
  const players = iconsArr => iconsArr.map(icons => ({ played: mk(icons) }));
  let r = scoreRound(players([5, 3, 1, 0]));
  t('Maki: nhất 6, nhì 3, còn lại 0', r[0].points === 6 && r[1].points === 3 && r[2].points === 0 && r[3].points === 0);
  r = scoreRound(players([3, 3, 1, 0]));
  t('Maki: hòa nhất thì chia 6 (3+3), không có nhì', r[0].points === 3 && r[1].points === 3 && r[2].points === 0);
  r = scoreRound(players([5, 3, 3, 1]));
  t('Maki: hòa nhì thì chia 3 (1+1)', r[0].points === 6 && r[1].points === 1 && r[2].points === 1 && r[3].points === 0);
  r = scoreRound(players([4, 0, 0]));
  t('Maki: chỉ 1 người có Maki thì 6, không có nhì', r[0].points === 6 && r[1].points === 0);
  r = scoreRound(players([0, 0, 0]));
  t('Maki: không ai có Maki thì không ai được điểm', r.every(x => x.points === 0));
  r = scoreRound(players([2, 2, 2]));
  t('Maki: 3 người hòa nhất thì chia 6 (2+2+2)', r.every(x => x.points === 2));
}

/* ---------- 6. Wasabi ---------- */
{
  /* Wasabi đặt trước, Nigiri đặt sau thì ×3 */
  const s = rigged(2, [['salmon-0', 'tempura-0'], ['tempura-1', 'sashimi-0']], [[{ id: 'wasabi-0', kind: 'wasabi', used: false }], []]);
  playAll(s);
  t('Nigiri đặt lên Wasabi mở thì ×3 (Cá hồi = 9)', scorePlayed(s.players[0].played).nigiri === 9);
  t('Wasabi đã dùng thì đánh dấu used', s.players[0].played.find(e => e.kind === 'wasabi').used === true);
  t('hàm openWasabi đếm đúng Wasabi đang mở', openWasabi(s, 'p1') === 0);
  /* 2 Wasabi mở + 1 Nigiri: chỉ 1 Wasabi được dùng */
  const s2 = rigged(2, [['salmon-0', 'tempura-0'], ['tempura-1', 'sashimi-0']], [[{ id: 'wasabi-0', kind: 'wasabi', used: false }, { id: 'wasabi-1', kind: 'wasabi', used: false }], []]);
  playAll(s2);
  t('2 Wasabi mở + 1 Nigiri: chỉ 1 cái được dùng', openWasabi(s2, 'p1') === 1 && scorePlayed(s2.players[0].played).nigiri === 9);
  /* Nigiri đặt TRƯỚC Wasabi thì không được ×3 */
  const s3 = rigged(2, [['wasabi-0', 'tempura-0'], ['tempura-1', 'sashimi-0']], [[{ id: 'salmon-0', kind: 'salmon', wasabi: false }], []]);
  playAll(s3);
  t('Nigiri đặt trước Wasabi thì không ×3', scorePlayed(s3.players[0].played).nigiri === 3);
  /* Wasabi + Nigiri cùng 1 lượt dùng Đũa: Wasabi trước, Nigiri sau thì ×3 */
  const s4 = rigged(2, [['wasabi-1', 'salmon-0', 'tempura-0'], ['tempura-1', 'sashimi-0']], [[{ id: 'chopsticks-0', kind: 'chopsticks' }], []]);
  applyAction(s4, 'p1', { type: 'play', card: 'wasabi-1', card2: 'salmon-0' });
  applyAction(s4, 'p2', { type: 'play', card: 'tempura-1' });
  t('Đũa: Wasabi + Nigiri cùng lượt thì Nigiri ×3', scorePlayed(s4.players[0].played).nigiri === 9);
}

/* ---------- 7. Đũa ---------- */
{
  const s = rigged(3, [
    ['tempura-0', 'sashimi-0', 'dumpling-0'],
    ['tempura-1', 'sashimi-1'], ['tempura-2', 'sashimi-2'],
  ], [[{ id: 'chopsticks-0', kind: 'chopsticks' }], [], []]);
  t('hasChopsticksPlayed nhận ra Đũa đã đặt', hasChopsticksPlayed(s, 'p1') === true && hasChopsticksPlayed(s, 'p2') === false);
  const r = applyAction(s, 'p1', { type: 'play', card: 'tempura-0', card2: 'sashimi-0' });
  t('có Đũa thì đặt 2 lá được', r.ok);
  applyAction(s, 'p2', { type: 'play', card: 'tempura-1' });
  applyAction(s, 'p3', { type: 'play', card: 'tempura-2' });
  t('đặt 2 lá thì cả 2 vào đống đã đặt', s.players[0].played.some(e => e.id === 'tempura-0') && s.players[0].played.some(e => e.id === 'sashimi-0'));
  t('dùng Đũa thì Đũa về tay (rồi chuyền sang người kế tiếp)', !s.players[0].played.some(e => e.kind === 'chopsticks') && s.players[1].hand.includes('chopsticks-0'));
  t('dùng Đũa xong tay vẫn còn đúng số lá (3-2+1 rồi chuyền)', s.players[1].hand.length === 2);
  /* không có Đũa mà đòi đặt 2 lá thì bị từ chối */
  const s2 = rigged(3, [
    ['tempura-0', 'sashimi-0'], ['tempura-1', 'sashimi-1'], ['tempura-2', 'sashimi-2'],
  ]);
  t('không có Đũa mà đặt 2 lá thì bị từ chối', !applyAction(s2, 'p1', { type: 'play', card: 'tempura-0', card2: 'sashimi-0' }).ok);
  /* 2 lá trùng nhau thì bị từ chối */
  const s3 = rigged(3, [
    ['tempura-0', 'sashimi-0'], ['tempura-1', 'sashimi-1'], ['tempura-2', 'sashimi-2'],
  ], [[{ id: 'chopsticks-0', kind: 'chopsticks' }], [], []]);
  t('đặt 2 lá trùng nhau thì bị từ chối', !applyAction(s3, 'p1', { type: 'play', card: 'tempura-0', card2: 'tempura-0' }).ok);
  /* lượt cuối chỉ còn 1 lá thì không đặt 2 được */
  const s4 = rigged(3, [
    ['tempura-0'], ['tempura-1'], ['tempura-2'],
  ], [[{ id: 'chopsticks-0', kind: 'chopsticks' }], [], []]);
  t('chỉ còn 1 lá trên tay thì không đặt 2 được', !applyAction(s4, 'p1', { type: 'play', card: 'tempura-0', card2: 'sashimi-0' }).ok);
}

/* ---------- 8. hết vòng: tính điểm + chia tay mới ---------- */
{
  /* vòng 1, 2 người, tay 2 lá: p1 đã đặt 1 Tempura ở lượt trước, lượt này đặt thêm 1 lá nữa thành cặp (5đ) */
  const s = rigged(2, [['tempura-1', 'dumpling-0'], ['sashimi-0', 'egg-0']], [['tempura-0'], []], 1, 2);
  s.handSize = 2;
  playAll(s, [{ card: 'tempura-1' }, { card: 'sashimi-0' }]);
  t('hết vòng thì tính điểm: cặp Tempura +5', s.players[0].total === 5 && s.players[0].roundScores[0] === 5);
  t('hết vòng thì sang vòng 2, chia tay mới đúng handSize đã rig', s.round === 2 && s.players.every(p => p.hand.length === s.handSize) && s.turnNum === 1);
  t('vòng 2 chuyền sang phải', s.direction === -1);
  t('đống đã đặt reset ở vòng mới', s.players.every(p => p.played.length === 0));
  t('điểm vòng cũ giữ lại', s.players[0].roundScores.length === 1);
}

/* ---------- 9. Pudding cuối trận + kết thúc trận ---------- */
{
  /* vòng 3, tay 1 lá: Pudding p1=3, p2=1, p3=1, p4=0 từ trước; tổng đều 10 */
  const s = rigged(4, [['tempura-0'], ['tempura-1'], ['tempura-2'], ['tempura-3']], [], 3, 1);
  s.handSize = 1;
  s.players[0].puddings = 3; s.players[1].puddings = 1; s.players[2].puddings = 1; s.players[3].puddings = 0;
  s.players.forEach(p => { p.total = 10; });
  playAll(s);
  t('hết 3 vòng thì trận kết thúc', s.phase === 'ended' && s.endReason === 'match');
  t('Pudding nhiều nhất +6 (10 -> 16)', s.players[0].total === 16);
  t('Pudding ít nhất −6 (10 -> 4)', s.players[3].total === 4);
  t('Pudding giữa không đổi', s.players[1].total === 10 && s.players[2].total === 10);
  t('người thắng là người nhiều điểm nhất', s.winner === 'p1');
  t('người thua vào losers', JSON.stringify(s.losers.sort()) === JSON.stringify(['p2', 'p3', 'p4']));
  t('actors() rỗng khi trận xong', actors(s).length === 0);
  t('đánh bài khi trận xong thì bị từ chối', !applyAction(s, 'p1', { type: 'play', card: 'tempura-0' }).ok);
  /* hòa Pudding nhiều nhất: 2 người cùng 2 Pudding thì chia 6 (3+3) */
  const s2 = rigged(3, [['tempura-0'], ['tempura-1'], ['tempura-2']], [], 3, 1);
  s2.handSize = 1;
  s2.players[0].puddings = 2; s2.players[1].puddings = 2; s2.players[2].puddings = 0;
  s2.players.forEach(p => { p.total = 10; });
  playAll(s2);
  t('hòa Pudding nhiều nhất thì chia 6 (mỗi người +3)', s2.players[0].total === 13 && s2.players[1].total === 13);
  t('ít Pudding nhất vẫn −6', s2.players[2].total === 4);
  /* mọi người hòa Pudding: không ai được/mất */
  const s3 = rigged(2, [['tempura-0'], ['tempura-1']], [], 3, 1);
  s3.handSize = 1;
  s3.players[0].puddings = 1; s3.players[1].puddings = 1;
  s3.players.forEach(p => { p.total = 10; });
  playAll(s3);
  t('hòa hết Pudding thì không ai được/mất điểm', s3.players[0].total === 10 && s3.players[1].total === 10);
}

/* ---------- 10. xin thua ---------- */
{
  const s = rigged(4, [['tempura-0'], ['tempura-1'], ['tempura-2'], ['tempura-3']]);
  s.players[0].total = 12; s.players[1].total = 8; s.players[2].total = 5; s.players[3].total = 3;
  const r = applyAction(s, 'p3', { type: 'resign' });
  t('xin thua thì trận kết thúc ngay, endReason resign', r.ok && s.phase === 'ended' && s.endReason === 'resign');
  t('xin thua: người còn lại nhiều điểm nhất thắng trận', s.winner === 'p1');
  t('xin thua: mọi người trừ người thắng đều vào losers', JSON.stringify(s.losers.sort()) === JSON.stringify(['p2', 'p3', 'p4']));
  const s2 = rigged(3, [['tempura-0'], ['tempura-1'], ['tempura-2']]);
  applyAction(s2, 'p2', { type: 'resign' });
  t('xin thua khi chưa ai có điểm: người đầu tiên trong số còn lại thắng', s2.winner === 'p1');
}

/* ---------- 11. viewFor ---------- */
{
  const s = createGame(P(3, ['A', 'B', 'C']), { seed: 5 });
  applyAction(s, 'p1', { type: 'play', card: s.players[0].hand[0] });
  const v1 = viewFor(s, 'p1'), v2 = viewFor(s, 'p2');
  t('viewFor của mình thấy tay bài mình', v1.players[0].hand.length > 0);
  t('viewFor không lộ tay bài người khác', v2.players[0].hand.length === 0 && v2.players[2].hand.length === 0);
  t('viewFor cho biết ai đã chọn (không lộ lá đã chọn)', v2.players[0].picked === true && !('card' in (v2.players[0])));
  /* lá chỉ vào đống đã đặt sau khi mọi người cùng chọn xong lượt */
  applyAction(s, 'p2', { type: 'play', card: s.players[1].hand[0] });
  applyAction(s, 'p3', { type: 'play', card: s.players[2].hand[0] });
  const v1b = viewFor(s, 'p1');
  t('viewFor thấy đống đã đặt của mọi người', v1b.players[0].played.length === 1);
  t('viewFor không có field you', !('you' in v1));
}

/* ---------- 12. serialize ---------- */
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

console.log(`\nLuật Sushi Go: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
