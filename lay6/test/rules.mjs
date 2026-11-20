// Luật Lấy 6: bộ bài, đầu bò, đặt lá đúng dãy, lấy dãy bắt buộc,
// lá thứ 6 lấy dãy, kết thúc + hòa, xin thua, viewFor, serialize.
import {
  createGame, applyAction, viewFor, serialize, deserialize, actors,
  legalCards, legalRows, bullheads, mulberry32,
  TOTAL_CARDS, HAND_CARDS, ROW_COUNT, ROW_MAX, MIN_PLAYERS, MAX_PLAYERS,
} from '../js/engine.js';

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = (n, names) => names.slice(0, n).map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));
/* ván rigged: tay bài + dãy ép sẵn, lượt chọn đang mở */
function rigged(n, hands, rows, turn = 1) {
  const s = createGame(P(n, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']), { seed: 42 });
  s.players.forEach((p, i) => {
    p.hand = hands[i] ? hands[i].slice().sort((a, b) => +a - +b) : [];
    p.bullheads = 0; p.taken = 0;
  });
  s.rows = rows.map(r => r.slice());
  s.turn = turn; s.picks = {}; s.queue = []; s.pendingTake = null; s.stage = 'pick';
  return s;
}
/* mọi người cùng chọn 1 lá */
function playAll(s, picks) {
  for (let i = 0; i < s.players.length; i++) {
    const r = applyAction(s, s.players[i].id, { type: 'pick', card: picks[i] });
    if (!r.ok) return r;
  }
  return { ok: true };
}
const headsOf = row => row.reduce((a, c) => a + bullheads(c), 0);

/* ---------- 1. tạo ván ---------- */
{
  let threw = false;
  try { createGame(P(1, ['A'])); } catch (e) { threw = true; }
  t('tạo ván 1 người thì throw', threw);
  threw = false;
  try { createGame(P(11, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'])); } catch (e) { threw = true; }
  t('tạo ván 11 người thì throw', threw);
  t('hằng số: 104 lá, 10 lá/tay, 4 dãy, dãy tối đa 5 lá, 2–10 người',
    TOTAL_CARDS === 104 && HAND_CARDS === 10 && ROW_COUNT === 4 && ROW_MAX === 5
    && MIN_PLAYERS === 2 && MAX_PLAYERS === 10);
  const s2 = createGame(P(2, ['A', 'B']), { seed: 7 });
  t('2 người: mỗi người 10 lá, 4 dãy mỗi dãy 1 lá',
    s2.players.every(p => p.hand.length === 10) && s2.rows.length === 4
    && s2.rows.every(r => r.length === 1));
  const all = [...s2.players.flatMap(p => p.hand), ...s2.rows.flat()];
  t('24 lá đã chia đều khác nhau, trong 1–104',
    new Set(all).size === 24 && all.every(c => +c >= 1 && +c <= 104));
  t('tay bài xếp tăng dần', s2.players.every(p => p.hand.every((c, i) => i === 0 || +c > +p.hand[i - 1])));
  const s10 = createGame(P(10, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']), { seed: 7 });
  t('10 người: 100 lá trên tay + 4 lá dãy = đúng 104 lá',
    s10.players.every(p => p.hand.length === 10)
    && new Set([...s10.players.flatMap(p => p.hand), ...s10.rows.flat()]).size === 104);
  t('lượt 1, giai đoạn chọn lá, chưa ai thắng',
    s2.turn === 1 && s2.stage === 'pick' && s2.phase === 'playing' && !s2.winner);
  t('actors() lúc đầu là tất cả mọi người',
    JSON.stringify(actors(s2).sort()) === JSON.stringify(['p1', 'p2']));
  const a = createGame(P(3, ['A', 'B', 'C']), { seed: 99 });
  const b = createGame(P(3, ['A', 'B', 'C']), { seed: 99 });
  t('cùng seed thì chia bài giống hệt',
    JSON.stringify(a.players.map(p => p.hand)) === JSON.stringify(b.players.map(p => p.hand))
    && JSON.stringify(a.rows) === JSON.stringify(b.rows));
  const c = createGame(P(3, ['A', 'B', 'C']), { seed: 100 });
  t('khác seed thì chia bài khác nhau',
    JSON.stringify(a.players.map(p => p.hand)) !== JSON.stringify(c.players.map(p => p.hand)));
}

/* ---------- 2. bảng đầu bò ---------- */
{
  t('đầu bò: 1=1, 2=1, 9=1, 104=1', bullheads(1) === 1 && bullheads(2) === 1 && bullheads(9) === 1 && bullheads(104) === 1);
  t('đầu bò: tận cùng 5 là 2 (5, 15, 25, 95)', [5, 15, 25, 95].every(n => bullheads(n) === 2));
  t('đầu bò: tận cùng 0 là 3 (10, 20, 30, 100)', [10, 20, 30, 100].every(n => bullheads(n) === 3));
  t('đầu bò: đôi là 5 (11, 22, 33, 44, 66, 77, 88, 99)', [11, 22, 33, 44, 66, 77, 88, 99].every(n => bullheads(n) === 5));
  t('đầu bò: 55 = 7 (không phải 5)', bullheads(55) === 7);
}

/* ---------- 3. đặt lá đúng dãy ---------- */
{
  const s = rigged(4, [['15'], ['25'], ['35'], ['45']], [['10'], ['20'], ['30'], ['40']]);
  const r = playAll(s, ['15', '25', '35', '45']);
  t('4 lá vào đúng 4 dãy theo lá cuối lớn nhất nhỏ hơn',
    r.ok && JSON.stringify(s.rows) === JSON.stringify([['10', '15'], ['20', '25'], ['30', '35'], ['40', '45']]));
  t('không ai bị phạt khi đặt đúng dãy', s.players.every(p => p.bullheads === 0 && p.taken === 0));
  t('hết lượt 1 thì sang lượt 2', s.turn === 2 && s.stage === 'pick');
  t('lá đã chọn rời khỏi tay', s.players.every(p => p.hand.length === 0));
  /* đặt theo thứ tự tăng dần: lá nhỏ đặt trước làm đổi lá cuối của dãy */
  const s2 = rigged(2, [['12'], ['14']], [['10'], ['20'], ['30'], ['40']]);
  playAll(s2, ['12', '14']);
  t('lá nhỏ đặt trước: 12 rồi 14 cùng vào dãy [10]',
    JSON.stringify(s2.rows[0]) === JSON.stringify(['10', '12', '14'])
    && s2.players.every(p => p.bullheads === 0));
  /* lá 14 không rơi vào dãy [20] vì 12 đã nâng lá cuối dãy 1 lên 12 */
  const s3 = rigged(2, [['19'], ['21']], [['10'], ['20'], ['30'], ['40']]);
  playAll(s3, ['19', '21']);
  t('19 vào dãy [10], 21 vào dãy [20]',
    JSON.stringify(s3.rows) === JSON.stringify([['10', '19'], ['20', '21'], ['30'], ['40']]));
}

/* ---------- 4. lá nhỏ hơn mọi dãy -> bắt buộc lấy dãy ---------- */
{
  const s = rigged(2, [['5'], ['60']], [['20'], ['30'], ['40'], ['50']]);
  const r = playAll(s, ['5', '60']);
  t('lá 5 nhỏ hơn mọi lá cuối -> dừng ở giai đoạn chọn dãy',
    r.ok && s.stage === 'take' && s.pendingTake && s.pendingTake.pid === 'p1' && s.pendingTake.card === '5');
  t('actors() lúc chờ lấy dãy chỉ còn người phải lấy', JSON.stringify(actors(s)) === JSON.stringify(['p1']));
  t('legalRows() của người phải lấy là cả 4 dãy', JSON.stringify(legalRows(s, 'p1')) === JSON.stringify([0, 1, 2, 3]));
  t('legalRows() của người khác là rỗng', legalRows(s, 'p2').length === 0);
  t('legalCards() của người phải lấy là rỗng (không còn được chọn lá)', legalCards(s, 'p1').length === 0);
  t('lá 60 của p2 vẫn nằm trong hàng đợi, chưa đặt', s.queue.length === 1 && s.queue[0].card === '60');
  const bad = applyAction(s, 'p2', { type: 'take', row: 0 });
  t('người khác không được chọn dãy hộ', !bad.ok);
  const bad2 = applyAction(s, 'p1', { type: 'take', row: 9 });
  t('chọn dãy ngoài 0–3 thì bị từ chối', !bad2.ok);
  const ok = applyAction(s, 'p1', { type: 'take', row: 0 });
  t('lấy dãy 1 ([20] = 3 đầu bò), lá 5 mở dãy mới',
    ok.ok && s.rows[0].join() === '5' && s.players[0].bullheads === 3 && s.players[0].taken === 1);
  t('sau khi lấy dãy thì lá 60 được đặt tiếp vào dãy [50], sang lượt 2',
    JSON.stringify(s.rows[3]) === JSON.stringify(['50', '60']) && s.turn === 2 && s.stage === 'pick');
  /* mặc định nên lấy dãy ít đầu bò nhất: [55] = 7 đầu bò là dãy tệ nhất */
  const s2 = rigged(2, [['5'], ['60']], [['55'], ['10'], ['20'], ['30']]);
  playAll(s2, ['5', '60']);
  applyAction(s2, 'p1', { type: 'take', row: 1 });
  t('lấy dãy ít đầu bò nhất ([10] = 3) thì chỉ bị 3 đầu bò', s2.players[0].bullheads === 3);
}

/* ---------- 5. lá thứ 6 lấy cả dãy ---------- */
{
  const s = rigged(2, [['15'], ['50']], [['10', '11', '12', '13', '14'], ['20'], ['30'], ['40']]);
  playAll(s, ['15', '50']);
  t('lá 15 là lá thứ 6 của dãy 1: lấy 5 lá đầu (3+5+1+1+1 = 11 đầu bò)',
    s.players[0].bullheads === 11 && s.players[0].taken === 5);
  t('dãy 1 còn lại lá 15 vừa đặt', JSON.stringify(s.rows[0]) === JSON.stringify(['15']));
  t('lá 50 của p2 vẫn đặt bình thường vào dãy [40]', JSON.stringify(s.rows[3]) === JSON.stringify(['40', '50']));
  /* lá thứ 6 của người sau cũng lấy dãy (hàng đợi xử lý lần lượt) */
  const s2 = rigged(2, [['16'], ['15']], [['10', '11', '12', '13', '14'], ['20'], ['30'], ['40']]);
  playAll(s2, ['16', '15']);
  t('15 đặt trước (lá thứ 6, lấy 11 đầu bò), 16 đặt sau vào dãy mới [15]',
    s2.players[1].bullheads === 11 && JSON.stringify(s2.rows[0]) === JSON.stringify(['15', '16']));
}

/* ---------- 6. kết thúc + hòa ---------- */
{
  const mkEnd = (heads, taken) => {
    const s = rigged(3, [['15'], ['25'], ['35']], [['10'], ['20'], ['30'], ['40']], 10);
    s.players.forEach((p, i) => { p.bullheads = heads[i]; p.taken = taken[i]; });
    playAll(s, ['15', '25', '35']);
    return s;
  };
  const s = mkEnd([5, 3, 8], [0, 0, 0]);
  t('hết lượt 10 thì trận kết thúc, ít đầu bò nhất thắng',
    s.phase === 'ended' && s.winner === 'p2' && s.endReason === 'match');
  t('losers là 2 người còn lại', JSON.stringify(s.losers) === JSON.stringify(['p1', 'p3']));
  const s2 = mkEnd([3, 3, 8], [5, 2, 0]);
  t('hòa đầu bò thì ít lá đã lấy hơn thắng', s2.winner === 'p2');
  const s3 = mkEnd([3, 3, 8], [2, 2, 0]);
  t('hòa cả đầu bò lẫn số lá thì ghế sớm hơn thắng', s3.winner === 'p1');
  t('sau khi kết thúc thì không hành động được nữa',
    !applyAction(s, 'p1', { type: 'pick', card: '15' }).ok);
  t('actors() khi kết thúc là rỗng', actors(s).length === 0);
  t('legalCards() khi kết thúc là rỗng', legalCards(s, 'p1').length === 0);
}

/* ---------- 7. xin thua kết thúc trận luôn ---------- */
{
  const s = rigged(3, [['15', '16'], ['25', '26'], ['35', '36']], [['10'], ['20'], ['30'], ['40']], 3);
  s.players[0].bullheads = 2; s.players[1].bullheads = 7; s.players[2].bullheads = 4;
  const r = applyAction(s, 'p2', { type: 'resign' });
  t('xin thua giữa trận thì trận kết thúc ngay',
    r.ok && s.phase === 'ended' && s.endReason === 'resign');
  t('người thắng là người còn lại ít đầu bò nhất (p1)',
    s.winner === 'p1');
  t('người xin thua nằm trong losers', s.losers.includes('p2'));
  /* người xin thua dù đang ít đầu bò nhất cũng không thắng */
  const s2 = rigged(3, [['15'], ['25'], ['35']], [['10'], ['20'], ['30'], ['40']], 5);
  s2.players[0].bullheads = 1; s2.players[1].bullheads = 9; s2.players[2].bullheads = 4;
  applyAction(s2, 'p1', { type: 'resign' });
  t('người xin thua không thắng dù đang ít đầu bò nhất', s2.winner === 'p3');
  /* xin thua khi đang phải lấy dãy cũng kết thúc trận luôn */
  const s3 = rigged(2, [['5'], ['60']], [['20'], ['30'], ['40'], ['50']]);
  playAll(s3, ['5', '60']);
  t('đang chờ lấy dãy thì stage = take', s3.stage === 'take');
  applyAction(s3, 'p1', { type: 'resign' });
  t('xin thua lúc đang chờ lấy dãy thì trận kết thúc ngay', s3.phase === 'ended' && s3.endReason === 'resign');
}

/* ---------- 8. hành động không hợp lệ ---------- */
{
  const s = rigged(2, [['15', '16'], ['25', '26']], [['10'], ['20'], ['30'], ['40']]);
  t('chọn lá không có trên tay thì bị từ chối', !applyAction(s, 'p1', { type: 'pick', card: '99' }).ok);
  t('chọn lá của người khác thì bị từ chối', !applyAction(s, 'p1', { type: 'pick', card: '25' }).ok);
  applyAction(s, 'p1', { type: 'pick', card: '15' });
  t('chọn 2 lần trong 1 lượt thì bị từ chối', !applyAction(s, 'p1', { type: 'pick', card: '16' }).ok);
  t('chọn dãy khi không phải lúc lấy dãy thì bị từ chối', !applyAction(s, 'p1', { type: 'take', row: 0 }).ok);
  t('hành động lạ thì bị từ chối', !applyAction(s, 'p1', { type: 'nhay' }).ok);
  t('người không có trong ván thì bị từ chối', !applyAction(s, 'px', { type: 'pick', card: '15' }).ok);
  t('legalCards() lúc đầu là toàn bộ tay bài',
    JSON.stringify(legalCards(s, 'p2')) === JSON.stringify(['25', '26']));
  t('legalCards() của người đã chọn là rỗng', legalCards(s, 'p1').length === 0);
}

/* ---------- 9. viewFor che bài + lá đã chọn ---------- */
{
  const s = rigged(3, [['15', '16'], ['25', '26'], ['35', '36']], [['10'], ['20'], ['30'], ['40']]);
  applyAction(s, 'p1', { type: 'pick', card: '15' });
  const v1 = viewFor(s, 'p1');
  const v2 = viewFor(s, 'p2');
  t('viewFor không có trường you', !('you' in v1) && !('you' in v2));
  t('người khác không thấy tay bài của mình (p2 thấy tay p1 rỗng)',
    v2.players[0].hand.length === 0);
  t('mình thấy tay bài của mình', v1.players[0].hand.join() === '16');
  t('ai cũng thấy p1 đã chọn (picked=true) nhưng không thấy lá nào',
    v2.players[0].picked === true && !('picks' in v2) && JSON.stringify(v2).indexOf('"picks"') === -1);
  t('người chưa chọn thì picked=false', v2.players[1].picked === false);
  t('dãy trên bàn thì ai cũng thấy', JSON.stringify(v2.rows) === JSON.stringify([['10'], ['20'], ['30'], ['40']]));
  t('viewFor có đủ phase/stage/turn/winner/losers/me',
    v1.phase === 'playing' && v1.stage === 'pick' && v1.turn === 1 && v1.me === 'p1');
  /* khi trận xong thì hiện hết tay bài */
  const s2 = rigged(2, [['15'], ['25']], [['10'], ['20'], ['30'], ['40']], 10);
  playAll(s2, ['15', '25']);
  const vEnd = viewFor(s2, 'p1');
  t('trận xong thì viewFor hiện tay bài mọi người (đã hết bài nên rỗng)',
    vEnd.phase === 'ended' && vEnd.players.every(p => Array.isArray(p.hand)));
}

/* ---------- 10. serialize roundtrip + seed ---------- */
{
  const s = createGame(P(4, ['A', 'B', 'C', 'D']), { seed: 1234 });
  /* chơi 3 lượt bằng lá đầu tay mỗi người */
  for (let k = 0; k < 3; k++) {
    for (const p of s.players) {
      const r = applyAction(s, p.id, { type: 'pick', card: p.hand[0] });
      if (!r.ok) throw new Error('pick thất bại ở lượt ' + k);
      /* nếu dừng ở giai đoạn lấy dãy thì lấy dãy ít đầu bò nhất */
      if (s.stage === 'take' && s.pendingTake) {
        const rows = [0, 1, 2, 3].sort((a, b) => headsOf(s.rows[a]) - headsOf(s.rows[b]));
        applyAction(s, s.pendingTake.pid, { type: 'take', row: rows[0] });
      }
    }
  }
  const json = serialize(s);
  const back = deserialize(json);
  t('serialize -> deserialize giống hệt', JSON.stringify(back) === JSON.stringify(s));
  t('deserialize chuỗi rác thì throw', (() => { try { deserialize('khong phai json'); return false; } catch (e) { return true; } })());
  t('deserialize state thiếu rows thì throw', (() => { try { deserialize(JSON.stringify({ players: [{}, {}], phase: 'playing', turn: 1 })); return false; } catch (e) { return true; } })());
  t('sau 3 lượt thì turn = 4 (không kẹt)', s.turn === 4 && s.phase === 'playing');
}

console.log(`\nLuật Lấy 6: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
